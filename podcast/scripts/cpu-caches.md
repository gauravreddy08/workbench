<!-- section: The Problem -->

A: [relaxed, thinking out loud] Say you've got ten million relevance scores out of the cross-encoder. One number each. And you want to add them up, or take the mean, or the bottom of a softmax, it's the same loop. You write the obvious Python. Start at zero, for each score, add it on. And on my Mac that takes about a tenth of a second. Then you put the same numbers in a NumPy array and call sum, and it takes about a millisecond.

B: Right, the famous gap. That's like a hundred times.

A: Around ninety. And if you ask anybody why, what do they say?

B: NumPy's written in C. Python's slow, C's fast.

A: That's what everyone says. And it's true, but it's only half the story. Here are two more things I ran, same machine, same ten million numbers. First, I kept the Python loop exactly as it was. Same code, same list, same values. The only thing I changed was where the number objects sat in memory. I shuffled them. And the loop got four times slower.

B: [skeptical] With the exact same code?

A: Identical. The interpreter did exactly the same work. And then the other way. I kept NumPy, all C, and just summed the numbers in a random order. And it was dozens of times slower than NumPy in order.

B: Okay, so "it's written in C" doesn't explain either of those.

A: Neither one. So there are really two different bills. One you pay for running Python's bookkeeping on every element. And the other one is paid to the memory system. And the memory system charges by where your bytes sit, and the order you touch them in. NumPy wins on both, which is why its lead looks so huge. But you can lose that second bill in C, in NumPy, and on a GPU. And then being written in C saves you nothing.

<!-- section: A small fast memory -->

A: [warm] There's a nice piece of history behind the second bill. In nineteen sixty-five, Maurice Wilkes, who'd built one of the very first stored-program computers, wrote a two-page paper. And the idea was, put a small, fast memory in front of the big slow one, and have the hardware automatically keep copies of whatever you used recently. So the programmer never has to think about it. A few years later IBM shipped it, and gave it the name that stuck. A cache.

B: And it works because...

A: It only works because of a fact about programs that people were measuring around the same time. Programs don't touch memory at random. They reuse what they just used, and they walk to what's next to it. Every cache since, including the ones on your Mac and on the Spark, is a bet on that behaviour. And this whole episode is really about what happens when your code honours the bet, and what happens when it doesn't.

<!-- section: Two bills -->

A: Think of summing numbers as a warehouse job. Someone has to walk to each shelf and bring the item back. That's the memory bill. And someone has to fill in a form for every item. That's the interpreter bill. NumPy is a forklift on one straight aisle. No forms, and everything's lined up in a row. A Python loop over a list fills in a form for every item, and the items are wherever there happened to be space when they were stored.

B: What's on the form, exactly?

A: When Python runs that little loop, it doesn't just add two numbers. For every element, it fetches the next item from the list, checks what type both things are, finds the right add routine, adds the two numbers, and then, because a Python float can't be changed in place, it makes a brand new float object for the running total. Then it updates a few of those reference counts. That's the form. And it costs about ten nanoseconds an element.

B: And the memory side?

A: Remember what a list actually is. It's an array of pointers, and each pointer leads to its own separate float object somewhere on the heap. So reading one element is two trips. The pointer, then the thing it points at.

B: [working it out] So how do you tell which bill you're actually paying?

A: There's a lovely test. I made a list so small it fits entirely in the fast cache. And the loop over it was no faster per element than over the giant list that lives in RAM. So for an in-order list, the form is the whole cost. The memory bill is hidden underneath it. But the second you shuffle where those objects sit, same form, and suddenly the memory bill shows up, four times over.

<!-- section: The cache line -->

B: Why does the order even matter, if each element's one read either way?

A: Because the memory system never moves one number. When you ask for eight bytes that aren't in cache, the hardware fetches the whole chunk they sit in. That chunk is called a cache line. On your Mac it holds sixteen numbers' worth. On the Spark it's half that.

B: Oh. So if my next read is the neighbour, it's already there.

A: Already there, basically free. And if your next read is somewhere else entirely, all the rest of that chunk made the trip for nothing. There are two names for the habits that pay off. Using things that sit next to what you just used is spatial locality. Using the same thing again soon, before it gets pushed out, is temporal locality.

A: And there's a third piece. Even if you use every number in a line, you'd still be waiting a full trip to RAM once per line. So the chip has a clerk at the warehouse door. The prefetcher. It watches what you're asking for. You ask for shelf forty, then forty one, then forty two, and without being told, it sends runners for forty three, forty four, forty five. By the time you ask, it's on the counter.

B: And it can't do that if I'm jumping around.

A: It can follow a straight line, or a fixed step, like every eighth shelf. What it can't do is guess the next item in a random list. Or the next object behind a pointer it hasn't even loaded yet. So in-order access turns a waiting problem into a flow problem. Lots of lines in flight at once, arriving back to back. Random access leaves you waiting, one trip at a time.

<!-- section: Why lists lose -->

B: So for a list, when are the objects in order?

A: When you build the list in order. A list comprehension, appending in a loop, converting from an array. Python's allocator tends to hand out neighbouring addresses one after another, so object number two sits right after object number one. Following the pointers just walks forward through memory, and the clerk's happy.

B: And when they're not?

A: When the order you visit them doesn't match the order they were made. You sorted the list. You shuffled it for a training epoch. You built it out of a dictionary's values. Then every pointer jumps somewhere new, and every element is probably a trip to RAM, and the clerk has no idea where you're going next.

A: And that's the thing NumPy takes away completely. A NumPy array has no objects, no pointers. Every element is just at the start plus some fixed step. The address of every single number is known without loading anything first.

<!-- section: Rows and columns -->

A: Which brings up a question. What happens when NumPy's numbers aren't next to each other? Memory is one long line of bytes. A matrix is two dimensional. Somebody has to decide how to flatten it. NumPy and PyTorch and C store it row after row. That's called row-major order. Some other languages do it column after column.

B: And strides are how NumPy keeps track.

A: Right, strides are how far to jump in memory to take one step along each dimension. So transposing, or slicing every other column, doesn't move any numbers. It just makes a new little lens with different strides on the same block of memory.

B: Which means walking down a column of a big matrix...

A: Jumps a whole row's worth of memory every step. A new cache line, every single number. When I summed a big matrix with a tiny compiled loop, going column by column was about six times slower than row by row. Same additions, same numbers, same compiler. I just swapped the two loops.

B: [skeptical] And on a small matrix?

A: Nothing. A small matrix fits in cache, so every walk is a hit. The gap only showed up once the matrix got bigger than the cache. Which is why this is so easy to miss. Your test data is small, and your real data isn't.

A: And NumPy's often clever about it. If you sum along a transposed array, it notices and walks memory in its natural order anyway. But some operations have to read in one order and write in another. Like making a proper row-major copy of a transposed array. That one has to go down columns on one side, and it pays.

<!-- section: Several adds at once -->

B: Okay, but here's what I still don't get. A compiled loop going in order reads memory perfectly. So why's NumPy still several times faster than that?

A: That's the third trick, and it's not about memory at all. It's about the arithmetic. Your loop adds each number into one running total. And each add needs the answer from the add before it. A floating point add takes a few clock cycles to finish, so the core just sits there, waiting for the total, even though it's got spare adders doing nothing.

B: So it's a chain.

A: It's a chain. Like one cook with one pot, and every ingredient has to wait for the last one to dissolve. So the fix is to keep four running totals instead of one. Add the first number to total one, the second to total two, and so on, and combine them at the end. Now there are four independent chains, and the core runs them side by side. That alone made it a few times faster, no special instructions at all.

A: And then on top of that, modern chips have wide registers. One register holds a couple of numbers side by side, and one instruction adds them all at once. That's called SIMD. Single instruction, multiple data. Put that together with several totals, and you get NumPy speed.

B: Then why doesn't the compiler just do that for me?

A: Because floating point addition isn't quite associative. Adding a plus b, then c, can come out a tiny bit different from a plus b plus c grouped the other way, because every add rounds. Splitting one sum into four changes the order, so it can change the answer in the last few digits. And the compiler isn't allowed to change your answer without permission. There's a flag that gives it permission, called fast math. NumPy gets around it more cleanly. Its sum is documented to add things up in blocks, then add the blocks. Which is actually more accurate than one long running total, and naturally splits into chains the chip can run side by side.

B: And does fast math fix the column walk too?

A: That's the best part. It made the row walk several times faster, and did absolutely nothing for the column walk. Because the column walk was never waiting on arithmetic. It was waiting on memory all along. And once the fast in-order version runs over data too big for the cache, it slows down a bit too, because now it's waiting on RAM. The slow one-total version barely notices where the data is. Slow code never sees the memory wall. Fast code always does.

<!-- section: The array puzzle -->

B: [working it out] So then if I just used Python's built-in array module instead of a list, packed numbers, no objects, my plain Python loop should get faster.

A: That's what I'd have guessed too, and it got slower.

B: Slower? It's smaller and it's dense.

A: It's dense and it's smaller. But Python code can't touch a raw number. So every time the loop hands you the next element, Python has to build a brand new float object for it. The list already had its objects made. So the packed array fixed the memory bill and made the form longer. Compact layout only pays off when the loop over it is in C.

A: And the flip side surprised me too. Summing NumPy in random order was much faster than looping over the shuffled list, even though both are random. Because in NumPy, every address comes from an index array that's already known. So the core can have lots of trips to memory in flight at once, overlapping their waits. In the Python loop, each trip is buried in so much bookkeeping that only a few ever overlap.

<!-- section: The same story on a GPU -->

A: [relaxed] And all of this gets louder on a GPU, because a GPU is basically a machine built to be fed by memory bandwidth. An NVIDIA GPU runs threads in groups of thirty two, called a warp. And when a warp loads something, all thirty two threads hand in their addresses at the same moment, and the memory system looks at them together.

B: So if they're neighbours...

A: If thread one reads number one, thread two reads number two, and so on, the whole warp gets served with a few small chunks. That's called coalesced access. But if each thread reads down a column, every thread lands in a different chunk, and you move many times the bytes for the same work. And inference kernels are already memory-bound, so moving many times the bytes means running nearly that many times slower.

B: That's why everyone's obsessed with layout in kernels.

A: That's why. Tiling matrices into blocks that warps can read in rows, loading a tile once into fast on-chip memory, and reusing it many times before going back out. FlashAttention, at its heart, is temporal locality done by hand.

B: And dot contiguous in PyTorch?

A: Same story. A tensor's a pointer, a shape and strides, exactly like NumPy. So a transpose or a permute is free. It just swaps strides. But then some operations refuse it, some handle it slowly because one input gets read down columns, and some quietly copy it for you on every call. So when you see someone transpose q and call contiguous in an attention implementation, that's someone paying for the copy once, on purpose, so the next big kernel gets nice dense reads. And the CNNs you've trained have a version of this too, channels last, where all the channels for one pixel sit right next to each other.

<!-- section: When NumPy loses -->

B: Is NumPy ever the wrong call, then?

A: For tiny things, yes. When I shrank the data down to about ten numbers, plain Python's sum beat NumPy easily. Every NumPy call pays a fixed toll before it touches a single number, working out the arguments and the types and making the result. And converting a list into an array first is itself a Python-speed loop over objects. So NumPy pays off when your data lives in arrays and you do lots of work per conversion.

<!-- section: Ending -->

B: Okay. Let me try. A Python loop over a list pays two bills. The interpreter's form for every element, and the memory trips to scattered objects. NumPy skips the form and keeps the numbers packed in a row, so every cache line is full of useful stuff, the prefetcher can run ahead, and the chip can add several at once. So NumPy's fast because it's C and it's contiguous.

A: That's the story, and I'd sharpen one bit. The two bills aren't separate. Layout changes how much the interpreter's work hurts, and it's what lets the chip do several adds at once in the first place. And "contiguous" isn't something you have once and keep. It's about the order you actually walk. You can be in C, in NumPy, or on a GPU, and still walk down columns and pay for whole lines to use one number. So when something's slow, before you ask what language it's in, ask where the bytes are sitting, and what order you're touching them.
