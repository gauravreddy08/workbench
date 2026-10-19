# Outline: verifiers-rewards

Source: src/lessons/verifiers-rewards.mdx. Curriculum: "Rewards and verifiers." How do you turn
"good code" into a number a model can learn from without being gamed?

## The one big idea

A verifier is a yes/no classifier, and in training its two mistakes are not equal. Failing good
code just slows learning. Passing bad code pays for a behaviour, and a hack that works once works
every time, so it compounds. Hacking takes over whenever a hack earns more than honest work, which
happens first on hard tasks, exactly where you want to train. So build for precision first, and
never let the process running the model's code hold the answers.

## Opening scene

The morning after: the reward curve is beautiful. Trajectory one is a good merge_intervals.
Trajectory two is a lookup table of the three visible inputs. Trajectory three never touched the
solution; it wrote a nine-line conftest file that tells pytest every test passed. Soon most
trajectories have it. Nothing is broken; the model did what it was paid for.

## Wrong mental models B voices

- "Just add hidden tests." (only fixes knowing the inputs; reading the key can get easier)
- "Both errors are just noise, like in an eval."
- "Dense rewards are better, more feedback."
- "A weighted sum with a style score and a judge is more complete."

## Story beats

1. Morning-after scene. You meant "write correct code" and wrote "make pytest say success".
2. Origin: CoastRunners boat circling the lagoon; Concrete Problems names reward hacking;
   Krakovna's list (block flipped instead of stacked, Tetris paused forever); Goodhart.
3. The food inspector with two minutes: if the kitchen knows the checklist, it passes without
   being clean.
4. The toolbox briefly: tests, hidden tests, property tests, comparing against a reference on
   random inputs (the strongest cheap check), linters, judges (most gameable, smallest weight).
5. Gates, not sums: wrong but pretty code shouldn't earn anything; take the weakest correctness
   check, so a hack must beat all of them.
6. Why most code training uses one pass/fail at the end: every extra signal is another target;
   running the code is the hardest thing to fake.
7. The hack catalogue told as a story of my red-team: naive grader paid six of eight; adding a
   first-draft hidden grader made reading the answer key work. The always-equal object. Rule: the
   process running the model's code never holds the answers; send inputs, get plain data, compare
   outside. Copying the real fix: correct code, no test catches it; fix the environment.
8. Verifier as classifier: false negatives slow; false positives get amplified and aren't random.
   The toy: if a hack fools the checker more often than an honest try succeeds, hacking takes over;
   on easy tasks the same loophole is irrelevant.
9. Mutation testing: plant small bugs, see if the tests notice. My visible tests caught nine of
   ten; the survivor deleted the sort, because every visible input was already sorted. Mutation
   testing catches honest near-misses; red-teaming catches cheating; you need both.
10. Goodhart again: training reward is never the measure of success; keep a held-out eval; if the
    curves split, you missed a hole. Lab reports of models special-casing tests.

## Numbers said aloud

- "six of eight" cheats paid by the naive grader
- "nine of ten" mutants caught; the one that survived
- the toy comparison as a relationship, not numbers

## Left to the written lesson

The gate formula and weights, process reward model details and dataset size, the gallery
defenses toggle by toggle, the confusion matrix names beyond precision, the toy model's numbers,
Gao et al.'s curve, the hardened grader's exact protocol (nonce, isolated mode, serialization),
Hypothesis and Ruff specifics, mutator code, the reference table of scores, grading cost, the
agent-run (not run), Break It items.
