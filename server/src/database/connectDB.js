const mongoose = require('mongoose');
require('dotenv/config');
require('./models'); // ensures all schemas (and their indexes) are registered before syncing

async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.error('❌ MONGODB_URI is not set in .env');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000, // 10 s to find a server
      socketTimeoutMS: 45000,
      family: 4, // force IPv4 — avoids IPv6 SRV issues
    });

    console.log('✅ MongoDB Atlas connected');

    await mongoose.syncIndexes();
    console.log('✅ Indexes synced');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);

    const isNetworkErr =
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('querySrv') ||
      err.message.includes('ETIMEOUT') ||
      err.message.includes('getaddrinfo') ||
      err.message.includes('IP') ||
      err.message.includes('whitelist');

    if (isNetworkErr) {
      console.error('\n🔒 This looks like an Atlas IP whitelist issue.');
      console.error('👉 Steps to fix:');
      console.error('   1. Go to https://cloud.mongodb.com');
      console.error('   2. Navigate to: Security → Network Access');
      console.error('   3. Click "Add IP Address" → "Allow Access from Anywhere" (0.0.0.0/0)');
      console.error('   4. Wait 30-60 seconds for changes to propagate');
      console.error('   5. Restart this server\n');
    }

    process.exit(1);
  }
}

module.exports = connectDB;
