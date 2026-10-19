<!-- section: Three messages -->

A: [relaxed, thinking out loud] So picture a team channel, one afternoon. Three messages land, one after another. The first one says, "I swapped our attention for MQA, the loss got a little worse, so MQA is out." The second one says, "GQA matches the original and has fewer parameters, so it's more efficient." And the third one says, "I ran decoding on both, GQA is three times faster. Ship it."

B: Okay. Honestly those all sound fine to me. Somebody ran something, got a number, made a call.

A: They're all real measurements. That's what makes it tricky. And not one of them actually answers the question they think they're answering.

B: [skeptical] Even the second one? Same loss, fewer parameters. I mean, that's kind of the definition of efficient, isn't it?

A: That's the most natural way to think about it, and it's the one I want to pull apart. Nobody's paying for parameters. Parameters just sit there. What you pay for is GPU hours, which is really arithmetic. So "fewer parameters" is counting the wrong thing.

B: Okay, fair. What's wrong with the first one?

A: The first person tuned the learning rate for the original design, and then just reused it for MQA. Different designs often want different learning rates. And they ran each one once, with one random starting point. So the little gap they saw could be the borrowed setting, or plain luck. And the third one, the three times faster, they measured with lots of users at once and long prompts. That's exactly where GQA shines. With one user and a short prompt, the difference is small.

B: So everyone's right about what they saw, and wrong about what it means.

A: Right. Because "compare two designs" sounds like one experiment, but it's really three decisions you make before you run anything. What do you hold equal? What do you measure? And which do you care about, training the thing or serving it? Get those wrong and you can make either design win.

<!-- section: A famous flip -->

A: And this isn't just a small-team mistake. The whole field made it once. In twenty twenty, Jared Kaplan and colleagues at OpenAI trained hundreds of models and found that loss falls smoothly as you add parameters, data, and compute. Which was huge, because it gave everyone a common currency. Instead of "my model beats yours", you could say "my model gets to your loss with less compute."

B: That sounds like exactly the right currency.

A: It was. And one of their conclusions was, as your budget grows, spend most of it on a bigger model, and not that much on more data. And big models got sized that way. GPT three, and DeepMind's Gopher.

B: I feel like there's a "but" coming.

A: [amused] There's a "but". Two years later, DeepMind redid the experiment. The Chinchilla paper. And they got a different answer. Grow the model and the data about equally. And a big part of why the answers differed was a setup detail. In Kaplan's runs, the learning-rate schedule, the plan for how the step size shrinks over training, wasn't matched to how long each run actually was. So the shorter runs were handicapped. And that tilted everything toward big models trained briefly.

B: Huh. So it's not that the models were different. It's that the runs were set up differently.

A: And the punchline is Chinchilla itself. A model about a quarter the size of Gopher, trained on a lot more data, with the same compute, beat it. A careful, famous comparison flipped, and it flipped because of how the runs were set up, not because of the models. Your two-design comparison has the same traps, just smaller.

<!-- section: The currency -->

B: Okay, so if parameters are the wrong thing to count, what's the right one?

A: Arithmetic. The unit is called a FLOP. It's just one add or one multiply on decimal numbers. And the reason people count FLOPs instead of time is that time depends on which GPU you used and how good your code is. FLOPs don't depend on either. It's the cost of the design itself.

B: And you can actually count that? For a whole model?

A: Pretty easily, which is the nice part. Almost everything in a transformer is a weight matrix multiplied by the word's vector. And when one word goes through, every weight in that matrix gets used once. One multiply, one add. So the cost of a word is basically twice the number of weights. That's the famous shortcut.

B: And for training?

A: Training is about three times that. Because after the forward pass, the backward pass has to do two jobs for every weight matrix. It has to pass the blame back to the earlier layers, and it has to work out how this layer's own weights should change. Each of those is the same size of multiply as the forward pass. So, one forward, two backward, about three times the cost.

B: [working it out] So if I know the size of the model and how many words I train on, I basically know the bill before I start.

A: Before you start. But the shortcut leaves out two things, and at the sizes you'd train on the Spark both of them matter. One is attention itself. Comparing each word against all the earlier words uses no weights at all, so the shortcut doesn't see it, but it grows with how long your context is. With a small model and long context, it can cost more than all the weights put together. The other is the very last step, where the model scores every word in the vocabulary. With a small model, that's a big slice of the work.

B: So two designs could look the same on the shortcut and actually cost different amounts.

A: Right. If one of them has a longer context, or a different vocabulary, you're measuring them both with a ruler that's short by a different amount for each.

<!-- section: What fair means -->

A: So now the heart of it. You've got two designs. What do you hold equal? You could hold the number of weights equal. You could hold the arithmetic equal. Or you could hold the hours on the clock equal, on your machine.

B: And those give different answers?

A: They can give opposite answers. Imagine a design that reuses its weights more. Say it runs the same block twice. It does more work per weight, and it gets more out of each weight. Now compare it at equal weights. Obviously it wins. It's doing way more arithmetic. That's free extra compute.

B: Right, it's not a fair fight.

A: But compare it at equal arithmetic, and now it has to train on fewer words, or be a smaller model, to stay inside the same budget. And that can cost it more than it gained. So it wins at equal weights and loses at equal arithmetic. And a design that's a little weaker but cheaper per word does the reverse.

B: [skeptical] Okay, but then who decides which one is "right"?

A: For "compute efficiency", the default is equal arithmetic. Because compute is what you're actually paying for, and it's the thing you can move around. With a fixed budget you can always pick a bigger model trained on less data, or a smaller one trained on more. A fair comparison lets each design pick for itself.

B: How do you let it pick?

A: That's the Chinchilla trick, and it's lovely. You fix a budget. Then you train several model sizes, and each one spends exactly that budget. So the small ones see lots of data, and the big ones see less. Then you plot how good each one ended up against its size. And you get a U. Too small and the model can't hold enough. Too big and it never saw enough data. The bottom of the U is the best you can do with that budget. It's called an isoFLOP curve, "iso" just meaning equal. Equal FLOPs.

B: And then you do that for both designs and compare the bottoms.

A: Compare the bottoms. And then do it again at a couple of bigger budgets. Because a design can win small and lose big, and you can't see that from one point.

<!-- section: Sharing the notes -->

A: So let's run the actual designs through this. You remember the KV cache. When a model writes text, it keeps notes for every earlier word, the keys and values, so it doesn't redo the past each time. And in the original design, multi-head attention, every attention head keeps its own set of those notes.

B: Right, every head has its own keys and values.

A: In twenty nineteen Noam Shazeer noticed that decoding was slowed down by reading all those notes out of memory. So he tried making all the heads share one set. That's multi-query attention, MQA. Much smaller notes, costs a little quality. And then later, Joshua Ainslie and colleagues found a middle ground. Group the heads, and each group shares one set. That's grouped-query attention, GQA. Quality close to the original, speed close to MQA.

B: [working it out] So in training, GQA is doing less work, because there are fewer of those key and value bits to compute. That's why it's more efficient.

A: That's the thing that surprised me. It barely changes training arithmetic. The bits it shrinks are a small slice of the total. The big costs, the feed-forward part, the attention comparisons themselves, the vocabulary step, none of those move. Every head still looks at every earlier word. So per unit of training compute, you'd expect them to come out roughly tied. And that "roughly" is exactly the kind of claim you want to check, not repeat.

B: So where's the win?

A: Serving. And serving is a completely different world. You know from watching the Spark type that writing each word is slow because of bytes, not math. Every step, you drag the whole model across from memory. And on top of the model, you drag every user's notes across too.

B: Oh. So shrinking the notes only matters when the notes are big.

A: That's it. One user, short prompt, the model's weights are most of the bytes, and the notes are tiny. Shrink them and you barely notice. That's the "barely faster" case. But lots of users, long conversations, now the notes are most of the bytes. Cut them by a lot, and each step gets a lot faster, and you can fit way more people in memory at once. That's where the three times came from.

B: So both people in that channel were right. It's just they were answering different questions.

A: Right. For training, roughly a tie. For serving at real load, a big win, and it grows with the number of users and the length of the context. And that's why basically every modern open model uses GQA. You pay almost nothing when you train it, and you save a lot for the much longer life it spends being served.

<!-- section: Is the gap even real -->

B: Okay, but going back to that first message. A little bit worse loss. How do I know if a little bit worse is real?

A: You train the same design twice with different random starts, the seed, and you'll get two slightly different results. And at the sizes you'd train on the Spark, that spread is about the same size as the differences you're hunting for. So one run per design tells you almost nothing.

B: So you need several seeds.

A: Several seeds, at least near the bottoms of those U's. And then you watch out for confounders. A confounder is anything other than the design that's different between the runs, and that you end up crediting to the design. A learning rate tuned for one and not the other. A schedule that doesn't end when the run ends, which is the Chinchilla thing again. Counting arithmetic one way for one design and another way for the other.

B: [laughs] It sounds like the default should just be suspicion.

A: It kind of is. A team at Google once took dozens of published transformer tweaks and re-tested them all in one shared codebase. Most of them didn't help. The ones that did were mostly small and cheap. So when a change looks like a big win, look for the confounder first. And honestly, the ruler can lie too. When I checked my own arithmetic counter against PyTorch's built-in one, PyTorch came up short. By exactly the attention. The fast fused attention code just wasn't being counted at all. If I'd trusted it, I'd have been comparing designs with a ruler that couldn't see the one part that differs between them.

<!-- section: Ending -->

B: Okay, let me say it back. Before you compare two designs, you have to pick what's held equal, and that can decide the winner on its own. The fair default is the same amount of arithmetic, letting each design pick its best size. And then separately you ask what it costs to serve, which is about bytes, and that's where something like GQA actually wins. And because of all that, GQA is basically a free lunch.

A: Almost. The one thing I'd sharpen is "free". In training it's roughly a tie, and you only know that if you ran the seeds and tuned each one's learning rate. It's not free because someone said so, it's free because you measured a tie in one place and a big win in the other. That's really the skill. Not knowing which design wins. Knowing what question each number answers.
