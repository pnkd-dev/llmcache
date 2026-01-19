/**
 * Init command - Initialize cache
 * @module commands/init
 */

const { init } = require('../core/cache');
const { BACKENDS } = require('../core/storage');
const { isPro } = require('../license/checker');
const { success, error, info, dim } = require('../utils/output');
const { maybeShowProTip } = require('../utils/upsell');

/**
 * Execute init command
 * @param {Object} options
 */
function execute(options = {}) {
  const { global, backend = 'json', path: customPath } = options;

  // Validate backend
  const backendType = backend.toLowerCase();
  if (!Object.values(BACKENDS).includes(backendType)) {
    error(`Unknown backend: ${backend}`);
    info(`Available backends: ${Object.values(BACKENDS).join(', ')}`);
    return { success: false };
  }

  // Check PRO for non-JSON backends
  if (backendType !== BACKENDS.JSON && !isPro()) {
    error(`${backendType} backend requires PRO license`);
    dim('JSON backend is available in FREE version');
    return { success: false, proRequired: true };
  }

  const result = init({
    global,
    backend: backendType,
    customPath,
  });

  if (result.success) {
    success(`Cache initialized at ${result.path}`);
    info(`Backend: ${result.backend || 'json'}`);
    if (!global && !customPath) {
      dim('Using local .llmcache directory');
    }
  } else {
    if (result.message === 'Cache already exists') {
      info(`Cache already exists at ${result.path}`);
    } else {
      error(result.message || 'Failed to initialize cache');
    }
  }

  maybeShowProTip('init');

  return result;
}

module.exports = { execute };
