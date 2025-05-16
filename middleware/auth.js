const jwt = require('jsonwebtoken');
const { User } = require('../models/User');


const authenticateUser = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded:", decoded); // Should show { userId, role }

    const user = await User.findById(decoded.userId); // ✅ use userId here
    const student = await User.findById(decoded.studentId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.token = token;
    req.user = {
      id: user._id,
      role: user.role,
     
    };
   

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ message: 'Token is invalid' });
  }
};

module.exports = authenticateUser;
