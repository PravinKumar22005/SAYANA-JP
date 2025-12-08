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

let currentKeyIndex = 0;

function getNextApiKey() {
  if (!apiKeys.length) return null;
  const key = apiKeys[currentKeyIndex];
  currentKeyIndex = (currentKeyIndex + 1) % apiKeys.length;
  return key;
}

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

function createModel() {
  const apiKey = getNextApiKey();
  if (!apiKey) return null;

  const genAI = new GoogleGenerativeAI(apiKey);
  const requestedModel = process.env.GEMINI_MODEL;
  const defaultModel = 'gemini-1.5-flash';
  const modelName = requestedModel || defaultModel;

  const model = genAI.getGenerativeModel({ model: modelName });

  return { model, apiKey, modelName };
}

/**
 * Helper to call Gemini with simple retry: if first key fails, try another.
 */
async function generateWithRetry(promptText) {
  if (!hasKeys) {
    throw new Error('No API keys configured');
  }

  // First attempt with one key
  let session = createModel();
  if (!session) {
    throw new Error('Failed to initialize Gemini model');
  }

  const { model, apiKey, modelName } = session;

  try {
    const result = await model.generateContent(promptText);
    const response = await result.response;
    const text = response.text();
    return text;
  } catch (err) {
    console.error(
      `[AI] Error using model "${modelName}" with key starting "${apiKey.slice(
        0,
        6
      )}***":`,
      err?.message || err
    );

    // Try one more time with a different key (if we have > 1 key)
    if (apiKeys.length > 1) {
      console.warn('[AI] Retrying with another API key...');
      const retrySession = createModel();
      if (!retrySession) {
        throw err;
      }
      try {
        const retryResult = await retrySession.model.generateContent(promptText);
        const retryResponse = await retryResult.response;
        return retryResponse.text();
      } catch (retryErr) {
        console.error(
          '[AI] Retry with another key also failed:',
          retryErr?.message || retryErr
        );
        throw retryErr;
      }
    } else {
      // Only one key – nothing else to try
      throw err;
    }
  }
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

    const text = await generateWithRetry(prompt);

    res.json({ reply: text });
  } catch (error) {
    console.error('[AI] getChatbotResponse error:', error);
    res.status(500).json({
      message: 'Failed to get chatbot response from AI'
    });
  }
};
