/**
 * Stats command - Show cache statistics
 * @module commands/stats
 */

const { stats } = require('../core/cache');
const { isPro } = require('../license/checker');
const { calculateTotalSavings } = require('../core/cost');
const { getStorage } = require('../core/cache');
const { colors, header, separator, formatBytes, formatNumber, formatMoney, dim, info, timeAgo } = require('../utils/output');
const { maybeShowProTip, maybeShowCrossPromo } = require('../utils/upsell');
const { getLimitStatus } = require('../license/limits');

/**
 * Execute stats command
 * @param {Object} options
 */
function execute(options = {}) {
  const { global, path: customPath, json } = options;

  const s = stats({ global, customPath });

  if (!s) {
    info('No cache found. Run: llmcache init');
    return { success: false };
  }

  if (json) {
    console.log(JSON.stringify(s, null, 2));
    return { success: true, stats: s };
  }

  header('Cache Statistics');
  separator();

  // Basic stats
  console.log(`  Entries:       ${colors.bold(formatNumber(s.entries))}`);
  console.log(`  Total Hits:    ${colors.bold(formatNumber(s.totalHits || 0))}`);
  console.log(`  Tokens Saved:  ${colors.bold(formatNumber(s.tokensSaved || 0))}`);
  console.log(`  Cache Size:    ${colors.bold(formatBytes(s.cacheSize || 0))}`);

  if (s.oldestEntry) {
    console.log(`  Oldest Entry:  ${timeAgo(s.oldestEntry)}`);
  }
  if (s.newestEntry) {
    console.log(`  Newest Entry:  ${timeAgo(s.newestEntry)}`);
  }

  // PRO: Cost savings
  if (isPro()) {
    const storage = getStorage({ global, customPath });
    if (storage) {
      const savings = calculateTotalSavings(storage);
      if (!savings.proRequired) {
        console.log('');
        console.log(colors.pro('  Cost Savings (PRO)'));
        console.log(`  Total Saved:   ${colors.price(formatMoney(savings.total))}`);

        if (Object.keys(savings.byModel).length > 0) {
          console.log('');
          for (const [model, data] of Object.entries(savings.byModel)) {
            console.log(`    ${model}: ${formatMoney(data.cost)} (${formatNumber(data.hits)} hits)`);
          }
        }
      }
    }
  }

  separator();

  // License status
  const limitStatus = getLimitStatus(s.entries);
  if (limitStatus.unlimited) {
    console.log(colors.pro('  PRO License - Unlimited entries'));
  } else {
    const remaining = limitStatus.maxEntries - limitStatus.currentEntries;
    const color = remaining < 10 ? colors.warning : colors.dim;
    console.log(color(`  FREE: ${s.entries}/${limitStatus.maxEntries} entries (${remaining} remaining)`));
  }

  console.log('');

  maybeShowProTip('stats');
  maybeShowCrossPromo();

  return { success: true, stats: s };
}

module.exports = { execute };
