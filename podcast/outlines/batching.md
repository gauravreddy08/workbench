# Outline: batching

Source: src/lessons/batching.mdx (plus the interactive figure BatchGantt). Curriculum entry:
"Batching and continuous batching." Question: why does serving many users at once make each token
cheaper, and what is continuous batching? Why: the reason inference companies make money; it turns
spare compute into throughput.

Diagnostic gaps this lesson aims at: numbers (bytes, bandwidth, per-step milliseconds), memory math
for models, why decode is memory-bound, and the async/threads model (engine thread vs event loop).
B voices the natural wrong models: "sixty-four users means each one is sixty-four times slower",
"continuous batching is just a smarter queue / batching faster", "just max out the batch for the most
throughput", "fluent output means the engine is right", "memory is always the batch limit".

Each item: what the lesson teaches -> how it is said aloud.

## Prerequisites re-explained

- T1 Baseline lesson: naive one-at-a-time server, bench.py closed-loop harness at concurrency levels, SCOREBOARD file. -> A re-states in the opening scene.
- T2 Bandwidth lesson: decode reads every weight once per token; 16 GB through 273 GB/s is about 59 ms, about 17 tok/s; math units idle; ridge point. -> A re-derives in one breath in the Problem.
- T3 KV cache: stored keys and values of every past token per layer; 128 KiB per token for Llama 3.1 8B bf16. -> A defines inline when it first comes up.
- T4 Waiting-vs-working and GIL: a blocking call on the event loop freezes every connection; PyTorch releases the GIL. -> A re-explains in Build It (t5).

## The Problem

- P1 c = 16 on the naive server: sixteen workers, 256 tokens each, served one at a time; sixteenth waited about five minutes for first word; total throughput ~13 tok/s, same as one user. "Added fifteen users and got only waiting." -> A opens on this scene.
- P2 Roofline: one decode step reads 16 GB to do 16 GFLOPs; GPU spends more than 99% of each step waiting for bytes; server makes users wait while math units idle. -> A, with B's wrong model.
- P3 Absurd part: GPU has room for dozens of users per step; server lets one in. -> A.
- P4 Not one line: random arrivals, different prompt lengths, different answer lengths; one-word answer waits for essay, essay waits for batch to fill, the one-ms-late user waits for all; took the field until 2022 and changed what an inference server is. -> A, conversational.

## Origin

- O1 Clipper (Crankshaw et al., NSDI 2017), TensorFlow Serving, NVIDIA Triton batched requests; fine for an image classifier: one forward pass, same shape, same time. -> story.
- O2 LLMs broke it: hundreds of forward passes per request, count unknown; 2021 FasterTransformer through Triton still batched whole requests, ran until longest member done. -> story.
- O3 2022 Orca at OSDI: Gyeong-In Yu, Joo Seong Jeong, Geon-Woo Kim, Soojeong Kim, Byung-Gon Chun, Seoul National University and FriendliAI. Decide after every iteration; finished leaves, new joins next step; iteration-level scheduling; up to 36.9x throughput of FasterTransformer at same latency on GPT-3 175B; within about a year vLLM, TGI, TensorRT-LLM ("in-flight batching"); name stuck: continuous batching. -> story, names spelled for the ear.

## The Idea: one read, many users

- I1 Kitchen recap from bandwidth lesson: chef chops a thousand onions a second, one slow delivery van; decode is van's speed; full model drives across town per token. -> A re-tells briefly.
- I2 Batching = van carries everyone's onions; 64 users' tokens in one step, each weight used 64 times; the 16 GB read happens once. -> A; B says "so each user is 64 times slower" wrong model, A corrects.
- I3 What grows with the batch: math (64 tokens of matrix-vector work, still tiny next to ridge point) and KV caches (each user's own bytes, attention reads all every step; weights shared, caches not). -> A.
- I4 Step time ≈ (weight bytes + B × KV bytes per user) / bandwidth; weights 16.06 GB -> 58.8 ms once per step; KV per user 1,024 tokens × 128 KiB = 0.134 GB -> 0.49 ms each. -> A in words with worked numbers.
- I5 Predict (b64-step): with 64 users, step about 1.5x longer, 58.8 + 64 × 0.49 ≈ 90 ms vs 59; 64 tokens per step; throughput ~17 -> ~710 tok/s, ~42x; per-user 17 -> 11; math: 64 × 16 GFLOPs ≈ 1 TFLOP, under 10 ms at 125 TFLOP/s, overlaps memory traffic. -> A asks, B guesses, reveal.
- I6 Fig 001: batch 1: 59 ms, 17 total, 17 per user; 4: 61 ms, 66, 16; 16: 67 ms, 240, 15; 64: 90 ms, 710, 11; 256: 185 ms, 1,390, 5. Up to 16 barely moves; at 64 KV is a third of traffic; at 256 most of it, 5 tok/s each, trading their experience for throughput. Compute roof never appears: at 1K context the Spark runs out of bandwidth for KV long before math. Real servers land below ceilings; shape matters. -> described as a picture over the phone, a few rows said.
- I7 Economic case: GPU-hour costs the same at 17 or 700 tok/s; batching divides the hour by 40. -> A, B reacts.

## Static batching and its three taxes

- S1 Static batching: collect B, pad to one shape, run generate together, return when done; nobody joins or leaves; standard before Orca. -> A.
- S2 Fig 002: top: four prompts left-padded to longest, 42% of the prefill is padding; bottom: batch of four runs to its longest; finished rows hold slots; R5 arrives after start, waits for all; slot use 60 of 120 slot-steps, 50%. -> described.
- S3 Tax 1 padding: GPU wants a rectangle; filler tokens + attention mask (1s and 0s, 0 positions get minus-infinity score, zero weight after softmax); answer right but filler is real compute and real KV memory; decoder models pad on the left so each row's last real token is in the final column where the next token is appended. -> A.
- S4 Tax 2 waiting for the longest: "yes" is one token, code review a thousand; finished rows keep their place producing thrown-away padding; half the slot-steps wasted in the figure; real chat can be worse. -> A.
- S5 Tax 3 head-of-line blocking (networking term: slow item at front holds up those behind); R5 arrives just after start, GPU had room (R4 left early) but batch closed; TTFT = longest answer in someone else's batch. -> A, B connects to waiting-vs-working queue.

## Dynamic batching

- D1 Fourth problem: "collect B" — what if only three show up? 3 a.m., one person waits for three strangers to wake up. -> A.
- D2 Predict (static-deadlock): B=16 waits for 16; closed loop c=4 with 3-request warm-up: reports nothing, ever; never more than 4 in system (warm-up only 1); deadlock; also bites at c=16 when run winds down; author watched it happen. -> A asks, B guesses wrong, reveal.
- D3 Dynamic batching: start when full OR when oldest has waited the max window; Triton's dynamic batcher, max_queue_delay_microseconds; window is a dial (zero = never wait, large = fuller batches); each request pays up to one window; typical few to few tens of ms. -> A.
- D4 Fixes the deadlock, not taxes 2 and 3; batch still closed until longest finishes. -> A.

## Continuous batching

- C1 A request is a prefill then hundreds of tiny identical decode steps; each step a natural break point: who's done, who's waiting, who's next. -> A.
- C2 Iteration-level scheduling; continuous batching (also in-flight batching, NVIDIA; dynamic batching at token level); batch = changing set, each at its own position; bus with seats, never waits at terminal. -> A; B voices "so it's a smarter queue" and A corrects.
- C3 Loop: admit (free seats + waiting -> prefill, makes first token); step (one forward pass, one token each); emit (to each user's stream); evict (stop token or max_tokens; seat and KV freed at once). -> A in words.
- C4 Fig 003 interactive: ten requests, four policies, mixed/equal lengths, trickle/all at once, slot slider 1-8, max-wait slider; readouts (utilization, TTFT mean/worst, latency, done-at, throughput); grey hatch = finished but seat held; step treated as constant, illustrative 60 ms. -> described as what you'd see while clicking.
- C5 Mixed, trickle, 4 slots: none 160 steps, a quarter of slots used; static 92 steps, full of grey; continuous 46 steps, ~87% busy; mean TTFT 28 steps (static) -> under 6. -> A.
- C6 Dynamic, drag max wait: 0 = tiny batches immediately; up = fuller but later starts; neither fixes the grey. -> A.
- C7 Equal lengths, all at once: static, dynamic, continuous identical; nothing to fix; matters for benchmark. -> A, B surprised.
- C8 8 slots mixed: everyone's first token within a step or so; cost of more slots is memory. -> A.
- C9 Harness = closed loop (each of c workers sends next only after previous finishes; exactly c in flight) with fixed max_tokens and ignore_eos: equal lengths, all at once at c=16; expect dynamic to look surprisingly good at c=16; plan a mixed run. -> A.

## Prefill and decode in the same step

- F1 Newcomer needs prefill: whole prompt in one pass; running sequences need one decode token each. -> A.
- F2 Simple design: a step is either prefill or decode; 2,000-token prompt ≈ 2 × 8 billion × 2,000 = 32 trillion ops, order of half a second or more on the Spark; 63 users freeze; ITL (gap between consecutive tokens; a stall is one huge gap, max_gap). -> A worked in words.
- F3 Orca mixed them: big matrix multiplies don't care which request a token is from, only attention does; attention per request, everything else batched: selective batching. -> A.
- F4 Still one giant step; chunked prefill (Agrawal et al., SARATHI 2023, Sarathi-Serve OSDI 2024; standard in vLLM and SGLang): pieces of a few hundred tokens, one per step; fixed per-step token budget (bounds how slow a step gets); decodes first, then prefill chunks; decodes smooth, newcomer TTFT a little longer. -> A.
- F5 Bonus: decode memory-bound, prefill compute-bound; mixing puts both halves of the chip to work. -> A, B connects.
- F6 Fig 004: loop admit -> one forward -> emit -> evict, once per token forever; slot table: B finishes after T2, D takes its seat at T3, nobody waits for A; E and F join at T6; one step with chunked prefill, budget 512: 63 decode tokens + 449 tokens of chunk 2 of a 2,000-token prompt; without chunking one 2,063-token step and 63 streams freeze; with chunking five steps of at most 512. -> described.

## The trade: throughput vs latency

- R1 Bigger batch = slower step for everyone (17 -> 11 at 64); newcomer prefills stall further; wait window is pure added latency. -> A.
- R2 Maximize throughput subject to a promise: SLO (target you commit to, e.g. p99 TTFT under 1 s, or at least 10 tok/s per stream); typical LLM SLO = TTFT (p99) + ITL (p50 or p90); people read 4-6 words/s, below 8-10 tok/s feels like waiting. -> A; B voices "just max the batch".
- R3 Goodput: throughput counting only requests that met SLO; 700 tok/s with half blowing TTFT ≈ 350; DistServe (OSDI 2024) popularized it; past the knee goodput falls while raw throughput climbs. -> A.
- R4 Fig 005 (schematic): throughput vs p99 TTFT on log axis, SLO line at 1 s; naive flat line sliding right (minutes); static climbs then hits B and slides right (c=64 queues); continuous climbs steeply and stays left until steps slow or memory runs out. Left of the line is usable. -> described.

## Memory is the real batch-size limit

- M1 On many machines a harder wall: every running sequence keeps its whole KV cache in GPU memory as long as it runs. -> A.
- M2 128 KiB per token = 2 (K and V) × 32 layers × 8 KV heads × 128 dims × 2 bytes; user at 4K context holds 512 MiB. -> A walks multiplication in words.
- M3 Fig 006: 128 GB unified shared with CPU, OS; ~20 GB OS+runtime, 16 GB weights, ~90 GB KV pool ≈ 690,000 tokens (planning number, measure yours); 512 tok: 64 MiB, ~1,300 users; 4K: 512 MiB, ~170; 32K: 4 GiB, ~21; 128K: 16 GiB, ~5; padded cache: real tokens 490 of 900. -> a few rows said.
- M4 Spark generous: at ~300 tokens context a thousand users fit; bandwidth and overhead stop you first; unusual. 24 GB gaming card: ~6 GB for caches, ~46,000 tokens, ~11 users at 4K. Data-center GPU with 70B: memory almost always the wall; hence vLLM's paged attention is about memory. -> A; B's "memory is always the limit" corrected both ways.
- M5 Worse than the table: padding (one 4,000-token conversation with 63 short chats reserves 4,000 for everyone); unknown future (max_tokens 4,096 might be used; worst-case reservation fits fewer, less risks running out); running out mid-answer -> preempt (swap KV to CPU memory, or throw away and recompute); your server just caps seats. -> A.
- M6 Paged attention and prefix caching fix the first two with small fixed-size blocks like virtual-memory pages. -> A, one line.

## Build It

- B0 Two upgrades: dynamic batching (asyncio queue + collector + padded generate) then continuous (own loop); same API, same harness, two scoreboard rows; files: common, server_static, engine, test_engine, server_cb, plot, mixed prompts. -> one sentence of setup.
- B1 Develop on the Mac with SmolLM2-135M-Instruct (Llama-shaped, grouped-query attention), fp32; Llama 3.1 8B bf16 on the Spark; checked on transformers 5.20 / PyTorch 2.14. -> A.
- B2 t1 common.py: shared loading, request model, SSE helpers, EOS set (Llama 3.1 Instruct has several), Detok: decode whole list, emit new suffix, wait on half a character; quadratic but microseconds at 256; real servers keep a window. -> A briefly.
- B3 t2 shape: async endpoint, Job with its own asyncio queue, shared pending queue, collector forms batches (MAX_BATCH or oldest waited MAX_WAIT_MS), one generate on left-padded inputs in a worker thread, waits before forming the next batch (head-of-line blocking on purpose). -> A.
- B4 Streamer: put called once with prompt ids (skip), then once per step with one new token per row; per job count, decide finished (own max_tokens or EOS unless ignore_eos), hand over (token, done); on generate's thread so must use call_soon_threadsafe; end() marks open jobs done. -> A, the interesting part.
- B5 Collector: sleep until one job; keep taking until full or window closes (wait_for timeout); infinite window = pure static; run batch via to_thread. -> A.
- B6 Hints: left padding, pad token = eos (Llama 3 has none), chat template as strings then tokenize with padding and no added special tokens (template already added begin-of-text); one max_new_tokens per batch = largest (tax 2 visible); all ignore_eos -> min_new_tokens; usage from mask sum, completion count in endpoint; endpoint reads queue, Detok, SSE, usage + DONE; start collector in lifespan, same loop; wrap run_batch in try/except or collector dies and all requests hang. -> A, selected.
- B7 t3 design: one padded KV cache per layer [B, kv_heads, L, head_dim], left-padded so latest token in last column; mask [B, L]; decode appends a column; admit = prefill, left-pad to same length, stack; evict = keep rows, trim unused leading columns. -> A as a picture.
- B8 Given helpers: DynamicCache (HF default per-layer keys/values, grows each step, passed in as past_key_values and returned grown); converters; left_pad. Version-specific. -> A one sentence.
- B9 Engine skeleton: Seq (id, prompt, max_new, ignore_eos, out, done); Engine waiting/running/cache/mask; pick (greedy; ignore_eos rows' EOS set to minus infinity); prefill; merge; evict; step (admit up to free seats, if admitted this step is their prefill else decode all; mark/evict; return seqs that got a token). -> A in words.
- B10 Hints: position ids (prefill: running count of real tokens minus one, floored at zero; decode: count of real tokens before appending the new mask column); decode call inputs; only last logits (2,000 × 128,256 vocab = half a gigabyte; logits_to_keep=1); finished (len(out) == max_new or EOS when not ignore_eos; max_new 1 finishes at admit); prefill and decode separate steps; seats not memory (optional KV budget check); copies on merge/evict fine, DynamicCache's per-step cat copies too, what paged attention stops. -> A, key ones.
- B11 t4 test: engine runs, fluent, subtly wrong; fluent text is not evidence; six prompts, three seats, arrivals at steps 0, 3, 4, 20, different lengths; must match one-at-a-time greedy generate exactly; ignore_eos matters (reference's min_new_tokens suppresses EOS) — the mismatch the test caught while writing the lesson. -> A; B voices "it reads fine" wrong model.
- B12 Won't catch: bf16 drift (padding/batch size change matmul shapes -> order of floating-point additions -> near-ties flip); test exactness in fp32, in bf16 check first few dozen tokens; no streaming/threading test. -> A.
- B13 t5 server_cb: engine in own thread, thread-safe inbox; loop blocks when idle, drains inbox into waiting, steps, sends (count, done) through call_soon_threadsafe; endpoint builds Seq with its asyncio queue and loop; send the count not the token: consistent snapshot, decode on loop side. -> A.
- B14 Why a thread: step blocks 60-100 ms; on the loop it freezes every connection (waiting-vs-working); PyTorch releases the GIL inside kernels so they overlap. -> B asks, A re-explains prereq.
- B15 Review checklist: no blocking call on loop; no asyncio queue touched from engine thread except via call_soon_threadsafe; exceptions in step logged and fail affected requests; disconnecting client's sequence marked done (baseline bug). -> A.
- B16 t6: bench override per-prompt max_tokens; mixed.jsonl: 50 short prompts, 60% at 32, 30% at 256, 10% at 1,024, fixed seed; plot: one line per server, one point per concurrency, x = p99 TTFT log, y = total throughput, SLO line at 1 s, star = fewer than 100 samples. -> A.
- B17 t7: commit first; one server at a time; static B=16, 50 ms; concurrency 1, 4, 16, 64; 200 requests, 256 tokens, ignore_eos; continuous up to 64 seats; mixed at c=16 for both; at c=64 200 is ~3 per worker, use 512; two scoreboard rows, c=64 throughput in notes. -> A, one stretch.
- B18 Done when: test passes; both stream under curl and survive c=64 with zero errors; results at 1/4/16/64 plus mixed; two rows; plot with three lines. -> A, short.

## Measure

- X1 Results table (naive/static/continuous × c, plus mixed), columns TTFT p50/p99, per-stream tok/s, max gap p99, throughput; expectations not results; overheads can move them. -> A frames.
- X2 c=1: within a few tok/s; static TTFT about one window (50 ms) worse even when nobody is coming; continuous tok/s maybe a bit lower (Python bookkeeping). -> A.
- X3 Predict (c16-equal): close to a tie, static maybe slightly ahead; closed loop equal lengths = all at once case; HF generate has less Python per step; difference shows in mixed and c=64. -> A asks, B guesses continuous wins big, reveal.
- X4 c=16: TTFT p50 from minutes to well under a second; throughput up an order of magnitude; ceiling ~240, half or more reasonable; per-stream a bit below c=1. -> A.
- X5 c=64: static has 16 seats, 48 queue, TTFT p50 tens of seconds (one to three batch lifetimes of ~256 steps), throughput stuck at c=16 value; continuous all 64 in, TTFT ~1 s or under, throughput well past c=16 (ceiling ~700-900; a few hundred good for Python), per-stream drops. -> A.
- X6 Max gap at c=64 continuous: each admission skips a step for everyone; 64 requests of 256 tokens, someone finishes about every four steps, so a prefill stall roughly every fourth step; costs throughput too; motivation for chunked prefill. -> A works it in words.
- X7 Mixed at c=16: continuous clearly beats static on throughput and TTFT; static batches dominated by 1,024-token members, 32-token ones in held seats; compute wasted fraction: computed (longest × size) vs delivered. -> A.
- X8 Plot vs Fig 005: points left of 1 s line; highest is capacity at that SLO, the number for a capacity plan. -> A.

## Break It

- K1 Pure static (infinite window, B=16): c=4 never returns; c=16 hangs on the last few; happened while testing; every batcher needs a deadline, closed-loop benchmark finds the missing one. -> what-if exchange.
- K2 Right padding: two very different prompt lengths at once; short one's answer is nonsense or runs on; new tokens appended after pad run; transformers warns; newest token must be in last column. -> what-if.
- K3 Break position ids (cache column count for every row): test: 2 of 6 matched, 4 drifted; low-padding rows fine, padded rows off; drifted text can read fine; RoPE (rotates query and key by an angle from position id); padding must be invisible to every part of the model. -> what-if.
- K4 Paste a novel: c=32 steady short requests, one 4,000-token prompt; every other stream stalls for the full prefill, most of a second; chunking into 512-token pieces = forward over 512 new tokens attending to the cache so far, prefill nearly does it if it accepts a starting cache; scheduler decides how much work per step, not just who. -> what-if.

## Explain It Back (substance must appear)

- E1 Why cheaper, why not 64x slower: weight read same for 1 or 64, each weight multiplied against all 64; step a bit longer; 64 tokens; ~40x tokens per GPU-hour, each token ~1/40 the cost; per-user drop only by step-time increase, 17 -> 11. -> in I2-I7 and B's restatement.
- E2 Static's problems + continuous fix: padding, held slots, late arrival waits, plus forever-wait without a window; dynamic fixes only that; continuous decides every step. -> S/D/C sections, B summary.
- E3 How it scales: 10 tok/s per stream -> step ≤ 100 ms; 100 ms × 273 GB/s = 27.3 GB per step; minus 16.06 = 11.2 GB for KV; 1K context (0.134 GB) -> ~83 users; 512 -> ~167; ceilings, measure the highest c with per-stream p50 > 10 and TTFT p99 in SLO; bandwidth not memory is the limit here; on 24 GB card memory, ~6 GB. -> worked in the Trade section after goodput.
- E4 4,000-token paste: prefill compute-bound, separate step = everyone pauses; mixed in one pass still a long step; chunked prefill; steady steps, newcomer later; uses idle compute. -> F section and K4.
- E5 Why cap the batch: users feel TTFT and tok/s; bigger = slower, more prefill stalls; goodput; cap where goodput peaks, usually well below raw max; memory hard cap, preemption. -> R section + close.

## Go Deeper / Connections

- G1 Orca paper (sections 2 and 3) and Cade Daniel's Anyscale post on continuous batching. -> one closing sentence.
- N1 Next: paged attention and prefix caching; speculative decoding competes for the same idle compute; real schedulers in vLLM and SGLang. -> one sentence.

## Flow

Open on the c = 16 naive result (P1) -> B's wrong model about GPU being busy -> roofline re-explained (P2-P4) -> Origin as a story -> one read, many users with the 64x-slower wrong model and the Predict -> Fig 001 + economics -> static and its taxes (Fig 002) -> 3 a.m. problem, deadlock Predict, dynamic batching -> continuous batching with "smarter queue" wrong model, loop, interactive figure walk-through, harness implication -> prefill stalls, selective batching, chunked prefill, Fig 004 -> trade-off, SLO, goodput, Fig 005, capacity worked example (E3) -> memory wall, KV math, Fig 006, gaming card, three aggravations -> Build It (seven tasks) -> Measure with c16 Predict -> Break It four what-ifs -> Connections line -> B restates core idea, A sharpens, stop.
