<!-- section: Grading your own homework -->

A: [relaxed, thinking out loud] So say you fine-tune a small model to do arithmetic word problems. Multiply this by that, subtract something. And you want to know how good it is. So you do the easy thing. You hand the same model its own answer and ask, "Is this correct? Yes or no."

B: And it says yes.

A: It says yes nearly every time. Great model. And then you write a little Python script, ten lines, that actually does the arithmetic and checks. And the model's right only about half the time.

B: Huh. So it's not just a bit generous, it's way off.

A: Way off. And nothing crashed, nobody lied. The model multiplied two numbers and got one digit wrong. And then it looked at that wrong answer and found it completely believable. Because the same weights, with the same blind spot, are doing the checking. You didn't measure the model. You asked it for its opinion of itself.

B: [skeptical] Okay, but honestly this is the bit I've never got. I'd read about how there's an evaluation system and there's a model, and I never understood why they're separate. They're both basically just machine learning models.

A: It's a fair question, and the honest answer is that the word "eval" hides the important part. Let me give you a second scene first, because it's closer to your actual work. You're tuning the cross-encoder. Every afternoon you change something, rerun the eval set, and keep the change if the score goes up. Three weeks later you've made a lot of decisions against the same few hundred queries. The score's up nicely. You ship it. And online, the click-through rate doesn't move.

B: Oof. Yeah, that one I can picture.

A: Same disease, different organ. In the first scene, the measurement shared the model's mistakes. In the second, the measurement got slowly soaked up into the model. Every decision you made against those queries leaked a little bit about them into your system, until your system was partly fit to them. Both end the same way. The number says better, and reality says no.

<!-- section: A ruler that belongs to nobody -->

A: And this problem is old. Back in the late nineteen eighties, DARPA was funding speech recognition labs, and every lab kept reporting great numbers. On their own private recordings.

B: [laughs] Of course they were.

A: Of course. So DARPA changed how it funded the work. Every lab gets the same training data. And a neutral party holds back a test set nobody gets to see, runs everyone's system on it, and publishes the scores. The statistician David Donoho later called this the Common Task Framework, and he argued it was the secret engine of machine learning's progress. Progress became measurable because the ruler belonged to nobody.

B: And ImageNet was that idea, but bigger.

A: Right. ImageNet kept the test labels on a server and capped how often each team could submit. And in twenty fifteen, a team from Baidu got disqualified for making extra accounts so they could submit more often than allowed. Which tells you two things. How much a few extra peeks at a test set are worth. And how seriously people took the wall.

<!-- section: Thermometer, not doctor -->

A: So here's the way I think about what an eval is for. You care about something you can't see directly. "The ranker puts the right document first." "Users are happier." So you build an instrument that gives you a number you hope moves with it. That's the eval. And the quality of an instrument isn't how clever it is.

B: Meaning what?

A: A thermometer is way dumber than a doctor. What makes it useful is that its reading depends on the patient's temperature, and nothing else. Not on what the patient wants it to say. Not on what the doctor's hoping. That's the word, independence. And it's the whole game.

B: So the real question isn't "why is the eval a different model".

A: It's "what does the eval have to be independent of?" And there are two answers. It has to be independent of the model's mistakes. And it has to be independent of the process that's improving the model. Basically everything else is one of those two in more detail.

<!-- section: The loss isn't the score -->

B: Okay, but even inside one training run there's already a number, right? The loss. Why isn't that the eval?

A: Because they're built for opposite jobs. The loss gets computed millions of times, so it has to be cheap. And the gradients have to flow through it, so a tiny change in any weight has to make a tiny change in the loss. That's what differentiable means. The metric you actually judge by has none of those constraints. It just has to match what you care about. It can be slow. It can be a human looking at each example.

B: [working it out] And for my ranker, I train it on a smooth loss, but I judge it on NDCG, which is about the order of the top results.

A: And order comes from sorting. Nudge a score a tiny bit and either two documents swap or they don't. So NDCG has no useful gradient. The loss is a smooth stand-in for it, and they usually move together. Usually. Your model can lower its loss by getting more confident about the document it ranked fortieth, which NDCG doesn't even see.

B: So the training number is picked to be optimizable, and the eval number is picked to be true.

A: That's it. Different design goals, so they're different objects.

<!-- section: Errors that line up -->

A: Now back to the arithmetic. Why does self-grading fail so badly? Think about two students. One takes a test and gets a lot wrong. Someone else grades it, someone who's good at arithmetic. Their grading mistakes are random. Once in a while they miss an error, once in a while they mark a right answer wrong. And those slips have nothing to do with which questions the student got wrong. So over lots of questions, they mostly wash out.

B: And if the student grades their own test—

A: The questions they got wrong are exactly the ones where their mental arithmetic has a hole. They recheck with the same hole, get the same wrong answer, and it looks right. So now the grading mistakes are piled right on top of the student's mistakes. Those are called correlated errors, and they don't wash out. They push the score in one direction. Up.

B: So it's not noise, it's bias. And always the flattering kind.

A: Always flattering. And there's a second effect on top. Researchers have found that model judges tend to prefer text written by themselves, separately from whether it's right. It's called self-preference.

B: Okay, so then is a model judge just never okay?

A: No, and this is where your question really lands. A model judge is fine, and people use them everywhere, when a few things are true. It isn't the model being graded, and ideally it's not even from the same family. Judging is easier than generating, like checking a sudoku is easier than solving one. You've checked it against your own labels on a few hundred examples. And it never becomes the training target. So "both are ML models" is fine. "Both share errors" is not.

<!-- section: When the measure becomes the target -->

B: And that last one, never the target. That's the cross-encoder scene.

A: That's the second scene, and it has a famous name. The economist Charles Goodhart pointed out that a statistic you lean on for control tends to fall apart. And the anthropologist Marilyn Strathern put it in the form everyone quotes. "When a measure becomes a target, it ceases to be a good measure." That's Goodhart's law.

B: [skeptical] I always kind of heard that as a proverb, though. Like, people game metrics.

A: It's more of a law than that. A score is correlated with the real thing, but there's always some gap. When you optimize gently, you mostly move in the direction that improves both. But real improvements are hard, and they get harder. And the gap is often cheap. If a judge likes long answers, writing more is way easier than being right. So push hard enough, and the cheap direction wins. The score keeps climbing while the real quality turns around and goes down.

B: That's kind of grim.

A: And there's a version that doesn't need any gaming at all. Say you score lots of candidates, and the score is true quality plus some noise. Keep the top few. The ones at the very top are disproportionately the ones that got lucky noise. So the winners are always a bit worse than they look. And it's worst exactly among the winners, which is where you're looking.

B: So even an honest score lies a little at the top.

A: A little, and only at the top. And none of this is hypothetical. RLHF is Goodhart's law with a GPU. You train a reward model to predict what people prefer. That's an eval. Then you train the model to maximize it, and now it's a target. People measured it carefully. Push harder against the reward model and a separate, independent judge says quality rises, and then falls, while the reward you're optimizing keeps going up. When a model finds a way to raise the reward that isn't what you meant, that's called reward hacking.

B: So an eval is something you promise not to optimize against.

A: That's the cleanest definition I know. The moment you optimize against it, it's a training signal, and you need a new eval to check it.

<!-- section: How many times has it been touched -->

A: And that idea also explains how you split your data. The question isn't "was this data trained on?" It's "how many times has this data influenced a decision?" The training set gets touched millions of times by gradients. The dev set never gets trained on, but you look at it over and over to pick settings. And every look leaks a little. And the test set, you look at once. At the end. That one number is the only one you get to believe at face value.

B: And the cross-encoder scene was me turning my test set into a dev set.

A: Without ever training on it. Just by choosing. And I ran a little simulation that made this really click for me. Make up random labels, so no model can truly do better than a coin flip. Then make a bunch of random-guess "models", and keep whichever scores best. Try a hundred of them, and the winner looks a few points better than chance. Which is bigger than a lot of the wins people report. And if you take the lucky ones and let them vote, it looks dramatically better. Then you check every one of them on fresh random labels, and they're all straight back to a coin flip.

B: Huh. So I could climb a leaderboard on pure noise.

A: People did. That's literally why someone designed a leaderboard that resists it. And there's one leak that's very specific to you. Your data is query, document, label. If you split randomly by row, the same query lands on both sides. The model learns "for this query, documents about this are relevant", aces the test on that query, and has none of that skill on new queries. So you split by whatever's going to be new in production. New queries, split by query.

<!-- section: The eval is the spec -->

A: There's one more reason the eval stays separate, and once you're building products it's the one that matters most. Writing the eval forces you to decide what "good" means. "Make the ranker better" isn't a spec. Which queries matter? Do rare queries count as much as common ones? How much is a pretty-good document worth next to a perfect one? Two engineers who disagree on that will build two different rankers and both claim they won. The eval set settles the argument before the work starts.

B: That's kind of like tests before code.

A: It's exactly that idea, people call it eval-driven development. Collect examples of what you want, including the embarrassing failures from production, watch the current system fail them, fix it, and every fixed failure stays in the suite forever so it can't quietly come back.

<!-- section: Ending -->

B: Okay. Let me try. The eval isn't separate because it's a different kind of thing. It can totally be a model. It's separate because it has to be independent. Its mistakes can't line up with the model's, which is why a model can't grade itself. And it can't be the thing you're optimizing, because then the model just finds the gaps in it. So basically, never use a model to grade another model you're training.

A: Close, but that last bit goes too far. You can train against a model judge. People do it all the time, that's RLHF. What you can't do is let that judge also be the thing that tells you whether it worked. The moment a score becomes the target, you need a different measurement, one the training never touched, to check it. That's the whole reason there are two systems.
