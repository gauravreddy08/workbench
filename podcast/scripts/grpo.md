<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you've got a checker. You give it one of those Countdown puzzles, use three, seven and four exactly once to make forty, and you give it a model's answer. And it says one or zero. It's instant, it never gets tired, and you can't argue with it. Three plus seven, times four, is forty or it isn't.

B: Okay.

A: And you've got a small model, Qwen, half a billion parameters, that solves some of these and fumbles the rest. And you want it to get better. So you reach for what you know. Fine-tuning needs worked solutions to copy, and you don't have any. And for coding tasks there isn't even a solver you could write to make them. DPO needs pairs, "this one beats that one". Closer, but you'd be throwing away most of what you sample, and training on answers from an older version of the model.

B: So what do you actually have?

A: Something simpler and stranger. A model that can try. And a checker that can grade. That's it. No right answer to copy. Just "that attempt scored one, that one scored zero".

B: [skeptical] But then I don't see how you even get a gradient. Normal training needs to know the right next token. And the checker's a Python function, you can't backpropagate through it.

A: That's the exact problem. Turning a verdict into a gradient. And the answer turns out to be almost embarrassingly simple.

<!-- section: Fine-tuning on your own attempts -->

A: So picture it. You ask the model one puzzle, you sample four answers, two of them pass. What should change?

B: The two that passed should get more likely. The two that failed, less likely.

A: Right. And here's the thing. The model wrote each answer itself, word by word, so it knows exactly how likely it found each one. And "make this answer more likely" is something you know how to do. It's just a normal training step on that answer. So you do that for every sample, weighted by how well it scored.

B: Huh. So it's fine-tuning on its own answers.

A: Fine-tuning on your own samples, weighted by how good they were. And the weight can be negative. That's the whole idea. And the surprising part is it's not a rule of thumb. It's an exact estimate of which way to move to raise the average score. You never differentiate through the checker, or through the act of sampling. You only differentiate the model's own probabilities, which you get for free. It's called a policy gradient, and the simplest version of it, REINFORCE, is from nineteen ninety-two.

B: [working it out] Okay, so if passing scores one and failing scores zero, the ones that passed get pushed up and the failures get nothing.

A: That's the plain version. And it works, sort of. But here's where it gets noisy. Say instead the checker gave six for correct and five for wrong.

B: Same information. Correct is still better by one.

A: Same information. But now every answer has a big positive weight. Every single sample says "make me more likely". On average it still comes out right, because things cancel over lots of samples. But any one batch is a tug of war between huge forces with a tiny difference between them.

B: So you subtract something.

A: You subtract what you expected to score. Then answers better than expected go up, worse ones go down, and one that's exactly as good as expected isn't touched. That leftover, score minus expected, is called the advantage. And it changes nothing about what you're aiming at, only how noisy it is. I ran a little toy of exactly that in numpy, six-for-right and five-for-wrong. Same average direction both ways. And the noise dropped by a couple of hundred times.

B: That's a lot for one subtraction.

A: It's most of the game. Honestly, almost every algorithm after this is just a cleverer way to guess "what you expected".

<!-- section: Dropping the critic -->

A: [warm] And that's where the history comes in. The standard method before was PPO, which came from robotics and games. And PPO guesses "what you expected" with a whole second network. A critic. At every word, it predicts how well this answer's going to turn out.

B: Same size as the model?

A: Often about the same size. So for a big model, that's another big model to train and keep in memory. And it's really hard to train well when the only reward shows up at the very end of a long answer. Imagine trying to predict, halfway through a sentence, whether the final number's going to be forty.

B: Yeah, that sounds miserable.

A: So in early twenty twenty-four, a DeepSeek team training a math model did something blunt. Throw out the critic. Instead, ask the same question several times, and grade each answer against the group's average. Like grading on a curve. That's Group Relative Policy Optimization. GRPO.

B: And the group average is your "what you expected".

A: Made fresh, for this exact question, from the model as it is right now. No second network. And then about a year later, DeepSeek R one showed what happens when you run that with plain rule-based rewards. Is the final answer right, and is it in the right format. Applied straight to their big base model, with no examples to copy, the answers got steadily longer over training, and it started doing things like re-checking its work and trying another approach. Nobody wrote examples of that. The reward just made it pay.

B: [confident] So it discovered reasoning from scratch. Which means if I run this on my small model, it'll pick up new tricks too.

A: That's the bit I'd be careful with. And it's worth being precise. R one wasn't the first reasoning model. OpenAI's had come out a few months earlier, without a published method. What R one did was publish a recipe simple enough that everybody could try it. And the thing to take from it at your scale is narrower than "discovers reasoning". Let me show you why.

<!-- section: Grading on a curve -->

A: So, grading on a curve. Say a model gets a puzzle right once out of sixteen tries. That one success is way above the group average, so it gets a big push. And each failure is only a bit below average, so each gets a small push down.

B: So the rarer the success, the harder it gets reinforced.

A: Which is exactly what you want when the model's just stumbled onto something. But now ask, what if all the attempts pass?

B: Then they're all average. Zero advantage. Nothing moves.

A: And if they all fail, same thing. You paid to generate every one of those answers, and you got nothing. People call those dead groups. And this is where it bit me. I ran a toy version, a bunch of made-up prompts, some easy, some medium, some really hard, where the right answer starts out very unlikely. And the curve went up nicely, and then just flattened.

B: Flattened why?

A: The medium ones got solved, and once they were always solved, they went dead too. All pass, nothing to learn. And the hard ones? The model basically never sampled the right answer. So no group ever had a success in it. So nothing ever pushed it up. They finished about as stuck as they started.

B: [slowly] Oh. So it can only make more likely things it already does sometimes.

A: That's it. It sharpens. It doesn't invent. A half-billion parameter model will get better at Countdown. It won't discover algebra. And when your reward curve flattens while the share of dead groups climbs, that's not the model being finished. It's the data running out of things it can learn from.

B: So you'd want more tries per question for the hard ones.

A: More tries means more chances to stumble on one success, and that one success gets a big push. Or add easier questions, or throw out the dead groups and sample new ones. Same thing as picking tasks in the middle for an environment.

<!-- section: The leash, and why code -->

B: Is there anything stopping it from drifting off into weird text, if weird text happens to pass?

A: A leash, same idea as DPO. A frozen copy of the starting model, and a penalty for drifting too far from it. Some recent recipes drop the leash entirely for these verifiable tasks, so check what your library does rather than assuming. And there's also PPO's old safety rail, a cap on how much any one word's probability can move in one go. Funny thing about that cap, though. If you only do one update per batch of samples, it never kicks in. The model you're updating is exactly the one that wrote the samples. So a bug in that code is completely invisible until you start reusing samples.

B: Okay. And why did this suddenly work now? RL on language models wasn't new.

A: What changed was the reward. The older way used a learned reward model, a neural network trained on people's judgments. And push hard against that and the model finds its blind spots. Longer answers, confident tone, flattery. That sets a ceiling on how long you can train. A checker that's code is different. Is the answer forty? Do the hidden tests pass? It's cheap, it's exact, and it's much harder to fool. So you can keep training against it and it keeps meaning what you meant. That's RL with verifiable rewards.

B: "Much harder to fool", not impossible.

A: Not impossible. Make the checker sloppy, say, give full marks if the target number shows up anywhere in the answer, and the model learns to write the target number and stop. Reward shoots up, real accuracy doesn't move. And there's a subtler version with noise. Take a group where everything failed, so it should be dead, and add a little random noise to the scores. Now they're not all equal anymore, so it looks like there's signal. And because GRPO scales each group to the same size, a tiny bit of noise gets blown up to a full-size push. You're training hard on coin flips. That's why the reward has to be exact.

<!-- section: What you watch -->

B: So how do you know a run's healthy? Watch the loss?

A: [laughs] That's the weird part. The loss is basically meaningless here. It hovers around zero however well training's going, because the advantages are centred on the group. So you watch a little panel instead. The score on a fixed set of held-out puzzles, answered without randomness, because that's the only one that tells you about real skill. The share of dead groups, your "is there anything left to learn" gauge. Answer length, and how many are getting cut off at the limit, because a cut-off answer never gets to the final line and scores zero. How far it's drifted from the starting model. And entropy.

B: Entropy meaning how spread out its choices are.

A: How unsure it is about the next word. It should drift down slowly as the model gets confident. If it falls off a cliff, every sample in a group comes out identical. Then every group's dead, and learning just stops. That's collapse.

B: And the actual writing?

A: Read it. That's the real measurement. You save samples along the way and look. You'd expect early answers that ignore the format, then answers that reliably follow it, and then, if you're lucky, answers that try a combination, check it, and try again.

<!-- section: Where the time goes -->

A: And then the part that ties back to everything you've done on the Spark. One training step has four bits. Write all the attempts. Score them. Run the frozen starting model over them. And then the actual training update.

B: [working it out] My gut says the training update's the expensive one. That's the backward pass.

A: That's the natural guess, and it's backwards. The training pass looks at every token at once, in parallel. Busy chip, efficient. Writing the attempts is one token at a time. And you know from the seventeen tokens a second story, that means hauling the whole model across memory for every token. Plus the answers finish at different lengths, so the whole batch waits for the longest one.

B: So generation eats the step.

A: I'd expect it to be well over half, probably most of it, with a plain generate loop. That's the thing to time first when you run it on the Spark. And that's why every serious RL setup has a real inference engine bolted inside it. Batching, the KV cache, all of it. And here's a nice one. Every attempt in a group starts with the exact same prompt. So prefix caching is basically a gift. Fast inference is fast training.

<!-- section: Ending -->

B: Okay, let me try. The model tries a question several times, a checker scores each try, and you make the good tries more likely and the bad ones less likely, but compared to the group's average, which takes out most of the noise and means you don't need a second critic model. Because the checker's code, it's hard to fool, so you can train for a long time. And over enough training, it learns to solve the hard problems too.

A: Everything up to the last line. It only learns from groups that have a mix of passes and fails. If it never gets a hard problem right, not even once, there's nothing to push on, and that problem stays unsolved. So it makes the model reliably do what it could already sometimes do. Which is a lot. It's just not the same as teaching it something it's never done.
