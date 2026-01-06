const express = require('express');
const router = express.Router();

// Since the drivers controller is written as an ES6 module router,
// we need to dynamically import it
let driversRouter;

(async () => {
  const module = await import('../controllers/drivers.js');
  driversRouter = module.default;
})();

// Forward all requests to the drivers controller router
router.use((req, res, next) => {
  if (driversRouter) {
    driversRouter(req, res, next);
  } else {
    res.status(503).json({ message: 'Drivers service is initializing...' });
  }
});

module.exports = router;
