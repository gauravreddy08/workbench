# Outline: flash-attention

Source: src/lessons/flash-attention.mdx. Curriculum entry: "FlashAttention and kernels." Question: why
is attention slow on long contexts, and how does FlashAttention fix it without changing the math? Why:
first step into GPU kernels; listed in research engineer roles. Build: naive attention, then a tiled
version in Triton; compare speed and memory.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

Diagnostic gaps this lesson touches: numbers/bytes/bandwidth (biggest gap), why something is
memory-bound, fp16 range. B voices: "big matmuls are compute-bound", "FlashAttention must be an
approximation", "so it's linear now", "128 GB, surely it fits", "FLOPs are what you count".

## Today / prerequisites

- T1 Prereqs: arithmetic intensity, roofline, ridge point (bandwidth lesson); caches, tiling, reuse (caches lesson); he has written attention in GPT-2. -> Re-explained inline by A when each idea returns (ridge point, tiling). "Today" bullets skipped as a list.

## The Problem

- P1 Scene: Llama on a 32,000-token document (long PDF, codebase, a day of agent traces); the three-line attention everyone writes: scores = Q times K transposed over root d, softmax, times V. -> A opens on this scene; code said as "three lines: scores, softmax, multiply by values".
- P2 At 2K fine; 8K noticeably slow, profiler shows GPU busy but math units mostly idle; at 32K the Spark (128 GB) dies with out-of-memory on the first layer. -> A, as a progression.
- P3 Predict s-bytes: Llama 3.1 8B, 32 query heads, one layer, batch 1, N = 32,768, fp16 2 bytes. Score matrix 32 x 32,768 squared ~ 34.4 billion numbers ~ 68.7 GB; with P alive too ~ 137 GB; Spark 128 GB total, shared with CPU; per head 2.1 GB but every head needs its own; at 8K the pair is ~8.6 GB, fits but goes through a 273 GB/s pipe; memory and traffic grow with N squared. -> A asks, B guesses low ("a few gigs?"), A works it out in words.
- P4 Q, K, V at 32K are tiny: 268 MB each; output same size. S is an intermediate, used once, thrown away. Everything bad comes from writing it down. -> A, the pivot line.
- O1 Origin: by 2020 attention known quadratic; approximations Reformer (hashing), Linformer (low-rank), Performer (random features); cut FLOPs sometimes N squared to N; mostly not faster wall-clock; changed the math, people nervous. -> A tells; B voices "so flash is one of those approximations?" later.
- O2 2022 Stanford: Tri Dao, Dan Fu, Stefano Ermon, Atri Rudra, Christopher Re; "FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness". Counting the wrong thing; limited by moving N x N in and out of GPU memory; keep it on chip, do more FLOPs and still finish sooner, exact answer. -> A.
- O3 GPT-2 about 3x faster training; 16K sequences practical for first time. -> A.
- O4 Online softmax trick from 2018 NVIDIA note by Maxim Milakov and Natalia Gimelshein. -> A.
- O5 Within two years inside essentially every training and serving stack, including PyTorch. -> A.

## The Idea: two kinds of memory

- I1 CPU ladder recap (registers, L1, L2, L3, RAM); GPU same ladder, fast rungs tiny, and you manage the most important one by hand. -> A, re-explains caches lesson briefly.
- I2 SMs: streaming multiprocessors, GPU "cores", each block of math units with own small fast memory; A100 has 108; GB10 has dozens (check). -> A defines.
- I3 Registers: fastest, private per thread, a few hundred KB per SM total, where math units operate. -> A.
- I4 Shared memory (SRAM): scratchpad per SM filled by hand, ~100 to 228 KB per SM depending on chip; shared by one block's threads, invisible to other SMs. -> A.
- I5 SRAM term: static RAM, fast memory built into chip; registers, shared memory, caches; tiny because each bit costs several transistors. -> A.
- I6 L1 carved from same SRAM as shared memory on NVIDIA. -> A, one clause.
- I7 L2: shared by all SMs, tens of MB on data-center GPUs, hardware-managed; re-read hits skip main memory. -> A.
- I8 HBM: main memory, stacked DRAM next to chip, tens of GB, a few TB/s; on Spark it's LPDDR5x shared with CPU, same role; every PyTorch tensor lives here. -> A.
- I9 Figure 001: pyramid; each rung up ~10x faster per byte and ~1000x smaller; tensors live at bottom, math happens at top; A100: 256 KB regs/SM ~1 cycle, 192 KB shared/SM ~19 TB/s total, 40 MB L2, 40-80 GB HBM 1.5-2 TB/s; Spark: 128 GB LPDDR5x 273 GB/s, SRAM ~10+ TB/s, CHECK slots; hundreds of cycles to HBM. -> A describes the pyramid as over the phone, top to bottom.
- I10 Two numbers: A100 SRAM ~19 TB/s vs HBM ~1.5 TB/s, ~12x gap; SRAM figure is arithmetic: 108 SMs x 128 bytes per clock x 1.41 GHz ~ 19.5 TB/s. Spark gap wider: 273 GB/s vs order 10 TB/s+; every byte avoided worth more on Spark. -> A; B asks the number on his machine.
- I11 Kernel (GPU): one function launched from CPU, thousands of copies, not OS kernel. -> A defines.
- I12 Thread blocks: groups of threads (128 or 256) on one SM sharing shared memory; in Triton one block = one "program". -> A.
- I13 Each block loads from HBM into SRAM/registers, computes, writes back; blocks can't see each other's shared memory; when kernel ends SRAM is gone. The only way to pass data between kernels is through HBM. -> A, said slowly as the sentence to hold.

## The Idea: what naive attention does

- N1 Eager PyTorch: each line at least one kernel, each reads inputs from HBM and writes outputs to HBM. -> A.
- N2 Figure 002: HBM on top (Q, K small; S, P big N x N; V, O small); slow boundary line (273 GB/s on Spark); three kernels below; thick arrows: write S, read S, write P, read P; four passes over N squared, only four over N x d; at 8K, d=128 each N x N matrix is 64x bigger than Q. -> A describes over the phone.
- N3 Byte count per head: read Q, K 2Nd; write S N squared; read S; write P; read P and V; write O. Total 4 N squared + 4Nd. At N=8192, d=128: 4Nd part ~4 million elements, 4N squared ~268 million; useful in/out 1.5% of traffic. -> A with B checking "so ninety-eight percent is S and P?".
- N4 Eager extras: separate scale kernel, causal mask (masked_fill) kernel, dropout; each elementwise op on S two more trips. -> A.
- N5 Causal mask term: token i attends only to tokens at or before i; future scores set to minus infinity before softmax. -> A defines inline.
- N6 Roofline recap: FLOPs per head ~4 N squared d (2 for QK, 2 for PV); bytes 4 N squared x 2; intensity ~ d/2: 64 FLOPs/byte at d=128, 32 at d=64. -> A, with brief re-explanation of arithmetic intensity.
- N7 Arithmetic intensity term: FLOPs per byte moved to main memory; compare with ridge point (peak FLOP/s / bandwidth). -> A defines.
- N8 Spark ridge ~460 on spec-sheet numbers ("a few hundred"); A100 150-200; naive at 64 well left: memory-bound. -> A.
- N9 Memory-bound term: work finishes when data finishes arriving; faster math wouldn't help. -> A.
- N10 Intensity doesn't depend on N: more work and proportionally more bytes; never climb out. -> A; B expected long sequences to help.
- N11 Predict qk-matmul: kernel 1 alone, N=8192, d=128. FLOPs 2N squared d ~17.2 billion; bytes read Q, K ~4 MB, write S ~134 MB; intensity ~125 (= d); math 0.14 ms at 125 TFLOP/s vs writing S 0.49 ms; memory-bound because of writing the output; output bigger than inputs; "big matmuls compute-bound" assumes three matrices similar size. -> B voices "it's a matmul, so compute-bound", A walks the numbers.

## The Idea: the obvious fix and why hard

- F1 Kernel fusion: merge ops into one kernel so intermediates stay in registers/shared memory. Load a few Q rows, scores, softmax, times V, write output; S and P only inside SM a tile at a time. -> A.
- F2 Elementwise easy; torch.compile fuses scale, mask, exponent. Softmax not elementwise: needs sum of exponentials over entire row. -> A.
- F3 Row of S at 32K in fp32 is 128 KB, about an SM's whole shared memory; block wants 64-128 rows at once; can't hold full row; seems to need storing to HBM and coming back. Way out: compute softmax seeing the row one piece at a time: online softmax. -> A; B proposes "just keep the row on chip".

## The Idea: safe softmax

- S1 Never compute e to the x directly. fp16 max 65,504; e to the x passes it at x ~11.09; scores above 11 normal. fp32 overflows at ~88.7. On Mac exp of fp16 12 is inf; softmax of 1000, 1001, 1002 gives nan, nan, nan (inf over inf). -> A; ties to fp16 gap.
- S2 Subtract row max: softmax unchanged by shifting all inputs by same constant; the shift factors out top and bottom. Every exponent at most 0, values between 0 and 1. -> A, explained in words with an example.
- S3 Safe softmax term; every real implementation does it. -> A names it.
- S4 Three passes: max, sum of e to the (x minus max), divide. Three reads; in HBM three trips. Milakov and Gimelshein 2018: can passes 1 and 2 be one? -> A.

## The Idea: online softmax

- L1 Scene: numbers arrive one at a time like cards; sticky note holds biggest so far m and running sum l of e to the (x minus m), measured against current m. -> A.
- L2 Case not new max: add e to the (x minus m). -> A.
- L3 Case new max: old terms measured against old max; multiply l by one number, e to the (old max minus new max), fixes all at once; then add e to the zero = 1. -> A; B voices "you'd have to redo all the old ones".
- L4 One formula covers both: when max unchanged factor is 1; when changes factor below 1 shrinks; at start m = minus infinity, l = 0, e to the minus infinity is 0. -> A.
- L5 Walkthrough on 2, 1, 5, 3: l = 1, then 1.3679, then 5 arrives rescale 0.0498 -> 1.0681, then 1.2034; two-pass gives 1.2034. Same. -> A walks a few steps in words, B checks the end.
- L6 Exact not approximate: induction claim; after k numbers m is their max and l is exactly the sum against m; base case and step in words. Only floating-point rounding. Still need a second pass for outputs, but max and sum are one pass. -> A; B voices "sounds like an approximation".
- L7 Predict merge: two workers with (m1, l1), (m2, l2): m = max, each l rescaled to common max and added; one-at-a-time is special case (m2 = x, l2 = 1); associative, split row any way, any grouping. Powers FlashAttention (tile by tile), Flash-Decoding (split KV cache across SMs), ring attention (split across GPUs). -> A asks, B answers mostly right, A completes.

## The Idea: from sum to output row

- R1 Attention wants softmax times V: weighted average of value vectors; output rides along on the same sticky note. -> A.
- R2 Third running quantity o, length-d vector, un-normalized sum against current max; same rescale alpha, same new weight times v; at end o / l. Same induction proof. -> A.
- R3 Tile at a time: block of Bc keys/values; block scores for a query row; block max; p = exps; alpha; l rescaled plus sum p; o rescaled plus p times V block; that is the merge rule with the block as second worker; shaped like a matmul, what GPUs are built for. -> A, in words.

## The Idea: forward pass

- W1 Each program gets Br query rows: load Q block once; m, l, o in registers; loop over K/V blocks of Bc rows: load, compute Br x Bc score tile, update; after last block divide o by l, write output block; also write logsumexp L = m + log l per row. -> A.
- W2 Logsumexp term: log of softmax denominator, one number per row, lets backward rebuild any probability. -> A.
- W3 S and P tiles exist only in SRAM/registers; nothing N x N written. -> A.
- W4 Figure 003 (interactive): 8 keys, blocks of 2, d=2, one program's 2 query rows; step through; HBM row of cells on top lighting up as tiles load; SRAM box shows 2x2 score tile; state table per row m, l, o, alpha highlighted when below 1; counter of N x N written stays zero; final step compares with exact answer, difference is rounding. -> A describes what you'd see clicking Next.
- W5 Same answer, not approximation. FA-1 put K/V loop outside and Q inside, re-read and re-wrote partial outputs in HBM; FA-2 swapped. Paper also fuses masking and dropout. -> A.

## The Idea: counting bytes

- C1 IO-aware term: judged by bytes moved between HBM and SRAM, not only FLOPs; IO = reads and writes. -> A.
- C2 Per head: Q read once Nd; K and V once per query block (N/Br) x 2Nd; O written once Nd; total ~2Nd + 2 N squared d / Br. Br limited by SRAM: ~ M/d. Theorem: Theta(N squared d squared / M) vs Theta(N squared + Nd); no exact algorithm does asymptotically better across all SRAM sizes. -> A, words not symbols.
- C3 Real numbers modest: d=128, Br=128 worst case 2 N squared vs naive 4 N squared, 2x plus eager extras; both quadratic; saving is the constant. -> B voices "so it's linear now?", A corrects.
- C4 Why many times faster in practice: (1) K and V re-reads hit L2: K and V for one head at 8K, d=128 are 4 MB; programs on same head run together; best case traffic 4Nd linear. (2) Eager extras vanish. (3) Intensity ~N FLOPs per byte, at 8K thousands, far right of ridge; memory-bound to compute-bound, so next generations are about math units. -> A, three reasons.
- C5 Figure 004 (interactive): toggles for d, naive 4 vs 8 passes, K/V from HBM vs L2, query block 64/128; N slider; bars and log-log plot; worst case both quadratic, ratio constant; best case flash linear, gap grows; real kernels between; at 32K naive "impossible". -> A, what you'd see as you drag.
- C6 Memory: naive S and P 2 x H x N squared x 2 bytes; flash two numbers per query row; at 32K 137 GB vs 8 MB; that alone made long-context training possible. -> A.

## The Idea: backward pass

- B1 Standard backward uses saved P; flash never stored it; recompute: forward saved O and L; reload Q, K, V tiles, recompute S tile, P = e to the (S minus L); no running max needed. -> A; B asks "where's P?".
- B2 Gradient tile steps: dV accumulates P transposed times dO; dP = dO times V transposed; D per row; dS = P times (dP minus D) elementwise; dQ and dK accumulate dS times K and dS transposed times Q, scaled. -> A in words, not symbols.
- B3 D trick: softmax backward needs row sum of P times dP, a full pass; simplifies to dot product of dO and O for that row; you have O; once per row before the loop. -> A, worked in words.
- B4 More FLOPs fewer bytes: roughly one extra QK matmul; paper's backward did more FLOPs and still faster. Activation checkpointing (gradient checkpointing) same idea at layer level. -> A; B links to checkpointing.
- B5 Predict recompute: backward five matmuls (recompute S, dV, dP, dQ, dK) ~2 N squared d each ~10 N squared d ~2.5x forward; standard backward four ~2x; ~25% more FLOPs; good deal when backward memory-bound; also removes N squared memory. -> A asks, B guesses, A counts.

## The Idea: FA-2, FA-3, after

- V1 Once compute-bound, game changes to keeping math units busy. -> A, signpost.
- V2 FA-2 (Tri Dao 2023): ~2x over FA-1, 50-73% of A100 peak. -> A.
- V3 Tensor cores term: units that only do small matrix multiply-adds, much faster; most advertised FLOPs. Matmul ~16x faster than exps/divides on regular units; FA-2 keeps o unnormalized until end, one division per row; trims scalar bookkeeping. -> A.
- V4 Parallelize over sequence: FA-1 one program per (batch, head); batch 1 long sequence can be fewer programs than SMs; FA-2 splits over query blocks too, the loop order shown. -> A, with Spark example.
- V5 Warps term: groups of 32 threads executing same instruction; block = several warps. FA-2 divides queries among warps not keys, so warps don't exchange partial results through shared memory. -> A.
- V6 Skips fully masked blocks for causal, roughly halving work. -> A.
- V7 FA-3 (Shah, Bikshandi, Zhang, Thakkar, Ramani, Dao, 2024): H100 Hopper; ~740 TFLOP/s fp16 ~75% peak; ~1.2 PFLOP/s FP8. -> A.
- V8 Asynchrony: TMA copy engine, async tensor-core instructions; warp specialization (producer warps load, consumer warps compute) so next tile arrives during current multiply. -> A defines term.
- V9 Ping-pong: exps slow, tensor cores idle; two groups of warps staggered so one does softmax while other does matmul. -> A.
- V10 FP8 with per-block scaling and trick to spread outliers before quantizing. -> A.
- V11 FA-3 Hopper-only; B200 got own rewrite, often called FA-4, in Tri Dao's repo, check status; Spark GB10 different Blackwell variant, as far as author knows lacks B200's new tensor-core instructions, neither FA-3 nor FA-4 targets it; check compute capability 12.1 support; algorithm works everywhere, and PyTorch scaled_dot_product_attention picks a backend. -> A, with the hedges.
- V12 Flash-Decoding (Dao and collaborators 2023): decoding has one query row, long KV cache; one query block gives nothing to parallelize; split keys across programs, each its own m, l, o, merge with Predict rule. Same trick, opposite axis. -> A; B connects to KV cache.

## The Idea: Triton

- K1 CUDA C++ by hand (threads, warps, shared memory) vs Triton: Python-embedded language and compiler from OpenAI (Philippe Tillet); write code for one program on one tile; compiler handles threads, shared memory, feeding tensor cores. -> A.
- K2 Vector add example: a program is one instance; launch a grid; program id tells which; one program on one SM as one block; many at once. -> A, described not read.
- K3 Pointers and offsets: tensors arrive as pointers to first element; pointer plus offsets is a vector of addresses; load fetches all; 2D tiles by broadcasting row and column offsets. -> A.
- K4 Mask: True/False per lane; false lanes not read (get the other value) or written. N=300, BLOCK=128, third program owns 256-383, only 44 exist; without mask reads past end (garbage or crash); other=0.0 sets skipped value. -> A, worked example.
- K5 constexpr: compile-time values like block sizes; separate compiled version per value; block sizes powers of 2. -> A.
- K6 Tile ops: dot on tensor cores (each dimension at least 16), max, sum, exp, where, maximum; whole tiles like NumPy. -> A.
- K7 Figure 005: launch grid is query blocks by batch-times-heads; each program owns Br rows of one head; load Q once, loop K/V, write O once; programs never talk; last query block partial, masked. -> A describes.
- K8 Triton already in his stack: torch.compile default backend TorchInductor writes Triton kernels; TORCH_LOGS output_code to read them. -> A.

## The Idea: benchmarking

- M1 Synchronize: launch returns once queued (waiting-vs-working); without synchronize or CUDA events you measure Python queuing; numbers beat hardware peak. -> A, re-explains async launch.
- M2 Warm up: first Triton call compiles (hundreds of ms to seconds); cuBLAS first matmul heuristic search (cuBLAS = NVIDIA's tuned linear algebra library); allocator grabs memory first time. -> A.
- M3 Repeat, robust statistic: median or mean with spread; clocks change with temperature and power. -> A.
- M4 Watch the cache: same small kernel 100 times sits in L2, measures L2 not HBM; do_bench clears L2 by writing a big buffer (check source). -> A.
- M5 Correctness before speed: wrong kernel can be very fast; fp16 attention agrees to about one in a thousand, not one in a million. -> A.
- M6 Time only the kernel: allocate outside, fixed shapes, nothing recompiles. -> A.
- M7 do_bench does most: warms up, syncs, flushes L2, repeats for target time, returns ms; recent versions warmup and rep in ms, default statistic mean; check docstring. Memory: reset peak stats before, max memory allocated after. -> A.

## Build It

- B-1 Task 1 online softmax in NumPy: safe softmax, online max-sum, online softmax, merge; test scales 1, 10, 100 on 10,000 numbers; split into 7 uneven chunks and merge; overflow demo 1000, 1001, 1002. Hints: start m = minus infinity, l = 0, exp of minus infinity is 0 so no special case; merging with empty state is a no-op; online vs safe differ ~1e-15 in float64; more than 1e-12 means a term rescaled against wrong max. -> A, "here's what you'd build".
- B-2 Task 2 tiled attention NumPy: naive vs tiled with Br, Bc; outer over query blocks, inner over key blocks; m, l, acc per block. Tests: N=1000 (partial blocks), d=64, float64 and float32, max diff below 1e-5 (author's ~4e-16 float64, ~8e-9 float32); Br=Bc=1 is pure online softmax, Br=Bc=N becomes naive; causal option: masked scores minus infinity before max, skip blocks entirely in future, count for N=1024, Br=Bc=64; peak memory via tracemalloc at 1024, 4096, 8192. -> A.
- B-3 Spark setup: NGC PyTorch container recommended; own env needs PyTorch supporting compute capability 12.1 and Triton recent enough (3.3+ added Blackwell; check GB10); unknown-architecture error -> switch to container. gpuinfo script prints versions, capability (expect 12, 1), SM count, memory, shared memory, L2 size, registers; fill Figure 001 CHECK slots; run Triton vector-add tutorial as smoke test; TRITON_INTERPRET=1 runs kernels on CPU where print and debugger work. -> A, one or two sentences each.
- B-4 Task 3 fused softmax in Triton: one row per program, one read one write of HBM; load masked with other = minus infinity (why not 0: max and exp); subtract max, exp, sum, divide in float32; store masked. Check vs torch.softmax on (4096, 1000), (4096, 4096), (1, 37); benchmark yours, torch.softmax, eager version; report GB/s with bytes = 2 x rows x cols x element size; compare 273; fused close to torch; eager several times slower; count passes, predict gap. -> A; B answers the minus-infinity question.
- B-5 Task 4 flash forward in Triton: forward only, no causal, no dropout, fp16 in, fp32 accumulators, head dim 64 or 128; one program per (query block, batch x head); wrapper given, loop body yours, same as NumPy loop. Steps: load K tile transposed masked; dot times scale, set out-of-range columns to minus infinity with where; new max, p, alpha; l update; load V, acc rescaled plus dot of p cast to fp16 and V; m update. Hints: max/sum along key axis; dot needs same dtype, cast p to fp16, accumulator fp32; test assert_close against SDPA at tolerance two hundredths for N = 1024, 1000, 77; wrong numbers -> TRITON_INTERPRET with N=77, print m after each block; exp2 with log2(e) folded into scale since hardware native is base 2. Compare with Triton's Fused Attention tutorial (06): causal, backward, autotuned blocks; you can read it now. -> A.
- B-6 Task 5 benchmark: naive vs SDPA vs mine, B=1, H=32, D=128, N 512 to 16384, assert close, FLOPs 4BHN squared D, do_bench time, peak memory, OOM caught; two-panel log-log plot of time and memory vs N; find SDPA's backend by forcing flash, efficient, cuDNN, math one at a time; on a new architecture flash backend may not be built and SDPA silently falls back. 32K careful: naive ~137 GB; Spark memory shared with OS so Linux OOM killer or swapping instead of clean error; try once alone, watch free -g. -> A; B asks what happens at 32K.
- B-7 Task 6 review: agent reviews kernel for bugs passing small tests: mask mistakes when N not multiple of block, a row all minus infinity giving NaN, integer overflow in offsets for huge tensors, wrong strides if not contiguous, fp16 accumulation where fp32 needed; fix yourself. -> A, list said naturally.
- B-8 Done when: online matches ~1e-15 and merged chunks match; tiled matches below 1e-5 for N=1000 any blocks causal and not, peak memory linear; Triton kernels pass for N=77, 1000; Measure table filled and plot; explain every gap in bytes and FLOPs. -> A folds into closing of Build It, briefly.

## Measure

- E1 Table on Spark: B=1, H=32, d=128, fp16, forward; N 1K, 4K, 8K, 16K, 32K; naive/SDPA/mine ms and peak GB, mine TFLOP/s; prediction column written first. Softmax table GB/s for 4096x4096 and 4096x32768, eager passes counted. -> A, "write the prediction first".
- E2 Mac measurement (NumPy, float32, d=64, tracemalloc): naive 17.8 MB, 273 MB, 1,082 MB at 1K, 4K, 8K; tiled 0.5, 1.2, 2.3 MB. Naive 4x per doubling, tiled 2x: N squared vs N measured. -> A.
- E3 Tiled NumPy slower: 0.31 s vs 0.13 s at 4096: NumPy can't fuse, each line a separate pass, Python loop overhead; tiling pays only when tiles stay on chip, which Triton adds. -> B surprised, A explains.
- E4 Predictions not measurements: naive time N squared, memory-bound; at 8K ~17 GB traffic at 273 GB/s at least ~64 ms; FLOPs ~1.1 TFLOP need ~9 ms at 125 TFLOP/s; expect near or above memory floor. -> A.
- E5 Naive memory: ~8.6 GB at 8K, 34 GB at 16K, 137 GB at 32K, doesn't fit. -> A.
- E6 SDPA and yours: time N squared, memory flat, extra a few MB at every N; if SDPA peak grows N squared it fell back to math backend. -> A.
- E7 Yours vs SDPA: untuned within 1.5-3x of production is good; compare TFLOP/s to matmul plateau from bandwidth lesson; flash-class kernels get 50-75% of it on mature hardware; try blocks 64 and 128, num_warps 4 or 8; best depends on shared memory size, hence autotuning. -> A.
- E8 Softmax GB/s: fused large fraction of 273 on big shapes; eager slower by ratio of HBM passes. -> A.

## Break It

- X1 Drop max subtraction: exp directly on fp16 rows scaled by 20 -> inf, then nan; running max isn't an optimization, it makes fp16 attention possible. -> "what if you" exchange.
- X2 Forget the rescale on acc (keep on l): wrong, but how much depends on data; if each row's max is in the first key block alpha always 1, bug invisible; build test with max in last block; random-data tests aren't enough for kernels. -> B guesses tests would catch it.
- X3 Forget the mask: N=1000, BLOCK_N=64: wrong answers, illegal memory access, or worst, correct-looking output because memory past end was zeros. Then remove only the where-minus-infinity: padded keys score 0, get real weight in softmax; V rows zero but they still add to l, the denominator, so weights shrink. -> A asks why, B works it out.
- X4 Lie with a benchmark: perf_counter one call no warmup no sync (includes compilation, hundreds of ms+), warmup no sync (launch overhead, absurdly fast), proper. Nsight Compute (ncu): NVIDIA kernel profiler, hardware counters, bytes at each level, FLOPs, stalls; measure DRAM bytes read and written for one 8K call; check metric names on GB10, unified memory may differ; where between worst and best of Figure 004 tells how much L2 saves. -> A.
- X5 Too much SRAM: 256 x 256 blocks with D=128 -> "out of resources: shared memory", how much wanted vs chip has; that number is M in the theorem; find largest that compile; largest often not fastest: bigger tiles mean fewer programs per SM, less work to switch to while waiting on memory. -> B assumes bigger is faster; A corrects.

## Explain It Back (substance must appear)

- Q1 Same FLOPs, why naive slow: memory traffic; separate kernels pass through HBM; S written, read, P written, read; 4 N squared vs ~4Nd; intensity ~d/2, ~64 for d=128, below ridge, doesn't improve with N; flash fuses, keeps tiles on chip, moves roughly inputs/outputs, compute-bound; never allocates N x N (over 60 GB for one layer at 32K, 32 heads). -> Spread through Problem/Naive sections; B's closing restatement.
- Q2 Online softmax and exactness: running max, rescale by e to the (old minus new), add; induction; only rounding; merge two states; third quantity o, divide by l at end. -> Online softmax section.
- Q3 Scaling with N, d, SRAM: FLOPs ~4 N squared d, compute time N squared; extra memory N squared -> N; traffic Theta(N squared d squared / M) vs N squared + Nd; still quadratic, constant improves with bigger SRAM, worse with bigger d (smaller tiles fit); provably optimal across all M; in practice L2 makes it near linear, compute-bound at long N, why FA-2/3 focus on tensor cores. -> Counting-bytes section; A states the d effect explicitly.
- Q4 Backward recompute: saving P = N x N write/read; save O and L; reload, recompute S, e to the (S minus L); D = dO dot O; ~25% more FLOPs; removes quadratic memory; same as activation checkpointing. -> Backward section.
- Q5 New variant (per-head learned bias, different normalization): reference in PyTorch plus awkward-shape harness; ask can it be done key tile at a time with small running state and exact merge; additive bias per tile easy, add before max; new normalization needs running statistic and merge rule, else two passes or different algorithm; count bytes/FLOPs; Triton from working flash kernel; check exactness; benchmark properly vs SDPA on plain case; Nsight to check roofline; then tune blocks and warps. -> A near the end as "how you'd approach a new attention variant", B asks it naturally (it's in his job target).

## Go Deeper / Connections

- G1 Best sources: the FlashAttention paper (section 2, Algorithm 1, Theorem 2) and Milakov and Gimelshein's four-page online softmax note; Triton fused attention tutorial. -> One sentence near the end.
- G2 Connections: roofline applied to one op (left of ridge to right); tiling = temporal locality done by hand; benchmarking from waiting-vs-working and python-speed; forward to KV cache, paged attention, serving engines (vLLM, SGLang, FlashInfer). -> One or two sentences.

## Flow

1. Problem scene -> Predict s-bytes -> "you never wanted S" -> Origin.
2. Memory ladder + figure 001 + kernels/blocks + "only way through HBM".
3. Naive three kernels + figure 002 + byte count + extras + roofline + Predict qk-matmul (B's wrong model).
4. Fusion, why softmax blocks it -> safe softmax (fp16) -> three passes -> online softmax (sticky note) -> walkthrough -> exactness (B: "approximation?") -> merge Predict.
5. Output rides along -> tile rule -> forward pass -> figure 003 -> FA-1 loop order.
6. IO counting, theorem, "so it's linear?" correction, three practical reasons, figure 004, memory.
7. Backward recompute, D trick, Predict recompute, checkpointing.
8. FA-2, FA-3, FA-4/Spark hedge, Flash-Decoding.
9. Triton concepts, figure 005, torch.compile link; benchmarking rules.
10. Build It tasks 1-6, Done when.
11. Measure: Mac numbers, Spark predictions.
12. Break It five cases.
13. New variant approach (Q5), sources, connections, B restates, A sharpens, end.
