const { v4: uuidv4 } = require('uuid');

/**
 * Generates unique identifiers with semantic domain prefixes.
 */
const idGenerator = {
  /**
   * Generates a unique account identifier (e.g., acc_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d)
   * @returns {string}
   */
  generateAccountId: () => `acc_${uuidv4()}`,

  /**
   * Generates a unique transaction identifier (e.g., txn_7c9e6679-7425-40de-944b-e07fc1f90ae7)
   * @returns {string}
   */
  generateTransactionId: () => `txn_${uuidv4()}`,

  /**
   * Generates a unique money transfer identifier (e.g., txf_c19a9f24-9b51-4d37-88d4-5beae5de2971)
   * @returns {string}
   */
  generateTransferId: () => `txf_${uuidv4()}`,
};

module.exports = idGenerator;
