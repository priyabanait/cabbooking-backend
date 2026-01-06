const express = require('express');
const router = express.Router();
const {
  registerUser,
  getAllRegistrations,
  getRegistration,
  updateRegistration,
  deleteRegistration,
  getMyRegistrationStatus,
  getMyRegistration
} = require('../controllers/registrationController');
const { protect } = require('../middleware/auth');

router.route('/')
  .get(getAllRegistrations)
  .post(protect, registerUser);

router.get('/status/me', protect, getMyRegistrationStatus);
router.get('/me', protect, getMyRegistration);

router.route('/:id')
  .get(getRegistration)
  .put(updateRegistration)
  .delete(deleteRegistration);

module.exports = router;
