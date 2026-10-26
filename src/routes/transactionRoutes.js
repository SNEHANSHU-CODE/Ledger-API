const express = require('express');
const transactionController = require('../controllers/transactionController');
const { validateCreateTransaction, validateTransactionQuery } = require('../validators/transactionValidators');
const ApiError = require('../utils/apiError');

const router = express.Router();

/**
 * @route   POST /api/v1/transactions
 * @desc    Add a credit or debit transaction to an account
 * @access  Public
 */
router.post('/', validateCreateTransaction, transactionController.createTransaction);

/**
 * @route   GET /api/v1/transactions?account_id=:id&type=credit|debit&page=1&limit=10
 * @desc    Get transactions by account_id via query parameter
 * @access  Public
 */
router.get('/', validateTransactionQuery, transactionController.getTransactionHistory);

/**
 * Transaction Immutability Enforcement (Per Requirement 5):
 * "Once a transaction is created, it must not be editable or deletable through the API."
 * Explicitly return 405 Method Not Allowed for PUT, PATCH, and DELETE operations.
 */
const rejectMutation = (req, res, next) => {
  next(
    new ApiError(
      405,
      `Method ${req.method} not allowed. Transactions are immutable and cannot be edited or deleted through the API.`
    )
  );
};

router.put('/:id', rejectMutation);
router.patch('/:id', rejectMutation);
router.delete('/:id', rejectMutation);

module.exports = router;
