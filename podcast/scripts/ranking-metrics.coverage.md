# Coverage: ranking-metrics

Lesson src/lessons/ranking-metrics.mdx vs podcast/scripts/ranking-metrics.md. Item IDs match
podcast/outlines/ranking-metrics.md.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereq evaluator vs model; next topic stats | LLM labels; Three habits | "Quick reminder of the idea: the thing grading a model shouldn't share"; "that's its own topic, and it's the natural next one" | covered |
| P1 Slack thread, 0.421 vs 0.412 | Problem | "v two, N D C G at ten, point four two one" | covered |
| P2 five questions | Problem | "Linear gain or exponential?" ... "bigger than the noise?" | covered |
| P3 measuring stick; metric, queries, labels | Problem | "They're all about the measuring stick" | covered |
| P4 eval set > metric > third decimal | Problem | "The eval set matters more than the metric" | covered |
| P5 knew the names in diagnostic | Problem | "I mean, I know the names, though" | covered |
| O1 Cleverdon, Cranfield, ~1,400 docs | Origin | "Cyril Cleverdon, at the College of Aeronautics in Cranfield" | covered |
| O2 Cranfield paradigm | Origin | "That recipe is still called the Cranfield paradigm" | covered |
| O3 1992 TREC, pooling top 100 | Origin | "You take the top hundred from each one" | covered |
| O4 Järvelin, Kekäläinen, cumulated gain | Origin | "published something they called cumulated gain" | covered |
| I1 four objects, run, qrels, grade, metric | Four objects | "That list has a name, it's called a run" | covered |
| I2 per query first, distribution | Four objects | "that average hides a whole distribution" | covered |
| I3 running example, ten docs and grades | Four objects | "Rank one, the Python three point fourteen docs page" | covered |
| I4 assume four relevant exist | Four objects | "we'll pretend those four are the only relevant documents" | covered |
| I5 P@5 = 0.6 | Precision and recall | "Three out of five. Point six." | covered |
| I6 R@5 = 0.75 | Precision and recall | "so three quarters. Point seven five." | covered |
| I7 trade-off with k | Precision and recall | "recall can only stay the same or go up" | covered |
| I8 blind spots (order, grades, R) | Precision and recall | "Swap rank one and rank five ... doesn't move" | covered |
| I9 recall@100 for first stage, ceiling | Precision and recall | "it's the ceiling on everything your reranker can achieve" | covered |
| I10 one-answer users | MRR | "tinyfish docs" | covered |
| I11 reciprocal rank, example 1, would be 1/3 | MRR | "If it had been sitting at rank three instead, it'd be a third" | covered |
| I12 MRR, TREC-8 1999, @10 cap, MS MARCO | MRR | "about one labeled relevant passage per query" | covered |
| I13 top-heavy shape, ignores after first hit | MRR | "Going from rank nine to rank ten costs you about a hundredth" | covered |
| I14 all-relevant users | AP and MAP | "A patent examiner. A lawyer going through discovery." | covered |
| I15 AP walk, 0.692 | AP and MAP | "about point six nine. Point six nine two." | covered |
| I16 MAP, TREC workhorse | AP and MAP | "workhorse metric of TREC through the nineties" | covered |
| I17 divide by R, not hits; binary | AP and MAP | "not by the number you happened to find" | covered |
| I18 build graded metric | Building DCG | "Let's build one that does. From scratch" | covered |
| I19 gain, exp alternative, CG = 6 | Building DCG; Lab | "you get six. That's called cumulative gain" | covered |
| I20 discount, DCG | Building DCG | "multiply each document's gain by a discount" | covered |
| I21 why log vs 1/rank vs linear | Building DCG | "The log is the gentle middle" | covered |
| I22 discount values, 30% vs 10% at rank 10 | Building DCG | "rank ten still keeps almost thirty percent" | covered |
| I23 design choice, Wang 2013, RBP | Building DCG | "Wang and some colleagues showed in twenty thirteen" | covered |
| I24 why rank + 1; 2002 paper | Building DCG | "the log of one is zero" | covered |
| I25 DCG@5 = 4.387 | Building DCG | "D C G at five is four point three eight seven" | covered |
| I26 DCG scale depends on query | NDCG | "rack up a D C G somewhere in the teens" | covered (see note) |
| I27 IDCG 5.693, NDCG@5 0.771 | NDCG | "About point seven seven. That's N D C G at five" | covered |
| I28 ideal from all judged docs; famous bug | NDCG | "The ideal is built from all the judged documents" | covered |
| I29 Predict swap-cost | Predict | "point eight eight one down to about point seven nine four" | covered |
| F1 Fig 001 lab | Lab | "So picture a little lab. Ten rows" | covered |
| F2 Sort ideal; P@10 capped at 0.4 | Lab | "Precision at ten can never get above point four" | covered |
| F3 single relevant doc dragged | Lab | "Two different models of patience, drawn as two curves" | covered |
| F4 exponential gain, defaults, say which | Lab | "trec eval ... use linear gain by default" | covered |
| I30 Predict one-rel | Predict one relevant | "M R R favours the model that nails rank one" | covered |
| I31 rewards/ignores rundown | Which metric | "Precision at k rewards a clean top k" | covered |
| I32 web search NDCG@10, TREC DL | Which metric | "N D C G at ten, with graded labels, is the standard" | covered |
| I33 QA MRR@10, success@1 | Which metric | "something called success at one" | covered |
| I34 RAG recall@10, position bias | Which metric | "start and the end of the context more than what's in the middle" | covered |
| I35 first stage recall@100/1000 | Which metric | "recall at a hundred, or at a thousand" | covered |
| I36 funnel, Fig 002 | Funnel | "Picture it left to right. On the far left, the corpus" | covered |
| I37 bi-encoder | Funnel | "The document's vector never sees the query" | covered |
| I38 cross-encoder, gil/fish, 100 passes | Funnel | "attend directly to 'Global Interpreter Lock'" | covered |
| I39 capped by retriever recall | Funnel | "Your reranker's score is capped by the retriever's recall" | covered |
| I40 same candidates | Funnel | "rerank the exact same candidate lists" | covered |
| I41 ColBERT | Funnel | "Late interaction models, like ColBERT" | covered |
| I42 offline evaluation | Offline vs users | "what's called offline evaluation" | covered |
| I43 CTR, dwell, abandonment | Offline vs users | "Which is ambiguous" | covered |
| I44 position bias, Joachims 2005 | Offline vs users | "secretly swapped the top two results" | covered |
| I45 rank 30 gets no credit | Offline vs users | "the old one had at rank thirty" | covered |
| I46 offline iterate, A/B, interleaving | Offline vs users | "something called interleaving" | covered |
| I47 three choices | Which queries | "Which queries. Which documents get judged." | covered |
| I48 long tail, Fig 003 | Which queries | "Picture a curve, queries sorted by how often" | covered |
| I49 hand-picked, selection effect | Which queries | "That's a selection effect" | covered |
| I50 uniform over searches | Which queries | "while the tail is on fire" | covered |
| I51 uniform over distinct | Which queries | "now you get mostly tail" | covered |
| I52 strata, weight, freeze, locked set | Which queries | "Then freeze the set" | covered |
| I53 agents stratum | Which queries | "a lot of your users might be agents" | covered |
| I54 pooling, diversity | Pooling | "The more differently the pooled systems fail" | covered |
| F5 Fig 004 | Pooling | "Three columns, B M twenty-five, the bi-encoder, and your v one" | covered |
| I55 unjudged = 0, unfair to v2 | Pooling | "v two gets penalised for its best feature" | covered |
| I56 judged@k, 0.97/0.70, bpref | Pooling | "If v two's is point seven" | covered |
| I57 MS MARCO cautionary tale | Pooling | "M S MARCO is the cautionary tale here" | covered |
| I58 guideline | Guidelines | "the single most important document in an eval set" | covered |
| I59 user intent framing | Guidelines | "A page can be completely on topic and totally useless" | covered |
| I60 grade definitions | Guidelines | "Three, perfect: this page is the answer" | covered |
| I61 hard cases | Guidelines | "'Python', the snake or the language?" | covered |
| I62 what labelers see | Guidelines | "Decide that on purpose" | covered |
| I63 grade all, random, blind | Guidelines | "with the system names hidden" | covered |
| I64 two labelers, noise floor | Kappa | "a noise floor that no model improvement can climb above" | covered |
| I65 raw agreement misleading | Kappa | "ninety percent of everything 'not relevant'" | covered |
| I66 kappa in words | Kappa | "subtract how often they'd agree by chance" | covered |
| I67 worked example 0.5 | Kappa | "So kappa's a half" | covered |
| I68 weighted kappa; 0.61/0.78/0.90 | Kappa | "unweighted kappa came out point six one" | covered |
| I69 Landis-Koch, Voorhees 2000 | Kappa | "the ranking of the systems barely changed" | covered |
| I70 disagreements = missing sentences | Kappa | "Every one of them is a sentence missing from your guideline" | covered |
| I71 Thomas et al 2023 | LLM labels | "Paul Thomas and colleagues at Microsoft" | covered |
| I72 give guideline | LLM labels | "One, give the model your guideline. Verbatim" | covered |
| I73 calibrate vs humans | LLM labels | "between the LLM and each human, and between the two humans" | covered |
| I74 circularity, anchor slice | LLM labels | "keep a slice of human-labeled queries as an anchor" | covered |
| I75 different 300 queries question | How sure | "would v two still win?" | covered |
| I76 paired comparison | How sure | "That's called a paired comparison" | covered |
| I77 bootstrap, Efron 1979 | How sure | "Draw three hundred from those three hundred, with replacement" | covered |
| I78 Predict ci-width | Predict | "So N above a hundred forty-four. Call it a hundred fifty." | covered |
| F6 Fig 005 | Predict | "picture a little simulator for this" | covered |
| I79 report delta + CI sentence | Habits | "plus point zero zero nine, ninety-five percent interval" | covered |
| I80 per-query, worst ten | Habits | "Sort the losses and actually read the ten worst" | covered |
| I81 per stratum | Habits | "plus point zero five on the tail and minus point zero two" | covered |
| I82 t-test, permutation, Smucker 2007 | Habits | "Smucker, Allan and Carterette" | covered (planted B question removed in naturalness pass) |
| I83 MS MARCO facts | Benchmarks | "dev small, has six thousand nine hundred eighty queries" | covered |
| I84 TREC DL | Benchmarks | "forty-three for the twenty nineteen passage task" | covered |
| I85 BEIR | Benchmarks | "Eighteen datasets" | covered |
| B1 setup, SciFact, formats | Build: setup | "a literal 'Q zero' placeholder" | covered |
| B2 from-scratch rules and test numbers | Build: setup | "point nine oh nine. If you hit every one of those" | covered |
| B3 validate, fuzz, 2e-16, recip_rank uncut | Build: validate | "Trec eval's reciprocal rank isn't cut at ten" | covered |
| B4 three systems, agent review | Build: SciFact | "all Mini L M L six v two" | covered |
| B5 bootstrap function, 30-query subset | Build: bootstrap | "one big grid of random indices" | covered |
| B6 pilot steps | Build: pilot | "About twelve or thirteen from each bucket" | covered |
| B7 one-screen report | Build: pilot | "a one-screen report" | covered |
| M1 SciFact numbers | Measure | "point six five two ... point six seven six" | covered (MRR/MAP/R@10 per system compressed) |
| M2 CE wins less; BEIR 0.665/0.688; out of domain | Measure | "Out of domain, a big chunk ... evaporates" | covered |
| M3 bi-encoder recall@100 0.925 vs 0.873 | Measure | "Point nine two five versus point eight seven three" | covered |
| M4 ~8 ms/pair, times | Measure | "about eight milliseconds per pair on my Mac" | covered |
| M5 recall@100 identical | Measure | "your reranker is not reranking the same candidates" | covered |
| M6 bootstrap table | Bootstrap surprise | "interval runs from minus point zero zero five" | covered |
| M7 none distinguishable; 192 ties; SD 0.26 | Bootstrap surprise | "a hundred ninety-two of the three hundred queries tie" | covered |
| M8 30-query bounce | Bootstrap surprise | "bounced between about minus point zero zero six and plus point zero seven nine" | covered |
| M9 pilot expectations; N formula | Pilot | "divided by the smallest improvement you care about, and square it" | covered |
| K1 ideal from own run | Break It | "graded against their own homework" | covered |
| K2 ties, reverse order c b a | Break It | "three tied documents a, b, c come out c, b, a" | covered |
| K3 hide new system's best | Break It | "That's exactly what happens to your v two" | covered |
| K4 hand-picked; stats can't fix sampling | Break It | "No statistics can fix a biased sample" | covered |
| E1 derive NDCG | DCG/NDCG + close | "I divide by the ideal so every query counts the same" | covered |
| E2 MRR vs NDCG vs recall | Which metric | (as I32-I35) | covered |
| E3 +0.009 checklist | Back to the thread | "Before you believe it, here's what you check" | covered |
| E4 scale to 0.005, 1,600 queries, 500 hours | Pilot | "So about sixteen hundred queries" | covered |
| E5 clicks | Offline vs users | "once you correct for position bias" | covered |
| G1 go deeper | Back to the thread | "the original Järvelin and Kekäläinen paper" | covered |
| C1 connections | — | skipped (optional per STYLE) | skipped |

Numbers check: all script numbers match the lesson, except I26 where the lesson says ten perfect documents
"can reach a DCG of 15"; with linear gain and grade 3 the top-10 DCG is 3 x 4.54 = about 13.6, so the
script says "somewhere in the teens". Derived and not written in the lesson: none beyond that and
"a hundred forty-four" (twelve squared, from the lesson's sqrt N > 12).
