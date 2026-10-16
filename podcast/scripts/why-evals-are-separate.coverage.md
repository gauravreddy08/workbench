# Coverage: why-evals-are-separate

Lesson src/lessons/why-evals-are-separate.mdx vs podcast/scripts/why-evals-are-separate.md. Item IDs
match podcast/outlines/why-evals-are-separate.md. All numbers checked against the lesson; derived
numbers (not in the lesson) are listed at the bottom.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs (trained models, val loss; tiny LM) | Connections and close | "remember training a tiny language model, watching the training loss keep falling" | covered |
| P1 his quote, both are ML models | The Problem | B: "they're both just machine learning models, right?" | covered |
| P2 word "eval" hides the important part | The Problem | "the word 'eval' hides the important part" | covered |
| P3 scene 1: self-judge 91%, script 55% | The Problem | "it says yes ninety-one percent... true accuracy is fifty-five percent" | covered |
| P4 347 x 28 = 9,616 vs 9,716; opinion of itself | The Problem | "You asked it for its opinion of itself" | covered |
| P5 scene 2: 60 decisions, 500 queries, +4 NDCG, CTR flat | The Problem | "sixty decisions against the same five hundred queries" | covered |
| P6 same disease, different organ; leaks through decisions | The Problem | "It's the same disease, just a different organ" | covered |
| P7 can be a neural net; independent and untouched | The Problem | "Being independent of the thing it measures. And being untouched" | covered |
| O1 DARPA, private recordings, NIST hidden test set | Origin | "a neutral party, NIST... holds back a test set" | covered |
| O2 Donoho, Common Task Framework, ruler belonged to nobody | Origin | "the ruler belonged to nobody" | covered |
| O3 ImageNet 2009, labels on server, capped submissions | Origin | "the test labels lived on a server" | covered |
| O4 AlexNet ~15% vs ~26% top-5 | Origin | "top five error around fifteen percent... about twenty-six" | covered |
| O5 Baidu 2015 disqualified | Origin | "a team from Baidu got disqualified" | covered |
| O6 GLUE 2018 / SuperGLUE 2019 saturation | Origin | "GLUE... beaten by models within about a year" | covered |
| O7 contamination | Origin | "That's called contamination" | covered |
| O8 GSM1k 2024, partly learned the test | Origin | "They'd partly learned the test" | covered |
| I1 what an eval is for; definition | Thermometer | "A fixed procedure: model goes in, score comes out" | covered |
| I2 thermometer vs doctor | Thermometer | "A thermometer is way dumber than a doctor" | covered |
| I3 independence defined | Thermometer | "knowing one tells you nothing about the other" | covered |
| I4 two independences, bias in flattering direction | Thermometer | "They add bias. And always in the flattering direction" | covered |
| I5 two loops, one wall | Thermometer | "two loops with a wall between them... The wall is the point" | covered |
| I6 two numbers in one run, on purpose | Loss is not the metric | "already two different numbers, and they're different on purpose" | covered |
| I7 objective cheap + differentiable; step function; cross-entropy | Loss is not the metric | "nobody actually cares about cross-entropy" | covered |
| I8 metric opposite constraints, examples | Loss is not the metric | "did the user buy something in the next week" | covered |
| I9 cross-encoder: BCE/pairwise vs NDCG@10, sort step fn, 40th doc | Loss is not the metric | "more confident about the document it ranks fortieth" | covered |
| I10 optimizable vs true | Loss is not the metric | "chosen to be optimizable... chosen to be true" | covered |
| I11 two students, correlated errors | Self-grading | "They stack, in one direction. Up." | covered |
| I12 judging prompt doesn't install arithmetic | Self-grading | "a judging prompt doesn't install new arithmetic" | covered |
| I13 self-preference bias | Self-grading | "That's called self-preference bias" | covered |
| I14 Huang et al. 2023 | Self-grading | "Huang and colleagues, in twenty twenty-three" | covered |
| I15 four boxes, false approval | Self-grading | "Call it a false approval... false positive" | covered |
| I16 Predict 523 + 383 = 906, ~91% | Self-grading | "Five twenty-three plus three eighty-three is nine oh six" | covered |
| I17 interactive judge grid, presets, sliders, illustrative | Self-grading | "picture a little two-by-two grid... Those presets are made up" | covered |
| I18 measured formula in words; weak model lie biggest | The formula | "the lie is biggest exactly when the model is weak" | covered |
| I19 independent FAR stable; self FAR depends on model; unfair comparison | The formula | "It's a property of the judge... a property of the pair" | covered |
| I20 backward correction; Rogan-Gladen 1978; needs stable rates | The formula | "It's called the Rogan Gladen correction" | covered |
| I21 three graders, cost vs truth | What can grade | "There are three kinds of grader" | covered |
| I22 programs: examples, verifier, strengths, failures | What can grade | "Multiplying back checks a division... the code is awful" | covered |
| I23 humans: strengths, failures, prefer long confident | What can grade | "people also prefer confident, long, well-formatted answers" | covered |
| I24 models: strengths, failures | What can grade | "fooled by text that was written to fool them" | covered |
| I25 rule of thumb, three examples | What can grade | "use the cheapest grader that's independent enough for the decision" | covered |
| I26 four conditions; MT-Bench >80%, biases | What can grade | "Above eighty percent... self-enhancement bias" | covered |
| I27 "both ML models" fine, "share errors" not | What can grade | "'Both share errors' is not." | covered |
| I28 Goodhart 1975, Strathern | Goodhart | "When a measure becomes a target, it ceases to be a good measure" | covered |
| I29 why a law: gap cheap, real hard | Goodhart | "easier to please by writing more than by being right" | covered |
| I30 regressional Goodhart, 30 of 300 | Goodhart | "That flavor's called regressional Goodhart" | covered |
| I31 Goodhart slider described | Goodhart | "picture a slider for optimization pressure" | covered |
| I32 Predict: peak 30-40 at 0.42, score to 3.3, -0.84 at 100, top-10% weak, 0.77 to 0.10 | Goodhart | "about minus zero point eight four" | covered |
| I33 RLHF, Gao/Schulman/Hilton 2022, KL penalty, other evals, reward hacking | Goodhart | "R L H F is Goodhart's law with a G P U" | covered |
| I34 eval = measurement you promise not to optimize against | Goodhart | "a measurement you promise not to optimize against directly" | covered |
| I35 how many times influenced a decision | Train, dev, test | "how many times has this data influenced a decision?" | covered |
| I36 train set | Train, dev, test | "touched millions of times by gradients" | covered |
| I37 dev set leaks through you | Train, dev, test | "partly fit to the dev set, through you" | covered |
| I38 test set once; deciding with it makes it dev | Train, dev, test | "it just turned into a dev set" | covered |
| I39 80/10/10 bar, touch counts, leak arrows | Train, dev, test | "Train is the big chunk, about eighty percent" | covered |
| I40 group leakage, split by query/user/time | Train, dev, test | "split along whatever will be new in production" | covered |
| I41 adaptive overfitting, adaptive data analysis | Train, dev, test | "they call it adaptive data analysis" | covered |
| I42 random-label simulation, 71% vote | Train, dev, test | "that vote scores about seventy-one percent. On a fresh one? Fifty." | covered |
| I43 4 points > typical paper wins; Blum and Hardt Ladder, Kaggle | Train, dev, test | "a paper by Blum and Hardt called 'The Ladder'" | covered |
| I44 Recht 2019 caveat, 11-14 pts, ranking preserved | Train, dev, test | "about eleven to fourteen points. But the ranking..." | covered |
| I45 writing the eval decides what good means | Eval is the spec | "Writing the eval forces you to decide what 'good' means" | covered |
| I46 spec example, questions it answers, two engineers | Eval is the spec | "with no drop on the fifty navigational queries" | covered |
| I47 eval-driven development, regression suite, his harness | Eval is the spec | "It's T D D with a score instead of pass or fail" | covered |
| I48 offline eval | Offline and online | "Everything so far is an offline eval" | covered |
| I49 A/B test, slow, risky, closest to truth | Offline and online | "the ground truth for a product is an A B test" | covered |
| I50 ladder of rungs; NDCG vs CTR; measuring offline-online | Offline and online | "trust their offline evals for good reasons, instead of out of habit" | covered |
| B0 setup: Ollama, three models, cached client, seeded 400 Qs, fifth to two thirds | Build It: Setup | "between a fifth and two thirds of them right" | covered |
| B1 verifier, unparseable count, eyeball 10, broken ruler | Build It: Setup | "a verifier that marks right answers wrong because of a comma is a broken ruler" | covered |
| B2 three judges, no answer, 100/300 calibration, hint | Build It: Three judges | "look at the gap between the two rates for the self-judge" | covered |
| B3 looks_good, six prompts, best-of-N, pass@N, healthy part, optional rater | Build It: Flawed metric | "That's the healthy part of the curve" | covered |
| B4 harness: hashes, config, run folder logging, bootstrap, final flag, test log, agent review | Build It: Harness | "your test set's turning into a dev set" | covered |
| B5 numpy peek, n 1,000 then 200 | Build It: Harness | "shrink it to two hundred examples" | covered |
| B6 done-when | Build It: Harness | "So you're done when you've got true accuracy" | covered |
| M1 judge expectations (prediction), sibling ~ stranger finding | Measure: judges | "this is a prediction to check, not a result" | covered |
| M2 prompt and best-of-N expectations | Measure: Goodhart | "the proxy's selecting on length" | covered |
| M3 peeking numbers 50.3 ... 56.2, vote 71.1 / 50.5 | Measure: Peeking | "Best of ten thousand, fifty-six point two" | covered |
| M4 standard error 1.6, ~3 SE, 4.8 theory; n 200 -> 3.5, ~8, 58.3 | Measure: Peeking | "My simulation gave fifty-eight point three" | covered |
| K1 answer key -> verifier; reference = cheapest independence | Break It | "A reference answer is the cheapest independence you can buy" | covered |
| K2 leak 5 test Qs as few-shot; contamination; overlap check | Break It | "If not, add an overlap check" | covered |
| K3 pad wrong answer, flips, RL finds in hours | Break It | "would discover tricks like that within hours" | covered |
| E1 why separate (full answer) | Close | "The eval's job isn't to be smart..." | covered |
| E2 why not train on NDCG; even via RL/selection | Loss is not the metric | "Like with R L, or just trying a bunch of candidates" | covered |
| E3 why test untouched; leaks bypassing you | Train, dev, test; Peeking | "Duplicates across the splits. The same query showing up on both sides" | covered |
| E4 scaling: 10,000 variants, 500 ex, ~2 pts SE, ~9 pts, 58.9, bigger dev, 4x halves, 5 million calls | Measure: Peeking | "five million judge calls a day" | covered |
| E5 LLM judge for ranker, checks | What can grade | "If I wanted an L L M judge for relevance" | covered |
| G1 Go Deeper one line | Close | "read Manheim and Garrabrant's... and Gao, Schulman and Hilton" | covered |
| C1 connections | Close | "a reward is literally an eval that became a target" | covered |

## Numbers derived for the ear (not written in the lesson)

- Worked backward-correction example: judge approves 90% of right, 20% of wrong, reports 60% -> (60 - 20) / 70 ≈ 57%.
- Self-judge gap of the two rates in the Predict example: 95% - 85% = one tenth, so errors get amplified about ten times.
- "Fifty-four I got" = the lesson's 53.9% rounded.
