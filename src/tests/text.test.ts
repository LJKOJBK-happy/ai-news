import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanTitle, normalizeTitle, normalizeUrl, similarity } from '../utils/text.js';

test('normalizeUrl removes tracking params', () => {
  const out = normalizeUrl('https://example.com/x?utm_source=a&b=1#part');
  assert.equal(out, 'https://example.com/x?b=1');
});

test('cleanTitle trims noisy suffix', () => {
  assert.equal(cleanTitle('  Hello World | Site  '), 'Hello World');
});

test('normalizeTitle lowers and strips punctuation', () => {
  assert.equal(normalizeTitle('The React, Performance Guide!'), 'react performance guide');
});

test('similarity catches near-duplicate titles', () => {
  const s = similarity('React performance tips for 2026', '2026 React performance tips');
  assert.ok(s > 0.8);
});
