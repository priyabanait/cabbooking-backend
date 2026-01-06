const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  deliveryOrder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DeliveryOrder'
  },
  amount: {
    type: Number,
    required: [true, 'Please provide payment amount'],
    min: 0
  },
  paymentMethod: {
    type: String,
    required: [true, 'Please provide payment method'],
    enum: ['cash', 'card', 'upi', 'wallet', 'netbanking']
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  paymentGateway: {
    type: String,
    enum: ['razorpay', 'paytm', 'stripe', 'phonepe', 'googlepay', 'cash'],
    default: 'cash'
  },
  paymentDetails: {
    orderId: String,
    paymentId: String,
    signature: String,
    cardLast4: String,
    upiId: String,
    walletProvider: String
  },
  refund: {
    status: {
      type: String,
      enum: ['none', 'initiated', 'processing', 'completed', 'failed'],
      default: 'none'
    },
    amount: {
      type: Number,
      default: 0
    },
    refundId: String,
    reason: String,
    requestedAt: Date,
    completedAt: Date
  },
  metadata: {
    ipAddress: String,
    device: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: [0, 0]
      }
    }
  },
  notes: {
    type: String,
    default: ''
  },
  completedAt: {
    type: Date
  },
  failureReason: {
    type: String
  }
}, {
  timestamps: true
});

// Index for faster queries
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ booking: 1 });
paymentSchema.index({ deliveryOrder: 1 });
paymentSchema.index({ transactionId: 1 });
paymentSchema.index({ paymentStatus: 1 });

module.exports = mongoose.model('Payment', paymentSchema);
