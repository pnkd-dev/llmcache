/**
 * llmcache - LLM Response Caching Tool
 * @module llmcache
 */

const cache = require('./core/cache');
const storage = require('./core/storage');
const cost = require('./core/cost');
const similarity = require('./core/similarity');
const compress = require('./core/compress');
const checker = require('./license/checker');
const limits = require('./license/limits');
const constants = require('./license/constants');

module.exports = {
  // Core cache operations
  init: cache.init,
  set: cache.set,
  get: cache.get,
  list: cache.list,
  stats: cache.stats,
  clear: cache.clear,
  search: cache.search,
  exportCache: cache.exportCache,
  importCache: cache.importCache,
  hashPrompt: cache.hashPrompt,
  getCachePath: cache.getCachePath,
  getStorage: cache.getStorage,

  // Storage
  BACKENDS: storage.BACKENDS,
  createStorage: storage.createStorage,
  detectBackend: storage.detectBackend,

  // Cost tracking (PRO)
  calculateCost: cost.calculateCost,
  getCostSaved: cost.getCostSaved,
  calculateTotalSavings: cost.calculateTotalSavings,
  estimateCost: cost.estimateCost,
  getModelPricing: cost.getModelPricing,
  listSupportedModels: cost.listSupportedModels,

  // Similarity search (PRO)
  findSimilar: similarity.findSimilar,
  getBestMatch: similarity.getBestMatch,

  // Compression (PRO)
  compress: compress.compress,
  decompress: compress.decompress,

  // License
  isPro: checker.isPro,
  activateLicense: checker.activateLicense,
  deactivateLicense: checker.deactivateLicense,
  getLicenseStatus: checker.getLicenseStatus,

  // Limits
  canAddEntry: limits.canAddEntry,
  checkResponseSize: limits.checkResponseSize,
  getLimitStatus: limits.getLimitStatus,

  // Constants
  FREE_LIMITS: constants.FREE_LIMITS,
  MODEL_PRICING: constants.MODEL_PRICING,
  PRO_PRICE: constants.PRO_PRICE,
  PRO_URL: constants.PRO_URL,
};
