const express = require('express');
const accountController = require('../controllers/accountController');
const transactionController = require('../controllers/transactionController');
const { validateCreateAccount, validateAccountIdParam } = require('../validators/accountValidators');
const { validateCreateTransaction, validateTransactionQuery } = require('../validators/transactionValidators');

const router = express.Router();

/**
 * @route   POST /api/v1/accounts
 * @desc    Create a new account with initial balance = 0
 * @access  Public
 */
router.post('/', validateCreateAccount, accountController.createAccount);

/**
 * @route   GET /api/v1/accounts/:id/balance
 * @desc    Fetch current balance of an account
 * @access  Public
 */
router.get('/:id/balance', validateAccountIdParam, accountController.getAccountBalance);

/**
 * @route   GET /api/v1/accounts/:id
 * @desc    Fetch account profile details
 * @access  Public
 */
router.get('/:id', validateAccountIdParam, accountController.getAccountById);

/**
 * @route   GET /api/v1/accounts/:id/transactions
 * @desc    Get transaction history with filtering (type) and pagination (page, limit)
 * @access  Public
 */
router.get(
  '/:id/transactions',
  validateAccountIdParam,
  validateTransactionQuery,
  transactionController.getTransactionHistory
);

/**
 * @route   POST /api/v1/accounts/:id/transactions
 * @desc    Convenience nested endpoint to add a transaction directly under an account
 * @access  Public
 */
router.post(
  '/:id/transactions',
  validateAccountIdParam,
  validateCreateTransaction,
  transactionController.createTransaction
);

module.exports = router;
