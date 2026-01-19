/**
 * Cost module tests
 */

const { calculateCost, estimateCost, getModelPricing, listSupportedModels } = require('../src/core/cost');
const { MODEL_PRICING } = require('../src/license/constants');

describe('calculateCost', () => {
  test('calculates GPT-4 output cost', () => {
    const cost = calculateCost(1000, 'gpt-4', 'output');
    expect(cost).toBeCloseTo(MODEL_PRICING['gpt-4'].output / 1000, 6);
  });

  test('calculates GPT-4 input cost', () => {
    const cost = calculateCost(1000, 'gpt-4', 'input');
    expect(cost).toBeCloseTo(MODEL_PRICING['gpt-4'].input / 1000, 6);
  });

  test('calculates GPT-3.5-turbo cost', () => {
    const cost = calculateCost(1000000, 'gpt-3.5-turbo', 'output');
    expect(cost).toBeCloseTo(MODEL_PRICING['gpt-3.5-turbo'].output, 2);
  });

  test('uses GPT-4 pricing for unknown model', () => {
    const cost = calculateCost(1000, 'unknown-model', 'output');
    const gpt4Cost = calculateCost(1000, 'gpt-4', 'output');
    expect(cost).toBe(gpt4Cost);
  });

  test('returns 0 for 0 tokens', () => {
    const cost = calculateCost(0, 'gpt-4', 'output');
    expect(cost).toBe(0);
  });
});

describe('estimateCost', () => {
  test('returns cost breakdown', () => {
    const result = estimateCost('Hello world', 'This is a response', 'gpt-4');
    expect(result).toHaveProperty('inputTokens');
    expect(result).toHaveProperty('outputTokens');
    expect(result).toHaveProperty('totalTokens');
    expect(result).toHaveProperty('inputCost');
    expect(result).toHaveProperty('outputCost');
    expect(result).toHaveProperty('totalCost');
    expect(result).toHaveProperty('model');
  });

  test('estimates token count', () => {
    const result = estimateCost('Test', 'Response', 'gpt-4');
    expect(result.inputTokens).toBeGreaterThan(0);
    expect(result.outputTokens).toBeGreaterThan(0);
  });

  test('total equals input + output', () => {
    const result = estimateCost('Test prompt', 'Test response', 'gpt-4');
    expect(result.totalTokens).toBe(result.inputTokens + result.outputTokens);
    expect(result.totalCost).toBeCloseTo(result.inputCost + result.outputCost, 10);
  });
});

describe('getModelPricing', () => {
  test('returns pricing for known model', () => {
    const pricing = getModelPricing('gpt-4');
    expect(pricing).toHaveProperty('input');
    expect(pricing).toHaveProperty('output');
  });

  test('returns null for unknown model', () => {
    const pricing = getModelPricing('nonexistent-model');
    expect(pricing).toBeNull();
  });

  test('pricing values are numbers', () => {
    const pricing = getModelPricing('gpt-4');
    expect(typeof pricing.input).toBe('number');
    expect(typeof pricing.output).toBe('number');
  });
});

describe('listSupportedModels', () => {
  test('returns array of model names', () => {
    const models = listSupportedModels();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  test('includes common models', () => {
    const models = listSupportedModels();
    expect(models).toContain('gpt-4');
    expect(models).toContain('gpt-3.5-turbo');
    expect(models).toContain('claude-3-opus');
  });
});
