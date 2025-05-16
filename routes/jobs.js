const express = require('express');
const router = express.Router();
const { getJobs , postJob , deleteJob , updateJob}  = require('../controllers/jobsController');

router.get('/', getJobs);
router.post('/', postJob);
router.delete('/:id', deleteJob);
router.put('/:id', updateJob);

module.exports = router;
