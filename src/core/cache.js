/**
 * Cache operations
 * @module core/cache
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { createStorage, detectBackend, BACKENDS } = require('./storage');
const { isPro } = require('../license/checker');
const { canAddEntry, checkResponseSize } = require('../license/limits');

const LOCAL_CACHE_DIR = '.llmcache';
const GLOBAL_CACHE_DIR = path.join(os.homedir(), '.llmcache', 'cache');

/**
 * Get cache path
 * @param {boolean} global - Use global cache
 * @param {string} customPath - Custom cache path
 * @returns {string}
 */
function getCachePath(global = false, customPath = null) {
  if (customPath) return path.resolve(customPath);
  if (global) return GLOBAL_CACHE_DIR;

  // Look for local cache first
  if (fs.existsSync(path.resolve(LOCAL_CACHE_DIR))) {
    return path.resolve(LOCAL_CACHE_DIR);
  }

  // Fall back to global
  if (fs.existsSync(GLOBAL_CACHE_DIR)) {
    return GLOBAL_CACHE_DIR;
  }

  return path.resolve(LOCAL_CACHE_DIR);
}

/**
 * Hash prompt with model
 * @param {string} prompt
 * @param {string} model
 * @returns {string}
 */
function hashPrompt(prompt, model = 'default') {
  const content = model + ':' + prompt;
  return crypto.createHash('sha256').update(content).digest('hex').substring(0, 12);
}

/**
 * Initialize cache
 * @param {Object} options
 * @returns {Object}
 */
function init(options = {}) {
  const { global = false, backend = BACKENDS.JSON, customPath = null } = options;

  const cachePath = customPath
    ? path.resolve(customPath)
    : (global ? GLOBAL_CACHE_DIR : path.resolve(LOCAL_CACHE_DIR));

  // Check if already exists
  if (fs.existsSync(cachePath)) {
    return { success: false, message: 'Cache already exists', path: cachePath };
  }

  // Check PRO for non-JSON backends
  if (backend !== BACKENDS.JSON && !isPro()) {
    return { success: false, message: `${backend} backend is a PRO feature` };
  }

  const storage = createStorage(cachePath, backend);
  const result = storage.init();

  if (result.success) {
    return { success: true, path: cachePath, backend };
  }

  return result;
}

/**
 * Get storage instance for current cache
 * @param {Object} options
 * @returns {Object}
 */
function getStorage(options = {}) {
  const cachePath = getCachePath(options.global, options.customPath);

  if (!fs.existsSync(cachePath)) {
    return null;
  }

  const backend = detectBackend(cachePath);
  return createStorage(cachePath, backend);
}

/**
 * Set cache entry
 * @param {string} prompt
 * @param {string} response
 * @param {string} model
 * @param {Object} options
 * @returns {Object}
 */
function set(prompt, response, model = 'default', options = {}) {
  const storage = getStorage(options);
  if (!storage) {
    return { success: false, message: 'Cache not initialized. Run: llmcache init' };
  }

  // Check entry limit
  const stats = storage.getStats();
  const entryCheck = canAddEntry(stats.totalEntries);
  if (!entryCheck.allowed) {
    return { success: false, message: entryCheck.reason, limitExceeded: true };
  }

  // Check response size
  const sizeCheck = checkResponseSize(Buffer.byteLength(response, 'utf8'));
  if (!sizeCheck.allowed) {
    return { success: false, message: sizeCheck.reason, limitExceeded: true };
  }

  const hash = hashPrompt(prompt, model);

  const entry = {
    prompt,
    response,
    model,
    created: new Date().toISOString(),
    hits: 0,
    tokens: options.tokens || Math.ceil(response.length / 4),
  };

  // PRO: TTL support
  if (options.ttl && isPro()) {
    const ttlMs = parseTTL(options.ttl);
    if (ttlMs) {
      entry.expires = new Date(Date.now() + ttlMs).toISOString();
    }
  }

  // PRO: Tags support
  if (options.tags && isPro()) {
    entry.tags = options.tags;
  }

  const result = storage.set(hash, entry);

  if (result.success) {
    return {
      success: true,
      hash,
      isNew: result.isNew,
      tokens: entry.tokens,
    };
  }

  return result;
}

/**
 * Get cached response
 * @param {string} prompt
 * @param {string} model
 * @param {Object} options
 * @returns {Object|null}
 */
function get(prompt, model = 'default', options = {}) {
  const storage = getStorage(options);
  if (!storage) return null;

  const hash = hashPrompt(prompt, model);
  const entry = storage.get(hash);

  if (!entry) return null;

  // Check expiration (PRO)
  if (entry.expires && new Date(entry.expires) < new Date()) {
    storage.delete(hash);
    return null;
  }

  // Update hits
  entry.hits++;
  storage.set(hash, entry);

  // Update global stats
  const stats = storage.getStats();
  storage.updateStats && storage.updateStats({
    totalHits: (stats.totalHits || 0) + 1,
    totalSaved: (stats.totalSaved || 0) + Buffer.byteLength(entry.response, 'utf8'),
  });

  return {
    response: entry.response,
    model: entry.model,
    hits: entry.hits,
    created: entry.created,
    tokens: entry.tokens,
  };
}

/**
 * List cache entries
 * @param {Object} options
 * @returns {Array}
 */
function list(options = {}) {
  const storage = getStorage(options);
  if (!storage) return [];

  const entries = storage.list(options);

  return entries.map(e => ({
    hash: e.hash,
    model: e.model,
    hits: e.hits,
    prompt: e.prompt.substring(0, 50) + (e.prompt.length > 50 ? '...' : ''),
    created: e.created,
    tokens: e.tokens,
    tags: e.tags,
  }));
}

/**
 * Get cache statistics
 * @param {Object} options
 * @returns {Object|null}
 */
function stats(options = {}) {
  const storage = getStorage(options);
  if (!storage) return null;

  const s = storage.getStats();
  const entries = storage.list();

  return {
    entries: s.totalEntries,
    totalHits: s.totalHits,
    tokensSaved: Math.round((s.totalSaved || 0) / 4),
    cacheSize: s.cacheSize,
    costSaved: s.costSaved || {},
    oldestEntry: entries.length > 0
      ? entries.reduce((a, b) => new Date(a.created) < new Date(b.created) ? a : b).created
      : null,
    newestEntry: entries.length > 0
      ? entries.reduce((a, b) => new Date(a.created) > new Date(b.created) ? a : b).created
      : null,
  };
}

/**
 * Clear cache entries
 * @param {Object} options
 * @returns {Object}
 */
function clear(options = {}) {
  const storage = getStorage(options);
  if (!storage) {
    return { success: false, message: 'Cache not initialized' };
  }

  return storage.clear(options);
}

/**
 * Search cache entries
 * @param {string} query
 * @param {Object} options
 * @returns {Array}
 */
function search(query, options = {}) {
  const storage = getStorage(options);
  if (!storage) return [];

  const entries = storage.list();
  const queryLower = query.toLowerCase();

  return entries
    .filter(e => e.prompt.toLowerCase().includes(queryLower))
    .map(e => ({
      hash: e.hash,
      model: e.model,
      hits: e.hits,
      prompt: e.prompt.substring(0, 50) + (e.prompt.length > 50 ? '...' : ''),
      created: e.created,
    }));
}

/**
 * Export cache data
 * @param {Object} options
 * @returns {Object|null}
 */
function exportCache(options = {}) {
  const storage = getStorage(options);
  if (!storage) return null;

  return storage.exportData();
}

/**
 * Import cache data
 * @param {Object} data
 * @param {Object} options
 * @returns {Object}
 */
function importCache(data, options = {}) {
  const storage = getStorage(options);
  if (!storage) {
    return { success: false, message: 'Cache not initialized' };
  }

  return storage.importData(data, options.strategy);
}

/**
 * Parse TTL string to milliseconds
 * @param {string} ttl - e.g., "7d", "24h", "30m"
 * @returns {number|null}
 */
function parseTTL(ttl) {
  const match = ttl.match(/^(\d+)(d|h|m|s)$/);
  if (!match) return null;

  const value = parseInt(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'd': return value * 86400000;
    case 'h': return value * 3600000;
    case 'm': return value * 60000;
    case 's': return value * 1000;
    default: return null;
  }
}

module.exports = {
  getCachePath,
  hashPrompt,
  init,
  getStorage,
  set,
  get,
  list,
  stats,
  clear,
  search,
  exportCache,
  importCache,
  parseTTL,
  LOCAL_CACHE_DIR,
  GLOBAL_CACHE_DIR,
};
