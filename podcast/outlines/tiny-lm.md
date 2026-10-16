# Outline: tiny-lm

Source: src/lessons/tiny-lm.mdx. Curriculum entry: "Train a small LM, end to end." Question: what
does the full loop of training a language model actually look like? Build: train a ~100M model on
the Spark from raw text to a checkpoint you can sample from.

Each item: what the lesson teaches -> how it is said aloud.

Diagnostic gaps this lesson touches: numbers (FLOPs, bytes, hours, tokens/s), memory math
(checkpoint = weights + Adam state), bf16 vs fp16 (he had it backwards). B voices the wrong models.

## Today / prerequisites

- T1 Prereqs: has written GPT-2 forward pass; helpful: tokenizers, number formats, training memory, atomic save. Time: two evenings, one overnight run, one morning eval. -> A in the opening ("you've built GPT-2 more than once"); time budget said once near the Build It intro. Bullets themselves not read; each is an item below.

## The Problem

- P1 He has built GPT-2 several times; every own idea (attention variant, normalisation, paper trick): loss went down a bit, samples mush, couldn't tell bad idea from bad training. -> A opens on this scene.
- P2 About twenty settings, each wrong quietly costs a factor of two. LR 10x too low doesn't crash, model looks dumb. No warmup doesn't crash, costs a few percent. Wrong targets doesn't crash, gives a beautiful loss curve. None throw an exception; all make the idea look like it failed. -> B voices wrong model "a bug would crash or the loss would blow up"; A lists the three silent ones.
- P3 People who get good results aren't mostly more creative: a baseline that works, change one thing at a time; a checklist catching silent bugs before they burn a night. Lesson builds both. -> A.

## Origin

- O1 Feb 2019 GPT-2, 124M to 1.5B, trained on WebText (pages linked from Reddit). Paper "Language Models are Unsupervised Multitask Learners", Radford et al. Architecture given, recipe left unsaid. -> A, story.
- O2 GPT-3 paper (Brown et al., 2020) filled in numbers for 125M "GPT-3 Small": batch 0.5M tokens, peak LR 6e-4, warmup, cosine decay, weight decay 0.1, clipping 1.0. -> A; numbers flagged as "you'll hear each again".
- O3 Karpathy nanoGPT late 2022: ~300 lines model + ~300 training loop, reproduces GPT-2 124M on OpenWebText. -> A.
- O4 2024 llm.c: plain C and CUDA; GPT-2 124M in about 90 min for about $20 on one 8xA100 node, 10B tokens of FineWeb-Edu. Video "Let's reproduce GPT-2 (124M)", repo build-nanogpt. -> A.
- O5 When your run disagrees with them, assume your run is wrong first. -> A, punchline; B reacts.

## The Idea

- I1 Figure 001 lifecycle: raw text -> tokenizer (GPT-2 BPE, EOT per doc) -> token files (uint16, 2 bytes/token, train/val) run once; training loop ~5,000 steps: loader (x, y of B by T) -> GPT 124M (bf16, compiled) -> cross-entropy loss -> AdamW (clip, lr schedule) -> new weights back; checkpoint (model + optimizer + step + data position) every N steps; sample (temperature, top-p) and eval (val perplexity, HellaSwag). -> A describes left to right like over the phone.
- I2 Silent bugs live in the arrows: int32->uint16 overflow, y not shifted, val docs in train, loader replays one shard. "You've built the middle box; this is about every other box and the arrows." -> A.
- D1 TinyStories (Eldan and Li 2023): ~2M short children's stories by GPT-3.5/GPT-4, tiny vocabulary of words, a few hundred million tokens (check the card). Superpower fast feedback: few-million-param model writes coherent stories in minutes. Weakness: hyperparameters don't transfer. -> A.
- D2 FineWeb-Edu (Penedo et al. 2024, Hugging Face): Common Crawl filtered by a classifier for "educational"; sample-10BT is a random 10B-token slice; what llm.c and build-nanogpt trained on; superpower: published curves to compare at step 2,000. -> A.
- D3 Recommendation: FineWeb-Edu sample-10BT for real run, TinyStories for 5-min smoke tests; goal is a run you can trust; TinyStories = unit test, FineWeb-Edu = integration test. -> A; B paraphrases unit/integration.
- D4 Won't use all 10B: ~2.5B is the budget for 124M, one night on the Spark. -> A, forward pointer.
- K1 Tokenizing is slow Python work; training wants millions of tokens/s; tokenize once up front, write IDs as one flat array; training reads slices. -> A; B asks why not on the fly.
- K2 Smallest integer: vocab 50,257, IDs 0 to 50,256; uint16 holds 0-65,535; 2 bytes/token; 2.5B tokens = 5 GB; int64 (torch default) = 20 GB. -> A with numbers.
- K3 Tokenizer >65,536 (Llama 3's 128K vocab) needs uint32; silent cast wraps big IDs to garbage; assert max before cast. -> A.
- K4 Term end-of-text token: token 50256, marks document boundary, what follows unrelated. Put in front of every document, concatenate. A 1,024-token window spans pages; separator says "context resets". -> A.
- K5 Term packing: concatenate docs into one stream, cut fixed windows, no compute wasted on padding; what GPT-2 and nanoGPT do. -> A.
- K6 Memmap: array-shaped view of file without reading it; slicing reads just those bytes through the page cache on demand; OS keeps hot pages in RAM; with 128 GB on the Spark, the whole 5 GB ends up cached after the first pass. Re-explain mmap/page cache briefly. -> A.
- F2 Figure 002: file is one long row of 2-byte IDs, EOT separators; example = T+1 consecutive tokens; x first T, y shifted left by one; position i predicts token i+1; T=1,024 in real run; B windows stacked = micro-batch B by T. "Get the shift wrong and the loss becomes a lie." -> A, small worked example with five tokens.
- L1 Loader job: given B and T, return x and y of shape B by T, y = x shifted by one. -> A.
- L2 Hold out val before anything: split by file, first shard val, rest train. Never split random windows from one file: windows overlap, same sentences in both. -> A; B suggests random split, A corrects.
- L3 Tempting loader picks B random starts each step: sampling with replacement. -> A.
- L4 Predict: one million windows, draw one million with replacement: about 63% seen; each window missed with chance (1 - 1/n) per draw, goes to 1/e ~ 0.37; 37% never seen, many seen twice. Fix: shuffle list of window starts once per epoch and walk it, every window exactly once. -> A asks, B guesses (wrong, "nearly all"), reveal in words.
- L5 Keep integers small until last moment: slice uint16, convert to int64 (embedding wants long), move to GPU. On Spark CPU and GPU share memory, but .to cuda still goes through allocator; noise at these sizes. -> A, short.
- M1 GPT-2 124M config: 12 layers, 12 heads, width 768, context 1,024. -> A.
- M2 Term embedding table: one row per token; lookup returns that row. Tie input embedding and LM head: saves 38.6M params, what GPT-2 did. Tied total 124,475,904 (counted with PyTorch); 85M in blocks, rest embeddings. Untied: 163M. -> A; B asks why tying is ok? keep short.
- M3 Pad vocab to 50,304 = 50,257 rounded up to a multiple of 128; extra 47 rows never targets, model learns near-zero probability; GPU matmul hardware works in tiles, multiples of 64/128 fill exactly; Karpathy measured a few percent speedup. Theme: numbers hardware likes aren't numbers model needs. -> A; B skeptical "adding rows makes it faster?"
- M4 Init like GPT-2: normal std 0.02 for linear and embedding weights, biases zero, the two residual-writing projections (attention output, MLP output) scaled by one over square root of two times layers, so the residual stream doesn't grow with depth. -> A, in words; worked: 12 layers -> divide by sqrt 24, about 4.9 (derived).
- E1 Term cross-entropy: per position minus log of probability given to correct next token, averaged; zero only if certain and right. Term nats: natural log units, one nat ~1.44 bits. Example: probability 0.05 -> about 3.0. -> A with example.
- E2 Predict init loss: about ln(50,257) = 10.82; small random weights -> logits near zero -> softmax near uniform, each token ~1/50,257; minus ln(1/V) = ln V. Padded 10.83, same. Measured 10.98 at init (logits small not zero). 10.8 to 11.2 healthy. 68 means confidently wrong: init far too large; std 1.0 instead of 0.02 gave 68.2; spends first thousand steps undoing init, often never recovers. -> A asks, B guesses wrong ("random so huge" or "zero"), reveal.
- E3 Cheapest sanity check: catches broken inits, wrong vocab sizes, mismatched loss reductions, labels from wrong tokenizer. -> A.
- E4 Term perplexity: e to the loss; "as uncertain as choosing uniformly among this many tokens". Ladder: 10.83 ~50,000 random; 7 ~1,100 knows common tokens, not order; 5 ~150 local patterns, word salad with structure; 4 ~55 mostly grammatical, topic drifts; ~3.3 ~27 where 124M ends on web text after a few billion tokens, paragraphs hold a topic; 0.05 ~1.05 impossible, bug. -> A walks it as a story of the model growing up, not a table.
- E5 Warnings: losses comparable only on same tokenizer and same val text (3.3 FineWeb vs 1.5 TinyStories compares datasets, stories more predictable). Small differences matter: 0.02 nats consistent drop is real improvement; 0.05 cost is real regression. -> A; B voices "0.02 is noise".
- O6 Term AdamW: Adam with decoupled weight decay; Adam keeps running average of each weight's gradient (momentum) and of its square, divides one by sqrt of the other, each weight own step size. GPT-3 settings: betas 0.9 and 0.95, epsilon 1e-8, weight decay 0.1. 0.95 instead of 0.999 forgets squared average faster, helps when gradient sizes swing. -> A.
- O7 Term weight decay: shrink every weight slightly toward zero each step; regularisation. Apply to 2-D matrices (linear + embedding), not biases or LayerNorm gains/offsets; decaying a LayerNorm gain scales down that layer's output. Rule: decay if dim >= 2. 124,354,560 decay vs 121,344 no-decay (counted). Empty or tens of millions -> off. -> B voices "decay everything, it's regularisation"; A corrects.
- R1 LR most important number; within factor of two of good and most else stops mattering. -> A.
- R2 Shape: linear warmup from near zero to peak over a few hundred steps, cosine decay to ~10% of peak by last step. -> A.
- F3 Figure 003: peak 6e-4, 300 warmup steps, cosine to 6e-5 at step 5,000; warmup ~5% of run, a sliver, protects step 0; slow tail where last few hundredths of a nat come from. -> A describes the shape.
- R3 Warmup why: at step 0 Adam averages empty, first steps oddly sized; random network's gradients wild; full step can throw model somewhere it never recovers. GPT-3 Small warmed up over 375M tokens; few hundred steps of 0.5M tokens same spirit. -> A.
- R4 Peak: 6e-4 GPT-3 Small, safe start; Karpathy found 124M tolerates about 3x; find your own with sweep. -> A.
- R5 Decay: early big steps fast progress; late the loss surface is a narrow valley, big steps bounce off walls; lower LR settles to floor; extra dip in last fifth. -> A; B voices "why not keep it high".
- B1 Batch size in tokens per optimizer step, not sequences. GPT-3 Small ~0.5M; nanoGPT 2^19 = 524,288; with T 1,024 = 512 sequences. -> B voices "batch size 16" wrong model; A corrects.
- B2 Term gradient accumulation: several small forward/backward passes, add gradients, one optimizer step; mathematically same as big batch, slower per step, lighter on memory. E.g. 32 micro-batches of 16 by 1,024. -> A.
- F4 Figure 004: 32 micro-batches each forward+backward with loss divided by 32; .grad adds up; after last one clip norm to 1, log the norm, optimizer step, zero grad; 32 x 16 x 1,024 = 524,288; bigger micro-batch if memory allows, fewer fatter passes run faster. Divide loss by number of micro-batches or you sum 32 losses. -> A.
- B3 Why not just small batch: batch size is a hyperparameter of the recipe; 6e-4 tuned for 0.5M-token batches; smaller batches noisier, want smaller LR; change one, changed the other; keeping 0.5M means published numbers apply. -> B asks (real question); A answers.
- G1 Term gradient clipping: before step measure L2 norm of whole gradient, all params together; if above threshold scale down; direction kept, size capped. Occasional giant gradient (weird doc, rare token) can undo hours. Clip at 1.0. clip_grad_norm_ returns norm before clipping: log it every step. Healthy norm settles below 1 after early phase, drifts slowly. Spikes in norm come before spikes in loss: early warning. -> A.
- S1 Four switches: don't change what model learns (within noise), change tokens/s. -> A.
- S2 bf16 autocast: matmuls in bf16 on tensor cores; weights, optimizer state, softmax and loss stay fp32. Term bf16: same exponent range as fp32, fewer digits; no overflow/underflow trouble, no loss scaling, unlike fp16. No gradient scaler needed; that's fp16's problem, why everyone switched. -> B voices diagnostic wrong model ("bf16 is the more precise one, fp16 the wide one"); A corrects, re-explains range vs precision briefly.
- S3 TF32 for leftover fp32: set float32 matmul precision "high", fp32 matmuls use tensor cores at reduced precision; free speed, harmless. -> A, short.
- S4 Flash attention: scaled_dot_product_attention with is_causal; fused kernel never writes the T by T attention matrix to memory; re-explain briefly. -> A.
- S5 torch.compile: fuses chains of small ops (add, LayerNorm, GELU, dropout) into single kernels; matters more on Spark: 273 GB/s spec bandwidth low relative to compute, so every unfused elementwise op reading and writing a whole tensor is relatively expensive. First step a minute or more compiling. How much faster you'll measure. -> A; re-explain bandwidth-bound idea briefly.
- S6 Fused AdamW if supported: optimizer update one kernel instead of loop over tensors. -> A, one line.
- C1 Loss-curve explorer intro: shape tells far more than final number; six curves; illustrations shaped from real behaviour, not measurements; blue noisy train, black val, LR strip on log scale underneath; log step axis to see first hundred steps. -> A describes as you'd click through.
- C2 Good run: starts near ln V, falls several nats in first couple hundred steps, grinds slowly; val on top of train; small extra drop at end as LR decays. Means: common tokens, then phrases, then longer structure; val ~ train = generalising. Do: keep as reference. -> A.
- C3 LR too high (10x): fast start, faster than good for a while; spikes that recover less each time; jump to flat line ~7 that never comes back. Means: overshoots, Adam averages polluted, weights land where model forgot all but token frequencies (unigram), or NaN. Do: cut peak LR 2-3x; check clipping on; look at grad norm before each spike. -> A; B reacts to "faster at first".
- C4 LR too low (1/10): smooth, slow, still falling steeply at end, about a nat above good. Means: nothing broken, compute spent badly. Do: raise 3x, rerun short; best LR just below the one that spikes; why you sweep. -> A.
- C5 No warmup: drops then jumps back up within first hundred steps, sometimes above start; recovers, ends a little worse. Means: random weights, no Adam history, huge first updates. Do: linear warmup few hundred steps, a few percent of run; nobody trains a transformer without it. -> A.
- C6 Data bug (unshifted): plunges toward zero in a few hundred steps; train and val agree perfectly; looks amazing. Means: bug; 124M on web text lands ~3, not 0.05; each position predicts token it can see, learns to copy. Same family: causal mask leaking future, val also in train. Do: too good to be true is; print decoded x,y pair; train on random tokens. -> B: "that's the one I'd be thrilled about"; A.
- C7 Tiny data: train keeps falling with small cliff each time data repeats; val follows, bottoms out, turns up. Means: memorising; widening gap is overfitting. Do: more fresh data or stop at val minimum; Chinchilla-style runs see each token ~once, rare in pretraining unless dataset too small or loader replays a shard. -> A.
- C8 Patterns to burn in: first number is ln V, if not near 10.8 stop; too good is a bug: 124M on web text doesn't reach 1; measured on Mac: tiny GPT on random tokens, correct pipeline can't beat ln V, with y = x loss fell 10.5 to 5.8 in 100 steps; random-token training is a two-minute leak test; spikes that recover are a warning, that don't are a verdict (lower LR, check clipping, look at norm); still falling steeply at end = stopped early or LR low; val pulling away = overfitting, shouldn't happen in single-epoch, suspect data. -> A, as a doctor's checklist in speech.
- C9 Habits: val on a fixed set (say 20 batches, same each time) so val moves only when model changes; always plot new runs on top of baseline, same axes; most "did my idea work?" answered by whether new curve is below old at same step. -> A.
- X1 Chinchilla 2022 (DeepMind, Hoffmann et al.): 400+ models, different sizes and data, different budgets; fixed compute, best split: grow together, ~20 tokens per parameter. Kaplan 2020 favoured bigger models; Chinchilla: most big models undertrained. -> B voices "bigger model is always better" wrong model; A tells story.
- X2 124M -> ~2.5B tokens, compute-optimal = cheapest way to train to a loss. Many go far past on purpose: Llama 3 8B over 15 trillion tokens, small model trained long cheaper to serve; trade about inference, not training. -> A.
- X3 6 FLOPs per param per token: forward one multiply + one add per weight per token = 2N; backward two things per layer, grad wrt inputs (pass back) and wrt weights (update), each ~forward = 4N. Total 6ND. -> A with worked reasoning; re-explain FLOP.
- X4 Ignores attention scores: adds 12 x layers x width x T per token; here 113M on top of 747M, ~15% more, fairer ~860M FLOPs per token. Neither exact. -> A, words.
- X5 124M x 2.5B: ~1.9e18 FLOPs (2.2e18 with attention). -> A, said as "about two billion billion" plus name.
- X6 Spark ~125 TFLOP/s dense bf16 at most: not published spec, estimate derived in bandwidth-bound from marketing number; you'll measure. Re-explain briefly. -> A.
- X7 Term MFU: FLOPs your model's math needs per second (tokens/s x FLOPs per token) over hardware peak; counts only useful math; from Google's PaLM paper. Well-tuned large runs 40-60%; llm.c on 8 A100s ~60% (10B tokens in 90 min ~1.85M tokens/s); single small model on Spark 30-45% would be good; unknown, measure. -> A.
- X8 At 40% (50 TFLOP/s achieved): 1.9e18/5e13 ~ 37,000 s ~ 10 hours (12 with attention); at 25% 17-19 hours. Overnight run: one full-size run per day; learn hyperparameters on smaller faster runs first. -> A worked out; B says "one shot a day".
- F6 Figure 006 compute calculator: sliders params N, tokens D, MFU, peak (Spark 125, A100 312, H100 989 spec dense bf16); outputs total compute, wall clock, tokens/s, tokens per param; notes: under 5 tokens/param undertrained, near 20 the Chinchilla sweet spot, well past 20 wasteful for training but common for serving; over three days on one Spark -> shrink D. Reverse panel: enter measured tokens/s, get MFU. 6N ignores attention, +-20%. -> A describes what you see as you drag.
- Q1 Karpathy "A Recipe for Training Neural Networks" (2019): nets fail silently, be paranoid, build from verifiable things. -> A.
- Q2 Step 1 look at the data: decode windows to text, read; EOT between docs; print x,y side by side, y = x moved left. -> A.
- Q3 Step 2 init loss ~ ln V. -> A, quick callback.
- Q4 Step 3 overfit one batch: few hundred steps on single small batch; must go near zero, memorising 256 tokens trivial. Measured on Mac: 4-layer GPT, batch 4 x 64, LR 1e-3: 10.87 -> 0.08 in 50 steps, 0.005 by step 300. Plateau at 5 -> broken between loss and weights: wrong targets, detached tensors, optimizer given wrong params, LR zero. -> A; B voices "overfitting is bad".
- Q5 Step 4 random tokens for a minute: must stay at or above ln V; dropping means model sees targets. -> A.
- Q6 Step 5 print LR first few steps: warmup happening? off by an order of magnitude most common silent bug. -> A.
- Q7 Step 6 short real run on TinyStories or small FineWeb slice: looks like good run? samples get better? Step 7 only then long run, keep notes. -> A.
- K7 Checkpoints: a 10-hour run will be interrupted (reboot, OOM, Ctrl-C you regret); everything to continue: model weights from uncompiled model (compile prefixes keys with _orig_mod), optimizer state (Adam's two averages, twice model), step number (LR schedule), data position (epoch, shuffle seed, index), config and ideally git commit. -> B voices "just save the weights"; A lists.
- K8 Crash-safe save: temp file in same dir, fsync, os.replace, fsync the directory; half-written checkpoint worse than none since it overwrote the good one; keep last two or three plus milestones. Re-explain why. -> A.
- K9 Size: fp32 weights 124.5M x 4 ~ 0.5 GB, Adam state 1.0 GB, ~1.5 GB per checkpoint. -> A.
- SA1 Sampling: model gives probability for every token; how you pick changes text a lot, none changes model. -> A.
- SA2 Greedy: most likely; deterministic; small models loop ("the the the", one sentence forever). -> A.
- SA3 Temperature: divide logits by tau before softmax; below 1 sharpens (safer, duller), above 1 flattens (surprising, nonsense); 1 is model's own. -> A.
- SA4 Top-k: keep k most likely, renormalise, sample; cuts long tail, each rare but collectively picked once every few words. -> A; B asks why the tail matters (real).
- SA5 Top-p, nucleus (Holtzman et al. 2019): smallest set summing to at least p, e.g. 0.9; adapts: sure -> two tokens, unsure -> hundreds. -> A.
- SA6 Start: temp 0.8 to 1.0 with top-p 0.9 or top-k 50; fix prompt and seed so checkpoints comparable. -> A.
- V1 Val loss main number: cheap, smooth, what you optimised; but doesn't tell you whether model knows anything; add one task eval. -> A.
- V2 HellaSwag (Zellers et al. 2019): context + four endings, one right, three machine-generated traps; no instruction following: average loss on each ending's tokens given context, pick lowest; random 25%; Karpathy measured GPT-2 124M ~29.5% on 10,042 val examples; barely above chance, which is why it's a good small eval: it moves. Standard error ~0.45 points; differences under ~one point between runs are noise. -> A; B "29.5 sounds terrible".

## Build It

- BI0 Everything on the Spark except noted; one folder under git; commit before every run so every result points at code. -> A.
- t0 Setup: NGC PyTorch container the low-friction path for ARM + Blackwell; pip aarch64 wheel may work; check NVIDIA docs. Install tiktoken, datasets, numpy, matplotlib; check CUDA available. Measure matmul peak: big bf16 matmul 8192 square, warmup, synchronize; n by n matmul = 2 n cubed FLOPs; write down plateau = measured peak for MFU, alongside 125 estimate. -> A, one setup sentence then the peak measurement.
- t1 Tokenize: stream the 10BT sample, tokenize in parallel, 100M-token shards (200 MB each), stop after budget (2.7B: val shard + ~2.6B train); shard 0 is val; each doc gets EOT in front; assert fits uint16. Time it, note tokens/s (could on-the-fly keep up? no, check). Same for TinyStories, smaller shards. Dataset names can change. Read data back: memmap a train shard, 300 tokens from random offset, decode, read, find an EOT. -> A.
- t2 Loader (his): memmap every shard; list of (shard, start) positions, stride T, each needing T+1 tokens; seeded shuffle; next_batch returns int64 x,y on GPU; walk list, at end bump epoch and reshuffle; state dict with epoch, position, seed to resume exactly. Test: x from position one on equals y up to last. Val: no shuffle, same first 20 batches. -> A.
- t3 Model checklist: config 12/12/768/1024/50304; LM head tied to token embedding; init 0.02, residual projections scaled, biases zero; SDPA causal; forward returns logits and loss, loss in fp32 over flattened logits; param count 124,475,904 (untied 163M). Agent reviews diff against nanoGPT's model.py. -> A.
- t4 sanity.py three checks PASS/FAIL: init loss 10.8-11.2 next to ln 50,257; overfit one batch B 4 T 64 AdamW 1e-3, 300 steps, under 0.1 well before end; random tokens 100 steps never meaningfully below ln V, then flip y = x and watch it fall. Run on Mac CPU with 4-layer model too. -> A.
- t5 Training loop (core, his): config: total batch 524,288, micro B 16 T 1,024, max LR 6e-4, min 10%, warmup 300, max steps 4,800 (~2.5B tokens), wd 0.1, clip 1.0, eval every 250, checkpoint every 500, compile on. get_lr; two param groups, print sizes, AdamW betas, eps, fused. Atomic save. Per step: set LR on every group; accumulation = total / (B T), assert divides; per micro-batch: next batch, autocast, loss / accum, backward; clip, step, zero grad; synchronize, time, log. Log line: step, loss, lr, norm, dt, tok/s, mfu (example step 1200 loss 3.81, 9 s, 58,170 tok/s, 39.9%). Log to stdout and log.jsonl. MFU = tok/s x (6N + 12 L d T) / peak, vs both peaks. Val every 250 on fixed 20 batches under no_grad. --resume restores everything incl. loader; resumed next loss matches uninterrupted. Then 200 steps on TinyStories with 6-layer, check good-run shape. -> A, with the example log line said aloud.
- t6 LR sweep: 6 layers, width 384, 6 heads, ~30M params (lots embedding), batch 65,536 (16 x 1,024 x 4), warmup 30, 300 steps, ~20M tokens per run, few minutes each. LRs 1e-4, 3e-4, 1e-3, 3e-3, 1e-2; change nothing else, same seed and data order. plot.py: five EMA-smoothed curves with faint raw behind; final val vs LR on log x. Agent reviews plot and conclusion. Expect U: too low slow, too high unstable, bottom just below where instability starts. Caveat: best at 30M not exactly best at 124M (smaller tolerate higher); sanity-check 6e-4, see the U. -> A; B asks why not sweep at 124M -> one run a day.
- t7 Throughput: 124M, 30 steps four ways, steady state tok/s (skip early steps and compile time): fp32 no compile; bf16 no compile; bf16 + compile; plus bigger micro-batch 32 or 64. MFU vs both peaks. Use reverse calculator to check, set max steps to fit a night. -> A.
- t8 Main run in tmux (dropped SSH doesn't kill it), output tee'd to file; commit first. LOG.md entry before start: date, commit, config, hypothesis (matches build-nanogpt curve at equal tokens within ~0.05), start time, expected 10-12 h at 40% MFU; result filled after. Check after 10 min (warmup done? loss below 7?), go to bed. -> A.
- t9 sample.py: load into uncompiled model, encode prompt, 200 tokens, temperature/top-k/top-p flags; implement top-p: sort descending, cumulative sum, mask after sum passes p (keep at least one), renormalise, sample. Fixed prompt "The most important thing about learning is" and seed; step 500, 2,000, final into LOG.md; final with greedy, 0.7, 1.0, 1.5 with top-p 0.9. -> A.
- t10 Eval: val loss + perplexity on first 100 val batches (more than 20 for steadier); HellaSwag on 10,042: original JSONL in rowanz/hellaswag repo, build-nanogpt's hellaswag.py shows loader; four sequences context+ending, mean CE over ending tokens only, lowest wins; also evaluate OpenAI's GPT-2 124M from Hugging Face with same code as reference. Agent reviews for classic bugs: scoring context tokens, off-by-one in ending positions, padding in mean. -> A; B asks why evaluate OpenAI's.
- DW Done when: sanity passes and saw y = x fail; sweep plot from five LR-only runs; tok/s and MFU four settings, know which switch bought most; ~2.5B run finished (or resumed then finished) with log and LOG.md; readable paragraphs; val loss, perplexity, HellaSwag for yours and OpenAI's by same code. -> A, folded into narrative, not a list.

## Measure

- ME1 Expect column = best guess from arithmetic and published reproductions; Spark-specific unknown. -> A.
- ME2 Init loss 10.8-11.2 (got 10.98); overfit loss under 0.1 (got 0.005 on 4-layer); measured matmul peak at most 125 (check). -> A.
- ME3 tok/s: fp32 lowest (no tensor cores for most math); bf16 a few times fp32 (tensor cores); bf16+compile +10-50% over bf16 (check), fused ops, matters more on low bandwidth. -> A.
- ME4 MFU best 25-45% approx; 40% -> ~58K tok/s for this model; hours for 2.5B ~10-19. -> A.
- ME5 LR sweep best around 1e-3 to 3e-3 for 30M (check); smaller tolerate higher. -> A.
- ME6 Final val ~3.2-3.5; perplexity ~25-35; HellaSwag yours ~27-30%; OpenAI's in your harness ~29-30%, if not your harness has a bug; checkpoint ~1.5 GB. -> A.
- ME7 MFU is the honest number: under 20% GPU waiting on data loading (one pegged CPU core in htop), Python overhead (micro-batch too small), unfused ops (compile off), each its own fix; over 60%, check FLOP count and timer, probably forgot synchronize. -> A; B voices "high MFU is great".
- ME8 Val loss vs published curve at same tokens: within a few hundredths = trusted baseline; 0.2 worse = recipe differs, finding it teaches more than any new idea. -> A.
- ME9 Samples vs loss: step 500, 2,000, final next to val losses builds the instinct for "what does 4.0 look like". -> A.

## Break It

- BK0 Each a short run (few hundred steps of 30M) plotted with a good run; see failure once to recognise it later. -> A.
- BK1 Unshifted targets y = x: loss dives to zero, train and val superb; samples garbage. Loss measures what you told it to; leaking val into train is the same bug, slower. -> A.
- BK2 No warmup, 5x LR: watch first 100 steps on log axis and grad-norm column: norm spikes before loss. Then clipping off: diverge? Warmup and clipping exist for the first and worst moments. -> A.
- BK3 Forget dividing by grad_accum; Predict: is it like a 32x LR? Much less bad: with SGD it would be 32x step; Adam divides each gradient by sqrt of its own running squared average, scaling by 32 mostly cancels (only epsilon notices). What changes: norm 32x larger, clipping at 1.0 fires every step, turning optimizer into "normalised-gradient Adam"; logged loss 32x too big if you log the sum. Expect small difference, measure. Knowing why a bug is harmless or harmful requires knowing what the optimizer does with scale. -> A asks, B says yes 32x (wrong), reveal.
- BK4 Replay one shard: reshuffle and restart after first 100M-token shard; several passes; tiny-data curve: train drops with cliff each pass, val turns up. Rising val in pretraining almost always a data-pipeline bug. -> A.

## Explain It Back (substance, no quiz)

- EB1 Init loss = ln V: logits near zero, uniform softmax, -ln(1/V) = ln V = 10.82; much higher = confidently wrong, big logits: init too large, missing scaling, wrong vocab size; much lower = leak; stop before training. -> covered in E2 + ending.
- EB2 Recipe walk-through: AdamW 0.9/0.95, wd 0.1 on matrices only; 0.5M tokens with accumulation dividing loss; warmup + cosine to 10%; clip 1.0 logged; bf16/flash/compile don't change learning; checkpoints with optimizer, step, data position, atomic. -> A pulls together once near end of Idea ("the whole recipe in one breath").
- EB3 Compute budget: 6ND; 20 tokens/param; N ~ sqrt(C/120), D ~ 20N; 124M -> 2.5B, 1.9e18; /(peak x MFU); 10 h on Spark at 40%; serving lots -> go past 20 with smaller model, inference scales with N. -> A in X-section, incl. the sqrt(C/120) rule in words with a worked example.
- EB4 Diagnose: dropped, spiked twice, flat at 7: LR too high (or warmup short, clipping off); spikes were overshoots it recovered from; last knocked weights to frequency-only (flat in the 7s on GPT-2 tokens); look at grad norm before spikes; restore last checkpoint before first spike with 2-3x lower LR or restart; check clipping; spikes at the same step across runs -> inspect that batch, corrupted doc. -> A/B exchange in curve section or near end.
- EB5 MFU scaling: definition; bigger models usually higher MFU on same GPU (bigger matrices, fixed overheads smaller fraction: Python, kernel launches, bandwidth-bound elementwise); 8 GPUs add communication: average gradients every step, MFU drops unless overlapped, more on slow interconnects; distributed training lesson. -> A in MFU/Measure section.

## Go Deeper / Connections

- GD One closing sentence: Karpathy's build-nanogpt video and the recipe essay. -> A, late.
- CN Connections: this run is the baseline for data pipelines (change only data), draft model (same loop, distillation loss), architecture comparison (creative ideas finally get a fair test), distributed training (when one night per run isn't enough). Builds on virtual memory, files and disks, number formats, training memory, flash attention, bandwidth bound, tokenizers (said inline where they come up). -> A one sentence before the ending.

## Flow

1. Problem: the mush-samples scene; B "a bug would crash"; silent factor-of-two settings; baseline + checklist.
2. Origin: GPT-2, GPT-3 numbers, nanoGPT, llm.c; "assume yours is wrong first".
3. Whole loop on one page (fig 1) + silent bugs in arrows.
4. Data choice; tokenize once to uint16; EOT and packing; memmap; x/y shift (fig 2) with tiny worked example.
5. Loader: val split by file; Predict 63%; ints small.
6. Model: config, tying, vocab padding, init.
7. Loss meaning: cross-entropy, nats, Predict init loss, perplexity ladder, warnings.
8. Optimizer: AdamW, weight decay groups (B wrong model).
9. LR: warmup + cosine (fig 3).
10. Batch in tokens, accumulation (fig 4), why keep 0.5M.
11. Clipping.
12. Speed switches; bf16 wrong model.
13. Recipe in one breath (EB2).
14. Loss curves explorer (fig 5), six cases, patterns, habits, diagnose-the-spikes (EB4).
15. Chinchilla, 6ND, attention term, Spark peak, MFU, ten hours, one run a day, calculator (fig 6), sqrt(C/120) (EB3).
16. Debugging recipe seven steps.
17. Checkpoints.
18. Sampling.
19. Evals: val + HellaSwag.
20. Build It t0-t10, walked as the order you'd actually do them.
21. Measure expectations and what to look for; MFU scaling (EB5).
22. Break It four, with the grad-accum Predict.
23. Connections sentence, Go Deeper sentence, ending: B restates, A sharpens.
