<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, stack and heap. Two words you've heard a thousand times. Before I say anything about them, I want your version. If someone at work stopped you in the hallway and said, quick, what's the stack and what's the heap... what comes out?

B: [a bit unsure] Okay, honestly? The stack is first in, first out. Things go on, and they come off in order. And the heap is, like, that tree. The sorted one, where the smallest thing's at the top.

A: So both halves of that are wrong. But in a really normal way, and I want to say why first, because it's not you, it's the words. "Stack" sounds like a line of things waiting their turn. And "heap" is also the name of a tree you studied in an algorithms class. So your brain just grabbed the nearest meaning for each one. Fair enough.

B: [a little defensive] But the stack one, I'm pretty sure. Things come off in the order they went on.

A: [matter-of-fact] That's the part that's backwards. The stack is last in, first out. Think about a stack of plates in a kitchen cupboard. You put a plate on top. When you take one off, you take the one you put on most recently. Nobody reaches in and pulls out the bottom plate. First in, first out, that's a queue. That's the line at a coffee shop. Whoever got there first gets served first.

B: [working it out] Oh. So what I described is a queue. Like requests lined up waiting for a worker.

A: Yeah, that's a queue. Totally different animal. If you sketched the two side by side, on the left you'd have a little pile of plates. The bottom one says main. Then on top of it, sum of three. Then sum of two. Then sum of one, and that one's highlighted, because it's the newest. And there's one arrow going in at the top, push, and one arrow coming out at the top, pop. Both arrows at the same end. On the right you'd have the coffee line, a row of four boxes, and things come in at one end and leave from the other. And the thing to notice on the plates side is that a function's call stack only ever touches its top plate. Never the middle, never the bottom.

B: And the heap? Because I was pretty sure about the tree.

A: The tree you're thinking of is real, it's just a different thing. It's called a binary heap. It's a tree, usually stored in an array, where every parent is smaller than its children, or bigger, depending which way you build it. So the smallest item is always sitting at the root, and you can grab it instantly. That's what priority queues and heapsort use. But the heap in "stack and heap" has nothing to do with it. That heap is just a big region of memory where a program asks for chunks while it's running. It's not sorted. It's not a tree. Inside, it's, I mean, it's closer to a parking lot with gaps in it.

B: [skeptical] Then why on earth do they have the same name?

A: [amused] Accident. Pure accident. A guy named J. W. J. Williams named the tree "heap" in nineteen sixty-four, when he published heapsort. And around the same time, people designing programming languages started calling the pool of runtime memory "the heap", in the everyday sense. Like, a pile of stuff. ALGOL sixty-eight even had a keyword called HEAP for it. And as far as anyone can tell, nobody chose the clash on purpose. Two communities just reached for the same ordinary English word.

B: So the vocabulary's a trap, basically.

A: The vocabulary's a trap. So that's the words fixed. But the real question is the one underneath. When your code says x equals five. Or when it makes a list of fifty million zeros. Or a PyTorch tensor that's four thousand ninety-six by four thousand ninety-six. Where in the machine do those bytes actually go? Who decides? And who cleans up afterwards? And this isn't trivia. It's the answer to three things you'll actually hit. Why a list that "should" be four hundred megabytes is actually two gigabytes. Why deep recursion dies. And why a process that runs for a few days slowly eats all your RAM.

<!-- section: Origin -->

A: And the stack has a birth story, which is the best way in. Early machines didn't have one. FORTRAN two, from nineteen fifty-eight, was the first FORTRAN with subroutines, functions you could call. And the way it worked was, each subroutine got one fixed spot in memory. One slot for its return address, meaning where to jump back to when it's done, and one slot for each of its variables. Fixed. Forever. One per function.

B: That sounds fine, honestly. Simple.

A: [dry] It's fine right up until a function calls itself.

B: [working it out] Oh. Because the second call writes its return address into the same slot. So the first call's... gone.

A: [agreeing] Gone. The second call overwrites where the first call was supposed to go back to. And the program can never find its way home. So early FORTRAN just didn't allow recursion. Problem solved, kind of. Then ALGOL sixty came along and said, no, recursion is required. And in nineteen sixty, Edsger Dijkstra published a paper called "Recursive Programming" showing how you'd actually build it. Keep every call's data in a pile in memory. When a function's called, add a block on top. When it returns, take that block off. And it turns out Friedrich Bauer and Klaus Samelson had already patented that same last in, first out idea back in nineteen fifty-seven. They called it the Kellerprinzip. The cellar principle.

B: [amused] They patented a stack.

A: [laughs] They patented a stack. And once the idea won, the hardware followed. Almost every CPU since has one register, one little dedicated slot inside the processor, that just points at the top of this pile. And that pile is the stack.

<!-- section: The Idea: A process's memory as one strip -->

A: Okay. So to say where things live, we need a map. When you run a program, the operating system gives it a process. A process is basically a running program plus everything the OS keeps track of for it. Its memory, its open files, and at least one thread actually running its code. The next lesson is all about those, so for now that's enough. And every process gets its own address space. Think of it as one long strip of numbered bytes, numbered from zero up to some enormous number. Each process gets its own strip. So address four thousand ninety-six in one program has nothing to do with address four thousand ninety-six in another.

B: How enormous is enormous?

A: On a sixty-four bit machine, the numbers go up to about two to the forty-seven, or two to the forty-eight. So, hundreds of terabytes. Your Spark has a hundred twenty-eight gigabytes. So the strip is, what, a thousand times bigger than the actual memory in the box, or more.

B: [skeptical] Then how does that work? You can't have hundreds of terabytes of addresses with a hundred twenty-eight gigs behind them.

A: Because those addresses aren't real RAM locations. They're virtual addresses. Your program sees them, and the CPU and the OS quietly translate them to real RAM locations behind the scenes, a page at a time. And only the parts you're actually using get backed by real memory. The rest of the strip is just numbers nobody's touching. There's a whole later lesson on how that translation works. For today, just pretend the strip is real.

A: So the strip is cut into regions, and each one has a different job. Picture it standing up, like a building. Low addresses at the bottom, high addresses at the top. The very bottom, address zero and a little bit around it, is deliberately empty. Unmapped. Nothing's there. Then the first floor is the code. People also call it the text segment, which is a weird name, but that's what it's called. It's the compiled machine instructions for your program, and it's read-only. So a bug in your program can't overwrite its own code. Above that, globals. Variables that live for the whole run, like a C file that says, at the very top, int g equals forty-two. Their size is known before the program even starts, so the loader just sets aside exactly that much.

A: Then above the globals, the heap. This is memory the program asks for while it's running, in sizes nobody knew in advance. It sits right above the globals and grows upward. Then a stretch of free space. Then a region called memory-mapped. That's where the OS puts the shared libraries, so lib C, lib python, numpy's compiled code. It's also where files go if you map them into memory. And, on Linux, it's where any single allocation bigger than about a hundred twenty-eight kilobytes lands. That's G lib C's default threshold. So technically that's heap memory too, you asked for it at runtime, it just comes from a different place. Then more free space. And then, up near the top, the stack. It starts high and grows down, toward lower addresses. One block for every function call that hasn't returned yet. And above the stack, at the very top, the kernel's stuff, which is off limits.

B: Wait, go back to the bottom. Why leave address zero empty on purpose?

A: Because of null pointers. A pointer is just a number that's an address, and by convention a pointer whose value is zero means "points at nothing". So if your code has a bug and follows one of those, reads through it, it lands on address zero. And since nothing's mapped there, the program crashes immediately. Loudly. Which is the point. The alternative is it silently reads garbage and carries on.

B: Okay, so you'd rather it crash.

A: Way rather. And if you printed real addresses on a typical Linux x eighty-six box, you'd see the pattern. Code and globals and the heap all start with five five, something like that. The libraries start with seven f. The stack starts with seven f f d, up near the top. Two warnings, though. First, this picture is a model. Real layouts vary. On your Mac, on Apple Silicon, you'll actually see the stack sitting below the big heap region. And on ARM sixty-four Linux, which is your Spark, the numbers start with a a a a and f f f f instead. The roles are the same. Second, the starting addresses change every single time you run the program. On purpose. That's called A S L R, address space layout randomization. The OS shifts where the stack, the heap, the libraries, and the code land each time a program starts, so an attacker can't hardcode an address. It's on by default on Linux and on macOS, and you'll see it happen when you build this.

<!-- section: The Idea: The stack, one frame per unfinished call -->

A: So, the stack's whole job. When a function gets called, it needs somewhere to keep its local variables. And the CPU needs to remember where to jump back to when the function returns. That bundle is called a stack frame. One block of stack memory per function call. Made when the call starts, thrown away when it returns. Calling a function pushes a frame on top. Returning pops it off. And here's the bit that makes it last in, first out, not by choice but by necessity. A function always finishes before the function that called it finishes. Always. So the most recent frame is always the first to go.

B: Huh. So it couldn't be first in, first out even if you wanted it to be. Main would have to finish before the function it called.

A: Right, that'd make no sense. So the plates are the right picture. And what's in a frame, typically? The function's local variables, at least the ones that don't fit in registers. The return address, which is the spot in the caller right after the call, the next instruction to run when we come back. On ARM sixty-four that actually arrives in a register, x thirty, which people call the link register, and it only gets saved into the frame if the function goes on to call something itself. Then there's the caller's frame pointer, which is basically a pointer back to the previous frame. So the frames form a chain, and you can walk it, one frame back, one more back, all the way down to main.

B: Is that what a stack trace is?

A: That's literally what a stack trace is. Someone walking that chain and printing each frame. And last, any registers the function needs to borrow, saved so they can be put back. And then the CPU keeps one register pointing at the current top of the stack. That's the stack pointer. On x eighty-six it's called R S P, on ARM it's just S P. Push a frame, it moves down. Pop a frame, it moves back up.

<!-- section: The Idea: Predict, frames at the deepest point -->

A: Try this one. A little recursive C function, sum. Sum of n is n plus sum of n minus one, and sum of zero is just zero. Main calls sum of three. That calls sum of two, which calls sum of one, which calls sum of zero. At the deepest point, how many frames are on the stack, counting main? And when sum of one finishes, whose frame is on top?

B: [working it out] Main, sum of three, sum of two, sum of one... so four. And when sum of one finishes, sum of two's on top.

A: [gently] Second half's right. First half, you stopped one early. Sum of one doesn't finish on its own, it calls sum of zero. So the deepest moment is right while sum of zero is running. Main, three, two, one, zero. Five frames. Then sum of zero returns its zero, its frame gets popped, and sum of one finishes, gets popped, and now sum of two's on top. And it resumes exactly where it left off, with its own n still equal to two. Untouched. Even though three other calls ran in between with their own n.

B: Because each call has its own n. In its own frame.

A: Each call has its own copy of n because each call has its own frame. That's the whole trick. There's an interactive version of this you can step through. Code on the left, with the current line highlighted. The stack on the right, high addresses at the top, and it grows down. You hit step, and every call drops a new box underneath the last one, with n in it, and an empty slot for the answer it's waiting on, and a little line saying where to return to. Like, "return to sum of three, line three". And every return, the bottom box vanishes and the one above it fills in its answer. There's a slider that sets n from one to six, so you can make it deeper. And underneath there are counters. How many frames, and the stack pointer as a number. And the thing to watch is that number. Each frame in the drawing is thirty-two bytes, which is just illustrative, so every call the stack pointer drops by thirty-two, and every return it goes back up by thirty-two. That one number is the entire bookkeeping. On the last step you're back in main with the answer, every sum frame's gone, and nobody freed anything. Popping is just moving one pointer.

B: [hesitant] One thing that's confusing me. You keep saying "top of the stack" but the newest frame's drawn at the bottom.

A: Yeah, that trips everyone up once. The top of the stack, the newest frame, is at the lowest address, because the stack grows down. So in a diagram where high addresses are at the top, the "top" of the stack is drawn at the bottom. It's plates stacked upside down from the ceiling. Every systems book draws it that way. You get confused exactly once and then it's fine.

<!-- section: The Idea: Why the stack is fast -->

A: So why is the stack fast? Two reasons. First, making a frame is one instruction. Subtract the frame size from the stack pointer. On ARM, for a thirty-two byte frame, the instruction literally says take S P, subtract thirty-two, put it back in S P. That's it. Freeing it is one instruction: add the thirty-two back. There's no searching for free space, no bookkeeping, no lock. The compiler already knew every function's frame size when it compiled the program, so there's nothing to figure out at runtime.

A: And the second reason is from the latency lesson. Quick reminder of the one number that matters. The CPU has a tiny, very fast memory right on each core, called the L one cache. Somewhere around thirty-two to a hundred twenty-eight kilobytes per core, and reading from it takes about a nanosecond. Going all the way out to main RAM takes about a hundred nanoseconds. A hundred times slower. Now, the top of the stack is the memory your program touched a few nanoseconds ago. Function calls keep reusing the same few hundred bytes of stack, over and over, call, return, call, return. So it's almost always sitting in L one. Your locals cost about a nanosecond to touch instead of the hundred of a trip to RAM. Stack memory is the hottest memory you have.

<!-- section: The Idea: Why the stack is small -->

B: Then why not put everything on it?

A: Because the price for that speed is rigidity. The stack's size is reserved up front, when the thread starts. And every frame's size has to be known at compile time. On Linux, the main thread's stack is eight megabytes by default. You can check yours with a shell command, U limit dash s. On most Linux boxes it prints eight thousand one hundred ninety-two, which is in kilobytes, so eight megabytes. On macOS it prints eight thousand one hundred seventy-six. Basically the same.

B: Is eight megabytes a lot? I genuinely don't have a feel for that.

A: [thinking out loud] Depends what you put in it. For normal code, it's plenty. A typical frame is tens to hundreds of bytes. So you could nest calls tens of thousands deep before you ran out. But for data it's nothing. Say in C you write a local array of two million doubles. Each double's eight bytes, so that's sixteen megabytes, sitting in one frame, and the program dies on the spot.

B: [surprised] Sixteen megs and it just dies. Huh.

A: And how it dies is worth knowing. Just past the end of the reserved stack region, the OS puts a guard page. An unmapped page, deliberately empty, like a tripwire. When the stack pointer walks past the end and something touches that page, the program crashes immediately, instead of letting the stack quietly overwrite whatever memory happens to sit next to it. And the crash is a segmentation fault. That's the crash you get any time a program touches memory it has no right to. The OS sends it a signal called SIG SEG V, which is signal number eleven. And the shell shows the exit code as a hundred thirty-nine, which is a hundred twenty-eight plus eleven. That's just how shells report "killed by signal eleven". And running out of stack like that is called a stack overflow. Almost always from recursion that goes too deep, or a huge local array.

B: [laughs] Like the website.

A: Like the website. That's where the name comes from. One more thing to file away, because it's the bridge into the next lesson. Every thread gets its own stack. It kind of has to. Each thread's running its own chain of function calls, so each one needs its own pile of plates. On Linux, extra threads get the same eight megabyte default. On macOS, extra threads only get five hundred twelve kilobytes. But all the threads in a process share one heap. One. So picture two threads in the same process, each running a recursive function. Each has its own stack, so its own frames, its own locals, its own return addresses. One thread's recursion can't stomp on the other's. But they share the code, the globals, and the heap. So if both threads append to the same list, or update the same dict, they're touching the same heap objects at the same moment. And that's the root of basically every thread-safety problem there is. It's also part of why Python has the GIL. Which is next lesson's whole story.

<!-- section: The Idea: The heap, memory that outlives the function -->

B: [thinking out loud] Okay, but if the only problem is size... couldn't you just make the stack bigger? Like, give it a gig?

A: You could make it bigger, and for some programs people do. But size is only one of the three problems. The second is lifetime. Say you write a function that loads a model and returns it. If the weights lived in that function's frame, they'd be gone the moment it returned, because the frame's gone. So anything that has to outlive the call that made it, a loaded model, a result you hand back, a cache, it can't live there, no matter how big the stack is. And the third is unknown size. A frame's size is fixed when the program's compiled. But tons of data, you only learn the size at runtime. How many rows are in this file? How long is this user's query? The compiler can't know. So for all three of those, you ask the heap. And you pay for it in speed, and in someone having to clean it up.

A: In C, asking the heap means calling malloc. You say, give me room for n floats. A float's four bytes, so that's n times four bytes, somewhere. It hands you back an address. You use it, you return it, you pass it around to other functions, it doesn't care. And when you're done, you call free, which says, I'm done, take it back. Malloc is a library function, and the code behind it is called an allocator. The allocator's job is managing the heap. It hands out chunks when you ask, takes them back, and keeps a map of which parts are free. G lib C's malloc is one, J E malloc and mi malloc are other common ones. And CPython and PyTorch each have their own allocators, sitting on top.

B: So what's actually happening when I ask for, say, four hundred bytes?

A: The allocator looks through its map, finds a free gap of at least four hundred bytes, marks it as used, and hands you its address. When the heap runs out of gaps, the allocator asks the operating system for more. Either it extends the heap upward, or, for big requests, it maps a whole fresh region. And both of those are system calls. A system call is your program asking the kernel to do something for it, like give me more memory or read this file. And each one costs anywhere from a few hundred nanoseconds to many microseconds. Way more than a normal function call.

A: So that's why the heap is slower than the stack. A malloc on its fast path is roughly tens of nanoseconds. Not one instruction. And much more when it has to go to the OS. And worse, heap objects end up wherever there happened to be a gap. So related data ends up scattered all over. Which means when you walk through it, cache misses. Neither cost is a disaster once. Both are a disaster a hundred million times in a loop.

B: [working it out] So, a frame is one instruction because the compiler already knows its size, and it's in L one because you just used it. Malloc has to go search for a gap, update its map, maybe ask the OS, and you get back memory that could be anywhere. So probably not in cache.

A: Yeah, and one more thing in that list. Malloc sometimes has to take a lock, because other threads might be asking at the same time. The stack never does, because nobody else touches your stack.

<!-- section: The Idea: Fragmentation -->

A: Now, because chunks get freed in random order, the heap develops holes. Picture a row of sixteen blocks. Some used, some free, all mixed up. Count the free ones, there are seven. But they're in little holes. A hole of two, another hole of two, a hole of one, a hole of two. And now a request comes in for four blocks, side by side.

B: But seven are free. Four should fit.

A: [patiently] Seven are free, and none of the holes is bigger than two. A chunk has to be one contiguous run of memory. So the allocator can't serve it from here. It has to grow the heap. That's fragmentation. Free memory broken into lots of small holes, so a big request can't be served even though the total free space is plenty. And the effect is your process's memory grows, even though it isn't really "using" more. This is why a long-running server's memory can creep up even when it isn't leaking at all. It frees exactly as much as it allocates, but into holes too small to reuse.

B: So how do allocators fight that?

A: Mostly by grouping chunks into size classes. All the thirty-two byte objects live together, all the sixty-four byte objects live together. So when a thirty-two byte thing is freed, its hole is the perfect size for the next thirty-two byte thing. And that's exactly what CPython's allocator does, which is going to matter in a minute.

<!-- section: The Idea: Who frees the heap -->

A: So who cleans the heap up? Stack memory cleans itself up. The pop is the cleanup. The heap has no moment like that. Somebody has to decide, nobody needs this anymore. And languages mostly differ in who that somebody is. In C, it's you. Every malloc needs exactly one free. Forget it, and you've got a memory leak. Memory that's still allocated, but nothing's ever going to use it again, so it can never be reused. The process just grows until something kills it. Free it twice, or keep using it after you freed it, and you corrupt the allocator's map. And a big fraction of real-world security bugs are exactly that.

B: And Python just... does it for you.

A: Sort of. In CPython, it's counting, plus a sweeper. Every object carries a count of how many references point at it. When that count drops to zero, the object is freed, right then. Not later. And then there's a separate thing called the cycle collector, which is CPython's garbage collector. It runs every so often, looks for groups of objects that only point at each other, with nothing from outside pointing in, and frees them. Because counting alone can never free a cycle. If two objects point at each other, each one's count is at least one forever.

A: And in Rust, it's the compiler. Every heap value has exactly one owner. And the compiler inserts the free at the exact point where that owner goes out of scope. No counting at runtime, no collector. And using something after it's freed just won't compile.

<!-- section: The Idea: Python, everything is on the heap -->

A: Okay. Now the part that changes how you read Python code. In CPython, every value is an object on the heap. Every one. And variables aren't what you probably picture.

B: I picture a box. Like, x is a box and five is inside it.

A: [warmly] That's the picture most people have, and in Python it's wrong. Variables are names that point at objects. When you write x equals a thousand, CPython makes an int object on the heap, holding a thousand, and then makes the name x point at it. Then y equals x doesn't copy anything. It just makes a second name pointing at the same object. One object, two names. And if you call the I D function on x, what you get back is that object's identity, which in CPython is literally its memory address.

B: So y equals x, and nothing new gets made at all.

A: Nothing. And every CPython object starts with the same header. First, the reference count. That's the count I just mentioned. A number living inside every object. Assignment adds one, a name going away subtracts one, and at zero the object's freed immediately. Eight bytes. Then a pointer to the object's type, so it knows it's an int. Another eight. Then a small int adds eight bytes saying how big it is, and one four-byte "digit". CPython stores big ints as a list of thirty-bit chunks, and each chunk is called a digit. So eight, plus eight, plus eight, plus four. Twenty-eight bytes. To store the number one thousand. Which, as a plain machine integer, fits in eight.

B: [surprised] Three and a half times as much. Just for one number.

A: Just for one. Now scale it. Picture three drawings. The top one is two little boxes, x and y, both with arrows going to one int object on the heap. Twenty-eight bytes, ref count two, type int, digit one thousand. The middle one is a Python list. There's a list object, and it points at a row of eight-byte slots, and each slot is a pointer. And each pointer has an arrow going off to its own little int object, and those int objects are scattered all over the place. Not in a row. And next to it, a numpy array of int sixty-fours. There's one header object, about a hundred twelve bytes, holding the shape, the type, and a pointer to the data. And it points at one single run of raw numbers, eight bytes each, sitting side by side.

A: So a Python list of a million ints is really two things. One array of a million eight-byte pointers. That's eight megabytes. And a million separate int objects, twenty-eight bytes each. So you'd guess eight plus twenty-eight, thirty-six megabytes. But if you actually measure it with trace malloc, which is Python's built-in tool for tracking every allocation, on CPython three twelve or newer, sixty-four bit, you see about forty megabytes.

B: Where's the extra four from?

A: From that size-class thing. CPython's small-object allocator hands out memory in sixteen-byte steps. So a twenty-eight byte int gets rounded up to thirty-two. Eight for the pointer plus thirty-two for the object, forty bytes a number. And a numpy int sixty-four array of the same million numbers? Eight megabytes. Plus a header of about a hundred bytes. All in one block. Five times smaller. And the numbers sit right next to each other, so the CPU's cache, and the prefetcher, which is the hardware that guesses what you'll read next and fetches it early, can just stream through them. Instead of chasing a pointer to some random spot for every single element.

B: So that's why the list that should be four hundred megabytes is two gigabytes.

A: That's exactly that. And a caveat on the numbers. Exact sizes move around between CPython versions. In three ten, an int zero was twenty-four bytes. From three eleven on it's twenty-eight. So treat every number I'm saying as "CPython three twelve or later, sixty-four bit", and check your own. Two more subtleties you'll trip on. First, CPython keeps one shared object for every int from minus five up to two fifty-six, made once at startup. So a list that's zero times a million is a million pointers to the same single zero. Eight megabytes, not forty. It's only distinct, larger ints that each get their own object.

B: [skeptical] Wait, that seems like it'd wreck my measurements.

A: It will, if you test with small numbers. That's the trap. Second subtlety: sys dot get size of on a list reports the list object and its pointer array. Only. So for a million items it says eight megabytes. It does not count the objects those pointers point at. It's a shallow number. Trace malloc sees everything that got allocated, so that's the one that tells the truth.

A: There's a slider that makes the scale land. You drag N from a thousand up to a billion, and you can flip between ints and floats. And for each kind of container there's a bar. The Python list's bar is two-tone, a dark piece for the pointer and a big light piece for the object it points at. For ints that's eight plus thirty-two. For floats it's eight plus twenty-four, because a float object's twenty-four bytes. Then the packed ones are a single short bar. Python's built-in array module, eight bytes each. Numpy int sixty-four, eight. Numpy int thirty-two, four. And as you drag up into the billions, the list version stops fitting in your Spark's hundred twenty-eight gigabytes, while the packed four-byte version is still comfortable. Also, a list you build by calling append over and over can be up to about twelve percent bigger than these numbers. Lists over-allocate, they grab extra room, so appends stay cheap.

<!-- section: The Idea: The CPython frame stack vs the C stack -->

A: So, Python has a call stack too. You see it every time you read a traceback. But it isn't simply the C stack from the building picture. Remember, CPython is a C program. When it runs one of your Python functions, it keeps a little record for that call. Which function, which line, and the local variable slots, which are, of course, pointers to objects. And since CPython three eleven, those records live in a chunk of memory the interpreter allocates on the heap. So a Python function calling another Python function no longer makes the C code recurse. The C stack stays flat.

B: [surprised] Oh, so Python recursion isn't even on the real stack anymore.

A: [relaxed] Pure Python-to-Python calls, no. But plenty of things still recurse in C. Calling R E P R, the function that prints an object, on a deeply nested list. JSON dumps. Pickle. Comparisons. And every C extension that calls back into Python. Each of those pushes real C frames, onto the real eight megabyte stack. And those can still overflow it and segfault the whole interpreter. Which is why CPython has a recursion limit. It's a cap on how deep Python calls can nest. Default's a thousand. Go past it, and instead of crashing, you get a Recursion Error, which you can catch. Historically, every Python call used real C stack, and a thousand calls deep was comfortably under eight megabytes. So the limit's job was turning a crash into an error. Today it's mostly a guard against runaway recursion, and three twelve and newer add a separate check just for C-level depth. You can raise the limit, with sys dot set recursion limit. But on an old Python, raising it just means you get to segfault instead of getting an error. And you'll do exactly that in the build.

<!-- section: The Idea: Reference counting and del -->

B: Okay, so then what does del actually do? Because I've always thought of it as, like, delete this object.

A: That's the common one, and it's wrong in a way that costs people a lot of RAM. del x doesn't delete an object. It deletes the name x. Which drops the object's reference count by one. If that was the last reference, the object's freed immediately. But if anything else still points at it, another name, a list, a cache, a closure, a traceback you saved somewhere, it stays alive.

A: Walk through one. a equals a list with a thousand and two thousand in it. That makes three objects on the heap. Two int objects and a list object, and the list holds two pointers, one to each int. The name a points at the list. Ref count one. Then b equals a. Now a second name points at the same list. Ref count two. Nothing copied. Then del a. The name a is gone, count drops to one. The list and both ints are still alive, because b still points at the list. Only when the last reference goes does the count hit zero. And then CPython frees the list right away, which in turn drops each int's count by one.

B: So most Python memory leaks aren't really leaks in Python.

A: Pretty much. They're not a bug in Python. They're some long-lived container that keeps growing. A dict at the module level that you're using as a cache. A list of results you meant to clear. A logger holding onto references. And every object that container points at is pinned in memory forever. That's most of them. The other source is cycles. If a dot other is b, and b dot other is a, both counts stay at one even after you delete every name you had for them. Only the cycle collector can free those. Normally it just runs on its own and you never think about it. But some teams turn it off, for speed. Instagram famously did, in twenty seventeen. And then cycles never get freed.

<!-- section: The Idea: Where a PyTorch tensor lives -->

A: And a PyTorch tensor is the same story, with one more layer. Say you write t equals torch dot zeros, a thousand by a thousand. What you get is a small Python object, the tensor. It holds the shape, the D type, the device, and something called strides. Strides just mean how many elements to skip to move one step along each dimension. So in a thousand by a thousand, to go down one row you skip a thousand elements. And it holds a pointer to a storage. The storage is what owns the actual buffer of numbers. A million float thirty-twos, four bytes each, four megabytes. On the CPU, that buffer is a heap allocation, just like numpy's. With device equals cuda, it lives in GPU memory, allocated through PyTorch's own CUDA allocator.

A: Now picture the chain. Two names, t and v. Each points at its own small tensor object. t's says shape a thousand by a thousand, offset zero. v's says shape nine hundred ninety by a thousand, offset ten thousand. And both of them point at one single storage, four million bytes, two users. And the storage points at the data buffer, which is on the CPU heap or in GPU memory. The four megabytes of numbers exist once.

B: So v is a slice.

A: v is t from row ten onward. Slices, and dot view, make a new small tensor object pointing into the same storage, just with a different offset, or different strides. Ten rows of a thousand elements is an offset of ten thousand elements. That's why slices are free, and it's why modifying a view modifies the original.

B: [laughs] That explains a bug I had once. I edited a slice and the original changed.

A: That's the one. And on the GPU side there's its own version of "the heap". PyTorch has a caching allocator. It grabs big blocks from the CUDA driver, and when you free a tensor, it keeps those blocks to reuse for the next tensor instead of handing them back. Because asking the driver is slow. So freed memory stays reserved for PyTorch.

B: Hang on, so when I del a big tensor and N vidia S M I doesn't go down... that's this?

A: That's this. After del, N vidia S M I stays the same. And people assume del didn't work. But there are two numbers in PyTorch. torch dot cuda dot memory allocated, which is live tensors, and that does go down. And memory reserved, which is everything PyTorch is holding, and that doesn't. It's the same idea as malloc keeping freed chunks around for later. And on your Spark there's a twist. The CPU and the GPU share one physical pool of memory. A hundred twenty-eight gigabytes of L P D D R five X, per the spec sheet. Instead of the GPU having its own separate memory chips. CPU-heap tensors and CUDA tensors still come from different allocators. And moving a tensor to cuda still makes a second copy, in a different allocation. What changes is there's no P C I E bus in between, and both come out of the same hundred twenty-eight gigabytes. So when you budget memory on the Spark, CPU-side data and GPU-side tensors come out of one shared number. And exactly how NVIDIA exposes shared memory on that chip is worth checking in their docs before you lean on any zero-copy tricks.

<!-- section: Build It: Map your own address space -->

A: Okay, now the builds. You need a C compiler, which you already have on the Mac and on the Spark, Python three twelve or newer, and numpy. And if you can, do the C ones on both machines, because the differences are part of the point. First one, map your own address space. A tiny C program called where. It prints the address of a bunch of things, each with a label. Main itself, so that's code. A global, int g equals forty-two. A local variable inside main. A small malloc, sixty-four bytes. A big malloc, one megabyte. And then a recursive function, deeper, that has one local and calls itself three times, printing the address of its local at each level. The part that matters is compiling with optimizations turned off, dash O zero, because otherwise the compiler keeps locals only in registers and they never get an address on the stack. Then run it three times.

A: On your Mac you'd see something shaped like this. Code and the global, close together, both starting with one, zero, zero in hex. The small heap block just a bit above them. The one megabyte block way, way up somewhere else entirely, because that big one came from a different place. And the stack locals in their own neighbourhood, starting with one six f. Then depth one, depth two, depth three, each one a little lower than the last.

A: So, before you run it. Which local has the lower address, depth one or depth three? By about how much? And will the numbers be the same on the second run?

B: Depth three's lower, because the stack grows down and depth three's the newest. By... one frame? I don't know how big a frame is here. A hundred bytes? And yeah, same numbers each run. It's the same program.

A: The first part's right. Each call's frame sits below its caller's. The gap's one frame, typically tens of bytes. In that Mac run it was forty-eight bytes. Thirty in hex. But the numbers won't be the same next run. That's A S L R. Every run the whole thing slides somewhere else. But the gaps stay the same. Depth one to depth two is still forty-eight bytes, because the layout inside each region is fixed by the compiler. Only the starting point moves.

B: [working it out] So the shape's fixed, the position isn't.

A: Exactly that.

<!-- section: Build It: Blow the C stack on purpose -->

A: Second build, blow the C stack on purpose. A program called boom. One recursive function, f of n. Inside it, a one kilobyte local array. It writes n into the array, so the compiler can't throw it away. It prints n every thousand calls, and flushes the output each time, so what's printed survives the crash. Then it calls f of n plus one, forever. And you use the array in the return value, so the compiler can't quietly turn the recursion into a loop. And before you run it, you write down how deep you think it'll get, using what U limit dash s told you.

B: Okay, let me actually try. Eight megabytes, and each frame's a kilobyte... so about eight thousand?

A: Close, and the reason it's a bit less is the useful part. Each frame's a bit over one kilobyte. The array, plus the return address, the saved registers, some padding for alignment. Call it about one point one kilobytes. Eight megabytes divided by about one point one kilobytes is around seven thousand. On a Mac it printed seven thousand and died before eight thousand. And then you read the exit code. A hundred thirty-nine. Killed by signal eleven, the segfault, the guard page.

A: Then, in that same shell, double the stack. U limit dash s sixteen thousand three hundred eighty-four. That only lasts for that one shell, and macOS caps it at sixty-five thousand five hundred twenty. Run boom again, and it gets about twice as deep.

B: So literally the same thing, twice as far.

A: Twice as far. Double the stack, double the depth. The stack's just a fixed-size region. Nothing more clever than that.

<!-- section: Build It: Where Python's recursion really breaks -->

A: Third build, in Python. A recursive function, depth of n, that returns zero if n is zero, otherwise one plus depth of n minus one. First, call it with five thousand at the default limit. You get a Recursion Error, and you look at how long the traceback is. Then raise the limit to a million and call depth of five hundred thousand.

B: And that blows up for real, right? Half a million deep?

A: On three eleven or newer, it succeeds. Because pure Python frames live on the heap now. They're not using the C stack at all. You check peak memory with resource dot get R usage, the max resident size field. And careful, that one's in bytes on macOS and in kilobytes on Linux. On CPython three fourteen, half a million deep, it's about a hundred megabytes. So each Python frame, plus its int objects, costs on the order of a hundred to two hundred bytes of heap. That memory is "the stack". It just isn't the stack.

A: Then step three. Keep the high limit, but make the C stack recurse instead. Build a list nested a million deep. Start with an empty list, then a million times, wrap it in another list. And call R E P R on it. That recursion happens in C. So now you're back on the real eight megabyte stack. And depending on your version you get either a hard crash or a C-level "stack overflow" error. And if you've got an older Python around, you can install three ten with U V, and run the half-million one there too. That's where it falls over.

<!-- section: Build It: Weigh Python objects -->

A: Fourth, weigh Python objects. A script that answers each question with a measured number. sys dot get size of for single objects, and trace malloc for totals. There's a little helper given to you: start tracing, build the thing, read how much is currently allocated, stop tracing, and keep the object alive so it doesn't get freed before you read the number. And the questions. One, the sizes of a bunch of small things. Zero, one, two to the thirtieth, ten to the twentieth, a float, an empty string, an empty list, an empty tuple, an empty dict. And there's a jump at two to the thirtieth.

B: Is that the thirty-bit digit thing?

A: That's the thirty-bit digit thing. Two to the thirtieth doesn't fit in one thirty-bit digit anymore, so the int needs a second one, four more bytes. Two, the total for a million distinct ints as a list, as Python's array type, and as a numpy array. And compare what get size of says for the list against what trace malloc says. You'll see eight megabytes against about forty, and now you know why. Three, zero times a million versus a list of range of a million. Eight megabytes against forty, because of the shared small ints. Four, set a to two fifty-six and b to two fifty-six and ask if they're the same object. They are, it's the cached one. Then do the same with int of the string one thousand, twice. Not the same object. Two separate thousands on the heap.

A: And five, a dict mapping a million ints to floats. About a hundred megabytes. So about a hundred bytes per entry. And it adds up like this. The hash table itself, for each entry, holds the hash, a pointer to the key, a pointer to the value, an index, and some spare room so the table never gets too full. Roughly forty bytes. Then the int key object, thirty-two. Then the float value, twenty-four, rounded up to thirty-two. Forty plus thirty-two plus thirty-two, about a hundred.

<!-- section: Build It: The fifty-million-pair dict -->

B: [thinking out loud] Okay, so that's a problem for me, actually. I've got stuff like that. Doc ID to score, for the ranker.

A: [working it out] So do the math on it. Say fifty million id and score pairs, in a Python dict. About a hundred bytes a pair. Fifty million times a hundred bytes, about five gigabytes. And while the dict's growing, it briefly needs more than that, because when it resizes it doubles its table. And here's the part that hurts. The actual information is twelve bytes a pair. An eight-byte id, and a four-byte float thirty-two score.

B: So I'm paying a hundred bytes to store twelve.

A: Yeah. So you shrink it with two numpy arrays. ids as int sixty-four, sorted. And scores as float thirty-two, lined up with them, so the score at position i belongs to the id at position i. Fifty million times twelve bytes is six hundred megabytes. About eight times smaller. And a lookup becomes a binary search on the sorted ids. numpy's search sorted does that, it's still fast. Or you do it for a whole batch of ids at once. And if your ids happen to be dense, like every integer from zero up to N, you don't even need the ids array. Just index the scores array by id. Two hundred megabytes.

<!-- section: Build It: Look inside a tensor -->

A: Fifth build, look inside a tensor, on the Spark, though any machine with PyTorch does the CPU half. Make the thousand by thousand zeros tensor. Multiply the element size by the number of elements, and compare it to the storage's byte count. Both say four million. Then make v as t from row ten onward, and check that v's storage has the same data pointer as t's storage. Same buffer. And the difference between v's own data pointer and t's is ten rows times a thousand elements times four bytes. Forty thousand bytes in. Then set the first element of v to seven, and look at row ten of t. It's seven.

A: Then the CUDA half. Allocate a one gigabyte tensor on the GPU, then del it. Print memory allocated and memory reserved before and after, and watch N vidia S M I in another terminal. Allocated drops. Reserved doesn't, and neither does N vidia S M I. Then call torch dot cuda dot empty cache, and that's when PyTorch actually hands the blocks back. And if any of those method names changed in your PyTorch version, the torch docs on CUDA memory management will have the current ones.

<!-- section: Build It: Hunt a leak with trace malloc -->

A: And the last build is the one you'll actually use at work. Hunting a leak with trace malloc, instead of guessing. You get a little fake reranking service. It has a module-level dict called score cache. It has a Request class, which stores the query, the list of docs, a four kilobyte scratch buffer, and a little callback, a lambda, called on done, that calls back into self. And a score function that caches features under the key of query and doc, as a list of sixty-four floats. And a handle function that makes a Request with twenty docs and sorts them by score. The main loop runs twenty thousand requests. And right before that loop, it turns off the garbage collector. With a comment saying "for speed".

B: [amused] I can already hear the bug in the comment.

A: [laughs] You can. So the job is, turn on trace malloc, keeping ten frames of call stack for each allocation. Take a snapshot after a thousand requests, another after twenty thousand, compare the two by line, and print the top five lines that grew. Then for each one, say who still holds a reference, and why the count never reaches zero.

B: Okay. The cache one's obvious-ish. It's a module-level dict, it never gets cleared.

A: And worse than that, look at the key. It's query plus doc. Every request has a brand new query, q one, q two, q three. So the cache never hits. Not once. It's just twenty new entries per request, forever, each one holding a list. A cache with no bound. That's leak one. What's leak two?

B: [hesitant] The... scratch buffer? Four kilobytes a request?

A: That's what shows up at the top, yeah. But why isn't it freed? The request goes out of scope at the end of handle.

B: [working it out] Because of the lambda. The lambda refers to self. And self holds the lambda. So the request points at the lambda, the lambda points back at the request. Both counts stay at one.

A: [pleased] That's the cycle. Nothing outside points in, but counting can never get them to zero. Only the cycle collector could free it. And somebody turned the collector off for speed. So every request, its docs, and its four kilobyte buffer, stay pinned forever. And you'll get your own number for growth per thousand requests before the fix. Then you fix each one minimally. Bound the cache, or key it on something that actually repeats. And break the cycle, or let the collector run. Run it again, and the growth's gone. Write down the before and after.

A: And that's the whole set. If you've watched your own stack grow downward and seen A S L R slide it around, crashed C and read that hundred thirty-nine, changed how deep it gets with U limit, seen Python fail both ways, the clean error and the hard crash, can explain your weigh numbers to within a few bytes an element, and found both leaks with before and after numbers... then you've got it. Not just read it.

<!-- section: Measure -->

A: So you've heard most of the expected numbers already, along the way. The ones worth holding onto are the ones where the why is the point. Boom dying around seven thousand deep is just eight megabytes divided by a frame that's a bit over a kilobyte. Python surviving half a million deep on about a hundred megabytes is the frames living on the heap. The list being five times numpy for ints is eight plus thirty-two against eight. And for floats it's four times, eight plus twenty-four, thirty-two, against eight.

B: [skeptical] And if mine come out different? Like, way different?

A: If anything's off by more than about twenty percent, figure out why before you move on. It's almost always one of three things. A different Python version. The small-int caching, because you tested with small numbers. Or a list you built with append, which over-allocated.

<!-- section: Break It -->

A: Now break it. Four ways. First one. In C, write a function that makes a local int, sets it to twelve thirty-four, and returns its address. A pointer to its own local. Then print what that pointer points at. Then call some other function that has a few locals of its own. Then print it again.

B: It's... twelve thirty-four both times? The value's still sitting there.

A: [amused] The compiler warns you not to, first of all. And the first print might even work. But the second one shows garbage. On a Mac it printed twelve thirty-four, then one. Because the frame was popped when that function returned, and the next call reused the exact same bytes for its own locals. That's the clearest possible demo that stack memory has no life beyond its call. And it's the whole reason the heap exists.

A: Second. Double free. Free the same pointer twice.

B: I'd guess... nothing happens? It's already free.

A: The allocator notices its own map is corrupt and kills the process. On Linux, G lib C prints a message, "double free detected in tcache two", and aborts. On a Mac it just died, silently, with exit code a hundred thirty-three, which is a trap. Then compile again with address sanitizer turned on, dash f sanitize equals address, and run it. It names the exact line of each free. Use that any time you write C, or build a C extension.

A: Third. A del that frees nothing. Make a five hundred megabyte numpy array, and also put it in a list. Then del the name, and check the process's memory.

B: Nothing changes. The list still has it.

A: Nothing changes. Clear the list, and it drops instantly. Now do the same with a tensor captured in a lambda, or stored on self inside a training loop.

B: [sighs] And that's my notebook running out of memory.

A: That's the most common "my notebook ran out of memory" bug there is. And fourth. On Python three ten, raise the recursion limit to a million and run depth of two hundred thousand. There's no Recursion Error. Just a segfault, exit code a hundred thirty-nine, with no Python traceback at all. Because back then, each Python call used real C stack. Raising the limit removed the guardrail. It didn't make the road any wider.

A: If you want to go further on any of this, the two best places are the Computer Systems book by Bryant and O'Hallaron, the chapters on procedures and on dynamic memory allocation. And Operating Systems, Three Easy Pieces, whose chapter on free-space management is the best plain explanation of fragmentation there is. And this all leads straight into the next lesson, on processes, threads and the GIL, and later into virtual memory, why numpy's fast, and the memory math for models, which is just this same bytes-per-element habit, applied to weights.

<!-- section: Close -->

B: [working it out] Okay, let me try the whole thing. The stack is last in, first out, one frame per function call. It's fast because making a frame is just moving a pointer and it's always in cache, and it's small, eight megabytes. And the heap is the big pile for everything else. And in Python, everything's on the heap, and a variable's a name pointing at an object, so del just... removes a name.

A: [thoughtfully] That's nearly all of it. The piece I'd sharpen is why the heap exists. It isn't really "everything else", like overflow space for when the stack's full. It's for data the stack can't hold by design. Data whose size you only learn at runtime, and data that has to outlive the function that made it. The stack can't do either, no matter how big you make it. And the cost of the heap is that somebody has to decide when it's free. In C that's you, in Python it's a count, and every Python leak is just something, somewhere, still holding a reference.
