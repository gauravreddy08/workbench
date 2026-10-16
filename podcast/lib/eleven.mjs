// ElevenLabs. Text to Dialogue voices a list of turns, each with its own voice (keep each request
// ≤ 2,000 chars): https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert
// Text to Speech voices one line in one voice (used for the episode title in the intro).

const BASE = 'https://api.elevenlabs.io/v1';
const FORMAT = 'output_format=mp3_44100_128';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function post(url, payload, { apiKey, fetchImpl = fetch, retries = 5, baseDelayMs = 2000 }) {
  const body = JSON.stringify(payload);
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body,
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const detail = await res.text();
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) throw new Error(`ElevenLabs ${res.status}: ${detail.slice(0, 300)}`);
    await sleep(baseDelayMs * 2 ** attempt);
  }
}

export function synthesizeDialogue({ pieces, voices, model, ...opts }) {
  return post(`${BASE}/text-to-dialogue?${FORMAT}`, {
    model_id: model,
    inputs: pieces.map((p) => ({ text: p.text, voice_id: p.speaker === 'A' ? voices[0] : voices[1] })),
  }, opts);
}

export function speak({ text, voice, model, ...opts }) {
  return post(`${BASE}/text-to-speech/${voice}?${FORMAT}`, { text, model_id: model }, opts);
}
