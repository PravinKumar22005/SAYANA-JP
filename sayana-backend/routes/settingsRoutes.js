const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  updateUsername,
  updatePassword,
  deleteAccount,
} = require('../controllers/settingsController');

// Update username
router.put('/username', authMiddleware, updateUsername);

// Update password
router.put('/password', authMiddleware, updatePassword);

// Delete account
router.delete('/account', authMiddleware, deleteAccount);

// Get profile
router.get('/profile', authMiddleware, require('../controllers/settingsController').getProfile);

module.exports = router;
