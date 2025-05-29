const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  jobId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true
  },
  applicantName: {
    type: String,
    required: true,
    trim: true
  },
  applicantEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  applicantPhone: {
    type: String,
    required: true,
    trim: true
  },
  resumePath: {
    type: String,
    required: true
  },
  resumeOriginalName: {
    type: String,
    required: true
  },
  appliedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'interviewed', 'hired', 'rejected'],
    default: 'applied'
  },
  coverLetter: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for faster queries
applicationSchema.index({ jobId: 1, appliedAt: -1 });
applicationSchema.index({ applicantEmail: 1 });

module.exports = mongoose.model('Application', applicationSchema);