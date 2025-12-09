// routes/aiRoutes.js
const express = require('express');
const router = express.Router();

const authMiddleware = require('../middleware/authMiddleware');
const { getNews, getChatbotResponse } = require('../controllers/aiController');
const { detectSign } = require('../controllers/signController');

// News (requires auth)
router.get('/news', authMiddleware, getNews);

// Chatbot (requires auth)
router.post('/chatbot', authMiddleware, getChatbotResponse);

// Sign language detection (you can decide if it needs auth or not)
router.post('/sign-detect', detectSign);
// or: router.post('/sign-detect', authMiddleware, detectSign);

module.exports = router;
