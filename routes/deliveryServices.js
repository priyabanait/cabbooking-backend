const express = require('express');
const router = express.Router();
const {
  getAllServices,
  getService,
  createService,
  updateService,
  deleteService,
  seedServices
} = require('../controllers/deliveryServiceController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(getAllServices)
  .post(createService);

router.post('/seed', seedServices);

router.route('/:id')
  .get(getService)
  .put(protect, updateService)
  .delete(protect, deleteService);

module.exports = router;
