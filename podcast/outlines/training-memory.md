# Outline: training-memory

Source: src/lessons/training-memory.mdx. Curriculum entry: "Why training needs so much memory." Question:
why does training a model take many times the memory of running it? Why: optimizer states, gradients
and activations decide what you can train on the Spark.

Diagnostic gaps hit: "memory math for models" and the general numbers gap (bytes, GB vs GiB); also
bf16 vs fp16 (he had it backwards), so bf16's range-vs-precision trade is said plainly. B voices wrong
models: "training is the weights plus a bit", "step 2 dying is a leak", "Adam's states are bf16 like
everything else", "frozen layers in LoRA need no activations", "CPU offload gives the Spark more room",
"forgetting zero_grad makes memory grow".

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereqs re-explained in place: memory-math's inference buckets (weights, KV cache, activations, overhead); GB vs GiB (~7%); memory_allocated vs reserved; Spark unified memory (CPU and GPU share one 128 GB pool). bf16 basics re-explained. -> A, a sentence each where it first comes up. Today bullets not read.

## The Problem

- P1 Inference sizing recap: 1B in bf16 is ~2.5 GB weights plus KV cache and overhead; Llama 3.2 1B serves on a laptop. -> A opens.
- P2 Fine-tune it: same 1.24B numbers; obvious loop, batch 8, seq 2,048, AdamW, 24 GB card; OOM on first step ("tried to allocate 3.91 GiB; total 23.55 GiB, 1.12 GiB free"). -> A tells the scene, says the error in words.
- P3 Where did twenty-plus GB come from? Drop to batch 1: runs, dies on step 2. What does step 2 need that step 1 didn't? -> B voices "leak?"; A leaves it hanging, pays off later.
- P4 Cross-encoder at work: "just train a bigger one" -> Spark vs rented H100s is decided by this question. -> A.
- PR1 Predict: Llama 3.2 1B, mixed precision AdamW, ignore activations, GB? Answer ~20 GB (18.4 GiB), 8x serving. 16 bytes/param: 2 bf16 weights, 2 grads, 4 fp32 copy, 8 Adam (4 each). 1.24B x 16 = 19.8 GB. Serving needs 2 of 16. Activations can add as much again. -> A asks, B guesses ~5 (weights + grads), A reveals.

## Origin

- O1 2019, after GPT-2 made 1.5B feel huge; Microsoft team (Rajbhandari, Rasley, Ruwase, He); paper "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models". -> A, story.
- O2 GPT-2 1.5B needs 3 GB of 16-bit weights yet cannot be trained on one 32 GB GPU with plain PyTorch/TensorFlow. -> A; B reacts.
- O3 Culprit: bookkeeping; 16 bytes/param, 24 GB of model states for a 3 GB model, before activations. -> A.
- O4 Fix: split it across GPUs rather than store all on every GPU; ZeRO now in DeepSpeed and as FSDP in PyTorch. Started by writing down the bytes. -> A.

## The Idea: four buckets

- I1 Training = forward (cook), backward (go back through every step asking how it should have changed), optimizer step (change the recipe a little). Extra memory = what's kept so going back and changing are possible. -> A, one quick exact comparison.
- I2 Weights: params x bytes; sometimes stored twice in two precisions. -> A.
- I3 Gradients (term): per param, how much loss changes if it grew a tiny bit; same shape as weights, another full copy. -> A.
- I4 Optimizer states: SGD remembers nothing; Adam two per param; usually biggest bucket. -> A.
- I5 Activations saved for backward: inference throws them away; training keeps every layer's until backward reaches it; grows with batch and seq. -> A.
- I6 Model states (term) = first three, depend only on the model; fourth on what you feed. -> A.
- F1 Figure 001: Llama 3.2 1B same scale. Serve ~3.9 GiB (bf16 weights 2.3 + runtime). Train b4 x 2,048 ~41 GiB: bf16 2.3, fp32 master 4.6, grads 2.3, Adam m+v 9.2, saved activations 11.5, logits+loss 9.8, runtime 1.5. States 18.4 = 16 B x 1.24B. Computed, not measured. -> A describes two bars, left to right, sizes in words.

## Adam

- A1 Plain gradient descent: weight minus learning rate times gradient. Two problems: noisy gradients wobble; one learning rate too big for some, too small for others. -> A in words.
- A2 Adam (term: Kingma and Ba 2014; AdamW = weight decay separate, same memory). m first moment (term: 0.9 old + 0.1 new; smoothed gradient, momentum) "which way lately"; v second moment (term: 0.999 / 0.001 of squared grad) "how big typically". -> A; the averaging said as "keep ninety percent of the old, mix in ten percent of the new".
- A3 Update divides one by square root of the other: per-weight step size. Works out of the box; costs two full copies. -> A.
- A4 Both fp32 (averages of tiny numbers, lose accuracy in 16-bit): Adam alone 8 bytes/param, 4x the bf16 weights. -> B voices "store them in bf16 too"; A corrects.
- A5 Mac check, small GPT-2: opt.state empty before first step; after, exp_avg and exp_avg_sq (m and v) per param, fp32, same shape, exactly 2.0x fp32 weights. Created lazily during first step -> the step 2 mystery: step 2 is first step starting with m and v in memory. -> A; payoff of P3.

## Why a second copy of the weights

- M1 bf16 (term: same 8-bit exponent / range as fp32, 7 stored mantissa bits; big range, coarse steps) used because tensor cores (term: dedicated matmul units, 16-bit many times faster than fp32) run it several times faster and it halves activations. -> A; tie to the bf16 vs fp16 gap: bf16 keeps range, gives up precision.
- M2 Precision bites at the update: ~8 significant bits, neighbours near 1.0 about 0.008 apart (2 to the minus 7). Update ~0.0001 on weight 0.05 = 0.2% change; bf16 steps 0.4-0.8% of value; rounds back; update vanishes; training silently stops. -> A, worked example; B: "so it just... doesn't move?"
- M3 Fix: 2017 "Mixed Precision Training" (Micikevicius et al., NVIDIA and Baidu): master weights (term) in fp32; optimizer adds there; bf16 copy refreshed from it; small updates accumulate until visible in bf16. -> A.

## The 16 bytes and variants

- S1 Table: bf16 weights 2, bf16 grads 2, fp32 master 4, m 4, v 4 = 16. -> A, said once as a sum, not as a table.
- S2 Rule: ~16 B/param before activations; 1B ~16 GB; Llama 3.2 1B 19.8 GB (18.4 GiB); 8B 128 GB. -> A.
- S3 Plain fp32: 4+4+4+4 = 16; no master needed. Mixed precision saves nothing on model states; saves activations and time. -> A; B surprised.
- S4 PyTorch AMP (autocast with fp32 model, his scripts): params fp32 4, grads fp32 4, Adam 8 = 16; autocast caches bf16 casts of weights until region ends: +2 at peak, "16 plus 2". -> A.
- S5 Frameworks keeping fp32 grads (Megatron-LM accumulating across micro-batches): 2+4+4+8 = 18. -> A.
- S6 Pure bf16: 2+2+2+2 = 8; only works with tricks for vanishing updates: stochastic rounding (term: round up or down at random proportional to closeness; tiny update survives on average) or Kahan-summation buffer (keeps rounding error, adds it back). Worse without. -> A.
- S7 Inference: 2. -> A.
- F2 Figure 002: rows of byte cells: bf16+master 16; plain fp32 16; AMP 16+2; +8-bit Adam 10; pure bf16 8; bf16 Adafactor ~4; inference 2. Savings come from shrinking/dropping optimizer states or dropping master. -> A, said as "the recipes all crowd around sixteen, and the only ways down are...".
- PR2 Predict: full fine-tune Llama 3.1 8B (8.03B) on Spark 128 GB at 16 B? No: 128.5 GB = 119.7 GiB, whole Spark before OS and activations. Need smaller optimizer, more machines, or LoRA. -> A asks, B answers, A gives the number.

## Why backward needs the forward's leftovers

- K1 Chain rule (term) in plain words: long pipeline; walk back from loss asking at each step "if my input moved a bit, how much would my output move?"; multiply. Backward pass (term) is that walk. -> A; B has built GPT-2 so A references loss.backward.
- K2 Each step's answer depends on what its input was. Linear layer: weight gradient needs the input x (input's gradient needs W, which you have). GELU: slope depends on input. Softmax: gradient in terms of own output, need attention probabilities unless kernel is clever. -> A, in words, no symbols.
- K3 Every op stashes what its derivative needs: micrograd's captured values in each backward closure; PyTorch save_for_backward; "saved tensors" (term). Under no_grad nothing stashed, why inference throws them away. -> A.
- F3 Figure 003: forward left to right through linear 1, GELU, linear 2, loss, stashing x0, x1, x2; backward right to left reading them; x0 lives through all of forward + all of backward. -> A as a phone diagram.
- K4 Layer 1's stash written first, read last; at the loss every stash alive at once = activation peak; why activation memory grows with depth. -> A.

## How big the stash is

- Z1 Letters: batch b, sequence s, hidden h, heads a, layers L; "one s b h" = one hidden-sized vector per token in the batch, basic unit. -> A defines once, then says "one token's hidden vector, for every token in the batch".
- Z2 Korthikanti et al. (NVIDIA), GPT-style block, 2 bytes per value: attention ~11 sbh (qkv input, q and k, v, out-proj input, dropout mask); MLP ~19 (input, 4h pre- and post-GELU, mask); two LayerNorms 4; textbook attention score matrices 5 a s^2 b (softmax output, dropout mask, dropped probs; every head keeps an s by s grid per sequence). -> A, lighter: list what's kept, then totals.
- Z3 Per layer s b h (34 + 5 a s / h), times L. First term linear; second grows with s^2. At s 2,048, a 32, h 2,048: 160, almost five times the first term. -> A in words with worked example.
- Z4 Fused attention (FlashAttention, PyTorch SDPA fused backend) never stores s by s; keeps output + one number per row; recomputes scores in backward tile by tile; s^2 term gone; ~34 sbh. FlashAttention saves more in training than inference. -> A.
- Z5 Llama blocks bigger per token: no dropout but SwiGLU MLP wide (8,192 for 1B, 4x hidden) three projections, RoPE and RMSNorm save pieces; ~40-50 sbh; 46 for 1B, 42 for 8B, estimates. -> A.
- Z6 Logits monster: b x s x V; GPT-2 V 50,257; Llama 3 128,256; bf16, fp32 copy, softmax output, gradient ~8-12 bytes per logit; 1B at b4 s2048: 4 x 2,048 x 128,256 x 10 ~ 10 GB, as big as all sixteen layers. Chunked cross-entropy kernels (Liger Kernel) exist to avoid it. -> A; B reacts to vocabulary.
- Z7 Measured GPT-2 small on Mac CPU, fp32 (double bytes), b2 s1024, saved_tensors_hooks: textbook + dropout 6.3 GB; textbook no dropout 3.7; fused SDPA no dropout 2.7; fused + checkpointing 0.5. Formula predicts ~5.5 for first row (incl. three fp32 logit copies); measured ~15% higher, probably HF GPT-2's GELU as chain of small ops each saving a 4h intermediate. Formula is a floor; measure. -> A says the four in a descending sentence.

## Watch one step

- W1 Figure 004 (interactive timeline): stacked view through forward, loss, backward, optimizer step, zero_grad; checkpointing toggle; first-step toggle; GPT-2 124M b8 s1024 or Llama 1B b4 s2048. -> A describes what you'd see as you press play / toggle.
- W2 Peak at the turn between forward and backward; not optimizer step, not end. -> A.
- W3 Gradients and activations trade places; backward frees layer's stash as it creates its grads; activations bigger so memory falls through backward. -> A.
- W4 GPT-2 small: logits biggest single item, vocab 50,257 is 65x hidden 768; big models other way round; advice depends on model size. -> A.
- W5 First step: no Adam states until optimizer.step creates them. -> A, ties back.

## The tools

- G1 Gradient accumulation: batch 32 doesn't fit -> batch 8 four times, step after fourth; micro-batch (term); backward adds into .grad (PyTorch default); divide loss by 4 so sum is average; mathematically same (up to float, except BatchNorm-like layers); activations of batch 8; model states unchanged; cost: time, GPU less busy, a lot if micro-batch tiny. -> A; B voices "doesn't that change the training?"
- G2 Activation checkpointing (term, aka gradient checkpointing): store only each layer's input (2 sbh in bf16), re-run layer's forward in backward. L full stashes -> L small inputs + one full. Cost: forward twice; forward ~1/3 of step (backward ~2x forward: one matmul for input gradient, one for weight, vs forward's one) -> ~33% more compute; measured 20-35%. HF gradient_checkpointing_enable; torch.utils.checkpoint with use_reentrant False. Chen 2016: every sqrt(L) layers for sqrt(L) memory; per-layer is what everyone uses. -> A; the 33% derived out loud.
- G3 8-bit optimizers: m and v in 8 bits; naive single scale destroys; bitsandbytes (Dettmers) block-wise quantization (term: blocks of 2,048, own scale, outlier only hurts own block), non-uniform code spending more of 256 values near zero; dequantize to fp32 for update, requantize; 8 -> 2 bytes/param; no quality loss on tested tasks; one-line change AdamW8bit. -> A.
- G4 Adafactor (Shazeer and Stern 2018): for n by m matrix keep row averages (n) and column averages (m), estimate entry as row x column / total; 4,096 x 4,096 needs 8,192 not 16.8M; drops m by default; my check: states 0.2% of weights; fussier to tune; popular for T5. -> A, worked example.
- G5 Precision: mixed precision makes activations 2 bytes not 4, often matters more than model states; pure bf16 halves states at vanishing-update price. -> A.
- G6 Sharding: data parallelism (term) every GPU full copy of all 16 bytes, N copies of same states. ZeRO stage 1 splits optimizer states, 2 also grads, 3 also weights (fetch layer weights just before, drop after). FSDP (term) is PyTorch's. Distributed lesson builds it. -> A; B: "why would anyone keep N copies?"
- F5 Figure 005: per-GPU states on 4 GPUs: no sharding 16 bytes/param; stage 1 4 + 12/N; stage 2 2 + 14/N; stage 3 16/N; costs moving weights every step; activations not sharded. -> A in words, with N = 4 worked (7, 5.5, 4 bytes) [derived].
- G7 ZeRO paper example: 7.5B on 64 GPUs: 120 GB per GPU plain, 31.4 stage 1, 16.6 stage 2, 1.9 stage 3. -> A.
- G8 CPU offload (ZeRO-Offload, FSDP CPU offload): optimizer states (and maybe weights) in CPU RAM, Adam on CPU; real win on servers (H100 80 GB, box 1-2 TB RAM). Nothing on the Spark: CPU and GPU share 128 GB; different label, same chips. Only NVMe offload adds capacity (ZeRO-Infinity); SSD hundreds of times slower than memory. -> B voices "offload to CPU on the Spark"; A corrects.

## Put it together

- C1 Figure 006 calculator: bar = peak of one step; lines: H100 (sold as 80 GB, nvidia-smi ~79.6 GiB), Spark 128 GiB, dashed Spark after OS (assumed 10 GiB). Approximate; real runs higher. -> A describes what you'd see.
- C2 Llama 3.2 1B, bf16 + master, b8 s2048: switch AdamW / 8-bit / Adafactor: states 18.4 -> 11.5 -> 9.2 GiB. -> A.
- C3 Push seq to 16K, turn off fused attention: s^2 term is why nobody trains long context without fused attention. -> A.
- C4 GPT-2 124M at batch 64: activations >50x model states; for small models the batch is the bill. -> A.
- C5 Llama 3.1 8B: model states alone hit Spark limit until pure bf16 with 8-bit states or Adafactor. -> A.

## What fits on the Spark

- R1 118 GiB usable after OS; ~10 GiB for activations (small batch, checkpointing): 108 GiB ~116 GB for states. -> A, worked.
- R2 16 B -> ~7B; 8-bit AdamW + master 10 B -> ~11B; 8-bit pure bf16 6 B -> ~19B; Adafactor pure bf16 ~4 -> ~29B. Upper bounds; "fits" = runs at all. -> A, as a descending list in a sentence.
- R3 Speed separate: bandwidth lesson; every optimizer step reads all 16 bytes/param at least once (writes most back); Spark ~273 GB/s spec sheet; 7B -> at least 112 GB traffic per step, 0.4 s+ before forward/backward math. -> A.
- R4 LoRA (term: Hu et al. 2021; freeze weights, train small d by r and r by k matrices whose product adds to frozen weight): frozen 2 B/param; adapters full 16 but tiny: rank 16 on every linear of 8B ~42M params (0.5%), 0.7 GB with Adam. LoRA 8B ~16 GB frozen + 0.7 + activations. -> A.
- R5 Activations don't go away: gradient flows backward through every frozen layer to reach earlier adapters; needs saved input; skip dW half so a bit less saved, most stays; checkpointing helps LoRA as much. -> B voices "frozen means no activations"; A corrects.
- R6 Spark: LoRA bf16 ~40-50B (2 B into ~100 GiB). QLoRA (term: 4-bit base, de-quantized per layer, adapters in bf16; Dettmers 2023): a little over 0.5 B/param with scales; 70B frozen ~35-40 GB. Full ~7B vs adapter 70B: 10x from same 128 GB; main reason LoRA is default on one machine. LoRA lesson builds it. -> A.

## Build It

- B0 Setup: on the Spark, ~/workbench/trainmem; GPT-2 at four sizes (124M, 355M, 774M, 1.56B) from config, random weights; memory doesn't care if trained; nothing to download. NGC PyTorch container (ARM64 + CUDA); pip transformers, bitsandbytes; fallback build from source or torchao 8-bit AdamW. Harness: build model (dropout off; SDPA), random token batches, mem/peak in GiB. n_positions bigger for longer seqs; dropout off lets SDPA use fused kernel; keep model.train(). -> A, one or two sentences of setup and the parts that matter.
- B1 Task 1 predict.py: bucket-by-bucket prediction in bytes, convert at end; recipe amp; optimizer adamw / 8bit / sgd; activations 34 sbh per layer or ckpt 2 sbh per layer + one full layer; logits 10 B each. Count params: 124,439,808 for small, tied embeddings counted once. Fill Predicted for 774M at b8 s1024 before running. -> A.
- B2 Task 2: five AdamW AMP steps; memory after forward, after backward, after optimizer step, after zero_grad; peak and time. Look for: steps 1 and 2 differ; after forward minus after zero_grad = activations; after backward lower than after forward. synchronize before clock (CUDA returns early); fresh process per config on the Spark. -> A.
- B3 Task 3 snapshot: record memory history over three steps, dump pickle, drag into PyTorch's memory viz page in browser; Active Memory Timeline = figure 004 from real data. Find: flat band of fp32 weights; Adam states appearing in step 1; forward staircase and peak at loss; logits as biggest block, stack trace into loss; autocast bf16 cast cache, one block per weight matrix, outliving the region because autograd saved them, freed in backward. Semi-private API. -> A, as "what you'd see".
- B4 Task 4 saved_tensors_hooks: pack called for every saved tensor; sum bytes keyed by storage not tensor (views share storage); drop parameters' own storages; SDPA vs eager at s 512, 1,024, 2,048; which grows like s, which like s^2; compare with 34 sbh L + logits. -> A.
- B5 Task 5 one lever at a time from 774M AMP AdamW b8 s1024: checkpointing; 8-bit AdamW; accum micro-batch 2 x 4 (divide loss by 4); all three. Record peak, sec/step, tokens/s (b x s / sec per optimizer step); time the whole optimizer step, not a micro-batch. -> A.
- B6 Task 6 max batch: double until fail, binary search; each trial in a subprocess (allocator messy after OOM; Spark's OOM killer may kill instead of raising); watch free -h; agent reviews for unfairness (shared process, passes step 1 but would fail step 2, timing includes construction). -> A.
- B7 Done when: predictions written before first run; snapshot shows weights, Adam appearing, staircase, logits, peak; table filled; explain every gap >20%. -> A, folded into one sentence.

## Measure

- E1 774M s1024 on Spark; use steps 3-5 (step 1 under-counts Adam; setup costs). -> A.
- E2 Baseline: states 16 x 774M = 11.5 GiB; cast cache 1.4; activations 34 x 1,024 x 8 x 1,280 x 36 ~ 12 GiB; logits 8 x 1,024 x 50,257 x 10 ~ 3.8 GiB; ~29 GiB. Expect 20-40% higher (unfused GELU). Far above: check SDPA fused; dropout on may block it. -> A; B tries the sum.
- E3 Step 2 peak higher than step 1 by 8 x 774M = 5.8 GiB (Adam created after step 1's peak). -> A.
- E4 Checkpointing: activations ~12 -> ~1 GiB (36 inputs + one rebuilt), peak falls ~11 to ~18 GiB, dominated by states and logits; sec/step +20-35%; much less means not compute-bound. -> A.
- E5 8-bit: m, v 8 -> ~2 B: ~4.3 GiB saved regardless of batch; time ~unchanged. -> A.
- E6 Accumulation: activations + logits shrink 4x (~4 GiB instead of 16); states unchanged; sec/step a bit higher; only lever that changes schedule not maths. -> A.
- E7 Max batch: fixed + b x per-sequence <= 118 GiB; baseline ~14.5 fixed, ~2 per seq -> ~50; checkpointing ~0.6 per seq (almost all logits) -> ~170; 8-bit only fixed part -> +2 or 3. Measured lower; check ratios. -> A, worked aloud.
- E8 Scaling check: baseline at s 512, 1,024, 2,048 (n_positions 2048): SDPA activations double each time; eager grows faster than double (s^2). -> A; the interview question.

## Break It

- X1 Eager attention at s 4,096, GPT-2 124M, b4 (n_positions 4096): predict 5 x 12 heads x 4,096^2 x 4 x 12 layers ~48 GB for score matrices alone; fails where SDPA ran. Lesson: s^2 is a stash kept until backward, not a passing spike. -> A/B what-if.
- X2 Forget zero_grad: memory doesn't grow (accumulates into same buffers) but loss goes haywire (sum of all previous gradients). Then set_to_none False: correct, but peak higher by a full grad copy (4 B x 774M ~ 2.9 GiB under AMP) because grads sit through next forward's activation peak; find it in snapshot; why set_to_none True is default. -> B voices "memory would grow"; A corrects.
- X3 losses.append(loss) not loss.item(): climbs every step; each loss holds its whole graph and every saved activation; most common real training "leak"; fix item() or detach(). -> A/B.
- X4 Pure bf16 without master: model.to bf16, plain AdamW, lr 1e-5, overfit a tiny batch; compare to AMP; many updates round to nothing, loss stalls or falls far slower; states halve; that's the price. -> A/B.

## Explain It Back (substance must appear)

- Q1 1B needs ~16 GB before activations vs 2: weights 2, grads 2, fp32 copy 4 (tiny updates), Adam two averages fp32 8; plain fp32 and AMP also 16 split 4+4+8; activations on top. -> covered by S1-S4; closing restates.
- Q2 Backward needs activations (chain rule, local derivative depends on input; linear, GELU, softmax examples; all alive at the turn); checkpointing keeps inputs, re-runs forward; L stashes -> L inputs + one; ~33% compute. -> K1-K4, G2.
- Q3 Scaling: per layer s b h 34 bytes x L + logits b s V ~10; linear; doubling seq doubles if fused; textbook adds 5 a s^2 b per layer, quadruples that part, dominates at long context; model states independent of seq; small/long-context: activations the bill; big models modest context: states. -> Z3-Z6, E8; A states the summary rule explicitly.
- Q4 Spark full vs LoRA; offload: ~7B / 11B / 19B; LoRA 40-50B, QLoRA 70B; activations still apply; offload helps servers with separate RAM, not Spark's shared pool; only SSD, slow. -> R1-R6, G8.
- Q5 ZeRO per-GPU scaling: plain 16 always; stage 1 4 + 12/N; stage 2 2 + 14/N; stage 3 16/N without limit, gathering weights every forward and backward; activations not sharded (need tensor/sequence/pipeline parallelism or checkpointing). -> G6, F5; A adds "activations need tensor, sequence or pipeline parallelism, or checkpointing".

## Go Deeper / Connections

- D1 One sentence: ZeRO paper section 3 and Mixed Precision Training paper. -> A, near the end.
- N1 Extends memory-math; s^2 term is the training half of FlashAttention; master copy is number formats applied; unlocks tiny-lm (pick batch/seq/ckpt for ~100M model), LoRA (7B -> 70B), distributed training (split the 16 bytes). -> A, one or two sentences.

## Flow

Problem scene (OOM, step 2 mystery) -> Predict 1B -> Origin (ZeRO) -> four buckets + figure 001 -> Adam (payoff of step 2) -> master copy / bf16 -> 16 bytes and variants + figure 002 -> Predict 8B on Spark -> backward needs leftovers + figure 003 -> stash size formula, fused attention, Llama, logits, GPT-2 measurement -> one step on the clock (figure 004) -> tools: accumulation, checkpointing, 8-bit, Adafactor, precision, sharding (figure 005, ZeRO numbers), offload -> calculator (figure 006) -> what fits on Spark, bandwidth, LoRA, QLoRA -> Build It tasks -> Measure numbers -> Break It four -> brief sources/connections -> close: B restates, A sharpens.
