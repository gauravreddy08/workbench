# Outline: architecture-compute

Source: src/lessons/architecture-compute.mdx. Curriculum entry: "Comparing transformer variants."
Question: how do you compare the compute efficiency of two transformer designs fairly? Why: listed in
research engineer roles; MHA vs GQA vs MQA is a real tradeoff in serving cost.

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereqs: GPT from scratch; KV cache lesson (decode reads the cache every step); bandwidth lesson. -> Not read. A re-explains the KV cache and "decode is bytes, not arithmetic" where inference comes up (I30, I31).

## The Problem

- P1 Three channel messages: MQA 0.04 worse val loss so out; GQA matches MHA with 11% fewer params so more efficient; GQA decode 3x faster, ship it. -> A reads them as a scene, plainly.
- P2 Each is a real measurement, none answers. First: MHA's LR on both, one seed, same steps. Second: counting params, but you pay for GPU hours. Third: batch 32 long prompts, where GQA shines; batch 1 short prompts closer to 1.2x. -> B voices the wrong model ("fewer params at same loss sounds like the definition of efficient"), A takes each apart.
- P3 Three decisions before running: what is held equal, what is measured, which use (training or serving). Get them wrong and either variant wins. -> A.
- O1 Origin: Jan 2020 Kaplan et al. (OpenAI), Scaling Laws; hundreds of models; loss falls as smooth power law in params, data, compute; common currency "reach your loss with 30% less compute"; conclusion: spend most on bigger model; GPT-3 and Gopher sized that way. -> A, story.
- O2 March 2022 Hoffmann et al. (DeepMind), Chinchilla: grow params and tokens equally, ~20 tokens per param. Confounder: Kaplan's LR schedule length not matched to run length, shorter runs handicapped, leaned to big models trained briefly. Chinchilla 70B on 1.4T tokens beat 280B Gopher at same compute. -> A, B reacts.
- O3 The lesson isn't the 20; a careful famous comparison flipped because of setup, not models. -> A.

## The Idea

- I1 FLOP = one add or one multiply; FLOPs a count, FLOP/s a rate. Hardware- and kernel-independent; time depends on both. -> A, term inline.
- I2 Matmul rule: (m by k) times (k by n) costs 2mkn: mn outputs, each a dot product of k multiplies and about k adds. -> A, small worked example in words.
- F1 Figure 001: one token's vector length d through a d by 4d matrix; 4d outputs each a dot product of d; every weight used once, multiply and add; 2 FLOPs per parameter whatever the shape. -> A describes.
- I3 Forward ~2N FLOPs per token; good first approximation, wrong in two places that matter at small scale. -> A.
- I4 Per block: Q, K, V, O each d by d = 4d^2; MLP up d by 4d and down 4d by d = 8d^2; 12d^2 per layer; N ~ 12 L d^2 ignoring LayerNorm/bias. -> A in words.
- I5 GPT-2 small: L=12, d=768 -> ~85M, the "85M non-embedding" of the 124M model; ~39M are token and position embeddings. -> A.
- I6 Non-embedding params defined; Kaplan found loss scales more cleanly with it; embedding lookup isn't a matmul, fetching row 4,182 costs no arithmetic. -> A.
- I7 Left out 1: attention scores Q.K^T and softmax(scores).V use no weights; cost depends on context length not N. -> A.
- I8 Token at position t, one layer: query (length d, heads side by side) dotted with t keys = 2td; mix t values = 2td; 4td per layer per token. -> A.
- I9 Full square + mask (simple implementation, PyTorch counter): 4LTd per token. Causal half (T/2 average): 2LTd, Kaplan's term 2 n_layer n_ctx d_attn; FlashAttention skips most masked blocks, closer to real work. Neither is "the" answer; pick one, say which, same for both. -> A; B asks which is right.
- I10 Ratio to 2N: T/(6d) full or T/(12d) causal. d=768, T=1024: 22% extra. d=256, T=2048: 133%, attention costs more than all weights. -> A, worked in words.
- I11 Left out 2: output head d by V matmul, 2dV per token; tied weights = embedding table so excluded from N but matmul real. GPT-2 small 2x768x50,304 ~ 77M per token vs 2N ~ 170M. Rounding error at large scale; a quarter of compute at Spark sizes. -> A.
- I12 Predict GPT-2 split (seq 1024, full square): projections 58.0 GFLOP (20%), MLP 116.0 (40%), attention 38.7 (13%), head 79.1 (27%), total 291.7; 2N says 173.9, about 60%. Matched torch flop counter exactly with math attention. Comparing with 2N across different context/vocab = a ruler 40% short, differently for each. -> A asks, B guesses (MLP dominant, 2N ~90%), A reveals.
- F2 Figure 002 interactive: stacked bar of forward FLOPs per token, head size 64, vocab 50,304. Sliders d_model, layers, seq len; MHA/GQA/MQA toggle; full vs causal. Push seq len until attention overtakes MLP; drop d to 256, head eats bar; toggle MQA, only K/V projection shrinks, scores don't because every query head still looks at every past token. -> A, "what you'd see as you drag".
- I13 GQA/MQA barely change training FLOPs: GPT-2 small 12 KV heads to 1 trims K and V from 2d^2 to ~d^2/6 per layer, a 9% cut in forward FLOPs; MLP, scores, head don't move. Whatever they're good for, not training arithmetic. -> B voices wrong model ("fewer KV heads means attention is cheaper to train"), A corrects.
- I14 Backward ~2x forward: for Y = XW, given dY, compute dX = dY W^T (pass gradient back, 2 per weight per token) and dW = X^T dY (weight gradient, 2 more). -> A in words.
- F3 Figure 003: forward 2N, backward 4N (two boxes), total 6N; C ~ 6ND; add 3x attention and head at small scale. -> A.
- I15 C ~ 6ND, D = training tokens; scaling-law x-axis. Honest small-scale: 3 x full forward per token x D. Checked: forward+backward exactly 3.0x forward. -> A.
- I16 Activation checkpointing: throw away activations, recompute in backward, ~one extra forward; hardware does ~8N, extra 2N not "model FLOPs". -> A, term inline.
- I17 Optimizer step (Adam's few ops per param per step, not per token) tiny, ignored. -> A, one line.
- I18 MFU: model FLOPs completed per second / hardware peak FLOP/s; PaLM 2022 introduced because older measure counted recomputation as useful. Well-tuned large runs 40-60%; PaLM 540B 46%. Small model on one GPU much lower: skinny matmuls, Python and launch overhead. -> A.
- I19 Spark: headline 1 petaFLOP is FP4 with sparsity; bf16 dense several times lower; measure achievable peak with big bf16 matmul (Task 0); MFU then rates your code, not the brochure. -> A; B asks the number.
- I20 MFU is a sanity check not the comparison: 15% vs 35% MFU = wall-clock gap from kernels, not architecture. -> A.
- I21 Three things to hold equal: params (and tokens) -> which gets more per weight; trap: if B does more work per weight it gets extra compute free. Training FLOPs -> fixed bill, lowest loss; trap: each needs its own best size. Wall-clock on given hardware -> best on my GPUs today; trap: rewards kernels, may not transfer. -> A as talk, not table.
- I22 Fourth, most common: equal training steps = equal params and tokens when batch same; same trap. -> A.
- I23 Default currency: equal FLOPs, because compute is what you pay for and can redistribute (bigger model fewer tokens or smaller more); fair comparison lets each variant choose. -> A.
- I24 Flip scenario: B 1.5x FLOPs per param per token (weight-shared looped block or longer context) and 1.3x per param. Equal params+tokens B wins (50% more compute). Equal FLOPs: B gets two-thirds the tokens or smaller, can cost more than it gains. -> A.
- I25 Predict flip: costly+strong loses at equal FLOPs under Chinchilla-shaped law; cheap+weak (0.9x quality, 0.8x FLOPs) loses at equal params, wins at equal FLOPs. Intuition: loss ~ power of compute; 1.5x costlier must be more than 1.5x better per param in effective-size terms; exponent on params small. -> A asks, B guesses B still wins, A reveals.
- I26 isoFLOP curve defined ("iso" Greek equal); recipe 5 steps: fix C; pick 4-5 sizes; D = C / FLOPs per token; train each to end of schedule, final val loss; plot vs log N, U shape (too small capacity-limited, too big too little data); bottom = compute-optimal; repeat at 2-3 budgets ~3x apart. -> A, story of running it.
- I27 Compare bottoms per budget; connect bottoms = compute frontier, near straight line vs log compute (power law); B below A = more efficient; "B reaches A's loss with 0.7x compute" = compute multiplier ~1.4x (definition: compute A needs to match B's loss at C, divided by C; above 1 B better; puts different improvements on one scale). -> A, B restates.
- I28 Multiple budgets not decoration: different frontier slope can win small, lose large; two points can't tell slope reliably, three can warn. -> A.
- F4 Figure 004 isoFLOP explorer (toy data): U per budget, solid A, dashed B; dots = best size at selected budget (equal FLOPs); square = B at A's size and tokens (equal params, costs B extra). Sliders quality and cost, budget. Chinchilla's fitted formula used for shape only. Try: costly+strong (square below A's dot, B's dot above, multiplier below 1); cheap+weak reverse, roughly MQA story; identical then cost 1.1x: multiplier ~0.9, loss gap at dots 0.01-0.03 depending on budget, about seed noise, hold that thought; budget slider: multiplier doesn't move, exactly quality / cost because m times better per param and k times costlier = A with m/k compute, so never flips with scale in toy; real variants can. -> A, as dragging.
- I29 Variants: all keep same number of query heads, differ in KV heads shared. Figure 005: 8 query heads; MHA 8 KV, GQA 2 KV (groups of four), MQA 1 KV; KV cache 1x, 1/4, 1/8; K,V projection 2d^2, d^2/2, d^2/4; scores and mixing same cost in all three. -> A over the phone.
- I30 MHA original. MQA Shazeer 2019: cached decoding limited by reading K and V from memory (re-explain KV cache), sharing one K and V reads far less; price a little quality. GQA Ainslie et al. 2023: groups share KV head; MHA and MQA its extremes; quality near MHA, speed near MQA; convert MHA by averaging KV heads within group then uptraining ~5% of original pretraining compute. Llama 2 70B and every Llama 3 use GQA. -> A, story.
- I31 Code change tiny: K and V projections output n_kv_head x head_dim; broadcast each KV head to its group; recent PyTorch SDPA with enable_gqa does it (used on PyTorch 2.14; check docs). -> A, names spoken.
- I32 Training through fairness: same width/depth -> fewer params and slightly fewer FLOPs, so "same config" is neither equal params nor FLOPs; papers at equal params widen MLP; isoFLOP side-steps; expected GQA on top of MHA within noise, MQA close perhaps slightly worse; "perhaps slightly" is what to check, not repeat. -> A.
- I33 Inference: re-explain bandwidth lesson (each decode step reads all weights) and KV cache lesson (reads every cached K and V for every sequence); bytes not arithmetic. Formula in words: time per step ~ (weight bytes + batch x context x KV bytes per token) / bandwidth; KV bytes per token = 2 x layers x n_kv_head x head_dim x bytes per number. -> B voices wrong model ("decode is slow because of math, so fewer FLOPs, faster"), A corrects.
- I34 Weights term ignores batch; KV term grows with batch and context. Batch 1 short: weights dominate, GQA/MQA a little faster mostly from smaller K/V weights. Batch 32 long: cache dominates, cutting 4x or 16x cuts step time a lot and fits far more sequences. -> A.
- I35 Predict decode: 24 layers, d=1024, head 64, ~355M MHA, bf16, Spark ~273 GB/s spec, context 1024. KV/token 96 KiB / 24 / 6. Weights 0.71 / 0.63 / 0.61 GB. Batch 1: cache 0.09/0.02/0.006 GiB, reads ~0.81/0.66/0.62 GB, ceilings ~340/410/440 tok/s, MQA ~1.3x mostly weights. Batch 32: cache 3.0/0.75/0.19 GiB, reads ~3.9/1.4/0.8 GB, ceilings ~2,200/6,100/10,700; GQA 2.7x, MQA almost 5x. Floors from spec; measured lower; batch 1 may be launch-overhead bound, squashes differences. -> A asks, B works through MHA KV per token with A, A gives rest.
- I36 Two honest answers: per training FLOP roughly tied (measure); per served token at realistic batch GQA/MQA win by a lot, growing with batch and context. Why every modern open model uses GQA: almost nothing at training, big win serving, serving lasts much longer. -> A; B paraphrases.
- I37 SwiGLU vs GELU (Shazeer 2020 GLU Variants): three matrices; two up-projections, one through SiLU, multiplied elementwise with other, down-projection; Llama, PaLM. Fair: hidden 4d -> 8d/3, equal params and FLOPs (3 x d x 8d/3 = 8d^2, checked d=768). Same hidden size gets 50% more MLP compute and looks better. -> A.
- I38 RoPE vs learned positions: RoPE rotates each query and key by angle depending on position so dot product depends only on distance; no params, negligible FLOPs; learned adds T x d table, lookup, no FLOPs; equal params and equal FLOPs nearly coincide; comparison about loss and behaviour beyond training length. -> A.
- I39 Pre-norm vs post-norm: LayerNorm before sublayer (GPT-2) vs after (original Transformer); no FLOP change; post-norm needs warmup and lower peak LR (Xiong et al. 2020); lives or dies on LR tuning. -> A.
- I40 Seed defined (initial weights and data order). Spread at these sizes ~0.005 to 0.02 loss (nats per token), rough, measure yours. MHA vs GQA differences same size or smaller. -> A; nats explained.
- I41 One run per variant tells almost nothing; several seeds or huge margin; statistics lesson; rule: 2-3 seeds per frontier point, mean plus/minus sd, don't call difference smaller than ~2x seed spread. -> A.
- I42 Mercy: U fitted through 4-5 points averages noise; bottom of fitted parabola more trustworthy than any single run. -> A.
- I43 Confounder defined. Seven: LR tuned for one (tune each at smallest budget, best not at edge); schedule length not matched (cosine ends when run ends); different tokens (order fine, data/tokenizer/val set not); different param counting (embeddings, tied counted once); different FLOP counting (2N for attention-heavy); equal steps when meant equal FLOPs (10% cheaper gets 10% more tokens); speed from software (fused kernel vs slow path, check MFU). -> A, as a run-through, B interjects.
- I44 Narang et al. 2021: dozens of modifications re-tested in one codebase; most didn't help; ones that did small and cheap, GLU among them; base rate: look for confounder first. -> A.

## Build It

- B0 Everything on Spark except FLOP counter check (anywhere). Layout: model, flops, train, sweep, plot, decode bench, results folder of JSONs, RESULTS.md. -> one sentence.
- B1 Task 0: recent PyTorch with CUDA (NVIDIA container easy route; check tag). Data: reuse tiny-LM shards or clean English corpus (FineWeb-Edu sample), tokenized once to flat 16-bit token arrays, train and val; ~a billion tokens. -> A, one breath.
- B2 Small vocab 8K-16K BPE (Tokenizers lesson): at a few million to tens of millions params, 50K table bigger than model and head dominates. Same for every run. -> A, B asks why.
- B3 Measure achievable bf16 peak: time a big 8192-square bf16 matmul, warm up, synchronize, average 20 iterations, 2n^3 / time; MFU denominator. -> A in words.
- B4 Task 1: add n_kv_head; MHA = n_head, MQA = 1, GQA divides n_head; RoPE or learned, same for all. Default config ctx 512, 6 layers, d 384, 12 heads, swiglu option 8d/3, tied. Cache stores small un-broadcast K and V. -> A.
- B5 Hints: SDPA enable_gqa; else repeat_interleave at cost of copy; decode with cache: is_causal=True wrong for one query vs T cached keys (masks almost everything), use False; test MHA config matches original bit for bit (or bf16 rounding). -> A, B asks about is_causal.
- B6 Task 2: analytic counter broken into proj, attn, mlp, head; train = 3x forward; check vs FlopCounterMode, ratio 1.000. -> A.
- B7 Mac trap: on CPU default fused attention not counted (PyTorch 2.14.1); total exactly one attention term short; bare SDPA 0 FLOPs; forcing math backend fixed; then exact for all three, fwd+bwd 3.0x. Math path counts full square even with is_causal, so analytic default is full. On Spark GPU check whether flash and memory-efficient kernels are counted and whether full square; write down; decides which number you trust. -> A, as a story.
- B8 Task 3 shapes: head size 32 so widths split into groups of 4; five shapes 4-8 layers, d 256-512, 3.1M to 25.2M non-emb MHA params. -> summarized, not read row by row.
- B9 Budgets 3e15, 1e16, 3e16 training FLOPs counted with your counter. Chinchilla ~20 tokens/param, N ~ sqrt(C/120) -> bottoms near 5M, 9M, 16M; pick 4 shapes bracketing each. Seq 512, fixed batch ~64K tokens/step. -> A; derives 120 from 6 x 20 aloud.
- B10 train.py: steps = C / (train FLOPs per token x tokens per step); warmup then cosine ending at that run's last step; final val loss on fixed held-out few million tokens; JSON with tokens/s and MFU. -> A.
- B11 Time it first: one short job per shape; hours = total FLOPs / (achieved FLOP/s x 3600); 3 variants x 3 budgets x 4 shapes ~5e17; at 20 TFLOP/s, 7 hours; if worse, scale all budgets down by same factor, don't drop the largest. -> A; B asks why not drop.
- B12 LR sweep per variant, middle shape, smallest budget, 4 LRs factor 2 apart (e.g. 1.5e-3 to 1.2e-2); extend if at edge; each variant's own best. -> A.
- B13 isoFLOP sweep seed 0; extra seeds 1 and 2 on two shapes nearest each bottom. Agent reviews train.py: schedule follows budget, FLOPs include attention and head, same validation tokens. -> A.
- B14 Task 4 plots: fit quadratic in log N per budget, return N and loss at minimum; compute multiplier by fitting or interpolating A's frontier in log C, find C_A reaching B's loss, ratio C_A / C. Two plots: U's with seed error bars; frontier loss vs log C. -> A in words.
- B15 Task 5: decode speed depends only on shapes; benchmark 24 layers, d 1024, head 64, KV 16/4/1 with random weights; kv bytes summed from tensors vs formula; prefill 512 random tokens, decode 512, tok/s = batch x gen / seconds, peak memory. -> A; B surprised by random weights.
- B16 Honest timing: warm up, synchronize before clock, bf16, preallocate cache to final length (not timing torch.cat); batch 1 and 32; batch 1 launch overhead may dominate; try torch.compile or CUDA graphs, report both. -> A.
- B17 Task 6 RESULTS.md one page, first paragraph answers: training verdict with compute multiplier plus/minus noise, inference tok/s ratios at batch 1 and 32, recommendation. Then setup, isoFLOP results, inference, caveats (scale, 100x, uncontrolled). Agent as skeptical reviewer "find the confounder", fix or list. -> A.
- B18 Done when: counter within 1% of FlopCounterMode for all three and you know which kernels it sees; U's at three budgets with own tuned LR and 3 seeds near bottoms; KV bytes and tok/s at batch 1 and 32 next to floors; RESULTS.md answers in first paragraph with numbers and error bars. -> A, folded in as "you're done when".

## Measure

- M1 Counter check reference: GPT-2-small shape, math attention: MHA 291.7 GFLOP, GQA-4 272.4, MQA 265.2, ratios 1.0000, fwd+bwd exactly 3.0x. Without math path: 253.1, 233.7, 226.5, exactly 38.7 short each = attention term. -> A; B spots the 38.7.
- M2 LR sweep record: grid, best, loss, edge? isoFLOP bottoms table per budget with seed sd. -> one sentence.
- M3 Throughput and MFU per shape and per variant; if MFU differs by more than a few points, wall-clock comparison is a kernel comparison. -> A.
- M4 Inference table: floors restated, approximate, measured lower. -> brief callback to I35.
- M5 Expect: GQA vs MHA training indistinguishable; honest "no detectable difference", not "0.3% better". -> A.
- M6 MQA vs MHA close, maybe slightly worse; check seeds and per-variant LR. -> A.
- M7 Best N shifts: GQA/MQA best runs at slightly larger shape (cheaper per token); equal-FLOP comparison doing its job. -> B guesses why, A confirms.
- M8 Decode batch 1 modest win, partly smaller weights; launch-bound maybe nothing. -> A.
- M9 Decode batch 32 large win tracking floor ratios; if not, check cache stored un-broadcast (repeat_interleave into cache gives back all the memory). -> A.

## Break It

- K1 Tune LR for MHA only; rerun MQA U at middle budget with MHA's LR; if gap changes more than seed spread, measured how much a confounder manufactures; most common failure. -> "what if" exchange.
- K2 Equal steps with wrong SwiGLU (hidden 4d): wins comfortably vs GELU; isoFLOP with real FLOPs (50% more MLP) most of win shrinks; fix 8d/3, what's left is the design effect. -> exchange.
- K3 Trust one seed: five seeds of one config, spread; how many seed-0 orderings survive; few small ones. -> exchange.
- K4 2N at long context: smallest shape at seq 2048, steps set with 6N; d=256 attention > all weight FLOPs; run silently costs ~twice budget; variant with cheaper attention looks bad; a counter that can't see fused attention makes the same mistake for you. -> exchange.

## Explain It Back (content must be in conversation)

- E1 Derivation 2mkn, 2 per param, N ~ 12Ld^2, misses attention (4td, full vs causal, T/6d, T/12d) and head (2dV, quarter at small scale). -> covered by I2-I11.
- E2 6ND from dX and dW; MFU; different MFU from skinny matmuls (MQA's tiny K/V projections) or fused kernel; wall-clock reflects software. -> I14-I20 plus explicit skinny-matmul MQA line.
- E3 Params / FLOPs / wall-clock and disagreement; costly reuse example; deeper narrower model at same params and FLOPs loses at wall-clock (layers sequential, matmuls too small to fill GPU); default equal FLOPs via isoFLOP. -> I21-I25 plus deeper-narrower line.
- E4 GQA training ~no difference; inference big yes growing with load; batch 1 ~1.2x; batch 32 1K context 355M model cache ~4x weights for MHA, GQA close to 3x faster and fits 4x as many sequences; at 128K context or hundreds of users ratio approaches 4x (16x MQA). -> I34-I36 plus scaling line.
- E5 Teammate 0.02 better: seeds and spread (~0.01, one seed weak); equal what and counted how; LR tuned for both; schedule ended with run; same data/tokenizer/val; holds at 3x and 10x compute; inference cost; Narang base rate. -> late exchange: B brings the teammate claim, A lists questions.

## Go Deeper / Connections

- G1 Best sources: Chinchilla paper (isoFLOP Approach 2, Appendix F FLOP counting) and Transformer Math 101 (EleutherAI). -> one sentence.
- C1 Sets up distributed training (FLOP accounting, MFU vs communication) and training memory. -> one sentence.

## Flow

Problem (three messages, B defends the parameter one) -> Origin (Kaplan to Chinchilla) -> FLOP
currency and matmul rule -> where N comes from -> two things 2N misses -> Predict split -> figure
002 -> GQA barely changes training FLOPs (B's wrong model) -> backward and 6N -> MFU and the Spark
peak -> what fair means, flip, Predict flip -> isoFLOP recipe, frontier, multiplier -> explorer
figure -> MHA/GQA/MQA story and code -> training verdict expectation -> inference (B's wrong model
on decode, bandwidth re-explained), Predict decode numbers -> two answers -> other variants -> noise
-> confounders, Narang -> Build It walk -> Measure -> Break It -> teammate 0.02 exchange (E5) ->
connections/sources one line -> B restates, A sharpens.
