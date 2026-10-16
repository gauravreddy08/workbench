<!-- section: The Problem -->

A: [relaxed, thinking out loud] So your cross-encoder. It trains fine on the Spark, right? It's a few hundred million parameters, it fits, an epoch takes about an hour. Now imagine somebody walks over and hands you the real job. Pretrain a seventy billion parameter language model, on fifteen trillion tokens. You've got a cluster of one thousand and twenty-four H one hundreds, and a deadline. And the first thing to do is try the obvious thing, just in your head. Put the model on one GPU and run the training loop you already know.

B: [a bit unsure] I mean, it won't fit, I get that much. Seventy billion parameters, two bytes each in B F sixteen, that's a hundred forty gigabytes. An H one hundred has eighty. So you're short by, what, a factor of two?

A: That's the number for running the model. Training's much worse. Quick refresher on why. When you train with Adam in mixed precision, every parameter drags a bunch of bookkeeping along with it. There's the B F sixteen weight itself, two bytes. Its gradient, another two. Then a full precision copy of the weight, four bytes, so tiny updates don't get rounded away. And Adam keeps two running averages per weight, four bytes each. Add that up and it's about sixteen bytes per parameter. So seventy billion times sixteen is about one point one terabytes. Against eighty gigabytes on an H one hundred. Or a hundred twenty-eight on the Spark, that's the spec sheet number. So you're not off by two. You're off by more than ten. And that's before you count activations, which we'll get to.

B: Okay. But say memory were free. Then it's just slow, right?

A: [amused] Just slow. Let's see how slow. There's a standard estimate for how much arithmetic training a transformer takes. Six times the number of parameters times the number of training tokens. People write it as six N D. The six comes from this: each token costs about two operations per parameter going forward, and about four going backward. And by operations I mean floating-point operations, flops. One multiply, or one add. So six, times seventy billion, times fifteen trillion. That's about six point three times ten to the twenty-four. Six followed by twenty-four zeros, roughly. An H one hundred peaks at about nine hundred eighty-nine trillion B F sixteen flops a second, spec sheet, dense. Real training gets maybe forty percent of that. Divide it out and you get about one point six times ten to the ten seconds.

B: Which is...

A: [deadpan] About five hundred years.

B: [laughs] Okay.

A: And on the Spark, which is several times slower at B F sixteen, it's thousands of years. Now put all one thousand and twenty-four GPUs on it, used perfectly, and it's about a hundred eighty days. On sixteen thousand GPUs, about eleven days. So if you drew both of these side by side, on the left there's one long bar, the training state, eleven hundred twenty gigabytes, and next to it a little stub for the H one hundred's eighty, and a slightly bigger stub for the Spark. On the right, the time, on a log scale. Five hundred years for one GPU, six months for a thousand, under two weeks for sixteen thousand. And both sides are saying the same thing. Split it, or don't do it.

B: So the job isn't really "train a model".

A: No. The job is make one thousand and twenty-four GPUs, or sixteen thousand, behave like one enormous GPU. Where every GPU only holds a slice of the problem, and they talk to each other through cables that are much slower than their own memory. And that hundred eighty days I just said? It assumes the GPUs never wait for each other. That assumption is where all the engineering lives. A GPU that's waiting on another GPU is a GPU you're paying for and not using.

<!-- section: Origin -->

A: It didn't start at a thousand GPUs, obviously. Twenty twelve, AlexNet, the network that kicked off the deep learning boom. It was trained on two G T X five eighties, gaming cards, three gigabytes each. And the network didn't fit on one of them, so the authors split it by hand across the two. For a few years after that, distributed training mostly meant something called a parameter server. A few machines held the weights. Workers computed gradients, sent them in to the servers, and pulled fresh weights back out. And the servers became a traffic jam. Everyone's talking to the same few machines.

B: Right, everything funnels through one spot.

A: Yeah. And two ideas cleared the jam. In twenty seventeen, Baidu's research team took an algorithm from the supercomputing world called ring all-reduce. Two researchers, Patarasuk and Yuan, had actually proved back in two thousand nine that it's as good as it gets on bandwidth. And Baidu showed it lets every GPU exchange gradients with no central server at all. Then Uber packaged it as a library called Horovod, for TensorFlow and PyTorch. Second thing that happened: the models outgrew one GPU's memory. So in twenty nineteen NVIDIA's Megatron L M split each layer's matrices across the GPUs inside one server. Google's G Pipe split the layers into stages, like an assembly line. And Microsoft's ZeRO, twenty nineteen into twenty twenty, noticed that the standard approach kept a full, redundant copy of everything on every GPU, and just... stopped doing that. And every large model trained since then, from GPT three to Llama three, combines all three of those ideas.

<!-- section: The Idea: three ways to split -->

A: One picture to hang all of it on, and then I'll drop it. Imagine a class working through a really long problem set together, and they have to agree on one answer key at the end of each page. There are three ways to split that up. One, give every student a full copy of the book and a different set of problems, and at the end of each page they compare and average their answers. That's data parallelism. Two, tear every page down the middle, so each student does half of every calculation, and they shout partial results across the table. That's tensor parallelism. Three, give chapter one to the first student, chapter two to the next, and pass the work down the row. That's pipeline parallelism.

B: And they all need different amounts of shouting.

A: Different kinds of talking, yeah. And honestly the whole art is matching the kind of talking to the kind of cable between the students.

<!-- section: The Idea: collectives -->

A: So first, what does talking even mean here. Every GPU in a job runs the same Python script, as its own process. And remember, separate processes don't share memory. Each one has its own private address space. So there's no shared variable they can all just read. Each process gets a number, its rank, from zero up to however many there are minus one. Usually one rank per GPU. And the total count is called the world size. They communicate by calling what are called collective operations, or just collectives. A collective is a function that every rank calls at the same moment, together, and it only returns once the whole group has finished the exchange. Like everyone saying "add up your numbers, and everyone get the total", all at once.

B: [skeptical] Who actually does the sending, though? Like, is that PyTorch?

A: PyTorch calls into a library. On NVIDIA GPUs it's NCCL, N C C L, people say "nickel". NVIDIA Collective Communications Library. It knows how to move data over NVLink, over PCIe, over network cards, and it picks algorithms, rings or trees, based on the hardware it finds. On CPUs, PyTorch uses one called gloo, from Meta. It runs over plain TCP, it's slower, but it runs anywhere. Which is why you'll use it on your Mac. And there are only five collectives you actually need. Picture four GPUs, before and after. Broadcast: one GPU has something, everyone ends up with a copy. You use that once, at the very start, so every GPU begins with identical weights. Reduce: everyone has a vector, and one GPU ends up with the sum. All-reduce: everyone has a vector, and everyone ends up with the sum. That's the workhorse. Sum the gradients, then average them, and every GPU takes the same step.

B: Okay, those three are kind of obvious.

A: The last two are the interesting ones. Reduce-scatter. Everyone has a vector, and each GPU ends up with the sum of just one slice of it. So like an all-reduce, but GPU zero only keeps the first quarter of the answer, GPU one keeps the second quarter, and so on. And all-gather. Each GPU has one slice, and everyone ends up with all the slices glued together.

B: Those sound like curiosities.

A: [jumping in] They look like curiosities until you notice this. A reduce-scatter followed by an all-gather is an all-reduce. Exactly. First everyone gets the summed version of their quarter, then everyone shares their quarter, and now everyone has the whole summed vector. And that one fact is how the fast all-reduce works, and it's the entire trick behind ZeRO. So hold on to it. It'll come back twice.

<!-- section: The Idea: ring all-reduce -->

A: So, how do you sum a vector across N GPUs without a traffic jam. Each GPU has a gradient, call it S bytes. Everyone needs the sum. How much does each GPU have to send?

B: [casual, a bit unsure] Honestly my picture of all-reduce is everyone sends their gradient to one GPU, it adds them up, and sends the total back out. Like, that's what I'd write.

A: That's what everyone would write first. And it's exactly the parameter-server jam. Run the numbers. GPU zero receives N minus one whole gradients, and then sends N minus one whole gradients back. Take a thousand and twenty-four GPUs and a hundred forty gigabyte gradient, so that's seventy billion parameters at two bytes each. GPU zero is moving a hundred forty-three terabytes per step. While every other GPU sits there waiting. And it gets worse as you add GPUs.

B: Yeah, okay, that's bad.

A: So here's the question. There's an algorithm where every GPU sends and receives the same amount, all at the same time, and no GPU is special. With N GPUs and S bytes each, roughly how much does each GPU have to send so everyone ends up with the sum? And does that grow with N?

B: [working it out] It has to grow, right? More GPUs, more gradients that have to get to me somehow. If I need everybody's contribution, that's... N minus one gradients' worth coming in, at least.

A: [gently] That's the intuition, and it's wrong. It's about two S. Twice the gradient. And it doesn't grow with N. Precisely, it's two times N minus one over N, times S. So with four GPUs that's one and a half times the gradient. With a thousand and twenty-four it's one point nine nine eight times. Basically two, forever.

B: How? I still need everyone's numbers.

A: You need everyone's numbers summed into yours, but they don't have to arrive separately. They can arrive already added together. Here's how. Arrange the GPUs in a circle. Each one only ever sends to its right-hand neighbour and only ever receives from its left-hand neighbour. Now cut every GPU's gradient into N equal chunks. With four GPUs, four chunks. Phase one is the reduce-scatter part, and it takes N minus one steps, so three. At each step, every GPU sends one chunk to the right, and the neighbour adds it into its own copy of that chunk. The trick is the chunks are staggered, so no two GPUs are sending the same chunk at the same step. GPU zero sends chunk zero, GPU one sends chunk one, and so on. Every link in the circle is busy at once.

B: So a chunk is, like, accumulating as it goes around.

A: Exactly that. Each hop, one more GPU's contribution gets added in. After three steps, each chunk has passed through all four GPUs. So every GPU ends up owning one chunk that's fully summed. One quarter of the answer, complete. Which, notice, is a reduce-scatter. Then phase two is the all-gather. Another N minus one steps. Every GPU forwards its finished chunk around the ring, and the receiver doesn't add anymore, it just overwrites its stale copy. After three more steps, everyone has every finished chunk.

B: Okay, so then count it. Six steps...

A: Six steps, each sending one chunk, and a chunk is a quarter of the gradient. So six quarters, one and a half times the gradient. In general it's two times N minus one steps, each sending one Nth of S. And the N's nearly cancel. If you had a little grid to play with, GPUs as rows, chunks as columns, each cell shaded by how many GPUs' contributions it holds, you'd step through and watch the shading darken one hop at a time until one cell per row is solid. Then watch the solid cells spread. And then if you drag N from four up to eight, the number of steps goes up, but the readout of how much each GPU sent so far just sits there below two times the gradient. One point five, one point six seven, one point seven five, creeping toward two and never past it.

B: [working it out] And everyone's sending at the same time, so the clock time is just... how long it takes to push two gradients through one link.

A: Right. And that gives you a time model you've seen before, the same shape as RAM versus disk versus network. Every message costs a fixed amount just to happen, no matter how small. Software overhead, setting up the transfer, the signal crossing the wire. That's latency. Microseconds on good hardware. And then there's how many bytes per second the link moves once data's flowing. That's bandwidth. The pipe's width, not its length. So the ring's time is two gradients' worth divided by the link's bandwidth, plus the number of steps times that fixed latency. The bandwidth part is flat in N. The latency part grows with N, because the number of steps grows.

B: So at some point the latency part wins.

A: For small messages on thousands of GPUs, yeah. With a thousand and twenty-four GPUs that's two thousand and forty-six hops, each paying the fixed cost. That starts to hurt. Which is why NCCL also has tree algorithms, and builds its rings hierarchically, inside each machine first and then across machines. For big gradients the bandwidth part dominates, and that's why the ring is called bandwidth-optimal. And you'll actually see both parts on your Mac when you measure it. One more name. People quote how fast a collective ran as bus bandwidth. It's the message size, times that two times N minus one over N factor, divided by the time. It cancels out N so you can hold it up directly against the link's rated speed. If bus bandwidth is close to the link speed, the collective's doing as well as physics lets it.

<!-- section: The Idea: data parallelism -->

A: Okay. So now the simplest way to actually use N GPUs. Data parallelism. Every GPU holds a full copy of the model. Each training step, each GPU takes a different slice of the batch. GPU zero gets examples zero through thirty-one, GPU one gets thirty-two through sixty-three, and so on. Each one runs forward and backward on its slice and gets its own gradient. Then you all-reduce the gradients and divide by N. Now every GPU has the gradient of the whole batch. And then every GPU runs the same optimizer step on the same gradient, so all the copies stay identical. Without ever sending the weights.

B: [skeptical] But that's an approximation, right? You're averaging a bunch of little gradients instead of computing the real one.

A: [firmly] No, it's exact. And it's worth seeing why, because it's not obvious. The loss is an average over examples. And the gradient of an average is the average of the gradients. So if every GPU has the same number of examples, the average of the per-slice gradients is, exactly, the gradient of the full batch. Same thing one giant GPU would have computed. When you check it on your machine, it matches to about seven decimal places, and the leftover is just floating-point rounding.

B: Huh. Okay.

A: In PyTorch this is D D P, DistributedDataParallel. It broadcasts the starting weights from rank zero, and then it all-reduces the gradients during backward. And that "during" is the clever part. The naive version waits for backward to finish completely, then all-reduces a hundred forty gigabytes of gradients while the GPU sits idle. But backward produces gradients layer by layer, from the last layer to the first. The last layer's gradient is done long before the first layer's even gets computed. So D D P groups gradients into buckets, twenty-five megabytes each by default, and the moment a bucket is full, it starts all-reducing it, while backward keeps working on the earlier layers. Bigger buckets waste less on that fixed per-message cost. Smaller ones start talking sooner. Either way, the communication hides behind compute. And if the network's fast enough, the all-reduce costs almost nothing.

B: So what's wrong with just doing that for the seventy B model?

A: Let's find out. Data parallelism alone, seventy B model, a thousand and twenty-four GPUs. Say each GPU's network link moves about fifty gigabytes a second. Ignore the memory problem for a second. Gradients in B F sixteen, two bytes each. How long does the all-reduce take each step? And the compute step it's supposed to hide behind is about three and a half seconds.

B: [working it out] Gradient's a hundred forty gigabytes. Ring sends about twice that, so two eighty. Over fifty a second... five and a half seconds? Something like that.

A: [matter-of-fact] Five point six. Which is longer than the compute it's supposed to hide behind. So even with perfect overlap, the GPUs idle. And the memory problem doesn't go away by ignoring it. Every GPU would still need one point one terabytes. So pure data parallelism is great for your cross-encoder, and hopeless for a seventy B model. And both problems point the same direction. Stop giving every GPU a full copy.

<!-- section: The Idea: ZeRO and FSDP -->

A: So look again at what each GPU stores. Those sixteen bytes per parameter. Two for the B F sixteen weights, which forward and backward actually use. Two for the gradients. Then twelve for the optimizer: the four-byte full precision master copy, Adam's first moment, which is a running average of the gradient, basically momentum, four bytes. And Adam's second moment, a running average of the squared gradient, four bytes. So twelve of the sixteen are optimizer state. Three times as big as the weights themselves. And with data parallelism, every one of the N GPUs stores all sixteen bytes for every parameter. N identical copies.

B: [amused] Which is a lot of identical copies.

A: That's the question ZeRO asks. Zero Redundancy Optimizer, from Microsoft's DeepSpeed team, Rajbhandari and colleagues, twenty nineteen. Why does every GPU have all of this? Each GPU only really needs to update its own one Nth of the parameters, if somebody else updates the rest. So you shard the training state. Shard just means cut it into N pieces and give each GPU one piece. And it comes in three stages. Stage one, shard the optimizer state. Each GPU keeps the master weights and the Adam averages only for its own one Nth of the parameters. And the communication changes. Instead of an all-reduce of the gradients, you do a reduce-scatter, so each GPU gets the summed gradient for just its slice. It updates its slice. Then all-gather the new B F sixteen weights so everyone has the full model again.

B: Wait. Reduce-scatter then all-gather. That's the thing.

A: [pleased] That's the thing. Reduce-scatter plus all-gather is an all-reduce. So it moves exactly the same bytes as plain D D P. You get a big chunk of memory back for free. Stage two, also shard the gradients. After the reduce-scatter, a GPU only ever needs the gradient for its own slice, so it can throw the rest away as backward goes. Still the same communication. Stage three, also shard the weights themselves. Now no GPU holds the full model, ever. Right before computing a layer, the GPUs all-gather that layer's weights, use them, and immediately free them again. Just-in-time weights. That costs an extra all-gather in the backward pass, because the weights are needed again there. So about one and a half times the communication of D D P.

B: Can you give me the actual numbers for that? Like per GPU?

A: Take four GPUs, bytes per parameter on each. Plain D D P, sixteen. Stage one keeps the four bytes of weights and gradients and a quarter of the twelve, so four plus three, seven. Stage two keeps the full two bytes of weights, and a quarter of everything else, the gradients and the optimizer state, so two plus three and a half, five and a half. Stage three, a quarter of all sixteen, so four. And the traffic per step: D D P, stage one and stage two all move about twice the model. Stage three about three times. Now with a thousand and twenty-four GPUs instead of four, stage three gets each GPU down to about one gigabyte for a seventy B model's training state. One point one terabytes, split a thousand ways.

B: Okay, that's a different world.

A: It is. F S D P, Fully Sharded Data Parallel, is PyTorch's own version of stage three. The current API is called fully shard, people call it F S D P two. You wrap each transformer block as a unit. Before a block runs, F S D P all-gathers that block's weights, and it prefetches the next block's weights while the current one is computing. So, again, communication hides behind compute.

B: So F S D P basically solves the memory problem. You shard everything, you're done.

A: It solves the training-state part. But two things it doesn't touch. First, the problem from a minute ago is still there: every step still all-gathers and reduce-scatters the whole model across all N GPUs over the slow network. And second, something we've been ignoring, activations. Those are the intermediate outputs of every layer that the forward pass saves, because backward needs them. They grow with batch size and sequence length. They don't care how you shard the weights. One four thousand and ninety-six token sequence through a seventy B model leaves something like ninety gigabytes of activations sitting there for backward, by the standard estimate. Sharding weights doesn't shrink that at all. To shrink it, you have to split the layers themselves.

<!-- section: The Idea: tensor parallelism -->

A: Which is tensor parallelism. Most of a transformer's compute is two big matrix multiplies per block in the MLP, and a few more in attention. And Megatron L M, Shoeybi and colleagues, twenty nineteen, found a way to split those across GPUs with very little talking. The MLP goes like this. Activations come in, one row per token. You multiply by a first weight matrix that expands each token from the hidden size to four times the hidden size. Apply GeLU. Then multiply by a second matrix that shrinks it back down.

B: Okay.

A: Two GPUs. Split the first matrix by columns. So each GPU has half the columns, and each one computes half of the expanded output. GeLU works element by element, every number on its own, so each GPU can apply it to its half without seeing the other half. No communication yet. Then split the second matrix by rows, the matching half. Each GPU multiplies its half of the expanded activations by its half of the rows. And here's the thing about matrix multiply: each output number is a sum over the inner dimension. So if you split that inner dimension in two, each GPU gets a partial sum. Add the two partial sums together and you've got the real answer.

B: So you all-reduce the partial sums.

A: Yep. One all-reduce, and both GPUs have the output. If you drew it, the input comes in on the left, the same copy on both GPUs. Two lanes run across, GPU zero on top, GPU one below, each doing its multiply, its GeLU, its second multiply, with "no comm needed" written in the middle. And then both lanes merge into one box at the right, the all-reduce, and out comes the result. Attention splits the same way. Each GPU takes a subset of the heads. The projections that make queries, keys and values get split by columns, so each GPU computes attention for its own heads entirely locally. Then the output projection is split by rows, and one all-reduce. So each transformer block costs two all-reduces in the forward pass and two in the backward.

B: That doesn't sound like much.

A: [jumping in] It's what and how often. Not the weights. The activations. Tokens times hidden size times two bytes. One four thousand and ninety-six token sequence, hidden size eight thousand one hundred ninety-two, that's sixty-four megabytes. Four times per block. Eighty blocks. Every micro-batch. And these sit right in the middle of the forward pass. The next layer can't start until the sum arrives. So nothing hides them. Tensor parallelism is a constant stream of medium-sized messages that block everything. It only works on the fastest links you have.

<!-- section: The Idea: the cables -->

A: And this is the hardware fact that decides everything else. Rough numbers, per GPU, per direction. Check the spec sheet for your exact generation. A GPU reading its own memory, H B M, the stacked memory right next to the chip: over three thousand gigabytes a second. An H one hundred's about three point three terabytes a second. Then NVLink, NVIDIA's direct GPU-to-GPU link inside one server. Through switch chips, every GPU in an eight-GPU box can talk to every other one at full speed. On H one hundreds that's about four hundred fifty gigabytes a second.

B: I thought NVLink was nine hundred. That's the number everyone quotes.

A: [amused] Nine hundred is the marketing number, and it counts both directions added together. One way, it's about four fifty. Next generation, B two hundreds, it's about nine hundred one way, one point eight terabytes both ways. And the plain slot connecting a GPU to its CPU or its network card, PCIe, is about sixty-four. Now leave the box. Between servers you've got InfiniBand, which is a network built for supercomputers. Very low latency, and it does something called R D M A, meaning the network card can write straight into another machine's GPU memory without either machine's CPU getting involved. Current InfiniBand is four hundred gigabits a second, typically one card per GPU. Or four hundred gig Ethernet doing the same R D M A trick, Meta trained Llama three on both kinds. Four hundred gigabits is fifty gigabytes a second.

B: Wait, gigabits to gigabytes, you just divide by eight?

A: Divide by eight, yeah. Network people quote bits, memory people quote bytes. So it's fifty gigabytes a second between servers, against four fifty inside. Inside a server, GPUs talk about ten times faster than they talk to a GPU in the next server. And that one ratio, ten to one, is why each kind of parallelism goes where it goes. For a sense of the bottom of the ladder, your home ten gigabit network is about one and a quarter gigabytes a second.

B: [curious] What's the Spark got?

A: The Spark actually has a real cluster network card on it. An NVIDIA ConnectX seven, the same family they use in the big clusters, with two ports. About two hundred gigabits, so twenty-five gigabytes a second. NVIDIA's user guide for the Spark has a page on cabling two of them together back to back into a two-node cluster, check the current doc for the supported cables. And that link is about ten times slower than the Spark's own memory, which is about two hundred seventy-three gigabytes a second on the spec sheet. So it's the same shape as a real cluster. Fast inside, ten times slower between. Just smaller.

<!-- section: The Idea: pipeline parallelism -->

A: Third way to split. Cut the model by depth. GPU zero gets layers one through twenty, GPU one gets twenty-one through forty, and so on. Each GPU sends its output activations to the next one. That's one message from one GPU to one other GPU, per stage boundary, per micro-batch. Tiny compared to tensor parallelism's four all-reduces per layer. So it can tolerate the slower links between servers.

B: And then they're all working at once. Four GPUs, four times the throughput.

A: That's the catch, though. With one batch, GPU one can't start until GPU zero is done. GPU two waits for GPU one. And on the way back, backward, the order reverses. So at any moment, one GPU is working and the rest are waiting. That idle time has a name, the pipeline bubble. The fix is from G Pipe, Huang and colleagues, twenty nineteen. Split the batch into small slices called micro-batches. GPU zero does micro-batch one, hands it on, and right away starts micro-batch two while GPU one works on micro-batch one. The line fills up, runs full for a while, and then drains. And the fraction of time wasted comes out to a simple ratio. Take the number of stages minus one, and divide by the number of micro-batches plus the number of stages minus one. So with four stages and twelve micro-batches, that's three over fifteen. A fifth of the time, idle.

B: [working it out] So the stages-minus-one is basically the fill-up and drain time, and the micro-batches are the useful part.

A: That's exactly what it is. So try one. Eight pipeline stages, eight micro-batches. What fraction of the time is idle? And how many micro-batches would you need to get under ten percent?

B: Seven over... eight plus seven, fifteen. So almost half? That can't be right.

A: [matter-of-fact] Forty-seven percent. It's right. Half your cluster sitting idle. And to get under ten percent, you need stages minus one, seven, to be less than a tenth of micro-batches plus seven. So micro-batches plus seven has to be more than seventy. Sixty-four micro-batches, at least. So the rule of thumb is micro-batches should be several times the number of stages. At least four times. And that means each pipeline needs a lot of sequences per step, which eats into your global batch size fast.

B: Hm.

A: Picture it as a timeline. Each row is a GPU holding one stage. Little F boxes for forward, B boxes for backward, and the B boxes are twice as wide because backward does about twice the work. You've got sliders for stages and micro-batches. Drag micro-batches up and the empty triangles at the two ends, the fill and the drain, become a smaller and smaller part of the whole picture. Drag stages up and they grow. And the measured idle fraction matches that ratio exactly. Then there's a toggle between two schedules. G Pipe does all the forwards, then all the backwards. Which means stage zero has to store the activations for every micro-batch at once. And we just said you want lots of micro-batches.

B: So the memory blows up.

A: It does. The other schedule's called one F one B, one forward one backward, from a system called PipeDream, Narayanan and colleagues. It starts each micro-batch's backward as early as it possibly can and alternates. Flip the toggle and the bubble's exactly the same size, but the readout for how many micro-batches stage zero is holding at once drops. It never holds more than the number of stages. That's why everyone uses one F one B, or its interleaved version, where each GPU gets several small, non-adjacent chunks of layers instead of one big block. That shrinks the bubble more, at the cost of more messages.

<!-- section: The Idea: 3D parallelism -->

A: So now the layout kind of falls out of the cables. Tensor parallelism inside a server. Eight, on an eight-GPU box. It needs the fastest link all the time, and if you go past eight, you put those blocking all-reduces on a network that's ten times slower. Pipeline parallelism across servers. Small point-to-point messages, InfiniBand handles them fine. And you pick the number of stages to make the model, weights and activations, fit. Then data parallelism on the outside, usually with ZeRO stage one or F S D P on top. Its big gradient exchange happens once per step and overlaps with backward, so it can live on the slowest tier.

B: [working it out] So the chattiest thing gets the fastest cable, and the thing that talks once a step gets the slowest one.

A: That's the rule. And the total number of GPUs is the product of the three. So for a thousand and twenty-four GPUs with tensor parallel eight and pipeline eight, data parallel is sixteen. Every GPU has three coordinates, like a position in a three-dimensional grid. And each collective only runs within the group that shares the other two coordinates. A tensor-parallel group is the eight GPUs in one box. A data-parallel group is the sixteen GPUs sitting at the same position in each of the sixteen copies of the model. PyTorch calls this grid a device mesh. A real data point: Meta's Llama three paper reports training the four hundred and five billion parameter model on sixteen thousand three hundred eighty-four H one hundreds, with tensor parallel eight, pipeline sixteen, and data parallel one hundred twenty-eight, for most of pretraining. And they got roughly forty percent of peak throughput. Roughly, that's from their table, it's worth reading yourself.

<!-- section: The Idea: sequence and context parallelism -->

A: One more axis, briefly. Some parts of a block, like layer norm and dropout, aren't split by tensor parallelism. So every GPU in the tensor-parallel group stores the full activations for those parts. Sequence parallelism, Korthikanti and colleagues, twenty twenty-two, splits those along the sequence instead, each GPU takes some of the tokens. And it replaces each all-reduce with a reduce-scatter plus an all-gather.

B: [amused] Which is the same bytes again.

A: Same bytes again. Free memory, same trick as ZeRO. And for really long contexts, a hundred twenty-eight thousand tokens and up, attention's activations dominate everything. So context parallelism splits the sequence itself across GPUs. Each GPU holds a block of tokens, and the keys and values get passed around a ring, so every block of queries eventually sees every block of keys. That's called ring attention, Liu and colleagues, twenty twenty-three. It's the ring idea again, just applied to attention instead of gradients. Llama three used it for its long-context phase.

<!-- section: The Idea: failures -->

A: Okay. This is the part tutorials skip. And it's the part that dominates the real job. A GPU is very reliable. A thousand of them are not. Meta's Llama three paper is unusually honest about this. During a fifty-four day stretch on sixteen thousand three hundred eighty-four GPUs, they had four hundred sixty-six job interruptions. Four hundred nineteen of them unexpected. And about seventy-eight percent of the unexpected ones were hardware. Faulty GPUs, GPU memory, network links, whole hosts. That's about eight unplanned failures a day. One every three hours.

B: [skeptical] But one GPU out of sixteen thousand, that's nothing. It drops out and the rest keep going.

A: [gently] That's the nasty part, it can't. Synchronous training has an all-reduce every step, and the all-reduce needs every single GPU. One dead GPU, and the other sixteen thousand three hundred eighty-three are all sitting inside a collective waiting for it. So the system has three jobs. First, checkpoint often, and cheaply. A checkpoint is a saved copy of everything you need to resume exactly. Weights, optimizer state, where the data loader was, random seeds, the step number. For a seventy B model that's the full one point one terabyte training state. But you write it in parallel. Each GPU saves only its own shard, PyTorch's distributed checkpointing does that, so the work's spread over all of them. And asynchronous checkpointing copies the state to CPU memory in a second or so, then writes it to storage in the background while training keeps going.

B: How often, though? Every step?

A: There's a classic rule for that, from Young, nineteen seventy-four, later refined by Daly. The best interval is about the square root of two times the checkpoint cost times the mean time between failures. So say a checkpoint costs you one minute, and a failure comes every three hours, a hundred eighty minutes. Two times one times a hundred eighty is three sixty. The square root of three sixty is about nineteen. So checkpoint every nineteen minutes or so. And then each failure costs you, on average, half an interval of lost work, plus however long it takes to restart.

B: [working it out] So checkpoint too often and you're paying the save cost constantly, too rarely and you lose a lot each crash. And the square root is the balance point.

A: Exactly. Second job, restart fast, ideally without a human. That's called elastic training. The job notices a worker died, regroups the survivors or swaps in a spare, reloads the last checkpoint, and carries on, without someone getting paged at three in the morning to restart it. In PyTorch it comes from torchrun. Workers meet at what's called a rendezvous, which is just the meeting point where they find each other at startup and agree on ranks. If one dies, the survivors meet again and restart from the checkpoint. Big clusters keep spare nodes on standby so the job comes back at the same size. And restart time matters as much as how often you checkpoint. Loading one point one terabytes, setting up NCCL across a thousand GPUs, warming up, that can take many minutes. At eight failures a day, those minutes add up. And that's really a design-doc problem, more than a code problem.

B: And the third?

A: Find the slow ones. A straggler is a worker that's just slower than the rest. A GPU throttling because it's running hot. A flaky network link that keeps retransmitting. A noisy neighbour. It doesn't crash. It just makes every step as slow as itself. Because each all-reduce waits for the slowest of N. And that's tail latency again. Remember p ninety-nine, the slowest one percent of requests? If one step needs a thousand and twenty-four GPUs to all finish, the step time is the max over all of them, not the average. So the rare slow GPU is in every single step. Teams track per-rank step times and kick out the slow node. And worse than slow is silent. A GPU that returns wrong numbers without crashing. You see it as a loss spike, or NaNs, not-a-number values showing up. Big training runs watch the loss curve the way you'd watch a patient's heart monitor.

<!-- section: Build It -->

A: So you've got one GPU. You fake the cluster with processes. On the Mac or the Spark, torchrun starts several Python processes, gives each one a rank, and the gloo backend lets them talk over local TCP. It's slow, it's local TCP, not NVLink. But it's literally the same code you'd run on a thousand GPUs with the backend switched to NCCL. And the correctness is exactly the same. Setup's a venv with PyTorch, any version from two point six up, I ran it on two point fourteen. The hello world is four processes, each contributes its own rank number, one all-reduce, and every process prints six. Zero plus one plus two plus three. And one tip: if startup hangs for a minute or more, gloo's probably trying a network interface it can't use. You pin it to loopback with an environment variable, gloo socket ifname. On my Mac that took startup from minutes to seconds.

B: Okay. Then what's the first real thing?

A: You write ring all-reduce yourself. Only point-to-point sends and receives, no calling the built-in all-reduce. The part that matters is the chunk indices. Work them out on paper for three GPUs first. In the reduce-scatter phase, at step s, rank r sends chunk r minus s, wrapping around. What does it receive? And after N minus one steps, which chunk does rank r own? Then there's a trap. If every rank calls a blocking send first, every rank is waiting for a receive that nobody's posted. Deadlock. So you use isend, the non-blocking send, then the receive, then wait on the send. And the test tensor is deliberately a million and three elements, not divisible by four, so the last chunk's smaller, and your receive buffer has to match whichever chunk you're receiving.

B: And when it works, it should match the built-in one exactly, right? Same numbers being added.

A: Same numbers, different order. Floating-point addition isn't associative. Add the same three numbers in two different orders and the last bit of rounding can come out different. Your ring adds in a different order than gloo does. So you'll see a difference around one in a million for values of size about one. That's right. Then you time it. Message sizes four kilobytes, sixty-four, one megabyte, sixteen, sixty-four. Warm up once, average twenty runs, barrier before you start and stop the clock. Print milliseconds and bus bandwidth. And before you run it, predict: will four kilobytes take a thousand times less time than four megabytes? Then you fit the two parts of the time model. The fixed latency from the smallest message, the bandwidth from the largest.

B: [casual] Okay. And after the ring?

A: D D P. You prove the gradients match one process. Build a tiny model with the same seed everywhere, so every rank starts identical. Same full batch on every rank, sixty-four examples. Reference: plain model, mean squared error on the whole batch, backward. Then D D P, each rank only on its quarter of the batch, backward. Print the biggest gradient difference. And then the review part is the interesting bit: have an agent check whether your comparison is actually testing what you think. What would break if the loss were a sum instead of a mean? Or if the slices had different sizes?

B: Hm. I'd have just checked the loss went down.

A: [amused] Which it would, even with the bug. Then F S D P. Four CPU processes, a small model of four square layers, two fifty-six by two fifty-six, each layer wrapped with fully shard. And you look at what each rank actually holds. Each weight is now what PyTorch calls a D Tensor, a distributed tensor. One logical tensor whose pieces live on different ranks, plus a description of how it's split. The global shape says two fifty-six by two fifty-six. The local piece on each rank is sixty-four by two fifty-six. A quarter of the rows. Ask an agent to explain where the all-gather happens during forward, there are hooks that fire before each layer runs, but write the prints yourself. And add up the local element counts on one rank and compare it to the full model.

B: Can I do that on the Spark's GPU?

A: With one rank, yes. It works, but with one rank nothing gets sharded, which is kind of worth seeing in itself. Two NCCL ranks on the same GPU aren't allowed, it'll likely refuse with a duplicate GPU error. So for multi-rank experiments on one GPU, you stay on gloo and CPU. Next, the tensor-parallel MLP on two processes. Same seed, so the same input and the same two weight matrices everywhere. Compute the unsplit answer as a reference. Then each rank takes its column slice of the first matrix and its row slice of the second, does its multiply, GeLU, multiply, and then one collective. And the questions are: which collective?

B: All-reduce. Partial sums.

A: Right. And why is it fine to apply GeLU before communicating? Because it's element by element. And what would go wrong if you split the first matrix by rows instead? Then each GPU would have partial sums before the GeLU, and GeLU of a partial sum isn't the partial of GeLU. You'd have to communicate first. You compare with a relative tolerance, because the outputs are big numbers. Then the pipeline. Four processes, one per stage, each layer is just a twenty millisecond sleep standing in for compute. Forward only. Stage s receives from the stage before, sleeps, sends to the next. Run it with one, four and sixteen micro-batches, and compare the idle fraction to the formula.

B: [a bit unsure] That's a lot of pieces.

A: It is, but each one's small. And then there's the one that will actually matter in an interview. A step-time calculator for seventy B on a thousand and twenty-four GPUs. You write the assumptions at the top, because they're yours to argue with. Seventy billion parameters, eighty layers, hidden size eight thousand one hundred ninety-two, sequence length four thousand and ninety-six, global batch of a thousand and twenty-four sequences, so about four million tokens a step. H one hundreds at nine eighty-nine trillion flops peak, fifty percent utilization on the matrix multiplies, eighty gigabytes each, eight per node. NVLink about four fifty, between nodes about fifty. And for any split, tensor times pipeline times data adding up to a thousand and twenty-four, it estimates compute time from six N D divided across the GPUs, inflates it by the bubble, adds tensor-parallel traffic, four all-reduces per layer of activations, over NVLink if tensor parallel is eight or less and over the slow network otherwise. Adds the data-parallel gradient all-reduce. And computes memory per GPU with and without ZeRO stage one. Then you print a table for a handful of layouts, and add a rough activation estimate and mark which ones fit in eighty gigabytes.

B: And then I write it up.

A: Then you write one page, for a reader who's going to decide from it. "Training a seventy B model on a thousand and twenty-four H one hundreds." Your layout and why, with numbers from the calculator. Expected step time and days to fifteen trillion tokens. Checkpoint interval and the reasoning. What happens when a node dies. And the two measurements you'd make in the first hour on the real cluster to check your assumptions. And then have an agent review it like a skeptical senior engineer would. Which assumption, if it's wrong, changes the decision?

<!-- section: Measure -->

A: So what do you actually see. On an M-series MacBook, four gloo processes over loopback, the small messages are all latency. Four kilobytes and sixty-four kilobytes take about the same time, a couple of milliseconds, even though one's sixteen times bigger. My ring did four kilobytes in about one point three milliseconds, and gloo's built-in took about two point three.

B: [surprised] Wait, sixteen times the data and no difference at all?

A: None that matters. That's the latency part. Six hops around the ring, each costing about a millisecond through local TCP and Python. NCCL over NVLink has a fixed cost of a few microseconds per hop, about a thousand times smaller. But the shape's the same. Below some size, a collective costs a fixed amount no matter how little you send. And that's exactly why D D P batches gradients into twenty-five megabyte buckets instead of sending each tensor on its own. Then the big messages approach a ceiling. From sixteen to sixty-four megabytes, the time goes up only about two to three times for four times the data. My ring took about forty-eight milliseconds at sixteen and about a hundred two at sixty-four. Bus bandwidth climbs toward about one gigabyte a second, and I topped out around three quarters of one. That's roughly what local TCP through the kernel, with all its memory copies, can do. On a real H one hundred node, NCCL's benchmark shows a bus bandwidth of a few hundred gigabytes a second at large sizes. Same curve. Several hundred times higher.

B: And your ring versus gloo, who won?

A: Mine beat gloo at sixty-four megabytes, about a hundred two milliseconds against a hundred thirty-six, and lost at one megabyte, twenty-six against thirteen. The timings are noisy, and gloo picks its own algorithm, it's not tuned for this case. So don't read anything into the ranking. Read the shape.

B: And the correctness checks?

A: For D D P, the gradient differences come out around three times ten to the minus eight. I got two point nine eight times ten to the minus eight on all four ranks. That's float thirty-two rounding from adding in a different order, not any approximation in the method. F S D P, each rank's weight is sixty-four by two fifty-six out of two fifty-six by two fifty-six. Exactly a quarter, split along the rows. The pipeline's interesting, though. With one, four and sixteen micro-batches, my measured bubble was zero point eight, zero point five four, and zero point three two. The formula says zero point seven five, zero point four three, and zero point one six.

B: That's pretty far off at sixteen. Half.

A: It is. And the gap is each hop's send and receive overhead, about a millisecond on gloo, which the formula pretends is zero. The trend's the point, though. More micro-batches, smaller bubble. And real pipelines pay that hop cost too, which is one reason you don't use more stages than you need.

B: Okay. And the calculator, what did that say?

A: Same assumptions I just listed, no overlap, no activation memory yet. Pure data parallel, a thousand and twenty-four copies: compute's about three and a half seconds, the gradient exchange is five point six, so longer than the compute, and it needs eleven hundred twenty gigabytes per GPU, or two eighty-one even with ZeRO stage one. Doesn't fit, doesn't hide. Tensor parallel eight inside each box, data parallel one twenty-eight: no bubble, about two thirds of a second of tensor traffic, about seven tenths of a second of gradient exchange, and a hundred forty gigabytes per GPU, or thirty-six with ZeRO one. Add pipeline four on top: bubble about eight and a half percent, compute up to about three point eight seconds, gradient traffic down to under two tenths of a second, thirty-five gigabytes, or under ten with ZeRO. Pipeline eight: bubble about ten percent, gradient traffic eight hundredths of a second, eighteen gigabytes, or about five with ZeRO.

B: And the ones where you break the rules?

A: Tensor parallel sixteen is the tell. It spreads tensor parallelism across two boxes, and its traffic goes from about two thirds of a second to almost thirteen seconds. Twenty times worse. Basically the whole idea in one number. And the opposite mistake, tensor parallel two with sixteen pipeline stages: fits easily, but the bubble's almost thirty-two percent, so you lose a third of the cluster to waiting.

B: So the answer's tensor parallel eight, pipeline eight.

A: [relaxed, thinking out loud] That's where it gets interesting, because among the tensor-parallel-eight layouts there isn't one right answer. Eight with no pipeline, plus ZeRO one, has no bubble at all. On paper it wins. If that seven tenths of a second of gradient exchange really hides behind backward, and if the activations fit. Eight with four or eight pipeline stages pays a nine or ten percent bubble, but cuts each GPU's gradient traffic four to eight times, and leaves a lot of memory headroom. So now add activations. A standard estimate, from Korthikanti and colleagues again, is about thirty-four times the hidden size, in bytes, per token, per layer, in B F sixteen, without recomputing anything. So one four thousand and ninety-six token sequence through one layer is about one point one gigabytes. Tensor parallel eight with sequence parallelism divides that by eight. Multiply by how many layers sit on a stage, and by how many micro-batches a stage holds at once, which is up to the number of stages with one F one B. Check each layout against eighty gigabytes. Which one would you pick, and what would you measure first to find out if you were right? That's the one-page plan.

B: [working it out] With no pipeline, that's eighty layers on every GPU, so eighty times one point one over eight... about eleven gigabytes per sequence. That fits, right?

A: For one sequence in flight, about eleven, yeah. And that's exactly the check you'd run for each layout, times however many micro-batches it's holding at once. And then the bottom line. At about three point nine seconds a step and about four point two million tokens a step, fifteen trillion tokens is about three point six million steps. Which is about a hundred sixty days, at fifty percent utilization. The hundred eighty days from the start assumed forty. Make the calculator print that line too. A plan that doesn't say how many days it takes isn't a plan.

<!-- section: Break It -->

A: Now break it, four ways. First, deadlock the ring. Swap the non-blocking send for a blocking one, so every rank sends before it receives.

B: [confident] That just hangs immediately, right?

A: On small tensors it might actually still work, because gloo buffers small messages, so the send returns before anyone's received. On sixty-four megabytes it hangs forever. And real training jobs hang exactly like this when ranks disagree about which collective comes next. One rank skips a step because of some data-dependent if statement, and everyone else is sitting in an all-reduce it'll never join. The symptom is a job at zero percent GPU, with no error. Turning on PyTorch's distributed debug mode, set to detail, and NCCL's timeout are how you find it.

B: [sighs] Zero percent and no error. That's the worst kind.

A: It really is. Second, break the gradient equivalence. Change the loss to a sum instead of a mean. D D P still averages gradients across ranks, so now you get one quarter of the right gradient with four ranks. Then go back to mean, but give rank zero ten examples and the others eighteen. The average of the per-rank averages isn't the global average anymore, because the ranks aren't weighted equally.

B: [skeptical] But would you even notice that? Training would still work.

A: That's what makes it nasty. Both of these are real bugs people ship. The training runs, the loss goes down, and the model is quietly different from what you think you trained. Third, forget to seed the init. Take the seed out of the model constructor. If you do data parallelism by hand, just all-reducing the gradients yourself, the copies start from different weights and drift apart from step one. Then try it with D D P and it still matches. Because D D P broadcasts rank zero's weights when it's set up. So that broadcast, the boring first collective, is doing real work. And fourth, put tensor parallelism on the slow link. In the calculator, set it to sixteen or thirty-two. Watch tensor traffic jump from under a second to tens of seconds a step. Then change the between-node bandwidth to the Spark's twenty-five gigabytes a second, and then to home ten gigabit, one and a quarter, and see which layouts survive. That's the numbers version of "tensor parallelism stays inside the box".

<!-- section: Explain It Back: scaling up -->

B: Okay, so say you've got your layout on a thousand and twenty-four, and somebody gives you sixteen thousand GPUs instead. You just add more of everything?

A: You keep tensor eight and pipeline the same, and you grow data parallel by sixteen. So compute per step shrinks sixteen times. The data-parallel all-reduce time stays roughly flat, because the ring is flat in N. But here's the catch. Each data-parallel copy needs its own sequences. So either the global batch grows sixteen times, or you shrink each copy's share. And shrinking each copy's share means fewer micro-batches per pipeline, which makes the bubble worse.

B: And a bigger batch is... fine?

A: Up to a point. A bigger global batch has a ceiling before the model starts converging worse. So you either accept a larger batch, as far as it'll go, or you rebalance the pipeline. And failures go from a couple a day to one every few hours. Which brings it back to the useful metric for the whole thing, which is goodput. The fraction of wall-clock time that went into steps you actually kept. Not lost to restarts, not redone after a crash, not stalled behind a straggler.

<!-- section: Connections and close -->

A: If you want one thing to read, it's the infrastructure sections of the Llama three paper, the real layout, the failure table, what goes wrong at sixteen thousand GPUs. And Hugging Face's Ultra-Scale Playbook walks through every kind of parallelism with real benchmark numbers. And the natural next build is training a small language model end to end with D D P on the Spark, even two processes teach you the launch, the seeding and the checkpointing. Then turning "something fails every three hours" into a design doc someone can approve.

B: [working it out] Okay, let me try to say the whole thing. One GPU can't hold the training state or finish in time, so you split it three ways. Data parallel copies the model and averages gradients with the ring. Tensor parallel splits every matrix, pipeline splits the layers. And the more GPUs you add, the more each one has to talk, so you put the chatty ones on the fast cables.

A: [gently] Almost. Flip one piece. Adding GPUs doesn't make each one talk more. That's the whole point of the ring. Each GPU sends about two gradients' worth whether there are four of them or sixteen thousand. What actually decides the layout is how often and how blocking the talking is. Tensor parallelism talks four times a layer and the next layer can't start until it's done, so it gets NVLink, inside the box. Pipeline sends one small message per stage boundary, so it can cross boxes. Data parallelism talks once a step and hides behind backward, so it gets the slowest tier. ZeRO stops the copies from being copies. And then you assume something breaks every few hours, and you design for that from day one.
