/**
 * Import command - Import cache data
 * @module commands/import
 */

const fs = require('fs');
const { importCache } = require('../core/cache');
const { success, error, info, dim } = require('../utils/output');
const { maybeShowProTip } = require('../utils/upsell');

/**
 * Execute import command
 * @param {string} input - Input file path
 * @param {Object} options
 */
function execute(input, options = {}) {
  const { global, path: customPath, strategy = 'merge' } = options;

  // Validate strategy
  const validStrategies = ['merge', 'replace', 'skip-existing'];
  if (!validStrategies.includes(strategy)) {
    error(`Invalid strategy: ${strategy}`);
    info(`Valid strategies: ${validStrategies.join(', ')}`);
    return { success: false };
  }

  // Read input file
  if (!fs.existsSync(input)) {
    error(`File not found: ${input}`);
    return { success: false };
  }

  let data;
  try {
    const content = fs.readFileSync(input, 'utf-8');
    data = JSON.parse(content);
  } catch (err) {
    error(`Failed to parse import file: ${err.message}`);
    return { success: false };
  }

  // Validate structure
  if (!data.entries || typeof data.entries !== 'object') {
    error('Invalid import file format: missing entries');
    return { success: false };
  }

  const result = importCache(data, {
    global,
    customPath,
    strategy,
  });

  if (result.success) {
    success(`Imported ${result.imported} entries`);
    dim(`Strategy: ${strategy}`);

    if (result.skipped) {
      info(`Skipped ${result.skipped} existing entries`);
    }
  } else {
    error(result.message || 'Failed to import cache');
  }

  maybeShowProTip('import');

  return result;
}

module.exports = { execute };
