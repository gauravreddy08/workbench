# Outline: architecture-compute

Source: src/lessons/architecture-compute.mdx. Curriculum: "Comparing transformer variants." How do you
compare the compute efficiency of two transformer designs fairly?

## The one big idea

"Which design is more efficient?" is decided before you train anything, by what you hold equal
(weights, arithmetic, or clock time) and which bill you care about (training or serving). Hold the
wrong thing equal and you can make either design win. Arithmetic is the fair currency for training;
bytes moved are the currency for serving; and GQA is the clean example where those two answers
disagree.

## Opening scene

Three messages land in a team channel on one afternoon: "MQA is a bit worse, it's out." "GQA
matches with fewer parameters, so it's more efficient." "GQA decodes three times faster, ship it."
All three are real measurements. None answers the question.

## B's wrong mental model

"Train both with the same settings and see whose loss is lower. And fewer parameters at the same
loss is basically the definition of efficient." (Not a diagnostic quote; it's the natural view the
second message voices.)

## Story beats

1. The three messages, and why each is a real measurement that answers nothing: borrowed learning
   rate and one run; counting parameters when you pay for GPU hours; measuring decode only where GQA
   shines.
2. Origin: Kaplan's scaling laws gave the field a common currency ("reach your loss with less
   compute") and said spend it on bigger models. Chinchilla redid it and got a different answer,
   largely because Kaplan's learning-rate schedule wasn't matched to each run's length. A model a
   quarter the size beat Gopher on the same compute. A famous comparison flipped on setup.
3. The currency: a FLOP, one add or one multiply. Hardware-free. Each weight is used once per word,
   one multiply and one add. Training costs about three times a plain pass, because the backward
   pass does the same-sized multiply twice. Two things the shortcut misses at small scale: attention
   itself, and the output head.
4. What "fair" means: equal weights, equal arithmetic, equal clock. The flip: a design that does
   more work per weight and gets more out of each weight wins at equal weights and can lose at equal
   arithmetic. Equal arithmetic is the default, because compute is what you pay for.
5. The isoFLOP method: fix a budget, train several sizes, each spending exactly that budget; a U
   shape; compare the bottoms; repeat at a few budgets.
6. MHA, GQA, MQA: how many heads share one set of stored keys and values. They barely change
   training arithmetic. Serving is bytes: each decode step reads the weights plus everyone's cached
   notes. At batch one the weights dominate and the win is small; with many users and long context
   the cache dominates and the win is big. Why every modern open model uses GQA.
7. Noise and confounders: seeds spread about as wide as the effects you're hunting. Tune each
   variant's learning rate, match schedule to run length, count the same way. Narang re-tested dozens
   of published tweaks; most didn't help. When something looks like a big win, look for the
   confounder first.
8. Build It insight: checking my counter against PyTorch's, it came up short by exactly the
   attention, because the fused kernel wasn't being counted at all. The ruler itself can lie.

## Numbers worth saying

- "About three times" (training vs a plain pass).
- Chinchilla vs Gopher as a relationship: a quarter the size, same compute, better.
- "Three times faster" vs "barely faster" for GQA at heavy vs light load (relationship only).

## Left to the written lesson

The matmul cost rule and per-layer parameter count; the exact attention and output-head terms and
the GPT-2 split; the training formula; MFU and the Spark's achievable peak; the twenty tokens per
parameter; the isoFLOP steps and compute multiplier; KV byte formula and decode-floor predictions;
SwiGLU, RoPE and pre-norm wrinkles; the shapes table, budgets, LR grid and all code; Break It
specifics.
