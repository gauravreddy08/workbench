# Coverage: flash-attention

Every outline item (podcast/outlines/flash-attention.md) mapped to where it lands in the script.
No MISSING items remain. Numbers checked against src/lessons/flash-attention.mdx.

| Item | Where in script (quoted) |
|---|---|
| T1 prereqs re-explained | "Quick reminder of how that worked. Arithmetic intensity is..."; "Same idea, yeah. Except on the CPU, the cache did the keeping" |
| P1 scene, three lines | "thirty-two thousand tokens. One big PDF, or a whole codebase, or a day of agent traces" |
| P2 2K/8K/32K, profiler | "the GPU's busy, but the math units are mostly sitting idle"; "dies. Out of memory. On the first layer" |
| P3 Predict s-bytes | "about sixty-nine gigabytes. For one matrix"; "About a hundred thirty-seven gigabytes"; "two point one gigabytes"; "about eight and a half gigabytes" |
| P4 Q, K, V tiny; intermediate | "about two hundred sixty-eight megabytes each"; "You never wanted it!" |
| O1 approximations | "Reformer, which used hashing... Linformer... Performer, with random features" |
| O2 paper, authors, thesis | "Tri Dao, Dan Fu, Stefano Ermon, Atri Rudra and Christopher Ré"; "everyone's been counting the wrong thing" |
| O3 GPT-2 3x, 16K | "trained GPT two about three times faster"; "sixteen-thousand-token sequences practical" |
| O4 Milakov, Gimelshein 2018 | "a short note at NVIDIA in twenty eighteen" |
| O5 everywhere incl. PyTorch | "inside basically every training and serving stack. PyTorch included" |
| I1 ladder, managed by hand | "the most important one, you manage by hand" |
| I2 SMs | "S Ms, streaming multiprocessors... An A one hundred has a hundred and eight" |
| I3 registers | "private to each thread, a few hundred kilobytes per S M" |
| I4 shared memory | "around a hundred to two hundred twenty-eight kilobytes depending on the chip" |
| I5 SRAM | "S RAM, static RAM... every bit costs several transistors" |
| I6 L1 carved from SRAM | "the L one cache is carved out of that same S RAM" |
| I7 L2 | "tens of megabytes on a data-center GPU, and the hardware manages it" |
| I8 HBM, LPDDR5x | "High-bandwidth memory... On the Spark it's actually L P D D R five X" |
| I9 Figure 001 pyramid | "So picture a pyramid... ten times faster per byte and something like a thousand times smaller"; A100 per-rung sizes; "hundreds of clock cycles" |
| I10 19 vs 1.5 TB/s, arithmetic, Spark gap | "roughly a twelve times gap"; "about nineteen and a half terabytes a second"; "on the order of ten terabytes a second or more" |
| I11 kernel (GPU) | "the GPU meaning, not the operating system one" |
| I12 thread blocks, program | "a hundred twenty-eight or two hundred fifty-six threads... In Triton... one block is called a program" |
| I13 only through HBM | "The only way to pass data from one kernel to the next is through main memory" |
| N1 each line a kernel | "Each line is at least one kernel" |
| N2 Figure 002 | "Up top, a wide box, that's H B M... a dashed line... three kernels in a row"; "sixty-four times bigger than the queries" |
| N3 byte count, 1.5% | "four N squared, plus four times N times head size"; "About one and a half percent of the traffic" |
| N4 eager extras | "a separate kernel just to divide... Dropout during training, more again" |
| N5 causal mask | "a token can only look at tokens at or before it... minus infinity" |
| N6 intensity d/2 | "you get head size over two... sixty-four flops per byte... thirty-two" |
| N7 arithmetic intensity, ridge | "Every chip has a ridge point, its peak flops per second divided by its bandwidth" |
| N8 Spark ~460, A100 150-200 | "Around four hundred sixty on spec-sheet numbers... a hundred fifty to two hundred" |
| N9 memory-bound | "The work finishes when the data finishes arriving" |
| N10 no N in intensity | "that intensity doesn't have N in it anywhere" |
| N11 Predict qk-matmul | "big matmuls are compute-bound"; "about seventeen billion"; "a hundred thirty-four megabytes"; "fourteen hundredths of a millisecond"; "about half a millisecond" |
| F1 kernel fusion | "That's called kernel fusion" |
| F2 softmax not elementwise | "Torch compile will happily fuse the scale, the mask and the exponent" |
| F3 row 128 KB, online softmax | "a hundred twenty-eight kilobytes... about the size of an S M's entire shared memory" |
| S1 fp16 overflow | "sixty-five thousand five hundred and four... about eleven... about eighty-nine"; "not a number, three times" |
| S2 shift invariance | "Say you subtract a thousand from all three: you get zero, one, two" |
| S3 safe softmax | "That's called safe softmax" |
| S4 three passes | "Pass one, find the max. Pass two... Pass three" |
| L1 sticky note | "like cards being dealt... a sticky note" |
| L2 not a new max | "Case one, it's not a new max. Easy" |
| L3 new max rescale | B: "you'd have to go back and redo every one of them"; A: "It's one factor" |
| L4 one formula, start | "start the note with the max at minus infinity and the sum at zero" |
| L5 2, 1, 5, 3 walkthrough | "Final sum, about one point two zero three"; "Same number" |
| L6 induction, exact | "you can prove it, and the proof is short... floating-point rounding" |
| L7 Predict merge | "Take the bigger max..."; "Flash-Decoding... ring attention" |
| R1 output rides along | "That output can ride along on the same sticky note" |
| R2 o, same rescale, o/l | "divide o by l" |
| R3 tile update, matmul | "Which is just the merge rule. The block's the second worker"; "a small dense matrix multiply" |
| W1 forward steps | "loads its query block... once... loop over the keys and values" |
| W2 logsumexp | "That's called the logsumexp" |
| W3 nothing N x N written | "Nothing N by N is ever written" |
| W4 Figure 003 | "Picture stepping through a tiny example... rescale factor lights up orange... 'N by N written' that just sits at zero" |
| W5 FA-1 loop order, fused mask/dropout | "The first version actually put the key-value loop on the outside" |
| C1 IO-aware | "I O meaning input and output, reads and writes" |
| C2 traffic count, theorem, optimality | "N squared times head size squared, divided by the S RAM size"; "no exact attention algorithm can do better" |
| C3 2x worst case, still quadratic | B: "makes attention linear"; A: "A two times saving... The saving is in the constant" |
| C4 three reasons | "about four megabytes together... hit in L two"; "the eager extras vanish"; "about N flops per byte... in the thousands" |
| C5 Figure 004 | "Picture a little traffic counter... flip it to 'hit in L two'"; "about seventeen gigabytes per layer" |
| C6 137 GB vs 8 MB | "a hundred thirty-seven gigabytes against about eight megabytes" |
| B1 recompute P | "rebuild the exact probabilities as e to the score minus the logsumexp" |
| B2 gradient steps | "The value gradient picks up the probabilities, flipped, times the output gradient..." |
| B3 D trick | "that whole row sum is just the output gradient dotted with the output" |
| B4 more FLOPs fewer bytes, checkpointing | "More flops, fewer bytes"; "Activation checkpointing, also called gradient checkpointing" |
| B5 Predict recompute | "two and a half times the forward... about twenty-five percent more flops" |
| V1 game changes | "It's 'keep the math units busy'" |
| V2 FA-2 2x, 50-73% | "fifty to seventy-three percent of an A one hundred's peak" |
| V3 tensor cores, 16x, one division | "roughly sixteen times faster... one division per row instead of one per block" |
| V4 parallelize over sequence | "Batch of one, thirty-two heads... fewer programs than the GPU has S Ms" |
| V5 warps, split queries | "groups of thirty-two threads... divides the queries among the warps, not the keys" |
| V6 skip masked blocks | "roughly halves the work" |
| V7 FA-3 authors, numbers | "seven hundred forty teraflops... seventy-five percent... one point two petaflops in F P eight" |
| V8 TMA, warp specialization | "T M A... That's called warp specialization" |
| V9 ping-pong | "They call it ping-pong" |
| V10 FP8 | "F P eight, with scaling per block and a trick to spread out outlier values" |
| V11 FA-4, GB10 hedge, SDPA | "often called FlashAttention four... as far as I know... compute capability twelve point one" |
| V12 Flash-Decoding | "Same trick, opposite axis" |
| K1 Triton | "from OpenAI, started by Philippe Tillet... one program working on one tile" |
| K2 programs, grid | "which program am I? Zero, one, two" |
| K3 pointers, offsets, 2D | "pointers to their first element... Row times the row stride, plus column" |
| K4 mask, 300/128/44 | "Only forty-four of those exist" |
| K5 constexpr, powers of 2 | "compile-time constants... powers of two" |
| K6 tile ops, dot >= 16 | "as long as each dimension is at least sixteen" |
| K7 Figure 005 | "Picture a grid of little squares... The last column of squares is drawn dashed" |
| K8 torch.compile writes Triton | "Torch Inductor, writes Triton kernels... 'output code'" |
| M1 synchronize | "It returns the moment the work's been queued" |
| M2 warm up, cuBLAS | "hundreds of milliseconds, sometimes seconds... cuBLAS" |
| M3 robust statistic | "The median, or the mean with the spread" |
| M4 L2 flush | "clears L two between runs by writing a big buffer" |
| M5 correctness first | "about one part in a thousand, not one in a million" |
| M6 time only kernel | "Allocate inputs outside the timed part" |
| M7 do_bench, peak memory | "Do-bench does most of this for you... high-water mark" |
| B-1 Task 1 | "Four little functions... seven uneven chunks"; hints "one part in a million billion... one in a trillion" |
| B-2 Task 2 | "under a hundred-thousandth... four times ten to the minus sixteen... eight billionths"; "Blocks of one... blocks of N"; causal skip; tracemalloc |
| B-3 Spark setup | "N G C... twelve point one... Triton three point three"; "TRITON INTERPRET to one" |
| B-4 Task 3 softmax | "Why minus infinity?" B answers; "two times rows times columns times the element size" |
| B-5 Task 4 flash kernel | "cast them to F P sixteen... accumulator in F P thirty-two"; "two hundredths... seventy-seven"; "base-two exponential"; fused attention tutorial |
| B-6 Task 5 benchmark, backends, 32K | "Flash, memory-efficient, cuDNN, and plain math"; "Linux out-of-memory killer" |
| B-7 Task 6 review | "Mask mistakes... all minus infinity... Integer overflow... Wrong strides... F P sixteen accumulation" |
| B-8 Done when | "You're done when your online softmax matches..." |
| E1 tables, prediction first | "a prediction column you fill in before you run anything" |
| E2 Mac memory numbers | "about eighteen megabytes... Two hundred seventy-three megabytes... About a gigabyte... half a megabyte, then one point two, then two point three" |
| E3 tiled slower | "about a third of a second against about an eighth. Because NumPy can't fuse" |
| E4 naive 17 GB, 64 ms, 9 ms | "at least about sixty-four milliseconds... about nine milliseconds" |
| E5 naive memory cliff | "eight and a half... thirty-four... a hundred thirty-seven" |
| E6 SDPA flat memory, fallback | "If PyTorch's peak memory grows as N squared, it fell back to the math backend" |
| E7 yours vs SDPA | "one and a half to three times... fifty to seventy-five percent... four or eight warps" |
| E8 softmax GB/s | "eager should be slower by roughly the ratio of passes" |
| X1 drop max | "scaled up by twenty... It's what makes F P sixteen attention possible" |
| X2 forget rescale | "the bug's invisible... build a test where the max is in the last block" |
| X3 forget mask, padded score 0 | "correct-looking output"; B: "they still count in the sum"; "They steal weight" |
| X4 lying benchmark, Nsight | "Write all three down"; "Nsight Compute... the N C U command" |
| X5 too much SRAM | "out of resources, shared memory"; "Often it isn't. Bigger tiles mean fewer programs fit" |
| Q1 why naive slow | Spread: naive section + close "the giant N by N matrix goes out and back twice" |
| Q2 online softmax exact | Online softmax section, induction turn |
| Q3 scaling N, d, SRAM | "better with a bigger S RAM, and worse with a bigger head"; L2 near-linear; compute-bound |
| Q4 backward recompute | Backward section |
| Q5 new variant | B: "Say I'm in an interview..."; A: "You start boring..." |
| G1 sources | "read the FlashAttention paper itself... Milakov and Gimelshein's online softmax note" |
| G2 connections | "roofline applied to one single operation... V L L M and S G Lang" |

Numbers derived in the script but not written in the lesson: "about a billion numbers" per head (32,768 squared); "the whole model's like sixteen gigs" (B's guess, 8B x 2 bytes); Spark SRAM/HBM gap "something like forty times" (10 TB/s / 273 GB/s); "ninety-eight and a half" percent; "three and a half times longer" (0.49 / 0.14 ms); online-softmax intermediate "about one twentieth" and "about point zero seven"; flash best-case traffic at 8K "about a quarter of a gigabyte" (4Nd x 32 heads x 2 bytes = 268 MB); "thirty-two programs" for FA-1 at batch 1; program two owning indices "two thousand forty-eight up to three thousand seventy-one"; causal skip count "a bit under half" (120 of 256 blocks).
