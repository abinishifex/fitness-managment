const { env } = require('./src/config/env');
const connectDB = require('./src/database/connectDB');
const { createApp } = require('./src/app');

async function initSentry() {
  if (!env.sentryDsn) return;
  try {
    const Sentry = require('@sentry/node');
    Sentry.init({
      dsn: env.sentryDsn,
      environment: env.nodeEnv,
      tracesSampleRate: env.nodeEnv === 'production' ? 0.1 : 1.0,
    });
    console.log('Sentry initialized');
  } catch (err) {
    console.warn('Sentry init skipped:', err.message);
  }
}

function startReminderCron() {
  if (!env.enableReminderCron) {
    console.log('Reminder cron disabled (ENABLE_REMINDER_CRON=false)');
    return;
  }
  try {
    const cron = require('node-cron');
    const { runReminderJob } = require('./src/jobs/reminderJob');
    // Daily at 09:00 server time
    cron.schedule('0 9 * * *', async () => {
      console.log('[reminder-cron] starting');
      try {
        const summary = await runReminderJob();
        console.log('[reminder-cron] done', {
          scanned: summary.scanned,
          sent: summary.sent,
          skipped: summary.skipped,
          errors: summary.errors,
        });
      } catch (err) {
        console.error('[reminder-cron] failed', err);
      }
    });
    console.log('Reminder cron scheduled (daily 09:00)');
  } catch (err) {
    console.warn('Reminder cron not started:', err.message);
  }
}

async function main() {
  await initSentry();
  await connectDB();
  const app = createApp();

  app.listen(env.port, () => {
    console.log(`🚀 Server listening on port ${env.port} (${env.nodeEnv})`);
    startReminderCron();
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
