# Outline: tiny-lm

Source: src/lessons/tiny-lm.mdx. Curriculum: "Train a small LM, end to end."

## The one big idea

A broken training run doesn't crash. It quietly scores worse, and a good idea looks like a bad one.
So the real thing you build is a run you can trust, held up against someone else's known-good
curve, plus a handful of cheap checks that catch the silent bugs in the first five minutes instead
of the fifth hour.

## Opening scene

His own experience: every time he tried an idea of his own on his GPT-2 (a new attention variant, a
different normalisation), the loss went down a bit, the samples were mush, and he couldn't tell if
the idea was bad or the training was.

## Wrong mental model B voices

"If something's broken, it'll crash, or the loss will look bad. A loss that goes down nicely means
it's working." Later: "a smaller batch is just a smaller batch".

## Story beats

1. The mush, and the list of mistakes that never throw an exception: LR off by ten, no warmup,
   wrong targets giving a beautiful curve.
2. Origin: GPT-2's recipe left unsaid, GPT-3's paper fills it in, Karpathy's nanoGPT and llm.c make
   it readable and reproducible cheaply. The gift is a published curve to compare against.
3. The arrows between the boxes: tokenize once and store as small integers; hold validation out by
   file; the target is the input shifted by one.
4. The first number: before any training, the loss should be the log of the vocabulary size,
   about eleven, because a random model guesses uniformly. A giant number means the init is wrong.
5. Too good to be true is a bug: with the target equal to the input, the loss falls even on random
   tokens. Overfit one batch to near zero to prove the plumbing.
6. The recipe as a story: LR is the most important number; warmup protects step zero; cosine lets
   it settle; clipping caps a freak batch and the gradient norm is the early warning. Batch is
   counted in tokens, and the LR was tuned for that batch.
7. How long: Chinchilla's twenty tokens per parameter makes the full run one night on the Spark, so
   you get one real run a day, and you learn settings on small runs (the U-shaped LR sweep).
8. Trusting the eval too: score OpenAI's own GPT-2 with your harness; if it doesn't land where it
   should, the harness is wrong.

## Numbers said aloud

About eleven (init loss); twenty tokens per parameter; one full run per night.

## Left to the written lesson

Dataset sizes, uint16 and memmap details, the replacement-sampling sixty-three percent, parameter
counts, vocab padding, init constants, perplexity table, AdamW betas and decay groups, 6ND and MFU
arithmetic, the four speed switches, checkpoint contents and atomic save, sampling methods, HellaSwag
numbers, all Build It code, the Measure table, Break It items beyond y = x, Explain It Back.
