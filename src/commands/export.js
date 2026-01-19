/**
 * Export command - Export cache data
 * @module commands/export
 */

const fs = require('fs');
const { exportCache } = require('../core/cache');
const { success, error, info, dim, formatBytes } = require('../utils/output');
const { maybeShowProTip } = require('../utils/upsell');

/**
 * Execute export command
 * @param {string} output - Output file path
 * @param {Object} options
 */
function execute(output, options = {}) {
  const { global, path: customPath, pretty } = options;

  const data = exportCache({
    global,
    customPath,
  });

  if (!data) {
    error('No cache found to export');
    return { success: false };
  }

  const entryCount = Object.keys(data.entries || {}).length;

  if (entryCount === 0) {
    info('Cache is empty, nothing to export');
    return { success: false };
  }

  try {
    const jsonStr = pretty
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);

    if (output) {
      fs.writeFileSync(output, jsonStr);
      success(`Exported ${entryCount} entries to ${output}`);
      dim(`File size: ${formatBytes(Buffer.byteLength(jsonStr, 'utf8'))}`);
    } else {
      // Output to stdout
      console.log(jsonStr);
    }

    maybeShowProTip('export');

    return { success: true, entries: entryCount };
  } catch (err) {
    error(`Failed to export: ${err.message}`);
    return { success: false };
  }
}

module.exports = { execute };
