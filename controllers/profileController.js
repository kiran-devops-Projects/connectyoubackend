const Profile = require("../models/Profile");
const User = require("../models/User");
const { validateProfile } = require("../middleware/validators");

const getProfile = async (req, res) => {
  try {
    // Get userId from the decoded token
    const userId = req.user.userId;

    // Try to find the profile
    let profile = await Profile.findOne({ user: userId }).populate('user', 'firstName lastName email');
    
    // If profile doesn't exist, create an empty one with the user reference
    if (!profile) {
      // First check if this is an actual valid user
      const userExists = await User.findById(userId);
      if (!userExists) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Create a new profile with minimal data but proper user reference
      profile = new Profile({
        user: userId,
        skills: [],
        createdAt: Date.now()
      });
      await profile.save();
      
      return res.status(200).json(profile);
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error("Profile fetch error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.user.userId;

    const updatedFields = {
      ...req.body,
      user: userId, // Ensure the user reference is set correctly
      skills: Array.isArray(req.body.skills)
        ? req.body.skills
        : req.body.skills?.split(',').map(skill => skill.trim()),
      updatedAt: Date.now()
    };

    const updatedProfile = await Profile.findOneAndUpdate(
      { user: userId },
      { $set: updatedFields },
      { new: true, upsert: true }
    );

    res.status(200).json(updatedProfile);
  } catch (error) {
    console.error("Profile update error:", error.message);
    res.status(500).json({ message: "Server Error" });
  }
};

module.exports = { getProfile, updateProfile };