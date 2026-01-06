const express = require('express');
const router = express.Router();
const {
  createPayment,
  getUserPayments,
  getPayment,
  updatePaymentStatus,
  initiateRefund,
  getPaymentStats,
  verifyPayment
} = require('../controllers/paymentController');
const { protect } = require('../middleware/auth');

// Public routes
router.post('/verify', verifyPayment);

// Protected routes
router.post('/', protect, createPayment);
router.get('/', protect, getUserPayments);
router.get('/stats', protect, getPaymentStats);
router.get('/:id', protect, getPayment);
router.put('/:id', protect, updatePaymentStatus);
router.post('/:id/refund', protect, initiateRefund);

module.exports = router;
