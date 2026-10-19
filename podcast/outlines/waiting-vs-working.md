# Outline: waiting-vs-working

## The one big idea

Code is either working (the processor busy) or waiting (the processor idle until an answer comes
back), and code around models is almost all waiting. A one-worker server under load doesn't crash,
it queues, because its one worker stands in front of every network call. Async isn't a queue: it's
one worker that never stands still, pausing each task where it waits and asking the operating
system to wake it when any connection is ready. Its one rule: never block the loop.

## Opening scene

His FastAPI service in front of an LLM. A teammate points a script at it with fifty requests at
once. The first user waits two seconds, the fiftieth about a hundred. CPU is flat near zero.
Nothing errored. The machine is doing nothing and nobody gets answers.

## The wrong mental model B voices

His diagnostic, nearly verbatim: "a two-second request would take like two hundred seconds and the
server would probably crash, so we'd use something like async, which can be in a queue or
something." First half right; "crash" and "async is a queue" are the wrong picture. Later B assumes
switching an endpoint to async def always makes it faster.

## Story beats

1. The fifty-request scene; B's diagnostic answer; A keeps the right half and fixes the two wrong
   pieces: requests are parked in the kernel's line, not dropped; there was already a queue, that's
   the problem.
2. Two chefs and a pizza oven: one stands watching each pizza, the other starts the next one and
   comes back when the timer dings. Same chef, same oven. Hiring ten chefs is threads.
3. Machine terms for the first chef: a blocking read puts the thread to sleep; it costs nothing but
   can't do anything else. Incoming connections wait in the kernel's listen backlog. One cashier,
   long line.
4. Origin: Dan Kegel's C10K page in nineteen ninety-nine. Thread-per-connection servers drowned at
   ten thousand clients. The answer: one thread, many connections, ask the kernel which ones have
   data. epoll and kqueue arrived; nginx, Node, and Python's asyncio followed.
5. Machine terms for the second chef: non-blocking sockets, and one call that sleeps until any of
   many sockets is ready. The event loop's routine. Never two tasks at once; never idle while
   there's something to do. Concurrency with no parallelism (re-explain from last episode).
6. Pausing a function halfway: generators, whose frames live on the heap so they can be frozen
   (re-explain). async def makes a pausable function; await means "I'm willing to be paused here".
   Code between awaits runs uninterrupted: the simplification and the trap. When I built the toy
   loop, a few dozen lines ran real async functions.
7. Little's law, in words: how many are open at once is how fast they come times how long each
   stays. At a couple of hundred, threads are genuinely fine. At thousands to tens of thousands, the
   cost per waiter decides it: an idle task is about forty times cheaper than an idle thread, and the
   Mac caps a process's threads.
8. What limits one async process: the working. Each request still needs a sliver of CPU on the one
   thread. The load generator itself became the bottleneck: always check its CPU.
9. The trap: a time.sleep, a sync HTTP call, a sync database driver, or heavy CPU work inside async
   def freezes every request at once. Worse than sync: the median becomes the worst case. When I
   planted a sleep, even the luckiest request waited for everyone's. Debug mode names the culprit.
   Fixes: async libraries, push blocking calls to a thread, CPU work to a process.
10. FastAPI's surprise: plain def runs in a thread pool of about forty; async def calling requests is
    the worst of all. B's "async def is faster" corrected.
11. Async spreads up the call chain (what color is your function); decide at the edges.
12. Fanning out inside one request: independent calls go from the sum of the waits to the slowest
    one. A semaphore caps what's in flight: backpressure.
13. Where his diagnostic was right after all: flood the kernel's line and new connections get turned
    away at the door. Not a crash inside.
14. Ending: B restates; A sharpens: async only helps waiting, the work still adds up on one thread,
    and one blocking line ruins everyone.

## Numbers worth saying

- Two seconds per call; fifty requests; the last one about a hundred seconds.
- FastAPI's thread pool of about forty.
- An idle async task about forty times cheaper in memory than an idle thread.

## Left to the written lesson

The to-scale call figure and cycle counts, the interactive timeline and ring, the wave arithmetic,
select history, the toy loop code and its reference run(), Little's law notation and worked numbers,
per-waiter memory table and thread caps, the CPU ceiling arithmetic, ulimit and backlog values,
all Build tasks (fake LLM, toy loop, Flask server, loadgen with its three httpx pitfalls, threads,
FastAPI rebuild, SSE streaming), the Measure table, cost.py, the four Break It cases in detail,
TaskGroup versus gather semantics, Explain It Back answers, Go Deeper.
