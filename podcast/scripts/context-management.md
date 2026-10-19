<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture an agent most of the way through a refactor. Way back near the start, it opened the settings file and saw the timeout value. A few steps later it ran the server and got this enormous log back, thousands of lines, and exactly one of them mattered. Some upstream connection closing. Now it's near the end, and to write the fix it needs both of those things.

B: Okay. And it's got them, right? They're in the conversation.

A: Maybe. There are three ways this goes, and only one of them is good. First way, it runs out of room. The conversation's grown past what the model can take in at once. Either the API throws an error, or your harness quietly chops off the oldest messages to make it fit. And the timeout value goes with them. So the agent reads the file again, or worse, it just guesses a nice round number.

B: Sure.

A: Second way is the sneaky one. Everything's still there. Both facts are in the prompt, buried somewhere in the middle of a huge pile. And the model writes a fix with the wrong timeout anyway, because there are a dozen other timeout lines from other files sitting in there too.

B: And the third?

A: Third, it works. And then you look at the bill and it's weird. Every step sent the entire history again. The interesting stuff in the whole task was maybe a few pages, and you paid for millions of tokens. It's very easy for that bill to be eight times bigger than it needs to be, for reasons that have nothing to do with the actual task.

B: [skeptical] I mean, this all sounds like the problem of a year or two ago. The windows are enormous now. A million tokens. Just put everything in.

A: That's exactly what everybody concluded. And it turned out to be wrong in a really interesting way.

<!-- section: Bigger isn't better -->

A: So the early Transformers could see about five hundred tokens. A few paragraphs. GPT two had about a thousand. You couldn't fit a document in there, never mind a codebase. So in twenty twenty, Patrick Lewis and his colleagues at Facebook said, fine, keep the knowledge outside the model. When a question comes in, search for the few passages that matter and paste just those in. That's retrieval-augmented generation, RAG. And for a few years, "managing context" basically meant "retrieval, because there's no room".

B: And then the windows got huge.

A: Then they exploded. A hundred thousand tokens, and then a million, within about a year of each other. And the obvious conclusion was, retrieval's dead, just put everything in. And then two results in twenty twenty-three made that a lot messier. A group at Stanford showed models use stuff at the start and the end of a long prompt much better than stuff in the middle. They called it "Lost in the Middle". And a guy named Greg Kamradt hid one sentence inside long documents and mapped out where models could find it. The needle in a haystack test. And the charts had holes in them.

B: So the window got bigger, but the model's ability to actually use all of it didn't keep up.

A: That's the shape of it. And once agents started running for hundreds of steps, the job got a name. Context engineering. Deciding, at every single step, exactly what the model gets to see.

<!-- section: The desk -->

A: So here's the picture I keep in my head. A researcher at a small desk, with a big library behind her. Every few minutes an assistant clears the desk and lays out a fresh set of papers. And she reads every single one, start to finish, before she says anything. And she has no memory between rounds. If it's not on the desk, she doesn't know it.

B: So the desk is the context window.

A: The desk is the context window, the papers are tokens, and the assistant laying them out is your harness. That's your code. And the part people forget is that she reads everything, every time.

B: [working it out] Wait, so the model doesn't remember the earlier steps at all? I always kind of pictured it keeping the conversation and just adding to it.

A: It keeps nothing. The model is stateless. The only reason it looks like it remembers is that your loop sends the whole conversation again on every call. Step one sends the task. Step two sends the task, the first reply, and the first tool result. Step three sends all of that plus the next bit. And so on.

B: Oh. So the cost isn't how long the conversation ends up. It's the sum of every version of it along the way.

A: Right. If you picture the size of each request as a bar, the bars get taller every step, and you pay for every bar. So the total is a triangle, not a line. Double the number of steps and you pay roughly four times as much. An agent's bill grows with the square of how long it runs.

B: That's brutal.

A: It would be. Except there's a rescue.

<!-- section: Don't touch the top -->

A: You remember prefix caching. If the server's already processed the start of a prompt, it can keep that work around and skip it next time a request starts with the same tokens. Providers sell this as prompt caching. They keep the processed start of your prompt for a few minutes, and if your next request begins with exactly the same tokens, they charge you about a tenth of the price for that part.

B: And an agent loop is perfect for that, because every request is just the last one plus a bit on the end.

A: It's the perfect customer. The history only grows at the end. So almost every token is something the provider's already seen. With caching on, that triangle flattens back to nearly a straight line. But there's a catch, and it's a rule I'd tattoo somewhere. It's about order, not size. Anything that changes has to go as late in the prompt as possible. Because one changed token wrecks the cache for everything after it.

B: So if I put, like, the current time at the top of my system prompt —

A: You pay full price for the whole prompt, every single call. It's the classic mistake. One little line that changes every time, sitting at the very front, and the whole discount is gone. Same thing if your tool definitions come out in a different order each time.

B: Okay, so here's what I'd do, then. When the conversation gets long, I'd trim it. Summarise the old stuff, drop the oldest messages. Fewer tokens, smaller bill.

A: Fewer tokens, yes. Smaller bill, not necessarily. Think about where those edits happen. Dropping the oldest message changes what comes right after the system prompt. Summarising rewrites the middle. Either way, you've changed something near the top, so the provider has to process everything after it again at full price. Sometimes fewer tokens costs more money.

B: [laughs] That's annoying.

A: It is. It doesn't mean never do it. It means do it rarely, in big batches, and know what it costs.

<!-- section: A fixed budget of attention -->

B: Okay, but say money's no object. Everything fits, it's all cached. Then putting everything in is fine, right?

A: That's the second failure from the start, the one where it's all there and it doesn't matter. Remember how attention works. The current word compares itself against every other word, and then a softmax turns those scores into weights that add up to one. So attention is a fixed budget, split across everything on the desk.

B: So the more stuff on the desk, the thinner the slice for any one thing.

A: That's it. And real models are much better at this than a simple toy would suggest. They have lots of heads and layers, and they can be very sharp when something clearly matches. But it gets bad when the pile is full of near-misses. Picture a hundred files that all define a timeout, each with a different number. Every one of those lines looks almost as relevant as the right one. They're all competing for the same budget.

B: Which is exactly my codebase, honestly. Everything's called config.

A: Everyone's codebase. That's called attention dilution. And it's why stuffing everything in can give you a worse answer, even when the answer's sitting right there.

<!-- section: Lost in the middle -->

A: And then position matters too. That Stanford study gave a model a question and a stack of documents, with exactly one of them holding the answer. And they moved that document from first place, all the way through, to last. Accuracy was high when it was first, pretty good when it was last, and lowest in the middle.

B: A U shape.

A: A U shape. And for one model, when the answer sat in the middle, it did worse than when it got no documents at all.

B: Wait. So having the answer in there, in the wrong spot, was worse than not having it?

A: Worse than not having it. Why exactly is only partly understood. Training text tends to put important things at the start, like titles and instructions, and at the end, like the question you're answering right now. Models also park a lot of attention on the first few tokens. And the way position is encoded tends to favour what's recent. But the practical rules hold up. Put the instructions and the question at the end, right before the model writes. Put the important stuff at the start or the end, not buried. And fewer, better documents beat more documents.

B: So when a model aces the needle test, the one-sentence-in-a-long-document thing, that doesn't mean much?

A: It means less than it sounds. Most models ace it now. But the needle shares obvious words with the question, so the model can find it the way grep would. There's only one needle and nothing that looks like it. And finding a sentence isn't the same as using it, noticing it matters and combining it with something from much earlier. When people built tests that took away the word overlap, or added look-alikes, accuracy fell off with length even for strong models. So I treat the window size as a ceiling, and the needle score as a smoke test. The only number I'd trust is accuracy on my own task.

<!-- section: What each strategy throws away -->

A: So every strategy for managing context is answering one question. Of everything the agent could know, what goes on the desk this step? And the thing to notice is that none of them are free. They all throw something away.

B: Okay, walk me through them.

A: The cheapest big win is just capping tool outputs. That huge log? Keep the start and the end, because errors are usually at the end, and leave a note saying "I cut this much, call me again if you want the rest". You lose the verbatim middle, and that's usually fine.

B: And summarising, the thing I suggested.

A: Compaction. Near the limit, have the model summarise the history and carry on from the summary. It keeps the gist really well. And it loses specifics really badly. The exact number. The one odd log line. The thing that didn't seem important when it wrote the summary. And the nasty part is it doesn't fail loudly. It just forgets. So you tell the summariser exactly what has to survive, and then you actually read a summary it wrote and check what it dropped.

B: What about just having the agent write things down?

A: That's the notes file. Instead of hoping a summary keeps the right facts, the agent writes them down on purpose in a file and reads it back when it needs to. Same pattern as a CLAUDE dot md file. What it throws away is whatever the agent didn't think to write down.

B: And the sub-agent thing.

A: You hand a sub-task to a fresh agent with its own clean desk. Like, "find every place that calls retry with a timeout". It reads tons of files, comes back with a short report, and its whole desk gets thrown away. The main agent's desk stays small and clean. You spend more tokens in total, and you lose everything the helper saw but didn't mention. It works best when the sub-tasks are independent and the answer's much smaller than the evidence.

B: And then retrieval, fetching just the relevant bits.

A: Which is where your world comes in. Either you search an index, or you give the model tools like grep and "read these lines" and let it pull what it needs when it needs it. Claude Code works that way, no vector index at all. It costs more steps and more waiting. And if you go the search route, the quality of the search decides everything, and a reranker on top, the kind of cross-encoder you train at work, is often the biggest single win. A reranker is a context management tool. It decides what makes it onto the desk.

B: Huh. I never thought of my ranker that way.

<!-- section: Putting numbers on it -->

B: So how do you actually pick? This feels like something I do by gut.

A: You do, and you're good at it. The point is to turn the gut into a table. And the first thing I learned setting it up is the test task has to be long enough to hit the wall. Below the limit, truncating and summarising do exactly the same thing, because there's nothing to remove. Strategies only differ once the desk is full. So I built a fake codebase full of look-alike settings, and a long session of questions, where every so often a question refers back to an earlier answer, the way a long task leans on its own memory.

B: And what are you measuring?

A: Accuracy, tokens, dollars, seconds. But if I had to keep one number, it's cost per correct answer. Because a strategy that's a bit cheaper and a fair bit less accurate usually isn't cheaper at all. And my bet going in, which is exactly what you run it to check, is that stuffing bills by far the most tokens and still isn't the most expensive, because almost all of it is cache reads. The sliding window should be cheapest and forget the look-back questions. And the one I most want to see is whether stuffing actually loses on accuracy when the pile is full of near-misses. If it does, that's dilution, measured.

<!-- section: Ending -->

B: Okay, let me try. The model has no memory. Every step, the harness lays out a fresh desk and the model reads all of it. Each token costs money, time, memory, and a slice of attention, so a bigger window doesn't fix anything by itself. The trick is to keep the desk small. Trim old stuff, summarise, cut long outputs, and you save money every time.

A: All of that, except the last bit. Trimming and summarising save room on the desk, but they rewrite the top of the prompt, and that's what the cache depends on. So they can cost you more, not less. The thing to keep is the order rule: keep the start of the prompt still, put anything that changes at the end, and when you do throw something away, know exactly what it was, because none of these strategies tell you when they've forgotten.
