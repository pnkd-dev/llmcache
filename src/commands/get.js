/**
 * Get command - Retrieve cached response
 * @module commands/get
 */

const fs = require('fs');
const { get } = require('../core/cache');
const { colors, success, info, dim, warning } = require('../utils/output');
const { maybeShowProTip } = require('../utils/upsell');

/**
 * Execute get command
 * @param {string} prompt - Prompt text or @file path
 * @param {Object} options
 */
function execute(prompt, options = {}) {
  const { model = 'default', global, path: customPath, raw, output } = options;

  // Handle file input
  let promptText = prompt;

  if (prompt.startsWith('@')) {
    const filePath = prompt.substring(1);
    if (!fs.existsSync(filePath)) {
      console.error(colors.error('Prompt file not found: ' + filePath));
      return { success: false, hit: false };
    }
    promptText = fs.readFileSync(filePath, 'utf-8');
  }

  const result = get(promptText, model, {
    global,
    customPath,
  });

  if (result) {
    if (raw) {
      // Raw output - just the response
      console.log(result.response);
    } else {
      console.log(colors.hit('● CACHE HIT'));
      dim(`Hash: ${result.hash || 'N/A'} | Model: ${result.model} | Hits: ${result.hits}`);
      console.log('');
      console.log(result.response);
    }

    // Write to output file if specified
    if (output) {
      fs.writeFileSync(output, result.response);
      if (!raw) {
        info(`Response written to ${output}`);
      }
    }

    maybeShowProTip('get');

    return { success: true, hit: true, response: result.response };
  } else {
    if (!raw) {
      console.log(colors.miss('○ CACHE MISS'));
      dim('No cached response found for this prompt');
    }

    maybeShowProTip('get');

    return { success: true, hit: false };
  }
}

module.exports = { execute };
