const { protect } = require('../middleware/authMiddleware');
const fetch = global.fetch || require('node-fetch');

const DEFAULT_SYSTEM_PROMPT = `You are 'Sayan,' the friendly and helpful chatbot for SAYANA. SAYANA is an application that empowers deaf and mute users through AI-powered emotion detection, real-time sign language translation, secure conversations, and multilingual support. Your *only* job is to answer questions about SAYANA's features, accessibility, technology, and mission. Be empathetic, clear, and concise. **Strictly refuse to answer any questions or engage in any conversation that is not about SAYANA.** If asked about anything else, politely redirect the user back to SAYANA's features. For example: 'I'm here to help with any questions you have about SAYANA. How can I tell you more about our AI translation features?'`;

/**
 * Calls the generative API with the given prompt and context.
 * @param {string} prompt - The user's latest prompt.
 * @param {Array} history - The previous conversation history.
 * @param {string} systemPrompt - The instructions for the AI model.
 * @returns {Promise<object>} The API response.
 */
const callGenerativeApi = async (prompt, history = [], systemPrompt = DEFAULT_SYSTEM_PROMPT) => {
  const apiKeys = (process.env.GEMINI_API_KEY || '').split(',').map(k => k.trim()).filter(Boolean);
  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

  if (apiKeys.length === 0) {
    return {
      ok: false,
      text: 'API_KEY_MISSING',
      raw: { error: { message: 'GEMINI_API_KEY is not configured in the backend .env file.' } },
    };
  }

  let lastError = null;

  for (const apiKey of apiKeys) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const contents = history.map(item => ({
      role: item.from === 'bot' ? 'model' : 'user',
      parts: [{ text: item.text }],
    }));
    contents.push({
      role: 'user',
      parts: [{ text: prompt }],
    });

    const body = {
      contents,
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
    };

    try {
      const apiResponse = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const responseText = await apiResponse.text();
      
      if (!apiResponse.ok) {
        let errorJson = {};
        try {
          errorJson = JSON.parse(responseText);
        } catch (e) {
          errorJson = {
            error: {
              message: 'The API returned a non-JSON error.',
              status: `HTTP_${apiResponse.status}`,
              __raw_text: responseText.substring(0, 500) + '...',
            },
          };
        }
        
        lastError = { ok: false, text: errorJson.error?.status || 'API_ERROR', raw: errorJson };

        // If we get a rate limit or unavailable error, try the next key
        if (lastError.text === 'RESOURCE_EXHAUSTED' || lastError.text === 'UNAVAILABLE') {
          console.warn(`API key ending in ...${apiKey.slice(-4)} failed with ${lastError.text}. Trying next key.`);
          continue; // Move to the next key
        }

        // For other errors, fail immediately
        return lastError;
      }

      const responseData = JSON.parse(responseText);
      const generatedText = extractTextFromResponse(responseData);

      return { ok: true, text: generatedText, raw: responseData }; // Success, exit the loop

    } catch (error) {
      console.error('Fatal error calling Generative API:', error);
      lastError = {
        ok: false,
        text: 'INTERNAL_SERVER_ERROR',
        raw: { error: { message: error.message, code: 'FETCH_FAILED' } },
      };
      continue; // Try next key on network failure
    }
  }

  // If all keys failed, return the last error encountered
  console.error('All API keys failed.');
  return lastError || { 
    ok: false, 
    text: 'ALL_KEYS_FAILED', 
    raw: { error: { message: 'All configured API keys failed to get a response.' } } 
  };
};

/**
 * Extracts the generated text from a successful API response.
 * @param {object} responseData - The JSON data from the API.
 * @returns {string} The extracted text.
 */
const extractTextFromResponse = (responseData) => {
  if (responseData?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return responseData.candidates[0].content.parts[0].text;
  }

  if (responseData?.candidates?.[0]?.finishReason) {
    return `I'm sorry, I couldn't generate a response. (Reason: ${responseData.candidates[0].finishReason})`;
  }
  
  console.error('Unexpected API response structure:', JSON.stringify(responseData, null, 2));
  return 'Error: Could not extract text from a successful API response.';
};

const handleApiResult = (result, res) => {
  if (!result.ok) {
    // Handle specific, known errors with user-friendly messages
    if (result.text === 'UNAVAILABLE') {
      return res.json({ text: 'The AI model is currently overloaded. Please try again in a moment.' });
    }
    // For other errors, return the status text
    return res.json({ text: `An error occurred: ${result.text}`, debug: result.raw });
  }
  // On success, return the generated text
  return res.json({ text: result.text });
};

// Protected endpoint: requires JWT auth
const queryAgent = async (req, res) => {
  try {
    const { prompt, history } = req.body || {};
    if (!prompt) return res.status(400).json({ message: 'Missing prompt' });

    const systemPrompt = DEFAULT_SYSTEM_PROMPT + '\n\nYou may assume the user is authenticated and may ask account-specific questions.';
    const result = await callGenerativeApi(prompt, history, systemPrompt);
    
    handleApiResult(result, res);

  } catch (err) {
    console.error('queryAgent error:', err.message || err);
    return res.status(500).json({ message: 'Agent error', error: err.message });
  }
};

// Public endpoint: unauthenticated
const queryAgentPublic = async (req, res) => {
  try {
    const { prompt, history } = req.body || {};
    if (!prompt) return res.status(400).json({ message: 'Missing prompt' });

    const systemPrompt = DEFAULT_SYSTEM_PROMPT + '\n\nAnswer only brief, high-level help suitable for unauthenticated users. Do not provide account-specific instructions.';
    const result = await callGenerativeApi(prompt, history, systemPrompt);

    handleApiResult(result, res);

  } catch (err) {
    console.error('queryAgentPublic error:', err.message || err);
    return res.status(500).json({ message: 'Agent error', error: err.message });
  }
};

// Debug endpoint to verify the generative API is reachable and the key works
const debugGeminiTest = async (req, res) => {
  const result = await callGenerativeApi('This is a test. If you see this, respond with "OK".');
  res.json(result);
};

/**
 * @desc    Debug endpoint to list all available models for the configured API key.
 * @route   GET /api/agent/debug/list-models
 * @access  Public
 */
const debugListModels = async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({
      ok: false,
      error: { message: 'GEMINI_API_KEY is not configured in the backend .env file.' },
    });
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

  try {
    const apiResponse = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const responseData = await apiResponse.json();
    res.status(apiResponse.status).json(responseData);

  } catch (error) {
    console.error('Fatal error calling ListModels API:', error);
    res.status(500).json({
      ok: false,
      error: { message: error.message, code: 'FETCH_FAILED' },
    });
  }
};

module.exports = {
  queryAgent,
  queryAgentPublic,
  debugGeminiTest,
  debugListModels,
};
