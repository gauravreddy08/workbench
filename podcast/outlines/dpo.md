# Outline: dpo

Source: src/lessons/dpo.mdx. Curriculum: "Preference tuning with DPO." How do you train a model on
"this answer is better than that one"?

## The one big idea

Judging is cheaper than writing, but "A beats B" isn't something you can copy. The classic fix
learned a separate scorer and ran a heavy, fragile RL loop. DPO's insight: the best possible
leashed model has a formula, and read backwards it says a model's own probabilities, compared to
where it started, already are a score. The unknown part cancels because both answers share a
prompt. What's left is the pairwise loss he'd use for his ranker. And because it only cares about
the gap, both answers can get less likely.

## Opening scene

He wants his relevance-labelling model to write explanations a reviewer can trust. Writing perfect
ones takes minutes each; after forty he's tired and they all sound the same. A colleague shows two
of the model's explanations and asks which is better; he answers in seconds, confidently.

## Wrong mental models B voices

- "Just write better answers and fine-tune on them."
- "If you train it to prefer the chosen answer, the chosen answer gets more likely." (the toy)
- "Higher accuracy on the training dashboard means it's working."

## Story beats

1. The scene. Judging is easier than writing; the wine critic.
2. But a comparison isn't a target to imitate. Origin: the backflip robot taught by clicks; the
   same recipe on language; a small model trained this way preferred over the huge one it came
   from; RLHF made assistants feel like assistants, and was notoriously hard to run.
3. Bradley-Terry from chess ranking: hidden scores, only differences matter. Same loss as his
   pairwise ranker.
4. The classic pipeline: copy examples, train a scorer, then RL with a leash to the starting
   model. Why the leash: the scorer has blind spots; reward hacking. Four models in memory; a
   dozen knobs; failures don't raise errors.
5. The insight: over all possible models, the best leashed one is the starting model tilted
   toward high-scoring answers. Useless alone (the normaliser sums over every possible text).
   Flip it: an answer's score is how much more the tuned model likes it than the starting model
   did, plus a per-prompt constant. Compare two answers to the same prompt and the constant
   cancels. "Your language model is secretly a reward model."
6. What the loss does: push chosen up and rejected down, hardest on pairs it gets wrong; never
   reaches zero; beta as the leash, how far it has to move.
7. The toy: accuracy perfect, loss falling as designed, and the chosen answer went from close to
   even odds to practically impossible. It prefers the chosen answer only in that the rejected
   one is even more absurd. Probability went somewhere else. Adding a bit of plain imitation on
   the chosen answers made it rise instead. Dropout makes step zero already noisy.
8. Length: raters like thorough answers, longer is the cheapest feature; judges like length too;
   equalise lengths before judging.
9. Offline versus online: DPO learns from a fixed pile; next, GRPO samples its own attempts.

## Numbers said aloud

- seconds to judge versus minutes to write
- about nine hundred clicks for the backflip
- nineteen fifty-two (chess ranking)

## Left to the written lesson

Every equation and the four-line derivation, the gradient form, the dashboard metrics table, the
sequence log-prob details (shift, mask, sum), hyperparameters, memory arithmetic, the variants
table (IPO, KTO, SimPO, ORPO), the build tasks on the Spark, TRL parity, the Measure tables
(real-model numbers are expectations, not measured), the remaining Break It items.
