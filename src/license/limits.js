/**
 * Usage limits and tracking
 * @module license/limits
 */

const { isPro } = require('./checker');
const { FREE_LIMITS } = require('./constants');

/**
 * Check if can add entry
 * @param {number} currentCount - Current entry count
 * @returns {Object} { allowed: boolean, reason?: string }
 */
function canAddEntry(currentCount) {
  if (isPro()) return { allowed: true };

  if (currentCount >= FREE_LIMITS.maxEntries) {
    return {
      allowed: false,
      reason: `FREE version limited to ${FREE_LIMITS.maxEntries} cache entries`,
    };
  }

  return { allowed: true };
}

/**
 * Check response size limit
 * @param {number} size - Response size in bytes
 * @returns {Object} { allowed: boolean, reason?: string }
 */
function checkResponseSize(size) {
  if (isPro()) return { allowed: true, size };

  if (size > FREE_LIMITS.maxResponseSize) {
    const maxKB = Math.round(FREE_LIMITS.maxResponseSize / 1024);
    const sizeKB = Math.round(size / 1024);
    return {
      allowed: false,
      reason: `FREE version limited to ${maxKB}KB responses (found ${sizeKB}KB)`,
    };
  }

  return { allowed: true, size };
}

/**
 * Get limit status for display
 * @param {number} currentEntries - Current entry count
 * @returns {Object}
 */
function getLimitStatus(currentEntries = 0) {
  if (isPro()) {
    return { tier: 'pro', unlimited: true };
  }

  return {
    tier: 'free',
    unlimited: false,
    currentEntries,
    maxEntries: FREE_LIMITS.maxEntries,
    maxResponseSize: FREE_LIMITS.maxResponseSize,
  };
}

/**
 * Get remaining entries
 * @param {number} currentCount
 * @returns {number}
 */
function getRemainingEntries(currentCount) {
  if (isPro()) return Infinity;
  return Math.max(0, FREE_LIMITS.maxEntries - currentCount);
}

module.exports = {
  canAddEntry,
  checkResponseSize,
  getLimitStatus,
  getRemainingEntries,
  FREE_LIMITS,
};
