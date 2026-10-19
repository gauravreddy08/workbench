<!-- section: The Problem -->

A: [relaxed, thinking out loud] Say you're building a little service for your ranker. Someone hands it a document ID, it hands back that document's features, all precomputed. There are tens of millions of documents, and the features live in a file on disk, because, well, that was the easy thing to do. And each request needs a couple of hundred of these lookups. Is that fine?

B: I mean, it's a file read. Disks are slower than memory, sure. But it's an SSD, not some old spinning thing. I'd guess it's, what, ten times slower than RAM? Maybe?

A: That's the guess almost everybody makes. Ten times, maybe. The real answer is closer to a thousand.

B: A thousand.

A: About a thousand. And that's not a detail you tidy up later. If those lookups come out of memory, a couple of hundred of them take so little time nobody will ever notice. If they come off the SSD, one after another, the same request now takes long enough that your server tops out at a few dozen requests a second. Same code. Same algorithm. A thousand times apart. The only thing that changed is where the bytes were sitting.

B: [skeptical] Okay, but I've never really had a problem like that. Usually when something's slow I look at the algorithm.

A: And the algorithm's usually fine. That's the thing. Almost every "how does this scale" question is really the question "how many times do I touch the slow places, and how slow are they?" And if you don't carry a rough feel for how slow they are, you can't even start the answer.

<!-- section: Numbers everyone should know -->

A: [warm] There's a nice bit of history here. Back in two thousand and one, Peter Norvig wrote this essay called Teach Yourself Programming in Ten Years. And tucked near the end is a small table. How long it takes to grab something from the chip's closest memory, from main memory, to seek on a disk, to send a packet to Europe and back. And his advice was basically, know these.

B: Just, memorise a table.

A: Kind of. A few years later Jeff Dean put a longer version on a slide called "Numbers Everyone Should Know", and he took it around in his talks about building Google. And the point wasn't trivia. Google engineers had to pick a design before building it. So Dean showed how. Write down how many disk seeks, how many memory reads, how many network trips your design needs, multiply by the numbers, and compare. One of his examples was a web page full of image thumbnails. Read them off disk one after another, and the seeks alone make it slow. Ask for them all at once, and it comes back many times faster. No code written. Decision made.

B: Huh. That's a nicer reason to know them than "it's on the interview".

A: And the funny part is the exact numbers have drifted a lot since then. Spinning disks turned into flash, networks got faster. But the shape of that little table has barely moved. The shape is the thing worth having in your head.

<!-- section: Human scale -->

B: The problem is I don't feel nanoseconds. A hundred nanoseconds and a hundred microseconds both just sound like "fast" to me.

A: Nobody feels them. So here's a trick Brendan Gregg uses, and it really does stick. Stretch time by a billion. Pretend that grabbing a number from the chip's closest little memory, the fastest place there is, takes one second.

B: Okay. One second.

A: Then going out to main memory, RAM, takes a couple of minutes. Like you got up and went to fetch something from another room.

B: That's already a lot worse than I'd have thought.

A: And a random read from your SSD takes most of a day. And a round trip to a server in Europe? About five years.

B: [laughs] Five years.

A: Five years. And this is the feeling to keep: from the processor's point of view, every network call is an enormous trip. It could do hundreds of thousands of useful things while it waits. Hold onto that, because it's the whole argument for async code, which is coming up soon.

B: What about the GPU stuff? That's what I actually use.

A: A couple of fun ones there. Telling the GPU to start one small piece of work, launching it, is over an hour on that stretched clock. Which is why firing off thousands of tiny GPU operations is slow, no matter how fast the GPU is. And reading every weight of an eight billion parameter model out of the Spark's memory, once? That's about two years. And your server does that for every single token it writes.

B: [working it out] So the jumps aren't even. It's not like every step is ten times.

A: No, and that's worth noticing. From the closest memory to RAM is about a hundred times. RAM to the SSD is about a thousand. SSD to another continent is another couple of thousand. And inside each of those bands, things are within a few times of each other. Different machines will move the exact numbers around. The ordering and those rough ratios don't move.

<!-- section: Far, or big -->

B: [skeptical] So why is it like that, though? I get Europe being slow, it's far. But RAM is, what, a few centimetres from the chip. Why is that a hundred times slower than the cache?

A: Yeah, so there are really only two reasons something is slow to reach. It's far away, or it's big.

A: Far first. Light is slow at this scale. In one tick of a modern processor's clock, light goes a few centimetres. That sets hard floors. For Europe, distance is most of the cost. Real cables don't run straight, there are routers along the way, but even a perfect straight fiber can't get you there and back much faster. No budget fixes that. The only way to go faster is to not make the trip. Put a copy of the thing closer to the user.

B: And RAM?

A: For RAM, light is a rounding error. RAM is slow because it's big. Finding one byte among billions takes work that finding one byte among a few thousand doesn't. Longer wires inside, more steps to work out where the address is. And the bits have to be cheap to make it affordable, and cheap bits are slow bits.

B: Cheap how?

A: So main memory is called DRAM. Each bit is one tiny bucket of charge with a little tap on it. That's why it's so dense and cheap. But the buckets are so small you can't read just one. To read anything, the chip copies a whole row of bits out into a strip of sensing circuits along the edge, picks out the bytes you wanted, then writes the whole row back and closes it before the next row can open. And the charge leaks, so it has to keep rewriting everything many times a second just to remember it.

B: That's kind of a ridiculous way to store things.

A: [amused] It's ridiculous and it's why you can have a hundred and twenty eight gigabytes in a box on your desk. The fast memory, the caches, is a different kind called SRAM. Each bit is a little loop of a handful of transistors that just holds its value. Answers in a couple of clock ticks. But it takes so much space on the chip that you only get a tiny amount of it.

B: And the SSD?

A: The SSD is flash. It holds onto data with the power off by trapping charge in each cell. To read, it has to test a whole page of cells with a series of voltages and see which ones conduct. That sensing is slow, and it's most of why the SSD sits a thousand times below RAM. So the short version of the whole ladder is: small things can be fast, and fast things have to be small.

<!-- section: The desk and the library -->

B: But then how does anything run fast at all, if RAM is a couple of minutes away and most of my data's in RAM?

A: Because of the caches, and because of a habit programs have. Through the eighties and nineties, processors kept getting faster every year, and memory barely did. People started calling it the memory wall. And the fix was to put small, fast memories between the processor and RAM. Then more of them, in levels.

A: Think of a desk, a bookshelf, and a library across town. The few papers you're using right now are on the desk. The books for this project are on the shelf. Everything else is at the library. And most of the time, what you need is on the desk. That only works because programs reuse what they just used, and use things sitting next to what they just used. That habit is called locality.

B: And when it's not on the desk?

A: Then you go to the library. But you don't bring back one page. You bring back the whole chapter, because you'll probably want the next page too. The processor does exactly that. It never fetches one byte from RAM. It fetches a small chunk, called a cache line. And there's even a bit of hardware that watches you walk through memory and starts fetching the next chunks before you ask.

B: So if I walk through an array in order, I'm basically always on the desk.

A: Pretty much. And if you jump around randomly through ten gigabytes, you're at the library every time, no matter how clever your code is. The slice of data your program is actively touching is called its working set. If it fits on a rung, you run at that rung's speed. There's a whole episode coming about why NumPy is so fast, and it's really just this idea.

<!-- section: Two kinds of fast -->

A: [relaxed] Okay, there's one more piece, and mixing it up is honestly the most common mistake I see in performance reasoning. Everything I've said so far is about how long you wait for something to start arriving. That's called latency. But every rung has a second number. How many bytes per second flow once they're moving. That's bandwidth.

B: Isn't that the same thing? Fast memory is fast.

A: It feels the same, and it's not. Think of a pipe. Latency is how long the pipe is. Bandwidth is how wide it is. Or a highway. Latency is how long the drive takes. Bandwidth is how many lanes there are. Adding lanes doesn't get any one car there sooner. It just lets more cars arrive per minute.

B: [working it out] So, if I've got some API across the ocean, and it's slow... I'd upgrade my internet plan.

A: And it wouldn't help at all, if the API is chatty. Hundreds of tiny calls, and each one spends ages waiting for the round trip and almost no time actually moving bytes. You're stuck on the length of the pipe. A wider pipe does nothing.

B: And when does width matter?

A: When you're moving something big. Reading a whole model's weights out of memory is the perfect example. The little wait at the start is nothing. It's all about how wide the pipe is. Making memory respond quicker wouldn't change a thing. So small requests care about length, big transfers care about width, and the first question to ask about anything slow is which one it's stuck on. Waiting, or flowing.

B: And for my lookup service it's waiting.

A: For a few hundred small random reads, it's almost all waiting.

<!-- section: Keeping the pipe full -->

A: And that leads to the last idea, which is kind of the reason the next few episodes exist. Your SSD can move a lot of data per second. But if you ask for one small random read, wait for it, then ask for the next, you get a tiny fraction of what the drive can do. The drive isn't slow. You're leaving it idle.

B: Because it's sitting there between my requests.

A: Right. To use the full width of a long pipe, you have to have lots of requests in it at once. Enough to fill the length. There's a neat little rule for this called Little's law, and you'll see it again with queues. The amount in flight equals how fast things go through, times how long each one takes. Long pipe, wide pipe, you need a lot in flight.

B: [jumping in] Oh, so my lookup service could actually work off the SSD. If I fire off a bunch of reads at once instead of one after another.

A: That's the move. One request at a time, it falls over. Many outstanding at once, a single good drive can keep up with a lot of traffic. And the way you get many things in flight from one program is to not wait for each one before you start the next. That's concurrency, and it's what async is about.

<!-- section: What the stopwatch showed -->

B: Can you actually see these rungs yourself? Or is it all spec sheets?

A: You can see them, and it's one of the most satisfying things I've done on the Spark. You make an array where every slot holds the address of the next slot to visit, in random order, and you just follow it. The processor can't guess where it's going next, so every step is pure waiting. Then you grow the array. And you get a staircase. Flat while it fits in one level of cache, then a ramp up as it spills into the next, then flat again. You measure the size of each cache with nothing but a stopwatch.

B: That's kind of great.

A: The thing that surprised me, though, was Python. A single dictionary lookup in plain Python costs about as much as one of those cache misses. Which means for most Python code, the interpreter is the first bottleneck, way before memory is. You can't even see the fast rungs from Python until you take the interpreter out of the loop.

B: [amused] So the slow place is me.

A: Sometimes the slow place is Python. And the other thing it taught me is how easy it is to fool yourself. If you read the same file twice, the operating system has quietly kept a copy in spare memory, and your "SSD" suddenly looks as fast as RAM. Every too-good number I got turned out to be me measuring the wrong rung.

<!-- section: Ending -->

B: Okay, let me try and say it back. Data lives on a ladder. The closest memory, then RAM, then the SSD, then the network. Each step is way slower than the last, like a hundred, then a thousand, then thousands more. Fast stuff has to be small, so it can't hold much. And when something's slow, it's usually not the algorithm, it's how many times I'm hitting a slow rung. So I should memorise the numbers.

A: Mostly that. The part I'd sharpen is the memorising. The exact numbers will be different on your Mac and your Spark, and they'll drift every year. What you want in your head is the ordering and the rough ratios, a hundred, a thousand, a couple of thousand. And then, for anything slow, ask two things. How many times am I touching the slow place? And am I stuck waiting for the first byte, or stuck on how fast the bytes flow? Answer those, and you can usually pick the design before writing any code.
