const Account = require('../models/Account');
const ApiError = require('../utils/apiError');
const { generateAccountId } = require('../utils/idGenerator');

/**
 * Service handling account-related business logic.
 */
class AccountService {
  /**
   * Create a new account with an initial balance of 0.
   * @param {string} name - Account holder name
   * @returns {Promise<Object>} Created account document
   */
  async createAccount(name) {
    const accountId = generateAccountId();

    const account = new Account({
      id: accountId,
      name,
      balance: 0, // Requirement: Initial balance must always be 0
    });

    await account.save();
    return account.toJSON();
  }

  /**
   * Find an account by its unique identifier.
   * @param {string} accountId - Unique account ID
   * @returns {Promise<Object>} Account document
   * @throws {ApiError} 404 if account does not exist
   */
  async getAccountById(accountId) {
    const account = await Account.findOne({ id: accountId });

    if (!account) {
      throw ApiError.notFound(`Account with ID '${accountId}' does not exist`);
    }

    return account.toJSON();
  }

  /**
   * Fetch current balance for an account.
   * Requirement: Response should include at least account_id and balance.
   * @param {string} accountId - Unique account ID
   * @returns {Promise<{account_id: string, balance: number}>}
   */
  async getAccountBalance(accountId) {
    const account = await this.getAccountById(accountId);

    return {
      account_id: account.id,
      balance: account.balance,
    };
  }
}

module.exports = new AccountService();
