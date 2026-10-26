const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const env = require('./config/env');
const routes = require('./routes');
const notFoundHandler = require('./middlewares/notFoundHandler');
const errorHandler = require('./middlewares/errorHandler');

const app = express();

// ==========================================
// 1. Global Middlewares
// ==========================================

// Enable Cross-Origin Resource Sharing (CORS)
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// HTTP request logger
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Parse JSON request bodies
app.use(express.json({ limit: '10kb' }));

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ==========================================
// 2. Base & Health Endpoints
// ==========================================

// Root welcome & API info
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Transaction Ledger API',
    version: '1.0.0',
    description: 'Transaction Ledger System backend API with atomic balances and audit trails.',
    docs: `${env.API_PREFIX}/health`,
    endpoints: {
      health: `GET ${env.API_PREFIX}/health`,
      createAccount: `POST ${env.API_PREFIX}/accounts`,
      getAccountBalance: `GET ${env.API_PREFIX}/accounts/:id/balance`,
      getAccountDetails: `GET ${env.API_PREFIX}/accounts/:id`,
      addTransaction: `POST ${env.API_PREFIX}/transactions`,
      getTransactionHistory: `GET ${env.API_PREFIX}/accounts/:id/transactions?type=credit|debit&page=1&limit=10`,
      transferMoneyBonus: `POST ${env.API_PREFIX}/transfers`,
    },
  });
});

// ==========================================
// 3. API Routes Mounting
// ==========================================
app.use(env.API_PREFIX, routes);

// ==========================================
// 4. Error Handling Middlewares
// ==========================================

// Catch-all for undefined routes (404)
app.use(notFoundHandler);

// Global centralized error handler
app.use(errorHandler);

module.exports = app;
