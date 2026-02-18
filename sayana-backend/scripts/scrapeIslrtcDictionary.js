#!/usr/bin/env node
/**
 * Scrapes the public ISLRTC Sign Learn dictionary (https://divyangjan.depwd.gov.in/islrtc)
 * to build sign asset metadata backed by official Indian Sign Language videos.
 * Output is written to data/signAssetLibrary.json by default.
 */

const fs = require('fs/promises');
const path = require('path');
const cheerio = require('cheerio');
const { fetch } = require('undici');
const { setTimeout: sleep } = require('node:timers/promises');

const RAW_BASE_URL = process.env.ISLRTC_BASE_URL || 'https://divyangjan.depwd.gov.in/islrtc';
const BASE_URL = RAW_BASE_URL.endsWith('/') ? RAW_BASE_URL : `${RAW_BASE_URL}/`;
const LETTERS = (process.env.ISLRTC_LETTERS || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ')
  .toUpperCase()
  .replace(/[^A-Z]/g, '')
  .split('');
const CONCURRENCY = Number(process.env.ISLRTC_CONCURRENCY || 6);
const THROTTLE_MS = Number(process.env.ISLRTC_THROTTLE_MS || 150);
const MAX_ITEMS = Number(process.env.ISLRTC_MAX_ITEMS || 0);
const OUTPUT_PATH = path.resolve(process.env.ISLRTC_OUTPUT_PATH || path.join(__dirname, '..', 'data', 'signAssetLibrary.json'));
const LICENSE_NOTE = 'Government Open Data License (GODL-India) — https://data.gov.in/government-open-data-license-india';
const ATTRIBUTION_NOTE = 'ISLRTC Sign Learn · Department of Empowerment of Persons with Disabilities (Govt. of India)';

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'sayana-sign-sync/1.0 (+https://github.com/AGILIZ/SAYANA-JP)',
      Accept: 'text/html,application/xhtml+xml',
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed (${response.status}) for ${url}`);
  }
  return response.text();
}

function absoluteUrl(href) {
  try {
    return new URL(href, BASE_URL).toString();
  } catch (error) {
    return null;
  }
}

function cleanDisplay(label = '') {
  return label.replace(/\(\s*\)/g, '').replace(/\s+/g, ' ').trim();
}

function stripSignSuffix(label = '') {
  return label.replace(/\(\s*Sign[^)]*\)/gi, '').trim();
}

function canonicalToken(label = '') {
  return stripSignSuffix(cleanDisplay(label)).toUpperCase();
}

function extractSynonyms(label = '') {
  const matches = label.match(/\(([^)]+)\)/g) || [];
  return matches
    .map((item) => item.replace(/[()]/g, '').trim())
    .filter((value) => value && !/sign\s*\d+/i.test(value))
    .map((value) => value.toUpperCase());
}

function parseCategory(raw = '') {
  const text = raw.replace(/^Category[:\-\s]*/i, '').trim();
  if (!text) return null;
  return text; // Keep bilingual label for transparency.
}

function parseYouTubeId(src = '') {
  if (!src) return null;
  try {
    const url = new URL(src, 'https://www.youtube.com');
    if (url.hostname.includes('youtube.com')) {
      if (url.pathname.startsWith('/embed/')) {
        return url.pathname.split('/').pop();
      }
      if (url.searchParams.has('v')) {
        return url.searchParams.get('v');
      }
    }
  } catch (error) {
    return null;
  }
  return null;
}

async function scrapeList(letter) {
  const url = `${BASE_URL}/listpage.php?type=${letter}`;
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const entries = [];
  $('a[href*="search.php?type=list"]').each((_, element) => {
    const href = $(element).attr('href');
    const label = cleanDisplay($(element).text());
    if (!href || !label) return;
    const targetUrl = absoluteUrl(href);
    if (!targetUrl) return;
    entries.push({ label, url: targetUrl });
  });
  return entries;
}

async function scrapeEntry(entry) {
  const html = await fetchHtml(entry.url);
  const $ = cheerio.load(html);
  const heading = cleanDisplay($('h4').first().text()) || entry.label;
  const categoryRaw = $('h5').first().text();
  const iframeSrc = $('iframe').first().attr('src');
  const videoSrc = $('video source').first().attr('src') || $('video').first().attr('src');

  let media = null;
  if (iframeSrc && iframeSrc.includes('youtube')) {
    const videoId = parseYouTubeId(iframeSrc);
    if (videoId) {
      media = {
        type: 'video',
        provider: 'youtube',
        url: `https://www.youtube.com/embed/${videoId}`,
        preview: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      };
    }
  } else if (videoSrc) {
    media = {
      type: 'video',
      provider: 'islrtc-media',
      url: absoluteUrl(videoSrc),
    };
  }

  if (!media?.url) {
    return null;
  }

  media.license = LICENSE_NOTE;
  media.attribution = ATTRIBUTION_NOTE;
  media.source = entry.url;

  const token = canonicalToken(heading);
  if (!token) {
    return null;
  }

  const synonyms = extractSynonyms(heading);
  const category = parseCategory(categoryRaw);

  return {
    token,
    display: stripSignSuffix(cleanDisplay(heading)) || entry.label,
    synonyms,
    category,
    media,
    sourceUrl: entry.url,
  };
}

function mergeEntry(store, payload) {
  if (!store.has(payload.token)) {
    store.set(payload.token, {
      token: payload.token,
      display: payload.display,
      synonyms: payload.synonyms || [],
      locales: ['en', 'en-IN'],
      media: [payload.media],
      category: payload.category || null,
      sourceUrl: payload.sourceUrl,
      notes: payload.category ? `Category: ${payload.category}` : null,
    });
    return;
  }

  const existing = store.get(payload.token);
  payload.synonyms.forEach((syn) => {
    if (syn && !existing.synonyms.includes(syn)) {
      existing.synonyms.push(syn);
    }
  });
  existing.media.push(payload.media);
  if (!existing.category && payload.category) {
    existing.category = payload.category;
    existing.notes = `Category: ${payload.category}`;
  }
}

async function buildLibrary() {
  let candidates = [];
  for (const letter of LETTERS) {
    try {
      const batch = await scrapeList(letter);
      candidates = candidates.concat(batch);
      console.log(`[ISLRTC] Letter ${letter}: ${batch.length} entries`);
    } catch (error) {
      console.warn(`[ISLRTC] Failed to scrape list for ${letter}: ${error.message}`);
    }
    await sleep(THROTTLE_MS);
  }

  const uniqueByUrl = new Map();
  candidates.forEach((item) => {
    if (!uniqueByUrl.has(item.url)) {
      uniqueByUrl.set(item.url, item);
    }
  });
  let pending = Array.from(uniqueByUrl.values());
  if (MAX_ITEMS > 0) {
    pending = pending.slice(0, MAX_ITEMS);
  }

  console.log(`[ISLRTC] Total entries queued: ${pending.length}`);

  const store = new Map();
  let index = 0;
  const errors = [];

  async function worker(id) {
    while (index < pending.length) {
      const current = index;
      index += 1;
      const entry = pending[current];
      try {
        const record = await scrapeEntry(entry);
        if (record) {
          mergeEntry(store, record);
        } else {
          console.warn(`[ISLRTC] Missing media for ${entry.label}`);
        }
      } catch (error) {
        errors.push({ url: entry.url, message: error.message });
        console.warn(`[ISLRTC] Worker ${id} failed ${entry.url}: ${error.message}`);
      }
      await sleep(THROTTLE_MS);
    }
  }

  const workers = Array.from({ length: Math.max(1, CONCURRENCY) }, (_, idx) => worker(idx + 1));
  await Promise.all(workers);

  const library = Array.from(store.values()).sort((a, b) => a.token.localeCompare(b.token));
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(library, null, 2)}\n`, 'utf-8');
  console.log(`[ISLRTC] Saved ${library.length} entries to ${OUTPUT_PATH}`);
  if (errors.length) {
    console.log(`[ISLRTC] ${errors.length} entries failed. See logs above.`);
  }
}

buildLibrary().catch((error) => {
  console.error('[ISLRTC] Fatal error:', error);
  process.exitCode = 1;
});
