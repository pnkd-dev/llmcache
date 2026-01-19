/**
 * List command - List cached entries
 * @module commands/list
 */

const { list } = require('../core/cache');
const { colors, table, dim, info, timeAgo } = require('../utils/output');
const { maybeShowProTip } = require('../utils/upsell');

/**
 * Execute list command
 * @param {Object} options
 */
function execute(options = {}) {
  const { model, limit = 20, sort, global, path: customPath, json } = options;

  const entries = list({
    model,
    limit: parseInt(limit),
    sort,
    global,
    customPath,
  });

  if (entries.length === 0) {
    info('No cached entries found');
    maybeShowProTip('list');
    return { success: true, entries: [] };
  }

  if (json) {
    console.log(JSON.stringify(entries, null, 2));
    return { success: true, entries };
  }

  console.log(colors.header(`\nCached Entries (${entries.length})`));
  console.log('');

  const headers = ['Hash', 'Model', 'Hits', 'Prompt', 'Created'];
  const rows = entries.map(e => [
    e.hash,
    e.model || 'default',
    e.hits || 0,
    e.prompt,
    timeAgo(e.created),
  ]);

  table(headers, rows);

  if (entries.length >= parseInt(limit)) {
    dim(`\nShowing first ${limit} entries. Use --limit to see more.`);
  }

  maybeShowProTip('list');

  return { success: true, entries };
}

module.exports = { execute };
