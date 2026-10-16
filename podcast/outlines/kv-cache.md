# Outline: kv-cache

Source: src/lessons/kv-cache.mdx. Curriculum entry: "The KV cache, by hand." Question: what exactly does
the KV cache store, and how much does it save? Why: the most important inference optimization, and the
thing every later trick builds on.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: built GPT-2/Llama from scratch; bandwidth lesson (prefill vs decode, roofline, ridge point); baseline lesson (server, harness, scoreboard). -> Not read as a list. A re-explains prefill/decode, memory-bound and ridge point briefly where they come up (I30, I35).

## The Problem

- P1 The naive generation loop: every step runs the whole sequence, keeps only the last position's logits, appends the argmax. Short, obviously correct, he may have written exactly this. -> A opens on it, described in words, no code.
- P2 MacBook M4 Pro, CPU, GPT-2 small fp32: about 170 s for 1,000 tokens. First token 17 ms, token 500 about 160 ms, token 1,000 about 360 ms. Straight-line slowdown, twenty times slower; model didn't change. -> A, as a progression.
- P3 Change about twenty lines: same 1,000 tokens in 12 s, same tokens; token 1,000 costs about what token 1 did. -> A.
- P4 Predict step-500: 512 positions (12 prompt + 500), keep one row; what fraction already computed in step 499? Answer: 511 of 512, bit-for-bit, because of the causal mask; only new work is one position. -> A asks, B guesses (partly), A reveals.
- P5 Over n tokens: about n squared over 2 positions of work vs n; for 1,000 tokens roughly 500x too much matrix work. Measured only 14x on laptop CPU because fixed per-step costs don't shrink. -> A, B notices 500 vs 14 mismatch; A defers.
- P6 Name: KV cache = memory holding key and value vectors of every past token in every layer, so a step only computes them for the newest token. His diagnostic answer was right (store past keys and values). This lesson goes one level down: why K and V not Q, what makes reuse legal, shape, size, shrinking tricks. -> B states his diagnostic version ("you store the keys and values"), A says right, then lists the deeper questions.
- O1 Origin: caching K/V as old as the Transformer; 2017 "Attention Is All You Need"; Google's tensor2tensor already had a fast decoding path keeping past K/V. Obvious once you see the waste. -> A, story.
- O2 2019 Noam Shazeer (a Transformer author), "Fast Transformer Decoding: One Write-Head is All You Need": once you cache, decode is slow not because of math but because every step reads the whole cache from memory, and it's big. Fix: all heads share one set of K and V; shrinks cache by number of heads; multi-query attention. -> A.
- O3 Started a line of work: GQA (2023), sliding windows, quantized caches, DeepSeek latent attention (2024). Cache became what architectures are designed around. -> A, one breath.

## The Idea

- I1 Librarian analogy: notes, index cards with a label (what it's about) and summary (what it says); question compared against labels, blend summaries. -> A, briefly (lesson's own analogy).
- I2 No-cache = librarian rewriting every card each new note; cards come out identical. Sensible: keep box, one new card per note. -> A.
- I3 Mapping: labels = keys, summaries = values, question = query, box = KV cache. Term defs: key "here is what I contain", k = W_k times h; value = info handed over, v = W_v times h, output is weighted average of values; query "what I'm looking for", dot product with keys gives score, softmax gives weights. -> A, in words, no symbols.
- I4 Attention for one head: score of t against i is query t dot key i divided by square root of head size, only for i up to t (mask hides later); softmax over i; output = weighted sum of values. -> A, in words, small spoken version.
- I5 Predict what-is-needed: for out_t, need past queries? past keys? past values? Answer: all past keys and values, never past queries; past query only fed old position's output, which is done and moved to the next layer. Why "KV" not "QKV". -> A asks, B says the wrong model (keep queries too / all three), A corrects.
- F1 Figure 001: lower triangle of scores, row = query position, column = key position; decode adds only the bottom row; needs the new query, every key, every value; old queries fed old rows, finished. -> A describes like a diagram over the phone.
- I6 Why cards never change: reuse legal only if same numbers every step. Causal mask: position t may only look at 0..t; implemented by setting later scores to minus infinity before softmax. -> A, term inline.
- I7 Induction argument, four steps: layer 0 input = token embedding plus position embedding (depends on token i and number i); attention at i mixes only 0..i; layer norm, MLP, residual are per position; so next layer's h_i depends only on 0..i; repeat. -> A walks it, B restates.
- I8 Conclusion: appending token 501 can't change it; k and v frozen when first computed; immutable. -> A.
- I9 Two hidden conditions: mask must be causal (BERT/encoder sees every position, adding a word changes every hidden state, nothing to cache); position encoding depends only on own index. GPT-2 learned table and Llama's RoPE qualify. -> A; B asks "so why can't BERT".
- I10 RoPE: rotate each query and key by an angle depending on position; Llama applies before attention, so cache keys after rotation (what Hugging Face Llama does). -> A, inline.
- I11 Cache is per layer, has to be: layer 5's keys come from layer 5's input = layer 4's output. No single "key of token i"; 12 of them in GPT-2 small, each in 12 heads. -> B voices wrong model ("one key per token"), A corrects.
- I12 Prefill: run whole prompt in one pass like training; side effect every layer computes K and V for every prompt position; keep them; cache holds P rows per layer; last position's output gives first new token. -> A, re-explaining prefill from bandwidth lesson.
- I13 Decode: feed only newest token as a length-1 sequence, tell it its position is P (then P+1...); each layer computes q, k, v, appends k and v, scores one query against all cached keys, softmax, mixes all cached values; one row out, MLP, next layer; top: one row of logits, one token. -> A.
- I14 Shape: per layer K and V each (batch, KV heads, sequence length, head size). GPT-2 small: 1, 12, T, 64 for each of 12 layers. Llama 3.1 8B: 1, 8, T, 128 for each of 32 layers. Prefill writes P rows; each decode step grows T by one along dimension 2 (sequence); nothing else changes size. -> A, said as "four numbers: batch, heads, length, head size".
- F2 Figure 002: stacked per-head K tensors (12 deep); prefill fills 4 prompt rows in one pass; decode step appends one row; whole cache: K and V times 12 layers times 12 heads times 64 dims times 4 bytes = 72 KiB per token. -> A describes; the 72 KiB lands here.
- I15 Bug 1, position: new token is at P + steps so far, not 0; forward builds positions with arange of T, which gives 0 every step with T = 1; need from past length to past length plus T. -> A, words, short real name "arange".
- I16 Bug 2, mask: one new query sees every cached key, needs no mask. But feeding more than one new token on top of a cache (second prompt chunk, checking draft tokens in speculative decoding) makes the mask non-square: query j at absolute position past_len + j sees keys 0..past_len + j. Plain lower-triangle on a T by S matrix is wrong by exactly past_len columns; need the triangle shifted by S minus T. -> A, B pushes "why would I ever feed more than one", A gives chunked prefill and spec decoding.
- F3 Figure 003 (interactive stepper): one head, one layer, 4-token prompt to 12 tokens; step with cache on, then off; counter of wasted vectors; triangle on the right. With cache each decode step computes one K, one V, one Q, one row of scores; without it recomputes everything to the left identically and the whole triangle. At 1,000 tokens: on about 2,000 K/V vectors, off about a million, per head per layer. Multiply by 12 heads and 12 layers. -> A: what you'd see as you click.
- I17 Three things to notice: prefill same either way (cache doesn't speed the prompt, speeds everything after); with cache off waste per step grows with length, total with square; with cache on past queries go blank after their step. -> A.
- I18 Counting: n = current length; N_p = parameters in matrices, about 124 million for GPT-2 small incl. output projection; matrix-vector costs about 2 FLOPs per weight per token. FLOP = one arithmetic op. -> A, in words.
- I19 No cache step n: linear layers 2 times params times n; attention about 4 times layers times width times n squared (whole triangle). With cache: 2 times params; attention about 4 L d n (one row). d = 768 for GPT-2 small. -> A in words with small worked example, no symbols.
- I20 So no-cache step costs about n times a cached step in linear layers, attention worse. Summed: n squared over 2 token-passes vs n. Per step: from growing like n (n squared inside attention) to roughly constant plus a small growing term. Total from about n squared to about n. -> A; B restates per-step vs total.
- I21 Small growing term is real: at 1,000 tokens GPT-2 small cached attention about 37 million FLOPs vs about 250 million for matrices. Small but grows; at long context wins. In bytes: every decode step reads entire cache, every layer and head; Llama 3.1 8B at 128K, that read is bigger than the weights. -> A.
- I22 Why not 500x: FLOP count says 500x, laptop measured 14x total. -> B raises (callback to P5).
- I23 Roofline recap: no-cache step at length n is a prefill of n tokens: one read of weights, n tokens of math. Ridge point = peak FLOP/s divided by bandwidth; below it memory-limited, above math-limited. While n small, below ridge, step bound by reading weights and fixed overhead; 10 tokens of math instead of 1 nearly free because math units idle. Only when n big enough does no-cache step grow. -> A, re-explaining ridge point in plain words.
- F4 Figure 004 measured per-token latency vs position, M4 Pro, PyTorch 2.14, fp32, batch 1, medians over 50-token windows: no-cache CPU grows almost from start (358 ms at 1,000); no-cache GPU (Apple MPS) flat until about 100 tokens then linear (81 ms at 1,000); with cache both 8-16 ms. -> A describes the four lines.
- I24 Table: CPU no cache 170 s, cache 12.0 s; GPU no cache 52 s, cache 12.3 s; all 1,000 tokens identical both. -> A, spoken.
- I25 Cached GPU no faster than cached CPU: at 124M params a decode step on this GPU is dominated by fixed costs (launching dozens of small kernels from Python, about 10 ms worth). Overhead-bound corner. Why cache speedup looks modest on tiny model/short text, enormous on big model/long text. -> B surprised, A explains; kernel defined.
- I26 Predict spark-knee: Spark, Llama 3.1 8B bf16, 16 GB weights, about 59 ms per step to read; HF generate cache off; sketch latency vs position. Answer: near flat at first near cached speed, then bend upward and climb straight. No-cache step at n is prefill of n tokens with intensity about n FLOPs per byte (2 FLOPs per weight per token, 2 bytes per weight); memory-bound until n reaches ridge. Bend near measured ridge point in FLOP/byte read as tokens: a few hundred if bf16 rate near estimate, lower if not. Past bend, each extra token adds about 2 times 8 billion FLOPs divided by measured FLOP/s per step. Prediction to check, not measured; Python and attention overhead blur the corner. -> A asks, B reasons (with help), A reveals.
- I27 Price is memory; formula: bytes per token = 2 (K and V) times layers times KV heads times head size times bytes per number; total = that times tokens times sequences in batch. -> A, in words with GPT-2 worked example.
- I28 Table: GPT-2 small fp32 72 KiB/token, 72 MiB at 1,024; GPT-2 XL fp32 48x25x64 600 KiB, 600 MiB at 1,024; Llama 2 7B bf16 no GQA 512 KiB, 2 GiB at 4,096; Llama 3.1 8B bf16 GQA 128 KiB, 16 GiB at 128K; Llama 3.1 70B 320 KiB, 40 GiB at 128K. -> A picks rows, not read as table; key comparisons spoken.
- I29 GPT-2 measured: exactly 73,728 bytes per position (1,011 positions, 74.5 MB). -> A.
- I30 Grows linearly; weights fixed cost, cache per-token per-user cost; decides how many users and context fit (memory math lesson). Each step reads whole cache so also bandwidth cost. Every shrink buys two things: more users/context, faster steps. -> A; B voices "it's just memory, who cares" and A corrects with the bandwidth half.
- I31 Four knobs: layers, KV heads, head size, bytes. Layers and head size mostly about quality; the other two are where clever designs live. -> A, signpost.
- I32 MHA: every head has own Q, K, V; 32 heads = 32 sets of K and V per layer to cache. -> A.
- I33 MQA (Shazeer 2019): keep 32 query heads but one shared K head and V head; cache shrinks 32-fold; catch quality: one set of keys serves every question, lose a little accuracy. Used anyway: PaLM, Falcon 7B. -> A.
- I34 GQA (Ainslie et al., Google, 2023): groups of query heads share a KV head; 8 groups = 4x smaller than MHA; quality close to MHA, speed close to MQA. Llama 2 used it only for 70B; every Llama 3 and most new open models use it. Llama 3.1 8B: 32 query heads in 8 groups of 4. In code: K, V projections output KV heads times head size; each KV head repeated/broadcast to its group before attention; cache stores small unrepeated version, hence 8 not 32 in the shape. -> A; B asks whether the cache stores the repeated version.
- F5 Figure 005 (interactive, KVHeads): Llama-3.1-8B-shaped, 32 layers, 32 query heads of 128, 16 GB bf16 weights, spec-sheet Spark 128 GB, 273 GB/s; buttons MHA/GQA-8/MQA, dtype BF16/FP8/INT4, window full/4K; sliders context, users; readouts per token, all users, ceiling per stream (all users decode together, each step reads weights once plus every cache; INT4 ignores scale factors). Things to try: GQA-8, 8K, 1 user: cache a sliver; MHA = Llama 2 7B design 512 KiB/token; 16 users: MHA caches outweigh model, GQA fit comfortably, MQA barely register; 128K with 8 users: memory bar runs out. -> A describes what you'd see while dragging, with a few derived numbers.
- I35 MLA (DeepSeek-V2, 2024): cache one small compressed vector per token per layer, expand into per-head K and V with a learned matrix; more math per step for far fewer bytes, good on bandwidth-bound machine. -> A.
- I36 Sliding window: layer attends only to last W tokens, so caches only W, stops growing at W. Popularized for long documents by Longformer (2020); Mistral 7B (2023) in every layer, W = 4,096. -> A.
- I37 Ring buffer / rolling buffer: token i goes to slot i mod W, overwriting token from W steps ago; memory capped. Mistral 7B: 8 KV heads of 128, 32 layers: 128 KiB times 4,096 = 512 MiB per sequence in bf16. -> A, "mod" said as "remainder after dividing by W" with an example.
- I38 Information older than W not simply lost: layer 2 at t sees back to t minus W, each of those already absorbed another W in layer 1; L layers, about L times W in principle, like a rumor down a line; lossy in practice. -> B voices "so it forgets everything past four thousand", A corrects.
- I39 Mixing: Gemma 2 alternates sliding and full layers; Gemma 3 (per tech report) five local (window 1,024) per global; only global layers pay full context. -> A.
- I40 Fewer bits: 8 bits instead of 16 halves cache in memory and bytes per step. FP8 KV caches standard option in serving engines (vLLM cache dtype setting; check docs for name). -> A.
- I41 KIVI (Liu et al., 2024): keys have a few channels with huge values, so quantize keys per channel and values per token; down to about 2 bits with small accuracy loss. Cost: a little error in every score, a little extra unpacking work. Quantization lesson does the same for weights. -> A.
- I42 Real storage: torch.cat allocates a new tensor and copies whole old cache each step: second full pass over the cache's bytes every step every layer. -> A.
- I43 Three fixes: preallocate (batch, heads, max length, head size) once, write row t into slot t; HF calls it a static cache, lets model be compiled since shapes never change. Grow in chunks like a Python list. Pages: vLLM PagedAttention, fixed-size blocks (say 16 tokens) scattered, per-sequence table of blocks it owns, like virtual memory pages, no wasted reservation, blocks shareable; next lesson but one (prefix caching). -> A.

## Build It

- B1 Laptop first (any PyTorch machine, CPU fine for GPT-2 small), then the Spark. Folder: model, generate, bench by position, plot, results. -> A, one sentence.
- B2 Task 1 (setup): use your own from-scratch GPT-2 if it loads Hugging Face's gpt2 weights, else a minimal nanoGPT-style model given as boilerplate. Sanity check against GPT2LMHeadModel logits: max difference about 9e-5 in fp32 = different order of floating point additions; large means a missing transpose (HF stores some weights as Conv1D, transposed). Written against transformers 5.x. -> A, short.
- B3 Task 2 (hands): change three forward methods (attention, block, model) to take past and return present; attention takes only new positions plus past (k, v), returns output and full k, v of length P plus T. -> A.
- B4 Hints in order people trip: positions from P (read from cached length) to P plus T, else fluent nonsense; concatenate along sequence dim (dim 2 after transpose), not dim 1 which is heads; mask is T by S, shifted triangle with diagonal S minus T, reduces to old mask when P is 0 and to no mask when T is 1, one line covers prefill, decode, chunks; only K and V in cache; keep model(idx) with no past giving exactly what it did. -> A.
- B5 Task 3: two greedy loops; prefill then feed only the new token with past; assert exact token equality. In fp32 all 1,000 matched on Mac, CPU and GPU. Compare logits: not bit-identical, 1-row vs 500-row multiply adds in different order, around 1e-5 or below in fp32. Caveat: near-tie can flip argmax; bf16 much bigger differences; on mismatch print top-2 logits: near-tie = rounding, big gap = your bug. -> A; B asks "if logits differ how can tokens be identical", A explains.
- B6 Task 4: time every step of both loops for 1,000 new tokens (GPT-2 limit 1,024 positions total), save JSON, plot ms per token vs position. Synchronize before reading clock on GPU. Discard first steps (first MPS steps up to 850 ms warming up). Medians over sliding window 20-50 steps. Run CPU and GPU if possible: difference is the roofline talking. -> A.
- B7 Task 5: cache_bytes = sum of bytes over every K, V tensor; record every 100 steps; check against formula 2 x layers x heads x head size x 4 bytes x positions; agree to the byte. On Spark also torch.cuda.memory_allocated: grows about the same plus temp buffers. Repeat with gpt2-xl (600 KiB per token) and batch of 8; predict slopes first. -> A.
- B8 Task 6: on Spark in baseline container, Llama 3.1 8B Instruct bf16, look at past_key_values: a Cache object like DynamicCache; shape (1, 8, prompt length, 128): 8 KV heads not 32 = GQA in memory. API changed across versions; check docs. -> A.
- B9 generate caches by default (transformers 5.20 on Mac: model config use_cache True, generation config unset, falls back). Measure Llama use_cache True vs False at 64, 256, 1,024 new tokens, min = max new tokens, greedy; per-token times via streamer or separate runs. Mac: HF's GPT-2 3.1 s with cache vs 14.8 s without for 300 tokens, identical output. -> A.
- B10 Env flag in server_naive.py passing use_cache False; harness at concurrency 1 on short prompts; ablation row in SCOREBOARD; the only row supposed to go backwards. -> A, with a small amused beat.
- B11 Task 7 (review): preallocate (B, H, max_len, head size), write pointer, write one row, attend over up to pointer plus 1; t3 still passes; rerun t4; small model little change (overhead); gpt2-xl, long context, batch 8 makes the copy easier to see; agent review for off-by-one in pointer and mask. -> A.
- B12 Done when: identical tokens for 1,000 greedy steps + explain logit difference in fifth decimal; plot with bend explained; cache_bytes matches formula for gpt2 and gpt2-xl; HF Llama cache shape, use_cache timings on Spark, ablation row. -> A, folded in, not read as checklist.

## Measure

- M1 Mac numbers: no cache CPU position 1 about 17 ms, 100 about 30, 500 about 160, 1,000 about 360; with cache about 8, 10, 11, 16; totals 170 s vs 12 s. -> A, as a progression, not a table.
- M2 Memory: gpt2 72 KiB/token, Mac 74.5 MB at 1,011; gpt2-xl 600 KiB; gpt2-xl batch 8 = 4.7 MiB per token. -> A, B works out the batch-8 slope.
- M3 Expect no-cache curve on Spark to be a hockey stick: Mac CPU low ridge point so recompute costs almost immediately; Mac GPU flat first hundred-odd tokens; Spark far more compute per byte, GPT-2 small long flat stretch maybe hundreds of tokens; 8B bend near measured ridge point. -> A.
- M4 Cached curve flat-ish not flat: creeps up from reading longer cache and computing longer score row; Mac CPU 8 to 16 ms over 1,000; with torch.cat part is copying; t7 says how much. -> A.
- M5 Llama short lengths: use_cache False may barely hurt at 64 tokens (tiny prefill, still dominated by reading 16 GB); ratio grows; large by 1,024; if bend near 200 tokens, no-cache run of 1,024 a couple of times longer than cached, gap widens. Work it out from measured FLOP/s and bandwidth before running. -> A; B surprised that turning off cache barely hurts.
- M6 Memory a perfectly straight line from cache_bytes, noisier from allocator; slope = formula; steps = PyTorch caching allocator reserving in blocks (stack and heap lesson). -> A.

## Break It

- K1 Forget position offset: every new token thinks it's at 0; grammatical for a few words then wanders; t3 fails in first couple of steps; most common KV bug in the wild; hides because text still looks like English. -> "what if" exchange.
- K2 Remove causal mask in both paths: diverge almost immediately; position 3 depends on later tokens so cached keys at step 3 stale by step 4; why BERT has no KV cache. Subtle version: plain lower-triangle on T by S mask, prompt in two chunks: single-token decode still works (one query needs no mask); two-chunk prefill silently different logits; bites in chunked prefill and spec decoding. -> exchange.
- K3 Cache too much: keep queries and hidden states too; still works; memory more than doubled for things nobody reads. -> exchange.
- K4 bf16 on Spark, 1,000 tokens: good chance loops eventually disagree, then different text. Not a bug: bf16 keeps about 3 significant digits, paths add in different orders, a near-tie tips. Print top-two gap at first mismatch. Lesson: "identical" is about exact math; low precision test = same tokens until a near-tie, tiny logit differences everywhere. -> exchange; B voices "so my cache is broken".

## Explain It Back (substance must appear)

- E1 What's in the cache, why not queries: per layer K and V of shape (batch, KV heads, length, head size); new query vs every past key, mixes every past value; past queries only made past outputs, finished. -> covered by I5, I14; B's closing restatement touches it.
- E2 Why valid / when not: causal mask induction; breaks with bidirectional attention, position encoding depending on something that changes as text grows; care with sliding windows (eviction); editing earlier text invalidates cache from that point on. -> I7-I9 plus A adds the editing point.
- E3 Scaling with/without: without, step t matrix work grows with t, attention with t squared; total matrix about n squared over 2, attention about n cubed. With: constant matrix plus length-t attention row; total matrix linear, attention quadratic. Measured gap smaller while recompute memory- or overhead-bound; short prefix almost free on GPU until ridge; enormous at long lengths. -> I20, I23; A adds the n cubed / quadratic attention totals.
- E4 Spark users at 8K for Llama 3.1 8B: 128 KiB/token so 8,192 tokens = 1 GiB per user; 128 GB minus about 16 GB weights leaves around 100 GiB, call it 90 after activations and overhead, roughly 90 users, fewer if GPU can't use all unified memory. MHA 4x = 4 GiB per user, about 22 users. Step time grows with total cache: at 90 users, 90 GiB read per step is several times the weights; per-user speed drops long before memory runs out. Why GQA, quantized caches, paging matter. -> A works it through with B after the figure.
- E5 Compare MQA, GQA, sliding window: MQA/GQA shrink per token by sharing (MQA most savings, some quality loss; GQA per group, 4x in Llama 3.1 8B, near-full quality); sliding window shrinks tokens kept, stops at W, ring buffer, best for very long context, loses direct access to far tokens, so models mix; all stack with fewer bits (FP8 halves). -> spread across I33-I41; ending exchange compresses.

## Go Deeper / Connections

- G1 Best sources: Shazeer 2019 paper; Pope et al. "Efficiently Scaling Transformer Inference" (2022). -> One sentence near the end.
- C1 Next: memory math (capacity plan), batching (many caches in one step), prefix caching (pages, sharing), spec decoding (T by S mask), FlashAttention (speeds the attention that reads the cache). -> One or two sentences before the close.

## Flow

1. Problem: the loop, the numbers, the Predict, B's diagnostic answer, the deeper questions.
2. Origin: tensor2tensor, Shazeer, the lineage.
3. Librarian -> K, V, Q -> what one token needs (Predict) -> triangle picture.
4. Why frozen: mask, induction, BERT, RoPE, per layer.
5. Prefill/decode, shape, 72 KiB picture, two bugs.
6. Stepper figure, counting, the 500 vs 14 puzzle, roofline, measured curves, overhead-bound, Spark Predict.
7. Memory: formula, rows, linear growth, two-for-one.
8. Shrinking: MHA/MQA/GQA, KVHeads figure + 90-users worked example, MLA, sliding window, fewer bits, storage (cat/static/pages).
9. Build It, Measure, Break It.
10. Pointer to next lessons + sources, close: B restates, A sharpens.
