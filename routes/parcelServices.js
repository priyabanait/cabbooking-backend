const express = require('express');
const router = express.Router();
const {
  getAllParcelServices,
  getParcelService,
  createParcelService,
  updateParcelService,
  deleteParcelService
} = require('../controllers/parcelServiceController');

router.route('/')
  .get(getAllParcelServices)
  .post(createParcelService);

router.route('/:id')
  .get(getParcelService)
  .put(updateParcelService)
  .delete(deleteParcelService);

module.exports = router;
