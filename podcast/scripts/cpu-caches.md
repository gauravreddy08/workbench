<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you've got ten million relevance scores out of your cross-encoder. One float per document. And you want their sum. Or the mean, or the denominator for a softmax, it's all the same loop. So you write the obvious thing. A Python for loop, a running total, add each score to it. On an M four Pro MacBook that takes about a hundred and seven milliseconds. Then you put the same ten million numbers in a NumPy array and call NumPy's sum. One point two milliseconds. So that's the famous gap. About ninety times.

B: [casual] And that's just... NumPy's written in C, right? Python's slow, C is fast.

A: That's true. And it's about half the story. Here's why I say half. Same machine, same ten million numbers, same Python. Keep the Python loop exactly as written. Not one character changed. But build the list so the float objects, the actual little boxes holding each number, sit in memory in shuffled order. Same values, same length, the interpreter runs the exact same instructions. Four hundred and fifty-seven milliseconds.

B: Wait. Four times slower? With the same code?

A: Four times slower, and the interpreter is doing exactly the same work. Now flip it around. Stay in NumPy, all C, but sum the numbers in a random order. You index the array with a shuffled list of positions and sum that. Forty-two milliseconds. That's thirty-five times slower than NumPy going in order. And it's all C.

B: [working it out] Okay, so "it's written in C" can't be the whole thing, because C just lost by thirty-five times.

A: Right. So there are two different bills. One you pay for running Python bytecode on every single element. Call that the interpreter bill. And the other one's paid to the memory system, and it charges by where your bytes sit, and what order you touch them in. That's the memory bill. NumPy wins on both, which is why its lead looks so huge. But you can lose the memory bill in C, in NumPy, in PyTorch on a GPU... and then "it's written in C" saves you nothing. So the rest of this is taking those two bills apart and putting a number on each one.

<!-- section: Origin -->

A: And the memory bill has a birthday. Nineteen sixty-five. Maurice Wilkes, who'd built one of the very first stored-program computers, writes a paper. Two pages. It's called "Slave Memories and Dynamic Storage Allocation". And the idea is: put a small, fast memory in front of the big, slow one, and let the hardware keep copies of recently used words in it. Automatically. The programmer never has to manage it, never even has to know.

B: Two pages.

A: Two pages. And three years later, IBM ships it, in the System three sixty Model eighty-five, and gives it the name that stuck. A cache. But here's the thing. It only works because of a fact about programs that people like Peter Denning were measuring around the same time. Programs don't touch memory at random. They reuse what they just used, and they walk to what's right next to it. Every cache since then, the one in your M four, the ones on the Spark's Grace cores, all of them, is a bet on that behaviour. So really this whole episode is: what happens when your code honours the bet, and what happens when it doesn't.

<!-- section: The Idea: Two bills -->

A: So think of summing numbers as a warehouse job. Somebody has to walk to each shelf and bring the item back. That's the memory bill. And somebody has to fill in a form for every item. That's the interpreter bill. NumPy is a forklift on a straight aisle. No forms, and the items are lined up in a row. A Python loop over a list fills in a form for each item, and the items are... wherever there happened to be space when they got stored.

B: Okay, what's actually on the form, though? Like, in the machine.

A: So when CPython runs that loop, it doesn't just add two numbers. It compiles your Python into bytecode first. Bytecode is a list of really simple instructions, and CPython runs them one at a time, inside a big loop written in C. And for every single element, it runs a handful of them. Fetch the next item out of the list. Store it in x. Load the running total and load x. Check what type each one is. Go find the routine that adds two floats. Add the two doubles, which is the only part you actually wanted. And then, because a Python float can't be changed in place, allocate a brand-new float object to hold the result. Then drop the old total, and update a few reference counts. A reference count is a counter that lives inside every Python object, how many things point at it. It gets touched on almost every operation, and when it hits zero the object's freed.

B: [amused] That's a lot of paperwork for one plus.

A: It's about ten nanoseconds per element on a fast laptop. And the name for all that is interpreter overhead. The work Python does per operation that isn't your math. Dispatching instructions, checking types, wrapping results in objects, counting references. It's usually ten to fifty times the cost of the arithmetic itself. There's a whole separate lesson that opens up that loop instruction by instruction. Here we just need its size. Ten nanoseconds.

A: Now the walk. The add needs the eight bytes of one double, and those eight bytes have to come from somewhere on the memory ladder. Quick reminder of the ladder: the closest, smallest cache, L one, answers in about a nanosecond. Main memory, RAM, takes about a hundred. So a hundred times apart. And which rung each load hits is decided almost entirely by how your data's laid out and what order you walk it in.

A: So here's how you pull the two bills apart, with numbers from that M four Pro, ten million doubles. The Python loop over the in-order list, about ten point seven nanoseconds per element. The same loop over the shuffled list, forty-five point seven. Those two run identical bytecode. So the difference, about thirty-five nanoseconds, is pure memory bill. Nothing else changed.

B: Okay. And how do you get the interpreter part on its own?

A: You use Python's built-in sum on the list. It does the same walk through the same objects, but the loop is in C, so there's no bytecode per element. That's one point nine nanoseconds. So loop minus sum is...

B: [working it out] Ten point seven minus one point nine. About nine.

A: About nine nanoseconds. That's roughly the interpreter bill. And when the objects are scattered, even that C loop inside sum slows down. Eleven point two instead of one point nine, about six times. Then NumPy's sum on a contiguous array, one dense run of numbers: zero point one two nanoseconds. A tenth of a nanosecond, basically. So a fair summary of the famous ninety times is: about five to ten times of it is the interpreter. The rest is memory layout, and what the layout lets the CPU do. Hang on to those last words, because they come back.

<!-- section: The Idea: The cache line -->

A: [settling in] Okay, so the main character here is the cache line. You've met it before, but let's look at it properly. The memory system never moves one byte. It never moves one double, either. When your code loads eight bytes that aren't already in the cache, the hardware goes and fetches the whole block those eight bytes sit in. That block is the cache line, and it's a fixed size. On your Mac it's a hundred and twenty-eight bytes. You can actually ask the Mac, there's a system setting for the cache line size, and it says a hundred and twenty-eight. On the Spark, and on Intel and AMD chips, it's sixty-four.

B: So I ask for eight bytes and I get a hundred and twenty-eight whether I want them or not.

A: Whether you want them or not. Picture it like this. At the top left there's the core, and it says "load element five of the array". To its right is the L one cache, drawn as a row of sixteen little slots. And way down at the bottom is RAM, one long strip. The core asks for element five, and up from RAM comes a whole line, elements zero through fifteen, and it lands in those sixteen slots, with element five highlighted in the middle. That trip takes about a hundred nanoseconds, and you pay it once. And now the next fifteen neighbours cost about a nanosecond each. So sixteen doubles per line on Apple, eight on x eighty-six and the Spark. And the catch is, if your next loads are the neighbours, they're all L one hits. If they're somewhere else entirely, the other hundred and twenty bytes made that trip for nothing.

A: And there are two habits that make this pay off. They have names. Spatial locality: using data that sits right next to data you just used. After element five you read element six. It's already in the line. And temporal locality: using the same data again soon. You read element five, and you come back to it before newer data has pushed that line out of the cache, so the second visit's a hit. Every speedup in this episode is one of those two. Or the third trick, which we'll get to.

<!-- section: The Idea: The prefetcher -->

B: [skeptical] But hold on. Even with perfect spatial locality, you're still paying the full trip to RAM once per line, right?

A: [pleased] You are. That's exactly the hole. A hundred nanoseconds every sixteen doubles works out to about six nanoseconds per double. And NumPy's getting a tenth of a nanosecond. So something else is going on.

B: Six versus a tenth. Yeah, that's not close.

A: The missing piece is the hardware prefetcher. It's circuitry sitting next to the caches that watches the stream of addresses that miss. It spots a pattern, next line, next line, or every Nth line, and it requests lines before your program asks for them. So picture a clerk at the warehouse door watching what you ask for. You ask for shelf forty, then forty-one, then forty-two. And without being told, the clerk sends runners for forty-three, forty-four, forty-five, forty-six. By the time you ask for forty-three, it's already sitting on the counter. The clerk can also spot a fixed step. Forty, forty-eight, fifty-six. What the clerk can't do is guess the next item in a random list. Or the next object behind a pointer that hasn't been loaded yet. Because the address isn't known until the pointer arrives.

A: So in-order access turns a latency problem into a bandwidth problem. Latency is how long one trip takes. Bandwidth is how much stuff arrives per second once things are flowing. With the clerk sending runners ahead, you've got lots of lines in flight at once, arriving back to back. That's the "bytes in flight" idea from the latency episode. Random access just leaves you with latency. One full trip, then the next full trip. And one more detail: on a lot of chips the prefetcher stops at page boundaries. Pages are four kilobytes on x eighty-six, and usually on the Spark's Linux too, sixteen on macOS. It won't run past one, because the next page might not even be mapped to anything.

<!-- section: The Idea: Feel it -->

A: There's a little interactive strip that makes this really obvious. It's a stretch of memory drawn as rows of slots, sixteen eight-byte slots per row, so one row is one Apple cache line. And every pattern you pick reads exactly sixteen numbers. Then it shades things. Dark for the bytes you actually needed. Grey for bytes you had to read anyway, like pointers and object headers. And light for bytes that came in with a line and were never used. And it counts lines.

A: So you click "in order". Sixteen dark slots in one row. One line on the Mac, two on x eighty-six. A hundred percent useful. Then click "stride eight". That's a sixty-four-byte step between numbers. With sixty-four-byte lines, that's one number per line, so an eighth of everything you fetched is useful. Eight times the memory traffic for the same work. Flip the toggle to a hundred-and-twenty-eight-byte line and it's half as bad, because two numbers share each line.

B: So the same code gets punished differently on my Mac and on the Spark.

A: Different penalty, same code. Yeah. Then there's "column", which is walking down a column of a matrix, and we'll get to why. One line per number, every single time. Then "random". Roughly one line per number, and the prefetcher readout just says "lost". And then the two Python list buttons. The in-order list actually isn't that bad for memory.

B: [surprised] Really? I'd have thought the list was the disaster.

A: It moves more bytes than NumPy. For every number there's an eight-byte pointer, plus a thirty-two-byte block holding the float object. But it's all a forward walk. So lots of grey, but not much light, not much waste. Click "py list, shuffled", and it turns into the random case. Grey and dark splattered all over the strip.

<!-- section: The Idea: Predict, small list -->

A: [curious] So try this one. On your machine the plain Python loop over an in-order list costs about eleven nanoseconds per element. And at ten million floats, counting the objects, that's about three hundred and twenty megabytes, nowhere near fitting in any cache. Now shrink it to ten thousand floats. Small enough that the whole thing sits in L two, the second cache. Per element, is it faster, about the same, or slower?

B: Faster. It's all in cache now. Every load is a hit, so... noticeably faster? Maybe half?

A: [amused] About the same. Ten point eight nanoseconds for ten thousand floats, all in cache. Eleven point oh for ten million, sitting in RAM.

B: [skeptical] Huh. So the cache did basically nothing?

A: For this case, basically nothing. The list walks forward through memory, the prefetcher keeps up, and the interpreter's ten-ish nanoseconds of bookkeeping per element hides whatever memory cost is left. That's honestly the cleanest evidence there is that for an in-order list, the interpreter bill is the one that dominates. The memory bill only shows up when the objects are scattered. Forty-five point seven. Same bytecode.

<!-- section: The Idea: Why pointer-chasing lists lose -->

A: So why do scattered objects hurt so much? Quick reminder of what a list actually is. A list of floats isn't a list of numbers. It's an array of eight-byte pointers, and each pointer leads to a separate twenty-four-byte float object somewhere out on the heap. And the heap here just means the big pool of memory where Python puts objects. Not the data structure. So reading element i is two loads. The pointer, then the object it points to. And the pointer array is dense and you're walking it in order, so that part's cheap. The objects are where it gets interesting.

A: When the objects are created in order, say you called to-list on an array, or you wrote a list comprehension, or you appended in a loop, CPython's small-object allocator tends to hand out neighbouring addresses one after the other. So object i plus one usually sits right after object i. Following the pointers walks forward through memory, and the prefetcher's happy.

B: And when they're not in order?

A: When the order you visit them in doesn't match the order they were made in. You sorted the list. You shuffled it for a training epoch. You built it out of a dict's values. Or the objects were just made at different times by different bits of code. Then every pointer jumps somewhere new. Every element is a likely cache miss. And the prefetcher can't predict the next address, because it doesn't know it until the pointer's been loaded.

B: [working it out] Okay, but then I'd expect the full trip to RAM every time. A hundred nanoseconds. Why forty-five?

A: [thinking it through] Because the pointers come from that in-order array. So the CPU can see the next few object addresses early, and it can have a couple of misses in flight at the same time. Their waits overlap. That's called memory-level parallelism. Several cache misses outstanding at once. Modern cores can track a few dozen per core, if they can find loads that don't depend on each other. But the interpreter runs a long stretch of instructions between one object load and the next, and that limits how far ahead the core can look. So it only overlaps a few. And I'll be honest, that's the best explanation for the exact number. The part that's solid is the direction. Scattering alone gives you a big slowdown.

A: And this is exactly the thing NumPy removes. A NumPy array has no per-element objects and no pointers. Element i is just at the start address plus eight times i. You know the address of every element without loading anything first. Which raises the obvious question. What happens when NumPy's elements aren't next to each other?

<!-- section: The Idea: Rows, columns and strides -->

A: So RAM is one long line of bytes. A matrix is two-dimensional. Something has to decide how to flatten it. C, NumPy by default, and PyTorch all use row-major order. You store all of row zero, then all of row one, and so on. So moving along a row means moving to the next address. It's also called C order. Fortran, MATLAB, Julia and a lot of the classic linear algebra libraries use column-major order. Column after column. Moving down a column is the next address. Also called Fortran order.

A: And NumPy generalises that with something called strides. For each dimension, a stride is how many bytes you jump to take one step along it. So take a little four by four matrix of doubles, row-major. Each double is eight bytes. A row is four of them, so thirty-two bytes. To move one step to the right, you jump eight bytes. To move one step down, to the next row, you jump a whole row, thirty-two bytes. So its strides are thirty-two and eight. And the address of any element is the start, plus thirty-two times the row number, plus eight times the column number. Row two, column one: start plus sixty-four plus eight. Seventy-two bytes in.

B: Okay, so the strides are basically the recipe for finding anything.

A: Pretty much. Every NumPy array is just three things: a pointer to the start, a shape, and the strides. And this is the part that matters. Slicing and transposing don't copy any numbers. They make a new tiny array object with different strides, pointing into the same buffer. Transpose that four by four and its strides become eight and thirty-two. Same buffer. No copy. The roles just swapped.

A: So picture that matrix as a grid, with the top row shaded and the left column outlined with a dashed line. And under it, the same sixteen numbers laid out in memory as one long strip. The top row is the first four cells, side by side. Walk the row and you hop eight bytes at a time, little short arcs from one cell to the next. That's the prefetcher's favourite pattern. Walk the column and you get these big dashed loops, jumping thirty-two bytes, a whole row, every step. And for a real matrix, four thousand ninety-six wide, that step is thirty-two kilobytes. A brand-new cache line every single time.

B: But for a four by four it doesn't matter, surely.

A: For a small matrix, it doesn't matter at all. The whole thing fits in cache, every walk's a hit. For a big one it decides everything. So, the M four Pro again, summing a four thousand ninety-six by four thousand ninety-six matrix of doubles, which is a hundred and thirty-four megabytes, in C. Row by row, half a nanosecond per element. Point five three. Column by column, about three nanoseconds. Five point seven times slower. Same additions, same numbers, same compiler. You just swapped which loop's on the outside. And then compile both with a flag called fast math, and the row walk drops to point one oh. The column walk goes to three point one nine. So now it's thirty-two times.

B: [skeptical] Wait, the flag made the good one five times faster and did nothing for the bad one?

A: Nothing. Which is the third trick, and I'll come back to it in a minute.

B: Okay, but in NumPy... if transposing is free, then summing a transposed matrix is just as fast, right? Same buffer.

A: [thinking] Sometimes. NumPy's usually smart about this. For a reduction, say you transpose the matrix and sum along an axis, NumPy's iterator looks at the strides, notices, and walks memory in its natural order anyway. One point three six milliseconds, versus one point one nine for the un-transposed version. Nearly the same. But not always. Some operations have to read in one order and write in another. Making a copy of the transpose, for instance. It has to produce a new row-major array from a transposed view, so either its reads or its writes go down columns. Five point four milliseconds, versus one point two for copying the original. So every time you ask NumPy for a contiguous version of something, or call copy on a transpose, or hand a transposed array to a library that needs C order, you pay that.

A: And you can just look at all this. Ask any array for its strides. Make a matrix of zeros, a thousand rows by ten thousand columns. Strides: eighty thousand and eight. Its transpose: eight and eighty thousand. Take every other column and you get eighty thousand and sixteen. And there's a flag that says whether it's C-contiguous. True for the original. False for the transpose.

<!-- section: The Idea: SIMD -->

B: Okay, so the memory bill explains the column walk. But it doesn't explain the other thing. A plain C loop going in order is reading memory perfectly, and it's half a nanosecond. NumPy's a tenth. Where's that gap coming from?

A: Right, both of them read memory perfectly. The difference is in how the arithmetic's done, and it's got two parts. Part one is the dependency chain. The plain loop is "total plus-equals the next element". And each add needs the result of the previous add. A floating-point add takes a few clock cycles to produce its answer. So the core sits there waiting for the total before it can start the next add. Even though it's got spare adders sitting idle. It's like one cook, one pot, and every ingredient has to wait for the last one to dissolve. That's where the half a nanosecond per element comes from. It's not memory at all. It's the latency of one add, over and over.

B: So it's not waiting on RAM. It's waiting on itself.

A: [amused] Waiting on itself. And the fix is kind of dumb. Keep four running totals instead of one. The first gets elements zero, four, eight, the second gets one, five, nine, and so on. Then add the four together at the end. Now you've got four independent chains, and the core runs them in parallel on its several adders. Point one six nanoseconds per element. Three point three times faster, just from rearranging the arithmetic. No special instructions at all. That's called instruction-level parallelism. One core running several independent instructions at the same time, because it's got several adders, multipliers, load units, and it'll overlap anything that doesn't depend on something else.

A: Part two is wide registers. Modern cores have S I M D instructions. Single instruction, multiple data. A vector register is a wide register that holds several numbers side by side, and one instruction adds all of them, every lane, at once. On ARM, that's called NEON, on Apple's chips and on the Spark's cores, the registers are a hundred and twenty-eight bits. So two doubles, or four floats, per instruction. Intel's A V X two is two hundred fifty-six bits, A V X five-twelve is five hundred twelve. And combine wide registers with several accumulators, and the in-cache sum gets to point oh eight nanoseconds per element.

A: If you drew those three, it'd be three rows. Top row, one accumulator: a chain of boxes, each one "add to the total", with an arrow from each to the next, because each waits for the one before. Half a nanosecond. Middle row: four short chains stacked on top of each other, running side by side on four adders. Same plain instructions, just reordered. Point one six. Bottom row: each box is now twice as wide, two doubles in one box, one instruction per box, and several boxes in flight at once. Point oh eight.

B: Then why doesn't the compiler just do this? It's an obvious rewrite.

A: [patient] Because floating-point addition isn't associative. Adding a and b and then c can give a slightly different answer from adding b and c first and then a, because every single add rounds. Here's a tiny version. Say your numbers only kept three significant digits. Add one thousand plus four, and that rounds to one thousand. Add four again, it rounds to one thousand again. But add the two fours together first, you get eight, and one thousand and eight survives. Different answer, just from the order. So splitting one sum into four partial sums changes the order of additions, which can change the answer in the last bits. And a C compiler isn't allowed to change your answer without permission. The fast math flag is that permission. Along with a bunch of other, riskier permissions, so don't use it blindly in real code. For integers, where addition's exact, the compiler vectorizes the plain loop all by itself.

B: So how does NumPy get away with it?

A: It gets permission a cleaner way. Its sum for floats is documented to use pairwise summation. It adds the numbers in blocks, then adds up the block sums. That's actually more accurate than one long running total. And it's naturally split into independent chains the CPU can vectorize. So NumPy's sum gets the memory bill right, one dense run, and the arithmetic bill right, lots of independent lanes. Both.

A: But S I M D only helps until memory becomes the wall. Make the array eight hundred megabytes instead of something that fits in L one. The vectorized sum goes from point oh eight to point one one nanoseconds per element. That's about seventy-one gigabytes a second, and it's slowed down because now it's waiting on RAM, not on the adders. And the one-accumulator sum? Point five two to point five four. Doesn't change at all. It was never waiting on memory in the first place.

B: [working it out] Huh. So the slow version can't even tell where the data lives.

A: [emphatic] It can't tell. And that's the roofline idea from the episode on tokens per second, in miniature. Every piece of code has two ceilings. How fast the chip can do arithmetic, and how fast memory can deliver bytes. A slow kernel hits the arithmetic ceiling first. A fast kernel on big data hits the memory ceiling. And that memory ceiling is the same one decoding a big model on the Spark runs into.

A: And notice what S I M D actually needs. The numbers packed side by side in memory, so one load fills one vector register. A Python list can never feed it, because the doubles are inside separate objects scattered around. A strided array feeds it badly. So layout isn't just about cache lines. It's what makes the third trick possible at all. That's what I meant by "what the layout lets the CPU do".

<!-- section: The Idea: Five ways, one chart -->

A: So put it all together. Five ways to sum the same ten million doubles. One, a Python for loop over a list. Two, a Python for loop over Python's array module, the array type from the standard library that stores raw packed doubles. Three, NumPy's sum on a contiguous array. Four, NumPy's sum on a view that takes every sixteenth element, so a hundred and twenty-eight bytes apart, every number in its own Apple cache line. Five, the random gather. Rank them fastest to slowest. And the side puzzle: is the loop over the array module faster or slower than the loop over the list?

B: [thinking out loud] Okay. Contiguous NumPy is fastest, obviously. Then... the strided view, because the prefetcher can still follow it. Then the random gather. Then the two Python loops. And the array module beats the list, because it's dense. No pointers, no objects scattered around. It's like a quarter the size.

A: You got the top four in the right order. Contiguous NumPy, point one two. Strided, two point four. Random gather, four point two. List loop, ten point seven. And then the array module loop: fourteen point nine. Slower than the list.

B: [surprised] Slower? It's literally the better layout.

A: [gently] It's the better layout, and the loop over it's in Python. The array stores raw doubles, but Python code can't touch a raw double. So every time the loop hands you the next x, it has to build a brand-new float object for it. That's extra work per element. The list already has all its objects made. So compact layout only pays off when the loop over it is in C. It's the two bills again. The array module fixes the memory bill and makes the interpreter bill worse. And fastest to slowest, all five, is about a hundred and twenty times.

B: And the gather's faster than I'd have guessed. Random is random, isn't it?

A: Here's the interesting part. The gather is four point two. The shuffled Python list is forty-five point seven. Both random, and the gather wins by ten times. Because in the gather, every address is computed from an index array that's already sitting there. There's no interpreter between loads. So the core can keep lots of misses in flight at once. That's memory-level parallelism working at full strength. Compare that with the pointer chase from the latency episode, where each address depended on the previous load. You can't start load two until load one comes back. That cost about a hundred nanoseconds per step.

A: There's a chart of nine of these on a log scale, where every gridline is ten times the last. And the bars split into two kinds. Solid ones, where a C loop runs with no bytecode per element, and light ones, where the interpreter runs once per element. The light bars are all bunched up near ten nanoseconds and above. And the contiguous NumPy bar at the bottom is this tiny stub. Your numbers will be different. The order shouldn't be. And the way to read it is one gap at a time.

A: List loop to Python's sum on the list, ten point seven to one point nine. You removed the interpreter and kept the layout. About five point six times. That's the interpreter bill. Then Python's sum on the list to contiguous NumPy, one point nine to point one two. You removed the pointers and the objects, so each number is eight bytes instead of about forty, and the C loop can use several accumulators and S I M D. About sixteen times. That's the layout bill. Then the shuffled ones. The list loop goes ten point seven to forty-five point seven, Python's sum goes one point nine to eleven point two. Same code, scattered objects. The memory bill, with nothing else changed.

A: Then within NumPy. Contiguous, point one two. A stride of sixty-four bytes, point seven oh. A stride of a hundred and twenty-eight, two point four. Same count of numbers, more lines per number. At the sixty-four-byte stride on the Mac, two numbers still share each line. At a hundred and twenty-eight, every number costs its own line. The prefetcher still predicts the stride, so this is bandwidth wasted, not latency. And the random gather at four point two is about one line per number, no prefetching at all, saved from disaster only by memory-level parallelism. It also has to build an eighty-megabyte temporary array for the gathered numbers, so that's part of the cost too.

<!-- section: The Idea: The same story on a GPU -->

A: Now, everything we just said gets louder on a GPU. Because a GPU is a machine designed to be fed by bandwidth. An NVIDIA GPU runs threads in groups of thirty-two called a warp. A warp is thirty-two threads that execute the same instruction at the same moment, each on its own data. It's the basic unit the GPU schedules. So when a warp does a load, all thirty-two threads issue their addresses at once, and the memory system looks at all thirty-two addresses together. And it moves data in thirty-two-byte chunks called sectors. Four sectors make one hundred-and-twenty-eight-byte line. If those thirty-two addresses are neighbours, the warp's whole request gets served with a handful of sectors. That's called coalesced access.

A: Picture it as two halves. Top half: thread zero reads element zero, thread one reads element one, all the way to thread thirty-one. Thirty-two consecutive floats, four bytes each. The warp needs a hundred and twenty-eight bytes, and the hardware moves four sectors. A hundred and twenty-eight bytes. Every byte used. Bottom half: each thread reads down a column. Thread k reads element k times the row width. So every thread lands in a different sector.

B: [working it out] So that's thirty-two sectors, thirty-two bytes each... about a kilobyte moved, to use a hundred and twenty-eight bytes. Eight times.

A: Eight times the traffic for the same work. Four bytes used out of every thirty-two. And GPU memory is fast, the Spark's spec sheet says about two hundred seventy-three gigabytes a second. But inference kernels are already memory-bound. They're already sitting at that memory ceiling. So a kernel that isn't coalesced and moves eight times the bytes runs close to eight times slower.

A: That's why so much GPU kernel engineering is really about layout. You tile the matrices into blocks that warps can read row-wise. You stage those tiles in the GPU's shared memory, which is a small scratchpad on each multiprocessor, tens to a couple hundred kilobytes, that the threads manage by hand. And it's not the same thing as shared memory between processes in the operating system, same name, different thing. You load a tile once, coalesced, and then reuse it many, many times before going back out to main memory. FlashAttention, at its heart, is temporal locality done by hand.

A: And where you actually bump into this in PyTorch is dot contiguous. A PyTorch tensor is a pointer, a shape and strides. Exactly like a NumPy array. So transposing it, or swapping two dimensions, or permuting, or a lot of slices, those just swap the strides. They're free. And the result is non-contiguous. And then one of three things happens. One, an op refuses it. View needs strides it can reinterpret without moving any data, and on a transpose it just fails, with an error saying the view size isn't compatible with the tensor's size and stride, and telling you to use reshape. Reshape quietly copies when it has to.

B: [skeptical] Okay, but for something simple. Adding two tensors where one's transposed. That's free, right? It's the same numbers.

A: [dry] That's case two. The op handles it... slowly. Elementwise ops on a single tensor keep its layout and run at full speed. Mixing layouts is a different story. On the Mac's CPU, adding two four thousand ninety-six by four thousand ninety-six float tensors took one point one milliseconds. Transpose one of them first and add: eleven point seven. Ten times. Because to line up element by element, one of the two inputs has to be read down columns.

B: So "free" was only the transpose. Not anything you do after.

A: Yeah. And case three, an op copies it for you. A lot of kernels, custom CUDA ops, some attention implementations, anything that wants a raw pointer, call contiguous internally. That allocates a new tensor and does the transposing copy, often without you ever noticing. That's the copy-of-a-transpose cost from NumPy, on every single call. So when you see attention code that transposes the queries and then immediately calls dot contiguous on them, that's someone paying the copy once, on purpose, so the next big kernel gets coalesced reads. And calling contiguous on something that already is contiguous just hands it back unchanged, for free. What it's not for is sprinkling it everywhere just in case, on a tensor you only read once. Then you've just paid for a copy.

A: And the CNNs you've trained have a version of this too. There's a memory format called channels last. Normally images are stored batch, channels, height, width. Channels last stores batch, height, width, channels. So all the channels of one pixel sit right next to each other, which is what convolution kernels on modern GPUs want to read together.

<!-- section: Build It -->

A: So here's what you'd actually build. It's about an evening, plus half an hour on the Spark. Three programs: the five-ways sum in Python, a row and column walk in C, and the S I M D sum in C. Then you redo the C ones on the Spark with hardware counters. First thing, just set up a virtual environment with NumPy, and ask each machine its cache line size. The Mac should say a hundred and twenty-eight. On the Spark, there's a file under the CPU's cache info in the system directory, the coherency line size, and it should say sixty-four. There's another command that works on x eighty-six Linux but can just print zero on ARM, so trust the file.

A: Then the five-ways script. One little benchmark harness that runs a function a few times and prints the best time, the nanoseconds per element, and the result. Ten million random doubles in a NumPy array, which is eighty megabytes. A list made from it, so its objects get created in order. An array module version, packed doubles, no objects. A random permutation. And then you bench all of it: the Python loop over the list, the shuffled list, and the array module. Python's sum on the list and the shuffled list. NumPy's sum on the contiguous array, on the two strided views, and on the gather.

B: How do you even make the shuffled list? Just shuffle it?

A: [leaning in] That's the subtle one. You want the same float objects as the original list, so they still sit in memory in the order they were created. You just want to visit them in random order. So you build a new list of references by picking from the original list using the permutation. And the trap is, don't call float on anything. That makes new objects, in new places, and then they're in order again and you've measured nothing.

A: For the strided views, you make an array eight times longer than you need and take every eighth element. Check its strides say sixty-four. And print every sum. They should all be about five million, since a random number between zero and one averages out to a half. If one comes out wildly different, you summed the wrong thing. And write your predicted ranking down before the first run.

A: Then the row and column walk in C. Fill a big square matrix, write one function that sums it row by row and one that sums it column by column. Run each twice, because the first pass is also when the operating system actually hands you the memory pages, and time the second. Print the size, the megabytes, nanoseconds per element for both, and the ratio. Run it at two fifty-six, ten twenty-four, four thousand ninety-six and eight thousand one ninety-two, with and without fast math. And before you run it, guess at which size the gap shows up, and why there. Use the cache sizes the machine told you.

A: Then the S I M D one. Two functions. One accumulator, and four accumulators that you combine at the end. Time them on four thousand ninety-six doubles, which is thirty-two kilobytes and fits in L one, and on a hundred million, which is eight hundred megabytes. And you build it three ways. Plain, where the compiler's not allowed to reorder anything. Four accumulators with vectorizing turned off, so you get only plain scalar instructions. And the one accumulator with fast math, where the compiler's allowed to vectorize. The flag names differ a bit between compilers, so check yours.

A: And there's a trap. You're calling a function with no side effects, on an array that never changes, a million times. The compiler's allowed to notice that and just... call it once. So you put a compiler barrier before each call. It's a one-line, empty assembly statement that tells the compiler "this array's memory might have changed", so it has to rerun the sum for real. And if you're curious, you can dump the assembly and look for the vector adds. On ARM they have "point two d" in them, meaning two doubles. What you want to see in L one is three clearly different speeds, and to be able to say which one is the dependency chain, which one is the parallel adders, and which one is S I M D.

B: [curious] And the Spark part is where you actually count the misses?

A: Yeah. macOS doesn't have perf. Linux does. And on the Spark you can ask the CPU's own counters how many lines it fetched. You run your row-column program under perf stat with the cache events. The catch is the generic event names get mapped to different hardware counters on different chips, and on ARM some of them just say "not supported". Then you look in perf's list for the ARM names. Typically there's one that counts L one accesses, one that counts L one refills, meaning lines fetched into L one, and one for last-level cache misses on reads. Honestly, which ones that particular chip exposes, you'll have to check. Perf's list is the truth. And if it complains about permissions, there's a kernel setting called perf event paranoid you lower to one.

A: Give the program a mode switch so it runs only one of the two orders, and divide misses by elements. Row order should be about one eighth, one sixty-four-byte line per eight doubles. Or far less, if the lines the prefetcher brought in count as hits. Column order should be close to one. An agent can explain what the event names mean. The program's yours.

A: And the last one's on the Spark's GPU, with PyTorch. Two eight thousand one ninety-two square float tensors. Time adding them, adding with one transposed, making the transpose contiguous, and making it contiguous then adding. Print whether the transpose is contiguous and what its strides are. Show that view fails on it and reshape doesn't, and check whether reshape shared the memory by comparing the data pointers.

B: Anything weird about timing on a GPU?

A: One big thing. Kernel launches are asynchronous. When your Python line returns, the GPU might not have even started. So if you just read the clock, you've timed the launch, not the work. You warm up first, you call synchronize before reading the clock, on both ends, and you repeat. Then work out gigabytes a second for the plain add, which reads two tensors and writes one, and compare it to the two seventy-three on the spec sheet. Have an agent review the timing code, especially for missing syncs. And you're done when you can explain why the transposed add is slower, without using the word "transposed" as the reason.

<!-- section: Measure -->

A: So what should the numbers look like? Most of them you've already heard. A few things to look for, though. First, the two bills don't simply add. Loop minus Python's sum is eight point eight nanoseconds for the in-order list. For the shuffled list, it's thirty-four point five.

B: [working it out] Wait, I'd assumed the interpreter was just a fixed tax. Like, ten nanoseconds per element, no matter what. Shouldn't those match?

A: If it were a fixed tax, they would match. They don't, because layout and code interact. In the tight C loop inside Python's sum, a lot of object loads can be in flight at the same time, so the misses overlap. In the interpreter loop, each load is surrounded by so much other work that fewer of them overlap, and each miss is more exposed. So "five times interpreter, sixteen times layout" is a good first story. This is the truer second one.

A: Second, the row-column gap only appears once the matrix stops fitting in cache. At two fifty-six, which is half a megabyte, it was one point two times. At ten twenty-four, eight megabytes, one point six. At four thousand ninety-six, a hundred thirty-four megabytes, five point seven. So compare those sizes against your L two, and against Apple's system-level cache, or the Spark's L three. And on the Spark, with sixty-four-byte lines, the column walk wastes seven eighths of each line instead of fifteen sixteenths. So if anything, expect a slightly smaller ratio than the Mac's at the same size. But a slower row walk, too. Measure it.

B: And fast math, I'd guess, helps both orders. It speeds up the adds, and both of them are adding.

A: [firm] It only speeds up the row walk. Because only the row walk was waiting on arithmetic. The column walk was waiting on memory the whole time. And no amount of S I M D helps a loop that's waiting on RAM. So fast math actually widens the gap.

A: Third, the S I M D sum hits the memory roof. In L one, the vectorized sum is six and a half times faster than one accumulator. From RAM it slows to about seventy-one gigabytes a second on the Mac, which is about what one core can practically pull. And the single accumulator doesn't care where the data lives. Point five two, point five four. Slow code never sees the memory wall. Fast code always does.

A: And last, a sorted gather. Same indexing trick, but with the indices sorted. Point five four nanoseconds, versus four point two for random. About eight times faster, same instructions. Because sorted indices walk memory forward, and the prefetcher can follow. Which, you know, if you're gathering scores by document position for your ranker, the order of those positions matters more than you'd think.

<!-- section: Break It -->

A: Then you break it, on purpose. First one. Make the matrix a power of two. Run the row-column program at four thousand, four thousand ninety-six, and four thousand one hundred. On the Mac the column walk took two point oh five, three point two seven, and one point nine six nanoseconds per element.

B: [surprised] So the nice round number is the slow one?

A: About sixty percent worse than its neighbours. Here's why. At four thousand ninety-six, each column step is exactly thirty-two kilobytes. And a cache doesn't let any line go anywhere. It picks which few slots a line's allowed to sit in from a few bits of its address. Addresses exactly thirty-two kilobytes apart share those bits. So all of them compete for the same handful of slots and keep evicting each other, while the rest of the cache sits there empty. Those are called conflict misses. Misses that happen not because the cache is full, but because too many lines map to the same small group of slots, which is called a set. It's the classic power-of-two problem. The fix is padding. Allocate each row as four thousand ninety-six plus eight, and just ignore the extra. That's why some libraries pad their leading dimension, and why F F T and matrix benchmarks at four thousand ninety-six sometimes look weirdly bad.

A: Second. Let the compiler cheat. Take out the barrier in the S I M D program. I got fifty-nine thousand, nine hundred twenty-five gigabytes a second for the in-cache sum.

B: [laughs] That's not a real number.

A: [wry] It's not. The compiler saw a function with no side effects called on unchanged data, and ran it once. Then delete the final print of the sum, and the whole thing may just vanish, because nothing uses the result. Every microbenchmark has to convince the compiler the work matters.

A: Third. Shrink the problem until NumPy loses. Time Python's sum on a list against NumPy's sum, at ten, a hundred, and a thousand elements. At ten elements: fifty-nine nanoseconds for Python, two hundred thirty-seven for NumPy.

B: So NumPy isn't always the answer.

A: Not for tiny stuff. About even at a hundred, NumPy five times ahead at a thousand. Every NumPy call pays a fixed few hundred nanoseconds before it touches a single number. Parsing arguments, figuring out the data type, allocating the result. And then try converting the list to a NumPy array and summing that. It loses at every size. Because converting a list into an array is itself a Python-speed walk over all the objects. So NumPy pays off when your data lives in arrays already, and you do lots of operations per conversion.

A: Fourth. Defeat the prefetcher with a stride it can't follow. Sum every kth element, for k going one, two, four, eight, sixteen, thirty-two, sixty-four, then five hundred twelve, and plot nanoseconds per element. You should see it rise until every element is its own line. That's sixteen on the Mac, eight on the Spark. Then mostly flatten, because one line per element is one line per element. But for big k, every step also crosses a page. The prefetcher on a lot of chips won't cross pages. And the address translations start missing in the T L B, the translation lookaside buffer. That's a small cache of recent translations from the addresses your program uses to the real physical ones. Big strides touch a new page per element, so they miss there too. So look for a second rise.

<!-- section: Explain It Back -->

A: Here's where this shows up in practice. Say a teammate's matrix code is six times slower than yours, doing the same math. First guess is loop order against layout. They're walking a row-major array by columns, or a column-major one by rows, so every step lands on a new line. You check the strides, or the contiguous flags. You swap the loop order, or make the data contiguous in the order you actually read it, and measure. And to confirm it's really the cache and not something else, count misses with perf. L one refills per element going from about an eighth to about one. Also check the size. If the matrix fits in cache, the gap mostly disappears. And if the width's a power of two, suspect conflict misses and try padding.

A: And the scaling version. Say your ranker's feature table is ten million rows by sixty-four features, each a thirty-two-bit float, and a job needs to sum just one feature column. Row-major storage. How many bytes do you move?

B: [working it out] Each row's sixty-four features at four bytes, so two hundred fifty-six bytes. I want four of them. And each row's its own line or more, so... I pull a whole line for every value. Sixty-four bytes on the Spark, times ten million...

A: Six hundred forty megabytes moved, for forty megabytes of numbers you actually wanted. Sixteen times. If it's stored column-major instead, or in a column store like Parquet or Arrow, that column is one dense forty-megabyte run, read at full bandwidth. At one core's fifty to seventy gigabytes a second, that's roughly one millisecond for the dense column versus about ten for the row-major scan. And the gap stays sixteen times however big the table gets, because it's a ratio of bytes moved. On a GPU it's the coalescing problem again. A warp reading one column of row-major rows touches thirty-two separate sectors, eight times the traffic. So you'd store or transpose that column first. And that's the whole reason analytics databases are column stores, and why feature columns get pulled out into their own arrays before any heavy math.

<!-- section: Connections -->

A: And this sits between two other ideas. The interpreter bill, the ten nanoseconds per element, gets opened up instruction by instruction in the lesson on why Python's slow. The memory bill goes to the tokens-per-second lesson. Once your code uses every byte of every line, the only thing left is how many bytes per second memory can deliver. And on the Spark, that number is what sets your tokens per second. Those page-sized steps from the last break are the visible edge of virtual memory, which is its own story. And if you want to go deeper, Ulrich Drepper's "What Every Programmer Should Know About Memory" is the long, definitive version, and Igor Ostrovsky's "Gallery of Processor Cache Effects" is seven tiny experiments you can reproduce in an afternoon.

<!-- section: Close -->

B: [thinking out loud] Okay, let me try to say it back. NumPy's ninety times faster for two reasons. The interpreter part, all the paperwork per element, is maybe five or ten times of it. And the rest is that NumPy's numbers are packed tight, so the cache never has to go far. Every line it pulls in is full of numbers it needs.

A: [gently] That's most of it. One piece is bigger than "the cache never goes far", though. Dense, in-order layout does three things, not one. Every byte of every line gets used. The prefetcher can see the pattern and stream lines in ahead of you, so you're paying bandwidth, not a hundred-nanosecond trip each time. And the numbers sit side by side, so the CPU can add several at once, in wide registers, across several independent chains. A Python list can't get that last one even in C, and a shuffled one loses the first two. So it's not "C is fast". It's that the bytes are where the hardware is betting they'll be.
