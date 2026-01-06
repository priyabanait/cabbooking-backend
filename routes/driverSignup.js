const express = require('express');
const router = express.Router();
const {
  signup,
  login,
  getMe,
  updateProfile,
  updatePassword,
  getAllDrivers,
  getDriverById,
  updateDriver,
  deleteDriver,
  linkRegistration
} = require('../controllers/driverSignupController');
const { protectDriver } = require('../middleware/driverAuth');
const { protect } = require('../middleware/auth'); // For admin routes

// Public routes
router.post('/signup', signup);
router.post('/login', login);

// Protected driver routes (requires driver authentication)
router.get('/me', protectDriver, getMe);
router.put('/profile', protectDriver, updateProfile);
router.put('/password', protectDriver, updatePassword);

// Admin routes - Temporarily public (TODO: Add proper admin authentication)
router.get('/all', getAllDrivers); // Public for now
router.get('/:id', getDriverById); // Public for now
router.put('/:id', updateDriver); // Public for now
router.delete('/:id', deleteDriver); // Public for now
router.put('/:id/link-registration', linkRegistration); // Public for now

module.exports = router;
