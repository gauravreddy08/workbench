# Coverage: prefix-caching

Lesson src/lessons/prefix-caching.mdx vs podcast/scripts/prefix-caching.md. Item IDs match
podcast/outlines/prefix-caching.md. "Fixed" = missing or wrong in the first draft, corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| R1 baseline server, ~1 s prefill of 2k | Problem | "Prefill of two thousand tokens on the Spark is on the order of a second" | covered |
| R2 virtual memory recap | PagedAttention | "Physical RAM is cut into four-kilobyte frames. Every process gets a page table" | covered |
| R3 KV cache recap | KV size | "the new token's query gets compared against the keys of every earlier token" | covered |
| R4 decode bandwidth-bound | TTFT not decode | "drags every weight through the memory bus, sixteen gigabytes through a pipe" | covered |
| R5 load balancer state | Routing | "This is the load balancer state thing... A sticky session." | covered |
| P1 2,000-token agent system prompt | Problem | "it's about two thousand tokens, and it never changes" | covered |
| P2 recompute every request, ~1 s TTFT | Problem | "Computes exactly the same keys and values it computed a second ago" | covered |
| P3 chat turn 10 resends 1-9 | Problem | "Turn ten of a conversation resends turns one through nine" | covered |
| P4 reserve worst case, fewer users | Problem | "the obvious design reserves room for the longest possible answer" | covered |
| P5 one fix: blocks, table, sharing | Problem | "Cut it into small, fixed-size blocks. Keep a table" | covered |
| O1 Berkeley, 20-38 percent used | Origin | "only twenty to thirty-eight percent of the memory reserved" | covered |
| O2 OS pages since the 1960s | Origin | "Since the nineteen sixties, operating systems have given each process the illusion" | covered |
| O3 vLLM June 2023, SOSP, 2-4x | Origin | "two to four times the throughput ... at the same latency" | covered |
| O4 APC, SGLang Jan 2024, API dates | Origin | "Anthropic in August twenty twenty-four, OpenAI in October twenty twenty-four" | covered |
| I1 128 KiB per token derivation | KV size | "times thirty-two layers... a hundred and twenty-eight kilobytes. Per token." | covered |
| I2 GQA 32 query / 8 KV heads, 4x | KV size | "thirty-two query heads but only eight K V heads, which shrinks the cache four times" | covered |
| I3 256 MiB, 16 GiB at 128k | KV size | "a full hundred-and-twenty-eight-thousand-token context is sixteen gigabytes" | covered |
| PR1 reserve-waste predict | Predict | "about eighty-seven percent ... fits sixty-four users. The real data would fit about five hundred." | covered |
| W1 three wastes, internal/external fragmentation | Worst case | "That's called internal fragmentation" / "That's external fragmentation." | covered |
| F1 figure 001 | Worst case | "only used two hundred of the six hundred ... needing two hundred and twenty. And it's refused." | covered |
| W2 "PagedAttention is that" | PagedAttention | "So Paged Attention is... that. But for the K V cache." | covered |
| PA1 16-token blocks, 2 MiB, pool, free list | PagedAttention | "one block is sixteen times a hundred and twenty-eight K, so two megabytes" | covered |
| PA2 block table, append on fill | PagedAttention | "Entry zero says where tokens zero to fifteen live, say physical block seven" | covered |
| PA3 kernel indirection, under 4 percent | PagedAttention | "The paper reports under four percent." | covered (fixed B's reaction wording) |
| PA4 translation table | PagedAttention | "A process becomes a sequence ... The page table becomes the block table." | covered |
| S1 parallel sampling, refcount 4 | Sharing in request | "each of those blocks carries a reference count of four" | covered |
| S2 partial last block, 2,008 tokens | Sharing in request | "a two-thousand-and-eight-token prompt leaves eight tokens in the last block" | covered |
| S3 copy-on-write | Sharing in request | "Before a sample writes into a block whose reference count is above one" | covered |
| F2 figure 002 | Sharing in request | "Both samples' first block points at physical seven ... a copy of three" | covered |
| S4 beam search | Sharing in request | "a beam that dies just decrements its blocks' counts" | covered |
| PR2 n=4 predict, 568 vs 193 | Predict | "A hundred and twenty-five plus four plus sixty-four is a hundred and ninety-three blocks" | covered |
| X1 the leap across requests | Across requests | "two different requests, from two different users, can share a prompt too" | covered |
| X2 why prefix: layers, RoPE, causal mask | Across requests | "Llama uses rope ... That's the causal mask" | covered |
| X3 identical up to rounding | Across requests | "Not similar. Identical, up to floating-point rounding." | covered |
| PR3 date-line predict, CacheBlend | Predict | "You only get up to the date line ... CacheBlend is one" | covered |
| H1 name computable without model | Hash chain | "compute that name from the new request's tokens alone, without running the model" | covered |
| H2 chained hash, git analogy | Hash chain | "same chaining idea as a git commit hash" | covered |
| F3 figure 003 | Hash chain | "hits, hits, hits, and then its fourth key is different" | covered |
| H3 hash table / lookup | Hash chain | "the cache itself is just a hash table, a dictionary" | covered |
| H4 lookup steps | Hash chain | "Compute the keys left to right. Then walk them." | covered |
| H5 at least one token recomputed | Hash chain | "the server still recomputes the last token" | covered |
| H6 extra keys (LoRA, images, salt) | Hash chain | "Which Lora adapter is active. The hashes of any images" | covered |
| H7 collisions, SHA-256 vs 64-bit | Hash chain | "With a fast sixty-four-bit hash, an attacker who can choose prompts" | covered |
| H8 timing leaks, cache salt | Hash chain | "Timing leaks ... V L L M takes a cache salt per request" | covered |
| RX1 radix tree definition | Radix | "a compressed prefix tree. Each edge is labelled with a run of tokens" | covered |
| F4 figure 004 | Radix | "nine minutes ago. And that one's flagged evict first. A stays" | covered |
| RX2 lookup walk, insert split | Radix | "inserting is adding an edge or splitting one" | covered |
| RX3 leaf-first LRU | Radix | "L R U, least recently used, over leaves whose reference count is zero" | covered |
| RX4 cache-aware scheduling | Radix | "S G Lang calls that cache-aware scheduling" | covered |
| RX5 vLLM tail-first free list | Radix | "puts its blocks onto the free list tail first" | covered |
| E1 finite pool, three rules | Eviction | "there are three rules that decide what" | covered |
| E2 never evict in use, preemption | Eviction | "It's not slower, it's wrong ... a running request can be preempted" | covered |
| E3 LRU, bursty, ordered list | Eviction | "Move a block to the back when it's released. Pop from the front" | covered |
| E4 TTL vs LRU, refresh on hit | Eviction | "L R U answers who leaves when we're full? T T L answers how long may an idle thing stay?" | covered |
| F5 figure 005 walkthrough | Pool | "Sixty-four tokens of prefill skipped ... cache pollution ... three simulated minutes" | covered |
| PR4 TTFT predict, decode unchanged | TTFT | "something like a hundred to two hundred milliseconds ... decode speed doesn't change at all" | covered |
| T1 precise statement | TTFT | "prefix caching skips prefill compute for the cached tokens" | covered |
| T2 indirect batched wins | TTFT | "Prefill that doesn't run frees compute for other requests" | covered |
| RT1 eight replicas, 7 of 8 miss | Routing | "seven times out of eight" | covered |
| RT2 consistent hashing, SGLang router, fallback | Routing | "routes to whichever has the longest match, and falls back to the least-loaded" | covered |
| RT3 sticky session safe because cache | Routing | "Nothing's lost but time." | covered |
| AP1 APIs sell it, contract | API | "What changes is the contract. Because now someone's paying." | covered |
| AP2 Anthropic details | API | "up to four per request ... one and a quarter times ... twice for the hour. Reading it costs about a tenth" | covered |
| AP3 OpenAI details | API | "a thousand and twenty-four tokens when it launched ... prompt cache key" | covered |
| AP4 Fireworks may be cache hits | API | "Some of Fireworks' time to first token on repeated prompts may already have been cache hits" | covered |
| AP5 why TTL for APIs | API | "Because an A P I is a promise." | covered |
| AP6 stable first, volatile last | API | "never, ever a timestamp or a request I D at the top" | covered |
| B0 plugs into baseline/batching server | Build It | "If you already rewrote it for batching, it plugs in the same way" | covered |
| B1 honest note: copy, memory twice | Build It | "during a request, the prefix lives in memory twice" | covered |
| B2 files | Build It | covered through the tasks (cache file, test file, env switch, harness) | covered (compressed) |
| BT1 prompt sets, Zipf, rotation | Build It | "seeded random choice, weighted ... That's a Zipf distribution" | covered (fixed: seeded) |
| BT2 cache shape, six methods | Build It | "Then six methods. Hash blocks ... Lookup ... Insert ... Release" | covered |
| BT3 hints (no built-in hash, O(1), order, max_hit, sweep, lock) | Build It | "Just don't call lookup from inside insert, or you'll deadlock" | covered |
| BT4 five tests, TTL numbers, ~70-line reference | Build It | "At four hundred fifty, it's been idle two hundred fifty, still alive" | covered (fixed: removed planted question) |
| BT5 HF helpers, version 5.20 vs 4.x, clone | Build It | "checked against transformers version five point two" | covered |
| BT6 wiring, finally, env vars, stats, log | Build It | "the release goes in a finally block, so an exception can't leak pins" | covered |
| BT7 Mac check 742/720, 339 to 58 ms; bf16 drift | Build It | "from three hundred thirty-nine milliseconds to fifty-eight" | covered |
| BT8 generated tokens not cached, retokenization | Build It | "The chat template might tokenize the answer slightly differently" | covered |
| BT9 harness, sweep sizes, restart cold | Build It | "Restarting's the point. Each run starts cold." | covered |
| BT10 done when | Build It | "You're done when the five tests pass" | covered |
| M1 runs: off, on, Fireworks | Measure | "once with the cache off, once on, and once against Fireworks" | covered |
| M2 cache off, effective compute rate | Measure | "two times eight billion times two thousand and fifty tokens, divided by that time" | covered |
| M3 cache on first | Measure | "plus a little for slicing and storing a hundred twenty-eight blocks" | covered |
| M4 cache on rest 100-200 ms | Measure | "Somewhere around a hundred to two hundred milliseconds" | covered |
| M5 tok/s same, e2e exact saving | Measure | "end to end gets shorter by exactly the time-to-first-token saving" | covered |
| M6 build_cache overhead, 64-token blocks | Measure | "about eight thousand small tensors ... try sixty-four-token blocks" | covered |
| M7 1,024 blocks = 2 GiB, sweep memory | Measure | "all eight prompts together need about a thousand twenty-four blocks ... two gigabytes" | covered |
| PR5 round robin at 512 = zero | Measure | "Zero. Not half. Zero." | covered |
| M8 simulation numbers, ceiling 0.976 | Measure | "about ninety-seven and a half percent ... A partial prefix is still a prefix." | covered |
| M9 TTFT vs hit rate line | Measure | "It should be close to a straight line" | covered |
| M10 scoreboard row honest | Measure | "Your main columns ... barely move" | covered |
| BK1 timestamp at top | Break It | "First block's different, so its key's different" | covered |
| BK2 head-first release, 0.36 to 0.18, 0.81 to 0 | Break It | "falls from about thirty-six percent to eighteen" | covered |
| BK3 views not copies | Break It | "a slice of a tensor is a view" | covered |
| BK4 16-bit hash, 65,536 keys | Break It | "They're fluent and wrong" | covered |
| EB1 PagedAttention answer | PagedAttention + ending | "more concurrent requests fit"; B restatement | covered |
| EB2 prefix caching exactness | Across requests + Hash chain | "Identical, up to floating-point rounding" + extra keys + collisions | covered |
| EB3 refcount vs LRU vs TTL | Eviction + ending | "a server under constant pressure is effectively all L R U" | covered |
| EB4 TTFT 8x, tok/s unchanged | TTFT | "If someone tells you caching made time to first token eight times faster" | covered |
| EB5 50 replicas, 1 TB hot set, second tier | Routing | "that's about a terabyte of K V ... a second tier in host memory or on SSD" | covered |
| G1 sources | Wrap | "the V L L M paper ... Three Easy Pieces" | covered |
| C1 connections | Wrap | "caching and Redis lesson ... how much memory a model needs ... insides of V L L M and S G Lang" | covered (fixed: added two) |

Numbers checked against the lesson: all match. Derived in the script but not written in the lesson:
one gigabyte reserved per user (8,192 x 128 KiB), the 1,024-numbers / 2 KB / 4 KB intermediate
steps of the per-token math, and "two operations per weight per token" as the reason for the
2 x 8B x 2,050 formula. The 273 GB/s Spark bandwidth comes from CLAUDE.md / the bandwidth-bound lesson.
