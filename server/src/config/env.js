require('dotenv/config');

const required = ['MONGODB_URI'];

function loadEnv() {
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0 && process.env.NODE_ENV !== 'test') {
    // Warn only — CI/unit tests may run without Atlas. connectDB still fails hard on use.
    console.warn(`⚠️  Missing env vars (ok for lint/test): ${missing.join(', ')}`);
  }

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: Number(process.env.PORT) || 3000,
    mongodbUri: process.env.MONGODB_URI || '',
    jwtSecret: process.env.JWT_SECRET || 'dev-only-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    aiProvider: process.env.AI_PROVIDER || 'groq',
    aiApiKey: process.env.AI_API_KEY || '',
    aiModel: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
    aiBaseUrl: process.env.AI_BASE_URL || 'https://api.groq.com/openai/v1',
    aiTimeoutMs: Number(process.env.AI_TIMEOUT_MS) || 30000,
  };
}

module.exports = { loadEnv, env: loadEnv() };
