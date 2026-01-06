const Registration = require('../models/Registration');
const User = require('../models/User');

// @desc    Register user with full details (after signup/login)
// @route   POST /api/registration
// @access  Private (requires authentication)
exports.registerUser = async (req, res) => {
  try {
    const { fullName, email, gender, referralCode } = req.body;

    // Get user from auth middleware
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please login first.'
      });
    }

    // Check if user already registered
    if (user.isRegistered) {
      return res.status(400).json({
        success: false,
        message: 'User already completed registration'
      });
    }

    // Check if registration exists with this mobile or email
    const registrationExists = await Registration.findOne({ 
      $or: [{ mobile: user.mobile }, { email }] 
    });
    
    if (registrationExists) {
      return res.status(400).json({
        success: false,
        message: 'Registration already exists with this mobile number or email'
      });
    }

    // Create registration
    const registration = await Registration.create({
      user: user._id,
      mobile: user.mobile,
      fullName,
      email,
      gender,
      referralCode: referralCode || ''
    });

    // Update user registration status
    user.isRegistered = true;
    user.registrationId = registration._id;
    await user.save();

    res.status(201).json({
      success: true,
      message: 'Registration completed successfully',
      data: {
        _id: registration._id,
        mobile: registration.mobile,
        fullName: registration.fullName,
        email: registration.email,
        gender: registration.gender,
        referralCode: registration.referralCode
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all registrations
// @route   GET /api/registration
// @access  Public
exports.getAllRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: registrations.length,
      data: registrations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single registration
// @route   GET /api/registration/:id
// @access  Public
exports.getRegistration = async (req, res) => {
  try {
    const registration = await Registration.findById(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.json({
      success: true,
      data: registration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update registration
// @route   PUT /api/registration/:id
// @access  Public
exports.updateRegistration = async (req, res) => {
  try {
    const registration = await Registration.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.json({
      success: true,
      data: registration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete registration
// @route   DELETE /api/registration/:id
// @access  Public
exports.deleteRegistration = async (req, res) => {
  try {
    const registration = await Registration.findByIdAndDelete(req.params.id);

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.json({
      success: true,
      message: 'Registration deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Check user registration status
// @route   GET /api/registration/status/me
// @access  Private
exports.getMyRegistrationStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('registrationId');

    res.json({
      success: true,
      data: {
        isRegistered: user.isRegistered,
        mobile: user.mobile,
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

// @desc    Get my registration details
// @route   GET /api/registration/me
// @access  Private
exports.getMyRegistration = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user.isRegistered) {
      return res.status(404).json({
        success: false,
        message: 'Registration not completed yet'
      });
    }

    const registration = await Registration.findOne({ user: user._id });

    if (!registration) {
      return res.status(404).json({
        success: false,
        message: 'Registration not found'
      });
    }

    res.json({
      success: true,
      data: registration
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
