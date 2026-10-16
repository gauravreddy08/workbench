# Outline: design-docs

Source: src/lessons/design-docs.mdx. Curriculum entry: "Writing a design doc." Question: how do
engineers decide on a design before building it, in writing? Why: listed in research engineer roles;
writing forces the thinking that code lets you skip. Build: a fault-tolerance design doc for a
training job that must survive node failures.

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereqs: distributed training (all-reduce needs every GPU; where the 1.1 TB state comes from) and back-of-envelope (turn vague into arithmetic). -> A re-explains all-reduce in one breath when it first matters (R1); back-of-envelope named at Requirements.
- T2 Time: an evening for reading and simulator, an evening for the doc, a week of calendar for review. -> A, one line at the top of Build It.

## The Problem

- P1 Scene 1: job posting at an AI lab, "writing a design doc for fault-tolerant strategies"; writing, not implementing; decide in writing what happens when a machine dies halfway through a two-month run on a thousand GPUs; others read and argue. -> A opens on this.
- P2 Scene 2: startup, no roadmap, "ranker needs to be faster", "we need evals"; you build it your way; it works; voice says "my way is probably not the best, and I'd never know". -> B voices this as their own worry (it's Gaurav's).
- P3 Nobody reviewed the approach, only the code; by then too expensive to change; reviewer says rename a variable, not "the cache layer was the wrong idea". -> A.
- P4 Same problem: expensive decisions happen before code; only cheap place to find out you're wrong is on paper. -> A ties the two scenes.
- P5 Doc forces what code doesn't: you can write checkpointing without asking how often the job fails; you can't write Requirements without a number. -> A.
- P6 Lesson does two things: the document, and the content of the posting's doc (fault tolerance) well enough to write it for real. -> A signpost, one sentence.

## Origin: RFCs

- O1 1969, ARPANET built by a handful of grad students at four universities, nobody in charge; nervous about sounding like giving orders to the senior people they assumed would take over. -> A story.
- O2 Steve Crocker, UCLA grad student, first notes April 1969, "Request for Comments" = proposals open to argument, not decrees; RFC 1 described host software. -> A.
- O3 Every internet protocol since (TCP, HTTP) settled the same way: write a proposal, argue in writing, doc gets better, then build. -> A.
- O4 Startup worry is the RFC situation exactly: no authority, no roadmap, need best design anyway; Google, Amazon, Rust, Python kept the habit: design docs, six-pagers, RFCs, PEPs. -> B makes the link, A confirms with names.

## The Idea: what a design doc is for

- D1 Term design doc: short doc before building something non-trivial: problem, constraints, chosen approach, alternatives and why they lost; read and argued over before work starts. -> A, plain definition.
- D2 Three jobs, different; doing only one is weaker. -> A.
- D3 Thinking: writing = slower, more honest thinking; "we'll checkpoint regularly" must become "every ___ minutes because ___"; you discover you don't know failure rate, checkpoint size, storage bandwidth. Code lets you skip: "save every thousand steps" runs fine, hides the guess. -> A; code line said in words.
- D4 Agreement: infra person whose storage you'll hammer, researcher whose run you'll pause, manager paying for GPUs; object while cheap; code review too late for "right approach?". -> A.
- D5 Record: six months later "why every 8 minutes and keep 20 copies?"; without doc "ask Gaurav" and you've forgotten; with doc, redo the decision when numbers change instead of cargo-culting. -> A.
- D6 Common failure: doc doing only job 3, written after code; that's documentation; can't change anything; value comes from writing while decision is open. -> B voices the wrong model ("isn't a design doc the writeup after?"), A corrects.
- D7 When worth it: cost of being wrong. Term one-way doors (expensive/impossible to reverse: storage format others depend on, public API, checkpoint layout of a run 3 weeks in) vs two-way doors; Bezos. Rename function = two-way; how a two-month run survives failures = one-way; can't get GPU-hours back. -> A.
- D8 Rule: more than a week to build, touches someone else's system, or painful to undo -> doc first. -> A.

## The Idea: shape of a design doc

- S1 No official format; good docs converge; each part answers one reader question. -> A.
- F1 Figure 001: stack: Summary (5 lines, whole decision: what are you proposing, what do you need from me), Context (why now, what hurts, with a number), Goals/Non-goals (what's done, what we're not doing), Requirements (which numbers must it hit), Proposed design (diagram + key numbers; how it works, why it hits the numbers), Alternatives (what else, what it costs), Failure modes (how it breaks), Rollout/testing (how do we know before betting), Open questions (what don't you know, who might). Brackets: everyone reads the top, deciders the top half, reviewers all; top carries the decision alone. -> A walks it as reader questions, not a list read out; B reacts to "most people read only the top".
- S2 Non-goals: most underrated; what you're deliberately not solving so reviewers don't ask; "surviving loss of the whole storage cluster" saves a page of argument, says risk considered and accepted, not forgotten. -> A.
- S3 Requirements have numbers or aren't: "fast recovery" is a wish; "recover from single-node failure under 5 minutes, at least 95% goodput over the run" can be checked and compared; back-of-envelope pays off. -> A; B offers the vague version.
- S4 Alternatives earn trust: strawman ("we could not do this") means you didn't look; two or three serious options, honestly; best comment often "alternative B is better than you think", only possible if B is on the page. -> A.
- S5 Failure modes: how the design itself breaks; recursive for fault tolerance: what if checkpointing fails? -> A.
- S6 Open questions: permission not to know; "can storage absorb 1.1 TB every 10 minutes? storage team?" better than pretending; turns reviewers into collaborators. -> A.
- S7 Signpost: now write the posting's doc content, starting with how often things break. -> A.

## The Idea: requirements start with a failure rate

- R1 One server is reliable, months without a problem; but 1,000 GPUs isn't 1,000 independent jobs; data parallelism: every step ends in an all-reduce needing every GPU, so one dead GPU stops all; job is a chain. -> B's wrong model: "each server's reliable so the job is"; A corrects and re-explains all-reduce.
- R2 Term MTBF: mean time between failures; average; 260 days means once every 260 days on average, any particular one can come sooner or later. -> A.
- R3 Key fact: independent failures, each machine every N days, job needing all K machines fails every N/K days; K machines produce K times as many failures per day. -> A in words with example.
- PR1 Predict: 8-GPU server fails ~once every 260 days; 128 servers (1,024 GPUs)? 2,048 servers (16,384)? Answer: about 2 days; about 0.13 days = about 3 hours. One server feels immortal; thousands fail several times a day. -> A asks, B tries, gets the first, A gives the second.
- R4 Where 260 comes from: Llama 3: 54 days on 16,384 H100s (2,048 servers of 8), 466 interruptions: 47 planned, 419 unexpected; ~78% of unexpected confirmed/suspected hardware, GPUs and their memory the biggest category; 419/54 ≈ 7.8 a day, one every ~3 hours; divided across 2,048 servers ≈ one per server per 260 days. -> A.
- R5 Caveats: interruption ≠ server died (software bugs, network, storage), fine, it's what matters for the job; mature cluster; new cluster in burn-in or smaller team's stack can be several times worse; Kokolis et al. 2024 on variation. -> A; B asks "is that number even fair to use?"
- F2 Figure 002: log-scale bars: 1 server ~260 days, 16 servers ~16 days, 128 servers ~2 days, 2,048 servers ~3 hours (Llama 3 scale); sixteen times the servers, one sixteenth the time. -> A says the ladder of four numbers.
- R6 Our doc: 1,024 GPUs, Llama 3 rate gives ~50 h; plan for 12 h, say so: "~4x worse to cover burn-in and our less mature stack; still meet goals at 6 h, better at 50 h"; range with a reason beats single number with false precision; reviewers argue with the reason. -> A.
- R7 Term memoryless: chance of failing next minute doesn't depend on time since last; exponential distribution; standard starting assumption; real failures cluster (bad batch of nodes, flaky switch takes out a rack); doc names it as a known weakness. -> A.

## The Idea: goodput

- F3 Figure 003: one failure slowed down: train, checkpoint, train more, die; everything since last checkpoint thrown away; then restart: detect, replace, reload, warm up; only plain training stretches count. -> A narrates as a scene.
- G1 Four buckets of wall-clock time: kept work; checkpointing (if blocking); lost work (failure arrives on average halfway, loses about half an interval; tau = checkpoint interval); restarting R. -> A; B asks why "halfway".
- G2 Term goodput: fraction of wall-clock on work you kept; throughput counts every step, goodput only those that survived; 100% throughput can be 80% goodput. -> A.
- G3 Converts to money/time: 1,024 H100s × 30 days ≈ 737,000 GPU-hours; 1% ≈ 7,400 GPU-hours; at roughly $2-3 per GPU-hour ≈ $20,000 per point per month, or ~7 hours calendar delay. -> A; B "that gets attention".

## The Idea: how often to checkpoint

- C1 Tension: often = waste saving; rarely = lose a lot per failure; best interval in between. -> B's wrong model: "just checkpoint as often as possible to be safe"; A corrects.
- C2 Insurance: checkpoint is a premium (C minutes not training); insuring against lost work; premiums constantly = safe but broke; never = one bad day costs everything; right premium depends on C and M. -> A.
- C3 Arithmetic: checkpoint cost per minute = C every tau minutes; lost work per minute = one failure per M minutes, each losing half an interval; one falls with tau, other rises; minimum where equal; restarts R/M unaffected by tau. -> A in words, worked example.
- C4 Result: best interval = square root of (2 × C × M). Term Young/Daly formula: Young 1974, Daly 2006 refined (roughly subtract C, plus small corrections), matters only when checkpoints are expensive vs MTBF. At optimum the two wastes are equal; total about square root of (2C/M) plus R/M. -> A, said as "double, multiply, square root" with numbers.
- O5 Origin 1974: checkpointing older than deep learning; 1970s mainframe jobs; John Young at IBM, two-page note in Communications of the ACM, first-order answer; 2006 John Daly at Los Alamos supercomputers, failures every few hours routine, higher-order version accurate when checkpoints expensive; GPU clusters inherited formula and problem from supercomputing. -> A, short story.
- PR2 Predict: MTBF 12 h (720 min), blocking 1.1 TB checkpoint ~1 min; best interval? Every 3 h instead? R = 30 min. Answer: root of 1,440 ≈ 38 min; waste ≈ 5.3% + 4.2% restarts → ~91%; 3 h: checkpoint 0.6%, lost 12.5%, restarts 4.2% → ~84%; exact 91.0% and 83.9%; seven points of a 1,024-GPU month ≈ 50,000 GPU-hours from one constant chosen by feel. -> A asks; B guesses "every three hours felt safe"/ wrong; A walks it.
- F4 Figure 004 interactive: top strip 72 h of a simulated run with random failures; bar of where a simulated year goes; curve of expected goodput vs interval, with the formula line dashed and your choice a dot; sliders for interval, checkpoint cost, MTBF, restart; button snaps to formula; starts at 3 h. Slide toward the line: hatched lost area shrinks, checkpoint ticks thicken; cutting C or R lifts the whole curve, which choosing tau never can. -> A describes what you see dragging.
- C5 Four things: (1) flat top: at C=1, M=12 h, R=15: 92.9% optimum, 91.8% at half, 91.6% at double; don't agonize, be in range, way off hurts. (2) square root: 100x cheaper checkpoints → only 10x shorter interval; 4x more failures → 2x as often. (3) restart untouched by tau: if restarts are a big slice, no interval fixes it; next dollar goes to restarts. (4) cheaper checkpoints help twice: smaller premium and more frequent, shrinking lost work. -> A, conversational, B reacts to flatness.

## The Idea: making checkpoints cheap

- K1 Term checkpoint: everything to resume exactly: weights, optimizer state, step count, data loader position, random number generator states; 70B with Adam in mixed precision ≈ 16 bytes/param ≈ 1.1 TB. -> A; B asks why 16 bytes, A says briefly (lesson only states it; keep to "about sixteen bytes per parameter").
- K2 Term sharded checkpoint: one process gathering 1.1 TB = enormous C; every GPU writes its own slice in parallel plus small index; torch distributed checkpoint; good one reloads onto a different GPU count. 1,024 GPUs each ~1.1 GB; bottleneck = storage aggregate bandwidth; say 20 GB/s (plausible for modest cluster, measure: most important unknown) → ~55 s; that's where C ≈ 1 min came from. -> A.
- K3 Term async checkpoint: training only needs to wait while state is copied somewhere safe from next step's updates; GPU→host CPU memory over PCIe well under a second (Gen5 x16 spec ~64 GB/s each way; real copies a good fraction); background thread writes to storage while training continues; blocking C from ~1 min to a few seconds. -> B wrong model: "async means training never stops at all"; A: the snapshot still blocks, briefly.
- K4 Plug in: C = 3 s → best interval ≈ 8.5 min; checkpoint + lost waste ~5% → ~1.2%. -> A.
- K5 Async catches (for Failure modes): background write must finish before next snapshot, else pile up: 55 s inside 8.5 min fine, at 1-min interval not; failure during write → that checkpoint never landed, fall back, lose up to two intervals; simulator models this. Storage traffic: 1.1 TB every 8.5 min ≈ steady 2 GB/s all day; storage owner must agree; exactly what a doc is for. -> A; B "two intervals?" A explains.
- K6 Term in-memory checkpoint: restarts slow too: all 1,024 GPUs read 1.1 TB at once; keep latest snapshot in own RAM and copy to one or two other nodes; single node dies: replacement pulls shard from peer's RAM over 400 Gb/s link in well under a minute; others reload from own RAM; storage only if several nodes holding the same shard die together. Gemini 1.0 report: redundant in-memory copies raised goodput on its largest run from 85% to 97% (their numbers). -> A.
- F5 Figure 005 tiers: GPU memory (live, survives nothing); host RAM same node (async snapshot over PCIe, tens of GB/s, well under a second per GPU; survives process crash, bad step, NCCL hang); peer node's RAM (network ~50 GB/s per node, seconds; survives one node dying, not its peer too); shared storage (sharded, ~10s-100s GB/s total, ~1 min for 1.1 TB; survives many nodes, whole job, next week). Slower but safer going down; write fast tiers often, slow tier less; restore from fastest that survived; rough orders of magnitude, measure. -> A as a ladder of four places.

## The Idea: making restarts fast

- RS1 30-min restart = 30/720 ≈ 4% by itself, more than everything else once checkpoints are async; four steps in a row, each with a fix. -> A signpost.
- RS2 Detect: can be the biggest piece; one GPU dies mid all-reduce, others don't error, they wait. Term NCCL (NVIDIA's library for all-reduce etc. between GPUs; PyTorch uses it). Collective timeout default in minutes (10 in recent versions; check); dead node = ten minutes of 1,023 GPUs staring. Fix: Term heartbeat (I'm alive every few seconds; miss a few = presumed dead) plus much shorter collective timeout → tens of seconds. ByteDance MegaScale describes this. -> B wrong model: "surely it crashes with an error immediately"; A corrects.
- RS3 Replace: scheduler for a new node: minutes, hours if full. Term hot spare: booted node idle and ready; pay while it waits; seconds instead of queue. 128-node job, 2-4 spares cost 1.5-3% of hardware; worth it? perfect Alternatives row: compare cost to goodput via simulator. -> A.
- RS4 Reload: storage ~1 min at 20 GB/s if parallel (often slower, everyone hits storage at once); in-memory: seconds. -> A.
- RS5 Warm up: re-create process group (NCCL setup across 1,024 GPUs not instant), rebuild compiled kernels, fast-forward data loader; minutes unless cache compiled artifacts and seekable data loader. -> A.
- RS6 Term elastic training: don't replace; survivors regroup at smaller size (grow back later), continue with one fewer data-parallel replica. torchrun; Term rendezvous: meeting point where workers find each other and agree who's rank 0, 1, 2; on death torchrun restarts the group, survivors meet, resume from latest checkpoint; range of node counts. -> A.
- RS7 Catch: fewer replicas → global batch shrinks (changes training dynamics mid-run) or more Term gradient accumulation (several small batches, add gradients, one step; same effective batch, slower). Tensor/pipeline-parallel groups can't lose one member; whole group of 8 or 16 goes. Natural for data-parallel, awkward for others. -> B "sounds strictly better", A gives catch.

## The Idea: failures that don't crash

- Q1 Loud vs quiet failures; quiet ones scarier. -> A signpost.
- Q2 Term silent data corruption: chip computes wrong answer, no error; bit flip in a multiply, defect at certain temperatures; rare per chip, regular at thousands for months; Meta and Google 2021 studies (CPU fleets). Corrupted gradient on one GPU averaged into everyone's update at all-reduce; model wrong everywhere; every later checkpoint carries it. Gemini: recurring at its scale, replay steps deterministically to find the faulty machine. -> A; B "but the checkpoints protect you", A no.
- Q3 Loss spikes and NaNs: visible symptom of corruption or instability; policy: monitor loss and gradient norm every step, alert beyond threshold, on a bad one roll back before the spike and skip/reorder batches. PaLM: restart ~100 steps before the spike, skip a few hundred batches. OPT-175B logbook: dozens of restarts. -> A.
- Q4 Term straggler: one GPU 20% slow (thermal throttling, bad cable renegotiated lower) doesn't fail, makes all 1,024 wait every all-reduce; synchronous = speed of slowest; shows only with per-rank step times; policy: detect, treat as failure, swap in spare. -> A.
- Q5 Retention: only latest → corruption unnoticed two hours already overwrote every good copy; ladder: last few in-memory, last several on storage, one per few hours kept for days; storage cheap vs rerunning a week. -> A.

## The Idea: writing it so people read it

- W1 Content useless if nobody reads past the first paragraph; deciders decide from the top. -> A.
- W2 Summary decides: five lines, written last, stand alone: proposal, one number, cost, what you need. Example: async sharded every ~10 min, in-memory peer copies, heartbeat detection, 2 hot spares, 1,024 GPUs, 30 days; simulated goodput at pessimistic 12 h: ~98% vs ~84% default (blocking every 3 h, 30-min restarts) ≈ 100,000 GPU-hours saved; cost 2 idle spares (1.6% of hardware) and ~2 GB/s writes; need infra to confirm storage; decision by Friday. Test: reader who stops can say yes or no. -> A says the summary as a person would say it, not read.
- W3 Numbers over adjectives: "will be fast" vs "pauses about 3 s per checkpoint"; every adjective is skipped arithmetic; replace fast/large/rarely/significant with number+unit or "unknown, see open question 2". -> A; B tries an adjective version.
- W4 Diagrams: one picture: GPU nodes, in-memory tier, storage, monitor; arrows for what flows; draw the failure path when node 37 dies; can't draw it = design isn't finished. -> A.
- W5 Short: 2-3 pages plus appendix; Amazon six-pager caps for a reason: length is easy, choosing is the work. -> A.
- W6 Alternatives table (described, not read): blocking every 3 h ~84%, loses ~119k GPU-h/month; blocking at formula 38 min ~91%, one config change, restarts now dominate; + async 3 s, 8.5 min ~95%, needs storage sign-off; + heartbeat R ≈ 10 min ~97.5%, cheap large win; + in-memory peers + spares R ≈ 3 min ~98.4%, the proposal; elastic instead of spares: similar, rejected because changes dynamics, revisit at 10x. -> A as a ladder of steps, numbers said for each step.
- W7 What the table does: first cheapest step gets half the gain so even rejecting all else they get that; expensive steps justify themselves in GPU-hours; elastic considered with a reason, no one asks. -> A.

## The Idea: reviews and feedback

- V1 Send to two or three chosen for knowledge not rank: storage person, someone who's babysat a big run, a skeptic; say what you want attacked ("planning MTBF and 2 GB/s"); vague "thoughts?" gets vague thoughts. -> A.
- V2 Sort comments: fact wrong → fix and recompute (best kind); missing requirement (restart from any checkpoint last week) → add, check design still meets it; "I'd do it differently" → new alternative in the table with numbers: wins (the point) or table shows why it loses; "I prefer" = taste: accept if cheap, decline politely. -> A; B asks what to do with "I'd do it differently" since that's the scary one.
- V3 Two habits: change the doc, not just the thread (doc is the record); separate comment from ego: a comment that kills your proposal and replaces it with a better one is the doc succeeding at the cheapest moment; answer to "my way might not be best": put it next to alternatives and invite people to beat it. -> A, closing the startup thread from P2.
- V4 End with recorded decision: "Decided Oct 20 2026: option 5; revisit if MTBF first week worse than 6 h." -> A.

## The Idea: RFCs and ADRs

- L1 Term RFC (modern team sense): design doc with a process: where posted, how long comments open, who decides; Rust RFCs, Python PEPs; use when many people care and you need a fair way to settle. -> A.
- L2 Term ADR: architecture decision record; one decision, half a page, in the repo, numbered, never deleted, only superseded; Nygard 2011 five parts: title, status, context, decision, consequences; example "ADR 7: checkpoint every 10 min, async, keep last 20; context MTBF ~12 h, C ≈ 3 s; consequences ~2 GB/s writes, revisit if storage changes"; doesn't argue alternatives; why outlives the person. -> A.
- L3 Progression: ADR for reversible-but-remember; design doc for one-way door; RFC when affects many and needs process; small startup: design doc reviewed by two people + folder of ADRs covers almost everything. -> A.

## Build It

- B0 Setup: folder, plain Python, no packages, matplotlib optional; theory checker given in full: exact expected goodput for memoryless failures including failures during checkpoints and restarts (Daly line of work); Young and Daly functions; first line should say Young ≈ 37.9, Daly ≈ 36.9, goodput ≈ 0.9287. -> A, setup in a couple of sentences, the check numbers said.
- B1 Simulator (his to write): discrete-event sim of one long job, run until a given amount of work is safely checkpointed; returns wall, goodput, failures, fractions in kept/ckpt/lost/restart. Hints: one loop iteration = one interval; if next failure after checkpoint ends, bank work; failure before checkpoint finishes loses everything since last finished checkpoint, including half-done save; restart can be hit by another failure, restart starts over (small inner loop); memoryless means draw a fresh random failure time after each failure (Break It takes it away); four buckets must add to wall, assert it. Sanity: no failures → interval/(interval + C); C=0 and R=0 → fraction not lost. -> A as "here's what you'd build; the part that matters".
- B2 Sweep: ~100 intervals log-spaced 0.5 to 1,000 minutes, at least 100,000 minutes of work, 4+ seeds, average; print best next to Young, Daly, theory; plot goodput vs interval log x with sim points on theory curve for C=1, R=15, M=720; recognise figure 004's curve; empirical best jumps 10-20% between runs; looks like a bug, isn't (Measure). -> A.
- B3 Extend: snapshot cost, persist time (failure before persist means that checkpoint didn't land: previous one), restart = detect + replace + reload + warmup; with some probability the shard is in a peer's RAM, reload faster. Ladder at M = 720: (1) blocking 1 min every 180, R = 30 (detect 10, replace 12, reload 3, warm-up 5); (2) same at best interval; (3) async snapshot 3 s, persist 1 min; (4) heartbeat detect 0.5 min; (5) spares and peers: replace 0.5, reload from peer 0.2. Rerun at M = 360 and 3,000. Restart pieces are planning guesses; label so; "measure real restart time on day 1" under rollout. -> A.
- B4 The doc: 2-3 pages, 70B, 30 days, 1,024 H100s, 128 nodes; template sections: title/author/reviewers/status/last updated; summary (5 lines written last); context (cost per hour, what a lost day means); goals with blanks (goodput at planning MTBF; single-node resume within N min, no human); non-goals; requirements table (MTBF planning + range + source, checkpoint size, storage bandwidth, PCIe/network, restart pieces; each marked measured/spec sheet/guess); proposed design (diagram, tiers and intervals with the formula reasoning, detection, replacement, reload path, retention, SDC and loss-spike policy, failure path when node 37 dies); alternatives table at 6/12/50 h; failure modes (checkpoint write fails, storage slow, two peers die, corrupted checkpoint, monitor dies); rollout (fault injection: kill a node on purpose in a small run, restore drills, measure real C and R, what you watch week 1); open questions numbered with who might know; appendix (derivation, sim output). Rules: no adjective where a number could go, every number labelled, at least one diagram, summary decides alone. Agent review prompt: skeptical senior infra engineer, find the assumption that most changes the decision, missing failure modes, don't rewrite; then revise. -> A, said as the sections he'd write, not read as template.
- B5 Second doc for real job: open decision; ranker serving (batching, timeout and fallback when model slow, GPU node dies) or eval pipeline (trigger, storage and comparison, what makes a regression block a release); where you suspect your way isn't best; 1-2 pages, same skeleton, requirements table with real numbers (QPS, p99, cost, eval runtime), two real alternatives; send to one colleague with a specific ask; no agent: a human who knows the system; three lines at the bottom: what they said, what changed, what you decided. -> A, tied to B's startup worry.
- B6 Done when: sim within about half a point of theory for every Measure row; plot and can say why optimum jumps; ladder at three MTBFs used in alternatives table; doc 2-3 pages, standalone summary, diagram, non-goals, numbers labelled, revised after agent review; second doc read by colleague with what changed. -> A folds into Build It talk briefly.

## Measure

- M1 Measure rows (R = 15): 12 h, C = 1: Young 37.9, Daly 36.9, expected 92.9%; 3 h, C = 1: 19.0, 18.0, 82.6%; 50 h, C = 1: 77.5, 76.5, 97.0%; 12 h, async 3 s: 8.5, 8.4, 96.8%; 12 h, C = 3 min: 65.7, 62.7, 88.7%. -> A says the pattern and a few numbers, not row by row as a table; B asks for the 3-hour case.
- M2 Best tau lands near formula within wobble; author's run (4 seeds, 200,000 min): 37 min first row, 7.3 min async (Young 8.5); Daly visibly better only in last row (C large). -> A.
- M3 Wobble is the lesson: flat top, noise between seeds > difference between neighbours, winner mostly luck; goodput at your tau and Young's agree to a few tenths of a percent; compute, round to convenient, spend effort on C and R. -> B thinks it's a bug, A explains.
- M4 Cheaper checkpoints gain less than hoped: waste about root of (2C/M); 1 min → 3 s (20x) cuts by root 20 ≈ 4.5x, 5.3% → 1.2%. -> B's wrong model: "twenty times cheaper should be twenty times better"; A corrects.
- M5 Ladder at 12 h: 83.9% (~119,000 GPU-h lost of ~737k); 91.0% (~67,000); 94.8% (~38,000); 97.5% (~19,000); 98.4% (~12,000). Rows 1→2 = config change worth 52,000 GPU-hours; then restarts biggest, so detection beats cleverer checkpoint. Llama 3 >90% effective training time at 16,384 GPUs mostly automated recovery; Gemini 97%; those needed engineering not luck. -> A, as a walk down the ladder.

## Break It

- K-1 Forget to divide MTBF: per-server 260 days ≈ 374,000 min; formula → ~870 min ≈ 14.5 h; run at real 12 h job MTBF, R = 30: ~49% goodput; half the month gone from one wrong number; most common error; doc shows the arithmetic so a reviewer catches "per-node number" in five seconds. -> B makes this exact mistake aloud (Gaurav's numbers gap); A catches it.
- K-2 Clustering: after a failure 30% chance of another within 20 min (bad replacement, flaky switch); average MTBF barely moves, formula assumes no memory; does best interval move much? Hint: extra failures land mostly inside restarts; effect on goodput; doc: name memoryless assumption, say what you'd do about bursts (burn-in test before a replacement joins). -> A asks, B reasons it out; keep as reasoning not quiz.
- K-3 Overwrite only good checkpoint: silent corruption every ~7 days on average, noticed after delay D (30 min, then 6 h); roll back to before corruption; latest-only vs last 20 + one every 6 h; latest-only with D = 6 h: no clean checkpoint. Why retention and loss monitoring are in the design. -> A.
- K-4 Send without summary: to a friend or agent-as-busy-manager, "should we do this?"; count questions before they can answer, whether answered already but too far down; restore and retry; difference is what the summary is for. -> A, short.

## Explain It Back (substance must appear)

- E1 Three jobs; written after can only do record; expensive decisions before code; code review can't easily say approach wrong; at startup, put your way next to alternatives. -> Covered by D3-D6, V3; the ending restatement.
- E2 Derivation in words: C/tau and tau/2M; equal at optimum; Young 1974; Daly subtracts about C; 1 min and 12 h → ~38 min; flat within 2x ≈ a point; C and R matter more. -> Covered by C3-C5.
- E3 Scaling 1,024 → 10,240: 10x failures, MTBF ~12 h → ~72 min; interval shrinks only root 10 ≈ 3.2x; checkpoint+lost waste grows 3.2x; restart waste grows full 10x; blocking 1 min + 30 min restarts → ~55%; async 3 s + 3 min restarts → ~92%; design shifts to tiny R: peers, spares, heartbeat, maybe elastic; checkpoint traffic grows. -> Its own exchange after Measure, B asks "what about ten times bigger?" (a real listener question), A works it.
- E4 Goodput vs throughput vs failure count; captures checkpoint overhead, lost work, restart, stragglers; ~7,400 GPU-h per point; halving failures but doubling restart time can lower goodput, only goodput shows it. -> Covered at G2-G3 plus one line added there.
- E5 "Just checkpoint every 100 steps": ask minutes and cost; 4 s step → 100 steps ≈ 7 min; blocking 1-min save ≈ 13% saving, way past the formula; async 3 s → close to optimal, fine; number only right relative to C and M; put both in the table with sim numbers; if they were right, say so and change the doc. -> B plays the colleague in a short exchange near the end.

## Go Deeper / Connections

- G-1 Best reads: Malte Ubl "Design Docs at Google"; Llama 3 paper's infrastructure section. -> A, one sentence near the end.
- X1 Connections: files and disks lesson: crash mid-save corrupts; write to temp then rename; real checkpoints should use it. Tiny LM lesson: write a doc before starting. -> A, one or two sentences.

## Flow

Problem (job posting, then B's startup worry) -> RFC origin -> three jobs, B's "doc is the writeup after" -> one-way doors -> anatomy as reader questions -> non-goals, requirements, alternatives, failure modes, open questions -> failure rate (B: one server's reliable) -> predict MTBF -> Llama 3 -> planning MTBF and memoryless -> one failure slowed down, goodput, money -> how often (B: as often as possible) -> insurance -> words derivation -> Young/Daly origin -> predict 38 min vs 3 h -> the interactive -> four things -> making checkpoints cheap (B: async means never stops) -> tiers -> restarts (B: it would error) -> elastic -> quiet failures -> retention -> writing it: summary, numbers, diagram, short, alternatives ladder -> reviews -> ADR/RFC -> Build It -> Measure (wobble, root twenty) -> ladder -> ten times bigger -> Break It (B makes the per-server mistake) -> "every hundred steps" -> connections -> ending: B restates, A sharpens.
