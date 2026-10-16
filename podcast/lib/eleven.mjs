// ElevenLabs Text to Dialogue: one request voices a list of turns, each with its own voice.
// Docs: https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert (keep each request ≤ 2,000 chars)

const URL = 'https://api.elevenlabs.io/v1/text-to-dialogue?output_format=mp3_44100_128';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function synthesizeDialogue({ pieces, voices, model, apiKey, fetchImpl = fetch, retries = 5, baseDelayMs = 2000 }) {
  const body = JSON.stringify({
    model_id: model,
    inputs: pieces.map((p) => ({ text: p.text, voice_id: p.speaker === 'A' ? voices[0] : voices[1] })),
  });
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(URL, {
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
