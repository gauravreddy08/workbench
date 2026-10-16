# Outline: bandwidth-bound

Source: src/lessons/bandwidth-bound.mdx (plus the two interactive figures, BandwidthStream and
BandwidthRoofline). Curriculum entry: "Why ~17 tokens per second?" Question: why is LLM decoding
limited by memory speed, and how fast should my Spark be before I run anything? Why: one division
predicts your server's speed; every optimization in this track is a way around it.

Diagnostic gaps this lesson aims at: why decoding is memory-bound, memory math for models, numbers
(bandwidth, bytes). B voices the natural wrong models: "the GPU is slow / attention is expensive",
"a GPU with twice the FLOPs makes it twice as fast", "bandwidth is how fast a read is".

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereq from latency lesson: latency (how long one read takes) vs bandwidth (how wide the pipe is once data flows); the Spark's 273 GB/s. -> A re-explains in two sentences when bandwidth is first named.
- T2 Prereq from waiting-vs-working: a GPU call returns as soon as work is queued, so you must synchronize before stopping a clock. -> A re-explains in Build It (t2 hint) in one breath.
- T3 Prereq: he has written a transformer forward pass, knows what's in a layer and the KV cache. -> A leans on it ("you've built Llama"), no list.

## The Problem

- P1 Scene: built Llama from scratch, knows the forward pass (embed, 32 layers of attention and MLP, project to vocab, sample), knows the KV cache. -> A opens on this.
- P2 Predict: Llama 3.1 8B bf16 on the Spark, one user, short prompt: tokens/sec and what limits it? -> A asks; B guesses wrong ("GPU math / attention") with a number.
- P3 Answer: about 17 at most, a bit less in practice. Every weight read once per token: 8 billion × 2 bytes = 16 GB through 273 GB/s = about 0.059 s per token = about 17/s. "GPU slow / attention expensive" is the wrong model. -> A reveals, worked in words.
- P4 Strange part: GPU does around a hundred trillion bf16 multiply-adds per second (to be measured); a token needs about 16 billion operations; math says thousands of tokens/sec; gets 17; tensor cores idle more than 99% of the time. -> A, B reacts.
- P5 Gap between how fast it can think vs how fast it can be fed is the lesson; every optimization = more useful work per byte dragged out of memory. -> A signposts.

## Origin

- O1 1995, William Wulf and Sally McKee, two-page note "Hitting the Memory Wall: Implications of the Obvious". -> A tells as story.
- O2 Processor speed improving about 60%/year, memory about 7%/year; keep multiplying and the processor spends almost all its time waiting; faster arithmetic doesn't help. -> A.
- O3 Chip designers fought it with caches (work when data is reused). LLM decoding is the case caches can't save: 16 GB of weights, each used once per token, far too big. -> A; B connects it.
- O4 Thirty years later: why your chatbot types at the speed it does; why inference companies buy GPUs with very expensive memory. -> A.

## The Idea: one token, one trip

- I1 Kitchen: chef chops a thousand onions/sec, onions arrive by one van; kitchen processes what the van delivers. Chef = math units, van = memory bus. -> A, short, one point.
- I2 Decode step: latest token vector (4,096 numbers); 32 layers each multiply by attention projections (Q, K, V, output) and MLP (gate, up, down); output projection gives score for each of 128,256 vocab entries; sample. -> A, walking a step.
- I3 Term matrix-vector multiply: matrix times one column; each weight used once (one multiply, one add) then never touched again for this token. -> A inline.
- I4 Every weight travels to the chip, used once, thrown away; next token, whole model travels again because GPU has nowhere near 16 GB on chip. -> A; B asks why not keep it.
- I5 Cost of a token ≈ time to read all weights once: 8.03 billion × 2 bytes = 16.06 GB ÷ 273 GB/s ≈ 0.0588 s → about 17 tok/s. -> A, worked example in words.
- I6 Term memory bandwidth: bytes per second between memory and chip; not how long one read takes (latency), how wide the pipe once flowing; spec about 273 GB/s; the trivia number from latency lesson is now the most important number about the machine. -> A, with T1. B voices the latency/bandwidth confusion.
- F1 Figure 001: memory box (128 GB LPDDR5x shared CPU+GPU, 16 GB weights, rest free) → narrow 273 GB/s pipe → GPU tensor cores ~100+ TFLOP/s bf16, busy <1%; 16 GB ÷ 273 = 59 ms → ~17; a ceiling, not a promise. -> A describes like over the phone.
- I7 Refinement 1: embedding table is a lookup (one row of 525 million entries), output projection is a full matrix and is read; true traffic about 15 GB, ceiling about 18. -> A.
- I8 Refinement 2: never get full spec bandwidth; software overhead; 17 is a ceiling to compare against, not a promise; will measure real bandwidth and redo the division. -> A.

## The Idea: watch one step (Figure 002)

- F2 Interactive: each cell one layer, about 436 MB bf16; memory bus timeline busy the whole time, tensor cores a sliver at the end of each delivery; switch batch to 16 and 128. (From the figure: each layer about 1.6 ms to arrive, math a few microseconds; step about 55 ms.) -> A describes what you'd see stepping through.
- I9 Batch change: memory bar unchanged, same 15 GB crossed; compute slivers grew; at 128 each layer's weights used 128 times per trip, 128 tokens for the price of one delivery; most important idea in inference economics. -> A; B says it back.

## The Idea: arithmetic intensity

- I10 Question: for every byte brought in, how much math? Term arithmetic intensity = FLOPs done ÷ bytes moved; high = lots of work per byte, low = shuffling data. -> A.
- I11 Term FLOPs: floating-point operation, one multiply or add of decimal numbers; multiply-add counts as 2; FLOP/s = per second. -> A inline.
- I12 Decode batch 1 bf16: 2 FLOPs per weight / 2 bytes per weight = 1 FLOP per byte. -> A, worked.
- I13 Machine: 125 trillion FLOPs/s ÷ 273 billion bytes/s ≈ 458 FLOPs per byte needed to keep math busy; decode does 1; short by hundreds. -> A; B asks "is one a lot?".
- I14 Term ridge point: peak FLOP/s ÷ bandwidth; property of hardware not code. Below = memory-bound (finishes when data arrives; faster math no help, fewer/faster bytes help; also called bandwidth-bound); above = compute-bound (data arrives faster than math uses it; faster math helps, fewer bytes doesn't). -> A.
- I15 The 125 figure: NVIDIA markets "up to 1 petaFLOP" = FP4 with 2:4 sparsity; dense half of sparse, each precision doubling halves: 1000 → 500 → 250 → 125; upper bound, not spec; measure; ridge stays in hundreds, decode stays far left. -> A; B skeptical about the marketing number.

## The Idea: the roofline (Figure 003)

- I16 2009, Samuel Williams, Andrew Waterman, David Patterson drew it; term roofline model. -> A.
- I17 Axes: intensity on x, achieved FLOP/s on y, both log; flat compute roof; sloped bandwidth line (273 GB/s × intensity); meet at ridge; which line is above you tells you what to fix. -> A, described over the phone.
- F3 Calculator: model, precision, hardware, batch, context; dot on roofline; dashed trail of batch sizes; bytes-per-step bar weights vs KV. -> A describes what you'd see dragging.
- I18 Batch 1 → 64 at 1K context: per stream ~17 → ~11, total 17 → about 700 (batching lesson). -> A.
- I19 BF16 → FP8 → 4-bit at batch 1: 17 → 34 → 68 (quantization). -> A.
- I20 H100 SXM: about 209 tok/s ceiling single stream; HBM3 about 3.35 TB/s; part of why Fireworks feels faster per stream before any tricks. -> A; B ties to Fireworks.
- I21 Context 128K at batch 1: KV bar grows to the weights' size, speed halves. -> A, forward pointer.
- I22 Qwen3 30B-A3B: 30B model decodes faster than the 8B. -> A, forward pointer; B surprised.

## The Idea: prefill vs decode

- I23 Term prefill: all prompt tokens known, run through together in one pass to fill KV cache and produce first token. -> A.
- I24 Term matrix-matrix multiply: weights × many token vectors; each loaded weight reused for every token; 1,000-token prompt reuses each weight 1,000 times; intensity about 1,000; over the ridge; compute-bound. -> A.
- I25 Term decode: generate one at a time, token 5 depends on token 4; one full read per token; memory-bound. -> A; B asks why not parallel.
- F4 Figure 004: left, weights × N columns, one read → N tokens of math, intensity ≈ N, compute-bound, sets TTFT; right, weights × one column, one read → one token, ≈ 1, memory-bound, sets tokens/sec. -> A over the phone.
- I26 Term TTFT: time from sending the request to first output token, dominated by prefill (plus queueing, network); depends on compute. Ideal prefill 1,000 tokens of 8B: 2 × 8.03 billion × 1,000 ≈ 16 trillion FLOPs, at 125 TFLOP/s about 0.13 s; expect a few times that. -> A.
- I27 Tokens/sec after that is decode, depends on bandwidth: same 1,000 tokens one at a time = 1,000/17 ≈ 59 s. Same model, same tokens: 0.13 s vs about a minute. Remember that picture. Next lesson benchmarks both against Fireworks. -> A; B reacts.

## The Idea: KV cache is also bytes

- I28 Term KV cache: stored keys and values for every past token in every layer, so attention doesn't recompute; read in full every decode step. Costs memory and more bytes per token; weights same per token, cache grows each token. -> A.
- I29 Formula: 2 (K and V) × layers × KV heads × head dim × bytes per value; Llama 3.1 8B: 2 × 32 × 8 × 128 × 2 = 131,072 bytes = 128 KiB per token. -> A in words, worked.
- I30 Term GQA: 32 query heads, 8 KV heads, each KV head shared by 4 query heads; cache 4x smaller. -> A inline; B asks what "8 KV heads" means.
- F5 Figure 005: weights 16.1 GB; KV at 1K 0.13 GB → 16.9 tok/s; 8K 1.1 GB → 15.9; 32K 4.3 GB → 13.4; 128K 17.2 GB → 8.2; ceiling = 273 ÷ (weights + KV). -> A says progression, not row by row as table; picks landmarks.
- I31 Single chat normal lengths cache is noise: 8K costs about 6% of speed. Matters for very long context and batching. -> A.
- I32 32 users × 4K context = 32 × 4,096 × 128 KiB = 16 GiB, same as one user at 128K. Weights shared across batch; KV caches not; each read separately. Why throughput climbs steeply then flattens long before ridge at 1K and beyond. Later lessons: memory math, KV cache, prefix caching. -> A; B states "weights shared, cache isn't".
- I33 Attention math per token grows with context but intensity stays low, a few FLOPs per byte with GQA; each cached key/value used once per step; attention in decode memory-bound too. -> A, aside, after B asks about attention.

## The Idea: every way around the wall

- I34 One line: tokens/sec ≈ usable bandwidth ÷ bytes read per token; everything attacks one side or changes tokens per read. -> A.
- F6 Figure 006: equation at top with "times tokens per read"; five levers: fewer bytes per weight (quantization, FP8 2x, 4-bit ~4x), fewer weights per token (MoE, 30B stored 3B read), many users per read (batching), many tokens per read (speculation), wider pipe (HBM, 273 → 3,350 GB/s); plus KV side: GQA, KV quantization, paged and prefix-shared cache; prefill side: FlashAttention, prefix caching skips it. -> A, as a spoken map, then each lever.
- I35 Quantization: 8 bits → 8 GB → 34; 4 bits → ~4 GB → 68; real 4-bit formats store a scale factor per small group, average 4.5-5 bits; Q4_K_M of 8B about 4.9 GB → about 55; cost is accuracy (quantization lesson); math still happens in 16-bit or so after unpacking; win is purely bytes crossing the pipe. -> A; B asks "is the math 4-bit?".
- I36 Term MoE: MLP layers split into many smaller expert MLPs, small router sends each token to a few; most weights idle per token. Qwen3 30B-A3B: about 30.5B total, about 3.3B active per token (8 of 128 experts per layer plus shared attention); decodes like a 3B: 6.7 GB per token bf16, ceiling about 41; all 61 GB must sit in memory (next token might want different experts). Spark: 128 GB slow but lots; a 24 GB gaming card can't hold it; big-but-sparse is the Spark's sweet spot. Catch: heavy batching touches most experts, advantage shrinks. -> A; B's wrong model: "so it only needs 3B in memory".
- I37 Batching: B users' tokens in one step, each weight read serves B tokens; below ridge step barely slower; throughput almost B-fold for free. Per-token cost = GPU-hours ÷ tokens; 50x tokens → about one fiftieth cost. Limits: ridge point and KV cache. Batching and continuous batching. -> A.
- I38 Speculative decoding: know the next 4 tokens and check all in one pass like a tiny prefill, price of one read; small draft model guesses, big model checks in one pass; good guesses → several tokens per trip; works because math idle; checking 5 instead of 1 costs almost nothing extra. -> A.
- I39 Term HBM: DRAM stacked vertically next to GPU on the same package, thousands of wires; much faster, much more expensive per GB. H100 SXM about 3.35 TB/s, about 12x Spark; about 209 tok/s for 8B bf16 single stream. Spark trades bandwidth for capacity. -> A.
- I40 Serving engines like vLLM combine all; FlashAttention attacks memory traffic inside attention, matters most for long prompts. -> A, one sentence.
- P6 Predict sheet: (a) Llama 3.2 1B bf16: 1.24B × 2 ≈ 2.5 GB → about 110 (shares embedding and output matrix, whole thing read); (b) 8B Q8_0 at 8.5 bits: 8.03B × 8.5 ÷ 8 ≈ 8.5 GB → about 32; (c) Q4_K_M 4.9 GB → about 55. Small model lands furthest below ceiling: fixed per-step costs (kernel launches, sampling, Python) bigger share of each 9 ms step. -> A asks, B works some aloud, A corrects/finishes.

## Build It

- B1 Framing: measure the two numbers defining the roofline, predict real model speeds, check with a real engine; day-one measurements strong inference engineers do. -> A.
- B2 t1 (ok): working CUDA PyTorch; Spark is ARM64 on DGX OS (Ubuntu), x86 and some pip wheels don't apply; use NVIDIA containers; check DGX Spark playbooks and user guide; don't trust a remembered command; confirm GPU visible, memory and SM count. -> A, one or two sentences.
- B3 t2 (hands) bw.py: two big GPU buffers, copy one into the other many times, bytes ÷ time; sweep 8 MB → 8 GB. Hints: count both directions (read + write, 2 × n bytes); synchronize (re-explain T2; CUDA events alternative); go big (small fits in on-chip cache, fantasy numbers; trust only GB sizes); optional read-only sum on big float16 tensor, count bytes once. -> A; B asks "bytes moved per copy?" as a real stop and gets it wrong first (says n).
- B4 t3 (hands) flops.py: big bf16 matmul, n×n by n×n = 2n³ FLOPs, sweep 1024 → 16384, warm up, synchronize, iterations; ridge from your two numbers; small matmuls look slow (roofline again); want the plateau. -> A.
- B5 t4 (hands) prediction function before running any model; measured bandwidth and 273; 1B bf16, 8B BF16/Q8_0/Q4_K_M; file size on disk ≈ bytes per token for GGUF. -> A.
- B6 t5 (explain) real decode at batch 1: llama.cpp with CUDA, llama-bench, prompt 512 and gen 128, reports prefill (pp512) and decode (tg128) separately; flags evolve; or vLLM benchmark scripts from docs; download GGUFs from Hugging Face; record decode, note prefill for next lesson. -> A.
- B7 t6 (explain) throughput vs batch: llama-batched-bench or vLLM throughput benchmark; 8B Q4_K_M at 1, 2, 4, ..., 64, short prompt; total and per-stream. -> A.
- B8 Done when: bandwidth sweep + which sizes hit cache + real sustained; TFLOP/s plateau + measured ridge; prediction table written before any model run; three model/precision measurements + one batch curve. -> A, briefly folded in.

## Measure

- M1 Table: ceilings at 273 spec: 1B ~110, 8B BF16 ~17, Q8_0 ~32, Q4_K_M ~55; machine: bandwidth 273 spec, dense BF16 ≤125 estimate, ridge ≤ about 460. -> A, not read as table; recalled as "the numbers you predicted".
- M2 Copy benchmark comes in below 273: normal; spec is theoretical peak of memory chips' pins; real traffic loses to refresh cycles, scheduling, reads and writes taking turns; write it down without judging. -> A; B worried it's broken.
- M3 Real engines land around 60-85% of spec ceiling, closer to measured-bandwidth ceiling; not gospel. -> A.
- M4 Gap reasons: not all time is weight streaming (KV cache, attention, norms, sampler, dozens of small kernel launches, each a few microseconds, a few hundred per token); kernels don't hit peak bandwidth, small layers (1B) less efficient; host side Python between tokens (sampling, detokenizing, streaming) GPU idle, why 1B lands furthest; quantized formats spend work unpacking, still bandwidth-bound but less perfectly. -> A, as a list of reasons said naturally.
- M5 Batch curve: total climbs almost linearly (batch 2 ≈ 2x), bends, flattens; per-stream sags slowly; where it bends: compare to measured ridge and KV bytes; short prompts + 4-bit: hundreds of tokens/s total while each stream slower than batch 1. -> A.

## Break It

- K1 Tiny buffers: 8 MB "bandwidth" far beyond spec, whole buffer in on-chip cache; latency ladder showing up as bandwidth; every level has its own pipe width; weights too big for cache, why decode sees slow pipe. -> "what if" exchange.
- K2 Forget to synchronize: impossible numbers, hundreds of times spec, timing how fast Python queues work; ask this first of any too-good GPU benchmark online. -> exchange.
- K3 Count bytes once: bandwidth halves, every ceiling halves, engine appears to beat physics at 150% of ceiling; when a measurement exceeds a ceiling, the ceiling is wrong; find the factor of two. -> exchange.
- K4 Make the cache heavy: long context (llama-bench can do generation at a context depth in recent versions); predict with KV formula: 32K adds about 4.3 GB on top of 16 GB bf16, or on top of 4.9 GB Q4_K_M where it hurts proportionally more; some engines quantize KV, check. -> exchange; B predicts.

## Explain It Back (substance must appear)

- E1 Why bandwidth not compute: one at a time; each weight matrix × single vector; each weight read and used for one multiply-add; ~1 FLOP/byte; GPU can do hundreds of FLOPs per byte arriving; speed = streaming whole model once per token. -> covered by I2-I13 and final restatement.
- E2 2x FLOPs GPU not 2x faster chatbot: math idle over 99%; doubling doubles idle capacity; doubling bandwidth or halving bytes would help; 2x FLOPs helps prefill (TTFT on long prompt), raises ridge so server can batch more before compute-bound; single-stream tok/s stays put. -> B voices "buy a GPU with more FLOPs", A corrects, after the ridge point.
- E3 70B 4-bit on Spark: 70B × half byte ≈ 35 GB → about 8 tok/s ceiling; real 4.5-5 bits → 40-43 GB → about 6-7; measure 4-6; usable for reading along, slow for interactive; fits in 128 GB, 24 GB card can't load. -> A, after the predict sheet, as a "do it for the big one" moment; B does the division.
- E4 Batching scale: weight read cost same for 1 or 64 users; throughput nearly B-fold, hardware cost per hour same, cost per token falls as 1 over B; stops at ridge point (few hundred; math bottleneck, steps slower); usually sooner, KV caches not shared, bytes per step grow with B, curve flattens; memory capacity third wall; why serving companies care about batching, KV size, capacity. -> covered in batching lever + KV section, with the capacity wall stated explicitly.
- E5 Prefill vs decode: covered by I23-I27; plus "why provider's TTFT and tokens/sec improved by different hardware and tricks". -> A says that line.
- E6 MoE faster than dense 8B: bytes read not stored; 3.3B active, 6.7 GB vs 16; 61 GB to hold; batching shrinks advantage. -> I36.

## Go Deeper / Connections

- G1 Horace He "Making Deep Learning Go Brrrr From First Principles" (read first, factory analogy); kipply "Transformer Inference Arithmetic". -> one closing sentence by A, before the ending.
- C1 Next lesson: baseline vs Fireworks, naive streaming server, ceiling here is the line it's measured against. Rest of track = escape routes. -> one sentence.

## Flow plan

1. Problem: A opens on "you've built Llama" + predict; B guesses GPU/attention; A reveals 17; B pushes on the hundred-trillion math; strange gap.
2. Origin: memory wall story, caches can't save decode.
3. One token, one trip: van comparison, decode step walk, why weights don't stay on chip, the division, bandwidth vs latency (B's confusion), the two refinements, figure 001 described.
4. Watch one step: stepping figure, batch 16/128.
5. Arithmetic intensity: work per byte, 1 FLOP/byte, 458, ridge, memory- vs compute-bound, the petaflop marketing chain. Then B's "just buy more FLOPs" and the E2 answer.
6. Roofline: picture, calculator tour with forward pointers.
7. Prefill vs decode: why prompt is parallel and output isn't, TTFT vs tok/s, 0.13 s vs a minute.
8. KV cache bytes: formula, GQA, the long-context progression, batching collision, attention memory-bound aside.
9. Escape routes: the one-line equation, five levers, then predict sheet and the 70B estimate.
10. Build It: container, bandwidth (B gets bytes-per-copy wrong), synchronize, go big, flops, prediction sheet, engines, batch curve.
11. Measure: below spec is normal, 60-85%, where the gap goes, batch curve shape.
12. Break It: four what-ifs.
13. Close: next lesson pointer, two reading picks, B restates, A sharpens.
