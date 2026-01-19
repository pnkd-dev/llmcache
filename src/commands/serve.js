/**
 * Serve command - HTTP server mode (PRO)
 * @module commands/serve
 */

const { isPro } = require('../license/checker');
const { get, set, list, stats, search } = require('../core/cache');
const { colors, success, info, dim, separator } = require('../utils/output');
const { showProFeatureUpsell } = require('../utils/upsell');

/**
 * Execute serve command
 * @param {Object} options
 */
function execute(options = {}) {
  const { port = 3377, host = 'localhost', global, path: customPath } = options;

  // Check PRO
  if (!isPro()) {
    showProFeatureUpsell('HTTP server',
      'Run llmcache as an HTTP server for team sharing.\n' +
      'REST API for caching, perfect for CI/CD pipelines.'
    );
    return { success: false, proRequired: true };
  }

  // Check for express
  let express;
  try {
    express = require('express');
  } catch (e) {
    console.error(colors.error('Express not installed'));
    info('Run: npm install express');
    return { success: false };
  }

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  const cacheOptions = { global, customPath };

  // Health check
  app.get('/health', (req, res) => {
    res.json({ status: 'ok', version: require('../../package.json').version });
  });

  // Get cached response
  app.get('/cache', (req, res) => {
    const { prompt, model = 'default' } = req.query;

    if (!prompt) {
      return res.status(400).json({ error: 'prompt is required' });
    }

    const result = get(prompt, model, cacheOptions);

    if (result) {
      res.json({ hit: true, ...result });
    } else {
      res.json({ hit: false });
    }
  });

  // Set cache entry
  app.post('/cache', (req, res) => {
    const { prompt, response, model = 'default', ttl, tags } = req.body;

    if (!prompt || !response) {
      return res.status(400).json({ error: 'prompt and response are required' });
    }

    const result = set(prompt, response, model, { ...cacheOptions, ttl, tags });

    if (result.success) {
      res.json(result);
    } else {
      res.status(result.limitExceeded ? 402 : 500).json(result);
    }
  });

  // List entries
  app.get('/cache/list', (req, res) => {
    const { model, limit = 100, sort } = req.query;
    const entries = list({ ...cacheOptions, model, limit: parseInt(limit), sort });
    res.json({ entries, count: entries.length });
  });

  // Search entries
  app.get('/cache/search', (req, res) => {
    const { q, limit = 20 } = req.query;

    if (!q) {
      return res.status(400).json({ error: 'q (query) is required' });
    }

    const results = search(q, cacheOptions);
    res.json({ results: results.slice(0, parseInt(limit)), total: results.length });
  });

  // Stats
  app.get('/stats', (req, res) => {
    const s = stats(cacheOptions);
    if (s) {
      res.json(s);
    } else {
      res.status(500).json({ error: 'Failed to get stats' });
    }
  });

  // Start server
  const server = app.listen(parseInt(port), host, () => {
    console.log('');
    separator();
    console.log(colors.pro('  llmcache PRO Server'));
    separator();
    console.log('');
    success(`Server running at http://${host}:${port}`);
    console.log('');
    console.log(colors.header('  Endpoints:'));
    console.log(`  GET  /health         Health check`);
    console.log(`  GET  /cache          Get cached response (?prompt=...&model=...)`);
    console.log(`  POST /cache          Set cache entry (JSON body)`);
    console.log(`  GET  /cache/list     List entries (?model=...&limit=...)`);
    console.log(`  GET  /cache/search   Search entries (?q=...)`);
    console.log(`  GET  /stats          Get statistics`);
    console.log('');
    dim('  Press Ctrl+C to stop');
    separator();
  });

  // Handle shutdown
  process.on('SIGINT', () => {
    console.log('');
    info('Shutting down server...');
    server.close(() => {
      success('Server stopped');
      process.exit(0);
    });
  });

  return { success: true, server };
}

module.exports = { execute };
