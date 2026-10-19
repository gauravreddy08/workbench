# Outline: attention-viz

Source: src/lessons/attention-viz.mdx. Curriculum: "Seeing attention." What is a model looking at
when it predicts the next token?

## The one big idea

An attention picture shows where a head read from, not what mattered. A bright line is a clue.
You find a behaviour with a test designed so only that behaviour can help, and you prove it
matters by switching the head off and watching what breaks.

## Opening scene

He built GPT-2. Someone asks the obvious question: when it predicts the next word, what is it
looking at? He dumps the attention weights, plots one, and gets a pale triangle with a bright
stripe down the left edge. Real data, and on its own almost useless.

## Wrong mental model B voices

"Most heads put most of their weight on the first token, so the first token must matter a lot."
Later: "if a head looks like a perfect induction head, deleting it should break the model."

## Story beats

1. The plot: triangle (the mask, no peeking at the future) and the stripe on the left.
2. Origin: Bahdanau and colleagues, translation, the alignment grids that looked like a dictionary
   drawn by the model; everyone enchanted. Then "Attention is not Explanation": very different
   weights can give the same prediction. The argument since; the modern answer is test by cutting.
3. What a head is, said once: the library (question, spine label, contents), take a little of
   every book. Query, key, value. Each row is a budget that must add up to one.
4. The sink: the budget must be spent even when there's nothing to read; the first word is the one
   everyone can see, so it becomes a parking spot with a small value vector. StreamingLLM: evict
   it from the cache and quality collapses; keep the first few and it's fine.
5. Personalities: previous-token head, induction head. The random-words-said-twice test: first
   half worse than guessing, second half near perfect, and only looking back can help. Scoring
   all heads with a number: most near zero, a few near one.
6. Induction needs a previous-token head in an earlier layer to write "the word before me was
   lamp" into the running vector (residual stream). Composition can't be seen in any single plot.
7. Ablation: switch off the best induction head, barely moves. Switch off five, much worse.
   Backup heads. Mirror image of the sink: looks important and isn't; is important and doesn't
   look it alone. Zero-ablation is blunt (first half got worse too).
8. Aside: the fast attention kernel never builds the matrix at all; asking for it returned
   nothing. The picture is a debugging artifact, not something inference holds.

## Numbers said aloud

- a hundred and forty-four heads (twelve layers of twelve)
- "about nine tenths" of a sink head's weight on the first word
- "around a fifth" the value size at the sink
- one induction head off: barely moves; five off: "more than twenty times worse"

## Left to the written lesson

Shapes and the scaling by root sixty-four, the five-step walkthrough, the scoring index
arithmetic, the export JSON and size math, the viewer build, Conv1D transpose bug, measured tables,
mean-ablation details, composition types beyond K-composition, attention rollout, the
natural-text and transposed-viewer Break It items, scaling the viewer to big models.
