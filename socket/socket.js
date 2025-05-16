const Message = require('../models/message');
const { User } = require('../models/User');

function chatSocket(io) {
    io.on('connection', (socket) => {
        console.log('✅ New user connected:', socket.id);

        // Join a room specific to the user by userId (MongoDB _id)
        socket.on('joinRoom', async ({ userId }) => {
            if (!userId) {
                socket.emit('error', { message: 'User ID is required to join a room' });
                return;
            }

            try {
                // Verify user exists by _id
                const user = await User.findById(userId);
                if (!user) {
                    socket.emit('error', { message: 'User not found' });
                    return;
                }

                socket.join(userId);
                console.log(`${userId} joined their room`);
                socket.emit('roomJoined', { userId, success: true });
            } catch (error) {
                console.error('Error joining room:', error);
                socket.emit('error', { message: 'Failed to join room' });
            }
        });

        // Listen for messages being sent
        socket.on('sendMessage', async (data) => {
            try {
                const { sender, receiver, content } = data;

                if (!sender || !receiver || !content) {
                    socket.emit('error', { message: 'Sender, receiver, and content are required' });
                    return;
                }

                // Create chatId from sorted user ObjectIds for consistency
                const users = [sender, receiver].sort();
                const chatId = `${users[0]}_${users[1]}`;

                const newMessage = new Message({
                    sender, 
                    receiver, 
                    content, 
                    chatId
                });

                await newMessage.save();

                // Emit to both sender and receiver
                io.to(receiver.toString()).emit('receiveMessage', newMessage);
                io.to(sender.toString()).emit('messageSent', newMessage);

                console.log(`Message sent from ${sender} to ${receiver}`);
            } catch (error) {
                console.error('Error sending message:', error);
                socket.emit('error', { message: 'Failed to send message' });
            }
        });

        // When user is typing
        socket.on('typing', ({ sender, receiver }) => {
            if (sender && receiver) {
                io.to(receiver.toString()).emit('userTyping', { sender });
            }
        });

        // When user stops typing
        socket.on('stopTyping', ({ sender, receiver }) => {
            if (sender && receiver) {
                io.to(receiver.toString()).emit('userStopTyping', { sender });
            }
        });

        // Mark messages as read
        socket.on('markAsRead', async ({ messageIds, userId }) => {
            try {
                if (!messageIds || !messageIds.length) {
                    socket.emit('error', { message: 'Message IDs are required' });
                    return;
                }

                await Message.updateMany(
                    { _id: { $in: messageIds }, receiver: userId },
                    { $set: { read: true } }
                );

                socket.emit('messagesMarkedAsRead', { messageIds });
            } catch (error) {
                console.error('Error marking messages as read:', error);
                socket.emit('error', { message: 'Failed to mark messages as read' });
            }
        });

        // When a user disconnects
        socket.on('disconnect', () => {
            console.log('❌ User disconnected:', socket.id);
        });
    });
}

module.exports = chatSocket;
