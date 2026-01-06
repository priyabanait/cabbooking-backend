
const express = require('express');
const Driver = require('../models/Driver.js');
const DriverSignup = require('../models/DriverSignup.js');
// auth middleware not applied; token used only for login
const { uploadToCloudinary } = require('../lib/cloudinary.js');

const router = express.Router();

// Update driver location (REST API endpoint)
router.post('/location/update', async (req, res) => {
  try {
    const { driverId, latitude, longitude, address, speed, heading } = req.body;
    
    if (!driverId || !latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Driver ID, latitude, and longitude are required' 
      });
    }

    const driver = await Driver.findOne({ id: driverId });
    
    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found' 
      });
    }

    // Update current location
    driver.currentLocation = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
      address: address || '',
      timestamp: new Date()
    };
    
    driver.lastLocationUpdate = new Date();
    driver.isOnline = true;

    // Add to location history (keep last 100 records)
    if (!driver.locationHistory) {
      driver.locationHistory = [];
    }
    
    driver.locationHistory.push({
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
      timestamp: new Date(),
      speed: speed || 0,
      heading: heading || 0
    });

    // Keep only last 100 location points
    if (driver.locationHistory.length > 100) {
      driver.locationHistory = driver.locationHistory.slice(-100);
    }

    await driver.save();

    // Emit via WebSocket if available
    const io = req.app.get('io');
    if (io) {
      io.emit('driver:location:update', {
        driverId,
        location: { latitude, longitude },
        speed,
        heading,
        timestamp: new Date()
      });
    }

    res.json({ 
      success: true, 
      message: 'Location updated successfully',
      data: {
        driverId,
        location: driver.currentLocation,
        lastUpdate: driver.lastLocationUpdate
      }
    });
  } catch (error) {
    console.error('Error updating driver location:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update location', 
      error: error.message 
    });
  }
});

// Get nearby drivers
router.post('/nearby', async (req, res) => {
  try {
    const { latitude, longitude, radius = 5, vehicleType } = req.body;
    
    if (!latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Latitude and longitude are required' 
      });
    }

    const radiusInMeters = radius * 1000; // Convert km to meters

    const query = {
      currentLocation: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: radiusInMeters
        }
      },
      isOnline: true,
      availability: 'available'
    };

    // Add vehicle type filter if specified
    if (vehicleType) {
      query.vehiclePreference = vehicleType;
    }

    const drivers = await Driver.find(query)
      .select('id name phone vehiclePreference currentLocation rating totalTrips availability')
      .limit(20)
      .lean();

    // Calculate distance for each driver
    const driversWithDistance = drivers.map(driver => {
      const distance = calculateDistance(
        latitude,
        longitude,
        driver.currentLocation.coordinates[1],
        driver.currentLocation.coordinates[0]
      );

      return {
        ...driver,
        distance: parseFloat(distance.toFixed(2)),
        location: {
          latitude: driver.currentLocation.coordinates[1],
          longitude: driver.currentLocation.coordinates[0]
        }
      };
    });

    res.json({ 
      success: true, 
      count: driversWithDistance.length,
      data: driversWithDistance 
    });
  } catch (error) {
    console.error('Error fetching nearby drivers:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch nearby drivers', 
      error: error.message 
    });
  }
});

// Update driver availability
router.put('/availability/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { availability } = req.body;

    if (!['available', 'busy', 'offline'].includes(availability)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid availability status'
      });
    }

    const driver = await Driver.findOneAndUpdate(
      { id: driverId },
      { 
        availability,
        isOnline: availability !== 'offline'
      },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    // Emit via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('driver:status:update', {
        driverId,
        status: availability
      });
    }

    res.json({
      success: true,
      message: 'Availability updated',
      data: {
        driverId,
        availability: driver.availability,
        isOnline: driver.isOnline
      }
    });
  } catch (error) {
    console.error('Error updating driver availability:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update availability',
      error: error.message
    });
  }
});

// Get driver location history
router.get('/location/history/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const { limit = 50 } = req.query;

    const driver = await Driver.findOne({ id: driverId })
      .select('locationHistory name phone')
      .lean();

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: 'Driver not found'
      });
    }

    const history = driver.locationHistory 
      ? driver.locationHistory.slice(-parseInt(limit))
      : [];

    res.json({
      success: true,
      data: {
        driverId,
        name: driver.name,
        history: history.map(loc => ({
          latitude: loc.coordinates[1],
          longitude: loc.coordinates[0],
          timestamp: loc.timestamp,
          speed: loc.speed,
          heading: loc.heading
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching location history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch location history',
      error: error.message
    });
  }
});

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Make driver go online with location and availability
router.post('/go-online', async (req, res) => {
  try {
    const { mobile, latitude, longitude, address, vehiclePreference } = req.body;
    
    if (!mobile || !latitude || !longitude) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mobile number, latitude, and longitude are required' 
      });
    }

    // Check both mobile and phone fields
    const driver = await Driver.findOne({ 
      $or: [
        { mobile: mobile },
        { phone: mobile }
      ]
    });
    
    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found with this mobile number' 
      });
    }

    // Update all required fields for assignment
    driver.currentLocation = {
      type: 'Point',
      coordinates: [parseFloat(longitude), parseFloat(latitude)],
      address: address || '',
      timestamp: new Date()
    };
    
    driver.isOnline = true;
    driver.availability = 'available';
    driver.status = 'active';
    driver.lastLocationUpdate = new Date();
    
    if (vehiclePreference) {
      driver.vehiclePreference = vehiclePreference;
    }

    await driver.save();

    // Emit via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('driver:online', {
        driverId: driver.id,
        mobile: driver.mobile,
        location: { latitude, longitude },
        availability: 'available',
        vehicleType: driver.vehiclePreference
      });
    }

    res.json({ 
      success: true, 
      message: 'Driver is now online and available for rides',
      data: {
        driverId: driver.id,
        mobile: driver.mobile,
        name: driver.name,
        location: driver.currentLocation,
        isOnline: driver.isOnline,
        availability: driver.availability,
        status: driver.status,
        vehiclePreference: driver.vehiclePreference
      }
    });
  } catch (error) {
    console.error('Error making driver online:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to make driver online', 
      error: error.message 
    });
  }
});

// Make driver go offline
router.post('/go-offline', async (req, res) => {
  try {
    const { mobile } = req.body;
    
    if (!mobile) {
      return res.status(400).json({ 
        success: false, 
        message: 'Mobile number is required' 
      });
    }

    // Check both mobile and phone fields
    const driver = await Driver.findOneAndUpdate(
      { 
        $or: [
          { mobile: mobile },
          { phone: mobile }
        ]
      },
      { 
        isOnline: false,
        availability: 'offline'
      },
      { new: true }
    );
    
    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: 'Driver not found with this mobile number' 
      });
    }

    // Emit via WebSocket
    const io = req.app.get('io');
    if (io) {
      io.emit('driver:offline', {
        driverId: driver.id,
        mobile: driver.mobile
      });
    }

    res.json({ 
      success: true, 
      message: 'Driver is now offline',
      data: {
        driverId: driver.id,
        mobile: driver.mobile,
        isOnline: driver.isOnline,
        availability: driver.availability
      }
    });
  } catch (error) {
    console.error('Error making driver offline:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to make driver offline', 
      error: error.message 
    });
  }
});


// Update a driver signup credential
router.put('/signup/credentials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await DriverSignup.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ message: 'Driver signup not found' });
    }
    res.json(updated);
  } catch (err) {
    console.error('Error updating driver signup:', err);
    res.status(400).json({ message: 'Failed to update driver signup', error: err.message });
  }
});

// Delete a driver signup credential
router.delete('/signup/credentials/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await DriverSignup.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: 'Driver signup not found' });
    }
    res.json({ message: 'Driver signup deleted', driver: deleted });
  } catch (err) {
    console.error('Error deleting driver signup:', err);
    res.status(400).json({ message: 'Failed to delete driver signup', error: err.message });
  }
});
// GET driver form data by mobile number
router.get('/form/mobile/:phone', async (req, res) => {
try {
    const { phone } = req.params;
    const driver = await Driver.findOne({ phone }).lean();
    if (!driver) {
      return res.status(404).json({ error: 'Driver not found' });
    }
    res.json({ driver });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch driver', message: error.message });
  }
});

// Remove any token/auth-related fields from incoming bodies
function stripAuthFields(source) {
  if (!source || typeof source !== 'object') return {};
  const disallowed = new Set(['token', 'authToken', 'accessToken', 'authorization', 'Authorization', 'bearer', 'Bearer']);
  const cleaned = {};
  for (const [k, v] of Object.entries(source)) {
    if (!disallowed.has(k)) cleaned[k] = v;
  }
  return cleaned;
}

router.get('/', async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Only fetch drivers added manually by admin (not self-registered)
    const filter = { isManualEntry: true };
    
    const total = await Driver.countDocuments(filter);
    const list = await Driver.find(filter)
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();
    
    res.json({
      data: list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ message: 'Failed to fetch drivers', error: error.message });
  }
});

// GET signup drivers (self-registered with username/mobile/password)
router.get('/signup/credentials', async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'signupDate';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const total = await DriverSignup.countDocuments();
    const list = await DriverSignup.find()
      .select('username mobile password status kycStatus signupDate')
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();
    
    res.json({
      data: list,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (error) {
    console.error('Error fetching signup credentials:', error);
    res.status(500).json({ message: 'Failed to fetch signup credentials' });
  }
});

router.get('/:id', async (req, res) => {
  const id = Number(req.params.id);
  const item = await Driver.findOne({ id }).lean();
  if (!item) return res.status(404).json({ message: 'Driver not found' });
  res.json(item);
});


// Create new driver with document uploads
router.post('/', async (req, res) => {
  try {
    const fields = stripAuthFields(req.body);
    const max = await Driver.find().sort({ id: -1 }).limit(1).lean();
    const nextId = (max[0]?.id || 0) + 1;

    // Handle document uploads to Cloudinary
    const documentFields = ['profilePhoto', 'licenseDocument', 'aadharDocument', 'aadharDocumentBack', 'panDocument', 'bankDocument', 'electricBillDocument'];
    const uploadedDocs = {};

    for (const field of documentFields) {
      if (fields[field] && fields[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(fields[field], `drivers/${nextId}/${field}`);
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
      }
    }


    // Add emergency contact relation and secondary phone
    const driverData = {
      id: nextId,
      ...fields,
      ...uploadedDocs,
      isManualEntry: true,
      registrationCompleted: true, // Mark registration as completed when admin fills the form
      emergencyRelation: fields.emergencyRelation || '',
      emergencyPhoneSecondary: fields.emergencyPhoneSecondary || ''
    };

    // Remove base64 data to prevent large document size
    documentFields.forEach(field => {
      if (driverData[field]?.startsWith('data:')) {
        delete driverData[field];
      }
    });

    // Set registrationCompleted=true in DriverSignup if mobile matches
    if (driverData.mobile) {
      await DriverSignup.findOneAndUpdate(
        { mobile: driverData.mobile },
        { registrationCompleted: true, status: 'active' }
      );
    }

    const newDriver = await Driver.create(driverData);
    res.status(201).json(newDriver);
  } catch (err) {
    console.error('Driver create error:', err);
    res.status(500).json({ message: 'Failed to create driver', error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    const fields = stripAuthFields(req.body);

    // Handle document uploads to Cloudinary
    const documentFields = ['profilePhoto', 'licenseDocument', 'aadharDocument', 'aadharDocumentBack', 'panDocument', 'bankDocument', 'electricBillDocument'];
    const uploadedDocs = {};

    for (const field of documentFields) {
      if (fields[field] && fields[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(fields[field], `drivers/${id}/${field}`);
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
      }
    }


    // Add emergency contact relation and secondary phone
    const updateData = {
      ...fields,
      ...uploadedDocs,
      emergencyRelation: fields.emergencyRelation || '',
      emergencyPhoneSecondary: fields.emergencyPhoneSecondary || ''
    };

    // Remove base64 data to prevent large document size
    documentFields.forEach(field => {
      if (updateData[field]?.startsWith('data:')) {
        delete updateData[field];
      }
    });

    const updated = await Driver.findOneAndUpdate(
      { id },
      updateData,
      { new: true }
    ).lean();

    if (!updated) {
      return res.status(404).json({ message: 'Driver not found' });
    }

    res.json(updated);
  } catch (err) {
    console.error('Driver update error:', err);
    res.status(500).json({ message: 'Failed to update driver', error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await Driver.deleteOne({ id });
  res.json({ message: 'Deleted' });
});

// GET driver earnings summary
router.get('/earnings/summary', async (req, res) => {
  try {
    // Mock driver earnings data (replace with actual calculation from trips/payments)
    const driverEarnings = [
      {
        driverId: 'DR001',
        driverName: 'Rajesh Kumar',
        monthlyEarnings: 52000,
        totalTrips: 180,
        averageRating: 4.7,
        totalDistance: 1800,
        pendingAmount: 0,
        lastPayment: '2024-11-01'
      },
      {
        driverId: 'DR002',
        driverName: 'Priya Sharma',
        monthlyEarnings: 65000,
        totalTrips: 220,
        averageRating: 4.9,
        totalDistance: 2200,
        pendingAmount: 15725,
        lastPayment: '2024-10-25'
      },
      {
        driverId: 'DR003',
        driverName: 'Amit Singh',
        monthlyEarnings: 48000,
        totalTrips: 160,
        averageRating: 4.5,
        totalDistance: 1600,
        pendingAmount: 5000,
        lastPayment: '2024-11-02'
      },
      {
        driverId: 'DR004',
        driverName: 'Sunita Patel',
        monthlyEarnings: 42000,
        totalTrips: 145,
        averageRating: 4.6,
        totalDistance: 1450,
        pendingAmount: 10200,
        lastPayment: '2024-10-28'
      },
      {
        driverId: 'DR005',
        driverName: 'Vikram Reddy',
        monthlyEarnings: 58000,
        totalTrips: 195,
        averageRating: 4.8,
        totalDistance: 1950,
        pendingAmount: 0,
        lastPayment: '2024-11-03'
      }
    ];
    
    res.json(driverEarnings);
  } catch (err) {
    console.error('Error fetching driver earnings:', err);
    res.status(500).json({ message: 'Failed to fetch driver earnings', error: err.message });
  }
});

module.exports = router;
