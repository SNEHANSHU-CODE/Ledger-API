const transferService = require('../services/transferService');
const ApiResponse = require('../utils/apiResponse');

/**
 * Controller handling Money Transfer HTTP requests.
 */
class TransferController {
  /**
   * Handle atomic money transfer from one account to another.
   * Route: POST /api/v1/transfers
   */
  async transferMoney(req, res, next) {
    try {
      const { from_account_id, to_account_id, amount, reference_id, description } = req.body;

      const transferResult = await transferService.transferMoney({
        from_account_id,
        to_account_id,
        amount,
        reference_id,
        description,
      });

      return ApiResponse.success(res, 200, 'Funds transferred successfully', transferResult);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new TransferController();
