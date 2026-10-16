# Outline: long-horizon

Source: src/lessons/long-horizon.mdx. Curriculum entry: "What makes a task long-horizon?" Question:
why do agents that succeed at 10-step tasks fail at 100-step ones? Why: listed in Code RL roles;
error compounds and you can put numbers on it.

Each item: what is taught -> how it is said aloud. Diagnostic gap hit: Numbers (no feel for how
small per-step rates compound). B voices the linear-thinking wrong model and gets corrected.

## Today / prerequisites

- T1 Prereqs: error bars (statistics-for-evals), context management is the sibling. -> Not listed; standard error re-explained in Measure; context window explained inline.

## The Problem

- P1 Small job: rename a config key, fix one test. Nails it. -> A opens on this scene.
- P2 Ten in a row: nine fine, tenth edits a file it already edited, undoing its own work. -> A, continuing.
- P3 Forty-file migration, each change depends on the one before; runs an hour, reports success, tests fail; misread a value around file twelve; every edit looks reasonable, whole thing wrong. -> A.
- P4 The model didn't get dumber; each step as likely right; you asked it to be right forty times in a row with nobody checking. -> B voices "it got tired / dumber" wrong model, A corrects.
- P5 Anthropic Code RL posting: "long-horizon autonomous engineering tasks"; short tasks mostly solved; frontier = staying correct across hundreds of steps: lower per-step error, notice and fix own mistakes, train when signal only at the end. -> A, why this matters for the job.

## Origin

- O1 ALVINN, Dean Pomerleau, Carnegie Mellon, 1989: small net steered a van by watching a human drive; copied well. -> A tells as story.
- O2 Humans rarely drift to the edge, so training data never showed recovery; small error -> unseen situation -> bigger error -> drift. -> A.
- O3 Fix: synthesised shifted camera images labelled with the correction; taught it recovery. -> A.
- O4 Ross and Bagnell (2010) made it precise for imitation learning (term: copying an expert from recorded demos); mistake rate epsilon per step -> total cost can grow like epsilon times T squared, not epsilon times T; DAgger (Ross, Gordon, Bagnell 2011). -> A in words: "grows with the square of the length"; B asks why square, A: each mistake lands you somewhere unfamiliar where you make more.
- O5 Same worry with LLMs: each token/step some chance of going wrong; long output almost surely goes wrong; whether fatal depends on recovery. -> A, bridges to the idea.

## The Idea: horizon definition

- I1 Baking scene: teacher says "too much flour" vs only feedback is cake tasting three hours later; same actions; second harder to do and learn from since you don't know which of forty things caused it. -> A, short; allowed everyday comparison making one exact point.
- I2 Trajectory term: full record of one attempt, every observation and action in order; also rollout or episode; loop look-decide-act-see; step = one tool call (read file, run command, write edit). -> A inline.
- I3 Horizon term/definition: how many steps between start and learning whether it worked; not tokens, not wall-clock, though both go up with it. -> A.
- I4 Three-thousand-token essay = one decision graded once; sixty tool calls graded by final test suite = horizon sixty. -> B voices "long-horizon means long output, lots of tokens", A corrects with this.
- I5 Short vs long horizon picture: top, check after every step, mistake seen at once, fixed; bottom, forty steps, one pass/fail at end, mistake at step twelve found at forty, signal doesn't say which step. -> A describes over the phone.
- I6 Two ways at once: more chances to be wrong, mistakes stay hidden longer. -> A signpost.

## The Idea: compounding

- C1 Model: each step right with probability p; any wrong step ruins it; steps independent; success = p multiplied by itself n times. -> A in words.
- C2 Predict p99: 99% per step, 100 steps -> about 37%; fails most 100-step tasks. -> A asks, B guesses linearly (wrong), reveal.
- C3 Coin-flip length about 69 steps; shortcut: 50% length is about 0.69 divided by the failure rate; one mistake per 100 -> ~69; one per 1,000 -> ~693; checked in Python. -> A, worked example in words, "point six nine" explained as "about seven tenths".
- C4 Horizon inversely proportional to failure rate (term: failure rate = chance one step goes wrong); halve failure rate -> double length; 98->99 doubles; 99->99.9 times ten. -> A, B reacts to "rounding error".
- C5 Table landmarks: 90% per step: 35% at ten, ~0 at hundred, ~7 steps; 95%: 60% at ten, 0.6% at hundred, ~14; 98%: 82%, 13%, ~34; 99%: 90%, 37%, ~69; 99.9%: 99%, 90%, ~693. -> A picks a few rows conversationally, not row by row.
- C6 Demo vs system: demo is one short run; reliability across many steps is a different, much harder number. -> A.
- C7 Hazard rate term: chance of failing next step given you haven't yet; constant -> exponential survival, like radioactive decay; half-life term: steps after which half the runs failed, ln 2 over failure rate; comes back with METR. -> A, B connects to physics.

## The Idea: twenty-four agents (interactive)

- F1 Twenty-four simulated runs, rows of squares, one per step; sliders for p and r, length buttons, verify-every-five toggle; first mistake kills the run, steps after it greyed out. -> A as "picture a grid".
- F2 At p 0.95 and forty steps, "steps that were right" reads about 95% yet only a few runs finish; per-step accuracy vs end-to-end success; ask for the other number. -> A, B surprised.
- F3 Grey squares: wasted work, tokens paid that can't lead to success; expensive failure is the quiet mistake at step twelve that keeps going to forty, not the crash at step three. -> A.

## The Idea: recovery

- R1 If p^n were the whole story agents would be hopeless: no model has 0.1% error on hard steps yet agents finish hundred-plus tool calls; mistakes aren't always fatal. -> B raises the contradiction ("but agents do finish long tasks").
- R2 Good engineer: mistyped path, command fails, fix (one step); off-by-one, test fails, fix (few steps); only unnoticed or un-undoable mistakes kill a project. -> A.
- R3 Three fates: loud right away (cost one step); caught later, test fails six steps on (rework); silent or irreversible (cost the run). Depends on how soon visible and whether undoable, not size. -> A.
- R4 Recovery term and r: probability the agent notices and fixes before it matters; fatal = wrong and not recovered; fatal rate = failure rate times (one minus r); effective per-step success q = p plus (1-p) times r; success = q to the n. -> A in words with numbers.
- R5 Still constant hazard, smaller hazard; half-life = 0.69 over (failure times one-minus-r); recovery and accuracy multiply; recovering half = making half as many; training: more careful, or better at noticing and fixing, second maybe easier. -> A.
- R6 Predict recovery: A 97.5% no recovery vs B 95% recovers half -> same; fatal 2.5% each; q 0.975; 50% length about 27. -> A asks, B guesses B (or A), reveal.
- R7 Not same in practice: B uses more steps; B depends on mistakes being detectable; silent errors -> r collapses, horizon halves; A robust; why same model scores differently on different harnesses. -> A.

## The Idea: verification

- V1 Recovery needs visible mistakes; make them visible on purpose: tests after each edit, type-check, diff output; verifier term (test suite, type checker, linter, script comparing to known answer); turns fate three into fate two. -> A.
- V2 Model: every k steps run a check; if block has fatal mistake, check catches with probability c (catch rate term: fraction of real bugs detected, 60% misses 4 in 10, related to recall); redo block, up to three attempts; missed = silent, doomed. -> A in words.
- V3 Block math: block clean = q to the k; bad and caught = (1 - clean) times c; pass = clean times (one plus f plus f squared); success = that to the n over k. -> A in words only ("clean the first time, or caught once and clean on retry, or caught twice...").
- V4 Checked closed form vs simulation: p 0.95, k 5, c 0.9, forty steps: formula 74.2%, forty thousand simulated runs 74.4%. -> A, "when I checked".
- V5 Predict verify: p 0.95, forty steps, no checks about 13%; check every step, three tries: perfect -> about 99.5% (three wrongs in a row 0.05 cubed about one in ten thousand); c 0.5 -> about 35%. -> A asks, B guesses high for half-check; reveal.
- V6 Weak verifier: each slipped bug is silent fatal, fresh chance every step; checking more often with weak verifier buys more chances to be fooled; quality over frequency; rewards and verifiers topic. -> A, B voices "check more often" model.
- V7 Success-vs-steps interactive: dashed p^n, thin recovery, blue verification; dots at 50% horizons; cost readout. -> A, "picture a chart with three curves".
- V8 Things to find: p .99 -> 69, .98 -> 34; p .90 r .8 -> 7 jumps to 34 = p .98 no recovery; verify every step catch 1.0 runs off right edge, slide to 0.5 most gain gone; verify every 20 -> most blocks have a bug, redo big chunks, run out of attempts; checking rarely cheap per check, expensive per mistake. -> A as "drag the slider" exchange.

## The Idea: METR

- M1 Steps not comparable across tasks (regex vs schema design); METR nonprofit evaluating frontier AI wanted one number across tasks; measure in human time. -> A.
- M2 Paper: Kwa et al. 2025, "Measuring AI Ability to Complete Long Tasks", later "Long Software Tasks", NeurIPS 2025. -> A briefly.
- M3 Method: about 170 tasks from HCAST, RE-Bench, 66 new very short SWAA; seconds to many hours; paid skilled humans and timed; ran models GPT-2 (2019) to early 2025 in scaffold, pass/fail; fit logistic (S-curve term) of success vs log human time; 50% horizon = where curve crosses half. -> A as a story of what they did.
- M4 Schematic: dots per task pass/fail along log time axis, S-curve, crosses 50% at the horizon; 80% horizon same idea at stricter bar, much shorter. -> A describes.
- M5 Headline: early-2025 frontier (Claude 3.7 Sonnet top) about 50 minutes; doubled roughly every seven months since 2019, possibly faster in 2024; 80% horizon several times shorter; gains mostly from reliability and adapting to mistakes = p and r. -> A.
- M6 Caveat: not "works for 50 minutes"; it's tasks that take skilled human 50 min, succeeds half the time; model might take 5 min or 2 hours. -> B voices the wrong reading, A corrects.
- M7 Caveat: tied to task suite: well-specified, auto-scored, self-contained; messy tasks score worse; external validity, authors discuss. -> A.
- M8 Caveat: doubling every 7 months is an observed trend line through a few dozen models over six years; measurement, not law; extrapolation is a forecast. -> A.
- M9 Caveat: 50% is a low bar; for unsupervised handoff you care about 80% or 99%, much shorter. -> A.
- M10 Toby Ord 2025 "Is there a half-life for the success rates of AI agents?": fits constant-hazard per minute of human time; each model own half-life; doubling horizon = halving per-minute failure rate every seven months; METR's logistic on log time decays more slowly at long lengths than exponential; you fit both. -> A, B connects back to half-life.

## The Idea: what makes long tasks hard

- H1 p^n treats steps as independent coin flips; real long tasks worse. -> A signpost.
- H2 State tracking: remember what's done and true (which files edited, renamed, value in file 12); humans offload to codebase, notes, git status; agent keeps in context or re-derives; "edited same file twice"; per-step error rises over the task, breaks constant p in the bad direction. -> A.
- H3 Context limits: context window term (max text model sees at once: system prompt, conversation, tool output); 200-step trajectory runs past it; even before, fact from step 12 buried under 150 steps of logs; summarise/drop/retrieve, summary may lose the detail; managing context topic. -> A.
- H4 Sparse delayed feedback: don't know if step 12 right until step 40 tests; r high for immediate errors, near zero for late-showing ones. -> A.
- H5 Planning/decomposition: bad plan, every step correct, whole wrong; split into checkable chunks = verify every k, done by agent. -> A.
- H6 Verification and self-correction: two failure modes: not checking (low r), checking but trusting weak check (low c), worse because feels safe; agent writes always-passing test, reports success. -> A, B reacts.
- H7 Irreversible actions: drop table, send email, git push force, delete unbacked file; r = 0 by definition; harness makes them rare (sandboxes, dry runs, version control, asking first) = raising r from outside. -> A.

## The Idea: learning long tasks (RL)

- L1 RL: agent tries tasks, gets reward (term: number saying how well, often 1 if tests pass 0 if not), algorithm makes rewarded actions more likely. -> A.
- L2 Three steps easy to credit; sixty steps one pass/fail: step 12 or 47 or both? Credit assignment term; core difficulty of long-horizon RL. -> A.
- L3 Credit picture: row of steps, one reward 0 at end, blame spread to every step; 39 fine steps pushed down with the bad one; works on average over many runs but signal per run noisier with length; "something in here was bad". -> A describes.
- L4 Why length hurts: reward is one number, verdict on whole trajectory, each step's contribution buried under randomness of others. -> A, B voices wrong model "so it just learns slower, linearly?" or "it'll eventually figure out step 12".
- L5 REINFORCE, PPO, GRPO differ in noise reduction (PPO learned value estimate, GRPO compares a group of attempts at the same task), none knows which step was the bug. -> A, briefly re-explaining.
- L6 Levers: denser feedback (intermediate rewards, partway tests), shorter effective horizons (decomposition), many more samples. -> A.

## Benchmarks

- B1 SWE-bench (Jimenez et al. 2023, ICLR 2024): 2,294 real GitHub issues from 12 Python repos; patch must pass hidden tests from real fix; Verified (2024) 500-task human-checked subset, most quoted; tens of tool calls. -> A.
- B2 METR suites HCAST, RE-Bench, seconds to hours. -> A, one line.
- B3 tau-bench (Yao et al. 2024, Sierra): simulated user, tools, airline and retail; pass^k = chance all k independent attempts succeed; reliability across runs, same p^n math. -> A.
- B4 Numbers move fast, depend on scaffold; check leaderboard. -> A, one line.

## Build It

- BI1 Three things: task suite with length knob, small harness running a real model, analysis script fitting curves; then add verifier and see if curve moves as the sliders said. -> A overview.
- BI2 Task: dependency chain of config files; toy with migration shape; read, compute from earlier, write; early mistake poisons rest. -> A.
- BI3 Folder of n small Python files; first has known value; each other has a rule comment: e.g. file seven's value = file six's value times three plus length of the name in file four, mod a thousand; name pelican; value placeholder; rules reference a few back -> state tracking. -> A says the rule in words.
- BI4 Setup: folder in workbench, venv, anthropic numpy scipy matplotlib, API key never committed. -> one sentence.
- BI5 Use a small cheap model; want mistakes at 20-40 steps; frontier may need harder rules (more back-refs, string ops). -> A.
- BI6 Budget: ~two calls per step, each resends whole conversation; ~150 tokens added per call; cost grows with square: ~15k tokens at 5 steps, ~540k at 40; sweep 5/10/20/40 x10 ~8M input tokens; verify roughly doubles; multiply by price; prompt caching helps; hard token cap. -> A, B asks why square; A explains resending.
- BI7 Generator and grader: seeded reproducible; ref points 2-5 back about half the time; unit-test grader on a hand-made wrong answer. -> A.
- BI8 Global correctness: is the value the true one; mistake at 12 makes 12-39 wrong even if later computation perfect. -> A.
- BI9 Local correctness: given what agent wrote earlier, did it compute this one right; fraction locally correct = measured per-step reliability p-hat; the number everything hangs on. -> A, B connects.
- BI10 Harness loop: send conversation and tools, run tool, append, repeat until done / max steps / token cap; tools list files, read, write, done; restrict paths to the folder; log each call to a trace file; model behind small interface so it's swappable; follow SDK tool-use docs. -> A.
- BI11 Fake agent first, before spending a cent: walks files, writes correct with probability p else wrong; 200 episodes at 0.95 per length; p-hat near 0.95? success tracks 0.95^n? If pipeline can't recover a planted number it won't recover an unplanted one. -> A, emphasised.
- BI12 Real sweep: lengths 5,10,20,40, 10 tasks each, plain prompt, no checking hints; save per episode n, seed, success, local/global lists, steps, tokens, stop reason; count recoveries = first write locally wrong, final locally right. -> A.
- BI13 Agent review for unfairness: difficulty varies with length, max steps too tight at 40, token cap cutting long runs (record separately), API retries silently changing trajectory. -> A.
- BI14 Fit: one q by maximum likelihood on end-to-end success; METR-style logistic in log2 n with 50% length; compare four numbers: p-hat, q-hat, p-hat^n prediction, r-hat (recoveries / wrong first writes) and recovery-aware prediction; the question: can you predict long-task success from short-task step reliability; plot with error bars. -> A in words, no formulas.
- BI15 Verifier: check tool reports which written files break their rule given earlier written values (local errors); catch_rate param reports each broken file with that probability; prompt "check after every few files and fix"; rerun with catch 1.0, then 0.5 at 20 and 40; measure success, steps, tokens; predict first with the sliders. -> A.
- BI16 Done when: fake agent p-hat within about 0.01 of 0.95 over 200 episodes and success tracks; real results 4 lengths x 10, with and without verifier, plot; say with a number how well p-hat^n predicted and whether recovery explains gap; say what verifier cost and bought. -> A folds into close of Build It.

## Measure

- ME1 Fill from trace files, not memory; per length: runs, succeeded, success with error, p-hat, prediction, recoveries, mean steps, tokens; fits table; verifier table. -> A, one line.
- ME2 Error bars: standard error term (how much average would jump if repeated; for rate p over N runs ~ square root of p(1-p)/N); 10 runs near 50% -> ~0.16, so "50%" means 20 to 80; don't read into a 10-point difference. -> A worked in words; B asks.
- ME3 Fake agent sim: true 0.95, 10 runs per length, fitted q-hat ranged 0.931 to 0.965 (90% of the time) = 50% length 10 to 19.5 steps; 30 runs: 0.940 to 0.960. -> A, "when I simulated".
- ME4 Why p-hat useful: forty-step task gives forty step measurements, one success measurement. -> A, B's lightbulb.
- ME5 Shapes not values: p-hat same at every length if independent; falls with n -> state tracking/context, p^n optimistic at long lengths. -> A.
- ME6 q-hat higher than p-hat -> recovering; r-hat should explain most of the gap; if not, look for missed recoveries (rewrite after re-reading an earlier file). -> A.
- ME7 q-hat lower than p-hat -> something kills runs that isn't a wrong value: token cap, max steps, done early, skipping a file; often the main long-horizon failure in practice; count separately. -> A.
- ME8 Perfect verifier: success at 40 up a lot, steps and tokens up; 0.5 only part of the gain; if perfect barely helps, check whether model called check, models skip optional tools. -> A.
- ME9 Logistic vs q^n look similar 5-40, differ in tail; a few runs at 80 steps would tell them apart. -> A.

## Break It

- BK1 Silent mistakes: strip rule comment after first write; recovery toward zero; success falls toward p-hat^n; detectability point. -> "what if" exchange.
- BK2 Starve context: keep last 6 tool results; back-refs five back need re-read; p-hat falls for back-ref steps, more at higher n; bridge to managing context; breaks independence as expected. -> exchange.
- BK3 Irreversible action: delete_file tool + rule "if even, delete m03"; wrong delete can't finish; count; add backup and undo tool, r for that step jumps; safe harness = turning r zero steps into r above zero. -> exchange.
- BK4 Game own verifier: check reports only last file; pass every check while building on earlier wrong value; success can drop below no-verifier if model trusts check and stops re-reading; weak trusted verifier worse than none. -> exchange.

## Explain It Back (content must appear)

- E1 Long-horizon definition; essay = lots of tokens but one decision one grade; can still compound but state tracking, delayed feedback, credit assignment much weaker; sixty-call refactor graded at end is long-horizon. -> covered by I3/I4, plus the "can still fail in compounding ways" nuance.
- E2 99% -> 37%; 69 steps; inverse scaling; 10x for 99.9; recovery interchangeable; worse if per-step decays. -> covered by C2-C4, R5, H2.
- E3 METR summary and caveats; Ord doubling = halving per-minute failure. -> M3-M10.
- E4 Tests after every edit: helps when catch rate high and fixable; fatal rate drops from one-minus-q to roughly that to the power of attempts plus misses; barely helps when weak, success bounded by miss rate; costs steps, tokens, wall time, more if suite slow; rare checks cheap but big redo; improve verifier before frequency. -> V5, V6, V8; the "slow test suite / wall time" point added.
- E5 RL harder: noisy gradient, more samples; rewards rarer: if long-task success near 0, nearly every trajectory reward 0, little to learn; helps: denser feedback, partial credit that can't be gamed, curricula short to long, decomposition, value estimates / group baselines, good verifiers. -> L4-L6 plus the rare-reward point and curricula.

## Go Deeper / Connections

- G1 Best sources: METR paper (read methodology and limitations), Ord's half-life paper. -> one closing line from A, before the ending.
- G2 Connections: managing context, RL environments, rewards and verifiers, GRPO, agent harness (sandboxes, undo, checkpoints raise r from outside); statistics for evals for why 10 runs can't separate 40 from 60. -> one sentence.

## Flow

Problem scene -> B's "it got tired" model -> Code RL framing -> ALVINN story -> horizon defined (B's
tokens model) -> compounding with B's linear guess -> table landmarks, hazard and half-life -> 24 runs
grid -> B's contradiction (agents do finish) -> recovery, Predict -> verification, Predict, sliders ->
METR (B's "works for 50 minutes") -> Ord -> six hard things -> RL credit assignment -> benchmarks ->
Build It -> Measure -> Break It -> connections + sources -> B restates, A sharpens.
