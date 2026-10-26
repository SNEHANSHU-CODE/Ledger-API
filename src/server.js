const app = require('./app');
const env = require('./config/env');
const { connectDB, disconnectDB } = require('./config/db');

// Handle uncaught exceptions before server starts
process.on('uncaughtException', (err) => {
  console.error('[Uncaught Exception] Shutting down...', err);
  process.exit(1);
});

let server;

/**
 * Bootstrap database connection and start Express server
 */
const startServer = async () => {
  try {
    // 1. Establish database connection (MongoDB Atlas / local)
    await connectDB();

    // 2. Start HTTP server
    server = app.listen(env.PORT, () => {
      console.log('==================================================');
      console.log(` Ledger API Server running in [${env.NODE_ENV}] mode`);
      console.log(` Listening on port: http://localhost:${env.PORT}`);
      console.log(` API Base URL: http://localhost:${env.PORT}${env.API_PREFIX}`);
      console.log('==================================================');
    });
  } catch (error) {
    console.error(`[Server Start Error] ${error.message}`);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Unhandled Rejection] Shutting down...', err);
  if (server) {
    server.close(() => {
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle graceful shutdown on process termination signals
const handleGracefulShutdown = async (signal) => {
  console.log(`\n[${signal}] Received. Closing HTTP server and DB connections gracefully...`);
  if (server) {
    server.close(async () => {
      console.log('[Server] HTTP server closed.');
      await disconnectDB();
      console.log('[Server] Process finished cleanly.');
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on('SIGINT', () => handleGracefulShutdown('SIGINT'));
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM'));
