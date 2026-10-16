const express = require('express');
const { createCustomer, listMembers } = require('../controllers/adminMemberController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.post('/members', createCustomer);
router.get('/members', listMembers);

module.exports = router;
