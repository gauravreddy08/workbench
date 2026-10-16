import { test } from 'node:test';
import assert from 'node:assert/strict';
import { synthesize } from '../lib/fish.mjs';

const ok = (bytes = [1, 2, 3]) => new Response(new Uint8Array(bytes), { status: 200 });
const args = (fetchImpl) => ({
  text: '<|speaker:0|>Hi.',
  voices: ['va', 'vb'],
  model: 's2.1-pro-free',
  apiKey: 'k',
  fetchImpl,
  baseDelayMs: 1,
});

test('sends a two-speaker request with the model header', async () => {
  let seen;
  const audio = await synthesize(args(async (url, init) => {
    seen = { url, init };
    return ok();
  }));
  assert.deepEqual([...audio], [1, 2, 3]);
  assert.equal(seen.url, 'https://api.fish.audio/v1/tts');
  assert.equal(seen.init.headers.Authorization, 'Bearer k');
  assert.equal(seen.init.headers.model, 's2.1-pro-free');
  const body = JSON.parse(seen.init.body);
  assert.deepEqual(body.reference_id, ['va', 'vb']);
  assert.equal(body.text, '<|speaker:0|>Hi.');
  assert.equal(body.format, 'mp3');
});

test('retries on 429 and 5xx, then succeeds', async () => {
  const statuses = [429, 503, 200];
  let calls = 0;
  await synthesize(args(async () => {
    const s = statuses[calls++];
    return s === 200 ? ok() : new Response('busy', { status: s });
  }));
  assert.equal(calls, 3);
});

test('does not retry a 400 and reports the body', async () => {
  let calls = 0;
  await assert.rejects(
    synthesize(args(async () => {
      calls++;
      return new Response('bad voice id', { status: 400 });
    })),
    /400.*bad voice id/,
  );
  assert.equal(calls, 1);
});

test('gives up after the retry budget', async () => {
  await assert.rejects(
    synthesize({ ...args(async () => new Response('x', { status: 500 })), retries: 2 }),
    /500/,
  );
});
