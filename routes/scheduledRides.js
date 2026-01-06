const express = require('express');
const router = express.Router();

const {
  createScheduledRide,
  getMyScheduledRides,
  getScheduledRide,
  updateScheduledRide,
  cancelScheduledRide,
  getAllScheduledRides,
  acceptRide,
  rejectRide,
  startRide,
  completeRide
} = require('../controllers/scheduledRideController');

const { protect, authorize } = require('../middleware/auth');

// � Admin Route – Get all scheduled rides (must be before /:id route)
router.get('/all', getAllScheduledRides);

// �👤 User Routes
router.route('/')
  .get(getMyScheduledRides)
  .post(createScheduledRide);

router.route('/:id')
  .get(getScheduledRide)
  .put(updateScheduledRide);

// ❌ Cancel a scheduled ride
router.put('/:id/cancel', cancelScheduledRide);

// 🚗 Driver Routes
router.put('/:id/accept', acceptRide);
router.put('/:id/reject', rejectRide);
router.put('/:id/start', startRide);
router.put('/:id/complete', completeRide);

module.exports = router;
