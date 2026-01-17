// pnkd.dev/llmcache - LLM response cache

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CACHE_DIR = '.llmcache';
const INDEX_FILE = 'index.json';

function getCachePath(dir = '.') {
  return path.resolve(dir, CACHE_DIR);
}

function getIndexPath(dir = '.') {
  return path.join(getCachePath(dir), INDEX_FILE);
}

function loadIndex(dir = '.') {
  const indexPath = getIndexPath(dir);
  if (!fs.existsSync(indexPath)) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

function saveIndex(index, dir = '.') {
  const indexPath = getIndexPath(dir);
  fs.writeFileSync(indexPath, JSON.stringify(index, null, 2));
}

function init(dir = '.') {
  const cachePath = getCachePath(dir);
  if (fs.existsSync(cachePath)) {
    return { success: false, message: 'Cache already exists' };
  }

  fs.mkdirSync(cachePath, { recursive: true });

  const index = {
    entries: {},
    stats: {
      totalEntries: 0,
      totalHits: 0,
      totalSaved: 0
    }
  };

  saveIndex(index, dir);
  return { success: true, path: cachePath };
}

function hashPrompt(prompt, model = 'default') {
  const content = model + ':' + prompt;
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 12);
}

function set(prompt, response, model = 'default', dir = '.') {
  const index = loadIndex(dir);
  if (!index) {
    return { success: false, message: 'Cache not initialized. Run: llmcache init' };
  }

  const hash = hashPrompt(prompt, model);
  const isNew = !index.entries[hash];

  index.entries[hash] = {
    prompt: prompt,
    response: response,
    model: model,
    created: new Date().toISOString(),
    hits: 0
  };

  if (isNew) {
    index.stats.totalEntries++;
  }

  saveIndex(index, dir);
  return { success: true, hash: hash, isNew: isNew };
}

function get(prompt, model = 'default', dir = '.') {
  const index = loadIndex(dir);
  if (!index) {
    return null;
  }

  const hash = hashPrompt(prompt, model);
  const entry = index.entries[hash];

  if (!entry) {
    return null;
  }

  entry.hits++;
  index.stats.totalHits++;
  index.stats.totalSaved += entry.response.length;
  saveIndex(index, dir);

  return {
    response: entry.response,
    model: entry.model,
    hits: entry.hits,
    created: entry.created
  };
}

function list(dir = '.') {
  const index = loadIndex(dir);
  if (!index) {
    return [];
  }

  return Object.entries(index.entries).map(([hash, entry]) => ({
    hash: hash,
    model: entry.model,
    hits: entry.hits,
    prompt: entry.prompt.substring(0, 50) + (entry.prompt.length > 50 ? '...' : ''),
    created: entry.created
  }));
}

function stats(dir = '.') {
  const index = loadIndex(dir);
  if (!index) {
    return null;
  }

  const cachePath = getCachePath(dir);
  const indexPath = getIndexPath(dir);
  let size = 0;

  try {
    size = fs.statSync(indexPath).size;
  } catch (e) {
    size = 0;
  }

  return {
    entries: index.stats.totalEntries,
    totalHits: index.stats.totalHits,
    tokensSaved: Math.round(index.stats.totalSaved / 4),
    cacheSize: size
  };
}

function clear(options = {}, dir = '.') {
  const index = loadIndex(dir);
  if (!index) {
    return { success: false, message: 'Cache not initialized' };
  }

  let removed = 0;

  if (options.olderThan) {
    const days = parseInt(options.olderThan);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    for (const [hash, entry] of Object.entries(index.entries)) {
      if (new Date(entry.created) < cutoff) {
        delete index.entries[hash];
        removed++;
      }
    }
    index.stats.totalEntries -= removed;
  } else {
    removed = Object.keys(index.entries).length;
    index.entries = {};
    index.stats = { totalEntries: 0, totalHits: 0, totalSaved: 0 };
  }

  saveIndex(index, dir);
  return { success: true, removed: removed };
}

function search(query, dir = '.') {
  const index = loadIndex(dir);
  if (!index) {
    return [];
  }

  const results = [];
  const queryLower = query.toLowerCase();

  for (const [hash, entry] of Object.entries(index.entries)) {
    if (entry.prompt.toLowerCase().includes(queryLower)) {
      results.push({
        hash: hash,
        model: entry.model,
        hits: entry.hits,
        prompt: entry.prompt.substring(0, 50) + (entry.prompt.length > 50 ? '...' : ''),
        created: entry.created
      });
    }
  }

  return results;
}

function exportCache(dir = '.') {
  const index = loadIndex(dir);
  if (!index) {
    return null;
  }
  return index;
}

module.exports = {
  init,
  hashPrompt,
  set,
  get,
  list,
  stats,
  clear,
  search,
  exportCache,
  loadIndex,
  getCachePath
};
