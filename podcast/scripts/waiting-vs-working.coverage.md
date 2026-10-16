# Coverage: waiting-vs-working

Lesson src/lessons/waiting-vs-working.mdx vs podcast/scripts/waiting-vs-working.md. Item IDs match
podcast/outlines/waiting-vs-working.md. "Fixed" = was MISSING or wrong in the first draft and has been
added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs (round trip = millions of cycles; threads help waiting, cost a stack) | Waiting vs working; Little's Law | "because a network round trip is millions of CPU cycles"; "Each thread reserves a stack" | covered |
| P1 FastAPI in front of LLM, ~2 s | Problem | "a small FastAPI service at work that sits in front of an LLM" | covered |
| P2 50 parallel: 2/20/100 s, CPU ~1%, no errors | Problem | "The tenth waits twenty. The fiftieth waits a hundred seconds. CPU is flat at about one percent" | covered |
| P3 Diagnostic answer (200 s, crash, async = queue) | Problem | B: "the server probably just falls over... some kind of queue?" | covered |
| P4 First half right, 100 behind 99 = ~200 s | Problem | "request number one hundred waits behind ninety-nine others" | covered |
| P5 Doesn't crash; parked; straight-line latency; refuses when full | Problem | "The requests aren't dropped, they're parked" | covered |
| P6 Async not a queue; queue already existed; worker sets aside | Problem | "Async is not a queue. There was already a queue." | covered |
| O1 1999 Kegel page, 10,000 clients | Origin | "In nineteen ninety-nine a programmer named Dan Kegel" | covered |
| O2 Thread/process per connection; stacks; switching | Origin | "You needed memory for ten thousand stacks" | covered |
| O3 One thread, ask kernel which sockets have data | Origin | "which of these sockets has data for me right now?" | covered |
| O4 kqueue 2000, epoll 2002 | Origin | "K queue on FreeBSD in two thousand, and E poll on Linux in two thousand two" | covered |
| O5 nginx 2004, Node 2009, asyncio 3.4/2014, async/await 3.5/2015 | Origin | "Engine X, in two thousand four... three point five, the year after" | covered |
| I1 Working vs waiting definitions + examples | Waiting vs working | "Tokenizing text, multiplying matrices, parsing JSON" | covered |
| I2 CPU-bound | Waiting vs working | "Code that mostly works is called CPU-bound" | covered |
| I3 I/O-bound, "wait faster" | Waiting vs working | "It would just wait faster." | covered |
| I4 Lesson 3 hashing vs page fetching | Waiting vs working | "they did nothing for the hashing job" | covered |
| F1 Fig 001: 0.1 ms / 0.5 ms / 2,000 ms, 99.97% | Waiting vs working | "a long bar two seconds wide... about a tenth of a millisecond" | covered |
| I5 Rough numbers; 5 ms -> 99.75% | Waiting vs working | "ninety-nine point seven five percent" | covered |
| I6 6 billion cycles; central question | Waiting vs working | "what does the worker do during those six billion cycles?" | covered |
| I7 Chef 1: 30 s / 10 min, 100 min, hour and a half, 95% | Two chefs | "He just did nothing for ninety-five percent of his shift" | covered |
| I8 Chef 2: ~15 min, stopped waiting in front of things | Two chefs | "She stopped waiting in front of things." | covered |
| I9 Ten chefs = threads; doesn't scale to 10,000 | Two chefs | B: "Or you hire ten chefs." | covered |
| I10 Chef 2 isn't a queue; ticket rail | Two chefs | "Orders still wait on the ticket rail in both kitchens" | covered |
| I11 Socket; recv | First chef | "A socket is the operating system's handle for one network connection" | covered |
| I12 Blocking; asleep; no CPU; can't do anything else | First chef | "Blocking means the call doesn't return until its answer is ready" | covered |
| I13 Listen backlog; handshake; accept; max length set + capped | First chef | "a line called the listen backlog" | covered |
| I14 Single cashier, long line | First chef | "It's a single cashier with a very long line." | covered |
| F2 Fig 002: clients, backlog, accept, blocked worker, LLM, CPU ~0, N x 2 s | First chef | "If you sketched it, it goes left to right" | covered |
| PR1 Predict: 50/100/100, 0.5/s; 8 threads 7 waves, 14, median 8, 4/s | Predict | "the twenty-fifth request is in the fourth wave" | covered |
| F3 Fig 003: rows, dashed/blue/black, three modes, sliders | Predict | "Each request is a horizontal row... A dashed line means standing in line" | covered |
| I15 Sync staircase, 1/request time | Predict | "In sync mode you get a staircase" | covered |
| I16 Threads K/request time; K >= N; fine at tens/hundreds | Predict | "throughput is K over the request time" | covered |
| I17 Async ~one request time (in this model) | Predict | "In that model it is that good" | covered |
| I18 time.sleep 1 s in async worse than sync | Predict | "everything collapses into something worse than the sync server" | covered |
| I19 Non-blocking; EAGAIN / BlockingIOError | Second chef | "In C that's called E again. In Python it shows up as a Blocking I O Error" | covered |
| I20 Don't spin (burns a core); ask kernel | Second chef | "you'd burn an entire core doing nothing" | covered |
| I21 select early 1980s; epoll; kqueue; selectors module | Second chef | "called select, since the early nineteen eighties" | covered |
| F4 Fig 004: thread per connection vs one thread + kernel | Second chef | "Picture two halves side by side" | covered |
| I22 Loop routine, four steps | Second chef | "write down \"this task wants socket seven\" and move on" | covered |
| I23 Event loop term; asyncio/Node/nginx; never two at once | Second chef | "That loop is the event loop" | covered |
| I24 Concurrency vs parallelism | Second chef | "This is concurrency without parallelism, in its purest form" | covered |
| F5 Fig 005 ring: 700 ms vs 2,700 ms | Second chef | "they're all done at seven hundred milliseconds" | covered |
| I25 Pausing mid-function; frames gone | Pausing | B: "How do you leave a function in the middle" | covered |
| I26 Generators since 2001; frame on heap | Pausing | "a generator's frame... lives on the heap, not on the C stack" | covered |
| I27 Coroutine; async def; object does nothing until driven | Pausing | "does nothing at all until something drives it" | covered |
| I28 await passes note up to loop; loop files it | Pausing | "pass a note up to whoever's running me" | covered |
| I29 await = "I'm willing to be paused here"; no interruption between | Pausing | "await means \"I'm willing to be paused here.\"" | covered |
| I30 Fewer races / never reach await trap | Pausing | "far fewer race conditions than with threads" | covered |
| I31 Little's Law 1961, L = lambda W, no assumptions | Little's Law | "L equals lambda times W" | covered |
| I32 Coffee shop 2/min x 5 min = 10 | Little's Law | "has about ten customers inside at any moment" | covered |
| I33 100/s x 2 s = 200; not a choice | Little's Law | "You don't get to pick it. It's arithmetic." | covered |
| F6 Fig 006 box + bars (38 KB/370 MB vs ~1 KB/10 MB) | Little's Law | "Think of it as a box"; "the thread bar is a fat block" | covered |
| I34 200 threads fine: 2.3 s, 65 MB | Little's Law | "about two point three seconds, using about sixty-five megabytes" | covered |
| I35 Next zero: agents, 30 s streams -> thousands+ | Little's Law | "Because of the next zero" | covered |
| I36 8 MB reserved; kernel schedules, context switch | Little's Law | "a context switch, every time its socket wakes up" | covered (context switch defined in fix) |
| I37 38 KB/thread, 370 MB, 12,000 cap, 0.9 KB/task, 40x, juggles vs list | Little's Law | "macOS caps a single process at about twelve thousand threads" | covered |
| I38 CPU per request C; 1000/C; 1 ms -> 1,000/s -> 2,000 in flight | Limits | "One thread can do at most a thousand divided by C" | covered |
| I39 fd limit 256, backlog, client pool, rate limit | Limits | "macOS starts you at a limit of two hundred fifty-six" | covered |
| I40 Several processes (uvicorn 4 workers, containers + LB) | Limits | "uvicorn with four workers behind one port" | covered |
| I41 Never block the loop | Traps | "Async has one rule: never block the loop" | covered |
| I42 time.sleep, requests/urllib/sync SDK, sync DB drivers, heavy CPU | Traps | "The classic way to break it is writing time dot sleep" | covered |
| I43 One bad line = every request slow; p50 -> p99 | Traps | "Your p fifty, the median, becomes your p ninety-nine" | covered |
| I44 Debug mode, 0.1 s, three ways to enable, log line | Traps | "turn on async I O's debug mode" | covered |
| I45 Prod symptoms: unrelated spikes; CPU 0 vs 100% one core | Traps | "the latency of unrelated requests spikes together" | covered |
| I46 Async libs; Async OpenAI/Anthropic | Traps | "HTTPX's async client or A I O H T T P instead of requests" | covered |
| I47 to_thread; sleeping threads release GIL | Traps | "a sleeping thread releases the GIL" | covered |
| I48 CPU -> process pool via run_in_executor | Traps | "Send it to another process instead" | covered |
| I49 FastAPI def -> ~40-thread pool (anyio); async def + requests worst; rule | Traps | "That pool has about forty threads by default" | covered |
| I50 Nystrom 2015; contagious; asyncio.run in running loop error | Async spreads | "\"What Color is Your Function?\"" | covered |
| I51 Decide at the edges | Async spreads | "The practical rule is to decide at the edges" | covered |
| I52 Fan-out 6 s -> ~2 s | Fan-out | "the total is about the slowest one. About two seconds." | covered (fixed: search is not an LLM call) |
| I53 gather vs TaskGroup cancel | Fan-out | "the task group cancels the others" | covered |
| I54 Backpressure; semaphore 64 | Backpressure | "lets, say, sixty-four calls through at a time" | covered |
| B0 Setup: venv, libs, ulimit, three terminals | Build: setup | "raise the open-file limit to about ten thousand" | covered |
| B1 Fake LLM 0.4 s + 40 x 40 ms; two endpoints; async | Build: setup | "Four tenths of a second before the first token" | covered |
| B2 Toy loop: note protocol, helpers, decorator | Build: toy loop | "A task pauses by yielding a note" | covered |
| B3 ready/sleeping/selector; run() logic | Build: toy loop | "The loop keeps three things" | covered |
| B4 Hints: register task as data; tiebreak; monotonic | Build: toy loop | "You put a counter in the middle so ties never reach the task" | covered (empty-selector-map hint compressed into "registered with the selector") |
| B5 Demos 7.5 s -> 2.0 s; 50 raw-socket fetches 2.01 s; 30 honest minutes | Build: toy loop | "One after another that would be seven and a half seconds" | covered |
| B6 Map to asyncio; select is where it waits; Beazley | Build: toy loop | "It's the select call." | covered |
| B7 Flask sync server, timeout 60, sync worker, one process | Build: sync + loadgen | "requests has no timeout by default" | covered |
| B8 Loadgen args, summary, reuse for Fireworks | Build: sync + loadgen | "benchmark your Spark against Fireworks" | covered |
| B9 Nearest-rank pct, semaphore, stream TTFT, errors, TaskGroup | Build: sync + loadgen | "A percentile function using nearest rank" | covered |
| B10 Timeout 5 s -> 600; pool 100; one client slow (4.7 s), ~50 per client; check CPU | Build: sync + loadgen | "Latency was four point seven seconds" | covered |
| B11 Direct p50 ~2 s at 20 and 500; done-when; semaphore question | Build: sync + loadgen | B: "each one has to get through the semaphore before it actually sends anything" | covered |
| B12 Hammer sync; threads 8/200; memory & thread count | Build: hammer | "check its memory and its thread count" | covered |
| B13 Async rebuild: one client, lifespan, limits; chat-def; chat-bad; predict in writing | Build: hammer | "FastAPI has a lifespan hook for this" | covered |
| B14 SSE optional; stream inside generator; TTFT 0.4 s; disconnect bug | Build: hammer | "the block that opens it has to live inside the generator" | covered |
| M1 Mac, 3.14, localhost, shape not decimals | Measure | "Yours should match in shape, if not to the decimal" | covered |
| M2 Fake LLM direct 1,000: 2.9 / 2.5 | Measure | "wall time about two point nine seconds, median two and a half" | covered |
| M3 Sync: 2.0; 10.1/6.0; 40.2/20.1; no errors | Measure | "Zero errors. That's the \"it doesn't crash, it queues\" claim" | covered |
| M4 8 threads: 6.1/4.0; 26.2/14.1; within a few percent | Measure | "thirteen waves, twenty-six seconds" | covered |
| M5 200 threads 2.3 s; expensive per waiter | Measure | "Threads aren't bad at waiting. They're expensive per waiter" | covered |
| M6 FastAPI async 2.1; 3.0/2.6 | Measure | "Two hundred in flight, three seconds wall, median two point six" | covered |
| M7 def + requests 100: ~6/~4, 40-wide waves | Measure | "Those are waves forty wide" | covered |
| M8 time.sleep(2) at 10: 22.1 s for all; 2.006 s log | Measure | "Twenty-two point one seconds, and that's for every request" | covered |
| M9 cost.py: 37 MB/0.9 MB; 370/8.5; refused/84 | Measure | "A hundred thousand tasks: about eighty-four megabytes" | covered |
| M10 Spark VIRT tens of GB, RES modest | Measure | "Reserved isn't used." | covered |
| K1 Backlog 128 / 4096 since 5.4; 434 of 1,000; door not crash | Break It | "four hundred thirty-four of the thousand" | covered |
| K2 Three fixes; tokenizer vs legacy SDK | Break It | B: "That's CPU... Process pool." | covered |
| K3 500 via one client 7.7 s + one 500 error; 20 x 50 -> 2.5 s; profile | Break It | "a median of seven point seven seconds and one server error" | covered |
| K4 No semaphore, 5,000; unbounded gather | Break It | "That's what an unbounded gather does to someone else's API" | covered |
| E1 100 requests: backlog, 2k s, ~200 last, ~100 median, 0.5/s, fails if backlog fills or clients time out | Problem + Predict + Measure | "or if clients get tired and time out before their turn comes" | covered (fixed: client-timeout failure path was MISSING in draft) |
| E2 "Async is a queue" correction | Close | "The sync server already had a queue... the waits overlap instead of adding up" | covered |
| E3 gather: 6 -> 2 s; 3x in flight; limits; dependent calls; TaskGroup cancel | Fan-out | "three times as many calls in flight against the provider" | covered |
| E4 One async process: waiting not limit; ~1 ms -> ~1,000/s; plain walls; more processes | Limits | "which is only a few megabytes of tasks" | covered |
| E5 def -> async def slower; fixes; confirm with debug mode | Traps | "Now your teammate makes it async def, and it still calls requests inside" | covered |
| G1 Go Deeper: Kegel, Beazley | Origin; toy loop | "David Beazley did it in a talk at PyCon in twenty fifteen" | covered |
| C1 Connections: GPU decoding; Fireworks + Little's Law | Close | "During decoding, is the GPU computing, or is it waiting on memory?" | covered |

## Fixes made during the coverage pass

- E1: added the second failure path (clients time out before their turn) to the Problem section.
- I52: the draft called the search an LLM call; corrected to "an LLM call to summarize, another to classify, and a search".
- I36: "context switch" was used without explanation; now "switch the CPU over to it, a context switch".
- B1: removed "roughly what prefill feels like", a claim the lesson body does not make.
- B4: removed "because the wall clock can jump", a reason the lesson does not give.

## Number check

Every number in the script was checked against the lesson: dates (1999, 2000, 2002, 2004, 2009,
2014, 2015, 2001, 1961, early 1980s, PyCon 2015), latencies and timings (2 s, 0.1 ms, 0.5 ms,
99.97%, 5 ms / 99.75%, 6 billion cycles at 3 GHz, Predict waves, all Measure rows, 2.01 s, 7.5 s,
4.7 s, 7.7 s, 2.5 s, 22.1 s, 2.004 / 2.006 s), sizes (8 MB, 38 KB, 370 MB, 0.9 KB, ~10 MB, 8.5 MB,
84 MB, 37 MB, 65 MB, 12,000 thread cap, 40x), limits (256, 10,240 said as "about ten thousand",
128, 4096 / kernel 5.4, pool 100, ~50 per client, ~40 FastAPI threads, semaphore 64, timeout 5 s and
600 s, debug threshold 0.1 s), and Break It counts (434 of 1,000; 20 clients of 50). The ring
figure's "700 ms vs 2,700 ms" is computed from the WaitingLoop component's task script (waits
T1 400+200, T2 300, T3 600+100, T4 3x200, T5 500), which is what the figure displays at the end.
Sync-1-worker 20-request median 20.1 is said "about twenty"; 8-thread 100-request median 14.1
"about fourteen"; def + requests 6.2 / 4.1 "about six / about four".
