# Coverage: processes-threads-gil

Lesson src/lessons/processes-threads-gil.mdx vs podcast/scripts/processes-threads-gil.md. Item IDs
match podcast/outlines/processes-threads-gil.md. "Fixed" = was MISSING or wrong in the first draft and
has been corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 Prereq address space / header | Program vs process; Why GIL | "Code at the bottom, then globals, then the heap growing up"; "every Python object on the heap carries a small header" | covered |
| T2 Prereq latency numbers | Scheduler | "A read from RAM is around a hundred nanoseconds" (from latency-numbers lesson) | covered |
| P1 2M pairs, clean, hash, 40 min, 20 cores, one pinned | Problem | "reads two million query-document pairs... one core pinned at a hundred percent" | covered |
| P2 Thread pool 20 -> 41 min | Problem | "with twenty workers. And it takes forty-one minutes" | covered |
| P3 Process pool -> 3 min, one word | Problem | "it takes three minutes... You changed one word" | covered |
| P4 5,000 pages 40 -> 2 min | Problem | "fetch five thousand web pages... forty minutes to two" | covered |
| P5 Stakes: DataLoader, 50 users, weekly deadlock | Problem | "A data loader that starves the GPU. A server that falls over at fifty users" | covered |
| P6 Three layers | Problem | "comes in three layers" | covered |
| O1 One job at a time, tape drive, idle CPU | Origin | "if it needed to read from a tape drive, it waited" | covered |
| O2 CTSS 1961, Multics, Unix, process | Origin | "C T S S at M I T, in nineteen sixty-one" | covered |
| O3 Threads 80s-90s, Mach, POSIX 1995, server/GUI | Origin | "First in a research system called Mach, and then POSIX threads... nineteen ninety-five" | covered |
| O4 Python threads early 90s, one big lock, thirty years | Origin | "it put one big lock around the whole thing" | covered |
| I1 Program = inert file | Program vs process | "A program is a file. That's it." | covered |
| I2 Kernel | Program vs process | "the one program that talks to the hardware directly" | covered |
| I3 Process definition, two terminals | Program vs process | "run the same command in two terminals, you get two processes" | covered |
| I4 Kitchen / cook analogy | Program vs process | "A process is a kitchen... A thread is a cook" | covered |
| F1 Figure 001 | Program vs process | "Two arrows come out of it, both labelled run... wall, no shared memory" | covered |
| I5 PID | Program vs process | "That's the P I D, the process ID" | covered |
| I6 Own address space, same address different RAM, browser | Program vs process | "The exact same memory address... points to different physical RAM" | covered |
| I7 MMU | Program vs process | "called the M M U, the memory management unit" | covered |
| I8 File descriptors 0,1,2 | Program vs process | "That's called a file descriptor" | covered |
| I9 Kernel runs threads, empty room | Program vs process | "the kernel doesn't actually run processes. It runs threads" | covered |
| I10 Thread definition | Thread owns/shares | "It's one sequence of instructions being executed" | covered |
| I11 IP, registers, stack, SP | Thread owns/shares | "an instruction pointer... the registers themselves... a stack" | covered |
| I12 Shared: code, globals, heap, files | Thread owns/shares | "The code, the globals, the heap, the open files" | covered |
| F2 Figure 002 | Thread owns/shares | "three stacks stacked up... bracket... private, one per thread" | covered |
| I13 Cheap, ~40 microseconds, zero copy | Thread owns/shares | "around forty microseconds" | covered |
| I14 Trample | Thread owns/shares | "Threads can trample each other" | covered |
| I15 Processes mirror image | Thread owns/shares | B: "Expensive to make, expensive to get data between" | covered |
| I16 8-16 cores, thousands of threads | Scheduler | "hundreds of processes and thousands of threads" | covered |
| I17 Scheduler | Scheduler | "the part of the kernel that decides who goes next" | covered |
| I18 Three states, blocked uses no CPU | Scheduler | "A blocked thread uses no CPU. Zero." (B's spinning wrong model) | covered |
| I19 Time slice few ms | Scheduler | "roughly a few milliseconds on Linux and macOS" | covered |
| I20 Context switch, note | Scheduler | "leaves a note saying exactly where they were" | covered |
| I21 Costs 1-5 us; process switch more in effect | Scheduler | "something like one to five microseconds" | covered |
| I22 TLB | Scheduler | "called the T L B, the translation lookaside buffer" | covered |
| I23 Thousands of RAM reads; 5 ms slice, 50 ms RTT | Scheduler | "hundreds of thousands a second will eat a whole core" | covered |
| I24 Concurrency | Concurrency vs parallelism | "Concurrency is about structure" | covered |
| I25 Parallelism | Concurrency vs parallelism | "Parallelism is about execution" | covered |
| I26 Concurrency speeds waiting, parallelism working | Concurrency vs parallelism | "Concurrency alone is enough to speed up waiting" | covered |
| I27 CPU-bound vs I/O-bound | Concurrency vs parallelism | "A job is CPU-bound if... I-O-bound" | covered |
| I28 GIL definition | GIL | "The Global Interpreter Lock. The GIL." | covered |
| I29 Bytecode | GIL | "Python first compiles it into a list of simple instructions" | covered |
| I30 Recipe book | GIL | "one recipe book, and only the cook holding the book" | covered |
| I31 At most one thread runs Python | GIL | "at most one thread is running Python code at any instant" | covered |
| F3 Figure 003 (96 / 24 / ~34 vs 124 ticks) | GIL | "it finishes at ninety-six ticks... finish in about thirty-four" | covered |
| I32 CPU + GIL on = serial, often worse | GIL | "real Python is often a little worse than serial" | covered |
| I33 CPU + GIL off divides | GIL | "wall time divides by the number of threads" | covered |
| I34 I/O either way | GIL | "the GIL barely matters, because waiting doesn't need it" | covered |
| I35 Switch interval 5 ms, 3.2, 0.005 | When it lets go | "Since Python three point two... returns zero point zero zero five" | covered |
| I36 C code releases around slow ops | When it lets go | "can explicitly let go of the GIL before it starts a long operation" | covered |
| I37 List: I/O, sleep, hashlib >2 KB, zlib, NumPy/BLAS, PyTorch | When it lets go | "hashlib... over about two kilobytes. And zlib compression" | covered |
| F4 Figure 004 | When it lets go | "a small filled blue square, the GIL, which is the door" | covered |
| Link to scraper vs hashing | When it lets go | B: "Oh. So that's the scraper." | covered |
| I38 Refcount | Why GIL | "one field in that header is the reference count" | covered |
| I39 Lost decrement leaks, lost increment crashes | Why GIL | "A lost decrement means... memory leaks forever" | covered |
| I40 Atomic vs one lock | Why GIL | "An atomic operation is a CPU instruction..." | covered |
| I41 Guido early 90s, one core, C extensions, NumPy | Why GIL | "Guido van Rossum, who created Python, chose the second one" | covered |
| I42 Gilectomy ~2016 | Why GIL | "Larry Hastings did a project called the Gilectomy" | covered |
| I43 PEP 703, biased refcounting, immortal, per-object locks | Free-threaded | "biased reference counting... immortal objects" | covered |
| I44 3.13 experimental, 3.14 PEP 779 supported/optional, 5-10%, C ext re-enable, is_gil_enabled | Free-threaded | "pep seven seven nine... roughly five to ten percent" | covered |
| I44b Cleanest demonstration | Free-threaded | "the cleanest possible demonstration that the GIL, not threads" | covered |
| I45 Three steps of += | Races | "It's actually three. Read... add... write" | covered |
| I46 41/41/42 lost update, race condition | Races | "Thread A reads forty-one" | covered |
| F5 Figure 005 interactive | Races | "a button to step it... it says lost update" | covered |
| I47 Lock/mutex, critical section, keep short | Races | "also called a mutex, short for mutual exclusion" | covered |
| I48 GIL not a lock for your code | Races | "The GIL is not a lock for your code" (B's wrong model) | covered |
| I49 3.10+ switch points, accident, sleep(0) | Races | "three point ten onward... time dot sleep of zero" | covered |
| I50 Processes don't share | Races | "Not by default, because they don't share memory" | covered |
| I51 Own interpreter, own GIL, 8 workers | Processes | "Eight kitchens, eight recipe books" | covered |
| F6 Figure 006 | Processes | "pickle, then pipe, then unpickle... a copy, every call" | covered |
| I52 Pay twice | Processes | "And you pay twice" | covered |
| I53 fork, copy-on-write, deadlock | Processes | "inherits a locked lock" | covered |
| I54 spawn 60-90 ms, torch import | Processes | "around sixty to ninety milliseconds" | covered |
| I55 forkserver | Processes | "The third is fork server" | covered |
| I56 Defaults macOS 3.8 spawn, Linux fork -> 3.14 forkserver | Processes | "Python three point fourteen changed the Linux default to fork server" | covered |
| I57 Pickle, pipe, two ints vs million-element list | Processes | "For a million-element list per task, it can cost more than the work" | covered |
| I58 Shared memory, needs locks | Processes | "you're back to needing locks if anyone writes" | covered |
| I59 DataLoader workers are processes, shared memory handles | ML | B: "Those are threads, right?" / "They're processes." | covered |
| I60 pin_memory thread | ML | "If you set pin memory to true, a thread in the main process" | covered |
| I61 Copy-on-access refcount bite, NumPy fix | ML | "Reading it writes to it." | covered |
| I62 Tokenizers warning, env var | ML | "set the environment variable tokenizers parallelism to false" | covered |
| I63 Training loop, async CUDA, CUDA graphs, torch.compile | ML | "the fix is CUDA graphs, or torch dot compile. Not more threads" | covered |
| PR1 Predict primes 8 threads / 8 procs | Predict | "it came out around one second... five times faster, not eight" | covered |
| B0 concurrent.futures one class name | Build It | "the only thing that changes between experiments is one class name" | covered |
| B1 Setup, cores, Spark 10+10, cores.py, sysctl/nproc/lscpu | Build It | "Ten Cortex X nine twenty-five performance cores" | covered |
| B2 Slow server 200 ms, backlog 256 vs 5 | Build It | "bumps the listen backlog to two hundred fifty-six" | covered |
| B3 Prime counter, 148,933, main guard | Build It | "a hundred forty-eight thousand, nine hundred thirty-three primes" | covered |
| B4 I/O job, rounds, startup tax | Build It | B: "Seven times zero point two. One point four seconds." | covered |
| B5 Race script unsafe/safe/plain, 1M, uv 3.14t | Build It | "Unsafe reads the counter into a local, sleeps for zero" | covered |
| B6 Watch live: ps -M, ps -T, /proc task, top -H, htop H, py-spy | Build It | "seven threads parked in a socket read" | covered |
| B7 Spark sweep 1..20, agent review fairness | Build It | "One, two, four, eight, twelve, sixteen, twenty" | covered |
| B8 Done when | Build It | "you're done when it all runs on both machines" | covered |
| M1 Run twice, keep faster | Measure | "Time each one at least twice and keep the faster run" | covered |
| M2 Reference table numbers | Measure | "Serial, five point three seconds... Eight processes, one point one" | covered |
| M3 Free-threaded 4.8 / 1.7 / 1.0 | Measure | "Serial, four point eight seconds. Four threads, one point seven" | covered |
| M4 Threads no speedup, top one core | Measure | "the process sat at about one core" | covered |
| M5 2.7x, uneven chunks, efficiency cores, Spark 10->20 | Measure | "Two point seven, not four" | covered |
| M6 Serial 10 s + setup | Measure / Build It | "Your ten seconds, plus a little for setting up each connection" | covered |
| M7 7 rounds = 1.4 s; 50 threads ~0.2 s | Measure | "Your seven rounds of two hundred milliseconds" | covered |
| M8 Processes slightly worse, 85 ms, 0.22 vs 0.67 | Measure | "Fifty processes took zero point six seven" | covered |
| M9 Race ~1,000 / 8,000 / 8M / ~1.27M | Measure | "about one point two seven million survived" | covered |
| M10 Spark sweep bend, at 10? | Measure | "where it bends, and whether that's at ten" | covered |
| BR1 Load imbalance 64 / 1,000 tiny, chunksize | Break It | "the map call has a chunk size argument" | covered |
| BR2 Pickling > work: 24 / 26 / 88 ms, 5 MB | Break It | "processes took eighty-eight" | covered |
| BR3 Main guard, RuntimeError, Spark vs Mac | Break It | "work on the Spark and crash on your Mac" | covered |
| BR4 Oversubscription, OMP/OpenBLAS, 400 threads | Break It | "four hundred threads, fighting over twenty cores" | covered |
| E1 Process vs thread answer | Program vs process; Thread owns/shares; ending | "Safe by default. Expensive by default." | covered |
| E2 GIL answer | GIL through Free-threaded | (see I28-I44) | covered |
| E3 Decision walk | Explain It Back | "Threads work well up to hundreds of requests at once. For thousands, async is cheaper" | covered |
| E4 60 s / 20 procs, five reasons, Amdahl, 4-6 s | Explain It Back | "you can never beat ten times faster" | covered |
| E5 DataLoader vs training loop, one-line rule | Explain It Back | "The GIL only hurts when Python itself is the thing doing the work" | covered |
| G1 OSTEP, Beazley | Connections | "Three Easy Pieces... David Beazley's old PyCon talk" | covered |
| C1 Waiting vs working pointer, 8 MB stack, 10,000 calls | Connections | "Linux reserves eight megabytes of address space" | covered |
| C2 Bandwidth-bound lesson | Explain It Back | "There's a later lesson on exactly that" | covered |

Fixed in review: the hashlib follow-up originally asserted the pairs were under two kilobytes and that
cleaning dominated the time (not in the lesson); now inferred only from the lesson's 41-minute result.

Numbers check: every number above matches the lesson. Not written in the lesson: figure 003 tick counts
(96, 24, about 34 vs 124) computed from the figure's own simulation code; "about three times slower"
(0.67 vs 0.22 s); "even with infinite cores that ten percent still takes six seconds" (10% of 60 s);
RAM read about a hundred nanoseconds (from the latency-numbers lesson, re-explained as a prereq);
"about thirteen" is not used.
