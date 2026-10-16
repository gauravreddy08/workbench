<!-- section: The Problem -->

A: [relaxed, thinking out loud] So imagine three messages land in your team channel on the same afternoon. The first one says: "Swapped M H A for M Q A in the hundred-twenty-five-million config. Val loss is point oh four worse. M Q A is out." The second: "G Q A matches M H A and has eleven percent fewer parameters, so it's more efficient." And the third: "Ran decode on both. G Q A is three times faster. Ship it."

B: Okay, honestly? The second one sounds fine to me. Same loss, fewer parameters. Isn't that, like, the definition of more efficient?

A: [calmly] It's a real measurement. All three are real measurements. And none of them actually answers the question. Take yours. It's counting parameters. But nobody's paying for parameters. They're paying for GPU hours. A model with fewer weights can still cost exactly as much to train, or more, depending on how much arithmetic it does with each weight.

B: Hm. Okay. And the first one? Point oh four worse seems pretty clear.

A: [patiently] The first one used the learning rate that had been tuned for M H A, on both models. It ran one seed. And it stopped both runs after the same number of steps. So any one of those three things could be the point oh four. And the third one, the three times faster, that was measured decoding thirty-two sequences at once with long prompts. Which is exactly where G Q A shines. Run it with one user and a short prompt and the gap is more like one point two times.

B: [slowly] So they're each... true, but for a setup nobody said out loud.

A: Yeah. And that's the whole lesson, really. "Compare the compute efficiency of two transformer variants" sounds like one experiment. It's actually three decisions you have to make before you run anything. What you hold equal. What you measure. And which use you care about, training or serving. Get those wrong and you can make either variant win. So the point is to make them on purpose.

<!-- section: Origin -->

A: And this isn't just a mistake people make in team channels. The whole field made it, at huge scale. January twenty twenty, Jared Kaplan and colleagues at Open A I publish "Scaling Laws for Neural Language Models". They trained hundreds of models and found that loss falls as a smooth power law in three things: parameters, data, and compute. Which gave everyone a common currency. Instead of "my model beats yours", you could say "my model reaches your loss with thirty percent less compute." And one of their conclusions was that as your compute budget grows, you should spend most of it on a bigger model and comparatively little on more data. G P T three and Gopher were sized that way.

B: And then that turned out wrong.

A: [leaning in] March twenty twenty-two. Jordan Hoffmann and colleagues at DeepMind, the Chinchilla paper, redo the experiment and get a different answer. Grow parameters and tokens about equally. Roughly twenty training tokens for every parameter. And a big part of the difference was a confounder, meaning something other than the thing you're testing that differed between runs. Kaplan's runs used a learning-rate schedule whose length wasn't matched to each run's length. So the shorter runs were handicapped, and the comparison leaned toward big models trained briefly. And Chinchilla itself, seventy billion parameters trained on one point four trillion tokens, beat the two-hundred-eighty-billion-parameter Gopher with the same compute.

B: [amused] A quarter the size.

A: A quarter the size, same bill, better model. But the thing to take from it isn't the number twenty. It's that a careful, famous comparison flipped because of how the runs were set up, not because of the models. And your two-variant comparison has the same failure modes, just in miniature.

<!-- section: The Idea: The currency -->

A: So, first, the currency. A flop is one floating-point operation. One add or one multiply. When people say "flops", they mean a count of them. "Flops per second" is a rate. And counting them is the standard way to say how much arithmetic a model costs, because the count doesn't care which GPU you used or how good your kernels are. Time depends on both of those. Flops depend on neither.

A: And almost all the arithmetic in a transformer is matrix multiplication. There's one rule worth tattooing somewhere. If you multiply an m-by-k matrix by a k-by-n matrix, it costs two times m times k times n flops. Here's why. The output has m times n numbers in it. Each one is a dot product of length k, which is k multiplies and about k adds. So two k per output, times m n outputs.

B: Okay, so like, a ten-by-twenty times a twenty-by-thirty...

A: [quick, nodding along] Three hundred outputs, each a dot product of length twenty, so forty flops each. Twelve thousand total. Two times ten times twenty times thirty. Yeah. Now look at it from one token's point of view, because that's where it gets neat. One token is a row vector, length d, the model width. It goes through a weight matrix that's d by four d, like the first layer of the MLP. There are four d outputs. Each one's a dot product of length d: d multiplies, d adds. So four d outputs times two d flops, which is two times four d squared. And four d squared is exactly the number of weights in that matrix.

B: [catching on] So it's two flops per weight.

A: Two flops per weight. Whatever the shape. Every entry in the matrix gets used exactly once for that token: one multiply, one add. And that's the whole trick. Every weight matrix in the model gets touched once per token in the forward pass. So if the model has N parameters sitting in weight matrices, the forward pass costs about two N flops per token. That's the famous rule. And it's a good first approximation. It's also wrong in two specific places, and at the sizes you'll train, both of them matter.

<!-- section: The Idea: Where N comes from -->

A: But first, where does N come from? Take one standard block of a G P T with width d, and an MLP that expands to four d. Attention has four projection matrices: query, key, value and output. Each one's d by d. So that's four d squared parameters. The MLP has an up-projection, d by four d, and a down-projection, four d by d. That's eight d squared. Add them and each layer holds about twelve d squared. With L layers, N is about twelve times L times d squared, ignoring the tiny layer-norm and bias vectors.

B: [skeptical] Does that actually match a real model?

A: It does. G P T two small: twelve layers, width seven sixty-eight. Twelve times twelve times seven sixty-eight squared comes out around eighty-five million. And that's the usual "eighty-five million non-embedding parameters" people quote for the hundred-twenty-four-million model. The other thirty-nine million or so are the token and position embeddings.

A: And that word, non-embedding parameters, just means the parameters in the transformer blocks, not counting the token embedding table, which is vocab by d, or the position embeddings. People usually define N that way, and Kaplan found loss scales more cleanly with that count. The reason it makes sense for flops: an embedding lookup isn't a matmul. Fetching row four thousand one hundred eighty-two of a table costs no arithmetic at all. You just go get it.

<!-- section: The Idea: What 2N leaves out -->

A: Okay. So, the two things two N leaves out. The first is the attention itself. The projections are matmuls with weights, fine, those are in N. But inside attention there are two more matmuls that use no weights at all. The scores, where each query gets dotted with all the keys. And the mixing, where the softmaxed scores take a weighted average of the values. Their cost depends on how many tokens are in the context, not on N.

B: Wait, so how much is that?

A: Count it for one token at position t, in one layer. Its query, which is length d once you line all the heads up side by side, gets dotted with t keys. That's two times t times d flops. Then the t attention weights mix t value vectors of length d. Another two t d. So four times t times d, per layer, per token.

A: And then you average over a sequence of length T, capital T, and here it depends how you count. If the kernel computes the full T-by-T square of scores and then masks out the future, which is the simple implementation, and it's how PyTorch's flop counter counts it, then every token pays as if t were T. So four times L times T times d per token. But if you only count the half of the square a causal model actually needs, each position sees on average T over two earlier ones, and you get two times L times T times d. That's the term in Kaplan's formula. And fused attention kernels like flash attention really do skip most of the masked-out blocks, so the half-count is closer to the work actually done.

B: So which one's right?

A: [firmly] Neither is "the" right answer. Pick one, say which, and use the same one for both variants. That's the rule. Now, how big is it next to two N? If you divide one by the other, the layers cancel and a d cancels, and you get T over six d with full counting, or T over twelve d with the causal half. So for G P T two small, width seven sixty-eight, context ten twenty-four: ten twenty-four over about forty-six hundred, so twenty-two percent extra on top of two N. Fine. Noticeable. But take a tiny model, width two fifty-six, context two thousand forty-eight. Now it's two thousand over about fifteen hundred. A hundred thirty-three percent. The attention costs more than all the weights combined.

B: [surprised] More than the whole model?

A: More than every weight matrix put together. Small width, long context, the attention scores win. And the second thing two N leaves out is the output head. The very last step takes each token's d-length vector and turns it into a score for every word in the vocabulary. That's a d-by-V matmul, V being the vocab size. Two times d times V flops per token. And with weight tying, those weights are the embedding table. So they're excluded from N. But the matmul is completely real. For G P T two small: two times seven sixty-eight times fifty thousand three hundred and four is about seventy-seven million flops per token. And two N is about a hundred seventy million. At big scale the head's a rounding error. At the sizes you can train on one Spark, it's a quarter of your compute.

<!-- section: The Idea: Predict the split -->

A: So, try this. G P T two small. Twelve layers, width seven sixty-eight, vocab padded to fifty thousand three hundred and four, tied embeddings, sequence length ten twenty-four, and we count the full attention square. What fraction of the forward flops is the MLP? The attention scores and mixing? The head? And what fraction does two N actually capture?

B: [working it out] Hmm. The MLP's two thirds of the weights, so... maybe half the flops? Attention we said twenty-something percent extra. And the head, you just said seventy-seven against a hundred seventy, so that's big. I'd guess two N gets, I don't know, eighty percent?

A: [amused] Less than that. Per sequence of ten twenty-four tokens: the four projections are fifty-eight billion flops, about twenty percent. The MLP is a hundred sixteen billion, forty percent. The attention scores and mixing, thirty-eight point seven billion, thirteen percent. And the output head, seventy-nine point one billion. Twenty-seven percent. Total about two hundred ninety-two billion. Two N says a hundred seventy-four. So two N only covers about sixty percent.

B: So the head is bigger than attention.

A: At this size, yeah, more than twice the attention. And this was checked on a Mac: the hand count matched PyTorch's own flop counter to the last digit, once PyTorch was forced onto its plain math attention. There's a story there for later. But the point is, if you compare two variants with two N, and they differ in context length or vocab, you're measuring both with a ruler that's forty percent short, and short by a different amount for each.

<!-- section: The Idea: Where the flops go -->

A: There's an interactive figure for this that's worth playing with. It's one stacked bar: the forward flops per token, split into four colored segments. Projections, attention, MLP, head. Head size sixty-four, that same fifty-thousand-word vocab. And you've got sliders for width, layers and sequence length, a toggle between M H A, G Q A and M Q A, and a toggle for full square versus causal half. Start at G P T two small. Drag sequence length up, and the attention segment grows until it overtakes the MLP. Then drag the width down to two fifty-six, and the head segment just eats the bar. And then flip to M Q A. Watch which segment changes.

B: The attention one, I'd assume. Fewer K V heads, cheaper attention. So M Q A is cheaper to train.

A: [gently] That's the natural guess, and it's the first surprise. The attention segment doesn't move. Only the projections shrink a little. Because the scores still cost the same. Every query head still looks at every past token. What M Q A changes is that they all look at the same keys. It's the same number of dot products. The only thing that gets smaller is the K and V projection matrices. In G P T two small, going from twelve key-value heads to one trims those two matrices from two d squared down to about a sixth of d squared per layer. And that's a nine percent cut in forward flops. The MLP, the scores, the head: none of them move.

B: Huh. So whatever M Q A is for, it's not making training cheaper.

A: Not mainly. Not the arithmetic. Hold that, because it's going to come back when we get to serving.

<!-- section: The Idea: Training is 6N -->

A: Now, training. Training does a forward pass and then a backward pass, and the backward pass costs about twice the forward. And the reason's mechanical. Take one layer that computes Y equals X times W: inputs times weights. In the backward pass you get handed the gradient of the loss with respect to Y, how the loss would change if the output changed. And you have to produce two things from it. One: the gradient for X, so you can pass it further back to the earlier layers. That's the incoming gradient times W transposed. Same shape of matmul as the forward, so two flops per weight per token. Two: the gradient for W itself, which the optimizer needs to update the weights. That's X transposed times the incoming gradient. Another matmul of the same size. Two more.

B: So forward is one multiply-add per weight, and backward is two.

A: Right. Two, plus two, plus two. Six flops per parameter per token. Picture it as a box on the left that says forward, two N, then the loss, then two boxes stacked on the right, one sending the gradient back, one making the weight's own gradient, two N each. Total six N. And over a training run of D tokens, the total compute C is about six times N times D. That's the number on the x-axis of every scaling-law paper.

B: And the attention and head stuff from before?

A: Triples the same way. They're matmuls too, so they get the same backward treatment. So at small scale the honest version is: three times your full forward count per token, times D. And this was checked on the Mac too. PyTorch's counter wrapped around a forward and backward of the G P T two config reported exactly three point oh times the forward.

A: Two refinements you'll hear about. Activation checkpointing is when you throw away some of the intermediate results during the forward pass to save memory, and then recompute them during the backward pass. That costs roughly one extra forward. So the hardware is actually doing about eight N per token, not six. But the extra two N is real work that isn't useful work. It isn't counted as model flops. And the optimizer step, Adam's handful of operations per parameter, happens once per step, not once per token. Next to six N times all the tokens in a batch, it's tiny. People ignore it.

<!-- section: The Idea: MFU -->

A: Once you can count flops, you can ask how close you are to the hardware's limit. That's called M F U, model flops utilization. It's the model flops your training actually completes per second, so six N plus the attention, times tokens per second, divided by the hardware's peak flops per second. Google's Palm paper defined it in twenty twenty-two, partly because the older measure counted recomputation as useful work, which flattered runs that recomputed a lot. Well-tuned large runs report M F U somewhere in the forty to sixty percent range. Palm, at five hundred forty billion parameters, reported forty-six percent.

B: And on the Spark? With the little models?

A: Much lower, usually. A small model's matmuls are too skinny to fill the chip, and Python and kernel-launch overhead eat a bigger share of each step. And there's a catch with the denominator. The headline number on the Spark's spec sheet is one petaflop. That's for F P four, four-bit numbers, with sparsity. Your B F sixteen training never touches that. Dense B F sixteen is several times lower. So rather than trust a brochure number, you measure it. You time one big B F sixteen matrix multiply and call that your achievable peak. Then M F U against that tells you how good your code is, not how optimistic the marketing was.

A: And M F U isn't part of the comparison itself. It's a sanity check on it. If one variant runs at fifteen percent M F U and the other at thirty-five, you'll see a big wall-clock difference that has nothing to do with the architecture and everything to do with kernels.

<!-- section: The Idea: What fair means -->

A: [thoughtful] Okay. Now the heart of it. You've got two variants, call them A and B. You want to know which is more efficient. There are three things you could hold equal, and each one answers a different question.

A: Hold parameters equal, and tokens, and you're asking which design gets more out of each weight. The trap: if B does more work per weight, it's getting extra compute for free, and of course it looks better. Hold training flops equal, and you're asking: for a fixed compute bill, which one gets the lower loss? The trap there is subtle. Each variant needs its own best size for that budget, not the same size. And hold wall-clock time equal, on your hardware, and you're asking which is better on my GPUs today. The trap: that rewards good kernels, not good designs, and it might not transfer to anyone else's hardware.

B: Okay, but what do people actually do? Because I'd just... train both for the same number of steps.

A: That's the fourth one, and it's the most common. Equal steps. And with the same batch size, that's just equal parameters and tokens wearing a different hat. Same trap. The default currency for compute efficiency is equal flops. Because compute is the thing you pay for, and it's the thing you can move around. With a fixed budget you can always choose a bigger model trained on fewer tokens, or a smaller one on more. A fair flop comparison lets each variant make that choice for itself.

A: And here's how the answer flips. Suppose B does one and a half times the flops per parameter per token. It reuses its weights more, the way a weight-shared block that loops over itself does, or a longer context window. And it gets one point three times as much out of each parameter. At equal parameters and equal tokens, B wins. Obviously. It's using fifty percent more compute. But at equal flops, B has to train on two thirds as many tokens, or be a smaller model. And that can cost more than its per-parameter advantage gains back.

A: So guess. B is one point three times better per parameter, one and a half times as expensive. At a fixed compute budget, does B still win?

B: [a bit unsure] I want to say yes? It's thirty percent better per parameter. Fifty percent more cost feels like it's in the same ballpark, so... maybe it's close but B edges it.

A: [matter-of-fact] It loses. Under a Chinchilla-shaped loss law, B loses at equal flops, even though it wins at equal parameters. And here's the intuition. At the compute-optimal point, loss is roughly a power of compute. So a design that's one and a half times more expensive per token has to be more than one and a half times better per parameter, in effective-size terms, just to break even. And the exponent on parameters is small, so thirty percent better per parameter buys you much less than thirty percent in loss. And the opposite design does the reverse. Say something that's nine tenths as good per parameter, but only costs eight tenths the flops. It loses at equal parameters. And wins at equal flops.

B: [slowly] So the cheap, slightly worse one is the efficient one.

A: At a fixed bill, yeah. Which sounds backwards until you remember you can spend the savings on a bigger model.

<!-- section: The Idea: iso-flop curves -->

A: So how do you actually compare at equal compute without guessing the right model size for each? The Chinchilla paper has a clean recipe. It's called an iso-flop curve. Iso is just Greek for equal. Equal flops. You fix a compute budget, C. You pick four or five model sizes around your guess of the best size. And for each one, you set the number of training tokens so that every run costs exactly C. So the smaller models see more tokens, the bigger ones fewer. You train each one to the end of its schedule and record the final validation loss.

A: Then you plot loss against model size, on a log scale. And you get a U. Too small a model, and it's limited by its capacity: it just can't hold enough. Too big, and it didn't see enough data in the budget. The bottom of the U is the compute-optimal point. The model size, and matching token count, that gets the lowest loss for that budget. Then you repeat at two or three budgets, each about three times the last.

B: So for two variants I'd get two sets of U's.

A: Two sets of U's, and you compare the bottoms. At each budget, which variant's best run is lower? Then connect the bottoms across budgets and you've got each variant's compute frontier: the best loss that design reaches at each budget, using its best size. Plotted against log compute, it's close to a straight line, because it's a power law. If B's frontier sits below A's, B's more compute efficient. And you can say by how much in a currency anyone understands. "B reaches A's loss with point seven times the compute." Flip that around and it's a compute multiplier of about one point four.

B: [a bit lost] Wait, say the multiplier part again.

A: The compute multiplier is: how much compute would A need to match B's loss at budget C, divided by C. If B gets to some loss at a budget of one, and A needs one point four to get to the same loss, B's multiplier is one point four. Above one, B is better. And the nice thing is it puts completely different kinds of improvements on one scale. A new attention design and a better optimizer can both be "worth one point two times compute".

A: And the multiple budgets aren't decoration. A variant can win at small scale and lose at large, or the reverse, if its frontier has a different slope. Two points can't tell you a slope reliably. Three can at least warn you.

<!-- section: The Idea: The iso-flop explorer -->

A: There's a second interactive figure that makes this click. It's toy data, the shape comes from Chinchilla's fitted loss formula, but it's not a prediction for your runs. You see several U's, one per budget. A is solid, B is dashed blue. On each, there's a dot at each variant's best size for the selected budget. That's the equal-flops comparison. And there's a square, which is B run at A's size and A's token count. That costs B extra flops, and it's the equal-params comparison. Then you've got two sliders: quality, how much B gets out of each parameter compared with A, and cost, B's flops per parameter per token compared with A. And a budget slider.

A: Hit the preset called costly plus strong, which is our one point three and one point five. The square sits below A's dot. So at equal params, B wins. But B's own dot sits above A's. At equal flops, B loses. And the compute multiplier reads below one, about point eight seven. B is a worse use of money. Now hit cheap plus weak. Exactly the reverse. And that's roughly the M Q A story: a little worse per parameter, a little cheaper per token.

B: What about if they're the same?

A: [more serious] That's the one I'd look at hardest. Set them identical, then nudge B's cost to one point one. Ten percent more expensive, no change in quality. The compute multiplier shows about point nine. And the loss gap between the dots is only about point oh one to point oh three, depending on the budget. That is the size of effect you're hunting for when you compare real variants. And it's about the size of seed noise. Hold that thought, too.

A: Last thing: move the budget slider. The compute multiplier doesn't budge. In this toy, it's exactly quality divided by cost. Because a B that's m times better per parameter and k times more expensive per token behaves exactly like A given m over k times the compute. So in the toy, the verdict never flips with scale. Real variants don't have constant multipliers, and theirs can. Which is, again, why you run three budgets.

<!-- section: The Idea: MHA, GQA, MQA -->

A: Okay, so now the actual designs you'll compare. All three keep the same number of query heads. They only differ in how many key and value heads those queries share. Picture eight query heads in a row on top, three times over. In M H A, multi-head attention, the original, each query head has a line going down to its own key-value head. Eight lines, eight K V heads. In G Q A, grouped-query attention, the queries are split into groups, say two groups of four, and each group shares one K V head. So four lines fan into each of two boxes. And in M Q A, multi-query attention, all eight lines converge on a single K V head.

A: And underneath, two things shrink by the same factor. The K V cache: full size, a quarter, an eighth. And the K and V projection weights: two d squared, half of d squared, a quarter of d squared. And then the one thing that doesn't change: the scores and the mixing cost the same in all three.

B: Remind me what's in the cache again. It's the keys and values for past tokens?

A: For every past token, in every layer, yeah. When the model generates text one token at a time, each new token has to attend to every earlier one. So rather than recompute the earlier tokens' keys and values every step, you keep them in memory. That's the K V cache. And every decode step reads the whole thing. Which is exactly what Noam Shazeer noticed in twenty nineteen. He saw that cached decoding is limited by reading keys and values out of memory, not by math. So if all the heads share one K and one V, every decode step reads far less. That's M Q A. The price was a little quality.

A: Then in twenty twenty-three, Joshua Ainslie and colleagues proposed G Q A as the middle ground. Groups of query heads share a K V head, and M H A and M Q A are just its two extremes. One group per head, or one group for everything. They reported quality close to M H A and decode speed close to M Q A. And they showed you can convert an existing M H A model: average its K V heads within each group, then train a little more. They called that uptraining, and it took about five percent of the original pretraining compute. Llama two seventy B and every Llama three model use G Q A.

B: Is it a big code change?

A: [laughs] It's tiny. The K and V projections output the number of K V heads times head size, instead of the number of query heads times head size. And before attention, each K V head gets broadcast to the query heads in its group. Recent PyTorch does that broadcast for you: scaled dot product attention has an enable G Q A flag that accepts keys and values with fewer heads than the queries. That worked on PyTorch two point fourteen; check your version's docs.

<!-- section: The Idea: Through the fairness machinery -->

A: Now put these through the fairness machinery. Training first. At the same width and depth, G Q A and M Q A have fewer parameters and slightly fewer flops per token. So "same config" is neither equal parameters nor equal flops. It's just... same config. Papers that compare at equal parameters usually widen the MLP to give back what attention lost. An iso-flop sweep sidesteps the whole question: each variant gets the same compute and picks its own best size. And the expected outcome, from the papers and from how little the attention projections matter, is that G Q A lands right on top of M H A, within noise. And M Q A is close, but perhaps slightly worse. And "perhaps slightly" is exactly the kind of claim you should check rather than repeat.

B: Okay, but then inference. If it's only nine percent fewer flops, how does decode get three times faster? That doesn't add up. Decoding's math too. Fewer flops, a bit faster, that's it.

A: [jumping in] That's the thing. Decoding isn't limited by math. This is the part to really get. When the model generates one token, it has to read every weight in the model out of memory. All of them, every single step. And it also has to read every cached key and value, for every sequence in the batch. And the arithmetic it does with all those bytes is tiny. The chip spends its time waiting for memory to deliver bytes, not multiplying. So arithmetic isn't the bottleneck. Bytes are.

B: [catching on] So you count bytes, not flops.

A: You count bytes. And the model for decode time is simple. Time per decode step is roughly: the bytes of weights, plus batch size times context length times the K V bytes per token, all divided by memory bandwidth. And the K V bytes per token is two, for K and V, times the number of layers, times the number of K V heads, times the head size, times bytes per number. So in B F sixteen that's two bytes per number.

A: And look at the shape of that. The weights term doesn't care about batch size at all. You read the weights once per step, whether you're serving one sequence or thirty-two. The K V term grows with batch and with context. So at batch one and short context, the weights dominate. Shrinking the cache barely matters. G Q A and M Q A are a little faster, and that's mostly because their K and V weights are smaller. But at batch thirty-two with long context, the cache dominates. Cut it by four or sixteen and the step time drops a lot. And you can fit far more sequences in memory at once. With G Q A in groups of four, about four times as many. And push it further, to a hundred twenty-eight thousand tokens of context, or hundreds of users at once, and the cache is basically everything. Then the speedup heads toward the full four times for G Q A, or sixteen for M Q A with sixteen query heads.

<!-- section: The Idea: Predict decode -->

A: Let's put numbers on it. Take a model with twenty-four layers, width ten twenty-four, head size sixty-four. With M H A that's about three hundred fifty-five million parameters. B F sixteen. Run it on the Spark, whose spec sheet says about two hundred seventy-three gigabytes per second of memory bandwidth. Context of ten twenty-four tokens. And compare M H A with sixteen K V heads, G Q A with four, and M Q A with one. What's the fastest each could possibly decode, at batch one and at batch thirty-two? Start with the cache. How big is one token's worth, for M H A?

B: [working it out] Okay. Two for K and V, times twenty-four layers, times sixteen heads, times sixty-four, times two bytes. Two times twenty-four is forty-eight, times sixteen is... seven sixty-eight, times sixty-four... that's about forty-nine thousand, times two, about ninety-eight thousand bytes?

A: [nodding] Ninety-six kilobytes per token. G Q A with four heads is a quarter of that, twenty-four. M Q A, six. And the weights: point seven one gigabytes for M H A, point six three for G Q A, point six one for M Q A, because their K and V matrices are smaller. Now batch one. The cache for one sequence of ten twenty-four tokens is under a tenth of a gigabyte for M H A, and basically nothing for the other two. So each step reads about point eight one gigabytes, point six six, point six two. Divide the bandwidth by that and the ceilings are about three hundred forty, four hundred ten, and four hundred forty tokens a second. M Q A is about one point three times M H A, and most of that is the smaller weights.

B: So at batch one it's that one point two-ish number from the channel.

A: That's roughly where it comes from. The ceiling says one point three, and real overheads at batch one squash it a bit. Now batch thirty-two. The cache is thirty-two sequences times ten twenty-four tokens times ninety-six kilobytes. That's about three gigabytes for M H A. Three quarters of a gigabyte for G Q A. About a fifth of a gigabyte for M Q A. Each step now reads around three point nine gigabytes, one point four, and point eight. And the ceilings are about two thousand two hundred, six thousand one hundred, and ten thousand seven hundred tokens a second, summed over the batch. Now G Q A is two point seven times M H A, and M Q A is almost five times. Because for M H A at this point, the cache is about four times the size of the weights. It's most of what every step reads.

B: [surprised] From the same nine percent fewer flops.

A: From the same nine percent fewer flops. Because the flops were never the bill. Now, those are floors on the time, ceilings on the speed, from spec-sheet numbers. Your measured numbers will be lower. And at this model size, batch one might not even be limited by bandwidth. It might be limited by kernel-launch overhead, the fixed cost of telling the GPU to start each small operation, and that squashes the differences further. That's part of what you're measuring.

A: So "which is more efficient" has at least two honest answers, and a good results doc gives both. Per training flop, they're roughly tied, and you measure it. Per served token at realistic batch sizes, G Q A and M Q A win by a lot, and the win grows with batch and with context. And that split is why every modern open model uses G Q A. You pay almost nothing at training time for a big win at serving time. And serving runs for much longer than training.

B: So the "three times faster, ship it" person was... right about shipping, wrong about why it's evidence.

A: [laughs] Maybe right about shipping. But one batch size isn't the answer. It's one point on a curve.

<!-- section: The Idea: Other variants -->

A: The method's general, by the way. Three other variants you'll meet, each with its own fairness wrinkle. First, swiglu versus gelu in the MLP. That's from Shazeer again, twenty twenty, "G L U Variants Improve Transformer". A swiglu MLP has three weight matrices instead of two. The input goes through two up-projections. One of them goes through an activation called S I L U and then gets multiplied, number by number, with the other. Then a down-projection. Llama uses it, Palm uses it, most recent models do. And to compare it fairly, people shrink its hidden size from four d to eight thirds of d. Because three matrices of d times eight-thirds d is eight d squared, the same as the two matrices of a normal four-d MLP. Parameters and flops come out exactly equal; that was checked at width seven sixty-eight. But at the same hidden size, swiglu gets fifty percent more MLP compute, and of course it looks better.

A: Second, rope versus learned positions. You've implemented rope: it encodes position by rotating each query and key vector by an angle that depends on where it is, so the dot product only depends on how far apart two tokens are. It has no parameters and negligible flops. Learned position embeddings add a table, context length by d. No flops, just a lookup. So for this pair, equal params and equal flops nearly coincide. The comparison is about loss, and about how each one behaves at lengths longer than it was trained on.

A: And third, pre-norm versus post-norm. Putting the layer norm before each sublayer, like G P T two does, instead of after, like the original Transformer did. That changes no flops at all. But post-norm needs a learning-rate warmup and a lower peak learning rate to train stably. That's Xiong and colleagues, twenty twenty. So here the whole comparison lives or dies on learning-rate tuning.

<!-- section: The Idea: Noise -->

A: Now, noise. Is the gap even real? Train the same config twice with different seeds. The seed is the number that starts the random number generator. It decides the initial weights and the order the data comes in. Same seed, nearly the same run. Different seed, a slightly different final model. And the final validation losses won't match. At the sizes you'll train, the spread is often around point oh oh five to point oh two. That's loss in nats per token, the natural-log version of how surprised the model is by each next token. It's a rough range; you'll measure yours. And the differences you're looking for between M H A and G Q A are the same size or smaller.

B: [skeptical] So the point oh four from the first message...

A: [dryly] Could be two or three seeds' worth of spread on its own, before you even get to the learning rate. One run per variant tells you almost nothing. You need either several seeds per point, so you can compare a difference in means to the spread, or a margin so large that noise can't explain it. The working rule: at least two or three seeds at each frontier point. Report the mean and the standard deviation. And don't call a difference smaller than about twice the seed spread. There's a whole lesson on the statistics, "Is that improvement real?", but that rule gets you most of the way.

A: And there's one mercy. Each U is fitted through four or five points, and fitting a curve averages away some of the noise. So the bottom of a fitted curve is more trustworthy than any single run.

<!-- section: The Idea: Confounders -->

A: Last idea before we build. Confounders. Anything other than the architecture that differs between your runs and moves the result, so you end up crediting or blaming the variant for what the setup did. The usual suspects, roughly in the order they bite. One: the learning rate was tuned for one variant. You tuned M H A, then reused its learning rate for M Q A. Different designs often have different best learning rates. So tune each, at least coarsely, at your smallest budget, and check the best one isn't sitting at the edge of your grid.

A: Two: the schedule length isn't matched to the run length. That's exactly the Kaplan-to-Chinchilla story. Every run's cosine decay, the learning rate gliding down to near zero, has to end when that run ends. Three: different tokens. Different data order is fine, that's just seed noise. Different data, a different tokenizer, a different validation set, not fine. Four: different parameter counting. Counting embeddings for one and not the other, or forgetting that tied weights only count once. Five: different flop counting. Using two N for one variant whose real cost is dominated by attention.

B: And six is the equal steps thing.

A: Six is equal steps when you meant equal flops. A variant that's ten percent cheaper per token should get ten percent more tokens. And seven: speed from software, not design. In wall-clock comparisons, one variant hits a fast fused kernel and the other falls back to a slow path. Check M F U for both. And that one's sneaky with M Q A in particular, because its K and V projections are tiny, skinny matmuls, which tend to run at worse utilization. So a wall-clock comparison can be reflecting software, not the design.

A: And for a base rate: in twenty twenty-one, Sharan Narang and colleagues at Google re-tested dozens of published transformer modifications, all in one shared codebase. Most of them didn't help. The ones that did were mostly small and computationally cheap, the G L U variants among them. So when a variant looks like a big win, look for the confounder first.

<!-- section: Build It: Setup and peak -->

A: So here's what you'd build. Everything runs on the Spark, except the flop-counter check, which runs anywhere. One small project: a configurable model, a flop counter, a training script that does one run, a sweep script, a plotting script, a decode benchmark, a folder with one result file per run, and a one-page write-up at the end.

A: Setup first. A recent PyTorch with CUDA on the Spark; NVIDIA's PyTorch container is the easy route on D G X O S, check its docs for the current version. For data, reuse the pre-tokenized shards from the small language model lesson if you've still got them. Otherwise any clean English corpus works, a sample of FineWeb Edu is a good choice, tokenized once into a flat array of sixteen-bit token IDs for training and a separate one for validation. You'll want on the order of a billion training tokens.

A: And use a small vocabulary. Something like eight to sixteen thousand tokens, like the one you build in the tokenizers lesson.

B: [curious] Why not just use the G P T two tokenizer? It's right there.

A: Because of the head. At the sizes you'll train, a few million to a few tens of millions of non-embedding parameters, a fifty-thousand-token embedding table would be bigger than the whole model. And the output head would dominate your flops, so the comparison would end up being about the head instead of about attention. A small vocab keeps the comparison about the thing you're testing. And whatever you pick, it's the same for every run.

A: Then you measure your achievable peak. It's a tiny script. Make two random eight-thousand-one-hundred-ninety-two square matrices in B F sixteen on the GPU, multiply them a few times to warm up, then time twenty multiplies. The important line is the one that waits for the GPU to actually finish before you read the clock, because GPU calls return immediately and the work happens later. Then the flops are two times n cubed per multiply, from the matmul rule, divided by the time. Write that number down. That's your M F U denominator.

<!-- section: Build It: The model -->

A: Next, the model. Start from your from-scratch G P T and add one setting: the number of K V heads. If it equals the number of query heads, that's M H A. If it's one, M Q A. Anything in between that divides the number of heads evenly is G Q A. Use rope or learned positions, your call, but the same for every variant. The default shape in the lesson is small: context five twelve, six layers, width three eighty-four, twelve heads. There's also a switch for the swiglu MLP with that eight-thirds hidden size, and tied weights. And when you build the cache, it stores the small, un-broadcast keys and values. Just the K V heads, not copies for every query head.

A: For the attention itself, scaled dot product attention with the enable G Q A flag does the broadcast. If your PyTorch is too old for that flag, repeat interleave does the same thing by copying each K V head out to its group. Costs a copy, but it works.

A: And one trap that will bite you when you add decoding. The usual call passes is causal equals true, so each position can't see the future. But during decode with a cache, you're passing one new query against all T cached keys. And is causal, in that case, lines the mask up from the top-left corner, so it masks out almost everything.

B: So the one new token only sees, what, the first key?

A: More or less. So for the one-token step, pass is causal false. The single new query should see every cached key anyway. And then a test: with the number of K V heads equal to the number of heads, your new model has to match your original model bit for bit, or to B F sixteen rounding, given the same weights. If it doesn't, something in the refactor's off.

<!-- section: Build It: The flop counter -->

A: Then the flop counter. You write it straight from what we just talked through, broken into its parts so you can see them: projections, attention, MLP, head. Forward flops per token at a given sequence length, with a switch for full square versus causal half. Training flops per token is three times the forward. And then a check function that runs one forward, and one forward plus backward, under PyTorch's flop counter mode, and prints PyTorch's total next to yours with the ratio. It should say one point oh oh oh.

A: And here's the story I promised. On the Mac, on the CPU, with PyTorch two point fourteen point one, the default fused attention kernel wasn't counted at all. The total came out exactly one attention term short. And a bare scaled dot product attention call, on its own, reported zero flops.

B: [laughs] Zero. So the counter thinks attention is free.

A: [laughs] Thinks it's free. Forcing PyTorch onto its plain math attention path fixed it. You wrap the call in a context that picks the math backend. And with that, a G P T two small shaped model matched the hand count exactly for M H A, G Q A and M Q A, and forward plus backward came out at exactly three point oh times forward. The math path counts the full T by T square even when is causal is on, which is why the hand counter defaults to full counting. Now on the Spark's GPU, it's a different set of kernels. So check whether the flash and memory-efficient kernels get counted, and whether they count the full square. Write down what you find. It decides which number you trust.

<!-- section: Build It: The sweep -->

A: Then the real experiment: tune learning rates, and run the iso-flop sweep. You pick five shapes, from four layers at width two fifty-six up to eight layers at width five twelve. With M H A that's about three million non-embedding parameters at the small end and about twenty-five million at the big end. Head size is thirty-two everywhere, which is a small detail that matters: it means every width splits into a number of heads that divides evenly into groups of four for G Q A.

A: Budgets: three times ten to the fifteen flops, ten to the sixteen, and three times ten to the sixteen. Training flops, counted with your counter, not six N. And to guess where the bottoms of the U's land, use the Chinchilla rule of thumb, about twenty tokens per parameter. If compute is six times N times D, and D is twenty N, then compute is a hundred twenty times N squared. So N is the square root of C over a hundred twenty. That puts the bottoms near five million, nine million and sixteen million parameters. And for each budget you pick the four shapes that bracket it. Sequence length five twelve, and a fixed batch in tokens, say sixty-four thousand tokens per step, for every run.

A: The training script takes five things: variant, shape, budget, learning rate, seed. It works out the number of steps as the budget divided by training flops per token times tokens per step. Warmup, then cosine decay that ends at that run's last step. Not some global step count. And it writes the final validation loss, on a fixed held-out set of a few million tokens, to a result file, along with measured tokens per second and M F U.

A: And before you launch anything long: time it. Run one short job per shape, measure tokens per second, and work out how long the whole sweep takes. Hours is total flops divided by achieved flops per second, divided by thirty-six hundred. Three variants, three budgets, four shapes each, comes to about five times ten to the seventeen flops. At an assumed twenty teraflops per second achieved, that's about seven hours. One night on the Spark. If your number's much worse, scale every budget down by the same factor.

B: [pushing back] Why not just drop the biggest budget? That's where all the time goes.

A: Because the biggest budget is the one that tells you about slope. Two budgets can't give you a slope you trust. Shrinking all three by the same factor keeps the spacing, so you still get three points along the frontier.

A: Then the learning-rate sweep. For each variant, on the middle shape, at the smallest budget, try four learning rates, each a factor of two apart. For models this small, something like one point five thousandths up to twelve thousandths, but let the sweep decide. If the best one's at the edge, extend the grid. Then every variant uses its own best learning rate for the rest. Then the iso-flop sweep itself with seed zero, every variant, every budget, its four shapes. And then extra seeds: rerun the two shapes nearest each U's bottom with seeds one and two. And before the long run, have an agent review the training script for three specific things: that the schedule length follows the budget, that flops per token include attention and the head, and that validation uses the same tokens for every run.

<!-- section: Build It: Plots and decode -->

A: Then the plots. For each budget, fit a parabola through loss against log model size, and take the bottom: the best size and the loss there. And for the compute multiplier, take A's frontier, fit a line through it against log compute, or just interpolate, and for each of B's points find the compute A would've needed to hit B's loss. Divide by B's compute. Two plots come out of it. One with the U's, one color per variant, the mean of the seeds as the marker and the seed spread as an error bar. And one with frontier loss against log compute for each variant.

A: Then inference. And here's a nice shortcut: decode speed doesn't depend on what the weights are, only on their shapes. So besides your trained models, you benchmark the bigger shape from before, twenty-four layers, width ten twenty-four, head size sixty-four, with sixteen, four and one K V heads, and just random weights.

B: [skeptical] Random weights? That feels like cheating.

A: [reassuring] For speed it's exactly fair. The GPU reads the same number of bytes and does the same arithmetic whether the weights are trained or garbage. The tokens it generates are garbage, sure, but you're not measuring those. So the benchmark does two things. It sums up the actual bytes of every cached key and value tensor, and compares that to the formula. And it prefills five twelve random tokens for each sequence in the batch, then decodes five twelve more, one at a time, with the cache. Tokens per second is batch size times generated tokens over seconds. Plus peak memory.

A: And the rules for honest timing, same as in the bandwidth lesson. Warm up first. Wait for the GPU to finish before you read the clock. Use B F sixteen. And allocate the cache at its final length up front, so you're not timing the cost of growing a tensor every step. Run batch one and batch thirty-two. At batch one this model's small enough that Python and kernel-launch overhead may dominate, so try torch compile or CUDA graphs, check the current docs for the right mode, and report both.

<!-- section: Build It: The write-up -->

A: And the last piece is the write-up. One page. A reader who only reads the first paragraph should get the answer. That paragraph gives the training verdict as a compute multiplier with its noise, the inference verdict as tokens-per-second ratios at batch one and thirty-two, and a recommendation. Then setup: data, tokenizer, shapes, budgets, seeds, the learning rate per variant, and which flop-counting convention you used. Then the iso-flop results, with the seed spread, and an honest line about what is and isn't distinguishable. Then inference, measured next to the bandwidth floor. And caveats: what scale this was, what might change at a hundred times the scale, what you didn't control. Then you have an agent play a skeptical reviewer whose only job is "find the confounder". Fix what it finds, or list it under caveats.

A: You're done when your hand count matches PyTorch's counter within one percent for all three variants, and you know which attention kernels it does and doesn't see. When you have U's for all three at three budgets, each at its own tuned learning rate, with at least three seeds near each bottom. When you have K V bytes and decode speed at batch one and thirty-two next to the predicted floors. And when the write-up answers "which is more compute efficient, and for what?" in its first paragraph, with numbers and error bars.

<!-- section: Measure -->

A: So what should the numbers look like? Start with the counter check. For reference, on the Mac, G P T two small shape, ten twenty-four context, math attention: M H A came to two hundred ninety-one point seven billion flops per sequence. G Q A with four K V heads, two seventy-two point four. M Q A, two sixty-five point two. Every ratio to PyTorch's count was one point oh oh oh oh, and forward plus backward exactly three times forward. And without forcing the math path, PyTorch reported two fifty-three point one, two thirty-three point seven, and two twenty-six point five.

B: [working it out] So that's... thirty-eight point seven short each time. Which is the attention number from before.

A: Exactly the attention term, every time. That's how you know it's the kernel not being counted and not some random mismatch. Then you record the learning-rate sweep, the grid, the best rate, its loss, and whether it was at the edge, and the fitted bottoms for each variant at each budget with the seed spread. And for each shape, tokens per second and M F U for each variant. If the M F U differs by more than a few points between variants on the same shape, your wall-clock comparison is a kernel comparison.

A: Now the predictions. G Q A versus M H A in training: most likely indistinguishable. The difference is a small cut in about a fifth of the flops. If G Q A's bottom is within a seed standard deviation or two of M H A's, the honest statement is "no detectable difference at these budgets". Not "G Q A is point three percent better". M Q A versus M H A: close, possibly slightly worse. And if you do see a gap, check it survives seeds and per-variant learning rates before you believe it.

A: And one more thing to look for. For the same budget, G Q A's and M Q A's best runs should sit at a slightly larger shape than M H A's.

B: Because they're cheaper per token, so the same money buys a bit more model?

A: That's it. At a given shape they cost less, so the budget stretches to a bigger one. That's the equal-flops comparison doing its job, letting each variant pick its own size. Then decode. At batch one, a modest win for G Q A and M Q A, partly from the smaller weights. If you're launch-bound, maybe nothing at all. At batch thirty-two, a large win, roughly tracking the ratios of the floors we worked out: two point seven times, and nearly five. And if it doesn't, the first thing to check is whether your cache is really stored un-broadcast. If you repeat interleave the keys and values into the cache, you've just handed back all the memory you saved.

<!-- section: Break It -->

A: [playful] Then you break it, on purpose. Four ways. First, tune the learning rate for M H A only. Rerun M Q A's U at the middle budget with M H A's best learning rate instead of its own. If the gap between the variants moves by more than the seed spread, you've just measured how much of a result a confounder can manufacture. And this is the most common way these comparisons go wrong. It's exactly what the first message in the channel did.

B: And the second?

A: Second, compare at equal steps with the wrong swiglu. Add a swiglu variant with hidden size four d, not eight thirds of d. Train it and the gelu version for the same number of steps on the same shape. Swiglu wins comfortably. Now put both through one iso-flop budget, counting swiglu's real flops, which is fifty percent more in the MLP. Most of the win shrinks. Then fix the hidden size to eight thirds of d and compare again. Whatever's left is the actual design effect.

A: Third, trust one seed. Run five seeds of one config and look at the spread. Then go back to your seed-zero-only iso-flop points and ask how many of the orderings between variants would survive that spread. Usually, at these budgets, very few of the small ones do.

B: [amused] So most of the "wins" are just which seed you rolled.

A: The small ones, yeah. And fourth, count flops with two N at long context. Rerun the smallest shape at sequence length two thousand forty-eight, and set its number of steps using six N instead of your full counter. At width two fifty-six, the attention term alone is bigger than all the weight flops. So the run silently costs about twice its budget. And a variant whose attention is cheaper looks bad, because you under-charged the other one. And then remember the counter trap: if your flop counter can't see the fused attention kernel, it makes exactly this mistake for you, quietly.

<!-- section: Explain It Back -->

B: Okay, so say a teammate comes to me with a new variant that beats the baseline by point oh two in loss. Given all this... I'm not just believing it.

A: [thinking out loud] No. And it's worth having the questions ready. How many seeds, and what's the seed spread? At small scale it's often around point oh one, so one seed at point oh two is weak evidence. Equal what: steps, parameters or flops? And counted how, did the flop count include attention and the head? Was the learning rate tuned for both, or just the baseline? Did the schedule end when each run ended? Same data, same tokenizer, same validation set? Was it one budget, or does it hold at three and ten times the compute, since frontiers can have different slopes? And what does it cost at inference, because training loss isn't the only bill. And Narang's result is your prior: most published modifications didn't survive a re-test in one shared codebase. So skepticism's the default.

B: And if they say "well, it's faster in wall-clock"?

A: Then ask about M F U, and about shape. Here's a case where they disagree. Take a deeper, narrower model with the same parameters and the same flops as a wider, shallower one. At equal flops they might tie. At wall-clock, the deep one can lose, because its layers run one after another, and each of its matmuls is too small to fill the GPU. So wall-clock's a real answer, for your hardware today. It's just not a statement about the design.

<!-- section: Connections and close -->

A: If you want to go further, the Chinchilla paper's iso-flop method and its appendix on counting flops are the core of this, and EleutherAI's "Transformer Math one oh one" is the practical cheat sheet. And this same flop accounting is what tells you how long a run should take once you split training across many GPUs, where M F U becomes the way you see how much the communication is hurting.

B: [working it out] Okay, let me try to say it. Comparing two designs fairly means giving them the same compute, not the same parameters or steps, and letting each one pick its best size. You count the compute properly, including the attention and the head. And for G Q A, it comes out about the same in training, and it's way faster at serving because there's less K V cache to read.

A: [warmly] That's most of it. Two things I'd sharpen. "The same compute" isn't one run each, it's a few sizes at a few budgets with a few seeds, each at its own learning rate, because the gap you're hunting is about the size of the noise. And G Q A isn't simply "way faster at serving". It's barely faster with one user and a short prompt, and the win grows with batch size and context, because the cache is the part of every decode step that grows. So the real answer always comes with "for what": per training flop, a tie. Per served token under load, a big win.
