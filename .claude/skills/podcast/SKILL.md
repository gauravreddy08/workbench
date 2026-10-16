---
name: podcast
description: Turn a Workbench lesson into a two-host podcast episode (script, Fish Audio voice, private feed, player on the lesson page). Use when Gaurav runs /podcast <slug>, or asks to make, redo, or publish a podcast / audio version of a lesson, or to podcast all new lessons. Flags - --script-only stops before paying for audio; --render-only and --publish-only skip ahead.
---

# Podcast

Turns `src/lessons/<slug>.mdx` into an episode he can listen to in the shower or the car without
ever needing to look something up. Spec: `docs/superpowers/specs/2026-10-16-lesson-podcasts-design.md`.
Script rules: `podcast/STYLE.md` (read it in full every time; naturalness and "no quiz" are hard rules).

Arguments: one or more lesson slugs, or `new` for every written lesson with no
`podcast/scripts/<slug>.md` yet. Flags: `--script-only`, `--render-only`, `--publish-only`.

## 1. Script (Claude Code writes it; no API spend)

For each slug, if `podcast/scripts/<slug>.md` already exists, ask whether to rewrite it or reuse it.
For several slugs, run one subagent per lesson in parallel, each given this whole section.

1. **Read** `podcast/STYLE.md`, `CLAUDE.md` ("Who the reader is", "How he wants to be taught"),
   the lesson's entry in `src/data/curriculum.ts`, and all of `src/lessons/<slug>.mdx`: figure
   captions and SVG labels, `<Term>` notes, `<Predict>` answers, `<Task>` contents, Break It, and the
   Explain It Back model answers inside `<details>`.
2. **Outline** → `podcast/outlines/<slug>.md`. Walk the lesson section by section and list every
   teachable item, numbered: each idea, definition, number, trade-off, correction of a wrong mental
   model, Predict (question + answer), figure (what it shows), Build It task (what's built, the part
   that matters, what you'd see), Measure expectation, Break It case, Explain It Back answer content,
   Origin facts. Next to each, one line on how it will be said aloud. Then plan the flow.
3. **Script** → `podcast/scripts/<slug>.md`, in the file format in STYLE.md. Write section by
   section, re-reading that part of the lesson before each. As long as the lesson needs.
4. **Coverage check** → `podcast/scripts/<slug>.coverage.md`. Go through the lesson again, section
   by section: a table of every outline item → where it lands in the script (a few quoted words) or
   MISSING. Fix every MISSING in the script. Check every number matches the lesson.
5. **Naturalness pass.** Re-read the whole script asking only "would a person actually say this out
   loud, here?" Rewrite or cut planted questions, filler reactions, show clichés, anything that reads
   a figure, table or code, written-language constructions, textbook sentences. Vary turn lengths.
   Opening goes straight into the problem; ending is B restating the core idea and A sharpening it,
   then stop. No symbols left that a voice would misread (write them as words).
6. **Validate:** `node podcast/render.mjs <slug> --dry-run` must parse it and prints words, minutes
   and cost. Fix any parse error it reports (line numbers included).

Stop here on `--script-only`, and tell him the word count, minutes and where the script is.

## 2. Render (Fish Audio)

```
node podcast/render.mjs <slug>
```

Needs `FISH_API_KEY`, `FISH_VOICE_A`, `FISH_VOICE_B` in `.env` (template: `.env.example`, setup:
`podcast/README.md`). If they're missing, stop and ask him for them; don't guess voice ids.
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
`npm run build` must pass. Commit the script, outline, coverage file, `episodes.json` and
`curriculum.ts` together; deploy the site the usual way (see the `workbench` skill) so the player
appears. Never commit `.env`, `podcast/out/` or `podcast/.cache/`.

## When he gives feedback on an episode

Feedback about how the hosts talk is about every episode: put the rule into `podcast/STYLE.md`
(keep it short and concrete), then fix that episode's script and re-render. Feedback about one
episode's content: fix that script only.
