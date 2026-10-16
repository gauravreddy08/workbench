# Coverage: number-formats

Lesson src/lessons/number-formats.mdx vs podcast/scripts/number-formats.md. Item IDs match
podcast/outlines/number-formats.md. All numbers checked against the lesson; derived numbers listed at
the bottom.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 two bytes per parameter | Formats; Connections | "Weights in B F sixteen take two bytes each" | covered |
| T2 Today bullets | Problem | skipped as a list; opening scene does the job | covered |
| P1 diagnostic answer, half right, backwards conclusion | Problem | "fewer points after the decimal than F P sixteen"; "the conclusion you drew from it is backwards" | covered |
| P2 fp16 NaN / silent zeros, bf16 fine | Problem | "the loss prints N A N... Or, the sneakier version" | covered |
| P3 three fields and one formula | Problem | "just three fields and one formula" | covered |
| O1 pre-1985 chaos: IBM base 16, Cray, VAX | Origin | "I B M mainframes worked in base sixteen" | covered |
| O2 Kahan, 8087, IEEE 754 1985, Turing 1989 | Origin | "I triple E seven fifty-four, published in nineteen eighty-five" | covered |
| O3 fp16 2008, Volta 2017, tensor cores, loss scaling, Google Brain bfloat16, A100 2020 | Origin | "B for brain. Brain floating point" | covered |
| I1 scientific notation examples | Scientific notation | "six point oh two times ten to the twenty-three" | covered |
| I2 range vs precision, relative | Scientific notation | "Precision is relative. Not a count of places" | covered |
| I3 three fields, significand | Scientific notation | "Officially that's called the significand" | covered |
| F1 Figure 001, -2.5 bits | Decoding | "Picture a row of thirty-two little boxes" | covered |
| D1-D4 sign, binary 10.1, normalise, hidden bit, mantissa | Decoding | "It's called the hidden bit" | covered |
| D5 bias 127/15, field 128 | Decoding | "fifteen for F P sixteen" | covered |
| D6 hex C0200000 | Decoding | "C zero two followed by five zeros" | covered |
| D7 formula in words | Decoding | "Put a 'one point' in front of the mantissa bits" | covered |
| D8 reserved exponents, NaN properties | Decoding | "N A N isn't even equal to itself" | covered |
| FM1 same recipe | Formats | "every format in deep learning is that same recipe" | covered |
| F2 figure 002 / table numbers (fp32, fp16, bf16, tf32, E4M3, E5M2) | Formats | "Largest number: sixty-five thousand five hundred and four"; "E five M two's is a quarter" | covered (fp8 min normals omitted, see note) |
| FM2 machine epsilon | Formats | "the gap between one and the very next number" | covered |
| FM3 decimal digits 7.2 / 3.3 / 2.4 | Formats | "about seven point two decimal digits" | covered |
| FM4 corrected diagnostic | Formats | "here's the corrected version of what you said" | covered |
| FM5 top half of fp32 | Formats | "literally the top half of an F P thirty-two" | covered |
| FM6 pi at three sizes, 0.2%, 0.4% | Formats | "three thousand one hundred thirty-six" | covered |
| FM7 tf32 | Formats | "it's not a storage format" | covered |
| FM8 fp8 two flavours | Formats | "four hundred forty-eight... fifty-seven thousand three hundred forty-four" | covered |
| PR1 predict 0.1 and 256+1 | Predict | "So you add one, and nothing happens" | covered |
| F3 bit flipper | Flip the bits | "two to the minus sixty-four... two to the minus eight" | covered |
| G1 binade, 128 values | Gaps | "Each of those stretches... is called a binade" | covered |
| G2 ULP | Gaps | "U L P, unit in the last place" | covered |
| F4 staircase figure | Gaps | "a staircase going up at forty-five degrees" | covered |
| G3 stagnation | Gaps | "That's called stagnation" | covered |
| G4 long sums stall 4.0 / 32 | Gaps | "B F sixteen gives you four" | covered |
| G5 order matters | Gaps | "Float addition isn't associative" | covered |
| S1 subnormals, 2^-24, underflow | Subnormals | "two to the minus twenty-four. About six times ten to the minus eight" | covered |
| S2 Kahan gradual underflow, slow, flush-to-zero | Subnormals | "flush-to-zero mode" | covered |
| R1 round to nearest ties to even | Rounding | "round to nearest, ties to even" | covered |
| R2 0.1+0.2, fp32 True, tolerance | Rounding | "In F P thirty-two, zero point one plus zero point two does equal" | covered |
| R3 exact fp32 0.1 | Rounding | "zero point one zero zero zero zero zero zero zero one four nine" | covered |
| C1-C2 cancellation, x*x-1 | Cancellation | "The fifth significant digit is wrong" | covered |
| C3 variance, negative, sqrt NaN | Cancellation | "the classic spot is variance" | covered |
| OV1 65,504, exp 11/12, 300x300, 40,000 tokens | Overflow | "Three hundred times three hundred?" | covered |
| OV2 inf to NaN, contagious, all-reduce | Overflow | "There's a step called the all-reduce" | covered |
| OV3 naive softmax 10, 11, 12 | Overflow | "E to the twelve is infinity" | covered |
| OV4 max trick, FlashAttention, logsumexp | Overflow | "There's a cousin called log sum exp" | covered |
| OV5 attention logits overflow, 3 of 64, QK-norm | Overflow | "three of sixty-four scores came out infinity" | covered |
| U1-U2 backward small gradients, 1/(B x T) | Underflow | "each token's gradient starts out divided by about two thousand" | covered |
| U3 measured ladder | Underflow | "Walk down the gradient sizes" | covered |
| U4 2017 paper | Underflow | "Micikevicius and colleagues at NVIDIA and Baidu" | covered |
| L1-L2 loss scaling, 16 binades, S too small/big | Loss scaling | "shifts the whole pile of gradients up by sixteen binades" | covered |
| L3 dynamic scaler, 2,000 steps | Loss scaling | "two thousand steps in a row with nothing bad" | covered |
| L4 PyTorch four lines | Loss scaling | "you call backward on the scaled loss" | covered |
| L5 V100s, failure modes, unscale before clipping | Loss scaling | "you have to unscale before you clip" | covered |
| W1-W3 why bf16 | Why bf16 | "thirty orders of magnitude away"; "Not because it's more precise" | covered |
| M1 mixed precision term | Mixed precision | "The recipe is called mixed precision training" | covered |
| F5 Figure 005 loop | Mixed precision | "picture one training step as a loop" | covered |
| M2 master weights, 0.5 + 1e-4 | Mixed precision | "An update of a ten-thousandth to a weight of a half" | covered |
| M3 bf16 compute | Mixed precision | "many times F P thirty-two's, check the spec sheet" | covered |
| M4 fp32 accumulation | Mixed precision | "keep the running sum in F P thirty-two" | covered |
| M5 autocast list | Mixed precision | "that list is just the cancellation section" | covered |
| M6 Adam m, v, epsilon, 8 + 4 bytes | Mixed precision | "zero divided by zero. N A N" | covered |
| M7 PyTorch vs Megatron/DeepSpeed/FSDP bookkeeping | Mixed precision | "Same idea. Different bookkeeping" | covered |
| SR1 stochastic rounding | Stochastic rounding | "flips a weighted coin" | covered |
| E1 fp8 amax scaling, E4M3/E5M2 recipe | FP8 | "you multiply everything by a hundred twelve" | covered |
| E2 Transformer Engine, delayed scaling, DeepSeek-V3, Blackwell | FP8 | "its classic mode is called delayed scaling" | covered |
| PR2 predict shrunk loss | Predict | "forty-six percent of the gradient values were exactly zero" | covered |
| B0 setup | Build It | "tiny Shakespeare... about one point one megabytes" | covered |
| B1 decoder | Build It | "the power is one minus the bias, not zero minus the bias" | covered |
| B2 enumerate 65,536 | Build It | "decode all sixty-five thousand five hundred thirty-six" | covered |
| B3 overflow three ways | Build It | "make F P sixteen overflow, three ways" | covered |
| B4 tiny GPT, 0.8M | Build It | "about eight hundred thousand parameters" | covered |
| B5 train four ways, hints | Build It | "one seed for building the model and a separate random generator" | covered |
| B6 Spark, matmul benchmark | Build It | "two times n cubed operations" | covered |
| B7 done when | Build It | "You're done when your decoder matches" | covered |
| MS1-MS3 reference numbers | Measure | "Six point nine four at the end" | covered |
| MS4 fp32 shift at 1e-4 | Measure | "one point seven oh against one point six six" | covered |
| MS5 enumeration counts and gaps | Measure | "two thousand forty-six N A N patterns" | covered |
| MS6 Spark ratios, sparsity | Measure | "quoted with sparsity" | covered |
| BK1 whole model fp16 | Break It | "N A N by step one hundred" | covered |
| BK2 whole model bf16 small lr | Break It | "Two point three one for pure B F sixteen" | covered |
| BK3 no 1/sqrt(d), x20 embeddings | Break It | "every halving is a skipped step" | covered |
| BK4 == on floats | Break It | "Compare floats with double equals" | covered |
| X1 fp16 vs bf16 | Formats; ending | "fewer digits, the whole window"; final exchange | covered |
| X2 precision depends on size | Gaps | "the gap... doubles every time you cross a power of two" | covered |
| X3 mixed precision walkthrough | Mixed precision | loop description | covered |
| X4 dynamic scaler, collapsing scale | Loss scaling; Break It | "a scale that keeps collapsing is basically an alarm" | covered |
| X5 scaling to 1,000 GPUs / 100B | Scaling up | "rare events stop being rare" | covered |
| GD1 Goldberg, 2017 histogram | Close | "Goldberg's 'What Every Computer Scientist Should Know'" | covered |
| CN1 connections | Close | "about sixteen to train" | covered |

Notes:
- Compressed: smallest normal values of the two fp8 formats (0.0156, 6.1e-5) and the "minus 1 step" /
  "min subnormal" flipper presets are not said; the fp8 epsilons and maxes are.
- Derived numbers not written in the lesson: batch 32 x context 64 = about 2,000 tokens (gradient
  divided by about two thousand); amax 4 -> scale 112 (448 / 4); 3,141.59 vs 3,136 "off by more than
  five"; 65,536 x 0.001 "about sixty-five".
- Added explanations not stated in the lesson (standard IEEE facts): why the subnormal power is one
  minus the bias (so subnormals continue on from the smallest normal with the same step); dividing
  infinity after the matmul can't help while dividing q before does (the lesson poses this as a
  question); z-loss described as a penalty on the size of the output logits.
