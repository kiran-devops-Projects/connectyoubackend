const express = require('express');
const jwt = require('jsonwebtoken');
const { User, Student, Alumni } = require('../models/User');
const auth = require('../middleware/auth');
const validator = require('validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

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




// Configure nodemailer (you'll need to set up your email service)
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your preferred email service
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Updated User Schema - Add these fields to your User model
/*
Add these fields to your userSchema:

resetPasswordToken: {
  type: String,
  default: null
},
resetPasswordExpires: {
  type: Date,
  default: null
}
*/

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Input validation
    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const normalizedEmail = validator.normalizeEmail(email.trim());
    if (!validator.isEmail(normalizedEmail)) {
      return res.status(400).json({ message: 'Invalid email format' });
    }

    // Find user by email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      // Don't reveal if user exists or not for security
      return res.status(200).json({ 
        message: 'If an account with that email exists, a password reset link has been sent.' 
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set reset token and expiration (15 minutes)
    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes

    await user.save();

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    // Email content
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>Hello ${user.firstName},</p>
        <p>You requested a password reset for your account. Click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #007bff; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>This link will expire in 15 minutes for security reasons.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">
          If the button doesn't work, copy and paste this link into your browser:<br>
          ${resetUrl}
        </p>
      </div>
    `;

    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Request',
      html: emailContent
    });

    res.status(200).json({ 
      message: 'If an account with that email exists, a password reset link has been sent.' 
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Error processing password reset request' });
  }
});

// Reset Password Route
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    // Input validation
    if (!password || !confirmPassword) {
      return res.status(400).json({ message: 'Password and confirm password are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match' });
    }

    if (!validator.isStrongPassword(password)) {
      return res.status(400).json({ 
        message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number, and special character' 
      });
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token and not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    // Update password (pre-save hook will hash it)
    user.password = password;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

    await user.save();

    // Send confirmation email
    const confirmationEmail = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Successful</h2>
        <p>Hello ${user.firstName},</p>
        <p>Your password has been successfully reset.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${process.env.FRONTEND_URL}/login" 
             style="background-color: #28a745; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Login to Your Account
          </a>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Password Reset Successful',
      html: confirmationEmail
    });

    res.status(200).json({ message: 'Password reset successful' });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Error resetting password' });
  }
});

// Verify Reset Token Route (optional - to check if token is valid before showing reset form)
router.get('/verify-reset-token/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        valid: false, 
        message: 'Invalid or expired reset token' 
      });
    }

    res.status(200).json({ 
      valid: true, 
      message: 'Token is valid',
      email: user.email.replace(/(.{2})(.*)(@.*)/, '$1***$3') // Partially hide email
    });

  } catch (error) {
    console.error('Verify token error:', error);
    res.status(500).json({ valid: false, message: 'Error verifying token' });
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
