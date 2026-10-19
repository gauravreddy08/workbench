<!-- section: The Problem -->

A: [relaxed, thinking out loud] Okay, so here's a crash that confuses everybody once. You take Llama three point two, the small one, one billion parameters. You know this model. It serves on a laptop. The weights are a couple of gigabytes, it barely notices the memory. And you think, great, let me fine-tune it. Same model. You write the obvious training loop, you put it on a decent gaming card, and it dies. First step. Out of memory.

B: On a model that fits on a laptop.

A: On a model that fits on a laptop. Nothing about the model changed. It's the same numbers. And then it gets weirder. You drop the batch all the way down to one, just one example at a time. And it runs. Step one goes through fine. And then it dies on step two.

B: [skeptical] That's the part I don't buy. Step two is the same as step one. Same model, same size batch. What could step two possibly need that step one didn't?

A: Hold onto that, because the answer is the whole story. But first, where do you think the extra memory went? The model's a couple of gigabytes. The card had way more than that.

B: I mean, my guess is the data. You've got a batch of long sequences going through it, and that's big. The model's the model, it's the weights. Training's just the weights plus whatever you're feeding in.

A: That's the picture most people carry around. And the data part is real, we'll get to it. But it misses the biggest piece. Running a model only needs the weights. Teaching a model needs the weights plus a pile of notes about every single one of them. Which way should this number move. How has it been moving lately. A careful backup copy of it. And then, on top of that, everything the model worked out on the way to its answer, kept around so it can trace its mistakes backwards. Add up the notes, and they're many times bigger than the weights.

B: Notes. Per weight.

A: Per weight. A billion weights, a billion sets of notes.

<!-- section: Someone wrote down the bytes -->

A: [warm] And the funny thing is, for a while people didn't really count this carefully. In twenty nineteen, GPT two had just made a billion and a half parameters feel huge, and everyone wanted to go bigger. And a team at Microsoft sat down and actually counted where the memory goes during training. Their paper opens with this observation that sounds like a typo. GPT two's biggest model, stored in sixteen-bit, is about a tenth the size of a big GPU's memory. And you can't train it on that GPU. Not with plain PyTorch, not at all.

B: A tenth. And it still doesn't fit.

A: Doesn't fit. And the culprit wasn't the data. It was the bookkeeping. The notes. Their fix, which they called ZeRO, was to stop keeping all those notes on every GPU and split them up across the machines instead. That idea is inside PyTorch now. But it all started with somebody just writing down the bytes, one by one. So let's do that.

<!-- section: The notes -->

A: First note is the obvious one. The gradient. For every weight, it's the answer to: if I nudged this number up a tiny bit, how much would the loss change? The backward pass works it out, and the optimizer uses it to decide which way to move the weight. And it's one number per weight. Same shape as the model. So that's a whole second copy of the model, right there.

B: Okay, that one I expected. You can't train without gradients.

A: Right. The next two are the ones that surprise people. You've used Adam. Everybody uses Adam. Do you know what it's actually remembering between steps?

B: [working it out] It's got... momentum, sort of? Some running average.

A: Two running averages. One is a smoothed version of the gradient. Basically, which way has this weight wanted to move lately. Because the gradient from one batch is noisy, it wobbles around, and averaging smooths that out. The other is a smoothed version of the gradient squared. Which is really asking, how big are this weight's pushes, usually? Some weights get shoved hard every step, some barely get touched. And Adam divides one by the other, so every weight gets its own step size, scaled to its own history.

B: Which is why it just works without much tuning.

A: That's exactly why. And it costs two more full copies of the model. And it's worse than that, because these averages are kept in full precision, thirty-two-bit. They're averages of lots of tiny numbers, and they lose accuracy fast in sixteen-bit. So Adam's notes alone are four times the size of the sixteen-bit weights they're updating.

B: Four times. Just for the optimizer.

A: Just for the optimizer. And here's your step two mystery. PyTorch doesn't create those notes when you make the optimizer. It creates them lazily, during the first update. I checked this on a small GPT two on my Mac. Before the first optimizer step, Adam's state was just empty. Nothing in it. Right after, every single weight had its two averages sitting there.

B: [jumping in] Oh. So step one's peak happened before Adam's notes existed.

A: Before they existed. The worst moment of step one had already passed by the time Adam made its notes. Step two is the first step that starts with all of them already in memory. Same work, plus four model-sized blocks of notes that weren't there before. That's the step two crash.

<!-- section: A backup copy -->

B: You said there's also a backup copy of the weights. Why would you keep the same weights twice?

A: This one's a precision story. Modern training does the heavy math in a sixteen-bit format, because the GPU's matrix units run it several times faster than full precision. And that format has big range but coarse steps. The numbers it can represent are spaced pretty far apart. Fine for the forward pass. But it bites you at exactly one place. The update.

B: Because the updates are tiny.

A: Because the updates are tiny. A typical update moves a weight by a really small fraction of its value. Smaller than the gap between two neighbouring sixteen-bit numbers. So you add the update, and the result just rounds straight back to where it started. The update vanishes. And it does that for every weight. Nothing crashes, nothing errors. Training just quietly stops learning.

B: [laughs] That's a horrible bug. It doesn't even tell you.

A: It doesn't tell you. So the fix, from a paper NVIDIA and Baidu put out back in twenty seventeen, is keep a master copy of the weights in full precision. The optimizer adds its tiny nudges to that copy, where they survive. Then the sixteen-bit copy gets refreshed from it before the next forward pass. And lots of small nudges pile up in the full-precision copy until they're big enough to actually show up in sixteen-bit.

B: So you're paying memory to stop the rounding from eating your updates.

A: That's the trade. And now you can add it all up. The sixteen-bit weights, their gradients, the full-precision backup, and Adam's two averages. It comes to about sixteen bytes for every weight. Serving needs two. So training is eight times the model, before you've stored a single thing about the data.

B: Wait, but I thought the whole point of mixed precision was to save memory.

A: Most people think that. But if you train plainly in full precision, everything's four bytes, weights, gradients, both of Adam's averages. That also lands on sixteen. Mixed precision doesn't really save you anything on these notes. What it saves is time, and the other bucket. The one you guessed. The data.

<!-- section: The stash -->

A: So you've built GPT two from scratch, you've called backward a million times. Think about what backward actually has to do. It walks from the loss back through every layer, asking at each one, if my input had moved a bit, how much would my output move? And the answer to that depends on what the input actually was.

B: [working it out] Like for a linear layer, the gradient for the weights needs the input that went in.

A: Right. The weight's gradient is built out of the input this layer saw going forward. And the activation function's slope depends on where on the curve you were. Softmax in attention needs its own output. So every operation, on the way forward, quietly stashes whatever it's going to need on the way back. PyTorch calls them saved tensors. And when you run with no gradients, at inference, nothing gets stashed. That's why serving gets to throw all this away the moment the next layer's used it.

B: And training has to keep it.

A: Training has to keep it. And now look at the timing. Layer one's stash is the first thing written on the way forward, and the very last thing read on the way back. It has to live through the entire forward pass and the entire backward pass. So at the moment you compute the loss, right at the turn, every layer's stash is alive at once. That's the peak. Not during the optimizer step. Not at the end. At the turn.

B: And that stash grows with the batch.

A: With the batch, with the sequence length, with how wide the model is, and with how many layers. Double the sequence, double the stash. Except for one nasty case. Textbook attention keeps a square grid of scores for every head, every word against every other word. That part grows with the square of the length. At long sequences it swamps everything else. The fused attention kernels, FlashAttention and friends, never store that grid. They recompute it during backward, piece by piece. Which is why FlashAttention actually saves more memory in training than in inference, because training would otherwise have to keep those grids around.

B: So for a small model with a big batch, the stash is the bill. And for a huge model, it's the notes.

A: That's it. Which is why memory advice depends so much on who's asking.

<!-- section: The levers -->

A: [relaxed] So once you see the buckets, every trick for fitting training into memory is just: remove one bucket, or shrink it. And you pay for each one somewhere. The most famous one goes after the stash. It's called activation checkpointing. Instead of keeping every layer's whole stash, you keep only what went into each layer. Then during backward, right before you need a layer's stash, you re-run that one layer forward to rebuild it.

B: So you trade memory for doing the forward pass twice.

A: Twice. And since the backward pass is about twice the work of the forward, one extra forward adds roughly a third more compute. In practice it costs you something like a quarter to a third of your speed. And it can cut the stash down to a small fraction of what it was.

B: Okay. What about Adam's notes, they were the big one.

A: You can store them in eight bits instead of thirty-two. Done naively, that wrecks them, because one scale for a whole tensor can't cover both the huge values and the tiny ones. So Tim Dettmers' version chops each tensor into small blocks, each with its own scale, so one weird outlier only hurts its own block. And it's a one-line change. Quarter the size of Adam's notes, same training quality in the tests they ran. And then there's the one that doesn't change the math at all, just the schedule. If a big batch doesn't fit, run a few smaller ones, add up their gradients, and only update after the last one. Same update, smaller stash. That's gradient accumulation. You pay a bit of speed because small passes keep the GPU less busy.

B: And the ZeRO thing from the beginning?

A: That's for when you have lots of GPUs. In plain multi-GPU training, every GPU keeps a full copy of all sixteen bytes per weight. The same notes, copied on every machine, for no reason except convenience. ZeRO shards them, so each GPU keeps just its slice. PyTorch's version is called FSDP. You'll meet it again.

B: [skeptical] There's also offloading, right? Push the optimizer notes into CPU RAM. That should help on the Spark, it's got tons of memory.

A: That's the one that catches people on the Spark. On a normal server, yes, it's a real win. The GPU has its own memory and the CPU next to it has a lot more. But on the Spark, the CPU and the GPU share the same memory. One pool. So moving a tensor "to the CPU" just puts a different label on the same chips. It buys you nothing. The only offload that actually adds room is to the SSD, and that's hundreds of times slower than memory.

B: Huh. So the unified memory thing cuts both ways.

A: Cuts both ways.

<!-- section: What fits on the Spark -->

A: So here's the question that actually matters for you. What's the biggest model you can fine-tune on the Spark? With the plain recipe, sixteen bytes a weight, leave room for the operating system and a modest stash, and you top out around a seven billion parameter model. The eight billion Llama doesn't fit. Its notes alone eat basically the whole machine.

B: That's kind of depressing for a box with that much memory.

A: It is, until you change the question. LoRA. You freeze the base model, and train small extra matrices next to some of its layers. The frozen weights don't need gradients, they don't need a backup copy, they don't need Adam's notes. They just sit there at their two bytes, like they would for serving. Only the tiny add-on pieces pay the full sixteen, and they're a fraction of a percent of the model.

B: So most of the model is back to inference prices.

A: Back to inference prices. And if you store the frozen base in four bits, which is called QLoRA, a seventy billion parameter model fits, with room to spare. So full fine-tuning, about seven billion. Adapters, about seventy. Ten times the model, from the same memory.

B: [working it out] Wait, but if the base is frozen, you don't need the stash either, right? Nothing to compute gradients for.

A: That's the one thing LoRA doesn't save you. The adapters live in every layer, including the early ones. To get a gradient back to an adapter in layer one, it has to flow backward through every frozen layer after it. And flowing backward through a layer needs what that layer saw going forward. You get to skip a little of it, but most of the stash stays. So checkpointing helps LoRA exactly as much as it helps full training.

<!-- section: Ending -->

B: Okay, let me try it. Running a model, you just need the weights. Training needs the weights plus notes on every weight: the gradient, a full-precision backup so small updates don't round away, and Adam's two averages. That's about eight times the model. Then on top, the stash, which grows with the batch and the length and peaks right when forward turns into backward. And the step two crash is Adam making its notes late.

A: That's it. The one thing I'd sharpen is that the two piles answer to different things. The notes only care about how many weights you have. The stash only cares about what you feed through it. So when a training job runs out of memory, the first question isn't "how do I make it smaller". It's "which pile is the big one here?" Because checkpointing does nothing for Adam's notes, and eight-bit Adam does nothing for a long sequence. Name the pile, and you know which lever to pull.
