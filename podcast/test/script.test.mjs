import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScript, toFishText } from '../lib/script.mjs';

test('parses turns, continuation lines and sections', () => {
  const md = `<!-- section: The Problem -->

A: First line
continues here.

B: Short.
<!-- a note, not a section -->
A: Back again.`;
  assert.deepEqual(parseScript(md), [
    { speaker: 'A', text: 'First line continues here.', section: 'The Problem' },
    { speaker: 'B', text: 'Short.', section: 'The Problem' },
    { speaker: 'A', text: 'Back again.', section: 'The Problem' },
  ]);
});

test('section is null before any section comment', () => {
  assert.equal(parseScript('A: Hi.')[0].section, null);
});

test('rejects text outside a turn with its line number', () => {
  assert.throws(() => parseScript('\nstray text\nA: ok'), /line 2/);
});

test('rejects an empty turn', () => {
  assert.throws(() => parseScript('A:   \nB: ok'), /line 1/);
});

test('toFishText maps A to speaker 0 and B to speaker 1', () => {
  const turns = [
    { speaker: 'A', text: 'One.', section: null },
    { speaker: 'B', text: 'Two.', section: null },
  ];
  assert.equal(toFishText(turns), '<|speaker:0|>One.\n<|speaker:1|>Two.');
});
