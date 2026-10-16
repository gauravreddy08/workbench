# Coverage: statistics-for-evals

Lesson src/lessons/statistics-for-evals.mdx vs podcast/scripts/statistics-for-evals.md. Item IDs match
podcast/outlines/statistics-for-evals.md. All numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs / quantization pair | Build It | "One's the quantization run, where you evaluated one model in its original sixteen-bit form" | covered |
| P1 v6 71.2 vs v7 72.0, 500 queries, Slack | Problem | "v six, seventy-one point two percent... is that significant?" | covered |
| P2 rerun at temp 0.7: 70.6, 71.8, moved 1.2 | Problem | "Seventy point six. Run it again. Seventy-one point eight" | covered |
| P3 score is a measurement, noisy instrument, error bar | Problem | "An eval score isn't a fact about the model. It's a measurement." | covered |
| P4 smarter comparison is cheap, not the two numbers | Problem | "It just isn't the two numbers you printed." | covered |
| O1 Gosset, Guinness, small samples | Origin | "William Sealy Gosset who worked for the Guinness brewery in Dublin" | covered |
| O2 1908, pen name Student, t-test | Origin | "came out under a pen name. Student." | covered |
| O3 sleeping drugs, ten patients, per-patient difference | Origin | "He took the difference for each patient" | covered |
| O4 Miller 2024 Anthropic paper | Origin | "Evan Miller wrote a paper for Anthropic called Adding Error Bars to Evals" | covered |
| I1 population | Score is a sample | "That big imaginary pool has a name, the population" | covered |
| I2 true accuracy, estimate | Score is a sample | "is its true accuracy. Which you never get to see." / "An estimate." | covered |
| F1 pool, sample, bell, 2 / 4 pts | Score is a sample | "Those scores pile up into a bell shape" | covered |
| I3 coin, standard error vs std dev | Score is a sample | "It's how much the estimate itself would vary" | covered |
| I4 p(1-p), largest at 50%, root n | Score is a sample | "That's biggest at fifty percent... only with the square root of n" | covered |
| PR1 Predict 70% on 500: plus or minus 4, SE 2, underestimate 3-4x, "plus or minus two" slip | Score is a sample | "About four." ... "Super common slip." | covered |
| I5 CI recipe meaning + practical reading | Score is a sample | "strictly, the ninety-five percent is about the recipe" | covered |
| I6 1.96, central limit theorem | Score is a sample | "That's the central limit theorem" | covered |
| I7 square-root table rows | Score is a sample | "a hundred questions gives you plus or minus about nine points... fourteen thousand and forty-two" | covered |
| I8 0.8 a fifth, MMLU noise floor, leaderboards 0.3 | Score is a sample | "your point eight is a fifth of the error bar" | covered |
| I9 overlap trap other direction | Two models | "this is where most people go wrong in the other direction" | covered |
| I10 different sets: 2.9, plus or minus 5.7 | Two models | "around two point nine points... plus or minus five point seven" | covered |
| I11 same questions, only disagreements inform | Two models | "The only questions that say anything about the gap are the ones where they disagree" | covered |
| F2 2x2: 362/117/4/17, 479 cancel, +2.6 | Two models | "Both right, three hundred sixty-two..." | covered |
| I12 per-question d, mean, SE, CI; paired comparison term | Two models | "Plus one if only B got it right, minus one if only A did" | covered |
| I13 variance of difference, covariance, correlation | Two models | "minus twice how much A and B move together. That last thing is the covariance" | covered |
| I14 fake data numbers, corr 0.89 | Two models | "Model A scores seventy-three point two, interval sixty-nine point three..." | covered |
| I15 rule: overlap does not mean no difference | Two models | "Overlapping error bars do not mean no difference." | covered |
| F3 simulator description | Two models | "picture a little simulator. Three sliders" | covered |
| F3a corr 0.7, gap 3, 1000 q: 3 in 4 vs 1 in 100 | Two models | "roughly three runs out of four... about once in a hundred" | covered |
| F3b gap 0: 5%, a third ahead by 0.8 | Two models | "excludes zero about five percent... roughly a third of the time" | covered |
| F3c corr 0: equal widths | Two models | "drag the correlation down to zero" | covered |
| I16 metrics without clean formulas | Bootstrap | "N D C G averaged over queries, median latency, F one" | covered |
| I17 Efron 1979, idea | Bootstrap | "In nineteen seventy-nine a statistician named Bradley Efron" | covered |
| I18 with replacement, 37% missed, 10,000, percentiles | Bootstrap | "about thirty-seven percent... where a percentile's just the value" | covered |
| F4 8-question example: 75, 62.5, 100, 75 | Bootstrap | "Five out of eight, sixty-two and a half... Eight out of eight" | covered |
| I19 agrees within a tenth | Bootstrap | "to within a tenth of a point" | covered |
| I20 any metric | Bootstrap | "N D C G, M R R, a judge's win rate, mean tokens per answer" | covered |
| I21 paired bootstrap, never separately | Bootstrap | "If you resample A and B separately, you've silently turned..." | covered |
| I22 collapses visibly; Wilson | Bootstrap | "the standard fix is called the Wilson interval" | covered |
| I23 assumes independence | Bootstrap | "It assumes the things you're resampling are independent draws" | covered |
| I24 CI vs test, null hypothesis | Tests | "That truly equally good world is called the null hypothesis" | covered |
| I25 p-value, not P(null), 0.05 | Tests | "It's not the probability that the null is true" | covered |
| I26 sign-flip permutation test | Tests | "flip its sign on a coin toss" | covered |
| I27 sign test | Tests | "Second, the sign test" | covered |
| I28 McNemar 1947, discordant, 4 vs 17, p 0.007 / 0.009 | Tests | "Quinn McNemar published it in nineteen forty-seven" | covered |
| I29 479 not used; padding with easy questions | Tests | "Add ten thousand easy questions that both models ace" | covered |
| I30 borderline; lead with interval | Tests | "a p of point oh six, that's information too" | covered |
| I31 temp 0 vs 0.7, GPU batching, two noises | Two kinds of noise | "GPU batching can still flip a token now and then" | covered |
| I32 variance split, K | Two kinds of noise | "only that second piece gets divided by K" | covered |
| I33 0.05/0.16, 2.0, 1.3, 2.5x, 1.0 | Two kinds of noise | "the standard error is about one point three... bottoms out at one point" | covered |
| I34 sample several, resample questions with answers | Two kinds of noise | "Resample questions, and carry each question's answers along" | covered |
| I35 pass@k, Chen 2021, n=200, unbiased | Two kinds of noise | "The Codex paper, Chen and colleagues in twenty twenty-one" | covered |
| I36 shortcut biased low: 0.917 vs 0.832; bootstrap over problems | Two kinds of noise | "point nine one seven. The shortcut says point eight three two" | covered |
| I37 clumps examples | Clustered | "Ten questions about each of fifty documents" | covered |
| I38 between 50 and 500, clustered term | Clustered | "something between fifty and five hundred" | covered |
| I39 ICC, design effect, effective n | Clustered | "design effect, which is roughly one, plus the cluster size minus one, times rho" | covered |
| I40 simulation: 2.8, 3.4 vs 2.0, 76% vs 94%, ~180 | Clustered | "only seventy-six percent of the time. The clustered one, ninety-four" | covered |
| I41 clustered SE recipe, cluster bootstrap | Clustered | "Add those up inside each cluster first" | covered |
| I42 ranker: query unit, customer cluster, train/eval split | Clustered | "Then the customer is the cluster" | covered |
| I43 20 prompts, +2, ship? | Winner's curse | "B: Ship it." | covered |
| I44 winner's curse, 2.5 avg, 97% | Winner's curse | "two and a half points on average... ninety-seven percent of runs" | covered |
| F5 dot columns, +2.0 -> +0.8 | Winner's curse | "The winner falls back to about plus point eight" | covered |
| I45 64%, multiple comparisons | Winner's curse | "about sixty-four percent. That's the multiple comparisons problem" | covered |
| I46 Bonferroni 0.0025 | Winner's curse | "p below point oh oh two five" | covered |
| I47 held-out, hidden test split | Winner's curse | "every serious benchmark has a hidden test split" | covered |
| I48 power 80%, MDE | How many questions | "That probability is the power... minimum detectable effect" | covered |
| I49 formula in words, 7.85, disagreement minus gap squared, unpaired 0.42 | How many questions | "It's really seven point eight five" | covered |
| PR2 1,950 paired, 8,100 unpaired, 4x, 25% at 500, ~4 pts MDE | How many questions | "About nineteen hundred fifty... about four points" | covered |
| F6 calculator description | How many questions | "Picture a little calculator with three sliders" | covered |
| I50 one over gap squared, 7,800 / 33,000, +0.5 on 1,000 | How many questions | "about seventy-eight hundred questions paired" | covered |
| I51 seeds, Dodge 2020 | Seeds | "Dodge and colleagues, in twenty twenty, fine-tuned BERT" | covered |
| I52 recipe vs checkpoint, 3-5 seeds | Seeds | "three is a bare minimum, five is better" | covered |
| I53 result statement | Careful result | "On our five-hundred-question eval, B scored seventy-five point eight" | covered |
| I54 every part load-bearing | Careful result | "But every piece is load-bearing" | covered |
| B0 folder, NumPy, CSV shape | Build It | "One folder, and NumPy's the only dependency" | covered |
| B1 fake data, loader joins on ID; 73.2 / 75.8 | Build It | "join the two models on question ID, sort by it" | covered |
| B2 t1, index grid, 5 million, ddof, n=20 stress | Build It | "That's five million numbers" / "Over a hundred percent" | covered |
| B3 t2 predict narrower | Build It | "how many times narrower should the paired interval be?" | covered |
| B4 t3 Python ints overflow, tolerance, why close | Build It | "quietly overflows once that power passes sixty-three" | covered |
| B5 t4 A/A test | Build It | "An A A test." | covered |
| B6 t5 power calc + simulation check (78% at 2,000) | Build It | "I got seventy-eight percent detection" | covered |
| B7 t6 clustered + pass@k checks + product form | Build It | "Ten samples, three passing, k of one: exactly point three" | covered |
| B8 t7 real pair options, agent review | Build It | "Then have an agent review it for overclaiming" | covered |
| B9 done-when | Build It | "And you're done when your scripts reproduce the fake-data numbers" | covered |
| M1 2.05 / A CIs formula and bootstrap | Build It | "sixty-nine point three to seventy-seven point one, and the bootstrap gives sixty-nine point two to seventy-seven" | covered (2.05 said as "about two") |
| M2 unpaired / paired / corr 0.89 | Build It | "The correlation on the fake data is point eight nine" | covered |
| M3 McNemar 0.0072, sign flip ~0.007 | Build It | "McNemar gives point oh oh seven two" | covered |
| M4 A/A 31 / 36 / 41 | Build It | "thirty-one percent... thirty-six. Unpaired, forty-one" | covered |
| M5 power 25%, 1,950 / 78% at 2,000 | Build It | "Twenty-five percent." | covered |
| M6 clustered 2.0 vs 3.4; +2.5 inflation | Clustered / Winner's curse | (stated in those sections) | covered |
| M7 n=20 formula over 100, bootstrap cramped, Wilson | Build It | "the bootstrap interval's cramped up against a hundred" | covered |
| M8 11%, root 0.33, pairing didn't create evidence | Build It | "only about eleven percent... It didn't create evidence" | covered |
| M9 a third, two-thirds either direction, no evidence | Build It | "Either direction, it's about two thirds" | covered |
| M10 too small, know before running | Build It | "better to know that before running" | covered |
| M11 quantization expectations | Build It | "I'd expect Q eight and F P eight to be indistinguishable" | covered |
| K1 misaligned rows: -3.1/+8.3, 4 -> 42%, 0.41 | Break It | "minus three point one to plus eight point three" | covered |
| K2 peeking 16% vs 4%, sequential | Break It | "sixteen percent of the time. Testing once at the end, four percent" | covered |
| K3 wrong unit (answers, clusters) | Break It | "resample whatever was independently drawn" | covered |
| K4 tune on test, +2.5 vs ~0, Bonferroni | Break It | "The selected gain averages around plus two and a half" | covered |
| E1 72% on 500 -> 68 to 76 | Score is a sample | "the interval's roughly sixty-eight to seventy-six" | covered |
| E2 overlap wrong when same questions; independent-case note | Two models | "even when the samples really are independent" | covered |
| E3 bootstrap how/when wrong | Bootstrap; Break It | (I18-I23, K3) | covered |
| E4 1-pt: 7,800 / 33,000; scaling; reduce noise options incl continuous score; seeds | How many questions; Seeds | "use a continuous score, like the probability the model puts on the correct answer" | covered |
| E5 20 prompts p=0.03: report nothing yet | Winner's curse | "B: And if I'd run a test... point oh three?" / "Nothing yet." | covered |
| G1 Miller + Gosset | Connections | "read Miller's Adding Error Bars to Evals, and Gosset's nineteen oh eight paper" | covered |
| C1 ranking metrics, quantization, LLM judges, separate evals | Connections | "its position bias is a paired comparison" | covered |

No items MISSING. Hard rule check: no "lesson", "the page", "the site", "figure" in spoken text.
