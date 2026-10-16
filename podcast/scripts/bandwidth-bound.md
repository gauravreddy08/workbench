<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you've built Llama from scratch. You know the forward pass. You embed a token, you run it through thirty-two layers of attention and MLP, you project out to the vocabulary, you sample. You know about the KV cache. So here's a question with an actual number at the end of it. You take Llama three point one, the eight billion parameter one, in B F sixteen, so two bytes per weight. You run it on your DGX Spark. One user, short prompt. How many tokens per second does it generate? And, like, one sentence on what limits it.

B: [a bit unsure] Okay. It's a big GPU, it's Blackwell... I'd guess something like fifty? Maybe a hundred? And what limits it is the GPU math. Or attention, probably. Attention's the expensive part, right? Every token has to look at every other token.

A: So the honest answer is about seventeen. At the very most. And in practice a little less than that.

B: Seventeen. That's... that's slow. That's slower than I read.

A: It is. And it's not the math, and it's not attention. Here's the whole thing in one go. To make one token, every single weight in the model has to be read out of memory once. Eight billion weights, two bytes each, that's sixteen gigabytes. And the pipe between the Spark's memory and its GPU is rated, on the spec sheet, at about two hundred seventy-three gigabytes per second. So sixteen divided by two hundred seventy-three. That's about six hundredths of a second per token. Call it fifty-nine milliseconds. And one over that is about seventeen tokens a second.

B: [skeptical] Okay, but, hang on. The GPU's not slow. It can do a ridiculous amount of math.

A: Right, and that's the strange part. The Spark's GPU can do somewhere around a hundred trillion B F sixteen multiply-adds per second. We'll pin that number down later by actually measuring it. And generating one token of an eight B model needs about sixteen billion operations. So if you just divide those, the GPU should be making... thousands of tokens per second. Thousands. It makes seventeen.

B: So where does the rest go?

A: Nowhere. It's idle. The tensor cores, the part of the GPU that does the matrix math, are sitting there doing nothing more than ninety-nine percent of the time. Waiting for weights to show up. And that gap, between how fast the chip can think and how fast it can be fed, that's the whole topic. And once you see it, every inference trick you've heard of, quantization, batching, speculative decoding, all of it, turns into the same move. You find some way to get more useful work out of every byte you drag out of memory.

<!-- section: Origin -->

A: And this problem has a name, and it's older than you'd think. Nineteen ninety-five. William Wulf and Sally McKee publish a two-page note with this deliberately boring title. "Hitting the Memory Wall: Implications of the Obvious." And the observation was really simple. Processor speed was improving about sixty percent a year. Memory speed was improving about seven percent a year. And they just said, well, if you keep multiplying those out, you eventually get to a point where the processor spends almost all its time waiting for memory. And at that point making the arithmetic faster does nothing.

B: And I'm guessing the answer was caches.

A: That was the answer, yeah. Chip designers fought the wall with caches, small fast memories right next to the processor. And caches work great when a program uses the same data over and over. You pay to fetch it once, then you reuse it from the fast copy. But decoding a language model is the case caches just can't save. The data is sixteen gigabytes of weights. Each one gets used once per token. And it's way, way too big to fit in any cache.

B: [working it out] So you fetch it, you use it once, and then it's evicted before you ever need it again.

A: Every time. So thirty years later, that memory wall is the reason your chatbot types at the speed it does. And it's the reason inference companies pay for GPUs with really expensive memory.

<!-- section: The Idea: One token, one trip through every weight -->

A: One quick comparison, just to fix the picture. Imagine a chef who can chop absurdly fast. A thousand onions a second. But the onions live in a warehouse across town, and they come over in one delivery van. How many onions does the kitchen get through per second? Not a thousand. Exactly as many as the van brings. The chef's speed doesn't matter at all. The van is everything. In decoding, the chef is the GPU's math units, and the van is the memory bus, the connection between memory and the chip.

B: Okay. But walk me through what actually gets delivered. Because I know the forward pass, I just never thought about it as, like, freight.

A: Yeah, so let's do one decode step. One new token. You start with the vector for the latest token. For the eight B model that's four thousand ninety-six numbers. Then for each of the thirty-two layers, you multiply that vector by the layer's weight matrices. There's the attention ones, the projections for queries, keys, values and the output. And the MLP ones, gate, up and down. And at the very end you multiply by the output projection, which gives you a score for each of the hundred twenty-eight thousand, two hundred fifty-six entries in the vocabulary. You sample one. Done. That's a token. Now look at what kind of multiply that is. It's a matrix times a single column of numbers. That's called a matrix-vector multiply. And the thing about it is, each weight in the matrix gets used exactly once. One multiply, one add, and then it's never touched again for this token. So every weight in every matrix has to travel from memory into the chip, get used for one multiply and one add, and get thrown away. And then the next token comes along, and the whole model has to travel again.

B: [skeptical] Why throw it away, though? Why not just keep it on the chip?

A: Because there's nowhere to put it. The GPU has on-chip storage, but nowhere near sixteen gigabytes of it. So it can't hold the model. It has to stream it, every single token. Which means the cost of a token is, to a first approximation, just the time it takes to read all the weights once. That's the division from before. Eight point oh three billion parameters, times two bytes, is about sixteen gigabytes. Divide by two hundred seventy-three gigabytes a second. About fifty-nine milliseconds. About seventeen tokens a second.

B: [a bit unsure] Okay, and the two hundred seventy-three, that's the memory bandwidth. I remember that number. I mean, I filed it away. I think I sort of assumed it was how fast memory is. Like, how quickly you get a byte back.

A: [gently] That's the one to untangle, actually, because they're two different things. How long one read takes, from asking to getting the answer, that's latency. Bandwidth is how many bytes per second can move once data is flowing. It's how wide the pipe is, not how long it is. And here, latency barely matters, because you're not waiting on one little read. You're pouring sixteen gigabytes through. So what matters is the width. And that's why that number, the one from the latency numbers stuff that felt like trivia, is now the most important number about your machine.

B: Huh. Okay. Width, not length.

A: So picture it as a drawing. On the left, a big box. Memory, a hundred twenty-eight gigabytes of LPDDR five X, and it's shared between the CPU and the GPU. Inside it, a smaller shaded box, the weights, sixteen gigabytes. The rest is free. On the right, another big box, the GPU's tensor cores, rated around a hundred-plus trillion operations a second. And in the middle, connecting them, a narrow pipe labelled two hundred seventy-three gigabytes per second. That's the narrow part. And inside the GPU box there's this thin little sliver that's colored in, and the label says busy less than one percent of the time. And underneath the whole thing: sixteen gigabytes divided by two hundred seventy-three, fifty-nine milliseconds per token, about seventeen tokens a second. A ceiling, not a promise.

B: Why "not a promise"?

A: Two reasons, and it's worth being honest about both. First, the bottom of the model is the embedding table. And that's a lookup. You read one row of it for your token, not all five hundred twenty-five million entries. The output projection at the top, though, is a full matrix, so that one does get read. So if you count properly, the real weight traffic is about fifteen gigabytes, and the ceiling is more like eighteen tokens a second. Second, you never actually get the full spec-sheet bandwidth. Real memory systems deliver some fraction of their rated speed, and real software adds overhead on top. So seventeen is the line you hold your measurements up against. You'll measure the real bandwidth yourself, and then redo the division with your number.

<!-- section: The Idea: Watch one step -->

A: There's a way to watch this happen that I really like. Picture the memory as a grid of little cells, thirty-two of them, one per layer, plus a wide one at the end for the output projection. Each layer is about four hundred thirty-six megabytes in B F sixteen. You press step, and one cell lights up and slides across the pipe to the GPU. And underneath there are two timelines, side by side. One for the memory bus, one for the tensor cores. As you step through, the memory bus timeline fills in solid. Block after block, no gaps. Each layer takes about a millisecond and a half to arrive. And the tensor cores timeline? It's basically empty. There's a hairline at the end of each delivery. The math on a layer takes a few microseconds, and then the GPU sits there waiting for the next layer to show up. Whole step, about fifty-five milliseconds, and the tensor cores were busy for a tiny fraction of it.

B: So it's the van. The chef chops for a microsecond, then stands around.

A: That's it. Now here's the fun part. There's a switch for batch size. You flip it from one to sixteen, and then to a hundred twenty-eight, and run it again. What do you think happens to the memory timeline?

B: [working it out] More users... more data? So it gets longer?

A: [amused] It doesn't change at all. Not even a little. The same fifteen gigabytes cross the pipe. What changes is the compute slivers. They get fatter. At a hundred twenty-eight, each layer's weights, once they've arrived, get used a hundred twenty-eight times, once for each user's token, instead of once. So you get a hundred twenty-eight tokens out of one delivery. For the price of one delivery.

B: Oh. So the van shows up, and instead of one chef using the onions, a hundred twenty-eight chefs share the same load.

A: Yeah. Same truck, a hundred twenty-eight times the customers. Keep that in your pocket, because it's the single most important idea in the economics of inference, and it's going to come back.

<!-- section: The Idea: Arithmetic intensity -->

A: Okay, so now the real vocabulary. The useful question to ask about any piece of computation is: for every byte I bring in from memory, how much math do I do with it? That ratio has a name. It's called arithmetic intensity. It's the amount of math done, divided by the bytes moved from memory. High means you do a lot of work per byte, which is what the math units want. Low means you're mostly just shuffling data around. And you measure it in FLOPs per byte. A FLOP is one floating-point operation, so one multiply or one add of decimal numbers. A multiply-add counts as two. And when people say FLOPs per second, that's a speed. And for decode, one user, you can work it out in your head. Each weight does one multiply and one add. That's two FLOPs. Each weight is two bytes in B F sixteen. So two FLOPs over two bytes. One FLOP per byte.

B: Is one a lot?

A: Compare it with what the chip can actually keep up with. Say the GPU can do a hundred twenty-five trillion FLOPs a second. And memory delivers two hundred seventy-three billion bytes a second. So to keep the math units busy, for every byte that arrives you'd need to do... a hundred twenty-five trillion divided by two hundred seventy-three billion. About four hundred fifty-eight FLOPs per byte. That's what the hardware needs. Decode does one.

B: [quietly] One out of four hundred fifty-eight.

A: Short by a factor of hundreds. And that number, peak FLOPs divided by bandwidth, has a name too. It's the machine's ridge point. And it's a property of the hardware, not your code. Every chip has its own. If your work has an intensity below the ridge point, you're memory-bound. The work finishes when the data finishes arriving. Faster math wouldn't help at all. Fewer bytes, or faster bytes, would. People also call that bandwidth-bound. And if you're above the ridge, you're compute-bound. Now the data shows up faster than the math can use it. So faster math units would help, and shrinking the bytes wouldn't.

B: [skeptical] Wait, where's the hundred twenty-five from? Because I'm pretty sure NVIDIA says this thing does a petaflop.

A: [amused] They do say that. "Up to one petaFLOP of AI compute." And that's real, but it's the most flattering number they could possibly print. It's four-bit precision, F P four, with something called two-to-four sparsity, where half the weights are zero and the hardware skips them. A common rule of thumb for this generation is that dense is half of sparse, and each time you double the precision you halve the rate. So you go a thousand trillion, down to five hundred for dense four-bit, down to two hundred fifty for eight-bit, down to a hundred twenty-five for B F sixteen. So treat a hundred twenty-five trillion as an upper bound, not a spec. The real dense B F sixteen rate might be lower, and you'll find out with one big matrix multiply. But here's the thing. Whatever it turns out to be, the ridge point stays in the hundreds. And decode, at one FLOP per byte, stays hopelessly far below it.

B: So then if I bought a GPU with twice the FLOPs, my chatbot doesn't get any faster.

A: [firmly] Not for one user decoding, no. Think about it. The chatbot isn't even using the FLOPs it already has. The math units are idle more than ninety-nine percent of the time. Double them and you've doubled the idle capacity. What would actually help is doubling the memory bandwidth, or halving the bytes per token. Now, to be fair, twice the FLOPs isn't useless. It helps the part where the model reads your prompt, which we'll get to, so the first token comes back faster on a long prompt. And it raises the ridge point, which lets a server pack in more users before it runs out of math. But one person, tokens per second? Stays put.

<!-- section: The Idea: The roofline -->

A: In two thousand nine, Samuel Williams, Andrew Waterman and David Patterson drew this whole idea as one picture, and the picture stuck. It's called the roofline model. Let me describe it, because once you can see it in your head you'll see it everywhere. On the horizontal axis, arithmetic intensity, FLOPs per byte. On the vertical axis, how many FLOPs per second you actually achieve. Both on log scales. And there are two lines that limit you. Across the top, a flat line. That's the compute roof, the chip's peak math. You can't go above it. And coming up from the bottom left, a sloped line. That's the bandwidth limit. If you do some number of FLOPs per byte, and bytes arrive at two hundred seventy-three gigabytes a second, then the most math you can do is two hundred seventy-three billion times that number. So the more work per byte, the higher you can go, up along the slope, until you hit the flat roof. And where the slope meets the roof, that corner, is the ridge point.

B: So it looks like, I don't know, a ramp and then a flat roof. Like the side of a house.

A: That's why it's called a roofline. And your program sits somewhere under that roof. Whichever line is directly above you tells you what to fix. If you're under the slope, it's bytes. If you're under the flat part, it's math.

B: And decode's way over on the left.

A: Way over on the left, on the slope, at one. Now, there's a calculator for this that ties the whole topic together, and it's worth describing what you'd see as you play with it. You pick a model, a weight precision, the hardware, and then two sliders, batch size and context length. It puts a dot on the roofline where your settings land, and a dashed trail showing where every batch size would sit. Underneath, a bar showing the bytes read per step, split into weights and KV cache. And readouts for tokens per second per user and in total. Start at the defaults, eight B, B F sixteen, Spark, batch one, about a thousand tokens of context. Dot's on the slope, seventeen tokens a second. Now drag batch up slowly. The dot walks up the slope. Up to sixty-four users, and each user gets about eleven tokens a second instead of seventeen, but the total goes from seventeen to about seven hundred.

B: Seven hundred. From the same machine.

A: Same machine, same weights. That's batching, and it gets its own lesson. Now put batch back to one and change the precision instead. B F sixteen to eight-bit to four-bit. The ceiling goes seventeen, thirty-four, sixty-eight. Halve the bytes, double the speed. That's quantization. Now switch the hardware to an H one hundred, the data-center GPU. Same model, one user, and the ceiling's about two hundred nine tokens a second. Because its memory, which is a kind called H B M three, is rated at about three point three five terabytes a second.

B: [working it out] So that's a big part of why Fireworks feels so much faster than my Spark. Before they've done anything clever.

A: A big part of it, yeah. Before any of their tricks. Two more to try. Set context to a hundred twenty-eight thousand tokens, at batch one. The KV cache part of that bytes bar grows until it's as big as the weights, and your speed halves. And then pick Qwen three thirty B A three B. That's a thirty billion parameter model. And it decodes faster than the eight B.

B: [surprised] A thirty B model faster than an eight B? How?

A: Hold that, there's a clean answer. But there's one more piece first, and it matters a lot for the numbers you'll benchmark next.

<!-- section: The Idea: Prefill is the opposite workload -->

A: When you send a prompt, the model doesn't read it one token at a time. All the prompt's tokens are known up front. So it runs them all through the model together, in one pass. That's called prefill. It's the first phase: push the whole prompt through at once, fill up the KV cache, and produce the first output token. And now each weight matrix isn't multiplying one vector. It's multiplying a whole block of token vectors at once. A matrix times a matrix. And once a weight's been loaded, it gets reused for every token in that block.

B: Oh. So the van shows up and the onions get used a thousand times.

A: Exactly that. A thousand-token prompt reuses every weight a thousand times per read. So the arithmetic intensity is about a thousand. Which is over the ridge point. Prefill is compute-bound. Then after that comes decode, the second phase, where you generate the output one token at a time. And there each step is a matrix times one vector, per layer. So it's memory-bound.

B: Why can't you do the output tokens in parallel too, though? Same trick.

A: Because you don't have them yet. Token five depends on token four, and you haven't picked token four. So it's one at a time, and every one costs a full read of the weights. If you drew it, you'd have two pictures side by side. On the left, prefill. A big square of weights, times a wide block with lots of columns, one per prompt token. One read of the weights, N tokens' worth of math. Intensity about N. Compute-bound. And underneath it: this is what sets time to first token. On the right, decode. The same big square of weights, times one skinny column. One read, one token's worth of math. Intensity about one. Memory-bound. And underneath: this is what sets tokens per second.

B: So the two numbers I'm going to measure against Fireworks come from opposite sides of the roof.

A: Opposite sides. Time to first token, which is how long from sending the request until the first output token arrives, that's mostly prefill. Plus some queueing and network. So it depends on compute. And you can estimate it. Ideal prefill for a thousand tokens of an eight B model is two FLOPs per parameter, times eight billion parameters, times a thousand tokens. About sixteen trillion FLOPs. At a hundred twenty-five trillion a second, that's about an eighth of a second. Point one three seconds. Realistically, expect a few times that. And then the tokens per second after that is decode, and that depends on bandwidth. Generate the same thousand tokens one at a time, at seventeen a second... that's about fifty-nine seconds.

B: [quietly] Wait. Same model, same thousand tokens. An eighth of a second one way, and a full minute the other way.

A: An eighth of a second, and about a minute. If you keep one picture from all of this, keep that one. And it's also why a provider can make time to first token and tokens per second better with completely different hardware and completely different tricks. They're bottlenecked on different things.

<!-- section: The Idea: The KV cache is also bytes -->

A: Okay, the KV cache. You know what it saves. It stores the keys and values for every past token, in every layer, so attention doesn't have to recompute them every step. What it costs is memory. But here's the part people forget. At every decode step, attention has to look at every past key and value. So the cache gets read in full, every step. Which makes it more bytes per token. And the weights are the same size for every token, but the cache grows with every token.

B: How big is it, per token?

A: You can just count it. For each token, in each layer, you store a key and a value. So two, times the number of layers, times the number of key-value heads, times the size of each head, times the bytes per number. For the eight B: two, times thirty-two layers, times eight heads, times a hundred twenty-eight numbers per head, times two bytes. That comes out to a hundred thirty-one thousand and seventy-two bytes. A hundred twenty-eight kilobytes. Per token of context.

B: Wait, eight heads? I thought Llama eight B had thirty-two attention heads.

A: It does, for the queries. Thirty-two query heads. But only eight key-value heads. Each set of keys and values is shared by four query heads. That trick's called grouped-query attention, G Q A. And it makes the cache four times smaller than it would be otherwise. Without it, all of this would be four times worse.

A: So now scale it. Your weights are sixteen gigabytes, read every token. At a thousand tokens of context, the cache adds a bit over a tenth of a gigabyte. Barely anything, you go from seventeen to about sixteen point nine. At eight thousand tokens, about a gigabyte, and you're at about sixteen. At thirty-two thousand, about four point three gigabytes, and you're down to about thirteen and a half. And at a hundred twenty-eight thousand tokens, the cache is about seventeen gigabytes. It's bigger than the model. And the ceiling is about eight tokens a second. Half.

B: So for a normal chat it's basically noise.

A: For one chat at normal lengths, yeah. Eight thousand tokens of context costs you about six percent. It starts to matter in two situations. One is really long context, like that last number. The other is batching. And that's where it gets interesting. Say you've got thirty-two users, and each one has four thousand tokens of context. Thirty-two, times four thousand ninety-six, times a hundred twenty-eight kilobytes. That's sixteen gigabytes. The same as one user at a hundred twenty-eight thousand.

B: [working it out] Oh, and batching doesn't help with that. Because the weights get shared across the batch, but my cache is mine. Nobody else needs my keys.

A: That's the sentence. Weights are shared across a batch. KV caches aren't. Each user's cache belongs to that user and gets read separately. So in the calculator, when you drag batch up at short context, throughput climbs steeply... and then at a thousand tokens of context and beyond, it flattens out, long before you ever get near the ridge point. You don't run out of math. You run out of bytes again, just different bytes. And that's why a bunch of the next lessons are all about the cache. How much memory it takes, what's actually in it, and how to share pieces of it between users.

B: What about attention itself, though? The math part. Doesn't that grow with context?

A: It does. The math per token grows with context too. But its intensity stays low, a few FLOPs per byte, with grouped-query attention. Because each cached key and value gets used once per step and that's it. So attention in decode is memory-bound too. Same story, all the way down.

<!-- section: The Idea: Every way around the wall -->

A: So now you can write the whole thing on one line. For one user decoding, tokens per second is roughly your usable bandwidth divided by the bytes you read per token. That's it. And everything that comes after this, every optimization, attacks one side of that division. Or it changes how many tokens you get out of one read. Picture that equation at the top of a page, with "times tokens per read" tucked under it, and five branches coming down. Fewer bytes per weight. Fewer weights per token. Many users per read. Many tokens per read. And a wider pipe. Let's go through them.

A: Fewer bytes per weight is quantization. Store each weight in eight bits instead of sixteen, and you read eight gigabytes per token instead of sixteen. Ceiling thirty-four. Four bits, roughly four gigabytes, sixty-eight. Now, real four-bit formats store a little scale factor alongside each small group of weights, so on average they're closer to four and a half to five bits per weight. A popular four-bit file of the eight B, from llama dot C P P, the format's called Q four K M, is about four point nine gigabytes. Which predicts about fifty-five tokens a second.

B: And the math is happening in four-bit then? That's why it's faster?

A: [jumping in] No, and that's the part that's easy to get backwards. The math still happens in sixteen-bit or so, after the weights get unpacked on the chip. The win is entirely in the bytes crossing the pipe. The math was never the problem. The cost is accuracy, and measuring that honestly is its own lesson.

A: Fewer weights per token is mixture of experts. M O E. The idea is you take each big MLP and split it into lots of smaller MLPs, the experts, and a little router decides which few of them each token goes to. So for any given token, most of the weights just sit there. That's the Qwen model. Qwen three thirty B A three B has about thirty point five billion parameters in total. But each token only activates about three point three billion of them. Eight out of a hundred twenty-eight experts per layer, plus the attention, which everyone shares. So on bandwidth, it decodes like a three B model. In B F sixteen that's about six point seven gigabytes per token, and a ceiling of about forty-one tokens a second.

B: [working it out] Oh, so it's faster than the eight B because it reads less than half the bytes. So... it only needs, like, three billion parameters in memory?

A: That's the catch. No. All of it has to be in memory, about sixty-one gigabytes in B F sixteen. Because the next token might want completely different experts. Speed depends on the bytes you read per token, not the bytes you store. And this is where the Spark is genuinely unusual. Its hundred twenty-eight gigabytes is slow, but there's a lot of it. A twenty-four gigabyte gaming card can't even hold that model. The Spark holds it and has room to spare. Big but sparse models are the Spark's sweet spot. One catch though. If you batch lots of users, between them they end up touching most of the experts. So under heavy batching the advantage shrinks. You can see that in the calculator too, if you pick the Qwen model and drag batch up.

A: Many users per read. Batching. This is the one inference companies actually live on. You process a bunch of users' tokens in the same step, and each weight read serves all of them. And while you're way below the ridge point, the step barely gets any slower. So throughput goes up almost in proportion to the number of users. For free, basically. And think about what that does to cost. The cost of a token is GPU-hours divided by tokens produced. If the same GPU-hour now produces fifty times the tokens, each token costs about a fiftieth as much.

B: So where does that stop? It can't go forever.

A: Two walls, and you've already met both. The ridge point, where the math finally catches up and adding users makes every step slower. That's a few hundred FLOPs per byte on these chips. And the KV cache, because every user's cache is their own bytes, so total bytes per step grow with the number of users and the curve flattens. And at realistic context lengths that one usually hits first. And there's a third, kind of a quieter wall. Memory capacity. All those caches have to actually fit. That's why serving companies obsess over batching, cache size and how much memory they've got.

A: Many tokens per read. Speculative decoding. If you somehow knew the next four tokens in advance, you could check all of them in one forward pass. Like a tiny prefill. For about the price of one weight read. So speculative decoding uses a small, fast draft model to guess the next few tokens, and then the big model checks them all in one pass. When the guesses are good, you get several tokens out of one trip through the weights. And it works precisely because decode leaves the math units idle. Checking five tokens instead of one costs almost nothing extra on a machine that's waiting on memory anyway.

B: [amused] So the idle tensor cores are the whole reason the trick works.

A: They're what you're spending. And the last one, the brute-force option, is a wider pipe. Faster memory. Data-center GPUs use high-bandwidth memory, H B M. It's memory chips stacked vertically, sitting right next to the GPU on the same package, with thousands of wires between them. Much faster than normal memory, and much more expensive per gigabyte. The H one hundred's is rated at about three point three five terabytes a second. Roughly twelve times the Spark. And that buys you about two hundred nine tokens a second on the eight B in B F sixteen, one user. The Spark just made the opposite trade. Lots of affordable memory, slowly.

A: And then there's a smaller set of tricks for the KV side of the bytes. Grouped-query attention, which you've seen. Quantizing the cache itself. And storing the cache in pages so users can share common prefixes. And on the prefill side, the compute side, there's FlashAttention, which cuts the memory traffic inside attention itself and matters most for long prompts. And prefix caching, which skips prefill entirely when you've seen the start of the prompt before. And serving engines, like V L L M, are just all of these at once.

<!-- section: The Idea: Predict the sheet -->

A: Okay, so before you build anything, try predicting a few. Spark, two hundred seventy-three spec, one user, short context. First one, Llama three point two one B, in B F sixteen.

B: [working it out] One billion... it's one point two something billion, right? So two and a half gigabytes. Two seventy-three over two and a half, that's about a hundred ten.

A: About a hundred ten. One point two four billion parameters, two and a half gigabytes. And with this one, the model actually shares its embedding table and its output matrix, they're the same weights, so the whole thing really does get read every token. Next. The eight B in a format called Q eight zero, which is eight and a half bits per weight.

B: Eight billion times eight and a half bits... divided by eight to get bytes... about eight and a half gigabytes. So two seventy-three over eight and a half, thirty-two?

A: About thirty-two. And the Q four K M, the four point nine gigabyte file?

B: Two seventy-three over four point nine. Fifty-five-ish.

A: About fifty-five. Now here's the thing to expect when you measure. The small model will land the furthest below its ceiling. Because with only two and a half gigabytes to read, each step only takes about nine milliseconds. And there are fixed costs every step, launching the GPU work, sampling, whatever Python's doing between tokens, that don't shrink with the model. So they're a much bigger slice of a nine millisecond step than of a sixty millisecond one.

B: Can I do the big one? A seventy B, four-bit, on the Spark.

A: Go.

B: [working it out] Seventy billion times half a byte. Thirty-five gigabytes. Two seventy-three over thirty-five is... about eight tokens a second?

A: That's the clean ceiling. But remember real four-bit is more like four and a half to five bits, so the file's more like forty to forty-three gigabytes. That gives you a ceiling of six or seven. And you'll measure a bit under that. Call it four to six tokens a second. Which is fine for reading along. It's slow for anything interactive. But here's the flip side. It fits. Forty-ish gigabytes in a hundred twenty-eight. A twenty-four gigabyte card can't even load it. That's what the Spark is for.

<!-- section: Build It -->

A: So, building it. The plan is: measure the two numbers that define your Spark's roofline, the bandwidth and the peak math. Use them to predict real model speeds. Then check those predictions with a real engine. None of it's fancy. It's exactly the stuff a strong inference engineer does on day one with new hardware.

A: Setup first, and it's one sentence. The Spark runs DGX OS, which is Ubuntu, on an ARM sixty-four CPU, so anything built for regular Intel-style x eighty-six machines, including some pip packages, won't work. The least painful route is NVIDIA's own containers. NVIDIA publishes DGX Spark playbooks with the currently recommended PyTorch container and the exact command to start it, and you should check those rather than trust a command from memory, because the supported images change. Once you're in, you just check that PyTorch sees the GPU, how much memory it sees, and how many of the GPU's processor blocks it found.

A: Then the first real one. A little bandwidth script. You allocate two big buffers on the GPU, copy one into the other a bunch of times, and divide the bytes moved by the time it took. And you sweep the size, from eight megabytes all the way up to eight gigabytes. There's a moment in writing this where you have to stop and think. How many bytes did one copy move?

B: Well, the buffer size. If it's a gigabyte, I moved a gigabyte.

A: [gently] That's the one everybody gets wrong. A copy reads every byte of the source and writes every byte of the destination. Both of those cross the memory bus. So it's two times the buffer size.

B: [sighs] Okay. Yeah. Read and write.

A: Second thing. Synchronize. Remember the thing about GPU calls, that when you ask the GPU to do something, the call comes back to Python as soon as the work is queued up, not when it's done. So if you stop the clock right after, you've timed how fast you could queue the work, not the copy. You have to tell PyTorch to wait for the GPU to actually finish before you stop the clock. The call is torch dot cuda dot synchronize. Or you can use CUDA events, which are the other correct way. And third, go big. Small buffers fit in the GPU's on-chip cache and report fantasy numbers. The whole point of the sweep is to see where the cache stops helping. Only trust the sizes in the gigabytes. And there's an optional second measurement, a read-only one. Summing a big sixteen-bit tensor mostly just reads it, so you can count the bytes once and compare.

A: Then the compute side. Time one big B F sixteen matrix multiply and turn it into FLOPs per second. A square multiply of two n by n matrices does two times n cubed FLOPs, because it's n cubed multiply-adds. Sweep n from about a thousand up to about sixteen thousand, warm up, synchronize, run it several times. Small matrices will look slow, and that's the roofline again. A small matrix just doesn't have enough work per byte to fill the chip. What you want is the flat plateau at the big sizes. And then the ridge point for your machine, from your own two numbers: your measured FLOPs per second, divided by your measured bytes per second.

A: Then, and this is the part I'd really insist on, you write the predictions down before you run a single model. A tiny function, takes how many parameters get read, bytes per weight, and the bandwidth, and gives you the ceiling. You fill it in with your measured bandwidth, and also with two seventy-three to compare. For the one B in B F sixteen, and the eight B in B F sixteen, Q eight zero and Q four K M. For those quantized files, you can just use the file size on disk as the bytes per token, because nearly all of the file is weights.

B: [amused] So you can't quietly fudge the prediction afterwards.

A: [laughs] That's the idea. Then you run them, with an existing engine. Two good choices. llama dot C P P, built with CUDA support, has a tool called llama bench. You give it a model, a five hundred twelve token prompt, and a hundred twenty-eight tokens to generate, and it reports the prefill speed and the decode speed separately. Check its help first, the flags move around. Or V L L M, if you'd rather start using the engine you'll meet later. It has its own benchmark scripts, and you look up the current ones in its docs. Either way, you download the files from Hugging Face, the one B, and the eight B in the three formats. Write down decode tokens per second for each. And note the prefill number too, because you'll want it for the Fireworks comparison.

A: And the last build is watching batching actually happen. llama dot C P P also has a batched bench tool that runs several sequences in parallel. Or V L L M's throughput benchmark. You take the eight B in four-bit, short prompt, and go batch one, two, four, eight, sixteen, thirty-two, sixty-four. And for each, write down total tokens per second and per-user tokens per second. You're done when you've got a bandwidth sweep and you can say which sizes were hitting cache and what your real sustained number is, a plateau for the math and your own ridge point, a prediction table written before any model ran, three real decode measurements, and one batch curve.

<!-- section: Measure -->

A: So what should the numbers look like. Your bandwidth copy will almost certainly come in under two hundred seventy-three.

B: [skeptical] Which means something's wrong with my setup?

A: No. That's normal for every memory system there is. The spec is the theoretical peak of the memory chips' pins. Real traffic loses some of that to refresh cycles, the memory periodically recharging itself, and to scheduling, and to reads and writes having to take turns. So write down your number and don't judge it. That's the real pipe.

A: And when you run real engines on a memory-bound model, they typically land somewhere around sixty to eighty-five percent of the ceiling you computed from the spec bandwidth. And closer to the ceiling from your measured bandwidth. But don't take that range as gospel. Measuring it is the point.

B: Where does the rest go, though? If the division's right.

A: A few honest places. One, not all the time is streaming weights. Each step also reads the KV cache, runs attention, the normalizations, the sampler. And it launches dozens of small GPU jobs, kernels, and each launch has a fixed cost of a few microseconds. A few hundred of those per token adds up. Two, the kernels themselves don't hit peak bandwidth. A matrix-vector kernel only reaches its best speed on big matrices with nice memory access. Small layers, like the one B's, run less efficiently. Three, the host side. Anything in Python between tokens, sampling, turning tokens back into text, streaming it out, is time the GPU might just be sitting idle. That's why the one B usually lands furthest from its ceiling. Its steps are so short that fixed overhead is a big chunk. And four, quantized formats spend some work unpacking. Four-bit kernels have to unpack and rescale the weights. Usually they're still bandwidth-bound, just... less perfectly so.

A: And the batch curve should look like the calculator's trail. Total throughput climbs almost in a straight line at first. Batch two gives you nearly double. Then it bends, and flattens. And per-user speed sags slowly the whole way. Where it bends, you compare against your measured ridge point and against the KV cache bytes from the formula. With short prompts and a four-bit model, you can plausibly get into the hundreds of tokens a second in total. While each individual user is running slower than they did alone.

<!-- section: Break It -->

A: Then you break it, on purpose. First one. Run the bandwidth script with an eight megabyte buffer, and believe what it says.

B: It's going to say something insane, isn't it.

A: [laughs] Way beyond the spec. Because the whole buffer fits in the GPU's on-chip cache, which is much faster than main memory. That's the latency ladder showing up as bandwidth. Every level of the memory hierarchy has its own pipe width. And model weights are far too big for any cache. Which is exactly why decode sees the slow pipe.

A: Second. Delete the synchronize before you stop the clock. Your bandwidth and your FLOPs become impossible. Sometimes hundreds of times the spec. Because you timed how fast Python can drop work into a queue. And honestly, any GPU benchmark you see online that looks too good to be true, that's the first question to ask.

B: [amused] Did they forget to wait.

A: Did they forget to wait. Third. Count the bytes once. Report the copy as the buffer size over time, instead of twice that. Your bandwidth halves. So every ceiling you computed halves. And suddenly your engine looks like it's running at a hundred fifty percent of the ceiling. Beating the laws of physics.

B: Which it isn't.

A: Which it isn't. When a measurement beats a ceiling, the ceiling's wrong. Go find the factor of two. And the fourth one, make the cache heavy. Run the eight B with a really long prompt already in context. Newer versions of llama bench can measure generation at a given context depth, check the help. And predict the drop first, with the formula.

B: [working it out] Thirty-two thousand tokens is about four point three gigabytes of cache. On top of sixteen of weights, that's, what, a quarter more bytes? So I'd lose about a fifth of my speed.

A: That's for B F sixteen. Now do it for the four-bit file.

B: [surprised] Oh. Four point three on top of four point nine. That nearly doubles the bytes. It hurts way more.

A: Proportionally way more. Because you shrank the weights, but the cache didn't shrink with them. Though some engines quantize the cache too, so check what yours does before you predict.

<!-- section: Connections and close -->

A: And all of this is the setup for the next thing, which is putting a plain streaming server on the Spark and benchmarking it against Fireworks. The ceiling you computed here is the line that server gets measured against. How close does it get, and where does the rest go. If you want one thing to read, Horace He's essay "Making Deep Learning Go Brrrr From First Principles" is the clearest take on compute-bound versus memory-bound. And kipply's "Transformer Inference Arithmetic" does exactly these calculations for real models.

B: [working it out] Okay, let me try the whole thing. Each new token depends on the last one, so you make them one at a time. And making one means streaming every weight through the GPU once, using each one for a single multiply-add. So the GPU's fast, but it's starving. Tokens per second is just bandwidth divided by the bytes you read. And every trick is about making the model smaller so there's fewer bytes.

A: [gently] Almost. Fewer bytes is half of it. Quantization does that, mixture of experts does that. But the other half doesn't shrink anything. Batching and speculative decoding read exactly the same bytes, and they just get more tokens out of each read. More users per delivery, or more guesses checked per delivery. So it's not "make the model smaller". It's: every byte that crosses the pipe is expensive, so either move fewer of them, or make each one do more work before you throw it away.
