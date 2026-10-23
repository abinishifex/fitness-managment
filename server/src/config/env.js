require('./loadDotenv');

const required = ['MONGODB_URI'];

function loadEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
    // Warn only — CI/unit tests may run without Atlas. connectDB still fails hard on use.
    console.warn(`⚠️  Missing env vars (ok for lint/test): ${missing.join(', ')}`);
  }

  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    const prodRequired = ['MONGODB_URI', 'JWT_SECRET', 'FRONTEND_ORIGIN'];
    const prodMissing = prodRequired.filter((key) => !process.env[key]);
    if (prodMissing.length > 0) {
      throw new Error(`Missing required production env: ${prodMissing.join(', ')}`);
    }
    if (process.env.JWT_SECRET === 'change-me-to-a-long-random-string' || process.env.JWT_SECRET === 'dev-only-change-me') {
      throw new Error('JWT_SECRET must be set to a strong secret in production');
    }
  }

  return {
    nodeEnv,
    port: Number(process.env.PORT) || 4000,
    mongodbUri: process.env.MONGODB_URI || '',
    jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    aiProvider: process.env.AI_PROVIDER || 'gemini',
    aiApiKey: process.env.AI_API_KEY || '',
    aiModel: process.env.AI_MODEL || 'gemini-3.5-flash-lite',
    aiModels:
      process.env.AI_MODELS ||
      'gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-flash-lite-latest,gemini-3.6-flash',
    aiBaseUrl:
      process.env.AI_BASE_URL ||
      'https://generativelanguage.googleapis.com/v1beta/openai',
    aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 30000,
    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramBotUsername: (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, ''),
    telegramWebhookSecret: process.env.TELEGRAM_WEBHOOK_SECRET || '',
    reminderJobSecret: process.env.REMINDER_JOB_SECRET || '',
    frontendOrigin: process.env.FRONTEND_ORIGIN || process.env.CORS_ORIGIN || '',
    sentryDsn: process.env.SENTRY_DSN || '',
    enableReminderCron: process.env.ENABLE_REMINDER_CRON !== 'false',
  };
}

module.exports = { loadEnv, env: loadEnv() };
