// controllers/aiController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * API KEY MANAGEMENT
 * ------------------
 * Supports:
 *  - GEMINI_API_KEYS = key1,key2,key3
 *  - GEMINI_API_KEY = key1,key2 (also allowed, but prefer *_KEYS)
 *  - GOOGLE_API_KEY = single key
 */

const rawKeysEnv =
  process.env.GEMINI_API_KEYS ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  '';

const apiKeys = rawKeysEnv
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

const hasKeys = apiKeys.length > 0;

if (!hasKeys) {
  console.warn(
    '[AI] No Gemini API keys configured. Set GEMINI_API_KEYS / GEMINI_API_KEY / GOOGLE_API_KEY in .env.'
  );
} else {
  console.log(
    `[AI] Loaded ${apiKeys.length} Gemini API key(s) from environment.`
  );
}

const resolveModelPriority = () => {
  const requested = (process.env.GEMINI_MODEL || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  const defaults = [
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash',
  ];
  const models = [];
  const seen = new Set();
  for (const name of [...requested, ...defaults]) {
    if (!name || seen.has(name)) continue;
    models.push(name);
    seen.add(name);
  }
  return models;
};

/**
 * Helper to call Gemini with simple retry: if first key fails, try another.
 */
async function generateWithRetry(promptText) {
  if (!hasKeys) {
    throw new Error('No API keys configured');
  }

  const models = resolveModelPriority();
  let lastError = null;

  for (const apiKey of apiKeys) {
    for (const modelName of models) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent(promptText);
        const response = await result.response;
        const text = response.text();
        if (modelName !== (process.env.GEMINI_MODEL || models[0])) {
          console.info(
            `[AI] Falling back to model "${modelName}" for prompt generation.`
          );
        }
        return text;
      } catch (err) {
        const message = err?.message || String(err);
        const status = err?.response?.status || err?.status;
        console.error(
          `[AI] Error using model "${modelName}" with key ending "${apiKey.slice(-4)}":`,
          message
        );
        lastError = err;
        const isQuota = status === 429 || /RESOURCE_EXHAUSTED/i.test(message);
        const isRateLimit = /quota/i.test(message) || /rate/i.test(message);
        // For quota/rate-limit errors, try next model or key
        if (isQuota || isRateLimit) {
          continue;
        }
        // For other errors, also try next model/key but keep lastError
      }
    }
  }

  throw lastError || new Error('Gemini generation failed for all configured keys/models');
}

/**
 * GET /api/ai/news
 * Returns AI-generated news summary, or a dev fallback if keys are missing.
 */
exports.getNews = async (req, res) => {
  if (!hasKeys) {
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
    if (!hasKeys) {
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
