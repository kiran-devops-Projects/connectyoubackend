const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  company: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    required: true,
    enum: ['Full-time', 'Part-time', 'Internship', 'Contract', 'Remote']
  },
  salary: {
    type: String,
    required: true,
    trim: true
  },
  posted: {
    type: String,
    required: true
  },
  logo: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  // Virtual field to count applications
  applications: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate for applications
jobSchema.virtual('applicationCount', {
  ref: 'Application',
  localField: '_id',
  foreignField: 'jobId',
  count: true
});

module.exports = mongoose.model('Job', jobSchema);