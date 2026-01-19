/**
 * Cost command - Show cost savings (PRO)
 * @module commands/cost
 */

const { isPro } = require('../license/checker');
const { getStorage } = require('../core/cache');
const { calculateTotalSavings, formatCostReport, listSupportedModels, getModelPricing } = require('../core/cost');
const { colors, header, separator, formatNumber, formatMoney, dim, table } = require('../utils/output');
const { showProFeatureUpsell } = require('../utils/upsell');

/**
 * Execute cost command
 * @param {Object} options
 */
function execute(options = {}) {
  const { global, path: customPath, json, models: showModels } = options;

  // Show supported models
  if (showModels) {
    const modelList = listSupportedModels();
    if (json) {
      const pricing = {};
      for (const model of modelList) {
        pricing[model] = getModelPricing(model);
      }
      console.log(JSON.stringify(pricing, null, 2));
    } else {
      header('Supported Models & Pricing');
      separator();
      console.log('');
      const headers = ['Model', 'Input ($/1M)', 'Output ($/1M)'];
      const rows = modelList.map(m => {
        const p = getModelPricing(m);
        return [m, `$${p.input}`, `$${p.output}`];
      });
      table(headers, rows);
    }
    return { success: true };
  }

  // Check PRO
  if (!isPro()) {
    showProFeatureUpsell('cost tracking',
      'Track exactly how much money you\'re saving with cached responses.\n' +
      'See cost breakdown by model, estimate savings over time.'
    );
    return { success: false, proRequired: true };
  }

  const storage = getStorage({ global, customPath });
  if (!storage) {
    console.error(colors.error('No cache found. Run: llmcache init'));
    return { success: false };
  }

  const savings = calculateTotalSavings(storage);
  const report = formatCostReport(savings);

  if (!report) {
    console.error(colors.error('Failed to calculate savings'));
    return { success: false };
  }

  if (json) {
    console.log(JSON.stringify(report, null, 2));
    return { success: true, report };
  }

  header('Cost Savings Report');
  separator();

  console.log('');
  console.log(`  ${colors.bold('Total Saved:')}     ${colors.price(formatMoney(report.totalSaved))}`);
  console.log(`  ${colors.bold('Total Tokens:')}    ${formatNumber(report.totalTokens)}`);
  console.log('');

  if (report.models.length > 0) {
    console.log(colors.header('  By Model:'));
    console.log('');

    const headers = ['Model', 'Tokens', 'Hits', 'Saved'];
    const rows = report.models.map(m => [
      m.model,
      formatNumber(m.tokens),
      formatNumber(m.hits),
      formatMoney(m.cost),
    ]);

    table(headers, rows);
  }

  separator();
  dim('Cost estimates based on current API pricing');

  return { success: true, report };
}

module.exports = { execute };
