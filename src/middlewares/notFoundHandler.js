const ApiError = require('../utils/apiError');

/**
 * 404 Route Not Found middleware.
 * Catches requests to unregistered endpoints and forwards an ApiError.
 */
const notFoundHandler = (req, res, next) => {
  next(ApiError.notFound(`Endpoint not found: ${req.method} ${req.originalUrl}`));
};

module.exports = notFoundHandler;
