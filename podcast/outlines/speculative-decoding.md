# Outline: speculative-decoding

Source: src/lessons/speculative-decoding.mdx. Curriculum entry: "Speculative decoding." Question: how
can a small model make a big model faster without changing its output at all? Why: the trick he is
fascinated by; implementing it teaches sampling, verification and probability. Diagnostic gap
(CLAUDE.md): doesn't know what "output distribution" means precisely, doesn't see why speculative
decoding is exact. Both must land in plain words, with B voicing the natural confusion.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereq recap: decode reads every weight once per token (bandwidth-bound lesson); 8B in bf16 is about 16 GB; Spark pipe about 273 GB/s; ceiling about 17 tokens per second; math units idle more than 99% of each step. -> A re-explains in the opening scene, with the "drag all sixteen gigabytes through the pipe" picture, so he never has to recall the earlier lesson.
- T2 Prereq recap: KV cache = stored keys and values of every past token in every layer, so the next step doesn't redo them. -> A, briefly, when the cache first matters (verify is cheap in the other dimension) and again at rollback.
- T3 Prereq: his server, harness and scoreboard from the baseline lesson. -> A, one sentence at Build It.
- "Today" bullets skipped as a list; each is an item below.

## The Problem

- P1 Scoreboard: Spark decodes Llama 3.1 8B at about 13 tok/s under a ceiling of about 17; every token drags 16 GB through a 273 GB/s pipe; GPU math waits more than 99% of each step. -> A opens on the scoreboard number.
- P2 The cruel part: prefill uses one weight read for hundreds of tokens; decode can't because token 5 depends on token 4. -> A; B asks why decode can't just do the same, A answers with the dependency.
- P3 Thought experiment: an oracle whispers the next four tokens; feed all four at once like a tiny prefill; one pass gives predictions at every position; if right, four tokens for one weight read. -> A.
- P4 No oracle, but Llama 3.2 1B reads about 2.5 GB per token instead of 16, guesses ordinary text surprisingly often, is wrong a lot too; need a way for the big model to check, keep the good ones, fix the first bad one, all in one pass. -> A, B: "so the big one just checks the small one's homework".
- P5 Diagnostic quote: "I know it follows the same distribution... a big model will stop it and correct it if it's out of distribution." Close but hides the interesting part: rejections happen at random, with a probability chosen so final text is statistically indistinguishable; same distribution, provably; you'll write the proof and check it with a chi-square test. -> B voices this exact mental model as their own; A corrects.
- PR1 Predict: 8B greedy alone vs with 1B draft greedy: how different? And at temperature 1 sampling? Answer: greedy is token-for-token identical apart from rare floating-point near-ties; sampling runs differ, but so do two runs of the 8B alone; claim is about the distribution, chance of any answer is the same; can't tell from any number of outputs; draft changes how fast, never what. -> A asks, B guesses ("slightly different, a bit worse"), A reveals.

## Origin

- O1 Speculative execution in CPUs: guess which way a branch goes, run it before knowing, throw away if wrong. -> A, story start.
- O2 2018 Stern, Shazeer, Uszkoreit, "blockwise parallel decoding": predict several, verify, keep the longest correct run; greedy only. -> A.
- O3 Missing piece: sampling; real products sample with temperature, no single right token. -> A; B: "so what's correct mean then".
- O4 Nov 2022 Leviathan, Kalman, Matias (Google), "Fast Inference from Transformers via Speculative Decoding"; Feb 2023 independently Charlie Chen and colleagues (DeepMind), "Accelerating LLM Decoding with Speculative Sampling". -> A.
- O5 Both borrowed rejection sampling (propose from an easier distribution, keep each proposal with a carefully chosen probability). -> A, term explained inline.
- O6 Leviathan: 2 to 3x on T5-XXL; Chen: 2 to 2.5x on Chinchilla 70B with a 4B draft; every serious engine ships a version today. -> A.

## The Idea: output distribution

- D1 Last line of a transformer: final hidden vector times output matrix gives one number per vocab entry; Llama 3 has 128,256. Logits = raw scores, any real number, bigger more likely. -> A, said as "one score per word-piece in the vocabulary".
- D2 Softmax: exponentiate each, divide by total; all positive, sum to 1. -> A, plain.
- D3 That list IS the output distribution. Not a vibe, not a style: a vector. One probability per possible next token, at every step, given everything so far. -> A, with B having said the vague "kind of the model's style" version first.
- D4 Example: "The capital of France is": Paris 0.82, a 0.05, the 0.04, long tail for the other 128,253. -> A.
- F1 Figure 001: prefix into model, logits then softmax; bars Paris 0.82, a 0.05, the 0.04, located 0.03, not 0.02, all others 0.04 total; greedy picks biggest; sampling lays the list out as slices of 0 to 1, roll u = 0.85 lands in "a". -> A describes the ruler: Paris takes the first eighty-two percent of the stick, roll of point eight five lands just past it in "a".
- D5 Decoding strategy = rule turning the vector into a token. Greedy = argmax ("which entry is biggest, not how big"); deterministic. -> A.
- D6 Sampling = weighted die; Paris 82% of time, a 5%; temperature divides logits before softmax: below 1 sharpens, above 1 flattens, near 0 approaches greedy. Top-k, top-p are tweaks. -> A.
- D7 Sequence probability = product of each token's probability given those before. Two procedures "follow the same distribution" if every possible output sequence has the same probability under both. That's the bar. -> A; B restates in own words; A sharpens.
- D8 Letters: p = target 8B's vector, q = draft 1B's vector at the same step with same prefix; both 128,256 numbers summing to 1. -> A: "I'll call the big model's list p and the small model's list q" and then mostly says "the big model's number" / "the draft's number".

## The Idea: why checking is cheap

- C1 Decode step for one token reads all 16 GB, about 1 FLOP per byte, tensor cores idle. FLOP explained as one multiply or add. -> A.
- C2 Feeding 5 tokens instead of 1 changes only the math: each weight once loaded used 5 times; bytes don't change. -> A, B pushes: "five times the work though?"
- C3 Ridge point: peak math rate divided by memory bandwidth; below it memory-limited, above it math-limited; on the Spark in the hundreds of FLOPs per byte. 1 to 5 still deep in memory-bound. Step takes about the same time. -> A.
- C4 8B scores 5 positions in one pass: vector after text, after text + guess 1, after guesses 1 and 2... = verification; a mini-prefill. -> A.
- C5 KV cache makes it cheap in the other dimension: past already cached, only 5 new positions computed. -> A, with KV cache re-explained.
- C6 First task measures it: 1, 2, 4, 8, 16, 32, 64 new tokens on a cached prompt; expect flat for small counts then bending upward. -> A, brief, forward pointer.

## The Idea: draft, then verify

- V1 Draft model: small, fast, guesses; its guesses never appear unless the target approves. Target model: the big one whose distribution you want; also called the verifier. -> A.
- V2 Step 1 Draft: 1B generates K tokens one at a time, records its q vector at each step; K small passes of 2.5 GB. -> A.
- V3 Step 2 Verify: 8B runs once over text + drafts, returns K + 1 vectors: after text, after d1, ..., after dK. -> A; B asks why K + 1 not K.
- V4 Step 3 Accept left to right, stop at first rejection. -> A.
- V5 Step 4 Fix or bonus: at rejection sample replacement from a corrected distribution; if all K kept, one more free token from the last vector. -> A.
- V6 Every round emits at least one, at most K + 1. Worst round still emits one correctly distributed token for one 8B pass plus wasted drafting. -> A.
- F2 Figure 002: plain = four 8B passes for sat on the rug; speculative = 1B drafts sat on the mat (four quick steps at 0.2 each), one 8B pass over 5 positions costing 1.1; keep sat, on, the; reject mat, fix with rug; 4 tokens in about 1.9 passes instead of 4; one 8B pass about 60-75 ms on the Spark in bf16; if all 4 kept, bonus 5th. -> A tells it as a timeline; B does the arithmetic out loud.

## The Idea: the acceptance rule

- R1 Draft proposed x; you have q(x) how likely draft thought it, p(x) how likely target thinks it. -> A.
- R2 Greedy case: keep x if it equals target's argmax, else emit target's argmax and stop; output token-for-token same as 8B greedy because every emitted token is the 8B's argmax. -> A.
- R3 Sampling: no single right answer; Paris right 82% of the time, a right 5%; can't ask "is x correct", must ask "how often should x come out, how often does the draft propose it". -> A; B voices "but if the big model picks Paris and draft said a, a is wrong" and A corrects.
- PR2 Predict: p(a)=0.25, q(a)=0.40, keep probability? 0.25/0.40 = 62.5%; 0.40 x 0.625 = 0.25; excess 15% thrown back. Second: q=0.10, p=0.25: keep always, only gets 10%, missing 15% must come from elsewhere: rejection step must produce "a" extra often: the residual. Together: keep with probability min(1, p/q). -> A asks, B works it out (gets first half, stumbles on second), A explains.
- R4 Rule in words: target likes it at least as much as draft -> always keep; likes it less -> keep the fraction "big over small". On rejection don't draw from p again; draw from the residual. -> A, no symbols.
- R5 Residual: for each token, how much more probability the target gives it than the draft does, zero if the draft already over-covers it, rescaled to sum to 1; only tokens the draft was too stingy with. -> A, with a concrete example.
- R6 Rejection isn't "out of distribution, ask the big model again"; it's "landed where the draft over-covers, redirect to where it under-covers". Every unit of probability the draft put in the wrong place gets moved, by rejection, to exactly where it was missing. -> A, ties back to B's diagnostic quote.
- F3 Figure 003, toy vocab of six words: THE, A, CAT, DOG, SAT, ON; p = 0.40, 0.25, 0.15, 0.10, 0.06, 0.04; q = 0.20, 0.40, 0.10, 0.05, 0.20, 0.05. Solid overlap = min(p,q) = probability proposed and kept; leftover wash = residual. Sample 1, Sample 10,000. -> A describes the two bar charts on top, the overlap, the leftover, the histogram landing on p's tick marks.
- F3a Defaults: alpha 0.70, 70% kept; draft over-proposes A and SAT, rejections refill THE, CAT, DOG; after 10,000 samples bars on ticks; chi-square usually under 11.07, the 5% threshold for 5 degrees of freedom; about 1 run in 20 exceeds by chance. -> A, with chi-square previewed in plain words.
- F3b Bug toggle "on reject, sample p": natural wrong version, sounds right, biased; chi-square in the hundreds after 10,000 and keeps growing with every batch. -> A; B had suggested exactly this ("why not just let the big model pick").
- F3c One guess (lookup): q all on THE; keep with probability p(THE) = 0.40, else sample p with THE removed; how draft-free methods stay exact. -> A, short.
- F3d Slide closer to p: alpha climbs to 1, residual empties; perfect draft never rejected. -> A, short.

## The Idea: why the output is exactly p

- X1 Fix one step; probability that token y comes out; two disjoint ways. -> A, as "two doors".
- X2 Way 1: draft proposed y and it was kept: q(y) times min(1, p/q) = the smaller of the two numbers. -> A with THE (0.20 vs 0.40) and A (0.40 vs 0.25) worked examples.
- X3 Way 2: rejection then residual produces y. Chance of keep = sum of overlaps = alpha. Chance of reject = 1 minus that = sum over tokens of how much p exceeds q (because p sums to 1) = exactly the residual's normalizer. So rejecting then drawing y = the excess of p over q for y. -> A with numbers: reject 0.30, residual total 0.30, THE share two thirds, 0.30 x two thirds = 0.20.
- X4 Add: overlap + excess = p(y) always (if p bigger: q + (p - q); if p smaller: p + 0). The figure was this proof drawn as bars. -> A: THE 0.20 + 0.20 = 0.40; A 0.25 + 0 = 0.25.
- X5 Nothing assumed the draft was good; bad q only costs speed. -> A.
- X6 What makes it work: chance of rejecting = total size of the residual; forced by both p and q summing to 1, not a coincidence. -> A; B: "that's the bit that felt like a magic trick".
- X7 One token to a sequence: induction. First emitted token has distribution p1; if d1 kept, d1 is the text, d2 checked against p given text + d1; continue; rejection ends round, next round from true text; bonus sampled from p(K+1) directly. Every token follows target given previous emitted tokens; full sequence probability = same product as plain sampling. -> A, said as a chain.
- X8 Conditions = bugs: q must be what you actually drew from (greedy draft's q is one-hot, all weight on one token); p computed on the true prefix (no rejected tokens in the target's KV cache); temperature, top-k, top-p applied to p before the rule and to q before drafting; speculation reproduces whatever p you feed it, warped or not. -> A, three quick ones.

## The Idea: how many tokens per pass, and the best K

- K1 Acceptance rate alpha: probability one draft is kept; for sampling = overlap of the two distributions; for greedy = how often top picks match. -> A.
- K2 Pretend each draft kept independently with the same alpha (real acceptance varies; good average, not exact law). First kept alpha, first two alpha squared... round always emits one extra. Expected tokens = 1 + alpha + alpha squared + ... up to alpha to the K. -> A, as "a coin that keeps coming up heads".
- PR3 Predict: alpha 0.7, K=4 -> 2.77; K=8 -> 3.20; K=100 -> 3.33 (1 / 0.3); caps fast; never more than 3.33 at 0.7. Simulation of 20,000 rounds: 1.70, 2.18, 2.78, 3.22 for K=1,2,4,8 vs 1.70, 2.19, 2.77, 3.20 predicted. -> A asks, B guesses big for K=100, A reveals.
- K3 Tokens per pass isn't speedup; c = cost of one draft step over one target step; round costs 1 + K times c target passes (assumes verifying K+1 positions costs about one pass). Speedup = tokens per round over round cost (Leviathan). -> A, in words.
- K4 Bandwidth predicts c about 2.5/16 = 0.16; in practice worse, small model's step dominated by fixed costs (kernel launches, Python, sampling). -> A.
- F4 Figure 004 calculator: sliders alpha, K, c; curve of speedup vs K with best K marked; readouts tokens per pass, cost, speedup, best K, verified-and-thrown-away. -> A: "as you drag the c slider the peak slides left".
- K5 Alpha sets the ceiling: 0.5 tops out about 1.6x even with nearly free drafts; 0.9 reaches 4x or more. -> A.
- K6 c sets best K and punishes greed: at 0.7, c=0.05 wants K=6 (2.35x), c=0.1 wants K=4 (about 2x), c=0.25 wants K=2 (about 1.46x); past best K extra drafts are almost never kept but always paid for. -> A.
- K7 It can lose: low alpha + high c drops below 1x. -> B guesses this, A confirms.

## The Idea: where drafts come from

- W1 Anything with known q can be a draft; trade-off alpha vs c. -> A.
- W2 Smaller same-family model: Llama 3.2 1B for 3.1 8B, or Qwen2.5 0.5B for Qwen2.5 7B; must share the tokenizer so token 1234 means same string; distilling a draft raises alpha (later draft-model lesson). -> A.
- W3 N-gram / prompt lookup (Apoorv Saxena 2023): find last 2-3 tokens earlier in the context, propose what followed; q one-hot so acceptance = p(x); useless for open writing, excellent for summarizing, editing code, document QA; c about zero. -> A, B relates to his own work (web pages, extraction).
- W4 Medusa (Cai et al. 2024): extra heads on target's last hidden state, each predicting further ahead, trained with base frozen; verifies a small tree of alternatives in one pass. -> A.
- W5 EAGLE (Li et al. 2024, then 2 and 3): tiny draft reading the target's hidden features; guesses much better than a separate small model of similar cost; among highest-acceptance; in vLLM and SGLang. -> A.
- W6 Self-speculation: target with layers skipped as its own draft (Draft & Verify, Zhang et al. 2023; LayerSkip, Elhoushi et al. 2024); no second model, same tokenizer by construction. -> A.
- W7 DeepSeek-V3 trained with multi-token prediction module usable as a draft. -> A, one line.

## The Idea: the KV cache has to forget

- KV1 During verification target writes cache entries for every draft token, including rejected ones; draft's cache has its own guesses. Rejected keys/values left in = attending to a ghost. -> A; B: "it just remembers words that never happened".
- KV2 Rollback: crop both caches back to the true text; rule: after each round crop to length of text minus one, at start of every forward feed what the cache doesn't cover; fix/bonus token never in either cache, so it's fed first next round. -> A.
- F5 Figure 005: target cache after verify: ... THE CAT SAT ON THE MAT, MAT rejected but its keys and values already written; crop; RUG fed first next round then new drafts; same for draft's cache; if all K kept, the draft is missing two tokens, dK and the bonus. -> A, describes the row of boxes.
- KV3 Contiguous cache: crop just reduces a length (Hugging Face DynamicCache has crop); paged cache like vLLM's: rewind block slots, fiddlier (later lesson). -> A, short.

## The Idea: why it helps less with many users

- B1 Speculation spends idle compute; batching spends the same idle compute serving many users per weight read. -> A.
- PR4 Predict: batch 64, K=4: 64 x 5 = 320 positions per pass, about 320 FLOPs per byte, around the ridge point; extra positions no longer free; rejected drafts = paid math thrown away (at 0.7, K=4, about 45% of verified positions discarded); 2x at batch 1 may give little or nothing at 64, can reduce throughput. -> A asks, B computes 320, A explains.
- B2 Ragged acceptance: user A keeps 4, user B keeps 0; texts and caches grow at different rates. -> A.
- B3 Production: latency tool for light load; on / larger K when few requests, down or off as batch fills; Spark (one-user box) is exactly where it shines. -> A.

## Build It

- BI0 Folder layout under inference/spec; pair = Llama 3.1 8B Instruct target + Llama 3.2 1B Instruct draft, shared 128,256 tokenizer; about 16 + 2.5 GB in bf16, room for 8B in fp32 (about 32 GB) for one test; Qwen pair alternative. -> A, one breath.
- t1 Load both, same NVIDIA PyTorch container, accept Llama 3.2 license; assert vocabularies equal; forward helper feeds new tokens on top of a cache, returns fp32 scores one row per fed token; print vocab sizes: Llama match, Qwen don't (larger models pad output matrix), slice to tokenizer length. -> A, setup in a few sentences, Qwen gotcha as the one thing that matters.
- t2 Feel it: cache a ~512-token prompt; for n = 1 to 64 feed n tokens, time it, crop back; warm up, synchronize, median of 10; both models; draft's n=1 over target's n=1 = c. -> A.
- PR5 Predict: 70 ms for 1 token -> 8 tokens within roughly 10-20%; 64 visibly more, tens of percent; 1B not 6.4x faster: fixed costs (kernel launches for 16 layers, Python, sampling) don't shrink; c of 0.25-0.4 in eager PyTorch not surprising vs 0.16; why engines use CUDA graphs and fused kernels. -> A asks, B guesses 6.4x, A corrects. CUDA graphs explained as recording the GPU launches once and replaying them.
- t3 spec_greedy vs plain greedy; invariant each cache covers all but the last token; draft K greedily, verify feeding last token + drafts (K+1 rows), walk left to right, append fix or bonus, crop both to length minus one; crop is a no-op if shorter (all-kept case: draft picks up dK and bonus next round); count rounds/accepted/rejected. Test: 20 prompts, 128 tokens, token by token; bf16 rare divergence from rounding at near-ties (top-two gap under 0.05); rerun in fp32 and they vanish; cache bugs diverge right after the first rejection every time. -> A; B asks "if it's exact why would it ever differ?"
- t4 spec_sample: draft by sampling and keep whole q; accept if uniform u < p/q (same as min(1, p/q)); on rejection sample clamped p minus q normalized; bonus from last; softmax in fp32; guard zero residual by falling back to p; accept_or_fix as own function. -> A.
- t5 Distribution test. Level 1 toy vectors 100,000 times, chi-square; correct gave 7.3 (p-value 0.20); resample-from-p about 5,000; resample-from-q about 19,000; if the bug doesn't fail loudly the test has no power. Level 2: "Name a random animal." at temperature 1; position 1 vs exact p from one target pass, 5,000 runs, merge bins with expected count under 5; position 3 vs plain sampling with a two-sample test (tests caches, rollback, bonus); KL with noise floor (bins minus one over twice N; toy 0.00096 vs 0.00103 with 125 bins and 60,000 samples). Turn off generation defaults (Llama Instruct's own temperature/top-p, HF top-k 50). 15-30 min; agent review for stats mistakes. -> A, chi-square and KL explained in plain words; B asks what "no power" means.
- t6 Sweep K = 1,2,3,4,6,8 on 20 short prompts, 256 tokens, greedy, plus K=0 baseline; alpha-hat = accepted / (accepted + rounds that ended in rejection), not accepted / drafted (drafts after the first rejection never judged, biased low); bonus: log sum of overlaps at first draft position; tokens per round measured vs formula; c from timing; speedup = plain wall time / spec wall time; plug into calculator. -> A; B proposes accepted/drafted, A corrects.
- t7 Prompt lookup: find most recent earlier match of last n tokens (3 down to 1), return up to K that followed; fallback one plain step; q one-hot: greedy unchanged, sampling keep with p(d), reject -> p with d zeroed and renormalized; three prompt sets: short chat, long passage + question, 100-line Python file with one function renamed; cross-check against HF assistant model and prompt-lookup options. -> A.
- t8 server_spec: copy naive server, replace generate thread with spec_greedy loop pushing text after each round (bursts of 1 to K+1), respect max tokens, stop on end-of-turn unless ignore-eos, keep the lock, report own completion count; best K; run bench harness same as before (concurrency 1, 4, 16, 200 requests, 256 tokens); scoreboard row with alpha and K; agent review for disconnect bug. -> A, compressed.
- DW Done-when list. -> Not read; its content is covered by the tasks above.

## Measure

- M1 Verify cost: nearly flat 1 to about 8, then rising; if 8 costs 2x of 1, something else dominates (a Python loop in forward). -> A.
- M2 Alpha for 1B to 8B greedy chat: plausibly 0.6-0.8; agree on easy tokens (punctuation, second half of a word, boilerplate); higher on code and lists, lower on creative writing; sampling at temperature 1 usually lowers it. -> A.
- M3 c between ~0.16 and ~0.4 in eager PyTorch; most likely to surprise. -> A.
- M4 Speedup: alpha 0.7, c 0.3 -> best K about 2-3, about 1.4x; c 0.15 -> closer to 1.75x at K 3-4; naive between 1.3x and 2x reasonable; below 1x check c first. -> A.
- M5 Measured vs formula tokens per round close not exact: easy stretches accept long runs, hard ones reject early. -> A.
- M6 Prompt lookup: little to no gain on open chat; large on rename task with c about 0. -> A.
- M7 Scoreboard: tok/s at concurrency 1 rises by about the speedup; time to first token barely changes; throughput at 16 still roughly single-stream speed since lock serializes; faster requests, not a wider server; batching is next. -> A; B: "so the server's not any wider".

## Break It

- BK1 Resample from p on rejection: output becomes overlap + (1 - alpha) x p; toy: 0.32, 0.325, 0.145, 0.08, 0.078, 0.052 instead of p; text reads fine; only the test catches it; plausible is not correct. -> "what if" exchange; A gives THE and A numbers.
- BK2 Skip rollback: greedy identity test fails right after the first rejection on every prompt, output degrades; first round always fine; bugs hide in round two. -> exchange.
- BK3 Draft greedily, claim softmax: distribution test fails; q must be what was actually sampled; fix by sampling from q or using one-hot rule. -> exchange.
- BK4 Draft from another family (Qwen 0.5B for Llama, bypass assert, clamp ids at or above 128,256): ids mean different strings, acceptance collapses toward zero, every round wastes K draft steps, speedup below 1; bad draft breaks speed never correctness. -> exchange.

## Explain It Back (substance, no quiz)

- E1 Output distribution and "same" = every sequence same probability; greedy identical up to near-ties. -> covered by D3-D7, PR1; reinforced in ending.
- E2 5 tokens cost about 1: memory-bound, weights reused, bytes unchanged, 5 FLOPs/byte far below ridge; stops being true when batch x (K+1) nears ridge. -> C1-C3, PR4.
- E3 Rule + proof + multi-token + bad q only lowers acceptance. -> R4, X1-X7.
- E4 64 users: probably less or not at all; 320 positions near ridge; third to half of verified positions rejected are real compute taken from others; ragged; engines use it for low load. -> PR4, B2, B3 (the "third to half" phrasing said there).
- E5 alpha 0.7, c 0.3: K=1 1.31x, K=2 1.37x, K=3 about 1.33x, so K=2 about 1.4x; levers: lower c (CUDA graphs, fused kernels, smaller or layer-skipping draft): at c 0.1 same alpha gives about 2x at K=4; or raise alpha by training a draft on the target's outputs; lowering c usually cheaper first move. -> A, during Measure speedup discussion.
- E6 Prompt lookup exact: one-hot q, keep with p(x), residual = p with x removed; any proposal works if you know q; alpha = p(x), high on copying; cost about zero; can beat model draft on copy-heavy tasks. -> W3, F3c, t7.

## Go Deeper / Connections

- G1 Best sources: the Leviathan paper (section 3 has rule, proof, alpha-K-c analysis) and the Chen DeepMind paper; Hugging Face "Assisted Generation" blog for the practitioner loop. -> One A sentence near the end.
- CN1 Built on bandwidth-bound and baseline lessons; rollback uses the KV cache; competes with batching; quantization stacks (4-bit target cheaper verify, 4-bit draft lowers c); serving-engines lesson shows paged caches + continuous batching; biggest lever left is alpha -> draft-model lesson. -> A, short, before the close.

## Flow

1. Problem (P1-P5), opening on the scoreboard number, B voices the diagnostic model; Predict PR1 placed after the "same distribution, provably" claim, which sets up the need to define distribution.
2. Origin (O1-O6) as a short story.
3. Output distribution (D1-D8, F1), slow, B's confusion voiced: "isn't the distribution kind of the model's style?"
4. Why checking is cheap (C1-C6) with prereq recap.
5. Draft then verify (V1-V6, F2) told as one round on "the cat sat on the rug".
6. Acceptance rule (R1-R6, PR2), then the toy six-word example (F3), then the proof with the same numbers (X1-X8). This is the heart; slow and concrete.
7. Speedup (K1-K7, PR3, F4).
8. Where drafts come from (W1-W7).
9. KV cache rollback (KV1-KV3, F5).
10. Many users (B1-B3, PR4).
11. Build It (BI0, t1-t8, PR5), Measure (M1-M7, E5) folded where natural.
12. Break It (BK1-BK4) as quick what-ifs.
13. Sources and connections (G1, CN1), then B restates the core idea and A sharpens; stop.
