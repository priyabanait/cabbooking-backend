const express = require('express');
const router = express.Router();
const {
  calculateFare,
  getAllFares,
  getFareByVehicleType,
  createFare,
  updateFare,
  deleteFare
} = require('../controllers/fareCalculationController');

// Public routes
router.post('/calculate', calculateFare);
router.get('/', getAllFares);

// Admin routes (can add protection later)
router.post('/', createFare);
router.put('/:id', updateFare);
router.delete('/:id', deleteFare);

// Get fare by vehicle type (should be after /:id routes to avoid conflicts)
router.get('/:vehicleType', getFareByVehicleType);

module.exports = router;
