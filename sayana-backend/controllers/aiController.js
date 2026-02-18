// controllers/aiController.js
const { hasGeminiKeys, generateWithRetry } = require('../services/geminiClient');
const {
  hasHuggingFaceKey,
  generateChatCompletion
} = require('../services/huggingfaceClient');
const { buildNewsDigest } = require('../services/newsAgentService');

/**
 * GET /api/ai/news
 * Returns AI-generated news summary, or a dev fallback if keys are missing.
 */
exports.getNews = async (req, res) => {
  try {
    const digest = await buildNewsDigest();
    res.json(digest);
  } catch (error) {
    console.error('[AI] getNews error:', error);
    res.json({
      summary: 'News feed is temporarily unavailable. Please try refreshing shortly.',
      items: [],
      model: null,
      generatedAt: new Date().toISOString()
    });
  }
};

/**
 * POST /api/ai/chatbot
 * Body: { message: string }
 * Returns: { reply: string }
 */
exports.getChatbotResponse = async (req, res) => {
  try {
    const { message } = req.body || {};

    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required.' });
    }

    let replyText = null;
    let provider = null;

    if (hasHuggingFaceKey) {
      try {
        const systemPrompt = `
You are "Sayana Bot", the assistant inside SAYANA – a communication hub for deaf and mute users.
Keep responses compact (3–6 short lines), vary your greetings, and whenever you explain a sign, describe it using Indian Sign Language cues (handshape, location, motion, and facial expression).
Offer one actionable tip or follow-up question when it helps the user move forward.
        `.trim();

        const { text, model } = await generateChatCompletion([
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message.trim() }
        ], {
          temperature: 0.35,
          maxNewTokens: 360
        });

        replyText = text;
        provider = model;
      } catch (hfError) {
        console.warn('[AI] Hugging Face chatbot call failed, falling back to Gemini:', hfError.message);
      }
    }

    if (!replyText && hasGeminiKeys) {
      const enhancedPrompt = `
You are "Sayana Bot", the assistant of SAYANA – an app that helps deaf and mute users communicate better (sign language detection, messaging, etc.).

User said:
"${message}"

Guidelines for the reply:
- Be friendly and simple in tone.
- Vary your phrasing across responses; avoid repeating the same template or opener.
- Answer concisely (roughly 3–6 short lines), but when teaching, include one brief actionable step or a micro-exercise.
- When describing or teaching signs, always use Indian Sign Language (ISL) conventions — give clear, step-by-step ISL instructions (handshape, movement, location) and note any cultural tips.
- Ask one short follow-up question when it helps clarify the user's intent (for example: "Do you want a written description or a short video example?").
- If the user asks about the app, briefly state core features and offer one actionable next-step (e.g., "Try the Sign Language mode in the app's Learn tab").
- Do not always start with the exact same greeting; use varied openings.

Reply now following these guidelines (use ISL for any sign examples):
"""
      `.trim();

      replyText = await generateWithRetry(enhancedPrompt);
      provider = 'gemini';
    }

    if (!replyText) {
      replyText = `Dev mode reply (no AI provider configured).\n\nYou said: "${message}"`;
    }

    res.json({ reply: replyText, provider });
  } catch (error) {
    console.error('[AI] getChatbotResponse error:', error);
    res.status(500).json({
      message: 'Failed to get chatbot response from AI'
    });
  }
};
