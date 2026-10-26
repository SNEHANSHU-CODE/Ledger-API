const ApiError = require('../utils/apiError');

/**
 * Validates payload for creating a new account.
 * Enforces:
 * - name is required, string, and not empty
 * - client is not allowed to set initial balance
 */
const validateCreateAccount = (req, res, next) => {
  const { name, balance } = req.body;

  if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
    return next(ApiError.badRequest('Request body cannot be empty'));
  }

  // Name validation
  if (name === undefined || name === null || typeof name !== 'string' || name.trim() === '') {
    return next(ApiError.badRequest('Account name is required and must be a non-empty string'));
  }

  if (name.trim().length > 100) {
    return next(ApiError.badRequest('Account name cannot exceed 100 characters'));
  }

  // Enforce rule: client should not be allowed to set initial balance
  if (balance !== undefined) {
    return next(
      ApiError.badRequest('Client is not allowed to set the initial balance. Initial balance is always 0.')
    );
  }

  // Attach sanitized name to request body
  req.body.name = name.trim();

  next();
};

/**
 * Validates account ID parameter in URL
 */
const validateAccountIdParam = (req, res, next) => {
  const accountId = req.params.id || req.params.accountId;

  if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
    return next(ApiError.badRequest('Valid account ID is required in route parameters'));
  }

  req.params.id = accountId.trim();
  next();
};

module.exports = {
  validateCreateAccount,
  validateAccountIdParam,
};
