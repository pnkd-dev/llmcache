/**
 * License and pricing constants
 * @module license/constants
 */

const PRO_PRICE = '$18.99';
const PRO_URL = 'https://pnkd.dev/llmcache#pro';

// FREE tier limits
const FREE_LIMITS = {
  maxEntries: 50,
  maxResponseSize: 10 * 1024, // 10KB
};

// Model pricing per 1M tokens (2024 rates)
const MODEL_PRICING = {
  'gpt-4-turbo': { input: 10.00, output: 30.00 },
  'gpt-4': { input: 30.00, output: 60.00 },
  'gpt-4o': { input: 5.00, output: 15.00 },
  'gpt-4o-mini': { input: 0.15, output: 0.60 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50 },
  'claude-3-opus': { input: 15.00, output: 75.00 },
  'claude-3-sonnet': { input: 3.00, output: 15.00 },
  'claude-3.5-sonnet': { input: 3.00, output: 15.00 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'llama-3-70b': { input: 0.00, output: 0.00 },
  'llama-3-8b': { input: 0.00, output: 0.00 },
  'mistral-large': { input: 4.00, output: 12.00 },
  'mistral-medium': { input: 2.70, output: 8.10 },
  'default': { input: 0.50, output: 1.50 },
};

// Cross-promotion products
const CROSS_PROMO = {
  ctxstuff: { name: 'ctxstuff PRO', desc: 'Pack code for LLMs', price: '$14.99', url: 'https://pnkd.dev/ctxstuff' },
  aiproxy: { name: 'aiproxy PRO', desc: 'One API for all LLMs', price: '$18.99', url: 'https://pnkd.dev/aiproxy' },
};

module.exports = {
  PRO_PRICE,
  PRO_URL,
  FREE_LIMITS,
  MODEL_PRICING,
  CROSS_PROMO,
};
