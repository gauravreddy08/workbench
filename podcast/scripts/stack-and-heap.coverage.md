# Coverage: stack-and-heap

Lesson src/lessons/stack-and-heap.mdx vs podcast/scripts/stack-and-heap.md. Item IDs match
podcast/outlines/stack-and-heap.md.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 L1 about 1 ns vs RAM about 100 ns | Why the stack is fast | "reading from it takes about a nanosecond... about a hundred nanoseconds" | covered |
| T2 Tools: C compiler, Python 3.12+, numpy, Mac and Spark | Build It: address space | "You need a C compiler... Python three twelve or newer, and numpy" | covered |
| P1 Diagnostic answer (stack FIFO, heap sorted tree) | Problem | B: "The stack is first in, first out... that tree. The sorted one" | covered |
| P2 Wrong in a normal way; the words do it | Problem | "it's not you, it's the words" | covered |
| P3 Stack is LIFO, plates | Problem | "Think about a stack of plates in a kitchen cupboard" | covered |
| P4 FIFO is a queue, coffee line | Problem | "That's the line at a coffee shop" | covered |
| F1 Fig 001 plates vs queue, top plate only | Problem | "only ever touches its top plate" | covered |
| P5 Binary heap definition | Problem | "It's called a binary heap... smallest item is always sitting at the root" | covered |
| P6 Memory heap: runtime chunks, unsorted, parking lot | Problem | "closer to a parking lot with gaps in it" | covered |
| P7 Williams 1964, ALGOL 68 HEAP, accidental clash | Problem | "J. W. J. Williams named the tree 'heap' in nineteen sixty-four" | covered |
| P8 Real question; 400 MB vs 2 GB, recursion, slow RAM growth | Problem | "a list that 'should' be four hundred megabytes is actually two gigabytes" | covered |
| O1 FORTRAN II 1958, fixed slot per subroutine | Origin | "FORTRAN two, from nineteen fifty-eight" | covered |
| O2 Self-call overwrites return address; recursion banned | Origin | "the program can never find its way home" | covered |
| O3 ALGOL 60, Dijkstra 1960 Recursive Programming | Origin | "Edsger Dijkstra published a paper called 'Recursive Programming'" | covered |
| O4 Bauer and Samelson 1957 patent, Kellerprinzip | Origin | "They called it the Kellerprinzip. The cellar principle." | covered |
| O5 Dedicated top-of-stack register in CPUs | Origin | "one register... that just points at the top of this pile" | covered |
| I1 Process definition | Address space | "a running program plus everything the OS keeps track of for it" | covered |
| I2 Address space, each process its own | Address space | "address four thousand ninety-six in one program has nothing to do with" | covered |
| I3 2^47 / 2^48, hundreds of TB | Address space | "two to the forty-seven, or two to the forty-eight. So, hundreds of terabytes" | covered |
| I4 Virtual addresses, translated page by page, later lesson | Address space | "They're virtual addresses... a page at a time" | covered |
| F2 Fig 002 regions and example addresses | Address space | "Picture it standing up, like a building"; "start with five five... seven f f d" | covered |
| I5 Code / text segment, read-only | Address space | "People also call it the text segment" | covered |
| I6 Globals, int g = 42, loader | Address space | "int g equals forty-two... the loader just sets aside exactly that much" | covered |
| I7 Heap grows up | Address space | "It sits right above the globals and grows upward" | covered |
| I8 Memory-mapped: libs, files, >128 KB on Linux (glibc) | Address space | "bigger than about a hundred twenty-eight kilobytes lands" | covered |
| I9 Stack near top grows down | Address space | "It starts high and grows down" | covered |
| I10 Address zero unmapped, null pointer | Address space | "Because of null pointers" | covered |
| I11 Layouts vary: macOS stack below heap; Spark 0xaaaa / 0xffff | Address space | "the numbers start with a a a a and f f f f instead" | covered |
| I12 ASLR | Address space | "That's called A S L R, address space layout randomization" | covered |
| I13 Stack frame | Stack | "That bundle is called a stack frame" | covered |
| I14 Push/pop, LIFO by necessity | Stack | "A function always finishes before the function that called it finishes" | covered |
| I15 Frame contents incl. frame pointer, stack trace | Stack | "That's literally what a stack trace is" | covered |
| I16 Return address, ARM64 x30 link register | Stack | "x thirty, which people call the link register" | covered |
| I17 Stack pointer, rsp / sp | Stack | "On x eighty-six it's called R S P, on ARM it's just S P" | covered |
| PR1 Predict sum-depth: 5 frames; sum(2) resumes with n = 2 | Predict | "Main, three, two, one, zero. Five frames." | covered |
| F3 Fig 003 stepper: code, frames, slider 1-6, SP readout, 32 B illustrative | Predict | "There's an interactive version of this you can step through" | covered |
| I18 Newest frame drawn at bottom | Predict | "plates stacked upside down from the ceiling" | covered |
| I19 One instruction to allocate/free, no search/lock | Why fast | "take S P, subtract thirty-two, put it back in S P" | covered |
| I20 Top of stack in L1, hottest memory | Why fast | "Stack memory is the hottest memory you have" | covered |
| I21 Rigidity: reserved up front, frame size at compile time | Why small | "the price for that speed is rigidity" | covered |
| I22 8 MB default; 8192 Linux / 8176 macOS | Why small | "eight thousand one hundred ninety-two... eight thousand one hundred seventy-six" | covered |
| I23 Plenty for code, nothing for data; 2M doubles = 16 MB | Why small | "a local array of two million doubles... sixteen megabytes" | covered |
| I24 Guard page | Why small | "the OS puts a guard page" | covered |
| I25 Segfault, SIGSEGV 11, exit 139 = 128 + 11 | Why small | "a hundred twenty-eight plus eleven" | covered |
| I26 Stack overflow, the website | Why small | "Like the website." | covered |
| I27 Own stack per thread; Linux 8 MB, macOS 512 KB; one shared heap | Why small | "On macOS, extra threads only get five hundred twelve kilobytes" | covered |
| I28 Heap needed for runtime size and outliving the function | Heap | B: "couldn't you just make the stack bigger?"; "The second is lifetime" | covered |
| I29 malloc / free in words | Heap | "give me room for n floats... call free" | covered |
| I30 Allocator; glibc, jemalloc, mimalloc; CPython, PyTorch own | Heap | "the code behind it is called an allocator" | covered |
| I31 Find gap of 400 bytes; ask OS: extend or map region | Heap | "finds a free gap of at least four hundred bytes" | covered |
| I32 System calls cost | Heap | "a few hundred nanoseconds to many microseconds" | covered |
| I33 malloc tens of ns; scattered; a hundred million times | Heap | "Both are a disaster a hundred million times in a loop" | covered |
| F4 Fig 004: 16 blocks, 7 free, largest hole 2, 4-block request fails | Fragmentation | "Seven are free, and none of the holes is bigger than two" | covered |
| I34 Fragmentation definition; creeping memory without leaks | Fragmentation | "It frees exactly as much as it allocates, but into holes too small" | covered |
| I35 Size classes; CPython does this | Fragmentation | "grouping chunks into size classes" | covered |
| I36 Pop is the cleanup; heap needs a decider | Who frees | "The pop is the cleanup" | covered |
| I37 C: you; leak; double free / use after free; security bugs | Who frees | "a big fraction of real-world security bugs" | covered |
| I38 CPython refcount + cycle collector | Who frees | "counting, plus a sweeper" | covered |
| I39 Rust: compiler, one owner | Who frees | "And in Rust, it's the compiler" | covered |
| I40 Everything on heap; names not boxes | Python | B: "I picture a box"; "Variables are names that point at objects" | covered |
| I41 x = 1000, y = x, id is the address | Python | "the I D function... literally its memory address" | covered |
| I42 Header 8 + 8 + 8 + 4 = 28 B; 30-bit digits | Python | "So eight, plus eight, plus eight, plus four. Twenty-eight bytes." | covered |
| F5 Fig 005: names, list of pointers, numpy buffer, ~112 B header | Python | "Picture three drawings" | covered |
| I43 Million ints: 36 naive, ~40 measured (16-byte steps), numpy 8 MB, 5x, prefetcher | Python | "rounded up to thirty-two... Five times smaller" | covered |
| I44 getsizeof(0) 24 in 3.10, 28 from 3.11; 3.12+ 64-bit | Python | "In three ten, an int zero was twenty-four bytes" | covered |
| I45 Small ints -5..256 shared; [0]*1M = 8 MB | Python | "from minus five up to two fifty-six" | covered |
| I46 getsizeof shallow vs tracemalloc | Python | "It's a shallow number" | covered |
| F6 Slider: list vs packed, ints/floats, 128 GB, append 12% | Python | "There's a slider that makes the scale land" | covered |
| I47 CPython frames on heap since 3.11; C stack flat | CPython frames | "since CPython three eleven, those records live in... the heap" | covered |
| I48 C recursion: repr, json, pickle, comparisons, extensions | CPython frames | "Calling R E P R... JSON dumps. Pickle. Comparisons." | covered |
| I49 Recursion limit 1000, history, 3.12+ C check, raising on old Python | CPython frames | "Default's a thousand... you get to segfault instead" | covered |
| I50 del removes the name | del | "It deletes the name x" | covered |
| I51 Most leaks = growing long-lived container | del | "some long-lived container that keeps growing" | covered |
| I52 Cycles; Instagram 2017 disabled GC | del | "Instagram famously did, in twenty seventeen" | covered |
| F7 Fig 006 tensor chain, 4,000,000 B, 2 users, offset 10000 | Tensor | "one single storage, four million bytes, two users" | covered |
| I53 Tensor object: shape, strides, dtype, device, storage; CPU heap vs CUDA | Tensor | "Strides just mean how many elements to skip" | covered |
| I54 Views share storage; edits propagate | Tensor | "modifying a view modifies the original" | covered |
| I55 Caching allocator; allocated vs reserved; nvidia-smi | Tensor | "memory allocated, which is live tensors... memory reserved" | covered |
| I56 Spark unified 128 GB; separate allocators; copy; no PCIe; check docs | Tensor | "no P C I E bus in between" | covered |
| B1 where.c and Mac sample shape; -O0 | Build: address space | "dash O zero, because otherwise the compiler keeps locals only in registers" | covered |
| PR2 Predict addr-order: depth 3 lower, 48 B, ASLR moves base, gaps fixed | Build: address space | "In that Mac run it was forty-eight bytes. Thirty in hex." | covered |
| B2 boom.c, flush, ulimit doubling, macOS cap 65520 | Build: boom | "macOS caps it at sixty-five thousand five hundred twenty" | covered |
| B3 Python depth(): 5000 error; 500,000 succeeds 3.11+; ru_maxrss units; nested repr; 3.10 via uv | Build: Python recursion | "bytes on macOS and in kilobytes on Linux" | covered |
| B4 weigh.py five questions incl. 2^30 jump, 256 vs int("1000") | Build: weigh | "the int needs a second one, four more bytes" | covered |
| B5 Tensor task: storage bytes, shared ptr, offset 40,000 B, v[0,0]=7, CUDA 1 GB, empty_cache | Build: tensor | "Forty thousand bytes in... It's seven." | covered |
| B6 Leak hunt: tracemalloc(10), snapshots 1k/20k, top 5, unbounded cache + cycle with gc off, minimal fixes | Build: leak | "The lambda refers to self. And self holds the lambda." | covered |
| B7 Done When | Build: leak | "And that's the whole set. If you've watched your own stack grow downward" | covered |
| M1 ulimit 8176 / 8192 | Why small | (see I22) | covered |
| M2 Gap tens of bytes | Build: address space | "typically tens of bytes" | covered |
| M3 boom depth ~7,000-8,000; 1.1 KB frames; doubled ~2x | Build: boom; Measure | "Eight megabytes divided by about one point one kilobytes is around seven thousand" | covered |
| M4 depth(500,000) ~100 MB on 3.14; 100-200 B/frame | Build: Python recursion | "On CPython three fourteen, half a million deep, it's about a hundred megabytes" | covered |
| M5 list ~40 MB, numpy 8.0 MB; 5x ints, 4x floats | Python; Measure | "for floats it's four times, eight plus twenty-four" | covered |
| M6 Dict ~100 MB = 40 + 32 + 32 | Build: weigh | "Forty plus thirty-two plus thirty-two, about a hundred" | covered |
| M7 Leak growth: your number | Build: leak | "you'll get your own number for growth per thousand requests" | covered |
| M8 Off by >20%: version, small ints, append | Measure | "off by more than about twenty percent" | covered |
| K1 Return pointer to local: 1234 then 1 | Break It | "it printed twelve thirty-four, then one" | covered |
| K2 Double free: glibc tcache message, Mac exit 133, ASan | Break It | "double free detected in tcache two"; "dash f sanitize equals address" | covered |
| K3 del that frees nothing, 500 MB array in list, notebook OOM | Break It | "my notebook running out of memory" | covered |
| K4 Recursion limit as crash on 3.10, depth(200,000), guardrail | Break It | "removed the guardrail. It didn't make the road any wider" | covered |
| E1 Frame vs malloc model answer | Heap | B: "a frame is one instruction because..."; A: "Malloc sometimes has to take a lock" | covered |
| E2 Why not everything on stack: size, lifetime, unknown size | Heap | "size is only one of the three problems" | covered |
| E3 a = [1000, 2000]; b = a; del a | del | "Walk through one. a equals a list with a thousand and two thousand" | covered |
| E4 50M dict: ~5 GB, resize, 12 B info, 600 MB, 8x, searchsorted, dense 200 MB | Build: dict | "Fifty million times twelve bytes is six hundred megabytes" | covered |
| E5 Two threads: own stacks, shared code/globals/heap, GIL | Why small | "So picture two threads in the same process" | covered |
| G1 CS:APP, OSTEP | Break It (end) | "the Computer Systems book by Bryant and O'Hallaron" | covered |
| C1 Connections | Break It (end) | "leads straight into the next lesson, on processes, threads and the GIL" | covered |

Numbers check: every number in the script matches the lesson. Derived (not written in the lesson):
"a thousand times bigger, or more" (2^47 bytes vs 128 GB); "three and a half times" (28 vs 8 bytes);
"four more bytes" for an int at 2^30 (second 30-bit digit); "forty thousand bytes" (10 x 1000 x 4,
the lesson gives the formula); "twenty new entries per request" (20 docs per request in leaky.py).
