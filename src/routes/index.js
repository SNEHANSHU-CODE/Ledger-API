const express = require('express');
const accountRoutes = require('./accountRoutes');
const transactionRoutes = require('./transactionRoutes');
const transferRoutes = require('./transferRoutes');

const router = express.Router();

/**
 * Health Check Endpoint
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// Mount domain routes
router.use('/accounts', accountRoutes);
router.use('/transactions', transactionRoutes);
router.use('/transfers', transferRoutes);

module.exports = router;
