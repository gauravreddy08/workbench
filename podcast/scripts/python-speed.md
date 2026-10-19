<!-- section: Same math, two speeds -->

A: [relaxed, thinking out loud] So you're scoring candidates for the cross-encoder, and one step needs a little feature for each pair. Basically a sum of squares over a few million floats. You write the obvious thing. A for loop, add up x times x. It takes a tenth of a second or so. Fine.

B: Fine for a feature, sure.

A: Then a teammate does the same thing as one line of NumPy. Same numbers, same machine, same answer to six digits. And it's over a hundred times faster.

B: I mean, that's just NumPy. Everyone knows NumPy's fast.

A: Everyone knows it. Hardly anyone can say why. So try the other direction. Your model's in PyTorch, and PyTorch is fast because it's C plus plus and CUDA underneath. You serve it on the Spark, one request at a time, and you look at the GPU. It's busy about a third of the time. A chip that can do trillions of things a second is mostly sitting there waiting.

B: Waiting for what?

A: Python. Same culprit as the loop. And the fix isn't "rewrite it in Rust". It's knowing exactly what Python does for each line, where Python stops and the fast code takes over, and what each crossing costs.

<!-- section: Compile it or interpret it -->

A: [warm] There's a nice bit of history here. The first big programming language that wasn't assembly, FORTRAN, at IBM in the fifties, was a compiler. It took your formulas and translated the whole thing into the machine's own instructions before you ran anything. And its whole pitch was, it's nearly as fast as hand-written code. Scientists wouldn't have touched it otherwise.

B: And then the other approach.

A: A year or so later, LISP did the opposite. An interpreter. A program that reads your program and does what it says, one piece at a time. Slower, but you could change code while it was running, and a value could be any type at any moment. For decades those were the two choices. Then in the eighties some people working on Smalltalk found a middle path. Start by interpreting, but watch what keeps running, and compile that part. And at each spot, remember what type showed up last time, so the next time you just check, oh, same as before, and go.

B: That's a JIT, right? Just in time.

A: That's the family. Java's runtime came out of that line of work, and so did the fast JavaScript engines. And Python, when Guido van Rossum started it at the end of the eighties, took the simple road. An interpreter, written in C, easy to plug more C into. That choice is why it runs everywhere and grew this enormous ecosystem. It's also why for thirty years a Python loop has been dozens of times slower than the same loop in C.

<!-- section: Who the CPU is actually running -->

A: The picture I like is a meeting with a translator. A compiler is like a translator who takes your whole book and hands you back the finished French edition. Then they leave. When the program runs, there's nothing between your code and the chip.

B: And an interpreter's the live one.

A: Right, the live interpreter at the meeting. Hears a sentence, works out what it means, says it, moves on. Never writes anything down. So if you say the same sentence a thousand times, they work it out a thousand times. And here's the thing that took me a while to really absorb. The CPU never runs your Python. It runs the interpreter, which is a big C program, and your code is just data it reads.

B: [skeptical] Python does compile, though. There's that pycache folder.

A: It does, a bit. It turns your code into bytecode first, a list of simple instructions for an imaginary machine. Push this, push that, add, return. But that compiler is deliberately dumb. It has no idea what types anything will be. So the instruction for plus is the same instruction whether you're adding two ints, two strings, two lists, or two NumPy arrays. It just says "add". What add means has to be worked out at the moment it runs. Every time.

<!-- section: Every value is a box -->

B: Okay, so it looks up what plus means. That can't take that long.

A: On its own, no. But there's a second half. In C, a number is just the number. Eight bytes, probably sitting right in the processor, and nothing anywhere says what type it is. The compiler knew, did the right thing, and forgot. In Python, a number is an object. A little box out in memory with a header. A count of how many things are pointing at it, that's the reference count. A pointer to its type. And then, finally, the number.

B: Why on earth would you do it that way?

A: Because it buys you everything you like about Python. A variable can hold a number now and a string later, because the type travels with the value. Integers never overflow, because the box can just grow. Every value can go in a list or get passed anywhere the same way. Wrapping a raw value up like that is called boxing. And the price is, every plus has to open both boxes, read the labels, and decide what to do.

B: [working it out] So when Python runs a plus b...

A: When I stepped through it, it's about a dozen steps around one actual add. Fetch the instruction, jump to the code for it. Check what type the left one is. Find that type's add function. Call it. It checks the types again, because it can't trust its caller. Open both boxes. Add. Make a brand new box for the answer. Update the counts. The add itself is one instruction on the chip. Everything else is working out what add means.

B: So it's not that any one step is slow.

A: None of them. Each step is a few billionths of a second. It's just that there's a dozen of them around one useful thing. That ratio is the whole thing people mean when they say Python is slow.

<!-- section: Python learns to guess -->

B: Didn't the newer Pythons get a lot faster, though? I remember a big deal about it.

A: They did, and it's the Smalltalk trick, finally. Starting a few years ago, the interpreter watches each instruction. If that plus has seen floats every single time, it rewrites itself, right there in your running program, into a "plus for floats" version. And that version starts with a cheap check. Are these still both floats? That's called a guard. If yes, skip all the lookup and just add. If no, fall back to the slow general way.

B: So it's guessing, but checking the guess.

A: Guessing and checking. And it's a real improvement. Code with lots of function calls got more than twice as fast over a handful of releases. But notice what it doesn't do. Every instruction still gets fetched and dispatched. Every result still gets boxed. The counts still get updated. It makes the steps cheaper. It doesn't get rid of them.

B: And the JIT? I heard Python has one now.

A: It has an experimental one. Off by default, and you need a build that includes it. And when I tried it on my Mac, the function-heavy test didn't change, and the float loop actually got a bit slower. It still keeps all the boxes and counts. So for now, I wouldn't plan around it.

<!-- section: Just put it in C -->

B: [a bit unsure] Okay, so then the answer seems obvious. The interpreter's the problem, so take the loop out of the interpreter. Write it in C. Done.

A: That's what I would've said too. So I built it as a ladder. The same sum, six different ways, each one taking away one layer. And the second rung is exactly what you just said. A little C function that walks the same Python list. No interpreter at all.

B: And?

A: About three times faster. Out of a gap of more than a hundred.

B: Wait, that's it?

A: That's it. Because it's still walking a list of boxes. Each element is a pointer to a box somewhere in memory. Read the pointer, go find the box, check it's a float, pull the number out. The interpreter's gone, but the boxes aren't. Then the next rung is the same C loop over a packed array, just the raw numbers side by side, no boxes. That's where the big jump is. And after that, letting the compiler use the chip's wide instructions that do several numbers at once, and then a properly tuned library. Which is what that one NumPy line was doing.

B: [working it out] So the interpreter's only the first little bit of the gap. Most of it's the boxes, and how the numbers sit in memory.

A: That's the surprise. And there's a lovely way to feel the boxes. Shuffle the list. Same values, just in a different order. Now each pointer sends you somewhere random in memory instead of next door, and the plain Python loop gets several times slower. NumPy doesn't care, because its numbers are packed whichever order they're in.

<!-- section: The toll at the border -->

B: Okay, so C over packed numbers. Then why not call C for everything?

A: Because every crossing costs something. To call into C, Python has to find the function, check and convert each argument, open the boxes, call it, and box up what comes back. And for a single tiny thing, that toll is way bigger than the work. When I called a little C add function from Python, one number at a time, each call was about ten times slower than just doing the add in plain Python.

B: [laughs] So the "C accelerated" version is slower.

A: Much slower. And same with data. Turning a big Python list into a NumPy array took longer than the whole plain Python loop over it. So if you build a list and convert it just to call NumPy once, you might have already lost. The rule is, cross the border rarely, and do a lot of work each time you cross. Python decides what to do, the compiled code does the doing. And keep your data in its packed form from the start, if you can.

<!-- section: The idle GPU -->

A: Now the GPU at a third busy makes sense. PyTorch is exactly this pattern. Your forward function is Python. Every line is a Python call into C plus plus, which checks shapes and types and devices, picks the right GPU function, and puts it in the GPU's queue. GPU programs are called kernels, by the way, nothing to do with the operating system kind. And putting one in the queue is a kernel launch.

B: And the GPU runs on its own while Python moves on.

A: Right. As long as each kernel takes longer than it takes the CPU to queue up the next one, the GPU never waits, and Python's cost is invisible. That's normal training with big batches. But now take one request, one token at a time, on a small model. Each kernel finishes in a few millionths of a second. And the CPU needs about that long, or longer, just to get the next one launched. So the GPU finishes, and sits there.

B: So it's not limited by math, and not by memory.

A: By bookkeeping. People call that overhead-bound. And the nasty part is, a faster GPU doesn't help at all.

B: And that's what torch dot compile is for.

A: That's one of its jobs. Two tricks, really. Eager PyTorch only ever sees the current line. The compiler reads your whole function first and gets the full list of operations, the graph. Then it can fuse lots of little operations into one kernel. And separately, there's a thing called a CUDA graph. You record a whole sequence of launches once, then replay all of it with a single call. The CPU stops paying for each one.

B: So compile everything.

A: [amused] I compiled a GPT two block on my Mac's CPU, and it got a bit slower. Most of its time was big matrix multiplies, which already go to a tuned library. There was nothing much to fix, and the compiled version adds its own little checks on every call. Where it did win was a chain of tiny element-by-element operations on a huge tensor, because fusing them meant reading memory once instead of over and over. And the GPU, one request at a time, should be the opposite story, because there the launches are the whole problem. And the other thing nobody puts in their benchmark. Compiling takes seconds the first time. Sometimes much longer.

B: So it fixes specific problems.

A: Specific problems. Which is why the real first step is always a profiler, before you touch anything. Find out which case you're in.

<!-- section: Ending -->

B: Okay, let me say it back. Python's slow because the interpreter works out what every operation means every single time it runs it. So the way out is to move the loop into C. And with PyTorch on a GPU, it's the same problem, just the cost of launching each little kernel.

A: Close. The bit I'd sharpen is the middle. Moving the loop into C barely helped while it was still walking Python's boxes. Most of the speed came from getting rid of the boxes, packing the numbers, and doing a lot of work per call. So it's not really "get out of the interpreter". It's: cross the border rarely, with a big pile of packed data, and let the other side do the whole loop. Whether it's NumPy or a GPU, the question is the same. How much useful work do I get for each time Python has to step in?
