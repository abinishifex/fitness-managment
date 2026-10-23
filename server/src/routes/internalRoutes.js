const express = require('express');
const { postRunReminders } = require('../controllers/reminderController');

const router = express.Router();

router.post('/reminders/run', postRunReminders);

module.exports = router;
