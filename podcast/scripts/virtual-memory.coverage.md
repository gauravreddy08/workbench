# Coverage: virtual-memory

Lesson src/lessons/virtual-memory.mdx vs podcast/scripts/virtual-memory.md. Item IDs match
podcast/outlines/virtual-memory.md. "Fixed" = was MISSING or wrong in the first draft and has been
added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs: strip, own address space, fork/workers | Hotel; fork | "Remember drawing one process's memory as a long strip"; "Quick reminder of where it sits" | covered |
| P1 70B, 140 GB bf16 > 128, 8-bit 70 GB, 115 available | Problem | "an eight-bit checkpoint instead, which is about seventy gigabytes" | covered |
| P2 four-line script | Problem | "Torch dot load to read the weights into memory, build the model..." | covered |
| P3 Killed, no traceback, 137, outside decided | Problem | "Something outside your process just decided it should stop existing" | covered |
| P4 three mysteries | Problem | "So who said no? And when?"; "Where'd the other forty-five go?"; "Why would moving stuff to the GPU use up memory" | covered |
| P5 addresses aren't real, fine print | Problem | "a story that the kernel and the CPU tell each process" | covered |
| O1 1950s drum, overlays, half their time | Origin | "They called those pieces overlays" | covered |
| O2 Atlas, Kilburn, 1962, one-level store | Origin | "That was nineteen sixty-two. They called it the one-level store" | covered |
| O3 fork cheap, overcommit bet, late 1990s killer | Origin | "Since the late nineteen nineties, Linux's answer" | covered |
| I1 hotel, 7 -> 212, 900,000 -> 31 | Hotel | "Guest A's room seven is really room two twelve" | covered |
| I2 reserved, assigned on first door | Hotel | "the desk writes 'reserved' in your book and assigns nothing" | covered |
| I3 virtual addresses, physical memory, MMU + kernel, page table | Hotel | "the M M U, the memory management unit" | covered |
| I4 strip = guest view; two guests two books | Hotel | "That's just two guests with two books" | covered |
| I5 pages 4 KB, frames, one entry per page | Pages | "called page frames, or just frames" | covered |
| I6 page sizes, Spark unknown, getconf, 16384 | Pages | "On the Mac it prints sixteen thousand three hundred eighty-four" | covered |
| I7 offset vs page number, 12 bits, offset kept | Pages | "byte one hundred of my page is byte one hundred of the frame" | covered |
| F1 figure 001 | Pages | "Across the top, one virtual address... No valid entry? Page fault." | covered |
| I8 PTE 8 bytes, present/writable/dirty (+user, accessed) | Pages | "a P T E. It's eight bytes" | covered |
| I9 flat 512 GB, 69 billion pages, tree, missing branches, KB-MB | Pages | "about sixty-nine billion possible pages... about five hundred twelve gigabytes. Per process." | covered |
| I10 100 GB -> 26 M PTEs, ~200 MB | Pages | "about twenty-six million page table entries" | covered |
| I11 threads share a tree | Pages | "Two threads, one book. Two processes, two books." | covered |
| I12 TLB, several times slower, few dozen / 1-few thousand | TLB | "a first level of a few dozen entries" | covered |
| I13 reach 6 MB vs 70 GB, huge pages 2 MB/1 GB, 512x, 3 GB, THP, 64 KB = 16x | TLB | "the same fifteen hundred entries now reach about three gigabytes" | covered |
| I14 mmap, note, no frames, VSZ vs RSS | Lazy | "What you have is a promise" | covered |
| PR1 Predict 100 GB np.zeros | Lazy | B guesses; "zero point one one milliseconds. R S S stayed at twenty-eight megabytes" | covered |
| I15 page fault mechanics | Page faults | "it raises a page fault. That's a hardware exception" | covered |
| I16 three cases, SIGSEGV/minor/major, costs | Page faults | "Case one... Case two... Case three" | covered |
| I17 4 GB fill numbers, 0.5 us, 5 RAM trips, 100x | Page faults | "two hundred sixty-two thousand one hundred forty-nine faults" | covered |
| F2 interactive figure | Interactive | "you hit malloc twice. A's V S Z goes to four pages" | covered |
| I18 overcommit modes 0/1/2, ratio 50 | Overcommit | "So swap plus half of RAM" | covered |
| I19 why bet: 8 MB stacks, 20 GB fork + exec | Overcommit | "a twenty gigabyte process forks to run a tiny shell command" | covered |
| I20 can't fail politely, store instruction | Overcommit | "It's in the middle of executing a store instruction" | covered |
| F3 decision flowchart | Reclaim | "Picture a flowchart going down the page" | covered |
| I21 file-backed, page cache, clean drop | Reclaim | "If anybody needs it again, read it from disk again" | covered |
| I22 anonymous, swap incl. zram, unreclaimable | Reclaim | "anonymous memory can't be reclaimed. At all." | covered |
| I23 free vs available | Reclaim | "Available is the number to believe" | covered |
| I24 oom_score 0-1000, adj -1000..1000, blunt | OOM killer | "It's blunt on purpose" | covered |
| I25 SIGKILL 9, 137 = 128 + 9, dmesg line | OOM killer | "A hundred twenty-eight, plus nine for the signal number" | covered |
| I26 systemd-oomd | OOM killer | "there's also systemd O O M D" | covered |
| I27 cgroup v2 files, group-only kill, log line | cgroups | "memory dot max... memory dot events" | covered |
| I28 Docker 512 MB, page cache counts, only resident charged | cgroups | "can still malloc a hundred gigabytes" | covered (B voices wrong model) |
| I29 fork copies page table, read-only, COW | fork | "That's copy-on-write. And for C programs it's beautiful." | covered |
| PR2 Predict list read | fork | B: "Nothing? ... it's only reading"; "In Python, reading an object is a write to memory." | covered |
| F4 figure 004 | fork | "A whole page, four to sixteen kilobytes, copied, for an eight-byte change" | covered |
| I30 DataLoader, 1M dicts, 8 workers, ~9x | DataLoader | "memory climbs to roughly nine times the size of the dataset" | covered |
| I31 RSS overcounts, PSS, private dirty, growth real | DataLoader | "The fairer number is P S S"; "the growth over the epoch is real" | covered |
| I32 fixes, paths/offsets, spawn/forkserver, 3.14 default | DataLoader | "Python three point fourteen changed the default" | covered |
| I33 file mmap, byte 4,000,000 | mmap | "you touch byte four million of the region" | covered |
| I34 safetensors mmap vs torch.load twice | mmap | "the same seventy gigabytes exists twice" | covered |
| I35 normal GPU VRAM, PCIe, catchable OOM | Unified | "You can catch it. System RAM is a different pool" | covered |
| I36 GB10 one pool, 128 GB, 273 GB/s spec-sheet, bit under 128 | Unified | "Those are spec-sheet numbers. There's no separate VRAM." | covered |
| F5 figure 005, 8+70+70=148 | Unified | "Eight plus seventy plus seventy is a hundred forty-eight" | covered |
| I37 opening scene explained + driver caveat | Unified | "That was you."; "So watch for both." | covered |
| I38 fixes: mmap, one at a time, device_map, 4-bit 35-40 GB | Unified | "Never hold two full copies" | covered |
| B0 setup, probe, getconf, overcommit, swap, macOS 466 GB VSZ | Build It | "About four hundred sixty-six gigabytes for a bare Python" | covered |
| B1 lazy.py flags, step by page, 200 GB refused | Build It | "Python's default, when there's no file, is a shared mapping" | covered |
| B2 cow.py, big ints, os._exit, 200 MB, gc.freeze | Build It: COW | "five million times forty bytes, about two hundred megabytes" | covered |
| B3 hog in container, flags, 137/OOMKilled/dmesg, oom_score, systemd-run, review | Build It: hog | "Never on the bare machine" | covered |
| B4 fake 16 GB load, anon vs file, vmstat, second load, GPU half, nvidia-smi | Build It: fake load | "sixty-four tensors of a hundred twenty-eight megabytes each" | covered |
| B5 Done-when list | Build It: fake load | "And you're done when the hundred gig reserve is instant" | covered |
| M1 reference Mac numbers | Build It / Measure | "a hundred thirty-one thousand seventy-four minor faults"; "twenty-six faults for doing nothing" | covered |
| M2 reserving free, faults = bytes/page | Measure | "Reserving is free, touching costs" | covered |
| M3 70 GB -> 18 M faults, ~9 s; 1.1 M at 64 KB | Measure | "About nine seconds of pure fault handling" | covered |
| M4 COW reads are writes; A.copy 40 MB new anon | Measure; Build It: COW | "the array copy allocates forty megabytes of new memory" | covered |
| M5 hog dies near 512, within one chunk | Build It: hog | "within one chunk, fifty megs, of memory dot max" | covered |
| K1 zeros vs ones | Break It | "The zeros one survives, holding almost nothing" | covered |
| K2 preferred victim | Break It | "The adjusted one dies first. Even when it's the smaller one." | covered |
| K3 thrash | Break It | "That's thrashing" | covered |
| K4 fake leak RSS vs PSS vs free | Break It | "R S S overcounts the shared pages. P S S and free agree." | covered |
| E1 what VM buys: isolation, illusion, laziness | Lazy | "Three things. Isolation..." | covered |
| E2 VSZ 300 GB / RSS 4 GB | OOM killer | B: "some process shows a V S Z of three hundred gigabytes" | covered |
| E3 Killed walkthrough + test in cgroup | Unified | "try risky loads inside a memory-limited box first" | fixed (cgroup testing added) |
| E4 DataLoader incl. paths and offsets | DataLoader | "keep only file paths and offsets in Python" | covered |
| E5 scaling 4 KB vs 64 KB | Scaling | "about thirteen seconds versus under one" | covered |
| G1 OSTEP, Drepper | Go Deeper | "Operating Systems: Three Easy Pieces" | covered |
| C1 files-and-disks, memory-math, containers | Go Deeper and Connections | "that five twelve megabyte box you built is most of what a container actually is" | covered |

Numbers check: all numbers match the lesson. Spoken simplifications: "sixteen thousand three hundred
eighty-four" = 16384; overcommit ratio 50 said as "swap plus half of RAM" (derived from the default
ratio of fifty percent); "a thousand to three thousand" TLB entries from figure label "~1-3K".

Naturalness-pass fixes: removed three claims not in the lesson (64-bit address width, "unused RAM is
wasted RAM", per-service oom_score_adj example), and corrected B's "minor faults instead of major" on
the second load (the anonymous-copy path reads from the page cache rather than faulting).
