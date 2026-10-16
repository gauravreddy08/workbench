# Coverage: load-balancing

Lesson src/lessons/load-balancing.mdx vs podcast/scripts/load-balancing.md. Item IDs match
podcast/outlines/load-balancing.md. "Fixed" = was MISSING or thin in the first draft and has been
added in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs re-explained | Problem; Shared store; Build It; Measure | "The operating system walls them off"; "Quick version: two workers both read the cart"; "That's coordinated omission"; "That's the knee from the p ninety-nine lesson" | covered |
| P1 scene: dict sessions, three copies, who are you / refresh | Problem | "Your next click says, 'who are you?'" | covered |
| P2 he got it right; separate heaps | Problem | B: "The login landed on one copy" | covered |
| P3 the open questions (pin forever, crash/deploy, LLM same machine, 40 ms vs 40 s) | Problem | "one L L M request takes forty milliseconds and the next one takes forty seconds" | covered |
| O1 1994 NCSA, Mosaic, Katz/Butler/McGrath, DNS rotation | Origin | "N C S A, the place that made Mosaic" | covered |
| O2 DNS caching keeps dead server; no return to same machine | Origin | "A dead server kept receiving visitors" | covered |
| O3 late 1990s balancer boxes: health + pinning | Origin | "dedicated load balancer boxes showed up to fix both" | covered |
| O4 2011 Wiggins, Twelve-Factor, factor six, sticky named, backing store | Origin | "Factor six says processes should be stateless" | covered |
| I1 vertical scaling, pros, catches | Bigger machine | "Three catches. There's a ceiling" | covered |
| I2 horizontal scaling, pros, catch | Bigger machine | "one of them dying is a partial loss" | covered |
| F1 Fig 001 scale up vs out | Bigger machine | "a dashed line labelled 'ceiling'" | covered |
| I3 do both in order; easy to copy = no state | Bigger machine | "Scale up until it hurts" | covered |
| I4 load balancer definition, traffic cop | What a LB is | "A traffic cop. Clients only ever know the balancer's address" | covered |
| I5 backend / upstream / target / replica | What a LB is | "nginx calls them upstreams" | covered |
| I6 two quieter questions | What a LB is | "It also answers two quieter questions" | covered |
| F2 Fig 002 where did my cart go, 401 | What a LB is | "Same cookie, different heap" | covered |
| I7 session, cookie, cookie travels data doesn't | What a LB is | "The data it points to does not" | covered |
| I8 state definition, kill test, examples | What a LB is | "If you could kill the process and restart it" | covered |
| I9 sticky (affinity, hash cookie/IP) vs stateless; patch vs fix | What a LB is | "Option one is a patch, option two is the fix" | covered |
| I10 envelopes, OSI layers 3/4/7 | L4 and L7 | "think of a request as a stack of envelopes" | covered |
| F3 Fig 003 what each balancer sees | L4 and L7 | "'L four sees this.'" | covered |
| I11 L4: per connection, fast, no cert, can't read cookie/retry; examples | L4 and L7 | "it can't tell a health check apart from a thirty-second generation" | covered |
| I12 HTTP/2, gRPC complaint | L4 and L7 | "'G R P C load balancing doesn't work.'" | covered |
| I13 L7 = reverse proxy; capabilities; cost | L4 and L7 | "A reverse proxy represents the servers" | covered |
| I14 both; nginx http vs stream | L4 and L7 | "Its stream section is L four" | covered |
| I15 round robin | Algorithms | "A, B, C, A, B, C" | covered |
| I16 random streaky | Algorithms | "Sometimes three in a row land on one server" | covered |
| I17 least connections, reacts | Algorithms | "This is the first algorithm that reacts" | covered |
| I18 fair by count not cost; 2,000-token essay, factor 100 | Algorithms | "That's a factor of a hundred apart" | covered |
| PR1 predict RR vs LC: 725 / 83, p99 3.6 -> 2.2, reasoning | Algorithms | "was seven hundred twenty-five milliseconds" | covered |
| F4 Fig 004 simulator and what you'd see | Algorithms | "watch server one's queue climb right off the top" | covered |
| I19 quarter vs seventh (0.5 of 3.5), unbounded; degraded machines | Algorithms | "That's a seventh" | covered |
| I20 many stale balancers, herd effect | Algorithms | "you get what's called a herd effect" | covered |
| I21 two choices, math in words, authors, Envoy/nginx | Algorithms | "Now the fullest bin grows like the logarithm of the logarithm" | covered |
| I22 two choices between in simulator, why | Algorithms | "the simulator models one balancer with perfect information" | covered |
| I23 weights | Algorithms | "you give it weight two" | covered |
| I24 want same server; hash mod N | Hashing | "hash the key, take the remainder" | covered |
| PR2 predict mod 3 -> mod 4: 75%, 12 cases, cold caches, N/(N+1) | Hashing | "So three of twelve stay" | covered |
| I25 consistent hashing, Karger MIT 1997, Akamai, clockwise, 1/N | Hashing | "Each key belongs to the first server you hit going clockwise" | covered |
| I26 virtual nodes 100-200 | Hashing | "A hundred, two hundred positions each" | covered |
| F5 Fig 005 hash ring | Hashing | "Move the slider one step in mod N mode" | covered |
| I27 nginx consistent (ketama), Maglev | Hashing | "Google's Maglev ... uses its own consistent hashing" | covered ("ketama" name dropped, not needed by ear) |
| I28 KV cache recap, prefix caching, chat/agent resend | Prefix routing | "It's called prefix caching" | covered |
| I29 prefill, TTFT, 10,000 tokens / 9,800 cached illustrative | Prefix routing | "If ninety-eight hundred of those tokens are already cached" | covered |
| I30 eight replicas, 1 in 8, seven copies, LC blind | Prefix routing | "seven G P Us end up filling their caches" | covered |
| I31 cache-aware routing, SGLang tree, Dynamo, llm-d, fallback, melting GPU | Prefix routing | "one melting G P U and seven idle ones" | covered |
| I32 sticky for speed fine, correctness trap | Prefix routing; Close | "Stickiness for speed is good" | covered |
| I33 five sticky failures, root cause | Sticky trap | "every deploy logs people out" | covered |
| I34 Redis definition, DB for never-lost, any server | Shared store | "Redis is an in-memory key-value server" | covered |
| I35 round trip 100-500 microseconds, under 1% of 40 ms | Shared store | "that's under one percent" | covered |
| I36 moved not removed; new SPOF | Shared store | "you moved the state, you didn't remove it" | covered |
| I37 concurrency back, lost update across machines, RPUSH, atomic | Shared store | "No Python lock can help you across machines" | covered |
| F6 Fig 006 stateless fleet | Shared store | "'state lives here, and only here'" | covered |
| I37b passive check, nginx defaults 1 and 10 s | Health checks | "one failure within ten seconds benches a backend for ten seconds" | covered |
| I38 active check, interval x threshold = 15 s | Health checks | "up to fifteen seconds" | covered |
| I39 shallow vs deep, fail open, panic threshold | Health checks | "Envoy calls it the panic threshold" | covered |
| I40 liveness vs readiness, weights loading restart loop | Health checks | "alive, but not ready" | covered |
| I41 retries, idempotent, POST, 502/504, LLM APIs are POST | Retries | "every one of them is a POST" | covered |
| I42 draining four steps, lame duck | Draining | "Google's S R E book calls the in-between state 'lame duck'" | covered |
| I43 SIGTERM/SIGKILL, grace 10/30 s, uvicorn, kill -9, preStop race | Draining | "A pre stop hook that just sleeps a few seconds" | covered |
| I44 SPOF definition, finger test | SPOF | "put your finger on each box" | covered |
| I45 nginx + Redis; VRRP/keepalived, DNS, cloud LB, replicated Redis; goal is knowing | SPOF | "It's knowing where they are" | covered |
| B0 setup, verified natively, zone line | Build It | "The zone line makes them share" | covered |
| PR3/B1 six cart calls: 2 succeed, order, gpu3/gpu6, no retry on 401 | Build It | "the cart ended up holding item three and item six" | covered |
| B2 sticky on sid fails (login had no cookie), uid fix, kill pinned server | Build It | B: "The login request... didn't have a session cookie yet" | covered |
| B3 Redis sessions, list append, TTL hour, thread pool, review | Build It | "the cart as a Redis list" | covered |
| B4 open-loop generator, coordinated omission, 136 ms, ~22/s, start 16 | Build It | "so a hundred thirty-six milliseconds" | covered |
| B5 compare three methods, push to 19 and 21 | Build It | "push to nineteen and twenty-one a second" | covered |
| B6 kill/stop/GET experiments, Docker caveats | Build It | "nginx, which looked up the name once at startup" | covered |
| M1 setup | Measure | "one nginx worker, sixteen requests a second for forty seconds" | covered |
| M2 three rows of numbers | Measure | "Round robin: median seven hundred twenty-five" | covered (p90s rounded: 1.9 s, 1.5 s; two-choices p90 omitted as not needed) |
| M3 218/218/217 even counts uneven work | Measure | "Two hundred eighteen, two hundred eighteen, two hundred seventeen" | covered |
| M4 LC tail; counts requests not tokens; smarter routers | Measure | "counting requests, not tokens" | covered |
| M5 two choices in between | Measure | "this setup is least conn's best case" | covered |
| M6 utilization 73%, 95% knee, RR first | Measure | "About seventy-three percent busy" | covered |
| M7 failure table | Measure | "four succeeded, two got five oh two" | covered |
| M8 why two 502s; GET retried, log line | Measure | "'upstream prematurely closed connection'" | covered |
| M9 SIGTERM all 200, connection refused retried | Measure | "nginx safely sent it somewhere else" | covered |
| M10 14/s zero errors, luck | Measure | "it was luck" | covered |
| M11 Redis price fraction of a ms | Measure | "a fraction of a millisecond of difference" | covered |
| K1 ip_hash, NAT, addresses aren't users | Break It | "And addresses aren't users" | covered |
| K2 JSON blob, 50 concurrent, RPUSH exactly 50, WATCH/MULTI, Lua | Break It | "it's exactly fifty, every time" | covered |
| K3 kill nginx / Redis; healthz-checks-Redis trap | Break It | "Same outage, different error message" | covered |
| K4 drain too fast: 500, log, stop -t 1 502s | Break It | "the client got a five hundred" | covered |
| E1 three copies, two fixes, pick stateless, why, KV exception | Close; Sticky trap | B restatement + A sharpening | covered |
| E2 RR bad for LLM, LC/two choices, cache-aware, engine signals | Algorithms; Prefix routing; Measure | "how full its K V cache is" | fixed (engine signals added) |
| E3 scale 200 -> 5,000: 25 + headroom, two nginx, Redis 100k/s, DB, sharding, round trips | How does it scale | "Five thousand divided by two hundred is twenty-five servers" | covered |
| E4 deploy without drops: drain, preStop, deadline, roll a few at a time, idempotency keys | Draining; Retries | "you roll through the fleet a few servers at a time"; "the client sends an idempotency key" | fixed (rolling added) |
| E5 health check 15 s, passive, interval trade-off, shallow, fail open | Health checks | "Or probe more often, which detects faster but costs more probes" | covered |
| G1 sources: SRE book chapters, Twelve-Factor | How does it scale | "the Google S R E book has two chapters" | covered |
| C1 rate limits next | How does it scale | "rate limits and backpressure" | covered |

Numbers checked against the lesson: 725/83 ms, 3.6/2.2 s, 1,948/1,520/1,581 p90 (rounded), 3,569/2,238/2,517 p99 (rounded), 137 ms, 218/218/217, 136 ms, ~22/s, 16/s, 73%, 95%, 1/7 vs 1/4, 75%, 12 cases, 100-500 microseconds, 10 s/30 s grace, 1 and 10 s nginx defaults, 15 s detection, 4x200 2x502, 5 of 6, 25 servers/30-35, ~100,000 ops/s.

Derived in the script, not written in the lesson: "for a million bins the log is about fourteen, and the log of fourteen is under three"; "ten servers to eleven moves ten elevenths" (lesson's N/(N+1) applied); "each backend can do about seven a second" (1000/136); Redis at "a few percent" (5,000 of ~100,000); restarted pinned server "still gone, brand new empty dict" (follows from the in-memory dict).
