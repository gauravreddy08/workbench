#!/usr/bin/env node
// Turns podcast/scripts/<slug>.md into podcast/out/<slug>.mp3 with ElevenLabs (default) or Fish Audio.
// TTS_PROVIDER=elevenlabs|fish picks the provider; see .env.example for the model and voice settings.
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
import { lessonMeta } from './lib/curriculum.mjs';
import { speak, synthesizeDialogue } from './lib/eleven.mjs';
import { synthesize } from './lib/fish.mjs';
import { parseScript, toFishText } from './lib/script.mjs';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const WORDS_PER_MINUTE = 150;

// Price per character of text, and how many requests may be in flight at once.
const PROVIDERS = {
  elevenlabs: {
    defaultModel: 'eleven_v4_turbo',
    price: (model) => (model.includes('turbo') ? 0.04 : 0.08) / 1000,
    concurrency: 2, // Starter plan allows 2 requests in flight
    env: ['ELEVENLABS_API_KEY', 'ELEVEN_VOICE_A', 'ELEVEN_VOICE_B'],
    render: ({ pieces, voices, model, key }) => synthesizeDialogue({ pieces, voices, model, apiKey: key }),
  },
  fish: {
    defaultModel: 's2.1-pro-free',
    price: (model) => (model.endsWith('-free') ? 0 : model === 'drama-3' ? 10 / 1e6 : 15 / 1e6),
    concurrency: 5, // Fish Starter tier limit
    env: ['FISH_API_KEY', 'FISH_VOICE_A', 'FISH_VOICE_B'],
    render: ({ pieces, voices, model, key }) => synthesize({ text: toFishText(pieces), voices, model, apiKey: key }),
  },
};

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    'dry-run': { type: 'boolean', default: false },
    minutes: { type: 'string' },
    voices: { type: 'string' },
    out: { type: 'string' },
    'chunk-chars': { type: 'string', default: '1900' },
    'no-intro': { type: 'boolean', default: false },
  },
});
const slug = positionals[0];
if (!slug) {
  console.error('usage: node podcast/render.mjs <slug> [--dry-run] [--minutes N] [--voices a,b] [--out file.mp3]');
  process.exit(1);
}

loadEnv(join(ROOT, '.env'));
const providerName = process.env.TTS_PROVIDER || 'elevenlabs';
const provider = PROVIDERS[providerName];
if (!provider) throw new Error(`TTS_PROVIDER must be one of: ${Object.keys(PROVIDERS).join(', ')}`);
const model = (providerName === 'fish' ? process.env.FISH_MODEL : process.env.ELEVEN_MODEL) || provider.defaultModel;

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
const totalChars = chunks.flat().reduce((n, p) => n + p.text.length, 0);
const cost = totalChars * provider.price(model);

console.log(`${slug}: ${turns.length} turns, ${totalWords} words (~${Math.round(totalWords / WORDS_PER_MINUTE)} min), ` +
  `${chunks.length} chunks, ${totalChars} chars, ${providerName} ${model}, est. $${cost.toFixed(2)}`);
if (opts['dry-run']) process.exit(0);

const [keyName, voiceA, voiceB] = provider.env;
const { [keyName]: key } = requireEnv(keyName);
const voices = opts.voices ? opts.voices.split(',') : Object.values(requireEnv(voiceA, voiceB));
if (voices.length !== 2) throw new Error('--voices needs exactly two ids: explainer,listener');

const cacheDir = join(ROOT, 'podcast/.cache', slug);
mkdirSync(cacheDir, { recursive: true });
const files = chunks.map((pieces) => join(cacheDir, `${chunkKey({ text: JSON.stringify(pieces), voices, model })}.mp3`));

let done = 0;
let cached = 0;
const todo = chunks.map((pieces, i) => ({ pieces, file: files[i], i })).filter(({ file }) => {
  if (existsSync(file)) cached++;
  return !existsSync(file);
});
console.log(`${cached} chunks cached, ${todo.length} to render`);

async function worker() {
  while (todo.length) {
    const { pieces, file, i } = todo.shift();
    const audio = await provider.render({ pieces, voices, model, key });
    writeFileSync(file, audio);
    console.log(`  chunk ${i + 1}/${chunks.length} done (${++done} new)`);
  }
}
await Promise.all(Array.from({ length: provider.concurrency }, worker));

const duration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]));

// Intro: the music sting, with the explainer saying the show and episode title over it.
// The spoken title comes from a <!-- title: ... --> comment in the script, else curriculum.ts.
const MUSIC = join(ROOT, 'podcast/intro-music.mp3');
let intro = null;
if (existsSync(MUSIC) && providerName === 'elevenlabs' && !opts.minutes && !opts['no-intro']) {
  const scriptTitle = readFileSync(scriptPath, 'utf8').match(/<!--\s*title:\s*(.+?)\s*-->/)?.[1];
  const title = scriptTitle || lessonMeta(readFileSync(join(ROOT, 'src/data/curriculum.ts'), 'utf8'), slug).title.replace(/\.$/, '');
  const text = `[warm, relaxed] Workbench. ... ${title}.`;
  const file = join(cacheDir, `title-${chunkKey({ text, voices: [voices[0]], model })}.mp3`);
  if (!existsSync(file)) writeFileSync(file, await speak({ text, voice: voices[0], model, apiKey: key }));
  intro = { file, seconds: duration(file) };
}

const out = resolve(opts.out || join(ROOT, 'podcast/out', `${slug}.mp3`));
mkdirSync(dirname(out), { recursive: true });
const list = join(cacheDir, 'concat.txt');
writeFileSync(list, files.map((f) => `file '${f}'`).join('\n'));
// Join, even out loudness for car/shower listening, and shrink to mono 64 kbps (~30 MB per hour).
const loud = 'loudnorm=I=-16:TP=-1.5:LRA=11';
const mono = 'aresample=44100,aformat=channel_layouts=mono';
const body = ['-f', 'concat', '-safe', '0', '-i', list];
const filter = intro
  ? (() => {
    // Title starts 1.8 s in; the music fades over the last 3 s, ending 2 s after the title.
    const len = Math.max(8.5, 1.8 + intro.seconds + 2).toFixed(2);
    return ['-i', MUSIC, '-i', intro.file, '-filter_complex',
      `[1:a]apad,volume=0.55,afade=t=out:st=${(len - 3).toFixed(2)}:d=3[m];[2:a]adelay=1800|1800,volume=1.1[v];` +
      `[m][v]amix=inputs=2:duration=longest:normalize=0,atrim=0:${len},${mono}[intro];[0:a]${mono}[b];` +
      `[intro][b]concat=n=2:v=0:a=1,${loud}`];
  })()
  : ['-af', loud];
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...body, ...filter, '-ac', '1', '-ar', '44100', '-b:a', '64k', out]);
const seconds = duration(out);
console.log(`wrote ${out} (${Math.floor(seconds / 60)}m${Math.round(seconds % 60)}s)`);
