const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// @desc    Signup user
// @route   POST /api/auth/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { name, mobile, password } = req.body;

    // Log request data for debugging
    console.log('Signup attempt:', { name, mobile, passwordProvided: !!password });

    // Check if user exists
    const userExists = await User.findOne({ mobile: mobile });
    if (userExists) {
      console.log('User already exists:', { mobile, userId: userExists._id });
      return res.status(400).json({
        success: false,
        message: 'User already exists with this mobile number. Please login instead.'
      });
    }

    // Create user
    const user = await User.create({
      fullName: name,
      mobile: mobile,
      password
    });

    res.status(201).json({
      success: true,
      message: 'Signup successful. Please complete registration to book rides.',
      data: {
        _id: user._id,
        name: user.fullName,
        mobile: user.mobile,
        isRegistered: user.isRegistered,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already exists. Please use a different number or login.'
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    // Check for user
    const user = await User.findOne({ mobile: mobile }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    res.json({
      success: true,
      message: user.isRegistered ? 'Login successful' : 'Login successful. Please complete registration to book rides.',
      data: {
        _id: user._id,
        name: user.fullName,
        mobile: user.mobile,
        isRegistered: user.isRegistered,
        token: generateToken(user._id)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('registrationId');
    res.json({
      success: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        mobile: user.mobile,
        isRegistered: user.isRegistered,
        registration: user.registrationId || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
