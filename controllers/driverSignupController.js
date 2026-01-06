const DriverSignup = require('../models/DriverSignup');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @desc    Driver Signup
// @route   POST /api/driver-signup/signup
// @access  Public
exports.signup = async (req, res) => {
  try {
    const { fullName, mobile, password } = req.body;

    // Validation
    if (!fullName || !mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: fullName, mobile, password'
      });
    }

    // Log request data for debugging
    console.log('Driver signup attempt:', { fullName, mobile, passwordProvided: !!password });

    // Check if driver exists
    const driverExists = await DriverSignup.findOne({ mobile });
    if (driverExists) {
      console.log('Driver already exists:', { mobile, driverId: driverExists._id });
      return res.status(400).json({
        success: false,
        message: 'Driver already exists with this mobile number. Please login instead.'
      });
    }

    // Create driver
    const driver = await DriverSignup.create({
      fullName,
      mobile,
      password
    });

    res.status(201).json({
      success: true,
      message: 'Driver signup successful. Please complete registration to start driving.',
      data: {
        _id: driver._id,
        fullName: driver.fullName,
        mobile: driver.mobile,
        isRegistered: driver.isRegistered,
        registrationId: driver.registrationId,
        token: generateToken(driver._id)
      }
    });
  } catch (error) {
    console.error('Driver signup error:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number already exists. Please use a different number or login.'
      });
    }
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during driver signup'
    });
  }
};

// @desc    Driver Login
// @route   POST /api/driver-signup/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    // Validation
    if (!mobile || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide mobile number and password'
      });
    }

    // Check for driver
    const driver = await DriverSignup.findOne({ mobile });
    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check password (plain text comparison - NOT RECOMMENDED for production)
    if (driver.password !== password) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        _id: driver._id,
        fullName: driver.fullName,
        mobile: driver.mobile,
        isRegistered: driver.isRegistered,
        registrationId: driver.registrationId,
        token: generateToken(driver._id)
      }
    });
  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error during login'
    });
  }
};

// @desc    Get driver profile
// @route   GET /api/driver-signup/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const driver = await DriverSignup.findById(req.user.id)
      .populate('registrationId', 'vehicleType vehicleNumber licenseNumber');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: driver._id,
        fullName: driver.fullName,
        mobile: driver.mobile,
        isRegistered: driver.isRegistered,
        registrationId: driver.registrationId,
        createdAt: driver.createdAt
      }
    });
  } catch (error) {
    console.error('Get driver profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching driver profile'
    });
  }
};

// @desc    Update driver profile
// @route   PUT /api/driver-signup/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, registrationId, isRegistered } = req.body;

    const driver = await DriverSignup.findById(req.user.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Update fields
    if (fullName) driver.fullName = fullName;
    if (registrationId !== undefined) driver.registrationId = registrationId;
    if (isRegistered !== undefined) driver.isRegistered = isRegistered;

    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        _id: driver._id,
        fullName: driver.fullName,
        mobile: driver.mobile,
        isRegistered: driver.isRegistered,
        registrationId: driver.registrationId,
        createdAt: driver.createdAt
      }
    });
  } catch (error) {
    console.error('Update driver profile error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating profile'
    });
  }
};

// @desc    Update driver password
// @route   PUT /api/driver-signup/password
// @access  Private
exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    const driver = await DriverSignup.findById(req.user.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Check current password (plain text comparison)
    if (driver.password !== currentPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    driver.password = newPassword;
    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully',
      data: {
        token: generateToken(driver._id)
      }
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating password'
    });
  }
};

// @desc    Get all drivers (Admin)
// @route   GET /api/driver-signup/all
// @access  Private/Admin
exports.getAllDrivers = async (req, res) => {
  try {
    const { page = 1, limit = 10, isRegistered, search } = req.query;

    const query = {};

    // Filter by registration status
    if (isRegistered !== undefined) {
      query.isRegistered = isRegistered === 'true';
    }

    // Search by name or mobile
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const drivers = await DriverSignup.find(query)
      .populate('registrationId', 'vehicleType vehicleNumber licenseNumber')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await DriverSignup.countDocuments(query);

    res.status(200).json({
      success: true,
      data: drivers,
      totalPages: Math.ceil(count / limit),
      currentPage: parseInt(page),
      total: count
    });
  } catch (error) {
    console.error('Get all drivers error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching drivers'
    });
  }
};

// @desc    Get driver by ID (Admin)
// @route   GET /api/driver-signup/:id
// @access  Private/Admin
exports.getDriverById = async (req, res) => {
  try {
    const driver = await DriverSignup.findById(req.params.id)
      .populate('registrationId', 'vehicleType vehicleNumber licenseNumber');

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    res.status(200).json({
      success: true,
      data: driver
    });
  } catch (error) {
    console.error('Get driver by ID error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error fetching driver'
    });
  }
};

// @desc    Update driver (Admin)
// @route   PUT /api/driver-signup/:id
// @access  Private/Admin
exports.updateDriver = async (req, res) => {
  try {
    const { fullName, mobile, isRegistered, registrationId } = req.body;

    const driver = await DriverSignup.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Update fields
    if (fullName !== undefined) driver.fullName = fullName;
    if (mobile !== undefined) driver.mobile = mobile;
    if (isRegistered !== undefined) driver.isRegistered = isRegistered;
    if (registrationId !== undefined) driver.registrationId = registrationId;

    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Driver updated successfully',
      data: driver
    });
  } catch (error) {
    console.error('Update driver error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error updating driver'
    });
  }
};

// @desc    Delete driver (Admin)
// @route   DELETE /api/driver-signup/:id
// @access  Private/Admin
exports.deleteDriver = async (req, res) => {
  try {
    const driver = await DriverSignup.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    await driver.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Driver deleted successfully'
    });
  } catch (error) {
    console.error('Delete driver error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error deleting driver'
    });
  }
};

// @desc    Link driver to registration
// @route   PUT /api/driver-signup/:id/link-registration
// @access  Private/Admin
exports.linkRegistration = async (req, res) => {
  try {
    const { registrationId } = req.body;

    if (!registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Please provide registrationId'
      });
    }

    const driver = await DriverSignup.findById(req.params.id);

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    driver.registrationId = registrationId;
    driver.isRegistered = true;
    await driver.save();

    res.status(200).json({
      success: true,
      message: 'Registration linked successfully',
      data: driver
    });
  } catch (error) {
    console.error('Link registration error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error linking registration'
    });
  }
};
