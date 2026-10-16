# Outline: tail-latency

Source: src/lessons/tail-latency.mdx. Curriculum entry: "p99 and load testing." Question: why do
people care about p99, and how do you measure it without lying to yourself? Why: averages hide the
users who are suffering; most load tests measure it wrong.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: lesson 4 loadgen.py (semaphore caps in-flight requests) and Little's Law; baseline lesson (20 samples can't give a p99; naive Spark server only fast at 1% utilization). -> Re-explained briefly where each comes up (loadgen in closed loop, Little's Law in closed vs open, baseline in samples and in "why 50-70%"). Today bullets skipped as a list.

## The Problem

- P1 Scene: lesson-4 load generator, 16 workers, a few thousand requests; p50 83 ms, p99 136 ms; ship it. -> A opens on this, first line.
- P2 A week later: same rate, p99 over a second, every few minutes a cliff touching ten seconds; nothing changed. Which number was the lie? -> A, continuing.
- P3 Wrong model: B suspects production (different machines, traffic, a bug) rather than the test. -> B says it; A: the load test lied.
- P4 Why: workers waited politely before sending the next; real users don't; when server slowed, test slowed with it and stopped sending exactly the requests that would've been slow; measured a gentler world. -> A.
- P5 Three ideas: the load test lie; latency is a lopsided pile where rare bad requests decide how big systems feel; busy servers' bad requests explode at a point you can find on a chart. -> A, a spoken signpost, not a list.

## Origin

- O1 Early 2010s Google search touched hundreds or thousands of machines, each a slice of the index; answer waits for slowest slice; fast on average, product still slow. -> A, story.
- O2 Feb 2013, Jeff Dean and Luiz André Barroso, "The Tail at Scale", Communications of the ACM: can't get rid of rare slowness, design to tolerate it like machine failure; gave vocabulary (tail latency, hedged requests) and fan-out arithmetic. -> A.
- O3 Gil Tene, CTO of Azul Systems (low-pause Java virtual machines, tails were its business), talk "How NOT to Measure Latency": most load tools hid the tail, named coordinated omission, wrote HdrHistogram. -> A; B reacts to a company whose business was pauses.

## The Idea: A pile, not a number

- I1 Time a thousand requests: a thousand different numbers; sorted, a shape. -> A.
- F1 Figure 001 (illustrative): hard floor (the work), most just above it, thin tail far right; p50 14 ms in the hump, mean 26 ms dragged right, p99 142 ms, p99.9 190 ms out where almost nothing is. -> A describes like a sketch over the phone.
- I2 He got this right in the diagnostic: p99 is about the bad experiences. -> A, credit to B.
- I3 Term percentile: value below which that fraction falls; p99 = 120 ms means 99% took 120 or less, 1% longer. -> A, plain words first.
- I4 Term median = p50, middle once sorted; p99 99% of the way along; p99.9 is 999 of 1,000. -> A.
- I5 At 100 req/s p99 happens every second; a user whose 10 page views make 300 requests meets it about three times. -> A, number that lands.
- I6 Mean describes nobody: 99 at 10 ms + one at 10 s → mean about 110 ms; 11x worse than 99% saw, 90x better than the unlucky one; tug of war between hump and tail. -> B guesses the mean is "about right", A does the arithmetic in words.
- I7 Rule: can't average percentiles: A p99 50 ms, B 500 ms, combined isn't 275; depends on counts and shape; average of sixty per-second p99s isn't the minute's p99, can be wrong either way; need counts (HDR later). -> B proposes 275 ms out loud, A corrects.
- I8 Rule: report p99 next to n; 20 samples → p99 is your slowest request. -> A, with callback to baseline lesson.

## The Idea: Why the pile is lopsided

- I9 Left edge a wall (can't be faster than work); right edge open, many ways to be slower, only add time. -> A.
- I10 Waiting in line (gets own section). -> A.
- I11 Term garbage collector: runtime part that frees unused memory; some stop all threads; stop-the-world 50 ms. -> A.
- I12 Machine doing something else: backup, cron job, another container stealing CPU (noisy neighbour). -> A.
- I13 Cold caches: after deploy or eviction, disk instead of RAM, up to 1,000x (latency-numbers lesson). -> A, re-explained.
- I14 Network: lost packet, TCP waits before resending; on Linux floor about 200 ms, more than most whole requests. -> A; B surprised.
- I15 Locks: two requests want same row or mutex, one waits. -> A.
- I16 Each rare, adds a lot; stack on a floor → Figure 001; what latency looks like on every computer ever measured. -> A.

## The Idea: Fan-out

- I17 Most requests aren't one call: search to many index shards; RAG querying several vector-store shards and a reranker; agent step calling three tools in parallel. -> A, tied to his work.
- I18 Term shards: slices of a big dataset each on a different server; query needing all data asks every shard. -> A inline.
- I19 Term fan-out: one request triggers many outgoing, all must come back; user sees worst of N draws. -> A.
- PR1 Predict: 100 backends, each slow 1% of time; fraction of page loads hitting at least one slow? Answer about 63%: 0.99 to the hundredth ≈ 0.366, everything else ≈ 63%; Tail at Scale example: 10 ms typical, 1 s p99, 100 servers → 63% over a second. -> A asks, B guesses low (a few percent), A walks the reasoning in words.
- F2 Figure 002 calculator: slider for backends (1 to 5,000), buttons for slow = past p90/p99/p99.9; a grid of 100 squares filling in; curve; second readout = median user sees backends' p-what. -> A describes dragging the slider.
- I20 Median user: what latency do all N beat half the time? each beats with prob q, all N with q to the N; set to one half; N=100 → 0.9931 → p99.3. Backend tail becomes product median. -> A, worked in words; B restates.
- I21 Backend team saying "our p99 is fine, only 1%" watches the wrong number. -> A.
- I22 Paper: one Google service, root waiting on 100 leaves, slowest 5% of leaf requests ≈ half of root's p99. -> A.
- I23 Caveat: formula assumes independence; shared causes (one overloaded switch) break it, but fan-out still amplifies. -> B raises the independence objection; A concedes.

## The Idea: Queues

- I24 Biggest single source of tail: waiting in line. Barista: 1-minute drinks; one every 10 min → never wait; one every 1.1 min → keeps up on average, but arrivals bunch; some wait 10 minutes for a 1-minute drink. -> A, short, exact comparison then straight to GPU queue.
- O4 Origin: Agner Krarup Erlang, Copenhagen Telephone Company, how many lines so callers rarely get busy signal without idle lines; 1909 first paper of queueing theory, calls as random arrivals; now sizes call centers, CPU schedulers, request queue in front of your GPU. -> A, story.
- I25 Term arrival rate (lambda): requests per second on average. -> A, Greek letter named once, not read as symbol.
- I26 Term service time S, service rate mu = 1/S, max requests/s ever. -> A, example: 10 ms → at most 100 a second.
- I27 Term utilization rho = arrival rate × service time; fraction of time busy; 0.9 = busy 90%; must stay below 1 or line grows forever. -> A.
- I28 Term M/M/1: Kendall's notation; random (Poisson) arrivals, exponential service, one server; hello world of queueing theory. -> A; "M M one" spoken.
- I29 Result 1: average time in system = S / (1 − rho). -> A in words: service time divided by the idle fraction; worked: 90% busy → divide by a tenth → 10x.
- I30 Term exponential distribution: waiting for a random event equally likely every moment; many short, few long; p99 is 4.6 × mean; p50 0.69 × mean. -> A.
- I31 Table (S = 10 ms; checked by simulating 400,000 requests, within a few percent): 50% → 20/14/92 ms, 9x; 80% → 50/35/230, 23x; 90% → 100/69/460, 46x; 95% → 200/139/920, 92x; 99% → 1 s/690 ms/4.6 s, 460x. -> A walks a few rows conversationally, not row by row: picks 50, 90, 99, mentions 80 and 95 in passing.
- I32 1/(1−rho) is the whole story: 50%→90% = 1.8x more work, p99 5x worse; 90%→99% = 10% more throughput, 10x worse p99. -> A; B's wrong model: "linear" growth.
- PR2 Predict: 10 ms, 90% busy (90 req/s), p99? And if constant 10 ms? Answer 460 ms (46x); constant roughly half (sim about 220 ms), still >20x; arrivals still random; variability in either makes queues worse; near rho = 1 amplified. -> A asks; B says constant means no queue; A corrects.
- F3 Figure 003 queue simulator: arrival slider; readouts utilization/mean/p50/p99/p99.9; log histogram stretches right; dot on curve; service modes constant/exponential/rare 100 ms (same 10 ms average). Up to ~60% p99 barely moves; past ~80% bends; past 95% each step multiplies; rare-100 fatter at every load because one slow request makes everyone behind wait. -> A describes dragging.
- I33 Hockey stick and Term knee: flat, bends, near vertical; below knee extra load almost free; above it you pay in tail. Real servers sharper knee: overloaded servers do more work per request (cold caches, lock contention, retries). -> A.
- I34 Term Kingman's formula: average wait ≈ utilization term × variability term × service time; attack either: lower utilization (more servers) or lower variability (cap request sizes, split big jobs, separate queue for slow 1%). -> A in words, small worked example (constant service halves the variability term, which lines up with the predict's "roughly half"; derived).
- I35 Why 50-70%: knee + bursty traffic; at 60% a spike of 30 points → 90%, p99 up about 5x; at 85% same spike goes past 100%, queue grows until timeouts. Baseline lesson: naive Spark server had to stay near 1% utilization for 99% of requests to see no wait. -> A; B asks why companies waste 40% of machines.

## The Idea: Closed loop and open loop

- I36 Two ways to generate load; answer different questions. -> A, back to the Problem lie.
- I37 Term closed-loop: fixed workers (virtual users), send, wait, send; loadgen.py is one: semaphore lets at most c in flight; new one starts only when one finishes. -> A, with re-explanation of semaphore as a gate with c tickets.
- I38 Term open-loop: decide when each request goes out before the test, stick to schedule regardless. Like real users who don't wait for each other. -> A.
- I39 Little's Law re-explained (in flight = rate × time each stays). Closed fixes in-flight at c, throughput = c / latency; server slows → sends fewer; backs off exactly when server struggles; can never push past knee. Open fixes rate; in-flight pile grows; real users keep clicking. -> B's wrong model: "sixteen workers hammering it is the stress test, just add workers"; A corrects with Little's Law.
- I40 Mac numbers: closed c=16 about 185 req/s, p99 136 ms; open at 190/s, a hair more, p99 ten seconds; 190 just past capacity, queue grew whole test. "How fast when careful?" vs "what happens when traffic doesn't care?" -> A.
- F4 Figure 004: server frozen 500 ms; closed worker stuck inside one request, records one slow sample, sends nothing; open-loop schedule keeps ticking, ten requests during the freeze each wait for it to end: 500, 480, 460... 20 ms, measured from when each should have gone. One bad sample vs a column. -> A describes as two timelines.

## The Idea: Coordinated omission

- I41 Server freezes 500 ms every 5 s (GC, stalled disk): frozen about 9%. Closed worker caught mid-request records one 500 ms sample, then nothing; generator and server "coordinated"; omitted exactly the requests that'd see the freeze. Term coordinated omission. -> A.
- PR3 Predict: 150 req/s normally 5 ms, freeze 500 ms/5 s; one closed worker 20 s, ~3,000 requests; what p99? What would 100 real users/s see? Closed reports about 25 ms (25.5 measured); four freezes → four slow samples out of ~2,900, far under 1%; only max 518 ms gives it away. Open at 100/s from intended time: 473 ms; 9% of arrivals land in a freeze and wait average 250 ms; well over 1%, so p99 sits in the freeze; 19x. -> A asks; B guesses closed shows about 500 ms; A walks it.
- I42 Fix 1: open loop, measure from intended send time: schedule up front (start plus i over rate, or random gaps with that average), latency = done minus intended, not minus actually sent; generator lateness counts. -> A, in words, no formula read.
- I43 Fix 2: correct afterwards: worker meant to send every 5 ms, one took 500, skipped about 99; back-fill 495, 490 ... 5 ms; HdrHistogram's record corrected value with expected interval; an estimate, needs intended rate. -> A.
- I44 Hides where you wouldn't look: wrk has it, Tene wrote wrk2 (fixed rate, intended time); any tool that starts stopwatch after waiting for a free connection/worker/semaphore; loadgen.py starts it inside the semaphore block: honest for closed, CO the moment you treat it as a schedule; reproduce in Break It. -> A; B realizes his own tool does it.

## The Idea: Samples and HDR histograms

- I45 Samples table: true p99 46 ms, 2,000 repeats; 100 samples → 31 to 57 ms; 1,000 → 41 to 51; 10,000 → 44 to 48; 100,000 → 45.5 to 46.6. -> A, a few of these spoken, framed as "how much it wanders".
- I46 At 100 samples p99 is slowest or second slowest; runs differ by almost 2x; want 10 samples past the percentile: 1,000+ for p99, 10,000+ for p99.9; 10-min test at 100/s = 60,000; a p99.9 from a 30 s test is a max with extra steps. -> A; B laughs at the line.
- I47 Storage: list is fine for a test, not for 10,000/s all day on 50 machines wanting p99 per minute per endpoint; mean loses tail; fixed linear buckets need millions or lose low-end detail. -> B proposes "just keep the average" or "buckets of ten ms"; A shows why each fails.
- I48 Term HDR histogram: bucket width grows with value; powers of two (1-2 µs, 2-4, 4-8 ...), each split into equal sub-buckets to keep 3 significant digits; 1.234 ms stored ±0.05%, so is 12.34 s; 1 µs to an hour at 3 sig digits ≈ 185 KB with 64-bit counters regardless of count; recording = couple of arithmetic ops + one increment. -> A.
- I49 Histograms add bucket by bucket; per machine per minute, add, ask sum for p99 → true p99 to 3 digits; the fix for can't-average-percentiles; Prometheus and OpenTelemetry exponential histograms use versions. -> A, closing the loop on I7.

## The Idea: Cutting the tail

- I50 Dean and Barroso: can't make every machine fast every time; treat slowness like failure, expect and route around it. -> A.
- I51 Term timeout: caps damage of one stuck call, turns slow into failed which you must handle; set from data (a bit above p99.9), not a round number; decide what happens after. -> A.
- I52 Retries on a different replica (Term replica); retry = extra load; near knee, overload → retries double load → slower: Term retry storm (can keep a service down after original problem gone); cap with budget (say 10% extra), random backoff; rate limits lesson. -> A; B: "so just retry", A: careful.
- I53 Hedged requests: send to one; if no answer within delay, send copy to second, take first, cancel other. -> A.
- F5 Figure 005: replica A hits 100 ms stall; at hedge delay ~p95, 10 ms, send to B, answers 6 ms later; user sees 16 ms not 100; only requests still waiting at p95 get a copy → ~5% extra load. -> A describes timeline.
- I54 Delay is the trick: two copies of everything doubles load to fix 1%; wait past p95 → only 5% get a copy, aimed at those headed for the tail. BigTable: hedging after 10 ms cut p99.9 of 1,000-key read from 1,800 ms to 74 ms with 2% more requests. -> B's wrong model: "why not always send two?" A answers.
- I55 Works because slowness is often about the machine not the request (A in GC pause, B isn't). Fails when slowness is the request (huge query: two slow answers, double work) and when slowness is load (all near knee, adds load). -> A.
- I56 Only hedge requests safe to do twice: read, search, rerank, LLM completion fine; charge a card not without an idempotency key (unique ID server uses to recognise and ignore a duplicate). -> A.
- I57 Term tied requests: send to two at once, each told of the other; whichever starts first cancels the other; latency benefit with almost no duplicate work. -> A.
- I58 Term backup tasks: MapReduce (Dean and Ghemawat 2004) re-runs last straggling tasks elsewhere; one large sort took 44% longer with feature off. His world: LLM request stuck behind giant prompt on one replica, vector shard on sick machine, flaky tool API. -> A.

## Build It

- B0 Setup: one folder; server and generators on same machine, generator costs CPU; one httpx AsyncClient adds about 3 ms per request, tops out around 1,000/s; keep server capacity well below. Install httpx, numpy, matplotlib, hdrhistogram (imports as hdrh). -> A, one breath.
- B1 Server with knobs: plain asyncio, hand-rolled HTTP, no framework overhead; flags: workers (1 = single-server queue ≈ M/M/1, 0 unlimited), service time mean, exponential or constant, chance of straggler and its time, freeze every N seconds for M ms (freezes whole event loop, like stop-the-world GC). Default 1 worker, 5 ms → 200/s on paper, about 185 in practice (timer wake-ups, HTTP parsing). -> A, what it does, not code; the freeze uses a blocking sleep on purpose (callback to waiting-vs-working).
- B2 closed.py: c workers for d seconds; stamp, await get, record, repeat; one shared client, max connections c, no timeout (never silently drop slow ones); summary prints n, achieved req/s, mean, p50, p99, p99.9, max. Run c = 1, 2, 4, 16 for 10 s; predict c=1 throughput with Little's Law. -> A; B does the Little's Law prediction (one in flight → throughput = 1 / latency).
- B3 open.py: build whole Poisson schedule first; sleep until each offset (skip if late), launch a task per request; record done minus intended AND done minus sent; gather. Hints: every request its own task; pool must not queue (about 2,000 connections); print achieved vs target rate (if differ when not overloaded, generator is bottleneck); two latencies match now, Break It splits them. -> A; B asks why a task per request ("isn't that just more workers?"), A: no worker waits for anything.
- B4 sweep.py: rates at 10, 30, 50, 70, 80, 85, 90, 95, 100% of closed-loop capacity, 20 s each; restart/drain between (backlog pollutes); plot linear (hockey stick) and log (tail at low load); mark line for SLO p99 under 100 ms; overlay M/M/1 prediction (4.6 × S / (1 − rho)), S from c=1 latency, rho = rate/capacity; where does reality depart and why. -> A.
- B5 CO task: server with 500 ms freeze every 5 s; closed c=1, closed c=4, open 100/s, each 20 s; predict first; then HDR with corrected recording, histogram 1 µs to 60 s, 3 significant digits, values in microseconds; expected interval = median latency without stalls; compare corrected vs open vs raw; total count vs requests sent, explain difference. -> A.
- B6 Hedge task: two replicas, 5 ms constant, 3% take 100 ms, unlimited workers (bad luck, not queueing); plain, hedged, both; hedged: wait on first with timeout, then wait for first of two; open loop 100/s 30 s; count every request sent for extra-load %; delays around measured p95 plus either side; agent review: losers really cancelled (close connection, don't leak), counter counts second only when sent. -> A.
- B7 Harness open-loop mode: rate flag (Poisson) as alternative to concurrency; time to first token and end-to-end from intended send time; HDR histograms saved next to the JSON (encoded string); run against fake streaming server at about 80% capacity; then find knee of naive Spark model server (laughably low rate, that's the point). -> A.
- B8 Done when: four scripts print achieved rate, p50, p99, n; latency vs offered-load plot with knee marked and rate for p99 under 100 ms; closed vs open disagree >10x and can explain in one sentence; measured hedging improvement + extra load, know when worse. -> A folds into flow ("by the end you should have...") briefly.

## Measure

- M1 Fill a table, runs at least 20 s, n next to every percentile. Reference: M-series MacBook, Python 3.14, httpx 0.28, client and server same machine; details differ, shape shouldn't. -> A.
- M2 Default server: closed c=1 155/s, p50 4.7, p99 25; c=4 175/s, 21, 54; c=16 185/s, 83, 136; open 50/s → 52, 6.6, 34; 100/s → 95-100, 9-10, 43-50; 150/s → 150, 22-25, 118-156; 165/s → 164, 38, 252; 185-190/s → 130 achieved (falling behind), p50 370-530 ms, p99 10-11 s. -> A walks the story, not rows.
- M3 Closed never breaks: at c=16 server as busy as gets, p99 136: with 16 in flight at most 15 ahead of you; more workers = linearly more latency; can't show cliff. -> A; B: "so 16 is the gentle one".
- M4 Open finds the cliff: p99 roughly doubles 50 to 130/s, triples again by 165/s; at 185-190 backlog grows whole test, p99 set by test length; p99 that grows with test duration = signature of past capacity. Knee about 130-150/s, 70-80% capacity, where M/M/1 says. -> A.
- M5 Runs near knee noisy: two runs at 150 gave 118 and 156; 175 once beat 165; one unlucky burst builds slow-draining queue; variance explodes with mean; run those longer. -> A.
- M6 CO table: closed c=1 p50 4.7, p99 25.5, p99.9 74, max 518; c=4 20, 55, 533, 578; corrected c=1 4.6, 429; open 100/s 15, 473, 518, 533. Closed sees freezes only in max; corrected within 10% of open; count about double sent (back-fills ordinary slow requests too); estimate. -> A; B on c=4 p99.9 catching it.
- M7 Hedging (2 replicas, 5 ms const, 3% 100 ms, open 100/s, 30 s, n=3,000): plain p50 8.3, p95 12.7, p99 105, p99.9 107, 0%; hedged 10 ms: 8.9, 13.4, 21, 103, 4.4%; 15 ms: p99 26, 3.1%; 20 ms: p99 31, p99.9 34, 3.1%; both: 8.7, 12.2, 15.5, 18.7, 100%. About 3 ms of each is the client. p99 105 → 21 for 4% more: hedge delay plus one normal request. Always both better still at double cost. Ignore p99.9: third-slowest of 3,000, decided by both copies being stragglers (about 1 in 1,000). -> A, a few numbers.

## Break It

- K1 Hedge a server slow because busy: replicas as plain queues (1 worker, 5 ms, no stragglers), 140 req/s total (about 40% each); plain p99 39 ms; hedged at 12 ms (below the p95 of 27) sent 34% extra, p99 worse 58 ms; both always 64 ms, each replica about 75% busy; extra requests push both up the hockey stick; hedging fixes bad luck on one machine, not too few machines; set delay from measured p95. -> "what if" exchange; B expects hedging still helps.
- K2 CO back into an open loop: semaphore of 4 and stamp sent-time after acquiring (what tools with fixed connection pools do); 100/s at stalling server: from semaphore p99 52 ms, from schedule 515 ms; same as loadgen.py semaphore; where you start the stopwatch decides the question. -> exchange.
- K3 Average your p99s: per-second p99, average vs whole-run; disagree badly against stalling server; either direction: simulation of 20 windows, stall window with few requests → average-of-p99s 47 ms vs true 26; stall window with as many requests → 46 vs true 402. Per-window HDR histograms added → matches whole-run to 3 digits. -> exchange.
- K4 Generator as bottleneck: server unlimited workers, 1 ms; ask 3,000/s; top: generator near 100% of a core; achieved vs target; intended vs sent latency come apart; measuring generator; real tests: several generator processes or faster tool (wrk2, k6, vegeta); check achieved = target. -> exchange.

## Explain It Back (substance must appear in conversation)

- E1 Why p99 not average; can't average p99s: lopsided pile; mean blends into number nobody experiences; p99 = 1 in 100 slower, every second at real rates, every user loading a few pages; depend on whole shape and counts; keep counts, HDR adds, compute from sum. -> Covered by I5, I6, I7, I49; B's closing restatement touches it.
- E2 50 backends, p99 100 ms: all beat p99 with 0.99^50 ≈ 0.61 → about 39% of user requests ≥ 100 ms vs 1% per backend; median sees p98.6; 500 backends: 0.99^500 ≈ 0.007, over 99% hit someone's p99; each 10x fan-out pushes one nine deeper; care about p99.9, hedge, or reduce fan-out. -> A, after the fan-out figure, as a "now scale it" exchange with B.
- E3 60% CPU, cut fleet by a third → 90%; 1/(1−rho) from 2.5 to 10, roughly quadruples; with 10 ms work p99 about 115 → 460 ms; 15% spike past 100%; measure curve, find knee, size for peak below it; 15% cut might be safe, a third probably isn't. -> B as the manager-style proposal ("we're only at sixty percent, cut a third"), A answers.
- E4 CO definition and avoiding it: stuck worker records one sample instead of the hundred users; open loop, fixed schedule, every request on time (own task, big pool), measure from intended; check achieved = target; else correct with record corrected value; 1,000 samples for p99, 10,000 for p99.9. -> Covered by I41-I46, B3; restated near the end.
- E5 Hedging help/hurt/delay: helps when machine is the cause; delay near p95 → ~5% copies; 105 → 21 ms for 4%; hurts when busy (39 → 58 ms), when request itself expensive, when not safe to repeat; always cancel loser. -> Covered by I54-I56, M7, K1; final turns.

## Go Deeper / Connections

- G1 Best sources: The Tail at Scale (eight pages) and Tene's talk (Strange Loop 2015 recording). -> One closing-ish sentence by A before the ending exchange.
- C1 Connections: rate limits and backpressure (what to do past the knee), load balancers (how you pick a replica changes the tail), batching (wait to fill a batch vs p99), observability (record histograms not averages). -> A, one or two sentences.

## Flow

1. Problem scene (P1-P5), B suspects prod. 2. Origin (O1-O3). 3. Pile (I1-I8, F1), B's 275 ms. 4. Lopsided (I9-I16). 5. Fan-out (I17-I23, PR1, F2, E2). 6. Queues: barista, Erlang, terms, formula, table, PR2, F3, knee, Kingman, 50-70%, E3. 7. Closed vs open (I36-I40), B's "more workers" model. 8. F4 + CO (I41-I44, PR3). 9. Samples + HDR (I45-I49). 10. Cutting the tail (I50-I58, F5). 11. Build It walkthrough (B0-B8). 12. Measure stories (M1-M7). 13. Break It as four what-ifs (K1-K4). 14. Sources + connections (G1, C1). 15. Ending: B restates core idea, A sharpens.
