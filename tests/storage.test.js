/**
 * Storage module tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { JSONStorage, BACKENDS, createStorage, detectBackend } = require('../src/core/storage');

const TEST_DIR = path.join(os.tmpdir(), 'llmcache-storage-test-' + Date.now());

beforeAll(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('BACKENDS', () => {
  test('has JSON backend', () => {
    expect(BACKENDS.JSON).toBe('json');
  });

  test('has SQLite backend', () => {
    expect(BACKENDS.SQLITE).toBe('sqlite');
  });

  test('has Redis backend', () => {
    expect(BACKENDS.REDIS).toBe('redis');
  });
});

describe('JSONStorage', () => {
  const storagePath = path.join(TEST_DIR, 'json-storage');
  let storage;

  beforeAll(() => {
    storage = new JSONStorage(storagePath);
    storage.init();
  });

  describe('init', () => {
    test('creates cache directory', () => {
      expect(fs.existsSync(storagePath)).toBe(true);
    });

    test('creates index.json', () => {
      expect(fs.existsSync(path.join(storagePath, 'index.json'))).toBe(true);
    });

    test('returns success', () => {
      const newPath = path.join(TEST_DIR, 'new-storage');
      const newStorage = new JSONStorage(newPath);
      const result = newStorage.init();
      expect(result.success).toBe(true);
    });
  });

  describe('set/get', () => {
    test('stores and retrieves entry', () => {
      const entry = {
        prompt: 'test prompt',
        response: 'test response',
        model: 'gpt-4',
        created: new Date().toISOString(),
        hits: 0,
      };

      const setResult = storage.set('testhash', entry);
      expect(setResult.success).toBe(true);
      expect(setResult.isNew).toBe(true);

      const retrieved = storage.get('testhash');
      expect(retrieved).not.toBeNull();
      expect(retrieved.prompt).toBe('test prompt');
      expect(retrieved.response).toBe('test response');
    });

    test('updates existing entry', () => {
      const entry = {
        prompt: 'updated',
        response: 'updated response',
        model: 'gpt-4',
        created: new Date().toISOString(),
        hits: 5,
      };

      const result = storage.set('testhash', entry);
      expect(result.isNew).toBe(false);
    });

    test('returns null for nonexistent hash', () => {
      const result = storage.get('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    test('deletes existing entry', () => {
      storage.set('deleteme', { prompt: 'delete', response: 'me' });
      const result = storage.delete('deleteme');
      expect(result.success).toBe(true);
      expect(storage.get('deleteme')).toBeNull();
    });

    test('returns false for nonexistent entry', () => {
      const result = storage.delete('nonexistent');
      expect(result.success).toBe(false);
    });
  });

  describe('list', () => {
    test('returns all entries', () => {
      const entries = storage.list();
      expect(Array.isArray(entries)).toBe(true);
    });

    test('entries have hash property', () => {
      storage.set('listhash', { prompt: 'list test', response: 'response' });
      const entries = storage.list();
      const found = entries.find(e => e.hash === 'listhash');
      expect(found).toBeDefined();
    });
  });

  describe('getStats', () => {
    test('returns stats object', () => {
      const stats = storage.getStats();
      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('totalHits');
      expect(stats).toHaveProperty('cacheSize');
    });

    test('totalEntries matches list length', () => {
      const stats = storage.getStats();
      const entries = storage.list();
      expect(stats.totalEntries).toBe(entries.length);
    });
  });

  describe('updateStats', () => {
    test('updates stats values', () => {
      storage.updateStats({ totalHits: 100 });
      const stats = storage.getStats();
      expect(stats.totalHits).toBe(100);
    });
  });

  describe('clear', () => {
    test('clears all entries', () => {
      const clearPath = path.join(TEST_DIR, 'clear-storage');
      const clearStorage = new JSONStorage(clearPath);
      clearStorage.init();
      clearStorage.set('entry1', { prompt: 'p1', response: 'r1' });
      clearStorage.set('entry2', { prompt: 'p2', response: 'r2' });

      const result = clearStorage.clear();
      expect(result.success).toBe(true);
      expect(result.removed).toBe(2);
      expect(clearStorage.list()).toHaveLength(0);
    });
  });

  describe('exportData', () => {
    test('returns complete data structure', () => {
      const data = storage.exportData();
      expect(data).toHaveProperty('entries');
      expect(data).toHaveProperty('stats');
      expect(data).toHaveProperty('meta');
    });
  });

  describe('importData', () => {
    test('imports entries with merge strategy', () => {
      const importPath = path.join(TEST_DIR, 'import-storage');
      const importStorage = new JSONStorage(importPath);
      importStorage.init();

      const data = {
        entries: {
          import1: { prompt: 'imported', response: 'data' },
          import2: { prompt: 'more', response: 'data' },
        },
      };

      const result = importStorage.importData(data, 'merge');
      expect(result.success).toBe(true);
      expect(result.imported).toBe(2);
    });

    test('skip-existing strategy skips existing entries', () => {
      const skipPath = path.join(TEST_DIR, 'skip-storage');
      const skipStorage = new JSONStorage(skipPath);
      skipStorage.init();
      skipStorage.set('existing', { prompt: 'original', response: 'data' });

      const data = {
        entries: {
          existing: { prompt: 'new', response: 'data' },
          newentry: { prompt: 'fresh', response: 'data' },
        },
      };

      const result = skipStorage.importData(data, 'skip-existing');
      expect(result.imported).toBe(1);

      const entry = skipStorage.get('existing');
      expect(entry.prompt).toBe('original');
    });
  });
});

describe('createStorage', () => {
  test('creates JSONStorage by default', () => {
    const storage = createStorage(path.join(TEST_DIR, 'create1'));
    expect(storage).toBeInstanceOf(JSONStorage);
  });

  test('creates JSONStorage for json backend', () => {
    const storage = createStorage(path.join(TEST_DIR, 'create2'), BACKENDS.JSON);
    expect(storage).toBeInstanceOf(JSONStorage);
  });

  test('throws for Redis backend (not implemented)', () => {
    expect(() => {
      createStorage(path.join(TEST_DIR, 'create3'), BACKENDS.REDIS);
    }).toThrow('Redis backend not yet implemented');
  });
});

describe('detectBackend', () => {
  test('detects JSON backend', () => {
    const jsonPath = path.join(TEST_DIR, 'detect-json');
    fs.mkdirSync(jsonPath, { recursive: true });
    fs.writeFileSync(path.join(jsonPath, 'index.json'), '{}');

    const backend = detectBackend(jsonPath);
    expect(backend).toBe(BACKENDS.JSON);
  });

  test('detects SQLite backend', () => {
    const sqlitePath = path.join(TEST_DIR, 'detect-sqlite');
    fs.mkdirSync(sqlitePath, { recursive: true });
    fs.writeFileSync(path.join(sqlitePath, 'cache.db'), '');

    const backend = detectBackend(sqlitePath);
    expect(backend).toBe(BACKENDS.SQLITE);
  });
});
