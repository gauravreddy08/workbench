# Outline: memory-math

Source: src/lessons/memory-math.mdx. Curriculum entry: "How much memory does a model need?" Question:
how much memory do the weights, the KV cache and activations take, and how many users fit? Why:
decides which models you can serve, at what context length, for how many people.

Diagnostic gap hit head on: "memory math for models" (and the general "numbers" gap: bytes, GB vs
GiB). B voices the wrong model "eight gigs, one byte per parameter" and later "four-bit means a
quarter of the bytes" and "vLLM is using ninety percent so it's wasting memory".

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereqs re-explained briefly in place: KV cache (keys and values kept per past token so they are not recomputed), GQA, KV-per-token formula (bandwidth lesson); unified memory, page cache, OOM killer (virtual memory lesson); decode reads all weights + caches every step (bandwidth / envelope lessons). -> A, each where it first comes up, one or two sentences. Today bullets not read as a list.

## The Problem

- P1 Diagnostic question "how much memory does an 8B model need?"; his answer was a shrug; common wrong answer "8 GB, one byte per parameter". -> A opens on the question; B says the 8 GB answer as their own gut.
- P2 Scene: Spark as shared team assistant, Llama 3.1 8B, 32K context each; vLLM prints "maximum concurrency for 32,768 tokens per request: 24x". Is it right, where did 24 come from? -> A, scene.
- P3 Restart with 70B in 4 bits at 128K: "2x". Colleague's notebook on the same box gets something killed. -> A continues scene; B: "killed?"
- P4 All of it is a few lines of arithmetic; you'll do it faster than vLLM boots. -> A, one line.
- PR1 Predict: 8B bf16, one user, 8,192 tokens, total? Then how many users at 32K on 128 GB? Answer: 17-18 GiB (15 GiB weights = 8.03B x 2 B = 16.1 GB = 15.0 GiB; 1 GiB KV = 8,192 x 128 KiB; 1-2 GiB overhead + activations). Weights big fixed cost, one user's cache small. At 32K, 4 GiB per user; after OS (~10 GiB, measure it), weights, overhead, ~100 GiB left -> about 25 users. Usable speed is a separate question (envelope lesson: bandwidth runs out first on the Spark). Today is capacity. -> A asks, B guesses (too low, forgets cache or says 8), A reveals step by step.

## Origin

- O1 2019 Noam Shazeer (original transformer paper author), "Fast Transformer Decoding: One Write-Head is All You Need". Keys and values for every past token ate memory and bandwidth; most from every head keeping its own copy. -> A, story.
- O2 Multi-query attention: all query heads share one key head and one value head; cache shrinks by number of heads. -> A.
- O3 Too aggressive for some models (quality dropped); 2023 Joshua Ainslie et al. at Google: grouped-query attention, a few KV heads each shared by a group of query heads. Llama 2 70B adopted it that year; by Llama 3 every size. -> A.
- O4 You'll see it as an asymmetry in the attention matrices, and as a 4x KV discount. Memory was the reason the architecture changed. -> A, closing the story.

## The Idea: four buckets

- B1 Kitchen comparison: bolted-down equipment / each table's tray / burst of counter space / walkways you can never use. -> A, one quick comparison (allowed: exact, one point), then straight to the real thing.
- B2 Weights: model itself, loaded once, shared by every user; params x bytes per param. -> A.
- B3 KV cache: each user's private store; grows with every token of every conversation; bytes per token x context x users. -> A.
- B4 Activations: temporaries in one forward pass (layer vector, wide MLP intermediate, final scores); freed when layer done; small in decode, short spike in prefill. -> A.
- B5 Overhead: in use but none of the above: CUDA runtime setup, library scratch, memory the allocator holds unused, and on the Spark the whole OS. -> A.
- F1 Figure 001: one 128 GiB bar (CPU + GPU, one pool): OS sliver, weights 15, KV 8 (eight users at 8K), overhead sliver, free ~93 GiB. Only KV grows with users and context; OS share is an assumption to replace with a measurement. -> A describes the bar left to right.
- B6 The one equation: users that fit = (memory minus OS minus weights minus overhead minus activation peak) divided by (KV bytes per token x context). -> A, in words, with the 8B numbers as a worked example.

## Bytes, GB and GiB

- U1 GB = a billion bytes (disk makers, HF file sizes, network). GiB = 2 to the 30, about 1.07 billion, ~7% more. Memory sized in powers of two; PyTorch and nvidia-smi report binary units. -> A, B asks why it matters.
- U2 8B bf16 is 16.06 GB and 14.96 GiB, both right. Work in GiB against machine memory. KV formula naturally binary: 128 KiB per token, 8,192 tokens = exactly 1 GiB. Trap eats 7% of every answer. -> A.

## Counting parameters

- C1 config.json: a dozen numbers that fully determine every matrix shape. Llama 3.1 8B: vocab 128,256; hidden 4,096; intermediate 14,336; 32 layers; 32 heads; 8 KV heads; head_dim 128; tie_word_embeddings false; dtype bfloat16. -> A, said as "the numbers that matter", not read as JSON.
- C2 Embedding: one row of 4,096 per vocab entry = 525,336,576. Half a billion before the first layer. -> A; B surprised.
- C3 Attention per layer: q maps 4,096 to 32x128=4,096 (16.8M); k and v map to only 8x128=1,024 (4.2M each) because of GQA (term: fewer KV heads, each shared by group of 4 query heads); o back to 4,096 (16.8M). Total 41,943,040. Asymmetry = Shazeer's idea in your param count. -> A.
- C4 MLP: SwiGLU (term: gate and up side by side, gate through SiLU multiplies up, down maps back; three matrices). 3 x 4,096 x 14,336 = 176,160,768 per layer; four times attention. Most params live here. -> A; B: "three, not two?"
- C5 Norms: two RMSNorms per layer (term: divide by root-mean-square, times learned scale per dim, no bias), 4,096 each = 8,192 per layer; one final 4,096. Rounding error but needed for exact match. -> A.
- C6 Output head: 525,336,576 unless tie_word_embeddings true (reuses embedding, costs zero). 8B false; Llama 3.2 1B true. The flag is worth 525M params, 1 GB in bf16; always read it. -> A.
- F2 Figure 002: each matrix as a row, layer box x32, bars to scale (MLP bars long, k and v short), totals. -> A describes the shape: three long bars, two medium, two stubs.
- C7 Sum: per layer 218,112,000; x32 = 6,979,584,000; embed + head 1,050,673,152; final norm 4,096; total 8,030,261,248. -> A walks it in rounded words, says the exact total once.
- C8 Checked against transformers on the meta device (shapes without memory), numel sum matches to the parameter; same method 1,235,814,400 for 3.2 1B (tied), 70,553,706,496 for 3.1 70B. You write the counter in Build It. -> A.
- C9 MLP 70%, attention 17%, embedding + head 13%. -> A.
- C10 Interview shortcut: per layer attention ~2h^2 + 2hkd, MLP 3hI; family roughly layers x (2.5 h^2 + 3hI). 32 x (2.5 x 16.8M + 176M) ~ 7.0B plus 1.05B vocab matrices. -> A in words with the worked numbers (42M + 176M = 218M, times 32).
- PR2 Predict Qwen2.5 7B: vocab 152,064, hidden 3,584, intermediate 18,944, 28 layers, 28 heads, 4 KV heads, untied, q/k/v biases. Answer: head_dim 128, k x d = 512; attention weights 29,360,128; biases 4,608; MLP 203,685,888; norms 7,168; per layer 233,057,792; x28 = 6,525,618,176; embed + head 1,089,994,752; final norm 3,584; total 7,615,616,512, matches exactly. Biases 129,024 in all; invisible in "7.6B", but if your counter is off by exactly that, you know what you forgot. -> A poses it; B works the head_dim step; A gives the rest compressed to the key steps and the punchline.

## Bytes per parameter

- Q1 FP32 (term) 4 bytes, 32.1 GB, nobody serves in it now. -> A.
- Q2 BF16/FP16 2 bytes, 16.1 GB, what checkpoints ship as; why bf16 not fp16 is the number formats lesson. -> A, one sentence pointer.
- Q3 FP8 (term: 8-bit float, scale per tensor or channel) 1 byte for layers; popular checkpoints keep embedding + lm_head in bf16, so ~9.1 GB not 8.0. -> A.
- Q4 Integer formats with block scales: can't round to one of 16 values without a sense of scale; blocks with one or two scale numbers; scales are real bytes, why "4-bit" is never 4.0 bits. -> A; B voices "four-bit is a quarter of the bytes".
- Q5 GGUF (term: llama.cpp single file, weights + tokenizer + config). Q8_0: blocks of 32 signed 8-bit ints + one 16-bit scale: 34 bytes per 32 weights = 8.5 bits. -> A.
- F3 Figure 003: one Q8_0 block, thirty-two one-byte cells and one two-byte scale; bars for 8B in each format: FP32 32.1 GB, BF16 16.1, FP8 ~9.1, Q8_0 ~8.5, AWQ ~5.7, Q4_K_M ~4.9. -> A says the ladder of sizes aloud as a descent.
- Q6 AWQ (term: Lin et al. 2023, groups of 128, 16-bit scale + 4-bit zero point, scales chosen so weights that matter for real activations lose least): 20 extra bits per 128 = ~4.16 bits per layer weight; embed + head stay 16-bit: 1.05B at 2 B (2.1 GB) + 6.98B at 4.16 bits (3.6 GB) = ~5.7 GB; the "4-bit model" averages 5.7 bits. -> A, worked.
- Q7 Q4_K_M: super-blocks of 256, 8 sub-blocks of 32 with own 6-bit scales and minimums; basic 4-bit K type 4.5 bits; "_M" mix keeps sensitive tensors (parts of value and down projections, output head) in 6-bit; average 4.8 to 4.9 bits; 8B file ~4.9 GB. -> A.
- Q8 Rule: file size on disk is a very good estimate of weight memory; unknown format: ls the file, divide by params to get true bits per weight. -> A.

## The KV cache

- K1 Formula: 2 (K and V) x layers x KV heads x head_dim x bytes per value. 8B bf16: 2 x 32 x 8 x 128 x 2 = 131,072 B = 128 KiB. -> A in words, multiplying step by step.
- K2 Why each factor: 2 = key and value per layer per past token; layers each have own attention; only KV heads count because queries recomputed from current token each step and never stored; why GQA's 8-not-32 is a 4x discount. -> A; B asks why queries aren't stored.
- K3 Table across models: 1B 16x8x64 = 32 KiB; 8B 128 KiB; Qwen3 30B-A3B 48x4x128 = 96 KiB; 70B 80x8x128 = 320 KiB. One request at 8K: 0.25 / 1 / 0.75 / 2.5 GiB. At 128K: 4 / 16 / 12 / 40 GiB. 32 requests at 8K: 8 / 32 / 24 / 80 GiB. -> A gives the per-token numbers, then picks the three striking rows instead of reading the table.
- K4 70B with 32 users at 8K: cache alone fills an H100. 8B at 128K: one user's cache bigger than the whole model. MoE: 30B params but smaller cache per token than 8B, only 4 KV heads. Cache size depends on attention shape, not param count. -> A; B reacts to the MoE one.
- K5 FP8 KV cache halves every number; one flag in most engines; some accuracy cost to measure. -> A.
- K6 "Context" = whole conversation so far, prompt plus generated; request grows toward its limit; engine must reserve worst case up front or allocate as it goes; that's paged attention's subject. -> A.
- PR3 Predict 70B Q4_K_M (~43 GB on disk) on Spark, 10 users at 32K. Weights ~40 GiB; KV 32,768 x 320 KiB = 10 GiB each, 100 for ten; + couple GiB overhead + ~10 GiB OS = ~152 GiB. No, ~24 GiB over. Cheapest fix FP8 KV: 5 GiB per user, 50 total, ~102 GiB, fits. Alternatives: 16K context, or seven users. Shrinking weights further barely helps; cache is most of the memory. -> A asks; B guesses "quantize harder"; A works it and corrects.

## Activations

- A1 Temporaries per layer: normed input, q k v, attention output, MLP wide intermediates (term activations: in training kept for backward; in inference thrown away after next layer). Only one layer's worth alive at a time. -> A.
- A2 Decode: one new token per user; biggest are gate and up, 14,336 numbers each; per token ~(4h + 3I) x 2 B ~ 120 KB; x64 users under 8 MB. Noise. -> A.
- A3 Prefill: every temporary N tokens tall; N = 8,192: MLP ~0.7 GB, full set ~1 GB; lasts milliseconds, but the peak has to fit, not the average. -> A; B: "milliseconds, so who cares?" A: the peak.
- A4 Logits for every position: 128,256 scores per token; 32K prompt -> ~8.4 GB, need one row; ~250 KB per token, twice the KV cache. HF generate asks only for last position (logits_to_keep = 1, checked in transformers 5 source); bare model call doesn't. -> A.
- A5 Naive attention: N x N score matrix per head; 16K, 32 heads, bf16 = 16 GiB per layer before fp32 softmax copy. Fused kernels (SDPA, FlashAttention) never build it; memory grows with N not N squared; FlashAttention lesson. -> A.
- A6 Engines cap the peak: vLLM chunks long prompts, never more than max_num_batched_tokens per forward pass, so spike has known size. -> A.

## Overhead

- V1 Bucket that makes careful predictions wrong by a GiB or three. -> A signpost.
- V2 CUDA context: first touch of GPU, driver loads GPU code for every kernel library (PyTorch ships many), tables, scratch; belongs to driver, invisible to PyTorch counters; few hundred MB to ~1 GB per process on discrete GPUs, depends on versions/lazy loading; per process, two processes pay twice. -> A.
- V3 Caching allocator (term): asking the driver (cudaMalloc) and giving back is slow and forces sync, so freed blocks stay in PyTorch's pool. memory_allocated = live tensors; memory_reserved = taken from driver including cached free blocks, always >= allocated. -> A; B: "so reserved is wasted?"
- V4 Gap is free to PyTorch, not to anyone else. Fragmentation (term): 300 MB tensor, pool has ten 100 MB holes, must ask for more; OOM when numbers say room. Worst case: tensor grown by concatenation; HF DynamicCache appends each token's K/V with torch.cat, new slightly bigger tensor every step in every layer. -> A.
- V5 Measured on Mac GPU backend (same design): 256 MiB tensor -> driver held 1,024 MiB; after del, live 0, held 1,024; only empty_cache gave it back. CUDA's empty_cache same job. -> A, as something actually seen.
- V6 Everything else: cuBLAS scratch, NCCL buffers multi-GPU, CUDA graphs (pre-recorded kernel launch sequences with fixed buffers). Budget 1-3 GiB total for single-GPU server, then measure. -> A.
- F4 Figure 004 (illustrative): one 32K request over time: flat CUDA context sliver outside PyTorch's counters; load weights climbs to 15; prefill peak to ~22; drops to +4 GiB KV kept, grows 128 KiB per token; cache freed back to 15; reserved line climbs to the peak and stays. -> A narrates the two lines as a story over time.

## The Spark: one pool

- S1 H100 / 4090: GPU memory its own; OS, browser, CPU-side objects in separate RAM; 80 GB is yours. -> A.
- S2 Spark: no separate GPU memory; 128 GB one pool for CPU and GPU (re-explain unified memory). OS, desktop, every CPU process, page cache (re-explain: file pages kernel keeps around, droppable) come out of the same 128. Some reclaimable, some not. -> A.
- S3 Failure differs: discrete = polite Python exception; Spark = whole machine, OOM killer (re-explain: kernel picks a process and kills it) or frozen desktop while thrashing. -> A; ties back to colleague's notebook.
- S4 Measuring: nvidia-smi memory columns may say "Not Supported" or something unexpected on unified memory; check, don't trust. Honest "how much can I still use": free -h available column or MemAvailable in /proc/meminfo. torch.cuda.mem_get_info asks the driver; compare; driver's free may not count droppable cache. -> A.

## Serving engines take it up front

- E1 Can't allocate per request with torch.cat and hope: fragments, discovers OOM mid-answer. So vLLM grabs cache memory once at startup and hands out fixed-size pieces. -> A; B voices "grabbing 90% is wasteful".
- E2 Steps: gpu_memory_utilization (term, default 0.9, fraction of total for everything) = budget; load weights; fake forward at the largest size (max_num_batched_tokens) and record peak activation + non-PyTorch memory; rest becomes KV pool in blocks of a few tokens; logs pool size in tokens and max concurrency = pool tokens / max_model_len. Details move between versions. -> A as a sequence.
- F5 Figure 005: H100 80 GB: weights 15, act + runtime sliver, KV pool ~54 GiB ~440K tokens, last 10% unused; ~54 users at 8K, ~13 at 32K. Spark 128 GiB: weights 15, sliver, pool ~98 GiB, last ~13 GiB must hold OS, shell, notebook, page cache. -> A describes both bars.
- E3 Explains opening: 24x is pool divided by context (derived: ~98 GiB / 4 GiB = 24). Explains notebook: on Spark the setting is "how much of the whole computer". NVIDIA's DGX Spark playbooks show tested settings; leave real headroom. Newer vLLM can take KV size in bytes; check vllm serve help. -> A.

## Putting it together (Figure 006)

- G1 Interactive: model buttons (1B, 8B, Qwen3 30B-A3B, 70B), weight format, KV bf16/fp8, context and users sliders; bars for Spark (10 GiB reserve assumed), H100, 4090. Overhead 1.5 GiB + activation peak for 8K prefill chunk. -> A says what you'd see as you click.
- G2 Defaults 8B BF16 8K 8 users: Spark ~100 users, H100 ~62; 4090 misses by ~1.4 GiB, tops at 6. 24 GB card is weights-plus-a-few-chats. -> A.
- G3 Context to 128K: 4090 can't hold one user; H100 holds 3; one user's cache bigger than model. -> A.
- G4 FP8 KV: every max users roughly doubles; cheapest capacity win. -> A.
- G5 70B BF16: 131 GiB weights, nothing holds it, including Spark. Q4_K_M: Spark and H100 can (4090 can't); at 32K Spark ~7, H100 ~3. -> A; B checks it against the earlier predict (7 users).
- G6 Qwen3 30B-A3B BF16: 57 GiB, H100 ~27 users at 8K, 4090 can't load; decodes like a 3B model; big-but-sparse on big-but-slow memory is the Spark's niche. -> A, re-explaining why active params matter for decode speed.
- G7 Ignores speed: Spark 100 users at 8K = each step reads 15 GiB weights + 100 GiB caches through 273 GB/s ~0.45 s per step, ~2 tok/s each. Capacity = who's in the room; bandwidth = how fast the room moves. -> A; B asks "so 100 users is fake?"

## Build It

- BI0 All in inference/memory next to last lesson's server and harness; first three anywhere (Mac), last three need Spark. -> A one sentence.
- BI1 t1 fetch configs: huggingface_hub single-file download, configs only; Llama gated, accept license, log in. Six models. Index file total_size = checkpoint weight bytes; bf16 divide by 2; 8B should be 16,060,522,496 = 2 x 8,030,261,248. -> A, setup in a sentence, the check number said.
- BI2 t2 parameter counter: pure arithmetic, no torch; breakdown dict; must match five counts exactly (1B 1,235,814,400; 8B; 70B 70,553,706,496; Qwen2.5 7B; Qwen3 8B 8,190,735,360). Hints: head_dim missing -> hidden / heads, present -> use it (Qwen3, n x d need not equal h); tie flag missing -> false but warn; Qwen2.5 biases on q k v not o (attention_bias); Qwen3 two small RMSNorms on q and k of size head_dim per layer, 9,216 short = 36 x 2 x 128; print percentages, MLP ~70%; stretch MoE: num_experts, experts per token, moe_intermediate_size, router hidden x experts; total ~30.5B, active ~3.3B. -> A as "the traps you'll hit, in order".
- BI3 t3 calculator: formats table of effective bits (bf16 16/16, fp8 8/16, q8_0 8.5/8.5, awq 4.16/16, q4_k_m 4.9/4.9); weight_bytes, kv_bytes_per_token, plan returning buckets, fits, max_users. Tables for Spark (reserve 10 until measured), H100 80, 4090 24 at 8K and 32K; agree with Figure 006. max_users is a floor; start with flat overhead, replace with t5 measurement; arithmetic in bytes, GiB only when printing. -> A.
- BI4 t4 probe on Spark (given, plumbing): prints allocated, reserved, peak, driver free/total, MemAvailable, process RSS. Steps: import torch only; touch CUDA (drop in os_available and cuda_free with no alloc change IS the context); load 8B bf16 straight to GPU (device_map cuda, no CPU copy, see virtual memory lesson) -> alloc within a few MB of 14.96 GiB, 29.9 means fp32; generate 1K, 4K, 16K, 32K prompt, 1 new token, sdpa, reset peak before each, keep cache, record steady alloc and peak; delete cache, empty_cache, snap. free -h and nvidia-smi in another terminal at the same moments. Agent may explain, not write. Safety: container with memory limit below machine size. -> A, what you'd see at each step.
- BI5 t5 edge: fits(batch, ctx) prefill random prompts, decode 8, keep cache, False on OOM with cleanup; binary search largest batch; for 4K, 16K, 32K predict from plan first; random token ids; log peak and reserved. Hints: clean up after failure; large batch prefill spike may fail first (finding, not bug), compare peak to steady alloc; on Spark container limit / OOM killer may kill the process, so each trial in a subprocess. -> A.
- BI6 t6 vLLM check: NVIDIA's Spark container per playbook; max-model-len 32,768; chosen gpu-memory-utilization with OS reserve in mind, not 0.9 blindly. Predict pool GiB, pool tokens (divide by 128 KiB), max concurrency at 32K; read startup log lines; then bench.py with concurrency just above predicted max, long prompts; does vLLM queue or start then preempt? That's batching lesson; record the limit is a real wall. -> A.
- BI7 Done when: five exact counts + MLP fraction from memory; plan table six models three machines agreeing with fig; probe log cold start to 32K with context, weights, KV growth identified; real max batch at three contexts and which failed; vLLM pool within a few percent or explained. -> folded into A's Build It wrap, not read as a checklist.

## Measure

- M1 Weights: most boring number, within a few MB of 8,030,261,248 x 2; few MB = non-parameter buffers (rotary frequencies). Off by a GiB+ = upcast or duplicate. -> A.
- M2 CUDA context: memory gone from OS, nothing allocated in PyTorch; few hundred MB to ~1 GB normal on discrete; Spark's unknown, first row you measure; two processes, watch it double. -> A.
- M3 KV growth ~ L x 128 KiB per sequence (DynamicCache holds exactly K and V); predicted +0.125, +0.5, +2, +4 GiB at 1K/4K/16K/32K; peak well above steady (activation spike + brief double copy on concatenation); reserved climbs to the largest peak and stays. -> A.
- M4 After del + empty_cache: alloc back to weights (14.96), reserved close to it; os_available not fully back = part is the context, gone only when process exits. -> A.
- M5 Edge a little below prediction, not above: fragmentation (reserved well above alloc at failure), prefill spike at large B x L (chunk prompts), OS reserve larger than assumed (desktop, browser, forgotten notebook). More than predicted -> check if something quantizes the cache. -> A; B asks what if it's above.
- M6 vLLM pool within a few percent if same overhead/activation numbers; log says how much set aside for activations; plug in to tighten. -> A.

## Break It

- X1 Ask for every logit: bare model call on 32K prompt; predict 32,768 x 128,256 x 2 B (~8.4 GB); watch peak; fix logits_to_keep = 1 (check forward signature). Lesson: one unneeded tensor can be bigger than the whole KV cache. -> what-if exchange.
- X2 Textbook attention: attn_implementation eager, prefill 8K then 16K; heads x N squared x 2 B per layer + fp32 softmax copy; tens of GiB for one layer at 16K; fails where SDPA sailed. Lesson: activation peak depends on algorithm, why FlashAttention exists. -> what-if.
- X3 Run two at once: two vLLM instances with default utilization on Spark; second fails at startup or machine reclaims and swaps; also a notebook loading a model while one runs. Lesson: engine budget is a claim on the whole machine; write the reserve into the launch script. -> what-if; B ties to colleague's notebook.
- X4 Fragment the pool: 4,000 tokens one at a time at batch 8 with DynamicCache, snap every 250, plot reserved minus alloc; repeat with StaticCache (allocates full length once); try expandable_segments (grow a segment in place). Lesson: allocate once and slice beats growing, which is what engines do. -> what-if.

## Explain It Back (substance must appear)

- E-1 8B one user: ~17-18 GiB at 8K bf16: weights 8.03B x 2 = 16.1 GB / 15 GiB once; KV 128 KiB/token (2 x 32 x 8 x 128 x 2) -> 1 GiB at 8K; 1-2 GiB overhead (context, workspaces, prefill peak). 4-bit weights ~5 GB but cache and overhead unchanged. "8 GB" assumes one byte per param and forgets cache. -> covered by PR1 + B's final restatement + Q-section line "cache and overhead don't shrink".
- E-2 Count in under a minute: recipe (embedding vocab x hidden; per layer q, k, v smaller with GQA, o same as q; MLP three hidden x intermediate; two norms; x layers; final norm; head if untied); 2 x 525M + 32 x 218M + 4K; check biases, extra norms, experts; check against checkpoint total bytes. -> A gives the recipe compressed once after the count.
- E-3 Scaling: weights scale with params x bytes, paid once; KV linear in context x users x (layers x KV heads x head_dim), doubling either doubles it; activations scale with tokens at once, capped by chunking. Short chats one user: weights dominate; many users/long contexts: cache overtakes; 128K one user > model. Users x context is what you buy memory for; levers FP8 KV, GQA, paging. Spark second wall: bandwidth limits users before capacity. -> ending exchange + K4/G7.
- E-4 Why vLLM grabs 90%: never allocate during a request; load weights, profile peak, rest into fixed-size blocks; no fragmentation, no mid-answer OOM; looks used when idle; fine on dedicated GPU; on Spark must leave room for OS. -> E1-E3.
- E-5 alloc 15, system 17 gone: reserved adds cached blocks (GiBs after prefill spike); CUDA context and library code belong to driver; other processes; on Spark OS, CPU-side Python objects, page cache in the same pool, free -h sees all. Account step by step: alloc, reserved, driver free drop, MemAvailable drop from cold start. -> A answers a B question directly framed as "my numbers don't add up".

## Go Deeper / Connections

- D1 Best sources: kipply's "Transformer Inference Arithmetic"; the vLLM PagedAttention paper. -> one closing sentence by A, before the ending.
- N1 Next: KV cache by hand, batching, paged attention, quantization (quality cost), training memory. -> one sentence.

## Flow

Problem (diagnostic question + vLLM scene) -> Predict 1 -> Origin (Shazeer, GQA) -> four buckets +
equation -> GB vs GiB -> counting params (+ Qwen predict, shortcut, recipe) -> bytes per param ->
KV cache (+ 70B predict) -> activations -> overhead (+ fig 004 story) -> Spark one pool -> vLLM
carve (+ 24x explained) -> interactive budget tour + speed caveat -> Build It (t1-t6) -> Measure ->
Break It -> "numbers don't add up" (E-5) -> pointer to sources/next -> B restates, A sharpens.
