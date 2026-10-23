const express = require('express');
const {
  listInvoices,
  getInvoice,
  getInvoicesDueWithin,
} = require('../controllers/paymentController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);

// Admin-only endpoints
router.get('/due-within', requireRole('admin'), getInvoicesDueWithin);
router.get('/', requireRole('admin'), listInvoices);

// Owner or admin — must come after specific routes
router.get('/:id', getInvoice);

module.exports = router;
