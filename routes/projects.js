// routes/projects.js
const express = require('express');
const Project= require ('../models/Project');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all or filtered projects
router.get('/',auth, async (req, res) => {
  const { category, search } = req.query;
  let query = {};

  if (category && category !== 'All') query.category = category;
  if (search)
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];

  const projects = await Project.find(query);
  res.json(projects);
});

// Add a new project
router.post('/', auth, async (req, res) => {
  const newProject = new Project(req.body);
  await newProject.save();
  res.status(201).json(newProject);
});

module.exports = router;

