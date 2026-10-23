const { env } = require('../config/env');
const { runReminderJob } = require('../jobs/reminderJob');
const { createError } = require('../middleware/errorHandler');

/**
 * POST /api/internal/reminders/run — cron / Railway hit with secret.
 * Header: X-Reminder-Secret or Authorization: Bearer <REMINDER_JOB_SECRET>
 */
async function postRunReminders(req, res, next) {
  try {
    const expected = env.reminderJobSecret || env.telegramWebhookSecret;
    if (!expected) {
      throw createError(
        env.nodeEnv === 'production' ? 503 : 401,
        'Reminder job secret not configured'
      );
    }
    const header = req.get('X-Reminder-Secret');
    const bearer = (req.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    if (header !== expected && bearer !== expected) {
      throw createError(401, 'Invalid reminder job secret');
    }

    const dryRun = req.query.dryRun === 'true' || req.body?.dryRun === true;
    const asOf = req.body?.asOf ? new Date(req.body.asOf) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw createError(400, 'Invalid asOf date');
    }

    const summary = await runReminderJob({ asOf, dryRun });
    res.json({ success: true, data: summary });
  } catch (err) {
    next(err);
  }
}

module.exports = { postRunReminders };
