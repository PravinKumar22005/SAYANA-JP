import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

const TARGET_SAMPLE_RATE = 16000;
const AUTO_PLAY_DURATION_MS = 4500;
const FALLBACK_HOLD_MS = 2200;

const defaultRequest = async (url, options) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed with status ${response.status}`);
  }
  return response.json();
};

const badgeClasses = 'px-3 py-1 rounded-full bg-white/10 text-sm text-white/90 border border-white/10 backdrop-blur';
const providerLabels = {
  youtube: 'ISLRTC Sign Learn (YouTube)',
  'islrtc-media': 'ISLRTC Sign Learn (MP4)',
  giphy: 'GIPHY',
};
const licenseCopy = 'Licensed under GODL-India (data.gov.in/government-open-data-license-india)';

export default function SignTranslatorPanel({ apiBase, requestFn }) {
  const endpointBase = apiBase || (typeof window !== 'undefined' && window.location ? window.location.origin : 'http://localhost:5000');
  const requestJson = requestFn || defaultRequest;

  const [inputValue, setInputValue] = useState('');
  const [sequence, setSequence] = useState([]);
  const [glossTokens, setGlossTokens] = useState([]);
  const [providers, setProviders] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [recordingSupported, setRecordingSupported] = useState(false);
  const [activeCardIndex, setActiveCardIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);

  const recognitionRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const autoPlayTimerRef = useRef(null);

  function stopRecorder() {
    const active = mediaRecorderRef.current;
    if (!active) return;
    if (active.recorder && active.recorder.state === 'recording') {
      active.recorder.stop();
    }
    if (active.stream) {
      active.stream.getTracks().forEach((track) => track.stop());
    }
    mediaRecorderRef.current = null;
  }

  useEffect(() => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognitionCtor) {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = async (event) => {
        const spoken = event.results?.[0]?.[0]?.transcript;
        setIsListening(false);
        if (spoken) {
          setInputValue(spoken);
          toast.success('Voice captured. Translating...');
          await handleTranslate('voice', spoken);
        }
      };
      recognition.onerror = (event) => {
        setIsListening(false);
        console.warn('Speech recognition error', event);
        toast.error('Speech recognition failed. Try again or use manual text.');
      };
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
      setSpeechSupported(true);
    }

    if (navigator?.mediaDevices?.getUserMedia) {
      setRecordingSupported(true);
    }

    return () => {
      recognitionRef.current?.stop?.();
      stopRecorder();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => {
    if (autoPlayTimerRef.current) {
      clearTimeout(autoPlayTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!isAutoPlaying || !sequence.length) {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
      return () => {};
    }

    const currentItem = sequence[activeCardIndex];
    const timeoutMs = getItemDuration(currentItem);

    autoPlayTimerRef.current = setTimeout(() => {
      setActiveCardIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= sequence.length) {
          setIsAutoPlaying(false);
          return prev;
        }
        return nextIndex;
      });
    }, timeoutMs);

    return () => {
      if (autoPlayTimerRef.current) {
        clearTimeout(autoPlayTimerRef.current);
      }
    };
  }, [isAutoPlaying, sequence, activeCardIndex]);

  const handleTranslate = async (source = 'text', overrideText) => {
    const textToTranslate = (overrideText ?? inputValue).trim();
    if (!textToTranslate) {
      toast.warn('Please enter or dictate a sentence first.');
      return;
    }
    setIsTranslating(true);
    setIsAutoPlaying(false);
    setActiveCardIndex(0);
    if (!overrideText) {
      setSequence([]);
    }
    try {
      const payload = {
        text: textToTranslate,
        locale: 'en',
        source,
      };
      const response = await requestJson(`${endpointBase}/api/sign/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const nextSequence = response.sequence || [];
      setSequence(nextSequence);
      setGlossTokens(response.gloss || []);
      setProviders(response.providers || []);
      setCoverage(response.coverage || null);
      setLastUpdated(response.generatedAt || new Date().toISOString());
      if (nextSequence.length) {
        setActiveCardIndex(0);
        setIsAutoPlaying(true);
      } else {
        setIsAutoPlaying(false);
      }
      if ((response.coverage?.ratio ?? 0) < 1) {
        toast.info('Some words are finger-spelled while we fetch more media.');
      } else {
        toast.success('Sign story ready.');
      }
    } catch (error) {
      console.error('translate error', error);
      toast.error('Unable to translate right now. Please try again.');
    } finally {
      setIsTranslating(false);
    }
  };

  const startSpeechRecognition = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not supported in this browser.');
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      return;
    }
    try {
      recognitionRef.current.start();
      setIsListening(true);
      toast.info('Listening... speak naturally.');
    } catch (error) {
      console.warn('Failed to start recognition', error);
      toast.error('Microphone is busy. Please try again.');
    }
  };

  const startRecording = async () => {
    if (!recordingSupported) {
      toast.error('MediaRecorder is not supported in this browser.');
      return;
    }
    if (isRecording) {
      stopRecorder();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = { recorder, stream };
      chunksRef.current = [];
      recorder.ondataavailable = (event) => {
        if (event.data?.size) {
          chunksRef.current.push(event.data);
        }
      };
      recorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        chunksRef.current = [];
        await sendBlobForTranscription(blob);
        stopRecorder();
      };
      recorder.start();
      setIsRecording(true);
      toast.info('Recording… tap again to stop.');
    } catch (error) {
      console.error('Recorder error', error);
      toast.error('Unable to access microphone.');
    }
  };

  const handleVoiceButton = () => {
    if (speechSupported) {
      startSpeechRecognition();
    } else {
      startRecording();
    }
  };

  const handleAutoPlayToggle = () => {
    if (!sequence.length) {
      toast.info('Translate a sentence first.');
      return;
    }
    if (isAutoPlaying) {
      setIsAutoPlaying(false);
      return;
    }
    setActiveCardIndex(0);
    setIsAutoPlaying(true);
  };

  const handleManualStep = (offset) => {
    if (!sequence.length) {
      return;
    }
    setIsAutoPlaying(false);
    setActiveCardIndex((prev) => {
      const next = prev + offset;
      if (next < 0) return 0;
      if (next >= sequence.length) return sequence.length - 1;
      return next;
    });
  };

  const handleChipSelect = (index) => {
    setIsAutoPlaying(false);
    setActiveCardIndex(index);
  };

  const sendBlobForTranscription = async (blob) => {
    if (!blob || !blob.size) {
      toast.warn('No audio captured.');
      return;
    }
    try {
      setIsTranslating(true);
      toast.info('Processing voice with offline model...');
      const base64 = await convertBlobToBase64Wav(blob);
      const response = await requestJson(`${endpointBase}/api/sign/transcribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ audioBase64: base64, locale: 'en' }),
      });
      if (response?.text) {
        setInputValue(response.text);
        await handleTranslate('voice', response.text);
      } else {
        toast.error('Transcriber did not return a result.');
      }
    } catch (error) {
      console.error('transcribe error', error);
      toast.error(error.message || 'Transcription failed.');
    } finally {
      setIsTranslating(false);
    }
  };

  const safeIndex = Math.min(activeCardIndex, Math.max(sequence.length - 1, 0));
  const activeItem = sequence.length ? sequence[safeIndex] : null;

  const providerText = providers
    .map((provider) => providerLabels[provider] || provider)
    .filter(Boolean)
    .join(', ');

  const attribution = providers.length
    ? `Assets courtesy of ${providerText}. ${licenseCopy}`
    : 'Finger-spelling fallback rendered locally';

  return (
    <section id="sign-translator" className="w-full max-w-6xl mx-auto px-6 pt-12 pb-6 sm:px-10">
      <motion.div
        className="w-full rounded-3xl bg-white/5 border border-white/10 shadow-2xl shadow-black/30 backdrop-blur-xl p-6 sm:p-10"
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.6 }}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-1 space-y-4">
              <p className="inline-flex items-center gap-2 text-sm uppercase tracking-widest text-purple-300">
                <span className="inline-block w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                Live beta
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">Voice & Text to Sign</h2>
              <p className="text-white/80 text-base sm:text-lg">
                Speak or type a phrase and we will map it to sign-language gloss tokens, then stream the corresponding clips
                from ISLRTC's official Sign Learn dictionary (YouTube mirrors licensed under GODL-India). Missing words automatically
                fall back to finger-spelling so you never lose the thread.
              </p>
              <div className="flex flex-wrap gap-3">
                <span className={badgeClasses}>Free stack · Vosk + Hugging Face</span>
                <span className={badgeClasses}>Latency target &lt; 2s</span>
                <span className={badgeClasses}>Media source · ISLRTC Sign Learn</span>
                {coverage?.ratio !== undefined && (
                  <span className={badgeClasses}>
                    Coverage: {Math.round((coverage.ratio || 0) * 100)}%
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 space-y-4">
              <textarea
                className="w-full h-32 rounded-2xl bg-black/30 border border-white/10 p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-purple-400/60"
                placeholder="Describe what you want to sign..."
                value={inputValue}
                onChange={(event) => setInputValue(event.target.value)}
              />
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleVoiceButton}
                  className={`flex-1 rounded-2xl border border-white/15 px-4 py-3 text-white font-semibold transition ${
                    isListening || isRecording ? 'bg-purple-700/70' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {speechSupported
                    ? isListening ? 'Listening… tap to stop' : 'Speak to Sign'
                    : isRecording ? 'Recording… tap to stop' : 'Record Voice (fallback)'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTranslate('text')}
                  disabled={isTranslating}
                  className="flex-1 rounded-2xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 px-4 py-3 text-white font-semibold transition"
                >
                  {isTranslating ? 'Translating…' : 'Translate text'}
                </button>
                <button
                  type="button"
                  onClick={handleAutoPlayToggle}
                  disabled={!sequence.length}
                  className={`flex-1 rounded-2xl border border-white/15 px-4 py-3 text-white font-semibold transition ${
                    isAutoPlaying ? 'bg-purple-500/70' : 'bg-white/5 hover:bg-white/15'
                  } disabled:opacity-50`}
                >
                  {isAutoPlaying ? 'Pause sentence playback' : 'Play entire sentence'}
                </button>
              </div>
            </div>
          </div>

          {glossTokens.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {glossTokens.map((token) => (
                <span key={token} className={badgeClasses}>
                  {token}
                </span>
              ))}
            </div>
          )}

          {sequence.length > 0 && (
            <div className="flex flex-wrap items-center justify-between text-sm text-white/70">
              <span>
                Sentence playback: {Math.min(activeCardIndex + 1, sequence.length)} / {sequence.length}
              </span>
              <span className="text-white/50">{isAutoPlaying ? 'Auto-playing…' : 'Paused'}</span>
            </div>
          )}

          {sequence.length === 0 && !isTranslating && (
            <p className="text-white/70">No cards yet. Enter text above to see sign outputs.</p>
          )}

          {sequence.length > 0 && (
            <div className="space-y-4">
              <ActiveSignPlayer item={activeItem} isAutoPlaying={isAutoPlaying} />

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleManualStep(-1)}
                  className="rounded-2xl border border-white/15 px-4 py-2 text-white/90 hover:bg-white/10 transition"
                  disabled={activeCardIndex === 0}
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => handleManualStep(1)}
                  className="rounded-2xl border border-white/15 px-4 py-2 text-white/90 hover:bg-white/10 transition"
                  disabled={activeCardIndex >= sequence.length - 1}
                >
                  Next
                </button>
              </div>

              <motion.div className="flex flex-wrap gap-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {sequence.map((item, index) => {
                  const isActive = index === activeCardIndex;
                  const hasMedia = Array.isArray(item.media) && item.media.length > 0;
                  return (
                    <button
                      key={`${item.token}-${index}`}
                      type="button"
                      onClick={() => handleChipSelect(index)}
                      className={`px-3 py-2 rounded-2xl text-sm border transition focus:outline-none focus:ring-2 focus:ring-purple-400/60 ${
                        isActive ? 'bg-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/30' : 'bg-white/5 text-white/80 border-white/10'
                      } ${hasMedia ? '' : 'border-dashed'}`}
                    >
                      {item.display}
                      {!hasMedia && <span className="ml-2 text-xs text-white/70">(spell)</span>}
                    </button>
                  );
                })}
              </motion.div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs text-white/60">
            <span>{attribution}</span>
            {lastUpdated && <span>Last updated: {new Date(lastUpdated).toLocaleTimeString()}</span>}
          </div>
        </div>
      </motion.div>
    </section>
  );
}

function ActiveSignPlayer({ item, isAutoPlaying }) {
  if (!item) {
    return (
      <div className="rounded-3xl bg-black/30 border border-white/10 p-5">
        <div className="w-full aspect-video rounded-2xl border border-dashed border-white/20 flex items-center justify-center text-white/60">
          Translate a sentence to preview signs.
        </div>
      </div>
    );
  }

  const primary = item.media?.[0];
  let mediaNode = null;

  if (primary?.provider === 'youtube') {
    const embedSrc = buildYoutubeEmbedSrc(primary.url, isAutoPlaying);
    mediaNode = (
      <iframe
        key={embedSrc}
        src={embedSrc}
        title={`${item.display} sign video`}
        className="w-full h-full"
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  } else if (primary?.type === 'video') {
    mediaNode = (
      <video
        key={primary.url}
        src={primary.url}
        poster={primary.preview}
        className="w-full h-full object-cover"
        autoPlay={isAutoPlaying}
        muted
        playsInline
      />
    );
  } else if (primary?.preview || primary?.url) {
    mediaNode = (
      <img
        src={primary.preview || primary.url}
        alt={item.display}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    );
  } else if (item.fallback) {
    mediaNode = (
      <div className="w-full h-full flex items-center justify-center text-white/80 text-4xl tracking-[0.4em]">
        {item.fallback.letters.join(' ')}
      </div>
    );
  } else {
    mediaNode = (
      <div className="w-full h-full flex items-center justify-center text-white/60">No preview</div>
    );
  }

  return (
    <div className="rounded-3xl bg-black/30 border border-white/10 p-5 space-y-4">
      <div className="w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-black/60">
        {mediaNode}
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-white/50">Active token</p>
          <p className="text-3xl font-semibold text-white">{item.display}</p>
        </div>
        <div className="text-right text-xs text-white/60 max-w-xs">
          {primary?.attribution || (item.fallback ? 'Finger-spelling fallback' : '')}
        </div>
      </div>
      {item.notes && <p className="text-sm text-white/70">{item.notes}</p>}
    </div>
  );
}

function getItemDuration(item) {
  if (!item) return FALLBACK_HOLD_MS;
  const primary = item.media?.[0];
  if (primary?.type === 'video') {
    return AUTO_PLAY_DURATION_MS;
  }
  return FALLBACK_HOLD_MS;
}

function buildYoutubeEmbedSrc(url, shouldPlay) {
  try {
    const embed = new URL(url);
    if (embed.hostname.includes('youtube.com')) {
      embed.hostname = 'www.youtube-nocookie.com';
    }
    embed.searchParams.set('autoplay', shouldPlay ? '1' : '0');
    embed.searchParams.set('mute', '1');
    embed.searchParams.set('controls', '0');
    embed.searchParams.set('rel', '0');
    embed.searchParams.set('playsinline', '1');
    embed.searchParams.set('modestbranding', '1');
    embed.searchParams.set('showinfo', '0');
    embed.searchParams.set('fs', '0');
    return embed.toString();
  } catch (error) {
    return url;
  }
}

async function convertBlobToBase64Wav(blob) {
  if (typeof window === 'undefined') {
    throw new Error('Audio processing only available in browser environments.');
  }
  const arrayBuffer = await blob.arrayBuffer();
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  const audioContext = new AudioContextCtor();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const channelData = audioBuffer.getChannelData(0);
  const downsampled = downsampleBuffer(channelData, audioBuffer.sampleRate, TARGET_SAMPLE_RATE);
  const wavBuffer = encodeWav(downsampled, TARGET_SAMPLE_RATE);
  await audioContext.close();
  return bufferToBase64(wavBuffer);
}

function downsampleBuffer(buffer, sampleRate, outSampleRate) {
  if (outSampleRate === sampleRate) {
    return buffer;
  }
  if (outSampleRate > sampleRate) {
    return buffer;
  }
  const sampleRatio = sampleRate / outSampleRate;
  const newLength = Math.round(buffer.length / sampleRatio);
  const result = new Float32Array(newLength);
  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRatio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i += 1) {
      accum += buffer[i];
      count += 1;
    }
    result[offsetResult] = accum / count;
    offsetResult += 1;
    offsetBuffer = nextOffsetBuffer;
  }
  return result;
}

function encodeWav(samples, sampleRate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, samples.length * 2, true);
  floatTo16BitPCM(view, 44, samples);
  return buffer;
}

function floatTo16BitPCM(view, offset, input) {
  for (let i = 0; i < input.length; i += 1, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    s = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, s, true);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i += 1) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function bufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof window !== 'undefined' ? window.btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}
