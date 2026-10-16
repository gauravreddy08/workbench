# Coverage: batching

Lesson src/lessons/batching.mdx (and figure BatchGantt) vs podcast/scripts/batching.md. Item IDs
match podcast/outlines/batching.md.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 naive server, closed-loop harness, scoreboard | Problem; Continuous | "the benchmark harness that hammers it with a fixed number of workers"; "each worker only sends its next request after its last one finished" | covered |
| T2 bandwidth roofline re-derived | Problem | "Sixteen divided by two seventy-three is about fifty-nine milliseconds" | covered |
| T3 KV cache defined, 128 KiB/token | One read | "every layer stored that token's key and value vectors... a hundred twenty-eight kilobytes per token" | covered |
| T4 event loop / GIL re-explained | Build It | "anything that doesn't hit an await holds everyone hostage... PyTorch lets go of the GIL" | covered |
| P1 c=16 naive: ~5 min, ~13 tok/s | Problem | "the sixteenth person waits about five minutes... about thirteen tokens a second" | covered |
| P2 16 GB vs 16 GFLOPs, >99% waiting | Problem | "About sixteen billion operations... more than ninety-nine percent of every step" | covered |
| P3 room for dozens, lets one in | Problem | "The GPU has room for dozens of users in every step" | covered |
| P4 not one line; three failure cases; took until 2022 | Problem | "the one-word answer waits for the essay... took the field until twenty twenty-two" | covered |
| O1 Clipper 2017, TF Serving, Triton; classifier | Origin | "Clipper, by Daniel Crankshaw and colleagues... image classifier that works beautifully" | covered |
| O2 LLMs hundreds of passes; FasterTransformer via Triton 2021 | Origin | "in twenty twenty-one... FasterTransformer running behind Triton" | covered |
| O3 Orca 2022, authors, 36.9x, GPT-3 175B, engines, names | Origin | "thirty-six point nine times... Tensor R T L L M, which calls it in-flight batching" | covered |
| I1 chef and van recap | One read | "A chef who can chop a thousand onions a second" | covered |
| I2 van carries everyone's onions; 64x wrong model | One read | B: "Sixty-four times slower?"; A: "Every user gets one token from every step" | covered |
| I3 math and KV grow; weights shared, caches not | One read | "the weights are shared across the batch, but each user's cache is their own bytes" | covered |
| I4 step-time formula; 16.06 GB, 58.8 ms; 0.134 GB, 0.49 ms | One read | "fifty-eight point eight milliseconds... Point four nine milliseconds, per user" | covered |
| I5 Predict 64 users: 90 ms, 710, 42x, 17->11, 1 TFLOP < 10 ms | One read | "About seven hundred ten... roughly forty-two times... under ten milliseconds" | covered |
| I6 Fig 001 rows; KV third at 64; 256 -> 5; compute roof absent; ceilings | One read | "At four, sixty-one milliseconds... two fifty-six... each person gets five... It's the shape that matters" | covered |
| I7 GPU-hour / 40 | One read | "Batching is how an inference company divides that hour by forty" | covered |
| S1 static batching defined, pre-Orca standard | Static | "That's called static batching. A fixed group" | covered |
| S2 Fig 002: 42% padding; held slots; R5; 60 of 120 | Static | "forty-two percent of the whole prefill is filler"; "sixty out of a hundred twenty seat-steps" | covered |
| S3 padding + attention mask + left padding reason | Static | "minus infinity before the softmax... pad on the left, so every row's last real token" | covered |
| S4 wait for longest; half wasted; real chat worse | Static | "\"Yes\" is one token. A code review is a thousand... it can be worse" | covered |
| S5 head-of-line blocking; R5; TTFT = someone else's longest | Static | "longest answer in someone else's batch. That's called head-of-line blocking" | covered |
| D1 3 a.m. problem | Dynamic | "at three in the morning... until three strangers wake up" | covered |
| D2 Predict deadlock c=4 warm-up 3; also c=16 wind-down; happened | Dynamic | "Nothing. Ever... never more than four... That actually happened" | covered |
| D3 dynamic batching; Triton max queue delay; dial; typical values | Dynamic | "the knob is called max queue delay, in microseconds. The window's a dial" | covered |
| D4 fixes deadlock only | Dynamic | "It fixes the deadlock. It doesn't touch taxes two and three" | covered |
| C1 prefill + identical decode steps as break points | Continuous | "every one of those steps is a natural break point" | covered |
| C2 iteration-level scheduling; continuous; bus; "smarter queue" corrected | Continuous | B: "So it's a smarter queue"; A: "Think of it as a bus with seats" | covered |
| C3 admit/step/emit/evict | Continuous | "Admit... Step... Emit... Evict" | covered |
| C4 interactive figure controls, readouts, constant 60 ms step | Continuous | "a slider for how many seats... about sixty milliseconds, since decode is bandwidth-bound" | covered |
| C5 160 / 92 / 46 steps; 87%; TTFT 28 -> under 6 | Continuous | "a hundred sixty steps... ninety-two steps... forty-six steps... eighty-seven percent" | covered |
| C6 dynamic max-wait slider, grey stays | Continuous | "neither end of the slider gets rid of the grey" | covered |
| C7 equal lengths all at once = identical | Continuous | "static, dynamic and continuous become identical" | covered |
| C8 8 slots: first token within a step; cost is memory | Continuous | "within a step or so of arriving... The cost of more seats is memory" | covered |
| C9 harness closed loop, ignore_eos -> equal case; plan mixed run | Continuous | "expect dynamic batching to look surprisingly good at sixteen" | covered |
| F1 newcomer prefill vs running decode | Prefill+decode | "A new request needs a prefill" | covered |
| F2 separate steps; 32 trillion ops; half a second; ITL, max gap | Prefill+decode | "thirty-two trillion operations... inter-token latency, I T L" | covered |
| F3 selective batching | Prefill+decode | "the big matrix multiplies don't care which request... selective batching" | covered |
| F4 chunked prefill, SARATHI/Sarathi-Serve, token budget, decodes first | Prefill+decode | "a fixed token budget... fill the budget with everyone's decode tokens first" | covered |
| F5 memory-bound + compute-bound mixed; standard in vLLM/SGLang | Prefill+decode | "mixing them puts both halves of the chip to work" | covered |
| F6 Fig 004: loop; B leaves, D takes seat; nobody waits for A; 63 + 449 of 512; 2,063 vs five steps | Prefill+decode | "four hundred forty-nine tokens, is chunk two... five steps of at most five hundred twelve"; "nobody waits for A" | covered |
| R1 bigger batch slower; prefills; window latency | Trade | "Seventeen tokens a second at one user, eleven at sixty-four" | covered |
| R2 SLO, TTFT p99 + ITL; reading speed 4-6 words, 8-10 tok/s | Trade | "People read roughly four to six words a second" | covered |
| R3 goodput, 700 -> 350, DistServe, knee | Trade | "goodput of roughly three fifty... DistServe" | covered |
| R4 Fig 005 three shapes, SLO line | Trade | "The naive server is flat along the bottom and slides right" | covered |
| M1 every sequence holds whole cache | Memory | "keeps its whole K V cache in GPU memory, for as long as it runs" | covered |
| M2 128 KiB derivation; 4K = 512 MiB | Memory | "Two, because there's a key and a value. Times thirty-two layers" | covered |
| M3 Fig 006: 20 / 16 / 90 GB, 690,000 tokens, user table, 490 of 900 | Memory | "about six hundred ninety thousand tokens... four hundred ninety real tokens out of nine hundred" | covered |
| M4 Spark ~1,000 users at 300 tokens; 24 GB card ~11 at 4K; 70B memory wall | Memory | B: "memory is basically always the limit"; A: "On the Spark, no... around eleven users" | covered |
| M5 padding, unknown future, preemption swap/recompute; seat cap | Memory | "which is called swapping, or by just throwing it away and recomputing it" | covered |
| M6 paged attention blocks like virtual memory pages | Memory | "small fixed-size blocks, like pages in virtual memory" | covered |
| B0 two upgrades, same API, two rows | Build It | "You upgrade your server twice" | covered |
| B1 SmolLM2-135M on Mac, fp32; 8B bf16 on Spark; versions | Build It | "Smol L M two... transformers five point twenty and PyTorch two point fourteen" | covered |
| B2 common.py; EOS set; Detok; quadratic | Build It | "Llama three point one Instruct has several of them... is quadratic, technically" | covered |
| B3 Job, pending queue, collector, generate in thread, waits on purpose | Build It | B: "Wait, it waits on purpose?" | covered |
| B4 streamer put/end, call_soon_threadsafe | Build It | "you have to go through the loop's call soon thread-safe" | covered |
| B5 collector loop, timeout, infinite window | Build It | "if you set the window to infinity, you get pure static batching" | covered |
| B6 hints: left pad, pad=eos, template, one max_new, min tokens, usage, endpoint, lifespan, try/except | Build It | "If every job in the batch is ignoring end tokens... wrap the batch run in a try-except" | covered |
| B7 padded cache design, admit/evict | Build It | "every row's newest token sits in the last column" | covered |
| B8 DynamicCache, given helpers | Build It | "a keys tensor and a values tensor that grow by one position every step" | covered |
| B9 Seq, Engine, pick/prefill/merge/evict/step | Build It | "And five methods. Pick the next token per row" | covered |
| B10 position ids, last logits half GB, finished, seats, copies | Build It | "running count of real tokens up to it, minus one, floored at zero"; "about half a gigabyte of scores" | covered |
| B11 test design; fluent not evidence; ignore_eos mismatch | Build It | "Fluent text is not evidence"; "exactly the mismatch this test caught" | covered |
| B12 bf16 drift; fp32 exact; no streaming test | Build It | "the order the floating-point additions happen in" | covered |
| B13 server_cb thread, inbox, count not token | Build It | "A count is a consistent snapshot" | covered |
| B14 why a thread; 60-100 ms; GIL released | Build It | "sixty to a hundred milliseconds per step" | covered |
| B15 review checklist incl. disconnect bug | Build It | "a client that disconnects has its sequence marked done" | covered |
| B16 mixed.jsonl 60/30/10; plot | Build It | "Sixty percent at thirty-two, thirty percent at two fifty-six, ten percent at ten twenty-four" | covered |
| B17 run matrix; 512 at c=64; notes column | Build It | "two hundred requests is only about three per worker" | covered |
| B18 done when | Build It | "You're done when the test passes" | covered |
| X1 results table; expectations not results | Measure | "So you fill in a table... These are expectations" | covered |
| X2 c=1 expectations | Measure | "about one window worse than naive, so fifty milliseconds" | covered |
| X3 Predict c=16 equal: tie, static maybe ahead | Measure | B: "I'd guess... double?"; A: "Close to a tie" | covered |
| X4 c=16 expectations; 240 ceiling | Measure | "about two hundred forty tokens a second, and getting half of that" | covered |
| X5 c=64 split; tens of seconds; 700-900 ceiling | Measure | "forty-eight users queue... about seven to nine hundred" | covered |
| X6 max gap every ~4th step | Measure | "somebody finishes about every four steps" | covered |
| X7 mixed c=16; wasted fraction | Measure | "Tokens it computed, which is each batch's longest times its size" | covered |
| X8 plot left of 1 s = capacity | Measure | "That's the number you'd put in a capacity plan" | covered |
| K1 pure static hangs | Break It | "Every batcher needs a deadline" | covered |
| K2 right padding | Break It | "the newest token has to be in the last column of every row" | covered |
| K3 position ids: 2 of 6 match; RoPE | Break It | "two of the six sequences still matched, and four drifted" | covered |
| K4 paste a novel; 512 chunks from a starting cache | Break It | "the scheduler's job isn't just who's in the batch" | covered |
| E1 cheaper per token, not 64x slower | One read; close | "divides that hour by forty"; "Not down to a sixty-fourth. Down to eleven" | covered |
| E2 static problems + continuous fix | Static/Dynamic/Continuous; close | B summary + A: "The batch gets re-decided before every single forward pass" | covered |
| E3 scaling: 100 ms, 27.3 GB, 11.2 GB, ~83 / ~167; measure; bandwidth not memory; 24 GB | Trade; Memory | "That leaves about eleven point two gigabytes... about eighty-three users" | covered |
| E4 4,000-token paste, chunked prefill | Prefill+decode; Break It | "still makes one giant step" / "Every one of them stalls for the full prefill" | covered |
| E5 why cap batch; goodput; memory cap | Trade; close | "you add users until the slowest ones start missing their promise" | covered |
| G1 Orca paper + Anyscale post | Close | "the Orca paper's second and third sections" | covered |
| N1 next lessons | Close | "Speculative decoding... competing with batching for the same idle compute" | covered |

Numbers checked against the lesson: 13 / 17 / 11 / 5 tok/s; 59, 61, 67, 90, 185 ms; 66, 240, 710,
1,390 tok/s; 16.06 GB, 58.8 ms, 0.134 GB, 0.49 ms; 36.9x; 42%; 60 of 120; 160 / 92 / 46 steps; 87%;
28 -> under 6; 32 trillion; 449 of 512; 2,063; 700 -> 350; 4-6 words, 8-10 tok/s; 27.3 / 11.2 GB, 83,
167; 20 / 16 / 90 GB; 690,000 tokens; 1,300 / 170 / 21 / 5 users; 490 of 900; 46,000 tokens, 11 users;
60/30/10 at 32/256/1,024; 128,256 vocab; 60-100 ms; 2 of 6. All match.

Derived in the script, not written in the lesson: 64 × 0.49 ≈ 32 ms (stated as B's arithmetic toward
the lesson's 90 ms); 2 × 32 × 8 × 128 = 65,536 numbers per token (intermediate step of the lesson's
128 KiB product); "256 ÷ 64" as the reason for the lesson's "about every four steps".
