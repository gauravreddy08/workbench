# Outline: virtual-memory

Source: src/lessons/virtual-memory.mdx. Curriculum entry: "Virtual memory and the OOM killer." Question:
what is virtual memory, and why did Linux kill my process when I had "free" memory? Why: loading a 70B
model, mmap, swap, and OOM kills on the Spark all live here.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

Diagnostic gaps touched: numbers/memory sizes (biggest gap: every size gets a comparison), OS basics
(process vs thread; thought the heap is the heap data structure; this lesson builds on the address-space
strip). B voices: "malloc succeeded so the memory is mine", "VSZ is how much memory it uses",
"reading can't copy anything", "the GPU has its own memory", "summed RSS is the real total".

## Today / prerequisites

- T1 Prereqs re-explained: address-space strip (code at bottom, heap growing up, stack growing down, huge empty gap); each process has its own address space; fork and DataLoader workers are separate processes. -> A, briefly, when the hotel analogy is mapped to the real thing and again at fork.

## The Problem

- P1 Scene: 70B on the Spark; bf16 about 140 GB > 128 GB; 8-bit checkpoint about 70 GB; free -h says about 115 GB available. -> A opens on it.
- P2 Obvious script: torch.load, build model, load_state_dict, .to("cuda"). -> A says what it does in words.
- P3 Runs a few minutes, disk light blinks, desktop sluggish, then "Killed". No traceback, no MemoryError, no CUDA out of memory; exit code 137; nothing in your code was told; something outside decided. -> A.
- P4 Three mysteries: who said no and when (every allocation succeeded); 115 available, needed 70, where did the rest go; why .to("cuda") uses CPU memory. -> B voices the first two as confusion, A adds the third.
- P5 One idea answers all: addresses are not real, a story with fine print. -> A.

## Origin

- O1 1950s: small fast main memory, big slow drum; overlays by hand; some estimates half of programmers' time on it. -> A tells story.
- O2 Atlas, Manchester, Tom Kilburn and colleagues, 1962: let the machine do it; one uniform memory; hardware chops into pages; table of which pages in core vs drum; touch a missing page, hardware stops, fetches, carries on. "One-level store". Every phone, laptop, GPU server since. -> A.
- O3 OOM killer is the other end: Unix made fork cheap by not copying until written; Linux lets programs reserve more than exists; when the bet loses, since late 1990s a kernel routine picks a process and kills it. -> A.

## The Idea

- I1 Hotel: rooms numbered zero to a million, 500 real; private book per guest; room 7 is really 212, room 900,000 is really 31; most guests use a handful. -> A, one exact comparison (allowed).
- I2 Reserve rooms 1 to 50,000 and never visit: desk writes "reserved", assigns nothing; real room only on first door opening. -> A.
- I3 Mapping: guest = process, fake numbers = virtual addresses (what program sees; every pointer; translated on every access by hardware using kernel tables), real rooms = physical memory (the actual RAM chips), front desk = MMU (hardware in each core translating every address using the current process's page table) plus kernel; the book = page table. -> A, terms inline.
- I4 Callback: the strip is the guest's view; gap costs nothing; same address in two processes points at different RAM = two guests, two books. -> A; B connects.
- I5 Pages: per-byte book bigger than memory; fixed-size chunks (pages, typically 4 KB on x86 Linux); physical RAM in same-size frames; one entry per page. -> A.
- I6 Page sizes: x86-64 Linux 4 KB (12 offset bits); Apple Silicon macOS 16 KB (14 bits); ARM64 Linux 4, 16 or 64 KB chosen at kernel build (12, 14, 16). Spark is ARM64; some NVIDIA ARM server kernels use 64 KB; author unsure; ask getconf PAGESIZE; Mac prints 16384; write the Spark's down. -> A said as three cases, not table; B asks which the Spark is.
- I7 Address = page number (high bits, the lookup key) + offset (low bits, which byte in the page, never translated; 12 bits for 4 KB since two to the twelve is 4096). Translation swaps page number for frame number, keeps offset. -> A with a worked example in words.
- F1 Figure 001: 48 bits used, 4 KB pages: 36-bit page number cut into four 9-bit pieces, 12-bit offset; TLB with about 1-3 thousand recent pages, hit about a cycle; miss walks four 512-entry tables starting at this process's top table; last entry gives frame plus bits; offset copied across; no valid entry -> page fault. -> A describes like a diagram over the phone.
- I8 Page table and PTE: 8 bytes, frame number plus flags: present, writable, user-accessible, accessed, dirty; important ones present, writable, dirty. -> A.
- I9 Why a tree: 48-bit space, 4 KB pages, two to the 36 pages, about 69 billion; 8 bytes each = flat 512 GB per process. Four-level tree, four 9-bit pieces, 512-entry tables; missing subtrees; gap has no tables; typical process few hundred KB to few MB. -> B asks why not an array; A does the math in words.
- I10 Not free: touch 100 GB with 4 KB pages = 26 million PTEs, about 200 MB of page tables; one reason for bigger pages. -> A.
- I11 Each process own tree; threads share one tree = what "threads share an address space" means in hardware. -> A, B reacts (OS gap).
- I12 TLB: four extra reads per access would make programs several times slower; per-core tiny cache of recent translations; first level few dozen, second level one to a few thousand; spec-sheet vary, order of magnitude. -> A.
- I13 TLB reach: about 1,500 x 4 KB = about 6 MB; weights 70 GB; decode blows through TLB thousands of times over; huge pages 2 MB (or 1 GB), one entry covers 512x, same TLB reaches 3 GB; Linux can do it automatically (Transparent Huge Pages); GPU's MMU and serious CPU workloads use them. 64 KB base pages = 16x reach for free. -> A, B asks number.
- I14 Lazy allocation: malloc(100 GB) / np.zeros / torch.empty -> C library asks kernel via mmap (system call that adds a region; anonymous starts as zeros, or file-backed shows file contents). Kernel writes one note (range, readable/writable, zeros), returns; no frames, no PTEs. VSZ (virtual size: total reserved, touched or not; VIRT in top, VmSize; mostly meaningless) jumps 100 GB; RSS (resident set size: actually in RAM now; the number that matters) doesn't move. Real work later, page by page, first touch. -> A; B voices "VSZ is memory use" wrong model.
- PR1 Predict malloc-100g: Mac 48 GB, np.zeros 100 GB: succeeds in about a tenth of a millisecond (0.11 ms measured on M-series 48 GB); RSS stayed 28 MB; fresh anonymous pages are already zero so NumPy writes nothing. Writing every element: each 16 KB page first touch faults, kernel finds frame, zeroes, maps, RSS climbs; past 48 GB macOS compresses and swaps, crawls, system steps in; don't do it on bare host. -> A asks, B guesses wrong ("fails, not enough RAM"), reveal.
- I15 Page fault: MMU finds no valid entry or disallowed access (write to read-only); instruction stops, CPU jumps into kernel, kernel looks up address in its notes; fixes and retries or kills. -> A.
- I16 Three cases: not in any reserved region -> SIGSEGV segfault (like the stack guard page in the stack-and-heap lesson); reserved and data already in RAM or zeros -> minor fault (no disk: zero-fill, map cached file page, copy page; well under a microsecond to a few microseconds); reserved but on disk (mmapped file page not cached, or swapped out) -> major fault (read, thread sleeps, map, resume; tens of microseconds on fast NVMe, milliseconds on spinning disks). -> A, three cases with B's interjections.
- I17 Measured on Mac: fresh 4 GB NumPy fill 0.21 s (19 GB/s), 262,149 faults vs 4 GB/16 KB = 262,144; second fill 0.086 s (46 GB/s); about 0.5 microseconds per minor fault including zeroing 16 KB. Latency ladder: about five trips to RAM (about 100 ns each); major fault from NVMe roughly a hundred times worse again. -> A, numbers with comparisons.
- F2 Figure 002 interactive: two processes' virtual pages outside, six physical frames in middle; buttons malloc, touch A, fork, touch B, swap on/off, reset. Malloc twice: VSZ 4, RSS 0. Touch A to 4 pages, fork: B's RSS 4, free frames unchanged (RSS double-counts shared). Touch B until out with swap off: OOM kills biggest RSS. Reset, swap on: kernel pushes coldest private page to disk, touching again is a major fault. -> A walks it as "what you'd see as you click".
- I18 Overcommit: kernel promises before checking; /proc/sys/vm/overcommit_memory: 0 heuristic default (refuses only obviously absurd, roughly single allocation bigger than RAM plus swap); 1 always (malloc 1 TB on a laptop succeeds); 2 strict (running total, refuses past swap plus RAM times overcommit_ratio/100, ratio default 50). -> A, three modes in talk; ratio said as "swap plus half of RAM by default".
- I19 Why bet: programs reserve far more than they use; each thread reserves 8 MB stack, touches a few KB; fork: 20 GB process forks to run a tiny shell command, strict needs another 20 GB though child throws it away with exec. -> B asks "why would anyone want this"; A.
- I20 Cost: more cheques than it can cash; no frame for the next faulting page; can't fail politely: a store instruction, no return value for NULL; kernel must make room now. -> A; B voices "why not return an error".
- F3 Figure 003 decision path: touch -> valid? runs; else fault -> in your region? else SIGSEGV -> need new frame? else map cached page (minor) -> free frame? zero/copy minor, disk read major -> reclaim clean file pages -> write anon pages to swap -> OOM killer SIGKILL. -> A as a spoken flowchart.
- I21 File-backed pages: copy of something on disk (python3 code, shared libs, files read or mmapped); page cache (kernel's in-RAM copy of recently read/written file data, shared, grows into free RAM, shrinks when needed); clean pages can just be dropped. -> A.
- I22 Anonymous pages: no file behind them: heap, stack, NumPy arrays, torch.load CPU tensors; only freed by writing to swap (disk partition, file, or compressed RAM like zram; touching later = major fault); no swap or full -> can't be reclaimed until freed or process dies. -> A.
- I23 free -h: "free" = nobody using, often small because page cache fills idle RAM; "available" = estimate of what could be handed out without swapping: free plus most of reclaimable cache; believe available. -> B asks about the free column; A.
- I24 OOM killer: scores every process, kills highest; /proc/pid/oom_score 0 to 1000; roughly fraction of memory used (RSS plus swap plus page tables) scaled to 1000, plus oom_score_adj from minus 1000 (never) to plus 1000 (first); blunt on purpose: biggest frees most with fewest deaths. -> A.
- I25 SIGKILL: signal 9, can't catch, block or clean up; exit code 137 = 128 + 9; why "Killed" and nothing else; dmesg or journalctl -k; line "Out of memory: Killed process ... (python3) total-vm (VSZ) ... anon-rss ..."; real shape, illustrative numbers. -> A; B connects to 137.
- I26 systemd-oomd: userspace daemon on Ubuntu-based systems, watches pressure, may kill whole group (terminal session, service) before kernel's killer; if dmesg is silent check its journal; whether DGX OS enables it, check with systemctl status. -> A.
- I27 cgroup: control group, limits/measures a set of processes; Docker and systemd built on it; cgroup v2: memory.max, memory.current, memory.events. Over limit: group reclaims its own, then OOM killer on only that group; log says "Memory cgroup out of memory". -> A.
- I28 Docker --memory=512m = cgroup with memory.max 512 MB; safe OOM. Trip-ups: page cache from files read inside counts (reclaimable, squeezed); kernel only charges resident: a 512 MB container can still malloc 100 GB. -> A, B asks "so the limit is on malloc?" wrong model.
- I29 fork: copying 20 GB would take seconds; copies page table, marks every writable page read-only in both. Reads free; first write by either faults; kernel sees copy-on-write page, copies that one page, gives writer the copy writable, resumes. Only differing pages duplicated. Beautiful for C, nasty edge for Python. -> A; prereq re-explained.
- PR2 Predict cow-read: list of 5 million Python ints (about 200 MB of objects), fork, child only reads (for x in L: pass). How much copied? Nearly all: every Python object has a refcount; binding x increments, moving on decrements; each is a write to the page with the header; densely packed so every page written, copied. Reading a Python object is a write. NumPy: one raw buffer, one header; A.sum() reads, writes nothing, stays shared. Mac numbers: list iteration 22,076 faults (about 345 MB of pages; macOS faults to map and often again to copy, so overcounts); NumPy sum about 2,500 faults on macOS (lazily maps pages even for reads), should be close to zero copies on Linux; Spark measures copies directly. -> A asks, B says "nothing, it's only reading" (wrong), reveal.
- F4 Figure 004: parent left, child (DataLoader worker) right, frames middle; NumPy buffer pages dashed shared both sides, stay shared; Python int page with refcount, child's refcount += 1 -> copy F31, 4-16 KB copied for an 8-byte change; parent's frame now private. -> A describes.
- I30 DataLoader "leak" that isn't: list of a million dicts of strings, num_workers=8, over first epoch memory climbs to roughly 9x dataset; each worker copies pages it touches; top shows big RSS. -> A.
- I31 RSS counts shared pages in every process, so summing overcounts, especially right after fork; PSS (proportional set size: shared page divided by number of sharers; summing gives true total; /proc/PID/smaps_rollup); honest cost = private dirty. But growth over the epoch is real. -> B voices "add up RSS", A corrects both ways.
- I32 Fix: keep data out of millions of Python objects: NumPy arrays, Arrow tables, memory-mapped file; raw buffers stay shared. Twist: only with fork; spawn or forkserver pickle and fully copy up front; Python 3.14 changed Linux default from fork to forkserver; check multiprocessing_context and get_start_method. -> A.
- I33 mmap with a file: region whose pages are the file's page-cache pages; touch byte 4,000,000 -> byte 4,000,000 of file; first time major or minor, then normal load. -> A.
- I34 Weights: safetensors loaded with mmap costs no anonymous memory; clean file pages; count in RSS as file-rss; shared with other processes mapping the file; under pressure dropped not killed. torch.load without mmap: file into fresh anonymous memory; 70 GB exists twice, page cache and heap; only cache copy reclaimable. -> A.
- I35 Unified memory: normal workstation GPU has own VRAM; .to("cuda") copies over PCIe; out of VRAM -> CUDA out of memory, catchable exception; system RAM different pool, different killer. -> B voices "GPU has its own memory" model; A agrees for normal boxes.
- I36 Spark GB10: CPU and GPU share one pool, 128 GB LPDDR5x, about 273 GB/s (spec-sheet); no separate VRAM; cudaMalloc and Python malloc from same frames; Linux sees all as system RAM, GPU driver allocates from it; a bit under 128 GB shows in free (firmware/kernel reserve). -> A.
- F5 Figure 005: naive: OS about 8 + 70 anon + 70 GPU = 148 GB peak > 128, OOM; page cache squeezed out but two 70 GB anonymous copies can't fit. mmap: one reclaimable file-backed copy plus one GPU copy at peak; as each tensor moves to GPU its file pages can be dropped. Sizes approximate. -> A describes two bars.
- I37 Opening scene explained: torch.load filled page cache and copied to 70 GB anon; available covered it, kernel dropped cache; .to("cuda") allocated from same pool while CPU copy existed; past 115 GB anon plus GPU, reclaim had nothing, little or no swap, OOM killer chose biggest score: you. cudaMalloc didn't fail politely because pressure lands on whole system. Caveat: when CUDA driver gives clean out of memory vs kernel kill depends on how driver allocates and pins on GB10; watch for both. -> A, B restates mysteries answered.
- I38 Fixes: never hold two full copies: mmap load (safetensors or torch.load mmap=True), move tensors one at a time so file pages drop; or load straight onto device (device_map, safetensors device cuda); or 4-bit weights about 35-40 GB leaving room for KV cache (memory-math lesson). -> A.

## Build It

- B0 Setup: ~/workbench/vm, Mac then Spark; Mac shows lazy allocation and faults with 16 KB pages; Spark shows /proc accounting, overcommit, cgroups, OOM killer. Venv with NumPy; probe module reporting RSS, VSZ, fault counts (/proc/self/status on Linux incl. anonymous vs file vs shared RSS and page-table size; ps on macOS; getrusage for minor/major faults). Record getconf PAGESIZE, overcommit_memory (expect 0), free -h and swapon --show. macOS VSZ starts absurd (about 466 GB for bare Python) due to shared region; watch changes. -> A, setup in a few sentences.
- B1 lazy.py: reserve 100 GB anonymous private mapping; touch one byte per page of 2 GB; touch again, compare. Part that matters: pass private+anonymous flags (Python's default for -1 is shared, accounted as shared memory); step by the page size not 4096 (on Mac 4096 touches each 16 KB page four times, faults once); faults should be almost exactly bytes / page size. NumPy version: 4 GB np.empty, fill twice, microseconds per fault. Spark: reserve 200 GB with mode 0 refused (Cannot allocate memory), 100 GB fine. -> A, "here's what you'd build... you'd see".
- B2 cow.py: parent builds list of 5 million big ints (above small-int cache, real objects) and NumPy array; fork children: nothing, A.sum(), iterate list, A.copy() control; measure faults and Private_Dirty from smaps_rollup on Linux. os._exit not sys.exit (cleanup writes). Expect A.sum near 0 MB, list about 5 M x (32 + 8 bytes) about 200 MB. Bonus gc.freeze: stops GC writing headers, but ints aren't tracked and refcounts still change. -> A, B predicts gc.freeze.
- B3 hog.py in Spark container, never bare host (global killer might take SSH session, desktop, training job): allocate 50 MB touched chunks (bytearray zero-filled is touched), keep them, print held plus memory.current and memory.max, flush. docker run -m 512m with memory-swap equal (no swap in box, fast kill); check exit code, OOMKilled flag, dmesg cgroup line. Slow copy with half-second sleep, watch oom_score climb from host. systemd-run alternative. Agent reviews for escape (e.g. big files to mounted host folder). -> A.
- B4 Fake model: about 16 GB safetensors of random bf16 (64 tensors of 128 MB); load into anonymous memory vs mmap-style; compare anonymous vs file RSS; vmstat 1 cache and swap in/out columns; second load faster because of page cache (files-and-disks lesson); GPU half: move one at a time, watch free -h; nvidia-smi may not report normal memory figure on Spark. -> A.
- B5 Done when: 100 GB instantly both machines, VSZ jump no RSS; RSS climbs with faults about bytes / page size; microseconds per fault for each machine; cow shows sum shared and list copying within about 25% of prediction on Spark; seen 137, OOMKilled true, cgroup line, oom_score climbing; can say anon vs file for fake load and why. -> folded into Build It / Measure talk.

## Measure

- M1 Reference Mac numbers: mmap 100 GB instant, RSS 16 MB before and after, VSZ +100 GB; np.zeros 100 GB 0.11 ms, RSS 28 MB; touch 2 GB one byte per 16 KB page: 131,074 minor faults (vs 131,072), RSS to 2,064 MB, 0.15 s; again: no new faults to speak of, 0.11 s (loop dominates); NumPy 4 GB numbers; forked child nothing / A.sum / list: 26 / 2,553 / 22,076 faults. -> A, selected aloud with meaning.
- M2 Reserving free, touching costs; faults about bytes / page size proves one page at a time. -> A.
- M3 Minor fault about half a microsecond to a microsecond; 70 GB fresh with 4 KB pages about 18 million faults, about 9 seconds of pure fault handling; 64 KB pages 1.1 million faults; compare the Spark. -> A, B works the arithmetic.
- M4 COW about writes, Python reads are writes: on Linux A.sum copies essentially nothing; list about 200 MB; A.copy allocates 40 MB of new anonymous memory, not a COW, check which counter. -> A.
- M5 Hog dies near 512 MB, not exactly: interpreter's pages and page cache count; last memory.current within one chunk of memory.max. -> A.

## Break It

- K1 zeros vs ones in 512 MB container, 10 GB: zeros survives holding almost nothing; ones dies; same size same call, ones writes every byte, charged; question is how much touched. -> "what if" exchange.
- K2 Preferred victim: two hogs in 1 GB container, one sets oom_score_adj 1000 (raising needs no privilege, lowering does); adjusted one dies first even when smaller; how systemd and Kubernetes steer the killer. -> exchange.
- K3 Thrash: -m 512m --memory-swap 2g (512 MB RAM, 1.5 GB swap), cycle through chunks reading one byte per page; no quick death, slower and slower, vmstat swap columns pegged; thrashing (pages keep going to swap and back, machine moves pages instead of computing; usually worse than being killed); why ML boxes run little or no swap: clean kill better than training at 1% speed for hours; needs swap on host. -> exchange, B surprised killing is preferred.
- K4 Fake leak: 8 children iterate then sleep; sum RSS vs sum PSS vs free's change; RSS overcounts, PSS and free agree; NumPy array growth vanishes. -> exchange.

## Explain It Back (substance must appear)

- E1 Virtual memory: fake addresses, MMU translates page by page using per-process table with TLB; buys isolation (only frames your table points to), illusion of huge contiguous memory, laziness (promise now, back later, share, push to disk invisibly). -> A spells out the three things it buys, near the TLB/lazy part or close.
- E2 VSZ 300 GB / RSS 4 GB on 128 GB: not a problem; VSZ = stacks, big mmap, allocator arenas, CUDA reservations; watch RSS (better PSS/private), its anonymous part, growth over time; VSZ matters only under mode 2. -> B asks about a scary top reading; A.
- E3 Killed walk-through: as I37 plus confirm with dmesg anon-rss line; fixes plus test risky loads inside a cgroup. -> covered across I37/I38/B3 plus explicit "test inside a box".
- E4 DataLoader: covered by I30-I32, plus "keep only file paths and offsets in Python". -> A adds.
- E5 Scaling 1/10/100 GB, 4 KB vs 64 KB: RSS linear whatever page size; faults 26 million vs 1.6 million for 100 GB, about 13 s vs under one; page tables about 200 MB vs about 13 MB; TLB reach 6 MB vs 96 MB; big-page costs: waste for small allocations (one-byte touch costs a page), more copying per COW fault; why big-memory systems lean to huge pages. -> A with B, as the "how does it scale" exchange late in the episode.

## Go Deeper / Connections

- G1 Best sources: OSTEP paging chapters; Drepper "What every programmer should know about memory". -> one sentence.
- C1 Connections: files-and-disks picks up page cache and mmap (why second load faster); memory-math turns "will it fit" into arithmetic; containers: the 512 MB box is most of a container. -> one sentence.

## Flow

1. Problem scene (P1-P5), B voices the three confusions.
2. Origin as story (O1-O3).
3. Hotel -> real names -> callback to strip (I1-I4).
4. Pages, page sizes, offset/page number, figure 1, page table tree, threads share, TLB, reach, huge pages (I5-I13).
5. Lazy allocation, Predict 1, what virtual memory buys (I14, PR1, E1).
6. Page faults, three cases, fault cost, interactive figure (I15-I17, F2).
7. Overcommit, why bet, cost; decision path; reclaim; free vs available; OOM score; SIGKILL/137; oomd (I18-I26, F3), E2 inserted after VSZ discussion.
8. cgroups (I27-I28).
9. fork/COW, Predict 2, figure 4, DataLoader, PSS, fixes, start method (I29-I32).
10. mmap, unified memory, 70B load explained, fixes (I33-I38, F5).
11. Build It walk (B0-B5) woven with Measure (M1-M5).
12. Break It (K1-K4).
13. Scaling exchange (E5), Go Deeper, connections.
14. Close: B restates, A sharpens.
