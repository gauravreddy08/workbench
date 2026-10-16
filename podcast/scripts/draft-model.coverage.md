# Coverage: draft-model

Lesson src/lessons/draft-model.mdx vs podcast/scripts/draft-model.md. Item IDs match
podcast/outlines/draft-model.md. Prerequisite material fully explained in
podcast/scripts/speculative-decoding.md is recapped briefly here, not re-taught.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| R1 output distribution = list of odds, p and q | What a good draft is | "That list is its output distribution, and we call it p" | covered |
| R2 accept rule, exactness | Predict brilliant/copycat; What a good draft is | "the accept-or-reject rule from speculative decoding, the one that keeps the output exact" | covered |
| R3 alpha, K, c, speedup | Problem | "the draft gets kept about seventy percent of the time. Each draft step costs about a third" | covered |
| R4 decode bandwidth-bound | Draft shapes; Medusa build | "Decoding's memory-bound. More bytes, slower step" | covered |
| R5 teacher forcing = mini prefill | Offline alpha | "That's called teacher forcing... same mini-prefill trick as verification" | covered |
| P1 alpha 0.7, c 0.3, K 2-3, 1.4x | Problem | "about one point four times faster" | covered |
| P2 two levers | Problem | "there are only two. You can make the draft step cheaper" | covered |
| P3 printed rejections, three examples | Problem | "Here's a... Sure"; "markdown header"; "math dot pi times r squared" | covered |
| P4 not wrong, different writer | Problem | "None of those guesses are wrong" | covered |
| P5 impersonator reframe, full vector | Problem | "You need a better impersonator" | covered |
| PR1 brilliant vs copycat | Predict | "it's almost certainly backwards. It's draft B" | covered |
| O1 2006 Model Compression | Origin | "Two thousand six. Cristian Buciluă" | covered |
| O2 2015 Hinton, dark knowledge, dog/wolf/car, temperature | Origin | "dog, ninety percent. Wolf, nine percent. Car, one in ten thousand" | covered |
| O3 spec decoding 2022, DistillSpec 10-45%, Medusa, EAGLE 2024 | Origin | "ten to forty-five percent more speedup" | covered |
| I1 P(keep) = sum of min | What a good draft is | "for each token, take the smaller of the two numbers, and add them all up" | covered |
| I2 TV defined | What a good draft is | "total variation distance, T V for short" | covered |
| I3 identity, alpha = 1 - TV, Leviathan, 16 digits | What a good draft is | "the gap between them is their sum minus twice the smaller one" | covered |
| I4 design spec | What a good draft is | "So read it as a design spec" | covered |
| I5 easy vs hard tokens | What a good draft is | "After 'Here is a poem about'" | covered |
| F1 Figure 001 (0.63, 0.82, KL 0.32 to 0.08, 1.2x to 1.6x, K and c, q = p) | Overlap as you'd see it | "alpha of point six three"; "climbs to point eight two" | covered |
| L1 sequence-level distillation, Kim and Rush | Teacher's whole answer | "sequence-level distillation, from Yoon Kim and Alexander Rush" | covered |
| L2 cross-entropy, one-hot | Teacher's whole answer | "what's called one-hot" | covered |
| L3 math 0.46, r 0.14, 3 0.10 thrown away | Teacher's whole answer | "Math forty-six percent, r fourteen, three ten" | covered |
| L4 KD, soft labels, KL (nats, nonneg, asymmetric) | Teacher's whole answer | "Those are called soft labels"; "measured in nats" | covered |
| L5 KL = CE with soft label minus constant; gradient q - p | Teacher's whole answer | "the loss you already know, with a soft label" | covered |
| L6 one sample vs whole p | Teacher's whole answer | "A soft label just hands it the dice" | covered |
| PR2 toy 0.12/0.39/0.64/0.81 vs 1 | Predict soft vs hard | "point one two. At sixteen, point three nine" | covered |
| T1 peaky, crumbs | Temperature | "ninety-seven percent on one token and tiny crumbs" | covered |
| T2 divide by T, T squared | Temperature | "multiply the loss by T squared" | covered |
| T3 copy what you serve, start at T 1 | Temperature | "So start at T of one" | covered |
| K1 asymmetric, student too small | Which way round | "for a one B imitating an eight B, it always is" | covered |
| K2 forward KL mode-covering, Hinton | Which way round | "That's called mode-covering" | covered |
| K3 reverse KL mode-seeking, MiniLLM | Which way round | "That's called mode-seeking. And there's a paper, MiniLLM" | covered |
| K4 TV symmetric, Pinsker, differ at limit | Which way round | "Pinsker's inequality. In words" | covered |
| F2 two-bump toy 0.557/0.650/0.656; 0.558/0.500; greedy; direct alpha gradient | Which mistakes | "point five five seven"; "reverse drops to point five" | covered |
| K5 DistillSpec no winner; forward KL in build; TV loss | Which mistakes | "a measurement, not a debate" | covered |
| W1-W2 contexts, d1 vs d2..dK | Whose text | "guesses two through K come after the real text plus the draft's own" | covered |
| W3 generic / off-policy | Whose text | "It's called off-policy data" | covered |
| W4 on-policy, GKD, exposure bias | Whose text | "That's on-policy distillation... exposure bias" | covered |
| W5 DistillSpec result, cheaper, plumbing, stretch | Whose text | "did as well as, or better than, teacher-generated data" | covered |
| D1 pipeline figure | Dataset | "Generate once, score once, train many times" | covered |
| D2 multiply it out habit | Dataset | "Same habit as the memory math lesson" | covered |
| PR3 full vs top-64 storage | Dataset | "About five hundred gigabytes"; "Three hundred eighty-eight bytes per position" | covered (see number note) |
| D3 logsumexp, tail mass, renormalizing lies | Dataset | "It's called the log-sum-exp"; "That's called the tail mass" | covered |
| D4 top-64 mass is a ceiling; tail bucket | Dataset | "a ceiling on what training from these stored files can teach" | covered |
| D5 7 vs 16 GFLOP, live triples cost | Dataset | "roughly triples the cost of every pass" | covered |
| S1 four shapes | Draft shapes | "There are four shapes worth knowing" | covered |
| S2 1B: 16 layers, 2048, 1.24B, 2.5 GB, tied, tokenizer | Draft shapes | "which is called tied embeddings"; "Token number twelve thirty-four" | covered |
| S3 truncated arithmetic 218M, 0.87B, 525M, 1.05 GB, 2.8 GB | Draft shapes | "about two point eight gigabytes per draft step" | covered |
| S4 shallow and wide; shared frozen tensors | Draft shapes | "shallow and wide"; "They cost zero extra memory" | covered |
| PR4 untrained truncated, logit lens | Predict truncated | "it's called the logit lens" | covered |
| S5 Medusa heads, residual block, 17M, Medusa-1/2, c ~ 0 | Medusa and EAGLE | "About seventeen million parameters"; "That's Medusa one" | covered |
| S6 blind guessing, tree attention, 2.2x, 2.3-3.6x, typical acceptance caveat | Medusa and EAGLE | "That's called tree attention"; "typical acceptance, is a relaxation" | covered |
| S7 EAGLE, EAGLE-2, EAGLE-3, vLLM/SGLang | Medusa and EAGLE | "So it sees what the target was 'thinking'" | covered |
| S8 build A, B, C stretch; hidden state richer | Medusa and EAGLE | "the target's hidden state is a far richer input than a few tokens" | covered |
| M1-M4 offline alpha, top-1 agreement, what offline misses | Offline alpha | "That's offline alpha"; "top-one agreement" | covered |
| PR5 position 1 matches; later flat or rising, selection | Predict offline vs online | "just being judged at position four means you're probably somewhere easy" | covered |
| B0 folder, models, 16 bytes/param, ~20 GB | Build setup | "roughly sixteen bytes per parameter" | covered |
| B1 t1 prompts, UltraChat, logs, 10,000/500, no leakage | Build setup | "UltraChat two hundred K"; "measuring memorization" | covered |
| B2 t2 batching, two days, vLLM/HF fallback, three runs, ids not strings, why T 1, throughput | Build setup | "about two days. So batch it"; "store token ids, not strings" | covered |
| B3 t3 scoring, alignment, memmap, fp32, top-64 mass, self-check | Scoring and offline alpha | "Row number i of the output is the model's prediction for token i plus one" | covered |
| B4 t4 baseline offline alpha, full logits, histogram | Scoring and offline alpha | "a big spike near one" | covered |
| B5 t5 two losses, tail term, T 1 only, loop settings, 2.1 GB, 30 PFLOP, review bugs | Training two ways | "two point one gigabytes just for the scores"; "thirty million billion operations" | covered |
| B6 t6 truncated build, LR 5e-5 to 1e-4, time step | Truncated and on-policy | "somewhere around five to ten in a hundred thousand" | covered |
| B7 t7 on-policy GKD, 128 tokens, positions 2-4 | Truncated and on-policy | "That's G K D in its simplest form" | covered |
| B8 t8 per-position counts, sweep all, server, benchmark, scoreboard row | Decoder and Medusa | "Kept over judged is the acceptance at that position" | covered |
| B9 t9 Medusa data 16 GB, final-norm check, zero init, shared output layer 20%, drafting loop | Decoder and Medusa | "About twenty percent slower, every single pass" | covered |
| B10 Done-when list | spread over Build/Measure | not read as a list; each criterion appears in its task | covered |
| E1 dataset expectations, 0.9 -> k 128 | Measure | "try keeping a hundred twenty-eight instead" | covered |
| E2 CE vs KL, DistillSpec range | Measure | "Expect K L to beat cross-entropy" | covered |
| E3 truncated expectations | Measure | "Whichever one wins, the comparison is the lesson" | covered |
| E4 offline vs online within a couple points | Measure | "to within a couple of points" | covered |
| E5 1.37 -> 1.55 at c 0.3; 1.75 -> 2.1 at c 0.15; levers multiply | Measure | "about one point three seven times" | covered |
| E6 Medusa expectations | Measure | "head one alone might rival" | covered |
| E7 scoreboard, lock | Measure | "Faster per request, not wider" | covered |
| X1 off by one | Break It | "The loss still goes down. That's the scary part" | covered |
| X2 T 4 | Break It | "For a draft, copy what you serve" | covered |
| X3 top-1 only | Break It | "The soft part of soft labels" | covered |
| X4 leak the benchmark | Break It | "Drafts memorize" | covered |
| Q1 what makes a draft good | Predict PR1, design spec, close | "Being good is the wrong goal. Being alike is the goal" | covered |
| Q2 logits beat text | Teacher's whole answer, PR2 | (see L5, L6, PR2) | covered |
| Q3 forward or reverse | KL sections | (see K2-K5, F2) | covered |
| Q4 scale to 1B tokens: 250 TB, ~390 GB, 1.6e19, on-policy, shard, diminishing, batch | How it scales | "Two hundred fifty terabytes"; "sixteen billion billion" | covered |
| Q5 Medusa vs draft model, EAGLE between | Medusa and EAGLE | "So when would you pick Medusa over a distilled draft model?" | covered |
| Q6 why own generations | Whose text | "after the kind of mess you tend to make" | covered |
| G1 sources | Close | "read Hinton's distillation paper... And then DistillSpec" | covered |
| C1 connections | Close | "this was a small but complete training run" | covered |

## Number check

All numbers match the lesson except one, deliberately corrected:

- Full-logit storage: the lesson says 250 KB per position times 2 million positions is "about 640 GB".
  The arithmetic gives 128,256 x 2 bytes = 256,512 bytes per position, times 2,000,000 = about 513 GB.
  The script says "about five hundred gigabytes" (and "about four times the Spark's whole memory").
  The lesson's Predict answer and Figure 003 caption (640 GB) should probably be fixed to ~510 GB.

Derived in the script, not written in the lesson: TV worked example (0.8/0.2 vs 0.6/0.4 gives TV 0.2,
overlap 0.8); Pinsker check on Figure 001 (KL 0.08 gives TV at most 0.2, alpha at least 0.8);
illustrative 95% top-64 mass; "about four times the Spark's memory"; bandwidth-only c of 0.16 vs
measured 0.25 to 0.4 (from the speculative-decoding lesson); Figure 001 draft numbers (math 20%,
None 20%, self 16%, from the figure's source data).
