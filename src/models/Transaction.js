const mongoose = require('mongoose');

/**
 * Transaction Schema
 * Represents an immutable credit or debit operation on an account.
 */
const transactionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Transaction ID is required'],
      unique: true,
      index: true,
      trim: true,
    },
    account_id: {
      type: String,
      required: [true, 'Account ID is required'],
      index: true,
      trim: true,
    },
    type: {
      type: String,
      required: [true, 'Transaction type is required'],
      enum: {
        values: ['credit', 'debit'],
        message: 'Transaction type must be either credit or debit',
      },
    },
    amount: {
      type: Number,
      required: [true, 'Transaction amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    reference_id: {
      type: String,
      required: [true, 'Reference ID is required'],
      trim: true,
    },
    created_at: {
      type: Date,
      default: Date.now,
      immutable: true, // Guarantees transaction immutability
    },
  },
  {
    timestamps: false,
    versionKey: false,
    toJSON: {
      transform: function (_doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: function (_doc, ret) {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound Unique Index: reference_id must be unique per account
transactionSchema.index({ account_id: 1, reference_id: 1 }, { unique: true });

// Compound Index: Optimizes fetching transactions in latest-first order with optional type filter
transactionSchema.index({ account_id: 1, created_at: -1 });
transactionSchema.index({ account_id: 1, type: 1, created_at: -1 });

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;
