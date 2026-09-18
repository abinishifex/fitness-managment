const { env } = require('./src/config/env');
const connectDB = require('./src/database/connectDB');
const { createApp } = require('./src/app');

async function main() {
  await connectDB();
  const app = createApp();

  app.listen(env.port, () => {
    console.log(`🚀 Server listening on port ${env.port} (${env.nodeEnv})`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
