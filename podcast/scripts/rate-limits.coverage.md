# Coverage: rate-limits

Lesson src/lessons/rate-limits.mdx vs podcast/scripts/rate-limits.md. Item IDs match
podcast/outlines/rate-limits.md. No item was MISSING after the check. Numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs re-explained | Overload; Little's Law; Backpressure | "a semaphore of eight, which is just a gate"; "Remember Little's Law from last time. It's a really simple rule" | covered |
| P1 20,000 pairs, Claude judges, gather one line | Problem | "Twenty thousand query-document pairs" | covered |
| P2 429s, SDK retries twice, raises | Problem | "The SDK quietly retries each one twice, then gives up" | covered |
| P3 sleep 1 s, waves, 30% after 20 min, "under the limit" | Problem | "Twenty minutes later it's thirty percent done"; B: "well under my per-minute number" | covered |
| P4 reranker 300/s 40 ms, backfill 600/s, zero succeed, broken another minute | Problem | "stays broken for about another minute" | covered |
| P5 same problem, two ends | Problem | "the same problem, just seen from two ends" | covered |
| O1-O3 1986, 400 yards, 32,000 to 40 bps, Nagle | Origin | "drops from thirty-two thousand bits per second to forty" | covered |
| O4 Jacobson and Karels 1988, send less, slow start, halve, exp backoff | Origin | "Cut your sending rate in half when you lose something" | covered |
| O5 thesis | Origin | "stop making it worse" | covered |
| I1 8 slots, 100 ms, capacity 80/s | Overload | "Eighty requests a second. That number is its capacity" | covered |
| I2 120/s, 1 s timeout, term | Overload | "even if it's just a default buried somewhere" | covered |
| I3 queue 40/200/400 | Overload | "After one second it holds forty. After five seconds, two hundred" | covered |
| I4 Little's Law 400/80 = 5 s, no steady state | Overload | "Four hundred divided by eighty. Five seconds" | covered |
| I5 after ~1.8 s all give up, work to closed connection | Overload | "sends the answer... to a closed connection" | covered |
| I6 throughput vs goodput | Overload | "Throughput eighty, goodput zero" | covered |
| F1 figure 001 | Overload | "If you drew it, it'd go left to right" | covered |
| I7 MacBook runs: 156 ms, 216/1,200, 300 abandoned, 112/2,400, 1,500, 19 MB | Overload | "two hundred and sixteen out of twelve hundred" | covered |
| PR1 Predict 3.6/s, 72, 1.8 s, 216, 21.6 | Predict, longer overload | "Spread over sixty seconds, it's three point six" | covered |
| F2 figure 002 sliders | Predict, longer overload | "Drag the overload duration out to a minute" | covered |
| I8 congestion collapse, any system | Predict, longer overload | "a Postgres connection pool... a support phone line" | covered |
| I9 doesn't crash (diagnostic) | Predict, longer overload | "your gut model, from the diagnostic" | covered |
| I10 shed at 16 = 200 ms, 503, terms | Load shedding | "If sixteen requests are already waiting" | covered |
| I11 816 / 1,584, p99 ~300, 480 still 816 | Load shedding | "eight hundred and sixteen successes and fifteen hundred and eighty-four" | covered |
| I12 serve some quickly vs nobody slowly, 5 ms vs 30 s | Load shedding | "a fast no is kind of a gift" | covered |
| I13 size in time, ~70 | Load shedding | "anything over about seventy waiting is pure harm" | covered |
| I14 deadlines, gRPC | Load shedding | "G R P C does this on every call" | covered |
| I15 drop oldest/LIFO, Fail at Scale, delay signal, CoDel | Load shedding | "last in, first out when overloaded" | covered |
| I16 priority | Load shedding | "shed the cheap ones first" | covered |
| I17 backpressure term | Backpressure | "The slow thing at the end pushes back up the pipe" | covered |
| I18 TCP receive window; semaphore 64 | Backpressure | "That's called the receive window"; "The sixty-fifth task waits" | covered |
| I19 rule; chain | Backpressure | "every queue in a pipeline should be bounded" | covered |
| F3 figure 003 | Backpressure | "picture a chain of four boxes" | covered |
| I20 hidden unbounded buffers | Backpressure | "Python's thread pool executor, whose internal work queue is unbounded" | covered |
| I21 95% gets 95%; rate limiter term | Rate limiting | "it gets ninety-five percent of the successes" | covered |
| E2 shedding vs backpressure vs rate limiting | Rate limiting; close | "it's worth getting the three straight" | covered |
| I22-I23 fixed window, 2x, synchronized reset | Rate limiting | "you just let through ten in a blink. Twice the limit" | covered |
| I24 sliding log, 10,000 timestamps | Rate limiting | "up to ten thousand timestamps per client" | covered |
| I25 sliding counter, Cloudflare | Rate limiting | "Cloudflare popularised. The sliding window counter" | covered |
| I26 token bucket, b + r T | Rate limiting | "bucket size plus the refill rate times that stretch" | covered |
| I27 lazy refill, GCRA | Rate limiting | "That's called lazy refill"; "G C R A" | covered |
| I28 leaky bucket two meanings | Rate limiting | "As a queue, requests go into a line that drains at exactly R" | covered |
| F5 figure 005 steady/spike, 10 through 20 rejected | Rate limiting | "lets about ten of the spike through and rejects about twenty" | covered |
| I29 table roundup | Rate limiting | "So if you line all four up" | covered |
| I30 429 (RFC 6585, 2012) vs 503 | Saying no | "R F C six five eight five, back in twenty twelve" | covered |
| I31 Retry-After, (1 - 0.3)/r | Saying no | "seven tenths divided by the refill rate" | covered |
| I32 limit headers, IETF draft | Saying no | "There's an I E T F draft" | covered |
| I33 4x, 64x, retry storm | Retries | "four times four times four... sixty-four" | covered |
| I34 exponential backoff | Retries | "Rule one, back off exponentially" | covered |
| I35 jitter, lockstep, 24, Brooker, Ethernet | Retries | "Ethernet solved this exact problem the same way" | covered |
| I36 bound total, retry budget, gRPC throttling, what to retry | Retries | "Four hundred, bad request: no" | covered |
| I37 jitter on top of Retry-After | Retries | "you've just recreated the lockstep" | covered |
| PR2 Predict 52 s vs 7.5 s, 3,323 vs 2,384, ranges | Predict, retry storm | "Without jitter, it was about fifty-two seconds" | covered |
| F6 figure 006, ~20 line, 779 more | Predict, retry storm | "Another seven hundred and seventy-nine attempts" | covered |
| E4 backoff and jitter substance | Retries; Predict | covered by the above turns | covered |
| I38-I39 circuit breaker states, 50% of 20, 30 s, fallbacks | Circuit breakers | "more than half of the last twenty calls failed" | covered |
| I40 protects you, 1,000 stuck | Circuit breakers | "that's a thousand stuck requests" | covered |
| I41 4 workers, 70 to 280 | Distributed | "Up to two hundred and eighty" | covered |
| I42 Redis, race, Lua, threads-lesson callback, Redis clock | Distributed | "It's the same race as in the threads lesson" | covered |
| I43 latency, per-region budgets | Distributed | "split into a budget per region" | covered |
| I44 fail open/closed, local backstop | Distributed | "most systems fail open for rate limits" | covered |
| I45 batch 50, Stripe | Distributed | "Each process grabs fifty tokens" | covered |
| E5 20 replicas, 1,000/s, 100,000 ops, shard | Distributed | "twenty thousand total"; "very roughly a hundred thousand simple operations" | covered |
| I46 RPM, ITPM (uncached), OTPM | LLM APIs | "only uncached input tokens count" | covered |
| I47 OpenAI headers | LLM APIs | "x ratelimit remaining tokens" | covered |
| I48 token bucket, 60 RPM as 1/s | LLM APIs | "might be enforced as one request per second" | covered |
| E3 / I49 story of the script, 2 SDK retries, sleep(1) lockstep, 3,000-token ITPM | LLM APIs | "The waves you saw were lockstep retries" | covered |
| I50 headers, 529, spend cap, acceleration limits | LLM APIs | "A five twenty-nine, overloaded" | covered |
| I51 concurrency = rate x latency, ~50 | LLM APIs | "about fifty in flight is the most that can possibly help" | covered |
| I52 client bucket, count tokens, 4 chars/token | LLM APIs | "about four characters per token" | covered |
| I53 headers, retry rules, caching | LLM APIs | "Third, read the headers" | covered |
| I54 Batches API, 100,000, half price | LLM APIs | "costs half as much" | covered |
| B0 setup, 256 files, server stats, modes, restart | Build It | "macOS defaults to two hundred and fifty-six" | covered |
| B1 open vs closed loop, coordinated omission, httpx pool 100 | Build It | "That mistake has a name, coordinated omission" | covered |
| B2 task 1 sweep, poll stats, RSS per request | Build It | "you'll see 'finished' still climbing" | covered |
| B3 task 2 bucket, monotonic, wait formula, no lock, 10 yes 5 no 0.2 s, rate 70 burst 20 | Build It | "ten yeses, then five nos" | covered |
| B4 task 3 shed at 16, deadline 0.8 s, order, 1000 test | Build It | "Which one protects goodput" | covered |
| B5 task 4 backoff function, retryable set, warm-up, 128 cap, Retry-After predict | Build It | "macOS caps its line of pending new connections at a hundred and twenty-eight" | covered |
| B6 task 5 polite client, n > burst, zero 429s, SDK retries, raw response, 50 requests, review | Build It | "the goal is zero four twenty-nines" | covered |
| B7 task 6 Redis Lua, expiry, fail open/closed | Build It | "does your server fail open, or closed?" | covered |
| B8 done-when | Build It; Measure | folded into task outcomes | covered |
| M1 reference rows | Measure | "At a hundred a second, goodput's about thirty-five" | covered |
| M2 one-line model, 144 and 216 exact | Measure | "the measured number was exactly a hundred and forty-four" | covered |
| M3 success-only p99 trap | Measure | "Always graph errors and timeouts right next to latency" | covered |
| M4 dead work 20 s, 19 MB, 10-30 KB, 12 GB | Measure | "that's twelve gigabytes" | covered |
| M5 81 not 80, p99 = 100 + 200 | Measure | "Eighty-one? I thought eighty was the most" | covered |
| M6 719 / 717, bound 720 | Measure | "Seven hundred and twenty" | covered |
| M7 storm numbers, Retry-After rows unmeasured | Measure | "The retry after versions weren't measured" | covered |
| K1 four workers ~4x | Break It | "your seventy a second becomes roughly two eighty" | covered |
| K2 retry amplifier, budget 10% | Break It | "You offered one and a quarter times capacity" | covered |
| K3 queue of 2,000 = 25 s | Break It | "twenty-five seconds of work" | covered |
| K4 30 s timeout, p99 ~5 s, refresh | Break It | "They hit refresh. Which is a retry with no backoff" | covered |
| E1 300 to 600 substance | Problem; Overload; Measure | covered across "goodput zero", dead work, retry load | covered |
| G1 sources | Close | "read the Jacobson and Karels paper... Marc Brooker's writing" | covered |
| C1 connections | Close | "it sets up the p ninety-nine and load testing lesson" | covered |

Derived (not written in the lesson): sliding-counter worked example (80 x half + 50 = 90); Retry-After at
10 tokens/s = 70 ms; token bucket ten plus forty = fifty over ten seconds; why the five rejected waits are
all 0.2 s and five tokens back after 1 s (the lesson poses these as questions); spike pattern details
from the figure code (steady two a second, thirty in about half a second); one-line model at 160/s
walked as 80 x 0.9 = 72, line grows 80/s, 0.9 s x 160 = 144 (lesson gives 0.9 s and 144).
