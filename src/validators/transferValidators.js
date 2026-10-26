const ApiError = require('../utils/apiError');

/**
 * Validates payload for atomic money transfer between accounts.
 */
const validateTransfer = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
    return next(ApiError.badRequest('Request body cannot be empty'));
  }

  const { from_account_id, to_account_id, amount, reference_id, description } = req.body;

  // Validate from_account_id
  if (!from_account_id || typeof from_account_id !== 'string' || from_account_id.trim() === '') {
    return next(ApiError.badRequest('from_account_id is required and must be a valid string'));
  }

  // Validate to_account_id
  if (!to_account_id || typeof to_account_id !== 'string' || to_account_id.trim() === '') {
    return next(ApiError.badRequest('to_account_id is required and must be a valid string'));
  }

  // Source and destination accounts cannot be the same
  if (from_account_id.trim() === to_account_id.trim()) {
    return next(ApiError.badRequest('Source and destination accounts cannot be the same'));
  }

  // Validate amount
  if (amount === undefined || amount === null || typeof amount !== 'number' || !Number.isFinite(amount)) {
    return next(ApiError.badRequest('Transfer amount is required and must be a valid finite number'));
  }

  if (amount <= 0) {
    return next(ApiError.badRequest('Transfer amount must be greater than 0'));
  }

  // Validate reference_id
  if (!reference_id || typeof reference_id !== 'string' || reference_id.trim() === '') {
    return next(ApiError.badRequest('reference_id is required and must be a non-empty string'));
  }

  // Validate description (optional)
  if (description !== undefined && typeof description !== 'string') {
    return next(ApiError.badRequest('description must be a string'));
  }

  req.body.from_account_id = from_account_id.trim();
  req.body.to_account_id = to_account_id.trim();
  req.body.amount = Math.round(amount * 100) / 100;
  req.body.reference_id = reference_id.trim();
  req.body.description = description ? description.trim() : `Transfer from ${from_account_id} to ${to_account_id}`;

  next();
};

module.exports = {
  validateTransfer,
};
