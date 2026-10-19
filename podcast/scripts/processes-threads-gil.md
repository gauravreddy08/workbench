<!-- section: The Problem -->

A: [relaxed, thinking out loud] Say you've got a preprocessing script for the cross-encoder. It reads a couple of million query-document pairs, cleans up the text, hashes each one so you can throw out duplicates before training. And it takes forty minutes. The Spark has twenty cores. You open htop, and there's one core at full blast and nineteen doing nothing.

B: So I'd throw it in a thread pool. Twenty workers.

A: That's what everyone does. And it takes forty one minutes.

B: [skeptical] Slower?

A: A bit slower. Then you try a process pool instead. Same function, same data, you changed one word. And it takes three minutes.

B: Huh.

A: And then, feeling good, you use that same thread pool for a scraping job, thousands of web pages. And that one goes from forty minutes to a couple. So threads are useless for one job and magic for the other. And if you can't say why, you end up guessing, and the guesses get expensive. A data loader that starves the GPU, a server that falls over, a script that hangs once a week.

B: [a bit unsure] Okay, my honest picture is that a thread is like a lighter process. And if I've got twenty cores and twenty threads, each one gets a core, and it's twenty times faster.

A: In a lot of languages that's roughly what happens. In Python it's not. And to see why, you need three things. What the operating system gives you, how it shares a handful of cores between thousands of things, and one decision Python made back in the early nineties.

<!-- section: One very expensive computer -->

A: The history helps here. Early computers ran one job at a time. And when that job was waiting for, say, a tape drive, the processor just sat there. And the processor was the most expensive thing in the building.

B: That's a lot of money sitting idle.

A: So in the sixties, systems like the one at MIT started keeping several programs loaded at once and switching between them many times a second. Each one fenced off in its own memory so they couldn't wreck each other. And that fenced-off running program got a name. A process.

A: Threads came later. People wanted several flows of work inside one program, sharing its memory cheaply. A server handling lots of clients, say. Python picked up threads early, in the nineties. And to keep the interpreter simple and safe, it put one big lock around the whole thing. That lock is the GIL. And people are still arguing about it thirty years later.

<!-- section: Kitchens and cooks -->

A: So here's the picture. A process is a kitchen. It has walls, its own pantry, its own equipment. A thread is a cook in that kitchen. A kitchen needs at least one cook to get anything done. And if you put several cooks in one kitchen, they share the pantry and the counters. Which is fast, because nobody's walking to another building. And dangerous, because two cooks can grab the same bowl.

B: So what's actually in the kitchen?

A: The process gets its own private memory. That's the wall. One process literally can't scribble on another's memory, which is why a crash in your Python script doesn't take down your browser. It gets its own list of open files and network connections. It gets an ID number, so tools can name it. And it gets at least one thread. Because the operating system doesn't actually run processes. It runs threads. A process with no threads is just a room nobody's cooking in.

B: And what does a thread get?

A: Almost nothing of its own. Its place in the code, like a "you are here" marker. The handful of values it's in the middle of working on. And its own stack. Remember the stack, that pile of plates, one per function call that hasn't finished? Each thread needs its own, because each one is running its own chain of calls. Everything else, all the objects on the heap, the code, the open files, is shared with every other thread in the process.

B: [working it out] So two threads can both see the same list. Same object, no copying.

A: Same object, same memory. That's why threads are cheap to start and free to share data between. And it's also why they can trample each other. Processes are the mirror image. Expensive to start, expensive to talk between, because you have to copy things across the wall. But safe by default.

<!-- section: Taking turns -->

B: But my Mac has, what, a dozen cores. And there are way more threads than that running right now.

A: Thousands. So they take turns, very fast. There's a part of the operating system called the scheduler that decides who runs next. And every thread is in one of three states. Running, on a core right now. Ready, could run, waiting for a free core. Or blocked, waiting for something to happen, like data arriving on a network connection. And a blocked thread uses no processor at all.

B: And how long does each one get?

A: A running thread gets a turn of a few milliseconds. When the turn's up, or when it blocks on its own because it asked for data that isn't there yet, the system swaps it out. That's a context switch. The cook steps away from the stove, leaves a note saying exactly where they were, and the next cook picks up their own note. It's cheap, a few microseconds. Thousands a second is fine.

A: And now two words that people use like they mean the same thing, and they really don't. Concurrency means several tasks are in progress over the same stretch of time. One cook juggling three dishes, stirring one while another simmers. Parallelism means several tasks are running at the same instant. Three cooks at three stoves.

B: So concurrency can happen on one core.

A: Right. And here's the key thing. Concurrency alone is enough to speed up waiting. While one task waits, another uses the core. But only parallelism speeds up working, because the actual computing has to be split across more cores. And people have names for those two kinds of jobs. If it spends its time computing, it's CPU-bound. If it spends its time waiting, on the network or a disk, it's I/O-bound.

<!-- section: The GIL -->

A: [warm] Okay. The twist. In normal Python, there's one lock, the global interpreter lock. And a thread has to be holding it to run Python code. Think of one recipe book in the kitchen, and only the cook holding the book is allowed to cook. Other cooks can stand around waiting for the oven without the book. But chopping, stirring, anything that's actually Python code, you need the book.

B: So no matter how many threads I start...

A: At most one is running Python code at any instant. In one process. Threads still give you concurrency. They don't give you parallelism for Python code.

B: [working it out] Oh. So my hashing script. Twenty threads, all wanting the book, passing it around. And passing it around costs a bit, which is the extra minute.

A: That's your forty one minutes. And the scraper is the other case. Each thread does a moment of Python, sends a request, then waits for the server. And waiting doesn't need the book. So all those waits overlap, and the GIL barely matters.

B: When does a thread let go of the book, though?

A: Two situations. One, on a timer. If another thread wants it, the holder gets asked to give it up every few milliseconds, so CPU-bound threads at least share fairly. And two, around anything slow that doesn't touch Python objects. The C code inside Python, and inside libraries, can hand the lock back before doing something long, and grab it again after. Waiting on a network socket. Sleeping. Hashing a big buffer. Most heavy NumPy work, and PyTorch operations, which run in C plus plus or on the GPU.

B: So a thread doing a big matrix multiply in NumPy isn't holding the book.

A: Not while the multiply is running. Which is why Python threads are actually useful in practice. They're useless for pure Python number crunching, and they're fine for a lot of other things.

<!-- section: Why the lock exists -->

B: [skeptical] Why have the lock at all, though? It seems like a strange thing to do on purpose.

A: It comes down to how Python frees memory. Every Python object carries a count of how many things are pointing at it. Every time you assign a variable or put something in a list, a count goes up. A reference goes away, it goes down. When it hits zero, the object's freed. And those counts are being changed constantly, by every single line of Python.

B: And if two threads change the same count at once...

A: One of the changes can get lost. Lose a decrement, and the object leaks forever. Lose an increment, and the object gets freed while someone's still using it, and the program reads garbage or crashes. So there were two options. Put a little lock on every single count change, which slows down every Python program, including the huge majority that never use threads. Or put one lock around the whole interpreter. Guido van Rossum picked the second, back when nearly every computer had one core and parallelism didn't matter.

B: Makes sense for then.

A: And it had a big side benefit. People writing C extensions could just assume nobody else was touching Python objects at the same time. A lot of the ecosystem, NumPy included, grew up on that. People have tried to rip it out many times. The famous attempt, the Gilectomy, got correct multi-threaded Python that was a lot slower on a single thread. That's the whole story. Removing the lock is easy. Removing it without slowing everyone else down and breaking every C extension is the hard part.

<!-- section: Races -->

A: And there's a related trap, which is about your own code. Take counter plus equals one. It looks like one step. It's three. Read the counter. Add one. Write it back.

B: And if two threads both read before either writes...

A: They both read forty one, both compute forty two, both write forty two. Two increments, one effect. That's a race condition. The answer depends on who got there first. And the fix is a lock of your own. Wrap the read, add and write in it, and only one thread can be in that stretch of code at a time. That stretch is called a critical section.

B: But I've got the GIL. Doesn't that protect me?

A: That's the trap. The GIL protects the interpreter's insides, not your logic. It can get handed to another thread right between your read and your write. Now, when I actually ran a tight loop of plain plus equals one on eight threads, the normal Python build got the right answer every time. Which feels reassuring, and it's luck. It's an accident of where the interpreter happens to offer to switch threads. Then I ran the exact same code on the new free-threaded build, and it lost most of the updates.

B: [amused] Most of them.

A: Most of them. Same code. The only thing that changed is nothing was lining the threads up anymore.

<!-- section: Python without the lock -->

B: So there's a Python without the GIL now?

A: There is. A proposal to make the GIL optional got accepted a few years ago, and it's now an officially supported build, but it's optional, it's not the default. The Python you normally install still has the lock. Single-threaded code runs a bit slower on the free-threaded one. And C extensions have to be rebuilt and marked safe. Import one that isn't, and the lock can quietly switch back on for the whole program.

A: But it's the cleanest demo there is that the lock was the bottleneck, not threads. When I counted primes on my Mac, threads on the normal build gave me zero speedup. On the free-threaded build, the same threads scaled almost like processes.

<!-- section: The other way around -->

B: And processes get around it because...

A: Each process has its own interpreter, so its own lock. Eight worker processes is eight interpreters, each running Python on its own core, truly in parallel. That's the three minutes. But you pay for the wall between kitchens, twice.

B: Startup, I'd guess.

A: Startup is one. A new process needs a new interpreter. One way to make one is to clone the parent. That's called fork, and it's fast. But only the thread that did the cloning exists in the child. So if some other thread was holding a lock at that moment, the child inherits a locked lock that nobody will ever unlock. And it hangs. The other way is spawn, start a fresh Python and import your file. Safe, but slow, especially if your file imports torch at the top, because every worker pays that too. And Mac and Linux default to different ones, which is how you get "works on the Spark, breaks on my Mac".

B: And the second cost?

A: Talking. Workers can't see the parent's memory. So every argument and every result gets turned into bytes, pickled, pushed through a pipe, and turned back into objects on the other side. For a couple of numbers saying which chunk to work on, that's nothing. For a big list, it can cost more than the work. I tried summing a few big lists in a process pool, and it lost badly to just doing it in one thread. Summing is fast. Shipping millions of numbers across the wall isn't.

B: [working it out] So send the processes the work to do, not the data. Like a file path or a chunk number.

A: Right. And if you really need to share big data, there's shared memory, where the same bytes are mapped into several processes. But then you're sharing again, so you're back to needing locks.

<!-- section: Where it shows up in ML -->

A: And this is all over your ML work. The PyTorch DataLoader, when you set the number of workers, uses processes, not threads. Because loading data runs your Python, tokenizing, decoding, augmenting. That's CPU-bound Python, exactly what the lock would serialise. And the batches come back through shared memory, so the tensors don't get pickled.

B: I've seen a weird one there. Memory going up with more workers.

A: That one's lovely. With fork, the workers share the parent's dataset without copying, as long as nobody writes to it. But just reading a Python object changes its reference count. Which is a write. Which forces that memory to get copied. So a dataset stored as a giant Python list of strings slowly gets copied into every single worker. Store it as NumPy arrays instead, where there's one object and no count per item, and it goes away.

B: And the tokenizers warning? The one about the process getting forked after parallelism was used?

A: That's the fork-with-threads problem. The fast tokenizer runs its own threads, in Rust, outside the lock. When the DataLoader forks workers after those threads have started, the library turns its parallelism off in the children so they don't inherit a stuck lock.

B: Then why is my training loop fine on one thread?

A: Because the Python in a training step mostly just launches work. Multiply these, run this kernel. The GPU runs it in the background while Python queues up the next thing, and the heavy CPU-side operations let go of the lock. One Python thread can usually keep a GPU busy. The lock only hurts when Python itself is the thing doing the work.

<!-- section: Ending -->

B: Okay. Let me try. A process is a kitchen with walls, its own memory. A thread is a cook in it, sharing everything except its own stack. Python has one recipe book, so only one thread runs Python at a time. So threads for waiting, processes for working.

A: That rule of thumb will get you far. Two things I'd sharpen. The lock only blocks Python code itself. So if the heavy work is in C that hands the lock back, a big NumPy call, a Rust tokenizer, threads can run it in parallel and skip all the copying. And processes only win when the work is big compared to what you ship across the wall. And here's the question to sit with for next time. A waiting thread costs no processor, but it still costs a stack, and a turn in the scheduler every time it wakes up. Fifty threads waiting on fifty requests is easy. Your LLM app needs to wait on thousands of slow model calls at once. Is a thread each really the cheapest way to wait?
