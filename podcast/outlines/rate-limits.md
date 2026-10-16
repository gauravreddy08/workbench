# Outline: rate-limits

Source: src/lessons/rate-limits.mdx. Curriculum entry: "Rate limits and backpressure." Question: how
does a system say "slow down" instead of falling over? Why: every public API, including the ones you
call, does this. So should yours.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereq: waiting-vs-working (async servers, fake LLM, Little's Law, the semaphore). -> Re-explained inline where each is used: fake LLM in "what overload does", Little's Law in one sentence with an example, semaphore as "a gate that lets eight through".
- T2 Today bullets skipped as a list; each is an item below.

## The Problem

- P1 Scene 1: cross-encoder training data, 20,000 query-document pairs, Claude judges relevance; gather makes it "one line". -> A opens on this.
- P2 Within a second, 429 Too Many Requests; SDK retries each twice quietly then raises RateLimitError. -> A.
- P3 He wraps in try/except, sleep one second, retry: no crash, but waves: activity, silence, wall of 429s. Twenty minutes later 30% done. "Well under my per-minute limit." -> A; B says "but I'm under the limit" as his own model.
- P4 Scene 2: reranking service, 300 req/s at 40 ms; backfill sends 600/s. Expect: everything twice as slow. Instead: p99 to timeout, then median; 100% CPU, zero successes; everyone times out; stays broken a minute after backfill stops. -> A flips the picture; B voices "it'd just get twice as slow".
- P5 Same problem from two ends: no way to say slow down -> falls over, takes everyone with it. -> A.

## Origin

- O1 October 1986, LBL to UC Berkeley, 400 yards apart, 32,000 bits/s dropped to 40. No cable broke. -> A as story.
- O2 Every machine resent unacknowledged packets; routers' queues full; resends filled them more; network flat out carrying copies of given-up packets. -> A.
- O3 John Nagle predicted it two years earlier, named it congestion collapse. -> A.
- O4 Van Jacobson and Michael Karels fix, 1988 paper "Congestion Avoidance and Control": lost packet = signal to send less; start slow, grow carefully, halve on loss, back off retransmissions exponentially. -> A.
- O5 Every idea here (shedding, backpressure, backoff, jitter) is that lesson at a higher layer: when overloaded, stop making it worse. -> A, thesis line.

## The Idea: what overload does

- I1 Fake LLM server: GPU runs 8 at once (semaphore of 8), 100 ms each -> capacity 80/s. Term capacity: most work per second no matter how much you send. -> A, re-explaining semaphore.
- I2 Send 120/s, clients give up after 1 s. Term timeout: every real client has one, even a library default. -> A.
- I3 120 arrive, 80 finish, 40/s wait in an unbounded queue (coroutines waiting on the semaphore). Term queue: line of work; coroutines, list, socket buffer, Kafka topic. 40 after 1 s, 200 after 5 s, 400 after 10 s. -> A.
- I4 Little's Law (re-explain): wait = queue length / drain rate = 400/80 = 5 s at the 10 s mark. Latency grows without bound, linearly in time; no new steady state. -> A; B voices "it'd settle at some slower speed".
- I5 Timeout turns slow into broken: after about 1.8 s every client gives up before its turn; server doesn't know; does full 100 ms of GPU work and sends to a closed connection; 100% busy; every answer late. -> A.
- I6 Throughput (completed per second whether wanted or not) still 80/s; goodput (useful answers reaching a still-waiting client) zero. -> A; B paraphrases.
- F1 Figure 001: arrivals 120/s, unbounded queue growing 40/s, at 10 s 400 waiting, wait 5 s, memory held for each, server 8 slots x 100 ms = 80/s 100% busy, client gave up at 1 s, goodput 0. -> A describes left to right.
- I7 Measured on a MacBook: 80/s all succeed, p99 156 ms. 120/s: 216 of 1,200 succeeded, still chewing through 300 abandoned after clients left. 240/s: 112 of 2,400, about 1,500 dead requests queued after, process grew about 19 MB. -> A.
- PR1 Predict: 120/s, 10 s gives goodput about 22/s; what at 60 s? CPU? Answer: about 3.6/s, CPU 100% the whole time. Reason: only requests before wait passes timeout succeed; wait reaches 0.9 s (1 s minus 0.1 s work) when queue holds 72; at 40 extra/s takes 1.8 s; 120 x 1.8 = 216 succeed regardless of duration; /10 = 21.6 (measured), /60 = 3.6; steady state zero. Trap: longer overload, worse average, looks healthy by CPU. -> A asks, B guesses wrong (thinks it stays ~22), A walks it.
- F2 Figure 002 (interactive): goodput vs offered load; ink unprotected, dots measured, blue shedding flat at 80; sliders load, duration, timeout; drag duration to a minute, ink collapses toward zero; lengthen timeout buys a little briefly, changes nothing long run. -> A describes as what you'd see dragging.
- I8 Term congestion collapse: pushing more load in gets less useful work out; not a FastAPI/asyncio bug; any unbounded queue + impatient clients: threads, processes, Go, Rust, Postgres pool, support phone line. -> A.
- I9 Server didn't crash. Diagnostic: thought sync servers "crash" under load; they mostly don't; worse: keep running and stop being useful. -> B voices "at some point it crashes though, right?"; A corrects.

## The Idea: load shedding

- I10 Shedding server checks line length; if 16 waiting (16/80 = 200 ms of work) answer 503 Service Unavailable immediately. Terms load shedding, bounded queue. -> A.
- I11 Rejecting costs almost nothing: no GPU slot, no 100 ms, a few dozen bytes. At 240/s: 816 successes, 1,584 fast 503s, p99 about 300 ms (100 + up to 200). At 480/s still 816. Goodput stuck at capacity, best possible. -> A.
- I12 Feels wrong; choice is "serve some quickly and tell rest right away" vs "serve nobody slowly". Fast no is a gift: retry later, another replica, error in 5 ms not a 30 s spinner. -> B objects ("you're turning away paying users"), A answers.
- I13 Size queue in time, not items; with 1 s timeout and 80/s, anything over about 70 is pure harm; production queues usually too long because long queue looks harmless in testing. -> A.
- I14 Deadlines: record arrival; at the front, if waited longer than client will, drop without work. Better: client sends deadline (gRPC does with every call); every layer checks. -> A.
- I15 Which to drop: newest simplest (what you build); under sustained overload serve newest first / drop oldest since oldest likely dead; Facebook "Fail at Scale": LIFO under overload, queue delay not length as signal, from CoDel for routers. -> A.
- I16 Shed by priority: interactive user over backfill; tag priority, shed cheap ones first. -> A.

## The Idea: backpressure

- I17 Shedding = "no"; sometimes "wait". Batch job wants to send as fast as server can take and no faster. Term backpressure: slow consumer makes producer slow down. -> A.
- I18 Already used twice: TCP receive window (receiver advertises space left; at zero sender's kernel stops; client's send blocks). Last lesson's semaphore of 64: 65th task waits. -> A.
- I19 Rule: every queue bounded; full queue pushes back by blocking (wait) or rejecting (shed). Chain: slow GPU -> reranker queue fills -> 503s or slower reads -> gateway queue fills -> batch semaphore holds tasks. Nothing grows without limit; every component knows worst-case memory. -> A.
- F3 Figure 003: batch job (semaphore 64) -> gateway (rate limit) -> reranker (queue max 16) -> GPU (8 slots); queues fill right to left; signal changes form: slots full, 503/TCP full, 429 + Retry-After; same message. -> A, as a chain.
- I20 Unbounded buffer anywhere breaks it: absorbs pressure, back to figure 1 at that hop. Hiding places: asyncio Queue with no maxsize, a list you append to, broker with no retention limit, ThreadPoolExecutor's queue (unbounded), HTTP client pool silently queueing for a free connection. -> A; B surprised at thread pool.

## The Idea: rate limiting

- I21 Shedding doesn't care who; backfill sends 95% of traffic, gets 95% of successes. Term rate limiter: counts per client (API key, user, IP) over time, rejects or delays over allowance. -> B asks "doesn't shedding already handle this?"; A answers.
- I22 Four classic ways to count "per second"; differences matter. -> A signpost.
- F4 Figure 004: four timelines (fixed window boundary 10 in a blink; sliding look-back; token bucket burst spend savings then empty; leaky bucket lumpy in, even out later). -> Folded into each algorithm's explanation, no "figure" reading.
- I23 Fixed window: one counter per client per minute (key user plus minute), increment, reject over, expire. One integer. Flaw: full limit last second + full limit first second next = 2x in two seconds. Everyone resets same instant, rejected clients all come back at the top of the minute. -> A with worked example.
- I24 Sliding window log: timestamp of every request in last window; drop old, count. Exact, no boundary, but 10,000/min means up to 10,000 timestamps per client. -> A.
- I25 Sliding window counter (Cloudflare popularised): this window count + previous window count weighted by fraction still in view. Two integers, very close to exact, assumes previous spread evenly. -> A with a small worked example in words (derived numbers).
- I26 Token bucket: holds at most b, r drip in per second, each request takes one; no token no entry. Refill rate = long-run average; burst size = how lumpy; quiet client fires b instantly, busy client gets exactly r/s. Over any stretch T at most b + r times T. -> A, with numbers in words.
- I27 Two numbers of state; no background timer; lazy refill: compute what would have dripped, add capped, decide. GCRA: Generic Cell Rate Algorithm, one timestamp (theoretical arrival time), from ATM networking, used by Redis limiters. -> A.
- I28 Leaky bucket two meanings: as meter = token bucket upside down, identical. As queue: drained at exactly r, delays bursts, smooth output; routers shape traffic; APIs use the meter since queue adds latency. -> A; B confused by the name.
- F5 Figure 005 interactive token bucket: line = tokens, climbs at refill to cap, drops one per accepted request; filled ticks in, hollow ticks 429. Steady 6/s vs refill 4: savings drain then rejections at the excess rate. Bursts fine if bucket deeper than burst. Spike: average about 5/s, refill 4, burst 10; spike of 30 gets about 10 through, 20 rejected. Bucket cares about burst, not average. -> A describes what you'd see pressing the buttons.
- I29 Comparison table content: fixed (1 counter, 2x at boundaries, synchronized resets); sliding log (timestamp per request, no bursts, memory grows with limit); sliding counter (2 counters, slight bursts, approximate); token bucket (2 numbers, bursts up to b on purpose, two knobs to explain); leaky queue (a queue, bursts become delay, latency + needs own bound). -> A, a quick spoken roundup, not row by row.

## The Idea: saying no in HTTP

- I30 429 Too Many Requests (RFC 6585, 2012): you are over your limit; others fine; send slower. 503: server overloaded or down for everyone; back off too. -> A.
- I31 Retry-After: seconds or a date. Token bucket knows exactly: need 1, have 0.3, wait = 0.7 / r. Worked: r = 10 -> 70 ms (derived). -> A.
- I32 Headers describing limit and remaining so a polite client slows before rejection; IETF draft RateLimit and RateLimit-Policy; providers name them differently. -> A.

## The Idea: retries, backoff, jitter

- I33 Retry? Usually yes, transient. But retries are load. Every client retries 3 (4 attempts): up to 4x load at worst moment. Layers: 4 x 4 x 4 = 64 attempts at bottom. Term retry storm: most common way a blip becomes long outage. -> B says "retrying is just being resilient"; A corrects.
- I34 Rule 1: exponential backoff, base, 2 base, 4 base, capped. Struggling longer -> fewer retries. -> A, words not formula.
- I35 Rule 2: jitter. 400 clients fail together (restart, cache expiry, deploy, fixed-window reset); pure backoff: all wait 100 ms, retry together; server admits 24, rejects rest; 200 ms together; lockstep forever. Full jitter: random between zero and the backoff (Marc Brooker AWS post). Ethernet 1970s: random number of slots, doubling range after each collision. -> A; B: "they'd naturally drift apart".
- I36 Rule 3: bound total: max attempts, total deadline, retry budget (retries add at most 10%); gRPC retry throttling is a token bucket on the client. Retry 429, 503, 529, timeouts, connection errors; not 400. -> A.
- I37 Honour Retry-After, but add a little jitter on top; telling 400 clients "1 second" recreates lockstep. -> A.
- PR2 Predict: 400 clients at once to shedding server (80/s, queue 16), base 100 ms doubling cap 5 s; ideal 400/80 = 5 s. No jitter about 52 s (3,323 attempts); full jitter about 7.5 s (2,384 attempts); runs 52-57 s and 7.2-7.5 s. Why: server admits about 24 (8 + 16) per wave; once at 5 s cap, one wave per 5 s, idle between; jitter spreads each wave over its window. -> A asks, B guesses (maybe 10 s), reveal.
- F6 Figure 006: requests per quarter second; no jitter: synchronized spikes far above the "server can take about 20" line with idle gaps, 779 more attempts after 15 s shown; full jitter: smooth decaying stream done in 7.5 s. -> A describes two bar charts stacked.

## The Idea: circuit breakers

- I38 Backoff = polite to struggling; circuit breaker = it's clearly down. Named after electrical, popularised by Nygard's Release It!. -> A.
- I39 Closed: calls go through, count failures. Open: failure rate past threshold (more than 50% of last 20), for next 30 s don't call, fail instantly or fallback (cached answer, cheaper model, try later). Half-open: after cool-down, a few trial calls; succeed close, fail reopen. -> A.
- I40 Why, if you back off: takes load off completely; protects you: 10 s timeouts mean each handler holds slot, connection, memory; Little's Law at 100 req/s = 1,000 stuck; now you're figure 1. Fail fast stops spread upstream; backpressure for broken dependencies. -> B asks "why bother if I already back off", a real question.

## The Idea: distributed rate limiting

- I41 One dict in one process; uvicorn workers 4 or 4 containers: 70/s becomes 70 per process, up to 280. -> A.
- I42 Fix: Redis (in-memory key-value server, local round trip well under a ms, single-threaded per command, runs small Lua scripts atomically). Race: two read tokens 1, both yes, both write 0. Read-refill-decide-write atomic via Lua; same as the lock around read-add-write in threads lesson (re-explain). Use Redis's clock (TIME) so disagreeing clocks don't fight. -> A; B voices "just read then write".
- I43 Latency: same rack tens to hundreds of microseconds; across regions tens of ms, so global limits split into per-region budgets. -> A.
- I44 Redis down: fail open vs fail closed; most fail open (limiter taking down the service is worse than none), keep crude local per-process limit as backstop. -> A, B weighs in.
- I45 Approximate is fine: batch 50 tokens at a time locally. Stripe post: per-user rate, concurrent requests, server-wide load shedder, backed by Redis. -> A.

## The Idea: LLM APIs

- I46 Limits on more than one axis since cost depends on tokens. Anthropic docs (as of October 2026, check): RPM; ITPM, for most models only uncached input counts, cached reads don't, so long repeated cached system prompt costs almost nothing; OTPM counted as generated, not max tokens. -> A.
- I47 OpenAI same, requests and tokens per minute, x-ratelimit-limit-requests, remaining-tokens headers. -> A, one line.
- I48 Anthropic docs: token bucket, continuously replenished not reset each minute; 60 RPM "might be enforced as 1 request per second"; bursts can 429 under per-minute. Per-minute limit is a refill rate; burst much smaller; gather over 20,000 = deepest burst there is. -> A; ties back to B's "I'm under the limit".
- I49 Story: 1) gather fires thousands first second, tiny burst, almost all 429. 2) SDK retries (both default 2, exponential backoff, honour retry-after); thousands, synchronized, most fail. 3) sleep(1) retry: no growth, no jitter, back exactly 1 s later together = figure 6 top panel; the waves. 4) Input tokens: 3,000-token uncached prompt -> ITPM is probably the real limit, not RPM. -> B tries to retell; A fills in.
- I50 Headers: anthropic ratelimit requests/input-tokens/output-tokens remaining, each with limit and reset, retry-after on 429. 529 overloaded_error = Anthropic overloaded for everyone, the 503 of this lesson, back off. 429 with error code enforced_spend_limit_reached = monthly spend cap, no retry-after, retrying won't help until reset or raised. Acceleration limits: sharp ramp-up limited on its own, ramp gradually. -> A.
- I51 Well-behaved client: cap concurrency with semaphore; Little's Law concurrency = rate x latency: 5 s requests, 600/min = 10/s -> about 50 in flight is most that helps. -> A with worked example.
- I52 Pace with own client-side token bucket per limit; estimate input tokens (count_tokens endpoint exact; about 4 characters per token for English); take that many from ITPM bucket, waiting not failing; leaky-bucket-as-queue idea. -> A.
- I53 Read headers, slow down when remaining low. On 429, 529, timeouts, connection errors retry: capped exponential, full jitter, at least retry-after, bounded attempts. No 400s. Prompt caching for shared prefix. -> A.
- I54 Don't need answers now: Message Batches API, up to 100,000 requests per batch, own separate limits, async, half price. Right tool for 20,000 offline judgments; backpressure handled by someone else. -> A; B reacts.

## Build It

- B0 Setup: folder workbench/ratelimit, venv, fastapi uvicorn httpx; raise open-files limit (macOS default 256; every connection is one). Server: 8 slots, 100 ms, counts waiting/finished/shed/limited, stats endpoint, MODE none/shed/bucket. Run with big backlog; restart between experiments. -> One-sentence setup plus what matters.
- B1 Load generator is open-loop: fixed rate regardless of server, like real users; closed-loop slows down with server and hides the effect; coordinated omission (p99 lesson). httpx default pool caps 100 connections and queues the rest = an unbounded queue of its own; remove the cap. Prints goodput, statuses, p99, server finished/still waiting. -> A; B asks why open vs closed matters.
- B2 Task 1: predict first; run 60, 80, 100, 120, 160, 240, restart each; record goodput, timeouts, p99, still waiting. Poll stats after 240: finished still climbing with every client gone; how long. Measure RSS before/after, divide by waiting = cost per queued request. -> A.
- B3 Task 2: token bucket in own file, lazy refill; try_take returns allowed + seconds until available; keyed limiter one bucket per key. Use monotonic clock not wall clock (clock syncs jump backwards, mint/destroy tokens). Wait = (n - t)/rate. Server bucket mode: key from x-api-key header, 429 with Retry-After rounded up. No lock needed in asyncio if no await between read and write; threads need one. Test: rate 5 burst 10, 15 calls tight loop: 10 yes, 5 no, waits about 0.2 s each (why same? derived answer: rejected calls take nothing and almost no time passes, each needs 1 token from near zero, 1/5 s); sleep 1 s, 5 back (derived). Then flood with rate 70 burst 20. -> A.
- B4 Task 3: shed at door (waiting >= 16 -> 503 Retry-After 1, bump shed); drop dead work at front (arrived time; after acquire, if waited > 0.8 s, release, 503, no work). Order: bucket check, queue check, wait, deadline check, work. Rerun sweep; MAX_WAITING 1000 with deadline off then on; which protects goodput? You need at least one. -> A; answer reasoning kept to "you need at least one, think about why", with hint.
- B5 Task 4: backoff_delay (attempt 0 up to base, 1 up to 2 base, capped; jitter = uniform in zero to that); call_with_retries retries retryable statuses (429, 500, 502, 503, 504, 529), timeouts, connection errors; honour Retry-After plus jitter; on_attempt hook; raise after max tries. Harness warms one connection per client first because macOS listen queue capped at 128 pending (somaxconn) regardless of backlog; 400 new connections would be dropped and retried by TCP a second later; kernel shedding at the door. Run with and without jitter; then honour Retry-After; predict what a fixed Retry-After does to 400 synced clients without jitter. -> A; B predicts (lockstep every second).
- B6 Task 5: polite LLM client: async token bucket that waits; n > burst treated as burst (else waits forever); semaphore + request bucket (small burst) + input-token bucket; estimate tokens, wait both, call under semaphore, retry 429/529/timeouts with full jitter at least retry-after, log remaining headers. Build against local bucket-mode server with client limits slightly below: zero 429s. SDKs retry by default (2): keep and pace, or max_retries 0 and own it; don't stack (the multiplication). with_raw_response to read headers; check docs. Optional real API 50 small requests, about 50 max tokens, costs cents, watch headers; limits on Console Limits page. Agent review for unbounded queues, unjittered retries, non-retryable retries, burst defeating the point. -> A.
- B7 Task 6 optional: Redis via brew; Lua script with Redis TIME, read tokens and ts, your part: refill capped, decide, subtract, write back, set expiry so idle keys vanish, return allowed + wait ms. register_script. Decide fail open or closed. -> A, short.
- B8 Done when: six load levels + watched dead work; bucket 429 with correct Retry-After, goodput near configured rate; shedding goodput near 80 at 240 and 480, p99 bounded; storm with/without jitter explained in a sentence; can say how LLM client decides when to send and why zero 429s. -> Folded into Measure turns, not read as list.

## Measure

- M1 Reference runs (M-series MacBook, 10 s floods, 1 s timeout): 60 -> 60 / 60, shed p99 105 ms. 80 -> 80. 100 -> unprotected 35.2, 648 of 1,000 timeouts, shed 81.0, p99 303. 120 -> 21.6, 984 of 1,200, shed 81.0, 306 ms. 160 -> 14.4, 1,456 of 1,600. 240 -> 11.2, 2,288 of 2,400, shed 81.6, 303 ms. 480 shed 81.6, 302 ms. Yours differ in details not shape. -> A says the shape and a few anchor rows, not the table.
- M2 One-line model: successes only in first C x (T - S) / (offered - C) seconds; at 120, 1.8 s -> 216, measured 216; at 160, 0.9 s -> 144, measured 144. Precise prediction = you understand the mechanism. -> A in words with worked example at 160.
- M3 p99 of successes looks fine (under 1 s) in collapsed runs since only fast ones count; dashboard of success latency looks reasonable while 90% fail; graph errors and timeouts next to latency. -> B catches it ("p99 looks fine though?").
- M4 Dead work: 240/s left about 1,500 queued, at 80/s almost 20 more seconds working for nobody = "stays broken" from Problem. 19 MB for 1,500, roughly 10-30 KB per waiting request. Scale: 10,000 req/s, 2x overload for a minute -> 600,000 queued x 20 KB = 12 GB; OOM crash too. -> A.
- M5 Shedding pins goodput at capacity: 81 not 80 because requests queued when sending stops finish just after and count; p99 = 100 work + 200 max queue. -> A.
- M6 Token bucket rate 70 burst 20 + shedding: 100/s -> 719 in 10 s; 240/s -> 717; bound 20 + 70 x 10 = 720; tightest constraint, exact. -> A.
- M7 Retry storm table: no jitter 3,323-3,516 attempts, 52-57 s; full jitter about 2,370, 7.2-7.5 s; ideal 5 s. Retry-After rows not measured; work out first. -> A.

## Break It

- K1 Four workers: bucket server with 4 workers at 400/s; each own dictionary, kernel spreads connections; 70/s becomes roughly 280/s; each also own 8-slot GPU; should be close to 4x; reason for Redis; same with replicas behind a load balancer. -> "what if" exchange.
- K2 Retry amplifier: flood retries immediately on timeout or 503, up to 3, no backoff, 100/s at unprotected; offered 1.25x capacity, server sees much more, never recovers until flood stops. Then backoff + jitter + retry budget (at most 10% of first attempts). -> exchange.
- K3 Bounded queue too big: MAX_WAITING 2000, deadline off, 240/s: back to collapse; 2,000 = 25 s of work; bound helps only if work inside can finish in time; size in seconds. -> exchange; B voices "but it's bounded".
- K4 Ignore client timeout: 30 s timeout, unprotected 120/s: everything "succeeds", goodput looks perfect; p99 about 5 s and growing with flood length; real users hit refresh = retry with no backoff; timeouts make the problem visible, not cause it. -> exchange.

## Explain It Back (substance must appear)

- E1 300 -> 600: queue grows 300/s; wait = length / drain; unbounded latency; past timeout everyone gives up; server works anyway to closed connections; throughput 300, goodput 0; retries add load; after batch stops, chews through dead backlog. -> In Problem callback near Measure / ending.
- E2 Shedding vs backpressure vs rate limiting: shedding protects from total overload (cheap 503s); backpressure makes producer match consumer via bounded queues (block or reject); rate limiting shares capacity per client. Real system uses all three: per-client limits at the edge, bounded queues with shedding inside, clients that respond to pushback. -> A after rate-limiting intro and again in ending.
- E3 Token bucket + why 600 RPM rejects 500 in first second: 600 RPM = 10/s refill; burst can be much smaller; per-minute may be enforced over shorter intervals; fix is pace with client bucket and concurrency cap, not fire and rely on retries. -> LLM section.
- E4 Backoff and jitter: less retry load the longer it struggles; multiplication across layers; jitter fixes synchronization spikes with idle gaps; 52 s vs 7.5 s vs ideal 5; even Retry-After needs jitter. -> Retry section.
- E5 20 replicas, 1,000/s per customer: per-process = 20,000 total; Redis keyed by customer, atomic Lua, Redis clock; one round trip sub-ms same datacenter; batch tokens (50); one Redis very roughly 100,000 simple ops/s (measure with redis-benchmark), shard keys, a customer's key always on the same shard; per-region budgets; fail open with local backstop. -> Distributed section (B asks the scaling question naturally).

## Go Deeper / Connections

- G1 Best sources: Jacobson and Karels 1988 paper; Marc Brooker's backoff and jitter writing; also SRE book overload chapters (optional). -> One closing sentence from A, before final exchange or skip.
- C1 Connections: builds on waiting-vs-working (semaphore, Little's Law), threads lesson's race; sets up p99 and load testing, load balancers, queues and logs, batching (inference server batches the queue instead of shedding). -> One sentence from A, near the end.

## Flow plan

1. Problem: open on the 20,000 judgments and the waves; B "but I'm under my limit"; A parks it. Flip to reranker backfill; B "twice as slow"; A: no, zero.
2. Origin: 1986 story, Jacobson; thesis.
3. Overload mechanics with fake LLM; Little's Law re-explained; throughput vs goodput; figure 1 spoken; measurements; Predict 1; figure 2 sliders; congestion collapse; "doesn't crash" correction.
4. Shedding, sizing in time, deadlines, LIFO, priority.
5. Backpressure, TCP window, semaphore, the chain, hidden unbounded buffers.
6. Rate limiting: who gets capacity; four algorithms; bucket figure; roundup; three-way distinction (E2).
7. HTTP: 429 vs 503, Retry-After.
8. Retries: storm math, three rules, Predict 2, figure 6.
9. Circuit breakers.
10. Distributed: Redis, race, latency, fail open, batching, scaling question (E5).
11. LLM APIs: back to the waves, retold; headers, 529, spend cap; polite client; Batches.
12. Build It, task by task, condensed setup.
13. Measure anchors and the one-line model; p99 trap; dead work; memory scale.
14. Break It four what-ifs.
15. Connections sentence, sources sentence, then ending: B restates, A sharpens.
