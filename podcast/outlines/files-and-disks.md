# Outline: files-and-disks

## The one big idea

Saving a file isn't one step. Your bytes wait in a chain of holding areas, each owned by someone
different, and most of them forget everything when the power goes. A write returning means "the
kernel has a copy", not "it's on disk". The same chain, run backwards, explains why the same model
loads fast one day and slow the next.

## Opening scene

Nine hours into training the cross-encoder. One checkpoint file, overwritten every so often. The
job dies mid-save, you restart, and the checkpoint is broken. Not the new one, the only one. Nine
hours, back to zero.

## The wrong mental model B voices

"When write comes back successfully, the data's on disk. Saving is one step." Later: "mmap is just
the faster way to read a file."

## Story beats

1. The broken checkpoint. Opening a file for writing wipes it to empty immediately; the save takes
   a few seconds; a crash in that window leaves half a file and no old one. The zip index lives at
   the end, the part never written.
2. The puzzling half: a big model "loads" in a blink, which is impossible, and on Monday the same
   load is slow again.
3. The layers, top down: Python's own buffer in your process (exists because every trip into the
   kernel costs something); the page cache (named), the kernel's copy in RAM, where write returns;
   the drive's own little cache; and finally the flash. Which crash wipes which: a killed process
   only loses its own buffer, the page cache survives it; a power cut wipes everything but flash.
4. Why the kernel lies: it makes nearly everything faster. Writeback happens later on its own.
5. fsync (named): the one call that waits until the drive says it's stable. Costs per call, not per
   byte, so one at the end of a checkpoint is nearly free and one after every log line is not. The
   Mac twist: plain fsync stops at the drive's cache; a separate, far more expensive call goes all
   the way.
6. History: two thousand nine, ext4, people losing config files after crashes: right name, zero
   bytes. Programs were writing a temp file and renaming, but skipped forcing the data down first;
   ext3 had covered for them by luck. Ted Ts'o: the standard never promised that. Later research
   found this class of bug in almost every popular program checked.
7. The safe save: a name is separate from the data, renaming just rewrites a directory entry and
   is all-or-nothing. Write a temp file next to the real one, flush, fsync, rename over, fsync the
   folder. Worst case you wake up on the old checkpoint, whole. Journals keep the filesystem sane,
   not your file's contents.
8. Reading backwards: cold vs warm. The page cache keeps recently read files. read copies into your
   own memory (two copies); mmap makes the file appear as memory (one copy, lazy, shared). The
   blink-fast load was an mmap that hadn't touched anything yet. The surprise: cold, reading
   everything, mmap lost to one big plain read on my Mac. mmap is "no copy, and lazy", not "faster
   disk". Plus pickle can run code; safetensors is deliberately boring.

## Numbers worth saying

Nine hours; two thousand nine; on the Mac, plain fsync about ten times a plain write and the full
one about a thousand times. "Several seconds" for the cold load of a big model, described not
computed.

## Left to the written lesson

Inodes and file descriptors in detail, buffer sizes, writeback timers, fdatasync and O_SYNC, the
fsync cost table, the SSD internals (flash pages, blocks, the translation layer, garbage
collection, write amplification, TRIM), readahead speeds, the zip and safetensors byte layouts,
weights_only details and versions, all Build It code and strace output, Measure tables, Break It
cases (fsync before flush, temp in tmp, fsyncgate, accidental warm benchmarks), Explain It Back.
