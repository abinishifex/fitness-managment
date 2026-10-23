const express = require('express');
const {
  postLinkCode,
  getStatus,
  postWebhook,
} = require('../controllers/telegramController');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

// Public webhook (secured by telegram webhook secret)
router.post('/webhook', postWebhook);

router.use(requireAuth);
router.post('/link-code', postLinkCode);
router.get('/status', getStatus);

module.exports = router;
