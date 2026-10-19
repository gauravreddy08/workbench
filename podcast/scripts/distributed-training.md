<!-- section: Two walls -->

A: [relaxed, thinking out loud] So your cross-encoder trains fine on the Spark. It fits, an epoch takes about an hour, life is good. Now imagine someone walks over and hands you the real job. Pretrain a seventy billion weight language model, on an enormous pile of text, and here's a cluster of about a thousand GPUs. Go.

B: Okay. I'd start by just trying it on one GPU, honestly. See what breaks.

A: Do it in your head. It breaks before the first step. Training doesn't just need the weights. It needs the gradients, and then the optimizer keeps its own notes for every weight, a precise copy and a couple of running averages. And those notes are actually most of it. Add it all up and the training state is more than ten times what the biggest GPU can hold.

B: Okay, so memory's out. But say I had a magic GPU with infinite memory.

A: Then you hit the other wall. Work out how much arithmetic the whole run takes, and divide by how fast one GPU really goes. It comes out around five hundred years.

B: [laughs] Okay. So that's not happening.

A: That's not happening. So the job isn't really "train a model". The job is "make a thousand GPUs behave like one enormous GPU". Every GPU holds just a slice of the problem, and they have to keep talking to each other, through cables that are much slower than their own memory. And GPUs that are waiting on each other are GPUs you're paying for and not using. That's where all the engineering lives.

<!-- section: The traffic jam -->

A: And it took a while to figure out. Back in twenty twelve, AlexNet was trained on two little gaming GPUs, and the network was split across them by hand, because it didn't fit on one. Then for a few years, "distributed training" mostly meant parameter servers. A few machines hold the weights, all the workers send their gradients in and pull the new weights back out.

B: That sounds reasonable. One place that does the averaging.

A: It does, and it became a traffic jam. Every worker talking to the same few machines. The more workers you add, the worse the jam. And then a couple of ideas cleared it, one after another. Baidu's research team borrowed a trick from the supercomputing world called ring all-reduce, which gets rid of the central server completely. And then, as models got too big for one GPU, people came up with ways to split the model itself. NVIDIA's Megatron, Google's GPipe, Microsoft's ZeRO. Every big model trained since combines all of them.

<!-- section: Passing it around a circle -->

B: Okay, so how do they talk without a central server?

A: So first, every GPU is running its own separate copy of your Python script. Its own process, its own memory. They don't share anything. The only way they communicate is through these group moves, called collectives, where every GPU calls the same function at the same moment, and it only returns once the whole group is done. The one that matters most is called all-reduce. Everyone has a list of numbers, say their gradient, and everyone ends up with the sum.

B: And the naive way is just, everyone sends their stuff to one GPU, it adds it up, sends it back.

A: Right, and that one GPU is the parameter server traffic jam all over again. It has to receive from everyone and send to everyone. The cost grows with every GPU you add. So here's the ring. Put the GPUs in a circle. Each one only ever sends to its right-hand neighbour and receives from its left. Cut every gradient into as many pieces as there are GPUs. Then each step, every GPU passes one piece to the right, and the neighbour adds it to its own copy of that piece. The pieces are staggered, so everyone's busy at once, nobody's working on the same piece.

B: So the pieces travel around collecting everyone's contribution.

A: Right. After one lap, each GPU is holding one piece that's passed through everyone. A fully summed piece. Then you do one more lap just passing the finished pieces around, and everybody has everything.

B: [working it out] Okay, but then a thousand GPUs is a thousand steps around the circle. That's got to get slower the more GPUs you add.

A: That's what everybody thinks first, and here's the lovely part. The number of steps grows, yes. But the pieces get smaller as you add GPUs, because you're cutting the gradient into more of them. And when you count it, each GPU sends about twice its own gradient. Total. Whether there are four GPUs or a thousand.

B: Huh. So it's flat.

A: The amount of data each GPU sends is flat. What isn't flat is the number of hops, and every hop has a small fixed toll, just the cost of sending a message at all. For big gradients the toll doesn't matter. For tiny messages on thousands of GPUs, it starts to. And I actually saw that on my Mac, faking four GPUs with four processes. Tiny messages took about the same time as messages many times bigger. Below some size, you're not paying for data, you're just paying the toll.

<!-- section: Copy the model, split the examples -->

A: So now the simplest way to use lots of GPUs. Every GPU gets a full copy of the model. Each one takes a different slice of the batch, runs forward and backward, gets its own gradient. Then all-reduce the gradients and divide by how many there are. Now everybody has the gradient for the whole batch. Everyone takes the same step, so the copies stay identical without ever sending the weights. That's data parallelism.

B: That's the one I'd have guessed. Is it an approximation, though? Averaging everyone's little gradients?

A: No, it's exact. Because the loss is an average over examples, the average of the slices' gradients is exactly the gradient of the full batch. And there's a clever bit of timing. Backward produces gradients from the last layer to the first. So the last layer's gradient is ready long before the first one is. So it bundles them into buckets and starts sending each bucket the moment it's full, while backward's still working on the earlier layers. The talking hides behind the computing.

B: So why isn't that the whole answer?

A: Two reasons. For a model this size, the gradient exchange is so big it takes longer than the computing it's supposed to hide behind. And the memory problem never went away. Every GPU still needs a full copy of the weights, gradients and all those optimizer notes. Which, if you think about it, is a little absurd. A thousand GPUs, all holding the exact same notes.

<!-- section: Stop keeping a thousand copies -->

A: And that's exactly what ZeRO noticed. Microsoft's team asked, why does everyone keep everything? Each GPU only needs to update its own slice of the weights, if someone else updates the rest. So you split the training state into slices, called shards, one per GPU.

B: Split which part?

A: In stages. First the optimizer's notes, because they're the biggest. And here's the trick that makes it free. That all-reduce I described, the ring? It's really two halves. The first lap is "add up, and each GPU ends up holding the sum for one slice". The second lap is "share the slices so everyone has everything". So instead, after the first lap, each GPU just updates its own slice of the weights, and then the second lap shares out the new weights instead. Same bytes on the wire as before. You've saved a ton of memory and paid nothing for it.

B: Oh, that's neat. It's the same two laps, just doing something different in the middle.

A: Same two laps. Then the next stage splits the gradients too, also free. And the last stage splits the weights themselves. No GPU holds the whole model anymore. Right before a layer runs, everyone fetches that layer's weights from each other, uses them, and throws them away. Weights, just in time. That one does cost extra talking. PyTorch's version of that last stage is called FSDP, fully sharded data parallel, and it fetches the next layer's weights while the current one is still computing.

B: So memory's solved.

A: The weights' memory is solved. But there's something it can't touch. The activations, all the in-between outputs that the forward pass has to keep around for backward. They grow with how long your sequences are, not with how you split the weights. For a long sequence through a model this size, that's a lot on its own. To shrink that, you have to split the layers themselves.

<!-- section: Tear the matrix in half -->

A: So, the second way. Take one of the big matrix multiplies in a layer and tear it down the middle. Half the matrix on one GPU, half on the other. The people behind Megatron found a really tidy way to do it for the feed-forward part. Split the first matrix one way and the second matrix the other way, and each GPU can do its half of the whole thing without talking. Then at the very end, you add the two halves together, one all-reduce, and you've got the full answer.

B: That sounds great. Why isn't everyone doing that across the whole cluster?

A: Because of when it talks. That all-reduce happens in the middle of every layer, forward and backward, and the next layer can't start until the sum arrives. So there's nothing to hide it behind. It's a constant stream of medium-sized messages, and every one of them blocks the GPU. It only works if the link between those GPUs is really fast.

<!-- section: The cables -->

B: And the links aren't all the same.

A: Not even close, and this is the fact that decides everything. Inside one server, say eight GPUs in a box, they're wired to each other directly with something called NVLink. Between servers, they talk over a network, InfiniBand or fast Ethernet. And inside the box, GPUs talk about ten times faster than they talk to GPUs in the next box.

B: Okay. So the chatty one, tearing matrices, has to stay inside a box.

A: Has to stay inside a box. Push it across two boxes and its talking gets dramatically worse. Which brings in the third way, which is the one built for the slow network. Cut the model by depth. First GPU gets the first chunk of layers, the next GPU gets the next chunk, and they pass the work down the line like an assembly line. Pipeline parallelism. The only talking is one handoff from one stage to the next. Small messages. The slow network can handle that.

B: [skeptical] But an assembly line with one item on it is terrible. Everyone's waiting for the guy before them.

A: That's exactly the catch. With one batch, only one GPU is working at any moment. That idle time has a name, the pipeline bubble. And the fix is to chop the batch into lots of small micro-batches. The first GPU finishes the first one, hands it on, and immediately starts the second. The line fills up, runs full for a while, and drains at the end. The idle bit is just filling and draining. More micro-batches, smaller bubble.

B: So now the layout kind of falls out on its own.

A: It really does. Tear the matrices inside each box, on the fast wire. Run the assembly line across boxes, because its messages are small. And copy the whole arrangement outermost, the data parallel part, because it only talks once per step and can hide behind backward, so it can live on the slowest tier. Meta's big Llama three runs used all of that together. And it's the shape of the answer to "how would you lay out a huge model on a thousand GPUs", which is a really standard interview question at the labs.

<!-- section: Something is always broken -->

A: And then there's the part tutorials skip, which is the part that dominates the real job. One GPU is very reliable. Thousands of them are not. Meta was unusually honest about this. On their biggest run, they had an unexpected failure about every three hours. Mostly hardware. Bad GPUs, bad memory, flaky network links.

B: And because everyone's waiting on everyone else in that all-reduce—

A: One dead GPU stops all the others. So the system has three jobs. Save a checkpoint often, everything needed to resume, with each GPU writing its own slice so it's quick. Restart without a human, so a dead machine gets swapped for a spare and the job picks up from the last save, because at three in the morning nobody's watching. And find the slow ones. A GPU that's running hot doesn't crash, it just makes every step as slow as itself.

B: That's the tail latency thing. The step is as slow as the slowest of a thousand.

A: Same problem, at cluster scale. The step time is the worst GPU, not the average one.

<!-- section: Ending -->

B: Okay, let me try it. One GPU can't hold the model and would take forever, so you split it. You can copy the model and split the examples, tear the matrices in half, or chain the layers like an assembly line. And the matrix one talks so much it has to be on the fast wire, the assembly line is for the slow network, and the copies sit on the outside. And then ZeRO is a fourth kind of split, on top.

A: That's right, with one sharpening. ZeRO isn't really a fourth way to cut the work. It's the copy-the-model approach with the waste taken out. Every GPU still does the same work on different examples, it just stops storing what the others are storing. And underneath all of it is that one question. For each kind of split, what has to be said between GPUs, how often, and over which wire? Get that right and the layout picks itself.
