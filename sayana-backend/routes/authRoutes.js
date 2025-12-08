const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getProfile } = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validateRequest = require('../middleware/validateRequest');
const { body } = require('express-validator');

router.post('/register', [
	body('name').isString().isLength({ min: 2 }).withMessage('Name required'),
	body('email').isEmail().withMessage('Valid email required'),
	body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')
], validateRequest, registerUser);

router.post('/login', [
	body('email').isEmail().withMessage('Valid email required'),
	body('password').exists().withMessage('Password required')
], validateRequest, loginUser);

router.get('/profile', authMiddleware, getProfile);

module.exports = router;
