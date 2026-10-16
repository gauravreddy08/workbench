# Outline: python-speed

Source: src/lessons/python-speed.mdx. Curriculum entry: "Why is Python slow?" Question: what does the
Python interpreter actually do, and how does PyTorch get speed anyway? Why: knowing where Python ends
and C/CUDA begins tells you what is worth optimizing.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

Diagnostic gaps this lesson touches: Numbers (ns per element, cycles, bytes, GB/s: every number gets a
comparison); stack = FIFO (the value stack is last-in-first-out: B says "first in first out", A
corrects); heap = heap data structure (re-explain: the heap is the big pool of memory the allocator
hands out, not the tree); GIL (one sentence in Connections); decoding memory-bound (bandwidth wall
at the end of the ladder and the "how does it scale" answer).

## Today / prerequisites

- T1 Prereqs: every Python value is a heap object with a header (stack-and-heap); GIL lesson; cpu-caches (shuffled list). -> Re-explained inline where each comes up: boxes section, shuffle Break It, closing connection. Today bullets skipped as a list.

## The Problem

- P1 Cross-encoder feature: sum of x times x over 10 million floats, obvious loop, about 100 ms. -> A opens on the scene, first line.
- P2 Teammate's NumPy xs @ xs: 0.6 ms; same math, same machine, same answer to six digits, 170 times faster. -> A; B guesses "NumPy is C, so it's compiled, that's it" (wrong-ish model, sets up "interpreter only explains the first 3x").
- P3 PyTorch "fast because C++ and CUDA"; batch size 1 on the Spark, nvidia-smi says GPU busy 30%; trillions of ops a second, mostly idle, waiting for Python. -> A, second scene; B reacts with skepticism ("but the model is on the GPU").
- P4 Same villain, same fix; fix is not "rewrite it in Rust"; know what the interpreter does per line, where Python stops and compiled code starts, cost of each crossing; then you know which 3% of code is worth touching. -> A frames the episode.

## Origin

- O1 FORTRAN, John Backus's team at IBM, 1957: a compiler, machine code ahead of time; selling point was nearly as fast as hand-written assembly; scientists wouldn't have adopted it otherwise. -> A, story.
- O2 LISP first implementation 1958-60, Steve Russell hand-coded McCarthy's eval: an interpreter, reads your program and does what it says piece by piece; slower, but change code while running, values any type at any moment. -> A.
- O3 1984 Deutsch and Schiffman, Smalltalk-80: compile lazily only once run; inline cache, remember type seen last time at each call site so next lookup is one comparison. -> A; B notices "so it's a guess".
- O4 Self project late 1980s; its people built Java's HotSpot JIT; V8 (2008) same ideas for JavaScript. -> A, quick timeline.
- O5 Python, Guido van Rossum, 1989: simple path, portable interpreter in C, easy to extend with C; why it ran everywhere and grew the ecosystem; why a Python loop has been 30 to 100 times slower than C for thirty years; only since 2022 taking the Smalltalk tricks seriously. -> A.

## The Idea: three ways to run a program

- I1 Term machine code: raw instructions the CPU executes (add these registers, load from this address, jump here); different for ARM (Mac, Spark) and x86. Program is text, something has to bridge it. -> A, plain words.
- I2 Compiler: translates whole thing first; works out a and b are 64-bit ints, writes machine code that adds two registers; then it's gone; nothing between code and CPU; can think long because you pay once. Translator handing you finished French edition. -> A.
- I3 Interpreter: live interpreter at a meeting; never writes down; same sentence a thousand times worked out a thousand times; CPU never runs your Python, runs the interpreter (big C program), which reads your code as data. -> A; B: "so my code is... data?" (real surprise, not planted).
- I4 JIT: starts as interpreter, keeps notes; after the hundredth time writes down a translation; can beat ahead-of-time compiler because it's seen real data; specialized for types it saw, with checks that bail out; PyPy, HotSpot, V8. -> A.
- F1 Figure 001: three pipelines: C source -> compiler -> machine code -> CPU, once before running; Python source -> compile -> bytecode (once, .pyc cache) -> eval loop (C program) -> CPU, every time; JIT: hot path? -> machine code, bypassing the eval loop. -> A describes as three lines on a whiteboard.
- I5 CPython does compile, to bytecode (term: compact simple instructions for an imaginary machine, the Python virtual machine; not machine code; no real CPU runs it); cached in pycache .pyc files so imports are quick. Compiler deliberately dumb: doesn't know types, can't decide ahead of time what + means. -> B says "wait, I thought Python wasn't compiled", A: it is, just to bytecode. Answers Today's "a bit of all three, mostly the second".

## The Idea: reading bytecode

- I6 dis module (disassemble) prints bytecode; add(a, b) on 3.14 is four instructions: RESUME (bookkeeping at entry), a fused load-load (push a, push b, fused because the pair is so common), BINARY_OP plus, RETURN_VALUE. On 3.11: LOAD_FAST a, LOAD_FAST b, BINARY_OP, RETURN_VALUE. -> A, names spoken only as words he'll see ("load fast", "binary op").
- I7 Term stack machine: instructions take inputs from top of a stack and push results; simple to compile to and interpret. LOAD_FAST pushes, BINARY_OP pops two, adds, pushes; RETURN_VALUE pops and hands to caller. Value stack separate from the C stack of stack-and-heap, same last-in-first-out idea. -> B says "a stack, so first in first out", A corrects to last in first out (diagnostic gap).
- I8 Nothing in bytecode says integer; BINARY_OP + same for 2+3, strings, lists, NumPy arrays; meaning worked out the moment it runs. -> A.

## The Idea: the eval loop

- I9 Term eval loop: one giant C function, _PyEval_EvalFrameDefault in ceval.c; fetch next instruction, jump to its C code, run, repeat; every line of Python goes through it. Shape: forever loop, read opcode, switch, case load fast pushes local, case binary op pops two and calls the number-add function, a few hundred more cases. -> A describes the code in words, no syntax.
- I10 Real one uses a jump table not a switch; since 3.12 generated from a description file, bytecodes.c. -> A, aside.
- I11 Term dispatch: each trip around the loop: memory read, a jump the CPU has to guess, bookkeeping. Nothing for reading a file; most of the cost for s += x * x. -> A.

## The Idea: why every value is a box

- I12 Re-explain stack-and-heap: in CPython every value is an object on the heap (the big pool of memory handed out at run time, not the tree data structure) with a header. -> A, brief re-explanation.
- I13 C: long a = 2 is 8 bytes, usually in a register (term: tiny fast slot inside the core; arithmetic happens there; ARM64 has 31 general-purpose 64-bit ones); no type stored; compiler knew, emitted, forgot. -> A.
- I14 Python: a is a name for a pointer to an int object; object holds reference count (term: how many references point to it; freed at zero), pointer to type, size, then the number; getsizeof(1) is 28 bytes for a number that needs 8. Term boxing / unboxing. -> A; B asks the number ("how big is that box actually?").
- F2 Figure 002: C's bare 8 bytes in a register; Python's pointer to a 28-byte box pointing at the int type object, which holds name and the add and multiply function slots; list of floats = list of pointers to 24-byte boxes scattered on the heap; NumPy array = bare 8-byte numbers packed, one type stored once for the whole array. -> A describes over the phone.
- I15 Why design it this way: buys what you like; dynamic typing (term: types belong to values, checked at run time; opposite static, C and Rust); ints never overflow, the box grows (2 to the 200 just works); every value in a list, passed anywhere, inspected, garbage collected the same way. Price: every + opens both boxes, reads labels, decides. -> A; B pushes back mildly ("that sounds like a bad trade"), A defends.

## The Idea: following one a + b

- PR1 Predict: how many steps are the add vs working out what add means? Answer: one add, about a dozen around it: three dispatches, four type checks (two in generic code, two inside int add, which can't trust its caller), one call through a function pointer, one heap allocation, refcount updates on three objects; add is one CPU instruction; in C the add is the only thing; this ratio is where 30-100x comes from. -> A asks, B guesses (too low, "half and half"), reveal.
- F3 Figure 003 (interactive stepper): modes 3.10 generic, 3.11+ specialized, guard miss, C; counters for type checks, objects made, actual adds. Generic walk: dispatch load a, push pointer, bump refcount (no number looked at yet); same for b; dispatch binary add, pop two pointers, knows nothing; read a's type, read b's type (subclass check: if b's type were a subclass Python asks b first); look up nb_add slot in int type, holds pointer to long_add; call it, it checks again; are both small ints fitting one word; read raw 2 and 3; the add, one instruction; box 5 in a new object (ints minus 5 to 256 are cached, general int means allocation); drop refs, push result; dispatch next. Specialized: rewritten to BINARY_OP_ADD_INT, guard two pointer comparisons, read values, add inline, still box, still drop refs. Guard miss: b is 3.0, guard fails, deoptimize to generic path, int's add returns "not implemented" for a float so float's add tries, converts 2 to 2.0, add, box float; misses tick a counter, respecialize or stay generic. C: registers x0 and x1, one add instruction, about one clock cycle, often 4 to 16 at once with SIMD; no heap, no type, no refcount; catch: C overflow silently wraps, Python ints never overflow, one reason they must be objects. -> A walks it as "if you press step"; spread across Predict reveal, specializer section, and Break It 1.
- I16 3.10 chain is real code: BINARY_ADD called PyNumber_Add, reads both types, finds nb_add in the int type's table of number methods (term function pointer: variable holding a function's address; flexible, CPU can't see through it, must guess the jump), calls long_add, checks again, unboxes, adds, boxes. Each a few ns; a dozen per + gives 10 ns per loop iteration when the CPU could do the add in 0.2. -> A, number with comparison (fifty times).
- I17 Second cost: boxes live wherever allocator put them; 10 million pointers to 10 million boxes; each pointer follow may miss cache; shuffle the list and the same loop gets five times slower (cpu-caches lesson showing up inside the interpreter). -> A, briefly, with re-explained cache miss; promised for Break It.

## The Idea: the specializing interpreter

- I18 2022 Faster CPython project: Mark Shannon, Guido van Rossum, small team funded by Microsoft; PEP 659 Specializing Adaptive Interpreter, accepted for 3.11; idea is the Smalltalk 1984 inline cache. -> A, tying back to Origin.
- I19 Three steps: most code boringly consistent (the + in your loop sees ints every time); after a few runs interpreter rewrites the instruction in place to BINARY_OP_ADD_INT or ADD_FLOAT (term quickening); specialized instruction starts with a guard (term: cheap check the assumption holds, two pointer comparisons; yes, add inline; no, fall back; repeated misses, respecialize or give up). -> A; B voices "so it's a tiny JIT?" and A says no machine code is written, it's swapping one bytecode for another.
- I20 Watch it: dis with adaptive true; after add(1, 2) a thousand times shows RESUME_CHECK and BINARY_OP_ADD_INT; add(1.0, 2.0) a thousand times flips to ADD_FLOAT; also attribute loads, global lookups, calls, for loops over lists (FOR_ITER_LIST). -> A.
- I21 3.11 release notes: average 1.25x over 3.10 on the standard benchmark suite; more each release. -> A.
- I22 Specialization does not remove dispatch per instruction, boxing of every result, refcounting; cheaper steps, not fewer. -> A, firmly.
- I23 Version table, M4 Pro best of 5: fib(30) 93, 59, 52, 49, 37 ms for 3.10 to 3.14; float loop 18.0, 15.7, 13.5, 11.8, 12.4 ns per iteration. Function-call-heavy 2.5x faster in four years; float loop about 1.5x; real progress, nowhere near C. -> A gives endpoints and the trend, not row by row; mentions 3.14's float loop ticked back up slightly.

## The Idea: the JIT in 3.13 and 3.14

- I24 PEP 744 JIT Compilation by Brandt Bucher; hot loop's specialized bytecode translated to micro-ops, simple optimizer removes redundant guards, turned into machine code by copy-and-patch (term: templates compiled when CPython is built, at run time copied end to end and addresses/constants patched in; no compiler runs at run time). -> A.
- I25 Off by default in 3.13 and 3.14; compiled in with enable experimental JIT; builds that include it still need PYTHON_JIT=1; python.org macOS and Windows 3.14 installers include it switched off (as far as the author knows); Homebrew 3.14 does not; uv's 3.14 does. -> A, said carefully with the hedge.
- I26 Docs: experimental, somewhat slower to modestly faster. On the Mac with uv 3.14.0 and the JIT on: fib(30) 37 ms either way; float loop slower, 12.4 to 15.4 ns. Measure your own. -> A; B surprised it got slower.
- I27 Why so little: still boxed objects and refcounts, mainly removes dispatch. PyPy gets big wins (often several times faster) by removing boxes and inlining, but can't run every C extension at full speed, so ML stays on CPython. Practical tools for compiled loops today: Numba (typed subset with LLVM), Cython, C or Rust. -> A.

## The Idea: Python orchestrates, C computes

- I28 Trick: don't make the interpreter faster, make it do less; call it once per array not once per number. -> A, signposted.
- I29 Term C extension: module in C/C++/Rust compiled to a shared library Python imports like a .py, via the C API; NumPy, PyTorch, json and re partly. xs @ xs: one dispatch, one call, hands NumPy a pointer to 80 MB of packed float64s; NumPy calls tuned library (Apple's Accelerate on macOS) with SIMD (term: same op on several numbers at once in a wide register; NEON holds two float64 or four float32), several accumulators, maybe several cores; interpreter idle the whole 0.6 ms. -> A.
- F4 Figure 004 ladder, ns per element, 10M float64, M4 Pro, best of 5, log scale: pure Python 10.4 (about 45 cycles at about 4.5 GHz); C extension over list 3.5 (no eval loop, still pointer to box, two reads, a type check; removing interpreter gave 3x, boxes are the next wall); C over packed doubles -O2 0.6 (no boxes; limit is the chain, each add waits for previous, about 3 cycles each); NumPy (xs*xs).sum() 0.27 (multiple accumulators and SIMD, but writes a temporary 80 MB array first); C -O3 fast-math 0.11 (may reorder float additions, changes rounding slightly, keeps several partial sums in SIMD; five times faster than -O2 from a flag); NumPy @ 0.06 (tuned BLAS; reading roughly 130 GB/s so memory bandwidth is what's left; bandwidth lesson). -> A walks the ladder as a conversation, B guesses where the big jump is (thinks it's "leaving Python"); A: interpreter is only the first 3x of a 170x range.
- I30 170x range, interpreter only first 3x; rest is boxes, memory layout, arithmetic style; "just use C" isn't the answer, C over Python objects is still slow. -> A, payoff line.

## The Idea: the boundary has a toll

- I31 Why not call C for everything: each crossing costs: look up callable, check and convert each argument (unbox float to C double), call through C API, box return; libraries add their own checks. -> A.
- PR2 Predict: pure Python add about 25 ns per call; C add a fraction of a ns; called through ctypes one at a time? Answer: about 250 ns, ten times slower than Python; ctypes most general, works out conversion at run time from declared argtypes; real extensions (C API, Cython, pybind11, nanobind) much cheaper but never free; np.add(1.0, 2.0) about 340 ns, wraps floats into zero-dimensional arrays. Rule: cross rarely, lots of work per crossing. -> A asks, B guesses "a few nanoseconds, it's C", reveal.
- I32 Data crossing: converting the 10M-float list to a NumPy array took 146 ms, longer than the whole pure-Python loop; build a list then convert to call NumPy once and you may have lost; create data packed in the first place (read into an array, generate with NumPy, load tensors from disk). -> A; B: "so the teammate's 0.6 ms was cheating a bit", A: only if the list had to be converted.

## The Idea: PyTorch eager

- I33 Eager mode (each line runs when reached) is the same pattern: forward is Python; each line a Python call into C++ that checks types, shapes, devices, dtypes, picks the right GPU kernel (term: function running on the GPU in thousands of threads; one op launches one or a few; unrelated to the OS kernel), queues it: kernel launch (term: asking the driver to run it; CPU-side cost microseconds whether kernel runs 2 µs or 2 s). -> A.
- I34 Asynchronous: CPU queues and moves on; as long as each kernel takes longer than CPU needs to queue the next, GPU never waits, overhead invisible; normal in big-batch training. -> A; B states the model "so Python is free on the GPU", A: only while kernels are long.
- I35 Shrink the work: batch-1 decode step on a small model, or chain of tiny elementwise ops; each kernel 2-5 µs, but Python + dispatcher + launch several µs per op; GPU finishes and idles; term overhead-bound (time in CPU bookkeeping, not computation or memory; faster GPU doesn't help at all); that's the 30% from the Problem. -> A, closing the loop.
- I36 Mac CPU: one-element torch.add about 450 ns vs 30 ns for two Python floats; all overhead. On GPU add the launch, several µs per op, order of magnitude. -> A with comparison (fifteen times).
- F5 Figure 005 (interactive timeline): CPU row on top, GPU row below; 8-op hand-written GELU chain; modes eager, eager plus CUDA graph, compiled fused; slider for elements per tensor; readouts total, GPU busy, bound by. Model with round numbers, not measurement: 8 µs CPU per eager op, 3 µs minimum kernel, 15 µs compiled call overhead, Spark 273 GB/s spec-sheet with each op reading and writing the whole tensor once. Shape: below a few hundred thousand elements, eager is all launch overhead; big tensors, kernels are long, launches hide, bandwidth decides. CUDA graph removes per-op launch cost; fusion removes kernels and memory traffic. -> A describes what you'd see dragging the slider; derived: at small sizes eager GPU busy is about a third of the time (3 of every 8 µs).

## The Idea: what torch.compile does

- I37 Two ways out, compile can do both. Fewer, bigger kernels: GELU by hand is 8 ops (cube, times a constant, plus x, times a constant, tanh, plus one, times x, times a half); eager runs 8 kernels, each reads and writes a whole tensor: 8 round trips for trivial arithmetic. Term kernel fusion: one kernel reads x once, does all 8 steps per element in a register, writes once; fewer launches small, 8x less memory traffic big. -> A, the 8 steps said as plain words once.
- I38 One launch for many: term CUDA graph: record a sequence of launches (args, addresses) once, replay with one call; same kernels, CPU stops paying one at a time; catch: static, same shapes, same addresses, no CPU decisions in the middle. -> A.
- I39 To fuse, PyTorch must see ops all at once as a graph (term computation graph: list of ops and which outputs feed which inputs; eager never has it, sees only the current op). -> A; B: "so how does it get the whole thing if Python runs line by line?" (real gap, not planted).
- F6 Figure 006: forward's bytecode -> Dynamo traces ops -> FX graph plus guards -> Inductor fuse and codegen -> Triton on GPU or C++ on CPU; graph break branch (print, .item(), numpy) runs as plain Python then new graph; guards same shapes, dtypes, device else recompile; compile once on first call, seconds to minutes, later calls check guards and run cached kernels. -> A describes as a pipeline left to right with a detour below.
- I40 TorchDynamo: PEP 523 (2016, frame evaluation API: lets a library replace the function that runs a Python frame) intercepts before the eval loop; reads forward's bytecode, symbolically runs it, pulls tensor ops into a graph; ordinary Python logic (loops over layers, if on a config flag) baked in for values it saw. -> A, tying back to "eval loop is one C function".
- I41 Guards: compiled graph valid only for what Dynamo saw (shapes, dtypes, device, flag true); each call checks; pass run, fail recompile; too many shapes, recompiling all the time; same idea as the ADD_INT guard one level up. -> A.
- I42 Graph breaks: something untraceable (printing a tensor, .item(), NumPy) ends the graph, runs as Python, new graph after; still works but splits fusion and adds overhead. -> A.
- I43 TorchInductor: fuses elementwise and reductions, plans memory, writes kernels in Triton (Python-like GPU kernel language) on NVIDIA, C++ with OpenMP on CPU; big matmuls still go to vendor libraries (cuBLAS). -> A.
- I44 Modes: reduce-overhead wraps in CUDA graphs; max-autotune compiles much longer trying kernel configs. -> A.
- I45 Cost: first call, not fast: seconds for small model, often minutes for big, again for each new set of shapes; benchmark without compile time is half the story. -> A.
- PR3 Predict: compile one GPT-2 block (768 wide, 12 heads) on Mac CPU, batch 1, 64 tokens, eager about 1.1 ms; faster, slower, same? Answer: slower, 1.13 to 1.40 ms; batch 8, 512 tokens also slightly slower (33 vs 35 ms); CPU time is matmuls already in a tuned library; little to fuse but GELU and LayerNorm; compiled wrapper adds guard overhead per call; where it won on CPU: GELU by hand on 16M elements, 10.9 to 6.8 ms, fusing 8 memory-bound passes into one; compile fixes specific problems (launch overhead, unfused memory-bound ops), not magic; Spark GPU at batch 1 expect different. -> A asks, B confidently says faster (it's a compiler), reveal.

## The Idea: where to optimize

- I46 Map: (1) Python loops over numbers/small objects: vectorize or move loop to compiled code, never call C per element; (2) lots of small library calls: batch them; (3) GPU work in small pieces: bigger batches, compile for fusion, CUDA graphs for launch; (4) big tensor ops: Python irrelevant, compute or bandwidth. -> A, as four cases in speech ("first case... second...").
- I47 Most important rule: find out which case first, with a profiler; cProfile (built in, records every call and return, exact counts, slows call-heavy code a lot: tracing profiler) vs py-spy (Rust, reads a running process's memory from outside many times a second, barely slows it, no code changes: sampling profiler, statistical). -> A; B asks which to trust.

## Build It

- B0 Setup (ok): folder, uv installs 3.10, 3.11, 3.14, venv on 3.14 with numpy, torch, py-spy; print versions and whether the JIT is available; if no torch wheels for newest Python use 3.13; uv run with another python runs a script without a venv. -> One sentence.
- B1 Bytecode task: dis add and a total loop cold; call each about a thousand times; dis adaptive; which changed and into what; then floats; then strings ("a" + "b"); write down expectations first; run on 3.10 too (no adaptive argument, wrap in try); compare raw bytecode; then dis a real function from his ranking code, count instructions per iteration times a few ns = rough cost. Done: at least three instructions specialized and he can say each guard. -> A, what matters is predicting before looking.
- B2 Six ways: C sum_squares body is his; build twice (-O2, and -O3 fast-math native CPU), .so on the Spark; ladder.py: py_sum, load with ctypes setting argtypes/restype, best of 5 with perf_counter; rows; print ms, ns per element, speedup; answers agree to about six digits; hints: get the pointer once outside the timed bit, fast-math may change last digits (reassociation, not a bug). Sixth row: real CPython extension walking the list in C with the list size, get item, float-as-double, return a new float; error check; build with include path and extension suffix; dynamic lookup flag is macOS only; cffi alternative. Done: six rows, answers agree. -> A, the part that matters is the two C loops are his.
- B3 Toll: a million calls each of Python add, ctypes add, np.add on floats, torch.add on one-element tensors, ns per call; time np.array(list) and building a ctypes array; how many pure-Python iterations each is worth. -> A, with the worked "worth" number.
- B4 Profile prep.py (explain): 200,000 fake query-doc pairs, lowercase, regex split, word-overlap in a Python loop, NumPy normalize; cProfile sorted by tottime (time inside each function, not callees; cumtime includes them); py-spy record flame graph (width is time, needs sudo on macOS) and py-spy top; compare wall times with and without cProfile; do they agree, which to trust; fix only the top item, re-measure, stop; use 3.13 if py-spy doesn't support the version. -> A.
- B5 Compile on Mac CPU: his GPT-2 block, a tiny MLP of 8 Linear 64 to 64 plus GELU, and the 8-op GELU; bench warmup 3 then mean under no_grad; first_call timing; cases; fresh Inductor cache directory for cold compile, then again without to see disk cache speed up first call. -> A.
- B6 Spark GPU (review): CUDA PyTorch for ARM64 (check NVIDIA and pytorch.org, it changes); everything on cuda, bfloat16 optional; time with CUDA events or synchronize before reading the clock (otherwise timing how fast Python queues); three modes eager, compile, reduce-overhead; block at batch 1 T=1 and batch 32 T=512; TORCH_LOGS graph breaks and recompiles; agent reviews timing for missing syncs, timing first call with rest, mismatched dtypes. Done: compile table filled for Mac and Spark including compile time, one-sentence explanation each. -> A; B: "why does no sync make it look fast?" answered.

## Measure

- M1 Setup: M4 Pro, Python 3.14.0 from uv, PyTorch 2.14, 10 CPU threads; Spark column his to fill, hints are expectations not results. -> A, briefly.
- M2 Ladder ratios: removing interpreter about 3x; removing boxes about 6x more; SIMD and accumulators another 5x; tuned library another 2x; if wildly different, check you're not timing pointer conversion or list creation. -> A.
- M3 Toll numbers: Python function 25 ns, ctypes 254, np.add on floats 341, torch.add about 450 (include about 30 ns of loop and call overhead); np.array of 10M took 146 ms; ctypes array 460 ms. Break-even: C call 250 ns with 1 ns of work needs about 250 ns of work per call to break even; why NumPy is slow on small arrays. -> A.
- M4 Compile table Mac: tiny MLP 0.024 vs 0.034 ms (0.71x), first call 2.5 s; block B1 T64 1.13 vs 1.40 (0.80x), 0.9 s; block B8 T512 33.1 vs 35.2 (0.94x), 1.1 s; GELU 16M 10.9 vs 6.8 (1.62x), about 0.4 s. Later first calls lower partly because Dynamo/Inductor warmed up; GELU on 16M recompiled because shape changed from the 1,000-element run (a guard failing). -> A, key ones spoken, not every cell.
- M5 Why: matmuls dominate block and already tuned; tiny MLP pure overhead either way, guards add a little; GELU wins because fusion saves 7 of 8 trips (64 MB each way per op); should be more than 1.6x on paper, but eager's CPU elementwise ops already multithreaded and partly cache-friendly. Compile time of a second is nothing for training, a lot for a five-second script. -> A.
- M6 Spark expectation: batch-1 one-token step launches a few dozen kernels finishing in microseconds, eager overhead-bound, GPU idle a lot; reduce-overhead helps most, possibly large factor; at B32 T512 matmuls big, overhead hides, speedup shrinks to what fusion buys on elementwise parts, often 1.1-1.5x for a transformer block; GPU compile includes Triton compilation, longer than Mac; wrong predictions are the interesting part. -> A, as prediction.

## Break It

- K1 Specializer guesses wrong: total on all ints, all floats, alternating int/float; on 3.14 ints and floats about 10 ns per element, mixed 13: became BINARY_OP_EXTEND, newer specialization for common mixed pairs; 3.11 mixed lands on generic path. Specialization rewards boring consistent types; a function seeing a different type every call stays generic. Plus guard-miss stepper content. -> "What if you..." exchange.
- K2 Scatter the boxes: shuffle the list, rerun pure Python and C extension; same values, consecutive pointers now all over the heap; pure Python 10 to 50 ns, C extension 3.5 to 7.5; NumPy immune (packed stays packed). Boxes cost twice: type dispatch and cache misses. -> B asks why order matters if values are the same; A explains cache lines briefly (cpu-caches re-explained).
- K3 Call C in a loop: sum of lib.add(x, x) over a million: several times slower than pure Python; NumPy version, looping over a NumPy array in Python creates a NumPy scalar per element: 48 ns vs 10 for a list. Fast libraries only fast when they get the whole loop. -> B voices "but each op is in C now"; A corrects.
- K4 Break the graph: print of x.mean() or if on .item() in forward, compile, TORCH_LOGS graph breaks: two graphs with Python between; new sequence length every call (60, 61, 62...) with recompiles logging: recompiles until it gives up and marks the dimension dynamic; on GPU, time eager without synchronize: numbers amazing and meaningless. -> A.

## Explain It Back (substance woven in, no quiz)

- E1 Python loop vs C: C decides meaning once at compile time, Python every execution; s += x*x in C a couple of instructions on registers; in CPython several bytecodes each dispatched, type checks from headers, find function, unbox, arithmetic, allocate result, refcounts; plus pointer chasing and cache misses; arithmetic tiny fraction, rest is price of dynamic typing and boxing. -> Lands in Predict reveal and boxes section; B restates in the close.
- E2 3.11: specializing adaptive interpreter; rewrite in place with guard; removes generic lookup and indirect call; about 25% average, more for call-heavy; still interpreted, boxed, allocate, refcount; JIT off by default, not reliably faster. -> Specializer section.
- E3 NumPy in a loop slow: fixed toll per call (lookup, convert, wrap into arrays, allocate result, return), hundreds of ns vs under a ns of work; fast when one call processes millions; Python orchestrates, C computes; few large calls, packed arrays, never per element. -> Toll section and Break It 3.
- E4 Batch 1, 30% utilized: kernels tiny, CPU several µs per op; overhead-bound; confirm with PyTorch profiler or Nsight Systems (gaps between kernels on the GPU timeline); fixes in order: batch more if latency allows, compile to fuse, reduce-overhead for CUDA graphs (static shapes, pad to a few fixed sizes); serving engines like V L L M do exactly this. -> Late in the episode, B asks "so what would I actually do Monday", A answers in order.
- E5 Scale: double tensor sizes, overhead matters less; overhead per op fixed, kernel time grows (memory-bound about linear in bytes, matmuls faster than that); bottleneck moves to bandwidth or compute; dangerous direction is smaller batches, smaller models, more ops per step; tiny-batch inference benefits most from compile and CUDA graphs, big-batch training barely notices Python. -> Exchange near the end, B guesses "more" (plausible wrong model), A corrects.

## Go Deeper / Connections

- G1 Best sources: Horace He's "Making Deep Learning Go Brrrr From First Principles"; PEP 659. -> One sentence near the end.
- C1 GIL guards exactly the interpreter state stepped through here (refcounts, value stack); bandwidth lesson (once overhead's gone bandwidth is the wall, about seventeen tokens a second); batching and serving engines get out of overhead-bound; FlashAttention is fusion taken to its logical end. -> A, one or two sentences before the close.

## Flow

1. Problem (P1-P4), B's "NumPy is just C" model.
2. Origin (O1-O5).
3. Three ways (I1-I5, F1).
4. Bytecode, stack machine, eval loop, dispatch (I6-I11), B's FIFO slip.
5. Boxes (I12-I15, F2).
6. One a + b: Predict 1 and the stepper's generic and C modes (PR1, F3, I16, I17).
7. Specializer, version numbers, stepper's specialized and miss modes (I18-I23).
8. JIT (I24-I27).
9. Orchestrate vs compute, ladder (I28-I30, F4).
10. Toll, Predict 2, data crossing (I31, PR2, I32).
11. PyTorch eager, launch figure (I33-I36, F5).
12. torch.compile, Dynamo/guards/breaks/Inductor/modes/cost, Predict 3 (I37-I45, F6, PR3).
13. Where to optimize, profilers (I46, I47).
14. Build It (B0-B6) with Measure numbers folded into each task (M1-M6).
15. Break It (K1-K4).
16. Monday answer (E4), scale (E5), sources and connections (G1, C1).
17. Close: B restates, A sharpens.
