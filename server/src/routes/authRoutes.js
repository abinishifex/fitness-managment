const express = require('express');
const {
  register,
  login,
  logout,
  passwordResetStub,
} = require('../controllers/authController');

const router = express.Router();

// POST /api/auth/register
router.post('/register', register);

// POST /api/auth/login
router.post('/login', login);

// POST /api/auth/logout
router.post('/logout', logout);

// POST /api/auth/password-reset-stub
router.post('/password-reset-stub', passwordResetStub);

module.exports = router;
