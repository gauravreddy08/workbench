# Outline: files-and-disks

Source: src/lessons/files-and-disks.mdx. Curriculum entry: "What happens when you save a file?"
Question: what actually happens between file.write() and the bytes being safe on disk? Why: fast model
loading (safetensors, mmap) and data that survives a crash both depend on it.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).
Diagnostic gaps touched: Numbers (RAM vs SSD, bytes, bandwidth) and OS basics (kernel, syscalls).
B voices the natural wrong models: "write returned, so it's saved", "kill -9 loses everything not on
disk", "fsync is slow because of the bytes", "mmap is just a faster disk", "rename moves the data".

## Today / prerequisites

- T1 Prereq recaps: SSD random 4 KB read is tens of microseconds (about 50-100), sequential several GB/s; page cache was mentioned before; pages and page faults and mmap come from virtual memory; file descriptors from the processes lesson. -> A re-explains each briefly at the point it is needed, never as a list.

## The Problem

- P1 Scene: cross-encoder training 9 hours, torch.save every 1,000 steps to ckpt.pt; at step 37,000 preempted / power loss / Ctrl-C twice. -> A opens on this, first line.
- P2 Restart: "failed finding central directory" error; there was only ever one file, the in-flight save overwrote it halfway; 36,000 gone, 37,000 never finished; nine hours to zero. -> A says the error in words, B reacts with the wrong model ("but the old one was fine a second ago").
- P3 Puzzling half: 8B model from safetensors "loads" in 40 ms, impossible since 16 GB at 7 GB/s is over two seconds; fresh process first forward pass fast, Monday morning slow again; torch.load takes twice the RAM. -> A, as the second mystery; B does the arithmetic.
- P4 Same root: four layers of memory between f.write and flash, each owned by someone different, each lying a little; same layers backwards decide load speed. -> A, the promise of the episode.

## Origin

- O1 Early 2009, Ubuntu testers on new ext4 lose files after crashes: config files KDE and GNOME had just rewritten exist with right name, zero bytes. -> A as story.
- O2 Programs did write config.tmp then rename to config; safe on ext3 because ext3 wrote data before recording rename. -> A.
- O3 Term delayed allocation: filesystem waits (often 30 s or more) before deciding where new data goes, to group writes into big contiguous chunks; held data in memory longer; tiny rename reached disk first; crash = new name, no data. -> A explains in plain words then names it.
- O4 Ted Ts'o: POSIX never promised it; call fsync; apps relying on luck; he was right AND added a heuristic forcing data out before such a rename because millions of programs would never be fixed. -> A; B amused at "right and fixed it anyway".
- O5 Pillai et al., OSDI 2014: a dozen popular programs incl. databases and version control, crash bugs of this kind in almost all; saving a file correctly is hard. -> A.

## The Idea: a file is a name, a number and some blocks

- I1 Three things on disk: data in blocks (usually 4 KB; 10 KB file takes three blocks) scattered; inode (size, owner, permissions, timestamps, block list, everything except name); directory entry (name -> inode number, e.g. 8812); directory is a little file of name-inode pairs. -> A, B asks where the name lives.
- I2 Name and data separate on purpose: rename rewrites only a directory entry, moves no data, why renaming 30 GB is instant; hold on to it. -> B voices "rename moves the data" wrong model; A corrects.
- I3 Kernel (only program allowed to talk to hardware), system call (request to the kernel; CPU switches to privileged mode, does work, switches back; syscall). -> A, inline.
- I4 open: kernel finds/creates inode, sets up open-file record (which file, position, can you write), returns file descriptor: small integer; 0, 1, 2 are stdin, stdout, stderr, so first file usually 3; later write/read/close pass it. -> A; recap of fd from processes lesson.
- F1 Figure 001: process holds only the number; across the boundary: open-file record (position zero, mode write), inode 8812 with blocks 91, 92, 517, directory entry pointing at it; rename changes only directory entry. -> A describes it like a diagram over the phone.
- I5 Syscall cost: M4 Pro, unbuffered one-byte write from Python about 1.8 µs (mostly syscall plus Python overhead) vs about 40 ns appending to own buffer; thousands of times more (lesson's words); why layer 1 exists. -> A with numbers in words.

## Layer 1: Python buffer

- L1 f.write in binary mode: no syscall, copies into a buffer in your process; buffer = chunk of memory where data collects so many small writes become one. Flushed when full (Python 3.14 default 128 KB, older 8 KB, io.DEFAULT_BUFFER_SIZE), or on flush/close: one real write syscall. -> A.
- L2 Bytes in your process's RAM; process dies, they die. torch.save writes through a buffer like this too. -> A.

## Layer 2: page cache

- L3 Python calls write with fd 3 and 128 KB; kernel copies into page cache (kernel's copy of file data in otherwise unused RAM), marks pages dirty (changed, not yet on disk; clean pages can be thrown away), returns. -> A.
- L4 Single most important fact: write returning means "the kernel has a copy", not "it's on disk". -> B voices "it returned, so it's saved"; A corrects, slowly.
- L5 Writeback: kernel's background job, Linux within about 30 s (dirty_expire_centisecs 3000 typical; check yours), sooner if lots of memory dirty. -> A, says the setting name in plain words.
- L6 Why lie: writes return in microseconds; ten writes to same block send only last; small writes merged into big ones the drive loves; read-after-write from RAM. -> A.
- L7 Page cache belongs to kernel: if process is killed, data already in page cache survives and is written back; kill -9 only destroys what's inside the process; power cut wipes it (RAM). -> B wrong model "kill -9 means anything not on disk is gone"; A corrects.

## Layers 3 and 4

- L8 SSDs have small DRAM, may acknowledge once there before programming flash; volatile. Power-loss protection: capacitors on datacenter drives to flush on power loss; consumer drives usually don't. -> A.
- L9 Four places, only last survives a power cut. -> A.
- F2 Figure 002 interactive: four rows (Python buffer, page cache, drive cache, NAND flash); buttons write, flush, fsync, full fsync, wait, kill -9, power cut; Linux/macOS switch; hollow blue dirty in RAM, grey clean cached, solid blue on flash; kill -9 wipes top layer only; power cut wipes everything but flash; Mac fsync stops at drive cache. -> A describes what you'd see as you press buttons.
- F2a Try: three chunks then kill -9: buffer filled and flushed, chunks in page cache survive, wait shows dead process data reaching flash. -> A walks it.
- F2b One chunk then kill -9: still in Python buffer, lost even though f.write returned. -> A.
- F2c Write, flush, power cut: write said success, lost everything. -> A.
- F2d Write two then fsync without flush: fsync covers only what kernel has, can't see Python's buffer; flush first. -> B asks, A answers.

## fsync

- S1 fsync: blocks until kernel wrote every dirty page of the file to drive and drive says stable; on Linux includes "flush your cache" command; only when it returns without error is data durable (survives crash or power loss; the D in ACID). -> A.
- S2 fdatasync skips metadata not needed to read data back (modified time), can save a write; Linux has it, macOS doesn't expose in Python. O_SYNC/O_DSYNC flags on open make every write act as if followed by fsync. -> A, brief.
- S3 Measured M4 Pro Mac, APFS, 1,000 x 4 KB: write only about 4 µs (1x); write + fsync about 35-40 µs (about 10x); write + F_FULLFSYNC about 3.9 ms (about 1,000x). -> A, three numbers with comparison; B: "a thousand times?"
- S4 macOS gotcha: fsync sends data to drive but doesn't tell drive to flush its cache (the drive cache row); Apple's man page says so; separate fcntl F_FULLFSYNC goes all the way; that's the expensive one; SQLite uses it when asked to be fully durable; Python os.fsync on macOS calls plain fsync. -> B wrong model "so the Mac's fsync is just broken / faster"; A explains.
- S5 Linux fsync includes cache flush (normal setups), honest one; cost tens of µs (datacenter NVMe with power-loss protection can ack from cache) to several ms (consumer drives programming flash); measure the Spark. -> A.
- PR1 Predict: 2 GB checkpoint every 10 min plus one fsync: almost nothing; fsync of 2 GB about as long as writing 2 GB, 0.5-1 s at a few GB/s, every 10 min, under 0.2%; bytes had to reach drive anyway. -> A asks, B guesses (expects big), reveal.
- PR2 Logger 200-byte line per step, 50 steps/s, fsync each at about 3 ms: 50 x 3 ms = 150 ms of every second, 15% of the loop; fsync cost is per call (round trip plus cache flush), not per byte; batch: every N lines or every second, decide how many lines you'll lose. -> B works it out; A names the lesson.

## Saving a file so no crash can break it

- A1 torch.save opens "wb", truncates (cuts file to zero, throwing away contents) immediately, writes over next few seconds; any crash, even kill -9, leaves half a file and no old one. -> A.
- A2 Author's test: 1 GB checkpoint on Mac killed 150 ms into save; file 264 MB; torch.load fails "central directory"; .pt is a zip whose index lives at the very end, never written. -> A.
- A3 Fix uses rename: POSIX promises rename over existing name is atomic (all at once or not at all; anyone opening gets old or new, never a mix). -> A.
- A4 Step 1: write to temp file in the same directory (ckpt.pt.tmp); rename only atomic within one filesystem. -> A.
- A5 Step 2: flush then fsync; new data durable but no official name. -> A.
- A6 Step 3: os.replace temp over real; name points to new data in one step; os.replace is Python's rename that overwrites on every OS. -> A.
- A7 Step 4: open the directory and fsync it; rename is a change to directory contents, lives in page cache; without it a power cut right after step 3 brings back the old name. -> B asks "fsync a directory?"; A.
- A8 Step 2 is the one the 2009 programs skipped; step 4 the one almost everyone skips. -> A.
- F3 Figure 003 interactive: three recipes (write in place, temp + rename, full recipe); slider for crash point; kill -9 vs power cut. Write in place breaks on both (empty after open, torn half, tail missing while still in buffer; power cut = unknown, could be anything; finishing is lucky timing). Temp + rename survives kill -9 everywhere, but power cut right after the rename can give new name pointing at missing data. Full recipe safe at every point; worst case wake up on old checkpoint, whole; between fsync and rename the new data is complete, durable, unnamed. -> A walks the slider.
- A9 Pattern: against kill -9, rename alone is enough (page cache survives dead process); against power loss need the fsyncs. Preemption and OOM kills are like kill -9; node losing power or kernel panic is like power cut; want both. -> B states the pattern, A extends with real causes.

## Journaling

- J1 A single growing write changes data blocks, inode (new size, block list), free-block bitmap; crash halfway can leave inode pointing at blocks also marked free: corrupts filesystem, not just file. Old fix fsck scanned whole disk after every crash, hours on big disks. -> A.
- J2 Journal: reserved area where filesystem first writes what it's about to change, after crash finishes or ignores half-done changes; same idea databases call write-ahead log (describe change, make durable, then change in place; log tells you what to redo). -> A.
- F4 Figure 004: log intent, commit record flushed, apply real inode and bitmap, free journal space; crash before commit = ignored, as if never started; after commit = replayed on mount; replaying twice harmless (same values same places). -> A tells as four steps; B asks about replaying twice.
- J3 Most journals cover metadata, not data: ext4 default data=ordered journals inode, bitmaps, directories, makes data blocks written before the metadata pointing at them is committed; doesn't journal checkpoint contents; keeps filesystem from corruption, not your file from being half-written. -> B wrong model "journaling filesystem so I'm safe"; A corrects.
- J4 Copy-on-write filesystems: APFS, Btrfs, ZFS never overwrite in place, write new version then atomically swap a pointer; the temp-and-rename trick at block level. Spark root is ext4 on standard DGX OS (check with df -T); Mac is APFS. -> A.

## What an SSD does with a write

- D1 Recap: SSD is NAND flash (cell traps charge without power; reading senses; writing pushes charge in; only erasing takes it out); random 4 KB read tens of µs; small computer inside. -> A.
- D2 Rule 1: read and write in pages, a few KB to 16 KB. -> A.
- D3 Rule 2: only write an empty page, no overwrite; writing is called programming, hundreds of µs to a couple ms per page, several times longer than a read. -> A.
- D4 Rule 3: empty pages only a whole block at a time; block is hundreds of pages, several MB; erase takes ms; each block survives on the order of a thousand or a few thousand erases (common consumer flash). -> A.
- D5 FTL: firmware map from computer's addresses to physical pages; "overwrite block 7" -> writes to an empty page, updates map (address 7 now at block 2 page 5), marks old page stale; computer sees overwritable disk, nothing ever overwritten underneath. -> B "so how do you overwrite anything?"; A.
- F5 Figure 005: map in drive DRAM; three blocks, one full of mostly stale with three live, one filling, one erased; GC copies three live pages out then erases; read tens of µs, program hundreds of µs to ms, erase ms and wears; drive hides most with parallelism. -> A describes.
- D6 Garbage collection: when low on empty pages, pick mostly stale block, copy its few live pages elsewhere, erase. Copies are writes you never asked for. Write amplification: bytes written to flash over bytes sent; 1.0 perfect; eats speed and lifespan. -> A.
- D7 Big sequential writes favourite: fill whole blocks with data that goes stale together, GC erases with no copying; a checkpoint is the ideal write. -> A.
- D8 Small random overwrites worst: strand stale pages in many blocks, every erase drags copies. -> A.
- D9 Full drive slower: fewer good choices; leave free space. -> A.
- D10 Deleting tells the drive nothing unless OS sends TRIM ("these addresses hold nothing useful", treat as stale, no copying); modern OSes do automatically or scheduled. -> B asks what delete does; A.

## Sequential vs random

- R1 Random 4 KB read about 50-100 µs, drive does several GB/s with big or many requests; reads and writes both. -> A.
- R2 Readahead: kernel notices sequential reading, fetches next chunks before you ask. Cold sequential reads near drive peak. -> A.
- R3 Mac: cold 269 MB model file with big reads about 6.6 GB/s; warm from page cache about 17 GB/s, memory copy speed. Bridge to loading. -> A.

## read() and mmap

- M1 read: kernel copies bytes from page cache into your buffer (reads from drive first if not cached): two copies, page cache (kernel's, clean, droppable) and yours (private). -> A.
- M2 mmap: make a range of your virtual address space (private range of addresses a process sees, each page backed by RAM, a file, or nothing yet) be the file; no data moves; first touch, CPU finds no mapping, page fault (trap into kernel; kernel finds/reads file page; code continues); kernel points the address at the page-cache page. One copy: page cache is your data. -> A with brief virtual memory recap.
- M3 Loading becomes instant: mmap of 16 GB returns in microseconds, did nothing; cost moves to first touch, spread over forward pass. -> A; ties to the 40 ms mystery.
- M4 Several processes share one copy (two inference workers both point at same page-cache pages); with read each gets private copy. -> A.
- M5 Gentler under memory pressure: mapped pages are clean copies, kernel can drop and re-read; read copy must be kept or swapped (written somewhere first). -> A.
- M6 Cost: one big sequential read becomes many small page faults; cheap when cached; cold can be slower than one big read because drive gets a trickle of small requests. -> B wrong model "mmap is just faster"; A sets up the twist.

## torch.load vs safetensors

- K1 .pt is a zip (unzip -l): data.pkl, a pickle (Python's object-to-bytes format; unpickling runs instructions that can call any function) describing structure (dict of names to tensors, dtype, shape, which storage), plus data/0, data/1 raw bytes. torch.load unpickles, allocates and copies each storage: page cache copy plus your own copy. -> A.
- K2 Pickle can run arbitrary code: "call os.system with this string"; loading a stranger's .pt was for years running their script. Since PyTorch 2.6 torch.load defaults to weights_only=True: allowlist of tensor-ish types, refuses else; you'll watch it refuse; weights_only=False turns danger back on. -> B surprised; A.
- K3 safetensors deliberately boring: eight bytes saying header length, JSON header (name, dtype, shape, byte offsets), raw bytes packed. No code; worst is lying about shapes, which loader checks. Each tensor a byte range at known offset, so loader mmaps and hands tensors pointing into mapping: "zero-copy"; why transformers loads safetensors by default. -> A.
- F6 Figure 006: two lanes; torch.load: SSD -> page cache (copy 1) -> memcpy -> heap (copy 2), plus unpickle runs instructions; safetensors: SSD -> page cache (only copy) on first touch, tensors are addresses pointing at it; JSON header, no code. -> A describes.
- K4 Caveat 1: torch.load(path, mmap=True) exists since PyTorch 2.1, same lazy mapped loading for .pt; real advantages of safetensors are safety and simple documented layout any language can read, read one tensor without parsing the rest. -> A.
- K5 Caveat 2: tensors must go to compute; .to cuda copies into GPU memory regardless. mmap saves the extra CPU-side copy and its time: discrete GPU page cache -> GPU instead of page cache -> heap -> GPU. Spark GPU shares memory with CPU: measure, don't assume. -> B asks "doesn't it all go to the GPU anyway?"; A.

## Cold and warm

- C1 First load reads from SSD into page cache: cold. Later loads in any process find pages cached: warm, memory speed. Pages stay until kernel needs RAM or reboot. Linux and macOS use most "free" RAM as page cache; free -h buff/cache number on Spark. -> A; explains Monday morning.
- C2 Benchmarks must say which; 40 ms load of 8B is mmap that touched nothing; honest cold cost of 16 GB is a few seconds, at load or during first forward pass. -> A closes the opening mystery.
- PR3 Predict: 2.1 GB bf16 state dict on M4 Pro, four ways (torch.load cold/warm, safetensors load_file cold/warm), rank; SSD about 6.6 GB/s, memory copies 10-17 GB/s. Answer: safetensors warm about 100 ms (12 ms load, about 90 ms touch and sum); torch.load warm about 300 ms (about 230 load + 70 sum; extra 200 ms memcpy at about 10 GB/s); torch.load cold about 0.5-0.7 s (big sequential reads near SSD speed); safetensors cold about 1.8-2.7 s, the surprise ("load" 50-70 ms then page faulting in small pieces under 1 GB/s). mmap wins warm, shared, or partial; cold reading everything on macOS, few huge reads beat a few hundred thousand page faults; Linux readahead may close gap, a Spark measurement. -> A asks, B ranks mmap first in both (wrong), reveal.

## Build It

- B0 Setup: ~/workbench/disk, venv with torch, safetensors, huggingface_hub; SmolLM2 135M Instruct, 269 MB bf16; prep script makes .pt and .safetensors of it and a synthetic 2.1 GB (64 tensors of 4096 by 4096 bf16, 32 MB each). Mac first then Spark. -> A, one or two sentences.
- B1 Hard part: cold file on demand. Linux: drop whole page cache (sync then write 3 to drop_caches with sudo) or without root open, fsync, posix_fadvise DONTNEED to drop that file's clean pages. macOS: sudo purge, or without sudo copy with caching off (F_NOCACHE on both ends, full fsync at end). Check: read copy twice, first near SSD speed, second faster (6.6 then 17 GB/s). -> A, described by what it does.
- B2 Task 1: 200,000 one-byte writes buffered vs buffering=0; predict ratio; 40 ns vs 1.8 µs, about 45x. -> A.
- B3 strace on Spark: openat of out.txt with write, create, truncate flags returns 3; one write of 12 bytes "hello world"; close; two f.write calls, one write syscall = buffer; O_TRUNC is the flag that destroyed the checkpoint; no fsync. Rerun with fsync, flush, os.replace and find each; trace torch.save and count writes. Mac dtruss blocked by System Integrity Protection; use Spark. -> A describes what you'd see.
- B4 Task 2 fsync_bench: 1,000 x 4 KB with raw os.write in four modes (none, fsync, fdatasync Linux only, F_FULLFSYNC macOS only); raw os.open so no Python buffer. Second experiment: 512 MB in one write, time flush and fsync separately: where does time go, differs by machine? -> A.
- B5 Task 3 crash: saver builds about 1 GB state dict (256 x 4 MB fp32) saves naive or atomic; crash script makes good checkpoint, starts second save, waits for "ready", sleeps a delay, SIGKILL; prints sizes, tries load. Hints: torch.save takes open file; fsync directory via os.open read-only. Delays 0.05 to 1 s; find window naive breaks. Power-cut column stays thought experiment. -> A.
- B6 Task 4 load four ways (torch.load, torch.load mmap, load_file, one tensor via safe_open), time load and touch, peak RSS (bytes on macOS, kilobytes on Linux); driver makes cold, runs cold then warm; fresh process each, else second inherits cache and imports. Predict smallest load, smallest load+touch cold, warm. -> A.
- B7 Task 5 look inside: unzip -l, data.pkl and data/N; pickletools shows instructions (GLOBAL, REDUCE). Read safetensors header with stdlib: first 8 bytes little-endian unsigned 64-bit integer, then JSON. SmolLM2 first tensor model.embed_tokens.weight, BF16, shape 49,152 by 576, bytes 0 to 56,623,104; check 49,152 x 576 x 2 = 56,623,104. -> A, check said as words.
- B8 Trapdoor: class whose reduce returns os.system "echo pwned"; torch.save with a tensor; default load raises UnpicklingError; weights_only=False prints pwned: file ran shell command inside your process. Only your own file. -> A; B reacts.
- B9 Task 6 Spark: rsync over Tailscale, regenerate big files; rerun; note filesystem (df -T), page size (ARM64 Linux 4 KB or 64 KB; macOS Apple silicon 16 KB), dirty_expire_centisecs; agent review for unfair comparisons (warm when supposed cold, imports counted in one not other, RSS units). -> A.
- B10 Done when: traced write on Spark (openat, single write, fsync); fsync_bench numbers both machines and explain macOS two fsyncs; broke naive save, atomic survived every delay; loading table filled and can explain mmap-slower row. -> A folds into Spark section; not read as list.

## Measure

- E1 Setup: M4 Pro MacBook Pro, macOS APFS, internal SSD, 48 GB RAM, Python 3.14, PyTorch 2.14; numbers differ, shape shouldn't. -> A, one line.
- E2 Buffered vs unbuffered about 45x: syscall boundary; buffer pays once per 128 KB. -> A.
- E3 write only about 4 µs for 4 KB: syscall plus 4 KB copy into page cache, never waited for SSD; compare 50-100 µs for SSD to even read a page. -> A.
- E4 Mac fsync about 10x, F_FULLFSYNC about 1,000x; on Spark tens of µs = very fast drive or protected cache; ms = doing what F_FULLFSYNC does. -> A.
- E5 Big write: one 512 MB write took about 0.1-0.25 s, fsync after only a few ms (F_FULLFSYNC 50-80 ms): data already streaming out during the write; Linux may split differently. -> A.
- E6 Crash: naive file 264 MB of 1.07 GB; every byte handed to write before death was there, nothing after: page-cache-survives-kill made visible; zip index missing, load failed. Atomic: partial .tmp of 487 MB and good ckpt.pt (1.07 GB, 256 tensors); on startup delete stray .tmp. -> A; B connects it.
- E7 Warm: mmap loads about 100 ms for 2.1 GB, about time to sum once; torch.load adds about 200 ms memcpy; at 16 GB about 1.5 s and 16 GB private RAM per process. torch.load mmap=True: cold 1.3-2.0 s, warm about 0.1 s. -> A.
- E8 Cold: mmap loses; page faults under 1 GB/s vs torch.load big reads 3-5 GB/s. mmap is not "faster disk", it's "no copy, and lazy". Libraries tell kernel what's coming (madvise WILLNEED or SEQUENTIAL) or just read the file. Check Spark readahead. -> A, B's earlier wrong model closed.
- E9 One tensor via safe_open cold: about 1 ms plus 20-50 ms to touch; warm about 5 ms. -> A.
- E10 Peak RSS same for every full load (about 2.4 GB): RSS (resident set size: how much of process memory in physical RAM, counts touched mapped file pages). Difference is kind: mapped pages clean and shared, droppable; torch.load's private. Two torch.load workers = 2 x 2.1 GB plus page cache; two mmap workers = one page cache's worth. One tensor: only its pages, about 320 MB mostly PyTorch itself. -> B "so the memory is the same, what's the point?"; A.

## Break It

- K-1 fsync before flush: still "works" in every test; last chunk in Python buffer not durable at rename; Figure 002 write two, fsync, power cut; layers model catches what testing doesn't. -> "what if" exchange.
- K-2 Temp file in /tmp: different filesystem (often RAM-backed tmpfs), os.replace fails "Invalid cross-device link" (error 18); shutil.move "fixes" by copying and deleting, not atomic, back to writing in place. Keep temp next to target. -> exchange.
- K-3 Ignore fsync error: dying drive, full disk, network filesystem lost server; page cache unknown state; 2018 PostgreSQL "fsyncgate": Linux could mark dirty pages clean after failed fsync, so retry succeeds without data written. Treat data as lost, redo from trusted copy; atomic_save should raise, not retry, never replace after failed fsync. -> B wrong instinct "retry it"; A.
- K-4 Benchmark page cache by accident: rerun cold without making cold; mmap "cold" collapses from seconds to about 100 ms, conclude mmap is magic; shutil.copy instead of cold copy still warm because writing put it in cache. Every "loads in 40 ms": cold or warm? -> exchange.

## Explain It Back (substance must appear)

- X1 f.write walk-through: buffer, write syscall to page cache dirty, writeback about 30 s, drive DRAM, flash; safe against power only after flush + fsync without error; macOS needs F_FULLFSYNC; against process crash safe once write returns. -> covered across layers; B's closing restatement.
- X2 Checkpoint recipe: temp in same dir, flush, fsync, replace, fsync dir; why each fsync; not /tmp; delete leftover temps on startup; many setups keep last two or three checkpoints, protects against bugs writing garbage checkpoint cleanly. -> the keep-last-few point said by A in the recipe section.
- X3 SSD small random vs sequential and full drive: no overwrite, page/block, FTL remap, GC copies, write amplification, sequential goes stale together, full drive fewer choices so copies more. -> SSD section.
- X4 torch.load vs safetensors and whether mmap is faster: zip+pickle copy twice, code exec, weights_only; safetensors header+bytes, mmap no second copy, shared; warm faster, partial wins, cold-all can be slower: 2.1 GB about 2 s vs about 0.6 s. -> loading section.
- X5 8 workers each loading same 16 GB: torch.load = 8 private copies, 128 GB plus page cache, doesn't fit most machines; mmap safetensors share one 16 GB copy, first worker pays cold read (a few seconds at a few GB/s), rest warm; to GPUs each GPU needs its own copy, host-to-device copy becomes startup cost; 50 workers many machines: each pays own cold read; 50 pulling 16 GB from shared network storage at once = 800 GB through one pipe, storage bottleneck; fixes local SSD caches per node, staggered starts, load once and broadcast over fast interconnect. -> A raises as a scenario in the loading section, B works part of it.

## Go Deeper / Connections

- G1 Best sources: OSTEP chapters (Files and Directories, Crash Consistency, Flash-based SSDs); Dan Luu "Files are hard". -> A one sentence near the end.
- N1 Connections: write-ahead log fsynced at commit is how databases make transactions durable (journal applied to rows); cold vs warm load is first check when inference server startup or first request is slow. -> A one or two sentences before the close.

## Flow

1. Problem (P1-P4) straight in with the nine-hour checkpoint, then the 40 ms mystery.
2. Origin (O1-O5).
3. File anatomy and syscalls (I1-I5, F1).
4. Layers 1-4 (L1-L9) with B's two wrong models, then Figure 002 walkthrough (F2).
5. fsync, Mac gotcha, Predict 1 (S1-S5, PR1, PR2).
6. Atomic save recipe, Figure 003, pattern, keep-last-few (A1-A9, X2 extra).
7. Journaling (J1-J4, F4).
8. SSD internals (D1-D10, F5), sequential vs random (R1-R3).
9. read vs mmap (M1-M6), torch.load vs safetensors (K1-K5, F6), cold and warm (C1-C2), Predict 2 (PR3), the 8-workers scenario (X5).
10. Build It (B0-B10) as "here's what you'd build, what you'd see".
11. Measure (E1-E10) folded with Build where natural.
12. Break It (K-1 to K-4).
13. Connections + sources (N1, G1), then B restates, A sharpens, stop.
