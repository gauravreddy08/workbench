# Coverage: baseline-vs-fireworks

Lesson src/lessons/baseline-vs-fireworks.mdx vs podcast/scripts/baseline-vs-fireworks.md. Item IDs
match podcast/outlines/baseline-vs-fireworks.md. No item was MISSING after the check; "compressed"
notes where detail was deliberately shortened for the ear.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs, time budget | Problem; Build It: Setup | "Budget an evening for the server, an evening for the harness, and then one overnight run" | covered |
| P1 273 / 16 = ~17 tok/s, hold it | Problem | "About seventeen tokens a second, tops. Hold on to that number." | covered |
| P2 playground vs Spark, "obviously" | Problem | "So Fireworks is faster. Obviously." | covered |
| P3 Spark first word first, then behind | Problem | "your server can show the first word before Fireworks does" | covered |
| P4 three friends, blank screen most of a minute | Problem | "The third one stares at a blank screen for most of a minute" | covered |
| P5 faster at what / how many / measured how; scoreboard | Problem | "Faster at what? The first word, or the whole thing?" | covered |
| O1 LLaMA Feb 2023, leaked ~week, Llama 2 July commercial, others | Origin | "February twenty twenty-three, Meta released LLaMA" | covered |
| O2 serving hard; GPU waits on memory | Origin | "spends most of its time waiting on memory" | covered |
| O3 Fireworks (PyTorch team), Together, Baseten; sell by token | Origin | "started by people from Meta's PyTorch team" | covered |
| O4 tricks list; build without them | Origin | "Today you build the server without any of them" | covered |
| N1 diner vs owner framing | Six numbers | "a diner's view and an owner's view" | covered (shortened) |
| N2 TTFT | Six numbers | "time to first token. T T F T" | covered |
| N3 ITL / TPOT | Six numbers | "inter-token latency... time per output token" | covered |
| N4 tok/s = 1/ITL; 17 was ceiling on it | Six numbers | "The seventeen was a ceiling on this one" | covered |
| N5 e2e = TTFT + (N-1) ITL | Six numbers | "two hundred fifty-five more gaps of about seventy-seven milliseconds" | covered |
| N6 aggregate throughput, 1 vs 16 users at 15 | Six numbers | "sixteen users each getting fifteen tokens a second" | covered |
| N7 percentile, p50, p99 | Six numbers | "only one request in a hundred is worse than" | covered |
| F1 Fig 001 anatomy | Anatomy | "Picture a timeline running left to right" | covered |
| A1 RTT values | Anatomy | "localhost is well under a millisecond. Your home network, about a millisecond" | covered |
| A2 TCP + TLS 1.3 handshake, keep-alive, Spark TCP only | Anatomy | "with TLS one point three that costs one more round trip" | covered |
| A3 queue: batch vs wait for all ahead | Anatomy | "you wait until every request ahead of you is completely done" | covered |
| A4 prefill compute-bound, grows with prompt, makes first token | Anatomy | "the limit becomes compute, not memory" | covered |
| A5 decode bandwidth-bound, ~one ITL per pass | Anatomy | "each pass costs about one gap, one I T L" | covered |
| A6 TTFT sum | Anatomy | "network, plus handshake, plus queue, plus prefill" | covered |
| PR1 Predict question | Predict | "Who shows the first token first?" | covered |
| PR2 first token: Spark or tie, ~100 ms, Fireworks 100 ms+ overhead | Predict | "can add up to a hundred milliseconds or more" | covered |
| PR3 whole answer: ~20 s vs 1-2 s; short vs long | Predict | "short answers favor the box that's close" | covered |
| K1 SSE | Tokens not chunks | "server-sent events. S S E" | covered |
| K2 events are not tokens | Tokens not chunks | "An event can carry several tokens" | covered |
| K3 HF streamer words; API bundling | Tokens not chunks | "holds text back until it has a whole word" | covered |
| F2 Fig 002 | Tokens not chunks | "Picture two rows of tick marks" | covered |
| K4 stamps, usage N, (N-1)/window, why minus one, max gap | Tokens not chunks | "Because the first token didn't come from decode" | covered |
| F3 Fig 003 model + rates | Where each wins | "prefill takes at least sixty milliseconds, or the prompt length divided by three thousand" | covered |
| F3a-e five things to try | Where each wins | "drag the prompt up to four thousand ninety-six"; "Tailscale, from a café" | covered |
| W1 HBM 3.35 TB/s ~12x | Where each wins | "three point three five terabytes a second" | covered |
| W2 FP8 | Where each wins | "an eight-bit floating point format" | covered |
| W3 spec decoding, compiled kernels, undisclosed | Where each wins | "fused, compiled GPU kernels, not a Python loop" | covered |
| M1 Predict sixteen users | Many users | "How long does the sixteenth person wait" | covered |
| M2 ~5 min, throughput ~13 | Many users | "Fifteen times twenty seconds. That's five minutes." | covered |
| F4 Fig 004 staircase vs batched | Many users | "In naive mode it's a staircase" | covered |
| M3 closed loop | Many users | "It runs what's called a closed loop" | covered |
| M4 Little's Law, W = c x S | Many users | "Which is c times twenty seconds" | covered |
| M5 Fireworks batch shares weight read; p99 flat | Many users | "gets shared by everyone in the batch" | covered |
| Q2 SLO 2 s: one user, ~10 s avg wait, 1% utilization, half hour | Many users | "one request every... half hour or so" | covered |
| S1 20 samples, 81% toward slowest = worst request | p99 samples | "eighty-one percent of the way toward the slowest one" | covered |
| S2 ten beyond: 100 for p90, 1,000 for p99 | p99 samples | "For p ninety-nine, about a thousand" | covered |
| S3 5.5 hours; report n, p90, "n under 100" | p99 samples | "five and a half hours" | covered |
| S4 same wall time c=1 or 16 | p99 samples | "about the same wall-clock time" | covered |
| C1 OpenAI-compatible API | One client | "shaped exactly like OpenAI's" | covered |
| C2 stream shape (role, pieces, usage 41/256/297, DONE) | One client | "forty-one prompt tokens, two hundred fifty-six completion tokens" | covered |
| C3 three timing details | One client | "OpenAI's own API only does that if you ask for it" | covered |
| C4 client can't tell | One client | "the benchmark client has no idea which server" | covered |
| F5 Fig 005 pipeline | One client | "Picture it as a pipeline" | covered |
| R0-R10 fair fight rules | Rules | "Same model."... "And note the time." | covered (Fireworks model ID string not spoken; said "their docs use it as their example") |
| B0 project folder | Setup | "one project folder you'll keep for the whole track" | covered |
| B1 Task 1 container setup, gated model | Setup | "one of NVIDIA's NGC PyTorch containers" | covered (compressed: setup) |
| B2 server scaffold, lock comment | Naive server | "this is the naive part, every later lesson attacks this line" | covered |
| B3 endpoint five steps | Naive server | "Inside it, holding the lock, five steps" | covered |
| B4 why a thread | Naive server | "That's two jobs at the same time. So, two threads." | covered |
| B5 why sync generator (B's wrong model async = fast) | Naive server | "Async isn't 'the fast one'" | covered |
| B6 why the lock | Naive server | "fight over memory bandwidth in ways that are really hard to reason about" | covered |
| B7 hints, uvicorn, curl -N | Naive server | "with the dash N flag so curl doesn't buffer" | covered |
| B8 SSE parser + percentile helpers | Harness | "interpolates linearly... Same as NumPy's default" | covered |
| B9 one_request record, never raise | Harness | "A failure is just a record that says it failed" | covered |
| B10 run_level summary, main | Harness | "c closed-loop workers that all share one H T T P X client" | covered |
| B11 metadata | Harness | "makes a number mean something six months from now" | covered |
| B12 timeouts, pool >= c | Harness | "set the read timeout to none" | covered |
| B13 shared iterator | Harness | "share one iterator of request numbers" | covered |
| B14 key from env var, .gitignore | Harness | "an environment variable whose name you pass on the command line" | covered |
| B15 git sha, commit before run | Harness | "commit before every run" | covered |
| B16 fake server test | Harness | "sleeps fifty milliseconds, then streams fake tokens every ten milliseconds" | covered |
| B17 prompt files 50 / 20 x 2,000 | Prompts | "fifty varied chat prompts"; "twenty prompts of about two thousand tokens" | covered |
| B18 scoreboard.py | Prompts | "prints 'n under a hundred' where the p ninety-nine would go" | covered |
| B19 SCOREBOARD.md header and two rows | Prompts | "Fireworks, as the reference. And your Spark, the baseline." | covered |
| B20 Task 5 runs, c=64 n=128 ~20 min, long prompts, pricing | Prompts | "Every single one of them waits about twenty minutes" | covered (token-volume estimate not spoken) |
| B21 Done when | Prompts | "So you're done when curl shows text arriving word by word" | covered |
| E0 results table | Measure | "Each target at each concurrency level" | covered |
| E1 tok/s half to 9/10 of ceiling; kernels | Measure | "between half and nine tenths of the ceiling" | covered |
| E2 TTFT 100-200 ms, 60 ms weight pass | Measure | "about sixty milliseconds all by itself" | covered |
| E3 32 trillion ops, ~1 s, back out compute rate | Measure | "That's thirty-two trillion operations" | covered |
| E4 c=4,16: (c-1) x e2e, flat, Little's Law | Measure | "you've just measured Little's Law" | covered |
| E5 Fireworks c=1 few hundred ms, hundreds tok/s, ratio | Measure | "That ratio is your 'how far behind am I' headline" | covered |
| E6 Fireworks c=16,64 flat, 429 | Measure | "that's their limit on you, not their GPUs" | covered |
| E7 crossover | Measure | "The crossover." | covered |
| G1 Fig 006 gap map, all seven rows | Where the gap comes from | "Picture three columns" ... "memory math lesson" | covered |
| G2 vLLM/SGLang later; why naive first | Where the gap comes from | "you'll know exactly which problem each piece is solving" | covered |
| Q3 cost per million method, ~77,000 s, ~21 h | Where the gap comes from | "Roughly twenty-one hours of the machine" | covered |
| X1 default timeout | Break It | "your p ninety-nine suddenly looks great" | covered |
| X2 generate on event loop | Break It | "A curl to the health endpoint hangs" | covered |
| X3 events as tokens | Break It | "your speed reads noticeably low" | covered |
| X4 hang up halfway, ghost | Break It | "the next request starts running alongside a ghost" | covered |
| Q1 3x tok/s but lower TTFT | Predict; Where each wins; close | "Fixed costs" substance in Predict + close | covered (the "3x" framing itself not spoken; lesson elsewhere says ~10x) |
| Q4 20 samples no p99 | p99 samples | (S1-S3) | covered |
| Q5 scaling 1 to 64 both servers | Many users; Measure; close | "whether one read of the weights serves one user, or many" | covered |
| D1 Go Deeper | Close | "Databricks' post... Anyscale's post on continuous batching" | covered |
| D2 Connections | Close | "this one closes out the opening chapter" | covered |

Number check: all lesson numbers kept. Derived for speech, not in the lesson: about seventy-seven
milliseconds per token (one over thirteen); three hundred twenty seconds (sixteen times twenty);
"a bit over an hour per level" for the Spark run (two hundred times about twenty seconds); "about
three times twenty seconds, a minute" for four users.
