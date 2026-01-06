const express = require('express');
const router = express.Router();
const { 
  getVehicleTypes, 
  createVehicleType, 
  updateVehicleType, 
  deleteVehicleType 
} = require('../controllers/vehicleTypesController');

// GET /api/vehicle-types - Get all vehicle types
router.get('/', getVehicleTypes);

// POST /api/vehicle-types - Create new vehicle type
router.post('/', createVehicleType);

// PUT /api/vehicle-types/:id - Update vehicle type
router.put('/:id', updateVehicleType);

// DELETE /api/vehicle-types/:id - Delete vehicle type
router.delete('/:id', deleteVehicleType);

module.exports = router;
