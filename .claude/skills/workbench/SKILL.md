---
name: workbench
description: Search, read, add to and publish Gaurav's Workbench curriculum (CS + ML learn-by-building site). Use when he asks to triage his inbox, add a concept/term/topic to learn, write or revise a lesson, find which lesson covers something, check his progress, or deploy the site. Triggers: "triage my inbox", "add X to workbench", "I want to learn X", "write the lesson on X", "where did we cover X", "what have I done", "deploy workbench".
---

# Workbench

The site lives in this repo (Astro + MDX), is served at gtadkapally.com/learn-cs, and has a
Convex DB for the gap inbox and synced progress. `CLAUDE.md` is the authoring contract: read it
before writing or revising any lesson.

## Tools

All DB access goes through `node scripts/wb.mjs` (reads `.env.local` for the Convex URL and the
owner token; never print the token).

| Need | Command |
|---|---|
| Every lesson and whether it's written | `node scripts/wb.mjs map` |
| Which lessons cover a topic | `node scripts/wb.mjs search <words>` (then read `src/lessons/<slug>.mdx`) |
| Open inbox items | `node scripts/wb.mjs inbox` (`done` / `all` for others) |
| Add an item | `node scripts/wb.mjs add "<term>" --source "<where>" --track "<Track>" --tag now\|map\|later` |
| Close an item | `node scripts/wb.mjs done <id> "<what you did>"` |
| What he has done | `node scripts/wb.mjs progress` |

## Procedures

### "I want to learn X" / "add X"
1. `search X` first. If a lesson already covers it, say which one (and which section). Offer to
   deepen that lesson instead of creating a duplicate.
2. Otherwise decide: does it block what he's building now (write the lesson now), or is it for
   later (add a stub to `src/data/curriculum.ts` in the right track, with `source`)? If unsure,
   add it to the inbox with `add` and ask.

### "Triage my inbox"
1. `inbox` to list open items. For each:
   - covered by an existing lesson → `done <id> "covered in <slug>, section <name>"`
   - tag `now`, or clearly blocks current work → write the lesson (below), then `done <id> "lesson written: <slug>"`
   - tag `map`, or appears in job posts / interviews / his work → add a stub to `curriculum.ts`, then `done <id> "stub added: <slug> in <track>"`
   - tag `later` or unclear → leave open
2. Report a short table: item → what happened.

### Write or revise a lesson
1. Read `CLAUDE.md` fully, the curriculum entry, and one finished lesson for voice.
2. Use `progress` to see what he has actually done; build on lessons he finished and link them.
3. Write `src/lessons/<slug>.mdx` (+ figures in `src/components/figures/`), following the anatomy,
   components, privacy and facts rules in `CLAUDE.md`.
4. Internal links are written as `/lessons/<slug>/` (the build adds the `/learn-cs` base).
5. `npm run build` must pass. Then deploy (below) if he wants it live.
For several lessons at once, run one isolated agent per lesson with the same instructions.

### Deploy
- Site: `vercel deploy --prod` (project `workbench`). Live at gtadkapally.com/learn-cs via a
  rewrite in the personal-website repo (gauravreddy08/gauravreddy08.github.io, `next.config.ts`).
- DB functions (only if `convex/` changed): `npx convex dev --once`.

## Data model (convex/schema.ts)
- `inbox`: term, source, track, tag (''|now|map|later), status (open|done), note.
- `progress`: key/value mirror of the site's localStorage keys `wb:task:<slug>:<id>` ("1"/"0"),
  `wb:predict:<slug>:<id>` (his written prediction), `wb:visited:<slug>`.
His predictions are worth reading before revising a lesson: they show exactly what he got wrong.
