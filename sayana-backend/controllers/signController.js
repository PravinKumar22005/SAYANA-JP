// controllers/signController.js
// Holistic video pipeline with open-vocabulary gesture tokens + Gemini sentence rewrites.

const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');

const { hasGeminiKeys, generateWithRetry } = require('../services/geminiClient');

const PREDICTION_WINDOW = 7;
const MOTION_WINDOW = 5;
const MIN_CONSISTENT_COUNT = 3;
const MIN_STABLE_CONFIDENCE = 0.7;
const MIN_BUCKET_CONFIDENCE = 0.4;
const TOKEN_REUSE_COOLDOWN_MS = 1500;
const MAX_LEVENSHTEIN_FOR_MATCH = 1;

const HF_MODEL_IDS = (process.env.HF_SIGN_MODEL_ID || 'microsoft/Phi-3.5-vision-instruct,Qwen/Qwen2.5-VL-7B-Instruct')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);

const HOLISTIC_SCRIPT_PATH = path.join(__dirname, '..', 'python', 'holistic_bridge.py');
const HOLISTIC_TIMEOUT_MS = Number(process.env.HOLISTIC_TIMEOUT_MS || 15000);
const PYTHON_BIN = process.env.SIGN_PYTHON_BIN || process.env.PYTHON_BIN || 'python';

const SENTENCE_GAP_MS = Number(process.env.SENTENCE_GAP_MS || 2500);
const SENTENCE_MAX_TOKENS = Number(process.env.SENTENCE_MAX_TOKENS || 12);
const SENTENCE_HISTORY_LIMIT = 5;
const GEMINI_SENTENCE_MODEL = process.env.GEMINI_SENTENCE_MODEL || process.env.GEMINI_SIGN_MODEL || '';

const UNKNOWN_LABELS = new Set(['', 'unknown', 'none', 'null', 'n/a', 'no sign detected']);
const LABEL_SYNONYMS = {
  hi: 'hello',
  'hi there': 'hello',
  hello: 'hello',
  greetings: 'hello',
  thanks: 'thank you',
  'thankyou': 'thank you',
  'thank you': 'thank you',
  'thank-you': 'thank you',
  sorry: 'sorry',
  apology: 'sorry',
  please: 'please',
  attention: 'attention',
  look: 'attention',
  'look here': 'attention',
  'look at me': 'attention',
};

const motionHistory = [];
const predictionHistory = [];
let lastStableToken = null;
let lastStableTimestamp = 0;

const sentenceState = {
  tokens: [],
  lastTokenAt: 0,
  lastSentence: '',
  history: [],
  dirty: false,
  rewriteInFlight: null,
};

// ----------------- ROUTE -----------------

const detectSign = async (req, res) => {
  try {
    const { image, debugLandmarks, debugToken } = req.body || {};

    if (!image) {
      return res.status(400).json({ message: 'image (base64) is required' });
    }

    const imageBuffer = Buffer.from(image, 'base64');

    const landmarks = await extractHolisticLandmarks(imageBuffer, debugLandmarks);
    if (!landmarks || (!hasHandLandmarks(landmarks.leftHand) && !hasHandLandmarks(landmarks.rightHand))) {
      resetMotionState();
      const empty = await prepareResponse({ stableToken: null, confidence: 0 });
      return res.status(200).json(empty);
    }

    const featureSummary = computeRelativeFeatures(landmarks);
    if (!featureSummary) {
      resetMotionState();
      const empty = await prepareResponse({ stableToken: null, confidence: 0 });
      return res.status(200).json(empty);
    }

    const motionState = updateMotionHistory(featureSummary);

    const classification = await classifyGestureToken({
      featureSummary,
      motionState,
      imageBuffer,
      debugToken,
    });

    recordPrediction({ ...classification, motionState, timestamp: Date.now() });

    const stable = evaluateStableToken();
    const response = await prepareResponse({
      ...stable,
      latestLabel: classification.label,
      latestConfidence: classification.confidence,
      latestRaw: classification.raw,
      motionState,
    });
    return res.status(200).json(response);
  } catch (err) {
    console.error('signController error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// ----------------- HOLISTIC BRIDGE -----------------

async function extractHolisticLandmarks(imageBuffer, override) {
  if (override) return override;
  if (!imageBuffer?.length) return null;

  try {
    const base64 = imageBuffer.toString('base64');
    return await runHolisticBridge(base64);
  } catch (err) {
    console.error('Holistic extractor error:', err.message || err);
    return null;
  }
}

function runHolisticBridge(imageBase64) {
  return new Promise((resolve, reject) => {
    const child = spawn(PYTHON_BIN, [HOLISTIC_SCRIPT_PATH], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Holistic extractor timed out'));
    }, HOLISTIC_TIMEOUT_MS);

    child.stdout.on('data', (chunk) => (stdout += chunk.toString()));
    child.stderr.on('data', (chunk) => (stderr += chunk.toString()));

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr || `Holistic exited ${code}`));
      try {
        resolve(JSON.parse(stdout || '{}'));
      } catch (e) {
        reject(new Error(`Failed to parse holistic output: ${e.message}`));
      }
    });

    child.stdin.write(JSON.stringify({ image_base64: imageBase64 }));
    child.stdin.end();
  });
}

// ----------------- FEATURE EXTRACTION -----------------

function hasHandLandmarks(hand) {
  return Array.isArray(hand) && hand.length > 0;
}

function computeRelativeFeatures(landmarks) {
  const left = summarizeHand(landmarks.leftHand);
  const right = summarizeHand(landmarks.rightHand);
  if (!left && !right) return null;

  const poseSummary = summarizePose(landmarks.pose);
  const faceSummary = summarizeFace(landmarks.face);

  const chestAnchor = poseSummary?.chestCenter || poseSummary?.shoulderCenter;
  const noseAnchor = faceSummary?.nose;
  const mouthAnchor = faceSummary?.mouth;
  const chinAnchor = faceSummary?.chin;

  const relative = {
    leftToChest: chestAnchor && left ? subtract(left.center, chestAnchor) : null,
    rightToChest: chestAnchor && right ? subtract(right.center, chestAnchor) : null,
    leftToMouth: mouthAnchor && left ? subtract(left.center, mouthAnchor) : null,
    rightToMouth: mouthAnchor && right ? subtract(right.center, mouthAnchor) : null,
    leftToChin: chinAnchor && left ? subtract(left.center, chinAnchor) : null,
    rightToChin: chinAnchor && right ? subtract(right.center, chinAnchor) : null,
    leftToNose: noseAnchor && left ? subtract(left.center, noseAnchor) : null,
    rightToNose: noseAnchor && right ? subtract(right.center, noseAnchor) : null,
  };

  const handDistance = left && right ? distance(left.center, right.center) : null;
  const orientation = computeRelativeOrientation(landmarks.leftHand, landmarks.rightHand);

  return { left, right, pose: poseSummary, face: faceSummary, relative, handDistance, orientation };
}

function summarizeHand(handLandmarks) {
  if (!hasHandLandmarks(handLandmarks)) return null;

  const center = averagePoint(handLandmarks);
  const spread = averageDistanceFromCenter(handLandmarks, center);
  const direction = computeHandDirection(handLandmarks);

  const fingerTipIds = [4, 8, 12, 16, 20];
  const openness = average(
    fingerTipIds
      .map((i) => handLandmarks[i])
      .filter(Boolean)
      .map((p) => distance(p, center))
  );

  return { center, spread, direction, openness };
}

function summarizePose(poseLandmarks = {}) {
  const leftShoulder = poseLandmarks.leftShoulder;
  const rightShoulder = poseLandmarks.rightShoulder;
  const chest = poseLandmarks.chest || averagePoint([leftShoulder, rightShoulder].filter(Boolean));
  const shoulderCenter = averagePoint([leftShoulder, rightShoulder].filter(Boolean));

  return { leftShoulder, rightShoulder, chestCenter: chest, shoulderCenter };
}

function summarizeFace(faceLandmarks = {}) {
  return { mouth: faceLandmarks.mouth, chin: faceLandmarks.chin, nose: faceLandmarks.nose, forehead: faceLandmarks.forehead };
}

function computeRelativeOrientation(leftHand, rightHand) {
  if (!hasHandLandmarks(leftHand) || !hasHandLandmarks(rightHand)) return null;

  const leftDir = computeHandDirection(leftHand);
  const rightDir = computeHandDirection(rightHand);
  const centerLeft = averagePoint(leftHand);
  const centerRight = averagePoint(rightHand);

  const delta = subtract(centerRight, centerLeft);
  const dotProduct = leftDir && rightDir ? dot(leftDir, rightDir) : 0;
  const parallelScore = (dotProduct + 1) / 2;
  const mirroredScore = 1 - parallelScore;

  return {
    horizontalOrder: delta.x === 0 ? 'aligned' : delta.x > 0 ? 'left_to_right' : 'right_to_left',
    verticalOrder: delta.y === 0 ? 'level' : delta.y > 0 ? 'left_above_right' : 'right_above_left',
    distance: magnitude(delta),
    parallelScore,
    mirroredScore,
  };
}

function computeHandDirection(handLandmarks) {
  if (!hasHandLandmarks(handLandmarks) || handLandmarks.length < 13) return null;
  const wrist = handLandmarks[0];
  const middleFingerTip = handLandmarks[12];
  return normalize(subtract(middleFingerTip, wrist));
}

// ----------------- CLASSIFIER -----------------

async function classifyGestureToken({ featureSummary, motionState, imageBuffer, debugToken }) {
  if (typeof debugToken === 'string' && debugToken.trim().length) {
    return { label: debugToken.trim(), confidence: 1 };
  }

  const result = await runVisionGestureModel({ featureSummary, imageBuffer });
  let label = normalizeGloss(result.label) || null;
  let confidence = clamp01(Number(result.confidence || 0));
  let raw = result.raw || null;

  if (!label && result.rawText) {
    label = sniffLabelFromText(result.rawText) || null;
    if (label && (!confidence || confidence < 0.2)) {
      confidence = sniffConfidenceFromText(result.rawText);
    }
  }

  if (!label) {
    const heuristic = fallbackHeuristicClassification(featureSummary, motionState);
    if (heuristic?.label) {
      label = heuristic.label;
      confidence = Math.max(confidence, heuristic.confidence || 0.35);
      raw = raw || { heuristic };
    }
  }

  return { label, confidence, raw };
}

async function runVisionGestureModel({ featureSummary, imageBuffer }) {
  const apiKey = process.env.HF_API_KEY;
  if (!apiKey) throw new Error('HF_API_KEY is not set.');
  if (!imageBuffer?.length) return { label: null, confidence: 0, raw: null, rawText: null };

  const base64 = imageBuffer.toString('base64');
  const prompt = buildClassifierPrompt(featureSummary);

  const basePayload = {
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt + '\nRespond strictly with JSON: { "label": "<short gloss>", "confidence": 0-1 }' },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
        ],
      },
    ],
    max_tokens: 160,
    temperature: 0.2,
  };

  const url = 'https://router.huggingface.co/v1/chat/completions';

  let lastError = null;

  for (const modelId of HF_MODEL_IDS) {
    try {
      const response = await axios.post(url, { ...basePayload, model: modelId }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' } });
      return parseHuggingFaceResponse(response.data);
    } catch (err) {
      const details = err.response?.data || err.message;
      if (isModelUnsupported(err)) {
        console.warn(`HF vision model unsupported (${modelId}). Trying next...`);
        lastError = details;
        continue;
      }
      console.error(`HF vision model error (${modelId}):`, details);
      return { label: null, confidence: 0, raw: { error: details }, rawText: null };
    }
  }

  return { label: null, confidence: 0, raw: lastError ? { error: lastError } : null, rawText: null };
}

function parseHuggingFaceResponse(payload) {
  const text = extractTextFromPayload(payload);
  try {
    const jsonSnippet = extractJsonSnippet(text);
    if (jsonSnippet) {
      const parsed = JSON.parse(jsonSnippet);
      const label = normalizeGloss(parsed.label);
      if (label) {
        return {
          label,
          confidence: clamp01(Number(parsed.confidence)),
          raw: payload,
          rawText: text,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse HF response:', err.message);
  }

  const sniffedLabel = sniffLabelFromText(text);
  if (sniffedLabel) {
    return {
      label: sniffedLabel,
      confidence: sniffConfidenceFromText(text),
      raw: payload,
      rawText: text,
    };
  }

  return { label: null, confidence: 0, raw: payload, rawText: text };
}

function normalizeGloss(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  if (UNKNOWN_LABELS.has(lower)) return null;
  if (LABEL_SYNONYMS[lower]) return LABEL_SYNONYMS[lower];
  return trimmed;
}

function sniffLabelFromText(text) {
  if (typeof text !== 'string') return null;
  const jsonLabelMatch = text.match(/"label"\s*:?\s*"([^"]+)"/i);
  if (jsonLabelMatch) {
    const label = normalizeGloss(jsonLabelMatch[1]);
    if (label) return label;
  }

  const genericMatch = text.match(/\b(hello|hi there|hi|thanks|thank you|thankyou|sorry|attention|look here|look at me|please)\b/i);
  if (genericMatch) {
    const key = genericMatch[1].toLowerCase();
    return LABEL_SYNONYMS[key] || genericMatch[1].toLowerCase();
  }

  return null;
}

function sniffConfidenceFromText(text) {
  if (typeof text !== 'string') return 0.5;
  const match = text.match(/confidence[^0-9]*([01](?:\.\d+)?)/i);
  if (match) {
    const value = parseFloat(match[1]);
    if (Number.isFinite(value)) {
      return clamp01(value);
    }
  }
  return 0.55;
}

function fallbackHeuristicClassification(featureSummary = {}, motionState = {}) {
  if (!featureSummary) {
    return null;
  }

  const rel = featureSummary.relative || {};
  const left = featureSummary.left;
  const right = featureSummary.right;
  const handDistance = featureSummary.handDistance || 0;

  const nearMouth = pointNear(rel.leftToMouth) || pointNear(rel.rightToMouth);
  const nearChest = pointNear(rel.leftToChest, 0.25) || pointNear(rel.rightToChest, 0.25);
  const bothFists = isFist(left) && isFist(right) && handDistance < 0.15;

  if (nearMouth && motionState?.separation) {
    return { label: 'thank you', confidence: 0.35, rule: 'mouth_outward' };
  }

  if (bothFists && motionState?.synchrony) {
    return { label: 'sorry', confidence: 0.3, rule: 'fists_near_chest' };
  }

  if ((isOpenHand(left) || isOpenHand(right)) && nearChest && motionState?.separation) {
    return { label: 'hello', confidence: 0.3, rule: 'open_hand_outward' };
  }

  if ((left?.direction?.y < -0.4 || right?.direction?.y < -0.4) && handDistance < 0.2) {
    return { label: 'attention', confidence: 0.25, rule: 'finger_up' };
  }

  return null;
}

function pointNear(vector, threshold = 0.12) {
  if (!vector) return false;
  const dist = Math.sqrt((vector.x || 0) ** 2 + (vector.y || 0) ** 2 + (vector.z || 0) ** 2);
  return dist <= threshold;
}

function isOpenHand(hand) {
  if (!hand) return false;
  return Number(hand.openness || 0) >= 0.05;
}

function isFist(hand) {
  if (!hand) return false;
  return Number(hand.openness || 0) <= 0.03;
}

function buildClassifierPrompt(featureSummary = {}) {
  const lines = [
    'You are an expert Indian Sign Language interpreter.',
    'You are given geometric hand + body landmark summaries and an image.',
    'Infer the most likely short English gloss for the gesture.',
    '',
    'Heuristics:',
    '- Open hand moving outward from chest → hello.',
    '- Fingertips touching or moving outward from chin → thank you.',
    '- Index finger pointing upward → one / attention.',
    '- Flat hand moving away from mouth → eat / food.',
    '- Both hands forming fists near chest → sorry / please.',
    '',
  ];

  const pushHand = (hand, label) => {
    if (!hand) {
      lines.push(`${label} hand: not visible.`);
      return;
    }
    lines.push(`${label} hand center ${formatPoint(hand.center)}, spread ${formatNumber(hand.spread)}, openness ${formatNumber(hand.openness)}, direction ${formatVector(hand.direction)}.`);
  };

  pushHand(featureSummary.left, 'Left');
  pushHand(featureSummary.right, 'Right');

  if (featureSummary.relative) {
    lines.push(`Relative offsets: left->chest ${formatVector(featureSummary.relative.leftToChest)}, right->chest ${formatVector(featureSummary.relative.rightToChest)}, hand distance ${formatNumber(featureSummary.handDistance)}.`);
  }

  if (featureSummary.orientation) {
    lines.push(`Orientation: ${featureSummary.orientation.horizontalOrder}, ${featureSummary.orientation.verticalOrder}, parallel ${formatNumber(featureSummary.orientation.parallelScore)}.`);
  }

  lines.push('If unsure, answer label "unknown" with confidence 0.');
  return lines.join('\n');
}

// ----------------- STABILITY + SENTENCE -----------------

function recordPrediction(prediction) {
  const normalizedLabel = normalizeTokenLabel(prediction.label);
  predictionHistory.push({ ...prediction, normalizedLabel });
  if (predictionHistory.length > PREDICTION_WINDOW) predictionHistory.shift();
}

function evaluateStableToken() {
  if (!predictionHistory.length) return { stableToken: null, confidence: 0 };

  const recent = predictionHistory.slice(-PREDICTION_WINDOW);
  const buckets = [];

  recent.forEach((entry) => {
    if (!entry.motionState?.consistent) return;
    if (!entry.label || !entry.normalizedLabel) return;
    if ((entry.confidence || 0) < MIN_BUCKET_CONFIDENCE) return;

    let bucket = buckets.find((b) => areTokensEquivalent(b.normalizedLabel, entry.normalizedLabel));
    if (!bucket) {
      bucket = { normalizedLabel: entry.normalizedLabel, representative: entry.label, count: 0, confidence: 0 };
      buckets.push(bucket);
    }
    bucket.count += 1;
    bucket.confidence += entry.confidence || 0;
  });

  let bestCandidate = null;
  buckets.forEach((bucket) => {
    const meanConfidence = bucket.confidence / bucket.count;
    if (bucket.count >= MIN_CONSISTENT_COUNT && meanConfidence >= MIN_STABLE_CONFIDENCE) {
      if (!bestCandidate || meanConfidence > bestCandidate.meanConfidence) {
        bestCandidate = { normalizedLabel: bucket.normalizedLabel, representative: bucket.representative, meanConfidence, count: bucket.count };
      }
    }
  });

  if (!bestCandidate) return { stableToken: null, confidence: 0 };

  const now = Date.now();
  const sameAsLast = bestCandidate.normalizedLabel === lastStableToken;
  const cooldownElapsed = now - lastStableTimestamp >= TOKEN_REUSE_COOLDOWN_MS;

  if (sameAsLast && !cooldownElapsed) return { stableToken: null, confidence: 0 };

  lastStableToken = bestCandidate.normalizedLabel;
  lastStableTimestamp = now;

  return { stableToken: formatStableLabel(bestCandidate.representative), confidence: Number(bestCandidate.meanConfidence.toFixed(2)) };
}

async function prepareResponse(stableResult) {
  const payload = { ...stableResult };
  const hasExplicitConfidence = typeof payload.confidence === 'number' && Number.isFinite(payload.confidence);

  if (!payload.label && payload.stableToken) {
    payload.label = payload.stableToken;
  }

  if (!payload.label && payload.latestLabel) {
    payload.label = formatStableLabel(payload.latestLabel) || payload.latestLabel;
  }

  if (!hasExplicitConfidence && typeof payload.latestConfidence === 'number') {
    payload.confidence = Number(payload.latestConfidence.toFixed(2));
  }

  if (typeof payload.confidence !== 'number' || Number.isNaN(payload.confidence)) {
    payload.confidence = 0;
  }

  if (typeof payload.latestConfidence === 'number' && Number.isFinite(payload.latestConfidence)) {
    payload.latestConfidence = Number(payload.latestConfidence.toFixed(2));
  } else {
    payload.latestConfidence = null;
  }

  if (!payload.latestLabel) {
    payload.latestLabel = null;
  }

  if (!payload.latestRaw) {
    payload.latestRaw = null;
  }

  if (!payload.motionState) {
    payload.motionState = null;
  }

  const now = Date.now();
  if (payload.stableToken) {
    sentenceState.tokens.push(payload.stableToken);
    sentenceState.lastTokenAt = now;
    sentenceState.dirty = true;
  }

  await maybeRewriteSentence(now);

  return {
    stableToken: payload.stableToken || null,
    label: payload.label || null,
    confidence: payload.confidence,
    latestLabel: payload.latestLabel,
    latestConfidence: payload.latestConfidence,
    latestRaw: payload.latestRaw,
    motionState: payload.motionState,
    tokens: sentenceState.tokens.slice(),
    sentence: sentenceState.lastSentence || null,
    sentenceHistory: sentenceState.history.slice(-SENTENCE_HISTORY_LIMIT),
    hasGeminiSentence: Boolean(sentenceState.lastSentence),
  };
}

async function maybeRewriteSentence(now) {
  if (!sentenceState.dirty || !sentenceState.tokens.length) return false;

  const gapExceeded = sentenceState.lastTokenAt && now - sentenceState.lastTokenAt >= SENTENCE_GAP_MS;
  const overflow = sentenceState.tokens.length >= SENTENCE_MAX_TOKENS;

  if (!gapExceeded && !overflow) return false;

  await ensureSentenceRewrite();
  return true;
}

async function ensureSentenceRewrite() {
  if (sentenceState.rewriteInFlight) return sentenceState.rewriteInFlight;

  sentenceState.rewriteInFlight = (async () => {
    const gloss = sentenceState.tokens.join(' ');
    let sentence = gloss;

    if (hasGeminiKeys) {
      try {
        const prompt = buildSentencePrompt(gloss);
        const response = await generateWithRetry(prompt, { preferredModels: GEMINI_SENTENCE_MODEL ? [GEMINI_SENTENCE_MODEL] : [] });
        sentence = (response || '').trim() || gloss;
      } catch (err) {
        console.error('Gemini sentence rewrite error:', err.message || err);
        sentence = gloss;
      }
    }

    sentenceState.lastSentence = sentence;
    sentenceState.history.push(sentence);
    if (sentenceState.history.length > SENTENCE_HISTORY_LIMIT) sentenceState.history.shift();
    sentenceState.tokens = [];
    sentenceState.dirty = false;
  })();

  try {
    await sentenceState.rewriteInFlight;
  } finally {
    sentenceState.rewriteInFlight = null;
  }
}

function buildSentencePrompt(gloss) {
  return [
    'You are a skilled interpreter converting sign-language gloss tokens into natural English.',
    'Rewrite into a clear sentence, capitalized, ending with punctuation.',
    `Gloss: ${gloss}`,
  ].join('\n');
}

function extractTextFromPayload(payload) {
  if (!payload) return '';
  if (typeof payload === 'string') return payload;
  if (Array.isArray(payload)) return extractTextFromPayload(payload[0]);
  if (typeof payload === 'object') {
    if (Array.isArray(payload.choices) && payload.choices.length) {
      const choice = payload.choices[0];
      const message = choice.message || choice.delta;
      if (message?.content) {
        if (typeof message.content === 'string') return message.content;
        if (Array.isArray(message.content)) {
          const textPart = message.content.find((part) => {
            if (typeof part === 'string') return true;
            if (typeof part === 'object') return part.type === 'text' && typeof part.text === 'string';
            return false;
          });
          if (typeof textPart === 'string') return textPart;
          if (textPart?.text) return textPart.text;
        }
      }
      if (typeof choice.text === 'string') return choice.text;
    }
    if (typeof payload.generated_text === 'string') return payload.generated_text;
    if (Array.isArray(payload.generated_text) && payload.generated_text.length) return extractTextFromPayload(payload.generated_text[0]);
    if (typeof payload.text === 'string') return payload.text;
    if (Array.isArray(payload.outputs) && payload.outputs.length) return extractTextFromPayload(payload.outputs[0]);
    if (Array.isArray(payload.messages) && payload.messages.length) return extractTextFromPayload(payload.messages[payload.messages.length - 1]);
  }
  return JSON.stringify(payload);
}

function extractJsonSnippet(text) {
  if (typeof text !== 'string') return null;
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

function clamp01(value) {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

function isModelUnsupported(err) {
  const code = err?.response?.data?.error?.code;
  const message = err?.response?.data?.error?.message || '';
  if (!code && !message) return false;
  return code === 'model_not_supported' || /model\s+not\s+supported/i.test(message);
}

// ----------------- MATH HELPERS -----------------

function averagePoint(points) {
  const valid = (points || []).filter(Boolean);
  if (!valid.length) return null;
  const sum = valid.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y, z: acc.z + (p.z || 0) }), { x: 0, y: 0, z: 0 });
  return { x: sum.x / valid.length, y: sum.y / valid.length, z: sum.z / valid.length };
}

function averageDistanceFromCenter(points, center) {
  if (!center) return 0;
  const valid = (points || []).filter(Boolean);
  if (!valid.length) return 0;
  const distances = valid.map((p) => distance(p, center));
  return average(distances);
}

function subtract(a, b) {
  if (!a || !b) return null;
  return { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
}

function distance(a, b) {
  if (!a || !b) return 0;
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + ((a.z || 0) - (b.z || 0)) ** 2);
}

function magnitude(vector) {
  if (!vector) return 0;
  return Math.sqrt(vector.x ** 2 + vector.y ** 2 + (vector.z || 0) ** 2);
}

function normalize(vector) {
  if (!vector) return null;
  const mag = magnitude(vector);
  if (!mag) return null;
  return { x: vector.x / mag, y: vector.y / mag, z: (vector.z || 0) / mag };
}

function dot(a, b) {
  if (!a || !b) return 0;
  return a.x * b.x + a.y * b.y + (a.z || 0) * (b.z || 0);
}

function average(values) {
  const valid = values.filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (!valid.length) return 0;
  const sum = valid.reduce((acc, v) => acc + v, 0);
  return sum / valid.length;
}

function speedBetween(prev, curr, dt) {
  if (!prev || !curr) return 0;
  return distance(prev, curr) / dt;
}

function directionBetween(prev, curr) {
  if (!prev || !curr) return null;
  return normalize(subtract(curr, prev));
}

function measureDirectionConsistency(directions) {
  if (directions.length < 2) return 0;
  let variance = 0;
  let comparisons = 0;
  for (let i = 1; i < directions.length; i += 1) {
    const prev = directions[i - 1];
    const curr = directions[i];
    const dotValue = dot(prev, curr);
    variance += 1 - dotValue;
    comparisons += 1;
  }
  return variance / comparisons;
}

function updateMotionHistory(featureSummary) {
  const entry = { timestamp: Date.now(), leftCenter: featureSummary.left?.center || null, rightCenter: featureSummary.right?.center || null, handDistance: featureSummary.handDistance };
  motionHistory.push(entry);
  if (motionHistory.length > MOTION_WINDOW) motionHistory.shift();
  return analyzeMotionState();
}

function analyzeMotionState() {
  if (motionHistory.length < 2) return { consistent: false, speed: 0, approach: false, separation: false, synchrony: false };

  const deltas = [];
  const leftDirections = [];
  const rightDirections = [];
  const handDistanceTrend = { start: null, end: null };

  for (let i = 1; i < motionHistory.length; i += 1) {
    const prev = motionHistory[i - 1];
    const curr = motionHistory[i];
    const dt = Math.max(1, curr.timestamp - prev.timestamp);

    const leftSpeed = speedBetween(prev.leftCenter, curr.leftCenter, dt);
    const rightSpeed = speedBetween(prev.rightCenter, curr.rightCenter, dt);
    deltas.push({ leftSpeed, rightSpeed });

    const leftDir = directionBetween(prev.leftCenter, curr.leftCenter);
    const rightDir = directionBetween(prev.rightCenter, curr.rightCenter);
    if (leftDir) leftDirections.push(leftDir);
    if (rightDir) rightDirections.push(rightDir);

    if (i === 1) handDistanceTrend.start = prev.handDistance;
    if (i === motionHistory.length - 1) handDistanceTrend.end = curr.handDistance;
  }

  const avgLeftSpeed = average(deltas.map((d) => d.leftSpeed));
  const avgRightSpeed = average(deltas.map((d) => d.rightSpeed));
  const synchrony = Math.abs(avgLeftSpeed - avgRightSpeed) <= 0.05;

  const directionConsistency = Math.max(measureDirectionConsistency(leftDirections), measureDirectionConsistency(rightDirections));

  const distanceDelta = handDistanceTrend.start != null && handDistanceTrend.end != null ? handDistanceTrend.end - handDistanceTrend.start : 0;

  const consistent = (directionConsistency <= 0.6 || leftDirections.length < 2 || rightDirections.length < 2) && synchrony;

  return { consistent, speed: (avgLeftSpeed + avgRightSpeed) / 2 || 0, approach: distanceDelta < -0.02, separation: distanceDelta > 0.02, synchrony };
}

function normalizeTokenLabel(label) {
  if (typeof label !== 'string') return null;
  const trimmed = label.trim().toLowerCase();
  return trimmed.length ? trimmed : null;
}

function formatStableLabel(label) {
  if (typeof label !== 'string') return null;
  return label
    .trim()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function areTokensEquivalent(normA, normB) {
  if (!normA || !normB) return false;
  if (normA === normB) return true;
  return levenshteinDistance(normA, normB) <= MAX_LEVENSHTEIN_FOR_MATCH;
}

function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const matrix = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
    }
  }

  return matrix[a.length][b.length];
}

function formatNumber(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 'n/a';
  return Number(value).toFixed(3);
}

function formatPoint(point) {
  if (!point) return 'n/a';
  return `(${formatNumber(point.x)}, ${formatNumber(point.y)}, ${formatNumber(point.z)})`;
}

function formatVector(vector) {
  if (!vector) return 'n/a';
  return `<${formatNumber(vector.x)}, ${formatNumber(vector.y)}, ${formatNumber(vector.z)}>`;
}

function resetMotionState() {
  motionHistory.length = 0;
  predictionHistory.length = 0;
}

module.exports = { detectSign };