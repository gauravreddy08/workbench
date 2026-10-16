<!-- section: The Problem -->

A: [relaxed, thinking out loud] So last time you did one division. Two hundred seventy-three gigabytes a second, which is how fast the Spark's memory can feed its GPU, on the spec sheet. Divided by sixteen gigabytes, which is the size of an eight B model in B F sixteen. Every weight has to be read once for every token, so that division is your speed limit. About seventeen tokens a second, tops. Hold on to that number.

B: Seventeen. Okay.

A: Now go open the Fireworks playground. Pick an eight B Llama, ask it for a short story. The text comes out faster than you can read it. Then do the same thing on your Spark, and it comes out at, like, the speed you'd read out loud.

B: [casual] So Fireworks is faster. Obviously.

A: [amused] That's what everyone says. And it's... not wrong, exactly. But try this. Run both from the Spark itself, short prompt, and just watch the very first word. On localhost, your server can show the first word before Fireworks does. Because your request never left the box. And then it falls behind on every single word after that.

B: Huh. So it wins the start and loses the race.

A: For one person, yeah. Now have three friends hit your Spark at the same moment. The third one stares at a blank screen for most of a minute. Meanwhile Fireworks is serving thousands of strangers and doesn't even blink.

B: [skeptical] Okay, so then the answer's still "Fireworks is faster", just with footnotes.

A: The answer is there isn't an answer yet. Faster at what? The first word, or the whole thing? For how many people at once? Measured how? That's what this whole episode pins down. You'll end up with a way to measure it properly, and a scoreboard. And you're going to spend the rest of this track trying to move the numbers on that scoreboard.

<!-- section: Origin -->

A: And there's a reason companies like Fireworks even exist, and it's pretty recent. February twenty twenty-three, Meta released LLaMA to researchers. And the weights were out on the open internet within about a week. Then that July, Llama two shipped with a license that actually allowed commercial use. Then Mistral, Qwen, DeepSeek, later Llama versions. So suddenly anyone could just download a model that was close to the best closed ones.

B: And then you need somewhere to run it.

A: Right, and that's the catch. Downloading a model is easy. Serving it well is not. GPUs are expensive. And, you saw this last time, a GPU answering one person spends most of its time waiting on memory while its compute just sits there idle. So a bunch of companies built a business in that gap. Fireworks, which was started by people from Meta's PyTorch team. Together AI, Baseten, a few others. They run fleets of data-center GPUs, they serve open models to lots of customers at once, and they sell the output by the token.

B: So where's the money? If they're running the same open model you can download.

A: The money's in the tricks. Serve lots of users per read of the weights, that's batching. Skip work you've already done, that's caching. Move fewer bytes, that's quantization. Guess several tokens at once, that's speculative decoding. And write faster GPU code. Every one of those is a later lesson. Today you build the server without any of them.

B: [amused] So I'm building the bad one. On purpose.

A: On purpose. So you can see exactly what each trick buys you, because you'll have measured the thing it fixes.

<!-- section: The Idea: Six numbers -->

A: So, first, what does "fast" even mean for one of these APIs. There's sort of a diner's view and an owner's view. Someone using a chat app cares how long until something shows up, how steady the pace is once it's going, and how long the whole thing takes. The company running the GPUs cares how much total output it can push out per hour. So that's four numbers. And then two more show up once you look at lots of requests instead of one.

A: The first one is time to first token. T T F T. From the moment your code sends the request to the moment the first bit of generated text arrives. That's the number that makes a chat app feel snappy or sluggish. It's the wait before anything happens.

A: Second is the gap between one token and the next, once text is flowing. That's called inter-token latency, I T L. You'll also see it called time per output token. It's the pace.

A: Third, output tokens per second, for one stream. And that's just one over the gap. If tokens arrive every seventy-seven milliseconds, that's thirteen a second. This is the number you predicted last time. The seventeen was a ceiling on this one.

B: And the whole-request time is just those added up?

A: Pretty much. End-to-end latency is the wait for the first token, plus one gap for every token after that. So say two hundred fifty-six tokens at thirteen a second. The first one comes from the initial wait, then two hundred fifty-five more gaps of about seventy-seven milliseconds each. That's about twenty seconds. Plus the wait at the start.

A: [leaning in] Fourth, and this is the owner's number, aggregate throughput. Total output tokens per second across every request the server's handling at once. So picture one user getting fifteen tokens a second. Now picture sixteen users each getting fifteen tokens a second. Same speed for each person. But the second server is pushing out sixteen times as much text.

B: Oh, so that's the thing they actually sell.

A: That's the thing they sell. And then the last one isn't a separate number, it's how you report all of the others. The tail. You give each one as a percentile. So, sort all your measurements. The median, p fifty, is the typical request. And p ninety-nine is the value that only one request in a hundred is worse than. You already know why that one matters. At scale, somebody's always the unlucky one.

<!-- section: The Idea: Anatomy of a request -->

A: Okay, so where do those milliseconds actually go? Follow one request. Picture a timeline running left to right. It starts the moment the request leaves your code, and it ends when the last token arrives.

A: First chunk is the network. Your request goes out, and the first token comes back. Together that's one round trip. R T T, the time for a tiny message to get to another machine and back. And from the latency numbers you've seen: localhost is well under a millisecond. Your home network, about a millisecond. A data center across the country, tens of milliseconds.

B: And the internet part to Fireworks is the tens-of-milliseconds one.

A: Tens of milliseconds, yeah, depending where you are. Then, on the very first call only, there's a handshake. A brand-new H T T P S connection needs a TCP handshake, that's one round trip, and then a TLS handshake. TLS is the encryption under H T T P S. Before any data can flow, the two sides have to swap keys, and with TLS one point three that costs one more round trip. So, two round trips before your request can even be sent. But if you reuse the connection, which H T T P X does by default inside one client, you only pay that once. And your Spark, on plain H T T P, only pays the TCP part. On localhost that's basically nothing.

A: Then, queue. The server might not start on you right away. On Fireworks, a scheduler slots you into a batch that's already running. On the server you're about to build... you wait until every request ahead of you is completely done. Hold that thought. It's the biggest number in this whole episode.

A: [slowing down] Then the GPU actually does something. First, prefill. The model reads your entire prompt in one forward pass. All the prompt tokens at once.

B: [a bit unsure] And that's slow for the same reason, right? It's reading all the weights.

A: It does read all the weights, once. But here's the difference. In prefill, every weight that gets read is used for every token of the prompt. Hundreds of them at once. So it's big matrix-times-matrix work. The GPU has plenty to chew on for each byte it fetches, and the limit becomes compute, not memory. Which means prefill gets longer as the prompt gets longer. And prefill also produces the first output token.

B: Okay. And then decode is the slow loop.

A: Then decode. One token per forward pass. And each pass reads every weight from memory to make just that one token. That's the bandwidth-bound loop from last time. The GPU's starved, waiting on the memory pipe. So each pass costs about one gap, one I T L, no matter how short the prompt was.

A: So, if you add it up... time to first token is network, plus handshake, plus queue, plus prefill. And everything after that is decode, at one gap per token.

<!-- section: The Idea: Predict, who wins -->

A: So try this. Same eight B model on both. Your Spark, called from a script running on the Spark itself. Versus Fireworks, over the internet. One user. A two hundred fifty-six token prompt, and a two hundred fifty-six token answer. Who shows the first token first? And who finishes the whole answer first?

B: I mean, Fireworks for both? Their GPUs are just way faster. Maybe they get the first token in, I don't know, fifty milliseconds, and I'm at a few hundred.

A: Second half, yes. First half, probably not. For the first token, it's plausibly your Spark, or close to a tie. Localhost costs you nothing, and nobody's in line ahead of you. Fireworks has to pay an internet round trip, and then its gateway and its scheduler, and that can add up to a hundred milliseconds or more before its prefill even starts. And their prefill is much faster, sure. But yours, for two hundred fifty-six tokens, is short too. It's about the cost of one pass over the weights, plus some compute. So something on the order of a hundred milliseconds.

B: [working it out] So we're both around a hundred, and I don't have the internet in the way.

A: Right. But the whole answer? Fireworks, by a mile. Two hundred fifty-five more tokens at your roughly thirteen a second is about twenty seconds. At a couple of hundred tokens a second, it's more like one or two. The internet round trip gets paid once. The per-token speed gets paid two hundred fifty-five times.

B: So short answers favor the box that's close, and long answers favor the fast GPU.

A: That's it. That's basically the whole comparison in one sentence.

<!-- section: The Idea: Tokens are not chunks -->

A: Now, before you can measure any of this, there's a trap in how the text actually arrives. The server streams it using something called server-sent events. S S E. And it's really simple. It's one plain H T T P response that just... doesn't finish quickly. It stays open, and the server keeps writing lines that start with the word "data", then a colon, then a chunk of JSON, then a blank line. And the client reads each one as it shows up.

B: [casual] So each event is a token, and I time the gaps between events. That's my inter-token latency.

A: That's the obvious plan, and it's wrong. An event can carry several tokens. Your own server's going to do it on purpose. The Hugging Face streamer holds text back until it has a whole word. So "Hello" with an exclamation mark might come through as one event, even though it's two or three tokens. And a busy API might do it by accident. It has a little hiccup and then flushes a few tokens at once.

B: So if I count events, I undercount the tokens.

A: You get the wrong token count, and the gaps between events aren't the real gap between tokens either. Picture two rows of tick marks. On top, the server making tokens at a steady rhythm, tick, tick, tick, evenly spaced. Below it, what the client actually receives. Mostly one event per tick, but here and there a single event with two in it, and at one point a stall and then three arrive at once. The top row is the truth. The bottom row is what you see.

A: So the harness does three things for each request. It stamps the time it sends. It stamps the time of the first event that has actual text in it, and that's your time to first token. And it stamps the time of the last event with text. Then it takes the token count from the server's own report. There's a usage field in the final event, and in it, the number of completion tokens. Call that N. And decode speed is N minus one, divided by the window between that first text and the last text.

B: Why minus one?

A: Because the first token didn't come from decode. Prefill made it. So inside that window, from first token to last, there were N minus one decode steps. And one more thing worth recording: the biggest single gap between two events. It's not the speed. It's a stutter detector.

<!-- section: The Idea: Where each one wins -->

A: So there's an interactive picture of the whole race. And I want to be really clear that it's a model, not a measurement. It uses made-up but reasonable rates. For the Spark: prefill takes at least sixty milliseconds, or the prompt length divided by three thousand tokens a second, whichever is bigger. Decode at thirteen tokens a second, one request at a time. For Fireworks: fifty milliseconds of gateway and scheduling, prefill at twenty-five thousand tokens a second, decode at a hundred eighty tokens a second, in a shared batch. Its job is to show you the shape before your harness gives you the real numbers.

A: There are two bar charts. The top one is just the race to the first token, Spark bar and Fireworks bar, each colored by segment. Network, handshake, queue, prefill. The bottom one is the whole answer on its own time scale, with decode added on the end. And you've got sliders for prompt length, output length, how many users, and which network your Spark is on.

A: Start with a short prompt, localhost, one user. The Spark wins the first token. Barely. When there's very little work to do, nearby beats fast.

A: Now drag the prompt up to four thousand ninety-six tokens.

B: [working it out] So prefill gets big, and prefill's the compute part...

A: And a data-center GPU has many times the Spark's compute. So now prefill dominates the first-token time, and Fireworks takes the lead even after paying for the internet. It flips.

A: Then switch the Spark's link to Tailscale, from a café. Your network advantage just evaporates.

B: [amused] Right, my home server's only local when I'm home.

A: Yep. Then drag the output to a thousand twenty-four tokens. The bottom chart is now almost entirely decode. That's where the roughly ten-times gap per token lives, and no amount of network luck makes it up. And then set it to sixteen users and look at the Spark's queue segment. We'll get to that.

B: [skeptical] Okay, but hang on. Decode is just reading weights. Why are they so much faster at that? They're reading the same sixteen gigabytes.

A: Because every part of that division from last time is different for them. Speed is bandwidth divided by bytes per token, right? Start with the bandwidth. Their GPUs use H B M, high-bandwidth memory. It's memory stacked right next to the GPU chip with a very wide connection. An H one hundred's spec sheet lists about three point three five terabytes a second. That's roughly twelve times the Spark's two hundred seventy-three gigabytes. So, about an order of magnitude more bandwidth than the Spark's L P D D R five X.

A: Then the bytes. They might serve the model in F P eight. That's an eight-bit floating point format. Weights in eight bits instead of sixteen means half the bytes read per token, so a bandwidth-bound decoder gets up to twice as fast. You can lose some quality doing it, and that's the quantization lesson. They might use speculative decoding, which gets several tokens out of one read of the weights. And their code is fused, compiled GPU kernels, not a Python loop.

B: And they tell you which of those they're doing?

A: [laughs] Not all of it, no. Which is fine. You're going to build each piece yourself and see what it's worth.

<!-- section: The Idea: Many users at once -->

A: Okay. Here's the part that surprises people. Sixteen people send a request to your naive Spark server at the same instant. Each one wants a two hundred fifty-six token answer. And your server handles exactly one request at a time, at about thirteen tokens a second. How long does the sixteenth person wait for their first token? And what's the server's total throughput while all this is going on?

B: [a bit unsure] Okay, so... everyone slows down a bit, because they're sharing? And the total goes up, because it's doing sixteen things. Maybe the last person waits, I don't know, ten seconds?

A: So that's the picture most people have, and here it's wrong on both counts. Nobody's sharing anything. Each request takes about twenty seconds of service. A fraction of a second of prefill, then two hundred fifty-five tokens at thirteen a second. And the sixteenth person waits for fifteen full requests to finish before theirs even starts. Fifteen times twenty seconds. That's five minutes. Five minutes to see the first word.

B: [surprised] Five minutes.

A: Five minutes. And the throughput the whole time is still about thirteen tokens a second. Same as it was with one user. Adding users added only waiting.

B: So the GPU isn't doing any more work. It's just got a longer line.

A: That's it. Picture it as a chart. Sixteen rows, one per request, time running left to right. Dashed line means waiting in line, solid means being served. In naive mode it's a staircase. Each row's solid part starts right where the row above it ended. The first-token time climbs step by step, and the throughput number sits there, flat. Then there's a toggle for batched, which is a preview of a later lesson. Everyone shares each pass over the weights. All sixteen rows go solid at once, nobody's waiting in line, and the throughput number climbs.

A: And this connects to something you already built. Your load generator from the async lesson. It runs what's called a closed loop. You've got a fixed number of workers, call it c. Each worker sends a request, waits for the full answer, then sends the next one. So the number of requests in flight is held constant at c, and the arrival rate just adjusts itself to whatever the server can handle.

B: Right, the semaphore thing. Always c in flight.

A: Always c in the system. So in steady state, the one at the back of the line is waiting behind c minus one others. And that's Little's Law, from the same lesson. It says, for any stable system, the average number of things inside equals the rate they come through, times the average time each one spends inside. It holds for a line at a coffee shop and it holds for requests in a server. So here. The number inside is c. The server finishes one request every twenty seconds, so the rate is one over twenty seconds. And the time each request spends inside is the number inside divided by the rate. Which is c times twenty seconds. Sixteen users, three hundred twenty seconds in the system each.

B: So double the users, double the wait.

A: Double the users, double the wait. And throughput never moves.

B: [skeptical] And Fireworks doesn't have this problem because they've just got a lot more GPUs?

A: They do have more GPUs, but that's not really the reason. They don't serve one request at a time. They run one pass over the weights for a whole batch of requests. So the expensive part, reading sixteen gigabytes out of memory, gets shared by everyone in the batch. Sixteen more users barely change how long each pass takes. Which is why their p ninety-nine hardly moves as you turn up the number of users. Your server gets that same trick in the batching lesson.

B: [working it out] Okay, so flip it around. How many people could actually use my naive server and have it feel okay?

A: Let's put a number on "okay". Say you promise a two-second time to first token. That kind of promise is called an S L O, a service level objective. A target you commit to for a metric, like "p ninety-nine time to first token under two seconds". Now, one request takes about twenty seconds of service. Anyone who shows up while another request is running has to wait for the rest of it. On average that's about ten seconds.

B: Which already blows the two seconds.

A: Which already blows it. So the honest answer is one user. And only if that user's requests never overlap with anyone else's. If people show up at random, the fraction of requests that find the server busy is just its utilization. That's the arrival rate times twenty seconds. For ninety-nine percent of requests to find it idle, utilization has to be about one percent. So that's one request every... half hour or so.

B: [laughs] One request every half hour. That's a server for nobody.

A: [amused] It's a server for you, at two in the morning. And Fireworks can promise the same two seconds to tons of users, because a new request joins a batch that's already running instead of waiting for it to finish.

<!-- section: The Idea: How many samples a p99 needs -->

A: Now, a measuring trap. Say you send twenty requests and sort their first-token times. Where's the p ninety-nine?

B: [working it out] Ninety-nine percent of twenty is... nineteen point eight. So somewhere around the nineteenth or twentieth request?

A: Yeah. With the usual way of computing it, it sits between the nineteenth and twentieth sorted values, eighty-one percent of the way toward the slowest one. So in other words, your "p ninety-nine" is just your single worst request. One unlucky garbage collection pause, one network blip, and that's your headline number.

B: So how many do I need?

A: The rule of thumb is about ten samples beyond the percentile you want. For p ninety, the slowest ten percent, that means about a hundred requests. For p ninety-nine, about a thousand. And here's where it hurts. At twenty seconds a request, a thousand requests on your naive server is five and a half hours.

B: [sighs] For one concurrency level.

A: For one. So be honest instead of heroic. Put n, the number of requests, next to every percentile you report. Report p ninety when n is small. And print "n under a hundred" instead of a p ninety-nine that's really just a max. Oh, and there's a nice side effect of the throughput being flat. On the naive server, two hundred requests take about the same wall-clock time whether you run them one at a time or sixteen at a time.

B: Huh. Because the GPU's doing the same work either way, just in a different order.

A: Same total work, same speed. The only thing that changes is who waits.

<!-- section: The Idea: One client for both servers -->

A: So how do you point one harness at two completely different servers? Fireworks exposes what's called an OpenAI-compatible API. It's an H T T P API shaped exactly like OpenAI's. You send a POST to the chat completions path, with a JSON body that has the model name, the list of messages, and max tokens. Most inference providers speak it, and so do the open serving engines, V L L M and S G Lang. So one client works against all of them. Turn on the stream flag in that body and you get the event stream back.

A: And the stream looks like this, roughly. The first event usually has the role, "assistant", and empty content. No text at all. Then events with little pieces of text. Like "Once". Then " upon a", with the space in front. And so on. Then a final event with no text, a finish reason that says it stopped because of length, and the usage. Something like forty-one prompt tokens, two hundred fifty-six completion tokens, two hundred ninety-seven total. And then the very last line is just "data", colon, and the word DONE in square brackets.

B: Okay, and which of those details actually matter for the timing?

A: Three of them. One, since the first event is often empty, time to first token is the first event with non-empty content. Not the first event. Two, Fireworks' docs say it sends that usage block in the final chunk of a stream. OpenAI's own API only does that if you ask for it, with an option called stream options. And three, that DONE line at the end isn't JSON. If your parser tries to decode it as JSON, it blows up.

A: So if your Spark server speaks the exact same API, the benchmark client has no idea which server it's talking to. And that's the whole design. Picture it as a pipeline. On the left, a fixed file of prompts. That feeds c async workers, using async I O and H T T P X. Each one sends the same request body to either the Spark or Fireworks. The stream comes back, one event at a time, into a parser that timestamps every event as it arrives. Each request becomes one record. Time to first token, end-to-end time, token count, tokens per second. Each run becomes one results file, stamped with the git commit, the model, and the precision. And then a little script turns that file into one row on the scoreboard.

<!-- section: The Idea: Rules for a fair fight -->

A: [a bit wry] Now, a benchmark is only as good as the boring parts. And the boring parts should live in the harness, not in your memory. So, a list. It's worth having all of it.

A: Same model. Pick one that Fireworks serves and that you can run in B F sixteen. Llama three point one eight B Instruct is the natural pick. It's literally the model your sixteen-gigabyte math described, and Fireworks' own docs use it as their example. But check their current catalog first, because what's on their pay-per-token tier changes. A Qwen three eight B class model is a fine alternative. But turn off its "thinking" output on both sides. Otherwise you're comparing different amounts of text.

A: Same prompts. Like, a fixed file, used in the same order, every run.

A: Same work. Temperature zero. A fixed max tokens. And force every request to generate exactly that many tokens.

B: Why force it? If the model wants to stop early, isn't that just... a real answer?

A: It's a real answer, but it's a different amount of work. If one server writes a chatty three hundred tokens and the other writes a curt forty, you're not comparing speeds anymore. So Fireworks' API reference has a flag called ignore E O S, end of sequence. It tells the model to keep going past where it would've stopped. And in Hugging Face you get the same effect by setting min new tokens.

A: [matter-of-fact] Warm up. Just throw away the first few requests. They pay for connection setup, GPU warm-up, caches being cold.

A: Same token counting. Use the server's usage count, and spot-check it now and then by re-tokenizing a few outputs with the model's own Hugging Face tokenizer.

A: Write down the precision. Yours is B F sixteen. If Fireworks says how a model is served, and some model pages do mention F P eight or similar, write that down. If not, write "undisclosed". It matters. Half the bytes per token is up to twice the speed.

A: Several concurrency levels. One, four, sixteen, and sixty-four users at once. A single number at one user hides the most important behavior.

A: Same client location. Run the harness on the Spark for both targets. That compares the servers. Then, once, run it from your laptop, so you know what a user on your network actually feels.

A: [firmly] Errors are data. Fireworks' pay-per-token tier has rate limits, and at sixty-four at once you might get H T T P four twenty-nines. "Too many requests." Record every failure in the results. Never drop them silently.

A: And note the time. A shared API is busier at some hours than others. So run Fireworks twice, at different times of day, and keep both.

<!-- section: Build It: Setup -->

A: Okay, so here's what you actually build. Budget an evening for the server, an evening for the harness, and then one overnight run. It all goes in one project folder you'll keep for the whole track. The naive server, which is today's "before" picture. The benchmark script, which every later lesson reuses. The scoreboard script. Two prompt files, short and long. A results folder with one JSON file per run, committed to git. And a scoreboard file that gets one row per change. Forever.

B: [amused] Forever is a strong word.

A: Every lesson in this track ends by adding a row to it. So, yeah.

A: First, getting PyTorch onto the Spark, which is its own little trap. The Spark is an ARM sixty-four CPU with a Blackwell GPU, the G B ten. A plain pip install of torch might hand you a build that wasn't made for that combination, and you'll lose an evening finding out. So follow NVIDIA's DGX Spark docs for the current way to do it. At the time the lesson was written, that means one of NVIDIA's NGC PyTorch containers. You run it with GPU access, you mount your project folder and your Hugging Face cache into it, and you expose port eight thousand. Inside, you pip install transformers, FastAPI, uvicorn and H T T P X. And then a one-line Python check that prints the torch version and whether it can see the GPU.

B: And if pip decides to upgrade torch while it's in there?

A: Stop it. You want the torch the container shipped with. And one more thing. Llama three point one is gated on Hugging Face, so you accept the license on the model page and log in with the Hugging Face command line tool. Then you download the weights once, and because the cache is mounted from outside, they survive container restarts.

<!-- section: Build It: The naive server -->

A: [relaxed] Now the server. One file. It loads the model once, in B F sixteen, on the GPU. It accepts OpenAI-shaped chat requests at that chat completions path. And it streams events in the format we just talked about. Ending with a usage event and the DONE line.

A: Most of it is boilerplate you just take. There's a little request model that says what the body can contain. Model name, messages, max tokens defaulting to two fifty-six, temperature defaulting to zero, streaming on, and the ignore E O S flag, off by default. A helper that turns a dictionary into one "data" line plus the blank line. A helper that builds one chunk object in OpenAI's shape. A health endpoint that just says "okay". And then one line, near the top, that creates a lock. With a comment on it that says, this is the naive part, every later lesson attacks this line.

B: [laughs] So the whole lesson is that one lock.

A: Kind of, yeah. And then the endpoint is yours to write. It builds a request ID, then defines a plain generator function. Not async. A plain one, on purpose. Inside it, holding the lock, five steps. Turn the messages into token IDs using the model's chat template, and put them on the GPU. Make a text streamer that skips the prompt and skips special tokens. Start the model's generate call in a background thread. Greedy decoding, max new tokens, and min new tokens set to the same thing when ignore E O S is on. Then yield the role event, and one event for every piece of text the streamer hands you. And finally, join the thread, count how many tokens were generated, and yield the final event with the finish reason and usage, and then DONE. The endpoint returns that generator wrapped in a streaming response, with the event-stream content type.

B: Wait, why a background thread? Why not just call generate and stream from it?

A: Because generate is one long blocking call. It doesn't return until the very last token. The streamer is basically a queue. Generate pushes text into it as it goes. So something else has to pull text out of that queue and write it to the socket, while generate is still running. That's two jobs at the same time. So, two threads. The generate thread does the GPU work. The response thread mostly sleeps on the queue, waiting for the next word. And you know from the threads lesson that threads are totally fine when one side is mostly waiting. Waiting threads let go of the GIL. And this is that case.

B: [a bit unsure] Okay, but then why a sync generator? I'd have made the whole endpoint async. Async is the fast one, right? That was the whole lesson before last.

A: [jumping in] So that's the trap. Async isn't "the fast one". Async is one thread running an event loop, and it only works if nothing on that thread ever blocks. Pulling the next word out of the streamer blocks. It sleeps until the word is ready. So if you did that inside an async function, you'd freeze the event loop. And you know what that means. No other request gets a word in. Not even the health check. Whereas if you hand the streaming response a plain generator, Starlette, which is the layer under FastAPI, runs it in a worker thread for you. So blocking in there is safe.

B: So the sync version is the one that doesn't stall.

A: Here, yeah. Blocking code goes in a thread, not on the loop. And why the lock? Without it, two requests would run two generate calls on the GPU at the same time, and they'd fight over memory bandwidth in ways that are really hard to reason about. With the lock, requests queue. And that queue is the "before" picture. It's supposed to look bad at sixteen users.

A: [briskly] A few hints for writing it. The tokenizer has an apply chat template method, and if you ask it to add the generation prompt and return a dictionary of PyTorch tensors, you get inputs you can move to the GPU and pass straight into generate. Wrap the generate call in torch's inference mode. And the output IDs from generate include the prompt, so the completion token count is the output length minus the prompt length. If any of the streaming API has moved, the transformers docs are where to check.

A: Then you run it with uvicorn on port eight thousand, listening on all interfaces, and test it with curl, with the dash N flag so curl doesn't buffer. You should see one "data" line per word, scrolling by. Not one big blob at the end. And the last events should carry the usage and the DONE.

<!-- section: Build It: The harness -->

A: [settling in] Next, the harness. You start from the async load generator you already wrote, the one with async I O and H T T P X. You're adding streaming, per-token timing, percentiles, and a results file.

A: Two helpers are pure plumbing, and you just take them. One reads the event stream line by line. It skips anything that doesn't start with "data". So the blank separator lines, keep-alive comments, and lines that name an event type. It stops when it sees DONE, and everything else it parses as JSON and hands back. The other computes a percentile. It sorts the values and interpolates linearly between the two nearest ones. Same as NumPy's default. That's where that "eighty-one percent of the way toward the slowest" came from.

A: The measuring part is yours. One function streams a single request and returns a record. Whether it worked, time to first token, end-to-end time, how many output tokens, decode speed, how many events it got, the biggest gap, and the error if there was one. And the rule is it never raises. A failure is just a record that says it failed. If the status isn't two hundred, you record the status and the start of the body. Otherwise, for each event, you grab the usage if it's there. And for every piece of non-empty text, you stamp the first time once, the last time every time, and the gap since the previous one.

B: And decode speed is the N minus one over the window thing.

A: N minus one, over last minus first, with N from usage. Then a second function runs one concurrency level. It warms up, then pushes n requests through c closed-loop workers that all share one H T T P X client. And it returns all the records plus a summary. How many requests, how many succeeded, total wall time, throughput, which is the total output tokens of the successful requests divided by wall time, and p fifty, p ninety and p ninety-nine of time to first token, end-to-end time and decode speed. Then a main function with command-line arguments loops over the concurrency levels and writes one JSON file per run into the results folder.

A: And that file starts with metadata. Which target. The base URL. The model. The precision. What changed. The git commit. The date. Max tokens, whether ignore E O S was on, which prompt file, how many requests, how many warm-up requests, and where the client ran. That's what makes a number mean something six months from now.

B: [skeptical] Six months from now I'll have forgotten what "baseline" even meant.

A: Which is why it's in the file. And now a handful of hints, and each one's a real bug you'd otherwise hit. H T T P X has a default timeout of five seconds. A request that's queued behind fifteen others on your server waits minutes before it sees a single byte. So you set the read timeout to none, give connect and write about ten seconds, and turn off the pool timeout. And make the connection pool at least as big as c.

A: Second. All the workers, they share one iterator of request numbers, and each worker just loops over it. So the total comes out to exactly n, no matter how the work gets divided.

A: Third, the API key. It comes from an environment variable whose name you pass on the command line. Never from the code. The harness reads that variable and puts it in an authorization header as a bearer token. And add your dot env file to git ignore before you create it.

A: Fourth, grab the short git commit hash when the run starts, and commit before every run. That way the hash in the results file points at the code that actually produced those numbers.

A: [warmly] And fifth, my favorite. Test the harness against a fake before you trust it on anything real. A twenty-line FastAPI app that sleeps fifty milliseconds, then streams fake tokens every ten milliseconds, sometimes two or three in one event, all behind an async lock so it serves one at a time.

B: Oh, because I already know what the answers should be.

A: Right. Time to first token about sixty milliseconds with one user. Above that, about c minus one times the service time. And flat throughput. If your harness can't reproduce numbers you already know, you can't trust it on numbers you don't.

<!-- section: Build It: Prompts, scoreboard, the overnight run -->

A: [briskly] Then the prompts. Two files, one JSON object per line, each with a list of messages. The short file has fifty varied chat prompts of a sentence or two. Questions, small writing tasks, code questions. The long file has twenty prompts of about two thousand tokens each. You paste in a long public-domain passage and ask a question about it. Those are for measuring prefill. An agent can write both files for you. Just check the lengths with the tokenizer.

A: The scoreboard script reads one results file and prints a line for every concurrency level. Successful requests, time to first token at p fifty, p ninety, p ninety-nine, tokens per second, end-to-end time, throughput. And if fewer than a hundred requests succeeded, it prints "n under a hundred" where the p ninety-nine would go. Then it prints the one row to paste into the scoreboard. The date, the target, what changed, first-token p fifty and p ninety-nine with one user, tokens per second with one user, throughput with sixteen users, and a notes column with the precision, n, and the commit.

A: And the scoreboard file says what it's measuring right at the top. Llama three point one eight B Instruct, short prompts, two hundred fifty-six output tokens, ignore E O S on. It starts with two rows. Fireworks, as the reference. And your Spark, the baseline. Hugging Face generate, one at a time, B F sixteen.

A: Then the run. Commit first. Your Fireworks key goes in your shell, or in that untracked dot env file, never in anything you commit. The Spark run is short prompts, one, four and sixteen users, two hundred requests at each, two hundred fifty-six tokens, ignore E O S on. Fireworks is the same, but with sixty-four users added, and a thousand requests per level.

B: [working it out] Two hundred requests at twenty seconds each... that's over an hour per level on the Spark.

A: A bit over an hour per level, and remember the flat throughput, so it's about the same at every level. A few hours total. That's why it's overnight. And if you want sixty-four users on the Spark, use only a hundred twenty-eight requests. Every single one of them waits about twenty minutes. Which makes the point without costing you a day. Then run both once more with the long prompts, max tokens of sixty-four, one user at a time, to measure prefill. And check Fireworks' pricing page before the big run. For an eight B model it's not much money, but you should know what you're spending.

A: So you're done when curl shows text arriving word by word, with usage and DONE at the end. When the harness reproduces the fake server's known answers, including that c minus one staircase. When the results folder has runs for both targets at one, four and sixteen users, and sixty-four for Fireworks, all with full metadata. And when the scoreboard has its first two rows, and nothing anywhere in the repo contains your API key.

<!-- section: Measure -->

A: So then you fill in a table. Each target at each concurrency level. Time to first token at p fifty and p ninety-nine, with n next to it. Tokens per second. End-to-end time. Throughput. And here's roughly what the shape should look like. These are expectations to check, not results. If your numbers disagree, your numbers win.

A: [thinking out loud] Start with the Spark's tokens per second with one user, against your prediction. Your ceiling was about seventeen, from the spec-sheet bandwidth. Naive generate usually lands noticeably below it. Often somewhere between half and nine tenths of the ceiling. Write down measured divided by predicted.

B: [a bit unsure] So if I get, like, thirteen, that means the real memory bandwidth is lower than the spec sheet says?

A: That's the natural guess, but no. The missing part isn't memory. It's Python running the decode loop. For every token, it launches hundreds of small GPU kernels. A kernel is just a small program that runs on the GPU. Each layer of a forward pass launches several of them, and every launch has a fixed cost on the CPU side of a few microseconds. Doesn't sound like much. But hundreds per token, it adds up. And in between those launches, the GPU sits idle. Little slivers of every step where nobody's reading memory at all.

B: So the pipe's fine, it's just not being kept full.

A: Right. Next, the Spark's time to first token, one user, short prompts. On localhost, something like a hundred to two hundred milliseconds. Because one pass over sixteen gigabytes of weights costs about sixty milliseconds all by itself, before any compute. Then add the prompt's compute and Python overhead.

A: [working it out] Then look at the long prompts. Prefill takes about two operations per parameter per prompt token. So two, times eight billion, times two thousand tokens. That's thirty-two trillion operations. If naive code gets a few tens of trillions of operations per second out of the G B ten, that's somewhere around one second. And you can do that division backward. Take your measured first-token time, divide thirty-two trillion by it, and that's your effective compute rate. That's a number worth knowing.

A: Then the Spark at four and sixteen users. The median first-token time should be close to c minus one, times your one-user end-to-end time. So with four users, about three times twenty seconds, a minute. And the throughput should be flat, at about your single-stream speed. If both of those are true, you've just measured Little's Law. At sixteen users, that's several minutes to the first token. And the batching lesson exists to delete that number.

A: Now Fireworks, one user. The first-token time is mostly your internet round trip plus their front door. Expect a few hundred milliseconds. More on a bad connection, or a busy hour. And per-stream tokens per second for an eight B model is typically in the hundreds. Divide that by your Spark's number. That ratio is your "how far behind am I" headline.

B: And with more users they just... stay the same?

A: First-token time and tokens per second should barely move at sixteen or sixty-four. And throughput should grow almost in proportion to the number of users. Until you hit your account's rate limit. If you see four twenty-nines at sixty-four, that's their limit on you, not their GPUs running out. Record it.

A: [amused] And the last one's kind of fun. The crossover. Find the prompt length where Fireworks starts winning the first token, even with one user. That's the point where their faster prefill pays for the round trip.

<!-- section: Measure: Where the gap comes from -->

A: And every gap on that scoreboard has a cause, and every cause has a lesson. This is basically the map for the next few months. Picture three columns. What you see in your results, why it happens, and the lesson that attacks it.

A: Tokens per second below your seventeen-token line. That's the Python loop, the kernel launches, operations that aren't fused together. The serving-engines lesson and the FlashAttention lesson go after that. Then the seventeen-token line itself. That's there because you read sixteen gigabytes per token in B F sixteen. Quantization moves that line. One token per pass over the weights, because nothing's checking several guesses at once. That's speculative decoding.

B: And the flat throughput is batching.

A: The flat throughput is batching. One request per pass over the weights. And the first-token p ninety-nine blowing up at sixteen users, because every request waits for all the ones before it, that's continuous batching. Then two that won't really show up yet on short prompts. If every request starts with the same long system prompt, you pay full prefill for it every single time, because the same prefix gets recomputed. That's prefix caching. And how many users fit, at what context length, which depends on the KV cache growing with every token. That's the KV cache lesson and the memory math lesson.

A: And at some point you'll also benchmark V L L M and S G Lang on the Spark. They already do most of that list. So why build the naive one first? Because when you read their code, you'll know exactly which problem each piece is solving. Because you measured that problem yourself.

B: [working it out] Okay, so, practical question. Is it actually cheaper to just run this myself? The Spark's already paid for.

A: You can work it out, and the method is what matters. The Spark's cost per hour is its purchase price divided by how many hours you expect to use it over its life, plus its power draw in kilowatts times your electricity price. Then tokens per hour is your measured aggregate throughput, times thirty-six hundred seconds, times the fraction of the time it's actually busy. And cost per million tokens is cost per hour divided by tokens per hour, times a million.

B: [working it out] So at thirteen tokens a second...

A: At thirteen a second, a million tokens is about seventy-seven thousand seconds. Roughly twenty-one hours of the machine. So whatever an hour of Spark costs you, multiply it by twenty-one. Then compare that to the provider's published price per million output tokens. Input tokens are priced separately, and they're cheaper, because prefill chews through them in bulk. And then redo the math with the batched server's throughput. The hours per million shrink by roughly however much the throughput went up.

B: So batching is literally the margin.

A: That's the economics the inference companies run. And it's why batching is their business.

<!-- section: Break It -->

A: Then you break it, on purpose. Four ways. First one. Leave H T T P X's default timeout. Run sixteen users against your server with a plain client, no timeout settings.

B: Then the requests at the back of the line time out, because they don't get anything for minutes.

A: They fail with a read timeout. And here's the nasty part. If your harness quietly drops errors, your p ninety-nine suddenly looks great.

B: [surprised] Oh. Because the slowest requests just... vanished from the data.

A: They vanished. So a timeout is really a decision about which requests you're willing to not measure. Make that decision on purpose, and count the failures.

A: [mischievous] Second. Call generate on the event loop. Make the endpoint async, call generate with the streamer right there, and loop over the streamer in the same function. And watch two things. A curl to the health endpoint hangs, the whole time a generation is running. And your harness sees time to first token roughly equal to the end-to-end time.

B: Because nothing gets flushed out until the loop gets control back. Which is at the end.

A: Right. It's the stall from the async lesson again. Just at GPU scale now.

A: Third. Count events as tokens. Have the harness compute tokens per second from the number of events instead of the usage count. With the Hugging Face streamer sending word-sized events, your speed reads noticeably low, because lots of words are more than one token. And against an API that sometimes bundles tokens, the error shifts around depending on load. You've got both numbers in your records, the event count and the real token count, so you can see how far off you'd have been.

A: And fourth. Hang up halfway. Start a long request, max tokens a thousand twenty-four, and kill the client after a second. Then check the server logs and the GPU's utilization.

B: [a bit unsure] I'd guess the server notices the connection closed and stops?

A: Nothing in the naive server tells the generate thread that nobody's listening anymore. So the GPU just keeps producing an answer nobody's going to read. And depending on how Starlette closes the generator, the lock might get released while it's still going. So the next request starts running alongside a ghost.

B: [laughs] A ghost generation.

A: Eating your bandwidth. Real servers watch for disconnects and abort the request. Write it down as a bug. You'll fix it when you rewrite the server for batching.

<!-- section: Connections and close -->

A: So this one closes out the opening chapter. It used the latency numbers for the network part, threads for the streamer, the load generator and Little's Law from the async lesson, and your seventeen from last time. And everything after it in the inference track is a row on that scoreboard. Memory math and the KV cache come next, then batching, where the sixteen-user row finally stops being embarrassing. And if you want one thing to read alongside it, Databricks' post, "LLM Inference Performance Engineering: Best Practices", defines these metrics the way the industry uses them. And Anyscale's post on continuous batching is the clearest picture of why one-at-a-time serving is so wasteful.

B: [working it out] Okay, let me try the whole thing. "Fast" is really two different things. The first token is network plus waiting in line plus prefill, so close and idle wins it. Everything after that is decode, which is memory bandwidth, so Fireworks wins on per-token speed because their GPUs are just way faster. And once more people show up, mine falls apart because it can only do one at a time.

A: [gently] Mostly. Two pieces. They're faster per token not just because of the hardware. It's more bandwidth, sure, but also fewer bits per weight, more than one token per read, and compiled kernels instead of a Python loop. And the many-users part isn't about speed at all. On your server, every pass over the weights serves one person, so more users just means a longer line. Throughput flat, waiting growing with every user. On theirs, every pass serves a whole batch, so the extra users ride along almost for free. The difference isn't how fast the hardware is. It's whether one read of the weights serves one user, or many.
