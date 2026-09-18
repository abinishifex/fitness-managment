const express = require('express');
const { getProfile, updateProfile } = require('../controllers/profileController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// All profile routes require authentication
router.use(requireAuth);

// GET /api/profile — get current user's profile
router.get('/', getProfile);

// PUT /api/profile — create or update current user's profile
router.put('/', updateProfile);

module.exports = router;
