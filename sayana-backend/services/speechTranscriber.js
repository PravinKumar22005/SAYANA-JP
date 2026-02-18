const fs = require('fs');
const path = require('path');

let vosk;
try {
  // Optional dependency - only required when offline transcription is needed
  // eslint-disable-next-line global-require, import/no-extraneous-dependencies
  vosk = require('vosk');
} catch (error) {
  vosk = null;
}

const SAMPLE_RATE = Number(process.env.VOSK_SAMPLE_RATE || 16000);
const MAX_AUDIO_SECONDS = Number(process.env.VOSK_MAX_AUDIO_SECONDS || 20);
const MODEL_PATH = process.env.VOSK_MODEL_PATH ? path.resolve(process.env.VOSK_MODEL_PATH) : null;
let modelInstance = null;

function isReady() {
  if (!vosk || !MODEL_PATH) {
    return false;
  }
  if (!fs.existsSync(MODEL_PATH)) {
    return false;
  }
  return true;
}

function ensureModel() {
  if (!vosk) {
    throw new Error('vosk dependency not installed. Run "npm install vosk" in sayana-backend.');
  }
  if (!MODEL_PATH) {
    throw new Error('VOSK_MODEL_PATH is not configured.');
  }
  if (!fs.existsSync(MODEL_PATH)) {
    throw new Error(`VOSK model directory not found at ${MODEL_PATH}`);
  }
  if (!modelInstance) {
    vosk.setLogLevel(Number(process.env.VOSK_LOG_LEVEL || 0));
    modelInstance = new vosk.Model(MODEL_PATH);
  }
  return modelInstance;
}

function extractPcmFromWav(buffer) {
  if (buffer.length < 44 || buffer.toString('ascii', 0, 4) !== 'RIFF') {
    throw new Error('Only PCM WAV audio is supported.');
  }
  const fmt = buffer.toString('ascii', 12, 16);
  if (fmt !== 'fmt ') {
    throw new Error('Invalid WAV header.');
  }
  const audioFormat = buffer.readUInt16LE(20);
  const numChannels = buffer.readUInt16LE(22);
  const sampleRate = buffer.readUInt32LE(24);
  const bitsPerSample = buffer.readUInt16LE(34);

  if (audioFormat !== 1 || bitsPerSample !== 16) {
    throw new Error('WAV must be 16-bit PCM.');
  }
  if (sampleRate !== SAMPLE_RATE) {
    throw new Error(`Expected ${SAMPLE_RATE}hz audio, received ${sampleRate}hz.`);
  }

  const dataMarkerIndex = buffer.indexOf('data');
  if (dataMarkerIndex < 0) {
    throw new Error('Missing data chunk in WAV file.');
  }
  const dataStart = dataMarkerIndex + 8;
  return buffer.slice(dataStart);
}

async function transcribeAudioBase64(audioBase64) {
  if (!audioBase64) {
    throw new Error('audioBase64 payload is required');
  }
  const model = ensureModel();
  const wavBuffer = Buffer.from(audioBase64, 'base64');
  const pcm = extractPcmFromWav(wavBuffer);

  const durationSeconds = pcm.length / 2 / SAMPLE_RATE; // 2 bytes per sample
  if (durationSeconds > MAX_AUDIO_SECONDS) {
    throw new Error(`Audio clip is too long (${durationSeconds.toFixed(1)}s). Limit is ${MAX_AUDIO_SECONDS}s.`);
  }

  const recognizer = new vosk.Recognizer({ model, sampleRate: SAMPLE_RATE });
  try {
    recognizer.setMaxAlternatives(0);
    recognizer.setWords(true);
    recognizer.acceptWaveform(pcm);
    const result = recognizer.finalResult();
    return {
      text: (result?.text || '').trim(),
      confidence: result?.confidence || null,
      engine: 'vosk',
    };
  } finally {
    recognizer.free();
  }
}

module.exports = {
  isReady,
  transcribeAudioBase64,
};
