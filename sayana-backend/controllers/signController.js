// controllers/signController.js
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ---- KEY POOL HANDLING ----
const rawKeysEnv = process.env.GEMINI_API_KEYS || '';

console.log('[AI DEBUG(signController)] rawKeysEnv =', rawKeysEnv);
console.log(
  '[AI DEBUG(signController)] apiKeyRawString =',
  JSON.stringify(rawKeysEnv),
  'len =',
  rawKeysEnv.length
);

// Allow comma-separated multiple keys: KEY1,KEY2,KEY3,...
let GEMINI_KEYS = rawKeysEnv
  .split(',')
  .map(k => k.trim())
  .filter(Boolean);

if (!GEMINI_KEYS.length) {
  console.warn('⚠️ GEMINI_API_KEYS is not set or empty. Sign detection will fail.');
} else {
  console.log('[AI DEBUG(signController)] Loaded', GEMINI_KEYS.length, 'Gemini key(s).');
}

// Simple round-robin index
let currentKeyIndex = 0;

function getNextKey() {
  if (!GEMINI_KEYS.length) return null;
  const key = GEMINI_KEYS[currentKeyIndex % GEMINI_KEYS.length];
  currentKeyIndex = (currentKeyIndex + 1) % GEMINI_KEYS.length;
  return key;
}

// Remove a bad key (e.g., API_KEY_INVALID) from the pool
function markKeyInvalid(badKey) {
  const before = GEMINI_KEYS.length;
  GEMINI_KEYS = GEMINI_KEYS.filter(k => k !== badKey);
  if (GEMINI_KEYS.length !== before) {
    console.warn(
      `[AI DEBUG(signController)] Removed invalid Gemini key. Remaining keys: ${GEMINI_KEYS.length}`
    );
    // Reset index to avoid out-of-range
    currentKeyIndex = 0;
  }
}

// ==== simple cooldown tracker for quota errors ====
let signAiCooldownUntil = 0; // timestamp (ms)

// Small helper to safely parse JSON that might come wrapped in ```json ... ``` or with extra text
function safeParseSignJson(rawText) {
  if (!rawText) return null;

  // 1️⃣ Strip markdown code fences if present
  let cleaned = rawText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  // 2️⃣ Try direct parse
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // ignore and try fallback
  }

  // 3️⃣ Fallback: extract first {...} block
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    const jsonSubstring = cleaned.slice(start, end + 1);
    try {
      return JSON.parse(jsonSubstring);
    } catch (e) {
      // still nothing
    }
  }

  return null;
}

// POST /api/ai/sign-detect
// Body: { image: "<base64 jpeg WITHOUT data: prefix>" }
const detectSign = async (req, res) => {
  let apiKeyUsed = null;

  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({ message: 'image (base64) is required' });
    }

    // No key configured at all → clear error for frontend
    if (!GEMINI_KEYS.length) {
      return res.status(503).json({
        code: 'NO_GEMINI_KEY',
        message: 'Sign detection is offline: no Gemini API key configured on the server.',
      });
    }

    // 🔒 If we recently hit quota, short-circuit and tell frontend to stop
    const now = Date.now();
    if (now < signAiCooldownUntil) {
      const retryAfterMs = signAiCooldownUntil - now;
      return res.status(429).json({
        code: 'GEMINI_QUOTA',
        message: 'Sign detection temporarily disabled due to quota limits.',
        retryAfterMs,
      });
    }

    // 👉 Pick a key from the pool (round-robin)
    apiKeyUsed = getNextKey();
    if (!apiKeyUsed) {
      return res.status(503).json({
        code: 'NO_GEMINI_KEY',
        message: 'Sign detection is offline: no valid Gemini keys remaining.',
      });
    }

    const genAI = new GoogleGenerativeAI(apiKeyUsed);

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
    });

    const promptText = `
You are an expert sign-language interpreter.
Given this image, detect the hand sign and respond ONLY with valid JSON.
Do NOT include backticks, markdown, or any explanation. Only raw JSON:

{
  "label": "detected sign name in English, e.g. 'Hello', 'Thank you', 'A', 'B'",
  "confidence": 0.0
}

If the gesture is unclear or not a sign, respond with:
{
  "label": null,
  "confidence": 0
}
`;

    const imagePart = {
      inlineData: {
        mimeType: 'image/jpeg',
        data: image, // base64 string (no data: prefix)
      },
    };

    const result = await model.generateContent([
      { text: promptText },
      imagePart,
    ]);

    const text = result.response.text().trim();
    console.log('[AI DEBUG(signController)] raw model text =', text);

    const parsed = safeParseSignJson(text);

    if (!parsed) {
      console.error('Failed to parse model JSON even after cleaning, raw output:', text);
      // Fallback – send raw so you can debug, but keep consistent shape
      return res.status(200).json({
        label: null,
        confidence: 0,
        raw: text,
      });
    }

    // basic sanity checks
    if (typeof parsed.confidence !== 'number') {
      parsed.confidence = 0;
    }

    // Just in case label is missing, normalize it
    if (parsed.label === undefined) {
      parsed.label = null;
    }

    return res.status(200).json({
      label: parsed.label,
      confidence: parsed.confidence,
    });
  } catch (err) {
    console.error('Sign detection error:', err);

    // 🧱 Special case: Gemini quota / 429
    if (err.status === 429) {
      const retryInfo = err.errorDetails?.find(
        d => d['@type']?.includes('RetryInfo')
      );
      let retryAfterMs = 60_000;
      if (retryInfo?.retryDelay) {
        // retryDelay like "47s"
        const m = retryInfo.retryDelay.match(/(\d+)s/);
        if (m) retryAfterMs = parseInt(m[1], 10) * 1000;
      }

      signAiCooldownUntil = Date.now() + retryAfterMs;

      return res.status(429).json({
        code: 'GEMINI_QUOTA',
        message: 'Gemini sign-detect quota exceeded',
        retryAfterMs,
      });
    }

    // 🧱 Special case: invalid / bad API key
    const isInvalidKey =
      err.status === 400 &&
      Array.isArray(err.errorDetails) &&
      err.errorDetails.some(
        d =>
          d.reason === 'API_KEY_INVALID' ||
          d.message?.includes('API key not valid')
      );

    if (isInvalidKey) {
      if (apiKeyUsed) {
        markKeyInvalid(apiKeyUsed);
      }
      return res.status(503).json({
        code: 'API_KEY_INVALID',
        message:
          'Sign detection is offline for this key: invalid Gemini API key. Trying other keys on next requests.',
      });
    }

    return res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = {
  detectSign,
};
