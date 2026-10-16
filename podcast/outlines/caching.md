# Outline: caching

Source: src/lessons/caching.mdx. Curriculum entry: "Caching and Redis." Question: when should you
cache, how long should things live (TTL), and how do caches go wrong? Why: the cheapest speedup
there is, and the source of the hardest bugs (stale data). Build: Redis in front of the inference
server for repeated prompts; measure hit rate and staleness.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: server and harness from the baseline lesson, async load generator from Waiting vs working; prefix caching is the GPU cousin. -> A, in passing, when the harness and the prefix cache come up. "Today" bullets skipped as a list; each is an item below.

## The Problem

- P1 Eval harness: 500 prompts, temperature 0, same model, every ranking-code change; GPU spends about 40 minutes re-deriving answers it gave yesterday. -> A opens on this scene.
- P2 Dictionary in front: key prompt, value answer; second run 4 seconds; genius for a week. -> A.
- P3 Bug 1: fine-tuned checkpoint, scores don't move; model not in key. -> A tells; B guesses the cause before A says it.
- P4 Bug 2: teammate at temperature 0.8 gets exactly one answer per prompt; temperature not in key. -> A.
- P5 Bug 3: Redis shared by 3 replicas, 1-hour expiry, 10:00 every morning (an hour after the 9:00 warm-up) GPU queue spikes to hundreds of requests for the same handful of prompts. -> A; B notices the hour arithmetic.
- P6 Each is a classic with a name and fix; cheapest speedup, most reliable way to serve something wrong with total confidence. -> A.

## Origin

- O1 1965 Maurice Wilkes, two-page paper "Slave Memories and Dynamic Storage Allocation": small fast memory automatically holding copies of what the processor used recently. -> A, story.
- O2 IBM System/360 Model 85, 1968, first commercial version, called it a cache; every CPU since. -> A.
- O3 2003 Brad Fitzpatrick, LiveJournal drowning databases in repeated reads, wrote memcached: big hash table in RAM across spare machines; Facebook later ran it at scale and wrote up what broke. -> A.
- O4 2009 Salvatore Sanfilippo, LLOOGG real-time analytics too slow on MySQL, wrote Redis: like memcached but lists, sets, data structures, can save to disk. -> A.
- O5 Phil Karlton (Netscape) quote: two hard things, cache invalidation and naming things. Fast is easy, knowing when answers stop being true is not. -> A; B recognises the quote.

## The Idea: a cache is a bet

- I1 Cache: small fast store with copies of results from a bigger slower source. A bet you'll ask again soon. Hit: skip slow work. Miss: full slow cost plus the small check cost, usually store the result. -> A, terms inline.
- I2 Temporal locality (from latency lesson): reuse what was used recently; people do too; a prompt sent a second ago more likely to come again than one from last month. -> A, re-explained briefly.
- I3 Popularity reason, stronger: rank requests by frequency; lopsided; most popular twice the second, three times the third. Zipf distribution; skew exponent s; s zero = all equal, bigger = top takes more. -> A explains in words, no formula read; B asks what the exponent knob does.
- I4 Measured simulation: 10,000 items, 200,000 requests, LRU from empty. At s=1.0: 1% of items (100) -> 39%; 10% (1,000) -> 67%, two thirds. Uniform: 10% holds -> 10%. Also s=1.2 tiny 0.1% cache -> 34%; s=0.8 10% -> 44%; 50% cache at s=1 -> 89%. -> A gives the key cells as a story, not a table; B voices wrong model "so a cache of ten percent gives ten percent".
- I5 The workload decides whether a cache helps, not the cache; look at how often requests repeat first. -> A, punchline.

## One idea, many layers (Figure 001)

- I6 Figure 001 network row: browser HTTP cache about zero ms; CDN edge about 5-30 ms; app memory dict/lru_cache about a tenth of a microsecond; Redis shared in RAM about 0.1-1 ms; the slow thing (database, other API, LLM) 10 ms to 20 s. Each stop asks "do I have a copy?" else ask the next. Machine row: L1/L2 KB-MB about 1-4 ns; L3/SLC tens of MB 10-20 ns; RAM GB about 100 ns; page cache about microseconds; SSD TB 50-100 µs. Rough orders. -> A describes as two rows over the phone, with comparisons.
- I7 Who copies what: CPU caches copy RAM; page cache copies SSD; dict/lru_cache copies function results; Redis copies DB/model results shared by all processes; CDN (term: thousands of servers worldwide holding copies near users) copies responses near the user; browser copies on user's disk; KV cache and prefix cache copy attention keys and values. -> A.
- I8 Four questions: what is the key; how long to trust (TTL, invalidation); when full what leaves (eviction); what happens on a miss, especially many at once (stampedes). -> A, signposts the episode.
- I9 Who answers: CPU in silicon, kernel in C, CDN via HTTP headers; at the app layer you answer them in code and get them wrong as in the Problem. -> A.

## The arithmetic

- I10 Hit rate term; effective latency = hit fraction times hit cost plus miss fraction times miss cost. -> A in words, no symbols.
- I11 Redis hit about 1 ms, miss about 2,000 ms. 0% -> 2,000 ms; 50% -> 1,000 ms, 2x; 90% -> 201 ms, 10x; 99% -> 21 ms, 95x. -> A walks a worked example; B works one out.
- I12 90 to 99: nine more points, ten times faster; misses dominate; miss is 2,000x hit; average about miss rate times miss cost. Think in miss rate: 10% to 1% misses is 10x. -> B voices "nine points is small" wrong model, A corrects.
- I13 Hit cost close to miss cost: useless at any hit rate (2 ms DB query behind 1 ms Redis saves at most half). Terrible hit rate makes things slower, every miss pays lookup. -> A.
- PR1 Predict p50/p99: 70% hits, 1 ms vs 2,000 ms. Without cache both about 2,000. With: p50 about 1 ms (2,000x), p99 still about 2,000 ms. p99 only drops when miss rate below 1%. Typical magical, worst unchanged. Fan-out makes p99 what users feel (tail-latency lesson). Indirect win: on one-at-a-time GPU, hits aren't in the queue, so misses wait less. -> A asks, B guesses p99 improves too (wrong), A reveals with sorting picture.

## Four ways to wire it in (Figure 002)

- I14 Cache-aside (lazy): app gets, on miss queries source, sets. Figure: steps 1 GET miss, 2 query, 3 set. Cache knows nothing about sources. Pros: simple, any KV store, cache dies -> still works slowly. Cons: every caller must remember the dance; miss costs three steps. What you build today. -> A.
- I15 Read-through: cache owns the loader; callers only ask the cache. functools lru_cache is read-through; CDNs too (edge fetches from origin on miss). Loader in one place, natural place to make only one caller load a key. -> A.
- I16 Writes question: when data changes, who updates the cache? -> A signpost.
- I17 Write-through: write to cache and source, OK only after both; slower writes, fresh reads. Write-behind / write-back: OK at once, flush later in batches; crash can lose writes the caller thought saved. CPU caches and page cache are write-back: write returns before bytes hit SSD, which is why fsync exists. -> A, re-explaining the files lesson.
- I18 LLM responses have no writes; the model never changes an answer behind your back, only you change the model; cache-aside with careful key. Write patterns matter once users can edit. -> A.

## TTLs

- I19 Copy is a snapshot; source may change; cache can't notice. TTL = time to live, how long an entry may be served; after that counts as missing; Redis set with an EX of 3,600 = gone in an hour. -> A, command said as words.
- I20 TTL is a promise about staleness: at most an hour out of date. Business question in a technical costume. -> A.
- I21 Three questions: how wrong for how long before someone is hurt (stock price seconds, product description an hour, permissions after being fired zero -> TTL alone wrong tool); how often does source change (once a day gains nothing from 10 s TTL but misses); what does a miss cost (2 ms query: short TTL cheap; 2 s GPU: long TTLs plus another way to handle change). -> A, with B pushing on the fired-employee one.
- I22 LLM cache: source never changes until you change model or template; TTL long (days); correctness from the key, not the clock; TTL bounds memory and cleans up keys nobody asks for. -> B voices "TTL keeps it fresh" wrong model, A corrects.
- I23 Jitter: 3,600 plus or minus random 10%; otherwise a burst stored together expires together = the 10:00 spike. -> A ties back to Problem.
- I24 Negative caching: cache "not found" briefly; missing user ID asked 1,000/s otherwise every one hits the DB. -> A.

## Invalidation

- I25 Invalidation term: remove/update copy when source changes; hard: right moment, everywhere, no races. Usual recipe: write DB, then delete key; next read refetches. Sounds airtight, isn't. -> A.
- PR2 Predict race: R misses, reads OLD value; W writes new; W deletes key (nothing there); R, slow (GC pause, busy thread), sets old value. Stale forever / until TTL because invalidation already happened. "Always set a TTL even if you invalidate": TTL is the backstop. Fixes: set only if no invalidation in between (Facebook leases), versioned keys, delete again a bit later. Two copies = distributed-systems problem with races, not a line of code. -> A sets up, B attempts and finds the ordering with help.
- I26 Knowing every key a change affects (user renames: which pages, search results, recommendations?). Escape: version in key, answer v3 plus hash; bump to v4; old keys never asked again; TTL/LRU clears. Memory for correctness. LLM cache whole strategy: model, weights revision, template version in key. -> A.

## Eviction

- I27 Eviction vs expiry: evicted entry may still be valid. Eviction policy. Bélády's optimal (1966): evict what's needed furthest in future; unknowable; every policy guesses future from past. -> A.
- I28 LRU: recency; cheap, adapts, default everywhere; weakness: one big scan (batch job reading 100,000 keys once) pushes out hot entries. -> A.
- I29 LFU: frequency; resists scans; slow to forget (yesterday's viral prompt); practical LFUs decay counts. -> A.
- I30 ARC (Megiddo and Modha, IBM, 2003): recency list, frequency list, ghost lists of evicted keys, shifts space based on which ghosts are asked for again; in ZFS. W-TinyLFU in Java's Caffeine admits a new entry only if more popular than what it would push out. -> A.
- I31 FIFO and random often within a few points of LRU; Redis samples a handful and evicts the oldest. -> A.
- F3 Figure 003 interactive: LRU over 200 Zipf keys; stream of filled hits, outlined misses, crossed expired; sliders skew, size, TTL; bottom chart: hit rate vs size curve with dashed ideal top-k line. Try skew 0; skew 1.5 size 5; TTL 100 even key 1 refetched. TTL counts from write, like Redis. -> A describes what you'd see as you drag.
- I32 Curve bends early: at skew 1.0 first 20 slots give most of the win; doubling a cache on the flat part buys little; sizing is a question for the curve. -> A.
- I33 LRU below ideal: compulsory (cold) miss per distinct key; LRU keeps unpopular keys recently asked; that gap is what LFU and ARC fight over. -> A, term inline.
- I34 TTL lowers the whole curve; even key 1 thrown out every TTL; hot keys deserve care on expiry. -> A.

## Building LRU (Figure 004)

- I35 Need get, set in constant time and instant least-recently-used. Dict: O(1) find, no order. List: order, O(n) find. Use both, pointing at each other. -> A, "constant time" explained in words.
- F4 Figure 004: map column of keys each pointing into a list: HEAD, a, c, d, b, TAIL; most recent left; b at the right "evict next"; a "just used"; nodes carry expiry; HEAD and TAIL empty sentinels so no empty-list special case; hit = unlink and relink at front, four pointer updates. -> A over the phone.
- I36 Node: key, value, expiry, prev, next. get: missing -> miss; expired -> unlink, delete from map, miss; else move to front, return. set: exists -> update and move front; else new node at front, add to map, over capacity -> take node before TAIL, unlink, delete its key from map. -> A.
- I37 Why doubly linked: unlinking needs predecessor; with forward pointers only you walk from HEAD; prev makes it O(1). Why node stores key: at eviction you start from the node and must delete the map entry. -> B asks why doubly (genuine), A answers.
- I38 TTL checked lazily at get; unasked expired entry sits until LRU pushes it out; Redis does that plus background sweep. -> A.
- I39 OrderedDict is this structure in C (move_to_end, popitem from the front); used by prefix cache lesson. Build once by hand. Hand-written Python get about 0.15 µs vs 0.03 µs for dict get; both rounding error next to 1 ms round trip. -> A.

## The stampede (Figure 005)

- I40 Hot key, team dashboard prompt, 200 reads a second, all hits; TTL runs out; for the 2 s recompute, every request misses and sends its own copy to the model. -> A, the 10:00 spike explained.
- F5 Figure 005: top: hits band, TTL expires line, row of misses each with arrow down to backend, "N identical calls queued behind one GPU". Bottom coalesced: one miss makes one call, later ones wait, then all answered, cache refilled, hits. -> A.
- I41 Cache stampede term (thundering herd, dog-piling). Web: knocks over DB. Your server worse: GPU lock serialises, 400 identical misses -> the 400th waits 400 full generations though answer was ready after the first. -> A; B voices "isn't it just 400 small requests".
- I42 Request coalescing (singleflight in Go): table of in-flight keys; later misses wait for the first's result. asyncio: dict from key to a future, about ten lines. One process only; three replicas still three calls. -> A, "future" explained.
- I43 Lock in shared cache: set lock key with NX (only if absent) and PX ten thousand (expire in 10 s so a crashed holder can't block forever); winner recomputes, losers wait and re-check. Works across fleet; more moving parts. -> A, command in words.
- I44 Jittered TTLs: doesn't stop one hot key's stampede; stops many keys expiring together. -> A.
- I45 Stale-while-revalidate (HTTP Cache-Control extension, RFC 5861): soft expiry earlier than real one; after it, first reader triggers one background refresh, everyone keeps the old value until the new one lands; nobody waits; cost: answers a bit past TTL, already acceptable if caching. -> A.
- I46 Probabilistic early refresh: as entry nears expiry, each reader recomputes early with small probability growing toward the deadline; one reader refreshes before the cliff; XFetch paper. -> A.

## Redis

- I47 Redis term: in-memory data structure server, separate program, keys to strings, hashes, lists, sets, sorted sets in RAM, commands over TCP. Commands like SET with EX, GET, INCR counter, ZADD leaderboard. Few microseconds of work; round trip dominates, about 0.1 ms on one machine. -> A; numbers compared.
- I48 Single-threaded where it matters: one thread, event loop like Waiting vs working (asks kernel via epoll which sockets have commands, runs each to completion, replies, repeat). Since Redis 6 extra threads for socket I/O; execution stays one thread. Consequence 1: every command atomic for free; INCR can't race. Consequence 2: one slow command (KEYS star on ten million keys, huge SORT) blocks every client, like a blocking call in async def. Fast because each command is tiny, not because it does many at once. -> B voices wrong model "it must be heavily multithreaded to be that fast"; A corrects; event loop re-explained.
- I49 Data structures: hashes (a little dict under one key), lists (queues), sets, sorted sets (members with scores; leaderboards, priority queues, sliding-window rate limiters), streams (append-only logs), counters, bitmaps, HyperLogLog (approximate distinct count). Rate limiter could live in Redis shared by replicas. -> A.
- I50 Expires and evicts: TTL on any key; lazy removal plus background job sampling keys with TTLs several times a second. maxmemory and maxmemory-policy; default noeviction refuses writes with error: right for a database, wrong for a cache; set allkeys-lru or allkeys-lfu. Approximate LRU: sample 5 by default, evict best; close to true LRU, saves two pointers per key. -> A.
- I51 Persistence term: RDB snapshots via fork; child writes dataset while parent serves; copy-on-write shares pages until parent modifies one; crash loses since last snapshot. AOF: append every write, appendfsync always / everysec / no, durability-for-speed trade like fsync. Pure cache: turn persistence off. A cache must be safe to lose; if deleting Redis loses something that exists nowhere else, it's a database. -> A, fork and copy-on-write re-explained in plain words (OS gap); B asks "doesn't the copy double memory?".
- I52 License: 2024 Redis more restrictive license; Linux Foundation forked last open version as Valkey, offered by major clouds; Redis later added AGPL option; same protocol and commands; check current state for work. -> A, briefly.

## Caching LLM responses

- I53 Two caches called "prompt caching". Prefix cache reuses KV cache for the shared beginning inside the GPU; model still runs, generates every output token; exact by construction; works on partial matches. Response cache in front skips the model; returns stored text; thousands of times cheaper on hit; needs whole request to match. -> B voices confusion "isn't that what prefix caching is"; A separates. KV cache re-explained briefly.
- I54 Exact-match key: hash of everything that changes the output: model ID and revision (weights hash, checkpoint path, bumped version); chat/prompt template version and any system prompt; all messages in order, tools, response format; every sampling param (temperature, top p, top k, max tokens, stop, seed, penalties). -> A; B's wrong model: "the key is the prompt".
- I55 Canonical string: JSON with sorted keys and no whitespace so the same request gives the same bytes; SHA-256; "llm v1" prefix plus 64 hex chars; about 5 µs on the Mac for a 2,000-char prompt; free. -> A.
- I56 Why paranoid: leave out max tokens and a 16-token request gets a stored 512-token answer, or the reverse, truncated; leave out revision and you evaluate the old model forever. -> A.
- PR3 Predict temperature: key includes temperature; same prompt 5 times at 0.8 for brainstorming -> same answer 5 times; temperature in key prevents temp-0 answers but can't give fresh randomness. At temp 0 replay correct, even more consistent than GPU (greedy can differ between runs because batching changes the order of floating-point additions). At 0.8 request asks for a sample; cache turns a distribution into a point; breaks best-of-n, self-consistency voting, pass at k evals, brainstorming. Policies: only cache temp 0 or seed set (seed in key); opt-out header; store several samples per key and hand out in turn. Pick on purpose. -> A asks, B answers "including temperature fixes it" (wrong), A reveals. "Distribution" explained (diagnostic gap: output distribution).
- I57 Only store complete successful answers: not errors, timeouts, or streams broken by client hangup; check finish reason. -> A.
- I58 Streaming still works: replay stored text as SSE events (server-sent events re-explained); TTFT on a hit becomes a millisecond, looks wonderful on the scoreboard, means nothing about the model; label cached runs separately. -> A.
- I59 Privacy: exact-match only returns to someone who sent exactly the same text; fine; danger comes with semantic caching. -> A.
- I60 Semantic cache: exact misses "What's the capital of France?" vs lowercase version. Embed prompt (embedding: list of numbers, similar meaning lands close; bi-encoder retrieval machinery), nearest cached prompt (vector search lesson), return if cosine similarity (score -1 to 1, 1 same direction, real text about 0 to 1) above threshold like 0.9. -> A.
- I61 Raises hit rate on paraphrases; returns wrong answers confidently; embedding trained so texts about the same thing land close. all-MiniLM-L6-v2: ibuprofen safe vs unsafe in pregnancy 0.979; 5 miles to km vs 5 km to miles 0.987; 2+2 vs 2+3 0.887. Real paraphrases: capital of France vs France's capital city 0.918; "How many kilometers is 5 miles?" vs miles-to-km 0.825. Topic similarity is not answer equivalence; cross-encoder exists because bi-encoder similarity is rough. -> A gives pairs, B reacts to ibuprofen; ties to his ranking work.
- F6 Figure 006: cached "Convert 5 miles to km" -> 8.05 km. Scale 0.70 to 1.00. Paraphrases "5 miles in kilometers?" 0.812, "How many km is 5 miles?" 0.825 should hit; "Convert 5 km to miles" 0.987 must miss. Threshold 0.80: all three hit; 0.95: only the impostor hits. -> A describes; B: "so raising the threshold makes it worse".
- I62 Use semantic only where near-miss harmless (FAQ bots with fixed answers), high threshold, scope per user/tenant (else one customer's answer to another), measure false-hit rate on real traffic. Exact match is boring and correct. -> A.

## Build It

- B0 Task 0: Redis in Docker on Spark (ARM64, multi-arch image) or Mac; flags: no snapshots, no AOF, 512 MB cap, allkeys-lru = pure cache; ping returns PONG; set hello with 10 s expiry and watch TTL count down; redis-benchmark get/set 100,000; apt install alternative; rerun with pipelining 16 (16 commands sent before waiting); difference is the round trip, the real cost. -> A, setup in a couple of sentences, the pipelining point given room.
- B1 Task 1: LRU + TTL by hand, dict plus own doubly linked list, no OrderedDict/functools; injectable clock so tests move time without sleeping; node with slots; constructor: capacity, default TTL, clock, map, two sentinels linked, counters hits/misses/evictions/expirations; unlink, push front; get and set semantics; length. -> A, what's built and the part that matters.
- B2 Starter tests: evicts LRU (a, b set; get a; set c; b gone); TTL expires at 4.9 vs 5.0 with fake clock and expired entries actually removed (length zero). -> A in words.
- B3 More tests: overwrite moves to front and doesn't grow; per-key TTL overrides default; storing None distinguishable from a miss (sentinel default); capacity 1; counters right. Randomized test: 20,000 random gets/sets over keys 0-19 against a 10-line OrderedDict reference, compare after every step. Hints: unlink two lines, push front four; common bug forgetting to delete from the map on evict/expire, found within a few hundred ops; pytest quiet. -> A.
- B4 Task 2: key function first, ten lines, all correctness lives there; KEY_VERSION v1 bump when format/template changes; include model + revision, messages, every sampling param with defaults filled in so missing field = its default; exclude stream, request ids, user agent; canonical JSON; cacheable policy: temperature 0 or seed given. Tests: key order same; temperature, max tokens, one char, revision differ; adding stream doesn't. -> A; B asks why fill defaults (genuine).
- B5 Proxy: listens on 8001, forwards to 8000, cache-aside; scaffold gives replay of stored SSE lines and forward that streams and collects data lines; TTL default three days. Endpoint yours: not cacheable -> forward with x-cache bypass; hit -> replay with x-cache hit; miss -> stream forward, store only if finish reason and DONE seen, with jitter; Redis down or slow (50 ms timeout) -> treat as miss, serve upstream; cache outage must not be a site outage. Store step at end of a wrapper generator so it runs only if the client stayed. Check with curl twice, x-cache header, timing, scan keys, TTL. -> A.
- B6 Task 3: Zipf generator: 500 distinct prompts (10 topics, variants), 1,000 requests, s=1, seed 0, max tokens 32, temperature 0. Simulate ids through LRU at 10, 25, 50, 100, 250, 500. Real run: LOCAL_CAPACITY in-process tier so capacity in entries; harness at concurrency 4, record latency and x-cache; capacity 50 and 250 plus no-cache on first 200; misses about 2-3 s each, runs tens of minutes; use fake slow LLM for the whole curve, keep GPU for two points. Then Redis, INFO stats keyspace hits/misses. Agent review: coordinated omission (measure from when meant to send, not sent), first request per prompt = compulsory miss. -> A; coordinated omission re-explained.
- B7 Task 4: fake upstream sleeps 2 s, counts calls, stats endpoint; TTL 5 on proxy; one request fills; sleep 5.5 s; fire 200 concurrent identical; print upstream calls, p50, max. Expect about 200. Coalescing: module-level inflight dict key -> future; await if present, else create, call, store, set result, remove in finally; waiters need full response, buffer first caller's stream. Rerun: 1. Then 4 workers: predict. Redis lock set NX PX 10,000; winner computes; others poll every 50 ms until value or lock expiry. With coalescing all 200 wait about 2 s; against real GPU without coalescing last waits about 200 times 2 s = 400 s. -> A; B predicts the 4-worker count.
- B8 Task 5: sentence-transformers, all-MiniLM-L6-v2 or own bi-encoder; list of normalized embedding, prompt, answer; lookup = dot product with all, best above threshold. Test set about 30 pairs half each: paraphrases; traps: swap entity (Austria/Australia, Java island/language), flip negation, swap units/direction, change a number. Thresholds 0.80, 0.85, 0.90, 0.95: fraction of paraphrases hitting and of traps hitting. Find a trap that hits at a threshold where most paraphrases miss. Agent may explain the library and cosine math; test set and conclusions yours. -> A.
- B9 Done when: tests pass incl randomized; repeated temp-0 request hit in a few ms and changing temperature/max tokens/revision misses; stopping Redis makes proxy slower not broken; tables filled, simulated vs measured within a couple of points; stampede about 200 -> 1 -> 1 with lock across 4 workers; a trap pair with its score. -> A, as "you know you're done when", compressed into a few sentences.

## Measure

- M1 Redis: benchmark GET without pipelining, with 16, one Python round trip. Expect tens of thousands to a couple hundred thousand per second without, several times more with, single round trip about 0.1-0.3 ms. Gap is the round trip: Redis can do far more per second than one connection can feed one at a time; latency vs bandwidth. -> A, with B's question on why pipelining helps.
- M2 Hit rate vs size, 500 prompts, 1,000 requests, s=1: ideal top-k share 10 -> 0.43, 25 -> 0.56, 50 -> 0.66, 100 -> 0.76, 250 -> 0.90, 500 -> 1.00. Reference sim with 2,000 requests seed 0: LRU 0.24, 0.39, 0.52, 0.64, 0.78, 0.81. With 1,000 yours a bit lower (compulsory misses bigger share). Ceiling: 1 minus distinct seen over requests; 373 distinct in 2,000 -> 0.81. Measured should match sim within a couple of points; concurrency 4 shifts order slightly; if not, key function wrong. -> A says a few numbers, not every cell.
- M3 Latency: p50 collapses to ms once hit rate passes 50%; p99 stays at miss latency. Mean roughly matches formula, but misses with cache on are faster than without: at concurrency 4 behind GPU lock, a miss waits behind other misses; half answered from cache -> shorter queue. Redis hit p50 a millisecond or two higher than local LRU (round trip plus Python client), worth it for shared cache. -> A; B asks why the misses got faster.
- M4 Stampede: author's Mac run, 1,000 concurrent tasks, 200 ms fake backend: 1,000 calls without, exactly 1 with, same wall time because fake backend unlimited parallelism. Yours doesn't serialise either; call count is the point. Real GPU: 200 calls -> last waits about 200 times 2 s, nearly 7 minutes, for an answer ready after 2 s. 4 workers in-process coalescing -> 4 calls, the limit. -> A; B's 4-worker prediction lands here.
- M5 Semantic: both columns fall together as threshold rises; some traps score higher than some paraphrases; no threshold separates them; similarity measures topic, not same answer. -> A.

## Break It

- K1 Drop max tokens from key: 8-token then 256-token request; second gets the 8-token answer in a millisecond. Ignore model revision, swap model, answers from old model, scores don't move. Most common cache bug in ML infra; fix is version-in-key, not a better TTL. -> A/B "what if" exchange.
- K2 Expire all at once: warm 200 prompts in a burst, fixed 60 s TTL, no jitter, steady traffic; at 60 s hit rate falls off a cliff, wall of misses. Plus or minus 10% jitter: misses spread over 12 seconds. -> exchange; B derives the 12.
- K3 noeviction: maxmemory 2 MB noeviction; writes fail with an out-of-memory "command not allowed" error; proxy should still serve (failed cache write is not a failed request) or returns 500? Switch to allkeys-lru, watch evicted keys climb in INFO stats. -> exchange.
- K4 Scan through small LRU: cyclic 1..60 repeated, capacity 50: hit rate zero, not low; each prompt evicted just before it returns; the 50 most recent are the 50 you won't need next. Capacity 60 -> nearly 100%. Same failure as prefix cache with round-robin system prompts; why databases and LFU/ARC treat scans specially. -> B guesses "about fifty out of sixty", A reveals zero.

## Explain It Back (content must appear)

- E1 Why caches work: requests repeat unevenly; temporal locality; Zipf; small fraction of items answers large fraction. Don't work: rarely repeat (uniform: hit rate = size over items), hit not much cheaper than miss, data changes faster than staleness tolerated. Check repetition first. -> covered by I2-I5, I13, I21; B restates part in the ending.
- E2 90% to 95% is about 2x; average about miss rate times miss cost; 10% to 5% halves; 1% cuts 10x. p50 already at hit speed at 90%; p99 at miss speed until miss rate under 1%; for tail, need 99%+ or faster misses. -> A explicitly does the 95% case in the arithmetic section (B as boss scenario).
- E3 LLM cache design: cache-aside, hash canonical whole request, Redis, store complete answer with long jittered TTL; key contents; only temp 0 or seeded; complete successful only; fail open; coalescing; separate from prefix caching. -> covered across; A sums in the LLM section.
- E4 Stampede and fixes: coalescing, Redis lock SET NX PX, jitter, stale-while-revalidate, probabilistic early refresh. -> covered I40-I46.
- E5 Scale to 50 replicas, 10,000 req/s: per-process caches = 50 copies with a fiftieth the reuse each -> shared tier; Redis Cluster splits keys across 16,384 hash slots so capacity and throughput grow with nodes; one node about 100k simple ops/s so 10k/s fine; memory: 2 KB responses times 10 million = 20 GB plus overhead, a few nodes; hot keys: one popular prompt maps to one node, can saturate it; fix two-tier (small in-process cache on each replica with short TTL in front of Redis); coalescing across machines (Redis lock) else 50 copies to GPUs; fail open with tight timeouts; route similar prompts to same replicas for the prefix cache. -> A and B work it as a scaling conversation late in the episode.

## Go Deeper / Connections

- G1 Best sources: "Scaling Memcache at Facebook" (NSDI 2013) and the ARC paper; mention XFetch, Go singleflight source. -> A, one or two sentences near the end.
- C1 Connections: Redis single thread = event loop from Waiting vs working, slow command = blocking call in async def; prefix cache sits behind it, both live or die by key; tail latency explains p99; load balancers why shared Redis beats 50 dicts; rate limits other half of protecting GPU, a stampede is a flood you caused; vector search is what semantic cache runs on; queues is where write-behind becomes a design. -> A, one or two sentences.

## Flow

1. Problem scene (P1-P6), B guesses a bug cause.
2. Origin (O1-O5).
3. Bet, locality, Zipf, measured numbers (I1-I5).
4. Layers figure (I6-I9), signpost four questions.
5. Arithmetic, miss-rate thinking, 95% boss case, p50/p99 Predict (I10-I13, E2, PR1).
6. Four wiring patterns (I14-I18).
7. TTLs (I19-I24), invalidation race Predict and versioned keys (I25-I26, PR2).
8. Eviction, sim figure, LRU build structure (I27-I39).
9. Stampede and fixes (I40-I46).
10. Redis (I47-I52).
11. LLM response caching, temperature Predict, semantic cache (I53-I62).
12. Build It walk (B0-B9).
13. Measure (M1-M5).
14. Break It (K1-K4).
15. Scaling conversation (E5), then sources/connections (G1, C1).
16. Ending: B restates core idea, A sharpens, stop.
