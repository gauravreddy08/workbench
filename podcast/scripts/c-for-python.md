<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, here's a thing that's probably happened to you. You're running a small model under llama.cpp on the Spark, and it's slower than you expected. You go looking, and there's a GitHub issue. Someone says, it's because this one function, the one that adds two lists of numbers together, isn't vectorized on ARM. And there's a link. So you click through to the C.

B: And it's a wall of stars.

A: It's stars in strange places. A line that starts with a hash sign. A for loop with nothing before the first semicolon. Something that looks like x plus i, where x is supposed to be a whole list of numbers. And you close the tab, and you believe the issue.

B: [laughs] Yeah. That's pretty much what I'd do.

A: Everyone does. But here's the thing. C isn't actually hard. It's unfamiliar, in maybe ten specific ways. And every one of those maps onto something you already know from Python. Once you can see them, you can open that file and decide for yourself whether the issue is right.

B: Is it?

A: It's right, sort of. We'll come back to it.

<!-- section: A language for a machine with bytes -->

A: The strangeness makes a lot more sense once you know where it came from. Late sixties, Bell Labs. Ken Thompson writes the first Unix, and he makes a little language to write tools in, called B. And B has no types at all. Every value is just one machine word, a fixed-size chunk, and the program does arithmetic on words.

B: So no difference between a number and a letter.

A: None. Then Bell Labs gets a new machine, a PDP eleven. And it can address memory one single byte at a time, and it's about to get hardware for decimal numbers, floating point. And suddenly a language with no types can't say what it needs to say. Is this one byte of text? Is it a two-byte whole number? Is it a floating point number? Those need different amounts of memory and different instructions.

B: So someone added types.

A: Dennis Ritchie added types. So the compiler would know how many bytes every value takes, and which machine instruction to use on it. He called the result C. And within a couple of years they'd rewritten the Unix kernel itself in it, which proved you could write an operating system in a high-level language and have it be fast enough.

A: And that's the key to the whole thing. C is a thin, honest layer over memory. Almost every rule that looks weird exists because the compiler needs to know, ahead of time, exactly how big things are and exactly where they sit.

<!-- section: Translate once -->

B: [skeptical] Okay, but the thing I've always heard is C is fast because it's low level. Close to the metal. Which, honestly, I've never known what that means.

A: Yeah, that phrase hides the actual reason. Start with how Python runs. When you run a Python file, it gets turned into these simple instructions for Python's own little virtual machine. Bytecode. Your real processor can't run bytecode. So there's a big loop inside Python, written in C, that reads each instruction, works out what it means, and does it. That loop is the interpreter.

B: And C doesn't have that.

A: C skips the middleman. A compiler translates your file into the processor's own instructions once, ahead of time, and saves them. Then you just run that. No interpreter sitting in between. But the deeper reason it's fast is the types again. Say you're adding up a list. In C, the compiler sees total plus equals the next number, it knows both of those are eight-byte decimals, and it writes out one single add instruction. Done.

B: And Python?

A: Python sees total plus equals v, and it has to ask, right now, at this moment, what is total? What is v? Find the right add function for those two kinds of things. Build a brand new float object on the heap for the answer. Update the counts that track who's using what. For every single number.

B: [working it out] So it's not that Python's add is slow. It's all the asking around it.

A: It's all the asking. When I summed ten million numbers both ways on my Mac, the plain Python loop was close to twenty times slower than the C. And the C was just doing the add. Python's built-in sum sits in between, by the way, because its loop is in C, but it still has to go find each number.

<!-- section: Boxes with addresses -->

A: Okay. The stars. This is the bit that scares everyone, so let's go slow. In C, every variable is a box in memory. And memory is just one enormous row of numbered bytes. So every box has a number, the number of its first byte. That's its address.

B: Okay.

A: There are two symbols for talking about the box itself instead of what's in it. The ampersand means "where does this live". So ampersand n isn't the forty two inside n, it's the address of n. And then a pointer is just a variable whose value is an address. Plus a type, so C knows what kind of thing is sitting at that address and how many bytes to read.

B: And the star?

A: The star is confusing because it does two jobs. When you're declaring something, star means "this is a pointer". When you're using it, star means "go there". Go to that address and use what's sitting there. So star p is the forty two. And if you write star p equals seven, you've just changed n to seven, through the pointer.

B: Why would I want to do that instead of just changing n?

A: Because in C, a function gets copies of its arguments. Always. So if you want a function to change your variable, you can't hand it the variable. You hand it the address. Then the function goes there and writes. And you see this pattern all over the place. A function that returns nothing, but takes a pointer? The pointer is usually where the answer goes.

<!-- section: A Python name is a pointer -->

B: [a bit unsure] See, in Python I don't have to think about any of this, because Python passes by reference. If I write a function that doubles its argument, and I call it on n, then n gets doubled.

A: Try it. Write a function, double it, which does v equals v times two. Set n to twenty one, call it. What's n afterwards?

B: I want to say forty two. But you're asking, so...

A: Still twenty one. And the reason why is the sentence that makes all of CPython readable. Every Python variable is a C pointer to an object on the heap. When you call the function, v gets a copy of the address of that twenty one object. Then v equals v times two makes a new object, forty two, and points v at it. Your n never moved. It's still pointing at the old one.

B: Oh. So it's not by reference, and it's not by copy either. It's handing over the address.

A: It's handing over the address, with no way to rebind the caller's name. But if you passed a list and called append on it, the caller would see it. Because you went through the pointer and changed the shared object. Which is exactly the star thing in C. And the built-in id function in CPython? That's literally the address, as an integer.

B: Huh. So when I write b equals x for a list, nothing gets copied.

A: Just the address. And the count of how many things point at that list goes up by one.

<!-- section: A list versus an array -->

A: Now look at what a Python list of three floats actually is. Your name points at a list object. The list object points at an array of pointers. And each of those points at its own separate float object, somewhere on the heap. Five separate blocks of memory, for three numbers.

B: And in C?

A: In C, an array of three doubles is the three numbers, side by side, in one block, no gaps. That's it. And that block is what NumPy and PyTorch store underneath. Which is why there's a whole episode on why NumPy is so much faster, and it really all comes from the difference between those two pictures.

B: [skeptical] What does the C array know about itself? Like, its length?

A: Nothing. A C array doesn't know how long it is. That's why C functions that take an array almost always take the length too, right next to it. And it doesn't check if you go past the end, either. Ask for the tenth thing in an eight-thing array and C just works out where the tenth would be and reads whatever bytes happen to be there. Maybe another variable. Maybe garbage. Maybe a crash.

B: That sounds terrifying.

A: [amused] It's a bit terrifying. It's the price of C promising never to do work you didn't ask for. And it's a nice thing to realise about Python, actually. The index error you get from a list? That's a check CPython is doing for you, in C, every single time you index.

<!-- section: A tensor is a block plus a rule -->

A: And here's where it pays off for the stuff you actually do. A NumPy array or a PyTorch tensor, underneath, is a C array plus a little description of how to read it. A pointer to where the numbers start. What type they are, so how many bytes each. The shape. And something called strides.

B: Which is?

A: For each dimension, how far you jump in memory to take one step along it. So to find row i, column j, you start at the beginning, jump i times the row stride, then j times the column stride. The memory is always just one flat row of numbers. The shape and strides are a lens you put on top.

B: [working it out] So if I transpose a tensor...

A: Nothing moves. You just swap the strides. New lens, same block. Same with slicing every other element, and lots of reshapes. Which explains an error you've definitely hit. You transpose something, then try to flatten it with view, and PyTorch refuses.

B: Yes. And I just add contiguous and move on.

A: And now you know what that does. Flattening without a copy needs the numbers to sit in memory in the exact order you'd read them, and after a transpose they don't. Contiguous makes a real copy in the right order. And when a GPU kernel receives "a tensor", in C terms it receives a pointer and these few numbers. That's all a kernel ever gets.

<!-- section: The list, in C -->

B: Can you actually see what a Python list looks like on the C side?

A: You can, and it's small. Every Python object starts with the same two things. A count of how many pointers point at it, the refcount. And a pointer to its type, so float, or list, or whatever. Then a list adds its length, a pointer to that array of pointers, and how many slots it has room for.

B: Why would it have room for more than its length?

A: So append is cheap. When a list has to grow, it grabs about an eighth extra. So most appends just drop into a spare slot, and only once in a while does it have to go get a bigger block. And when you index a list, all that magic boils down to two pointer hops. Follow the list pointer, step along the array, and you've got the address of the thing you wanted.

B: And the refcount is how memory gets freed.

A: Right. In C you free memory by hand. You ask for a chunk, you get an address back, and nobody tracks who's still using it. Forget to give it back, you leak. Give it back and keep using it, and the crash shows up later, somewhere completely unrelated. So the real question in any C codebase is ownership. Whose job is it to free this? Python answers that with the refcount. Every new pointer to an object bumps it up, every dropped one takes it down, and at zero, the object's freed on the spot.

<!-- section: A kernel has no loop -->

A: [warm] One more, and it's my favourite. A GPU kernel. Which, by the way, is a different thing from the operating system's kernel. Same word. A GPU kernel is a function that runs on the GPU, and it looks like a C function with one twist. There's usually no loop.

B: How do you add two arrays with no loop?

A: You launch thousands of threads, and every one runs the same function. Each thread works out its own index from which group it's in and where it sits in that group. And then the body is one line. Out at i equals x at i plus y at i. With a little check that i isn't past the end, because you usually launch a few more threads than you need.

B: So the loop just... moved into the hardware.

A: That's the central idea of GPU programming, and once you see it, kernels stop being scary. And here's the nice part. That one line is word for word the plain loop at the bottom of the llama.cpp function from the issue.

<!-- section: Back to the issue -->

B: Okay, so, was the issue right?

A: So those lines that start with a hash aren't really C. They're instructions to a step that edits the file before the compiler sees it. And one of them says, only keep this next block if the chip is an Intel chip with a particular set of vector instructions, ones that add eight numbers at once. Your Mac and your Spark are ARM. They don't have those. So that whole fast block just gets deleted before compiling, and only the plain loop is left.

B: So the issue's right. It's not vectorized on ARM.

A: Right that there's no hand-written vector code there. But I compiled that plain loop on my Mac and looked at what came out, and the compiler had vectorized it by itself. It used ARM's own vector adds, four numbers at a time. So "isn't vectorized" is probably wrong. Which is the whole point. You don't have to trust the issue. You can look, or you can measure.

B: [amused] And then you can comment confidently on GitHub.

A: Carefully. Because C has one more trick that bit me. I made my summing benchmark run the loop five times and keep the best, and it reported zero time. The array never changed between runs, so the compiler just did the work once and threw the rest away. It promises you the same output. It never promised the same work. So if a C benchmark looks impossibly fast, it is.

<!-- section: Ending -->

B: Let me try and say it back. C looks scary, but it's really just memory with labels on it. Every value is a box with a size and an address. The star and the ampersand are just ways to talk about the address. A Python variable is a pointer to an object, a list is pointers to scattered objects, and a tensor is one flat block with a rule for finding things. And C's fast because it's close to the hardware.

A: All of that, except the last bit. "Close to the hardware" is the vague version. It's fast because the compiler knows every size and every place before the program runs, so it can turn your line into one instruction instead of a pile of questions. And that same thing, knowing exactly what's where, is what lets you read it. Which means the next time someone says some function is the reason your model is slow, you can just open the file.
