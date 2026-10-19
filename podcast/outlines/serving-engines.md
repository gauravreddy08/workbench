# Outline: serving-engines

Source: src/lessons/serving-engines.mdx. Curriculum: "Inside vLLM and SGLang." What do production
inference engines do that your server does not yet?

## The one big idea

A production engine is the same ideas he already built (KV cache, batching, prefix cache,
quantization, speculation), rearranged around one goal: the GPU must never wait for Python. A loop
that, every step, hands out a budget of tokens across all requests, mixing prompt reading into
decode; memory in blocks; text work in separate processes; kernel launches recorded once and
replayed. Most of what makes it good at serving many people is the scheduler, not a magic kernel.

## Opening scene

Weeks on his own server, proud of the sixteen-user row. Then one command starts vLLM and the same
harness says: a bit faster at one user, a lot faster at many, and its worst-case wait for the
first word a fraction of his. Nothing he did was wrong; it does all of it at once, with no Python
on the hot path. The best moment to read their code.

## Wrong mental models B voices

1. "It's faster because it's got faster kernels, it's written in C plus plus." A: the big win at
   many users is the scheduler; take the scheduler away (one request at a time) and a fast stack
   still queues. At one user on the Spark there's little left to win.
2. "Why separate processes? Threads share memory for free." A: the GIL; text work would steal time
   from the loop that feeds the GPU.

## Story beats

1. The scoreboard moment. Reading a real codebase: find the loop, find the data structure, follow
   one request.
2. History: Orca and per-step scheduling (continuous batching); vLLM and pages; SGLang and the tree;
   then GPUs got so fast the CPU became the bottleneck, and vLLM rewrote itself around that.
3. Three processes: the front door that speaks HTTP and text, the engine core loop, the GPU worker.
   B's thread question; the GIL answer.
4. One step: no phases, a token budget. Running requests get their one word first, then waiting
   prompts, chunked if long. Why mixing is smart: prompt reading uses the math that decode was
   wasting, inside the same weight read. His two-phase loop paid for the read twice.
5. Memory: blocks, and when they run out, someone gets preempted. Recompute versus swap; on the
   Spark the CPU and GPU share one memory, so swapping would copy within the same chips. Recompute
   is often partly a cache hit.
6. Taking the CPU out: hundreds of tiny kernel launches per step; CUDA graphs record and replay.
   The Spark versus H100 point: the same overhead is a small slice of a Spark step and a big slice
   of a fast GPU's step. So expect the one-user advantage on the Spark to be smaller than the hype.
7. SGLang's different bets: the prefix tree and cache-aware scheduling (throughput versus
   fairness); structured output by forbidding illegal tokens. TensorRT-LLM and llama.cpp in a line.
8. Beyond one GPU: tensor parallelism in plain words, cheap inside a server, expensive across two
   Sparks. The frontier: prompt reading and answer writing on separate machines, paying to ship
   the notes.
9. B's kernel model, and the Break It insight: limit vLLM to one request at a time and it queues
   just like his naive server. Ending: B restates, A sharpens.

## Numbers worth saying

About seventeen words a second (the ceiling still holds for one user). Hundreds of kernel launches
per step. The launch overhead: a few percent of a Spark step, close to half of a data-center GPU's.

## Left to the written lesson

File names and functions, the request journey step by step, block pool arithmetic, preemption
policy details, the persistent batch and async scheduling specifics, radix tree mechanics, grammar
backends and jump-forward, tensor parallel all-reduce counts and sizes, DistServe and Splitwise
details, all benchmark tables and ceilings, profiling tasks, metrics names, every Break It except
the one-request-at-a-time and eager mode.
