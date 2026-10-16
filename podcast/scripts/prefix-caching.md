<!-- section: The Problem -->

A: [relaxed, thinking out loud] So think about your agent. It's got a system prompt. Tool descriptions, rules, a few worked examples... it's about two thousand tokens, and it never changes. And every step of the agent sends that same system prompt, plus the conversation so far, plus one new line. Now watch what your server on the Spark does with that. Every single request, it runs prefill over all two thousand tokens of system prompt. Computes exactly the same keys and values it computed a second ago. Uses them for one answer. And throws them away.

B: [surprised] Every time?

A: Every time. And you actually have a number for this, from the baseline lesson, when you benchmarked your server against Fireworks. Prefill of two thousand tokens on the Spark is on the order of a second. So every agent step pays about a second of time to first token, just to rediscover something it already knew a second ago.

B: [wry] That's a pretty expensive way to remember things.

A: [dry] And chat is worse. Turn ten of a conversation resends turns one through nine. So the prompt grows every turn, and the work your server repeats grows right along with it.

A: Then there's a second problem. It's quieter, and it's about memory. When you start batching requests, which is the next step after the naive one-at-a-time server, each request needs room in GPU memory for its K V cache. How much room? Well, you don't know how long the answer's going to be. So the obvious design reserves room for the longest possible answer. And most requests use, like, a fraction of that. So the GPU fills up with memory that's reserved... and empty. And you fit way fewer users than the hardware could actually hold.

B: [a bit unsure] Okay, but that second one sounds like a tuning problem. Just reserve less. Guess the average length, reserve that, done?

A: [patient] Then the one request that runs long has nowhere to go. It's, you know, it's stuck halfway through its answer with no room for the next token. The real problem is the shape of the thing. Each request's K V cache is one private, contiguous lump, and you have to decide its size up front. And it turns out both problems have the same fix. Stop treating it as one lump. Cut it into small, fixed-size blocks. Keep a table of where each block lives. And let requests point at the same block when their tokens are the same.

<!-- section: Origin -->

A: And there's a good story behind that fix. In twenty twenty-three, a group at U C Berkeley, Woosuk Kwon, Zhuohan Li and colleagues in Ion Stoica's lab, went and measured how the existing L L M servers actually used GPU memory. And they found that only twenty to thirty-eight percent of the memory reserved for K V caches actually held tokens.

B: So most of it was just... air.

A: [amused] Most of it was air. Reserved for tokens that might come later, or stranded in little gaps between reservations. Which meant memory, not compute, was what capped how many requests a GPU could serve at once. And their fix came straight out of an operating systems textbook. Since the nineteen sixties, operating systems have given each process the illusion of one big contiguous memory, while actually storing it in small fixed-size pages scattered anywhere in RAM, tracked by a page table. They did the same thing for attention, and called it Paged Attention. The system built around it is V L L M. It came out in June twenty twenty-three, the paper appeared at a big operating systems conference that fall, and it reported two to four times the throughput of the systems it compared against, at the same latency.

B: Just from fixing how memory's handed out.

A: Just from that. And then, once the K V cache was made of named, shareable blocks, reusing blocks across different requests was a short step. V L L M added automatic prefix caching. In January twenty twenty-four the S G Lang team, Lianmin Zheng, Ying Sheng and others at L M Sys, published Radix Attention, which keeps every cached prefix in a tree. And within months the idea reached the A P Is you pay for. DeepSeek, Anthropic in August twenty twenty-four, OpenAI in October twenty twenty-four. They all started charging less for input tokens their servers already had cached.

<!-- section: The Idea: How big is one request's KV cache? -->

A: So to reason about any of this, you need a feel for the size of the thing. Quick recap first. A transformer layer turns each token into three things: a query, a key and a value. To produce the next token, the new token's query gets compared against the keys of every earlier token, and the matching values get mixed together. The K V cache just keeps those keys and values around, for every layer, so each decode step only has to compute one new token's worth instead of redoing everyone's.

B: [casual] Yeah, that part I've got. I built that.

A: Right, you did it for GPT two. So now put bytes on it, for Llama three point one eight B, in B F sixteen, which is two bytes per number. It has thirty-two layers. And it uses something called grouped-query attention, which just means lots of query heads share a smaller set of key and value heads. This model has thirty-two query heads but only eight K V heads, which shrinks the cache four times. Each of those heads is a hundred and twenty-eight numbers wide.

A: [working it out] So, per token. Eight heads times a hundred and twenty-eight numbers is a thousand and twenty-four numbers. Times two bytes, that's two kilobytes. That's for keys, in one layer. Double it because you store values too, four kilobytes. And times thirty-two layers... a hundred and twenty-eight kilobytes. Per token.

B: A hundred and twenty-eight K for one token. That's, I mean, that's a lot. For one word.

A: For one word, yeah. And it adds up fast. A two-thousand-token system prompt is about two hundred and fifty-six megabytes of K V cache. And a full hundred-and-twenty-eight-thousand-token context is sixteen gigabytes, which is the same size as the model weights themselves. So if you remember one number from today, it's a hundred and twenty-eight kilobytes per token, and that one prompt's K V is hundreds of megabytes.

<!-- section: The Idea: Predict, reserving for the worst case -->

A: So try this. You batch sixteen users on the Spark. To be safe, each request reserves K V room for eight thousand one hundred and ninety-two tokens. In practice, the average request ends at about a thousand tokens, prompt plus answer. How much is reserved, how much holds real data?

B: [working it out] Okay, so... eight thousand-ish tokens times a hundred and twenty-eight K is about a gigabyte per user. Sixteen users, sixteen gigabytes reserved. And used is a thousand tokens each, so about an eighth of that. Two gigabytes?

A: [matter-of-fact] Yep. Sixteen reserved, about two used. Which means about eighty-seven percent of the reservation is empty. And now put that on a data-center GPU with eighty gigabytes. Sixteen go to weights, sixty-four left for K V. That reservation rule fits sixty-four users. The real data would fit about five hundred.

B: [surprised] Sixty-four versus five hundred.

A: That's the gap. That's why "how many users fit" comes out so small on the naive design.

<!-- section: The Idea: Reserving the worst case -->

A: And there are really three different ways that memory goes to waste when each sequence gets one contiguous slab. First, the obvious one. Room reserved for tokens that haven't been generated yet, and maybe never will be, because the answer stops early. Second, when the answer does stop early, there's the leftover inside the slab. If you reserved eight thousand one hundred and ninety-two slots and used a thousand, seven thousand one hundred and ninety-two are wasted inside your own allocation. That's called internal fragmentation. Memory you were handed and didn't use.

B: And the third?

A: The gaps between slabs. Requests of different sizes come and go, and free memory ends up chopped into holes. There's enough free space in total, but no single hole big enough for the next request, because it needs one big contiguous piece. That's external fragmentation.

A: If you drew it, picture a long bar of memory, six hundred slots wide. Two sequences have slabs in it. Inside each slab, a small shaded part at the front is real tokens, and the rest is marked "reserved, never used". Between them, they've only used two hundred of the six hundred slots. And at the far end there's a free hole of a hundred and sixty. Now a third sequence shows up needing two hundred and twenty. And it's refused. Even though four hundred slots are sitting there empty. Then underneath, draw the same memory cut into little sixteen-token blocks, with each sequence's blocks scattered wherever. The only waste is the unfilled end of each sequence's last block. And the third sequence fits easily, with blocks still left over.

<!-- section: The Idea: PagedAttention -->

A: Now, you've seen this exact problem before, in the virtual memory lesson. Physical RAM is cut into four-kilobyte frames. Every process gets a page table, which is just a map from its pages to whichever physical frames they landed in. The CPU walks that map on every memory access, with a little cache in front of it so it's fast. So no process ever needs a contiguous chunk of physical RAM. A frame's only handed out when a page is first touched. And pages can be shared between processes, and only copied when somebody writes to them. That's the fork and copy-on-write trick.

B: [working it out] So Paged Attention is... that. But for the K V cache.

A: [pleased] That's literally it. You cut the K V memory into fixed-size blocks, each holding the keys and values for sixteen tokens. That's V L L M's default. For Llama eight B, one block is sixteen times a hundred and twenty-eight K, so two megabytes. At startup the server grabs one big pool of blocks with whatever memory is left after the weights, and keeps a list of which ones are free.

A: Then each sequence gets a block table. It's a small array. Entry zero says where tokens zero to fifteen live, say physical block seven. Entry one, tokens sixteen to thirty-one, maybe physical block one. They can be anywhere. And when a sequence fills its last block, the server grabs any free block from the list and appends one entry to the table. No reservation in advance. No need for your neighbours to be free.

B: But the attention math expects all the keys in one tensor, right? Like, one contiguous array you multiply against.

A: Right, and that's the part that actually needed new code. The usual attention kernel assumes a sequence's keys sit in one contiguous tensor. The Paged Attention kernel takes the block table as an extra input, and for each block of keys, it looks up where that block lives before reading it. That costs a little indirection per block. Same deal the CPU makes with page tables. And in return, memory waste drops to less than one block per sequence. The paper reports under four percent.

B: From most of it wasted to under four percent.

A: Yeah. And the translation from virtual memory is really direct, so it's worth just saying it once. A process becomes a sequence, meaning one request, or one sample of a request. A four-kilobyte page becomes a sixteen-token block. A physical frame becomes a physical block in the pool. The page table becomes the block table. Lazy allocation on first touch becomes "allocate a block when the last one fills". And shared pages after fork, with copy-on-write, become shared blocks, with copy-on-write. Which is where it gets interesting.

<!-- section: The Idea: Sharing inside one request -->

A: Because once a sequence is just a list of pointers, two sequences can point at the same block. And the first place that pays off is parallel sampling. That's when you ask for several independent answers to one prompt, the n parameter in OpenAI-style A P Is. Say you ask for four samples of a two-thousand-token prompt. The naive server stores four identical copies of that two hundred and fifty-six megabytes of prompt K V. With blocks, all four block tables just point at the same prompt blocks. And each of those blocks carries a reference count of four. A reference count's just a counter on a shared thing: how many users are currently pointing at it. Someone starts using it, plus one. Someone stops, minus one. At zero, nobody needs it.

B: [skeptical] But they don't stay identical, though. The moment each sample generates its first token, they're different. Where does that token go?

A: Yeah, that's exactly the catch. The prompt's last block is usually only partly full. Two thousand tokens is a hundred and twenty-five full blocks exactly, but a two-thousand-and-eight-token prompt leaves eight tokens in the last block and eight empty slots. And each sample's first generated token wants to go into those empty slots. And each sample generates a different token. They can't all write into one shared block.

A: So the server does what the kernel does after fork. Copy-on-write. Before a sample writes into a block whose reference count is above one, the server copies that block to a fresh one, points that sample's table at the copy, and drops the old block's count by one. Only the block that actually differs gets duplicated. Every full prompt block stays shared forever.

A: Picture it with a small example. Two samples of a forty-token prompt. On the left, each sample has three logical blocks. In the middle, their block tables. On the right, the physical pool, eight blocks, a few of them free. Both samples' first block points at physical seven, both second blocks point at physical one, and those two say "reference count two". The third logical block was partly prompt, tokens thirty-two to thirty-nine, partly output. Sample one points at physical three. Sample two points at physical five, and the label on five says it's a copy of three, made the moment sample two first wrote to it.

B: And beam search must love this. The beams are basically all the same history.

A: Beam search is the extreme case, yeah. It keeps the k most likely partial answers at every step, extends each one, keeps the best k again. Beams constantly split off and die, so their histories overlap almost completely. With reference counts, a beam that dies just decrements its blocks' counts. Any block that hits zero goes back on the free list. The paper reports large memory savings for beam search from that sharing alone.

<!-- section: The Idea: Predict, four samples -->

A: So, put numbers on the sampling case. Prompt of two thousand and eight tokens. You ask for four samples of two hundred and fifty-six tokens each. Sixteen-token blocks, Llama eight B. How many blocks if every sample has its own private copy, versus with sharing?

B: [working it out] Private first. Each sample is two thousand and eight plus two fifty-six, so... two thousand two hundred and sixty-four tokens. Divide by sixteen, that's a hundred and forty-one and a half, so a hundred and forty-two blocks. Times four is five hundred and sixty-eight.

A: Five hundred and sixty-eight, about one point one gigabytes. Now shared. The hundred and twenty-five full prompt blocks are stored once. Then that partly-filled last block, with the last eight prompt tokens. On their first writes, three of the samples each copy it. And the fourth one, the last one left, now has it at reference count one, so it just writes into the original. That's four versions of that block. After that, each sample's remaining two hundred and forty-eight tokens fill fifteen and a half more blocks, so sixteen each, sixty-four total. A hundred and twenty-five plus four plus sixty-four is a hundred and ninety-three blocks.

B: Out of five sixty-eight. So about a third.

A: About three hundred and eighty-six megabytes instead of one point one gigs. A third of the memory, for identical results.

<!-- section: The Idea: Sharing across requests -->

A: Okay. Now here's the leap. Inside one request, the samples share a prompt because they are the same prompt. But two different requests, from two different users, can share a prompt too. Same system prompt. Same few-shot examples. Same document. Same conversation history. So can request B just reuse request A's K V blocks?

B: I'd think so, as long as the text is the same.

A: [careful] Only for a prefix. Meaning the first n tokens. And it's worth slowing down on why, because this is the rule everything else hangs on. Take token number i. Its key and value at layer two depend on what layer one produced at token i. And layer one's output at token i came out of attention, which looked at every token before it. So token i's K V already has the whole past baked into it. On top of that, Llama uses rope, rotary position embeddings, where each key gets rotated by an angle that depends on its position. So the same word at position five and at position five hundred has different keys.

B: So the K V for a token depends on everything before it, plus where it sits.

A: And nothing after it. That's the causal mask: a token can only look at itself and tokens before it, never after. It's why generation goes left to right. So token i's K V is a function of tokens zero through i, at positions zero through i, and nothing else. Which gives you a really crisp rule. If two prompts agree on their first n tokens, their K V for those n tokens is identical. Not similar. Identical, up to floating-point rounding. So request B can skip prefill for those n tokens and only run the rest.

<!-- section: The Idea: Predict, the date line -->

A: So here's one that catches people. A rag app, so retrieval: it builds prompts as system prompt, then a retrieved document, then the question. Two requests use the same system prompt and the same document. But between the system prompt and the document there's a date line. "Today is October fourteenth" in one, "Today is October fifteenth" in the other. How much can the second request reuse?

B: [a bit unsure] The system prompt, obviously. And then... the document's identical, so I'd want to say the document too? It's the same text. You'd just skip the date line.

A: [gently] That's the natural guess, and it's wrong. You only get up to the date line. The document's tokens are identical as text, but they come after a token that differs, so their keys and values differ. Every document token attended to a different date. The cache matches the longest identical prefix, and the prefix ends at the first differing token. Full stop.

B: So you'd move the date line.

A: Move it to the end, after the document, and suddenly the whole system prompt and the whole document are reusable. Prompt layout decides your hit rate. There are systems that try to reuse chunks from the middle of a prompt, CacheBlend is one, but they have to recompute part of the attention to correct for the different past, and the results are approximate. Plain prefix caching is exact. That's what makes it safe to turn on.

<!-- section: The Idea: Naming a block, the hash chain -->

A: So now the practical question. To reuse a block, the server has to find it. It needs a name for "the K V of these sixteen tokens, given everything before them". And it has to be able to compute that name from the new request's tokens alone, without running the model, because running the model is the thing you're trying to avoid.

A: [enjoying it] And V L L M's answer is really neat. You hash each full block together with the hash of the block before it. So the first block's key is a hash of a fixed root value and tokens zero to fifteen. The second block's key is a hash of the first key and tokens sixteen to thirty-one. The third is a hash of the second key and tokens thirty-two to forty-seven. And so on down the line.

B: [working it out] So the third key secretly covers all forty-eight tokens, because it's got the second key inside it, which has the first key inside it.

A: Exactly like the K V it names. And the same sixteen tokens after a different past get a different key. It's the same chaining idea as a git commit hash, which includes the parent commit's hash, and so covers the whole history.

A: Picture two rows, one per request. Each row is four boxes. Request one: system prompt block, system block, system block, then "user: what's the weather". Request two: the same three system blocks, then "user: write some code". Under each box is its key. Request one's are all misses, because it came first. Request two computes keys one, two and three, finds them all in the cache, hits, hits, hits, and then its fourth key is different, because the tokens are different, so it misses there and stops. And off the end of each row there's a little tail box marked "not cached". That's the partial last block.

B: Why not cache the tail?

A: Because it isn't finished. Its key would change as soon as one more token arrived. You only name full blocks.

A: So the cache itself is just a hash table, a dictionary, from key to physical block. Python's dict is one. And a lookup for a new request goes like this. Tokenize the prompt. Cut it into full sixteen-token blocks, ignore the partial tail. Compute the keys left to right. Then walk them. If the first key's in the table, that's a hit, try the second, keep going until the first miss. And everything after the first miss counts as a miss, even if it happens to be in the table, because a block's only usable if every block before it is too. In practice, with chained keys, a later block can't even be there without its parents, unless they were evicted. Then you point the request's block table at the hit blocks, and run prefill only on the tokens after them.

B: What if the whole prompt is cached? Like, someone sends the exact same request twice. Do you skip prefill entirely?

A: [shaking head] You can't, actually. The model has to run on at least one prompt token, because it's the output at the last prompt position that produces the first new token. So if everything's cached, the server still recomputes the last token. V L L M does exactly this.

A: And there are a few details that matter in production. Each of these is honestly a good interview answer. First, what else goes into the key. Anything that changes the K V besides the tokens. Which Lora adapter is active. The hashes of any images in the prompt. And for a server with lots of customers, a per-customer salt, which I'll come back to. V L L M's design docs call these "extra keys", mixed into each block's hash.

A: Second, collisions. If two different prefixes ever hash to the same key, the second request silently gets the first request's K V. And it produces garbage that looks plausible. With a two-hundred-fifty-six-bit cryptographic hash like Shah two fifty-six, that effectively never happens by accident. With a fast sixty-four-bit hash, an attacker who can choose prompts might find one on purpose. V L L M added a Shah two fifty-six option for that reason. Check their docs for what the current default is.

B: [skeptical] And if users share a cache, can't I learn something about someone else's prompt? A hit is faster.

A: Yeah, that's the third one. Timing leaks. You send a guess at another user's prompt and time the response. Fast means it was cached, which means someone sent it. The fix is salting the hash per customer. Each user only ever hits their own entries, plus things that are explicitly public, like a shared system prompt. V L L M takes a cache salt per request for exactly this. Again, check the current A P I.

<!-- section: The Idea: The tree version, RadixAttention -->

A: Now, a hash table knows "this block exists". What it doesn't know is the shape of what's cached. Which prefixes branch off which. S G Lang's version, Radix Attention, keeps that shape explicitly, as a radix tree. That's a compressed prefix tree. Each edge is labelled with a run of tokens instead of one token, and a node only exists where two cached sequences branch apart.

A: So picture the tree on its side. A root on the left. Two branches off it. One's system prompt A, about two thousand tokens, with a reference count of two because two running requests are under it. The other's system prompt B, about eighteen hundred tokens, reference count zero, nobody using it right now. Off A, two children: one user question that's running right now, and a "turn one plus reply" node, which itself has a "turn two" child, also running. Off B, one child, a user question with reference count zero, last used nine minutes ago. And that one's flagged "evict first". A stays, because its children are in use.

B: So lookup is just walking down from the root as long as the tokens match.

A: As far as they agree, yeah. And inserting is adding an edge or splitting one. And the tree gives you two things a flat table doesn't make easy. First, evict leaves first. A leaf is a suffix that only one conversation used. A node near the root is shared by everything below it. So if you evict the least recently used leaf, you keep the valuable shared stems. S G Lang does exactly that: L R U, least recently used, over leaves whose reference count is zero.

A: And second, schedule by prefix. When lots of requests are waiting, the scheduler can see which ones share long cached prefixes and run them together, before the shared nodes get evicted. S G Lang calls that cache-aware scheduling.

B: So V L L M, with the flat table, just loses the first one?

A: It gets close with a trick that you'll actually build yourself. When a request finishes, V L L M puts its blocks onto the free list tail first. So the end of a chain is always older than its head, and gets evicted first. Same effect as leaf-first, no tree.

<!-- section: The Idea: Eviction -->

A: So, eviction. Who leaves when the pool is full. The pool's finite. A cache that never forgets would eventually hold every prefix it's ever seen and have no room left for running requests. So when a request needs a new block and the free list is empty, something cached has to go. And there are three rules that decide what.

A: Rule one. Never evict a block that's in use. A block a running request points at holds part of that request's attention context. Free it, hand it to someone else, and the running request reads another request's keys on its very next step.

B: [a bit unsure] But couldn't you just, like, evict it and recompute it when the request needs it again? It'd be slower, but—

A: [jumping in] It's not slower, it's wrong. The running request doesn't know the block was taken. It just reads whatever's there now. So a block can only be evicted when its reference count is zero, meaning nobody running is using it. And if every block is pinned, the new request waits. Now, what you're describing does exist. In V L L M a running request can be preempted: its blocks freed on purpose, and recomputed later. But that's a deliberate scheduling decision, where the request is told. It's not eviction.

A: Rule two. Among the unpinned blocks, evict the least recently used. L R U is the default because traffic's bursty. The system prompt that served a request a second ago will probably serve another one in the next second. And it's cheap. Keep an ordered list of the unpinned blocks. Move a block to the back when it's released. Pop from the front when you need to evict.

A: And rule three, which is optional. Drop anything that's been idle longer than a T T L. Time to live: how long an entry may sit in a cache without being used before it's treated as gone.

B: Isn't that kind of the same as L R U though? Old stuff leaves either way.

A: They answer different questions. L R U answers "who leaves when we're full?" T T L answers "how long may an idle thing stay?" A pure L R U cache that's never under pressure keeps a prefix from last Tuesday forever, because nothing ever needed the space. A T T L frees that memory on a schedule. Which matters when the memory could be doing something else, like holding more concurrent requests. Or when the cache is a promise to a customer who's paying for it. And hits refresh the timer, so a prompt that's in steady use never expires. So a server under constant pressure is effectively all L R U, and the T T L only matters when it isn't.

<!-- section: The Idea: Playing with the pool -->

A: There's a little simulator for this that's worth describing, because clicking through it teaches a lot. Sixteen blocks of sixteen tokens. Prompt A and prompt B are system prompts, four blocks each. There's a chat turn button that reuses A and grows one block of history per turn. And there's a one-off prompt, five blocks, that nobody will ever send again.

A: Send A, then A again. The second time, all four blocks light up as hits. Sixty-four tokens of prefill skipped, and the second request costs nothing but its tail. Then send chat turns. Each turn hits the system prompt and every earlier turn, and computes just one new block. And that's why chat and agent loops are where prefix caching really shines. The reusable prefix grows every turn.

B: And the one-offs just sit there taking space.

A: They fill the pool with blocks that'll never be hit again, and they push out useful ones. A real server sees plenty of those. That's called cache pollution, and it's the main reason hit rates fall short of what the workload "should" give you. Now, keep sending one-offs without pressing finish. Eventually every block is pinned, and a new request can't start at all. Which is reference counts doing their job. Nothing in use got evicted. Then notice which blocks go when A's idle and space is needed. A's last block goes before its first. So the next A request still hits the first three. Tails first. And then flip on T T L, which is three simulated minutes in there, and advance the clock. Idle blocks expire even with empty slots all around. And a hit resets the timer.

<!-- section: The Idea: What it buys, TTFT not decode -->

A: So, what does all this actually buy you? On the Spark. A request has a two-thousand-token cached system prompt, plus a fifty-token new question, and it generates two hundred and fifty-six tokens. Cold, time to first token was about a second, and decode ran at about thirteen tokens a second. With the prefix cached, what do you expect?

B: [confident] Time to first token drops a lot, since you skip most of prefill. And decode should get faster too, right? The model's got less to do. Two thousand tokens of work just... disappeared.

A: The first half's right. The second half is the trap. Time to first token drops to roughly the cost of prefilling fifty tokens. And a forward pass over a few dozen tokens is dominated by reading all sixteen gigabytes of weights once. That's about sixty milliseconds at the Spark's spec-sheet bandwidth, plus Python overhead, plus putting the cached K V together. So something like a hundred to two hundred milliseconds, instead of about a second.

A: But decode speed doesn't change at all. Remember why decode is slow in the first place. Each new token needs one forward pass that drags every weight through the memory bus, sixteen gigabytes through a pipe that moves about two hundred seventy-three gigabytes a second. The math units sit idle waiting on memory. That's what bandwidth-bound means. And on top of that, every step attends over all two thousand and fifty-plus cached tokens, so it reads their K V too. The cache didn't make any of those tokens disappear. It only avoided computing them a second time, once, at the start.

B: [working it out] Oh. So the two thousand tokens are still there, still in the context. Every decode step still reads them. I just didn't have to build them.

A: That's it. So end to end, for two hundred fifty-six tokens, you save the time-to-first-token difference, about point eight seconds, out of about twenty. Which is why caching barely shows up on a long-answer benchmark, and completely dominates on short-answer agent steps.

A: So the precise statement is: prefix caching skips prefill compute for the cached tokens. Prefill's the compute-bound phase. Its cost grows with prompt length, and it's most of time to first token on long prompts. Decode's the bandwidth-bound phase, and nothing about it changes. If someone tells you caching made time to first token eight times faster, you should expect tokens per second to be exactly where it was.

A: There are two indirect wins, though, on a busy batched server. Prefill that doesn't run frees compute for other requests, so throughput goes up when prompts are long and shared. And shared blocks are stored once, so more concurrent requests fit in the pool. On a one-at-a-time server like yours today, you'll only see the time-to-first-token win.

<!-- section: The Idea: Many replicas, cache-aware routing -->

A: Now scale it out. Say you run eight copies of your server behind a load balancer. Each replica has its own K V pool, so its own cache. Round robin sends turn two of a conversation to a different replica than turn one, seven times out of eight. So the prefix gets recomputed. And now seven replicas are wasting pool space on copies of it.

B: This is the load balancer state thing. You want the same conversation going back to the same box. A sticky session.

A: That's exactly it, and it's called cache-aware routing: send each request to the replica most likely to already hold its prompt prefix, while still avoiding replicas that are overloaded. The simple version hashes something stable, like the conversation I D, or the first few blocks of the prompt, and uses consistent hashing, so the same prefix keeps landing on the same replica. The better version, which S G Lang's router uses, keeps an approximate radix tree of what each replica's been sent, routes to whichever has the longest match, and falls back to the least-loaded replica when that match is overloaded.

B: Why the fallback? If it's got the prefix, send it there.

A: [firm] Because pure affinity is dangerous. One hugely popular system prompt would send everyone to one GPU. So you need the escape hatch.

B: [working it out] And sticky sessions are usually a bad idea because the state's stuck on that box. But here, if the box dies...

A: The next request goes somewhere else and pays the prefill. Nothing's lost but time. It's a sticky session that's fine, because what's stuck there is a cache.

B: Okay, but push it further. Fifty replicas, a million users.

A: Then routing's the first question. With random or round-robin routing, a conversation's next turn lands on the replica that has its prefix one time in fifty. And your effective cache is every replica's memory duplicating everybody's popular prefixes. So you do cache-aware routing, with the fallback. And then the second question is capacity. Work out the hot set, the stuff that's actually being reused. Say a thousand active conversations, each holding eight thousand tokens. At a hundred and twenty-eight K per token, that's about a terabyte of K V.

B: [surprised] A terabyte. That's way past what any GPU holds.

A: Far more. So you lean on the fact that reuse is lopsided, a few system prompts are very hot. You evict the long tail. And maybe you add a second tier in host memory or on SSD for the warm middle, which is roughly what the API providers' longer time-to-live options imply. The numbers you'd want to know are the K V bytes per token, the size of the hot set, and how fast prefill can recompute a miss.

<!-- section: The Idea: API prompt caching -->

A: Which brings us to the version you've probably already seen on a bill. Every major L L M A P I sells this mechanism back to you as a line item. Under the hood it's the same idea. The provider keeps the K V for your prefix somewhere, in GPU memory, and for some providers in host memory or on disk, and skips prefill when your next request starts with the same tokens. What changes is the contract. Because now someone's paying.

A: Anthropic makes it explicit. You mark the end of the reusable part of your prompt with a cache control breakpoint, up to four per request, or you set it at the top level and let the A P I place it. The default time to live is five minutes, refreshed every time the entry is read, and there's a one-hour option. Writing to the cache costs more than normal input, one and a quarter times for the five-minute one, twice for the hour. Reading it costs about a tenth, and less on some newer models. There's a minimum prompt length, depending on the model, below which nothing's cached. And the usage block in the response tells you how many tokens were written to the cache and how many were read from it. The exact numbers move, so check their prompt caching docs.

A: OpenAI makes it automatic. Prompts above a minimum length, a thousand and twenty-four tokens when it launched, get cached without any flag, matched in increments, and the cached part is billed at a discount. Entries typically last a few minutes of inactivity, longer off-peak, with a longer-retention option on some models. A cached tokens field in the usage tells you how many hit. And there's a prompt cache key parameter that influences routing. Which is cache-aware routing, exposed to the customer.

A: And Fireworks and the other open-model hosts document prompt caching too. Which actually matters for your scoreboard. Some of Fireworks' time to first token on repeated prompts may already have been cache hits. Look for a cached tokens field in their usage.

B: [skeptical] Why do the A P Is use a T T L, though? You just said L R U is the natural one.

A: [thinking out loud] Because an A P I is a promise. "Your cache lives five minutes after the last use" is something a customer can plan around, and something a provider can budget memory for. "Your cache lives until something more popular pushes it out" is neither. And the pricing lines up with that. The write premium pays for holding the memory. The read discount is the prefill compute they didn't have to burn.

A: And the habits that make A P I caching work are exactly the same ones that make your own server's cache work. Stable stuff first: tools, system prompt, examples. Volatile stuff last: the date, the user's question. And never, ever a timestamp or a request I D at the top.

<!-- section: Build It -->

A: So, what you build. You're adding a prefix cache to the server from the baseline lesson. If you already rewrote it for batching, it plugs in the same way, and the reference counts start mattering for real once requests overlap.

A: And there's an honest caveat up front. Real engines share blocks in place. The attention kernel reads the cached blocks directly through the block table, no copying. Hugging Face's generate function wants each request's K V as ordinary contiguous tensors. So your version stores each cached block as its own small tensors, and on a hit, it copies the hit blocks into a fresh cache for the request.

B: So it's not really paged. It's paged storage, but you glue it back into one lump every time.

A: Right. That costs a copy of the cached prefix per request, about two hundred fifty-six megabytes for a two-thousand-token prompt, which is a few milliseconds of memory bandwidth plus Python overhead. And during a request, the prefix lives in memory twice. What you do get exactly right is the hashing, the lookup, the reference counting, the eviction, and the time-to-first-token win. What you don't get is Paged Attention's memory sharing. That's the trade.

A: First task is boilerplate, an agent can write it. Three prompt files. One has a single system prompt of about two thousand tokens, written like a real agent's, tools and rules and examples, paired with fifty different short user questions. The second has eight different system prompts of about two thousand tokens each, and four hundred requests. Each request picks its system prompt with a seeded random choice, weighted so the second most popular gets used half as often as the first, the third a third as often, down to an eighth. That's a Zipf distribution, and real traffic, web pages, words, prompts, often looks like it. A few hot items, a long tail. The third file is the same eight prompts, four hundred requests, in strict rotation. One, two, up to eight, then back to one. And the system prompt has to be the very first thing in each request. No date line above it.

A: The second task is the core, and it's yours. One file, the prefix cache, with no model code in it at all, so you can test it in a second. Each block remembers four things: its key, which is the chained hash; its K V, which the cache treats as an opaque blob; its reference count; and when it was last used. The cache itself holds a dictionary from key to block, plus a separate ordered list of only the unpinned blocks, oldest first. That's the eviction queue. And a lock, and some counters for hits, misses, evictions and expirations.

A: Then six methods. Hash blocks: one key per full block, each one a Shah two fifty-six of the previous key plus the bytes of that block's token I Ds. Lookup: sweep out anything expired first, then find the longest cached prefix, and pin each block you return, so bump its count and pull it off the eviction list. Insert: store a block the current request just computed, already pinned, evicting until there's room, and return false, meaning don't cache it, if everything's pinned. Release: the request's done, so decrement each count, stamp the time, and anything that hits zero goes to the back of the eviction list. Evict one pops the front. And sweep drops idle blocks past the time to live.

B: Why not just use Python's built-in hash for the keys? It's right there.

A: [quick] Two reasons. It's randomized per process for strings, so it isn't stable. And it's only sixty-four bits. You want a fixed encoding of the token I Ds into bytes, the standard array module does it, and you want it the same every single time.

A: A couple of the other hints matter. Because the eviction list only ever holds unpinned blocks, eviction is constant time: pinned blocks just aren't in it. And there's a max-hit argument on lookup, so the server can always keep at least one prompt token uncached, for the reason we said earlier. And the release method comes with a warning: think hard about the order you release blocks in. That order decides whether heads or tails get evicted first. One of the tests checks it.

A: [relaxed, thinking out loud] Also, with T T L on, the eviction list is ordered by release time, and that's when last-used gets stamped, so expired blocks are always at the front. The sweep can stop at the first block that's still alive. And one lock around each public method is plenty. Just don't call lookup from inside insert, or you'll deadlock on your own lock.

A: The spec is a test file with five tests, and it's the definition of done. One checks the hash chain: a partial tail isn't a block, two prompts that share their first block share its key, and the same tokens after a different past get a different key. One checks hits: fill a cache with a three-block prompt, zero hits; send it again, three out of three; send one that shares two blocks and then changes, two out of three. One checks that pinned blocks never get evicted: room for two blocks, both pinned and never released, and a third insert has to return false. One checks that L R U takes tails first: room for three, a three-block chain is cached and released, then a new one-block request comes in, and the first two blocks of the chain must survive while the third goes.

A: And the last one, time to live, runs on a fake clock. Time to live is three hundred seconds. Fill at time zero. At two hundred, it's a hit, and that restarts the timer. At four hundred fifty, it's been idle two hundred fifty, still alive, hit. At eight hundred, idle three hundred fifty, expired, zero hits. The lesson's author wrote a reference version against these tests, about seventy lines, and all five pass, so you know they're consistent with each other. Write yours without looking for one.

A: Third task is wiring it into the server, and you get an agent review on that one. Three small helpers touch Hugging Face's cache internals, and that A P I has moved between versions, so take them as boilerplate. One pulls out the keys and values per layer. One slices out a single block, and it clones the slice, which matters, we'll see why in a minute. And one builds a fresh cache from a list of hit blocks by gluing them together along the sequence axis. These were checked against transformers version five point two, and the older four point x versions laid it out differently, so if they break, check the docs on K V cache strategies.

A: The wiring itself is yours. Under the GPU lock: take the prompt's token I Ds, hash them into keys, look them up with max hit set so at least one token is left to compute, and build a cache from the hits, or an empty one if there weren't any. Hand that to generate as the past. Generate sees the full prompt, notices the past already covers the first chunk, and only prefills the rest. It also fills that cache in place with every new token. After it's done, slice out the blocks you just computed, insert them, and release everything. And the release goes in a finally block, so an exception can't leak pins.

B: Leak pins meaning the blocks stay at reference count one forever.

A: [grim] Forever. Pinned, never evictable, until the pool silts up. Then the usage in the response gains a cached tokens field, which is the number of hit blocks times sixteen. Plus three environment variables, to switch the cache on, set the number of blocks, and set the time to live. A cache stats endpoint. And a log line per request with hit blocks out of total.

A: And you check it on the Mac first, with a tiny model, SmolLM two, the hundred-and-thirty-five-million-parameter one, on the CPU in full thirty-two-bit floats. Same prompt, cache off and cache on, has to give identical greedy output. The author ran exactly this: a seven-hundred-forty-two-token prompt, with seven hundred twenty tokens from cache, produced the same twenty tokens as a cold run. And time to first token went from three hundred thirty-nine milliseconds to fifty-eight.

B: You said identical on the Mac. Is it not identical on the Spark?

A: In B F sixteen you might see outputs drift apart after many tokens. Prefilling fifty tokens on top of a cache runs different kernel shapes than prefilling two thousand and fifty at once, and B F sixteen rounds slightly differently. So compare the first thirty-two tokens. And if they differ early, suspect a bug before you blame rounding. Positions wrong, a missing block, the wrong max hit.

A: One thing this version doesn't cache: the generated tokens. Turn two of a chat resends turn one's answer as part of the prompt, and your cache misses on it, because you only stored prompt blocks. V L L M caches generated blocks too. It's a good extension, with a trap. The chat template might tokenize the answer slightly differently from how it was generated, and then the keys don't match. Measure before you assume it works.

A: Last task, you teach the benchmark harness about hits. Read the cached tokens count from each response, missing means zero, and report median time to first token separately for requests with hits and without, plus the overall hit rate: total cached tokens over total prompt tokens. Then a little sweep script that, for cache sizes of sixty-four, a hundred twenty-eight, two fifty-six, five twelve, a thousand twenty-four and two thousand forty-eight blocks, restarts the server, runs the benchmark one request at a time with sixteen output tokens, and saves the results. Restarting's the point. Each run starts cold.

A: You're done when the five tests pass, the Mac run gives identical output with hits showing up on the second request, the second request on the Spark reports about two thousand cached tokens and the stats endpoint agrees, and the results are saved with a new row on your scoreboard.

<!-- section: Measure -->

A: So then you measure. Run the shared two-thousand-token file one at a time, two hundred fifty-six output tokens each, once with the cache off, once on, and once against Fireworks. And here's what you should see.

A: Cache off, every request pays full prefill. The first and the rest look the same, around the second-or-so you estimated in the baseline lesson. And you can get your effective compute rate again from it: a forward pass costs about two operations per weight per token, so two times eight billion times two thousand and fifty tokens, divided by that time.

A: Cache on, the first request looks the same as cache off, plus a little for slicing and storing a hundred twenty-eight blocks. The rest drop to roughly one pass over the weights plus overhead. Somewhere around a hundred to two hundred milliseconds is the expectation, but measure it. The ratio should be big, similar in spirit to that three thirty-nine to fifty-eight on the Mac. Tokens per second should be the same in both runs, within noise. If cache-on decode is noticeably slower, check you didn't leave the K V in some strange layout or data type. And end to end gets shorter by exactly the time-to-first-token saving, and not one millisecond more.

B: [working it out] And the copy you're doing on every hit, that's in the cache-on number, right?

A: It is, and it's worth timing on its own. Building that cache means a hundred twenty-eight blocks times thirty-two layers, so about eight thousand small tensors glued together, roughly two hundred fifty-six megabytes of copying. If that costs tens of milliseconds, try sixty-four-token blocks. Four times fewer pieces, at the cost of coarser matching. And that trade, block size against how finely you can match and how much bookkeeping you do, is a real tuning knob in V L L M too.

A: Then the sweep, on both multi-prompt files. Each two-thousand-token prompt needs a hundred twenty-eight blocks, and each request's unique question adds about three more. So all eight prompts together need about a thousand twenty-four blocks. At two megabytes a block for the eight B model, that's two gigabytes. So the sweep runs from a hundred twenty-eight megabytes of cache at the small end, up to four gigabytes at the big end.

A: [relaxed, thinking out loud] So here's the fun one. The round-robin file. Eight prompts in strict rotation, each needing a hundred twenty-eight blocks. At five hundred twelve blocks, the cache holds four of the eight prompts. What hit rate do you get?

B: Half? It holds half of them, so... half the requests hit.

A: [emphatic] Zero. Not half. Zero. Think about it with L R U. By the time prompt one comes back around, the other seven have all been used more recently. And five twelve blocks only holds about four prompts' worth. So prompt one is always the one that got evicted. Every request evicts exactly the prompt that's about to come back next.

B: [laughs] That's kind of evil.

A: It's the classic L R U failure. A loop that's bigger than the cache. The hit rate sits at zero, and then jumps to nearly the maximum only when the cache holds the whole cycle. The Zipf file degrades gracefully instead, because its hot prompts get reused before they age out.

A: And there's a pure-Python simulation of this exact workload, using a reference version of the cache, so you know where you should land. The cache logic is the same; the model only adds time. For the Zipf file, the hit rate climbs steadily: about nine percent at sixty-four blocks, roughly doubling with each doubling of the cache, to about thirty-six at two fifty-six, sixty-two at five twelve, ninety-three at a thousand twenty-four, and ninety-seven at two thousand forty-eight. Round robin is flat zero all the way through five twelve, then eighty-one percent at a thousand twenty-four, and ninety-seven at two thousand forty-eight.

B: Why does it top out at ninety-seven and not a hundred?

A: Because the unique question at the end of every prompt can never hit. In the simulation each prompt is two thousand and forty-eight shared tokens plus fifty unique ones, so the best you can do is two thousand forty-eight out of two thousand ninety-eight, about ninety-seven and a half percent. And notice that even at sixty-four blocks the Zipf file gets some hits. That's tail-first eviction keeping the heads of the hottest prompt. A partial prefix is still a prefix.

A: Then plot median time to first token against hit rate. It should be close to a straight line, from the full-prefill time at zero hits to the warm time at full hits. Because time to first token is roughly a fixed cost, plus a cost for every token you didn't have cached.

A: And the scoreboard row is a little humbling. Your main columns, short prompts, one request at a time, barely move. Those prompts share almost nothing. That's the honest result, and it's worth writing down. The real effect goes in the notes: the shared-prompt time to first token, off versus on, and the Zipf hit rate at a thousand twenty-four blocks, two gigabytes.

<!-- section: Break It -->

A: Then you break it, on purpose. First one: put a timestamp at the top. Make the first line of the system prompt "current time is" whatever now is, and rerun the shared-prompt file.

B: [working it out] First block's different, so its key's different, so every key after it's different. Zero hits.

A: Zero. Move the line to the end of the prompt and the hits come right back. Every A P I's prompt caching guide warns about exactly this, because it's the most common way people silently lose their cache.

A: Second: release blocks head first. Change release so it puts blocks on the free list in order, head before tail. The tails-first test fails, obviously. But rerun the sweep in simulation. At two fifty-six blocks the Zipf hit rate falls from about thirty-six percent to eighteen. And round robin at a thousand twenty-four falls from eighty-one percent to zero.

B: From one line?

A: [nodding] One line, half the hit rate. Because evicting a head block makes every block after it unreachable. Lookup stops at the first miss. But those orphans still sit in the pool, taking up space, until L R U gets around to them.

A: Third: store views instead of copies. Take the clone out of the slicing helper. Everything still works... and memory climbs, request after request. Because a slice of a tensor is a view. It points into the original storage. So each cached sixteen-token block keeps that request's entire K V tensor alive, prompt plus generated tokens, every layer. Watch the process memory with the cache set to a thousand twenty-four blocks, and it grows way past two gigabytes. Same bug exists with NumPy slices in plain Python. It's why "cache size in blocks" isn't the same thing as "cache size in bytes", unless you're careful.

A: And fourth: use a tiny hash. Swap Shah two fifty-six for something that keeps only sixteen bits of the key. That's sixty-five thousand five hundred thirty-six possible keys, and you've got thousands of blocks. Collisions start within minutes of the multi-prompt run, and some requests get another prompt's K V.

B: Does it crash?

A: [sighs] No. That's the worst part. Look at the outputs. They're fluent and wrong. The model confidently answering a question nobody asked. No error anywhere. Which is why a cache key has to be collision-resistant, and why cache bugs are the worst kind of bug. They return an answer.

<!-- section: Wrap -->

A: If you want to go further, the two to read are the V L L M paper, Kwon and colleagues, "Efficient Memory Management for Large Language Model Serving with Paged Attention", and V L L M's design doc on automatic prefix caching, which you should read right after building yours and compare. And the operating systems book "Three Easy Pieces" has the chapter on why L R U falls over on loops bigger than the cache, which is your round-robin curve. The same questions, what's the key, how long does it live, what happens when it's stale, come right back in the caching and Redis lesson, just for ordinary application data. And the hundred and twenty-eight kilobytes per token is what decides how big your pool can be, which the lesson on how much memory a model needs works through carefully, and the lesson on the insides of V L L M and S G Lang is where you'll meet the block manager and the radix tree you just built, in production form.

B: [thinking out loud] Okay, let me try it. The K V cache is huge per token, so instead of one big reserved lump per request, you cut it into little blocks with a table, like virtual memory. And once it's blocks, any request whose prompt starts with the same tokens can just point at blocks that are already there, found by a chained hash. So you skip the prefill for that part. And L R U plus a T T L decides what gets thrown out.

A: [warm] That's most of it. Two sharpenings. Reference counts come before L R U: they decide what's allowed to be thrown out at all, and anything a running request is using is off limits, or that request reads someone else's keys. And what you skip is building those tokens, not having them. They're still in the context, every decode step still reads them. So you win time to first token, and tokens per second stays exactly where it was.
