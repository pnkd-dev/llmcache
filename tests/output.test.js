/**
 * Output utility tests
 */

const { formatBytes, formatNumber, formatMoney, timeAgo } = require('../src/utils/output');

describe('formatBytes', () => {
  test('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
  });

  test('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.0 KB');
    expect(formatBytes(2048)).toBe('2.0 KB');
  });

  test('formats megabytes', () => {
    expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
    expect(formatBytes(1.5 * 1024 * 1024)).toBe('1.50 MB');
  });

  test('handles zero', () => {
    expect(formatBytes(0)).toBe('0 B');
  });
});

describe('formatNumber', () => {
  test('formats small numbers', () => {
    expect(formatNumber(123)).toBe('123');
  });

  test('formats thousands with commas', () => {
    expect(formatNumber(1234)).toMatch(/1[,.]234/);
  });

  test('formats millions', () => {
    expect(formatNumber(1234567)).toMatch(/1[,.]234[,.]567/);
  });
});

describe('formatMoney', () => {
  test('formats as dollars', () => {
    expect(formatMoney(10)).toBe('$10.00');
  });

  test('formats cents', () => {
    expect(formatMoney(0.5)).toBe('$0.50');
  });

  test('rounds to 2 decimal places', () => {
    expect(formatMoney(10.999)).toBe('$11.00');
  });
});

describe('timeAgo', () => {
  test('formats recent time', () => {
    const now = new Date();
    expect(timeAgo(now.toISOString())).toBe('just now');
  });

  test('formats minutes ago', () => {
    const date = new Date(Date.now() - 5 * 60000);
    expect(timeAgo(date.toISOString())).toBe('5m ago');
  });

  test('formats hours ago', () => {
    const date = new Date(Date.now() - 3 * 3600000);
    expect(timeAgo(date.toISOString())).toBe('3h ago');
  });

  test('formats days ago', () => {
    const date = new Date(Date.now() - 2 * 86400000);
    expect(timeAgo(date.toISOString())).toBe('2d ago');
  });
});
