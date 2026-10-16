# Outline: back-of-envelope

Source: src/lessons/back-of-envelope.mdx. Curriculum entry: "How does it scale?" Question: how do you
estimate whether a design will hold up before you build it? Why: the question that stumps him in
interviews; it is arithmetic with the latency numbers, nothing more. Diagnostic gap hit: Numbers (no
feel for latency, bytes, memory sizes, bandwidth; "this is why how does it scale stumps him"). Also
touches "why decoding is memory-bound" and memory math.

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereqs: latency numbers, Little's law (waiting-vs-working), bytes per token and compute vs memory bound (bandwidth lesson). -> Not listed; each idea re-explained in one or two sentences where it is used (Little's law at W1 memory check, compute-vs-bandwidth at S2b, KV cache at W3).

## The Problem

- P1 Interview scene: ranker described (cross-encoder re-scoring top candidates from cheaper retrieval), training data, loss, NDCG gains; "Nice. So how does it scale?" -> A opens directly on the scene.
- P2 Term cross-encoder: reads query and one document together in one forward pass, outputs a score; accurate but a full forward pass per pair. -> A inline in the scene.
- P3 Blank: scale to what? users, documents, GPU, database? "horizontal scaling", "add more GPUs" = a vibe, not an answer. -> B voices this as their own honest answer; A names it a vibe.
- P4 The strong ninety-second answer: 10M/day, 10^5 s, 100 QPS avg, 300 peak, 100 candidates x 256 tokens, ~10M tokens/s, BERT-base ~10^8 params, 2x10^8 FLOPs/token, 2 petaFLOPs/s, H100 10^15 on paper, ~40% real, five H100s, eight with headroom and spare, compute breaks first, memory/network nowhere close, at 10x cut candidates with a cheaper stage before buying 50 GPUs, candidates multiply everything. -> A performs it, in spoken numbers, as a sample.
- P5 Nothing clever; every step multiplication by a number you could look up; strong candidate has a method and a stock of numbers. -> A, straight after; B reacts ("that's it?").

## Origin

- O1 Trinity, July 1945, Fermi ~16 km away, torn paper, dropped scraps, pushed ~2.5 m, announced ~10,000 tons TNT; official ~20,000 after weeks with instruments; off by factor of two. -> A tells it as story.
- O2 Fermi problems: piano tuners in Chicago, people, households with piano, tuning frequency, tunings per day, within a factor of a few. -> A, quick.
- O3 1980s Jon Bentley, Programming Pearls column "The Back of the Envelope"; 2009 Jeff Dean "Numbers Everyone Should Know" slide at Google followed by estimates; the interview question is a Fermi problem with a server in it. -> A, closing line of story.

## The Idea: what scale means

- S0 Precise meaning: as load grows, which resource runs out first, at what load, what do you do? -> A, after B's "scale to what".
- S0b Things a machine runs out of: GPU multiply-adds/s, memory bytes, memory bytes/s, network bits, CPU parse/tokenize speed, money. System is a pipe through all of them; narrowest sets the limit. -> A, said as a pipe image.
- S0c Term bottleneck: resource that fills first; making anything else faster does nothing until you widen this one. -> A.
- S0d Job: name the bottleneck, put a number on where it hits, say what you'd change. -> A.
- F1 Figure 001 five steps: clarify load (QPS avg+peak, read:write, size, growth), list resources, arithmetic (load x cost per request = demand per second per resource), compare (demand / capacity = machines; biggest ratio = bottleneck), what breaks and what changes at 10x/100x, then repeat at x10. Steps 1 and 3 are where people skip; step 5 is what interviewers want. -> A lists the five as a spoken sequence, with the loop back at the end.

## Step 1: clarify the load

- C1 Ask or state an assumption out loud; interviewers like either, hate neither. -> A.
- C2 Term QPS: queries per second, the rate work arrives. Load quoted per day because dashboards; machines fail per second. -> A.
- C3 Never size for average. Traffic follows people (day/night by timezone). Consumer busiest hour 2-3x daily average; event-triggered (launch, news spike, midnight batch job) 10x or more. Term peak factor: peak / average; ask or state yours. -> B: "why not just average?"-style wrong model ("it averages out over the day"); A corrects.
- C4 Mix / read:write ratio: search almost all reads, logging almost all writes, chat writes every message and reads the whole conversation back each turn. Decides caching and replicas (read-heavy) vs fast appends and batching (write-heavy). -> A, three quick examples.
- C5 Size per request and total data (items x bytes); most mistakes here: forgetting a ranker "document" is 256 tokens, not one ID. -> A.
- C6 Growth: 2x per year is 10x in a bit over three years; "what at 10x" is the next design review. -> A.

## Step 2: list what can run out

- R1 Table: compute (FLOP/s, core-seconds; math units always busy), memory size (GB; working set doesn't fit), memory bandwidth (GB/s; every step waits on bytes), disk (IOPS, MB/s, TB; too many random reads or too much data), network (Gbit/s, round trips; card full or chains of calls add up), money ($/month; finance notices). -> A runs through as a spoken list, not a table; finance line as a light joke.
- R2 Term FLOP: one floating-point multiply or add; multiply-add counts 2; FLOP/s; modern GPU 10^14 to 10^15. -> A.
- R3 2N rule: forward ~2 FLOPs per parameter per token (one multiply, one add per weight the token passes); training ~6 (backward ~2x forward); from scaling-laws papers; "110M-parameter model" to GPUs in one line. -> A.
- S2b Compute vs bandwidth recap: LLM decoding reads every weight for one token at a time -> waits on memory. Ranker: 100 pairs x 256 tokens = 25,600 tokens share every weight read -> much math per byte, like prefill, compute-bound. Which kind tells you which bar to watch. -> B voices wrong model ("models are memory-bound, right? that's what the 17 tokens a second thing was"); A corrects with tokens-per-weight-read. Re-explain decoding briefly.

## Step 3: arithmetic with powers of ten

- A1 Stop carrying digits: one significant figure and a power of ten, multiply leading digits, add exponents; example 3x10^2 x 2.5x10^4: 3 x 2.5 ~ 8, 2+4 = 6, 8x10^6. 20% off per step fine. -> A walks the worked example in words ("three hundred times twenty-five thousand").
- A2 Term order of magnitude: power of ten a number is closest to; 300 and 700 both hundreds; 300 vs 3,000 differ by one. The question: one machine, ten, or a thousand? -> A.
- A3 Conversions: day 86,400 ~ 10^5 (1M/day ~ 10/s, really 11.6); month ~2.6M s ~ 2.5x10^6; year ~31.5M ~ 3x10^7 (pi x 10^7); 2^10 = 1,024 ~ 10^3, KiB ~ KB, 7% off; ~730 hours a month for $/hour -> $/month; doubling every year ~10x in 3.3 years, 1,000x in 10. -> A, spoken, the ones that matter; B asks "seven percent off" or similar real question on KiB? Keep compact.
- A4 10^5 trick underestimates ~15%; if that changes your decision, too close to call, "borderline, I'd measure". -> A.
- PR1 Predict: 50M/day, 3x peak -> 5x10^7 / 10^5 = 500/s avg, x3 = ~1,500 QPS; exact ~1,736; 14% low, changes nothing: thousands, not tens or millions. -> A asks, B works it out loud and gets it, A gives exact.

## Step 4: compare against one machine

- M1 Capacity stock, approximate: CPU core compiled ~10^9 simple ops/s; pure Python ~10^7; fast Rust tokenizer ~10^6 tokens/s (measured 1.15M on an M4 Pro, one thread); server RAM 128 GB to 2 TB per box, 50-500 GB/s; NVMe 5-7 GB/s sequential, 10^5-10^6 random reads/s, few TB to tens of TB; spinning disk ~150 MB/s, ~100 random reads/s; NIC 10-100 Gbit/s = 1.25-12.5 GB/s (divide bits by 8); round trip ~0.5 ms same datacenter, ~150 ms cross-continent; H100 spec ~10^15 FLOP/s dense BF16, 80 GB, 3.35 TB/s; Spark spec ~10^14 BF16 at most, 128 GB, 273 GB/s; cloud H100 ~$2-3/GPU-hour (prices move); S3 ~$0.02/GB-month. -> A tells these grouped with comparisons, not as a table; B reacts to the Python 100x and the bits/bytes trap.
- M2 Correction 1: never spec peak; 30-50% of peak decent for inference; Term MFU: model FLOPs actually needed per second / hardware peak; 40% good; small models and batches much less. Use 40% unless measured. -> A.
- M3 Correction 2: never 100% busy; queueing waits explode near 100% (tail-latency lesson); size ~60-70% busy at peak plus a spare. Term headroom. -> B's wrong model ("if it's 5 GPUs of work, buy 5"); A corrects.

## Step 5: what breaks, 10x and 100x

- B1 Biggest demand/capacity ratio = bottleneck; say what you'd do, and what breaks next (sounds senior). At 10x add machines; at 100x change design: cut work per request, cache, precompute, approximate. -> A.

## Worked example 1: ranker

- W1a Assumptions: 10M/day, 3x peak, 100 candidates, 256 tokens/pair, BERT-base 110M params, ~86M outside embedding table (lookup, no FLOPs). -> A states them as you would in the room; B asks why subtract embeddings.
- F2 Figure 002 chain: 10^7/day -> /10^5 x3 -> 300 QPS -> x100 -> 3x10^4 pairs/s -> x256 -> ~10^7 tokens/s -> x 2x10^8 -> 2x10^15 FLOP/s -> / 4x10^14 per H100 -> ~5 H100 or ~40 Sparks -> + headroom + spare ~8 H100. Every number is a lever: halve candidates, halve GPUs; the chain, not the final number, is what to show. -> A walks the chain as a sequence of multiplications; lever point said plainly.
- W1b Tokens: x256 ~8x10^6, call it 10^7. Mac test: query plus 230-word snippet = 243 tokens. -> A.
- W1c FLOPs: 2 x 86M ~ 1.7x10^8 per token weights, plus attention ~4 x layers x width x seq length = 4x12x768x256 ~ 10^7, under 10% at 256 tokens; round 2x10^8; total 2x10^15. -> A in words, attention said as "four times layers times width times length".
- W1d Compare: H100 10^15 x 40% = 4x10^14; 5 H100s; 70% busy and a spare: 8. Spark compute ~8x lower than H100 (BF16 figure derived from FP4 marketing number) -> ~40 Sparks. -> A.
- W1e Memory size: model 220 MB BF16; activations per query batch 25,600 x 768 x a dozen live values x 2 bytes ~ half a GB; Little's law (in flight = arrival rate x time each spends) 300/s x 0.1 s = 30 in flight, ~15-20 GB across the fleet. Fine. -> A, Little's law re-explained in one line.
- W1f Network: 100 docs x 256 tokens x ~4 bytes text/token ~ 100 KB per query; x300 = 30 MB/s ~ 0.25 Gbit/s on a 10-25 Gbit/s card. Nothing. -> A.
- W1g Latency: one query 25,600 x 2x10^8 = 5x10^12 FLOPs; H100 at 4x10^14 ~13 ms; Spark at ~5x10^13 ~100 ms; is that in budget? adding Sparks doesn't make one query faster. -> B wrong model ("just add more Sparks then"); A corrects.
- W1h Breaks first: GPU compute by a factor of a hundred over everything else. -> A.
- W1i At 10x (100M/day): 50 H100s plus headroom, $100k+/month. Levers: candidates biggest (cheap bi-encoder or distilled MiniLM cross-encoder narrows 100 to 20 = 5x fewer FLOPs); truncate to 128 tokens = 2x; smaller model 2-8x; cache scores for repeat queries. Term Zipf: few items very common, long tail; 10th most popular searched ~1/10 as often as 1st; caches love it. -> A, B asks which lever first.
- W1j At 100x (a billion/day, web-search scale): 500 H100s just for ranker, ~$1M/month; nobody runs full cross-encoder on 100 candidates; multi-stage cascades, distillation, aggressive caching, big model only on top few. -> A.
- PR2 Predict: 100,000/day on a 32-core CPU box (~10^11/core vector on a good day; whole box ~10^12 achieved). 1 QPS avg, 3 peak; 5x10^12 per query; demand 1.5x10^13; 15x short; one query alone 5 s. GPU wins because a single query is big, not because load is big. MiniLM-L6 (~8x fewer FLOPs/token) + 50 candidates = 16x less: ~0.3 s/query, box roughly keeps up at 3 QPS. -> B guesses "a hundred thousand a day is nothing, CPU's fine"; A reveals.

## Feel it: calculator (Figure 003)

- F3 Interactive: queries/day from a thousand to ten billion, peak, candidates, tokens, model (MiniLM-L6 22M, BERT-base 110M, BERT-large 335M, Qwen3 0.6B), node (32-core CPU, Spark, H100), percent of peak; five bars (compute, memory bandwidth, memory size, network, CPU cores) on a log scale as demand / one node; 100% line; first to cross = bottleneck; outputs breaks first, nodes at 70% busy, one query alone, cost/month. Changing work shape reorders bars = what "it depends" means. Assumptions rough (2N, ~1M tokens/s per core, 4 bytes/token, 100 ms budget for Little's law). -> A describes what you see as you drag.
- F3a Default then H100: same bottleneck, ~8x fewer nodes. -> A.
- F3b 1k/day: every bar near zero; one box, bored. -> A, B laughs.
- F3c MiniLM-L6, 10 candidates, 64 tokens on H100: compute not the wall; CPU (tokenizing, request handling) and memory bandwidth catch up; real systems: GPU at 15% util because the Python process feeding it is pegged. -> A.
- F3d Qwen3 0.6B, 1024 tokens on Spark: "one query alone" goes red; no node count fixes a single query over budget. -> A.
- F3e CPU box, slide up from 1k: where does it stop being enough? -> A leaves as something to try (not a quiz question; phrased as what you'd watch).

## Worked example 2: a billion pages

- E1 TinyFish-shaped: semantic search over a billion pages, how much storage, where does it live? 10^9 pages, one vector each, 768 numbers. -> A opens with it as a work scene.
- E2 Sizes: float32 3,072 B -> 3 TB; bf16/fp16 1,536 B -> 1.5 TB; int8 768 B -> 770 GB; binary 96 B -> 96 GB; PQ 64 codes 64 B -> 64 GB. -> A says as a ladder going down, not table rows: four bytes, two, one, one bit, 64 bytes total.
- E3 Term quantization: fewer bits than computed in, small accuracy loss, big size drop; int8 one byte instead of four. Term product quantization: split into chunks (say 64), replace each with ID of nearest typical chunk from learned codebook; 64 one-byte IDs instead of 3 KB. -> A; B asks how 3 KB becomes 64 bytes.
- F4 Figure 004: log-scale bars vs lines: Spark RAM, 1 TB RAM box, 8 TB SSD. Full precision a few TB: one SSD but a dozen machines' RAM; compressed codes fit one box's RAM; which line depends on searching from memory or disk. -> A as a picture over the phone.
- E4 Compare: 1.5 TB bf16 on one SSD easily; in RAM a dozen Sparks or two large servers. Chunking: embed models take ~512 tokens, 2,000-token page -> ~4 chunks: 4x10^9 vectors, 6 TB bf16. Term HNSW: graph linking each vector to a few dozen neighbours, search hops; 32 neighbours x 4 bytes = 128 B/vector, a sixth extra for int8. -> A.
- E5 Searching: brute force reads all 1.5 TB per query; at H100 3.35 TB/s half a second per query; doesn't fit on one H100 anyway; at 100 QPS hopeless. Term approximate nearest neighbour: finds most closest while looking at a tiny fraction via index; trades a little recall for 100-1000x less work. Vector-search lesson. -> B: "just put it on a GPU"; A answers.
- E6 Computing them, the surprise: 10^9 x 2,000 = 2x10^12 tokens; x 2x10^8 = 4x10^20 FLOPs; / 4x10^14 = 10^6 GPU-seconds ~ 280 GPU-hours; under $1,000 rented. One Spark at ~5x10^13: ~90 days; rent the cluster. Expensive part is keeping them in RAM forever with replicas. -> B wrong model ("computing a billion embeddings must be the expensive bit"); A reveals.
- E7 Fetching: crawl 10^9 in a day = 10^4 pages/s; ~1 s each (DNS, TLS, slow server); Little's law 10^4 x 1 = 10,000 in flight; bandwidth 10^4 x 100 KB = 1 GB/s, one fast card; it's a concurrency problem, the one waiting-vs-working solves. -> B: "that's a bandwidth problem"; A corrects.
- E8 Breaks first: memory size if full vectors in RAM. 10x: compress (int8, PQ), codes in RAM, full vectors on SSD for re-scoring, shard. 100x: shard count in hundreds; cost per query of asking every shard is next wall. Term shard: one slice of the dataset on one machine; query asks every shard and merges. -> A.

## Worked example 3: KV cache

- K1 "Llama 3.1 8B for chat; users per GPU?" Users hold a GPU only while a response generates. Little's law: 10 messages/s at peak x 15 s stream (300 tokens at 20 tok/s) = 150 generating at once. Each with ~4,000-token conversation in KV cache. Term KV cache: stored keys and values for every past token in every layer so attention doesn't recompute; each conversation its own; read in full every decode step. -> B wrong model ("users per GPU = how many signed in"); A corrects with Little's law.
- K2 Arithmetic: 2 (K and V) x 32 layers x 8 KV heads x 128 dims x 2 bytes = 128 KiB/token; x 4,096 = 512 MiB per conversation; x150 = 75 GiB (80 GB); plus 16 GB weights. -> A in words; B checks "half a gig per chat?".
- F5 Figure 005: Spark (128 GB, 273 GB/s) fits ~208 in memory but ~21 at >= 10 tok/s (bandwidth limit); H100 SXM (80 GB, 3.35 TB/s) fits ~119 (memory limit) vs ~594 by bandwidth. Memory: (capacity - 16 GB) / 0.54 GB; bandwidth: step = (16 GB + N x 0.54 GB) / BW <= 100 ms. -> A describes two devices, two walls each.
- K3 H100: ~64 GB left, ~119 users; step reads 16+64 = 80 GB in 24 ms, ~40 tok/s each; memory size breaks first; 150 users needs two H100s. -> A.
- K4 Spark: memory holds 208; every step reads weights plus every user's cache; 10 tok/s -> step <= 100 ms -> <= 27 GB per step: 16 GB weights + ~21 users; bandwidth breaks first; 150 users ~8 Sparks, not 1. -> A; B surprised that same model flips walls.
- PR3 Predict 10x: 1,500 x 0.54 GB ~ 800 GB; ~64 GB cache per H100 -> ~13 H100s (more with headroom). Cuts: fp8 cache (half memory, twice users); shorter context (summarise/truncate; 2K doubles users); share common prefixes (system prompt stored once, prefix caching lesson); model with fewer KV heads / smaller cache design. Doesn't help: faster GPU with same memory. -> B guesses "faster GPU"; A reveals.

## Saying it out loud: interview script

- I1 Arithmetic is half; narrating lets interviewer follow, correct, see judgement; practise till boring. -> A.
- I2 Eight steps: restate and scope (serving not training?); state load and invite correction; name resources before computing, predict compute dominates; chain out loud, round hard, write each line, units on every number; compare to one machine plus headroom (5 -> 8); sanity-check others one sentence each (model 200 MB, 30 MB/s, 13 ms); what breaks first then 10x/100x; how you'd check (load-test one GPU to replace 40%). -> A performs it partly in character; B notices step 8.
- I3 Step 8 is the one people skip; makes you an engineer not a calculator; estimates are hypotheses. -> A.

## Build It

- BT0 Setup in a workbench folder on the Spark; venv, torch, sentence-transformers, fastapi, uvicorn, httpx, numpy; check torch sees the GPU (ARM64 + Blackwell wheels picky; NVIDIA containers safe route). Stand-ins: MiniLM-L6 (22M, classic re-ranker) or BGE reranker base (278M, XLM-RoBERTa base), CrossEncoder class; check docs. Journal: date, question, assumptions, estimate, measured, ratio, what I missed; outlives the lesson. -> A, setup in a sentence, journal given weight.
- BT1 Paper estimate at 1,000, 100,000, 10M/day: assumptions (subtract embedding table = vocab x hidden), chain, compare vs one Spark at 125 TFLOP/s x 40% and one H100, Sparks needed, breaks first, one query alone, one sentence for 10x the largest; then check against calculator; > 2x disagreement -> find the step; journal with measured blank. -> A.
- BT2 Measure ceiling: big bf16 matmul (8192 square) timed with sync, 2 n cubed FLOPs / time = real peak. Model bench: one query's pairs in one predict call, sweep candidates 1, 10, 50, 100, 200 at ~256 tokens, ms/query, pairs/s, achieved TFLOP/s, MFU; count real tokens; GPU async, sync; try half precision. Calibration: M4 Pro MiniLM-L6 100 pairs of 243 tokens ~150 ms on GPU (MPS) ~4 TFLOP/s, ~310 ms CPU. -> A explains the part that matters (FLOPs per matmul, sync), no code.
- BT3 Tiny server: one endpoint, query + docs in, scores out; one model, one lock so requests take turns on the GPU (honest, makes queueing visible); one worker, big backlog; watch GPU util each second. -> A, one or two sentences.
- BT4 Open-loop load generator: fixed arrival rate regardless of earlier responses; closed loop slows down with server and hides queueing; Term coordinated omission; latency from scheduled send time; exponential gaps; steps 0.25x..1.25x of predicted max for 30 s each; run from Mac over Tailscale and on Spark, network should not matter (predicted); agent reviews open-loop and scheduled-time. -> B wrong model ("send a request, wait, send the next"); A explains coordinated omission.
- BT5 Close the loop: fill measured and ratio; which assumption furthest off, bottleneck as predicted?, does 30% vs 40% change the 10M answer; add three estimates from your week (training run time = tokens x 6N / measured FLOP/s, eval embeddings size, monthly LLM API cost). -> A.
- DW Done when: journal with three estimates + measured ratios; measured matmul ceiling and MFU at 100 candidates; load-test table with a knee and what saturated (GPU util, CPU); 90-second answer from memory with own numbers. -> A folds into the close of Build It.

## Measure

- MS1 Matmul ceiling under spec: Spark BF16 derived from sparse FP4 marketing figure; even good GPUs rarely sustain > 70-80% on big matmul; use measured as 100% for MFU. -> A.
- MS2 Predicted table values: ceiling 125 spec upper bound; 256 tokens/pair; achieved 50 TFLOP/s / 40%. -> A says the predicted 50 as 40% of 125.
- MS3 MFU depends on model size and batch: MiniLM width 384, small matmuls can't fill a big GPU; fixed overhead per call (Python, kernel launches, tokenization); MFU at 1 candidate terrible, 100+ much better; BERT-base / BGE closer to 40%; MFU rising with candidates = starved -> busy. -> A; B asks why small model is "worse".
- MS4 Knee: below, latency flat near one-query time; past ~70-80% of 1/(one-query time), p99 rises sharply; past 100% grows without limit, achieved QPS flattens. Little's law check below knee: achieved QPS x mean latency = average in flight, under 1 with one lock. -> A, with a worked example (derived: 100 ms query -> 10 QPS max).
- MS5 Ratio is the point: within 2x good; 5x+ = one assumption badly wrong, finding it worth more than measurement. Culprits: MFU far below 40% (small model), CPU/Python overhead, tokens per pair much larger (no truncation). Also the table rows: max QPS with p99 under 300 ms, GPU util, Sparks for 10M/day. -> A.

## Break It

- BK1 Size for average: average QPS 60 s, 3x for 30 s, back; watch p99 and recovery; if peak above one GPU, queue grows 30 s then takes a while to drain. Average-sized systems don't fail on average days. -> A, "what if".
- BK2 One long document: max length 1024, one 1,000-word doc in each 100; batches padded to longest so all 100 rows cost 1,024 tokens, attention's share grows with length; several times slower; fix truncate or sort by length and batch similar. -> B asks why one doc matters; A explains padding.
- BK3 Starve the GPU: MiniLM-L6, 5 candidates, 64 tokens; GPU util low, one CPU core pinned (tokenizing, JSON, Python); CPU bar crossing compute bar in the calculator; fix more CPU workers or batch several queries per forward pass, not a bigger GPU. -> A.
- BK4 Five errors: "1B vectors of 768 float32 = 768 GB; 100M/day ~ 100 QPS; each query reads 1 KB from 10 shards over 10 Gbps = 10 GB/s, fine; replication not needed." Errors: 4 bytes -> 3 TB; 100M/10^5 = 1,000 QPS; no peak factor -> 2,000-3,000; 10 Gbps = 1.25 GB/s (bits vs bytes, factor of 8, most common); replication 2-3 copies multiplies storage and cost. -> B reads the bad estimate as if it were their own attempt (natural, B's wrong model) and A finds the five; no quiz framing.

## Explain It Back (substance must appear)

- X1 Ninety-second answer, incl. "cache popular queries" and "load-test one GPU to replace 40%". -> Covered by P4 + I2; end of episode B restates with own words.
- X2 Compute-bound vs memory-bound: tokens sharing each weight read; decoding 2 FLOPs per weight per sequence; cross-encoder thousands of FLOPs per byte; scale ranker by FLOPs (buy compute or cut tokens); decoding by bytes per step, batching users to share weight reads, watching KV cache read per user. -> In S2b plus a line in K-section tying back.
- X3 Billion pages: 1.5 TB/3 TB/6 TB; one or two SSDs, dozen machines RAM before replicas; ANN; int8/PQ codes in RAM across shards, full on SSD for re-scoring, replicate; computing ~300 H100-hours. -> E-section.
- X4 Chat: 150 concurrent; 512 MiB each; 80 GB + 16; H100 119 -> 2 GPUs (3 with headroom); 24 ms, 40 tok/s; Spark flips, ~20 users, ~8 Sparks; fp8, shorter context, shared prefixes. -> K-section; "three with headroom" said there.
- X5 "Assume a billion users": turn users into a rate; 20% daily active = 200M, 5 requests each = 10^9/day ~ 10^4/s, 3x10^4 peak; then method; shows tractable (tens of thousands/s is known big) and lets interviewer correct assumptions. -> B voices "a billion requests a second?" wrong model near the interview-script section; A corrects.

## Go Deeper / Connections

- G1 Best sources: Bentley's Back of the Envelope column; Simon Eskildsen's Napkin Math for a refreshed table (others optional). -> One sentence near the end.
- CN1 Next: p99 and load testing (the knee); load balancers once 8 H100s is 8 servers; vector search answers example 2's search; memory math; batching as the lever for both small-model ranker and KV-bound chat. -> One or two sentences.

## Flow

Problem scene (P1-P5) -> Fermi story (O1-O3) -> "scale to what" -> bottleneck and five steps (S0-F1)
-> step 1 load with peak-factor wrong model -> step 2 resources, 2N, compute-vs-memory wrong model
-> step 3 powers of ten, conversions, QPS predict -> step 4 capacity stock, MFU, headroom wrong model
-> step 5 -> worked example 1 chain, other resources, latency wrong model, 10x/100x, CPU predict
-> calculator -> example 2 storage, compression, search, compute surprise, crawl concurrency
-> example 3 KV cache, two walls, 10x predict -> billion users -> interview script -> Build It
(journal, paper, ceiling, MFU, server, open-loop) -> Measure -> Break It (four) -> sources and
connections in one breath -> B restates core, A sharpens, stop.
