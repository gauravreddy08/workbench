# Outline: processes-threads-gil

## The one big idea

A process is a walled-off kitchen with its own memory; a thread is a cook inside it, sharing
everything but its own place in the recipe and its own stack. In standard Python, one lock (the
GIL) lets only one cook run Python code at a time, so threads speed up waiting but never Python
working; processes get real parallelism by paying for the wall, in startup and in copying data
across it.

## Opening scene

His dedupe preprocessing script for the cross-encoder: forty minutes, one core of the Spark pegged,
the rest idle. Wrap it in a thread pool: forty one minutes. Swap to a process pool: three minutes,
one word changed. Then the same thread pool makes a scraping job dramatically faster. Threads are
useless for one job and magic for the other.

## The wrong mental model B voices

Diagnostic: process versus thread and the GIL were blank. B voices the natural guess: "a thread
is a lighter process; twenty threads on twenty cores should be twenty times faster." Later B
assumes the GIL protects his own code from races.

## Story beats

1. The three timings; B's "threads should parallelize" guess.
2. Origin: one job at a time, the expensive CPU idle while a tape drive spun. Time-sharing at MIT
   switched between several loaded programs many times a second, each fenced off: the process.
   Threads came later, for several flows of control sharing one program's memory. Python added
   threads early on and put one big lock around the interpreter.
3. Kitchen and cook. A process: its own private memory (the wall, why one crash doesn't take down
   your browser), its own open files, an ID, at least one thread. The kernel runs threads, not
   processes. A thread owns only its place in the code, its working values, and its stack (re-explain
   the stack in a sentence); it shares the heap and everything else. Cheap to start, free to share,
   and able to trample each other.
4. The scheduler: thousands of threads, a dozen cores. Running, ready, blocked; a blocked thread
   uses no CPU. Short turns, and a context switch is the cook leaving a note saying where they were.
5. Concurrency (several in progress, taking turns) versus parallelism (running at the same instant).
   Concurrency speeds up waiting; only parallelism speeds up working. CPU-bound versus I/O-bound.
6. The GIL: one recipe book, and only the cook holding it may run Python. Explains forty one minutes
   and the scraper both.
7. When it lets go: on a timer, and around slow things outside Python: sockets, sleep, big NumPy and
   PyTorch operations, hashing big buffers.
8. Why it exists: every object's reference count (re-explained) changes constantly; two threads
   updating it at once can lose an update, leaking memory or freeing something in use. Lock every
   count and every program slows down; one big lock in a world of one-core machines was the cheap
   answer, and C extensions grew up relying on it. Removing it naively made Python slower.
9. Races: plus-equals-one is read, add, write; two threads can both read the old value. A lock makes
   a critical section. The GIL protects the interpreter, not your logic. When I ran it, the normal
   build happened not to race in a tight loop (luck of implementation); the free-threaded build lost
   most of the updates.
10. Free-threaded Python: now an officially supported but optional build, a bit slower single
    threaded; on it, my prime-counting threads scaled like processes.
11. Processes: own interpreter, own GIL, real parallelism. Pay for startup (fork clones the parent,
    spawn starts fresh; different defaults on Mac and Linux; forking while other threads hold locks
    can deadlock) and for communication (pickle through a pipe). When I ran it: sending big lists to
    processes made them lose badly. Send work, not data. Shared memory is the escape hatch.
12. In ML: DataLoader workers are processes; reading Python objects still writes their counts, so
    fork's shared pages get copied into every worker; the tokenizers fork warning is the fork-with-
    threads problem; the training loop is fine on one thread because Python only launches GPU work.
13. Ending: B says "threads for waiting, processes for working"; A sharpens: the GIL only blocks
    Python code itself, so threads also work for heavy C code that lets go of it, and processes only
    win when the work is big next to what you ship across the wall. Pointer: is a thread per wait the
    cheapest way to wait on ten thousand things?

## Numbers worth saying

- Forty minutes, forty one minutes, three minutes (the hook).
- Twenty cores on the Spark.
- Turns of a few milliseconds.

## Left to the written lesson

Figures (address space with three threads, scheduler timeline, lost update stepper, worker
processes), context switch cost table, TLB, the switch interval value, PEP numbers and version
history details, biased reference counting and immortal objects, start-method defaults by version,
copy-on-write details, all Build code (cores.py, slow server, cpu.py, io_job.py, race.py, ps and
py-spy, the Spark sweep), the Measure tables and reference timings, rounds-of-eight arithmetic,
Break It (chunk sizes, pickling cost numbers, missing main guard, BLAS oversubscription), Amdahl's
law answer, Go Deeper.
