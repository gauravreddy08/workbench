# Outline: virtual-memory

## The one big idea

Every address a program uses is pretend, and real memory is only handed over the first time a page
is touched. Asking for memory is a promise, not a delivery, and when Linux can't keep all its
promises at once, it doesn't fail the request; it kills someone.

## Opening scene

Loading a seventy B model on the Spark. Free memory says there's plenty. The script runs for a few
minutes, the desktop gets sluggish, and the terminal prints one word: Killed. No traceback, no
MemoryError, nothing caught.

## The wrong mental model B voices

"If there wasn't enough memory, the allocation should have failed and Python should have raised a
MemoryError." Behind it: asking for memory means getting memory. Also later: "reading data can't
make memory grow."

## Story beats

1. The Killed scene, and three things that should bother you: no error, there seemed to be room,
   and moving to the GPU somehow ate CPU memory.
2. History: the Atlas at Manchester, nineteen sixties. Programmers hand-shuffling program pieces
   between fast memory and a drum. The idea: let the machine do it. One big pretend memory, chopped
   into pages, with the hardware fetching what's missing.
3. The hotel with fake room numbers: each guest gets a private book at the front desk mapping their
   room numbers to real rooms. Pages, page table (named), the processor's translator, and a tiny
   cache of recent lookups so it's cheap.
4. Laziness: reserving rooms writes "reserved" in the book and assigns nothing. On my Mac, asking for
   a hundred gigabytes on a forty-eight gigabyte laptop came back instantly. Memory arrives one page
   at a time on first touch, through a page fault (named), which is usually not an error.
5. Overcommit (named): Linux makes promises it can't keep all at once, on purpose, because programs
   reserve far more than they use, and because fork would be ruinous otherwise. And a store
   instruction has no return value to say no with. So when the bet loses: reclaim, swap, then the
   OOM killer (named), which kills the biggest. SIGKILL can't be caught, hence one word.
6. Two kinds of memory: pages that are a copy of a file (droppable, re-readable) vs anonymous pages
   with no copy anywhere (stuck unless there's swap). That is where the "available" memory went.
7. Fork and copy-on-write: sharing until someone writes. The Python twist: reading an object bumps
   its reference count, which is a write, so DataLoader workers slowly copy the dataset just by
   reading. NumPy buffers stay shared.
8. Back to the Spark: one pool for CPU and GPU. torch.load makes a private copy, moving to the GPU
   makes another from the same pool, two full copies don't fit. Fix: mmap the weights so they stay
   droppable file pages, move tensor by tensor. And test risky loads in a small box (a cgroup) so the
   killer fires there.

## Numbers worth saying

Seventy B model, about seventy gigabytes in eight bit; the Spark's one hundred and twenty-eight
gigabyte shared pool; a hundred gigabytes asked for on a forty-eight gigabyte Mac; nineteen sixty-two
for the Atlas.

## Left to the written lesson

Page sizes per machine, offset bits, the four-level tree and its arithmetic, TLB reach and huge
pages, minor vs major fault costs, the overcommit modes table, oom_score details, systemd-oomd,
cgroup file names, PSS vs RSS, spawn vs forkserver, all Build It code, Measure tables, Break It
experiments, Explain It Back answers, reading list.
