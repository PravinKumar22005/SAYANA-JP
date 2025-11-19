const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getNews, getChatbotResponse } = require('../controllers/aiController');

// Get news
router.get('/news', authMiddleware, getNews);

// Get chatbot response
router.post('/chatbot', authMiddleware, getChatbotResponse);

module.exports = router;
