/**
 * License module tests
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// Mock the license file path
const TEST_LICENSE_PATH = path.join(os.tmpdir(), 'llmcache-license-test-' + Date.now());
process.env.LLMCACHE_LICENSE_PATH = TEST_LICENSE_PATH;

const { isPro, activateLicense, deactivateLicense, getLicenseStatus } = require('../src/license/checker');
const { FREE_LIMITS, PRO_PRICE, MODEL_PRICING } = require('../src/license/constants');
const { canAddEntry, checkResponseSize, getLimitStatus, getRemainingEntries } = require('../src/license/limits');

afterAll(() => {
  if (fs.existsSync(TEST_LICENSE_PATH)) {
    fs.unlinkSync(TEST_LICENSE_PATH);
  }
});

describe('License Constants', () => {
  test('FREE_LIMITS has maxEntries', () => {
    expect(FREE_LIMITS.maxEntries).toBe(50);
  });

  test('FREE_LIMITS has maxResponseSize', () => {
    expect(FREE_LIMITS.maxResponseSize).toBe(10 * 1024);
  });

  test('PRO_PRICE is $18.99', () => {
    expect(PRO_PRICE).toBe('$18.99');
  });

  test('MODEL_PRICING has common models', () => {
    expect(MODEL_PRICING['gpt-4']).toBeDefined();
    expect(MODEL_PRICING['gpt-4-turbo']).toBeDefined();
    expect(MODEL_PRICING['gpt-3.5-turbo']).toBeDefined();
    expect(MODEL_PRICING['claude-3-opus']).toBeDefined();
  });

  test('MODEL_PRICING has input/output prices', () => {
    expect(MODEL_PRICING['gpt-4']).toHaveProperty('input');
    expect(MODEL_PRICING['gpt-4']).toHaveProperty('output');
  });
});

describe('isPro', () => {
  test('returns false when no license', () => {
    expect(isPro()).toBe(false);
  });
});

describe('activateLicense', () => {
  test('rejects empty key', () => {
    const result = activateLicense('');
    expect(result.success).toBe(false);
  });

  test('rejects null key', () => {
    const result = activateLicense(null);
    expect(result.success).toBe(false);
  });

  test('rejects invalid format', () => {
    const result = activateLicense('invalid-key');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid');
  });

  test('rejects key with wrong prefix', () => {
    const result = activateLicense('XXX-1234-5678-9012-3456');
    expect(result.success).toBe(false);
  });

  test('rejects key with invalid checksum', () => {
    const result = activateLicense('LMC-1234-5678-9012-0000');
    expect(result.success).toBe(false);
    expect(result.message).toContain('Invalid');
  });

  test('accepts valid key with correct checksum', () => {
    // Generate valid key
    const base = 'LMC-1234-5678-9012';
    const hash = crypto.createHash('md5').update(base).digest('hex');
    const checksum = hash.substring(0, 4).toUpperCase();
    const validKey = `${base}-${checksum}`;

    const result = activateLicense(validKey);
    expect(result.success).toBe(true);
  });
});

describe('isPro after activation', () => {
  test('returns true after valid activation', () => {
    expect(isPro()).toBe(true);
  });
});

describe('getLicenseStatus', () => {
  test('returns active status', () => {
    const status = getLicenseStatus();
    expect(status.active).toBe(true);
    expect(status.tier).toBe('pro');
  });

  test('includes masked key', () => {
    const status = getLicenseStatus();
    expect(status.key).toContain('****');
  });

  test('includes activation date', () => {
    const status = getLicenseStatus();
    expect(status.activatedAt).toBeDefined();
  });
});

describe('deactivateLicense', () => {
  test('deactivates license', () => {
    const result = deactivateLicense();
    expect(result.success).toBe(true);
  });

  test('isPro returns false after deactivation', () => {
    expect(isPro()).toBe(false);
  });

  test('returns error when no license to deactivate', () => {
    const result = deactivateLicense();
    expect(result.success).toBe(false);
  });
});

describe('License Limits', () => {
  describe('canAddEntry', () => {
    test('allows entry under limit', () => {
      const result = canAddEntry(10);
      expect(result.allowed).toBe(true);
    });

    test('allows entry at limit - 1', () => {
      const result = canAddEntry(49);
      expect(result.allowed).toBe(true);
    });

    test('blocks entry at limit', () => {
      const result = canAddEntry(50);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('50');
    });

    test('blocks entry over limit', () => {
      const result = canAddEntry(100);
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkResponseSize', () => {
    test('allows small response', () => {
      const result = checkResponseSize(1024);
      expect(result.allowed).toBe(true);
    });

    test('allows response at limit', () => {
      const result = checkResponseSize(10 * 1024);
      expect(result.allowed).toBe(true);
    });

    test('blocks response over limit', () => {
      const result = checkResponseSize(11 * 1024);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('10KB');
    });
  });

  describe('getLimitStatus', () => {
    test('returns free tier status', () => {
      const status = getLimitStatus(25);
      expect(status.tier).toBe('free');
      expect(status.unlimited).toBe(false);
      expect(status.currentEntries).toBe(25);
      expect(status.maxEntries).toBe(50);
    });
  });

  describe('getRemainingEntries', () => {
    test('calculates remaining correctly', () => {
      expect(getRemainingEntries(10)).toBe(40);
      expect(getRemainingEntries(50)).toBe(0);
      expect(getRemainingEntries(0)).toBe(50);
    });

    test('returns 0 for over limit', () => {
      expect(getRemainingEntries(100)).toBe(0);
    });
  });
});
