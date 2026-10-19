# Outline: observability (story-first)

Source: src/lessons/observability.mdx. Curriculum: "Logs, metrics and traces." How do you know what a
running system is doing, and why it got slow at 3am?

## The one big idea

The code is the same for every request and the behavior isn't, so you can't debug production by
reading code. The only evidence is what the running program wrote down while it happened. Three
kinds of writing (a line per event, running tallies, the timed path of one request) each answer a
different question, and one shared ID ties them together. Then: wake people on what users feel,
not on what the machine is doing.

## Opening scene

His Spark serving Llama to a teammate's agent harness. Message: "the agent sometimes stalls for a
second before answering. Not always. Started last night maybe?" He runs five requests by hand: all
fast. Scrolls forty thousand lines of "got request" / "done" with no way to pair them. Reads the
code: identical to last week, because it is.

## Wrong mental model B voices

"Just read the code" / "just print more". Later: "put average latency on a dashboard", "alert when
the CPU is high". (The diagnostic got p99 right, so B knows the tail matters but still reaches for
the average out of habit.)

## Story beats

1. The stall nobody can reproduce; the code hasn't changed; what changed is everything around it
   (inputs, load, a sick dependency, two requests grabbing one lock). Name: observability.
2. Origin: Google search fanning out to thousands of machines, every team's dashboard green, nobody
   can see one request's path. Dapper: an ID at the front door, passed on every call, timed
   segments stitched into a tree, only a small sample recorded. Leads to OpenTelemetry today.
3. The restaurant: order slips, tally board, a ticket stamped at every station. Logs, metrics,
   traces. Each is cheap where another is expensive.
4. Logs that work: one structured line per event, with the request ID on every line, carried
   without passing it by hand. The cost nobody tells you: at scale logs are a storage bill, so you
   keep errors and slow ones and sample the rest.
5. Metrics: throw away detail on purpose so you can keep it forever and add it across machines.
   The trap: label by user and the number of separate series explodes and takes down monitoring.
   Unbounded things go in logs and trace attributes.
6. The average lies: a fault on a small slice of requests barely moves the mean, but jumps the
   tail. And you can't average percentiles across servers; you add the bucket counts, then estimate.
7. Traces: one request kept whole, as a waterfall. The faults that only a trace sees: a slow
   database before the server is even called (server metrics perfect), a lock whose code takes
   microseconds but waits a long time (a CPU profiler calls it idle). Context travels in a header.
8. Who wakes you at 3am: a target ("almost all first tokens within a quarter second"), the budget
   it leaves, how fast you're burning it. Page on symptoms, not causes; CPU alerts fire when all is
   well and stay silent when it isn't, and that's how real pages get slept through.
9. The hunt on his own server: what surprised me was that every planted fault was nearly invisible
   on an average and obvious on the tail, and the right answer for a slow, small burn is a ticket
   in the morning, not a page.

## Numbers worth saying

- About five percent of requests hit the planted fault.
- Dapper recorded about one request in a thousand.
- Ninety-nine percent within a quarter of a second, over a month.
- That's it.

## Left to the written lesson

The JSON formatter and contextvar code, Prometheus histogram text, cumulative buckets, PromQL right
vs wrong queries, the traceparent byte layout and flags, OTLP ports, docker compose, Grafana panel
list, RED and USE acronyms spelled out, burn-rate formula and the fourteen-point-four / six thresholds,
the cost-per-line and per-span measurements, the metrics table for LLM servers, continuous and
wall-clock profiling detail, all Build It tasks, the Measure table, Break It, Explain It Back.
