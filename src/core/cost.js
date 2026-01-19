/**
 * Cost tracking and calculation
 * @module core/cost
 * PRO feature
 */

const { isPro } = require('../license/checker');
const { MODEL_PRICING } = require('../license/constants');

/**
 * Calculate cost for tokens
 * @param {number} tokens - Token count
 * @param {string} model - Model name
 * @param {string} type - 'input' or 'output'
 * @returns {number} Cost in dollars
 */
function calculateCost(tokens, model = 'gpt-4', type = 'output') {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING['gpt-4'];
  const pricePerToken = type === 'input' ? pricing.input : pricing.output;
  return (tokens / 1000000) * pricePerToken;
}

/**
 * Get cost saved from cache hit
 * @param {Object} entry - Cache entry
 * @returns {Object} { tokens, cost, model }
 */
function getCostSaved(entry) {
  if (!isPro()) {
    return { tokens: 0, cost: 0, model: entry.model, proRequired: true };
  }

  const tokens = entry.tokens || Math.ceil(entry.response.length / 4);
  const cost = calculateCost(tokens, entry.model, 'output');

  return {
    tokens,
    cost,
    model: entry.model,
  };
}

/**
 * Calculate total savings from stats
 * @param {Object} storage - Storage instance
 * @returns {Object} Savings breakdown by model
 */
function calculateTotalSavings(storage) {
  if (!isPro()) {
    return { total: 0, byModel: {}, proRequired: true };
  }

  const entries = storage.list();
  const byModel = {};
  let totalTokens = 0;
  let totalCost = 0;

  for (const entry of entries) {
    const model = entry.model || 'default';
    const tokens = (entry.tokens || 0) * (entry.hits || 0);
    const cost = calculateCost(tokens, model, 'output');

    if (!byModel[model]) {
      byModel[model] = { tokens: 0, cost: 0, hits: 0 };
    }

    byModel[model].tokens += tokens;
    byModel[model].cost += cost;
    byModel[model].hits += entry.hits || 0;

    totalTokens += tokens;
    totalCost += cost;
  }

  return {
    total: totalCost,
    totalTokens,
    byModel,
  };
}

/**
 * Format cost report
 * @param {Object} savings - Savings data from calculateTotalSavings
 * @returns {Object} Formatted report
 */
function formatCostReport(savings) {
  if (savings.proRequired) {
    return null;
  }

  const report = {
    totalSaved: savings.total,
    totalTokens: savings.totalTokens,
    models: [],
  };

  for (const [model, data] of Object.entries(savings.byModel)) {
    report.models.push({
      model,
      tokens: data.tokens,
      cost: data.cost,
      hits: data.hits,
    });
  }

  // Sort by cost descending
  report.models.sort((a, b) => b.cost - a.cost);

  return report;
}

/**
 * Estimate cost for a prompt/response pair
 * @param {string} prompt - Input prompt
 * @param {string} response - Response text
 * @param {string} model - Model name
 * @returns {Object} Cost breakdown
 */
function estimateCost(prompt, response, model = 'gpt-4') {
  const inputTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(response.length / 4);

  const inputCost = calculateCost(inputTokens, model, 'input');
  const outputCost = calculateCost(outputTokens, model, 'output');

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
    model,
  };
}

/**
 * Get pricing info for a model
 * @param {string} model - Model name
 * @returns {Object|null} Pricing info
 */
function getModelPricing(model) {
  return MODEL_PRICING[model] || null;
}

/**
 * List all supported models
 * @returns {Array} Model names
 */
function listSupportedModels() {
  return Object.keys(MODEL_PRICING);
}

module.exports = {
  calculateCost,
  getCostSaved,
  calculateTotalSavings,
  formatCostReport,
  estimateCost,
  getModelPricing,
  listSupportedModels,
};
