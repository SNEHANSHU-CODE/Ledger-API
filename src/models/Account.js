const mongoose = require('mongoose');

/**
 * Account Schema
 * Represents an account entity in the ledger system.
 */
const accountSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, 'Account ID is required'],
      unique: true,
      index: true,
      trim: true,
    },
    name: {
      type: String,
      required: [true, 'Account holder name is required'],
      trim: true,
    },
    balance: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Account balance cannot be negative'],
    },
    created_at: {
      type: Date,
      default: Date.now,
      immutable: true, // Prevents modifications after initial creation
    },
  },
  {
    timestamps: false, // We use created_at explicitly as per the requirement
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

const Account = mongoose.model('Account', accountSchema);

module.exports = Account;
