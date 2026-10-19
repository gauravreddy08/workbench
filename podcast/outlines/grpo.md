# Outline: grpo

Source: src/lessons/grpo.mdx. Curriculum: "RL with verifiable rewards." How does RL with automatic
rewards (like GRPO) teach a model to solve problems?

## The one big idea

You can learn from a bare verdict: make your own attempts more likely in proportion to how they
scored. It only works once you subtract what you expected to score. GRPO gets that expectation
the blunt way, by asking the same question several times and grading each attempt on the curve.
Two consequences: it can only sharpen what the model already sometimes does, and the cost moves
into writing the attempts, so fast inference is fast training.

## Opening scene

A Countdown checker: three numbers, a target, an answer; it says one or zero, instantly, and can't
be argued with. A small model that solves some puzzles and fumbles the rest. Fine-tuning needs
worked solutions you don't have; DPO needs pairs. What you actually have is a model that can try
and a checker that can grade.

## Wrong mental models B voices

- "No right next token, and the checker isn't differentiable, so there's no gradient."
- "Just push up whatever scored well; why subtract anything?"
- "So R1 discovered reasoning from nothing; RL will teach my small model new tricks."
- (After the time split) "training must be the expensive part."

## Story beats

1. The scene; the problem is turning a verdict into a gradient.
2. The basic move: answers that passed get more likely, failed ones less. It's an exact estimate,
   not a hack: you only differentiate the model's own probabilities. It's fine-tuning on your own
   samples, weighted by how good they were, and the weight can be negative.
3. The noise problem: if every score is shifted up, everything gets pushed up and the signal is a
   small difference between big forces. Subtract the expected score (the baseline); what's left
   is the advantage. My numpy toy: same average, a couple of hundred times less noise.
4. Origin: PPO brought a critic, a second model the same size guessing at every word how it'll
   turn out; hard to train when the verdict comes at the very end. DeepSeekMath dropped it: ask
   again, grade on the curve. R1 showed the recipe with rule-based rewards; answers grew longer and
   it started re-checking its work. Stated carefully: not the first reasoning model, the first
   simple published recipe.
5. Grading on a curve: rarer successes get pushed harder. Dead groups: all pass or all fail
   teaches nothing. My toy run: medium prompts got solved and went dead too, hard ones never
   sampled a success and stayed stuck. It sharpens, it doesn't discover. A small model gets better
   at Countdown; it won't discover algebra.
6. The leash to the starting model, briefly; the clip only matters when you reuse samples.
7. Why verifiable rewards changed everything: a learned scorer has blind spots and sets a ceiling;
   code is cheap, exact, much harder to fool. Noise fakes a signal in an all-wrong group, so the
   reward must be exact. A sloppy checker (target appears anywhere) gets hacked fast.
8. The dashboard: loss means nothing; watch held-out reward, the share of dead groups, length and
   truncation, drift, and entropy (collapse means every sample identical, learning stops).
9. Where the time goes: generation one token at a time, memory-bound, the batch waits for its
   longest answer. Expect it to dominate. Fast inference is fast RL; the shared prompt across the
   group is a prefix-caching gift.

## Numbers said aloud

- "a couple of hundred times" less noise with the baseline (toy)
- "most groups dead" (relationship)
- one or zero from the checker

## Left to the written lesson

The REINFORCE and GRPO formulas, PPO's clip numbers and GAE, the closed-form advantages, the dead
group formula and percentages, the toy run's step-by-step numbers, KL estimator, R1-Zero AIME
figures, memory math, the time-split estimate, all Build It code and TRL options, Measure tables
(Spark runs not measured), the Dr. GRPO length bias and DAPO fixes in detail.
