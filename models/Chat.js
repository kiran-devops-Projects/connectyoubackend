const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema({
    chatId: { type: String, required: true, unique: true },
    participants: [{ type: String, required: true }],
    lastMessage: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Chat', ChatSchema);
