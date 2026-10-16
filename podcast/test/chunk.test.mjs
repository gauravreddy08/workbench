import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkTurns, chunkChars } from '../lib/chunk.mjs';

const t = (speaker, text) => ({ speaker, text, section: null });
const pieceTexts = (chunk) => chunk.map((p) => p.text);

test('packs whole turns up to the limit', () => {
  const turns = [t('A', 'a'.repeat(40)), t('B', 'b'.repeat(40)), t('A', 'c'.repeat(40))];
  const chunks = chunkTurns(turns, 100);
  assert.equal(chunks.length, 2);
  assert.deepEqual(pieceTexts(chunks[0]), ['a'.repeat(40), 'b'.repeat(40)]);
  assert.deepEqual(chunks[1], [{ speaker: 'A', text: 'c'.repeat(40) }]);
});

test('every chunk stays under the limit', () => {
  const turns = Array.from({ length: 30 }, (_, i) => t(i % 2 ? 'B' : 'A', 'Word '.repeat(10 + i).trim() + '.'));
  for (const c of chunkTurns(turns, 300)) assert.ok(chunkChars(c) <= 300, `chunk of ${chunkChars(c)}`);
});

test('an oversized turn splits at sentence ends and keeps its speaker', () => {
  const sentences = Array.from({ length: 10 }, (_, i) => `Sentence number ${i} is here.`);
  const chunks = chunkTurns([t('B', sentences.join(' '))], 100);
  assert.ok(chunks.length > 1);
  const pieces = chunks.flat();
  for (const p of pieces) {
    assert.equal(p.speaker, 'B');
    assert.match(p.text, /^Sentence.*here\.$/);
  }
  assert.equal(pieces.map((p) => p.text).join(' '), sentences.join(' '));
});

test('a single sentence longer than the limit is kept whole', () => {
  const long = 'x'.repeat(150) + '.';
  assert.deepEqual(chunkTurns([t('A', long)], 100), [[{ speaker: 'A', text: long }]]);
});
