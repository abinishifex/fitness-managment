const express = require('express');
const {
  listInvoices,
  getInvoicesDueWithin,
} = require('../controllers/paymentController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.get('/due-within', getInvoicesDueWithin);
router.get('/', listInvoices);

module.exports = router;
