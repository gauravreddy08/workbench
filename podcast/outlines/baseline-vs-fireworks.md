# Outline: baseline-vs-fireworks

Source: src/lessons/baseline-vs-fireworks.mdx. Curriculum entry: "Baseline: my Spark vs Fireworks."
Question: how does a naive model server on my own hardware compare to a commercial inference API?
Why: you cannot improve what you have not measured; this is the scoreboard for the whole track.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

Diagnostic gaps this lesson touches: numbers (latency, bandwidth, how it scales), sync/async (the
event loop stall in Break It), why decoding is memory-bound (re-explained from bandwidth-bound),
p99. Earlier ideas re-explained inline: the seventeen tokens per second division, Little's Law,
closed-loop load generator, event-loop blocking, threads fine when waiting, latency ladder.

## Today / prerequisites

- T1 Prereqs: async load generator (waiting-vs-working) and the 17 tok/s prediction (bandwidth-bound). Time: an evening for server, an evening for harness, one overnight run. -> Skipped as a list; both prereqs re-explained where used; time cost said in Build It ("an evening each, then overnight").

## The Problem

- P1 Last lesson: one division, 273 GB/s over 16 GB, predicts about 17 tok/s, tops, for an 8B model. Hold that number. -> A opens with it, re-explaining in one breath why (every weight read once per token).
- P2 Fireworks playground, 8B Llama, short story: text faster than you can read; Spark: about reading-aloud speed. "So Fireworks is faster. Obviously." -> A sets the scene; B says "obviously" as the natural wrong model.
- P3 Except: from the Spark itself, short prompt, your first word can come before Fireworks' (request never left the box); then falls behind on every word after. -> A corrects.
- P4 Three friends at once: third stares at a blank screen most of a minute; Fireworks serves thousands without blinking. -> A, continuing.
- P5 "Which is faster?" has no answer yet: faster at what, for how many, measured how. Lesson pins it down and builds a scoreboard for the rest of the track. -> A, as signpost.

## Origin

- O1 Feb 2023 Meta released LLaMA to researchers; weights on the open internet within about a week. July: Llama 2 with a license allowing commercial use. Mistral, Qwen, DeepSeek, later Llamas followed; anyone could download a model close to the best closed ones. -> A tells as story.
- O2 Downloading easy, serving hard: GPUs expensive; a GPU serving one person mostly waits on memory with compute idle. -> A, ties back to bandwidth-bound.
- O3 Companies built a business in that gap: Fireworks (founded by people from Meta's PyTorch team), Together AI, Baseten, others: fleets of data-center GPUs, open models to many customers, sold by the token. -> A.
- O4 Margin comes from tricks: batching (many users per weight read), caching (skip work done), quantization (fewer bytes), speculative decoding (guess several tokens), faster GPU code. Each a later lesson. Today: server without any of them, to see what each buys. -> A; B reacts ("so I'm building the bad one on purpose").

## The Idea: six numbers

- N1 Restaurant framing: first plate, pace, whole meal (diner) vs diners per hour (owner); LLM API has the same four plus two from many requests. -> A, very short, one-point comparison, then straight to the real terms.
- N2 Term TTFT: send to first piece of generated text arriving; what makes chat feel responsive. -> A.
- N3 Term ITL (also TPOT, time per output token): gap between tokens once flowing; averaged over a request it's the inverse of tok/s. -> A.
- N4 Output tok/s per stream = one over ITL; the number predicted last lesson (17 was a ceiling on it). -> A.
- N5 End-to-end latency: wait plus first to last; roughly TTFT + (N − 1) × ITL. -> A in words with worked example (256 tokens at 13 tok/s, about 20 s).
- N6 Term aggregate throughput: total output tok/s across all requests at once; one user at 15 vs sixteen users at 15 each = same per-stream, 16× throughput. The owner's number; what inference companies sell. -> A; B gets it.
- N7 The tail, Term percentile: value below which that fraction falls; p50 median typical, p99 only 1 in 100 worse. At scale someone is always the unlucky one. -> A, spelled for the ear.

## Figure 001: anatomy of a request

- F1 Fig 001: one streaming request end to end; client, network, gateway (TLS, auth), queue, GPU (prefill, decode). TTFT covers up to first token; prefill compute work; each decode step mostly memory reads; which segments are big depends on where the server is and how busy. -> A describes as a timeline over the phone.
- A1 Network: one RTT total (Term: tiny message there and back). Localhost well under a ms, home LAN about one, data center across the country tens of ms (latency ladder). -> A; B asks "how much is the internet part really".
- A2 Handshake, first call only: TCP one round trip, TLS one more with TLS 1.3 (Term TLS: encryption under HTTPS, swap keys). Keep-alive reuses connection (httpx does by default inside one client) so paid once. Spark on plain HTTP pays only TCP; on localhost nothing. -> A.
- A3 Queue: Fireworks' scheduler slots you into a running batch; your server: wait until every request ahead is completely done. Biggest number in the lesson. -> A, flags it for later.
- A4 Prefill: whole prompt in one forward pass, all tokens at once; matrix-times-matrix; compute-bound, not memory; longer with longer prompt; produces the first output token. -> A; B voices wrong model "prefill is also memory-bound?" and A separates.
- A5 Decode: one token per pass, each reads every weight; bandwidth-bound loop; each pass about one ITL regardless of prompt length. -> A, re-explains bandwidth-bound in a sentence.
- A6 TTFT = network + handshake + queue + prefill; everything after is decode at one ITL per token. -> A sums up.

## Predict: who wins

- PR1 Q: same 8B, Spark from script on Spark vs Fireworks over internet, one user, 256-token prompt, 256-token answer. Who shows first token first? Who finishes first? -> A asks, B guesses (Fireworks both, by a lot).
- PR2 First token: plausibly Spark or near tie. Localhost free, no queue. Fireworks pays round trip + gateway + scheduler, can be 100 ms or more before its faster prefill. Spark prefill of 256 short: about one pass over weights plus compute, order of 100 ms. -> A reveal.
- PR3 Whole answer: Fireworks by a mile; 255 tokens at about 13 tok/s ≈ 20 s; at a couple hundred tok/s, one or two seconds. Round trip paid once, per-token speed paid 255 times. Short answers favor nearby box, long answers favor fast GPU. -> A; B restates the rule.

## Tokens are not chunks

- K1 Term SSE: one plain HTTP response that stays open; server writes lines starting "data:" followed by a blank line; client reads as they arrive. -> A.
- K2 Tempting to treat each event as one token and time gaps. Don't: an event can carry several tokens. -> B voices it as the natural plan; A says don't.
- K3 Your server on purpose: HF streamer holds text until a whole word; "Hello!" one event, two or three tokens. Busy API by accident: flushing a few at once after a hiccup. Counting events = wrong token count; gaps aren't ITL. -> A.
- F2 Fig 002: server makes tokens at steady rhythm; client gets events carrying one or more; a stall where three arrive at once. Count tokens from usage, time first-to-last window, divide. -> A describes two rows of ticks.
- K4 Harness per request: stamp send time, stamp first event with text (TTFT), stamp last event with text. N from usage completion_tokens in final event. Decode speed = (N − 1) / first-to-last window. Minus one because first token came from prefill. Largest gap between events recorded as stutter detector. -> A, with B asking why minus one.

## Figure 003: where each wins (interactive)

- F3 Fig 003: model with made-up-but-reasonable rates, not measurement; shows shape before harness shows numbers. Top: race to first token; bottom: whole answer. Rates: Spark prefill at least 60 ms or prompt over 3,000 tok/s, decode 13 tok/s, one at a time; Fireworks 50 ms gateway+scheduling, prefill 25,000 tok/s, decode 180 tok/s, shared batch. -> A, as "what you'd see as you drag".
- F3a Short prompt, localhost, one user: Spark wins first token, barely. Nearby beats fast when little work. -> A.
- F3b Prompt to 4,096: prefill dominates TTFT, prefill is compute; data-center GPU has many times the compute; Fireworks leads even after paying internet. -> A; B notices it flips.
- F3c Tailscale from a café: network advantage evaporates; home server only local when home. -> A, B adds own scene.
- F3d Output to 1,024: bottom chart almost all decode; the 10× per-token gap; no network luck makes it up. -> A.
- F3e Concurrency 16: look at Spark's queue segment. -> A, sets up next section.
- W1 Why Fireworks per-token faster: HBM (Term: memory stacked beside chip with very wide connection; H100 spec about 3.35 TB/s, roughly 12× Spark's 273 GB/s), about an order of magnitude more bandwidth than LPDDR5x. -> B asks "if decode is just reading weights..."; A answers.
- W2 May serve in FP8 (Term: 8-bit float; halves bytes per token; bandwidth-bound decoder up to twice as fast; some quality can be lost; quantization lesson). -> A.
- W3 May use speculative decoding (several tokens per weight read); fused compiled GPU kernels, not a Python loop. They don't tell you all of it; you'll build each piece and see its worth. -> A.

## Many users at once

- M1 "The part that surprises people." Predict: 16 people at the same instant, 256-token answer each, one at a time at 13 tok/s. 16th person's wait for first token? Total throughput? -> A asks; B guesses (wrong: throughput goes up, or server slows evenly).
- M2 Answer: each request about 20 s (a fraction of a second prefill, 255 tokens at 13 tok/s). 16th waits for 15 full requests: 15 × 20 s ≈ 5 minutes. Throughput still about 13 tok/s, same as one user. Adding users added only waiting. -> A.
- F4 Fig 004: naive: each request waits for all before it, first-token time a staircase, throughput flat. Batched preview: everyone shares each pass over weights, throughput climbs, nobody waits in line. Same rates as Fig 003. -> A describes rows of bars, dashed waiting, toggle.
- M3 Term closed loop: fixed number of workers each send, wait for full answer, send next; in-flight held constant, arrival rate adjusts. Your load generator from waiting-vs-working does c workers. Steady state: always c in system; one at the back waits behind c − 1. -> A re-explains the load generator.
- M4 Term Little's Law: average number inside = arrival rate × average time inside (L = λ × W); holds for coffee shop queues and servers. From lesson 4. L = c, λ = 1/S (S = service time), W = L/λ = c × S. Double users, double wait. Throughput never moves. -> A, in words with worked example (16 users × 20 s = 320 s).
- M5 Fireworks completely different: one pass over weights for a whole batch, expensive memory read shared; sixteen more users barely change per-pass time; p99 hardly moves with concurrency. Batching lesson gives your server the same trick. -> A.

## How many samples a p99 needs

- S1 20 requests, sorted TTFTs: p99 sits between 19th and 20th, 81% of the way toward the slowest; so your "p99" is just your single worst request. One unlucky garbage collection or network blip is the headline. -> A asks B where p99 is; B guesses "the 99th percent... the 19.8th?"; A explains.
- S2 Rule: about ten samples beyond a percentile. p90 needs about 100 requests, p99 about 1,000. -> A.
- S3 Cost: 1,000 requests at 20 s on the naive server = five and a half hours. Be honest not heroic: report n next to every percentile, report p90 when n is small, print "n under 100" instead of a fake p99. -> A; B reacts to five and a half hours.
- S4 Side effect of flat throughput: on naive server, 200 requests take about the same wall time at c = 1 or c = 16. -> A; B "huh".

## One client for both servers

- C1 Term OpenAI-compatible API: HTTP API shaped like OpenAI's; POST to v1 chat completions with JSON of model, messages, max_tokens; most providers and engines (vLLM, SGLang) speak it, one client works against all. Add stream true. -> A.
- C2 Stream shape: first event role assistant with empty content; then events with content pieces ("Once", " upon a"); final event finish_reason "length" and usage (41 prompt tokens, 256 completion, 297 total); then literal "data: [DONE]". -> A describes it, not read.
- C3 Three timing details: TTFT is first event with non-empty content; Fireworks returns usage in final chunk, OpenAI only if asked with stream_options; stream ends with DONE line, not JSON. -> A.
- C4 If your server speaks the same API, the client can't tell which server it's talking to. That's the design. -> A.
- F5 Fig 005: harness pipeline: fixed prompt set -> c async workers (asyncio + httpx) -> same body to either server -> SSE parser timestamps each event -> one record per request (ttft, e2e, n, tok/s) -> results JSON with sha, model, dtype -> scoreboard.py -> one SCOREBOARD row per change. -> A, as a left-to-right pipeline.

## Rules for a fair fight

- R0 A benchmark is only as good as the boring parts; write rules into the harness, not memory. -> A.
- R1 Same model: one Fireworks serves and you can run in bf16. Llama 3.1 8B Instruct natural: your 16 GB math described it, Fireworks' docs use it as example. Check current catalog; pay-per-token availability changes. Qwen3 8B fine, but turn off thinking on both sides. -> A.
- R2 Same prompts: fixed file, same order every run. -> A.
- R3 Same work: temperature 0, fixed max_tokens, force exactly that many tokens: Fireworks' ignore_eos flag; Hugging Face min_new_tokens. So chatty and curt answers aren't compared. -> A; B asks why it matters.
- R4 Warm up: throw away first few; they pay connection setup, GPU warm-up, cold caches. -> A.
- R5 Same token counting: server's usage count, spot-check by re-tokenizing with the HF tokenizer. -> A.
- R6 Write down precision: yours bf16; record Fireworks' if stated (FP8 or similar) else "undisclosed". Half the bytes, up to twice the speed. -> A.
- R7 Several concurrency levels: 1, 4, 16, 64. One number at c = 1 hides the most important behavior. -> A.
- R8 Same client location: harness on the Spark for both (compares servers); once from laptop for what a user feels. -> A.
- R9 Errors are data: pay-per-token rate limits, HTTP 429 at c = 64; record every failure, never drop silently. -> A.
- R10 Note the time: shared API busier at some hours; run Fireworks twice at different times, keep both. -> A.

## Build It

- B0 Project folder for the whole track: server_naive (the "before" picture), bench (harness reused every lesson), scoreboard script, prompts short and long, results folder one JSON per run committed, SCOREBOARD.md one row per change forever. -> A, short. Time: evening for server, evening for harness, overnight run.
- B1 Task 1 (setup): Spark is ARM64 CPU + Blackwell GB10; plain pip torch may give a wheel not built for that, lose an evening. Follow NVIDIA's DGX Spark docs; at time of writing an NGC PyTorch container; mount inference folder and HF cache; inside, install transformers, fastapi, uvicorn, httpx; check torch sees CUDA. If pip starts downloading a new torch, stop it. Llama 3.1 gated: accept license, log in with HF CLI. Download weights once; volume mount keeps them. -> A, compressed (setup).
- B2 Task 2: server_naive: load model once, bf16, GPU; accept OpenAI-shaped requests at chat completions; stream SSE ending with usage event and DONE. Scaffold: request model with defaults (max_tokens 256, temperature 0, stream on, ignore_eos off), helpers for SSE line and chunk object, health endpoint. A global lock commented "THE naive part. Every later lesson attacks this line." -> A.
- B3 Endpoint shape: inside a plain sync generator, holding the lock: messages to token ids with chat template on GPU; TextIteratorStreamer skipping prompt and special tokens; start generate in background thread, greedy, max_new_tokens, min_new_tokens when ignore_eos; yield role event then one event per piece of text; join thread, count completion tokens from output ids, yield final event with finish_reason and usage, then DONE. -> A by what it does.
- B4 Why a thread: generate is one long blocking call; streamer is a queue generate pushes into; something must pull and write to socket while generate runs; two jobs, two threads: generate thread on GPU, response thread mostly sleeps on queue; threads fine when one side mostly waits (processes-threads-gil). -> B asks; A.
- B5 Why a sync generator: iterating the streamer blocks; inside async def it freezes the event loop: no other request, not even health. Starlette runs a plain generator in a worker thread, so blocking is safe there. -> B's wrong model "async def would be faster"; A corrects, re-explains event loop.
- B6 Why the lock: without it two generate calls on the GPU fight over bandwidth unpredictably; with it, requests queue; that queue is the "before" picture; supposed to look bad at c = 16. -> A.
- B7 Hints: apply_chat_template with add_generation_prompt, return as dict of tensors, move to GPU, pass to generate; wrap in inference_mode; output ids include prompt so completion = output length − prompt length; check transformers docs for streaming if moved. Run uvicorn on all interfaces port 8000; curl with no-buffering flag; one data line per word, not one blob. -> A, compressed.
- B8 Task 3 harness: start from lesson 4 asyncio + httpx load generator; add streaming, per-token timing, percentiles, results file. Two given helpers: SSE parser (skip non-data lines: blank separators, keep-alive comments, event lines; stop at DONE; parse JSON) and percentile with linear interpolation (same as numpy default). -> A by what they do.
- B9 one_request: stream one request; return record (ok, ttft, e2e, n_out, decode_tps, n_chunks, max_gap, error); never raise, failure is a record. Non-200: record status and start of body. Per event: take usage if present; per non-empty content: stamp first once, last every time, gap since previous. ttft, e2e, decode_tps = (n_out − 1)/(last − first). -> A.
- B10 run_level: warm up, then n requests through c closed-loop workers sharing one AsyncClient; summary: n, n_ok, wall time, throughput = total output tokens of successful requests / wall, p50/p90/p99 of ttft, e2e, decode_tps. main with argparse loops concurrency levels, one JSON per run. -> A.
- B11 Metadata: target, base URL, model, precision, change, git sha, date, max_tokens, ignore_eos, prompt file, n, warmup, client. What makes a number mean something six months from now. -> A.
- B12 Hint timeouts: httpx default 5 s; queued request waits minutes for first byte; no read timeout, pool timeout off, connect and write 10 s; pool at least c. -> A.
- B13 Hint: workers share one iterator of request indices so total is exactly n. -> A.
- B14 Hint: API key from env var named on the command line, never in code; Bearer header; add .env to .gitignore before creating it. -> A.
- B15 Hint: git sha via git rev-parse short HEAD; commit before a run so sha points at the code. -> A.
- B16 Hint: test against a fake: 20-line FastAPI app sleeping 50 ms then streaming fake tokens at 10 ms, sometimes 2-3 per event, behind an asyncio Lock. Known answers: TTFT about 60 ms at c = 1, about (c − 1) × service time above, flat throughput. Harness must reproduce before you trust it. -> A; B appreciates.
- B17 Task 4: short.jsonl: 50 varied chat prompts of a sentence or two; long.jsonl: 20 prompts of about 2,000 tokens (long public-domain passage + question) for prefill. Agent can write them; check lengths with tokenizer. -> A.
- B18 scoreboard.py: reads a results file, prints every concurrency level (n_ok, TTFT p50/p90/p99, tok/s p50, e2e p50, throughput), shows "n<100" in place of p99 when fewer than 100 OK, prints row to paste: date, target, change, TTFT p50/p99 at c = 1, tok/s p50 at c = 1, throughput at c = 16, notes (precision, n, sha). -> A.
- B19 SCOREBOARD.md: header Llama 3.1 8B Instruct, short prompts, 256 output tokens, ignore_eos; first two rows: Fireworks reference, Spark baseline (HF generate, one at a time, bf16). Appended at the end of every lesson. -> A.
- B20 Task 5: commit, then key in shell or untracked .env. Spark: c 1, 4, 16, n 200, 256 tokens, ignore_eos. Fireworks: c 1, 4, 16, 64, n 1,000. Spark run takes a few hours (200 × about 20 s, three times). Spark c = 64 with n 128: every request waits about 20 minutes. Then both with long prompts, max_tokens 64, c = 1, for prefill. Check Fireworks pricing first; know what you spend. -> A.
- B21 Done when: curl shows text word by word, last events carry usage and DONE; harness reproduces fake-server answers including the (c − 1) × service-time staircase; results for both at 1, 4, 16 (and 64 Fireworks) with full metadata; SCOREBOARD has first two rows; no API key in the repo. -> A, folded into flow.

## Measure

- E0 Results table per target and c: TTFT p50, TTFT p99 with n, tok/s p50, e2e p50, throughput. Expectations to check, your numbers win. -> A, not read as table.
- E1 Spark tok/s at c = 1 vs prediction: ceiling about 17; naive generate lands noticeably below, often half to nine tenths. Write measured ÷ predicted. Missing part isn't memory: Python running the loop, launching hundreds of small GPU kernels per token (Term: small programs on GPU, several per layer, each launch a few microseconds CPU-side), waiting between them; GPU idle for slivers. -> B wrong model "below ceiling means memory is slower than spec"; A corrects.
- E2 Spark TTFT c = 1 short: 100 to 200 ms on localhost: one pass over 16 GB about 60 ms before compute, plus prompt compute and Python overhead. -> A.
- E3 Long prompts: prefill about 2 × parameters × prompt tokens operations: 2 × 8 billion × 2,000 = 32 trillion; at a few tens of trillions per second, about one second. Divide backward from measured TTFT for effective compute rate. -> A in words.
- E4 Spark c = 4, 16: TTFT p50 close to (c − 1) × c = 1 end-to-end; throughput flat at single-stream tok/s. Both true = measured Little's Law. c = 16: several minutes to first token. Batching lesson deletes that number. -> A.
- E5 Fireworks c = 1: TTFT mostly your internet round trip plus their front door: few hundred ms, more on bad connection or busy hour. Per-stream tok/s for 8B typically hundreds. Ratio vs Spark is "how far behind am I" headline. -> A.
- E6 Fireworks c = 16, 64: TTFT and tok/s barely move; throughput grows almost in proportion to c until your rate limit. 429s at 64 are their limit on you, not their GPUs; record. -> A.
- E7 The crossover: find prompt length where Fireworks wins TTFT even at c = 1; where faster prefill pays for the round trip. -> A.
- G1 Fig 006 + table: every gap has a cause and a lesson: tok/s below ceiling (Python loop, kernel launches, unfused ops -> serving engines, FlashAttention); the ceiling itself (16 GB per token in bf16 -> quantization); one token per pass (nothing checks several guesses -> speculative decoding); throughput flat (one request per pass -> batching); TTFT p99 explodes at c = 16 (waits behind all before -> continuous batching); repeated system prompts cost full prefill (prefix recomputed -> prefix caching); how many users fit, at what context (KV cache grows -> KV cache, memory math). -> A as a spoken map, grouped; not read row by row.
- G2 You'll also benchmark vLLM and SGLang on the Spark in serving-engines; they do most of the above. Build naive first so when you read their code you know which problem each piece solves, because you measured it. -> A.

## Break It

- X1 Leave httpx's default timeout: c = 16, plain AsyncClient; ReadTimeout because queued request gets no bytes for minutes. If harness drops errors, p99 looks great: slowest requests vanished. A timeout is a decision about which requests you're willing to not measure; make it on purpose and count failures. -> "what if" exchange; B: "so my p99 gets better?"
- X2 generate on the event loop: async def endpoint, call generate with streamer directly, iterate in same function. Health hangs during generation; harness sees TTFT about equal to end-to-end, nothing flushed until loop regains control. Lesson 4's stall at GPU scale. -> exchange.
- X3 Count events as tokens: tok/s reads noticeably low with word-sized events (many words > 1 token); against a bundling API, error shifts with load. Compare n_chunks to n_out. -> exchange.
- X4 Hang up halfway: max_tokens 1,024, kill client after a second; check logs and GPU utilization. Nothing tells generate thread nobody's listening; GPU keeps producing; depending on how Starlette closes the generator the lock may be released while it does, letting the next request run alongside a ghost. Real servers watch for disconnects and abort. A bug to fix when rewriting for batching. -> exchange; B "a ghost".

## Explain It Back (content must appear somewhere)

- Q1 Fireworks 3× better tok/s but your TTFT lower at c = 1: TTFT = network + queue + prefill; localhost ~zero network, nobody ahead, short prefill. Fireworks pays round trip, gateway, scheduler. Tok/s set by bandwidth and bytes per token: HBM ~10×, fewer bits, spec decoding, compiled kernels. Fixed costs favor nearby box; per-token costs favor fast one; long prompt or answer, Fireworks wins both. -> In Predict reveal + why-Fireworks section; B's closing restatement.
- Q2 Users at a 2 s TTFT SLO (Term SLO: target you promise for a metric, like p99 TTFT under 2 s): request takes ~20 s; arriving during one waits rest of it, about 10 s on average. Honest answer: one user, only if never overlapping. With random arrivals, fraction finding server busy = utilization = arrival rate × 20 s; for 99% to find it idle, utilization about 1%: one request every half hour or so. Fireworks can promise it because new request joins running batch. -> A asks it as a natural "so how many people could actually use this" moment after Little's Law; B works part of it.
- Q3 Cost per million tokens: Spark cost per hour = price ÷ expected lifetime hours + power kW × electricity price. Tokens/hour = measured aggregate throughput × 3,600 × busy fraction. Cost per million = cost per hour ÷ tokens per hour × a million. At ~13 tok/s, a million tokens ≈ 77,000 s ≈ 21 hours; multiply hourly cost by 21. Compare to provider's per-million output price (input priced separately, cheaper since prefill does them in bulk). Redo with batched throughput: hours per million shrink by the throughput gain. The economics inference companies run; why batching is their business. -> B asks "is it cheaper to run my own?"; A walks the method.
- Q4 20 samples can't give a p99: covered by S1-S3.
- Q5 Scaling 1 to 64: naive throughput flat, W = c × S, TTFT about (c − 1) × 20 s, tens of minutes at 64. Fireworks: each pass serves a batch, decode memory-bound so extra users cost little per pass; throughput nearly linear, per-user latency flat until batch fills or rate limit. Difference isn't hardware speed: whether one weight read serves one user or many. -> Close: B restates, A sharpens with this last line.

## Go Deeper / Connections

- D1 Go Deeper: one sentence naming Databricks "LLM Inference Performance Engineering: Best Practices" and Anyscale's continuous batching post (23× throughput). -> A near the end.
- D2 Connections: uses latency ladder, threads, load generator + Little's Law, 17 tok/s prediction; everything after is a scoreboard row; next: memory math, KV cache, then batching where the c = 16 row stops being embarrassing. -> A, one or two sentences.

## Flow

1. Problem: open on the seventeen, then the playground, B's "obviously", A's correction, three friends.
2. Origin as story; tricks list; "building the bad one on purpose".
3. Six numbers, then the anatomy timeline, then Predict who wins.
4. Tokens vs events.
5. Interactive figure tour; why Fireworks is faster per token.
6. Many users: predict, staircase, closed loop + Little's Law, batching contrast, the SLO question.
7. Samples for p99.
8. One API, stream shape, harness pipeline, fair-fight rules.
9. Build It: folder, setup, server (thread/sync/lock), harness, fake-server test, prompts, scoreboard, run.
10. Measure expectations, then the gap map; cost question.
11. Break It, four exchanges.
12. Connections + one Go Deeper sentence; B restates, A sharpens with "one weight read serves one user or many".
