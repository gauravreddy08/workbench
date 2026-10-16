# Outline: statistics-for-evals

Source: src/lessons/statistics-for-evals.mdx. Curriculum entry: "Is that improvement real?" Question:
when a score goes from 71.2 to 72.0, is that real or noise? Why: most "wins" in ML are noise;
bootstrap and paired tests fix that.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: only high-school probability; the quantization episode's per-question GSM8K results give a real pair to test at the end. -> A, in Build It when the real pair comes up (re-explain: two quantized formats of one model, two hundred math problems, temperature zero). "Today" bullets skipped as a list.

## The Problem

- P1 Scene: retrain cross-encoder with new hard-negative sampler; share of 500 held-out queries with right doc at rank 1: v6 71.2%, v7 72.0%; plus 0.8; posted in Slack; "is that significant?" and you don't know what the question means. -> A opens on this scene; B is the one who'd post it.
- P2 Rerun old model v6, same weights, same 500 queries, query rewrites sampled at temperature 0.7: 70.6%, then 71.8%; same model moved 1.2 points; your improvement is smaller than the model's wobble against itself. -> A continues the scene; B reacts.
- P3 A score is not a fact about the model; it's a measurement with a noisy instrument (finite questions, maybe random sampling); every measurement has an error bar. Most Slack wins are inside it; most real wins are smaller than people think and need more questions or a smarter comparison. -> A.
- P4 Good news: the smarter comparison is cheap; you already have the data; it isn't the two numbers you printed. -> A, signpost.

## Origin

- O1 Gosset at Guinness, Dublin; barley/hops decisions from small expensive experiments; statistics of the day assumed large samples; he worked out few-sample case. -> A, story.
- O2 Guinness didn't allow publishing under own name; 1908 "The Probable Error of a Mean" under pen name "Student"; origin of Student's t-test. -> A; B reacts to pen name.
- O3 Worked example: two sleeping drugs, same ten patients, extra hours of sleep; took per-patient difference, asked if ten differences reliably above zero; that's a paired comparison, exactly what you'll do with two models on same questions. -> A, B connects it.
- O4 Evan Miller's 2024 paper for Anthropic "Adding Error Bars to Evals" largely reminds ML of what Gosset and successors worked out a century ago. -> A.

## The Idea: a score is a sample

- I1 Someone wrote 500 questions; could have written 500 others; you care about the kind of question (all customer queries, all grade-school math). Term population. -> A.
- I2 Term true accuracy (on the whole population, never seen, estimated); 71.2% is an estimate (would differ on a different sample). -> A.
- F1 Figure 001: box of all possible questions, some marked as in your eval; arrow to "your 500, score 70%"; bell of scores over many fresh 500s around true value; plus or minus one SE about 2 pts (68%), 1.96 SE about 4 pts (95%). -> A describes like a diagram over the phone.
- I3 Each question a coin coming up right with probability p (true accuracy); score = average of n coins; standard error = typical miss of the estimate across repeats; standard deviation of the estimate, not of single points. -> A, B asks about the difference with std dev.
- I4 Formula in words: square root of p times one minus p, over n. p(1-p) = noise of one coin, biggest at 50%, small near 0/100 (model that gets everything right has nothing to wobble); dividing by n under the root = averaging, but only with root n. -> A, never reads symbols.
- PR1 Predict: 70% on 500, range you'd bet 19 to 1 on? Answer about plus or minus 4 (66 to 74); SE about 2 points (0.7 x 0.3 / 500 = 0.00042, root about 0.0205); 1.96 SE = 4.0. Gut "plus or minus one" is common, people underestimate by 3-4x; "plus or minus two" = quoting one SE as 95% interval, common slip. -> A asks; B guesses "one point"; reveal with worked arithmetic in words.
- I5 Term confidence interval: meaning is about the recipe: repeat with fresh questions, 95% of intervals contain true accuracy; practical read: range of true accuracies consistent with what I saw. -> A; B voices wrong "95% chance the truth is in this one".  (A frames it as the recipe; no new claim.)
- I6 Where 1.96 comes from: averages of many coins are bell-shaped (central limit theorem: average of many independent random things is bell-shaped whatever the shape of each); 95% of a bell within 1.96 std devs. -> A.
- I7 Square root is brutal: halve the bar needs 4x questions. Table at 70%: 100 q SE 4.6, plus/minus 9.0; 200: 3.2, 6.4; 500: 2.0, 4.0; 1,000: 1.4, 2.8; 5,000: 0.65, 1.3; MMLU 14,042: 0.39, 0.76. -> A gives a few rows as a walk, not row by row: 100 -> about nine, 500 -> four, thousand -> under three, five thousand -> one point three, MMLU fourteen thousand -> about three quarters of a point.
- I8 0.8 on 500 is a fifth of the error bar; says almost nothing; even all of MMLU, plus/minus 0.8 is the noise floor; leaderboards rank models 0.3 apart. -> A, B reacts.

## The Idea: two models, one set of questions

- I9 Wrong the other way: compute both bars, see overlap, declare nothing; sometimes right, often throws away a real result. -> A.
- I10 Different random sets: difference carries both noises; SE of difference = root of sum of squares, about 2.9 points, plus/minus 5.7 at 95%; hopeless for 1 point. -> A, in words.
- I11 Same 500 questions; models do the same thing on most (easy easy for both, ambiguous label trips both); both right says nothing, both wrong says nothing; only disagreements carry information. -> A; B voices the overlap-means-nothing model first.
- F2 Figure 002: first 20 questions, A and B agree on 18; full 2x2: both right 362, both wrong 117, A only 4, B only 17; 479 agree and cancel; B minus A = 13/500 = plus 2.6 points. -> A describes as a two-by-two grid with numbers spoken.
- I12 Gosset's move: per-question difference: plus one if only B right, minus one if only A, zero otherwise; gap = average of those; SE = std of the differences over root n; CI = gap plus/minus 1.96 SE. Term paired comparison. -> A in words.
- I13 Why tighter: variance of a difference = var A + var B minus twice covariance; covariance (how much they move together; divided by both std devs = correlation, minus one to plus one) big and positive when models get same questions right; unpaired pretends it's zero; paired subtracts it. -> A, in words, no symbols.
- I14 Fake data example: B truly 2.5 better, correlation about 0.89 (typical for two checkpoints or two quantizations). A 73.2% (69.3-77.1), B 75.8% (72.0-79.6), unpaired gap +2.6 (-2.8 to +8.0), paired +2.6 (+0.8 to +4.4). -> A says the numbers as a story: overlapping by more than five points, paired a third as wide, clear of zero.
- I15 Rule to burn in: overlapping error bars do not mean no difference; same questions -> separate bars are the wrong tool; compute the paired interval of the difference. -> A, firm; B restates.
- F3 Figure 003 interactive: sliders questions, true gap, correlation; top model intervals, bottom unpaired vs paired gap intervals; dashed true gap; run 1000 fake experiments. -> A: "picture a little simulator with three sliders".
- F3a Try 1: correlation 0.7, gap 3, 1,000 questions: bars overlap, paired excludes zero; paired finds gap roughly 3 in 4 runs, "bars don't overlap" about once in a hundred. -> A.
- F3b Try 2: gap 0, 500 questions: paired interval excludes zero about 5% (the 5% you signed up for); B appears to beat A by 0.8 or more in roughly a third: your Slack message from two identical models. -> A; B reacts strongly.
- F3c Try 3: correlation 0: paired = unpaired width; pairing helps exactly as much as models agree; why it's powerful for close variants. -> A.

## The Idea: bootstrap

- I16 Formula works for accuracy; NDCG at ten over queries, median latency, F1, ratios each need their own, some ugly or none. -> A, tied to his ranker's NDCG.
- I17 1979 Bradley Efron; bootstrap: can't draw fresh sets from population, draw from your sample, best picture of population. -> A.
- I18 Mechanics: draw 500 from 500 with replacement; some twice or three times, about a third not picked (chance missed is about one over e, 37%); score; repeat 10,000 times; middle 95% (2.5th to 97.5th percentile; term percentile) is the CI. -> A; B questions "with replacement".
- F4 Figure 004: eight questions (6/8 = 75%), three resamples: 62.5%, 100%, 75%; repeats marked; times 10,000; middle 95% = CI. -> A describes small example.
- I19 Plain accuracy on 500: bootstrap matches formula within a tenth of a point. -> A.
- I20 Earns its keep: any metric (NDCG, MRR, judge win rate, mean tokens): same code. -> A.
- I21 Paired bootstrap: each round one set of indices, score both models on those; never resample A and B separately, that silently turns paired back into unpaired. -> A; B proposes resampling each separately (wrong model), A corrects.
- I22 Honest failure: tiny n or score at 100%, resamples barely vary, interval collapses; Wilson interval is the standard small-sample fix. -> A.
- I23 Doesn't fix: assumes resampled units independent; if not, exactly as wrong as formula (clustering coming). -> A, signpost.

## The Idea: tests

- I24 CI says how big; test answers narrower yes/no: if equally good, how surprising a gap this big? Term null hypothesis. -> A.
- I25 Term p-value: how often luck alone produces a gap at least this big; not the probability the null is true; below 0.05 convention; lines up with 95% interval excluding zero. -> A; B voices "so a p of 0.007 means a 0.7% chance they're equal" and A corrects.
- I26 Permutation / sign-flip test: if interchangeable, which you call A shouldn't matter; flip sign of each per-question difference by coin toss, recompute mean, 10,000 times; share at least as big (absolute) is the p-value; works for any per-question metric incl NDCG. -> A.
- I27 Sign test: keep only who won each question; each non-tied question is a fair coin under null; number of B wins out of disagreements is coin-flip (binomial) count; robust, weird scales fine. -> A.
- I28 McNemar 1947, "correlated proportions": same people two questions, or same questions two models; uses only discordant counts (term discordant pairs); b = 4, c = 17, 21 disagreements; exact p about 0.007; chi-square version about 6.9, p about 0.009. -> A, in words: "like getting four or fewer heads in twenty-one flips, either direction".
- I29 Not in the calc: 479 agreeing questions; cuts both ways: add 10,000 easy questions both ace, McNemar unchanged, unpaired bars narrower, gap looks more stable than it is. -> A; B surprised.
- I30 Tests and intervals two views of one thing; borderline (barely excludes zero, p 0.06) is information: say evidence is borderline; lead write-ups with interval for the gap (how big, not just whether). -> A.

## The Idea: two kinds of noise

- I31 Temp 0: each question fixed answer (nearly; GPU batching can flip a token). Temp 0.7: same question right maybe 6 of 10. Two noises: question noise (which questions), sampling noise (which answer sampled). -> A, B ties back to the rewrite wobble.
- I32 Miller splits the variance: question noise (spread of per-question difficulty) + average one-question coin noise divided by K, all over n. Resampling K answers shrinks only the second. -> A in words.
- I33 Worked example: 500 q, 70%, spread of difficulty 0.05, avg coin noise 0.16; K = 1: SE about 2.0; K = 5: about 1.3, like 2.5x the questions for 5x inference; infinite K bottoms at 1.0, question noise only fixable with more questions. -> A, numbers as story.
- I34 Questions expensive, inference cheap (ranker, small model on Spark): sample several answers; bootstrap resample questions carrying K answers; resampling individual answers treats 5 answers as 5 questions, far too narrow. -> A.
- I35 pass@k: k tries, at least one passes tests; generating exactly k is noisy; Chen et al. 2021 Codex paper: generate n at least k (they used 200), count c passing; pass@k = one minus chance a random k of your n has no passing one; unbiased estimator (right on average). -> A in words.
- I36 Shortcut (one minus (one minus c over n) to the k) is not unbiased: plugs estimated rate into a curved formula, comes out low on average; n = 10, c = 3: unbiased pass@5 0.917, shortcut 0.832; average across problems, bootstrap over problems not samples. -> A; B proposes the shortcut as the obvious way.

## The Idea: clustered questions

- I37 Evals built in clumps: 10 per each of 50 documents, 8 queries per 60 sessions, several questions per passage; same clump rises and falls together. -> A.
- I38 You don't have 500 independent; between 50 and 500; term clustered; naive SE too small. -> A.
- I39 Depends on cluster size and intraclass correlation (how alike within cluster, 0 to 1, rho / ICC); design effect about 1 + (m - 1) x rho; effective n = n / design effect. -> A in words.
- I40 Simulation: 50 docs x 10, 70%, rho about 0.2; design effect 2.8; over 5,000 evals: actual spread 3.4, naive 2.0, clustered 3.4; naive "95%" contained truth only 76%, clustered 94%; 500 questions worth about 180. -> A as "I simulated"; B reacts to 76.
- I41 Fix (Miller recommends): clustered SE: sum residuals within each cluster, square sums, add up, root, over n; one question per cluster = ordinary formula. Bootstrap: resample clusters (50 documents) and take their questions along. -> A in words.
- I42 For his ranker: NDCG per query so query is the unit, not document; if 500 queries from 60 customers and customers differ, customer is the cluster; never let one customer's queries be in both train and eval to know new-customer performance; ranking-metrics episode; know your independent unit. -> A; B relates to his work.

## The Idea: winner's curse

- I43 20 prompt variants for the query rewriter on 500 q; best +2 points; ship it? -> A, B says "yes, ship it".
- I44 None truly better; pick highest of 20 wobbly numbers = hottest luck; term winner's curse; simulation (20 zero-effect prompts, each disagreeing with baseline about 10%, 500 q): best beat baseline by 2.5 on average, at least 1 point in 97% of runs. -> A.
- F5 Figure 005: dot plots, dev set winner +2.0, same prompt on fresh held-out +0.8; a different prompt now looks best; cloud centred on zero. -> A describes two columns of dots.
- I45 p-values fooled too: each 5% test 1 in 20 false alarm; 20 tests chance of at least one about 64%; term multiple comparisons; doesn't need 20 deliberate experiments: a few prompts, checkpoints, decoding settings, two metrics, report best = same thing. -> A.
- I46 Fix 1 Bonferroni: divide threshold by number of tries, 20 -> 0.0025; crude, a bit too strict, impossible to get wrong. -> A.
- I47 Fix 2 split data: choose on dev as much as you like, confirm single winner once on held-out set you haven't looked at; report held-out number; why benchmarks hide test split; "tuned on the test set" invalidates. -> A.

## The Idea: how many questions

- I48 Turn it around: before running, if real and of the size I care about, how likely to detect? Term power (80% usual: 4 of 5); term minimum detectable effect. -> A.
- I49 Paired formula in words: n about (1.96 + 0.84) squared (about 7.85) times variance of difference over gap squared; variance of difference = disagreement rate minus gap squared; 1.96 = threshold, 0.84 = clear it 80% of the time; only property of models that matters is how often they disagree. Unpaired: replace with p(1-p) for each, about 0.42 near 70%. -> A in words with "about eight" multiplier.
- PR2 Predict: two checkpoints near 70%, disagree on 10%, 80% chance to detect true 2 points: paired about 1,950; unpaired about 8,100 per model; about 4x saving. Flip side: at 500, real 2-point gain detected only about a quarter (simulated 25%); miss 3 of 4 and conclude no effect; at 500 with 10% disagreement smallest reliable gap about 4 points. -> A asks, B guesses, reveal.
- F6 Figure 006 power calculator: sliders baseline, gap, disagreement; log scale bars paired vs unpaired; lower gap both grow with one over gap squared; raise disagreement only paired grows; dashed lines at 500 and MMLU 14,042. -> A: "picture a calculator with three sliders".
- I50 One over gap squared is the headline; halve effect -> 4x questions; 1-point between close checkpoints (10% disagree) about 7,800 paired, around 33,000 per model unpaired; "+0.5 on a 1,000-question benchmark is not a result". -> A.

## The Idea: seeds

- I51 Term random seed (starting number for RNG: initial weights, data order, dropout masks); same cross-encoder, two seeds -> two models that can differ by more than the eval's own error bar. Dodge et al. 2020: BERT on small GLUE tasks, many seeds; seed alone moved results as much as many published improvements. -> A.
- I52 Recipe vs checkpoint: eval interval is about this checkpoint on this question set; nothing about run-to-run variance; to claim new sampler is better, unit is training run: several seeds (3 bare minimum, 5 better), evaluate each on same questions, compare using spread across seeds; checkpoint vs checkpoint single-run paired is fine if you say so. -> A; B asks "so my v6 vs v7..."

## The Idea: careful result

- I53 Result statement: 500 q, B 75.8 (72.0-79.6), A 73.2 (69.3-77.1); paired: B ahead 2.6 (paired bootstrap 95% +0.8 to +4.4, 10,000 resamples); 21 disagreements, B 17, A 4 (exact McNemar 0.007); run once at temp 0, no seed variation, intervals reflect question sampling only. -> A says it as he'd write it in Slack, plainly; not read as a quote block.
- I54 Every part load-bearing: each score with interval; comparison paired and says so; disagreement count tells how much evidence; last sentence names the noise not measured. -> A, B.

## Build It

- B0 Folder, NumPy only; each script reads a CSV, one row per question, a 0/1 or score column per model; same code for fake and real. -> A, one sentence.
- B1 t0 fake data: hidden difficulty per question; B a little better everywhere (2.5 pts); shared luck makes them agree (90% of time B uses the same coin as A); seed 3 gives A 73.2, B 75.8. Loader joins on question ID, sorts, asserts no duplicates (matters, Break It). -> A, shape not code.
- B2 t1 formula CI and percentile bootstrap; one index matrix of all resamples at once; 10,000 x 500 = 5 million numbers fine; sample std of 0/1 almost exactly root p(1-p), so formula is the accuracy formula; stress test n = 20, 19 right: formula upper end above 100%. -> A.
- B3 t2 unpaired, paired formula, paired bootstrap; print correlation and disagreement rate; predict: with correlation about 0.9, how many times narrower? (answer in Measure: about 3x). -> A asks B in passing, answered in Measure.
- B4 t3 McNemar exact (count of fewer-or-equal wins times two, over 2 to the m; use Python ints because NumPy int64 silently overflows past 63), sign-flip test with tolerance for floating point; p-values close; sign-flip doesn't need to know data is 0/1. -> A; B asks why.
- B5 t4 A/A test: identical true accuracy 70%, 500 q, how often one at least 0.8 ahead; disagreement 5/10/20% and fully unpaired; with gap 2 points, CI-excludes-zero fraction = power at 500. -> A, "the one that should change how you read Slack".
- B6 t5 power calculator (n paired, n unpaired, minimum detectable effect by solving for gap); 1.96 and 0.84 from standard library's normal distribution; table of gaps 0.5-5 at 5/10/20% disagreement; check one row by simulation, about 80% detection; disagreement = a bug. -> A.
- B7 t6 clustered SE, cluster bootstrap, pass@k; test on 50 clusters of 10, cluster accuracies from a beta distribution with mean 0.7; compare with actual spread over 2,000 datasets; pass@k checks (10,3,1) = 0.3, (10,3,5) about 0.917, 1.0 when n - c < k; Codex paper product form avoids huge binomials, derive it. -> A, brief.
- B8 t7 real pair: two quantizations from quantization episode (bf16 vs 4-bit Q4 K M, 200 GSM8K problems, temp 0) or two ranker checkpoints per-query NDCG at ten (not 0/1 so McNemar out; paired bootstrap and sign flip; cluster bootstrap by customer/session and compare widths); before running write down smallest detectable gap; write the result paragraph; have an agent review for overclaiming. -> A.
- B9 Done when: reproduce fake numbers within a tenth; A/A table and power agree with simulation; clustered SE tracks spread; written paragraph you can defend out loud. -> A, folded into the end of Build.

## Measure

- M1 SE of 70% on 500 = 2.05 (plus/minus 4.0); A 73.2 (69.3-77.1) formula; bootstrap 69.2-77.0. -> A.
- M2 Unpaired +2.6 (-2.8 to +8.0); paired formula +0.8 to +4.4; paired bootstrap +0.8 to +4.4; correlation 0.89. -> A.
- M3 McNemar exact 0.0072; sign-flip about 0.007. -> A.
- M4 A/A, B ahead by at least 0.8: 10% disagree 31%, 20% disagree 36%, unpaired 41%. -> A; B reacts.
- M5 Power at 500, +2, 10% disagree: 25%; n for 80%: about 1,950 (simulated 78% at 2,000). -> A.
- M6 Clustered 50 x 10 rho 0.2: naive 2.0 vs clustered 3.4; best of 20 null prompts mean inflation +2.5. -> A, brief (already said).
- M7 Single-model intervals wide, bootstrap agrees at 500 within a tenth; at n = 20 with 19 right, formula upper end above 100% (bell assumption broken); bootstrap cramped against 100 the other way; neither good, Wilson is for that. -> A.
- M8 Paired about 3x narrower: correlation 0.89, var A + var B minus 2 cov is about 11% of var A + var B; root of 0.11 about 0.33; pairing didn't create evidence, it stopped 479 agreeing questions adding noise. -> A answers B's t2 prediction.
- M9 A/A is the Slack lesson: one wins by 0.8+ a third of the time, 0.8 in either direction about two-thirds; not weak evidence, close to no evidence. -> A.
- M10 Power 25% at 500: eval set usually too small for effects you care about; know before running rather than conclude no effect. -> A.
- M11 Real pair quantization: 200 GSM8K, paired can only see gaps of several points; expect Q8 and FP8 indistinguishable from bf16, 4-bit "within a few points, can't tell" unless broken; disagreement count shows how many answers flipped; paragraph should say what n needed for 1-point loss. -> A.

## Break It

- K1 Misalign rows: delete the sort, shuffle one model's rows (one file in question order, other in completion order from async loop); paired interval +0.8/+4.4 -> -3.1/+8.3; disagreement 4% -> 42%; McNemar 0.007 -> 0.41; nothing crashes; join on question ID and assert. -> "what if" exchange.
- K2 Peek and stop early: A/A, check McNemar every 50 questions up to 1,000, stop when below 0.05: "significant" 16% vs 4% testing once at end (exact test slightly conservative); every peek another chance for luck; decide n in advance with power calc, or sequential methods. -> exchange; B voices "but watching is harmless".
- K3 Wrong unit: 5 answers per question at temp 0.7 (fake: 100 questions, own p, 5 draws); bootstrap over 500 answers vs 100 questions carrying their 5; first much too narrow; same with clusters: bootstrap 500 clustered questions instead of 50 docs shrinks back to naive wrong width; resample whatever was independently drawn. -> exchange.
- K4 Tune on test: 20 zero-effect prompts vs shared baseline, pick best on 500, record gain, rescore on fresh 500, repeat 1,000 times: selected about +2.5, confirmed about zero; add Bonferroni-corrected paired test and see how rarely any survives. -> exchange.

## Explain It Back (content must appear somewhere)

- E1 72.0% on 500: estimate of true accuracy; SE root(0.72 x 0.28 / 500) about 2; interval about 68 to 76; recipe meaning; 4x questions to halve. -> covered via PR1/I5/I7; add 72 example in closing or problem callback.
- E2 Overlapping intervals: wrong whenever same questions (almost always); shared part cancels; paired interval or paired bootstrap or McNemar; can be 3x narrower; even for independent samples overlapping 95% intervals don't imply p above 0.05; unpaired test on difference is less strict than "no overlap". -> I15 plus a line about the independent case.
- E3 Bootstrap: how and when wrong (non-independent units: clusters, multiple answers, same user; resample independent unit; small n or near 0/100). -> I18-I23, K3.
- E4 1-point between checkpoints: about 7,800 paired at 10%, 33,000 unpaired; one over gap squared; doubling disagreement doubles n; if can't get more questions reduce noise: sample several answers (only shrinks sampling part), continuous score like probability of correct answer instead of 0/1, make systems more comparable so they disagree less; recipes need several seeds. -> I50 plus A's "if you can't get more questions" turn (continuous score is a new-to-episode point from the model answer).
- E5 20 prompts, best +2, p = 0.03: report nothing yet; 64%, 2.5 inflation; Bonferroni 0.0025 or confirm once on held-out; report held-out paired gap with interval. -> I43-I47 with B's "p of 0.03 though" moment.

## Go Deeper / Connections

- G1 Best sources: Miller's "Adding Error Bars to Evals" (Anthropic, 2024) plus Gosset's 1908 paper, short enough to read in one sitting. -> A, one sentence near the end.
- C1 Connections: ranking metrics episode (what to measure, query is the unit); quantization (paired interval and disagreement count next to each format turns "within noise" into a number); LLM judges next (judge is another noisy instrument; position bias is a paired comparison, same pair swapped order); why evals are separate = held-out idea as system design rule. -> A, a few sentences before the close.

## Flow

1. Problem scene (P1-P4), B as the one who posted to Slack.
2. Origin (O1-O4).
3. Score is a sample, SE, Predict 1, CI meaning, square root table, 0.8 is a fifth (I1-I8, F1, PR1).
4. Two models: overlap trap, 2x2, paired, covariance, fake-data numbers, simulator (I9-I15, F2, F3).
5. Bootstrap (I16-I23, F4).
6. Tests: null, p-value, sign flip, sign test, McNemar (I24-I30).
7. Two kinds of noise, pass@k (I31-I36).
8. Clusters (I37-I42).
9. Winner's curse (I43-I47, F5).
10. Power (I48-I50, PR2, F6, E4 extras).
11. Seeds (I51-I52).
12. Careful result statement (I53-I54).
13. Build It (B0-B9) with Measure numbers folded in where each task's result appears (M1-M11).
14. Break It (K1-K4).
15. Connections + sources (C1, G1).
16. Close: B restates, A sharpens.
