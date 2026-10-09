const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  generatePlan,
  getTodayWorkout,
  getActivePlan,
} = require('../controllers/workoutController');

const router = express.Router();

router.use(requireAuth);
router.post('/generate', generatePlan);
router.get('/today', getTodayWorkout);
router.get('/plan', getActivePlan);

module.exports = router;