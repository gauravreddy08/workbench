import { test } from 'node:test';
import assert from 'node:assert/strict';
import { speak, synthesizeDialogue } from '../lib/eleven.mjs';

const ok = () => new Response(new Uint8Array([7, 8]), { status: 200 });
const args = (fetchImpl) => ({
  pieces: [{ speaker: 'A', text: 'Hi.' }, { speaker: 'B', text: 'Hey.' }],
  voices: ['va', 'vb'],
  model: 'eleven_v4',
  apiKey: 'k',
  fetchImpl,
  baseDelayMs: 1,
});

test('maps A/B pieces to the two voices', async () => {
  let seen;
  const audio = await synthesizeDialogue(args(async (url, init) => {
    seen = { url, init };
    return ok();
  }));
  assert.deepEqual([...audio], [7, 8]);
  assert.match(seen.url, /^https:\/\/api\.elevenlabs\.io\/v1\/text-to-dialogue\?output_format=mp3_44100_128$/);
  assert.equal(seen.init.headers['xi-api-key'], 'k');
  const body = JSON.parse(seen.init.body);
  assert.equal(body.model_id, 'eleven_v4');
  assert.deepEqual(body.inputs, [{ text: 'Hi.', voice_id: 'va' }, { text: 'Hey.', voice_id: 'vb' }]);
});

test('retries 429 then succeeds; does not retry 422', async () => {
  let calls = 0;
  await synthesizeDialogue(args(async () => (++calls < 2 ? new Response('busy', { status: 429 }) : ok())));
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(
    synthesizeDialogue(args(async () => { calls++; return new Response('too long', { status: 422 }); })),
    /422.*too long/,
  );
  assert.equal(calls, 1);
});

test('speak sends one line in one voice', async () => {
  let seen;
  const audio = await speak({
    text: 'Workbench.', voice: 'va', model: 'eleven_v4_turbo', apiKey: 'k', baseDelayMs: 1,
    fetchImpl: async (url, init) => { seen = { url, init }; return ok(); },
  });
  assert.deepEqual([...audio], [7, 8]);
  assert.match(seen.url, /^https:\/\/api\.elevenlabs\.io\/v1\/text-to-speech\/va\?output_format=mp3_44100_128$/);
  assert.deepEqual(JSON.parse(seen.init.body), { text: 'Workbench.', model_id: 'eleven_v4_turbo' });
});
