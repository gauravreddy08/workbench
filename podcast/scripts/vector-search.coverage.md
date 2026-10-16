# Coverage: vector-search

Lesson src/lessons/vector-search.mdx vs podcast/scripts/vector-search.md. Item IDs match
podcast/outlines/vector-search.md. "Fixed" = was MISSING or wrong in the first draft and has been
added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs (napkin math; bandwidth-bound re-explained) | Brute force | "Quick reminder on that one. When a language model generates one token" | covered |
| P1 cross-encoder, one pass per pair, ~1 ms generous | Problem | "Call it a millisecond per pair, on a GPU, batched" | covered |
| P2 100M x 1 ms = 28 hours | Problem | "Twenty-eight hours. Per query." | covered |
| P3 two stages, ~1,000 candidates, can't bring back | Problem | "The ranker can only reorder what it's handed" | covered |
| P4 bi-encoder term | Problem | "A bi-encoder looks at them separately" | covered |
| P5 768 numbers, closest list, sounds easy | Problem | "which of the hundred million stored lists is closest" | covered |
| O1 1975 Bentley k-d tree | Origin | "In nineteen seventy-five a computer scientist named Jon Bentley" | covered |
| O2 collapses at 100 dims; curse of dimensionality | Origin | "People called this the curse of dimensionality" | covered |
| O3 1998 Indyk, Motwani, LSH | Origin | "Nineteen ninety-eight, Piotr Indyk and Rajeev Motwani" | covered |
| O4 2011 Jegou, Douze, Schmid; 30-100x; billion images in RAM | Origin | "compress vectors thirty to a hundred times smaller" | covered |
| O5 2016 Malkov, Yashunin HNSW | Origin | "Yury Malkov and Dmitry Yashunin published H N S W" | covered |
| O6 2019-2020 DPR, second career | Origin | "like one called D P R" | covered |
| I1 embedding term; point in 768-dim space; map/room | Embedding | "Two numbers would be a point on a map" | covered |
| I2 embedding model; router vs pasta; geometry | Embedding | "how do I reset my router" | covered |
| I3 kNN | Embedding | "k nearest neighbours. Given a query point" | covered |
| F1 Fig 001 scatter + angles | Embedding | "There's a little crosshair, that's the query" | covered |
| I4 dot product | Embedding | "First, the dot product. You multiply the two lists position by position" | covered |
| I5 cosine, 1/0/-1 | Embedding | "One means same direction. Zero means at right angles" | covered |
| I6 Euclidean / L2 | Embedding | "Euclidean distance, which people also call L two" | covered |
| I7 identity in words | Embedding | "the first vector's length squared, plus the second one's length squared, minus twice their dot product" | covered |
| I8 normalize; 2 - 2 cos; same order; use fastest op | Embedding | "the squared distance becomes two, minus twice the cosine" | covered |
| I9 unnormalized disagree; use trained similarity; model card | Embedding | B: "I'd just always normalize and use cosine" / "use the similarity the model was trained with" | covered |
| PR1 Predict 0.8 -> 0.63, 0.6 -> 0.89 | Embedding | "About point six three" / "About point eight nine. Farther." | covered |
| I10 brute force / flat | Brute force | "FAISS... calls it a flat index" | covered |
| I11 N x d multiply-adds, read every number | Brute force | "N times d multiply-adds" | covered |
| I12 77 billion; 307 GB | Brute force | "about seventy-seven billion multiply-adds" | covered |
| I13 doesn't fit 128 GB; fp16 154 GB | Brute force | "a hundred fifty-four gigabytes. Still doesn't fit" | covered |
| I14 273 GB/s -> 1.1 s | Brute force | "about one point one seconds. Per query" | covered |
| PR2 compute vs memory: 8 ms vs 1,100 ms | Brute force | B: "a faster GPU would fix this" / "about eight milliseconds" | covered |
| PR2b quarter multiply-add per byte; decoding analogy | Brute force | "That's a quarter of a multiply-add per byte" | covered |
| PR2c batch 1,000, compute-bound; offline vs live | Brute force | "Batch a thousand queries together" | covered |
| F2 VecScanCost interactive | Brute force | "You've got a slider for how many vectors" | covered |
| I15 two ways out | Brute force | "So that's the two ways out" | covered |
| I16 ANN, recall@k, 0.95 = 9.5 of 10 | Approximate | "nine and a half of the true ten" | covered |
| I17 two recalls; 400th; 0.98 vs 0.6 | Approximate | B: "Okay, I know recall" / "four hundredth" | covered |
| I18 triangle; build time fourth cost | Approximate | "a triangle with three corners" | covered |
| I19 three tricks, three bets | Approximate | "each one is a different bet about which corner to give up" | covered |
| I20 library analogy | IVF | "a library with a hundred million books" | covered |
| I21 IVF term | IVF | "inverted file index, I V F" | covered |
| I22 k-means, centroid, Voronoi | IVF | "cracked tile floor" | covered |
| I23 add, search, nprobe | IVF | "That number's called n probe" | covered |
| I24 cost 65,536 + 64 x 1,526 ~ 160,000, ~600x | IVF | "About six hundred times less work" | covered |
| I25 borders; nprobe dial linear; 4-16 root N | IVF | "between about four and sixteen times the square root" | covered |
| I26 PQ fixes memory | PQ | "Trick two fixes the memory corner" | covered |
| I27 sketch artist | PQ | "describing a face to a sketch artist" | covered |
| I28 96 pieces of 8, codebook 256, one byte | PQ | "fits in one byte" | covered |
| I29 3,072 -> 96, 32x, 9.6 GB + 0.8 GB, m 48 = 64x | PQ | "Thirty-two times smaller" | covered |
| F3 Fig 003 | PQ | "Top half, the long vector chopped into ninety-six blocks" | covered |
| I30 ADC table 96 x 256 ~25,000, lookups | PQ | B: "you have to decompress" / "asymmetric distance computation" | covered |
| I31 accuracy price; top 100 re-score; re-rank term; lesson in miniature | PQ | "compressed search then exact re-rank" | covered |
| I32 IVF65536,PQ96 | PQ | "I V F sixty-five thousand five hundred thirty-six, comma, P Q ninety-six" | covered |
| I33 graph, greedy search, friend's house | HNSW | "find a friend's house in a town with no map" | covered |
| I34 slow alone; road network | HNSW | "You don't drive across the country on residential streets" | covered |
| I35 HNSW layers | HNSW | "Layer zero has every vector" | covered |
| I36 coin flips; skip list; log N | HNSW | "it's a skip list" | covered |
| F4 Fig 004 | HNSW | "Two long hops, one medium, two short" | covered |
| I37 M, 2M bottom, 256 bytes, 16-64 | HNSW | "about two hundred fifty-six extra bytes per vector" | covered |
| I38 efConstruction 100-500, fixed | HNSW | "You can't change it after building" | covered |
| I39 efSearch beam, live dial | HNSW | "Per query, live, no rebuild" | covered |
| I40 upper layers greedy ef 1 | HNSW | "plain greedy, ef of one" | covered |
| I41 neighbour heuristic, islands | HNSW | B: "I'd assume it just links to its M nearest" | covered |
| F5 Fig 005 interactive, 600 points, 12 cells | HNSW | "Six hundred points in two dimensions" | covered |
| F5a far corner, log N | HNSW | "Put the query in a far corner" | covered |
| F5b ef 5-40; real data 0.8-0.9 | HNSW | "recall around point eight to point nine" | covered |
| F5c nprobe 1 on border, bump to 2 | HNSW | "Bump n probe to two" | covered |
| F5d counters 40-70, 120, 600 | HNSW | "about forty to seventy points" | covered |
| I42 why not HNSW; 340 GB; random access | Why not HNSW | "around three hundred forty gigabytes" | covered |
| I43 index table | Why not HNSW | "So here's the rough lay of the land" | covered |
| I44 scale guide; DiskANN | Why not HNSW | "Microsoft's Disk A N N" | covered |
| I45 filters hard | Filters | B: "that's just a WHERE clause, right?" | covered |
| I46 post-filter 1% -> ~10 of 1,000 | Filters | "About ten of your thousand survive" | covered |
| I47 pre-filter; 10,000 fast; 40% terrible | Filters | "Terrible when it keeps forty percent" | covered |
| I48 during search; IVF fine; HNSW islands/waste; hnswlib, IDSelector, ACORN 2024 | Filters | "a method called Acorn from twenty twenty-four" | covered |
| I49 per-query selectivity decision | Filters | "production systems decide per query" | covered |
| I50 meaning vs exact strings; BM25 | Hybrid | "CUDA error seven hundred" | covered |
| I51 hybrid; RRF with k 60 | Hybrid | "one divided by sixty plus its rank" | covered |
| F6 Fig 006 funnel | Two-stage | "Picture a funnel, left to right" | covered |
| I52 recall vs precision division of labour | Two-stage | "That's the division of labour" | covered |
| I53 100 ms budget; 40 ms; 300 = 3x; 0.95 vs 0.99 | Two-stage | "you pay three times as much on the reranker" | covered |
| I54 NDCG | Two-stage | "Rank one gets full credit, rank three gets half" | covered |
| B0 setup, libraries | Build It | "four libraries" | covered |
| B1 MS MARCO slice, 8.8M, 6,980, 500k, 1,000, 1.6 GB | Build It | "six thousand nine hundred eighty queries" | covered |
| B2 embed, MiniLM 384, normalized, passages/sec | Build It | "Three and a half hours, just to re-embed" | covered |
| B3 brute force three ways; argpartition; top 100; 768 MB prediction | Build It | B: "seven hundred sixty-eight megabytes" | covered |
| B4 three indexes, sweeps, recall_at_k, timing, memory, build, PQ re-rank | Build It | "three indexes, three dials" | covered |
| B5 plots + agent review | Build It | "Up and to the right is better" | covered |
| B6 two stages grid, MRR, max(ef, k) quirk | Build It | "FAISS quietly uses whichever is bigger" | covered |
| B7 Done when | Build It | "You're done when the ground truth exists" | covered |
| M1 reference M4 Pro, 699 s, 715/s | Measure | "six hundred ninety-nine seconds" | covered |
| M2 brute force rows 7.0/109, 10.9/70, 0.28, 3.8/204, 0.58 | Measure | "About two hundred four" | covered |
| M3 39x; argpartition gotcha | Measure | "Thirty-nine times faster per query" | covered |
| M4 index rows (recall, QPS, ms, memory, build) | Measure | "n probe eight did about thirty thousand queries a second" | fixed (QPS added) |
| M5 IVF hard, ~120 per cell, 68%; HNSW 28x | Measure | "about twenty-eight times faster" | covered |
| M6 PQ 27x, 0.82 -> 0.62 -> 0.82 | Measure | "Exactly I V F's number at the same n probe" | covered |
| M7 HNSW 71 s vs 16 s, x200+ | Measure | "multiply by more than two hundred" | covered |
| M8 two-stage numbers | Measure | "point seven seven four, M R R point seven three nine" | fixed (brute rerank MRR/ms, HNSW retrieval ms added) |
| M9 approx cost nothing; +0.07 | Measure | "the reason your job exists" | covered |
| M10 depth past 50 nothing; knee | Measure | "Find the knee" | covered |
| M11 caveat 17x fewer distractors; ~0.3 | Measure | "seventeen times fewer distractors" | covered |
| K1 forget to normalize | Break It | "multiply them by three" | covered |
| K2 lying training sample | Break It | "make I V F's training sample lie" | covered |
| K3 selective filter, flip at 50% | Break It | "The winner flips" | covered |
| K4 starve reranker | Break It | "starve the reranker" | covered |
| E1 when measures agree | Embedding, Break It, ending | "use the similarity the model was trained with" | covered |
| E2 brute force 100M bottleneck | Brute force | "Memory's the bottleneck by two orders of magnitude" | covered |
| E3 IVF/PQ/HNSW + dials | Idea sections | n probe / m / ef search, M, ef construction | covered |
| E4 billion scale, sharding, tail latency | Scaling | "The query is only as fast as the slowest shard" | covered |
| E5 choosing ef and rerank depth | Scaling | "plot N D C G against total latency at the slow end, the p ninety-nine" | covered |
| G1 Go Deeper (HNSW paper section 4, FAISS wiki) | Close | "read the H N S W paper itself" | covered |
| C1 Connections | Close | "napkin math and bandwidth-bound applied to search" | covered (ranking-metrics/tail-latency forward links folded into E5 p99 mention; not named) |

## Numbers check

All lesson numbers checked against the script. Numbers derived here and not written in the lesson:
- "two point four times the memory" (figure 002 default verdict, 307 / 128).
- "about fifteen hundred vectors" per cell and "sixty-four times fifteen hundred, about a hundred thousand" (lesson gives 1,526 and the 160,000 total).
- "forty thousand to a hundred sixty thousand cells" (4 to 16 times the square root of 100M).
- "about twelve thousand seconds, three and a half hours" to embed 8.8M at 715 per second.
- "about two point eight milliseconds" floor for one query over 768 MB at 273 GB/s.
- "a hundred ninety-two million" (500k x 384), on the way to 768 MB.
- RRF example: one over sixty-one, about point zero one six; twice one over sixty-three, about point zero three two.
- NDCG example: rank three gets half credit.
- "two hundred fifty thousand" (half of the 500k slice) in Break It 3.
