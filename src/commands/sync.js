/**
 * Sync command - Sync cache between machines (PRO)
 * @module commands/sync
 */

const fs = require('fs');
const path = require('path');
const { isPro } = require('../license/checker');
const { exportCache, importCache, getCachePath } = require('../core/cache');
const { colors, success, error, info, dim, formatBytes } = require('../utils/output');
const { showProFeatureUpsell } = require('../utils/upsell');

/**
 * Execute sync command
 * @param {string} action - 'push' or 'pull'
 * @param {Object} options
 */
function execute(action, options = {}) {
  const { global, path: customPath, remote, strategy = 'merge' } = options;

  // Check PRO
  if (!isPro()) {
    showProFeatureUpsell('cache sync',
      'Sync your cache across multiple machines.\n' +
      'Share cached responses with your team via shared storage.'
    );
    return { success: false, proRequired: true };
  }

  // Validate action
  if (!['push', 'pull', 'status'].includes(action)) {
    error(`Invalid action: ${action}`);
    info('Valid actions: push, pull, status');
    return { success: false };
  }

  // Get remote path
  const remotePath = remote || process.env.LLMCACHE_SYNC_PATH;
  if (!remotePath) {
    error('No remote path specified');
    info('Use --remote <path> or set LLMCACHE_SYNC_PATH environment variable');
    dim('Example: llmcache sync push --remote /shared/team-cache');
    return { success: false };
  }

  const localPath = getCachePath(global, customPath);
  const remoteFile = path.join(remotePath, 'llmcache-sync.json');

  switch (action) {
    case 'status':
      return syncStatus(localPath, remoteFile);

    case 'push':
      return syncPush(localPath, remoteFile, { global, customPath });

    case 'pull':
      return syncPull(localPath, remoteFile, { global, customPath, strategy });

    default:
      error(`Unknown action: ${action}`);
      return { success: false };
  }
}

/**
 * Show sync status
 */
function syncStatus(localPath, remoteFile) {
  const localExists = fs.existsSync(path.join(localPath, 'index.json'));
  const remoteExists = fs.existsSync(remoteFile);

  console.log(colors.header('\nSync Status'));
  console.log('');
  console.log(`  Local cache:  ${localExists ? colors.hit('exists') : colors.miss('not found')}`);
  console.log(`  Remote cache: ${remoteExists ? colors.hit('exists') : colors.miss('not found')}`);

  if (localExists) {
    const localStats = fs.statSync(path.join(localPath, 'index.json'));
    console.log(`  Local size:   ${formatBytes(localStats.size)}`);
    console.log(`  Local updated: ${localStats.mtime.toISOString()}`);
  }

  if (remoteExists) {
    const remoteStats = fs.statSync(remoteFile);
    console.log(`  Remote size:  ${formatBytes(remoteStats.size)}`);
    console.log(`  Remote updated: ${remoteStats.mtime.toISOString()}`);
  }

  console.log('');

  return { success: true, localExists, remoteExists };
}

/**
 * Push local cache to remote
 */
function syncPush(localPath, remoteFile, options) {
  const data = exportCache(options);

  if (!data) {
    error('No local cache to push');
    return { success: false };
  }

  const entryCount = Object.keys(data.entries || {}).length;

  try {
    // Ensure remote directory exists
    const remoteDir = path.dirname(remoteFile);
    if (!fs.existsSync(remoteDir)) {
      fs.mkdirSync(remoteDir, { recursive: true });
    }

    // Add sync metadata
    data.sync = {
      pushedAt: new Date().toISOString(),
      source: process.env.HOSTNAME || 'unknown',
    };

    fs.writeFileSync(remoteFile, JSON.stringify(data, null, 2));

    success(`Pushed ${entryCount} entries to remote`);
    dim(`Remote: ${remoteFile}`);

    return { success: true, pushed: entryCount };
  } catch (err) {
    error(`Failed to push: ${err.message}`);
    return { success: false };
  }
}

/**
 * Pull remote cache to local
 */
function syncPull(localPath, remoteFile, options) {
  if (!fs.existsSync(remoteFile)) {
    error('No remote cache found');
    dim(`Expected: ${remoteFile}`);
    return { success: false };
  }

  try {
    const content = fs.readFileSync(remoteFile, 'utf-8');
    const data = JSON.parse(content);

    const result = importCache(data, options);

    if (result.success) {
      success(`Pulled ${result.imported} entries from remote`);
      dim(`Strategy: ${options.strategy}`);

      if (data.sync) {
        dim(`Remote last updated: ${data.sync.pushedAt}`);
      }
    } else {
      error(result.message || 'Failed to import remote cache');
    }

    return result;
  } catch (err) {
    error(`Failed to pull: ${err.message}`);
    return { success: false };
  }
}

module.exports = { execute };
