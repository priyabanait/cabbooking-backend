const DeliveryOrder = require('../models/DeliveryOrder');
const User = require('../models/User');

// @desc    Create new delivery order
// @route   POST /api/delivery-orders
// @access  Private
exports.createOrder = async (req, res) => {
  try {
    const { serviceType, pickup, delivery, items, deliveryFee, distance, estimatedTime, instructions } = req.body;

    // Check if user has completed registration
    const user = await User.findById(req.user.id).populate('registrationId');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.isRegistered || !user.registrationId) {
      return res.status(400).json({
        success: false,
        message: 'Please complete registration before placing an order',
        requiresRegistration: true
      });
    }

    // Calculate totals
    const itemsTotal = items ? items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0;
    const totalAmount = itemsTotal + deliveryFee;

    const order = await DeliveryOrder.create({
      user: req.user.id,
      serviceType,
      pickup,
      delivery,
      items,
      itemsTotal,
      deliveryFee,
      totalAmount,
      distance,
      estimatedTime,
      instructions: instructions || ''
    });

    // Populate user details
    await order.populate('user', 'fullName mobile');

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all orders for user
// @route   GET /api/delivery-orders
// @access  Private
exports.getMyOrders = async (req, res) => {
  try {
    const orders = await DeliveryOrder.find({ user: req.user.id })
      .populate('driver', 'name phone vehicle')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single order
// @route   GET /api/delivery-orders/:id
// @access  Private
exports.getOrder = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id)
      .populate('user', 'fullName mobile')
      .populate('driver', 'name phone vehicle');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order
    if (order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this order'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update order status
// @route   PUT /api/delivery-orders/:id/status
// @access  Private (Driver/Admin)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    let order = await DeliveryOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.status = status;
    
    if (status === 'delivered') {
      order.completedAt = Date.now();
      order.paymentStatus = 'paid';
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Cancel order
// @route   PUT /api/delivery-orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    const order = await DeliveryOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Check if user owns this order
    if (order.user.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this order'
      });
    }

    // Can only cancel pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order in current status'
      });
    }

    order.status = 'cancelled';
    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Assign driver to order
// @route   PUT /api/delivery-orders/:id/assign-driver
// @access  Private (Admin)
exports.assignDriver = async (req, res) => {
  try {
    const { driverId } = req.body;

    const order = await DeliveryOrder.findById(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    order.driver = driverId;
    order.status = 'confirmed';
    await order.save();

    await order.populate('driver', 'name phone vehicle');

    res.json({
      success: true,
      message: 'Driver assigned successfully',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get all orders (Admin)
// @route   GET /api/delivery-orders/all
// @access  Private (Admin)
exports.getAllOrders = async (req, res) => {
  try {
    const { status, serviceType } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (serviceType) query.serviceType = serviceType;

    const orders = await DeliveryOrder.find(query)
      .populate('user', 'fullName mobile')
      .populate('driver', 'name phone vehicle')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
