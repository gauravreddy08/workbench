# Lesson Podcasts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/podcast <slug>` turns a Workbench lesson into a two-host episode, voices it with Fish Audio, publishes it to a private podcast feed on Cloudflare R2, and puts a player on the lesson page.

**Architecture:** Claude Code writes the script (skill + style guide, no API spend). Plain Node ESM scripts with no LLM do the rest: `render.mjs` (parse script → chunks → Fish TTS with cache → ffmpeg join) and `publish.mjs` (R2 upload → episodes.json → feed.xml → curriculum.ts `audio`). Pure logic lives in `podcast/lib/` and is unit-tested with `node:test`; network and ffmpeg sit behind thin functions.

**Tech Stack:** Node 26 ESM, `node:test`, ffmpeg/ffprobe (Homebrew), Fish Audio REST `POST https://api.fish.audio/v1/tts`, `@aws-sdk/client-s3` against R2's S3 endpoint, Astro 7.

**Spec:** `docs/superpowers/specs/2026-10-16-lesson-podcasts-design.md`

## Global Constraints

- Voice: Fish Audio only. Model header `s2.1-pro-free` by default, `s2.1-pro` via `FISH_MODEL`. Two speakers per request: `reference_id: [voiceA, voiceB]`, text uses `<|speaker:0|>` (A, explainer) / `<|speaker:1|>` (B, listener).
- Fish concurrency: at most 5 requests in flight (Starter tier). 429 has no Retry-After: exponential backoff.
- Script file: `podcast/scripts/<slug>.md`; turns start with `A:` or `B:`; `<!-- section: X -->` comments are never spoken.
- Output: mono MP3, 64 kbps, loudness-normalized (-16 LUFS), `podcast/out/<slug>.mp3` (gitignored). Cache: `podcast/.cache/` (gitignored).
- Secrets only from `.env` (already gitignored): `FISH_API_KEY`, `FISH_VOICE_A`, `FISH_VOICE_B`, `FISH_MODEL`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_BASE`, `R2_PREFIX`.
- Feed is unlisted: lives under a long random `R2_PREFIX`; `<itunes:block>Yes</itunes:block>`.
- Naturalness rule and "no quiz" from the spec apply to every script.
- No new runtime deps for the site. `@aws-sdk/client-s3` as a devDependency only.
- `npm run build` must pass.

## Review Focus

1. A single very long turn (longer than the chunk limit) must be split at sentence boundaries, keeping the same speaker, never mid-sentence.
2. Script text with characters that break XML (`&`, `<`) in titles/descriptions must produce a valid feed.
3. Re-rendering after editing one paragraph must reuse cached chunks and only call Fish for changed ones.
4. Re-publishing an episode must replace its entry (same guid), not duplicate it, and change the MP3 URL so phones refetch.
5. Setting `audio` on a lesson that already has one must replace it, and must not touch a lesson whose slug is a prefix of another (`waiting` vs `waiting-vs-working`).

Each has a test in the owning task below.

---

### Task 1: Script parser and chunker

**Files:** Create `podcast/lib/script.mjs`, `podcast/lib/chunk.mjs`, `podcast/test/script.test.mjs`, `podcast/test/chunk.test.mjs`.

**Interfaces (produces):**
- `parseScript(md: string) => Array<{ speaker: 'A'|'B', text: string, section: string|null }>`; throws `Error` with a line number on text outside a turn.
- `chunkTurns(turns, maxChars = 2000) => string[]`; each string starts with a speaker tag, contains whole turns (or sentence-split pieces of one oversized turn), length ≤ maxChars except a single sentence longer than maxChars.
- `toFishText(turns) => string` (speaker tags inserted).

Tests: parses A/B turns with multi-line continuation; ignores comments and blank lines, tracks section; rejects stray text; chunker never splits a turn when it fits; oversized turn split at sentence ends with the speaker tag repeated (Review Focus 1); every chunk begins with `<|speaker:`.

- [ ] Write failing tests, run `node --test podcast/test/`, see them fail.
- [ ] Implement, run tests, pass. Commit.

### Task 2: Fish client and render CLI

**Files:** Create `podcast/lib/fish.mjs`, `podcast/lib/cache.mjs`, `podcast/lib/env.mjs`, `podcast/render.mjs`, `podcast/test/fish.test.mjs`, `podcast/test/cache.test.mjs`; modify `.gitignore`; create `.env.example`.

**Interfaces:**
- `synthesize({ text, voices: [a,b], model, apiKey, fetchImpl = fetch, retries = 5 }) => Promise<Buffer>`: POST JSON `{ text, reference_id: voices, format: 'mp3', mp3_bitrate: 128, latency: 'normal', normalize: true, temperature: 0.7, top_p: 0.7 }`, headers `Authorization: Bearer`, `model`. Retries 429/5xx with backoff; throws on 4xx with the response body.
- `chunkKey({ text, voices, model }) => string` (sha256 hex, 16 chars).
- `loadEnv(path = '.env')` merges KEY=VALUE lines into `process.env` without overriding existing vars.
- `render.mjs <slug> [--dry-run]`: parse → chunk → for each chunk, use `podcast/.cache/<slug>/<key>.mp3` if present else synthesize (≤5 concurrent) → ffmpeg concat + `loudnorm=I=-16:TP=-1.5:LRA=11`, `-ac 1 -b:a 64k` → `podcast/out/<slug>.mp3`; prints chunk count, cached count, bytes sent, estimated cost, final duration. `--dry-run` prints the plan and cost only.

Tests: request body/headers shape with a fake fetch; retry then success on 429; throws on 400 without retry; same inputs → same key, changed text → new key (Review Focus 3).

- [ ] Tests fail → implement → pass. `node podcast/render.mjs waiting-vs-working --dry-run` on a fixture script works. Commit.

### Task 3: Feed, curriculum edit, publish CLI

**Files:** Create `podcast/lib/feed.mjs`, `podcast/lib/curriculum.mjs`, `podcast/lib/lessons.mjs`, `podcast/publish.mjs`, `podcast/episodes.json` (`[]`), `podcast/cover.png`, tests `podcast/test/feed.test.mjs`, `podcast/test/curriculum.test.mjs`; add devDependency `@aws-sdk/client-s3`.

**Interfaces:**
- `buildFeed({ title, description, link, image, feedUrl }, episodes: Array<{ slug, title, description, url, bytes, seconds, pubDate }>) => string` (RSS 2.0 + itunes namespace, guid = slug, isPermaLink false, newest first).
- `setLessonAudio(source: string, slug: string, url: string) => string`; throws if slug not found.
- `lessonMeta(slug) => { title, question, why }` read from `src/data/curriculum.ts` by regex on the lesson block.
- `upsertEpisode(list, ep) => list` (replace by slug).
- `publish.mjs <slug>`: needs `podcast/out/<slug>.mp3`; uploads to `<R2_PREFIX>/episodes/<slug>-<sha8>.mp3` (Review Focus 4), ffprobe duration, upserts `episodes.json`, builds and uploads `<R2_PREFIX>/feed.xml` and `cover.png`, sets `audio` in `curriculum.ts`, prints feed URL.

Tests: XML escaping (Review Focus 2); upsert replaces same slug (Review Focus 4); setLessonAudio inserts, replaces, and leaves prefix-sharing slugs alone (Review Focus 5); throws on unknown slug.

- [ ] Tests fail → implement → pass. Commit.

### Task 4: Player on the lesson page

**Files:** Modify `src/data/curriculum.ts` (`audio?: string` on `Lesson`), `src/pages/lessons/[slug].astro` (render `<audio controls preload="none">` in the lesson header when set, styled with site tokens).

- [ ] Add a temporary `audio` to one lesson, `npm run build`, check the built HTML contains the `<audio>` tag; remove the temporary value. Commit.

### Task 5: Skill and style guide

**Files:** Create `podcast/STYLE.md` (script rules: hosts, naturalness, lesson-to-talk mapping, code rule, format), `.claude/skills/podcast/SKILL.md` (procedure: outline → section-by-section script → coverage check → naturalness pass → render → publish; `--script-only`), `podcast/README.md` (one-time setup: Fish key + voices, R2 bucket + public URL, subscribing in Apple Podcasts).

- [ ] Write files; check the skill references only commands that exist. Commit.

### Task 6: Pilot script

- [ ] Run the skill's script steps for `waiting-vs-working`: produce `podcast/outlines/waiting-vs-working.md`, `podcast/scripts/waiting-vs-working.md`, `podcast/scripts/waiting-vs-working.coverage.md`.
- [ ] `node podcast/render.mjs waiting-vs-working --dry-run` parses it and reports cost. Commit.

### Task 7: Pilot render and publish (needs Gaurav's keys)

- [ ] With `FISH_API_KEY` and two candidate voice pairs: render a ~10-minute sample per pair; Gaurav picks.
- [ ] Render the full episode, publish with R2 creds, subscribe on phone, confirm playback.
