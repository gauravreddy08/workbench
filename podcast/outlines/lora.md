# Outline: lora

Source: src/lessons/lora.mdx. Curriculum entry: "Fine-tuning and LoRA." Question: how do you adapt a
big model by training only a tiny fraction of it? Why: the cheapest way to specialize a model, and a
good look at low-rank math.

Diagnostic gaps hit: numbers and memory math for models (bytes per parameter, GB), so every byte bill
is said slowly with a comparison; he "knows LoRA in theory", so B voices the plausible wrong models:
"trains half a percent so it's two hundred times faster", "frozen layers can be skipped in backward",
"why not start both at zero / both random", "just do query and value like the tutorials", "QLoRA is
smaller so it's faster", "merge into the four-bit weights", "the loss went down so it works",
"fine-tune it to learn our internal docs", "train on every token". Earlier lessons re-explained in
place: the sixteen-bytes training bill (training-memory), bf16 as two bytes (memory-math), four-bit
levels and block scales (quantization), paging (virtual-memory), vLLM paging KV blocks
(serving-engines), server_naive and bench, TTFT (baseline-vs-fireworks).

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Today bullets not read; prereqs re-explained where they come up (see above). -> A, a sentence each.

## The Problem

- P1 Cross-encoder ranks well; he wants a model that reads query + page and returns strict JSON (label, reason) for labelling or second-stage checks. -> A opens the scene.
- P2 Prompting Llama 3.1 8B Instruct: right most of the time, ~1 in 20 opens with "Sure! Here's my assessment", drops a field, or says label 4 on a 0-3 scale; parser dies at 3 a.m. on the batch that mattered. -> A, story.
- P3 Fine-tuning (term): train a pretrained model a bit more on a small specific dataset; a few thousand examples of the exact output. -> A, inline definition.
- P4 Adam, mixed precision: ~16 bytes/param before activations; 8B x 16 = 128 GB = all of the Spark's spec-sheet memory, shared with OS and CPU. Doesn't fit, not "fits badly". -> B voices "8B in bf16 is 16 GB, I have 128"; A corrects with the bill.
- P5 Each task = a new 16 GB copy; judge, extractor, rewriter = 48 GB disk, three models in memory to serve. -> A.
- P6 The change is tiny and simple: updating 8 billion numbers when a few million would do. -> A, hook.

## Origin

- O1 2020 recipe: pretrain one, fine-tune a copy per task; breaks at GPT-3: 175B = 350 GB fp16; copy per customer absurd. -> A, story.
- O2 Adapters (term, Houlsby 2019): small bottleneck layers inserted in each block; in the path of every token, add inference latency. -> A.
- O3 Prefix tuning (term, Li and Liang 2021): learned virtual key/value tokens prepended at every layer; eat context, finicky. -> A.
- O4 2021, Edward Hu and colleagues at Microsoft: freeze everything, learn the change as a product of two thin matrices; GPT-3: ~10,000x fewer trainable params, ~3x less training memory, checkpoint 350 GB -> ~35 MB, matched full FT. -> A; B reacts to the numbers.
- O5 Multiply out and add back = nothing extra at inference; why it won. -> A.

## The Idea

- I1 Most params live in linear layers (term: y = Wx): attention q, k, v, o projections and MLP gate, up, down; h = W x. -> A, in words.
- I2 W_new = W + delta W; full FT leaves every entry of delta W free; 4096 x 4096 = 16.8M numbers for one matrix in one layer; LoRA restricts delta W's shape. -> A.
- I3 The 16-byte bill: bf16 weight 2, bf16 grad 2, fp32 master 4, Adam m 4, Adam v 4; implementations vary, 16 is the round number. -> A walks it as a sum, not a table.
- I4 Adam (term: two running averages per param, momentum and squared gradient; AdamW) and mixed precision (term: bf16 forward/backward, fp32 master so tiny updates don't round away). -> A, inline.
- I5 Activations (term) on top, grow with batch x sequence length. -> A.
- I6 Frozen weight: no grad, no master, no Adam; 2 bytes (or ~half a byte in 4 bits). Game: freeze almost everything, make the trained part tiny. -> A.
- F1 Figure 001: bars vs the Spark's 128 GB line: full FT 8B = weights 16 + grads 16 + master 32 + Adam 64 = 128 + activations; LoRA 8B = 16 frozen + 0.7 adapter; QLoRA 8B = ~5.7 + 0.7; full FT 1B = 1.24B x 16 ~ 20 GB. Activations on top of every bar. -> A describes like a diagram over the phone.
- I7 The ~5.7 GB is an estimate: layers at a bit over 4 bits ~3.6 GB, embedding and output head kept bf16 ~1 GB each (128k vocab). Measure it. -> A.
- I8 delta W = B times A; B is d x r, A is r x d, r small (8, 16, 64). A squeezes x to r numbers, B spreads back out: a bottleneck; update can push output in only r independent directions; rank (term) and low-rank (term). -> A; B restates.
- I9 Count: 2dr vs d^2. d 4096: r 8 = 65,536 (0.39%), r 16 = 131,072 (0.78%), r 64 = 524,288 (3.1%). -> A picks the r=16 row, mentions the others briefly.
- I10 Non-square r x (d + k), MLP 4096 -> 14336; all linear layers Llama 3.1 8B r=16 = 41,943,040 ~0.52%; only q and v: 6.8M, under 0.1%. -> A.
- I11 The bet: the update fine-tuning needs is close to low-rank; depends on the update. -> A.
- F2 Figure 002 (interactive): toy 24 x 24 update, best rank-r fit via truncated SVD (ceiling: no training beats it), slider for r, three update types (few directions, few + noise, many directions). -> A: what you'd see as you drag.
- F2a Shapes: at r=4, B and A are slivers, a third of d^2 in the toy; at d=4096 the same r is 0.2%; savings grow with d because d^2 grows faster than 2dr. -> A.
- F2b Error curve: few strong directions = falls off a cliff at the right rank then zero, extra rank wasted; spread energy = slow slope, small rank leaves most of it. -> A.
- F2c Spectrum bars: singular values (term: strengths of independent directions, sorted; rank = count of non-zero; top r = best rank-r fit, Eckart-Young). LoRA keeps only the top r. -> A.
- PR1 Predict rank-enough: narrow JSON task -> few directions with a tail; LoRA paper: rank 1-8 captured most, learned directions amplified features already in W but not emphasised. 20B tokens of code -> many directions; Biderman 2024: full FT updates needed 10-100x higher rank than typical LoRA to explain 90% of variance. -> A asks, B guesses (gets code right, hedges on narrow), A reveals.
- I12 Aghajanyan, Zettlemoyer, Gupta 2020 "Intrinsic Dimensionality...": freeze, fixed random projection from k numbers to all weights, train only k; smallest k reaching 90% of full FT = intrinsic dimension (term, Li et al. 2018). -> A, story.
- I13 RoBERTa on MRPC (paraphrase): ~200 numbers got 90%; bigger, better-pretrained models have smaller intrinsic dimension. -> A; B reacts to 200.
- I14 LoRA = a structured projection (low rank per matrix) instead of random: cheap, can be multiplied out. -> A.
- F3 Figure 003 / formula h = Wx + (alpha/r) B(Ax): frozen W path, side path A -> r -> B -> scale -> added; W frozen in bf16 or 4-bit; only A and B trained. -> A describes.
- I15 B starts at zero: side path outputs zero, step 0 is exactly the base model. A random (paper Gaussian, PEFT Kaiming-uniform like nn.Linear). Both zero: B's gradient is proportional to A x, A's to B-transpose times incoming gradient, so both zero forever. Break It shows A.grad exactly zero at step 0. -> B asks "why not both zero / why not both random"; A explains.
- I16 alpha/r: alpha usually r or 2r; dividing by r keeps update size steady as r changes, so no LR retune; paper set alpha = first r and never tuned; rsLoRA (term, Kalajdzievski 2023) alpha/sqrt r better at large ranks, PEFT flag; practice: fix alpha=2r, tune LR. -> A.
- I17 LoRA dropout (term): on the side-path input only, 0.05-0.1, mild guard on small data. -> A, one line.
- PR2 Predict step-time: does 0.5% params mean 0.5% time? No, ~two thirds, sometimes barely less. 6 FLOPs/param/token: 2 forward, 2 backward for input gradient (keeps gradient flowing to earlier layers), 2 for weight gradient; freezing saves only the last; backward still passes every frozen layer since layer 1's adapters need the gradient from layer 32. ~4 vs 6. Wins are memory and storage. QLoRA usually slower per step (unpack 4 bits on the fly, forward and backward). -> A asks, B says "two hundred times faster" then "skip backward through frozen layers", A corrects.
- I18 Which matrices: paper adapted only q and v (memory-short on GPT-3); spreading a budget over both beat one; became the tutorial default. -> B voices the tutorial default; A.
- I19 Not best anymore: QLoRA found all linear layers needed to match full FT, rank matters less then; Biderman same; Thinking Machines 2025 "LoRA Without Regret": MLP matters most, attention-only underperformed even at matched param count; most params are in the MLP. -> A.
- I20 Default: all-linear (PEFT term: Hugging Face's library), embeddings and head frozen, r=16. -> A.
- I21 Merge: W_merged = W + (alpha/r) B A; same shape, ordinary model, same speed; zero added latency (beat adapters); merge_and_unload; reversible by subtraction up to rounding. -> A.
- I22 QLoRA merge trap: merging into 4-bit re-quantizes and the tiny update rounds away; load base bf16, merge, save bf16; slightly different from trained, so eval the merged model. -> B suggests merging into 4-bit; A corrects.
- PR3 Predict adapter size: 41,943,040 x 2 bytes ~84 MB + small JSON; merged = 8.03B x 2 ~16 GB; 200x gap; ship adapters, merge at end, one server holds hundreds. -> A asks, B works it out.
- I23 Not merging: shared base, tiny adapters, pick adapter per request; one base + hundreds of adapters. -> A.
- F4 Figure 004: left merge = W plus scaled B A equals W', same shape/speed, one task. Right: batch rows tagged judge/extract/judge/base; shared base matmul once for all rows; per-row B A kernel; adapter pool, some on GPU, others in CPU RAM loaded on request. -> A describes.
- I24 Per-row step is the hard part; Punica (term, Chen 2023) SGMV kernel, different small matmul per batch segment; S-LoRA (term, Sheng 2023) pages adapters from CPU into a GPU pool shared with KV cache, same idea as vLLM's KV blocks; vLLM: enable LoRA, register adapters by name, request picks via model field (check docs); unmerged costs a little speed. -> A, re-explains vLLM paging in a sentence.
- I25 QLoRA motivation: frozen weights still 2 bytes: 16 GB for 8B, 130 GB for 65B; Dettmers, Pagnoni, Holtzman, Zettlemoyer 2023; QLoRA (term) fine-tuned 65B on one 48 GB GPU, matched 16-bit. -> A.
- I26 NF4 (term): 4 bits = 16 levels; weights bell-shaped around zero; levels at normal quantiles so each used about equally; dense near zero, sparse in tails; block of 64 has own scale (absmax); unpacked to bf16 on the fly; adapter math bf16; gradients flow through, never update. -> A, re-explains quantization levels.
- I27 Double quantization: fp32 scale per 64 weights = 0.5 extra bits/weight, 4 GB on 65B; quantize scales to 8 bits in blocks of 256 with an fp32 second-level scale; ~0.127 bits/weight; saves ~0.37 bits, ~3 GB on 65B. -> A in words, worked example.
- I28 Paged optimizers: spikes (long batch) cause OOM crash; optimizer states in unified memory (term) paged to CPU RAM and back, like OS swapping; on the Spark CPU and GPU share one pool, less to page, still protects. -> A.
- I29 Cost: dequantized (term) every forward and backward pass -> slower; on the Spark bf16 LoRA on 8B fits easily; QLoRA is a choice until a 70B. -> B "smaller so faster?"; A.
- I30 Biderman, Portes, Gonzalez Ortiz et al. 2024 (Columbia and Databricks) "LoRA Learns Less and Forgets Less": Llama-2-7B, code and math, continued pretraining (term) vs instruction fine-tuning (term), full FT vs LoRA at ranks. -> A, story.
- I31 Learns less: substantially below full FT on target domain, worst on continued pretraining on code, much closer on instruction FT; full FT updates 10-100x more rank. -> A.
- I32 Forgets less: on HellaSwag, ARC, WinoGrande LoRA kept more of the base. -> A.
- I33 Their advice: all modules, higher LR than full FT, use LoRA for behaviour not absorbing a corpus. -> A.
- I34 Boundary: format, style, narrow classification/extraction = few directions, LoRA close; company internal APIs, a new language = many; for knowledge, retrieval usually beats FT; LoRA Without Regret: matched on small-to-medium post-training sets, fell behind when data carried more info than adapter capacity. -> B voices "fine-tune on our docs"; A.
- I35 Catastrophic forgetting (term, McCloskey and Cohen 1989): stops following other instructions, knowledge slips, answers everything with a label; reduce with lower rank, fewer steps, lower LR, mixing general instruct data; only known if measured -> two-half eval. -> A.
- I36 Chat template (term): Llama 3 user turn = start-header marker, "user", end-header marker, blank line, text, end-of-turn marker; train on raw "Query: Answer:" then serve via chat endpoint = format never seen; build with apply_chat_template, serve the same. -> A in words, no symbols.
- I37 Loss mask: 500 prompt tokens vs 15 answer -> 97% of gradient on predicting your prompts; copy input IDs to labels, prompt positions = minus one hundred, ignored by cross-entropy (ignore_index); keep end-of-turn in the loss or it never learns to stop. -> B voices "train on everything, more signal"; A.
- F5 Figure 005: top row input tokens (begin, user header, query + page, end of turn, assistant header, answer, end of turn); below, labels: minus one hundred under all prompt tokens, real IDs under answer and final end of turn; ~500 masked, ~15 trained. -> A describes.
- I38 Tokenizer boundary trap: tokenize prompt and full separately, assert full starts with prompt's tokens (merges across boundary). -> A.
- I39 TRL SFTTrainer has completion-only / assistant-only options, names changed across versions; do it by hand once to check the library. -> A, one line.
- I40 Hyperparams: LR 1e-4 to 2e-4 LoRA vs ~1e-5 to 2e-5 full (best LoRA ~10x, LoRA Without Regret); r 16 try 8 and 64, choose on eval not train loss; alpha 2r (or r); all linear; 1-3 epochs on a few thousand; short warmup then cosine or linear decay. -> A in talk, LR said in words.
- I41 Overfitting (term) signs: train loss down while held-out up (eval every few dozen steps, keep best); train loss near zero (0.01 = memorised); outputs copy training reasons or same phrase; everything becomes your task ("capital of France" -> label 0). -> A.
- I42 Eval half one: held-out set (term); metric you care about: label accuracy, macro-F1 (term), exact and field-level match, parse fraction; compare to base with best prompt (95% vs 96% not worth owning); split by query or the model learns the query and the test lies. -> B "loss went down, so it works"; A.
- I43 Eval half two: general check identical on base and fine-tune: lm-evaluation-harness slice (MMLU, ARC, HellaSwag), 30-50 everyday prompts read side by side; looking for drops. -> A.
- I44 Eval the model you'll serve: merged, through your server, same template and decoding. -> A.

## Build It

- B0 Two halves: from scratch on the Mac (small enough to understand every number), real library on the Spark for a work task, then merge, serve, measure. Project layout not read. -> A signpost.
- B1 t0: venv with torch and transformers; SmolLM2-135M-Instruct ~134.5M params; Llama-architecture: 30 layers, hidden 576, MLP 1536, 9 query heads, 3 key/value heads so k and v project to 192; plain nn.Linear; GPT-2 in HF uses Conv1D, why not used. -> A, one stretch.
- B2 t1 LoRALinear: wrap a Linear, freeze it, A (r x in) Kaiming-uniform, B (out x r) zeros, scale alpha/r; forward = base + scale x side path with dropout; order matters: x times A first gives an r-wide intermediate, never build the d x d product; merged() returns plain Linear with W + scale B A; inject: freeze everything first (new params default to trainable), collect then replace via setattr, return formula count; merge_all. -> A: what's built and the part that matters.
- B3 t2 four checks: count equals formula, by hand first (r x (in + out), 30 layers); only A and B get grads, others none, print A and B grad sums, explain why one is exactly zero; identity at init: logits (term) equal untouched base (allclose, tight); merge exact after training to float rounding (~1e-5 in fp32). -> A.
- B4 t3 toy: synthetic sentences with name, age, city in four templates -> exact JSON; encode (chat template with generation prompt, mask, assert prefix), collate (right-pad, labels padded minus one hundred, attention mask), exact_match (greedy, up to 40 tokens). AdamW over trainable only, LR 2e-4, batch 16, 250 steps, all seven at r 8, MPS; report exact match on 50 held out before/after and step time; then q and v only. -> A.
- B5 t4 Spark: same NGC PyTorch container as the baseline lesson to keep NVIDIA's torch; pip peft etc.; bitsandbytes test (a 4-bit linear on the GPU) is the real check, needs ARM64 + GB10 support; check DGX Spark playbooks / bnb docs; don't let pip replace torch; fallback bf16 LoRA fits in 128 GB. -> A.
- B6 t5 real task: relevance 0-3 + one-sentence reason JSON; passage truncated ~400 tokens; data from his cross-encoder pairs or MS MARCO / TREC Deep Learning graded sets; alternative structured extraction; train 2,000-10,000, val ~300, test ~500, chat format, split by query, report label distribution; no reasons -> train label only, inventing reasons with a bigger model is distillation. eval.py: parse rate, accuracy, macro-F1, confusion matrix, general check (20-50 prompts saved to read, optional harness ARC-Easy + MMLU slice); run base with best prompt first: the number to beat. -> A.
- B7 t6 PEFT: LoraConfig r 16, alpha 32, dropout 0.05, all-linear, causal LM; QLoRA via BitsAndBytesConfig NF4, double quant, bf16 compute; prepare-for-kbit enables gradient checkpointing; print trainable params vs formula; eval val every ~50 steps, keep best; paged 8-bit AdamW optional. Runs: LoRA bf16 8B (r 16, all-linear, LR 2e-4, 1-2 epochs), QLoRA same, 1B LoRA vs full FT (LR ~1e-5, plain AdamW) — the comparison 8B can't fit. Predict peak memory and step time first; record max memory allocated and median of 20 steps after warmup; agent reviews for unfairness (seq len, batch size, timing first steps, eval in step time). -> A.
- B8 t7 merge.py: bf16 base even for QLoRA adapter, load adapter, merge_and_unload, save with tokenizer, check size; serve with his server_naive from baseline (reads MODEL_ID env); run eval through the OpenAI-shaped endpoint; bench TTFT (term re-explained) and tokens/s should match base; stretch: unmerged via vLLM vs merged decode speed. -> A.
- B9 DoneWhen: four checks + explain A.grad zero; toy near-zero to near-perfect; five Spark configs with task + general numbers; merged served passes eval over HTTP; predictions next to every measured number, gaps explained. -> A folds into the Build It talk, not a checklist.

## Measure

- M1 Predict first: memory from 16 / 2 / ~0.5 bytes per param plus activations (estimate or measure with a tiny batch); step time from ~6 FLOPs/param/token full, ~4 LoRA, divided by bf16 matmul throughput you measure (time one big matmul). -> A, worked example in words.
- M2 Results table rows (base + prompt, LoRA 8B, QLoRA 8B, LoRA 1B, full 1B, merged via server) with 41.9M for the 8B adapters. -> A names what to fill, not read.
- M3 Toy on an M-series MacBook (fp32, MPS, r 8, batch 16, 250 steps, LR 2e-4, alpha 2r; busy machine, rough times): all seven = 2,442,240 trainable (1.78%), exact match 0/20 -> 50/50, loss 0.24 -> 0.0001, ~1.0 s/step; q,v = 460,800 (0.34%), 0/20 -> 50/50, 0.24 -> 0.0009, ~0.75 s/step. Counts matched formula. -> A.
- M4 Base's zero: right name, age, city but pretty-printed JSON over several lines; starting loss 0.24 = already knew; LoRA taught the format = few directions, so 0.34% enough; q,v not 5x faster: frozen forward/backward dominate. -> B "it went from knowing nothing"; A corrects.
- M5 Trainable count must match formula; mismatch = targeted wrong things; cheapest bug check. -> A.
- M6 Memory: LoRA peak ~ frozen base 16 GB + activations (batch x seq, gradient checkpointing term: save some activations, recompute rest, ~one extra forward); adapter + grads + Adam < 1 GB; QLoRA cuts weights to ~a third; full FT 1B ~20 GB + activations; big gap = activations, halve seq len. -> A.
- M7 Step time: LoRA ~two thirds of full at same size, not 200x; QLoRA slower (dequant twice per step); much slower -> check compute dtype is bf16 not fp32. -> A.
- M8 Task: LoRA ~ full FT on 1B, both far above base on parse rate; label accuracy improves less (format few directions, judgement harder). -> A.
- M9 General: full FT forgets more, and more with more epochs; check the everyday prompts for relevance judgements. -> A.
- M10 Merged vs base through server: identical speed; if not, not merged (PEFT wrapper still on) or different dtype. -> A.

## Break It

- K1 Both A and B zero: loss never moves, grads both exactly zero (each multiplied by the other). B random too: trains, but identity check fails; base plus random perturbation everywhere, early training undoes damage. Zero B = start exactly where you want. -> "what if" exchange.
- K2 Wrong LR both ways: toy LoRA at 2e-5 barely learns in 250 steps; full FT SmolLM2 at 2e-4 spikes or NaN, or learns and forgets everything else. Same number, different meaning. -> exchange.
- K3 No loss mask: printed loss mostly predicting template, falls fast, looks great; task metric slower per step. Mask the end-of-turn too: right JSON then keeps going, second turn or rambling to max new tokens. -> exchange.
- K4 Train raw text, serve through chat template: exact match drops sharply; weights fine, input differs. -> exchange.
- K5 Merge QLoRA adapter into 4-bit (or simulate: merge bf16, round-trip through NF4): update small vs grid step, rounds away, metric falls back toward base; compare bf16 merge. -> exchange.

## Explain It Back (substance only, no quiz)

- E1 LoRA in one minute: W + delta W, delta W = B A, r << d (16 vs 4096), r directions, 2dr vs d^2 = 131k vs 16.8M, under 1%; only A, B get grads/state; B zero start; alpha/r; merge for full-speed serving. -> covered across I2-I21; B's closing restatement.
- E2 Why 8B doesn't fit; 16 bytes = 2+2+4+4+4; 128 GB; LoRA: 42M x 16 < 1 GB + 16 GB frozen; QLoRA ~5-6 GB base, slower steps. -> P4, F1, I25-I29.
- E3 Scaling: fraction 2r/d shrinks with width; bigger models smaller intrinsic dimension; memory decided by base not adapter; 70B -> QLoRA; compute ~4 vs 6 doesn't shrink much; quality falls as task breadth grows (high-rank updates); unmerged adapters scale to thousands per base (S-LoRA, tens of MB). -> A, dedicated "how does it scale" exchange near the end.
- E4 94% checklist: truly held out (by query, no near-duplicate pages, no tuning on it); beats base + best prompt by enough and not just parse rate; per-class and confusion matrix; general check vs base; all on merged model through real server with production template and decoding. -> B scenario near the end; A walks it.
- E5 B zero / alpha/r. -> I15, I16, K1.

## Go Deeper / Connections

- G1 Best reads: the LoRA paper (sections on method and on the rank of learned updates), and "LoRA Learns Less and Forgets Less"; QLoRA paper; LoRA Without Regret. -> A, one sentence.
- C1 Builds on memory-math, training-memory, quantization, serving-engines paging; prefix caching must include adapter ID in the cache key; next: evals lessons (is 94 vs 92 on 500 examples real?), DPO and GRPO where "forgets less" is a feature. -> A, one or two sentences.

## Flow

Problem scene (P1-P6) -> Origin (O1-O5) -> small edit to a big matrix and the byte bill with B's
"sixteen gigabytes" wrong model (I1-I7, F1) -> low-rank bet, counting, figure 002, predict, intrinsic
dimension (I8-I14) -> the layer: zero B, alpha/r, dropout, step-time predict (F3, I15-I17, PR2) ->
which matrices (I18-I20) -> merge, adapter size, many adapters (I21-I24, F4, PR3) -> QLoRA (I25-I29)
-> learns less / forgets less, forgetting (I30-I35) -> data: template, mask (I36-I39, F5) ->
hyperparameters and overfitting (I40-I41) -> evaluation (I42-I44) -> Build It Mac then Spark (B0-B9)
-> Measure (M1-M10) -> Break It (K1-K5) -> scaling and the 94% check (E3, E4) -> connections -> B
restates, A sharpens.
