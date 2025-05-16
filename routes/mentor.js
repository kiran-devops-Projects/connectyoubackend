const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const Mentor = require("../models/Mentor");
const MentorRequest = require("../models/mentorRequest");
const auth = require('../middleware/auth');
// Setup multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// POST route to create a mentor
router.post("/", upload.single("image"), async (req, res) => {
  try {
    console.log("Request body:", req.body);
    console.log("File uploaded:", req.file);

    const { name, role, company, expertise, rating, availability, sessions } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image file is required." });
    }

    const newMentor = new Mentor({
      name,
      role,
      company,
      expertise: expertise.split(","),
      rating,
      availability,
      sessions: sessions || 0,
      image: req.file.path
    });

    await newMentor.save();
    res.status(201).json({ message: "Mentor created successfully", mentor: newMentor });
  } catch (err) {
    console.error("❌ Error creating mentor:", err);
    res.status(400).json({
      error: "Invalid data",
      details: err.message
    });
  }
});


// PUT route to update a mentor by ID
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if mentor exists
    const mentor = await Mentor.findById(id);
    if (!mentor) {
      return res.status(404).json({ error: "Mentor not found" });
    }

    const { name, role, company, expertise, rating, availability, sessions } = req.body;

    // Update fields
    if (name) mentor.name = name;
    if (role) mentor.role = role;
    if (company) mentor.company = company;
    if (expertise) mentor.expertise = expertise.split(",");
    if (rating) mentor.rating = rating;
    if (availability) mentor.availability = availability;
    if (sessions) mentor.sessions = sessions;
    if (req.file) mentor.image = req.file.path; // Update image if new one uploaded

    await mentor.save();

    res.status(200).json({ message: "Mentor updated successfully", mentor });
  } catch (err) {
    console.error("❌ Error updating mentor:", err);
    res.status(400).json({
      error: "Failed to update mentor",
      details: err.message
    });
  }
});


// // ✅ GET route to fetch all mentors
// router.get("/", async (req, res) => {
//   try {
//     const mentors = await Mentor.find();
//     res.status(200).json(mentors);
//   } catch (err) {
//     console.error("❌ Error fetching mentors:", err);
//     res.status(500).json({ error: "Failed to fetch mentors", details: err.message });
//   }
// });




router.get("/", auth, async (req, res) => {
  try {
    const studentId = req.user.id; // `auth` middleware should decode token and attach user info
    const mentors = await Mentor.find();

    // Get all requests by this student
    const requests = await MentorRequest.find({ studentId });

    const enrichedMentors = mentors.map((mentor) => {
      const request = requests.find((r) => r.mentorId.toString() === mentor._id.toString());
      return {
        ...mentor.toObject(),
        requestStatus: request ? request.status : null,
        requestId: request ? request._id : null,
      };
    });

    res.status(200).json(enrichedMentors);
  } catch (err) {
    console.error("❌ Error fetching mentors:", err);
    res.status(500).json({ error: "Failed to fetch mentors", details: err.message });
  }
});






// Send request to a mentor
router.post("/request/:mentorId", async (req, res) => {
  try {
    const { studentId } = req.body; // Pass from frontend

    const existingRequest = await MentorRequest.findOne({
      studentId,
      mentorId: req.params.mentorId
    });

    if (existingRequest) {
      return res.status(400).json({ message: "You already sent a request to this mentor." });
    }

    const request = new MentorRequest({
      studentId,
      mentorId: req.params.mentorId
    });

    await request.save();

    res.status(201).json({ message: "Request sent successfully", request });
  } catch (err) {
    console.error("❌ Error sending request:", err);
    res.status(500).json({ message: "Failed to send request", error: err.message });
  }
});



// Get pending requests for a mentor
router.get("/requests/:mentorId", async (req, res) => {
  try {
    // Fetch mentorship requests and populate student info
    const requests = await MentorRequest.find({ 
      mentorId: req.params.mentorId 
    })
    .populate("studentId", "firstName lastName email university branch");

    // Format response with student details
    const formattedRequests = requests.map(request => ({
      _id: request._id,
      date: request.date,
      time: request.time,
      status: request.status,
      studentId: request.studentId._id,
      studentName: `${request.studentId.firstName} ${request.studentId.lastName}`,
      studentEmail: request.studentId.email,
      studentUniversity: request.studentId.university,
      studentBranch: request.studentId.branch
    }));

    res.status(200).json({ requests: formattedRequests });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch requests", error: err.message });
  }
});




router.patch("/accept/:requestId", async (req, res) => {
  try {
    await MentorRequest.findByIdAndUpdate(req.params.requestId, {
      status: "accepted"
    });
    res.status(200).json({ message: "Request accepted" });
  } catch (err) {
    res.status(500).json({ message: "Error accepting request", error: err.message });
  }
});



module.exports = router;
