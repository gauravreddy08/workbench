# Outline: caching

Source: src/lessons/caching.mdx. Curriculum: "Caching and Redis." When should you cache, how long
should things live (TTL), and how do caches go wrong?

## The one big idea

A cache is a bet that the same question comes again. Lopsided popularity makes the bet pay, and
misses decide the speed. The speed is the easy half. The hard half is that the notebook has no idea
when its answers stop being true, so all the correctness lives in the key and in deciding how long
a copy may be trusted.

## Opening scene

His eval harness pushes the same prompts through the Spark on every ranking change, and the GPU
spends most of an hour re-deriving yesterday's answers. A dictionary in front of it makes the rerun
take seconds. Then the bugs: a fine-tuned checkpoint whose scores don't move, a sampling experiment
that gets one answer forever, and a morning spike exactly an hour after the warm-up job.

## Wrong mental model B voices

B thinks the key is the prompt. B thinks going from ninety to ninety-nine percent hits is a small
improvement. B assumes a cache makes everything faster, including the slow tail. B thinks a
meaning-based cache is just a smarter exact-match cache.

## Story beats

1. The genius week, and the three bugs.
2. Origin: Wilkes's small fast memory, IBM calling it a cache; memcached at LiveJournal; Redis; the
   cache invalidation and naming things line.
3. Why the bet wins: a few popular requests make up most traffic. Uniform traffic makes caching
   pointless. The workload decides, not the cache.
4. Miss rate rules: going from ninety to ninety-nine is ten times faster. The typical request gets
   magical, the slowest stay exactly as bad; the indirect win is a shorter queue at the GPU.
5. The key is everything that changes the output. Model revision; temperature, and how a cache
   turns a distribution into a single sample. Put the version in the key instead of invalidating.
6. How long to trust a copy: TTL as a business question. Invalidation's race: a slow reader puts the
   old value back after the delete. Always keep a TTL as the backstop.
7. The stampede: the morning spike explained; behind one GPU, the last request waits for all the
   identical ones. Coalescing; a lock across processes; jitter.
8. Redis briefly: one thread, every command atomic, one slow command blocks everyone; a cache must
   be safe to lose. LRU and the loop slightly bigger than the cache that gets zero hits.
9. The semantic cache lying: miles to km versus km to miles score closer than honest paraphrases.
   Topic similarity isn't answer equivalence, which is why his cross-encoder exists.

Ending: B says a cache is a fast copy and the job is a good TTL; A sharpens: for model answers the
clock is the backstop, the key is what keeps it correct.

## Numbers worth saying (four)

- Nineteen sixty-five.
- Most of an hour versus a few seconds.
- Ninety versus ninety-nine percent hits, ten times faster.
- Two hundred identical requests in the stampede.

## Left to the written lesson

The Zipf table and exponent, the latency formula and table, p50 and p99 worked numbers, the four
wiring patterns by name beyond cache-aside, write-through and write-behind, negative caching, LFU,
ARC and Bélády, the hash-map-plus-linked-list LRU and its code, Redis data structures, persistence
modes, the license fork, SET NX PX, stale-while-revalidate and XFetch, the key code, proxy code,
exact similarity scores, Measure tables, Break It details, scaling to fifty replicas.
