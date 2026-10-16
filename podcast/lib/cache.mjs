import { createHash } from 'node:crypto';

// Identifies one rendered chunk. Anything that changes the audio must be in here.
export function chunkKey({ text, voices, model }) {
  return createHash('sha256').update(JSON.stringify([text, voices, model])).digest('hex').slice(0, 16);
}
