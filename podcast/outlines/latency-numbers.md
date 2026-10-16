# Outline: latency-numbers

Source: src/lessons/latency-numbers.mdx. Curriculum entry: "How slow is slow?" Question: how long does
it actually take to read from RAM, an SSD, or the network? Why: every "how does this scale?" answer
starts with these numbers; without them you are guessing.

Diagnostic gap this lesson aims at: Numbers (no feel for latency, bytes, bandwidth; the biggest single
gap). Secondary: memory math for models / why decoding is memory-bound (16 GB at bf16, 59 ms per token).
B voices the natural wrong model: "SSD is maybe ten times slower than RAM", and later "faster internet
fixes a chatty API", and "one core can use all the memory bandwidth".

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereqs (compile C, run Python); time (an evening for reading and C, another for disks and network). -> Skipped as a list; A mentions "two evenings" in passing at the start of Build.

## The Problem

- P1 The question you couldn't answer: how much slower is an SSD than RAM? Most guess 10x; real answer closer to 1,000x. That gap = feature works vs falls over. -> A opens with the question; B guesses "ten times, maybe" (his diagnostic gap); A reveals.
- P2 Scene: lookup service for his ranker; doc ID -> precomputed features; 50 million docs; features in a file on disk; 200 lookups per request. -> A sets scene.
- P3 RAM 100 ns x 200 = 20 us, nobody notices. SSD 100 us x 200 = 20 ms per request; one after another tops out around 50 requests/s per waiting thread. Same code, a thousand times apart; only where the bytes lived changed. -> A works it out aloud; B does the 50/s.
- P4 Every scale question has this shape: algorithm fine; how many times you touch slow things, how slow they are. -> A.
- PR1 Predict ram-vs-ssd: RAM ~100 ns; random NVMe ~50-100 us; 500-1,000x. Europe round trip ~150 ms, another ~2,000x over SSD. RAM to Europe ~million-fold. Within 3x each = ahead of most engineers; "10x" is exactly the gap. -> A asks B for Europe-vs-SSD; B guesses low; A reveals.

## Origin

- O1 2001, Peter Norvig, essay "Teach Yourself Programming in Ten Years", small table: L1, main memory, disk seek, packet to Europe and back. Advice: know these. -> A tells as story.
- O2 Jeff Dean, expanded slide "Numbers Everyone Should Know", carried through talks on building Google's systems. Point: choose designs before building; count seeks, memory reads, network trips, multiply, compare. -> A.
- O3 Dean example: page of 30 image thumbnails: sequential disk reads, seeks alone ~300 ms; parallel reads, under 20 ms. No code written, decision made. -> A; B reacts.
- O4 Copied into a thousand blog posts; numbers drifted (flash replaced disks, faster networks) but shape barely moved; shape is what you learn. -> A.

## The Idea

- U1 Three units, each 1,000x the last. Nanosecond = billionth of a second; 4 GHz CPU ticks four times per ns; world of the CPU. Microsecond = millionth, a thousand ns; world of SSDs and the OS. Millisecond = thousandth, a thousand us; world of networks and humans; a blink 100-400 ms. One unit up = 1,000x = "an instant" vs "a quarter of an hour". -> A, early, quick and concrete.
- F1 Figure 001 latency ladder: every rung on one log scale, gridlines factor 10; blue bars = things your code does (Python call, GPU launch, API call), lighter = hardware; tap for honest range; human-scale toggle. Rungs: clock tick 0.3 ns; L1 1 ns (0.7-1.5); L2 4 ns (3-6); L3/system cache 15 ns (10-40); Python dict 25 ns; Python call 50 ns; DRAM 100 ns (80-150); GPU launch 5 us (2-10); localhost round trip 30 us (10-100); 1 MB from RAM 50 us; SSD random 4 KB 80 us (20-150); same-datacenter round trip 200 us (50-500); 1 MB from SSD 250 us; HDD seek 5 ms (3-10); same-region internet 10 ms (5-30); Spark read 16 GB 59 ms; US coast to coast 70 ms (60-80); California-Europe 150 ms (130-170); LLM time to first token 500 ms (0.2-2 s). -> A walks it as a ladder down the phone, not every row; picks key rungs; B asks where his own code sits.
- L1 Big jumps: L1->RAM ~100x; RAM->SSD ~1,000x; SSD->other continent ~2,000x; inside each band within a few times. -> A.
- L2 All approximate; Mac vs Spark differ, Apple SSD vs server SSD, network depends where you sit; ordering and ratios don't change, those go in your head. -> A.
- H1 Human scale: stretch by a billion, L1 = 1 s; Brendan Gregg's trick in Systems Performance. -> A introduces.
- PR2 Predict human-scale: RAM ~1.7 min (fetch from another room); SSD 80 us ~22 hours (most of a day); datacenter 200 us a bit over 2 days; Europe ~4.8 years; LLM TTFT 500 ms ~16 years. Lesson: from CPU's view every network call is a long trip; hundreds of thousands of useful things while it waits; whole argument for async (lesson 4). -> A asks; B works out RAM and SSD aloud; A gives the rest.
- H2 Python function call ~a minute; GPU kernel launch over an hour, why thousands of tiny GPU ops are slow however fast the GPU; reading every weight of an 8B model out of Spark memory ~two years, once per generated token (lesson 5). -> A, B reacts to the GPU one.
- W1 Two reasons something is slow: far or big. -> A signposts.
- W2 Far: light ~30 cm/ns in vacuum, ~20 cm/ns in fiber or copper; one 4 GHz tick, light covers 7.5 cm; hard floors. -> A.
- W3 Table: core to RAM ~5 cm, light ~0.5 ns round trip, actual ~100 ns. Datacenter ~100 m, light ~1 us, actual 50-500 us. California-Amsterdam ~8,800 km, light ~90 ms in fiber, actual 140-150 ms. -> A says three trips as three short comparisons, not as a table.
- W4 Europe: distance is most of cost; cables not straight, routers add a little; never under ~90 ms; no budget fixes it. Datacenter: light rounding error; cost is NICs, switches, OS network code on both ends. RAM: light rounding error too -> so why 100x slower than L1? -> A; B asks the RAM question.
- W5 Big: finding one byte among billions vs among 64 thousand; longer internal wires, more steps to decode an address, cheaper (slower) bits to be affordable; request checks every cache level first and misses each. Small things can be fast, fast things have to be small. -> A.
- F2 Figure 002 nested boxes: core with L1 (~1 ns) in CPU die; L2 (MBs, ~4 ns), L3 (tens of MB, ~15 ns) on die; more cores; DRAM in package (tens of GB, ~100 ns); NVMe SSD on board (TBs, ~80 us); network card, arrow out: datacenter ~0.2 ms, Europe ~150 ms. Each box outward: more room, more time. -> A describes like nested boxes over the phone.
- M1 SRAM: caches; each bit a loop of about six transistors; holds value while powered; fast, no maintenance, lots of chip area per bit; a few clock ticks; kilobytes to tens of MB. -> A.
- M2 DRAM: bit = tiny capacitor (bucket of charge) + transistor (tap); dense, cheap; charge leaks so rows rewritten many times a second (refresh). Can't read one bucket directly: copy a whole row (thousands of bits) into row buffer (strip of sensing circuits), pick out bytes, write row back, close before next row opens; each step ~10-15 ns. Plus trip through caches and memory controller (part of CPU chip that talks to DRAM, queues, opens/closes rows, schedules refresh) -> ~100 ns. -> A; B asks "why can't it just read the one bit?"
- M3 NAND flash: traps electrons, keeps data without power; read = apply series of test voltages to a whole page (several KB), sense which cells conduct; tens of us; most of why SSD is 1,000x slower than RAM. Writing slower, erase only in big blocks; controller is a small computer inside juggling where things go. -> A.
- M4 Spinning disks: 7,200 rpm, one turn per 8.3 ms, average wait ~4 ms for rotation plus arm swing; the "disk seek ~10 ms" that made 2000s engineers allergic to random reads. -> A, short.
- F3 Figure 003: DRAM grid, one row highlighted -> row buffer -> 64 B out; open row ~15 ns, read cols ~15 ns, close row ~15 ns; 1 transistor + 1 capacitor per bit. Flash: page 4-16 KB sensed ~25-100 us into page buffer, transfer a few us over PCIe, 4 KB out. Charge stays without power. -> A describes the two halves.
- C1 History: 80s-90s CPUs got faster ~half again every year; DRAM bigger but latency barely improved; mid-90s "memory wall" (Wulf and McKee, 1995): CPU could do hundreds of ops in one RAM fetch. Fix: small fast SRAM caches between core and RAM, in levels L1, L2, L3. -> A.
- C2 Locality: reuse recent data (temporal), use data next to what you used (spatial); loop reuses variables; array walk touches neighbours. -> A.
- C3 Desk/bookshelf/library: desk = L1, shelf = L2/L3, library across town = RAM; bring back the whole chapter. -> A, brief (exact one-point comparison).
- C4 Cache line: fixed chunk between RAM and caches; 64 bytes on most chips, 128 on Apple Silicon. Prefetcher: hardware that watches the pattern and fetches next lines before you ask; great for sequential/strided, useless for random. -> A.
- C5 Working set: data a program touches over a short window; fits in a level -> runs at that level's speed; fits L1 -> top rung; 10 GB scattered lookups -> RAM rung no matter how clever. Idea behind the NumPy lesson. -> A; B relates to his ranker lookups.
- B1 Latency vs bandwidth: latency = how long until data starts arriving (first byte); bandwidth = bytes per second once flowing (also throughput). Mixing them is the most common mistake. Latency = length of pipe; bandwidth = width. -> A; B voices conflated model.
- B2 Highway: latency = drive time; bandwidth = lanes; more lanes don't get one car there faster; long-wide and short-narrow can deliver same cars per hour with very different waits for the first car. -> A, brief.
- F4 Figure 004 two pipes: RAM short and wide (~100 ns long, hundreds of GB/s wide); Europe long and thin (~150 ms long, ~60 MB/s home internet). Time = latency + size / bandwidth. -> A describes.
- B3 Formula in words: time to move a chunk is the wait plus size divided by bandwidth. Small size: latency dominates. Big size: bandwidth dominates. Crossover = latency times bandwidth; below it waiting, above it pumping. -> A in words with example.
- PR3 Predict 16gb: Spark spec ~273 GB/s; 16 GB (8B model in bf16) once: ~59 ms; latency irrelevant. 1 Gb/s home network: 1 billion bits = 125 million bytes/s; 16 GB / 0.125 = 128 s, over two minutes; ~2,000x longer; latency irrelevant. 59 ms is heart of lesson 5: one token needs every weight read once; 1 / 0.059 ~ 17 tokens/s ceiling set by bandwidth before any code. -> A asks; B forgets bits vs bytes; A catches; also re-explain bf16 = two bytes per weight (his gap).
- F5 Figure 005 interactive: drag size, five pipes (Spark RAM 100 ns/273 GB/s; NVMe 80 us/7 GB/s; datacenter 200 us/100 Gb/s; home LAN 0.5 ms/1 Gb/s; internet to Europe 150 ms/500 Mb/s); bars hatched (waiting) vs solid (flowing); "evens out at". Best case, rounded. -> A describes dragging the slider.
- B4 64 B line from RAM almost all waiting; 4 KB from SSD too; 16 GB from RAM all flowing; Europe waiting-dominated below ~10 MB -> chatty APIs feel slow across oceans, one big download fine. -> A, with B's "faster internet" model corrected.
- B5 Bandwidth numbers: one core reading RAM ~10-100 GB/s (can't keep enough requests in flight); Mac unified ~100-120 GB/s base, up to ~400-550 Max (spec, check chip); Spark LPDDR5x ~273 GB/s (256-bit bus x 8,533 million transfers/s / 8); H100 HBM ~3,350 GB/s (why big GPUs decode faster); NVMe sequential ~3-7 GB/s PCIe 4, ~10-14 PCIe 5 (only big reads or many in flight); 100 Gb/s datacenter ~12.5 GB/s; 1 Gb/s Ethernet ~125 MB/s; home internet ~10-125 MB/s. Spec-sheet peaks you won't quite hit. -> A gives as a spoken short list with comparisons, not a table read row by row.
- B6 Trap: network in bits, storage/memory in bytes; divide by 8. -> A; tied to B's slip.
- Q1 Bytes in flight: NVMe several GB/s but one random 4 KB read ~80 us; one at a time = 4 KB per 80 us ~50 MB/s ~1% of drive. Drive not slow; you leave it idle. -> A; B asks "so the SSD's slow?"
- Q2 Little's law: items in flight = arrival rate x time inside; for storage/network bytes in flight = bandwidth x latency. SSD: 7 GB/s x 80 us ~ 560 KB ~ 140 reads of 4 KB at once. RAM: 273 GB/s x 100 ns ~ 27 KB ~ 430 cache lines of 64 B. -> A in words with both examples.
- Q3 One core tracks only a few dozen outstanding misses -> can't reach 273 GB/s; GPU with thousands of threads gets much closer. -> A; B had assumed one core uses it all.
- Q4 Queue depth: how many I/O requests waiting at the device at once; QD1 = one at a time; fast SSDs need QD 32+ for rated speed. IOPS: I/O operations per second, usually quoted at high queue depth. -> A.
- Q5 Getting many in flight from one program = don't wait for each before starting the next = concurrency; Waiting vs working lesson. -> A, one line.

## Build It

- K0 Folder ~/workbench/latency (said as "a folder for it"), predictions into Measure table first. -> A one sentence.
- K1 Task 1 (ok): find cache sizes; Mac sysctl (brand string, cache line size, page size, L1d/L2 per performance/efficiency cores); Spark lscpu, lscpu -C, getconf PAGESIZE, two core types (higher MHz = big). Write down L1d, L2, L3 or Apple system-level cache (may not show, look up chip), line size, page size. Apple: 128-byte line, 16 KB pages; Spark 64-byte lines. Where staircase steps land. -> A one-two sentences, names sysctl and lscpu.
- K2 Task 2: Python rungs via timeit (runs millions of times, best per-loop): function call, dict lookup, x+1 as the floor; subtract. Then chase_py: list forming one random cycle, time i = nxt[i] for 1,000 and 10,000,000; warm-up pass; few million steps. Small list: tens of ns per step, not one; interpreter work bigger than L1/L2; big list slower, but steps smeared -> real measurement in C. -> A.
- K3 Task 3: pointer chasing in C: each slot holds index of next, random order; each load depends on previous so CPU can't overlap; random defeats prefetcher; time per step = pure latency. Harness: sizes 4 KB to 1 GB doubling, 20 million steps, warm-up, prints ns/load. His two TODOs: make the cycle, follow it. Hints: Sattolo's algorithm (Fisher-Yates with one character changed) -> single cycle; plain Fisher-Yates gives small cycles that fit in L1. Random numbers up to 128 million (rand fine, xorshift nicer). Print end or compiler deletes loop. Pin on Spark with taskset to a big core; macOS can't pin. Smoother: step by 1.41. Save outputs per machine. -> A explains idea, B asks why random cycle matters, A gives Sattolo story.
- K4 Task 4: bw.c: two 1 GB buffers, touch every byte so OS really gives memory (virtual memory lesson), time 10 memcpys; report bytes copied/s and traffic (read + write = 2x). Print a byte so it isn't optimised away. One core vs spec; stretch with 4-8 threads, total climbs then flattens. -> A.
- K5 Task 5: Spark GPU: two 4 GB uint8 tensors on GPU, warm-up copy, time 20 copies, synchronize before start and stop (GPU calls return immediately, else timing nothing); traffic = 2 x bytes x 20 / seconds. 10,000 launches of tiny add on 1-element tensor, one synchronize, divide. First vs 273 = real ceiling for lesson 5; second = why thousands of tiny kernels per token are slow when GPU idle. -> A; B asks about synchronize.
- K6 Task 6: SSD random vs sequential without page cache (OS's copy of recently read file data in spare RAM; second read never touches disk). macOS: F_NOCACHE via fcntl, plus sudo purge after making the file. Linux: O_DIRECT, skips cache; buffer, offset, size aligned to block (4 KB safe); anonymous mmap page-aligned buffer. 4 GB file of random bytes (boilerplate). disk.py: 2,000 random 4 KB-aligned reads, each timed, median and p99; sequential in 1 MB chunks, GB/s. Python fine here: ~1 us overhead per call vs tens of us SSD; knowing when overhead matters is the skill. -> A; B challenges "why is Python fine here but not for caches?"
- K7 Task 7: fio cross-check; QD1 (psync) vs QD32 (libaio; macOS posixaio); compare IOPS and latency percentiles; if direct refused on macOS, purge and drop flag. -> A short.
- K8 Task 8: network: ping localhost (never leaves machine); tailscale ping home server (says direct or relay); ping its address; far regions via curl to S3 endpoints in Frankfurt and Sydney, connect time minus DNS ~ one round trip. Python TCP echo pair, 1 byte, 10,000 times on localhost, median; difference from ping = Python + socket API. Relay (DERP) makes round trip much longer than distance suggests; Tailscale lesson. -> A.
- K9 Task 9: agent writes matplotlib: both machines, log-log, dashed lines at cache sizes. -> A one sentence.
- K10 Done when: clear staircase on both, name each step; every Measure row filled or n/a with reason; can say from memory measured RAM latency, SSD random latency, how far below 273 the GPU copy landed. -> A, in passing at end of Measure.

## Measure

- E1 Table: guess in brackets first, then real; textbook column a guide not a target; human-scale column. Textbook: L1 ~1 ns; L2 ~3-6; L3/SLC ~10-40; DRAM ~80-150; Python call ~30-100; dict ~15-50; RAM copy one core ~10-100 GB/s; GPU copy up to 273; GPU launch ~2-10 us; SSD 4 KB median ~20-150 us; p99 a few x median; SSD sequential ~2-7 GB/s; ping localhost ~10-100 us; Python echo ~20-100 us; home server over Tailscale ~1-5 ms LAN, 10-50 ms far/relayed; far region ~50-300 ms. -> A, folded into the expectation walkthrough (not read as a table).
- PR4 Predict staircase: flat ~1 ns while fits L1 (~128 KB Apple performance core, ~64 KB Spark big cores); step to a few ns until outgrows L2 (Apple shared large L2 ~12-16 MB per performance cluster; Spark smaller private L2 + shared L3); on Apple a short shelf tens of ns for system-level cache shared with GPU; climb to ~100 ns+ beyond any cache, slow rise beyond = TLB. Ramps gradual not cliffs (imperfect eviction, some still hits). Flat everywhere = something wrong (Break It). -> A asks B where the jumps will be; B guesses; A walks it.
- F6 Figure 006: log-log, ns per load vs array size 4 KB to 1 GB; plateaus L1 ~1 ns, L2, L3, DRAM ~100 ns + TLB misses rising; dashed lines at cache sizes. Illustrative. -> A describes shape.
- E2 Staircase meaning: plateau heights = latencies; ramp positions = sizes; measured a cache with a stopwatch. Far right keeps rising: TLB (small cache of recent virtual-to-physical translations; miss = walk page tables, themselves in memory). Apple 16 KB pages cover 4x per entry, may suffer later. -> A; B asks what TLB is.
- E3 Python call and dict: tens of ns, roughly an L3 hit, a third to a half of a RAM read; tight Python loop slow in units of a cache miss; interpreter usually first bottleneck, not memory; Python-speed lesson. -> A.
- E4 Bandwidth: one core well under spec, often 2-5x; bytes in flight. GPU copy on Spark much closer to 273 but not reaching; ~70-90% of peak typical, your number counts; divide 16 GB by it -> better tokens/s ceiling. -> A.
- E5 SSD: random median tens of us, maybe ~100; p99 several times higher (controller housekeeping); sequential GB/s; sequential/4 KB vs 1/random latency: gap 20-100x = queue depth story; fio QD32 closes much of it. -> A.
- E6 Network: localhost ping tens of us, Python echo a bit more; home server on same Wi-Fi a few ms (Wi-Fi jitter); far regions = light-in-fiber prediction + 30-60%; Frankfurt from West Coast ~150 ms, Sydney ~150-200 ms; round trips; compute the floor from distance. -> A.

## Break It

- X1 Independent loads: walk in order, or NumPy gather with big random index array; DRAM runs drop to a few ns per element instead of 100; RAM unchanged; prefetcher / addresses known up front -> many misses overlapped; measuring bandwidth not latency; any "RAM is 2 ns" benchmark made this mistake. -> "what if" exchange; B thinks RAM got faster.
- X2 Forget page cache: second run reports SSD reads of a microsecond or two = reading RAM. Sneakier: truncate to make a 4 GB file of holes; filesystem hands back zeros without touching the drive. Both = dream SSD. Files-and-disks lesson. -> exchange.
- X3 Compiler wins: remove end from printf, -O2, 0.00 ns per load; loop deleted; results must be observable. -> exchange.
- X4 Time one thing: one dict lookup between two perf_counter_ns calls: several times larger than timeit, noisy; timer costs more than the thing; measure many and divide; time an empty region. -> exchange.

## Explain It Back (substance must appear)

- EB1 L1 ~1 ns, RAM ~100 ns (100x), SSD ~50-100 us (~1,000x more), Europe ~150 ms (couple thousand more); human scale: couple of minutes, most of a day, five years; ordering and ratios hold. -> B's closing restatement uses this; also covered in Idea.
- EB2 Latency vs bandwidth, time = latency + size/bandwidth; chatty API across ocean latency-bound, faster plan does nothing (150 ms waiting each call); 16 GB model read bandwidth-bound, lower latency changes nothing (100 ns vs 59 ms). -> In B4/B3 conversation.
- EB3 Feature store: 50,000 lookups/s, random 1 KB records, 2 TB. SSD 80 us -> one at a time ~12,500/s, one blocking thread can't keep up; NVMe does hundreds of thousands/s with enough in flight; Little: 50,000 x 80 us = 4 outstanding, easy; issue concurrently (async or thread pool); headroom for p99, maybe two drives or plan for 10-20 in flight. RAM 1,000x faster per lookup but 2 TB doesn't fit: 128 GB per box -> ~16 machines, more with replicas. Design: SSD bulk, hot keys cached in RAM. 10 chained dependent lookups: SSD ~1 ms per request, RAM ~1 us; chain length decides latency acceptability, separate from throughput. -> A poses it as the "scale" scenario tying back to his ranker; B works it with A.
- EB4 Why caches, why small: RAM 100 ns, core does hundreds of ops meanwhile; locality; small because SRAM ~6 transistors/bit takes area and bigger is inherently slower (wires, decoding). -> Covered in W5/M1/C1-C2.
- EB5 Spark tokens/s: 8B x 2 bytes = 16 GB; /273 = 59 ms -> ~17 tok/s ceiling, less in practice; from SSD ~7 GB/s: 16/7 ~ 2.3 s per token, under half a token per second; ~40x slower purely from the pipe. -> A asks B as a follow-up after PR3.
- EB6 Why no 20 ms CA-Europe: fiber ~200,000 km/s = 20 cm/ns; 8,800 km, round trip 17,600 km, >= ~90 ms straight; real 140-150 ms; only fix is not making the trip: copy service/data closer. -> In W3/W4, B asks "can't you pay for a faster line?"

## Go Deeper / Connections

- G1 Best sources: Norvig's essay (original table, short), Drepper's What Every Programmer Should Know About Memory (DRAM and caches sections, pointer-chasing graphs), Gregg's Systems Performance ch 2. Others (Dean LADIS 2009 keynote, Colin Scott interactive page, Hennessy and Patterson, Wulf and McKee, Chips and Cheese) optional. -> One closing sentence naming one or two.
- N1 Connections: stack-and-heap (what each location costs), waiting-vs-working (bytes in flight), bandwidth-bound (17 tok/s with measured bandwidth), baseline-vs-fireworks (TTFT latency vs tokens/s throughput), back-of-envelope (feature store done at length). -> Folded in where natural; not a list.

## Flow

1. Cold open: SSD vs RAM question, B says ten times; reveal; the ranker lookup scene; Europe predict.
2. Origin: Norvig, Dean, thumbnails.
3. Units; the ladder (figure 001) with jumps; human scale predict and extras (GPU launch, model read).
4. Far and big: light floors, three trips, Europe can't be bought; nested boxes.
5. What memories are made of: SRAM, DRAM row buffer, flash, spinning disks (figure 003).
6. Caches: memory wall, locality, desk, cache line, prefetcher, working set.
7. Latency vs bandwidth: pipe, highway, formula, 16 GB predict with bits/bytes slip, SSD-streaming follow-up, slider figure, bandwidth list.
8. Bytes in flight: 1% SSD, Little's law, one core limit, queue depth, IOPS; feature store back-of-envelope.
9. Build It walk-through, tasks 1-9.
10. Measure: staircase predict, figure, TLB, Python, bandwidth, SSD, network; done-when.
11. Break It four exchanges.
12. Close: one line sources/connections, B restates, A sharpens.
