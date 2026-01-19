/**
 * Search command - Search cache entries
 * @module commands/search
 */

const { search } = require('../core/cache');
const { colors, table, info, dim, timeAgo } = require('../utils/output');
const { maybeShowProTip } = require('../utils/upsell');

/**
 * Execute search command
 * @param {string} query - Search query
 * @param {Object} options
 */
function execute(query, options = {}) {
  const { global, path: customPath, limit = 20, json } = options;

  if (!query || query.trim().length === 0) {
    info('Please provide a search query');
    return { success: false };
  }

  const results = search(query, {
    global,
    customPath,
  });

  const limitedResults = results.slice(0, parseInt(limit));

  if (results.length === 0) {
    info(`No entries found matching "${query}"`);
    maybeShowProTip('search');
    return { success: true, results: [] };
  }

  if (json) {
    console.log(JSON.stringify(limitedResults, null, 2));
    return { success: true, results: limitedResults };
  }

  console.log(colors.header(`\nSearch Results for "${query}" (${results.length} found)`));
  console.log('');

  const headers = ['Hash', 'Model', 'Hits', 'Prompt', 'Created'];
  const rows = limitedResults.map(e => [
    e.hash,
    e.model || 'default',
    e.hits || 0,
    e.prompt,
    timeAgo(e.created),
  ]);

  table(headers, rows);

  if (results.length > parseInt(limit)) {
    dim(`\nShowing ${limit} of ${results.length} results. Use --limit to see more.`);
  }

  maybeShowProTip('search');

  return { success: true, results: limitedResults };
}

module.exports = { execute };
