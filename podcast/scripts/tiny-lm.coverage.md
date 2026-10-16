# Coverage: tiny-lm

Lesson src/lessons/tiny-lm.mdx vs podcast/scripts/tiny-lm.md. Item IDs match
podcast/outlines/tiny-lm.md. All numbers checked against the lesson. "Fixed" = adjusted after the
first draft.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs, time budget | Problem; Build It | "So you've built G P T two from scratch. More than once"; "two evenings of building, one overnight run" | covered |
| P1 own ideas, mush samples | Problem | "The loss went down a bit. The samples were mush" | covered |
| P2 twenty settings, factor of two, three silent failures | Problem | "maybe twenty settings... ten times too low... it gives you a beautiful loss curve" | covered |
| P3 baseline + checklist | Problem | "They have a baseline that works. One run they trust" | covered |
| O1 GPT-2 2019, WebText, Radford | Origin | "February twenty nineteen, OpenAI releases G P T two" | covered |
| O2 GPT-3 Small numbers | Origin | "Batch size of half a million tokens. A peak learning rate of six times ten to the minus four" | covered |
| O3 nanoGPT | Origin | "Nano G P T, late twenty twenty-two. About three hundred lines" | covered |
| O4 llm.c, 90 min, $20, 8xA100, 10B FineWeb-Edu, video, build-nanogpt | Origin | "about ninety minutes, for about twenty dollars" | covered |
| O5 assume your run is wrong first | Origin | "assume your run is wrong first" | covered |
| I1 Figure 001 lifecycle | Whole loop | "Top row, left to right, three boxes... Then underneath, a dashed box" | covered |
| I2 silent bugs in arrows | Whole loop | "Off in the corner I'd write four of them" | covered |
| D1 TinyStories | Choosing the text | "Tiny Stories, from Eldan and Li... before your coffee's cold" | covered |
| D2 FineWeb-Edu sample-10BT, curves to compare | Choosing the text | "sample ten B T. A random ten-billion-token slice" | covered |
| D3 recommendation, unit vs integration test | Choosing the text | "So Tiny Stories is like a unit test" | covered |
| D4 ~2.5B, one night | Choosing the text | "about two and a half billion is the sensible budget" | covered |
| K1 tokenize once | Tokenize once | "you never tokenize during training" | covered |
| K2 uint16, 2 bytes, 5 GB vs 20 GB | Tokenize once | "Two and a half billion tokens is five gigabytes... twenty gigabytes" | covered |
| K3 >65,536 vocab, wrap, assert | Tokenize once | "Llama three's, which has about a hundred twenty-eight thousand" | covered |
| K4 EOT token 50256, context resets | Tokenize once | "number fifty thousand two hundred fifty-six, called end of text" | covered |
| K5 packing | Tokenize once | "This has a name, packing" | covered |
| K6 memmap, page cache, 128 GB | Tokenize once | "the whole five gigabytes just lives in the page cache" | covered |
| F2 Figure 002 shift | The shift | "Let's do it with five so it fits in your head" | covered |
| L1 loader job | Loader | "Given a batch size B and a context length T" | covered |
| L2 val split by file, overlap | Loader | "Windows overlap... The clean split is by file" | covered |
| L3 with replacement | Loader | "it's sampling with replacement" | covered |
| L4 Predict 63% / 1/e / shuffle-and-walk | Loader | "About sixty-three percent... about one over e" | covered |
| L5 ints small, int64, allocator | Loader | "goes through CUDA's memory allocator. At these sizes it's noise" | covered |
| M1 config | Model | "Twelve layers, twelve attention heads, model width seven hundred sixty-eight" | covered |
| M2 embedding table, tying, 38.6M, 124,475,904, 85M, 163M | Model | "saves thirty-eight point six million parameters" | covered (fixed: removed an unsupported claim about why tying works) |
| M3 vocab pad 50,304, tiles, few percent | Model | "Pad the vocabulary to fifty thousand three hundred four" | covered (fixed: removed added "slower path" claim) |
| M4 init 0.02, residual scaling | Model | "one over the square root of twenty-four, so roughly a fifth" | covered |
| E1 cross-entropy, nats, 1.44 bits, 0.05 -> 3 | Loss | "probability of five percent, that position contributes about three" | covered |
| E2 Predict init loss 10.82, 10.98, 10.8-11.2, 68.2 | Loss | "About ten point eight... sixty-eight point two" | covered |
| E3 what the check catches | Loss | "a loss that's summed where it should be averaged" | covered |
| E4 perplexity ladder | Loss | "you can tell the story of a run in perplexities" | covered |
| E5 same tokenizer/val; 0.02 / 0.05 | Loss | "comparing datasets"; "zero point zero two nats, consistently" | covered |
| O6 AdamW, betas, eps, 0.95 vs 0.999 | Optimizer | "Zero point nine five forgets faster" | covered |
| O7 weight decay groups, dim >= 2, counts | Optimizer | B "just apply it to everything"; "turning that layer's volume down" | covered |
| R1 LR most important | Learning rate | "within a factor of two of good" | covered |
| R2 shape | Learning rate | "a linear warmup... Then cosine decay" | covered |
| F3 Figure 003 | Learning rate | "Picture it as a curve... landing at six e minus five" | covered |
| R3 warmup why, 375M tokens | Learning rate | "three hundred seventy-five million tokens" | covered |
| R4 peak 6e-4, 3x tolerated | Learning rate | "tolerate about three times that" | covered |
| R5 decay, narrow valley, last fifth | Learning rate | "big steps just bounce off the walls" | covered |
| B1 batch in tokens, 2^19, 512 sequences | Batch size | B "Like, sixteen?"; "five hundred twelve sequences per step" | covered |
| B2 gradient accumulation | Batch size | "That's gradient accumulation" | covered |
| F4 Figure 004, divide by 32, bigger micro-batch | Batch size | "Divide by thirty-two"; "Fewer, fatter passes" | covered |
| B3 why keep 0.5M | Batch size | "the batch size is part of the recipe" | covered |
| G1 clipping, log norm, early warning | Clipping | "Direction kept, size capped"; "spikes in the norm come before spikes in the loss" | covered |
| S1 four switches don't change learning | Making it fast | "None of them change what the model learns" | covered |
| S2 bf16 autocast, range vs precision, no scaler (diagnostic gap) | Making it fast | B "B F sixteen is the more precise"; A "That's backwards" | covered |
| S3 TF32 | Making it fast | "T F thirty-two" | covered |
| S4 flash attention | Making it fast | "never writes the full T by T attention matrix" | covered |
| S5 torch.compile, 273 GB/s | Making it fast | "two hundred seventy-three gigabytes a second on the spec sheet" | covered |
| S6 fused AdamW | Making it fast | "pass fused equals true to Adam W" | covered |
| C1 explorer intro | Loss curves | "six buttons... illustrations, not measurements" | covered |
| C2 good run | Loss curves | "Button one, the good run" | covered |
| C3 LR too high | Loss curves | "Button two... flat line around seven" | covered |
| C4 LR too low | Loss curves | "about a whole nat above the good run" | covered |
| C5 no warmup | Loss curves | "Nobody trains a transformer without it" | covered |
| C6 data bug | Loss curves | "the model just learns to copy" | covered |
| C7 tiny data | Loss curves | "the loader keeps replaying one shard" | covered |
| C8 patterns, random-token test 10.5 -> 5.8 | Loss curves | "loss fell from ten point five to five point eight in a hundred steps" | covered |
| C9 fixed val set, same axes | Loss curves | "Evaluate validation loss on a fixed set" | covered |
| X1 Chinchilla, Kaplan, 20 tokens/param | How big | B "Bigger's better"; "About twenty tokens per parameter" | covered |
| X2 2.5B, Llama 3 8B 15T, serving | How big | "over fifteen trillion tokens" | covered |
| X3 6N derivation | How big | "Two plus four, six" | covered |
| X4 attention term 113M, 747M, 15%, 860M | How big | "about eight hundred sixty million FLOPs per token" | covered |
| X5 1.9e18 (2.2e18) | How big | "one point nine times ten to the eighteen FLOPs. Call it two billion billion" | covered |
| X6 Spark 125 TFLOP/s estimate | How big | "That's not a published spec" | covered |
| X7 MFU, PaLM, 40-60%, llm.c ~60%, 1.85M tok/s, 30-45% | How big | "M F U, model FLOPs utilization" | covered |
| X8 10 h (12), 17-19 h, one run per day | How big | "About ten hours. About twelve with attention" | covered |
| F6 calculator, notes, reverse panel, +-20% | How big | "There's a calculator that does all this" | covered |
| Q1 Karpathy recipe essay | Debugging recipe | "neural nets fail silently" | covered |
| Q2 look at data | Debugging recipe | "One. Look at the data" | covered |
| Q3 init loss | Debugging recipe | "Two. Check the init loss" | covered |
| Q4 overfit one batch, 10.87 -> 0.08 -> 0.005, causes | Debugging recipe | "zero point zero eight in fifty steps" | covered |
| Q5 random tokens | Debugging recipe | "Four. Train on random tokens" | covered |
| Q6 print LR | Debugging recipe | "Being off by a factor of ten is the most common silent bug" | covered |
| Q7 short real run, then long run | Debugging recipe | "Six. A short real run... And seven" | covered |
| K7 checkpoint contents | Checkpoints | B "So you save the weights"; "orig mod" | covered |
| K8 atomic save, keep 2-3 + milestones | Checkpoints | "F sync the directory too" | covered |
| K9 1.5 GB | Checkpoints | "about a gigabyte and a half" | covered |
| SA1-SA6 sampling | Sampling | "Greedy"; "tau"; "Individually rare, collectively likely"; "two tokens... hundreds"; "between zero point eight and one" | covered |
| V1 val loss main number | Evals | "Validation loss is your main number" | covered |
| V2 HellaSwag, 25%, 29.5%, 10,042, +-0.45 | Evals | "about plus or minus half a point" | covered |
| BI0 git, commit before every run | Build It | "commit before every run" | covered |
| t0 setup, matmul peak, 2n^3 | Build It | "N G C PyTorch container"; "two times n cubed FLOPs" | covered |
| t1 tokenize shards, 2.7B budget, read back | Build It | "two point seven billion tokens"; "Find an end-of-text in there" | covered |
| t2 loader spec + shift test, val fixed | Build It | "a three-line test" | covered |
| t3 model checklist, agent review | Build It | "If it says a hundred sixty-three million, your embeddings aren't tied" | covered |
| t4 sanity script, Mac CPU | Build It | "Then flip the target to equal the input" | covered |
| t5 training loop, log line, MFU, val, resume, TinyStories check | Build It | "step twelve hundred, loss three point eight one"; "a resume flag" | covered |
| t6 LR sweep, U, caveat | Build It | "You should see a U" | covered |
| t7 throughput four ways | Build It | "fewer micro-batches to match" | covered |
| t8 tmux, LOG.md, check at 10 min | Build It | "inside T mux"; "Is the loss below seven? Then go to bed" | covered |
| t9 sample.py, top-p implementation, prompt, temps | Build It | "The most important thing about learning is" | covered |
| t10 eval, OpenAI reference, classic bugs | Build It | B "Why OpenAI's?"; "padding tokens sneaking into the average" | covered |
| DW done-when | Build It | "And you're done when" | covered |
| ME1-ME6 expectations | Measure | "fifty-eight thousand tokens a second"; "twenty-seven to thirty percent" | covered |
| ME7 MFU honest number, under 20 / over 60 | Measure | B "If I got seventy percent I'd be pretty happy"; "You'd be suspicious" | covered |
| ME8 vs published curve, 0.2 worse | Measure | "within a few hundredths" | covered |
| ME9 samples vs loss | Measure | "what a loss of four actually looks like" | covered |
| BK0 short runs on same axes | Break It | "see each failure once" | covered |
| BK1 y = x | Break It | "the same bug, just slower" | covered |
| BK2 no warmup 5x LR, clipping off | Break It | "The norm spikes before the loss does" | covered |
| BK3 Predict grad_accum, Adam cancels, clipping every step | Break It | B "thirty-two times the step"; "Only epsilon" | covered |
| BK4 replay one shard | Break It | "Not a model problem" | covered |
| EB1 init loss = ln V, high/low meaning | Loss; ending | "Unsure is cheap. Confidently wrong is expensive" | covered |
| EB2 recipe and why | Recipe in one breath | B "can I try to say the recipe back" | covered |
| EB3 budget: 6ND, 20 tok/param, sqrt(C/120), time, serving | How big | "N is the square root of your compute divided by a hundred twenty" | covered |
| EB4 spiked twice then flat at 7 | Loss curves | B "spiked twice, and now it's just flat around seven" | covered |
| EB5 MFU scaling to 1B / 8 GPUs | Measure | "A bigger model, on the same GPU, usually gets higher M F U" | covered |
| GD go deeper | Close | "Karpathy's four-hour... video... his recipe essay" | covered |
| CN connections | Close | "Reusing this exact loop to train a draft model" | covered |

No MISSING items.

Numbers not written in the lesson (derived for speech): one over the square root of twenty-four is
"roughly a fifth"; the square-root rule applied to 1.9e18 gives about 126M parameters; Adam's
cancellation explained as "squared average up by thirty-two squared, its root up by thirty-two";
the 125 TFLOP/s derivation (petaFLOP at four-bit with sparsity, halved for dense and per precision
doubling) re-explained from the bandwidth-bound lesson.
