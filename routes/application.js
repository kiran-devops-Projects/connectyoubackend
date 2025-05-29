const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { 
  submitApplication, 
  getApplicationsByJob, 
  getAllApplications,
  updateApplicationStatus,
  downloadResume 
} = require('../controllers/applicationController');

// Configure multer for resume uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/resumes/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'resume-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept only PDF, DOC, and DOCX files
  const allowedTypes = /pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype) || 
                   file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                   file.mimetype === 'application/msword';

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF, DOC, and DOCX files are allowed!'));
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

// Routes
router.post('/submit', upload.single('resume'), submitApplication);
router.get('/job/:jobId', getApplicationsByJob);
router.get('/all', getAllApplications);
router.patch('/:applicationId/status', updateApplicationStatus);
router.get('/resume/:applicationId', downloadResume);

module.exports = router;