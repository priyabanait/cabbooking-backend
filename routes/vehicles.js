const express = require('express');
const Vehicle = require('../models/vehicle');
// auth middleware not applied; token used only for login
const { uploadToCloudinary } = require('../lib/cloudinary');

const router = express.Router();

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

// Normalize vehicle object to always include expected keys so clients "see all data"
function normalizeVehicleShape(v) {
  const base = {
    // identity
    vehicleId: null,
    registrationNumber: '',

    // primary details
    carName: '',
    color: '',
    fuelType: '',
    ownerName: '',
    ownerPhone: '',
    year: null,

    // dates and numbers
    registrationDate: '',
    rcExpiryDate: '',
    insuranceDate: '',
    permitDate: '',
    pucNumber: '',

    // status
    status: v?.status ?? 'inactive',
    kycStatus: v?.kycStatus ?? 'pending',
    remarks: v?.remarks ?? '',
    kycVerifiedDate: v?.kycVerifiedDate ?? null,

    // legacy docs
    insuranceDoc: null,
    rcDoc: null,
    permitDoc: null,
    pollutionDoc: null,
    fitnessDoc: null,

    // new photos
    registrationCardPhoto: null,
    roadTaxPhoto: null,
    pucPhoto: null,
    permitPhoto: null,
    carFrontPhoto: null,
    carLeftPhoto: null,
    carRightPhoto: null,
    carBackPhoto: null,
    carFullPhoto: null,

    // misc
    make: v?.make ?? '',
    purchaseDate: v?.purchaseDate ?? '',
    purchasePrice: v?.purchasePrice ?? null,
    currentValue: v?.currentValue ?? null,
    mileage: v?.mileage ?? null,
    lastService: v?.lastService ?? '',
    nextService: v?.nextService ?? '',
    monthlyProfitMin: v?.monthlyProfitMin ?? 0
  };

  // Merge existing doc over defaults
  return { ...base, ...(v || {}) };
}

// Search/filter vehicles
router.get('/search', async (req, res) => {
  try {
    const {
      q, // general search query
      registrationNumber,
      carName,
      color,
      fuelType,
      ownerName,
      ownerPhone,
      status,
      kycStatus,
      minYear,
      maxYear
    } = req.query;

    const filter = {};

    // General search across multiple fields
    if (q && q.trim()) {
      const searchRegex = new RegExp(q.trim(), 'i');
      filter.$or = [
        { registrationNumber: searchRegex },
        { carName: searchRegex },
        { ownerName: searchRegex },
        { ownerPhone: searchRegex }
      ];
    }

    // Specific field filters
    if (registrationNumber) filter.registrationNumber = new RegExp(registrationNumber, 'i');
    if (carName) filter.carName = new RegExp(carName, 'i');
    if (color) filter.color = new RegExp(color, 'i');
    if (fuelType) filter.fuelType = new RegExp(fuelType, 'i');
    if (ownerName) filter.ownerName = new RegExp(ownerName, 'i');
    if (ownerPhone) filter.ownerPhone = new RegExp(ownerPhone, 'i');
    if (status) filter.status = status;
    if (kycStatus) filter.kycStatus = kycStatus;

    // Year range filter
    if (minYear || maxYear) {
      filter.year = {};
      if (minYear) filter.year.$gte = Number(minYear);
      if (maxYear) filter.year.$lte = Number(maxYear);
    }

    const vehicles = await Vehicle.find(filter).lean();
    res.json(vehicles.map(normalizeVehicleShape));
  } catch (err) {
    console.error('Error searching vehicles:', err);
    res.status(500).json({ message: 'Failed to search vehicles' });
  }
});

// Get vehicles by investorId - removed since investorId is not in the model
// This route is disabled as the Vehicle model does not have investorId field

// Get all vehicles
router.get('/', async (req, res) => {
  try {
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'vehicleId';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const total = await Vehicle.countDocuments();
    const list = await Vehicle.find()
      .sort({ [sortBy]: sortOrder })
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Map vehicles with normalized shape
    const enhancedList = list.map(vehicle => {
      const normalized = normalizeVehicleShape(vehicle);
      return normalized;
    });
    
    res.json({
      data: enhancedList,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total
      }
    });
  } catch (err) {
    console.error('Error fetching vehicles:', err);
    res.status(500).json({ message: 'Failed to fetch vehicles' });
  }
});

// Get a single vehicle by ID
router.get('/:id', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const vehicle = await Vehicle.findOne({ vehicleId }).lean();
    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json(normalizeVehicleShape(vehicle));
  } catch (err) {
    console.error('Error fetching vehicle:', err);
    res.status(500).json({ message: 'Failed to fetch vehicle' });
  }
});

// Create a new vehicle
router.post('/', async (req, res) => {
  try {
    if (!req.body.registrationNumber) {
      return res.status(400).json({ message: 'Registration number is required' });
    }

    const body = stripAuthFields(req.body);
    let vehicleData = {
      status: 'inactive',
      kycStatus: 'pending',
      ...body
    };

    // Normalize and coerce basic types
    vehicleData.registrationNumber = (vehicleData.registrationNumber || '').toString().trim();
    if (vehicleData.year != null) vehicleData.year = Number(vehicleData.year);

    const documentFields = ['insuranceDoc', 'rcDoc', 'permitDoc', 'pollutionDoc', 'fitnessDoc'];
    // Newly supported photo fields from UI
    const photoFields = [
      'registrationCardPhoto',
      'roadTaxPhoto',
      'pucPhoto',
      'permitPhoto',
      'carFrontPhoto',
      'carLeftPhoto',
      'carRightPhoto',
      'carBackPhoto',
      'carFullPhoto'
    ];
    const uploadedDocs = {};

    // Upload documents if provided as base64
    for (const field of documentFields) {
      if (vehicleData[field] && vehicleData[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(
            vehicleData[field],
            `vehicles/${vehicleData.registrationNumber}/${field}`
          );
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
        // prevent saving raw base64 if present
        delete vehicleData[field];
      }
    }

    // Upload new photo fields if provided as base64
    for (const field of photoFields) {
      if (vehicleData[field] && typeof vehicleData[field] === 'string' && vehicleData[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(
            vehicleData[field],
            `vehicles/${vehicleData.registrationNumber}/${field}`
          );
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
        // prevent saving raw base64 if present
        delete vehicleData[field];
      }
    }

    // Generate next vehicleId
    const latestVehicle = await Vehicle.findOne({}).sort({ vehicleId: -1 });
    const nextVehicleId = (latestVehicle?.vehicleId || 0) + 1;

    const vehicle = new Vehicle({
      ...vehicleData,
      ...uploadedDocs,
      vehicleId: nextVehicleId
    });

    const savedVehicle = await vehicle.save();
    res.status(201).json(savedVehicle);
  } catch (err) {
    console.error('Error creating vehicle:', err);
    if (err && (err.code === 11000 || err.code === '11000')) {
      return res.status(409).json({ message: 'Duplicate registration number' });
    }
    res.status(500).json({ message: err?.message || 'Failed to create vehicle' });
  }
});

// Update a vehicle
router.put('/:id', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const updates = stripAuthFields(req.body);

    // Normalize/coerce
    if (updates.registrationNumber) updates.registrationNumber = String(updates.registrationNumber).trim();
    if (updates.year != null) updates.year = Number(updates.year);

    const documentFields = ['insuranceDoc', 'rcDoc', 'permitDoc', 'pollutionDoc', 'fitnessDoc'];
    const photoFields = [
      'registrationCardPhoto',
      'roadTaxPhoto',
      'pucPhoto',
      'permitPhoto',
      'carFrontPhoto',
      'carLeftPhoto',
      'carRightPhoto',
      'carBackPhoto',
      'carFullPhoto'
    ];
    const uploadedDocs = {};

    // Upload new documents if base64 data is sent
    for (const field of documentFields) {
      if (updates[field] && updates[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(updates[field], `vehicles/${vehicleId}/${field}`);
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
        delete updates[field];
      }
    }

    // Upload new photo fields if base64 data is sent
    for (const field of photoFields) {
      if (updates[field] && typeof updates[field] === 'string' && updates[field].startsWith('data:')) {
        try {
          const result = await uploadToCloudinary(updates[field], `vehicles/${vehicleId}/${field}`);
          uploadedDocs[field] = result.secure_url;
        } catch (uploadErr) {
          console.error(`Failed to upload ${field}:`, uploadErr);
        }
        delete updates[field];
      }
    }

    let existing = await Vehicle.findOne({ vehicleId });
    
    // KYC verified logic
    if (updates.kycStatus === 'active' && (!existing || !existing.kycVerifiedDate)) {
      updates.kycVerifiedDate = new Date();
    }
    if (updates.kycStatus === 'inactive') {
      updates.kycVerifiedDate = null;
    }

    const vehicle = await Vehicle.findOneAndUpdate(
      { vehicleId },
      { ...updates, ...uploadedDocs },
      { new: true }
    ).lean();

    if (!vehicle) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }

    res.json(vehicle);
  } catch (err) {
    console.error('Error updating vehicle:', err);
    if (err && (err.code === 11000 || err.code === '11000')) {
      return res.status(409).json({ message: 'Duplicate registration number' });
    }
    res.status(500).json({ message: err?.message || 'Failed to update vehicle' });
  }
});

// Delete a vehicle
router.delete('/:id', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const result = await Vehicle.deleteOne({ vehicleId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Vehicle not found' });
    }
    res.json({ message: 'Vehicle deleted successfully' });
  } catch (err) {
    console.error('Error deleting vehicle:', err);
    res.status(500).json({ message: 'Failed to delete vehicle' });
  }
});

// Get weekly rent slabs for a vehicle - removed since weeklyRentSlabs is not in the model
// This route is disabled as the Vehicle model does not have weeklyRentSlabs field

// Update weekly rent slabs for a vehicle - removed since weeklyRentSlabs is not in the model
// This route is disabled as the Vehicle model does not have weeklyRentSlabs field

// Get daily rent slabs for a vehicle - removed since dailyRentSlabs is not in the model
// This route is disabled as the Vehicle model does not have dailyRentSlabs field

// Update daily rent slabs for a vehicle - removed since dailyRentSlabs is not in the model
// This route is disabled as the Vehicle model does not have dailyRentSlabs field

// Get monthly profit for a vehicle by vehicleId
router.get('/:id/monthly-profit', async (req, res) => {
  try {
    const vehicleId = Number(req.params.id);
    const vehicle = await Vehicle.findOne({ vehicleId }).lean();
    if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

    let monthlyProfit = vehicle.monthlyProfitMin || 0;

    res.json({ vehicleId, monthlyProfit });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;