# Outline: number-formats

Source: src/lessons/number-formats.mdx. Curriculum entry: "fp32, bf16, fp16, fp8." Question: how are
decimal numbers stored in bits, and why did everyone switch to bf16? Why: precision vs range decides
whether training is stable.

Diagnostic gap hit head on: "bf16 vs fp16 (had it backwards)". His quoted answer: "BF16 has smaller
precision, like the points after the decimal are less than FP16." B voices exactly that, plus the
natural backwards conclusion (so fp16 is the better, safer one and bf16 the cheap blurry one), and A
corrects it: precision is relative, not decimal places; bf16 gives up precision to buy range, and
range is what keeps training alive. Also touches the general "numbers" gap (bytes per parameter).

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereq "2 bytes per parameter" from the memory-math lesson. -> A re-explains in one line where bf16 first comes up (a model's weights in bf16 take two bytes each).
- T2 Today bullets. -> Not read; the opening problem does the job.

## The Problem

- P1 Diagnostic answer quoted; half right (bf16 is less precise); "points after the decimal" is the wrong picture; missing half (range) is why bf16 won. -> B says it as their own gut, plus "so fp16 is the better one"; A: half right, other half is the whole story.
- P2 Scene: fine-tuning script works in fp32, flip to fp16 for memory/speed, few hundred steps then loss prints NaN forever; or sneakier, loss stops going down because most gradients became exactly zero. Flip to bf16, trains fine, no extra code. Same 16 bits, same speed; how the bits are split decides. -> A tells it as a scene.
- P3 Three fields and one formula. -> A, signpost.

## Origin

- O1 Before 1985 every maker had its own float: IBM base 16, Cray division via reciprocal approximation (x/y off in last bit), VAX own formats; same program, two answers. -> A, story.
- O2 William Kahan, Berkeley, collected horrors; late 1970s Intel hired him for the 8087 coprocessor; pushed design through IEEE committee; IEEE 754 in 1985 fixed bit layouts, rounding rule, edges (infinity, NaN, tiny numbers near zero). Turing Award 1989. Every CPU/GPU follows it. -> A.
- O3 Deep learning wanted narrower numbers (less memory, faster math). IEEE fp16 standardised 2008; NVIDIA Volta 2017 ran it on tensor cores (term: dedicated matrix-multiply units, small tiles of low-precision inputs, far faster). Worked only with loss scaling. Google Brain chose a different split for TPUs: keep fp32's exponent, chop the mantissa: bfloat16, "brain floating point". NVIDIA added bf16 with A100 in 2020; within a couple of years almost everyone switched. -> A.

## The Idea: scientific notation

- I1 Scientific notation: Avogadro 6.02 x 10^23, electron mass 9.11 x 10^-31 kg; sign, significant digits, exponent. -> A, spoken.
- I2 Exponent decides how big (range), digits decide how precise; three significant digits is one part in a thousand at any size. Precision is relative, not decimal places. -> A; this is the first correction of B's model.
- I3 Float = scientific notation in base 2, three fields: sign bit (0 positive, 1 negative), exponent (range; more bits, bigger biggest and smaller smallest), mantissa (precision; officially significand, which strictly includes hidden 1). Term: binary point "floats". -> A.
- F1 Figure 001: decimal notation split into sign/digits/exponent; fp32 bits of -2.5: sign 1, exponent field 128 minus bias 127 = power 1, mantissa .01 so significand 1.01 binary = 1.25; -1.25 x 2 = -2.5; hex C0200000. -> A describes as a row of 32 boxes, then folds into decode walkthrough.

## Decoding by hand

- D1 Sign: negative, 1. -> A.
- D2 2.5 = 2 + 0.5 = "one zero point one" in binary (the 1 after the point is the halves place). -> A.
- D3 Normalise to 1.01 x 2^1; every nonzero number is 1.something x 2^something, so leading 1 isn't stored: hidden bit, a free extra bit of precision. -> A; B question on why not store it.
- D4 Mantissa stores "01" then zeros to 23 bits. -> A.
- D5 Exponent stored with bias 127 (fp32 and bf16), 15 for fp16; field holds 128 = 1 then seven zeros. Bias exists so stored field is never negative. -> A; B asks why add 127.
- D6 Assembled pattern; hex C0200000. -> A, briefly ("C zero two followed by five zeros").
- D7 The one formula: value = sign x 1.mantissa x 2 to the (field minus bias). -> A in words, no symbols.
- D8 Reserved exponents: all zeros = tiny or zero; all ones = infinity if mantissa 0, else NaN (term: result of undefined op like inf minus inf, 0 x inf; contagious; not even equal to itself). -> A.

## The formats

- FM1 Every format is the same recipe with different field widths. -> A.
- F2 Figure 002 + table: fp32 1/8/23, max 3.4e38, min normal 1.2e-38, eps 1.2e-7, ~7 digits. fp16 1/5/10, 65,504, 6.1e-5, eps ~0.001, ~3 digits. bf16 1/8/7, 3.4e38, 1.2e-38, eps 0.0078, ~2 digits. tf32 1/8/10, fp32 range, eps 0.001, ~3. E4M3 1/4/3, 448, 0.0156, eps 0.125, ~1. E5M2 1/5/2, 57,344, 6.1e-5, eps 0.25, under 1. -> A says the three main ones carefully with comparisons; fp8 numbers said once later. No table reading: grouped by "blue part is range, white part is precision".
- FM2 Machine epsilon: gap between 1 and next number up, 2 to the minus mantissa bits; each rounding off by up to half of it relative to size. -> A, term in plain words.
- FM3 Decimal digits = epsilon translated: 24 bits of significand (23 + hidden) ~7.2 digits, fp16 11 bits ~3.3, bf16 8 bits ~2.4. -> A.
- FM4 Corrected diagnostic: fp16 more precision, less range (3 digits, nothing above 65,504, nothing normal below ~0.00006). bf16 less precision, same range as fp32 (2 digits, can't tell 256 from 257, reaches 3.4e38 and 1e-38). -> A, the clear correction; B restates the flip.
- FM5 bf16 is literally the top half of fp32: same sign, 8 exponent bits, first 7 mantissa bits; converting is (nearly) dropping the bottom 16 bits; cheap to adopt, every fp32 lands somewhere sensible, just blurrier. -> A.
- FM6 Relative precision example: bf16 stores 3.140625 for 3.14159, 3,136 for 3,141.59, 0.0003147 for 0.000314159; each off by less than 0.2%; round-to-nearest guarantees under 0.4% (half epsilon) at any size. Fixed significant digits, not decimal places. -> A, said with spoken numbers.
- FM7 tf32: not a storage format; NVIDIA tensor-core format since Ampere (A100, 2020), fp32 exponent + fp16 10-bit mantissa, 19 bits. Tensors stay fp32 in memory; inputs rounded inside the matmul unit, products added in fp32; much of 16-bit speed, fp32 range, no code changes. Off by default for matmuls in PyTorch; set float32 matmul precision to "high" turns it on (check docs, flags moved). -> A; B asks "so I never see a tf32 tensor".
- FM8 fp8 two flavours: E4M3 precise (max 448) for weights and activations; E5M2 wide (max 57,344) for gradients which swing across many orders of magnitude. Quantization lesson covers inference. -> A.
- PR1 Predict: which stores 0.1 closer, how far off; 256 + 1 in bf16? Answer: fp16 closer, 0.0999755859375 (off 2.4e-5, 0.02%); bf16 0.10009765625 (off ~1e-4, 0.1%); 3 extra bits = 8x finer. 256+1 = 256: between 256 and 512, 128 values, 2 apart; 257 halfway, tie goes to even (mantissa ending 0) = 256. fp16 same at 2048+1, fp32 at 16,777,216+1. Checked in PyTorch. -> A asks, B guesses (gets 0.1 right; guesses 257 or 258 for the second), A reveals.

## Bit flipper (Figure 003, interactive)

- F3 Click any bit to flip; switch formats and current value is rounded in; number line shows representable neighbours. Try: press 1, flip second exponent bit: bf16 lands at 2^-64, fp16 at 2^-8. Max in fp16 then +1 step (inf). Min normal then -1 step a few times: exponent field goes to zero, subnormals, gap stops shrinking. Type 0.1, compare "exactly" line. Relative gap roughly constant, gap to next changes a lot. -> A describes what you'd see as you click.

## The gaps grow

- G1 Between neighbouring powers of two, same number of values, 2^(mantissa bits): bf16 128 between 1 and 2, and 128 between 1,024 and 2,048, spread 1,024x wider. Term binade; evenly spaced inside. -> A.
- G2 ULP: gap to next neighbour, doubles at each power of two. -> A.
- F4 Figure 004: log-log staircase at 45 degrees; bf16 sits 8x above fp16 but runs across whole range like fp32; fp16 stops at 2^16 (inf past 65,504), at small end flattens into subnormals and hits zero below 2^-24. -> A describes the staircase over the phone.
- G3 Big plus small loses small: if gap around a is bigger than twice b, a + b = a. bf16 1.0 + 0.001 = 1.0 (gap 0.0078). Weight 1.0, update lr x grad 0.001 vanishes; a million times, never moves. Stagnation term. Reason for fp32 copy of weights. -> A; B surprised.
- G4 Long sums stall: 0.01 added 1,000 times in bf16 gives 4.0 (true 10); at 4 the gap is 0.03, more than twice 0.01. fp16, 10,000 times (true 100), stalled at 32. Any reduction; why hardware accumulates in fp32. -> A; B guesses.
- G5 Order matters: addition not associative, each plus rounds; GPU parallel sums change order run to run, so last bits of loss change between identical runs. Not a bug. -> A; B connects to his own experience.

## Subnormals

- S1 Below smallest normal (6.1e-5 in fp16), hidden 1 would have to go; exponent field all zeros, value 0.mantissa x 2^(1 - bias), no hidden 1. Gap fixed at smallest step (flat stretch), gradual fade to zero. Smallest fp16 subnormal 2^-24 ~ 6e-8; below half of that rounds to 0 = underflow (term). Also called denormals. -> A.
- S2 Kahan fought for gradual underflow; controversial because slow on some hardware (CPU microcode path, many times slower; GPUs flush-to-zero mode). In fp16 training, small gradients live there. Remember 6e-8. -> A.

## Rounding

- R1 0.1 in binary repeats forever (like 1/3 in decimal); nearest value stored. Round to nearest, ties to even (closest; if halfway, last mantissa bit 0; avoids upward drift). Every operation exact then rounded; off at most half an ULP; IEEE promise; predictable not exact. -> A.
- R2 Python float64: 0.1 + 0.2 = 0.30000000000000004; three roundings, errors didn't cancel. In fp32, 0.1 + 0.2 == 0.3 is True (errors cancel). Equality asks about rounding luck; compare with tolerance (math.isclose, torch.allclose). -> A; B has seen the 0.3000...04 thing.
- R3 Flipper: 0.1 in fp32 is exactly 0.100000001490116119384765625; that's what your model sees. -> A.

## Catastrophic cancellation

- C1 Subtracting nearly equal numbers; shared leading digits cancel, what's left is mostly rounding error. -> A.
- C2 x*x - 1 at x = 1.0001 in fp32: true 0.00020001, fp32 0.00020003319; fifth significant digit wrong from a 7-digit format; x*x rounded with ~1e-7 error, harmless next to 1, 0.01% next to 0.0002. In bf16, 1.0001 rounds to 1.0, answer 0. -> A.
- C3 Variance E[x^2] - E[x]^2 subtracts big near-equal numbers when mean large vs spread; can go negative, sqrt gives NaN; normalization layers compute stats in fp32 with careful formulas; autocast does it for you. -> A; B links to layer norm.

## Overflow

- OV1 fp16 runs out at 65,504; bigger becomes infinity (overflow). exp(11) = 59,874 fits; exp(12) = 162,755 inf. 300 x 300 inf. Loss sum over 40,000 tokens at ~4.0 = 160,000 inf. -> A; B guesses 300 x 300.
- OV2 inf to NaN: inf - inf, inf / inf, 0 x inf. NaN contagious: one NaN gradient -> optimizer -> weights -> next forward NaN everywhere. All-reduce (term: every GPU contributes, every GPU gets sum) spreads one GPU's NaN to all in one step. -> A.
- OV3 Naive softmax on logits 10, 11, 12 in fp16: exp 22,032, 59,872, inf; result 0, 0, NaN. -> A, spoken.
- OV4 Fix: subtract the max; shift cancels top and bottom; largest exp is exp(0) = 1. Every real softmax does it; FlashAttention online softmax is same trick block by block. Logsumexp: max + log sum exp(x - max), inside every cross-entropy loss. -> A.
- OV5 Max trick only protects softmax; attention logits q times k (128-long dot product) can overflow first. Entries ~50 -> products ~2,500, sum of 128 can exceed 65,504. Measured: 3 of 64 logits inf, row softmax all NaN (inf - inf). 1/sqrt(d) applied after multiply in many implementations. QK-norm (normalize q and k before dot product, caps logits). bf16: fine, just blurry. -> A; B objects "but you just fixed softmax".

## Training in 16 bits: underflow

- U1 Forward mostly moderate; with max trick fp16 copes. Trouble is backward. -> A, signpost.
- U2 Gradients small: cross-entropy averaged over B x T tokens gives 1/(B x T) factor; chain rule multiplies by things often below 1, layer after layer; plenty between 1e-8 and 1e-5. fp16: below 6e-8 zero, below 6e-5 subnormal with few bits. -> A, with a worked example of B x T.
- U3 Measured table: 1e-5 fine in both; 1e-6 fp16 subnormal 1.3% off, bf16 fine; 1e-7 fp16 19% off; 3e-8 fp16 2x off (5.96e-8); 1e-8 fp16 zero; bf16 within a fraction of a percent throughout. bf16 coarse always 2-3 digits but never runs out of exponent; fp16 precise middle, falls apart at bottom. -> A walks down the gradient sizes, not reading a table.
- U4 2017 "Mixed Precision Training" (Micikevicius et al, NVIDIA and Baidu): plotted real gradients, large share below fp16 range, top of range unused. -> A.

## Loss scaling

- L1 Multiply loss by S (e.g. 65,536) before backward; chain rule makes every gradient S times bigger; shifts distribution up 16 binades into empty top; divide by S in fp32 before optimizer. -> A; B "that's... it?".
- L2 S too small still underflow; too big overflow; right S changes during training. -> A.
- L3 Dynamic loss scaler: start at 2^16 = 65,536; after backward check every gradient for inf/NaN; if any, skip optimizer step and halve; after 2,000 clean steps (growth interval), double. Finds and keeps finding largest safe scale. -> A.
- L4 PyTorch: four lines; GradScaler; autocast; scale the loss and backward; scaler step (unscale, check, maybe skip); scaler update (grow or shrink). "cuda" or "mps" on the Mac. -> A, described by what each does, no code read.
- L5 Worked 2017 to ~2020 on V100s; moving part: skipped steps, scales collapsing after a bad batch, gradient clipping interaction (must unscale before clipping), one more thing per custom loop. -> A.

## Why bf16 made it simple

- W1 bf16 range = fp32's; smallest normal 1.2e-38; gradient 1e-8 is thirty orders of magnitude away; nothing underflows; nothing overflows short of 3.4e38 (logits, loss sums fine). Delete the scaler. -> A; this is the payoff of B's backwards model.
- W2 Pays precision: ~2.4 vs 3.3 digits. Training barely cares as long as precision kept where it matters; mini-batch gradient already noisy, off by far more than 0.4%; rounding noise lost in sampling noise. Range failures aren't noise: one inf ends the run. -> A; B pushes back "but less precise is worse".
- W3 Answer to "why everyone switched": not more precise (less), but can't overflow or underflow in practice; no scaler, no babysitting. TPUs from start, NVIDIA from A100. -> A.

## Mixed precision

- M1 Mixed precision training term; "bf16 training" never means everything in bf16. -> A.
- F5 Figure 005 loop: fp32 master weights (4 bytes/param, copy of record) -> cast -> forward (bf16 in, fp32 accumulate) -> loss (softmax, norms, loss fp32) -> backward (bf16 in, fp32 accumulate) -> grads to fp32 (fp16 only: divide by S, inf? skip, halve S) -> optimizer fp32 Adam m, v, update in fp32 -> back to master. Dashed: times S before backward for fp16. Kept fp32: weights of record, Adam state, sums inside matmuls, softmax, norms, loss. bf16: matmul inputs, weights copy, activations, most gradients. -> A walks the loop around the circle.
- M2 fp32 master weights because of stagnation: update 1e-4 to weight 0.5 vanishes in bf16 (gap 0.004), survives in fp32 (gap 6e-8); optimizer updates fp32 copy, fresh bf16 copy each step; tiny updates add up and eventually change bf16 copy. -> A.
- M3 bf16 compute: matmuls are nearly all the time; tensor cores run 16-bit much faster (bf16 dense many times fp32 on recent NVIDIA; check spec); half bytes, half memory traffic for activations. -> A.
- M4 fp32 accumulation inside matmuls: thousands of products; bf16 sum would stall like the 0.01 sum; running sum fp32, round final to bf16; invisible. -> A.
- M5 Autocast: per-op precision list; matmuls and convs bf16; softmax, log softmax, layer norm, exp, sums, losses fp32. That list is the cancellation and overflow sections turned into code. -> A.
- M6 Adam state fp32: m (average gradient), v (average squared gradient). 1e-5 squared = 1e-10, zero in fp16; epsilon default 1e-8 zero in fp16; zero over zero NaN. bf16: v doesn't underflow but 2 digits make averages coarse, update stagnates. So fp32. 8 bytes per param + 4 master = most of why training needs more memory than inference (training-memory lesson). -> A.
- M7 PyTorch autocast: parameters stay fp32, cast on the fly, master copy is just the parameters. Megatron, DeepSpeed, FSDP mixed precision: bf16 copy for compute, fp32 master inside optimizer. Same idea. -> A.

## Stochastic rounding

- SR1 Round up with probability equal to how far toward the upper neighbour (30% of the way: up 30%, down 70%); single rounding worse, average exact. Update of a tenth of a gap moves the weight a full gap 10% of the time. Lets weights be stored in bf16 alone, saving fp32 master. Some accelerators in hardware, some optimizer libraries in software; not default in mainstream PyTorch. -> A.

## FP8 training

- E1 fp8 for matmuls; 4-5 exponent bits not enough range; bring back scaling per tensor: amax (largest absolute value), multiply by 448/amax so biggest value lands just under E4M3 max, cast, remember scale. E4M3 forward weights and activations, E5M2 backward gradients. -> A, with a worked example (amax 4 -> scale 112).
- E2 Transformer Engine (NVIDIA library, Hopper and later, wraps linear layers, fp8 casting, per-tensor scaling, amax tracking). Delayed scaling: scale from short history of amax from previous steps, no extra pass. Newer: DeepSeek-V3 late 2024, scales per small block; Blackwell block-scaled fp8 in hardware. Master weights, optimizer state, sensitive ops stay higher precision. Same story one more turn of the crank: fewer bits, manage range by hand again. -> A.
- PR2 Predict: Adam (almost) scale-invariant; shrink loss by 0.001; fp32 same. What do bf16, fp16 no scaler, fp16 + scaler do? Answer (M4 Pro, MPS, 600 steps): fp32, bf16, fp16+scaler ~1.67-1.68; fp16 no scaler: 46% gradients exactly zero at step 0, loss 6.9 at step 600, worse than start 4.3. Shrink 1e-4: 99% zero, loss 34. bf16 doesn't care (range to 1e-38); scaler 65,536 x 0.001 = 65.5 puts gradients back above unshrunk level. Without shrink fp16 no scaler trains fine on small model; small models modest batches often don't underflow much; shrink stands in for bigger models. -> A asks, B guesses, reveal. Also scale-invariant explained in plain words.

## Build It

- B0 Setup: folder, venv, torch numpy matplotlib, tiny Shakespeare (about 1.1 MB); on Spark install NVIDIA's recommended ARM64 CUDA PyTorch (check docs). -> One sentence.
- B1 Decoder from scratch: integer bit ops only, no struct/numpy; Fmt with exp bits, man bits, bias; decode returns sign, field, mantissa, kind, value; show pretty-prints. Hints: shifts and masks; specials first (all zeros: no hidden 1, power is 1 minus bias not 0 minus bias; all ones inf/NaN); normal formula. Test vs struct/numpy/torch true patterns; check 1.0, -2.5, 0.1, 65504 fp16, smallest fp16 subnormal, fp16 inf and NaN patterns, bf16 3.14159. -> A: what you build, the part that matters (the subnormal power being one minus bias), what you'd see.
- B2 Enumerate all 65,536 patterns for fp16 and bf16; count kinds; check every finite value vs torch; sort positive finite, gaps, log-log plot; gaps above 1, 1000, 60000. Predict counts first (only all-ones exponent holds inf/NaN; inf is two patterns). Plot should look like the staircase figure; if fp16 doesn't go flat at bottom, subnormal case wrong. -> A.
- B3 Overflow three ways: naive vs stable softmax on 10, 11, 12 in each dtype; attention logits q, k randn(8,128) x s for s 10, 30, 50, 100: count infs, NaN rows, where it starts, does dividing by sqrt 128 after save it, does dividing q before; loss sum 40,000 x 4.0 in fp16/fp32/bf16, then mean in fp16: why mean survives (what PyTorch accumulates in). -> A, as three "you'd see" demos.
- B4 Tiny char-level GPT boilerplate, attention by hand so numerics are visible and breakable; about 0.8M parameters. -> A, one or two sentences.
- B5 Train four ways: one flag for mode, one for shrink; same seed and data order; AdamW lr 3e-3 batch 32 context 64; log loss, zero-grad fraction, NaN/inf, scale every 20 steps. Hints: separate generators for model and batches; autocast around forward and loss, loss on float logits; shrink = backward on loss x shrink, log unshrunk; GradScaler with enabled flag for one code path; zero-grad fraction in fp32 a fraction of a percent (embedding rows for absent characters); mps on Mac, cuda on Spark, cpu fallback. -> A, the core build.
- B6 Spark: same curves shape, numbers differ (kernels round differently). Matmul speed 4096 x 4096 in fp32 highest, tf32 high, fp16, bf16; warm up, synchronize before reading clock, average, TFLOP/s = 2n^3 operations; agent review of timing; compare spec sheet. -> A.
- B7 Done when: decoder matches all 65,536 patterns both formats and gap plot; seen inf/NaN in softmax, logits, loss sum and fixed softmax; loss curves four modes with/without shrink plus zero-grad fraction; explain from plots why bf16 needs no scaler. -> Folded into A's description, not read as a list.

## Measure

- MS1 Write predictions first. Reference (M4 Pro, PyTorch 2.14, MPS, 600 steps): shrink 1: 1.66 / 1.67 / 1.68 / 1.68. Shrink 1e-3: 1.68 / 6.94 / 1.68 / 1.67. Zero-grad step 0 shrink 1e-3: 0.13% / 46% / 0.13% / 0.13%. Shrink 1e-4: 1.70 / 34.3 / 1.71 / 1.71. -> A says them as a story, not a table.
- MS2 Without shrink everything trains; 0.8M model gradients mostly above 6e-8; honest result; underflow grows with model size, depth, batch size; curves on top of each other, small differences rounding noise. -> A.
- MS3 With shrink fp16 no scaler dies: shrinking by 1,000 moves gradients down ~10 binades; almost half below smallest subnormal; AdamW pushes not downhill; loss rises above start. Scaler puts them back; bf16 matches with no help, 1e-9 nowhere near edge. -> A.
- MS4 fp32 shifted a little at 1e-4 (1.70 vs 1.66): likely Adam's epsilon no longer negligible vs tiny gradients, not precision; scale-invariant was an approximation. -> A; B catches that fp32 moved.
- MS5 Enumeration: fp16 63,488 finite, 2 inf, 2,046 NaN (2 signs x 1,023); bf16 65,280 finite, 2 inf, 254 NaN. Gaps above 1: fp16 0.000977, bf16 0.0078; above 1,000: 0.5 vs 4; above 60,000: 32 vs 256. -> A, with the "why 1,023" reasoning.
- MS6 Spark matmul: bf16 and fp16 well above fp32, tf32 between; ratios chip-dependent; compare NVIDIA's GB10 numbers; headline figures often with sparsity, which a dense matmul doesn't get. -> A.

## Break It

- BK1 Whole model fp16 (model.half): weights, grads, Adam state fp16; NaN by step 100; Adam epsilon 1e-8 rounds to 0, squared-gradient average underflows, divide by zero. Epsilon 1e-4 lives longer: stalled ~2.86 then NaN by step 300. Every piece of "keep optimizer fp32". -> "what if" exchange.
- BK2 Whole model bf16 with small lr: keeps running (range), weights bf16 so small updates stagnate. lr 3e-3: 1.69 vs 1.68 autocast. lr 3e-4: 2.31 pure vs 2.16 autocast. Smaller updates relative to weights, more round away. What master weights / stochastic rounding are for. -> exchange; B predicts it might blow up, A: no, it stalls.
- BK3 Remove 1/sqrt(d) and multiply embedding output by 20; fp16 with scaler: scale keeps halving (each halving a skipped step) because overflow is in forward, which loss scaling can't fix. Same model in bf16: may train badly (peaky softmax) but no inf. -> exchange.
- BK4 Compare floats with ==: decoder returns Python float (fp64) holding exact fp32 value 0.100000001490116..., so == 0.1 is False; 0.1 + 0.2 == 0.3 false in fp64, true in float32; explain each in a sentence. -> exchange.

## Explain It Back (content must appear)

- X1 fp16 vs bf16 and why bf16: bit splits, digits, ranges (6e-5 to 65,504, 6e-8 with subnormals; 1e-38 to 3.4e38), top half of fp32; fp16 failures are range failures; forced loss scaling; bf16 no range problem, precision loss lost in noise if master weights, optimizer state, sums fp32. -> Ending exchange B restates, A sharpens; plus body.
- X2 Precision depends on size: fixed significant bits; same count per power of two; gap doubles; relative constant, absolute worse; stagnation, sums stall (4.0), cancellation, non-associativity. -> Body (gaps section) plus a short recap moment.
- X3 Mixed precision walkthrough. -> Body (mixed precision loop).
- X4 Dynamic loss scaler, why skip steps; scale that keeps collapsing means forward overflow scaling can't fix. -> Body (loss scaling, Break It 3).
- X5 Scaling to a thousand GPUs and 100B: more sums (longer dot products, bigger batches, all-reduce) need fp32 accumulation or careful bf16 with fp32 at end; activations and logits grow, overflow risks (QK-norm, z-loss on logits, careful init); rare events common, one NaN spreads via all-reduce in a step, need detection, skipping, rollback to checkpoint; fp8 pressure grows (twice matmul throughput, half memory traffic), brings back per-tensor/per-block scaling handled by Transformer Engine. -> Dedicated exchange before the ending; B asks "how does this change at scale".

## Go Deeper / Connections

- GD1 Goldberg "What Every Computer Scientist Should Know About Floating-Point Arithmetic" and Micikevicius "Mixed Precision Training" gradient histogram. -> One closing sentence.
- CN1 Explains memory-math's 2 bytes per param; float half of quantization (fp8, fp4); max trick seeds FlashAttention online softmax; next: training memory (2 bytes to serve, about 16 to train); tiny LM and distributed training where all-reduce precision matters. -> One or two sentences near the end.

## Flow

1. Problem: A opens on the scene (fp16 NaN / silent zeros; bf16 fine). B voices the diagnostic answer
   and "so fp16 should be the safer one". A: half right, the other half is the story. Origin.
2. Scientific notation -> relative precision (first hit at B's "decimal places") -> three fields ->
   decode minus two point five -> formula -> reserved exponents.
3. Formats: fp32, fp16, bf16 numbers; epsilon; digits; the corrected diagnostic stated plainly, B
   restates the flip; top half of fp32; relative precision example; tf32; fp8. Predict 0.1 and 256+1.
4. Flipper, gaps grow, binade, ULP, staircase; three consequences.
5. Subnormals, rounding, 0.1 + 0.2, cancellation, overflow, softmax max trick, attention logits.
6. Training: underflow of gradients, the measured ladder, 2017 paper, loss scaling, dynamic scaler,
   why bf16 made it simple (payoff of B's backwards model).
7. Mixed precision loop, each piece; stochastic rounding; fp8 training; Predict shrink.
8. Build It, Measure, Break It as "what you'd see" exchanges.
9. Scale question (X5). Connections and Go Deeper in a sentence each. Ending: B restates, A sharpens.
