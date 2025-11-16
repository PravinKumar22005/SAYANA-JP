const express = require('express');
const router = express.Router();
const { queryAgent, queryAgentPublic, debugGeminiTest, debugListModels } = require('../controllers/agentController');
const { protect } = require('../middleware/authMiddleware');

// Public: brief assistance for unauthenticated users
router.post('/query/public', queryAgentPublic);

// Debugging routes
router.get('/debug/gemini-test', debugGeminiTest);
router.get('/debug/list-models', debugListModels);

// Protected: requires JWT
router.post('/query', protect, queryAgent);

module.exports = router;
