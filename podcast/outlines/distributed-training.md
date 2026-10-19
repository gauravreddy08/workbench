# Outline: distributed-training

Source: src/lessons/distributed-training.mdx. Curriculum: "Training on many GPUs." How do you split a
model and its training across many GPUs?

## The one big idea

Training a big model means making a thousand GPUs behave like one enormous GPU. There are three ways
to cut the work (copy the model and split the examples, tear each matrix in half, or give each GPU a
slice of the layers), and each costs a different kind of talking. The whole art is matching the kind
of talking to the kind of cable: the chattiest split goes on the fastest wire inside a box, the
quietest goes across the slow network. And at that scale, something is always breaking.

## Opening scene

His cross-encoder trains fine on the Spark. Then someone hands him the real job: a seventy billion
weight model, an enormous pile of text, a thousand GPUs. Try the obvious thing in your head: put it
on one GPU. It doesn't fit by more than ten times. And if it did, it would take about five hundred
years.

## B's wrong mental model

"Distributed training is just splitting the batch: every GPU gets some examples, and something in the
middle averages the answers." Then, after the ring: "adding up across a thousand GPUs has to get
slower the more GPUs you add." (Not diagnostic quotes; natural first pictures the lesson corrects.)

## Story beats

1. The two walls: memory (the training state is many times the weights; the optimizer's notes are
   most of it) and time (centuries on one GPU). So the job is making many GPUs act as one.
2. Origin: AlexNet split by hand across two small GPUs; then parameter servers became a traffic jam.
   Baidu brought the ring all-reduce from supercomputing; then Megatron, GPipe and ZeRO, and every
   big model since combines them.
3. Talking: every GPU is its own program; they talk through group moves (collectives). The key one,
   all-reduce: everyone adds up, everyone gets the total. The ring: cut the vector into pieces, pass
   them around a circle; each GPU sends about twice its data no matter how many GPUs. B's "it must
   get slower" is corrected. The catch is the number of hops, each with a fixed toll.
4. Data parallelism: copy the model, split the examples, average gradients; exact, not approximate.
   Gradients ready from the last layer first, so sending starts while backward is still running.
   But for a huge model, every GPU holding a full copy is the waste.
5. ZeRO and FSDP: stop keeping a thousand identical copies. Split the optimizer notes, then
   gradients, then the weights themselves, fetching each layer's weights just in time. The split
   into "add up, then share" costs the same bytes as a plain all-reduce, which is why the first
   stages are free.
6. Tensor parallelism: tear each matrix down the middle; one sum at the end. But it talks constantly,
   in the middle of every layer, and nothing hides it. Only works on the fastest links.
7. The cables: inside a box, GPUs talk about ten times faster than to the next box. Pipeline
   parallelism, the assembly line, sends small messages and survives the slow network; its cost is
   the bubble, fixed by many small batches. The layout falls out: matrices torn inside a box,
   assembly line across boxes, copies outermost.
8. Failures: at Meta's scale, an unplanned failure every three hours or so, and one dead GPU stops
   everyone. Checkpoint, restart without a human, find the slow ones (the tail-latency problem
   again).
9. Build It insight: on the Mac, tiny messages took about as long as ones many times bigger; below
   some size you just pay the toll. That's why DDP bundles gradients into buckets.

## Numbers worth saying

- "More than ten times too big" and "about five hundred years" (the two walls).
- "About twice its data, no matter how many GPUs" (the ring).
- "About ten times faster inside a box than between boxes."
- "A failure every three hours or so."

## Left to the written lesson

The sixteen-bytes-per-weight breakdown; the training compute arithmetic; the five collectives
individually; the ring cost formula and bus bandwidth; the Megatron column and row split algebra; the
cable table and link speeds; the bubble formula and micro-batch counts; GPipe vs 1F1B scheduling;
sequence and context parallelism; Llama three's exact layout; checkpoint interval rule; all code,
the step-time calculator and its table; Break It specifics.
