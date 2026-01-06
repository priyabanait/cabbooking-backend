const mongoose = require('mongoose');

const driverSignupSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Please provide your full name'],
    trim: true
  },

  mobile: {
    type: String,
    required: [true, 'Please provide a mobile number'],
    unique: true
  },

  isRegistered: {
    type: Boolean,
    default: false
  },

  registrationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Registration'
  },

  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DriverSignup', driverSignupSchema);
