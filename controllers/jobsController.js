const Job = require('../models/Job');
const Application = require('../models/Application');

const getJobs = async (req, res) => {
  try {
    const { search = '', type = 'All' } = req.query;

    const query = {
      ...(type !== 'All' && { type }),
      $or: [
        { title: new RegExp(search, 'i') },
        { company: new RegExp(search, 'i') }
      ]
    };

    const jobs = await Job.find(query);
    
    // Get application counts for each job
    const jobsWithCounts = await Promise.all(
      jobs.map(async (job) => {
        const applicationCount = await Application.countDocuments({ jobId: job._id });
        return {
          ...job.toObject(),
          applications: applicationCount
        };
      })
    );

    res.json(jobsWithCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const postJob = async (req, res) => {
  try {
    const { title, company, location, type, salary, posted, logo, description } = req.body;

    if (!title || !company || !location || !type || !salary) {
      return res.status(400).json({ error: 'Required fields are missing' });
    }

    const newJob = new Job({ 
      title, 
      company, 
      location, 
      type, 
      salary, 
      posted: posted || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
      logo: logo || '', 
      description: description || '' 
    });
    
    await newJob.save();
    res.status(201).json(newJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    
    // Delete all applications for this job first
    await Application.deleteMany({ jobId });
    
    // Delete the job
    const deletedJob = await Job.findByIdAndDelete(jobId);

    if (!deletedJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job and related applications deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const { title, company, location, type, salary, posted, logo, description } = req.body;

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { title, company, location, type, salary, posted, logo, description },
      { new: true, runValidators: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get application count
    const applicationCount = await Application.countDocuments({ jobId });
    const jobWithCount = {
      ...updatedJob.toObject(),
      applications: applicationCount
    };

    res.json(jobWithCount);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { getJobs, postJob, deleteJob, updateJob };