# Outline: speculative-decoding

Source: src/lessons/speculative-decoding.mdx. Curriculum: "Speculative decoding." How can a small
model make a big model faster without changing its output at all?

## The one big idea

On a memory-bound machine, checking several guessed words costs about the same as writing one. So
a cheap model guesses ahead and the big model checks them all in one pass. And a precise random
rule for which guesses to keep (keep in proportion to how much the big model likes the guess versus
the small one; on rejection, draw from exactly what the small model under-guessed) makes the output
follow the big model's odds exactly, however bad the guesser is. A bad guesser costs speed, never
correctness.

## Opening scene

The Spark typing at its memory-bound pace, tensor cores idle. Thought experiment: an oracle whispers
the next four words; feed all four in at once like a tiny prompt read, and get four words for one
trip. There's no oracle, but there's a small model from the same family.

## Wrong mental model B voices

From his diagnostic: "a big model will stop it and correct it if it's out of distribution." B says
roughly that, and later proposes the natural bug: "if the guess is bad, just let the big model pick
the word itself." A: rejection is random, with a probability chosen to move probability from where
the small model over-guessed to where it under-guessed. Letting the big model just pick is biased,
and you can't see it by reading the output.

## Story beats

1. The cruel asymmetry: reading a prompt reuses each weight for many words, writing can't, because
   each word depends on the one before.
2. The oracle thought experiment; the small model as an imperfect oracle; checking is a mini prompt
   read, nearly free because the chip was idle anyway.
3. History: CPUs guessing branches; blockwise decoding, greedy only; Google and DeepMind, months
   apart, make it exact for sampling using rejection sampling.
4. What "output distribution" means: at every step a list of odds over every possible next word.
   Greedy takes the top; sampling rolls weighted dice. "Same distribution" means every possible
   answer has the same chance. Greedy case: identical text.
5. The rule, as a story with one word: the small model proposes it too often, keep it only that
   fraction; proposes it too rarely, always keep, and rejections must top it up. B's diagnostic
   model, then the "let the big model pick" bug. Why it's exact, said in a sentence: kept part plus
   leftover part adds back to exactly the big model's odds. Nothing assumed the guesser was good.
6. How many words per pass: acceptance rate sets a ceiling, long guess runs almost never survive, so
   guessing further ahead stops paying. The guesser's cost decides the best run length; can lose.
7. Where guesses come from: a smaller sibling (same tokenizer), prompt lookup (copying from the
   input, free), extra heads and EAGLE briefly.
8. The cache has to forget: rejected guesses leave ghosts in the KV cache; bugs hide in round two.
9. Why it fades with many users: batching spends the same idle compute. A latency tool for a quiet
   box, which is the Spark. Build insight: the small model's step wasn't nearly as cheap as its size.
10. Ending: B restates; A sharpens (rejection is random and redirects probability, not "out of
    distribution").

## Numbers worth saying

Checking about five guesses costs about one step. Two to three times faster (the papers). If seven
in ten guesses survive, you never average much more than three words per pass.

## Left to the written lesson

The formulas (acceptance, residual, expected tokens, speedup), the four-line proof written out, the
toy vocabulary and chi-square test, specific K and c tables, all Build It tasks, cache crop
mechanics, Medusa and EAGLE details, multi-token prediction, the batch-of-sixty-four calculation.
