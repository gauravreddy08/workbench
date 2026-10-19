# Podcast script style

How a Workbench lesson becomes a two-host episode. Read `CLAUDE.md` "How he wants to be taught"
first; the voice there still applies. This file says what changes when the lesson is heard, not read.

## What an episode is for

The listener is Gaurav in the shower, the car, or on a walk. He cannot see a figure, scroll back,
or take notes, and he shouldn't need to. The written lesson carries the detail: numbers, formulas,
code, measurements. The episode is the companion to it: the story and the idea, told so it sticks.
Someone who only hears the episode should come away able to explain the core idea to a friend.
Someone who later reads the lesson should find every section already makes sense.

Tested: a full-depth episode that carried every number and step was "hard to follow, like I needed
to sit down with a book and take notes." Do not compress the lesson into audio. Tell its story.

- **Ideas, not data.** Explain why things are the way they are. What problem forced this, what the
  key insight is, what it feels like when it works and when it breaks.
- **Almost no numbers.** Keep at most a handful per episode, and only ones that carry the story
  (the title's number, "thousands versus seventeen"). Prefer relationships to values: "half the
  size, twice as fast", "a few times", "most of the time". Never a calculation said aloud, never
  units the ear has to juggle, never a list of model sizes or benchmark results.
- **No formulas, no code, no tables, no step lists.** If the lesson's point is a formula, say the
  idea behind it in one sentence ("speed is just how big the model is against how fast memory can
  hand it over").
- **One thread.** Pick the one big idea and follow it. Side topics only when they push that thread
  forward. It's fine to leave things out; the lesson has them.
- **Story shape.** Start from a concrete moment that makes the problem felt (his own machine, his
  own service, history). Let the insight arrive, not be announced. Then show what follows from it.
  End when the idea is whole.

## Length

Usually 10 to 20 minutes: about 1,500 to 3,000 spoken words. Shorter is fine if the idea is
simple. Longer only if the story truly needs it, never to cover more of the lesson.

## The two hosts

- **A, the explainer.** Knows the material cold. Warm, plain, confident, concrete, a little
  playful, never cute. Tells it like a story they find genuinely interesting.
- **B, the listener.** Smart and technical, from a neighbouring field. Stands in for Gaurav. Speaks
  when a real listener would: a word went past unexplained, something seems off, or they want to
  check their own picture of it. B sometimes says their own (wrong) mental model out loud and A
  corrects it. Lessons that quote Gaurav's diagnostic answers are the best source for these.

Never name the hosts. They don't introduce themselves.

## Naturalness (hard rule)

Nothing either host says may sound unlike something a person would actually say out loud.

- **No written-in filler.** No "mm-hm", "wow", "great question", "exactly!", "right, right"
  sprinkled through. A short reaction only where a real person would make one, and rarely.
- **No planted questions.** B never asks something whose only job is to cue A's next paragraph.
- **No reading the page.** Never mention "the lesson", "the site", "the figure", "the table".
  Speak from the hosts' own experience: "when I ran this on the Spark", "I counted".
- **No show clichés.** No "welcome back", "today we're diving into", "buckle up", "mind-blowing",
  "let's unpack", "at the end of the day". No recap of what "we just covered".
- **Real rhythm.** Turn lengths vary: a long stretch, then a six-word reaction. B sometimes cuts in
  mid-thought (end A's line with an em dash). Mild, real disagreement is fine.
- **Spoken, not written.** Contractions everywhere, short sentences, sentences that restart ("It's,
  well, it's not really a queue"), thinking out loud, "I mean", "like", "you know?" where a person
  would really say them. Texture, not filler: a few per exchange, never on every line.
- **Opening:** straight into the problem. No preamble.
- **Ending:** B puts the core idea in their own words, A sharpens the part B got slightly wrong,
  and it ends. No quiz, no "so remember", no sign-off.

## Simple words

- Every technical term is explained in plain words the moment it is first said, then the real name
  is given so he learns the word. Only introduce names he'll meet again; skip the rest.
- Intuition first, then the name. Concrete scenes from real systems and his own work (the DGX
  Spark, his FastAPI service in front of an LLM, his cross-encoder ranker, Fireworks). A short
  everyday comparison is fine if it's exact; never a toy analogy standing in for the whole topic.
- If the idea leans on an earlier lesson, re-explain that piece in a sentence or two.
- Never add a claim the lesson doesn't make.

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
- `<!-- section: Name -->` marks a part of the story. Not spoken.
- Delivery tags in square brackets steer the voice (ElevenLabs v4 audio tags): `[relaxed, thinking
  out loud]`, `[amused]`, `[skeptical]`, `[working it out]`, `[jumping in]`, `[laughs]`. About one
  turn in four, where the delivery would otherwise come out flat. Never as decoration.
- Write any number the way it should be said ("about seventeen"). No digits or symbols.
- Plain text only: no markdown emphasis, no bullet points, no backticks, no URLs.
