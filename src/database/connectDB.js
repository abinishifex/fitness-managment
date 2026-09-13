const mongoose = require('mongoose');
require('dotenv/config');
require('./models'); // ensures all schemas (and their indexes) are registered before syncing

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Atlas connected');

    await mongoose.syncIndexes();
    console.log('✅ Indexes synced');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = connectDB;