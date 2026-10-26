const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const ApiError = require('../utils/apiError');
const { generateTransactionId } = require('../utils/idGenerator');

/**
 * Service handling transaction operations and ledger integrity.
 */
class TransactionService {
  /**
   * Add a new credit or debit transaction to an account atomically.
   *
   * @param {Object} params
   * @param {string} params.account_id - Account unique ID
   * @param {'credit'|'debit'} params.type - Transaction type
   * @param {number} params.amount - Transaction amount
   * @param {string} [params.description] - Description of transaction
   * @param {string} params.reference_id - Unique reference for transaction in account
   * @returns {Promise<Object>} Created transaction
   */
  async addTransaction({ account_id, type, amount, description = '', reference_id }) {
    // 1. Check for duplicate reference_id within this specific account first
    const existingTxn = await Transaction.findOne({ account_id, reference_id });
    if (existingTxn) {
      throw ApiError.conflict(
        `Transaction with reference_id '${reference_id}' already exists for account '${account_id}'. Duplicate transactions are rejected.`
      );
    }

    // 2. Check if account exists before proceeding
    const accountCheck = await Account.findOne({ id: account_id });
    if (!accountCheck) {
      throw ApiError.notFound(`Account with ID '${account_id}' does not exist`);
    }

    // 3. Perform atomic operation using MongoDB Session (supports Atlas replica sets)
    // with graceful fallback for standalone MongoDB instances without replica sets.
    let session = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      // Retrieve fresh account document within session lock
      const account = await Account.findOne({ id: account_id }).session(session);
      if (!account) {
        throw ApiError.notFound(`Account with ID '${account_id}' does not exist`);
      }

      // Check balance requirement for debit
      if (type === 'debit') {
        if (account.balance < amount) {
          throw ApiError.badRequest(
            `Insufficient balance. Current balance: ${account.balance}, Requested debit: ${amount}`
          );
        }
        account.balance = Math.round((account.balance - amount) * 100) / 100;
      } else if (type === 'credit') {
        account.balance = Math.round((account.balance + amount) * 100) / 100;
      }

      // Save updated account balance within transaction
      await account.save({ session });

      // Create transaction record within transaction
      const transactionId = generateTransactionId();
      const transaction = new Transaction({
        id: transactionId,
        account_id,
        type,
        amount,
        description,
        reference_id,
        created_at: new Date(),
      });

      await transaction.save({ session });

      // Commit transaction
      await session.commitTransaction();

      return transaction.toJSON();
    } catch (error) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }

      // If MongoDB is running in standalone mode (no replica set), fall back to atomic conditional update
      const isStandaloneReplicaError =
        error.message &&
        (error.message.includes('replica set') ||
          error.message.includes('Transaction numbers are only allowed on a replica set member'));

      if (isStandaloneReplicaError) {
        return await this._addTransactionStandalone({ account_id, type, amount, description, reference_id });
      }

      // Propagate known or unexpected errors
      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Fallback atomic handler for local standalone MongoDB instances without replica set.
   * Uses atomic findOneAndUpdate with condition check to prevent race conditions & negative balances.
   * @private
   */
  async _addTransactionStandalone({ account_id, type, amount, description, reference_id }) {
    let updatedAccount;

    if (type === 'debit') {
      // Atomic conditional decrement: only succeeds if balance >= amount
      updatedAccount = await Account.findOneAndUpdate(
        { id: account_id, balance: { $gte: amount } },
        { $inc: { balance: -amount } },
        { new: true }
      );

      if (!updatedAccount) {
        // Distinguish between account not found vs insufficient balance
        const acc = await Account.findOne({ id: account_id });
        if (!acc) {
          throw ApiError.notFound(`Account with ID '${account_id}' does not exist`);
        }
        throw ApiError.badRequest(
          `Insufficient balance. Current balance: ${acc.balance}, Requested debit: ${amount}`
        );
      }
    } else {
      // Credit: atomic increment
      updatedAccount = await Account.findOneAndUpdate(
        { id: account_id },
        { $inc: { balance: amount } },
        { new: true }
      );

      if (!updatedAccount) {
        throw ApiError.notFound(`Account with ID '${account_id}' does not exist`);
      }
    }

    // Now record transaction
    try {
      const transactionId = generateTransactionId();
      const transaction = new Transaction({
        id: transactionId,
        account_id,
        type,
        amount,
        description,
        reference_id,
        created_at: new Date(),
      });

      await transaction.save();
      return transaction.toJSON();
    } catch (txnError) {
      // If transaction insert fails (e.g. duplicate reference_id), compensate account balance
      const compensation = type === 'debit' ? amount : -amount;
      await Account.updateOne({ id: account_id }, { $inc: { balance: compensation } });
      throw txnError;
    }
  }

  /**
   * Fetch transaction history for an account with filtering, pagination, and latest-first sorting.
   *
   * @param {string} accountId - Unique account ID
   * @param {Object} options
   * @param {'credit'|'debit'} [options.type] - Filter by transaction type
   * @param {number} [options.page=1] - Current page number
   * @param {number} [options.limit=10] - Number of records per page
   * @returns {Promise<{transactions: Array, pagination: Object}>}
   */
  async getTransactionHistory(accountId, { type, page = 1, limit = 10 }) {
    // 1. Verify that the account exists
    const account = await Account.findOne({ id: accountId });
    if (!account) {
      throw ApiError.notFound(`Account with ID '${accountId}' does not exist`);
    }

    // 2. Build query filter
    const filter = { account_id: accountId };
    if (type) {
      filter.type = type;
    }

    // 3. Count total matching records for pagination metadata
    const totalRecords = await Transaction.countDocuments(filter);
    const totalPages = Math.ceil(totalRecords / limit) || (totalRecords === 0 ? 0 : 1);
    const skip = (page - 1) * limit;

    // 4. Query transactions sorted by created_at in descending (latest-first) order
    const transactions = await Transaction.find(filter)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(limit);

    return {
      transactions: transactions.map((t) => t.toJSON()),
      pagination: {
        currentPage: page,
        pageSize: transactions.length,
        totalRecords,
        totalPages,
        current_page: page,
        page_size: transactions.length,
        total_records: totalRecords,
        total_pages: totalPages,
      },
    };
  }
}

module.exports = new TransactionService();
