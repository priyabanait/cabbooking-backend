const FareCalculation = require('../models/FareCalculation');

// Haversine formula to calculate distance between two coordinates (km)
const calculateDistance = (pickup, dropoff) => {
  const R = 6371; // Earth radius in km
  const dLat = (dropoff[1] - pickup[1]) * (Math.PI / 180);
  const dLng = (dropoff[0] - pickup[0]) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(pickup[1] * (Math.PI / 180)) *
      Math.cos(dropoff[1] * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
};

// Check if a point is inside a polygon using ray casting algorithm
const isPointInPolygon = (point, polygon) => {
  const [lng, lat] = point;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
};

// @desc Calculate fare based on pickup & dropoff coordinates and vehicle type
// @route POST /api/fare/calculate
// @access Public
exports.calculateFare = async (req, res) => {
  try {
    const { pickup, dropoff, vehicleType = 'sedan', duration = 0 } = req.body;

    // Validate inputs
    if (!pickup || !dropoff || !pickup.coordinates || !dropoff.coordinates) {
      return res.status(400).json({
        success: false,
        message: 'Pickup and dropoff coordinates are required'
      });
    }

    if (!Array.isArray(pickup.coordinates) || pickup.coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Pickup coordinates must be [lng, lat]'
      });
    }

    if (!Array.isArray(dropoff.coordinates) || dropoff.coordinates.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Dropoff coordinates must be [lng, lat]'
      });
    }

    // Get fare configuration for vehicle type
    const fareConfig = await FareCalculation.findOne({
      vehicleType,
      isActive: true
    });

    if (!fareConfig) {
      return res.status(404).json({
        success: false,
        message: `Fare configuration not found for vehicle type: ${vehicleType}`
      });
    }

    // Calculate distance
    const distance = calculateDistance(pickup.coordinates, dropoff.coordinates);

    // Check for zone-based surge multiplier
    let surgeMultiplier = fareConfig.surgeMultiplier;

    if (fareConfig.zones && fareConfig.zones.length > 0) {
      for (const zone of fareConfig.zones) {
        if (zone.area && zone.area.coordinates && zone.area.coordinates.length > 0) {
          // Check if dropoff is in zone (zone-based pricing)
          const polygon = zone.area.coordinates[0]; // First ring of polygon
          if (isPointInPolygon(dropoff.coordinates, polygon)) {
            surgeMultiplier = zone.surgeMultiplier || fareConfig.surgeMultiplier;
            break;
          }
        }
      }
    }

    // Calculate fare: base + (distance * perKmRate) + (duration * perMinuteRate)
    let fare = fareConfig.baseFare + distance * fareConfig.perKmRate + (duration || 0) * fareConfig.perMinuteRate;

    // Apply surge multiplier
    fare *= surgeMultiplier;

    // Apply minimum fare
    fare = Math.max(fare, fareConfig.minimumFare);

    // Round to 2 decimal places
    fare = Math.round(fare * 100) / 100;

    // Calculate estimated time to destination
    // Average city speed: 30 km/h (can be adjusted based on traffic conditions)
    const averageSpeed = 30; // km/h
    const estimatedTimeInMinutes = Math.round((distance / averageSpeed) * 60);
    
    // Calculate estimated arrival time
    const currentTime = new Date();
    const estimatedArrivalTime = new Date(currentTime.getTime() + estimatedTimeInMinutes * 60000);
    
    // Format dropping time
    const droppingTime = estimatedArrivalTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    res.json({
      success: true,
      data: {
        fare,
        distance: Math.round(distance * 100) / 100,
        duration: duration || 0,
        vehicleType,
        baseFare: fareConfig.baseFare,
        perKmRate: fareConfig.perKmRate,
        surgeMultiplier,
        estimatedTimeInMinutes,
        droppingTime,
        estimatedArrivalTime: estimatedArrivalTime.toISOString(),
        breakdown: {
          baseFare: Math.round(fareConfig.baseFare * 100) / 100,
          distanceFare: Math.round(distance * fareConfig.perKmRate * 100) / 100,
          durationFare: Math.round((duration || 0) * fareConfig.perMinuteRate * 100) / 100,
          surgeApplied: surgeMultiplier > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc Get all fare configurations
// @route GET /api/fare
// @access Public
exports.getAllFares = async (req, res) => {
  try {
    // Get all fares (including inactive ones for admin view)
    const fares = await FareCalculation.find({});

    res.json({
      success: true,
      count: fares.length,
      data: fares
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc Get fare configuration for vehicle type
// @route GET /api/fare/:vehicleType
// @access Public
exports.getFareByVehicleType = async (req, res) => {
  try {
    const fare = await FareCalculation.findOne({
      vehicleType: req.params.vehicleType,
      isActive: true
    });

    if (!fare) {
      return res.status(404).json({
        success: false,
        message: `Fare configuration not found for vehicle type: ${req.params.vehicleType}`
      });
    }

    res.json({
      success: true,
      data: fare
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc Create or update fare configuration (admin)
// @route POST /api/fare
// @access Admin
exports.createFare = async (req, res) => {
  try {
    const { vehicleType, baseFare, basefare, perKmRate, perMinuteRate, minimumFare, surgeMultiplier, isActive, zones } = req.body;

    // Accept both baseFare and basefare for backward compatibility
    const fareAmount = baseFare || basefare;

    if (!vehicleType || fareAmount === undefined || perKmRate === undefined) {
      return res.status(400).json({
        success: false,
        message: 'vehicleType, baseFare, and perKmRate are required'
      });
    }

    // Check if fare config already exists
    let fare = await FareCalculation.findOne({ vehicleType });

    if (fare) {
      return res.status(400).json({
        success: false,
        message: 'Fare configuration already exists for this vehicle type. Use update instead.'
      });
    }

    // Create new
    fare = await FareCalculation.create({
      vehicleType,
      baseFare: fareAmount,
      perKmRate,
      perMinuteRate: perMinuteRate || 2,
      minimumFare: minimumFare || 50,
      surgeMultiplier: surgeMultiplier || 1,
      isActive: isActive !== undefined ? isActive : true,
      zones: zones || []
    });

    res.status(201).json({
      success: true,
      message: 'Fare configuration created',
      data: fare
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc Update fare configuration
// @route PUT /api/fare/:id
// @access Admin
exports.updateFare = async (req, res) => {
  try {
    const { vehicleType, baseFare, perKmRate, perMinuteRate, minimumFare, surgeMultiplier, isActive, zones } = req.body;

    let fare = await FareCalculation.findById(req.params.id);

    if (!fare) {
      return res.status(404).json({
        success: false,
        message: 'Fare configuration not found'
      });
    }

    // Check if changing vehicle type and if it already exists
    if (vehicleType && vehicleType !== fare.vehicleType) {
      const existingFare = await FareCalculation.findOne({ 
        vehicleType,
        _id: { $ne: req.params.id }
      });
      
      if (existingFare) {
        return res.status(400).json({
          success: false,
          message: 'Vehicle type already exists for another fare configuration'
        });
      }
      
      fare.vehicleType = vehicleType;
    }

    // Update fields
    if (baseFare !== undefined) fare.baseFare = baseFare;
    if (perKmRate !== undefined) fare.perKmRate = perKmRate;
    if (perMinuteRate !== undefined) fare.perMinuteRate = perMinuteRate;
    if (minimumFare !== undefined) fare.minimumFare = minimumFare;
    if (surgeMultiplier !== undefined) fare.surgeMultiplier = surgeMultiplier;
    if (isActive !== undefined) fare.isActive = isActive;
    if (zones) fare.zones = zones;

    await fare.save();

    res.json({
      success: true,
      message: 'Fare configuration updated',
      data: fare
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// @desc Delete fare configuration
// @route DELETE /api/fare/:id
// @access Admin
exports.deleteFare = async (req, res) => {
  try {
    const fare = await FareCalculation.findByIdAndDelete(req.params.id);

    if (!fare) {
      return res.status(404).json({
        success: false,
        message: 'Fare configuration not found'
      });
    }

    res.json({
      success: true,
      message: 'Fare configuration deleted',
      data: fare
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
