/**
 * Set command - Cache a prompt/response pair
 * @module commands/set
 */

const fs = require('fs');
const { set } = require('../core/cache');
const { success, error, info, dim, formatBytes } = require('../utils/output');
const { maybeShowProTip, showLimitExceeded } = require('../utils/upsell');

/**
 * Execute set command
 * @param {string} prompt - Prompt text or @file path
 * @param {string} response - Response text or @file path
 * @param {Object} options
 */
function execute(prompt, response, options = {}) {
  const { model = 'default', global, path: customPath, ttl, tags } = options;

  // Handle file inputs
  let promptText = prompt;
  let responseText = response;

  if (prompt.startsWith('@')) {
    const filePath = prompt.substring(1);
    if (!fs.existsSync(filePath)) {
      error(`Prompt file not found: ${filePath}`);
      return { success: false };
    }
    promptText = fs.readFileSync(filePath, 'utf-8');
  }

  if (response.startsWith('@')) {
    const filePath = response.substring(1);
    if (!fs.existsSync(filePath)) {
      error(`Response file not found: ${filePath}`);
      return { success: false };
    }
    responseText = fs.readFileSync(filePath, 'utf-8');
  }

  // Parse tags
  let parsedTags = null;
  if (tags) {
    parsedTags = tags.split(',').map(t => t.trim()).filter(Boolean);
  }

  const result = set(promptText, responseText, model, {
    global,
    customPath,
    ttl,
    tags: parsedTags,
  });

  if (result.success) {
    if (result.isNew) {
      success(`Cached response (hash: ${result.hash})`);
    } else {
      info(`Updated existing cache entry (hash: ${result.hash})`);
    }
    dim(`Model: ${model} | Tokens: ~${result.tokens} | Size: ${formatBytes(Buffer.byteLength(responseText, 'utf8'))}`);
  } else {
    if (result.limitExceeded) {
      showLimitExceeded('cache entries', result.message);
    } else {
      error(result.message || 'Failed to cache response');
    }
  }

  maybeShowProTip('set');

  return result;
}

module.exports = { execute };
