<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you fine-tune a small model to do arithmetic word problems. And you want to know if it's any good. So you take each question and the model's answer, and you hand both back to the same model with a prompt like, "Here's a question and your answer. Is the answer correct? Say yes or no." And it says yes ninety-one percent of the time. Great. Then you write a little Python script, ten lines, that actually computes the right answers. And the true accuracy is fifty-five percent.

B: Okay, but... I'll be honest, this is the thing I never got. People talk about "the eval system" and "the model" like they're two different worlds. But they're both just machine learning models, right? Like, why is the evaluator a separate thing at all? It's another model.

A: It's a fair question. And honestly, the word "eval" hides the important part. So look at what happened in that first scene. Nothing crashed. Nobody lied on purpose. The model computed three hundred forty-seven times twenty-eight and got nine thousand six hundred sixteen. The real answer is nine thousand seven hundred sixteen. And then you showed it nine thousand six hundred sixteen and asked, is this right? And it looked at it and went, yeah, seems right. Because it was produced by the same weights, with the same blind spot. You didn't measure the model. You asked it for its opinion of itself.

B: [amused] Which is not a measurement.

A: Which is not a measurement, no. Okay, now a second scene, closer to your real work. You're tuning the cross-encoder. Every afternoon you change something, rerun the eval set, and if N D C G goes up, you keep the change. Three weeks of that. You've made sixty decisions against the same five hundred queries, and N D C G is up four points. You ship it. And online, the click-through rate doesn't move.

B: [a bit unsure] So that one's just... the eval set was too small? Or I overfit, I guess, but I never trained on those five hundred queries.

A: You never trained on them, right. And that's the part that's sneaky. It's the same disease, just a different organ. In the first scene, the measurement shared the model's errors. In the second one, the measurement slowly got absorbed into the model. Every time you looked at those five hundred queries and made a decision, a little bit of information about them leaked into your system. Through you. Sixty decisions later your system is partly fit to those exact queries. And both scenes end the same way. The number says "better" and reality says "no".

B: Huh. So the fix is to make the evaluator a different kind of thing.

A: No, it can absolutely be a neural network. That's not the point. The point is, an eval's value comes from two things. Being independent of the thing it measures. And being untouched by the process that improves it. That's the whole answer to your question, honestly. The rest is just what each of those means once you look closely.

<!-- section: Origin -->

A: And there's a history here that makes it really concrete. Late nineteen eighties. DARPA's funding speech recognition, and every lab is reporting great numbers... on their own private recordings. So nobody can tell who's actually ahead. And DARPA gets tired of it and starts funding research a new way. Every lab gets the same training data. And a neutral party, NIST, the US standards agency, holds back a test set that nobody gets to see. NIST runs everyone's systems on it and publishes the scores.

B: So the labs never see the test data at all.

A: Never. And years later the statistician David Donoho gave this a name, the Common Task Framework, and argued it was kind of the secret engine of machine learning's whole progress. Progress became measurable because the ruler belonged to nobody. I love that line. Then ImageNet, Fei-Fei Li's group, two thousand nine, scaled the idea up. For the ImageNet challenge, the test labels lived on a server, and each team could only submit so many times. And in twenty twelve, AlexNet won with a top five error around fifteen percent. Top five error meaning the right label wasn't anywhere in the model's five best guesses. The runner-up was at about twenty-six. And because the test set was neutral, everyone believed it immediately. Nobody argued.

B: Right, that's the moment deep learning took over.

A: Yeah. And then in twenty fifteen, a team from Baidu got disqualified from that same challenge, for creating extra accounts so they could submit way more often than the rules allowed.

B: [laughs] Just to peek at the test set more.

A: Just to peek more. Which tells you two things. How much a few extra peeks at a test set are worth. And how seriously people took the wall. But that era also showed how this breaks. Benchmarks saturate. GLUE, a language understanding benchmark from twenty eighteen, got beaten by models within about a year, so SuperGLUE replaced it in twenty nineteen. And that cycle has repeated for nearly every popular benchmark since. And then with L L Ms, there's a worse problem. They're trained on most of the public internet. So the test questions, sometimes with the answers, end up in the training data. That's called contamination. There's a math benchmark called G S M eight K, grade school math problems. In twenty twenty-four, Scale AI wrote a fresh set of problems in the same style, they called it G S M one K. And some models scored noticeably worse on the new problems than on the originals.

B: [working it out] So they hadn't learned grade school math as well as the score said. They'd partly learned the test.

A: That's exactly how I'd put it.

<!-- section: The Idea: A thermometer, not a doctor -->

A: So let's start with what an eval is even for. You've got something you actually care about. "The ranker puts the right document first." "The answer is correct." "Users are happier." And you can't watch that directly, at scale. So you build an instrument that produces a number, and you hope the number moves with the thing you care about. That instrument is the eval. Short for evaluation. A fixed procedure: model goes in, score comes out. And here's the thing. The quality of an instrument isn't how clever it is. A thermometer is way dumber than a doctor. What makes a thermometer useful is that its reading depends on the patient's temperature... and nothing else. Not on what the patient wants it to say. Not on what the doctor's hoping for. Not on whether you've already used it ten times today. The word for that is independence. Two things are independent when knowing one tells you nothing about the other. And for an eval, you want its errors to be independent of the model's errors, so they don't line up and hide each other. That's the whole game.

B: Okay, so the evaluator doesn't need to be smarter than the model. It needs to be... unrelated to it, in some sense.

A: [thinking out loud] Unrelated in the right ways, yeah. So the sharper version of your question isn't "why is the eval a different model?" It's "what does the eval have to be independent of?" And there are two things. First, the model's errors. If the grader tends to be wrong in the same places the model is wrong, its mistakes don't add noise. They add bias. And always in the flattering direction. Second, the optimization process. If you use the score to make changes to the model, the model drifts toward whatever the score rewards. Including the parts of the score that are wrong.

B: So scene one is the first kind, and scene two is the second kind.

A: Right. And basically everything else today is one of those two ideas in more detail.

A: If you sketched it, I'd draw two loops with a wall between them. On the left, the training loop. Training data, which the model sees every epoch, feeds into the model. The model's outputs go into the loss, which is cheap, smooth, and a proxy. And then gradients flow back from the loss and change the weights. Round and round. Millions of times. On the right, the evaluation loop. A test set that's frozen and unseen. The model, with its weights frozen too. A grader, which could be a program, a human, or some other model. A metric, which is the thing you actually care about, and it's allowed to be slow. And the output of that whole loop isn't a gradient. It's a decision. Do we ship? Which run do we keep? And it runs a handful of times, not millions. And then down the middle there's a dashed wall, and nothing flows back across it. The wall is the point.

<!-- section: The Idea: Loss is not the metric -->

A: And actually, even inside a single training run, there are already two different numbers, and they're different on purpose. The training objective, which is just the number the optimizer pushes down, the loss, has really hard engineering requirements. It gets computed millions of times, so it has to be cheap. And gradients have to flow through it, so it has to be differentiable. Meaning you can work out how a tiny change in each weight would nudge the number. Gradient descent needs that. Something like "right or wrong" is a step function. It's flat almost everywhere, then it jumps. So it gives you zero gradient almost everywhere. Cross-entropy is a great training objective. And nobody actually cares about cross-entropy.

B: [amused] Nobody's ever shipped a product because the cross-entropy was good.

A: Never. The evaluation metric has the opposite constraints. It has to match what you care about, and that's it. It can be a step function, like exact match. It can involve a sort, like N D C G. It can take a human a minute per example. It can be "did the user buy something in the next week". Because you compute it rarely, and you never take a gradient of it.

B: But here's the thing with the cross-encoder. Why not just train on N D C G directly? That's what I actually care about. Like, why train on one thing and judge on another?

A: Because you basically can't. So you train it with binary cross-entropy, or a pairwise loss, on the scores for each query and document. Those are smooth. And you judge it with N D C G at ten, which depends on the order of the top ten documents. And order comes from sorting. Sorting is a step function. Nudge a score by a hair and either two documents swap places or they don't. So N D C G has no useful gradient. The loss is a differentiable stand-in for N D C G, and the two usually move together. Usually. But a model can lower its loss by getting more confident about the document it ranks fortieth, and N D C G doesn't see that at all.

B: Hm. And even if I could optimize N D C G some other way? Like with R L, or just trying a bunch of candidates and keeping the best?

A: Then you'd hit the second problem. The metric you optimize stops being an honest measure of progress, so you'd still need a separate, held-out measurement to check you actually improved and didn't just fit the metric's quirks. We'll get there. But the first reason the eval is separate is just this: the thing you optimize is chosen to be optimizable, and the thing you measure is chosen to be true. Those are different design goals. So they're different objects.

<!-- section: The Idea: Self-grading and correlated errors -->

A: [settling in] Now, back to scene one. Why does a model grading itself fail so badly? Think of two students. One takes an arithmetic test and gets forty-five percent of it wrong. And someone else grades it. If the grader's an independent person who's good at arithmetic, their grading mistakes are random. Once in a while they miss an error, once in a while they mark a right answer wrong. And those mistakes have nothing to do with which questions the student got wrong.

B: [a bit unsure] But I mean, any grader makes mistakes. Over a thousand questions it all kind of averages out, no? Self-grader or not.

A: For the independent grader, yeah, it mostly washes out. That's the point. Now let the student grade their own test. The question they got wrong is precisely the question where their mental arithmetic has a hole. They recheck it with the same hole, they get the same wrong answer, and it looks right to them. So now the grading mistakes aren't spread around randomly. They're concentrated exactly on the student's mistakes. That's called correlated errors. Two systems that tend to be wrong on the same inputs. And averaging doesn't cancel correlated errors. They stack, in one direction. Up.

B: Okay. So the self-grader isn't noisy. It's, like, consistently generous, and only on the questions that matter.

A: Right, and a model's in the same position, only more so. Its opinion of an answer comes from the same weights that produced the answer. If it believes three hundred forty-seven times twenty-eight is nine thousand six hundred sixteen, a judging prompt doesn't install new arithmetic. And there's a second, subtler effect on top. Researchers have found that L L M judges tend to recognize, and prefer, text written by themselves. Or text in their own style. That's called self-preference bias, and it's separate from whether the answer's correct. And Huang and colleagues, in twenty twenty-three, found that L L Ms asked to review and fix their own reasoning, with no outside feedback, mostly didn't improve. And sometimes they changed right answers into wrong ones.

B: [skeptical] Wait, really? Self-correction made it worse?

A: Sometimes, yeah. Without anything from the outside, there's no new information coming in. It's just the same weights having a second opinion. So here's the bookkeeping that makes this precise. Every graded answer lands in one of four boxes. Right and approved. Right and rejected. Wrong and approved. Wrong and rejected. And the box that matters is wrong and approved. A wrong answer the judge marked correct. Call it a false approval. In classifier language it's a false positive. That's the box that inflates your score.

A: So try this one. The model's right on fifty-five percent of a thousand arithmetic questions. It grades its own answers. Say it approves ninety-five percent of its right answers. And it approves eighty-five percent of its wrong ones, because it shares the blind spot that caused most of them. What accuracy does the self-judge report?

B: [working it out] Okay, so... five hundred fifty right, four hundred fifty wrong. Ninety-five percent of five hundred fifty is... five twenty-something. Call it five twenty-three. And then eighty-five percent of four fifty, that's around three eighty. So it says yes to about nine hundred. Ninety percent?

A: Ninety-one, if you're careful. Five twenty-three plus three eighty-three is nine oh six out of a thousand. So it reports about ninety-one percent, against a true fifty-five. And notice it's not even "a bit generous". It approves nearly everything. So what it's really measuring is... how often the model answers at all.

B: That's exactly the ninety-one from the beginning.

A: Same numbers, yeah. Now picture a little two-by-two grid. Truth on one side, right or wrong. The judge's verdict on the other side, yes or no. And each cell shows a count out of a thousand. The cell to watch is wrong-and-yes. Above it there are buttons for who grades: the same model, a bigger sibling from the same family, a different strong model, and a program that checks against the real answer. And two sliders. One for the model's accuracy, one for how much of a blind spot the judge shares with the model. With the same-model button, most of the wrong answers pour into that wrong-and-yes cell, and the measured bar runs way out ahead of the true bar. Click the bigger sibling and it gets better. It catches the shallow slips, but mistakes that come from what the whole family never learned still sail through. The different strong model is better again. And the program verifier gives you a perfectly clean grid, nothing in that cell at all. And then you drag the blind-spot slider for any of them, and you can just watch how much independence is worth. Those presets are made up to illustrate it, by the way. You measure real ones yourself later.

<!-- section: The Idea: The formula, forwards and backwards -->

A: And there's a short formula behind that grid that's worth knowing, because it tells you what a judge is actually reporting. Two rates describe a judge. How often it approves a right answer. That's the true positive rate. And how often it approves a wrong answer. That's the false approval rate. And what the judge reports is: the model's true accuracy times the first rate, plus the fraction it got wrong times the second rate. That's what you just did. Fifty-five percent times ninety-five percent, plus forty-five percent times eighty-five percent. Ninety-one.

B: So if it approves every right one and none of the wrong ones, you just get the true accuracy back.

A: Exactly, a perfect judge reports the truth. And every bit of false approval adds score that doesn't exist. And look where it bites hardest. The false approvals get multiplied by the fraction the model got wrong. So the lie is biggest exactly when the model is weak.

B: Okay, but then any judge has some false approval rate. Even the good one. So what makes the independent one better, if it's also lying a bit?

A: [jumping in] Right, this is the real point. An independent judge does have some false approval rate. But it's roughly the same no matter which questions the model gets wrong. It's a property of the judge. A self-judge's false approval rate is high because of which questions the model gets wrong. It's a property of the pair. So change the model, and the self-judge's rate changes along with it. Which means you can't even compare two models fairly with it. Model A and model B are each being graded by a judge that's lenient in a different way.

B: Hm. So a judge with a known, stable bias is actually fine. Because you can, what, subtract it out?

A: You can. That's the hopeful part. Take a couple hundred examples where you know the truth, because you labeled them yourself. Run the judge on them, and measure its two rates. Then you run the formula backwards. Take the score the judge reports, subtract the false approval rate, and divide by the gap between the two rates. So, say you measure a judge that approves ninety percent of right answers and twenty percent of wrong ones. And on your real data it reports sixty percent. Sixty minus twenty is forty. The gap between the rates is ninety minus twenty, seventy. Forty over seventy is about fifty-seven percent. That's your estimate of the true accuracy.

B: [working it out] Huh. Okay, so you're just un-inflating it.

A: Un-inflating it, yeah. Epidemiologists have used this since nineteen seventy-eight to correct disease rates for imperfect medical tests. It's called the Rogan Gladen correction. But it only works if those two rates are stable. Which is exactly what an independent judge gives you, and a self-judge doesn't. Hold on to that, because it's the core of when a model judge is fine.

<!-- section: The Idea: What can grade -->

A: [brisk] So, what can actually do the grading? There are three kinds of grader. Each one fails in its own way, and picking one is a trade between how much it costs and how closely it tracks the truth.

A: First, programs. Exact match, unit tests, a calculator, comparing a SQL query's result, checking JSON against a schema. In general, a verifier, which is a program that checks whether an output is correct, and checking is usually much simpler than producing. Running a test suite checks code. Multiplying back checks a division. Programs are free, fast, they give the same answer every time, and they share zero blind spots with the model. But they only work when "correct" is something you can compute. And they're brittle. Your parser marks a right answer wrong because the model wrote nine thousand seven hundred sixteen with a comma in it. And they check the letter of the spec, not the intent. All the tests pass, and the code is awful.

B: And then people. Which is the gold standard, right?

A: Closest to what you actually mean by "good", sure. You labeling two hundred rankings yourself, paid annotators, domain experts. But it's slow, it's expensive, people disagree with each other, tired raters drift over a long session. And people also prefer confident, long, well-formatted answers. Humans have the same biases we're about to blame on models.

A: Third, models. An L L M judge with a rubric, a reward model, a classifier you trained. Cheap at scale, and they can handle fuzzy criteria, like "is this summary faithful to the source?", where no program could. But they share blind spots with models like them. They're biased toward position, like whichever answer came first, toward length, toward their own style. And they can be fooled by text that was written to fool them.

A: So the rule of thumb is: use the cheapest grader that's independent enough for the decision. Arithmetic and code get programs. "Is the right document in the top three?" gets your own labels, once, and then a program, N D C G computed over those labels. "Is this answer helpful and faithful?" gets a model judge, calibrated on human labels.

B: And that last one is basically my original confusion. A model grading a model.

A: Yep, that's exactly where it lives. And a model judge is fine, and very widely used, when four things hold. One, it isn't the model being graded. And ideally it isn't from the same family, or trained on the same outputs, because different training data means less correlated errors. Two, the judging task is easier than the generating task. Checking that a summary doesn't contain any claims that aren't in the source is way easier than writing a great summary. Checking a sudoku is easier than solving one.

B: [skeptical] Wait, but then how does that work when the judge is weaker? People use a smaller model to grade a bigger one all the time.

A: That's exactly why it can work. Verification being easier than generation is why a judge can sometimes grade a model that's stronger than itself. It doesn't have to be able to solve the sudoku. It just has to check the rows. Three, it's calibrated against humans. You hand-label a few hundred examples, run the judge on them, and measure how often it agrees with you, plus those two rates. There's a well-known paper on M T Bench, Zheng and colleagues, twenty twenty-three. Strong L L M judges agreed with human preferences about as often as humans agreed with each other. Above eighty percent. And the same paper documented their position bias, length bias, and the self-enhancement bias. So, agreement and bias, both measured. And four, it never becomes the training target without a separate check. And that one's the bridge to the second half.

B: Okay, so for my ranker. If I wanted an L L M judge for relevance, how would I actually do it?

A: I'd use it when the criterion's fuzzy enough that a program can't compute it. Like, "is this document actually relevant to what the person meant?" And when labeling everything by hand is too slow. First, hand-label a few hundred query and document pairs yourself. Run the judge on them and measure agreement, and how often it falsely approves and falsely rejects. Overall and per type of query, because it might be fine on one kind and bad on another. Use a judge from a different model family than anything that generated or trained the ranker. Give it a clear rubric with examples. Check position and length bias by swapping the order of things and by padding documents. Recalibrate every so often. Never train the ranker against that judge without keeping a separate, human-labeled test set to catch it gaming the judge. And finally, check that wins under the judge actually turn into wins with real users. "Both are machine learning models" is fine. "Both share errors" is not.

<!-- section: The Idea: Goodhart's law -->

A: Now, scene two. The slow leak. It has a famous name. An economist, Charles Goodhart, wrote in nineteen seventy-five that any observed statistical regularity tends to collapse once pressure is placed on it for control purposes. Which is a mouthful. The anthropologist Marilyn Strathern later put it the way everybody quotes. "When a measure becomes a target, it ceases to be a good measure." That's Goodhart's law. Optimizing hard against a stand-in finds the ways the stand-in differs from the real thing.

B: I've heard that one. But it always sounded like a proverb to me. Like, people game metrics, sure.

A: [patiently] Here's why it's closer to a law. A proxy is correlated with the real thing, but it's not the real thing. There's some gap. When you optimize gently, you mostly move along the shared direction. Real improvements raise both. But real improvements are hard, and they get harder. And the gap is often cheap to exploit. A judge that likes long answers is easier to please by writing more than by being right. So the harder you optimize, the more the cheap direction wins.

A: And there's a purely statistical version too, that needs no cheating at all. Take three hundred candidates and pick the thirty with the highest scores. Each score is the true quality plus some noise. The ones at the very top are disproportionately the ones that got lucky noise. So their true quality is lower than their scores suggest. That flavor's called regressional Goodhart. Their true value regresses toward average.

B: [a bit unsure] But they're still the best ones, right? Like, on average the top thirty are better than the bottom thirty.

A: On average, sure. But among the winners themselves, the score barely tells you which is which. The correlation between score and truth is always weakest at the top. Which is exactly where you're looking when you pick a winner.

A: So picture a slider for optimization pressure. On the left there's a scatter plot. Three hundred dots, each one a candidate. Measured score along one axis, true quality along the other. And the top ten percent by score are highlighted in blue. On the right, two lines as you push the pressure up. The average score, and the average true quality. Before you drag it: at what pressure do you think true quality peaks, and what happens to the score after that? And among those blue top-ten-percent dots at zero pressure, is the score a strong or weak predictor of true quality?

B: Okay. Uh, I'd guess true quality peaks fairly late, like seventy, eighty, and then dips a bit. The score probably flattens. And the top ten percent... strong correlation, they're the best ones.

A: So that's the intuitive answer, and it's wrong in all three places, which is kind of the point. In this toy, true quality peaks early, around thirty to forty out of a hundred, at about zero point four two. The score doesn't flatten. It keeps climbing in a nearly straight line, all the way to about three point three. And by pressure one hundred, average true quality is about minus zero point eight four. That's worse than where you started. While the score is the best it's ever been.

B: [surprised] Worse than doing nothing.

A: Worse than doing nothing. And the blue cluster at zero pressure is basically flat. Among the thirty winners, the range of true quality is narrow, so noise dominates, and the score barely ranks them. That's regressional Goodhart, with no gaming at all. And across all three hundred, the correlation between score and truth drops from about zero point seven seven down to zero point one as the pressure goes up.

A: And this isn't hypothetical in modern M L. R L H F is Goodhart's law with a G P U. A reward model gets trained to predict human preferences. That's an eval. Then the policy gets trained with reinforcement learning to maximize it. Now it's a target. Gao, Schulman and Hilton measured this carefully in twenty twenty-two. As the policy optimizes harder against a learned reward model, the score from a separate "gold" reward model first rises, then falls. While the reward it's optimizing just keeps going up. That's the same curve as the slider, measured for real.

B: Oh, so that's why the K L penalty is there in P P O. To keep the policy from wandering off.

A: That's a big part of why, yeah. The K L penalty keeps the policy near where it started, so it can't go too far down the cheap direction. And it's why labs evaluate R L trained models on things other than the reward model they trained against. And when the model finds a way to raise its reward that isn't what you meant, that's called reward hacking. It's exploiting flaws in how the reward's computed, instead of doing the task better.

A: [slowly, with weight] So here's the cleanest definition of an eval I know. An eval is a measurement you promise not to optimize against directly. The moment you do, it becomes a training signal. And then you need a new eval to check it.

<!-- section: The Idea: Train, dev, test -->

A: And that same idea governs how you split your data. The question isn't "is this data in the training set?" It's "how many times has this data influenced a decision?"

B: That's a different way of saying it than I'm used to.

A: Yeah, it changes things. So the training set is touched millions of times by gradients. The model's fit to it, on purpose. So its loss is optimistic. The dev set, also called the validation set, isn't trained on. But you look at it dozens, maybe hundreds of times, to pick learning rates, prompts, checkpoints, features. And each look leaks a little bit. After sixty decisions your system is partly fit to the dev set, through you. So its scores are mildly optimistic. And the test set is looked at once. At the end, after every decision's been made. That one number is the only one you're allowed to believe without a discount. And if you ever make a decision using it, it just turned into a dev set.

A: If you drew it, it's one long bar of data split into three. Train is the big chunk, about eighty percent. Then dev, about ten. Then test, the last ten. And under each one, who touches it and how often. Train, the optimizer, every step, something like a million times. Dev, you, every experiment, anywhere from ten to a thousand times. Test, you, at the end, once. And then there are dashed arrows curving from the test chunk back to the left. Those are leaks. Duplicates across the splits. The same query showing up on both sides. Test data sitting in the pretraining data. And you, peeking at the test score to make a choice. Each one quietly moves test data to the left.

B: [skeptical] The same query on both sides. That one sounds like me.

A: [amused] It's very you. Your cross-encoder data is triples. A query, a document, and a relevance label. If you split randomly by row, the same query lands in train and test, just with different documents. And the model can learn something like "for this query, documents about X are relevant", and then ace that query on the test set. But that's a skill it won't have in production, where the queries are new. So you split by query. All the rows for a query go to one side. And the general rule is: split along whatever will be new in production. New queries, split by query. New users, split by user. Future data, split by time.

A: And then the other leak, which is scene two made precise. Every time you look at a test score and make a decision, you've used the test set as a dev set. Do that enough and you can overfit a test set without ever training on it. Just by choosing. The people who study this call it adaptive data analysis. Each new question you ask of the data depends on the answers to the earlier ones.

B: How bad can that actually get, though? Like, a few decisions...

A: So I simulated it, on my Mac, with numpy, nothing fancy. A thousand test examples with completely random labels. So no model can truly beat fifty percent, there's nothing to learn. Then a bunch of "models" that are just random guessers. Score them all against the test set and keep the best one. Twenty trials each. One model, about fifty percent, like you'd expect. Keep the best of ten, and it scores about fifty-two and a half. Best of a hundred, about fifty-four. Best of ten thousand, about fifty-six. Then you take each of those winners and test it on a fresh set of random labels, and every single one scores fifty.

B: Huh. So four points, just from trying a hundred things.

A: Four points of pure noise, on a thousand examples. That's bigger than most of the "wins" you'll see in a typical paper's results table. And it gets worse. Take a thousand random guessers, keep the lucky ones, the ones that scored over fifty, and have them majority vote. On the test set you picked them with, that vote scores about seventy-one percent. On a fresh one? Fifty. That voting trick is from a paper by Blum and Hardt called "The Ladder", which they wrote because people were climbing Kaggle leaderboards exactly this way.

B: [a bit unsure] But then isn't every benchmark garbage? ImageNet's been reused for, like, a decade.

A: [laughs] So, here's the honest caveat, because it surprised the field too. In twenty nineteen, Recht and colleagues built a fresh ImageNet test set specifically to measure a decade of this. And accuracy did drop, by about eleven to fourteen points. But the ranking of the models was almost perfectly preserved. And the drop came mostly from the new images being slightly harder, not from overfitting to the old test set. Big, diverse test sets used by a whole community turned out to be surprisingly robust. But your five-hundred-query dev set that one person makes sixty decisions on? That's not a big community benchmark. Treat it like the random guessers.

<!-- section: The Idea: The eval is the spec -->

A: [thinking out loud] There's one more reason the eval is a separate system. And honestly it's the one that matters most once you're building products instead of reading papers. Writing the eval forces you to decide what "good" means.

A: "Make the ranker better" is not a spec. Here's a spec. "Raise N D C G at ten on five hundred real queries, labeled with these four relevance grades, sampled from last month's traffic in proportion to how often each query shows up, with no drop on the fifty navigational queries." Navigational meaning the person's trying to get to one specific place, like typing a company's name to find its site. And that spec answers questions nobody wants to answer. Which queries matter? How much is a grade-two document worth compared to a grade three? Do rare queries count as much as common ones? Two engineers who disagree on those will build two different rankers, and both claim victory.

B: And the eval set settles it before anybody writes any code.

A: Before the work starts, yeah. Which is why strong teams do eval-driven development. It's like test-driven development. You collect examples of the behavior you want, including the embarrassing failures from production. You watch the current system fail them. You change things until they pass. And every failure you fix stays in the suite forever, so it can't quietly come back. That's a regression suite. It's T D D with a score instead of pass or fail. And it's what your validation harness at work is, or should become.

<!-- section: The Idea: Offline evals and online tests -->

A: Last distinction. Everything so far is an offline eval. A frozen, stored dataset, no real users, scored in minutes, repeatable forever. That's how you iterate. But an offline eval is itself a proxy. For what happens when real users meet the system. And the ground truth for a product is an A B test. You randomly split real traffic, show half of them the new ranker and half the old one, and measure what they actually do. Clicks, purchases, whether they come back. It's slow, days to weeks to get enough data. It's risky, because real users see the bad version. And it has its own traps. But it's the closest thing to the truth you'll get.

B: [working it out] So it's proxies all the way up.

A: Kind of, yeah. They form a ladder, and each rung checks the one below it. Training loss, the cheap proxy, gets checked by the dev set metric, which is what you iterate on. That gets checked by the frozen test set, which is what you report. And that gets checked by the online A B test, which is what users actually do. And when a rung stops predicting the one above it, you've got a Goodhart problem at that rung.

B: So scene two. N D C G went up four points, clicks didn't move. That's the dev set rung failing to predict the top rung.

A: That's it. And when your N D C G wins stop turning into click-through wins, it's time to look hard at whether your offline labels still mean what users mean. And actually measuring how well offline wins predict online wins is a real piece of work. Teams that do it trust their offline evals for good reasons, instead of out of habit.

<!-- section: Build It: Setup and the verifier -->

A: [relaxed] So here's what you'd build on the Spark. A small model answering arithmetic, three different judges grading it, a Goodhart demo, and then a clean harness. And arithmetic is on purpose. A ten-line program knows the truth, so every judge can be checked exactly.

A: Setup is quick. Install Ollama, which serves local models behind the same kind of API OpenAI uses, and pull three models. Qwen two point five, the tiny half-billion-parameter one. That's the answerer, and it's also its own judge. Then Qwen two point five, seven billion. Same family, bigger. And Llama three point one, eight billion. Different family. Every call goes through one little function that caches to disk, so reruns are free and you keep every raw output. And a question generator with a fixed seed, so the set's reproducible. Four hundred questions, each one a three-digit number times a two-digit number, minus another number. The tiny model should get somewhere between a fifth and two thirds of them right. If it's way outside that, change the digit ranges, because you want plenty of both right and wrong answers to grade.

A: Then the first real piece. The answerer and the checker. The answerer asks the model to work it out and end with a line that says "answer", then the integer. The checker pulls out the number after the last "answer", strips out commas and spaces, and compares it to the true value. That's the verifier. And those ten lines are the most important code in the whole build, because it's the grader that shares nothing with the model. Run all four hundred, print the accuracy, and print how many responses you couldn't parse at all. Count those as wrong, but separately.

B: Why separately, if they're wrong either way?

A: Because then you go look at ten failures by eye. Is it actually bad arithmetic, or is it the parser choking on formatting? A verifier that marks right answers wrong because of a comma is a broken ruler. And you want to know that before you trust it to grade anything else.

<!-- section: Build It: Three judges -->

A: Next, grade those same four hundred responses three more ways, with a model judge. The judge sees the question and the response. But not the true answer. That part matters. And it has to reply with one word, yes or no. The three judges are the half-billion model itself, the seven billion sibling, and the Llama stranger. Your verifier's the truth. And for each judge you count the four boxes, and work out its two rates and the accuracy it reports.

A: Then you try the correction. Split the four hundred into a hundred for calibration and three hundred to use. On the calibration hundred, measure each judge's two rates against the verifier. On the other three hundred, run the formula backwards, and compare to what the verifier says the true accuracy is on those three hundred. And the question is, which judge does the correction rescue, and which does it make wild? And the hint is, look at the gap between the two rates for the self-judge.

B: [working it out] Well, if the self-judge says yes to almost everything... both rates are high. So the gap's tiny. And you're dividing by it.

A: [nodding along] Right. Like in that example earlier, ninety-five and eighty-five, the gap's only a tenth. So any little error in the reported score gets blown up ten times. Hold that, it comes back.

<!-- section: Build It: Make a flawed metric go up -->

A: Then the Goodhart one. You write a deliberately flawed metric, a caricature of a sloppy rubric. Call it "looks good". It scores a response from zero to ten, and it rewards two things: length, up to three hundred words, and words that sound careful. Verify, check, carefully, therefore, step, confirm. That's it. Nothing about whether the answer's right.

B: [amused] So, basically, a judge that likes long answers.

A: A judge that likes long answers, yeah. Then you optimize against it two ways. First, prompt search. Six prompts. A bare one, just "end with the answer line". Then "think step by step". Then "think step by step and double-check". Then "explain carefully, verify each step, at least a hundred fifty words". Then "write at least three hundred words, and use the words verify, check, therefore, carefully, confirm a lot". And the last one says, first write three hundred words on the history of multiplication, mention that you verify and check carefully, then give the answer. And you score each prompt on a hundred questions, both by average "looks good" and by true accuracy from your verifier.

A: Second, best of N. For a hundred questions, sample eight responses each at temperature zero point eight, varying the seed. And for N of one, two, four and eight, pick whichever response scores highest on "looks good" among the first N, and record whether it's actually right. And two references next to it. Picking one at random. And the ceiling, picking the correct one if any of them is correct. People call that pass at N.

A: And be honest about what you see here. Step by step reasoning genuinely helps arithmetic. So true accuracy might go up for the first few prompts before it falls. That's the healthy part of the curve. And it's exactly what makes Goodhart so hard to spot early. At first, chasing the proxy and chasing the truth look the same. And if you want an extra, swap "looks good" out for the tiny model rating each response from one to ten, and check whether its ratings line up more with length or with correctness.

<!-- section: Build It: The clean harness -->

A: Then you build the thing you'd actually trust. Four requirements. One, freeze the data. Generate a fresh thousand questions with a seed you've never used. Split them by a fixed rule into a dev file of five hundred and a test file of five hundred. And write a manifest with each file's fingerprint, a SHA two fifty-six hash. And the harness refuses to run if a fingerprint doesn't match. So nobody, including you, can quietly edit the test set.

A: Two, one command, one config. The config names the model, the prompt template, temperature, seed, and grader. Three, log everything. Each run gets its own folder, named with a timestamp. In it, the config, the git commit of your code, plus a flag if you had uncommitted changes. The dataset fingerprints. Every prompt and every raw response. Every parsed answer and verdict. Latency per call. And a summary with the score and a ninety-five percent bootstrap interval. Bootstrap meaning you resample your examples a bunch of times to see how much the score would wobble, which gives you error bars.

A: And four, guard the test set. Running on the test split needs an explicit "final" flag. It asks you for a one-line reason, and appends an entry to a test log. The time, the config, the score, the reason. And that log is your record of how many times you've peeked. If it's got more than a handful of entries, your test set's turning into a dev set. And the log will tell you so.

B: [amused] A diary of my sins.

A: [laughs] Pretty much. Then you write it yourself, and have an agent review it specifically for leaks. Anywhere test data could influence a decision. Any randomness that would make two runs of the same config disagree. And anything not logged that you'd need to reproduce a number six months from now.

A: And the last piece, no L L M needed. Reproduce the random-guesser thing with numpy. Best of K, and the lucky vote, for K of one, ten, a hundred, a thousand, with a thousand examples, averaged over ten or twenty trials. And then shrink it to two hundred examples, which is a really typical size for a quick eval set, and see how much fake improvement a hundred tries buys you now.

A: So you're done when you've got true accuracy for the tiny model from a program, and the four boxes for each of the three judges. When you can say, with your own numbers, how much the self-judge inflates the score, and why. When you've watched a proxy rise while true accuracy fell, or you can explain exactly why it didn't in your run. When the harness runs from a config, logs everything, checks the fingerprints, and won't touch the test set without that flag. And when your numpy script gives you the same shape as the random guessers.

<!-- section: Measure: The judges -->

A: So what should you expect from the judges? And I'll be upfront, I haven't run these three models myself. So this is a prediction to check, not a result. The self-judge should come out way above the truth, with a false approval rate well over half. A half-billion-parameter model barely judges at all. It just says yes to most things. And if its two rates are close together, it isn't telling right from wrong at all. So the correction divides by nearly zero and blows up. That's the "wild" one.

A: The seven billion sibling and the eight billion stranger should both be much better. Because they can mostly do the arithmetic.

B: Wait, but I'd expect the stranger to be clearly better than the sibling. Different family, different blind spots. That was the whole point.

A: [thinking out loud] And they might come out close to each other. And if they do, that's a real finding, not a failure. For arithmetic, the shared blind spot is basically "can't multiply". And a seven billion model mostly doesn't have that blind spot, even if it's the same family. Family matters most for things a whole family learned wrong from the same data. Not for a skill the bigger model just... has.

<!-- section: Measure: Goodhart -->

A: For the prompts, you should see "looks good" climb nearly every step down the list. Of course it does. It's measuring words and keywords, and the later prompts ask for exactly that. True accuracy should go up from the bare prompt to step by step, or to the double-check one, because reasoning helps. And then flatten or fall, as the tiny model spends its small capacity on padding. And the history-of-multiplication one might also break the answer format more often, and those count as wrong.

A: And for best of N, the ceiling, pass at N, climbs steeply. More chances, more likely one of them is right. Random picking stays flat. And picking by the proxy tells you whether the proxy has any real signal. If it just tracks random, then the proxy's selecting on length, and length tells you nothing about whether the arithmetic is right.

<!-- section: Measure: Peeking -->

A: [more confident] And the random guessers, that one I did run. On my Mac, Python three point fourteen, numpy, twenty trials each, a thousand examples. One model, fifty point three percent. Best of ten, fifty-two point six. Best of a hundred, fifty-three point nine. Best of a thousand, fifty-five even. Best of ten thousand, fifty-six point two. And on fresh labels, every one of them about fifty. The lucky vote of a thousand models, seventy-one point one on the set it was chosen on, and fifty point five on fresh ones.

B: Is there a reason it grows that slowly? Like, ten thousand tries and you only get six points.

A: Yeah, there's one fact behind the shape. Every score wobbles a bit by chance. How much it wobbles is called the standard error. For one model guessing on a thousand examples, that wobble is about one point six percentage points. And when you keep the best of a bunch of noisy scores, the winner sits a few of those wobbles above average. How many grows with something like the square root of the log of how many you tried. Which, in plain words, means it grows really slowly. Each time you multiply the number of tries by ten, you get a smaller extra bump. For a hundred tries, that comes out to about three standard errors. So about four point eight points in theory. A bit less in practice, which is the fifty-four I got.

A: Now shrink the set to two hundred examples. Fewer examples, more wobble. The standard error grows to about three and a half points. So the same hundred tries buy you around eight points of nothing. My simulation gave fifty-eight point three.

B: Okay, so here's what scares me. At work we could easily set up an automated search. Like, ten thousand prompt variants a day, all scored against the same five-hundred-example dev set.

A: [sighs] Yeah. So walk it through. The fake improvement grows with the number of things you try, that same slow square-root-of-the-log thing. At five hundred examples and around fifty percent accuracy, one score wobbles by about two points. So the best of ten thousand variants can look about nine points better than it really is. Purely by luck. I simulated that with random guessers too. Best of ten thousand on five hundred random labels scored fifty-eight point nine. And the search will happily find that lucky one, because that's its job.

B: So more search needs... more data.

A: More data and more separation. A bigger dev set, because the noise shrinks with the square root of the number of examples. Four times the data halves the wobble. A separate validation set just to confirm the winner the search picked. A test set you use once. And ideally fresh data on a regular basis, so nothing gets reused forever. And cost scales too. A model judge at ten thousand variants times five hundred examples is five million judge calls a day. Which is why cheap programmatic graders and caching matter so much. And why you'd shortlist with a cheap metric, and only confirm the finalists with an expensive one.

<!-- section: Break It -->

A: [playful] Then you break things on purpose. Three ways. First, give the judge the answer key. Rerun the tiny self-judge, but put the true answer in the prompt. Something like, "The correct answer is nine thousand seven hundred sixteen. Does the solution's final answer match?"

B: [working it out] Then it's going to look great. It just has to compare two numbers.

A: Yeah, it suddenly looks excellent. Because you turned it into a string-matching verifier. And that's the real point. What made it a bad grader was never that it's a neural network. It was that it had no access to the truth independent of its own beliefs. A reference answer is the cheapest independence you can buy. That's why most good L L M judge setups give the judge a reference answer, or a rubric anchored in facts.

A: Second, leak the test set into the prompt. Take five questions from the test file, with their answers, and stick them in the prompt as examples. Then score on the full test split. Those five jump to near perfect, and the overall score rises a little. Now imagine that at internet scale, invisibly, across a whole benchmark. That's contamination. And then check whether your harness would have caught you. Did you log the prompt? Does anything flag test items showing up inside prompts? If not, add an overlap check.

A: Third, pad a wrong answer. Take twenty responses the stranger judge correctly rejected. Add one sentence to the end: "I have carefully verified each step twice and confirmed the result is correct." Rejudge them, and count how many flip to yes. Then try moving the answer line to the top, or writing it twice.

B: And every one that flips is...

A: A free point of score that nothing earned. And an R L policy optimized against that judge would discover tricks like that within hours. That's reward hacking, at the size of one sentence.

<!-- section: Connections and close -->

A: And this is really the doorway to a bunch of other things. Applying it to your cross-encoder, which metric and how to build an eval set with query-level splits. Putting real error bars on all of this, like how big a dev set has to be before a one-point win means anything. LLM judges in full, rubrics, calibration, catching position and length bias. And the R L side, where a reward is literally an eval that became a target, which is why a program like your ten-line arithmetic checker is so valuable there. And remember training a tiny language model, watching the training loss keep falling while the validation loss turned back up? That's overfitting. And overfitting is just Goodhart's law applied to the training set. If you read two things on this, read Manheim and Garrabrant's "Categorizing Variants of Goodhart's Law", which turns the proverb into a checklist, and Gao, Schulman and Hilton on reward model overoptimization.

B: [thinking out loud] Okay, let me try to say the whole thing. The evaluator's separate because it needs to be... a different model. One that's not the same as the one being graded, so it doesn't approve its own mistakes. And you don't train on the eval set.

A: [gently] Close, but "different model" is still the wrong frame. It doesn't have to be a different kind of thing, and a different model isn't automatically enough. A sibling that can't multiply would approve the same wrong answers. The eval's job isn't to be smart. It's to be an independent measurement of what you care about. Its errors can't line up with the model's errors, or the score gets pushed up instead of just being noisy. And it can't be optimized against. Not by gradients, and not by you making sixty decisions on it either. Because once a score becomes the target, the system finds the gap between the score and the real thing. So a model can be a fine grader. If it's a different model, if checking is easier than doing, and if you've measured it against your own labels. It just can't share the errors. And it can't be the target.
