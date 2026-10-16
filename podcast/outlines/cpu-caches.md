# Outline: cpu-caches

Source: src/lessons/cpu-caches.mdx. Curriculum entry: "Why is NumPy 100x faster?" Question: why is
looping over a NumPy array so much faster than a Python list of the same numbers? Why: memory layout
and caches decide speed long before the algorithm does; same idea scales up to GPUs.

Diagnostic gaps this lesson aims at: Numbers (feel for nanoseconds, bytes, bandwidth; biggest gap) and
"why decoding is memory-bound" (roofline: fast code hits the memory wall). Also leans on stack/heap
(he thought heap = heap data structure; here the heap is just where objects get scattered).
B voices the natural wrong models: "NumPy is fast because it's written in C" (only half), "a denser
array is always faster" (array.array is slower), "the compiler should just vectorize it", "transpose
is free so the transposed sum is just as fast", "the column walk should get the SIMD speedup too".

Earlier ideas to re-explain briefly: the latency ladder (L1 ~1 ns, RAM ~100 ns), cache line, locality,
latency vs bandwidth, "bytes in flight" (from latency-numbers); list = array of pointers to objects on
the heap, NumPy = one block of raw numbers (from stack-and-heap); roofline / memory-bound (from
bandwidth-bound).

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereqs: latency ladder lesson and stack-and-heap lesson; this lesson uses the ladder, doesn't re-teach it. One evening plus half an hour on the Spark. -> Skipped as a list; A re-explains the two prereq ideas in a sentence each where they come up; "an evening, plus half an hour on the Spark" at Build It.

## The Problem

- P1 Scene: ten million relevance scores from his cross-encoder, one float each; sum (or mean, or softmax denominator, same loop). Obvious Python for loop. -> A opens with the scene.
- P2 Python loop 107 ms on an M4 Pro MacBook; np.sum 1.2 ms; about 90x. -> A, numbers with comparison.
- P3 Common answer "NumPy is written in C": true and only half. -> B says it (wrong model), A: half.
- P4 Same loop, list built so float objects sit in shuffled memory order (same values, length, bytecode): 457 ms, four times slower, interpreter doing identical work. -> A reveals; B reacts.
- P5 NumPy summing in random order a[perm].sum(): 42 ms, thirty-five times slower than in-order NumPy, all C. -> A.
- P6 Two bills: interpreter bill (bytecode per element) and memory bill (where bytes sit, what order you touch them). NumPy wins both; you can lose the memory bill in C, NumPy, PyTorch on GPU, and then "written in C" saves nothing. -> A names the two bills; this is the spine.

## Origin

- O1 1965 Maurice Wilkes (built one of the first stored-program computers), two-page paper "Slave Memories and Dynamic Storage Allocation": small fast memory in front of big slow one, hardware keeps copies of recently used words automatically, programmer never manages it. -> A tells as story.
- O2 Three years later (1968) IBM System/360 Model 85 shipped it and named it: cache. -> A.
- O3 Only works because programs don't touch memory at random (Peter Denning and others measuring it at the same time): they reuse what they just used and walk to what's next. Every cache since, including M4's and Spark's Grace cores, is a bet on that. Lesson = what happens when your code honours the bet and when it doesn't. -> A.

## The Idea: Two bills

- I1 Warehouse picture: walk to shelf and bring item back (memory bill); fill a form for each item (interpreter bill). NumPy = forklift on straight aisle, no forms, items in a row. Python list loop = form per item, items wherever there was space. -> A, short; exact comparison, allowed.
- I2 The form: per element CPython runs a handful of bytecode instructions (Term: simple instructions CPython compiles Python into and executes one at a time in a big C loop): fetch next item, store in x, load s and x, check both types, find float-add, add the doubles, allocate a brand-new float object (floats can't change in place), drop old s, update reference counts (Term: counter in every object of how many references point at it; zero frees). -> A walks it as a list of chores, no code read.
- I3 About ten nanoseconds per element on a fast laptop. Called interpreter overhead (Term: work CPython does per operation that isn't your math: dispatch, type checks, boxing, refcounting; usually ten to fifty times the arithmetic itself). Python-speed lesson takes it apart; here only its size. -> A.
- I4 The walk: the add needs 8 bytes of a double, from somewhere on the ladder: L1 about a nanosecond, RAM about a hundred. Which rung each load hits is decided by layout and order. -> A re-explains ladder briefly.
- I5 Table (M4 Pro, CPython 3.14, NumPy 2.5, 10M float64s): Python loop list 10.7 ns; shuffled 45.7; sum(list) 1.9; sum(list) shuffled 11.2; np.sum contiguous 0.12. -> Not read as table; A gives the numbers inside the reasoning in I6.
- I6 Read in pairs: first two run identical bytecode, so 35 ns difference = pure memory bill. sum(list) does same walk with no bytecode per element, so loop minus sum (about 9 ns) ≈ interpreter bill. Scattered objects slow even the C loop in sum by 6x. Summary of the 90x: about 5-10x interpreter, rest = memory layout and what layout lets the CPU do (comes back with SIMD). -> A, with B doing one subtraction.

## The Idea: The cache line

- C1 Cache line (Term: fixed-size block moved between RAM and caches as one unit; 64 B on x86 and most ARM server cores incl. Spark; 128 B on Apple M). Met in latency lesson; now main character. -> A, re-explained.
- C2 Memory system never moves one byte or one double; a load of 8 uncached bytes fetches the whole aligned line. Mac 128 (sysctl hw.cachelinesize prints 128); Spark, Intel, AMD 64. -> A; the sysctl said as "ask the Mac its cache line size".
- F1 Figure 001: core asks for one double (a[5]); whole 128 B line (a[0] to a[15]) arrives in L1 from RAM, about 100 ns, once; next 15 neighbours cost ~1 ns each; 16 doubles on Apple, 8 on x86/Spark; if next loads are elsewhere, the other 120 bytes made the trip for nothing. -> A describes like a diagram over the phone.
- C3 Spatial locality (Term: using data next to data you just used; a line holds 8 or 16 doubles). After a[5] you read a[6], already in the line. -> A.
- C4 Temporal locality (Term: using the same data again soon, before the line is pushed out). -> A.
- C5 Every speedup in the lesson is one of those two, or the third trick (SIMD). -> A signpost.

## The Idea: The prefetcher

- PF1 Spatial locality alone: still full RAM latency once per line; 100 ns per 16 doubles ≈ 6 ns per double, way slower than NumPy's 0.12. -> A works the arithmetic; B asks why NumPy isn't 6 ns.
- PF2 Hardware prefetcher (Term: circuitry by the caches that watches missing addresses, spots a pattern, next line or every Nth line, requests lines before the program asks). -> A.
- PF3 Clerk at warehouse door: you ask for shelf 40, 41, 42; clerk sends runners for 43-46 unasked; on the counter when you ask. Can also spot fixed stride (40, 48, 56). Can't guess next item of a random list, or next object behind a pointer not yet loaded. -> A.
- PF4 In-order access turns a latency problem into a bandwidth problem: many lines in flight, arriving back to back ("bytes in flight" from the latency lesson). Random access leaves you with latency. -> A, re-explains latency vs bandwidth in a sentence.
- PF5 Prefetcher often stops at page boundaries (4 KB on x86 and usually Spark's Linux; 16 KB on macOS), since next page might not be mapped. -> A, one sentence.

## The Idea: Feel it (Figure 002, interactive)

- F2 Interactive strip: every pattern reads 16 numbers; count lines; toggle 64 B / 128 B lines and Python list layouts. Dark = bytes needed; grey = bytes read anyway (pointers, object headers); light = fetched, never used. -> A describes what you'd see clicking through.
- F2a In order: one line per 16 numbers on Mac (per 8 on x86), 100% useful. -> A.
- F2b Stride 8 = 64-byte step: with 64 B lines one number per line, 1/8 useful, 8x traffic; with 128 B lines half as bad. Same code, different penalty on Mac and Spark. -> A; B notes Mac vs Spark.
- F2c Column: column walk of a matrix, one line per number every time. -> A.
- F2d Random: about one line per number and prefetcher can't help. -> A.
- F2e Python list in order not that bad for memory: more bytes than NumPy (8-byte pointer + 32-byte object block per number) but all a forward walk. Shuffle it and it becomes the random case. -> A; B surprised.
- PR1 Predict list-shuffle: in-order list loop ~11 ns/element, list nowhere near cache (10M floats ~320 MB with objects). If 10,000 floats, all in L2: faster, same, or slower? Answer: about the same, 10.8 vs 11.0 ns. Prefetcher keeps up; interpreter's ~10 ns hides the rest. Cleanest evidence interpreter bill dominates for in-order list; memory bill only when scattered: 45.7, same bytecode. -> A asks; B guesses faster (wrong model: "in cache = faster"); A reveals.

## The Idea: Why pointer-chasing lists lose

- L1 From stack-and-heap: list of floats = array of 8-byte pointers, each to separate 24-byte float object on the heap. Element i = two loads: pointer, then object. Pointer array dense and walked in order, cheap. -> A re-explains.
- L2 Objects created in order (a.tolist(), list comprehension, appending in loop): CPython's small-object allocator hands out neighbouring addresses; object i+1 usually right after i; prefetcher happy. -> A.
- L3 Visiting order doesn't match creation order (sorted, shuffled for a training epoch, built from dict values, objects made at different times by different code): each pointer jumps somewhere new, likely miss every element; prefetcher can't predict since it doesn't know the address until the pointer is loaded. -> A; ties to his ranker (sorting scores).
- L4 Why 45 ns not full ~100 ns: pointers from in-order array, so CPU knows next few object addresses early and can have a couple of misses in flight. Memory-level parallelism (Term: several misses outstanding at once so waits overlap; out-of-order cores track a few dozen per core if they find independent loads). Interpreter runs long stretch between object loads, limits lookahead, only a few overlap. Author flags: best explanation for exact number; direction is the robust part. -> B asks "why not a hundred"; A answers with the hedge.
- L5 NumPy removes this: no per-element objects, no pointers; element i at base plus eight times i; every address known without loading anything. Leads to: what if NumPy's elements aren't next to each other? -> A signpost.

## The Idea: Rows, columns and strides

- R1 RAM is one long line of bytes; matrix 2D; something flattens it. Row-major (Term: row 0 then row 1; moving along a row = next address; C order): C, NumPy default, PyTorch. Column-major (Term: column after column; Fortran order): Fortran, MATLAB, Julia, many BLAS libraries. -> A.
- R2 Strides (Term: per dimension, bytes to jump to move one step; R by C float64 row-major has strides 8C and 8; address of a[i,j] = base + i*stride0 + j*stride1). Every array = pointer, shape, strides tuple. Slicing and transposing copy nothing; new small object with different strides into same buffer. -> A in words, worked example with 4x4.
- F3 Figure 003: 4x4 float64 row-major. Row walk steps 8 bytes, prefetcher's favourite. Column walk jumps 32 bytes (one row) per step; for a real 4096-wide matrix, 32 KB per step, new line every time. Strides (32, 8); transpose strides (8, 32), same buffer, no copy, roles swapped. -> A describes over the phone.
- R3 Small matrix: doesn't matter, fits in cache. Big one decides everything. M4 Pro, 4096 x 4096 doubles (134 MB) in C: rows 0.53 ns, columns 3.04 (5.7x slower); with -ffast-math rows 0.10, columns 3.19 (32x slower). Same adds, numbers, compiler; only loop order swapped. Flag made good order 5x faster, nothing for bad: third trick coming. -> A; B asks about the flag; A defers.
- R4 NumPy usually smart: M.T.sum(axis=1), iterator notices strides and walks memory in natural order: 1.36 ms vs 1.19 ms un-transposed. -> B voices "so transpose is free"; A: for reductions, mostly.
- R5 Not always: M.T.copy() must produce new row-major from transposed view, so reads or writes go down columns: 5.4 ms vs 1.2 ms for M.copy(). Every np.ascontiguousarray, .copy() on a transpose, or handing a transposed array to a library that needs C order pays that. -> A.
- R6 Code: you can see strides directly; 1000 x 10000 zeros: strides 80,000 and 8; transpose 8 and 80,000; every-other-column slice 80,000 and 16; C-contiguous flag true, transpose false. -> A in words: "ask the array for its strides".

## The Idea: SIMD

- S1 Memory bill explains column walk being slow; doesn't explain NumPy in order 0.12 vs plain C in order 0.53. Both read memory perfectly. Difference: how arithmetic is done, two parts. -> B asks this (natural); A.
- S2 Part 1, dependency chain: s += a[i]; each add needs previous result; float add takes a few clock cycles; core waits for s though it has spare adders. One cook, one pot, each ingredient waits for last to dissolve. 0.5 ns per element = latency of one add, not memory. -> A.
- S3 Fix: four running sums s0..s3, add at end; four independent chains run in parallel on several adders; 0.16 ns, 3.3x faster, no special instructions. Instruction-level parallelism (Term: one core running several independent instructions at once; several adders, multipliers, load units). -> A.
- S4 Part 2, wide registers: SIMD (Term: Single Instruction, Multiple Data; one instruction on short vector packed in a wide register; 2 doubles or 4 floats on 128-bit NEON). Vector register (Term: 128 bits on ARM NEON, Apple M and Spark; 256 AVX2; 512 AVX-512). Wide registers plus several accumulators: 0.08 ns in-cache. -> A.
- F4 Figure 004: three rows: one accumulator 0.52 ns, each waits for s; four accumulators 0.16, four chains at once on four adders, same plain instructions reordered; vector accumulators 0.08, each box two doubles (four floats), several boxes in flight; AVX2 boxes hold 4 doubles, AVX-512 hold 8. Measured M4 Pro, data in L1. -> A describes.
- S5 Why doesn't compiler do it: float addition not associative; (a+b)+c vs a+(b+c) differ in last bits since each add rounds. Splitting changes order, can change answer; C compilers can't without permission. -ffast-math = permission (plus riskier ones; don't use blindly). Integers: exact, compiler vectorizes plain loop by itself. -> B: "why doesn't the compiler just do this?" (real question); A with tiny worked example of rounding.
- S6 NumPy's sum for floats documented to use pairwise summation: add in blocks, then add block sums. More accurate than one long running sum and naturally split into independent chains CPU can vectorize. np.sum gets memory bill right and arithmetic bill right. -> A.
- S7 SIMD helps until memory is the wall: 800 MB array, vectorized sum 0.08 -> 0.11 ns, about 71 GB/s, waiting on RAM. One-accumulator unchanged 0.52 -> 0.54, never waiting on memory. Roofline from bandwidth-bound lesson in miniature: slow kernel compute-bound, fast kernel on big data hits the memory roof. -> A; re-explain roofline in a sentence; ties to decoding being memory-bound (gap).
- S8 SIMD needs numbers packed side by side so one load fills one vector register. Python list can never feed it (doubles inside separate objects); strided array feeds it badly. Layout allows the third trick at all. -> A.

## The Idea: Five ways, one chart

- PR2 Predict five-ways: (1) Python loop list, (2) Python loop array.array('d'), (3) np.sum contiguous, (4) np.sum stride 16 elements (128 B, every number own Apple line), (5) a[perm].sum(). Rank, ratio fastest/slowest, is array.array loop faster or slower than list? Answer: 0.12, 2.4, 4.2, 10.7, 14.9; about 120x. -> A asks; B ranks, guesses array.array faster (wrong model: denser = faster); A reveals.
- PR2a array.array slower though dense and 4x smaller: stores raw doubles, Python code can't touch a raw double; every for x in arr builds a new float object; list already has them. Compact layout pays only when the loop over it is in C. Fixes memory bill, worsens interpreter bill. -> A.
- PR2b Gather 4.2 beats shuffled list 45.7 by 10x though both random: addresses computed from known index array, no interpreter between loads, many misses in flight; MLP at full strength. Same random pattern in latency lesson's pointer chase ~100 ns per step, each address depended on the previous load. -> A; re-explain pointer chase in a sentence.
- F5 Figure 005: log-scale bar chart, nine ways, solid = C loop, light = interpreter per element; best of 3-10 runs; your numbers differ, order shouldn't. -> A describes shape: two groups; numbers given via gaps below.
- G1 list loop -> sum(list) 10.7 -> 1.9: remove interpreter, keep layout, about 5.6x. Interpreter bill. -> A.
- G2 sum(list) -> contiguous NumPy 1.9 -> 0.12: remove pointers and objects, 8 bytes instead of 40, C loop can use several accumulators and SIMD; about 16x. Layout bill. -> A.
- G3 list loop -> shuffled 10.7 -> 45.7 and sum(list) -> shuffled 1.9 -> 11.2: same code, scattered objects; memory bill. -> A.
- G4 contiguous -> stride 64 B -> stride 128 B: 0.12 -> 0.70 -> 2.4. At 64 B stride on Mac two numbers share each 128 B line; at 128 B every number own line. Prefetcher still predicts: bandwidth wasted, not latency. -> A.
- G5 Random gather 4.2: about one line per number, no prefetching, saved by MLP. Also allocates 80 MB temporary for a[perm], part of the cost. -> A.

## The Idea: The same story on a GPU

- GP1 Louder on GPU: machine designed to be fed by bandwidth. -> A signpost.
- GP2 Warp (Term: 32 GPU threads executing same instruction at same time, each on own data; basic scheduling unit). Warp's load: all 32 addresses issued together, memory system looks at them together. Moves 32-byte sectors (Term: four sectors = one 128-byte line). Neighbours -> served with a handful of sectors: coalesced access (Term: consecutive addresses -> minimum number of wide transactions). -> A.
- F6 Figure 006: coalesced: thread k reads x[k], 32 consecutive floats, need 128 B, move 4 sectors = 128 B, every byte used. Strided: thread k reads x[k * width], each thread own sector, 32 sectors = 1 KB to use 128 B, 8x traffic; 4 B used of each 32. -> A describes; B works out the 8x.
- GP3 GPU memory fast (Spark spec sheet ~273 GB/s), but inference kernels already memory-bound (bandwidth-bound lesson). Uncoalesced kernel moving 8x bytes runs close to 8x slower. -> A.
- GP4 So GPU kernel engineering is about layout: tile matrices into blocks warps read row-wise, stage in on-chip shared memory (Term: small scratchpad per multiprocessor, tens to a couple hundred KB, managed by hand; load tile once coalesced, reuse many times; not OS shared memory), reuse each tile many times before going back. FlashAttention = temporal locality done by hand. -> A.
- GP5 PyTorch .contiguous(): tensor = pointer, shape, strides like NumPy. x.T, transpose(1,2), permute, many slices just swap strides; free; result non-contiguous. Then one of three things. -> A.
- GP6 (1) Op refuses: .view() needs strides it can reinterpret without moving data; fails on transpose with error "view size is not compatible ... use reshape instead". .reshape() quietly copies when it has to. -> A; error paraphrased.
- GP7 (2) Op handles it slowly: elementwise op on one tensor keeps layout, full speed. Mixing layouts: Mac CPU, x + y on two 4096 x 4096 float32: 1.1 ms; x.T + y: 11.7 ms; one input read down columns. -> B voices "transposing is free so it should be same"; A.
- GP8 (3) Op copies for you: custom CUDA ops, some attention impls, anything wanting raw pointer call .contiguous() internally: new tensor, transposing copy, often unnoticed; the M.T.copy() cost every call. -> A.
- GP9 q = q.transpose(1, 2).contiguous() in attention: paying copy once on purpose so next big kernel gets coalesced reads. .contiguous() on already-contiguous returns it unchanged, free. -> A.
- GP10 CNNs: memory_format=torch.channels_last stores N, H, W, C instead of N, C, H, W; channels of one pixel next to each other, what conv kernels on modern GPUs want to read together. -> A, ties to his CNNs.

## Build It

- B0 Everything in a caches folder in workbench; three programs (five-ways in Python, row/column in C, SIMD sum in C), then C ones on the Spark with hardware counters. One evening plus half an hour on Spark. -> A one sentence.
- B1 Task t0 setup: venv, numpy; ask each machine its line size: Mac sysctl (128), Spark lscpu or the sys file coherency line size (64). getconf can print 0 on ARM; sys file reliable. -> A, one or two sentences.
- B2 Task t1 five.py: harness benching each function, best of reps, ms and ns per element, print result. Ten million float64s: a (80 MB contiguous), lst via tolist (objects in order), arr array.array of packed doubles, perm. Benchmarks: loop over lst, lst_shuf, arr; sum(lst), sum(lst_shuf); a.sum, s8.sum, s16.sum, a[perm].sum. -> A, "here's what you'd build".
- B3 t1 hints: lst_shuf is subtle: same float objects (still in creation order in memory) visited in random order: build list of references indexing lst with perm; don't call float() (new objects in new places). s8: array 8x longer sliced with a step; strides should print 64. Every sum about five million (mean of random is 0.5); wildly different = wrong thing. Write predicted ranking first. -> A; B voices the trap (why not float()).
- B4 Task t2 rowcol.c: matrix filled i mod 7; sum_rows and sum_cols; run each twice (first pass faults pages in), time second; print n, MB, ns per element, ratio, sums. Run n = 256, 1024, 4096, 8192, both builds (-O2 and -O2 -ffast-math). Predict: at which n does the gap appear and why there (use cache sizes from t0). -> A.
- B5 Task t3 simd.c: sum1 (one accumulator), sum4 (four, then combine), noinline; time on n = 4096 (32 KB, fits L1) and 100 million (800 MB). Three builds: plain (sum1, no reordering), no-vectorize (sum4, scalar only; GCC flag differs on Linux), fast-math (sum1, compiler may vectorize). The trap: compiler may notice pure function on unchanged array called a million times and call once; compiler barrier (empty asm statement telling compiler memory may have changed) before each call. Optional: look at assembly for vector adds, "point two d" = two doubles. -> A, barrier said as idea.
- B6 Task t4 perf on the Spark: macOS has no perf; Linux does; ask CPU's counters how many lines fetched. perf stat with cache-references, cache-misses, L1 loads, L1 load misses. Generic names map differently per chip; on ARM may show not supported; then ARM names from perf list: l1d_cache, l1d_cache_refill (L1 accesses and lines fetched into L1), ll_cache_miss_rd (last-level misses on reads); author can't check what GB10 exposes; perf list is truth. Permissions: lower perf_event_paranoid to 1. Mode argument to run one order only; misses per element: row ~1/8 (one 64 B line per 8 doubles) or far less if prefetched lines count as hits; column close to 1. Agent may explain events, program is his. -> A.
- B7 Task t5 layout_gpu.py on Spark's GPU: 8192 x 8192 float32 x, y; time x + y, x.T + y, x.T.contiguous(), x.T.contiguous() + y; print is_contiguous and stride of x.T; show x.T.view(-1) raises and reshape doesn't, check whether reshape shares memory via data pointer. GPU timing: warm up, synchronize before reading clock both ends (launches async, else you time launch), repeat. GB/s for x + y (reads 2, writes 1) vs ~273 GB/s spec. Agent reviews timing for missing syncs. -> A; B asks why sync.
- B8 Done when: all sums agree and ranking written first; rowcol gap on both machines and at which size and why; three distinct speeds in L1 and which is dependency chain / ILP / SIMD; perf misses per element both orders (or note); explain why x.T + y slower without saying "because it's transposed". -> A folds the last one into conversation.

## Measure

- M1 Fill in table: prediction, Mac, Spark; reference run on M4 Pro (CPython 3.14.6, NumPy 2.5.4, Apple clang). Reference numbers already given in Idea; sorted gather 0.54. -> Not read as table; new numbers said where they matter.
- M2 Two bills don't simply add: loop minus sum = 8.8 ns in order (10.7 - 1.9) but 34.5 shuffled (45.7 - 11.2). If interpreter were a fixed tax they'd match. In the tight C loop in sum, many object loads in flight, misses overlap; in interpreter loop, each load surrounded by other work, fewer overlap, each miss exposed more. "5x interpreter, 16x layout" good first story; this is truer second. -> B voices "fixed tax" model; A corrects.
- M3 Row/column gap appears when matrix stops fitting in cache: n = 256 (512 KB) 1.2x; 1024 (8 MB) 1.6x; 4096 (134 MB) 5.7x. Compare with L2 and Apple's system-level cache (Spark's L3). Spark: 64 B lines, column walk wastes 7/8 instead of 15/16, so expect slightly smaller ratio than Mac at same size but slower row walk. Measure it. -> A.
- M4 -ffast-math widens the gap: only speeds up row walk, which was waiting on arithmetic; column walk waiting on memory; no SIMD helps a loop waiting on RAM. -> B voices "columns should get the speedup too"; A.
- M5 SIMD sum hits memory roof: in L1 vectorized 6.5x faster than sum1; from RAM ~71 GB/s on Mac, one core's practical bandwidth. sum1 doesn't care, 0.52 vs 0.54. Slow code never sees memory wall; fast code always does. -> A.
- M6 Sorted gather 8x faster than random gather (0.54 vs 4.2), same instructions; sorted indices walk forward, prefetcher follows. -> A; ties to sorting scores.

## Break It

- K1 Power of two: n = 4000, 4096, 4100: column walk 2.05, 3.27, 1.96 ns; 4096 about 60% worse. Each column step at 4096 exactly 32 KB; cache picks which slots a line may go in from a few address bits; addresses exactly 32 KB apart share those bits, compete for the same few slots, evict each other, rest of cache empty. Conflict misses (Term: misses from too many lines mapping to same small group of slots, a set; classic with power-of-two strides). Fix: padding, rows of 4096 + 8, ignore extra. Why libraries pad leading dimension; why FFT/matrix benchmarks at 4096 look weirdly bad. -> "what if" exchange; B surprised a rounder number is slower.
- K2 Let compiler cheat: remove barrier; "59,925 GB/s" in-cache: ran once. Delete final printf and the whole thing may vanish. Every microbenchmark must make compiler believe the work matters. -> A; B laughs at the number.
- K3 Shrink until NumPy loses: sum(l) vs a.sum() at 10, 100, 1,000 elements: 59 ns vs 237 ns at 10; about even at 100; NumPy 5x ahead at 1,000. Fixed few hundred ns per call (argument parsing, dtype dispatch, allocating result). np.array(l).sum() loses at every size: converting list to array is itself a Python-speed loop over objects. NumPy pays off when data lives in arrays and many ops per conversion. -> B voices "so always use NumPy"; A.
- K4 Stride prefetcher can't track: a[::k] for k = 1, 2, 4, 8, 16, 32, 64, 512; cost rises until every element own line (k = 16 Mac, 8 Spark), then mostly flattens; large k crosses a 4 KB or 16 KB page per step, prefetcher won't cross pages, translations miss in TLB (Term: translation lookaside buffer, small cache of recent virtual-to-physical translations). Look for a second rise. -> A; TLB explained in plain words.

## Explain It Back (substance must appear in conversation)

- E1 Why ~100x: interpreter (several bytecodes, type checks, new float per partial sum, ~10 ns) + layout (pointer + ~24-byte object, ~40 bytes per number; scattered = miss per element; dense = every byte of every line, prefetcher streams, SIMD + accumulators). Split ~5-6x interpreter, ~16x layout. Shuffle objects: identical loop 4x slower. -> Covered across Two bills, chart gaps; B's closing restatement.
- E2 Cache line and strides: unit moved, 64 / 128; stride 1, a 128 B line serves 16 doubles, one miss pays for 16 loads; stride of a line or more: each element costs a whole line, 8x or 16x bytes; prefetcher predicts constant stride so bandwidth not latency, but burns bandwidth on unused bytes; random worst: line per element, nothing to predict. -> Covered in cache line, prefetcher, feel-it; A sharpens in a line.
- E3 Matrix code 6x slower than colleague's: loop order vs layout; check strides/flags/is_contiguous; swap loop order or make contiguous in reading order; measure; confirm with perf stat (L1 refills per element ~1/8 -> ~1); check size (fits in cache = gap mostly vanishes); power-of-two width -> conflict misses, pad. -> A as a "if a teammate's matrix code is six times slower" moment, after Break It 1.
- E4 Scale: sum one column of a 10M x 64 float32 table. Row-major: row 256 bytes, want 4; roughly a 64 B line per value on Spark (128 on Mac): 10M x 64 B = 640 MB moved for 40 MB useful, 16x. Column-major / column store (Parquet, Arrow): dense 40 MB run at full bandwidth. At one core's ~50-70 GB/s: ~1 ms vs ~10 ms; gap stays 16x however big, ratio of bytes. GPU: warp reading one column of row-major rows touches 32 separate sectors, 8x traffic; store or transpose the column first. Why analytics DBs are column stores and feature columns get pulled into own arrays. -> A poses it as his ranker's feature table; B works part of the math; A finishes.
- E5 .contiguous(): returns tensor in plain row-major order; if already, same tensor free; if a view with rearranged strides, allocates and copies. Worth it when next ops read many times and need dense in-order: before view, before custom raw-pointer kernel, before attention kernel wanting each head's rows dense for coalesced reads. One copy to save slow pattern on every later read. Not "just in case" on something read once. -> GPU section, plus "not just in case" line.

## Go Deeper / Connections

- D1 Best sources: Drepper's "What Every Programmer Should Know About Memory" (sections 3 and 6); Ostrovsky "Gallery of Processor Cache Effects"; CS:APP chapter 6 memory mountain; NumPy ndarray docs; CUDA best practices on coalescing; FlashAttention paper; Wilkes's two pages. -> One closing sentence naming Drepper and Ostrovsky (maybe Wilkes).
- X1 Connections: stands on latency ladder and stack/heap; hands interpreter bill to Python-speed lesson; hands memory bill to bandwidth-bound (once every byte of every line is used, bytes per second sets tokens per second on the Spark); page-sized steps are the edge of virtual memory lesson. -> One or two sentences near the end.

## Flow plan

1. Problem: scene, 107 ms vs 1.2 ms; B: "it's written in C"; A: two more numbers (457, 42); two bills.
2. Origin: Wilkes, Model 85, Denning, the bet.
3. Two bills: warehouse, the form (chores), ten ns, the walk, pairs of numbers.
4. Cache line, figure 001, locality.
5. Prefetcher: six ns arithmetic, clerk, latency to bandwidth, pages.
6. Feel it: strip figure; Predict 1.
7. Pointer-chasing lists: allocator, shuffled order, MLP, NumPy addresses known.
8. Rows/columns/strides: row/col major, strides worked example, figure 003, C numbers, NumPy smart and not.
9. SIMD: why C 0.53 vs NumPy 0.12; dependency chain; four accumulators; NEON; figure 004; non-associativity; pairwise; memory roof; layout needed.
10. Predict 2 and the chart gaps.
11. GPU: warp, sectors, coalescing, figure 006, 273 GB/s, tiling, FlashAttention, .contiguous() three outcomes, attention line, channels_last.
12. Build It: t0-t5 in talk.
13. Measure: bills don't add, gap appears with size, fast-math widens, memory roof, sorted gather.
14. Break It: four.
15. Explain-it-back substance: matrix 6x diagnosis, column-store scale question.
16. Connections + sources, one or two sentences.
17. Ending: B restates core idea; A sharpens; stop.
