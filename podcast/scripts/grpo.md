<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you've got a checker. A little piece of Python. You give it a Countdown puzzle, like, use three, seven and four, each exactly once, and make forty. And you give it a model's answer. And it says one, or it says zero. That's it. It's fast, it never gets tired, and you can't argue with it. Three plus seven, times four, is forty or it isn't.

B: Okay.

A: And you've also got a small model. Qwen two point five, the half-a-billion-parameter instruct version. It solves some of these puzzles and it fumbles the rest. And you want it to get better at them. So, what do you reach for?

B: [casual] I mean, fine-tuning. Just, like, normal supervised fine-tuning. Show it a bunch of solved puzzles and train on those.

A: Right, and that's the first thing everyone reaches for. But supervised fine-tuning needs worked solutions to copy, and you don't have any. You could write a solver and generate solutions... but then what the model learns is to imitate your solver's style. Not to search. Not to try things. And for the thing you actually care about, which is your coding tasks, there's no solver to write in the first place.

B: Okay, then DPO? I've done DPO. You give it pairs, this answer is better than that one.

A: That's closer. Actually a lot closer. Quick reminder of what DPO is: you have pairs of answers to the same prompt, one marked better, one worse, and you nudge the model toward the better one and away from the worse one, measured against a frozen copy of where it started. So you could do that here. Sample two answers, check both, and keep the pairs where one passed and one failed. But that throws away most of your samples, every pair where both passed or both failed. And it still trains offline. On answers that came from an older version of the model, not the one you've got now.

B: Hm. So what do I actually have, then?

A: [slowing down] Something simpler, and a bit stranger. You have a model that can try. And a checker that can grade. That's it. No target tokens. No labelled pairs. Just "that attempt scored one, that one scored zero." And think about what cross-entropy loss needs. It needs to know the right next token, at every position. Here there is no right next token. There's only a verdict, at the very end.

B: [working it out] So the problem is... I have a grade, and I need a gradient.

A: That's the whole problem. Turning a verdict into a gradient. And the answer has a name, policy gradient. The trick that makes it practical at the scale of a language model is called G R P O. And the reason it suddenly works, like, in twenty twenty-five, is that the checker is code.

<!-- section: Origin -->

A: So the history here is actually the why. Reinforcement learning on language models started with R L H F. Reinforcement learning from human feedback. You train a reward model on human preferences, people saying "this answer's better than that one", and then you optimise the language model against that reward model, using an algorithm called P P O. That's OpenAI's InstructGPT, in twenty twenty-two.

B: And P P O is the robotics thing.

A: Yeah, it came from robotics and games. And it brought a second network along with it. A critic. Its job is to guess, at every single token, how well the answer is going to turn out in the end. So if your policy, your language model, is seven billion parameters, the critic is usually another seven billion parameter network. That you have to train. And hold in memory, next to the first one.

B: [skeptical] And train well, which... how do you even train that? The reward only shows up at the end.

A: [amused] Right, that's exactly the hard part. You're asking a network to look at token forty of a five-hundred-token answer and predict whether the final answer will be correct. That's a hard thing to learn. So, February twenty twenty-four. A DeepSeek team is training a math model, the paper's called DeepSeekMath, first author Zhihong Shao. And they replace the critic with something really blunt. For each question, sample a group of answers. Grade each one. And compare each answer to the group's average. That's it. They called it Group Relative Policy Optimization. G R P O.

B: Grading on a curve.

A: Grading on a curve, literally. Then, January twenty twenty-five, DeepSeek R one. They showed that G R P O plus simple rule-based rewards, is the final answer right, is the format right, applied straight to a base model, with no supervised warm-up at all, made the model learn to write long chains of reasoning. On its own. That variant was called R one Zero. And according to the paper, on the AIME twenty twenty-four math competition, it went from fifteen point six percent to seventy-one percent pass at one.

B: Pass at one meaning... one try per problem?

A: One try per problem, yeah. The fraction of problems it solves when it gets one attempt. In practice they average that over several sampled attempts so it isn't just luck. And within months, labs and hobbyists were reproducing the effect on small models, on toy tasks, a lot of them on a single machine. Which is why you can do this on the Spark.

<!-- section: The Idea: The setup in RL words -->

A: Okay, quick vocabulary, because RL has its own words for things you already know. You've seen these when we built the RL environment, the sandbox with a reset and a step and hidden tests that hand back a reward. For a language model, the policy is just the model itself. Whatever decides what to do next. Given the text so far, it gives a probability for every possible next token.

B: [a bit unsure] Wait, it gives a probability? I'd have said it gives a token. Like, the model outputs the next token.

A: [carefully] So that's the thing worth getting exactly right, because the whole algorithm hangs on it. The model never outputs a token. It outputs a list of numbers, one per word in its vocabulary, about a hundred fifty thousand of them for Qwen, and they add up to one. That's a probability distribution. "Forty" gets maybe thirty percent, "thirty-nine" gets two percent, and so on. Then a separate step, sampling, rolls a die weighted by those numbers and picks one. So when people say "the model's output distribution", that list is what they mean. And because the model hands you that list, it can always tell you exactly how likely it was to write any particular token. Hold onto that. It's the whole trick.

B: Okay. So the model's a distribution, and sampling's the dice roll.

A: Right. And the rest of the words. The prompt is the situation. Each token the model writes is an action, one choice. A whole completion is a sequence of actions. And when it's done, the verifier hands back a reward. Here, usually one for correct and zero for wrong, given once, at the very end. And the goal is to change the weights so the average reward goes up. Not the reward of one answer. The expected reward, averaged over prompts, and over all the randomness of sampling. That average is the thing we're going to take a gradient of.

A: And here's the loop, drawn like a diagram. On the left, a prompt, the puzzle. It goes into the policy, the model. Out of the policy fan, say, eight answers to that same prompt. One says three plus seven, times four. One says three times seven plus four. One just says forty. All eight go into a box labelled verifier, and the box is just code. Out come rewards, one, zero, one, zero. Those rewards get turned into something called advantages, how each answer did relative to the group, and that loops back around into a gradient step on the policy. And floating above the policy there's a dashed box, a frozen copy of the model from before training started, tied to the policy with a leash. We'll get to the leash.

<!-- section: The Idea: Policy gradient from scratch -->

A: So here's the scene. You ask the model one puzzle. You sample four answers. Two of them pass. What should change?

B: The two that passed should get more likely. The two that failed, less likely.

A: Obviously, right? And here's the thing. The model wrote each of those answers token by token, and remember, it knows exactly how probable each token was. So it knows how probable each whole answer was. You take the log of each token's probability and add them up across the answer. That's the log-probability of the completion. And you get it from the same forward pass you'd use for cross-entropy. Nothing new. [building up] So "make this answer more likely" has a direct, concrete meaning. Take a gradient step that increases its log-probability. Do that for every sampled answer, weighted by how good it was. That's... honestly, that's the entire idea. The gradient is roughly the average, over your samples, of how good the answer was times the direction that makes that answer more likely.

B: [skeptical] That sounds like a heuristic, though. Like a reasonable hack.

A: That's the surprising part. It isn't one. This is called REINFORCE, from a paper by Ronald Williams in nineteen ninety-two, and it's an exact, unbiased estimate of the gradient of the expected reward. Unbiased meaning if you averaged it over infinitely many samples you'd get the true gradient, exactly. The one-line reason is a calculus identity. The gradient of a probability equals the probability itself times the gradient of its log. So when you take the gradient of an average over samples, that probability factor turns back into "sample from the model", and what's left inside is reward times the gradient of the log-probability.

B: Wait, but hold on. The reward comes out of a Python function. How do you get a gradient through that? Do you, like, backprop through the checker?

A: [jumping in] No, and that's the beauty of it. You never differentiate the checker. You can't, it's a Python function that returns a one or a zero. And you can't differentiate through the act of sampling either, the dice roll. But you don't need to. The reward just sits there as a plain number, a weight. The only thing you differentiate is the log-probabilities, and the model gives you those for free.

B: Huh. So the reward's never inside the graph. It's just a multiplier.

A: Just a multiplier. And now look at it from where you already are. You've written cross-entropy training. Supervised fine-tuning on one answer is "increase the log-prob of this answer." Policy gradient is the exact same thing, with a weight in front. And the weight can be negative. So, this is the sentence I'd keep: policy gradient is supervised fine-tuning on your own samples, weighted by how good they were.

B: [working it out] And negative weight means... push that answer down.

A: Push it down. And in code it's a one-line loss. Minus the average of weight times the answer's log-prob. The minus sign is only there because optimisers minimise, and we want that thing to go up.

<!-- section: The Idea: The noise problem, and baselines -->

A: But plain REINFORCE, where the weight is just the raw reward, hurts. And here's why. Say every reward got shifted up. The checker gives six for correct and five for wrong. Has the best direction changed?

B: No. Correct is still better than wrong by one.

A: Right. Better by exactly one. But now every answer has a big positive weight. So every single sample says "make me more likely." The wrong ones too. And the gradient still comes out right on average, because over many samples, the pushes on the wrong answers cancel against everyone else's pushes. But any single batch is a tug of war between huge forces, where all you care about is the small difference between them.

A: So here's a toy, and I want you to guess before I tell you. Four possible answers. The model picks among them uniformly, a quarter each. Answer zero is the correct one. Rewards are six for correct, five for wrong. You estimate the gradient from single samples, two ways. Once with the weight equal to the reward. And once with the weight equal to reward minus the average reward, which here is five and a quarter. Both estimates have the same average. How much bigger is the variance, the jumpiness, without the subtraction? Twice? Ten times? A hundred?

B: Hm. I'll say... ten?

A: When I ran this in numpy, two hundred thousand samples on my Mac, the mean gradient came out the same both ways, within noise. About plus zero point one nine on the right answer, about minus zero point zero six on each wrong one. But the total variance was twenty point eight without the subtraction, and zero point zero nine four with it.

B: [surprised] That's, what...

A: [letting it land] About two hundred twenty times. The subtraction changes nothing about what you're estimating, and almost everything about how many samples you need to estimate it.

B: Okay, so that's a big deal.

A: It's the big deal. That thing you subtract is called a baseline. Weight equals reward minus what you expected to get. Answers better than expected get pushed up. Worse than expected, pushed down. And an answer that's exactly as good as expected doesn't get pushed at all. And the rule for what counts as a legal baseline is: anything that doesn't depend on which answer was sampled. If it doesn't depend on the sample, subtracting it leaves the gradient unbiased. A good one is "the reward you expected." And the difference, reward minus baseline, has a name. The advantage. How much better this answer was than expected. Positive means do more of this. Negative means do less.

A: Picture it as two panels of arrows. On the left, four answers, raw rewards. Four arrows all pointing up, a slightly taller one for the correct answer at six, three nearly-as-tall ones at five. The useful information is that little difference in height. On the right, same four answers, but subtract the mean. Now one arrow points up, the correct one, at plus three quarters. And three small arrows point down, each at minus a quarter. Same average gradient. Two hundred twenty times less noise.

B: And noise here means what, concretely? Like, for my training run.

A: [earnest] Variance of the gradient estimate is how much it jumps around from batch to batch. A high-variance gradient points the right way only on average. Each individual step is mostly noise, so you need a tiny learning rate and a huge number of steps. And honestly, variance is the enemy in RL. Every algorithm from here on is, mostly, a cleverer way to get a good baseline.

<!-- section: The Idea: PPO in one paragraph -->

A: So, P P O, quickly, because G R P O is built out of it. Schulman and colleagues, twenty seventeen. It makes two moves. The first is a learned baseline. A value model, also called the critic. It's a second network, often the same size as the policy, and it's trained to predict, from any partial answer, the reward it's eventually going to get. So at every token, the advantage is "how much better did things go than the critic expected, at this point." And the method for turning the critic's predictions into a per-token advantage is called G A E, generalized advantage estimation. All you need to know about it is it blends the critic's guesses at neighbouring tokens, trading a little bias for a lot less variance.

B: And the second move?

A: The second move is a safety rail. The samples are generated by the policy as it was at the start of the step. But then you take several gradient steps on that same batch. So the policy you're updating drifts away from the one that actually produced the data. P P O measures that drift per token, as a ratio. The new policy's probability for that token, divided by the old policy's probability. One means unchanged. One point two means the token got twenty percent more likely. And then it clips it. Once a token's probability has moved more than about twenty percent in the direction the advantage wants, its gradient just switches off. Picture two little graphs. On the left, a good token, positive advantage. Across the bottom is the ratio, centred on one. The objective rises as the ratio goes up, as you make the token more likely... and then at one point two, the line goes flat. Flat means no gradient. You've had your twenty percent, stop pushing. There's a dashed line that keeps climbing, that's what it'd do without the clip. On the right, a bad token, negative advantage. Same thing mirrored. Pushing it down helps, until the ratio drops below zero point eight, and then it's flat.

B: [working it out] So it's a speed limit per token.

A: A speed limit per token, per update. The formula takes the smaller of two things. The ratio times the advantage, and the clipped ratio times the advantage, with the clip range about point two. Taking the smaller one makes it pessimistic. You get credit for improving a token only up to the clip, and you never get rewarded for going past it. And there's a subtle bit. If the policy moved a token the wrong way, say a good token actually got less likely, the gradient is still on, pulling it back. The clip only stops you overshooting in the direction you wanted.

A: And for language models, P P O means holding four models at once. The policy and the value model, both being trained. Plus a reward model and a frozen reference copy, both just used for scoring.

B: [amused] Four models. On my one Spark.

A: Yeah, that's the problem in one sentence. Okay, guess this one. You generate a batch of samples, then you do exactly one gradient step on them, and then you throw them away and generate fresh ones. During that one step, what does the clip do?

B: It... stops the step from being too big? That's its job.

A: [amused] It does nothing. Literally nothing. Think about the ratio. The policy that generated the samples is the policy you're differentiating. They're the same weights. So every ratio is exactly one, nowhere near zero point eight or one point two. And at a ratio of one, the clipped objective's gradient is just advantage times the gradient of the log-prob. That's plain REINFORCE with a baseline. The clip only starts to matter when you reuse the same samples for several updates. T R L calls that num iterations, the G R P O paper calls it mu. Or when the thing that samples and the thing that trains disagree slightly about probabilities, which happens when you generate with a separate inference engine.

B: So if I write it with one update per batch and my clipping code is broken...

A: You'll never know. A bug in your clip is invisible. Worth remembering when you write it.

<!-- section: The Idea: GRPO, grade on a curve -->

A: So, G R P O. The value model is the expensive, fragile part. It's a whole second language model, and it has to learn to predict a zero-or-one that only arrives hundreds of tokens later. And G R P O asks: what if the baseline came from just... asking again?

B: Asking again meaning sampling more answers.

A: Yeah. For each prompt, sample a group of G answers. G is just the group size, typically somewhere from four to sixty-four. They're sampled independently, from the current model, all for the same prompt. Score each one with the verifier. Then each answer's advantage is: its reward, minus the group's average reward, divided by the group's standard deviation. How it did compared with its siblings.

B: That's it?

A: [emphatic] That's it. The group mean is the baseline. It's an estimate of "what does this model usually get on this prompt", made fresh, for this exact prompt, from the model as it is right now. No second network. No training it. No guessing per token. And every token of an answer gets the same advantage. The whole answer is good or bad together.

A: Dividing by the standard deviation is a separate choice, and honestly a debated one, we'll come back to it. What it does is put every prompt's advantages on the same scale. So an easy prompt where seven out of eight pass, and a hard one where one out of eight pass, both produce pushes of about the same total size.

A: And with zero-or-one rewards, the numbers come out really clean. Take the hard case. You sample sixteen answers, and exactly one passes. The mean reward is one sixteenth. The one success gets an advantage of about plus three point eight seven. Each of the fifteen failures gets about minus zero point two six.

B: [skeptical] Wait, so the one lucky answer gets a push fifteen times bigger than each failure?

A: About fifteen times bigger, yeah. And the general rule falls out of the arithmetic. If a fraction p of the group passes, a correct answer gets the square root of failures-over-successes, and a wrong one gets minus the square root of successes-over-failures. Fifteen failures to one success, square root of fifteen, that's the three point eight seven. So the rarer a success, the harder G R P O reinforces it. Which is exactly what you want when the model has just stumbled onto something new.

A: Now picture a little interactive panel for one step. At the top, one prompt, say seventeen times twenty-four, and the checker wants four hundred eight. Below it, a row for each of the G answers, with its reward, and a horizontal bar for its advantage. Bars going right get pushed up, bars going left get pushed down. There are three sliders: G, the pass rate, and reward noise. And a toggle for dividing by the standard deviation. And underneath, a grid of twenty-four prompts, all at the same pass rate, and any group where every answer got the same reward is greyed out.

B: And what do you see when you play with it?

A: Three things. First, the greyed-out groups. Zero-spread groups are dead weight. If all G answers pass, every advantage is zero. If all G fail, every advantage is zero. No gradient flows from that prompt at all. But you still paid to generate all those answers. And the chance a group is dead is easy to work out: the chance they all pass plus the chance they all fail. So say the model solves a hard prompt five percent of the time, and G is eight. The chance all eight fail is point nine five, multiplied by itself eight times, which is about two thirds. I checked that formula against two hundred thousand simulated groups per setting, and it matched to three decimals. So at five percent and G of eight, sixty-six percent of your groups are dead. Push G to sixteen and it's forty-four percent.

B: So most of the batch is just... wasted generation.

A: On hard prompts, yeah. Which is the second thing. Bigger G rescues hard prompts. More samples, more chances to stumble onto one success, and that success gets a big push. You can watch it on the slider: pass rate at point zero five, G at four, almost everything's grey. Slide G to sixteen and groups light up.

A: [more serious] And the third thing is the scary one. Noise fakes a signal. Take an all-wrong group, where every reward is zero, and add a tiny bit of noise to the rewards.

B: [casual] I mean, a little noise can't hurt much. It's tiny.

A: That's what you'd think. But the standard deviation isn't zero anymore. So the bars light up. And with the division turned on, you're dividing a tiny noise by a tiny standard deviation, and it comes out full size. The model is now being trained, hard, on coin flips. It's reinforcing whichever wrong answer got a lucky draw. And that's why the reward has to be verifiable. Exact, deterministic. Not a judge's mood.

A: One more guess. A toy G R P O run. Sixty-four prompts, each with eight possible answers and one right one. Sixteen prompts are easy, the model already favours the right answer. Sixteen are hard, the right answer starts at well under one percent probability. The rest are in between. G of eight, a plain table of probabilities as the policy, sixty steps. What happens to the fraction of dead groups, and what happens to the hard prompts?

B: [working it out] Dead groups... go down? Because it's learning, so more variety? And the hard ones get solved, just slower.

A: [working through the numbers] When I ran this in numpy, expected accuracy went from point two eight, to point four nine at step ten, point six eight at step thirty, point seven three at step sixty, and flattened. And the dead groups went the other way. Thirty-five out of sixty-four at the start, fifty-nine out of sixty-four by step forty.

B: Up? Why up?

A: [patiently] Because the medium prompts got solved, ninety-six percent, and joined the easy ones at ninety-nine percent. And a prompt the model gets right every time is an all-pass group. Dead, just from the other side. And the hard prompts finished at zero point three percent. The model essentially never sampled the right answer, so no group ever had any spread, so nothing ever pushed it up.

B: Huh. So it can't learn something it never tries.

A: That's the takeaway. G R P O can only sharpen behaviour the model already sometimes produces. And it tells you how to read a real run. If the reward curve flattens while the fraction of dead groups climbs toward one, the dataset ran out of learnable prompts. It doesn't mean the model is done.

<!-- section: The Idea: The full GRPO loss -->

A: So put the pieces together into the actual loss. For each prompt, you sample G answers from the old policy, meaning the weights at the start of this step. Compute each answer's group advantage. Then, for every token, you take P P O's clipped term, the ratio, the clip, the advantage. Minus a penalty for drifting from the reference. Average that over the tokens within each answer, then average over the answers, and minimise minus that.

B: Okay, say that as ideas, not as a formula.

A: Three ideas. One: it's P P O's clipped policy gradient, with the group advantage dropped in where the critic used to be. Two: you divide by each answer's length, so it's an average over the tokens within each answer. That's another debated choice, we'll break it later. And three: a leash.

B: The leash on the frozen copy.

A: Right. The leash is a K L divergence to a reference model. K L divergence is just a measure of how different two probability distributions are. Zero when they're identical, bigger as they drift apart. And the reference model is a frozen copy of the model from before RL started. It never trains. It only ever answers one question: how likely would the original model have found this token? So the penalty is, how far have this token's probabilities moved from where the original model had them.

B: And why do you want that? If it scores well, it scores well.

A: Because without it, the policy is free to wander anywhere that scores well. Including into degenerate text that happens to pass the verifier. Weird repeated phrasing, junk, whatever. The leash keeps it close to a model that still writes like a model. And there's a knob, beta, for how short the leash is. DeepSeekMath used zero point zero four.

A: The K L formula itself looks odd, and here's why it's shaped that way. You only have the probability of the one token that was actually sampled, not the full list over a hundred fifty thousand tokens. So they use an estimator. Take the reference's probability for that token divided by the current model's, call that the ratio. The penalty is the ratio, minus the log of the ratio, minus one. If the two models agree, the ratio is one, the log is zero, and you get one minus zero minus one, zero. Any disagreement either way gives a positive number. So it's never negative, and it only needs the one sampled token. John Schulman has a short note called "Approximating KL Divergence" that explains it.

B: And P P O does the same thing?

A: Slightly differently. G R P O puts the K L in the loss. P P O style R L H F instead subtracts it from the reward. And some recent recipes drop the K L term entirely for verifiable-reward tasks. A system called DAPO does, and recent T R L defaults do too. So check what your library actually does, rather than assuming.

A: And here's what that buys you in memory. Picture two columns. On the left, P P O for R L H F. Four boxes. Policy, trained. Value model, trained, about the same size. Reward model, frozen. Reference, frozen. One sample per prompt, typically, and a per-token advantage from the critic. On the right, G R P O with a verifier. Policy, trained. An empty dashed box where the value model used to be. The verifier, which is a Python function, not a network at all. And the reference, frozen, and optional. So two networks, one trained. But underneath, in bold: G samples per prompt. The price moved. From memory, to generation.

<!-- section: The Idea: Why verifiable rewards changed everything -->

A: So, RL on language models wasn't new in twenty twenty-five. What changed was the reward.

B: The checker being code.

A: Yeah. Think about what a learned reward model is, the R L H F kind. It's a neural network trained on human judgments. And if you optimise against it hard, the policy finds its blind spots. Longer answers. A confident tone. Flattering phrasing. Whatever that reward model happens to over-score. That's reward hacking, same thing we saw when we tried to game our own verifiers: the model finds a way to score high that isn't what you meant. And with a neural reward model, it sets a ceiling on how long and how hard you can train. The DeepSeek R one paper says outright that they avoided neural reward models for their reasoning RL, for exactly that reason.

A: A verifier for a math answer, or a unit-test suite, is different. It's cheap, microseconds to seconds. It's deterministic. And it's much harder to fool. Not impossible, you've gamed one yourself, but much harder. So you can run millions of RL steps against it. And the name the field settled on came from AI two's Tulu three report, late twenty twenty-four. R L V R. Reinforcement learning with verifiable rewards.

B: [skeptical] Okay, but the R one story. "The model learned to reason by itself." That always sounded a bit too magical to me.

A: So let's say it carefully. They started from their large base model, DeepSeek V three Base. They ran G R P O with only rule-based rewards. Was the answer accurate, and a format reward for putting the reasoning inside think tags. And over training, the model's average response length grew steadily. And it started doing things like re-checking its work, and trying a different approach when one failed. Nobody wrote examples of that. The reward just made it pay.

B: [laughs] That's still pretty magical.

A: It's a real result. But R one Zero had problems. Poor readability. It mixed languages mid-answer. So the R one they actually released used a small "cold start" supervised set first, then RL, then more supervised data, then more RL. And it wasn't the first reasoning model. OpenAI's o one came out in September twenty twenty-four, but without a published method. R one was the first to publish a recipe this simple. And the simplicity is why everyone could try it.

A: [firm] And here's what to take from it at your scale. RL with a verifier reinforces strategies the model can already sometimes find. A half-billion-parameter model will get better at Countdown. It will not discover algebra.

<!-- section: The Idea: What you watch -->

A: So, say the run's going. What do you look at?

B: The loss, I'd guess. Watch it go down.

A: [amused] That's what everyone does first, and it's nearly meaningless here. Think about it. With one update per batch, the ratios are all one. And the advantages are centred inside each group, so they average to zero. So the loss hovers around zero no matter how well training's going. It can sit at zero while the model gets dramatically better. So instead, you watch a small panel. Mean reward is the thing you want up. But track it two ways. On the training batches, and on a fixed held-out set of puzzles that you never train on, using greedy decoding, always picking the most likely token. Only the second one tells you about real skill.

A: Then the spread. The reward's standard deviation within groups, and the fraction of groups with zero spread. In your logs you might call it frac zero S T D. That's your "is there anything left to learn" gauge. Near one means the task is too easy or too hard for the model right now.

A: Then response length. The mean number of tokens in a completion, and the fraction that hit the max length and got cut off. Some growth is healthy on reasoning tasks. A curve racing up to the cap is a disease.

A: Then K L to the reference. How far you've wandered. It should rise slowly. A sudden spike means something broke out.

A: Then entropy. Entropy is how spread out the model's next-token distribution is. High means lots of tokens are plausible. Near zero means the model's certain, and every sample comes out the same. It's measured in nats, which is just the natural-log version of bits. It should fall slowly as the model gets more confident. If it crashes to near zero, every answer in a group comes out identical, so the standard deviation is zero, so every group is dead, and learning stops. That's called collapse.

A: And last, if you do more than one update per batch, the clip fraction. What share of tokens had their ratio hit the clip.

A: Picture five little charts side by side, each with a healthy curve and a sick one. Mean reward, healthy goes up and then flattens. Fraction of dead groups, healthy stays roughly level, sick climbs toward one. Length, healthy rises gently, sick runs straight up into the max-length line. K L, healthy is a slow creep, sick bends sharply upward. Entropy, healthy drifts down, sick falls off a cliff to zero. Those are shapes, not measurements, but they're the shapes. Reward rising while the dead-group fraction heads to one means you've run out of learnable prompts. Length hitting the cap with K L spiking is length explosion. Entropy falling off a cliff is collapse.

<!-- section: The Idea: Where the time goes -->

A: Okay, now cost. One G R P O step has four phases. Generate G answers for each prompt in the batch. Score them. Run the reference model forward to get its log-probs. And train, which is a forward and backward pass over prompt plus answer, then an optimiser step.

B: [casual] And training's the expensive one. It's always the backward pass.

A: [gently] That's the intuition from supervised training, and it's backwards here. Scoring is nearly free with a Countdown checker, a few seconds per batch if it's a sandbox running unit tests. Training is one big parallel pass over every token at once. It keeps the GPU's math units busy, it's efficient. Generation is the slow one. Because it writes one token at a time. And remember why that's slow: every decode step, every single new token, has to read every weight of the model out of memory. So it's bound by memory bandwidth, not by compute. The math is fast, the reading is what you wait on. And on top of that, answers in a batch finish at different lengths, so the whole batch waits for its longest answer.

A: So guess. Countdown, the half-billion model, sixteen prompts times G of eight, so a hundred twenty-eight answers per step, up to two hundred fifty-six new tokens each, generated with plain Hugging Face generate. What fraction of each step's wall time is generation?

B: [a bit unsure] Okay, if you're telling me it's the slow one... half?

A: [working it out aloud] You'll measure it yourself, but here's a rough estimate. Half a billion parameters in B F sixteen is about one gigabyte of weights. Each decode step reads that whole gigabyte. The Spark's spec sheet says about two hundred seventy-three gigabytes per second of memory bandwidth. So that's at least about four milliseconds per step, just reading weights. In practice, at this model size, the Python overhead inside generate dominates, often tens of milliseconds per step. And there are two hundred fifty-six steps. So, several seconds.

B: And the training part?

A: The rule of thumb for training is about six floating-point operations per parameter per token, forward plus backward. A hundred twenty-eight sequences of roughly three hundred fifty-six tokens is about forty-five thousand tokens. So six, times half a billion, times forty-five thousand, which is about one point four times ten to the fourteen operations. At realistic GPU utilisation that's a few seconds. So expect generation to be well over half. Quite possibly seventy to ninety percent of the step.

B: [surprised] So the RL step is mostly... inference.

A: Mostly inference. Which is why switching generation to a real inference engine, V L L M or S G Lang, is usually the single biggest speedup you can make. And it's why every serious RL framework has one built in. Fast inference is fast RL. Everything you'd learn about serving shows up here. Batching. The K V cache. Prefix caching, and notice, all G answers share one prompt, so you can compute the prompt once. Serving engines.

B: So how does that scale, then? If I double G, or let answers get longer, or go to a bigger model?

A: Generation cost goes roughly with the number of prompts, times G, times answer length. And because decoding is bandwidth-bound, a bigger batch of sequences is nearly free per token, since you're reading the weights once for everyone, until you become compute-bound or run out of K V cache. And the K V cache grows with batch size times length times number of layers, so that's what caps your batch. Training cost goes with total tokens times model size, that six-per-parameter rule, and it's compute-bound and efficient. Long answers hurt twice: more decode steps, and the batch waits for its longest one. Doubling the model roughly doubles both. So if you want to spend money to go faster, you spend it on inference. A real engine with continuous batching and a paged K V cache. Prefix caching. And at larger scale, separate GPUs for generation and for training, with the weights synced between them.

<!-- section: Build It -->

A: So, building it. Everything runs on the Spark. Plan on an evening to understand it and a weekend to run it. The plan is: a Countdown checker, your own G R P O loop on the half-billion Qwen instruct model, then the same run with T R L's G R P O trainer to compare, and then point it at your coding environment.

B: Why that model?

A: It's small enough to iterate fast. It follows a prompt format. And on simple Countdown puzzles it should succeed sometimes, which, as you now know, is the actual requirement. If the starting reward you measure is under about five percent or over about ninety percent, change the puzzle difficulty before you change anything else. Moving up to the one point five billion version is a reasonable second run.

A: Setup is one sentence: make a virtual environment, install torch, transformers, T R L, datasets and accelerate, and check that the torch you got can actually see the GPU, because the Spark is ARM with a Blackwell GPU, and if it can't, use NVIDIA's PyTorch container or the wheel index NVIDIA documents for the Spark. And download the model once up front so later runs don't wait on it.

A: Memory, though, is worth working out. Half a billion parameters, full fine-tuning, B F sixteen weights, and the Adam W optimiser. Weights are about one gigabyte. Gradients, another one. Adam keeps two extra numbers per parameter, in thirty-two-bit floats, so that's about four gigabytes. Plus thirty-two-bit master weights if you use mixed precision. All told, under about ten gigabytes. Plus one gigabyte for the reference model.

B: That's nothing on a hundred twenty-eight gigabyte machine.

A: [dry] That part's nothing. The real risk is the logits. The model's vocabulary is about a hundred fifty-two thousand tokens. For every position in the sequence, it outputs a score for every one of them. So one sequence of three hundred fifty-six tokens has about fifty-four million logits. Now do that for a hundred twenty-eight sequences, in thirty-two-bit floats, four bytes each.

B: [working it out] Fifty-four million times a hundred twenty-eight... times four bytes...

A: About twenty-seven gigabytes. For one tensor that you'll use for a moment and throw away. So you process the batch in micro-batches, a few sequences at a time.

A: The checker is given to you, since we built verifiers already. It makes puzzles by picking random numbers and combining them with random operations, so a solution always exists, keeping the target between one and two hundred. The prompt asks for an expression inside answer tags. And the checker takes the last answer tag, checks that the numbers used are exactly the given numbers, each once, and evaluates the expression with a safe evaluator that only allows arithmetic and whole-number literals. Its tests are the interesting part. The correct expression passes. Just writing "forty" fails, because it skipped the numbers. Using the wrong numbers fails. Trying to sneak in an import fails. Dividing by zero fails. And forgetting the tags fails. Three numbers per puzzle is the easy setting, four is much harder. And make a fixed held-out set of two hundred puzzles from a fixed random seed, and never train on it.

A: Then the first part you write yourself. The rollout. Given a batch of puzzles, produce G answers each, their rewards, and their advantages. The things that matter. Use the chat template to build the prompts. Pad on the left, not the right, because then every answer starts at the same column, right after the prompt. Generate with sampling at temperature one and no top-p, asking for G answers per prompt, and they come back with each prompt's G answers sitting next to each other, which is exactly the layout you want for grouping.

B: Why temperature one, specifically? I'd usually turn it down.

A: Because the loss assumes the samples came from the real policy. The actual distribution. Turn the temperature down or trim it with top-p and you're sampling from a different distribution than the one you're computing log-probs for. Then you need a mask that marks which tokens are real answer tokens. It has to cover the end-of-sequence token itself, and nothing after it. That's an easy off-by-one. And check which token your chat template uses to end a turn. The advantages are three lines: reshape the rewards into groups, subtract the mean, divide by the standard deviation. One gotcha: torch's standard deviation defaults to the slightly bigger, unbiased version, which divides by G minus one, not G. Either's fine, be consistent. And write a test. Two groups of four. The first group, one pass and three fails, should give non-zero advantages that sum to zero. The second group, all four pass, should give all zeros.

A: Then the loss, also yours. First, a function that gets the log-prob of each answer token under the model, and also the entropy for logging. Do it a micro-batch at a time, converting the logits to thirty-two-bit floats just for that slice, pulling out the probability of the token that was actually written, and throwing the rest away. That way the twenty-seven gigabyte tensor never exists. And here's the bug that'll eat a weekend. The logits at position t predict the token at position t plus one. So you have to shift them by one against the actual tokens. Get that shift wrong and training will look plausible and learn nothing.

B: [laughs] That's a nasty one.

A: It's the nastiest one. Then the loss itself. The old log-probs and the reference log-probs, you compute once, right after the rollout, with no gradients. And with one update per batch, the old ones are just the current ones, detached. The ratio is the exponential of current minus old. The per-token K L is that ratio-minus-log-ratio-minus-one thing. The advantage is one number per answer, spread across all its tokens. Average over the real tokens within each answer, then over answers. And before you train anything, a sanity test. When the current, old, and reference log-probs are all equal, the loss should be about minus the average advantage, which is about zero. And the gradient on each real token should be minus that answer's advantage, divided by the number of answers times that answer's length.

B: And the K L part doesn't show up in that gradient?

A: [thinking out loud] Its gradient is exactly zero there. When the two models agree, you're sitting at the bottom of that ratio-minus-log-ratio curve, and at the bottom the slope is flat. So if your test shows a K L gradient at that point, something's wrong.

A: Then the loop. The policy is trainable, in B F sixteen. The reference is a second copy, frozen. Adam W with a learning rate of one times ten to the minus six. RL likes small learning rates, try between one and five times ten to the minus six. Two hundred steps. Each step: sixteen training puzzles, roll out eight answers each, compute the old and reference log-probs without gradients, compute the loss, backward, clip the gradient norm at one, step. Log one line of JSON per step with all the dashboard numbers and the time for generation, reference, and training. And every twenty steps, a greedy eval on the two hundred held-out puzzles, and dump four sample answers.

A: A few things that bite. Put the model in eval mode for generation, with the cache on, and train mode for the update, and make sure dropout is off either way. Qwen has none, but check. Call torch's CUDA synchronize before each timer reading, or the GPU timings lie, because GPU work is asynchronous, your timer would stop before the GPU's actually finished. Turn on gradient checkpointing if activations don't fit. And keep the sample dumps. Reading what the model writes at step zero, fifty, a hundred and two hundred is half the point of all this.

A: Then the same run with T R L's G R P O trainer, on the same seed and data. You hand it a dataset of five thousand puzzles, a reward function that calls your checker, and a config. Eight generations per prompt, two hundred fifty-six max tokens, the same learning rate, beta of zero point zero four, B F sixteen. Don't guess the details, look them up in the docs, because argument names and defaults have changed across versions. Specifically: whether the per-device batch size counts prompts or answers, it's answers in recent versions. What the loss type and reward-scaling options default to, because several fixes we'll get to are now options. And what turning on V L L M does to your time split. An agent can explain a config option or an error to you. The comparison, you write.

A: And last, swap the Countdown checker for your coding sandbox. Keep it single-turn. The prompt is a function stub and a description, the answer is the function, and the reward comes from running hidden tests. And you have a choice. All or nothing, one only if every test passes, or partial credit, the fraction of tests passed. Which one gives you fewer dead groups?

B: [working it out] Partial credit. With all-or-nothing, a group of answers that each pass some tests but not all would all get zero. Dead. With partial credit they'd get different scores, so there's spread.

A: That's the prediction to check. And scoring now costs real time, so run the sandbox for all the answers in parallel, with a process pool, and time scoring separately. And before you train, have an agent review your reward function for ways a model could game it. Before the model finds them.

A: You're done when your loop runs two hundred steps without any NaNs, and the held-out greedy accuracy is clearly higher than at step zero. When you've got all six dashboard curves plotted and you can point at the step where something changed. When you've saved samples from at least four points in training and can describe how the writing changed. When you've run T R L on the same task and can explain any difference from your curves. And when you know, from your own timers, what fraction of a step is generation.

<!-- section: Measure -->

A: So, what the numbers should look like. You'll log averages over ten steps around step zero, fifty, a hundred and two hundred, and the T R L run at two hundred, plus the time per phase for one typical step.

A: Reward rises, then flattens. How far depends on where it started. If it plateaus, look at the dead-group fraction before anything else. My toy simulation flattened at point seven three because most groups had gone dead, with the hard prompts stuck below one percent.

A: The dead-group fraction follows a U shape across the pass rate. Early on, the dead groups are mostly all-wrong. Late, they're mostly all-right. If you log which kind, you can actually watch the switch happen. And you can compare it against that chance-all-pass-plus-chance-all-fail number, using your measured pass rate.

A: Length might go up or down. On Countdown with a small model, expect it to settle wherever the reward is easiest to get, and the "think briefly" in the prompt matters. Watch the truncated fraction, though. An answer that got cut off never reaches its answer tag, so it scores zero. That's a length penalty you never wrote.

A: K L starts at exactly zero and creeps up. With beta at zero point zero four and that tiny learning rate, it should stay small, well under a tenth of a nat per token after a few hundred steps. That's a rough expectation, check it. Entropy drifts down slowly. That's the model getting sure.

A: And generation should dominate the step with Hugging Face generate. If it doesn't, check you synchronized before timing. With V L L M it should drop a lot. That gap is basically the argument for learning everything about inference.

A: But the real measurement is reading the samples. Expect early answers that ignore the format. Then reliably formatted answers. Then answers that try a combination, check it, and try another. Write down the first step where you see it check its own work. If you do.

B: [curious] Okay, so practical question. Say I run it and the reward goes flat at forty percent and just sits there. What do I check?

A: First, the dead-group fraction, and which kind. If most groups are all-wrong, the remaining prompts are too hard for the model to ever sample a success. Raise G, add easier prompts, or filter out the dead groups. If they're all-right, the data's exhausted, add harder prompts. Then read the samples. Is it getting truncated at max length, no answer tag, so zero? Has entropy collapsed so every sample's identical? Then check the checker, by hand, on real samples. Both ways. False negatives, correct answers it rejects, like a format mismatch. And false positives. Then compare held-out to training reward. If training's fine and held-out isn't, it's overfitting, or it's hacking. And last, the boring bugs. The logit shift. The answer mask. The learning rate.

<!-- section: Break It -->

A: Then break it, on purpose, four ways. First: remove the baseline. Use the raw zero-or-one reward as the weight instead of the group advantage.

B: Then everything that passes gets pushed up, and nothing ever gets pushed down.

A: Right. And it still learns, just slower and noisier. Then shift the rewards to five and six instead of zero and one, and it barely learns at all. That's the two hundred twenty times variance, live, on a real model.

A: Second: write a sloppy checker. Change it to give a one if the target number appears anywhere in the answer.

B: [amused] Oh, it's just going to write the number.

A: [laughs] Within a few dozen steps, it learns to write the target and stop. Training reward goes to nearly one. Held-out accuracy, with the strict checker, doesn't move. That's reward hacking in its purest form. And it's why you keep the strict held-out check separate from whatever you're training on. With unit tests the versions are subtler, but it's the same disease.

A: Third: starve the signal. Switch to four-number puzzles, too hard, or two-number puzzles, too easy, and watch the dead-group fraction climb toward one and the reward flatten. Then, on the hard set, raise G from eight to sixteen, and count how many groups come back to life. That's the trade from that little slider panel: more samples per prompt buy you signal, and you pay in generation time. DAPO, in twenty twenty-five, went further. It just filtered out dead groups and resampled, so every batch has full signal.

A: Fourth: let it run wild. Set beta to zero, no leash, and raise the learning rate ten or twenty times. Watch entropy and K L.

B: Collapse?

A: Usually one of two things. Entropy collapses, every answer in a group becomes the same text, the spread goes to zero, and learning stops cold. Or the model finds one long template that sometimes passes, and length runs to the cap. And then there's a subtler one to try. That divide-by-the-answer's-length step. Swap it for a plain sum over tokens divided by one fixed constant.

B: What's wrong with averaging per answer? Seems fair.

A: Here's the catch. Take two wrong answers in the same group, with the same negative advantage. One's ten tokens long, one's a hundred. With the per-answer average, the short one's penalty gets spread over ten tokens, so each token gets a tenth of it. The long one's gets spread over a hundred, so each token gets a hundredth. The long wrong answer is punished ten times less per token. And that nudges failing answers to get longer. A paper from twenty twenty-five, Liu and colleagues, nicknamed Doctor G R P O, argues that this bias, together with the division by the standard deviation, explains part of the length growth people reported in R one style runs.

B: [skeptical] So some of the "it learned to think longer" was...

A: Part of it, they argue, was the arithmetic. Not all. Run both versions and see whether your length curves differ.

<!-- section: Connections and close -->

B: How's this different from DPO, really? Both push good answers up and bad ones down, relative to a reference.

A: [thoughtful] That's exactly the comparison. DPO does it from a fixed dataset of pairs. G R P O samples fresh answers from the current model, every single step. The word for that is on-policy, training on samples from the model as it is right now. DPO is offline, data from earlier, from an older model. And that's why G R P O can keep improving past its data, and also why it costs so much more compute. It also closes a loop: the RL environment makes the tasks, the verifier makes the number, and this is what turns the number into learning. And the next wall is long-horizon agents. One reward at the end of a hundred-step agent run is the same dead-group problem, much worse. If you read two things, read the DeepSeekMath paper, where G R P O comes from, and OpenAI's Spinning Up introduction to policy optimisation, which has the cleanest derivation of why baselines don't add bias.

B: [working it out] Okay, let me try the whole thing. You've got a checker that says yes or no. You sample a bunch of answers to the same puzzle, grade them on a curve against each other, and the ones above average get trained on like supervised data, and the ones below get trained on with a negative weight. And no critic, because the group average is the baseline. And that's how it teaches the model to solve problems.

A: [gently] Almost all of it. The one thing I'd change is "teaches it to solve". It doesn't teach the model anything it never does. It takes things the model already sometimes gets right and makes them more likely. A group where every answer fails has no spread, so it gives no push at all. So the whole game is keeping the model in the zone where it sometimes succeeds, and making each success count. Turn the verdict into a weight, grade it against its siblings, and nudge.
