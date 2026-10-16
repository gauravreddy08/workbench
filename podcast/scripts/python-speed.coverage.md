# Coverage: python-speed

Lesson src/lessons/python-speed.mdx vs podcast/scripts/python-speed.md. Item IDs match
podcast/outlines/python-speed.md. "Fixed" = was MISSING or wrong in the first draft and has been
added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs (heap objects with header; GIL; cpu-caches) | Boxes; Break It; Connections | "every single value is an object on the heap"; "memory comes into the CPU's cache in small chunks"; "The GIL, that one lock" | covered |
| P1 10M floats, obvious loop, ~100 ms | Problem | "ten million floats, square each one... about a hundred milliseconds" | covered |
| P2 NumPy 0.6 ms, six digits, 170x | Problem | "about six tenths of a millisecond"; "A hundred and seventy times faster" | covered |
| P3 PyTorch batch 1 on Spark, 30% busy, waiting on Python | Problem | "nvidia S M I... it says thirty percent" | covered |
| P4 Same villain, not Rust, boundary, 3% | Problem | "which three percent of your code is actually worth touching" | covered |
| O1 FORTRAN 1957 compiler, near assembly speed | Origin | "John Backus's team at I B M ships FORTRAN" | covered |
| O2 LISP 1958-60, Russell, McCarthy's eval, interpreter | Origin | "Steve Russell hand-coded John McCarthy's eval function" | covered |
| O3 1984 Deutsch/Schiffman, lazy compile, inline cache | Origin | "That's called an inline cache" | covered |
| O4 Self, HotSpot, V8 2008 | Origin | "people from Self went on to build Java's HotSpot" | covered |
| O5 Python 1989, C interpreter, 30-100x for 30 years, since 2022 | Origin | "thirty to a hundred times slower... since twenty twenty-two" | covered |
| I1 Machine code, ARM vs x86 | Three ways | "ARM, which is your Mac and the Spark, versus x eighty-six" | covered |
| I2 Compiler, French edition | Three ways | "a translator handing you the finished French edition" | covered |
| I3 Interpreter; CPU runs the interpreter; code is data | Three ways | "The CPU never runs your Python. Not one line of it." | covered |
| I4 JIT, keeps notes, specialised with checks; PyPy/HotSpot/V8 | Three ways | "after the hundredth time it hears the same sentence" | covered |
| F1 Fig 001 three pipelines | Three ways | "three lines across a whiteboard" | covered |
| I5 Bytecode, .pyc cache, dumb compiler, "mostly the second" | Three ways | "It is compiled! Just not to machine code."; "Mostly the second." | covered |
| I6 dis, four instructions, fused load, 3.11 form | Reading bytecode | "load fast borrow, twice, glued together" | covered |
| I7 Stack machine; LIFO (diagnostic FIFO correction); separate from C stack | Reading bytecode | B: "first in, first out." A: "Last in, first out." | covered |
| I8 Nothing says integer | Reading bytecode | "Nothing in there says integer" | covered |
| I9 Eval loop, the function name, shape | Eval loop | "Py Eval, Eval Frame Default... C eval dot C" | covered |
| I10 Jump table, generated since 3.12 | Eval loop | "jump table instead of a big switch statement" | covered |
| I11 Dispatch cost | Eval loop | "A read from memory, a jump that the CPU has to guess" | covered |
| I12 Heap re-explained (not the tree) | Boxes | "heap here doesn't mean the tree data structure" | covered |
| I13 C long 8 bytes, register, 31 regs, no type | Boxes | "thirty-one general-purpose ones, each sixty-four bits" | covered |
| I14 Pointer to int object; refcount, type, size; 28 bytes; boxing | Boxes | "get size of, on the number one, says twenty-eight bytes" | covered |
| F2 Fig 002 C vs Python box, list of pointers vs NumPy | Boxes | "Picture it drawn out." | covered |
| I15 Dynamic typing, no overflow, 2^200, uniform handling; price | Boxes | "Two to the power of two hundred just works" | covered |
| PR1 Predict: one add, ~dozen steps; counts | One a plus b | B: "half and half?"; "Three dispatches, four type checks..." | covered |
| F3 Stepper: generic, specialised, miss, C modes | One a plus b; Specializer | "the subclass" rule; "small ints from minus five to two fifty-six"; miss walk "not mine, not implemented"; C "about one clock cycle... four to sixteen" | covered |
| I16 PyNumber_Add chain, function pointer, 10 ns vs 0.2 | One a plus b | "a variable that holds the address of a function" | covered |
| I17 Scattered boxes, cache, 5x slower when shuffled | One a plus b | "the same loop gets five times slower" | covered |
| I18 Faster CPython 2022, Shannon/van Rossum/Microsoft, PEP 659 | Specializer | "pep six fifty-nine, the specialising adaptive interpreter" | covered |
| I19 Consistent code, quickening, guard | Specializer | "That rewriting has a name, quickening" | covered |
| I20 adaptive dis, RESUME_CHECK, ADD_INT/ADD_FLOAT, other specialisations | Specializer | "resume turns into resume check"; "for iter list" | covered |
| I21 1.25x average | Specializer | "about one point two five times faster than three ten" | covered |
| I22 Doesn't remove dispatch/boxing/refcount | Specializer | "It makes each step cheaper. It doesn't remove steps." | covered |
| I23 Version table endpoints and trend | Specializer | "ninety-three milliseconds on three ten to thirty-seven"; "eighteen... to around twelve" | covered |
| I24 PEP 744, micro-ops, guard removal, copy-and-patch | JIT | "Like filling in blanks on a form" | covered |
| I25 Off by default, build flag, PYTHON_JIT, installers, Homebrew, uv | JIT | "Homebrew's three fourteen on the Mac does not include it" | covered |
| I26 Docs wording; 37 ms both; 12.4 to 15.4 | JIT | "about twelve and a half... to about fifteen and a half" | covered |
| I27 Why small; PyPy; Numba, Cython, C/Rust | JIT | "Numba, which compiles a typed subset of Python using LLVM" | covered |
| I28 Make it do less, once per array | Orchestrates | "Call it once per array, not once per number." | covered |
| I29 C extension; 80 MB; Accelerate; SIMD/Neon; idle 0.6 ms | Orchestrates | "Neon, and its registers hold two float sixty-fours or four float thirty-twos" | covered |
| F4 Ladder six rungs with explanations | Orchestrates | all six rungs, 10.4 / 3.5 / 0.6 / 0.27 / 0.11 / 0.06, 45 cycles, 130 GB/s | covered |
| I30 170x, interpreter first 3x, C over objects still slow | Orchestrates | "The interpreter is the first three times, out of a hundred and seventy." | covered |
| I31 Crossing cost steps | Toll | "unbox a float into a raw C double" | covered |
| PR2 Predict ctypes ~250 ns; real extensions; np.add 340 ns; rule | Toll | B: "a few nanoseconds? Five?"; "About two hundred and fifty" | covered |
| I32 146 ms conversion; create data packed | Toll | "a hundred and forty-six milliseconds on the Mac" | covered |
| I33 Eager; kernel (GPU) term; kernel launch | PyTorch | "Nothing to do with the operating system's kernel" | covered |
| I34 Async, overhead hidden while kernels long | PyTorch | B's "Python basically doesn't matter"; "as long as one condition holds" | covered |
| I35 Small work, overhead-bound, the 30% | PyTorch | "That's called being overhead-bound." | covered |
| I36 torch.add 450 ns vs 30 ns; GPU several µs | PyTorch | "about four hundred and fifty nanoseconds" | covered |
| F5 Fig 005 timeline, slider, modes, model constants | PyTorch | "Two horizontal lanes"; "Eight microseconds of CPU per eager op" | covered |
| I37 GELU 8 ops; fusion; 8x less traffic | Compile | "cube x, multiply by a constant..." | covered |
| I38 CUDA graph, static catch | Compile | "replay the whole recording with a single call" | covered |
| I39 Computation graph; eager never has it | Compile | "It only ever sees the op it's on." | covered |
| F6 Fig 006 pipeline | Compile | "So picture a pipeline, left to right." | covered |
| I40 Dynamo via PEP 523, frame, symbolic, baked in | Compile | "pep five twenty-three added a hook" | covered |
| I41 Guards, recompile, same idea as ADD_INT | Compile | "the same idea as the add-int guard, just one level up" | covered |
| I42 Graph breaks | Compile | "calling dot item to get a plain Python number out" | covered |
| I43 Inductor, Triton, C++/OpenMP, cuBLAS | Compile | "Open M P"; "cue blas" | covered |
| I44 reduce-overhead, max-autotune | Compile | "Max autotune spends a lot longer compiling" | covered |
| I45 Compile cost, half the story | Compile | "only telling you half the story" | covered |
| PR3 Predict GPT-2 block on CPU slower; reasons; GELU 16M win | Compile | B: "Faster. It's a compiler."; "one point one three milliseconds to one point four" | covered |
| I46 Four cases map | Where to optimize | "First case... Fourth, big tensor ops." | covered |
| I47 Profilers: cProfile tracing, py-spy sampling | Where to optimize | "That's called a tracing profiler."; "That's a sampling profiler." | covered |
| B0 Setup | Build It | "use U V to install Python three ten, three eleven and three fourteen" | covered |
| B1 Bytecode task + done-when | Build It | "before you look, write down which instructions you expect to change" | covered |
| B2 Six ways, C body, two builds, hints, extension, cffi | Build It | "fast math may change the last few digits"; "C F F I is a fine stand-in" | fixed (cffi added) |
| B3 Toll task | Build It | "A million calls each." | covered |
| B4 Profile prep.py | Build It | "fix only the top item, re-measure, and stop" | covered |
| B5 Compile on Mac CPU, cold cache | Build It | "a fresh, empty cache directory for Inductor" | covered |
| B6 Spark GPU, sync, modes, logging, review | Build It | "You have to synchronise with the GPU before you read the clock" | covered |
| M1 Measure setup | Build It | "from the M four Pro, with U V's three fourteen, PyTorch two point fourteen, ten CPU threads" | fixed (added) |
| M2 Ladder ratios 3/6/5/2, check timing | Build It | "about three times... about six times more... another five... another two" | covered |
| M3 Toll numbers, conversions, break-even | Build It | "twenty-five for Python, about two fifty-four"; "about two hundred and fifty nanoseconds' worth of work" | covered |
| M4 Compile table Mac + footnote | Build It | "point oh two four milliseconds eager"; "That's a guard failing, live." | covered |
| M5 Why the Mac numbers | Build It | "fusion saves seven of the eight trips through memory" | covered |
| M6 Spark expectations | Build It | "Often one point one to one point five times for a transformer block" | covered |
| K1 Specializer wrong, BINARY_OP_EXTEND | Break It | "binary op extend" | covered |
| K2 Shuffle 10->50, 3.5->7.5, NumPy immune | Break It | "pure Python went from ten nanoseconds per element to fifty" | covered |
| K3 C in a loop; NumPy scalar 48 vs 10 | Break It | "forty-eight nanoseconds per element" | covered |
| K4 Graph break, recompiles to dynamic, no-sync timing | Break It | "until it gives up and marks that dimension as dynamic" | covered |
| E1 Loop vs C substance | One a plus b; close | "That ratio, a dozen steps to one"; close B restatement | covered |
| E2 3.11 substance | Specializer; JIT | "about a quarter faster"; "off by default" | covered |
| E3 NumPy in a loop substance | Toll; Break It 3 | "cross the boundary rarely, and do a lot of work" | covered |
| E4 Batch 1 at 30%: confirm, fixes in order, V L L M | Explain It Back | "Nsight Systems, as gaps between the kernels"; "V L L M do exactly that" | covered |
| E5 Scale: overhead matters less | Explain It Back | B: "it gets worse as the model gets bigger"; A: "The other way round" | covered |
| G1 Sources | Connections | "Horace He's... pep six fifty-nine" | covered |
| C1 Connections | Connections | "FlashAttention is basically kernel fusion taken as far as it goes" | covered |

Number check: every number in the script was compared against the lesson. Derived (not written in the
lesson): 28 bytes is "three and a half times" 8; 10 ns vs 0.2 ns is "fifty times"; 450 ns vs 30 ns is
"fifteen times"; 146 ms / ~10 ns is "about fourteen million iterations"; GPU busy "maybe a third of
the time" from the figure's model constants (3 µs kernels every 8 µs); 0.71x/0.80x/0.94x said as
"seventy-one / about eighty / about ninety-four percent". Removed from the first draft: a 64-byte
cache-line figure (not in this lesson, and wrong for Apple chips).
