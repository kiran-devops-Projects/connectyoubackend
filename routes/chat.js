const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/message');
const { User } = require('../models/User');
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');

// Send a message
router.post('/send-message', auth, async (req, res) => {
    try {
        const { sender, receiver, content } = req.body;

        if (!sender || !receiver || !content) {
            return res.status(400).json({ message: 'Sender, receiver, and content are required' });
        }

        const [senderUser, receiverUser] = await Promise.all([
            User.findOne({ _id: new mongoose.Types.ObjectId(sender) }),
            User.findOne({ _id: new mongoose.Types.ObjectId(receiver) })
        ]);

        if (!senderUser || !receiverUser) {
            return res.status(404).json({ message: 'One or both users not found' });
        }

        const senderId = senderUser._id;
        const receiverId = receiverUser._id;

        const users = [senderId.toString(), receiverId.toString()].sort();
        const chatId = `${users[0]}_${users[1]}`;

        const newMessage = new Message({
            sender: senderId,
            receiver: receiverId,
            content,
            chatId
        });

        await newMessage.save();

        let chat = await Chat.findOne({ chatId });
        if (!chat) {
            chat = new Chat({
                chatId,
                participants: [senderId, receiverId],
                lastMessage: newMessage._id
            });
        } else {
            chat.lastMessage = newMessage._id;
            chat.updatedAt = Date.now();
        }

        await chat.save();

        if (req.io) {
            req.io.to(receiverId.toString()).emit('receiveMessage', newMessage);
            req.io.to(senderId.toString()).emit('messageSent', newMessage);
        }

        res.status(201).json({ success: true, message: 'Message sent successfully', data: newMessage });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ message: 'Error sending message' });
    }
});

// Get all chat threads
router.get('/chats/:userId', auth, async (req, res) => {
    try {
        // Convert userId to ObjectId
        const userId = new mongoose.Types.ObjectId(req.params.userId);
        
        console.log("Fetching chats for user ID:", req.params.userId);
        
        // Check if user exists
        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // For debugging - check raw messages and their types
        const messages = await Message.find({
            $or: [{ sender: userId }, { receiver: userId }]
        });
        console.log(`Found ${messages.length} messages for this user`);
        
        if (messages.length > 0) {
            // Examine the first message to debug structure
            console.log("Sample message structure:", {
                id: messages[0]._id,
                sender: messages[0].sender,
                receiver: messages[0].receiver,
                senderType: typeof messages[0].sender,
                receiverType: typeof messages[0].receiver,
                chatId: messages[0].chatId
            });
        }

        // Simplify the aggregation pipeline for debugging
        const chats = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: userId }, 
                        { receiver: userId }
                    ]
                }
            },
            {
                $sort: { timestamp: -1 }
            },
            {
                $group: {
                    _id: '$chatId',
                    lastMessage: { $first: '$$ROOT' }
                }
            }
        ]);

        console.log(`Simplified aggregation found ${chats.length} chat threads`);
        
        if (chats.length === 0) {
            // Try with string comparison as a fallback
            const userIdStr = userId.toString();
            console.log("Trying string comparison with:", userIdStr);
            
            const strChats = await Message.aggregate([
                {
                    $match: {
                        $or: [
                            { sender: userIdStr }, 
                            { receiver: userIdStr }
                        ]
                    }
                },
                {
                    $group: {
                    _id: '$chatId',
                    lastMessage: { $first: '$$ROOT' }
                    }
                }
            ]);
            
            console.log(`String-based aggregation found ${strChats.length} chat threads`);
            
            if (strChats.length > 0) {
                // Complete the full aggregation with string comparison
                const fullStrChats = await Message.aggregate([
                    {
                        $match: {
                            $or: [
                                { sender: userIdStr }, 
                                { receiver: userIdStr }
                            ]
                        }
                    },
                    {
                        $sort: { timestamp: -1 }
                    },
                    {
                        $group: {
                            _id: '$chatId',
                            lastMessage: { $first: '$$ROOT' },
                            unreadCount: {
                                $sum: {
                                    $cond: [
                                        { $and: [
                                            { $eq: ['$receiver', userIdStr] }, 
                                            { $eq: ['$read', false] }
                                        ]},
                                        1,
                                        0
                                    ]
                                }
                            }
                        }
                    },
                    {
                        $sort: { 'lastMessage.timestamp': -1 }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            let: { senderId: { $toObjectId: '$lastMessage.sender' } },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$senderId'] } } }
                            ],
                            as: 'senderDetails'
                        }
                    },
                    {
                        $lookup: {
                            from: 'users',
                            let: { receiverId: { $toObjectId: '$lastMessage.receiver' } },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$receiverId'] } } }
                            ],
                            as: 'receiverDetails'
                        }
                    },
                    {
                        $project: {
                            chatId: '$_id',
                            lastMessage: 1,
                            unreadCount: 1,
                            senderDetails: { $arrayElemAt: ['$senderDetails', 0] },
                            receiverDetails: { $arrayElemAt: ['$receiverDetails', 0] }
                        }
                    }
                ]);
                
                return res.status(200).json({ 
                    success: true, 
                    count: fullStrChats.length, 
                    data: fullStrChats,
                    note: "Used string-based comparison" 
                });
            }
        }

        // If we get here, proceed with the original full aggregation
        const fullChats = await Message.aggregate([
            {
                $match: {
                    $or: [
                        { sender: userId }, 
                        { receiver: userId }
                    ]
                }
            },
            {
                $sort: { timestamp: -1 }
            },
            {
                $group: {
                    _id: '$chatId',
                    lastMessage: { $first: '$$ROOT' },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                { $and: [
                                    { $eq: ['$receiver', userId] }, 
                                    { $eq: ['$read', false] }
                                ]},
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $sort: { 'lastMessage.timestamp': -1 }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'lastMessage.sender',
                    foreignField: '_id',
                    as: 'senderDetails'
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'lastMessage.receiver',
                    foreignField: '_id',
                    as: 'receiverDetails'
                }
            },
            {
                $project: {
                    chatId: '$_id',
                    lastMessage: 1,
                    unreadCount: 1,
                    senderDetails: { $arrayElemAt: ['$senderDetails', 0] },
                    receiverDetails: { $arrayElemAt: ['$receiverDetails', 0] }
                }
            }
        ]);
        
        res.status(200).json({ 
            success: true, 
            count: fullChats.length, 
            data: fullChats 
        });
    } catch (error) {
        console.error('Error fetching chats:', error);
        res.status(500).json({ 
            message: 'Error fetching chats', 
            error: error.message 
        });
    }
});
// Get message history
router.get('/messages', auth, async (req, res) => {
    try {
        const { sender, receiver, page = 1, limit = 50 } = req.query;

        if (!sender || !receiver) {
            return res.status(400).json({ message: 'Both sender and receiver IDs are required' });
        }

        const senderId = new mongoose.Types.ObjectId(sender);
        const receiverId = new mongoose.Types.ObjectId(receiver);

        // Check if users exist
        const [senderUser, receiverUser] = await Promise.all([
            User.findOne({ _id: senderId }),
            User.findOne({ _id: receiverId })
        ]);

        if (!senderUser || !receiverUser) {
            return res.status(404).json({ message: 'Users not found' });
        }

        const users = [senderId.toString(), receiverId.toString()].sort();
        const chatId = `${users[0]}_${users[1]}`;
        const skip = (parseInt(page) - 1) * parseInt(limit);

        const messages = await Message.find({ chatId })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const totalMessages = await Message.countDocuments({ chatId });

        // Fix: Check if req.user exists and if req.user._id matches receiver
        // Also convert both to strings before comparison to ensure consistent comparison
        const currentUserId = req.user && req.user._id ? req.user._id.toString() : null;
        const receiverIdStr = receiverId.toString();
        
        if (currentUserId === receiverIdStr) {
            await Message.updateMany(
                { chatId, receiver: receiverId, read: false },
                { $set: { read: true } }
            );

            if (req.io) {
                req.io.to(senderId.toString()).emit('messagesRead', {
                    chatId,
                    reader: receiverIdStr
                });
            }
        }

        res.status(200).json({
            success: true,
            count: messages.length,
            total: totalMessages,
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalMessages / parseInt(limit)),
            data: messages.reverse()
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
});

// Mark messages as read - UPDATED VERSION
router.put('/mark-read', auth, async (req, res) => {
    try {
        const { messageIds } = req.body;
        
        // Debug auth data
        console.log('Auth user data:', req.user);
        
        // Check if user data exists in request
        if (!req.user || !req.user._id) {
            console.error('Missing user data in request:', req.user);
            return res.status(401).json({ message: 'Authentication problem: User data missing' });
        }
        
        // Try to convert the user ID to ObjectId - catch any errors
        let userId;
        try {
            userId = new mongoose.Types.ObjectId(req.user._id);
            console.log('User ID converted to ObjectId:', userId);
        } catch (error) {
            console.error('Error converting user ID to ObjectId:', error);
            return res.status(400).json({ message: 'Invalid user ID format' });
        }
        
        // Validate messageIds
        if (!Array.isArray(messageIds) || messageIds.length === 0) {
            return res.status(400).json({ message: 'Valid message IDs array is required' });
        }
        
        // Skip the user verification and proceed directly with message updates
        // This removes the dependency on finding the user, which was causing the "User not found" error
        
        console.log(`Attempting to mark ${messageIds.length} messages as read for user ${userId}`);
        
        // Convert all messageIds to ObjectId, handling any invalid IDs
        const validMessageIds = [];
        for (const id of messageIds) {
            try {
                validMessageIds.push(new mongoose.Types.ObjectId(id));
            } catch (error) {
                console.warn(`Skipping invalid message ID: ${id}`);
            }
        }
        
        if (validMessageIds.length === 0) {
            return res.status(400).json({ message: 'No valid message IDs provided' });
        }
        
        // Update the messages
        const result = await Message.updateMany(
            { 
                _id: { $in: validMessageIds }, 
                receiver: userId, 
                read: false 
            },
            { $set: { read: true } }
        );
        
        console.log('Update result:', result);
        
        // Handle socket notifications if messages were updated
        if (req.io && result.modifiedCount > 0) {
            const messages = await Message.find({ 
                _id: { $in: validMessageIds }
            });
            
            const senderMessages = messages.reduce((acc, message) => {
                const senderId = message.sender.toString();
                if (!acc[senderId]) acc[senderId] = [];
                acc[senderId].push(message._id);
                return acc;
            }, {});
            
            for (const sender in senderMessages) {
                req.io.to(sender).emit('messagesRead', {
                    messageIds: senderMessages[sender],
                    reader: userId.toString()
                });
            }
        }
        
        res.status(200).json({
            success: true,
            message: `${result.modifiedCount} messages marked as read`,
            modifiedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Error marking messages as read:', error);
        res.status(500).json({ 
            message: 'Error marking messages as read', 
            error: error.message 
        });
    }
});

// Get unread count
router.get('/unread-count/:userId', auth, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.params.userId);
        
        const user = await User.findOne({ _id: userId });
        if (!user) return res.status(404).json({ message: 'User not found' });

        const unreadCount = await Message.countDocuments({
            receiver: userId,
            read: false
        });

        res.status(200).json({ success: true, unreadCount });
    } catch (error) {
        console.error('Error fetching unread count:', error);
        res.status(500).json({ message: 'Error fetching unread message count', error: error.message });
    }
});

module.exports = router;