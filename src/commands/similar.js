/**
 * Similar command - Find similar cached prompts (PRO)
 * @module commands/similar
 */

const fs = require('fs');
const { isPro } = require('../license/checker');
const { getStorage } = require('../core/cache');
const { findSimilar, getBestMatch } = require('../core/similarity');
const { colors, header, separator, table, dim, info, timeAgo } = require('../utils/output');
const { showProFeatureUpsell } = require('../utils/upsell');

/**
 * Execute similar command
 * @param {string} prompt - Prompt to find similar entries for
 * @param {Object} options
 */
function execute(prompt, options = {}) {
  const { global, path: customPath, threshold = 0.3, limit = 10, json, best } = options;

  // Check PRO
  if (!isPro()) {
    showProFeatureUpsell('semantic search',
      'Find similar prompts using TF-IDF semantic matching.\n' +
      'Get cache hits even when prompts are slightly different.'
    );
    return { success: false, proRequired: true };
  }

  // Handle file input
  let promptText = prompt;
  if (prompt.startsWith('@')) {
    const filePath = prompt.substring(1);
    if (!fs.existsSync(filePath)) {
      console.error(colors.error('Prompt file not found: ' + filePath));
      return { success: false };
    }
    promptText = fs.readFileSync(filePath, 'utf-8');
  }

  const storage = getStorage({ global, customPath });
  if (!storage) {
    console.error(colors.error('No cache found. Run: llmcache init'));
    return { success: false };
  }

  // Best match mode
  if (best) {
    const match = getBestMatch(promptText, storage, parseFloat(threshold));

    if (json) {
      console.log(JSON.stringify(match, null, 2));
      return { success: true, match };
    }

    if (match) {
      header('Best Match Found');
      separator();
      console.log('');
      console.log(`  ${colors.bold('Similarity:')} ${colors.hit((match.similarity * 100).toFixed(0) + '%')}`);
      console.log(`  ${colors.bold('Hash:')}       ${match.hash}`);
      console.log(`  ${colors.bold('Model:')}      ${match.model}`);
      console.log(`  ${colors.bold('Hits:')}       ${match.hits}`);
      console.log('');
      console.log(colors.dim('Prompt:'));
      console.log(match.prompt.substring(0, 200) + (match.prompt.length > 200 ? '...' : ''));
      console.log('');
      console.log(colors.dim('Response:'));
      console.log(match.response);
      separator();
    } else {
      info('No similar entries found above threshold');
    }

    return { success: true, match };
  }

  // Find all similar
  const result = findSimilar(promptText, storage, {
    threshold: parseFloat(threshold),
    limit: parseInt(limit),
  });

  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return { success: true, ...result };
  }

  if (result.results.length === 0) {
    info(`No similar entries found (threshold: ${threshold})`);
    dim('Try lowering the threshold with --threshold 0.2');
    return { success: true, results: [] };
  }

  header(`Similar Entries (${result.results.length} found)`);
  separator();
  console.log('');

  const headers = ['Score', 'Hash', 'Model', 'Hits', 'Prompt'];
  const rows = result.results.map(r => [
    (r.similarity * 100).toFixed(0) + '%',
    r.hash,
    r.model || 'default',
    r.hits || 0,
    r.prompt.substring(0, 40) + (r.prompt.length > 40 ? '...' : ''),
  ]);

  table(headers, rows);

  if (result.total > parseInt(limit)) {
    dim(`\nShowing ${limit} of ${result.total} matches. Use --limit to see more.`);
  }

  return { success: true, results: result.results };
}

module.exports = { execute };
