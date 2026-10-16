<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you retrain the cross-encoder. New hard-negative sampler. And the eval script prints one number per model: out of five hundred held-out queries, what share put the right document at rank one. The old one, v six, seventy-one point two percent. The new one, v seven, seventy-two point oh. Plus point eight. What do you do with that?

B: I mean... I post it in Slack.

A: And somebody replies, "nice, is that significant?"

B: [a bit unsure] And I'd say... yes? It went up. Point eight on five hundred queries, that's, what, four more queries right. Feels like something.

A: That's the answer most people would give. But you don't actually know what the question means yet, so try something. Take the old model, v six. Same weights, same five hundred queries. But let it sample its query rewrites at temperature point seven instead of zero. Run it. Seventy point six. Run it again. Seventy-one point eight.

B: Same model?

A: [flatly] Same model. It moved one point two between two runs. Your improvement is smaller than the wobble of the old model compared against... itself.

B: [sighs] Okay, that's a little embarrassing.

A: [reassuring] It's really common. And that's sort of the whole thing in one scene. An eval score isn't a fact about the model. It's a measurement. And you took it with a noisy instrument: a limited set of questions, and maybe some random sampling on top. Every measurement has an error bar. Most of the wins people post in ML channels are sitting inside theirs. And most of the real wins are smaller than people think, so to see them you need either a lot more questions or a smarter comparison.

B: More questions sounds expensive.

A: It is. The good news is the smarter comparison is cheap. You already have the data for it. It just isn't the two numbers you printed.

<!-- section: Origin -->

A: And the smarter comparison is old. Like, more than a century old. There was a man named William Sealy Gosset who worked for the Guinness brewery in Dublin. Decisions about barley and hops had to be made from a handful of small, expensive experiments. And the statistics of the day assumed you had lots of data. He didn't. So he worked out what happens when you've only got a few.

B: At a brewery.

A: At a brewery. And Guinness didn't let staff publish under their own names, so his paper, in nineteen oh eight, called "The Probable Error of a Mean", came out under a pen name. "Student." That's where Student's t-test comes from.

B: [amused] So one of the most famous tests in statistics is named after a pen name because of a beer company's rules.

A: Pretty much. But the part worth knowing is his worked example. Two sleeping drugs. Each one given to the same ten patients, and for each patient you write down how many extra hours they slept. Now, the obvious move is to average drug one, average drug two, and compare the averages as if they came from two separate groups of people. He didn't do that. He took the difference for each patient. Patient one slept this much more on one drug than the other, patient two this much, and so on. Ten differences. And then he asked: are those ten differences reliably above zero?

B: [working it out] Because it's the same person both times. A heavy sleeper's a heavy sleeper on either drug.

A: Right, so whatever's shared between the two measurements cancels when you subtract. Same patients, two treatments, look at the per-patient difference. That's called a paired comparison. And it's exactly what you're going to do with two models on the same questions. In twenty twenty-four, Evan Miller wrote a paper for Anthropic called "Adding Error Bars to Evals", and honestly, a big part of it is reminding the ML world of stuff Gosset and the people after him worked out a hundred years ago.

<!-- section: The Idea: A score is a sample -->

A: So start with one model. Think about what an eval set actually is. Somebody wrote five hundred questions. They could've written five hundred different ones, of the same kind, and the model would've scored a bit differently on those. What you actually care about isn't these five hundred. It's how the model does on that kind of question. All the queries your customers will ever send. Or all grade-school math problems. That big imaginary pool has a name, the population. It's just the whole set of things you want a conclusion about. And the model's accuracy on all of it, every question that could've been in there, is its true accuracy. Which you never get to see.

B: So seventy-one point two is...

A: An estimate. A number you computed from a sample to stand in for the true value. Draw a different five hundred and it'd come out a bit different. Picture it like this. On the left, a big box full of dots, every question you could've asked, and a few of them are colored in. Those happened to land in your eval. An arrow over to a little box: your five hundred, score seventy percent. And on the right, imagine you could go back and draw a fresh five hundred, again and again, thousands of times, and score each one. Those scores pile up into a bell shape around the true accuracy. And how wide that bell is... that's the error bar.

B: Okay, so how wide is it?

A: So picture each question as a coin. It comes up "right" with some probability, call it p, and p is the true accuracy. Your score is the average of five hundred of those coins. How far off is that average likely to be from p? That typical miss has a name: the standard error.

B: [skeptical] Is that the same as standard deviation? I always mix those up.

A: Close cousin. The thing is, the standard deviation of what? It's not how much individual questions vary. It's how much the estimate itself would vary if you redid the whole experiment with fresh data. So it's the spread of that bell. And for an accuracy there's a formula with two parts worth understanding. The first part is how noisy one coin is. You take p times one minus p. That's biggest at fifty percent, where every question's a pure toss-up, and it's tiny near zero or a hundred. A model that gets everything right has nothing left to wobble. The second part is the averaging. You divide that by the number of questions, and take the square root of the whole thing. So more coins, less wobble... but only with the square root of n. Okay, quick bet. A model scores seventy percent on five hundred questions. Give me a range around seventy that you'd bet on at nineteen to one odds, that it contains the true accuracy. How many points either side?

B: [a bit unsure] Five hundred's a decent number of questions. Plus or minus... one? Maybe one and a half?

A: [calmly] About four.

B: [surprised] Four? Each side?

A: Each side. Sixty-six to seventy-four, roughly. Walk through it. Seventy percent times thirty percent is point two one. Divide by five hundred, you get about four ten-thousandths. The square root of that is about point oh two. So the standard error's about two points. And for a range you'd bet nineteen to one on, which is ninety-five percent, you go out about two standard errors. One point nine six, to be exact. So four points each way.

B: Huh. I was off by like a factor of three.

A: [laughs] You're in good company. Most people guess around one and they're off by three or four times. There's a sneakier one too. Somebody says "plus or minus two" for a five-hundred-question benchmark. That's one standard error, and they've called it a ninety-five percent interval. Super common slip. And that step, going out one point nine six standard errors, is how you build what's called a confidence interval.

B: [working it out] So there's a ninety-five percent chance the true accuracy is between sixty-six and seventy-four.

A: That's how almost everyone reads it, and in practice "the range of true accuracies that fit what I saw" is fine. But strictly, the ninety-five percent is about the recipe, not this one interval. If you ran the whole experiment over and over, fresh questions each time, and built an interval this way every time, ninety-five percent of those intervals would contain the true accuracy.

B: And where does one point nine six come from? It's such a weird number.

A: From the bell. Averages of lots of coins come out bell-shaped. That's the central limit theorem: the average of many independent random things has a bell shape, whatever the individual things look like, as long as there are enough of them. Each coin's just a zero or a one, nothing bell-like about it, but average five hundred of them and you get a bell. And ninety-five percent of a bell sits within one point nine six standard deviations of the middle. That's all it is. Now here's the brutal part. Because of that square root, to halve the error bar you need four times the questions. So at seventy percent: a hundred questions gives you plus or minus about nine points. Two hundred, about six and a half. Five hundred, four. A thousand, just under three. Five thousand, about one point three. And M M L U's whole test set, fourteen thousand and forty-two questions, is still plus or minus about three quarters of a point.

B: So my v seven. Seventy-two on five hundred.

A: Standard error's still about two points, so the interval's roughly sixty-eight to seventy-six. And your point eight is a fifth of the error bar. On its own it says almost nothing. And look at that M M L U number again. Even with fourteen thousand questions, about point eight either side is the noise floor. Then you open a leaderboard and the models are ranked point three apart.

B: Point three. Okay.

<!-- section: The Idea: Two models, one set of questions -->

A: So you'd think the move now is to compute both error bars and see if they overlap.

B: That's what I'd do. Seventy-one point two plus or minus four, seventy-two plus or minus four, they overlap massively, so... there's nothing there. Done.

A: [jumping in] And this is where most people go wrong in the other direction. Sometimes that conclusion's right. But often it throws away a real result. If the two models had been tested on different random sets of five hundred questions, then yeah, the gap between them carries both sets of noise. You combine the two standard errors, and the gap's standard error comes out around two point nine points. So about plus or minus five point seven for a ninety-five percent interval on the gap. Hopeless if you're looking for a one-point effect.

B: But that's not what I did.

A: No. You tested them on the same five hundred. And on most of those, the two models do the same thing. An easy question is easy for both. An ambiguous label trips up both. So, a question both models got right. What does it tell you about which one's better?

B: [slowly] ...Nothing, I guess.

A: Nothing. Same for one they both got wrong. The only questions that say anything about the gap are the ones where they disagree. Picture a grid, two by two. Rows are A right, A wrong. Columns are B right, B wrong. Fill it in for a five-hundred-question eval. Both right, three hundred sixty-two. Both wrong, a hundred seventeen. That's four hundred seventy-nine questions on the diagonal where the models did exactly the same thing, and they cancel out of the difference completely. Then the two off-diagonal boxes. A right and B wrong: four. B right and A wrong: seventeen.

B: So the whole comparison is twenty-one questions.

A: The whole comparison rests on twenty-one questions. B wins seventeen, A wins four. Seventeen minus four is thirteen, out of five hundred, so B's ahead by two point six points.

B: [working it out] Huh. Said like that, it sounds less like noise. Seventeen to four.

A: Right, and the math backs up that instinct. So do what Gosset did. For each question, write down one number. Plus one if only B got it right, minus one if only A did, zero otherwise. The gap between the models is just the average of those numbers. And its standard error is computed the way you'd do it for any average: the spread of those per-question numbers, divided by the square root of n. Then the interval's the gap, plus or minus one point nine six of those. That's the paired comparison. You measure two things on the same units, and you look at the per-unit differences, so whatever's shared cancels out.

B: But why does it come out so much tighter? Like, mechanically.

A: Because of how the noise in a difference works. The variance of B minus A is the variance of A, plus the variance of B, minus twice how much A and B move together. That last thing is the covariance. Just how much two quantities go up and down together. Scale it by both their spreads and you get the correlation, the number from minus one to one. And for two models that tend to get the same questions right, the covariance is big and positive. The unpaired analysis, comparing two separate error bars, pretends it's zero. The paired analysis subtracts it.

B: So unpaired is throwing away the fact that they agree.

A: Yeah, that's it. Let me give you real-looking numbers. You'll generate this fake data yourself later: two models where B really is two and a half points better, and they agree a lot. Their per-question correlation's about point eight nine, which is typical for two checkpoints of one model, or two quantizations of it. Model A scores seventy-three point two, interval sixty-nine point three to seventy-seven point one. Model B, seventy-five point eight, interval seventy-two to seventy-nine point six. Those overlap by more than five points. The unpaired gap is plus two point six, but its interval runs from minus two point eight to plus eight. Can't tell. Paired: the same plus two point six, interval plus point eight to plus four point four.

B: [quietly] Same data.

A: Same data. The paired interval's a third as wide, and it sits entirely above zero. One analysis says "can't tell." The other says "B is better, by somewhere between about one and four points." So here's the rule to burn in. Overlapping error bars do not mean no difference. If the two models were scored on the same questions, separate error bars are just the wrong tool. Compute the interval of the difference, paired. And even when the samples really are independent, "the bars overlap" is a stricter bar than a proper test on the difference. Overlapping ninety-five percent intervals don't by themselves mean the gap isn't significant.

B: [skeptical] I believe you, but I'd want to see it happen.

A: So picture a little simulator. Three sliders: number of questions, the true gap, and the correlation between the two models. Up top, each model's own ninety-five percent interval. Underneath, two intervals for the gap, unpaired and paired, with a dashed line where the true gap is. And a button that runs a thousand fake experiments. Start with correlation point seven, gap three points, a thousand questions. The two bars overlap, and the paired interval clears zero. Hit run. The paired test finds the gap in roughly three runs out of four. "The bars don't overlap" finds it about once in a hundred.

B: [surprised] Once in a hundred.

A: Comparing bars throws away almost all your power. Now set the gap to zero, five hundred questions. Two identical models. Run it again. The paired interval excludes zero about five percent of the time, and that's fine, that's the five percent you signed up for when you said ninety-five. But there's a third readout: how often B appears to beat A by point eight points or more. And that's roughly a third of the time.

B: [sighs] That's my Slack message.

A: That's your Slack message. Produced by two identical models. And last, drag the correlation down to zero. The paired interval grows until it's the same width as the unpaired one. Pairing helps exactly as much as the models agree. Which is why it's so powerful for close variants of one model... and that's the comparison you make most often.

<!-- section: The Idea: The bootstrap -->

B: Okay, but all of that was accuracy. Right or wrong. My ranker's real metric is N D C G at ten, averaged over queries. That's not a coin.

A: Right, and that's the problem with formulas. The coin formula works for accuracy. N D C G averaged over queries, median latency, F one, the ratio of two things... each has its own formula, some are ugly, and some don't really have a clean one. In nineteen seventy-nine a statistician named Bradley Efron published a way around all of it. It's called the bootstrap. And the idea fits in a sentence. You can't draw fresh question sets from the population, so draw them from your sample instead, since your sample's your best picture of the population.

B: Draw from it how? It's the same five hundred questions.

A: With replacement. From your five hundred, you pick five hundred at random, but every pick goes back in the hat. So some questions get picked twice, or three times, and about a third don't get picked at all. The chance a particular one gets missed works out to about thirty-seven percent. Then you score the model on that lopsided fake eval set. And you do that ten thousand times.

B: So each one's a slightly different eval.

A: Each one's a plausible alternative eval set. The repeats and the gaps are the point. Small example. Eight questions, the model gets six, so seventy-five percent. Resample eight with replacement. Maybe you get question two twice and question six twice, and you miss four and seven. Five out of eight, sixty-two and a half. Do it again, and maybe by luck you only draw ones it got right. Eight out of eight, a hundred percent. Again, six out of eight. After ten thousand of those you've got ten thousand scores, and they vary the way scores on fresh question sets would vary. Then take the middle ninety-five percent of them. So from the two and a half percentile to the ninety-seven and a half percentile, where a percentile's just the value with that percent of results below it. That's your interval.

B: And it actually matches the formula?

A: For plain accuracy on five hundred questions, yeah, to within a tenth of a point. You'll check that. But the bootstrap earns its keep elsewhere. Any metric. N D C G, M R R, a judge's win rate, mean tokens per answer. The code doesn't change. Resample, recompute, take percentiles.

B: And for the gap between two models I'd bootstrap A, bootstrap B, and subtract?

A: [jumping in] No, don't. That's the trap. If you resample A and B separately, you've silently turned your paired comparison back into an unpaired one. The pairing's gone. What you do is, in each round, draw one set of question numbers, and score both models on those same questions. That's the paired bootstrap. Same questions for both, every round.

B: So the agreement survives the resampling.

A: Yeah. And one more nice thing: when the bootstrap goes wrong, it tends to go wrong visibly. With a tiny eval, or a score right at a hundred percent, the resamples barely vary and the interval sort of collapses. That's your hint to use something better. For small-sample accuracies the standard fix is called the Wilson interval. But here's what the bootstrap does not fix. It assumes the things you're resampling are independent draws. If they aren't, it's exactly as wrong as the formula. Hold onto that, it comes back.

<!-- section: The Idea: Tests -->

A: So far it's all been intervals. An interval says how big the gap plausibly is. A test answers a narrower, yes-or-no question: if these two models were truly equally good, how surprising would a gap this big be? That "truly equally good" world is called the null hypothesis. It's the boring explanation you're trying to rule out. Both models have the same true accuracy, and the gap you saw is luck. And the p-value is how often luck alone would produce a gap at least as big as yours.

B: So if I get a p-value of point oh oh seven, there's a point seven percent chance the models are actually equal.

A: [gently] That's the one everyone says, and it's backwards. It's: if they were equal, you'd see a gap this big point seven percent of the time. It's a statement about the data, assuming the null. It's not the probability that the null is true. Small just means "this would be a weird coincidence." The usual line is point oh five, and that lines up with a ninety-five percent interval that excludes zero. Now, three tests, from most general to most specific, all paired. First, the permutation test, the sign-flip version. The logic is lovely. If A and B were interchangeable, then on each question it shouldn't matter which one you called A. So swap them at random. Take each per-question difference, that plus one, minus one, or zero, and flip its sign on a coin toss. Recompute the average gap. Do that ten thousand times. Now you've got a picture of what gaps look like when nothing's going on. The share of those shuffled gaps that are at least as big as your real one, in either direction, is your p-value. And like the bootstrap, it works for any per-question score. Per-query N D C G included.

B: Because you're only flipping signs. You never care what the numbers are.

A: Right. Second, the sign test. Throw the sizes away completely and just keep who won each question. If the models are equal, every question that isn't a tie is a fair coin, B wins it half the time. So the number of B wins out of the disagreements should look like a run of coin flips, and you ask how surprising your count is. Simple, robust, fine when the scores are on weird scales. And third, when the outcome is right or wrong, that sign test has a name. McNemar's test. Quinn McNemar published it in nineteen forty-seven for exactly this situation, what he called correlated proportions. The same people answering two questions, or the same questions answered by two models. It only looks at the discordant pairs, the questions where the two disagree, and under the null, each of those is a fair coin.

B: So for us that's twenty-one coin flips.

A: Twenty-one flips, and B won seventeen. A won four. So you ask, if you flip a fair coin twenty-one times, how often do you get four or fewer heads, or four or fewer tails? About point seven percent of the time. A p of about point oh oh seven. There's an older approximate version that gives about point oh oh nine. Same story.

B: [skeptical] Wait. The four hundred seventy-nine other questions aren't in it at all?

A: Not at all. They don't add evidence either way. And that cuts both ways. Add ten thousand easy questions that both models ace. McNemar doesn't budge. But every unpaired error bar gets narrower, and the gap starts looking way more stable than it is.

B: So padding the eval with easy stuff makes you look more sure without adding any evidence.

A: Yeah. And tests and intervals are really two views of one thing. When they disagree near the edge, say an interval that barely excludes zero, or a p of point oh six, that's information too. It means the evidence is borderline, and the honest report says so. In a write-up, lead with the interval for the gap. It says how big, not just whether.

<!-- section: The Idea: Two kinds of noise -->

A: Now go back to the start. Temperature point seven.

B: The same model wobbling by one point two.

A: Right. So far I've treated each question as having a fixed answer. The model gets it right or it doesn't. At temperature zero that's true. Well, nearly, GPU batching can still flip a token now and then. But at point seven, the same model on the same question might be right six times out of ten. So now there are two kinds of noise stacked on top of each other. Question noise: which questions happened to be in the set, some easy, some hard. And sampling noise: for a fixed question, which answer the model happened to sample this time.

B: And they just add?

A: Pretty much. Miller's paper splits the variance of the score into exactly those two pieces. One is how much difficulty varies from question to question. The other is the coin noise on each question, that p times one minus p again, averaged over all the questions. And if you sample several answers per question, call it K, and average them, only that second piece gets divided by K. Asking a question again shrinks the sampling noise. It does nothing about which questions you happened to pick.

B: Can you put numbers on it?

A: [relaxed, thinking out loud] Sure. Five hundred questions, average accuracy seventy percent, and difficulty spread out so the question-to-question variance is point oh five. Then the average coin noise comes out to point one six. With one sample each, those add to point two one, same as before, and the standard error's about two points. With five samples per question, the coin part drops to about point oh three, total's about point oh eight, and the standard error is about one point three. That's like having about two and a half times as many questions... for five times the inference cost. And with infinitely many samples it bottoms out at one point. That last point is pure question noise, and the only fix for it is more questions.

B: So if questions are expensive and inference is cheap...

A: Sample several answers per question. That's often true for a ranker, or a small model on the Spark. But careful when you bootstrap. Resample questions, and carry each question's answers along with it. If you resample individual answers, you're treating five answers to one question as five independent questions, and the interval comes out way too narrow.

B: [working it out] Code benchmarks do something like this, right? Pass at k?

A: It's a different question, actually. Pass at k asks: if the model gets k tries, does at least one pass the tests? And the obvious way to estimate it, generate exactly k samples and check, is really noisy. The Codex paper, Chen and colleagues in twenty twenty-one, introduced the standard fix. Generate more samples than k, call that n. They used two hundred. Count how many pass, call that c. Then ask: if I picked k of my n samples at random, what's the chance none of them passes? You can count that exactly, it's a "how many ways to choose" count. Pass at k is one minus that chance. And it's what's called an unbiased estimator. It's right on average: repeat the experiment many times and the average of the estimates equals the true value.

B: Why not just take the pass rate, c over n, and say the chance of failing k times in a row is one minus that rate, multiplied by itself k times?

A: That's the tempting shortcut, and it's biased. You're plugging an estimated rate into a curved formula, and on average it comes out low. Ten samples, three pass. The unbiased pass at five is point nine one seven. The shortcut says point eight three two. So, average the unbiased pass at k across problems, then bootstrap over problems, not over samples.

<!-- section: The Idea: Clustered questions -->

A: Okay. Here's a trap that the formula and a naive bootstrap both fall into. A lot of evals are built in clumps. Ten questions about each of fifty documents. Eight queries from each of sixty customer sessions. A few reading-comprehension questions per passage. And questions in the same clump rise and fall together. If the model doesn't understand a document, it misses most of that document's questions.

B: So ten questions on one document aren't really ten pieces of evidence.

A: Right. You don't really have five hundred independent questions. You've got something between fifty and five hundred. The data's clustered: it comes in groups whose members are more alike than random ones would be, and the groups, not the individual questions, are the independent units. So the naive standard error's too small. How much too small depends on two things. The cluster size. And how alike questions within a cluster are, which is the intraclass correlation. Zero means no more alike than random, one means identical. People write it as the Greek letter rho, or I C C. And the variance gets multiplied by what's called the design effect, which is roughly one, plus the cluster size minus one, times rho. Then your effective number of questions is the real number divided by that.

B: Give me a number.

A: I simulated it. Fifty documents, ten questions each, overall accuracy seventy percent, with documents varying in difficulty enough to make rho about point two. Design effect: one plus nine times point two, so two point eight. Then five thousand simulated evals. The actual spread of the score across them was three point four points. The naive formula said two. The clustered standard error said three point four.

B: So naive is low by almost half.

A: And here's what that does to you. The naive "ninety-five percent" interval contained the true accuracy only seventy-six percent of the time. The clustered one, ninety-four. Your five hundred questions were worth about a hundred eighty.

B: [sighs] That's a lot of questions to lose.

A: The fix, and Miller's paper recommends it whenever questions come in groups, is the clustered standard error. Take each question's score minus the overall average. Add those up inside each cluster first. Square each cluster's total, add the squares across clusters, take the square root, divide by n. If every cluster has one question, that's just the ordinary formula. And the bootstrap version is even simpler. Resample clusters, not questions. Draw fifty documents with replacement and take all their questions along.

B: How does that hit my ranker? N D C G's per query.

A: So the query's already the unit, not the document. Good. But say your five hundred eval queries came from sixty customers, and customers really differ. One customer's catalog is weird. Then the customer is the cluster. And separately, never let queries from one customer show up in both train and eval, if what you want to know is how the model does on a new customer. That's really about building ranking eval sets, but it's the same idea. Know what your independent unit is.

<!-- section: The Idea: Many tries and the winner's curse -->

A: Different scene. You write twenty prompt variants for the ranker's query rewriter, and evaluate each on the same five hundred questions. The best one's two points above the baseline.

B: [confidently] Ship it.

A: [amused] Suppose, and this is often the case, none of the twenty is actually better. Each one's score still wobbles. So you've got twenty wobbly numbers and you picked the highest. You picked the one whose luck ran hottest. That's called the winner's curse. Select the best of many noisy measurements, and the winner's measured score overstates its true score, because selection favors lucky noise. I simulated exactly this. Twenty prompts, zero true effect, each disagreeing with the baseline on about ten percent of questions, five hundred questions. The best one beat the baseline by two and a half points on average. And by at least a point in ninety-seven percent of runs.

B: So my two points is about what you'd expect from nothing.

A: Basically. Picture two columns of dots. Left column, the twenty prompts' gains on the dev set, where you did the choosing. The winner's up at plus two. Right column, the same twenty on a fresh held-out set. The winner falls back to about plus point eight, a different prompt now looks best, and the whole cloud is just noise centered on zero.

B: And if I'd run a test on the winner and got a p of point oh three?

A: The p-values get fooled the same way. Each test at the five percent level has a one in twenty chance of a false alarm. Run twenty of them, and the chance at least one goes off is about sixty-four percent. That's the multiple comparisons problem. And you don't need twenty deliberate experiments to hit it. Trying a few prompts, a few checkpoints, a few decoding settings, two metrics, then reporting the best combination... same thing.

B: So what do I report?

A: [firmly] Nothing yet. There are two fixes, and you can use both. One, make each test stricter. That's the Bonferroni correction: divide the threshold by the number of tries. Twenty tries means each one needs p below point oh oh two five. Crude, a bit too strict, impossible to get wrong. Two, split the data. Choose on a dev set as much as you like, then confirm the single winner, once, on a held-out set. That's data you set aside and didn't look at for any choice. Not tuning, not picking prompts, not picking checkpoints. The held-out paired gap, with its interval, is the number you report. That's why every serious benchmark has a hidden test split, and why "I tuned on the test set" quietly kills a result.

<!-- section: The Idea: How many questions do you need -->

A: Now flip the whole thing around. Before you run an experiment, ask: if the improvement's real, and it's the size I care about, how likely am I to actually detect it? That probability is the power of the experiment. Eighty percent's the usual target, so a real effect of the planned size gets detected four times out of five. And the effect size you plan for is called the minimum detectable effect. The smallest real improvement you've designed the experiment to catch. Smaller ones might be real, but you'll usually miss them. For a paired comparison, at ninety-five percent confidence and eighty percent power, the number of questions you need is roughly eight, times the variance of the per-question difference, divided by the gap squared. That eight comes from adding one point nine six, the threshold, and point eight four, which is how far past it you need to be to clear it eighty percent of the time, and squaring the sum. It's really seven point eight five. And the variance of the difference is just the disagreement rate minus the gap squared. So the only thing about the two models that matters is how often they disagree. Unpaired, you'd swap that for both models' coin noise added together, about point four two near seventy percent.

B: [skeptical] That's a lot of pieces.

A: So do one. Two checkpoints of the same model, around seventy percent, disagreeing on ten percent of questions. You want an eighty percent chance of detecting a true two-point improvement. How many questions?

B: Well... five hundred gave me plus or minus four for one model, and pairing was about three times tighter... so, five hundred? Maybe a thousand to be safe?

A: About nineteen hundred fifty. Paired. Unpaired, about eight thousand one hundred per model. So pairing cuts it by about four times.

B: [deflated] Nineteen fifty. And I've got five hundred.

A: Right, and here's the uncomfortable flip side. With your five hundred, a real two-point gain gets detected only about a quarter of the time. I simulated it: twenty-five percent. You'd miss it three times out of four and conclude "no effect." At five hundred questions with ten percent disagreement, the smallest gap you can reliably see is about four points.

B: [working it out] So "no significant difference" on my eval doesn't mean there's no difference. It means my eval was too small to see it.

A: Yeah. Picture a little calculator with three sliders: baseline accuracy, the gap you want to detect, and the disagreement rate. Two bars, paired and unpaired, on a log scale, with dashed lines at five hundred questions and at M M L U's fourteen thousand. Lower the gap, and both bars shoot up, as one over the gap squared. Raise the disagreement, and only the paired bar grows. And that one over gap squared is the headline. Halving the effect you want to see quadruples the questions. A one-point improvement between close checkpoints, ten percent disagreement, needs about seventy-eight hundred questions paired. Around thirty-three thousand per model unpaired. That's why careful labs care so much about eval set size and pairing. And it's why "we got plus point five on a thousand-question benchmark" isn't a result.

B: And if I just can't get seventy-eight hundred questions?

A: Then you shrink the noise instead. Doubling the disagreement rate doubles the questions you need, so anything that makes the two systems more comparable, so they disagree less, helps. You can sample several answers per question at temperature, remembering that only shrinks the sampling part. Or use a continuous score, like the probability the model puts on the correct answer, instead of just right or wrong.

<!-- section: The Idea: Seeds -->

A: There's one more source of noise, and it sits above all of this. Train the same cross-encoder twice with different random seeds. The seed's the starting number for the random number generator. It fixes the initial weights, the order the data comes in, the dropout masks. Change it and you get a different, equally valid training run. And those two runs are two different models, which can differ on your eval by more than the eval's own error bar. Dodge and colleagues, in twenty twenty, fine-tuned BERT on small GLUE tasks with lots of seeds, and found that the seed alone, just initialization and data order, could move results as much as many published improvements.

B: [skeptical] So my v six versus v seven... that's one run each.

A: Right, and that changes what a fair comparison is. The eval interval tells you about this checkpoint on this question set. It says nothing about how much the recipe varies from run to run, because you only ran it once. If you want to claim "the new hard-negative sampler is better", then the unit is the training run. Train each recipe with several seeds, three is a bare minimum, five is better, evaluate every run on the same questions, and compare the recipes using the spread across seeds. If you're only claiming "this checkpoint beats that checkpoint", the single-run paired analysis is fine. Just say that's what it is.

<!-- section: The Idea: What a careful result looks like -->

B: So what do I actually write back in Slack?

A: Something like this, for the fake data. "On our five-hundred-question eval, B scored seventy-five point eight, ninety-five percent interval seventy-two to seventy-nine point six, and A scored seventy-three point two, sixty-nine point three to seventy-seven point one. Both answered the same questions, so we compared them on per-question differences. B beats A by two point six points, paired bootstrap interval plus point eight to plus four point four, from ten thousand resamples. They disagreed on twenty-one questions, B right on seventeen, A on four. Exact McNemar p, point oh oh seven. Each model was run once at temperature zero, and we didn't vary training seeds, so these intervals only reflect which questions got sampled."

B: [amused] That's a lot longer than "plus point eight."

A: It is. But every piece is load-bearing. Each score has its own interval. The comparison is paired, and it says so. The disagreement count tells a reader how much evidence there really is, twenty-one questions, not five hundred. And the last sentence names the noise you didn't measure. That's the one people skip.

<!-- section: Build It -->

A: So then you build all of it yourself. One folder, and NumPy's the only dependency. Every script reads a CSV with one row per question and a column per model, either a zero or one, or a score, so the same code works on fake data now and real results later. First, the fake data. Every question gets a hidden difficulty. B's chance is a little higher than A's on every question, two and a half points. And both models share most of their luck on each question, which is what makes them agree. Then a small loader that every script shares, and the important thing it does is join the two models on question ID, sort by it, and complain if any ID shows up twice. Sounds like housekeeping. It isn't, and you'll see why when you break it. With the seed fixed, you should get A at seventy-three point two and B at seventy-five point eight.

B: And then the error bars.

A: The formula interval and the bootstrap, one model at a time. The trick for the bootstrap is not to loop. You make one big grid of random question numbers, ten thousand rows of five hundred, and index into the scores with it, so all ten thousand resamples get scored in one line. That's five million numbers, nothing for memory. And for a zero-one column, the ordinary sample spread is almost exactly the square root of p times one minus p, so the generic formula is the accuracy formula. On the fake data, A's formula interval is sixty-nine point three to seventy-seven point one, and the bootstrap gives sixty-nine point two to seventy-seven. Same thing. Then stress it. Twenty questions, nineteen right, so ninety-five percent. Look at the top end of the formula's interval.

B: [a bit unsure] It goes... over a hundred?

A: Over a hundred percent. Which is the formula telling you its bell-curve assumption has broken. And the bootstrap interval's cramped up against a hundred, the other way. Neither one's any good at that size. That's what the Wilson interval is for. Then the paired part. Three functions: the unpaired gap, the paired gap from the per-question differences, and the paired bootstrap, one set of question numbers per round, both models scored on it. Print the correlation and the disagreement rate too. And before you run it, guess. If the correlation's about point nine, how many times narrower should the paired interval be?

B: [working it out] The part you subtract is twice the covariance, and with correlation point nine that's... most of the total. So, a lot narrower. Three times?

A: About three. The correlation on the fake data is point eight nine, and with that, the paired variance is only about eleven percent of the unpaired variance. The square root of point one one is about point three three. A third. So unpaired comes out minus two point eight to plus eight, paired plus point eight to plus four point four, and the paired bootstrap agrees with the paired formula. And notice what pairing did there. It didn't create evidence. It stopped the four hundred seventy-nine agreeing questions from adding noise to the comparison. Next, the two tests. Exact McNemar, and the sign-flip test. McNemar's just counting coin-flip outcomes, but there's one gotcha. Do the counting with plain Python integers, not NumPy ones. Two to the power of the number of disagreements gets huge, and a NumPy sixty-four-bit integer quietly overflows once that power passes sixty-three. No error. Just a wrong p-value. For the sign flip, add a tiny tolerance when you compare against the real gap, because floating point. On the fake data McNemar gives point oh oh seven two, and the sign flip gives about point oh oh seven.

B: [skeptical] Why should those be close? One's built for right-or-wrong data and the other isn't.

A: Because the sign flip never needs to know the data was zero or one. It only ever flips the signs of the differences. And with right-or-wrong data, the differences are just plus one, minus one, or zero. Flipping a zero does nothing. So on this data it's really just flipping coins on the twenty-one disagreements. Which is McNemar.

B: And on N D C G it just keeps working.

A: Right. The next one's the one that should change how you read Slack. An A A test. Two models with identical true accuracy, seventy percent, five hundred questions, and you count how often one of them comes out at least point eight points ahead. Run it with the models disagreeing on five, ten, and twenty percent of questions, and fully unpaired, where A and B are drawn independently. At ten percent disagreement, B comes out ahead by point eight or more thirty-one percent of the time. At twenty percent, thirty-six. Unpaired, forty-one.

B: So about a third of the time.

A: A third of the time, in one direction. Either direction, it's about two thirds. So a point eight gain at five hundred questions isn't weak evidence. It's close to no evidence. Then run the same thing with a real two-point gap, and look at how often your paired interval excludes zero. That's the power of your five-hundred-question eval. Twenty-five percent.

B: The one-in-four thing again.

A: Yeah. Your eval set's usually too small for the effects you care about, and it's better to know that before running than to conclude "no effect" from an experiment that could barely have found one. Then you write the power calculator. Questions needed paired, questions needed unpaired, and the reverse: the smallest gap you can detect at a given size, which is the same formula solved for the gap. Python's standard library has a normal distribution object that'll hand you the one point nine six and the point eight four, so you don't hard-code them. Print a table for gaps from half a point up to five points, at five, ten and twenty percent disagreement. And then check one row by simulation. For two points at ten percent disagreement the formula says about nineteen fifty. Plug two thousand into the A A simulator with a two-point gap, and I got seventy-eight percent detection. Close to eighty. If the formula and the simulation disagree by more than a few points, one of them has a bug.

B: [amused] That's a nice way to test statistics code.

A: It's the only way I trust. Then the clustered standard error, the cluster bootstrap, and pass at k. For the clusters, simulate fifty clusters of ten, where each cluster's accuracy is drawn at random around seventy percent, and compare three things: your clustered standard error, the naive one, and the actual spread of the average over two thousand simulated datasets. The clustered one should track the actual spread, and the naive one shouldn't. For pass at k, three checks. Ten samples, three passing, k of one: exactly point three. k of five: about point nine one seven. And if fewer than k samples fail, it has to return one, because any k you pick must include a passer. The Codex paper has a version written as a product that avoids the huge "how many ways to choose" numbers. Try to work it out before you look.

B: And then real models.

A: Then a real pair. Two options. One's the quantization run, where you evaluated one model in its original sixteen-bit form, B F sixteen, and in several shrunk-down formats, on two hundred G S M eight K math problems at temperature zero, and saved every per-question result. Build a CSV with the B F sixteen column and the four-bit Q four K M column side by side, and run everything on it. The other option's your ranker. Two checkpoints, per-query N D C G at ten on the same eval queries. N D C G isn't zero or one, so McNemar's out. Use the paired bootstrap and the sign flip, which don't care. And if you know which customer or session each query came from, add a cluster bootstrap and compare the widths.

B: What should I expect on the quantization one?

A: With only two hundred problems, even paired, you can only reliably see gaps of several points. Put your disagreement rate into the calculator and you'll see. I'd expect Q eight and F P eight to be indistinguishable from B F sixteen, and the four-bit formats to be "within a few points, can't tell", unless something's actually broken. The disagreement count's still worth looking at, though. It shows you how many individual answers flipped. And "can't tell" is the right conclusion to write, as long as the paragraph says what number of questions you'd need to see a one-point loss.

B: So I write the paragraph.

A: Before running, use the calculator to write down the smallest gap your set can detect. Then run it, and write the paragraph like the one we just did. Each score with its interval. The paired gap with its interval and the method. The number of disagreements, or wins and losses per query. The p-value. And one sentence on the noise you didn't measure. Then have an agent review it for overclaiming, and for anything a skeptical reviewer would ask. And you're done when your scripts reproduce the fake-data numbers to within a tenth of a point, the power calculator agrees with the simulation, the clustered standard error tracks the true spread while the naive one doesn't, and you've got that paragraph about a real pair of models where you could defend every number out loud.

<!-- section: Break It -->

A: Then you break it. Four ways. First, misalign the rows. Delete the sort in the loader, and shuffle one model's results before joining. In real life, that's one results file written in question order and the other in completion order, the way an async eval loop writes them. Rerun the paired script.

B: It crashes?

A: [serious] Nothing crashes. That's the scary part. On my run, the paired interval went from plus point eight to plus four point four... to minus three point one to plus eight point three. The disagreement rate jumped from four percent to forty-two. McNemar went from point oh oh seven to point four one. The paired analysis silently turned into a bad unpaired one, because now you're comparing A's answer on one question with B's answer on some other question. So always join on question ID, and assert the IDs match.

B: [sighs] And it'd just print the numbers like everything's fine.

A: It'd just print them. Second, peek and stop early. Two equal models, an A A setup. Check McNemar after every fifty questions, up to a thousand, and stop the moment p drops below point oh five.

B: [skeptical] But looking doesn't change anything. It's the same data.

A: You're not changing the data, you're changing the rule. Every peek is another chance for luck to cross the line, and you stop on the lucky one. In my simulation that "found" a significant difference sixteen percent of the time. Testing once at the end, four percent. A bit under five, because the exact test is slightly conservative. So if you have to watch results come in, decide the number of questions in advance with the power calculator, or use methods built for testing as you go. That's called sequential testing. Third, resample the wrong unit. Sample five answers per question at temperature point seven, or fake it: a hundred questions, each with its own chance of being right, five draws each. Bootstrap over the five hundred answers as if they were independent. Then bootstrap over the hundred questions, carrying each question's five answers along. The first interval is much too narrow. Same with the clusters: bootstrap the five hundred clustered questions instead of the fifty documents and the interval shrinks right back to the naive, wrong width. The rule is, resample whatever was independently drawn.

B: And the fourth is the prompts.

A: Tune on the test set. Twenty fake prompts with zero true effect, all against one shared baseline. Pick the best on five hundred questions and record its gain. Then score that same prompt on a fresh five hundred. Repeat that a thousand times. The selected gain averages around plus two and a half. The confirmed gain averages around zero. Then add a Bonferroni-corrected paired test to the selection step, and watch how rarely any prompt survives.

<!-- section: Connections and close -->

A: And this keeps coming back. When you build the ranker's eval set, the query's the unit there too. For the quantization formats, put a paired interval and a disagreement count next to each one, and "within noise" turns into a statement with a number in it. When you use an LLM as a judge, the judge is just another noisy instrument. Its agreement with your labels is an estimate with an error bar, and its position bias is a paired comparison, the same pair shown in swapped order. And keeping the eval separate from everything else is the held-out set from the winner's curse, taken seriously as a design rule. If you read two things, read Miller's "Adding Error Bars to Evals", and Gosset's nineteen oh eight paper. It's short enough for one sitting.

B: [working it out] Okay, let me try the whole thing. A score is a sample, so it's got an error bar, about four points either way on five hundred questions, and my point eight was way inside that. To know if v seven is really better, I don't compare the two error bars. I compare the models question by question. Only the questions where they disagree count, and pairing makes the interval about three times tighter, so a gain can be real even when the bars overlap.

A: [gently] That's most of it. Two sharpenings. The three times only happens because those two models agree so much. Pairing doesn't make evidence, it stops the questions they agree on from adding noise. So the honest size of your evidence is the disagreement count, not the five hundred. And "is v seven better" depends on what you mean. This checkpoint versus that checkpoint, the paired interval answers it. The new sampler versus the old one, that's a question about training runs, and one run each can't answer it. And before you post anything, ask how small a gap your eval could even have seen. With five hundred questions and checkpoints that disagree on one in ten, that's about four points. So plus point eight was never going to be a yes. The honest reply in that thread is "can't tell yet, and here's how many questions it would take."
