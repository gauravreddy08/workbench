# Outline: serving-engines

Source: src/lessons/serving-engines.mdx. Curriculum entry: "Inside vLLM and SGLang." Question: what do
production inference engines do that your server does not yet? Why: reading real systems code is how
you level up after building your own.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: his own simplified versions of baseline server and harness, KV cache, batching, prefix caching, quantization, speculative decoding. -> A, in the opening scene as the list of things he built. "Today" bullets skipped as a list; each is an item below.

## The Problem

- P1 Weeks on his server: KV cache, continuous batching, prefix cache with LRU, quantized weights, draft model; every change a scoreboard row; proud of the c = 16 row. -> A opens on this scene.
- P2 Pull a container, one command (vllm serve Llama 3.1 8B Instruct), same harness; loads in a couple of minutes; c = 1 a bit faster than his best; c = 64 a lot faster, p99 TTFT a fraction of his. -> A continues the scene.
- P3 Nothing he did was wrong; it does all of it at once, plus things he didn't think of, none in Python on the hot path. -> A, after B voices wrong model "they must just have better GPU code / faster kernels".
- P4 Best moment to read their code: he knows what every piece is for because he measured each problem. Most people meet vLLM as a black box with two hundred flags; he meets it as "my batching loop in its own process", "my prefix cache in blocks", "my launch overhead, gone". -> A.
- P5 Two skills: what production engines do that his doesn't; how to read a few-hundred-thousand-line codebase without drowning: find the loop, find the data structure, follow one request. -> A, as the signpost.

## Origin

- O1 2022: serving meant naive server: batch in, whole batch out when longest finishes. Orca (Yu et al., OSDI 2022): schedule every iteration, one token step, finished leave and new join mid-flight = continuous batching. -> A tells as story; re-explain continuous batching briefly.
- O2 June 2023 UC Berkeley released vLLM; PagedAttention borrowed virtual memory: KV in small fixed pages, not a big reserved slab per request; waste from most to almost none; more requests fit; paper Kwon et al. SOSP 2023: two to four times throughput. -> A.
- O3 December 2023, LMSYS released SGLang; RadixAttention keeps KV of finished requests in a tree so later requests sharing a prefix (system prompt, few-shot example, chat history) reuse it automatically. -> A.
- O4 By 2024 GPUs so fast bottleneck moved to the CPU: Python scheduling, preparing inputs, launching kernels. -> A; B surprised.
- O5 January 2025 vLLM V1 re-architecture: separate processes so CPU overlaps GPU, simpler scheduler, persistent batch, CUDA graphs everywhere. Lesson describes V1 shape; shape changes slower than files. -> A.

## The Idea: three processes and a loop

- I1 His server was one process: FastAPI app, one model, a lock, a thread pushing text into a queue; all CPU work (tokenizing, SSE chunk, the Python of generate) competed for one interpreter and one GIL. Re-explain GIL briefly. -> A.
- I2 V1 splits into separate processes connected by sockets. -> A.
- F1 Figure 001 (interactive EngineMap): three columns: API server (HTTP server, input processor, engine client, output processor), engine core (busy loop, scheduler, KV cache manager, structured output), GPU worker (model runner, CUDA graphs + torch.compile, attention backend, sampler); ZMQ between API and engine core, RPC to worker; each box has what it does, his version, where to look. -> A describes like a diagram over the phone, box by box with "your version" mapping.
- F1a Box details: HTTP server never touches GPU (yours: endpoint in server_naive.py); input processor applies chat template + tokenizes in API process (yours: apply_chat_template); engine client serializes over ZMQ, background asyncio task routes outputs back (yours: streamer queue between generate thread and response thread); output processor detokenizes incrementally (token can be half a character), checks stop strings, builds chunks incl. usage (yours: TextIteratorStreamer + chunk helper). -> A, walking the left column.
- F1b Engine core boxes: busy loop (yours: step loop for continuous batching), scheduler (yours: continuous-batching scheduler), KV cache manager (yours: KV cache then prefix cache with LRU), structured output (nothing yet, new). -> A, middle column.
- F1c Worker boxes: model runner (yours: body of generate loop), CUDA graphs + torch.compile (yours: torch.compile and launch overhead from Python speed lesson), attention backend (yours: GPT-2 attention, FlashAttention next), sampler (yours: speculative sampling; rejection sampler checks drafts). -> A, right column.
- I3 API server: HTTP and text: validate JSON, chat template, tokenize; on the way back detokenize, write SSE chunks; all CPU, sometimes a lot (tokenizing a 100,000-token doc takes real milliseconds). -> A.
- I4 Term busy loop: loop that runs continuously checking for work rather than sleeping; keeps one CPU core busy. -> A inline.
- I5 Term engine step: one iteration: choose requests, one forward pass for all together, process outputs; each running request gets usually one new token per step. Engine core owns request queues and KV block pool. -> A inline.
- I6 GPU worker owns weights and GPU; turns "these requests, this many tokens, KV in these blocks" into tensors and runs forward. One GPU: worker may run in-process (check); tensor parallelism: one worker process per GPU. -> A.
- I7 Term ZMQ: small library for messages between processes over sockets with queueing built in; requests/outputs serialized into compact messages. -> A inline.
- I8 Why pay serialization vs threads sharing memory? GIL: tokenizing/detokenizing on threads would take turns with the scheduler; each ms is a ms the scheduler can't run and GPU idles. Separate processes: API detokenizes step N while engine core schedules N+1. Same reason data loader uses worker processes. -> B voices the wrong model "threads would be cheaper, they share memory", A corrects.
- PR1 Predict why-processes: what fraction of a decode step was GPU busy on naive server at c = 1; which number improves most from moving text work out. Answer: GPU idle for slivers while Python runs loop, prepares input, launches hundreds of kernels; measured indirectly as measured/predicted tok/s; ten to forty percent idle common for naive generate; measure in profiling. Helps most at high concurrency: c = 1 detok one token is microseconds; c = 64 is 64 detokenizations, 64 SSE chunks, 64 socket writes per step, which would add to every step. c = 1 gains come from CUDA graphs and lean step. -> A asks, B guesses c = 1 tok/s (wrong), reveal.

## The Idea: what one step does

- S1 His batching loop: if waiting and room, prefill; then one decode step for everyone. Two kinds of steps, by phase. -> A.
- S2 V1 has no phases; Term token budget (max num batched tokens): max tokens per forward pass; scheduler hands out tokens till it runs out. -> A.
- S3 Rule 1: running requests first, each decoding one gets 1 token (more with spec decoding checking several drafts); cheap; starving them stalls streams. -> A.
- S4 Rule 2: waiting requests oldest first while budget lasts; a long prompt gets part now, rest later; Term chunked prefill: process long prompt in pieces mixed with others' decode tokens so one huge prompt can't freeze streams. -> A.
- S5 Rule 3: for each admitted, ask KV cache manager for room; no room means preemption. -> A.
- S6 Output a small record: per request, how many tokens, which new blocks. Worker runs one forward pass over all tokens, mix of prefill chunks and single decode tokens; attention kernels handle the mix. -> A.
- S7 Why mix: decode step limited by reading weights, compute mostly idle (re-explain bandwidth-bound); prefill is lots of compute per byte. Mixing uses compute decode wasted inside the same weight read. Two-phase loop paid for the weight read twice. -> B voices diagnostic gap ("decode is the heavy math part"), A corrects with the memory-bound picture.
- F2 Figure 002 journey (interactive): 41 prompt tokens, first 32 cached system prompt, 256 output, sharing forward with 15 others. Steps: request arrives (validate, sampling params temp 0, max tokens 256, ignore eos); template + tokenize = 41 tokens in API process; serialized over ZMQ to waiting queue, nothing touched GPU; scheduler: running get 1 each, budget left, admitted; prefix lookup 32 tokens = 2 blocks cached, only 9 to compute; allocate_slots gives one new block (would fail and preempt newest if pool empty); worker gets diff, updates persistent batch (token ids, positions, block table, slot mapping); one forward: 9 prefill tokens + 1 decode for each of 15 others, attention reads 32 cached through block table; sample: token "Once", whole batch sampled together; update_from_output appends token, checks stop, packages outputs; back in API process, detok, SSE chunk, harness stamps TTFT; decode steps one token each, shape matches captured CUDA graph, replays from one launch; at 7 tokens out, 48 tokens fill 3 blocks exactly, 8th needs slot 49, fourth block; memory grows 16 at a time, never reserved up front; finish at 256, finish reason length, final chunk carries usage then done; blocks back to free queue, full ones keep hashes. -> A narrates as a story of one request, B interjects at the block arithmetic.
- S8 Three takeaways: crosses process wall twice per token, fine because microseconds and overlapped; KV grows one block at a time, why so many fit; GPU never sees a "request", sees batch of token positions and a table of where KV lives. -> B voices wrong model ("the GPU keeps track of each conversation"), A corrects.

## The Idea: memory

- M1 Built in prefix caching lesson; only production details. -> A, one line.
- M2 Startup: load weights, one fake forward pass at the largest batch to measure peak activation memory, turn remaining memory up to gpu-memory-utilization fraction into pool of KV blocks. -> A.
- M3 Term blocks: fixed-size pages of KV; 16 tokens by default on CUDA; every layer. -> A inline.
- M4 Arithmetic: 32 layers × 8 KV heads × 128 dims × 2 (K and V) × 2 bytes = 128 KiB/token; 2 MiB per 16-token block. -> A walks multiplication in words step by step; B does part of it.
- M5 80 GB of 128 to vLLM, minus 16 GB weights, few GB activations: roughly 30,000 blocks, around half a million tokens; spec-sheet back-of-envelope; vLLM prints real block count at startup, read it. -> A, B asks what it means on his machine.
- M6 Block table per request lists blocks in order. Prefix caching by hashing: each full block hashed with its tokens plus previous block's hash, so a hash names an entire prefix. New request computes hashes, looks up, reuses hits. Finished: blocks to free queue in LRU order, keep hashes, reusable until memory needed. get_computed_blocks and allocate_slots pair. -> A.
- M7 When allocate_slots says no, pick a victim: FCFS default, request at back of running list, most recently admitted; priority policy: lowest priority. -> A.
- F3 Figure 003: pool full, R1 needs one more block, newest R4 preempted. Recompute: free R4's blocks (hashes kept), R4 to front of waiting queue, later prefill prompt + generated again; cost compute, prefix hits make it cheaper. Swap: copy R4's blocks to CPU RAM, copy back, continue; cost bytes over PCIe twice; on Spark same LPDDR5x pool. V1 recompute, V0 had both. -> A describes the two halves.
- M8 Terms recompute and swap defined; data-center swap = two trips over PCIe, far slower than GPU memory. V1 recomputes: frees blocks, sets computed tokens to zero. Why: simpler, prefill is fast part, prefix cache often keeps victim's blocks so recompute is partly a cache hit. -> A.
- PR2 Predict spark-swap: would swap be good on Spark? Answer: one 128 GB LPDDR5x pool shared by CPU and GPU (spec sheet); swap copies bytes within same memory, burning same ~273 GB/s decode needs, frees nothing that couldn't be given to KV pool; right move: bigger pool (gpu-memory-utilization, leaving headroom for OS which shares the pool) and recompute for rare overflow. -> B says swap sounds great because Spark has lots of CPU memory; A asks where CPU memory physically is; B gets it.
- M9 Preemption is a policy question: FCFS fair and simple, newest pays; priority lets paying/interactive traffic never get preempted by batch; SGLang default cache-aware. Every preemption wasted work + stall; vllm num_preemptions on metrics endpoint first thing to look at when p99 goes bad. -> A.

## The Idea: taking the CPU out of the loop

- C1 His server per decode token: Python decided, built tensors from lists, copied to GPU, launched every kernel one by one. 32 layers, handful of kernels each (norms, projections, attention, activation, adds): hundreds of launches; few microseconds each; 400 at 5 microseconds = about 2 ms per step (rough, check profile). -> A.
- C2 Is 2 ms a lot? Spark decode step reads 16 GB at 273 GB/s ≈ 59 ms; H100 3.35 TB/s (spec) ≈ 5 ms; 2 ms is 3% of Spark step, 40% of H100 step. Engines built for the second case; expect smaller c = 1 advantage on Spark than hype. -> B says "two milliseconds is nothing", A: depends what it's next to.
- C3 Term CUDA graphs: record sequence of kernel launches once, replay with one launch; shapes and addresses must stay same. One graph per expected batch size (list chosen at startup), pad to nearest; startup "capturing CUDA graphs"; torch.compile fuses small ops first (Python speed lesson); attention can be left out and run between pieces: piecewise capture. -> A.
- C4 Persistent batch: model runner keeps input tensors on GPU, scheduler sends only what changed (joined, left, new blocks); most steps almost nothing changes. -> A.
- C5 Overlapping steps: async scheduling, engine core schedules N+1 while GPU runs N; SGLang overlap scheduler; check whether on by default. -> A.
- C6 Paged attention kernels: pluggable backend (FlashAttention, FlashInfer, Triton), per GPU and model; read KV from scattered blocks through block table; batch where some contribute 2,000 prompt tokens, others one; writing one is next lesson. -> A.
- PR3 Predict eager-cost: enforce-eager turns graphs off. Spark c = 1: few percent, maybe up to ten (couple ms of ~60 ms step); c = 64: similar or bit larger (more CPU per step, attention for 64); H100 ~5 ms step: tens of percent at small batch. Reasoned estimates, measure in Break It. -> A asks, B guesses big on Spark using the "CUDA graphs are huge" hype, reveal.

## The Idea: SGLang

- G1 Same shape: tokenizer manager in HTTP process, scheduler process with a loop, detokenizer manager process, model runner with CUDA graph capture, paged KV, OpenAI-compatible API. Differences are what it treats as first-class. -> A.
- G2 RadixAttention: vLLM's prefix cache is hash table of full blocks; SGLang's is a Term radix tree (edges labelled with token sequences, path from root spells a prefix, shared prefixes share a path). Node holds tokens on edge and KV memory indices. New request walks down, reuses, prefills rest. Evicts LRU leaves first so shared trunk (system prompt) survives longest. -> A.
- F4 Figure 004: left, vLLM chained block hashes: tokens 0-15, 16-31, 32-47, hash of each chained with previous; table hash to block id; hits on first two, miss on third; only full blocks cached. Right, tree: root, system prompt node, user A turn 1 and user B turn 1 branches, user A turn 2 new leaf; evict leaves first. Both find longest cached prefix; tree makes sharing structure visible, scheduler uses it. -> A describes both sides.
- G3 Cache-aware scheduling: default longest-prefix-match (prefers requests that hit most cache), depth-first ordering groups a subtree; FCFS optional. Trade throughput vs fairness: unusual prefix waits longer. -> A; B pushes on fairness.
- G4 Structured outputs: model "usually" complies with JSON, problem when parser crashes. Term constrained decoding (forbid any token that would break the format). Grammar compiler turns schema into state machine; each step a mask of legal tokens; sampler zeros others. -> A, using his agents' JSON tool calls as scene.
- G5 Jump-forward decoding (SGLang paper): when grammar allows only one continuation (the quote-name-quote-colon after an open brace), skip the model and append. -> A, said in words, no symbols.
- G6 Both engines support via pluggable backends (XGrammar, llguidance, Outlines); locations in each repo; mask computed on CPU while GPU runs forward, get_grammar_bitmask between execute and sample. -> A.

## The Idea: TensorRT-LLM and llama.cpp

- E1 TensorRT-LLM: NVIDIA's engine; historically compiled model ahead of time for specific GPU and shapes; in-flight batching (NVIDIA name for continuous); paged KV; edge is kernels (FP8, FP4 paths first); newer releases PyTorch-based workflow closer to vLLM; check docs; Spark playbook exists. -> A.
- E2 llama.cpp: C/C++, no Python on hot path, one or a few users on any hardware (CPU, Apple Metal, CUDA); Term GGUF (single file: weights usually quantized, tokenizer, metadata, laid out to be memory-mapped); "loads" by mapping pages (files-and-disks lesson); quant formats 4 bits and below; natural on Mac, good on Spark at batch 1; llama-server with OpenAI API so harness works unchanged; high-concurrency throughput not its goal. -> A, B asks "so which would I use on the Spark".

## The Idea: tensor parallelism

- TP1 70B in bf16 = 140 GB; doesn't fit on 80 GB GPU; decode would read 140 GB per token. Term tensor parallelism: split each layer's matrices across GPUs, each holds a slice of every layer, combine partial results. -> A; numbers worked in words (70 billion × 2 bytes).
- F5 Figure 005: one MLP on two GPUs: input copied to both; first matrix split by columns (left half / right half), each computes its half of hidden layer with no communication, multiplies by its half (rows) of second matrix, gets partial; one all-reduce adds partials. Attention splits same way by heads. Two all-reduces per layer. -> A describes; B asks why no talking in the middle.
- TP2 Why it helps decode: each GPU reads only its share of weights per token, in parallel. -> A.
- TP3 Term all-reduce: every GPU contributes a tensor, every GPU gets the sum; time set by interconnect latency and bandwidth. Two per layer = 64 per token for 32 layers. Small at batch 1 (4,096 × 2 bytes = 8 KB) so latency matters. -> A.
- TP4 NVLink: hundreds of GB/s, microsecond latency, TP close to free. Two Sparks linked by ConnectX-7: each all-reduce pays network round trip, 64 per token adds up; NVIDIA's multi-Spark playbooks about fitting models, not speeding small ones. -> B voices wrong model "link two Sparks, twice as fast", A corrects.
- TP5 vLLM: one flag tensor-parallel-size, one worker process per GPU. Pipeline parallelism (layers on different GPUs) and expert parallelism (mixture of experts) in Training on many GPUs. -> A.

## The Idea: disaggregated prefill/decode

- D1 Mixed batch good for throughput but every prefill chunk lengthens that step for every decoding request; stutter when someone's long prompt arrives; chunking caps not removes. Phases want different hardware: prefill compute, decode bandwidth + KV memory. -> A.
- F6 Figure 006: top, one GPU pool: small decode steps with wide prefill blocks in between, every stream stalls there. Bottom: prefill pool runs prefills back to back; decode pool runs steady small steps; KV cache shipped across the network between. -> A describes the two timelines.
- D2 Term disaggregated serving: prefill and decode on separate GPU groups, KV transferred after prompt processed. -> A.
- D3 DistServe (Zhong et al., OSDI 2024): separating and sizing each pool for its latency target serves more requests within both TTFT and inter-token targets. Splitwise (Patel et al., ISCA 2024): production traces at Microsoft, phases on different GPU generations. Mooncake (Moonshot AI) whole system around distributed KV cache. -> A.
- D4 Cost: 2,000-token prompt × 128 KiB = 250 MiB of KV before first decode step; fast networking; NVIDIA's NIXL to move it; vLLM KV connectors and SGLang support it; details move fast. -> A, B checks the number against earlier 128 KB.
- D5 Won't run on one Spark; explain it: current answer to "TTFT and inter-token latency fight; what at scale?" -> A.

## Build It

- B0 Project folder grows: engines folder with run_vllm and run_sglang scripts, TRACE.md reading notes, profiles folder. -> A, one sentence.
- B1 Task 1 Run vLLM on Spark: NVIDIA's Spark vLLM playbook and vLLM Recipes for image and flags; GB10 is newer Blackwell variant (sm 121); random pip install on ARM64 may lack kernels; playbook uses NGC container, vLLM blog used official vllm-openai CUDA 13 image; pin the tag. -> A.
- B2 Shape: docker with GPUs, port 8001 next to his own on 8000, SYS_PTRACE for py-spy, HF token, mounted HF cache and profiles, bf16, max model len 8192, gpu-memory-utilization 0.6. Fraction of the unified pool shared with OS/container/other processes: start 0.5-0.7, read startup log for KV blocks. Entrypoint may already include vllm serve. Prefix caching on by default. -> A, said as what the command sets, not read.
- B3 Smoke test with same curl; metrics endpoint grep kv cache usage and num requests to see the engine's view of itself. -> A.
- B4 Task 2 SGLang: NVIDIA "Serve LLMs with SGLang" playbook, CUDA 13 container, includes prefix-cache multi-turn and structured-JSON exercises; do both, ten minutes. Validated checkpoints are FP8 and NVFP4: serve bf16 first for fair row, then FP8 as second row vs his own FP8. Port 8002 mapped to 30000; shm size; mem-fraction-static 0.6; launcher name varies; check help for flags (disable radix cache, schedule policy, disable CUDA graphs); args being reorganized. -> A.
- B5 Task 3 benchmark: harness already speaks OpenAI API. Change 1: ask for usage via stream options include usage; Fireworks sends it by default, vLLM/SGLang only on request; without it n_out missing and tok/s empty or computed from chunks. Change 2: ignore_eos supported as extra field, keep sending. Check: five responses per engine, re-tokenize with HF tokenizer, compare to usage; must match exactly at temperature 0 with ignore_eos. -> A; B asks why the tok/s column would be wrong.
- B6 Sweep one target at a time (one GPU; two engines fighting measures nothing); stop each container. c = 1, 4, 16, 64, 400 requests, 256 max tokens, ignore eos; repeat for SGLang on 8002; long prompts at c = 1 for prefill; shared-system-prompt set at c = 16; record engine version and image tag; append rows to SCOREBOARD; c = 64 throughput in notes because that's where engines pull away. -> A.
- B7 Task 4 trace: the reading skill; agent may explain, TRACE.md map must be his words. Shallow clone, write commit hash at top. Rule: don't start at the top; start from the loop, follow one request outward both directions; grep and go-to-definition; don't read files top to bottom. Map checked Oct 2026; names move; search for the idea, write new location; noticing what moved is half the lesson. -> A; B voices wrong model "I'd start with the README / main file".
- B8 Nine stops: 1 loop (EngineCore.step, run_busy_loop: four calls in one step, where it blocks on GPU); 2 decision (Scheduler.schedule: budget variable name, what sets it, running or waiting first); 3 chunked prefill (line that clamps a long prompt); 4 memory (get_computed_blocks, allocate_slots, free, block_pool: what allocate_slots returns with no room, hash chaining, free queue); 5 preemption (victim under FCFS, computed-token count); 6 forward (execute_model, model forward, sample tokens: tensors built, where graph vs eager chosen); 7 attention backends + selector (which backend Spark log chose, why); 8 back out (update_from_output, output_processor: stop condition, ids to text); 9 front door (OpenAI entrypoints, AsyncLLM.generate, core client: how streaming response gets tokens from another process). -> A walks them as a route, briefly each, names spoken plainly.
- B9 For each stop: function, one sentence, which piece of his server it replaces. Tying question: single decode step at c = 16, every process boundary a token crosses and every Python function on its behalf. -> A.
- B10 Shortcuts: docs/design in repo (architecture, prefix caching, CUDA graphs, multiprocessing), read arch overview before stop 1; SchedulerOutput record in sched output file: one dataclass, the contract between scheduler and runner. Optional SGLang: scheduler with event loops and get next batch to run, schedule policy, radix cache, model runner. -> A.
- B11 Task 5 profile: py-spy = what is CPU doing; torch profiler = what is GPU doing and when idle. Term sampling profiler (peeks at call stack many times a second, doesn't change program, attach to live server). Install on host or container (pip, or cargo if no ARM64 wheel); SYS_PTRACE or sudo. -> A.
- B12 py-spy steps: find PIDs (vLLM names processes like VLLM EngineCore), dump one snapshot, record during c = 16 with subprocesses and native for 30 s to SVG. Term flame graph (width = how often on the stack; callers below callees; wide bars where time goes). In engine core: share in scheduler, input prep, waiting for GPU; healthy = mostly waiting. Repeat at c = 1 and vs his batched server; comparison is the lesson. -> A.
- B13 Torch profiler built in (v0.13+): enable at launch with profiler config, POST start profile / stop profile, few requests (traces huge), flushing takes a while; older versions used env var; open in Perfetto; zoom one decode step: duration, share matmul, share attention, gaps between kernels; repeat with enforce-eager: gaps are what graphs remove. -> A.
- B14 Done when: both serve on Spark, pass token-count check, tags pinned; scoreboard rows at 1/4/16/64 next to naive, best, Fireworks; TRACE.md nine stops + commit + c = 16 answer; flame graph + Perfetto trace and can point at what explains biggest gap. -> A, one sentence.

## Measure

- MS1 Setup: same prompts, 256 output, ignore eos, bf16 unless noted, one engine at a time; table of targets (naive, best, vLLM, SGLang, Fireworks) at c = 1/16/64 and profile table (step time, matmul %, attention %, GPU idle %, top CPU function for best server, vLLM, vLLM eager). Reasoned ceilings, not measurements. -> A, what he'll write down, not read as a table.
- MS2 c = 1: ceiling ~17 tok/s (16 GB per token at ~273 GB/s); engines plausibly 85-95% of it, beat naive clearly; own batched server within 10-20% is honest; quantized rows break ceiling (fewer bytes). -> A; B asks why only 17.
- MS3 c = 64: step reads weights once plus KV of 64 sequences at ~300 tokens each = 64 × 300 × 128 KiB ≈ 2.5 GB; (16 + 2.5) / 273 ≈ 68 ms for 64 tokens; ceiling ~900 tok/s; expect good fraction; his server further from ceiling since CPU work per step grows with batch and his is on the hot path. -> A works it in words, B does a step.
- MS4 TTFT p99 at c = 64: chunked prefill + budget keep it bounded; his server with full prefill phase: p99 TTFT and inter-token stutter visibly worse. -> A.
- MS5 Shared system prompt: both large TTFT drop on hits; SGLang cache-aware may do better on throughput at c = 16 with many shared prefixes, at cost to fairness; look at distribution not median. -> A.
- MS6 Profiles: Spark c = 16 GPU trace dominated by matmul kernels reading weights, attention small slice at short context growing with length; engine-core flame graph mostly waiting; his server's flame graph shows Python doing real work between GPU calls; enforce-eager opens small gaps, small share of long step on Spark = H100-vs-Spark arithmetic measured. -> A.
- MS7 Fireworks: still far behind per-stream tok/s; HBM bandwidth and probably lower precision, not software; ratio at c = 1 vs ratio of memory bandwidths; if close, found the floor, rest is hardware. -> B voices "so their software is better", A corrects.

## Break It

- BK1 Turn off CUDA graphs (enforce-eager), rerun c = 1 and 64, check prediction; startup faster (nothing captured); small slowdown confirms CPU overhead small slice on slow-memory box; data-center GPU hurts far more. -> what-if exchange.
- BK2 Turn off prefix caching (vLLM no-enable-prefix-caching; SGLang disable radix cache); shared-prompt TTFT jumps back to full prefill; with caching on, read prefix cache hits and queries on metrics and compute hit rate yourself. -> exchange.
- BK3 Starve the KV pool (small gpu-memory-utilization or num-gpu-blocks-override to a few hundred), c = 64 long outputs: block count in startup log, num_preemptions climbs, p99 e2e blows up, throughput drops as requests recompute prefills; failure behind "fine until traffic doubled". -> exchange.
- BK4 Make it your naive server: max-num-seqs 1; c = 16: TTFT climbs as (c - 1) × service time, baseline staircase, each service faster; everything good at many users is the scheduler; fast kernels still queue. -> exchange, formula in words.
- BK5 Hang up mid-stream: 1,024-token request, kill client after a second, num_requests_running drops: API server notices disconnect, aborts, frees blocks; naive server kept generating for a ghost; find abort path (engine core drains an aborts queue every step). -> exchange.

## Explain It Back (substance must appear in conversation)

- X1 Processes not threads: GIL; GPU must never wait for Python; CPU text work grows with users; threads take turns with scheduler; processes run truly in parallel on other cores; API turns step N tokens to text while core schedules N+1; price is serialization over sockets, microseconds, overlaps. -> covered at I8 + PR1; ending touches it.
- X2 One engine step walkthrough: loop calls scheduler; budget; running first (or a few with spec decoding); waiting oldest first with chunking; KV manager, prefix reuse by hash; preempt newest by freeing for recompute; small record; worker applies diff to persistent batch, positions + block tables, one forward over mixed batch, replays CUDA graph if shape matches, samples; scheduler updates, checks stop, sends to API, detokenize and stream. -> covered across S and F2, and A gives one compact pass of it after the journey.
- X3 Recompute vs swap and Spark pick. -> M8 + PR2.
- X4 Scaling one to eight GPUs to a cluster: one GPU throughput grows with batch until KV fills memory or prefill compute saturates, then queue/preempt. Eight GPUs: data parallelism (eight copies behind load balancer, near-linear, nothing shared, each must fit) or tensor parallelism (each reads an eighth per token, two all-reduces per layer over NVLink, latency drops, bigger models fit). TP stops paying across machines (network round trips), so cluster: data parallelism over replicas, pipeline/expert for models too big for a node, route to replicas holding the prefix in cache. Largest scale: separate prefill/decode pools, bottleneck moves to KV transfer. -> A in a dedicated "how does it scale" exchange after TP/disaggregation; B asks the interview question as a real worry.
- X5 Why DistServe/Splitwise: prefill compute-bound bursty, decode bandwidth-bound steady; interfere; TTFT vs inter-token trade; can't size for both; separate pools sized and tuned for own target, even different GPU types; cost shipping KV, 128 KiB per token, ~250 MiB for 2,000 tokens, fast interconnect, careful overlap, adds a hop to TTFT. -> D section; "adds a hop to TTFT" said explicitly.

## Go Deeper / Connections

- GD1 Best sources: the vLLM PagedAttention paper (read it fully now, you've built every piece) and vLLM V1 blog + design docs in the repo. -> one closing line from A before the ending.
- CN1 Closes the baseline lesson's loop: every symptom has a cause and a lesson, all fixed at once by someone else in code he can now read. Process split = threads/GIL + waiting vs working applied to a GPU. Next: FlashAttention and kernels (the one box not built, leaving Python). Metrics endpoint is head start on observability; scaling continues in training on many GPUs. -> A, one or two sentences near the end.

## Flow

1. Problem scene (P1-P5) with B's "better kernels" wrong model. 2. Origin as story (O1-O5). 3. One process to three, Figure 001 walk, threads-vs-processes correction, Predict 1. 4. Token budget, mixed batch, memory-bound correction, journey figure, takeaways, compact step recap (X2). 5. Memory: blocks, arithmetic, hashing, preemption, figure 003, Predict swap, policies. 6. CPU out of the loop: launch math, Spark vs H100, four tricks, Predict eager. 7. SGLang: same skeleton, radix tree figure, scheduling, structured output. 8. TensorRT-LLM, llama.cpp. 9. Tensor parallelism + two-Spark correction. 10. Disaggregation. 11. Scaling interview answer (X4). 12. Build It tasks 1-5 incl. code-reading route. 13. Measure. 14. Break It five what-ifs. 15. Go Deeper + connections line. 16. Ending: B restates, A sharpens.
