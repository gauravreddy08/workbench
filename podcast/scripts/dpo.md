<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you want your relevance-labelling model to do a bit more than spit out a label. You want it to write a short reason, something a human reviewer can actually trust. And you do the obvious thing first. You sit down and write a few hundred perfect explanations yourself, and fine-tune on them.

B: Sure. That's what I'd do.

A: And it goes badly, in a way you don't expect. A perfect explanation takes you a few minutes. After forty of them you're tired, they all start to sound the same, and honestly you're not sure your fortieth is any better than what the model already writes. So the model learns your tired style.

B: [laughs] That's painfully real.

A: Then a colleague puts two of the model's explanations side by side and asks, which one's better? And you answer in about three seconds. And you're confident. You could do hundreds of those in the time it took to write twenty perfect ones. And your sense of which is better is sharper than your ability to write the best one.

B: Like a wine critic. Can't make a great wine, can absolutely tell you which glass is better.

A: Right. Judging is easier than writing. So if you could train a model on "this one, not that one", you'd get far more signal per hour of your time. And it'd be about quality, not about copying one person's phrasing.

B: Okay, so train on the pairs. What's the problem?

A: The problem is "A is better than B" isn't a target. There's no right answer to copy. Normal fine-tuning says "make this exact text more likely". A comparison doesn't give you an exact text. You need some way to turn a pile of comparisons into an update. And for about five years the answer to that was painful.

<!-- section: Backflips and chess -->

A: [warm] It starts in twenty seventeen with Paul Christiano and colleagues teaching a simulated robot to do a backflip. Without ever writing down what a backflip is. People watched pairs of short clips and clicked whichever one looked more like a backflip. A small network learned to predict those clicks, and then that network became the reward for training the robot. And it took around nine hundred clicks.

B: That's not many.

A: Not many at all. And that recipe moved over to language. And the striking result was InstructGPT. A small model trained this way was preferred by people over the giant model it was built from. That pipeline got the name RLHF, reinforcement learning from human feedback, and it's a big part of why chatbots started feeling like assistants.

B: And the "learn to predict the clicks" part, how does that work? You're turning comparisons into a score.

A: That part's old. Nineteen fifty-two, a method built for ranking chess players and sports teams, called Bradley-Terry. Imagine every answer has a hidden quality score. When someone compares two, they don't always pick the higher one, people are noisy. But the bigger the gap in score, the more likely they pick the better one. And the key bit is, only the gap matters. Add the same amount to every score and nothing changes.

B: [working it out] Wait. That's just my ranker. Train it so the better document scores above the worse one.

A: It's literally the same loss. A cross-encoder trained on better-doc, worse-doc pairs is one of these preference scorers with a different name. Hold onto "only the gap matters", because that's the whole trick later.

<!-- section: Why the old way was heavy -->

A: So the classic recipe has three stages. First, ordinary fine-tuning on some good examples, so the model answers like an assistant. Second, train a separate model to predict which answers people prefer, the reward model. Third, the reinforcement learning part. Let the model write answers, score them with the reward model, nudge it toward the higher-scoring ones.

B: And that last part's where it gets hard.

A: That's where it gets hard. And there's an important detail in it. You don't just say "maximise the score". You say "maximise the score, but pay a price for drifting away from the model you started with". A leash.

B: Why the leash? If the score's good, chase it.

A: Because the reward model is just a learned guess, trained on a limited pile of comparisons. Push hard against it and the model finds its blind spots. Answers the scorer loves that are actually garbage. That's reward hacking. Staying close to a model that already writes sensible text limits how much of that it can do.

B: Okay. And the heaviness?

A: Count what's in memory during that third stage. The model you're training. A frozen copy of where it started, for the leash. The frozen reward model. And a fourth one, also being trained, that tries to work out which words in the answer deserved the credit. Four models at once. Plus it has to keep generating fresh answers every step, which is the slow part. And then there's a dozen knobs, and when you set them wrong nothing errors out. You just slowly get a model that writes repetitive nonsense the reward model adores.

B: [amused] And lots of labs couldn't get it to work.

A: Lots couldn't. And then in twenty twenty-three, a group at Stanford published a paper with a great title. "Direct Preference Optimization: Your Language Model is Secretly a Reward Model."

<!-- section: The trick -->

A: So here's the idea, and I'll do it in words. Forget neural networks for a second. Ask a pure math question. Out of every possible model, which one does best on "high score, but pay for drifting"? And it turns out that has an exact answer. Take the starting model's probabilities, and tilt them toward the high-scoring answers. Good answers get boosted, bad ones shrunk, then you rescale so it all adds up again.

B: That sounds like you're done. Just compute that.

A: You'd think. But the rescaling means summing over every possible piece of text anyone could ever write. You can't compute that. So the formula was known, and nobody could use it. That's why people did RL instead.

B: Okay.

A: So here's the move. Turn the formula around. Instead of "here's the best model, given the scores", solve it for the score, given the model. And what you get is this. An answer's score is just how much more the tuned model likes that answer than the starting model did. Plus some constant that depends only on the prompt.

B: [slowly] So the model's own probabilities, compared to where it started, are the score.

A: That's the "secretly a reward model" part. You don't need a separate scorer. And the constant, the bit you can't compute? Remember, only the gap matters. Both answers in a pair are answers to the same prompt, so they get the same constant. Take the difference, and it cancels. Gone.

B: Oh, that's nice. So what's left is just... comparing four probabilities.

A: How likely the model in training finds the chosen answer and the rejected answer, and how likely the frozen starting model found each. Things you can compute with an ordinary forward pass. Then it's the exact same "better should score above worse" loss as your ranker. No reward model, no generating answers in the loop, no fourth model working out credit. Just the model you're training and a frozen copy. That's DPO.

<!-- section: What the loss actually pushes -->

B: So what does it actually do to the model, step by step?

A: Push the chosen answer up, push the rejected one down, by equal amounts. And how hard it pushes depends on how wrong the model currently is about that pair. Pairs it already gets right by a mile barely get touched. Pairs it gets wrong get shoved hardest.

B: And the leash, where's that in this version?

A: There's one dial, called beta. Think of it as how tight the leash is. With a loose leash, the model has to move a long way from where it started before the loss is happy, so it changes a lot, and it can drift into weird text. With a tight leash, a small change already looks like a confident win, the push dies off fast, and the model barely moves. And one thing to notice. The loss never actually reaches zero. It always wants a bigger gap. So you train briefly, at a small learning rate, or it just keeps going.

B: [confident] Okay, and the result is the chosen answers get more likely. Which is the point.

A: That's what I assumed too. So I tried it on a tiny toy model on my laptop. Pairs of short made-up sequences where the chosen and rejected versions are identical except the very last token. Trained a little starting model that had no preference, then ran DPO on it. And the dashboard looked perfect. Accuracy went to a hundred percent fast. Loss falling exactly as designed.

B: But.

A: But the chosen answer's probability crashed. It started out close to even odds, and within a few dozen steps it was practically impossible. The rejected one crashed even harder. So the model did prefer the chosen answer. Only in the sense that it found the rejected one even more absurd.

B: [skeptical] Wait, how is that a win for the loss?

A: Because the loss only looks at the gap. "Chosen up a little, rejected the same" and "both way down, rejected further" look identical to it. And the probability went somewhere. To answers that are in neither column. Sometimes that's harmless. Sometimes that somewhere else is worse than both.

B: So how do you stop it?

A: In the toy, I added a little bit of plain imitation back in. A small term that also says "and make the chosen answer more likely, full stop". And then the chosen answer went up, toward nearly certain, and the rejected one still fell, and accuracy stayed perfect. It anchors the actual level, which DPO on its own never looks at. The catch is you're partly back to copying the chosen text, which is what you were trying to get away from. So you keep it small.

B: Anything else bite you?

A: One small, sneaky one. Dropout. At the very first step, the model you're training and the frozen copy should be identical, so every pair should be a perfect tie. With dropout on, they're not identical, because one has random bits switched off. So the very first numbers were already noise. The library people use turns dropout off for exactly that reason.

<!-- section: Longer is cheaper -->

A: And then there's the one you'll definitely hit on real data. Length. In a lot of preference datasets, the chosen answer is longer on average. Because people, and models doing the rating, like thorough answers.

B: So the model learns "longer wins".

A: DPO learns the cheapest thing that separates chosen from rejected. And "longer" is very cheap. So after training, answers usually get longer. And then if you check with an AI judge that also likes long answers, it reports a big win, and part of that win is just more words.

B: So how do you tell?

A: Make it fair. Cut both models' answers down to the same length and judge again. Whatever win survives is the part that isn't just length. And judge each pair twice with the order swapped, because judges have a favourite position too.

<!-- section: Offline and online -->

B: So is DPO just strictly better than the RL way?

A: It's much simpler and much cheaper. But there's a trade. DPO learns from a fixed pile of pairs, usually written by other models and labelled once. And it only keeps the model close to where it started on those pairs. Away from that data, nothing's watching. The RL way learns from the model's own fresh attempts, as it goes. People sometimes split the difference. Generate new pairs from the current model, label them, run DPO, repeat.

B: And the next step is going fully back to the model's own attempts.

A: That's GRPO. Sample from the model you're training, like the old way, but drop that fourth credit model, and swap the learned scorer for a check you can actually run. Like, did the code pass the tests.

<!-- section: Ending -->

B: Okay, let me say it back. Judging is cheaper than writing, so you collect "this beats that". The old way trained a separate scorer and then ran a heavy RL loop. DPO noticed the model's own probabilities, compared to where it started, already act as a score, and the impossible part cancels because both answers share a prompt. So it's just my ranker's loss on the language model. And as the loss goes down, the chosen answers get more likely.

A: All of that except the last part, and that's the part I'd pin to the top of the dashboard. The loss only watches the gap. Your chosen answers can get less likely while accuracy looks perfect. So you watch the actual probability of the chosen answers, you watch length, and you read what it writes.
