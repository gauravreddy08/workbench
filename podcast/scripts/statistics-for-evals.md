<!-- section: Is that significant -->

A: [relaxed, thinking out loud] So you retrain the cross-encoder with a new way of picking hard negatives. You run the eval, five hundred held-out queries, and you look at how often the right document lands in first place. The old model gets seventy-one point two percent. The new one gets seventy-two.

B: Okay. Small, but it went up.

A: It went up. So you post it in Slack. And someone replies, "Nice, is that significant?" And you realize you don't actually know what that question means, never mind the answer.

B: [laughs] I've been that person.

A: Everyone has. So you try something. You run the old model again. Same weights, same five hundred queries. But this time you let it add a bit of randomness when it rewrites the queries. And it scores a bit lower than before. Run it again, a bit higher. The same model moved more between two runs than your whole improvement.

B: Huh. So the improvement is smaller than the model wobbling against itself.

A: That's the whole problem in one scene. An eval score isn't a fact about the model. It's a measurement, taken with a noisy instrument. A limited set of questions, maybe some randomness in the answers. And every measurement has an error bar. Most of the "wins" people post are inside it. And most of the real wins are smaller than people think, and you need either more questions or a smarter comparison to see them.

<!-- section: A brewer with ten patients -->

A: And the smarter comparison is really old. It goes back to a guy named William Gosset, who worked for the Guinness brewery in Dublin, in the early nineteen hundreds. Guinness had to make decisions about barley and hops from a handful of small, expensive experiments. And the statistics of the day assumed you had lots of data. So he worked out what happens when you only have a little.

B: Wait, isn't this the "Student" thing?

A: It's the Student thing. Guinness didn't let staff publish under their own names, so his paper came out under the pen name "Student". That's where Student's t-test comes from. But the part I love is his worked example. Two sleeping drugs, each given to the same ten patients. And he didn't compare the two drugs' averages as if they were separate groups. He took each patient's difference, drug one versus drug two, and asked whether those differences were reliably above zero.

B: Same patients, two treatments.

A: Same patients, two treatments, look at the difference per patient. And that's exactly what you'll do with two models on the same questions. Evan Miller wrote a paper for Anthropic about adding error bars to evals, and a lot of it is basically a reminder to the ML world of things Gosset worked out a century ago.

<!-- section: A score is a sample -->

A: So start with one model. Somebody wrote those five hundred queries. They could have picked five hundred different ones of the same kind, and the model would have scored a bit differently. What you actually care about is how it does on all the queries of that kind. Every query your customers will ever send. Your five hundred are just a sample from that pool, and your score is an estimate.

B: Right. So how far off can the estimate be?

A: Think of each question as a coin that comes up "right" with some probability. Your score is just the average of five hundred coin flips. And before I tell you, how wide would you guess the error bar is? On five hundred questions, around seventy percent?

B: [working it out] I don't know. A point either side? Maybe a point and a half?

A: That's what most people say. It's about four points either side.

B: Four? On five hundred questions?

A: About four. People tend to underestimate this by three or four times. And it gets worse. The error bar shrinks with the square root of the number of questions. So to cut it in half, you need four times as many questions. Even on a big benchmark with thousands and thousands of questions, there's still most of a point of noise. And leaderboards rank models a fraction of a point apart.

B: Okay, so my improvement of under a point is just nothing.

A: Compared to that error bar, it's almost nothing. But here's the twist. That's the error bar for one model on its own. And comparing two models is a different question.

<!-- section: Only disagreements count -->

B: But surely I just put error bars on both, and if they overlap, there's no real difference.

A: That's the move almost everyone makes, and it throws away real results. Think about what actually happens on those five hundred questions. The old model and the new one are close cousins. An easy question is easy for both of them. A question with a confusing label trips up both of them. So on most questions, they do the exact same thing.

B: Right.

A: And a question they both get right tells you nothing about which one is better. Neither does one they both get wrong. The only questions that carry any information about the gap are the ones where they disagree. One right, the other wrong.

B: Oh. So most of the five hundred are just... noise in the comparison.

A: They're noise if you compare the two averages separately, because each average carries all that question-to-question variation. But if you do what Gosset did, and look at each question's difference, new minus old, then all the shared stuff cancels out. The easy questions are zero. The hard ones are zero. All that's left is the disagreements. That's called a paired comparison. And when two models agree a lot, the error bar on the difference can be a third as wide.

B: [skeptical] Same data, though. How does looking at it differently give me more certainty?

A: It doesn't create evidence. It stops the questions they agree on from adding noise to the comparison. And the rule I'd burn in is: overlapping error bars do not mean no difference. If both models answered the same questions, the separate error bars are the wrong tool. You can have two bars overlapping a lot, and the paired difference sitting clearly above zero.

<!-- section: Resampling your own questions -->

B: Okay, but the coin-flip thing works for accuracy. What about NDCG? Or something weirder?

A: That's where the bootstrap comes in. A statistician named Bradley Efron came up with it in the late seventies. You can't draw fresh question sets from the real world. So draw them from your own set instead, since it's your best picture of the world. Take your five hundred, and pick five hundred at random, with replacement. So some questions show up twice, some not at all. Score that fake set. Do it ten thousand times. The spread of those scores is your error bar.

B: And for two models?

A: Same thing, with one rule you can't break. Each round, pick one set of questions, and score both models on that same set. If you resample them separately, you've silently turned your paired comparison back into an unpaired one. And the bootstrap has one big assumption. It assumes the things you resample are independent. Which leads to the ways this still fools you. But first, the "is it luck" question.

<!-- section: Could luck do this -->

A: So the question behind "is it significant" is: if the two models were truly equally good, how surprising would a gap this big be? And there's a lovely way to check. If the models are interchangeable, then on each question, it shouldn't matter which one we called old and which we called new. So swap them at random, question by question, and recompute the gap. Do that thousands of times. And then see how often random swapping produces a gap as big as yours.

B: That's nice. You're building the "nothing's going on" world out of your own data.

A: Right. That's a permutation test. And when the answers are just right or wrong, there's a classic version from the forties called McNemar's test. It looks only at the disagreements. If the models are equally good, each disagreement is a coin flip for which one wins it. So if the new model wins way more of them than a fair coin would, that's evidence.

B: And it doesn't care about the questions they both got right.

A: Doesn't touch them. Which cuts both ways. Add thousands of easy questions both models ace and McNemar doesn't budge, but your separate error bars would get narrower and make everything look more certain than it is.

B: So what does that mean for my Slack message?

A: Here's the one that changed how I read Slack. I simulated two models that are exactly as good as each other. Five hundred questions. And I counted how often one beats the other by at least that margin from the Slack message. It was about a third of the time.

B: [laughs] So two identical models could've posted my message.

A: A third of the time. That gain on five hundred questions isn't weak evidence. It's close to no evidence.

<!-- section: How it still fools you -->

B: Okay, so if I do the paired thing properly, am I safe?

A: Mostly. There are three traps that get you even with error bars. The first is clumps. A lot of evals are built in groups. Ten questions about each document. Several queries from each customer. And questions in the same group rise and fall together. If the model doesn't understand a document, it misses most of that document's questions.

B: So you don't really have five hundred independent questions.

A: You've got somewhere between the number of groups and five hundred. And your error bar is too narrow, sometimes by a lot. The fix is to resample whole groups, not single questions. And for your ranker, if your queries came from a few dozen customers and one customer's catalog is weird, the customer is your group.

B: And the second trap?

A: Trying lots of things. Say you write twenty prompt variants and none of them is actually better. Each one's score still wobbles. Pick the best of twenty wobbly numbers, and you've picked the one whose luck ran hottest. That's called the winner's curse. The best one will look like a real win nearly every time.

B: And then on fresh data it falls back.

A: Falls back toward zero, and a different one looks best. So you choose on one set, as much as you like, and confirm the single winner once on a set you haven't touched. That held-out number is the one you report. And the third trap sits above all this. The training run is a sample too. Train the same model twice with different random seeds and the two can differ by more than your eval's error bar. So if you're claiming a new training recipe is better, the unit is the training run. You need a few runs of each.

<!-- section: How many do you need -->

A: And then turn the whole thing around. Before you run anything, ask: if the improvement is real, and about the size I care about, how likely am I to actually see it? That's called power.

B: And with five hundred questions?

A: For a small real gain, between two close checkpoints, you'd usually miss it. Most of the time, you'd see nothing and conclude "no effect". From an experiment that could barely have found one.

B: That's kind of the opposite failure. Throwing away a real win.

A: That's the other half of it. And the headline is that the number of questions grows with one over the gap, squared. Halve the improvement you want to see and you need four times the questions. Which is why careful labs care so much about eval set size and about pairing. And why "we got half a point on a thousand-question benchmark" isn't a result.

<!-- section: Ending -->

B: Okay, let me try. A score is a sample, so it has an error bar, and it's way wider than it feels, like four points on five hundred questions. When I compare two models on the same questions, I should look at each question's difference, because only the disagreements matter. And if the bars overlap, it can still be real. And if it's not significant, the new model isn't better.

A: All of that except the last bit. "Not significant" means you couldn't tell, not that there's no difference. With five hundred questions you'd miss a real small gain most of the time. So the honest sentence is the gap, its range, how many questions they disagreed on, and what size of difference your set could even have seen. Then whoever reads it knows exactly how much you know.
