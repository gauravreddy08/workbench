<!-- section: The Problem -->

A: [relaxed, thinking out loud] So go back to the baseline run. Your naive server on the Spark, the one that serves Llama three point one eight B one request at a time, and the benchmark harness that hammers it with a fixed number of workers. Look at the row where sixteen workers each ask for two hundred fifty-six tokens. The server takes them one by one. So the sixteenth person waits about five minutes before they see their first word. And the total throughput, across everybody, is about thirteen tokens a second. Which is the same as it does for one person. You added fifteen users and all you got was waiting.

B: [casual] I mean, that sounds kind of fair though? The GPU's busy with person one, so person two waits. It's doing as much as it can.

A: [firmly] That's the thing. It's not doing as much as it can. It's barely doing anything. Remember the bandwidth lesson. To make one token, the GPU has to read every single weight of the model out of memory. Eight billion weights, two bytes each, so sixteen gigabytes. And the Spark's memory delivers about two hundred seventy-three gigabytes a second. Sixteen divided by two seventy-three is about fifty-nine milliseconds. That's where seventeen tokens a second comes from. But the actual math in that step? About sixteen billion operations. The chip could do that in a tiny sliver of the time. So for more than ninety-nine percent of every step, the math units are sitting there waiting for bytes to show up.

B: [working it out] Okay, so the GPU isn't busy with person one. It's waiting on memory for person one.

A: Right. And meanwhile the server makes every user wait for every other user's entire answer. That's the absurd part. The GPU has room for dozens of users in every step, and the server only lets one in.

B: So the fix is just... run several requests together.

A: It sounds like one line, doesn't it? "Process several requests together." It isn't. Requests show up at random times. Prompts are different lengths. One person wants a one-word answer, the next one wants an essay. Put them in a batch naively and the one-word answer waits for the essay. The essay waits for the batch to fill up. And the person who shows up one millisecond after the batch started waits for all of it. Getting batching right for language models took the field until twenty twenty-two. And the fix kind of changed what an inference server is.

<!-- section: Origin -->

A: Batching in model serving is old, actually. There was a system called Clipper, by Daniel Crankshaw and colleagues, published in twenty seventeen, and then TensorFlow Serving, and NVIDIA's Triton server. They all batched. Gather a few requests, run them through the model together, hand back all the answers. And for an image classifier that works beautifully. Every request is one forward pass, same shape, takes the same time. Nobody's ever waiting on anybody else.

B: And language models aren't one forward pass.

A: [thinking out loud] They're hundreds. One per output token. And nobody knows in advance how many. So that broke the assumption. And yet in twenty twenty-one, the serving systems, NVIDIA's FasterTransformer running behind Triton for example, still batched whole requests. A batch went in, ran until its longest member was done, and came out together.

B: [skeptical] And nobody thought, hey, that's dumb?

A: [laughs] Somebody did. In twenty twenty-two, a group at Seoul National University and a company called FriendliAI, Gyeong-In Yu, Joo Seong Jeong, Geon-Woo Kim, Soojeong Kim and Byung-Gon Chun, published a system called Orca, at O S D I, which is one of the big systems conferences. And the idea was almost embarrassingly simple to say. Let the scheduler make a decision after every iteration. Every single forward pass. If a sequence just finished, it leaves right now. If a new one's waiting, it joins at the next step. They called it iteration-level scheduling. And they reported up to thirty-six point nine times the throughput of FasterTransformer, at the same latency, on a G P T three sized model, a hundred seventy-five billion parameters. Within about a year every serious engine worked this way. V L L M, Hugging Face's T G I, NVIDIA's Tensor R T L L M, which calls it in-flight batching. But the name that stuck is continuous batching.

<!-- section: The Idea: One read, many users -->

A: So, the kitchen from the bandwidth lesson, just to have it back in your head. A chef who can chop a thousand onions a second, fed by one slow delivery van from across town. Decode speed is the van's speed. Every step, the whole model drives across town so the chef can do one token's worth of chopping.

B: And batching is...

A: Batching is noticing the van can carry everyone's onions. Put sixty-four users' latest tokens into the same step, and each weight, once it arrives on the chip, gets used sixty-four times instead of once. The expensive part of the step, reading sixteen gigabytes, happens once.

B: [a bit unsure] Okay but... I'd still expect each person to get slower. Like, if the GPU is now making sixty-four tokens per step instead of one, isn't each user getting a sixty-fourth of it? Sixty-four times slower?

A: [gently] That's the natural picture, and it's the one to throw out. A user doesn't get a slice of the step. Every user gets one token from every step. So the only thing that slows a user down is the step itself getting longer. And the step barely gets longer, because the thing that made it long, the weight read, is shared. What grows with the batch is only what isn't shared. And there are two of those. One is the math. Sixty-four tokens of matrix-vector work instead of one. Which is still tiny compared to what the chip can do, way below the point where math would start to matter. The other one is the K V caches.

B: Remind me exactly what's in the K V cache.

A: So for every token a sequence has already seen, every layer stored that token's key and value vectors, so attention doesn't have to recompute them. That's the K V cache. And attention reads the whole thing, every past token, at every decode step. For Llama three point one eight B in B F sixteen, it's a hundred twenty-eight kilobytes per token. And here's the key bit: the weights are shared across the batch, but each user's cache is their own bytes. Nobody else can use them.

A: So a decode step costs roughly this. Take the weight bytes, add the batch size times each user's cache bytes, and divide the whole thing by the bandwidth. With real numbers. The weights are sixteen point oh six gigabytes. Divide by two seventy-three, that's fifty-eight point eight milliseconds, paid once per step no matter what. Now give each user a thousand twenty-four tokens of context. Times a hundred twenty-eight kilobytes is about point one three gigabytes of cache each. Which takes about half a millisecond to read. Point four nine milliseconds, per user, per step.

A: So try it. With those numbers, how much longer does one decode step take with sixty-four users in it than with one? And what happens to total tokens per second?

B: [working it out] Okay. Fifty-nine milliseconds for the weights. Then sixty-four users times half a millisecond is... thirty-two-ish. So call it ninety milliseconds. So the step's, what, one and a half times longer?

A: [encouraging] Yep. About ninety instead of about fifty-nine. Keep going.

B: And it makes sixty-four tokens instead of one. So sixty-four tokens per ninety milliseconds... that's like seven hundred tokens a second?

A: About seven hundred ten. From about seventeen. That's roughly forty-two times more throughput. And each user's own stream goes from seventeen tokens a second down to about eleven. Not down to a sixty-fourth. Down to eleven.

B: [surprised] Huh. And the math never shows up?

A: Never even enters into it at this size. Sixty-four tokens times sixteen billion operations is about a trillion operations per step. The Spark can do roughly a hundred twenty-five trillion a second, so that's under ten milliseconds. And it overlaps with the memory traffic anyway, so it hides inside the ninety.

A: Now picture that as a chart. Five rows, batch sizes one, four, sixteen, sixty-four, two fifty-six. Each row is a bar for how long one step takes. The bar has a dark part on the left, which is the weights, and it's the exact same width in every row. Then a light part stuck on the end, which is everybody's caches, and that light part grows. At a batch of one, the step is fifty-nine milliseconds, seventeen tokens a second total, seventeen per user. At four, sixty-one milliseconds, about sixty-six total, sixteen per user. At sixteen, sixty-seven milliseconds, two hundred forty total, fifteen per user. So up to sixteen the step barely moves. The extra throughput is basically free.

B: And then?

A: At sixty-four it's the ninety milliseconds we just did. The caches are now about a third of the traffic, and each user feels it. Eleven tokens a second. And at two fifty-six the light part is longer than the dark part. A hundred eighty-five milliseconds a step, about thirteen ninety tokens a second total, but each person gets five. So now you're trading their experience for your throughput. And notice what never showed up in any row. The compute ceiling. At a thousand tokens of context, the Spark runs out of bandwidth for caches way before it runs out of math. Oh, and these are ceilings. A real server lands below them, the way your naive one did, thirteen instead of seventeen. It's the shape that matters.

B: [amused] So that's the business model.

A: [matter-of-fact] That's the whole economic case. A GPU-hour costs the same whether it makes seventeen tokens a second or seven hundred. Batching is how an inference company divides that hour by forty.

<!-- section: The Idea: Static batching and its three taxes -->

A: So, the simplest way to batch. Collect some number of requests, pad them so they're all the same shape, run them through generate together, and hand back everyone's answer when it finishes. That's called static batching. A fixed group, run from start to finish together, nobody joins, nobody leaves until the whole group's done. And it was the standard way to batch models before Orca. It has three problems. I think of them as taxes, because each one has a cost you can actually see.

A: Tax one is padding. A GPU wants a rectangle. Every row the same length. Prompts aren't the same length. So the short ones get filler tokens stuck on, to make them as long as the longest. And next to that you pass an attention mask, which is just a row of ones and zeros, one per position, saying which positions are real. The zero positions get a score of minus infinity before the softmax, so after the softmax they get zero weight. Attention just doesn't see them.

B: So the answer's still correct.

A: The answer's correct. But the filler is real computation and real cache memory. Picture four prompts drawn as bars, all lined up on the right edge, with dashed filler on the left of the short ones to bring them up to the longest. In the example in the lesson, forty-two percent of the whole prefill is filler. Computed, masked, thrown away. And notice it's padded on the left, not the right. For a decoder model like Llama, you pad on the left, so every row's last real token sits in the same final column. Because that last column is where the next token gets appended. If you padded on the right, the short rows would be appending their next word after a pile of filler.

B: Okay. Tax two?

A: Tax two is waiting for the longest. Answer lengths vary like crazy. "Yes" is one token. A code review is a thousand. A static batch runs until its longest member is done. So every row that finished early keeps its place in every step until then, producing padding that gets thrown away. Picture four rows starting together. Row one runs the whole way across. Row four is done after a short stretch, and then it's just a dashed placeholder for the rest of the batch. A seat that nobody's allowed to take. In that example, if you count every seat at every step, it's sixty out of a hundred twenty seat-steps actually doing anything. Half. And in real chat traffic, where one long answer in a batch is pretty common, it can be worse.

A: And tax three is the late arrival. A fifth request, R five, shows up a moment after the batch started. The GPU had room for it in basically every step after that, because row four left early. But the batch is closed. So R five waits for the whole thing to finish, and then gets its turn. Its time to first token is the length of the longest answer in someone else's batch. That's called head-of-line blocking. The term's from networking, one slow packet at the front of a queue holding up everything behind it, even stuff that'd be quick.

B: [working it out] That's the same as the sync server thing, kind of. The queue isn't the problem, it's that the one at the front isn't letting go.

A: Same shape exactly. Something at the front is occupying the thing everyone needs, and it doesn't let go until it's completely done.

<!-- section: The Idea: Dynamic batching -->

A: And there's a fourth problem hiding in "collect some number of requests". What if only three show up? A pure static batcher just waits for the fourth. So at three in the morning, when one person sends one request, they wait until three strangers wake up.

A: Here's a version that actually bites you. Your static server uses a batch size of sixteen, and it waits for sixteen requests before running anything. Your harness runs at a concurrency of four. And it warms up first with three requests, one after another. What does the benchmark report?

B: [a bit unsure] Something terrible? Like, it waits a while to fill, so huge latency for the first batch?

A: [flatly] Nothing. Ever. The harness is a closed loop: each worker only sends its next request after its last answer came back. So there are never more than four requests in the system. And during the warm-up, only one. The batch never gets to sixteen, so the server never runs anything, and the workers wait forever on their very first request. It's a deadlock.

B: Oh. Because the workers are waiting for the server and the server's waiting for the workers.

A: Exactly that. And it bites at sixteen too, just later. When the run winds down and there are fewer than sixteen requests left, the last batch never fills, and the run never finishes. That actually happened to me while I was testing this code. The last few requests of a run just hung.

A: The fix is a deadline. Start the batch when it's full, or when the oldest waiting request has waited some maximum time. Whichever comes first. That's dynamic batching. Triton's version is literally called the dynamic batcher, and the knob is called max queue delay, in microseconds. The window's a dial. Zero means never wait, just batch whatever's there right now. Large means wait for fuller batches. Every request pays up to one window of extra latency, and in exchange the GPU runs fuller steps. Typical values are a few milliseconds up to a few tens of milliseconds.

B: And that fixes the taxes?

A: It fixes the deadlock. It doesn't touch taxes two and three. Once a batch starts, it's still closed until its longest member finishes.

<!-- section: The Idea: Continuous batching -->

A: So go back to what the GPU actually does with one request. It's not one big operation. It's a prefill, the whole prompt in one pass, which makes the first token. And then hundreds of tiny decode steps, all the same size. And every one of those steps is a natural break point. Between any two steps, the scheduler could ask: who's done? Who's waiting? Who should be in the next step?

B: [skeptical] So it's a smarter queue. Like, it keeps the line moving better.

A: [jumping in] No. The line was never the problem, the line's the same. What changes is the batch itself. In static batching the batch is a group that travels together, start to finish. In continuous batching the batch is just whoever's in it right now, and each sequence is at its own position in its own answer. One's on token three, one's on token two hundred. Think of it as a bus with seats. At every stop somebody gets off and somebody gets on. And the bus never sits at the terminal waiting for the last passenger to finish their trip.

A: That's iteration-level scheduling, Orca's idea. Making the scheduling decision before every forward pass, instead of once per request. And continuous batching is just that idea applied to language model serving. And the server turns into a loop that never ends. Four moves. Admit: if there are free seats and requests waiting, take some in and run their prefill, which gives them their first token. Step: run one forward pass for everybody in the batch, and each one gets one new token. Emit: send each new token down its own user's stream. Evict: anyone who just hit their stop token, or hit their max tokens, leaves. And their seat and their cache memory are freed right then.

B: And that's once per token.

A: Once per token, forever. Now, there's an interactive figure for this that's worth describing, because playing with it is the fastest way to feel it. Ten requests, drawn as rows on a timeline, time in decode steps. A dashed line is waiting in the queue. A solid blue bit is the prefill. Light blue is decoding. And grey hatching means the request is finished, but its seat's still held by the batch. Under that there's a strip showing every GPU seat at every step, full or empty or grey. And you can flip between four policies: no batching, static, dynamic, continuous. Plus mixed lengths or equal lengths, requests trickling in or all arriving at once, and a slider for how many seats the GPU has, one to eight. Along the bottom it reads out how busy the seats were, average and worst time to first token, average latency, when everything finished, and throughput. It treats every step as costing the same, about sixty milliseconds, since decode is bandwidth-bound. The bar chart showed it actually creeps up as the batch grows, but that's a detail here.

A: Start with mixed lengths, trickling in, four seats. No batching takes a hundred sixty steps to get through everything, and uses a quarter of the seats. Static gets that down to ninety-two steps, but the seat strip is full of grey. Seats held by finished sequences. Continuous finishes in forty-six steps, with about eighty-seven percent of the seats busy. And the average time to first token goes from twenty-eight steps under static to under six.

B: Twenty-eight to six. Just from letting people in between steps.

A: Just from that. Then switch to dynamic and drag the max wait slider. At zero, it launches tiny batches immediately. Turn it up and the batches get fuller, but everybody waits longer to start. And neither end of the slider gets rid of the grey. Then here's the one to remember. Switch to equal lengths, all arriving at once. And static, dynamic and continuous become identical. Like, the exact same picture.

B: [surprised] Identical? Even continuous?

A: When everyone shows up together and wants the same amount, there's nothing for continuous batching to fix. Nobody finishes early, so no seat goes grey. Nobody arrives late, so nobody's blocked. And the last thing to try is eight seats, mixed lengths. Continuous gets every request its first token within a step or so of arriving, because there's always a free seat. The cost of more seats is memory, which we'll get to.

A: And that equal-lengths case matters for you directly. Your harness is a closed loop: each worker only sends its next request after its last one finished, so the number of requests in flight is always exactly the number of workers. And it uses a fixed max tokens with ignore E O S on, so the model can't stop early. So every request is the same length, and at sixteen workers all sixteen start together and finish together. That's the "equal lengths, all at once" case. So expect dynamic batching to look surprisingly good at sixteen, and plan one extra run with mixed lengths to see the real difference.

<!-- section: The Idea: Prefill and decode in the same step -->

A: There's a wrinkle that picture hides. A new request needs a prefill. Its whole prompt, maybe hundreds or thousands of tokens, through the model in one pass. Meanwhile the running sequences each need one decode token. So what happens to them while the newcomer's prefilling?

B: They... wait?

A: In the simplest design, the one you're about to build, yes. A step is either a prefill for the newcomers or a decode for everyone else. And when a two-thousand-token prompt arrives, every running stream freezes for that prefill. And it's not short. Prefill costs about two operations per weight per token. So two, times eight billion, times two thousand. That's thirty-two trillion operations. On the Spark that's on the order of half a second, or more.

B: So sixty-three people see their text just stop.

A: For half a second, because one person pasted a document. The name for the gap between two tokens in one stream is inter-token latency, I T L. And a prefill stall shows up as one huge gap in it. In your harness that's the max gap number.

A: Orca's answer was to mix them. One forward pass can hold the newcomer's prompt tokens and everyone else's decode tokens, together. Because the big matrix multiplies don't care which request a token came from. A token's a vector, it gets multiplied by the weights, done. Only attention cares, because each token has to look at its own sequence's past and nobody else's. So Orca flattened all the tokens from all the requests into one long list for the matrix multiplies, and split them back up by request just for attention. They called that selective batching.

B: Okay, so that fixes the freeze.

A: It fixes having a separate step. But not the size. A two-thousand-token prompt still makes one giant step, and everyone still waits for that giant step. So the next idea was chunked prefill. That's from Amey Agrawal and colleagues, a paper called SARATHI in twenty twenty-three, and then Sarathi-Serve the year after. You split the long prompt into pieces of a few hundred tokens and do one piece per step. And each step has a fixed token budget, a cap on how many tokens, prefill plus decode, go into one forward pass. Which bounds how slow any step can get. You fill the budget with everyone's decode tokens first, then fill the rest with a chunk of the newcomer's prompt.

A: Picture one of those steps as a single bar, five hundred twelve tokens wide. A little dark sliver on the left: sixty-three running users, one decode token each. Then the rest of the bar, four hundred forty-nine tokens, is chunk two of a two-thousand-token prompt. Without chunking, that would've been one step of two thousand and sixty-three tokens, and sixty-three streams freeze for it. With chunking, it's five steps of at most five hundred twelve, and every stream keeps moving. The decodes stay smooth, and the newcomer's time to first token gets a little longer.

B: [working it out] Wait, and there's something nice there, right? Decode is the memory-bound thing, prefill is the math-heavy thing...

A: That's the bonus. Decode steps are memory-bound, prefill is compute-bound. So mixing them puts both halves of the chip to work in the same pass. The prefill chunk soaks up math that the decode step was leaving idle anyway. And that's now standard, in V L L M and in S G Lang.

A: And if you drew the whole scheduler, it's the loop on top, admit, one forward pass, emit, evict, with an arrow back around. Under it, a little grid of seats over eight steps. Seat one has request B, which finishes after step two, and at step three request D sits down in that same seat. Seat zero has request A, the long one, and nobody waits for A. When it finally leaves, E takes its seat. That's the bus.

<!-- section: The Idea: The trade, throughput vs latency -->

A: [more serious] So batching isn't free for the user. Everyone in a batch shares the step, so a bigger batch is a slower step for everyone. Seventeen tokens a second at one user, eleven at sixty-four. Newcomers' prefills stall the step or slow it more. And a dynamic batcher's wait window is pure added latency.

B: [a bit unsure] But throughput just keeps going up, right? Thirteen ninety at two fifty-six. Why wouldn't I just run the biggest batch that fits?

A: Because users don't experience throughput. They experience how long until text starts, and how fast it comes. So a serving system doesn't maximize throughput. It maximizes throughput subject to a promise. And that promise is called an S L O, a service level objective. A target you commit to. Like, "the slowest one percent of requests start within one second", or "at least ten tokens a second per stream". A typical language model S L O has two parts. Time to first token, usually as a p ninety-nine, so the slowest one percent. And inter-token latency, how steady the text is, usually the median or the p ninety. And reading speed is a nice anchor. People read roughly four to six words a second. So a stream much below eight to ten tokens a second starts to feel like waiting.

A: And the number that captures "throughput, but only the useful kind" is goodput. Throughput, counting only requests that met their S L O. So a server doing seven hundred tokens a second where half the requests blew their time-to-first-token target has a goodput of roughly three fifty. That word got popular from a paper called DistServe, in twenty twenty-four. As you push the batch size up, throughput rises until requests start missing their deadlines. Past that knee, goodput falls, even while raw throughput keeps climbing.

B: Okay, so give me the actual number. How many people can the Spark serve with the eight B model if I promise ten tokens a second each?

A: [working it out] Let's do it. Ten tokens a second per stream means a step can take at most a hundred milliseconds. In a hundred milliseconds, at two seventy-three gigabytes a second, the memory can move twenty-seven point three gigabytes. Sixteen point oh six of that is the weights. That leaves about eleven point two gigabytes for caches. At a thousand tokens of context each, that's point one three four gigabytes a user, so about eighty-three users. At five hundred twelve tokens of context, about a hundred sixty-seven. And those are spec-sheet ceilings. Your server will hit fewer because of Python overhead and prefill steps. So the honest answer is: you measure it. Run the harness at increasing concurrency and find the highest one where the median per-stream speed stays above ten and the p ninety-nine time to first token stays inside its target. That's your capacity.

A: And there's a figure that sketches what your plot should look like. Throughput going up, p ninety-nine time to first token going right, on a log scale, from a tenth of a second out to a thousand seconds. A vertical dashed line at one second, the S L O. Anything to the left of it is usable. Three lines. The naive server is flat along the bottom and slides right as you add users. Same throughput, much longer waits, out into minutes. Static batching climbs while the batch can absorb users, then hits its batch size and slides right like the naive one, because extra users queue behind whole batches. And continuous climbs steeply and stays to the left, until the batch gets so big that steps slow down, or memory runs out.

<!-- section: The Idea: Memory is the real batch-size limit -->

A: So far the batch limit's been bandwidth. Bigger batches mean slower steps. But on a lot of machines, a harder wall comes first. Every running sequence keeps its whole K V cache in GPU memory, for as long as it runs. And that memory has to physically exist.

A: [working it out] So where does a hundred twenty-eight kilobytes per token come from? Multiply it out. Two, because there's a key and a value. Times thirty-two layers. Times eight K V heads. Times a hundred twenty-eight numbers per head. Times two bytes per number in B F sixteen. Two times thirty-two is sixty-four, times eight is five hundred twelve, times a hundred twenty-eight is sixty-five thousand five hundred thirty-six numbers, times two bytes, a hundred twenty-eight kilobytes. For one token. So a user at four thousand tokens of context is holding about half a gigabyte. Five hundred twelve megabytes.

B: [skeptical] Half a gig per person. So on most hardware memory is basically always the limit, then.

A: [thinking out loud] On most hardware, often, yeah. On the Spark, no. Picture the Spark's hundred twenty-eight gigabytes as one long bar. And remember it's shared, the CPU, the operating system and the GPU all live in it. Call it about twenty gigabytes for the OS and runtime. Sixteen for the weights. And the rest, round it to about ninety gigabytes, is your pool for caches. That's about six hundred ninety thousand tokens. It's a planning number, you'd measure your own. Now count seats. At five hundred twelve tokens of context, sixty-four megabytes per user, about thirteen hundred users fit. At four thousand tokens, about a hundred seventy. At thirty-two thousand tokens, four gigabytes each, about twenty-one. At a hundred twenty-eight thousand, sixteen gigabytes each, about five. And under that, picture your padded cache: three rows stretched to the longest one, with dashed space reserved and never used. In that little example, four hundred ninety real tokens out of nine hundred reserved.

A: And your benchmark's prompts are around three hundred tokens of context. So a thousand users fit. Bandwidth and your server's overhead will stop you long before memory does. Which is unusual. That's the Spark's hundred twenty-eight gigabytes talking. Move the same model to a twenty-four gigabyte gaming card and the picture flips. Sixteen gigabytes of weights leaves maybe six for caches. That's about forty-six thousand tokens. So around eleven users at four thousand tokens of context. And on a data-center GPU serving a seventy B model, memory is almost always the wall. Which is why the next big idea in serving, V L L M's paged attention, is about memory, not speed.

B: So it flips depending on the box.

A: It flips. And three things make it worse than the clean numbers. First, padding again. The simple cache you're about to build is one rectangle, every row as long as the longest row. So a batch with one four-thousand-token conversation and sixty-three short chats reserves four thousand tokens for everyone. Second, you don't know the future. A request that says max tokens four thousand ninety-six might use all of it. Reserve for the worst case and you fit fewer users. Reserve less and you might run out halfway through an answer. And third, running out mid-answer. When memory fills up, real engines preempt someone. They pause a running sequence to free its memory, either by copying its cache out to CPU memory, which is called swapping, or by just throwing it away and recomputing it later from the prompt and the tokens it had so far. Your server's going to do something much simpler. It'll just refuse to admit more than a fixed number of sequences.

A: And the fix for the first two is the next lesson, paged attention and prefix caching. Store the caches in small fixed-size blocks, like pages in virtual memory, so a sequence only holds what it's actually used.

<!-- section: Build It -->

A: So, the build. You upgrade your server twice. First to dynamic batching: a queue and a collector sitting in front of one padded batch generate call. Then to continuous batching: your own decode loop, with sequences joining and leaving at every step. Same API, same harness, two new rows on the scoreboard.

A: And you can develop all of it on your Mac. Every piece of this runs on a laptop CPU with a tiny model called Smol L M two, a hundred thirty-five million parameters, from Hugging Face. It's shaped like Llama, it even uses grouped-query attention like Llama three. So you write and test with that in F P thirty-two, and then switch to Llama three point one eight B in B F sixteen on the Spark for the real runs. The lesson's code was checked exactly that way, on transformers five point twenty and PyTorch two point fourteen.

A: First step's just housekeeping. Pull the shared stuff out of your naive server into one common module: loading the model, the request format, the helpers that write server-sent events. Plus a set of end-of-sequence tokens, because Llama three point one Instruct has several of them, not one. And one little helper that's worth understanding. Turning tokens into text. If you decode one token at a time, you break characters that span several bytes, an emoji or an accented letter, and you get garbage. So instead you decode the whole list of tokens so far every time and only send the new part on the end. And if the text ends in half a character, you wait for the next token. Decoding the whole list every time is quadratic, technically. But at two hundred fifty-six tokens it costs microseconds. Real servers just keep a small window.

A: Then the dynamic batching server. The endpoint becomes async. It wraps each request in a little job object, which carries the request and its own async queue for output tokens. It drops the job on one shared pending queue, and then just streams whatever shows up on its own queue. And then there's one background task, the collector. It takes jobs off the pending queue and forms batches: up to the max batch size, or whatever's arrived when the oldest one has waited the max window. It runs each batch with one generate call on left-padded inputs, in a worker thread. And then it waits for that whole batch to finish before forming the next one.

B: Wait, it waits on purpose?

A: [amused] On purpose. That waiting is static batching's head-of-line blocking. You're building the thing so you can measure the thing. The collector's loop is pretty simple when you say it out loud. Sleep until there's at least one job. Then keep grabbing jobs until the batch is full or the window since that first job closes. There's an async I O call that waits for the next item with a timeout, and it raises a timeout error when the window runs out. And if you set the window to infinity, you get pure static batching, wait for a full batch forever. Which you'll do on purpose later.

A: The interesting part is the streamer. Generate lets you hand it a streamer object. It calls the streamer's put method once with the prompt tokens, which you skip. And then once per step with one new token for every row. When it's done, it calls end. So in put, for each job that isn't finished yet, you count the token, you decide if it finishes the job, either it hit that job's own max tokens, or it's an end token and the job didn't ask to ignore those, and you hand over the token plus a done flag. And the catch: you're on generate's thread there. Not the event loop's. So you're not allowed to just push into the job's async queue. You have to go through the loop's call soon thread-safe, which says, "event loop, please do this push for me, on your own thread." And in end, you mark any job that's still open as done, so no client waits forever.

B: Why can't I just push into the queue directly? It's a queue.

A: Because async I O's queue isn't thread-safe. It assumes only the event loop touches it. Poke it from another thread and you can corrupt it, or the loop just never wakes up to notice the item's there. Call soon thread-safe is the one door in.

A: A few things that'll trip you up. Padding has to be on the left, and Llama three's tokenizer doesn't have a pad token, so you set it to the end-of-sequence token. Build each prompt with the chat template as text, then tokenize the list with padding on, and with no extra special tokens, because the template already added the begin-of-text marker. There's only one max new tokens for the whole batch, so it's the largest one. Each job stops emitting at its own limit, but generate keeps computing its row until the longest is done. That's tax two, and you'll see it in your numbers. If every job in the batch is ignoring end tokens, tell generate to produce at least that many tokens, like the naive server did. Get each job's prompt length by adding up its row of the attention mask, and count completion tokens in the endpoint as they arrive. The endpoint itself waits on its queue, feeds the token IDs through that text helper, and sends events exactly like the naive server, ending with the usage counts and the done marker. Start the collector in a lifespan handler so it runs on the same event loop as the endpoints. And wrap the batch run in a try-except. Because if it raises, the collector task dies, and every future request just hangs. Silently.

A: Now the heart of it. The continuous batching engine. Your own decode loop over a changing set of sequences. The design is: the running batch keeps one padded cache. Picture it, per layer, as a block of keys and a block of values, where each row is one sequence, and they're left-padded so every row's newest token sits in the last column. Next to that, an attention mask, ones for real positions, zeros for padding. Each decode step adds one column on the right. Admitting new sequences means prefilling them, then padding the old cache and the new one on the left to the same length and stacking them. Evicting means keeping only some rows, and then trimming off columns on the left that no remaining row uses anymore.

A: The plumbing for Hugging Face's cache object, called a dynamic cache, changes between versions of transformers, so the lesson hands you those helpers. The dynamic cache is just, per layer, a keys tensor and a values tensor that grow by one position every step. You pass it into the forward pass, and you get it back one position bigger. The helpers just convert the cache to plain per-layer tensors and back, plus a little function to pad zeros on the left. The engine itself is yours. Each sequence is a little record: an ID, its prompt tokens, how many tokens it's allowed, whether it ignores end tokens, its output so far, and a done flag. The engine has a waiting list, a running list, the cache, and the mask. And five methods. Pick the next token per row, greedy, and for rows that ignore end tokens, set those tokens' scores to minus infinity first. Prefill a group of newcomers. Merge them into the running cache. Evict finished rows. And step, which does one iteration. Admit up to the free seats. If anybody got admitted, this step is their prefill. Otherwise, decode one token for everyone. Then mark finished ones and evict them, and return whoever got a token this step, so the server can stream it.

B: [a bit unsure] What's the part people get wrong?

A: Positions. With left padding, a row's padding can't count as positions. Llama needs to know that a token is, say, the fortieth token of its sequence, not the hundred-and-twelfth column of a padded block. So in prefill, each token's position is the running count of real tokens up to it, minus one, floored at zero. And in decode, the new token's position is just how many real tokens that row already has. Counted before you add the new mask column. Get that wrong and you're off by one, and you might not notice.

A: A couple more. In prefill, ask for only the last position's scores. A two-thousand-token prompt times a vocabulary of a hundred twenty-eight thousand two hundred fifty-six entries is about half a gigabyte of scores you don't need. Recent transformers let you say "keep only the last one". A sequence is done when it's produced its max, or its last token is an end token and it's not ignoring those. And its first token comes from prefill, so a sequence that only wanted one token finishes right at admission. Prefill and decode are separate steps here, the simple design, and you'll see what that costs. The only admission limit is seats, not memory. And every merge and evict copies the whole cache. That happens a few times per finished request, not every step, so it's fine for now. Though Hugging Face's cache also grows each layer by gluing a new column on every step, which is a copy too. That's one of the things paged attention exists to stop.

A: And then the most important file in the lesson, the test. Because this engine is the kind of code that runs, produces fluent text, and is subtly wrong.

B: [skeptical] I mean, if it's producing fluent text, it's probably mostly right, no?

A: [firmly] That's exactly the trap. A position off by one, a mask column missing, and the model still writes perfectly nice English. It's just not the English it would've written. Fluent text is not evidence. So the test is: six prompts, of different lengths, wanting different numbers of tokens. An engine with only three seats, so it's forced to queue and reuse seats. And requests arriving at different steps, two at step zero, one at step three, two at step four, and one at step twenty. And then every single sequence has to match plain one-at-a-time greedy generate. Token for token. Exactly.

A: And there's one detail that matters. The reference uses generate's minimum-new-tokens setting, which stops the model from ending early. So your engine has to ignore end tokens too, or the two diverge at the first end-of-turn token. And that's exactly the mismatch this test caught while the lesson was being written.

B: Okay, so if that passes, I'm done.

A: Two things it won't catch. In B F sixteen on the GPU, batched and unbatched runs can legitimately drift apart after a while. Padding and batch size change the shapes of the matrix multiplies. That changes the order the floating-point additions happen in, and floating-point addition isn't perfectly associative, so if two tokens were nearly tied, one can flip. So you test exactness in F P thirty-two on the Mac, and in B F sixteen you check that the first few dozen tokens match and the rest makes sense. And it doesn't test streaming or threading at all. The harness does that.

A: Then you put the engine behind the same API. And the engine runs in its own thread. There's an inbox, a regular thread-safe queue. The engine thread loops: if nothing's running or waiting, block on the inbox, because an idle server should sleep. Otherwise drain everything from the inbox into the waiting list, call step, and for each sequence that got a token, use call soon thread-safe to push the token count and the done flag into that request's async queue. The endpoint side builds the sequence record with the chat template, attaches an async queue and a handle to its event loop, drops it in the inbox, and streams.

B: Why the count and not the token?

A: Because the engine thread keeps appending to the output list while the event loop's reading it. A count is a consistent snapshot. "Decode the first n tokens." Those first n aren't going to change.

B: And why a thread at all? Why not just make it an async task?

A: Because step blocks for a whole forward pass. On the event loop, that would freeze every connection for sixty to a hundred milliseconds per step, forever. That's the waiting-versus-working lesson: the event loop is one thread, and anything that doesn't hit an await holds everyone hostage. A separate thread lets the GPU work while the event loop keeps streaming. And they really do overlap, because PyTorch lets go of the GIL, Python's one-thread-at-a-time lock, while it's inside its GPU kernels.

A: When it works, have an agent review it against a short list. Nothing blocking on the event loop. No async queue touched from the engine thread except through call soon thread-safe. An exception inside step gets logged and fails the affected requests, instead of killing the thread silently. And a client that disconnects has its sequence marked done, so it stops holding a seat. That's the bug you noted at the end of the baseline lesson.

A: Then two small things. Your harness sends the same max tokens for every request, so let each prompt line override it. And make a mixed file: the same fifty short prompts, each with a max tokens drawn from a skewed mix. Sixty percent at thirty-two, thirty percent at two fifty-six, ten percent at ten twenty-four. Fixed random seed, so it's the same file forever. That's the workload where tax two shows up. And a plotting script: one line per server, one point per concurrency level, throughput going up, p ninety-nine time to first token going right on a log scale, a dashed line at one second for the S L O, and a little star on any point with fewer than a hundred samples.

A: And then you run the matrix. Commit first, so every results file points at the code that made it. One server at a time on the Spark. The static server with batches of up to sixteen and a fifty millisecond window. Concurrency one, four, sixteen and sixty-four, two hundred requests, two hundred fifty-six tokens each, ignoring end tokens. Then the continuous server with up to sixty-four seats, same flags. Then both again on the mixed file, at sixteen only. One note: at sixty-four workers, two hundred requests is only about three per worker, so if you can spare the time, do five hundred twelve there. And on the scoreboard, put the sixty-four-worker throughput in the notes, because that's where continuous batching earns its keep. You're done when the test passes, both servers stream properly and survive sixty-four workers with zero errors, the results folder has every run, the scoreboard has two new rows, and the plot has three lines.

<!-- section: Measure -->

A: So you fill in a table. Naive, static and continuous, at each number of workers, plus the two mixed runs. And for each one, the median and p ninety-nine time to first token, the median per-stream speed, the p ninety-nine of the biggest gap, and total throughput. So what should those look like? These are expectations from the model we just built, not results. On a machine like the Spark, overheads you haven't met yet can move them a lot.

A: At one user, all three servers should be within a few tokens a second of each other. A batch of one is a batch of one. The static server's time to first token should be about one window worse than naive, so fifty milliseconds. That's the price of the window, paid even when nobody else is coming. And the continuous server's tokens a second might be a little lower than naive's, because your Python loop does more bookkeeping per step than generate does.

A: [playful] Now, sixteen workers, short prompts, everyone wanting exactly two fifty-six tokens. Which wins on throughput, static with sixteen seats, or continuous? And by how much?

B: Continuous, right? That's the whole point of the episode. I'd guess, I don't know, double?

A: [amused] Close to a tie. Possibly with static slightly ahead.

B: [laughs] Oh, come on. ...Wait. Equal lengths.

A: Equal lengths, all at once. In a closed loop, all sixteen workers send at once, the batch fills in a few milliseconds, all sixteen finish together, and all sixteen send their next request together. That's the case where the policies are identical. And static uses Hugging Face's generate, which has less Python per step than your engine, so it can even win. The difference shows up in the mixed run, and at sixty-four.

A: So at sixteen, both batching servers should take the median time to first token from minutes, on the naive server, to well under a second. And throughput should go up by an order of magnitude. The ceiling at a batch of sixteen is about two hundred forty tokens a second, and getting half of that or more is a reasonable first result. Per-stream speed should be a little below what you got at one user.

A: At sixty-four is where they split. The static server only has sixteen seats. So forty-eight users queue behind whole batches. Its median time to first token jumps to tens of seconds, roughly one to three batch lifetimes, and a batch lives about two hundred fifty-six steps. And its throughput stays stuck at the sixteen-worker number. The continuous server puts all sixty-four in the batch. Time to first token should stay around a second or under. Throughput should climb well past the sixteen-worker number. The ceiling at these context lengths is about seven to nine hundred tokens a second, and a few hundred is a good result for a Python loop. And per-stream speed drops, just like the bar chart said.

B: And the max gap thing?

A: Look at it on the continuous server at sixty-four. Every time a newcomer gets admitted, everybody else skips a step for its prefill. With sixty-four requests of two fifty-six tokens each in rotation, somebody finishes about every four steps. Sixty-four people, each lasting two fifty-six steps, so two fifty-six divided by sixty-four. So some stream is getting stalled for a prefill roughly every fourth step. And that cost is in your throughput too, not just the gaps. That's the motivation for chunked prefill, in your own numbers.

A: On the mixed run at sixteen, continuous should now clearly beat static on both throughput and time to first token. Because static's batches are dominated by their ten-twenty-four-token members, while the thirty-two-token ones sit in held seats. And you can compute static's waste from your own numbers. Tokens it computed, which is each batch's longest times its size. Versus tokens it actually delivered. Then put your plot next to the sketch. Which points sit left of the one-second line? The highest one there is your server's capacity at that S L O. That's the number you'd put in a capacity plan.

<!-- section: Break It -->

A: And then you break it. What if you start the static server with an infinite window, sixteen seats, and run the harness at four workers?

B: That's the deadlock. It never comes back.

A: [dry] Never comes back. And then try sixteen workers. It gets most of the way through and hangs on the last few requests, because the final batch never fills. That happened, exactly like that, while I was testing this code. Every batcher needs a deadline, and a closed-loop benchmark is really good at finding the missing one.

A: What if you pad on the right instead? Set the padding side to right in the static server, and send two requests with very different prompt lengths at the same time.

B: [working it out] Then the short one's new tokens go after all its filler...

A: And its answer turns to nonsense, or runs on oddly. Because its next tokens are being appended after a run of pad tokens instead of right after its prompt. Transformers actually prints a warning about right-padding for decoder-only models. After this, you'll never ignore it. For a decoder model, the newest token has to be in the last column of every row.

A: What if you break the position IDs in the engine? In the decode step, instead of each row's own count of real tokens, use the cache's total column count as everybody's position. Then run the test. When this was tried on the tiny model, two of the six sequences still matched, and four drifted. The rows with little or no padding were basically fine. The padded rows were off.

B: And the drifted ones read fine?

A: Drifted text can read totally fine. Which is why you need the test. The reason it breaks: Llama uses rotary position embedding, rope. It encodes each token's position by rotating its query and key vectors by an angle that depends on the position number. Wrong position number, wrong rotation, so the token looks like it's somewhere else in the sentence. So padding has to be invisible to every part of the model, and positions are part of the model.

A: And last. What if somebody pastes a novel? Run the continuous server with a steady thirty-two workers sending short requests. Then send one request with a four-thousand-token prompt. Look at the max gap for the other streams right at that moment. Every one of them stalls for the full prefill. Probably most of a second. And then think about how you'd split that prefill into five-hundred-twelve-token chunks. Each chunk is a forward pass over five hundred twelve new tokens, attending to the cache built so far. Your prefill can almost do that already, if you let it start from an existing cache. And that's the lesson there: the scheduler's job isn't just who's in the batch. It's how much work goes into each step.

<!-- section: Connections and close -->

A: If you want the original, the Orca paper's second and third sections are the clearest statement of why request-level batching fails for generation. And Cade Daniel's post on the Anyscale blog about continuous batching is the friendly version. And this all leads straight on. Paged attention replaces your padded cache with fixed-size blocks so more sequences fit, and shared prefixes are stored once. Speculative decoding is the other way to get more tokens out of each weight read, so it's actually competing with batching for the same idle compute. And then you go read the real schedulers in V L L M and S G Lang, and see every idea from today, done fast.

B: [working it out] Okay, let me try the whole thing. A decode step is just reading the weights, and that read is shared, so sixty-four users cost barely more per step than one. Static batching wastes that with padding, people holding seats after they're done, and late arrivals locked out. And continuous batching fixes it by... processing requests as soon as they arrive, so the GPU's always full and you get the max throughput.

A: [gently] Most of that, yes. Two corrections. It's not "as soon as they arrive", it's at every step. The batch gets re-decided before every single forward pass, so finished ones leave that step and new ones join the next, and nobody's ever waiting on someone else's long answer. And you don't actually want max throughput. Every user you add makes every step a little slower for everyone, so you add users until the slowest ones start missing their promise, and you stop there. On the Spark it's bandwidth that sets that point. On a smaller card it's the memory for everyone's caches. Either way, the cheap part is that one read of the weights, and the whole job is filling it with as many people as you can without breaking the promise.
