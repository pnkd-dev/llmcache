/**
 * Similarity module tests
 */

const { tokenize, termFrequency, cosineSimilarity, tfidfVector, inverseDocumentFrequency } = require('../src/core/similarity');

describe('tokenize', () => {
  test('splits text into words', () => {
    const tokens = tokenize('Hello world');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
  });

  test('converts to lowercase', () => {
    const tokens = tokenize('HELLO WORLD');
    expect(tokens).toContain('hello');
    expect(tokens).toContain('world');
  });

  test('removes punctuation', () => {
    const tokens = tokenize('Hello, world! How are you?');
    expect(tokens).not.toContain(',');
    expect(tokens).not.toContain('!');
    expect(tokens).not.toContain('?');
  });

  test('filters short words (<=2 chars)', () => {
    const tokens = tokenize('I am a test of the code');
    expect(tokens).not.toContain('i');
    expect(tokens).not.toContain('am');
    expect(tokens).not.toContain('a');
    expect(tokens).toContain('test');
    expect(tokens).toContain('code');
  });

  test('handles empty string', () => {
    const tokens = tokenize('');
    expect(tokens).toEqual([]);
  });
});

describe('termFrequency', () => {
  test('calculates frequency', () => {
    const tokens = ['hello', 'hello', 'world'];
    const tf = termFrequency(tokens);
    expect(tf.hello).toBeCloseTo(2 / 3, 5);
    expect(tf.world).toBeCloseTo(1 / 3, 5);
  });

  test('handles single token', () => {
    const tokens = ['hello'];
    const tf = termFrequency(tokens);
    expect(tf.hello).toBe(1);
  });

  test('handles empty array', () => {
    const tokens = [];
    const tf = termFrequency(tokens);
    expect(Object.keys(tf)).toHaveLength(0);
  });
});

describe('inverseDocumentFrequency', () => {
  test('calculates IDF', () => {
    const documents = [
      ['hello', 'world'],
      ['hello', 'there'],
      ['goodbye', 'world'],
    ];
    const idf = inverseDocumentFrequency(documents);

    // 'hello' appears in 2 docs, 'world' in 2, 'there' in 1, 'goodbye' in 1
    expect(idf.hello).toBeLessThan(idf.there);
    expect(idf.world).toBeLessThan(idf.goodbye);
  });

  test('common words have lower IDF', () => {
    const documents = [
      ['common', 'word'],
      ['common', 'another'],
      ['common', 'third'],
    ];
    const idf = inverseDocumentFrequency(documents);
    expect(idf.common).toBeLessThan(idf.word);
  });
});

describe('tfidfVector', () => {
  test('multiplies TF by IDF', () => {
    const tf = { hello: 0.5, world: 0.5 };
    const idf = { hello: 1, world: 2 };
    const vector = tfidfVector(tf, idf);

    expect(vector.hello).toBe(0.5);
    expect(vector.world).toBe(1);
  });

  test('handles missing IDF values', () => {
    const tf = { hello: 0.5, unknown: 0.5 };
    const idf = { hello: 1 };
    const vector = tfidfVector(tf, idf);

    expect(vector.hello).toBe(0.5);
    expect(vector.unknown).toBe(0);
  });
});

describe('cosineSimilarity', () => {
  test('identical vectors have similarity 1', () => {
    const v1 = { a: 1, b: 2, c: 3 };
    const v2 = { a: 1, b: 2, c: 3 };
    expect(cosineSimilarity(v1, v2)).toBeCloseTo(1, 5);
  });

  test('orthogonal vectors have similarity 0', () => {
    const v1 = { a: 1, b: 0 };
    const v2 = { a: 0, b: 1 };
    expect(cosineSimilarity(v1, v2)).toBe(0);
  });

  test('similar vectors have high similarity', () => {
    const v1 = { a: 1, b: 2, c: 3 };
    const v2 = { a: 1, b: 2, c: 4 };
    const sim = cosineSimilarity(v1, v2);
    expect(sim).toBeGreaterThan(0.9);
  });

  test('handles empty vectors', () => {
    const v1 = {};
    const v2 = {};
    expect(cosineSimilarity(v1, v2)).toBe(0);
  });

  test('handles zero vectors', () => {
    const v1 = { a: 0, b: 0 };
    const v2 = { a: 0, b: 0 };
    expect(cosineSimilarity(v1, v2)).toBe(0);
  });
});
