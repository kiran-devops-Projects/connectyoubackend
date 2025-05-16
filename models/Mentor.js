const mongoose = require('mongoose');

const mentorSchema = new mongoose.Schema({
  name: String,
  role: String,
  company: String,
  expertise: [String],
  rating: { type: Number, default: 0 },
  availability: { type: String, default: "Available" },
  image: String,
  sessions: { type: Number, default: 0 }
});

// Check if model is already compiled
module.exports = mongoose.models.Mentor || mongoose.model('Mentor', mentorSchema);
