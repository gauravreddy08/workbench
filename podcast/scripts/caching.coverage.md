# Coverage: caching

Lesson src/lessons/caching.mdx vs podcast/scripts/caching.md. Item IDs match
podcast/outlines/caching.md. All numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs (harness, async load gen, prefix cache cousin) | Build It; LLM responses | "point it at the fake slow LLM from the waiting versus working build"; "That's the confusion, yeah. Two very different things" | covered |
| P1 500 prompts, temp 0, ~40 min | Problem | "the GPU spends about forty minutes working out five hundred answers" | covered |
| P2 dict, 4 s, genius for a week | Problem | "The second run takes four seconds" | covered |
| P3 checkpoint bug, model not in key | Problem | B: "The dictionary doesn't know the model changed." | covered |
| P4 temperature 0.8 bug | Problem | "exactly one answer per prompt, no matter how many times" | covered |
| P5 Redis, 3 replicas, 1 h, 10:00 spike after 9:00 warm-up | Problem | "There's a warm-up job at nine" | covered |
| P6 classics; cheapest speedup / wrong with confidence | Problem | "serve something wrong... with total confidence" | covered |
| O1 Wilkes 1965 paper | Origin | "Nineteen sixty-five, Maurice Wilkes" | covered |
| O2 IBM 360/85, 1968, "cache" | Origin | "System three sixty Model eighty-five" | covered |
| O3 memcached 2003, LiveJournal, Facebook | Origin | "Brad Fitzpatrick's running a blogging site called LiveJournal" | covered |
| O4 Redis 2009, LLOOGG, data structures, disk | Origin | "Salvatore Sanfilippo is building a real-time analytics product" | covered |
| O5 Karlton quote | Origin | "cache invalidation and naming things" | covered |
| I1 cache, hit, miss | A cache is a bet | "it's a bet. A bet that you'll ask for the same thing again soon" | covered |
| I2 temporal locality | A cache is a bet | "That's called temporal locality" | covered |
| I3 Zipf, skew | A cache is a bet | "That shape has a name. It's a Zipf distribution."; "a knob, called the skew" | covered |
| I4 simulation numbers (39%, 67%, 89%, 34%, uniform 10%) | A cache is a bet | "answers thirty-nine percent of the requests" | covered (s=0.8 column omitted, see note) |
| I5 workload decides | A cache is a bet | "the workload decides whether a cache helps. Not the cache." | covered |
| I6 Figure 001 two rows with latencies | One idea, many layers | "Picture two rows of boxes" | covered |
| I7 who copies what (CDN term, KV/prefix) | One idea, many layers | "The CPU caches copy RAM. The page cache copies the SSD." | covered |
| I8 four questions | One idea, many layers | "every layer has to answer the same four questions" | covered |
| I9 who answers them | One idea, many layers | "The CPU answers them in silicon" | covered |
| I10 formula in words | Arithmetic | "the hit rate times what a hit costs, plus the miss rate times" | covered |
| I11 0/50/90/99 table numbers | Arithmetic | B: "about two hundred one milliseconds"; "twenty-one milliseconds"; "About ninety-five times" | covered |
| I12 think in miss rate | Arithmetic | "think in miss rate, not hit rate" | covered |
| I13 hit ~ miss useless; bad hit rate slower | Arithmetic | "putting a one millisecond Redis round trip in front of a two millisecond database query" | covered |
| PR1 p50/p99 Predict | Predict p50 p99 | "So p ninety-nine is still about two thousand milliseconds" | covered |
| I14 cache-aside | Four ways | "The first one's called cache-aside, sometimes lazy caching" | covered |
| I15 read-through | Four ways | "The second one is read-through. Here the cache owns the loader." | covered |
| I16 who updates on write | Four ways | "When the data changes, who updates the cache?" | covered |
| I17 write-through, write-behind, page cache, fsync | Four ways | "That gap is the whole reason f sync exists" | covered |
| I18 LLM: no writes, cache-aside | Four ways | "The model never changes an answer behind your back" | covered |
| I19 TTL term, SET EX 3600 | TTLs | "with an expiry of three thousand six hundred seconds" | covered |
| I20 promise about staleness, business question | TTLs | "a business question wearing a technical costume" | covered |
| I21 three questions (stock, description, fired) | TTLs | "And a user's permissions after they've been fired? Zero." | covered |
| I22 long TTL; key not clock | TTLs | "It's the key. If the model's in the key, a new model means new keys." | covered |
| I23 jitter | TTLs | "plus or minus a random ten percent" | covered |
| I24 negative caching | TTLs | "Second, negative caching." | covered |
| I25 invalidation term, recipe | Invalidation | "write to the database, then delete the cache key" | covered |
| PR2 race Predict + fixes + TTL backstop | Invalidation | "R, which was slow... finally does its set. With the old value." | covered |
| I26 versioned keys | Invalidation | "You put a version in the key. Like answer, v three" | covered |
| I27 eviction vs expiry, Bélády | Eviction | "Bélády's optimal algorithm, from nineteen sixty-six" | covered |
| I28 LRU + scan weakness | Eviction | "A batch job that reads a hundred thousand keys once each" | covered |
| I29 LFU + decay | Eviction | "practical LFUs let the counts decay" | covered |
| I30 ARC, ZFS, W-TinyLFU | Eviction | "ghost lists"; "W Tiny L F U in Java's Caffeine library" | covered |
| I31 FIFO/random; Redis sampling | Eviction | "Sound naive, and on real traffic they're often within a few points" | covered |
| F3 Figure 003 sim and sliders | Cache simulator | "three sliders. Skew, cache size, and TTL" | covered |
| I32 curve bends early | Cache simulator | "the first twenty slots out of two hundred give you most of the win" | covered |
| I33 below ideal, compulsory miss | Cache simulator | "That's called a compulsory miss, or a cold miss." | covered |
| I34 TTL lowers curve | Cache simulator | "a TTL lowers the whole curve" | covered |
| I35 dict + list, constant time | Building LRU | "No single data structure does all three." | covered |
| F4 Figure 004 | Building LRU | "On the far left there's an empty box called HEAD" | covered |
| I36 get/set semantics | Building LRU | "On a get, you look up the node in the dict." | covered |
| I37 why doubly linked; node stores key | Building LRU | B: "Why does it have to be doubly linked" | covered |
| I38 lazy TTL | Building LRU | "It's checked lazily. Only when somebody does a get." | covered |
| I39 OrderedDict; 0.15 vs 0.03 µs | Building LRU | "about fifteen hundredths of a microsecond, against three hundredths" | covered |
| I40 hot key 200/s expires | Stampede | "being read two hundred times a second" | covered |
| F5 Figure 005 | Stampede | "So picture it as two timelines." | covered |
| I41 stampede term; GPU lock, 400th waits | Stampede | "the four hundredth request waits for four hundred full generations" | covered |
| I42 coalescing, singleflight, future | Stampede | "That's request coalescing. Go's standard library calls it singleflight." | covered |
| I43 Redis lock NX PX 10000 | Stampede | "N X, which means only set it if it doesn't already exist" | covered |
| I44 jitter limits | Stampede | "It doesn't stop one hot key's stampede" | covered |
| I45 stale-while-revalidate | Stampede | "It's called stale-while-revalidate" | covered |
| I46 probabilistic early refresh, XFetch | Stampede | "every reader rolls a die" | covered |
| I47 Redis term, commands, round trip | Redis | "roughly a tenth of a millisecond on one machine" | covered |
| I48 single thread, event loop, atomic, slow command | Redis | "Redis runs commands one at a time, on one thread" | covered |
| I49 data structures | Redis | "Sorted sets, where every member has a score" | covered |
| I50 expiry, maxmemory, noeviction, sampled LRU | Redis | "The default is no eviction... right for a database. And wrong for a cache." | covered |
| I51 persistence, fork, CoW, AOF, safe to lose | Redis | "because of copy-on-write"; "A cache must be safe to lose." | covered |
| I52 license, Valkey | Redis | "forked the last open-source version as Valkey" | covered |
| I53 prefix vs response cache | LLM responses | "Two very different things both get called prompt caching" | covered |
| I54 key contents | LLM responses | "Not the prompt. Everything." | covered |
| I55 canonical JSON, SHA-256, 5 µs | LLM responses | "took about five microseconds" | covered |
| I56 why paranoid (max tokens, revision) | LLM responses | "somebody who asked for sixteen tokens gets served a stored five hundred twelve" | covered |
| PR3 temperature Predict + policies | Predict temperature | "Five copies of the first sample."; "that's the output distribution" | covered |
| I57 only complete answers | Predict temperature | "Check the finish reason" | covered |
| I58 streaming replay, TTFT, label | Predict temperature | "Time to first token on a hit becomes about a millisecond" | covered |
| I59 privacy exact match | Predict temperature | "can only give that answer to someone who sent exactly the same text" | covered |
| I60 semantic cache, embedding, cosine | Semantic caching | "Cosine similarity being a score for how closely two of those vectors point" | covered |
| I61 measured pairs | Semantic caching | "Zero point nine seven nine"; "zero point nine eight seven"; "zero point eight eight seven"; "zero point nine one eight"; "zero point eight two five" | covered |
| F6 Figure 006 | Semantic caching | "Picture a number line from zero point seven to one" | covered |
| I62 where to use semantic | Semantic caching | "Scope it per user or per customer" | covered |
| B0 Task 0 Redis setup, pipelining | Build It | "run it again with pipelining at sixteen" | covered |
| B1 Task 1 LRU class | Build It | "the clock's injectable" | covered |
| B2 starter tests | Build It | "Move the clock to four point nine, it's still there" | covered |
| B3 more tests, randomized, hints | Build It | "Twenty thousand random gets and sets on keys zero to nineteen" | covered |
| B4 key function, defaults, tests | Build It | B: "Why fill in defaults?" | covered |
| B5 proxy | Build It | "A cache outage must not be a site outage." | covered |
| B6 Zipf workload, sim, real run, review | Build It | "One's coordinated omission." | covered |
| B7 stampede task, 4 workers, lock, 400 s | Build It: stampede | "Four. One per process."; "Four hundred seconds." | covered |
| B8 semantic task | Build It: stampede | "Swap one entity, like Austria and Australia" | covered |
| B9 done when | Build It: stampede | "The tests pass, including the randomized one." | covered |
| M1 Redis benchmark expectations | Measure | "tens of thousands to a couple hundred thousand requests a second" | covered |
| M2 hit-rate table, ceiling 373/2000 | Measure | "three hundred seventy-three distinct prompts appeared" | covered (subset of cells, see note) |
| M3 latency: misses faster, Redis +1-2 ms | Measure | "The misses with the cache on are faster than without it." | covered |
| M4 stampede run, 7 minutes | Measure | "Nearly seven minutes." | covered |
| M5 semantic expectations | Measure | "Similarity measures topic, not whether the answer's the same." | covered |
| K1 drop field | Break It | "Take max tokens out of your key function" | covered |
| K2 expire at once, 12 s | Break It | "Spread over twelve seconds" | covered |
| K3 noeviction | Break It | "A failed cache write isn't a failed request." | covered |
| K4 cyclic scan zero | Break It | "Zero. Not low. Zero." | covered |
| E1 why caches work / when not | Bet; Arithmetic; TTLs; Closing | "the workload decides"; "useless at any hit rate" | covered |
| E2 90 to 95 is 2x; tail needs 99+ | Arithmetic; Predict | "It's about twice as fast. Ten percent misses down to five." | covered |
| E3 LLM cache design summary | Semantic caching | B's summary + "Make it fail open... And coalesce misses" | covered |
| E4 stampede fixes | Stampede | coalescing, lock, jitter, stale-while-revalidate, early refresh | covered |
| E5 50 replicas, 10k/s | Scaling out | "sixteen thousand three hundred eighty-four hash slots"; "twenty gigabytes plus overhead" | covered |
| G1 sources | Scaling out | "read Scaling Memcache at Facebook" | covered |
| C1 connections | Scaling out | "a stampede is really a flood you caused yourself" | covered |

Notes:
- I4: the s = 0.8 column of the simulation table is not read out; the s = 1.0, s = 1.2 and uniform cells carry the point.
- M2: of the reference LRU numbers, 0.24, 0.52, 0.78 and 0.81 are said; 0.39 and 0.64 are not. Of the ideal column, 0.43, 0.66, 0.90 and 1.00 are said; 0.56 and 0.76 are not. Reading every cell would be reading a table.
- Derived numbers not written in the lesson: 50% hit rate average "about a thousand" (lesson table says 1,000 ms, fine); jitter window "fifty-four to sixty-six" seconds (lesson gives only the 12-second spread); 373/2000 "about nineteen percent" (lesson gives the 0.81 ceiling).
