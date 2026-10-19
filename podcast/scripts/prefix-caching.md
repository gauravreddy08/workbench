<!-- section: The Problem -->

A: [relaxed, thinking out loud] So think about one of your agents. It's got a system prompt. Tool descriptions, rules, a couple of worked examples. It's long, and it never changes. And every single step, the agent sends that whole thing to the server again, plus the conversation so far, plus one new line.

B: Sure. That's how they all work.

A: Right. Now watch what the server does with it. Before it can write a word, it has to read the prompt. And reading the prompt means building a set of notes about every word in it. You know these, it's the KV cache. For every word, every layer keeps a key and a value, so later words can look back at it without redoing the work.

B: Yeah, I've built that.

A: So the server reads your system prompt, builds those notes, uses them for one answer, and throws them away. Then a second later the next step comes in with the exact same system prompt, and it builds the exact same notes again. From scratch. On the Spark that's about a second, every step, just to rediscover something it already knew a moment ago.

B: [a bit amused] That's kind of embarrassing.

A: And chat is worse. Turn ten of a conversation resends turns one through nine. So the pile it rereads gets bigger every turn.

B: So keep the notes. Don't throw them away.

A: That's the whole idea, and it's called prefix caching. But it turns out you can't just bolt that on. There's a second problem in the way first, and it's about memory.

<!-- section: The memory nobody uses -->

A: When a server handles lots of requests at once, each one needs room for its notes. And the notes grow as the answer grows. So how much room do you set aside for a request?

B: As much as it needs.

A: But you don't know how much it needs. You don't know how long the answer's going to be. It might stop after ten words, it might go on for pages. So the obvious design is to reserve room for the longest possible answer, every time, for everyone.

B: [skeptical] Okay, but then just size it right. Look at what requests usually need and reserve that.

A: You can't size it right, because it's different for every request and you only find out at the end. Reserve too little and a long answer runs out of room halfway. So people reserved for the worst case. And then most requests use a small slice of what they reserved, and the GPU fills up with memory that's spoken for and empty.

B: So the box says it's full, but it's mostly air.

A: Mostly air. And there's a nastier version of it. Requests of different sizes come and go, and they leave gaps between their reservations. So you can have plenty of free memory in total, but chopped into holes, and none of them is big enough for the next request.

B: Huh. That's, that's the exact thing operating systems fight with.

A: It is the exact thing. And that's where the fix came from.

<!-- section: Pages, again -->

A: [warm] So, two thousand twenty-three. A group at Berkeley, in Ion Stoica's lab, goes and actually measures how existing LLM servers use their memory. And they find that most of the memory reserved for those notes wasn't holding anything. Well under half of it. The rest was set aside for words that might come later, or stranded in gaps. Which meant the thing limiting how many people a GPU could serve at once wasn't the math. It was this wasted memory.

B: And their fix was what?

A: Their fix was straight out of an operating systems textbook. You remember how virtual memory works. The OS doesn't give a program one big unbroken chunk of real memory. It cuts memory into small fixed-size pages, scatters them anywhere, and keeps a table per program saying which page lives where. The program thinks it has one smooth stretch of memory. It doesn't. It has a list of pointers.

B: Right, page tables.

A: So they did that for the notes. Cut the memory into small blocks, each one holding the notes for sixteen words. Each request gets a little table: my first sixteen words are in that block over there, the next sixteen are in this one. When a request fills its last block, grab any free block from anywhere and add a line to its table. No reserving in advance. No needing your neighbours to be free.

B: So the most you ever waste is the end of one block.

A: Less than one block per request. That's it. They called it PagedAttention, because the attention step now has to look up where each block lives before it reads it. And the system they built around it is vLLM, which you'll run into a lot.

B: Okay, so that fixes the memory. But where does sharing come in? You started with the system prompt.

A: That's the nice part. Once a request is just a list of pointers to blocks, two requests can point at the same block.

<!-- section: Pointing at the same block -->

A: The first place it shows up is inside one request. Say you ask for four different answers to the same prompt. The naive server stores four identical copies of the prompt's notes. With blocks, all four tables just point at the same prompt blocks, and each block keeps a count of how many people are using it.

B: But then they start writing different answers. They can't all write into the same block.

A: Right, and the fix is the same one the OS uses when a process forks. Share everything read-only, and the moment someone needs to write into a shared block, copy just that block for them. It's called copy-on-write. Only the bit that actually differs gets duplicated. Every full prompt block stays shared.

B: Okay. And then across requests?

A: [relaxed] Across requests is the leap. Two different users, two different requests. But they have the same system prompt at the start. Can the second one reuse the first one's blocks?

B: [working it out] I mean, it's the same words. But the notes for a word depend on the context, right? That's the whole point of attention.

A: They do depend on the context. But only on the context before them. A word can only look backwards, never forwards. So the notes for word number five depend on words one through five and their positions, and nothing else. Nothing after it can touch them.

B: Oh. So if two prompts start the same, the notes for that shared start are...

A: Identical. Not similar, identical, apart from tiny rounding. That's why prefix caching is exact. The second request can skip reading that whole shared beginning and only read what's new.

B: And it has to be the beginning. A matching chunk in the middle doesn't count.

A: It doesn't, and this bites people all the time. Say your prompt has a line at the top with today's date, and then the long system prompt under it. Tomorrow the date changes. That one changed line is at the very start, so every word after it saw a different past. Every note after it is different. You get zero reuse.

B: Even though almost the whole prompt is the same text.

A: Even though. When I tried it, putting a timestamp on the first line dropped the hits to nothing. Move it to the end and they all come back. So the habit is stable stuff first, the tools, the instructions, the examples, and anything that changes goes last.

<!-- section: Naming a block -->

B: How does the server actually find a matching block though? It can't compare my prompt against every prompt it's ever seen.

A: No, it gives each block a name it can compute from the words alone, without running the model. And the trick is the name has to mean "these sixteen words, given everything before them". So you take a fingerprint of the block's words, mixed with the fingerprint of the block before it.

B: Oh, like a git commit. Each commit's hash includes its parent's hash, so it covers the whole history.

A: Same idea exactly. So a block's name covers everything up to it. Then lookup is just a dictionary. Compute the names for the new prompt, walk them from the start, and stop at the first one you don't have. Everything before that is reused. Everything after gets computed.

B: And if two different prefixes ever got the same name?

A: Then the second request quietly gets someone else's notes. And this is the scary part. It doesn't crash. The model writes something fluent and confident that answers a question nobody asked. No error anywhere. If you use a tiny fingerprint to save space, you can actually watch it happen. That's why real servers use a big, strong hash. A cache bug is the worst kind of bug, because it still gives you an answer.

<!-- section: Who gets thrown out -->

A: Okay, so now the cache is filling up. The memory is finite, so eventually something has to go. And there are really three rules.

B: First one being, don't throw out something someone's using.

A: That's the first one, and it's not about speed. If a running request is pointing at a block and you hand that block to someone else, that request starts reading a stranger's notes on its next step. It's not slow, it's wrong. So that count of who's using a block matters. Only blocks nobody's using right now can go.

B: And among those, the oldest?

A: The one that's gone longest without being used. Least recently used, LRU. Because traffic comes in bursts. The system prompt that got used a second ago will probably get used again in the next second. And then there's an optional third rule, a timer. Anything that's sat idle too long just expires, even if there's room.

B: Why would you want that if there's room?

A: Because LRU only answers "who goes when we're full". If you're never full, a prompt from last Tuesday sits there forever, holding memory that could be serving more people right now. A timer frees it on a schedule. And every hit resets the timer, so anything in steady use never expires.

B: [thinking] And when you do evict, which end of a prompt goes first?

A: The tail. Always the tail. Think about it. If you throw out the first block of a system prompt, every block after it becomes unreachable, because lookup stops at the first miss. They're just orphans taking up space. If you throw out the last block instead, the next request still gets everything up to it. When I flipped that one choice in the simulation, the hit rate fell by about half. One line.

B: Huh.

A: And there's a surprise in there that I really didn't see coming. Take eight different system prompts and send them in strict rotation, one, two, three, all the way round and back to one. Then give the cache room for about half of them. What hit rate do you get?

B: Half? Somewhere around half.

A: Zero. Not half. Zero. Because by the time prompt one comes back around, the other seven have all been used more recently. So prompt one is always the one that got thrown out. Every request evicts exactly the prompt that's about to come back next. It stays at zero until the cache can hold the whole loop, and then it jumps nearly to the top.

B: [laughs] That's evil.

A: It's the classic way LRU fails, any loop bigger than the cache. Real traffic is kinder than that, though. A few prompts are really hot and a long tail is rare, and then it degrades gently instead.

<!-- section: What it buys, and what it doesn't -->

B: Okay, so with the cache warm, my agent is just faster now. The whole answer comes out faster.

A: That's the part people get wrong. It's faster to start. It's not faster to type.

B: Why not? It's doing less work.

A: It's doing less of one kind of work. Remember the two halves. Reading the prompt is one big pass over all the words at once, and the chip is busy doing real math. That's what sets the wait before the first word. Writing the answer is one word at a time, and each word means hauling the whole model across from memory, plus all the notes. The cache skips the first part, the reading. It doesn't make any of those notes disappear. Every new word still has to read every one of them.

B: So the wait before the first word goes from about a second to a small fraction of that. And then the typing is exactly as fast as before.

A: Exactly as fast as before. So on a long answer you barely notice it. On a short agent step, where the answer's a line or two, it's most of the time. On a busy server there's a bonus, because reading you skip frees up the chip for other people, and shared blocks leave room for more requests. But on your one-at-a-time server, it's the first word that gets faster.

<!-- section: Bigger than one machine -->

B: What happens when there's more than one server? Each one has its own cache.

A: Right, so if you spread requests around evenly, turn two of a conversation usually lands somewhere that's never seen turn one. It rereads the whole thing, and now several machines are holding copies of the same notes. So you route a conversation back to the machine that has its prefix. You've seen this, it's a sticky session.

B: Which I thought was a bad idea for load balancers. Keeping state on one box.

A: It's fine here, because it's only a cache. If that machine dies, the next request goes somewhere else and pays the full read. Nothing's lost but time. You just can't be too sticky. One hugely popular system prompt would pile everybody onto one GPU, so you fall back to whoever's least busy.

B: And this is what the APIs are charging me less for.

A: That's exactly what it is. When Anthropic or OpenAI bill cached input tokens at a discount, it's this mechanism sold back to you as a line on the bill. Anthropic, by default, keeps it about five minutes after the last use, and reading from it costs about a tenth of normal input. And notice it's a timer, not just LRU. Because once someone's paying, the cache has to be a promise. "It lives five minutes after you last touched it" is something you can plan around. "It lives until something more popular pushes it out" isn't.

<!-- section: Ending -->

B: Let me try it. The notes for any word only depend on the words before it, so if two prompts start the same, those notes are identical and you can keep them instead of recomputing. To make keeping them work you cut memory into little blocks with a table per request, the way an OS does pages, and then requests can just point at the same blocks. You throw out blocks nobody's using, oldest first, ends before beginnings. And it makes everything faster.

A: All of that's right except the last bit. It makes the start faster. It skips rereading the prompt, so the wait for the first word drops. But every word after that still reads the whole model and all the notes, cached or not, so the typing speed doesn't move. Which is why it matters so much for agents, short answers on top of the same long prompt, and so little for one long essay.
