# Coverage: llm-judges

Lesson src/lessons/llm-judges.mdx vs podcast/scripts/llm-judges.md. Item IDs match
podcast/outlines/llm-judges.md. All numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 separate eval, shared blind spots | Mitigations | "Remember the idea behind keeping your eval separate" | covered |
| T2 CIs, bootstrap, paired test re-explained | Classifier | "resampling your hundred pairs with replacement thousands of times" | covered |
| T3 evenings, a few dollars | Build It: Setup | "Plan on an evening to label a hundred pairs" | covered |
| P1 retrained ranker, 500 queries, ask A or B | Problem | "you take five hundred queries" | covered |
| P2 64%, ship it? | Problem | "the new ranker wins sixty-four percent"; B "ship it?" | covered |
| P3 swapped, old wins 58% | Problem | "now the old ranker wins fifty-eight percent" | covered |
| P4 trim to 40 words, 51% | Problem | "trim every snippet down to forty words... fifty-one percent" | covered |
| P5 mix of relevance/slot/length; ruler not checked | Problem | "You used it like a ruler" | covered |
| P6 useful instrument, calibrate vs your 100 labels | Problem | "the reference here is... you" | covered |
| O1 early 2023, BLEU 2002 explained | Origin | "The famous one is BLEU, from two thousand two" | covered |
| O2 no shared words; humans few dollars/minutes | Origin | "A few dollars and a few minutes per comparison" | covered |
| O3 GPT four quietly; June 2023 Zheng, LMSYS, Vicuna, Arena | Origin | "Lianmin Zheng and colleagues at L M Sys" | covered |
| O4 MT-Bench 80 questions; >80% excl. ties; like two humans | Origin | "eighty hard multi-turn questions" | covered |
| O5 failure modes and the fixes | Origin | "It preferred whichever answer came first" | covered |
| I1 program / person / model | Why a model | "three ways to grade an output" | covered |
| I2 gap; the one question | Why a model | "How often does it say what a careful person would have said?" | covered |
| I3 pointwise + weaknesses (drift, bunching) | Three ways | "Lots of fours, hardly any ones" | covered |
| I4 rubric, anchor terms | Three ways | "That concrete thing is called an anchor" | covered |
| I5 pairwise, coffee, Arena, scales badly, not "good enough" | Three ways | "which of two coffees is stronger" | covered |
| I6 reference-guided, maths, needs gold | Three ways | "does this say the same thing as that?" | covered |
| I7 mix for agents | Three ways | "A common setup for agents" | covered |
| F1 three columns described | Three ways | "So picture the three side by side" | covered |
| I8 anything nudging next token | Biases | "anything that nudges a language model's next token" | covered |
| I9 position; GPT four ~65%; weak <quarter | Biases | "consistent less than a quarter of the time" | covered |
| I10 Wang et al. order flips winners | Biases | "Large Language Models are not Fair Evaluators" | covered |
| I11 why: training data, attention | Biases | "Partly training data... partly attention" | covered |
| I12 length; repetitive list; >90%; GPT four less | Biases | "repetitive list attack" | covered |
| I13 length sometimes real signal | Biases | B "longer usually is better, right?" | covered |
| I14 trained against judge; AlpacaEval LC 2024 | Biases | "length-controlled version in twenty twenty-four" | covered |
| I15 self-preference, Panickssery 2024, Llama vs GPT | Biases | "the judge has a horse in the race" | covered |
| I16 confident tone, Hosking 2023, sycophancy | Biases | "This is a cousin of sycophancy" | covered |
| I17 format bias | Biases | "little brackets that look like citations" | covered |
| I18 correlates-with-quality pattern; break correlation | Biases | "Every bias is the judge using a feature that correlates" | covered |
| PR1 predict swap fix | Predict | B "Both, I'd say"; "the length travels with the answer" | covered |
| I19 one extra call per item | Swap test | "costs one extra call per item" | covered |
| F2 four outcomes | Swap test | "Picture a little two-by-two" | covered |
| I20 consistency rate | Swap test | "The consistency rate" | covered |
| I21 first-slot rate, 50/60/80 | Swap test | "Sixty means a real tilt. Eighty means..." | covered |
| I22 hard vs soft; logprobs term | Swap test | "log-probs, that's short for log-probabilities" | covered |
| I23 gap + push + noise, push cancels exactly | Swap test | "a gap of one... push of three canceled exactly" | covered |
| F3 simulator described | Simulator | "Picture a little simulator. Sixty pairs" | covered |
| F3a 87/~87/95, noise bonus | Simulator | "about eighty-seven percent right" | covered |
| F3b pos 1.0: 72, 78, 43, 95; hard stays down | Simulator | "Consistency drops to forty-three percent" | covered |
| F3c pos 2+: coin flip, 95; thought experiment | Simulator | "That end of the slider is a thought experiment" | covered |
| F3d length 1 + pad: ~65; length 2 below chance | Simulator | "all three fall below chance" | covered |
| I24 slot vs answer one-liner | Simulator | "swapping fixes biases tied to the slot" | covered |
| I25 mitigation table | Mitigations | "Quick run through" | covered |
| I26 reasoning before verdict, post-hoc, cost, thinking tokens | Mitigations | "post-hoc rationalisation" | covered |
| I27 different family, same-base case, third family | Mitigations | "use a judge from a third family" | covered |
| I28 judge is a classifier, not oracle | Classifier | "It's a classifier. A three-class classifier." | covered |
| F4 confusion matrix numbers | Classifier | "thirty-eight... thirty-two... only four" | covered |
| I29 accuracy 74, always-A 90% | Classifier | "A judge that always answers A" | covered |
| I30 kappa definition in words | Classifier | "of the room above luck, how much did the judge fill?" | covered |
| I31 worked: ~0.40, 34 of 60, ~0.57; always-A 0; Python | Classifier | "Thirty-four over sixty is about point five seven" | covered |
| I32 scale, Landis and Koch, human-human 0.65 vs 0.6 | Classifier | "Landis and Koch, back in nineteen seventy-seven" | covered |
| I33 tie blindness 4 of 15, fix | Classifier | "The judge found four of them" | covered |
| I34 Spearman, weighted kappa | Classifier | "Spearman correlation is the usual one" | covered |
| I35 calibration, routing | Classifier | "Auto-accept any verdict above ninety percent" | covered |
| I36 +-8 on 100, 82 vs 78, paired | Classifier | "plus or minus eight points" | covered |
| I37 rubric is a spec | Rubrics | "very literal, very fast, slightly lazy reader" | covered |
| I38 0-3 scale with examples, Bing/Thomas 2023 | Rubrics | "python sort dict by value" | covered |
| I39 why it works | Rubrics | "a behaviour of the searcher" | covered |
| I40 agent four questions | Rubrics | "four yes-or-no questions" | covered |
| I41 decompose, demand evidence | Rubrics | "Decompose... And demand evidence" | covered |
| I42 general rules incl. strict parse, dev/held-out | Rubrics | "overfitting by a different name" | covered |
| I43 cost formula in words | Cost | "The cost is the number of items, times calls per item" | covered |
| I44 1-2k rubric, 300-500 item, 100-200 out | Cost | "one to two thousand tokens" | covered |
| I45 prompt caching term, prefix first | Cost | "Rubric first, byte-for-byte identical" | covered |
| F5 example prices, 7.95 vs 3.90, output 2.25 | Cost | "Seven dollars ninety-five per thousand" | covered |
| I46 worked arithmetic, cache write 1.25x, swap doubles | Cost | "about one and a quarter times, on Anthropic's API" | covered |
| I47 prefix, minimum length, expiry, batch half | Cost | "three practical things about caching" | covered |
| I48 output > half; three sentences | Cost | "three sentences of reasoning, not three paragraphs" | covered |
| I49 program-checkable list | When not | "If a program can check it, use the program" | covered |
| I50 kappa 1 with itself; reference-guided preferred | When not | "A program has a kappa of one with itself" | covered |
| I51 judge as training reward | When not | "So it's reward hacking" | covered |
| B0 setup wrapper: disk cache, budget, cacheable system | Build: Setup | "caches every response to disk, keyed by a hash" | covered |
| B0a usage fields; no temperature | Build: Setup | "There's no temperature setting in there" | covered |
| B1 100 pairs, sources, 40/45/15, randomise | Build: Label | "About forty easy pairs" | covered |
| B1a blind labelling, labeller boilerplate, reasons | Build: Label | "you label them blind" | covered |
| B1b rubric as you go; re-label 20; ceiling 85 | Build: Label | "a judge at eighty-five is as good as you" | covered |
| B1c 60 dev / 40 test | Build: Label | "Sixty pairs are dev" | covered |
| B2 judge functions, original-terms verdict, v0, swap test of one pair, logprobs | Build: Judge | "always reports the verdict in terms of the original A and B" | covered |
| B3 confusion, kappa, bootstrap 2,000, checks 0.567 and 0 | Build: Measure agreement | "about point five six seven" | covered |
| B4 swap run reports; expectation first; hard vs easy flips | Build: Position | "write down what first-slot win rate you expect" | covered |
| B5 pad function, loser/winner 60 words, keyword echo, SEO | Build: Length | "Pad the loser with about sixty words" | covered |
| B6 v1-v3, metrics per version, test once, paired bootstrap, agent review | Build: Iterate | "When you're done, and only once" | covered |
| B7 cost task, 5,000 nightly | Build: Cost | "five thousand queries, with the swap test" | covered |
| B8 done-when | Build: Cost | "And you're done when you've got a hundred pairs" | covered |
| M1 table as talk, expectations | Measure | "expectations to check, not results to match" | covered |
| M2 you vs you 80-95 | Measure | "eighty to ninety-five percent on twenty pairs" | covered |
| M3 v0: tie column empty, kappa below accuracy | Measure | "no permission to say tie" | covered |
| M4 position small now; where inconsistencies sit | Measure | "only a few points above fifty" | covered |
| M5 length expectations, trim if v3 doesn't move | Measure | "Trim both results to the same length" | covered |
| M6 iterations, +-8-10 on 60, overfit check | Measure | "plus or minus eight to ten point interval" | covered |
| M7 cost expectations, few dollars a night | Measure | "probably a few dollars a night" | covered |
| K1 judge itself | Break It | "Let it judge itself" | covered |
| K2 verdict first | Break It | "my 'just explain your answer' idea, failing live" | covered |
| K3 tune on test | Break It | "spent your only clean measurement" | covered |
| K4 confident and wrong + reference | Break It | "The definitive answer is", "experts agree" | covered |
| E1 why a judge + the one number | Why a model; Close | "measure how often it says what you would have said" | covered |
| E2 position bias full answer | Predict; Swap test; Close | "the length travels with the answer" | covered |
| E3 88% manager checklist incl. +-6 | What do you check first | "roughly plus or minus six points" | covered |
| E4 scaling, $400/night, $12,000/month, order of fixes, sampling | Cost | "four hundred dollars a night" | covered |
| E5 refuse: program, no labels, training reward | When not; Close | "if a program can check it" | covered: "no way to get any human labels to check it against" |
| G1 sources | Go Deeper | "the original Zheng paper... Hamel Husain" | covered |
| C1 ranking metrics connection, NDCG | Go Deeper | "N D C G and friends" | covered |

