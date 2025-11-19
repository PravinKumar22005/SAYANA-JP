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
} = require('../controllers/friendController');

// Search for users
router.get('/users/search', authMiddleware, searchUsers);

// Friend requests
router.post('/send-request', authMiddleware, sendFriendRequest);
router.get('/requests', authMiddleware, getFriendRequests);
router.post('/reject-request', authMiddleware, rejectFriendRequest);

// Get friends list
router.get('/list', authMiddleware, getFriends);

module.exports = router;
