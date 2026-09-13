const connectDB = require('./src/database/connectDB');

connectDB().then(() => {
  console.log('Ready — connection test complete.');
  process.exit(0);
});