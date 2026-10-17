# Workbench

A build-it-yourself manual for CS fundamentals and ML systems, live at
https://gtadkapally.com/learn-cs. Every lesson: predict a number, build the thing, measure it,
explain it back in plain words.

```sh
npm install
npm run dev      # http://localhost:4321/learn-cs
npm run build    # static site in dist/ (and .vercel-out/learn-cs for Vercel)
```

- Map of all lessons: `src/data/curriculum.ts`; lessons: `src/lessons/<slug>.mdx`
- House style and lesson anatomy: `CLAUDE.md`
- Claude Code skill for searching, adding and triaging content: `.claude/skills/workbench/SKILL.md`
- DB (gap inbox + synced progress): Convex, functions in `convex/`, CLI in `scripts/wb.mjs`

## Adding things to learn
- On the site: `/learn-cs/inbox`. Items save in that browser and the page builds a prompt for a coding agent.
- Owner sync: unlock the inbox (Owner sync, at the bottom) once per device with `WORKBENCH_TOKEN`
  from `.env.local` to sync the inbox and progress through Convex.
- In Claude Code: "add X to workbench", "triage my workbench inbox", "write the lesson on X".

## Forking
Edit the reader profile in `CLAUDE.md` so lessons aim at your gaps, and set `base` in
`astro.config.mjs`. The site works without a database. For sync across devices, create your own
Convex project (`npx convex dev`), set `OWNER_TOKEN` there (`npx convex env set OWNER_TOKEN <random>`),
put the same value in `.env.local` as `WORKBENCH_TOKEN` along with `CONVEX_URL`, and point
`src/data/site.ts` at your deployment URL.

## Deploying
- Site: `vercel deploy --prod` (project `workbench`). gtadkapally.com/learn-cs is a rewrite in
  the personal site repo (`gauravreddy08/gauravreddy08.github.io`, `next.config.ts`).
- DB functions, only when `convex/` changes: `npx convex dev --once`.
