const express = require('express');
const multer = require('multer');
const {
  postCash,
  getPendingPayments,
  postApprovePayment,
  postRejectPayment,
  postTransfer,
} = require('../controllers/paymentController');
const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const { MAX_BYTES } = require('../services/upload/cloudinary');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

router.use(requireAuth);

// Member: submit transfer screenshot
router.post('/transfer', upload.single('screenshot'), postTransfer);

// Admin-only below
router.post('/cash', requireRole('admin'), postCash);
router.get('/pending', requireRole('admin'), getPendingPayments);
router.post('/:id/approve', requireRole('admin'), postApprovePayment);
router.post('/:id/reject', requireRole('admin'), postRejectPayment);

module.exports = router;
