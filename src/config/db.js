const mongoose = require('mongoose');
const env = require('./env');

/**
 * Connect to MongoDB / MongoDB Atlas using Mongoose.
 * Configured with auto-reconnect listeners and connection pooling.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      autoIndex: true, // Build unique indexes automatically
    });

    console.log(`[Database] MongoDB Connected successfully to: ${conn.connection.host}`);
    console.log(`[Database] Database name: ${conn.connection.name}`);

    // Set up connection event listeners for resilience
    mongoose.connection.on('error', (err) => {
      console.error(`[Database Error] Connection error: ${err.message}`);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('[Database Warning] MongoDB connection lost.');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('[Database] MongoDB connection re-established.');
    });

    return conn;
  } catch (error) {
    console.error(`[Database Connection Failure] ${error.message}`);
    // Exit process with failure code if initial DB connection fails
    process.exit(1);
  }
};

/**
 * Disconnect database connection cleanly (useful for tests and graceful shutdown)
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[Database] Connection closed cleanly.');
  } catch (err) {
    console.error(`[Database Disconnect Error] ${err.message}`);
  }
};

module.exports = {
  connectDB,
  disconnectDB,
};
