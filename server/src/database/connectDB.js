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
    const isNetworkErr =
      err.message.includes('ECONNREFUSED') ||
      err.message.includes('querySrv') ||
      err.message.includes('ETIMEOUT') ||
      err.message.includes('getaddrinfo');

    if (isNetworkErr) {
      console.error('❌ MongoDB connection error:', err.message);
      console.error(
        '👉 Go to MongoDB Atlas → Network Access → Add your IP or allow 0.0.0.0/0'
      );
    } else {
      console.error('❌ MongoDB connection error:', err.message);
    }

    process.exit(1);
  }
}

module.exports = connectDB;
