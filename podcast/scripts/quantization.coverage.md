# Coverage: quantization

Lesson src/lessons/quantization.mdx (and figure QuantGrid) vs podcast/scripts/quantization.md.
Item IDs match podcast/outlines/quantization.md. Numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 bytes/bandwidth ceiling re-explained | Problem | "sixteen into two hundred seventy-three, and you get about seventeen" | covered |
| T2 decode memory-bound, prefill compute-bound | Weights only | "Decode is making tokens one at a time... Prefill is reading the prompt" | covered |
| T3 bench.py and scoreboard | Build It: Spark | "your bench script from the baseline already talks to" | covered |
| T4 an evening each | Build It | "That's an evening... That's another evening." | covered |
| P1 17 tok/s ceiling; 4 bits about 55 | Problem | "something like fifty-five tokens a second" | covered |
| P2 obvious quantizer, -8 to 7 | Problem | "biggest value lands on seven... integers from minus eight to seven" | covered |
| P3 perplexity defined, 14 = 14 equal choices | Problem | "picking between fourteen equally likely tokens" | covered |
| P4 14.4 to 79 million; RNG with opinions | Problem | "Seventy-nine million... random number generator with opinions" | covered |
| P5 group 128: 20.0; zero-point 17.2; Q4_K_M | Problem | "Perplexity: twenty... seventeen point two... Q four K M" | covered |
| P6 three questions; bit count not the point | Problem | "Which numbers share a scale. Which numbers you quantize at all. And how you round." | covered |
| O1 Google, Jacob, phones, paper title, TFLite, PyTorch | Origin | "Benoit Jacob and colleagues... TensorFlow Lite, and later in PyTorch" | covered |
| O2 OPT-175B, BLOOM-176B, about 350 GB | Origin | "about three hundred fifty gigabytes" | covered |
| O3 LLM.int8() outlier features | Origin | "he called them outlier features" | covered |
| O4 GPTQ, 3-4 bits, four GPU-hours, one GPU | Origin | "in about four GPU-hours, on a single GPU" | covered |
| O5 llama.cpp 4-bit on laptops, "which quant?" | Origin | "\"which quant?\" became the first question" | covered |
| I1 ruler, 14 not 14.3, half a centimetre | Ruler | "Fourteen centimetres, not fourteen point three" | covered |
| I2 quantization; 65,000 vs 16 values | Ruler | "about sixty-five thousand values... exactly sixteen" | covered |
| I3 dequantization, on the fly in kernel | Ruler | "That step's called dequantization" | covered |
| I4 marks too far / too close | Ruler | "the biggest weights fall off the end of the ruler" | covered |
| I5 uniform quantizer | Scale | "That's called a uniform quantizer" | covered |
| I6 scale | Scale | "The scale is the step between marks" | covered |
| I7 zero-point, off-centre range | Scale | "the zero-point is which integer means zero" / "your values might not be centred" | covered |
| I8 formula as worked example | Scale | "One and a half spread over fifteen gaps, the step is one tenth" | covered |
| I9 clamp | Scale | "you clamp it. Anything below the bottom becomes the bottom" | covered |
| I10 affine / asymmetric | Scale | "Affine just means multiply, then shift. People also call it asymmetric." | covered |
| I11 Figure 001: step 0.1, z=6, 0.33 to 9 to 0.30 | Scale | "You store nine... you get back point three zero" + drawing description | covered |
| I12 half-step max; about 0.29 step typical; 16x from 8 to 4 | Scale | "about three tenths of a step... roughly sixteen times bigger" | covered |
| I13 zero exact; padding, ReLU, masks | Scale | "zero is exact... Padding. The outputs of a ReLU... Masked entries." | covered |
| I14 symmetric; -7..7; GPTQ/AWQ/k-quants zero-point | Scale | "That's symmetric quantization... keep a zero-point, or a \"minimum\" offset" | covered |
| I15 RTN | Scale | "Round-to-nearest. R T N. It's what I did to Qwen." | covered |
| I16 Predict question | Predict | "Roughly what fraction of the weights get rounded to exactly zero?" | covered (B guesses ten to twenty percent) |
| I17 0.071, 0.036, 1.8 sd, 93%; real 88%, 78%, 21 sd | Predict | "about ninety-three percent... Eighty-eight percent... seventy-eight percent" | covered |
| I18 how many share a scale is the key choice | Who shares | "It's how many weights share each scale" | covered |
| I19 per-tensor | Who shares | "Per-tensor: one scale for the entire weight matrix" | covered |
| I20 per-channel, 4,096 scales | Who shares | "four thousand ninety-six by four thousand ninety-six matrix gets four thousand ninety-six scales" | covered |
| I21 per-group 128, 131,072 scales | Who shares | "a hundred thirty-one thousand scales" | covered |
| I22 Figure 002: 16.8M / 4,096 / 128 hurt | Who shares | "hurts sixteen point eight million weights" | covered (bits-overhead labels carried by I24) |
| I23 why rows: scale out of the sum | Who shares | "you can pull the scale out of the sum" | covered |
| I24 4.125 bits; zero-point 4/128; scales count in bytes | Who shares | "four and an eighth bits per weight... another thirty-second of a bit" | covered |
| I25 real matrix error table | Real matrix | "seventy-eight percent... fifteen percent... about twelve... about ten" | covered (int8 summarized: about five, under one, about seven tenths) |
| I26 QuantGrid walkthrough, all six steps | Real matrix | "error's around thirteen percent... about seventy percent... about twenty-nine percent... about seventeen-fold... affine button" | covered |
| I27 weights 21 sd, groups handle it | Activations | "about twenty-one standard deviations out" | covered |
| I28 activations defined | Activations | "Activations are the numbers flowing between layers" | covered |
| I29 0.04 vs 1,631 at channel 813; 37,000x | Activations | "channel eight hundred thirteen hit one thousand six hundred thirty-one... Thirty-seven thousand times the median" | covered |
| I30 outlier features; cutoff 6; 6.7B; not noise | Activations | "around six point seven billion parameters... They're not noise" (B's clip-it model corrected) | covered |
| I31 14.45 / 14.73 / 76.6 | Activations | "fourteen point seven three... seventy-six point six" | covered |
| I32 per-channel activation scale lands inside the sum | Activations | "a per-channel activation scale lands inside the sum" | covered |
| I33 LLM.int8(): split, 99.9%, slower small batch | Activations | "ninety-nine point nine percent go through in eight-bit... a memory saver, not a speed-up" | covered |
| I34 SmoothQuant, exact rescale, alpha about 0.5, folded | Activations | "Divide that channel by ten... knob set around a half... folded into the previous layer's weights" | covered |
| I35 W/A naming | Weights only | "W for weights, A for activations" | covered |
| I36 W4A16 / W8A16 weight-only | Weights only | "Those are weight-only" | covered |
| I37 tensor cores | Weights only | "Tensor cores are the GPU's dedicated matrix-multiply units" | covered |
| I38 W8A8, W4A4/FP4, 2x per halving | Weights only | "roughly twice the operations per second each time you halve the width" | covered |
| I39 decode memory-bound, prefill compute-bound | Weights only | "it's memory-bound... it's compute-bound" | covered |
| I40 Figure 004 | Weights only | "Picture two assembly lines" | covered |
| I41 decode bytes everything | Weights only | "So for decode, bytes are everything" (B's "faster everywhere" corrected) | covered |
| I42 prefill math everything | Weights only | "For prefill, math is everything" | covered |
| I43 batching; fleets FP8, local 4-bit | Weights only | "Weight-only quantization is a small-batch win" | covered |
| I44 Predict question | Predict 4-bit vs FP8 | "Which one has the higher decode ceiling?" | covered |
| I45 4.7 vs 8 GB; 58 vs 34; prefill FP8 | Predict 4-bit vs FP8 | "about fifty-eight tokens a second versus about thirty-four" | covered |
| I46 exponent vs mantissa; float grid; bf16 tie-in | Floats | "Exponent bits buy range... Mantissa bits buy precision" (B's wrong model corrected) | covered |
| I47 FP8 E4M3 448 / E5M2 57,344; paper; Hopper/Ada | Floats | "four hundred forty-eight... fifty-seven thousand three hundred forty-four" | covered |
| I48 FP8 still needs a scale | Floats | "You still keep a scale" | covered |
| I49 FP4 E2M1 values | Floats | "Zero, a half, one, one and a half, two, three, four, six" | covered |
| I50 MXFP4: 32, power-of-two scale, 4.25, gpt-oss | Floats | "About four and a quarter bits... G P T O S S" | covered |
| I51 NVFP4: 16, FP8 scale, fp32 tensor scale, 4.5 | Floats | "Blocks of sixteen... about four and a half bits" | covered |
| I52 Figure 005 bit layouts, maxima, GPU generations, FP4 vs INT4 grid | Floats | "topping out at a hundred twenty-seven and at seven... B F sixteen since Ampere" | covered |
| I53 Spark: GB10 Blackwell, FP4, petaFLOP, sm_121, kernels, playbooks | Spark | "S M one twenty-one if I have it right" | covered |
| I54 FP4 vs INT4 same decode ceiling | Spark | "F P four and int four weight-only end up in the same place" | covered |
| I55 compensate with neighbours | GPTQ/AWQ | "round a neighbour down to compensate" | covered |
| I56 calibration data, 128 sequences | GPTQ/AWQ | "typically a hundred twenty-eight sequences of a few thousand tokens" | covered |
| I57 GPTQ column-at-a-time, Hessian, OBS, one-shot | GPTQ/AWQ | "Optimal Brain Surgeon... No gradient descent, no retraining" | covered |
| I58 AWQ 1%, salient, reverse SmoothQuant, grid search; g128 zero-point; vLLM | GPTQ/AWQ | "around one percent... SmoothQuant trick in reverse" | covered |
| I59 RTN fine at 8 bits; FP8 = scale and round | GPTQ/AWQ | "\"compute a scale and round\"" | covered |
| I60 GGUF | GGUF | "G G U F is the single-file format" | covered |
| I61 Q8_0 8.5; Q4_0 4.5 | GGUF | "eight and a half bits per weight... Four and a half bits" | covered |
| I62 k-quants, super-block 256, 6-bit scale/min, Q4_K 4.5, Q6_K 6.5625 | GGUF | "super-block of two hundred fifty-six... Q six K, about six and a half" | covered |
| I63 _M mix, 4.9 GB, 4.9 bits | GGUF | "about four point nine gigabytes" | covered |
| I64 imatrix, IQ formats | GGUF | "importance matrix... I Q four X S" | covered |
| I65 RTN perplexity table | What you lose | "fourteen point four nine... thirty-one point seven... two hundred six" | covered |
| I66 small models suffer more; 3-bit cliff | What you lose | "small models suffer more than big ones" | covered |
| I67 perplexity blunt | What you lose | "perplexity is a blunt instrument" | covered |
| I68 KL divergence, distribution made precise, llama-perplexity | What you lose | "It outputs a probability for every token in its vocabulary" | covered |
| I69 flips, Dutta et al. 2024 | What you lose | "\"Accuracy is Not All You Need\"" | covered |
| I70 math, code, long recall degrade first | What you lose | "Those are commonly reported to degrade first" | covered |
| I71 long context, KV cache quantization | What you lose | "quantizing the K V cache is a separate choice" | covered |
| I72 honest report | What you lose | "So the honest way to report a quantized model is" | covered |
| I73 careless unpack slower than bf16 | Unpacking | "You'd be slower" (B's "basically free" corrected) | covered |
| I74 kernel, fuse in registers | Unpacking | "unpack them in registers" | covered |
| I75 Marlin, 4x up to batch 16-32; llama.cpp kernels | Unpacking | "up to batches of sixteen to thirty-two" | covered |
| I76 suspect the kernel first | Unpacking | "suspect the kernel first" | covered |
| B1 two halves | Build It | "It comes in two halves" | covered |
| B2 t0 setup, Linear out-by-in, avoid GPT-2, 896/4,864 | Build It | "G P T two in transformers stores it transposed" | covered |
| B3 t1 four functions, hints, figure 001 test | Build It | "PyTorch's round sends exact halves to the nearest even number" | covered |
| B4 recon.py + planted outlier, predict | Build It | "set the very first weight to twenty times the biggest one" | covered |
| B5 t2 weights | Build It | "print the ten worst" | covered |
| B6 t2 activations hooks, questions, down_proj | Build It | "why might the down-projection be special" | covered |
| B7 t3 perplexity function, sweep, 30 s / 4 min, activation hooks | Build It | "about thirty seconds, and the whole sweep took me about four minutes" | covered |
| B8 t4 tiny AWQ, review | Build It | "A tiny A W Q" | covered |
| B9 t5 formats, playbooks, kernel logs, bytes, harness settings | Build It: Spark | "V L L M logs that at startup" | covered |
| B10 t6 eval, GSM8K 200, flips, bootstrap, paired test, KL mode, lm-eval | Build It: Spark | "resample the two hundred questions with replacement a thousand times" | covered |
| B11 t7 scoreboard; vLLM bf16 row caveat | Build It: Spark | "The rows that isolate quantization are the format rows" | covered |
| B12 done-when | Build It: Spark | "You're done when your affine function reproduces" | covered |
| M1 Mac numbers, second decimal | Measure | "shift the second decimal place" | covered |
| M2 bytes per token excludes embedding; 0.53B output proj in bf16 | Measure | "everything except the embedding table" | covered |
| M3 ceilings 18/34/58/32/56/55 | Measure | "about eighteen... about thirty-four... about fifty-eight... about thirty-two... about fifty-six... about fifty-five" | covered |
| M4 2.5-3.5x, fixed costs | Measure | "two and a half to three and a half times" (B's clean-ratio expectation corrected) | covered |
| M5 TTFT expectations | Measure | "F P eight should improve... Four-bit weight-only should stay roughly flat" | covered |
| M6 throughput at 16 | Measure | "the four-bit edge should be smaller at sixteen than at one" | covered |
| M7 quality; 10+ points check template | Measure | "A broken template is the most common cause" | covered |
| M8 compare within an engine | Measure | "Compare formats within one engine" | covered |
| K1 per-tensor on purpose, read output | Break It | "have the model generate a few sentences, and actually read them" | covered |
| K2 3-bit RTN vs GPTQ, 206 | Break It | "The gap between them is what error compensation is worth" | covered |
| K3 wrong calibration data, 8 vs 128 | Break It | "The wrong data makes the wrong ones important" | covered |
| K4 embeddings/lm_head; KV fp8 needle in 30,000 tokens | Break It | "Hide one sentence in a thirty-thousand-token document" | covered |
| E1 quantization in one breath; half-scale error; 16x | Ruler/Scale + close | "the error gets roughly sixteen times bigger" | covered |
| E2 outlier ruins per-tensor; toolbox; activations harder | Activations | "So, stepping back, here's the toolbox for outliers" | covered |
| E3 Spark single user vs H100 fleet | Weights only | "Single user on your Spark... A busy server on H one hundreds" | covered |
| E4 scaling with batch, ridge point, KV cache share | Weights only | "the ridge point... The K V cache... grows with the batch" | covered |
| E5 "lossless, perplexity up 2%" | What you lose | B: "perplexity only went up two percent"; A: "I'd want to know the sample size" | covered |
| G1 best source | Close | "Dettmers' blog post on L L M dot int eight and emergent features" | covered |
| C1 connections | Close | "the first real escape route from the seventeen-tokens-a-second ceiling" | covered |

No MISSING items.

Numbers derived in the script that are not written in the lesson (all simple arithmetic on lesson
numbers): about 3.6 GB for 7.0 billion weights at 4.125 bits (lesson gives only the 4.7 GB total);
"a thirty-second of a bit" for the 4/128 zero-point overhead; the SmoothQuant divide-by-ten example
(illustrative); the "Paris sixty percent / fifty-five percent" KL example (illustrative); B's "on paper four-bit's
a bit over three times bf16" (fifty-eight over eighteen, ceilings from the lesson).
