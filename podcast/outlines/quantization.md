# Outline: quantization

Source: src/lessons/quantization.mdx (plus the interactive figure QuantGrid). Curriculum entry:
"Quantization." Question: what do you lose when you store weights in 8 or 4 bits, and what do you
gain? Why: halving bytes per weight roughly doubles decode speed on a bandwidth-bound machine.

Diagnostic gaps this lesson touches: numbers (bytes, bandwidth, bits per weight), why decoding is
memory-bound (re-explained from the bandwidth lesson), bf16 vs fp16 / what exponent vs mantissa bits
buy (he had bf16 vs fp16 backwards), what "output distribution" means precisely (KL divergence).
B voices the natural wrong models: "4 bits is 4 bits, the bit count decides quality", "more exponent
bits means more precision", "quantized means faster everywhere / prefill gets faster too",
"perplexity barely moved so it's lossless", "the dequantize step is free".

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereq (bandwidth lesson): decode reads every weight once per token, so tokens/sec is about bandwidth divided by bytes; Llama 3.1 8B bf16 is about 16 GB, Spark spec 273 GB/s, about 17 tok/s. -> A re-explains in the opening in plain words.
- T2 Prereq: decode is memory-bound, prefill is compute-bound (prefill reuses each weight across hundreds of prompt tokens). -> A re-explains when W vs A comes up.
- T3 Prereq: bench.py and the scoreboard from the baseline lesson. -> one sentence in Build It.
- T4 Time: an evening on the Mac, an evening on the Spark. -> one clause in Build It.

## The Problem

- P1 Ceiling: 16 GB / 273 GB/s, about 17 tok/s no matter how clever the server; read fewer bytes; 4 bits instead of 16 should reach something like 55 tok/s. -> A opens.
- P2 Obvious quantizer: biggest value lands on 7, round, integers -8 to 7, four bits each; real quantizer, fine on paper. -> A; B agrees it sounds fine.
- P3 Term perplexity: e to the average negative log-probability per token; lower is better; 14 means about as unsure as picking among 14 equally likely tokens. -> A explains in words, no formula.
- P4 Qwen2.5 0.5B on the Mac: perplexity 14.4 to 79 million; random number generator with opinions. -> A.
- P5 One scale per 128 weights instead: 20.0; add zero-point per group: 17.2; Q4_K_M of Llama 3.1 8B used by thousands daily, hard to tell from original on most chat tasks. -> A.
- P6 Same bit count, unchanged to destroyed; three questions: which numbers share a scale, which numbers you quantize at all, how you round. -> A signposts; B's wrong model "the bit count is the quality" is corrected.

## Origin

- O1 2017-2018, Google (Benoit Jacob and colleagues), image models on phone CPUs that do 8-bit integer math far faster than float; paper "Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference"; small integer plus shared scale and zero-point; worked for CNNs at 8 bits; standard in TensorFlow Lite and later PyTorch. -> story.
- O2 2022: OPT-175B, BLOOM-176B needed about 350 GB in fp16, several data-center GPUs. -> A.
- O3 Dettmers LLM.int8(): old 8-bit recipe broke on large transformers because of a handful of giant outlier activation features; worked around them. -> A.
- O4 Frantar GPTQ: OPT-175B to 3-4 bits in about four GPU-hours on one GPU, by rounding cleverly. -> A.
- O5 Within a year llama.cpp ran 4-bit LLaMA on laptops; "which quant?" became the first question. -> A.

## The Idea: a ruler with fewer marks

- I1 Ruler: millimetre marks vs centimetre marks; pencil 14 cm not 14.3; off by at most half a centimetre; store a small whole number. -> A, short exact comparison.
- I2 Term quantization: snap to nearest point on coarse grid, store which point. bf16 about 65,000 values; 4-bit exactly 16. -> A.
- I3 Term dequantization: turn stored integer back to approximate real number, multiply by scale, on the fly inside the kernel right before the math. -> A inline.
- I4 The only question: where to put the marks. Too far apart, every weight moves a lot; too close, biggest weights fall off the end. -> A.

## The Idea: scale and zero-point

- I5 Term uniform quantizer: evenly spaced marks. -> A inline.
- I6 Term scale: step between marks, in real units; dequantize = (integer minus zero-point) times scale. -> A in words.
- I7 Term zero-point: integer that stands for 0.0; lets grid sit off-centre so a range like -0.6 to 0.9 uses all 16 levels. -> A.
- I8 Formula: b bits gives 2^b integers 0 to 2^b - 1; step = range / (levels minus one); zero-point = round(-min/step); quantize = clamp(round(x/s)+z); dequantize = s(q - z). -> worked example only, no symbols.
- I9 Term clamp: anything below the bottom becomes the bottom, above the top becomes the top; only matters for values outside the planned range. -> A inline.
- I10 Term affine quantization: scale and zero-point, grid can shift; "multiply then shift"; also called asymmetric. -> A.
- I11 Figure 001: number line -0.6 to 0.9, 16 marks, step 0.1, integer 6 means exactly 0.0; 0.33 rounds to 9, dequantizes to 0.30. -> described like over the phone, worked aloud.
- I12 Worst-case error is half a step; typical (root-mean-square) error about 0.29 of a step (step over root twelve); each extra bit halves the step and the error; 8 to 4 bits makes error about 16 times bigger. -> A in words, "about three tenths of a step".
- I13 Zero is exact: integer 6 decodes to exactly 0.0; networks are full of real zeros (padding, ReLU outputs, masked entries); a grid without zero turns each into a small wrong number. -> A; B pushes on why it matters.
- I14 Term symmetric quantization: drop zero-point when values centred on zero; integers -7 to 7 (or -8 to 7), step = biggest magnitude / 7; one number per group, simpler kernel; wastes levels when lopsided. Most int8 and many int4 symmetric; most 4-bit GPTQ/AWQ and llama.cpp k-quants use a zero-point or "min" offset. -> A.
- I15 Term round-to-nearest (RTN): compute step from range, round each weight to nearest mark; no data, no optimization; the baseline; what was done to Qwen. -> A.
- I16 Predict outlier-scale: row of 4,096 weights, bell-shaped, std 0.02, almost all within -0.06 to 0.06; one weight 0.5; symmetric int4 step = max/7; what fraction rounds to exactly 0? -> A asks, B guesses low.
- I17 Answer: step about 0.071; rounds to 0 below half a step, about 0.036, about 1.8 standard deviations; about 93%; row becomes the outlier plus a few survivors. Real Qwen MLP matrix per-tensor int4 (biggest weight about 21 std out): 88% rounded to zero, reconstruction error 78%. Scale set by the one number you care least about representing precisely. -> A reveals with reasoning.

## The Idea: who shares a scale

- I18 Shared scale only as good as the widest value it covers; most important design choice is how many weights share each scale, not the bit count. -> A.
- I19 Term per-tensor: one scale for the whole matrix; the largest value sets the step for millions. -> A.
- I20 Term per-channel: one per row (output channel, the weights that produce one output number); 4,096 x 4,096 matrix gets 4,096 scales; outlier hurts only its row. -> A.
- I21 Term per-group: rows cut into blocks of g, 128 common for 4-bit; 131,072 scales for that matrix; outlier hurts its 128 neighbours. -> A.
- I22 Figure 002: three copies of the matrix; per-tensor 1 scale, +0 bits/weight, outlier hurts 16.8 million; per-channel 4,096 scales, +0.004 bits, hurts 4,096; group 128, 131,072 scales, +0.125 bits, hurts 128; scales stored in fp16; more scales, finer grids, more bytes. -> described.
- I23 Why rows not columns: output i is the dot product of row i with the input; one scale per row can be pulled out of the sum (integer dot product, multiply once); a scale changing along a column lands inside the sum, a multiply per weight; groups do a small integer dot product per group and rescale each partial sum. -> A; B asks the natural "why rows".
- I24 Scale overhead: 128 weights at 4 bits = 512 bits, plus 16-bit scale, 4.125 bits per weight; 4-bit zero-point adds 4/128 more; why 4-bit models never exactly a quarter; tokens/sec = bandwidth / all bytes, scales included. -> A works the arithmetic.
- I25 Real matrix table: Qwen2.5 0.5B layer 0 gate_proj, 4,864 x 896, symmetric RTN; relative reconstruction error (size of error matrix / size of original). int8: per-tensor 4.8%, per-channel 0.85%, g128 0.68%, g32 0.55%, g128 affine 0.61%. int4: 78.2%, 15.3%, 12.3%, 9.9%, 10.3%. At 8 bits per-tensor survivable; at 4 bits granularity is everything; one-per-row cuts five-fold. -> A says the story of the numbers, not row by row.
- I26 Figure 003 interactive: toy matrix 4 rows x 512, bell-shaped, rows with own spread; top histogram of the group holding one weight, grid levels as lines; bottom one cell per scale shaded by error. Things to try: (1) 4 bits g128 no outlier, error about 13%; (2) outlier on, focus group spike, over 90% rounds to 0, other groups unchanged, damage contained to 128; (3) per-tensor, outlier applies to all 2,048, error about 70%, that's the 79-million Qwen; (4) per-tensor outlier off still about 29% because row 1 is wider; per-channel fixes it; (5) bits 4 to 8, 256 levels, step shrinks 17-fold, spike spreads out; why 8-bit forgiving; (6) affine helps most when lopsided, costs a few bits per weight in readout. -> "what you'd see as you click".

## The Idea: outliers in activations

- I27 Weights mostly aren't bad: Qwen matrix largest weight about 21 std out; ruins per-tensor 4-bit, groups handle it. -> A.
- I28 Term activations: numbers flowing between layers for a specific input, the vectors multiplied by weights; change with every token, can't inspect all ahead of time. -> A inline.
- I29 Measured: hooked inputs of every linear layer in Qwen on 512 tokens of Wikipedia; into layer 2's MLP down-projection, typical size 0.04, channel 813 hit 1,631; 37,000 times the median. -> A.
- I30 Term outlier features (Dettmers 2022): a few hidden dimensions consistently huge (magnitude 6 or more cut-off) across most tokens and layers; in OPT appeared abruptly around 6.7B parameters; same few dimensions; zero them out and performance collapses; not noise, used on purpose as a control signal. -> A; B guesses "noise, clip them" and is corrected.
- I31 Activation int8 experiment, weights untouched: unquantized 14.45; per-token scale 14.73; per-tensor 76.6. -> A.
- I32 Can't fix with per-channel scales: for activations a channel is a column of the input, inside the dot product (the row rule). -> A ties back to I23.
- I33 LLM.int8() (Dettmers, Lewis, Belkada, Zettlemoyer 2022): split the matmul, outlier columns in fp16, other 99.9% in int8, add; accurate, 175B on far fewer GPUs; slower than fp16 at small batch; memory saver, not speed-up. -> A.
- I34 SmoothQuant (Xiao, Lin et al. 2022): divide activation channel j by a factor and multiply the matching weights by the same factor, output unchanged; pick large factors for outlier channels; spikes shrink, weights get a bit harder; factor chosen with strength alpha about 0.5 balancing activation max against weight max, "migrating difficulty"; accurate int8 for both; factors folded into previous layer, free at runtime. -> A in words, worked example of divide-by-ten / multiply-by-ten.

## The Idea: weights only, or weights and activations

- I35 Naming: W for weights, A for activations, with bit counts. -> A.
- I36 Term W4A16 / W8A16: weight-only; stored small, unpacked to bf16 inside kernel, multiplied with bf16 activations on bf16 tensor cores. -> A.
- I37 Term tensor cores: dedicated matrix-multiply units; menu of formats; narrower formats run at proportionally higher rates. -> A inline.
- I38 Term W8A8 (int8 or FP8), W4A4/FP4: both quantized; math runs in narrow format; roughly twice the operations per second for each halving of width. -> A.
- I39 Recall decode memory-bound (reads every weight once per token, almost no math per byte), prefill compute-bound (reuses each weight across hundreds of prompt tokens). -> A re-explains.
- I40 Figure 004: weight-only path: memory (int4 W + scales), quarter bytes, unpack to bf16, bf16 tensor cores; decode up to about 4x, prefill same or a little slower. Weight-and-activation path: fp8 W + scales, half bytes no unpack, quantize X from bf16 to fp8 with a scale, FP8 tensor cores about 2x bf16 rate; decode up to about 2x, prefill up to about 2x; math always accumulated in fp32 (or int32) and rescaled at the end. -> described.
- I41 Decode: bytes everything; W4A16 about a quarter bytes, fastest single-user format on most hardware; W8A8's faster math doesn't matter much. -> A; B voices "quantized = faster everywhere".
- I42 Prefill: math everything; W4A16 same bf16 math plus unpacking; TTFT no better, maybe slightly worse; W8A8/FP8 faster prefill. -> A.
- I43 Batching: decode moves up the roofline toward compute-bound; weight-only advantage shrinks with batch (unpacking repeated, bf16 math dominates); FP8 keeps helping; fleets love FP8, single-user local loves 4-bit weight-only. -> A.
- I44 Predict w4-vs-fp8: Llama 3.1 8B on Spark one user; W4A16 g128 vs FP8 W8A8; decode ceiling and TTFT on 4,000-token prompt. -> A asks, B answers.
- I45 Answer: decode W4A16, about 4.7 GB (7 billion layer weights at 4.125 bits plus output projection kept in bf16 at about 1 GB) vs about 8 GB FP8; about 58 vs 34 tok/s. Prefill FP8: 4,000 tokens far above ridge point, limited by matmul speed; FP8 about twice bf16; W4A16 no faster than bf16, unpacking costs a bit. Best format depends on which number users feel. -> A reveals.

## The Idea: floats in 8 and 4 bits

- I46 Terms exponent (which power of two, more bits = wider range) and mantissa (where between two powers, more bits = finer precision; also significand). Float grid dense near zero, spread as numbers grow, relative error roughly constant; suits bell-shaped weights. -> A; B voices "more exponent bits = more precision", A corrects. Tie to bf16: 8 exponent bits, 7 mantissa bits, largest about 3.4 times ten to the thirty-eight: bf16 spends bits on range.
- I47 Term FP8: two flavours, standardised by NVIDIA, Arm and Intel in "FP8 Formats for Deep Learning" (Micikevicius et al. 2022); supported since Hopper (H100) and Ada. E4M3: 1 sign, 4 exp, 3 mantissa, max 448, usual for weights and activations at inference. E5M2: 1 sign, 5 exp, 2 mantissa, max 57,344, mostly gradients in training. -> A.
- I48 FP8 still keeps a scale (per tensor, channel, or block) because 448 is the largest; scale so the biggest value lands near top. -> A.
- I49 Term FP4 E2M1: 1 sign, 2 exp, 1 mantissa; 15 values: plus/minus 0, 0.5, 1, 1.5, 2, 3, 4, 6; only works with small blocks each with own scale. -> A lists the values aloud once.
- I50 Term MXFP4: OCP Microscaling spec (2023); blocks of 32, 8-bit power-of-two scale (E8M0); about 4.25 bits; OpenAI shipped gpt-oss expert weights in MXFP4. -> A.
- I51 Term NVFP4: blocks of 16, FP8 E4M3 scale (real number, not just a power of two), plus one fp32 scale per tensor; more accurate than MXFP4; about 4.5 bits. -> A.
- I52 Figure 005: bit layouts and max values (BF16 3.4e38 Ampere+, E4M3 448 Hopper/Ada+, E5M2 57,344, INT8 127 Turing+, INT4 7 mostly unpacked, FP4 6 Blackwell + block scale); FP4 vs INT4 positive grids stretched to same width: float dense near zero, integer even. -> described.
- I53 Spark: GB10 is Blackwell; spec sheet lists FP4 for fifth-generation tensor cores; "1 petaFLOP" is FP4 with sparsity; hardware can run NVFP4/MXFP4 and FP8. Cautions: spec-sheet numbers, measure; GB10 not the B200, different compute capability (sm_121, if right; check with nvidia-smi); some FP4/FP8 kernels in vLLM, TensorRT-LLM, FlashInfer written for data-center parts first; whether FP4 runs today is a docs question; check DGX Spark playbooks. -> A.
- I54 Decode one user: FP4 and INT4 weight-only both about 4.5 bits, same ceiling; NVFP4's real advantage is the math also runs in 4 bits: prefill and large batches. -> A.

## The Idea: rounding smarter, GPTQ and AWQ

- I55 RTN treats each weight alone; a layer's job is outputs; round a neighbour down to compensate. -> A.
- I56 Term calibration data: a few hundred example inputs (typically 128 sequences of a few thousand tokens) run once to see real activations; for choosing scales and rounding, not training. -> A inline.
- I57 GPTQ (Frantar, Ashkboos, Hoefler, Alistarh 2022): one column at a time; after rounding a column, measures the error in the layer's outputs on calibration data, nudges the not-yet-quantized columns to cancel it; best nudge depends on how input features move together (the X-transpose-X matrix, the Hessian of the squared error: how output error grows when you perturb each pair of weights); from 1990s pruning "Optimal Brain Surgeon"; contribution was speed at 175B in a few hours; one-shot, no gradient descent, no retraining. -> A in words, no symbols.
- I58 AWQ (Lin, Tang et al., MIT 2023): about 1% of weights matter far more; find them via activations; salient channels = input channels with large activations, errors amplified; keeping 1% in fp16 breaks the neat kernel; instead SmoothQuant trick in reverse: scale those columns up before quantizing, divide activations by same; use more of the grid; small grid search per layer on calibration; no reconstruction, no Hessian, quick. Both GPTQ and AWQ typically 4-bit, group 128, zero-point; supported by vLLM with fast kernels. -> A.
- I59 On small models both clearly beat RTN at 4 bits; at 8 bits RTN nearly lossless, so FP8 checkpoints are "compute a scale and round". -> A.

## The Idea: GGUF and k-quants

- I60 Term GGUF: single-file format for llama.cpp (and Ollama, LM Studio): weights, tokenizer, metadata; many quant types per tensor; all per-group with different packing. -> A.
- I61 Q8_0: blocks of 32 int8, one fp16 scale, 8.5 bits, practically lossless. Q4_0: blocks of 32 int4, fp16 scale, 4.5 bits, the old simple one. -> A works 8 + 16/32 in words.
- I62 Terms k-quants (Q2_K to Q6_K, 2023, Iwan Kawrakow) and super-block: 256 weights split into sub-blocks of 32 (or 16), each with its own 6-bit scale and min, one fp16 scale for the scales; Q4_K exactly 4.5 bits, Q6_K 6.5625. -> A.
- I63 _S/_M/_L suffix is a mix: Q4_K_M uses Q4_K for most, Q6_K for some sensitive tensors (parts of attention value and MLP down projections, usually output layer); Llama 3.1 8B Q4_K_M about 4.9 GB, about 4.9 bits. -> A; B asks why the name says 4.
- I64 Importance matrix (imatrix) from calibration text weights rounding error by how much activations matter, same instinct as AWQ/GPTQ; IQ formats (IQ4_XS, IQ3, IQ2) non-uniform grids, for fitting 70B into less memory; check docs, list grows. -> A.

## The Idea: what you lose, and how to tell

- I65 RTN Qwen2.5 0.5B, weights only, perplexity on 40,960 tokens WikiText-2: fp32 14.45; int8 per-channel 14.49; int8 per-tensor 15.12; int4 per-channel 31.7; int4 g128 sym 20.0; int4 g128 affine 17.2; int3 g128 sym 206. -> A tells the shape.
- I66 8 bits nearly free; 4 bits with groups and zero-point real but survivable on a 0.5B model; small models suffer more; 8B at 4-bit g128 loses far less; RTN 3-bit falls off a cliff where GPTQ, AWQ, importance formats earn their keep. -> A.
- I67 Perplexity is blunt: average tokens; model can keep it and get worse at rare precise steps. -> A; B voices "perplexity barely moved so it's fine".
- I68 Term KL divergence: for each position, how far the quantized model's next-token distribution is from the original's; zero = identical; more sensitive; llama.cpp llama-perplexity can compute against saved logits (KL divergence options); catches changes that cancel in perplexity. -> A explains "distribution" precisely (a probability for every token in the vocabulary) with a small example.
- I69 Flips: score same while answers change; "Accuracy is Not All You Need" (Dutta et al., Microsoft, 2024); report fraction that flip; users experience flips, not averages. -> A.
- I70 Task accuracy where precision matters: multi-step math (GSM8K-style), code that must run, exact recall from long context commonly reported to degrade first; one wrong token early derails; measure your own tasks. -> A.
- I71 Long context: more steps to compound; KV cache quantization a separate choice (kv-cache-dtype in vLLM, cache types in llama.cpp) adds error where long-context recall lives; test with long-context retrieval. -> A.
- I72 Honest report: bits per weight incl. overhead, method, granularity, perplexity and KL, accuracy on your task with a confidence interval, flip rate; stats lesson covers CI. -> A.

## The Idea: the cost of unpacking

- I73 Dequant not free: pull out 4 bits, convert to bf16, subtract zero-point, multiply by scale; careless = unpack whole matrix to bf16 in memory, write back, read again, slower than bf16. -> A; B voices "the unpack is basically free".
- I74 Term kernel: function on the GPU; good quantized kernel fuses: read packed bytes, unpack in registers right before the tensor-core instruction, never write the bf16 copy. -> A.
- I75 Term Marlin (Frantar and Alistarh, 2024): int4 x fp16 kernel; lays out int4 weights in the order tensor cores want; overlaps loading next tile with computing current; near ideal 4x up to batch 16-32; then compute-bound; used in vLLM. llama.cpp's own CUDA kernels per GGUF type; same Q4_K_M file at different speeds by build flags and version. -> A.
- I76 Quantized model only as fast as its kernel on your GPU; prediction is a ceiling; far below it, suspect the kernel (fallback, unsupported compute capability, unfused dequant) before the format. -> A.

## Build It

- B1 Two halves: Mac, by hand on a small real model; Spark, serve Llama 3.1 8B Instruct in several formats, speed and quality. Folder: q.py, recon.py, outliers.py, rtn_ppl.py, eval_small.py, results, scoreboard. -> A, one breath, no file list read out beyond names that help.
- B2 t0 setup: CPU, float32, slow but fine for 0.5B; venv, torch, transformers, datasets; Qwen uses plain Linear with weight shape out by in, so a row is one output channel; avoid GPT-2's Conv1D (transposed); hidden sizes 896 and 4,864 divide by 128 and 32. -> one or two sentences.
- B3 t1: write symmetric quantize (tensor, channel, or group size), affine per group, relative error, bits per weight; return dequantized tensor; hints: reshape so last axis is one group, take per-group max that broadcasts; torch round rounds halves to even; guard all-zero group; test on figure 001 example, should give back -0.6, 0, 0.3, 0.9. -> A, what matters.
- B4 recon.py: reproduce the granularity table; then plant an outlier (first weight set to 20 times the biggest) and rerun int4 per-tensor, per-channel, group 128; predict which numbers move. -> A; what you'd see (per-tensor wrecked, groups barely move).
- B5 t2 weights: for every Linear except lm_head, biggest weight in standard deviations; ten worst; which input columns hold the biggest. -> A.
- B6 t2 activations: forward hook recording per-channel max over tokens and overall median of each linear's input; 512 tokens; biggest max-to-median ratio; questions: same channels across layers? across texts (code)? which layer types worst; why down_proj (input is output of the gated MLP's multiply) special. -> A.
- B7 t3: perplexity function: non-overlapping windows of 1,024 over first 40,960 tokens, loss weighted by token count, average, exponentiate; quantize every linear in place, keep originals; sweep list; predict ordering; about 30 s per pass on M-series, sweep about four minutes. Activation experiment with pre-hooks, per-token vs per-tensor, reproduce the 76. -> A.
- B8 t4 stretch tiny AWQ: mean absolute activation per input channel; strengths 0, .25, .5, .75, 1; scale column by activation to the power alpha (normalize mean 1), quantize int4 g128, divide back (same as folding into previous layer); measure layer output error on calibration inputs, keep best alpha; rerun perplexity; agent reviews for calibrating and evaluating on same tokens, and columns vs rows. -> A.
- B9 t5 Spark: bf16 vLLM; FP8 online (dynamic per-tensor scales at load) or pre-quantized; 4-bit AWQ/GPTQ checkpoint (vLLM detects format); GGUF Q8_0 and Q4_K_M via llama-server (OpenAI API); NVFP4 optional only if release notes say FP4 on GB10. Read DGX Spark playbooks first (ARM64 + Blackwell new); confirm compute capability and which kernel vLLM selected (logged at startup), write it down. Record actual bytes (disk or engine-reported weight memory). Run harness at concurrency 1 and 16, short prompts, 256 tokens, ignore end-of-sequence, and long prompts at 1; keep everything else fixed. -> A.
- B10 t6 eval: base URL and model, temperature 0; first 200 GSM8K test problems, step-by-step ending "The answer is N", extract last number, 512 output tokens; save answers, report right-to-wrong and wrong-to-right vs bf16; bootstrap 95% interval (resample 200 with replacement 1,000 times), several points wide; overlapping intervals not demonstrably different; paired test on per-question results more powerful. Optional llama-perplexity KL mode on GGUFs (save base logits, compare). lm-evaluation-harness can talk to a local server; write your own first. -> A.
- B11 t7 scoreboard rows: format, bits per weight, engine and kernel in notes, GSM8K with interval; vLLM bf16 row is itself a big change from the naive server (serving-engines lesson); format rows vs vLLM bf16 isolate this lesson. -> A.
- B12 Done when: quant_affine reproduces figure 001 and recon close to table; name worst activation outlier channel and layer type; sweep incl. per-tensor disaster and activation per-tensor row; at least three Spark formats each with speed, prediction, GSM8K interval and flips; scoreboard rows. -> folded into flow, not read as list.

## Measure

- M1 Mac: compare against the sweep numbers (Qwen 0.5B fp32 CPU WikiText-2 first 40,960 tokens 1,024 windows), including int4 per-tensor about 79 million, activations per-token 14.73, per-tensor 76.6; should match closely if windows match; edge counting shifts the second decimal. -> A.
- M2 Spark predictions: bytes per token = weights read per token, everything except embedding table (a lookup); about 7.0 billion layer weights plus 0.53-billion output projection kept in bf16 (about 1.05 GB). Predict with spec 273 and with measured bandwidth. -> A.
- M3 Ceilings: bf16 about 15.0 GB, about 18; FP8 about 8.0 GB, about 34; int4 g128 about 4.7 GB, about 58; Q8_0 about 8.5 GB, about 32; Q4_K_M about 4.9 GB, about 56; NVFP4 about 5.0 GB, about 55. Estimated as 7.0 billion times 1 byte plus 1.05 GB for FP8; 7.0 billion times 4.125 bits plus 1.05 GB for int4; file size for GGUF; use engine-reported if different. -> A says the main ones, works one.
- M4 Decode roughly proportional to fewer bytes but not perfectly: fixed costs (kernel launches, attention over KV cache, sampling, unpacking) take a larger share as bytes shrink; 4-bit about 2.5 to 3.5 times bf16 rather than clean 4 is normal. -> A; B expects 4x.
- M5 TTFT long prompt: FP8 improves; int4 weight-only flat; int4 clearly faster than bf16 = investigate; a lot slower = slow kernel. -> A.
- M6 Throughput at 16: all beat naive server because vLLM batches; 4-bit edge smaller at 16 than 1; FP8 holds up. -> A.
- M7 Quality: Q8_0 and FP8 within noise of bf16 on GSM8K; 4-bit may cost a few points or nothing measurable at 200 while showing noticeable flips; loses 10+ points, check chat template and answer extraction first (broken template most common cause). -> A.
- M8 llama.cpp vs vLLM at same bits differ (engines and kernels); compare formats within an engine. -> A.

## Break It

- K1 Per-tensor 4-bit on purpose: print fraction rounded to zero for worst layer, generate a few sentences, read them; what "one scale shared by too many" feels like. -> what-if exchange.
- K2 2 or 3 bits RTN vs GPTQ: RTN 3-bit gave 206; GPTQ 3-bit on the Spark at same bits and group; gap = value of error compensation, grows as bits shrink. -> exchange.
- K3 Wrong calibration data: calibrate on 128 samples of Python code, evaluate on Wikipedia and vice versa; then 8 samples instead of 128; calibration decides which channels count as important. -> exchange.
- K4 Quantize what you shouldn't: embedding table and lm_head per-tensor, watch perplexity; KV cache to 8-bit (fp8), hide a sentence in a 30,000-token document and ask for it; bytes saved real, so are errors. -> exchange.

## Explain It Back (substance must appear)

- E1 Quantization in one breath; scale is grid spacing; dequantize = integer times scale (minus zero-point first); big scale wide range coarse rounding; max error half the scale; each bit halves scale; 4-bit has 16x error of 8-bit. -> covered in ruler/scale sections plus B's closing restatement.
- E2 One outlier ruins per-tensor: step stretches, one weight 20x larger makes the step 20x coarser for everyone; most round to zero. Fixes: fewer weights per scale; keep outliers high precision (LLM.int8()); move difficulty with exact rescaling (SmoothQuant, AWQ); round cleverly (GPTQ). Activation outliers harder: per input channel inside the dot product, and change per token. -> A consolidates after activations section.
- E3 Single-user Spark vs busy H100 server: single user, decode memory-bound, fewest bytes wins, 4-bit weight-only close to 4x ceiling, bf16 math doesn't matter since math units idle; busy server large batches push to compute-bound, prefill big share, FP8 W8A8 halves bytes and math, loses almost nothing, default on Hopper, NVFP4 next on Blackwell; on the Spark NVFP4 attractive for both if engine supports GB10. -> A in the W vs A section.
- E4 Scaling with batch: batch 1 tokens/sec = bandwidth/bytes; bigger batch, each weight read serves more tokens, arithmetic intensity grows, up the roofline; near ridge point limited by math; weight-only no advantage, can be slower; W8A8 still about 2x; KV cache grows with batch and isn't touched by weight quantization, shrinking the share the weight format controls; weight-only = small-batch win, W+A keeps paying. -> A in batching part.
- E5 "4-bit is lossless, perplexity up 2%": ask model size, method, group size, true bits per weight; perplexity on what, KL vs original; task accuracy with CI, flips; long context, multi-step math, code; "lossless" = no detectable difference with this eval at this sample size. -> B voices the claim in "what you lose", A answers.

## Go Deeper / Connections

- G1 One or two best sources: Dettmers' blog post "LLM.int8() and Emergent Features" as the gentle read; GPTQ section 3 or AWQ paper short and clear. -> one sentence near the end, optional.
- C1 First escape from the 17 tok/s ceiling (same division, smaller numerator); rows on the scoreboard; full float treatment in number-formats lesson; batching lesson for why weight-only fades; kernels lessons for why naive dequant is slower; stats lesson for whether a 2-point drop is real. -> one sentence.

## Flow

1. Problem: the 17 ceiling re-explained, the obvious quantizer, perplexity explained, the 79 million wreck, the per-group rescue, the three questions. B voices "bit count decides quality".
2. Origin as story: phones, then the 175B models, LLM.int8() and GPTQ, llama.cpp.
3. Ruler, then scale and zero-point with the figure 001 example worked aloud, error half a step, zero exact, symmetric, RTN.
4. Predict on the outlier row (B guesses low), reveal, then who shares a scale, the figure, why rows, overhead arithmetic, the real-matrix numbers, the interactive figure.
5. Activations: B says "clip the noise", A corrects; numbers; LLM.int8() and SmoothQuant with a worked divide/multiply example; consolidate the outlier fixes (E2).
6. W vs A: re-explain decode vs prefill; B says "quantized = faster everywhere"; figure 004; decode/prefill/batching; Predict; single-user vs fleet (E3) and batch scaling (E4).
7. Floats: B says "more exponent bits = more precision", A corrects with bf16 tie-in; FP8 flavours; FP4 values; MX vs NV; figure; Spark cautions.
8. GPTQ and AWQ; GGUF and k-quants.
9. What you lose: table, B's "perplexity barely moved" (E5), KL with "distribution" made precise, flips, tasks, long context, honest report.
10. Unpacking cost, Marlin, kernel suspicion.
11. Build It (Mac then Spark), Measure (predictions, what you'd see and why), Break It as four what-ifs.
12. Connections sentence, then B restates core idea, A sharpens: which numbers share a scale, bytes vs math. Stop.
