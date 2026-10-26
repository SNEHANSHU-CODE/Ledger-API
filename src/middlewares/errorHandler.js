const ApiError = require('../utils/apiError');

/**
 * Centralized error-handling middleware.
 * Formats all operational and unexpected errors into a consistent JSON response.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = err.details || null;

  // Handle malformed JSON body errors sent by express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON syntax in request body';
  }

  // Handle Mongoose / MongoDB duplicate key error (code 11000)
  if (err.code === 11000) {
    statusCode = 409;
    const fields = Object.keys(err.keyPattern || {});

    if (fields.includes('account_id') && fields.includes('reference_id')) {
      const refId = err.keyValue?.reference_id || 'provided';
      message = `A transaction with reference_id '${refId}' already exists for this account.`;
    } else if (fields.includes('id')) {
      message = 'An entity with this ID already exists.';
    } else {
      message = `Duplicate field value entered: ${fields.join(', ')}`;
    }
  }

  // Handle Mongoose schema validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
    details = Object.values(err.errors).map((e) => e.message);
  }

  // Handle Mongoose CastError (e.g., invalid ObjectId or type casting)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field '${err.path}'`;
  }

  // Log non-operational (unexpected) errors in development/production for debugging
  if (statusCode === 500) {
    console.error('[Unhandled Internal Error]', err);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code: statusCode,
      message,
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV === 'development' && statusCode === 500 ? { stack: err.stack } : {}),
    },
  });
};

module.exports = errorHandler;
