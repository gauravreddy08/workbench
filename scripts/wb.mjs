#!/usr/bin/env node
// Workbench CLI: what Claude Code (and you) use to search lessons and work the DB.
//
//   node scripts/wb.mjs map                      every lesson: track, slug, written?, title
//   node scripts/wb.mjs search <words...>        find lessons mentioning words (title, question, body)
//   node scripts/wb.mjs inbox [open|done|all]    list inbox items (default: open)
//   node scripts/wb.mjs add "<term>" [--source s] [--track t] [--tag now|map|later]
//   node scripts/wb.mjs tag <id> <now|map|later|none>
//   node scripts/wb.mjs done <id> "<what you did>"
//   node scripts/wb.mjs rm <id>
//   node scripts/wb.mjs progress                 per-lesson progress (tasks checked, visited)
//
// DB commands need WORKBENCH_TOKEN and CONVEX_URL in .env.local (created by setup).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const [cmd, ...rest] = process.argv.slice(2);

function env() {
  const p = join(root, '.env.local');
  if (!existsSync(p)) die('No .env.local. Run `npx convex dev --once` and set WORKBENCH_TOKEN (see .claude/skills/workbench/SKILL.md).');
  const out = {};
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*([^#\s]+)/);
    if (m) out[m[1]] = m[2];
  }
  if (!out.WORKBENCH_TOKEN || !out.CONVEX_URL) die('.env.local needs WORKBENCH_TOKEN and CONVEX_URL.');
  return out;
}

async function db() {
  const { ConvexHttpClient } = await import('convex/browser');
  const { api } = await import(join(root, 'convex/_generated/api.js'));
  const e = env();
  return { c: new ConvexHttpClient(e.CONVEX_URL), api, token: e.WORKBENCH_TOKEN };
}

function die(msg) { console.error(msg); process.exit(1); }

function flags(args) {
  const pos = [], f = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) f[args[i].slice(2)] = args[++i];
    else pos.push(args[i]);
  }
  return { pos, f };
}

// Parse curriculum.ts without a TS toolchain: tracks and lesson objects are regular enough.
function curriculum() {
  const src = readFileSync(join(root, 'src/data/curriculum.ts'), 'utf8');
  const lessons = [];
  let track = '';
  for (const block of src.split(/\n\s*\{\n/)) {
    const t = block.match(/^\s*id: '([^']+)',\s*\n\s*n: (\d+),\s*\n\s*title: '([^']+)'/);
    if (t) track = t[3];
    const slug = block.match(/slug: '([^']+)'/);
    if (!slug || t) continue;
    const get = (k) => (block.match(new RegExp(`${k}:\\s*'((?:[^'\\\\]|\\\\.)*)'`)) || [])[1]?.replace(/\\'/g, "'") ?? '';
    lessons.push({ track, slug: slug[1], title: get('title'), question: get('question'), written: existsSync(join(root, 'src/lessons', `${slug[1]}.mdx`)) });
  }
  return lessons;
}

const commands = {
  map() {
    for (const l of curriculum()) console.log(`${l.written ? 'written' : 'STUB   '}  ${l.track.padEnd(12)} ${l.slug.padEnd(26)} ${l.title}`);
  },

  search(words) {
    if (!words.length) die('usage: search <words...>');
    const re = new RegExp(words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i');
    for (const l of curriculum()) {
      const hits = [];
      if (re.test(`${l.title} ${l.question}`)) hits.push(`  [map] ${l.title} — ${l.question}`);
      const p = join(root, 'src/lessons', `${l.slug}.mdx`);
      if (existsSync(p)) {
        const lines = readFileSync(p, 'utf8').split('\n');
        let n = 0;
        lines.forEach((line, i) => {
          if (n < 4 && re.test(line) && !line.startsWith('import ')) { hits.push(`  L${i + 1}: ${line.replace(/<[^>]+>/g, '').trim().slice(0, 140)}`); n++; }
        });
      }
      if (hits.length) console.log(`${l.slug}  (${l.track})\n${hits.join('\n')}\n`);
    }
  },

  async inbox([which = 'open']) {
    const { c, api, token } = await db();
    const rows = await c.query(api.inbox.list, which === 'all' ? { token } : { token, status: which });
    if (!rows.length) return console.log(`(no ${which} items)`);
    for (const r of rows) {
      console.log(`${r._id}  [${r.tag || 'untagged'}] ${r.term}`);
      const meta = [r.source && `from: ${r.source}`, r.track && `track: ${r.track}`, new Date(r._creationTime).toISOString().slice(0, 10)].filter(Boolean).join(' · ');
      console.log(`    ${meta}${r.note ? `\n    note: ${r.note}` : ''}`);
    }
  },

  async add(args) {
    const { pos, f } = flags(args);
    if (!pos[0]) die('usage: add "<term>" [--source s] [--track t] [--tag now|map|later]');
    const { c, api, token } = await db();
    const id = await c.mutation(api.inbox.add, { token, term: pos.join(' '), source: f.source, track: f.track, tag: f.tag });
    console.log(`added ${id}`);
  },

  async tag([id, tag]) {
    if (!id || !tag) die('usage: tag <id> <now|map|later|none>');
    const { c, api, token } = await db();
    await c.mutation(api.inbox.setTag, { token, id, tag: tag === 'none' ? '' : tag });
    console.log('ok');
  },

  async done([id, ...note]) {
    if (!id || !note.length) die('usage: done <id> "<what you did>"');
    const { c, api, token } = await db();
    await c.mutation(api.inbox.resolve, { token, id, note: note.join(' ') });
    console.log('ok');
  },

  async rm([id]) {
    if (!id) die('usage: rm <id>');
    const { c, api, token } = await db();
    await c.mutation(api.inbox.remove, { token, id });
    console.log('removed');
  },

  async progress() {
    const { c, api, token } = await db();
    const rows = await c.query(api.progress.all, { token });
    const by = {};
    for (const r of rows) {
      const [, kind, slug] = r.key.split(':');
      by[slug] ??= { tasks: 0, predictions: 0, visited: false };
      if (kind === 'task' && r.value === '1') by[slug].tasks++;
      if (kind === 'predict' && r.value.trim()) by[slug].predictions++;
      if (kind === 'visited') by[slug].visited = true;
    }
    const totals = {};
    for (const f of readdirSync(join(root, 'src/lessons'))) {
      totals[f.replace('.mdx', '')] = (readFileSync(join(root, 'src/lessons', f), 'utf8').match(/<Task\s/g) || []).length;
    }
    const slugs = Object.keys(by);
    if (!slugs.length) return console.log('(no synced progress yet: unlock a browser on /inbox/ to start syncing)');
    for (const s of slugs) console.log(`${s.padEnd(26)} tasks ${by[s].tasks}/${totals[s] ?? '?'}  predictions ${by[s].predictions}  ${by[s].visited ? 'visited' : ''}`);
  },
};

if (!commands[cmd]) {
  console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 14).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  process.exit(cmd ? 1 : 0);
}
await commands[cmd](rest);
