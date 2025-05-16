const express = require('express');
const jwt = require('jsonwebtoken');
const { User, Student, Alumni } = require('../models/User');
const auth = require('../middleware/auth');
const validator = require('validator');


const router = express.Router();

// Register user
router.post('/register', async (req, res) => {
  try {
    let {
      firstName,
      lastName,
      email,
      password,
      phone,
      userType,
      university,
      branch,
      yearOfStudy,
      regno,
      studentId,
      currentCompany,
      jobTitle,
      industry,
      graduationYear 
    } = req.body;

    // Input sanitization
    firstName = validator.escape(firstName?.trim());
    lastName = validator.escape(lastName?.trim());
    email = validator.normalizeEmail(email?.trim());
    phone = phone?.trim();

    if (!validator.isEmail(email)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    if (phone && !validator.isMobilePhone(phone, 'en-IN')) {
      return res.status(400).json({ message: 'Invalid phone number' });
    }

    if (!validator.isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password is not strong enough' });
    }

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Validate userType
    if (!['student', 'alumni'].includes(userType)) {
      return res.status(400).json({ message: 'Invalid userType. Must be student or alumni.' });
    }

    // Validate alumni specific fields
    if (userType === 'alumni') {
      if (!graduationYear) {
        return res.status(400).json({ message: 'Graduation year is required for alumni.' });
      }
      if (!currentCompany || !jobTitle || !industry) {
        return res.status(400).json({ message: 'Missing required alumni fields.' });
      }
    }

    // Prepare user data based on userType
    const userData = {
      firstName,
      lastName,
      email,
      password,
      phone,
      userType,
      role: userType === 'student' ? 'student' : 'instructor'
    };

    if (userType === 'student') {
      if (!university || !branch || !yearOfStudy || !studentId) {
        return res.status(400).json({ message: 'Missing required student fields.' });
      }
      Object.assign(userData, {
        university: validator.escape(university.trim()),
        branch,
        yearOfStudy,
        regno: validator.escape(studentId.trim())
      });
    } else if (userType === 'alumni') {
      Object.assign(userData, {
        graduationYear,
        currentCompany: validator.escape(currentCompany.trim()),
        jobTitle: validator.escape(jobTitle.trim()),
        industry: validator.escape(industry.trim())
      });
    }

    // Create and save the user
    let user;
    if (userType === 'student') {
      user = new Student(userData);
    } else if (userType === 'alumni') {
      user = new Alumni(userData);
    }

    await user.save();

    // If the user is alumni, create a mentor record
    if (userType === 'alumni') {
      const Mentor = require('../models/mentor'); // Ensure path is correct

      try {
        const existingMentor = await Mentor.findById(user._id);
        if (existingMentor) {
          console.log("Mentor already exists with ID:", user._id);
        } else {
          const mentorData = {
            _id: user._id,
            name: `${firstName} ${lastName}`,
            role: jobTitle,
            company: currentCompany,
            expertise: [industry],
            rating: 0,
            availability: "Available",
            image: "",
            sessions: 0
          };

          console.log("Saving new mentor:", mentorData);
          const mentor = new Mentor(mentorData);
          await mentor.save();
        }
      } catch (mentorError) {
        console.error("Error saving mentor:", mentorError.message);
        return res.status(400).json({ message: 'Failed to create mentor', error: mentorError.message });
      }
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: user._id,
        user_id: user.user_id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Server error during registration:", error);
    res.status(500).json({ message: error.message });
  }
});


router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user and include the password field
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Ensure comparePassword method exists
    if (typeof user.comparePassword !== 'function') {
      return res.status(500).json({ message: "Password comparison method not available" });
    }

    // Validate password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role }, //
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    const redirectUrl = user.userType === "student" ? "/dashboard" : "/alumni";

    res.json({
      token,
      redirectUrl,
      user: {
        id: user._id,
        user_id: user.user_id, // custom user_id
        name: `${user.firstName} ${user.lastName}`,
        email: user.email,
        role: user.role,
        userType: user.userType,
        studentId: user.studentId,
        mentorId:user.alumniId 
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});



// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    // Find the user and populate the associated profile
    const user = await User.findById(req.user.userId)
      .select('-password') // Don't send the password
      .populate('profile'); // Populate the associated profile data

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Send the user data along with profile details
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// Enroll in course
router.post('/enroll/:courseId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const courseId = req.params.courseId;

    // Check if already enrolled
    if (user.enrolledCourses.some(enrollment => enrollment.course.toString() === courseId)) {
      return res.status(400).json({ message: 'Already enrolled in this course' });
    }

    user.enrolledCourses.push({
      course: courseId,
      progress: 0,
      completedLessons: []
    });

    await user.save();
    
    const updatedUser = await User.findById(req.user.userId)
      .select('-password')
      .populate('enrolledCourses.course');

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update lesson progress
router.post('/courses/:courseId/lessons/:lessonId/complete', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const { courseId, lessonId } = req.params;

    const enrollment = user.enrolledCourses.find(
      e => e.course.toString() === courseId
    );

    if (!enrollment) {
      return res.status(400).json({ message: 'Not enrolled in this course' });
    }

    if (!enrollment.completedLessons.includes(lessonId)) {
      enrollment.completedLessons.push(lessonId);
      // Update progress percentage
      // This is a simplified calculation - you might want to make it more sophisticated
      enrollment.progress = (enrollment.completedLessons.length / totalLessons) * 100;
    }

    await user.save();
    
    const updatedUser = await User.findById(req.user.userId)
      .select('-password')
      .populate('enrolledCourses.course');

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
