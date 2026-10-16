import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkTurns } from '../lib/chunk.mjs';

const t = (speaker, text) => ({ speaker, text, section: null });

test('packs whole turns up to the limit', () => {
  const turns = [t('A', 'a'.repeat(40)), t('B', 'b'.repeat(40)), t('A', 'c'.repeat(40))];
  const chunks = chunkTurns(turns, 120);
  assert.equal(chunks.length, 2);
  assert.ok(chunks[0].includes('a'.repeat(40)) && chunks[0].includes('b'.repeat(40)));
  assert.ok(chunks[1].startsWith('<|speaker:0|>' + 'c'));
});

test('every chunk starts with a speaker tag and stays under the limit', () => {
  const turns = Array.from({ length: 30 }, (_, i) => t(i % 2 ? 'B' : 'A', 'Word '.repeat(10 + i).trim() + '.'));
  for (const c of chunkTurns(turns, 300)) {
    assert.match(c, /^<\|speaker:[01]\|>/);
    assert.ok(c.length <= 300, `chunk of ${c.length}`);
  }
});

test('an oversized turn splits at sentence ends and keeps its speaker', () => {
  const sentences = Array.from({ length: 10 }, (_, i) => `Sentence number ${i} is here.`);
  const chunks = chunkTurns([t('B', sentences.join(' '))], 100);
  assert.ok(chunks.length > 1);
  for (const c of chunks) {
    assert.match(c, /^<\|speaker:1\|>Sentence/);
    assert.match(c, /here\.$/);
  }
  const rejoined = chunks.map((c) => c.replace('<|speaker:1|>', '')).join(' ');
  assert.equal(rejoined, sentences.join(' '));
});

test('a single sentence longer than the limit is kept whole', () => {
  const long = 'x'.repeat(150) + '.';
  assert.deepEqual(chunkTurns([t('A', long)], 100), ['<|speaker:0|>' + long]);
});
