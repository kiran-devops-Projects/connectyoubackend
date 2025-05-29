const Application = require('../models/Application');
const Job = require('../models/Job');
const fs = require('fs');
const path = require('path');

// Submit a new job application
const submitApplication = async (req, res) => {
  try {
    const { jobId, applicantName, applicantEmail, applicantPhone, coverLetter } = req.body;

    // Check if resume was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'Resume file is required' });
    }

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Check if user already applied for this job
    const existingApplication = await Application.findOne({ 
      jobId, 
      applicantEmail 
    });

    if (existingApplication) {
      // Delete uploaded file since application already exists
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'You have already applied for this job' });
    }

    // Create new application
    const newApplication = new Application({
      jobId,
      applicantName,
      applicantEmail,
      applicantPhone,
      resumePath: req.file.path,
      resumeOriginalName: req.file.originalname,
      coverLetter
    });

    await newApplication.save();

    // Update job applications count
    await Job.findByIdAndUpdate(jobId, { $inc: { applications: 1 } });

    res.status(201).json({
      message: 'Application submitted successfully',
      application: newApplication
    });

  } catch (error) {
    // Delete uploaded file if there's an error
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    console.error('Error submitting application:', error);
    res.status(500).json({ error: 'Failed to submit application' });
  }
};

// Get applications for a specific job
const getApplicationsByJob = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { page = 1, limit = 10, status } = req.query;

    const query = { jobId };
    if (status && status !== 'all') {
      query.status = status;
    }

    const applications = await Application.find(query)
      .populate('jobId', 'title company')
      .sort({ appliedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Application.countDocuments(query);

    res.json({
      applications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

// Get all applications (for admin/overview)
const getAllApplications = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const applications = await Application.find()
      .populate('jobId', 'title company location type salary')
      .sort({ appliedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const total = await Application.countDocuments();

    res.json({
      applications,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });

  } catch (error) {
    console.error('Error fetching all applications:', error);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

// Update application status
const updateApplicationStatus = async (req, res) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    const validStatuses = ['applied', 'shortlisted', 'interviewed', 'hired', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const updatedApplication = await Application.findByIdAndUpdate(
      applicationId,
      { status },
      { new: true }
    ).populate('jobId', 'title company');

    if (!updatedApplication) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({
      message: 'Application status updated successfully',
      application: updatedApplication
    });

  } catch (error) {
    console.error('Error updating application status:', error);
    res.status(500).json({ error: 'Failed to update application status' });
  }
};

// Download resume
const downloadResume = async (req, res) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const resumePath = path.resolve(application.resumePath);
    
    // Check if file exists
    if (!fs.existsSync(resumePath)) {
      return res.status(404).json({ error: 'Resume file not found' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${application.resumeOriginalName}"`);
    res.setHeader('Content-Type', 'application/octet-stream');

    // Stream the file
    const fileStream = fs.createReadStream(resumePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading resume:', error);
    res.status(500).json({ error: 'Failed to download resume' });
  }
};

module.exports = {
  submitApplication,
  getApplicationsByJob,
  getAllApplications,
  updateApplicationStatus,
  downloadResume
};