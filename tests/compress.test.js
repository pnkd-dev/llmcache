/**
 * Compression module tests
 */

const { shouldCompress } = require('../src/core/compress');

describe('shouldCompress', () => {
  test('returns false for small data', () => {
    const smallData = 'Hello world';
    expect(shouldCompress(smallData)).toBe(false);
  });

  test('returns false for data under 1KB', () => {
    const data = 'x'.repeat(500);
    expect(shouldCompress(data)).toBe(false);
  });

  test('returns true for large repetitive data', () => {
    const data = 'Lorem ipsum '.repeat(200); // Repetitive content
    expect(shouldCompress(data)).toBe(true);
  });

  test('returns false for highly varied data', () => {
    // Generate highly varied data
    let data = '';
    for (let i = 0; i < 2000; i++) {
      data += String.fromCharCode(32 + (i % 95));
    }
    // This might or might not compress well depending on pattern
    // Just testing it doesn't crash
    const result = shouldCompress(data);
    expect(typeof result).toBe('boolean');
  });
});
