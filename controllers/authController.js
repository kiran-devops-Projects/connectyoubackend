const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const registerUser = async (req, res) => {
    try {
      console.log("Received registration request:", req.body);
  
      const { firstName, lastName, email, password, phone, userType, socialProvider, socialId, ...rest } = req.body;
  
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists.' });
      }
  
      let firebaseUID = null;
      if (socialProvider && socialId) {
        firebaseUID = socialId;
      }
  
      let hashedPassword = null;
      if (!firebaseUID) {
        if (!password || password.length < 6) {
          return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
        }
        hashedPassword = await bcrypt.hash(password, 10);
      }
  
      // Prevent null firebaseUID if not using social authentication
      const userData = {
        firstName,
        lastName,
        email,
        password: hashedPassword,
        phone,
        userType,
        firebaseUID: firebaseUID || undefined, // Ensuring undefined instead of null
        ...rest
      };
  
      console.log("Creating user with data:", userData);
  
      const user = new User(userData);
      await user.save();
  
      const token = jwt.sign({ userId: user._id, email: user.email }, process.env.JWT_SECRET, {
        expiresIn: '7d'
      });
  
      res.status(201).json({ 
        message: 'User registered successfully.', 
        user: { id: user._id, firstName, lastName, email, phone, userType }, 
        token 
      });
  
    } catch (error) {
      console.error('🔥 Registration error:', error);  // Log full error
      res.status(500).json({ message: 'Registration failed.', error: error.message });
    }
  };
  