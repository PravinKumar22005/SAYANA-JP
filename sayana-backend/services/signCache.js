const DEFAULT_TTL_MS = Number(process.env.SIGN_TRANSLATE_CACHE_TTL_MS || 10 * 60 * 1000);
const cache = new Map();

function buildCacheKey(text = '', tokens = [], locale = 'en') {
  const normalizedText = (text || '').trim().toUpperCase();
  const normalizedTokens = Array.isArray(tokens)
    ? tokens.map((token) => (token || '').toUpperCase()).filter(Boolean).sort()
    : [];
  return [locale || 'en', normalizedText, normalizedTokens.join('|')].join('::');
}

function getCachedTranslation(key) {
  if (!key) return null;
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.expires <= Date.now()) {
    cache.delete(key);
    return null;
  }
  return entry.payload;
}

function storeCachedTranslation(key, payload, ttlOverride) {
  if (!key || !payload) return;
  const ttl = Number.isFinite(ttlOverride) ? ttlOverride : DEFAULT_TTL_MS;
  cache.set(key, { payload, expires: Date.now() + Math.max(ttl, 1000) });
}

function clearCache() {
  cache.clear();
}

module.exports = {
  buildCacheKey,
  getCachedTranslation,
  storeCachedTranslation,
  clearCache,
};
