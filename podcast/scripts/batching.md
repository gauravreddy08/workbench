<!-- section: The Problem -->

A: [relaxed, thinking out loud] So remember the row on the scoreboard that hurt. Sixteen people hit your simple Spark server at once. It serves them one at a time. And the sixteenth person waits about five minutes for their first word.

B: And the server isn't even doing more work. It's the same speed as with one person.

A: Same total output as one person. Fifteen extra users, and all you got was waiting. Now put that next to the other thing we know. When the model writes a word, the chip spends almost all of each step waiting for the weights to arrive from memory. The part that does math is basically idle.

B: So there's room. The chip has room for loads of people in every step.

A: Room for dozens of people in every step. And the server lets in one. That's the absurd part. And fixing it sounds like one line. Process several requests together. But it really isn't one line, and getting it right took the field until twenty twenty-two.

<!-- section: One trip, many passengers -->

A: Start with why it works at all. Think of a chef who can chop a thousand onions a second, fed by one slow delivery van. Writing a word is the van's speed. Every step, the whole model drives across town so the chef can do one word of work.

B: And batching is putting everyone's onions in the same van.

A: That's it. Put sixty-four people's latest words in the same step, and each weight, once it arrives, gets used sixty-four times instead of once. The expensive part of the step, hauling the model out of memory, happens once.

B: [skeptical] Okay, but there's got to be a catch. If I put sixty-four people in one step, I'd assume each of them is now sixty-four times slower. They're sharing.

A: That's the natural guess, and it's way off. Ask what actually grows when you add people. The math grows, sure, but the chip had tons of spare math, so that barely registers. The thing that really grows is each person's own notes. Their KV cache, the stored keys and values for everything they've said so far. Those aren't shared. Everyone's notes have to be read separately, every step.

B: So the model gets read once, and the notes get read once per person.

A: Right. So the step gets a bit longer, maybe half again as long with sixty-four people at a normal chat length. But it now makes sixty-four words instead of one. So the total goes from about seventeen words a second to about seven hundred. And each person's own stream only drops a little.

B: Huh. So each person gets slightly slower and the server gets dozens of times faster.

A: That's the whole economic case. A GPU costs the same per hour whether it writes seventeen words a second or seven hundred. Batching is how an inference company divides that hour by forty. It's the reason they make money.

<!-- section: Schedule every step -->

A: [warm] And the history here is fun, because batching itself is old. Model servers have batched requests for years. Gather a few, run them through the model together, hand back all the answers. And that works beautifully for, say, an image classifier. Every request is one pass through the model, same shape, same time.

B: But a language model isn't one pass.

A: It's hundreds of passes, one per word. And nobody knows in advance how many. So the serving systems back then still batched whole requests. A batch went in, ran until its longest member was done, and came out together. Then in twenty twenty-two a group at Seoul National University published a system called Orca. And the idea was so simple. Let the scheduler make a decision after every single pass.

B: Every word.

A: Every word. A finished request leaves right away. A new one joins at the next step. And within about a year every serious serving engine worked that way. The name that stuck is continuous batching. But to see why it matters, it helps to see what goes wrong without it.

<!-- section: The three taxes -->

B: Okay, so I'd build the simple version first. Collect a group, run them together, done.

A: That's static batching, and it was the standard. And it has three taxes. First one. The GPU wants a neat rectangle, every row the same length. Prompts aren't the same length. So the short ones get filler added. The filler gets masked out so the answer's right, but it's still real work and real memory.

B: Okay, that's annoying but small.

A: The second one isn't small. Answers vary wildly. "Yes" is one word. A code review is a thousand. A static batch runs until its longest member is done. And every row that finished early keeps its seat the whole time, producing junk that gets thrown away.

B: [working it out] So the one-word answer is basically riding along with the essay.

A: Riding along, holding a seat. And the third tax. Someone arrives a moment after a batch starts. There was room for them, a seat freed up when the short answer finished. But the batch is closed. So they wait for the whole thing. Their wait for a first word is the length of the longest answer in someone else's batch.

B: [laughs] That's brutal.

A: And there's a fourth one hiding in "collect a group". What if not enough people show up? A pure static batcher waits for the group to fill. At three in the morning, one person sends one request and waits until some strangers wake up. When I ran exactly that, with no time limit, against a benchmark, the last few requests of the run just hung. Forever. The final batch never filled.

B: So you give it a deadline.

A: You give it a deadline. Start the batch when it's full, or when the oldest request has waited long enough, whichever comes first. That's dynamic batching, and it fixes the hanging. But it doesn't fix the seat-holding or the late arrival. Once a batch starts, it's still closed.

<!-- section: A bus that never waits -->

B: [a bit unsure] So then I'd make it a smarter queue, right? Better grouping, smarter deadlines?

A: That's where most people's heads go, and the real fix isn't a better queue at all. Go back to what the GPU actually does. A request isn't one big operation. It's a prompt read, followed by hundreds of tiny identical steps. And every step is a natural place to stop and ask. Who's done? Who's waiting? Who should be in the next step?

B: Oh. So the batch isn't a group anymore.

A: It stops being a group that travels together. It becomes a bus with seats. At every stop, someone gets off and someone gets on, and the bus never waits at the terminal. The server is just a loop that never ends. Let in anyone waiting, if there's a free seat. Run one step for everybody. Send each new word to its own person. And anyone who just finished gets off, and their seat and their notes are freed right away.

B: That's actually simpler than I expected.

A: The loop is simple. Getting it right is fiddly. Every row has to know its own position, with padding that has to be invisible to every part of the model. And the nasty part is, when it's subtly wrong, it still writes fluent text. So the test is strict. Every request has to come out word for word the same as running it alone.

B: [skeptical] And continuous always wins?

A: Here's the surprise. If everyone arrives at the same moment and wants exactly the same length answer, all the approaches look the same. There's nothing to fix. Nobody finishes early, nobody arrives late. And that's exactly what a simple benchmark does, every request the same length, all starting together. So the simple batcher looks surprisingly good on it. You only see the real difference when you mix short and long answers, or push past the number of seats.

<!-- section: The newcomer's long prompt -->

A: There's one wrinkle the bus picture hides. When someone gets on, the model first has to read their whole prompt. And in the simplest design, a step is either reading a newcomer's prompt or writing for everyone else. Not both.

B: So if someone pastes in a long document—

A: Everyone else's text freezes while the model reads it. Sixty-odd people see their words stop for a moment because one person pasted a document. There's a spike in the gap between their words.

B: Can you do both in one step?

A: You can, and Orca did. The big multiplies don't care whose word is whose. Only attention does, because each word has to look at its own conversation. So you mix the newcomer's prompt and everyone's next word in one pass, and handle attention per person. But a really long prompt still makes one giant step. So the newer trick is to chop a long prompt into pieces and do one piece per step, alongside everyone's next word. That's called chunked prefill.

B: [working it out] And that's neat, because reading a prompt keeps the math busy, and writing words keeps memory busy.

A: That's the bonus. Mix them, and both halves of the chip are working in the same step.

<!-- section: A promise, and a wall -->

A: Now, batching isn't free for the user. Bigger batch, slower step, for everyone in it. Newcomers' prompts slow things more. So a real server doesn't just push throughput up. It pushes throughput up as far as it can while keeping a promise. Like, almost everyone gets their first word within a second, and the text flows faster than people read.

B: And past some point you break the promise.

A: Past some point, more people means more words in total, but more of them are late. So there's a better number to watch, called goodput. Throughput, counting only the requests that kept the promise. It climbs, peaks, and then falls, even while raw throughput keeps going up.

B: And memory? Every seat has its own notes.

A: Every seat holds its notes for as long as it's riding. And that's the other wall. On the Spark with an eight billion model, there's so much memory that you'd fit an enormous number of normal chats. Speed stops you long before space does, which is unusual. Move the same model to a gaming card and it flips. The weights take most of the card, and you fit only around a dozen long conversations. Serve a much bigger model on a data-center GPU, and memory is almost always the wall.

B: Which is where paging comes in.

A: Which is exactly where the next big idea in serving comes from. Storing everyone's notes in small fixed blocks, like pages in virtual memory, so a seat only holds what it's actually used.

<!-- section: Ending -->

B: Okay, let me try. Writing a word is mostly hauling the model across, and that haul can be shared. So you put lots of people in one step, and it costs barely more, and each word gets way cheaper. And continuous batching means people join and leave at every step instead of travelling as a group, so nobody holds a seat they're not using and nobody waits for someone else's long answer. And the limit is memory.

A: Nearly all of that. The one thing I'd sharpen is the limit. On your Spark, with this model, it usually isn't memory. It's that every extra person adds their own notes to read each step, so each step gets a little slower, until people's words come slower than the speed you promised them. So the question isn't just "how many fit". It's "how many fit while everyone still gets what I promised". That's the number you'd put in a capacity plan.
