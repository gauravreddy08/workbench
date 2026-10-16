<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you want your relevance-labelling model to do a bit more. Not just spit out the label, but write a short reason with it. One or two sentences a human reviewer could actually read and go, okay, I trust that. And you try the obvious thing first. You sit down, you write a few hundred perfect explanations yourself, and you fine-tune on them.

B: Which is just... supervised training on good examples. Seems reasonable.

A: Seems reasonable. And it goes badly, in a way you wouldn't expect. Writing one really good explanation takes you, what, four minutes. After forty of them you're tired. They all start to sound the same. And honestly, you're not even sure your fortieth one is better than what the model already writes. So the model learns... your tired style.

B: [laughs] Yeah. I've written that dataset.

A: Then a colleague pulls up two of the model's explanations side by side and asks, which one's better? And you answer in about three seconds. And you're confident. You could do two hundred of those in the time it took you to write twenty perfect answers. And, here's the thing, your sense of which one is better is sharper than your ability to write the best one from scratch.

B: Huh. That's true of code review too. I can spot the worse PR way faster than I can write the good one.

A: That's the whole motivation, right there. Judging is easier than writing. It's like a wine critic. They can't make a great wine, but they can reliably tell you which of two glasses is better. So if you could train a model on "this one, not that one", you'd get way more signal per hour of human time. And the signal would be about quality, not about copying one person's phrasing.

B: [casual, a bit unsure] So you just... train on the winner? Take the one you picked and do normal fine-tuning on it?

A: That throws away half of what you said. You said "this one is better than that one". The "that one" part is information too. And here's the catch. "A is better than B" isn't a target you can do cross-entropy against. Cross-entropy needs one right answer to imitate, token by token. There isn't one here. You just have a comparison. So you need some way to turn a pile of comparisons into gradient updates. And for about five years the answer was reinforcement learning, and it was painful. Then in twenty twenty-three a paper showed that, with one algebra trick, the painful part just disappears. And what's left is a loss function you could write on one line.

<!-- section: Origin -->

A: [warming up] The story actually starts with a robot doing a backflip. Twenty seventeen. Paul Christiano and colleagues at OpenAI and DeepMind taught a simulated robot to do a backflip, without ever writing down what a backflip is. People watched pairs of short clips and clicked the one that looked more like a backflip. A small network learned to predict those clicks. And then that network served as the reward for reinforcement learning. About nine hundred clicks was enough.

B: Nine hundred. That's, like, an afternoon of clicking.

A: An afternoon. And the same recipe moved over to language. Fine-tuning GPT two on human preferences in twenty nineteen, that was Ziegler and colleagues. Then summarization in twenty twenty, Stiennon and colleagues. And then InstructGPT, in twenty twenty-two, from Ouyang and colleagues. And this is the result that made everyone pay attention. A model with one point three billion parameters, trained this way, was preferred by human raters over the hundred seventy-five billion parameter GPT three it was built from.

B: [surprised] Over a model more than a hundred times bigger?

A: A hundred times bigger, yeah. That pipeline, a reward model plus an algorithm called P P O, became what people call R L H F, reinforcement learning from human feedback. It's what made ChatGPT feel like an assistant instead of autocomplete. And it was also notoriously hard to run. A lot of labs just couldn't get P P O to train stably on language models. Then, May twenty twenty-three, Rafael Rafailov, Archit Sharma, Eric Mitchell and colleagues at Stanford put out a paper with a great title. "Direct Preference Optimization: Your Language Model is Secretly a Reward Model." D P O. They showed the reward model and the whole R L loop could be folded into one ordinary supervised loss on the pairs. And within months, a bunch of open models, Zephyr, Tulu, and later Llama three's post-training, were using D P O or a close relative.

<!-- section: The Idea: Preference pairs -->

A: So let's start with what the data actually looks like. A preference dataset is just a list of triples. There's a prompt, the input the model responds to. Papers write it as x. Then two responses to it. The one a person, or a strong model, liked better, which is called the chosen response. Sometimes written y w, for winner. And the other one, the rejected response. Y l, for loser.

B: And rejected means it's wrong.

A: [shaking head] Not necessarily. Rejected just means worse than the chosen one, for this prompt. Here's a real-feeling example. The prompt is "explain why the sky is blue to a ten-year-old". The chosen answer goes something like, "sunlight is a mix of all colours, and when it hits the air, blue light bounces around..." And the rejected one says, "the sky is blue because of Rayleigh scattering, which is inversely proportional to..." and so on.

B: [amused] Which is correct. Just not for a ten-year-old.

A: Right. It's not wrong, it's worse for this audience. And notice something else. Nobody wrote a perfect answer. Both of those came from a model. A human only had to pick. That's the economics. In InstructGPT, the labellers didn't even compare two at a time. They ranked somewhere between four and nine model outputs for each prompt in one go. And a ranking gives you pairs for free. Every pair in the ranking is a comparison. So if you rank four answers, that's six pairs. Rank nine, and it's thirty-six. The rule is, take the number of answers, multiply by one less than that, and halve it.

<!-- section: The Idea: Bradley-Terry -->

A: Okay. Before you can train on comparisons, you need a model of how comparisons happen in the first place. And the standard one is old. Nineteen fifty-two. It was built for ranking chess players and sports teams. It's called the Bradley-Terry model. Picture this. Every response has a hidden quality score. One single number. In this world it's called the reward. Higher is better. Now when a person compares two responses, they don't always pick the higher one. People are noisy. So Bradley-Terry says the chance they pick A over B depends only on the difference between the two scores. And you turn that difference into a probability with the sigmoid, that S-shaped squashing function that takes any number and maps it somewhere between zero and one.

B: That's Elo, isn't it? Chess ratings.

A: It's the same idea, yeah. Elo is built on exactly this. And it's worth getting a feel for the numbers. If the two scores are equal, difference zero, the sigmoid gives you a half. Coin flip. If A is two points higher, A wins about eighty-eight percent of the time. Five points higher, about ninety-nine percent. And here's the fact to hold onto, because it's the trick that makes everything work later. Only the difference matters. If you add a hundred to every single score, nothing changes. Every comparison comes out the same.

B: Okay. Hold on to "only differences matter". Got it.

A: So now, how do you train a network to output that score? You just say: make the comparisons I actually saw as likely as possible. Take the winner's score minus the loser's score, put it through the sigmoid, and the loss is minus the log of that. That's it. It's logistic regression on the difference of two scores.

B: [working it out] Wait. That's... that's my ranker loss. I've got a cross-encoder trained on a query, a better document and a worse document, with a pairwise loss on the score difference.

A: [pleased] It's exactly that. Your cross-encoder, trained with a pairwise loss, is a Bradley-Terry reward model. With a different name, and documents instead of answers. You've already built one.

<!-- section: The Idea: The classic pipeline -->

A: So here's the classic recipe, InstructGPT's. Three stages. Stage one is S F T, supervised fine-tuning. It's just ordinary next-token training on example answers people wrote by hand. Prompt, good response, learn to produce the response. It teaches the format, the basic "answer like an assistant" behaviour. You get a model that kind of works. Call it the S F T model.

A: Stage two, the reward model. Sample several answers from the S F T model, have people rank them, and train a model, InstructGPT used a six billion parameter one, with that Bradley-Terry loss. It reads a prompt and a response and prints one number.

A: And stage three is the R L part. The model writes answers, the reward model scores each one, and you nudge the model toward the higher-scoring answers. The algorithm for the nudging is P P O, proximal policy optimization, from Schulman and colleagues in twenty seventeen. It improves the model using attempts it sampled and the rewards they got, but it clips every update, so the model can't change too much in one step.

B: Why does it need clipping?

A: Because the rewards are noisy and the model's training on its own fresh samples. One lucky batch could shove it somewhere bad. Clipping keeps each step small. Now in R L language, the language model gets a new name. It's the policy. The thing that chooses actions. For a language model, the action is the next token. And I want to be precise about what a policy is, because the whole derivation leans on it. A policy isn't one answer. It's a spread of probability over every possible answer. Give it a prompt, and for every text you could possibly write back, it assigns some probability. "Deep blue" gets some. "Sunlight is a mix of colours" gets some. A string of random garbage gets some tiny amount. All of those add up to one. That's what people mean when they say "the model's output distribution".

B: [working it out] So it's not "what does it say", it's "how likely is it to say each thing".

A: Yeah. And the probability of a whole answer is just what you get by multiplying the next-token probabilities along the way. Okay, so stage three maximizes two things at once. Be good: get a high average reward on the answers you write. And don't wander far from where you started. The "where you started" is called the reference model. It's a frozen copy of the S F T model, it never trains. And how far you've wandered is measured with something called K L divergence. Kullback-Leibler. It's a measure of how differently two models spread their probability over answers. Zero when they're identical, bigger the more they disagree. And there's a knob, beta, the Greek letter, that sets how much you pay per unit of wandering. Beta is the price of moving.

B: [skeptical] Why have the second part at all, though? If the reward model knows what good is, just maximize reward.

A: [leaning in] Because the reward model doesn't really know what good is. It's a learned approximation, trained on maybe a few tens of thousands of comparisons. Push a policy hard against it, and the policy finds the reward model's blind spots. Answers that score really high and are garbage. That's called reward hacking. The model gets the reward by exploiting flaws in the scorer, instead of doing what the score was supposed to measure. And the K L leash is the main defence. If you stay close to a model that already writes sensible text, you can only exploit the reward model so much.

<!-- section: The Idea: Why PPO is heavy -->

A: So picture the whole pipeline drawn out, left to right. Across the top, a small box for S F T on demonstrations, an arrow, a box for the reward model trained with the pairwise loss, and then a big shaded box for stage three. And inside that big box sit four smaller boxes in a row. The policy, which is being trained. The reference, frozen. The reward model, frozen. And a value model, also being trained. Under them it says: sample answers, score them, compute K L to the reference, work out advantages from the value model, clipped update. Repeat. With generation inside the training loop.

B: I count two of those that I haven't heard explained. Value and advantage.

A: Right. So the problem is, a response gets one reward, at the end. One number for the whole answer. But the answer was a hundred tokens. Which tokens deserved the credit? P P O needs a value model for that, also called the critic. It's a network that, from any point partway through a response, predicts how much reward is still coming. Then for each token you can ask, after this token, did things look better or worse than the critic expected? That difference is the advantage. Positive means do more of this. Negative, do less. And that's how one reward at the end becomes a signal on every token.

A: And then across the bottom, under a dashed line, there's the D P O version. Same S F T box. Then a dashed box that just says "pairs only, no reward model". And then one shaded box with only two models in it. The policy, trained, and the reference, frozen. And a note: log-probabilities of fixed pairs, no sampling.

B: So four models down to two.

A: Four down to two. And to feel why four is a problem, put bytes on it. There's a rule of thumb for training with the Adam optimizer in mixed precision. Every parameter you train costs about sixteen bytes. Two for the weight in B F sixteen, two for its gradient, four for a full-precision master copy of the weight, and eight for Adam's two running averages. Anything frozen, you just store in B F sixteen, so two bytes per parameter. Now take a seven billion parameter model and say all four networks are that size. What do you get?

B: [a bit unsure] Seven billion at two bytes is fourteen gigs, times four models... fifty-something gigabytes?

A: That's the bill if nothing trained. But two of them train. The policy and the value model, sixteen bytes times seven billion, that's about a hundred twelve gigabytes each. The reference and the reward model, frozen, fourteen each. Add it up, about two hundred fifty gigabytes. Before a single activation. That's two Sparks' worth of memory, on the spec sheet. And real setups add a fast generation engine on top, because stage three also has to sample answers on every step. And sampling is that slow, memory-bound decoding, one token at a time, where the GPU's mostly waiting on memory, the thing that capped a model on the Spark at about seventeen tokens a second.

B: Okay. So it's heavy. But once it fits, it's just slow, right?

A: [sighs] If only. It's also fragile. Every P P O step depends on answers sampled from the current policy, scored by a learned reward, with the credit handed out by a learned value model that's itself chasing a moving target. There are about a dozen knobs. The clip range, the K L coefficient, how much the value loss counts, the sampling temperature, how you scale rewards. And wrong settings don't raise an error. They give you a model that slowly turns into repetitive nonsense... that the reward model loves.

<!-- section: The Idea: The best policy has a formula -->

A: So hold that picture, four models, a fragile loop. Now the trick. Go back to the objective. Be good, but pay beta for every unit of drift from the reference. And forget neural networks for a second. Ask a pure math question. Over all possible policies, every way of spreading probability over answers, which one scores best on that objective?

B: That sounds like the kind of question that doesn't have a clean answer.

A: [delighted] It has an exact one. And in words it's lovely. Take the reference model's probabilities, and tilt them by the reward. Every possible response gets its old probability multiplied by e raised to the reward divided by beta. So good answers get boosted, bad ones get shrunk. Then you divide everything by one normalizing number so it all adds back up to one. That number has a name, the partition function, written Z. It's the sum of those tilted probabilities over every possible response.

B: [working it out] So if one answer had probability one in a thousand under the reference, and it has a high reward, it gets multiplied up. And something with a low reward gets multiplied down.

A: Right. And then everything gets rescaled by the same factor so the total's one again. Why is that the best one? Short honest sketch. You can rewrite the objective as minus beta times the K L divergence between your policy and that tilted one, plus a piece that doesn't depend on your policy at all. And K L is never negative, and it's zero only when the two distributions are identical. So the best you can possibly do is make your policy equal the tilted one. The full algebra's in appendix A point one of the paper, and honestly it's worth twenty minutes with a pen.

A: And look at what beta does in there. It shows up like a temperature. Small beta, you're dividing the reward by a small number, so the tilt is extreme, and the best policy piles almost all its probability on the very highest-reward answers. Large beta, the tilt is gentle, and the best policy stays close to the reference.

B: So we have the answer. We know the best policy. Why do R L at all?

A: [wry] Because that formula is useless on its own. And people knew it well before D P O. The problem is Z. Z is a sum over every possible piece of text. Every string the model could ever write. You can't compute that. Which means you can't evaluate the best policy, and you can't sample from it either. So people did R L instead, to approximate it.

<!-- section: The Idea: Flip it around -->

A: And here's the move that makes the paper. Take that formula and solve it for the reward instead of the policy. Take logs and rearrange, and you get this, in words. The reward of a response equals beta, times the log of how much more likely the best policy makes that response compared to the reference, plus a constant that depends only on the prompt. The constant is beta times log Z.

B: Give me a number.

A: Okay. Say the best policy is twice as likely as the reference to write some answer. Then that answer's reward is beta times log two, plus the constant. Say it's ten times less likely. Then the reward is beta times the log of a tenth, which is negative, plus the constant. So the policy is the reward model. You read the reward straight off it, through a ratio of probabilities. That's the title. "Your language model is secretly a reward model."

B: But the constant still has Z in it. We still can't compute it.

A: [amused] We can't. But remember what Bradley-Terry cares about.

B: Only differences. Oh. And both answers in a pair are answering the same prompt—

A: So they share the same constant. Same prompt, same Z, same beta log Z. And when you take the difference, it cancels. It's the "add a hundred to every score" thing. Z is just a number added to every answer for that prompt. So here's a quick one. Plug that reward formula into Bradley-Terry, the sigmoid of the winner's reward minus the loser's. What's left, and why can you compute it now?

B: [working it out] Okay, the winner's reward is beta times the log-ratio for the chosen answer, plus beta log Z. The loser's is beta times the log-ratio for the rejected answer, plus beta log Z. Subtract, the log Z's cancel... and I'm left with log-probabilities. The chosen answer under the policy and under the reference. The rejected answer under both.

A: Four log-probabilities, of specific texts you already have. And each one you get with a single forward pass, exactly the way you compute a training loss. No sum over all possible texts. No sampling. Nothing intractable left.

<!-- section: The Idea: The DPO loss -->

A: So now assemble it. Replace the unknown best policy with the model you're actually training, and train it to make the observed preferences likely. Step by step. One, how much did the policy move the chosen answer? Its log-prob under the policy minus its log-prob under the reference. Positive means the policy now likes the chosen answer more than the reference did. Call that a. Two, the same thing for the rejected answer. Call it b. Three, multiply each by beta. Those are called the implicit rewards. Beta times a for the chosen, beta times b for the rejected. They're what a reward model would've said, read straight off the policy. And they only mean something when you compare them to another answer for the same prompt. Four, take the difference, beta times a minus b. That's the reward margin. Positive means the policy agrees with the human. Five, squash it with the sigmoid. Now it's the probability, under Bradley-Terry, that the policy's hidden reward model agrees with the label. Six, take minus the log. That's the loss for one pair. Average over the batch.

B: [quietly] That's it?

A: That's it. It's the reward model loss from before, with the reward model replaced by a ratio of two language models. No sampling, no value model, no reward model, no R L loop. Per pair, two forward passes on the policy, chosen and rejected, two on the frozen reference, and one backward pass.

B: So let me try the whole chain. Start from "be good but stay close". That problem has an exact best answer, the reference tilted by the reward. Flip that around and the reward is written in terms of the policy. Put that into Bradley-Terry, the unknowable constant cancels because both answers share a prompt, and what's left is a loss on four log-probs.

A: That's the whole derivation. Four lines of algebra, if you draw it as a column of boxes with arrows going down. Objective, exact optimum, solve for the reward, into Bradley-Terry, and then the D P O loss at the bottom.

<!-- section: The Idea: What the loss actually does -->

A: And because the loss only ever sees two numbers, a and b, plus beta, you can draw it completely. Picture a little square map. a runs left to right, from minus six to plus six. b runs bottom to top, same range. The colour at each point is the loss. A dot marks where you are, and an arrow shows which way the gradient pushes you. Underneath there's a beta slider and a few preset buttons. One says "step zero", and it puts the dot dead centre, both log-ratios zero, because at the very first step the policy is an exact copy of the reference. So here's my question. At step zero, what's the loss on every pair? And what fraction of pairs count as correct, meaning the chosen reward is bigger than the rejected one?

B: [a bit unsure] The margin's zero, so the sigmoid gives a half... loss is minus log a half. And accuracy, I mean, it's a coin flip, so fifty percent?

A: The loss, yes. Minus log a half is the natural log of two, about point six nine three. On every single pair. And for any beta, because beta times zero is still zero. But accuracy isn't fifty percent. It's zero. Every pair is a tie. Chosen reward zero, rejected reward zero, and "correct" means strictly greater. T R L and most dashboards use strictly greater. So the first logged point of any D P O run should read loss point six nine three, accuracy zero, margin zero. And if it doesn't, the policy and the reference aren't the same model at step zero. The usual culprit is dropout, which we'll break on purpose later.

B: So point six nine three is a free sanity check.

A: Free sanity check. Now, four things that map makes obvious. First, the gradient. If you differentiate the loss, the direction is always the same. Make the chosen answer more likely, make the rejected one less likely, by equal amounts. That's just two ordinary log-likelihood gradients, one with a plus and one with a minus. What changes is the size. It's weighted by the probability that the policy currently has the pair wrong.

B: [skeptical] Okay, but then... isn't that just S F T on the chosen answer, plus pushing the rejected one down? You could do that without any of this algebra.

A: That's the natural thought, and the paper actually tried it. Fine-tune up on chosen, push down on rejected, unweighted. And the model degenerated. The weight is the difference. Pairs the policy already gets right by a wide margin get almost no push. Pairs it gets wrong get pushed hardest. Without that, you just keep shoving every rejected answer down forever, and the model falls apart.

A: Second thing. Only the difference matters. Every diagonal line on that map, going bottom left to top right, has the same loss along it. So the point a equals plus two, b equals zero, "chosen went up, rejected didn't move", and the point a equals minus four, b equals minus six, "both fell, rejected fell more"... those are equally good to D P O. Same difference, two. Same loss. That's going to matter a lot.

A: Third. The loss never reaches zero. It keeps rewarding a bigger margin, forever. On a pair with a clear winner, D P O will happily push a minus b toward infinity unless something stops it. In practice what stops it is that you train for one or a few passes over the data, at a small learning rate.

A: And fourth, beta sets the scale. Drag the beta slider down, and the same log-ratio margin earns only a small reward margin. So the loss stays high, and the push stays strong for longer. The policy has to move further from the reference before the loss is happy. Drag beta up, and a tiny margin already saturates the sigmoid, the push dies off quickly, and the policy stays close to the reference.

<!-- section: The Idea: What beta means -->

B: That's backwards from how beta looked before, though. In the R L objective big beta meant "stay close".

A: It's the same thing, actually. Both views agree. In the objective, beta was the price of drift, so big beta, stay close. In the loss, beta multiplies the log-ratios. Say you want a reward margin of two, which Bradley-Terry reads as eighty-eight percent sure. The log-ratio margin you need is two divided by beta. At beta a half, that's four nats of movement. At beta point one, it's twenty.

B: Nats?

A: Nats are just the unit of a log-probability when you use the natural log. One nat is a factor of e, about two point seven, in probability. So four nats is a factor of about fifty-five. Twenty nats is a factor of about five hundred million. So at small beta the policy has to change how likely it finds these answers enormously before the loss says "fine". With big beta, it barely has to move. Big beta, stay close. Same story.

A: Typical values are somewhere from point zero one to point five, and point one is the default, in the paper and in T R L. Lower beta means more aggressive changes and more risk of drifting into weird text. Higher beta means gentle changes that might not move behaviour enough. It's the single most important knob after the learning rate. And the two interact. A learning rate that's perfectly fine at beta point one can wreck the model at beta point zero one.

B: [casual] And the leash works the same as the K L in R L H F. Just cheaper.

A: [gently] Not quite, and this is the first honest caveat. D P O keeps the model close to the reference only on the data you train on. The K L term in R L H F is measured on answers the policy itself writes, so it's checked everywhere the model actually goes. D P O's leash only acts through the pairs. So on texts far from your dataset, the model can drift in ways nothing measured. Second caveat. The derivation assumed you actually reach the exact best policy. A real network trained for one epoch on a few thousand pairs doesn't. So the algebra tells you what the loss is aiming at. Not where it lands.

<!-- section: The Idea: The dashboard -->

A: Now, a nice bonus. Every D P O step hands you, for free, the numbers a reward model would've produced. Libraries log them, and they're your dashboard. There's the chosen reward, the average of beta times a over the batch. Starts at zero, and it may drift up or down a little. The rejected reward, beta times b. Starts at zero, goes down. The margin, the gap between them, starts at zero and should rise steadily. Accuracy, starts at zero because of the ties, rises fast, then plateaus. The loss starts at point six nine three and falls. And then two more that are easy to ignore and shouldn't be. The plain log-probs of the chosen and rejected answers under the policy. Watch those.

B: What does accuracy actually mean here? Accuracy of what?

A: It means the policy's hidden reward model agrees with the label on this pair. On the training pairs it eventually gets close to a hundred percent, and that tells you very little. On pairs you held out, it tells you whether the preference actually generalizes.

<!-- section: The Idea: Sequence log-probs -->

A: Okay. Here's where most of the bugs live. The loss needs the log-probability of a whole response given its prompt. But a language model gives you probabilities one token at a time. Same as when you trained the tiny model from scratch. At each position it outputs a score for every token in the vocabulary, you turn those into probabilities, and the log of the probability it gave the real next token is that token's log-prob. And the probability of the whole response is the product of the token probabilities, so in log space it's the sum. First token given the prompt, plus the second token given the prompt and the first, and so on to the end. That's a sequence log-prob. And you sum over the response tokens only.

A: Picture one row of little boxes. The prompt part: a "user" marker, then "Name", "a", "color", then an "assistant" marker. Then the response, shaded: "Deep", "blue", a full stop, and an end-of-turn token. And then one dashed box at the end, a padding token. Under each box there's a zero or a one. Zeros under the prompt, a one under each response token including the end-of-turn, and a zero under the pad. And the arrows go diagonally, from each position to the next one, because the output at each position is predicting the token after it. Add up the log-probs wherever there's a one, and you get one number. That's the log-prob of the response.

A: Three details, and every one of them has bitten real implementations. First, shift by one. The output at position t is the model's guess for the token at t plus one. So you line up every output except the last against every token except the first. And the mask shifts with the tokens. Forget the shift and you're scoring every token against itself. Which gives you a large, meaningless number that still trains. Badly.

B: [jumping in] And for the prompt... you don't really need the mask, right? The prompt's the same in chosen and rejected, so it cancels in a minus b anyway.

A: It cancels, but only if both sequences keep exactly the same prompt tokens. And even when it cancels, it pollutes the log-prob numbers you're watching on the dashboard. So score only what the model wrote. And one more trap in there. Tokenize the prompt and the response separately, and then join the token ids. If you join the strings first and tokenize that, the tokenizer can merge characters across the boundary into one token, and now your mask is off.

A: Third. Sum, don't average.

B: [skeptical] Averaging seems cleaner, though. Otherwise long answers just have huge negative numbers.

A: They do, and that's real. But D P O as derived uses the true log-probability of the response, and that's a sum. Averaging over tokens is a different objective. Some of the later variants do it on purpose. But you should know the consequence of summing. A long response has a much more negative log-prob than a short one, and its log-ratio can move a lot more in absolute terms, just because there are more tokens to move. That's one of the roots of a length problem we'll get to in a second. And last, include the end-of-turn token in the response. That's how the model learns that the chosen answer stops where it stops.

<!-- section: The Idea: What goes wrong -->

A: So, three failure modes, getting sneakier as we go. First, overfitting. D P O usually runs one to three epochs at small learning rates. For full fine-tuning, five times ten to the minus seven is common. That's half a millionth. Ten to a hundred times lower than you'd use for S F T. Run longer and training accuracy hits a hundred percent, margins keep climbing, held-out accuracy stalls, and the text gets strange. That's the "loss never reaches zero" thing. It always wants a bigger margin. And a paper on a variant called I P O, Azar and colleagues, twenty twenty-three, made this precise. When the preferences in your data are close to certain, D P O's optimum just ignores beta and drifts arbitrarily far from the reference.

A: Second one. Both log-probs fall. Watch the chosen log-prob. You'd expect it to go up, right? You're training the model to prefer the chosen answer.

B: Yeah. That's... that's the whole point.

A: [slowly] Often it goes down. Along with the rejected one, just more slowly. On the map, that's the bottom-left region. The loss looks great, and both answers are less likely than before. So the probability went somewhere else. To answers that are in neither column. Sometimes that's harmless. Sometimes the somewhere else is worse than both. People have studied this under names like likelihood displacement. And we'll make it happen on purpose later, dramatically, with a tiny model.

A: Third, and sneakiest. Length. In a lot of preference datasets, the chosen answer is longer on average than the rejected one, because raters, human and model, like thorough answers. And D P O learns the cheapest feature that separates chosen from rejected. "Longer" is very cheap. So train on UltraFeedback, which is the dataset we'll use, and the average length of your model's answers will very likely go up. Then a judge that also likes length, and judges mostly do, reports a big win that's partly just more words. Park and colleagues measured this directly for D P O in twenty twenty-four, and benchmarks like Alpaca Eval added a length-controlled win rate for exactly this reason.

A: So try a guess. You train Qwen two point five, the half-billion parameter instruct model, with D P O on five thousand UltraFeedback pairs. Before training, its answers on a hundred held-out prompts average three hundred tokens. What's the average after? And then, a judge compares D P O against the base model, and you cut both answers to the same length before judging. What happens to the win rate?

B: [working it out] Longer, I guess. Maybe... four hundred? And if you cut them to the same length, the win rate drops?

A: Honestly, there's no number to look up. It depends on your beta, your learning rate, how many steps. So you measure it. But the direction is the prediction, and you've got it. Longer, often noticeably. Something like ten to fifty percent longer wouldn't be surprising, so your four hundred is in range. And when you equalize lengths, the win rate usually drops toward fifty percent. Whatever's left above fifty is the part of the improvement that isn't just more words. And if your run shows no length increase at all, check that it actually moved the model. Margins rising, held-out accuracy above fifty percent.

<!-- section: The Idea: The family -->

A: D P O started a small industry of variants. You don't need all of them, but you should know what each one changed, and why. I P O, from Azar and colleagues, swaps the log-sigmoid for a squared loss that pulls the margin toward a fixed target instead of pushing it to infinity. In T R L's convention the target is one over two beta. So margins can't grow forever, which fixes that overfitting-to-certain-preferences problem.

A: K T O, from Ethayarajh and colleagues, twenty twenty-four, doesn't use pairs at all. It works on single responses labelled good or bad. The loss is shaped after prospect theory, from behavioural economics, with a reference point estimated from the batch. And the reason is practical. Thumbs-up, thumbs-down data is far more plentiful than paired comparisons.

A: Sim P O, from Meng, Xia and Chen, twenty twenty-four. No reference model at all. It uses the average token log-prob as the implicit reward, and adds a target margin, gamma, inside the sigmoid. That saves the reference model's memory and compute, and the averaging counters the length bias of summed log-probs. And Or P O, from Hong, Lee and Thorne, twenty twenty-four. No reference model and no separate S F T stage either. It adds a penalty on the odds ratio between chosen and rejected to the ordinary S F T loss on the chosen answer. So it does S F T and preference tuning in one pass.

B: [skeptical] So the ones that drop the reference are just better, then? Less memory, one less model.

A: [measured] You'd think so. But notice what dropping the reference costs. The reference was the "stay close" anchor. Those two replace it with something else, length normalization in one, the S F T loss in the other. And a bunch of practical recipes do the opposite move. They keep D P O and add an S F T-style term on the chosen answers, which directly fights the "both log-probs fall" problem. There's no consensus winner. Published comparisons depend heavily on tuning, and when each one is tuned well they're close. D P O's still the baseline everyone compares against, which is why it's the one you implement. And read the original papers before trusting a one-line summary of any of them. Including mine.

A: One more distinction worth having in your head. Everything so far is offline. You train on a fixed dataset collected beforehand, usually written by other models and labelled once. P P O is online. The model being trained generates fresh samples during training, and those get scored and learned from. A popular middle ground is iterative D P O. Generate pairs from your current model, label them with a judge or a reward model, run D P O, and repeat. That brings back some of the "learn from your own mistakes" benefit of R L, without P P O's machinery.

<!-- section: Build It: Data -->

A: So, building it. The core, the two functions that matter, runs on your Mac in seconds. The training runs on the Spark. One Python environment for both, with torch, transformers and datasets, and later T R L and peft. On the Spark, you want the PyTorch build that matches its CUDA and its ARM processor. And the data is the binarized version of UltraFeedback, from Hugging Face's H four team. It's the version that was used to train Zephyr. About sixty thousand prompts, and for each one, a chosen and a rejected response, picked from four model completions using ratings from GPT four. It has a preference training split and a preference test split. Check the dataset card for the exact column names before you rely on them.

A: Then the first thing you do is just look at it. A tiny script that loads the training split and prints one example: the prompt, the chosen answer, the rejected answer, and the two scores. The one gotcha is that chosen and rejected aren't plain strings, they're chat conversations, a list of messages, and the answer is the last message. And then read twenty pairs. For each one, would you have picked the same winner? Write down how many you disagree with.

B: [a bit unsure] What would you expect, like, two out of twenty?

A: I don't know, and that's the point of counting. That number is a rough floor on how noisy your labels are. And it comes back later, when you see held-out accuracy flatten out and wonder why it won't go higher.

<!-- section: Build It: The log-prob function -->

A: Now the part most likely to be subtly wrong, so it's yours to write. The sequence log-prob function. It takes the model's outputs for a batch of joined prompt-plus-response sequences, the token ids, and a mask that's one on response tokens and zero on prompt and padding. And it gives back one number per sequence. The shape of the work is what we just said. Shift: drop the last output position and the first token, and shift the mask the same way as the tokens. Then take a log-softmax over the vocabulary, and pick out the log-prob of the token that actually came next. In PyTorch that picking-out is a gather. Then multiply by the mask and sum.

B: Anything that bites there?

A: Two things. Do the softmax in float thirty-two. In B F sixteen, a sum of hundreds of small log-probs loses precision. And you're going to compare these numbers between two models, so a little rounding error in each turns into a fake difference. And memory. The vocabulary for the model we'll use is about a hundred fifty thousand tokens. A log-softmax over that, for two sequences of a thousand twenty-four positions, is about one point two gigabytes in float thirty-two. Fine on the Spark. If it isn't fine for you, there's a cheaper way. Take the raw score of the real token and subtract the log of the summed exponentials over the vocabulary. Same number, and you never build the whole table.

A: Then you write the batch builder that makes those masks. For each example, render the prompt with the model's chat template, including the bit that says "assistant, your turn". Tokenize the prompt and the response separately, add the end-of-turn token to the response, join the ids, build the mask, and pad on the right. And if it's too long, cut the response, not the prompt.

A: And test it by hand before you trust it. Make a fake model: random scores for one sequence of five positions, over a vocabulary of just seven tokens. Five token ids, and a mask that's on for the last three. Work out the answer manually. For each of the last three positions, take the log-softmax of the scores at the position before, pick out that token, and sum the three. Your function should match to one part in a million.

<!-- section: Build It: The loss, by hand -->

A: Then the D P O loss itself. It takes four batches of log-probs, policy chosen, policy rejected, reference chosen, reference rejected, plus beta. It returns the loss averaged over the batch, and the two implicit rewards, detached so they don't carry gradient, just for logging. Two hints. Use the built-in log-sigmoid, not the log of the sigmoid.

B: Why does that matter? It's the same function.

A: Same function on paper. On a computer, if the margin's a big negative number, the sigmoid rounds to exactly zero, and the log of zero is minus infinity. And now your loss is infinite. Log-sigmoid computes it directly and stays finite. And the second hint: the reference log-probs must carry no gradient. Compute them under no-grad.

A: Then, check it on paper before you run it. One pair, beta point one. Policy log-prob of the chosen answer, minus ten. Of the rejected, minus twelve. Reference, chosen minus ten and a half, rejected minus eleven and a half. Work out a and b.

B: [working it out] a is the policy minus the reference for chosen... minus ten minus minus ten and a half, so plus a half. And b is minus twelve minus minus eleven and a half, so minus a half.

A: [encouraging] Right. Then the rewards?

B: Times point one. Plus point zero five and minus point zero five. Margin's point one.

A: And the loss is minus log sigmoid of point one, which comes to about point six four four four. Just under the point six nine three you'd get at a tie, because the policy's already leaning the right way, a little. And the gradient with respect to the chosen log-prob is minus beta times the sigmoid of minus point one. That's about minus point one times point four seven five, so minus point zero four seven five. And plus point zero four seven five for the rejected one. Equal and opposite, like the map said. When I ran exactly this in PyTorch, I got point six four four three nine seven for the loss, and point zero four seven five zero two for the gradients. And one more check: when all four inputs are equal, the loss should be point six nine three one, for any beta.

<!-- section: Build It: The toy -->

A: Before you spend any Spark time, run the whole loop on something that trains in a minute on your Mac. A tiny GPT two, built from a config, nothing to download. A vocabulary of fifty tokens, thirty-two positions, sixty-four wide, two layers, two attention heads. And every dropout setting set to zero. Then make sixty-four fake pairs. A random four-token prompt, and a random six-token response, where the chosen and rejected versions are identical except for the very last token. The chosen one ends in token one, the rejected one ends in token two.

A: First you train it briefly with plain S F T on both the chosen and the rejected answers, so it starts out with no preference at all. That's your reference. Then you deep-copy it, and the copy is the policy. Then three hundred D P O steps, AdamW, learning rate one ten-thousandth, beta point one, the whole dataset in every batch. Every twenty-five steps, print the loss, accuracy, the average reward margin, and the chosen and rejected log-probs for both models. Keep it around, we'll break it later. So before you run it. Does the chosen log-prob go up?

B: I mean... yes? That's what you're training it to like.

A: [amused] Hold that thought. We'll get to the numbers.

<!-- section: Build It: The real run -->

A: Then the real thing, with your own loop. The model is Qwen two point five, the half-billion parameter instruct model. Small enough to fully fine-tune comfortably on the Spark. The one point five billion one fits too. Half a billion trained at sixteen bytes a parameter is about eight gigabytes, plus another gigabyte for a frozen copy, so you've got lots of room. You load it twice. The policy in training mode, and the reference frozen, in eval mode, with gradients switched off. Both in B F sixteen. And you switch dropout off in the policy too, or step zero won't read point six nine three.

A: Data: five thousand pairs from the training split, filtered so the prompt plus the longer response is under a thousand twenty-four tokens. And five hundred pairs from the test split for held-out accuracy. And the loop is short. For each batch, run the policy on the chosen sequences and on the rejected ones. Run the reference on both, under no-grad. Compute the loss. Backward, clip the gradient norm to one, step, and log every ten steps.

A: Starting settings: beta point one. AdamW at five times ten to the minus seven. An effective batch of thirty-two pairs, which you get with micro-batches of four and accumulating gradients over eight of them. Warm up over the first ten percent of steps. One epoch. Five thousand pairs in batches of thirty-two is about a hundred fifty-six optimizer steps. Log those six dashboard numbers, and every fifty steps, held-out accuracy and margin.

A: Two optional upgrades, and each one teaches you something real. One: precompute the reference. The reference never changes. So run it over the whole dataset once, store the two log-probs per pair, and now the reference model doesn't even need to be in memory during training. Compare the wall-clock time.

A: Two: LoRA. Remember, LoRA freezes the original weights and learns the change to each weight matrix as the product of two thin matrices. So wrap the policy with your adapter. And there's a nice trick here.

B: [jumping in] Wait, then where's the reference? You'd still need a second copy.

A: You don't. With LoRA, the reference is just the base model with the adapter switched off. Same weights in memory. Run it once with the adapter on, that's the policy, once with it off, that's the reference. One copy of the weights. LoRA does want a much bigger learning rate, something like five times ten to the minus six up to five times ten to the minus five. Check what the LoRA paper and the T R L docs suggest.

A: And when it runs, have an agent review the loop for the classic bugs. The reference computed with gradients. The shift or the mask off by one. Padding counted in the sum. And chosen and rejected batches getting misaligned after shuffling, so you're comparing one prompt's winner with a different prompt's loser.

<!-- section: Build It: Evaluate with a judge -->

A: Now, is it actually better? Hold out a hundred fifty prompts from the test split that you never trained on. Generate one answer per prompt from the base model and from your D P O model, with the same decoding settings. Greedy, or temperature point seven with a fixed seed, up to five hundred twelve new tokens.

B: And then hand them to a judge, and if D P O wins, done.

A: [warning] That's where the length trap gets you. So, three things. First, the judge compares base against D P O, and every pair gets judged twice, with the order swapped. Judges have a position bias, they tend to like whichever answer comes first, or second, depending on the model. So you count a win only if the judge picks the same answer in both orders. Otherwise it's a tie. Second, record the average and the median length, in tokens, of each model's answers. Third, rejudge with both answers cut down to the shorter one's length, at a sentence boundary. That's a crude length control, but it tells you how much of the win was just length. And then read twenty pairs yourself. Does your verdict agree with the judge's? Have an agent review the judge prompt and the swapping logic. Not the conclusion.

<!-- section: Build It: Parity with TRL -->

A: Last build step. Train the same model, same five thousand pairs, same settings, with T R L's D P O trainer, using its standard sigmoid loss. If you don't give it a reference model, it makes a frozen copy for you. And T R L's interface moves fast, so check the current docs for argument names. For example, the argument where you pass the tokenizer got renamed to "processing class" in recent versions. Then compare three things. Step zero: both should log point six nine three, margin zero. Then the core, exactly. Take one fixed batch of eight pairs and compute the chosen and rejected log-probs with your function and with T R L's. They should agree closely. If they don't, it's almost always tokenization. The chat template, whether the end-of-turn token is included, which side gets truncated. And then the curves. Overlay your loss, margin and accuracy on T R L's. They won't be identical, because the data order, padding and numerics differ, but they should have the same shape and similar values. An agent can explain a mismatch you can't find. But find the line yourself.

<!-- section: Measure -->

A: For the real run, here's what you'd write down, next to a prediction for each. The loss at step zero, and at the end. Held-out accuracy and margin. How much the chosen log-prob and the rejected log-prob changed from start to end. Average answer length before and after. The judge's wins, ties and losses against the base model, in both orders. The same thing with lengths equalized. And the wall-clock time with the reference live versus precomputed. And the same columns for the T R L run alongside.

A: But first, the toy. When I ran it on my Mac, step zero looked exactly like it should. Loss point six nine three, accuracy zero, margin zero. Chosen log-prob minus point eight six, rejected minus point eight five. Basically identical, which is what the S F T on both was for. By step fifty: loss point five nine, accuracy a perfect one. Margin point two two. And the chosen log-prob...

B: Went up.

A: [flatly] Minus seventeen and a half.

B: [surprised] Down? From under one to seventeen and a half?

A: Down. Rejected went to minus nineteen point seven. By step one hundred, minus nineteen point one and minus twenty-two. And at step three hundred, loss point four three nine, margin point six, accuracy still perfect, chosen at minus twenty point three, rejected at minus twenty-six point two. So read that step fifty row again. Accuracy is perfect. The loss is falling exactly as designed. And the chosen response went from a log-prob of minus point eight six, which is a probability of about forty-two percent, to minus seventeen and a half. Which is about two and a half chances in a hundred million.

B: So it "prefers" the chosen answer...

A: [wry] Only in the sense that it now finds the rejected one even more absurd. That's the bottom-left corner of the map, measured. Both fell, rejected fell more. And most of that collapse happened in the first twenty steps.

A: If you plot it, the log-prob up the side, from zero at the top down to about minus thirty, and steps along the bottom to three hundred, you get two pairs of lines. The plain D P O pair both start near zero and crash down together in the first few dozen steps, then keep sinking slowly, the rejected one sinking faster. The chosen ends about twenty nats below where the reference had it. The second pair is the same run with a fix we'll get to in a minute. Its chosen line actually climbs, up toward zero, and only its rejected line falls.

B: Okay, but that's a toy where chosen and rejected differ by one token. Is the real run going to do that?

A: Usually much milder. For the real run, these are expectations, not measurements, so check them yourself. Step zero, exactly point six nine three. Anything else is a bug. Dropout on, policy and reference not identical, or mismatched batches. Held-out accuracy should be clearly above fifty percent and well below a hundred. Somewhere around sixty to eighty is plausible for UltraFeedback with a small model and one epoch. And your disagreement count from reading twenty pairs is a rough ceiling. If you disagreed with a fifth of the labels, don't expect the model to agree with more than about eighty percent.

A: The rejected log-prob should fall clearly. The chosen one may fall too. On real data the drop is usually much milder than the toy, but it's common for chosen to end a bit below where it started. If chosen falls by tens of nats, your learning rate's too high or your beta's too low. Length goes up, by an amount that depends on how hard you pushed. And if the judge's win rate drops a lot when you equalize lengths, a big part of your improvement was length. And for parity, if your step-zero log-probs differ from T R L's by more than about a tenth of a nat per sequence, look at tokenization before anything else.

<!-- section: Break It -->

A: Then you break it. On purpose. First, turn dropout back on in the toy. GPT two's default dropout is point one. When I did that, step-zero loss came out point six nine six instead of point six nine three, and accuracy point three nine instead of zero.

B: [skeptical] Point three nine at step zero? Before it's trained anything?

A: Because the policy's in training mode, with dropout randomly switching off bits of the network, and the reference is in eval mode, with no dropout. So even at step zero they're different models. The log-ratios aren't zero, they're random noise. Some pairs happen to land the right way, so accuracy isn't zero. That's why T R L turns dropout off by default. On a toy it's a small effect. On a real run, it's noise injected straight into every margin.

A: Second, fix the falling log-probs.

B: Could you just... also do S F T on the chosen answer? Tie it down so it can't sink.

A: That's exactly the fix. Add an S F T term on the chosen responses to the toy's loss. The negative log-prob of the chosen answer, divided by its length, times a weight, alpha, which you set to one. In my run, the chosen log-prob went from minus point eight six up to minus point zero eight. That's a probability of about ninety-two percent. The rejected still fell, to minus five. And accuracy stayed perfect. The S F T term anchors the absolute level of the chosen answer, which D P O on its own never looks at. It's the idea behind several published recipes, like a negative log-likelihood term in iterative D P O for reasoning, and a loss called D P O Positive from the Smaug paper. But there's a trade-off. You're back to imitating the chosen text. Which is the thing you were trying to get away from at the very start, with your tired explanations. So keep alpha modest on real data.

A: Third, forget the prompt mask. Change your log-prob function to sum over the prompt tokens too. The loss barely changes, because the prompt cancels in a minus b when both sequences share it. But the chosen and rejected log-probs jump to much more negative numbers, and they no longer mean "the log-prob of the response". Then break the cancellation. Truncate long examples from the left, so the chosen and rejected versions keep different amounts of prompt. Now the prompt doesn't cancel, and the model gets credit for prompt text it didn't write.

A: And fourth, turn beta down and the learning rate up. On the half-billion model, try beta point zero one with a learning rate of five times ten to the minus six. Watch held-out accuracy and the chosen log-prob, and then actually read the generations. The usual result: margins explode, both log-probs dive, and the text drifts into repetition or odd formatting. While the dashboard looks great.

B: [dry] The dashboard always looks great.

A: [laughs] It really does. Then try beta one. The model barely moves at all. So now you've seen both ends of the leash.

B: So if someone shows me a run with ninety-five percent training accuracy, and the chosen log-probs are falling... it's working?

A: [thinking it through] Not necessarily. D P O only cares about the gap. So it can widen the gap by pushing both down, with the rejected one falling faster, and the probability goes off to answers outside the dataset that might be worse than both. Ninety-five percent on training pairs might just be overfitting. So check held-out accuracy, read the generations, check length, and compare against the reference with a judge. And the fixes: lower learning rate or fewer steps, higher beta, an S F T term on the chosen answers, or pairs where chosen and rejected are less alike. Near-identical pairs are a known trigger. Our toy is the extreme version, one token apart.

B: And how does all this scale? Say I wanted to do it on a seventy billion parameter model instead of half a billion.

A: Both get bigger with the model. The constants are what differ. D P O is one trained model, about sixteen bytes a parameter, plus a frozen reference at two, and you can drop the reference entirely by precomputing its log-probs. So seventy billion is roughly one point one terabytes for the trained model, plus activations. That's a lot of GPUs, but it's ordinary supervised-training infrastructure. P P O is two trained models and two frozen ones, so roughly double the memory. Plus generation inside every single step, which is slow, limited by memory bandwidth, and usually needs a separate inference engine that you keep in sync with the trainer's weights. At seventy billion, that orchestration is the hard part. But there's a flip side. D P O only knows the pairs you collected. P P O keeps learning from the model's own new answers.

<!-- section: Connections and close -->

A: And that's where the next step goes. Methods like G R P O go back to sampling from the model being trained, like P P O, but they drop the value model and replace the learned reward with a check you can actually run, like "did the code pass the tests". And the question to carry into that is: when your reward is a unit test instead of a person's opinion, what goes wrong in new ways? If you want the real thing, the D P O paper itself is the one to read, section four and that appendix, along with Nathan Lambert's free book on R L H F.

B: [working it out] Okay, let me try to say the whole thing. People are better at picking which of two answers is better than at writing the best one. R L H F turns those picks into a reward model, then uses P P O to push the model toward high reward while staying close to where it started. D P O notices that the best policy for that has a formula, flips it so the reward is written in terms of the policy itself, and since preferences only care about differences, the impossible part cancels. So you just train the model directly on the pairs. Chosen goes up, rejected goes down.

A: [gently] Almost. Except that last part. Chosen doesn't have to go up. D P O only ever sees the gap between them, how much the policy moved the chosen answer relative to the reference, minus how much it moved the rejected one. It'll widen that gap any way it can, including by sinking both. So the model is its own reward model, read off through those ratios. And that's exactly why you watch the absolute log-probs, and the length, and not just the accuracy.
