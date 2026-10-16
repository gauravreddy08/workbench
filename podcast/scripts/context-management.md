<!-- section: The Problem -->

A: [relaxed, thinking out loud] So here's a thing you already do well without really thinking about it. When your coding agent needs to find something, you have it walk the syntax tree instead of dumping whole files into the prompt. And every time you make an API call, you sort of... trim what goes in. By instinct. So let me give you a scene you've probably half lived through. An agent is forty steps into a refactor. Way back at step three, it read settings dot pi, and in there was a constant, timeout M S, set to two thousand three hundred fifty. At step nine it ran the server and got back a log. Twelve thousand tokens of log, and exactly one line in it mattered. An error, E four one two seven, upstream closed. And now it's at step thirty-eight, and it needs both of those facts. At the same time.

B: Okay. So it just... looks back at them?

A: [dry] That's what you'd hope. What actually happens is one of three things. The first one, it runs out of room. The prompt's gotten bigger than the model's limit, so either the API throws an error, or your harness quietly chops off the oldest messages to make it fit. And the config value goes with them. So now the agent either re-reads the file, which costs more tokens, or, worse, it just guesses. Three thousand. Sounds like a timeout.

B: [amused] It sounds like a timeout.

A: It's a very plausible number. That's the problem. Second thing that can happen: nothing's been cut. Both facts are still in there. The config's at around token eight thousand, the error's at around token thirty-one thousand, in a ninety thousand token prompt.

B: [a bit unsure] Then it's fine, right? If it's in the window, the model can see it. It's all right there.

A: [gently] That's the intuition, and that's exactly failure number two. It's all there, and it doesn't matter. The model writes a fix with the wrong timeout. Because there are a dozen other timeout M S lines from a dozen other files in that prompt too, and it grabbed one of those. And the third thing, it works. The fix is right. And the bill is strange. Every step resent the entire history. Step thirty-eight by itself was ninety thousand input tokens. The whole run came to about two million input tokens, for a task where the interesting content was, I don't know, maybe five thousand.

B: [quietly] Two million for five thousand.

A: Yeah. And none of those three is the model being dumb. They all follow from how the window actually works. And each one can be measured. So the job is to take "I manage context well by instinct" and turn it into numbers in a table.

<!-- section: Origin -->

A: And the history here is short but it, like, flips direction halfway. The original Transformer, and BERT, worked on five hundred twelve tokens. GPT two had one thousand twenty-four. GPT three had two thousand forty-eight. That's not enough to hold a document, never mind a codebase. So in twenty twenty, Patrick Lewis and his colleagues at Facebook AI published retrieval-augmented generation. The idea is, keep the knowledge outside the model, go fetch the few passages that matter, and paste just those in. And for a few years, "context management" basically meant retrieval. Because there was no room for anything else.

B: And then the windows got big.

A: Then they exploded. Anthropic shipped a hundred thousand tokens in May twenty twenty-three. OpenAI's GPT four Turbo had a hundred twenty-eight thousand by November. Google announced Gemini one point five with a million, in February twenty twenty-four.

B: [casual] So the obvious move is, forget retrieval, just put everything in.

A: That was the obvious conclusion, yeah. Retrieval's over. And two results in twenty twenty-three complicated it. In July, Nelson Liu and colleagues at Stanford showed that models use information at the start and the end of a long prompt way better than information in the middle. The paper's called "Lost in the Middle". And in November, Greg Kamradt hid a single sentence inside long documents and mapped out where models could find it. That was the first "needle in a haystack" test. And the charts had holes in them. Then by twenty twenty-five, with agents running for hundreds of steps, the work got a name. Context engineering. Deciding, at every step of an agent, exactly which tokens go into the model's context, in what order, and what gets dropped or compressed. Anthropic's engineering blog put it pretty plainly. Context is a finite resource with diminishing returns, and the goal is the smallest set of high-signal tokens that gets the job done.

<!-- section: The Idea: A desk, not a library -->

A: One comparison to hold onto. Picture a researcher at a small desk, with a whole library behind her. Every few minutes an assistant clears the desk and lays out a fresh set of papers. And she reads every one of them, start to finish, before she says anything. And she has no memory between rounds. If it's not on the desk, she doesn't know it.

B: That's... a pretty brutal job.

A: [laughs] It's a language model in an agent loop. The desk is the context window. That's the maximum number of tokens the model can take as input in one request, and for most APIs the tokens it writes back count too. Everything the model knows about your task, on this step, has to fit on that desk. The papers are tokens, the little chunks of text a model reads and writes. Usually pieces of words. In English a token's about four characters, or three quarters of a word. Code is often similar, but you'd check with your model's tokenizer. The assistant laying out the papers, that's your harness. And the part people forget: the model reads everything, every time.

A: So you know what a token is. The question is what a token costs once it's on the desk. And there are four separate bills.

A: The first bill is memory. Every token in the prompt leaves behind a key vector and a value vector in every layer of the model. That's the K V cache. The model keeps them so it doesn't have to recompute every earlier token each time it writes a new one, and it grows by one entry per layer for every token. For Llama three point one eight B, in B F sixteen, that comes to a hundred twenty-eight kilobytes per token. Quick sanity check on where that's from: thirty-two layers, a key and a value in each, each one a thousand twenty-four numbers wide, two bytes per number. Multiply it out, a hundred twenty-eight K. So a hundred thousand token agent session is about twelve point two gigabytes of K V cache.

B: Wait, for one conversation?

A: For one conversation. And the model's own weights are about sixteen gigabytes. So one long session is almost as big as the model itself.

B: [skeptical] But I'm on an API. That's their GPU. Not really my problem.

A: You don't see it, sure. The provider does. And it shows up for you in two places: the price, and the rate limits. Which is the second bill. Money. APIs charge per token, input and output priced separately. As an example, say three dollars per million input tokens and fifteen dollars per million output tokens. That's roughly a mid-tier model in twenty twenty-five, and you'd check the current prices for whatever you actually use. So a hundred thousand token prompt is thirty cents. Per call. Before the model's written a single word.

A: Third bill, time. Before the model writes its first token, it has to run the entire prompt through every layer. That's called prefill. It processes all the prompt tokens at once to build that K V cache, it's heavy on compute, and it's most of what you feel as time to first token. And the cost of it is, roughly, two arithmetic operations per model parameter per token. So for an eight billion parameter model, about sixteen billion operations per token. Plus attention, where each token has to look at every token before it.

B: And that part grows with how far in you are.

A: It grows with position. So for that same Llama, thirty-two layers, four thousand ninety-six wide, the attention work for one new token sitting at position n is about four, times thirty-two, times four thousand ninety-six, times n. Which is about half a million operations for every token that came before it. And here's the fun bit. When does that catch up with the sixteen billion for the weights? Around position thirty thousand. So past about thirty thousand tokens, attention starts to dominate, and prefill grows faster than linearly. If you assume a GPU really delivering a hundred trillion operations a second, then a thousand token prompt takes about fifteen hundredths of a second to prefill. Eight thousand tokens, about a second and a half. Thirty-two thousand, about eight seconds. A hundred twenty-eight thousand, over a minute.

B: [surprised] Over a minute? Before it says anything?

A: On that made-up setup, yeah. And that's back-of-envelope. Real engines and real GPUs differ, and providers run much bigger GPUs and a bunch of tricks. But the shape is real, and you can measure your own API's version of that curve. The fourth bill doesn't show up on any invoice. More tokens means more things competing for the model's attention. I'll come back to that one, because it's the subtle one.

<!-- section: The Idea: What's on the desk -->

A: Now picture what actually lands on the desk in one step of an agent. Draw it as a stack, top to bottom. At the top, the system prompt. Under that, the tool definitions. Under that, maybe a memory file, a notes file the agent keeps. Those three hardly ever change from step to step. Then draw a dashed line across. Call it the cache breakpoint, we'll get to what that means. Below the line is the stuff that changes. Retrieved chunks. Then the history, user, assistant, user, assistant. Then the tool results. File contents, test output, logs, web pages. And that's the fat block. Often eighty percent or more of all the tokens. And then at the very bottom, the current message, and right under it is where the model starts writing.

B: [a bit surprised] So the system prompt, the thing everyone obsesses over, is...

A: A rounding error. In most coding and browsing agents, the history and especially the tool results are the bulk. So most of context management, honestly, is the question "what do we do with tool results".

<!-- section: The Idea: The loop resends everything -->

A: Okay, here's the part that changes how you think about cost.

B: [casual] Before you go on, I think I've had this wrong. I always kind of pictured the API holding onto the conversation. Like, the session lives over there, and I just send it the new message.

A: [gently] That's the natural picture, and it's not how it works. The model has no memory between calls. None. Your harness gives it a memory by resending the whole conversation every time. So the loop is tiny. You keep a list of messages, starting with the task. You call the model with the system prompt, the tools, and the entire list. You append its reply to the list. If the reply isn't asking to use a tool, you're done. Otherwise you run the tools, append the results to the list, and go around again. And every lap, the whole list goes over the wire.

B: So step one sends the task. Step two sends the task plus the first reply plus the first result.

A: And step three sends all of that plus the second pair. So if each step adds about the same number of tokens, step k sends about k times that many. Try this one. An agent runs a hundred twenty steps. The system prompt and tools are two thousand tokens, and each step adds about nine hundred. A tool result and a short reply. Roughly how many input tokens do you pay for over the whole run? And what's that in dollars at three dollars a million?

B: [working it out] Okay, by the end the context is, two thousand plus a hundred twenty times nine hundred, so about a hundred ten thousand. And it gets sent a hundred twenty times, so... thirteen million-ish? Forty dollars?

A: [amused] You just paid for a rectangle. You only send the full hundred ten thousand at the very end. Early on, the requests are tiny. So it's the triangle under that line, half of a hundred twenty times a hundred ten thousand. Doing it properly: the two thousand base, sent a hundred twenty times, is two hundred forty thousand. And then the history part is nine hundred times zero plus one plus two, all the way up to a hundred nineteen, and that sum is about seven thousand. So about six point four million, plus the base, call it six point seven million input tokens. About twenty dollars.

B: So half my guess. But still twenty dollars for a context that never got past a hundred ten thousand.

A: Right, and that's the bit to feel. The final context was only a hundred ten thousand tokens, but you paid for it again and again on the way up. And this is quadratic. Double the steps and you roughly quadruple the input tokens. If you sketched four steps of it, it's four bars, each one longer than the last. Step one, about three thousand billed. Step two, five thousand. Step three, eight. Step four, eleven. And each bar is just the previous bar, in a pale color, plus a short solid piece on the end that's new this step. The pale part is a prefix the provider has already seen before. Without caching, you pay full price for that pale part every single time, so your total cost is the area of the triangle. And with caching, that same hundred twenty step run costs about two dollars forty.

B: From twenty to two forty.

A: From twenty to two forty. That's my own arithmetic with the example prices. Cache writes at one and a quarter times the normal price, cache reads at a tenth.

<!-- section: The Idea: Prompt caching -->

A: So, caching. You've seen the mechanism already as prefix caching. Quick recap: if a server has already computed the K V cache for some starting run of tokens, it can skip that prefill on the next request that begins with exactly the same tokens. APIs sell this as prompt caching. The provider keeps the processed start of your prompt around for a few minutes, and bills later requests that start with the exact same tokens at a big discount. And they come back faster too. Anthropic makes you mark where the reusable part ends. That's the cache breakpoint, a marker in the request that says "cache everything up to here". And the next request only gets to reuse it if every single token before the marker is identical. Cache writes are billed at one and a quarter times the normal input price, reads at about a tenth. Default lifetime's five minutes, and it refreshes every time you hit it. OpenAI does it automatically, for prompts over about a thousand twenty-four tokens. And all of these numbers move, so you'd check each provider's docs.

B: And an agent loop is... basically the perfect customer for that.

A: The perfect customer. Because the history only ever grows at the end. Each request is the last request plus a bit. So as long as nothing near the top changes, almost every input token is a cache read. And that gives you the first hard rule of context management. And it's not about size, it's about order. Anything that changes goes as late in the prompt as possible. Because one changed token wipes out the cache for everything after it.

B: [skeptical] One token.

A: One token. Put a timestamp in the first line of your system prompt, and you pay full price for the entire prompt on every call. Or build your tool definitions by looping over a Python set, so they come out in a different order between calls. Same thing.

B: [laughs] Oh, that's mean. That would take me a week to find.

A: [amused] It's a classic. And here's the twist that matters for everything after this. Any strategy that edits old history breaks the cache.

B: [skeptical] Hang on. If I drop old messages, I'm sending fewer tokens. Fewer tokens has to be cheaper.

A: [thinking out loud] You'd think. But look where the edit lands. Dropping the oldest message changes what comes right after the system prompt. Summarizing old turns rewrites the middle. Both save tokens in the window. But each edit forces the provider to re-process everything after the edit at full price. Actually worse than full price, at the one and a quarter write price. So, sometimes fewer tokens costs more money.

<!-- section: The Idea: Attention dilution -->

A: Now the cost that isn't on the bill. You built GPT two, so you've written attention. The current token's query gets compared against every key. Those scores go through a softmax, which turns a list of scores into weights that are all positive and add up to one, and a bigger score gets exponentially more weight. Then the output is the weighted average of the values. And the weights add up to one. That's the whole problem in one sentence. Attention is a fixed budget, split across every token on the desk.

B: Okay, but a fixed budget isn't a problem if the right token just wins.

A: [working it out] So let's see how much it wins by. Make it really concrete. Say the one token that matters scores three points higher than every other token, and all the others score the same. Those raw scores before the softmax are called logits. And adding one point to a logit multiplies that token's weight by e, about two point seven. So three points ahead means about twenty times the weight of any one other token. Now. With a thousand tokens on the desk, that's twenty against nine hundred ninety-nine ones. The relevant token gets about two percent of the attention.

B: Two percent. Okay.

A: With ten thousand tokens, it's down to two tenths of a percent. With a hundred thousand, two hundredths of a percent. Or flip it around. How big a lead does it need to hold onto half the attention? At a thousand tokens, about seven points. At ten thousand, about nine. At a hundred thousand, eleven and a half. Every ten times more context, the token you care about needs about two point three more points of lead, just to stay where it was. I ran those numbers in Python, and that two point three is just the natural log of ten.

B: [skeptical] Real models aren't that dumb though. Like, they find stuff.

A: They're much better than this toy, yeah. They've got many heads and many layers, and trained models learn really sharp attention for things like copying. But the pressure's real. And it gets a lot worse when the haystack is full of near-misses. Picture a hundred lines that all say timeout M S equals some number. Each one of those scores almost as high as the right one. So that's attention dilution. A relevant piece of context getting less of the model's attention as more tokens compete for it, especially tokens that look like it. And that's failure number two from the start. Everything fits, and the model still picks the wrong timeout.

<!-- section: The Idea: Lost in the middle -->

A: Liu and colleagues measured something more specific. They gave models a question and twenty retrieved documents, and exactly one of the twenty had the answer. Then they moved that one document from first place, all the way to last. And accuracy traced a U. High when the answer was first. Pretty high when it was last. And lowest in the middle. For GPT three point five Turbo, with twenty documents, the middle positions scored below the closed-book baseline. Closed-book meaning the model gets no documents at all.

B: [surprised] Wait. Worse than nothing?

A: Worse than nothing. Having the answer in the context, in the wrong spot, was worse than not having it. Now, I'm going from memory on the exact numbers. The shape is the robust part. If you draw it, accuracy goes up the side, position of the right document goes along the bottom, first to twentieth. The curve starts high on the left, that's called primacy. Sags through the middle. Comes back up on the right, recency. And there's a dashed flat line across for the closed-book score, and the bottom of the U dips under it. Newer models flatten that curve a lot on easy tests. But it tends to come back once you add distractors and harder questions.

B: Do we know why it's a U?

A: Only partly. There are a few stories and they probably all contribute. Training data puts important stuff at the start, titles, instructions, and at the end, the question you're answering right now. So models learn to look there. Then, attention only looks backward, so the earliest tokens get seen by every later token. And models are known to park a lot of attention on the first few tokens no matter what's in them. And position encodings like the RoPE you implemented tend to make far-apart tokens score a little lower on average, which favors whatever's recent. Whatever the mix is, the practical rules don't move. Put instructions and the question at the end, right next to where the model writes. Put the most important material at the start or the end, not buried in the middle. And fewer, more relevant documents beat more documents.

<!-- section: The Idea: Needle in a haystack -->

A: And then there's Kamradt's test. Really simple. Take a long filler document, he used Paul Graham essays. Insert one sentence somewhere: "The best thing to do in San Francisco is eat a sandwich and sit in Dolores Park on a sunny day." Ask the model what the best thing to do in San Francisco is. Repeat over a grid of lengths and depths. And you get a heat map. Early long-context models had visible red patches in it. And when Claude two point one scored badly on it, Anthropic reported that adding one line to the beginning of the model's answer, "Here is the most relevant sentence in the context", took it from twenty-seven percent to ninety-eight.

B: [laughs] From one line? So it was mostly about how you asked.

A: That tells you how much of the result was the framing of the test. And today, most frontier models score near perfect on the plain version.

B: So that one's solved.

A: [firmly] The test is solved. Using long context well isn't. Three reasons. One, it's a word match. The question shares rare words with the needle, San Francisco, best thing. So the model can find it basically the way grep would. There are benchmarks that strip out the shared words, so that finding the needle takes one step of reasoning. One's called No Lima, from twenty twenty-five. And on those, accuracy falls off steeply with length, even for strong models. Two, there's one needle and nothing that looks like it. Real context is full of near-misses. A benchmark from NVIDIA in twenty twenty-four called Ruler added multiple needles, distractors, following a variable through a chain of assignments, and tasks where you have to aggregate across the whole input. And they found the effective context length, meaning the longest input where a model still clears some accuracy bar, as opposed to the maximum the API will accept, is often much shorter than the advertised number.

B: And three?

A: Three, finding isn't using. Your agent has to notice that the timeout matters, combine it with the error from step nine, and then write a fix. Chroma put out a report in twenty twenty-five called "Context Rot", and they found performance degrading with input length even on simple tasks. So, if a vendor tells you their model scores a hundred percent on needle in a haystack at a million tokens, what you've learned is it can find one sentence that shares obvious words with the question, anywhere in a long input. That's a good sign that its position encoding and attention hold up at that length. It doesn't tell you it can find something without the word overlap, or pick the right fact out of many near-identical ones, or combine two facts that are far apart, or keep reasoning well over that much text. So treat the window size as a ceiling and the needle score as a smoke test. The only number worth trusting is accuracy on your task, at your lengths.

<!-- section: The Idea: The toolbox -->

A: Okay. So what do you actually do about all this? Every strategy for managing context answers one question. Of everything the agent could know, what goes on the desk this step? And none of them is free. They all trade tokens for something else. A risk of missing information, the cost of extra calls, or latency. So for each one, the question is what it throws away.

A: The simplest is stuff everything. Preload. Put the whole corpus in the prompt once, cache it, and ask away. Nothing's ever missed, and with caching it's cheaper than you'd guess. It fails when the corpus doesn't fit, when near-misses dilute attention, and on the first call's latency, because that's a full prefill. It's good for one document, or a small repo you're going to query a lot within the cache's lifetime.

A: Then retrieval. That's RAG, retrieval-augmented generation, from the twenty twenty paper. Before or during generation, search an outside store for relevant passages, and put only those in the prompt. And RAG lives or dies on two choices. The first is chunking, how you cut documents into pieces, because the chunk is the thing that gets found and pasted in. Too small and you lose the surrounding meaning. You retrieve "it returns three" and... what does?

B: [amused] Right, what's "it".

A: And too big wastes tokens. For code, one function or class per chunk, with its file path and its imports attached, beats cutting fixed-size windows. And your AST lookup already does exactly that. The second choice is the search. Keyword search, the classic formula's called B M twenty-five, scores documents higher for containing rare query words, with diminishing returns for repeats. It's great at exact identifiers. Then embeddings, vectors from a model that put texts with similar meaning near each other, for when the question's paraphrased. And then a reranker on top.

B: A cross-encoder. That's literally what I'm training.

A: That's the kind of model, yeah. And it's often the biggest single win in the whole pipeline. What retrieval throws away is whatever the search ranked low. And its weak spot is multi-hop questions, where you need fact A to know to look for fact B. Unless the model gets to search more than once.

A: Which leads to just-in-time loading. That's retrieval as tools. Fetch information into context only at the step that needs it, instead of loading it all up front. You give the model grep, read lines forty to ninety, list this directory. Keep only light references in context, file paths, line numbers, and let it pull what it needs. Claude Code navigates repos this way, with no vector index at all. The cost is more steps, more latency, and you're trusting the model to know what to look for. Most real systems preload a little, say a memory file and the directory layout, and load the rest on demand.

A: Then tool-result truncation, which is the cheapest big win of the lot. Cap every tool's output, say at two thousand tokens. Keep the head and the tail, because errors are usually at the end. And say what you cut. Something like, "eighteen thousand four hundred lines omitted, call read log with a start and end to see more". There's a cousin of this, clearing old tool results. Twenty steps after the agent acted on a file, you replace the file's contents with a stub, like "read utils dot pi, three hundred forty lines". Anthropic's API calls that context editing. What it throws away is the verbatim old outputs. And it breaks the cache at the edit, so you do it in batches, not one message at a time.

A: Then summarization, which people call compaction. Near the limit, you have the model summarize the history, and then you continue from that summary plus the last few turns. Compaction keeps the gist really well. And it loses specifics really badly. Exact numbers, the one odd log line, the thing that seemed unimportant at the moment you summarized. So you tell the compaction prompt what has to survive, decisions, file paths, exact values used. And you test it. Because a summarizer that drops one critical fact fails silently.

B: So that's the one that would've kept "timeout two thousand three hundred fifty is in settings" and lost "E four one two seven".

A: [warmly] Yeah, that's exactly how it goes. Which is why the next one exists. Structured memory files. Instead of hoping a summary keeps the right facts, the agent writes them down, on purpose, into a notes file or a progress file, and re-reads it when it needs to. That's the Claude dot M D pattern. I keep one for a project of mine, and it has a "lessons learned" section that earlier agents wrote into themselves. A paper called Mem G P T, from twenty twenty-three, took the idea furthest. The context window is RAM, external storage is disk, and the model pages things between them. It's virtual memory, but for text. What it throws away is whatever the agent didn't think to write down.

A: And last, sub-agents. You hand a sub-task, like "find every caller of retry that passes a timeout", to a separate model loop with its own fresh, clean context. It does that one job and returns only a short result. So it burns fifty thousand tokens reading files, hands back a thousand-token report, and its window gets thrown away.

B: Oh, so that's how you save tokens.

A: [jumping in] No, the opposite, actually. Total tokens go up. Anthropic wrote up their multi-agent research system, and it beat a single agent on broad research questions, while using far more tokens in total. Around fifteen times a normal chat, by their count. What goes down is the size of the main window, and the noise in it. Picture it as one main agent up top with a small window, about eight thousand tokens, holding three short reports. And below it, three sub-agents, each with a big window full of files it read, about fifty thousand each, all thrown away. And a thin line coming back up from each one, a report of about a thousand tokens. What it throws away is everything the sub-agent saw but didn't report. It works best when the sub-tasks are independent, and the answer is much smaller than the evidence.

<!-- section: The Idea: Watching the window fill -->

A: The way I really got a feel for these was a little simulator. A toy coding task, thirty steps. Greps, file reads, test runs, and one twelve thousand token server log. Step twenty-seven needs a config value that was read at step three. Step twenty-eight needs one error line from the log at step nine. You pick a strategy, stuff, truncate, summarize, or sub-agent. You drag a slider through the steps, you pick the window size, thirty-two K, sixty-four K, a hundred twenty-eight, two hundred. And you can toggle the cache. And you watch a bar fill up with what's on the desk, see what got dropped, and see what you paid, at the three and fifteen dollar prices.

B: So what happens with stuff?

A: At sixty-four K, the repo alone is forty thousand tokens. Then by step nine, the log shows up and pushes the request over the limit, and the task is just dead. Bump the window to a hundred twenty-eight K and it fits. Every fact is visible the whole way. And with the cache on, the whole run costs about a dollar. Even though it bills more tokens than any other strategy, about two point two million. Turn the cache off, about six dollars seventy.

B: So stuffing only works because of caching.

A: Stuffing and caching are partners. Then truncate, at sixty-four K. It never overflows. But by step twenty-seven, the config from step three and the log from step nine are both gone. So the agent re-reads, which is more steps, or it guesses. And look at the cache hit rate, because every time it drops something, it's changing the start of the history. Summarize, at sixty-four K: it compacts once. The little config fact survives. The exact line in the big log doesn't. Which is the typical compaction failure. The gist made it, the one specific detail didn't. Then sub-agent. The main window ends up under seven thousand tokens, and it's the cheapest run of all. But the cache helps less, because each sub-agent's window is brand new. And you're trusting five little reports to have kept the right facts.

A: And then the one that surprised me. Set truncate and summarize both to a hundred twenty-eight K.

B: [working it out] They're... the same? Because nothing ever needs to be removed.

A: [emphatic] Identical. Strategies only differ once you hit the wall. Which means if you're going to compare them, your test tasks have to be long enough to hit it.

<!-- section: The Idea: Predict which wins -->

A: So try this before anything gets built. The real benchmark is a fake codebase of about ninety-four thousand tokens, and thirty questions asked in one session. And every fifth question asks about an earlier answer. Three strategies. Stuff everything. Retrieval, with a forty thousand token sliding window, so the oldest questions fall off. And retrieval with a rolling summary. Rank them on the look-back questions, on total input tokens, and on dollars.

B: [a bit unsure] Okay. Look-back... stuff never forgets, so stuff wins. Sliding window loses, the old stuff fell off. Tokens, stuff is the most by a mile. And dollars, stuff is the most expensive, because it's the most tokens.

A: Three out of four, I'd say. On look-back, yeah, stuff and summary should do well, and the sliding window badly, because by the time you ask about an earlier answer it's often slid out of a forty K window. On tokens, stuff is highest. Ninety-four thousand times thirty calls is about two point nine million, and that's before you even count history. The sliding window's lowest. But on dollars, it's closer than the tokens suggest. Stuff is almost entirely cache reads after the first call. And the summary strategy breaks its own cache every time it compacts.

B: The editing-breaks-the-cache thing again.

A: Same thing. And then there's the one I'd most like measured. The two-hop questions. Don't assume stuffing wins those. A hundred files that all define timeout M S is a haystack made of near-misses. And to be clear, that ranking's my expectation, not something I've measured.

<!-- section: The Idea: Context engineering, the actual job -->

A: So put it all together and you get a job description. At every step of the loop, the harness decides what goes on the desk. A good one keeps the top stable, system prompt, tool definitions, memory file, and pushes anything that changes to the end, so the cache works. It caps every tool result, with a note on how to get more. It loads just in time where the model can search, and only preloads what's needed on nearly every step. It writes down what matters in a memory file, instead of hoping it survives a summary. It compacts with a prompt somebody actually tested, rarely, and in big batches, because every compaction costs a full-price re-read. It hands wide, noisy exploration off to sub-agents and keeps their reports. And it measures. Tokens in, tokens cached, dollars, seconds, and success rate. On tasks long enough to hit the wall.

B: And I'm guessing the measuring is the one everyone skips.

A: It's the one everyone skips. So that's what the build is for.

<!-- section: Build It: The benchmark -->

A: So here's what you'd build. A small harness, and a benchmark where context management actually matters. The benchmark is a fake codebase. About a hundred modules, and every one of them defines the same two constants with different values. Timeout M S, and retry limit. Then thirty questions, asked in one long session. Most of them need two hops. Find a function, see which module it calls into, read that module's constant. And every fifth question refers back to an earlier answer, which is exactly what a long task does to an agent's memory.

B: Does it have to be a paid API?

A: Any API works. The Anthropic Python SDK's the obvious one, the OpenAI SDK's the same shape. Or a local model on the Spark behind an OpenAI-compatible server, V L L M or the llama dot C P P server. That costs nothing, and you get to see prefill time directly. Small local models will score lower, though. For the main runs, use a small, cheap model. My estimate for the whole thing on a cheap API is somewhere around five to fifteen dollars, if you keep the budget guard on. That's from the token counts, not a receipt.

A: The setup's just a virtual environment, the SDK, and your API key in your shell, never committed. Then a little generator script writes out the fake codebase and a questions file with the answers. Each module gets its two constants, an entry point called handle something, which calls a helper from one other randomly chosen module, and a dozen filler functions around it so there's real bulk to wade through. When I ran it with a hundred files and seed zero, it said a hundred files, about three hundred seventy-five thousand characters, which by the four-characters-a-token rule is about ninety-four thousand tokens. And with tiktoken's GPT four tokenizers, that corpus really does come out at about four characters per token. Claude's tokenizer will give a somewhat different count, so you'd get the real number from the token counting endpoint, or from the usage on your first call. And if your model's window is two hundred thousand and you want stuffing to feel uncomfortable, go to a hundred fifty files. That's about a hundred forty thousand tokens.

<!-- section: Build It: The ledger -->

A: The first real piece is the ledger. Every experiment is only as good as this. One function that makes the API call, and writes one line to a log file per call. A tag, the uncached input tokens, cache reads, cache writes, output tokens, cost, and seconds. It works out the cost from the prices, keeps a running total, and refuses to make another call once you're past a budget. Five dollars by default. For a small model the example prices are a dollar per million in and five out.

B: And input tokens is just... how big the prompt was.

A: [jumping in] That's the trap. In Anthropic's usage numbers, input tokens counts only the uncached part. The full prompt is input tokens, plus cache reads, plus cache writes. If you only log the first one, your stuffing strategy looks almost free. And to actually cache a big system prompt, you pass the system prompt as a list of text blocks and mark the last stable one for caching. That's how it worked as of twenty twenty-five, anyway. Check the docs if it's moved. Then the sanity check. Call it twice with the same five thousand token system prompt, marked for caching. The first call should show about five thousand tokens of cache write. The second should show about five thousand of cache read, and fewer seconds.

<!-- section: Build It: Tools with truncation -->

A: Then the two tools the agent uses to look around, which you write yourself. Grep, which runs a regular expression over the corpus and returns rows of file path, line number, and the line. Capped at some number of lines, with a footer saying how many matches it left out. And read, which returns numbered lines from a file, between a start and an end. And if that's more than about two thousand tokens, it keeps a head and a tail and puts an explicit marker in the middle. Like, "lines sixty-one to three forty omitted, call read with a start and end to see them."

B: So the cap is kind of the whole point of that tool.

A: The truncation is the part that teaches. You decide the cap, you keep the right end, and you tell the model what you cut. Two small things. A bad path or a bad regex should come back as an error string, not blow up, so the model can read it and recover. And put line numbers in, because they let the model ask for precise ranges later. And then actually try grep for timeout M S and just look at it. A hundred lines that differ only in the file name and the number. That's what a near-miss haystack looks like.

<!-- section: Build It: The loop and three strategies -->

A: Then the agent loop. One loop, and three different policies for what goes into the message list before each call. All three run the thirty questions in order, in one session. Each question gets appended as a new user turn, and the agent can use tools up to eight times per question before it answers. And there's exactly one function that differs between strategies: the one that builds the context.

A: Strategy A, stuff. No tools at all. The whole corpus goes into the system prompt, each file wrapped with a tag that has its path on it, and the whole thing's marked for caching. History is append-only, just questions and answers. No limit except the model's own. Strategy B, retrieval only. A short system prompt, plus grep and read. History grows until it passes the window, forty thousand tokens, and then you drop the oldest whole question until it fits. And whole question means its user turn, its tool calls, its tool results, and its answer, all of it.

B: Why does it have to be the whole thing? Couldn't you just drop the bulky tool results?

A: Not half of a tool exchange. The API rejects a tool result whose tool call is missing. So if you cut the call and keep the result, or the other way round, the request just fails. Then strategy C, rolling summary plus retrieval. Same tools. When history passes eighty percent of the window, you make one extra call with a compaction prompt over the oldest two thirds of the history, and replace all of those turns with a single message that starts "Notes from earlier in this session". And the most recent third stays word for word.

A: For counting tokens as you go, take the exact usage from the previous call, and add the four-characters-a-token estimate for whatever you've appended since. Close enough. Write the compaction prompt yourself, and make it say what has to survive. Every question number, its final answer, and the exact module names and numbers used. Then go read an actual summary it produced, and check it against the answers file. And for scoring, lowercase, strip spaces and punctuation, and compare.

<!-- section: Build It: The matrix -->

A: Then run the matrix. Each strategy on three different seeds of the codebase, so that's nine sessions of thirty questions. Save a record per question, keep the ledger, and write a little report that prints, for each strategy: two-hop accuracy, recall accuracy, total input tokens, cached plus uncached, the share that was cache reads, dollars, the median and p ninety seconds per question, meaning the typical one and the slowest one in ten, and the biggest context it ever sent. Look at seed zero before you run the other two, and check the budget guard. If stuffing at ninety-four thousand tokens is too pricey for your model, drop everything to sixty files and just note it. And then have an agent review the harness for bugs that would skew the comparison. A cache breakpoint in the wrong place. A tool result counted twice. Scoring that's too strict.

<!-- section: Build It: Lost in the middle, measured -->

A: Then a separate experiment, your own lost-in-the-middle curve. You build a haystack out of synthetic records. Lines like "Server R K oh four one two in rack seven was last patched on" some date. One of them is the needle, about the server named in the question, and you put it at a chosen depth. Zero means first, one means last. It's a fair test because every line is a near-miss, not Paul Graham essays. The grid is lengths of four thousand, sixteen thousand, sixty-four thousand tokens, a hundred twenty-eight if your model and your budget allow. Depths from zero to one in steps of a tenth. Five trials each. And the question goes after the context.

B: How much does that cost?

A: A hundred sixty-five calls at those first three lengths, roughly four point six million input tokens. At a dollar a million, about four sixty. Three trials instead of five gets you under three dollars. And use a small model. The weaker the model, the more visible the curve. Then there's a second version that breaks the word match. The question asks about "the server in the same rack as R K oh four one two that was patched most recently". So now the model has to find two lines and compare them. Same grid, if the budget's there, at just two lengths. You record accuracy for every length and depth, and time per call for every length, either by streaming or just total seconds with a tiny output.

<!-- section: Build It: Stretch, sub-agents -->

A: And a stretch one. Strategy D. For each question, spin up a fresh sub-agent with a short system prompt, the tools, and only that question. It comes back with its answer and a one-line note, like "handle X calls helper Y in module Y, timeout this, retry limit that". The main session's history holds only the questions and those notes.

B: [working it out] So recall should be... decent? The note has the module name and both numbers in it, so a look-back question can be answered from the note.

A: That's the prediction to write down before you run it. And then you add the row. And you're done when the ledger, summed up, matches your provider's usage dashboard within a few percent. When the report prints the table for A, B and C on three seeds. When you've read at least one compaction summary your agent wrote and found what it dropped. When you've got a plot of accuracy against depth for at least three lengths. And when you can say, with your own numbers, which strategy you'd ship for a ninety-four thousand token repo, and which for a ten million token one.

<!-- section: Measure -->

A: So, what to expect in that table. And I want to be honest about this one. These are predictions from the arithmetic, not results. I haven't run the API experiments. Stuff should bill by far the most input tokens, about two point nine million. But with more than ninety percent of them being cache reads, its cost should land close to the others. Its first question is the slowest, because that's a full prefill of about ninety-four thousand tokens, and later ones are faster. And its two-hop accuracy is the interesting number. If it's clearly below retrieval, you just measured attention dilution from near-misses.

A: The sliding window should be the cheapest on two-hop, and fail the recall questions whose original question has slid out. And you can check that directly. Plot whether each recall question was right against how many questions back it was referring to. The summary strategy should get most recall questions back, if the compaction prompt keeps the answers. Expect a cost bump at every compaction, and a lower cache-read share than stuffing.

B: And speed? The retrieval ones send way smaller prompts, so they should be faster.

A: [amused] You'd think, but probably not. The retrieval strategies make several tool round trips per question. Grep, read, read again. So their median seconds per question should come out higher than cached stuffing, despite the smaller prompts. Just-in-time loading trades latency for tokens.

A: For the needle grid, with a current model and the literal question, I'd expect a nearly flat row near a hundred percent at four K and sixteen K. Maybe a few misses in the middle at sixty-four K. That flat row is the "needle tests are saturated" result, and it's worth seeing for yourself. The non-literal version is where the curve should show up, dipping in the middle and falling off with length. Seconds per call should grow with length. If it's close to linear from four K to sixty-four K, the provider's fast enough that attention's faster-than-linear part isn't showing yet at those lengths. Remember the crossover was around thirty thousand tokens for an eight B model. And if you run the same grid on the Spark with a local model, time to first token is that prefill curve from earlier, measured.

A: And then one number to carry out of all of it. Cost per correct answer, for each strategy. That's the number that decides architecture. Because a strategy that's thirty percent cheaper and twenty percent less accurate is usually not cheaper.

B: [working it out] Right, because you pay for the wrong ones too. Seventy cents on the dollar, but only eight answers in ten where you had ten... per correct answer that's barely cheaper. And then someone has to clean up the wrong ones.

A: Yeah. And that last part is usually the expensive part.

<!-- section: Measure: Stuff or retrieve -->

B: So for the ninety-four thousand token repo versus the ten million token one. Where does that land?

A: Stuff when it fits with room to spare, when you'll ask a lot of questions within the cache's lifetime, and when the content isn't full of near-duplicates. One contract, one paper, a small repo. With caching, the repeat calls are cheap and nothing is ever missed. Retrieve when it doesn't fit, when it changes too often to cache, or when it's full of similar-looking things that'll dilute attention. And as the corpus grows, say from a hundred thousand tokens to ten million, stuffing just stops being possible. So the whole question becomes how good your retrieval is. Chunking that follows the structure, functions for code. Keyword search and embedding search together. A reranker. And letting the agent search over and over for the multi-hop questions.

<!-- section: Break It -->

A: Then you break it, on purpose. Four ways. First, what if you put the time at the top? Add a line with the current time as the very first line of the stuffed system prompt, and rerun stuffing on one seed.

B: The cache dies.

A: The cache-read share collapses to near zero, and the input cost jumps by roughly nine times. With the example multipliers, every call is now writing the whole prompt at one and a quarter instead of reading it at a tenth. One changing token at the front invalidates everything after it. Then move that time line down into the last user message, and watch the cache come back.

A: Second, take the truncation out. Make read return whole files, no cap. And make one giant file, four hundred thousand lines of the same assignment. Then ask a question that tempts the agent to read it.

B: [amused] And it reads it.

A: And you get a context-length error from the API. Or if it does fit, you get one call that costs as much as the entire rest of the session. Every tool needs a cap. Third, starve the summarizer. Tell the compaction to summarize in at most a hundred words, and rerun the summary strategy. Recall accuracy should drop toward the sliding window's. Then read the summary and list what it dropped. Because that's the failure mode of every compaction scheme. It doesn't fail loudly. It just forgets.

A: And fourth, poison the haystack. Add thirty files that define timeout M S with a comment saying it's deprecated and unused, with a different value. And have some of the handle functions mention them in a comment. Now stuffing has to sort real from fake inside attention. And retrieval has to sort them with grep and reading.

B: So which one breaks worse?

A: [relaxed] That's the honest question. I don't know which degrades more on your model. That's what the run is for.

<!-- section: Explain It Back: How does this scale -->

B: Okay, scale question. Say I'm the provider, or say I'm hosting it on my own GPUs. A thousand agent sessions running at once, each holding a hundred thousand tokens of context, on Llama three point one eight B. What breaks first?

A: [without hesitation] Memory. Back to the hundred twenty-eight kilobytes per token. A hundred thousand tokens is about twelve point two gigabytes per session. A thousand sessions is about twelve terabytes of K V cache. Against sixteen gigabytes of weights. And no single machine holds that. Even a node with eight eighty-gigabyte GPUs has six hundred forty gigabytes total. So you can hold maybe a few dozen of those sessions per node at once.

B: And the rest?

A: The rest wait. Or they get evicted, and then they pay the whole prefill again when they come back. Or you offload their K V cache to CPU memory or disk. So every token you keep out of context is memory you get back. Context management is a serving-cost problem, not just an accuracy problem. And prefill is the second thing to break. A hundred thousand token prefill takes seconds, each one, and they're fighting with decoding for the same GPU. Prefix caching helps with both. As long as the sessions keep their prefixes stable.

<!-- section: Go Deeper and Connections -->

A: If you read two things after this, read Liu's "Lost in the Middle" paper, it's short and the experiments are clean, and Anthropic's post "Effective context engineering for AI agents", which is this whole topic from the people who build Claude Code. And the reranker you're training is, honestly, a context-management tool. The next places this goes are what makes a task long-horizon, where the task runs way longer than any window, and taking apart a real agent harness, where every choice you'd make in that build-the-context function shows up again.

<!-- section: Close -->

B: [working it out] Okay, let me try the whole thing. The model doesn't remember anything, so the harness resends the whole conversation every step, which makes cost grow with the square of the steps. Caching fixes the money as long as the top never changes. And then the real job is keeping the window small, because the less you send, the better the model does.

A: [gently] Mostly. The first half's exactly right. The last part, though. Small isn't the goal, it's a side effect. Stuffing a whole repo can be the right answer, if it fits, it's cached, and it isn't full of look-alikes. The goal is the right tokens, in the right order. Stable stuff at the top so the cache holds. The question at the bottom, next to where the model writes. Nothing in the middle that looks almost like the answer. And whatever you throw away, you choose on purpose and measure. Because every strategy forgets something. The only question is whether you picked what.
