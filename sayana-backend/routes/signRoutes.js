const express = require('express');
const { body } = require('express-validator');
const { translateText, transcribeAudio } = require('../controllers/signTranslateController');
const validateRequest = require('../middleware/validateRequest');

const router = express.Router();

router.post(
  '/translate',
  [
    body('text').optional().isString().trim().isLength({ min: 1 }).withMessage('text must be a string'),
    body('tokens').optional().isArray({ min: 1 }).withMessage('tokens must be a non-empty array'),
    body('locale').optional().isString().isLength({ min: 2, max: 10 }),
  ],
  (req, res, next) => {
    const hasText = typeof req.body?.text === 'string' && req.body.text.trim().length > 0;
    const hasTokens = Array.isArray(req.body?.tokens) && req.body.tokens.length > 0;
    if (!hasText && !hasTokens) {
      return res.status(400).json({ message: 'Provide text or gloss tokens to translate.' });
    }
    return next();
  },
  validateRequest,
  translateText,
);

router.post(
  '/transcribe',
  [
    body('audioBase64').optional().isString().withMessage('audioBase64 must be a base64 string'),
    body('transcript').optional().isString(),
    body('locale').optional().isString().isLength({ min: 2, max: 10 }),
  ],
  (req, res, next) => {
    if (!req.body?.transcript && !req.body?.audioBase64) {
      return res.status(400).json({ message: 'Provide transcript text or audioBase64.' });
    }
    return next();
  },
  validateRequest,
  transcribeAudio,
);

module.exports = router;
