# Outline: cpu-caches

## The one big idea

NumPy's huge lead over a Python loop is two separate bills. One is the interpreter's bookkeeping
for every element. The other is the memory system's, and it charges by where your bytes sit and
the order you touch them. "It's written in C" only fixes the first; you can lose the second in C,
in NumPy, and on a GPU. Layout is also what lets the chip do several adds at once.

## Opening scene

Ten million relevance scores from his cross-encoder. Sum them with a plain loop, then with NumPy:
about ninety times apart. Then two twists: shuffle where the list's float objects sit (same
bytecode) and the Python loop gets four times slower; sum the NumPy array in random order and it
gets dramatically slower, all in C.

## The wrong mental model B voices

No diagnostic quote for this one. B voices the common answer: "NumPy is fast because it's written
in C." Later B assumes a compact array.array must make the Python loop faster.

## Story beats

1. The ninety-times gap; B's "it's C"; the two twists that break that story.
2. Origin: Maurice Wilkes's two-page paper in nineteen sixty-five: a small fast memory in front of a
   big slow one, kept automatically. IBM shipped it and named it a cache. It works only because
   programs reuse what they just used and walk to what's next. Every cache is a bet on that.
3. Two bills, as a warehouse job: walking to the shelf (memory) and filling in a form for every item
   (interpreter). The form: bytecode, type checks, a new float object per partial sum, refcounts.
   Re-explain a list as pointers to separate objects. Evidence: a small list that fits in cache is
   no faster (interpreter dominates); shuffling the objects with identical bytecode is four times
   slower (memory).
4. The cache line: one load brings in the whole chunk around it; the Mac's line is twice the
   Spark's. Spatial and temporal locality.
5. The prefetcher, a clerk reading ahead: turns a waiting problem into a flow problem. It can follow
   a straight line or a fixed stride, never a random list or the next object behind a pointer.
6. Why lists lose: created in order, objects sit in order; sorted or shuffled, each pointer jumps.
   In a NumPy array every element's address is known without loading anything.
7. Rows and columns: memory is one long line; row-major order; strides make transposes free lenses.
   Walking a big matrix by columns in compiled code is about six times slower; a small one doesn't
   care. NumPy reorders reductions for you, but a transposed copy pays.
8. Several adds at once: one running total makes every add wait for the last. Four totals let the
   core run them side by side; wide registers add several numbers per instruction. The compiler
   won't reorder float sums without permission because rounding changes the answer; NumPy's pairwise
   summation gets it for free. The compiler permission sped up the row walk and did nothing for the
   column walk. Fast code hits the memory wall; slow code never sees it.
9. The array.array puzzle: dense and smaller, yet the Python loop over it is slower, because Python
   has to build a float object each step. Compact layout only pays when the loop is in C.
10. Random gather in NumPy beats the shuffled list by a lot: addresses known up front, so many misses
    overlap.
11. GPU: warps of thirty two threads load together; neighbours reading neighbours is coalesced;
    strided reads move many times the bytes, and inference is already memory-bound. FlashAttention is
    temporal locality by hand. .contiguous() is paying one copy on purpose so later reads are dense.
    Channels-last for his CNNs.
12. When I ran it: shrink the data to a handful of elements and plain Python beats NumPy, which pays a
    fixed toll per call.
13. Ending: B: "NumPy is fast because it's C and contiguous"; A sharpens: two bills that interact, and
    the access order matters in every language and on the GPU.

## Numbers worth saying

- About ninety times (loop versus NumPy).
- Four times slower from shuffling alone.
- About six times for the column walk.
- Thirty two threads in a warp.

## Left to the written lesson

Every timing table and ns-per-element value, the line-size commands, the interactive strip figure,
stride arithmetic, memory-level parallelism details, the strides printout, fastmath caveats and
assembly inspection, pairwise summation docs, sector sizes and the coalescing figure, the view
error message, x.T plus y timings, all Build tasks (five.py, rowcol.py, chain.py, perf stat on the
Spark, the GPU layout script), Measure commentary, Break It (power-of-two conflict misses, the
compiler deleting work, small-array crossover numbers, stride sweep and TLB), the column-store
scaling answer, Go Deeper.
