const express = require('express');
const router = express.Router();
const { getProfile, updateProfile } = require('../controllers/profileController');
const authenticate = require('../middleware/auth'); // A middleware to authenticate the user

// Route to get the user profile
router.get('/', authenticate, getProfile);

// Route to update the user profile
router.put('/updateprofile', authenticate, updateProfile);

module.exports = router;
