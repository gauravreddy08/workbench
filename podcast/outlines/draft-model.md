# Outline: draft-model

Source: src/lessons/draft-model.mdx. Curriculum: "Train your own draft model."

## The one big idea

A good draft model isn't a good writer, it's a good impersonator. The chance a guess is kept is
exactly the overlap between how the draft and the big model spread their bets over the next word.
So you train the small model on the big model's whole list of odds at every position (distillation),
not just on the words it happened to write, and you judge it by that overlap, not by its loss.

## Opening scene

He prints the rejected guesses from his speculative decoder on the Spark. The 8B starts with
"Here's a", the 1B guesses "Sure". In code the 8B writes math dot pi, the 1B writes three point
one four. None of the 1B's guesses are wrong. They're just not what this 8B would say.

## Wrong mental model B voices

From his diagnostic (doesn't know precisely why speculative decoding is exact / what "output
distribution" means): "So get a smarter small model." Later: "the loss went down, so it learned".

## Story beats

1. Recap speculative decoding in two sentences: small model guesses, big model checks in one pass,
   the output is exactly what the big model would have written. The rejections.
2. A brilliant small model can be a bad draft: acceptance rewards agreeing, not being right. The
   draft's quality is invisible in the text and only shows up as speed.
3. The overlap: picture both models' bets as bar charts; the shared area is the chance of keeping.
   "The capital of France is" overlaps hugely; "a poem about" barely.
4. Origin: 2006 compressing ensembles; Hinton, Vinyals and Dean in 2015, dark knowledge (dog,
   wolf, car); DistillSpec for speculative drafts.
5. Text versus odds: one sampled word throws away the teacher's whole vector. In a toy, one soft
   label beat dozens of samples. It's the same loss with a soft label; one line changes.
6. Temperature caveat: Hinton flattened the odds to learn knowledge; a draft should copy what you
   serve. And when the student is too small, the two directions of KL make different mistakes
   (straddle or pick a side); measure.
7. Whose text: the 8B's answers on prompts like his traffic; later guesses follow the draft's own
   slips, so training on its own text helps (exposure bias).
8. Storage: full odds per position are enormous; keep the top sixty-four plus one normalising
   number and it's hundreds of times smaller and fits in memory.
9. Other shapes: the 8B's own first four layers (useless before training, because the output layer
   expects layer thirty-two's language); Medusa heads and EAGLE reading the big model's thoughts.
10. Judging it: measure the overlap directly on held-out text. Off by one: the loss still falls and
    acceptance collapses. Leak the benchmark prompts and the scoreboard lies.

## Numbers said aloud

Top sixty-four; hundreds of times smaller; four layers out of thirty-two.

## Left to the written lesson

The TV identity and its derivation, KL formulas and the gradient, T squared, Pinsker, the toy
numbers, the two-bump figure values, disk arithmetic, FLOP costs, Medusa and EAGLE details and
reported speedups, alignment indices, all Build It code and commands, Measure tables, speedup
calculator values, Explain It Back.
