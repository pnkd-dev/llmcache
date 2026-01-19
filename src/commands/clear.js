/**
 * Clear command - Clear cache entries
 * @module commands/clear
 */

const { clear } = require('../core/cache');
const { success, error, warning, info, dim } = require('../utils/output');
const { maybeShowProTip } = require('../utils/upsell');

/**
 * Execute clear command
 * @param {Object} options
 */
function execute(options = {}) {
  const { global, path: customPath, olderThan, force, yes } = options;

  // Require confirmation unless --yes or --force
  if (!yes && !force && !olderThan) {
    warning('This will delete ALL cache entries!');
    dim('Use --yes to confirm, or --older-than to clear old entries only');
    return { success: false, requiresConfirmation: true };
  }

  const result = clear({
    global,
    customPath,
    olderThan,
  });

  if (result.success) {
    if (result.removed > 0) {
      if (olderThan) {
        success(`Cleared ${result.removed} entries older than ${olderThan} days`);
      } else {
        success(`Cleared all ${result.removed} cache entries`);
      }
    } else {
      info('No entries to clear');
    }
  } else {
    error(result.message || 'Failed to clear cache');
  }

  maybeShowProTip('clear');

  return result;
}

module.exports = { execute };
