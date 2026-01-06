const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrderStatus,
  cancelOrder,
  assignDriver,
  getAllOrders
} = require('../controllers/deliveryOrderController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(protect, getMyOrders)
  .post(protect, createOrder);

router.get('/all', protect, getAllOrders);

router.route('/:id')
  .get(protect, getOrder);

router.put('/:id/status', protect, updateOrderStatus);
router.put('/:id/cancel', protect, cancelOrder);
router.put('/:id/assign-driver', protect, assignDriver);

module.exports = router;
