<!-- section: The Problem -->

A: [relaxed, thinking out loud] Picture the little FastAPI service you've got at work, the one that sits in front of an LLM. Someone sends a question, your server calls the model API, waits about two seconds for the answer, and passes it back. On your laptop it feels fine. Then a teammate points a script at it, fifty requests all at once. And the dashboard shows something weird. The first person waits two seconds. The tenth waits twenty. The fiftieth waits about a hundred. And the CPU is flat, basically zero. Nothing errored.

B: So the machine's doing nothing, and nobody's getting answers.

A: That's the whole puzzle. What would you have said was going on?

B: [a bit unsure] Honestly, I'd have said, if a request takes two seconds and a hundred come in, the last one takes like two hundred seconds. And the server probably crashes. So you'd use something like async, which is, I don't know, a queue or something.

A: The first half is right, and it's worth saying why. With one worker, request number one hundred waits behind ninety nine others. So yeah, about two hundred seconds. That's the whole problem in one sentence. But two pieces of the rest are the wrong picture, and they change what you'd actually do.

B: Which two?

A: First, it usually doesn't crash. The requests aren't dropped, they're parked. The operating system holds incoming connections in a waiting line until your server's ready to pick one up. So what you see isn't an error page. It's waiting time that grows in a straight line. And second, async isn't a queue. There was already a queue. That's the problem.

B: Huh. Okay, so what is it then?

<!-- section: Two chefs -->

A: Picture a kitchen with one chef and a pizza oven. Each pizza takes a little while to put together, and then a long time in the oven.

A: The first chef makes a pizza, puts it in the oven, and stands there watching it. The whole time. Then he serves it and starts the next order. Ten orders, and the tenth customer waits ages. And he was never lazy. He was never confused. He just spent almost his whole shift standing in front of an oven.

B: [amused] I've worked with that guy.

A: The second chef makes a pizza, puts it in the oven, and immediately starts the next one. When the timer dings, she pulls that pizza out, serves it, and goes back to whatever she was making. Ten orders take a fraction of the time. Same chef, same oven, same skill. She didn't work faster. She just stopped waiting in front of things.

B: And there's the obvious third option. Hire ten chefs.

A: Right, and that works too. That's threads, each one standing at its own oven. It's just expensive in chefs. And it stops scaling when you've got ten thousand orders. And notice, in both kitchens, the orders still wait on the ticket rail. Both kitchens have a queue. The difference is entirely what the chef does while an oven's running.

<!-- section: The first chef, in machine terms -->

B: So what's my server doing, in those terms?

A: When your handler calls requests dot get, deep down Python asks the operating system to read the reply off a network connection. A socket. And if the reply isn't there yet, that call blocks. The system takes your thread off the processor and marks it asleep until bytes show up. The sleeping thread costs no CPU. But it can't do anything else either. And if your server has one worker thread, your server can't do anything else.

B: And meanwhile the other forty nine requests are...

A: Before your code ever sees them, the operating system finishes setting up each connection and puts it in a line for that server. It's called the listen backlog. When your worker finishes, it takes the next one off the line. So the two hundred seconds is real, and the server isn't crashing. It's one cashier with a very long line.

B: [working it out] Which is why the CPU's flat. The one worker's asleep, and everyone else is in the line.

A: Right. Almost nothing is happening. Two seconds is billions of clock ticks for the processor, and it's spending all of them asleep.

<!-- section: Ten thousand clients -->

A: [warm] This exact problem has a famous name. In nineteen ninety-nine, a programmer named Dan Kegel put up a web page with a pretty blunt question. Machines now have the hardware to handle ten thousand clients at once. So why can't web servers? He called it the C ten K problem.

B: Ten thousand connections.

A: Right. And the common design then gave every connection its own process or thread. And at ten thousand, the machines drowned. Memory for ten thousand stacks, and the operating system spending all its time switching between threads that mostly had nothing to do. His page surveyed the alternative. One thread, lots of connections, and you ask the operating system, which of these has data for me right now? The good ways of asking that arrived over the next few years, called kqueue and epoll. And then the servers built on them. Nginx. Node. And eventually Python's asyncio. All of it really comes out of that one page.

<!-- section: The second chef, in machine terms -->

B: So how does one thread juggle a pile of connections?

A: Two changes. First, you tell the connections to stop putting you to sleep. Non-blocking mode. Now if you ask to read and there's nothing there yet, you get "nothing yet" back immediately, instead of a nap.

B: But then I'd just be spinning, asking every connection over and over.

A: Which would burn a whole core doing nothing. So the second change is the thing the C ten K page was about. You hand the operating system a list of all the connections you care about and say, put me to sleep until at least one of these is ready, then tell me which one. On Linux that's epoll, on your Mac it's kqueue. Python wraps them both, so the same code runs on your Mac and the Spark.

A: And with those two pieces, the second chef's routine is a loop. Run every task that's ready, each one until it would have to wait. When a task would wait on a connection, write down which connection it's waiting on, and move on. When nothing's ready, ask the operating system to sleep until any of those connections, or any timer, is ready. It wakes you up and says, that one's ready. Mark that task ready. Go around again.

B: And that's the event loop.

A: That's the event loop. And notice, it never runs two things at the same instant. It's one thread. It just never sits idle when there's something it could be doing. Remember the difference between concurrency and parallelism? Several things in progress, versus several things literally running at once? This is concurrency with zero parallelism. In its purest form.

<!-- section: Pausing a function halfway -->

B: [skeptical] There's a piece missing for me, though. "Move on" means the task stops in the middle of my function. A normal function can't just stop halfway and come back later.

A: Right, normally a function runs to the end, and its frame, its little block of local variables on the stack, is gone. But Python's had pausable functions for a long time. Generators, the ones with yield. A generator's frame lives on the heap, not on the stack, so it can be frozen, local variables and all, and thawed later right where it left off.

B: And async def is that.

A: It's the same machine with nicer syntax. Async def makes a pausable function. And await means, if this thing isn't done yet, pause me here and pass a note up to whoever's running me. That's the event loop. The note says what you're waiting for. The loop files you next to that connection or timer, and runs someone else.

B: So await doesn't mean "wait".

A: It means "I'm willing to be paused here". And that's a big deal. The code between two awaits runs without interruption. Nobody can take the processor away from you in the middle. Which is async's great simplification, because you get far fewer race conditions than with threads. And it's also its great trap, which we'll get to.

A: When I built a toy version of this, it was a few dozen lines. A list of ready tasks, a pile of timers, and one call to the operating system that says "wake me when something's ready". And it ran real async functions, fifty fake LLM calls on one thread in about the time of one. After that, await stopped feeling like magic.

<!-- section: How many at once -->

B: Okay, but threads also work, right? You said ten chefs works.

A: Threads absolutely work, and people undersell them. There's a nice rule for thinking about this, from the study of waiting lines, called Little's law. The number of requests you have open at once equals how fast they're arriving, times how long each one sticks around. So if lots arrive every second and each one waits two seconds on the model, you'll always have twice that many open at any moment. That's not a choice. If your server can't hold that many at once, it can't keep up, and the line grows.

B: And if that number's a couple of hundred?

A: Then threads are genuinely fine. When I ran a sync server with a couple of hundred threads against a couple of hundred simultaneous calls, everybody got their answer in a little over two seconds. Don't let anyone tell you threads can't wait.

B: So where do they break?

A: The next zero. An agent product where every request makes several model calls, some streaming for half a minute, at a few hundred requests a second. Now you need thousands to tens of thousands open at once. And then what each waiter costs decides everything. Each thread needs its own stack, the operating system has to track it, schedule it, switch into it every time its connection wakes up. On my Mac, an idle async task cost about forty times less memory than an idle thread. And macOS won't even let one process have more than about twelve thousand threads.

B: [working it out] So it's not that async waits better. It's that each waiter is way cheaper.

A: Each waiter is a small object instead of a whole thread. That's the trade.

<!-- section: What still limits you -->

B: Then what stops one async process?

A: The other thing. Working. Waiting's now nearly free, but each request still needs a bit of real processor time on that one thread. Reading the HTTP, building the upstream call, decoding the JSON, the framework's own bookkeeping. Add enough requests, and the loop is just always busy. Then waiting time climbs again, and you've turned a waiting problem into a working problem. The fix is the boring one. Run a few processes, each with its own loop.

A: And that bit me in a funny way. I wrote a load tester, also async, to hammer my server. And at a couple of hundred requests in flight, the latency came out more than double what it should've been. The server was fine. My load tester was the one maxed out. Its connection pool was spending all its time on bookkeeping.

B: [laughs] So I'd have been benchmarking the benchmark.

A: You would. Always check your load generator's CPU before you believe the number.

<!-- section: Never block the loop -->

A: Okay, the trap. Async has one rule. Never block the loop. Every task shares one thread. So anything that holds that thread without reaching an await freezes every other request in the process. All at once.

B: Like what?

A: Calling time dot sleep instead of awaiting asyncio's sleep. Calling requests dot get inside an async function, which is a blocking read on the loop's own thread. A sync database driver. Or just heavy CPU work. Tokenizing a giant document, running your reranker on the CPU, parsing a huge JSON blob. It's not waiting, but it holds the thread just the same.

B: And that's worse than the sync server?

A: It's worse. A sync server with one slow request has one slow request. An async server with one bad line has every request slow, because they're all sharing the one thread that's stuck. I planted a two-second sleep in an async endpoint and sent ten requests at once. Every single one took over twenty seconds. Even the luckiest one waited for everybody else's sleep. Your typical request becomes your worst request.

B: How do you even spot that?

A: Asyncio has a debug mode, and it logs a warning whenever one step holds the loop too long, with the task's name. And in production the tell is that unrelated requests all get slow together. Then you fix it one of three ways. Use an async library for the waiting, like httpx's async client instead of requests. If there's a blocking call you can't replace, push it off to a thread, which is fine, because a sleeping thread lets go of the GIL. And heavy CPU work goes to another process, because threads won't help there.

<!-- section: The FastAPI surprise -->

B: [skeptical] Wait, so this is actually something I've seen. Someone moved an endpoint from def to async def to make it faster, and it got slower.

A: That's the FastAPI detail that surprises everyone. If you write an endpoint as plain def, FastAPI assumes it might block, and quietly runs it in a thread pool for you. About forty threads. So a def endpoint calling requests behaves like a forty-thread server. Fine at forty in flight, then a staircase. But switch it to async def without changing what's inside, and now that blocking call runs on the loop itself. No thread pool. Every call freezes the whole process.

B: So async def is a promise. Everything slow in here gets awaited.

A: That's a good way to say it. Async def only if everything slow inside is awaited. Otherwise, plain def, and let the pool handle it.

<!-- section: Async spreads -->

A: And there's a real cost to all this. Only an async function can await. So once something deep in your code becomes async, say the function that calls the LLM, everything that calls it has to become async too, and their callers, all the way up. Bob Nystrom wrote a famous essay about this, called What Color is Your Function. Async spreads up the call chain.

B: So I can't just sprinkle it in.

A: Not really. The practical rule is decide at the edges. A web server, a load tester, an agent orchestrator, async from the top. A training script or a data prep job, plain sync, with one spot where you fan out the network calls.

A: And fanning out is the other big win, even for one request. Say your agent makes three model calls one after another. Two seconds each, so you wait for all three, back to back. If they don't depend on each other, start all three and wait for all of them together. Now you wait about as long as the slowest one. The sum of the waits becomes the max of the waits.

B: And then I accidentally fire off a thousand at once.

A: [amused] Which you will, because now it's one line. And the API you're calling will rate limit you. So you put a cap on how many are in flight, a semaphore, and when the cap's full, new work waits its turn. That's backpressure, at its simplest.

B: Okay, but I want partial credit on the crash thing.

A: You get some. That line the operating system keeps for incoming connections has a maximum length. When I fired a thousand connections at my async server at once on the Mac, a chunk of them got turned away. "Connection failed". The server never crashed. The line was full, so the door was shut. So yes, a server under enough load does start failing. It's just at the door, not inside.

<!-- section: Ending -->

B: Let me say it back. Most of my code isn't working, it's waiting on the network. A sync server with one worker stands at the oven for every request, so everyone else waits in line, and the line just grows. Async keeps one worker, but whenever a request is waiting, it parks it, does something else, and comes back when the operating system says the answer's there. So the waits overlap instead of adding up. So async makes the server faster.

A: All of that, and then one thing to sharpen. Async doesn't make anything faster. It makes waiting cheap. The actual work still adds up, one task at a time, on one thread. So it's a huge win when you're waiting on a model two seconds at a time, and no help at all when the work is the slow part. And it comes with one rule you can't break. One blocking line, and everyone waits.
