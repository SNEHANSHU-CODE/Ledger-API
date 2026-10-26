const accountService = require('../services/accountService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Controller handling Account HTTP requests.
 */
class AccountController {
  /**
   * Handle account creation.
   * Route: POST /api/v1/accounts
   */
  async createAccount(req, res, next) {
    try {
      const { name } = req.body;
      const account = await accountService.createAccount(name);
      return ApiResponse.created(res, 'Account created successfully', account);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle fetching account balance.
   * Route: GET /api/v1/accounts/:id/balance
   */
  async getAccountBalance(req, res, next) {
    try {
      const accountId = req.params.id;
      const balanceData = await accountService.getAccountBalance(accountId);
      return ApiResponse.success(res, 200, 'Account balance fetched successfully', balanceData);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle fetching account details.
   * Route: GET /api/v1/accounts/:id
   */
  async getAccountById(req, res, next) {
    try {
      const accountId = req.params.id;
      const account = await accountService.getAccountById(accountId);
      return ApiResponse.success(res, 200, 'Account details fetched successfully', account);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AccountController();
