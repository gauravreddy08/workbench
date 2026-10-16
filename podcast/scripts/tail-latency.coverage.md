# Coverage: tail-latency

Lesson src/lessons/tail-latency.mdx vs podcast/scripts/tail-latency.md. Item IDs match
podcast/outlines/tail-latency.md. "Fixed" = was MISSING or wrong in the first draft and has been
added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs (loadgen semaphore, Little's Law, baseline 20 samples / 1% utilization) | Pile; Queues; Closed/open | "Remember the benchmark you did against Fireworks"; "a gate with c tickets"; "Quick reminder of what that is" | covered |
| P1 16 workers, p50 83, p99 136, ship | Problem | "Median, eighty-three milliseconds... a hundred thirty-six" | covered |
| P2 p99 over a second, cliff to ten seconds | Problem | "every few minutes there's this cliff where it touches ten seconds" | covered |
| P3 B blames production | Problem | B: "my instinct is production" | covered |
| P4 polite workers, gentler world | Problem | "It measured a gentler world" | covered |
| P5 three ideas | Problem | "that's one of three ideas in this episode" | covered |
| O1 Google search, slowest slice | Origin | "the answer couldn't come back until the slowest slice did" | covered |
| O2 Dean and Barroso 2013 CACM, tolerate like failure | Origin | "In February twenty thirteen Jeff Dean and Luiz André Barroso" | covered |
| O3 Tene, Azul, talk, coordinated omission, HdrHistogram | Origin | "Gil Tene. He was C T O of a company called Azul Systems" | covered |
| I1 thousand requests, thousand numbers | Pile | "You get a thousand different numbers" | covered |
| F1 Figure 001 floor/hump/tail, 14/26/142/190 | Pile | "the median sits in the hump at about fourteen milliseconds" | covered |
| I2 diagnostic credit | Pile | "You got that right in the diagnostic" | covered |
| I3 percentile definition, 120 ms example | Pile | "p ninety-nine is a hundred twenty milliseconds means" | covered |
| I4 median = p50, p99, p99.9 | Pile | "nine hundred ninety-nine out of a thousand of the way along" | covered |
| I5 every second at 100/s; 300 requests, three times | Pile | "They'll meet your p ninety-nine about three times" | covered |
| I6 mean 110 ms, 11x / 90x, tug of war | Pile | "It's about a hundred ten" | covered |
| I7 can't average percentiles, 275, per-second p99s, either direction | Pile | B: "Two seventy-five"; "sixty per-second p ninety-nines" | covered |
| I8 p99 next to n; 20 samples = slowest | Pile | "With twenty samples, p ninety-nine is just your slowest request" | covered |
| I9 wall vs open right edge | Lopsided | "a request can't be faster than its work" | covered |
| I10 waiting in line | Lopsided | "Waiting in line is the big one" | covered |
| I11 garbage collector, 50 ms | Lopsided | "a stop-the-world pause of fifty milliseconds" | covered |
| I12 backup, cron, noisy neighbour | Lopsided | "People call that one the noisy neighbour" | covered |
| I13 cold caches, up to 1,000x | Lopsided | "up to a thousand times slower" | covered |
| I14 TCP resend floor ~200 ms | Lopsided | "that wait has a floor of about two hundred milliseconds" | covered |
| I15 locks | Lopsided | "the same database row, or the same mutex" | covered |
| I16 rare and large on a floor; every computer | Lopsided | "what latency looks like on, like, every computer" | covered |
| I17 search shards, RAG, agent tools | Fan-out | "One step of an agent calls three tools in parallel" | covered |
| I18 shards | Fan-out | "A shard is a slice of a big dataset" | covered |
| I19 fan-out, worst of N | Fan-out | "They see the worst of N draws" | covered |
| PR1 predict 63%, paper example | Fan-out | B: "Five?"; A: "About sixty-three percent" | covered |
| F2 calculator figure | Fan-out | "There's a slider for how many backends" | covered |
| I20 median user p99.3 | Fan-out | "each backend's p ninety-nine point three" | covered |
| I21 backend team wrong number | Fan-out | "is watching the wrong number" | covered |
| I22 slowest 5% of leaves = half of root p99 | Fan-out | "the slowest five percent of the leaf requests" | covered |
| I23 independence caveat | Fan-out | B: "This all assumes the backends are slow independently" | covered |
| E2 50 backends 39%, p98.6, 500 backends >99%, one nine per 10x | Fan-out | "about thirty-nine percent of user requests" | covered |
| I24 barista | Queues | "A coffee shop with one barista" | covered |
| O4 Erlang 1909 | Queues | "Nineteen oh nine. Agner Krarup Erlang" | covered |
| I25-I27 arrival rate, service time/rate, utilization | Queues | "Three names, and they're all simple" | covered |
| I28 M/M/1 | Queues | "has a funny name, M M one" | covered |
| I29 T = S/(1-rho) | Queues | "service time divided by the fraction of time the server is idle" | covered |
| I30 exponential, p50 0.69, p99 4.6x | Queues | "p ninety-nine is about four point six times the average" | covered |
| I31 table, 400,000 simulated | Queues | "simulating four hundred thousand requests" | covered |
| I32 1.8x work → 5x p99; 10% → 10x | Queues | "the server does one point eight times more work" | covered |
| PR2 predict 460, constant ~220 | Queues | "The simulation gives around two hundred twenty" | covered |
| F3 simulator figure | Queues | "Now picture a simulator for this" | covered |
| I33 hockey stick, knee, sharper in reality | Queues | "The bend is called the knee of the curve" | covered |
| I34 Kingman, two levers | Queues | "There's a rule called Kingman's formula" | covered |
| I35 50-70%, spike, Spark 1% | Queues | "this is why people run servers at fifty to seventy percent busy" | covered |
| E3 cut fleet by a third | Queues | B: "Someone wants to cut the fleet by a third" | covered |
| I36-I38 closed vs open definitions | Closed/open | "The first is closed loop"; "The second is open loop" | covered |
| I39 Little's Law, can't pass knee | Closed/open | "it can never push the server past its knee" | covered |
| I40 185/s p99 136 vs 190/s p99 10 s | Closed/open | "An open loop at a hundred ninety a second, a hair more" | covered |
| F4 freeze timelines | Closed/open | "Picture two timelines, one above the other" | covered |
| I41 coordinated omission definition, 9% | CO | "That's coordinated omission" | covered |
| PR3 predict 25.5 vs 473, 19x | CO | "Nineteen times different p ninety-nine" | covered |
| I42 fix 1 intended send time | CO | "measure from the intended send time" | covered |
| I43 fix 2 record corrected value | CO | "it's called record corrected value" | covered |
| I44 wrk / wrk2 / semaphore in loadgen | CO | "Your load generator starts the stopwatch after it gets through the semaphore gate" | covered |
| I45 samples table | Samples/HDR | "thirty-one to fifty-seven milliseconds" | covered |
| I46 ten past the percentile; 60,000; max with extra steps | Samples/HDR | "just a max with extra steps" | covered |
| I47 storage, naive summaries fail | Samples/HDR | B: "Couldn't you just keep counts in buckets?" | covered |
| I48 HDR layout, 185 KB | Samples/HDR | "about a hundred eighty-five kilobytes" | covered |
| I49 histograms add; Prometheus, OpenTelemetry | Samples/HDR | "Histograms add" | covered |
| I50 treat slowness like failure | Cutting | "Treat slowness like failure" | covered |
| I51 timeout | Cutting | "a bit above your p ninety-nine point nine" | covered |
| I52 retries, replica, retry storm, budget | Cutting | "That's a retry storm" | covered |
| I53 hedged request | Cutting | "Then the clever one. Hedged requests" | covered |
| F5 hedge timeline, 16 ms vs 100 | Cutting | "Done at sixteen milliseconds, cancel A" | covered |
| I54 delay at p95, BigTable 1,800 → 74 for 2% | Cutting | "from eighteen hundred milliseconds to seventy-four" | covered |
| I55 machine not request; two failure cases | Cutting | "tail slowness is often about the machine, not the request" | covered |
| I56 idempotency key | Cutting | "Not without an idempotency key" | covered |
| I57 tied requests | Cutting | "Tied requests, also from Dean and Barroso" | covered |
| I58 backup tasks, 44%, his world | Cutting | "forty-four percent longer" | covered |
| B0 setup, client 3 ms, ~1,000/s, hdrh import | Build It | "it imports as H D R H" | covered |
| B1 server knobs, 200 vs 185 | Build It | "Then a server with knobs" | covered |
| B2 closed.py, Little's Law prediction | Build It | B: "the rate is just one divided by how long each one takes" | covered |
| B3 open.py, two latencies, hints | Build It | "Finished minus intended, and finished minus actually sent" | covered |
| B4 sweep, plots, SLO, M/M/1 overlay | Build It | "Then a sweep" | covered |
| B5 CO task, HDR corrected, count vs sent | Build It | "Then you catch coordinated omission on purpose" | covered |
| B6 hedge task, review points | Build It | "Then have an agent review two things" | covered |
| B7 harness open-loop mode, Spark knee | Build It | "At a laughably low rate" | covered |
| B8 done when | Build It | "So by the end you've got four scripts" | covered |
| M1 setup and caveat | Measure | "M-series MacBook, Python three point fourteen" | covered |
| M2 default server numbers | Measure | "Default server, closed loop first" | covered |
| M3 closed never breaks, 15 ahead | Measure | "at most fifteen can be ahead of you" | covered |
| M4 cliff, duration signature, knee 130-150 | Measure | "A p ninety-nine that grows with test duration" | covered |
| M5 noise near knee | Measure | "runs near the knee are noisy" | covered |
| M6 CO table, corrected within 10%, double count | Measure | "its total count came out about double" | covered |
| M7 hedging table, 3 ms client, ignore p99.9 | Measure | "A hundred five down to twenty-one for four percent more" | covered |
| K1 hedge a busy server 39 → 58 → 64 | Break It | "It made it worse" | covered |
| K2 semaphore in open loop 52 vs 515 | Break It | "Measured from the gate, p ninety-nine was fifty-two" | covered |
| K3 averaging p99s 47/26, 46/402; HDR sum | Break It | "against a true four hundred two" | covered |
| K4 generator bottleneck, wrk2/k6/vegeta | Break It | "So at that point I'm benchmarking my benchmark" | covered |
| E1 p99 vs mean; averaging | Pile; HDR; Close | covered by I5-I7, I49 | covered |
| E4 CO avoidance | CO; Build It; Close | covered by I41-I46, B3, closing A turn | covered |
| E5 hedging help/hurt/delay | Cutting; Measure; Break It | covered by I54-I56, M7, K1 | covered |
| G1 Tail at Scale, Tene talk | Go Deeper | "it's The Tail at Scale itself. It's eight pages" | covered |
| C1 rate limits, load balancers, batching, observability | Go Deeper | "And into load balancers"; "you'll record histograms, not averages" | fixed (load balancers, observability added) |

Numbers check: all lesson numbers match. Fixed in pass: "those last two are the opening scene" (only c=16 is), a
made-up explanation of the c=1 throughput, and an unsupported "twice as long, twice as bad" line.
Derived (not written in the lesson): c=1 throughput 155/s implies about 6.5 ms per round trip; Kingman's
variability term is about one for random arrivals and service and about a half for constant service; with
four closed-loop workers four requests are caught per freeze; per-thousand-request example "ten squares at
ten backends" in the calculator description.
