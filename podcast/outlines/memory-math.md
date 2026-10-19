# Outline: memory-math (story-first)

Source: src/lessons/memory-math.mdx. Curriculum: "How much memory does a model need?" How much memory
do the weights, the KV cache and activations take, and how many users fit?

## The one big idea

A running model is a kitchen: equipment bolted to the floor (the weights, loaded once, shared by
everyone) and a tray per table (the KV cache, private, growing with every word of every
conversation), plus a brief burst of counter space while a dish is plated and the space you can
never use. The weights decide whether a model runs at all; the cache decides how many people and
how long, and with long chats or many users it quickly becomes the bigger one. On the Spark the
kitchen is the whole computer.

## Opening scene

The diagnostic question: "how much memory does an eight billion model need?" He shrugged; the common
wrong answer is eight gigabytes. Then the shared-assistant scene: vLLM boots and says "maximum
concurrency twenty-four times". Where did that come from? A seventy billion model at long context
says two. A colleague's notebook on the same box gets killed.

## Wrong mental model B voices

"Eight gigabytes, one byte per parameter" (from his diagnostic). Later: "four-bit means four bits",
"if the numbers say there's room, it fits", "ninety percent of the GPU is fine, it's the default".

## Story beats

1. The question and the shrug; the vLLM line that looks like magic.
2. Origin: Shazeer, "One Write-Head is All You Need". Every attention head kept its own copy of
   the past; let them share. Too aggressive, so the middle ground, grouped heads. Memory changed the
   architecture; you can see it as an oddly small piece in the parameter count and a quarter-size
   cache.
3. The four buckets: kitchen equipment, trays, counter burst, walkways. Only one grows.
4. Weights: count from the small settings file; most of the model is the feed-forward part; the
   vocabulary tables are surprisingly big; one flag (sharing the input and output table) is worth a
   gigabyte. Bytes per number: two for the usual format; squeezed formats store little scale
   numbers alongside, so "four-bit" is never four. File size on disk is the honest estimate.
5. The cache: per word, every layer keeps a key and a value; only the shared heads count. One user
   at a very long context outweighs the whole model. Cache size follows the attention shape, not
   the parameter count (the big sparse model has a smaller cache per word than the eight billion).
6. The spikes and the stuff nobody asked for: reading a long prompt briefly needs a burst; asking
   for scores at every position or textbook attention makes it huge. PyTorch keeps freed memory
   for reuse, so "free" depends on who you ask; pieces the wrong shape is fragmentation.
7. The Spark: one pool for CPU and GPU. Overshoot and you don't get a polite error, you get Linux
   killing programs. vLLM grabs its share up front and carves it into blocks, which is where the
   "twenty-four" comes from; on the Spark its default is a claim on the whole computer.
8. Fitting isn't the same as being served well: capacity says who's in the room, bandwidth says how
   fast the room moves.

## Numbers worth saying

- Eight gigabytes (the wrong answer) vs about sixteen (two bytes each).
- A quarter: the cache discount from shared heads.
- vLLM's "twenty-four times".

## Left to the written lesson

config.json fields, the matrix-by-matrix count to the exact parameter, the Qwen predict, GB vs GiB,
every format's bits per weight, the Q8 block layout, AWQ and K-quant detail, the KV formula and
table, the seventy billion predict, activation sizes, the logits and N-squared numbers, CUDA context,
allocated vs reserved counters, nvidia-smi on unified memory, vLLM's startup steps, the budget figure,
all code, probe, edge search, Measure tables, Break It, Explain It Back.
