const express = require('express');
const transferController = require('../controllers/transferController');
const { validateTransfer } = require('../validators/transferValidators');

const router = express.Router();

/**
 * @route   POST /api/v1/transfers
 * @desc    Atomically transfer money between two accounts
 * @access  Public
 */
router.post('/', validateTransfer, transferController.transferMoney);

module.exports = router;
