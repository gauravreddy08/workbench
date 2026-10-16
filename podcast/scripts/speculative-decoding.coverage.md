# Coverage: speculative-decoding

Lesson src/lessons/speculative-decoding.mdx vs podcast/scripts/speculative-decoding.md. Item IDs match
podcast/outlines/speculative-decoding.md. "Fixed" = was missing, wrong, or unnatural in the first draft
and has been added or corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 decode reads every weight; 16 GB; 273 GB/s; ~17 tok/s; >99% idle | Problem | "drag all sixteen gigabytes of weights through a pipe that moves about two hundred seventy-three" | covered |
| T2 KV cache refresher | Why checking is cheap; KV cache | "Quick refresher on that: as the model processes each token, every layer computes a key and a value" | covered |
| T3 baseline server, harness, scoreboard | Build It setup | "the inference folder from the baseline lesson, next to your server, your benchmark harness" | covered |
| P1 ~13 tok/s under ~17 | Problem | "about thirteen tokens a second? Under a ceiling of about seventeen" | covered |
| P2 prefill reuses one read; token 5 depends on 4 | Problem | "Because token five depends on token four" | covered |
| P3 oracle, four tokens for one weight read | Problem | "four tokens for the price of one weight read" | covered |
| P4 1B reads ~2.5 GB; check, keep good, fix first bad, one pass | Problem | "keep the good ones, and fix the first bad one. All in that one pass" | covered |
| P5 diagnostic quote; rejected at random; indistinguishable; provably; chi-square on own hardware | Problem | "It throws them out at random. On purpose." | covered |
| PR1 greedy identical except near-ties; sampling differs but same distribution; draft changes how fast, never what | Problem | "It's identical. Token for token."; "The draft model changes how fast. Never what." | covered |
| O1 CPU speculative execution | Origin | "It's called speculative execution" | covered |
| O2 2018 Stern, Shazeer, Uszkoreit, blockwise parallel, greedy only | Origin | "they called it blockwise parallel decoding" | covered |
| O3 missing piece was sampling | Origin | "Real products sample with a temperature" | covered |
| O4 Leviathan/Kalman/Matias Nov 2022; Chen et al. DeepMind Feb 2023 | Origin | "In November twenty twenty-two, Yaniv Leviathan" | covered |
| O5 rejection sampling defined | Origin | "propose samples from an easier one, and then you keep each proposal with a carefully chosen probability" | covered |
| O6 2-3x T5-XXL; 2-2.5x Chinchilla 70B with 4B draft; every engine | Origin | "two to three times faster on a big Google model called T five X X L" | covered |
| D1 logits; 128,256 | Output distribution | "a hundred twenty-eight thousand, two hundred fifty-six numbers... called logits" | covered |
| D2 softmax | Output distribution | "take e to the power of each score so they're all positive, and then divide each one by the total" | covered |
| D3 distribution is the vector, not a vibe | Output distribution | "It's not a vibe. It's not a style. It's that list." | covered |
| D4 Paris 0.82, a 0.05, the 0.04 | Output distribution | "Paris zero point eight two" | covered |
| F1 figure 001 bars, slices of 0 to 1, roll 0.85 lands in "a" | Output distribution | "Say you roll point eight five. That's just past Paris, so it lands in 'a'" | covered |
| D5 greedy, argmax, deterministic | Output distribution | "That's called the argmax, which just means 'which entry is the biggest'" | covered |
| D6 sampling; temperature; top-k/top-p | Output distribution | "Temperature reshapes the list before you roll" | covered |
| D7 sequence probability product; same distribution definition | Output distribution | "every possible output sequence has the same probability under both" | covered (fixed: removed invented sixty-percent example) |
| D8 p and q named | Output distribution | "Its list at a given step, the papers call P... they call Q" | covered |
| C1 1 FLOP per byte, tensor cores idle | Why checking is cheap | "One flop per byte" | covered |
| C2 5 tokens: math changes, bytes don't | Why checking is cheap | "It's five times the math. But not five times the bytes." | covered |
| C3 ridge point, hundreds on Spark | Why checking is cheap | "So there's this number called the ridge point" | covered |
| C4 verification = mini prefill | Why checking is cheap | "That's what's called verification... a mini prefill" | covered |
| C5 cache makes past free | Why checking is cheap | "Only the five new positions get computed" | covered |
| C6 measure 1..64, flat then bend | Why checking is cheap | "stay almost flat for the small counts, and then bend upward" | covered |
| V1 draft model, target/verifier | Draft, then verify | "It's sometimes called the verifier" | covered |
| V2 draft K, record q | Draft, then verify | "at each step it records its whole list, its Q" | covered |
| V3 verify returns K+1 lists | Draft, then verify | "Why plus one? Four guesses, four lists, no?" | covered |
| V4 accept left to right, stop at first rejection | Draft, then verify | "And you stop at the first rejection" | covered |
| V5 fix or bonus | Draft, then verify | "Fourth, fix or bonus" | covered |
| V6 at least one, at most K+1; worst case | Draft, then verify | "every round emits at least one token, and at most K plus one" | covered |
| F2 figure 002: sat on the mat/rug; 0.2 per draft, 1.1 verify, 1.9 vs 4; 60-75 ms | Draft, then verify | "four times point two, point eight, plus one point one... one point nine" | covered |
| R1 two numbers for the proposed token | Acceptance rule | "you've got two numbers in hand for it" | covered (fixed: dropped spoken variable letters) |
| R2 greedy rule | Acceptance rule | "keep the guess if it's the target's top choice" | covered |
| R3 no single right answer; how often | Acceptance rule | "So 'a' is a perfectly correct output" | covered |
| PR2 0.25/0.40 = 62.5%; 0.10 vs 0.25 keep always, short 15%; min(1, p/q) | Acceptance rule | "Sixty-two and a half percent"; "I'm short fifteen" | covered |
| R4 rule in words | Acceptance rule | "if the target likes the guess at least as much as the draft does, always keep it" | covered |
| R5 residual defined | Acceptance rule | "So the residual only contains the tokens the draft was too stingy with" | covered |
| R6 redirect over-covered to under-covered | Acceptance rule | "redirect this probability to the region the draft under-covers" | covered |
| F3 toy six words, p and q, overlap, leftover | Six-word example | "Imagine a vocabulary of just six words" | covered |
| F3a alpha 0.70; refills THE, CAT, DOG; chi-square < 11.07; 1 in 20 | Six-word example | "the cutoff at the usual five percent level is about eleven" | covered |
| F3b bug toggle, hundreds and growing | Six-word example | "the chi-square is in the hundreds. And it keeps growing" | covered |
| F3c one guess, keep THE at 0.40 | Six-word example | "You keep 'the' with probability equal to the big model's number for it, forty percent" | covered |
| F3d slide toward p, alpha to 1 | Six-word example | "A perfect draft never gets rejected" | covered |
| X1 two disjoint ways | Proof | "There are exactly two doors it can come through" | covered (fixed: no spoken "y") |
| X2 proposed and kept = min | Proof | "it always comes out to just the smaller of the two numbers" | covered |
| X3 P(reject) = sum of leftovers = normalizer; residual gives leftover | Proof | "One minus the total overlap is the same as the total of the leftovers" | covered |
| X4 overlap + leftover = p, both cases | Proof | "Overlap plus leftover. For 'the', twenty plus twenty, forty" | covered |
| X5 draft quality irrelevant to correctness | Proof | "nothing in that argument assumed the draft was any good" | covered |
| X6 normalizer forced by sums to 1 | Proof | "It's forced. Both lists add up to one" | covered |
| X7 induction to a sequence; bonus from last list | Proof | "so one more step, and it's induction" | covered |
| X8 three conditions: true q (one-hot greedy), true prefix cache, warping applied first | Proof | "they're exactly the bugs you can write" | covered |
| K1 acceptance rate alpha | Six-word example; tokens per pass | "the acceptance rate, and the papers write it as alpha" | covered |
| K2 independence assumption; 1 + a + a^2 ... | Tokens per pass | "one, plus alpha, plus alpha squared, and so on, up to alpha to the K" | covered |
| PR3 2.77, 3.20, 3.33; simulation numbers | Tokens per pass | "Four guesses gives two point seven seven" | covered |
| K3 c; round cost 1 + Kc; speedup formula | Tokens per pass | "a round costs one plus K times c" | covered |
| K4 c ~0.16 by bandwidth; fixed costs | Tokens per pass | "About point one six. In practice it's often worse" | covered |
| F4 calculator sliders, curve, best K | Tokens per pass | "Three sliders: alpha, K, and c" | covered |
| K5 alpha 0.5 ~1.6x; 0.9 4x+ | Tokens per pass | "At alpha point five, you top out around one point six" | covered |
| K6 c 0.05 K6 2.35x; c 0.1 K4 ~2x; c 0.25 K2 ~1.46x | Tokens per pass | "if c is point oh five, the best K is six" | covered |
| K7 can lose below 1x | Tokens per pass | "It can lose" | covered |
| W1 any known q; alpha vs c trade-off | Where drafts come from | "Anything that produces guesses with a known list Q can be a draft" | covered |
| W2 same family, same tokenizer, distillation later | Where drafts come from | "token number twelve thirty-four means the same string to both models" | covered |
| W3 prompt lookup, Saxena 2023, one-hot, copy-heavy, c ~0 | Where drafts come from | "prompt lookup decoding, from Apoorv Saxena" | covered |
| W4 Medusa | Where drafts come from | "Medusa, from Cai and others" | covered |
| W5 EAGLE | Where drafts come from | "Then EAGLE, Li and others" | covered |
| W6 self-speculation, Draft and Verify, LayerSkip | Where drafts come from | "And there's self-speculation" | covered |
| W7 DeepSeek-V3 multi-token prediction | Where drafts come from | "DeepSeek V three was trained with a multi-token prediction module" | covered |
| KV1 rejected entries in caches, ghost | K V cache | "It's conditioning on a ghost" | covered |
| KV2 rollback rule, crop to len-1, feed uncovered, fix fed first | K V cache | "crop each cache to the length of the text minus one" | covered |
| F5 figure 005: MAT cropped, RUG fed first; all-kept draft missing two | K V cache | "the draft is actually missing two tokens" | covered |
| KV3 contiguous crop vs paged cache | K V cache | "In a paged cache like V L L M's" | covered |
| B1 speculation vs batching for idle compute | Many users | "batching spends that same idle compute a different way" | covered |
| PR4 64 x 5 = 320; near ridge; ~45% discarded; may reduce throughput | Many users | "Sixty-four times five. Three hundred twenty." | covered |
| B2 ragged acceptance | Many users | "acceptance is ragged" | covered |
| B3 latency tool for light load; Spark ideal | Many users | "A one-user box is exactly where speculation shines" | covered |
| BI0 folder, model pair, memory, fp32 room, Qwen alternative | Build It setup | "There's even room to load the eight B in full F P thirty-two" | covered |
| t1 load, license, tokenizer check, forward helper, Qwen padding gotcha | Build It setup | "the bigger Qwen models pad their output matrix" | covered |
| t2 time n new tokens, median of 10, c | Build It setup | "that's your c" | covered |
| PR5 8 tokens within 10-20%; 64 tens of percent; 1B not 6.4x; c 0.25-0.4; CUDA graphs | Build It setup | "the one B will almost certainly not be six point four times faster" | covered |
| t3 spec greedy, invariant, K+1 rows, crop no-op, stats, bf16 near-ties, fp32 rerun, cache bug signature | Greedy, then sampling | "print the gap between the top two scores... under point oh five" | covered |
| t4 spec sample, keep q, uniform < p/q, residual, fp32, zero-residual guard | Greedy, then sampling | "If the residual sums to zero, fall back to sampling the big model's list" | covered |
| t5 toy 100,000; 7.3 / p 0.20; ~5,000; ~19,000; power; real models pos 1 and 3; merge bins; KL floor; turn off defaults; agent review | Distribution test | "the correct rule gave a chi-square of seven point three" | covered |
| t6 sweep, alpha estimator, overlap log, speedup | Sweep, lookup, server | "Kept guesses divided by total guesses, I'd assume." / "it's biased low" | covered |
| t7 prompt lookup, three prompt sets, HF cross-check | Sweep, lookup, server | "a hundred-line Python file and ask for the same file with one function renamed" | covered |
| t8 server, bursts, lock, bench, scoreboard, disconnect bug | Sweep, lookup, server | "now tokens arrive in bursts of one to K plus one" | covered |
| M1 verify cost flat to ~8; 2x means Python loop | Measure | "Look for a Python loop hiding inside your forward" | covered |
| M2 alpha 0.6-0.8; easy tokens; varies; sampling lowers | Measure | "plausibly somewhere around point six to point eight" | covered |
| M3 c 0.16 to 0.4 | Measure | "That's the number most likely to surprise you" | covered |
| M4 0.7/0.3 -> K 2-3, ~1.4x; c 0.15 -> ~1.75x; 1.3-2x reasonable; below 1 check c | Measure | "about one point four times faster" | covered |
| M5 measured vs formula not exact | Measure | "real acceptances aren't independent coin flips" | covered |
| M6 prompt lookup chat vs rename | Measure | "big gains on the rename task" | covered |
| M7 scoreboard: tok/s up, TTFT same, c=16 unchanged, batching next | Measure | "So each request got faster, but the server isn't any wider." | covered |
| BK1 resample-from-p: 0.32, 0.325, 0.145, 0.08, 0.078, 0.052 | Break It | "'the' drops from forty percent to thirty-two" | covered |
| BK2 skip rollback, fails after first rejection, round two | Break It | "The bugs in speculative decoding hide in round two" | covered |
| BK3 draft greedily, claim softmax | Break It | "a greedy draft's real list is one-hot" | covered |
| BK4 other-family draft, ids >= 128,256, below 1x, correctness intact | Break It | "A bad draft can't break correctness. Only speed." | covered |
| E1 output distribution, same = every sequence same probability | Output distribution; close | "every possible output sequence has the same probability under both" | covered |
| E2 5 cost ~1; stops near ridge at batch x (K+1) | Why checking is cheap; Many users | "you're still deep in memory-bound territory" / "Right around it" | covered |
| E3 rule and proof; bad q only lowers acceptance | Proof | "A bad draft only costs you speed, because you reject more" | covered |
| E4 64 users: third to half rejected = compute taken from others | Many users | "Somewhere between a third and a half... real compute taken away from other users" | covered |
| E5 K=1 1.31, K=2 1.37, K=3 1.33; levers; c 0.1 ~2x at K4; lower c first | Measure | "one guess gives one point three one, two guesses one point three seven" | covered |
| E6 lookup exact via one-hot; can beat model draft on copy tasks | Where drafts come from | "on those tasks it can actually beat a model-based draft" | covered |
| G1 sources | Close | "read the Leviathan paper, section three has the rule, the proof" | covered |
| CN1 connections: batching, quantization stacks, serving engines (paged caches), draft-model lesson | Many users; K V cache; Close | "a four-bit target makes every verify pass cheaper, and a four-bit draft lowers c" | covered |

Number check: every number in the script matches the lesson, except the derived ones listed below
(arithmetic on lesson numbers, used to make the examples followable by ear):

- About sixty milliseconds to read the model once (sixteen gigabytes over two hundred seventy-three gigabytes a second); lesson gives one pass as sixty to seventy-five milliseconds.
- "a" occupies point eight two to point eight seven on the sampling ruler (from the figure's 0.82 and 0.05).
- Sixty-two and a half percent said also as "five eighths".
- Toy residual: leftovers twenty, five, five summing to thirty; shares two thirds, one sixth, one sixth; rejection chance thirty percent times two thirds equals twenty percent for "the".
- Break It biased output stated as "overlap plus thirty percent of the big model's list" (lesson writes min(p, q) + (1 - alpha) p with alpha 0.7).
