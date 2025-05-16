const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    chatId: { type: String, required: true, index: true },
    sender: { type: String, required: true, index: true },
    receiver: { type: String, required: true, index: true },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
    timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

// Pre-save hook to ensure consistent chatId format (sorted user IDs)
messageSchema.pre('validate', function(next) {
    const users = [this.sender, this.receiver].sort();
    this.chatId = `${users[0]}_${users[1]}`;
    next();
});

// Add index for common queries
messageSchema.index({ chatId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);