# Outline: long-horizon

Source: src/lessons/long-horizon.mdx. Curriculum: "What makes a task long-horizon?" Why do agents
that succeed at ten-step tasks fail at hundred-step ones?

## The one big idea

A long task is many decisions before anyone tells you how you did. Small per-step error rates
compound, so the length an agent can handle is inversely proportional to how often it makes a
mistake that sticks. Being more careful and being better at noticing and fixing count exactly the
same, but fixing only works if mistakes are visible and the checks are good.

## Opening scene

The forty-file migration. The agent runs for an hour, reports success, the tests fail. Somewhere
around file twelve it misread a value, and everything after was built on it. Every edit looks
reasonable; the whole is wrong. The model didn't get dumber; it was asked to be right forty times
in a row with nobody checking.

## Wrong mental models B voices

- "Ninety-nine percent per step sounds excellent."
- "It must get dumber as the task goes on." (partly true later: state tracking, context)
- "Checking more often must help." (a weak check that you believe is the trap)
- "A fifty-minute horizon means it can work for fifty minutes."

## Story beats

1. Migration scene. Horizon defined: steps before feedback, not tokens or time. The baking analogy
   (teacher beside you versus tasting the cake three hours later).
2. Origin: ALVINN, the van that learned to drive by copying, never saw itself drifting, so small
   errors grew. Pomerleau taught it recovery with shifted images. Later made precise: copied
   policies' errors pile up faster than linearly.
3. The arithmetic: ninety-nine percent per step fails most hundred-step tasks; coin flip near
   seventy. Halve the failure rate, double the length. Per-step accuracy and end-to-end success
   are different numbers; ask for both. The grey squares: work done after the fatal mistake.
4. Recovery: a good engineer mistypes, sees the error, fixes it. Three fates of a mistake depend
   on how soon it's visible and whether it's undoable. Recovering from half your mistakes equals
   making half as many. But only if mistakes are detectable.
5. Verification: make mistakes loud. A perfect check after every step makes it near certain; a
   check that catches half gives only part of the gain. Quality beats frequency.
6. METR: measure tasks in human time; fifty-minute horizon, doubling about every seven months.
   What it isn't: not how long the model runs; tied to the suite; fifty percent is a low bar; a
   trend, not a law. Ord: it fits the constant-chance-of-failing picture; doubling horizon equals
   halving the failure rate.
7. Beyond the coin flips: state tracking, context, delayed feedback, planning, irreversible
   actions (recovery is zero by definition; harnesses raise it from outside).
8. Training side: one pass/fail at the end of sixty steps, which step was the bug? Credit
   assignment. Levers: denser feedback, shorter pieces, more samples.
9. Measurement surprise from the fake-agent simulation: with only ten runs per length, the same
   agent's fitted horizon swings by about a factor of two. Per-step reliability gives far more
   measurements than end-to-end success.

## Numbers said aloud

- ninety-nine percent per step, about a third of hundred-step tasks, coin flip near seventy steps
- halve the failure rate, double the length
- METR: about fifty minutes, doubling about every seven months

## Left to the written lesson

The formulas and the shortcut, the reliability table, the verification closed form and simulation
check, the two Predicts' exact numbers, the interactive figures, METR's method in steps and task
counts, logistic versus exponential tails, benchmarks (SWE-bench, tau-bench, pass at k), the
config-chain task suite, the harness and fake agent code, budget math, fitting, the Measure
tables, Break It variants.
