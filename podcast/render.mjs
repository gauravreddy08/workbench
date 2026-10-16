#!/usr/bin/env node
// Turns podcast/scripts/<slug>.md into podcast/out/<slug>.mp3 with Fish Audio.
//
//   node podcast/render.mjs <slug>                 full episode
//   node podcast/render.mjs <slug> --dry-run       chunk plan and cost, no API calls
//   node podcast/render.mjs <slug> --minutes 10 --voices <idA>,<idB> --out podcast/out/sample.mp3
//                                                  first ~10 minutes with other voices (for picking voices)
//
// Chunks are cached in podcast/.cache/<slug>/, so a failed or edited run only pays for what changed.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { chunkKey } from './lib/cache.mjs';
import { chunkTurns } from './lib/chunk.mjs';
import { loadEnv, requireEnv } from './lib/env.mjs';
import { synthesize } from './lib/fish.mjs';
import { parseScript } from './lib/script.mjs';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const WORDS_PER_MINUTE = 150;
const PRICE_PER_BYTE = 15 / 1e6; // s2.1-pro; the -free model costs nothing
const CONCURRENCY = 5; // Fish Starter tier allows 5 requests in flight

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'dry-run': { type: 'boolean', default: false },
    minutes: { type: 'string' },
    voices: { type: 'string' },
    out: { type: 'string' },
    'chunk-chars': { type: 'string', default: '2000' },
  },
});
const slug = positionals[0];
if (!slug) {
  console.error('usage: node podcast/render.mjs <slug> [--dry-run] [--minutes N] [--voices a,b] [--out file.mp3]');
  process.exit(1);
}

loadEnv(join(ROOT, '.env'));
const model = process.env.FISH_MODEL || 's2.1-pro-free';

const scriptPath = join(ROOT, 'podcast/scripts', `${slug}.md`);
if (!existsSync(scriptPath)) {
  console.error(`No script at ${scriptPath}. Write it first with the /podcast skill.`);
  process.exit(1);
}
const wordCount = (t) => t.text.split(/\s+/).length;
let turns = parseScript(readFileSync(scriptPath, 'utf8'));
if (opts.minutes) {
  // Keep whole turns until we reach roughly that many minutes of speech.
  const budget = Number(opts.minutes) * WORDS_PER_MINUTE;
  const kept = [];
  let words = 0;
  for (const t of turns) {
    if (words >= budget) break;
    kept.push(t);
    words += wordCount(t);
  }
  turns = kept;
}
const chunks = chunkTurns(turns, Number(opts['chunk-chars']));
const totalWords = turns.reduce((n, t) => n + wordCount(t), 0);
const totalBytes = chunks.reduce((n, c) => n + Buffer.byteLength(c), 0);
const cost = model.endsWith('-free') ? 0 : totalBytes * PRICE_PER_BYTE;

console.log(`${slug}: ${turns.length} turns, ${totalWords} words (~${Math.round(totalWords / WORDS_PER_MINUTE)} min), ` +
  `${chunks.length} chunks, ${totalBytes} bytes, model ${model}, est. $${cost.toFixed(2)}`);
if (opts['dry-run']) process.exit(0);

const { FISH_API_KEY } = requireEnv('FISH_API_KEY');
const voices = opts.voices ? opts.voices.split(',') : Object.values(requireEnv('FISH_VOICE_A', 'FISH_VOICE_B'));
if (voices.length !== 2) throw new Error('--voices needs exactly two ids: explainer,listener');

const cacheDir = join(ROOT, 'podcast/.cache', slug);
mkdirSync(cacheDir, { recursive: true });
const files = chunks.map((text) => join(cacheDir, `${chunkKey({ text, voices, model })}.mp3`));

let done = 0;
let cached = 0;
const todo = chunks.map((text, i) => ({ text, file: files[i], i })).filter(({ file }) => {
  if (existsSync(file)) cached++;
  return !existsSync(file);
});
console.log(`${cached} chunks cached, ${todo.length} to render`);

async function worker() {
  while (todo.length) {
    const { text, file, i } = todo.shift();
    const audio = await synthesize({ text, voices, model, apiKey: FISH_API_KEY });
    writeFileSync(file, audio);
    console.log(`  chunk ${i + 1}/${chunks.length} done (${++done} new)`);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const out = resolve(opts.out || join(ROOT, 'podcast/out', `${slug}.mp3`));
mkdirSync(dirname(out), { recursive: true });
const list = join(cacheDir, 'concat.txt');
writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
// Join, even out loudness for car/shower listening, and shrink to mono 64 kbps (~30 MB per hour).
execFileSync('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list,
  '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ac', '1', '-ar', '44100', '-b:a', '64k', out,
]);
const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', out]));
console.log(`wrote ${out} (${Math.floor(seconds / 60)}m${Math.round(seconds % 60)}s)`);
