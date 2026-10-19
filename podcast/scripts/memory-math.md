<!-- section: The Problem -->

A: [relaxed, thinking out loud] Okay, quick one before anything else. How much memory does an eight billion parameter model need?

B: [a bit unsure] Eight gigabytes? Eight billion numbers, a byte each.

A: That's the answer almost everybody gives. And it's off twice. First, the numbers aren't a byte each. The usual format is two bytes per number, so the model alone is about sixteen gigabytes. And second, the model isn't the only thing in memory. Not even close, once people start using it.

B: Okay, so what else is there?

A: Let me make it real first. Say your team wants to use the Spark as a shared assistant. Llama, the eight billion one, long chats. You start a serving engine, vLLM, it thinks for a minute, and it prints a line that says something like, maximum concurrency, twenty-four times.

B: Twenty-four what?

A: Twenty-four people, each with a really long conversation, at the same time. And you look at that and think, is that good? Is it right? Where did twenty-four come from? Then you try a much bigger model squeezed down small, and it says two. And then a colleague runs a notebook on the same box, and something gets killed.

B: [laughs] That sounds like a normal Tuesday.

A: It's a very normal Tuesday. But every one of those numbers comes from a few lines of arithmetic you can do faster than the engine boots. And once you see the shape of it, the "twenty-four" stops being magic.

<!-- section: One write-head -->

A: [warm] There's a nice little story that sits right in the middle of this. Twenty nineteen. Noam Shazeer, one of the people who wrote the original transformer paper, publishes a short note with a cheeky title. "One Write-Head is All You Need."

B: [laughs] Of course it's a riff on the title.

A: Of course it is. And his complaint was this. When a model is generating, it keeps notes about every word so far, so it doesn't have to redo them. You know this, it's the KV cache. Every attention head keeps a key and a value for every past word. And he noticed that most of that memory came from every head keeping its own private copy.

B: So let them share.

A: Let them share. All the heads use one set of keys and values. And the cache shrinks a lot. That turned out to be too aggressive, quality dropped for some models. So a few years later people at Google proposed the middle ground. A few sets of keys and values, each shared by a group of heads. Grouped-query attention. And by Llama three, every size used it.

B: So the architecture changed because of memory.

A: Memory was the reason the architecture changed. And you can actually see it. When you count up the model's parts, the pieces that make keys and values are oddly small, a quarter the size of their neighbours. And when you size the cache, it's a quarter of what it would have been.

<!-- section: The four buckets -->

A: So here's the picture I use. A restaurant kitchen during service. There's equipment bolted to the floor. Ovens, fridges, the walk-in. That's the same size whether you're serving one table or forty.

B: That's the model.

A: That's the weights. Loaded once, shared by everybody. Then every table has a tray of their own food in progress. And that space grows with how many tables there are and how long each one stays. That's the KV cache. Each conversation's private notes, growing with every word.

B: Okay.

A: Then while a dish is being plated, there's a burst of counter space in use, and a minute later it's gone. Those are the activations, the temporary numbers inside one pass through the model. And then there's space you can never use. Walkways, the fire-code clearance, the manager's desk. That's overhead.

B: [working it out] And only one of those grows as more people show up.

A: Only one grows. The trays. Which is really the whole thing. The weights decide whether a model runs on your machine at all. The cache decides how many people, and how long their conversations can be.

<!-- section: The equipment -->

B: Let's start with the weights, though. Two bytes a number, fine. But where does eight billion even come from?

A: That's the fun part, you can count it yourself. Every model ships with a little settings file, a dozen numbers. How wide the model is, how many layers, how many heads, how big the vocabulary is. And those numbers completely decide the size of every grid of weights. You've written this model, so you know every piece. The job is just to say how big each one is.

B: And where's most of it?

A: Most of it is in the feed-forward part of each layer, the part after attention. Something like seventy percent. Attention is a much smaller slice. And then the surprise is the vocabulary. There's a table at the start that turns each word-piece into numbers, and one at the end that turns numbers back into a score for every word-piece. And those two are big. Half a billion numbers each, before you've even reached a layer.

B: Huh. I would not have guessed that.

A: Nobody does the first time. And there's one flag in that settings file that says whether those two tables are shared. Same table, used both ways. For some small models it's yes, for the eight billion it's no. That one line is worth about a gigabyte. Always read it.

B: [skeptical] Okay, but nobody serves at two bytes anymore, right? Everyone uses four-bit.

A: Lots of people do. But here's the catch. You can't just round every weight to one of sixteen values without some sense of scale. So these squeezed formats chop the weights into little blocks, and each block stores a small scale number alongside the tiny integers. Those scales are real bytes. And often the big vocabulary tables are kept at full size. So a "four-bit" model is never really four bits a weight. It's quite a bit more.

B: So how do you know what you're actually getting?

A: Look at the file size. Almost every byte in a model file is weights. So the size on disk is a really good estimate of what it'll take in memory. Divide by the number of weights and you know the true bits per weight, whatever the format's name says.

<!-- section: The trays -->

A: Now the trays. For every word in the conversation, every layer stores a key and a value. And only the shared ones count, the grouped ones, because the queries get worked out fresh each step and thrown away.

B: So more layers, more cache. Longer conversation, more cache. More people, more cache.

A: All three multiply together. And it adds up fast. For the eight billion model, a normal chat's notes are small next to the weights. But at the longest context it supports, one single person's notes weigh more than the whole model.

B: [skeptical] One person.

A: One person, one very long conversation. And then here's the one that surprised me. There's a mixture-of-experts model that's about four times bigger than the eight billion. More parameters. But it has fewer of those shared key and value heads. So its notes per word are actually smaller than the eight billion's.

B: [working it out] So the cache doesn't care how big the model is. It cares about how attention is shaped.

A: That's it. The attention shape, not the parameter count. And that's why things like shared heads, and storing the cache in a smaller format, matter so much. Store the notes in eight bits instead of sixteen and you fit roughly twice as many people. It's the cheapest capacity win there is, which is why every engine offers it.

<!-- section: The burst and the walkways -->

A: The other two buckets are where careful predictions go wrong by a gigabyte or three. The burst first. When the model reads a long prompt, it pushes all of it through at once, so every temporary number is as tall as the prompt. That spike lasts milliseconds. But it's the peak that has to fit, not the average.

B: And you can make it worse by accident, I'm guessing.

A: Really easily. Ask the model for scores at every position in a long prompt, instead of just the last one, and you get a pile of scores bigger than the whole cache, when you needed one row. Or use textbook attention, which builds a grid of every word against every word. On a long prompt that's enormous. The fused kernels never build that grid. That's what the FlashAttention trick is about.

B: Okay. And the walkways?

A: The walkways are the memory nobody asked for. The GPU driver's own setup when a process first touches it. And then PyTorch has a habit that confuses everybody. When you free something, it doesn't hand the memory back. It keeps it, so the next thing you allocate is instant.

B: So "free" depends on who you ask.

A: Totally depends on who you ask. When I tried it on my Mac's GPU, which works the same way, I made a big chunk, deleted it, and PyTorch said nothing was in use. But the driver was still holding all of it, until I explicitly told it to give it back. And then if the kept pieces are the wrong shapes for the next request, you can run out of memory while the numbers say there's room. That's fragmentation.

<!-- section: The Spark's one pool -->

A: And the Spark adds a twist. On a normal GPU, the card's memory is its own. The operating system, your browser, everything else lives somewhere else. On the Spark, there's one pool. The CPU and the GPU share it.

B: Oh. So the operating system comes out of the same budget.

A: The operating system, the desktop, every other program, the file cache. All from the same pool. And the way it fails is different too. On a normal card, running out gives you a polite Python error. On the Spark the pressure lands on the whole machine. You can meet Linux's out-of-memory killer, which just picks a program and ends it. Or a frozen desktop.

B: Which is the colleague's notebook.

A: Which is the colleague's notebook. And it explains the twenty-four as well. A serving engine can't grow its notes one word at a time and hope, it'd fragment, and it'd find out it's out of memory halfway through someone's answer. So vLLM grabs its memory up front. It loads the weights, runs a fake pass at the biggest size it'll ever see to measure the burst, and whatever is left in its budget becomes the pool for notes. Then it just divides. Pool size, over the longest conversation you allowed. That's the twenty-four.

B: [skeptical] And the budget is what, the whole GPU?

A: By default, about nine tenths of it. Which on a normal card is fine, the leftover just sits there. But on the Spark, nine tenths of the GPU means nine tenths of the whole computer. So the operating system and everything else has to squeeze into what's left. You choose that setting on purpose on this machine, never by default.

<!-- section: Fitting is not the same as fast -->

B: Okay, so in principle the Spark could fit a lot of people.

A: In principle. And this is the thing I'd hold onto. Fitting isn't the same as being served well. Every step, everything in memory that's being used has to be read. The weights, plus everybody's notes. And the Spark's memory is big but not fast. So you can fit something like a hundred people with normal chats, and each of them gets a couple of words a second.

B: So capacity is one wall, speed is another.

A: Capacity tells you who can be in the room. Bandwidth tells you how fast the room moves. Today was the first one.

<!-- section: Ending -->

B: Let me try it. A running model is two big things. The weights, which are fixed, two bytes per number, shared by everyone. And the cache, which is each person's notes and grows with every word. Plus a burst while reading prompts, and some overhead. And the cache is what really limits how many people fit.

A: That's right, with one thing I'd sharpen. The cache isn't always the limit. For one person with a short chat, the weights are most of it. It's when you add people, or make conversations long, that the cache takes over, and it takes over fast. So the real question for any server isn't "how big is the model". It's "how many people, at how long a conversation", because that's what you're actually buying memory for.
