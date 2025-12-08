const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  sendMessage,
  getMessages,
} = require('../controllers/messageController');
const { body, param } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');

router.post('/send', authMiddleware, [ body('to').isMongoId().withMessage('Recipient id required'), body('message').isLength({ min: 1 }).withMessage('Message required') ], validateRequest, sendMessage);
router.get('/:friendId', authMiddleware, [ param('friendId').isMongoId().withMessage('friendId must be a valid id') ], validateRequest, getMessages);

module.exports = router;
