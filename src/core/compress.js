/**
 * Response compression using LZ4
 * @module core/compress
 * PRO feature
 */

const { isPro } = require('../license/checker');

let lz4 = null;

/**
 * Initialize LZ4 compression library
 * @returns {boolean} Success
 */
function initLZ4() {
  if (lz4) return true;

  try {
    lz4 = require('lz4');
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Compress a string
 * @param {string} data - Data to compress
 * @returns {Object} { compressed, originalSize, compressedSize, ratio }
 */
function compress(data) {
  if (!isPro()) {
    return {
      compressed: null,
      proRequired: true,
    };
  }

  if (!initLZ4()) {
    // Fallback to zlib if lz4 not available
    const zlib = require('zlib');
    const buffer = Buffer.from(data, 'utf8');
    const compressed = zlib.deflateSync(buffer);

    return {
      compressed: compressed.toString('base64'),
      originalSize: buffer.length,
      compressedSize: compressed.length,
      ratio: Math.round((1 - compressed.length / buffer.length) * 100),
      algorithm: 'zlib',
    };
  }

  const buffer = Buffer.from(data, 'utf8');
  const compressed = lz4.encode(buffer);

  return {
    compressed: compressed.toString('base64'),
    originalSize: buffer.length,
    compressedSize: compressed.length,
    ratio: Math.round((1 - compressed.length / buffer.length) * 100),
    algorithm: 'lz4',
  };
}

/**
 * Decompress a string
 * @param {string} data - Base64 compressed data
 * @param {string} algorithm - 'lz4' or 'zlib'
 * @returns {string} Decompressed data
 */
function decompress(data, algorithm = 'lz4') {
  if (!isPro()) {
    return null;
  }

  const buffer = Buffer.from(data, 'base64');

  if (algorithm === 'zlib' || !initLZ4()) {
    const zlib = require('zlib');
    return zlib.inflateSync(buffer).toString('utf8');
  }

  return lz4.decode(buffer).toString('utf8');
}

/**
 * Check if compression is worthwhile
 * @param {string} data - Data to check
 * @returns {boolean} True if compression would help
 */
function shouldCompress(data) {
  // Don't compress small data
  if (data.length < 1024) return false;

  // Check for repetitive content (good compression candidate)
  const sample = data.substring(0, 1000);
  const uniqueChars = new Set(sample).size;
  const ratio = uniqueChars / sample.length;

  // Low ratio means repetitive content = good compression
  return ratio < 0.5;
}

/**
 * Get compression stats for storage
 * @param {Object} storage - Storage instance
 * @returns {Object} Compression statistics
 */
function getCompressionStats(storage) {
  if (!isPro()) {
    return { proRequired: true };
  }

  const entries = storage.list();
  let totalOriginal = 0;
  let totalCompressed = 0;
  let compressedCount = 0;

  for (const entry of entries) {
    const size = Buffer.byteLength(entry.response, 'utf8');
    totalOriginal += size;

    if (entry.compressed) {
      compressedCount++;
      // Estimate compressed size from stored data
      totalCompressed += entry.compressedSize || size * 0.3;
    } else {
      totalCompressed += size;
    }
  }

  return {
    totalEntries: entries.length,
    compressedEntries: compressedCount,
    originalSize: totalOriginal,
    compressedSize: totalCompressed,
    savedBytes: totalOriginal - totalCompressed,
    compressionRatio: totalOriginal > 0
      ? Math.round((1 - totalCompressed / totalOriginal) * 100)
      : 0,
  };
}

/**
 * Compress all entries in storage (batch operation)
 * @param {Object} storage - Storage instance
 * @returns {Object} Results
 */
function compressAll(storage) {
  if (!isPro()) {
    return { proRequired: true };
  }

  const entries = storage.list();
  let compressed = 0;
  let skipped = 0;
  let savedBytes = 0;

  for (const entry of entries) {
    if (entry.compressed) {
      skipped++;
      continue;
    }

    if (!shouldCompress(entry.response)) {
      skipped++;
      continue;
    }

    const result = compress(entry.response);
    if (result.compressed && result.ratio > 10) {
      // Only compress if we save more than 10%
      entry.originalResponse = entry.response;
      entry.response = result.compressed;
      entry.compressed = true;
      entry.compressedSize = result.compressedSize;
      entry.algorithm = result.algorithm;

      storage.set(entry.hash, entry);

      compressed++;
      savedBytes += result.originalSize - result.compressedSize;
    } else {
      skipped++;
    }
  }

  return {
    success: true,
    compressed,
    skipped,
    savedBytes,
  };
}

module.exports = {
  compress,
  decompress,
  shouldCompress,
  getCompressionStats,
  compressAll,
};
