# Outline: stack-and-heap

Source: src/lessons/stack-and-heap.mdx. Curriculum entry: "Where do my variables live?" Question: what
are the stack and the heap, and where does a Python object actually sit in memory? Why: memory leaks,
recursion limits, and "why is this list so big" all come back to this.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereq from How slow is slow: L1 cache about 1 ns, RAM about 100 ns. -> A re-explains in one breath when "why the stack is fast" comes up. Today bullets are skipped as a list; each is an item below.
- T2 Tools: a C compiler, Python 3.12+, numpy; Mac and Spark both. -> A, one sentence at the start of Build It.

## The Problem

- P1 Diagnostic answer: "Stack is first in, first out. Heap is like this tree, which is sorted." -> B says it as their own honest model when A asks; this opens the episode (diagnostic gap).
- P2 Both wrong in a normal way; the words do it to you ("stack" sounds like a line; "heap" is also an algorithms-course tree). -> A, warm.
- P3 Stack is last in, first out: plates; you take the most recent one; nobody pulls the bottom plate. -> A.
- P4 First in, first out is a queue: coffee-shop line. -> A, B connects it to the async lesson's queue.
- F1 Figure 001: plates labelled main, sum(3), sum(2), sum(1) newest, push and pop only at the top; next to it a queue, in one end out the other. A call stack only touches its top plate. -> A describes as two sketches side by side.
- P5 Memory heap has nothing to do with the heap data structure. Binary heap term: tree stored in an array, each parent smaller (or larger) than its children, smallest at the root; used for priority queues and heapsort. -> A defines in plain words because B named it.
- P6 Memory heap = big region where a program asks for chunks at runtime; not sorted, not a tree; more like a parking lot with gaps. -> A.
- P7 Name clash history: J. W. J. Williams named the tree heap in 1964 (heapsort); around then language designers called the runtime pool "the heap" (ALGOL 68 had a HEAP keyword), sense "a pile of stuff"; nobody chose the clash; two communities picked the same word. -> A, short story; B reacts.
- P8 The real question: when code says x = 5, a fifty-million-float list, a 4096 by 4096 tensor, where do the bytes go, who decides, who cleans up. Three practical payoffs: list "should" be 400 MB but is 2 GB; why deep recursion dies; why a long-running process slowly eats RAM. -> A, sets up the episode.

## Origin

- O1 Early machines had no stack. FORTRAN II (1958), first FORTRAN with subroutines, gave each one fixed spot for return address and variables. -> A, story.
- O2 Breaks on self-call: second call overwrites first call's return address; program can't find its way home; early FORTRAN banned recursion. -> A; B works out why.
- O3 ALGOL 60 required recursion. 1960 Dijkstra, "Recursive Programming": keep calls' data in a pile, add block on call, remove on return. -> A.
- O4 Bauer and Samelson patented LIFO idea in 1957, "Kellerprinzip", the cellar principle. -> A, B reacts to "patent".
- O5 Hardware followed: almost every CPU since has a dedicated register pointing at the top of the pile. That pile is the stack. -> A.

## The Idea: address space

- I1 Process term: running program plus everything the OS keeps for it: memory, open files, at least one thread running its code; next lesson is about these. -> A, inline (diagnostic gap: process vs thread blank).
- I2 Address space term: range of addresses a process can use, numbered from zero to a very large number; each process has its own, same number in two programs unrelated. -> A.
- I3 64-bit: up to about 2^47 or 2^48, hundreds of terabytes, far more than RAM. -> A says "two to the forty-seven or forty-eight, hundreds of terabytes", compares to the Spark's 128 GB.
- I4 Virtual addresses term: CPU and OS translate page by page; only parts in use get real memory; later lesson; treat as real today. -> A; B asks how 128 GB holds hundreds of TB.
- F2 Figure 002 regions bottom to top: unmapped zero, code, globals, heap growing up, free, memory-mapped, free, stack growing down, kernel off limits on top. Example Linux x86-64 addresses (0x55... for code/heap, 0x7f... for libs, 0x7ffd... for stack). -> A walks it bottom to top like a building; addresses described by their first digits only.
- I5 Code / text segment term: machine instructions, read-only and executable, so a bug can't overwrite the code. -> A.
- I6 Globals: exist whole run, e.g. int g = 42 at top of a C file; size known before start; loader sets aside exactly that. -> A.
- I7 Heap: runtime memory in sizes nobody knew; just above globals; grows up. -> A.
- I8 Memory-mapped region: shared libraries (libc, libpython, numpy compiled code), mapped files, and on Linux any single allocation bigger than about 128 KB (glibc default threshold); technically heap too, different place. -> A; B asks why libraries live there? Keep A.
- I9 Stack: near top, grows down; one block per unfinished call. -> A.
- I10 Address zero unmapped; null pointer term: value zero, "points at nothing"; reading crashes immediately, on purpose. -> A.
- I11 Warning 1: model, layouts vary; macOS Apple Silicon stack sits below the big heap region; ARM64 Linux (Spark) addresses start 0xaaaa and 0xffff not 0x55 and 0x7f; roles same. -> A.
- I12 Warning 2: base addresses change every run: ASLR, Address Space Layout Randomization, so attackers can't hardcode addresses; default on Linux and macOS; seen in build. -> A.

## The Idea: the stack

- I13 Stack frame term: block for one call: locals, return address, saved registers; created on call, thrown away on return. -> A.
- I14 Call pushes frame, return pops; a function always finishes before its caller, so newest frame goes first: LIFO, why plates fit. -> A, B checks "so it can't be FIFO by construction".
- I15 Frame holds: locals (when not in registers), return address, caller's frame pointer (the walk is literally a stack trace), borrowed registers. -> A; B connects stack trace.
- I16 Return address term: instruction in the caller right after the call; on ARM64 arrives in a register (x30, link register) and saved to the frame if the function calls anything. -> A, brief.
- I17 Stack pointer term: register (rsp on x86-64, sp on ARM64) holding current top; push moves it down, pop moves it back. -> A; register names spelled for ear.
- PR1 Predict sum-depth: sum(3)->sum(2)->sum(1)->sum(0); frames at deepest counting main = 5; when sum(1) finishes, sum(2) on top, resumes with own n = 2 untouched; each call own copy of n because own frame. -> A asks, B guesses four (forgets sum(0) or main), A reveals five with reasoning.
- F3 Figure 003 stepper: code on left, stack on right (high addresses top, grows down), step/back/play, slider n one to six; readouts: step, frames, stack pointer, stack used; frame 32 bytes illustrative; each frame shows n, rest, "return to". Notes: push saves where to come back; "frozen, waiting"; pop just moves pointer; "nobody freed anything". -> A describes what you'd see stepping, and what happens to the stack pointer number.
- I18 Drawing direction: newest frame drawn at the bottom because lowest address; plates upside down from the ceiling; every systems book does this, trips everyone once. -> A, B says it's confusing.

## Why fast, why small

- I19 Allocate frame = one instruction, subtract frame size from stack pointer (ARM64: subtract thirty-two from sp); free = add back; no search, no bookkeeping, no lock; compiler knew frame size. -> A; instruction said in words.
- I20 Second reason: top of stack is memory touched nanoseconds ago, almost always in L1 cache (term: smallest fastest on-core memory, about 32-128 KB per core, about 1 ns; RAM roughly 100x slower); same few hundred bytes reused; locals about 1 ns vs about 100 ns; hottest memory you have. -> A, re-explaining L1 from lesson one.
- I21 Price is rigidity: size reserved up front when thread starts; frame size fixed at compile time. -> A.
- I22 Linux main thread stack 8 MB default; ulimit -s prints 8192 (KB) Linux, 8176 macOS. -> A, the command named once as "ulimit dash s".
- I23 8 MB plenty for code: frames tens to hundreds of bytes, tens of thousands deep; nothing for data: local array of two million doubles = 16 MB, program dies. -> A, B asks "how big is 8 MB really".
- I24 Guard page term: unmapped page just past stack end; touching it crashes immediately instead of silently overwriting neighbours. -> A.
- I25 Segmentation fault term: touching memory you have no right to; signal SIGSEGV number 11; shell exit code 139 = 128 + 11. -> A, said as "a hundred twenty-eight plus eleven".
- I26 Stack overflow term: out of stack, almost always too-deep recursion or huge local array; the website's name. -> A, B laughs.
- I27 Every thread gets its own stack (own chain of calls); Linux extra threads 8 MB default, macOS 512 KB; all threads share one heap; explains most thread problems; next lesson. -> A.

## The heap

- I28 Stack can't handle: (1) size known only at runtime (rows in a file, length of a query); (2) data that must outlive the function (load a model and return it; frame gone on return). -> A, B suggests "just make the stack bigger" (wrong model), A answers with these.
- I29 malloc: ask for n times 4 bytes, use, pass around, free gives it back. -> A in words, no code.
- I30 Allocator term: code that manages the heap, hands out chunks, takes back, tracks free; glibc malloc, jemalloc, mimalloc; CPython and PyTorch have their own on top. -> A.
- I31 Ask for 400 bytes: finds free gap of at least 400, marks used, returns address; when out of gaps asks the OS: extend heap upward or map a fresh region for big ones. -> A.
- I32 System calls term: requests to the kernel, few hundred nanoseconds to many microseconds, far more than a function call. -> A.
- I33 Heap slower: malloc fast path tens of ns not one instruction, more when going to OS; objects land wherever there was a gap, scattered, cache misses. Neither a disaster once; both a disaster a hundred million times in a loop. -> A.

## Fragmentation

- F4 Figure 004: sixteen blocks, seven free, holes of two, two, one, two; malloc of four contiguous blocks fails; allocator has to grow the heap. -> A describes the row; B asks "but seven are free".
- I34 Fragmentation term: free memory in small holes, big request can't be served though total is enough; process memory grows though not "using" more; long-running server creeps up without leaking, frees into holes too small. -> A.
- I35 Allocators group chunks by size class (all 32-byte together, all 64-byte together), exactly what CPython's allocator does. -> A.

## Who frees the heap

- I36 Stack cleans itself up (the pop is the cleanup); heap has no such moment; someone decides "nobody needs this". -> A.
- I37 C: you. One free per malloc; forget = memory leak (term: allocated, never used again, can't be reused, process grows until killed); free twice or use after free corrupts allocator's map; large fraction of real security bugs. -> A.
- I38 CPython: every object carries a count of references; at zero freed right then; cycle collector term: runs every so often, finds groups that only point at each other with nothing outside pointing in, frees them; refcounting alone never frees a cycle. -> A.
- I39 Rust: compiler; every heap value one owner; compiler inserts free where owner goes out of scope; no runtime counting, no collector, use-after-free won't compile. -> A.

## Python: everything on the heap

- I40 In CPython every value is a heap object; variables are names pointing at objects, not boxes. -> A, B voices "box" model first.
- I41 x = 1000 allocates int object, x points at it; y = x copies nothing, second name same object; id(x) is literally its address in CPython. -> A.
- I42 Header: reference count (term: count inside every object; assignment adds one, name going away subtracts one, at zero freed immediately) 8 bytes + type pointer 8 bytes; small int adds 8 bytes size info and one 4-byte digit (big ints as list of 30-bit chunks); 28 bytes for 1000, which fits in 8 as raw integer. -> A adds it up aloud: eight plus eight plus eight plus four.
- F5 Figure 005: names x and y in a frame both pointing at one int object (refcount 2, type int, digit 1000, 28 bytes); list = list object -> row of 8-byte pointers -> int objects scattered; numpy int64 = ndarray object about 112 bytes (shape, dtype, strides, data pointer) -> one contiguous buffer of raw 8-byte numbers. -> A describes three panels.
- I43 Million ints as list: 8 MB pointer array + million 28-byte objects; naive 36 MB; tracemalloc on 3.12+ about 40 MB because small-object allocator gives memory in 16-byte steps, 28 rounds to 32. numpy int64 = 8 MB plus about 100-byte header, one block; five times smaller; contiguous so cache and prefetcher stream instead of chasing a pointer per element. -> A with B guessing 8 MB first.
- I44 Versions: getsizeof(0) was 24 in 3.10, 28 from 3.11; numbers are CPython 3.12+, 64-bit; check your own. -> A, one line.
- I45 Small ints -5 to 256 shared, made at startup; [0] * a million = million pointers to same zero = 8 MB not 40; only distinct larger ints get their own object. -> A.
- I46 sys.getsizeof(list) shallow: list object and pointer array only (8 MB for a million); tracemalloc sees everything. -> A.
- F6 Interactive slider: N from a thousand to a billion, ints/floats toggle; bars dark = pointer, light = object, packed rows; list of int 8+32, array.array q 8, numpy int64 8, int32 4; floats: list 8+24, float64 8, float32 4; list 5x bigger for ints; at large N the list doesn't fit the Spark's 128 GB. append-built list up to about 12% bigger (over-allocation). -> A describes dragging it. Billion ints as list = 40 GB derived from 40 B x 1e9 (fits); figure says overflows past 128 GB, around three billion: derived. Keep to "somewhere in the billions the list version stops fitting" (from figure logic).

## CPython frame stack vs C stack

- I47 Python has a call stack (tracebacks) but not simply the C stack. CPython is a C program; per call keeps a record: function, line, local slots (pointers to objects). Since 3.11 those live in heap memory the interpreter allocates; Python calling Python no longer makes C recurse; C stack stays flat. -> A, B surprised.
- I48 Still recursing in C: repr of deeply nested list, json.dumps, pickle, comparisons, C extensions calling back into Python push real C frames; can overflow the real 8 MB and segfault the interpreter. -> A.
- I49 Recursion limit term: cap on nesting, default 1000, sys.getrecursionlimit; exceeding raises RecursionError instead of crash. Historically every Python call used C stack, 1000 deep comfortably under 8 MB, so limit turned crash into catchable error. Today mostly guard against runaway recursion; 3.12+ separate C-depth check. Raising with setrecursionlimit on old Python just lets you segfault. -> A.

## Reference counting and del

- I50 del x deletes the name, drops count by one; freed if last; else stays alive (another name, list, cache, closure, stored traceback). -> A, B voices "del deletes the object".
- I51 Most Python "leaks": long-lived container (module-level dict cache, results list, logger holding references) keeps growing, pins everything it points at. Not a Python bug. -> A.
- I52 Cycles: a.other = b, b.other = a, counts stay 1 after deleting names; only cycle collector frees; normally automatic; some turn it off for speed (Instagram, 2017), then cycles never freed. -> A.

## PyTorch tensor

- F7 Figure 006: names t and v -> two small tensor Python objects (shape 1000x1000 offset 0; shape 990x1000 offset 10000) -> one Storage (4,000,000 bytes, 2 users) -> data buffer on CPU heap or GPU memory; float32 1000x1000 = 4 MB once. -> A describes chain.
- I53 torch.zeros(1000,1000): small Python object with shape, strides (term: how many elements to skip per dimension; changing strides and offset lets views reshape/slice without copying), dtype, device, pointer to storage; storage owns 4 MB; CPU = heap allocation like numpy; cuda = GPU memory via PyTorch's CUDA allocator. -> A.
- I54 Slices and .view(): new small tensor, same storage, different offset or strides; free; modifying view modifies original. -> A, B: "so that's why my slice edit changed the original".
- I55 Caching allocator term: grabs big blocks from CUDA driver, reuses instead of returning, because asking the driver is slow; freed memory stays reserved. After del, nvidia-smi doesn't go down; memory_allocated (live tensors) does; memory_reserved (held) doesn't. Same idea as malloc keeping chunks. -> A, B voices "del didn't work" model.
- I56 Spark twist: CPU and GPU share one physical pool (128 GB LPDDR5x per spec sheet); different allocators still; .to("cuda") still makes a second copy; no PCIe bus; one shared budget number; check NVIDIA docs before relying on zero-copy. -> A.

## Build It

- B1 Task 1 where.c: print addresses of main, a global, a local in main, malloc 64 bytes, malloc 1 MB, local in recursive deeper() at three levels; compile with -O0 (stops keeping locals only in registers); run three times. Mac sample: code and global near 0x100..., small heap 0x101..., 1 MB block way up at 0x7bac..., stack locals around 0x16f..., depths step down. -> A: what you build, what you'd see; addresses described by shape, not read.
- PR2 Predict addr-order: depth 3 lower, by one frame, tens of bytes (48 bytes, hex 30, in the sample run); numbers change each run (ASLR) but gaps stay the same, layout inside each region fixed by compiler. -> A asks, B answers (gets direction right because of the earlier picture, guesses gap wrong or doesn't know ASLR effect), A reveals.
- B2 Task 2 boom.c: recursive f with 1 KB local array, writes n into it, prints every 1000 calls with flush so output survives crash, uses array in return so not turned into loop; predict depth from ulimit; run, read exit code 139; double with ulimit -s 16384 (this shell only; macOS caps at 65520); run again. -> A.
- B3 Task 3 Python recursion: depth(5000) default -> RecursionError, read traceback; setrecursionlimit to a million and depth(500,000) -> succeeds on 3.11+ (frames on heap); check peak memory with getrusage ru_maxrss (bytes on macOS, kilobytes on Linux); then nested list a million deep and repr -> C stack recursion; try 3.10 via uv. -> A, B predicts.
- B4 Task 4 weigh.py: getsizeof of small values, explain jump at 2^30 (needs a second 30-bit digit); million ints as list, array.array q, numpy int64, compare getsizeof vs traced; [0]*million vs list(range(million)); a = 256 is shared vs int("1000") twice not; dict million int to float bytes per entry. -> A walks the questions as things you'd discover, gives answers.
- B5 Task 5 tensor on Spark: element_size x nelement equals storage nbytes (4,000,000); view shares storage data pointer; data pointer difference 10 x 1000 x 4 bytes; v[0,0] = 7 shows up at t[10,0]; CUDA 1 GB tensor, del, allocated drops, reserved and nvidia-smi don't, until empty_cache. -> A.
- B6 Task 6 leak hunt: fake reranking service, two leaks; tracemalloc start with 10 frames, snapshot after 1000 and after 20,000 requests, compare by line, top 5; who holds a reference; fix minimally: unbounded cache, cycle only collector could free (gc disabled "for speed"); show growth gone. -> A describes the service, B guesses, A explains both leaks.
- B7 Done when: seen stack grow down and ASLR; crashed C, exit 139, changed depth with ulimit; seen clean RecursionError and C-level crash; weigh.py numbers within a few bytes per element; two leaks found and fixed with before/after. -> Folded into the Build It walk; not read as a checklist.

## Measure

- M1 ulimit: 8176 macOS / 8192 Linux. -> A.
- M2 Gap between depth locals: tens of bytes. -> A.
- M3 boom.c depth about 7,000-8,000 default; frame bit over 1 KB (array + return address, saved registers, alignment); 8 MB / about 1.1 KB = about 7,000; author's Mac printed 7,000, died before 8,000; doubled stack about 2x: fixed region, nothing more. -> A works it out with B.
- M4 depth(500,000) peak RSS about 100 MB on 3.14; 100-200 bytes per Python frame plus ints; that memory is "the stack", just not THE stack. -> A.
- M5 Million ints list traced about 40 MB; numpy int64 8.0 MB; 8+32 vs 8, five times; floats 8+24 = 32 vs 8, four times. -> A.
- M6 Dict million int->float about 100 MB: hash table slot (hash, key pointer, value pointer, index, spare room) about 40 bytes + 32-byte int + 24-byte float rounded to 32. -> A adds it up.
- M7 Leak growth per 1000 requests: your number. -> A, in leak section; say "you'll get your own number".
- M8 If off more than about 20%: different Python version, small-int caching, append-built list. -> A.

## Break It

- K1 Return pointer to a local: compiler warns; first print may work, second after another call shows garbage (author's Mac: 1234 then 1); frame popped, next call reused bytes; stack memory has no life beyond its call, why the heap exists. -> "What if" exchange; B expects it to work.
- K2 Double free: allocator notices map corrupt and kills process; Linux glibc prints "double free detected in tcache 2" and aborts; author's Mac died silently exit 133 (a trap); with address sanitizer (-fsanitize=address) names exact line of each free; use ASan whenever writing C or a C extension. -> exchange.
- K3 del that frees nothing: 500 MB numpy array also in a list; del name, RSS unchanged; clear list, drops instantly; tensor captured in lambda or stored on self in a training loop = most common notebook OOM. -> exchange, B recognises the notebook bug.
- K4 Recursion limit as crash: on 3.10 set limit a million, depth(200,000): no RecursionError, segfault exit 139, no traceback; each call used real C stack; raising the limit removed the guardrail without widening the road. -> exchange.

## Explain It Back (substance in conversation)

- E1 Frame: memory for one unreturned call (locals, return address, saved registers); size known ahead, one instruction to create/destroy; in L1; malloc searches, bookkeeping, maybe lock, maybe OS; chunk anywhere, cache miss. -> Covered in Why fast + heap; B restates partly near the end of heap section.
- E2 Why not everything on stack: size (8 MB), lifetime (frame gone), unknown size (fixed at compile time); heap handles all three at cost of speed and someone freeing. -> In the heap section via B's "make the stack bigger".
- E3 a = [1000, 2000]; b = a; del a: two ints and a list on heap, list holds two pointers, a refcount 1, b makes 2, nothing copied, del drops to 1, alive via b; last ref -> freed immediately -> drops ints' counts. -> In the del section as a worked example.
- E4 50M (id, score) dict: about 100 B per pair, about 5 GB, more during resize (doubles table); information is 12 bytes; two numpy arrays (ids int64 sorted, scores float32) = 600 MB, about 8x smaller; lookups by binary search (searchsorted) or vectorised; dense ids -> just scores indexed by id: 200 MB. -> Its own exchange after Measure dict number, tied to his ranker.
- E5 Two threads recursing: own stacks (frames, locals, return addresses, no stomping), share code, globals, heap; two threads on same list/dict = root of thread-safety problems, part of why GIL. -> In the "every thread gets its own stack" passage.

## Go Deeper / Connections

- G1 Best sources: CS:APP (Bryant and O'Hallaron) procedures and dynamic memory allocation chapters; OSTEP free-space chapter for fragmentation. -> A, one sentence near the end.
- C1 Connections: next lesson processes/threads/GIL; virtual memory and OOM killer; why NumPy is fast; memory math for models uses the same bytes-per-element habit. -> A, one or two sentences.

## Flow

1. Cold open: A asks what stack and heap are; B gives the diagnostic answer; A corrects both halves (P1-P6, F1).
2. Name history (P7), then the real question (P8).
3. Origin story (O1-O5).
4. Address space walk (I1-I12, F2).
5. Stack frames, Predict sum-depth, stepper figure, drawing direction (I13-I18, PR1, F3).
6. Why fast / why small / overflow / threads get own stacks + E5 (I19-I27).
7. Heap: why needed (B: make the stack bigger; E2), malloc, allocator, syscalls, costs; B restates E1 (I28-I33).
8. Fragmentation (F4, I34-I35).
9. Who frees (I36-I39).
10. Python names and objects, sizes, small ints, getsizeof, slider (I40-I46, F5, F6).
11. CPython frames vs C stack, recursion limit (I47-I49).
12. del and refcounting, worked example E3, leaks and cycles (I50-I52).
13. Tensors, views, caching allocator, Spark (F7, I53-I56).
14. Build It tasks one to six with predictions and expected numbers folded in (B1-B7, PR2, M1-M8).
15. The fifty-million-pair dict (E4).
16. Break It four ways (K1-K4).
17. Sources + connections in two sentences (G1, C1).
18. Close: B restates the core idea, A sharpens.
