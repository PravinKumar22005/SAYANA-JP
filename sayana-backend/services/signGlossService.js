const { generateChatCompletion, hasHuggingFaceKey } = require('./huggingfaceClient');

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'have', 'how',
  'i', 'in', 'is', 'it', 'my', 'of', 'on', 'or', 'that', 'the', 'to', 'was', 'were', 'what',
  'when', 'where', 'who', 'will', 'with', 'you', 'your'
]);

const DEFAULT_LOCALE = 'en';

function normalizeToken(token) {
  if (!token) return null;
  const cleaned = token
    .toString()
    .normalize('NFKD')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .trim()
    .replace(/\s+/g, ' ')
    .toUpperCase();
  return cleaned || null;
}

function heuristicGloss(text = '') {
  const sanitized = text.replace(/[^a-z0-9\s]/gi, ' ');
  const rawTokens = sanitized
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  const filtered = rawTokens.filter((token) => !STOP_WORDS.has(token.toLowerCase()));
  const base = filtered.length >= 2 ? filtered : rawTokens;

  return base.map((token) => token.toUpperCase());
}

function parseResponseToTokens(rawText) {
  if (!rawText) return [];
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.tokens)) {
        return parsed.tokens.map(normalizeToken).filter(Boolean);
      }
    }
  } catch (error) {
    // fallthrough to text parsing
  }

  return rawText
    .split(/[,\n]/)
    .map((part) => normalizeToken(part))
    .filter(Boolean);
}

async function callHuggingFaceGloss(text, locale) {
  if (!hasHuggingFaceKey) {
    return { tokens: [], strategy: 'heuristic', warnings: ['Hugging Face key not configured'] };
  }

  const messages = [
    {
      role: 'system',
      content:
        'You convert spoken sentences into SIGN-LANGUAGE GLOSS TOKENS. Respond as JSON: {"tokens":["HELLO","FRIEND"]}. Tokens should be uppercase, concise, no punctuation. Prefer ASL/ISL friendly glosses.',
    },
    {
      role: 'user',
      content: `Locale: ${locale || DEFAULT_LOCALE}. Input: ${text}`,
    },
  ];

  const { text: hfText } = await generateChatCompletion(messages, {
    temperature: 0.2,
    maxNewTokens: 120,
    model: process.env.HF_SIGN_GLOSS_MODEL || process.env.HF_CHAT_MODEL,
  });

  const tokens = parseResponseToTokens(hfText);
  return { tokens, strategy: 'huggingface', warnings: [] };
}

async function buildGlossSequence(text, tokensFromClient = null, options = {}) {
  const locale = options.locale || DEFAULT_LOCALE;
  const warnings = [];

  if (Array.isArray(tokensFromClient) && tokensFromClient.length) {
    const normalized = tokensFromClient.map(normalizeToken).filter(Boolean);
    return { tokens: normalized, strategy: 'client', warnings };
  }

  const normalizedText = (text || '').trim();
  if (!normalizedText) {
    return { tokens: [], strategy: 'heuristic', warnings: ['Empty text input'] };
  }

  // Try Hugging Face first for better accuracy
  if (hasHuggingFaceKey) {
    try {
      const hf = await callHuggingFaceGloss(normalizedText, locale);
      if (hf.tokens.length) {
        return hf;
      }
      warnings.push('Hugging Face gloss model returned no tokens, falling back to heuristics');
    } catch (error) {
      warnings.push(`Hugging Face gloss model error: ${error.message}`);
    }
  }

  const heuristic = heuristicGloss(normalizedText);
  return {
    tokens: heuristic,
    strategy: 'heuristic',
    warnings,
  };
}

module.exports = {
  buildGlossSequence,
};
