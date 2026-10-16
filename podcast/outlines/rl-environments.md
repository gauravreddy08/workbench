# Outline: rl-environments

Source: src/lessons/rl-environments.mdx. Curriculum entry: "What is an RL environment?" Question: what
is an environment in reinforcement learning, and how do you build one for coding? Why: the core of
Code RL work: tasks, sandboxes, and a loop a model can learn from.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

Diagnostic gaps this touches: numbers (sandbox fleet arithmetic, latency ratios), process vs thread
and the GIL (ThreadPoolExecutor driving subprocesses), "output distribution" (policy as a probability
for every next action / token). Each gets B voicing the natural wrong model.

## Today / prerequisites

- T1 Prereqs: containers (sandbox), processes/threads/GIL (subprocess), queues and back-of-envelope (throughput). -> Not said as a list; re-explained briefly where used (what a container is, Little's law, why threads are fine for subprocess work).

## The Problem

- P1 You want a model better at fixing bugs; you have the model and an algorithm (PPO, GRPO); nothing to practise on. -> A opens straight on this.
- P2 Practice = give it a bug, let it poke, try a fix, tell it how well it did; thousands of times per training step, for weeks; needs clean copy, safe place to run, unfakeable score, fast enough that GPUs aren't idle waiting for unit tests. -> A continues the scene.
- P3 That practice arena is the environment; Anthropic Code RL posting lists "design RL environments" as core work. -> A; B's wrong model: "isn't an environment just the dataset / benchmark?" A corrects.
- P4 A run can only teach what its environments can measure: too easy -> learns nothing; broken -> learns to exploit the bug; slow -> ten times less practice. -> A, three short beats.

## Origin

- O1 Early 2010s: every RL paper had its own simulator, conventions, scoring; comparing meant reimplementing both. -> A as story.
- O2 Arcade Learning Environment (Bellemare et al., 2013) wrapped dozens of Atari games behind one interface; DQN learned many games with one algorithm. -> A.
- O3 2016 OpenAI Gym: every task, pole to robot, an object with two methods, reset and step; the tiny contract made "environment" buildable, shippable, swappable. -> A; B reacts to how small.
- O4 Farama Foundation took over as Gymnasium (2022); step began returning terminated and truncated, fixing a subtle bug in many published results. -> A plants it, pays off later.
- O5 HumanEval (Chen et al., 2021) scored functions with hidden unit tests; SWE-bench (Jimenez et al., 2023) turned real GitHub issues + test suites into tasks; once a test suite says "yes, fixed" automatically, a task becomes a world to practise in. -> A.

## The Idea

### The loop
- I1 Learning a board game with no rulebook: move, game changes, sometimes win/lose at the end. -> A, one quick comparison.
- I2 Agent (decision maker; for us the LLM) and environment (everything else: board, rules, opponent, scorekeeper). -> A, terms in plain words.
- I3 Turn-taking: observation (often partial), action, environment updates and returns next observation + reward (the only signal of "good"); one full run = episode, aka rollout or trajectory. -> A.
- I4 Figure 001: agent only sends actions, environment only sends observations and rewards; one pass = one step; lay steps in a line = episode; reset starts it, terminated/truncated ends it. -> A describes the two boxes and the row of steps.
- I5 Environment has state the agent can't see: chess vs robot camera vs coding model sees only files it opened and outputs of commands it ran; full state (every file, hidden tests, seed) lives inside. -> A; B checks "so the observation is a slice".
- I6 Reward is the only definition of good; if the number can go up without the task getting done, the agent eventually finds that path. -> A, flagged as the thread through the whole episode.

### Policy
- I7 Policy: function from what I've seen to how likely each action is; CartPole "pole leaning left: push left with probability 0.9"; training makes high-reward actions more likely, low less. -> A; B voices "policy = a rule that picks the best action" (deterministic); A corrects: probabilities. Nails "output distribution".
- I8 Probabilities give exploration; two episodes on same task differ; comparing them is how the learner finds what worked. -> A.
- I9 Environment doesn't learn, never updates, doesn't know a net is there; referee + world simulator, identical regardless of player. -> A; B wrong model: "the environment adapts too?" brief.

### The Gym contract
- I10 The CartPole code: make env, reset with seed forty-two, loop: random action, step returns five things, add reward, stop on terminated or truncated, print return. -> A describes in words, no code read.
- I11 reset throws away the past, returns first observation + info dict for debugging extras; seed makes randomness repeatable. -> A.
- I12 step applies one action, returns next obs, reward, two end flags, info. -> A.
- I13 Return = sum of rewards over episode; CartPole pays plus one per step, so return = how long you lasted. -> A.
- I14 Figure 002: terminated = world reached an end (pole fell, submit); truncated = you cut it off (step limit, wall clock); CartPole truncates at five hundred steps; a perfect policy is always truncated, never terminated. -> A, two timelines.
- I15 Old Gym single done flag treated as "future worth zero"; true for a fallen pole, a lie for a balanced pole at the time limit; teaches that balancing well is a dead end; split lets learner say "episode stopped, world didn't end". -> B: "isn't that just bookkeeping?" A explains the bug.
- I16 Coding: submit = termination; hitting the thirty-tool-call limit or token budget = truncation; report which even if first trainer ignores. -> A.

### LLM as the agent
- I17 Mapping table: policy = the LM, its next-token probabilities; observation = text (task + every tool result) vs CartPole's four numbers; action = a tool call written as tokens (or each token); step = one model turn + one tool execution; episode = one conversation, task in, many tool calls, submit or time out; reward = usually one number at the end from hidden tests. -> A walks it as speech, B fills one row himself.
- I18 Action space enormous; most strings aren't valid tool calls; environment parses and returns errors as observations, doesn't crash; two zooms: per token or per tool call; algorithms compute per token, environments written per tool call because that's where the world changes. -> A.
- I19 Observation is cumulative: at step ten the model sees task, nine calls, nine results; environment returns only the new piece; the harness (builds prompt, parses calls, sends to env, appends results) appends; context grows every step; managing context is its own skill. -> A, B asks who does the appending.
- I20 Sparse reward: CartPole pays every tick, coding pays once at the end; which of twenty actions deserved credit = credit assignment; why long tasks are hard; intermediate signals possible but each is gameable; most coding RL starts with one end-of-episode score. -> A.
- I21 Figure 003 step-through: reset seed seven -> system line with four tools, task "median returns wrong value for even-length lists", two file names, about a hundred eighty tokens; view_file shows sort and take the middle; run_tests: two pass, one fails, expected two point five got three; write_file: "ok", tiny observation, model must remember what it wrote; run_tests: three pass; submit: hidden tests seven of eight, empty list should raise ValueError, reward zero point eight seven five, fresh process; context about four hundred seventy tokens; reward zero every step until submit. -> A narrates the episode as a story, B reacts.
- I22 Model never saw hidden tests; the empty-list case nobody mentioned; that one number is all the training step learns from the whole trajectory. -> A.
- I23 Predict visible vs hidden: model can edit visible tests (delete or make always-true); hidden tests outside, run after episode; visible = tool, hidden = referee; same as why evals are separate: what you optimise against can't be what you're measured by. -> A asks, B guesses partly, reveal.

### Anatomy
- I24 Seven parts; top four the model touches, bottom three the environment's private business. -> A frames, B counts.
- I25 Task spec: often the issue as a user wrote it, vague; keep it honest, an unmentioned requirement tested is mind-reading; the zero point eight seven five episode is arguably that bug. -> A; B catches the median callback.
- I26 Starting state: exact repo, commit, dependency versions, installed; "clone and pip install" isn't one; baked into a container image once; reset = start a container from it. -> A, re-explain container in a line.
- I27 Sandbox: infinite loops, fork bombs, rm -rf root, internet; not malicious, a policy exploring, which is worse because it tries everything eventually. -> A; B "the model isn't out to get you" wrong model.
- I28 Tools: small set easy to read and grade; bash realistic and dangerous; truncate long outputs, errors as text, no tool reaches hidden tests. -> A.
- I29 Termination: caps on steps, tokens, wall clock; one confused episode loops for hours while batch waits; tail latency: step finishes when slowest episode does. -> A.
- I30 Reward function: fraction of hidden tests passed; real setups often 0 or 1 to stop partial credit for easy tests. -> A.
- I31 Metadata: source and date (contamination), difficulty, reference solution, image digest; "why did reward jump on Tuesday?" -> A.

### Determinism
- I32 Environment is a measuring instrument; deterministic = same seed + same actions -> same observations and reward; otherwise can't tell better model from lucky one. -> A.
- I33 Unpinned dependencies -> pin, build once, record digest. -> A.
- I34 Network -> off; also safety. -> A.
- I35 Time and randomness: today's date, unseeded random, hash randomisation for set ordering; fix the hash seed, seed RNGs, fake the clock. -> A.
- I36 Flaky tests (thread timing, tight timeouts): run reference many times, drop any task whose reward isn't identical. -> A.
- I37 The most useful check: untouched start scores 0, reference scores 1, every time; SWE-bench's fail-to-pass and pass-to-pass tests. -> A, emphasised.

### Throughput
- I38 Predict sandboxes: 256 tasks x 8 = 2,048 episodes; ~20 tool calls, half run ~2 s code -> ~20 s each; serial ~41,000 s ~ 11 hours per step; under a minute needs ~700 at once, more because model time holds the sandbox; Little's law (in flight = start rate x lifetime); 1 GB each -> most of a terabyte; environments are a distributed system. -> A asks, B guesses low (numbers gap), A walks it.
- I39 Reset cheap: clone+install = minutes; container from image = roughly a second or less (measure); copying a directory = a millisecond. -> A.
- I40 Steps cheap and bounded: file read microseconds; test run = process start + tests, hard timeout; ninety-ninth percentile episode decides when batch finishes. -> A.
- I41 Parallel without shared state: no shared temp dir, fixed port, global current task; test eight at once vs one by one, same rewards. -> A.

### Signal
- I42 GRPO samples several attempts and judges each relative to siblings (above group average = good); all pass or all fail -> every attempt exactly average, advantage zero, no learning; advantage defined; paid for eight sandboxes and generations for nothing. -> B wrong model: "train on the hardest tasks"; A corrects with this.
- I43 Formula in words: chance a group of k has at least one pass and one fail = one minus all-pass minus all-fail. -> A, small worked example.
- I44 Figure 005: curve over pass rate, collapses near zero and one, peak in the middle; more attempts widen the useful band at proportional cost; dashed reward-variance curve; readouts all-fail / all-pass / mixed. -> A describes dragging the sliders.
- I45 Predict: p = 2%, k = 8: ~85% all-fail, ~15% useful; p = 50% -> ~99%; roughly six times more signal for same compute. -> A asks, B works, A confirms.
- I46 Filter by difficulty: estimate pass rate with current (or slightly weaker) model, keep ~10-90%; retire always-solved, promote harder; difficulty is a property of task and model, re-run filter. -> A.
- I47 Task sources: real history (SWE-bench recipe: realistic, scarce, messy, public); synthetic breakage (unlimited, cheap, can feel artificial); written from scratch (controlled, tests only as good as author). -> A, quick three.

### Contamination
- I48 Definition; "fix issue in popular library" may have been seen; measures memory not skill; trains recall. -> A; B questions.
- I49 Signs: exact upstream patch with maintainer's variable names without opening files; high on old tasks, collapse after cutoff. -> A.
- I50 Mitigations in order: tasks after cutoff (date in metadata), rewrite/perturb, private code, compare old vs new slices. -> A.
- I51 Within-environment contamination: hidden tests readable in sandbox, a path in an error message; environment leaking its answer key. -> A, points to break-it.

### Sandbox
- I52 Model code untrusted not because hostile but because loop rewards whatever works; worst episode should cost one episode. -> A.
- I53 Figure 006 nested layers: subprocess + limits (wall timeout, CPU seconds, max file size, own session, minimal env vars) stops loops and giant outputs; container (own filesystem, network off, memory and process caps) stops rm -rf on host, network calls, fork bombs, memory blowup; VM / microVM / gVisor (own kernel) stops kernel exploits and escapes. -> A, nested boxes.
- I54 Inner layer fine for experiments, not for model code at scale: can read home dir, open sockets; macOS weaker: memory cap raised ValueError; memory caps need Linux or a container; cgroups do resource accounting. -> A, "on my Mac".

## Build It
- B0 Task pool: stub, reference, visible tests, hidden tests; ~20, one function each, stdlib; median example; one deliberately broken hidden test importing a module that doesn't exist, caught later; error-case test via try/except; agent drafts the rest: trivial, medium (duration string "one h thirty m", merge intervals, tiny LRU cache), fiddly (expression evaluator with precedence, diff of two lists); four to ten hidden tests each, edge cases the prompt mentions. -> A, "here's what you'd build".
- B1 Sandbox function: can't hang, can't spin on CPU, can't write giant file; in the child before it starts: CPU-time limit, file-size limit, own process group; minimal env (path only, hash seed zero, no bytecode files); returns code, output, error, timed-out flag, seconds; truncate to last ~4,000 characters; wall-clock timeout catches sleep, CPU limit catches busy loop, want both; killed child's return code is negative signal number; test with print / busy loop / long sleep; busy loop with two-second CPU cap back in ~2.7 s on a loaded machine. -> A; B: "why both limits?"
- B2 CodeEnv: reset picks task by id or seeded random, fresh temp dir, stub + visible tests, hidden tests elsewhere; step with four tools; bad action -> error text, reward 0; after max steps (twelve) truncated, reward 0; close deletes temp dirs. Decisions: refuse paths outside task dir ("dot dot slash etc passwd"); hidden tests copied in only at submit into a fresh dir; submit runs in a fresh process; truncated reward choice, write down why. -> A.
- B3 Validator: stub submits 0, reference 1, reference five times identical; table of failures; catches broken median test; fix the task, not the validator; then it's a trusted instrument. -> A.
- B4 Baselines no-op and random; floor; random writes a function with the wrong name; both ~0; nonzero means hidden tests accept trivial answer (returns zero passing "f of empty is zero"). -> A.
- B5 LLM baseline with tool calling (Anthropic SDK shape, four tools described), loop; model stops without submit -> treat as submit or nudge once; each task three times; log transcripts; ~300 calls; estimate cost from usage early; agent review for unfair bugs: tool results split into separate messages, exception in step killing episode, temp dirs not closed. -> A.
- B6 Bench: median and p99 of reset over 200; tool medians over 50; 64 reference episodes serial vs 8 workers with a thread pool, each worker own env, work in child processes so GIL isn't the bottleneck; assert rewards match task by task. -> B wrong model "threads won't help, GIL"; A corrects (GIL gap).
- B7 Container version: same signature, flags: no network, 512 MB memory, one CPU, process cap 128, read-only root with scratch /tmp, non-root user, task dir mounted; slim Python 3.12 image; rerun validate and bench, compare submit latency; do it on the Spark. -> A, each flag mapped to sandbox layer.
- B8 Done when: validate passes for all ~20 five times; baselines ~0, LLM in between, read five transcripts incl. a failure; parallel matches serial; busy loop killed, scores 0 without stalling others; point at seven parts in your own code. -> A folded in.

## Measure
- M1 Fill a table across Mac subprocess, Spark subprocess, Spark container, predictions first. -> A one line, no table read.
- M2 Predict: submit ~100x slower than reset; reset ~1 ms (temp dir + two files); submit starts a fresh interpreter, which dwarfs the asserts; view_file tens of microseconds; code-running tools thousands of times costlier. -> A asks, B guesses.
- M3 Reference numbers: M-series Mac, Python 3.14, load average above seventy, upper bounds, ratios are the point; reset ~0.9 ms; view_file ~40 us; submit ~110 ms; bare Python start ~100 ms (few tens on idle machine); busy loop killed ~2.7 s, reward 0; no-op 0; reference 1. -> A as "when I ran it".
- M4 Running code is the cost: warm interpreters, test selection, fast container starts; model calling run_tests ten times is a throughput question. -> A.
- M5 Parallel near linear: an eighth of serial time with 8 free cores; loaded runs too noisy; much less than 8x -> look for something shared (temp dir, lock, single-threaded harness). -> A.
- M6 Container column slower per call; real systems keep one container per episode and exec into it, paying container cost once at reset. -> A.
- M7 LLM baseline tells you about the pool: 3/3, 0/3, mixed; always-solved and never-solved teach nothing; read 0/3 transcripts first; some hard, some spec bug. -> A.

## Break It
- X1 Leak the answer key: hidden tests in task dir, a "policy" views them and special-cases each input, scores 1.0; real policy just needs to view every file; anything in the sandbox is part of the observation. -> "what if you..." exchange.
- X2 Fake the score: same-process runner; an object equal to everything; print a forged result line and exit before tests; both scored 1.0 on my prototype; reward hacking defined; fixes: tests in separate process, type checks, results from a file the solution can't write, never parse output the solution controls; keep exploits as regression tests. -> A, B reacts.
- X3 Nondeterminism: test depending on set order, remove hash seed; passes some runs, fails others; across 2,048 episodes part of reward is coin flips, training on noise; restore seed and fix test (checks an accident of implementation). -> A.
- X4 Shared state: fixed temp directory; parallel rewards stop matching; one episode's write lands in another's dir, scored on someone else's code; nothing errors; that's what makes it expensive. -> A, B reacts.

## Explain It Back (substance must appear)
- E1 Environment = world + referee; action in, state update, observation + reward out; reset; doesn't learn; faithful, repeatable, cheap; reward must mean what you think. -> ending + I9.
- E2 Mapping + sparse reward + credit assignment. -> I17-I20.
- E3 Terminated vs truncated: learners estimating future value must treat a truncated last state as still having value; mixing them teaches doing well until the limit is worthless. -> I15.
- E4 Scale: 2,000 episodes x 1 minute = ~33 hours serial; ~1,000+ sandboxes to keep step to a couple minutes (Little's law); prebuilt images; one long-lived container per episode with exec; hard timeouts; no shared state; scheduler packing containers onto a fleet and restarting dead ones; memory/CPU caps; measure p99 not mean. -> A in a scale exchange after I41 or M6.
- E5 Task selection: validate, calibrate 10-90%, 2% with 8 -> 85% all-fail, re-run filter, retire, contamination checks. -> I37, I45, I46, I50.

## Go Deeper / Connections
- G1 Sutton and Barto chapter three; Gymnasium docs on time limits. -> one closing sentence.
- C1 Next: rewards and verifiers starts from the two exploits; GRPO puts training on top; long-horizon; managing context; the agent loop is a tiny agent harness. -> one sentence near end.

## Flow
1. Problem scene (P1-P4), B's "isn't it just a dataset" correction.
2. Origin story (O1-O5).
3. Loop, hidden state, reward as definition of good (I1-I6).
4. Policy as probabilities (I7-I9), B's deterministic wrong model.
5. reset/step, return, terminated vs truncated (I10-I16).
6. LLM mapping, three changes, the median episode, visible vs hidden predict (I17-I23).
7. Seven parts (I24-I31).
8. Determinism + the zero/one check (I32-I37).
9. Throughput predict + scale (I38-I41, E4).
10. Signal in the middle (I42-I47).
11. Contamination (I48-I51).
12. Sandbox layers (I52-I54).
13. Build it (B0-B8), GIL correction at B6.
14. Measure (M1-M7).
15. Break it (X1-X4).
16. Close: G1/C1 one line, B restates, A sharpens.
