/**
 * Cache module tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const cache = require('../src/core/cache');

// Test directory
const TEST_DIR = path.join(os.tmpdir(), 'llmcache-test-' + Date.now());
const TEST_CACHE = path.join(TEST_DIR, '.llmcache');

beforeAll(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('hashPrompt', () => {
  test('returns 12-character hash', () => {
    const hash = cache.hashPrompt('test prompt', 'gpt-4');
    expect(hash).toHaveLength(12);
  });

  test('same input produces same hash', () => {
    const hash1 = cache.hashPrompt('hello', 'gpt-4');
    const hash2 = cache.hashPrompt('hello', 'gpt-4');
    expect(hash1).toBe(hash2);
  });

  test('different prompts produce different hashes', () => {
    const hash1 = cache.hashPrompt('hello', 'gpt-4');
    const hash2 = cache.hashPrompt('world', 'gpt-4');
    expect(hash1).not.toBe(hash2);
  });

  test('different models produce different hashes', () => {
    const hash1 = cache.hashPrompt('hello', 'gpt-4');
    const hash2 = cache.hashPrompt('hello', 'claude');
    expect(hash1).not.toBe(hash2);
  });

  test('uses default model when not specified', () => {
    const hash1 = cache.hashPrompt('hello');
    const hash2 = cache.hashPrompt('hello', 'default');
    expect(hash1).toBe(hash2);
  });
});

describe('init', () => {
  test('initializes cache successfully', () => {
    const result = cache.init({ customPath: TEST_CACHE });
    expect(result.success).toBe(true);
    expect(result.path).toBe(TEST_CACHE);
  });

  test('reports existing cache', () => {
    const result = cache.init({ customPath: TEST_CACHE });
    expect(result.success).toBe(false);
    expect(result.message).toBe('Cache already exists');
  });

  test('creates index.json file', () => {
    expect(fs.existsSync(path.join(TEST_CACHE, 'index.json'))).toBe(true);
  });
});

describe('set', () => {
  test('caches prompt/response pair', () => {
    const result = cache.set('What is AI?', 'AI is artificial intelligence.', 'gpt-4', { customPath: TEST_CACHE });
    expect(result.success).toBe(true);
    expect(result.hash).toHaveLength(12);
    expect(result.isNew).toBe(true);
  });

  test('updates existing entry', () => {
    const result = cache.set('What is AI?', 'AI is artificial intelligence v2.', 'gpt-4', { customPath: TEST_CACHE });
    expect(result.success).toBe(true);
    expect(result.isNew).toBe(false);
  });

  test('calculates token count', () => {
    const result = cache.set('New prompt', 'This is a response.', 'default', { customPath: TEST_CACHE });
    expect(result.tokens).toBeGreaterThan(0);
  });

  test('fails without initialized cache', () => {
    const badPath = path.join(TEST_DIR, 'nonexistent');
    const result = cache.set('prompt', 'response', 'default', { customPath: badPath });
    expect(result.success).toBe(false);
  });
});

describe('get', () => {
  test('retrieves cached response', () => {
    cache.set('cached prompt', 'cached response', 'test-model', { customPath: TEST_CACHE });
    const result = cache.get('cached prompt', 'test-model', { customPath: TEST_CACHE });
    expect(result).not.toBeNull();
    expect(result.response).toBe('cached response');
    expect(result.model).toBe('test-model');
  });

  test('returns null for cache miss', () => {
    const result = cache.get('nonexistent prompt', 'default', { customPath: TEST_CACHE });
    expect(result).toBeNull();
  });

  test('increments hit counter', () => {
    cache.set('hit test', 'response', 'default', { customPath: TEST_CACHE });
    cache.get('hit test', 'default', { customPath: TEST_CACHE });
    const result = cache.get('hit test', 'default', { customPath: TEST_CACHE });
    expect(result.hits).toBeGreaterThan(1);
  });

  test('model mismatch returns null', () => {
    cache.set('model test', 'response', 'gpt-4', { customPath: TEST_CACHE });
    const result = cache.get('model test', 'claude', { customPath: TEST_CACHE });
    expect(result).toBeNull();
  });
});

describe('list', () => {
  test('returns array of entries', () => {
    const entries = cache.list({ customPath: TEST_CACHE });
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
  });

  test('entries have required fields', () => {
    const entries = cache.list({ customPath: TEST_CACHE });
    const entry = entries[0];
    expect(entry).toHaveProperty('hash');
    expect(entry).toHaveProperty('model');
    expect(entry).toHaveProperty('prompt');
    expect(entry).toHaveProperty('created');
  });

  test('truncates long prompts', () => {
    const longPrompt = 'x'.repeat(100);
    cache.set(longPrompt, 'response', 'default', { customPath: TEST_CACHE });
    const entries = cache.list({ customPath: TEST_CACHE });
    const entry = entries.find(e => e.prompt.startsWith('xxx'));
    expect(entry.prompt.length).toBeLessThanOrEqual(53); // 50 + '...'
  });
});

describe('stats', () => {
  test('returns statistics object', () => {
    const s = cache.stats({ customPath: TEST_CACHE });
    expect(s).not.toBeNull();
    expect(s).toHaveProperty('entries');
    expect(s).toHaveProperty('totalHits');
    expect(s).toHaveProperty('tokensSaved');
    expect(s).toHaveProperty('cacheSize');
  });

  test('entries count is correct', () => {
    const s = cache.stats({ customPath: TEST_CACHE });
    const entries = cache.list({ customPath: TEST_CACHE });
    expect(s.entries).toBe(entries.length);
  });

  test('returns null for uninitialized cache', () => {
    const s = cache.stats({ customPath: path.join(TEST_DIR, 'nope') });
    expect(s).toBeNull();
  });
});

describe('search', () => {
  beforeAll(() => {
    cache.set('Python programming basics', 'Learn Python...', 'default', { customPath: TEST_CACHE });
    cache.set('JavaScript tutorial', 'Learn JS...', 'default', { customPath: TEST_CACHE });
  });

  test('finds matching entries', () => {
    const results = cache.search('Python', { customPath: TEST_CACHE });
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].prompt).toContain('Python');
  });

  test('case insensitive search', () => {
    const results = cache.search('python', { customPath: TEST_CACHE });
    expect(results.length).toBeGreaterThan(0);
  });

  test('returns empty array for no matches', () => {
    const results = cache.search('xyznonexistent', { customPath: TEST_CACHE });
    expect(results).toEqual([]);
  });
});

describe('clear', () => {
  const clearCachePath = path.join(TEST_DIR, 'clear-test');

  beforeEach(() => {
    cache.init({ customPath: clearCachePath });
    cache.set('entry1', 'response1', 'default', { customPath: clearCachePath });
    cache.set('entry2', 'response2', 'default', { customPath: clearCachePath });
  });

  afterEach(() => {
    fs.rmSync(clearCachePath, { recursive: true, force: true });
  });

  test('clears all entries', () => {
    const result = cache.clear({ customPath: clearCachePath });
    expect(result.success).toBe(true);
    expect(result.removed).toBe(2);

    const s = cache.stats({ customPath: clearCachePath });
    expect(s.entries).toBe(0);
  });
});

describe('export/import', () => {
  test('exports cache data', () => {
    const data = cache.exportCache({ customPath: TEST_CACHE });
    expect(data).not.toBeNull();
    expect(data).toHaveProperty('entries');
    expect(data).toHaveProperty('stats');
    expect(data).toHaveProperty('meta');
  });

  test('imports cache data', () => {
    const importPath = path.join(TEST_DIR, 'import-test');
    cache.init({ customPath: importPath });

    const data = cache.exportCache({ customPath: TEST_CACHE });
    const result = cache.importCache(data, { customPath: importPath });

    expect(result.success).toBe(true);
    expect(result.imported).toBeGreaterThan(0);

    fs.rmSync(importPath, { recursive: true, force: true });
  });
});

describe('parseTTL', () => {
  test('parses days', () => {
    expect(cache.parseTTL('7d')).toBe(7 * 86400000);
  });

  test('parses hours', () => {
    expect(cache.parseTTL('24h')).toBe(24 * 3600000);
  });

  test('parses minutes', () => {
    expect(cache.parseTTL('30m')).toBe(30 * 60000);
  });

  test('parses seconds', () => {
    expect(cache.parseTTL('60s')).toBe(60 * 1000);
  });

  test('returns null for invalid format', () => {
    expect(cache.parseTTL('invalid')).toBeNull();
    expect(cache.parseTTL('7')).toBeNull();
    expect(cache.parseTTL('7x')).toBeNull();
  });
});
