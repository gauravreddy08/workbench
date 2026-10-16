# Coverage: cpu-caches

Lesson src/lessons/cpu-caches.mdx vs podcast/scripts/cpu-caches.md. Item IDs match
podcast/outlines/cpu-caches.md. "Fixed" = was MISSING or thin in the first draft and was added.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs, evening + half hour | Build It | "It's about an evening, plus half an hour on the Spark" | covered (prereq ideas re-explained inline) |
| P1 ten million scores, sum/mean/softmax | Problem | "ten million relevance scores out of your cross-encoder" | covered |
| P2 107 ms vs 1.2 ms, ~90x | Problem | "a hundred and seven milliseconds... One point two" | covered |
| P3 "written in C", half the story | Problem | B: "NumPy's written in C, right?" | covered |
| P4 shuffled objects 457 ms, 4x | Problem | "Four hundred and fifty-seven milliseconds" | covered |
| P5 a[perm].sum 42 ms, 35x | Problem | "Forty-two milliseconds. That's thirty-five times slower" | covered |
| P6 two bills | Problem | "the interpreter bill... the memory bill" | covered |
| O1 Wilkes 1965 paper | Origin | "Slave Memories and Dynamic Storage Allocation" | covered |
| O2 IBM Model 85, named cache | Origin | "System three sixty Model eighty-five" | covered |
| O3 Denning, locality, the bet | Origin | "Programs don't touch memory at random" | covered |
| I1 warehouse, forklift, forms | Two bills | "NumPy is a forklift on a straight aisle" | covered |
| I2 bytecode chores, new float, refcount | Two bills | "allocate a brand-new float object" | covered |
| I3 ~10 ns, interpreter overhead, 10-50x | Two bills | "ten to fifty times the cost of the arithmetic" | covered |
| I4 ladder L1 ~1 ns, RAM ~100 | Two bills | "L one, answers in about a nanosecond" | covered |
| I5 table numbers 10.7/45.7/1.9/11.2/0.12 | Two bills | "forty-five point seven... one point nine... eleven point two" | covered (not read as table) |
| I6 read in pairs, 35 ns, ~9 ns, 6x, 5-10x | Two bills | "about five to ten times of it is the interpreter" | covered |
| C1 cache line 64 / 128 | Cache line | "On your Mac it's a hundred and twenty-eight bytes" | covered |
| C2 whole aligned line; sysctl 128 | Cache line | "You can actually ask the Mac" | covered |
| F1 figure 001 one load one line | Cache line | "The core asks for element five, and up from RAM comes a whole line" | covered |
| C3 spatial locality | Cache line | "Spatial locality: using data that sits right next to" | covered |
| C4 temporal locality | Cache line | "temporal locality: using the same data again soon" | covered |
| C5 two habits or third trick | Cache line | "Or the third trick, which we'll get to" | covered |
| PF1 100 ns / 16 = ~6 ns vs 0.12 | Prefetcher | "about six nanoseconds per double" | covered |
| PF2 hardware prefetcher definition | Prefetcher | "circuitry sitting next to the caches" | covered |
| PF3 clerk, shelves 40-46, stride, can't guess random/pointer | Prefetcher | "the clerk sends runners for forty-three" | covered |
| PF4 latency to bandwidth, bytes in flight | Prefetcher | "turns a latency problem into a bandwidth problem" | covered |
| PF5 page boundaries 4 KB / 16 KB | Prefetcher | "the prefetcher stops at page boundaries" | covered |
| F2 interactive strip, shading | Feel it | "Dark for the bytes you actually needed. Grey..." | covered |
| F2a in order 100% | Feel it | "A hundred percent useful" | covered |
| F2b stride 8, 1/8, Mac vs Spark | Feel it | "Different penalty, same code" | covered |
| F2c column | Feel it | "One line per number, every single time" | covered |
| F2d random, prefetcher lost | Feel it | "the prefetcher readout just says lost" | covered |
| F2e py list in order not bad; 8 B pointer + 32 B block | Feel it | "an eight-byte pointer, plus a thirty-two-byte block" | covered |
| PR1 predict small list: 10.8 vs 11.0 | Predict, small list | "Ten point eight nanoseconds for ten thousand floats" | covered (B guesses faster) |
| L1 list = pointers to 24 B objects, two loads | Pointer-chasing | "a separate twenty-four-byte float object" | covered |
| L2 created in order, allocator neighbours | Pointer-chasing | "small-object allocator tends to hand out neighbouring addresses" | covered |
| L3 sorted/shuffled/dict/different times | Pointer-chasing | "You shuffled it for a training epoch" | covered |
| L4 why 45 not 100, MLP, hedge | Pointer-chasing | "That's called memory-level parallelism" / "best explanation for the exact number" | covered |
| L5 NumPy base + 8i | Pointer-chasing | "the start address plus eight times i" | covered |
| R1 row-major / column-major | Strides | "row-major order... column-major order" | covered |
| R2 strides, pointer shape strides, views no copy | Strides | "a pointer to the start, a shape, and the strides" | covered |
| F3 figure 003, 4x4, (32, 8), (8, 32), 32 KB for 4096 | Strides | "thirty-two kilobytes. A brand-new cache line every single time" | covered |
| R3 C numbers 0.53/3.04/0.10/3.19, 5.7x / 32x | Strides | "Five point seven times slower... thirty-two times" | covered |
| R4 M.T.sum 1.36 vs 1.19 | Strides | "One point three six milliseconds" | covered (B voices "transpose is free") |
| R5 M.T.copy 5.4 vs 1.2 | Strides | "Five point four milliseconds, versus one point two" | covered |
| R6 strides demo 80000/8, flags | Strides | "Strides: eighty thousand and eight" | covered |
| S1 C 0.53 vs NumPy 0.12 | SIMD | B: "NumPy's a tenth. Where's that gap coming from?" | covered |
| S2 dependency chain, cook and pot | SIMD | "one cook, one pot" | covered |
| S3 four accumulators 0.16, 3.3x, ILP | SIMD | "That's called instruction-level parallelism" | covered |
| S4 SIMD, vector register, NEON 128, AVX2/512, 0.08 | SIMD | "the registers are a hundred and twenty-eight bits" | covered |
| F4 figure 004 three rows | SIMD | "If you drew those three, it'd be three rows" | covered |
| S5 non-associative, fast-math permission, integers | SIMD | "floating-point addition isn't associative" | covered |
| S6 pairwise summation | SIMD | "documented to use pairwise summation" | covered |
| S7 800 MB, 0.08 -> 0.11, 71 GB/s, sum1 0.52 -> 0.54, roofline | SIMD | "about seventy-one gigabytes a second" | covered |
| S8 SIMD needs packed numbers | SIMD | "what S I M D actually needs" | covered |
| PR2 five-ways predict, 0.12/2.4/4.2/10.7/14.9, ~120x | Five ways | "fourteen point nine. Slower than the list" | covered (B guesses array module faster) |
| PR2a array.array slower: builds float objects | Five ways | "it has to build a brand-new float object for it" | covered |
| PR2b gather 10x vs shuffled list, MLP, pointer chase ~100 ns | Five ways | "the gather wins by ten times" | covered |
| F5 log chart nine ways, solid vs light | Five ways | "every gridline is ten times the last" | covered |
| G1 interpreter gap 5.6x | Five ways | "About five point six times" | covered |
| G2 layout gap 16x, 8 vs 40 bytes | Five ways | "eight bytes instead of about forty" | covered |
| G3 shuffled gaps | Five ways | "Same code, scattered objects" | covered |
| G4 stride 0.70 / 2.4, bandwidth not latency | Five ways | "this is bandwidth wasted, not latency" | covered |
| G5 gather, 80 MB temporary | Five ways | "an eighty-megabyte temporary array" | covered |
| GP1 louder on GPU | GPU | "a machine designed to be fed by bandwidth" | covered |
| GP2 warp, sector, coalesced | GPU | "thirty-two-byte chunks called sectors" | covered |
| F6 figure 006, 4 sectors vs 32, 1 KB, 8x | GPU | B: "about a kilobyte moved... Eight times" | covered |
| GP3 273 GB/s spec, memory-bound, ~8x slower | GPU | "close to eight times slower" | covered |
| GP4 tiling, shared memory, FlashAttention | GPU | "temporal locality done by hand" | covered |
| GP5 tensor = pointer/shape/strides; free views | GPU | "Exactly like a NumPy array" | covered |
| GP6 view refuses, reshape copies | GPU | "Reshape quietly copies when it has to" | covered |
| GP7 x + y 1.1 ms vs x.T + y 11.7 ms | GPU | "one point one milliseconds... eleven point seven" | covered |
| GP8 ops call contiguous internally | GPU | "call contiguous internally" | covered |
| GP9 attention transpose().contiguous(); free if already | GPU | "paying the copy once, on purpose" | covered |
| GP10 channels_last | GPU | "There's a memory format called channels last" | covered |
| B0 three programs + Spark | Build It | "Three programs" | covered |
| B1 t0 setup, line size, sys file | Build It | "the coherency line size... trust the file" | covered |
| B2 t1 harness and variants | Build It | "One little benchmark harness" | covered |
| B3 t1 hints: lst_shuf, no float(), s8 strides 64, sums ~5M, predict first | Build It | "don't call float on anything" | covered |
| B4 t2 rowcol, run twice, sizes, both builds, predict where gap appears | Build It | "guess at which size the gap shows up" | covered |
| B5 t3 sum1/sum4, three builds, barrier, asm .2d | Build It | "you put a compiler barrier before each call" | covered |
| B6 t4 perf on Spark, ARM events, paranoid, misses per element 1/8 vs 1 | Build It | "Row order should be about one eighth" | covered |
| B7 t5 GPU layout, sync, GB/s vs 273 | Build It | "you call synchronize before reading the clock" | covered |
| B8 DoneWhen items | Build It | "three clearly different speeds" / "without using the word transposed" | Fixed (three-speeds line added) |
| M1 reference run, sorted gather 0.54 | Measure | "Point five four nanoseconds, versus four point two" | covered |
| M2 bills don't add: 8.8 vs 34.5 | Measure | "thirty-four point five" | covered (B voices fixed tax) |
| M3 gap vs size 1.2/1.6/5.7, Spark 7/8 vs 15/16 | Measure | "seven eighths of each line instead of fifteen sixteenths" | covered |
| M4 fast-math widens gap | Measure | "fast math actually widens the gap" | covered (B voices wrong model) |
| M5 memory roof 6.5x, 71 GB/s | Measure | "six and a half times faster" | covered |
| M6 sorted gather 8x | Measure | "About eight times faster, same instructions" | covered |
| K1 power of two 2.05/3.27/1.96, conflict misses, padding | Break It | "Those are called conflict misses" | covered |
| K2 compiler cheat 59,925 GB/s | Break It | "fifty-nine thousand, nine hundred twenty-five gigabytes" | covered |
| K3 NumPy loses small: 59 vs 237 ns, even at 100, 5x at 1,000; np.array(l) loses | Break It | "fifty-nine nanoseconds for Python, two hundred thirty-seven" | covered |
| K4 stride sweep, k=16/8, pages, TLB | Break It | "the translation lookaside buffer" | covered |
| E1 ~100x answer | Two bills, Five ways, Close | "about five point six times... About sixteen times" | covered |
| E2 cache line and strides answer | Cache line, Feel it, Five ways, Close | "you're paying bandwidth, not a hundred-nanosecond trip" | covered |
| E3 6x slower matrix diagnosis | Explain It Back | "a teammate's matrix code is six times slower" | covered |
| E4 10M x 64 column scale question | Explain It Back | "Six hundred forty megabytes moved" | covered |
| E5 .contiguous() answer | GPU | "What it's not for is sprinkling it everywhere just in case" | covered |
| D1 Go Deeper | Connections | "Ulrich Drepper's... Igor Ostrovsky's" | covered (two sources) |
| X1 Connections | Connections | "the lesson on why Python's slow... tokens-per-second lesson" | covered |

Number check: every number in the script was compared against the lesson. Numbers said aloud that
are derived rather than written in the lesson: "two lines on x eighty-six" for sixteen in-order
numbers (sixteen times eight bytes over sixty-four-byte lines); the four-by-four address example
"row two, column one... seventy-two bytes in"; "ten times" for 1.1 ms vs 11.7 ms; and the
illustrative rounding example (three significant digits, one thousand plus four plus four) used to
explain non-associativity, which is a teaching example, not a lesson claim.
