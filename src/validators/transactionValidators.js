const ApiError = require('../utils/apiError');

/**
 * Validates payload for adding a new transaction to an account.
 * Enforces:
 * - account_id is required and non-empty
 * - type must be either 'credit' or 'debit'
 * - amount must be a number > 0
 * - reference_id is required and non-empty
 */
const validateCreateTransaction = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
    return next(ApiError.badRequest('Request body cannot be empty'));
  }

  // Account ID can be provided in request body or url params
  const account_id = req.body.account_id || req.params.accountId || req.params.id;
  const { type, amount, reference_id, description } = req.body;

  // Validate account_id
  if (!account_id || typeof account_id !== 'string' || account_id.trim() === '') {
    return next(ApiError.badRequest('account_id is required and must be a valid string'));
  }

  // Validate type
  if (!type || typeof type !== 'string') {
    return next(ApiError.badRequest('Transaction type is required and must be either credit or debit'));
  }

  const normalizedType = type.trim().toLowerCase();
  if (normalizedType !== 'credit' && normalizedType !== 'debit') {
    return next(ApiError.badRequest("Invalid transaction type. Allowed values are 'credit' or 'debit'"));
  }

  // Validate amount
  if (amount === undefined || amount === null || typeof amount !== 'number' || !Number.isFinite(amount)) {
    return next(ApiError.badRequest('Transaction amount is required and must be a valid finite number'));
  }

  if (amount <= 0) {
    return next(ApiError.badRequest('Transaction amount must be greater than 0'));
  }

  // Validate reference_id
  if (!reference_id || typeof reference_id !== 'string' || reference_id.trim() === '') {
    return next(ApiError.badRequest('reference_id is required and must be a non-empty string'));
  }

  // Validate description (optional, but if provided must be a string)
  if (description !== undefined && typeof description !== 'string') {
    return next(ApiError.badRequest('description must be a string'));
  }

  // Normalize sanitized values onto req.body
  req.body.account_id = account_id.trim();
  req.body.type = normalizedType;
  req.body.amount = Math.round(amount * 100) / 100; // Round to 2 decimal places to prevent floating-point anomalies
  req.body.reference_id = reference_id.trim();
  req.body.description = description ? description.trim() : '';

  next();
};

/**
 * Validates query parameters for fetching transaction history.
 * Enforces:
 * - type: optional, if provided must be 'credit' or 'debit'
 * - page: optional, must be positive integer >= 1
 * - limit: optional, must be positive integer between 1 and 100
 */
const validateTransactionQuery = (req, res, next) => {
  const { type, page, limit } = req.query;

  // Validate type if provided
  if (type !== undefined) {
    const normalizedType = type.trim().toLowerCase();
    if (normalizedType !== 'credit' && normalizedType !== 'debit') {
      return next(ApiError.badRequest("Invalid filter type. Allowed values are 'credit' or 'debit'"));
    }
    req.query.type = normalizedType;
  }

  // Validate page
  if (page !== undefined) {
    const parsedPage = Number(page);
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      return next(ApiError.badRequest('Invalid pagination parameter: page must be an integer greater than or equal to 1'));
    }
    req.query.page = parsedPage;
  } else {
    req.query.page = 1;
  }

  // Validate limit
  if (limit !== undefined) {
    const parsedLimit = Number(limit);
    if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      return next(ApiError.badRequest('Invalid pagination parameter: limit must be an integer between 1 and 100'));
    }
    req.query.limit = parsedLimit;
  } else {
    req.query.limit = 10;
  }

  next();
};

module.exports = {
  validateCreateTransaction,
  validateTransactionQuery,
};
