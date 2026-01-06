const mongoose = require('mongoose');

const DriverSchema = new mongoose.Schema({
  id: Number,
  username: { type: String, unique: true, sparse: true },
  password: String,
  name: String,
  email: String,
  phone: String,
  mobile: { type: String, unique: true, sparse: true },
  dateOfBirth: String,
  address: String,
  city: String,
  state: String,
  pincode: String,
  latitude: String,
  longitude: String,
  // Real-time location tracking
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: undefined
    },
    address: String,
    timestamp: Date
  },
  locationHistory: [{
    coordinates: [Number], // [longitude, latitude]
    timestamp: { type: Date, default: Date.now },
    speed: Number,
    heading: Number
  }],
  isOnline: { type: Boolean, default: false },
  availability: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'offline'
  },
  lastLocationUpdate: Date,
  emergencyContact: String,
  emergencyRelation: String,
  emergencyPhone: String,
  emergencyPhoneSecondary: String,
  employeeId: String,
  licenseNumber: String,
  licenseExpiryDate: String,
  licenseClass: String,
  aadharNumber: String,
  panNumber: String,
  electricBillNo: String,
  experience: String,
  previousEmployment: String,
  planType: String,
  vehiclePreference: String,
  bankName: String,
  accountNumber: String,
  ifscCode: String,
  accountHolderName: String,
  accountBranchName: String,
  profilePhoto: String,
  licenseDocument: String,
  aadharDocument: String,
  aadharDocumentBack: String,
  panDocument: String,
  bankDocument: String,
  electricBillDocument: String,
  status: { type: String, default: 'inactive' },
  kycStatus: String,
  registrationCompleted: { type: Boolean, default: false }, // Track if registration form was filled
  joinDate: String,
  lastActive: String,
  vehicleAssigned: String,
  totalEarnings: Number,
  rating: Number,
  totalTrips: Number,
  currentPlan: String,
  planAmount: Number,
  documents: Object
}, { timestamps: true, strict: false });

// Create geospatial index for location queries
DriverSchema.index({ 'currentLocation': '2dsphere' });

const Driver = mongoose.models.Driver || mongoose.model('Driver', DriverSchema);

module.exports = Driver;
