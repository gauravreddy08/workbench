import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunkKey } from '../lib/cache.mjs';

const base = { text: '<|speaker:0|>Hello.', voices: ['a', 'b'], model: 's2.1-pro' };

test('same inputs give the same key', () => {
  assert.equal(chunkKey(base), chunkKey({ ...base }));
  assert.match(chunkKey(base), /^[0-9a-f]{16}$/);
});

test('changing text, voices or model changes the key', () => {
  const k = chunkKey(base);
  assert.notEqual(chunkKey({ ...base, text: '<|speaker:0|>Hello!' }), k);
  assert.notEqual(chunkKey({ ...base, voices: ['b', 'a'] }), k);
  assert.notEqual(chunkKey({ ...base, model: 's2.1-pro-free' }), k);
});
