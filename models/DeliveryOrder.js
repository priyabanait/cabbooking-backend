const mongoose = require('mongoose');

const deliveryOrderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  serviceType: {
    type: String,
    required: [true, 'Please provide service type'],
    enum: ['Restaurant Delivery', 'Grocery Delivery', 'Medicine Delivery', 'Parcel Delivery']
  },
  pickup: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    },
    contactName: String,
    contactPhone: String
  },
  delivery: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      type: [Number],
      required: true
    },
    contactName: String,
    contactPhone: String
  },
  items: [{
    name: String,
    quantity: Number,
    price: Number
  }],
  itemsTotal: {
    type: Number,
    default: 0
  },
  deliveryFee: {
    type: Number,
    required: true
  },
  totalAmount: {
    type: Number,
    required: true
  },
  distance: {
    type: Number,
    required: true
  },
  estimatedTime: {
    type: Number
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver'
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'picked_up', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'upi', 'wallet'],
    default: 'cash'
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed'],
    default: 'pending'
  },
  instructions: {
    type: String,
    default: ''
  },
  scheduledTime: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DeliveryOrder', deliveryOrderSchema);
