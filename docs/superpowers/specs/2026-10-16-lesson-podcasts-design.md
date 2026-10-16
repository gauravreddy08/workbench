# Lesson podcasts: design

Date: 2026-10-16. Status: draft for review.

## Goal

Turn each Workbench lesson into a podcast episode Gaurav can listen to in the shower, the car, or on
a walk, on his phone, without ever needing to pause and look something up. One episode per lesson,
as long as the lesson needs (a full lesson is roughly 45-60 minutes; short lessons can be 5-10).

Success means:

1. **Nothing is lost.** Every idea, number, trade-off and correction in the lesson is in the episode.
   Unlike NotebookLM, this is not an overview.
2. **Nothing needs looking up.** Every term is explained in plain words the moment it is said.
3. **It sounds like two people actually talking**, not a script being read.
4. **It shows up on his phone by itself.** Adding a lesson and running one command publishes it.
5. **Cheap.** Target under ~$1 per hour of audio.

## Decisions already made

| Question | Decision |
|---|---|
| Format | Two hosts |
| Script writer | Claude Code itself, inside a `/podcast` skill (no API spend) |
| Voice | Fish Audio (S2.1-pro, two speakers per request). Not Gemini, not ElevenLabs |
| Hands-on parts | Talked through (see "Turning a lesson into talk") |
| Quiz / Explain It Back | No quiz |
| Where it lives | Inside this repo, `podcast/` + `.claude/skills/podcast/` |
| Distribution | Private RSS feed on Cloudflare R2, followed once in Apple Podcasts by URL |
| Site | A small audio player on lessons that have an episode |

## Approach

```
/podcast <slug>
  1. outline      Claude Code reads src/lessons/<slug>.mdx → podcast/outlines/<slug>.md
  2. script       writes dialogue section by section    → podcast/scripts/<slug>.md
  3. coverage     checks script against lesson, fills gaps
  4. naturalness  rewrites any line a person wouldn't say out loud
  5. render       node podcast/render.mjs <slug>  (Fish Audio → chunks → ffmpeg → mp3)
  6. publish      node podcast/publish.mjs <slug> (upload mp3 to R2, regenerate feed.xml)
  7. site         set audio URL on the lesson in curriculum.ts; player appears on the page
```

Steps 1-4 are done by Claude Code following the skill (subagents where useful, e.g. one per lesson
section). Steps 5-6 are plain Node scripts with no LLM in them. Running `/podcast <slug>` does the
whole chain; `--script-only` stops after step 4 so the script can be read before paying for audio.

## The two hosts

- **Explainer.** Knows the material deeply. Speaks the way the lessons are written: warm, plain,
  confident, concrete. Does most of the talking, in long stretches when an idea needs it.
- **Listener.** Smart, technical, from a neighbouring field. Stands in for Gaurav: knows systems in
  general but not this topic's words. Speaks only when a real listener would stop the explainer:
  a term went past undefined, a step was skipped, something seems to contradict what was said
  earlier, or they want the actual number. Sometimes states their own (wrong) mental model and gets
  corrected, which is where many lessons' "you thought X, it's actually Y" moments go.

Two fixed Fish voices, the same across every episode, picked by ear in the pilot.

## Script rules

Carried over from `CLAUDE.md` "How he wants to be taught", adapted for the ear:

- **Simple words, full depth.** Drop jargon, never detail. Every technical term is explained in
  plain words the moment it first comes up, then the real name is given so he learns it.
- **Intuition, then mechanism, then the name.** Concrete scenes from real systems and his own work
  (the Spark, his FastAPI service, the ranker), not toy analogies (no cars, no toys, no pizza shops
  standing in for the whole topic).
- **The history is the why.** Open with the problem that forced the invention, as the lesson does.
- **Numbers said so they land.** "About a tenth of a millisecond" rather than "100 microseconds"
  when that is clearer, and always with a comparison he can feel.
- **Signposts instead of headings.** A listener can't see section breaks, so the explainer marks
  them in speech ("so that's why it waits; now, what do you do about it").
- **Facts discipline is unchanged.** Same numbers as the lesson, same "roughly" where the lesson says
  roughly. The script never adds claims the lesson does not make.
- **Privacy is unchanged.** No identifiers from his machines.

### Naturalness (hard rule)

Nothing either host says may sound unlike something a person would actually say.

- No written-in filler: no "mm-hm", "wow", "great question", "exactly!" sprinkled through. Small
  reactions only where a real person would make one, and rarely.
- No planted questions that exist only to cue the next paragraph ("So what is TCP, exactly?").
- No reading the page: never "figure 3 shows", never a table read row by row, never code read out.
- No show clichés: no "welcome back", "buckle up", "mind-blowing", no recap of what "we just covered".
- Turn lengths vary a lot. Interruptions happen mid-thought. Disagreement is mild and real.
- Episode opens straight into the problem (one sentence naming the topic is fine) and ends when
  the idea is complete, with the listener putting the core idea in their own words and the explainer
  correcting the part they got slightly wrong. No quiz.

## Turning a lesson into talk

| Lesson part | In the episode |
|---|---|
| Today | Skipped as a list; the opening problem does that job |
| The Problem + Origin | Told as a story: the scene, then where it came from |
| The Idea | The bulk of the episode, layer by layer, at the lesson's depth |
| Term notes | Said inline, in plain words, when the word first appears |
| Predict boxes | The explainer asks, the listener guesses (sometimes wrong), then the reveal |
| Figures | Described the way you'd describe a diagram to a friend on the phone: what's on each side, what moves, what to notice |
| Build It | "Here's what you'd build, the part that matters is X, and when you run it you'd see Y, because Z" |
| Code | Explained by what it does and why. When one line matters it's said in words ("the line that waits for the next request"). A short real name (`await`, `fork`) is spoken only when hearing the actual word helps. No syntax, brackets or full lines read aloud |
| Measure | The expected numbers said aloud, with what they mean and why they come out that way |
| Break It | Each way to break it as a short "what if you..." exchange with what happens and the lesson in it |
| Explain It Back | No quiz. The questions' substance is folded into the conversation; the model answers' content must still be covered |
| Go Deeper | One closing sentence naming the one or two best sources, or skipped |
| Connections | One sentence pointing to the related episodes, if they exist |

## Script format

`podcast/scripts/<slug>.md`, human-readable and diffable:

```
<!-- section: The Problem -->
A: Picture your FastAPI server ...
B: Wait, it's actually sitting idle while ...
```

`A` = explainer, `B` = listener. Section comments are for the coverage check and chunking only; they
are never spoken. Fish inline emotion/pacing tags are allowed but used sparingly, and only by the
naturalness pass.

## Coverage check

After the script is written, a separate pass goes through the lesson section by section and lists
every idea, number, definition, trade-off, correction, Predict answer, Break It case and Explain It
Back model answer. Each item is either found in the script or added to it. The check's list is saved
next to the script (`podcast/scripts/<slug>.coverage.md`) so a gap can be traced.

## Rendering (Fish Audio)

`node podcast/render.mjs <slug>`

- Splits the script into chunks of roughly 2 minutes (~2,000 characters), always at a turn
  boundary, never mid-sentence.
- Sends each chunk to Fish Audio's TTS API as a two-speaker request (speaker tags map `A`/`B` to
  the two chosen voices), model `s2.1-pro` (or the free fair-use `s2.1-pro-free` tier while it holds).
- Caches each chunk's audio under `podcast/.cache/<slug>/<hash>.mp3`, keyed by chunk text + voices +
  model, so a failure resumes and an edited script only re-renders changed chunks.
- Joins chunks with ffmpeg, normalizes loudness for in-car listening, writes a mono MP3 (~64 kbps,
  ~30 MB per hour) to `podcast/out/<slug>.mp3`.
- Retries on rate limits/5xx with backoff; aborts the episode (not the whole batch) on a hard error.
- Reads `FISH_API_KEY` and voice IDs from env (`.env`, gitignored).

Exact request shape (endpoint, speaker tag syntax, per-request size limit) is confirmed against Fish
Audio's current docs during implementation; the chunk size is adjusted to fit.

Cost: Fish S2.1-pro is about $15 per million UTF-8 bytes. A one-hour episode is ~55k characters, so
about **$0.85 per hour of audio**, or $0 on the free tier.

## Publishing

`node podcast/publish.mjs <slug>`

- Uploads `podcast/out/<slug>.mp3` to a Cloudflare R2 bucket with a public URL (R2 has no egress
  fees; storage for 62 hours of audio is ~2 GB, inside the free tier).
- Regenerates `feed.xml` (standard podcast RSS with iTunes tags: title, description from the lesson's
  `question` and `why` in `curriculum.ts`, duration, file size, cover art) and uploads it.
- Episode metadata lives in `podcast/episodes.json` (slug, title, duration, bytes, published date) so
  the feed can be rebuilt from scratch.
- The feed URL is unlisted (long random path). Gaurav adds it once in Apple Podcasts
  ("Follow a Show by URL"); Overcast/Pocket Casts work the same way.
- R2 credentials from env (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`,
  `R2_PUBLIC_BASE`).

## On the site

- `curriculum.ts` gets an optional `audio?: string` on a lesson. `publish.mjs` sets it.
- `src/pages/lessons/[slug].astro` shows a plain `<audio controls>` in the lesson header when
  `audio` is set, styled to match the site. No player library.
- The index can show a small marker on lessons that have an episode.

## Pilot before the rollout

1. Pick one lesson (suggest `waiting-vs-working`, the one with his own diagnostic answer in it).
2. Write its full script; Gaurav reads it.
3. Render one ~10-minute section with 2-3 candidate voice pairs from Fish's library; Gaurav picks the
   pair and says what sounds unnatural.
4. Fix the rules in the skill, render the full episode, publish, confirm it plays from the feed on
   his phone.
5. Only then run the rest of the 62 lessons, a few at a time.

## Out of scope

- Spotify, YouTube, SoundCloud distribution.
- Running in CI / on push. (Possible later; the scripts are already plain Node.)
- More than two voices, music beds, intros/outros.
- Translating lessons into other languages.

## Risks

- **Fish free tier changes or S2.1 is replaced.** The model name is one config value; paid S2.1-pro
  is still under $1/hour.
- **Voice drift between chunks** (the same voice sounding slightly different chunk to chunk). Mitigate
  with fixed reference voices and turn-boundary cuts; check in the pilot.
- **Script length.** A 60-minute script is ~9,000 words; written section by section it stays within
  what Claude Code can do well in one session.
