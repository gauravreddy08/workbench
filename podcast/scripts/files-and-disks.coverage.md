# Coverage: files-and-disks

Lesson src/lessons/files-and-disks.mdx vs podcast/scripts/files-and-disks.md. Item IDs match
podcast/outlines/files-and-disks.md. No item was MISSING after the check; numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereq recaps (SSD numbers, page faults/mmap, fds) | Idea; SSD; mmap | "You've seen them before with processes"; "From the latency lesson"; "Quick reminder from the virtual memory lesson" | covered |
| P1 9 h training, save every 1,000, step 37,000 dies | Problem | "every thousand steps it calls torch dot save" | covered |
| P2 central directory error, one file, nine hours to zero | Problem | "There was only ever one file" | covered |
| P3 40 ms load impossible, 16 GB at 7 GB/s > 2 s, Monday, 2x RAM | Problem | "So that's over two seconds. Minimum." | covered |
| P4 four layers, each lying, same layers backwards | Problem | "there are four layers of memory" | covered |
| O1 2009 ext4 zero-byte config files | Origin | "and zero bytes long" | covered |
| O2 write tmp then rename; ext3 data first | Origin | "ext three wrote the file's data to disk before it recorded the rename" | covered |
| O3 delayed allocation, rename reached disk first | Origin | "That's called delayed allocation" | covered |
| O4 Ts'o: POSIX never promised; heuristic anyway | Origin | "he also added a heuristic to ext four" | covered |
| O5 Pillai 2014, a dozen programs, almost all | Origin | "found crash bugs of exactly this kind in almost all of them" | covered |
| I1 data blocks 4 KB, inode, directory entry | File anatomy | "That record is called an I node" | covered |
| I2 rename moves nothing, 30 GB instant | File anatomy | "renaming a thirty gigabyte file is instant" (B's wrong model first) | covered |
| I3 kernel, syscall | File anatomy | "That's a syscall for short" | covered |
| I4 open-file record, fd, 0/1/2, first is 3 | File anatomy | "So your first file is usually three" | covered |
| F1 Figure 001 | File anatomy | "If you drew it, there's a line down the middle" | covered |
| I5 1.8 µs vs 40 ns | File anatomy | "about one point eight microseconds... about forty nanoseconds" | covered |
| L1 buffer, 128 KB on 3.14, 8 KB older, flush/close | Layer 1 | "a hundred twenty-eight kilobytes, older versions used eight" | covered |
| L2 bytes in process RAM; torch.save buffers too | Layer 1 | "In your process's own RAM" | covered |
| L3 page cache, dirty, returns | Layer 2 | "marks those pages dirty" | covered |
| L4 write success = kernel has a copy | Layer 2 | B: "that's the point where it's saved"; A corrects | covered |
| L5 writeback ~30 s, 3000 centisecs | Layer 2 | "dirty expire centisecs... three thousand" | covered |
| L6 why lie: fast, coalesce, merge, read from RAM; clean vs dirty | Layer 2 | "only the last version ever goes to the drive" | covered |
| L7 kill -9 vs power cut | Layer 2 | B wrong model; "The page cache belongs to the kernel" | covered |
| L8 drive DRAM, power-loss protection | Layers 3-4 | "That's called power-loss protection" | covered |
| L9 four places, only last survives | Layers 3-4 | "only the last one survives a power cut" | covered |
| F2 Figure 002 layout, colours, buttons | Layers 3-4 | "Four rows stacked top to bottom" | covered |
| F2a three chunks + kill + wait | Layers 3-4 | "The dead process's data still reaches the disk" | covered |
| F2b one chunk + kill | Layers 3-4 | "Gone. Even though f dot write returned" | covered |
| F2c write, flush, power cut | Layers 3-4 | "you lost everything anyway" | covered |
| F2d fsync without flush | Layers 3-4 | "It can't see inside Python's buffer at all" | covered |
| S1 fsync blocks, Linux cache flush, durable, ACID D | fsync | "It's the D in a database's ACID guarantees" | covered |
| S2 fdatasync, O_SYNC/O_DSYNC | fsync | "F data sync... O sync and O D sync" | covered |
| S3 4 µs / 35-40 µs / 3.9 ms | fsync | "about three point nine milliseconds" | covered |
| S4 macOS fsync stops at drive cache, F_FULLFSYNC, SQLite, Python plain | fsync | "Apple's own man page says so" | covered |
| S5 Linux honest; tens of µs to several ms; measure Spark | fsync | "Linux F sync is the honest one" | covered |
| PR1 2 GB every 10 min: 0.5-1 s, under 0.2% | Predict | "under a fifth of a percent" | covered |
| PR2 logger 150 ms, 15%, per call, batch | Predict | "Fifteen percent of your step loop" | covered |
| A1 "wb" truncates, half file no old one | Atomic save | "opening a file that way truncates it" | covered |
| A2 1 GB killed at 150 ms, 264 MB, zip index at end | Atomic save | "The file was two hundred sixty-four megabytes" | covered |
| A3 rename atomic | Atomic save | "Atomic means it happens all at once or not at all" | covered |
| A4-A7 four steps incl. same dir, os.replace, dir fsync | Atomic save | "One. Write the new checkpoint... Four. Open the directory itself" | covered |
| A8 step 2 skipped in 2009, step 4 by everyone | Atomic save | "Step four is the one almost everyone skips" | covered |
| F3 Figure 003 three recipes, slider, outcomes | Atomic save | "Three recipes you can switch between" | covered |
| A9 pattern; preemption/OOM vs power/panic | Atomic save | B states pattern; "Preemption and the OOM killer" | covered |
| J1 data+inode+bitmap, fsck hours | Journaling | "F S C K, file system check" | covered |
| J2 journal = write-ahead log | Journaling | "call it a write-ahead log" | covered |
| F4 Figure 004 four steps, crash cases, replay twice | Journaling | "replaying twice is harmless" | covered |
| J3 metadata not data, data=ordered | Journaling | B wrong model; "Most journals cover metadata, not your data" | covered |
| J4 COW APFS/Btrfs/ZFS; Spark ext4, df -T; Mac APFS | Journaling | "They copy" | covered |
| D1 NAND, charge, recap | SSD | "Each cell traps a little electric charge" | covered |
| D2-D4 three rules, programming, erase, wear | SSD | "Flash has three awkward rules" | covered |
| D5 FTL remap, stale | SSD | "address seven now lives at block two, page five" | covered |
| F5 Figure 005 map + blocks + GC | SSD | "Picture it as a map on the left" | covered |
| D6 GC, write amplification, 1.0 | SSD | "called write amplification. One point oh is perfect" | covered |
| D7-D9 sequential best, random worst, full drive slower | SSD | "A checkpoint is the ideal write" | covered |
| D10 TRIM | SSD | "There's a command for that called trim" | covered |
| R1-R3 random vs sequential, readahead, 6.6 / 17 GB/s | Sequential | "That's readahead" | covered |
| M1 read: two copies | read/mmap | "you end up with two copies in RAM" | covered |
| M2 mmap, virtual address space, page fault, one copy | read/mmap | "That's a page fault" | covered |
| M3-M5 instant, shared, gentler | read/mmap | "And that changes three things" | covered |
| M6 cost: many small faults; cold slower | read/mmap | B wrong model "the faster way"; A corrects | covered |
| K1 .pt zip, data.pkl, storages, copy | torch.load | "A dot P T file is a zip archive" | covered |
| K2 pickle runs code, weights_only default since 2.6 | torch.load | "Since PyTorch two point six" | covered |
| K3 safetensors 8 bytes, JSON, raw bytes, zero-copy, transformers default | torch.load | "deliberately boring" | covered |
| F6 Figure 006 two lanes | torch.load | "So picture two lanes" | covered |
| K4 torch.load mmap=True since 2.1; real advantages | torch.load | "since PyTorch two point one" | covered |
| K5 to cuda copies anyway; Spark unified memory, measure | torch.load | B: "doesn't it all end up on the GPU anyway?" | covered |
| C1 cold/warm, page cache stays, buff/cache | Cold and warm | "big number under buff slash cache" | covered |
| C2 40 ms = untouched mmap; few seconds honest | Cold and warm | "an M map that hasn't touched anything yet" | covered |
| PR3 Predict ranking and all four numbers | Predict | "Safetensors cold is last. About one point eight to two point seven" | covered |
| X5 8 workers, 128 GB, GPU copies, 50 workers 800 GB, fixes | Eight workers | "Eight hundred gigabytes through one pipe" | covered |
| B0 setup, SmolLM2 269 MB, 2.1 GB synthetic | Build setup | "sixty-four random tensors" | covered |
| B1 cold file: drop_caches, fadvise, purge, nocache copy, check | Build setup | "getting a cold file on demand" | covered |
| B2 45x buffer experiment | Build syscalls | "About forty-five times" | covered |
| B3 strace output, O_TRUNC, no fsync, dtruss/SIP | Build syscalls | "One write syscall for two f dot write calls" | covered |
| B4 fsync_bench four modes; 512 MB experiment | Build fsync | "Write five hundred twelve megabytes in a single write" | covered |
| B5 crash scripts, hints, delays | Build crash | "Try delays from fifty milliseconds to a second" | covered |
| B6 load matrix, RSS units, fresh process | Build loading | "each method in a fresh process" | covered |
| B7 unzip, pickletools, header, 56,623,104 check | Build formats | "fifty-six million six hundred twenty-three thousand one hundred four" | covered |
| B8 trapdoor, UnpicklingError, pwned | Build formats | "your terminal prints pwned" | covered |
| B9 Spark repeat, df -T, page size 4/64/16 KB, agent review | Build Spark | "four kilobyte or sixty-four kilobyte pages" | covered |
| B10 done-when | Build Spark | "You're done when you've traced a Python write" | covered |
| E1 measurement machine | Build/fsync | "On the M four Pro MacBook the lesson was written on" (48 GB RAM, Py 3.14, PyTorch 2.14 compressed) | covered (compressed) |
| E2 45x | Build syscalls | as B2 | covered |
| E3 4 µs never waited for SSD | fsync / Build | "A plain write, no F sync, is about four microseconds" | covered |
| E4 Mac 10x / 1,000x; Spark interpretation | Build fsync | "If it's milliseconds, it's doing what F full F sync does" | covered |
| E5 512 MB: 0.1-0.25 s, fsync few ms, full 50-80 ms | Build fsync | "fifty to eighty milliseconds" | covered |
| E6 264 MB of 1.07 GB; atomic 487 MB tmp, 256 tensors | Build crash | "about four hundred eighty-seven megabytes" | covered |
| E7 warm 100 ms, 200 ms memcpy, 16 GB 1.5 s; mmap=True numbers | Build loading | "about one and a half seconds" | covered |
| E8 cold mmap loses, <1 vs 3-5 GB/s, madvise | Build loading | "It's no copy, and lazy" | covered |
| E9 one tensor cold/warm | Build loading | "about a millisecond to open plus twenty to fifty" | covered |
| E10 RSS 2.4 GB same, shared vs private, 320 MB | Build loading | "about two point four gigabytes" | covered |
| K-1 fsync before flush | Break It | "swap the order. F sync first, then flush" | covered |
| K-2 /tmp, cross-device link, shutil.move | Break It | "invalid cross-device link. Error eighteen" | covered |
| K-3 fsyncgate, raise don't retry | Break It | "people ended up calling fsyncgate" | covered |
| K-4 benchmark page cache by accident | Break It | "cold, or warm?" | covered |
| X1 f.write walkthrough | Layers + close | B's closing restatement; A's sharpening re flush and full fsync | covered |
| X2 recipe + keep last two or three | Atomic save | "keep the last two or three checkpoints" | covered |
| X3 SSD random vs sequential, full drive | SSD | "fewer good blocks to pick from" | covered |
| X4 torch.load vs safetensors, ~2 s vs ~0.6 s | Predict + Build loading | "one point eight to two point seven" vs "half a second to seven tenths" | covered |
| X5 8 / 50 workers | Eight workers | as above | covered |
| G1 OSTEP, Dan Luu | Close | "Operating Systems: Three Easy Pieces" | covered |
| N1 WAL for databases; cold/warm for slow startup | Close | "the seeds of how databases make transactions durable" | covered |

Numbers not written in the lesson: "eight billion parameters at two bytes each" (B's route to the lesson's 16 GB);
"that's the whole Spark" (8 x 16 = 128 GB, the Spark's 128 GB from CLAUDE.md); "two and a half times faster"
(17 vs 6.6 GB/s); "something like forty-five times" for the syscall vs buffer (the lesson's Idea text says
"thousands of times", its own measurements say about 45x; the script uses 45x).
