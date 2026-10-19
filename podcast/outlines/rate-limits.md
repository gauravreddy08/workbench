# Outline: rate-limits

Source: src/lessons/rate-limits.mdx. Curriculum: "Rate limits and backpressure."

## The one big idea

A system with no way to say "slow down" doesn't slow down under overload; it stays fully busy doing
work nobody is waiting for anymore, and useful output falls to zero. The fix on both ends is the
same lesson TCP learned in nineteen eighty-six: refuse early and cheaply, push back on whoever feeds
you, and when you're the one being refused, back off with randomness instead of hammering harder.

## Opening scene

Two scenes, same problem. First: he fires twenty thousand relevance judgments at Claude with one
gather call; the console fills with "too many requests", his sleep-and-retry comes in waves, twenty
minutes later it's barely a third done, and he's under his per-minute limit. Second, flipped: his
reranker at work gets flooded by a backfill job at twice capacity, and instead of getting slower,
nothing succeeds, CPU is pegged, and it stays broken after the job stops.

## Wrong mental model B voices

Straight from the diagnostic, which the lesson quotes: he thought a sync server "crashes" under load.
B says "it'll just crash, or get twice as slow." A: it doesn't crash; it does something worse, it
keeps running and stops being useful. Second: "a per-minute limit means I can send that many in a
minute however I like." Third: "if it fails, just retry after a second."

## Story beats

1. The two scenes. Same problem from both ends.
2. Nineteen eighty-six: the Berkeley link that dropped to a tiny fraction of its speed with no cable
   broken. Every computer resending lost packets; queues full of copies. Nagle had named it:
   congestion collapse. Jacobson and Karels taught TCP to treat loss as a signal to send less.
3. What overload actually does: more arrives than leaves, so the line grows forever, wait grows
   forever. Then the timeout: clients give up, the server doesn't know, does the work anyway, sends
   answers to closed connections. Throughput versus goodput, in plain words. Laptop insight: the
   server kept working for many seconds after every client had gone home.
4. Say no early: load shedding with a bounded queue. A fast no is a gift. Goodput stays pinned at
   capacity however hard you push. Size the queue in time, not items. Drop requests that are already
   dead when they reach the front.
5. Backpressure: say "wait" instead of "no". TCP's window, the semaphore he already used. Every queue
   bounded; one unbounded buffer anywhere swallows the signal.
6. Rate limiting is about who gets the capacity. Token bucket in plain words: refill rate is the
   long-run average, bucket size is how big a burst. It cares about your burst, not your average.
7. Client side: retries are load. Retry storm and multiplication across layers. Exponential backoff.
   Then jitter: synchronized clients stay in lockstep; randomness spreads them. Laptop insight: four
   hundred clients took nearly a minute without jitter, a little over the ideal with it. Ethernet
   solved it the same way. Bound the total; don't retry things that will fail the same way.
8. Circuit breaker, briefly: stop calling a dead service, which protects you too.
9. Back to his script: a per-minute limit is a refill rate, and gather over twenty thousand is the
   deepest burst there is. Synchronized sleep-one-second retries made the waves. Token limits, not
   just request limits. The well-behaved client: cap concurrency, pace with your own bucket, read the
   headers, jittered backoff, caching, and the batch API if you don't need answers now.
10. Ending: B restates; A sharpens that a no is protection, and that "stop making it worse" is the
    whole thing.

## Numbers worth saying (five)

- Twenty thousand judgments.
- Nineteen eighty-six.
- Twice capacity in the reranker scene.
- Four hundred clients: nearly a minute versus a few seconds.
- Per-minute limit as a refill rate (no number).

## Left to the written lesson

The capacity arithmetic, the goodput formula and Predict, the goodput figure, measured tables, memory
per queued request, the four counting algorithms in detail (fixed window, sliding log, sliding
counter, leaky bucket) and their comparison table, GCRA, HTTP status code details and header names,
distributed limiting in Redis with Lua, fail open versus closed, Anthropic's RPM, ITPM, OTPM names and
headers, five-two-nine and spend limits, all Build tasks and code, Break It specifics, Go Deeper.
