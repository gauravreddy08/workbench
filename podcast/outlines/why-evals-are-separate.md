# Outline: why-evals-are-separate

Source: src/lessons/why-evals-are-separate.mdx. Curriculum entry: "Why is the eval separate?" Question:
if the evaluator and the model are both just models, why are they different systems? Why: a confusion
he named; getting this right separates a demo from a result.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: none hard; having trained models and watched a validation loss is enough; tiny LM train/val picture helps. -> A, in passing when train vs val loss comes up (tiny LM re-explained in one line at the end). "Today" bullets skipped as a list; each is an item below.

## The Problem

- P1 His own quote: "evaluation system and a model... both basically some kind of ML models themselves, why separate?" -> B says it as their own honest question, near the top, after A's scene.
- P2 The word "eval" hides the important part. -> A, answering B.
- P3 Scene 1: fine-tune small model on arithmetic word problems; ask same model "is this answer correct? YES or NO"; says YES 91%; ten-line Python script computes truth: 55%. -> A opens the episode on this scene.
- P4 347 times 28 = 9,616 (real 9,716): same weights, same blind spot, finds it believable. "You didn't measure the model, you asked its opinion of itself." -> A, the concrete example.
- P5 Scene 2: tuning the cross-encoder; every afternoon change, rerun eval, keep if NDCG up; three weeks, 60 decisions, same 500 queries, NDCG up 4 points; ship; click-through doesn't move. -> A, second scene.
- P6 Same disease, different organ: scene 1 measurement shared the errors; scene 2 measurement absorbed into the model; each decision leaks a little info. -> A, B tries "so the eval set was too small / I overfit?" and A reframes.
- P7 Fix for both: eval can be a neural net; value comes from being independent and untouched. -> A, the thesis.

## Origin

- O1 Late 1980s DARPA, speech labs reporting on private recordings; same training data for all; NIST held back a hidden test set, ran systems, published scores. -> A tells as story.
- O2 David Donoho named it the Common Task Framework; secret engine of ML progress; the ruler belonged to nobody. -> A.
- O3 ImageNet (Fei-Fei Li's group, 2009): test labels on a server, capped submissions. -> A.
- O4 2012 AlexNet top-5 error ~15% vs ~26% runner-up; believed at once because test neutral. -> A, with "top five error" explained.
- O5 2015 Baidu team disqualified for extra accounts to submit more often. -> A; B reacts to how much a peek is worth.
- O6 Saturation: GLUE (2018) beaten within about a year, SuperGLUE (2019) replaced it; cycle repeats. -> A.
- O7 Contamination: LLMs trained on internet; test questions with answers end up in training data. -> A.
- O8 GSM1k (Scale AI, 2024): fresh problems in GSM8K style; some models scored noticeably worse; partly learned the test. -> A.

## The Idea

- I1 What an eval is for: something you care about you can't observe at scale, so build an instrument producing a number you hope moves with it. Eval defined (fixed procedure: model in, score out). -> A.
- I2 Thermometer vs doctor: thermometer is dumber; useful because reading depends on temperature and nothing else (not what patient wants, doctor hopes, how many uses). -> A; exact one-point comparison.
- I3 Independence defined: knowing one tells you nothing about the other; eval errors independent of model errors so they don't line up and hide each other. -> A, the name after the intuition.
- I4 Precise question: what must the eval be independent of? (1) model's errors: shared errors add bias in the flattering direction, not noise; (2) optimization process: model drifts toward what score rewards, including the wrong parts. -> A; B restates.
- I5 Figure 001 two loops one wall: training loop (train data seen every epoch, model, loss cheap/smooth/proxy, gradients change weights, millions of times) vs evaluation loop (frozen unseen test set, frozen weights, grader = program/human/other model, metric maybe slow, decision: ship? which run?), runs a handful of times; wall, nothing flows back. -> A describes like a sketch over the phone.
- I6 Loss is not the metric: two numbers even within one run, different on purpose. -> A signposts.
- I7 Training objective: computed millions of times so cheap; gradients flow so differentiable (defined: how tiny weight change moves the number; step function right/wrong gives zero gradient almost everywhere). Cross-entropy great objective, nobody cares about it. -> A.
- I8 Evaluation metric: opposite constraints, must match what you care about; can be step function (exact match), involve a sort (NDCG), a human a minute per example, "did the user buy something next week". -> A.
- I9 Cross-encoder example: trained with binary cross-entropy or pairwise loss; judged with NDCG at ten (order of top ten); sorting is a step function, no useful gradient; loss is differentiable stand-in, usually move together; model can lower loss by getting more confident about the doc ranked fortieth, NDCG doesn't see it. -> B (his work) raises "why not just train on NDCG"; A answers.
- I10 First reason: optimize what's optimizable, measure what's true; different design goals, different objects. -> A, crisp.
- I11 Two students analogy: independent grader's mistakes random, unrelated to which questions wrong, wash out over 1,000; self-grader's mistakes concentrated exactly on the hole; correlated errors defined (wrong on the same inputs; averaging doesn't cancel; stack in one direction: up). -> A; B voices "graders make mistakes either way, it averages out" and A corrects.
- I12 Model same, more so: opinion from same weights; judging prompt doesn't install new arithmetic. -> A.
- I13 Self-preference bias: LLM judges recognize and prefer their own text/style, separate from correctness. -> A.
- I14 Huang et al. 2023: LLMs reviewing/fixing own reasoning without outside feedback mostly didn't improve, sometimes changed right to wrong. -> A.
- I15 Four boxes: right-approved, right-rejected, wrong-approved, wrong-rejected; false approval (false positive) is the box that inflates the score. -> A.
- I16 Predict: 55% of 1,000 right; approves 95% of right, 85% of wrong; reported? Answer 523 + 383 = 906 -> about 91% vs 55%; self-judge mostly measures how often the model answers at all. -> A asks, B works it, maybe partially wrong, A finishes.
- I17 Figure 002 interactive: counts out of 1,000; presets same model / bigger sibling / different strong model / program verifier; sliders model accuracy and shared blind spot; wrong-approved cell; measured bar runs ahead; presets illustrative. -> A, "picture a little two-by-two with a slider".
- I18 Formula in words: measured = accuracy times approval-of-right plus (one minus accuracy) times approval-of-wrong. TPR, FAR named. FAR zero and TPR one -> measured = true. Lie is biggest when model weak. -> A, words plus worked example from the Predict.
- I19 Real reason: independent judge's FAR roughly the same whichever questions the model gets wrong; self-judge's FAR high because of which ones; change the model, FAR changes; can't compare two models fairly. -> A; B asks "so a judge with a known bias is fine?"
- I20 Correction: measure TPR and FAR on a couple hundred hand-labeled examples, solve backward: true = (measured minus FAR) divided by (TPR minus FAR). Rogan-Gladen correction, 1978 epidemiology, disease prevalence with imperfect tests. Only works if TPR and FAR stable, which independent judge gives. -> A in words with a small worked example (derived numbers).
- I21 Three kinds of grader, each with failure mode; trade cost vs tracking truth. -> A signposts.
- I22 Program: exact match, unit tests, calculator, SQL result, JSON schema check, verifier (checking simpler than producing; test suite verifies code, multiplying back verifies division). Free, fast, deterministic, zero shared blind spots. Fails: only when correct is computable; brittle parsing (9716 vs 9,716); letter not intent (tests pass, code awful). -> A.
- I23 Human: you labeling 200 rankings, annotators, experts; closest to "good"; slow, expensive, disagree, tired raters drift, prefer confident long well-formatted answers too. -> A; B says "humans are the gold standard though" and A qualifies.
- I24 Model: LLM judge with rubric, reward model, trained classifier; cheap at scale, fuzzy criteria (faithful summary?); shares blind spots with similar models; biased to position, length, own style; fooled by text written to fool it. -> A.
- I25 Rule of thumb: cheapest grader independent enough for the decision. Arithmetic/code -> programs; right doc in top three -> your own labels once, then a program (NDCG over labels); helpful and faithful -> model judge calibrated on human labels. -> A.
- I26 Model judge fine when four things hold: (1) not the model graded, ideally not same family or trained on same outputs; (2) judging easier than generating: summary-no-unsupported-claims, sudoku; why a judge can grade a stronger model; (3) calibrated against humans: hand-label a few hundred, measure agreement, TPR, FAR; MT-Bench (Zheng et al. 2023) strong judges agreed with humans about as often as humans with each other, above 80%, also documented position, length, self-enhancement biases; (4) never becomes the training target without a separate check. -> A, as a spoken list B can follow; B challenges (2) "how can a weaker judge grade a stronger model?".
- I27 "Both are ML models" is fine; "both share errors" is not. LLM judges deserve a full treatment of their own. -> A, key line.
- I28 Goodhart 1975: statistical regularity collapses once pressure placed on it for control. Strathern's form: "when a measure becomes a target, it ceases to be a good measure." -> A.
- I29 Why it's a law: proxy correlated but gap; gentle optimization moves along shared direction; real improvements hard and harder, gap cheap (judge likes long answers, easier to write more than be right); optimize harder and cheap direction wins. -> A.
- I30 Regressional Goodhart: top 30 of 300; score = true + noise; top disproportionately lucky noise, true quality lower than scores; no cheating needed; correlation weakest among winners, where you're looking. -> A; B "but the top ones are still the best ones, right?"
- I31 Figure 003 slider: left scatter 300 candidates score vs true quality; right average score and true quality vs pressure; both climb then score keeps rising, true falls; top-10% cluster flat even at zero pressure; toy, fixed seeds. -> A describes dragging the slider.
- I32 Predict: true quality peaks around pressure 30-40 (about 0.42); score nearly straight line to 3.3; at 100, true about minus 0.84, worse than start; top-10% correlation weak at zero pressure (narrow range, noise dominates); overall correlation 0.77 to 0.10. -> A asks, B guesses, A reveals.
- I33 RLHF is Goodhart with a GPU: reward model predicts human preferences (an eval), policy trained by RL to maximize it (target). Gao, Schulman, Hilton 2022: gold reward rises then falls while optimized reward keeps rising; same curve, real. KL penalty keeps policy near start; labs evaluate on things other than the reward model. Reward hacking defined. -> A; B connects to his knowledge of PPO/DPO.
- I34 Cleanest definition: an eval is a measurement you promise not to optimize against directly; the moment you do, it's a training signal and you need a new eval. -> A, key line.
- I35 Splits question: not "is it in training data" but "how many times has it influenced a decision?" -> A.
- I36 Training set: touched millions of times, model fit to it, loss optimistic. -> A.
- I37 Dev set (validation set): not trained on, looked at dozens to hundreds of times for lr, prompts, checkpoints, features; each look leaks; after 60 decisions system partly fit through you; mildly optimistic. -> A; B: "but I never trained on it" voiced as wrong model.
- I38 Test set: looked at once at end; only number believable without a discount; any decision made using it turns it into a dev set. -> A.
- I39 Figure 004: train 80% / dev 10% / test 10%; touched by optimizer ~a million times, by you 10 to 1,000 times, once; leaks move test data leftward: duplicates, same query in both, pretraining contamination, peeking. -> A, sketch in words.
- I40 Group leakage: (query, document, label) triples; random row split puts same query in train and test; model learns "for this query, docs about X relevant", aces test, not a skill on new queries. Split by query; rule: split along unit new in production (query, user, time). -> A, aimed at his cross-encoder; B realizes it.
- I41 Adaptive overfitting: each look-and-decide uses test as dev; overfit test without training; adaptive data analysis defined. -> A.
- I42 Simulation (Figure 005): 1,000 random labels, random-guess models, keep best; measured on Mac, numpy, 20 trials: best rises 50 to about 54% at 100 and 56% at 10,000, fresh test 50%; lucky-vote 71% on chosen set, 50% fresh. -> A as "when I ran this on my Mac".
- I43 100 tries buys 4 points of noise on 1,000 examples, bigger than most wins in a paper's results table. Blum and Hardt's Ladder paper, Kaggle leaderboards climbed this way. Error bars come later. -> A.
- I44 Caveat: Recht et al. 2019 fresh ImageNet test set: accuracy dropped about 11-14 points but ranking almost perfectly preserved; drop mostly from new images slightly harder, not overfitting; big diverse community test sets robust; your 500-query dev set with 60 decisions by one person isn't that. -> A; B pushes back "so it's overblown?"
- I45 Eval is the spec: writing the eval forces deciding what good means. -> A.
- I46 Spec example: "make the ranker better" isn't; "raise NDCG at ten on 500 real queries, four relevance grades, sampled from last month's traffic in proportion to frequency, no drop on 50 navigational queries" is. Answers: which queries matter, grade-2 vs grade-3 worth, rare vs common. Two engineers build two rankers and both claim victory; eval settles it before work starts. -> A; "navigational query" explained.
- I47 Eval-driven development: collect examples of desired behaviour incl. production failures, see them fail, change until pass, keep fixed failures forever (regression suite); TDD with a score; what his validation harness is or should become. -> A.
- I48 Offline eval defined: frozen dataset, minutes, repeatable; how you iterate. -> A.
- I49 Offline eval is a proxy too; A/B test defined: randomly split real traffic, half see new ranker, measure what users do; slow (days to weeks), risky, own traps, closest to truth. -> A.
- I50 Ladder: training loss checked by dev metric checked by frozen test checked by online A/B. When a rung stops predicting the next, Goodhart at that rung; NDCG wins not becoming click-through wins -> check labels still mean what users mean. Measuring offline-predicts-online is real work; trust for good reasons, not habit. -> A ties back to scene 2; B connects.

## Build It

- B0 Setup on Spark: Ollama, three models: Qwen two point five half-billion (answerer and own judge), Qwen two point five seven billion (same family bigger), Llama three point one eight billion (different family); OpenAI-compatible API; one cached client function writing every call to disk so reruns free, every raw output kept; seeded question generator, 400 questions "three-digit times two-digit minus a number"; 0.5B should get a fifth to two thirds right; adjust digit ranges otherwise. Arithmetic chosen because a ten-line program knows the truth. -> A, setup in a few sentences.
- B1 Task 1: answerer, parse integer after last ANSWER line (strip commas), verifier compares; the most important ten lines, grader that shares nothing; print accuracy and unparseable count; eyeball 10 failures: arithmetic slip vs parse failure; broken ruler. -> A.
- B2 Task 2: three judges (self, sibling, stranger) see question and response not true answer; YES/NO; confusion counts, TPR, FAR, measured. Then calibration: 100 calibrate, 300 use; correction; which rescued, which wild; hint: TPR minus FAR for self-judge. -> A; B guesses the hint.
- B3 Task 3: flawed metric "looks good": rewards length up to 300 words and careful-sounding words (verify, check, carefully, therefore, step, confirm); score out of ten. Prompt search over six prompts from bare to step-by-step to double-check to 150 words careful to 300 words + keywords to history-of-multiplication essay; score proxy and true accuracy on 100 questions. Best-of-N: 8 samples at temperature 0.8, pick highest proxy among first N for N 1,2,4,8; references random pick and pass at N (correct if any correct, ceiling). Honest: step by step genuinely helps arithmetic so true accuracy may rise first; healthy part of curve; what makes Goodhart hard to spot early. Optional: 0.5B as 1-10 rater, check correlation with length vs correctness. -> A.
- B4 Task 4: clean harness: fresh 1,000 questions, new seed, dev 500 / test 500 by fixed rule, manifest with SHA-256 hashes (fingerprint), refuses on mismatch; one command one config (model, prompt, temperature, seed, grader); run folder per run: config, git commit plus dirty flag, data hashes, every prompt/response, parsed answers, verdicts, latency per call, summary with score and 95% bootstrap interval; test requires a final flag, one-line reason, appended to test log; log counts peeks; more than a handful -> test turning into dev. Agent reviews for leaks, non-determinism, missing logs for reproducing six months later. -> A; bootstrap interval explained briefly.
- B5 Task 5: reproduce winning-on-noise in numpy; best of K and lucky vote; 10-20 trials, K 1,10,100,1000, n 1,000; then n 200. -> A, short (results in Measure).
- B6 Done when: true accuracy from program and confusion matrix per judge; say with own numbers how much self-judge inflates and why; seen proxy rise while accuracy fell or can explain why not; harness runs from config, logs, verifies hashes, refuses test without final; peek reproduces shape. -> folded into A's wrap of build (no checklist read).

## Measure

- M1 Judges table expectation (a prediction, not run on the Mac): self-judge far above truth, FAR well over half, 0.5B barely judges and says YES to most; if TPR close to FAR it isn't discriminating, correction divides by nearly zero and blows up. 7B sibling and 8B stranger much better because they can mostly do arithmetic; if close to each other, real finding: for arithmetic the shared blind spot is "can't multiply", which a 7B mostly doesn't have; family matters most for things a whole family learned wrong from the same data. -> A as "I haven't run these yet, here's what I'd bet"; B surprised sibling ~ stranger.
- M2 Goodhart table expectation: proxy climbs nearly monotonically down prompts; true accuracy rises P0 to P1/P2 then flattens or falls as small model spends capacity on padding; P5 more parse failures count as wrong. Best-of-N: pass at N rises steeply, random flat, proxy-picked tells if proxy has signal; tracks random -> selecting on length, no info about correctness. -> A.
- M3 Peeking results on Mac (Python 3.14, numpy, 20 trials, n 1,000): K 1 50.3%, 10 52.6%, 100 53.9%, 1,000 55.0%, 10,000 56.2%; fresh ~50%; lucky vote K 1,000 71.1% vs 50.5% fresh. -> A, as own run, numbers spoken as a progression, not a table.
- M4 Why: best of K noisy scores grows like standard error times roughly square root of two ln K; at 1,000 examples standard error about 1.6 points; 100 tries buy about 3 standard errors, about 4.8 points in theory, a bit less in practice; n 200 -> SE about 3.5 points, same 100 tries about 8 points of nothing (simulation 58.3%). -> A in words, explaining standard error as "how much one score wobbles"; no symbols.

## Break It

- K1 Give the judge the answer key: self-judge suddenly excellent; became string-matching verifier; bad grader was never because neural net, it had no access to truth independent of its own beliefs; reference answers cheapest independence; good LLM-judge setups give reference or fact-anchored rubric. -> "what if" exchange; B voices the realization.
- K2 Leak test into prompt: 5 test questions with answers as few-shot examples; those 5 near perfect, overall rises a little; at internet scale invisibly = contamination; check harness would catch it (prompt logged? overlap check?); add overlap check. -> exchange.
- K3 Pad a wrong answer: 20 responses stranger correctly rejected; append "I have carefully verified each step twice..."; count flips to YES; also move answer line to top, write it twice; each flip a free point; RL policy would discover within hours. -> exchange; ties to reward hacking.

## Explain It Back (substance must appear)

- E1 Separate because eval's job is independent measurement, not smart; two independences (errors; not optimized against); model can be fine grader if different model, judging easier, calibrated vs human labels; can't be the same thing and can't be the target. -> closing B/A exchange plus I4, I26.
- E2 Why not train on NDCG/accuracy: step functions, zero gradient; train on smooth proxy; even when you can optimize real metric (RL, selection), it stops being honest; need separate held-out measurement. -> I9, I10, plus B asks about RL/selection; A adds "even when you can".
- E3 Why test untouched if never trained on: decisions leak; best of 100 random models on 1,000 buys about 4 points; dev freely (discount), test once with log; leaks bypassing you: duplicates, same query/user both sides, test data in pretraining. -> I37-I43.
- E4 Scaling: automated search 10,000 prompt variants a day on 500-example dev set; fake improvement grows like square root of two ln K standard errors; at 500 SE about 2 points at 50%; best of 10,000 looks about 9 points better (simulated 58.9%); more search needs more data and separation: bigger dev set (noise shrinks with square root of n, 4x data halves it), separate validation to confirm winner, test once, fresh data regularly; cost: 10,000 x 500 = 5 million judge calls/day, cheap programmatic graders and caching, shortlist cheap confirm expensive. -> dedicated exchange after Measure, B poses scenario as his own plan.
- E5 Trust an LLM judge for ranker when criterion fuzzy and hand-labeling too slow; hand-label a few hundred (query, doc) pairs, measure agreement, false approval and false rejection, overall and per query type; different family than anything that generated/trained ranker; clear rubric with examples; check position/length bias by swapping order and padding; recalibrate periodically; never train ranker against judge without separate human-labeled test; check offline judge wins predict A/B wins. -> exchange after the four conditions or in close; B asks how he'd actually do it for the ranker.

## Go Deeper / Connections

- G1 One sentence: Manheim and Garrabrant's Goodhart categories, and Gao, Schulman and Hilton on reward overoptimization (maybe Hamel Husain). -> A, one line near end.
- C1 Connections: ranking metrics lesson applies it to cross-encoder; statistics for evals puts error bars; LLM judges full treatment; verifiers and rewards: an RL reward is an eval that became a target; tiny LM: train and val loss diverging = Goodhart on the training set. -> A, one or two sentences before the close.

## Flow

1. Problem: scene 1 cold open (arithmetic self-judge), B asks his own question, scene 2 (cross-encoder), same disease, thesis.
2. Origin: DARPA/NIST, Donoho, ImageNet, AlexNet, Baidu, saturation, contamination, GSM1k.
3. Thermometer, independence, the two independences, two loops sketch.
4. Loss vs metric, cross-encoder NDCG.
5. Self-grading: two students, correlated errors, self-preference, Huang; four boxes; Predict 91%; two-by-two slider; formula in words; correction with worked example.
6. Three graders, rule of thumb, four conditions, MT-Bench; LLM judge for ranker (E5).
7. Goodhart: history, why law, regressional, slider + Predict, RLHF, reward hacking, definition.
8. Splits: three piles, sketch, group leakage, adaptive overfitting, noise simulation, Ladder, Recht caveat.
9. Eval as spec, eval-driven development; offline vs A/B; ladder of rungs.
10. Build It: setup, verifier, three judges and correction, Goodhart prompt/best-of-N, harness, peek.
11. Measure: judge predictions, Goodhart expectations, peeking numbers + why; scaling question (E4).
12. Break It: answer key, leaked few-shot, padding.
13. Connections + one Go Deeper line; close: B restates, A sharpens.
