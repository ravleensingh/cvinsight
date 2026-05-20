const mongoose = require('mongoose');

// MongoDB connection with enhanced error handling
const connectDB = async () => {
  const uri = process.env.MONGO_URI;

  // Validate MongoDB URI
  if (!uri) {
    console.error('[ERROR] MONGO_URI environment variable is not set');
    console.error('[INFO] Please set MONGO_URI in your environment variables or .env file');
    console.error('[INFO] See SECURITY.md for setup instructions');
    process.exit(1);
  }

  try {
    // Connection options for stability
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4 // Use IPv4, skip trying IPv6
    };

    console.log('[DB] Connecting to MongoDB Atlas...');
    await mongoose.connect(uri, options);

    console.log('[DB] MongoDB Atlas connected successfully');
    console.log(`[DB] Database: ${mongoose.connection.name}`);
    console.log(`[DB] Host: ${mongoose.connection.host}`);

    // Connection event listeners
    mongoose.connection.on('error', (err) => {
      console.error('[DB ERROR] MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[DB WARN] MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[DB] MongoDB reconnected');
    });

  } catch (err) {
    console.error('[DB ERROR] MongoDB connection failed:', err.message);
    console.error('[DB INFO] Check your MONGO_URI and network connection');
    process.exit(1);
  }
};

module.exports = connectDB;