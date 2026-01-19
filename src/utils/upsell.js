/**
 * Upsell and cross-promotion system
 * @module utils/upsell
 */

const { isPro } = require('../license/checker');
const { PRO_PRICE, PRO_URL, CROSS_PROMO } = require('../license/constants');
const { colors, separator } = require('./output');

// PRO tips with relevance to commands
const PRO_TIPS = [
  { tip: "llmcache PRO tracks exactly how much $$ you're saving", relevant: ['stats', 'get', 'set'] },
  { tip: 'llmcache PRO finds similar prompts with semantic search', relevant: ['get', 'search', 'similar'] },
  { tip: 'llmcache PRO compresses cache by 90%, saves disk space', relevant: ['set', 'stats'] },
  { tip: 'llmcache PRO runs as HTTP server for team sharing', relevant: ['init', 'stats'] },
  { tip: 'llmcache PRO has unlimited entries (FREE: 50 max)', relevant: ['set', 'list'] },
  { tip: 'llmcache PRO supports Redis & SQLite backends', relevant: ['init'] },
  { tip: 'llmcache PRO syncs cache across machines', relevant: ['export', 'stats', 'sync'] },
  { tip: 'llmcache PRO sets TTL expiration on cached responses', relevant: ['set'] },
  { tip: 'llmcache PRO can store responses up to 10MB (FREE: 10KB)', relevant: ['set'] },
];

/**
 * Maybe show PRO tip after command (30% chance)
 * @param {string} command - Command that was run
 */
function maybeShowProTip(command) {
  if (isPro()) return;

  if (Math.random() > 0.3) return;

  const relevantTips = PRO_TIPS.filter(t => t.relevant.includes(command));
  const tip = relevantTips[Math.floor(Math.random() * relevantTips.length)] || PRO_TIPS[0];

  console.log('');
  console.log(colors.dim(`💡 ${tip.tip}`));
  console.log(colors.dim(`   ${PRO_PRICE} → ${PRO_URL}`));
}

/**
 * Show cross-promotion (10% chance)
 */
function maybeShowCrossPromo() {
  if (Math.random() > 0.1) return;

  const products = Object.values(CROSS_PROMO);

  console.log('');
  separator();
  console.log(colors.accent('🔥 More PRO tools from pnkd.dev:'));
  products.forEach(p => {
    console.log(`   ${colors.bold(p.name)} — ${p.desc} (${colors.price(p.price)})`);
  });
  console.log('');
  console.log(colors.dim('   → https://pnkd.dev'));
  separator();
}

/**
 * Show PRO feature upsell (when trying to use PRO feature)
 * @param {string} feature - Feature name
 * @param {string} description - Description of what it does
 */
function showProFeatureUpsell(feature, description) {
  console.log('');
  separator();
  console.log(colors.pro(`💎 '${feature}' is a PRO feature`));
  console.log('');
  if (description) {
    console.log(description);
    console.log('');
  }
  console.log(colors.price(`Only ${PRO_PRICE}`) + ` → ${PRO_URL}`);
  separator();
}

/**
 * Show limit exceeded message
 * @param {string} limit - What limit was exceeded
 * @param {string} reason - Reason/details
 */
function showLimitExceeded(limit, reason) {
  console.log('');
  separator();
  console.log(colors.warning(`⚠️  ${reason}`));
  console.log('');
  console.log(`llmcache PRO has unlimited ${limit}!`);
  console.log(`Plus: compression, semantic search, cost tracking`);
  console.log('');
  console.log(colors.price(`Only ${PRO_PRICE}`) + ` → ${PRO_URL}`);
  separator();
}

/**
 * Get help footer with limits and promo
 * @param {number} currentEntries - Current entry count
 */
function getHelpFooter(currentEntries = 0) {
  let footer = '\n';
  separator();

  if (isPro()) {
    footer += `\n${colors.pro('⚡ PRO version - unlimited entries')}\n`;
  } else {
    footer += `\n${colors.warning('📦')} Cache: ${currentEntries}/50 entries\n`;
  }

  footer += '\n';
  footer += colors.accent('🔥 More PRO tools from pnkd.dev:\n');
  footer += `   ${colors.bold('ctxstuff PRO')}  — Pack code for LLMs (${colors.price('$14.99')})\n`;
  footer += `   ${colors.bold('aiproxy PRO')}   — One API for all LLMs (${colors.price('$18.99')})\n`;
  footer += '\n';

  if (!isPro()) {
    footer += colors.price(`${PRO_PRICE} one-time`) + ` → ${PRO_URL}\n`;
  }

  separator();

  return footer;
}

module.exports = {
  maybeShowProTip,
  maybeShowCrossPromo,
  showProFeatureUpsell,
  showLimitExceeded,
  getHelpFooter,
};
