const express = require('express');
const {
  postCash,
  getPendingPayments,
} = require('../controllers/paymentController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('admin'));

router.post('/cash', postCash);
router.get('/pending', getPendingPayments);

module.exports = router;
