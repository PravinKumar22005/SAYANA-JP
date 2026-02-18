const axios = require('axios');

const HF_API_KEY =
  process.env.HF_API_KEY ||
  process.env.HF_TOKEN ||
  process.env.HUGGINGFACE_TOKEN ||
  '';

const HF_API_BASE = (process.env.HF_API_BASE || 'https://api-inference.huggingface.co').replace(/\/$/, '');
const HF_TEXT_MODEL = process.env.HF_TEXT_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';
const HF_NEWS_MODEL = process.env.HF_NEWS_MODEL || process.env.HF_TEXT_MODEL || HF_TEXT_MODEL;
const HF_TEXT_TIMEOUT = Number(process.env.HF_TEXT_TIMEOUT_MS || 20000);

const hasHuggingFaceKey = Boolean(HF_API_KEY);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function callInference(modelName, payload, attempt = 0) {
  if (!hasHuggingFaceKey) {
    throw new Error('Hugging Face API key is not configured.');
  }

  const url = `${HF_API_BASE}/models/${modelName}`;

  try {
    const { data } = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: HF_TEXT_TIMEOUT
    });

    if (!data) {
      throw new Error('Empty response from Hugging Face.');
    }

    if (Array.isArray(data)) {
      const generated = data.find((entry) => typeof entry?.generated_text === 'string');
      if (generated?.generated_text) {
        return generated.generated_text.trim();
      }
    }

    if (typeof data === 'string') {
      return data.trim();
    }

    if (typeof data?.generated_text === 'string') {
      return data.generated_text.trim();
    }

    if (Array.isArray(data?.choices) && data.choices.length) {
      const choice = data.choices[0];
      const messageContent = choice?.message?.content;
      if (typeof messageContent === 'string') {
        return messageContent.trim();
      }
      if (typeof choice?.text === 'string') {
        return choice.text.trim();
      }
    }

    if (data?.error) {
      throw new Error(data.error);
    }

    throw new Error('Unexpected response shape from Hugging Face.');
  } catch (error) {
    const status = error.response?.status;
    const message = error.response?.data?.error || error.message;
    const shouldRetry =
      status === 503 ||
      /Model is currently loading|currently loading/i.test(message);

    if (shouldRetry && attempt < 2) {
      const delay = 800 * (attempt + 1);
      await sleep(delay);
      return callInference(modelName, payload, attempt + 1);
    }

    throw error;
  }
}

function renderChatPrompt(messages = []) {
  const sections = messages
    .filter(Boolean)
    .map((msg) => {
      const role = msg.role || 'user';
      const label = role === 'system' ? 'System' : role === 'assistant' ? 'Assistant' : 'User';
      const content = typeof msg.content === 'string' ? msg.content.trim() : '';
      return `${label}:\n${content}`;
    });

  sections.push('Assistant:');
  return sections.join('\n\n');
}

async function generateChatCompletion(messages, options = {}) {
  const prompt = renderChatPrompt(messages);
  const model = options.model || process.env.HF_CHAT_MODEL || HF_TEXT_MODEL;

  const text = await callInference(model, {
    inputs: prompt,
    parameters: {
      max_new_tokens: options.maxNewTokens || 320,
      temperature: options.temperature ?? 0.35,
      top_p: 0.9,
      return_full_text: false
    }
  });

  return { text, model };
}

async function summarizeArticlesForNews(articles = []) {
  const topArticles = articles.slice(0, Math.min(articles.length, 6));
  const digest = topArticles
    .map((article, index) => {
      const bits = [
        `${index + 1}. ${article.title}`,
        article.topic ? `Topic: ${article.topic}` : null,
        article.source ? `Source: ${article.source}` : null,
        article.snippet ? `Summary: ${article.snippet}` : null,
        article.url ? `Link: ${article.url}` : null
      ].filter(Boolean);
      return bits.join(' | ');
    })
    .join('\n');

  const messages = [
    {
      role: 'system',
      content:
        'You are a concise news analyst for a deaf-friendly assistant. Write 3-5 bullet points that synthesize the articles, include the article numbers in square brackets for citations (e.g., [1]), and keep each bullet under 200 characters.'
    },
    {
      role: 'user',
      content: `Summarize these articles for today:\n\n${digest}`
    }
  ];

  try {
    const model = process.env.HF_NEWS_MODEL || process.env.HF_CHAT_MODEL || HF_TEXT_MODEL;
    const { text } = await generateChatCompletion(messages, {
      model,
      temperature: 0.25,
      maxNewTokens: 280
    });
    return { text, model };
  } catch (error) {
    console.warn('[HuggingFace] News summarization failed:', error.message);
    return { text: null, model: null };
  }
}

module.exports = {
  hasHuggingFaceKey,
  generateChatCompletion,
  summarizeArticlesForNews,
  resolveChatModel: () => process.env.HF_CHAT_MODEL || HF_TEXT_MODEL,
  resolveNewsModel: () => process.env.HF_NEWS_MODEL || process.env.HF_CHAT_MODEL || HF_TEXT_MODEL
};
