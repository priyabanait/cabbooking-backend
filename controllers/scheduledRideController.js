const ScheduledRide = require('../models/ScheduledRide');
const User = require('../models/User');
const FareCalculation = require('../models/FareCalculation');
const Driver = require('../models/Driver');

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

// Find nearby available drivers
const findNearbyDrivers = async (pickupCoords, vehicleType, radius = 5) => {
  try {
    const radiusInMeters = radius * 1000;

    const query = {
      'currentLocation.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: pickupCoords // [lng, lat]
          },
          $maxDistance: radiusInMeters
        }
      },
      isOnline: true,
      availability: 'available',
      status: 'active'
    };

    // Add vehicle type filter if specified
    if (vehicleType) {
      query.vehiclePreference = vehicleType;
    }

    const drivers = await Driver.find(query)
      .select('id name phone mobile vehiclePreference currentLocation rating totalTrips')
      .limit(10)
      .lean();

    return drivers;
  } catch (error) {
    console.error('Error finding nearby drivers:', error);
    return [];
  }
};

// Assign driver to ride
const assignDriverToRide = async (rideId, driver, io) => {
  try {
    const ride = await ScheduledRide.findByIdAndUpdate(
      rideId,
      {
        driver: driver._id,
        status: 'driver_assigned',
        driverAssignedAt: new Date(),
        $inc: { assignmentAttempts: 1 }
      },
      { new: true }
    ).populate('user', 'fullName mobile email')
     .populate('driver', 'name phone mobile vehiclePreference');

    // Send notification via WebSocket if available
    if (io) {
      // Notify driver about new ride request
      io.emit('ride:request', {
        rideId: ride._id,
        driverId: driver.id || driver._id,
        pickup: ride.pickup,
        dropoff: ride.dropoff,
        scheduledTime: ride.scheduledTime,
        fareEstimate: ride.fareEstimate,
        distance: ride.distance,
        passenger: {
          name: ride.user.fullName,
          mobile: ride.user.mobile
        }
      });

      // Notify user that driver is assigned
      io.emit('driver:assigned', {
        rideId: ride._id,
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          vehicle: driver.vehiclePreference,
          rating: driver.rating
        }
      });
    }

    return ride;
  } catch (error) {
    console.error('Error assigning driver:', error);
    return null;
  }
};

// @desc Create a scheduled ride
// @route POST /api/scheduled-rides
// @access Private
exports.createScheduledRide = async (req, res) => {
  try {
    const { pickup, dropoff, scheduledTime, vehicleType, notes } = req.body;

    // determine user by auth, explicit user id in body, id param, or mobile
    let user;
    if (req.user && req.user.id) {
      user = await User.findById(req.user.id);
    } else if (req.body.user) {
      user = await User.findById(req.body.user);
    } else if (req.body.id) {
      user = await User.findById(req.body.id);
    } else if (req.query.id) {
      user = await User.findById(req.query.id);
    } else if (req.body.mobile) {
      user = await User.findOne({ mobile: req.body.mobile });
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found. Provide valid mobile or Authorization.' });
    }

    // Calculate fare estimate based on admin's fare configuration
    let fareEstimate = null;
    let distance = null;

    if (pickup?.coordinates && dropoff?.coordinates) {
      // Calculate distance
      distance = calculateDistance(pickup.coordinates, dropoff.coordinates);

      // Get fare configuration for this vehicle type
      const fareConfig = await FareCalculation.findOne({
        vehicleType,
        isActive: true
      });

      if (fareConfig) {
        // Calculate fare: base + (distance * perKmRate) + (duration * perMinuteRate)
        let fare = fareConfig.baseFare + (distance * fareConfig.perKmRate);
        
        // Apply surge multiplier
        fare *= fareConfig.surgeMultiplier;
        
        // Apply minimum fare
        fare = Math.max(fare, fareConfig.minimumFare);
        
        // Round to 2 decimal places
        fareEstimate = Math.round(fare * 100) / 100;
      }
    }

    // Create the ride with "searching" status
    const ride = await ScheduledRide.create({
      user: user._id,
      pickup,
      dropoff,
      scheduledTime: new Date(scheduledTime),
      vehicleType,
      notes,
      fareEstimate,
      distance: distance ? Math.round(distance * 100) / 100 : null,
      status: 'searching'
    });

    await ride.populate('user', 'fullName mobile');

    // Find nearby drivers and notify them (don't auto-assign)
    const nearbyDrivers = await findNearbyDrivers(pickup.coordinates, vehicleType, 5);
    
    const io = req.app.get('io');

    if (nearbyDrivers.length > 0) {
      // Notify ALL nearby drivers about the ride request
      nearbyDrivers.forEach(driver => {
        if (io) {
          io.emit('ride:request', {
            rideId: ride._id,
            driverId: driver.id || driver._id,
            pickup: ride.pickup,
            dropoff: ride.dropoff,
            scheduledTime: ride.scheduledTime,
            fareEstimate: ride.fareEstimate,
            distance: ride.distance,
            passenger: {
              name: ride.user.fullName,
              mobile: ride.user.mobile
            }
          });
        }
      });

      // Notify user that drivers were found
      if (io) {
        io.emit('ride:drivers_found', {
          rideId: ride._id,
          driversCount: nearbyDrivers.length,
          message: `Found ${nearbyDrivers.length} nearby drivers. Waiting for acceptance...`
        });
      }

      return res.status(201).json({ 
        success: true, 
        message: `Ride created, ${nearbyDrivers.length} drivers notified`,
        data: ride,
        driversFound: nearbyDrivers.length
      });
    }

    // No drivers found
    if (io) {
      io.emit('ride:no_drivers', {
        rideId: ride._id,
        pickup: ride.pickup,
        vehicleType: ride.vehicleType,
        fareEstimate: ride.fareEstimate,
        message: 'No drivers available nearby'
      });
    }

    res.status(201).json({ 
      success: true, 
      message: 'Ride created, but no drivers available nearby',
      data: ride,
      driversFound: 0
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all scheduled rides for current user
// @route GET /api/scheduled-rides
// @access Private
exports.getMyScheduledRides = async (req, res) => {
  try {
    // allow fetching by Authorization or by mobile query param
    let user;
    if (req.user && req.user.id) {
      user = await User.findById(req.user.id);
    } else if (req.body.user) {
      user = await User.findById(req.body.user);
    } else if (req.query.mobile || req.body.mobile) {
      const mobile = req.query.mobile || req.body.mobile;
      user = await User.findOne({ mobile });
    }

    if (!user) {
      return res.status(400).json({ success: false, message: 'User not found. Provide mobile query or Authorization.' });
    }

    const rides = await ScheduledRide.find({ user: user._id }).sort({ scheduledTime: 1 }).populate('driver', 'name phone vehicle');
    res.json({ success: true, count: rides.length, data: rides });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get a single scheduled ride
// @route GET /api/scheduled-rides/:id
// @access Private
exports.getScheduledRide = async (req, res) => {
  try {
    const ride = await ScheduledRide.findById(req.params.id).populate('user', 'fullName mobile').populate('driver', 'name phone vehicle');
    if (!ride) {
      return res.status(404).json({ success: false, message: 'Scheduled ride not found' });
    }

    // allow access if requester is owner (by auth or by mobile) or admin
    let isOwner = false;
    const ownerId = ride.user && ride.user._id ? ride.user._id.toString() : (ride.user ? ride.user.toString() : null);
    if (req.user && req.user.id) {
      if (ownerId && ownerId === req.user.id) isOwner = true;
      if (req.user.role === 'admin') isOwner = true;
    } else if (req.body.user || req.body.id || req.query.id) {
      const uid = req.body.user || req.body.id || req.query.id;
      if (ownerId && ownerId === uid) isOwner = true;
    } else if (req.query.mobile || req.body.mobile) {
      const mobile = req.query.mobile || req.body.mobile;
      if (ride.user && ride.user.mobile === mobile) isOwner = true;
    }

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this ride' });
    }

    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Update scheduled ride (e.g., reschedule)
// @route PUT /api/scheduled-rides/:id
// @access Private
exports.updateScheduledRide = async (req, res) => {
  try {
    let ride = await ScheduledRide.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Scheduled ride not found' });

    // owner check by auth or mobile
    let isOwner = false;
    const ownerId = ride.user && ride.user._id ? ride.user._id.toString() : (ride.user ? ride.user.toString() : null);
    if (req.user && req.user.id) {
      if (ownerId && ownerId === req.user.id) isOwner = true;
      if (req.user.role === 'admin') isOwner = true;
    } else if (req.body.mobile) {
      const user = await User.findOne({ mobile: req.body.mobile });
      if (user && ownerId && ownerId === user._id.toString()) isOwner = true;
    } else if (req.body.user) {
      if (ownerId && ownerId === req.body.user) isOwner = true;
    }

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this ride' });
    }

    // Only allow update when not completed or cancelled
    if (['completed', 'cancelled'].includes(ride.status)) {
      return res.status(400).json({ success: false, message: 'Cannot update ride in current status' });
    }

    const updates = req.body;
    if (updates.scheduledTime) updates.scheduledTime = new Date(updates.scheduledTime);

    ride = await ScheduledRide.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });

    res.json({ success: true, data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Cancel scheduled ride
// @route PUT /api/scheduled-rides/:id/cancel
// @access Private
exports.cancelScheduledRide = async (req, res) => {
  try {
    const ride = await ScheduledRide.findById(req.params.id);
    if (!ride) return res.status(404).json({ success: false, message: 'Scheduled ride not found' });

    // owner check by auth or mobile
    let isOwner = false;
    const ownerId = ride.user && ride.user._id ? ride.user._id.toString() : (ride.user ? ride.user.toString() : null);
    if (req.user && req.user.id) {
      if (ownerId && ownerId === req.user.id) isOwner = true;
      if (req.user.role === 'admin') isOwner = true;
    } else if (req.body.mobile) {
      const user = await User.findOne({ mobile: req.body.mobile });
      if (user && ownerId && ownerId === user._id.toString()) isOwner = true;
    } else if (req.body.user) {
      if (ownerId && ownerId === req.body.user) isOwner = true;
    }

    if (!isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this ride' });
    }

    if (ride.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Ride already cancelled' });
    }

    ride.status = 'cancelled';
    await ride.save();

    res.json({ success: true, message: 'Ride cancelled', data: ride });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Get all scheduled rides (admin)
// @route GET /api/scheduled-rides/all
// @access Public
exports.getAllScheduledRides = async (req, res) => {
  try {
    const { status, vehicleType } = req.query;
    const query = {};
    if (status) query.status = status;
    if (vehicleType) query.vehicleType = vehicleType;

    const rides = await ScheduledRide.find(query).sort({ scheduledTime: 1 }).populate('user', 'fullName mobile').populate('driver', 'name phone');
    
    // Calculate fare, distance, and times for each ride
    const ridesWithFare = await Promise.all(
      rides.map(async (ride) => {
        const rideObj = ride.toObject();
        
        // Calculate distance if not already calculated
        if (!rideObj.distance && rideObj.pickup?.coordinates && rideObj.dropoff?.coordinates) {
          rideObj.distance = parseFloat(calculateDistance(rideObj.pickup.coordinates, rideObj.dropoff.coordinates).toFixed(2));
        }
        
        // Calculate estimated duration (assuming average speed of 40 km/h in city)
        const averageSpeed = 40; // km/h
        const estimatedDurationHours = rideObj.distance ? rideObj.distance / averageSpeed : 0;
        const estimatedDurationMinutes = Math.round(estimatedDurationHours * 60);
        
        // Calculate pickup time (same as scheduled time)
        rideObj.pickupTime = rideObj.scheduledTime;
        
        // Calculate drop time (pickup time + estimated duration)
        if (rideObj.scheduledTime && estimatedDurationMinutes > 0) {
          const dropTime = new Date(rideObj.scheduledTime);
          dropTime.setMinutes(dropTime.getMinutes() + estimatedDurationMinutes);
          rideObj.dropTime = dropTime;
          rideObj.estimatedDuration = estimatedDurationMinutes; // in minutes
        }
        
        // Calculate fare if not already calculated
        if (!rideObj.fareEstimate && rideObj.distance) {
          const fareConfig = await FareCalculation.findOne({
            vehicleType: rideObj.vehicleType,
            isActive: true
          });
          
          if (fareConfig) {
            let fare = fareConfig.baseFare + (rideObj.distance * fareConfig.perKmRate);
            
            // Add time-based charges if duration is calculated
            if (estimatedDurationMinutes > 0 && fareConfig.perMinuteRate) {
              fare += estimatedDurationMinutes * fareConfig.perMinuteRate;
            }
            
            fare *= fareConfig.surgeMultiplier || 1;
            fare = Math.max(fare, fareConfig.minimumFare);
            rideObj.fareEstimate = parseFloat(fare.toFixed(2));
          }
        }
        
        return rideObj;
      })
    );
    
    res.json({ success: true, count: ridesWithFare.length, data: ridesWithFare });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Driver accepts a ride
// @route PUT /api/scheduled-rides/:id/accept
// @access Private
exports.acceptRide = async (req, res) => {
  try {
    const { driverId } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ success: false, message: 'Driver ID is required' });
    }

    const ride = await ScheduledRide.findById(req.params.id)
      .populate('user', 'fullName mobile email');

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // Check if ride is still available for acceptance
    if (!['searching', 'driver_assigned'].includes(ride.status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Ride already ${ride.status}. Cannot accept.` 
      });
    }

    // Check if another driver already accepted
    if (ride.status === 'driver_accepted') {
      return res.status(409).json({ 
        success: false, 
        message: 'This ride has already been accepted by another driver' 
      });
    }

    // Find the driver - check by id, phone, mobile, or MongoDB _id
    let driver;
    
    // Try to find by various fields
    if (driverId.length === 24) {
      // Might be MongoDB ObjectId
      try {
        driver = await Driver.findById(driverId);
      } catch (err) {
        // Not a valid ObjectId, continue searching
      }
    }
    
    if (!driver) {
      driver = await Driver.findOne({ 
        $or: [
          { id: parseInt(driverId) || driverId },
          { phone: driverId },
          { mobile: driverId }
        ]
      });
    }

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: `Driver not found with ID: ${driverId}` 
      });
    }

    // Assign driver and update status
    ride.driver = driver._id;
    ride.status = 'driver_accepted';
    ride.driverAssignedAt = new Date();
    ride.driverAcceptedAt = new Date();
    await ride.save();

    await ride.populate('driver', 'name phone mobile vehiclePreference rating');

    // Update driver availability to busy
    driver.availability = 'busy';
    await driver.save();

    // Notify via WebSocket
    const io = req.app.get('io');
    if (io) {
      // Notify user that driver accepted
      io.emit('driver:assigned', {
        rideId: ride._id,
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone || driver.mobile,
          vehicle: driver.vehiclePreference,
          rating: driver.rating
        }
      });

      io.emit('ride:accepted', {
        rideId: ride._id,
        driverId: driver.id,
        driver: ride.driver,
        user: ride.user
      });
    }

    res.json({ 
      success: true, 
      message: 'Ride accepted successfully',
      data: ride 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Driver rejects a ride
// @route PUT /api/scheduled-rides/:id/reject
// @access Private
exports.rejectRide = async (req, res) => {
  try {
    const { driverId } = req.body;
    
    if (!driverId) {
      return res.status(400).json({ success: false, message: 'Driver ID is required' });
    }

    const ride = await ScheduledRide.findById(req.params.id)
      .populate('user', 'fullName mobile');

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // Find next available driver
    const nearbyDrivers = await findNearbyDrivers(
      ride.pickup.coordinates, 
      ride.vehicleType, 
      ride.searchRadius
    );

    // Filter out the driver who rejected
    const availableDrivers = nearbyDrivers.filter(d => 
      d.id !== driverId && d._id.toString() !== driverId.toString()
    );

    const io = req.app.get('io');

    if (availableDrivers.length > 0) {
      // Assign to next driver
      const nextDriver = availableDrivers[0];
      const updatedRide = await assignDriverToRide(ride._id, nextDriver, io);

      // Notify previous driver
      if (io) {
        io.emit('ride:rejected:confirmed', {
          rideId: ride._id,
          rejectedBy: driverId,
          newDriver: nextDriver.id
        });
      }

      return res.json({
        success: true,
        message: 'Ride reassigned to another driver',
        data: updatedRide
      });
    } else {
      // No more drivers available, set back to searching
      ride.status = 'searching';
      ride.driver = null;
      ride.driverAssignedAt = null;
      await ride.save();

      if (io) {
        io.emit('ride:no_driver', {
          rideId: ride._id,
          message: 'No available drivers found'
        });
      }

      return res.json({
        success: true,
        message: 'No more drivers available, searching...',
        data: ride
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Start a ride
// @route PUT /api/scheduled-rides/:id/start
// @access Private
exports.startRide = async (req, res) => {
  try {
    const ride = await ScheduledRide.findById(req.params.id)
      .populate('user', 'fullName mobile')
      .populate('driver', 'name phone mobile');

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (ride.status !== 'driver_accepted') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot start ride with status: ${ride.status}` 
      });
    }

    ride.status = 'in_progress';
    ride.rideStartedAt = new Date();
    await ride.save();

    const io = req.app.get('io');
    if (io) {
      io.emit('ride:started', {
        rideId: ride._id,
        startTime: ride.rideStartedAt
      });
    }

    res.json({ 
      success: true, 
      message: 'Ride started',
      data: ride 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc Complete a ride
// @route PUT /api/scheduled-rides/:id/complete
// @access Private
exports.completeRide = async (req, res) => {
  try {
    const ride = await ScheduledRide.findById(req.params.id)
      .populate('user', 'fullName mobile')
      .populate('driver', 'name phone mobile');

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    if (ride.status !== 'in_progress') {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot complete ride with status: ${ride.status}` 
      });
    }

    ride.status = 'completed';
    ride.rideCompletedAt = new Date();
    await ride.save();

    // Update driver availability back to available
    if (ride.driver) {
      await Driver.findByIdAndUpdate(ride.driver._id, {
        availability: 'available',
        $inc: { totalTrips: 1 }
      });
    }

    const io = req.app.get('io');
    if (io) {
      io.emit('ride:completed', {
        rideId: ride._id,
        completedAt: ride.rideCompletedAt
      });
    }

    res.json({ 
      success: true, 
      message: 'Ride completed',
      data: ride 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
