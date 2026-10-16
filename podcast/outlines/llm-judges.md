# Outline: llm-judges

Source: src/lessons/llm-judges.mdx. Curriculum entry: "LLMs as judges." Question: when can you trust a
model to grade another model? Why: cheap evals at scale, with biases you have to measure (position,
length, self-preference). Build: a judge, its agreement with your own labels, its position bias.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereq "why is the eval separate": the grader must not share the model's blind spots. -> A re-explains in one breath when "different model family" comes up.
- T2 Prereq "is that improvement real": confidence intervals, bootstrap, paired test. -> A re-explains briefly in the confidence-interval part (resample, paired = same items compared one by one).
- T3 Cost of the evenings: one to read, one to label 100 pairs, one to build; a few dollars of API at most. -> A, at the start of the build part, one sentence.

## The Problem

- P1 Retrained cross-encoder, no relevance labels this week; 500 queries, top result from each ranker, ask a strong model "which is more relevant, A or B". -> A opens on this scene.
- P2 New ranker wins 64%. Ship it? -> A asks; B says yes, plausibly (wrong model: the judge is a ruler).
- P3 Rerun swapped: old ranker wins 58%. Only the order changed. -> A reveals.
- P4 New ranker surfaces longer snippets; trim all to 40 words; win rate drops to 51%. -> A.
- P5 So the judge measured a mix of relevance, slot, and word count, unknown proportions; used a ruler without checking it was straight. -> B tries to name it, A sharpens.
- P6 Judge is useful (cheap, never tired, grades what no regex can) but it's an instrument; calibrate against a reference: you, with a hundred careful labels. -> A.

## Origin

- O1 By early 2023 old automatic metrics meaningless. BLEU (2002, machine translation, counts short word sequences shared with a reference; rewards copying wording, not being right). -> A, BLEU explained inline.
- O2 Great chat answer can share almost no words with the reference; humans gold standard but slow and expensive: a few dollars and a few minutes per comparison. -> A.
- O3 People quietly using GPT four to grade. June 2023, Lianmin Zheng and colleagues at LMSYS (Vicuna, Chatbot Arena), "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena": named and checked the practice. -> A, story.
- O4 MT-Bench: 80 hard multi-turn questions; expert votes plus crowd votes; GPT four agreed with experts over 80% of time excluding ties, about as often as two humans agreed. -> A; B reacts.
- O5 Same paper catalogued failures: prefers first answer, prefers longer even padded, favours own outputs, struggles grading maths it can't solve. Fixes still the starting point: swap order, reference answer, reason first. -> A.

## The Idea: why a model

- I1 Three graders: program (exact, free, instant, only when correct is code); person (anything, minutes and dollars, tires, disagrees, doesn't scale to 10,000 nightly); model (most open-ended things, few tenths of a cent, seconds, any volume, unknown blind spots). -> A, the price-check example as the program case.
- I2 Judge fits the gap between program and person: too open-ended for code (summary faithful, result relevant, agent answered the request) and too many for people. Stands in for a person, so the only question: how often does it say what a careful person would have said? -> A, states the episode's question.

## The Idea: three ways to ask (Figure 001)

- I3 Pointwise: one answer, score on fixed scale (relevance 0-3, helpfulness 1-5); natural for absolute number over time or one system. Weakness: fuzzy scale, 3 vs 4; drift across runs and prompt tweaks; bunching (lots of 4s, few 1s) hides small differences. -> A; B asks what's wrong with a score.
- I4 Term rubric: written grading instructions, what each score means; and anchor: concrete example per score level, e.g. "2 = right topic but doesn't answer". Anchors stop drift. -> A inline.
- I5 Pairwise: which of two is better; easier for models and people (which of two coffees is stronger vs rate one out of 10); relative judgements more stable. Chatbot Arena uses it; fits "is ranker B better than A". Weakness: order leaks in; scales badly over many systems (every pair); tells "better" not "good enough". -> A.
- I6 Reference-guided: gold answer; "is this right" becomes "does this say the same thing". Mattered most for maths/reasoning (confident wrong solution). Needs gold per item: often for extraction and QA, rarely open-ended. -> A.
- I7 Mix them: agents, reference-guided where known answer, pointwise strict rubric where not. -> A, one line.
- F1 Figure 001: three columns, each input box into judge plus rubric into output: score 1 to 5 (absolute, scale drifts), A/B/tie (relative, order matters), matches yes/no (easiest, needs gold). -> A summarises the three as a picture in one turn.

## The Idea: biases

- I8 A judge is an LM reading a prompt: anything that nudges the next token nudges the verdict. Listed roughly by how much they hurt. -> A.
- I9 Position bias: prefers a slot, usually first. Zheng measured by asking twice swapped: GPT four consistent about 65%; weaker judges far worse, one consistent under a quarter and almost always first. -> A; B surprised GPT four only 65.
- I10 Wang et al. 2023 "LLMs are not fair evaluators": swapping order can flip which of two models wins a benchmark. -> A.
- I11 Where from: training data (first option listed is often favoured), attention (first read with nothing to compare, second read in light of first). -> A.
- I12 Length bias: longer wins even when padding. "Repetitive list" attack: rephrase existing list items. Weaker judges preferred padded over 90%; GPT four fooled much less, not never. -> A.
- I13 Subtle: length sometimes real signal (longer often more complete); judge learned a correlation true on average, wrong when someone pads. -> B voices "but longer IS often better", A agrees and says that's why it's sneaky.
- I14 Matters enormously when the judged model is trained against the judge: learns to be long. AlpacaEval published length-controlled version in 2024. -> A.
- I15 Self-preference: rates own family higher. Zheng saw signs; Panickssery et al. 2024: models recognise own outputs better than chance, recognition correlates with favouring. Plain why: own outputs are the text it finds most likely; "reads naturally" leaks into "good". Fine-tuned Llama vs GPT outputs with GPT judge: judge has a stake. -> A, his scenario.
- I16 Confident tone: sure-sounding beats hedged with same content; fluent wrong beats halting right. Hosking et al. 2023: assertiveness skews human factuality ratings too. Judge can't check a fact it doesn't know. Term sycophancy: telling people what they want to hear / agreeing with whoever sounds most certain. -> A.
- I17 Format bias: headers, bullets, bold, citation-shaped brackets look like effort; for search snippets, structured list-like text beats plain prose that answers better. -> A.
- I18 Pattern: every bias is the judge using a feature that correlates with quality instead of quality; you'd do the same grading 10,000 essays in an afternoon. Fix: break the correlation, remove the feature or measure and cancel it. -> A, then B restates.

## Predict: swap fix

- PR1 Judge picks first 80% of time; ask both orders. Cancels position, length, both, neither? And for length? Answer: position yes, length no. Position is a push toward a slot; swapping moves it to the other answer, pushes cancel. Length is a push toward a property; longer answer longer in both orders; two verdicts tilted the same way average to tilted. Need trimming or measuring and subtracting. -> A asks, B says "both" (wrong), A explains.

## The swap test (Figure 002)

- I19 Most useful check, one extra call per item. -> A.
- F2 Figure 002: order 1 (A then B) and order 2 (B then A) through judge, combine. Four outcomes: A both -> A wins; B both -> B wins; A then B -> first slot won both, tie; B then A -> second slot won both, tie. -> A describes the four outcomes as talk, B works out what "picks A then picks B" means.
- I20 Consistency rate: fraction where same answer wins both orders; near 100% for unbiased judge on clear pairs; lower on close pairs even without bias (noise). -> A.
- I21 First-slot win rate over all 2N calls: should be near 50% if random slots; 60% real tilt; 80% mostly reading position. -> A.
- I22 Combine hard: agree -> answer; disagree -> tie. Soft: probability first wins, via logprobs (Term: how likely the model thought each next token; probability of "A" vs "B" is free confidence) or sampling several times; convert to "probability A wins", average. -> A.
- I23 Why soft is exact: judge's internal score = quality gap + position push + noise. Order 1: gap plus push; order 2 from A's view: gap minus push. Average above 50% exactly when the sum is positive; push cancels in the sum. Removes constant position bias completely. Hard version throws away "how sure", can only shrug with a tie. -> A, in words with a small worked example (gap small, push big), no symbols.

## Figure 003: the bias simulator

- F3 Simulated judge, 60 pairs with known answers, noise fixed; sliders for position bias and length bias, "pad the losers" toggle; three bars: one order, swap hard, swap average; readouts consistency, first-slot wins; grid of 60 cells right/wrong/tie. -> A describes as a little simulator you drag.
- F3a Both zero: one order about 87%, hard about same, average about 95%; averaging two looks also averages away some noise (bonus). -> A.
- F3b Position 1.0: one order about 72%, first slot 78%, consistency 43%, average stays 95%; hard stays down with one order because inconsistent pairs become ties worth half. -> A; B asks why hard doesn't help.
- F3c Position 2.0+: always first slot; one order coin flip; consistency near zero; average still 95%; caveat: in real life such a judge has stopped reading, fixed-noise assumption breaks, thought experiment. -> A, B skeptical prompts the caveat.
- F3d Position zero, length 1.0, pad on: worse answer always longer; all three around 65%, swap no help; length 2.0 all below chance, reliably picking the padded loser. -> A.
- I24 One line: swapping fixes biases tied to the slot, not biases tied to the answer. -> A.

## Mitigations

- I25 Table as talk: swap and average -> position; length control (trim/cap, or regress verdicts on length difference and report length-adjusted win rate, AlpacaEval LC) -> length; rubric with concrete anchors incl. "longer is not better", "formatting does not count" -> length, format, scale drift; reasoning before verdict -> snap judgements, position somewhat; reference answer -> confident-but-wrong, maths; different model family -> self-preference; several judges (majority of 3 models or 3 samples) -> noise, one model's quirks; hide the source -> brand or name bias. -> A walks through as a quick run, B pairs some with biases.
- I26 Reasoning before verdict: verdict-first commits to a letter in the first output token, then justifies it; Term post-hoc rationalisation; worthless as a check. Analysis first, verdict on own final line, verdict conditioned on reasoning; same chain-of-thought effect. Costs output tokens, the expensive ones. Thinking models do some of this but you pay thinking tokens as output. -> B voices "I'd ask it to explain its answer" wrong model; A corrects.
- I27 Different family: the separate-eval idea applied to judges; shared training data, tokenizer, style = shared blind spots. Two fine-tunes of same base: matters less. Your model vs vendor: third-family judge, or two judges from different families and trust only agreement. -> A, with T1 re-explained.

## The judge is a classifier (Figure 004)

- I28 Reframe: input (query, A, B) -> label (A, B, tie) = classifier; hand labels are ground truth; confusion matrix and agreement metrics. People skip it because it feels like an oracle; it's a 3-class classifier with unknown accuracy about to grade the model you'll ship. -> A; B "it's GPT, it's smart" wrong model.
- F4 Figure 004: rows your labels, columns judge's. Row A: 38/4/3 (45). Row B: 5/32/3 (40). Row tie: 6/5/4 (15). Column totals 49/41/10. Diagonal 74/100. Chance about 0.40. Kappa about 0.57. Only 4 of 15 ties found. -> A describes as a three by three grid over the phone, only the numbers that matter.
- I29 Accuracy = diagonal over total, 74/100; easy to fool: 90% clearly-new-better pairs, always-A judge scores 90%, learned nothing. -> A; B thinks 74 is fine.
- I30 Cohen's kappa: how much better than luck. Observed agreement (accuracy) and chance agreement (match if judge kept its label mix but assigned at random, from row and column totals). Kappa = of the room above luck, how much did the judge fill. -> A in words, no formula read.
- I31 Worked: chance = 0.45x0.49 + 0.40x0.41 + 0.15x0.10, about 0.40; kappa = 0.34 of 0.60 room, about 0.57. Always-A on 90/10: observed 0.9, chance 0.9, kappa 0. Checked in Python. -> A, worked in words: "room above luck is sixty points, it filled thirty-four".
- I32 Scale: 1 perfect, 0 luck, negative worse than luck. Landis and Koch 1977: 0.41-0.60 moderate, 0.61-0.80 substantial; not law. Useful comparison: human-human kappa on same items; you and a colleague at 0.65, judge at 0.6 is about as good as a second person; can't expect 0.9. -> A.
- I33 Confusion matrix shows how it's wrong: almost never says tie, 4 of 15. Specific fixable rubric problem ("say tie when neither answers better; don't break ties on length"). -> A.
- I34 Pointwise: rank correlation; Term Spearman (correlation after replacing values by ranks; only cares about order; consistently one point harsh still scores well). If absolute numbers matter ("average relevance 2.3"), also exact-match agreement and weighted kappa. -> A.
- I35 Calibration: bucket by stated confidence (50-60 ... 90-100), check accuracy per bucket; Term calibrated (says 80% sure, right 80%). Lets you act: auto-accept above 90%, rest to a human; if 90% bucket right 70%, routing silently wrong. -> A, his routing scenario.
- I36 Confidence intervals: 100 labels not a lot; 80% on 100 items has 95% interval about plus or minus 8 points (normal approximation, 0.078). "v2 82, v1 78" not evidence on its own. Statistics-for-evals: bootstrap and paired test; paired because both rubrics graded the same 100 pairs, compare pair by pair. -> B voices "82 beats 78", A corrects, T2 re-explained.

## Writing rubrics

- I37 Rubric is a spec; judge is a literal, fast, slightly lazy reader; say what you mean, define edge cases, give examples. -> A.
- I38 Search relevance graded scale (TREC-style, and Bing's Thomas et al. 2023): judge only relevance, ignore length/writing/formatting. 3 answers it (searcher would stop here; e.g. "python sort dict by value", page shows the sorted call with a key on the value). 2 useful (right topic, part of answer or one click; e.g. sorting lists of tuples without dicts). 1 related (same topic, wouldn't find answer; e.g. dict comprehension syntax). 0 not relevant, spam, broken. Pair: higher grade; same grade = tie; don't break ties on length or detail. -> A paraphrases the scale, no code read.
- I39 What makes it work: levels are behaviours of the searcher not adjectives; domain example per level; irrelevant features named and excluded; explicit tie rule attacks the tie blindness. -> A.
- I40 Agent task success (TinyFish): split checkable from not. Inputs: task, final answer, final URL, trajectory summary. Four yes/no with quoted evidence: reached a page where info visible; answer contains the info (not where to find it); every value supported by text on final page, quote it; did anything not asked that changes state (forms, buying, logging in). Success only if 1-3 yes and 4 no. -> A, his work.
- I41 Two ideas: decompose (four narrow yes/no easier than "succeed 1-10", and you know which part failed); demand evidence (quoting grounds the judge, defence against confident tone). -> A.
- I42 General rules: binary/3-way beat 1-10 (can't say what 6 vs 7 means, neither can judge); name features to ignore (length, formatting, tone, which came first); verdict last line fixed format, parse strictly, unparsed = counted failure not silent default; iterate on dev split, report held-out, else overfitting by another name. -> A, B connects overfitting.

## What it costs (Figure 005)

- I43 Cheap times a lot = surprise bills; arithmetic before every run: items x calls per item x (input tokens x input price + output tokens x output price). -> A in words.
- I44 Rubric 1,000-2,000 tokens identical every call; item 300-500; output 100-200. -> A.
- I45 Term prompt caching: provider stores processed form of prompt's beginning; later requests with exact same start pay a fraction; one character change misses. Put rubric first byte-identical, item after. -> A.
- F5 Figure 005: one call = 1,500 rubric (cacheable) + 400 pair + 150 out; per 1,000: no cache $7.95, cached $3.90, output $2.25 either way; example prices $3/M in, $15/M out, cache reads 0.1x; swap doubles, batch halves. -> A, numbers worked aloud.
- I46 Worked: no cache 1,900 x $3/M = $0.0057 + 150 x $15/M = $0.00225, about $0.008 per call, $7.95 per 1,000. Cached: 400 x $3/M = $0.0012 + 1,500 x $0.30/M = $0.00045 + $0.00225 = $3.90 per 1,000. Cache write about 1.25x on Anthropic, noise over 1,000. Swap doubles. -> A, B checks the arithmetic aloud.
- I47 Caching practicals: prefix match, anything varying (item, timestamp, request ID) after; minimum cacheable length varies by model (few hundred to few thousand tokens); expires after a few minutes idle; batch API about half price if you can wait hours, fine for nightly. -> A.
- I48 After caching, output is more than half the bill; reason first is worth it, but three sentences not three paragraphs. -> A.

## When not to use a judge

- I49 If a program can check it, use the program: extracted price vs page value; valid JSON matching schema; tests pass; arithmetic answer 42; retrieved doc contains the answer span (string match or ranking metrics). -> A, quick list said naturally.
- I50 Program has kappa 1.0 with itself, costs nothing, can't be talked into anything; judge there adds cost, noise, bias. Use judge for remainder (relevance, faithfulness, helpfulness, answered the question); prefer reference-guided when you can write a gold answer. -> A.
- I51 Don't use a judge as training reward without measuring: RL from AI feedback or DPO pairs by judge preference; every bias becomes a direction; length bias -> model pads; the pad-the-losers toggle, but on purpose. -> A, B "so it's reward hacking" connects.

## Build It

- B0 Task 0: any provider, small cheap model; keys in env vars never in code or committed file; example prices 1 and 5 dollars per million; budget 3 dollars. Wrapper: caches every response to disk keyed by exact request (reruns never pay twice); tracks spend from usage numbers and refuses past budget; marks system prompt (rubric) cacheable. Anthropic SDK shape, others differ. -> A, one stretch.
- B0a Input tokens count only uncached part; cached in separate cache fields; if cache read stays zero, rubric below minimum or something changing. Some models don't accept temperature; judges not fully deterministic anyway, another reason for the disk cache. -> A.
- B1 Task 1: 100 pairs, query and two results (title plus snippet or first ~150 words); sources: cross-encoder eval data or 30-40 own queries through a search API at different ranks. Mix ~40 easy, ~45 hard, ~15 ties. Randomise which is a/b. -> A; "most important task, no agent can do it, labels are yours".
- B1a Label blind before judge sees anything; labeller is boilerplate an agent may write (show, read a/b/t, append). One-line reason for hard ones. -> A.
- B1b Write your own rubric as you go: every hesitation, ask what rule you applied = rubric v1. Re-label 20 random pairs a day later without looking: self-agreement is the ceiling; you agree 85%, judge at 85% is as good as you. -> A; B reacts to "agree with yourself".
- B1c Split 60 dev, 40 test (don't look until end). -> A.
- B2 Task 2: judge.py: build_user (per-item part; shared stuff in system prompt); parse strict last line "VERDICT", None if not, counted; judge with swap returns verdict in terms of ORIGINAL a and b. Start with vague v0 ("which is more relevant, answer A, B or tie") for a bad baseline. From v1 reasoning first, verdict last line. Swap bookkeeping is where bugs live; test an obvious pair in both orders before 100. Logprobs if available for soft averaging. -> A, B asks why a deliberately bad baseline.
- B3 Task 3: agree.py: confusion matrix (rows human, cols judge), kappa, bootstrap interval for accuracy (resample pairs with replacement, recompute, 2.5th and 97.5th percentiles, 2,000 resamples). Check kappa on the 004 matrix: about 0.567; always-A two-class 90/10: exactly 0. Run v0 on dev one order: confusion, accuracy with interval, kappa, parse failures. -> A.
- B4 Task 4: swap every dev pair; report consistency, first-slot win rate, accuracy and kappa for order 1, order 2, hard combined, soft if logprobs. Write down expected first-slot rate first. Inconsistent pairs: hard/ties (honest uncertainty) or easy (bias)? -> A.
- B5 Task 5: pad(text, words) with content-free filler sentences ("This page provides a comprehensive overview of the topic", etc.). Pad the loser ~60 words: right verdict unchanged, every flip to padded loser is length bias. Pad the winner same: expect few; many means padding confuses in another way. Judge with swap test so position doesn't pollute. Then keyword-echo padding: tests keyword matching, expect it fools more; real SEO spam looks like this. -> A; B guesses which padding fools more.
- B6 Task 6: v1 reasoning first + verdict last + tie rule; v2 graded 0-3 with anchors from your queries and labelling rules; v3 ignore length/formatting/writing + two worked examples (hard pair, tie) from dev. Per version swap test on dev: accuracy, kappa, consistency, first-slot, pad-loser flips. Change the rubric for the kind of mistake, not the individual pair. Once only: best and v0 on test, headline number; paired bootstrap to say if best beats v0 beyond noise. Agent reviews rubric for ambiguities and dev leakage. -> A.
- B7 Task 7: from cached responses: average uncached input, cached input, output per call; cost per 1,000 with and without swap; without caching (cached tokens at full price); cache hit count. Scale: nightly 5,000 queries with swap, per night and per month. -> A.
- B8 Done when: 100 labelled, 60/40 split, 20-pair self-check; judge in either order in original terms; table for four versions on dev plus best and v0 on test; position and length bias measured and which fix applied; cost per 1,000 with/without caching and swapping. -> folded into A's description, not read as a checklist.

## Measure

- M1 Table columns as talk: per rubric version and split: accuracy with interval, kappa, consistency, first-slot win, pad-loser flips, dollars per thousand with swap. Expectations, not results. -> A, one sentence.
- M2 You vs you: probably 80-95% on 20 pairs, lower with many near-ties; the ceiling, write it next to every judge number. -> A.
- M3 v0 on dev: decent on easy, worse on hard and ties; tie column nearly empty (no permission to say tie); kappa well below accuracy because easy pairs make luck-level agreement high. -> A.
- M4 Position: current models much better than 2023, first-slot maybe only a few points above 50%; still meaningful inconsistent pairs, on hard pairs and ties; on hard = partly honest uncertainty; on easy = bias, read one by one. -> A, B surprised it's small now.
- M5 Length: generic fluff flips some fraction; keyword-echo more; v3 instruction reduces, rarely to zero; if flips don't move v2 to v3, instruction isn't working, use length control (trim both to same length). -> A.
- M6 Rubric iterations: biggest jump v0 to v1 or v2, mostly ties; smaller after; a few points of dev gain inside the plus or minus 8-10 interval on 60 items; trust direction across versions; test well below best dev = overfit, why test was held out. -> A.
- M7 Cost: cheap model, 1,500 rubric, 150 out: cents per hundred, roughly a dollar or two per thousand with swap (depends on price); caching cuts most of the rubric's share; zero cache hits -> check minimum length. Nightly 5,000: probably a few dollars a night, cheap next to human labelling, which is why one evening making sure it measures the right thing is worth it. -> A.

## Break It

- K1 Let it judge itself: 30 queries, answers from judge's own model and another family; label yourself; judge's win rate for own family vs your labels; gap = self-preference; swap judge to other family, gap flips. Why judge never same family as contestant. -> what-if exchange.
- K2 Verdict first: v2 with verdict on first line; accuracy usually drops; reasoning on wrong ones confidently justifies the letter; post-hoc rationalisation; "explain your answer" after the answer is not a check. -> exchange, callback to B's earlier wrong model.
- K3 Tune on test: fix rubric for test disagreements, test goes up; relabel 30 fresh pairs, drops back, probably below original test. Learned nothing, spent your only clean measurement. Same overfitting, harder to see when parameters are English sentences. -> exchange.
- K4 Confident and wrong: 10 pairs where better is plain and hedged; rewrite worse to sound authoritative ("the definitive answer is", "experts agree"), no correct info; count flips. Add reference line (one-line correct answer for each of 10) and count again. Reference answers: defence that doesn't depend on judge already knowing the truth. -> exchange.

## Explain It Back (content must appear)

- E1 Why a judge, and the one number: too open-ended for code, too many for people; fractions of a cent, seconds; stands in for a person, so agreement with careful human labels, ideally kappa, vs human-human or you-vs-you. -> ending turns + I2, I32.
- E2 Position bias: definition, measurement (consistency, first-slot), why swap fixes it (exactly with probabilities), why not length (trim or regress). -> PR1, I23, I24.
- E3 88% accuracy, manager says ship: check label balance and kappa; confusion matrix (never says tie, misses one direction); interval (88% on 100 roughly plus or minus 6); measured on tuning items or held out; judge family matches a contestant; swap test, because one-order accuracy can hide position bias lined up with pair order. -> a dedicated exchange where B plays the manager's question.
- E4 Scale: cost formula; swap doubles; at $4 per 1,000 swapped, 100,000 a night = $400 a night, about $12,000 a month. In order: cache rubric (about a tenth), batch API (half), shorten reasoning (output most expensive), cheapest model whose kappa holds, replace program-checkable parts, judge a random sample (a few thousand gives tight enough interval for a win rate). Sampling usually biggest win. -> exchange in cost section.
- E5 Refuse when a program can verify; when no human labels to calibrate; careful as training reward (length-biased reward -> padding model). -> I49-I51 and ending.

## Go Deeper / Connections

- G1 Best sources: the Zheng paper (bias sections and agreement tables) and Hamel Husain's practitioner write-up; maybe the Bing relevance paper as "your domain exactly". -> one closing-ish sentence before the ending.
- C1 Connections: the judge as a cheap labeller for ranking metrics: once kappa is good, it grades the top ten of thousands of queries, and NDCG on those labels decides whether the next cross-encoder ships. -> A, one sentence, NDCG explained in a phrase.

## Flow

1. Problem scene (P1-P6) with B saying "ship it". 2. Origin (O1-O5). 3. Three graders and the one question (I1-I2). 4. Three ways to ask (I3-I7, F1). 5. Biases (I8-I18). 6. Predict (PR1). 7. Swap test, soft averaging math in words (I19-I23, F2). 8. Simulator (F3, I24). 9. Mitigations, reasoning first, different family (I25-I27). 10. Classifier: matrix, accuracy, kappa, matrix tie blindness, Spearman, calibration, CIs (I28-I36, F4). 11. 88% manager exchange (E3). 12. Rubrics (I37-I42). 13. Cost (I43-I48, F5, E4). 14. When not to use (I49-I51). 15. Build It (B0-B8). 16. Measure (M1-M7). 17. Break It (K1-K4). 18. Go deeper + connections (G1, C1). 19. Ending: B restates, A sharpens.
