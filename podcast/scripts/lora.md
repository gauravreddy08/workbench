<!-- section: The Problem -->

A: [relaxed, thinking out loud] So your cross-encoder at work ranks documents pretty well. But say you want something it can't do. You want a model that reads a query and a page, and hands back a strict, machine-readable judgement. A little JSON object with a label, zero to three, and a one-sentence reason. Something you could use to label training data, or as a second check on what the ranker returned. So you try just prompting Llama three point one, the eight billion parameter instruct model. And it's right most of the time. It really is. But about one time in twenty, it opens with "Sure! Here's my assessment", or it forgets a field, or it invents a label four on a zero-to-three scale. And your parser falls over. At three in the morning. On the one batch that mattered.

B: [dry] That's always the batch.

A: [laughs] It's always that batch. So the obvious fix is, you train the model on a few thousand examples of exactly the output you want. That's fine-tuning. You take a model that's already been trained, the pretrained one, and you train it a bit more on a smaller, specific dataset, so it gets good at one job.

B: Okay, and the Spark has a hundred twenty-eight gigs. An eight billion parameter model in B F sixteen is two bytes a parameter, so sixteen gigabytes. I've got, like, eight times the room I need.

A: [patiently] For running it, yes. That's the serving number. Training is a completely different bill. Remember the training-memory lesson: when you train every weight with the usual optimizer, Adam, in mixed precision, every single parameter costs about sixteen bytes. Not two. Sixteen. And that's before you've stored a single activation. So eight billion parameters times sixteen bytes is a hundred twenty-eight gigabytes. Which is the Spark's entire memory, on the spec sheet, and that memory's shared with the operating system and the CPU too. So it doesn't fit. And not "fits badly". It just doesn't fit.

B: Huh. Eight times the serving number.

A: Eight times. And suppose it did fit. Every task you fine-tune for gives you a brand new sixteen gigabyte copy of the model. A relevance judge, an extractor, a query rewriter. That's three copies, forty-eight gigabytes of disk, and if you want to serve all three at once, that's three whole models sitting in memory.

A: [leaning in] But here's the strange thing. The change that fine-tuning actually makes to the weights turns out to be tiny. And simple. You're paying to update eight billion numbers, when the change you need could often be written down with a few million.

<!-- section: Origin -->

A: And that's not something people noticed on a laptop. It came from the biggest models hitting a wall. By twenty twenty, the standard recipe was: pretrain one big model, then fine-tune a separate copy for each task. And that breaks at GPT-three's size. A hundred seventy-five billion parameters is three hundred fifty gigabytes in sixteen-bit. A fine-tuned copy per customer is absurd to store, never mind train.

B: There must've been cheaper tricks before LoRA, though.

A: [thinking back] There were two big ones. Adapters, from Houlsby and colleagues in twenty nineteen. You freeze the model and insert small new layers inside each transformer block, a little squeeze-and-expand network, and you train only those. Works. But those layers sit in the path of every single token, so they add latency every time you run the model. The other one was prefix tuning, Li and Liang, twenty twenty-one. Instead of changing any weights, you learn a handful of fake tokens, well, really fake key and value vectors, that get stuck on the front at every layer. Those eat into your context window, and people found them finicky to train.

A: Then in twenty twenty-one, Edward Hu and his colleagues at Microsoft proposed something simpler. Leave every weight frozen. And learn the change to each weight matrix as the product of two thin matrices. On GPT-three, the hundred seventy-five billion one, LoRA cut the number of parameters you train by about ten thousand times. It cut training memory by about three times. And it shrank the checkpoint for one task from three hundred fifty gigabytes to about thirty-five megabytes.

B: [surprised] Gigabytes to megabytes. For the same task?

A: For the same task, and it matched full fine-tuning on their benchmarks. And there's one more property, which is honestly why it won. Those two thin matrices can be multiplied out and added straight back into the original weight. So at inference it costs nothing extra. Adapters couldn't do that. LoRA could.

<!-- section: The Idea: A small edit to a big matrix -->

A: So let's build it up. Strip a transformer down, and most of its parameters live in a handful of big linear layers in each block. A linear layer just multiplies the input vector by a weight matrix. In PyTorch that's N N dot Linear. In attention you've got four: the query, key, value and output projections. In the MLP you've got three more, which Llama calls gate, up and down. Each one's a matrix W, and the layer computes W times x.

A: Fine-tuning starts from the pretrained W and nudges it. And after training you've got a new matrix, which you can always write as the old one plus a difference. The new W is the old W plus delta W. Delta just meaning "the change".

B: Sure, that's just subtraction. Any new matrix is old plus something.

A: [amused] Right, it's trivially true. But it lets you ask the useful question: what does that difference look like? In full fine-tuning, delta W has no restrictions at all. Every entry is free. For one four thousand ninety-six by four thousand ninety-six projection, that's sixteen point eight million numbers. For one matrix, in one layer. And LoRA's whole idea is to put a restriction on the shape of delta W, so it can be stored and trained with way fewer numbers.

<!-- section: The Idea: The bill for doing it the full way -->

A: Before the trick, though, let's actually add up the bill for not using it, because the trick only makes sense against it. Two words first. Adam is the standard optimizer for transformers. For every parameter it keeps two running averages: one of the gradient, which is the momentum, and one of the squared gradient, which it uses to scale each step. Adam W is the same thing with weight decay handled separately. And mixed precision means you run the forward and backward passes in a sixteen-bit format, B F sixteen, because it's fast, but you also keep a thirty-two bit "master" copy of the weights, so that really tiny updates don't just round away to nothing.

A: So per parameter. Two bytes for the B F sixteen weight the passes actually use. Two bytes for its gradient, also B F sixteen. Four bytes for the F P thirty-two master copy. Four bytes for Adam's first average. Four bytes for Adam's second. Two plus two plus four plus four plus four. Sixteen.

B: So the weights themselves are only two of the sixteen.

A: One eighth of the bill. Everything else is bookkeeping for training. And implementations differ a little, some keep thirty-two bit gradients, some drop the sixteen-bit copy, so treat sixteen as the standard round number. Then on top of all that you've got activations. Those are the intermediate outputs of every layer from the forward pass, which you have to keep because the backward pass needs them to compute gradients. And they grow with batch size times sequence length.

A: [slowing down] Now here's the part that matters. Look at what a frozen weight costs. If a parameter isn't being trained, it needs no gradient. No master copy. No optimizer state. It costs just its two bytes in B F sixteen, or about half a byte if you store it in four bits. So the whole game is: freeze almost everything, and make the part that trains tiny.

A: Picture it as horizontal bars, all on one scale, with a dashed line way out on the right at a hundred twenty-eight gigabytes, the Spark. The top bar is full fine-tuning of the eight billion model. Sixteen for weights, sixteen for gradients, thirty-two for the master copy, sixty-four for Adam's two averages. It runs exactly to the dashed line. And activations would have to go past it. The next bar, LoRA on the same model, is a short sixteen gigabyte block of frozen weights, plus a sliver, about point seven of a gigabyte, for the small part that trains. Below that, QLoRA, the four-bit version we'll get to, is about five point seven gigabytes of frozen weights plus that same sliver. And the last bar is full fine-tuning of a one billion parameter model, which is one point two four billion times sixteen bytes, about twenty gigabytes. And every one of those bars gets activations on top.

B: Where does five point seven come from? Eight billion at half a byte would be four.

A: [warmly] Good catch. That five point seven is an estimate, not a measurement. The transformer layers, at a little over four bits per weight, come to about three point six gigabytes. But the input embedding and the output head are normally left in B F sixteen, and with Llama three's vocabulary of about a hundred twenty-eight thousand tokens, those are about a gigabyte each. So, three point six plus roughly two. And you'll measure the real number on the Spark.

<!-- section: The Idea: The low-rank bet -->

A: [relaxed] Okay. Here's the restriction. Instead of learning delta W directly, which is d by d, you learn two thin matrices and multiply them together. Call them B and A. B is tall and skinny: d rows, r columns. A is short and wide: r rows, d columns. And r is small. Eight, sixteen, sixty-four. Against a d of four thousand ninety-six.

A: Now think about what B times A does to an input x. First A takes the four thousand ninety-six numbers of x and squeezes them down to just r numbers. Say sixteen. Then B takes those sixteen and spreads them back out to four thousand ninety-six. So whatever the update does, it has to pass through a sixteen-number bottleneck. Which means the update can only push the output in sixteen independent directions.

B: [working it out] So however big the matrix is, the change it can make is... sixteen-dimensional. Only sixteen knobs' worth of directions.

A: That's it. And that's exactly what the rank of a matrix means: the number of independent directions it can output. A d by d matrix has rank at most d. A product with an r-wide middle has rank at most r, however big d is. That's why B times A gets called a low-rank update. A low-rank matrix is one whose rank is much smaller than its size, so you can write it exactly as a tall-thin matrix times a short-wide one.

A: Now count the numbers. B has d times r. A has r times d. So together, two times d times r. Against d squared for the full matrix. With d at four thousand ninety-six and r at sixteen, that's about a hundred thirty-one thousand numbers instead of sixteen point eight million. Under one percent, point seven eight percent. Rank eight halves that, about sixty-five thousand, point three nine percent. Rank sixty-four is about half a million, still only three percent.

B: And for the MLP ones that aren't square?

A: Same logic. If the input size is k and the output is d, like Llama's MLP going from four thousand ninety-six up to fourteen thousand three hundred thirty-six, you get r times d plus k. And if you sum that over every linear layer in Llama three point one eight B at rank sixteen, you get forty-one million, nine hundred forty-three thousand and forty trainable parameters. Call it forty-two million. About half a percent of the model. If you only adapt the query and value projections at rank sixteen, it's six point eight million. Under a tenth of a percent.

A: So the bet is that the update fine-tuning actually needs is close to low-rank. That the restriction costs you very little. And whether that's true... depends on the update.

<!-- section: The Idea: Seeing the rank -->

A: There's an interactive figure in the lesson that makes this really concrete. It's a toy. A twenty-four by twenty-four update matrix, drawn as a grid of coloured squares, blue for positive, dark for negative. Next to it, the best possible rank-r approximation of it, and next to that, the error, what's left over. And there's a slider for r, from one to twenty-four. The fit it shows isn't from a training run. It's the mathematically best rank-r fit, from something called the truncated S V D. So it's a ceiling: no LoRA training at that rank could ever do better.

A: And you get three kinds of update to choose between. "Few directions", "few directions plus noise", and "many directions". Three things to notice while you drag.

A: First, the shapes. Under the matrices, B and A are drawn to scale next to W. At rank four, they're slivers. Even in this tiny toy, their combined count is a third of d squared. And at the real d of four thousand ninety-six, that same rank four is point two percent. The savings grow with d, because d squared grows a lot faster than two d r.

A: [more animated] Second, the error curve, which honestly is the whole story. With "few directions", the error falls off a cliff at exactly the right rank, rank four, and then sits at zero. Every rank past that is wasted. With "many directions", there's no cliff. The curve's a slow slope. Every extra rank buys you a little, and you only get all of it back at full rank, twenty-four. So any small rank leaves most of the update on the table.

A: Third, the bars along the bottom. Those are the update's singular values. Every matrix has a set of independent directions, and the singular values are how strong each one is, sorted, biggest first. The rank is how many of them aren't zero. And there's a classic result, the Eckart-Young theorem, that says keeping the top r of them gives you the best rank-r approximation there is. So LoRA can only ever capture the top r of those bars. Everything past them is just gone.

A: So try this. Pretend you fine-tuned a model the full way. Then you took the difference, new W minus old W, for one attention projection, and looked at its singular values. If the task was narrow, say, always answer in this JSON format, does the spectrum look like "few directions" or "many directions"? And what if instead it was continued training on twenty billion tokens of code?

B: [a bit unsure] Code feels like many. Like, that's a whole language's worth of stuff. The JSON one... I want to say few, but it's still the whole model learning to behave differently, so maybe it's more spread out than you'd think?

A: Your instinct on code is exactly right. And the JSON one is closer to "few directions", with a tail. The LoRA paper looked at exactly this. They found the update has a very low "intrinsic rank": an adapter of rank one to rank eight captured most of what mattered on their tasks. And when they looked at which directions LoRA learned, they were mostly amplifying features that were already there in W, just not emphasised. The model already knew how. It just needed turning up.

B: [curious] And code?

A: Much closer to "many directions". In twenty twenty-four, Biderman and colleagues measured the spectrum of full fine-tuning updates in that kind of setting, and to explain ninety percent of what the update was doing, they needed a rank ten to a hundred times higher than typical LoRA settings. Learning a whole new domain is not a small edit.

<!-- section: The Idea: Why a tiny rank is often enough -->

A: The deeper reason it works goes back to a twenty twenty paper by Armen Aghajanyan, Luke Zettlemoyer and Sonal Gupta, called "Intrinsic Dimensionality Explains the Effectiveness of Language Model Fine-Tuning". The question they asked was: how many free numbers do you actually need to fine-tune a pretrained model to good accuracy?

A: And the method's kind of wild. You freeze the model. Then you pick a fixed, random way to map a small vector of k numbers onto a change in all of the weights. A random projection. And you train only those k numbers. Then you find the smallest k that still gets you ninety percent of what full fine-tuning gets. That k is the task's intrinsic dimension. The idea of measuring it that way came from Li and colleagues in twenty eighteen.

B: And how small did it get?

A: For a RoBERTa model on a paraphrase task, one called M R P C, about two hundred numbers. Two hundred trainable numbers, randomly spread across all of its hundreds of millions of weights, got ninety percent of full fine-tuning's performance.

B: [skeptical] Two hundred. Not two hundred thousand.

A: [quietly] Two hundred. And the part that's even stranger: bigger, better-pretrained models had smaller intrinsic dimension. Pretraining makes the model so ready for language tasks that adapting it is a short walk, in a few directions. So LoRA takes that observation and turns it into an engineering choice. Instead of a random projection, it uses a structured one, low-rank, one per matrix, that's cheap to train and can be multiplied out at the end.

<!-- section: The Idea: The LoRA layer, piece by piece -->

A: So here's one LoRA-wrapped linear layer, in words. The output is W times x, the normal thing, plus a side path: A times x, then B times that, then multiplied by a scale, alpha over r. Picture it as two lanes. The input x comes in from the left and splits. The top lane goes through W, the big frozen box. No gradient, no Adam, stored in B F sixteen or in four bits. The bottom lane goes through A, which is drawn like a funnel narrowing down to a little box of r numbers, then B, a funnel widening back out, then the scale. And the two lanes meet at a plus sign and come out as h. Only the bottom lane trains.

A: There are three design details hiding in that, and each one's there for a reason. First one: B starts at zero.

B: Why zero, though? Wouldn't you want both to start random, so the adapter's doing something from step one?

A: [jumping in] That's the thing, you don't want it doing something from step one. With B at zero, the side path outputs exactly zero, so the layer is W times x, exactly. On step zero, the model is the base model, with all its abilities intact. Training starts from a known-good point and moves away only as far as the data pushes it. A random B would mean you start from the base model plus random noise in every layer.

B: Okay, then why not both at zero? Cleaner.

A: [amused] Because then nothing ever trains. Look at the gradients. The gradient for B is proportional to A times x. That's what B sees as its input. And the gradient for A is proportional to B, flipped over, times the gradient coming back from above. So each one's gradient gets multiplied by the other matrix. If both start at zero, both gradients are zero. Forever. So one of them has to be random, so the other one gets a signal. A is the random one. The paper used a Gaussian. Hugging Face's PEFT library uses the same init as a normal N N dot Linear, called Kaiming uniform.

B: So on the very first step, B gets a gradient, because A times x isn't zero. But A gets nothing, because B is zero.

A: Exactly that. At step zero, A's gradient is exactly zero and B's isn't. And you'll see that with your own eyes when you build it. After one step B isn't zero anymore, and then A starts getting signal too.

A: Second detail: the scale, alpha over r. Alpha is just a fixed number you pick, usually equal to r or twice r. The point of dividing by r is to keep the size of the update roughly steady as you change r. So you can try rank eight and rank thirty-two without retuning the learning rate from scratch. The original paper just set alpha to whatever r they tried first and never tuned it. A later analysis called rank-stabilised LoRA, Kalajdzievski, twenty twenty-three, argued that dividing by the square root of r behaves better at large ranks, and PEFT has a flag for that. In practice: fix alpha relative to r, say alpha equals two r, and tune the learning rate instead.

A: Third, and it's optional: LoRA dropout. Dropout just on the input to the side path, not the frozen path. Usually somewhere around five to ten percent. A mild guard against overfitting when your dataset's small.

A: Okay, here's a question that trips people up. LoRA trains half a percent of the parameters. Does a training step take half a percent of the time of full fine-tuning? Or roughly what fraction?

B: I mean, it should be massively faster? If ninety-nine and a half percent of the model isn't training, you're not computing gradients for it. Maybe not two hundred times faster, but... ten times?

A: About two thirds. Two thirds of the time of a full step. And sometimes barely less than full fine-tuning.

B: [surprised] Two thirds? That's barely anything.

A: [working it out] Here's why. A training step for a transformer costs about six floating-point operations per parameter per token. Two of those are the forward pass. Then the backward pass does two separate jobs. Two operations to get the gradient with respect to each layer's input. You need that so the gradient can keep flowing backwards to earlier layers. And two more to get the gradient with respect to each layer's weights. Freezing W only saves that last part. The weight gradients.

B: But if a layer's frozen, can't you just skip it on the way back?

A: [gently] That's the natural thought, and it's the wrong one. The adapters in layer one need the gradient that flows back from layer thirty-two. And the only way to get it there is to push it backwards through every frozen layer in between. So the forward pass still runs through every frozen weight, and the backward pass still goes back through every frozen layer. You save the weight-gradient part and that's it. So it's about four operations per parameter per token instead of six, plus a little for the adapters themselves. The big wins from LoRA are memory, no gradients or Adam states for the frozen weights, and storage. Not compute.

A: And QLoRA, the four-bit version, is usually slower per step than plain B F sixteen LoRA. Because every frozen weight gets unpacked from four bits on the fly, in the forward pass and again in the backward pass.

<!-- section: The Idea: Which matrices to adapt -->

A: Next choice: which linear layers get a LoRA wrapper. You pick.

B: Every tutorial I've seen does query and value. So, that?

A: [a bit wry] That's where that comes from. The original LoRA paper was short on memory with GPT-three, so they adapted only the query and value projections. They found that splitting a fixed budget across both beat putting all of it in one, and that became the default in a lot of tutorials. But it isn't the best default anymore. The QLoRA paper found that adapting every linear layer, attention and MLP, was needed to match full fine-tuning quality. And once you do that, the rank matters a lot less. "LoRA Learns Less and Forgets Less", which we'll get to, found the same. And Thinking Machines, in a twenty twenty-five write-up called "LoRA Without Regret", found that the MLP layers matter most. Attention-only LoRA underperformed even when they gave it the same number of parameters.

B: Which, I guess, makes sense if that's where most of the parameters are.

A: Right, most of a transformer's parameters live in the MLP, so it's not surprising. So the practical default: target all the linear layers in the blocks. PEFT, which is Hugging Face's library for this whole family of tricks, lets you just say "all linear". Leave the embeddings and the output head frozen. And start at rank sixteen.

<!-- section: The Idea: Merging -->

A: So you've trained. Now you've got W, frozen, unchanged, and a little B and A for every layer you adapted. You can serve it like that, computing the side path on every token. Or you can multiply it out once. The merged W is W plus alpha over r times B times A. And that's exactly the shape of W. So now the model is just an ordinary model. Same architecture, same speed, nothing extra on the forward path. Zero added latency at inference, because there's nothing left to add. That's the property that beat adapters. PEFT calls it merge and unload. And you can go back, too. Subtract the same product and you've got the base model again, up to rounding.

B: And if I trained with QLoRA, I'd merge into the four-bit weights, since that's what it trained against?

A: [jumping in] That's the one trap. Don't. If you merge into the four-bit weights, the sum has to be re-quantized back into four bits. And your update is tiny compared to the gaps between four-bit levels, so most of it just rounds away. The usual practice is: load the base in B F sixteen, merge the adapter into that, and save a B F sixteen model. Now, that model's very slightly different from the one you trained, because the base is B F sixteen instead of four-bit. So you always run your eval on the merged model. Not just on the training checkpoint.

A: So, quick sizing. How big is the saved adapter file for Llama three point one eight B, rank sixteen on every linear layer, stored in B F sixteen? And how big's the merged model?

B: [working it out] Forty-two million parameters, two bytes each... eighty-four megabytes? And merged is the whole model again, so sixteen gigs.

A: Eighty-four megabytes, plus a small config file. And the merged model's eight point oh three billion times two bytes, about sixteen gigabytes. That's a two hundred times gap. Which is why you ship adapters around and only merge at the end. And it's why one server can hold hundreds of them.

<!-- section: The Idea: Serving many adapters on one base -->

A: Because merging bakes in one task. But not merging has a kind of superpower. The base weights are shared, and each adapter's tens of megabytes. So one server can hold one copy of the base and hundreds of adapters, and pick an adapter per request.

A: Picture the two choices side by side. On the left, merge: W plus the scaled B times A equals a new W, same shape, same speed, no side path at runtime, one model per task. On the right, serve many. A batch of four requests, each one tagged with an adapter name. Judge, extract, judge again, and one that wants the plain base model. All four go through the shared base W in a single matrix multiply. Then a special step applies each row's own B times A. And down below there's an adapter pool. A couple are already loaded on the GPU. Others are sitting in CPU memory, and get loaded in when a request asks for them.

B: And that per-row step is just... a normal batched multiply?

A: [thinking out loud] That's actually the hard part. A batch where row one uses "judge" and row two uses "extract" can't be one plain matrix multiply, because the rows need different matrices. A twenty twenty-three system called Punica, from Chen and colleagues, wrote a custom GPU kernel that does a different small multiply for each segment of the batch. Then S-LoRA, from Sheng and colleagues the same year, the paper's called "Serving Thousands of Concurrent LoRA Adapters", added paging. Adapters live in CPU memory, and move into a pool on the GPU as requests arrive, a pool it shares with the KV cache. If you remember the serving-engine lesson, that's the same trick V L L M plays with the KV cache: chop memory into fixed-size blocks and hand them out on demand, like an operating system pages memory. Same idea, applied to adapters.

A: And V L L M supports this directly. You turn LoRA on, register adapters by name, and each request picks one through its "model" field. The flags are things like enable LoRA and LoRA modules, but check V L L M's docs for your version. The price: the side path runs on every token now, so unmerged adapters cost a little speed. That's what flexibility costs.

<!-- section: The Idea: QLoRA -->

A: So LoRA got rid of gradients and optimizer states for the frozen weights. But the frozen weights themselves are still two bytes each. Sixteen gigabytes for an eight B. A hundred thirty gigabytes for a sixty-five B. And in twenty twenty-three, Tim Dettmers, Artidoro Pagnoni, Ari Holtzman and Luke Zettlemoyer asked the obvious question. The base is frozen. Why store it in sixteen bits at all?

A: That's QLoRA. Quantized LoRA. Store the frozen base in four bits, unpack each weight to B F sixteen on the fly when the multiply needs it, and train ordinary B F sixteen LoRA adapters on top. They fine-tuned a sixty-five billion parameter model on a single forty-eight gigabyte GPU, and matched sixteen-bit fine-tuning quality on their benchmarks. Three pieces made it work.

A: First, a number format called N F four, four-bit NormalFloat. From the quantization lesson: four bits gives you sixteen possible levels, and the whole question is where to put them. Pretrained weights are roughly bell-shaped around zero. Lots of small ones, a few big ones. So N F four puts its sixteen levels at the quantiles of a bell curve, so each level gets used by roughly the same number of weights. Packed tight near zero, where most weights live, spread out in the tails. Every block of sixty-four weights gets its own scale, which is just the biggest absolute value in that block. When the multiply needs the block, it's unpacked to B F sixteen on the fly. The adapter math is in B F sixteen the whole time. And gradients flow through the four-bit weights, to reach earlier layers, but never update them.

A: Second, double quantization. Every block of sixty-four weights stores one thirty-two bit scale. Thirty-two bits shared across sixty-four weights is half a bit per weight, just for scales. On a sixty-five B model that's four gigabytes of nothing but scales. So QLoRA quantizes the scales too. They get stored in eight bits, in blocks of two hundred fifty-six scales, and each of those blocks gets its own thirty-two bit scale, a second level.

B: So now it's eight bits shared by sixty-four weights, which is... an eighth of a bit each?

A: An eighth of a bit, plus a tiny sliver for the second-level scales, which are spread over sixty-four times two hundred fifty-six weights. About point one two seven bits per weight in total. So you save about point three seven bits per weight. Sounds like nothing. On a sixty-five B model it's about three gigabytes.

A: Third, paged optimizers. Memory use during training spikes. An unusually long batch comes through, say, and a spike at the wrong moment is an out-of-memory crash. So QLoRA put the optimizer states in NVIDIA's unified memory, which is GPU memory that can automatically move pages back and forth to CPU memory as they're touched. On a spike, the optimizer states get paged out to CPU RAM, and paged back in when they're needed. Same as the operating system swapping pages out to disk, from the virtual memory lesson. On the Spark, the CPU and GPU already share one pool of memory, so there's less to page between. But the same option still protects you from a crash.

B: [skeptical] Okay, but the base is a quarter the size. So QLoRA's faster too, right? Less to read.

A: [amused] Slower, actually. Every frozen weight gets dequantized, unpacked from its four-bit form back to B F sixteen using its block's scale, right before the multiply that needs it. On every forward pass, and again on every backward pass. That's extra work. So QLoRA steps are slower than B F sixteen LoRA. And on the Spark, B F sixteen LoRA on an eight B fits easily. QLoRA is a choice you can make, right up until you try a seventy B.

<!-- section: The Idea: What LoRA can and can't learn -->

A: Now the honest part. And it's the part that decides when you reach for LoRA at all.

B: Well, the big use case at work would be, like, fine-tune it on all our internal docs so it knows our stack.

A: [wincing a little] That's the case it's worst at. In twenty twenty-four, Dan Biderman, Jacob Portes, Jose Javier Gonzalez Ortiz and colleagues, at Columbia and Databricks, ran the careful comparison. The paper's called "LoRA Learns Less and Forgets Less". They trained Llama two, the seven B, on code and on math, in two regimes. One was continued pretraining: billions of tokens of raw text from a new domain, to teach the model knowledge, not just a format. The other was instruction fine-tuning: prompt and response pairs, thousands to a few hundred thousand of them, so the model learns to follow instructions or a task format. And they compared full fine-tuning against LoRA at different ranks.

A: Finding one: LoRA learns less. On the target domain, LoRA did substantially worse than full fine-tuning, most of all in continued pretraining on code. It was much closer on instruction fine-tuning. And when they looked at the full fine-tuning updates, they were high rank. Ten to a hundred times more than typical LoRA settings. A low-rank adapter can't hold a domain's worth of new facts.

A: Finding two: LoRA forgets less. They measured what the base model could already do, language understanding and common-sense benchmarks like HellaSwag, ARC and WinoGrande, and LoRA kept more of it than full fine-tuning did. A small edit breaks less. And their advice was: target all modules, use a higher learning rate than you would for full fine-tuning, and use LoRA where the goal is adapting behaviour, not absorbing a corpus.

A: Which is the toy figure again. A new output format, a style, a narrow classification or extraction task: that's "few directions", and LoRA's close to full fine-tuning. Everything about your company's internal APIs, or a new language: "many directions", and LoRA leaves a lot of it out. And for knowledge, retrieval, just putting the facts in the prompt, usually beats fine-tuning anyway. "LoRA Without Regret" sharpened the boundary: with all layers adapted and the right learning rate, LoRA matched full fine-tuning on small-to-medium post-training datasets, and fell behind once the dataset carried more information than the adapter had room for.

B: [relieved] So for the relevance judge, I'm squarely in the good case. Format plus a narrow judgement.

A: Squarely. And the flip side, forgetting, has a name. Catastrophic forgetting: training on a new task overwrites what the network knew before, so its ability on old tasks drops sharply. McCloskey and Cohen named it in nineteen eighty-nine, for small networks, and it's still very real for big ones. It's what happens when your fine-tune gets great at relevance labels and quietly gets worse at everything else. It stops following other instructions. Its general knowledge slips. It answers every question with a relevance label. Lower rank, fewer steps, a lower learning rate, and mixing a little general instruction data into your training set all reduce it. And you only know how much you lost if you measure it. Which is why the eval has two halves. We'll get there.

<!-- section: The Idea: Data, chat templates and loss masking -->

A: Okay, data. The model learns from tokens, so the most common fine-tuning bugs are about tokens, not math. Two rules.

A: Rule one: use the model's own chat template. An instruct model was trained to see conversations laid out in one exact way, with special marker tokens around each turn. For Llama three, a user turn is a start-header marker, the word "user", an end-header marker, a blank line, the text, and then an end-of-turn marker. Other model families use different markers. Now, if you train on raw text, like "Query, colon, blah, Answer, colon, blah", and then serve through the chat endpoint, which applies the template, the model sees a format at inference that it never saw in training. So you always build training examples with the tokenizer's apply chat template function, and you serve the same way.

A: Rule two: mask the prompt out of the loss.

B: Why, though? More tokens in the loss is more signal. It's learning from the prompt too.

A: [jumping in] It's learning the wrong thing from it. Think about the sizes. In one training example the prompt, system message, query, a long chunk of page, might be five hundred tokens. The answer's fifteen. If you train on every token, ninety-seven percent of the gradient goes into teaching the model to predict your prompts. Which it'll never have to generate. You want loss only on the answer.

A: And in Hugging Face models, you do that with the labels. You copy the input token IDs into the labels, then set every prompt position to minus one hundred. The cross-entropy loss ignores any position labelled minus one hundred. In PyTorch that's the ignore index. One thing to keep, though: the end-of-turn token after the answer stays in the loss. Otherwise the model never learns to stop.

A: Picture one example as two rows. On top, the input tokens, left to right: a begin token, the user header, the query and page, end of turn, the assistant header, then the answer, "label two", and a final end of turn. Every one of those goes into the model as input. Underneath, the labels. Under the whole prompt, a long dashed stretch of minus one hundred, ignored. Under just the answer and that last end-of-turn, the real token IDs. Five hundred masked, fifteen trained.

A: And one subtle trap when you build that mask. Tokenize the prompt alone and the full conversation separately, and check that the full one actually starts with the prompt's tokens. Tokenizers can merge characters across the boundary, so "the prompt is this many tokens" isn't always where you think it is. The code you'll write asserts exactly that. Libraries do the masking for you, by the way. Hugging Face's T R L library, its S F T trainer, has options for training only on the completion or the assistant turns, though the names have changed across versions. Do it by hand once anyway. Then you can check the library's doing it.

<!-- section: The Idea: Hyperparameters, and how overfitting shows up -->

A: The knobs, with starting points that lots of people use. Not laws. Learning rate: one to two times ten to the minus four for LoRA, which people write as one e minus four, two e minus four. For full fine-tuning it's about ten times smaller, one to two e minus five. The adapters start at zero and they're tiny, so they need bigger steps. "LoRA Without Regret" found the best LoRA rate was about ten times the best full fine-tuning rate. Rank: sixteen, and try eight and sixty-four. Narrow tasks saturate early. Choose by watching the eval, not the training loss. Alpha: twice r, or equal to r, and then leave it. Targets: all the linear layers. Epochs: one to three passes over a few thousand examples, because small datasets overfit fast. And a schedule: a short warmup, then a cosine or linear decay. Stable at the start, small steps at the end.

A: And overfitting, which is when a model fits its training examples better and better while getting worse on new ones. It's memorising instead of learning the pattern. In fine-tuning it shows up four ways. One, the classic: training loss keeps dropping while held-out loss turns back up. So you evaluate on a held-out set every few dozen steps and keep the checkpoint where held-out loss, or better, your actual task metric, was best. Two, training loss near zero. On a few thousand examples, a loss of point oh one means the model has memorised them. Almost never what you want. Three, outputs that copy training examples. Reasons that repeat word for word from your training data, or the same phrase on every input. And four, everything becomes your task. You ask it what the capital of France is, and it gives you a JSON object with label zero.

B: [laughs] Relevance: zero.

A: [dry] Which is forgetting showing up as overfitting to the format.

<!-- section: The Idea: Evaluating a fine-tune -->

B: But honestly, if the loss goes down and stays down on the validation set, isn't that most of the evaluation?

A: [firmly] "The loss went down" is not an evaluation. A proper one has two halves. Half one: did it learn the task? You need a held-out set. Examples kept completely out of training, and out of any decision you tune on. If you tune on it, it stops being held out. And you score it with the metric you actually care about. For relevance grades, label accuracy and macro-F one. F one is the balance between precision and recall, and macro means you compute it per class and then average, so the rare classes count as much as the common ones. Plain accuracy can hide a model that just always predicts the most common label. For extraction, exact match and per-field accuracy. And for anything, the fraction of outputs that parse at all.

A: Then compare against the base model with your best prompt. Because if prompting already gets ninety-five percent, a fine-tune that gets ninety-six may not be worth owning. And split carefully. For ranking data, split by query, not by row. If the same query shows up in train and test with different documents, the model can learn the query, and your test score lies.

A: Half two: did it break anything else? A general-capability check, run identically on the base and on the fine-tune. A small slice of standard benchmarks, there's a tool from EleutherAI called the L M evaluation harness that runs MMLU, ARC, HellaSwag and friends. Plus a fixed set of thirty to fifty everyday prompts whose answers you read side by side. And here you're looking for drops, not gains.

A: And then check it all on the model you'll actually serve. The merged one, through your server, with the same chat template and decoding settings.

<!-- section: Build It: on the Mac -->

A: So, building it. Two halves. On your Mac, you build LoRA yourself, small enough that you understand every number. On the Spark, you use the real library on a real model, for a task from your work, then merge it, serve it, and measure it.

A: Setup on the Mac is one sentence: a virtual environment with PyTorch and Transformers, and a tiny model, Small L M two, the hundred thirty-five million parameter instruct version. It's actually about a hundred thirty-four and a half million. It's a small Llama-style model. Thirty layers, a hidden size of five hundred seventy-six, an MLP size of fifteen hundred thirty-six. Nine query heads but only three key-value heads, so the key and value projections output a hundred ninety-two numbers, not five hundred seventy-six. Worth knowing when you count by hand. And its projections are plain N N dot Linear, which is what your wrapper expects. GPT-two in Hugging Face uses a different class for its projections, called Conv one D, which is why it's not the pick here.

A: Then the real thing: you write the LoRA layer from scratch. It wraps an existing linear layer. It keeps the original and freezes it. It makes A, r by the input size, with that Kaiming-uniform random init. It makes B, the output size by r, all zeros. It stores the scale, alpha over r. The forward pass is the base layer's output, plus the scale times the side path, with the optional dropout on the input. And a merged function that hands back a plain linear layer whose weight is W plus the scale times B times A.

A: The part that matters is the order of the multiplications. You could compute B times A first, and then multiply x by that. But B times A is a full d by d matrix, and you'd be building it on every forward pass, which throws away the whole point. Instead you do x times A first. That gives you an r-wide intermediate, sixteen numbers per token, tiny. Then times B. You never build the big matrix.

B: And then you have to actually swap it into the model.

A: That's the inject function. You walk the model's modules, find every linear layer whose name is one of your targets, and replace it with your wrapped version. Two hints that'll save you. Collect the list of things to replace first, then replace, so you're not changing the model while you're walking it. And freeze everything in the model first, then inject. Because new parameters default to trainable, so your fresh A and B come in trainable and everything else stays frozen. Inject returns the count you expect from the formula, r times input plus output, summed. And a merge-all function replaces every wrapped layer with its merged plain one.

A: Then you prove it works, with four checks, as asserts, before training anything. Inject with just query and value at rank eight, then again with all seven projections. Check one, the count. Trainable parameters, counted from the model, equal your formula. And work it out by hand first from the config: r times input plus output, per matrix, times thirty layers. Check two: only A and B get gradients. Run one forward and backward pass. Every A and B has a gradient, every other parameter has none at all. And print the total size of A's gradient and B's gradient for one layer. One of them is exactly zero.

B: A's. Because B is still zero.

A: [pleased] A's, and that's the thing you should be able to explain cold. Check three: identity at init. The logits, the raw scores the model gives every token in its vocabulary before they get turned into probabilities, from your injected model, equal the logits from an untouched copy of the base. To a tight tolerance. Because B is zero. Check four, after a few training steps: merge, and compare logits before and after merging. They should match to within float rounding, around one in a hundred thousand in thirty-two bit.

A: Then the toy task. Something you can grade exactly, where the base model knows the content but not your exact output format. You generate sentences from a few templates. Names like Ana, Chen, Femi. Cities like Lisbon, Osaka, Accra. An age between eighteen and ninety. "At forty-two, Chen moved to Osaka." And the prompt says, extract name, age and city as JSON. The answer's a one-line JSON object.

A: The parts you write are the ones that teach. An encode function: build the prompt with the chat template, with the "assistant's turn starts here" marker added, build the full conversation with the answer and end token, assert the full one starts with the prompt's tokens, and set every prompt label to minus one hundred. A collate function that pads every sequence in a batch to the same length on the right. Inputs padded with the pad token, labels padded with minus one hundred, plus an attention mask so the model ignores the padding. And an exact-match function: generate greedily, up to forty new tokens, and count how many outputs equal the answer string exactly.

A: Train it with plain PyTorch. Adam W over only the trainable parameters, learning rate two e minus four, batch of sixteen, two hundred fifty steps, all seven projections at rank eight, on the Mac's GPU through M P S. Report exact match on fifty held-out examples before and after, and the time per step. Then try just query and value, and compare. We'll get to what you should see.

<!-- section: Build It: on the Spark -->

A: On the Spark, setup is: use the same NVIDIA PyTorch container as in the baseline lesson, so you keep NVIDIA's own build of PyTorch, and pip install PEFT and its friends inside it. Plus bitsandbytes, the library that does the four-bit part for QLoRA. And the real test is a short one-liner: make one tiny four-bit linear layer on the GPU and push a random input through it. bitsandbytes needs a build that supports both the ARM CPU and the G B ten GPU. If that line fails, check NVIDIA's DGX Spark playbooks and the bitsandbytes install docs for a supported build. Don't let pip quietly replace the container's PyTorch. And if QLoRA just won't run, do everything else with B F sixteen LoRA. On a hundred twenty-eight gigs, you can.

A: Then the real task. The suggested one is exactly the opening scene: query-document relevance with a reason. Input's a query and a passage, with long pages cut to about four hundred tokens. Output's the JSON, a label from zero to three and a one-sentence reason. Data from your own labelled pairs from the cross-encoder project, or a public set like MS MARCO passages with their relevance judgements, or one of the TREC Deep Learning track sets, which have graded labels. The other good choice is structured extraction from scraped pages into a fixed schema.

A: You write a script that builds a training file of two to ten thousand rows, a validation file of about three hundred, and a test file of about five hundred, each row a chat conversation. Split by query. Balance the labels, or at least report how they're distributed. And if your data has labels but no reasons, train on just the label. Don't invent reasons with a bigger model, unless you're doing that on purpose. That's distillation, a different lesson.

A: And the eval script. Give it a model directory, or a base plus an adapter, and it reports on the test set: parse rate, label accuracy, macro-F one, and a confusion matrix, the grid of true label against predicted label. Plus the general check. Twenty to fifty fixed everyday prompts, outputs saved to a file you actually read side by side. And optionally a small evaluation harness run, like ARC-Easy and a slice of MMLU, identical for base and fine-tune. Run it on the base instruct model with your best prompt first. That's the number to beat.

A: Then fine-tuning with PEFT. One script, three modes. The LoRA config is rank sixteen, alpha thirty-two, dropout five percent, all linear layers. For QLoRA you load the model with a four-bit config: N F four, double quantization on, compute in B F sixteen. And there's a prepare-for-four-bit-training helper, which also turns on gradient checkpointing. Then wrap the model, and print the trainable parameter count. Check it against your formula. Evaluate on the validation set every fifty steps or so and keep the best checkpoint. For QLoRA you can use the paged eight-bit Adam if you like. As always with these libraries, argument names drift, so check the docs.

A: Three runs. LoRA in B F sixteen on Llama three point one eight B Instruct, or another seven-to-eight B instruct model, rank sixteen, all linear, learning rate two e minus four, one or two epochs. QLoRA, same model, same settings. And on a one billion model, Llama three point two one B Instruct, or Qwen two point five one point five B Instruct: both LoRA and full fine-tuning, on the same data. Full fine-tuning with a learning rate around one e minus five and plain Adam W. That's the comparison the eight B can't fit.

B: And I'm timing all of these?

A: [firmly] And predicting first. Before each run, write down your predicted peak memory and step time. During each run, record the peak memory PyTorch actually allocated, and the median step time over twenty steps after warmup. And have an agent review the script for unfairness between runs: different sequence lengths or batch sizes, timing the first steps, or eval sneaking into the step time.

A: Last piece, merge and serve. The merge script loads the base in B F sixteen, even for the QLoRA adapter, for the reason we said, loads the adapter on top, calls merge and unload, and saves the result with the tokenizer. Check the merged directory's size against your prediction. Then serve it with your own naive server from the baseline lesson. It reads the model ID from an environment variable, so you just point it at the merged directory. Run the eval through the server, the OpenAI-shaped endpoint, so the chat template and decoding are exactly what production would use. And run your benchmark script to check time to first token, how long before the first word comes back, and tokens per second. They should match the unmerged base model. Same shapes, same math. And a stretch goal: serve the unmerged adapter with V L L M's LoRA support next to the base, send requests for both, and compare decode speed against the merged model.

A: You're done when your LoRA layer passes those four checks and you can explain why A's gradient is exactly zero at step zero. When the toy goes from near zero exact match to near perfect on held-out examples. When you've got task and general-check numbers on the Spark for all five: base plus prompt, LoRA eight B, QLoRA eight B, LoRA one B, full fine-tuning one B. When a merged model is served by your server and passes the same eval over H T T P. And when every measured number has your prediction next to it, and you can explain each gap.

<!-- section: Measure -->

A: Predictions first, so here's how you make them. Memory: sixteen bytes per trained parameter, two per frozen B F sixteen parameter, about half a byte per frozen four-bit one, and then activations, which you either estimate or measure with a tiny batch. Step time: about six floating-point operations per parameter per token for full fine-tuning, about four for LoRA. Say a step has four thousand tokens in it, eight sequences of five hundred. Full fine-tuning the one point two four billion model is six times one point two four billion times four thousand, about thirty trillion operations per step. Then you divide by the throughput you actually measured on the Spark, for B F sixteen matrix multiplies. So time one big B F sixteen matrix multiply first, and use that.

A: For reference, here's the toy on an M-series MacBook. Small L M two in thirty-two bit, on M P S, rank eight, batch sixteen, two hundred fifty steps, alpha twice r. The machine was busy with other work, so the times are rough. All seven projections: two million, four hundred forty-two thousand, two hundred forty trainable parameters. One point seven eight percent of the model. Exact match went from zero out of twenty before, to fifty out of fifty after, on held-out examples. Training loss from point two four down to point oh oh oh one. About one second per step. Just query and value: four hundred sixty thousand eight hundred parameters, point three four percent. Also zero to fifty out of fifty. Loss from point two four to point oh oh oh nine. About three quarters of a second per step. And both counts matched the formula exactly.

B: So the base model went from zero, totally clueless, to perfect. That's a lot of learning for a third of a percent of the weights.

A: [gently] That's the instructive bit, actually, because it wasn't clueless. In the outputs, the base model got the name, the age and the city right. It just pretty-printed the JSON across several lines. So exact match failed. And its starting loss, point two four, says the same thing. That's already low. It basically knew the answer. What LoRA taught it was the format. That's the "few directions" case, which is why even a third of a percent of the parameters was plenty. And notice the query-and-value run wasn't five times faster for five times fewer trainable parameters. Three quarters of a second against one. Because the frozen layers' forward and backward passes dominate the step.

A: So, what the Spark numbers should tell you. Trainable parameters match your formula exactly. If PEFT's printout disagrees with your hand count, you targeted something you didn't mean to, or missed something. That's the cheapest bug check in the whole thing.

A: Memory: LoRA's peak is mostly the frozen base plus activations. For the eight B in B F sixteen, expect about sixteen gigabytes of weights, plus activations that depend heavily on batch size times sequence length, and on whether gradient checkpointing is on. That's where you save only some activations in the forward pass and recompute the rest during backward. It costs roughly one extra forward pass of compute, for much less activation memory. The adapter's own weights, gradients and Adam states, all together, are under a gigabyte. QLoRA should cut the weights part to roughly a third. Full fine-tuning on the one B lands near twenty gigabytes plus activations. And if your measured number is way above your prediction, the gap is almost always activations. Halve the sequence length and watch it move.

A: Step time: LoRA is not two hundred times faster. Expect roughly two thirds of a full fine-tuning step at the same model size, and QLoRA slower than B F sixteen LoRA, because it's unpacking every weight twice per step. If QLoRA's much slower than that, check the compute type is B F sixteen and not thirty-two bit.

A: Task metric: for a narrow format-and-label task, LoRA and full fine-tuning on the one B should land close to each other, and both should fix the format failures almost completely. Label accuracy improves less dramatically than parse rate, though. The format is "few directions". The judgement is harder. General check: if anything drops, it should drop more for full fine-tuning than for LoRA, and more with more epochs. Look at your everyday prompts. Does the fine-tune answer them as relevance judgements? And merged versus base through the server: identical speed. If time to first token or tokens per second differs measurably, something isn't merged, you're still running the PEFT wrapper, or you saved in a different number format.

<!-- section: Break It -->

A: Then you break it on purpose. First one: what if you initialise both A and B to zero?

B: We said. Nothing trains.

A: [laughs] Nothing. You train the toy and the loss never moves, not even a little. Print the gradients and both are exactly zero, every step, because each one gets multiplied by the other. Then do the opposite, make B random too. Now it trains. But check three fails: at step zero the model's no longer the base model. It's the base model plus a random kick in every layer, and early training spends its effort undoing the damage. Zero B is just the cheap way to start exactly where you want.

A: Two: wrong learning rate, both directions. Train the toy LoRA at two e minus five, a typical full fine-tuning rate. After two hundred fifty steps it's barely learned the format. Then full fine-tune Small L M two at two e minus four, a typical LoRA rate. The loss spikes, or goes to not-a-number, or it learns the task and forgets how to say anything else.

B: [slowly] Same number, totally different outcome.

A: Because the same number means different things depending on how many parameters it moves, and where they start. Three: forget the loss mask. Set the labels to the input IDs for the whole sequence. Now the loss you print is mostly about predicting your prompt template, which is easy, so it falls fast and looks great. And the task metric improves much more slowly per step. Then the reverse bug: mask the end-of-turn token too. The model gets the JSON right... and keeps going. Starts a second turn, or rambles on until it hits the max new tokens limit.

A: Four: train in one format, serve in another. Train the toy on raw text, the instruction and sentence, a newline, the answer, no chat template. Then evaluate through the chat template, which is what your server does. Exact match drops sharply. Nothing's wrong with the weights. The input at serving time just isn't the input the adapter learned to respond to.

A: Five: merge into the four-bit weights. Take your QLoRA adapter, merge it into the four-bit model and re-quantize. Or simulate it, merge in B F sixteen and then round-trip the merged weights through N F four. Run the task eval, and compare with merging into a B F sixteen base. The update is small next to the step size of the four-bit grid, so a lot of it rounds away, and the metric falls back toward the base model.

<!-- section: Explain It Back -->

B: [thinking out loud] So how does all this scale? Like, if I go from eight B to seventy B, does LoRA get better or worse?

A: [thinking out loud] Depends which number you mean. Parameter savings get better. The adapter's fraction of each matrix is two r over d. So at a fixed rank, a wider model means a smaller fraction. And bigger pretrained models have smaller intrinsic dimension, so a fixed small rank goes further on them. Memory, though, still scales with the frozen base. Two bytes a parameter, or about half a byte in four bits, plus activations. So it's the base, not the adapter, that decides whether you fit. For a seventy B, QLoRA is what makes one machine enough. Compute per step barely shrinks: still about four operations per parameter per token against six. Quality scales with task breadth, the other way. Narrow format or task, small ranks match full fine-tuning. As the task carries more new information, continued pretraining on a domain, big datasets, full fine-tuning's update goes high-rank and LoRA falls behind. And in serving, unmerged adapters scale to thousands per base model, S-LoRA showed that, because each one is tens of megabytes.

B: Okay, so then practical version. My relevance fine-tune scores ninety-four percent on my test set. I'd probably just ship it.

A: [amused] Not yet. First, is the test set really held out? Split by query, no near-duplicate pages across the splits, and you didn't tune any hyperparameters on it. Second, does ninety-four beat the base model with your best prompt by enough to matter, and is the gain more than just parse rate? Third, per-class numbers and the confusion matrix, because accuracy can hide a model that always predicts the most common label. Fourth, the general check against the base model, to see what it forgot. And all of that on the merged model, served through your real server, with the production chat template and decoding settings. Because merging, especially from QLoRA, and template mismatches can each change the numbers.

<!-- section: Connections and close -->

A: If you read one paper, read the original LoRA paper, the section on the method and the one where they measure the rank of the learned updates. Then "LoRA Learns Less and Forgets Less" for the honest comparison, and the QLoRA paper if the four-bit part is what you need. The evaluation side deserves its own lessons too: whether ninety-four against ninety-two on five hundred examples is even a real difference is a statistics question. And one connection worth knowing: if you serve multiple adapters, prefix caching has to include the adapter's ID in its cache key. And LoRA comes back when you get to D P O and G R P O, preference and reinforcement fine-tuning on one machine, where "forgets less" turns out to be a feature.

B: [working it out] Okay, let me try the whole thing. Full fine-tuning an eight B doesn't fit because training costs sixteen bytes a parameter, not two. LoRA freezes the whole model and trains a tiny low-rank side matrix in each layer, which works because the change a narrow task needs only has a few directions. So it's way cheaper to train, and then you merge it and it's free at inference.

A: [warmly] Almost all of that. One correction: "way cheaper to train" is true for memory and storage, not for compute. Each step still pushes everything forward and back through every frozen layer, so it's about two thirds the work of a full step, not half a percent. What LoRA really buys you is that the sixteen-byte bill only lands on forty-two million parameters instead of eight billion, that the result is an eighty-four megabyte file instead of a sixteen gigabyte model, and that you start from exactly the base model and only move as far as the data pushes. Which is also why it learns less and forgets less.
