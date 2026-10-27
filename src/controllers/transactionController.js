const transactionService = require('../services/transactionService');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

/**
 * Controller handling Transaction HTTP requests.
 */
class TransactionController {
  /**
   * Handle adding a new transaction to an account.
   * Route: POST /api/v1/transactions or POST /api/v1/accounts/:id/transactions
   */
  async createTransaction(req, res, next) {
    try {
      const { account_id, type, amount, description, reference_id } = req.body;

      const transaction = await transactionService.addTransaction({
        account_id,
        type,
        amount,
        description,
        reference_id,
      });

      return ApiResponse.created(res, 'Transaction created successfully', transaction);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle fetching transaction history for an account.
   * Supports filtering (by type: credit/debit), pagination (page, limit), and latest-first sorting.
   * Route: GET /api/v1/accounts/:id/transactions or GET /api/v1/transactions?account_id=:id
   */
  async getTransactionHistory(req, res, next) {
    try {
      const accountId = req.params.id || req.query.account_id || req.query.accountId;
      if (!accountId || typeof accountId !== 'string' || accountId.trim() === '') {
        throw ApiError.badRequest('A valid account_id is required either in route parameters or query parameters');
      }
      const { type, page, limit } = req.query;

      const { transactions, pagination } = await transactionService.getTransactionHistory(accountId.trim(), {
        type,
        page,
        limit,
      });

      return ApiResponse.success(
        res,
        200,
        'Transaction history fetched successfully',
        transactions,
        pagination
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TransactionController();
