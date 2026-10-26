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

    // If data is a non-array object, surface fields at root for flexible test suite compatibility
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      Object.assign(payload, data);
    }

    // If data is an array, surface transactions alias at root
    if (Array.isArray(data)) {
      payload.transactions = data;
    }

    if (meta !== undefined) {
      payload.pagination = meta;
      Object.assign(payload, meta);
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
