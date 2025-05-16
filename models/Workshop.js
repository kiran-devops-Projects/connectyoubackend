const mongoose = require('mongoose');

const workshopSchema = new mongoose.Schema({
  title: { type: String, required: true },
  instructor: { type: String, required: true },
  date: { type: String, required: true },
  time: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true },
  enrolled: { type: Number, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
});

const Workshop = mongoose.model('Workshop', workshopSchema);

module.exports = Workshop;
