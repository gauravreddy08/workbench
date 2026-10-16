<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture a preprocessing script. The kind you write before training the cross-encoder. It reads two million query-document pairs, cleans up the text, and hashes each one so you can throw out the duplicates. And it takes forty minutes. Now, the Spark has twenty CPU cores. So you open H top, and you see one core pinned at a hundred percent... and nineteen doing absolutely nothing.

B: Okay, so that one's easy. You've got twenty cores, you split it up twenty ways. Twenty workers, twenty times faster. Two minutes.

A: That's exactly what you'd try. You wrap the loop in a thread pool, Python's thread pool executor, with twenty workers. And it takes forty-one minutes.

B: [surprised] Forty-one? It got slower?

A: A little slower. So then you try the process pool executor instead. Same twenty workers. And it takes three minutes. Same function, same data. You changed one word.

B: Huh. So threads in Python are just... broken.

A: [amused] That's what everyone concludes. And then, feeling pretty good about yourself, you take that same thread pool and use it to fetch five thousand web pages for a scraping job. And that one goes from forty minutes to two. So threads are useless for one job and basically magic for the other. And if you can't say why, you'll keep guessing. And the guesses go wrong in expensive ways. A data loader that starves the GPU. A server that falls over at fifty users. A script that deadlocks, like, once a week, and never when you're watching.

B: So what's the actual difference between the two jobs?

A: [thinking out loud] That's the whole episode, really, and it comes in three layers. First, what the operating system actually gives you, which is processes and threads. Second, how it shares a handful of cores among hundreds of those things, which is the scheduler. And third, one very specific decision the people building Python made in the early nineteen nineties. That's the GIL.

<!-- section: Origin -->

A: And the first layer goes back a long way. Early computers ran one job at a time. You'd load a job, it'd run, and if it needed to read from a tape drive, it waited. And while it waited, the CPU, which was the single most expensive thing in the building, just sat there idle. So time-sharing systems fixed that. C T S S at M I T, in nineteen sixty-one, and later Multics, and then Unix. The idea was, keep several programs loaded at once, and switch between them many times a second. And fence each one off in its own memory, so they can't wreck each other. And that fenced-off running program got a name. A process.
Threads came later. The nineteen eighties and nineties. First in a research system called Mach, and then POSIX threads, which got standardised in nineteen ninety-five. People wanted several flows of control inside one program, sharing its memory cheaply. Like a server handling a bunch of clients, or a GUI that stays responsive while it's computing something in the background. And Python added threads in the early nineties too. And to keep its interpreter simple and safe, it put one big lock around the whole thing. That lock is the GIL. And, you know, we're still talking about it thirty years later.

<!-- section: The Idea: Program vs process -->

B: [a bit unsure] Okay, before we go further. I've always kind of used program and process as the same word. Is there actually a difference?

A: [warm] There is, and it's worth getting straight because everything sits on it. A program is a file. That's it. A file on disk with machine code in it. For Python, the program is the interpreter binary, python three, plus your dot py files, which is just text the interpreter reads. And neither of them does anything while they sit on disk. They're inert.
When you type python three train dot py, the kernel creates a process. The kernel, quickly, is the core of the operating system. It's the one program that talks to the hardware directly, and it decides who gets the CPU and who gets memory. So the kernel makes a process, which is a running instance of a program, plus everything the operating system keeps track of for it. Its own memory, the files it has open, an ID number, and at least one thread. And if you run the same command in two terminals, you get two processes from one program.
So here's the picture I want to use for the rest of this. A process is a kitchen. It's got walls, its own pantry, its own equipment. A thread is a cook working in that kitchen. A kitchen needs at least one cook, or nothing gets made. And several cooks in one kitchen share the pantry and the counters. Which is fast, because nobody has to walk to another building to get the flour. And it's dangerous, because two cooks can grab the same bowl.
So what does the kernel actually keep for each kitchen? Imagine a sketch. On the left there's one little box, python three plus train dot py, sitting on disk. Two arrows come out of it, both labelled run, and each one lands on a big box, a process. One's process four one two one, the other's four one eight eight. And inside each one, three smaller boxes. An address space. A table of open files. And a threads box that says T one, main. And between the two processes there's a dashed line that says, wall, no shared memory. Four things to notice there.
First, that number. That's the P I D, the process ID. It's just a number the kernel hands out, but it's how every tool names a process. When you kill something, or look at it in P S or top, you're using the P I D.
Second, the address space. Remember the memory layout from the stack and heap lesson? Code at the bottom, then globals, then the heap growing up, and the stack growing down from the top. Each process gets its own whole private copy of that picture. And here's the strange part. The exact same memory address in process four one two one and in process four one eight eight points to different physical RAM.

B: [skeptical] Wait. Same address, different memory? How does that work?

A: [thinking out loud] Because the addresses your program uses aren't real RAM locations. They're more like... seat numbers that get looked up. There's a piece of hardware in the CPU called the M M U, the memory management unit. Every time your program touches an address, the M M U translates it to an actual spot in RAM, using a table. And the kernel sets up a different table for each process. So the same number, looked up in two different tables, lands in two different places. That's the wall. One process literally can't scribble on another one's memory. Which is why a crash in your Python script doesn't take down your browser.

B: Oh, okay. So the wall is the lookup table.

A: The wall is the lookup table. Third thing, open files. Every file, every network socket, every pipe a process has open gets a small number. Zero, one, two, three, and so on. That's called a file descriptor. Zero, one and two are always standard input, standard output and standard error, which is why the first file you open is usually three. And that table of numbers belongs to the process.
And the fourth thing, at least one thread. Because, and this surprises people, the kernel doesn't actually run processes. It runs threads. A process with zero threads is just a reserved room nobody's cooking in.

<!-- section: The Idea: What a thread owns and shares -->

A: So what is a thread, exactly? It's one sequence of instructions being executed. And to execute code, you need exactly three private things. One, an instruction pointer. That's a register in the CPU holding the address of the next instruction to run. It's the you-are-here marker in the code. You'll also hear it called the program counter. Two, the registers themselves. Those are tiny, ultra-fast storage slots inside the core, a few dozen of them on ARM, where the values you're in the middle of computing live. And three, a stack. Your chain of function calls and their local variables, exactly the stack from last time. And there's a register called the stack pointer that says where the top of it is.
That's it. That's all a thread owns. Everything else is shared with every other thread in the same process. The code, the globals, the heap, the open files. So picture the address space again, as a tall column. At the top, three stacks stacked up, one for T one, the main thread, one for T two, one for T three. And there's a bracket next to those three that says private, one per thread. Below them some unused space. And then the heap, which says "every Python object", then globals, then code at the bottom. And a bracket next to those that says shared by all. Then off to the right, three little cards, one per thread, each holding its instruction pointer, its stack pointer, its registers. T one says running. T two says waiting on a socket. T three says ready. And each card's stack pointer points at its own stack, but all three instruction pointers point into the same code.

B: So every Python object lives in the shared part.

A: Every single one. Every list, every dict, every string you make lives on the heap, and every thread can reach every object. And two big consequences fall straight out of that.
The first one's good. Threads are cheap to create, and cheap to talk between. Making a thread means allocating a stack and a small record in the kernel. Not a whole new address space. On an M-series Mac, starting a Python thread takes around forty microseconds. And sharing data costs nothing. A list one thread builds is the very same object, on the very same heap, for the other thread. No copying at all.
The second one's bad. Threads can trample each other. That same sharing means two threads can read and write the same object at the same moment, with nothing stopping them. And we're going to make that happen on purpose in a bit.

B: [working it out] And processes are just... the other way round. Expensive to make, expensive to get data between, because you have to copy it over the wall. But nobody can trample you.

A: That's it exactly. Safe by default. Expensive by default.

<!-- section: The Idea: The scheduler -->

A: Okay. Now the second layer. Your Mac has somewhere around eight to sixteen cores. And if you run P S on a quiet laptop, just sitting there, you'll see hundreds of processes and thousands of threads. So how do thousands of cooks share a dozen stoves?

B: They take turns, I guess? But that seems like it'd be a disaster.

A: They take turns. Very, very fast. And the part of the kernel that decides who goes next is called the scheduler. Many times a second, it decides which thread runs on which core, and for how long. And to make that work, every thread is always in one of three states. Running, meaning it's on a core right now. Ready, meaning it could run, it's just waiting for a free core. Or blocked, sometimes called waiting. That's a thread that can't do anything until something happens. Bytes arriving on a socket, a disk read finishing, a timer going off.

B: Right, and that's the expensive one, the waiting thread. Because it's sitting there checking, has it arrived, has it arrived.

A: [gently] No, and this is a really important one. A blocked thread uses no CPU. Zero. It's not checking anything. The kernel took it off the core and set it aside, and when the bytes show up, the kernel itself marks it ready again. It's not spinning. It's asleep.

B: Oh. So a thousand threads that are all waiting cost basically nothing on the CPU.

A: On the CPU, yeah. They cost memory, but not CPU time. Hold on to that, because it's half the explanation for the web pages.
Now, a thread that's running gets a time slice. That's how long the scheduler lets it run before it might swap in someone else who's ready. It's roughly a few milliseconds on Linux and macOS, and it varies with the OS, the version, the load. And when that slice runs out, or when the thread blocks on its own, like it asked to read a socket and the data's not there yet, the kernel does a context switch. It saves the outgoing thread's registers, its instruction pointer and its stack pointer into memory. It loads the next thread's. And it jumps to wherever that thread's instruction pointer says. So, in kitchen terms, the cook steps away from the stove, leaves a note saying exactly where they were, and the next cook picks up their own note and carries on.

B: How expensive is that switch?

A: [careful] Rough numbers, and they really do vary with the hardware and the OS. Switching between two threads in the same process is something like one to five microseconds. You save and load the registers, you run the scheduler, and the memory map stays exactly the same, because they're in the same kitchen. Switching between two processes is also a few microseconds directly, but it costs more in effect. Because now you also have to switch that address lookup table. And the CPU keeps a little cache of recent lookups, called the T L B, the translation lookaside buffer, and switching processes can throw that out. And then the new process finds the CPU's caches full of somebody else's data.

B: So is a few microseconds a lot or not?

A: So think back to the latency numbers. A read from RAM is around a hundred nanoseconds. So a few microseconds is the time of thousands of RAM reads. That's not nothing. But it's tiny next to a five millisecond time slice, or a fifty millisecond network round trip. So context switching is cheap enough that thousands of switches a second is totally fine. And expensive enough that hundreds of thousands a second will eat a whole core.

<!-- section: The Idea: Concurrency vs parallelism -->

A: Now, two words that people use like they mean the same thing, and they really don't. Concurrency and parallelism.
Concurrency is about structure. Several tasks are in progress during the same stretch of time. Their lifetimes overlap. One cook juggling three dishes, stirring one while another simmers, that's concurrent. And it's totally possible on one core, by taking turns.
Parallelism is about execution. Several tasks are literally running at the same instant. Three cooks at three stoves. And that needs more than one core.
And here's the insight that everything else hangs on. Concurrency alone is enough to speed up waiting. Because while one task waits, another can use the core. But only parallelism speeds up working. Because if the job is computing, the total amount of computing has to actually get split across more cores.

B: [working it out] So if the job's mostly waiting, taking turns on one core is fine. If it's mostly computing, taking turns gets you nothing.

A: Nothing at all. And that split has names. A job is CPU-bound if it spends its time computing. Counting primes, tokenizing text, parsing JSON in pure Python. A faster core, or more cores, makes it finish sooner. And a job is I-O-bound, I-O as in input and output, if it spends its time waiting. HTTP calls, database queries, reading files off a network drive. The CPU's mostly idle.

B: And the hashing script is CPU-bound and the scraper is I-O-bound.

A: Yep. But that alone doesn't explain it. Because threads on twenty cores should be parallel. On paper, the hashing job should've gone twenty times faster with threads. So something's stopping them. And that's the third layer.

<!-- section: The Idea: The GIL -->

A: In standard Python, the C Python interpreter, the one you get when you install Python, there's one lock. The Global Interpreter Lock. The GIL. And a thread has to hold it to execute Python bytecode. Bytecode, quickly, is what Python actually runs. When you run a dot py file, Python first compiles it into a list of simple instructions, like "load this local variable", "add these two things", and then a loop inside the interpreter runs them one by one. And to run any of those instructions, you need the lock. And only one thread per process can hold it at a time.
So in the kitchen, imagine one recipe book, and only the cook holding the book is allowed to cook. The other cooks can still wait for the oven without the book. Waiting's fine. But chopping, stirring, anything that is Python code, you need the book.

B: So no matter how many threads—

A: No matter how many threads you start, and no matter how many cores you have, at most one thread is running Python code at any instant. Threads still give you concurrency. They do not give you parallelism for Python code.

B: [quietly] Huh. So that's the forty-one minutes. Twenty threads, all passing one book around.

A: That's the forty-one minutes. Twenty cooks and one book. And the extra minute is the passing. Handing the book back and forth isn't free.
Now picture a timeline you could play with. There are lanes, one per thread, T one through T four, and time runs left to right. A solid blue bar means that thread is running Python on some core. A dashed outline means it's waiting on I-O, which needs no core and no GIL. And a faint grey bar means it's ready, but stuck. Either there's no free core, or the GIL's on and someone else has the lock. There's a dashed line at the right edge marking where it would end if you ran everything one after another. You get sliders for threads and cores, and toggles for CPU-bound or I-O-bound work, and GIL on or off.
Start with four threads, four cores, CPU work, GIL on. What you see is a staircase of blue, with lots of grey. Only one lane is ever blue at a time. And it finishes at ninety-six ticks, which is exactly where the serial line is. Cores busy, twenty-five percent. Four cores, and three of them sitting idle. Then flip the GIL off. Every lane goes solid blue at the same time, and it finishes at twenty-four. Four times faster, all four cores busy. Then switch to I-O work and turn the GIL back on. Each lane is a short blue blip, then a long dashed wait, blip, wait, blip, wait. And the waits all overlap. Serial would be a hundred twenty-four ticks. Threads finish in about thirty-four. And if you flip the GIL off there, it barely moves.

B: So with I-O the GIL just doesn't matter much.

A: Right. Three things to take from that. One, CPU work with the GIL on, wall time equals serial time. Four threads on four cores take as long as one thread doing all of it, because they take turns holding the lock. And real Python is often a little worse than serial here, because handing the lock back and forth has a cost. That's your forty-one minutes. Two, CPU work with the GIL off, with enough cores, wall time divides by the number of threads. That's what processes give you today, and it's what free-threaded Python promises, which we'll get to. And three, I-O work, either way, each thread computes for a moment and then waits, and the waits overlap. A dozen threads waiting on a dozen sockets is concurrency, and the GIL barely matters, because waiting doesn't need it.

<!-- section: The Idea: When the GIL lets go -->

B: [skeptical] Wait, but if one thread grabs it, what makes it ever give it back? Couldn't one thread just hog it?

A: It gives it back in two situations. The first is a timer. Since Python three point two, if a thread's holding the GIL and another thread wants it, the holder gets asked to drop it after what's called the switch interval. And the default is five milliseconds. There's a function in the sys module, get switch interval, and it returns zero point zero zero five. That's what gives you concurrency between CPU-bound threads. They share one core's worth of Python, fairly.
The second one is the one that makes threads actually useful. Around anything slow that doesn't touch Python objects. C code, inside Python itself and inside extension libraries, can explicitly let go of the GIL before it starts a long operation, and take it back after. So, the stuff that does that. Blocking I-O. Receiving on a socket, the request library's get call, underneath, file reads and writes, waiting on a subprocess. Then time dot sleep. Then hashlib, Python's hashing module, on big inputs. It lets go for anything over about two kilobytes. And zlib compression. And most heavy NumPy work, large array math, and matrix multiplies that call into BLAS, the low-level linear algebra library. And PyTorch ops, which run in C plus plus or on the GPU.
So the picture is like this. On the left, four little thread boxes, T one to T four. One of them has a solid line going into a small filled blue square, the GIL, which is the door into a big box, the C Python interpreter. And inside that box it says: the bytecode loop, reference counts on every object, the memory allocator, dicts and lists and ints, and at the bottom, one thread at a time. Two other threads have dashed lines, queued for the lock. And then the fourth thread has a line that goes right past the interpreter, to a dashed box on the far right that says, outside, no GIL. Socket receive and send, file reads and writes, sleep, hashlib on big input, NumPy matrix multiply, torch ops in C plus plus, CUDA kernels on the GPU. And under that, in blue, runs in parallel with the GIL holder. And there's a note that T four's blocked in receive, so it gave the lock back.

B: [working it out] Oh. So that's the scraper. Every thread fetching a page is sitting in socket receive, outside the lock. So all of them can wait at once.

A: That's the scraper. Five thousand pages, mostly waiting, and the waiting happens outside the book. Whereas your hashing script was cleaning text in plain Python, so all the work was inside.

B: But hashlib releases it, you said. And the script was hashing.

A: [amused] Good catch. Only on inputs over about two kilobytes, though. And the cleaning part is pure Python no matter what. The forty-one minutes is the giveaway. If the work that mattered had been outside the lock, the threads would've helped. They didn't, so it was inside.

<!-- section: The Idea: Why does the GIL exist? -->

B: Okay, but then why would anyone design it that way? It sounds like a mistake.

A: [firm] It's really not. It comes from how Python frees memory. So, from the stack and heap lesson, every Python object on the heap carries a small header. And one field in that header is the reference count. A counter of how many references point at this object right now. Every time you assign it to a variable, or put it in a list, or pass it to a function, the count goes up. Every time one of those references goes away, it goes down. And the moment it hits zero, the object is freed. Immediately.
And that counter gets touched constantly. Like, by basically every line of Python you run. Now imagine two threads both updating the same object's counter at the same moment. Each one's doing "count equals count plus one". And as we'll see in a minute, one of those updates can just get lost. A lost decrement means the count never reaches zero, so that memory leaks forever. A lost increment is worse. The count hits zero too early, the object gets freed while someone's still using it, and the program reads garbage, or crashes.
So there were two ways to make that safe. One, put a little lock on every single refcount change, or use an atomic operation. An atomic operation is a CPU instruction that reads and changes a memory location as one indivisible step, so no other core can interrupt it halfway. It's safe, but it's slower than a plain add. And doing that on every refcount change slows down every Python program. Including the huge majority that never use threads at all. Or two, put one lock around the whole interpreter. And Guido van Rossum, who created Python, chose the second one in the early nineteen nineties. When nearly every computer had exactly one core, and parallelism didn't matter.

B: So at the time it cost basically nothing.

A: Basically nothing. And it had a huge side benefit. People writing C extensions for Python could just assume nobody else was touching Python objects at the same time. And a lot of the ecosystem grew up on that assumption. NumPy among them. So it became load-bearing.
And people have tried to remove it, many times. Larry Hastings did a project called the Gilectomy, around twenty sixteen. He replaced the one big lock with lots of small, fine-grained locks. And it worked. He got correct multi-threaded Python. That was much slower single-threaded. And that trade-off is the whole story. Removing the GIL is easy. Removing it without making everyone else slower, and without breaking every C extension, that's the hard part.

<!-- section: The Idea: Free-threaded Python -->

A: And that hard part is now largely done. There's a proposal called pep seven oh three, by Sam Gross, accepted in twenty twenty-three. It's titled "Making the Global Interpreter Lock Optional in C Python". And it describes a build of Python with no GIL, with a few tricks to keep single-threaded speed tolerable. One is biased reference counting. The thread that owns an object updates its count the cheap way, and only other threads pay for the slower atomic updates. Another is immortal objects. Things like None, and small integers, whose counts just never change, so nobody has to update them at all. And lists and dicts get their own small locks inside, per object.

B: So can I just use it now?

A: Sort of. And I'll say this with a hedge, because it's moving. Check the current Python docs. As of late twenty twenty-six, as best I can state it. Python three point thirteen, October twenty twenty-four, shipped the free-threaded build as experimental. It's a separate binary, usually called python three point thirteen T. Then Python three point fourteen, October twenty twenty-five, made it officially supported, under another proposal, pep seven seven nine. But it's still optional, and not the default. The normal python three you install still has a GIL. And single-threaded code runs somewhat slower on the free-threaded build. The docs quoted roughly five to ten percent for three point fourteen.
And there's a catch with C extensions. They have to be rebuilt and marked as safe to run without the GIL. And if you import one that isn't, the interpreter can turn the GIL back on, for the whole process. There's a function in sys, is GIL enabled, with an underscore in front, that tells you which you actually got.

B: Huh. So you could think you're on the no-GIL build and just... not be.

A: Exactly that. And it's the cleanest possible demonstration that the GIL, not threads, was the bottleneck. You'll see it in the numbers in a bit. Same threads, same code, and suddenly they scale.

<!-- section: The Idea: Race conditions and locks -->

A: Okay. Free-threaded or not, threads share memory, and shared memory has one classic way to fail. Take counter plus-equals one. It looks like one step. It's actually three. Read counter from the heap into a register. In Python that's onto the interpreter's own little stack. Then add one to it. Then write the result back to counter.
So two threads. Counter's at forty-one. Thread A reads forty-one. Then, before A writes anything, thread B also reads forty-one. Both add one. Both get forty-two. Both write forty-two.

B: So two increments, and it only went up by one.

A: Two increments, one effect. That's a race condition. The answer depends on the exact timing, on who got there first. And usually the bad timing is rare, which is exactly why these are so hard to catch.
Now picture stepping through that by hand. Thread A on one side, thread B on the other, the shared counter in the middle starting at zero. Each thread has three steps listed, read, add, write, and a button to step it. Two adds, so the answer should be two. And you just click through in whatever order you like. If you step A all the way through, then B, you get two. But the moment you step A's read, then B's read, before either one writes, you're doomed. However you finish, it ends at one, and it says lost update. Both threads read the same old value, so one write erased the other. There's even a button that plays the bad order for you.
And then you turn the lock on. Now each thread's list gets two more steps, acquire the lock at the start, release it at the end. And if you try to step B while A holds it, it just says B tries to acquire and blocks. And there's no order you can click that loses an update.

B: So that's the fix. A lock.

A: That's the fix. A lock, also called a mutex, short for mutual exclusion. It's an object only one thread can hold at a time. Anyone else who tries to take it blocks until it's released. In Python you'd wrap the read, add and write in a with lock block, and now that stretch of code is a critical section. A piece of code that must not be run by two threads at once, because it reads shared state and then writes it. Only one thread can be inside. And the cost is that threads now wait for each other there. So you keep critical sections short.

B: [a bit unsure] Okay, but now I'm confused. We just spent ten minutes on a lock that only lets one thread run Python at a time. So doesn't the GIL already protect my counter? Only one thread's running anyway.

A: That's the most natural thing to think, and it's wrong in a way that bites people. The GIL is not a lock for your code. It protects the interpreter's insides. The refcounts, the allocator, the dicts. Not your logic. It can be handed to another thread right between your read and your write. Because remember, the timer can make a thread drop it, and lots of operations drop it voluntarily.
Now here's the part that makes it confusing. In recent versions, three point ten onward, the interpreter only offers to switch threads at certain points. Like the jump back to the top of a loop. So a bare counter plus-equals one in a tight loop happens to almost never race, on a normal build. But that's an accident of how it's implemented. It's not a promise. And it disappears completely on the free-threaded build. So when you build this, to see the race reliably on normal Python, you put something between the read and the write that releases the GIL. Like time dot sleep of zero. That's a sleep that doesn't actually sleep, it just lets go of the lock for a moment.

B: And processes don't have any of this.

A: Not by default, because they don't share memory. Which brings us to the other way out.

<!-- section: The Idea: Processes, the other way around the GIL -->

A: Each Python process has its own interpreter. And so its own GIL. So run eight worker processes, and you've got eight interpreters, each running Python on its own core, truly in parallel. That's what the multiprocessing module does, and the process pool executor. Eight kitchens, eight recipe books. And the price is the wall between the kitchens.
Picture it. On the left, a box called parent. It's got its own interpreter and GIL, your data, and it's handing out chunks of work to a pool. On the right, three boxes, worker one, two and three, each with its own interpreter and its own GIL. Lines from the parent to each worker. And sitting on those lines, a box that says pickle, then pipe, then unpickle. And under it, a copy, every call. Then along the very bottom, a dashed strip that says shared memory, the same pages mapped into every process, no copy.
And you pay twice. First, startup. A new process needs a new interpreter. And there are three ways multiprocessing can make a worker. They're called start methods.
The first is fork. Fork clones the parent process. It's fast, anywhere from well under a millisecond to tens of milliseconds depending on how big the parent is. And the child starts with a copy of everything the parent had in memory. And the kernel makes that cheap with a trick called copy-on-write. After a fork, parent and child actually share the same physical memory pages. And a page only really gets copied when one of them writes to it.

B: That sounds perfect, though. What's the catch?

A: [grim] The catch is threads. Only the thread that called fork exists in the child. All the other threads just... aren't there. So if some other thread was holding a lock at the moment you forked, the child inherits a locked lock. And the thread that would've released it doesn't exist in the child. So nobody ever releases it. Deadlock.

B: [laughs] That's horrible.

A: [laughs] It's really horrible. And it's the script that deadlocks once a week. The second method is spawn. That starts a brand new python, and has it import your main module. Safe. Slow. On an M-series Mac, a bare pool of workers took around sixty to ninety milliseconds to start, in one test. And if your module imports torch at the top, every worker pays that import too, and that's often a second or more. The third is fork server. You start one clean helper process early, before anything gets messy, and then fork workers from that. Safe, and fairly fast.
And the defaults differ by operating system, which is why the same script behaves differently on your Mac and on the Spark. macOS has defaulted to spawn since Python three point eight. Linux defaulted to fork for decades, and Python three point fourteen changed the Linux default to fork server. You can check on each machine with get start method in the multiprocessing module. And check the docs for your version.
Then the second thing you pay for, communication. Workers can't see the parent's heap. So every argument you send and every result you get back gets pickled. Pickle is Python's built-in way of turning an object into bytes and back. And it costs time in proportion to how big and how complicated the object is. Then those bytes get written into a pipe, which is a one-way byte channel the kernel gives you between processes. One side writes, the other side reads. Then the worker reads them, unpickles them, and does the work. For small arguments, like two integers saying which chunk to process, that's nothing. For a million-element list per task, it can cost more than the work itself.

B: So is there a way around the copying?

A: There's an escape hatch. Shared memory. That's a region of physical RAM that the kernel maps into several processes' address spaces at once. Remember the lookup table? It's just two tables pointing at the same physical pages. So they read and write the same bytes, no copying. Multiprocessing has a shared memory module, you can back a NumPy array with it, and PyTorch tensors have a share memory method. The bytes live in one place and every process sees them. But you're back to sharing. So you're back to needing locks if anyone writes.

<!-- section: The Idea: Where this shows up in ML -->

A: And this is all over your actual work. The PyTorch data loader. When you set num workers to eight—

B: [jumping in] Those are threads, right? I always assumed those were threads.

A: They're processes. Each worker is a separate Python process, running your dataset's get item. Decoding images, tokenizing text, augmenting. And that's CPU-bound, pure-Python-ish work, which is exactly what the GIL would serialise if they were threads. And the batches come back as tensors placed in shared memory, so only a small handle gets pickled, not the actual data. Now there's one thread in there. If you set pin memory to true, a thread in the main process copies batches into page-locked memory, which is memory the GPU can copy from directly. And that's fine as a thread, because the copy happens in C with the GIL released.
And here's a real bite, straight out of the stack and heap lesson. Under fork, the workers share the parent's dataset through copy-on-write. Great, no copy. But merely reading a Python object changes its reference count.

B: Wait. Reading it writes to it?

A: Reading it writes to it. The count goes up when you grab a reference, down when you let go. That's a write to the object's header. And a write forces the kernel to copy that page. So a dataset stored as one giant Python list of strings slowly gets copied, page by page, into every single worker, just by being read. And your memory use climbs with num workers. If you store it as NumPy arrays instead, that's one object with no per-item refcounts, and the problem goes away.

B: [amused] That's sneaky.

A: Then there's the tokenizers warning. You've probably seen it. Hugging face tokenizers, the current process just got forked, after parallelism has already been used, disabling parallelism to avoid deadlocks.

B: Yeah. I've seen that a hundred times and ignored it a hundred times.

A: [laughs] That's the fork-with-threads problem, exactly. The fast tokenizer runs its own pool of threads, in Rust, outside the GIL. Then the data loader forks workers after that pool's already started. And the child would inherit locks held by threads that don't exist. So the library just switches its parallelism off in the children to be safe. You can set the environment variable tokenizers parallelism to false to choose explicitly, or avoid tokenizing in the parent before the fork.
And last, why your training loop is fine with the GIL. The Python in a training step mostly launches work. Multiply these tensors, run this attention kernel. And CUDA launches are asynchronous. The GPU runs the kernel while Python moves on and queues up the next one. And the heavy CPU-side ops release the GIL. So one Python thread can usually keep a GPU busy. When it can't, it's because there are lots of tiny kernels, and Python's overhead per launch starts to dominate. And then the fix is CUDA graphs, or torch dot compile. Not more threads.

<!-- section: The Idea: Predict -->

A: So, try a prediction. Counting the primes below two million, in pure Python, takes about five seconds on one core. You've got a fourteen-core Mac. How long with eight threads? And with eight processes?

B: [working it out] Threads, it's pure Python, so... five seconds. The GIL. Processes, eight of them, so five divided by eight, call it zero point six seconds.

A: Threads, yes. About five seconds, maybe a hair more. Processes, it came out around one second on an M-series Mac. So five times faster, not eight.

B: Where'd the rest go? Startup?

A: Some of it's startup and pickling. But most of it is two other things. The work doesn't split evenly. Bigger numbers take longer to test, so the chunk with the biggest numbers finishes last, and everyone waits on it. And not all the cores are equally fast. You'll see both of those when you measure.

<!-- section: Build It -->

A: So here's what you'd actually build. Everything in one folder. And you use concurrent futures the whole way through, because it gives threads and processes exactly the same interface. So the only thing that changes between experiments is one class name. Which is nice, because that's literally the one word from the opening.
First, you get to know your machine. An M-series Mac has a mix of fast performance cores and slower efficiency cores. And the Spark's spec sheet lists twenty ARM cores. Ten Cortex X nine twenty-five performance cores, and ten Cortex A seven twenty-five efficiency cores. So you write a tiny script that prints the number of cores, the Python version, whether the GIL is on, the start method, and the switch interval. On the Mac, sysctl tells you how many of each core type. On the Spark, nproc and lscpu.
Then you start a deliberately slow local web server. Every request sleeps two hundred milliseconds, like a slow API or a model endpoint. It runs a thread per request so it can serve lots of clients at once. And it bumps the listen backlog to two hundred fifty-six, because the default is five and macOS starts resetting connections past that. You leave that running in its own terminal.
Then the CPU job. A prime counter, in pure Python, by trial division. For each number, you try dividing by everything up to its square root. And pure Python's the whole point. No NumPy, nothing that drops the GIL. You split the range from zero to two million into chunks, one per worker, and time it serially, with four and eight threads, and with four and eight processes. And every run has to print the same count, a hundred forty-eight thousand, nine hundred thirty-three primes, so you know nothing's broken. And you keep the main guard, the if-name-equals-main check at the bottom. Because on macOS, with spawn, every worker re-imports your file. And without the guard, every worker would try to start its own pool.

B: And you write predictions first.

A: You write predictions first. Then the I-O job. Fetch the slow server fifty times. Serially, with eight and fifty threads, with eight and fifty processes. And before running it, you work out the serial time from that two hundred millisecond sleep.

B: [working it out] Fifty times a fifth of a second. Ten seconds.

A: And eight threads?

B: Eight at a time... fifty over eight is six and a bit, so seven rounds. Seven times zero point two. One point four seconds.

A: That's the reasoning. And you add one more measurement. Time a process pool of eight that runs a function that does nothing. That's your process startup tax, by itself.
Then the race. Eight threads, each adds one to a global counter a thousand times, so the right answer is eight thousand. Three versions. Unsafe reads the counter into a local, sleeps for zero, then writes local plus one back. Safe does the same, but inside the lock. And plain just does counter plus-equals one. And then you run plain with a million per thread, on your normal Python, and again on the free-threaded build. With U V, the Python tool, you install three point fourteen T and run the script with it. Check U V's docs if the spelling's changed.
Then you go look at the threads, live. Add a thirty-second sleep at the start of each worker so they sit still, run it with eight threads, and find the P I D with P grep. On macOS, P S dash M with that P I D lists every thread in the process, one per line. You'll see your eight workers, the main thread, and maybe a few extra. On the Spark, P S dash T lists threads, each with its own thread ID. You can count the entries in the process's task folder under slash proc. And top with dash H shows CPU per thread. In H top, pressing capital H toggles threads on and off. Then switch to the process pool, and now you're counting processes instead of threads.

B: What does top look like during the prime job?

A: That's the nice part. With eight threads, the process sits at roughly a hundred percent total. One core's worth. No matter how many threads. With eight processes, you see eight separate Python processes, each near a hundred percent. And there's an optional one that's really satisfying. A tool called py spy. Py spy dump, pointed at a running process, prints the current Python stack of every thread, without stopping it. On macOS it needs sudo. Run it on the eight-thread I-O job, and you'll see seven threads parked in a socket read, and one doing something else.
And last, you copy the folder over to the Spark, rerun everything there, and extend the prime job to sweep the number of processes. One, two, four, eight, twelve, sixteen, twenty. And print the speedup over serial for each. And you have an agent review your sweep for anything that'd make the timings unfair. Like timing the pool startup in some runs and not others. And you're done when it all runs on both machines, your predictions were written down before the first run, you've seen the thread count of a live process and can say where each thread came from, and you can explain every number without hand-waving.

<!-- section: Measure -->

A: So, the numbers. Time each one at least twice and keep the faster run, because the first run sometimes pays one-off costs, like loading files into the cache. Here's one reference run, on an M-series MacBook with ten performance cores and four efficiency cores, Python three point fourteen with the GIL. Yours will be different. The shape shouldn't be.
Primes. Serial, five point three seconds. Four threads, five point three. Eight threads, five point three.

B: [laughs] Not even a tiny bit faster.

A: Not even a little. That's the GIL, exactly the CPU-work, GIL-on timeline. And if you had top open, the process sat at about one core. Same fact, from another angle. Four processes, two seconds. Eight processes, one point one.

B: So four processes is... two point seven times. Not four.

A: Two point seven, not four. And the main reason is the uneven chunks. Trial division costs more for bigger numbers, because each test loops up to the square root. So the chunk from one and a half million to two million takes longer than the chunk from zero to half a million. And the pool has to wait for the slowest worker. You'll fix that in a minute. The smaller reasons are process startup and pickling, which are tiny here, because each task only sends two integers. And the efficiency cores being slower than the performance cores. On the Spark, expect the same story, just bigger. Going from ten to twenty processes adds the ten efficiency cores. They help, but less than the first ten. So when you plot speedup against process count, you should see it climb almost in a straight line at first, and then bend. And the interesting thing to look at is where it bends, and whether that's at ten.
Now the same prime job on the free-threaded three point fourteen build. Serial, four point eight seconds. Four threads, one point seven. Eight threads, one point oh.

B: Oh. So now threads do what processes did.

A: Threads scale like processes, once the GIL is gone. Same code. That's the demonstration.
Then the slow fetches. Serial was ten and a half seconds. Your ten seconds, plus a little for setting up each connection. Eight threads, one point four five seconds. Your seven rounds of two hundred milliseconds. Because the threads spent nearly all their time blocked in a socket read, with the GIL released, so they overlapped perfectly. With fifty threads it's one round, about two tenths of a second. Then eight processes, one point five five. About the same as threads, slightly worse.

B: So processes work fine for waiting too.

A: They work, they're just a more expensive way to get it. That bare eight-worker pool took about eighty-five milliseconds to start and finish a no-op. Compare that to forty microseconds for a thread. So you paid startup for no benefit, because the GIL was never the bottleneck. And at fifty, the gap grows. Fifty threads took about two tenths of a second, zero point two two. Fifty processes took zero point six seven. Three times slower.
And the race. Unsafe printed something way below eight thousand. On the reference run, around a thousand. So almost every single update was lost. Safe printed exactly eight thousand. And plain, on the normal build, very likely prints exactly eight million.

B: [skeptical] Wait, so the plain one is fine?

A: On the normal build, by luck of implementation. That thing about only switching at the top of a loop. Then on the free-threaded build, the same plain code lost most of its updates. Out of eight million, about one point two seven million survived.

B: [surprised] That's the same code. It just broke.

A: Same code. And the only change is that nothing serialises the threads anymore. It was always a race. The GIL was just hiding it.

<!-- section: Break It -->

A: Then you break it, on purpose. Four ways. First, the load imbalance. Change it so the pool gets sixty-four small chunks instead of one big chunk per worker, but keep the same number of workers.

B: So whoever finishes early just grabs another one.

A: Right, and the speedup gets closer to the worker count. Then go the other way. A thousand tiny chunks, two thousand numbers each. And it gets slower again. Because now every task costs a pickle round trip, and a trip through the pool's internal queue. And those per-task costs start to matter. So there's a sweet spot, and the map call has a chunk size argument that exists to help you find it.
Second, make pickling cost more than the work. Build eight lists of a million integers each, and sum each one. Eight threads, eight processes, and serially.

B: [a bit unsure] Processes, right? Processes are the safe fast choice for heavy stuff.

A: [amused] Processes lose. Badly. On the Mac, threads took twenty-four milliseconds, serial took twenty-six, and processes took eighty-eight. Because summing a list is fast C code. That part's quick. But pickling eight lists of a million ints, each about five megabytes, pushing them through a pipe and unpickling them on the other side? That's not quick. So processes win when the work per byte you send is large. Send indices or file paths, not data, and let each worker load its own input.
Third, forget the main guard. Delete it and run the process version on your Mac. With spawn, each worker imports your file to find the prime function, which runs your top-level code, which tries to create another pool. And Python stops it with a runtime error about the current process having finished its bootstrapping phase. And on Linux, with plain fork, the same script might seem to work fine. Which is exactly how you get bugs that work on the Spark and crash on your Mac.
Fourth, oversubscribe the cores. Each task does a NumPy matrix multiply on a two-thousand by two-thousand matrix. Run twenty of them in a twenty-process pool on the Spark. Then run it again with two environment variables set, O M P num threads equals one, and open BLAS num threads equals one. And the second run is likely faster.

B: Faster with fewer threads?

A: Because NumPy's matrix multiply calls BLAS, and BLAS starts its own threads. Often one per core. So twenty processes times twenty BLAS threads is four hundred threads, fighting over twenty cores. And the scheduler spends its time context switching instead of computing. That's why PyTorch's data loader workers, and a lot of job schedulers, set the thread count to one per worker.

<!-- section: Explain It Back -->

A: So say your preprocessing script's slow. How do you actually decide what to reach for?

B: [working it out] Check whether it's computing or waiting. If it's computing in Python, processes. If it's waiting, threads.

A: That's the core of it. Let me fill it in. First, find out what it's slow at. Watch top, or profile it. If one core is pegged running Python code, tokenizing, parsing, regexes, cleaning text, it's CPU-bound. Use processes. A process pool, or data loader workers. Give each worker a chunk index or a file path, not the data. And keep the chunks big enough that pickling doesn't matter. But if the heavy work is already in C that releases the GIL, NumPy, hashlib on big buffers, a Rust tokenizer's batch call, then threads might be enough, and you skip all the copying. If it's mostly waiting, downloading, calling an API, reading from S three, it's I-O-bound. Threads work well up to hundreds of requests at once. For thousands, async is cheaper, because each waiting request costs a small object instead of a whole thread. And if it's both, you combine them. Processes for the compute, and threads or async inside each one for the waiting.

B: And the GIL only matters in that first case.

A: The GIL only hurts when Python itself is the thing doing the work. That's the one-line version. It's why the data loader uses processes, and why one Python thread can still keep a GPU busy.

B: Okay, so then the scaling question. If a pure-Python job takes sixty seconds on one core, and I give it twenty processes on the Spark, I get three seconds.

A: [patient] Three seconds is the ideal. Sixty divided by twenty. You won't hit it, and it's worth knowing all the reasons. One, half the Spark's cores are efficiency cores, slower than the other half, so the twenty workers don't finish together. Two, the work might not split evenly, and the pool waits for the slowest chunk. Three, starting twenty processes and pickling arguments and results costs real time. More under spawn, or with heavy imports like torch. Four, any part of the program that's serial, like reading the input at the start, or merging the results at the end, doesn't speed up at all. That's called Amdahl's law. If ten percent of the job is serial, you can never beat ten times faster, no matter how many cores you throw at it. Even with infinite cores, that ten percent still takes six seconds.

B: Huh. So that's a hard ceiling.

A: A hard ceiling. And five, if the workers are streaming through lots of memory, they're all competing for the same memory bandwidth. There's a later lesson on exactly that, why adding cores stops helping once every core's waiting on the same memory. So a realistic answer is somewhere around four to six seconds. And then you'd measure the scaling curve to see where it actually bends.

<!-- section: Connections -->

A: And there's a question this leaves you with, for next time. Threads are a fine way to wait. A blocked thread costs no CPU, and the GIL doesn't care about it. But each one still costs a stack. Linux reserves eight megabytes of address space for each one by default, though only the pages it actually touches use real RAM. Plus a record in the kernel, a turn in the scheduler, and a context switch every time it wakes up. Fifty threads waiting on fifty requests is easy. But an LLM app might need to wait on ten thousand slow model calls at once. And ten thousand threads might not be the cheapest way to do that. That's what waiting versus working is about. And if you want to go deeper on all of this, the operating systems book called Three Easy Pieces, the chapters on processes, context switches and locks, and David Beazley's old PyCon talk on the GIL, are still the clearest things out there.

B: [working it out] Okay, let me try to say the whole thing. A process is a kitchen with its own walls, and threads are cooks sharing that kitchen. The kernel juggles all the cooks across the cores. And in Python, the threads can't run at the same time, because of the GIL, so threads are useless and you should use processes.

A: Most of that, yes. But not "threads are useless". Only one thread can run Python at a time. But a thread that's waiting on a socket, or sitting inside NumPy, or sleeping, has let go of the lock. So threads are great at waiting together, and they share memory for free. What they can't do is compute Python in parallel. That's what processes are for, each with its own interpreter and its own lock, and you pay for it in startup and in copying data across the wall. So the question isn't threads or processes. It's, is my job waiting, or is it working?
