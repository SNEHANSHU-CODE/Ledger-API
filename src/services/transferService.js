const mongoose = require('mongoose');
const Account = require('../models/Account');
const Transaction = require('../models/Transaction');
const ApiError = require('../utils/apiError');
const { generateTransactionId, generateTransferId } = require('../utils/idGenerator');

/**
 * Service handling atomic money transfers between two accounts.
 */
class TransferService {
  /**
   * Transfer funds from one account to another atomically.
   *
   * @param {Object} params
   * @param {string} params.from_account_id - Source account ID
   * @param {string} params.to_account_id - Destination account ID
   * @param {number} params.amount - Transfer amount
   * @param {string} params.reference_id - Unique reference identifier
   * @param {string} [params.description] - Transfer note/description
   * @returns {Promise<Object>} Transfer confirmation details
   */
  async transferMoney({ from_account_id, to_account_id, amount, reference_id, description = '' }) {
    if (from_account_id === to_account_id) {
      throw ApiError.badRequest('Source and destination accounts cannot be identical');
    }

    // 1. Verify existence of both accounts
    const [sourceCheck, destCheck] = await Promise.all([
      Account.findOne({ id: from_account_id }),
      Account.findOne({ id: to_account_id }),
    ]);

    if (!sourceCheck) {
      throw ApiError.notFound(`Source account '${from_account_id}' does not exist`);
    }

    if (!destCheck) {
      throw ApiError.notFound(`Destination account '${to_account_id}' does not exist`);
    }

    // Check duplicate reference on source account
    const existingDebit = await Transaction.findOne({
      account_id: from_account_id,
      reference_id: `${reference_id}_DEBIT`,
    });
    if (existingDebit) {
      throw ApiError.conflict(`A transfer with reference_id '${reference_id}' has already been processed.`);
    }

    // 2. Perform atomic transfer with MongoDB Session
    let session = null;
    const transferId = generateTransferId();

    try {
      session = await mongoose.startSession();
      session.startTransaction();

      // Retrieve source account with session lock
      const sourceAccount = await Account.findOne({ id: from_account_id }).session(session);
      if (!sourceAccount) {
        throw ApiError.notFound(`Source account '${from_account_id}' does not exist`);
      }

      if (sourceAccount.balance < amount) {
        throw ApiError.badRequest(
          `Insufficient balance in source account. Current balance: ${sourceAccount.balance}, Transfer amount: ${amount}`
        );
      }

      // Retrieve destination account with session lock
      const destAccount = await Account.findOne({ id: to_account_id }).session(session);
      if (!destAccount) {
        throw ApiError.notFound(`Destination account '${to_account_id}' does not exist`);
      }

      // Update balances
      sourceAccount.balance = Math.round((sourceAccount.balance - amount) * 100) / 100;
      destAccount.balance = Math.round((destAccount.balance + amount) * 100) / 100;

      await sourceAccount.save({ session });
      await destAccount.save({ session });

      // Create debit transaction for source account
      const debitTxn = new Transaction({
        id: generateTransactionId(),
        account_id: from_account_id,
        type: 'debit',
        amount,
        description: description || `Transfer out to ${to_account_id}`,
        reference_id: `${reference_id}_DEBIT`,
        created_at: new Date(),
      });

      // Create credit transaction for destination account
      const creditTxn = new Transaction({
        id: generateTransactionId(),
        account_id: to_account_id,
        type: 'credit',
        amount,
        description: description || `Transfer in from ${from_account_id}`,
        reference_id: `${reference_id}_CREDIT`,
        created_at: new Date(),
      });

      await debitTxn.save({ session });
      await creditTxn.save({ session });

      await session.commitTransaction();

      return {
        transfer_id: transferId,
        reference_id,
        amount,
        from_account_id,
        to_account_id,
        from_account_new_balance: sourceAccount.balance,
        to_account_new_balance: destAccount.balance,
        debit_transaction: debitTxn.toJSON(),
        credit_transaction: creditTxn.toJSON(),
      };
    } catch (error) {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
      }

      // Fallback for standalone MongoDB environments without replica set
      const isStandaloneReplicaError =
        error.message &&
        (error.message.includes('replica set') ||
          error.message.includes('Transaction numbers are only allowed on a replica set member'));

      if (isStandaloneReplicaError) {
        return await this._transferMoneyStandalone({
          from_account_id,
          to_account_id,
          amount,
          reference_id,
          description,
          transferId,
        });
      }

      throw error;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * Standalone fallback using atomic conditional operations and compensating rollback.
   * @private
   */
  async _transferMoneyStandalone({
    from_account_id,
    to_account_id,
    amount,
    reference_id,
    description,
    transferId,
  }) {
    // 1. Atomic decrement of source account (only if balance >= amount)
    const sourceAccount = await Account.findOneAndUpdate(
      { id: from_account_id, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true }
    );

    if (!sourceAccount) {
      const acc = await Account.findOne({ id: from_account_id });
      if (!acc) throw ApiError.notFound(`Source account '${from_account_id}' does not exist`);
      throw ApiError.badRequest(
        `Insufficient balance in source account. Current balance: ${acc.balance}, Transfer amount: ${amount}`
      );
    }

    // 2. Increment destination account
    let destAccount;
    try {
      destAccount = await Account.findOneAndUpdate(
        { id: to_account_id },
        { $inc: { balance: amount } },
        { new: true }
      );

      if (!destAccount) {
        // Destination missing -> rollback source account
        await Account.updateOne({ id: from_account_id }, { $inc: { balance: amount } });
        throw ApiError.notFound(`Destination account '${to_account_id}' does not exist`);
      }
    } catch (destErr) {
      // Rollback source account
      await Account.updateOne({ id: from_account_id }, { $inc: { balance: amount } });
      throw destErr;
    }

    // 3. Record transactions
    let debitTxn;
    let creditTxn;
    try {
      debitTxn = new Transaction({
        id: generateTransactionId(),
        account_id: from_account_id,
        type: 'debit',
        amount,
        description: description || `Transfer out to ${to_account_id}`,
        reference_id: `${reference_id}_DEBIT`,
        created_at: new Date(),
      });
      await debitTxn.save();

      creditTxn = new Transaction({
        id: generateTransactionId(),
        account_id: to_account_id,
        type: 'credit',
        amount,
        description: description || `Transfer in from ${from_account_id}`,
        reference_id: `${reference_id}_CREDIT`,
        created_at: new Date(),
      });
      await creditTxn.save();
    } catch (txnErr) {
      // Rollback both balances and created transactions
      await Account.updateOne({ id: from_account_id }, { $inc: { balance: amount } });
      await Account.updateOne({ id: to_account_id }, { $inc: { balance: -amount } });
      if (debitTxn?.id) await Transaction.deleteOne({ id: debitTxn.id });
      throw txnErr;
    }

    return {
      transfer_id: transferId,
      reference_id,
      amount,
      from_account_id,
      to_account_id,
      from_account_new_balance: sourceAccount.balance,
      to_account_new_balance: destAccount.balance,
      debit_transaction: debitTxn.toJSON(),
      credit_transaction: creditTxn.toJSON(),
    };
  }
}

module.exports = new TransferService();
