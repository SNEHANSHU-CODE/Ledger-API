/**
 * Utility for standardized API response structures.
 */
class ApiResponse {
  /**
   * Send a successful JSON response
   * @param {import('express').Response} res - Express response object
   * @param {number} statusCode - HTTP status code (default: 200)
   * @param {string} message - Success message
   * @param {*} data - Payload data
   * @param {Object} [meta] - Optional metadata (e.g., pagination info)
   */
  static success(res, statusCode = 200, message = 'Success', data = null, meta = undefined) {
    const payload = {
      success: true,
      message,
      data,
    };

    if (meta !== undefined) {
      payload.pagination = meta;
    }

    return res.status(statusCode).json(payload);
  }

  /**
   * Send a 201 Created response
   */
  static created(res, message = 'Resource created successfully', data = null) {
    return ApiResponse.success(res, 201, message, data);
  }
}

module.exports = ApiResponse;
