# Outline: observability

Source: src/lessons/observability.mdx. Curriculum entry: "Logs, metrics and traces." Question: how do
you know what a running system is doing, and why it got slow at 3am? Why: you cannot fix what you
cannot see; production debugging is mostly this.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: tail latency lesson (histograms, percentiles, open-loop load) and baseline streaming server (TTFT, ITL). Stand-in server on the Mac; Spark optional until last task. -> Today list skipped. TTFT, ITL re-defined where first said; p99 re-defined; open loop re-explained at the load generator; "can't average percentiles" re-explained as new.

## The Problem

- P1 Scene: Spark serving Llama to a teammate's agent harness; message "sometimes stalls a second before answering, not always, started last night maybe". -> A opens with it.
- P2 What he has: harness says p50 TTFT fine; five hand requests fast; forty thousand lines of "got request"/"done" with no way to pair or see slow; code identical to last week. -> A; B voices "read the code / reproduce it" instinct.
- P3 Core claim: can't debug production by reading code; code same for every request, behavior isn't. What changed: inputs (code blocks), load (2am batch job), dependencies (sick DB shard), timing (two grab the same lock). Running system forgets unless it writes things down. -> A corrects B.
- P4 Term observability: figure out what a running system does, and why, from outside, using only what it reports; word from control theory. Three forms: logs, metrics, traces; you'll find a fault you don't know the location of. -> A.

## Origin

- O1 2000s Google search fanned out to thousands of machines, dozens of services (spelling, ads, images, news); every team's dashboard said fine; couldn't see one request's path. -> A story.
- O2 2010 Dapper paper (Sigelman and colleagues): ID at front door, passed on every internal call; spans tagged with ID, collector stitched tree; sampled about 1 in 1,024 in first version, still enough. -> A; B reacts to one in a thousand.
- O3 Dapper -> Twitter Zipkin 2012, Uber Jaeger 2015 -> OpenTracing and OpenCensus -> merged 2019 into OpenTelemetry. Metrics: Borgmon -> Prometheus, SoundCloud 2012. -> A, quick.

## The Idea: Three ways to write things down

- I1 Restaurant comparison: order slips (every event, detailed, thousands, must read all for "slow tonight?"), tally board (few running numbers, cheap, can't say why table 12 slow), following one ticket (timestamp at every station; 28 of 40 minutes on grill rail). -> A, short, as the lesson does.
- I2 Log = timestamped record of one event; answers what happened in detail for this event. Metric = number over time, aggregated, cheap; how much/often/fast across everything over time. Trace = full path of one request as tree of timed steps across processes; where did the time go. -> A maps them.
- F1 Figure 001: same slow request in three views. Log line: request id 7f3a, user, ttft 431 ms, duration 1067 ms; detail, no shape. Metrics: requests total +1, in flight 12, +1 in the 1.5 s bucket; shape of all, no detail. Trace: quota_check fat bar, tokenize/cache tiny, prefill, decode; shape of one request. -> A describes the three panels.
- I3 Each cheap where another is expensive; wired together by one shared ID. -> A.

## Logs

- L1 print("done") is a bad log; three upgrades. -> A.
- L2 Structure: one JSON object per line; sentence only greppable; JSON filterable (duration over 1000), groupable by user, countable, with jq or log store. Term structured log. -> A; jq spelled out.
- L3 Request id on every line: 16 concurrent requests interleave; generate at arrival or take X-Request-ID header; stash where every function can reach; formatter stamps it; contextvar = async-safe global private to current task; return in response header so "7f3a was slow" is findable. -> B asks why not pass it as an argument / global; A explains contextvar.
- L4 Levels: DEBUG, INFO, WARNING, ERROR; keep INFO and above in production. -> A, quick.
- L5 Cost: 1,000 req/s x 10 lines x 500 bytes = 5 MB/s = 432 GB/day; stores charge per GB; log sampling: keep every error and slow request, ~1% of boring; your one server can keep all, company can't. -> A works the multiplication in words; B reacts.
- L6 Time cost: JSON log line ~4 microseconds on Mac (Python 3.14, to memory); nothing next to 500 ms request, a lot per token. -> A with comparison.

## Metrics

- M1 Metric throws away detail on purpose to be kept forever and summed across machines; Prometheus names three kinds. -> A.
- M2 Counter: only goes up; value meaningless (resets on restart); rate is everything; requests per second = slope. -> A; B's wrong model: "so the counter is the number of requests" -> A: the slope.
- M3 Gauge: up and down, read as-is: in flight, queue depth, memory, KV cache fraction. -> A.
- M4 Histogram: set of counters, one per latency bucket, plus count and sum; percentiles estimated later; same idea as HDR histogram from tail latency lesson, buckets you choose. -> A, re-explains HDR briefly.
- M5 Cumulative buckets: each counts everything at or under its edge ("le" = less or equal), last (+Inf) = total. Example after 300 requests: 0 under 0.25 s, 102 under 0.5, 298 under 0.75, all 300 under 1 s; sum 167.6 s so mean 559 ms; a dozen numbers however many requests; one observation ~0.4 microseconds. -> A walks it; B's wrong model: 298 in the 0.75 bucket alone -> A corrects to cumulative.
- M6 RED method (Tom Wilkie): Rate, Errors, Duration, for request-serving things; what users feel. -> A.
- M7 USE method (Brendan Gregg): Utilization, Saturation, Errors for resources; on your server GPU utilization, saturation = queue waiting for GPU lock. -> A.
- M8 Google SRE four golden signals (latency, traffic, errors, saturation) = two recipes merged. -> A, one line.

## Labels and the explosion

- C1 Labels: key-value tag; status ok vs error = two separate counters, two time series; each distinct combination stored separately. Term time series. -> A.
- C2 Multiplication: 12 buckets x 5 endpoints x 3 statuses = 180 series, fine; add user_id with 100,000 users = 18 million series; each costs on order of kilobytes => tens of GB; silently on the day traffic grows. Cardinality explosion; common way people take down their own monitoring. -> B proposes per-user latency label (natural idea); A does the arithmetic.
- C3 Rule: labels from small fixed set (status, endpoint, model, region); unbounded (user id, request id, prompt) go in logs and trace attributes. -> A.

## Percentiles come from buckets

- Q1 First dashboard plots average latency; mistake. -> A.
- PR1 Predict: ~270 ms average, 5% get extra 400 ms; how much do mean and p99 move? Answer: mean +20 ms (~7%), noise; p99 ~530 -> ~730, ~200 ms, because p99 lands in slow 5%; stand-in measured mean +31 ms, p99 +326 ms; average spreads it over everybody. -> A asks, B guesses wrong (both up 400ish / mean moves a lot), A reveals.
- F2 Figure 002 interactive: drag slow fraction and delay; mean (dashed) barely moves, p99 jumps into slow hump; bucket estimate only as good as edges; fleet mode: averaging four p99s under-reports, summing buckets then estimating close to truth. -> A describes what you'd see dragging.
- Q2 histogram_quantile finds bucket with the 99th-percentile request, assumes even spread inside; wide bucket drifts: 5% and +1000 ms lands in 1-1.25 s bucket, off by almost 100 ms. Put bucket edges where decisions are; TTFT under 250 ms => edge at exactly 0.25 so count is exact. -> A.
- Q3 Can't average percentiles: fleet p99 isn't average of machine p99s; fleet mode at 5%/+1000 ms, one sick of four: true fleet p99 ~1.2 s, average of four p99s says 730 ms. Counts add, percentiles don't; sum the buckets across instances, estimate once ("sum by le"); wrong = per-instance p99 then averaged. -> B: "why not just average them?"; A explains.
- Q4 Same rule as tail-latency lesson for HDR. Summaries compute percentiles inside each process, can't be added across machines; histograms usually better. -> A.

## Traces

- TR1 Metric says p99 worse but forgot every request; trace keeps one whole. -> A signpost.
- TR2 Trace = tree of spans; span = one timed step (name, start, duration, parent, attributes); root span = whole request as first service saw it; children, grandchildren; each records parent; all share trace id (random 128-bit number). -> A.
- F3 Figure 003 waterfall: gateway with quota_check, HTTP hop with traceparent, server with tokenize, cache_lookup, queue_wait, prefill, decode x32; dashed line at first token, left of it is TTFT. Healthy: decode dominates (32 tokens x 20 ms). Faults: slow DB (+400 ms), cache lock (+300), tokenizer (+250), GPU queue (+900, every request), slow decode (20 -> 34 ms per token). -> A describes clicking each.
- TR3 Slow DB in gateway before server called; server metrics perfect while users suffer; only whole-request measurement (root span or gateway metrics) sees it. -> A.
- TR4 Cache lock: own work microseconds, duration 300 ms, waiting; CPU profiler says idle; trace says it's the problem. -> A.
- TR5 GPU queue grows on every request at once: overloaded vs broken. -> A.
- TR6 Slow decode doesn't touch TTFT; TTFT-only dashboard fine while every answer takes 70% longer. -> B surprised; A explains.
- TR7 Span attributes: user, prompt length, model, output tokens; unbounded values ok because stored per span; where banned high-cardinality detail lives; slow traces' attributes say what they share. -> A, ties back to labels.

## Context propagation

- CP1 Within process: library keeps current span in a contextvar; new span becomes child automatically. Across processes no shared memory; parent travels with request: context propagation; HTTP: one header, W3C Trace Context, traceparent. -> A; B asks how the server knows it's the same request.
- F4 Figure 004: client/gateway injects, server extracts; header = version 00, trace id 16 bytes same everywhere, parent span id 8 bytes, flags 01 = sampled; same trace id both sides, collector stitches. -> A describes field by field in words, no hex read.
- CP2 Last field = sampling decision (head sampling): decide at start, pass downstream, every service agrees, no half traces. Tail sampling: decide after finish, keep slow and broken, drop most boring; needs collector that buffers. -> A.
- CP3 Current Python SDK printed flags 03: extra bit marks trace id as random (newer addition); version may differ. -> A, one aside.

## OpenTelemetry and backends

- OT1 OpenTelemetry (OTel): standard + SDKs for traces, metrics, logs; API like start_as_current_span; exporter ships via OTLP (gRPC 4317 or HTTP 4318) to any backend. Before: switching vendors = re-instrument every service; now: change an endpoint. -> A.
- F5 Figure 005 push traces, pull metrics: app batches spans, pushes to Jaeger over OTLP; app keeps counters in RAM, serves /metrics; Prometheus scrapes every 5-15 s; Grafana queries Prometheus with PromQL. -> A.
- OT2 Prometheus pull model robust: dead server = failed scrape, up metric goes to 0; app never blocks because monitoring slow. Jaeger stores and searches traces ("over 1 s"), waterfall. Grafana draws dashboards. -> B asks why pull; A.
- OT3 Recent FastAPI optional built-in OTel; auto-instrumentation packages; use at work; today write spans by hand to know what they do. -> A, one line.

## SLIs, SLOs, error budgets

- S1 Dashboards are for looking; at 3am nobody looks; something must decide when to wake you. -> A signpost.
- S2 SLI: measured fraction of good events (TTFT within 250 ms). SLO: target over window (99% within 250 ms over 30 days). Error budget: 1 minus target = 1%; a million requests a month -> 10,000 can be slow and you still met it. -> A.
- S3 Why not 100%: last nines wildly expensive; users can't tell 99.99 from 100 through flaky Wi-Fi; team that may never break anything never ships; budget turns argument into arithmetic: budget left ship, gone slow down. -> B pushes "why not aim for perfect"; A.
- S4 Burn rate = bad fraction recently divided by (1 minus SLO); 1% bad = 1, uses exactly the budget by day 30; 6% = 6, gone in 5 days. -> A in words with worked example.
- F6 Figure 006: budget left over 30 days for 1x (lasts 30), 6x (gone day 5), 14.4x (about two days); SRE workbook pages: 14.4x over an hour (2% of budget gone) or 6x over six hours (5%). -> A describes three lines.
- PR2 Predict: SLO 99% TTFT under 250 ms; 6% miss; burn rate and days? average TTFT dashboard? Answer: 6, 5 days; stand-in average TTFT 44 -> 69 ms, far under 250, average alert never fires; SLO counts bad requests one by one. -> A asks, B gets burn rate right, guesses average would show it; A corrects.

## Alert on symptoms

- AL1 Symptom = users feel (errors, slowness, SLO burning); cause = guess (CPU 90%, replica down, disk 80%, GPU memory high). -> A; B's wrong model: alert on CPU and GPU, that's what monitoring is.
- AL2 Page on symptoms: cause alerts fire when nothing's wrong (GPU 100% is doing its job; one replica down while others absorb) and silent when something is (slow DB raises nothing). Alert fatigue: pages that don't matter teach on-call to ignore; real incidents slept through. Rob Ewaschuk (Google): every page urgent, actionable, about something users notice. Causes on dashboards for the human paged. -> A.
- AL3 Burn rate is symptom alert done well: 14.4x over an hour = 2% of month's budget in that hour, page-worthy; short window (5 min) also burning makes it stop when problem stops. -> A.

## Profiles

- PF1 Trace says which span, not which line; profiler = where program spends time by function/line; sampling profiler looks at call stack many times a second; py-spy from Python-speed lesson. -> A.
- PF2 Continuous profiling: low-rate sampler always on every machine, ask what code did at 3:12am; Google-Wide Profiling 2010; Pyroscope, Parca; OTel adding profiles as fourth signal. -> A.
- PF3 Normal CPU profile counts only running threads; thread waiting on lock invisible; wall-clock profile samples running or waiting (py-spy --idle), or py-spy dump prints every thread's stack. -> A, ties to cache lock.

## Observing an LLM server

- LLM1 TTFT histogram: what chat users feel, queue + prefill. ITL histogram: decode speed, catches what TTFT misses. Output tokens/s from counter rate: throughput, what you'd bill. Prompt and output token counters: cost, capacity input. Running/waiting gauges: saturation; waiting above zero for long = add capacity. KV cache utilization gauge: near 100% engines stop admitting or preempt (continuous batching). Prefix cache hit rate counters. -> A, as talk not table; re-define TTFT/ITL.
- LLM2 vLLM and SGLang expose most on /metrics; names change between versions; curl and look. -> A.
- LLM3 Agents: one run = one trace; each model call and tool call a span with model, tokens, tool name, errored; answers "why 4 minutes?" (eleven sequential tool calls, one a 90 s web fetch), "where do tokens go?" (context re-sent every step); OTel draft gen_ai attributes; most LLM tracing products are this with a nice UI. -> A; B connects to his agent work.

## Build It

- B0 Stand-in server same shape as server_naive.py (FastAPI streaming SSE, limit on concurrent GPU work, prefill then decode) but fakes model with sleeps; repeatable; port later. Folder: deps, fakellm, loadgen, compose, app.log. -> A one sentence.
- B1 Task 0 setup: deps.py picks one of three faults from FAULT_SEED, each ~5% of requests, folded away as spoiler; ask agent to copy it so you never see it; even if read, don't know which is live. Server: four batch slots stand in for GPU; prefill 400 microseconds per prompt token; 20 ms per output token (50 tok/s). Loadgen open-loop: fixed rate whether or not server keeps up, 500 fake users, prompt mix. Smoke test at ~5/s; 4 slots and ~0.55 s per request tops out near 7/s; past that queue grows without bound (try 10). -> A; B works out the 7/s ceiling; open loop re-explained.
- B2 Task 1: Jaeger, Prometheus, Grafana in three containers; pin versions; Prometheus target shows down until /metrics exists; agent can debug freely. -> A, one or two sentences.
- B3 Task 2 logs: one JSON line with request id without passing by hand; take X-Request-ID or generate; set contextvar at top of the streaming generator (runs as its own step), not only in endpoint; return id in response header; one "request done" line with user, prompt chars, ttft, duration, out tokens, status, in a finally so failed/cancelled log too. to_thread copies context so tokenizer logs see id. Check: filter ttft over 200 prints slow; no duplicate ids. -> A, the part that matters: contextvar placement and finally.
- B4 Task 3 metrics: requests counter with status label; duration, TTFT, ITL histograms no labels; in-flight gauge; output/prompt token counters; queue-waiting gauge. Choose buckets on purpose: 0.25 must be an edge; ITL edges 0.01-0.1. Client appends _total. In-flight inc at start, dec in finally; drifting upward = path skipping finally (client disconnect). Time TTFT where first token yielded: arrival to first token. Check cumulative and +Inf = count. -> A.
- B5 Task 4 traces: SDK wiring boilerplate; spans yours: root "chat" from extracted context, children quota_check, tokenize, cache_lookup, queue_wait (just the semaphore wait), prefill, decode. Loadgen own provider, client_request span, inject traceparent; Jaeger one trace two services. Hints: root attributes user, request id, prompt chars, out tokens (clues); queue_wait only the acquire, release in finally; BatchSpanProcessor exports in background thread so dead Jaeger doesn't slow requests; ~8 microseconds per span, 7 spans per 550 ms noise, span per token on busy server isn't. -> A.
- B6 Task 5 dashboard: rate (sum of rate of requests counter), errors fraction, duration p50/p99, TTFT p50/p99 plus mean on same panel to watch it lie, ITL p99, output tokens/s, saturation. Run at 5/s for 600 s no fault, screenshot baseline. Agent reviews PromQL: averaging quantiles, rate window shorter than two scrapes, forgetting by le. -> A.
- B7 Task 6 the hunt: random seed, don't echo; rules: dashboards, Jaeger, jq, curl metrics, py-spy; no reading deps, no print debugging. Method: 1 dashboard symptom (which percentiles, TTFT or ITL, all or some, saturation?), 2 traces: search min duration ~900 ms, open five, which span fat in all, 3 attributes and logs: what slow ones share (user, prompt length, spread evenly), jq group slow by user and prompt chars vs all, 4 profile if span fat but code trivial: py-spy dump a few times (sudo on macOS), where threads sit. Five-line incident note: symptom, span, which requests, root-cause guess, evidence. Reveal with seed; repeat until all three found. -> A walks method; B tries applying it to a hypothetical (A and B reason through what each of the three fault types would look like without naming deps internals? The lesson calls deps a spoiler; the waterfall figure already names quota/cache lock/tokenizer faults; keep hunt reasoning at the level of the figure).
- B8 Task 7 SLO: 99% TTFT within 250 ms over 30 days; SLI PromQL needs the 0.25 bucket and count (why edge had to exist); divide by 0.01 for burn rate; panels 5 min and 1 h; page: both 1 h and 5 m above 14.4; slower: 6 h and 30 m above 6; run each fault 10 min, record burn and days left; no real routing. -> A.
- B9 Task 8 port to Spark: queue_wait = wait for gpu_lock; prefill ends when streamer yields first text; decode rest; ITL from real gaps (one SSE event can hold several tokens: divide by tokens, or request mean); waiting gauge; run harness at concurrency 1 and 8; watch queue_wait become biggest span; batching lesson fixes; agent review for unended spans and unbounded labels. -> A.
- B10 Done when: logs one line per request with id matching response; metrics with deliberate buckets; Jaeger two services one trace; dashboard; three faults found with notes before reveal; burn rate per fault and which alert pages. -> Folded into talk, not read as list (brief line).

## Measure

- ME1 Each config at 5/s for 10 minutes; table: mean, p50, p99, TTFT mean, TTFT p99, bad fraction, burn rate, culprit span; no fault, three faults, overload at 8/s. -> A.
- ME2 Measured on Mac, 300 requests per run, p99s rough (300 samples thin for a p99). No fault: mean 559, p50 554, p99 741, TTFT mean 44, TTFT p99 75, 0% bad, burn 0. One fault: 590/582/1067, TTFT 69/441, 6.0%, 6.0. Another: 570/569/906, 60/285, 5.7%. Third: 582/586/902, 67/381, 4.7%. Unlabelled on purpose. -> A gives the healthy row and the spread, not row by row.
- ME3 Mean moved 2-6%; p50 barely; nearly invisible on average dashboard, obvious on p99; TTFT p99 moved 4-6x. -> A.
- ME4 Burn rate about 5 for every fault, since each hurts ~5%; 5x uses 30-day budget in ~6 days; would fire slow (6x over 6 h) alert or come close, not fast page; right answer: real but slow problem, ticket for morning. -> B guesses it should page; A.
- ME5 Overload looks different: queue_wait grows on every request, in-flight climbs, bad fraction keeps rising rather than flat. -> A.
- ME6 Instrumentation cost: ~0.4 microseconds per histogram observation, ~0.5 per labelled counter increment, ~8 per span, ~4 per JSON log line; measure with 100,000-iteration loop; against 550 ms rounds to zero. -> A with comparison.

## Break It

- BR1 user as metric label: 500 users, ~15 lines per histogram -> several thousand lines vs a few dozen; imagine 100,000 users and 50 servers; move user to span. -> A/B exchange.
- BR2 Forget to extract context: two separate traces per request, nothing joining; one service not propagating = a hole in the middle of every request company-wide. -> exchange.
- BR3 Telemetry as outage: SimpleSpanProcessor (export synchronously on each span end) + exporter at address that never answers; p99 blows up, each span end waits for network timeout inside request; telemetry must never block the work; check exporter's default timeout. -> exchange; B asks why it isn't async by default.
- BR4 Average the p99s: two servers 8000 and 8001, fault in one, wrong vs right query side by side, measure gap. Then cause alert CPU above 80%: fires for none of three faults (all waiting, not computing); on Spark GPU above 90% fires every healthy benchmark; missed real problems + constant false alarms = alert fatigue in one panel. -> exchange.

## Explain It Back (substance must appear)

- E1 Logs/metrics/traces each; use in order in incident: metric alerts (symptom), traces show step (location), logs and attributes show which requests and what they share (cause); request/trace id on all three lets you jump; profiles fourth. -> A states the incident order explicitly, near the hunt.
- E2 Can't average p99s: percentile depends on counts per server and tail shape; keep bucket counters per server, sum, estimate once; precision depends on edges; edge at 250 ms. -> covered in Q3 and Q2, reinforced in BR4.
- E3 Trace across services: first service creates trace id and span id; adds traceparent with version, trace id, parent span id, flags incl. sampled; receiver starts child; every service ships own spans to collector separately; collector groups by trace id and rebuilds tree from parent ids; drop header = trace breaks into pieces; sampling decision in header = no half traces. -> CP1, F4, CP2, BR2; make sure "each service ships separately, collector rebuilds" is said.
- E4 Error budget and burn rate; page on burn rate not CPU: 1 -> exact budget, 6 -> 5 days, 14.4 for an hour -> 2%; CPU is a cause (high when busy, normal when DB slow); false alarms train ignoring and misses real; burn rate measures users and threshold maps to urgency. -> S2-S4, AL1-AL3.
- E5 Scaling 1 -> 200 servers, 50 customers: metrics fine if labels bounded (200 x few hundred = tens of thousands of series, easy); "customer" with 50 values maybe acceptable, user/prompt never; recording rules pre-aggregate fleet histograms so dashboards don't sum 200 on every refresh; logs terabytes a day -> keep errors and slow, sample rest; traces need tail sampling so slow/failed survive; per-customer questions to attributes and logs; alert on fleet SLO not machines or one bad host pages every night; continuous profiler since something always slow somewhere. -> Own exchange near end; B asks "what happens at two hundred servers" as a real question because it's his scale question.

## Go Deeper / Connections

- G1 Best sources: Dapper paper; SRE book chapters + workbook "Alerting on SLOs"; (maybe Ewaschuk). -> One closing sentence.
- CN1 Batching should shrink queue_wait; prefix caching gives KV and hit-rate gauges; agent harness one trace per run; every change becomes before-and-after on a dashboard. Cache lock = the lock from threads/GIL lesson seen from outside; saturation = queues/backpressure measured. -> A, one or two sentences before the close.

## Flow plan

1. Problem: the stall message, B's "reproduce / read the code" instinct, A: code same, behavior isn't. Observability defined.
2. Dapper origin, then the lineage.
3. Three ways to write things down (short restaurant comparison), the three definitions, figure one, the shared ID.
4. Logs: structure, request id + contextvar, levels, cost arithmetic, time cost.
5. Metrics: counter (B wrong model), gauge, histogram, cumulative bucket walk (B wrong model), RED/USE/golden.
6. Labels: B proposes per-user label, cardinality arithmetic, rule.
7. Averages vs percentiles: Predict, figure 2, bucket edges, can't average p99s, summaries.
8. Traces: spans, waterfall figure with five faults, attributes.
9. Propagation: traceparent header, head vs tail sampling, flags aside.
10. OTel + push/pull backends.
11. SLO/budget/burn rate, figure 6, Predict 2.
12. Symptoms vs causes (B wrong model: alert on GPU), alert fatigue, burn-rate alert windows.
13. Profiles, wall-clock vs CPU.
14. LLM server metrics, agents as traces.
15. Build It walk-through, the hunt method (incident order = E1).
16. Measure numbers.
17. Break It four.
18. Scale to 200 servers (E5).
19. Connections + one source sentence; B restates core idea; A sharpens; stop.
