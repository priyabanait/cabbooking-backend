const jwt = require('jsonwebtoken');
const DriverSignup = require('../models/DriverSignup');

// Protect driver routes - verify JWT token
exports.protectDriver = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route. Please login.'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await DriverSignup.findById(decoded.id);
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Driver not found'
      });
    }

    next();
  } catch (error) {
    console.error('Driver auth error:', error);
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Check if driver is registered
exports.requireRegistration = async (req, res, next) => {
  if (!req.user.isRegistered) {
    return res.status(403).json({
      success: false,
      message: 'Please complete registration to access this feature'
    });
  }
  next();
};
