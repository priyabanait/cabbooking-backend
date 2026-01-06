const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  address: { type: String, required: true },
  coordinates: {
    // [lng, lat]
    type: [Number],
    required: true
  }
});

const scheduledRideSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pickup: {
    type: locationSchema,
    required: true
  },
  dropoff: {
    type: locationSchema,
    required: true
  },
  scheduledTime: {
    type: Date,
    required: true
  },
  vehicleType: {
    type: String,
    enum: [
      'bike_direct',
      'auto',
      'auto_priority',
      'cab_non_ac',
      'cab_ac',
      'cab_ac_sedan',
      'cab_premium',
      'cab_xl',
      'auto_pet',
      // Legacy values
      'sedan',
      'suv',
      'hatchback',
      'luxury'
    ],
    required: true
  },
  fareEstimate: {
    type: Number
  },
  distance: {
    type: Number
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  driverAssignedAt: Date,
  driverAcceptedAt: Date,
  rideStartedAt: Date,
  rideCompletedAt: Date,
  status: {
    type: String,
    enum: ['searching', 'driver_assigned', 'driver_accepted', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'searching'
  },
  searchRadius: {
    type: Number,
    default: 5 // km
  },
  assignmentAttempts: {
    type: Number,
    default: 0
  },
  notes: { type: String, default: '' },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ScheduledRide', scheduledRideSchema);
