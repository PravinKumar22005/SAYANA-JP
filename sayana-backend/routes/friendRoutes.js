const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  searchUsers,
  sendFriendRequest,
  getFriendRequests,
  acceptFriendRequest,
  rejectFriendRequest,
  getFriends,
  getSentFriendRequests,
} = require('../controllers/friendController');

// Search for users
router.get('/users/search', authMiddleware, searchUsers);

// Friend requests
const { body, query } = require('express-validator');
const validateRequest = require('../middleware/validateRequest');
router.post('/send-request', authMiddleware, [ body('to').isMongoId().withMessage('Valid user id required') ], validateRequest, sendFriendRequest);
router.get('/requests', authMiddleware, getFriendRequests);
router.get('/requests/sent', authMiddleware, getSentFriendRequests);
router.post('/accept-request', authMiddleware, [ body('requestId').isMongoId().withMessage('Valid request id required') ], validateRequest, acceptFriendRequest);
router.post('/reject-request', authMiddleware, [ body('requestId').isMongoId().withMessage('Valid request id required') ], validateRequest, rejectFriendRequest);

// Get friends list
router.get('/list', authMiddleware, getFriends);

module.exports = router;
