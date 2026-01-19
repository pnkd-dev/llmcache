/**
 * Semantic similarity search using TF-IDF
 * @module core/similarity
 * PRO feature
 */

const { isPro } = require('../license/checker');

// Simple TF-IDF implementation (no external deps for basic version)
// PRO users get full natural library support

/**
 * Tokenize text into words
 * @param {string} text
 * @returns {Array}
 */
function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

/**
 * Calculate term frequency
 * @param {Array} tokens
 * @returns {Object}
 */
function termFrequency(tokens) {
  const tf = {};
  const total = tokens.length;

  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }

  // Normalize
  for (const token in tf) {
    tf[token] = tf[token] / total;
  }

  return tf;
}

/**
 * Calculate IDF for corpus
 * @param {Array} documents - Array of token arrays
 * @returns {Object}
 */
function inverseDocumentFrequency(documents) {
  const idf = {};
  const numDocs = documents.length;

  // Count documents containing each term
  const docCounts = {};
  for (const doc of documents) {
    const seen = new Set(doc);
    for (const token of seen) {
      docCounts[token] = (docCounts[token] || 0) + 1;
    }
  }

  // Calculate IDF
  for (const token in docCounts) {
    idf[token] = Math.log(numDocs / docCounts[token]);
  }

  return idf;
}

/**
 * Calculate TF-IDF vector
 * @param {Object} tf - Term frequency
 * @param {Object} idf - Inverse document frequency
 * @returns {Object}
 */
function tfidfVector(tf, idf) {
  const vector = {};
  for (const token in tf) {
    vector[token] = tf[token] * (idf[token] || 0);
  }
  return vector;
}

/**
 * Calculate cosine similarity between two vectors
 * @param {Object} v1
 * @param {Object} v2
 * @returns {number}
 */
function cosineSimilarity(v1, v2) {
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;

  const allKeys = new Set([...Object.keys(v1), ...Object.keys(v2)]);

  for (const key of allKeys) {
    const val1 = v1[key] || 0;
    const val2 = v2[key] || 0;
    dotProduct += val1 * val2;
    mag1 += val1 * val1;
    mag2 += val2 * val2;
  }

  mag1 = Math.sqrt(mag1);
  mag2 = Math.sqrt(mag2);

  if (mag1 === 0 || mag2 === 0) return 0;

  return dotProduct / (mag1 * mag2);
}

/**
 * Find similar entries in cache
 * @param {string} query - Query prompt
 * @param {Object} storage - Storage instance
 * @param {Object} options - { threshold, limit }
 * @returns {Array} Similar entries with scores
 */
function findSimilar(query, storage, options = {}) {
  if (!isPro()) {
    return { results: [], proRequired: true };
  }

  const { threshold = 0.3, limit = 10 } = options;

  const entries = storage.list();
  if (entries.length === 0) return { results: [] };

  // Tokenize all prompts
  const queryTokens = tokenize(query);
  const documents = entries.map(e => tokenize(e.prompt));

  // Add query to documents for IDF calculation
  documents.push(queryTokens);

  // Calculate IDF
  const idf = inverseDocumentFrequency(documents);

  // Calculate TF-IDF for query
  const queryTF = termFrequency(queryTokens);
  const queryVector = tfidfVector(queryTF, idf);

  // Calculate similarity scores
  const results = [];

  for (let i = 0; i < entries.length; i++) {
    const entryTF = termFrequency(documents[i]);
    const entryVector = tfidfVector(entryTF, idf);
    const similarity = cosineSimilarity(queryVector, entryVector);

    if (similarity >= threshold) {
      results.push({
        hash: entries[i].hash,
        prompt: entries[i].prompt,
        response: entries[i].response,
        model: entries[i].model,
        hits: entries[i].hits,
        created: entries[i].created,
        similarity: Math.round(similarity * 100) / 100,
      });
    }
  }

  // Sort by similarity descending
  results.sort((a, b) => b.similarity - a.similarity);

  return {
    results: results.slice(0, limit),
    total: results.length,
  };
}

/**
 * Get best match from cache
 * @param {string} query - Query prompt
 * @param {Object} storage - Storage instance
 * @param {number} minSimilarity - Minimum similarity threshold
 * @returns {Object|null} Best matching entry or null
 */
function getBestMatch(query, storage, minSimilarity = 0.8) {
  if (!isPro()) {
    return null;
  }

  const { results } = findSimilar(query, storage, { threshold: minSimilarity, limit: 1 });

  if (results.length > 0) {
    return results[0];
  }

  return null;
}

/**
 * Build similarity index for faster lookups (PRO)
 * @param {Object} storage - Storage instance
 * @returns {Object} Index data
 */
function buildIndex(storage) {
  if (!isPro()) {
    return { proRequired: true };
  }

  const entries = storage.list();
  const documents = entries.map(e => ({
    hash: e.hash,
    tokens: tokenize(e.prompt),
  }));

  const idf = inverseDocumentFrequency(documents.map(d => d.tokens));

  const vectors = documents.map(doc => ({
    hash: doc.hash,
    vector: tfidfVector(termFrequency(doc.tokens), idf),
  }));

  return {
    idf,
    vectors,
    entryCount: entries.length,
    built: new Date().toISOString(),
  };
}

module.exports = {
  tokenize,
  termFrequency,
  inverseDocumentFrequency,
  tfidfVector,
  cosineSimilarity,
  findSimilar,
  getBestMatch,
  buildIndex,
};
