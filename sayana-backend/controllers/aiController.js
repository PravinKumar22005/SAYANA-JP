// controllers/aiController.js
const { hasGeminiKeys, generateWithRetry } = require('../services/geminiClient');

/**
 * GET /api/ai/news
 * Returns AI-generated news summary, or a dev fallback if keys are missing.
 */
exports.getNews = async (req, res) => {
  if (!hasGeminiKeys) {
    // Dev-mode fallback so UI still works
    return res.json({
      news:
        `1. Dev mode: Gemini API keys are not configured on backend.\n` +
        `2. Add GEMINI_API_KEYS or GOOGLE_API_KEY in sayana-backend/.env.\n` +
        `3. This is a mock news response so your UI keeps working.`
    });
  }

  try {
    const prompt = `
You are an assistant summarizing news for a sign-language communication app called SAYANA.

Provide the TOP 5 latest headlines in technology and world events.
Format them as a numbered list like:

1. Headline one - short description
2. Headline two - short description
3. ...

Keep it concise, neutral, and easy to read.
    `.trim();

    const text = await generateWithRetry(prompt);
    res.json({ news: text });
  } catch (error) {
    console.error('[AI] getNews error:', error);
    res.status(500).json({ message: 'Failed to fetch news from AI' });
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

    // If no keys, dev fallback: echo behavior so frontend doesn't break
    if (!hasGeminiKeys) {
      return res.json({
        reply:
          `Dev mode reply (no Gemini API keys configured on backend).\n\n` +
          `You said: "${message}"`
      });
    }

    const prompt = `
You are "Sayana Bot", the assistant of SAYANA – an app that helps deaf and mute users communicate better (sign language detection, messaging, etc.).

User said:
"${message}"

Your task:
- Reply in a friendly, simple tone.
- Answer in 3–6 lines maximum.
- If they ask about the app itself, briefly explain that SAYANA supports sign-language based communication, chats, and an AI helper.
- Avoid very long paragraphs.
    `.trim();

    // Improved prompt guidance: encourage varied phrasing, short follow-ups, and actionable suggestions
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

    const text = await generateWithRetry(enhancedPrompt);

    res.json({ reply: text });
  } catch (error) {
    console.error('[AI] getChatbotResponse error:', error);
    res.status(500).json({
      message: 'Failed to get chatbot response from AI'
    });
  }
};
