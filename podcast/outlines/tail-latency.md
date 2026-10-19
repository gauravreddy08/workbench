# Outline: tail-latency

Source: src/lessons/tail-latency.mdx. Curriculum: "p99 and load testing."

## The one big idea

How fast a system feels is decided by its slow few requests, not its typical one. Those slow
requests get common when one request waits on many machines, they explode as a server gets close to
full, and a load test that waits for each answer before sending the next one hides them, because it
backs off exactly when the server struggles.

## Opening scene

He load-tests a service before shipping: sixteen workers, clean numbers, ships. A week later the
real dashboard shows the slow end over a second, with cliffs every few minutes. Same code. Which
number lied? The load test did.

## Wrong mental models B voices

- He got "p99 matters" right in the diagnostic, so B starts confident: "I know p99, the average hides
  the slow ones." A agrees and takes it further.
- "If the server's only busy most of the time, there's room left." (Ninety percent busy sounds like
  ten percent spare.)
- "Sixteen workers hammering it is basically sixteen users." The closed-loop trap.
- "Hedging is free speed, so send both every time." Fails when slowness is load.

## Story beats

1. The shipped-it-and-it-lied scene. "The test measured a gentler world than the one you shipped into."
2. Latency is a lopsided pile: a hard floor (the work itself), most requests near it, a long thin tail
   from rare things that only add time (waiting in line, pauses, a noisy neighbour, cold caches, a
   lost packet). Percentile in plain words; p fifty is the median; why the mean describes nobody.
3. Google, early twenty tens: one search touches hundreds of machines. Dean and Barroso, "The Tail at
   Scale". Fan-out: the user waits for the slowest of many, so each backend's rare bad moment becomes
   most users' normal experience. The backend's tail becomes the product's median.
4. Queues. Erlang counting phone calls. Barista picture. Utilization in plain words. Waiting grows
   like one over the spare capacity: flat, then a bend (the knee), then nearly vertical. Variability
   makes it worse at the same load. Why people run servers well under full.
5. Back to the lie: closed loop versus open loop. Closed loop fixes how many are in flight, so it
   backs off when the server slows; it can never push past the knee. Open loop fixes the schedule,
   like real users who keep clicking. Gil Tene names coordinated omission: the generator and server
   "coordinate" and the slow requests are omitted. Fix: open loop, and time from when the request
   was supposed to go out.
6. Laptop insight: closed loop at sixteen workers looked calm; open loop at a hair more traffic gave a
   slow end of about ten seconds, because the queue grew for the whole test.
7. Two practical bits, briefly: you need lots of samples to see one in a hundred; you can't average
   percentiles, but HDR histograms add (keep counts, compute at the end).
8. Cutting the tail: treat slowness like failure. Timeouts, retries (and retry storms), hedged
   requests set near the slow end so only a few get a second copy. Hedging helps when slowness is
   about the machine, hurts when slowness is load (measured: made it worse). Only hedge things safe
   to do twice.
9. Ending: B restates; A sharpens that the knee and the honest load test are the same lesson: the
   tail is what users feel, and you only see it if you send traffic that doesn't care how you're doing.

## Numbers worth saying (four)

- One in a hundred (what p ninety-nine means).
- A hundred backends: nearly two out of three user requests hit somebody's slow end.
- Sixteen workers (the opening test).
- About ten seconds versus a calm test, for a hair more traffic.

## Left to the written lesson

The M over M over one formula and its table, the exponential percentiles, Kingman's formula, all
Predict boxes and their arithmetic, the fan-out formula and p ninety-nine point three, sample-count
table, HDR bucket details and size, the BigTable and MapReduce numbers, tied requests and backup
tasks, all code and tasks, the Measure tables, Break It details (semaphore, averaging windows,
generator bottleneck), the Explain It Back numbers, Go Deeper.
