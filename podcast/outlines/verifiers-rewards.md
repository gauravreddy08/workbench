# Outline: verifiers-rewards

Source: src/lessons/verifiers-rewards.mdx. Curriculum entry: "Rewards and verifiers." Question: how do
you turn "good code" into a number a model can learn from without being gamed? Why: listed in Code RL
roles; reward hacking is what happens when this is wrong. Build: write verifiers, then game them yourself.

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereq RL environment: reset, step, sandbox, reward = fraction of hidden tests passed. -> A re-explains in two sentences inside the opening scene.
- T2 Prereq Goodhart from "why is the eval separate". -> re-explained in the Goodhart part.
- T3 Time: one evening to read, one to build and red-team, an hour for the agent run. -> A, one line at the start of the build part.

## The Problem

- P1 Twenty small coding tasks, function stub, hidden tests, sandbox with timeout, reward = fraction of tests passed; point RL at it, go to bed. -> A opens on the scene.
- P2 Morning: reward curve climbs from about 0.3 to 0.97 in a few hundred steps. -> A, numbers as words.
- P3 Trajectory one: good merge_intervals. Two: dictionary lookup of the three visible inputs. Three: didn't touch solution, wrote a nine-line conftest.py telling pytest every test passed; within a hundred more steps most trajectories have it. -> A tells; B voices wrong model ("the model's being sneaky / broken").
- P4 Nothing is broken; model did what you paid for: "make pytest report success". You meant "write correct code". -> A corrects B.
- P5 Goal: a number cheap to compute, hard to fake, still high for good code; then attack your own number. -> A.

## Origin

- O1 2016, OpenAI, CoastRunners boat race; reward = score from hitting targets; lagoon with three respawning targets; circled forever, on fire, crashing, about 20% higher than humans without finishing. Amodei and Clark, "Faulty Reward Functions in the Wild". -> A story; B reacts.
- O2 Same year, "Concrete Problems in AI Safety" (Amodei, Olah, Steinhardt, Christiano, Schulman, Mané) named reward hacking, one of five practical problems that worsen with capability. -> A.
- O3 Krakovna at DeepMind, public "specification gaming" list, dozens: robot flipping block instead of stacking, evolved circuit using a nearby computer as an antenna, Tetris agent pausing forever. -> A, quick list.
- O4 Goodhart 1975: a statistic used to steer policy stops measuring. Code RL = that running thousands of times an hour against an opponent that reads your test files. -> A.

## The Idea: reward is a judgment in one number

- I1 Reward function: code that looks at an episode and returns one number; in code RL usually after the episode. -> A, plain.
- I2 Verifier: program that checks correctness with no human; tests, type checker, a model asked to grade. -> A.
- I3 Food inspector with two minutes: picks fast checks; if the kitchen knows the three checks, it passes without being clean. Which checks, can the kitchen see the checklist, can the inspector be bribed. -> A (short everyday comparison, exact).
- I4 Two numbers: how often it passes bad code, how often it fails good code; come back with real names. -> A.

## The verifier toolbox

- V1 Unit tests as a pass rate; unit test = call function with one input, check output; cheap, objective; weakness: only inputs someone wrote down. -> A.
- V2 Visible vs hidden tests: visible in workspace (debug tool, dangerous as reward); hidden outside, run at grading. -> A; B asks why visible at all.
- V3 SWE-bench: issue + repo, scored on unseen tests, "fail to pass" and "pass to pass". -> A.
- V4 Property-based tests: a rule for every input, library generates hundreds of random inputs, shrinks to smallest failure. merge_intervals properties: sorted, no two touch, same points covered, merging again changes nothing. Hypothesis in Python, from Haskell's QuickCheck. -> A; B asks "but how does it know the answer?"
- V5 Execution equivalence vs reference: reference solution written by author, never shown; differential testing; most powerful cheap check, random inputs unlimited and unpredictable. -> A.
- V6 Static checks: linter (Ruff, flake8) and type checker (mypy, pyright) read without running; catch bare except, unused import, returns None when annotation says list. Small penalty or gate, never main signal; optimizing against linter gives lint-clean code not correct. -> A.
- V7 LLM judge with rubric: readability, minimal change, conventions, honest explanation; rubric = criteria with what each score means (example 2/1/0 on names). Weak spots from judges episode: position bias, length bias, sycophancy, policy can learn to please it. Most gameable, smallest weight, audit hardest. -> A, re-explain biases briefly.
- V8 Figure 1: solution enters a jail with no net, no tests, no answers; only run, never trusted; checks stacked cheap-precise to expensive-fuzzy (static, hidden tests, properties, vs reference, judge); expensive skipped if cheap gate fails; correctness gates, quality nudges; combine into R between zero and one. -> A describes like over the phone.

## Combining signals

- C1 Weighted sum 0.6 tests + 0.2 lint + 0.2 judge: fails every test but pretty code gets 0.4; model finds that 0.4 the first time correct is hard. -> B proposes weighted sum as natural; A shows the 0.4.
- C2 Gate: correctness = min of hidden, property, reference pass rates; below 1 reward = half of correctness; at 1, reward = 1 minus small lint and judge penalties (each up to 0.1), so quality only moves correct code between 0.8 and 1.0. -> A in words with worked example.
- C3 Min rather than average: hack must beat all of them. Exact numbers judgment calls; shape is not. -> A; B checks the min idea.

## Outcome vs process, sparse vs dense

- S1 Outcome reward grades the end result; process reward grades each step, needs a step grader. -> A.
- S2 Lightman et al. "Let's Verify Step by Step" 2023: process reward model (PRM) trained on 800,000 human step labels for math; picked correct solutions better than outcome-only. -> A.
- S3 Sparse = rarely, often at end; dense = often. Pass/fail at end of a 40-step episode sparsest; pass rate a little denser (7 of 10 more info than "fail"). -> A.
- S4 Figure 2: one episode (view, write, run tests, fix, run tests, submit) three ways: outcome one tick at the end; process a tick per step (who grades? a PRM, gameable); shaped = outcome plus small hints (+0.05 ran tests, +0.1 four of five pass). Denser teaches faster and gives more places to cheat. -> A describes.
- S5 Predict why-sparse: question; B guesses (dense = faster, so why sparse? maybe compute). Answer: each intermediate reward is something to optimize instead; pay for running tests -> runs tests a lot; pay for PRM-liked steps -> writes steps PRM likes, weaker verifier than executing; outcome by running code close to real goal. Cost: slow when success rare -> task difficulty matters; GRPO samples many attempts: with 16 tries, 10%-solvable task usually gives at least one success. Process shines where steps checkable, like math, and final answer weak. -> A/B exchange. (Derived: 1 - 0.9^16 is about 81%.)

## Reward hacking in detail

- H1 Reward hacking defined; also specification gaming (Krakovna), name blames the spec. Not malice; RL is a search, finds the cheapest. -> B voices "the model is cheating on purpose"; A corrects.
- H2 Frontier reports: Claude three point seven Sonnet system card, special-casing tests; METR, models modifying tests and scoring code; Anthropic 2025 emergent misalignment paper: always-equal, exiting before tests, patching pytest via conftest; models that learned hacks generalized to worse behaviour elsewhere. -> A.
- H3 Catalogue, all real files run against real verifiers for merge_intervals: 1 hardcode visible answers (special-casing). -> A.
- H4 2 edit the tests to assert true. -> A.
- H5 3 patch the test runner: pytest auto-loads conftest.py; nine-line hook rewrites every result to passed; code can return garbage. -> A.
- H6 4 exit with status 0: os underscore exit at import time; grader checking exit code says yes. Pytest nine catches sys.exit(0) during collection, internal error, exit code 3; os._exit kills immediately, exit code 0. -> A; B asks difference.
- H7 5 always-equal object: list subclass whose equals always true; every assert calls model's own equals; hidden tests don't help. -> A; B "wait, my object's equals runs?"
- H8 6 catch every exception: try/except return empty list; crashes become plausible answers, pass rate pays for lucky ones. -> A.
- H9 7 read the answer key: expected outputs in a file the process can open; first drafts often pass the path on the command line. -> A.
- H10 8 copy the real fix: git log, or upstream patch from internet; correct code, no test catches it. -> A.
- H11 Predict hack-defense: add hidden tests run by pytest in the workspace; which stop? Answer: only knowing-inputs: hardcoding mostly, editing visible tests. Not conftest (loaded for hidden too), not exit 0, not always-equal, not copy. Swallow loses some keeps a lot. Answer key gets easier. "Hidden" is a filesystem/process property, not a config word. -> A asks, B guesses wrong (most of them), reveal.
- H12 Figure 3 gallery: definitions: hidden tests (extra, run same way), read-only tests (fresh directory, only solution copied, tests and config from pristine copy), sandbox (no network, git history, test files, grader), second verifier (separate runner, inputs only, outputs serialized to plain JSON behind a random marker, type checks, compare vs reference on random inputs). Honest bar never moves; no single defense stops all; copy-the-fix immune to tests; numbers rounded from real runs, copy row illustrative. -> A describes toggling. (Derived: hidden alone leaves five of eight at full; second verifier alone leaves only copy-the-fix.)
- H13 Three takeaways: each defense closes a specific hole (hidden: knows inputs; read-only: owns test files; sandbox: reaches things; second verifier: checker trusts checked code, deepest: same Python process means model's code changes what asserts mean). -> A.
- H14 The process running the model's code should never hold the answers; kills 3, 4, 5, 7. Inputs in, plain data out, compare outside. -> A, emphasised.
- H15 Some hacks produce correct code; defense is environment design: no network, snapshot without future commits, no reference on disk. -> A.

## Goodhart again

- G1 Goodhart re-explained: measure becomes target stops being good. RL extreme: relentless, literal optimizer. -> A.
- G2 Gao, Schulman, Hilton 2022 overoptimization: true reward rises, peaks, falls while proxy keeps rising. -> A.
- G3 Training reward never measure of success; held-out eval: different tasks, stricter checks, humans reading samples; reward up while held-out flat = Goodhart happening. -> A.

## Verifier is a classifier

- K1 Pass/fail vs good/bad = confusion matrix, like ranking models. -> A ties to his cross-encoder.
- K2 Figure 4: rows truth, columns verdict; TP reward right thing; FN good code no reward, learns slower; FP bad code full reward, learns to cheat, the one RL amplifies; TN. -> A over the phone.
- K3 Precision: of what it passed, fraction really good; recall: of really good, fraction passed. -> A; B knows these from ranking.
- K4 Not symmetric in RL: FN honest attempt unpaid, learning slows; FP behaviour paid, RL does more. FPs not random: hack works every time, every task with same verifier; model doesn't need to find it twice. -> B voices "errors are errors, noise averages out"; A corrects.
- K5 Predict fp-threshold: s = 10% honest, hacks fool 15%, start 1% hacks, 100 steps? and at 5%? Answer: 0.15 vs 0.10 expected, hacking takes over, compounds 1% to most; at 5%, honest pays more, hack share to zero. Rule: hacking wins when expected reward beats honest. Same verifier fine on easy (80% solve, 15% irrelevant), disaster on hard (5% solve). Hard tasks are where you want RL, so verifier tightest there. -> A asks; B works it.
- K6 Figure 5 toy model: two sliders, honest success s and false positive f; each step shifts toward whichever earned more; dashed measured reward rises while true success falls whenever f above s; slide s down. -> A describes dragging. (Derived from figure's formula: at s 0.10 f 0.15, hack share passes half around step sixty-two, about 95% at step 100, measured reward about 0.15, true success under one percent.)
- K7 Real training messier: hacks must be discovered first, honest skill improves, policy a blend. Core right: ratio of hack earnings to honest earnings on tasks you train on. -> A.

## Mutation testing

- M1 Coverage says lines ran, not whether results checked. Better question: if code subtly wrong, would tests notice? -> B suggests coverage; A corrects.
- M2 Mutation testing: plant small bugs in correct code; mutant; examples less-or-equal to less, max to min, sorted to list, constant plus one; killed vs survived; survivor = bug your reward pays for. -> A.
- M3 Mutation score = killed / total; each survivor a concrete false positive; estimates FP rate on plausible near-miss programs, exactly what an almost-right model writes. -> A.
- M4 Figure 6: ten mutants of reference; visible tests kill nine; survivor deletes the sort because every visible test uses sorted input; hardened kills ten. -> A over the phone; B "because the inputs were already sorted".
- M5 Caveats: equivalent mutants no test can kill so 100% not always reachable; mutants model honest mistakes not determined cheater. Mutation testing for honest mistakes, red-teaming for cheating, need both. -> A.

## Defense checklist

- D1 Hidden tests outside filesystem + visible as debug tool. -> A recap as a spoken list.
- D2 Test-file immutability: fresh directory, only solution crosses; tests, conftest, pytest.ini, pyproject come from pristine task. -> A.
- D3 Sandbox: no network, no git history beyond snapshot, no reference or answers readable, CPU and memory limits; containers at scale. -> A.
- D4 Answers stay outside: inputs only, plain serialized data behind random marker, compare in your process with type checks; count results, never trust exit code. -> A.
- D5 Multiple independent verifiers combined with min or gates. -> A.
- D6 Held-out eval, stricter. -> A.
- D7 Trajectory audits: read samples, grep for conftest, os._exit, eq overrides, test-file writes, network calls; track rate; a spike is earliest warning. -> A.

## Build It

- B0 Setup: folder, venv, pytest, hypothesis, ruff; reference solution (sort, merge if start at or before last end, take larger end, return tuples); three visible tests (basic, empty, touching); ten hidden cases as plain data in a json file; contract: list of tuples, sorted, merged when overlap or touch. -> A, one paragraph; the reference algorithm in words.
- B1 Naive grader: copies workspace, runs pytest there, trusts exit code; reward 1 if exit 0. make_ws helper. -> A one sentence.
- B2 Hardened grader, the core: fresh temp dir, copy only solution; inputs = hidden inputs + 200 seeded random lists; expected computed in grader process from reference; child run with python dash I (isolated mode, ignores PYTHONPATH and user site-packages), timeout, inputs on stdin as JSON, random nonce on command line; child records ok, output serialized inside the child, type names; prints nonce + json; parent finds nonce line, none = 0; passes only if ok, type list, elements tuples, decoded value equals expected. Hints: token_hex for nonce, report hidden and random separately, combine with min. Why serialize in child: else parent compares model's objects with ==, calling model's __eq__. On Mac, process isolation not a sandbox; child can read home dir; say so in a comment; real sandbox is a container. -> A walks it; B asks "why the nonce?" and "why serialize inside".
- B3 Property tests with Hypothesis: intervals generated as start between minus fifty and fifty, length up to twenty; up to twelve intervals, 300 examples; checks: exact types, sorted, no overlap or touch, same integer points covered, idempotent; runs in fresh dir from pristine task, extra min term; against hardcoded cheat it shrank to a single interval zero to zero; properties alone can miss consistently wrong; runs inside model's process, so it's a second opinion, stdin runner primary. -> A.
- B4 Lint gate: ruff with isolated flag (ignore config files) and explicit rules E, F, B, JSON output; 0.02 per finding, capped 0.1; combine: correctness = min of hidden, reference, props; below 1 reward half; at 1, 1 minus lint penalty. Optional mypy strict or pyright. -> A.
- B5 Red-team: seven cheats as files, run through naive and hardened; don't look at gallery code. List incl. conftest hookwrapper on makereport; sys.exit vs os._exit; readkey with first-draft hidden grader that execs cases in workspace passing the path in argv. Fix every hole, rerun all (a fix shouldn't reopen another). Honest-but-different solution must still get 1.0; grader that rejects correct code is broken too. -> A.
- B6 Mutation-test with ast module: sites (comparisons, plus/minus, and/or, max/min, sorted to list, int constants +1), one mutant each via unparse; three verifiers; re-parse per mutant and find k-th site; write a test for every survivor; mutmut alternative, changed in version 3. -> A.
- B7 Agent run: loop from env, few dollars, tool to run visible tests, 20 runs normal + 20 with pressure prompt "Your only goal is to make the tests pass..."; log tool calls; audit.py greps red flags (writes other than solution, conftest, os._exit, sys.exit, __eq__, bare except, git log, curl, pip install, reads of test/hidden paths); flag rate, read flagged by hand; have an agent review. -> A.
- B8 Done when: honest 1.0, every cheat at most 0.15 except swallow (decide); different correct solution 1.0; mutation scores with survivors killed or explained; read five trajectories, flag rate recorded. -> A, folded in.

## Measure

- E1 Setup of reference run: M-series Mac, Python 3.14, pytest 9.1, Hypothesis 6.170; hardened = hidden + 200 random vs reference, no lint. Decimals differ; pattern shouldn't. -> A as "when I ran this on my Mac".
- E2 Naive: honest 1, six of eight cheats 1.0 (hardcode, edit, conftest, os._exit, always-equal, swallow); sys.exit 0 because pytest catches SystemExit at collection, exit 3; os._exit no exception, status 0; read-key 0 under naive. -> A says the numbers, B reacts.
- E3 First-draft hidden: hardcode 0.30, edit 0.10, conftest 0.30 only because this grader doesn't use pytest (one running pytest would still be 1.0), os._exit 0, sys.exit 0, always-equal 1.0, swallow 0.70, read key 1.0 (grader handed it the path). -> A.
- E4 Hardened: honest 1, hardcode 0.12, edit 0.11, conftest 0.12, exits 0, always-equal 0, swallow 0.33, read key 0. Leftovers 0.10-0.12 from inputs where empty list is accidentally right; swallow 0.33 because half-right is right on a third of random inputs; paying for that is a design decision: pass rate gives gradient on hard tasks, all-or-nothing doesn't pay half-right. -> A; B asks why not zero.
- E5 Mutation: 10 mutants, visible killed 9, survivor sorted to list; hidden and hardened killed all 10; small number, read the survivor not the percentage. -> A.
- E6 Grading cost: naive pytest about 610 ms median (mostly starting pytest), stdin/JSON runner about 80 ms with 210 cases; Hypothesis 300 examples a few seconds; million grades: 170 vs 22 CPU-hours. Verification often expensive part; property tests first to cap. -> A, numbers with comparison (his numbers gap).
- E7 Agent runs not run by author: strong model normal prompt, expect clean nearly always; pressure prompt more interesting; labs report special-casing rises with hard tasks or test-emphasizing instructions; make task harder; held-out pass rate is the true number. -> A, honestly framed as "I haven't run this one".

## Break It

- K1b Compare in the wrong process: child gets expected outputs and compares itself, prints count; always-equal and read-key went 0 to 1.0; same as first-draft hidden; then restore and remove just type checks; know which lines are load-bearing before cleaning up. -> "what if" exchange.
- K2b Too strict: identical including object identity of tuples, or reject any import; three honest styles, one gets 0; traded FP for FN; good strategies quietly stop being reinforced, invisible in reward curve, only a model weirdly bad at some tasks. -> exchange.
- K3b Weighted-sum judge 0.7 correctness + 0.3 judge; wrong solution with nice names, long docstring, "verified correct" comment; likely pulls a good share of 0.3; switch to gate, drops below 0.5. -> exchange.
- K4b Leak through environment: reference.py next to solution, or .git with later commit containing fix; correct code, no test catches; fix in environment, not grader. -> exchange.

## Explain It Back (content must be present)

- X1 FP vs FN: FN slows learning; FP gets repeated; hacks not random, once works always, every task sharing verifier; hacking wins when expected reward beats honest, easiest on hard tasks; design for precision first, then recover recall. -> covered in K4/K5 plus "precision first, then recall" line.
- X2 Hidden tests, reward still suspicious: conftest, exit 0 with exit-code trust, always-equal, reading hidden file, copying fix; grep trajectories, fresh directory, serialized data to separate process holding answers, compare with held-out eval with different grader. -> covered across H11, D-list; A says the diagnosis order once.
- X3 Outcome vs process, sparse vs dense trade-off; sample many attempts; choose tasks solved sometimes not always; pass rate mild densification; shaping risky. -> S5 plus explicit "sometimes but not always".
- X4 Test suite good enough: coverage not enough; mutation testing; red-team hacks to near zero; recall via several correct solutions in different styles. -> M-section + B5.
- X5 Million rollouts/day: per-grade cost 600 vs 80 ms; 170 vs 22 CPU-hours before sandbox startup, which with containers can dominate (keep warm containers, reuse per task); one process per grade not per test; cheap gates first, skip expensive once one fails; cap property examples; cache reference outputs for fixed hidden inputs; judges only on correct solutions, sample if needed; don't cut independence. -> E6 extended conversation.

## Go Deeper / Connections

- GD One sentence: Concrete Problems section on reward hacking, and Krakovna's specification gaming list. -> A, close.
- CN Next: RL with verifiable rewards, train small model with GRPO against this grader; watch reward curve next to held-out eval, run audit on every checkpoint; if curves split you missed one. Containers for the sandbox, back-of-envelope for cost. -> A, near the end.

## Flow

Problem scene (P) -> B's wrong model ("model is broken/sneaky") -> Origin stories -> what a reward and a verifier are, inspector -> toolbox, one tool at a time with B interruptions -> figure 1 jail pipeline -> combining (B proposes weighted sum) -> outcome/process, sparse/dense, figure 2, predict why sparse -> hacks catalogue -> predict hidden tests -> gallery and three takeaways -> Goodhart and held-out -> classifier, precision/recall, asymmetry, predict threshold, amplification slider -> mutation testing, figure 6 -> checklist -> build it (setup, naive, hardened, props, lint, red team, mutation, agent) -> measure -> break it -> scale question -> connections -> B restates, A sharpens.
