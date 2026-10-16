# Coverage: architecture-compute

Lesson src/lessons/architecture-compute.mdx vs podcast/scripts/architecture-compute.md. Item IDs match
podcast/outlines/architecture-compute.md. "Fixed" = missing or thin in the first draft, now added.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs (KV cache, bandwidth re-explained) | MHA, GQA, MQA; Through the fairness machinery | "rather than recompute the earlier tokens' keys and values every step"; "it has to read every weight in the model out of memory" | covered |
| P1 three messages | Problem | "Swapped M H A for M Q A in the hundred-twenty-five-million config" | covered |
| P2 why each fails; 1.2x at batch 1 | Problem | "nobody's paying for parameters"; "more like one point two times" | covered |
| P3 three decisions | Problem | "What you hold equal. What you measure. And which use" | covered |
| O1 Kaplan 2020 | Origin | "January twenty twenty, Jared Kaplan" | covered |
| O2 Chinchilla, 20 tokens/param, schedule confounder, 70B vs 280B | Origin | "seventy billion parameters trained on one point four trillion tokens" | covered |
| O3 flipped because of setup | Origin | "flipped because of how the runs were set up" | covered |
| I1 FLOP defined | Currency | "A flop is one floating-point operation" | covered |
| I2 2mkn | Currency | "two times m times k times n flops" | covered |
| F1 one token through d x 4d | Currency | "goes through a weight matrix that's d by four d" | covered |
| I3 2N, wrong in two places | Currency | "wrong in two specific places" | covered |
| I4 12 L d^2 | Where N comes from | "N is about twelve times L times d squared" | covered |
| I5 GPT-2 85M + 39M | Where N comes from | "around eighty-five million" | covered |
| I6 non-embedding, row 4,182 | Where N comes from | "Fetching row four thousand one hundred eighty-two" | covered |
| I7 weightless attention matmuls | What 2N leaves out | "two more matmuls that use no weights at all" | covered |
| I8 4td | What 2N leaves out | "four times t times d, per layer, per token" | covered |
| I9 full vs causal, Kaplan term, FlashAttention, pick one | What 2N leaves out | "Pick one, say which" | covered |
| I10 T/6d, 22%, 133% | What 2N leaves out | "twenty-two percent extra"; "A hundred thirty-three percent" | covered |
| I11 output head 2dV, 77M vs 170M, quarter | What 2N leaves out | "about seventy-seven million flops per token" | covered |
| I12 Predict split 58/116/38.7/79.1, 291.7 vs 173.9, 60% | Predict the split | "So two N only covers about sixty percent" | covered |
| F2 interactive bar | Where the flops go | "the head segment just eats the bar" | covered |
| I13 MQA 9% cut, scores unchanged | Where the flops go | "a nine percent cut in forward flops" | covered |
| I14 dX and dW | Training is 6N | "the gradient for X... the gradient for W itself" | covered |
| F3 2N + 4N figure | Training is 6N | "Picture it as a box on the left that says forward" | covered |
| I15 6ND, 3x forward, checked 3.0 | Training is 6N | "exactly three point oh times the forward" | covered |
| I16 activation checkpointing 8N | Training is 6N | "about eight N per token, not six" | covered |
| I17 optimizer ignored | Training is 6N | "Adam's handful of operations per parameter" | covered |
| I18 MFU, PaLM, 40-60%, 46% | MFU | "Palm, at five hundred forty billion parameters, reported forty-six percent" | covered |
| I19 Spark 1 PF is FP4 sparse; measure peak | MFU | "That's for F P four, four-bit numbers, with sparsity" | covered |
| I20 15% vs 35% MFU | MFU | "fifteen percent M F U and the other at thirty-five" | covered |
| I21 three things held equal + traps | What fair means | "Hold parameters equal, and tokens" | covered |
| I22 equal steps | What fair means | "That's the fourth one, and it's the most common" | covered |
| I23 default equal FLOPs, why | What fair means | "compute is the thing you pay for, and it's the thing you can move around" | covered |
| I24 flip scenario 1.5x / 1.3x | What fair means | "one and a half times the flops per parameter per token" | covered |
| I25 Predict flip + cheap/weak reverse | What fair means | "It loses. Under a Chinchilla-shaped loss law" | covered |
| I26 isoFLOP recipe, U | iso-flop curves | "Iso is just Greek for equal" | covered |
| I27 frontier, multiplier 0.7x / 1.4x | iso-flop curves | "a compute multiplier of about one point four" | covered |
| I28 slope, three budgets | iso-flop curves | "Two points can't tell you a slope reliably" | covered |
| F4 explorer, presets, 1.1x, budget slider | iso-flop explorer | "nudge B's cost to one point one"; "it's exactly quality divided by cost" | covered |
| I29 figure 005 heads, cache 1, 1/4, 1/8; proj | MHA, GQA, MQA | "all eight lines converge on a single K V head" | covered |
| I30 MQA 2019, GQA 2023, uptraining 5%, Llama | MHA, GQA, MQA | "about five percent of the original pretraining compute" | covered |
| I31 code change, enable_gqa, 2.14 | MHA, GQA, MQA | "an enable G Q A flag" | covered |
| I32 training through fairness, widen MLP | Through the fairness machinery | "widen the MLP to give back what attention lost" | covered |
| I33 bytes not arithmetic, formula | Through the fairness machinery | "Decoding isn't limited by math" | covered |
| I34 batch 1 vs batch 32 | Through the fairness machinery | "at batch one and short context, the weights dominate" | covered |
| I35 Predict decode numbers | Predict decode | "Ninety-six kilobytes per token"; "two thousand two hundred, six thousand one hundred, and ten thousand seven hundred" | covered |
| I36 two answers; why every model uses GQA | Predict decode | "Per training flop, they're roughly tied" | covered |
| I37 SwiGLU 8d/3 | Other variants | "eight thirds of d" | covered |
| I38 RoPE vs learned | Other variants | "rope versus learned positions" | covered |
| I39 pre/post-norm, Xiong | Other variants | "Xiong and colleagues, twenty twenty" | covered |
| I40 seed, 0.005-0.02 nats | Noise | "point oh oh five to point oh two" | covered |
| I41 2-3 seeds, mean/sd, 2x spread | Noise | "don't call a difference smaller than about twice the seed spread" | covered |
| I42 fitted curve averages noise | Noise | "there's one mercy" | covered |
| I43 seven confounders | Confounders | "One: the learning rate" ... "And seven: speed from software" | covered |
| I44 Narang 2021 | Confounders | "Sharan Narang and colleagues" | covered |
| B0 layout | Build It: Setup | "a configurable model, a flop counter" | covered |
| B1 container, data, billion tokens | Build It: Setup | "on the order of a billion training tokens" | covered |
| B2 small vocab | Build It: Setup | "eight to sixteen thousand tokens" | covered |
| B3 peak matmul | Build It: Setup | "eight-thousand-one-hundred-ninety-two square matrices" | covered |
| B4 n_kv_head config, un-broadcast cache | Build It: Model | "stores the small, un-broadcast keys and values" | covered |
| B5 enable_gqa / repeat_interleave, is_causal trap, bit-for-bit | Build It: Model | "pass is causal false"; "bit for bit" | covered |
| B6 counter parts, 3x, ratio 1.000 | Build It: Flop counter | "It should say one point oh oh oh" | covered |
| B7 Mac trap, math backend, Spark kernels | Build It: Flop counter | "reported zero flops" | covered |
| B8 five shapes, head size 32 | Build It: Sweep | "Head size is thirty-two everywhere" | covered |
| B9 budgets, sqrt(C/120), 5/9/16M, 512, 64K | Build It: Sweep | "N is the square root of C over a hundred twenty" | covered |
| B10 train.py steps, cosine ends at run end | Build It: Sweep | "cosine decay that ends at that run's last step" | covered |
| B11 time it, 5e17, 20 TFLOP/s, 7 h, scale all | Build It: Sweep | "about seven hours"; "Why not just drop the biggest budget?" | covered |
| B12 LR sweep factor 2 | Build It: Sweep | "four learning rates, each a factor of two apart" | covered |
| B13 seeds 1 and 2; agent review | Build It: Sweep | "rerun the two shapes nearest each U's bottom" | covered |
| B14 plots, parabola, multiplier | Build It: Plots and decode | "fit a parabola through loss against log model size" | covered |
| B15 decode bench, random weights | Build It: Plots and decode | "Random weights? That feels like cheating." | covered |
| B16 honest timing, compile / CUDA graphs | Build It: Plots and decode | "allocate the cache at its final length up front" | covered |
| B17 RESULTS.md, skeptical reviewer | Build It: Write-up | "find the confounder" | covered |
| B18 done-when | Build It: Write-up | "You're done when your hand count matches" | covered |
| M1 291.7 / 272.4 / 265.2; 253.1 / 233.7 / 226.5; 38.7 | Measure | "thirty-eight point seven short each time" | covered |
| M2 LR and bottoms tables | Measure | "you record the learning-rate sweep" | covered |
| M3 MFU per variant | Measure | "If the M F U differs by more than a few points" | covered |
| M4 inference floors | Predict decode; Measure | "roughly tracking the ratios of the floors" | covered |
| M5 GQA indistinguishable | Measure | "no detectable difference at these budgets" | covered |
| M6 MQA close | Measure | "close, possibly slightly worse" | covered |
| M7 best N shifts | Measure | "should sit at a slightly larger shape" | covered |
| M8 decode batch 1 | Measure | "If you're launch-bound, maybe nothing at all" | covered |
| M9 batch 32, un-broadcast cache | Measure | "handed back all the memory you saved" | covered |
| K1 MHA-only LR | Break It | "tune the learning rate for M H A only" | covered |
| K2 wrong SwiGLU | Break It | "compare at equal steps with the wrong swiglu" | covered |
| K3 one seed | Break It | "Run five seeds of one config" | covered |
| K4 2N at long context | Break It | "the run silently costs about twice its budget" | covered |
| E1 derivation | Currency through Predict split | (as I2-I11) | covered |
| E2 6ND, MFU, skinny MQA matmuls | Training; Confounders | "its K and V projections are tiny, skinny matmuls" | covered |
| E3 deeper-narrower loses wall-clock | Explain It Back | "Take a deeper, narrower model" | covered |
| E4 cache ~4x weights, 4x sequences, 128K / hundreds of users | Through fairness; Predict decode | "the cache is about four times the size of the weights"; "a hundred twenty-eight thousand tokens of context" | fixed |
| E5 teammate 0.02 questions | Explain It Back | "beats the baseline by point oh two" | covered |
| G1 sources | Close | "the Chinchilla paper's iso-flop method" | covered |
| C1 connections | Close | "once you split training across many GPUs" | covered |

Numbers checked against the lesson. Derived (not written in the lesson): compute multiplier of about
0.87 for the costly-plus-strong preset (1.3 / 1.5, from the lesson's "exactly quality / cost"); "a
quarter the size" (70B vs 280B); the 10 x 20 x 30 worked matmul example (12,000 FLOPs); C = 120 N^2
spoken as the reason for sqrt(C/120).
