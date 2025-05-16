const express = require('express');
const router = express.Router();
const Workshop = require('../models/Workshop');

// GET all workshops
router.get('/', async (req, res) => {
  try {
    const workshops = await Workshop.find();
    res.json(workshops);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST a new workshop
router.post('/', async (req, res) => {
  const workshop = new Workshop({
    title: req.body.title,
    instructor: req.body.instructor,
    date: req.body.date,
    time: req.body.time,
    location: req.body.location,
    capacity: req.body.capacity,
    enrolled: req.body.enrolled,
    description: req.body.description,
    image: req.body.image,
  });

  try {
    const newWorkshop = await workshop.save();
    res.status(201).json(newWorkshop);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT - Update a workshop
router.put('/:id', async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: 'Workshop not found' });

    workshop.title = req.body.title || workshop.title;
    workshop.instructor = req.body.instructor || workshop.instructor;
    workshop.date = req.body.date || workshop.date;
    workshop.time = req.body.time || workshop.time;
    workshop.location = req.body.location || workshop.location;
    workshop.capacity = req.body.capacity || workshop.capacity;
    workshop.enrolled = req.body.enrolled || workshop.enrolled;
    workshop.description = req.body.description || workshop.description;
    workshop.image = req.body.image || workshop.image;

    const updatedWorkshop = await workshop.save();
    res.json(updatedWorkshop);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE - Delete a workshop
router.delete('/:id', async (req, res) => {
  try {
    const workshop = await Workshop.findById(req.params.id);
    if (!workshop) return res.status(404).json({ message: 'Workshop not found' });

    await workshop.remove();
    res.json({ message: 'Workshop deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
