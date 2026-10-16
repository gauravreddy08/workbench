# Workbench

A personal, build-it-yourself curriculum site for Gaurav: CS fundamentals and ML systems, learned by
building real things. Astro + MDX, static. Design language borrowed from makingsoftware.com
(pixel display type, serif body, mono labels, one blue ink, blueprint-grid figures).

- `src/data/curriculum.ts` is the map (tracks, lessons, stubs). Source of truth for the table of contents.
- `src/lessons/<slug>.mdx` is a written lesson. If the file is missing, the lesson renders as a stub.
- `src/components/` holds the lesson building blocks. `src/components/figures/` holds interactive figures.
- `npm run dev` to preview, `npm run build` must pass before you finish.
- `node scripts/wb.mjs` searches lessons and works the Convex DB (inbox, progress). See the `workbench` skill.

## Who the reader is

Gaurav: 24, MS in CS, ~1 year into his first job (TinyFish, a web-infrastructure company), currently
training a cross-encoder ranking model. Very fast at reading docs, wiring SDKs, and shipping demos.
Has built GPT-2/Llama from scratch (attention, RoPE), trained many CNNs, knows LoRA/DPO/PPO/spec
decoding in theory. Has a DGX Spark (GB10 Grace Blackwell, 128 GB unified LPDDR5x, ~273 GB/s memory
bandwidth, ARM64 CPU, DGX OS / Ubuntu) and a home SSH server reached over Tailscale. Target: the bar
Anthropic hires research/software engineers at.

Gaps found in a diagnostic (Oct 2026), so lessons can aim at them:
- **Numbers.** No feel for latency (RAM vs SSD vs network), bytes, memory sizes, bandwidth. This is
  why "how does it scale?" stumps him. Biggest single gap.
- OS basics: process vs thread, GIL: blank. Thought stack = FIFO and memory heap = heap data structure.
- Sync/async: thought a sync server "crashes" under load and async "is a queue". Wrong model.
- Containers vs VMs: fuzzy (thought it was about GUIs). DB indexes, transactions: fuzzy/blank.
- Got right: load balancer state problem, why p99 matters, KV cache idea, overfitting, ranking metrics.
- ML fuzzy: why decoding is memory-bound, memory math for models, why speculative decoding is exact
  (doesn't know what "output distribution" means precisely), bf16 vs fp16 (had it backwards).

## How he wants to be taught (the important part)

- **Simple words, full depth.** He loses the thread the moment a sentence stacks jargon. He often
  knows the idea but not the word. Never drop detail; drop jargon. Every technical term gets defined
  in plain words the first time, with `<Term>`. If you explained it to a smart friend from another
  field, how would you say it? Say that.
- **Intuition first, then mechanism, then the real names.** Analogy or concrete scene, then what the
  machine actually does, then the official vocabulary.
- **Feel it before reading about it.** Each lesson makes the problem happen on his machine first,
  then explains it, then fixes it. Measured numbers beat asserted ones.
- **The history is the "why".** Open with the problem that forced the invention (`<Origin>`).
- Not a generic tutorial. No library-management apps. Builds should be things a strong engineer
  would find interesting, ideally tied to his real work (inference on the Spark, ranking, agents).
- Write like Dan Hollick (Making Software): warm, curious, plain, a little playful, never cute.
  Short paragraphs. Concrete. Confident. No filler, no hype, no "In this lesson we will...".

## Lesson anatomy

Frontmatter is not needed (metadata comes from `curriculum.ts`). The page already renders the title
and question; start the MDX body directly. Use these `##` sections in this order (the h2 text
becomes the side navigation and is auto-numbered, so keep it short, Title Case):

1. `## Today` — 3-5 bullets: what you'll be able to do/explain by the end. Plus prerequisites line
   and rough time if useful.
2. `## The Problem` — a concrete scene where the thing bites. Usually includes `<Origin>`.
3. `## The Idea` — the plain-language explanation with figures. The heart of the lesson. Build up
   in layers. Use `<Term>` for every piece of jargon. Use `<Predict>` before any reveal.
4. `## Build It` — one or more `<Task>`s. Real code he types. Scaffolding allowed, but the part that
   teaches is his to write: show the shape, signatures, and hints, not the full solution, for
   `hands` tasks. Give full code for setup/boilerplate (`ok` tasks). End with `<DoneWhen>`.
5. `## Measure` — what to measure, how, a results table to fill in, and what the numbers should look
   like and why. Predictions get checked here.
6. `## Break It` — 2-4 deliberate ways to break it and what each teaches.
7. `## Explain It Back` — 3-5 questions he should be able to answer out loud in plain words, as if in
   an interview. Include at least one "how does this scale?" style question. Model answers inside
   `<details>` (collapsed).
8. `## Go Deeper` — 4-8 high quality sources (classic papers, great blog posts, official docs, book
   chapters), each with one line on why it's worth it. Only real, well-known sources you are sure
   exist; prefer canonical ones. No invented URLs. If unsure of an exact URL, cite title + author.
9. `## Connections` (optional) — which other lessons this unlocks or builds on, linked as
   `/lessons/<slug>/`.

Length: ~4,000-6,000 words of prose plus code. Depth over breadth, but no padding: cut anything
that doesn't teach.

## Components (import at top of MDX)

```mdx
import Term from '../components/Term.astro';
import Figure from '../components/Figure.astro';
import Origin from '../components/Origin.astro';
import Predict from '../components/Predict.astro';
import Task from '../components/Task.astro';
import DoneWhen from '../components/DoneWhen.astro';
```

- `<Term w="kernel">The core of the operating system: the program that ...</Term>` — inline, right
  where the word appears in a sentence (it renders the word itself, underlined, with the note in the
  margin). Keep notes 1-3 sentences. Use the `label` prop if the margin title should differ.
  Must sit inside a paragraph on one line with surrounding text, e.g.
  `Every process has its own <Term w="address space">...</Term>, which ...`
- `<Figure n="001" title="LATENCY LADDER" caption="One sentence that says what to notice.">` with
  inline SVG or an interactive figure component inside. Number figures per lesson from 001. Add
  `wide` to bleed into the margin for big diagrams.
- `<Origin year="1999" title="The C10K problem">paragraphs</Origin>`
- `<Predict id="unique-id">Question text<Fragment slot="answer">Answer, with the reasoning</Fragment></Predict>`
- `<Task id="t1" title="Short imperative title" agent="hands|explain|review|ok">...</Task>`
  - `hands`: he writes it, no agent. The core learning.
  - `explain`: agent may explain concepts or errors, not write the code.
  - `review`: he writes it, then an agent reviews.
  - `ok`: boilerplate/setup; agent can write it.
- `<DoneWhen>` wrapping a markdown list.
- Markdown tables, fenced code with language tags, `<details><summary>` all work.

MDX gotchas: blank lines around block components and fenced code; `{` and `<` in prose must be
escaped (`\{`, `&lt;`) or put in code; don't indent markdown inside components by 4+ spaces (it
becomes a code block); inside components, leave a blank line after the opening tag so markdown
renders.

## Figures and diagrams

Diagrams do the heavy lifting, as in Making Software. Aim for 3-6 figures per lesson, at least one
interactive where moving something teaches more than reading (sliders, toggles, step-through
animations).

- Static figures: hand-written inline SVG inside `<Figure>`. Use `viewBox`, no fixed width, so it
  scales. Use the shared classes (defined in `global.css`), never hardcoded colors, so dark mode works:
  `class="ink"` (black stroke), `class="blue"` (blue stroke), `class="fill-blue"`, `class="fill-wash"`
  (light blue fill + blue stroke), `class="fill-paper"`, `class="dash"`; `<text>` is mono 11px by
  default, add `class="strong"` or `class="blue-t"`. Stroke width 1-1.5. Line art, flat, technical-
  drawing feel: boxes, arrows, timelines, stacked layers, labelled callouts with leader lines. Keep
  text in SVG short and uppercase-ish labels; explanation goes in prose.
  In MDX and .astro, write SVG attributes in their normal hyphenated form: `stroke-width`,
  `stroke-dasharray`, `text-anchor`, `marker-end`, `font-size`. Astro passes camelCase names
  (`strokeWidth`, `textAnchor`) through verbatim and browsers silently ignore them. Natively
  camelCase SVG attributes stay as-is: `viewBox`, `markerWidth`, `refX`, `preserveAspectRatio`.
  `class` works for SVG.
- Interactive figures: an `.astro` component in `src/components/figures/` named
  `<LessonSlugPascal><Thing>.astro` (e.g. `LatencyLadder.astro`), with markup + a `<script>` in
  vanilla TS. Scripts are bundled once per component, so query all instances with
  `document.querySelectorAll('[data-fig="latency-ladder"]')` and wire each. Colors via CSS variables
  (`var(--blue)`, `var(--ink)`, `var(--ink-2)`, `var(--ink-3)`, `var(--rule)`, `var(--blue-fill)`,
  `var(--paper)`, `var(--paper-2)`); when drawing with JS on SVG, set classes or
  `style="stroke:var(--blue)"`, never hex. Controls: `<div class="ctl">` with `<label>` + range
  input + `<output>`, buttons `class="btn"` (use `aria-pressed` for toggles). Must work at 360px wide.
  Use `prefers-reduced-motion` to skip animations. No external libraries.
- Use the `.readout` class for live numbers.

## Lessons learned from earlier lessons

- Verify claims you can verify: run small snippets on this Mac (python3, cc are available; use a
  venv in your scratchpad for packages) and say what you measured. E.g. plain `counter += 1` did not
  race under the GIL on 3.11-3.14, so the threads lesson forces the race another way.
- Python's `http.server` default listen backlog is 5; raise it for any load test.
- Interactive figures: check them at 360px wide (no horizontal page scroll; long inline code can
  overflow, break it up).
- Privacy: this site may be hosted publicly. Never paste real identifiers from this machine into a
  lesson: MAC addresses, public IPs, ISP names, location guesses, usernames, hostnames, Tailscale
  output. Use documentation ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24) and fake MACs.
- Link to other lessons freely (stubs exist for every slug in curriculum.ts).

## Facts discipline

Numbers must be right or clearly marked as approximate with the reasoning shown. Prefer "measure it
yourself, you should see roughly X" over asserting. When citing hardware specs (DGX Spark ~273 GB/s,
128 GB), say they're spec-sheet numbers. Don't invent APIs; if a library's exact API may have
changed, tell him to check the docs and show the shape.

## Writing a new lesson (the procedure)

1. Read this file, `src/data/curriculum.ts` (find the entry), and 1-2 existing lessons in
   `src/lessons/` to match voice and component use. Check which lessons are already written so you
   can link back to what he has already learned.
2. If the lesson isn't in `curriculum.ts`, add it to the right track first.
3. Write `src/lessons/<slug>.mdx` and any figure components.
4. `npm run build` must pass. Fix MDX errors.
5. Don't change global styles or shared components unless asked; if a lesson truly needs a new
   shared style, add it narrowly and say so.

## Gap inbox, DB and tooling

The inbox and synced progress live in Convex (`convex/`). Use the `workbench` skill
(`.claude/skills/workbench/SKILL.md`) and `node scripts/wb.mjs` to search lessons, list/add/close
inbox items, and read his progress. Triage rules:
- Blocks something he's building now → write it as the next lesson.
- Shows up in job postings / interviews / his work → add a stub to `curriculum.ts` in the right
  track, with `source`.
- Otherwise → fold it into an existing lesson's Go Deeper or Explain It Back, or leave it open.

The site is served under the base path `/learn-cs` (gtadkapally.com/learn-cs). Write internal
links as `/lessons/<slug>/`; a rehype step in `astro.config.mjs` adds the base.
