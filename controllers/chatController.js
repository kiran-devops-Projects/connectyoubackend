const Message = require('../models/message');

exports.getMessagesBetweenUsers = async (req, res) => {
    const { user1, user2 } = req.params;
    try {
        const messages = await Message.find({
            $or: [
                { sender: user1, receiver: user2 },
                { sender: user2, receiver: user1 }
            ]
        }).sort({ timestamp: 1 });

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch messages' });
    }
};


exports.sendMessage = async (req, res) => {
    const { sender, receiver, content } = req.body;

    if (!sender || !receiver || !content) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const message = new Message({
            sender,
            receiver,
            content
        });

        await message.save();

        res.status(201).json({ message: 'Message sent successfully', data: message });
    } catch (err) {
        res.status(500).json({ error: 'Failed to send message' });
    }
};