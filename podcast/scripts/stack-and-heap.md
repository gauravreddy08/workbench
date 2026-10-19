<!-- section: The Problem -->

A: [relaxed, thinking out loud] Here are three things that are going to happen to you, if they haven't already. You make a Python list of tens of millions of numbers, and it takes something like five times the memory you budgeted. You write a recursive function, and instead of a nice error, the whole program just dies. And you run a service, say your ranking server, for a few days, and it slowly eats memory until something kills it.

B: The last one's happened. I restarted it and moved on.

A: Everybody does. And all three come from the same place. Where your bytes actually sit, and who's in charge of cleaning them up. Which means we have to talk about the stack and the heap.

B: [a bit unsure] Okay. So my picture is, the stack is first in, first out. And the heap is that tree, the sorted one.

A: Both halves wrong. But in a really normal way, because the words are doing it to you. "Stack" sounds like a line of things waiting. And "heap" is also the name of a tree you studied in an algorithms class.

A: So the stack is last in, first out. Think of a stack of plates. You put a plate on top, and the one you take off is the one you put on most recently. Nobody pulls out the bottom plate. First in, first out is a queue. The line at a coffee shop.

B: Okay, plates. And the heap?

A: The heap in "stack and heap" has nothing to do with the tree. It's just a big region of memory where a program asks for chunks while it's running. It's not sorted. It's not a tree. Inside, it's more like a parking lot with gaps in it.

B: Then why on earth do they have the same name?

A: [amused] An accident. Around the same time in the sixties, someone published a sorting algorithm and named its tree a heap. And language designers started calling the pool of runtime memory "the heap", just in the everyday sense of a pile of stuff. Two groups of people picked the same ordinary word. Nobody planned the clash.

<!-- section: Somewhere to put the calls -->

A: The stack's history is actually the best way to see what it's for. Early machines didn't have one. In the first version of FORTRAN with subroutines, each function got one fixed spot in memory. For its variables, and for the address to jump back to when it finished.

B: That sounds fine.

A: It's fine until a function calls itself. Then the second call writes its return address into that same spot, right over the first one. And now the first call can never find its way home. So early FORTRAN just didn't allow recursion.

B: [laughs] Just, banned it.

A: Banned it. Then a language called ALGOL came along and required recursion. And in nineteen sixty, Edsger Dijkstra wrote a paper called Recursive Programming, showing how to do it. Keep each call's data in a pile in memory. When a function is called, put a block on top. When it returns, take it off. Two other computer scientists, Bauer and Samelson, had actually patented the same idea a few years earlier. They called it the cellar principle. And once that idea won, the hardware followed. Almost every processor since has a special register that just points at the top of that pile. That pile is the stack.

<!-- section: One plate per unfinished call -->

A: So picture a running program's memory as one long strip of numbered bytes. Down at the bottom is the program's code. Above that, the variables that live for the whole run. Then the heap, which grows upward as you ask for more. And way up at the top is the stack, which starts high and grows down.

B: And each function call gets one plate.

A: Each call that hasn't finished yet gets one. It's called a stack frame. It holds the call's local variables, and the address to jump back to in whoever called it. Call a function, push a frame. Return, pop it. And because a function always finishes before the one that called it, the newest frame is always the first to go. That's why it's plates.

B: [working it out] Oh, and that's what a traceback is. It's just the frames.

A: That's literally what a stack trace is. A walk down the pile, from the newest frame to the oldest.

B: Why's it so fast, though? Everyone says the stack is fast.

A: Two reasons. One, making a frame is a single instruction. The compiler already knows how big every function's frame is, so it just moves that pointer to the top down by that much. Done. Giving it back is moving the pointer up again. No searching, no bookkeeping. And two, it's the memory you touched a few nanoseconds ago. Remember the latency ladder, the closest little memory on the chip is about a hundred times faster than going out to RAM? The top of the stack is basically always sitting there. It's the hottest memory you've got.

<!-- section: Why it's small -->

B: So why not put everything on the stack?

A: Because the price of that speed is that it's rigid. How big the stack can get is reserved up front, when the thread starts. Usually a few megabytes. And every frame's size has to be known when the program's compiled.

B: A few megabytes doesn't sound like much.

A: It's plenty for calls. A normal frame is tiny, so you can nest tens of thousands deep. But it's nothing for data. Put one big array as a local variable in a C function, and the program's just dead. And if you recurse too deep, the pointer walks off the end of that reserved space into a page that's deliberately left empty. A guard page. The moment you touch it, the operating system kills the program. That's a segmentation fault. And the whole thing is called a stack overflow.

B: Like the website.

A: Like the website. And when I did this on purpose, with a function that calls itself forever and carries a chunky local in every frame, it got several thousand calls deep and died. Then I doubled the stack size in that shell, and it got twice as deep. That's all the stack is. A fixed-size region. Nothing smarter.

A: And one more thing to tuck away, because it's the whole next episode. Every thread gets its own stack. It has to, because every thread is running its own chain of calls. But all the threads in a program share one heap.

<!-- section: The heap -->

B: Okay. So what does the heap do that the stack can't?

A: Two things. First, data whose size you only find out while running. How many rows are in this file? How long is this query? Second, data that has to outlive the function that made it. Say you write a function that loads a model and returns it. The weights can't live in that function's frame, because the frame's gone the second it returns.

B: Right. Pop.

A: Pop, and it's gone. So you ask the heap. There's a piece of code called the allocator that keeps a map of which parts of the heap are in use. You ask for some bytes, it finds a free gap that's big enough, marks it, and hands you the address. And when it runs out of gaps, it goes and asks the operating system for more, which is much slower again.

B: So that's why the heap's slower. It has to go looking.

A: That's one reason. The other is where things end up. Heap objects land wherever there happened to be a gap. So stuff that belongs together is often scattered all over memory, and walking through it means trips out to RAM. Neither cost is a big deal once. Both are a big deal a hundred million times in a loop.

A: And there's a sneaky third problem. Things get freed in random order, so the heap gets holes in it. You can have plenty of memory free in total, but all in little holes too small for what you're asking for. So the allocator has to grow the heap anyway. That's called fragmentation. And it's one reason a long-running server's memory can creep up even when nothing is leaking.

<!-- section: Who cleans up -->

B: And then someone has to give it back.

A: Right, and that's really the big difference. The stack cleans itself up. Popping the frame is the cleanup. The heap has no moment like that. Someone has to decide, nobody needs this anymore. And languages mostly differ in who that someone is.

A: In C, it's you. Every chunk you ask for, you have to give back exactly once. Forget, and it leaks. Give it back twice, or keep using it after, and you corrupt the allocator's map. A lot of real security bugs are exactly that. In Rust, it's the compiler. Every heap value has one owner, and the compiler puts the free in for you when the owner goes away. And in Python, it's counting.

B: Counting what?

A: Every object carries a little number. How many things are pointing at it right now. Point a new name at it, the number goes up. A name goes away, it goes down. When it hits zero, the object's freed right then. That's reference counting. And there's a separate sweeper that runs every so often for the one case counting can't handle, two objects pointing at each other.

<!-- section: In Python, everything is on the heap -->

A: [warm] And this is the bit that changes how you read Python. In Python, every single value is an object on the heap. Variables aren't boxes holding values. They're names pointing at objects.

B: Even a plain number?

A: Even a plain number. Write x equals a thousand, and Python makes an int object on the heap and points x at it. Write y equals x, and nothing gets copied. Now two names point at the same object. And that int object isn't just the number. It's got the reference count, a pointer to its type, some size information. It ends up more than three times as big as the raw number would be.

B: [working it out] So a list of a million ints is...

A: Two things. An array of a million pointers. And then a million separate int objects, scattered around the heap. Whereas a NumPy array of the same million numbers is just the raw numbers, side by side, in one block. And the list comes out about five times bigger.

B: That's my first surprise. The list that's five times what I budgeted.

A: That's your first surprise. And it's not only bigger, it's slower, because the NumPy numbers sit next to each other and the processor can stream through them, while the list makes it chase a pointer for every element. There's a whole episode on just that.

<!-- section: Why recursion dies -->

B: What about the second one, the recursion that kills the program? Python gives me a recursion error, usually.

A: Usually. Here's the history. Python's interpreter is a C program. For a long time, every Python function call also used up real C stack, that few-megabyte region. So Python put a cap on how deep you could go, a recursion limit. At the default, you'd always stay comfortably inside the real stack, and you'd get a clean error you could catch instead of a crash.

B: So the limit's a guardrail.

A: It was a guardrail. And on older Pythons, if you raised the limit way up, you'd just remove the guardrail without making the road any wider. Deep enough, and the whole interpreter segfaults. No traceback, nothing.

A: Newer Pythons changed that. They keep the record for each Python call in memory they allocate on the heap. So when I raised the limit and recursed half a million deep in plain Python, it just worked. It used a fair bit of memory, but it worked. But plenty of things inside Python still recurse in C. Printing a list nested inside itself a million levels deep, say. And those can still blow the real stack and take everything down.

<!-- section: Why the service grows -->

B: And the third one, the server that slowly eats memory. I'd assume I forgot to delete something. Like, I should be calling del on things.

A: So, del doesn't do what most people think. It doesn't delete an object. It deletes a name. It drops the count by one. If that was the last thing pointing at the object, it's freed. But if anything else still points at it, a list, a cache, something stored on self, it stays alive.

B: Huh. So del is kind of a polite suggestion.

A: [laughs] Kind of. And that's most real Python leaks. Not a bug in Python. Some long-lived container, like a dictionary you're using as a cache, just keeps growing, and every object it points at is pinned forever. The other kind is loops of objects pointing at each other, and someone turned off the sweeper to make things faster. Instagram famously turned it off once. Then those loops never get freed. And the way you find either one isn't guessing. Python has a built-in memory tracer, and you just ask it which lines are holding onto memory, and compare two snapshots.

<!-- section: Where a tensor lives -->

B: Where do tensors fit? That's most of my memory.

A: Same story, one more layer. A tensor is a small Python object that holds the shape and the type and so on, plus a pointer to a storage. The storage owns the actual block of numbers. On the CPU, that's a heap allocation. On the GPU, it's GPU memory. And when you slice a tensor, you get a new small object pointing into the same storage. Which is why slices are free, and why changing a slice changes the original.

B: And when I delete a big tensor on the GPU, nvidia smi doesn't go down. I always found that weird.

A: That's the GPU's version of the heap. PyTorch has its own allocator for GPU memory, and asking the driver for memory is slow, so when you free a tensor, it keeps that block for the next one instead of giving it back. It's called the caching allocator. So your live tensors went down, but what PyTorch is holding didn't. And on your Spark there's a twist. The CPU and the GPU share one physical pool of memory. So when you're budgeting, the stuff on the CPU side and the tensors on the GPU side all come out of the same number.

<!-- section: Ending -->

B: Let me try it. There are two places. The stack is plates, last in, first out. One plate per function call, really fast, but small, and it vanishes when the call returns. The heap is a big messy pool for things that have to stick around, slower, and someone has to free it. And in Python, everything's on the heap and names just point at it. So the stack is the fast one and the heap's the slow one.

A: That's it, mostly. I'd sharpen the last line. Fast and slow is a side effect. The real difference is lifetime, and who cleans up. The stack's for things that die when the call ends, so it cleans itself up for free. The heap is for things that outlive their call, so someone has to decide when they're done. And in Python, that someone is a counter. So when memory grows, the question isn't "what did I forget to delete". It's "who is still pointing at it".
