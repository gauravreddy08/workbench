# Outline: stack-and-heap

## The one big idea

A running program keeps its data in two places with opposite rules. The stack is a pile of plates,
one per unfinished function call: nearly free, always hot in cache, cleans itself up, but small and
gone the moment the call returns. The heap is a big pool for anything that must outlive a call or
whose size isn't known in advance: flexible, slower, scattered, and someone has to give it back.
In Python everything lives on the heap and names only point at it, which explains bloated lists,
recursion crashes, and slow leaks.

## Opening scene

Three everyday surprises: a list of tens of millions of numbers taking five times the RAM he
budgeted, a recursive function that kills the whole program instead of raising an error, and a
long-running ranking service that slowly eats memory until something kills it.

## The wrong mental model B voices

His diagnostic, quoted: "Stack is first in, first out. Heap is like this tree, which is sorted."
B says it nearly word for word. Later B also assumes del frees the object.

## Story beats

1. The three surprises; B's diagnostic answer. Plates, not a coffee line. The memory heap has
   nothing to do with the sorted tree: two communities picked the same everyday word for "a pile".
2. Origin: early FORTRAN gave each subroutine one fixed spot in memory, so a function calling itself
   overwrote its own way home; recursion was banned. ALGOL required it; Dijkstra showed how in
   nineteen sixty: pile up a block per call, remove it on return. Bauer and Samelson's "cellar
   principle". Since then nearly every CPU has a register pointing at the top of that pile.
3. A process's memory as one long strip: code, long-lived globals, the heap growing up from the
   bottom, the stack coming down from the top.
4. A stack frame: a call's locals and the address to jump back to. Push on call, pop on return. A
   stack trace is literally a walk down the frames. Fast because it's one instruction to move a
   pointer, and it's the memory you touched nanoseconds ago, so it sits in the closest cache.
5. Small and rigid: reserved up front, a few megabytes. Fine for tens of thousands of calls, hopeless
   for data. Walk off the end and you hit a guard page and the OS kills you. When I ran it: double
   the stack, double the depth. Every thread gets its own stack; all threads share one heap (setup
   for the next episode).
6. The heap: for data whose size you learn at runtime, or that must outlive the function (load a
   model and return it). An allocator finds a gap; slower, and things land wherever there was room,
   so walking them misses cache. Fragmentation: free but unusable, why a server creeps without
   leaking.
7. Who frees it: C makes you do it; Python counts references and has a sweeper for loops; Rust's
   compiler inserts the free.
8. Python: every value is an object on the heap; names point at objects. A small number costs about
   three times its raw size. A list of a million ints is pointers to separate objects, five times a
   NumPy array that keeps raw numbers side by side.
9. Python recursion: the recursion limit used to turn a C stack crash into a clean error. Newer
   Python keeps its own frames on the heap, so deep pure-Python recursion can succeed, but C-level
   recursion (printing a deeply nested list) can still crash the whole interpreter.
10. B's del model: del removes a name, not the object. Most Python leaks are a long-lived container
    (a cache dict) pinning everything; the rest are cycles with the collector turned off.
11. Tensors: a small Python object pointing at a storage; views share it. On the GPU, PyTorch's
    caching allocator keeps freed blocks, so nvidia-smi doesn't drop after del. On the Spark, CPU and
    GPU draw from one shared pool.
12. Ending: B restates as "fast small stack, big slow heap"; A sharpens: the real difference is
    lifetime and who cleans up, and in Python almost everything is the heap kind.

## Numbers worth saying

- About five times: list of ints versus a NumPy array.
- A few megabytes of stack by default.
- A small Python int is roughly three times the size of the raw number.

## Left to the written lesson

The address-space figure and example addresses, ASLR, the exact frame contents and stack pointer
names, ulimit values, exit code arithmetic, malloc and system call details, size classes, exact
object sizes by CPython version, small-int caching and getsizeof versus tracemalloc, dict bytes per
entry, all Build tasks (where.c, boom.c, Python recursion, weigh.py, tensor storage checks, the
leaky reranker hunt), the Measure table, the four Break It cases (returning a local's address,
double free and AddressSanitizer, del with a second reference, old-Python segfault), Explain It
Back answers, Go Deeper.
