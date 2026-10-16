<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture the interview. It's going well. You've described your ranker. It's a cross-encoder, which just means a model that reads the query and one document together, in one pass through the network, and spits out a relevance score. Really accurate, but you pay for a whole forward pass for every single query-document pair. It sits after a cheaper retrieval stage and re-scores the top candidates. You've talked about the training data, the loss, the N D C G gains. Good stuff. And then the interviewer leans back and says, "Nice. So how does it scale?"

B: [a bit unsure] Yeah, I mean... honestly, I'd say something like, it scales horizontally? It's stateless, so if traffic goes up we add more GPUs behind a load balancer. Which, saying it out loud, I can already hear is not really an answer.

A: [gently] It's not wrong. It's just a vibe. And you both know it's a vibe. The thing is, when that question lands, the problem isn't that you have a wrong answer. It's that there's no place to start. Scale to what? More users? More documents? Is this about the GPU? The database? It's all fog.

B: So what's the not-a-vibe version?

A: Okay, so here's roughly what a strong answer sounds like. Takes about ninety seconds. "Let me put numbers on it. Say ten million queries a day. A day is about a hundred thousand seconds, so that's about a hundred queries a second on average, and maybe three hundred at peak. Each query re-ranks a hundred candidates at about two hundred fifty-six tokens each. So three hundred, times a hundred, times two fifty-six, that's roughly ten million tokens a second. The model's BERT-base sized, about a hundred million parameters, so about two hundred million floating point operations per token. That's two thousand trillion operations a second. Two petaflops. An H one hundred does about a thousand trillion on paper, and maybe forty percent of that for real, so about five H one hundreds. Call it eight, with headroom and a spare. Compute breaks first. Memory and network are nowhere close. And at ten times the traffic, before I bought fifty GPUs, I'd cut the number of candidates with a cheaper stage, because candidates multiply everything."

B: [skeptical] Okay, but that's just... multiplication.

A: [warmly] That's exactly the point. None of it's clever. Every step is multiplying by a number you could look up, and most of them you already know. The person giving that answer doesn't have a better brain than you. They have a method, and they have a stock of numbers in their head. That's all this is. The method, and the numbers.

<!-- section: Origin -->

A: And the method is older than computers. July nineteen forty-five, the Trinity test, the first atomic bomb. Enrico Fermi is standing about sixteen kilometers away, and he's holding a handful of torn-up paper. When the blast wave reaches him, he drops the scraps and watches how far they get pushed sideways. About two and a half meters. And from that, plus some quick arithmetic in his head, he announces the explosion was roughly ten thousand tons of TNT.

B: And how close was he?

A: The official number, which took instruments and weeks, came out around twenty thousand. So he was off by a factor of two. Using paper. And Fermi made a habit of this, he taught it. The classic one is, how many piano tuners are there in Chicago? Nobody knows. But you know roughly how many people live there, about how many households have a piano, how often a piano gets tuned, how many a tuner can do in a day. Multiply all that together and you're within a factor of a few. These got called Fermi problems. Then in the nineteen eighties Jon Bentley brought the habit to programmers, in his Programming Pearls column, which was literally called "The Back of the Envelope". And in two thousand nine Jeff Dean put up a slide at Google called "Numbers Everyone Should Know", and followed it with exactly this kind of estimate for system designs.

B: [amused] So the interview question I dread is basically a piano tuner question.

A: It's a Fermi problem with a server in it. That's all it is.

<!-- section: The Idea: What scale means -->

A: So let's go back to "scale to what?" Because "how does it scale" sounds vague, but there's a really precise question hiding inside it. As the load grows, which resource runs out first, at what load, and what do you do about it?

B: Resource meaning, like, the GPU?

A: The GPU's one. Every machine has a short list of things it can run out of. A GPU can only do so many multiply-adds a second. Memory only holds so many bytes, and it only moves so many bytes a second, which is a different limit. A network card only pushes so many bits. CPU cores only parse and tokenize so fast. And the company can only spend so much money. Your system is like a pipe that runs through all of those at once. And the narrowest one sets the flow. That narrowest one is the bottleneck. The resource that fills up first as load grows. And the thing about a bottleneck is, making anything else faster does nothing. Literally nothing, until you widen that one.

B: So "it scales" or "it doesn't scale" is the wrong shape of answer.

A: Right, the job isn't yes or no. The job is: name the bottleneck, put a number on where it hits, and say what you'd change. And there's a method that gets you there. Five steps, same five for every system. One, clarify the load. What's coming in, how much, how spiky. Two, list the resources, the things that can run out. Three, do the arithmetic. Load times cost per request gives you demand per second, for each resource. Four, compare. Divide that demand by what one machine can do, and that's how many machines you need. Whichever resource has the biggest ratio is your bottleneck. And five, say what breaks and what changes at ten times and a hundred times the load. And then you loop. Multiply the load by ten and go around again.

A: [thinking out loud] And steps one and three are where most people skip. They jump straight to "add GPUs" without saying what the load is, or they wave at the arithmetic. And step five is the part the interviewer actually wants to hear. So let's take them one at a time, and then run all five on three real problems.

<!-- section: The Idea: Step 1, clarify the load -->

A: Step one. Before you compute anything, pin down what's coming in. You either ask, or you state an assumption out loud. Interviewers like either. What they hate is neither happening. And there are four questions that cover almost everything. The first is, how many requests, on average and at peak? The unit everybody uses is Q P S. Queries per second. Just the rate work arrives. People quote load per day, "ten million searches a day", because that's what dashboards show. But machines fail per second, so you convert.

B: [a bit unsure] And then you just size for that number? Like if it averages out to a hundred a second, you build for a hundred a second. Over a day it all evens out.

A: [jumping in] That's the trap. You never size for the average. Traffic follows people. It rises during the day in each time zone, it falls off at night. So a server built for the average is fine at four in the morning and drowning at lunch. For a consumer product, the busiest hour is typically two to three times the daily average. And for anything triggered by events, like a launch, or a news spike, or a batch job somebody scheduled to fire at midnight, it can be ten times or more. The ratio between the busiest rate and the average has a name, the peak factor. Two to three is a common assumption for daily human traffic, ten for spiky stuff. And again, you ask, or you state yours.

B: Okay. Second question?

A: What's the mix. Reads and writes cost different things. A search engine is almost all reads. A logging pipeline is almost all writes. A chat product writes every message, and then reads the whole conversation back on every single turn. So the read-to-write ratio, how many reads per write, tells you which half of the system to worry about. Read-heavy, you're thinking caching and replicas, copies of the data. Write-heavy, you're thinking fast appends and batching.

A: Third, how big is each thing, and how many are there? Size per request, in tokens or bytes, and total stored data, which is number of items times bytes per item. And honestly, this is where most estimates go wrong. Somebody forgets that a "document" for the ranker is two hundred fifty-six tokens of text, not one ID number.

A: And fourth, how fast is it growing? Something that's fine today and doubles every year is ten times bigger in a bit over three years. So "what happens at ten times?" isn't hypothetical. It's your next design review.

<!-- section: The Idea: Step 2, what can run out -->

A: Step two is listing what can run out. For each request, you ask, what does this thing consume? And the list is short, and it's the same for every system. Compute, which on a GPU you measure in floating point operations per second, and on a CPU in core-seconds. That runs out when the math units are busy all the time. Memory size, in gigabytes. Runs out when the working set doesn't fit. Memory bandwidth, gigabytes per second, runs out when every step is just waiting for bytes to arrive from memory. Disk, which is either too many random reads a second, or too much data, or too slow a stream. Network, which is either the card being full, or a chain of calls where each round trip adds up. And money.

B: Which runs out when?

A: [amused] When someone in finance notices.

A: Now, compute. The unit is the flop. One floating point operation, so one multiply, or one add. A multiply-add counts as two. And flops per second is how many of those you do each second. A modern GPU does somewhere around a hundred trillion to a thousand trillion a second. And for neural networks there's one rule worth knowing by heart. A forward pass costs about two flops per parameter, per token. Because every weight the token passes through gets one multiply and one add. Training costs about six per parameter per token, because the backward pass is roughly twice the forward. People call it the two N rule, N being the number of parameters. It comes from the scaling-laws papers. And it's how you go from "a hundred-and-ten-million-parameter model" to a number of GPUs in one line.

B: [skeptical] Wait, but hold on. I thought these models were memory-bound. That whole thing about seventeen tokens a second, the GPU just sits there waiting on memory. So shouldn't I be counting bytes, not flops?

A: [thinking it through] For L L M decoding, yes. And it's worth saying why, because it's exactly why your ranker is different. When a language model generates text, each step produces one new token per conversation. To make that one token, it has to read every single weight out of memory. So for each weight it reads, it does two flops, and that's it. Very little math per byte. The math units finish instantly and sit around waiting for the next bytes. That's memory-bound. Now your ranker. One query sends a hundred candidate pairs, two hundred fifty-six tokens each, through the model together. That's twenty-five thousand six hundred tokens, all sharing every weight that gets read. So each byte you pull from memory gets used for thousands of flops. Way past the point where the math becomes the limit. Same as prefill, when a model reads your whole prompt at once. That's compute-bound.

B: [working it out] So it's not about the model. It's about how many tokens get to share each read of the weights.

A: That's the whole thing. And it decides which resource you watch. For the ranker, you count flops and you buy compute, or you cut tokens. For decoding, you count bytes per step, you batch more users together so they share the weight reads, and you watch the K V cache, which each user reads separately. We'll get to that one.

<!-- section: The Idea: Step 3, the arithmetic -->

A: Step three, the arithmetic. And you don't need a calculator. You need to stop carrying digits. Round every number to one digit and a power of ten. Multiply the leading digits, add up the powers. So, three hundred times twenty-five thousand. Three hundred is three with two zeros. Twenty-five thousand is two and a half with four zeros. Three times two and a half is about eight. Two zeros plus four zeros is six zeros. Eight million. Done, in your head.

B: And if that rounding's off by a bit at every step?

A: Being off by twenty percent at each step is fine. The answer you need is the order of magnitude, which is just which power of ten the number's closest to. Three hundred and seven hundred are both "hundreds". Three hundred and three thousand are an order of magnitude apart. And the real question you're answering is, is this one machine, ten machines, or a thousand? Twenty percent never moves you between those.

A: And then a handful of conversions do most of the work. Seconds in a day is eighty-six thousand four hundred. Call it a hundred thousand. Which gives you this really handy rule: a million a day is about ten a second. Really it's eleven point six, but ten. A month is about two and a half million seconds. A year is about thirty million, or pi times ten million if you like that. Two to the tenth is one thousand twenty-four, call it a thousand, so a kibibyte is basically a kilobyte, a gibibyte is basically a gigabyte, about seven percent off. There are about seven hundred thirty hours in a month, which you use to turn a price per hour into a price per month. And if something doubles every year, it's about ten times bigger in three and a third years, and a thousand times bigger in ten.

B: The hundred thousand seconds thing. That's a pretty big rounding.

A: It underestimates by about fifteen percent, yeah. And here's how to think about that. If fifteen percent would change your decision, then the estimate was too close to call anyway. And you say so. "This is borderline. I'd measure." That's a perfectly good answer.

A: So try one. Your team's search product does fifty million queries a day, and peak is three times average. Without a calculator, how many queries a second does the ranker have to handle at peak?

B: [working it out] Fifty million... is five with seven zeros. Divide by a hundred thousand, that's five zeros, so five with two zeros. Five hundred a second, average. Times three... fifteen hundred at peak?

A: Fifteen hundred. The exact answer, if you do fifty million divided by eighty-six thousand four hundred, times three, is about seventeen hundred thirty-six. So you were fourteen percent low. And that changes nothing about the design. It's thousands a second. Not tens, not millions. That's the answer that matters.

<!-- section: The Idea: Step 4, one machine -->

A: Step four. Now you divide demand by capacity. And that needs the second half of your stock, which is what one machine, one disk, one network card can actually do. These are rough, they vary with hardware, and they're all you need to land in the right power of ten.

A: CPU first. One core running compiled code does about a billion simple operations a second. The same core running pure Python, about ten million.

B: A hundred times slower? Just from Python?

A: About a hundred times, for simple operations, yeah. And a fast tokenizer, the kind written in Rust, does about a million tokens a second per core. I mean, one measurement on an M four Pro, one thread, came out at one point one five million. So, a million.

A: Memory. A server has somewhere between a hundred twenty-eight gigabytes and two terabytes of RAM, and it moves fifty to five hundred gigabytes a second. An N V M E SSD, the fast flash kind, streams five to seven gigabytes a second, does a hundred thousand to a million random reads a second, and holds a few terabytes up to tens of terabytes. A spinning disk does about a hundred fifty megabytes a second, and about a hundred random reads a second. Which is nothing.

A: [jumping in] Network. And this is the one that bites people. A network card is ten to a hundred gigabits a second. Bits. Divide by eight to get bytes. So that's one and a quarter to twelve and a half gigabytes a second. Round trip inside one data center, about half a millisecond. Across a continent, about a hundred fifty milliseconds.

A: And GPUs. An H one hundred, by its spec sheet, does about a thousand trillion flops a second, in B F sixteen, dense, which means no sparsity tricks. It has eighty gigabytes of memory, and moves three point three five terabytes a second. Your Spark, on its spec sheet, does about a hundred trillion in B F sixteen at most, has a hundred twenty-eight gigabytes, and moves two hundred seventy-three gigabytes a second. So, roughly a tenth the compute of an H one hundred, more memory, but about a twelfth of the bandwidth. And money. Renting an H one hundred in the cloud is about two to three dollars per GPU per hour. Those prices move, so check. And object storage, like S three standard, about two cents per gigabyte per month.

B: Okay. So with that I just divide, and I'm done?

A: Almost. Two corrections, and they always apply. First, you never get the spec sheet peak. For model inference, getting thirty to fifty percent of peak flops is decent. That fraction has a name, M F U, model flops utilization. It's the flops your model actually needs per second, divided by what the hardware could do at peak. Forty percent is good for inference. Small models and small batches get a lot less. So use forty percent, unless you've measured.

B: [a bit unsure] And then if the work needs, say, five GPUs' worth, I buy five.

A: That's the second correction. You never run a machine at a hundred percent. There's a whole result from queueing theory, which is the next lesson, p ninety-nine and load testing, that says waiting time explodes as a machine gets close to fully busy. Like, not gently, it explodes. So you size so the fleet is about sixty to seventy percent busy at peak, and you keep a spare for when one of them dies. That deliberate spare capacity is called headroom. It's there so latency stays sane at peak, and so one dead machine doesn't take you down.

<!-- section: The Idea: Step 5, what breaks -->

A: And step five. The resource with the biggest demand-to-capacity ratio is the bottleneck. You say what you'd do about it. And then, and this is the part that sounds senior, you say what breaks next, once you've fixed it. At ten times the load you can usually just add machines. At a hundred times, adding machines gets so expensive that you change the design instead. You cut the work per request, or you cache, or you precompute, or you approximate. That's the whole method. Now let's run it.

<!-- section: Worked example 1: the ranker -->

A: Your ranker, from queries to GPUs. Assumptions, stated out loud. Ten million queries a day. A peak factor of three. A hundred candidates re-ranked per query. Two hundred fifty-six tokens per query-document pair. And a BERT-base-sized cross-encoder, which is a hundred and ten million parameters. But only about eighty-six million of those are outside the embedding table.

B: Why does that matter?

A: [matter-of-fact] Because the embedding table is a lookup. A token comes in, you grab its row, done. There's no multiply-add, so it costs no flops. The two N rule only counts weights the token actually gets multiplied through. Okay. So think of this as a chain of boxes, top to bottom, each arrow being one multiplication. Top box, ten million queries a day. Divide by a hundred thousand seconds, that's a hundred a second average. Times three, three hundred a second at peak. Next arrow, times a hundred candidates. Thirty thousand pairs a second, because each query is a hundred rows through the model. Next arrow, times two hundred fifty-six tokens. That's about eight million, call it ten million tokens a second.

B: Is two fifty-six even realistic for a pair?

A: Yeah, it's the right ballpark. In one test on a Mac, a query plus a two-hundred-thirty-word snippet came out at two hundred forty-three tokens. So. Next, flops per token. Two times eighty-six million is about one point seven times ten to the eight. That's for the weights. And attention adds a bit on top, because each token also has to look at every other token in its pair. The extra per token is roughly four, times the number of layers, times the width of the model, times the sequence length. For BERT-base that's four times twelve layers times seven hundred sixty-eight wide times two hundred fifty-six tokens, which comes out around ten million. Under ten percent of the total at this length. So round the whole thing to two hundred million flops per token. Ten million tokens a second, times two hundred million flops each. Two times ten to the fifteenth. Two thousand trillion flops a second.

A: Last arrow. Compare. An H one hundred is about ten to the fifteen on the spec sheet. At forty percent, that's four hundred trillion. Two thousand trillion divided by four hundred trillion is five. Five H one hundreds. Then run them at seventy percent busy and keep a spare, and you're at eight. And the Spark's compute peak is about eight times lower than an H one hundred's. That B F sixteen figure for the Spark is actually derived from NVIDIA's F P four marketing number, so it's generous. Anyway, eight times lower, so instead of five H one hundreds, about forty Sparks.

B: [amused] Forty Sparks. Okay.

A: And here's the thing about that chain. Every number in it is a lever. Halve the candidates, the GPU count halves. Halve the tokens, it halves again. That's why the chain is the useful thing to show an interviewer, not the final number. The final number is just where the levers happen to be sitting today.

A: Now you check the other resources, quickly. Because that's how you know compute really is the bottleneck, and you're not just assuming it. Memory size. The model is two hundred twenty megabytes in B F sixteen. That's nothing. The activations, which are the intermediate values inside the model while one query's batch is running, are about twenty-five thousand six hundred tokens, times seven hundred sixty-eight wide, times maybe a dozen of those values alive at once, times two bytes. Roughly half a gigabyte per query. And how many queries are being worked on at once? That's Little's law, from the waiting-versus-working lesson. The number of things in the building at once equals how fast they arrive, times how long each one stays. Three hundred a second, times a tenth of a second each, is thirty queries in flight. Thirty times half a gig, about fifteen to twenty gigabytes, spread across the whole fleet. Fine.

A: Network. Each query brings a hundred documents, times two hundred fifty-six tokens, times about four bytes of text per token. About a hundred kilobytes a query. Times three hundred a second, thirty megabytes a second. That's about a quarter of a gigabit, on a card that does ten or twenty-five gigabits. Nothing.

A: And latency. One query is twenty-five thousand six hundred tokens times two hundred million flops. Five times ten to the twelfth. Five trillion flops for one query. At four hundred trillion a second, that's about thirteen milliseconds on an H one hundred. On a Spark, getting maybe fifty trillion a second for real, it's about a hundred milliseconds.

B: But if that's too slow, I'd just add more Sparks, right? Spread it out.

A: [jumping in] No, and this one's important. More Sparks lets you handle more queries at the same time. It doesn't make any one query faster. That query's a hundred milliseconds of math on whichever box gets it. So you have to ask yourself separately, is a hundred milliseconds inside my latency budget? Because adding Sparks won't move it.

B: Huh. So throughput and latency are two separate checks.

A: Two separate checks. So what breaks first? G P U compute, by a factor of about a hundred over everything else. Memory, network, they're not even in the conversation.

A: Now ten times. A hundred million queries a day. That's fifty H one hundreds, plus headroom. Over a hundred thousand dollars a month at rental prices. Doable. But before you sign that, you look at the levers. Candidates is the biggest one. If a cheaper stage narrows a hundred down to twenty before the big model sees them, say a small bi-encoder, or a distilled MiniLM cross-encoder, that's five times fewer flops right there. Shorter pairs, truncate documents to a hundred twenty-eight tokens, that's two times. A smaller model, two to eight times. And caching scores for repeated queries can be huge, because search queries follow what's called a Zipf distribution.

B: Which is?

A: A few items are extremely common, and there's a long tail of rare ones. The tenth most popular query gets searched about a tenth as often as the most popular one. So a small number of popular queries make up a big share of all your traffic. And caches love that. Cache the top queries and a big chunk of traffic never touches a GPU.

A: And a hundred times. A billion queries a day. That's real web-search scale. Five hundred H one hundreds just for the ranker, about a million dollars a month. And nobody does that. Nobody runs a full cross-encoder over a hundred candidates at that scale. The design changes. You build cascades of stages, each cheaper one filtering for the next. You distill heavily. You cache aggressively. And the big model only sees the top few results.

<!-- section: Predict: the ranker on a CPU -->

A: So here's a fun variation. Same ranker. But traffic is only a hundred thousand queries a day. And somebody says, let's skip the GPU, run it on a thirty-two-core CPU box. A CPU core with its vector instructions might do a hundred billion flops a second on a good day. But call the whole box about a trillion a second, actually achieved. Does it keep up?

B: [casual, a bit unsure] A hundred thousand a day is tiny. That's, what, one a second? A CPU should be fine with one a second.

A: [amused] That's the instinct. Let's check it. A hundred thousand a day divided by a hundred thousand seconds is one a second, average. Three at peak. Each query is five trillion flops, from before. So three a second is fifteen trillion flops a second. The box does one trillion. It's fifteen times short at peak. And worse, one query on its own takes five seconds.

B: [surprised] Five seconds for one query.

A: Five seconds. So the GPU wins here not because the load is big. The load is tiny. It wins because a single query is big. Twenty-five thousand tokens of math every time someone searches. Now, switch to MiniLM L six, which is about eight times fewer flops per token, and use fifty candidates instead of a hundred. That's sixteen times less work. Now one query is about a third of a second, and the box roughly keeps up at three a second.

<!-- section: Feel it: the calculator -->

A: And there's a calculator in the lesson that wires up this exact chain. Across the top you pick a model, MiniLM L six, BERT-base, BERT-large, or Qwen three point six B. And you pick a node, the thirty-two-core CPU box, a Spark, or an H one hundred. Then sliders: queries per day, from a thousand all the way to ten billion, the peak factor, candidates, tokens per pair, and what percent of peak you actually get. And underneath, five bars. Compute, memory bandwidth, memory size, network, and CPU cores. Each bar is how full one node would be at this load, on a log scale, with a line at a hundred percent meaning one node, completely full. And below that, a readout of what breaks first, how many nodes you need at seventy percent busy, how long one query takes alone, and a rough monthly cost.

B: So you drag queries per day up and everything slides right.

A: All five bars move right together. The one that crosses the hundred percent line first is your bottleneck. But the fun part is when you change the shape of the work. Candidates, tokens, model, hardware. Then the order of the bars changes. And that reordering is what "it depends" actually means. It's not a dodge. It's that the bottleneck genuinely moves.

A: A few things worth trying. Start at the defaults, then switch the node to an H one hundred. Same bottleneck, about eight times fewer nodes. Drop queries to a thousand a day, and every bar's down near zero.

B: [laughs] So the honest answer to "how does it scale" there is...

A: One box, and it's bored. Which is a real answer. Then pick MiniLM L six, ten candidates, sixty-four tokens, on the H one hundred. Now compute isn't the wall at all. There's so little math per query that the CPU work, tokenizing, handling requests, and memory bandwidth catch up. And that happens in real systems, all the time. A G P U sitting at fifteen percent utilization because the Python process feeding it is pegged. Then try Qwen three point six B with a thousand twenty-four tokens on a Spark, and look at "one query, alone". It goes red. And no number of nodes fixes a single query that takes longer than your budget. And last, pick the CPU box and slide queries up from a thousand, and just watch where it stops being enough.

<!-- section: Worked example 2: a billion web pages -->

A: [relaxed] Okay. Second problem, and this one's very TinyFish-shaped. "We want semantic search over a billion web pages. How much storage, and where does it live?" Load is a billion pages. Start with one embedding vector per page. A typical embedding model gives you seven hundred sixty-eight numbers per vector.

A: And the size of one vector depends on how you store each number. In float thirty-two, four bytes a number, that's about three kilobytes a vector. Times a billion, three terabytes. In B F sixteen, two bytes each, half that, one and a half terabytes. In int eight, one byte each, seven hundred seventy gigabytes. If you go binary, one bit per number, it's ninety-six bytes a vector, ninety-six gigabytes total. And with product quantization at sixty-four codes, it's sixty-four bytes a vector, sixty-four gigabytes.

B: Wait, how do you get three kilobytes down to sixty-four bytes? That's like fifty times smaller.

A: So the general idea is quantization. Storing each number with fewer bits than it was computed in, and accepting a small loss in accuracy for a big drop in size. Int eight is just that: one byte per value instead of four. Product quantization is a cleverer trick for vectors. You split each vector into chunks, say sixty-four chunks. And ahead of time you've learned a codebook, a list of typical-looking chunks. Then for each chunk of your vector, you just store the ID of the nearest typical chunk. So the whole vector becomes sixty-four one-byte IDs instead of three kilobytes of numbers. You lose some search quality. Not a lot.

A: So picture those five sizes as bars on a log scale, stretching from ten gigabytes on the left to ten terabytes on the right. And then three vertical lines. The Spark's RAM, at a hundred twenty-eight gigabytes. A big server with a terabyte of RAM. And an eight-terabyte SSD out near the right edge. The full-precision bars poke way past the one-terabyte line but sit comfortably under the SSD. The compressed ones, binary and product quantization, sit under the Spark's RAM line. So which line you need to be under depends on whether you're searching from memory or from disk.

A: Compare. One and a half terabytes in B F sixteen sits on a single SSD, easily. In RAM, it's a dozen Sparks' worth, or two large servers. But it's usually more than one vector a page. Pages are long, and embedding models take maybe five hundred twelve tokens at a time. So if an average page is two thousand tokens, you chunk it into about four pieces. That's four billion vectors, and six terabytes in B F sixteen. Still one or two SSDs. But a dozen machines' worth of RAM before you even make a copy. Then there's the search index on top. A popular one is called H N S W, hierarchical navigable small world. It links each vector to a few dozen of its near neighbours, so a search hops through a graph instead of scanning everything. And those links cost memory. Thirty-two neighbours, four bytes per link, that's a hundred twenty-eight bytes per vector. If your vectors are int eight, that's a sixth extra on top.

B: [a bit unsure] Okay, but couldn't you skip the fancy index and just... throw it on a GPU and compare the query against everything? GPUs are fast at exactly that.

A: [patiently] Let's put a number on it. Comparing against every vector means reading every vector. That's reading all one and a half terabytes, per query. Even at an H one hundred's three point three five terabytes a second, that's half a second per query. And the data doesn't even fit on one H one hundred. At a hundred queries a second, it's hopeless. That's why approximate nearest neighbour search exists. It finds most of the closest vectors while only looking at a tiny fraction of them, using an index, a graph or clusters. You give up a little bit of recall and you do a hundred to a thousand times less work. That's its own lesson, nearest neighbors at scale.

A: And now computing them. This is the surprise. A billion pages times two thousand tokens is two trillion tokens. A BERT-base-sized embedder, two hundred million flops per token. So four times ten to the twentieth flops total. Which sounds enormous.

B: [skeptical] Yeah, I'd have guessed that's the expensive part. Running a model over a billion pages.

A: So divide it out. An H one hundred at forty percent is four hundred trillion a second. That gets you a million GPU-seconds. Which is about two hundred eighty GPU-hours. At two or three dollars an hour, under a thousand dollars of rented time.

B: [surprised] A thousand dollars? For a billion pages?

A: Under a thousand. On one Spark it'd take about ninety days, so, rent the cluster. But the point is, computing the embeddings was never the expensive part. The expensive part is keeping them in RAM, forever, with replicas.

A: And go one step further back, fetching the pages. Say you want to crawl a billion pages in a day. A billion divided by a hundred thousand seconds is ten thousand pages a second.

B: So that's a bandwidth problem. That's a lot of pages a second.

A: That's what it sounds like. Check it. If each page is about a hundred kilobytes, ten thousand a second is one gigabyte a second. One fast network card does that. It's not bandwidth. But each fetch takes about a second, end to end. Looking up the name, setting up the encryption, some slow server on the other side taking its time. And Little's law again. Ten thousand arriving a second, times one second each, means ten thousand fetches have to be in flight at all times. So it's a concurrency problem. Which is exactly the problem waiting versus working solves. One process holding thousands of waits open at once.

A: So what breaks first, for the embeddings? Memory size, if you insist on holding full vectors in RAM. At ten times, you compress, int eight or product quantization. You keep only the compressed codes in RAM, put the full vectors on SSD for re-scoring the top results, and you shard. Sharding means splitting the dataset into slices across machines, each holding a fraction, and every query asks every shard and merges the answers. And at a hundred times, you've got hundreds of shards, and the cost of asking every one of them, per query, becomes the next wall.

<!-- section: Worked example 3: the KV cache -->

A: Third problem. "We serve Llama three point one eight B for a chat product. How many users per GPU?"

B: [working it out] Okay, so users per GPU. I'd want to know how many people are using it. Like, if we have a hundred thousand people signed in...

A: [gently] That's the natural way in, and it's the wrong number. Users don't hold a GPU all day. They hold it while a response is being generated. The rest of the time they're reading, or typing, or gone. So what you want is how many responses are being generated at the same moment. And Little's law turns an arrival rate into exactly that. Say ten messages arrive a second at peak. Each response streams three hundred tokens at twenty tokens a second, so it takes fifteen seconds. Ten a second, times fifteen seconds each, is a hundred fifty responses generating at any moment.

B: Okay. A hundred fifty at once. And each of those is holding what?

A: Its whole conversation, in the K V cache. Quick refresher, because this one matters here. When the model generates, attention needs the keys and values for every past token, in every layer. Rather than recompute them each step, you store them. That's the K V cache. Each conversation has its own. And it gets read in full on every single decode step. Say the average conversation is about four thousand tokens.

A: So how big is it? For Llama three point one eight B, per token, you store two things, a key and a value, for each of thirty-two layers, for each of eight K V heads, each a hundred twenty-eight numbers, at two bytes each. Multiply that out and it's a hundred twenty-eight kilobytes per token. Times about four thousand tokens, that's half a gigabyte per conversation.

B: Half a gig. Per chat.

A: Per chat. Times a hundred fifty, about eighty gigabytes of cache. Plus sixteen gigabytes for the weights themselves. And now it gets interesting, because there are two different walls, and which one you hit depends on the hardware.

A: Picture two rows. One for the Spark, one for the H one hundred. Each row has two bars. One bar says how many users fit in memory. The other says how many users you can serve at a usable speed, at least ten tokens a second each, given the memory bandwidth. Whichever bar is shorter is the limit.

A: H one hundred first. Eighty gigabytes, minus sixteen for weights, leaves about sixty-four for cache. At about half a gig per user, that's about a hundred nineteen users. That's the short bar. Bandwidth isn't a problem at all. Each decode step reads the weights plus all the caches, sixteen plus sixty-four, eighty gigabytes, and at three point three five terabytes a second that takes about twenty-four milliseconds. So everybody gets about forty tokens a second. The bandwidth bar would go all the way out to almost six hundred users. So memory size breaks first. A hundred fifty users needs two H one hundreds, three with headroom.

A: Now the Spark. A hundred twenty-eight gigabytes of memory would hold about two hundred eight users. Lots of room. But remember, every step reads the weights plus every user's cache. If you want to give each user ten tokens a second, each step has to finish within a hundred milliseconds. At two hundred seventy-three gigabytes a second, a hundred milliseconds lets you read about twenty-seven gigabytes. Sixteen of that is weights. That leaves room for about twenty-one users' caches.

B: [surprised] Twenty-one. Even though two hundred fit.

A: Even though two hundred fit. Bandwidth breaks first on the Spark. So a hundred fifty users needs about eight Sparks, not one. Same model, same users, and the wall flips depending on the machine. Which is why you can't just say "it's memory-bound". You have to say which memory limit.

A: So, ten times the traffic. Fifteen hundred responses generating at once, still four thousand tokens of context. Before any tricks, how many H one hundreds?

B: Fifteen hundred times half a gig is... seven hundred fifty? Call it eight hundred gigs. At sixty-four per GPU, that's twelve or thirteen. And honestly, my instinct is to just get a faster GPU.

A: [jumping in] Thirteen H one hundreds, and more with headroom. The arithmetic's right. The instinct isn't. A faster GPU with the same eighty gigabytes holds exactly the same number of conversations. Memory size was the wall, not speed. What actually helps is shrinking the cache. Store it in F P eight, one byte per value instead of two. Half the memory, twice the users. Shorten the context, summarize or truncate the old turns. At two thousand tokens instead of four, you double the users again. Share common prefixes. Every conversation starts with the same system prompt, so store it once instead of a thousand times. That's prefix caching. Or pick a model with fewer K V heads, or a smaller cache design. All of those cut GPUs without buying any.

<!-- section: A billion users -->

B: [a bit unsure] Okay, here's the one that actually scares me. When an interviewer says "assume it's a billion users". My brain goes, a billion requests a second, and I just freeze.

A: [reassuring] Yeah, and that's the thing to catch. A billion users is not a billion requests a second. The first thing you do is turn users into a rate, because machines fail per second, not per user. So you ask, or assume, how many are active on a given day. Say twenty percent, two hundred million. And how many requests each one makes a day, say five. That's a billion requests a day. Divide by a hundred thousand, ten thousand a second. Thirty thousand at peak.

B: [working it out] Oh. So it went from a billion to thirty thousand.

A: And now you just run the method. What does each request cost in each resource, and so on. But saying that conversion out loud does two things. It shows the interviewer the scale is tractable. Tens of thousands a second is big, but it's a known kind of big. And it lets them correct the assumptions that actually matter, the twenty percent, the five a day, before you build everything else on top of them.

<!-- section: Saying it out loud: the interview script -->

A: Which brings up the other half of all this. The arithmetic is only half. The other half is narrating it, so the interviewer can follow along, correct your assumptions, and see your judgment. And there's basically a script. You practise it until it's boring.

A: First, restate and scope. "So we're asking how the ranking service holds up as search traffic grows. Can I assume we're talking about serving, not training?" Second, state the load, with numbers, and invite correction. "I'll assume ten million a day, peaking at three times average, a hundred candidates, two fifty-six tokens each. Tell me if any of those are way off." Third, name the resources before you compute anything. "The things that can run out are GPU compute, GPU memory, network, and CPU for tokenizing. I expect compute to dominate, because a cross-encoder runs a full forward pass per pair. Let me check."

B: So you guess the answer before you do the math?

A: You predict it, out loud. Then the math either confirms it or it surprises you, and either way the interviewer sees how you think. Fourth, do the chain, out loud, rounding hard. "A day's about a hundred thousand seconds, so a hundred a second, three hundred at peak..." And you write each line on the whiteboard, with units on every number. Fifth, compare to one machine, then add headroom. "An H one hundred does about four hundred trillion real flops a second, so five GPUs. I'd run them at seventy percent and keep a spare. Eight." Sixth, sanity-check the other resources, one sentence each. "Memory, the model's two hundred megabytes, fine. Network, thirty megabytes a second, fine. Latency, thirteen milliseconds a query on one H one hundred, inside budget." Seventh, what breaks first, then ten times and a hundred times. "Compute. At ten times I'd shrink candidates with a cheap first stage and cache popular queries before buying fifty GPUs. At a hundred times the design changes. Cascade, distill, cache." And eighth, say how you'd check it. "Before committing, I'd load-test one GPU to replace my forty percent assumption with a measured number."

B: That last one feels almost like an afterthought.

A: [firmly] It's the one people skip. And it's the one that makes you sound like an engineer instead of a calculator. An estimate is a hypothesis. You're supposed to go test it. Which is what the build is for.

<!-- section: Build It -->

A: So here's what you'd build, on the Spark. You estimate your ranker's capacity on paper, measure the real ceiling, load-test it, and write down how wrong you were. If your own cross-encoder is a pain to load outside the training code, there are two public stand-ins. MiniLM L six, the classic ms marco re-ranker, twenty-two million parameters. Or the B G E reranker base, two hundred seventy-eight million, built on XLM RoBERTa. Both load with the cross encoder class in sentence transformers, though check the docs in case that's moved. Setup's one sentence: a fresh virtual environment with torch, sentence transformers, FastAPI and a couple of helpers. On the Spark, check that torch actually sees the GPU, because ARM plus Blackwell wheels can be picky, and NVIDIA's container images are the safe fallback.

A: And then you start a journal. Just a file with a table in it. Date, the question, key assumptions, your estimate, what you measured, the ratio of measured to estimate, and what you missed. And this file outlives the lesson. Every estimate you make from now on, at work or in practice, goes in there, with the real number next to it once you have one.

B: [skeptical] Why bother writing them down? I'd know if I was wrong.

A: Would you, though? Without the journal, you remember the estimates you nailed and quietly forget the ones that were five times off. With it, your guesses get measurably better, because you can see which kind of assumption you keep getting wrong.

A: First task, on paper. No calculator, no interactive figure. Your ranker, or the stand-in, at three loads: a thousand, a hundred thousand, and ten million queries a day. You write down your assumptions. Peak factor, candidates, tokens per pair, and the parameter count, minus the embedding table, which is vocabulary size times hidden size. Then the chain, peak Q P S to pairs to tokens to flops. Then you compare against one Spark, using a hundred twenty-five trillion flops a second times forty percent as your guess, and against one H one hundred. For each load you write down how many Sparks, what breaks first, and how long one query takes alone. And one sentence on what you'd change at ten times the biggest load. Only then do you open the calculator and check. If you disagree with it by more than two times, find which step. And all three go in the journal, with "measured" blank.

A: Second task, replace your two guesses with measurements. Your estimate leaned on two things you didn't know, the Spark's real peak, and that forty percent. So first, the hardware ceiling. You multiply two big square matrices of B F sixteen numbers, eight thousand one hundred ninety-two on a side, a bunch of times, and time it. Multiplying two n by n matrices costs two times n cubed flops, so you divide that by the time and you get flops per second. That's the best your GPU will ever do, on the friendliest workload there is. Your real peak, not the spec sheet's.

B: Is there a catch with timing GPU stuff?

A: One big one. GPU work is asynchronous. When Python tells the GPU to multiply, the call returns right away, before the work is done. So you have to explicitly wait for the GPU to finish, a sync, before you stop the clock, or you're timing how fast Python can hand out jobs. Then the part that actually teaches. A benchmark that scores one query's worth of pairs in a single call and reports achieved flops. You sweep the number of candidates, one, ten, fifty, a hundred, two hundred, at about two hundred fifty-six tokens a pair. For each one, milliseconds per query, pairs per second, achieved flops, and achieved divided by your ceiling. That last number's your M F U. And you count the real tokens per pair with the model's tokenizer, instead of assuming two fifty-six. Try it in half precision too, see if it helps. For calibration, on an M four Pro Mac, MiniLM L six scored a hundred pairs of two hundred forty-three tokens in about a hundred fifty milliseconds on the Mac's GPU, which is about four trillion flops a second achieved. And about three hundred ten milliseconds on the CPU. The Spark should be a lot faster. How much faster is what you're measuring.

A: Third, wrap it in a tiny server. One endpoint. A query and a list of documents come in, scores go out. One model and one lock, so requests take turns on the GPU. That's honest for one GPU, and it makes the queueing visible. One worker, a big connection backlog so the operating system doesn't turn people away at the door, and in another terminal you watch the GPU's utilization tick by every second.

A: Fourth, the load generator. And this is where it's easy to fool yourself.

B: [casual] I'd just loop. Send a request, wait for the answer, send the next one. Maybe a few of those loops in parallel.

A: That's what almost everyone writes first. It's called a closed loop, and it lies. Because when the server slows down, your loop slows down with it. It sends fewer requests exactly when things get bad. So it stops measuring during the worst moments, and the latency numbers come out way better than what real users would feel. That has a name, coordinated omission, and the p ninety-nine lesson goes deep on it. Real users don't wait for each other. So you write an open loop. You decide the send times in advance, at a fixed average rate, with random gaps between them, and you fire each request at its time whether or not the earlier ones have come back. And you measure latency from when the request was scheduled to go out, not from when it actually left. So if your own client backs up, that delay still shows.

A: Then you step the rate. A quarter, a half, three quarters, one, and one and a quarter times the max you predicted for one GPU. Thirty seconds each, and print a row per step. Run it from the Mac over Tailscale, and from the Spark itself. The second one takes the network out of the picture. Your estimate already predicted the network wouldn't matter, so this checks that too. And then have an agent review it, specifically: is it really open loop, and does latency really start at the scheduled time?

A: And the last task closes the loop in the journal. Fill in measured and ratio for each estimate. Then one line each. Which assumption was furthest off? Was the bottleneck the one you predicted? If you measured thirty percent instead of forty, does that change the ten-million-a-day answer enough to matter? And then add three new estimates from your actual week, nothing to do with the ranker. How long your next training run takes, which is tokens times six N divided by your measured flops. How big your eval set's cached embeddings are. What your team's L L M API calls cost per month. And come back and fill them in when you know. You're done when the journal has the three paper estimates with measured numbers and ratios, you know the Spark's real matmul ceiling and your ranker's M F U at a hundred candidates, you have a load test with a clear knee and you can say what was saturated there, and you can give the ninety-second answer from memory with your own measured numbers in it.

<!-- section: Measure -->

A: So what should the numbers look like? Going in, your predictions are a ceiling of a hundred twenty-five trillion, which is the spec, an upper bound. Two hundred fifty-six tokens per pair. And achieved flops of fifty trillion at a hundred pairs, which is forty percent of a hundred twenty-five. The rest you fill in. One query's time, the max Q P S on one Spark while keeping p ninety-nine, the slowest one percent, under three hundred milliseconds, GPU utilization at that rate, and how many Sparks you'd need for ten million a day.

A: First, the matmul ceiling will come in under the spec sheet. Partly because the Spark's B F sixteen number is derived from a sparse F P four marketing figure. And partly because even well-understood GPUs rarely sustain more than seventy to eighty percent of peak on a big matmul. Whatever you get, that's your hundred percent for M F U from now on.

A: Second, M F U will depend a lot on the model size and the batch. MiniLM L six is only three hundred eighty-four wide. So its matrix multiplies are small.

B: Why does small make it worse? Less work should just be faster.

A: It's faster, but it's less efficient. A big GPU has a huge number of math units, and small matrix multiplies can't keep them all busy at once. Plus there's fixed overhead on every call, Python, launching the GPU kernels, tokenization, and that overhead is the same whether the model's big or small. So expect M F U at one candidate to be terrible, and at a hundred or more to be much better. A bigger model, BERT-base or the B G E reranker, should get closer to your forty percent guess. And if M F U keeps rising as you add candidates, you're literally watching the GPU go from starved to busy.

A: Third, the load test should show a knee. Below it, latency is flat, close to the time for one query alone. Then as the offered load passes roughly seventy to eighty percent of the max, which is one divided by the one-query time, so if a query takes a hundred milliseconds, the max is ten a second, p ninety-nine rises sharply. And past a hundred percent it just grows without limit, because the queue never drains, and achieved Q P S flattens out at the max. And you can check Little's law at a rate below the knee. Achieved Q P S times mean latency should equal the average number of requests in flight. With one GPU lock, that should be under one.

A: And the ratio is the whole point. If your predicted max Q P S was within two times of what you measured, that's a good estimate. If it was off by five times or more, one assumption is badly wrong, and finding which one is worth more than the measurement itself. The usual suspects are M F U way below forty percent, because the model's small. Or CPU and Python overhead you didn't count. Or real tokens per pair way bigger than you assumed, because long documents weren't truncated.

<!-- section: Break It -->

A: Then you break it, four ways. First, size for the average. Run the load generator at your predicted average rate for sixty seconds, then jump to three times that for thirty seconds, the peak, then back down. Watch p ninety-nine during the burst, and how long it takes to recover after. If the peak rate is more than one GPU can do, the queue grows for the whole thirty seconds, and then takes a good while to drain, even after the burst is over. Systems sized for the average don't fail on average days.

A: Second, let one long document in. Raise the max length to a thousand twenty-four, and make one of the hundred documents in every query a thousand words long. Then measure milliseconds per query.

B: [skeptical] One document out of a hundred? That can't matter much.

A: [amused] It matters a lot. Batches are padded to their longest member. Every row in the batch has to be the same length, so the short ones get filled out with padding. So one long document makes all hundred rows cost a thousand twenty-four tokens. And on top of that, attention's share of the cost grows with length. Expect it to be several times slower, for one bad document in a hundred. The fixes are to truncate, or sort pairs by length and batch similar lengths together.

A: Third, starve the GPU. Switch to MiniLM L six, five candidates a query, sixty-four-token pairs, and load test it. Watch the GPU utilization and H top side by side. GPU utilization stays low, and one CPU core is pinned. Tokenizing, parsing JSON, Python overhead. That's now the bottleneck. It's the CPU bar crossing the compute bar in the calculator, happening for real. And the fix isn't a bigger GPU. It's more CPU workers, or batching several queries into one forward pass.

A: And fourth, here's a bad estimate, the kind you'd hear in a design review, and it has five mistakes in it. "We store a billion vectors of seven hundred sixty-eight float thirty-twos, so seven hundred sixty-eight gigabytes. We get a hundred million queries a day, that's about a hundred a second. Each query reads one kilobyte from ten shards over a ten gigabit network, which is ten gigabytes a second of capacity, so we're fine. Replication isn't needed for an estimate."

B: [working it out] Okay, float thirty-two is four bytes, not one. So that's four times seven sixty-eight, about three kilobytes a vector, times a billion. Three terabytes, not seven hundred sixty-eight gigs.

A: That's one.

B: A hundred million a day over a hundred thousand seconds... is a thousand a second, not a hundred. They dropped a zero.

A: Two. And there's another one hiding in that same sentence.

B: No peak factor. So, two to three thousand a second.

A: Three. Then the network.

B: Ten gigabits is... divide by eight. One and a quarter gigabytes a second, not ten.

A: Four. Bits versus bytes is the most common factor-of-eight mistake there is. And the last one is the sentence that sounds the most reasonable. Replication is part of the estimate. You need at least two or three copies for availability, and that multiplies the storage and the cost. If you leave it out, you're estimating a system that goes down the first time a disk dies.

<!-- section: Connections and close -->

A: If you want more of this, Jon Bentley's Back of the Envelope column is short and funny and still the original. And Simon Eskildsen's Napkin Math is the best place to refresh your table of numbers, with the code to measure them yourself. And from here, the knee in your load test is the next lesson, p ninety-nine and load testing. Load balancing is what you need once "eight H one hundreds" turns into eight actual servers. And batching is the main lever for both problems we hit: the little ranker that starves its GPU, and the chat server that's stuck on memory.

B: [working it out] Okay, let me try to say it. "How does it scale" isn't a yes or no. It's asking what runs out first. So you turn the load into a rate per second, at peak not average, multiply by what each request costs, and divide by what one machine can do. And the GPU count is the answer.

A: [gently] Almost. The GPU count is just where the levers happen to be sitting. The answer is the bottleneck. Which resource runs out first, at what load, and what you'd change when the load goes up ten times. And that resource isn't always compute. It was compute for the ranker, memory size for the chat server on an H one hundred, bandwidth for the same server on a Spark, and concurrency for the crawler. And then you say how you'd check it. Because the estimate is a guess, and the measurement is what makes it an answer.
