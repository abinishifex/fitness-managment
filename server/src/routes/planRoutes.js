const express = require('express');
const { listPlans, getPlan, createPlan } = require('../controllers/planController');
const optionalAuth = require('../middleware/optionalAuth');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

// Public catalogue for self-serve registration (admin + ?all=1 includes inactive)
router.get('/', optionalAuth, listPlans);
router.get('/:idOrSlug', optionalAuth, getPlan);

// Admin create
router.post('/', requireAuth, requireRole('admin'), createPlan);

module.exports = router;
