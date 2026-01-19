/**
 * Storage backends
 * @module core/storage
 *
 * FREE: JSON file storage
 * PRO: SQLite, Redis
 */

const fs = require('fs');
const path = require('path');
const { isPro } = require('../license/checker');

/**
 * Storage backend types
 */
const BACKENDS = {
  JSON: 'json',
  SQLITE: 'sqlite',
  REDIS: 'redis',
};

/**
 * JSON File Storage (FREE)
 */
class JSONStorage {
  constructor(cachePath) {
    this.cachePath = cachePath;
    this.indexFile = path.join(cachePath, 'index.json');
  }

  init() {
    if (!fs.existsSync(this.cachePath)) {
      fs.mkdirSync(this.cachePath, { recursive: true });
    }

    if (!fs.existsSync(this.indexFile)) {
      this.save({
        entries: {},
        stats: {
          totalEntries: 0,
          totalHits: 0,
          totalSaved: 0,
          costSaved: {},
        },
        meta: {
          backend: BACKENDS.JSON,
          created: new Date().toISOString(),
        },
      });
    }

    return { success: true };
  }

  load() {
    try {
      if (!fs.existsSync(this.indexFile)) return null;
      return JSON.parse(fs.readFileSync(this.indexFile, 'utf-8'));
    } catch (e) {
      return null;
    }
  }

  save(data) {
    fs.writeFileSync(this.indexFile, JSON.stringify(data, null, 2));
  }

  get(hash) {
    const data = this.load();
    if (!data) return null;
    return data.entries[hash] || null;
  }

  set(hash, entry) {
    const data = this.load();
    if (!data) return { success: false, error: 'Storage not initialized' };

    const isNew = !data.entries[hash];
    data.entries[hash] = entry;

    if (isNew) {
      data.stats.totalEntries++;
    }

    this.save(data);
    return { success: true, isNew };
  }

  delete(hash) {
    const data = this.load();
    if (!data) return { success: false };

    if (data.entries[hash]) {
      delete data.entries[hash];
      data.stats.totalEntries--;
      this.save(data);
      return { success: true };
    }
    return { success: false };
  }

  list() {
    const data = this.load();
    if (!data) return [];
    return Object.entries(data.entries).map(([hash, entry]) => ({
      hash,
      ...entry,
    }));
  }

  getStats() {
    const data = this.load();
    if (!data) return null;

    let size = 0;
    try {
      size = fs.statSync(this.indexFile).size;
    } catch (e) {}

    return {
      ...data.stats,
      cacheSize: size,
    };
  }

  updateStats(updates) {
    const data = this.load();
    if (!data) return;

    Object.assign(data.stats, updates);
    this.save(data);
  }

  clear(options = {}) {
    const data = this.load();
    if (!data) return { success: false, removed: 0 };

    let removed = 0;

    if (options.olderThan) {
      const days = parseInt(options.olderThan);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      for (const [hash, entry] of Object.entries(data.entries)) {
        if (new Date(entry.created) < cutoff) {
          delete data.entries[hash];
          removed++;
        }
      }
      data.stats.totalEntries -= removed;
    } else {
      removed = Object.keys(data.entries).length;
      data.entries = {};
      data.stats = { totalEntries: 0, totalHits: 0, totalSaved: 0, costSaved: {} };
    }

    this.save(data);
    return { success: true, removed };
  }

  exportData() {
    return this.load();
  }

  importData(importedData, strategy = 'merge') {
    const data = this.load();
    if (!data) return { success: false, imported: 0 };

    let imported = 0;

    for (const [hash, entry] of Object.entries(importedData.entries || {})) {
      if (strategy === 'skip-existing' && data.entries[hash]) continue;
      if (strategy === 'replace' || !data.entries[hash]) {
        data.entries[hash] = entry;
        imported++;
      } else if (strategy === 'merge' && !data.entries[hash]) {
        data.entries[hash] = entry;
        imported++;
      }
    }

    data.stats.totalEntries = Object.keys(data.entries).length;
    this.save(data);

    return { success: true, imported };
  }
}

/**
 * SQLite Storage (PRO)
 */
class SQLiteStorage {
  constructor(cachePath) {
    this.cachePath = cachePath;
    this.dbPath = path.join(cachePath, 'cache.db');
    this.db = null;
  }

  init() {
    if (!isPro()) {
      return { success: false, error: 'SQLite backend is a PRO feature' };
    }

    try {
      const Database = require('better-sqlite3');
      this.db = new Database(this.dbPath);

      // Create tables
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS entries (
          hash TEXT PRIMARY KEY,
          prompt TEXT NOT NULL,
          response TEXT NOT NULL,
          model TEXT DEFAULT 'default',
          created TEXT NOT NULL,
          expires TEXT,
          hits INTEGER DEFAULT 0,
          tokens INTEGER DEFAULT 0,
          compressed INTEGER DEFAULT 0,
          tags TEXT
        );

        CREATE TABLE IF NOT EXISTS stats (
          key TEXT PRIMARY KEY,
          value TEXT
        );

        CREATE INDEX IF NOT EXISTS idx_model ON entries(model);
        CREATE INDEX IF NOT EXISTS idx_created ON entries(created);
      `);

      // Initialize stats
      const initStats = this.db.prepare('INSERT OR IGNORE INTO stats (key, value) VALUES (?, ?)');
      initStats.run('totalHits', '0');
      initStats.run('totalSaved', '0');
      initStats.run('costSaved', '{}');

      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  get(hash) {
    if (!this.db) return null;
    const stmt = this.db.prepare('SELECT * FROM entries WHERE hash = ?');
    return stmt.get(hash);
  }

  set(hash, entry) {
    if (!this.db) return { success: false, error: 'Database not initialized' };

    const existing = this.get(hash);
    const isNew = !existing;

    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO entries
      (hash, prompt, response, model, created, expires, hits, tokens, compressed, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      hash,
      entry.prompt,
      entry.response,
      entry.model || 'default',
      entry.created || new Date().toISOString(),
      entry.expires || null,
      entry.hits || 0,
      entry.tokens || 0,
      entry.compressed ? 1 : 0,
      entry.tags ? JSON.stringify(entry.tags) : null
    );

    return { success: true, isNew };
  }

  delete(hash) {
    if (!this.db) return { success: false };
    const stmt = this.db.prepare('DELETE FROM entries WHERE hash = ?');
    const result = stmt.run(hash);
    return { success: result.changes > 0 };
  }

  list(options = {}) {
    if (!this.db) return [];

    let sql = 'SELECT * FROM entries';
    const params = [];

    if (options.model) {
      sql += ' WHERE model = ?';
      params.push(options.model);
    }

    if (options.sort === 'hits') {
      sql += ' ORDER BY hits DESC';
    } else {
      sql += ' ORDER BY created DESC';
    }

    if (options.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);
    }

    const stmt = this.db.prepare(sql);
    return stmt.all(...params);
  }

  getStats() {
    if (!this.db) return null;

    const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM entries');
    const hitsStmt = this.db.prepare('SELECT SUM(hits) as total FROM entries');
    const sizeStmt = this.db.prepare('SELECT SUM(LENGTH(response)) as total FROM entries');

    let fileSize = 0;
    try {
      fileSize = fs.statSync(this.dbPath).size;
    } catch (e) {}

    return {
      totalEntries: countStmt.get().count,
      totalHits: hitsStmt.get().total || 0,
      totalSaved: sizeStmt.get().total || 0,
      cacheSize: fileSize,
    };
  }

  clear(options = {}) {
    if (!this.db) return { success: false, removed: 0 };

    let removed = 0;

    if (options.olderThan) {
      const days = parseInt(options.olderThan);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const stmt = this.db.prepare('DELETE FROM entries WHERE created < ?');
      const result = stmt.run(cutoff.toISOString());
      removed = result.changes;
    } else {
      const countStmt = this.db.prepare('SELECT COUNT(*) as count FROM entries');
      removed = countStmt.get().count;
      this.db.exec('DELETE FROM entries');
    }

    return { success: true, removed };
  }

  exportData() {
    if (!this.db) return null;

    const entries = {};
    const rows = this.db.prepare('SELECT * FROM entries').all();

    for (const row of rows) {
      entries[row.hash] = {
        prompt: row.prompt,
        response: row.response,
        model: row.model,
        created: row.created,
        hits: row.hits,
        tokens: row.tokens,
      };
    }

    return {
      entries,
      stats: this.getStats(),
      meta: { backend: BACKENDS.SQLITE },
    };
  }

  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

/**
 * Create storage instance based on backend type
 * @param {string} cachePath - Cache directory path
 * @param {string} backend - Backend type
 * @returns {Object} Storage instance
 */
function createStorage(cachePath, backend = BACKENDS.JSON) {
  switch (backend) {
    case BACKENDS.SQLITE:
      return new SQLiteStorage(cachePath);
    case BACKENDS.REDIS:
      // Redis would need async implementation
      throw new Error('Redis backend not yet implemented');
    case BACKENDS.JSON:
    default:
      return new JSONStorage(cachePath);
  }
}

/**
 * Detect existing backend type
 * @param {string} cachePath
 * @returns {string}
 */
function detectBackend(cachePath) {
  if (fs.existsSync(path.join(cachePath, 'cache.db'))) {
    return BACKENDS.SQLITE;
  }
  return BACKENDS.JSON;
}

module.exports = {
  BACKENDS,
  JSONStorage,
  SQLiteStorage,
  createStorage,
  detectBackend,
};
