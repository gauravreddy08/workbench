# Outline: vector-search

Source: src/lessons/vector-search.mdx. Curriculum entry: "Nearest neighbors at scale." Question: how do
you find the closest embedding among 100 million without checking them all? Why: the retrieval half
of his ranking work; recall vs speed is a dial he should be able to set.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: napkin math (back-of-envelope); bandwidth-bound vs compute-bound (decoding reads every weight once per token). -> A re-explains bandwidth-bound briefly when brute force cost comes up; "Today" list skipped.

## The Problem

- P1 Cross-encoder reads query and passage together, one score; one forward pass per pair; about 1 ms per pair batched on GPU, generous. -> A opens on his own model.
- P2 100 million passages x 1 ms = 28 hours per query. -> A; B reacts.
- P3 Two stages: cheap stage pulls about a thousand candidates; ranker reorders only those; can't bring back what it isn't handed. -> A; B voices "so my model matters most" and A says the ceiling is set earlier.
- P4 Term bi-encoder: query and document embedded separately, documents ahead of time; contrast with cross-encoder. -> A inline.
- P5 768 numbers per passage; job is which of 100M lists is closest; "one dot product per passage" sounds easy. -> A.

## Origin

- O1 1975 Jon Bentley, k-d tree: split space in half repeatedly, binary search over coordinates; great in 2-3 dims. -> A story.
- O2 In 100 dims it collapses: neighbourhood touches almost every box; curse of dimensionality; exact fast search looked hopeless. -> A; B asks why more dims hurt.
- O3 1998 Indyk and Motwani: approximate NN with locality-sensitive hashing; accept very close instead of closest. -> A.
- O4 2011 Jegou, Douze, Schmid: compress 30-100x and still search (PQ with inverted file); billion-image search fits in RAM. -> A.
- O5 2016 Malkov and Yashunin: HNSW, layered graph walked like a road network; default in most vector DBs. -> A.
- O6 2019-2020 dense retrieval (DPR) made embed-and-find-nearest a standard first stage; old tricks' second career. -> A.

## The Idea

- I1 Term embedding: fixed-length list of numbers from a model; similar meaning, similar lists. As coordinates, a point in 768-dim space; 2 = map, 3 = room; distances still work. -> A.
- I2 Term embedding model: trained so a query lands near passages that answer it; "reset my router" near router/modem lights, far from pasta. Search becomes geometry. -> A.
- I3 Term kNN: given a query, find k closest stored points. -> A.
- F1 Figure 001: left scatter (query circled near reset router, modem lights, wifi drops; pasta, tomato sauce, gpu memory, tax forms far); right unit circle with two vectors, angle and straight-line gap. -> A describes over the phone.
- I4 Term dot product: multiply position by position and add; 768 multiplies, 768 adds; big when same direction and long. -> A.
- I5 Term cosine similarity: dot product with lengths divided out; angle only; 1 same, 0 right angles, -1 opposite. -> A.
- I6 Term Euclidean / L2: straight-line gap; subtract, square, add, root; small = similar; named after the norm. -> A.
- I7 Identity: squared distance = length of a squared + length of b squared minus twice the dot product. -> A in words, no symbols.
- I8 Term normalize: divide by own length, keeps direction. With unit length, squared distance = two minus twice the cosine; fixed decreasing function, so all three give the same order. Systems normalize and use the fastest op, usually dot product. -> A.
- I9 Unnormalized they disagree: dot product rewards length; long vector roughly right beats short exactly right; some models trained to use length ("generally useful passage"); must use dot product for those. Rule: use the similarity the model was trained with; model card says. Build It model trained with cosine, outputs normalized. -> B voices "I'd just always use cosine, it's cleaner"; A corrects.
- PR1 Predict: unit vectors cosine 0.8 -> squared 0.4, distance about 0.63; cosine 0.6 -> 0.8, about 0.89, farther; lower cosine always larger L2. -> A asks, B works it out.
- I10 Term brute force / flat: compare to every vector, keep top k; always correct; linear cost; FAISS "flat". -> A.
- I11 Cost: N times d multiply-adds; must read every stored number once. -> A.
- I12 100M x 768 fp32: about 77 billion multiply-adds; 307 GB, read every query. -> A, B asks for actual numbers.
- I13 Spark has 128 GB: doesn't fit; even fp16 is 154 GB. -> A.
- I14 If it fit: 273 GB/s -> about 1.1 s per query. -> A.
- PR2 Predict: compute or memory? GPU tens of trillions per second; at 10 trillion, 77 billion = about 8 ms vs about 1,100 ms reading. Memory bottleneck by two orders of magnitude. -> B says "it's 77 billion operations, surely compute" (diagnostic gap: numbers, memory-bound); A corrects.
- PR2b Why: each 4-byte number used in one multiply-add, quarter of a multiply-add per byte; chip waits; same as decoding one token (re-explain bandwidth-bound). -> A.
- PR2c Fix: batch 1,000 queries, each number used 1,000 times, matrix multiply, compute-bound; offline ground truth brute forces happily on GPU; live one-at-a-time service can't. -> A; B links to batching in decoding.
- F2 Figure 002 interactive: sliders for vector count, dims, storage (fp32/fp16/int8/PQ 96 B), machine (Spark/H100); bar of index size vs memory; read time is a floor; fewer bytes helps linearly, only not reading most vectors helps by orders of magnitude. -> A: what you'd see as you drag.
- I15 Two ways out: read fewer bytes per vector (fp16 halves, int8 quarters, PQ tens of bytes); read fewer vectors (jump to the right neighbourhood). Every serious index does one or both, gives up exactness. -> A signpost.
- I16 Term ANN: probably nearest, much faster. Term recall@k: of the true k (brute force), fraction returned; 0.95 = 9.5 of 10 on average. -> A.
- I17 Two recalls: ranking recall (relevant docs, human labels, measures embedding model) vs ANN recall (same top 10 as brute force, measures index). Model ranks passage 400th -> perfect index still 400th. ANN recall 0.98 next to retrieval recall 0.6. -> B conflates (he knows ranking metrics); A separates.
- I18 Triangle: recall, latency/QPS, memory; buy one with the other two; examples (look at more, compress, add graph). Build time a fourth hidden cost; some indexes take hours, can't absorb new vectors. -> A.
- I19 Three tricks, each a bet about which corner to give up. -> A signpost.
- I20 IVF library analogy: 100M books, no catalogue; sort into a thousand rooms by topic; search only a few rooms. -> A, short.
- I21 Term IVF: inverted file; clusters ahead of time, list per cluster. -> A.
- I22 Train: Term k-means (pick centres, assign, move to average, repeat); nlist centroids (Term centroid: average of its vectors); Term Voronoi cells (each point to nearest centre, cracked tile floor). -> A.
- I23 Add: each vector into list of nearest centroid. Search: compare to all nlist centroids, pick nprobe nearest, brute-force those cells. -> A.
- I24 Cost: nlist + nprobe x N/nlist; 100M, nlist 65,536, nprobe 64 -> 65,536 + 64 x 1,526 = about 160,000 distances; about 600x less. -> A in words with the worked numbers.
- I25 Catch: borders; true neighbour across the line; in 768 dims many neighbouring cells, query near several borders. nprobe is the dial; recall up, speed falls linearly. FAISS docs: nlist about 4 to 16 times square root of N; then sweep nprobe. -> B: "so just probe more"; A: linear cost.
- I26 PQ: IVF doesn't shrink vectors, still 307 GB. Term PQ: cut into m pieces, each replaced by one-byte ID from a learned codebook. -> A.
- I27 Sketch-artist analogy: eyes type 17, nose 203, mouth 4, from a book of 256 shapes. -> A.
- I28 Steps: 96 pieces of 8; k-means with 256 centres per piece = Term codebook (index 0-255 fits in a byte); store 96 bytes. -> A.
- I29 Memory: 3,072 -> 96 bytes, 32x; 307 GB -> 9.6 GB plus IVF IDs (8 bytes each, 0.8 GB); fits on Spark; m = 48 -> 64x smaller, less accurate. -> A.
- F3 Figure 003: top, vector cut into pieces, each becomes a code (17, 203, 4, 88 ... 131); bottom, query table 96 x 256 once, score = 96 lookups added up, bytes read 96 not 3,072. -> A over the phone.
- I30 Query-time trick: never decompress; split query into 96 pieces, similarity to each of 256 entries, about 25,000 numbers, fits in cache; score = sum of 96 lookups. Term ADC: only one side compressed, keeps more accuracy. Fewer bytes is exactly what a bandwidth-bound problem needs. -> B wrong model: "you decompress then compare"; A corrects.
- I31 Price: each piece snapped, scores slightly wrong, top shuffled. Fix: top 100 from PQ, re-score with full vectors (disk or slower memory), keep 10. Term re-rank. The whole lesson in miniature. -> A.
- I32 FAISS name IVF65536,PQ96: rooms to read fewer, PQ to make each small. -> A in words.
- I33 HNSW graph: connect each vector to near neighbours; Term greedy search: step to closest neighbour until none closer; can get stuck locally. Finding a friend's house with no map. -> A.
- I34 Slow alone: short links = thousands of tiny steps. Road network: local roads, highway, local roads. -> A.
- I35 Term HNSW: layers; layer 0 every vector, local roads; layer 1 about one in M, longer links, regional highway; layer 2 one in M of those; up to a handful. -> A.
- I36 Top layer chosen at random at insertion with exponentially falling odds, like coin flips; Term skip list (express lanes, about log N steps); HNSW = skip list with graphs. -> A.
- F4 Figure 004: three layers on one line; enter at top, two long hops, drop, one medium hop, drop, two short hops to query; each layer down more nodes, shorter links. -> A over the phone.
- I37 Parameter M: links per node per layer (bottom often 2M); more = better recall, more memory (4-byte IDs, at M 32 about 64 x 4 = 256 extra bytes per vector on layer 0), slower builds; typical 16-64. -> A.
- I38 efConstruction: search width on insert; better wiring, slower build; 100-500; fixed after build. -> A.
- I39 efSearch / ef: bottom layer width at query time; keeps running list of best ef, expands closest unexplored until nothing can beat the worst; recall up speed down; live dial, no rebuild. -> A; B notes it's the one you'd actually touch.
- I40 Upper layers plain greedy (ef 1): only to reach neighbourhood. -> A.
- I41 Neighbour selection heuristic: skip candidate if closer to an already-chosen neighbour than to the node; keeps links pointing away to other clusters; without it clustered data breaks into islands. -> B: "why not just the M nearest?"; A explains.
- F5 Figure 005 interactive: 600 points in 2D; HNSW mode, big dark dots carry the search, then bottom layer; IVF mode, 12 cell centres ranked, scan nprobe cells; counter vs brute force 600; in 2D rarely misses. -> A says what you'd see.
- F5a Try: far-corner query, hops per layer roughly constant, so cost grows with log N not N. -> A.
- F5b ef 5 to 40: distance count rises, found set perfect in 2D; real 768 data, low ef recall about 0.8-0.9. -> A.
- F5c IVF nprobe 1, query on a border: misses neighbours next door; nprobe 2 fixes. -> A.
- F5d Counters: HNSW about 40-70, IVF nprobe 2 about 120, brute force 600; gap enormous at 100M. -> A.
- I42 Why not always HNSW: default because best recall-vs-speed at given memory, handles inserts without retraining. But full vectors plus links: 100M x (3,072 + about 300) = about 340 GB; no compression; random access pattern wants all in RAM. -> B: "so HNSW everywhere?"; A.
- I43 Table: flat 3,072 B, slowest, exact ground truth; IVF-Flat 3,072 + 8 B, fast, needs training, border misses; IVF-PQ m 96 about 104 B, fast, 30x less, re-rank; HNSW M 32 about 3,300 B, fastest, big, no training, easy inserts, slow builds, deletes awkward. -> A talks through, not row by row.
- I44 Scale guide: 100M one box, IVF-PQ often only fit; few million, HNSW in RAM; billions, combine (graph over compressed vectors, full vectors on SSD, DiskANN). -> A.
- I45 Filters: real queries with conditions (English, last month, this customer); one of the hardest problems. -> B: "just add a WHERE clause"; A.
- I46 Post-filter: top 1,000 then drop; 1% passes -> about 10 survive, wanted 100; selective filter means searching nearly everything. -> A.
- I47 Pre-filter: find all passing, brute force them; great for few (10,000 is fast); terrible at 40% of 100M. -> A.
- I48 Filter during search: IVF fine (skip entries); HNSW subtle: refuse to step through failing nodes -> islands, stuck; step through but don't return -> wasted work on selective filter. hnswlib filter function, FAISS IDSelector; ACORN (2024) denser graphs. -> A.
- I49 Production decides per query from estimated selectivity: pre-filter + brute force when few pass, filtered graph otherwise. -> A.
- I50 Hybrid: embeddings good at meaning (cheap flights / low-cost airfare), bad at exact strings (product codes, error messages, rare names, version numbers). Term BM25: query words, rare count more, dampen repeats and long docs, inverted index of words; finds CUDA error 700, doesn't know car = automobile. -> A; B connects to his own experience? A.
- I51 Term hybrid search: run both, merge. Scores not comparable (BM25 unbounded, cosine -1 to 1), so merge by rank: Term RRF, sum of one over (60 + rank); simple, robust, hard to beat without a trained merger. -> A with a small worked example; B asks why not average scores.
- F6 Figure 006: funnel; 100M corpus -> ANN (HNSW / IVF-PQ, about 1-10 ms) and BM25 (about 1-10 ms) each about 1,000 -> RRF fuse -> top 100 -> cross-encoder, 100 forward passes, about 10-100 ms GPU -> top 10. Cheap per item many items vs expensive per item few; recall set at retrieval, precision at rerank. -> A over the phone.
- I52 Division of labour: first stage's job recall (get it in, sloppy order OK); second stage precision (put it at top, slow per item fine, only 100). -> A; B restates for his ranker.
- I53 Budget: 100 ms total; reranker 100 pairs in 40 ms, retrieval gets the rest; rerank 300 pays 3x; ANN recall 0.95 vs 0.99 might cost nothing (misses are near-duplicates at ranks 8-10 the reranker reorders) or a lot; can't reason, measure end to end in NDCG. -> A.
- I54 Term NDCG: credit per relevant result shrinking with position, summed, divided by best possible; 1.0 perfect; NDCG@10 top 10 only. -> A in words with small example.

## Build It

- B0 Setup: folder on the Spark, virtual env; faiss-cpu (Meta's library, ARM64 wheels, GPU build via conda, check), hnswlib (reference HNSW from the authors), sentence-transformers, datasets. -> A one sentence.
- B1 Task 0: MS MARCO about 8.8M passages, dev small 6,980 queries with labels (usually one relevant). Tonight: 500,000-passage slice guaranteed to contain relevant passages for 1,000 dev queries, padded with random distractors; BEIR copy on Hugging Face, corpus parquet about 1.6 GB. Embedding all 8.8M is an overnight job later. -> A.
- B2 Task 1: embed with msmarco MiniLM L6 cos v5 (384 dims, 6 layers, cosine, ask for normalized). Write down passages per second: cost of re-indexing when you change the model; 8.8M at your rate is how long? -> A; answer with the reference rate (derived: about three and a half hours).
- B3 Task 2: brute force three ways (numpy one query, numpy batch matrix multiply, torch GPU batch 1 and 1000 with synchronize, warm up); argpartition hint; save exact top 100 as ground truth. Prediction: 500k x 384 x 4 = 768 MB; fastest one query at 273 GB/s (derived about 2.8 ms). -> B works the 768 MB.
- B4 Task 3: build each index, sweep dial; record recall@10 vs gt, QPS, memory. IVF nlist 4096 (about 6 root N), nprobe 1 to 128 doubling; IVF-PQ m 48 (384/8); HNSW M 16 and 32, efSearch 10 to 256. Write recall_at_k yourself (overlap of sets over k, averaged). Timing two ways: batch throughput and one at a time latency, one thread pinned. Memory from formulas checked against serialized size or RSS. Build time (HNSW surprises). IVF-PQ top 100 + exact re-score variant. -> A, the part that matters.
- B5 Task 4: two plots: recall vs QPS (log), one line per index type, brute force marked, up-and-right better (ANN-benchmarks plot); recall vs memory. Agent reviews measurement code for unfair comparisons: missing warm-up, differing threads, build time in query time, gt with different metric. -> A.
- B6 Task 5: two stages: own cross-encoder or public ms-marco MiniLM L 6 v2; retrieve, rerank, ndcg_at_10 with binary relevance. Grid: NDCG@10, MRR@10 (one over rank of first relevant, 0 if not in top 10; MS MARCO official), recall@100 of labelled passages, per-stage latency. Retrieval alone depth 100 brute and HNSW ef 100/256; FAISS uses max(efSearch, k) quirk; HNSW depth 1000 (ef at least 1000) rerank 10/50/100/200; same with brute force. Map row ids to BEIR ids; sync GPU; batch 64-128. -> A; B asks about MRR.
- B7 Done when: gt exists, plots, two-stage table with numbers on NDCG cost and rerank 200 vs 100, defend "100 ms, 128 GB, 100M passages" choice with arithmetic. -> A folds into the close of Build It.

## Measure

- M1 Reference: M4 Pro MacBook, same 273 GB/s spec, Mac GPU embedding, FAISS 1.15 CPU, one thread; embedding 699 s, about 715 per second; shapes should match. -> A.
- M2 Brute force 768 MB: numpy one at a time 7.0 ms, 109 GB/s; FAISS flat one thread 10.9 ms, 70 GB/s; FAISS batch 1,000 one thread 0.28 ms; torch Mac GPU batch 1 3.8 ms, 204 GB/s; batch 1,000 0.58 ms. Effective GB/s = bytes / time; one CPU thread won't reach spec. -> A, B reacts to 204.
- M3 Lesson: bandwidth-bound one at a time (3.8 ms, about 200 GB/s close to spec), compute-bound in batch (39x faster per query on same thread). argpartition vs full sort gotcha. -> A.
- M4 Indexes: flat 1.000, 3,605 QPS batched, 10.9 ms, 768 MB; IVF nprobe 8 0.681, 30,506, 0.13 ms, 772 MB, 16 s; nprobe 32 0.822, 9,106, 0.19 ms; nprobe 128 0.913, 2,433, 0.50 ms; IVF-PQ48 nprobe 32 0.624, 11,363, 0.18 ms, 28 MB, 20 s; + re-rank 100 0.819; HNSW ef 16 0.897, 8,001, 0.13 ms, 904 MB, 71 s; ef 64 0.976, 2,755, 0.38 ms; ef 256 0.996, 828, 1.37 ms. -> A tells as a story, not a table.
- M5 Real embeddings hard for IVF: 4,096 cells about 120 each, nprobe 8 found 68%; neighbours scattered; HNSW ef 64 0.976 at 0.38 ms, about 28x faster than single-thread brute force; HNSW default when it fits. -> B surprised IVF is so bad.
- M6 PQ: 27x less memory; 48 bytes + 8 ID; recall 0.82 -> 0.62 at nprobe 32; re-rank 100 back to 0.82, exactly IVF-Flat's; re-rank fixes order, can't fix what IVF never looked at. -> A.
- M7 HNSW builds slowly: 71 s for 500k on 10 threads vs 16 s IVF; at 100M multiply by more than 200 (super-linear); plan for hours. -> A.
- M8 Two-stage: brute none 0.774 / 0.739, 6.8 ms; HNSW ef 100 none 0.763 / 0.729, 0.6 ms; ef 256 none 0.775 / 0.740, 1.3 ms; brute + rerank 100 0.841 / 0.809, 7.2 ms + 125 ms; HNSW ef 1000 rerank 10 0.808 / 0.784, 16 ms; 50 0.841, 61 ms; 100 0.841, 125 ms; 200 0.841, 233 ms; HNSW retrieval about 4.7 ms. First 300 of the 1,000 queries, public MiniLM cross-encoder. -> A.
- M9 End to end approximate index cost nothing: both 0.841 after rerank 100; reranking added 0.07 NDCG, the reason his job exists. -> B line, A.
- M10 Rerank past 50 bought nothing, cost linear (61, 125, 233 ms); find the knee; Spark faster but shape holds. -> A.
- M11 Caveat: scores high because 500k slice has 17x fewer distractors than 8.8M; full MS MARCO MRR@10 for small bi-encoders closer to 0.3; compare configs to each other, not leaderboards. -> B asks "0.84 seems high"; A.

## Break It

- K1 Forget to normalize (or scale random 10% of rows by 3), search inner product: recall vs cosine gt drops, top fills with long vectors. Normalize and use L2 flat: rankings match inner product exactly, identity checked. Metric is part of the model's contract. -> what-if exchange.
- K2 Lying IVF training sample: train on first 10,000 after sorting by length, then add all; giant and empty cells; recall and speed both worse at same nprobe; print 20 biggest lists; production drift, periodic retraining. -> exchange.
- K3 Selective filter: random language, 1% "de"; top 10 German three ways: post-filter top 100 (count short results), post-filter top 5,000, pre-filter + brute force over about 5,000 (exact and fast). Then 50%: winner flips. -> exchange.
- K4 Starve reranker: efSearch 10, retrieve 10, rerank: NDCG@10 capped by retrieval recall@10; push depth to 100, NDCG climbs though index unchanged. Ceiling set one stage earlier. -> exchange, ties to P3.

## Explain It Back (substance must be in the conversation)

- E1 Same ranking when unit length (dot = cosine, squared L2 = 2 - 2 cos, decreasing); otherwise dot rewards length; use what model trained with; normalize only if cosine. -> covered by I8/I9/K1; ending.
- E2 Brute force 100M: 307 GB, doesn't fit 128 GB, about 1.1 s at 273 GB/s, bandwidth-bound, quarter multiply-add per byte; batching compute-bound offline; fewer bytes and, much more, fewer vectors. -> I12-I15.
- E3 IVF/PQ/HNSW plain + dials (nprobe; m and re-score; efSearch, M, efConstruction). -> Idea sections.
- E4 Billion scale: brute force 3 TB fp32 at 768, seconds per query; HNSW log N query but over 3 TB, wants RAM, long build hard to parallelize; IVF-PQ about 100 bytes, about 100 GB, grow nlist with N; shard across machines, search in parallel, merge top-k, full vectors on SSD to re-score top few hundred (DiskANN-style); tail latency: query as slow as slowest shard. -> A in a dedicated scaling exchange (B asks "and at a billion?").
- E5 Pipeline settings: start from latency budget, measure end to end; reranker linear in depth; retrieval just gets relevant into depth; ANN recall@10 not the target, final NDCG; sweep efSearch and depth together, plot NDCG vs total p99 latency, pick cheapest within small margin of brute+rerank; sloppy index often fine; hybrid BM25 via RRF often buys more than a more exact index. -> close of Measure / ending.

## Go Deeper / Connections

- G1 Best sources: HNSW paper (section 4 heuristic) and the FAISS wiki's "guidelines to choose an index". -> one sentence.
- C1 Connections: back-of-envelope and bandwidth-bound applied to search; PQ cousin of quantization; IVF and BM25 lists are indexes like B-trees (precomputed structure paid at write time); next ranking metrics (is 1,000 queries enough for 0.01) and p99 (per-query latency matters). -> A, short.

## Flow

Problem (P1-P5) -> Origin (O1-O6) -> embedding as point, three measures, identity, Predict 1 -> brute force cost, Predict 2 (B's compute-bound wrong model), figure 2, two ways out -> ANN, two recalls (B conflates), triangle -> IVF -> PQ (B's decompress model) -> HNSW + figures 4 and 5 -> why not HNSW + table + scale -> filters (B's WHERE clause) -> hybrid + RRF -> two-stage, budget, NDCG -> Build It -> Measure -> Break It -> billion-scale exchange (E4) -> pipeline-setting (E5) -> Connections + sources -> ending: B restates, A sharpens.
