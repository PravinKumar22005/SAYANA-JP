const crypto = require('crypto');
const Parser = require('rss-parser');
const {
  summarizeArticlesForNews,
  hasHuggingFaceKey,
  resolveNewsModel
} = require('./huggingfaceClient');

const parser = new Parser({
  timeout: Number(process.env.NEWS_AGENT_RSS_TIMEOUT_MS || 10000),
  headers: {
    'User-Agent': 'SayanaNewsAgent/1.0 (+https://github.com/AGILIZ/SAYANA-JP)',
    Accept: 'application/rss+xml, application/xml'
  }
});

const DEFAULT_LIMIT = Number(process.env.NEWS_AGENT_LIMIT || 9);
const SIGN_LIMIT = Number(process.env.NEWS_SIGN_LIMIT || 3);

const FEEDS = [
  {
    topic: 'Sign Language Spotlight',
    url: 'https://news.google.com/rss/search?q=%22sign%20language%22%20OR%20%22Indian%20Sign%20Language%22&hl=en-IN&gl=IN&ceid=IN:en',
    limit: 4,
    priority: true
  },
  {
    topic: 'Top Stories',
    url: 'https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en',
    limit: 4
  },
  {
    topic: 'Technology',
    url: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=en-IN&gl=IN&ceid=IN:en',
    limit: 4
  },
  {
    topic: 'World',
    url: 'https://news.google.com/rss/headlines/section/topic/WORLD?hl=en-IN&gl=IN&ceid=IN:en',
    limit: 3
  }
];

const htmlEntityMap = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'"
};

function decodeHtml(value = '') {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&([a-z]+);/gi, (_, entity) => htmlEntityMap[entity.toLowerCase()] || _);
}

function stripHtml(value = '') {
  return value.replace(/<[^>]*>/g, ' ');
}

function cleanSnippet(value = '') {
  return decodeHtml(stripHtml(value)).replace(/\s+/g, ' ').trim();
}

function resolveOriginalLink(link = '') {
  if (!link) return '';

  let normalized = link;
  if (link.startsWith('./')) {
    normalized = `https://news.google.com${link.slice(1)}`;
  } else if (!/^https?:/i.test(link)) {
    normalized = `https://news.google.com${link}`;
  }

  try {
    const parsed = new URL(normalized);
    const redirected = parsed.searchParams.get('url');
    if (redirected) {
      return decodeURIComponent(redirected);
    }
    return normalized;
  } catch (error) {
    return normalized;
  }
}

function hostFromUrl(url = '') {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch (error) {
    return null;
  }
}

function createStableId(seed = '') {
  const hash = crypto.createHash('md5').update(seed).digest('hex');
  return hash.slice(0, 16);
}

function normalizeArticle(rawItem, feed) {
  const feedTopic = feed.topic;
  const link = resolveOriginalLink(rawItem.link || '');
  const publishedAt = rawItem.isoDate || rawItem.pubDate || null;
  const normalizedDate = publishedAt && !Number.isNaN(new Date(publishedAt).getTime())
    ? new Date(publishedAt).toISOString()
    : null;

  const snippet = cleanSnippet(rawItem.contentSnippet || rawItem.content || rawItem.summary || '');
  const title = decodeHtml(rawItem.title || 'Untitled headline').trim();

  const source = rawItem.source?.title || rawItem.source || rawItem.creator || hostFromUrl(link) || feedTopic;

  const idSeed = link || `${title}-${source}-${normalizedDate || ''}`;
  const id = `${feedTopic.replace(/\s+/g, '-')}-${createStableId(idSeed)}`;

  return {
    id,
    title,
    snippet: snippet || 'No summary available yet.',
    topic: feedTopic,
    source,
    url: link,
    publishedAt: normalizedDate,
    priority: Boolean(feed.priority)
  };
}

async function fetchFeedArticles(feed) {
  try {
    const parsed = await parser.parseURL(feed.url);
    if (!parsed?.items?.length) {
      return [];
    }
    return parsed.items
      .slice(0, feed.limit || 4)
      .map((item) => normalizeArticle(item, feed));
  } catch (error) {
    console.warn(`[NewsAgent] Failed to load feed ${feed.topic}:`, error.message);
    return [];
  }
}

function dedupeArticles(articles = []) {
  const seen = new Set();
  return articles.filter((article) => {
    const key = article.url || `${article.title}-${article.source}`;
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fallbackSummary(articles) {
  return articles
    .slice(0, Math.min(articles.length, 4))
    .map((article, index) => `${index + 1}. ${article.title}${article.source ? ` — ${article.source}` : ''}`)
    .join('\n');
}

async function buildNewsDigest(limit = DEFAULT_LIMIT) {
  const feedResults = await Promise.all(FEEDS.map((feed) => fetchFeedArticles(feed)));
  const combined = dedupeArticles(feedResults.flat());

  combined.sort((a, b) => {
    const aTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
    const bTime = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
    return bTime - aTime;
  });

  const signHighlights = combined.filter((article) => article.priority);
  const generalPool = combined.filter((article) => !article.priority);

  const selectedSign = signHighlights.slice(0, Math.min(SIGN_LIMIT, signHighlights.length));
  const remainingSlots = Math.max(limit - selectedSign.length, 0);
  const selectedGeneral = generalPool.slice(0, remainingSlots);

  const items = [...selectedSign, ...selectedGeneral];
  const generalItems = generalPool.slice(0, Math.max(limit - selectedSign.length, limit));

  if (!items.length) {
    throw new Error('No news articles available right now.');
  }

  let summaryText = null;
  let modelUsed = null;

  if (hasHuggingFaceKey) {
    const { text, model } = await summarizeArticlesForNews(items);
    summaryText = text;
    modelUsed = model || resolveNewsModel();
  }

  if (!summaryText) {
    summaryText = fallbackSummary(items);
  }

  return {
    summary: summaryText,
    items,
    signHighlights: selectedSign,
    generalItems,
    model: modelUsed,
    generatedAt: new Date().toISOString()
  };
}

module.exports = {
  buildNewsDigest
};
