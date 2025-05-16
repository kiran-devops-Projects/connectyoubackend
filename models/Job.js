const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: String,
  company: String,
  location: String,
  type: String,
  salary: String,
  posted: String,
  logo: String,
});

module.exports = mongoose.model('Job', jobSchema);
