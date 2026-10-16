# Outline: ranking-metrics

Source: src/lessons/ranking-metrics.mdx. Curriculum entry: "Ranking metrics and eval sets." Question:
how do you prove a new ranker is better: which metric, which data, how sure? Why: his current work;
the eval set matters more than the metric.

Diagnostic note: he got ranking metrics right in the diagnostic (named NDCG, MRR, MAP). So B knows the
names but voices plausible wrong models about the details (divide AP by hits found, ideal from own run,
clicks as labels, hand-picked queries, two averages side by side, raw agreement, more statistics fixes
a biased sample).

Each item: what is taught -> how it is said aloud.

## Today / prerequisites

- T1 Prereq "why evals are separate" (evaluator vs model share blind spots); hands off to "is that improvement real". -> A re-explains the circularity idea briefly when LLM labels come up; one closing sentence on the stats follow-up.

## The Problem

- P1 Scene: three weeks training the cross-encoder, losses down, twenty notebook queries look better; posts "v2 NDCG at ten point four two one, v1 point four one two". -> A opens on his own Slack thread.
- P2 Five questions: which NDCG (linear or exponential gain); which queries (the twenty v1 was bad at); who labeled; were v2's new documents ever judged, else counted irrelevant; is plus point zero zero nine bigger than noise. -> A lists them conversationally; B reacts.
- P3 None are about the model; they're about the measuring stick. Better only relative to metric, queries, labels; change any and winner flips. -> A.
- P4 Core claim: eval set matters more than the metric, both matter more than the third decimal. -> A; B restates.
- P5 He named NDCG, MRR, MAP correctly in the diagnostic; this is the "why I know it" part. -> B: "I know the names" ; A: knowing names vs deriving.

## Origin

- O1 Early 1960s, Cyril Cleverdon, College of Aeronautics, Cranfield, England; comparing indexing of aeronautics papers; froze the problem: about 1,400 documents, fixed questions, human relevance lists. -> A story.
- O2 Recipe (documents, queries, judgments, metric) = Cranfield paradigm; every offline eval descends from it. -> A.
- O3 Breaks at a million docs; 1992 NIST starts TREC (Text REtrieval Conference); pooling: top 100 from each system, judge the union, everything else not relevant; that shortcut has a cost. -> A; B notes the cost.
- O4 2000-2002 Järvelin and Kekäläinen, Tampere: cumulated gain for graded relevance where top matters more = NDCG. -> A.

## The Idea: four objects

- I1 Four objects: queries; run (ranked list per query, "one run of one system", TREC file one line per query/doc/rank/score); qrels (query relevance judgments, the answer key); relevance grade (binary 0/1 or graded 0-3); metric (one number per query, then averaged). -> A, plain words, names after.
- I2 Per query first, averaged second; the average hides a distribution, which is where "how sure" lives. -> A plants it.
- I3 Running example: query "is the python gil gone"; ten docs graded: 1 Python 3.14 free-threading docs (3), 2 Monty Python cast (0), 3 PEP 703 summary (2), 4 Python 2.7 download (0), 5 2016 Gilectomy talk (1), 6-7 snake species, GIL meme (0,0), 8 free-threaded build HOWTO (2), 9-10 fish anatomy, SEO spam (0,0). -> A walks it slowly once; B repeats the pattern of hits (one, three, five, eight).
- I4 Four relevant; assume only four exist; real life you never know; unjudged problem later. -> A.

## Precision and recall

- I5 Precision at k: fraction of top k relevant; P at five = three of five = point six. -> A.
- I6 Recall at k: fraction of all relevant found in top k; R = total relevant = 4; R at five = three quarters. -> A.
- I7 Trade: precision about what you showed, recall about what you missed; raising k keeps or raises recall, usually drags precision. -> A.
- I8 Blind spots: order within top k (swap 1 and 5, no change), grades; recall needs R, only as good as judgments. -> B tries "precision cares about order"; A corrects.
- I9 Recall@k right for first-stage retriever feeding reranker; order within 100 doesn't matter; recall at 100 of first stage is ceiling on reranker. -> A ties to his BM25/bi-encoder stage.

## MRR

- I10 User wants one thing: navigational ("tinyfish docs"), factual ("when was PEP 703 accepted"), single QA passage; stop after finding it. -> A.
- I11 Reciprocal rank: one over rank of first relevant; rank 1 gives 1, 2 gives half, 10 gives a tenth, none gives 0. Example RR = 1; docs at rank 3 would give a third. -> A.
- I12 MRR = mean over queries; popularised by TREC-8 QA track 1999; MRR at 10 caps (nothing in top 10 = 0); MS MARCO official metric MRR at 10, about one labeled relevant passage per query. -> A.
- I13 Shape: rank 1 to 2 costs half, 9 to 10 about a hundredth; brutally top-heavy; ignores everything after first hit; one good + nine junk = ten perfect. -> A; B reacts.

## AP and MAP

- I14 Wants all relevant docs, early: patent examiner, lawyer in discovery, RAG wanting every useful passage. -> A.
- I15 Average precision: walk down, at each hit write precision there; sum; divide by R; missed contribute zero. Walk: 1/1, 2/3 (.667), 3/5 (.6), 4/8 (.5); AP = .692. -> A walks it, B works part of it.
- I16 MAP = mean over queries; workhorse of TREC in 1990s-2000s. -> A.
- I17 Trip-up: divide by R, not hits found; missed doc contributes 0; so AP depends on R, inherits recall's dependence on complete judgments; binary (grade 3 and grade 1 both a hit). -> B voices "divide by hits found"; A corrects.

## DCG

- I18 None use grades; build one; user reading top to bottom. -> A signpost.
- I19 Decision 1: gain = usefulness; simplest = grade; alternative 2^grade minus 1 (perfect worth much more). Cumulative gain top 5 = 3+0+2+0+1 = 6; ignores order. -> A.
- I20 Decision 2: discount shrinks with rank (likelihood user looks this far); one over log base two of rank plus one; sum gain times discount = DCG. -> A in words.
- I21 Why log: starts at 1, decreases, doesn't fall too fast. 1/rank: rank 10 is a tenth, past rank 3 barely matters. Linear drop: hits zero at arbitrary k, treats 1-2 swap same as 9-10. Log: drops fast at top, flattens. -> A; B asks why not 1/rank (genuine).
- I22 Discount values: 1, .631, .5, .431, .387, .356, .333, .315, .301, .289 vs 1/rank 1, .5, .333, .25, .2 ... .1. Rank 10 keeps almost 30% under log, 10% under 1/rank. -> A gives a few, not the table.
- I23 Design choice not law; model of gradually bored user; stuck because behaves well (Wang et al 2013 consistency); rank-biased precision replaces with a patience knob. -> A.
- I24 Why rank+1: log of 1 is 0, divide by zero; shift gives rank 1 discount of 1. 2002 paper left first few ranks undiscounted; plus-one form is later practice. -> A, brief.
- I25 Worked DCG at 5: 3 x 1 + 2 x .5 + 1 x .387 = 4.387. -> A, B.

## NDCG

- I26 DCG scale depends on query: ten perfect docs can reach 15 (derived? lesson says 15), one relevant can't pass 3; averaging lets easy many-answer queries drown others. -> A.
- I27 Ideal DCG: sort grades best to worst, DCG of that, cut at k. Ideal order 3,2,2,1,0: IDCG at 5 = 3 + 2x.631 + 2x.5 + 1x.431 = 5.693; NDCG = 4.387/5.693 = .771. -> A.
- I28 0-to-1 scale; 1 = best ordering for docs we know about; ideal from all judged docs in qrels, not from retrieved; missed HOWTO still in ideal; computing from own run = famous bug (Break It). -> B voices "ideal from my own list"; A corrects; forward pointer.
- I29 Predict swap-cost: swap ranks 1 and 3 vs move HOWTO 8 to 10. Swap: 4.0 to 3.5, DCG loss .5, NDCG@10 .881 to about .794. Move: 2x.315 to 2x.289, about .05, NDCG@10 to about .872. Top costs ~10x more. -> A asks, B guesses (maybe wrong), reveal.
- F1 Figure 001 RankLab: ten rows, drag to reorder, click grade to cycle, k slider, bars gain dashed outline and solid discounted; swapping inside top k leaves P and R unchanged but moves AP and NDCG; RR only first relevant; exp gain makes grade-3 dominate. -> "picture a little lab..."
- F2 Sort ideal: NDCG 1 at every k; AP and RR 1; P@10 can't exceed .4 with 4 relevant; precision capped by how many relevant exist, awkward to average. -> A.
- F3 One relevant doc dragged 1 to 10: RR 1, .5, .333...; NDCG 1, .631, .5...; NDCG = log discount, RR = 1/rank; two patience models as two curves. -> A.
- F4 Exponential gain: 3 to 7, 2 to 3, 1 stays 1; perfect answer dominates; statement about users; exp when "the" answer exists, linear when many roughly equally useful; trec_eval/pytrec_eval linear default; many LTR papers and LightGBM ranking objective exponential; always say which. -> A, tie to "which NDCG?" question.
- I30 Predict one-rel: MS MARCO one relevant grade 1. NDCG@10 = 1/log2(r+1), RR = 1/r; same direction; can't improve one hurting the other on one query; 2 to 1 = +.5 RR, +.37 NDCG; 10 to 5 = +.1 RR, +.10 NDCG; averaged can disagree; MRR favours nailing rank 1, NDCG forgives near misses. -> A asks, B answers partially.

## What each metric rewards / which to use

- I31 Summary table (grades? order? needs R? rewards / ignores) -> said as a quick spoken rundown, not a table.
- I32 Web search: short page, shades of usefulness, top 3 most attention; NDCG@10 graded standard, MRR sanity check for navigational; TREC DL reports NDCG@10. -> A.
- I33 QA: MRR@10 or success at 1. -> A.
- I34 RAG: reader is LLM, doesn't get bored at 4 but has context budget e.g. 10 passages; recall@10 first; NDCG still helps if best passage first or position bias (models use start and end more than middle). -> B: "LLM reads all ten, so order doesn't matter?" A: mostly, but.
- I35 First-stage feeding reranker: recall@100 or @1000. -> A.

## Funnel, bi- vs cross-encoder

- I36 Can't run big model over billions per query; funnel; cross-encoder near the narrow end. Figure 002: corpus billions -> BM25/bi-enc top ~1000 -> you top ~100 -> show 10; recall@k for retriever stage, NDCG@10 and MRR@10 for yours. -> described as a funnel over the phone.
- I37 Bi-encoder: separate vectors, dot product; doc vector never sees query; "does this match" squeezed into one dot product; embed corpus once, search in milliseconds. -> A.
- I38 Cross-encoder: CLS query SEP document, one transformer; "gil" attends to "Global Interpreter Lock" and to "fish"; nothing precomputed; 100 candidates = 100 forward passes per query at query time; why it sits after retriever and why its metrics are NDCG@10 and MRR@10. -> A, his model.
- I39 Consequence 1: score capped by retriever recall; always report first-stage recall@100 next to reranked NDCG@10. -> B voices "better reranker fixes it"; A corrects.
- I40 Consequence 2: fair comparison holds candidates fixed; v1 and v2 rerank same lists. -> A.
- I41 Late interaction, ColBERT, per-token doc vectors; worth knowing the name. -> A one line.

## Offline vs online

- I42 Offline evaluation: fixed queries + labels, no live users; repeatable, cheap per run, only as good as labels. -> A.
- I43 Online: CTR (fraction of impressions/searches clicked), dwell time (quick return = wrong), abandonment (no click: failure or snippet answered). -> A.
- I44 Clicks tempting; position bias: click higher regardless; click at 1 weak evidence, at 8 strong; Joachims 2005 eye-tracking, swapped top two, still clicked top. -> B voices "use clicks as labels"; A corrects.
- I45 Train/evaluate on current ranker's clicks = learn what current ranker puts on top; page from rank 30 gets no credit. -> A.
- I46 Offline = iterate, twenty checkpoints before lunch; online A/B or interleaving (merge two rankers per user, more sensitive since each user compares both) confirms; offline wins but online doesn't care -> usual culprit is eval set. -> A.

## Building the eval set: queries

- I47 Three choices: which queries, which docs judged, how judged. -> A signpost.
- I48 Long tail: few queries ("weather", "youtube") millions of times; most distinct queries once or twice. Figure 003: head/torso/tail curve; uniform over searches gives head, over distinct gives tail; stratify then weight. -> A describes curve.
- I49 Hand-picked (the notebook twenty) worst: chosen because v1 failed; selection effect. -> A, ties to his notebook; B sheepish.
- I50 Uniform over searches -> mostly head, easy, "everything great while tail burns". -> A.
- I51 Uniform over distinct -> mostly tail; where rankers differ most but undersells typical experience. -> A.
- I52 Strata by frequency (e.g. head = top third of traffic, torso next third, tail rest); fixed number from each; report per stratum + overall weighted by traffic share; real logs, recent window, remove private; freeze; keep a few hundred locked away (test set). -> A.
- I53 TinyFish twist: agents as users; longer, more literal, bursts from one task; own stratum; may want complete coverage over one nice snippet. -> A.

## Pooling

- I54 Pool: union of top results from several systems; outside = unjudged. Top 10 or 20 from systems that work differently (BM25, bi-encoder, current CE, maybe commercial API). Diversity: BM25 exact-match, embeddings paraphrases. -> A.
- F5 Figure 004: BM25, bi-enc, CE v1 top 5 each -> pool of 9 docs graded; new CE v2 top 5 has two never-seen docs scored 0, maybe great; fix judged@10; pool systems that fail differently. -> A over the phone.
- I55 Unjudged: standard scorers (trec_eval) treat as 0; a guess; fine for pooled systems, unfair to new v2; penalised for its best feature. -> B: "so v2 looks worse for being better?"
- I56 judged@k: fraction of top k with any label; v2 .97 vs v1 1.00 fine; .70 meaningless until you judge holes; judging holes is cheap and improves set for future models. Alternatives: bpref (Buckley and Voorhees 2004), dropping unjudged before scoring; judging holes usually best. -> A.
- I57 MS MARCO cautionary tale: one passage marked per query; many relevant unlabeled; strong rerankers put unlabeled-correct at 1, MRR penalised; why TREC DL re-judged a small set deeply with grades. -> A.

## Guidelines

- I58 Label meaningful only if two people would give same one; labeling guideline: rulebook, grade meanings, worked examples, rules for confusing cases; most important document in an eval set. -> A.
- I59 States user intent ("person typed this, about to click, would this satisfy them?"), not "on topic"; on topic can be useless. -> A.
- I60 Grades: 3 perfect (is the answer/destination), 2 highly relevant (substantially answers, maybe one more source), 1 related (on topic, partial, outdated), 0 not relevant (wrong meaning, spam, broken, useless); close to TREC DL four-level scale. -> A.
- I61 Hard-case rules: ambiguous ("python" snake vs language: most likely intent or intent mix), outdated (correct 2019 answer to "is the gil gone" now wrong), duplicates, paywalls, correct but low quality, wrong language. -> A.
- I62 What labelers see: query only or context (location, time); users/agents had context labeler doesn't; decide deliberately. -> A.
- I63 Grade every pooled doc, random order, system names hidden. -> A.

## Kappa

- I64 Same 50 queries' pooled docs to two labelers; big disagreement = ambiguous guide; noise floor no model improvement can rise above. -> A.
- I65 Raw agreement misleading; both mark 90% not relevant, agree mostly even guessing. -> B voices "75% agreement sounds good"; A corrects.
- I66 Kappa: agreement corrected for chance; 1 perfect, 0 chance; (observed minus chance) over (1 minus chance) said in words. -> A.
- I67 Worked: 100 docs; both yes 40, both no 35, A yes B no 15, A no B yes 10; observed .75; A yes 55%, B yes 50%; chance .55x.5 + .45x.5 = .5; kappa .5 = half the possible above-chance agreement. -> A walks with B.
- I68 Weighted kappa for grades: near-miss partial, far-miss full; quadratic penalises big gaps; scikit-learn cohen kappa score with quadratic weights. Simulated 500 labels, off by one about 40%: unweighted .61, linear .78, quadratic .90; always say which. -> A as "when I simulated".
- I69 Landis and Koch 1977 rough reading: .41-.60 moderate, .61-.80 substantial, above .80 almost perfect. Relevance subjective, don't expect .9. Voorhees 2000: assessors disagree on documents but system ranking barely changes when swapping judgments; noise hits all equally; doesn't flip winner if differences real and enough queries. Low kappa = fix guide, not give up. -> A; B voices "then labels are useless".
- I70 Disagreements: each is a missing sentence in the guide; go through together, add rule/example, relabel, recompute; two or three rounds moderate to substantial. -> A.

## LLM labels

- I71 Slow by hand; 2023 Paul Thomas et al at Microsoft: carefully prompted GPT four labels agreed with careful humans about as well as typical crowd workers, small fraction of cost; standard practice with three conditions. -> A.
- I72 Give the guideline verbatim with examples; model is a labeler like any other. -> A.
- I73 Calibrate vs humans on 50-query pilot: kappa LLM vs each human and human vs human; close = another reasonable labeler; else look where; recheck on prompt/model change. -> A.
- I74 Circularity: CE distilled from/trained on the same LLM now judging rewards agreeing with it, blind spots included; the "evaluator vs model separate" trap (re-explain); keep human-labeled anchor slice, check LLM-judged and human-judged slices agree on winner. -> B tie to his work.

## How sure: bootstrap

- I75 Mean NDCG is average over queries; easy (both 1), impossible (both 0), few where they differ; question isn't .421 > .412 but different 300 queries from same traffic, would v2 still win. -> A.
- I76 Paired comparison: per-query delta v2 minus v1; difficulty cancels; impossible is 0 minus 0; much more sensitive than two averages. -> B voices "compare the two averages / overlapping intervals"; A corrects.
- I77 Bootstrap (Efron 1979): draw N from N with replacement (some twice, some never), mean delta, repeat 10,000 times; middle 95% = 95% CI. -> A.
- I78 Predict ci-width: SD .12, true +.02; half-width ~ 2 x SD / sqrt N; need sqrt N > 12, N > ~150; in practice 300-500; halving detectable difference = 4x queries. -> A asks, B works it.
- F6 Figure 005 RankBootstrap: top per-query deltas with spike at zero; bottom 2,000 resample means, blue 95% bar; query slider (25 to 1600), new eval set button; at 100 usually crosses zero, by 400 usually doesn't. -> "picture a slider".
- I79 Habit: report delta + interval: "+.009, 95% CI −.004 to +.022, 300 queries, paired bootstrap". -> A says the sentence in words.
- I80 Habit: look at per-query deltas, wins/losses/ties, read ten worst losses = next training data. -> A.
- I81 Habit: per stratum; overall +.01 can be +.05 tail and −.02 head. -> A.
- I82 Other tests: paired t-test, paired randomization/permutation; Smucker, Allan, Carterette 2007 mostly agree on TREC; bootstrap gives interval directly, any metric; next topic goes deeper (multiple comparisons, how many queries). -> A brief.

## Benchmarks

- I83 MS MARCO 2016: real Bing questions, human answers; ~8.8M passages; dev small 6,980 queries, sparse single binary labels; MRR@10; BM25 ~.19; Nogueira and Cho 2019 BERT cross-encoder ~.36; cross-encoders took over reranking. -> A.
- I84 TREC DL 2019 on: same corpus, few dozen queries per year (43 for 2019 passage), judged deeply by NIST on four-level scale, pooled; NDCG@10; opposite trade. -> A.
- I85 BEIR 2021 Thakur et al: 18 datasets, varied domains; zero-shot (train MS MARCO, eval elsewhere); NDCG@10; BM25 stubborn out of domain; many dense bi-encoders below it; BM25 + CE strongest on average; pools from lexical systems disadvantage dense (unjudged at benchmark scale). -> A.

## Build It

- B1 Setup: folder, venv, pytrec_eval-terrier, ranx, rank_bm25, sentence-transformers, scikit-learn; SciFact: 5,183 docs, 300 test queries; corpus, queries, qrels test file; only test queries. TREC formats: qrels line query, legacy zero, doc, grade; run line query, Q0, doc, rank, score, run name. ranx compiles with Numba first call minute or two. -> one-sentence setup, formats in words.
- B2 Metrics from scratch, only math; functions per query; tie-breaking rule documented. Rules: relevant = grade 1+; R counts in qrels; ideal from all judged grades; no-relevant query consistent (trec_eval skips queries not in qrels); test numbers P .6, R .75, RR 1, AP .692, NDCG@5 .771, NDCG@10 .881, exp gain NDCG@10 .909. -> A, "the part that matters".
- B3 Validate vs pytrec_eval and ranx: fuzz 50 queries x 40 docs, 15 graded; max diff under one billionth; matched to about 2e-16 (floating-point rounding); confirms trec_eval ndcg_cut linear gain and log2(rank+1); recip_rank not cut at 10; tie-breaking usual culprit. -> A as "when I did this".
- B4 Bench: BM25 (rank_bm25, title + text, lowercase word regex), bi-encoder all MiniLM L6 v2 normalized, matrix product top 100, BM25 + cross-encoder ms marco MiniLM L6 v2 on BM25's 100; NDCG@10, MRR@10, MAP, R@10, R@100, judged@10; time; predict first; agent review for unfair comparisons. -> A.
- B5 Paired bootstrap function: per-query deltas, one big random index matrix, mean per row; wins/losses/ties; three comparisons; 30-query subset. -> A.
- B6 Pilot: sample 12-13 per bucket (head/torso/tail/agents), rule and seed saved; pool top 10 from 3+ systems, ~15-25 docs/query; guide 1-2 pages, 2 real examples per grade, 5 hard cases; you and a colleague label, shuffled, blind; spreadsheet columns; unweighted and quadratic kappa; read disagreements of 2+ grades, update, relabel; optional LLM; agent hunts guide ambiguity. -> A.
- B7 Report: first-stage recall@100; NDCG@10 (state gain), MRR@10, judged@10 for prod and new; delta, CI, W/L/T overall and per stratum; five worst losses with reasons; 300+ queries; skeptical agent review; every Problem question answered. -> A ties back to the Slack thread.

## Measure

- M1 SciFact results: BM25 NDCG .652, MRR .623, MAP .613, R@10 .774, R@100 .873, ~8 s; bi-encoder .645, .611, .603, .783, .925, ~29 s; BM25+CE .676, .653, .637, .791, .873, ~240 s (30,000 pairs). MRR uncut. -> A as "when I ran this on my Mac", only key numbers.
- M2 CE wins by less than you'd guess: ~+.024; BEIR paper BM25 .665, BM25+CE .688; out of domain (claims vs Bing questions); bigger gap in-domain like his web queries. -> B surprised; A explains.
- M3 Bi-encoder ties BM25 on NDCG but wins recall@100 (.925 vs .873): job of a first stage; rerank bi-encoder's top 100 -> ceiling .873 to .925. -> A.
- M4 Cost: ~8 ms per pair on Mac, 100 candidates most of a second per query vs one matrix product; Spark GPU batching faster but ratio holds. -> A.
- M5 Recall@100 identical BM25 vs BM25+CE: reranking same docs; if differs, bug. -> A.
- M6 Bootstrap: CE−BM25 +.024, CI −.005 to +.053, 59/49/192; bi−BM25 −.007, −.045 to +.031, 70/71/159; CE−bi +.030, −.005 to +.066, 74/58/168. -> A key ones.
- M7 Surprise: 300 queries, none clearly distinguishable from zero; 192 of 300 tie exactly; SciFact one or two relevant docs, NDCG jumps big; SD ~.26 not .12; 2 x .26 / sqrt 300 ≈ .030 half-width. -> B voices "so the cross-encoder isn't better?"; A: no detectable difference on this set.
- M8 30-query subsets: CE−BM25 mean bounced −.006 to +.079 across three draws; intervals about ±.07; notebook eval tells nothing about .02. -> A, ties to notebook twenty.
- M9 Pilot expectations: kappa .4-.6 first round normal for unweighted four-level; quadratic noticeably higher (.61 -> .90 simulated); disagreements cluster in two-three guide gaps; 50-query real-model interval wide; pilot job: calibrate guide and estimate SD so N ≈ (2 x SD / smallest delta)^2. -> A in words.

## Break It

- K1 Ideal from own run: every system's NDCG up, worst-recall systems most; found one of three, put first -> 1.0; found none -> ideal 0, divide by zero hint; common bug; test: retrieving nothing relevant must score 0. -> "what if".
- K2 Ties: round BM25 to one decimal; pytrec_eval ignores rank column, breaks ties on score by doc id reverse lexicographic (a, b, c -> c, b, a); numbers differ; quantised/rounded scores, saturating reranker at 1.0. -> "what if".
- K3 Hide new system's best: delete qrels for CE-only relevant docs in top 10; CE NDCG drops, others barely; judged@10 falls; what happens to v2 pooled from v1. -> "what if".
- K4 Hand-picked: 20 queries BM25 worst; improvement enormous, bootstrap convincing; compare CE to bi-encoder on same 20; interval answers wobble on resample, not representativeness; no stats fix a biased sample. -> B: "bootstrap would catch it?"; A no.

## Explain It Back (substance must appear)

- E1 Derive NDCG: gain/grade or exp; discount 1, .63, .5, ~.29 at 10; log modelling choice vs 1/rank; DCG; divide by ideal of all judged; 0 to 1 for fair averaging. -> covered by DCG/NDCG + closing B restatement.
- E2 MRR vs NDCG vs recall@k: one answer / several graded / presence; recall@100 ceiling. -> covered in which-metric section.
- E3 +.009 checklist: sampled not hand-picked, gain and k stated, same candidates, judged@10, kappa, LLM not same as distillation source, per-query deltas, bootstrap CI, W/L/T, strata; crossing zero = no detectable difference. -> A runs the checklist near the end against the Slack thread.
- E4 Scale: detect .005 with SD ~.1: 300 queries gives ~±.012; need sqrt N ≈ 40, ~1,600 queries; 4x per halving; 20 docs x a minute -> over 500 labeler-hours; LLM labels with human anchor, reuse qrels and judge only new holes, keep variance down (paired, fixed candidates, graded labels smoother); interleaving more sensitive per effort. -> B asks the scaling question naturally after the bootstrap; A works it.
- E5 Clicks: position bias; rank 30 no credit; snippet quality mixed in; abandonment ambiguous; useful online (A/B, interleaving) or as training data after position-bias correction. -> in offline/online section.

## Go Deeper / Connections

- G1 One sentence: Järvelin and Kekäläinen 2002 paper, Manning/Raghavan/Schütze IR book chapter 8. -> A at close.
- C1 Connections: vector search first stage; latency budget 100 forward passes back-of-envelope/tail latency. -> one sentence or skip.

## Flow plan

Problem (Slack thread) -> Origin (Cranfield, TREC, NDCG) -> four objects + running example -> precision/recall
-> MRR -> AP -> DCG built up -> NDCG + Predict swap -> lab figure -> one-rel Predict -> which metric for which job
-> funnel and his cross-encoder -> offline vs online, clicks -> eval set: queries, pooling, guide, kappa, LLM labels
-> how sure: paired bootstrap, Predict, figure, habits -> benchmarks -> Build It (metrics, validate, bench, bootstrap,
pilot, report) -> Measure (SciFact, bootstrap surprise, 30-query bounce, pilot expectations) -> scaling question
-> Break It x4 -> back to the Slack thread checklist -> B restates, A sharpens.
