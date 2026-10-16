<!-- section: The Problem -->

A: [relaxed, thinking out loud] Okay, quick one, no looking anything up. You read some data from RAM. Then you read the same amount from a fast SSD, one of the N V M E ones, the kind in your laptop. How many times slower is the SSD?

B: [casual, a bit unsure] I mean... ten times? Maybe? It's slower, but SSDs are supposed to be fast now. That's the whole point of them.

A: That's what almost everyone says. Ten times, maybe. The real answer is closer to a thousand.

B: [surprised] A thousand.

A: A thousand. And that's not a detail. That's, like, the difference between a feature that works and a feature that falls over the first time somebody actually uses it. So let me make it concrete. Say you're building a lookup service for your ranker. You give it a document ID, it hands back that document's precomputed features. You've got fifty million documents, and the features live in a file on disk, because, well, that was easy. And every request needs two hundred lookups. Is that fine?

B: Depends how long a lookup takes, I guess.

A: Right, that's the whole question. If a lookup comes from RAM, call it a hundred nanoseconds, then two hundred of them is twenty microseconds. Twenty millionths of a second. Nobody will ever notice that. Now if each lookup is a random read off the SSD, call it a hundred microseconds, two hundred of them is twenty milliseconds per request.

B: [working it out] And if they happen one after another... twenty milliseconds each, so one thread does, what, fifty requests a second?

A: Fifty a second, per thread that's sitting there waiting. That's your ceiling. Same code, same algorithm, a thousand times apart. And the only thing that changed is where the bytes lived. And honestly, every "how does this scale" question has this exact shape. The algorithm is usually fine. The question is how many times you touch slow things, and how slow those things are. And if you don't carry the numbers around in your head, you can't even start the answer.

B: Okay, so give me the numbers.

A: In a sec. One more guess first. RAM, a read that misses every cache and goes all the way out to main memory, is about a hundred nanoseconds. A random read of four kilobytes from a fast SSD, with nothing else going on, is somewhere around fifty to a hundred microseconds. So that's the five hundred to a thousand times. Now. A round trip from California to a server in Europe and back. How many times slower than that SSD read?

B: Hmm. The network's a lot slower than disk, I know that much... another hundred times?

A: About two thousand. Europe and back is around a hundred and fifty milliseconds. So from RAM all the way to Europe is, roughly, a million-fold. And look, if you were within a factor of three on each of those, you'd already be ahead of most engineers. If you said "ten times" for the SSD, well, that's exactly the gap this whole thing is about closing.

<!-- section: Origin -->

A: And people have been saying "just know these numbers" for a long time. In two thousand one, Peter Norvig wrote an essay called "Teach Yourself Programming in Ten Years". And tucked inside it there's this little table. Roughly how long it takes to fetch from the L one cache, from main memory, to seek on a disk, to send a packet to Europe and back. And his advice was just... know these.

B: [skeptical] That's it? Memorize a table?

A: That was it. Then a few years later Jeff Dean, at Google, put an expanded version on a slide called "Numbers Everyone Should Know", and he carried that slide through his talks on how Google's systems got built. And the point wasn't trivia. Google engineers had to pick a design before building it, and Dean showed how. You write down how many disk seeks, how many memory reads, how many network trips a design needs. Multiply by the numbers. Compare. One of his examples was a page that shows thirty image thumbnails. Read them one after another off disk, and the seeks alone cost about three hundred milliseconds. Issue all the reads in parallel, and the whole page takes under twenty.

B: [amused] So he decided the design without writing any code.

A: No code written, decision made. That's what the numbers are for. And that table's been copied into, I don't know, a thousand blog posts since. The exact values have drifted. Spinning disks got replaced by flash, networks got faster. But the shape has barely moved. And the shape is the thing you actually want in your head.

<!-- section: The Idea: The units -->

A: So, units first, because everything lives in three of them, and each one's a thousand times the last. A nanosecond is a billionth of a second. That's the CPU's world. A four gigahertz processor ticks four times every nanosecond. A microsecond is a millionth of a second, so a thousand nanoseconds. That's the world of SSDs and the operating system. And a millisecond is a thousandth of a second, a thousand microseconds. That's networks, and humans. A blink is about a hundred to four hundred milliseconds. And going up one unit is a factor of a thousand. Which, in everyday life, is the difference between one second and a quarter of an hour.

B: Huh. Okay, that's a useful way to feel it. Nanoseconds to microseconds is "instant" to "go make a coffee".

A: Pretty much.

<!-- section: The Idea: The ladder -->

A: Now picture all of it on one ladder. One long chart, where every step to the right is ten times longer than the last, so the whole range fits on one screen. Some bars are hardware, and some are things your own code does, like a Python call or a GPU launch or an API call. And at the very top there's a single tick of the CPU's clock, about a third of a nanosecond. Then an L one cache hit. L one is the tiny cache sitting right inside the core, and a hit there is about one nanosecond. That's your unit, basically. Then L two, a bigger cache a little farther out, around four nanoseconds. Then L three, the last cache before main memory, shared by a bunch of cores, maybe fifteen.

B: Where does my Python code sit on that?

A: Right below that. A Python dictionary lookup is around twenty-five nanoseconds, and a Python function call is around fifty. So a function call in Python is already slower than an L three hit. Then main memory, D RAM, about a hundred nanoseconds. And that's the most important rung to remember. Then there's a big gap, and you're into microseconds. Launching one GPU kernel from PyTorch, about five microseconds. A packet to your own machine and back, through the kernel's network code, maybe thirty. Reading a whole megabyte out of RAM, in order, about fifty. A random four kilobyte SSD read, about eighty—

B: [jumping in] Hang on. A whole megabyte out of RAM is quicker than four kilobytes off the SSD?

A: Yep. Hold on to that one, it's a different kind of number, and we'll get to why. A round trip inside a datacenter, about two hundred. Reading a megabyte from the SSD, in order, around a quarter of a millisecond. And then milliseconds. An old spinning hard disk seek, around five. A trip to a server in a nearby city, around ten. Reading all sixteen gigabytes of an eight billion parameter model out of the Spark's memory, fifty-nine milliseconds. Coast to coast in the U S, about seventy. California to Europe and back, a hundred and fifty. And at the very bottom, an LLM API's time to first token. About half a second, and more for long prompts.

B: [working it out] So where are the big jumps? Because a lot of those feel kind of... clustered.

A: That's exactly the thing to notice. From L one to RAM is about a hundred times. From RAM to the SSD is about a thousand. From the SSD to another continent, about two thousand. And inside each of those bands, things are within a few times of each other. And all of this is approximate. A cache hit on your Mac and on the Spark will differ. An Apple SSD and a server SSD will differ. Your network depends on where you're sitting. What doesn't change from machine to machine is the order, and the rough ratios. That's what you want to carry around.

<!-- section: The Idea: Human scale -->

A: Thing is, nanoseconds are too small to feel. So here's a trick Brendan Gregg uses in his book "Systems Performance", and it really sticks. Stretch time by a billion. Pretend an L one cache hit takes one whole second. So, if L one is one second, how long's a RAM read?

B: RAM's a hundred times L one, so... a hundred seconds. Under two minutes.

A: About one point seven minutes. Like you got up to fetch something from another room. And an SSD read, eighty microseconds?

B: [working it out] Eighty microseconds times a billion is... eighty thousand seconds. Which is... a lot of hours.

A: About twenty-two hours. Most of a day. A round trip inside the datacenter is a bit over two days. Europe and back is about four point eight years.

B: [laughs] Years.

A: Years. And an LLM's time to first token, half a second, is about sixteen years. And here's the feeling you want out of that. From the CPU's point of view, every network call is a really long trip. It could do hundreds of thousands of useful things while it waits. Which is, honestly, the whole argument for async code. A few more on that scale. A Python function call is about a minute. A GPU kernel launch is over an hour. Which is why launching thousands of tiny GPU operations is slow, no matter how fast the GPU itself is.

B: [surprised] Wait, so the GPU's just... sitting there between launches?

A: A lot of the time, yeah, if the operations are tiny. And the last one's the one to keep in mind. Reading every weight of an eight billion parameter model out of the Spark's memory, on that stretched scale, is about two years. And your server does that once for every token it generates.

B: Every token. Okay. That one's going to come back.

A: It's going to come back.

<!-- section: The Idea: Far and big -->

A: So why's there a ladder at all? There are really only two reasons something's slow to reach. It's far away, or it's big. Far first. Nothing goes faster than light, and at these scales light is honestly kind of slow. About thirty centimeters per nanosecond in a vacuum, about twenty in glass fiber or copper. During one tick of a four gigahertz clock, light covers seven and a half centimeters. That sets hard floors. So take three trips. From the core to RAM is maybe five centimeters, so light alone does the round trip in about half a nanosecond. But what you actually see is about a hundred. Across a datacenter, call it a hundred meters, light's round trip is about a microsecond. What you see is fifty to five hundred microseconds. And California to Amsterdam is about eight thousand eight hundred kilometers. Light in fiber needs about ninety milliseconds for the round trip. What you see is a hundred and forty, a hundred and fifty.

B: [skeptical] So for Europe... can't you just pay for a better line? Like, a cloud provider sells you a twenty millisecond link?

A: [firmly] No. And this is the one where money can't help you. Light in fiber goes about two hundred thousand kilometers a second. Eight thousand eight hundred there, eight thousand eight hundred back, that's seventeen thousand six hundred kilometers, and that's at least ninety milliseconds even on a perfectly straight cable. Real cables don't run straight, and the routers add a bit, so a hundred and forty, a hundred and fifty is normal. You will never get under about ninety. No budget fixes that. The only way to go faster is to not make the trip. Put a copy of the service, or the data, closer to the user.

B: Okay, but then the datacenter one. A hundred meters, a microsecond of light, and it takes hundreds of microseconds?

A: Yeah, for the datacenter, light's a rounding error. The cost is the network cards, the switches, and the operating system's network code on both ends. And for RAM, light's a rounding error too. Half a nanosecond, out of a hundred.

B: So then why is RAM a hundred times slower than L one? It's like five centimeters away.

A: That's the second reason. Big. Finding one byte among a few billion just takes work that finding one byte among sixty-four thousand doesn't. The bigger a memory is, the longer its wires inside, the more steps it takes to decode an address, and the cheaper, and slower, each bit has to be, just so the thing's affordable. And on the way out, your request checks every cache level first and misses each one. That's the real reason for the ladder inside a machine. Small things can be fast. And fast things have to be small. So if you drew it, it'd be boxes inside boxes. The innermost box is the core, with L one inside it, about a nanosecond. Around that is the CPU die, the actual slab of silicon, with the other cores next to yours, and L two, megabytes, about four nanoseconds, and L three, tens of megabytes, about fifteen. Around that is the chip package, and sitting in there next to the die is the D RAM. Tens of gigabytes, a hundred nanoseconds. Then the board, the whole machine. Out there's the SSD, terabytes, about eighty microseconds. And the network card, with an arrow going off the edge of the board to other machines. Point two milliseconds to the datacenter, a hundred and fifty to Europe. Every box outward, more room, more time.

<!-- section: The Idea: What the memories are made of -->

A: You don't need circuit diagrams for this, but a cartoon of each kind of memory explains its rung really well. Caches are made of something called S RAM. Static RAM. Each bit is a little loop of about six transistors, and it holds its value as long as there's power. It's fast, and it doesn't need any upkeep, but it takes a lot of chip area per bit. So it answers in a few clock ticks, but you can only afford kilobytes to tens of megabytes of it.

B: And RAM is something different?

A: Main memory is D RAM. Dynamic RAM. Here each bit is one tiny capacitor, think of it as a bucket of charge, plus one transistor, which is the tap on the bucket. So it's super dense and super cheap, which is how you get billions of bits on a chip. But the charge leaks away. So every row has to get rewritten many times a second, just to keep the data alive.

B: [a bit unsure] Okay, but if each bit is just a bucket, why can't you read the one bucket you want? Why's that a hundred nanoseconds?

A: Because the buckets are so small you can't read one directly. To read anything, the chip first copies an entire row, thousands of bits, into what's called the row buffer. That's a strip of sensing circuits along the edge of the memory bank. Then it picks out the bytes you actually asked for. Then it writes the row back and closes it, before the next row can be opened. Each of those steps is on the order of ten to fifteen nanoseconds. Then add the trip through the caches, and through the memory controller, which is the part of the CPU chip that talks to the D RAM chips. It queues up requests, opens and closes rows, schedules those refreshes. And all that together lands you at about a hundred nanoseconds.

B: [working it out] So it reads thousands of bits just to hand me a few bytes.

A: Every single time. And flash is the same kind of idea, just way slower. SSDs are NAND flash. Same stuff that's in your phone. Each cell traps a small amount of charge, and that charge stays put with the power off, which is why your files survive. To read, the chip applies a series of test voltages to a whole page of cells, several kilobytes, and senses which ones conduct. And that sensing takes tens of microseconds. That's most of why an SSD read is a thousand times slower than RAM. Writing's even slower, and erasing only works on big blocks at a time. Which is why an SSD has a small computer inside it, the controller, juggling where everything goes.

B: And spinning disks? Since they're in Norvig's table.

A: They're why the old tables look so grim. A seventy-two hundred R P M disk turns once every eight point three milliseconds. So on average you wait about four milliseconds just for your data to rotate under the head, plus the time for the arm to swing over. That's the "disk seek, ten milliseconds" that made engineers in the two thousands kind of allergic to random reads.

B: So D RAM and flash are kind of doing the same move. Read a big chunk, hand back a little piece.

A: [thinking out loud] Same move, yeah. If you put them side by side... On the D RAM side you've got a grid of cells. One row lights up, gets copied whole into the row buffer underneath, and then one little sixty-four byte piece comes out the bottom. Open the row, fifteen nanoseconds. Read the columns, fifteen. Close the row, fifteen. On the flash side, a stack of pages, each four to sixteen kilobytes. One page gets sensed into a page buffer, and that's the twenty-five to a hundred microseconds. Then four kilobytes go out to the CPU, which takes a few more microseconds. Flash just takes thousands of times longer to do it.

<!-- section: The Idea: Why caches exist -->

A: Okay, so why do caches even exist? Through the eighties and nineties, CPUs got faster by roughly half again every year. D RAM got bigger, but its latency barely improved. And by the mid-nineties people had a name for it. The memory wall. Two researchers, Wulf and McKee, named it in a little paper in nineteen ninety-five. A CPU that could do hundreds of operations in the time it took to fetch one value from RAM. And the fix was to put small, fast S RAM caches between the core and RAM. And then more of them, in levels. L one, L two, L three.

B: But a cache only helps if you ask for the same thing again.

A: Or for things next to what you just asked for. And real programs do both, all the time. That habit has a name, locality. A loop reuses the same few variables, that's reusing recent data. Walking through an array touches neighbors one after another, that's using what's next door. Think of it like a desk, a bookshelf, and a library across town. The papers you're using right now are on the desk. That's L one. The books for this project are on the shelf, L two and L three. Everything else is at the library. That's RAM. Most of the time what you need is on the desk. And when it's not, you don't fetch one page. You bring back the whole chapter, because you'll probably want the next page too. And the CPU does exactly that. It never fetches one byte from RAM. It fetches a cache line, a fixed-size chunk. Sixty-four bytes on most chips, a hundred and twenty-eight on Apple Silicon. And often it grabs the next few lines too, because of a piece of hardware called the prefetcher, which watches your access pattern and fetches the next lines before you ask. Great when you're walking in order, or in even strides. Useless when you're jumping around at random.

B: [working it out] So my ranker feature lookup, random document IDs, that's... the prefetcher can't do anything for me.

A: Can't do anything. And that's where the idea of a working set comes in. It's the data your program actually touches over a short window of time. If your working set fits in L one, you live on the top rung. If it's ten gigabytes of scattered lookups, you live on the RAM rung, no matter how clever your code is. That's the idea underneath why NumPy is a hundred times faster than a Python loop, and you're about to see it directly in your own measurements.

<!-- section: The Idea: Latency and bandwidth -->

A: So far every number I've given you has been one kind of number. How long you wait for something to start arriving. That's latency. And there's a second number for every single rung, and mixing the two up is, honestly, the most common mistake in performance reasoning.

B: [a bit unsure] I think I mix them up. Like, in my head "fast" is just fast. A gigabit connection is fast, so it's low latency, right?

A: That's the mix-up, exactly. A gigabit is a bandwidth. It says nothing about latency. Latency is how long until the first byte shows up. Bandwidth is how many bytes per second flow once it's actually moving. People also call that throughput when they're talking about work getting done. Think of it as a pipe. Latency is how long the pipe is. Bandwidth is how wide it is. Or a highway. Latency is how long the drive takes. Bandwidth is the number of lanes. Adding lanes doesn't get any single car there faster. It just lets more cars arrive per minute. So a long, wide highway and a short, narrow one can deliver the same number of cars per hour, with totally different waits for the first car.

B: So RAM is a...

A: RAM's a short, fat pipe. About a hundred nanoseconds long, hundreds of gigabytes a second wide. The link to Europe is a long, thin one. A hundred and fifty milliseconds long, and on a home internet connection, maybe sixty megabytes a second wide. And there's one little formula worth keeping. The time to move a chunk of data is the wait, plus the size divided by the bandwidth. So, the latency, and then however long the bytes take to pour through.

B: Okay, say it with a real example.

A: Sure. A four kilobyte read from the SSD. The wait is about eighty microseconds. The pouring part, four kilobytes at seven gigabytes a second, is well under one microsecond. So it's almost entirely waiting. Now read a whole gigabyte off that same drive. The wait's still eighty microseconds, but pouring a gigabyte at seven gigabytes a second takes about a seventh of a second. So now it's almost entirely pouring. When the size is small, latency dominates and bandwidth barely matters. When it's big, bandwidth dominates and latency barely matters. And there's a size where the two halves are equal, which is just latency times bandwidth. Below that size you're waiting. Above it you're pumping.

<!-- section: The Idea: Predict, sixteen gigabytes -->

A: So here's the one that matters for you. The Spark's memory has a spec-sheet bandwidth of about two hundred seventy-three gigabytes a second. An eight billion parameter model in B F sixteen is sixteen gigabytes of weights. How long does it take to read all of it, once?

B: [working it out] Wait, why sixteen? Oh, B F sixteen is sixteen bits per weight, so two bytes. Eight billion times two, sixteen gigs. Okay. Sixteen divided by two seventy-three is... a bit less than a tenth... like sixty milliseconds?

A: Fifty-nine milliseconds. And the hundred nanoseconds of latency doesn't matter at all here. This is pure bandwidth. Now pull those same sixteen gigabytes from a server across a one gigabit home network.

B: One gigabit a second, sixteen gigabytes... sixteen seconds?

A: [gently] That's the trap. Network speeds are quoted in bits per second. Memory and storage are quoted in bytes. Eight bits to a byte. So one gigabit a second is a hundred twenty-five million bytes a second. Sixteen gigabytes divided by a hundred twenty-five megabytes a second is a hundred twenty-eight seconds. Over two minutes. Same bytes, about two thousand times longer, and again latency doesn't matter at all.

B: [sighs] Divide by eight. Okay. I'm going to get that wrong again at some point.

A: [laughs] Everyone does. And that fifty-nine milliseconds is basically the heart of why your Spark generates tokens as fast as it does. To generate one token, the model has to read every weight once. One second divided by fifty-nine milliseconds is about seventeen. So about seventeen tokens a second, at most. That's a ceiling set purely by bandwidth, before you've run a single line of code. And in practice it's a bit less, because you never quite hit the spec-sheet peak.

B: And if the model didn't fit in memory at all, and you streamed it off the SSD?

A: An SSD at seven gigabytes a second, sixteen divided by seven, is about two point three seconds per token. Under half a token a second. Same model, roughly forty times slower, and the only difference is which pipe the bytes came through.

<!-- section: The Idea: Waiting vs flowing -->

A: There's a slider version of this that really makes it click. Five pipes, stacked. The Spark's RAM, a hundred nanoseconds and two seventy-three gigabytes a second. An N V M E SSD, eighty microseconds and seven gigabytes a second. A datacenter network, two hundred microseconds and a hundred gigabits. A home LAN, half a millisecond and a gigabit. And the internet to Europe, a hundred fifty milliseconds and five hundred megabits. Each pipe gets a bar, split into a hatched part, which is waiting, and a solid part, which is bytes flowing. And you drag the size. At sixty-four bytes, a single cache line, RAM is almost all hatched. All waiting. At four kilobytes, the SSD is still almost all waiting. Drag it all the way up to sixteen gigabytes, a model, and RAM goes completely solid. All flowing. And the Europe bar stays mostly hatched for anything below about ten megabytes.

B: [skeptical] Ten megabytes is a lot. So any API call I make across the ocean is basically all waiting?

A: Basically all waiting. Which is why a chatty API, lots of small calls, feels terrible across an ocean, while one big download feels fine. And this is where people reach for the wrong fix. If your service makes hundreds of tiny calls to a server across the Atlantic, a faster internet plan does nothing. Each call spends a hundred fifty milliseconds waiting and almost no time transferring. And the other way around. Reading a sixteen gigabyte model out of memory, lower memory latency would do nothing, because a hundred nanoseconds is a rounding error next to fifty-nine milliseconds of pouring. So it's worth carrying a few bandwidths alongside the latencies. All rough, and the spec-sheet ones are peaks you won't quite hit. One CPU core reading RAM gets somewhere between ten and a hundred gigabytes a second, because one core can't keep enough requests going at once to fill the bus. Hold on to that. A base Mac with an M series chip has around a hundred to a hundred twenty gigabytes a second of unified memory, and the Max chips go up to about four hundred to five hundred fifty. The Spark is about two seventy-three. That comes straight from the memory spec. A two hundred fifty-six bit wide bus, doing eight thousand five hundred thirty-three million transfers a second, divided by eight to get bytes. A datacenter GPU like the H one hundred has about three thousand three hundred fifty gigabytes a second—

B: [surprised] Three thousand? Next to the Spark's two seventy-three?

A: More than ten times as wide. That's a big part of why big GPUs decode so much faster. An N V M E SSD reading in order does three to seven gigabytes a second on P C I E four, ten to fourteen on P C I E five. But only with big reads, or lots of them in flight. A hundred gigabit datacenter network is about twelve and a half gigabytes a second. Gigabit ethernet, a hundred twenty-five megabytes a second. And home internet, anywhere from ten to a hundred twenty-five megabytes a second.

B: All the network ones I divide by eight.

A: All the network ones, divide by eight.

<!-- section: The Idea: Bytes in flight -->

A: Now, one more idea ties latency and bandwidth together, and it's kind of the reason the next few lessons exist. Your N V M E drive can deliver several gigabytes a second. But one random four kilobyte read takes about eighty microseconds. So if you issue one read, wait for it, then issue the next, you get four kilobytes every eighty microseconds. Which is about fifty megabytes a second.

B: Fifty megabytes? Out of seven gigabytes? So the SSD's just... not as fast as the box says.

A: [gently] The drive's fine. You're leaving it idle. That's about one percent of what it can do. To use a pipe's full bandwidth, you need enough requests in flight at once to fill its whole length. And that's a rule called Little's law. In any steady system, the number of things inside equals the rate they arrive, times how long each one stays. Say a coffee shop serves two customers a minute and each one hangs around for five minutes. There are about ten people inside at any moment. For storage and networks, it becomes: bytes in flight equals bandwidth times latency.

B: Okay, so for the SSD...

A: For the SSD, seven gigabytes a second times eighty microseconds is about five hundred sixty kilobytes. That's about a hundred forty reads of four kilobytes, all outstanding at once, to keep the drive busy. For the Spark's RAM, two seventy-three gigabytes a second times a hundred nanoseconds is about twenty-seven kilobytes. Which is about four hundred thirty cache lines of sixty-four bytes, all outstanding at once.

B: Four hundred thirty misses at once. Can a core even do that?

A: No. And that's the point. A single CPU core can only keep track of a few dozen outstanding cache misses. So one core can't reach the Spark's two seventy-three, however hard it tries. The GPU, with thousands of threads each waiting on their own loads, can get a lot closer. And for SSDs, the number of requests outstanding has a name, queue depth. Queue depth one means one at a time. Fast SSDs need a queue depth of thirty-two or more to hit their rated speed. And spec sheets quote I O P S, I O operations per second, how many separate reads or writes the drive finishes in a second. And they quote it at a high queue depth. Not one at a time.

B: So the number on the box assumes I've got, like, thirty-two reads going at once.

A: It does. And the way you get lots of things in flight from one program is just to not wait for each one before you start the next. That's concurrency, and that's exactly what the async stuff is about.

<!-- section: The Idea: The feature store -->

A: So let's actually use all this. Back to something like your lookup service, but bigger. A feature store has to serve fifty thousand lookups a second. Each one's a random one kilobyte record, and the whole dataset is two terabytes. Can that come from SSD, or does it need RAM?

B: [working it out] Okay. SSD read is eighty microseconds. One at a time, that's... a second divided by eighty microseconds, twelve thousand five hundred a second. That's way short of fifty thousand. So, RAM?

A: One blocking thread can't keep up, you're right. But that's the one-at-a-time number. A good N V M E drive does hundreds of thousands of random reads a second if you keep enough in flight. So use Little's law. Fifty thousand a second, times eighty microseconds each. How many are in flight?

B: Fifty thousand times eighty millionths... four?

A: Four. On average, four reads outstanding. That's easy. So one SSD can do it, as long as the server issues reads concurrently, with async, or a thread pool, instead of one by one. Leave some headroom for the slow tail, the p ninety-nine, the slowest one percent of reads. So maybe two drives, or plan for ten or twenty in flight.

B: And RAM would just be faster, though.

A: A thousand times faster per lookup. But two terabytes doesn't fit in one normal machine. At a hundred twenty-eight gigabytes a box, like the Spark, you'd need about sixteen machines just to hold it. More with replicas. So the sensible design is SSD for the bulk, and you cache the hot keys, the ones that get asked for a lot, in RAM. And then there's a separate question, which is latency. If each request chains ten lookups, where each one depends on the last, the SSD adds about a millisecond per request. RAM would add about a microsecond. So how long that chain is decides whether SSD is okay for latency. And that's a different question from whether it can keep up with the throughput.

B: [slowly] Huh. So "can it keep up" and "is it fast enough per request" are two different answers.

A: Two different answers, from the same two numbers.

<!-- section: Build It -->

A: [relaxed] Okay. Now you put a measured number next to every rung, on both machines, the Mac and the Spark. It's about two evenings. One for the reading and the C benchmark, one for disks and network. And before you run anything, you write your guesses down. Then you see how wrong you were. First, just find out what the chip claims about itself. On the Mac that's a command called sys C T L, which tells you the chip name, the cache line size, the memory page size, and the L one and L two sizes for the performance cores and the efficiency cores separately. On the Spark it's L S C P U, which lists every cache level with its size and how many cores share it. The Spark mixes two kinds of cores, and the ones with the higher clock speed are the big ones. You write down L one, L two, L three, the line size, the page size. On Apple Silicon you should see a hundred twenty-eight byte cache line and sixteen kilobyte pages. On the Spark, sixty-four byte lines. Apple's last-level cache, the system-level cache, might not show up at all, so you look up your chip. And those sizes are where the steps in your staircase should land. I'll get to the staircase.

A: Then you time Python, because that's where you live. There's a tool called time it that runs one statement millions of times and gives you the best time per loop. You time an empty function call, a dictionary lookup, and just adding one to a number. That last one's your floor, the cost of one trivial operation plus the tool's own loop. Subtract it from the other two.

B: And that gets me the fifty and twenty-five nanoseconds from the ladder.

A: Roughly, yeah. Then you try to see the caches from Python. You build a big list where each slot holds the index of the next slot to visit, all in one random loop, and you time hopping through it, after one warm-up pass, for a few million hops so the timer's own cost disappears. A thousand slots, then ten million. And what you'll find is the small list costs tens of nanoseconds per hop. Not one. The interpreter's own work for each hop is bigger than the L one and L two latencies you're trying to see. So they just vanish. The big list is slower, because it really does miss cache, but the steps between levels get smeared out. Which is why the real measurement is in C.

<!-- section: Build It: Pointer chasing in C -->

A: So, the C one. And this is the clever part. The trick for measuring latency instead of bandwidth is to make every load depend on the one before it. Same array as before, each slot holds the index of the next one to visit, in random order. Then you just loop: go to wherever this slot points. The CPU can't know where to go next until the current load finishes. So it can't overlap them. And because the order's random, the prefetcher can't guess ahead. The name for this is pointer chasing. Every step costs exactly one full latency, nothing hidden.

B: Why does the random order have to be one big loop, though? Couldn't you just shuffle the array?

A: [amused] That's the trap the hint is about. If you just shuffle with the normal algorithm, Fisher-Yates, you usually get a bunch of separate little loops. And you might start in one that's, like, twelve slots long. Then you'd chase around a tiny loop that fits in L one forever, and think your RAM is amazing. So you use Sattolo's algorithm. Which is Fisher-Yates with literally one character changed, and it always gives you one single loop through every slot. You start from an array where every slot points to itself, and apply that. The rest of the harness is given to you. It runs sizes from four kilobytes up to a gigabyte, doubling each time, and for each one it builds the loop, does one warm-up pass, then times twenty million hops and prints nanoseconds per load. You write the two pieces. Building the loop, and following it. You'll need random numbers up to about a hundred twenty-eight million. The standard rand function is fine, a little xor shift generator is a nicer exercise. Print where you ended up, because if the result's never used, the compiler is allowed to delete your whole loop. On the Spark you pin it to one of the big cores with a tool called task set. The Mac won't let you pin threads, but a single busy thread usually lands on a performance core. Expect a little noise. And if you want a smoother curve, step the size up by about one point four instead of doubling.

<!-- section: Build It: Bandwidth, GPU, disk, network -->

A: Then the other number, bandwidth. You allocate two one gigabyte buffers, write to every byte of both once, then time ten big memory copies of one into the other.

B: Why write to them first?

A: Because until you touch memory, the operating system hasn't actually given it to you. It just promised it. So the first touch would get timed as part of your copy. And when you report it, a copy reads a gigabyte and writes a gigabyte, so the memory traffic is twice the bytes copied. Report both. And print one byte from the destination at the end, so the compiler can't decide the copies were pointless. That's one core, so compare it with the spec sheet and see how far below it you land.

B: Which it will, because one core can't keep enough misses going at once.

A: [amused] Which it will. For a stretch, split the copy across four or eight threads, and watch the total climb, and then flatten. And on the Spark, you also measure what the GPU sees, because that's what'll actually be reading your model's weights. In PyTorch, two four gigabyte tensors on the GPU, copy one into the other once to warm up, then time twenty copies. And you have to call synchronize before you start the clock and before you stop it. GPU calls come back immediately and run in the background. So without it, you're timing nothing. Then you time ten thousand launches of a tiny operation, adding one to a single-number tensor, with one synchronize at the end, and divide. The first number, next to two seventy-three, is your real ceiling for tokens per second. The second tells you why a model that runs thousands of tiny kernels per token can be slow, even when the GPU's mostly idle.

A: Then the SSD. And here there's a sneaky problem. The operating system keeps recently read file data in spare RAM. That's called the page cache. A second read of the same file usually never touches the disk at all. So if you don't get around it, you measure RAM and call it an SSD.

B: So how do you get around it?

A: Differently on each OS. On the Mac you set a flag on the open file called F no cache, which asks the OS not to cache your reads. And you run purge after you make the test file, so whatever got cached while you were writing it gets thrown out. On Linux you open the file with O direct, which skips the page cache completely. The catch is everything has to be lined up to the block size. The buffer, the offset, the read size. Four kilobytes is safe. And a trick for the buffer is to grab one with M map, which always gives you page-aligned memory. Then you make a four gigabyte file of real random bytes, and write two measurements. Two thousand random four kilobyte reads, one at a time, each one timed, and report the median and the p ninety-nine. And then read the whole file in order, in one megabyte chunks, and report gigabytes per second.

B: [skeptical] Wait, in Python? You just said Python was too slow to see the caches.

A: And it is, for the caches. But Python's overhead per call is around a microsecond, and an SSD read is tens of microseconds. So here the interpreter's a small error. And knowing when overhead matters, and when it doesn't, that's kind of the skill. Then you cross-check with F I O, the standard disk benchmarking tool. Once with one read at a time, once with thirty-two in flight, and compare the I O P S and the latency percentiles. That's queue depth, happening in front of you. On the Mac the thirty-two-in-flight run needs a different I O engine, and if F I O won't skip the cache there, run purge first and drop that option.

A: And last, the network, at three distances. Ping your own machine, which never leaves the box. Ping your home server over Tailscale, and use Tailscale's own ping, which tells you whether you're going direct or through a relay. Then a far region. You use curl against a storage endpoint in Frankfurt, and one in Sydney, and read off the connect time minus the name-lookup time. A TCP connection takes about one round trip to set up, so that's your round trip. Then you write a tiny echo pair in Python, a server that sends back whatever it gets, and a client that sends one byte and waits for it, ten thousand times on your own machine. The difference between that and ping is Python and the socket code on both ends.

B: And the relay thing? Why would it go through a relay?

A: Sometimes Tailscale can't make a direct connection and bounces you through one of its relay servers, which it calls DERP servers. Then the round trip's way longer than the distance suggests. Which is a fun one to chase down another time. And then you have an agent write a little plotting script for the staircase, both machines on one chart, log scale on both axes, with dashed lines where your cache sizes are.

<!-- section: Measure -->

A: So what should all that look like? And remember the table you fill in. Your guess goes in first, then the real number, then the Mac number stretched to human scale. The textbook ranges are a guide, not a target. So, start with the staircase, because it's the best part. Before you plot it, where do you think the curve jumps?

B: [working it out] At the cache sizes, I guess. So it's flat while the array fits in L one, then it jumps when it doesn't fit anymore... and again at L two, and L three, and then it's RAM.

A: That's the shape. Flat, around one nanosecond, while the array fits in L one. That's up to about a hundred twenty-eight kilobytes on an Apple performance core, about sixty-four on the Spark's big cores. Then a step up to a few nanoseconds until it outgrows L two. Apple shares a big L two, around twelve to sixteen megabytes, across a cluster of performance cores. The Spark's cores each have a smaller L two of their own, plus an L three they share. On Apple there's also a short shelf in the tens of nanoseconds for that system-level cache, which it shares with the GPU. And then it climbs to about a hundred nanoseconds or more once the array's way bigger than any cache.

B: Are they clean steps? Like cliffs?

A: Ramps, not cliffs. Caches don't evict things perfectly, so as your array outgrows a level, some of it still hits for a while. If you drew it, it's nanoseconds per load going up, array size going across, both stretched so every step is ten times. A flat line at one, a ramp, a flat line at a few, a ramp, a short shelf, a ramp up to the hundred. And the height of each flat part is that level's latency. The position of each ramp is that level's size. So if your L one plateau ends right about where sys C T L or L S C P U said, you've just measured a cache with nothing but a stopwatch. And if the whole curve is flat, something's broken.

B: You said it keeps going up after RAM, though. What's that?

A: Yeah, past the D RAM step it keeps rising slowly. That's the TLB running out. Every address your program uses is a virtual address, and it has to be translated to a physical one. The TLB, translation lookaside buffer, is a small cache of recent translations. With a huge random working set, those translations miss too, and then the CPU has to go walk the page tables, which themselves live in memory. Apple's sixteen kilobyte pages each cover four times as much memory as four kilobyte pages, so the Mac might hit this a bit later. Then Python. The function call and the dict lookup should land in the tens of nanoseconds. That's roughly an L three hit, or a third to half of a RAM read. And that surprises people. It means a tight Python loop is slow in the same units as a cache miss. So for Python code, the interpreter's usually the first bottleneck, not memory.

B: [surprised] So a tight loop in Python is basically missing L three on every step. Even when the data's sitting right there.

A: In cost, basically, yeah. Bandwidth next. One core's copy traffic should come in well under the spec-sheet number, often by two to five times. That's the bytes-in-flight thing again. One core just can't keep enough misses outstanding. The GPU copy on the Spark should get a lot closer to two seventy-three, but not reach it. Somewhere around seventy to ninety percent of peak is typical for a good copy on most hardware, but your measurement's the one that counts. And whatever you get, divide sixteen gigabytes by it, and you've got a better tokens-per-second ceiling than the spec sheet ever gave you. The GPU launch should come out at a few microseconds, two to ten.

B: And the SSD?

A: The random four kilobyte median should be tens of microseconds, maybe up to about a hundred. The p ninety-nine, several times higher, because the controller's occasionally busy with its own housekeeping. Reading in order should be in gigabytes a second, two to seven. And here's a fun check. Take the in-order bandwidth and divide it by four kilobytes. That's how many reads a second you'd get if the drive was always busy. Then compare it with one divided by your random latency, which is what you get one at a time. The gap's usually twenty to a hundred times. And that gap is exactly the queue depth story. Then F I O at a queue depth of thirty-two should close a lot of it.

A: And the network. Pinging your own machine should be tens of microseconds, and your Python echo a little more. The home server over Tailscale, on the same Wi-Fi, a few milliseconds, one to five, with some jitter from the Wi-Fi itself. Ten to fifty if it's far away, or relayed. The far regions should be close to what light in fiber predicts, plus thirty to sixty percent. Frankfurt from the U S West Coast is around a hundred fifty milliseconds. Sydney is around a hundred fifty to two hundred. So work out the light-speed floor from the distance yourself, and see how close the internet actually gets. And you're done when the chase program prints a clear staircase on both machines and you can point at each step and name the cache level. When every rung has your own number, for both machines, or a reason why not. And when you can say, without looking, your measured RAM latency, your SSD's random read latency, and how far below two seventy-three the Spark's GPU copy landed.

<!-- section: Break It -->

A: [amused] And then you break it. Four ways, each one on purpose. First. What if, in the chase program, you just walk the array in order, slot one, slot two, slot three, instead of following the random pointers?

B: Then it's... I guess still RAM? Same array, same memory.

A: Same memory. But the gigabyte-sized runs suddenly cost a few nanoseconds per element instead of a hundred. Same thing if you do a big random gather in NumPy, where you hand it a whole array of random indices at once.

B: [skeptical] So RAM got faster?

A: [firmly] Nothing about RAM changed. In order, the prefetcher fetches lines before you ask for them. With NumPy's gather, every load's address is known up front, so the core fires off a bunch of misses at once and overlaps them. Either way, you stopped measuring latency and started measuring bandwidth. And any benchmark that claims "RAM is two nanoseconds" has made exactly that mistake.

A: Second. Forget the page cache. Run the disk script without the no-cache flag, twice. The second run reports SSD reads of a microsecond or two.

B: [dry] Which is RAM.

A: Which is RAM. And there's a sneakier version. Make the test file with truncate instead of writing random bytes. The file's all holes. The filesystem knows there's nothing actually stored there, so it hands you back zeros without ever touching the drive. Both mistakes give you a dream SSD that doesn't exist.

A: Third. Let the compiler win. Take that end value out of the print statement and rebuild with optimization on. You'll probably see zero point zero zero nanoseconds per load.

B: [laughs] Infinitely fast memory.

A: The compiler noticed the loop's result was never used, and deleted the loop. Every microbenchmark has to make its result observable somehow, or it's measuring nothing. And fourth. Time one thing at a time. Wrap a single dict lookup between two timer calls. You'll get a number several times bigger than what time it gave you, and really noisy, because the timer call itself costs more than the thing you're timing. So you measure many operations and divide. And you check your timer's own cost by timing an empty stretch of code.

<!-- section: Close -->

A: If you want more, Norvig's essay is short and still right, and Ulrich Drepper's "What Every Programmer Should Know About Memory" has the grown-up version of the pointer-chasing graphs you just built. And these numbers are the measuring stick for everything after this. The async stuff is how one program keeps lots of slow requests in flight. The seventeen tokens a second is this formula with your measured GPU bandwidth plugged in. And when you put the Spark up against Fireworks, time to first token is the latency, and tokens per second is the throughput.

B: [working it out] Okay, let me try to say it. Everything's on a ladder. L one's about a nanosecond, RAM's about a hundred, an SSD read is about a thousand times slower than RAM, and Europe is another couple thousand on top. Stretch it so L one is a second, and RAM's a couple minutes, the SSD's most of a day, and Europe's five years. And when something's slow, it's because it's far, or it's big. So the fix is always to get the data closer.

A: [gently] Mostly. The ladder's right, and far or big is right. But "get it closer" is only half the fix, because there are two numbers on every rung, not one. If you're waiting on lots of small things, like the SSD reads, or the calls across the ocean, latency's your problem. And you either move closer, or you stop waiting for them one at a time and keep lots of them in flight, because that's how you fill the pipe. If you're moving one huge thing, like sixteen gigabytes of weights every token, latency barely matters, and the only number that counts is how wide the pipe is. So before you answer how anything scales, you count how many times you touch each rung, and you ask which of the two numbers you're actually paying.
