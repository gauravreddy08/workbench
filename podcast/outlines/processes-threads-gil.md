# Outline: processes-threads-gil

Source: src/lessons/processes-threads-gil.mdx. Curriculum entry: "Processes, threads and the GIL."
Question: what is the difference between a process and a thread, and why does Python have a lock
that ruins threads? Why: picking threads vs processes wrong makes a data loader or server 8x slower,
silently.

Diagnostic gap this lesson aims at (CLAUDE.md): "OS basics: process vs thread, GIL: blank." B voices
the natural wrong models: threads = "more workers, so more speed"; the GIL protects my code; a
process is the same as a program; a thread waiting still burns CPU; processes are always the safe
fast choice.

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereq: address space picture from stack-and-heap (code, globals, heap, stack; every Python object on the heap with a header). -> A re-explains in two sentences when the address space first comes up, and again (header + refcount) at "why the GIL exists".
- T2 Prereq: latency numbers (RAM read ~100 ns, network round trip tens of ms). -> A re-anchors when context-switch costs come up.
- Today bullets skipped as a list; each is an item below.

## The Problem

- P1 Preprocessing script: 2 million query-document pairs, clean text, hash each to dedupe before training the cross-encoder; 40 minutes. Spark has 20 cores; htop shows one at 100%, nineteen idle. -> A opens the episode on this scene.
- P2 Wrap in ThreadPoolExecutor with 20 workers: 41 minutes. -> A; B's wrong model: "twenty workers, twenty times faster", surprised.
- P3 ProcessPoolExecutor with 20 workers: 3 minutes. Same function, same data, one word changed. -> A.
- P4 Same thread pool fetching 5,000 web pages: 40 minutes to 2. Threads useless for one, magic for the other. -> A; B says "so threads are broken", A says no.
- P5 Stakes of guessing wrong: DataLoader starving the GPU, server falling over at 50 users, script that deadlocks once a week. -> A, one breath.
- P6 Three layers: what the OS gives you (processes, threads), how it shares cores (scheduler), one decision CPython made in the early 1990s (the GIL). -> A signposts.

## Origin

- O1 Early computers ran one job at a time; while waiting on a tape drive, the CPU (most expensive thing in the building) sat idle. -> A tells as a story.
- O2 Time-sharing: CTSS at MIT (1961), then Multics and Unix; several programs loaded, switching many times a second, each fenced in its own memory: a process. -> A.
- O3 Threads came in the 1980s and 90s (Mach, then POSIX threads standardised in 1995): several flows of control inside one program sharing memory cheaply; e.g. server with many clients, GUI staying responsive. -> A.
- O4 Python added threads in the early 90s and put one big lock around the whole interpreter to keep it simple and safe: the GIL, still talked about thirty years later. -> A, ends the story.

## The Idea: program vs process

- I1 Program = file on disk (machine code; for Python, the interpreter binary plus your .py files). Inert. -> A; B's wrong model "isn't a process just a program?"
- I2 Kernel = core of the OS, the one program that talks to hardware and decides who gets CPU and memory. -> A, inline.
- I3 Running python3 train.py: the kernel creates a process = running instance plus everything the OS tracks: own memory, open files, an ID, at least one thread. Two terminals = two processes from one program. -> A.
- I4 Kitchen analogy: process = kitchen (walls, own pantry, equipment); thread = cook; kitchen needs at least one cook; cooks in one kitchen share pantry and counters: fast (no walking to another building) and dangerous (two cooks grab the same bowl). -> A, set up once, used throughout.
- F1 Figure 001: one program on disk, two processes (PIDs 4121 and 4188), each with its own address space, open files, threads box (T1 main, user, cwd, env); a wall between them, no shared memory. -> A describes as a sketch over the phone.
- I5 PID: a number the kernel hands out so you, kill, ps, top can name a process. -> A.
- I6 Own address space: same address in two processes points to different physical RAM, because the kernel and the MMU translate addresses through a per-process table. That's the wall: a crash in one Python script doesn't take down your browser. -> A; B asks "same address, different memory?" genuinely.
- I7 MMU = hardware in the CPU translating the addresses a program uses (virtual) to real RAM locations via a per-process table the kernel sets up. -> A, inline.
- I8 Open files: each file, socket, pipe gets a small integer, a file descriptor; 0, 1, 2 are stdin, stdout, stderr; the table belongs to the process. -> A.
- I9 At least one thread: the kernel doesn't run processes, it runs threads; process with zero threads = reserved room nobody cooks in. -> A, punchline.

## The Idea: what a thread owns and shares

- I10 Thread = one sequence of instructions being executed, own position in the code, own stack; lives in a process, shares its memory. -> A.
- I11 Three private things: instruction pointer (program counter, "you are here"), registers (a few dozen tiny fast slots on ARM64), a stack (chain of calls and locals) with a stack pointer marking its top. -> A, as a short list in speech.
- I12 Everything else shared: code, globals, heap, open files. -> A.
- F2 Figure 002: one address space; three thread stacks at the top (private, one per thread), unused gap, then heap ("every Python object"), globals, code (shared by all). Side boxes T1 running, T2 waiting on socket, T3 ready; shared open files (data.csv, a socket). Every Python object on the shared heap, so every thread can reach every object. -> A describes.
- I13 Threads cheap to create (a stack and a small kernel record, not a whole address space); starting a Python thread on an M-series Mac ~40 microseconds; share data with zero copying (same object on same heap). -> A, with a comparison (40 microseconds vs process startup tens of ms later).
- I14 Threads can trample each other: two threads read and write the same object at the same moment with nothing to stop them. -> A, foreshadow.
- I15 Processes the mirror image: expensive to create, expensive to talk between (copy across the wall), safe by default. -> A; B summarises the trade-off.

## The Idea: scheduler

- I16 Mac has ~8-16 cores; ps on a quiet laptop shows hundreds of processes and thousands of threads. How do thousands of cooks share a dozen stoves? Taking turns, very fast. -> A; B "how is that possible".
- I17 Scheduler = part of the kernel deciding, many times a second, which ready thread runs on which core next and for how long. -> A.
- I18 Three states: running (on a core now), ready (could run, waiting for a core), blocked/waiting (until bytes arrive, disk read finishes, timer fires); a blocked thread uses no CPU. -> A; B's wrong model "a waiting thread is still spinning", A corrects.
- I19 Time slice of a few milliseconds (varies by OS, version, load). -> A.
- I20 Context switch: when slice runs out or thread blocks, kernel saves outgoing registers, IP, SP to memory, loads incoming, jumps. Cook leaves a note saying exactly where they were. -> A.
- I21 Costs (rough, vary): thread to thread same process ~1-5 microseconds (save/load registers, run scheduler, memory map stays); process to process a few microseconds direct, more in effect (switch address-translation tables, TLB entries thrown out, caches full of someone else's data). -> A in words, no table.
- I22 TLB = small CPU cache of recent virtual-to-physical translations; switching processes can invalidate it. -> A inline.
- I23 Scale: a few microseconds = thousands of RAM reads, tiny next to a 5 ms slice or 50 ms network round trip. Thousands per second fine; hundreds of thousands per second eat a core. -> A, with comparison.

## The Idea: concurrency vs parallelism

- I24 Concurrency = several tasks in progress over the same period (structure); one cook juggling three dishes; possible on one core. -> A.
- I25 Parallelism = several tasks running at the same instant (execution); three cooks at three stoves; needs more than one core. -> A.
- I26 Key insight: concurrency alone speeds up waiting; only parallelism speeds up working. -> A, stressed; B restates.
- I27 CPU-bound (counting primes, tokenizing, parsing JSON in pure Python; faster/extra core helps) vs I/O-bound (HTTP calls, DB queries, files on network drive; CPU mostly idle). -> A.

## The Idea: the GIL

- I28 GIL = Global Interpreter Lock: one lock in CPython a thread must hold to run Python bytecode; one holder per process at a time. -> A; B's wrong model "so it's like a lock that protects my variables?" deferred to I45.
- I29 Bytecode = simple instructions CPython compiles .py into (load a local, do a binary op, ...) and runs one by one in a loop. -> A inline.
- I30 Analogy: one kitchen, one recipe book, only the cook holding the book may cook; others can wait for the oven without the book; chopping or stirring = Python code needs the book. -> A.
- I31 Consequence: at most one thread runs Python code at any instant, regardless of threads or cores. Threads give concurrency, not parallelism for Python code. -> A; this explains P2.
- F3 Figure 003 interactive scheduler timeline: lanes T1-T4, solid = running Python, dashed = waiting on I/O (no core, no GIL), grey = ready but stuck. Default 4 threads, 4 cores, CPU, GIL on: done at 96 ticks, same as serial, cores busy 25%. GIL off: 24 ticks, 4x, 100%. I/O work: about 34 ticks vs serial 124, GIL barely matters. -> A describes what you'd see as you flip the toggles.
- I32 Takeaway 1: CPU + GIL on: wall time = serial; real CPython often a little worse (lock handoff cost). -> A.
- I33 Takeaway 2: CPU + GIL off: wall time divides by threads with enough cores; what processes give today and free-threading promises. -> A.
- I34 Takeaway 3: I/O either way: each thread computes briefly then waits, waits overlap; a dozen threads on a dozen sockets is concurrency; GIL barely matters. -> A.

## The Idea: when the GIL lets go

- I35 On a timer: since Python 3.2, a holder is asked to drop it after a switch interval of 5 ms if another thread wants it (getswitchinterval returns 0.005). Gives concurrency between CPU-bound threads: they share one core's worth of Python, fairly. -> A.
- I36 Around slow work not touching Python objects: C code in CPython and extensions releases it before long operations and retakes it after. This makes threads useful. -> A.
- I37 What releases it: blocking I/O (socket receive, requests get underneath, file reads/writes, subprocess waits); time.sleep; hashlib on inputs over about 2 KB, zlib; most heavy NumPy (large array math, BLAS matmuls) and PyTorch ops in C++ or on GPU. -> A lists in speech, grouped.
- F4 Figure 004: T1-T4 queue for one lock (GIL) to enter the CPython interpreter box (bytecode loop, refcounts on every object, memory allocator, dicts/lists/ints; one thread at a time); outside box "no GIL": socket, file, sleep, hashlib big input, numpy matmul/BLAS, torch C++ ops, CUDA kernels; runs in parallel with the GIL holder; T4 blocked in receive gave the lock back. -> A describes.
- Link back: explains P4 (web fetches) vs P2 (hashing in pure Python). -> B connects it.

## The Idea: why the GIL exists

- I38 Refcount: every object's header (from stack-and-heap) has a counter of references; assign, put in list, pass to function -> up; reference gone -> down; zero -> freed immediately. -> A re-explains the header briefly.
- I39 Touched constantly by every line; two threads doing count = count + 1 on a counter can lose one; lost decrement leaks forever; lost increment frees an object still in use -> reads garbage or crashes. -> A.
- I40 Two options: lock or atomic op on every refcount change (slows every program, including the vast majority with no threads), or one lock around the interpreter. Atomic operation = CPU instruction that reads and modifies memory as one indivisible step; safe but slower. -> A.
- I41 Guido van Rossum chose the big lock in the early 1990s when nearly every computer had one core. Side benefit: C extension authors could assume nobody else touching Python objects; NumPy among those that grew up on it. -> A; B "so it wasn't a mistake".
- I42 Gilectomy (Larry Hastings, around 2016): fine-grained locks, correct multithreaded Python, much slower single-threaded. Removing it is easy; without slowing everyone and breaking every C extension is hard. -> A.

## The Idea: free-threaded Python

- I43 PEP 703 (Sam Gross, accepted 2023), "Making the GIL Optional": biased reference counting (owning thread updates cheaply, others use slower atomics), immortal objects whose counts never change (None, small ints), per-object locks in lists and dicts. -> A, each trick in plain words.
- I44 Status as of late 2026, check docs: 3.13 (Oct 2024) experimental, separate binary python3.13t; 3.14 (Oct 2025, PEP 779) officially supported but optional, not default; normal python3 has a GIL; single-thread roughly 5-10% slower on free-threaded 3.14; C extensions must be rebuilt and marked safe, otherwise importing one can turn the GIL back on for the whole process; sys._is_gil_enabled tells you. -> A, with the "check the docs" hedge; B asks "so can I just use it?".
- I44b Build uses it as cleanest demonstration that the GIL, not threads, was the bottleneck. -> A, one line.

## The Idea: race conditions and locks

- I45 counter += 1 is three steps: read into a register (in Python, the interpreter's stack), add 1, write back. -> A.
- I46 A reads 41, B reads 41 before A writes, both compute 42, both write 42: two increments, one effect. Race condition = result depends on timing/interleaving; usually rare, so hard to catch. -> A walks it; B tries.
- F5 Figure 005 interactive: step Thread A and Thread B through read, add, write by hand; counter should be 2; any order where both read before either writes gives 1 (lost update); "play the bad order" button; lock on adds acquire/release and the other thread blocks; no order can lose. -> A describes what you'd see clicking.
- I47 Lock (mutex, mutual exclusion): only one holder; others trying block until released. with lock around read-add-write makes it a critical section (code that must not be run by two threads at once because it reads then writes shared state). Cost: threads wait there; keep critical sections short. -> A.
- I48 The GIL is not a lock for your code: protects the interpreter's insides, not your logic; can be handed over between your read and your write. -> A corrects B's earlier wrong model directly.
- I49 3.10 onward: interpreter only offers to switch at certain points (jump back to top of a loop), so bare counter += 1 in a tight loop almost never races on normal build: an accident of implementation, not a promise; disappears on free-threaded build. To see it reliably, put something that releases the GIL between read and write, like time.sleep(0). -> A.
- I50 Processes don't have this problem by default because they don't share memory. -> A, segue.

## The Idea: processes as the other way around the GIL

- I51 Each process has its own interpreter and own GIL; 8 workers = 8 interpreters on 8 cores, true parallel; multiprocessing and ProcessPoolExecutor. Price: the wall. -> A.
- F6 Figure 006: parent (interpreter + GIL, your data, pool.map over chunks) connected to workers 1-3 (own interpreter + GIL); in the middle, pickle -> pipe -> unpickle, "a copy, every call"; along the bottom, shared memory, same pages mapped into every process, no copy. -> A describes.
- I52 Pay twice: startup and communication. -> A signposts.
- I53 Start methods: fork (clone parent; well under a millisecond to tens of ms depending on parent size; child starts with copy of everything; cheap via copy-on-write = parent and child share physical pages, a page copied only when one writes). Catch: only the thread that called fork exists in the child; a lock held by another thread is inherited locked forever: deadlock. -> A; B's question about the lock.
- I54 spawn: fresh python imports your main module; safe, slow: bare pool on M-series Mac 60-90 ms to start in the author's test; importing torch at top costs every worker that too, often a second or more. -> A.
- I55 forkserver: one clean helper started early, workers forked from it; safe and fairly fast. -> A.
- I56 Defaults differ: macOS spawn since 3.8; Linux fork for decades; Python 3.14 changed Linux default to forkserver. Verify with get_start_method; check docs for your version. That's why the same script behaves differently on the Mac and the Spark. -> A.
- I57 Communication: every argument and return is pickled (Python's built-in object-to-bytes; cost proportional to size and complexity), written into a pipe (one-way kernel byte channel), read, unpickled. Two ints: nothing. A million-element list per task: can cost more than the work. -> A.
- I58 Shared memory: physical RAM mapped into several processes' address spaces; multiprocessing shared_memory, NumPy array backed by it, PyTorch share_memory_. Bytes in one place; back to sharing, so back to needing locks if anyone writes. -> A.

## The Idea: where this shows up in ML

- I59 DataLoader num_workers=8 uses processes; each runs your getitem (decode, tokenize, augment): CPU-bound Python the GIL would serialise. Batches come back as tensors in shared memory; only a small handle pickled. -> A; B's wrong model "I assumed num_workers were threads".
- I60 pin_memory=True: a thread in the main process copies batches into page-locked memory; fine because the copy is in C with GIL released. -> A.
- I61 Copy-on-access bite: under fork, workers share parent's dataset via copy-on-write, but merely reading a Python object changes its refcount, writing to the header, forcing the page copy; giant list of strings slowly copied into every worker; memory climbs with num_workers. NumPy arrays (one object, no per-item refcounts) avoid it. -> A; B "reading writes?".
- I62 Tokenizers warning ("process just got forked after parallelism has already been used, disabling parallelism to avoid deadlocks"): fork-with-threads problem; fast tokenizer has own Rust thread pool outside the GIL; DataLoader forks after it started; library disables parallelism in children. Set TOKENIZERS_PARALLELISM=false or avoid tokenizing in the parent before the fork. -> A; B recognises the warning.
- I63 Training loop fine with GIL: Python mostly launches work; CUDA launches are asynchronous, GPU runs kernels while Python queues the next; heavy CPU ops release GIL; one Python thread usually keeps a GPU busy. When it can't (many tiny kernels, per-launch overhead dominates) fixes are CUDA graphs and torch.compile, not more threads. -> A.

## Predict

- PR1 Primes below 2,000,000, pure Python, about 5 s on one core; 14-core Mac; 8 threads? 8 processes? Answer: threads about 5 s, maybe a hair more (GIL); processes about 1 s on the author's M-series Mac, 5x not 8x: some startup and pickling, mostly uneven split (bigger numbers take longer, chunk with biggest finishes last) and not all cores equally fast. -> A asks, B guesses (threads right now, processes "about 0.6 s, eight times"), A reveals.

## Build It

- B0 Folder, concurrent.futures throughout: same interface for threads and processes, only one class name changes. -> A, one sentence.
- B1 Task t0 setup: know your machine; M-series mix of performance and efficiency cores; Spark spec sheet lists 20 ARM cores (10 Cortex-X925 performance, 10 Cortex-A725 efficiency). cores.py prints logical cores, Python version, GIL enabled, start method, switch interval. macOS sysctl for perf vs efficiency counts; Spark nproc, lscpu. -> A, short.
- B2 Slow local HTTP server: every request sleeps 200 ms like a slow upstream; a thread per request; backlog raised to 256 (default 5, macOS resets connections past it). Leave it running. -> A, one or two sentences.
- B3 Task t1: pure-Python prime counter (trial division up to square root), split range into k contiguous chunks, time serial, 4 and 8 threads, 4 and 8 processes; prime count must be 148,933 every time; keep the main guard (spawn re-imports the file); write predictions first. -> A: what's built, the part that matters, what you'd see.
- B4 Task t2: 50 fetches of the slow server; serial, threads 8 and 50, processes 8 and 50; work out serial time and 8-thread rounds before running; plus measure a no-op ProcessPoolExecutor(8) = process startup tax. -> A; B does the arithmetic aloud.
- B5 Task t3: 8 threads each increment a global 1,000 times, right answer 8,000; unsafe (read into local, sleep(0), write back), safe (same inside with lock), plain (just += 1). sleep(0) releases the GIL, opening a window. Then plain with n = 1,000,000 on normal Python and on free-threaded build (uv python install 3.14t; check uv docs). Explain the difference out loud. -> A.
- B6 Task t4: watch live: sleep 30 at start of each worker, run 8 threads, find PID with pgrep. macOS ps -M lists threads (8 workers, main, maybe a few more). Linux: ps -T (each thread has own ID, SPID), count /proc task entries, top -H per-thread CPU, htop H toggles threads. Switch to processes and count processes with ps/pstree. During cpu.py with 8 threads, top shows ~100% total (one core); 8 processes = 8 each near 100%. Optional py-spy dump prints every thread's Python stack without stopping it (sudo on macOS): 7 threads parked in socket read, one doing something else. -> A, said as what you'd see.
- B7 Task t5: copy to Spark (scp over Tailscale), rerun; sweep process counts 1, 2, 4, 8, 12, 16, 20, print speedup; agent reviews for unfair timing (e.g. timing pool startup in some runs not others). -> A.
- B8 Done when: scripts run on both machines; predictions written before first runs; saw live thread count and can say where each came from; can explain every number. -> folded into A's Build wrap-up, one line.

## Measure

- M1 Time each config at least twice, keep the faster (first run pays one-off costs like page cache). -> A, one line.
- M2 Reference run, M-series MacBook (10 performance + 4 efficiency), 3.14 with GIL: primes serial 5.3 s, 4 threads 5.3, 8 threads 5.3, 4 procs 2.0, 8 procs 1.1; slow GETs serial 10.5 s, 8 threads 1.45 s, 8 procs 1.55 s. Yours will differ, shape should not. -> A says the numbers as a story, not a table.
- M3 Free-threaded 3.14 prime job: serial 4.8 s, 4 threads 1.7 s, 8 threads 1.0 s. Threads scale like processes once the GIL is gone. -> A; B notes serial is faster here (just state as lesson gives; don't invent reason).
- M4 Primes threads: no speedup; that's the GIL as in the timeline; top at ~100% = one core, same fact. -> A.
- M5 Primes processes: big but less than worker count; 4 procs gave 2.7x not 4x; main reason uneven chunks (trial division up to square root, chunk 1.5M-2M slower than 0-500k, pool waits for slowest); smaller: startup and pickling (tiny, two ints), efficiency cores slower. Spark: 10 to 20 processes adds efficiency cores, help less than first 10. -> A.
- M6 Slow GETs serial: 50 x 0.2 = 10 s plus a little connection setup. -> B computes.
- M7 8 threads: about 1.4 s: 50 in rounds of 8 = 7 rounds (round up), 7 x 0.2 = 1.4; threads blocked in socket read with GIL released, overlap perfectly; 50 threads = one round, about 0.2 s. -> B tries, A confirms.
- M8 8 processes: about the same, slightly worse; processes work for waiting, just more expensive; bare 8-worker pool ~85 ms to start and finish a no-op; 50 threads 0.22 s vs 50 processes 0.67 s. -> A.
- M9 Race: unsafe far below 8,000 (author got ~1,000, almost every update lost); safe exactly 8,000; plain on normal build very likely exactly 8,000,000 (luck of implementation); free-threaded plain lost most updates (~1.27M of 8M survived). Only change: nothing serialises threads. -> A; B surprised that the "safer" normal build gave the right answer.
- M10 Spark sweep: plot speedup vs process count; near-linear then a bend; where, and is it at 10? -> A leaves it as the thing to look for (not a quiz question to the listener; phrase as what you'd expect: the efficiency cores).

## Break It

- BR1 Load imbalance: 64 small chunks with k workers -> closer to worker count, early finisher grabs next chunk. Then 1,000 tiny chunks of 2,000 numbers -> slower again: per-task pickle round trip and pool queue trip. Sweet spot; chunksize argument on map helps find it. -> "what if" exchange.
- BR2 Pickling costs more than the work: 8 lists of 1,000,000 ints, map sum: threads 24 ms, serial 26 ms, processes 88 ms. Summing is fast C; pickling 8 lists of about 5 MB each through a pipe is not. Processes win when work per byte sent is large; send indices or paths, let workers load their own input. -> exchange; B's wrong model "processes are always the safe fast choice".
- BR3 Forget the main guard on Mac: spawn imports your file, runs top-level code, tries to create another pool; RuntimeError about the bootstrapping phase. On Linux with plain fork it may seem to work: "works on the Spark, crashes on my Mac". -> exchange.
- BR4 Oversubscribe: each task a NumPy matmul of 2,000 x 2,000, 20 tasks in a 20-process pool on the Spark; rerun with OMP_NUM_THREADS=1 and OPENBLAS_NUM_THREADS=1, likely faster. BLAS starts its own threads (often one per core): 20 x 20 = 400 threads on 20 cores, scheduler context switching instead of computing. Why DataLoader workers and many job schedulers set thread count to 1 per worker. -> exchange.

## Explain It Back (content must be in the conversation)

- E1 Process vs thread, what each owns: covered by I3, I6-I12, I13-I15; ending restatement echoes it.
- E2 GIL, why, when released, free-threaded: I28-I44.
- E3 Slow preprocessing: find out what it's slow at (top or profile); one core pegged running Python -> processes, give each worker a chunk index or file path, chunks big enough that pickling is negligible; heavy work already in C that releases the GIL (NumPy, hashlib big buffers, Rust tokenizer batch call) -> threads may be enough and avoid copying; mostly waiting (downloads, API, S3) -> threads up to hundreds of concurrent requests, async cheaper for thousands (each waiting request a small object instead of a whole thread); both -> processes for compute, threads or async inside. -> A, as a decision walk near the end; B tries first.
- E4 60 s job, 20 processes on the Spark: ideal 3 s; won't hit it: (a) half are efficiency cores, (b) uneven split, waits for slowest chunk, (c) startup and pickling, more under spawn/heavy imports, (d) serial part doesn't speed up, Amdahl's law: 10% serial -> never beat 10x, (e) memory bandwidth competition. Realistic: around 4-6 s; measure the scaling curve. -> A walks it with B; the scaling question.
- E5 DataLoader uses processes yet one thread keeps GPU busy: covered by I59, I63; the GIL only hurts when Python itself is doing the work. -> A states the one-line rule.

## Go Deeper / Connections

- G1 Best sources: OSTEP (Arpaci-Dusseau), chapters on processes, limited direct execution, concurrency, locks; Beazley's "Understanding the Python GIL" PyCon 2010. -> A, one sentence.
- C1 Next: waiting vs working. Threads are a fine way to wait (blocked thread costs no CPU, GIL doesn't care) but each costs a stack (Linux reserves 8 MB address space, only touched pages use RAM), a kernel record, a scheduler turn, a context switch on wake. Fifty easy; LLM app needs 10,000 slow calls at once; is 10,000 threads the cheapest way to wait? -> A, near the end, as a pointer (not a quiz).
- C2 Later, bandwidth-bound explains reason (e): cores stop helping once all wait on the same memory. -> A, folded into E4.

## Flow

1. Problem (P1-P6), B's "twenty workers twenty times faster" and "threads are broken".
2. Origin as story (O1-O4).
3. Program vs process, kitchen, figure 001 (I1-I9).
4. Thread owns/shares, figure 002, cheap vs trample (I10-I15).
5. Scheduler, states, B's spinning-waiter wrong model, context switch costs (I16-I23).
6. Concurrency vs parallelism, CPU vs I/O bound (I24-I27).
7. GIL, recipe book, timeline figure (I28-I34). B: "so that explains forty-one minutes".
8. When it lets go, figure 004; B connects to web pages (I35-I37).
9. Why it exists, refcounts, Guido, Gilectomy (I38-I42).
10. Free-threaded Python (I43-I44b).
11. Races, lost update figure, locks; B's "doesn't the GIL protect me?" corrected (I45-I50).
12. Processes, figure 006, start methods, pickling, shared memory (I51-I58).
13. ML: DataLoader, copy-on-access, tokenizers warning, training loop (I59-I63).
14. Predict primes (PR1).
15. Build It, said as what you'd build and see (B0-B8).
16. Measure, numbers as story (M1-M10).
17. Break It, four what-ifs (BR1-BR4).
18. Decision walk (E3) and the twenty-core scaling question (E4).
19. Connections pointer (C1, G1).
20. Ending: B restates core idea, A sharpens.
