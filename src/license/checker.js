/**
 * License checker
 * @module license/checker
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const CONFIG_DIR = path.join(os.homedir(), '.llmcache');
const LICENSE_FILE = path.join(CONFIG_DIR, 'license.json');

/**
 * Ensure config directory exists
 */
function ensureConfigDir() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Get license info
 * @returns {Object|null} License info or null if not licensed
 */
function getLicense() {
  try {
    if (!fs.existsSync(LICENSE_FILE)) return null;
    const data = JSON.parse(fs.readFileSync(LICENSE_FILE, 'utf8'));

    // Validate license key format
    if (!data.key || !data.key.startsWith('LMC-')) return null;

    // Check expiry if present
    if (data.expiresAt && new Date(data.expiresAt) < new Date()) return null;

    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Check if user has PRO license
 * @returns {boolean}
 */
function isPro() {
  return getLicense() !== null;
}

/**
 * Activate license
 * @param {string} key - License key
 * @returns {Object} Result with success status
 */
function activateLicense(key) {
  if (!key || !key.startsWith('LMC-')) {
    return { success: false, message: 'Invalid license key format. Expected: LMC-XXXX-XXXX-XXXX-XXXX' };
  }

  // Validate key checksum (last 4 chars should match hash of rest)
  const parts = key.split('-');
  if (parts.length !== 5) {
    return { success: false, message: 'Invalid license key format' };
  }

  const keyBody = parts.slice(0, 4).join('-');
  const checksum = parts[4];
  const expectedChecksum = crypto.createHash('md5').update(keyBody).digest('hex').slice(0, 4).toUpperCase();

  if (checksum !== expectedChecksum) {
    return { success: false, message: 'Invalid license key' };
  }

  ensureConfigDir();

  const licenseData = {
    key: key,
    activatedAt: new Date().toISOString(),
    machine: os.hostname(),
  };

  fs.writeFileSync(LICENSE_FILE, JSON.stringify(licenseData, null, 2));

  return { success: true, message: 'License activated successfully' };
}

/**
 * Deactivate license
 * @returns {Object} Result
 */
function deactivateLicense() {
  if (fs.existsSync(LICENSE_FILE)) {
    fs.unlinkSync(LICENSE_FILE);
    return { success: true, message: 'License deactivated' };
  }
  return { success: false, error: 'No active license found' };
}

/**
 * Get license status info
 * @returns {Object} Status info
 */
function getLicenseStatus() {
  const license = getLicense();
  if (license) {
    return {
      active: true,
      tier: 'pro',
      key: license.key.replace(/LMC-(....)-(....)-(....)-(....)/,  'LMC-****-$2-****-$4'),
      activatedAt: license.activatedAt,
    };
  }
  return { active: false, tier: 'free' };
}

module.exports = {
  getLicense,
  isPro,
  activateLicense,
  deactivateLicense,
  getLicenseStatus,
  CONFIG_DIR,
  LICENSE_FILE,
  ensureConfigDir,
};
