const express = require("express");
const router = express.Router();
const multer = require("multer");
// const Mentor = require("../models/Mentor");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Route to handle mentor creation with image upload
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const mentorData = {
      name: req.body.name,
      role: req.body.role,
      company: req.body.company,
      expertise: req.body.expertise.split(",").map((item) => item.trim()),
      rating: parseFloat(req.body.rating),
      availability: req.body.availability,
      image: req.file ? req.file.path : "",
      sessions: req.body.sessions || 0,
    };

    const newMentor = new Mentor(mentorData);
    await newMentor.save();
    res.status(201).json(newMentor);
  } catch (error) {
    console.log("Error creating mentor:", error);
    res.status(400).json({ error: "Invalid data", details: error.message });
  }
});

module.exports = router;
