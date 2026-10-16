<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture the cross-encoder pipeline. There's one step that computes a little feature for every query-document pair, and it's basically a sum. You take ten million floats, square each one, add them all up. And you write it the obvious way. A for loop, a running total, plus-equals x times x. Three lines. It takes about a hundred milliseconds. Which, fine. Then a teammate looks at it and writes the NumPy version, one line, the array matrix-multiplied with itself. Same numbers, same machine, same answer to six digits. And it takes about six tenths of a millisecond.

B: Huh. So that's, what...

A: A hundred and seventy times faster. For the same math.

B: [a bit unsure] Okay, but I kind of know this one, right? NumPy is written in C. C is compiled, Python isn't. So the C version wins. That's the whole story.

A: That's the story everybody tells. And it's a pretty small part of the real story. We'll actually put numbers on it later, and it turns out "the interpreter" only explains the first factor of three out of that hundred and seventy. The rest is somewhere else. But hold that thought. Here's the other scene. The model itself is in PyTorch, and everyone knows PyTorch is fast because underneath it's C plus plus and CUDA. So you serve it on the Spark at batch size one, one request at a time, and you run nvidia S M I, the little tool that tells you how busy the GPU is. And it says thirty percent.

B: [skeptical] Thirty percent? But the model's on the GPU. Python's not doing the math there.

A: Right, it's not doing the math. And still. A GPU that can do trillions of operations a second is idle most of the time. Waiting for something. And what it's waiting for is... Python, again.

B: So both of those are the same problem?

A: Same villain, same fix. And the fix isn't "rewrite it in Rust". It's knowing, really precisely, what the Python interpreter does for each line you write, where Python stops and compiled code takes over, and what it costs every time you cross that line. Once you can see that boundary, you know which three percent of your code is actually worth touching. And you leave the other ninety-seven alone.

<!-- section: Origin -->

A: And this goes back to the very first high-level languages, because there were two opposite answers right from the start. Nineteen fifty-seven. John Backus's team at I B M ships FORTRAN. And FORTRAN was a compiler. It took your formulas and turned them into machine code ahead of time, before the program ever ran. And the whole selling point was that the result ran nearly as fast as assembly written by hand. Scientists wouldn't have touched it otherwise. They were not going to give up speed for convenience.
Then, basically a year later, the opposite design. LISP. The first implementation, around nineteen fifty-eight to sixty, happened when Steve Russell hand-coded John McCarthy's eval function. And that made LISP an interpreter. A program that reads your program and does what it says, one piece at a time. Slower. But you could change code while it was running, and any value could be any type at any moment.

B: So fast and rigid, or slow and flexible.

A: For decades, yeah, those were the two choices. And then in nineteen eighty-four, Peter Deutsch and Allan Schiffman made Smalltalk-eighty fast with two tricks. One, compile code to machine code lazily, only once it's actually run. And two, at each place in the code where you call something, remember what type showed up last time. So the next time, the lookup is just one comparison. "Is it the same type as last time? Yes? Great, I already know what to do." That's called an inline cache.

B: [working it out] So it's a guess. It's betting the next one looks like the last one.

A: It's a guess, with a check. And the guess is almost always right, because real code is boring. The Self project in the late eighties pushed that further, and people from Self went on to build Java's HotSpot compiler. And V eight, in two thousand eight, brought the same family of ideas to JavaScript. So that's why JavaScript in your browser is fast.
And Python? Guido van Rossum started it in nineteen eighty-nine, and he took the simple path. A portable interpreter, written in C, easy to extend with more C. And honestly that's why Python ran everywhere and grew this enormous library ecosystem. It's also why, for thirty years, a Python loop has been thirty to a hundred times slower than the same loop in C. It's only since twenty twenty-two that the main Python, CPython, has started taking those Smalltalk tricks seriously.

<!-- section: The Idea: Three ways to run a program -->

A: So let's get the three options straight, because the rest of the episode hangs on them. A CPU only understands machine code. That's raw instructions, just binary numbers that mean things like "add these two registers", "load from this address", "jump over there". And it's different for different chips. ARM, which is your Mac and the Spark, versus x eighty-six, which is most servers. Your program is text. Something has to bridge that gap.
The first way is: translate the whole book before anyone reads it. That's a compiler. It reads your entire C file, it works out that a and b are sixty-four-bit integers, and it writes out machine code that adds two registers. And then the compiler's gone. When the program runs, there's nothing between your code and the CPU. And the compiler can take its time thinking, because you only pay for that once. It's a translator handing you the finished French edition.
The second way is: translate as you go. That's an interpreter. Think of a live interpreter at a meeting. They hear a sentence, work out what it means, say it, move on to the next sentence. They never write anything down. So if the same sentence gets said a thousand times, it gets worked out a thousand times. And here's the part people miss. The CPU never runs your Python. Not one line of it. The CPU runs the interpreter, which is a big C program. And the interpreter reads your code the way any program reads data.

B: [surprised] Wait. So my code is... data. To the thing that's actually running.

A: Your code is data. Yeah. It's the input file to a C program.
And the third way: interpret, notice what keeps repeating, and compile just that part. That's a JIT. Just-in-time compiler. It starts out as an interpreter, but it keeps notes. And after the hundredth time it hears the same sentence, it writes down a translation and reads from that from then on. And it can sometimes even beat an ahead-of-time compiler, because it's seen the real data. It knows what types actually showed up. So it compiles machine code specialised for those types, with little checks that bail out if a guess turns out to be wrong. PyPy works that way, Java's HotSpot, JavaScript's V eight.
If you drew it, it's three lines across a whiteboard. Top line, C: your source file goes into the compiler once, before running, comes out as machine code, goes straight to the CPU. Middle line, Python: your source file goes into a compile step, comes out as something called bytecode, and that part happens once. But then the bytecode goes into the eval loop, which is the C program, and that box is labelled "every time it runs". Then the CPU. And the bottom line is the JIT: it's the middle line, but with a side branch. "Is this a hot path?" If yes, it gets turned into machine code and jumps straight to the CPU, skipping the eval loop.

B: Wait, back up. The middle one has a compile step? I thought the whole point of Python is that it's not compiled.

A: It is compiled! Just not to machine code. When you run a file, Python first compiles it to bytecode. And bytecode is a compact list of really simple instructions for an imaginary machine. The Python virtual machine. No real CPU can run it. The interpreter reads it. And it caches that bytecode, in the pycache folder, those dot P Y C files you've seen, so imports are quick the next time. But that compiler is deliberately dumb. It has no idea what types anything will be. So it can't do the one thing that makes compiled code fast, which is decide ahead of time what plus means.
So if someone asks you which of the three CPython is, the honest answer is, well, a bit of all three. Mostly the second.

<!-- section: The Idea: Reading bytecode -->

A: And you can look at the bytecode yourself. There's a module called D I S, dis, short for disassemble, and it prints a function's bytecode. Take the smallest possible function. Add, takes a and b, returns a plus b. On Python three point fourteen, on the Mac, it's four instructions. The first is called resume, and you can ignore it, it's just bookkeeping when a function starts. The second has this ridiculously long name, it's load fast borrow, twice, glued together. That's really two instructions fused into one. "Push the local variable a, push the local variable b." Three fourteen fuses them because that pair shows up so often. Then binary op, plus. Then return value. On three eleven, it's easier to read: load fast a, load fast b, binary op plus, return value. Same meaning.

B: And "push" means... push onto what?

A: Onto a stack. The Python virtual machine is what's called a stack machine. Instead of saying "add register three to register five", its instructions take their inputs off the top of a little stack, and put their result back on top. Which is really simple to compile to, and really easy to interpret. So every running function has its own little stack of values. Load fast pushes a value on. Binary op plus pops the top two off, adds them, and pushes the answer. Return value pops the top one and hands it back to whoever called the function.

B: Stack, so, first in, first out.

A: [gently] Last in, first out. That's the thing that makes it a stack. The last thing you pushed is the first thing you get back. Like a pile of plates. And that's actually why it works for arithmetic. You push a, you push b, and the plus grabs the two most recent things, which are exactly the two it needs. And this value stack is a separate thing from the C stack, the one that holds a function's local variables when C code runs. Same last-in-first-out idea, different stack.
Okay. Now look at that bytecode again and notice what's not in it. Nothing in there says "integer". Binary op plus is the exact same instruction for two plus three, for gluing two strings together, for joining two lists, for adding two NumPy arrays. So whatever plus means, it has to be worked out at the moment it runs. Every time.

<!-- section: The Idea: The eval loop -->

A: So who works it out? The heart of the interpreter is one giant C function. Its actual name is Py Eval, Eval Frame Default, and it lives in a file called C eval dot C. Everybody just calls it the eval loop. And stripped down to its bones, it's a loop that runs forever. Read the next instruction from the bytecode. Jump to the chunk of C code that handles that instruction. Run it. Go back to the top. Load fast? Push the local onto the stack, back to the top. Binary op? Pop the two values, call the general-purpose "add two numbers" function, push the result, back to the top. Return value? Hand back the top of the stack. And there's a few hundred more of those cases.
The real one's fancier. It uses a jump table instead of a big switch statement, and since three twelve it's actually generated from a description file. But the shape is exactly that. And every line of Python you've ever run went through that loop.
Each trip around it has a name, a dispatch. Fetch the next instruction, jump to its code. And it costs something. A read from memory, a jump that the CPU has to guess where it's going, a few instructions of bookkeeping. For a line that does real work, like reading a file, that's nothing. For plus-equals x times x, that dispatch is most of the cost.

<!-- section: The Idea: Why every value is a box -->

A: And that's half the speed story. The other half is what the values look like. You might remember this from how memory works: in CPython, every single value is an object on the heap. And just to be clear about the word, heap here doesn't mean the tree data structure. It's the big pool of memory that the program grabs chunks from while it runs. Anything you create lives in some chunk out there. And every one of those objects starts with a header.
So put it side by side with C. In C, you write long a equals two. That's eight bytes. And usually it's sitting right inside a CPU register, which is a tiny, very fast storage slot inside the core itself. Arithmetic actually happens on registers. An ARM sixty-four core has thirty-one general-purpose ones, each sixty-four bits. And there's no type stored anywhere. The compiler knew it was a long, it picked the right instructions, and then it forgot.
In Python, a equals two makes a a name for a pointer to an int object. And that object holds a reference count, which is a counter of how many things currently point at it. When that drops to zero, the object gets freed. Then a pointer to its type. Then a size. And then, finally, the actual number.

B: So how big is that box, actually?

A: Ask Python. sys dot get size of, on the number one, says twenty-eight bytes. For a number that needs eight. So it's three and a half times the space, before you've done anything with it. Wrapping a raw value in an object like that is called boxing. And taking the raw value back out is unboxing.
Picture it drawn out. On the left, C: one little box, register zero equals two, eight bytes, nothing else. In the middle, Python: the name a, with an arrow to a tall box stacked in four rows. Refcount, type pointer, size, and at the bottom, value two. Twenty-eight bytes, on the heap. And from the type pointer, another arrow, to a box labelled int type. And that one holds the type's name, and a little table of functions. The add slot points to the function that knows how to add ints. The multiply slot points to the function that multiplies them. So to add two ints, you literally follow arrows to find out how.
And then below that, a list of floats. The list is a row of pointers. And each pointer has an arrow going off to its own float box, twenty-four bytes each, scattered wherever they landed on the heap. Next to that, a NumPy array of the same floats: just the bare numbers, eight bytes each, packed side by side, and the type written down once for the whole array.

B: [skeptical] I mean, that sounds like a bad trade. Three and a half times the memory, and you have to go look up how to add.

A: It's the trade that buys you everything you like about Python. A variable can hold an int now and a string later, because the type travels with the value, not with the variable. That's dynamic typing. Types belong to values and get checked while the program runs. The opposite, static typing, is C or Rust, where each variable's type gets fixed at compile time. And because the box can grow, ints never overflow. Two to the power of two hundred just works. In C, that'd wrap around silently into garbage. And every value can be put in a list, passed anywhere, inspected, garbage collected, all the same way. The price is that every plus has to open both boxes, read the labels, and decide what to do.

<!-- section: The Idea: Following one a plus b -->

A: So let's actually watch that price get paid, one move at a time. Before we do, a guess. When Python runs a plus b, on two small ints, how many of the steps are the actual addition, and how many are working out what addition means?

B: [working it out] Hmm. Well, there's the add. And then it has to check the types, I guess. So... half and half? Maybe one add and two or three things around it?

A: One add, and about a dozen things around it. Let's count, the way Python three ten did it. Say a is two and b is three. Dispatch: read the first instruction, load fast, jump to its code. It copies the pointer to a onto the value stack, and bumps a's reference count. And notice, no number has been looked at yet. It's just shuffling pointers. Dispatch again, load fast b, push the pointer to b, bump its count. Dispatch a third time, the binary add. Pop the two pointers. And this instruction runs for every plus in every program. It knows nothing yet.
Now it follows the pointer to a, out on the heap, and reads its type field. That's a type check. Reads b's type. Second check. And there's a subtle rule there, if b's type were a subclass of a's type, Python would have to ask b first. Same type, so a goes first. Then it follows the type pointer over to the int type object, and looks up the add slot. That slot holds a pointer to a C function called long add. So it calls long add, through that pointer. And long add checks again that both really are ints, because it could be handed anything. Third check. Then: are they both small ints that fit in one machine word? Fourth check. Yes. So it reads the raw two and the raw three out of the two boxes.
And then the actual addition. Two plus three, in a CPU register. One instruction.

B: That's the one.

A: That's the one. Everything before it was finding out what to do. And it's not done. Now it has to box the answer. Wrap five in a brand new int object on the heap, header and all. Small ints from minus five to two fifty-six are actually cached and reused, but in general, a new int means an allocation. Then drop the references to a and b, so decrement the counts and check if either hit zero. Push the pointer to the result. Dispatch the next instruction.
So count it up. Three dispatches, four type checks, one call through a function pointer, one heap allocation, refcount updates on three objects. And one real add. And in C? The compiler put a in one register and b in another. It's one add instruction, about one clock cycle. Often the compiler does four to sixteen of those at once. That's it. No heap, no type, no refcount.
That ratio, a dozen steps to one, is where the thirty to a hundred times comes from. Not "Python is slow" in some vague way. That specific ratio.

B: And that's real? That's literally what the code does?

A: That's literally the code. The binary add instruction called a function called Py Number Add. That read both objects' types, found the add slot in the int type's table of number methods, and called long add, which checked again, unboxed, added, and called another function to box the answer. And that add slot is what's called a function pointer, a variable that holds the address of a function, so the code can say "call whatever function is stored here". Which is flexible. But the CPU can't see through it to optimise anything, and it has to guess where the jump goes.
Each of those steps is cheap. A few nanoseconds. But a few nanoseconds times a dozen, for a single plus, is how you end up at about ten nanoseconds per loop iteration. When the CPU could do the add in about two tenths of a nanosecond. That's fifty times.
And there's a second cost that's easy to miss. Those boxes live wherever the memory allocator happened to put them. A list of ten million floats is ten million pointers to ten million separate boxes. And following each pointer is a trip to memory. If the box happens to be right next to the last one, it's probably already in the cache, the CPU's small, fast copy of recently used memory, and it's quick. If it's somewhere else, it's a miss, and the CPU waits on main memory. Later on we'll shuffle the list so the boxes are scattered, and the same loop gets five times slower. Same values. Just a different order.

<!-- section: The Idea: The specializing interpreter -->

A: So, twenty twenty-two. A project called Faster CPython. Mark Shannon, with Guido van Rossum and a small team that Microsoft funded. And they shipped something called pep six fifty-nine, the specialising adaptive interpreter. It went into Python three eleven. And the idea is old. It's that Smalltalk inline cache, from nineteen eighty-four. But it works really well, and it goes like this.
First: most code is boringly consistent. The plus in your loop sees ints every single time. It's never going to see a string. Second: so after an instruction has run a few times, the interpreter rewrites it, in place, while the program's running, into a specialised version. Binary op becomes binary op add int. Or binary op add float, depending on what it saw. That rewriting has a name, quickening. And third: the specialised instruction starts with a guard. A really cheap check that the assumption still holds. "Are both of these exactly ints?" That's two pointer comparisons. Is a's type pointer the int type, is b's. If yes, it does the add right there, inline, in its own code. No slot lookup, no call through a pointer. If no, it falls back to the slow general path. And if the misses keep happening, it respecialises for whatever it's seeing now, or gives up and stays generic.

B: So that's a JIT, then. A little one.

A: Not quite, and the difference matters. No machine code gets written. It's swapping one bytecode instruction for a more specific bytecode instruction. The eval loop still runs every one of them. It's just running cheaper ones.
And you can actually watch it happen. The same dis function takes a flag, adaptive equals true, and it shows you the current, specialised bytecode. On the Mac, after calling add with one and two a thousand times, the resume turns into resume check, and the binary op turns into binary op add int. Then call it with one point oh and two point oh a thousand times, and it flips to add float. And it's not just plus. Attribute loads get specialised, global lookups, function calls, for loops over lists. There's one called for iter list.
So what did that buy? Python three eleven's release notes claimed about one point two five times faster than three ten, on average, on the standard benchmark suite. So about a quarter faster. And every release since then has added more.
But here's what specialisation does not remove. The dispatch, once per instruction. The boxing of every result. The reference counting. It makes each step cheaper. It doesn't remove steps. You can see that in the numbers. Same script, same Mac, an M four Pro, best of five runs, on each version. Recursive Fibonacci of thirty, which is basically nothing but function calls, went from ninety-three milliseconds on three ten to thirty-seven on three fourteen. Two and a half times faster in four years. That's huge. And the simple float loop went from eighteen nanoseconds per iteration to around twelve. About one and a half times. It actually bottomed out at about twelve on three thirteen and ticked back up a hair on three fourteen. So, real progress. And still nowhere near C.

B: So the function calls got way better but the arithmetic barely moved.

A: Because the arithmetic's cost was mostly the parts it didn't touch. The dispatch and the boxes.
And when the guess is wrong, you can see that too. Say this plus has been specialised for ints, and now one time b comes in as three point oh, a float. Dispatch the add-int instruction. Guard: a's an int, b is not. Guard fails. So it jumps over to the generic code, the whole three-ten path. And in that path, int's add function looks at a float and says, "not mine, not implemented". So Python tries float's add instead, which converts the two into two point oh, does the add, and boxes a float. And a miss counter ticks down. If it keeps missing, the instruction gets respecialised for what it's seeing now, or left generic. That's the price of guessing.

<!-- section: The Idea: The JIT in 3.13 and 3.14 -->

A: So the obvious next step is an actual JIT. And CPython has one now. It's described in pep seven forty-four, by Brandt Bucher. Roughly, when a loop gets hot, its specialised bytecode gets broken into even smaller internal steps, called micro-ops. A simple optimiser goes through those and removes guards that are redundant, like checking the same thing twice in a row. And then it turns the result into machine code, using a trick called copy-and-patch.

B: Which is what?

A: It's a fast way to make machine code without running a compiler at run time. When CPython itself gets built, it compiles a little machine-code template for each micro-op, ahead of time. Then at run time, it just copies those templates end to end, and patches in the real addresses and constants. Like filling in blanks on a form. No compiler runs while your program does.
Now, this is moving fast and it's really easy to overclaim, so let me be careful. It's off by default in three thirteen and three fourteen. Python has to be built with it included, and even builds that include it still need an environment variable, Python JIT equals one, to switch it on. As far as I know, the official python dot org installers for three fourteen, for Mac and Windows, include it, switched off. Homebrew's three fourteen on the Mac does not include it at all. And the three fourteen you get from U V does. The Python docs themselves call it experimental, and describe the performance as anywhere from somewhat slower to modestly faster, depending on the program.
And measured on the Mac, with U V's three fourteen and the JIT on: Fibonacci of thirty was thirty-seven milliseconds with it or without it. And the float loop got slower. From about twelve and a half nanoseconds per iteration to about fifteen and a half.

B: [surprised] Slower? The JIT made it slower?

A: On that loop, yeah. And so, measure your own programs before believing any JIT number. Including that one. As for why it's so small: the JIT still keeps every value boxed, and it still does all the reference counting. Mainly what it removes is the dispatch. Projects like PyPy get big wins, often several times faster on pure-Python loops, because they also get rid of the boxes and inline aggressively. But PyPy can't run every C extension at full speed, and that's why basically all ML code stays on CPython. So if you want a pure-Python loop compiled today, the practical tools are Numba, which compiles a typed subset of Python using LLVM, or Cython, or just writing the loop in C or Rust.

<!-- section: The Idea: Python orchestrates, C computes -->

A: Okay. So that's the interpreter getting faster, slowly. Now here's the trick the whole scientific Python world actually runs on. Don't make the interpreter faster. Make it do less. Call it once per array, not once per number.
A C extension is a module written in C, or C plus plus, or Rust, compiled into a shared library that Python imports like any normal module. It talks to the interpreter through what's called the C A P I, the set of functions CPython exposes to C code. And its code runs as machine code, with no eval loop in between. NumPy's one. PyTorch is one. Even J S O N and the regular expression module in the standard library are partly C.
So when you write the array at the array in NumPy, the interpreter does one dispatch, one call, and hands NumPy a pointer to eighty megabytes of packed float sixty-fours. And NumPy calls a hand-tuned library, on the Mac that's Apple's Accelerate, which uses S I M D. Single instruction, multiple data. Those are CPU instructions that do the same operation on several numbers at once, packed side by side in one wide register. ARM's version is called Neon, and its registers hold two float sixty-fours or four float thirty-twos. Plus several running totals at once, and maybe several cores. And the interpreter just sits idle for the whole six tenths of a millisecond.
So here's the part I really like. Same job, sum of squares over ten million float sixty-fours, done six different ways, on the M four Pro, with three fourteen, best of five. And it's in nanoseconds per element. Earlier you said the whole story was "C is compiled". So, where do you think the big jump is?

B: [a bit unsure] I'd guess... the moment you leave Python. Like, the first C version is most of it, and then the rest is polishing.

A: So the first rung is pure Python. Ten point four nanoseconds per element. At about four and a half gigahertz, that's roughly forty-five clock cycles for each number. That's the eval loop, the boxes, the refcounts. Second rung: a C extension that walks the same Python list. No eval loop at all. Three and a half nanoseconds. So removing the interpreter entirely bought you three times. That's it. Three.

B: [surprised] That's it? I'd have guessed way more.

A: [amused] Everyone does. Because every element in that list is still a pointer to a float box. One memory read for the pointer, one for the box, a type check. The boxes are the next wall. Third rung: plain C over a packed array of raw doubles. No boxes. Point six nanoseconds. Another six times. And now the limit is something totally different. Each add has to wait for the previous add to finish, because they're all feeding one running total. They form a chain. That's about three cycles each.
Fourth rung: NumPy, but written as the array times the array, then dot sum. Point two seven. That's faster than the naive C, because NumPy's sum uses several running totals and S I M D. But it's slower than it could be, because it first writes out a whole temporary eighty-megabyte array of the squares, and then reads it back to sum.
Fifth: the same C, but compiled with dash O three and a flag called fast math. Point one one. Fast math tells the compiler it's allowed to reorder floating-point additions, which changes the rounding very slightly. And once it's allowed to reorder, it can keep several partial sums going at once in those wide registers. Five times faster than the plain version, from a compiler flag.
And the last rung: NumPy's at operator. Point oh six nanoseconds per element. That's a tuned linear algebra routine, what people call BLAS. And at that speed you're reading memory at roughly a hundred and thirty gigabytes a second. So it's not the arithmetic anymore. It's how fast you can pull bytes in from memory. That's the wall that's left.

B: So the hundred and seventy is mostly not about Python at all.

A: The interpreter is the first three times, out of a hundred and seventy. The rest is boxes, and how the data's laid out in memory, and how you do the arithmetic. Which is why "just use C" isn't the full answer either. C walking over Python objects is still slow.

<!-- section: The Idea: The boundary has a toll -->

B: Okay, but then why not just call C for everything? If C is the fast part.

A: Because every crossing costs something. To call a C function, Python has to look up the callable, check and convert each argument, so unbox a float into a raw C double, call through the C A P I, and then box the return value. And libraries pile their own checks on top of that.
So, guess. A plain Python function, add a and b, return a plus b, takes about twenty-five nanoseconds per call on the Mac. The same add written in C does the actual adding in a fraction of a nanosecond. Now you call that C function from Python, through C types, one call at a time in a loop. How long per call?

B: It's C, so... a few nanoseconds? Five?

A: [amused] About two hundred and fifty. Ten times slower than the Python version.

B: [laughs] Slower. The C one is slower.

A: Because C types is the most general way there is to call C. It works out how to convert every argument at run time, from the argument types you declared. So its per-call overhead is big. A properly compiled extension, written against the C A P I, or with Cython, or pybind eleven, or nanobind, is much cheaper per call. But never free. And NumPy's add, on two plain floats, was even worse. About three hundred and forty nanoseconds. Because NumPy first wraps each float into a zero-dimensional array before it does anything. So the rule is: cross the boundary rarely, and do a lot of work every time you do.
And the same toll shows up when data crosses. Converting that ten-million-float list into a NumPy array took a hundred and forty-six milliseconds on the Mac. That's longer than the whole pure-Python loop.

B: [skeptical] Wait, so your teammate's point six milliseconds was kind of cheating.

A: Only if the data started as a Python list. If you build a list and then convert it just to call NumPy once, you may well have lost. The fast path is to make the data in its packed form in the first place. Read it straight into an array, generate it with NumPy, load tensors from disk. And then keep it there.

<!-- section: The Idea: PyTorch, the same split with a GPU -->

A: Now PyTorch. In eager mode, which is the normal mode, where each line runs as soon as you reach it, PyTorch is exactly this same pattern. Your forward function is Python. Each line, say the gelu of a linear layer of x, is a Python call into C plus plus. That C plus plus checks the types, the shapes, which device it's on, the D types, and picks the right kernel. And kernel here means a GPU kernel, a function that runs on the GPU, across thousands of threads at once. Nothing to do with the operating system's kernel. One PyTorch op usually launches one kernel, or a few. And then it hands that kernel to the GPU's work queue. That last step is a kernel launch. Packaging up the arguments and asking the GPU driver to run it. And on the CPU side, a launch costs on the order of microseconds. Whether the kernel then runs for two microseconds or two seconds.

B: Okay, so here's my model. The GPU does the heavy lifting, Python's only telling it what to do. So Python basically doesn't matter on the GPU.

A: [thinking out loud] That's right... as long as one condition holds. The GPU side runs asynchronously. The CPU puts work in the queue and moves straight on, while the GPU chews through it. So as long as each kernel takes longer than the CPU needs to queue up the next one, the GPU never waits, and all the Python overhead is invisible. Hidden behind the work. And that's the normal case in training, with big batches.
Now shrink the work. A batch-one decode step on a small model, or a chain of tiny element-by-element ops. Each kernel finishes in two to five microseconds. But Python, plus PyTorch's dispatcher, plus the launch, take several microseconds per op on the CPU. So the GPU finishes a kernel and then just sits there, until the next one shows up. That's called being overhead-bound. The time goes into the CPU-side bookkeeping around the work, not into the computation, not into memory traffic. And a faster GPU doesn't help at all. That's the thirty percent from the beginning.
To give you a feel for the overhead: on the Mac's CPU, one torch dot add on two one-element tensors costs about four hundred and fifty nanoseconds. Adding two Python floats is about thirty. So that's fifteen times, and it's all overhead, the one-element add itself is nothing. And on a GPU, add the launch on top, and expect several microseconds per op. That's an order-of-magnitude figure, it really varies by machine and driver.
There's a nice way to picture it. Two horizontal lanes, like a timeline. CPU on top, GPU underneath. And you're running a hand-written gelu, which is eight little ops in a row. In eager mode, with small tensors, the top lane is solid: eight back-to-back blocks, each one the CPU preparing and launching an op. And the bottom lane is mostly empty. A short blip of kernel, then a gap, then a blip, then a gap. Because the GPU's always waiting for the CPU to hand it the next one. With the round numbers in that picture, the GPU's busy maybe a third of the time.
Now drag the tensor size up. Somewhere past a few hundred thousand elements, the blips start getting longer. And then they get longer than the CPU blocks, and the gaps close up. The GPU's busy back to back, the launches are hiding behind real work, and now what decides the time is memory bandwidth. Then flip to the other two modes. Replay it as a CUDA graph, and the top lane shrinks to one short block, and the kernels run nearly back to back. Switch to the compiled version, and there's one block on the CPU and one single kernel on the GPU.
That picture is a model, with round numbers. Not a measurement. Eight microseconds of CPU per eager op, three microseconds minimum for any kernel, fifteen microseconds of overhead for a compiled call, and the Spark's spec-sheet memory bandwidth of about two hundred seventy-three gigabytes a second, with every op reading and writing the whole tensor once. Your real numbers will be different. What it gets right is the shape. Below a few hundred thousand elements, eager mode is all launch overhead, and nothing about the GPU matters.

<!-- section: The Idea: What torch.compile does -->

A: So there are two ways out, and torch dot compile can do both.
The first is fewer, bigger kernels. That hand-written gelu is eight ops: cube x, multiply by a constant, add x, multiply by another constant, take the tanh, add one, multiply by x, multiply by a half. Eager PyTorch runs each one as its own kernel. And every kernel reads a whole tensor out of memory and writes a whole tensor back. So that's eight round trips to memory, for arithmetic that's trivial. Kernel fusion merges them into one kernel. It reads x once, does all eight steps on each number while it's sitting in a register, and writes the result once. So for small tensors, you get fewer launches. And for big ones, eight times less memory traffic.
The second is one launch for many kernels. That's a CUDA graph. You record a whole sequence of kernel launches once, with all their arguments and memory addresses, and then replay the whole recording with a single call. The kernels are exactly the same. The CPU just stops paying for them one at a time. The catch is that everything has to be static. Same shapes, same memory addresses, every replay, and no decisions on the CPU in the middle.

B: [working it out] But for fusion it needs to know what's coming next. And Python runs one line at a time. So how does it see the whole thing before it runs?

A: [warmly] That's the clever part. To fuse your ops, PyTorch has to see them all at once, as a graph. A computation graph is just a list of the operations and which outputs feed into which inputs. With the whole graph in hand, a compiler can reorder things, fuse them, plan the memory. Eager mode never has that. It only ever sees the op it's on.
So picture a pipeline, left to right. Your forward function, as bytecode. Into something called Dynamo, which traces out the ops. Out comes a graph, with guards attached. Into something called Inductor, which fuses and writes code. And out the far end, either Triton kernels for the GPU or C plus plus for the CPU. And hanging off Dynamo, there's a dotted detour going down, labelled "graph break", for things like printing, or pulling out a single number. And those run as plain Python, and then a new graph starts.
Here's how Dynamo gets the graph. Remember the eval loop is one C function? Back in twenty sixteen, pep five twenty-three added a hook to CPython that lets a library swap in its own function for running a Python frame. A frame is just one running function call. So Dynamo uses that hook to see your forward's bytecode before the eval loop runs it. It runs it symbolically, sort of pretending, and pulls every tensor operation out into a graph. And ordinary Python logic around the tensors, like a loop over your layers, or an if on a config flag, gets baked in. For the values it saw.

B: Baked in for the values it saw. So if the flag changes...

A: That's what guards are for. The compiled graph is only valid for what Dynamo saw. These shapes, these D types, this device, that flag being true. So every call first checks those guards. Which is exactly the same idea as the add-int guard, just one level up. Pass, run the compiled code. Fail, compile again. And if you feed it too many different shapes, you're recompiling all the time.
Graph breaks are the other half. When Dynamo hits something it can't trace, like printing a tensor, or calling dot item to get a plain Python number out, or calling into NumPy, it ends the graph right there, runs that bit as normal Python, and starts a new graph after it. Your code still works. But each break splits the fusion, and adds overhead.
Then Inductor is the compiler at the back end. It fuses the element-by-element ops and the reductions, plans memory, and writes the actual kernels. On NVIDIA GPUs it writes them in Triton, which is a Python-like language for GPU kernels. On CPU it writes C plus plus with Open M P, for multiple threads. Big matrix multiplies usually still go to the vendor library, cue blas, because those are already about as good as it gets.
And there are modes. Reduce overhead additionally wraps the result in CUDA graphs. Max autotune spends a lot longer compiling, trying different kernel configurations to find the fastest.
And the cost. All of this happens on the first call, and it is not fast. Seconds for a small model. Often minutes for a big one. And again, for each new set of shapes. So a benchmark that doesn't report compile time is only telling you half the story.
So, one more guess. You compile a single GPT-two block, seven sixty-eight wide, twelve heads. Run it on the Mac's CPU, batch one, sixty-four tokens. Eager takes about one point one milliseconds per forward pass. After compiling: faster, slower, or the same?

B: [confident] Faster. It's a compiler. That's what it's for.

A: [amused] Slower. On the M four Pro, with PyTorch two point fourteen, it went from one point one three milliseconds to one point four. And the bigger version, batch eight, five hundred and twelve tokens, was also a bit slower. Thirty-three milliseconds versus thirty-five.

B: Why would compiling make it slower?

A: Because on a CPU, that block's time is mostly matrix multiplies. And eager already sends those to a tuned library. There's very little left to fuse, really just the gelu and the layer norm. And the compiled wrapper adds its own guard-checking overhead on every call. Where compile did win on the CPU was the hand-written gelu on sixteen million elements. Ten point nine milliseconds down to six point eight. Because there, fusing eight memory-bound passes into one actually saves memory traffic. So compile isn't magic. It fixes specific problems, launch overhead and unfused memory-bound ops, and if your model doesn't have those problems, it doesn't help. Now, the Spark's GPU at batch one? Launch overhead is the main problem there. So expect a very different answer. And measure it.

<!-- section: The Idea: So where should you optimize? -->

A: [relaxed] So put it all together and you get a map of where Python costs you. Four cases.
First case, Python loops over individual numbers or small objects. The eval loop and the boxes dominate. Fix: vectorise, with NumPy or PyTorch, or move the whole loop into compiled code, Numba, Cython, a C or Rust extension. And never call into C once per element.
Second, lots of small library calls. Each one pays the toll at the boundary. Fix: batch them. One call on a big array, not a thousand calls on little ones.
Third, GPU work in small pieces. Every op pays for Python, dispatch and launch. Fix: bigger batches, torch dot compile for fusion, and CUDA graphs, that reduce overhead mode, for the launches.
Fourth, big tensor ops. And here, Python's irrelevant. The time is compute, or memory bandwidth. Optimising Python won't move the needle at all.
And the most important rule is: find out which case you're in before you touch anything. With a profiler. There's two kinds you'll use. C profile is built into Python. It records every single function call and every return, so it can count calls and time them exactly. That's called a tracing profiler. The bookkeeping slows your program down, though. A lot, for code that makes tons of small calls. And then there's py spy. That's written in Rust, and it reads a running Python process's memory from the outside, many times a second, to see what it's doing right then. So it barely slows the program down, and you don't change any code. That's a sampling profiler. Statistical answers, low overhead.

B: So when they disagree, which one do you trust?

A: Depends on the program, and that's actually one of the things you'll find out. If the code's made of lots of tiny function calls, C profile's own overhead can distort exactly those, so the sampler's usually closer to the truth about time. C profile's great for exact call counts.

<!-- section: Build It -->

A: [relaxed] So, the build. One folder, everything on the Mac first, and the last bit moves to the Spark. Setup is one step: use U V to install Python three ten, three eleven and three fourteen, make one virtual environment on three fourteen with NumPy, torch and py spy, and print the versions and whether the JIT's even available in that build. If PyTorch doesn't have wheels for the newest Python yet, use three thirteen for that environment. And for the pure-Python stuff, U V can run any script on another version without a virtual environment at all.
First real task is reading bytecode and catching the specialiser in the act. You write two functions, the little add, and a total that loops over a list with a running sum. Disassemble both cold. Call each about a thousand times. Disassemble again with adaptive on. And the part that matters is, before you look, write down which instructions you expect to change. Then look. Then call add with floats a thousand times and look again. Then with strings, a plus b as text. And then run the whole thing on three ten too, which doesn't have the adaptive option at all, so wrap that call in a try, and compare the raw bytecode between the versions. You're done when you've seen at least three instructions turn into specialised versions and you can say what guard each one checks.

B: And then on my actual code?

A: Then pick one function from your real ranking code, something with a loop, and dis it. Count how many instructions run per loop iteration. Multiply by a few nanoseconds. That's roughly what each iteration costs you. It's, honestly, a surprisingly good estimate.
The core build is the ladder. Same sum of squares, ten million float sixty-fours, six ways, each timed with the high-resolution clock, best of five. First you write the C. The function signature's given, takes a pointer to doubles and a count, returns a double. The body is yours. And there's a one-line C add next to it, for later. You build it twice. Once plain, dash O two. And once with dash O three, fast math, and tuned for this exact CPU. On the Spark the file extension changes, it's dot S O instead of dot dylib, but same idea.
Then a Python file that does, well, everything else. Your pure-Python loop. A loader that opens the library with C types and declares the argument and return types for both functions. A timing helper that runs something five times and keeps the fastest. And then the rows: pure Python, C types into the plain C, C types into the fast C, NumPy times-and-sum, NumPy at. And it prints milliseconds, nanoseconds per element, and the speedup over pure Python. And all the answers have to agree to about six digits.
Two hints there. Get the pointer to the NumPy data once, outside the bit you're timing, or you'll be timing the conversion. And fast math may change the last few digits of the answer. That's the reordering of the additions. It's not a bug.
And the sixth rung is the interesting one. A real CPython extension, that walks the Python list in C. The boilerplate's given, because it's the same for every extension. The module definition, the method table, the init function. The loop is yours. You ask for the list's size, get each item, convert each one to a C double, add up the squares, and hand back a brand new Python float. And if a conversion fails, you return an error instead. Building it, you point the compiler at Python's headers, and give the output file the exact suffix Python expects. On the Mac there's one extra flag that lets the extension find Python's functions when it's loaded, and on Linux you drop it. And if you'd rather not touch the C A P I at all, a library called C F F I is a fine stand-in for C types on the raw-array version. Same idea. You're done when all six rows print and they agree.

B: And I should get the same numbers as you?

A: The ratios, roughly. Removing the interpreter, going from pure Python to C over the list, about three times. Removing the boxes, the list to the raw doubles, about six times more. Letting the compiler use S I M D and several running totals, another five. And the tuned library, another two. If your ratios are wildly off, check that you're not timing the pointer conversion, or the list creation, inside the loop.
Third task, measure the toll. A million calls each. The Python add, the C add through C types, NumPy's add on two plain floats, and torch dot add on two one-element tensors. Report nanoseconds per call. What I got: twenty-five for Python, about two fifty-four for C types, three forty-one for NumPy, about four fifty for torch. And those all include about thirty nanoseconds of the loop itself and the call. Then time two conversions. Turning the ten-million list into a NumPy array, which took a hundred and forty-six milliseconds. And building a C types array out of it, which took four hundred and sixty. And write down how many pure-Python loop iterations each conversion is worth.

B: [working it out] So the NumPy conversion... at ten nanoseconds an iteration, a hundred and forty-six milliseconds is about fourteen million iterations. More than the whole list.

A: More than the whole list. And here's the break-even way of looking at it. If a C call costs two hundred and fifty nanoseconds, and the C work inside is one nanosecond, then you need about two hundred and fifty nanoseconds' worth of work per call before C even breaks even. That's why NumPy is slow on tiny arrays. On tiny inputs, it's all toll.
Fourth task, profile before you optimise. You write a small, realistic, deliberately slow script that looks like your ranking preprocessing. Make two hundred thousand fake query-document pairs, lowercase them, split them into words with a regular expression, compute a word-overlap score in a plain Python loop, then put the scores in a NumPy array and normalise them. Write it however feels natural. Don't optimise it. Then profile it twice. C profile, sorted by what's called tot time, which is time spent inside each function itself, not counting the functions it calls. The other column, cum time, includes them. And py spy, which records a flame graph you open in a browser, where width is time. On the Mac, py spy needs sudo to read another process's memory. And there's also a live mode, like top.
Then three questions. How much did C profile slow the script down, compared to running it bare? Do the two profilers agree about where the time goes, and if not, which one do you trust for this script, and why? And then: fix only the top item, re-measure, and stop. Stop is part of the task. If py spy doesn't support your Python version yet, run it from three thirteen. And an agent can explain profiler output to you here, but the fix is yours.
Fifth task, torch dot compile on the Mac CPU, with honest timing. You've built GPT-two, so bring your own block: layer norm, causal self-attention, the MLP with gelu, the residuals. Plus a tiny MLP, eight linear layers of sixty-four by sixty-four with gelu between. Plus that eight-op gelu written by hand as a plain function. You write a benchmark helper that warms up with three calls, then takes the mean over a bunch of calls with gradients turned off. And a separate helper that times the very first call on its own, because that's where the compiling happens. Then for each case: eager time, compile it, time the first call, then the compiled time, then the speedup.
And you run it with a fresh, empty cache directory for Inductor, so you see the real cold compile. And then once more without the fresh directory, and see how much faster that first call gets when Inductor finds its kernels already cached on disk.
My numbers, from the M four Pro, with U V's three fourteen, PyTorch two point fourteen, ten CPU threads. Tiny MLP, batch one: point oh two four milliseconds eager, point oh three four compiled. So seventy-one percent of the speed. Slower. First call, two and a half seconds. The GPT-two block, batch one, sixty-four tokens: one point one three to one point four, so about eighty percent, first call nine tenths of a second. Batch eight, five twelve tokens: thirty-three to thirty-five, about ninety-four percent, first call about a second. And the gelu on sixteen million: ten point nine down to six point eight, one point six two times faster, and the first call about four tenths of a second.

B: Why do the later first calls get faster? Same compile.

A: Partly because the first case already imported and warmed up Dynamo and Inductor. And the gelu on sixteen million actually recompiled, because the shape changed from the thousand-element run before it. That's a guard failing, live.
And why it comes out that way. The block's dominated by matrix multiplies, which were already in a tuned library. The tiny MLP is pure overhead either way, and the compiled path's guard checks add a little more. The sixteen-million gelu wins because fusion saves seven of the eight trips through memory, and each trip is sixty-four megabytes each way. On paper, that should've been more than one point six times. But on CPU, eager's element-by-element ops are already spread across threads and partly cache-friendly, so the real gain is smaller. And that compile time, a second or more? Nothing, for a training run. A lot, for a five-second script.
Last task, the Spark's GPU. You copy the folder over and install a CUDA-enabled PyTorch for ARM sixty-four. Check NVIDIA's DGX Spark docs and the PyTorch site for the right one, because that changes. Move everything onto the GPU. Use bfloat sixteen for the block if you like. Compare three modes per case: eager, compiled, and compiled with reduce overhead, which is the CUDA graphs. Run the block at batch one with a single token, which is basically one decode step, and at batch thirty-two with five hundred twelve tokens. And run once with the logging switched on for graph breaks and recompiles, to see if anything broke the graph.
And the most important thing in that task is the timing. You have to synchronise with the GPU before you read the clock, or use CUDA events.

B: Why? The call returns when it's done, doesn't it?

A: [jumping in] No, and that's the async part from earlier. The call returns as soon as the work is queued. So without a sync, you're timing how fast Python can put work in a line, not how fast the GPU does it. Which is why you have an agent review your timing code after, looking for exactly that. Missing syncs, timing the first call together with the rest, comparing different D types against each other.
So what should you expect there? At batch one, one token through a GPT-two block launches a few dozen kernels that each finish in microseconds. So eager should be overhead-bound, with the GPU idle a lot. Reduce overhead, the CUDA graphs, should help most there, possibly by a large factor. At batch thirty-two, five hundred twelve tokens, the matrix multiplies are big, the overhead hides, and the speedup should shrink to whatever fusion buys on the element-by-element parts. Often one point one to one point five times for a transformer block, but measure. And compile times on the GPU include compiling Triton kernels, so they should be longer than on the Mac. Those are expectations, not results. If any of them are wrong on your machine, that's the interesting part. Go find out why. You're done when you've got numbers for every case, Mac and Spark, compile time included, and you can explain each speedup or slowdown in one sentence.

<!-- section: Break It -->

A: [a bit playful] Then you break it. On purpose. Four ways. First, make the specialiser guess wrong. Run that total function on a list of all ints, then all floats, then alternating, int, float, int, float. And disassemble with adaptive after each. On three fourteen, ints and floats ran at about ten nanoseconds per element. The mixed list, about thirteen.

B: That's... not that bad, actually.

A: It's not, because the plus became something called binary op extend. A newer specialisation for common mixed-type pairs, like int plus float. On three eleven, the mixed case just lands on the generic path. And the point is, specialisation rewards boring, consistent types. A function that sees a different type every call stays generic, and gets nothing from three eleven onwards.
Second, scatter the boxes. Shuffle the list, and rerun the pure-Python loop and the C extension.

B: [skeptical] But it's the same numbers. Why would the order matter for a sum?

A: Because of where the boxes are. When you built the list in order, each float box got allocated right after the previous one, so they sit next to each other in memory. And memory comes into the CPU's cache in small chunks, not one byte at a time, so reading one box tends to bring in the next one for free. Shuffle the list, and the values are the same, but now consecutive pointers point all over the heap. Every box is a fresh trip to main memory. On the Mac, pure Python went from ten nanoseconds per element to fifty. And the C extension, from three and a half to seven and a half. And NumPy doesn't care at all. Its numbers are packed, and shuffling a NumPy array still leaves them packed. That's the clearest proof that boxes cost you twice. Once for the type dispatch, and once for the cache misses.
Third, call C in a loop. Sum up the C add of x and x, over a million elements, from a Python loop. A C-accelerated version of a simple loop.

B: Which should be faster, because each op is in C now.

A: It's several times slower than plain Python. Two hundred and fifty nanoseconds of toll per element, remember. And then there's the NumPy version of the same mistake. Take the NumPy array and loop over it in Python, plus-equals x times x. Iterating a NumPy array from Python makes a NumPy scalar object for every single element. On the Mac that ran at forty-eight nanoseconds per element. Against ten for the same loop over a plain list. So fast libraries are only fast when they get the whole loop.
And fourth, break the graph. Put a print of the tensor's mean, or an if on dot item, in the middle of your block's forward. Compile it, with the graph-break logging on. Dynamo reports a break, and runs two graphs with Python in between. Then call the compiled block with a new sequence length every call, sixty, sixty-one, sixty-two, with the recompile logging on. Watch it recompile, again and again, until it gives up and marks that dimension as dynamic. And on the GPU, try timing the eager block without the sync. The numbers will look amazing and mean nothing.

<!-- section: Explain It Back -->

B: Okay, so let me take the Spark one. Monday morning, I'm serving at batch one and the GPU's at thirty percent. What do I actually do?

A: First, confirm it. At batch one each kernel's tiny and finishes in a few microseconds, but the CPU needs several microseconds per op to run the Python line, go through PyTorch's dispatcher and launch the kernel. So the step is overhead-bound, not compute-bound or bandwidth-bound. And you'd see it in the PyTorch profiler, or NVIDIA's Nsight Systems, as gaps between the kernels on the GPU's timeline. Then the fixes, roughly in order. Batch more requests together, if the latency allows. Then torch dot compile, to fuse the element-by-element ops into fewer kernels. Then reduce overhead mode, to capture the whole step as a CUDA graph so it launches with one call. And since that needs static shapes, you pad requests to a few fixed sizes. Serving engines like V L L M do exactly that.

B: And it gets worse as the model gets bigger, I guess. More layers, more overhead.

A: The other way round, actually. Say you double the tensor sizes. The Python and launch overhead is per op. A fixed few microseconds, however big the tensor is. But the kernel's time grows with the work. For memory-bound ops, roughly in proportion to the bytes. For matrix multiplies, faster than that. So as sizes grow, that fixed overhead becomes a smaller and smaller slice, until it's invisible, and the bottleneck moves to memory bandwidth or compute. The dangerous direction is the reverse. Smaller batches, smaller models, more little ops per step. That's when overhead takes over. Which is why tiny-batch inference and small models get the most out of compiling and CUDA graphs, and big-batch training on large models barely notices Python at all.

B: So more layers does hurt. But bigger layers don't.

A: [thinking out loud] Yeah. More ops per step, at the same small size, means more overhead. Bigger ops hide it. That's a good way to put it.

<!-- section: Connections and close -->

A: And it connects to a few things. The GIL, that one lock in CPython that only lets one thread run Python at a time? It's guarding exactly the state you just stepped through. The value stack, the refcounts, the boxes. And once the overhead's gone, the wall that's left is memory bandwidth. That's the next thing to dig into, the whole question of why you only get about seventeen tokens a second. Batching and serving engines are mostly about getting out of the overhead-bound corner. And FlashAttention is basically kernel fusion taken as far as it goes. If you read one thing after this, make it Horace He's "Making Deep Learning Go Brrrr From First Principles", and if you read two, add pep six fifty-nine.

B: [working it out] Okay, let me try the whole thing. Python's slow because it's interpreted. The CPU runs the eval loop, and the eval loop works out what every plus means, every time, on boxed values. And the fix is to just get into C as fast as you can, because C is where the speed is.

A: Most of that, yes. But the last part's the trap. Getting into C only bought three times on that ladder. C walking over Python's boxes is still slow, and C called once per number is slower than Python. The speed comes from three things at once: no interpreter, no boxes, and few crossings that each do a lot of work. So it's not "get into C". It's: hand compiled code a whole packed array, or a whole graph, in one go. And let Python just say what to do. Python orchestrates. C computes.
