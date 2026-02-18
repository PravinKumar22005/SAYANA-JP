const fs = require('fs');
const path = require('path');

const LIBRARY_PATH = path.join(__dirname, '..', 'data', 'signAssetLibrary.json');
let assetLibrary = [];
let assetIndex = new Map();

function loadLibrary() {
  try {
    const raw = fs.readFileSync(LIBRARY_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    assetLibrary = Array.isArray(parsed) ? parsed : [];
    assetIndex = new Map();
    assetLibrary.forEach((entry) => {
      if (!entry?.token) return;
      const key = entry.token.toUpperCase();
      assetIndex.set(key, entry);
      if (Array.isArray(entry.synonyms)) {
        entry.synonyms.forEach((syn) => {
          if (syn) {
            assetIndex.set(syn.toUpperCase(), entry);
          }
        });
      }
    });
  } catch (error) {
    console.warn('[signAssetService] Failed to load library:', error.message);
    assetLibrary = [];
    assetIndex = new Map();
  }
}

loadLibrary();

function formatToken(token) {
  const lower = token.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function buildFingerspellFallback(token) {
  const letters = (token || '').replace(/[^A-Z]/gi, '').toUpperCase().split('');
  if (!letters.length) return null;
  return {
    type: 'fingerspell',
    letters,
    description: 'Fallback finger-spelling card generated locally.',
  };
}

function resolveEntry(token) {
  if (!token) return null;
  return assetIndex.get(token.toUpperCase()) || null;
}

function resolveAssetSequence(tokens = [], options = {}) {
  const locale = (options.locale || 'en').toLowerCase();
  const items = [];
  let matched = 0;
  const providers = new Set();

  tokens.forEach((token) => {
    const entry = resolveEntry(token);
    const media = (entry?.media || []).filter((item) => {
      if (!Array.isArray(entry?.locales) || !entry.locales.length) return true;
      return entry.locales.includes(locale) || entry.locales.includes(locale.split('-')[0]);
    });

    if (media.length) {
      matched += 1;
      media.forEach((asset) => asset?.provider && providers.add(asset.provider));
    }

    items.push({
      token,
      display: entry?.display || formatToken(token),
      media,
      fallback: media.length ? null : buildFingerspellFallback(token),
      notes: entry?.notes || null,
      locale,
    });
  });

  const coverage = {
    matched,
    total: tokens.length,
    ratio: tokens.length ? Number((matched / tokens.length).toFixed(2)) : 0,
  };

  return {
    items,
    coverage,
    providers: Array.from(providers),
  };
}

module.exports = {
  resolveAssetSequence,
  reloadLibrary: loadLibrary,
};
