// Fish Audio text-to-speech. Two voices per request: <|speaker:0|> is voices[0], <|speaker:1|> is voices[1].
// Docs: https://docs.fish.audio/api-reference/endpoint/openapi-v1/text-to-speech

const URL = 'https://api.fish.audio/v1/tts';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function synthesize({ text, voices, model, apiKey, fetchImpl = fetch, retries = 5, baseDelayMs = 2000 }) {
  const body = JSON.stringify({
    text,
    reference_id: voices,
    format: 'mp3',
    mp3_bitrate: 128,
    latency: 'normal',
    normalize: true,
    temperature: 0.7,
    top_p: 0.7,
  });
  for (let attempt = 0; ; attempt++) {
    const res = await fetchImpl(URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', model },
      body,
    });
    if (res.ok) return Buffer.from(await res.arrayBuffer());
    const detail = await res.text();
    // 429 (over the concurrency limit) and 5xx are worth waiting out; Fish sends no Retry-After.
    const retryable = res.status === 429 || res.status >= 500;
    if (!retryable || attempt >= retries) throw new Error(`Fish TTS ${res.status}: ${detail.slice(0, 300)}`);
    await sleep(baseDelayMs * 2 ** attempt);
  }
}
