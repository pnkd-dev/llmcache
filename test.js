// pnkd.dev/llmcache - tests

const cache = require('./src/cache');
const fs = require('fs');
const path = require('path');

const TEST_DIR = '.test-cache-' + Date.now();

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log('\x1b[32m✓ ' + name + '\x1b[0m');
    passed++;
  } catch (e) {
    console.log('\x1b[31m✗ ' + name + '\x1b[0m');
    console.log('  ' + e.message);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function cleanup() {
  const cachePath = path.join(TEST_DIR, '.llmcache');
  if (fs.existsSync(cachePath)) {
    fs.rmSync(cachePath, { recursive: true });
  }
  if (fs.existsSync(TEST_DIR)) {
    fs.rmdirSync(TEST_DIR);
  }
}

// Setup
fs.mkdirSync(TEST_DIR, { recursive: true });

// Test init
test('init creates .llmcache directory', () => {
  const result = cache.init(TEST_DIR);
  assert(result.success, 'init should succeed');
  assert(fs.existsSync(path.join(TEST_DIR, '.llmcache')), '.llmcache should exist');
  assert(fs.existsSync(path.join(TEST_DIR, '.llmcache', 'index.json')), 'index.json should exist');
});

// Test hashPrompt
test('hashPrompt returns consistent hash', () => {
  const hash1 = cache.hashPrompt('test prompt', 'gpt-4');
  const hash2 = cache.hashPrompt('test prompt', 'gpt-4');
  assert(hash1 === hash2, 'Same prompt and model should produce same hash');
  assert(hash1.length === 12, 'Hash should be 12 characters');
});

test('different models produce different hashes', () => {
  const hash1 = cache.hashPrompt('test prompt', 'gpt-4');
  const hash2 = cache.hashPrompt('test prompt', 'claude');
  assert(hash1 !== hash2, 'Different models should produce different hashes');
});

// Test set
test('set stores entry', () => {
  const result = cache.set('What is 2+2?', '4', 'gpt-4', TEST_DIR);
  assert(result.success, 'set should succeed');
  assert(result.hash, 'should return hash');
  assert(result.isNew, 'should be new entry');
});

// Test get
test('get retrieves stored entry', () => {
  const result = cache.get('What is 2+2?', 'gpt-4', TEST_DIR);
  assert(result !== null, 'should find cached entry');
  assert(result.response === '4', 'should return correct response');
  assert(result.model === 'gpt-4', 'should return correct model');
});

test('get returns null for missing entry', () => {
  const result = cache.get('nonexistent prompt', 'gpt-4', TEST_DIR);
  assert(result === null, 'should return null for missing entry');
});

// Test list
test('list returns array', () => {
  const entries = cache.list(TEST_DIR);
  assert(Array.isArray(entries), 'list should return array');
  assert(entries.length > 0, 'should have entries');
  assert(entries[0].hash, 'entry should have hash');
  assert(entries[0].model, 'entry should have model');
});

// Test stats
test('stats returns object with counts', () => {
  const s = cache.stats(TEST_DIR);
  assert(s !== null, 'stats should not be null');
  assert(typeof s.entries === 'number', 'should have entries count');
  assert(typeof s.totalHits === 'number', 'should have totalHits');
  assert(typeof s.tokensSaved === 'number', 'should have tokensSaved');
  assert(typeof s.cacheSize === 'number', 'should have cacheSize');
});

// Test search
test('search finds matching prompts', () => {
  cache.set('How to write Python code?', 'Use print()', 'gpt-4', TEST_DIR);
  const results = cache.search('Python', TEST_DIR);
  assert(results.length > 0, 'should find matching entry');
  assert(results[0].prompt.toLowerCase().includes('python'), 'result should contain query');
});

test('search returns empty for no matches', () => {
  const results = cache.search('xyznonexistent123', TEST_DIR);
  assert(results.length === 0, 'should return empty array');
});

// Test clear
test('clear removes entries', () => {
  const before = cache.list(TEST_DIR).length;
  assert(before > 0, 'should have entries before clear');
  const result = cache.clear({}, TEST_DIR);
  assert(result.success, 'clear should succeed');
  assert(result.removed === before, 'should remove all entries');
  const after = cache.list(TEST_DIR).length;
  assert(after === 0, 'should have no entries after clear');
});

// Cleanup
cleanup();

console.log('\n' + passed + '/' + (passed + failed) + ' tests passed\n');

if (failed > 0) process.exit(1);
