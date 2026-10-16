# Lesson podcasts

Each lesson becomes a two-host episode on a private podcast feed. Run `/podcast <slug>` in Claude
Code; see `.claude/skills/podcast/SKILL.md`. Script rules are in `STYLE.md`.

```
podcast/
  STYLE.md              how scripts are written
  scripts/<slug>.md     the episode script (A explains, B listens)
  outlines/<slug>.md    what the lesson teaches, item by item
  render.mjs            script → ElevenLabs → out/<slug>.mp3
  publish.mjs           mp3 → R2 → feed.xml, and the player on the lesson page
  episodes.json         what's in the feed
  lib/, test/           node --test 'podcast/test/*.test.mjs'
```

## One-time setup

Copy `.env.example` to `.env` and fill it in.

**ElevenLabs.** Put your API key in `ELEVENLABS_API_KEY`. The voices are Christopher - Friendly,
Kind and Raspy (`ELEVEN_VOICE_A`, explainer) and Mike - Natural and Engaging Podcast Host
(`ELEVEN_VOICE_B`, listener), from the shared voice library; add them to your account once (Voice
Library → Add) if a render says the voice isn't found. `eleven_v4_turbo` is $0.04 per 1,000
characters, about $2.20 per hour-long episode. Starter's 40k credits a month isn't enough for one
episode; Creator ($22/mo) covers about ten.

**Cloudflare R2.**
1. Cloudflare dashboard → R2 → create a bucket (e.g. `workbench-podcast`).
2. Bucket → Settings → Public access → enable the r2.dev URL (or connect a custom domain).
   Put that URL in `R2_PUBLIC_BASE`.
3. R2 → Manage API tokens → create a token with Object Read & Write on that bucket. Put the account
   id, access key id and secret in `.env`.
4. `R2_PREFIX`: run `openssl rand -hex 16` and paste the result. It keeps the feed URL unguessable.

**On your phone.** After the first `publish`, it prints the feed URL. In Apple Podcasts: Library →
… (top right) → Follow a Show by URL → paste. New episodes then arrive on their own. Overcast and
Pocket Casts also take a feed URL.

## Costs

Scripts: written by Claude Code, no API spend. Voice: about $2.20 per hour of audio on ElevenLabs
v4 Turbo (the whole 62-lesson backlog is roughly $135). Hosting: R2's free tier covers this (62 hour-long episodes are about 2 GB, and
R2 doesn't charge for downloads).
