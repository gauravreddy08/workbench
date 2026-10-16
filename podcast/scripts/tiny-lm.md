<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you've built G P T two from scratch. More than once. Attention, the causal mask, RoPE in the Llama version, all of it, fine. And every time you tried something of your own... a new attention variant, a different normalization, some trick from a paper... it went the same way. The loss went down a bit. The samples were mush. And you couldn't tell if the idea was bad, or the training was bad.

B: [a bit unsure] I mean, I'd have assumed the idea. If the training were actually broken, something would blow up, right? You'd get a crash, or the loss would go to NaN, or... something loud.

A: That's the trap. Almost nothing in a training run is loud. A run has maybe twenty settings, and each one, if it's wrong, quietly costs you something like a factor of two. Set the learning rate ten times too low. It doesn't crash. You just get a model that looks dumb. Forget warmup, it doesn't crash, it costs you a few percent. Feed the model the wrong targets... it doesn't crash either. It gives you a beautiful loss curve. Like, gorgeous. None of these throw an exception. And every single one of them makes your creative idea look like it failed.

B: Huh. So the "it didn't work" was maybe never about the idea.

A: Maybe never. And here's the thing about people who get good results. They're mostly not more creative than you. They have a baseline that works. One run they trust. And they change one thing at a time against it. Plus a checklist that catches the silent bugs before those bugs eat a whole night of compute. So that's what this is. One trusted, end-to-end training run of a small language model on the Spark, from raw web text to a checkpoint you can sample from. And the habits around it.

<!-- section: Origin -->

A: And there's a nice history here, because the recipe itself was kind of a secret for a while. February twenty nineteen, OpenAI releases G P T two. A family of models from a hundred twenty-four million parameters up to one and a half billion, trained on something called WebText, which was a scrape of pages that had been linked from Reddit. The paper, "Language Models are Unsupervised Multitask Learners", by Radford and others, gives you the architecture. But a lot of the training recipe? Just... not in there.

B: So you knew what to build but not how to train it.

A: Pretty much. Then the G P T three paper a year later, Brown and others, twenty twenty, filled in a lot of the missing numbers, for a small version they called G P T three Small, about a hundred twenty-five million parameters. Batch size of half a million tokens. A peak learning rate of six times ten to the minus four, which people write as six e minus four, so zero point zero zero zero six. Warmup. Cosine decay. Weight decay of zero point one. Gradient clipping at one. Every one of those is coming back today, and you'll know why each is there.

A: Then Andrej Karpathy turned the whole thing into something you could read in an afternoon. Nano G P T, late twenty twenty-two. About three hundred lines of model, three hundred lines of training loop, and it reproduces G P T two's smallest model on an open copy of that Reddit-linked web text. Then in twenty twenty-four came L L M dot C. The same training, written in plain C and CUDA. And a write-up showing G P T two's small model reproduced in about ninety minutes, for about twenty dollars, on one machine with eight A one hundred GPUs, trained on ten billion tokens of a dataset called Fine Web Edu. There's a companion video, "Let's reproduce G P T two", and a repo called build nano G P T, that walk through every line. Including the boring ones that turn out to matter.

B: [amused] The boring ones are always the ones.

A: [laughs] Always. So this whole episode follows that lineage. When in doubt, those repos are the reference. And when your run disagrees with them... assume your run is wrong first.

<!-- section: The Idea: The whole loop -->

A: Okay, so let me draw the whole loop, start to finish, like over the phone. Top row, left to right, three boxes. Raw text, which is the web pages. Then the tokenizer, G P T two's, which also sticks a special end-of-document marker in front of each document. Then token files on disk. Each token stored in two bytes, split into training files and a validation file. That whole top row runs once, up front. It just writes files.

A: Then underneath, a dashed box. The training loop. It runs about five thousand times. Inside it, left to right: a loader, which reads a batch out of those files. Then the model, the hundred twenty-four million parameter GPT, running in B F sixteen and compiled. Then the loss. Then the optimizer, Adam W, which clips the gradient, looks up the current learning rate, and updates the weights. And a line loops back from the optimizer to the model. New weights. Round and round.

A: Off to the side, every so many steps, the loop writes a checkpoint. And a checkpoint isn't just the model. It's the model, plus the optimizer's state, plus which step you're on, plus where you are in the data. And from the checkpoint, two last boxes. Sampling, which is generating text from it. And evaluation: a validation score and a little benchmark called Hella Swag.

B: [working it out] And the middle box, the model. That's the part I've actually built.

A: That's the part you've built many times. This is about every other box. And the arrows between them. Because that's where runs die quietly. Off in the corner I'd write four of them. A token ID that doesn't fit in two bytes and wraps around. Targets that aren't shifted from the inputs. Validation documents that are also in the training data. And a loader that keeps replaying the same file. We're going to meet every one of those.

<!-- section: The Idea: Choosing the text -->

A: First real decision: what does the model read? Because it can only get as good as its text. Two good choices, for two different jobs. The first is Tiny Stories, from Eldan and Li, twenty twenty-three. About two million short children's stories, written by G P T three point five and G P T four, using a deliberately tiny vocabulary of words. A few hundred million tokens in total. Check the exact count on the dataset page. And its superpower is fast feedback. A model with only a few million parameters learns to write coherent little stories in minutes. So you can tell a working pipeline from a broken one before your coffee's cold.

B: What's the catch?

A: It only teaches you about Tiny Stories. Nothing you learn about settings transfers cleanly to real text. The second choice is Fine Web Edu, Penedo and others at Hugging Face, twenty twenty-four. Web pages from Common Crawl, filtered by a classifier that was trained to spot "educational" pages. And it has ready-made samples, including one called sample ten B T. A random ten-billion-token slice. That's exactly what L L M dot C and build nano G P T trained on. Which is its superpower. There are published curves to compare against. When your run is at step two thousand, you can check whether a known-good run was at about the same loss at step two thousand.

A: So: Fine Web Edu's ten-billion sample for the real run, Tiny Stories for the five-minute smoke tests. You're not trying to make the best small model in the world. You're trying to make a run you can trust. And the fastest way to trust a run is to have somebody else's run to hold it up against.

B: So Tiny Stories is like a unit test, and Fine Web is the integration test.

A: Exactly that. And you won't use all ten billion tokens. We'll work out later that about two and a half billion is the sensible budget for this model size. Which, on the Spark, is one night.

<!-- section: The Idea: Tokenize once -->

A: Now the files. Tokenizing is slow, Python-heavy work. Training wants to read millions of tokens a second. So you never tokenize during training. You do it once, up front, and write the token IDs to disk as one long flat array of integers. During training you just read slices out of it.

B: [skeptical] Couldn't you tokenize on the fly in a background process, though? Like, keep a buffer full?

A: You'll actually check that. When you tokenize, you time it, and you'll see it couldn't have kept up. But even if it could, you'd be burning CPU every single run to redo the same work. So, once. And three decisions make that file right.

A: First, use the smallest integer type that fits. G P T two's tokenizer has fifty thousand two hundred fifty-seven tokens. So every ID is between zero and fifty thousand two hundred fifty-six. An unsigned sixteen-bit integer, which is written U int sixteen, holds zero up to sixty-five thousand five hundred thirty-five. So it fits, and every token is two bytes. Two and a half billion tokens is five gigabytes on disk. If you'd used the sixty-four-bit integers PyTorch gives you by default, it'd be twenty gigabytes. Four times as big, for nothing.

A: And there's a trap waiting in that choice. If you ever switch to a tokenizer with more than sixty-five thousand five hundred thirty-six tokens, like Llama three's, which has about a hundred twenty-eight thousand, the IDs don't fit anymore. You need thirty-two-bit. And if you silently cast to sixteen-bit anyway, the big IDs wrap around. They don't error. They just turn into other, smaller IDs. Garbage that looks like valid tokens. So you assert the biggest ID fits before you cast. One line.

B: That's one of the four bugs in the corner.

A: That's the first one, yeah. Second decision: a separator between documents. G P T two has a special token, number fifty thousand two hundred fifty-six, called end of text. It marks the boundary between two documents, so the model learns that whatever follows has nothing to do with what came before. You put it in front of every document, and then you just concatenate everything into one stream. Ignore where documents end. So a training window of a thousand twenty-four tokens will often cover the end of one web page and the start of the next one, and that separator is the model's signal that the context resets there. This has a name, packing. You glue all the documents into one long stream and cut it into fixed-length windows, so you never waste compute on padding. It's what G P T two did and what nano G P T does.

A: Third decision: you read the file with a memory map. Quick reminder of what that is. Normally, to use a file, you read it into memory. With a memory map, the operating system hands you something that looks like an array, but nothing's been read yet. When you touch a slice of it, the OS loads just those bytes from disk, on demand, and keeps them in RAM in its page cache, which is its stash of recently used file pieces. So in NumPy you open the file as a mem map, unsigned sixteen-bit, read only, and you get what looks like a five-gigabyte array instantly. And on the Spark, with a hundred twenty-eight gigabytes of memory, after the first pass through the data the whole five gigabytes just lives in the page cache.

<!-- section: The Idea: The shift -->

A: Now the most important arrow in the whole pipeline. Picture the file as one long row of little boxes, each box one token ID. End of text, then a handful of IDs for document one, then end of text again, then document two, and so on. A training example is any stretch of T plus one consecutive tokens, starting anywhere. T is the context length, a thousand twenty-four in the real run. Let's do it with five so it fits in your head. You grab six tokens. Call them one through six. The input, which everyone calls x, is the first five: one, two, three, four, five. The target, y, is the same window shifted left by one: two, three, four, five, six. So position one in x is graded on token two. Position two is graded on token three. Every position is asked to predict the token right after it.

B: And if the window crosses a document boundary, the end of text token is just sitting in the middle of x.

A: Just sitting there, yeah, and one position's job is literally "predict that a new document starts here", and the next one's is "predict the first word of a new document". That's fine. And then you stack B of these windows on top of each other, and that's one micro-batch, B rows by T columns. Now, the thing to burn in: if you get that shift wrong, the loss becomes a lie. It'll report numbers that look great and mean nothing. We'll see exactly how good it looks later.

<!-- section: The Idea: The loader -->

A: So the loader's whole job fits in one sentence. Given a batch size B and a context length T, hand back x and y, both B by T, where y is x shifted by one. And three details make it correct. First, hold out validation data before you do anything else. Validation data has to be text the model never trains on, or the validation loss means nothing.

B: So you take the big file and randomly pick, say, one percent of the windows as validation.

A: [gently] That's the natural way, and it's wrong here. Windows overlap. A window starting at position one thousand and one starting at position one thousand and fifty share almost all their tokens. So the same sentences end up in both train and val, and your validation loss is partly a test on stuff it trained on. The clean split is by file. The first shard, the first file, is validation. Everything else is training. Done.

A: Second detail. Cover the data, don't just sample it. The tempting loader picks B random start positions each step. That works, but it's sampling with replacement. So try this. Your training set is cut into one million windows that don't overlap. Each step you draw random windows, with replacement, and you draw one million in total. One epoch's worth. What fraction of the windows does the model ever actually see?

B: [a bit unsure] Most of them? I'd guess... ninety-something percent. Some repeats, but you drew a million out of a million.

A: About sixty-three percent. Here's why. Take one particular window. On any one draw, the chance you miss it is almost one, it's one minus one over a million. Do that a million times in a row, and the chance you missed it every single time works out to about one over e. That's a classic limit. About thirty-seven percent. So thirty-seven percent of your data is never seen, and lots of windows get seen twice, or three times. For a run that goes through the data once, that's a real waste.

B: Oh. So a third of the dataset just... doesn't happen.

A: Doesn't happen. And the fix is cheap. Cut the data into windows, make a list of all the starting positions, shuffle that list once per epoch, and walk straight through it. Every window exactly once.

A: Third detail, small one. Keep the integers small until the last possible moment. You slice sixteen-bit integers from the mem map, then convert to sixty-four-bit, because PyTorch's embedding lookup wants that type, and then move it to the GPU. On the Spark, the CPU and GPU share the same physical memory, but moving it to CUDA still goes through CUDA's memory allocator. At these sizes it's noise, either way.

<!-- section: The Idea: The model -->

A: The model. G P T two's smallest configuration. Twelve layers, twelve attention heads, model width seven hundred sixty-eight, context of a thousand twenty-four. You know this model. Two details worth getting exactly right. First, tie the embeddings. The embedding table is the big matrix with one row per token. Look up a token ID, you get its row, and that vector is where the model starts. And the output layer at the very end, the L M head, which turns the final vector back into a score for every token, is also a matrix with one row per token. Tying means they're the same matrix. One copy, used at both ends.

B: That works? The input meaning and the output meaning of a token are the same vector?

A: It works, and it's what G P T two did. And it saves thirty-eight point six million parameters. With tying, the model has a hundred twenty-four million, four hundred seventy-five thousand, nine hundred four parameters. That's an exact count, done with PyTorch on a Mac with this configuration. Untied, you'd see about a hundred sixty-three million. And of those hundred twenty-four, about eighty-five million are in the transformer blocks. The rest is embedding tables.

A: Second detail. Pad the vocabulary to fifty thousand three hundred four. That's fifty thousand two hundred fifty-seven rounded up to a multiple of a hundred twenty-eight. The extra forty-seven rows are never used as targets, so the model just learns to give them almost zero probability.

B: [skeptical] Wait. You make the matrix bigger, and that makes it faster?

A: [amused] Yeah, it sounds backwards. But GPU matrix-multiply hardware works in tiles. Fixed-size blocks. And when a dimension is a multiple of sixty-four or a hundred twenty-eight, the tiles fill exactly. When it's an awkward number like fifty thousand two hundred fifty-seven, they don't. Karpathy measured a few percent speedup from that one change. And it's your first taste of a theme: the numbers the hardware likes are not the numbers the model needs.

A: Then initialization, the way G P T two did it. Every linear layer's weights and the embedding table drawn from a normal distribution with a standard deviation of zero point zero two. Biases at zero. And one special case. There are two projections in each block that write back into the residual stream, the running sum that flows through the whole network. The attention output projection and the MLP output projection. Those get scaled down further, by one over the square root of two times the number of layers. With twelve layers that's one over the square root of twenty-four, so roughly a fifth. Because every block adds its output onto that stream, twenty-four additions in total, and without shrinking them the stream would keep growing with depth.

<!-- section: The Idea: What the loss means -->

A: Now, the number you'll stare at all night. The loss. It's cross-entropy. For each position, you look at the probability the model gave to the correct next token, take the log of it, and flip the sign. Then average over every position in the batch. It's zero only if the model was certain, and right. And because it uses the natural log, the unit is called a nat. One nat is about one point four four bits. So a small example: if the model gives the correct next token a probability of five percent, that position contributes about three. Three nats.

A: So here's one to try. You build the hundred twenty-four million model with that init, and before any training at all, you push one batch of real text through it. What loss do you expect, roughly? And what would you conclude if you saw sixty-eight?

B: [working it out] It's random, so... it's going to be badly wrong about everything. So big? I don't know, thirty? And sixty-eight, I guess, is just a more random model.

A: About ten point eight. And it's a number you can work out on paper. With small random weights, the scores the model outputs for every token, the logits, are all close to zero. And if all the scores are about equal, the softmax turns them into about equal probabilities. So every one of the fifty thousand two hundred fifty-seven tokens gets a probability of about one in fifty thousand. And minus the log of one over fifty thousand is just the log of fifty thousand. The natural log of fifty thousand two hundred fifty-seven is ten point eight two. With the padded vocabulary it's ten point eight three, same thing.

B: So "random" doesn't mean "wrong about everything". It means "unsure about everything".

A: That's exactly it. Unsure is cheap. Confidently wrong is expensive. Measured on this exact model at init, ten point nine eight. A little above, because the logits are small but not quite zero. Anything from about ten point eight to eleven point two is healthy. Now, sixty-eight. A sixty-eight means the model is extremely confident and wrong at step zero, and that only happens when the logits are huge. An init that's way too large. You can make it happen: initialize the same model with a standard deviation of one instead of zero point zero two, and the initial loss is sixty-eight point two. And a network that starts there spends its first thousand steps just undoing the init. Often it never fully recovers.

A: This is the single cheapest sanity check in deep learning. One forward pass. It catches broken inits, wrong vocab sizes, a loss that's summed where it should be averaged, and labels made with the wrong tokenizer.

A: And to make loss numbers feel like something, there's a conversion. Perplexity. It's e raised to the loss. And you read it as: the model is as uncertain as if it were choosing evenly among this many tokens. So you can tell the story of a run in perplexities. At step zero, loss ten point eight, perplexity about fifty thousand. Random guessing over the whole vocabulary. Down at a loss of seven, perplexity about eleven hundred. The model knows which tokens are common, the "the" and "of" and commas, but nothing about order. At a loss of five, about a hundred fifty. It's picked up local word patterns, something like grammar. The samples are word salad, but word salad with structure. At four, perplexity about fifty-five. Mostly grammatical sentences, but the topic drifts. And around three point three, about twenty-seven. That's roughly where a model this size ends up on web text after a few billion tokens. Paragraphs that actually hold a topic.

B: And if I saw, like, zero point zero five?

A: Perplexity of about one point zero five. Basically certain of every next word. That's impossible on real text. You have a bug. And two warnings about these numbers. First, losses only compare on the same tokenizer and the same validation text. A loss of three point three on Fine Web and one point five on Tiny Stories aren't comparing models, they're comparing datasets. Children's stories are just way more predictable than the web.

B: [skeptical] And the second? Because honestly I'd look at three point three versus three point three two and call that noise.

A: That's the second warning. Small differences matter. At this scale, a change that drops validation loss by zero point zero two nats, consistently, is a real improvement. And a change that costs you zero point zero five is a real regression. Your eye wants to round those away. Don't let it.

<!-- section: The Idea: The optimizer -->

A: The optimizer. Adam W. Quick refresher on Adam itself: for every single weight, it keeps a running average of that weight's gradient, that's the momentum, and a running average of the gradient squared. Then it divides one by the square root of the other. So every weight effectively gets its own step size. The W means the weight decay is "decoupled", which just means the weights shrink a little each step, separately from the gradient update. And the G P T three settings are a good place to stand. Betas of zero point nine and zero point nine five, epsilon of ten to the minus eight, weight decay zero point one.

A: The zero point nine five is the interesting one. Plain Adam's default is zero point nine nine nine. That second beta controls how long the squared-gradient average remembers. Zero point nine five forgets faster, which helps when gradient sizes swing around a lot. And in language models they do.

A: Then weight decay, which is where people get it subtly wrong. Weight decay means shrinking every weight slightly toward zero, each step. A gentle pressure toward small weights. It's a form of regularization.

B: So you just apply it to everything. It's regularization, more is... I mean, it's applied evenly, so that's fair.

A: That's the subtle mistake. You apply it to the two-dimensional weight matrices. Every linear layer, and the embedding table. And not to the biases, and not to the Layer Norm parameters, the gain and the offset. Think about what decaying a Layer Norm gain actually does. That gain multiplies the layer's output. Pull it toward zero and you're literally turning that layer's volume down. There's no reason to want that. And the rule that gets it right is one line. Decay a parameter if it has two or more dimensions. For this model, that puts a hundred twenty-four million, three hundred fifty-four thousand, five hundred sixty parameters in the decay group, and a hundred twenty-one thousand, three hundred forty-four, the biases and the norms, in the no-decay group. So print both group sizes. If your no-decay group is empty, or it has tens of millions in it, something's off.

<!-- section: The Idea: The learning rate -->

A: The learning rate. It's the most important number in the run. Get it within a factor of two of good, and most other settings stop mattering much. And the shape that works is: a linear warmup, from near zero up to the peak, over a few hundred steps. Then cosine decay, down to about ten percent of the peak by the last step.

A: Picture it as a curve. Learning rate going up, steps going across, out to five thousand. It shoots straight up in a thin ramp over the first three hundred steps, to six e minus four. That's about five percent of the run, a sliver. Then it rolls over and comes down along half a cosine wave. Slow at first, steeper in the middle, then flattening out again at the end, landing at six e minus five. Ten percent of the peak.

B: Why the ramp? Why not just start at the peak?

A: Because step zero is the most fragile moment of the whole run. Adam's running averages are empty. It has no history, so its first few steps are oddly sized. And the gradients of a random network point in wild directions. Put a full-size step on top of that and you can throw the model somewhere it never fully recovers from. So a few hundred steps of ramping is cheap insurance. G P T three Small warmed up over three hundred seventy-five million tokens. For a run of two and a half billion, a few hundred steps of half a million tokens each is the same spirit.

A: The peak, six e minus four, is G P T three Small's, and it's a safe place to start. Karpathy found models this size actually tolerate about three times that. You'll find your own with a sweep.

B: [skeptical] And the decay. If big steps make fast progress, why give that up?

A: Because the landscape changes under you. Early on, you're far from anything good, and big steps cover ground. Late in training, the loss surface around you is like a narrow valley, and big steps just bounce off the walls. You never get down to the floor. Lowering the learning rate lets the model settle into the bottom. And you can see it: there's an extra dip in the loss in the last fifth of the run, as the learning rate gets small. The slow tail of that cosine is where the last few hundredths of a nat come from.

<!-- section: The Idea: Batch size in tokens -->

A: Batch size. Quick check. When you trained your G P T two before, what batch size did you use?

B: Like, sixteen? Thirty-two sequences, maybe, whatever fit on the GPU.

A: Right, and that's the picture to change. For language models, think of batch size as tokens per optimizer step. Not sequences. G P T three Small used about half a million tokens per step. Nano G P T uses two to the nineteen, which is five hundred twenty-four thousand two hundred eighty-eight. A power of two near half a million. With a context of a thousand twenty-four tokens, that's five hundred twelve sequences per step.

B: [laughs] That's not fitting in one forward pass on the Spark.

A: It doesn't, and it doesn't need to. That's gradient accumulation. You run several small forward and backward passes, add up their gradients, and only then take one optimizer step. Mathematically it's the same as one big batch. It's just slower per step and lighter on memory. So picture thirty-two little boxes in a row, the micro-batches, each one sixteen sequences of a thousand twenty-four tokens. Each box runs forward and backward, and an arrow drops down from each into one shared bin where the gradients pile up. In PyTorch, that's the grad field on every parameter. Backward adds into it, it doesn't overwrite. After the thirty-second box, the bin goes through two more boxes. Clip the gradient, and log its size. Then the optimizer step, and then you zero the bin. Thirty-two times sixteen times a thousand twenty-four is five hundred twenty-four thousand two hundred eighty-eight tokens per step.

A: And there's one detail that's easy to miss. Because the gradients add, each micro-batch's loss has to be divided by the number of micro-batches. Divide by thirty-two. Otherwise you're summing thirty-two losses instead of averaging them. Hold onto that, because we're going to break it on purpose later. And one practical note: if memory allows a bigger micro-batch, use it. Fewer, fatter passes usually run faster.

B: But why go to all this trouble? Why not just use a small batch, skip the accumulation, and take more steps?

A: Because the batch size is part of the recipe. The six e minus four learning rate was tuned for half-million-token batches. Smaller batches give noisier gradients, and noisier gradients want a smaller learning rate. So if you change one, you've changed the other, whether you meant to or not. Keep the batch at half a million tokens, and all those published numbers still apply to you.

<!-- section: The Idea: Gradient clipping -->

A: Gradient clipping. Every so often, a batch produces a gradient way bigger than usual. A weird document, a rare token, an unlucky moment. And one giant step can undo hours of progress. So before the optimizer step, you measure the size of the whole gradient, every parameter together, as one long vector. That's its L two norm, the ordinary length of a vector. If it's bigger than a threshold, you scale it down to the threshold. Direction kept, size capped. The threshold here is one.

A: And here's the part that makes it more than a safety net. PyTorch's clip function returns the norm from before clipping. Log it. Every step. In a healthy run, the gradient norm settles somewhere below one after the early phase, and then drifts slowly. And spikes in the norm come before spikes in the loss. So it's your early warning.

<!-- section: The Idea: Making it fast -->

A: Now speed. Four switches. None of them change what the model learns, to within noise. All of them change how many tokens per second you get. First one, B F sixteen autocast. You wrap the forward pass and the loss in an autocast block, and the matrix multiplies run in B F sixteen on the tensor cores, the GPU's dedicated matrix units. Meanwhile the weights, the optimizer state, and touchy operations like softmax and the loss itself stay in thirty-two-bit. And you don't need a gradient scaler.

B: [a bit unsure] Wait, the scaler's for... okay, let me get this straight. B F sixteen is the more precise sixteen-bit one, and F P sixteen is the one with the bigger range? So you'd think you'd need the scaler with B F sixteen, if anything.

A: That's backwards, and it's the exact thing worth fixing. A floating-point number spends its bits on two things. The exponent, which sets how big or tiny a number can be, the range. And the mantissa, the digits, which set the precision. B F sixteen keeps the same exponent as full thirty-two-bit floats. Same range. Huge numbers, tiny numbers, all fine. It pays for that with fewer digits. F P sixteen is the opposite. More digits, but a much smaller range. So in F P sixteen, small gradients underflow, they round to zero, and you need loss scaling to multiply everything up into the range and back down. B F sixteen never has that problem. That's why the scaler is F P sixteen's problem, and it's why basically everyone training switched to B F sixteen.

B: So B F sixteen is the wide one. Less precise, but never falls off the edge.

A: The wide one. That's the right picture. Second switch: T F thirty-two, for whatever's still in thirty-two-bit. One setting, float thirty-two matmul precision set to "high", and thirty-two-bit matrix multiplies get to use the tensor cores at reduced precision. Free speed, harmless for training.

A: Third: flash attention. Instead of writing out the attention by hand, the softmax of queries times keys, times the values, you call PyTorch's scaled dot product attention with is causal set to true. And PyTorch picks a fused kernel that never writes the full T by T attention matrix to memory. It computes it in tiles and keeps them on chip. That's the whole story of flash attention.

A: Fourth: torch dot compile. It traces your model and fuses chains of small operations, the adds, the Layer Norms, the gelus, the dropout, into single kernels. And on the Spark this matters more than on a data-center H one hundred. Here's why, quickly. Every one of those little operations, unfused, reads a whole activation tensor from memory, does a trivial bit of math, and writes the whole thing back. That's limited by memory bandwidth, not by math. And the Spark's memory bandwidth, two hundred seventy-three gigabytes a second on the spec sheet, is low compared to its compute. So every unfused operation is relatively expensive there. Fuse them, and you read once and write once. The catch is the first step takes a minute or more while it compiles. The steps after that are faster. How much faster is something you'll measure.

A: And a small fifth one: pass fused equals true to Adam W, if your PyTorch supports it on your device. Then the optimizer update is one kernel, instead of a loop over every parameter tensor.

<!-- section: The Idea: The recipe in one breath -->

B: [working it out] Okay, can I try to say the recipe back in one go? Because it's a lot of pieces.

A: Go.

B: Adam W, betas point nine and point nine five, weight decay point one but only on the matrices. Half a million tokens per step, built out of micro-batches, divide each loss by the number of them. Warmup over a few hundred steps, then cosine down to ten percent. Clip at one. B F sixteen, flash attention, compile for speed.

A: Yes. And the why behind each, because that's what you'd say in an interview. No decay on the norms because shrinking a gain just shrinks the layer. Warmup because the random network and the empty Adam statistics make the first steps fragile. The cosine so the model can settle into the bottom of the valley at the end. Clipping to cap the damage from a freak batch, with the norm logged as an early warning. The speed switches don't change what it learns. And one thing you left out: checkpoints that include the optimizer state, the step, and the data position, saved so a crash can't corrupt them. We'll get there.

<!-- section: The Idea: Reading loss curves -->

A: Okay. Now the part that would've saved your earlier experiments. Reading loss curves. The shape tells you way more than the final number. And there's an explorer for this with six buttons, six typical runs of this model on web text, five thousand steps each. These are shaped from how real runs behave, but they're illustrations, not measurements. On the chart, the noisy blue line is the training loss at every step, a smooth black line is validation loss, and underneath there's a strip showing that run's learning rate. And a toggle to switch the step axis to log scale, which stretches out the first hundred steps, where warmup problems live.

A: Button one, the good run. It starts near ten point eight. Falls several nats in the first couple hundred steps. Then grinds down slowly for the rest of the run. Validation sits right on top of training. And a small extra drop right at the end, as the learning rate decays. What's happening underneath: first the model learns which tokens are common, then short phrases, then longer-range structure. And validation matching training means it's learning things that generalize, not memorizing. What do you do? Nothing. Keep it. It's your reference curve, and every future run goes on the same axes as this one.

A: Button two, learning rate ten times too high. And here's the sneaky part: it starts fast. Faster than the good run, for a while.

B: [amused] So for the first few hundred steps, I'd think I'd found a better setting.

A: You would. And then sharp spikes. Each spike recovers, but less each time. And then the loss jumps to a flat line around seven, and it never comes back down. What's happening: each step is too big. The update overshoots, the loss jumps, and Adam's running averages get polluted by those giant gradients. Eventually the weights land somewhere where the model has forgotten everything except how common each token is. A loss around seven is roughly what you get from just guessing by token frequency. Or it goes to NaN. The fix: cut the peak learning rate by two or three times. And if the spikes are rare and recover, check clipping's on and look at the gradient norm log right before each spike.

A: Button three, learning rate ten times too low. Smooth. Stable. No drama. And slow. It's still falling steeply when the run ends, about a whole nat above the good run. Nothing's broken. You just spent your compute badly. A curve that's still falling steeply at the end means the learning rate, or the run, was too small for the budget. Raise it three times and rerun something short. The best learning rate is usually just below the one that starts to spike. Which is exactly why you sweep.

A: Button four, no warmup. It drops, and then within the first hundred steps it jumps back up, sometimes above where it started. You only really see it on the log axis. Then it recovers, but it ends a little worse than the good run. That's the random weights and the empty Adam history, and the first updates are huge in every direction at once. Full learning rate on top of that shoves the model somewhere bad. Fix: linear warmup over a few hundred steps. Nobody trains a transformer without it.

A: Button five, the data bug. The loss plunges toward zero in a few hundred steps. Training and validation agree perfectly. It looks amazing.

B: [laughs] That's the one I'd be screenshotting.

A: [laughs] Everyone would. And it's a bug. A model this size on web text lands around three nats, not zero point zero five. What happened is the targets weren't shifted by one. Each position is asked to predict the token it can already see, so the model just learns to copy. And the same family includes a causal mask that leaks the future, and validation data that's also in the training set. The rule: if the loss is too good to be true, it is. Print a decoded input and target pair and check the target is the input moved left by one.

A: Button six, tiny data. Training keeps falling, with a small cliff every time the data repeats. Validation follows it at first, bottoms out, and then turns upward while training keeps getting better. That's memorizing. The model's seen every example several times. Past the bottom of the validation curve, every step makes it better at the training set and worse at text it's never seen, and that widening gap is overfitting. The fix is more fresh data, or stopping at the validation minimum. But runs like this one see each token about once, so in pretraining you rarely see this, unless the dataset's too small or the loader keeps replaying one shard.

A: So, the patterns to burn in. The first number is the log of the vocab size. If step zero isn't near ten point eight, stop. Too good to be true is a bug. This model on web text does not reach a loss of one. And there's a two-minute test for this kind of leak. Train on random tokens. With random tokens there's nothing to learn, so a correct pipeline can't do better than ten point eight. It just can't. A tiny GPT on a Mac, with the target set equal to the input instead of shifted: loss fell from ten point five to five point eight in a hundred steps. On pure noise. Then: spikes that recover are a warning, spikes that don't are a verdict. Lower the learning rate, check clipping, look at the norm. A curve that's still falling steeply at the end means you stopped too early or the learning rate's too low. Compute left on the table. And validation pulling away from training is overfitting, which in a single pass over the data shouldn't happen. So if it does, suspect the data.

B: [working it out] So say I come back in the morning, and the loss dropped nicely, spiked twice, and now it's just flat around seven. That's button two.

A: That's button two. Learning rate too high, or warmup too short, or clipping off. The first two spikes were overshoots it recovered from. The last one knocked the weights into the region where all it predicts is token frequencies, which is what a flat line in the sevens means with G P T two's tokens. So you look at the gradient norm log right before each spike. Then restore from the last checkpoint before the first spike, with a peak learning rate two or three times lower, or just restart. Check clipping's on. And if the spikes keep showing up at the same step across different runs, go look at the batch at that step. A corrupted or bizarre document can do it too.

A: Two more habits. Evaluate validation loss on a fixed set. Say twenty batches, the same ones every time. Then the validation number only moves when the model changes, not because you happened to draw easier text. And always plot new runs on top of your baseline, same axes. Most "did my idea work?" questions get answered by one thing: is the new curve below the old one at the same step.

<!-- section: The Idea: How big, how long -->

A: How many tokens should a model this size see? In twenty twenty-two, DeepMind published the Chinchilla paper, Hoffmann and others. They trained over four hundred models, different sizes, different amounts of data, for different compute budgets. And asked: for a fixed compute budget, how should you split it between model size and data to get the lowest loss?

B: I'd have guessed: as big a model as you can afford. Bigger's better.

A: That's what the field thought, actually. Earlier work, Kaplan and others in twenty twenty, had said to favor bigger models. Chinchilla's correction was that most big models of the time were badly undertrained. The answer, roughly, is to grow them together. About twenty tokens per parameter. So for a hundred twenty-four million parameters, about two and a half billion tokens. And that's the "compute-optimal" budget. Meaning, the cheapest way to train to a given loss.

A: Now, plenty of real models go way past twenty on purpose. Llama three's eight billion model saw over fifteen trillion tokens. Because a small model trained for a long time is cheaper to serve. Every user's request runs through all of the parameters, so a smaller model is cheaper forever after. That trade is about inference cost, not training.

A: Now the compute. Training a transformer costs about six FLOPs per parameter per token. A FLOP is one floating-point operation, one multiply or one add. And the six comes from two pieces. In the forward pass, every weight does one multiply and one add for each token. That's two per parameter. The backward pass has to compute two things for every layer. The gradient with respect to its inputs, so it can pass the signal back to the layer before. And the gradient with respect to its weights, so it can update them. Each of those costs about as much as the forward pass. So that's four. Two plus four, six. Total training compute is about six, times the number of parameters, times the number of training tokens.

B: [skeptical] Does that count attention? Attention's not really parameters.

A: It doesn't, good catch. The attention scores themselves, queries times keys and the weighted sum of the values, add about twelve times the number of layers, times the width, times the context length, per token. For this model at a thousand twenty-four tokens of context, that's about a hundred thirteen million extra FLOPs per token, on top of the seven hundred forty-seven million from the six-times-parameters rule. About fifteen percent more. So a fairer count is about eight hundred sixty million FLOPs per token. Neither number is exact.

A: So, six times a hundred twenty-four and a half million, times two and a half billion. That's about one point nine times ten to the eighteen FLOPs. Call it two billion billion. Or about two point two with attention.

A: What can the Spark do? About a hundred twenty-five trillion FLOPs a second of dense B F sixteen, at most. And I want to be careful there. That's not a published spec. NVIDIA advertises a petaFLOP, but that's at four-bit precision with half the weights skipped as zeros. If you halve it for no sparsity and halve it again for each doubling of precision, you land at about a hundred twenty-five for B F sixteen. So treat it as an upper bound, and you'll measure the real one.

A: And no training run gets the peak. The fraction it does get has a name. M F U, model FLOPs utilization. It's the FLOPs your model's math actually needs per second, so tokens per second times FLOPs per token, divided by the hardware's peak. It only counts useful model math. Not recomputation, not overhead. It comes from Google's PaLM paper. Well-tuned big runs reach about forty to sixty percent. L L M dot C's G P T two run on eight A one hundreds works out to roughly sixty percent by this formula. Ten billion tokens in ninety minutes is about one point eight five million tokens a second. For a single small model on the Spark, thirty to forty-five percent would be a good result. Nobody knows your number yet. That's why you'll measure it.

A: So, say forty percent. Forty percent of a hundred twenty-five trillion is fifty trillion FLOPs a second. One point nine times ten to the eighteen, divided by fifty trillion, is about thirty-seven thousand seconds. About ten hours. About twelve with attention. At twenty-five percent, more like seventeen to nineteen hours.

B: So it's an overnight run.

A: It's an overnight run. And that tells you something really important before you write a line of code. You get about one full-size run per day. One shot. So everything you want to learn about settings has to be learned on smaller, faster runs first.

B: [working it out] And if I went the other way. I've got a budget of compute and I want to pick the model size?

A: There's a neat little rule for that, straight out of the two facts. Compute is six times N times D, and D should be twenty times N. Put those together, compute is a hundred twenty times N squared. So N is the square root of your compute divided by a hundred twenty, and D is twenty times that. Try it with our number: one point nine times ten to the eighteen, divided by a hundred twenty, square root, and you get about a hundred twenty-six million parameters. Right back where we started. Then time is that compute divided by what you actually achieve, peak times M F U.

A: There's a calculator that does all this, and it's worth describing what happens when you play with it. Sliders for parameters, tokens, M F U, and which hardware: the Spark at a hundred twenty-five, or an A one hundred at three hundred twelve or an H one hundred at nine hundred eighty-nine, those two from the spec sheets. Out come total compute, wall-clock time, the tokens per second you'd need, and tokens per parameter. And a note underneath that changes as you drag. Push the tokens down below five per parameter and it tells you the model's undertrained, that a smaller model on more tokens would usually get lower loss for the same compute. Near twenty, it says you're at the Chinchilla sweet spot. Way past twenty, it says that's wasteful for training but common on purpose, because it's cheaper to serve. And if the run would take more than three days on one Spark, it tells you to shrink the tokens for a first run. Then there's a reverse panel. You type in the tokens per second you actually measured, and it gives you your M F U. Every number in it is plus or minus about twenty percent.

<!-- section: The Idea: The debugging recipe -->

A: So, with one shot a day, you really don't want to find a bug at hour five. Karpathy wrote an essay in twenty nineteen, "A Recipe for Training Neural Networks", and it boils down to: neural nets fail silently, so be paranoid, and build up from things you can verify. For a language model, here's the order, before any long run.

A: One. Look at the data. Decode a few training windows back into text, and actually read them. Is it text? Are there end-of-text tokens between documents? Print one input and target pair side by side, and check the target is the input moved left by one. Two. Check the init loss. One forward pass, no training. Near ten point eight?

A: Three. Overfit one batch. Take a single small batch and train on it, the same batch, over and over, for a few hundred steps.

B: [skeptical] Overfitting on purpose? I've spent years being told overfitting's the thing to avoid.

A: In a real run, sure. Here it's a test of the plumbing. Memorizing a couple hundred tokens is trivial for any working model. So a working model and optimizer must drive the loss to near zero. A four-layer GPT on a Mac, one batch of four sequences of sixty-four tokens, so two hundred fifty-six tokens, learning rate ten to the minus three: loss went from ten point eight seven to zero point zero eight in fifty steps. And zero point zero zero five by step three hundred. If yours plateaus at five, something between the loss and the weights is broken. Wrong targets. Tensors that got detached from the graph, so no gradient flows. An optimizer that was handed the wrong parameters. A learning rate of zero.

A: Four. Train on random tokens for a minute. The loss has to stay at or above ten point eight. If it drops, the model can see its targets. Five. Print the learning rate every step for the first few. Is warmup actually happening? Is it the number you think? Being off by a factor of ten is the most common silent bug there is. Six. A short real run, on Tiny Stories or a small slice of Fine Web. Does the curve look like the good run? Do the samples get better? And seven, only then, the long run. And keep notes.

<!-- section: The Idea: Checkpoints -->

A: Checkpoints. A ten-hour run will get interrupted at some point. A reboot. Running out of memory. A control C you regret.

B: So you save the weights every so often.

A: The weights alone won't let you continue as if nothing happened. You need five things. The model weights, and take them from the uncompiled model, because torch dot compile wraps it and sticks a little prefix, orig mod, on the front of every key. The optimizer state, Adam's two running averages, which is twice the size of the model. Without them, the resumed run is basically starting Adam cold again. The step number, so the learning-rate schedule picks up in the right place. The data position: which epoch, the shuffle seed, the index into the window list. So you don't retrain on data you already saw. And the config, and ideally the git commit of your code.

A: And you write it crash-safe. Write to a temporary file in the same directory. F sync it, which forces it all the way to disk instead of sitting in the OS's memory. Then os dot replace to swap it over the old one in one atomic step. Then F sync the directory too, so the swap itself is on disk. Because a checkpoint that's half-written when the machine dies is worse than none at all. It overwrote the good one. And keep the last two or three, plus a few milestones, so a bad stretch of training doesn't leave you with only bad checkpoints.

A: How big? Weights in thirty-two-bit, a hundred twenty-four and a half million times four bytes, about half a gigabyte. Adam's state, one gigabyte. So about a gigabyte and a half per checkpoint.

<!-- section: The Idea: Sampling -->

A: Sampling. The model gives you a probability for every token in the vocabulary. How you pick from those changes the text a lot. And none of it changes the model. Greedy is the simplest. Always take the most likely token. It's deterministic, and small models fall into loops fast. "The the the", or one sentence over and over forever.

A: Temperature: you divide the scores by a number before the softmax. That number's usually written as the Greek letter tau. Below one, it sharpens the distribution. The likely tokens get likelier. Safer, duller. Above one, it flattens it. More surprising, more nonsense. At exactly one you get the model's own distribution.

A: Top k: keep only the k most likely tokens, rescale them so they add up to one, and sample from those. That cuts off the long tail.

B: Why does the tail matter, though? Each of those tokens is, like, a hundredth of a percent.

A: Each one is. But there are tens of thousands of them. Together they add up to a real chunk of probability. So every few words, you pick one of them. Some token that makes no sense there at all. Individually rare, collectively likely. Then top p, also called nucleus sampling, from Holtzman and others, twenty nineteen. Keep the smallest set of tokens whose probabilities add up to at least p, say ninety percent. And the nice thing is it adapts to the context. When the model's sure, that set might be two tokens. When it's unsure, it's hundreds. For this model, a temperature between zero point eight and one, with top p of zero point nine or top k of fifty, is a reasonable start. And fix the prompt and the random seed, so samples from different checkpoints are actually comparable.

<!-- section: The Idea: Small evals -->

A: Then evaluation. Validation loss is your main number. It's cheap, it's smooth, and it's directly what you optimized. But loss doesn't tell you whether the model knows anything. So you add one small task. Hella Swag, from Zellers and others, twenty nineteen. You get a short context and four possible endings. One is right, the other three were machine-generated to be traps. And a plain language model can do it, no instruction following needed. For each ending, compute the model's average loss on just the ending's tokens, given the context. Pick the ending with the lowest loss. Random guessing gets twenty-five percent. Karpathy measured OpenAI's original small G P T two at about twenty-nine and a half percent on the ten thousand forty-two validation examples, this way.

B: [skeptical] Twenty-nine and a half, against twenty-five for guessing. That's... a terrible score.

A: It's barely above chance. And that's exactly why it's a good small eval. It moves as you train. A benchmark a small model can't budge tells you nothing. And the noise on it: with ten thousand forty-two examples, the standard error is about plus or minus half a point. So differences under about one point between two runs are noise.

<!-- section: Build It -->

A: Okay, so here's what you'd actually build. Rough budget: two evenings of building, one overnight run, one morning of evaluating. Everything runs on the Spark unless I say otherwise. One folder, under git. And commit before every run, so every result in your log points at the exact code that made it.

A: Setup first. The lowest-friction way to get PyTorch with CUDA on the Spark, with its ARM CPU and Blackwell GPU, is NVIDIA's N G C PyTorch container. A pip wheel built for ARM and CUDA might work too, but check NVIDIA's DGX Spark docs, because the recommendation has changed over time. Install the tokenizer library, the datasets library, NumPy and matplotlib, and check that CUDA's available. Then measure the matmul peak. If you did the bandwidth lesson you already have the script. Otherwise you time a big B F sixteen matrix multiply, about eight thousand by eight thousand, with a warmup, and you synchronize with the GPU before you stop the clock. A square multiply of two n by n matrices is two times n cubed FLOPs. Write down the plateau. That measured peak is what you'll compute M F U against, next to the hundred twenty-five estimate.

A: Then tokenizing. That one's boilerplate, an agent can write it. It streams the ten-billion sample from Hugging Face so you never download the whole thing, tokenizes in parallel across most of your CPU cores, puts an end-of-text in front of each document, asserts every ID fits in sixteen bits, and writes shards of a hundred million tokens. Each shard's two hundred megabytes. Shard zero is validation. It stops at about two point seven billion tokens, so the validation shard plus about two point six billion for training. Time it, and write down the tokens per second. That's how you'll know whether tokenizing on the fly could ever have kept up. It couldn't, but check. Then the same for Tiny Stories, with smaller shards. Dataset names change, so if a load fails, check the dataset page. And last: read your data back. Mem map a training shard, take three hundred tokens from a random spot, decode them, and read the text. Find an end-of-text in there.

A: The loader is yours to write. It mem maps every shard, builds the list of window starting positions, every T tokens, each one needing T plus one tokens, and shuffles that list with a seeded random generator. Each call hands back x and y as sixty-four-bit integers on the GPU, walking down the shuffled list. When the list runs out, bump the epoch and reshuffle. And it has to be able to save and restore its own state, the epoch, the position, the seed. Enough to resume exactly. Then a three-line test: for one batch, check that x from its second position onward equals y up to its last. That's the shift, verified. For validation, no shuffling. You want the same first twenty batches every time.

A: The model is your own G P T two. But before you move on, it has to pass a checklist, and then an agent reviews your diff against nano G P T's model file. Twelve layers, twelve heads, width seven sixty-eight, context a thousand twenty-four, vocab fifty thousand three hundred four. The output head tied to the token embedding. Init at zero point zero two, the residual projections scaled down, biases zero. Attention through the fused function, with is causal on. Forward returns the scores and the loss, and the loss is computed in thirty-two-bit over all positions. And the parameter count prints exactly a hundred twenty-four million, four hundred seventy-five thousand, nine hundred four. If it says a hundred sixty-three million, your embeddings aren't tied.

A: Then a sanity script, three checks, each printing pass or fail. Init loss, one batch of real data through the fresh model, between ten point eight and eleven point two, with the log of fifty thousand two hundred fifty-seven printed right next to it. Overfit one batch: four sequences of sixty-four tokens, plain Adam W at ten to the minus three, no schedule, three hundred steps, and the loss should be under zero point one well before the end. And random tokens: fresh model, new random tokens every step, shifted correctly, a hundred steps, and the loss must never go meaningfully below ten point eight. Then flip the target to equal the input and watch it fall. So you've seen what the bug looks like. And run all of it on the Mac too, on CPU, with a four-layer model. It's fast, and it means you can catch model bugs without touching the Spark.

A: Then the core of the whole thing, the training loop. Write it yourself. The settings: half a million tokens per step, micro-batches of sixteen by a thousand twenty-four, peak learning rate six e minus four, minimum ten percent of that, three hundred warmup steps, and four thousand eight hundred steps total. Which is about two and a half billion tokens. Weight decay zero point one, clip at one, evaluate every two hundred fifty steps, checkpoint every five hundred, compile on. A function for the learning rate at each step. A function that builds the two parameter groups and prints their sizes. And the crash-safe save.

A: Each step goes: set the learning rate on every parameter group. Work out how many micro-batches you need, the total batch divided by sixteen times a thousand twenty-four, and assert it divides evenly. Then for each micro-batch: get a batch, run the model under autocast, divide the loss by the number of micro-batches, backward. Then clip, step, zero the gradients. Then synchronize with the GPU, time the step, and log.

B: Why synchronize? Isn't the step done when the code gets there?

A: Not on a GPU. The Python side just queues the work and races ahead. If you stop the clock without waiting, you're timing how fast Python can hand out jobs, not how fast the GPU does them. And the log is one line per step, to the screen and to a file. Something like: step twelve hundred, loss three point eight one, learning rate about five point eight e minus four, norm zero point four two, nine seconds for the step, about fifty-eight thousand tokens a second, M F U about forty percent. You compute M F U right there in the loop, tokens per second times the FLOPs per token, the six N plus the attention term, divided by the peak. Against both peaks, the estimate and the one you measured. Every two hundred fifty steps, validation loss on those fixed twenty batches, with gradients turned off. Every five hundred, save. And a resume flag that restores everything, including the loader position. Then check that a resumed run's next loss matches what the uninterrupted run logged. Before the real thing, run two hundred steps on Tiny Stories with a six-layer model, and check the curve looks like the good run.

A: Then one controlled experiment. A learning-rate sweep, at small scale.

B: Why small? If I want to know the right rate for the real model—

A: [jumping in] Because you get one real run a day. So you learn it small. A six-layer model, width three eighty-four, six heads. About thirty million parameters, and a lot of that's embedding. Sixty-five thousand tokens per step, three hundred steps, thirty of warmup. That's about twenty million tokens per run. A few minutes each on the Spark. Sweep the peak learning rate across five values: one e minus four, three e minus four, one e minus three, three e minus three, one e minus two. Each one roughly three times the last. And change nothing else. Same seed, same data order. Then plot it two ways. All five training curves on one chart, smoothed, with the raw noisy ones faint behind them. And a second chart: final validation loss against learning rate, learning rate on a log scale. You should see a U. Too low is slow, too high is unstable, and the bottom is usually just below where the instability starts. Have an agent review the plot and your conclusion, not write them. And one caveat: the best rate at thirty million parameters isn't exactly the best at a hundred twenty-four. Smaller models usually tolerate higher rates. So use it to sanity-check six e minus four, and to see the U with your own eyes. Not to pick a number to four digits.

A: Then throughput. Full-size model, thirty steps, four ways, and you record the steady-state tokens per second. Skip the first few steps, and skip the compile time. Thirty-two-bit with no compile. B F sixteen with no compile. B F sixteen plus compile. And that, with a micro-batch of thirty-two or sixty-four if memory allows, with fewer micro-batches to match. M F U for each, against both peaks. Then plug your best number into the calculator's reverse panel to check your arithmetic, and set the number of steps so the main run fits in a night.

A: Then the main run. You start it inside T mux, so if your SSH connection over Tailscale drops, the run doesn't die with it. Commit first, then launch, with the output going to a file as well as the screen. And you keep a log file in the repo, one entry per run, written before it starts. The date, the commit, the config. A hypothesis, like "this matches build nano G P T's curve at the same token count, within about zero point zero five". When you started it, and what you expect: ten to twelve hours at forty percent M F U. And after, the result: final validation loss, Hella Swag, tokens per second, M F U, and anything weird and at which step. Check on it after ten minutes. Is warmup done? Is the loss below seven? Then go to bed.

A: Next morning, sampling. A small script that loads a checkpoint into the uncompiled model, encodes a prompt, and generates two hundred tokens, with temperature, top k and top p as options. And you implement top p yourself. Sort the probabilities from biggest to smallest, take the running total, and mask out everything after the point where the total passes p, but always keep at least one token. Rescale, and sample. Fix the prompt, "The most important thing about learning is", and fix the seed. Generate from the step five hundred, step two thousand, and final checkpoints, and paste all three into your log. Then from the final checkpoint, compare greedy, temperature zero point seven, one, and one point five, each with top p at zero point nine.

A: And last, evaluation. Two numbers for the final checkpoint. Validation loss and perplexity on the first hundred batches of the validation shard, more than the twenty you used during training, so it's steadier. And Hella Swag on all ten thousand forty-two validation examples. The original release is a JSON lines file in the Hella Swag GitHub repo, and build nano G P T has a loader you can look at. For each example, four token sequences, context plus ending. Average the loss over just the ending's tokens, and the lowest wins. And here's the important part. Also evaluate OpenAI's actual G P T two small weights, from Hugging Face, with the same code.

B: Why OpenAI's? You already know their score.

A: You know the score Karpathy's code got. You don't know what your code gets. If your harness scores OpenAI's model at twenty-nine or thirty, your harness is fine and you can trust what it says about yours. If it says twenty-five, the harness has a bug. So have an agent review it for the classic ones: scoring the context tokens too, an off-by-one in which positions count as the ending, or padding tokens sneaking into the average.

A: And you're done when the sanity script passes everything and you've watched the random-token check fail with the unshifted target. When there's a sweep plot, five curves and a U, from five runs that differ only in learning rate. When you've measured tokens per second and M F U four ways and know which switch bought the most. When a two-and-a-half-billion-token run has finished, or got interrupted, resumed, and then finished, with its log. When samples from the final checkpoint are readable paragraphs. And when you have a validation loss, a perplexity and a Hella Swag score for your model and for OpenAI's, measured by the same code.

<!-- section: Measure -->

A: So what should the numbers look like? These are best guesses from the arithmetic and from published reproductions. Anything Spark-specific, honestly, nobody knows until you run it. Init loss between ten point eight and eleven point two, and the measured one was ten point nine eight, because the log of fifty thousand two hundred fifty-seven is ten point eight two. Overfit one batch, under zero point one by step three hundred. On the four-layer model it got to zero point zero zero five. Memorizing two hundred fifty-six tokens is trivial. Your measured matmul peak, at most a hundred twenty-five trillion a second, probably below.

A: Tokens per second: thirty-two-bit will be the lowest of the four, because most of the math doesn't get the tensor cores. B F sixteen, a few times faster than that, because now it does. Compile on top, maybe ten to fifty percent more. Check that. It's the fused operations, and they matter more when bandwidth is low, which on the Spark it is. M F U at your best setting, somewhere around twenty-five to forty-five percent, roughly. And forty percent works out to about fifty-eight thousand tokens a second for this model. Hours for the two and a half billion tokens, ten to nineteen. The sweep's best rate for the little thirty-million model, probably around one e minus three to three e minus three, because smaller models tolerate higher rates. Final validation loss, roughly three point two to three point five, perplexity twenty-five to thirty-five. Hella Swag for your model, about twenty-seven to thirty percent. OpenAI's in your harness, twenty-nine to thirty, and if not, your harness has a bug. And each checkpoint about a gigabyte and a half.

B: [a bit unsure] And M F U... higher's just better, right? If I got seventy percent I'd be pretty happy.

A: You'd be suspicious. M F U is the honest number, in both directions. If it's under twenty percent, the GPU's waiting on something. Maybe data loading, and you'd see one CPU core pegged at a hundred percent in H top. Maybe Python overhead, because the micro-batch is too small and the GPU finishes each one before Python's ready with the next. Maybe unfused elementwise operations, because compile's off. Each of those has a different fix. And if it's over sixty, check your FLOP count and check your timer. You probably forgot to synchronize, so you're timing Python handing out work.

B: And if I scaled up? Bigger model, or more GPUs?

A: Two different directions. A bigger model, on the same GPU, usually gets higher M F U. The matrices get bigger, and the fixed overheads, Python, launching kernels, those bandwidth-bound little operations, become a smaller slice of each step. Going to eight GPUs adds communication. Every step, the gradients have to be averaged across all the devices. So M F U drops, unless that communication overlaps with the compute. And it drops more on slow connections between GPUs. That's a whole lesson of its own, distributed training.

A: The other two things to look at. Your validation loss next to the published curve, at the same number of tokens. If you're within a few hundredths, you have a trusted baseline. That's the whole goal. If you're zero point two worse, something in your recipe differs, and finding it will teach you more than any new idea would have. And read the samples from step five hundred, two thousand, and the end, next to their validation losses. That's how you build the instinct for what a loss of four actually looks like. The perplexity ladder only describes it.

<!-- section: Break It -->

A: Now you break it, on purpose. Each of these is a short run, a few hundred steps of the little thirty-million model, plotted on the same axes as a good run. The point is to see each failure once, so the next time it happens by accident you recognize it.

A: First: set the target equal to the input in the loader. The loss dives toward zero. Training and validation both look superb. Then you sample from it, and it's garbage. The lesson: the loss measures exactly what you told it to measure, and nothing more. And leaking validation data into training is the same bug, just slower.

A: Second: no warmup, and five times the learning rate. Watch the first hundred steps on the log axis, and watch the gradient-norm column in your log. The norm spikes before the loss does. Then turn clipping off as well, and see whether it diverges completely. The lesson: warmup and clipping exist for the first and worst moments of the run.

A: Third one's my favorite. Forget to divide each micro-batch's loss by the number of micro-batches. So with Adam W, thirty-two micro-batches, and clipping at one: how bad is it? Is it like a thirty-two times higher learning rate?

B: [working it out] Gradients are thirty-two times too big, so... yeah. That's thirty-two times the step. That should blow up worse than the high learning rate button.

A: Probably much less bad than you'd guess, and that's the interesting part. With plain gradient descent, you'd be right. Thirty-two times the gradient, thirty-two times the step. But remember what Adam does. It divides each gradient by the square root of its own running average of squared gradients. Multiply every gradient by thirty-two, and the squared average goes up by thirty-two squared, and its square root goes up by thirty-two. So the thirty-two on top and the thirty-two on the bottom cancel. Only epsilon, that tiny number added to avoid dividing by zero, even notices.

B: [surprised] So Adam just... shrugs it off.

A: Mostly. What does change: the gradient norm is now thirty-two times bigger. So clipping at one fires on every single step, and it quietly turns your optimizer into something like normalized-gradient Adam. Different, but not a disaster. And your logged loss is thirty-two times too big, if you log the summed number. I'd expect a small difference rather than a catastrophe, but run it and compare the curves. The general lesson: knowing why a bug is harmless or harmful means knowing what the optimizer does with the scale of the gradient.

A: Fourth: replay one shard. Make the loader reshuffle and start over after the first shard, a hundred million tokens, instead of moving on to the next one. Run the small model long enough to go through it several times. You'll see the tiny-data button from the explorer, for real. Training keeps dropping with a cliff at each pass, and validation turns up. The lesson: in pretraining, a rising validation loss almost always means a bug in the data pipeline. Not a model problem.

<!-- section: Connections and close -->

A: And this run is the baseline for everything after it. Changing only the data, and measuring the effect against this curve. Reusing this exact loop to train a draft model for speculative decoding. And comparing transformer variants, which is where your creative ideas finally get a fair test, one change at a time, against a run you trust. If you watch one thing, it's Karpathy's four-hour "Let's reproduce G P T two" video, and if you read one thing, it's his recipe essay.

B: [working it out] Okay, let me try the whole thing. My old experiments didn't fail because the ideas were bad, or not necessarily. They failed because training breaks silently, and I had nothing to compare against. So the fix is: get one run working that matches a published curve, check it with cheap tests before the long run, like the loss at step zero being about ten point eight, and then change one thing at a time and plot it on top.

A: That's it, and I'd sharpen one piece. It's not that you get one run working and then you're done with it. The baseline is a measuring instrument. You trust it because you checked it, the init loss, the overfit test, the random tokens, the published curve, and that's the only thing that lets you say "my idea moved the loss by zero point zero two" and believe it. Without the baseline, every result is just a number. With it, every result is a difference.
