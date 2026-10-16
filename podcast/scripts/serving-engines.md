<!-- section: The Problem -->

A: [relaxed, thinking out loud] So think about where your server is right now. You've spent weeks on it. You wrote a K V cache. Then continuous batching. Then a prefix cache with L R U eviction. Then you quantized the weights, and bolted on a little draft model for speculative decoding. And every one of those changes got its own row on the scoreboard. And you're kind of proud of the sixteen-users row now. You should be.

A: And then one evening you pull a container, type one command, V L L M serve, Llama three point one eight B Instruct, and point the exact same benchmark harness at it. It loads in a couple of minutes. With one user, it's a bit faster than your best server. With sixty-four users at once, it's a lot faster. And its p ninety-nine time to first token, the wait the slowest one percent of people see before their first word, is a fraction of yours.

B: [a bit unsure] Okay, so my gut says... they just have better GPU code. Like, someone at NVIDIA-level wrote really tight kernels, and that's the gap.

A: [warm] That's what almost everyone assumes. But look at where the gap actually is. With one user, it's only a bit faster. If the magic were in the math kernels, that's where you'd see it most, because one user is the purest test of how fast the model itself runs. The gap opens up at sixty-four users. And that's not about how fast you multiply. That's about how you organize a lot of people sharing one GPU. Nothing you did was wrong. V L L M just does all of it at once, plus a few things you didn't think of, and none of it in Python on the hot path.

B: Hot path meaning the part that runs on every single token.

A: Right, the code that runs every step, for every request. And honestly, this is the best possible moment to read their code. Most people meet V L L M as a black box with two hundred flags. You get to meet it as, "oh, that's my batching loop, but they put it in its own process." "That's my prefix cache, but in blocks." "That's my launch overhead... gone." You know what every piece is for, because you measured the problem each one solves.

A: So there are really two skills in this. The first is knowing what production engines do that yours doesn't. The second one lasts longer. It's how to read a real systems codebase, a few hundred thousand lines, without drowning. And the trick is: find the loop, find the data structure, follow one request.

<!-- section: Origin -->

A: [settling in] The history here is short, but it's all about the same fight. In twenty twenty-two, serving a language model mostly meant what your naive server did. A batch goes in, and the whole batch comes out when its longest member finishes. So if one person asked for a thousand tokens and everyone else asked for ten, everyone waits for the thousand.

B: [amused] Yeah, I remember that feeling.

A: You built the fix. That same year, a paper called Orca, at a systems conference called O S D I, said: don't schedule per batch, schedule per iteration. One token step at a time. After every step, finished requests leave and new ones can join, mid-flight. That's continuous batching, the thing you wrote in the batching lesson.

A: Then in June twenty twenty-three, a group at U C Berkeley released V L L M. Its big idea was called PagedAttention, and it borrowed straight from operating systems. Virtual memory. Instead of reserving one big slab of memory per request for its K V cache, sized for the longest answer it might ever give, you store the cache in small fixed-size pages, and hand them out as the request actually grows. Memory waste went from most of it to almost none, so way more requests fit in a batch. The paper, by Kwon and others, reported two to four times the throughput of the best systems of the time.

A: And six months later, in December, the L M Sys team released S G Lang. Its trick was RadixAttention. When a request finishes, don't throw its K V cache away. Keep it in a tree, so later requests that share a beginning, a system prompt, a few worked examples, a chat history, can reuse it automatically.

B: So by then the memory problem's mostly solved. What was left?

A: [thinking out loud] This is the funny part. By twenty twenty-four, GPUs had gotten so fast that the bottleneck moved to the CPU. Python deciding what to run. Python preparing the inputs. Python launching kernels. The GPU was sitting around waiting for Python to tell it what to do next. So in January twenty twenty-five, the V L L M team announced V one, a re-architecture built around exactly that problem. Separate processes so CPU work overlaps GPU work. A simpler scheduler. A batch that persists between steps. CUDA graphs everywhere, which we'll get to. Everything in this episode is that V one shape. And it'll keep changing, but the shape changes a lot slower than the file names.

<!-- section: The Idea: Three processes and a loop -->

A: So start with your server. It's one process. One FastAPI app, one model, a lock, and a thread pushing text into a queue. Everything happens in one place. And remember the GIL from the threads lesson, the global interpreter lock. Inside one Python process, only one thread can run Python code at any instant. So tokenizing, building the little streaming chunks you send back, the Python of the generate loop itself, all of that is taking turns on one interpreter.

A: [slowing down, drawing it out] V L L M V one splits that into separate processes that talk over sockets. Picture three columns side by side. On the left, the API server. In the middle, the engine core. On the right, the GPU worker. Between the left and the middle there's a two-way arrow labelled Zero M Q. Between the middle and the right, another two-way arrow.

A: So, the left column, the API server. Four boxes in there. First the HTTP server, which is, honestly, just a FastAPI app. It validates the JSON body, turns it into sampling settings, and streams chunks back. And it never touches the GPU. Your version of that is the endpoint in your naive server. Then the input processor, which applies the chat template and tokenizes. Your version is the apply chat template call in your endpoint. Then the engine client, which packs each request into a message, pushes it over the socket to the engine core, and runs a background task that pulls finished tokens back and routes each one to whichever HTTP request is waiting for it. Your version of that is the streamer queue between your generate thread and your response thread. And the output processor, which turns token ids back into text. Incrementally, because a single token can be half a character. It also checks stop strings and builds the stream chunks, including the usage numbers at the end. Yours is the text streamer plus your little chunk helper.

B: So the whole left column is just... text. It never sees a tensor.

A: Just text and HTTP. All of it CPU work, and sometimes a lot of it. Tokenizing a hundred-thousand-token document takes real milliseconds.

A: Then the middle column, the engine core. That's the heart of it. It's a busy loop in its own process. A busy loop is a loop that runs continuously, checking for work and doing it, instead of sleeping until something wakes it up. It keeps one CPU core permanently busy, which is fine when the work never stops. And each trip around that loop is called an engine step. Ask the scheduler what to run, hand that to the GPU, wait, update every request with its new token, send the outputs back. One step, one forward pass over the weights, and each running request usually gets one new token out of it. Your version is the step loop you wrote for continuous batching. And the engine core owns the two most important data structures in the whole system: the request queues, and the pool of K V memory blocks. So inside that column you've got the loop, the scheduler, which is your continuous-batching scheduler, the K V cache manager, which is your K V cache and then your prefix cache with L R U, and one box that has no version of yours at all. Structured output. That one's new, we'll get to it.

A: And the right column, the GPU worker. It owns the model weights and the GPU. The model runner turns "these requests, this many tokens each, their K V lives in these blocks" into actual tensors and runs the forward pass. Yours is the body of your generate loop. Next to it, CUDA graphs and torch compile, which kill the kernel launch overhead you saw in the Python speed lesson. Then the attention backend, the kernels that do attention over scattered memory blocks. Yours is the attention you wrote for G P T two, and the real thing is the next lesson. And the sampler, which turns logits into tokens for the whole batch, and with speculative decoding, runs the check that accepts or rejects draft tokens. That's your speculative sampling.

B: [skeptical] And with one GPU, is the worker really a separate process? Feels like overkill.

A: Check that one yourself. V L L M's docs describe one worker per GPU, and with a single GPU the executor can run the worker inside the engine-core process. With tensor parallelism, which is later, there's one worker process per GPU. The split that really matters is the first one. The API server versus the engine core.

A: They talk over Zero M Q, which is a small library for sending messages between processes, or between machines, over sockets, with queueing built in. Requests and outputs get packed into compact messages and sent across.

B: Okay, here's what bugs me. Why pay for packing and unpacking messages at all? Just use threads. Threads share memory. It's free. You'd hand the request over as a Python object.

A: [firmly] That's the obvious design, and it's exactly the one that loses. Because of the GIL. If tokenizing and detokenizing ran on threads inside the engine process, they'd be taking turns holding the GIL with the scheduler. Every millisecond a tokenizer thread holds it is a millisecond the scheduler can't run. And if the scheduler can't run, nobody's telling the GPU what to do next, so the GPU sits idle. Sharing memory is free. Sharing the interpreter is not.

B: Oh. So the GIL turns "free sharing" into "everyone in one line."

A: Yeah. And in separate processes, each one has its own interpreter and its own GIL, running on its own core, truly in parallel. So the API server can be turning step N's tokens into text while the engine core is already scheduling step N plus one. The price is serializing messages over a socket, which is microseconds per message, and it overlaps with the GPU working anyway. It's the same reason your PyTorch data loader uses worker processes instead of threads.

<!-- section: The Idea: Predict, why processes -->

A: So try this. On your naive server, with one user, what fraction of each decode step do you think the GPU was actually busy? And when V L L M moves tokenizing and detokenizing into another process, which number on your scoreboard should get better the most? Time to first token, tokens per second for one user, or total throughput at sixty-four users?

B: [working it out] Busy... I'd guess most of the time? It's a big model. And for the second one, tokens per second at one user. Because you've taken work off the critical path, so each token comes out faster.

A: The first one's mostly right, with a catch. The GPU is idle for slivers of every step. While Python runs the decode loop, prepares the next input, and launches hundreds of kernels, the GPU's just waiting. You actually measured that indirectly in the baseline lesson, as the ratio of measured to predicted tokens per second. Something like ten to forty percent idle is common for naive Hugging Face generate, depending on the model and hardware. You'll measure yours exactly in the profiling task.

A: [patiently] But the second one's wrong, and it's worth seeing why. With one user, detokenizing one token per step is microseconds. Moving it to another process saves you... microseconds. Nothing. With sixty-four users, it's sixty-four incremental detokenizations, sixty-four stream chunks, and sixty-four socket writes, every single step. If all of that ran in the engine loop, it'd add straight onto every step's time. So throughput at sixty-four is what gains most. The speedup at one user comes from somewhere else entirely, from CUDA graphs and a lean step. Coming up.

<!-- section: The Idea: What one step does -->

A: Now, what does one step actually decide? Your continuous-batching loop from the batching lesson probably looked like this. If anything's waiting and there's room, run a prefill for it. Then run one decode step for everyone. Two kinds of steps, and which one you're in depends on the phase.

A: V one's scheduler doesn't have phases. It has a token budget. That's the maximum number of tokens the engine will process in one forward pass. In V L L M the setting's called max num batched tokens. And every step, the scheduler hands out tokens until the budget runs out. In a particular order. Running requests first. Each one that's decoding gets one token, or a few with speculative decoding, since that checks several draft tokens at once. That's cheap, and if you starved them, their streams would stall mid-sentence. Then the waiting requests, oldest first, as long as there's budget left. A new request needs its whole prompt processed. And if the prompt's longer than what's left of the budget, it gets only part of it now and the rest in later steps. That's chunked prefill. You process a long prompt in pieces, across several steps, mixed in with everyone else's decode tokens, so one huge prompt can't freeze everybody's streams. And then, for every request it admits, the scheduler asks the K V cache manager for room. If there isn't any, someone has to give up their memory. That's preemption, and we'll come back to it.

A: What comes out of the scheduler is a small record. For each scheduled request, how many tokens, and which new blocks it got. And the worker runs one forward pass over all of those tokens together. A mix. Somebody's prefill chunk of a few hundred tokens, and fifteen other people's single decode tokens, all in one pass. The attention kernels are built to handle that mix in a single call.

B: [skeptical] Wait, isn't mixing them a bad idea though? Decode is the expensive part, right? That's where the GPU's doing all the math. Shoving a prefill on top of it seems like it'd just slow everyone down.

A: [carefully] So this is the thing from the bandwidth lesson, and it's worth getting exactly right, because it's the whole reason the mix works. Decode isn't heavy on math. It's heavy on reading. Every decode step, the GPU has to read all sixteen gigabytes of weights out of memory to produce one token per request. And the math it does with them is tiny. So during decode, the compute units are mostly sitting idle, waiting for bytes to arrive. That's what "memory-bound" means. The speed limit is how fast memory can deliver the weights, not how fast you can multiply.

B: Okay. And prefill is the opposite.

A: Prefill's the opposite. A few hundred prompt tokens all go through the same weights at once, so you get lots of math out of every byte you read. So when you mix them, the prefill chunk uses the compute that decode was wasting, inside the same weight read. You read the weights once and get both jobs done. Your two-phase loop read the weights once for the prefill step and again for the decode step. It paid for the read twice.

B: [working it out] Huh. So it's not "add a prefill on top." It's "fill the idle part of a step you're paying for anyway."

A: That's it. Up to a point, and we'll hit the point later.

<!-- section: The Idea: One request's journey -->

A: [slower, setting the scene] Now follow one request all the way through, because this is the picture to carry around. Three horizontal lanes: API server on top, engine core in the middle, GPU worker at the bottom. A dot moves between them. And next to it there's a little counter of the request's K V blocks. Light ones are reused from the prefix cache, solid ones are allocated just for this request.

A: Say it's a chat request. After the chat template, the prompt is forty-one tokens, and the first thirty-two are a system prompt that earlier requests already used. It wants two hundred fifty-six output tokens. And there are fifteen other requests already running on the GPU.

A: Step one, it arrives over HTTP. FastAPI checks the body and turns it into sampling settings. Temperature zero, max tokens two fifty-six, ignore end-of-sequence, the way your harness always asks. Then template and tokenize, still in the API process, so tokenizing never pauses the GPU loop. Forty-one tokens. Then it crosses the process wall. It's serialized, sent over the Zero M Q socket, and joins the waiting queue in the engine core. And at this point nothing has touched the GPU yet.

A: Next step of the engine loop, the scheduler runs. The fifteen running requests get their one decode token each, first. There's budget left, so our request gets admitted. Prefix lookup: its first thirty-two tokens are exactly two full blocks of sixteen, and those two blocks are already in the cache. So only nine tokens actually need computing. The scheduler calls allocate slots, and gets one new block for those nine. If the pool had been empty, that call would've failed, and the scheduler would've preempted the newest running request to make room.

A: Down to the GPU worker. It gets the scheduler's record, which is mostly a diff from last step, and updates its persistent batch: token ids, positions, the block table, and something called the slot mapping, which says exactly where each new token's keys and values should be written. Then one forward pass. Nine prefill tokens for our request, plus one decode token for each of the fifteen others, all in one pass over the weights. And attention reads the thirty-two cached tokens through the block table, from wherever those blocks happen to live in memory. Then sample. The logits at our request's last position become a token. Say it's the word "Once". And the whole batch is sampled together.

A: Back up to the engine core. A function called update from output appends the token to the request, checks whether it should stop, and packages outputs for every request that produced a token this step. Then up to the API process. Detokenize, build the stream chunk, write it to the socket. And that's the moment your harness stamps as time to first token.

B: And then it just repeats, one token per lap?

A: One token per lap. And now the batch shape matches one the engine captured at startup, so the whole forward pass replays from one launch instead of hundreds. That's the CUDA graph thing. Then something small but nice happens around token seven.

B: [working it out] Let me guess. It runs out of block. Forty-one prompt tokens, plus seven fed back in, is... forty-eight. Which is three blocks of sixteen, exactly.

A: Exactly three, full. So when the eighth token gets fed back in, it needs slot forty-nine, and allocate slots hands out a fourth block. Memory grows sixteen tokens at a time, and it's never reserved up front. Then at token two fifty-six, it stops, finish reason "length". The final chunk carries the usage numbers, then the done marker. By then the request's holding nineteen blocks, two shared from the cache and seventeen of its own. They all go back to the free queue. But the full ones keep their hashes, so the next request with the same beginning can reuse them, until something needs the memory.

A: [counting them off] So three things to take from that trip. First, the request crosses the process wall twice per token, out and back, and that's fine, because each crossing is microseconds and it overlaps GPU work. Second, the K V memory grows one block at a time, never reserved up front, and that's why so many requests fit. And third—

B: [jumping in] Wait, actually, before the third. The GPU's keeping track of all sixteen conversations, right? Like, it knows which one's which?

A: [amused] That's the third thing. The GPU never sees a "request" at all. It sees a batch of token positions, and a table saying where each one's keys and values live. That's it. The idea of a request, a conversation, a user waiting, all of that lives up in the engine core, in Python. The GPU just gets "here are twenty-four token positions, here's where their memory is, go."

A: So, if someone asks you to walk through one engine step, it goes like this. The loop calls the scheduler. The scheduler has a token budget. It gives every running request its next token, then admits waiting requests oldest first, chunking a long prompt if the budget runs out. For each one, it asks the K V cache manager for blocks, reusing cached prefix blocks by hash. If memory runs out, it preempts the newest running request by freeing its blocks, to recompute later. Out comes a small record. The worker applies that diff to its persistent batch, builds positions and block tables, runs one forward pass over the mixed batch, replaying a CUDA graph if the shape matches, and samples. Then the scheduler updates each request with its new token, checks stop conditions, and sends outputs back to the API server, which detokenizes and streams.

<!-- section: The Idea: Memory and blocks -->

A: Okay, memory. You built the core of this in the prefix caching lesson, so just the production details. At startup, V L L M loads the weights. Then it runs one fake forward pass at the biggest batch it'll ever allow, just to measure how much scratch memory that takes at peak. And then it takes whatever's left, up to a fraction of total memory you set with a flag called G P U memory utilization, and carves it into a pool of K V blocks. A block's a fixed-size page of K V cache. It holds the keys and values for a fixed number of tokens, sixteen by default on CUDA, for every layer of the model.

B: How big is one block, actually? Like in bytes.

A: [working it out] Let's just build it. For one token, in one layer, each K V head stores a key vector and a value vector. Llama three point one eight B has thirty-two layers, eight K V heads per layer, and each head's vectors are a hundred twenty-eight numbers long. So thirty-two layers times eight heads is two hundred fifty-six. Times a hundred twenty-eight numbers is about thirty-two thousand. Times two, because there's a key and a value, gets you about sixty-five thousand numbers. And in B F sixteen each number is two bytes, so about a hundred thirty thousand bytes. A hundred twenty-eight kilobytes. Per token.

B: Per token. So a block of sixteen is...

A: Two megabytes. Now picture the Spark. Say you give V L L M eighty of its hundred twenty-eight gigabytes. Take off sixteen gigabytes for the weights, and a few for that scratch memory. You're left with something like sixty gigabytes, which at two megabytes a block is roughly thirty thousand blocks. Around half a million tokens of K V cache. That's back-of-envelope, from spec-sheet memory. V L L M prints the real number of blocks when it starts up. Read it, it's one of the most useful lines in the log.

A: Then each request has a block table, just a list of its blocks in order. And prefix caching works by hashing. Each full block gets a hash of its sixteen tokens, plus the hash of the block before it. So a block's hash doesn't just name sixteen tokens, it names the entire prefix up to that point. A new request computes its block hashes, looks them up, and reuses every hit. And when a request finishes, its blocks go back to a free queue in L R U order, least recently used first in line to be overwritten, but they keep their hashes, so they stay reusable until something actually needs the memory. In the code, that's a pair of functions. Get computed blocks finds the hits, and allocate slots hands out new ones.

<!-- section: The Idea: Preemption -->

A: So what happens when allocate slots says no? The scheduler picks a victim. Under the default first-come-first-served policy, at the time of writing, it's the request at the back of the running list, which is the most recently admitted one. Under the priority policy, it's the lowest-priority one. And then there are two ways to take its memory.

A: Picture the pool as a row of boxes, all full. Some belong to request one, some to two, some to three, and the last few on the right belong to request four, the newest. Request one needs one more block. There aren't any. So request four gets picked, and the picture forks into two boxes underneath.

A: The left one is recompute. Free request four's blocks, keeping their hashes, and put request four back at the front of the waiting queue. Later, when it runs again, it prefills its prompt plus every token it's generated so far, from scratch. The cost is compute. The right one is swap. Copy request four's blocks out to CPU memory, and later copy them back, and carry on decoding. The cost is bytes moved. On a data-center GPU that's two trips across PCIe, the bus between the CPU and the GPU, which is far slower than the GPU's own memory.

A: V L L M's old engine supported both. V one, at the time of writing, recomputes. In the code, preempting a request frees its blocks and sets its count of computed tokens back to zero. And the reasoning's pretty good. It's simpler. Prefill is the fast part of inference anyway. And with prefix caching on, the victim's freed blocks often survive in the cache until it comes back, so the "recompute" is partly just a cache hit.

<!-- section: The Idea: Predict, swap on the Spark -->

A: So, on the Spark. Would swap be a good idea?

B: [a bit unsure] I mean... I'd think yes? The Spark has a ton of memory. Tons of room to park things on the CPU side.

A: Think about where "CPU memory" physically is on that machine.

B: Oh. [laughs] It's the same memory. It's all one pool.

A: [warm] It's all one pool. A hundred twenty-eight gigabytes of LPDDR five X, shared by the CPU and the GPU, spec sheet. So swapping "to the CPU" would copy bytes from one part of the same memory to another part of the same memory. It'd burn the same roughly two hundred seventy-three gigabytes a second of bandwidth that decode needs, and it frees nothing you couldn't have just given to the K V pool in the first place. Swap exists to move bytes from scarce, fast GPU memory to plentiful CPU memory. On the Spark there's no such thing as plentiful CPU memory that isn't also GPU memory.

B: So on the Spark the move is just... make the pool bigger.

A: Make the pool bigger with G P U memory utilization, but leave headroom for the operating system and everything else, because they share that same pool too. And let recompute handle the rare overflow.

A: [thinking out loud] And notice that preemption is really a policy question in disguise. First-come-first-served is fair and simple. The newest arrival pays. A priority policy lets you say, paying customers or interactive traffic never get preempted by some batch job. S G Lang's default is cache-aware, which we'll get to. None of them is free. Every preemption is wasted work and a stall in someone's stream. Which is why, when a deployment's p ninety-nine goes bad, one of the first things to look at is the number of preemptions counter on the engine's metrics page.

<!-- section: The Idea: Taking the CPU out of the loop -->

A: Now the CPU. Here's what your server still did on every decode token, even after batching. Python decided what to run. Python built input tensors from Python lists. Copied them to the GPU. Then launched every kernel of every layer, one by one. Llama eight B has thirty-two layers, and each one launches a handful of kernels: the norms, the projections, attention, the activation, the adds. So a single forward pass is hundreds of launches. And each launch costs a few microseconds of CPU time. Four hundred launches at five microseconds each is about two milliseconds per step. That's rough, and you'll check it in your profile.

B: [skeptical] Two milliseconds is nothing though.

A: Depends what it's next to. On the Spark, a decode step reads sixteen gigabytes at about two hundred seventy-three gigabytes a second. That's about fifty-nine milliseconds. On an H one hundred, with about three point three five terabytes a second of memory bandwidth, spec sheet, the same read takes about five milliseconds. So the same two milliseconds of launch overhead is three percent of a Spark step... and forty percent of an H one hundred step.

B: Oh. So on the H one hundred it's almost half the step.

A: Almost half. And production engines were built for the H one hundred case. That's why they fight so hard for every millisecond on the CPU side. And it's why you should expect their advantage on your Spark, with one user, to be smaller than the hype. Your box is slow enough at reading memory that the CPU overhead just hides inside it.

A: So, four tricks to get the CPU out of the way. First, CUDA graphs. That's a CUDA feature where you record a whole sequence of kernel launches once, then replay all of them with a single launch. The catch is the shapes and memory addresses have to stay the same between replays. So V L L M captures one graph per batch size it expects, from a list chosen at startup, and pads each real batch up to the nearest captured size. Most of the time you see in the startup log labelled "capturing CUDA graphs" is this. Before capturing, it also runs torch compile to fuse small operations together, which you saw in the Python speed lesson. And attention, whose shapes vary the most, can be left out of the graph and run in between pieces of it. V L L M calls that piecewise capture.

A: Second, a persistent batch. Instead of rebuilding the input tensors from scratch every step, the model runner keeps them on the GPU, and the scheduler only sends what changed. Who joined, who left, who got new blocks. Most steps, almost nothing changes.

A: Third, overlapping steps. With async scheduling, the engine core plans step N plus one while the GPU is still running step N, so the GPU never waits for Python. S G Lang has the same idea, they call it the overlap scheduler. Whether it's on by default changes between versions, so check the docs for yours.

A: And fourth, paged attention kernels. The attention backend is its own pluggable piece. FlashAttention, FlashInfer, Triton kernels, and a few others, chosen per GPU and per model. Each one reads keys and values from scattered blocks through the block table, and handles a batch where one request contributes two thousand prompt tokens and fifteen others contribute one each. Writing one of those is the next lesson.

<!-- section: The Idea: Predict, enforce eager -->

A: There's a flag, enforce eager, that turns CUDA graphs off. Guess how much it slows Llama eight B decode on the Spark. With one user, and with sixty-four. Then the same on an H one hundred. Percentages are fine.

B: [working it out] Everyone talks about CUDA graphs like they're huge, so my instinct is like, thirty percent on the Spark. But... you just told me it's two milliseconds out of sixty. So, a few percent?

A: [pleased] Right, you talked yourself out of the hype. With one user on the Spark, a few percent, maybe up to ten. It's a couple of milliseconds out of a roughly sixty-millisecond step. At sixty-four users, the step's still dominated by reading the weights, plus a growing amount of K V. But the CPU now has more work per step, and attention kernels for sixty-four sequences. So the hit's probably similar, or a bit larger. On an H one hundred, where a step is about five milliseconds, the same overhead is a big fraction, and losing tens of percent at small batch is plausible. Those are reasoned estimates. You measure the Spark ones yourself, later, which is the point.

<!-- section: The Idea: SGLang -->

A: So that's V L L M. Now open S G Lang and you find the same skeleton. A tokenizer manager in the HTTP process. A scheduler process running a loop. A detokenizer manager in its own process. A model runner with CUDA graph capture. Paged K V memory. An OpenAI-compatible API. The difference is what it treats as the first-class problem.

A: The big one is RadixAttention. V L L M's prefix cache is a hash table of full blocks. S G Lang's is a radix tree of everything it's ever computed. A radix tree is a tree where each branch is labelled with a run of tokens, and following a path from the root spells out a prefix. Prompts that share a beginning share a path. Each node holds the tokens on its branch and where their K V lives in memory. So a new request walks down the tree as far as it matches, reuses all the K V along the way, and only prefills the rest.

A: Picture the two side by side. On the left, V L L M. Three blocks in a row: tokens zero to fifteen, sixteen to thirty-one, thirty-two to forty-seven. Under each, its hash, and each hash folds in the one before it. A lookup table goes from hash to block. The first two hit, the third misses. And only full blocks ever get cached. On the right, S G Lang. A root, then a node that's the system prompt everyone shares. Under that, two branches: user A's first turn and user B's first turn. And under user A's, a new leaf for their second turn. Both approaches find the longest cached prefix. The difference is the tree makes the sharing structure visible.

B: Visible to who?

A: To the scheduler. That's the second bet. Cache-aware scheduling. Since the tree shows which waiting requests share prefixes, S G Lang's default policy, at the time of writing, is longest prefix match. It prefers the waiting requests that'll hit the most cache. There's also a depth-first ordering that runs requests sharing a subtree together. And plain first-come-first-served is still an option. And when memory runs low, it evicts least recently used leaves first, so the shared trunk, the system prompt everyone uses, survives the longest.

B: [skeptical] But that's not fair, right? If I show up with a weird prompt nobody else has, I just keep getting skipped.

A: Yeah, that's exactly the trade. Throughput against fairness. Picking cache hits first gets more work done per second, and a request with an unusual prefix can wait longer. There's no free answer, only which one you care about more.

A: [dry] Third bet: structured outputs. You know this from your agents. Ask a model for JSON and it'll usually comply. "Usually" is a problem when there's a parser on the other end that crashes. Constrained decoding fixes it. It means generating text that's guaranteed to match a format, a JSON schema, a regular expression, a grammar, by forbidding, at every step, any token that would break the format. Mechanically, a grammar compiler turns your schema into a state machine. At each step, the engine builds a mask of which tokens are legal from the current state, and the sampler sets every other token's probability to zero. So invalid JSON isn't unlikely. It's impossible.

A: [amused] And the S G Lang paper added a cute one on top, jump-forward decoding. When the grammar allows only one possible continuation, like right after the opening brace, when the only legal thing is the quote, the word name, another quote, and a colon, you skip the model entirely and just append those tokens. Why ask the model a question that has exactly one answer?

A: Both engines support structured outputs now, through pluggable grammar backends, called X Grammar, L L Guidance, and Outlines. And here's the systems detail. The mask is computed on the CPU while the GPU is running the forward pass. In V L L M's step, there's a call named get grammar bitmask sitting between "execute" and "sample". That's it, hiding the mask inside GPU time.

<!-- section: The Idea: TensorRT-LLM and llama.cpp -->

A: Two more engines you'll hear about. TensorRT L L M is NVIDIA's. Historically it compiled a model ahead of time into an optimized engine for one specific GPU and one set of shapes, then served it with what NVIDIA calls in-flight batching, which is their name for continuous batching, plus a paged K V cache. Its edge is kernels. NVIDIA writes the F P eight and F P four paths for its own hardware first. Newer releases have moved toward a PyTorch-based workflow that's closer to how you'd use V L L M, so check the current docs before assuming either. And NVIDIA has a Spark playbook for it too.

A: Llama dot C P P is a different animal. C and C plus plus, no Python on the hot path at all, designed for one or a few users on whatever hardware you have. CPU, Apple's Metal, CUDA, more. It loads models from GGUF files. That's its single-file format: the weights, usually quantized, plus the tokenizer and metadata, all in one file, laid out so it can be memory-mapped and used without parsing. So the model "loads" by the operating system mapping pages of the file into memory, the thing from the files and disks lesson. Its quantization formats squeeze models down to four bits and below, for machines without much bandwidth.

B: So where does that leave me on the Spark? Which one would I actually use?

A: Llama dot C P P is the natural choice on unified-memory machines like your Mac, and a good one on the Spark at batch one, one user. It ships llama server with an OpenAI-compatible API, so your harness works against it unchanged. But high-concurrency throughput just isn't its goal. If you want sixty-four users, that's V L L M and S G Lang territory.

<!-- section: The Idea: Tensor parallelism -->

A: Now, past one GPU. A seventy-billion-parameter model in B F sixteen is seventy billion times two bytes, a hundred forty gigabytes. That doesn't fit on one eighty-gigabyte GPU. And even if it did, decode would read a hundred forty gigabytes per token. The standard fix inside one machine is tensor parallelism. You split each layer's weight matrices across several GPUs, so every GPU holds a slice of every layer, computes its part of each token, and they combine partial results over fast links.

A: Picture one MLP block, split across two GPUs. The input vector gets copied to both. The first weight matrix is split by columns, left half on GPU zero, right half on GPU one. Each GPU multiplies the input by its half and gets half of the hidden layer. No talking needed, each half is complete on its own. Then the second matrix is split by rows, top half and bottom half, matching. Each GPU multiplies its half of the hidden layer by its half of the matrix, and gets a partial answer, the right shape, but only part of the sum. And at the very end, one step adds the two partials together. Attention splits the same way, by heads. So two of those adding steps per layer.

B: Why does it work out that there's no talking in the middle?

A: [thinking out loud] Because of the order of the splits. Splitting the first matrix by columns means each GPU ends up holding complete, separate pieces of the hidden layer, so the activation function can run on each piece independently. And splitting the second by rows is exactly what lets each GPU use only its own piece. The only point where they need each other is the final sum. That column-then-row trick is from the Megatron paper, and it's the whole reason this is cheap.

A: So why does it help decode? Each GPU reads only its share of the weights for every token. With two GPUs, each one reads half the bytes from its own memory, at the same time. The cost is that adding step, called an all-reduce. Every GPU contributes a tensor, and every GPU ends up with the sum. How long it takes is set by how fast and how quickly the GPUs can talk. Two per layer, thirty-two layers, so sixty-four all-reduces for every token. At batch one each one is tiny, one hidden vector, four thousand ninety-six numbers at two bytes each, about eight kilobytes. So what matters is latency, how long each round trip takes, not bandwidth.

B: [working it out] Okay so, I have one Spark. If I bought a second one and linked them, I'd basically double my tokens per second. Each one reads half the weights.

A: [gently] That's where it falls apart. Inside a server, GPUs talk over NVLink, at hundreds of gigabytes a second, with latency in microseconds. There, tensor parallelism is close to free. But two Sparks talk over their ConnectX seven network ports. Every all-reduce pays a network round trip, and sixty-four of those per token add up fast. So NVIDIA's multi-Spark playbooks are mainly about fitting models that don't fit on one Spark. Not about making small ones faster.

B: So it's a way to fit a bigger model, not a way to go faster.

A: Across two Sparks, yeah. Across GPUs inside one server, it's both. And in V L L M it's one flag, tensor parallel size, which starts one worker process per GPU. There are other ways to split, pipeline parallelism, which puts different layers on different GPUs, and expert parallelism for mixture-of-experts models. Those come up in the training on many GPUs lesson.

<!-- section: The Idea: Splitting prefill from decode -->

A: [picking the thread back up] Now, the point I promised about the mixed batch. Mixing prefill into decode steps is great for throughput. But every prefill chunk makes that step longer for every decoding request in it. So if you're mid-stream, reading an answer, you see a stutter whenever somebody else's long prompt shows up. Chunking caps the stutter. It doesn't remove it. And the two phases really want different hardware. Prefill wants compute. Decode wants bandwidth, and lots of memory for K V.

A: Picture two timelines. The top one is one GPU pool doing both. Little decode steps, tick tick tick, then a wide prefill block, then a few more ticks, then another wide block. And every stream stalls during those wide blocks. The bottom one is two pools. The prefill pool runs prefills back to back, one wide block after another. The decode pool runs nothing but steady little ticks, all the way across. And an arrow goes from each finished prefill down to the decode pool, labelled "K V cache shipped across the network."

A: That's disaggregated serving. Prefill and decode run on separate groups of GPUs, or separate machines, and each request's K V cache gets transferred from the prefill group to the decode group once its prompt is done. Two twenty twenty-four papers made the case. DistServe showed that if you separate the phases and size each pool for its own latency target, you serve more requests that meet both a time-to-first-token target and a between-tokens target. And Splitwise, from production traces at Microsoft, argued the two phases could even run on different GPU generations. Then Mooncake, from Moonshot AI, built a whole serving system around a distributed K V cache.

B: And the cost is moving the cache. How much is that, for one request?

A: You already know the per-token number. A hundred twenty-eight kilobytes for Llama eight B. So a two-thousand-token prompt is two thousand times a hundred twenty-eight kilobytes, about two hundred fifty megabytes, that has to move before the first decode step can even start. So it needs fast networking, careful overlap, and it adds a hop to time to first token. There are libraries just for moving it, NVIDIA's is called NIXL. And both V L L M, through what it calls K V connectors, and S G Lang support disaggregated setups at the time of writing. That part moves fast, so read their docs.

A: You won't run this on one Spark. But you should be able to explain it, because it's the current answer to a real interview question: time to first token and the gap between tokens fight each other. What do you do at scale?

<!-- section: Explain It Back: Scaling -->

B: Okay, let me ask the scaling question, because honestly that's the one that'd stump me. Going from one GPU, to eight, to a whole cluster. What breaks at each step?

A: On one GPU, throughput grows with batch size, until either the K V cache fills memory, or prefill compute saturates. Past that, requests queue, or get preempted. Then eight GPUs in one server. You've got two choices. You can run eight independent copies of the model behind a load balancer. That's data parallelism. Throughput scales nearly linearly, nothing's shared, but each copy has to fit on one GPU. Or you split one model across all eight with tensor parallelism. Each GPU reads an eighth of the weights per token, with two all-reduces per layer over NVLink. So per-token latency drops, and bigger models fit.

A: Then a cluster. Tensor parallelism stops paying off across machines, because every all-reduce becomes a network round trip, the two-Spark problem. So across a cluster you go back to data parallelism over replicas. You add pipeline or expert parallelism for models too big for one node. And you route each request to a replica that already holds its prefix in cache. And at the very largest scale, prefill and decode get their own pools, and the bottleneck becomes moving K V caches between them.

B: So every level, the thing that breaks is whatever has to talk across the slowest link.

A: That's a good way to hold it.

<!-- section: Build It: Running the engines -->

A: So, building it. Your project folder grows a little. An engines folder with a launch script for each engine, a notes file called TRACE for your code reading, and a profiles folder for flame graphs and traces.

A: [practical] Task one, get V L L M running on the Spark. Don't just pip install it. The Spark's GPU, the G B ten, is a newer Blackwell variant, S M one twenty-one, and you want a build that's been validated for it. A random pip install on ARM may not have the right kernels. So use NVIDIA's Spark playbook, the one called "Serve L L Ms with V L L M", and the V L L M recipes site it links to, for the current container image and launch flags. At the time of writing, the playbook uses an NVIDIA N G C container, and V L L M's own blog post about the Spark used their official CUDA thirteen image. Tags move, so pin whichever one you use in your launch script.

A: The launch is a docker run with the GPUs passed in. A few choices in it matter. It maps to port eight thousand one, so it can sit next to your own server on eight thousand. It adds the ptrace capability, which is what lets py spy attach later. It mounts your Hugging Face cache so you don't download the model again, and your profiles folder. And it serves Llama eight B in B F sixteen, with a max context of eight thousand one hundred ninety-two, and G P U memory utilization at point six. That last one deserves a sentence. On the Spark it's a fraction of the unified pool, which your operating system, the container, and everything else are sharing. So start somewhere between half and seventy percent, and read the startup log for how many K V blocks you got. Prefix caching's on by default in V one, so don't pass anything for it.

A: Then smoke-test it with the exact same curl you used on your own server. And hit the metrics endpoint, filtering for K V cache usage and number of requests. That's the engine's own view of itself, and it's a good habit.

A: Task two, same for S G Lang, with NVIDIA's "Serve L L Ms with S G Lang" playbook. It uses a CUDA thirteen S G Lang container, and it includes two little exercises, a multi-turn prefix cache one and a structured JSON one. Do both. Ten minutes, and they show you the two features S G Lang is proudest of. One catch: the playbook's validated Llama eight B models are F P eight and N V F P four checkpoints. For a fair row against your B F sixteen server, serve the original B F sixteen model first. Then, if you did the quantization lesson, serve the F P eight one as a second row and compare it to your own F P eight number. That one goes on port eight thousand two. And look at its help output for the current names of the flags you'll need later, for turning off the radix cache, choosing the schedule policy, and turning off CUDA graphs. Its arguments were being reorganized at the time of writing, so even the launcher's name might differ.

<!-- section: Build It: Benchmark -->

A: Task three's the benchmark, and it's yours to write. Your harness already speaks the OpenAI API, so it's mostly pointing it somewhere new. But two changes and a check first. First, ask for usage. Fireworks sends the token counts in the last chunk by default. V L L M and S G Lang follow OpenAI here, and only send it if the request asks, with a stream option called include usage. Add it to every target.

B: And if I forget?

A: Then every V L L M record's missing its output token count, because your harness computes decode speed from that number. So your tokens-per-second column comes out empty. Or worse, it quietly falls back to counting stream chunks, which aren't the same as tokens, and you get a number that looks fine and is wrong. Second change, ignore end-of-sequence. Both engines support it as an extra field in the request, so keep sending it. And the check: for five responses from each engine, re-tokenize the text with the Hugging Face tokenizer and compare to what usage says. At temperature zero with ignore end-of-sequence, they should match exactly.

A: Then the same sweep as always, one engine at a time. The Spark has one GPU, and two engines fighting over it measures nothing. Stop each container before you start the next. One, four, sixteen, and sixty-four concurrent users, four hundred requests, two hundred fifty-six output tokens each. Then once more each with the long prompts at one user, which tests prefill. And once with the shared-system-prompt set you built for the prefix caching lesson, at sixteen users. Write the engine version and image tag into the row, because next month's version will give different numbers. And your scoreboard prints throughput at sixteen, but this time also write the sixty-four number in the notes. That's where the engines pull away.

<!-- section: Build It: Trace one request -->

A: Task four is the reading skill. An agent can explain a piece of code when you're stuck, but the map in your notes file has to be yours, in your words. Clone V L L M shallowly, and write the commit hash at the top of the notes.

B: [thinking out loud] My instinct with a giant repo is to start at the README and then, like, the main entry point, and work down.

A: [firmly] That's the way to drown. The rule is: don't start at the top. Start from the loop, then follow one request outward in both directions. Use grep and your editor's go-to-definition. Don't read any file top to bottom. The map I'll give you was checked against V L L M's main branch in October twenty twenty-six, and names move. If something's gone, search for the idea, like grep for "def schedule", and write down where it lives now. Honestly, noticing what moved is half the lesson.

A: So, nine stops. One, the loop. Engine core's step function and the busy loop around it. Find the four calls in one step, in order, and where it blocks waiting for the GPU. Two, the decision, the scheduler's schedule function. What's the token budget variable called, what sets it, and which list does it walk first, running or waiting? Three, chunked prefill, in that same function. Find the line that shortens a long prompt to fit the budget. Four, memory. The K V cache manager's get computed blocks, allocate slots, and free, plus the block pool file. What does allocate slots return when there's no room? How are the hashes chained? Where's the free queue? Five, preemption, the loop around allocate slots and the preempt function. Who's the victim under first-come-first-served, and what happens to its computed-token count?

A: Six, the forward call, in the GPU model runner. Execute model, then the model forward, then sample tokens. What tensors does it build from the scheduler's record, and where does it pick between a CUDA graph and eager mode? Seven, attention. The backends folder, and the selector that picks one. Which backend did your Spark's log say it chose at startup, and why? Eight, back out. Update from output in the scheduler, and the output processor. Where's a stop condition checked? Where do token ids become text? And nine, the front door. The OpenAI entrypoints, the async engine's generate function, and the core client. How does a streaming HTTP response get its tokens from a different process?

A: For each stop, three things. The function, one sentence of what it does, and which piece of your server it replaces. Then the one question that ties it all together: for a single decode step at sixteen users, list every process boundary a token crosses, and every Python function that runs on its behalf.

A: Two shortcuts. The repo has a docs design folder with short notes on the architecture, prefix caching, CUDA graphs, and multiprocessing. Read the architecture overview before stop one. And there's one file that defines the scheduler output record, the thing that crosses from the engine core to the worker. Reading that one data class tells you more about the contract between the scheduler and the model runner than any amount of prose. And if you want, do the same tour of S G Lang: its scheduler, with the event loops and the function that picks the next batch, the schedule policy file, the radix cache file, and its model runner.

<!-- section: Build It: Profile -->

A: Task five, profile a running engine. Two profilers, two questions. Py spy answers "what's the CPU doing?" The torch profiler answers "what's the GPU doing, and when is it idle?"

A: Py spy is a sampling profiler for Python. It peeks at a running program's call stack many times a second and counts where it was. It doesn't change the program, so you can attach it to a live server. Install it on the host or in the container. If there's no ARM wheel for your Python version, build it with cargo. That ptrace capability from task one is what lets it attach inside the container, or you use sudo from the host. V L L M names its processes, so you'll see one called something like V L L M engine core in the process list. First take a single dump of it, a snapshot of every thread's stack. Then, while the benchmark runs at sixteen users, record for thirty seconds, following subprocesses, into an SVG.

A: That SVG is a flame graph. Each bar is a function. Width is how often it was on the stack, so wide means that's where time went, and callers sit below the functions they call. Find the engine-core process and look for three things. How much of its width is the scheduler, how much is preparing inputs, and how much is waiting for the GPU. In a healthy engine, waiting is most of it.

B: [skeptical] Waiting is the healthy part?

A: For the engine core, yes. If the CPU side is mostly waiting on the GPU, the GPU's the bottleneck, which is what you want. The GPU is the expensive thing. Then do the same at one user, and against your own batched server. The comparison is the lesson.

A: The torch profiler is built into V L L M. In recent versions, version zero point one three and later, you turn it on with a profiler config at launch, then drive it over HTTP. Post to start profile, send just a few requests, because traces get huge, then post to stop profile, and give it a while to flush. Older versions used an environment variable, so check the profiling page in their docs for your version. Open the trace in Perfetto, the trace viewer in the browser. Zoom into one decode step on the GPU track and write down four things: the step's duration, the share in matrix multiply kernels, the share in attention, and the size of the gaps between kernels. Then repeat it with enforce eager. The gaps are exactly what CUDA graphs remove.

A: And you're done when both engines serve Llama eight B on the Spark and pass the token-count check with their image tags pinned, your scoreboard has both engines at all four concurrency levels next to your naive server, your best server, and Fireworks, your notes have all nine stops plus the answer to the sixteen-user question, and you can point at the part of the flame graph and the trace that explains your biggest scoreboard gap.

<!-- section: Measure -->

A: So what should the numbers look like? These are reasoned ceilings and expectations, not measurements, and the Spark numbers come from spec-sheet bandwidth. You'll fill in time to first token, tokens per second, and throughput, for the naive server, your best server, both engines, and Fireworks. And from the profiles, for one decode step at sixteen users: step time, the matrix multiply share, the attention share, how much of the time the GPU is idle, and the top CPU function.

A: Start with one user. The ceiling's still about seventeen tokens a second.

B: That's the sixteen gigabytes thing again?

A: Same thing. Every token means reading sixteen gigabytes of weights, at about two hundred seventy-three gigabytes a second. That's about seventeen reads a second, so about seventeen tokens. No engine gets past that in B F sixteen. Both engines should get a big fraction of it, plausibly eighty-five to ninety-five percent, and clearly beat naive generate. And if your own batched server is within ten or twenty percent of them at one user, that's an honest result. At batch one, on a bandwidth-bound box, there just isn't much left to win. Quantized rows break the ceiling, of course, because they read fewer bytes.

A: Sixty-four users is where the engines earn their reputation. A step at batch sixty-four still reads the weights once. Plus the K V of sixty-four sequences. Say each one's around three hundred tokens deep. So sixty-four times three hundred is about nineteen thousand tokens, times a hundred twenty-eight kilobytes each...

B: [working it out] That's like, two and a half gigabytes?

A: About two and a half. So a step reads sixteen plus two and a half, eighteen and a half gigabytes, and at two hundred seventy-three a second that's about sixty-eight milliseconds. For sixty-four tokens. Which is a ceiling of around nine hundred tokens a second, total. Expect a good fraction of that from the engines. And your own server probably lands further from its ceiling here than it did at one user, because the CPU work per step grows with the batch, and in yours it's all on the hot path.

A: Time to first token at sixty-four, the p ninety-nine. Chunked prefill and the token budget keep it bounded. If your server runs a full prefill phase whenever someone arrives, its p ninety-nine time to first token and its stutter between tokens should both look visibly worse.

A: With the shared system prompt, both engines should show a big drop in time to first token on cache hits, just like your prefix cache. S G Lang's cache-aware policy might do better on throughput at sixteen users with lots of shared prefixes, at some cost to fairness. So look at the whole distribution, not just the median.

A: The profiles. On the Spark at sixteen users, expect the GPU trace to be dominated by matrix multiply kernels reading weights, with attention a small slice at short context that grows as contexts get long. The engine-core flame graph should be mostly waiting. Your own server's flame graph should show Python doing real work between GPU calls. And enforce eager should open up small gaps between kernels, which on the Spark are a small share of a long step. That's the H one hundred versus Spark arithmetic from earlier, measured.

B: And Fireworks? I'm guessing still way ahead. So their software's just better than both of these?

A: [gently] Still far ahead on tokens per second for a single stream, yeah. But that's not software. That's H B M, the very fast memory stacked right next to their GPUs, and probably lower precision on their side. So here's a nice check. Write down how many times faster Fireworks is at one user, and compare it to how many times more memory bandwidth their hardware has. If those two ratios are close, you've found the floor. What's left of the gap is hardware.

<!-- section: Break It -->

A: Then break things, on purpose. First, turn off CUDA graphs with enforce eager, and rerun one user and sixty-four. Check your prediction. You'll notice startup gets faster too, since nothing's being captured. If the slowdown's small, you've confirmed it: on a slow-memory box, CPU overhead is a small slice. On a data-center GPU the same flag hurts far more.

A: Second, turn off the prefix cache. For V L L M it's no enable prefix caching, and S G Lang has a flag to disable the radix cache. Rerun the shared-system-prompt set. Time to first token on repeated prompts jumps right back to a full prefill. Then turn caching back on and look at two counters on the metrics page, prefix cache hits and prefix cache queries, and work out the hit rate yourself.

A: Third, starve the K V pool. Restart V L L M with a small memory utilization, or force the block count down to a few hundred, and run sixty-four users with long outputs. Watch the startup log's block count. Then watch the preemptions counter climb, the p ninety-nine of end-to-end latency blow up, and throughput drop. Requests are recomputing prefills they already did.

B: [amused] That's the "it was fine until traffic doubled" incident.

A: [laughs] That's that one, exactly. Fourth, turn it into your naive server. Set max num seqs to one, so V L L M serves one request at a time, and run sixteen users. Time to first token climbs in a staircase. Each person waits for everyone ahead of them, so the sixteenth waits fifteen full service times. Your baseline staircase, just with faster steps. Everything that makes V L L M good at serving lots of users is the scheduler. Take that away and a fast kernel stack still queues.

A: And fifth, hang up mid-stream. Start a request for a thousand twenty-four tokens and kill the client after a second. Watch the number of running requests on the metrics page drop. The API server notices the disconnect, aborts the request, and frees its blocks. Your naive server kept generating for a ghost. Go find the abort path in the code. The engine core has a queue of aborts that it drains every step.

<!-- section: Go Deeper and Connections -->

A: If you read one thing after this, read the V L L M paper, the PagedAttention one, start to finish. You've built every piece, so the design choices will read like answers to problems you've already had. And then the V one blog post and the design notes in the repo, which are the closest thing to a map that stays current.

A: And this closes the loop from the baseline lesson. Back then, every symptom on your scoreboard had a cause and a lesson. Here they all are, fixed at once, by someone else, in code you can now actually read. The process split is just threads and the GIL, and waiting versus working, applied to a GPU. The one box you haven't built is the attention kernel, and that's next. And all that poking at the metrics page is a head start on logs, metrics and traces.

<!-- section: Ending -->

B: [working it out] Okay, let me try to say the whole thing. V L L M isn't faster because of magic kernels. It's my server, every piece of it, but they moved the slow Python parts off the GPU's path. Tokenizing in another process, CUDA graphs for the launches. So the GPU's never waiting on Python, and that's why it wins at sixty-four users.

A: Mostly, yeah, but you've folded two different wins into one. Moving tokenizing into another process matters at sixty-four users, where there's sixty-four people's text to handle every step. CUDA graphs and a lean step are what help at one user, and on the Spark only a little, because a slow-memory step hides the overhead. But the big win at sixty-four is the scheduler and the memory. A token budget that packs everyone's work into one read of the weights, prefill riding along in the compute decode was wasting, and K V handed out sixteen tokens at a time, so many more people fit. Take the scheduler away, one request at a time, and all those fast kernels just build you a faster staircase.
