const express = require('express');
const {
  getMyMemberships,
  getMyMembershipStatus,
  getMembership,
  listMemberships,
  listMembershipInvoices,
} = require('../controllers/membershipController');
const { postGenerateInvoice } = require('../controllers/paymentController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

// Specific /me routes must be declared before /:id
router.get('/me/status', getMyMembershipStatus);
router.get('/me', getMyMemberships);

router.get('/', requireRole('admin'), listMemberships);
router.get('/:id', getMembership);
router.get('/:id/invoices', listMembershipInvoices);
router.post('/:id/invoices', postGenerateInvoice);

module.exports = router;
