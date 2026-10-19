# Outline: llm-judges

Source: src/lessons/llm-judges.mdx. Curriculum: "LLMs as judges." When can you trust a model to grade
another model?

## The one big idea

An LLM judge is a measuring instrument, not an oracle. Its biases come from leaning on things that
usually go along with quality (which slot an answer sits in, length, confident tone, its own style)
instead of quality itself. You trust it only after treating it like what it is, a classifier, and
checking it against your own careful labels. Swapping the order fixes biases tied to the slot; it
can't fix biases tied to the answer.

## Opening scene

He's retrained the cross-encoder, no labels for this week's queries. Ask a strong model which of two
top results is more relevant: the new ranker wins comfortably. Rerun with the order swapped: now the
old ranker wins. Trim the snippets to the same length: basically a coin flip. What did the judge
measure? Some mix of relevance, slot, and word count.

## B's wrong mental model

"A strong model is basically smarter than me at this. If it says the new one's better, it's better."
The text names it: the judge feels like an oracle; it isn't. (Not a diagnostic quote.)

## Story beats

1. The scene: one ruler, three readings. You never checked whether the ruler was straight.
2. Origin: by early two thousand twenty-three, word-overlap metrics like BLEU meant nothing for chat
   answers, humans were slow and expensive, and people were quietly using GPT four to grade. Zheng
   and colleagues at LMSYS named it and checked it: agreement with experts about as often as two
   experts agree with each other. And they catalogued how it went wrong: first slot, length, its own
   outputs, maths it couldn't solve.
3. Why a model at all: the gap between what a program can check and what people can afford to
   grade. Its only job is to stand in for a careful person.
4. Three ways to ask: score one, compare two, or match against a known answer. Comparing is easier,
   like which of two coffees is stronger; a known answer turns "is this right" into "do these match".
5. The biases, and why: every one is a shortcut that's right on average. Position, length (padding),
   self-preference, confident tone, formatting. Length matters most when something is trained
   against the judge.
6. The swap test: ask both ways. A push toward a slot cancels; a push toward a property of the
   answer doesn't. Build It insight from the simulated judge: averaging both orders held steady even
   when position bias was overwhelming, but once the losers were padded nothing recovered it.
7. The judge is a classifier: compare to his own hundred labels. Raw agreement can be fooled; kappa
   asks how much better than luck. The confusion matrix shows how it's wrong (never says tie). His
   own agreement with himself a day later is the ceiling.
8. Rubrics: describe what the searcher would do, give examples, name what to ignore, reasoning before
   the verdict (verdict first is rationalising). For agents, break "did it work" into narrow yes or no
   questions and demand quoted evidence.
9. When not to: if a program can check it, use the program. And never train against a judge you
   haven't measured: a length-biased judge produces a model that pads.

## Numbers worth saying

- "A hundred of your own labels."
- "About as often as two experts agree with each other."
- Relationships only for the opening (comfortable win, flips, coin flip).

## Left to the written lesson

The opening's exact win rates; MT-Bench details and consistency percentages; the soft-averaging
derivation; the mitigation table; the kappa formula and Figure four arithmetic; Spearman and
calibration buckets; confidence-interval widths on a hundred labels; full rubric texts; all cost
arithmetic and caching mechanics; all code, the dev and test split procedure, Measure expectations and
Break It specifics.
