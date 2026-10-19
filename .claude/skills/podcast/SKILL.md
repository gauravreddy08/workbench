---
name: podcast
description: Turn a Workbench lesson into a two-host podcast episode (script, ElevenLabs voices, private feed, player on the lesson page). Use when Gaurav runs /podcast <slug>, or asks to make, redo, or publish a podcast / audio version of a lesson, or to podcast all new lessons. Flags - --script-only stops before paying for audio; --render-only and --publish-only skip ahead.
---

# Podcast

Turns `src/lessons/<slug>.mdx` into an episode he can listen to in the shower or the car without
ever needing to look something up: the story and the idea, not every detail (the written
lesson carries those). Spec: `docs/superpowers/specs/2026-10-16-lesson-podcasts-design.md`.
Script rules: `podcast/STYLE.md` (read it in full every time; naturalness and "no quiz" are hard rules).

Arguments: one or more lesson slugs, or `new` for every written lesson with no
`podcast/scripts/<slug>.md` yet. Flags: `--script-only`, `--render-only`, `--publish-only`.

## 1. Script (Claude Code writes it; no API spend)

For each slug, if `podcast/scripts/<slug>.md` already exists, ask whether to rewrite it or reuse it.
For several slugs, run one subagent per lesson in parallel, each given this whole section.

1. **Read** `podcast/STYLE.md`, `CLAUDE.md` ("Who the reader is", "How he wants to be taught"),
   the lesson's entry in `src/data/curriculum.ts`, and all of `src/lessons/<slug>.mdx`. Listen to
   the voice of `podcast/scripts/bandwidth-bound.md`: it is the reference episode he approved.
2. **Pick the thread** → `podcast/outlines/<slug>.md`. A short note: the one big idea, the opening
   scene, the wrong mental model B will voice, the five to eight beats of the story, the few numbers
   (if any) worth saying, and what is deliberately left to the written lesson.
3. **Script** → `podcast/scripts/<slug>.md`, in the file format in STYLE.md. Usually 1,500 to 3,000
   spoken words. Story and ideas; almost no numbers; no formulas, code, tables or step lists.
4. **Check facts.** Every claim must match the lesson. No numbers or claims the lesson doesn't make.
5. **Naturalness pass.** Re-read the whole script asking only "would a person actually say this out
   loud, here?" and "could someone follow this while driving?" Cut anything that needs a pen.
6. **Validate:** `node podcast/render.mjs <slug> --dry-run` must parse it and prints words, minutes
   and cost. Fix any parse error it reports (line numbers included).

Stop here on `--script-only`, and tell him the word count, minutes and where the script is.

## 2. Render (ElevenLabs)

```
node podcast/render.mjs <slug>
```

Needs `ELEVENLABS_API_KEY`, `ELEVEN_VOICE_A`, `ELEVEN_VOICE_B` in `.env` (template: `.env.example`, setup:
`podcast/README.md`). If they're missing, stop and ask him for them; don't guess voice ids. The dry run prints the cost
(about $0.04 per thousand characters on `eleven_v4_turbo`, so about fifty cents per episode); a 402/quota error means the ElevenLabs plan is out of
characters for the month, so tell him rather than retrying.
Chunks cache in `podcast/.cache/<slug>/`, so re-running after a failure or a script edit only pays
for changed chunks. Output: `podcast/out/<slug>.mp3`. Listen check: report the duration; if it is far
off the dry-run estimate (more than ~25%), something was dropped or repeated — say so.

To try other voices on a sample first:
`node podcast/render.mjs <slug> --minutes 10 --voices <idA>,<idB> --out podcast/out/<slug>.sample.mp3`

## 3. Publish

```
node podcast/publish.mjs <slug>
```

Needs the `R2_*` values in `.env`. Uploads the MP3 to R2, updates `podcast/episodes.json`, rebuilds
and uploads `feed.xml`, and sets `audio` on the lesson in `src/data/curriculum.ts`. Then
`npm run build` must pass. Commit the script, outline, `episodes.json` and
`curriculum.ts` together; deploy the site the usual way (see the `workbench` skill) so the player
appears. Never commit `.env`, `podcast/out/` or `podcast/.cache/`.

## When he gives feedback on an episode

Feedback about how the hosts talk is about every episode: put the rule into `podcast/STYLE.md`
(keep it short and concrete), then fix that episode's script and re-render. Feedback about one
episode's content: fix that script only.
