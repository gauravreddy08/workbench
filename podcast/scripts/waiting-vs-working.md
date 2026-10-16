<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture a little FastAPI service at work. It sits in front of an LLM. A user sends a question, your server calls the model API, waits, what, about two seconds for the answer, and hands it back. On your laptop it feels fine. Totally fine. Then a teammate points a script at it that sends fifty requests all at once... and the dashboard shows something weird. The first user waits two seconds. The tenth waits twenty. The fiftieth waits a hundred seconds. And the CPU? Flat. About one percent. Nothing errored. The machine's doing almost nothing, and nobody's getting answers.

B: [a bit unsure] Okay, my honest first reaction... each request is two seconds, so if a hundred people hit it, the last one waits something like two hundred seconds. And somewhere along the way the server probably just falls over. And the fix is async, which is, I mean, some kind of queue? You put the requests in a queue.

A: So the first half of that is right. Like, actually right, and it's worth saying why. With one worker, request number one hundred waits behind ninety-nine others, and each of those takes two seconds. So, about two hundred seconds. That's the whole problem in one sentence. And the median person, request fifty or so, waits about a hundred.

B: And the other half?

A: The other two pieces are the wrong picture. And they matter, because they change what you'd actually do. First, it usually doesn't crash. The requests aren't dropped, they're parked. The operating system holds incoming connections in a waiting line until your server's ready to pick them up, and they get served one by one. So what you see isn't an error page. It's latency that grows in a straight line. It only starts failing if that line fills up and new connections get turned away, or if clients get tired and time out before their turn comes. We'll actually make the first one happen later. But, you know, neither of those is a crash.

B: Okay. And the queue part?

A: [jumping in] No, so, async is not a queue. There was already a queue. That's the problem. Fifty people standing in line, that's the queue. Async is a way for the one worker to stop standing around while a request waits. When a request's waiting on the network, the worker sets it aside, starts on the next one, and comes back to the first when its answer shows up.

B: [working it out] So the line still exists either way. It's just... the person at the front isn't holding everyone up anymore.

A: Close enough for now. The rest of this is turning that into a mechanism. Something you could build, and measure, and actually reason about.

<!-- section: Origin -->

A: And this exact problem has a birthday. Nineteen ninety-nine. A programmer named Dan Kegel wrote a web page with a really blunt question in it. Web servers now had the hardware to handle ten thousand clients at once. So why couldn't they? Well, it's because the common design back then gave each connection its own process, or its own thread. One connection, one worker. And at ten thousand connections the machines just drowned. You needed memory for ten thousand stacks, and the operating system spent its time switching between threads that... almost all of them, had nothing to do. They were all waiting.

B: So the hardware was fine. It was the design.

A: Yeah, it was the design. And his page was called "The C ten K problem". C ten K meaning ten thousand connections. And it surveyed the alternative: one thread, many connections, and you ask the kernel, "okay, which of these sockets has data for me right now?" And the kernel features for asking that question well showed up right around then. K queue on FreeBSD in two thousand, and E poll on Linux in two thousand two. Hold on to those two names, they'll come back. Then servers built on them followed. Engine X, in two thousand four, served huge numbers of connections from just a handful of worker processes. Node, in two thousand nine, made a single event loop the default way to write a server. And Python got async I O in version three point four, in twenty fourteen, and then the async and await keywords in three point five, the year after.

B: [amused] All from one web page.

A: All of it, yeah, descended from that one question on that one page. Everything we're about to talk about is basically an answer to it.

<!-- section: The Idea: Waiting vs working -->

A: So here's the distinction the whole thing hangs on. Every piece of code spends its time doing one of two things. Working, where the CPU's busy running your instructions. Tokenizing text, multiplying matrices, parsing JSON. Or waiting, where the CPU has nothing to do because the answer has to come from somewhere slow. A disk, the network, a GPU, another server. Code that mostly works, we call that CPU-bound. Its speed is limited by how fast the processor can run it, so a faster CPU, or more cores in parallel, makes it faster. Code that mostly waits is I-O-bound. I-O meaning input and output. Its speed is limited by waiting on the network, or the disk, or some other service, and a faster CPU changes almost nothing. It'd just... wait faster. And you've actually seen this split already, with threads. They did nothing for the hashing job, which was working. And they were magic for the page-fetching job, which was waiting.

B: And an LLM call is the waiting kind.

A: Oh, it's about as waiting-heavy as code gets. Picture one call drawn to scale, like a long bar, two seconds wide. At the very left edge there's a hairline. That's your server building the request and sending it. About a tenth of a millisecond. At the very right edge, another hairline, where it parses the JSON that came back and replies. About half a millisecond. And everything in between, about two thousand milliseconds, is waiting. On the network, and on someone else's GPU.

B: So as a percentage that's basically all of it.

A: About ninety-nine point nine seven percent waiting. And, I mean, those work numbers are rough. They depend on how big the payload is and what framework you're using. But the shape doesn't move. Even if your handler did five whole milliseconds of real work, it'd still be waiting ninety-nine point seven five percent of the time. Now put that in cycles, because a network round trip is millions of CPU cycles. A two-second wait is, what, about six billion cycles of a three gigahertz core. So the question this whole episode answers is: what does the worker do during those six billion cycles?

<!-- section: The Idea: Two chefs -->

A: One comparison, just to make that question concrete. A kitchen. One chef, one oven. Each pizza takes thirty seconds to assemble and ten minutes to bake. The first chef assembles a pizza, puts it in the oven, and then he just... stands there. Watching it. For ten minutes. Then he serves it and starts the next order. So ten orders take a hundred minutes. Order number ten waits an hour and a half. And he was never lazy, never confused. He just did nothing for ninety-five percent of his shift. The second chef assembles a pizza, puts it in, and right away starts the next one. When the oven timer goes off, she pulls that one out, serves it, and goes back to whatever she was assembling. Ten orders take about fifteen minutes. Same chef, same oven, same skill. She didn't work faster. She just stopped waiting in front of things.

B: [amused] Or you hire ten chefs.

A: [laughs] Yeah, that's the third option, and it works. Ten chefs, each standing at their own oven. That's what threads are. It's just expensive in chefs, and it stops scaling when you've got ten thousand orders. And notice what the second chef is not. She isn't a queue. Orders still wait on the ticket rail in both kitchens. The difference is entirely in what the chef does while an oven's running.

<!-- section: The Idea: The first chef in machine terms -->

A: Okay. So what's the first chef actually doing, inside the machine? When your handler calls requests dot get, deep down Python asks a socket for the reply. And a socket is just the operating system's handle for one network connection. Your program reads and writes bytes through it, and the kernel does the actual networking. The specific call is spelled R E C V, short for receive, so I'll just call it receive. If the reply hasn't arrived yet, that call blocks. Blocking means the call doesn't come back until its answer is ready. The kernel takes your thread off the CPU and marks it asleep until bytes show up on that socket. And a sleeping thread costs no CPU at all.

B: Oh. So that's the flat one percent on the dashboard.

A: That's the one percent. The thread isn't burning anything. But it also can't do anything else. And if your server has one worker thread, well, your server can't do anything else.

B: [skeptical] Then where are the other forty-nine requests while that's happening? Something has to be holding them.

A: The kernel is. So before your code ever sees a connection, the kernel's already done the TCP handshake, that little back-and-forth that sets the connection up, and it puts the finished connection in a line called the listen backlog. It's a queue the kernel keeps for each listening socket. Connections that are fully set up, but your program hasn't picked up yet. Its maximum length gets set when your server starts, and the operating system caps it. And when your worker finishes a request, it calls accept, and that takes the next connection off the front of the line. So the two hundred seconds is real, and the server isn't crashing. It's, like, a single cashier with a very long line.

B: [amused] A cashier who's on hold the whole time.

A: [laughs] On hold the whole time, yeah. And if you sketched it, it'd go left to right. Clients on the far left. Then the kernel's line, a row of connections just sitting there. And the thing to notice is they're waiting, not failed. Nothing's lost until that row is full, and only then do new connections get dropped or refused. Then accept pulls one into a single box, the worker, and the worker's stuck in that receive call. Off to the right is the LLM, two seconds away. The CPU under all of this is about zero. And request N finishes at about N times two seconds. So latency's a straight line.

<!-- section: The Idea: Predict, one worker vs eight threads -->

A: Try this one. One sync worker, upstream calls that take two seconds, and fifty requests arrive at the same moment. What's the median latency, the worst latency, and how long until all fifty are done?

B: They go one at a time, so they finish at two, four, six, all the way up to a hundred. Worst is a hundred seconds, total's a hundred seconds, median's... about fifty.

A: Right. And the throughput's a flat half a request per second, no matter how many arrive. Now give it eight threads.

B: [working it out] Eight at a time... so fifty divided by eight, call it seven rounds, fourteen seconds total. Median would be, I don't know, seven?

A: Close. But walk it in waves. Eight go at once and finish at two seconds. The next eight finish at four. Then six, then eight. Fifty divided by eight, rounded up, is seven waves, so yeah, the last one's done at about fourteen. But the median is the twenty-fifth request, and the twenty-fifth request is in the fourth wave. So it finishes at about eight seconds, not seven. Throughput's eight divided by two, four requests a second. More threads just means more waves happening at once.

B: Eight, not seven. Okay, I skipped the waves.

A: Now picture that as a chart, because honestly the picture is the whole point. Each request is a horizontal row, time runs left to right, and they all arrive at time zero. A dashed line means standing in line. A blue box means in progress, waiting on the upstream. A solid black box means a blocking call that's holding the worker. And you run it three ways, and play with how many requests there are, how long the upstream takes, and how many threads you get. In sync mode you get a staircase. Every row starts where the one above it ended. Total time is the number of requests times the request time. Throughput's fixed at one over the request time, and it doesn't care how many people are waiting. Switch to threads and the staircase gets wider steps. With K threads you serve K at once, so throughput is K over the request time. And if K is at least as big as the number of requests, everyone finishes in about one request time. Which is why threads are a perfectly good answer when you're dealing with tens or hundreds of requests. Then switch to async, and every row is a blue box starting at zero. Everyone overlaps. With one worker. Total time's about one request time no matter how many requests there are.

B: [skeptical] That seems too good.

A: In that model it is that good. The real limits show up when you measure, and we'll get there. But now drop one blocking call into the handler. Say a one-second time dot sleep. In async mode, everything collapses into something worse than the sync server. Every request ends up waiting for every other request's sleep.

B: [surprised] Worse than sync? How is that even possible?

A: Hold that thought. It's the most important trap in async, and it needs a couple more pieces first.

<!-- section: The Idea: The second chef in machine terms -->

A: So. The second chef. For one thread to juggle a bunch of sockets, two things have to change. First, the socket calls have to stop putting the thread to sleep. You switch the socket into non-blocking mode, and now receive and send never wait. If there's nothing to read yet, receive comes right back with an error that means, like, "nothing yet, try again later". In C that's called E again. In Python it shows up as a Blocking I O Error.

B: But then you'd just loop over all your sockets asking each one, anything yet, anything yet?

A: You could. And you'd burn an entire core doing nothing. So that's the second change. You need a way to wait for any one of many sockets without spinning. And that's the operating system feature the C ten K page was about. You hand the kernel a list of the sockets you care about and say, okay, put me to sleep until at least one of these is ready, and then tell me which. Unix has had a basic version of that, called select, since the early nineteen eighties. The scalable modern versions are the two names from the story. E poll on Linux, where you register your sockets once, and every wait hands back only the ones that are ready, so the cost doesn't grow with how many you're watching. And K queue on macOS, which is the BSD equivalent. You register interest in lots of sockets and timers, then wait for whichever goes first. And Python wraps all of them in one module called selectors, so the same code runs on your Mac and on the Spark.

B: So it's one wait. For all of them.

A: One wait, for all of them. Picture it as two halves, side by side. On the left, thread per connection. Thread one, thread two, thread three, each one stuck in receive on its own socket, each one asleep. Every one of those waiters costs a stack and a kernel thread, so ten thousand waiters means ten thousand threads. On the right, a single thread, the event loop, sitting next to a big kernel box with E poll or K queue in it, watching socket one, socket two, socket three, all the way to socket ten thousand. The thread says "wake me when any of these is ready", goes to sleep once, and the kernel comes back with "socket two is ready". And on that side, each waiter is just an entry in a kernel table, plus a small Python object.

B: So the kernel's doing the watching. Not you.

A: The kernel's doing the watching. So with those two pieces, the second chef's routine is a loop. Run every task that's ready, each one until it would have to wait. When a task would wait on a socket, you write down, "this task wants socket seven", and move on. When nothing's ready at all, you ask the kernel to put you to sleep until any of the watched sockets, or a timer, is ready. The kernel wakes you up with "socket seven is ready". You mark that task ready, and go back to the top. That loop is the event loop. A single loop that runs ready tasks one at a time, and when nothing's ready, sleeps until the OS says some socket or timer is. Async I O is built around one. So is Node, so is engine X. It never runs two tasks at the same moment. It just never sits idle while there's something it could be doing.

B: So it's not running things in parallel at all.

A: Not at all. This is concurrency without parallelism, like, in its purest form. Concurrency means making progress on many things during the same stretch of time, by switching between them. Parallelism means literally running at the same instant, on different cores. Async gives you none of the second. It's one thread. Here's what it looks like if you step through it. Five tasks sit around a ring, the loop's in the middle with a clock, and on the right there's a box for the OS showing which tasks are parked and when they'll wake. You go one move at a time. The loop picks task one, runs it for well under a millisecond, it sends its request, hits an await, and gets parked with a wake time. Then task two, same thing. Then three, four, five. Now nothing's ready, so the loop calls select and goes to sleep, and the clock jumps forward to the earliest wake-up. And those five tasks have about two point seven seconds of waiting between them if you ran them one after another. On the ring? They're all done at seven hundred milliseconds. On one thread.

<!-- section: The Idea: Pausing a function halfway -->

B: [a bit unsure] Wait, there's a step in there I don't get. "Move on." The task is in the middle of a function. How do you leave a function in the middle and, like, come back to it later?

A: Yeah, that's the missing piece. Move on means the task has to stop partway through a function, and pick up later exactly where it left off, with all its local variables intact. And normal functions can't do that. They run to the end, and when they return, their stack frame's gone. But Python's had pausable functions since two thousand one. They're called generators. A generator is a function with yield in it. Calling it gives you back an object, and each time you call next or send on that object, the body runs until the next yield and then freezes. Locals and all. Until you resume it. And the reason that works is that a generator's frame, the little record holding its local variables, lives on the heap, not on the C stack. So it can be frozen and thawed whenever you like.

B: Oh. So generators were already doing the pausing part.

A: They were. And a coroutine in modern Python is the same machine, just with nicer syntax. A coroutine's just a function that can pause partway through and be resumed later. async def makes one. Calling it gives you a coroutine object that does nothing at all until something drives it. And await x means, if x isn't done yet, pause me right here and pass a note up to whoever's running me. And that whoever is the event loop. The note says what you're waiting for. The loop files the paused coroutine next to that socket, or that timer, and runs someone else.

B: So await doesn't really mean wait.

A: No. await means "I'm willing to be paused here." And the flip side of that is, code between two awaits runs without interruption. Nobody can take the CPU away from you. And that one property is both async's great simplification and its great trap. Simplification, because you get way fewer race conditions than with threads, since switches only happen where you wrote await. Trap, because if you never reach an await... nobody else runs. And you'll build this machine yourself, actually. Generators, a line of ready tasks, a heap of timers, and one selectors call. About forty lines, and it runs real async def functions.

<!-- section: The Idea: Little's Law -->

A: Now, the tool for every "how does it scale" question about servers. In nineteen sixty-one John Little proved a rule, well, a law really, that holds for any stable system where things arrive, stay a while, and leave. Doesn't matter what the things are. And the rule is: the number in flight equals throughput times latency. Written with letters it's L equals lambda times W, lambda being the Greek letter people use for a rate. So the average number inside equals the rate they arrive, times how long each one stays. And it makes no assumptions about how they arrive. Bursty, smooth, random, doesn't matter. Like, a coffee shop that serves two customers a minute, where each one spends five minutes inside, has about ten customers inside at any moment. Now point it at your service. You want to serve a hundred requests per second. Each one spends two seconds waiting on the LLM. Then on average there are two hundred requests in flight. At every instant.

B: Two hundred is just what falls out? I don't get to pick that?

A: You don't get to pick it. It's arithmetic. If your server can't hold two hundred at once, it can't do a hundred a second. The line grows until something gives. Think of it as a box. On the left, a hundred a second arriving. On the right, a hundred a second leaving. Inside the box, each one stays two seconds, and the box always holds about two hundred. So then the real question is, what does it cost to hold each one? That's where threads and coroutines differ. But, okay, here's something people get wrong. At two hundred in flight, threads are fine. Two hundred threads is a normal day for a Java server or a gunicorn box. When you measure it, a two-hundred-thread Flask server handles two hundred simultaneous two-second calls in about two point three seconds, using about sixty-five megabytes. So don't let anyone tell you threads can't do I-O.

B: Then why does anybody bother with async?

A: Because of the next zero. Picture an agent product where each request makes several LLM calls, some of them streaming for thirty seconds, at a few hundred requests a second. Run that through Little's Law and you need thousands, maybe tens of thousands, in flight. And now the cost per waiter decides everything. Each thread reserves a stack. On Linux that's eight megabytes of address space by default, so ten thousand threads would be—

B: [jumping in, alarmed] Eighty gigabytes? That can't be right.

A: Eighty gigabytes of address space. Reserved, not used. Only the pages a thread actually touches cost real memory, same as with any stack. But the kernel still has to keep each thread, schedule it, and switch the CPU over to it, that's a context switch, every time its socket wakes up. On a Mac, each idle Python thread cost about thirty-eight kilobytes of real memory. Ten thousand of them, about three hundred seventy megabytes. And macOS caps a single process at about twelve thousand threads. Meanwhile each idle async I O task cost about nine tenths of a kilobyte. So ten thousand tasks is around ten megabytes. On one kernel thread. If you drew the two as bars at ten thousand in flight, the thread bar's this fat block and the task bar's a sliver. That's about a forty-times difference in memory. But, I mean, the more important difference is the kind of work. It's the gap between "the operating system juggles ten thousand threads" and "one thread checks a list".

<!-- section: The Idea: What eventually limits one async process -->

B: Okay, so if waiting is nearly free, what's the limit? It can't be infinite.

A: The limit becomes the other thing. Working. Each request still needs some CPU on the loop's one thread. Parsing the HTTP request, building the upstream call, decoding the JSON, the framework's own bookkeeping. Call that C milliseconds per request. One thread can do at most a thousand divided by C requests per second, and it doesn't matter how long each one waits. So if C is one millisecond, the ceiling's about a thousand requests a second. By Little's Law, with two-second calls, that's about two thousand in flight, which is only a few megabytes of tasks. Past that, the loop's busy all the time, ready tasks pile up waiting for their turn on the thread, and latency climbs again. You've turned an I-O-bound server into a CPU-bound one. And honestly, before you ever get there, you'll probably hit plainer walls. The number of open files a process is allowed, because every socket is a file, a file descriptor, and macOS starts you at a limit of two hundred fifty-six. The listen backlog. The connection pool inside your HTTP client. The memory each connection costs. And above all, the rate limit of the API you're calling. Oh, and the fix for that CPU ceiling is the boring one. Run several processes, each with its own loop. uvicorn with four workers behind one port, or several containers behind a load balancer.

<!-- section: The Idea: The traps -->

A: [serious] So, now the trap. Async has one rule. Never block the loop. Every task shares one thread. So anything that holds that thread without reaching an await freezes every other request in the process. All at once. The classic way to break it is writing time dot sleep where you meant to await async I O's sleep. Just as common is calling requests dot get inside an async def, or U R L lib, or any SDK that only has a synchronous client, because underneath, that's a blocking receive call on the loop's own thread. Same with a synchronous database driver, like psycopg two, SQLite three, or Py Mongo. And then there's heavy CPU work inside an async def. Tokenizing a two-hundred-page document, running a reranker on the CPU, one enormous json loads, a regex over megabytes of text—

B: [jumping in] A reranker isn't waiting on anything, though. That's pure compute.

A: It isn't waiting, no. But it holds the thread just the same, and from the loop's point of view, that's all that matters. So, back to that one-second sleep from earlier, and why it's worse than sync. A sync server with one bad request has one slow request. An async server with one bad line has every request slow, because they're all sharing the one thread that's stuck. Your p fifty, the median, becomes your p ninety-nine, the slowest one percent. Everyone gets the worst case.

B: How would I even find that? I'd just see everything get slow.

A: Two ways. Locally, you turn on async I O's debug mode. It adds checks, and it logs a warning whenever a single step of a task holds the loop longer than some threshold, which defaults to a tenth of a second. You turn it on with an environment variable, the Python async I O debug variable set to one, or by running python with dash X dev, or by passing debug equals true when you start the loop. Then any step that hogs the loop gets a log line naming the task and saying it took, say, two point zero zero four seconds. So you know where to look. In production, the symptom is the latency of unrelated requests spiking together. And then the CPU tells you which kind. If it's near zero, something's doing blocking I-O. If one core's pinned at a hundred percent, something's doing blocking CPU work.

B: [skeptical] And the fix is just... use threads?

A: Sometimes, actually. The fixes kind of line up with the causes. For I-O, use an async library. HTTPX's async client, or A I O H T T P, instead of requests. Async P G, or psycopg's async mode, instead of psycopg two. Await async I O's sleep. Most LLM SDKs ship an async client too, Async OpenAI, Async Anthropic. If you have to call a blocking function you can't replace, push it onto a thread with async I O's to thread. The loop keeps running, the blocking call sleeps on a worker thread, and that's fine, because a sleeping thread releases the GIL. But for heavy CPU work, threads don't help, because of the GIL. So you send it to another process instead, with a process pool executor, through the loop's run in executor.

B: [laughs] Okay, here's one I can totally see happening. Someone on the team goes through the FastAPI app and changes all the plain def endpoints to async def, because, you know, async is faster. And then under load it's way worse.

A: Yeah, that's the FastAPI detail that surprises everyone. If you declare an endpoint with plain def, FastAPI assumes it might block, and it runs it in a thread pool for you, so it doesn't freeze the loop. That pool has about forty threads by default. It comes from a library underneath called any I O. So a def endpoint that calls requests dot get behaves like a forty-thread server. Fine at forty in flight, a staircase beyond that. Now your teammate makes it async def, and it still calls requests inside. That's the worst of all. No thread pool anymore, and every call blocks the loop. Each one freezes the whole process, and every request waits for every other request's call. To fix it, either switch the slow calls to async libraries and await them, or wrap them in to thread, or, honestly, just put it back to plain def. And confirm with debug mode, which'll log every step that holds the loop for more than a hundred milliseconds. So the rule to keep is: async def only if everything slow inside it is awaited. Otherwise, plain def, and let the pool handle it.

<!-- section: The Idea: Async spreads -->

A: There's one more cost, and you'll feel it right away. In twenty fifteen Bob Nystrom wrote an essay about it called "What Color is Your Function?" Only an async def can await. So say a function deep in your code becomes async, like the one that calls the LLM. Every function that calls it now has to become async def and await it. And so do their callers. All the way up to the event loop. Async's contagious, up the call chain. And it doesn't go the other way easily either. Sync code can't just call async code. If you try to start a fresh loop with async I O dot run from inside a loop that's already running, that's an error. Async code calling sync code is fine, but only if the sync code is quick.

B: [sighs] That sounds like it would eat a whole codebase.

A: It's the real cost of async, yeah. And it's why the place where the two worlds meet is where most of the bugs live. The practical rule is: decide at the edges. A web server, a load generator, an agent orchestrator, async from the top. A training script or a data-prep job, sync, with a thread pool, or one async I O dot run call at the exact point where you fan out a bunch of network calls.

<!-- section: The Idea: Fanning out inside one request -->

A: Which brings up the other use of async. It isn't only for serving lots of users. It also helps one request that needs several independent waits. Say your handler needs three things. An LLM call to summarize the question, another to classify it, and a search. Two seconds each. One after another, that's six seconds. But if they don't depend on each other, you start all three, then wait for all three, and the total's about the slowest one. So, about two seconds. The old way to write that is async I O's gather, and you'll still see it everywhere. The newer, safer way, Python three point eleven and up, is a task group. Same effect, but if one task fails, the task group cancels the others, instead of leaving them running in the background like gather does by default. Either way, you've turned the sum of the waits into the max of the waits.

B: What's the catch? That can't be free.

A: The cost moves. Each user request now holds three upstream calls at the same time instead of one. So by Little's Law, at the same request rate, you've got three times as many calls in flight against the provider, and you'll feel that against their concurrency and rate limits, and your own cap. And if call two needs call one's output, nothing can overlap those two. Only the independent ones go together.

<!-- section: The Idea: Backpressure -->

A: Which leads to the last idea. Once firing off a thousand requests is one line of code, you will do it by accident. The upstream API rate-limits you, your connection pool starts queueing, and memory fills up with half-finished work. The fix is to put a cap on how much you have in flight. In async I O that's a semaphore. It's a counter that only lets, say, sixty-four calls through at a time, and you wrap each call in it. When the cap's full, new work waits its turn instead of piling onto the upstream. And that's backpressure, in its simplest form. Limiting how much work you accept or start, so a slow thing downstream pushes back on whoever's producing the work, instead of letting it pile up without bound. The load generator you're about to build uses exactly this to control how many requests it has going. And there's a whole later lesson on rate limits that goes way deeper.

<!-- section: Build It: Setup and the fake LLM -->

A: Okay. So that's the idea. Now you make it happen, on your own machine. Everything goes in one folder, with a virtual environment and a handful of libraries. FastAPI, uvicorn, HTTPX, Flask, requests, gunicorn. And in every terminal you use, raise the open-file limit to about ten thousand, because every connection's a file descriptor and macOS starts you at two hundred fifty-six. You'll want three terminals. One for a fake LLM, one for the server you're testing, one for the load generator. The fake LLM is a stand-in for a model API. It waits just like one. Four tenths of a second before the first token, then forty tokens at forty milliseconds each, so two seconds total. And it does no real work at all. That's kind of the point. Every number you measure afterwards is about your server, not the model. It's got two endpoints. One waits the full two seconds and returns the whole answer as JSON. The other streams the tokens back one at a time, trickling in, the way a real streaming API does.

B: Is the fake one sync or async? Because if it falls over first, you're measuring the fake.

A: It's async, for exactly that reason. Its whole job is to hold thousands of requests that are each doing nothing for two seconds. Which, by now, you can probably guess is the one thing async is great at.

<!-- section: Build It: The toy event loop -->

A: Then, before you touch async I O, you build the machine it's made of. A toy event loop, using nothing but a few pieces of the standard library. A heap, the selectors module, the clock, a double-ended queue. And the whole protocol between a task and the loop is tiny. A task pauses by yielding a note, and there are only three kinds of note. "Sleep for this many seconds." "Wake me when this socket's readable." "Wake me when this socket's writable." You're given three little helper functions that do nothing but yield those notes. They're marked with a decorator that turns a generator into something you're allowed to await. So when a real async def function says await sleep of one, that note travels straight up through the await to whoever's driving the coroutine. Which is your loop.

B: So the decorator's basically there so await will accept it.

A: Pretty much. Then the loop keeps three things. A line of tasks that can run right now. A heap of sleeping tasks, sorted by when they should wake up. And a selector, which on your Mac is K queue and on the Spark is E poll. Then the run function just goes around and around, basically, for as long as anything's ready, sleeping, or registered with the selector. If nothing's ready, it works out how long until the earliest sleeper's due, calls select with that as the timeout, and whatever sockets come back, it unregisters them and puts their tasks in the ready line. Then it moves every sleeper whose time has come into the ready line too. If something is ready, it pops a task and sends it None, which runs it until its next await. If the task raises Stop Iteration, it's finished. Otherwise the loop looks at the note it yielded and files it. A sleep goes on the heap. A read or write gets registered with the selector, with the task attached, so it comes back when the socket's ready.

B: Why does the heap need a tiebreak, though? You sort by wake time.

A: Because two tasks can have the same wake time. And then Python tries to compare the next thing in the tuple, which is the coroutine, and coroutines can't be compared. So it crashes. You put a counter in the middle, so ties never reach the task. Oh, and use the monotonic clock for timers, never the wall clock. Then two demos. First, five tasks that each sleep for one second plus a quarter second times their index, and print when they start and finish. One after another, that'd be seven and a half seconds. On your loop it's about two. Second, the real thing. Fifty tasks that each fetch from your fake LLM with a raw socket. Each one makes a socket, sets it non-blocking so the OS never puts you to sleep, and starts connecting. And that connect throws a Blocking I O Error, which is expected. It just means "connecting in the background". Then it awaits writable, because a socket becoming writable means the connection's up. It sends a bare HTTP request, then loops, awaiting readable and reading, until the read comes back empty, which means the server closed the connection. Fifty of those, on one thread, finish in about two seconds. On a Mac, two point zero one. There's a reference solution. But the rule is, you only open it after yours works. Or after thirty honest minutes.

B: And which line is the one where the program actually waits?

A: That's, like, the test of whether you understood it. It's the select call. It's the one place in the whole program where it actually sleeps, and it's sleeping until some socket's ready or the next timer's due. Now map the pieces onto async I O. Your ready line is async I O's ready queue. Your sleeping heap is its timer heap, the thing behind call later. And your select call is the same single place where async I O sleeps. Sending None into a task is what an async I O task does every time it's resumed. And await is nothing more than "yield a note up to the loop and freeze here". The real loop adds futures, cancellation, exceptions, callbacks, a lot more polish. But the skeleton is this. And if you want to see someone build this live, David Beazley did it in a talk at PyCon in twenty fifteen. Built an event loop out of generators and select in about forty-five minutes. Watch it after you've built yours.

<!-- section: Build It: The sync server and the load generator -->

A: Next, the server under test. Written the way most people write it the first time. A Flask app, about ten lines, one endpoint called chat that calls the fake LLM with requests dot get and returns the reply. Give that call a timeout of sixty seconds, because requests has no timeout by default and it'll wait forever. Run it with gunicorn's default worker type, the sync worker, which is one process handling one request at a time, start to finish. The dash w flag sets how many of those processes, and you use one. Hit it once with curl, and it takes about two seconds. Nothing wrong. I mean, nothing ever looks wrong with one request. Then the load generator. And this one's a real tool. You'll use it again later to benchmark your Spark against Fireworks, so it's worth building properly. You give it a URL, a total number of requests, and how many can be in flight at once. With a stream flag it reads the streamed tokens and also records time to first token. When it's done it prints one summary. How many requests, how many in flight, how many errors, the wall time, requests per second, and then the latency at the median, at p ninety, at p ninety-nine, and the max.

B: [laughs] That's more than I'd have bothered building.

A: It's worth it, you'll reuse it. And the shape's small. A percentile function using nearest rank, meaning the smallest value that has at least that percentage of the samples at or below it. A function that times one request inside the semaphore, using a high-resolution timer, and in stream mode notes when the first data line arrives. It catches exceptions and counts them as errors, instead of crashing the whole run. And a main that creates the semaphore, creates the HTTP clients, and launches all the requests as tasks in a task group. Three things will bite you, and each one's a lesson. First, HTTPX's default timeout is five seconds. Your sync server's going to make requests wait a hundred seconds, HTTPX will report them as errors, and your latency numbers will lie to you. So set the timeout to six hundred. Second, HTTPX's default connection pool is a hundred connections. Above that, requests silently wait for a free connection inside your own client—

B: [jumping in] So you'd be benchmarking your own client's line, not the server.

A: You'd be measuring your own queue, yeah. Set the pool size to match how many you want in flight. And the third one's sneakier. One async client gets slow with hundreds of connections. With two hundred in flight through a single client, on a Mac, most of the CPU went into the connection pool's own bookkeeping, and the client, not the server, became the bottleneck. Latency was four point seven seconds for two-second requests. The fix is one client per roughly fifty connections, handed out round-robin. And the lesson inside the lesson: always check your load generator's CPU, in top, before you believe a benchmark. Point it at the fake LLM directly first. You should see a median of about two seconds whether you have twenty in flight or five hundred. You're done when five hundred requests at five hundred in flight come back with zero errors and a median somewhere around two to two and a half seconds, and when streaming shows time to first token around four or five tenths of a second. And there's one question you should be able to answer. Why is it the semaphore, and not the number of tasks, that controls how many requests are in flight?

B: Because you create all the tasks up front, but each one has to get through the semaphore before it actually sends anything. So the tasks can all exist, and only, like, sixty-four or whatever are past the gate.

A: Yes. Creating a task costs almost nothing. The gate's what decides what's actually on the wire.

<!-- section: Build It: Hammer it, add threads, rebuild async, stream -->

A: Now you hammer the sync server. One at a time, then five, ten, twenty, all at once, and write down the median, the max, and the wall time for each. Watch top while it runs. The gunicorn process should sit near zero percent CPU the whole time. Then restart it with threads. The threads flag switches gunicorn to its threaded worker, where each process has a pool of threads. First eight threads, then two hundred. Run eight threads at twenty and at a hundred in flight, and two hundred threads at two hundred. And while the two-hundred-thread one's loaded, check its memory and its thread count. What you should see is the staircase with one worker, waves of eight with eight threads, so twenty requests in about six seconds, three waves. And two hundred threads should handle two hundred at once in about two point three seconds.

B: [amused] Six seconds for twenty. So threads are kind of fine.

A: At that size, they're fine. Then you rebuild it async, in FastAPI, properly. One HTTPX async client for the whole app, not one per request, because in real life every new client means new connections and new TLS handshakes. FastAPI has a lifespan hook for this. Create the client at startup, close it at shutdown. Check FastAPI's docs on lifespan events for the exact shape. Raise the client's connection limit, or it'll quietly cap you at a hundred upstream calls in flight. And the chat endpoint is an async def that awaits the client's get and returns the reply. Hit that at twenty, two hundred, and five hundred in flight. Then add two more endpoints, for comparison. One's a plain def that calls requests dot get, which FastAPI will run in its thread pool. The other's the planted bug. An async def that calls time dot sleep for two seconds, and then does the proper await on the client. You're done when chat at two hundred in flight finishes in about two to three seconds, from one process, at near-zero CPU, the def version at a hundred in flight shows waves of about forty, and you've written down, before running it, what you think the bad one will do at ten in flight.

B: [working it out] Ten in flight, two seconds of sleep each, blocking the loop... twenty seconds? Plus the real call?

A: Hang on to that. We'll check it in a minute. There's an optional last piece, because your Fireworks benchmark is going to measure time to first token. Add a streaming endpoint. It opens a stream to the fake LLM's streaming endpoint and returns a streaming response, driven by an async generator that passes each line through as it arrives. The catch is that the upstream stream has to stay open the whole time you're yielding, so the block that opens it has to live inside the generator, not around it. Then measure with the load generator in stream mode. Time to first token should stay near four tenths of a second even at two hundred in flight, while total latency stays near two seconds. And that gap, first token fast and the rest trickling in, is what users actually feel. It gets its own lesson later.

B: What happens if the user closes the tab halfway through a stream?

A: Yeah, that's the one bug worth having someone review your generator for. What happens to the upstream connection when the client disconnects halfway? Go find out.

<!-- section: Measure -->

A: So here's what the numbers look like. These are from a Mac, Python three point fourteen, everything on localhost, a two-second fake upstream. Yours should match in shape, if not to the decimal. First, the fake LLM on its own, hit directly with a thousand in flight. Wall time about two point nine seconds, median two and a half. So the upstream itself is fine with a thousand waiting at once. Remember, it's async. Then the sync server with one worker. One request, two seconds. Five at once, the whole batch takes ten point one seconds, median six. Twenty at once, forty point two seconds, median about twenty. So that's a straight line. Wall time's two seconds times N, and the median's half of that.

B: And no errors in any of that?

A: Zero errors. That's the "it doesn't crash, it queues" claim, measured. Eight threads is that same line with eight lanes. Twenty requests is three waves, six seconds, and you measure six point one, median four. A hundred requests is thirteen waves, twenty-six seconds, and you measure twenty-six point two, median about fourteen. So the wave formula holds to within a few percent. And two hundred threads at two hundred in flight? Two point three seconds. Remember that one. Threads aren't bad at waiting. They're expensive per waiter, and two hundred, well, two hundred isn't many. Okay, then the async FastAPI server with HTTPX. Twenty in flight, two point one seconds. Two hundred in flight, three seconds wall, median two point six. One process. The plain def endpoint calling requests, at a hundred in flight: about six seconds wall, median about four. Those are waves forty wide. A hundred requests in three waves of forty is six seconds. That's FastAPI's thread pool. And that's the number to remember the next time someone tells you FastAPI handles sync endpoints fine. And the bad one. You guessed twenty-something.

B: [working it out] Twenty for the sleeps, plus two for the actual call, so... twenty-two? But I'd have guessed the first request gets out early.

A: Twenty-two point one seconds. And that's for every request. The best one too. Ten requests times two seconds of blocking the loop, plus one two-second upstream wait that they all overlap at the end. Nobody gets out early, because every request's waiting for every other request's sleep before its own reply can be handled. And if you run uvicorn with the debug environment variable set, the log has one line per request saying the task took two point zero zero six seconds.

B: [quietly] Huh. Nobody.

A: Nobody. Okay, there's one more measurement, and it answers the question about what threads really cost. A tiny script. Start N threads that each just block waiting on an event that never fires, then separately start N async I O tasks that each await an event, and print how much the process's resident memory grew. That's the memory it's actually using. A thousand threads, about thirty-seven megabytes. So thirty-eight kilobytes each. A thousand tasks, about nine tenths of a megabyte, nine tenths of a kilobyte each. Ten thousand threads, about three hundred seventy megabytes. Ten thousand tasks, about eight and a half. And at a hundred thousand, the threads are just refused. You hit the operating system's thread cap. A hundred thousand tasks? About eighty-four megabytes. Try it on the Spark too. Linux allows way more threads than macOS, and each one reserves eight megabytes of virtual address space. So watch the virtual memory column in H top climb into the tens of gigabytes, while the resident column stays modest.

B: [laughs] So that's the eighty gigabytes I was worried about.

A: That's your eighty gigabytes. Reserved isn't used.

<!-- section: Break It -->

A: Now you break it. On purpose. Four ways. First, overflow the line. The listen backlog has a maximum length. macOS caps it at a hundred twenty-eight. Linux's default has been four thousand ninety-six since kernel five point four. Point the load generator at your async server with a thousand requests, all thousand in flight at once. On a Mac, depending on timing, anywhere from a handful to four hundred thirty-four of the thousand came back with "all connection attempts failed". And the server never crashed. The kernel's line was full, so it turned new connections away at the door.

B: [amused] So I was sort of right about the crashing.

A: That's the one sense in which you were right, yeah. A server under enough load does start failing. But the failure's at the door, not a crash inside. And the fix is a longer line, more processes, or a load balancer. Not async alone. Second, plant a blocking call and catch it. Run the bad endpoint with debug mode on and read the warnings. Then fix it three ways and measure each. Replace the sleep with async I O's sleep. Or keep the blocking sleep, but push it onto a thread with to thread. And for a CPU-bound stand-in, a loop that does a few hundred million additions, send it to a process pool. So, quick one. A slow tokenizer. Which fix?

B: That's CPU, so threads don't help, because of the GIL. Process pool.

A: And a legacy SDK that only has a sync client?

B: That's just waiting on the network, so... to thread. The thread sleeps and lets go of the GIL.

A: That's it. Third, find the real ceiling of one process. Push the async server to five hundred, then a thousand in flight, and watch latency and top. On a Mac, five hundred in flight through one async client inside the server gave a median of seven point seven seconds and one server error, while the fake upstream was still answering in two seconds.

B: [skeptical] Wait, the upstream's fine and it's still seven seconds?

A: Yeah, and the cause was the same one you hit in the load generator. One client's connection pool, doing bookkeeping over hundreds of connections. Splitting the server's upstream calls across twenty clients of fifty connections each brought five hundred in flight back down to two and a half seconds. And the general lesson is: when an async server gets slow while there's almost no waiting going on, the loop is working. So profile it. Either with Python's built-in profiler, sorted by time spent in each function itself, or with py spy attached to the running process. And find what it's working on. Fourth, forget the semaphore. Take the gate out of your load generator and fire five thousand requests at the fake LLM. Every single one starts at once. Watch what happens to errors, to file descriptors, to memory. That's what an unbounded gather does to someone else's API. And it's why every client that talks to a rate-limited service needs a cap.

<!-- section: Connections and close -->

A: And the same question follows you to the GPU, by the way. During decoding, is the GPU computing, or is it waiting on memory? That's the next thing to dig into. And when you benchmark the Spark against Fireworks, this load generator is the client, and Little's Law tells you how much concurrency you need to keep a GPU busy.

B: [working it out] Okay, let me try to say the whole thing. The server wasn't crashing, it was queueing, because the one worker sat blocked on every LLM call. And async fixes it by... running the requests at the same time, on one thread.

A: [gently] Almost. Not at the same time. Nothing runs at the same time, it's one thread. The sync server already had a queue, and requests waited in it because the one worker was stuck waiting on each request's network call. Async keeps that one worker, but it lets it set a request aside whenever that request is waiting, work on the others, and pick each one back up when the operating system says its data's arrived. So the waits overlap, instead of adding up. It's not doing more work at once. It's just... never standing in front of the oven.
