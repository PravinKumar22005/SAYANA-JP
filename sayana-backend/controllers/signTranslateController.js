const { buildGlossSequence } = require('../services/signGlossService');
const { resolveAssetSequence } = require('../services/signAssetService');
const {
  buildCacheKey,
  getCachedTranslation,
  storeCachedTranslation,
} = require('../services/signCache');
const { isReady, transcribeAudioBase64 } = require('../services/speechTranscriber');

const DEFAULT_LOCALE = 'en';

function buildResponsePayload(inputMeta, glossResult, assetResult) {
  return {
    input: inputMeta,
    gloss: glossResult.tokens,
    strategy: glossResult.strategy,
    warnings: glossResult.warnings,
    sequence: assetResult.items,
    providers: assetResult.providers,
    coverage: assetResult.coverage,
    generatedAt: new Date().toISOString(),
  };
}

exports.translateText = async (req, res) => {
  try {
    const { text, tokens, locale = DEFAULT_LOCALE, source = 'text' } = req.body || {};

    if (!text && (!Array.isArray(tokens) || !tokens.length)) {
      return res.status(400).json({ message: 'Provide text or an array of gloss tokens.' });
    }

    const normalizedText = typeof text === 'string' ? text.trim() : '';
    const cacheKey = buildCacheKey(normalizedText, tokens, locale);
    const cached = getCachedTranslation(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const glossResult = await buildGlossSequence(normalizedText, tokens, { locale });
    if (!glossResult.tokens.length) {
      return res.status(422).json({ message: 'Unable to derive gloss tokens from input.' });
    }

    const assetResult = resolveAssetSequence(glossResult.tokens, { locale });
    const payload = buildResponsePayload(
      { text: normalizedText, locale, source },
      glossResult,
      assetResult
    );

    storeCachedTranslation(cacheKey, payload);
    return res.json(payload);
  } catch (error) {
    console.error('[signTranslateController] translateText error:', error);
    return res.status(500).json({ message: 'Failed to build sign translation.', detail: error.message });
  }
};

exports.transcribeAudio = async (req, res) => {
  try {
    const { audioBase64, mimeType, transcript, locale = DEFAULT_LOCALE } = req.body || {};

    if (transcript && transcript.trim()) {
      return res.json({
        text: transcript.trim(),
        engine: 'client',
        locale,
      });
    }

    if (!audioBase64) {
      return res.status(400).json({ message: 'audioBase64 payload is required when transcript is missing.' });
    }

    if (!isReady()) {
      return res.status(503).json({
        message: 'Offline speech model not configured. Provide transcript text instead or configure Vosk.',
      });
    }

    const result = await transcribeAudioBase64(audioBase64, mimeType);
    if (!result?.text) {
      return res.status(422).json({ message: 'Speech processed but no transcript returned.' });
    }

    return res.json({ ...result, locale });
  } catch (error) {
    console.error('[signTranslateController] transcribeAudio error:', error);
    return res.status(500).json({ message: 'Failed to transcribe audio.', detail: error.message });
  }
};
