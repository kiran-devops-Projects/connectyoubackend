const Job = require('../models/Job');

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
    res.json(jobs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const postJob = async (req, res) => {
  try {
    const { title, company, location, type, salary, posted, logo } = req.body;

    if (!title || !company || !location || !type || !salary || !posted || !logo) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const newJob = new Job({ title, company, location, type, salary, posted, logo });
    await newJob.save();

    res.status(201).json(newJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const deleteJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const deletedJob = await Job.findByIdAndDelete(jobId);

    if (!deletedJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const updateJob = async (req, res) => {
  try {
    const jobId = req.params.id;
    const { title, company, location, type, salary, posted, logo } = req.body;

    const updatedJob = await Job.findByIdAndUpdate(
      jobId,
      { title, company, location, type, salary, posted, logo },
      { new: true, runValidators: true }
    );

    if (!updatedJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(updatedJob);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


module.exports = { getJobs, postJob, deleteJob , updateJob};

