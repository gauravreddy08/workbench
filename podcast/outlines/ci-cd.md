# Outline: ci-cd

Source: src/lessons/ci-cd.mdx. Curriculum: "Why every team has a pipeline."

## The one big idea

Source control and CI/CD are tools for shrinking time: how long work stays apart before it's
combined, and how long a mistake lives before anyone sees it. Integration pain grows much faster than
the work itself, a bug gets more expensive every hour it survives, and a clean borrowed machine
checking every change within minutes is how you keep both small.

## Opening scene

Three weeks on a branch adding hard-negative mining to the cross-encoder. Merge day: a pile of
conflicting files resolved by guessing; then it merges but doesn't run because the teammate renamed a
function; then it runs but the ranking metric is down and there are about a hundred and forty
commits to suspect; then it fails on the teammate's machine because of a cached file only on his
laptop. None of it is about git commands. All of it is about time.

## Wrong mental models B voices

- "CI is the thing that runs tests when you push." A: that's the tool; CI is a practice, merging
  into one main line at least daily. Teams that keep branches for weeks and "use CI" skipped it.
- "Four times as much work on a branch, four times the merge pain." Actually much worse.
- "If it passes on my laptop it passes." The laptop lies.

## Story beats

1. The merge-day scene. Not a commands problem, a time problem.
2. Integration hell: teams building separately for months, then an integration phase that took
   longer than building. Daily builds and smoke tests at Microsoft, a silly hat if you broke the
   build. Beck makes "integrate many times a day" a rule. Fowler writes it down; CI servers;
   eventually it lives next to the code.
3. Git underneath, briefly: Linus writes it in about two weeks after losing BitKeeper. Its core is
   tiny: store every file's contents under a fingerprint of those contents. A commit is a whole
   snapshot, cheap because unchanged files point at the same stored copy. A branch is a tiny file
   holding one commit's fingerprint. History can't be quietly edited because each fingerprint covers
   the one before.
4. Why small merges win: overlap grows with the square of how much each branch changed, and pairs of
   people grow with the square of team size. Four times the branch, about eight times likelier to
   conflict. Fresh code is easier to reconcile.
5. The conflict git can't see: rename on one side, new call to the old name on the other. Clean
   merge, broken code. Only building and running the combined code catches it. That's the argument
   for CI.
6. Cost of a bug is mostly time: more suspects, lost context, things built on top, blast radius.
   Caution about the famous hundred-times chart; argue from the mechanism.
7. CI precisely: a practice. One main line, merge daily, every merge built and tested on a clean
   machine, keep it fast, fix red first. Why clean: the laptop lies (cached file, hand-installed
   package, case-insensitive filesystem). Lockfile in a sentence.
8. Continuous delivery versus deployment. Build once, ship those exact bytes. Rollback as moving a
   pointer back. Knight Capital: manual deploy to eight servers, one missed, old flag woke dormant
   code, about forty-five minutes, hundreds of millions. Feature flags separate deploying from
   releasing, which is how three-week work merges daily; and flags are code, delete them. Branch
   protection turns advice into a rule.
9. ML: behaviour lives in code, data and weights. Data validation, eval gate where his validation
   harness lives, the checkpoint as an artifact, gradual release. Eval metrics are noisy; a gate
   inside the noise is a flaky test and trains everyone to click re-run.
10. Build insight: the link checker found dozens of broken links that passed the build and worked in
    dev. "The build passes" and "the thing works" are different claims.
11. Ending: B restates; A sharpens that it's not about the tool, it's about the gap.

## Numbers worth saying (five)

- Three weeks on the branch.
- About a hundred and forty commits to suspect.
- Git in about two weeks.
- Four times the branch, about eight times likelier to conflict.
- Knight Capital: about forty-five minutes, hundreds of millions.

## Left to the written lesson

Blob, tree, commit details and object counts, packfiles, merge base and three-way merge mechanics,
the conflict probability arithmetic and simulation, the integration simulator, the bug-catching
ladder figure, workflow and runner vocabulary, npm ci details, environments, the rollback Predict,
trunk-based development and the Google monorepo and Accelerate findings, ML test rubric, all Build
tasks (objcat, base path, check_site, the workflow YAML, rulesets, rollback drill, Tailscale deploy),
the Measure table, Break It specifics, Explain It Back scaling answer, Go Deeper.
