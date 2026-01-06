const mongoose = require('mongoose');

const deliveryServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide service name'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please provide service category'],
    enum: ['Food & Essentials', 'Parcel']
  },
  type: {
    type: String,
    required: [true, 'Please provide service type'],
    enum: ['Restaurant Delivery', 'Grocery Delivery', 'Medicine Delivery', 'Parcel Delivery']
  },
  description: {
    type: String,
    required: [true, 'Please provide description']
  },
  icon: {
    type: String,
    default: ''
  },
  estimatedTime: {
    min: {
      type: Number,
      required: true
    },
    max: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      default: 'mins'
    }
  },
  features: [{
    type: String
  }],
  basePrice: {
    type: Number,
    required: [true, 'Please provide base price'],
    default: 0
  },
  pricePerKm: {
    type: Number,
    required: [true, 'Please provide price per km'],
    default: 10
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DeliveryService', deliveryServiceSchema);
