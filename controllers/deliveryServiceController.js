const DeliveryService = require('../models/DeliveryService');

// @desc    Get all delivery services
// @route   GET /api/delivery-services
// @access  Public
exports.getAllServices = async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = { isActive: true };
    if (category) {
      query.category = category;
    }

    const services = await DeliveryService.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: services.length,
      data: services
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Get single delivery service
// @route   GET /api/delivery-services/:id
// @access  Public
exports.getService = async (req, res) => {
  try {
    const service = await DeliveryService.findById(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Create delivery service
// @route   POST /api/delivery-services
// @access  Private (Admin only)
exports.createService = async (req, res) => {
  try {
    const service = await DeliveryService.create(req.body);

    res.status(201).json({
      success: true,
      data: service
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Update delivery service
// @route   PUT /api/delivery-services/:id
// @access  Private (Admin only)
exports.updateService = async (req, res) => {
  try {
    const service = await DeliveryService.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      data: service
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Delete delivery service
// @route   DELETE /api/delivery-services/:id
// @access  Private (Admin only)
exports.deleteService = async (req, res) => {
  try {
    const service = await DeliveryService.findByIdAndDelete(req.params.id);

    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }

    res.json({
      success: true,
      message: 'Service deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc    Seed initial delivery services
// @route   POST /api/delivery-services/seed
// @access  Private (Admin only)
exports.seedServices = async (req, res) => {
  try {
    const services = [
      {
        name: 'Restaurant Delivery',
        category: 'Food & Essentials',
        type: 'Restaurant Delivery',
        description: 'Order food from your favorite restaurants',
        icon: 'restaurant',
        estimatedTime: { min: 30, max: 45, unit: 'mins' },
        features: ['Fast delivery', 'Hot & fresh', 'Track order'],
        basePrice: 20,
        pricePerKm: 8,
        isActive: true
      },
      {
        name: 'Grocery Delivery',
        category: 'Food & Essentials',
        type: 'Grocery Delivery',
        description: 'Get groceries delivered to your doorstep',
        icon: 'grocery',
        estimatedTime: { min: 45, max: 60, unit: 'mins' },
        features: ['Fresh products', 'Wide selection', 'Same day delivery'],
        basePrice: 30,
        pricePerKm: 10,
        isActive: true
      },
      {
        name: 'Medicine Delivery',
        category: 'Food & Essentials',
        type: 'Medicine Delivery',
        description: 'Get medicines delivered safely',
        icon: 'medical',
        estimatedTime: { min: 30, max: 30, unit: 'mins' },
        features: ['Safe delivery', 'Prescription support', 'Fast service'],
        basePrice: 25,
        pricePerKm: 12,
        isActive: true
      },
      {
        name: 'Parcel Delivery',
        category: 'Parcel',
        type: 'Parcel Delivery',
        description: 'Send parcels anywhere in the city',
        icon: 'parcel',
        estimatedTime: { min: 60, max: 120, unit: 'mins' },
        features: ['Safe delivery', 'Track parcel', 'Insurance available'],
        basePrice: 40,
        pricePerKm: 15,
        isActive: true
      }
    ];

    await DeliveryService.deleteMany({});
    const createdServices = await DeliveryService.insertMany(services);

    res.status(201).json({
      success: true,
      message: 'Services seeded successfully',
      count: createdServices.length,
      data: createdServices
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
