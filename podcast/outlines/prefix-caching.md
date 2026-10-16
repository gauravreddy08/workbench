# Outline: prefix-caching

Source: src/lessons/prefix-caching.mdx. Curriculum entry: "Paged attention and prefix caching."
Question: how do servers share KV cache between requests with the same prefix, and when do they evict
it? Why: system prompts and chat history repeat constantly; reusing them cuts time to first token.
Diagnostic gaps touched (CLAUDE.md): Numbers (bytes, memory sizes) -> the 128 KiB per token and the
16 GiB reservation math must land as felt numbers. Memory math for models -> same. Why decoding is
memory-bound -> B voices "so caching speeds up decode too", A corrects. KV cache idea he got right,
so recap fast. Load balancer state he got right -> lean on it for routing.

Each item: what the lesson teaches -> how it is said aloud.

## Prerequisites (re-explained inline)

- R1 Baseline server, harness, SCOREBOARD from the baseline lesson; prefill of 2,000 tokens on Spark is on the order of a second. -> A in the opening scene, as "you measured it".
- R2 Virtual memory: RAM cut into 4 KiB frames, per-process page table, frame handed out on first touch, pages shared and copied only on write (fork, copy-on-write). -> A re-explains in two or three sentences before the PagedAttention mapping.
- R3 KV cache recap: query, key, value per token per layer; new token's query compared with every earlier key, values mixed; cache keeps K and V so each decode step computes only one token's worth. -> A, short, B confirms he knows it.
- R4 Decode is bandwidth-bound (each step reads all weights plus KV); prefill is compute-bound. -> A, in the TTFT section.
- R5 Load balancer state / sticky sessions. -> A, in routing.

## The Problem

- P1 Agent system prompt ~2,000 tokens (tools, rules, worked examples), never changes; each step sends it plus conversation plus one new line. -> A opening scene.
- P2 Server prefills all 2,000 every time, computes the same K and V, uses once, throws away; about a second of TTFT per agent step to rediscover what it knew. -> A.
- P3 Chat is worse: turn 10 resends turns 1-9; repeated work grows each turn. -> A.
- P4 Second problem, memory: batching needs room per request; unknown answer length; obvious design reserves the longest; most use a fraction; GPU fills with reserved empty memory; far fewer users fit. -> A, B asks why not just size it right.
- P5 Same fix for both: cut KV into small fixed-size blocks, table of where each lives, requests point at the same block when tokens match. -> A as signpost.

## Origin

- O1 2023, UC Berkeley, Woosuk Kwon, Zhuohan Li, Ion Stoica's lab; measured existing servers: only 20 to 38 percent of reserved KV memory held tokens; rest reserved-for-later or stranded in gaps; memory not compute capped concurrency. -> A as story.
- O2 Fix from OS textbook: since the 1960s, illusion of contiguous memory stored in fixed-size pages scattered in RAM, tracked by page table; PagedAttention. -> A.
- O3 vLLM June 2023; paper at SOSP that fall; 2 to 4 times throughput at same latency. -> A.
- O4 Then cross-request reuse: vLLM automatic prefix caching; January 2024 SGLang (Lianmin Zheng, Ying Sheng, LMSYS) RadixAttention, tree; APIs: DeepSeek, Anthropic August 2024, OpenAI October 2024 charge less for cached input. -> A.

## The Idea: KV size

- I1 Llama 3.1 8B bf16: 32 layers, 8 KV heads, 128 wide, 2 bytes; times 2 for K and V = 131,072 bytes = 128 KiB per token. -> A walks multiplication in words, small steps.
- I2 GQA term: many query heads share fewer KV heads; 32 query heads, 8 KV heads, cuts KV 4x. -> A inline.
- I3 2,000-token prompt about 256 MiB; full 128k context 16 GiB, same as weights; remember 128 KiB per token. -> A with comparisons.
- PR1 Predict reserve-waste: 16 users, 8,192 reserved each, average 1,000 used. Reserved 16 GiB, used about 2 GiB, about 87 percent empty; 80 GB GPU with 16 GB weights and 64 GB KV fits 64 users vs about 500. -> A asks, B works it partly, A reveals.

## Reserving the worst case

- W1 Three wastes: reserved for later; internal fragmentation (leftover inside slab, 8,192 reserved, 1,000 used, 7,192 wasted); external fragmentation (gaps between slabs, enough total free but no hole big enough). -> A, with the names given after the intuition.
- F1 Figure 001: top, S1 and S2 slabs, used 200 of 600, free hole 160, S3 needs 220 and is refused though 400 empty; bottom, 16-token blocks anywhere, waste only the part-full last block, S3 fits with 15 blocks still free. -> A describes like over the phone.
- W2 Virtual memory recap and "PagedAttention is that, for KV caches". -> A (R2).

## PagedAttention

- PA1 KV blocks: 16 tokens each (vLLM default); 8B block = 2 MiB; startup allocates one pool from leftover memory, free list. -> A.
- PA2 Block table per sequence: logical block 0 (tokens 0-15) in physical 7, logical 1 in physical 1; when last fills, grab any free block, append; no advance reservation, no neighbours needed. -> A.
- PA3 New code: attention kernel normally assumes contiguous keys; PagedAttention kernel takes block table, looks up each block before reading; small indirection cost, same deal as CPU page tables; waste under one block per sequence, paper under 4 percent. -> A; B asks about the cost.
- PA4 Translation table: process->sequence, page 4 KiB->16-token block, frame->physical block, page table->block table, lazy allocation->allocate when last fills, fork+COW->shared blocks+COW. -> A says the mapping as a short run of pairs, not a table.

## Sharing inside one request

- S1 Parallel sampling (n parameter): four samples of 2,000-token prompt; naive stores four copies of 256 MiB; blocks: all four tables point to same prompt blocks, reference count 4. Term reference count defined. -> A.
- S2 The write problem: last prompt block partly full; 2,000 is 125 full blocks exactly but 2,008 leaves 8 tokens in block 125 and 8 empty slots; each sample writes a different token. -> B raises the conflict.
- S3 Copy-on-write: before writing into a block with count above 1, copy to fresh block, repoint, decrement old; full prompt blocks stay shared forever. -> A.
- F2 Figure 002: two samples of a 40-token prompt; logical 0 and 1 of both point at P7 and P1, ref 2; logical 2 partly prompt partly output; on sample 2's first write P3 copied into P5. -> A describes.
- S4 Beam search: keeps k best partial answers, extends, keeps best k; beams split and die, histories overlap; dying beam decrements counts; zero goes to free list; paper reports large savings. -> A.
- PR2 Predict n4-memory: 2,008-token prompt, 4 samples of 256: naive 2,264 tokens = 141.5 -> 142 blocks each, 568 blocks, about 1.1 GiB. Shared: 125 full + 4 copies of block 125 (three copy, last writes original) + 4 x 16 = 193 blocks, about 386 MiB, a third. -> A asks, B attempts naive part, A walks shared part.

## Prefix caching across requests

- X1 The leap: different users share system prompt, few-shot examples, document, history. -> A.
- X2 Why only prefixes: token i's KV at layer 2 depends on layer 1 output at i, which via attention depends on every earlier token; RoPE makes keys depend on position; causal mask means nothing after matters. So KV of token i is a function of tokens 0..i at positions 0..i. -> A; B voices "why not reuse the document anywhere it appears".
- X3 Rule: if two prompts agree on first n tokens, KV for those n is identical, not similar, up to floating-point rounding; skip prefill for those n. -> A.
- PR3 Predict middle-chunk: RAG with date line between system prompt and document; reuse only up to the date line; doc tokens attended to a different date; move date to end; prompt layout decides hit rate; CacheBlend and others reuse middle chunks but recompute part of attention, approximate. -> A asks, B guesses wrong (reuse document), A reveals.

## Hash chain

- H1 Need a name for "KV of these 16 tokens given everything before them", computable from tokens alone without running model. -> A.
- H2 vLLM: hash each full block with previous block's hash; key 2 depends on tokens 0-47; same 16 tokens after different past -> different key; like git commit hash covering parent. -> A.
- F3 Figure 003: request 1 and 2 share three system blocks then diverge (weather vs code); request 2 hits h1-h3, misses at h4 prime; partial tail never cached since key would change with one more token. -> A.
- H3 Cache = hash table (dictionary) from key to physical block; lookup term (hit or miss). -> A.
- H4 Lookup steps: tokenize, cut full blocks ignore tail; compute keys left to right; walk until first miss, everything after is miss; point block table at hits; prefill the rest. -> A narrates.
- H5 Must compute at least one prompt token, last position produces first new token; vLLM recomputes the last token if whole prompt cached. -> B asks "what if all cached", A answers.
- H6 Extra keys: LoRA adapter, image hashes, per-tenant salt; vLLM "extra keys". -> A.
- H7 Collisions: second request gets first's KV, plausible garbage; SHA-256 (256-bit) effectively never by accident; fast 64-bit hash, attacker could find one; vLLM added SHA-256 option; check docs for default. -> A.
- H8 Timing leaks: hit is faster; guess another user's prompt and time it; per-tenant salt (own entries plus explicitly public ones) closes it; vLLM cache_salt per request. -> B raises security angle? A explains.

## RadixAttention

- RX1 Hash table knows a block exists, not the shape; SGLang radix tree: compressed prefix tree, edges are runs of tokens, node only where sequences branch. -> A.
- F4 Figure 004: root; system prompt A (2,048 tokens, ref 2) with Q1 (running) and turn 1 + reply then turn 2 (running); system prompt B (1,800 tokens, ref 0) with Q3 (ref 0, nine minutes ago) marked evict first; A stays because children in use. -> A describes.
- RX2 Lookup = walk down matching tokens; insert = add or split edge. -> A.
- RX3 Evict leaves first: leaf is one conversation's suffix, root-near node shared by everything below; SGLang LRU over leaves with ref zero. -> A.
- RX4 Schedule by prefix: run waiting requests sharing cached prefixes together before eviction; cache-aware scheduling. -> A.
- RX5 vLLM trick: free list tail first on release, chain end older than head, evicted first; same effect no tree. -> A, flagged as something he builds.

## Eviction

- E1 Pool finite; never-forgetting cache leaves no room for running requests; when free list empty something cached goes; three rules. -> A.
- E2 Rule 1: never evict a block in use; running request would read another's keys: wrong, not slow; only ref zero evictable; all pinned -> new request waits; vLLM preemption is deliberate free and recompute later. -> B: "couldn't you just evict and recompute?" A: that's preemption, deliberate.
- E3 Rule 2: LRU among unpinned; traffic bursty; ordered list, move to back on release, pop front. -> A.
- E4 Rule 3: TTL optional; LRU answers who leaves when full, TTL how long idle may stay; pure LRU keeps last Tuesday's prefix forever if no pressure; TTL frees on schedule, matters when memory could do something else or cache is a promise to a paying customer; hits refresh timer. -> B conflates LRU and TTL, A separates.
- F5 Figure 005 interactive: 16 blocks of 16 tokens; prompt A and B four blocks each; chat turn reuses A plus one block per turn; one-off five blocks. Notice: A then A four hits, 64 tokens skipped; chat turns hit everything earlier, compute one new block; one-offs pollute, cache pollution main reason hit rates fall short; one-offs without Finish -> all pinned, request can't start; evictions take tails first (A3 before A0, next A still hits A0-A2); TTL advance clock, idle expires with empty slots, hit refreshes. TTL in figure 3 minutes. -> A walks "if you click...".

## TTFT not decode

- PR4 Predict ttft-decode: 2,000 cached + 50 new, 256 generated; cold TTFT about 1 s, decode about 13 tok/s. With cache TTFT roughly prefill of 50: dominated by reading 16 GB weights once, about 60 ms at spec bandwidth, plus Python and assembling KV, 100 to 200 ms. Decode unchanged: each step reads all weights and attends over 2,050+ tokens; only avoided recomputing once. End to end drops by about 0.8 s of about 20 s; barely shows on long-answer benchmark, dominates on short agent steps. -> B voices wrong model "decode gets faster too", A corrects (diagnostic gap).
- T1 Precise statement: skips prefill compute for cached tokens; prefill compute-bound, grows with prompt length, most of TTFT on long prompts; decode bandwidth-bound, unchanged. -> A.
- T2 Indirect wins on a batched server: freed prefill compute raises throughput; shared blocks let more requests fit; on one-at-a-time server only TTFT. -> A.

## Routing

- RT1 Eight replicas, each own pool and cache; round robin sends turn 2 elsewhere seven times in eight; recomputed, seven replicas waste space on copies. -> A.
- RT2 Cache-aware routing: hash conversation ID or first blocks with consistent hashing; better: SGLang router keeps approximate radix tree per replica, routes to longest match, falls back to least-loaded; pure affinity dangerous, one hot prompt sends everyone to one GPU. -> A; B (he got LB state right) connects to sticky sessions.
- RT3 Sticky session is fine because it is a cache; replica dies, next request pays prefill; nothing lost but time. -> B says it, A confirms.

## API prompt caching

- AP1 Every major API sells it as a line item; provider keeps KV (GPU, sometimes host memory or disk), skips prefill; contract changes because someone pays. -> A.
- AP2 Anthropic: explicit cache_control breakpoint, up to 4 per request, or top-level automatic placement; default TTL 5 minutes refreshed on read; 1 hour available; write costs 1.25x (5 min) or 2x (1 hour); read about a tenth (less on some newer models); model-dependent minimum length; usage shows cache creation and cache read input tokens; check docs. -> A in words.
- AP3 OpenAI: automatic above minimum (1,024 tokens at launch), matched in increments, discounted; minutes of inactivity, longer off-peak, longer retention option; usage cached_tokens; prompt_cache_key influences routing = cache-aware routing exposed to customer; check guide. -> A.
- AP4 Fireworks and others document it too; some Fireworks TTFT on repeated prompts may already be cache hits; look for cached-tokens field. -> A, tied to his scoreboard.
- AP5 Why TTL for APIs: a promise customers can plan around and providers can budget; "until something more popular pushes it out" is neither; write premium pays for holding memory, read discount is prefill not burned. -> B asks why not LRU, A answers.
- AP6 Habits: stable first (tools, system prompt, examples), volatile last (date, question), never timestamp or request ID at the top. -> A.

## Build It

- B0 Adding cache to baseline server; batching version plugs in same way; ref counts matter once requests overlap. -> A one sentence.
- B1 Honest note: real engines share in place via block table; HF generate wants contiguous tensors; so store each block as small tensors and copy hit blocks into a fresh cache; costs a copy per request (about 256 MiB for 2,000 tokens, few ms of bandwidth plus Python), prefix in memory twice; get hashing, lookup, refcount, eviction, TTFT win; not memory sharing. -> A; B asks "so it's not really paged".
- B2 Files: prefix_cache.py, test file, server behind PREFIX_CACHE=1, bench records cached tokens, three prompt files. -> one sentence.
- BT1 Task 1 prompt sets (agent writes): shared 2k = one ~2,000-token system prompt + 50 questions; Zipf file = 8 system prompts, 400 requests, weights 1, 1/2 ... 1/8, seeded; Zipf term (k-th most popular used 1/k as often; few hot, long tail); round robin file = 8 prompts strict rotation, 400 requests; system prompt first, no date line above. -> A.
- BT2 Task 2 cache (his): no model code; Block has key, kv opaque, ref, last used; PrefixCache with block size, max blocks, TTL, salt, clock; root from SHA-256 of salt; dict of blocks; free LRU ordered dict of ref-zero only; lock; stats. Methods: hash_blocks (one key per full block, chained), lookup (sweep expired, longest prefix up to max_hit, pin and remove from free list), insert (pinned ref 1, evict to make room, false if all pinned), release (decrement, stamp, ref zero to back; order matters), evict_one (pop front), sweep (TTL, expired are at front). -> A describes shape in words.
- BT3 Hints: token ids to bytes with array or struct, fixed encoding; not Python built-in hash (randomized per process for strings, 64 bits); free list only unpinned -> O(1) eviction; release order decides heads vs tails, a test checks, figure 5 behaves right; max_hit keeps one token uncached; under TTL free list ordered by release and last_used stamped at release so sweep stops at first alive; one lock per public method, don't call lookup inside insert (deadlock). -> A, the ones that matter.
- BT4 Tests as spec: hash chain (partial tail not a block; shared first block same key, differing second; same tokens different past different key); hit after insert (0 of 3, then 3 of 3, then 2 of 3 with different tail); pinned never evicted (capacity 2, both pinned, third insert returns false); LRU evicts tails first (capacity 3, chain of 3, one new block, third block gone, first two stay); TTL (300 s; hit at 200 restarts timer; at 450 idle 250 still alive; at 800 idle 350 expired). Reference implementation about 70 lines, all five pass. -> A narrates the TTL one with numbers.
- BT5 Task 3 wiring (review): three boilerplate helpers touching HF cache internals; checked against transformers 5.20 (layers with keys and values, shape batch, kv heads, seq, head dim), older 4.x key_cache lists; layer_kv, slice_block (clone matters, slice is a view keeping the whole tensor alive), build_cache (concatenate hit blocks along sequence axis). -> A, light.
- BT6 Wiring inside events under GPU lock: ids, keys, lookup with max_hit leaving at least one token, build cache or empty, generate sees full ids and only prefills the rest, fills past in place; after join slice new blocks, insert, release in a finally so exceptions can't leak pins; usage gains cached tokens. Env vars PREFIX_CACHE, CACHE_BLOCKS, CACHE_TTL_S; GET cache_stats endpoint; log line per request. -> A, finally-block point emphasized.
- BT7 Check on Mac with SmolLM2 135M on CPU fp32: cache off vs on identical greedy output; author's run: 742-token prompt, 720 from cache, same 20 tokens, first token 339 ms to 58 ms. Spark bf16 may diverge after many tokens: different kernel shapes, bf16 rounding; compare first 32 tokens, early divergence = suspect bug (positions, missing block, wrong max_hit). -> A, B asks why it would differ.
- BT8 Not caching generated tokens: turn 2 resends turn 1's answer, misses; vLLM caches generated blocks; trap: chat template may retokenize differently, keys don't match; measure. -> A.
- BT9 Task 4 harness: read cached_tokens (missing = 0); TTFT p50 split by cached > 0 vs 0; overall token hit rate; sweep script over 64,128,256,512,1024,2048 blocks, restart each (cold cache is the point), c = 1, max tokens 16. -> A.
- BT10 Done when: five tests pass; Mac identical output and log shows hits on second request; Spark second request about 2,000 cached tokens and cache_stats agrees; results and a scoreboard row. -> A briefly.

## Measure

- M1 shared 2k at c = 1, 256 max tokens ignore EOS, cache off, on, Fireworks; columns TTFT first, TTFT p50 rest, cached tokens, tok/s, e2e. -> one sentence.
- M2 Cache off: every request full prefill, about a second; divide 2 x 8 billion x 2,050 by TTFT for effective compute rate. -> A in words.
- M3 Cache on first: same plus a little for slicing and storing 128 blocks. -> A.
- M4 Cache on rest: about one weight pass plus overhead, 100 to 200 ms expected; ratio large like 339 to 58 on Mac. -> A.
- M5 tok/s same within noise; if slower, check KV layout or dtype. e2e shorter by exactly the TTFT saving. -> A.
- M6 Hit overhead: time build_cache: 128 blocks x 32 layers about 8,000 small tensors, about 256 MiB copy; if tens of ms try 64-token blocks, four times fewer pieces, coarser matching; block size vs granularity and bookkeeping is a real vLLM knob. -> A.
- M7 Sweep: each 2,000-token prompt 128 blocks plus about 3 for the question; 8 prompts about 1,024 blocks = 2 GiB at 2 MiB per block; memory per capacity 64=128 MiB ... 2,048=4 GiB. -> A.
- PR5 Predict hit-curve: round robin at 512 blocks (4 of 8 prompts) = zero, not half; LRU always evicted the one coming back; classic LRU failure on cycle bigger than cache; jumps only when whole cycle fits; Zipf degrades gracefully. -> A asks, B says half, A reveals.
- M8 Simulation table (2,000 requests, 2,048-token prompts + 50 unique, 16-token blocks): Zipf 0.09, 0.18, 0.36, 0.62, 0.93, 0.97; round robin 0 until 1,024 = 0.81, 2,048 = 0.97. Ceiling 2,048/2,098 about 0.976 because unique question never hits. Zipf hits even at 64: tail-first keeps heads of hottest prompt; partial prefix still a prefix. -> A says the shape and key points, not row by row.
- M9 Plot TTFT p50 vs hit rate: near straight line from full prefill at 0 to warm at 1; TTFT is fixed cost plus per-uncached-token cost. -> A.
- M10 Scoreboard: main columns (short prompts, c = 1) barely move, honest result; real effect in notes (shared 2k TTFT off to on, Zipf hit rate at 1,024 blocks). -> A.

## Break It

- BK1 Timestamp at top: hit rate zero, first block differs so every key differs; move to end, hits return; most common way to silently lose cache, every API guide warns. -> "what if" exchange.
- BK2 Release head first: tails-first test fails; simulation at 256 blocks Zipf 0.36 to 0.18, round robin at 1,024 0.81 to 0.00; evicting a head orphans everything after (lookup stops at first miss) but orphans occupy pool until LRU reaches them; one line, half the hit rate. -> exchange.
- BK3 Views not copies: remove clone; works, memory climbs; slice is a view into original storage so each 16-token block keeps whole request's KV alive (prompt + generated, every layer); grows far past 2 GiB at 1,024 blocks; same with NumPy slices; blocks not equal bytes unless careful. -> exchange.
- BK4 Tiny hash 16 bits: 65,536 keys, thousands of blocks, collisions within minutes; outputs fluent and wrong, no error; key must be collision-resistant; cache bugs return an answer. -> exchange.

## Explain It Back (content must appear)

- EB1 PagedAttention: 128 KiB per token, unknown length, slab wastes tail and gaps; blocks + block table; allocate when previous fills; waste under one block; kernel reads through table; more sequences fit, bigger batch, throughput; blocks shareable. -> covered by I/W/PA sections; B restatement near end.
- EB2 Prefix caching finding + exactness: causal attention, keys chained, walk till first miss, prefill rest plus last token; exact up to rounding if adapter/images in key and no collisions. -> X/H sections.
- EB3 LRU vs TTL vs refcount: refcount decides what may be evicted; LRU which unpinned goes, tail-first; TTL how long idle may stay even with room, promisable; under constant pressure effectively all LRU, TTL matters when not. -> Eviction section; the "under constant pressure" line explicitly.
- EB4 TTFT 8x faster, tok/s unchanged: prefill skipped, decode reads weights plus whole context, cached tokens still read; bandwidth-bound; fixed saving per request; indirect batched gains. -> TTFT section; "eight times" phrased.
- EB5 Scale to 50 replicas, million users: round robin hits 1 in 50; duplicated popular prefixes; cache-aware routing with fallback; hot set: 1,000 conversations x 8,000 tokens x 128 KiB about 1 TB, far more than GPU; rely on Zipf reuse, evict long tail, second tier host memory or SSD, which longer API TTLs imply; numbers to know: KV bytes per token, hot set size, how fast prefill recomputes a miss. -> Routing section extended with this scale-up as B pushes.

## Go Deeper / Connections

- G1 Best sources: the vLLM PagedAttention paper (Kwon et al., SOSP 2023) and vLLM's automatic prefix caching design docs; OSTEP chapter on why LRU fails on loops. -> one closing-adjacent sentence, before the ending exchange.
- C1 Connections: caching and Redis lesson (same key, lifetime, staleness questions), memory math, inside vLLM and SGLang. -> one sentence.

## Flow plan

Opening on the agent step paying a second (P1-P3) -> memory problem (P4-P5) -> Origin story (O1-O4) -> KV bytes and predict (R3, I1-I3, PR1) -> three wastes and figure 1 (W1, F1) -> virtual memory recap and PagedAttention (R2, PA1-PA4) -> sharing within a request, COW, figure 2, beam, predict (S1-S4, F2, PR2) -> the leap across requests, why only prefixes, predict middle chunk (X1-X3, PR3) -> hash chain, figure 3, lookup, last-token catch, extra keys, collisions, timing (H1-H8) -> radix tree and figure 4, tail-first trick (RX1-RX5) -> eviction rules, TTL vs LRU, figure 5 walk (E1-E4, F5) -> TTFT not decode with B's wrong model (PR4, T1-T2, R4) -> routing and scale-up (RT1-RT3, EB5) -> API caching (AP1-AP6) -> Build It (B0-BT10) -> Measure (M1-M10, PR5) -> Break It (BK1-BK4) -> sources and connections (G1, C1) -> ending: B restates, A sharpens.
