# Coverage: serving-engines

Lesson src/lessons/serving-engines.mdx vs podcast/scripts/serving-engines.md. Item IDs match
podcast/outlines/serving-engines.md. "Fixed" = was MISSING or wrong in the first draft and has been
added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs (baseline, KV cache, batching, prefix caching, quantization, spec decoding) | Problem | "You wrote a K V cache. Then continuous batching. Then a prefix cache..." | covered |
| P1 weeks of work, scoreboard rows, proud of c=16 | Problem | "you're kind of proud of the sixteen-users row now" | covered |
| P2 one command, couple of minutes, c=1 a bit faster, c=64 a lot, p99 TTFT a fraction | Problem | "It loads in a couple of minutes. With one user, it's a bit faster" | covered |
| P3 nothing wrong; all at once, none in Python on hot path | Problem | "none of it in Python on the hot path" (after B's "better GPU code") | covered |
| P4 best moment to read; 200 flags; "my batching loop in its own process" | Problem | "a black box with two hundred flags" | covered |
| P5 two skills; find loop, data structure, follow one request | Problem | "find the loop, find the data structure, follow one request" | covered |
| O1 2022 naive batching; Orca OSDI 2022, per-iteration = continuous batching | Origin | "a paper called Orca, at a systems conference called O S D I" | covered |
| O2 vLLM June 2023 Berkeley, PagedAttention, virtual memory, 2-4x, Kwon SOSP 2023 | Origin | "reported two to four times the throughput" | covered (SOSP venue name not spoken; "the paper, by Kwon and others") |
| O3 SGLang Dec 2023 LMSYS, RadixAttention tree | Origin | "in December, the L M Sys team released S G Lang" | covered |
| O4 2024 bottleneck moved to CPU | Origin | "the bottleneck moved to the CPU" | covered |
| O5 Jan 2025 V1: processes, simpler scheduler, persistent batch, CUDA graphs; shape changes slower | Origin | "the shape changes a lot slower than the file names" | covered |
| I1 one process, GIL re-explained | Three processes | "only one thread can run Python code at any instant" | covered |
| I2 V1 separate processes over sockets | Three processes | "splits that into separate processes that talk over sockets" | covered |
| F1 Figure 001 three columns, ZMQ / RPC links | Three processes | "Picture three columns side by side" | covered |
| F1a API column boxes + "your version" | Three processes | "a single token can be half a character" | covered |
| F1b engine core boxes; structured output new | Three processes | "one box that has no version of yours at all. Structured output." | covered |
| F1c worker boxes incl. sampler/rejection check | Three processes | "runs the check that accepts or rejects draft tokens" | covered |
| I3 API server CPU work; 100k-token doc real ms | Three processes | "Tokenizing a hundred-thousand-token document takes real milliseconds" | covered |
| I4 busy loop term | Three processes | "A busy loop is a loop that runs continuously" | covered |
| I5 engine step term; owns queues + block pool | Three processes | "each trip around that loop is called an engine step" | covered |
| I6 GPU worker; in-process with one GPU (check); one per GPU with TP | Three processes | "with a single GPU the executor can run the worker inside the engine-core process" | covered |
| I7 ZMQ term | Three processes | "Zero M Q, which is a small library for sending messages" | covered |
| I8 why processes not threads (GIL), N vs N+1, data loader | Three processes | "Sharing memory is free. Sharing the interpreter is not." | covered |
| PR1 Predict why-processes (10-40% idle; c=64 gains most; c=1 from CUDA graphs) | Predict | "ten to forty percent idle is common for naive Hugging Face generate" | covered |
| S1 his two-phase loop | One step | "Two kinds of steps, and which one you're in depends on the phase" | covered |
| S2 token budget, max_num_batched_tokens | One step | "It has a token budget" | covered |
| S3 running first, 1 token (more with spec) | One step | "Running requests first" | covered |
| S4 waiting oldest first, chunked prefill term | One step | "That's chunked prefill" | covered |
| S5 ask KV manager; preemption | One step | "someone has to give up their memory. That's preemption" | covered |
| S6 small record; one forward over mixed batch | One step | "What comes out of the scheduler is a small record" | covered |
| S7 why mix: decode memory-bound, prefill compute; paid read twice | One step | "It paid for the read twice." (B voices "decode is the heavy math") | covered |
| F2 Journey figure, all steps (41/32/9 tokens, 15 others, "Once", TTFT stamp, CUDA graph replay, slot 49 fourth block, finish length, usage, hashes kept) | Journey | "it needs slot forty-nine, and allocate slots hands out a fourth block" | covered |
| S8 three takeaways; GPU never sees a request | Journey | "The GPU never sees a 'request' at all" | covered |
| M1 built in prefix caching lesson | Memory | "You built the core of this in the prefix caching lesson" | covered |
| M2 startup fake forward pass, gpu-memory-utilization | Memory | "runs one fake forward pass at the biggest batch" | covered |
| M3 blocks term, 16 tokens | Memory | "sixteen by default on CUDA, for every layer" | covered |
| M4 128 KiB/token, 2 MiB/block arithmetic | Memory | "A hundred twenty-eight kilobytes. Per token." | covered |
| M5 ~30,000 blocks, ~half million tokens; read startup log | Memory | "roughly thirty thousand blocks. Around half a million tokens" | covered |
| M6 block table, chained hashes, LRU free queue keeps hashes, get_computed_blocks/allocate_slots | Memory | "a block's hash doesn't just name sixteen tokens, it names the entire prefix" | covered |
| M7 victim: FCFS newest; priority lowest | Preemption | "the most recently admitted one" | covered |
| F3 Figure 003 recompute vs swap | Preemption | "the picture forks into two boxes underneath" | covered |
| M8 terms; V1 recomputes, computed tokens to zero; why | Preemption | "sets its count of computed tokens back to zero" | covered |
| PR2 Predict spark-swap | Predict swap | "It's the same memory. It's all one pool." | covered |
| M9 policy question; num_preemptions on metrics | Predict swap | "the number of preemptions counter on the engine's metrics page" | covered |
| C1 launch overhead ~2 ms | CPU | "Four hundred launches at five microseconds each is about two milliseconds" | covered |
| C2 59 ms Spark vs 5 ms H100; 3% vs 40%; smaller advantage than hype | CPU | "three percent of a Spark step... and forty percent of an H one hundred step" | covered |
| C3 CUDA graphs term, per batch size, pad, torch.compile, piecewise | CPU | "V L L M calls that piecewise capture" | covered |
| C4 persistent batch | CPU | "Second, a persistent batch" | covered |
| C5 async scheduling / overlap scheduler, check default | CPU | "they call it the overlap scheduler" | covered |
| C6 paged attention backends, mixed 2,000 vs 1 tokens; next lesson | CPU | "one request contributes two thousand prompt tokens" | covered |
| PR3 Predict eager-cost | Predict eager | "a few percent, maybe up to ten" | covered |
| G1 SGLang same skeleton | SGLang | "you find the same skeleton" | covered |
| G2 radix tree term, walk down, LRU leaves | SGLang | "evicts least recently used leaves first, so the shared trunk... survives" | covered |
| F4 Figure 004 hash chain vs tree | SGLang | "Picture the two side by side" | covered |
| G3 longest-prefix-match, depth-first, FCFS; fairness trade | SGLang | "Throughput against fairness" | covered |
| G4 constrained decoding term, state machine, mask | SGLang | "invalid JSON isn't unlikely. It's impossible." | covered |
| G5 jump-forward decoding | SGLang | "you skip the model entirely and just append those tokens" | covered |
| G6 XGrammar/llguidance/Outlines; mask on CPU during forward; get_grammar_bitmask | SGLang | "get grammar bitmask sitting between 'execute' and 'sample'" | covered (repo folder paths not spoken) |
| E1 TensorRT-LLM | Other engines | "in-flight batching, which is their name for continuous batching" | covered |
| E2 llama.cpp, GGUF term, mmap, 4-bit, llama-server, not throughput | Other engines | "high-concurrency throughput just isn't its goal" | covered |
| TP1 70B = 140 GB; TP term | Tensor parallelism | "seventy billion times two bytes, a hundred forty gigabytes" | covered |
| F5 Figure 005 column/row split, one all-reduce, heads | Tensor parallelism | "Picture one MLP block, split across two GPUs" | covered |
| TP2 each GPU reads its share | Tensor parallelism | "each one reads half the bytes from its own memory" | covered |
| TP3 all-reduce term; 64 per token; 8 KB; latency | Tensor parallelism | "about eight kilobytes. So what matters is latency" | covered |
| TP4 NVLink vs two Sparks via ConnectX-7; playbooks for fitting | Tensor parallelism | "mainly about fitting models that don't fit on one Spark" (B: "double my tokens per second") | covered |
| TP5 tensor-parallel-size flag; pipeline/expert in distributed training | Tensor parallelism | "pipeline parallelism, which puts different layers on different GPUs" | covered |
| D1 stutter, chunking caps not removes, different hardware | Disaggregation | "Chunking caps the stutter. It doesn't remove it." | covered |
| F6 Figure 006 two timelines | Disaggregation | "Picture two timelines" | covered |
| D2 disaggregated serving term | Disaggregation | "That's disaggregated serving" | covered |
| D3 DistServe, Splitwise (Microsoft traces, GPU generations), Mooncake | Disaggregation | "Splitwise, from production traces at Microsoft" | covered (venues not spoken) |
| D4 250 MiB for 2,000 tokens; NIXL; KV connectors | Disaggregation | "about two hundred fifty megabytes" | covered |
| D5 won't run on Spark; interview answer | Disaggregation | "TTFT and the gap between tokens fight each other" | covered |
| B0 folder layout | Build It | "An engines folder with a launch script for each engine" | covered |
| B1 Task 1 playbook, sm_121, pip risk, NGC / CUDA 13 image, pin tag | Build It | "S M one twenty-one" | covered |
| B2 launch shape: 8001, ptrace, mounts, bf16, 8192, 0.6, unified pool 0.5-0.7, prefix on | Build It | "start somewhere between half and seventy percent" | covered (entrypoint-varies note dropped as setup detail) |
| B3 smoke test + metrics | Build It | "That's the engine's own view of itself" | covered |
| B4 Task 2 SGLang playbook, two exercises, FP8/NVFP4 vs bf16, 8002, flags via help | Build It | "serve the original B F sixteen model first" | covered |
| B5 Task 3 include_usage, ignore_eos, token-count check | Benchmark | "they should match exactly" | covered |
| B6 sweep one at a time; 1/4/16/64, 400, 256; long c=1; shared c=16; version; c=64 in notes | Benchmark | "also write the sixty-four number in the notes" | covered |
| B7 Task 4 rules: don't start at top; names move | Trace | "That's the way to drown. The rule is: don't start at the top." | covered |
| B8 nine stops with questions | Trace | "So, nine stops. One, the loop." | covered |
| B9 three things per stop; c=16 tying question | Trace | "every process boundary a token crosses" | covered |
| B10 docs/design, arch overview, SchedulerOutput; optional SGLang tour | Trace | "Reading that one data class tells you more" | covered |
| B11 Task 5 two profilers; sampling profiler term; install | Profile | "Py spy is a sampling profiler for Python" | covered |
| B12 py-spy dump/record, flame graph term, healthy = waiting | Profile | "In a healthy engine, waiting is most of it." | covered |
| B13 torch profiler, start/stop, Perfetto, four measurements, eager gaps | Profile | "The gaps are exactly what CUDA graphs remove." | covered |
| B14 Done when | Profile | "And you're done when both engines serve Llama eight B" | covered |
| MS1 setup and tables (said as what to record) | Measure | "for one decode step at sixteen users: step time, the matrix multiply share" | covered |
| MS2 c=1 ceiling 17, 85-95%, 10-20% honest, quantized | Measure | "plausibly eighty-five to ninety-five percent" | covered |
| MS3 c=64: 2.5 GB, 68 ms, ~900 tok/s | Measure | "a ceiling of around nine hundred tokens a second" | covered |
| MS4 TTFT p99 bounded | Measure | "Chunked prefill and the token budget keep it bounded" | covered |
| MS5 shared prompt; SGLang fairness; distribution | Measure | "look at the whole distribution, not just the median" | covered |
| MS6 profiles expectations | Measure | "That's the H one hundred versus Spark arithmetic from earlier, measured." | covered |
| MS7 Fireworks: hardware, ratio check | Measure | "If those two ratios are close, you've found the floor." | covered |
| BK1 enforce-eager | Break It | "startup gets faster too, since nothing's being captured" | covered |
| BK2 prefix cache off; hit rate from metrics | Break It | "work out the hit rate yourself" | covered |
| BK3 starve KV pool | Break It | "the 'it was fine until traffic doubled' incident" | covered |
| BK4 max-num-seqs 1 staircase | Break It | "the sixteenth waits fifteen full service times" | covered |
| BK5 hang up mid-stream; aborts queue | Break It | "Your naive server kept generating for a ghost." | covered |
| X1 processes not threads | Three processes / Predict | "Sharing the interpreter is not." | covered |
| X2 engine step walkthrough | Journey | "if someone asks you to walk through one engine step" | covered |
| X3 recompute vs swap, Spark pick | Preemption / Predict swap | "Make the pool bigger" | covered |
| X4 scaling 1 GPU to 8 to cluster | Explain It Back: Scaling | "You can run eight independent copies of the model behind a load balancer" | covered |
| X5 DistServe/Splitwise problem + cost incl. extra hop | Disaggregation | "it adds a hop to time to first token" | covered |
| GD1 vLLM paper + V1 blog/design docs | Go Deeper | "read the V L L M paper, the PagedAttention one" | covered |
| CN1 closes baseline loop; GIL/waiting applied to GPU; FlashAttention next | Connections | "The one box you haven't built is the attention kernel" | covered ("a head start on logs, metrics and traces") |

Numbers checked against the lesson: 200 flags; 2-4x; 100,000-token doc; 10-40% idle; 41/32/9 tokens,
15 others, 256 out, 16-token blocks, slot 49; 32 x 8 x 128 x 2 x 2 = 128 KiB, 2 MiB; 80 GB, 16 GB,
~30,000 blocks, ~half a million tokens; ~273 GB/s; 400 x 5 us = 2 ms; 59 ms vs 5 ms, 3.35 TB/s,
3% vs 40%; 140 GB, 80 GB; 64 all-reduces, 4,096 x 2 B = 8 KB; 2,000 x 128 KiB = 250 MiB; ports
8001/8002; 0.5-0.7, 0.6, 8192; c = 1/4/16/64, 400 requests, 256 tokens; v0.13; ~17 tok/s;
85-95%; 10-20%; 64 x 300 x 128 KiB = 2.5 GB; 68 ms; ~900 tok/s; 1,024-token request.

Derived (not written in the lesson prose): 19 blocks at finish (2 cached + 17 own, from the
Figure 002 data); 24 token positions in the journey's forward pass (9 + 15); "about sixty gigabytes"
left for KV (80 - 16 - a few); intermediate products 256, ~32,000, ~65,000 numbers, ~130,000 bytes;
~19,000 tokens (64 x 300); 18.5 GB per step; 273/16 = about 17 reads a second.
