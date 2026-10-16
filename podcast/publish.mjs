#!/usr/bin/env node
// Publishes podcast/out/<slug>.mp3: uploads it to R2, rebuilds the private feed, and sets the
// lesson's `audio` in src/data/curriculum.ts so the site shows a player.
//
//   node podcast/publish.mjs <slug>
//   node podcast/publish.mjs --feed-only      re-upload feed.xml and cover from episodes.json

import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { lessonMeta, setLessonAudio } from './lib/curriculum.mjs';
import { loadEnv, requireEnv } from './lib/env.mjs';
import { buildFeed, upsertEpisode } from './lib/feed.mjs';

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), '..');
const CURRICULUM = join(ROOT, 'src/data/curriculum.ts');
const EPISODES = join(ROOT, 'podcast/episodes.json');
const COVER = join(ROOT, 'podcast/cover.png');

const { values: opts, positionals } = parseArgs({
  allowPositionals: true,
  options: { 'feed-only': { type: 'boolean', default: false } },
});
const slug = positionals[0];
if (!slug && !opts['feed-only']) {
  console.error('usage: node podcast/publish.mjs <slug> | --feed-only');
  process.exit(1);
}

loadEnv(join(ROOT, '.env'));
const env = requireEnv('R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_BASE', 'R2_PREFIX');
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
});
const publicUrl = (key) => `${env.R2_PUBLIC_BASE}/${key}`;
const put = (key, body, type, cache = 'public, max-age=31536000, immutable') =>
  s3.send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: body, ContentType: type, CacheControl: cache }));

let episodes = JSON.parse(readFileSync(EPISODES, 'utf8'));
const curriculum = readFileSync(CURRICULUM, 'utf8');

if (slug) {
  const mp3Path = join(ROOT, 'podcast/out', `${slug}.mp3`);
  if (!existsSync(mp3Path)) throw new Error(`No ${mp3Path}. Run: node podcast/render.mjs ${slug}`);
  const mp3 = readFileSync(mp3Path);
  // The hash in the name changes whenever the audio does, so phones fetch the new file.
  const key = `${env.R2_PREFIX}/episodes/${slug}-${createHash('sha256').update(mp3).digest('hex').slice(0, 8)}.mp3`;
  console.log(`uploading ${(mp3.length / 1e6).toFixed(1)} MB → ${key}`);
  await put(key, mp3, 'audio/mpeg');

  const seconds = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp3Path]));
  const meta = lessonMeta(curriculum, slug);
  const previous = episodes.find((e) => e.slug === slug);
  episodes = upsertEpisode(episodes, {
    slug,
    title: meta.title,
    description: `${meta.question} ${meta.why}`,
    url: publicUrl(key),
    bytes: mp3.length,
    seconds: Math.round(seconds),
    pubDate: previous?.pubDate ?? new Date().toISOString(),
  });
  writeFileSync(EPISODES, JSON.stringify(episodes, null, 2) + '\n');
  writeFileSync(CURRICULUM, setLessonAudio(curriculum, slug, publicUrl(key)));
  console.log(`set audio for ${slug} in curriculum.ts`);
}

const feedKey = `${env.R2_PREFIX}/feed.xml`;
const coverKey = `${env.R2_PREFIX}/cover.png`;
await put(coverKey, readFileSync(COVER), 'image/png', 'public, max-age=86400');
const feed = buildFeed({
  title: 'Workbench',
  description: 'CS and ML lessons from gtadkapally.com/learn-cs, talked through end to end.',
  link: 'https://gtadkapally.com/learn-cs',
  image: publicUrl(coverKey),
  feedUrl: publicUrl(feedKey),
}, episodes);
// Short cache so new episodes show up on the phone within minutes.
await put(feedKey, feed, 'application/rss+xml; charset=utf-8', 'public, max-age=300');
console.log(`feed: ${publicUrl(feedKey)} (${episodes.length} episodes)`);
