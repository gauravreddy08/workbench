<!-- section: The Problem -->

A: [relaxed, thinking out loud] So remember how we sized a model for serving. You take the parameter count, times the bytes per parameter, and that's the weights. Then a K V cache for each user, and some overhead. And a one billion parameter model in B F sixteen, two bytes a number, is about two and a half gigabytes of weights. Llama three point two, the one B model, serves happily on a laptop.

B: Yeah. That one I can do now.

A: Okay. So now you want to fine-tune it. Same model. Same one point two four billion numbers. You write the obvious training loop. Batch of eight, sequence length two thousand forty-eight, the Adam W optimizer, and you run it on a twenty-four gigabyte card. And it dies. First step. Out of memory. And the error says something like, tried to allocate three point nine one gibibytes, the GPU has a total capacity of twenty-three and a half, and one point one of it is free.

B: Wait, twenty-three and a half is in use? For a two and a half gig model?

A: That's the question. Nothing about the model changed. It's still two and a half gigs of weights. So where did the other twenty-plus gigabytes come from? And then it gets stranger. You drop the batch to one, and it runs. Step one goes through fine. And then it dies on step two.

B: [skeptical] That sounds like a leak. Something's not getting freed between steps.

A: It's a really natural guess, and it's not a leak. Step two genuinely needs something step one didn't have yet. Hold on to that, because it's going to fall right out of the arithmetic in a bit. And this isn't just a toy problem. Your cross-encoder at work, the ranker. Whenever somebody says, "just train a bigger one", the question that decides whether that happens on the Spark or on rented H one hundreds is exactly this one. How much memory does training take?

<!-- section: The Problem: Predict -->

A: So let's guess first. Llama three point two, one B. One point two four billion parameters. Standard mixed-precision training, Adam W. Forget the activations for now, the stuff that depends on your batch. How many gigabytes do you need just for the model and its optimizer? And compare it to the two and a half it takes to serve.

B: [working it out] Okay. Weights are two and a half. And training needs gradients, which are... one per weight, so another two and a half? So five gigs. Maybe six with something extra.

A: About twenty.

B: Twenty?

A: About twenty gigabytes, which is eighteen point four of the binary kind. Eight times what serving needs. And the rule of thumb is sixteen bytes per parameter. Two bytes for the B F sixteen weights you actually compute with. Two for their gradients, so you got that part. Then four for a full-precision copy of the weights, in F P thirty-two. And then eight for the optimizer, which keeps two running averages for every single weight, four bytes each. Add those up, two plus two plus four plus eight, sixteen. One point two four billion times sixteen is nineteen point eight gigabytes. And serving only needs the first two of those sixteen bytes.

B: And that's before activations.

A: Before activations. Which can easily add as much again.

B: [sighs] Okay. So the gradient was the part I knew about, and it's the small part.

A: It's one of the smallest parts. And quick reminder on the two kinds of gigabyte, because it'll keep coming up. A gigabyte is a billion bytes. A gibibyte is two to the thirtieth, about seven percent more. Memory's sized in powers of two, and PyTorch reports the binary kind. So when I say nineteen point eight gigabytes and eighteen point four gibibytes, they're the same pile of bytes.

<!-- section: Origin -->

A: And the person who first wrote this down properly... it's a nice story. Twenty nineteen. OpenAI's GPT two had just made one and a half billion parameters feel enormous, and everyone wanted to go bigger. And a team at Microsoft, Samyam Rajbhandari, Jeff Rasley, Olatunji Ruwase and Yuxiong He, sat down and just counted where the memory of training actually goes. Their paper's called "ZeRO: Memory Optimizations Toward Training Trillion Parameter Models". And it opens with an observation that sounds like a typo. GPT two's one and a half billion parameter model needs three gigabytes for its weights in sixteen-bit. And yet you cannot train it on a single thirty-two gigabyte GPU. Not with plain PyTorch, not with TensorFlow.

B: [amused] A three gig model that doesn't fit in thirty-two.

A: Right. And the culprit was the bookkeeping. Every parameter drags along a gradient, a full-precision copy of itself, and two optimizer numbers. Sixteen bytes in all. So twenty-four gigabytes of what they called model states, for a three gigabyte model, before a single activation. And their fix was, okay, stop storing all of that on every GPU. Split it across them. That idea is ZeRO. It lives inside DeepSpeed now, and inside PyTorch itself under the name F S D P. And it all started with somebody writing down the bytes. Which is basically what we're going to do.

<!-- section: The Idea: Four buckets -->

A: So, quick picture of what training even does, compared to serving. Serving is one thing: the forward pass. Data goes in, flows through every layer, an answer comes out. Training does that, and then it goes back through every step it just took, asking, "how should this step have been different?" That's the backward pass. And then it nudges every weight a little. That's the optimizer step. All the extra memory is the stuff you have to keep around so that "going back" and "nudging" are even possible.

B: Okay.

A: And it lands in four buckets. First, the weights. Same as serving, parameters times bytes per parameter. Though, sometimes stored twice, in two different precisions, and we'll get to why. Second, gradients. A gradient is one number per parameter, and it answers: if you nudged this weight up a tiny bit, how much would the loss change? The backward pass computes it, the optimizer uses it to decide which way to move the weight. It's exactly the same shape as the weights, so it costs another full copy. Third, optimizer states. What the optimizer remembers between steps. Plain gradient descent remembers nothing. Adam remembers two numbers per parameter. And this bucket's usually the biggest. And fourth, activations saved for backward. The intermediate values from the forward pass that the backward pass is going to need. When you serve, you throw those away the moment the next layer's used them. When you train, you keep every layer's worth until the backward pass reaches it. And this is the one that grows with batch size and sequence length.

B: So the first three only care about the model, and the last one cares about what I feed it.

A: That's the split. The first three together have a name, model states. They depend only on the model. The fourth depends on your batch.

B: Can you give me the actual sizes for that one B? Like, bucket by bucket?

A: Sure. Picture the two jobs side by side, as two horizontal bars drawn to the same scale, for that one B Llama. The serving bar is short. A blue chunk for the B F sixteen weights, two point three gibibytes, and a little sliver of runtime, and that's it, about four in total. The training bar, at batch four and two thousand tokens, runs almost all the way across. Same two point three of weights at the start. Then the F P thirty-two master copy, four point six. Gradients, two point three. Then the Adam chunk, nine point two, which is already the biggest thing so far. Then a big block of saved activations, eleven and a half. Then another big block just for the logits and the loss, almost ten. Then the runtime sliver. About forty-one gibibytes. And those are computed with the formulas we're about to build, not measured. You'll measure them.

B: [working it out] Hang on. Logits alone are almost as big as all the activations?

A: For that model, yeah. Weird, right? We'll get there. Let's start with the bucket that surprises people the most, though. The optimizer.

<!-- section: The Idea: The optimizer remembers two things -->

B: [a bit unsure] Wait, why does an optimizer need memory at all? I thought it just... subtracts the gradient.

A: [amused] It can. That's plain gradient descent. Take each weight, subtract the learning rate times its gradient. Simple. And in practice it has two problems. One, the gradient from a single batch is noisy, so the direction wobbles from step to step. And two, some parameters get huge gradients and others get tiny ones, so any single learning rate is too big for some of them and too small for others.

A: Adam, from Kingma and Ba, twenty fourteen, fixes both by remembering two numbers for every parameter. The first one, called m, or the first moment, is a running average of the gradient. Every step you keep ninety percent of the old average and mix in ten percent of the new gradient. So it smooths out the noise, a bit like momentum on a ball rolling downhill. It answers, "which way has this weight wanted to move lately?" The second one, v, the second moment, is a running average of the gradient squared. Keep ninety-nine point nine percent of the old, mix in a tenth of a percent of the new. It answers, "how big are this weight's gradients, typically?" And then the update divides the first by the square root of the second. So every weight gets a step size scaled to its own history. That's why Adam just works out of the box. And it's also why it costs two extra full copies of the model. Oh, and Adam W is just Adam with the weight decay applied separately. Same memory.

B: [a bit unsure] But those two copies, they'd be B F sixteen like everything else, right? So two bytes each, four total?

A: That's the natural assumption, and no. They're kept in F P thirty-two, four bytes each, almost everywhere. Because they're averages of lots of tiny numbers, and in sixteen-bit they lose accuracy fast. So Adam alone is eight bytes per parameter. Four times the B F sixteen weights it's updating.

B: Huh. So the optimizer is bigger than the model it's training.

A: Four times bigger. And here's the thing that solves your step two mystery. I checked this on a Mac with a small GPT two. Before the first call to optimizer dot step, the optimizer's state is empty. Nothing. After it, every parameter has two new tensors, PyTorch calls them exp avg and exp avg sq, that's m and v. Both F P thirty-two, both the parameter's shape, and together exactly twice the bytes of the F P thirty-two weights. And notice the "after". PyTorch creates Adam's states lazily, during the first step.

B: [jumping in] Oh. So step one fit because m and v didn't exist yet—

A: —during most of it, yeah. They only got created at the very end of step one, after the memory peak had already passed. Step two is the first step that starts with m and v already sitting in memory. So step two's peak is step one's peak plus eight bytes per parameter. Not a leak. Just Adam showing up.

<!-- section: The Idea: Why a second copy of the weights -->

B: Okay, so what's the four-byte copy of the weights for? You already have the weights.

A: Right. So modern training does the heavy math in B F sixteen. Brain floating point. Quick refresher, because this is the one you had backwards on the diagnostic. B F sixteen is a sixteen-bit format that keeps the same exponent as F P thirty-two, eight bits of it, so it has the same range, it can hold huge and tiny numbers. What it gives up is precision. Only seven stored bits for the actual digits. So, big range, coarse steps. F P sixteen is the other trade, more precision, much less range. And you train in B F sixteen because the tensor cores, the dedicated matrix-multiply units on NVIDIA GPUs, run sixteen-bit math several times faster than F P thirty-two, and because it halves your activation memory.

B: [skeptical] Seven bits still sounds like plenty for a weight, though.

A: [thinking out loud] It's plenty for the weight. It's not plenty for the change to the weight. The update. B F sixteen keeps about eight significant bits. So near one point oh, the neighbouring numbers it can represent are about eight thousandths apart. Now take a typical update. Learning rate times something gradient-sized, maybe one ten-thousandth, applied to a weight that's about five hundredths. That's a change of two tenths of a percent. And B F sixteen can only step in increments of something like four tenths to eight tenths of a percent of the value.

B: [working it out] So you add the two tenths of a percent and it rounds back to the same number.

A: [serious] Rounds straight back. The update just vanishes. Do that for every weight and training silently stops learning. No error, the loss just... doesn't move.

B: That's nasty.

A: And the fix is from a twenty seventeen paper called "Mixed Precision Training", Micikevicius and others, at NVIDIA and Baidu. Keep a master copy of the weights in F P thirty-two. The optimizer adds the tiny update to the F P thirty-two copy, where it survives. Then you refresh the B F sixteen copy from it for the next forward pass. So lots of small updates pile up in F P thirty-two until they're big enough to actually show up in B F sixteen. That's the four bytes.

<!-- section: The Idea: The sixteen bytes and its variants -->

A: So put the classic recipe together, the way the ZeRO paper counted it, and the way Megatron and DeepSpeed lay it out. Weights you compute with, B F sixteen, two. Gradients, B F sixteen, two. Master weights, F P thirty-two, four. Adam's m, four. Adam's v, four. Sixteen. So, the rule: full training with Adam costs about sixteen bytes per parameter, before activations. A one B model, about sixteen gigabytes. That Llama at one point two four billion, nineteen point eight. An eight B model, a hundred twenty-eight.

B: You keep saying "about".

A: [laughs] Because the split depends on your setup, and it's worth knowing which one you're running. Plain F P thirty-two training, no mixed precision at all. Weights four, gradients four, m four, v four. Also sixteen. You don't need a master copy, because the weights are already full precision.

B: Wait, so mixed precision doesn't save any memory?

A: Not on the model states. None. What it saves is activation memory, and time. Then there's PyTorch's automatic mixed precision, autocast, wrapped around a normal F P thirty-two model, which is how most of your scripts work. The parameters stay F P thirty-two, four bytes. So their gradients are F P thirty-two, four. Adam's eight. Sixteen again. But inside the autocast region, PyTorch casts the weights to B F sixteen on the fly for each matrix multiply, and by default it caches those casts until the region ends. So at the peak there's about two more bytes per parameter hanging around. Call it sixteen plus two.

A: Some frameworks also keep F P thirty-two gradients. Megatron, for instance, can add up gradients in a full-precision buffer, for accuracy across lots of small batches. That's two plus four plus four plus eight, eighteen. Then the other direction, pure B F sixteen. Everything in sixteen-bit, no master copy. Two, two, two, two. Eight. Half the memory. But it only works with tricks to rescue those vanishing updates. One is stochastic rounding, where instead of always rounding to the nearest number, you round up or down at random, with odds based on how close you are to each neighbour. So a tiny update survives on average instead of always getting rounded away. The other is a small Kahan summation buffer, which keeps the rounding error from each step and adds it back on the next one. Without those, expect worse results. And inference, for comparison, is just the two.

B: So almost every recipe lands on sixteen anyway.

A: Pretty much. If you drew all the recipes as rows of little cells, one cell per byte, they'd mostly crowd up around sixteen. Plain F P thirty-two, sixteen. B F sixteen with a master copy, sixteen. Autocast, sixteen with two extra. And the only ways down are to shrink or drop the optimizer states, or give up the master copy. An eight-bit Adam gets you to ten. Pure B F sixteen, eight. A different optimizer called Adafactor with pure B F sixteen, about four. Inference, two. Multiply any row by your parameter count and you've got gigabytes.

<!-- section: The Idea: Predict, eight B on the Spark -->

A: So try this. Sixteen bytes per parameter. Can you fully fine-tune Llama three point one eight B, eight point oh three billion parameters, on the Spark's hundred twenty-eight gigs?

B: [working it out] Eight billion times sixteen... a hundred twenty-eight gigabytes. And the Spark is a hundred twenty-eight. So... technically yes? Just barely?

A: No. It's a hundred twenty-eight point five gigabytes, which is a hundred nineteen point seven gibibytes. And that's already essentially the whole Spark, before the operating system takes its share and before a single activation. So full fine-tuning an eight B model with standard Adam W needs either a smaller optimizer, more than one machine, or a different kind of fine-tuning, LoRA. And we'll work out how far each of those gets you.

<!-- section: The Idea: Why backward needs the forward's leftovers -->

A: Okay. Now the fourth bucket. You built GPT two from scratch, so you've called loss dot backward a hundred times. Here's what it actually needs. The chain rule, in plain words: the network is a long pipeline of small steps. To find out how the loss depends on something early in the pipeline, you walk backwards from the loss. And at each step you ask, "if my input moved a bit, how much would my output move?" Multiply all those answers together and you've got it. The backward pass is just that walk. Each layer gets handed the gradient of its output, and it works out the gradient of its input and of its own weights.

B: [laughs] A hundred times, sure. Never really thought about what it keeps around.

A: And that's the catch. Each step's "how much would my output move" depends on what its input was. Three examples you've written yourself. A linear layer, the output is the input times a weight matrix. The gradient for the weights needs the input this layer saw during the forward pass. The gradient for the input needs the weight matrix, which you have anyway. So the layer has to keep its input. Then GELU, or ReLU, or SiLU. Its slope depends on where on the curve you were. So you need its input. And softmax in attention. Its gradient is written in terms of its own output. So you need the attention probabilities. Unless the kernel's clever, which, we'll get to.

B: So every operation hangs on to whatever its own derivative will need.

A: Yep. During forward, every operation stashes it. In Karpathy's micrograd, that's the values captured inside each little backward function. In PyTorch it's save for backward, inside every autograd function, and the stash is what autograd calls saved tensors. Those are the "activations" when people talk about training memory. And under no grad, nothing gets stashed. That's literally why inference gets to throw activations away.

A: Picture a tiny network on a whiteboard. Left to right: the input, call it x zero, goes into linear layer one, out comes x one. That goes into GELU, out comes x two. That goes into linear layer two, out comes y, and then the loss. Under each arrow, a little box: "saved for backward". x zero in the first, x one in the second, x two in the third. Then a second arrow running right to left underneath. Backward. It starts at the loss. To get the gradient for linear two's weights, it reaches up and reads x two. To push the gradient through GELU, it reads x one. To get linear one's weights, it reads x zero. And the thing to notice: x zero was written first and it's read last. It has to live through all of forward and all of backward.

B: So right at the loss, every one of those boxes is full at the same time.

A: [emphatic] Every layer's stash is alive at once. That moment is the activation peak. And it's why activation memory grows with depth. More layers, more boxes, all full at the turn.

<!-- section: The Idea: How big the stash is -->

B: [working it out] How big are those boxes, though? One layer's input sounds small.

A: Per token it is. It's the number of tokens that adds up. Let's count for one transformer layer. And the unit that makes this easy is one hidden-sized vector for every token in the batch. If the batch has b sequences of s tokens, and the hidden size is h, that's b times s times h numbers. People call it one "s b h". It's the basic unit of everything flowing through the model.

A: Korthikanti and colleagues at NVIDIA counted this for a GPT-style block, two bytes per value. In attention, you keep the input to the query, key and value projection, the queries and keys for the score computation, the values, the input to the output projection, and a dropout mask. About eleven of those units, in bytes. In the MLP, its input, the four-times-wider values before and after the GELU, and another mask. About nineteen. The two layer norms each keep their input, four. So thirty-four. Thirty-four times b times s times h bytes, per layer.

B: That's not so bad. It's linear in everything.

A: That part's linear. But in textbook attention there's one more thing. Every head computes a grid of scores, every token against every other token. s by s. For every head, for every sequence. And you keep the softmax output, its dropout mask and the dropped-out probabilities. That's five times the number of heads times s squared times b, in bytes. And that's the term that blows up. So, worked example. Sequence two thousand forty-eight, thirty-two heads, hidden size two thousand forty-eight. You compare it to the linear part: you get five times thirty-two times two thousand forty-eight over two thousand forty-eight. A hundred sixty. Against thirty-four.

B: [surprised] So the score grids are almost five times everything else put together.

A: Almost five times. At two thousand tokens. And it grows with the square of the sequence. Which is where fused attention comes in. FlashAttention, and PyTorch's scaled dot product attention when it picks a fused backend, never store the s by s grid at all. They keep only the output and one small number per row, and during backward they recompute the scores, tile by tile. So the s squared term just disappears, and you're back to about thirty-four units per layer. That's the FlashAttention story seen from the training side. It actually saves more in training than in inference, because training would otherwise have to keep those grids around until backward.

A: Two corrections to keep this honest. One, Llama-style blocks cost more per token. No dropout, but the MLP is wide, eight thousand one hundred ninety-two for the one B, four times its hidden size, and it has three projections instead of two. And RoPE and RMS norm save their own pieces. Counting the same way, you land somewhere around forty to fifty units per layer. I use forty-six for the one B and forty-two for the eight B. Those are estimates.

A: And two, the logits are their own monster. At the very end, the output head turns every token into one score per word in the vocabulary. So that's batch times sequence times vocabulary size numbers. GPT two's vocabulary is fifty thousand two hundred fifty-seven. Llama three's is a hundred twenty-eight thousand two hundred fifty-six. And you store those in B F sixteen, then an F P thirty-two copy for the loss, then the softmax's saved output, then its gradient. Call it eight to twelve bytes per logit. So for the one B Llama at batch four, two thousand forty-eight tokens: four, times two thousand forty-eight, times a hundred twenty-eight thousand, times about ten bytes. About ten gigabytes.

B: Ten gigs for the last layer?

A: As big as all sixteen of the transformer layers put together. That's the ten on that training bar. And there are fused "chunked" cross-entropy kernels, Liger Kernel is one, that exist precisely so you never build that whole thing at once.

B: How close is this formula to real life, though?

A: Pretty close, as a floor. I counted every tensor autograd saved for Hugging Face's GPT two small, on a Mac's CPU. F P thirty-two, so double the bytes. Batch two, sequence one thousand twenty-four. Textbook attention with dropout on: six point three gigabytes saved for backward. Turn dropout off: three point seven. Switch to fused attention: two point seven. Fused plus checkpointing, which we'll get to: half a gigabyte. And the formula predicts about five and a half for that first case, counting three F P thirty-two copies of the logits. The measurement came in about fifteen percent higher. Probably mostly because Hugging Face's GPT two computes GELU as a chain of small separate operations, and each one saves its own four-times-wide intermediate. So, treat the formula as a floor. And measure your own model.

<!-- section: The Idea: Watch one step -->

A: Now put all four buckets on a clock. Imagine a stacked chart, time running left to right through one training iteration, memory going up. At the bottom, a flat band, the weights. Above that, a flat band of Adam's states. You press play. Through the forward pass, a staircase climbs: one layer's stash after another piling on. At the loss there's a spike, that's the logits. Then backward starts, and the staircase comes down step by step, but as each layer's stash disappears, a thinner band of that layer's gradients appears. Then the optimizer step, and zero grad wipes the gradients. And there's a checkpointing toggle, and a "first step" toggle.

B: So the top of that chart is the loss spike?

A: Right around there. Three things to notice. First, the peak is at the turn. Between forward and backward, when everything saved is alive at once. Not during the optimizer step, not at the end. Second, gradients and activations trade places. Backward frees layer L's stash as it creates layer L's gradients. And activations are usually way bigger than gradients, so memory falls through backward. Third, switch the model to GPT two small, and the logits are the biggest single item in the whole picture. Its vocabulary, fifty thousand, is sixty-five times its hidden size of seven hundred sixty-eight. For big models it's the other way round. Which is why memory advice depends so much on model size.

B: And the first-step toggle?

A: Flip it on and the Adam band at the bottom is just gone for the whole step, until the optimizer step creates it at the very end. That's your step one versus step two, drawn.

<!-- section: The Idea: The tools -->

A: So. Every trick for fitting training into memory removes or shrinks one bucket. Let's go bucket by bucket. Activations first. Trick one, gradient accumulation. Batch thirty-two doesn't fit? Run batch eight, four times, and only step the optimizer after the fourth. Each of those slices is called a micro-batch. And their gradients just add up in the gradient buffers, because that's PyTorch's default. Backward adds into the gradient, it doesn't overwrite it. You divide the loss by four so the sum is an average.

B: [skeptical] But doesn't that change the training? Four small batches isn't the same as one big batch.

A: For the update, it is the same. Mathematically, the gradient of the average over thirty-two examples is the average of the four chunks' gradients. Up to small floating-point differences, and except for layers like batch norm that look across the whole batch. So the step is the same as one batch of thirty-two, and the activation memory is that of batch eight. The model states don't change at all. What you pay is time. Four small passes keep the GPU less busy than one big one, so throughput drops a bit. And a lot, if the micro-batch gets so small the GPU's sitting idle.

B: And if even batch one is too big?

A: Then trick two, activation checkpointing. Also called gradient checkpointing. Instead of storing every layer's whole stash, you store only each layer's input. In B F sixteen that's two of those units, tiny. Then during backward, right before you need a layer's stash, you re-run that one layer's forward from its saved input to rebuild it. So memory goes from L full stashes down to L small inputs, plus one full stash at a time.

B: And you pay by doing forward twice.

A: Every layer runs forward twice. So how much is that? A forward pass is roughly a third of a training step's math. Because backward is about twice the forward: a linear layer in forward does one matrix multiply, and in backward it does two, one for the input's gradient and one for the weight's gradient. So, forward one, backward two, step is three. One extra forward is one more on top of three, about thirty-three percent more compute. Measured slowdowns are usually twenty to thirty-five percent. In Hugging Face it's one call, gradient checkpointing enable. In plain PyTorch, you wrap the layer in torch's checkpoint function, with use reentrant set to false. And Chen and colleagues' paper from twenty sixteen showed you can be cleverer, checkpointing only every square root of L layers for square root of L memory. But per-layer is what everyone actually uses.

B: Okay, and Adam? That was the big one.

A: Adam's next. Eight-bit optimizers. Store m and v in eight bits instead of thirty-two. If you do that naively, one scale for the whole tensor, it wrecks them, because a single scale can't cover both the huge values and the tiny ones. So Tim Dettmers' bitsandbytes uses block-wise quantization. Chop the tensor into blocks of two thousand forty-eight values, and give each block its own scale. One outlier then only hurts its own block. And the eight-bit code isn't evenly spaced. It spends more of its two hundred fifty-six values near zero, where most of these numbers live. Each value gets turned back into F P thirty-two just for the update, then squeezed back down. So m and v go from eight bytes per parameter to two. The paper reports no loss in quality on the tasks it tested. And in code it's a one-line change, Adam W eight bit instead of Adam W.

A: Then Adafactor, Shazeer and Stern, twenty eighteen. It's a trick for v. Say a weight matrix has n rows and m columns. Instead of storing a second moment for every entry, you store one running average per row and one per column, and estimate any entry as its row times its column divided by the total. So a four thousand ninety-six by four thousand ninety-six matrix needs eight thousand one hundred ninety-two numbers instead of sixteen point eight million. And by default it drops m entirely. So the optimizer states become a rounding error. On a small GPT two, PyTorch's Adafactor states came out at two tenths of a percent of the weights. The trade is it's fussier to tune than Adam. It's mostly popular for T five style models.

A: Then precision itself. Mixed precision makes the activations two bytes instead of four, which often matters more than anything it does to the model states. And pure B F sixteen halves the model states too, at the price of that vanishing-update problem.

A: And the last one goes after everything at once. Sharding across GPUs. With N GPUs doing plain data parallelism, every GPU holds a full copy of the model, chews on a different slice of the batch, and they average their gradients before each optimizer step. So every GPU also holds all sixteen bytes per parameter.

B: [skeptical] So with eight GPUs you've got eight identical copies of Adam's state? Why would anyone do that?

A: [dryly] Convenience, honestly. That's the whole point ZeRO made. It removes the redundancy in three stages. Stage one splits the optimizer states, so each GPU only updates its own one-Nth slice of the parameters. Stage two also splits the gradients. Stage three splits the weights themselves. Each GPU fetches a layer's weights from the others just before it runs, and drops them right after. PyTorch's version of stage three is F S D P, fully sharded data parallel.

A: In bytes per parameter, per GPU. No sharding, sixteen, no matter how many GPUs you add. Stage one: the master copy and Adam together are twelve bytes, and those get divided by N, while the four bytes of weights and gradients stay whole. So on four GPUs that's four plus three, seven. Stage two divides the gradients too, so two bytes stay whole and fourteen get split: on four GPUs, two plus three and a half, five and a half. And stage three splits everything, sixteen over N, so four. And it keeps going down as you add GPUs, with no floor. The cost is moving weights between GPUs every forward and every backward. And none of this touches activations. For those you need checkpointing, or other ways of splitting the model itself, tensor, sequence or pipeline parallelism.

B: Do you have a real number for that?

A: The ZeRO paper's own example. A seven and a half billion parameter model on sixty-four GPUs. Plain data parallel, a hundred twenty gigabytes per GPU of model states. Stage one, thirty-one point four. Stage two, sixteen point six. Stage three, one point nine.

<!-- section: The Idea: CPU offload -->

A: One more tool, CPU offload. ZeRO Offload, and F S D P's CPU offload. You keep the optimizer states, and maybe the weights, in the CPU's RAM, and run the Adam update on the CPU. On a normal server that's a real win. An H one hundred has eighty gigabytes, and the box around it might have one to two terabytes of RAM.

B: Oh, so on the Spark I could push Adam's states over to the CPU side and free up GPU memory for—

A: [jumping in] That's the one that buys you nothing on the Spark. The Spark's CPU and GPU share the same hundred twenty-eight gigabytes. One pool. There is no separate GPU memory to free up. Moving a tensor "to the CPU" just moves it to a different label on the same chips.

B: [laughs] Right. Unified memory. I keep forgetting it's literally the same RAM.

A: Same RAM. The only offload that actually adds capacity on the Spark is to the SSD. DeepSpeed has that, ZeRO Infinity, offloading to N V M E. And an SSD is hundreds of times slower than memory. So you can, but you'll feel it.

<!-- section: The Idea: Put it together -->

A: Now picture a calculator with every lever on it. You pick the model, the optimizer, the precision, batch, sequence length, checkpointing on or off, fused attention on or off. And you get one bar, the peak of one training step, split into its buckets. Across it there are lines. One for an H one hundred, which is sold as eighty gigabytes and reports about seventy-nine point six gibibytes. One for the Spark's hundred twenty-eight. And a dashed one for what's left on the Spark after the operating system, assumed to be ten gibibytes until you measure it. It's approximate. Real runs come in higher, from unfused operations, fragmentation, library workspaces.

A: So a few things to try. Llama three point two one B, master copy recipe, Adam W, batch eight, two thousand tokens. Flip the optimizer between Adam W, eight-bit, and Adafactor. The model states go from eighteen point four, to eleven point five, to nine point two gibibytes. Then push the sequence to sixteen thousand, and turn off fused attention. The bar just explodes. That s squared term is why nobody trains long context without fused attention. Then GPT two, the small one, at batch sixty-four. The activations are more than fifty times the model states.

B: So for small models it's all about the batch.

A: For small models, the batch is the bill. And then Llama three point one eight B, any setup. The model states alone hit the Spark's limit, until you go to pure B F sixteen with eight-bit states, or Adafactor.

<!-- section: The Idea: What fits on the Spark -->

A: So let's do the arithmetic once, properly. Say a hundred eighteen gibibytes usable after the OS. Leave about ten for activations, small batches, checkpointing on. That leaves a hundred eight gibibytes, about a hundred sixteen gigabytes, for model states. Divide by bytes per parameter. Standard Adam W with a master copy, or autocast, sixteen bytes: about seven billion parameters, max. Eight-bit Adam W with a master copy, ten bytes: about eleven billion. Eight-bit with pure B F sixteen, six bytes: about nineteen billion. Adafactor with pure B F sixteen, about four bytes: about twenty-nine billion.

B: And those all run? Like, at a usable speed?

A: Those are upper bounds where "fits" means "runs at all". Speed's a separate question. Remember the bandwidth idea, that a lot of these jobs are limited by how fast you can move bytes, not by math. Every optimizer step has to read all sixteen bytes per parameter at least once, and write most of them back. And the Spark's memory moves about two hundred seventy-three gigabytes a second, that's a spec-sheet number. For a seven B model that's at least a hundred twelve gigabytes of traffic per optimizer step. So four tenths of a second or more, before any forward or backward math.

B: [sighs] So seven B. On a machine with a hundred twenty-eight gigs.

A: Unless you stop training most of the weights. That's LoRA, low-rank adaptation, Hu and others, twenty twenty-one. You freeze the model's weights, and next to some of the big weight matrices you train two skinny matrices whose product gets added to the frozen one. Only the skinny ones get gradients and optimizer states. So the frozen weights need no gradient, no master copy, no Adam. Just two bytes a parameter in B F sixteen. The adapters pay the full sixteen bytes, but they're tiny. Rank sixteen on every linear layer of the eight B Llama is about forty-two million parameters, half a percent of the model. Seven tenths of a gigabyte with Adam. So LoRA on eight B is about sixteen gigabytes of frozen weights, plus that seven tenths, plus activations.

B: [a bit unsure] Plus activations? I'd have thought the frozen layers don't need any. You're not computing their gradients.

A: Yeah, that's the trap. You're not computing their weight gradients. But the gradient still has to flow backward through every frozen layer, to reach the adapters in the earlier layers. And flowing backward through a layer needs its saved input. You skip the half of the linear layer's backward that computes the weight gradient, so a bit less gets saved. But most of the stash stays. So checkpointing helps LoRA exactly as much as it helps full training.

B: [quietly] Huh. Okay.

A: So on the Spark, LoRA in B F sixteen reaches roughly forty to fifty billion parameter models. Two bytes each into about a hundred gibibytes. And then QLoRA, Dettmers and others again, twenty twenty-three. Same idea, but the frozen base model is stored in four bits, and each layer gets unpacked to B F sixteen on the fly when it runs. The adapters train in B F sixteen. So the base is a little over half a byte per parameter once you count the scales. A seventy B model's frozen weights are roughly thirty-five to forty gigabytes, and they fit with loads of room for activations. So: full fine-tuning tops out around seven B. Adapter fine-tuning reaches seventy B. A ten-times difference out of the same hundred twenty-eight gigs. And that's the main reason LoRA is the default way to fine-tune on one machine.

<!-- section: Build It -->

A: Okay, so here's what you'd build. Everything runs on the Spark. The model is GPT two at four sizes, a hundred twenty-four million, three hundred fifty-five million, seven hundred seventy-four million, and the one and a half billion one, built from a config with random weights. Memory doesn't care whether the weights are trained, so there's nothing to download and no gated model to wait on. Setup is one sentence: NVIDIA's PyTorch container, which has a matching CUDA build for the Spark's ARM chip, plus transformers and bitsandbytes. If bitsandbytes has no build for that combo, you either build it from source or use torch A O's eight-bit Adam W instead. Then a little harness: build a model, make random token batches, and read the current and peak allocated memory in gibibytes. Two details that matter there. Dropout's off, like most fine-tuning, and that lets PyTorch use the fused attention kernel. And the model stays in training mode, so every step is a real training step.

A: The first real task is yours: predict before you measure. A function that takes the parameter count, hidden size, layers, vocabulary, batch and sequence, plus the recipe and optimizer and whether checkpointing's on, and returns gibibytes for each bucket. Weights, gradients, optimizer, the autocast cast cache, activations, logits. Do it all in bytes and convert at the end. For activations you use thirty-four units per layer, or with checkpointing, two units per layer plus one full layer. Logits, about ten bytes each. And you count GPT two's parameters straight off the model. The small one has a hundred twenty-four million four hundred thirty-nine thousand eight hundred eight. Its input and output embeddings are tied, the same matrix, so the vocabulary matrix is counted once. Then you write down your prediction for the seven seventy-four million model at batch eight, sequence one thousand twenty-four. Before running anything.

B: So I have to commit to a number before I see anything.

A: You commit first. Then the second task: measure one step, phase by phase. Five steps of Adam W with autocast, and inside each, you record memory at four moments. After forward, when the loss exists. After backward. After the optimizer step. After zero grad. Plus the peak and the time per step. And there are three things to look for, and to explain before you read on. Steps one and two have different peaks. The "after forward" number minus the "after zero grad" number is your activations. And "after backward" is lower than "after forward".

B: Because backward freed the stashes, and the gradients it made are smaller.

A: That's it. Two practical hints. Synchronize with the GPU before you read the clock, because CUDA calls return before the GPU's actually finished. And on the Spark, use a fresh process for every configuration, so the caching allocator starts empty.

A: [warmly] Third task is my favourite. Take a memory snapshot. You turn on PyTorch's memory history recording, run three steps, dump it to a file, copy it to your Mac and drop it on PyTorch's memory viz page. It runs entirely in your browser. And the active memory timeline view is that stacked chart from before, except drawn from real data, every allocation, with the Python stack that made it. And you go hunting. At the bottom, a flat band, the F P thirty-two weights. Partway through step one, a new band appears and never leaves. That's Adam being born. Then the staircase climbing through forward, and the peak at the loss. The single biggest block near the peak is the logits, and if you hover it, the stack trace goes straight into the loss function. And then a bunch of medium-sized blocks, one per weight matrix, created during forward. That's autocast's B F sixteen cast cache. And they outlive the autocast region, because autograd saved them for backward, and they get freed during backward.

B: [working it out] Because the linear layer needs its weight to compute the gradient of its input. So the B F sixteen version of the weight is part of the stash.

A: Yep, that's why. One caveat, the underscore in that recording function means it's semi-private, so check PyTorch's "Understanding CUDA Memory Usage" page if the names have moved.

A: Fourth task, count what autograd saves, directly. PyTorch has a hook called saved tensors hooks. You give it a pack function, and it gets called for every single tensor any operation saves for backward. So you sum up the bytes. The part that matters: key by the underlying storage, not by the tensor. Lots of saved tensors are views of one chunk of memory, and you want to count those bytes once. And skip the parameters' own storage, because a saved weight isn't an activation. Then run it with fused attention and with the eager, textbook attention, at sequence five hundred twelve, a thousand twenty-four, and two thousand forty-eight. One of them grows like the sequence. The other grows like the sequence squared. And you compare against thirty-four units times L, plus the logits.

A: Fifth task, pull one lever at a time. Start from the baseline, the seven seventy-four million model, autocast, Adam W, batch eight, a thousand twenty-four tokens. Change exactly one thing per run. Checkpointing on. Eight-bit Adam W. Gradient accumulation with micro-batch two, four times, so it's the same eight sequences per optimizer step, and you divide each loss by four. And then all three together. Record peak memory, seconds per step, and tokens per second, which is batch times sequence divided by seconds per optimizer step. And time a whole optimizer step, all four micro-batches, not one micro-batch, or the comparison's unfair.

A: And sixth, find the largest batch before out-of-memory, each way. Double the batch until it fails, then binary search between the last success and the first failure. And run every trial in a subprocess, and treat a non-zero exit as a failure. Two reasons. After an out-of-memory error the allocator's left in a messy state. And on the Spark, the kernel's out-of-memory killer, the part of Linux that shoots a process when memory runs out, may just end your process instead of raising a nice Python exception. So you watch free dash h in another terminal during the big runs. Then an agent reviews the search for unfairness: trials sharing a process, a batch that passes step one but would fail on step two, timing that includes building the model.

B: Step one again. Because Adam isn't there yet.

A: Because Adam isn't there yet. And you're done when your predictions are written down before the first run, you can point at the weights, Adam appearing, the staircase, the logits and the peak in your own snapshot, the table's filled in for all five setups, and you can explain every gap bigger than twenty percent between predicted and measured.

<!-- section: Measure -->

A: So what should the numbers look like? Use steps three to five, because step one under-counts Adam and the first couple of steps pay one-off setup costs. Baseline, the seven seventy-four million model. Model states, sixteen bytes times seven seventy-four million, eleven and a half gibibytes. Plus about one point four for the autocast cast cache. Activations, thirty-four times a thousand twenty-four tokens times batch eight times hidden size twelve hundred eighty times thirty-six layers. About twelve gibibytes. And logits, eight sequences times a thousand twenty-four tokens times fifty thousand words times ten bytes, about three point eight.

B: [working it out] Eleven and a half, one point four, twelve, three point eight... about twenty-nine.

A: About twenty-nine. And expect the measurement to come in higher, maybe twenty to forty percent, because of that unfused GELU. Task four shows you exactly how much. If your activations come in way above that, check whether fused attention really got used. If dropout's on, it might not have.

A: Step one versus step two. Step two's peak should be higher by about eight bytes times seven seventy-four million. Five point eight gibibytes. Adam's m and v, created in step one's optimizer step, after the peak had already passed.

A: Checkpointing. Activations drop from about twelve to about one gibibyte. That's thirty-six layer inputs plus one rebuilt layer. So the peak falls by about eleven, to roughly eighteen, and now it's dominated by model states and logits. Seconds per step should go up twenty to thirty-five percent. And if it went up much less, the step probably wasn't compute-bound to begin with.

B: And eight-bit? Doesn't squeezing and unsqueezing m and v every step cost you time?

A: [thinking out loud] Barely, at this size. m and v go from eight bytes to about two per parameter, so about four point three gibibytes saved, no matter what the batch is. Step time roughly the same. The optimizer step is a small slice of the total for a model this size.

A: Gradient accumulation. Activations and logits shrink four times, about four gibibytes instead of sixteen, and the model states don't move. Seconds per optimizer step a little higher than baseline. And this is the only lever that doesn't change the math at all. Just the schedule.

A: [working it out] Then max batch. You solve: the fixed part, plus batch times the cost per sequence, has to stay under a hundred eighteen. Baseline, about fourteen and a half fixed, and about two gibibytes per sequence. So roughly fifty sequences. Checkpointing cuts the per-sequence cost to about six tenths, and almost all of that's logits. So roughly a hundred seventy. And eight-bit Adam only moves the fixed part, so it buys you just two or three more sequences.

B: So for this model checkpointing is worth more than three times the batch, and eight-bit Adam is basically nothing.

A: For a model this size, at this sequence length, yeah. Your measured numbers will be lower than these. The ratios between setups are what to check. And then the interview question. Repeat the baseline at sequence five hundred twelve, a thousand twenty-four, and two thousand forty-eight. With fused attention, activations should double each time. Then switch to eager attention and do it again, and they should grow faster than double, because of the s squared score grids. And the model states don't change at all with sequence length. So at small scale or long context, activations are the bill. For big models at modest context, the model states are.

<!-- section: Break It -->

A: Then you break it. Four ways. First, turn off fused attention at a long sequence. Eager attention, sequence four thousand ninety-six, the smallest GPT two, batch four. And predict the score grids first. Five, times twelve heads, times four thousand ninety-six squared, times batch four, times twelve layers. That's about forty-eight gigabytes. Just for the score grids. For the smallest GPT two.

B: [surprised] Forty-eight gigs for a hundred-million-parameter model.

A: And you watch it fail where fused attention ran comfortably. The lesson: in training, the s squared term isn't a spike you pass through. It's a stash you keep until backward.

A: Second. Forget zero grad. Just comment it out and run five steps.

B: Memory climbs every step, because the gradients keep piling up.

A: That's the guess, and memory doesn't actually grow. The gradients accumulate into the same buffers. Same size, they just hold bigger and bigger sums. What goes haywire is the loss, because every step is now using the sum of all the previous gradients. Then put it back, but as zero grad with set to none turned off. That fills the buffers with zeros instead of freeing them. Training's correct again. But compare the peak with the default. It's higher by one full gradient copy, four bytes times seven seventy-four million under autocast, about two point nine gibibytes. Because the gradients now sit in memory through the next forward pass, right when activations peak. You can find that difference in your snapshot. And that's why PyTorch made set to none the default.

A: Third. Keep the graph alive by accident. Inside the loop, append the loss tensor itself to a list, instead of loss dot item. Run fifty steps, and memory climbs every step. Each stored loss tensor holds a reference to its whole autograd graph, and through it, every saved activation from that step. This is the most common real-world "memory leak" in training loops. Fix it with item, or detach, and the climb stops.

B: [amused] So that's the actual leak. Not the step two thing.

A: [laughs] That's the actual leak. Fourth. Train in pure B F sixteen with no master copy. Convert the whole model to B F sixteen, plain Adam W, a small learning rate, one in a hundred thousand. Train on one tiny fixed batch you should be able to memorise, and compare the loss curve to the autocast run. With a learning rate that small, lots of updates round to nothing in B F sixteen, and the loss stalls, or falls far more slowly. Your model states halve. That's the price.

<!-- section: Connections and close -->

A: If you want to go further, section three of the ZeRO paper is still the clearest accounting of training memory anyone's written, and the "Mixed Precision Training" paper is short and has the picture of updates vanishing below sixteen-bit precision. And this all feeds the next few things. Picking batch, sequence and checkpointing when you train a small language model end to end on the Spark. LoRA, which turns "seven B at most" into "seventy B comfortably". And distributed training, where you actually split the sixteen bytes across machines.

B: [working it out] Okay, let me try to say it. Serving needs the weights, two bytes a parameter. Training needs four more copies' worth: gradients, a full-precision master copy, and Adam's two averages, so sixteen bytes a parameter. And then on top of that, activations, which are the forward pass's leftovers, and they grow with batch and sequence. So training's about eight times serving, mostly because of Adam.

A: [gently] Mostly right. Two things to sharpen. The sixteen is about eight times serving before you count activations, and activations can be as big again, or way bigger for a small model at a big batch. So "eight times" is the floor, not the answer. And the activations aren't just leftovers you forgot to clean up. Backward genuinely needs them, because every layer's gradient depends on what its input was. That's why they all have to be alive at the turn from forward to backward, and that's where the peak is. So every trick you have is just picking a bucket. Accumulation and checkpointing shrink the stash. Eight-bit Adam and Adafactor shrink the optimizer. Sharding splits all of it across GPUs. And LoRA stops paying the sixteen bytes on almost every weight.
