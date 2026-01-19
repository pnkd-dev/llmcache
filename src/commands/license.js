/**
 * License command - Manage license
 * @module commands/license
 */

const { activateLicense, deactivateLicense, getLicenseStatus, isPro } = require('../license/checker');
const { PRO_PRICE, PRO_URL } = require('../license/constants');
const { colors, success, error, info, dim, separator } = require('../utils/output');

/**
 * Execute license command
 * @param {string} action - 'activate', 'deactivate', 'status'
 * @param {string} key - License key (for activate)
 * @param {Object} options
 */
function execute(action = 'status', key = null, options = {}) {
  switch (action) {
    case 'activate':
      return activate(key);

    case 'deactivate':
      return deactivate();

    case 'status':
    default:
      return status();
  }
}

/**
 * Activate license
 */
function activate(key) {
  if (!key) {
    error('License key required');
    info('Usage: llmcache license activate LMC-XXXX-XXXX-XXXX-XXXX');
    return { success: false };
  }

  const result = activateLicense(key);

  if (result.success) {
    console.log('');
    separator();
    console.log(colors.pro('  llmcache PRO Activated!'));
    separator();
    console.log('');
    success('License activated successfully');
    console.log('');
    console.log('  You now have access to:');
    console.log('  • Unlimited cache entries');
    console.log('  • 10MB response size limit');
    console.log('  • SQLite & Redis backends');
    console.log('  • Semantic similarity search');
    console.log('  • Cost tracking & savings reports');
    console.log('  • Response compression');
    console.log('  • HTTP server mode');
    console.log('  • Team sync');
    console.log('  • TTL expiration');
    console.log('');
    separator();
  } else {
    error(result.message || 'Failed to activate license');
    dim('Make sure your license key is in format: LMC-XXXX-XXXX-XXXX-XXXX');
  }

  return result;
}

/**
 * Deactivate license
 */
function deactivate() {
  const result = deactivateLicense();

  if (result.success) {
    success('License deactivated');
    info('You are now using the FREE version');
  } else {
    error(result.message || 'Failed to deactivate license');
  }

  return result;
}

/**
 * Show license status
 */
function status() {
  const licenseStatus = getLicenseStatus();

  console.log('');
  separator();

  if (isPro()) {
    console.log(colors.pro('  llmcache PRO'));
    separator();
    console.log('');
    console.log(`  Status:      ${colors.hit('Active')}`);
    console.log(`  License:     ${licenseStatus.key}`);
    console.log(`  Activated:   ${licenseStatus.activatedAt}`);
    console.log('');
    console.log('  Features:');
    console.log('  • Unlimited cache entries');
    console.log('  • 10MB response size');
    console.log('  • SQLite & Redis backends');
    console.log('  • Semantic similarity search');
    console.log('  • Cost tracking');
    console.log('  • Compression');
    console.log('  • HTTP server');
    console.log('  • Team sync');
  } else {
    console.log(colors.dim('  llmcache FREE'));
    separator();
    console.log('');
    console.log(`  Status:      ${colors.warning('Free tier')}`);
    console.log('');
    console.log('  Limits:');
    console.log('  • 50 cache entries max');
    console.log('  • 10KB response size');
    console.log('  • JSON storage only');
    console.log('');
    console.log(colors.header('  Upgrade to PRO:'));
    console.log(`  ${colors.price(PRO_PRICE)} one-time payment`);
    console.log(`  ${PRO_URL}`);
    console.log('');
    console.log('  PRO Features:');
    console.log('  • Unlimited entries');
    console.log('  • 10MB responses');
    console.log('  • SQLite & Redis');
    console.log('  • Semantic search');
    console.log('  • Cost tracking');
    console.log('  • Compression');
    console.log('  • HTTP server');
    console.log('  • Team sync');
  }

  console.log('');
  separator();

  return { success: true, ...licenseStatus };
}

module.exports = { execute };
