# Coverage: latency-numbers

Lesson src/lessons/latency-numbers.mdx vs podcast/scripts/latency-numbers.md. Item IDs match
podcast/outlines/latency-numbers.md. "Fixed" = was MISSING or thin in the first draft and was added.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs / two evenings | Build It | "It's about two evenings. One for the reading and the C benchmark" | covered |
| P1 SSD vs RAM, 10x guess vs 1,000x | Problem | B: "ten times? Maybe?" / "closer to a thousand" | covered |
| P2 ranker lookup scene, 50M docs, 200 lookups | Problem | "fifty million documents... two hundred lookups" | covered |
| P3 20 us vs 20 ms, 50 req/s per thread | Problem | "Fifty a second, per thread that's sitting there waiting" | covered |
| P4 every scale question has this shape | Problem | "how many times you touch slow things" | covered |
| PR1 predict: 100 ns, 50-100 us, 500-1,000x, Europe 150 ms ~2,000x, million-fold, factor of 3 | Problem | "About two thousand... roughly, a million-fold" | covered |
| O1 Norvig 2001 essay and table | Origin | "Teach Yourself Programming in Ten Years" | covered |
| O2 Dean slide, count and multiply | Origin | "Numbers Everyone Should Know" | covered |
| O3 30 thumbnails, 300 ms vs under 20 ms | Origin | "the seeks alone cost about three hundred milliseconds" | covered |
| O4 copied, values drifted, shape stayed | Origin | "But the shape has barely moved" | covered |
| U1 ns / us / ms, 4 ticks per ns, blink, 1,000x = second vs quarter hour | Units | "between one second and a quarter of an hour" | covered |
| F1 ladder figure, rungs, code vs hardware bars | Ladder | "Some bars are hardware, and some are things your own code does" | covered (rungs walked, not read as rows; honest-range tap omitted) |
| L1 jumps 100x / 1,000x / 2,000x | Ladder | "From L one to RAM is about a hundred times" | covered |
| L2 approximate; order and ratios hold | Ladder | "What doesn't change... is the order, and the rough ratios" | covered |
| H1 human scale, Gregg | Human scale | "a trick Brendan Gregg uses" | covered |
| PR2 1.7 min, 22 h, 2 days, 4.8 years, 16 years; argument for async | Human scale | "About twenty-two hours. Most of a day." | covered |
| H2 Python call a minute, GPU launch over an hour, model read two years per token | Human scale | "A GPU kernel launch is over an hour" | covered |
| W1 far or big | Far and big | "It's far away, or it's big" | covered |
| W2 light 30 / 20 cm per ns, 7.5 cm per tick | Far and big | "light covers seven and a half centimeters" | covered |
| W3 three trips, light vs actual | Far and big | "California to Amsterdam is about eight thousand eight hundred kilometers" | covered |
| W4 Europe floor ~90 ms, datacenter cost is NICs/switches/OS, RAM light rounding error | Far and big | "for the datacenter, light's a rounding error" | covered |
| W5 big: wires, decoding, cheap bits, miss every cache | Far and big | "Small things can be fast. And fast things have to be small." | covered |
| F2 nested boxes figure | Far and big | "it'd be boxes inside boxes" | covered |
| M1 SRAM six transistors | Memories | "a little loop of about six transistors" | covered |
| M2 DRAM capacitor, refresh, row buffer, 10-15 ns steps, memory controller, ~100 ns | Memories | "copies an entire row, thousands of bits, into what's called the row buffer" | covered |
| M3 NAND flash, test voltages, page, tens of us, controller | Memories | "applies a series of test voltages to a whole page of cells" | covered |
| M4 spinning disk 7,200 rpm, 8.3 ms, ~4 ms, seek 10 ms | Memories | "turns once every eight point three milliseconds" | covered |
| F3 DRAM vs flash figure | Memories | "On the D RAM side you've got a grid of cells" | covered |
| C1 memory wall, Wulf and McKee 1995, cache levels | Caches | "Wulf and McKee, named it in a little paper in nineteen ninety-five" | covered |
| C2 locality | Caches | "That habit has a name, locality" | covered |
| C3 desk / shelf / library | Caches | "a desk, a bookshelf, and a library across town" | covered |
| C4 cache line 64 / 128, prefetcher | Caches | "Sixty-four bytes on most chips, a hundred and twenty-eight on Apple Silicon" | covered |
| C5 working set, NumPy | Caches | "you live on the RAM rung, no matter how clever your code is" | covered |
| B1 latency vs bandwidth, pipe length/width, throughput | Latency and bandwidth | B: "A gigabit connection is fast, so it's low latency, right?" | covered |
| B2 highway | Latency and bandwidth | "Adding lanes doesn't get any single car there faster" | covered |
| F4 two pipes, RAM short fat, Europe long thin ~60 MB/s | Latency and bandwidth | "RAM's a short, fat pipe" | covered |
| B3 time = latency + size / bandwidth; crossover latency x bandwidth | Latency and bandwidth | "the wait, plus the size divided by the bandwidth" | covered |
| PR3 59 ms, bits vs bytes, 128 s, ~2,000x, 17 tok/s | Predict, sixteen gigabytes | B: "sixteen seconds?" A: "That's the trap" | covered |
| bf16 = two bytes per weight (diagnostic gap) | Predict, sixteen gigabytes | "B F sixteen is sixteen bits per weight, so two bytes" | covered |
| EB5 SSD streaming 2.3 s/token, ~40x | Predict, sixteen gigabytes | "about two point three seconds per token" | covered |
| F5 slider figure, five pipes, hatched vs solid | Waiting vs flowing | "a hatched part, which is waiting, and a solid part" | covered |
| B4 64 B and 4 KB waiting, 16 GB flowing, Europe < ~10 MB, chatty APIs | Waiting vs flowing | "a chatty API, lots of small calls, feels terrible" | covered |
| EB2 faster plan does nothing; lower latency does nothing for 16 GB | Waiting vs flowing | "a faster internet plan does nothing" | covered |
| B5 bandwidth list (core, Mac, Spark derivation, H100, NVMe PCIe 4/5, 100 Gb, 1 Gb, home) | Waiting vs flowing | "A two hundred fifty-six bit wide bus" | covered |
| B6 bits vs bytes, divide by 8 | Waiting vs flowing | "All the network ones, divide by eight" | covered |
| Q1 QD1 SSD ~50 MB/s, ~1% | Bytes in flight | "That's about one percent of what it can do" | covered |
| Q2 Little's law, 560 KB / 140 reads, 27 KB / 430 lines | Bytes in flight | "about a hundred forty reads of four kilobytes" | covered |
| Q3 one core few dozen misses, GPU closer | Bytes in flight | "can only keep track of a few dozen outstanding cache misses" | covered |
| Q4 queue depth, QD 32, IOPS at high QD | Bytes in flight | "Fast SSDs need a queue depth of thirty-two or more" | covered |
| Q5 concurrency, waiting-vs-working | Bytes in flight | "That's concurrency" | covered |
| EB3 feature store: 12,500/s, 4 in flight, headroom, 16 machines, hot keys in RAM, 10-chain 1 ms vs 1 us | Feature store | "Fifty thousand times eighty millionths... four?" | covered |
| EB4 why caches, why small | Far and big; Memories; Caches | "it takes a lot of chip area per bit" | covered |
| EB6 no 20 ms to Europe, 200,000 km/s, 17,600 km, move closer | Far and big | B: "can't you just pay for a better line?" | covered |
| K0 folder, guesses first | Build It | "before you run anything, you write your guesses down" | covered |
| K1 sysctl / lscpu, sizes, 128 B / 16 KB / 64 B, SLC | Build It | "a hundred twenty-eight byte cache line and sixteen kilobyte pages" | covered |
| K2 timeit floor; Python chase, warm-up, tens of ns, smeared | Build It | "the small list costs tens of nanoseconds per hop" | fixed (warm-up, step count) |
| K3 pointer chasing, Sattolo, harness, rand/xorshift, print end, task set, 1.41 step | Pointer chasing in C | "Fisher-Yates with literally one character changed" | covered |
| K4 bw.c, touch first, traffic 2x, print a byte, threads stretch | Bandwidth, GPU, disk, network | "print one byte from the destination at the end" | fixed (print a byte) |
| K5 GPU copy, synchronize, launch cost | Bandwidth, GPU, disk, network | "GPU calls come back immediately and run in the background" | covered |
| K6 page cache, F_NOCACHE + purge, O_DIRECT alignment, mmap, 2,000 reads median/p99, sequential, Python fine | Bandwidth, GPU, disk, network | "knowing when overhead matters, and when it doesn't" | covered |
| K7 fio QD1 vs QD32, macOS engine / purge | Bandwidth, GPU, disk, network | "Once with one read at a time, once with thirty-two in flight" | fixed (macOS note) |
| K8 ping, tailscale ping, curl connect minus DNS, echo pair, DERP relay | Bandwidth, GPU, disk, network | "which it calls DERP servers" | covered |
| K9 plot | Bandwidth, GPU, disk, network | "have an agent write a little plotting script" | covered |
| K10 done-when | Measure | "you're done when the chase program prints a clear staircase" | covered |
| E1 table: guess first, textbook guide, human-scale column | Measure | "Your guess goes in first, then the real number" | fixed |
| PR4 staircase predict: L1 128 / 64 KB, L2 12-16 MB shared vs private + L3, SLC shelf, ~100 ns, ramps not cliffs, flat = wrong | Measure | "Ramps, not cliffs" | covered |
| F6 staircase figure | Measure | "A flat line at one, a ramp, a flat line at a few" | covered |
| E2 heights = latency, ramps = size; TLB; 16 KB pages | Measure | "That's the TLB running out" | covered |
| E3 Python tens of ns, interpreter first bottleneck | Measure | "the interpreter's usually the first bottleneck, not memory" | covered |
| E4 one core 2-5x under spec; GPU 70-90%; divide 16 GB | Measure | "Somewhere around seventy to ninety percent of peak" | covered |
| E5 SSD median, p99 housekeeping, sequential, 20-100x gap, fio closes | Measure | "The gap's usually twenty to a hundred times" | covered |
| E6 network: localhost, Tailscale 1-5 ms / 10-50, +30-60%, Frankfurt ~150, Sydney 150-200 | Measure | "plus thirty to sixty percent" | covered |
| X1 independent loads / NumPy gather | Break It | B: "So RAM got faster?" | covered |
| X2 page cache; truncate holes | Break It | "The file's all holes" | covered |
| X3 compiler deletes loop | Break It | "zero point zero zero nanoseconds per load" | covered |
| X4 timing one thing | Break It | "the timer call itself costs more than the thing you're timing" | covered |
| G1 sources | Close | "Norvig's essay is short and still right, and Ulrich Drepper's" | covered |
| N1 connections (async, 17 tok/s, Fireworks TTFT vs throughput) | Close | "time to first token is the latency" | fixed (Fireworks line) |

Numbers checked against the lesson. Derived for speech, not written in the lesson: a 1 GB sequential
SSD read at 7 GB/s taking "about a seventh of a second" (worked example of the formula), and the coffee
shop illustration of Little's law (two a minute, five minutes each, ten inside), borrowed from the
waiting-vs-working lesson. "More than ten times as wide" (H100 vs Spark) is 3,350 / 273.
