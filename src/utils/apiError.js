/**
 * Custom ApiError class for operational, known application errors.
 * Encapsulates HTTP status codes and optional detailed validation errors.
 */
class ApiError extends Error {
  /**
   * @param {number} statusCode - HTTP status code (e.g. 400, 404, 409, 500)
   * @param {string} message - Descriptive error message
   * @param {Array|Object|null} details - Optional array or object with granular validation/error details
   */
  constructor(statusCode, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true; // Distinguishes operational errors from programming bugs
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details = null) {
    return new ApiError(400, message, details);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource conflict detected') {
    return new ApiError(409, message);
  }

  static unprocessable(message, details = null) {
    return new ApiError(422, message, details);
  }

  static internal(message = 'An unexpected internal error occurred') {
    return new ApiError(500, message);
  }
}

module.exports = ApiError;
