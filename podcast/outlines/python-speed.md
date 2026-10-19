# Outline: python-speed

## The one big idea

Python decides what every single operation means, again, every time it runs it, and every value it
touches is a boxed object. The fix is never to make Python faster; it's to make Python do less:
cross into compiled code rarely, and do a lot of work per crossing. The same idea explains a GPU
sitting idle at batch one.

## Opening scene

Scoring pairs for the cross-encoder. A plain loop summing squares over millions of floats. A
teammate writes one NumPy line on the same numbers: same answer, over a hundred times faster. Then,
the other direction: the model in PyTorch, "fast because it's C++ and CUDA", served at batch one on
the Spark, and the GPU is busy only about a third of the time. Same villain both times.

## The wrong mental model B voices

"Python's slow because it's interpreted. So just put the loop in C and you're done." And "PyTorch is
C++ under the hood, so Python can't be what's slowing my GPU."

## Story beats

1. The two scenes: the loop vs one NumPy line; the idle GPU.
2. History: FORTRAN compiles ahead of time; LISP interprets; Smalltalk in the eighties learns to
   watch and then compile, and to remember what type showed up last time. Python took the simple
   path, an interpreter written in C, easy to extend with C. That's why it ran everywhere, and why
   its loops stayed slow.
3. Three ways to run a program: translator hands you the finished book (compiler), live interpreter
   at a meeting (interpreter), interpreter who writes down the sentences that keep coming up (JIT).
   The CPU never runs your Python; it runs a big C program that reads your code as data. Bytecode
   named.
4. Nothing in the instruction says "integer". Every value is a box: a header, a type, a reference
   count, then the number. Boxing named. Following one plus: a dozen steps around one actual add.
   That ratio is the slowness.
5. Newer Pythons: the specializing interpreter notices the plus always sees floats and rewrites
   itself, with a cheap check (guard). Real gains, but it makes steps cheaper, it doesn't remove
   them. The experimental JIT is off by default and wasn't a win in my test.
6. The twist (B's wrong model): the six-rung ladder. Removing the interpreter but still walking
   boxes in C bought only a few times. Most of the gap is boxes, memory layout and arithmetic style.
   Shuffle the list and the same loop gets much slower: the boxes are scattered.
7. The toll: each crossing into C costs more than the work inside for tiny things. Calling C in a
   loop per number is slower than plain Python. Converting a list to an array can cost more than
   the loop itself. Rule: cross rarely, do lots per crossing; keep data packed from the start.
8. PyTorch is the same split with a GPU on the far side. Each op: Python line, dispatcher, kernel
   launch (named). Tiny kernels finish faster than the CPU can queue the next: overhead-bound
   (named). torch dot compile: sees the whole graph, fuses ops into fewer kernels, and CUDA graphs
   replay a whole sequence with one call. On my Mac's CPU, compiling a GPT two block made it a bit
   slower: nothing to fix there. Compile time is the half nobody reports. Profile first.

## Numbers worth saying

"Over a hundred times" for the NumPy line; "about a third of the time" busy GPU; "a dozen steps
around one add"; the interpreter accounts for only "the first few times" of the gap.

## Left to the written lesson

Bytecode listings and opcode names, the eval loop C code, sizes of objects, per-version timing
table, JIT build flags, the full ladder with nanoseconds per element, SIMD and fast-math details,
ctypes and per-call costs, Dynamo, guards, graph breaks, Inductor and Triton internals, compile
modes, profiler commands (cProfile vs py-spy details), all Build It code and C sources, Measure and
compile tables, Break It experiments, Explain It Back.
