# Outline: waiting-vs-working

Source: src/lessons/waiting-vs-working.mdx. Curriculum entry: "Waiting vs working." Question: what do
sync and async actually mean, and why does my server stall under load? Why: every LLM app spends most
of its life waiting on a network; async is how one process waits on thousands of things.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: a network round trip is millions of CPU cycles (lesson 1); threads help with waiting and each costs a stack (lesson 3). -> A, in passing, when the six-billion-cycles number and the thread-stack cost come up. "Today" bullets themselves are skipped as a list; each is an item below.

## The Problem

- P1 Scene: small FastAPI service at work in front of an LLM; model call takes about 2 s. -> A opens the episode on this scene, first line.
- P2 Teammate fires 50 in parallel: 1st waits 2 s, 10th 20 s, 50th 100 s; CPU flat about 1%; nothing errored. -> A, continuing the scene, numbers said as a progression.
- P3 Gaurav's diagnostic answer: "200 seconds, server would probably crash, so use async, which can be in a queue." -> B says this as their own gut answer when A asks what's going on.
- P4 First half right: request 100 waits behind 99, so about 200 s. -> A grants it, warmly.
- P5 Wrong piece 1: it usually doesn't crash; requests parked, OS holds connections in a line, served one by one; latency grows in a straight line; can refuse when the line is full (Break It). -> A corrects, promises the overflow later.
- P6 Wrong piece 2: async is not a queue; the queue already existed, that's the problem; async = worker stops standing at the oven, sets a waiting request aside, comes back when the answer arrives. -> A, B pushes back ("but there IS a line somewhere") and A agrees, that's the point.

## Origin

- O1 1999, Dan Kegel's web page: hardware can handle 10,000 clients at once, why can't servers? -> A tells as story after the problem.
- O2 Common design: process or thread per connection; at 10,000 machines drowned: memory for 10,000 stacks, OS switching between threads that mostly had nothing to do. -> A.
- O3 Alternative surveyed: one thread, many connections, ask kernel "which sockets have data for me right now?" -> A.
- O4 kqueue on FreeBSD (2000), epoll on Linux (2002). -> A, quickly, as names to recognise later.
- O5 nginx (2004) huge numbers of connections from a handful of workers; Node.js (2009) single event loop default; Python asyncio in 3.4 (2014), async/await keywords in 3.5 (2015); everything descends from that page. -> A, fast timeline in one breath; B reacts to "one web page".

## The Idea

- I1 Working (CPU running your instructions: tokenizing, matrix multiply, JSON parsing) vs waiting (answer must come from somewhere slow: disk, network, GPU, another server). -> A.
- I2 Term CPU-bound: limited by CPU speed; faster CPU or more cores in parallel helps. -> A, named after the idea.
- I3 Term I/O-bound: limited by input/output waits; faster CPU changes almost nothing, "it would just wait faster". -> A; B repeats "wait faster" with a laugh-ish line? Keep A only.
- I4 Lesson 3 callback: threads did nothing for hashing, were magic for page fetching. -> A, one sentence.
- F1 Figure 001: one LLM call to scale: about 0.1 ms to build and send, about 0.5 ms to parse and reply, about 2,000 ms waiting; about 99.97% waiting. -> A describes as a long bar with two hairlines at the ends; B asks for the actual numbers.
- I5 Work numbers rough (payload, framework) but shape isn't: even 5 ms of real work = still waiting 99.75%. -> A, answering B's "that's suspiciously precise".
- I6 2 s wait = about 6 billion cycles of a 3 GHz core. Central question: what does the worker do during those 6 billion cycles? -> A states the question of the episode.
- I7 Two chefs: 30 s to assemble, 10 min oven. Chef 1 watches the oven: 10 orders take 100 min, order ten waits an hour and a half; did nothing 95% of shift; never lazy. -> A, short, one-point comparison (allowed: exact, one point).
- I8 Chef 2 starts next pizza, pulls when timer dings: 10 orders about 15 min; didn't work faster, stopped waiting in front of things. -> A.
- I9 Third option: ten chefs each at own oven = threads; works; expensive in chefs, stops scaling at 10,000 orders. -> B proposes "just hire more chefs", A says that's threads.
- I10 Chef 2 isn't a queue: orders wait on the ticket rail in both kitchens; difference is what the chef does while the oven runs. -> A ties back to B's "queue" model.
- I11 requests.get eventually calls recv() on a socket. Term socket: OS handle for one network connection, you read/write bytes, kernel does networking. -> A, in his Flask/FastAPI scene.
- I12 Term blocking: call doesn't return until answer ready; kernel takes thread off CPU, marks asleep until bytes arrive; costs no CPU, but can't do anything else; one worker = server can't do anything else. -> A; B asks "so the CPU at one percent is this?" A yes.
- I13 Term listen backlog: kernel finishes TCP handshake before your code sees it, queues fully set-up connections; your worker calls accept() to take the next; max length set at startup, capped by OS. -> A answers B's "where are the other 49 while this happens?"
- I14 So "200 seconds" is real, server isn't crashing: one cashier with a very long line. -> A.
- F2 Figure 002: clients -> kernel backlog box (waiting, not failed; full means new connections dropped/refused) -> accept -> worker blocked in recv -> LLM about 2 s; CPU about zero; request N finishes at N times 2 s, straight line. -> A describes left to right "like a diagram on the phone".
- PR1 Predict: one sync worker, 2 s calls, 50 at once: median, worst, total? Then 8 threads. Answer: finishes 2, 4, ... 100; median about 50, worst 100, total 100, throughput 0.5/s regardless. 8 threads: 7 waves (50/8 rounded up), total about 14, median about 8 (25th request in wave 4), worst 14, throughput 4/s. -> A asks, B gets sync right and botches the 8-thread median (says 7), A walks the waves.
- F3 Figure 003 interactive timeline: three buttons (sync, threads, async), sliders for N, upstream wait, K threads, and a time.sleep-in-handler slider; dashed line = in line, blue box = waiting upstream, black = blocking call holding the worker; readouts total, p50, worst, throughput. -> A describes what you see as you drag.
- I15 Sync: staircase; total = N times request time; throughput fixed at 1 / request time, doesn't care how many wait. -> A while describing figure.
- I16 Threads: wider steps; throughput K / request time; if K >= N everyone finishes in about one request time; threads perfectly good when N is tens or hundreds. -> A.
- I17 Async: everyone overlaps on one worker; total about one request time whatever N (in this model; real limits in Measure). -> A, with B noting "in this model" caveat.
- I18 time.sleep slider to 1 s in async: collapses into worse than sync; every request waits for every other request's sleep. Hold for traps. -> A plants it; B "worse than sync?" A: hold that.
- I19 Second chef, change 1: Term non-blocking socket: recv/send never wait; nothing to read -> return immediately with "try again later" error (EAGAIN; BlockingIOError in Python). -> A.
- I20 Change 2: wait for any of many sockets without spinning "anything yet?" (would burn a core); hand kernel a list, "sleep me until one is ready, tell me which". -> B suggests "just loop checking each one", A: burns a whole core.
- I21 select() since early 1980s; Term epoll (Linux: register once, each wait returns only ready ones, cost doesn't grow with count); Term kqueue (BSD/macOS equivalent, sockets and timers); Python's selectors module wraps all, same code on Mac and Spark. -> A.
- F4 Figure 004: left, thread per connection, each asleep in recv; each waiter = a stack + a kernel thread; 10,000 waiters = 10,000 threads. Right: one thread (event loop) registers all sockets with kernel epoll/kqueue, up to s10,000, kernel says "s2 is ready"; each waiter = entry in a kernel table + small Python object. -> A, two halves.
- I22 Loop routine: (1) run every ready task until it would wait; (2) note "this task wants socket 7", move on; (3) nothing ready -> ask kernel to sleep until any watched socket or timer ready; (4) kernel wakes "socket 7 ready", mark task ready, go to 1. -> A says it as a routine, not a numbered list.
- I23 Term event loop: single loop running ready tasks one at a time, sleeping when nothing ready; asyncio, Node.js, nginx built on one; never runs two tasks at the same moment, never idle while there's work. -> A names it after the routine.
- I24 Terms concurrency (progress on many things over the same stretch by switching) vs parallelism (same instant on different cores); async = concurrency with zero parallelism (lesson 3 distinction, purest form). -> B asks "so it's parallel?" A corrects.
- F5 Figure 005, the ring: five tasks around a circle, loop in middle, OS box on the right listing parked tasks with wake times; each task runs a sliver, hits await, parks; loop sleeps in select; all done at 700 ms on one thread vs 2,700 ms one after another. -> A describes stepping through.
- I25 Pausing halfway: "move on" means stopping mid-function, locals intact; normal functions run to the end and their stack frame is gone. -> B raises: "how does a function stop in the middle?"
- I26 Term generators (since 2001): functions with yield; next/send runs to the next yield and freezes locals; frame lives on the heap (lesson 2), not the C stack, so it can be frozen and thawed. -> A.
- I27 Term coroutine: pausable function; async def; calling it gives an object that does nothing until driven. -> A.
- I28 await x: if x isn't done, pause me and pass a note up to whoever's running me (the event loop); note says what you're waiting for; loop files the paused coroutine next to that socket/timer and runs someone else. -> A.
- I29 await is not "wait", it is "I'm willing to be paused here"; code between two awaits runs uninterrupted, nobody can take the CPU. -> A, the punchline; B checks "so the word is misleading?"
- I30 Simplification: far fewer race conditions than threads (switches only at await). Trap: never reach an await, nobody else runs. -> A.
- I31 Little's Law: John Little, 1961, any stable system where things arrive, stay, leave; in flight = throughput x latency; L = lambda W; no assumptions about arrivals. -> A, letters said as words once.
- I32 Coffee shop: 2 customers a minute, 5 minutes inside each -> about 10 inside at any moment. -> A, one-point comparison.
- I33 Apply: 100 requests/s, 2 s each -> 200 in flight on average; not a choice; can't hold 200 -> can't do 100/s; the line grows until something gives. -> A; B "that's not a choice?" A firm.
- F6 Figure 006: arrivals 100/s into a box "each stays 2 s, 200 in flight", 100/s leave; below, two bars at 10,000 in flight: threads 10,000 x about 38 KB resident = about 370 MB and 10,000 kernel threads; asyncio tasks 10,000 x about 1 KB = about 10 MB and one kernel thread; measured on a Mac, Python 3.14. -> A describes as "two bars, one fat one a sliver".
- I34 At 200 in flight threads are fine; normal day for a JVM or gunicorn box; Measure: 200-thread Flask does 200 simultaneous 2 s calls in about 2.3 s using about 65 MB. "Don't let anyone tell you threads can't do I/O." -> A, surprising B.
- I35 Next zero: agent product, several LLM calls per request, some streaming 30 s, a few hundred req/s -> thousands to tens of thousands in flight; per-waiter cost decides everything. -> A.
- I36 Each thread reserves a stack (8 MB address space default on Linux; only touched pages cost RAM, lesson 2); kernel keeps it, schedules it, context-switches into it every time its socket wakes. -> A; B asks "8 MB times 10,000 is 80 GB?" A: reserved, not used.
- I37 Mac numbers: idle Python thread about 38 KB real (10,000 = 370 MB); macOS caps a process at about 12,000 threads; idle asyncio task about 0.9 KB; 40x memory difference; more importantly "OS juggles 10,000 threads" vs "one thread checks a list". -> A.
- I38 What limits one async process: working. Each request needs C ms of CPU on the loop's one thread (HTTP parsing, building upstream request, JSON, framework bookkeeping); ceiling 1000/C req/s regardless of wait; C = 1 ms -> about 1,000 req/s -> about 2,000 in flight at 2 s; past that, loop always busy, ready tasks pile up, latency climbs: I/O-bound turned CPU-bound. -> B asks "so what's the limit then, infinity?" A.
- I39 Plainer limits first: open files per process (every socket is a file descriptor; macOS ulimit default 256), listen backlog, HTTP client connection pool, the API's rate limit. -> A.
- I40 Fix for CPU limit: several processes (uvicorn with four workers, or containers behind a load balancer), each with its own loop. -> A.
- I41 Traps: one rule, never block the loop; anything holding the thread without reaching an await freezes every request in the process at once. -> A.
- I42 Common ways: time.sleep instead of asyncio.sleep; requests.get/urllib/any sync HTTP SDK inside async def (blocking recv on the loop's own thread); sync DB drivers (psycopg2, sqlite3, pymongo); heavy CPU in async def (tokenizing a 200-page doc, CPU reranker, big json.loads, regex over megabytes) -- not waiting, but holds the thread the same. -> A as a spoken run, with B noting his ranker.
- I43 Worse than sync: sync with one bad request = one slow request; async with one bad line = every request slow. p50 becomes p99. -> A, with p50/p99 spelled out.
- I44 Spot it: Term debug mode, logs when a step holds the loop longer than slow_callback_duration (default 0.1 s); turn on with the PYTHONASYNCIODEBUG env var, python -X dev, or debug=True on asyncio.run; log "Executing Task took 2.004 seconds" with the task name. -> A, said in words.
- I45 Production symptoms: latency of unrelated requests spikes together; CPU near zero (blocking I/O) or pinned at 100% of one core (blocking CPU). -> A; B: "how would I know in prod?"
- I46 Fix 1: async libraries: httpx AsyncClient or aiohttp for requests; asyncpg or psycopg's async mode; await asyncio.sleep; most LLM SDKs ship async clients (AsyncOpenAI, AsyncAnthropic). -> A.
- I47 Fix 2: blocking function you can't replace -> asyncio.to_thread; loop keeps running, call sleeps on a worker thread, fine because sleeping threads release the GIL. -> A.
- I48 Fix 3: heavy CPU -> threads don't help (GIL, lesson 3); another process via run_in_executor with a ProcessPoolExecutor. -> A.
- I49 FastAPI detail: plain def endpoint -> FastAPI runs it in a thread pool, about 40 threads by default (anyio); def + requests = 40-thread server: fine at 40, staircase beyond; async def + requests = worst, no pool, blocked loop. Rule: async def only if everything slow inside is awaited; otherwise def. (Also E5: teammate moved def -> async def "to make it faster".) -> B tells the teammate story as a thing they'd do; A explains.
- I50 Async spreads: Bob Nystrom, 2015, "What Color is Your Function?"; only async def can await; make one deep function async -> every caller up to the loop; contagious; sync can't simply call async (asyncio.run inside a running loop is an error); async calling sync fine only if quick. -> A; B: "that sounds awful".
- I51 Real cost; mixing worlds is where bugs live; decide at the edges: web server, load generator, agent orchestrator async from the top; training script, data-prep job sync with a thread pool or one asyncio.run where you fan out network calls. -> A answering B's "so where do I draw the line?"
- I52 Fan-out inside one request: three sequential 2 s calls = 6 s; independent -> start all, wait for all -> about the slowest, 2 s. Example: summarize, classify, search at once. -> A, with B thinking of his own pipeline.
- I53 gather vs TaskGroup (3.11+): same effect; TaskGroup cancels the others if one fails, gather by default leaves them running. "Sum of waits" -> "max of waits". -> A.
- E3 extras: costs moves: 3x upstream calls in flight by Little's Law at the same request rate -> provider concurrency and rate limits, your semaphore; dependent calls (2 needs 1's output) can't overlap. -> B asks "what's the catch?"
- I54 Backpressure: firing 1,000 requests is one line, you'll do it by accident; upstream rate-limits, pool queues, memory fills with half-finished work; cap in flight with a semaphore of 64 around each call; Term backpressure: limiting work accepted/started so a slow downstream pushes back; load generator uses exactly this; rate limits lesson goes deeper. -> A.

## Build It

- B0 Setup: one folder, a venv, install fastapi, uvicorn, httpx, flask, requests, gunicorn; raise open-file limit to 10,240 in every terminal (macOS starts at 256, each connection is a file descriptor); three terminals: fake LLM, server, load generator. -> A, one or two sentences.
- B1 Task 1 fake LLM: waits like one (0.4 s to first token, 40 tokens x 40 ms, 2.0 s total), no real work, so numbers are about your server; async itself, holds thousands of waiting requests; complete endpoint returns JSON after about 2 s, stream endpoint trickles tokens as server-sent events; curl to check. -> A.
- B2 Task 2 toy loop: only heapq, selectors, time, types, deque; protocol is tuples: a task pauses by yielding ("sleep", s), ("read", sock), ("write", sock); three helpers given; types.coroutine makes a generator awaitable so "await sleep(1)" passes the tuple straight up to whoever calls send. -> A, explained as notes passed up.
- B3 Structures and run(): ready deque, sleeping heap of (wake time, tiebreak, task), DefaultSelector (kqueue on Mac, epoll on Linux); run loops while anything ready/sleeping/registered; if nothing ready: timeout until earliest sleeper (or none), select, unregister and make ready, move due sleepers; else pop a task, send(None) runs it until next await, StopIteration means finished, else file it by note. -> A, as the routine.
- B4 Hints: empty selector map is falsy; register with the task as data so it comes back; heap tiebreak counter because coroutines can't be compared; monotonic clock, never wall clock. -> A; B asks about the tiebreak.
- B5 Demos: five tasks sleeping 1 + i x 0.25 s -> about 2.0 s, not 7.5 s; 50 raw-socket fetches (non-blocking, connect raises BlockingIOError which is expected, await writable = connected, send request, loop await readable/recv until empty bytes) -> about 2 s on one thread (mine 2.01 s); reference solution only after it works or 30 honest minutes. -> A.
- B6 Map to asyncio: ready = loop's ready queue; sleeping = timer heap (call_later); select = the one place the whole program actually waits; send(None) = what an asyncio Task does on resume; await = yield a note up and freeze; real loop adds futures, cancellation, exceptions, callbacks; done when you can point at the line where the program waits. Beazley talk (PyCon 2015) as the bigger version. -> A; B asks "which line actually waits?"
- B7 Task 3 sync server: Flask, one /chat endpoint, requests.get to fake LLM with timeout 60 (requests has no default timeout, waits forever), returns reply; about ten lines; gunicorn default Term sync worker (one process, one request at a time; -w = how many processes), one process; curl once, about 2 s; nothing ever looks wrong with one request. -> A.
- B8 Task 4 load generator: real tool, reused for Spark vs Fireworks (lesson 6); n total, c in flight, stream flag records time to first token; prints summary (count, in flight, errors, wall, req/s, p50/p90/p99/max). -> A.
- B9 Shape: nearest-rank percentile; time one request under the semaphore with perf_counter; stream mode: first "data:" line = time to first token; catch exceptions as errors; main creates semaphore of c, clients, TaskGroup creating n tasks. -> A.
- B10 Three bites: httpx default timeout 5 s (sync server makes them wait 100 s -> false errors, lying latency) -> 600 s; default pool 100 connections (silently queue inside your client) -> match c; one AsyncClient slow with hundreds of connections: 200 in flight -> pool bookkeeping ate the CPU, latency 4.7 s for 2 s requests -> one client per about 50 connections, round-robin; always check the load generator's CPU with top. -> A; B reacts to "you'd be measuring your own queue".
- B11 Direct at fake LLM: p50 about 2.0 s at 20 and at 500; done when 500 at 500 zero errors, p50 2.0-2.5 s; stream TTFT 0.4-0.5 s; can say why the semaphore, not the task count, controls in flight. -> A; B answers the semaphore question naturally.
- B12 Task 5: hammer sync at 1, 5, 10, 20; top shows gunicorn near 0% CPU; restart with threads (threaded worker, pool per process) 8 and 200; repeat 20 and 100 for 8, 200 for 200; check memory and thread count. Done: staircase 2 s x N, 0.5 req/s; 8 threads: 20 in about 6 s (3 waves); 200 threads: 200 in about 2.3 s, memory written down. -> A, results land in Measure.
- B13 Task 6 async rebuild: one AsyncClient for the whole app, not per request (new connections, new TLS handshakes); create at startup and close at shutdown via FastAPI lifespan (check docs for exact shape); raise connection limit or capped at 100 upstream; async def chat awaits client.get; hit at 20, 200, 500; add /chat-def (def + requests, thread pool) and /chat-bad (async def, time.sleep 2 then proper await). Done: /chat 200 in flight about 2-3 s, one process, near-zero CPU; /chat-def at 100 waves of about 40; predict /chat-bad at 10 in writing first. -> A.
- B14 Task 7 optional streaming (SSE): /chat-stream opens upstream stream, returns a streaming response from an async generator; upstream must stay open while yielding, so the stream context goes inside the generator; TTFT near 0.4 s even at 200 in flight, total near 2 s; that gap is what users feel (streaming lesson); review question: what happens to the upstream connection when the client disconnects halfway? -> A; B asks the disconnect question.

## Measure

- M1 Mac, Python 3.14, localhost, 2.0 s fake upstream; close in shape, not decimals. -> A.
- M2 Fake LLM direct at 1,000 in flight: wall 2.9, p50 2.5, max 2.7. -> A.
- M3 Sync 1 worker: 1 -> 2.0; 5 -> wall 10.1, p50 6.0, max 10.1; 20 -> wall 40.2, p50 20.1, max 40.1. Straight line; median half; no errors = "doesn't crash, it queues" measured. -> A, B notes "no errors".
- M4 8 threads: 20 -> wall 6.1, p50 4.0; 100 -> wall 26.2, p50 14.1. 3 waves = 6 s, 13 waves = 26 s, formula within a few percent. -> A.
- M5 200 threads at 200: wall 2.3, p50 2.2. Threads aren't bad at waiting, they're expensive per waiter, and 200 isn't many. -> A.
- M6 FastAPI async def + httpx: 20 -> 2.1; 200 -> wall 3.0, p50 2.6. -> A.
- M7 FastAPI def + requests at 100: wall 6.2, p50 4.1, max 6.1; 40-wide waves; 3 waves = 6 s; remember when someone says FastAPI handles sync endpoints fine. -> A.
- M8 async def + time.sleep(2) at 10: 22.1 s for everyone; 10 x 2 s loop-blocking + one 2 s wait; best request also 22 s; debug log line per request "took 2.006 seconds". -> B guesses first (as their written prediction), A reveals.
- M9 cost.py: N threads blocked on an Event vs N tasks awaiting an Event; RSS growth: 1,000 -> about 37 MB (38 KB each) vs about 0.9 MB (0.9 KB each); 10,000 -> about 370 MB vs about 8.5 MB; 100,000 -> threads refused (OS thread cap), tasks about 84 MB. Answers lesson 3's closing question. -> A.
- M10 On the Spark: Linux allows far more threads, each reserves 8 MB virtual; VIRT in htop climbs into tens of GB while RES stays modest: "reserved isn't used". -> A, answering B's earlier 80 GB worry.

## Break It

- K1 Overflow the line: macOS caps backlog at 128 (somaxconn), Linux default 4096 since kernel 5.4; 1,000 at 1,000 against the async server -> handful to 434 of 1,000 got "all connection attempts failed"; server never crashed; turned away at the door. The one sense the diagnostic answer was right; fix is longer line, more processes, load balancer, not async alone. -> A ties back to B's opening "crash".
- K2 Plant a blocking call: /chat-bad with debug on, read warnings; fix three ways: asyncio.sleep; to_thread(time.sleep); CPU stand-in (few hundred million additions) via process pool. Which for a slow tokenizer (process pool) / legacy sync SDK (to_thread)? -> A asks, B answers, A confirms why.
- K3 Real ceiling: 500 then 1,000; 500 through one AsyncClient in the server: p50 7.7 s and one 500 error while upstream still answered in 2 s; same cause as loadgen; 20 clients of 50 -> back to 2.5 s; async server slow with near-zero waiting = loop is working: profile with cProfile sorted by own time, or py-spy top. -> A.
- K4 Forget the semaphore: remove it, 5,000 against fake LLM, all start at once; watch errors, file descriptors, memory; that's an unbounded gather on someone else's API; every client of a rate-limited service needs a cap. -> A, B: "that's me on a Friday".

## Explain It Back (model-answer content, folded in)

- E1 One worker, 100 simultaneous 2 s requests: kernel accepts, holds in backlog; worker takes one, blocks 2 s in recv, replies, takes next; request k at about 2k s; last about 200 s, median about 100 s; 0.5 req/s, CPU near zero; fails only if backlog fills or clients time out first; straight-line latency, not crash. -> Problem section + Measure; the median-100 line said explicitly by A.
- E2 "Async is basically a queue" correction: sync already has a queue because the one worker is stuck on each network call; async keeps one worker but sets aside waiting requests and works on others, resuming each when the OS says data arrived, so waits overlap instead of adding up. -> The ending: B restates, A sharpens into this.
- E3 Three sequential 2 s calls with gather/TaskGroup: 6 s -> about 2 s if independent; 3x upstream in flight by Little's Law; provider limits and semaphore; dependent calls can't overlap; TaskGroup cancels, gather lets them run. -> Fan-out section.
- E4 One async process at 2 s per call: waiting isn't the limit (100/s = 200 in flight, 1,000/s = 2,000, a few MB of tasks); limit is work on the one thread (parsing, JSON, framework, the client's pool); about 1 ms -> about 1,000 req/s; plainer walls: fd limit, backlog, client pool, memory per connection, above all the provider's rate limits; beyond one core, more processes behind one port or a load balancer. -> Limits section.
- E5 def -> async def got slower: still blocking inside; def ran in about-40-thread pool; async def runs on the loop, each blocking call freezes the process; fix: async libs and await, to_thread, or back to def; confirm with debug mode (logs steps over 100 ms). -> FastAPI section, as B's teammate story.

## Go Deeper / Connections

- G1 Kegel's C10K page (origin), Beazley's PyCon 2015 live-coded event loop (toy loop section). One mention each, no URLs.
- C1 Connections: loadgen + Little's Law reused in Baseline vs Fireworks (how much concurrency fills a GPU); the next lesson asks the same waiting-vs-working question of the GPU during decoding (computing or waiting on memory). -> A, once each, where natural (loadgen; just before the ending).

## Flow

1. Problem scene (P1-P2) -> B's wrong model (P3) -> A corrects (P4-P6), lightly; promises the mechanism.
2. Origin story (O1-O5).
3. Waiting vs working (I1-I6, F1), central question.
4. Two chefs (I7-I10), short, B's "more chefs" = threads.
5. First chef in machine terms (I11-I14, F2), Predict (PR1), timeline figure (F3, I15-I18).
6. Second chef in machine terms (I19-I24, F4), ring figure (F5).
7. Pausing a function (I25-I30).
8. Little's Law and cost per waiter (I31-I37, F6).
9. Limit of one process (I38-I40, E4).
10. Traps, debug, fixes, FastAPI def vs async def (I41-I49, E5).
11. Async spreads (I50-I51).
12. Fan-out and backpressure (I52-I54, E3).
13. Build It (B0-B14), Beazley mention, Fireworks connection.
14. Measure (M1-M10).
15. Break It (K1-K4).
16. Next lesson pointer (C1), then ending (E2): B restates, A sharpens, stop.
