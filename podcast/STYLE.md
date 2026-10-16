# Podcast script style

How a Workbench lesson becomes a two-host episode. Read `CLAUDE.md` "How he wants to be taught"
first; everything there still applies. This file adds what changes when the lesson is heard, not read.

The listener is Gaurav in the shower, the car, or on a walk. He cannot see a figure, scroll back,
or look anything up. If he would need to pause and Google something, the script failed.

## The two hosts

- **A, the explainer.** Knows the material cold. Talks the way the lessons are written: warm, plain,
  confident, concrete, a little playful, never cute. Does most of the talking, often in long
  stretches when an idea needs room.
- **B, the listener.** Smart and technical, from a neighbouring field. Stands in for Gaurav: knows
  computers in general, not this topic's words. B speaks only when a real listener would stop A:
  - a word went past that hasn't been explained,
  - a step was skipped,
  - something seems to contradict what was said earlier,
  - they want the actual number, or what it would look like on their own machine.
  B sometimes says their own (wrong) mental model out loud and A corrects it. Lessons that quote
  Gaurav's diagnostic answers are the best source for these moments.

Never name the hosts. They don't introduce themselves.

## Naturalness (hard rule)

Nothing either host says may sound unlike something a person would actually say out loud.

- **No written-in filler.** No "mm-hm", "wow", "great question", "exactly!", "right, right" sprinkled
  through. A short reaction only where a real person would make one, and rarely.
- **No planted questions.** B never asks something whose only job is to cue A's next paragraph
  ("So what is TCP, exactly?"). If A would naturally just keep going, A keeps going.
- **No reading the page.** Never "figure 3 shows", "in the table", "as the lesson says", "on the
  site". Never read a table row by row. Never read code.
- **No show clichés.** No "welcome back", "today we're diving into", "buckle up", "mind-blowing",
  "let's unpack", "at the end of the day". No recap of what "we just covered".
- **Real rhythm.** Turn lengths vary a lot: a 300-word stretch, then a six-word reaction. B
  sometimes cuts in mid-thought (end A's line with an em dash). Mild, real disagreement is fine.
- **Spoken, not written.** Polished prose read aloud sounds robotic, whatever the voice. Write how
  people actually talk when they're explaining something: contractions everywhere, short sentences,
  sentences that restart ("It's, well, it's not really a queue"), self-corrections, thinking out
  loud ("so that's, what, two seconds?"), trailing off with "...", "I mean", "like", "you know?" where
  a person would really say them. This is texture, not filler: a few per exchange, never on every
  line, and never the performative kind banned above. Tested: the same content went from
  "robotic" to natural with this rewrite alone.
- **Opening:** straight into the problem. One sentence naming the topic is fine. No preamble.
- **Ending:** when the idea is complete. B puts the core idea in their own words, A corrects the
  part B got slightly wrong or sharpens it, and it ends. **No quiz**, no questions read out, no
  "so remember", no sign-off ritual.

## Simple words, full depth

- Drop jargon, never detail. Every technical term is explained in plain words the moment it is first
  said, then the real name is given so he learns the word.
- Order: intuition, then mechanism, then the name. Use concrete scenes from real systems and his own
  work (the DGX Spark, his FastAPI service in front of an LLM, his cross-encoder ranker, Fireworks),
  not toy analogies. No cars, kids' toys, pizza shops or restaurants standing in for a whole topic.
  A short everyday comparison to make one point is fine if it's exact.
- History is the why: open with the problem that forced the invention, as the lesson does.
- **Numbers so they land.** Say them the way a person would ("about a tenth of a millisecond") and
  always next to a comparison he can feel ("a thousand times longer than reading from RAM"). Keep
  the lesson's numbers and its "roughly"s. Never add a claim the lesson doesn't make.
- **Spell out symbols for the ear.** "p99" → "p ninety-nine, the slowest one percent". Units in
  words. Acronyms: say what they stand for the first time if that helps; otherwise just explain them.
- **Signposts instead of headings.** The ear can't see sections, so A marks turns in the
  conversation: "So that's why it stalls. Now, what do you actually do about it?"

## Turning each part of the lesson into talk

| Lesson part | In the episode |
|---|---|
| Today | Skipped as a list; the opening problem does that job |
| The Problem + Origin | Told as a story: the scene, then where it came from |
| The Idea | The bulk of the episode, layer by layer, at the lesson's full depth |
| `<Term>` notes | Said inline, in plain words, where the word first comes up |
| `<Predict>` | A asks, B guesses (sometimes wrong), then the reveal with the reasoning |
| Figures | Described like a diagram over the phone: what's on each side, what moves, what to notice. Interactive figures: what you'd see as you drag the slider |
| Build It | "Here's what you'd build; the part that matters is X; when you run it you'd see Y, because Z." Steps that are just setup get one sentence |
| Code | Explained by what it does and why. When one line matters, say it in words ("the line that waits for the next request"). A short real name (`await`, `fork`, `select`) is spoken only when hearing the actual word helps him recognise it later. No syntax, brackets, symbols, or full lines read aloud |
| Measure | The expected numbers said aloud, what they mean, why they come out that way |
| Break It | Each one as a short "what if you..." exchange: what happens, and what it teaches |
| Explain It Back | No quiz. The substance of every model answer must be in the conversation somewhere |
| Go Deeper | One closing sentence naming the one or two best sources, or skip |
| Connections | One sentence pointing at related topics, if natural |

## Length

As long as the lesson needs. Nothing is cut for time. A full 7-9k-word lesson is usually
6,500-9,500 spoken words (about 45-65 minutes). Hands-on and figures cost words when said aloud;
that's fine. Padding is not: every exchange must teach something.

## File format

`podcast/scripts/<slug>.md`:

```
<!-- section: The Problem -->

A: Picture your FastAPI server with one worker...

B: Wait, so it's just sitting there?

A: Just sitting there. And here's the strange part —
```

- Every turn starts on a new paragraph with `A:` or `B:`. A turn may run over several lines; a blank
  line or the next `A:`/`B:` ends it.
- `<!-- section: Name -->` marks which lesson section the following turns cover. Not spoken.
- Delivery tags in square brackets at the start of a turn or mid-line steer the voice (ElevenLabs
  v4 audio tags): `[relaxed, thinking out loud]`, `[amused]`, `[skeptical]`, `[working it out]`,
  `[jumping in]`, `[laughs]`, `[sighs]`. Use them on maybe one turn in four, where the delivery
  would otherwise come out flat or wrong. Never as decoration.
- Write numbers and symbols the way they should be said ("about two hundred milliseconds", not
  "~200ms"). The voice model reads exactly what is written.
- Plain text only: no markdown emphasis, no bullet points, no backticks, no URLs.
