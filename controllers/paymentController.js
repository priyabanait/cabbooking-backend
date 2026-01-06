const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const DeliveryOrder = require('../models/DeliveryOrder');

// @desc    Create a new payment
// @route   POST /api/payments
// @access  Private
exports.createPayment = async (req, res) => {
  try {
    const {
      booking,
      deliveryOrder,
      amount,
      paymentMethod,
      paymentGateway,
      paymentDetails,
      metadata
    } = req.body;

    // Validate that at least one reference exists
    if (!booking && !deliveryOrder) {
      return res.status(400).json({
        success: false,
        message: 'Please provide either booking or delivery order reference'
      });
    }

    // Verify booking or delivery order exists
    if (booking) {
      const bookingExists = await Booking.findById(booking);
      if (!bookingExists) {
        return res.status(404).json({
          success: false,
          message: 'Booking not found'
        });
      }
    }

    if (deliveryOrder) {
      const orderExists = await DeliveryOrder.findById(deliveryOrder);
      if (!orderExists) {
        return res.status(404).json({
          success: false,
          message: 'Delivery order not found'
        });
      }
    }

    // Generate transaction ID
    const transactionId = `TXN${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const payment = await Payment.create({
      user: req.user.id,
      booking,
      deliveryOrder,
      amount,
      paymentMethod,
      paymentGateway,
      transactionId,
      paymentDetails,
      metadata,
      paymentStatus: paymentMethod === 'cash' ? 'pending' : 'processing'
    });

    // Update booking/delivery order payment status
    if (booking) {
      await Booking.findByIdAndUpdate(booking, {
        paymentStatus: payment.paymentStatus,
        paymentMethod
      });
    }

    if (deliveryOrder) {
      await DeliveryOrder.findByIdAndUpdate(deliveryOrder, {
        paymentStatus: payment.paymentStatus,
        paymentMethod
      });
    }

    res.status(201).json({
      success: true,
      message: 'Payment initiated successfully',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all payments for logged-in user
// @route   GET /api/payments
// @access  Private
exports.getUserPayments = async (req, res) => {
  try {
    const { status, method, startDate, endDate } = req.query;

    const query = { user: req.user.id };

    if (status) query.paymentStatus = status;
    if (method) query.paymentMethod = method;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const payments = await Payment.find(query)
      .populate('booking', 'pickup dropoff vehicleType')
      .populate('deliveryOrder', 'pickup dropoff parcelType')
      .sort({ createdAt: -1 });

    const totalAmount = payments.reduce((sum, payment) => {
      if (payment.paymentStatus === 'completed') {
        return sum + payment.amount;
      }
      return sum;
    }, 0);

    res.json({
      success: true,
      count: payments.length,
      totalAmount,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single payment details
// @route   GET /api/payments/:id
// @access  Private
exports.getPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('user', 'fullName email mobile')
      .populate('booking')
      .populate('deliveryOrder');

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Ensure user can only view their own payments
    if (payment.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this payment'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update payment status
// @route   PUT /api/payments/:id
// @access  Private
exports.updatePaymentStatus = async (req, res) => {
  try {
    const { paymentStatus, paymentDetails, failureReason } = req.body;

    let payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    payment.paymentStatus = paymentStatus || payment.paymentStatus;
    
    if (paymentDetails) {
      payment.paymentDetails = {
        ...payment.paymentDetails,
        ...paymentDetails
      };
    }

    if (paymentStatus === 'completed') {
      payment.completedAt = new Date();
    }

    if (paymentStatus === 'failed' && failureReason) {
      payment.failureReason = failureReason;
    }

    await payment.save();

    // Update related booking or delivery order
    if (payment.booking) {
      await Booking.findByIdAndUpdate(payment.booking, {
        paymentStatus: payment.paymentStatus
      });
    }

    if (payment.deliveryOrder) {
      await DeliveryOrder.findByIdAndUpdate(payment.deliveryOrder, {
        paymentStatus: payment.paymentStatus
      });
    }

    res.json({
      success: true,
      message: 'Payment status updated successfully',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Initiate refund
// @route   POST /api/payments/:id/refund
// @access  Private
exports.initiateRefund = async (req, res) => {
  try {
    const { amount, reason } = req.body;

    const payment = await Payment.findById(req.params.id);

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    if (payment.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to refund this payment'
      });
    }

    if (payment.paymentStatus !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Only completed payments can be refunded'
      });
    }

    const refundAmount = amount || payment.amount;

    if (refundAmount > payment.amount) {
      return res.status(400).json({
        success: false,
        message: 'Refund amount cannot exceed payment amount'
      });
    }

    payment.refund = {
      status: 'initiated',
      amount: refundAmount,
      refundId: `RFD${Date.now()}${Math.floor(Math.random() * 1000)}`,
      reason: reason || 'User requested refund',
      requestedAt: new Date()
    };

    payment.paymentStatus = 'refunded';

    await payment.save();

    res.json({
      success: true,
      message: 'Refund initiated successfully',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get payment statistics for user
// @route   GET /api/payments/stats
// @access  Private
exports.getPaymentStats = async (req, res) => {
  try {
    const stats = await Payment.aggregate([
      {
        $match: { user: req.user._id }
      },
      {
        $group: {
          _id: '$paymentStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const methodStats = await Payment.aggregate([
      {
        $match: { user: req.user._id, paymentStatus: 'completed' }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        statusStats: stats,
        methodStats: methodStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Verify payment callback (for payment gateways)
// @route   POST /api/payments/verify
// @access  Public
exports.verifyPayment = async (req, res) => {
  try {
    const { transactionId, paymentId, signature, status } = req.body;

    const payment = await Payment.findOne({ transactionId });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    // Here you would verify the signature with your payment gateway
    // Example for Razorpay:
    // const crypto = require('crypto');
    // const expectedSignature = crypto
    //   .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    //   .update(`${payment.paymentDetails.orderId}|${paymentId}`)
    //   .digest('hex');

    payment.paymentStatus = status || 'completed';
    payment.paymentDetails.paymentId = paymentId;
    payment.paymentDetails.signature = signature;
    payment.completedAt = new Date();

    await payment.save();

    // Update related records
    if (payment.booking) {
      await Booking.findByIdAndUpdate(payment.booking, {
        paymentStatus: payment.paymentStatus
      });
    }

    if (payment.deliveryOrder) {
      await DeliveryOrder.findByIdAndUpdate(payment.deliveryOrder, {
        paymentStatus: payment.paymentStatus
      });
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: payment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
