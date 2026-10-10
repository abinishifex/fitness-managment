const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const {
  generatePlan,
  regeneratePlan,
  listPlans,
  selectPlan,
  updatePlan,
  deletePlan,
  getTodayWorkout,
  getActivePlan,
} = require('../controllers/workoutController');

const router = express.Router();

router.use(requireAuth);
router.post('/generate', generatePlan);
router.get('/plans', listPlans);
router.post('/plans/:id/select', selectPlan);
router.post('/plans/:id/regenerate', regeneratePlan);
router.patch('/plans/:id', updatePlan);
router.delete('/plans/:id', deletePlan);
router.get('/today', getTodayWorkout);
router.get('/plan', getActivePlan);

module.exports = router;
