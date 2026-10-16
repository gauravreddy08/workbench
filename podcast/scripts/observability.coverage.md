# Coverage: observability

Lesson src/lessons/observability.mdx vs podcast/scripts/observability.md. Item IDs match
podcast/outlines/observability.md. "Fixed" = was MISSING or wrong in the first draft and has been
added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs: TTFT, ITL, p99, HDR, open loop, can't-average re-explained | Problem; Metrics; Percentiles; Traces; Build It | "Time to first token being how long"; "Back there it was the H D R histogram"; "P ninety-nine meaning"; "That's from tail latency. It sends requests at a fixed rate" | covered |
| P1 stall message | Problem | "The agent sometimes stalls for a second or so" | covered |
| P2 harness p50 fine, five hand requests, forty thousand lines, same code | Problem | "Forty thousand lines of 'got request' and 'done'" | covered |
| P3 can't debug by reading code; inputs, load, deps, timing | Problem | "You can't debug production by reading code" | covered |
| P4 observability definition, control theory, three forms | Problem | "The word comes from control theory" | covered |
| O1 Google fan-out, every dashboard fine | Origin | "every dashboard said, 'my service is fine'" | covered |
| O2 Dapper 2010, ID at front door, spans, collector, 1 in 1,024 | Origin | "about one request in every thousand and twenty-four" | covered |
| O3 Zipkin 2012, Jaeger 2015, OpenTracing/OpenCensus, OTel 2019, Borgmon, Prometheus SoundCloud 2012 | Origin | "in twenty nineteen they merged into one, OpenTelemetry" | covered |
| I1 restaurant: slips, tally, one ticket, 28 of 40 min | Three ways | "Twenty-eight of them, it sat on the grill rail" | covered |
| I2 log / metric / trace definitions and questions | Three ways | "It answers: what happened, in detail, for this one event?" | covered |
| F1 figure 001 three views | Three ways | "If you drew one slow request all three ways" | covered |
| I3 cheap where another expensive, one shared ID | Three ways | "wired together by one shared thing. An ID." | covered |
| L1 print done is a bad log | Logs | "A print statement that says 'done' is a log. A bad one." | covered |
| L2 structured JSON, filter/group/count, jq | Logs | "That's called a structured log" | covered |
| L3 request id, X-Request-ID, contextvar, response header | Logs | "So in async Python you use a context var" | covered |
| L4 levels | Logs | "Debug, which is chatter for developers" | covered |
| L5 432 GB/day, sampling | Logs | "about four hundred thirty-two gigabytes. A day." | covered |
| L6 ~4 microseconds per JSON line, per-token loop | Logs | "about four microseconds on a Mac" | covered |
| M1 metric throws away detail, three kinds | Metrics | "A metric throws away the details on purpose" | covered |
| M2 counter, rate is everything, resets | Metrics | B: "So the counter is how many requests you've had"; A: "the slope of the counter" | covered |
| M3 gauge | Metrics | "Second kind, a gauge" | covered |
| M4 histogram = counters per bucket + count + sum, HDR link | Metrics | "Third kind, a histogram" | covered |
| M5 cumulative buckets, 0/102/298/300, sum 167.6, mean 559, a dozen numbers, 0.4 microseconds | Metrics | B: "So two hundred ninety-eight requests landed between"; "about five hundred fifty-nine milliseconds" | covered |
| M6 RED, Tom Wilkie | Metrics | "the RED method, from Tom Wilkie" | covered |
| M7 USE, Brendan Gregg, GPU saturation = lock queue | Metrics | "the USE method, from Brendan Gregg" | covered |
| M8 four golden signals | Metrics | "Google's 'four golden signals'" | covered |
| C1 labels, time series | Labels | "A time series being one stream of timestamp-and-value points" | covered |
| C2 180 series -> 18 million, kilobytes each, tens of GB, cardinality explosion | Labels | "Eighteen million series" | covered |
| C3 bounded labels rule; unbounded to logs/attributes | Labels | "metric labels come from a small, fixed set" | covered |
| Q1 average dashboard is a mistake | Percentiles | "the dashboard almost everybody builds first" | covered |
| PR1 Predict mean +20 ms (~7%), p99 530 -> 730, measured +31 / +326 | Percentiles | "That's twenty milliseconds. About seven percent." | covered |
| F2 figure 002 sliders, fleet toggle | Percentiles | "There's a little interactive chart" | covered |
| Q2 histogram_quantile even spread, 1-1.25 s bucket off ~100 ms, edge at 0.25 | Percentiles | "the estimate's off by almost a hundred milliseconds" | covered |
| Q3 fleet: true ~1.2 s vs average 730 ms, sum buckets then estimate, by le | Percentiles | "the true fleet p ninety-nine is about one point two seconds" | covered |
| Q4 same rule as HDR; summaries can't aggregate | Percentiles | "Prometheus also has something called a summary" | covered |
| TR1 metric forgot every request | Traces | "it's forgotten every individual request" | covered |
| TR2 span, root span, parent, trace id 128-bit | Traces | "a random hundred-twenty-eight-bit number" | covered |
| F3 waterfall: gateway, quota, hop, tokenize, cache, queue, prefill, decode x32, first-token line | Traces | "Drawn on a timeline, a trace looks like a waterfall" | covered |
| TR3 slow DB in gateway, server metrics perfect | Traces | "Users suffer, and the server's dashboard is green" | covered |
| TR4 cache lock waiting, CPU profiler says idle | Traces | "A CPU profiler would look at that code and say it's idle" | covered |
| TR5 GPU queue every request: overloaded vs broken | Traces | "That's how you tell overloaded from broken" | covered |
| TR6 slow decode 20 -> 34 ms, TTFT unchanged, 70% longer | Traces | "every answer takes about seventy percent longer" | covered |
| TR7 span attributes, unbounded ok, per-user answer | Traces | "this is where the high-cardinality detail that's banned from metrics goes to live" | covered |
| CP1 contextvar in process; propagation; W3C Trace Context; traceparent | Propagation | "The header's called trace parent" | covered |
| F4 figure 004 version / trace id 16 B / parent 8 B / flags 01 | Propagation | "The first is a version, two digits, zero zero" | covered |
| CP2 head sampling, no half traces; tail sampling buffers | Propagation | "That's head sampling"; "The alternative is tail sampling" | covered |
| CP3 flags 03, random trace id bit | Propagation | "it actually printed flags zero three" | covered |
| OT1 OTel, OTLP 4317/4318, change an endpoint | OTel | "Now it means changing an endpoint" | covered |
| F5 figure 005 push traces / pull metrics, 5-15 s, Grafana PromQL | OTel | "Here the arrow goes the other way. Prometheus pulls." | covered |
| OT2 pull robust, up metric, never blocks; Jaeger search; Grafana | OTel | "there's a built-in metric called up that drops to zero" | covered |
| OT3 FastAPI built-in OTel, auto-instrumentation, write by hand | OTel | "Recent FastAPI releases have started shipping" | covered |
| S1 nobody looking at 3am | SLO | "At three in the morning nobody's looking" | covered |
| S2 SLI, SLO, error budget, million -> 10,000 | SLO | "ten thousand of them can be slow" | covered |
| S3 why not 100% | SLO | B: "Why not just say a hundred"; "flaky Wi-Fi" | covered |
| S4 burn rate formula in words, 1 and 6 | SLO | "burn rate six, and the budget's gone in thirty divided by six, five days" | covered |
| F6 figure 006 three lines, 14.4x/1h = 2%, 6x/6h = 5% | SLO | "burn rate fourteen point four is nearly vertical" | covered |
| PR2 Predict burn 6, 5 days, average TTFT 44 -> 69 | SLO | "went from forty-four milliseconds to sixty-nine" | covered |
| AL1 symptom vs cause, B wants cause alerts | Alerts | B: "my instinct would be to alert on the causes" | covered |
| AL2 false alarms / silent misses, alert fatigue, Ewaschuk rule, causes on dashboards | Alerts | "urgent, actionable, and about something users notice" | covered |
| AL3 burn-rate alert, 2% in an hour, short window stops it | Alerts | "you also require a short window, say five minutes" | covered |
| PF1 profiler, sampling, py-spy | Profiles | "A sampling profiler. It peeks at the call stack" | covered |
| PF2 continuous profiling, GWP 2010, Pyroscope, Parca, OTel fourth signal | Profiles | "Google-Wide Profiling" | covered |
| PF3 CPU profile misses waiting; wall-clock, idle flag, py-spy dump | Profiles | "You need a wall-clock profile" | covered |
| LLM1 TTFT, ITL, tokens/s, token counters, running/waiting, KV util, prefix hit rate | LLM server | "K V cache utilization, as a gauge" | covered |
| LLM2 vLLM/SGLang /metrics, names change, curl | LLM server | "Just curl it and look" | covered |
| LLM3 agents: trace per run, 4 min / eleven calls / 90 s fetch, context re-sent, gen_ai | LLM server | "eleven tool calls, one after another" | covered |
| B0 stand-in same shape, fake sleeps | Build: setup | "it fakes the model with sleeps" | covered |
| B1 deps faults 5%, spoiler, agent copies; 4 slots, 400 us, 20 ms; open loop, 500 users; ~7/s ceiling, try 10 | Build: setup | B: "the server tops out around seven a second" | covered |
| B2 three containers, pin versions, target down until metrics, agent debugs | Build: setup | "pin them once it works" | fixed |
| B3 JSON logs, contextvar in generator, header, finally, to_thread copies context, jq checks | Build: logs | "You set the context var at the top of the streaming generator" | covered |
| B4 metrics list, deliberate buckets, _total, in-flight finally drift, TTFT at yield, +Inf = count | Build: metrics | "The names are suggestions, the kinds are not" | covered |
| B5 spans, queue_wait just acquire, attributes as clues, loadgen inject, two services, batch processor background, 8 us/span | Build: traces | "you should see one trace with spans from two services" | covered |
| B6 dashboard RED + TTFT mean to watch it lie, baseline, agent review mistakes | Build: dashboard | "The mean is there on purpose, so you can watch it lie" | covered |
| B7 hunt rules and four-step method, incident note, reveal, repeat | Build: hunt | "There's a method that works for any incident" | covered |
| B8 SLO task, 0.25 bucket, /0.01, 14.4 (1 h & 5 m), 6 (6 h & 30 m), 10 min per fault | Build: SLO | "both the one-hour and the five-minute burn rate above fourteen point four" | covered |
| B9 Spark port: gpu_lock, first text, ITL per event / tokens, gauge, c 1 and 8, batching, agent review | Build: Spark | "watch queue wait turn into the biggest span" | covered |
| B10 done-when | Build: Spark | "So when you're done, you've got one JSON line per request" | covered |
| ME1 runs and columns | Measure | "And you record the mean, p fifty, p ninety-nine" | covered |
| ME2 measured numbers, 300 thin, unlabelled | Measure | "Healthy: mean five hundred fifty-nine milliseconds" | covered |
| ME3 mean 2-6%, p50 barely, TTFT p99 4-6x | Measure | "Two to six percent" | covered |
| ME4 burn ~5, ~6 days, slow alert not page, ticket | Measure | "A ticket for the morning, not a three a m page" | covered |
| ME5 overload looks different | Measure | "The overload run looks different from all three" | covered |
| ME6 instrumentation cost numbers | Measure | "About four tenths of a microsecond per histogram observation" | covered |
| BR1 user label, thousands of lines, 100,000 users x 50 servers | Break It | "Now imagine a hundred thousand users and fifty servers" | covered |
| BR2 forget extract, two traces, hole | Break It | "A hole in the middle of every request" | covered |
| BR3 SimpleSpanProcessor + dead address, telemetry never blocks, check timeout | Break It | "telemetry must never block the work" | covered |
| BR4 two servers, wrong vs right query; CPU 80% fires on none; GPU 90% fires always | Break It | "That's alert fatigue in one panel" | covered |
| E1 incident order metric -> trace -> logs, ID links, profiles fourth | Build: hunt; close | "A metric alerts you, that's the symptom" | covered |
| E2 can't average p99s, sum buckets, edges | Percentiles; Break It; close | "A percentile depends on how many requests each server handled" | covered |
| E3 trace across services, each ships separately, collector rebuilds | Propagation | "each service ships its own spans to the collector separately" | covered |
| E4 budget, burn rate, page on burn not CPU | SLO; Alerts | "Burn rate is the symptom alert done well" | covered |
| E5 1 -> 200 servers, 50 customers | Scaling it | "two hundred servers and fifty customers" | covered |
| G1 sources | Close | "make it the Dapper paper" | covered |
| CN1 connections | Close | "Batching should shrink that queue wait span" | covered |

Numbers check: every number in the script was compared against the lesson. Derived (not written in the
lesson): "a hundred ninety-six" requests between the 0.5 and 0.75 s buckets (298 minus 102); "ten
thousand lines a second" (1,000 x 10); "more than a hundred thousand times smaller" (4 microseconds vs
500 ms); "about fifty-five hundredths of a second" per request (lesson says ~0.55 s); a p99 from 300
samples is "basically the third-slowest request".
