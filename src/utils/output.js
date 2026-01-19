/**
 * Output formatting utilities
 * @module utils/output
 */

const chalk = require('chalk');

// Color helpers
const colors = {
  success: chalk.green,
  error: chalk.red,
  warning: chalk.yellow,
  info: chalk.cyan,
  dim: chalk.dim,
  bold: chalk.bold,
  pro: chalk.magenta.bold,
  price: chalk.green.bold,
  header: chalk.white.bold,
  accent: chalk.cyan,
  hit: chalk.green,
  miss: chalk.yellow,
};

/**
 * Print success message
 */
function success(msg) {
  console.log(colors.success('✓ ') + msg);
}

/**
 * Print error message
 */
function error(msg) {
  console.error(colors.error('✗ ') + msg);
}

/**
 * Print warning message
 */
function warning(msg) {
  console.log(colors.warning('⚠ ') + msg);
}

/**
 * Print info message
 */
function info(msg) {
  console.log(colors.info('ℹ ') + msg);
}

/**
 * Print dimmed text
 */
function dim(msg) {
  console.log(colors.dim(msg));
}

/**
 * Print header
 */
function header(msg) {
  console.log('\n' + colors.header(msg));
}

/**
 * Print separator line
 */
function separator() {
  console.log(colors.dim('━'.repeat(55)));
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

/**
 * Format number with commas
 */
function formatNumber(num) {
  return num.toLocaleString();
}

/**
 * Format money
 */
function formatMoney(amount) {
  return '$' + amount.toFixed(2);
}

/**
 * Print a table
 */
function table(headers, rows) {
  const widths = headers.map((h, i) => {
    const maxRow = Math.max(...rows.map(r => String(r[i] || '').length));
    return Math.max(h.length, maxRow);
  });

  const line = '─';
  const topBorder = '┌' + widths.map(w => line.repeat(w + 2)).join('┬') + '┐';
  const midBorder = '├' + widths.map(w => line.repeat(w + 2)).join('┼') + '┤';
  const botBorder = '└' + widths.map(w => line.repeat(w + 2)).join('┴') + '┘';

  const formatRow = (row) => {
    const cells = row.map((cell, i) => ' ' + String(cell || '').padEnd(widths[i]) + ' ');
    return '│' + cells.join('│') + '│';
  };

  console.log(topBorder);
  console.log(formatRow(headers));
  console.log(midBorder);
  rows.forEach(row => console.log(formatRow(row)));
  console.log(botBorder);
}

/**
 * Print a simple list
 */
function list(items, bullet = '•') {
  items.forEach(item => console.log(`  ${bullet} ${item}`));
}

/**
 * Print PRO feature badge
 */
function proBadge() {
  return colors.pro('[PRO]');
}

/**
 * Print version string
 */
function version(v, tier) {
  const tierStr = tier === 'pro' ? colors.pro('PRO') : colors.dim('FREE');
  return `llmcache v${v} ${tierStr}`;
}

/**
 * Format time ago
 */
function timeAgo(date) {
  const now = new Date();
  const then = new Date(date);
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

module.exports = {
  colors,
  success,
  error,
  warning,
  info,
  dim,
  header,
  separator,
  formatBytes,
  formatNumber,
  formatMoney,
  table,
  list,
  proBadge,
  version,
  timeAgo,
};
