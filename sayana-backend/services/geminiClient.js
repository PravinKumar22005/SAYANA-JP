// services/geminiClient.js
// Shared Gemini helper used by AI endpoints and sign sentence rewriting.

const { GoogleGenerativeAI } = require('@google/generative-ai');

const rawKeysEnv =
  process.env.GEMINI_API_KEYS ||
  process.env.GEMINI_API_KEY ||
  process.env.GOOGLE_API_KEY ||
  '';

const apiKeys = rawKeysEnv
  .split(',')
  .map(key => key.trim())
  .filter(Boolean);

const hasGeminiKeys = apiKeys.length > 0;

if (!hasGeminiKeys) {
  console.warn('[Gemini] No API keys configured. Add GEMINI_API_KEYS / GEMINI_API_KEY / GOOGLE_API_KEY in the backend env.');
} else {
  console.log(`[Gemini] Loaded ${apiKeys.length} API key(s) for Google Generative AI.`);
}

function resolveModelPriority(customDefaults = []) {
  const requested = (process.env.GEMINI_MODEL || '')
    .split(',')
    .map(v => v.trim())
    .filter(Boolean);
  const defaults = customDefaults.concat([
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-1.5-flash',
  ]);

  const models = [];
  const seen = new Set();
  for (const name of [...requested, ...defaults]) {
    if (!name || seen.has(name)) continue;
    models.push(name);
    seen.add(name);
  }
  return models;
}

async function generateWithRetry(promptText, options = {}) {
  if (!hasGeminiKeys) {
    throw new Error('No Gemini API keys configured');
  }

  const {
    preferredModels,
    systemInstruction,
    logFallback = false,
  } = options;

  const models = Array.isArray(preferredModels) && preferredModels.length
    ? preferredModels
    : resolveModelPriority();

  let lastError = null;

  for (const apiKey of apiKeys) {
    for (const modelName of models) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelConfig = { model: modelName };
        if (systemInstruction) {
          modelConfig.systemInstruction = systemInstruction;
        }

        const model = genAI.getGenerativeModel(modelConfig);
        const result = await model.generateContent(promptText);
        const response = await result.response;
        const text = response.text();

        if (logFallback && modelName !== models[0]) {
          console.info(`[Gemini] Falling back to model "${modelName}" for current prompt.`);
        }

        return text;
      } catch (err) {
        const message = err?.message || String(err);
        const status = err?.response?.status || err?.status;
        console.error(
          `[Gemini] Error using model "${modelName}" with key ending "${apiKey.slice(-4)}":`,
          message
        );
        lastError = err;
        const isQuota = status === 429 || /RESOURCE_EXHAUSTED/i.test(message);
        const isRate = /quota/i.test(message) || /rate/i.test(message);
        if (isQuota || isRate) {
          continue;
        }
      }
    }
  }

  throw lastError || new Error('Gemini generation failed for all configured keys/models');
}

module.exports = {
  hasGeminiKeys,
  generateWithRetry,
  resolveModelPriority,
};
