<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you've built GPT two from scratch more than once. Attention, the causal mask, all of it. And I'd bet something like this has happened. You have an idea. A new twist on attention, or a different normalisation, something from a paper. You wire it in, you train it, and the loss goes down a bit. Then you sample from it and it's mush. And you're left sitting there not knowing whether your idea was bad, or your training was.

B: Yeah. That's basically every side experiment I've ever done.

A: And that second possibility is the whole problem. A training run has maybe twenty settings, and each of them, if it's wrong, quietly costs you a lot. A learning rate ten times too low doesn't crash. It just makes a model that looks dumb. Forget the warmup, it doesn't crash, it just costs you a bit. Feed the model the wrong targets and it doesn't crash either. It gives you a beautiful loss curve.

B: [skeptical] Hang on. If the loss curve looks great, isn't that, I mean, isn't that the one thing you can trust? If something's really broken, I'd expect it to blow up, or at least for the loss to look bad.

A: That's the picture almost everybody starts with. Broken means crash, or broken means an ugly curve. And the truth is the nastiest bugs in training make the curve look better, not worse. None of them throw an exception. All of them make your idea look like it failed.

B: So how does anyone get anything to work?

A: Honestly, the people who get good results aren't mostly more creative. They have a baseline that works. A run they trust. And they change one thing at a time against it. And they have a handful of really cheap checks that catch the silent bugs in the first five minutes, instead of the fifth hour. That's the thing worth building. Not a model. A run you can trust.

<!-- section: Someone else's curve -->

A: [warm] And there's a nice history to how that became possible for one person. In twenty nineteen, OpenAI put out GPT two. The paper gave you the architecture, but a lot of the training recipe just wasn't in there. How big a step, how many examples per step, all that. The GPT three paper a year later filled in a lot of the missing pieces for a small model about the size of GPT two small.

B: And then Karpathy.

A: And then Karpathy. He turned the recipe into something you could read in an afternoon. nanoGPT, a few hundred lines of model and a few hundred lines of training loop. And then llm.c, the same training in plain C and CUDA, and he showed GPT two small reproduced in about an hour and a half on one rented machine, for about the price of lunch.

B: [working it out] So the reason that matters for me isn't really the code. It's that there's a known-good run out there.

A: That's the real gift. There are published curves. When your run is a couple of thousand steps in, you can check whether a known-good run was at roughly the same loss at the same point. And if yours disagrees with theirs, you assume yours is wrong first. That's why the real run trains on the same data they used, a slice of filtered educational web pages called FineWeb-Edu. And for the five-minute smoke tests there's TinyStories, a pile of short children's stories, so simple that a tiny model learns to write little stories in minutes. TinyStories is your unit test. FineWeb is your integration test.

<!-- section: The arrows, not the boxes -->

A: So picture the whole pipeline. Raw text, then the tokenizer, then a file of token numbers on disk, then a loader that hands out batches, then the model and the optimizer, then checkpoints, then sampling and evals. You've built the model box many times. And here's the thing. Most of the silent bugs don't live in the boxes. They live in the arrows between them.

B: Like what?

A: Like the tokenizing. It's slow, Python-heavy work, and training wants millions of tokens a second. So you never tokenize during training. You do it once, up front, and write the token numbers to disk as one long flat row of small integers. During training you just read slices of it. And you put an end-of-text marker between documents, so the model learns that what comes after is unrelated.

B: Okay, that's just plumbing.

A: It's plumbing, and it's where you can get burned. Another arrow: the validation data. It has to be text the model never trains on, or the validation loss means nothing. So you split it off by file, before anything else. If you instead cut random windows out of one big file into "train" and "validation", the windows overlap, and the same sentences end up in both.

B: And then the model looks great on validation because it's already seen it.

A: Right. And the most important arrow of all: the target. The model's job at every position is to predict the next token. So the target is the input, shifted over by one. Get that shift wrong and the loss becomes a lie.

<!-- section: The first number -->

A: So here's my favourite check, and it costs one forward pass. Before you train at all, what should the loss be?

B: [working it out] Before training... it's random weights, so... I don't know, high? It's random.

A: You can say exactly how high. With small random weights, the model's scores for every possible next token are all close to zero. So it gives every token about the same probability. One over the size of the vocabulary. And the loss is basically "how surprised were you by the right answer". So at step zero, the loss should be the log of the vocabulary size. For GPT two's vocabulary that comes out at about eleven.

B: Huh. So there's a right answer before you've done anything.

A: There's a right answer. And when I built the model and ran one batch through it untrained, it came in just a hair above that, which is what you'd expect. Then I made one change, I started the weights way too big. And the first loss was huge. Many times higher. Because now the model is extremely confident and extremely wrong, before it's learned a single thing. A run that starts there spends ages just undoing its own starting point.

B: So if your step zero number isn't about eleven, you stop.

A: You stop. That one number catches a broken init, a wrong vocabulary size, the loss being averaged wrong, labels from the wrong tokenizer. It's the cheapest check in deep learning.

<!-- section: Too good to be true -->

B: Okay, but you said a broken run can make the curve look better. How?

A: So here's the one I really want you to see once. Take the shift away. Make the target just equal to the input. Now at every position, the model is being asked to predict a token it can already see.

B: Oh. So it just copies.

A: It just copies. The loss dives toward zero. Training looks superb, validation looks superb. And then you sample from it, and it's garbage. The loss measures exactly what you told it to measure. Nothing more.

B: [skeptical] But you'd notice that, wouldn't you? A loss near zero on web text?

A: You'd notice the extreme version. A small model on web text never gets anywhere close. But a leak can be partial, and subtle. So there's a test for it. Feed the model completely random tokens. With a correct pipeline, there's nothing to learn, so the loss can never get better than that step zero number. A correct pipeline just sits there. When I tried it on my Mac with a tiny model and set the target equal to the input, the loss fell, on pure random noise. Fast.

B: Learning from random noise. That's the tell.

A: That's the tell. If the loss drops on random tokens, the model can see its answers. And there's a matching check in the other direction. Take one small batch and train on it over and over. A working model has to memorise it, loss right down to nearly zero. When I did that on the Mac, it was basically there within a few dozen steps. If yours stalls halfway, something between the loss and the weights is broken. Wrong targets, a detached tensor, an optimizer that was handed the wrong parameters, a learning rate of zero.

B: So one check proves it can learn, the other proves it isn't cheating.

A: That's a nice way to put it.

<!-- section: The recipe -->

A: [relaxed] Then there's the recipe itself. And I'd rather you understand why each piece is there than memorise numbers. The learning rate is the most important number in the whole run. Get it within a factor of two of good and most other settings stop mattering much.

B: And the warmup is the ramp at the start.

A: The ramp at the start. And it's protecting the most fragile moment there is. Step zero. The weights are random, the gradients point in wild directions, and Adam's running averages are empty, so its first steps are oddly sized. A full-size step on top of all that can throw the model somewhere it never quite recovers from. A few hundred steps of ramping up is cheap insurance.

B: And then it decays.

A: Then it slowly comes down, along a cosine curve. Early on, big steps make fast progress. Late in training, the model is in a narrow valley, and big steps just bounce off the walls. Lowering the step lets it settle onto the floor. You actually see it, an extra little dip in the loss near the end. And then there's clipping. Every so often a batch produces a gradient way bigger than usual. A weird document, a rare token. One giant step can undo hours of progress. So you measure the size of the whole gradient, and if it's over a limit, you scale it down. Same direction, capped size. And you log that size every step, because spikes in the gradient show up before spikes in the loss. It's your early warning.

B: What about batch size? On the Spark I'd just use whatever fits.

A: That's the tempting move, and it quietly breaks the recipe. For language models you think of the batch in tokens per step, not sequences. And the published learning rate was tuned for a specific, big batch. Smaller batches give noisier gradients and want a smaller learning rate. Change one, and you've changed the other. So you keep the big batch, and you build it out of small pieces. Run a bunch of small batches, add up their gradients, and step once. That's gradient accumulation. And then the published numbers still apply to you.

<!-- section: One run a night -->

B: How long is the real run?

A: There's a rule of thumb for that, from DeepMind's Chinchilla paper. They trained hundreds of models of different sizes on different amounts of text and asked, for a fixed amount of compute, what's the best split? And the answer was roughly, grow them together, about twenty tokens of text for every parameter in the model.

B: And for GPT two small that's a couple of billion tokens.

A: A couple of billion tokens. And when you work out the compute against what the Spark can do, it comes out to an overnight run. Somewhere around half a day. And that tells you something really important before you write any code. You get about one full-size run a day.

B: [working it out] So anything I want to learn about settings, I can't learn on the real run.

A: You can't afford to. You learn it on small, fast runs first. Like, take a much smaller model, and sweep the learning rate. Five runs, change nothing else. Same seed, same data. And you'll see a U shape. Too low is slow, too high is unstable, and the bottom is usually just below where things start to go unstable. It won't hand you the exact number for the big model, smaller models tolerate bigger steps. But you see the U with your own eyes.

B: And there's a number for how well you're using the chip, right?

A: There is. It's the fraction of the chip's top speed that your model's actual math is using. And on the Spark, one of the switches that matters most is letting PyTorch fuse lots of little operations together. Because the Spark's memory is slow compared to its math, every little operation that reads and writes a whole tensor costs more than it would on a big data-center GPU.

<!-- section: Trust the ruler too -->

A: And the last piece of trust is the eval. Validation loss is your main number. It's cheap, smooth, and it's exactly what you trained for. But it doesn't tell you whether the model knows anything. So you add one small task. HellaSwag. A short bit of context and four possible endings, one real and three traps. The model just picks the ending it finds least surprising.

B: And a model this small is barely above guessing on that, isn't it?

A: Barely above chance. Which is exactly why it's a good small eval. It moves as you train. And here's the habit that matters. You don't only score your own model. You also download OpenAI's actual GPT two small and score it with your exact same code. Because there's a known answer for it.

B: Oh. So if their model doesn't get what it's supposed to get on my harness...

A: Then your harness has a bug, and every number you got from it was wrong too. Same idea as the init loss, same idea as the published curve. Every measurement you make, you hold up against something you already know the answer to.

<!-- section: Ending -->

B: Okay, let me try it. Training runs don't fail loudly. They fail by being a bit worse, and sometimes by looking too good. So the actual work isn't the model. It's getting one run you trust, by matching a known-good curve, and having cheap checks: the loss at step zero should be about eleven, random tokens shouldn't be learnable, one batch should be memorisable. And then you only ever change one thing at a time against that run.

A: That's it. The bit I'd sharpen is why the checks work. Every one of them is a case where you know the answer before you run it. The step zero loss, random noise, one tiny batch, OpenAI's own model on your eval. You're not asking "does this look good". You're asking "does this match what it has to be". And once your baseline passes all of those, a worse curve finally means something. It means your idea, not your plumbing.
