<!-- section: The Problem -->

A: [relaxed, thinking out loud] So there was this question in the diagnostic. How much memory does an eight billion parameter model need? Just that. No trick. And I want to hear your gut answer before we do anything.

B: [a bit unsure] Honestly? Eight gigs. Eight billion parameters, a byte each... eight gigs. Maybe a bit more for, I don't know, stuff.

A: [amused] That's the answer most people give. And it's wrong in two directions at once, which is kind of impressive. The bytes per parameter are wrong, and the "bit more for stuff" is hiding the thing that actually decides how many people you can serve.

B: [laughs] Okay. Two directions. Go.

A: Let me make it real first. Say your team wants to use the Spark as a shared assistant. Llama three point one, the eight B model. Long chats, thirty-two thousand tokens of context for each person. You start V L L M, it thinks for a minute, and then it prints a line that says something like, maximum concurrency for thirty-two thousand seven hundred sixty-eight tokens per request: twenty-four x. Twenty-four. Is that good? Is it right? Where did twenty-four come from? Then you restart it with the seventy B model, squeezed into four bits, at a hundred twenty-eight thousand tokens of context, and it says something like two x. And then a colleague runs a notebook on the same box... and something gets killed.

B: Killed, like, the process just dies?

A: Like the operating system picks something and shoots it. We'll get there. The point is, every one of those numbers, the twenty-four, the two, the thing getting killed, comes out of a few lines of arithmetic. And by the end of this you'll do that arithmetic faster than V L L M boots.

<!-- section: The Problem: first prediction -->

A: So let's start with a smaller version. Same eight B model, stored in B F sixteen, which is two bytes per number. One user. Eight thousand tokens of context, eight thousand one hundred ninety-two to be exact. How much memory, total?

B: [working it out] Okay, two bytes now, not one. So sixteen gigs? Sixteen and change.

A: That's the weights. And honestly that's already most of it for one user. Eight point oh three billion parameters, times two bytes, is sixteen point one gigabytes. Which, and we'll get to why this matters in a second, is fifteen point oh of the binary kind of gigabyte. Then there's the K V cache. Quick reminder of what that is: when the model generates, every layer keeps the key and value vectors for every token it's already seen, so it doesn't have to recompute them on each new token. That's the cache. For this model it's a hundred twenty-eight kibibytes per token. Eight thousand one hundred ninety-two tokens of that is exactly one gig. And then one or two gigs of what I'll call overhead. The runtime, scratch space, the temporary stuff during the forward pass. So for one user, about seventeen to eighteen gigs.

B: So the cache is... small. One gig next to fifteen.

A: For one user at eight K, yeah. The weights are the big fixed cost. Now the second half. The Spark has a hundred twenty-eight gigs. How many users fit at thirty-two thousand tokens each?

B: Thirty-two K is four times eight K, so four gigs each. A hundred twenty-eight minus fifteen... that's like a hundred thirteen, divided by four... twenty-eight?

A: [gently] Close, but you gave the whole machine to the model. The Spark runs an operating system out of that same memory. Call it ten gigs for now, it's an assumption you'll replace with a measurement. Then the weights, then the overhead, and you're left with roughly a hundred. Divide by four. About twenty-five users.

B: Oh, and V L L M said twenty-four.

A: [amused] Funny how that works. We'll see exactly where its twenty-four comes from. One caveat right away, though. Twenty-five users fitting doesn't mean twenty-five users getting a usable speed. That's a different question, and on the Spark it's actually the one that bites first, because every decode step has to read all of the weights and all of the caches through the memory bus. Today is the other half. Capacity. Who fits in the room at all.

<!-- section: Origin -->

A: And there's a story behind why that cache number is a hundred twenty-eight K and not something much bigger. Twenty nineteen. Noam Shazeer, one of the authors of the original transformer paper, puts out this short note with a kind of cheeky title. "Fast Transformer Decoding: One Write-Head is All You Need." And his complaint was, during generation, the keys and values you store for every past token are eating memory, and memory bandwidth. And most of that cost comes from every attention head keeping its own private copy.

B: Every head has its own keys and values.

A: [emphatic] Right, in the original design, yeah. Thirty-two heads, thirty-two sets of keys, thirty-two sets of values, for every token, in every layer. So his fix was, okay, what if all the query heads share one single key head and one single value head? He called it multi-query attention. The cache shrinks by the number of heads. Thirty-two times smaller.

B: That sounds like it'd hurt quality.

A: [laughs] It did, for some models. Too aggressive. So in twenty twenty-three, Joshua Ainslie and colleagues at Google proposed the middle ground. Grouped-query attention. G Q A. Instead of one shared key and value head, you have a few, and each one is shared by a group of query heads. Llama two's seventy B model adopted it that same year, and by Llama three, every size used it. And you're going to see this decision twice today. Once as a weird asymmetry when we count the parameters. And once as a four times discount on the cache. Memory was literally the reason the architecture changed.

<!-- section: The Idea: four buckets -->

A: So. Where does memory actually go when you're serving a model? Four places. And it helps to think of a kitchen for exactly one second. There's equipment bolted to the floor, which is the same whether you serve one table or forty. There's each table's tray of food in progress, which grows with tables. There's a burst of counter space while a dish is plated. And there's floor you can never use. That's it, that's the whole comparison. Now the real thing.

A: Bucket one, the weights. The model itself. Loaded once, shared by every single user. Its size is the number of parameters times the bytes per parameter. Bucket two, the K V cache. That's each user's private store, and it grows with every token of every conversation. Its size is bytes per token, times context length, times users. Bucket three, activations. The temporary numbers inside one forward pass. The vector flowing through a layer, the wide intermediate in the MLP, the scores at the very end. They're freed as soon as the layer's done. Tiny during decoding, a short spike during prefill, when the whole prompt goes through at once. And bucket four, overhead. Memory that's in use but holds none of the above. The CUDA runtime's own setup, library scratch space, memory the allocator is holding but not using. And on the Spark... the whole operating system.

B: The whole O S counts as overhead?

A: On the Spark, yeah, because it's all one pool. Picture a single long bar, a hundred twenty-eight gigs, shared by the CPU and the GPU. On the far left, a dashed sliver for the O S and the desktop and whatever CPU processes are running. Then a solid block, fifteen gigs, for the weights. Then a lighter block, eight gigs, for the cache, if you've got eight users at eight K each. Then a thin sliver of overhead. And then the rest of the bar, about ninety-three gigs, is just free. And the thing to notice is that only one of those blocks grows when you add users or make conversations longer. The cache. Everything else is fixed, or close to it. The free space is where more users, or longer chats, would go.

B: [working it out] So the question "how many users" is just... free space divided by one user's cache.

A: That's the whole lesson in one sentence. Users that fit equals what's left after you subtract the O S, the weights, the overhead and the activation peak, divided by one user's cache, which is the cache bytes per token times the context. With the numbers we just used: a hundred twenty-eight, minus ten, minus fifteen, minus a couple, leaves about a hundred. Divide by four gigs per user at thirty-two K. Twenty-five. Everything else today is making each of those terms honest.

<!-- section: The Idea: GB vs GiB -->

A: [matter-of-fact] One unit trap first, because otherwise it eats about seven percent of every answer you give. A gigabyte, G B, is a billion bytes. Exactly a billion. That's what disk makers use, it's what Hugging Face shows for file sizes, it's network speeds. A gibibyte, G I B, is two to the thirtieth bytes, which is about one point oh seven billion. About seven percent bigger.

B: Why would anyone use the weird one?

A: Because memory chips come in powers of two. So RAM and GPU memory are really sized in the binary unit, and PyTorch reports in it, and nvidia S M I prints mebibytes. So the eight B model in B F sixteen is sixteen point oh six gigabytes and also fourteen point nine six gibibytes. Both are right. They're the same bytes. But when you're comparing against what a machine holds, work in the binary one. And the cache formula is naturally binary anyway. A hundred twenty-eight K per token, so eight thousand one hundred ninety-two tokens is exactly one gig, no rounding. So from here on, when I say "gigs" about memory, I mean the binary kind. When I'm talking about a file on disk, I'll say it's a file size.

<!-- section: The Idea: counting parameters -->

A: Okay. Counting. Every model on Hugging Face ships a config dot json. It's about a dozen numbers, and those numbers completely determine the shape of every weight matrix in the model. For Llama three point one eight B, the ones that matter: the vocabulary is a hundred twenty-eight thousand two hundred fifty-six tokens. The hidden size, the width of the vector flowing through the model, is four thousand ninety-six. The MLP's intermediate size is fourteen thousand three hundred thirty-six. Thirty-two layers. Thirty-two attention heads. Eight key value heads. Each head is a hundred twenty-eight numbers wide. And a flag called tie word embeddings, set to false. Hold onto that one.

B: And you can get to eight billion from just those?

A: [confident] To the exact parameter. And you've written this model, you built Llama from scratch, so you know every piece. The only job is to say how big each piece is. Start at the bottom. The embedding table. One row of four thousand ninety-six numbers for every token in the vocabulary. A hundred twenty-eight thousand times four thousand. That comes to five hundred twenty-five million parameters.

B: [surprised] Half a billion. Before the first layer even starts.

A: Before the first layer. Surprises everyone the first time. Now one layer's attention. Four projection matrices. The query projection takes the four thousand ninety-six wide input and maps it to thirty-two heads times a hundred twenty-eight, which is also four thousand ninety-six. So that's a square matrix, about sixteen point eight million. Now the keys and values. And here's Shazeer. Because of G Q A, there are only eight key value heads, not thirty-two. So the key projection maps four thousand ninety-six down to eight times a hundred twenty-eight, which is one thousand twenty-four. A quarter the size. Four point two million. Same for values. Then the output projection maps the thirty-two heads back to four thousand ninety-six, another sixteen point eight million. Add them up, about forty-two million per layer for attention. Forty-one million nine hundred forty-three thousand and change, exactly.

B: So K and V being a quarter of Q... that's literally the G Q A thing.

A: [pleased] That's G Q A, sitting right there in your parameter count. Each key value head is shared by a group of four query heads, so you only need a quarter as many key and value outputs. Now the MLP. Llama uses something called swi-glue. S W I G L U. Instead of the old two-matrix MLP, it has three. A gate projection and an up projection run side by side. The gate goes through a smooth activation function, SiLU, and then multiplies the up projection's output, element by element. Then a down projection maps it back to the hidden size. It's more expressive per parameter than the old version.

B: Three, not two. So each of those is four thousand by fourteen thousand?

A: Each one is four thousand ninety-six by fourteen thousand three hundred thirty-six, yeah. Three of them. A hundred seventy-six million per layer. So the MLP is about four times the size of attention. That's where most of an LLM's parameters actually live.

A: Then the norms. Each layer has two RMSNorms, one before attention and one before the MLP. An RMSNorm divides each vector by its root mean square, basically its typical size, and then multiplies by a learned scale, one number per hidden dimension, no bias. So that's four thousand ninety-six each, eight thousand one hundred ninety-two per layer. And one more norm after the very last layer. It's rounding error. But count them anyway, because that's how you get an exact match instead of "roughly eight billion".

A: And last, the output head. The thing that turns the final vector back into a score for every token in the vocabulary. That's the same shape as the embedding table, another five hundred twenty-five million. Unless... tie word embeddings is true. Then the model just reuses the embedding table for the output, and the head costs zero.

B: And for the eight B it's false.

A: False, so it's a separate matrix. For Llama three point two, the one B model, it's true, so it's shared. That one flag is worth five hundred twenty-five million parameters. A gig in B F sixteen. Always read it.

A: [relaxed] Now picture that as a diagram. A list of matrices top to bottom, each with a little bar drawn to scale. Inside a box marked "times thirty-two layers", you see three long bars, the MLP's gate, up and down. Two medium bars, the query and output projections. Two stubby little bars, keys and values. And two norms so small they don't get a bar. And outside the box, the embedding and the output head, each worth about nine of those long MLP bars. So you add it up. One layer is about two hundred eighteen million. Thirty-two layers, about six point nine eight billion. Embedding plus head, one point oh five billion. Plus the final norm. Total: eight billion, thirty million, two hundred sixty-one thousand, two hundred forty-eight.

B: That's... exact? Like, that's the real number?

A: [confident] That's the real number. I checked it against the transformers library itself. You can build the model on PyTorch's meta device, which creates all the tensor shapes without actually allocating any memory, and add up how many elements each parameter has. It matches to the parameter. Same method gives one point two three six billion for the tied one B model, and seventy point five five billion for the seventy B. And you'll write the counter yourself in a bit.

A: Two useful things fall out of this. One, the proportions. The MLP is seventy percent of the model. Attention seventeen. Embedding and head, thirteen. Two, a shortcut you can do in your head in an interview. Per layer, attention is roughly two and a half times the hidden size squared, for this family, and the MLP is three times hidden times intermediate. So for the eight B: hidden squared is about sixteen point eight million, two and a half of those is forty-two million. MLP's a hundred seventy-six million. Together about two hundred eighteen million. Times thirty-two layers, call it seven billion. Plus the one point oh five billion of vocabulary matrices. Eight.

<!-- section: The Idea: Qwen prediction -->

A: Try one. Qwen two point five, the seven B. Vocabulary a hundred fifty-two thousand sixty-four. Hidden size three thousand five hundred eighty-four. Intermediate eighteen thousand nine hundred forty-four. Twenty-eight layers, twenty-eight attention heads, four key value heads, head not tied. And one difference from Llama: its query, key and value projections each have a bias, one extra number per output. How many parameters?

B: [working it out] Okay, the config doesn't give the head width, so... three thousand five hundred eighty-four divided by twenty-eight heads. That's a hundred twenty-eight. And four K V heads, so keys and values map down to five hundred twelve.

A: [pleased] Good, that's the step people miss. From there it's the same walk. Attention weights come to about twenty-nine point four million per layer. The biases add just four thousand six hundred eight, that's the query's three thousand five hundred eighty-four plus five hundred twelve plus five hundred twelve. The MLP is three times three thousand five hundred eighty-four times eighteen thousand nine hundred forty-four, about two hundred four million. Per layer, about two hundred thirty-three million. Times twenty-eight, six point five three billion. The embedding and head together are about one point oh nine billion. Total, seven billion, six hundred fifteen million, six hundred sixteen thousand, five hundred twelve. Matches transformers exactly.

B: And the biases, in total?

A: A hundred twenty-nine thousand and twenty-four parameters in the whole model. You'd never notice them in "about seven point six billion". And that's the point of counting exactly. If your counter comes out short by exactly a hundred twenty-nine thousand and twenty-four, you know precisely what you forgot.

A: So the recipe, if someone hands you a config in an interview. Embedding is vocab times hidden. Each layer: a query projection, hidden by heads times head width. Keys and values, hidden by K V heads times head width, smaller with G Q A. An output projection the same size as the query. Three MLP matrices of hidden by intermediate. Two norms of size hidden. Multiply by layers. Add a final norm, and if the embeddings aren't tied, an output head the size of the embedding. Then check the family's quirks: biases, extra norms, experts. And check your total against the checkpoint's size on disk.

<!-- section: The Idea: bytes per parameter -->

A: Now, bytes. Weights in memory are parameters times bytes per parameter, and the bytes depend on the format. F P thirty-two, thirty-two-bit floating point, is four bytes a number. Eight B model, thirty-two point one gigabytes. Almost nobody serves in that anymore. B F sixteen or F P sixteen, two bytes, sixteen point one gigabytes. That's what most checkpoints ship as. Why it's B F sixteen and not F P sixteen is its own lesson on number formats, so I'll leave that.

A: Then F P eight. An eight-bit float, one byte per number, with a scale factor per tensor or per channel so that the tiny range still covers the weights. One byte for the layers. But the popular F P eight checkpoints usually leave the embedding and the output head in B F sixteen. So an eight B F P eight file is about nine point one gigabytes, not eight.

B: [skeptical] Okay, but then four-bit is just... a quarter of B F sixteen? So four gigs for the eight B?

A: [gently] That's the natural guess. And it's never quite true. Think about what four bits means. Sixteen possible values. You can't just round a weight to one of sixteen values without some sense of scale. Is this matrix's range minus one to one, or minus a thousandth to a thousandth? So these integer formats chop each matrix into small blocks, and store one or two scale numbers per block, right next to the tiny integers. And those scales are real bytes. That's why "four-bit" is never four point oh bits.

A: The cleanest example is from llama dot c p p. Its file format is called G G U F, one single file that holds the weights, in whatever quantized type, plus the tokenizer and the config. One of its types is Q eight zero. Picture a row of thirty-two little cells, each one a signed eight-bit integer, one byte each. And then stuck on the end, one slightly bigger cell, a sixteen-bit scale. Two bytes. The real weight is roughly the integer times that scale, and the scale is shared by those thirty-two neighbors. So that's thirty-four bytes for thirty-two weights. Eight and a half bits per weight.

B: So even the "eight-bit" one is eight and a half.

A: Eight and a half. Now the four-bit ones. A W Q, which stands for activation-aware weight quantization, from Lin and colleagues in twenty twenty-three. It stores the layer weights as four-bit integers in groups of a hundred twenty-eight, and each group gets a sixteen-bit scale and a four-bit zero point. And the clever part is it picks those scales so that the weights that matter most for real activations lose the least. So: twenty extra bits for every hundred twenty-eight weights. That's about four point one six bits per layer weight. But, again, the embedding and the output head usually stay in sixteen bit. So for the eight B: one point oh five billion parameters at two bytes, that's two point one gigabytes. Plus six point nine eight billion at four point one six bits, about three point six. Total about five point seven gigabytes. Which is what the published A W Q files of this model actually weigh.

B: [surprised] So the "four-bit model" is really...

A: Five point seven bits per weight, on average. Yeah. And then the one you'll see everywhere in G G U F land, Q four K M. It uses what they call K-quants. Super-blocks of two hundred fifty-six weights, split into eight sub-blocks of thirty-two, and each sub-block has its own six-bit scale and minimum. The basic four-bit K type works out to four and a half bits per weight. And the M mix keeps some of the most sensitive tensors, parts of the value and down projections, and the output head, in a six-bit type. So the average across the file lands around four point eight to four point nine bits. An eight B file is about four point nine gigabytes.

A: So if you line up the eight B in every format, it's a staircase going down. Thirty-two point one gigabytes in F P thirty-two. Sixteen point one in B F sixteen. About nine point one in F P eight. About eight and a half in Q eight zero. About five point seven in A W Q. About four point nine in Q four K M. And not one of the four-bit ones is at four.

A: And the general rule that saves you from memorizing all of this: the file size on disk is a very good estimate of weight memory. Almost every byte of a safetensors or G G U F file is weight. So when you don't know a format's insides, just list the file, see how big it is, and divide by the parameter count. That's its true bits per weight.

<!-- section: The Idea: the KV cache -->

A: Okay. Now the main event. The K V cache. You met the formula in the bandwidth lesson. Bytes per token is: two, for key and value, times the number of layers, times the number of K V heads, times the head width, times bytes per number. For the eight B in B F sixteen: two, times thirty-two layers, is sixty-four. Times eight K V heads, five hundred twelve. Times a hundred twenty-eight, sixty-five thousand five hundred thirty-six. Times two bytes, a hundred thirty-one thousand and seventy-two bytes. Which is exactly a hundred twenty-eight K.

B: Why only the K V heads, though? There are thirty-two query heads. Don't you need those too?

A: [thinking out loud] That's the key one, actually. Queries are recomputed from the current token every step. The new token makes its own query, it looks at all the stored keys, and then it's done. Nobody ever needs an old token's query again. So they're never stored. Keys and values, on the other hand, every future token has to look back at. So those get kept. And that's exactly why G Q A's eight-instead-of-thirty-two is a four times discount on memory. With thirty-two K V heads, this cache would be half a meg per token.

A: And once you have the per-token number, everything is just multiplication. Llama three point two one B: sixteen layers, eight K V heads, sixty-four wide. Thirty-two K per token. Llama three point one eight B: a hundred twenty-eight K. Qwen three thirty B A three B, which is a mixture of experts model: forty-eight layers, but only four K V heads. Ninety-six K per token. Llama three point one seventy B: eighty layers, eight K V heads. Three hundred twenty K per token.

B: So for the seventy B at eight K, that's...

A: Two and a half gigs for one request. And three things in those numbers are worth noticing. One: the seventy B with thirty-two users at eight K each is eighty gigs of cache. The cache alone would fill an H one hundred. Two: the eight B at a hundred twenty-eight thousand tokens of context is sixteen gigs for one user. One user's cache weighs more than the entire model.

B: More than the model. One person.

A: One person, one long conversation. And three, the mixture of experts one. Thirty billion parameters, but its cache per token is smaller than the eight B's, because it has only four K V heads. So cache size depends on the shape of attention, not on how many parameters the model has. And it's all straight lines. Double the context, the cache doubles. Double the users, it doubles again.

B: [working it out] Okay, so the cache doesn't care about the MLP at all. Which is seventy percent of the model.

A: Doesn't care at all. Two practical knobs, then. First, store the cache in F P eight instead of B F sixteen, and every one of those numbers halves. Most serving engines make that one flag, with some accuracy cost you'd want to measure. Second, "context" means the whole conversation so far. The prompt plus everything generated. So a request that's allowed eight K tokens grows toward that over its life. And a serving engine has to decide: do I reserve the worst case up front, or allocate as it goes? That decision is basically what paged attention is about, and that's its own lesson.

<!-- section: The Idea: seventy B prediction -->

A: So, try this. The seventy B in Q four K M, about forty-three gigabytes on disk. On the Spark. Ten users, thirty-two K context each. Does it fit? And if not, what's the cheapest fix?

B: Forty-three gigs of weights, plenty of room... if it doesn't fit, I'd quantize harder. Go down to three bits or something.

A: [working it out] Let's actually do it. Forty-three gigabytes is about forty gibibytes. Cache per user: thirty-two thousand seven hundred sixty-eight tokens times three hundred twenty K. That's ten gigs. Per user. Ten users, a hundred gigs. So forty plus a hundred, plus a couple for overhead, plus about ten for the O S. About a hundred fifty-two. On a hundred twenty-eight.

B: [sighs] Twenty-four over.

A: About twenty-four over, yeah. And notice, squeezing the weights harder barely helps. Even if you got them down to thirty gigs you'd still be way over. At this context the cache is most of the memory. The cheapest fix is an F P eight cache. Five gigs per user, fifty for ten. Total about a hundred two. Fits. Or cut the context to sixteen K, same effect. Or serve seven people instead of ten.

<!-- section: The Idea: activations -->

A: Now bucket three. Activations. During a forward pass, each layer produces temporary tensors. The normalized input, the queries, keys and values, the attention output, and the MLP's wide intermediates. In training you keep all of those around, because the backward pass needs them. But at inference, nobody needs them once the next layer has used them. So PyTorch frees them right away. Only one layer's worth is alive at any moment.

A: So in decode, where each step processes one new token per user, the biggest temporaries are the gate and up projections, fourteen thousand three hundred thirty-six numbers each. Everything alive in one layer is roughly a hundred twenty kilobytes per token. Times sixty-four users, under eight megabytes. Noise.

B: So activations are basically nothing.

A: [jumping in] In decode. Prefill is different. In prefill you push the whole prompt through at once, so every temporary is as many rows tall as the prompt is long. At eight K tokens, the MLP alone briefly holds about seven tenths of a gigabyte, and the full set is about one. And yeah, it only lasts milliseconds. But it's the peak that has to fit, not the average. If the peak doesn't fit, you crash, even if it would've been gone a millisecond later.

A: And two things make that peak way worse if you're careless. The first: computing logits for every position. The output head turns each token's vector into a hundred twenty-eight thousand two hundred fifty-six scores. If you run the model on a thirty-two K prompt and ask for scores at every position, that's about eight point four gigabytes of scores. Of which you need exactly one row. The last one.

B: [surprised] Eight gigs for one row you actually use.

A: Per token it's about two hundred fifty kilobytes. Twice the K V cache. Hugging Face's generate function avoids it by asking only for the last position. It passes an argument called logits to keep, set to one. I checked that in the source of a current transformers five release. But if you just call the model directly on your input, it doesn't do that for you.

A: The second: textbook attention. The version you probably wrote first builds the full grid of scores, every token against every other token, for every head. At sixteen K tokens with thirty-two heads in B F sixteen, that grid is sixteen gigs. For one layer. Before softmax makes a thirty-two-bit copy of it. The fused kernels, PyTorch's scaled dot product attention, FlashAttention, never build that grid at all. So their memory grows with the length, not with the length squared. That's the FlashAttention lesson.

A: And real engines cap the peak on purpose. V L L M, for example, splits long prompts into chunks and never pushes more than a set number of tokens through the model in one forward pass. That setting's called max num batched tokens. So the spike has a known size no matter how long the prompt is.

<!-- section: The Idea: overhead -->

A: Bucket four. Overhead. This is the one that makes careful predictions wrong by a gig or three, so it's worth knowing its pieces. First piece: the CUDA context. The first time a process touches the GPU, the CUDA driver sets up its state. It loads GPU code for every kernel library you're linked against, and PyTorch ships a lot of them, plus internal tables, scratch areas. And that memory belongs to the driver, not to PyTorch. So PyTorch's own counters never show it. On discrete GPUs it's typically a few hundred megabytes up to around a gig per process, depending on versions and on whether the driver loads kernel code lazily. And it's per process. Two Python processes using the GPU, you pay it twice.

A: Second piece, the caching allocator. Asking the CUDA driver for memory, and handing it back, is slow, and it forces the GPU to stop and synchronize. So PyTorch doesn't do that every time. When a tensor is freed, PyTorch keeps that block in its own pool, so the next tensor of a similar size gets it instantly. And that gives you two numbers you'll see constantly. Memory allocated, which is the bytes held by tensors that are alive right now. And memory reserved, which is everything PyTorch has taken from the driver, including the free blocks it's hanging onto. Reserved is always at least allocated.

B: [skeptical] So the gap between them is just... wasted?

A: [carefully] It's free to PyTorch. Not to anyone else. Which is fine, until the free blocks are the wrong shape. Say you need a three hundred megabyte tensor, and the pool has ten free holes of a hundred megabytes each. That's a gig free in total. But no single hole is big enough, so PyTorch has to go ask the driver for more. That's called fragmentation. Enough free memory in total, no single piece big enough. And it's why you can get "out of memory" when the numbers say there should be room.

A: And the worst case for fragmentation is a tensor that grows by gluing things on. Which is exactly what Hugging Face's default cache does. It's called the dynamic cache, and for every new token it concatenates the new keys and values onto the old ones. Which means allocating a slightly bigger tensor and freeing the old one. Every step. In every layer.

A: I watched this happen on my Mac's GPU backend, which has the same design. I allocated a two hundred fifty-six mebibyte tensor, and the driver ended up holding a thousand twenty-four. It reserves in big chunks. Then I deleted the tensor. Live tensors, zero. Held by the driver, still a thousand twenty-four. Only calling empty cache gave it back. On CUDA it's the same function name, same job. And you'll see the CUDA version of this on the Spark.

A: And then everything else. Scratch space for the matrix multiply library. Communication buffers if you use several GPUs. And in serving engines, memory captured by CUDA graphs, which are pre-recorded sequences of kernel launches that cut out Python overhead, and each one has its own fixed buffers. All in, budget about one to three gigs for a single-GPU server. And then measure.

A: [relaxed, thinking out loud] Here's a way to picture all of this over the life of one request. Time going left to right, memory going up, and two lines. A solid one for what's allocated, a dashed one for what PyTorch has reserved. At the very bottom, a thin strip that never moves: the CUDA context, sitting outside PyTorch's counters entirely. Then both lines climb together as the weights load, up to fifteen gigs. Then you send a thirty-two K prompt, and there's a spike, up to around twenty-two, while prefill runs. Then the solid line drops back down, but not all the way. It settles four gigs above the weights, because that's the cache you're keeping, and it creeps up a hundred twenty-eight K with every token generated. And the dashed line? It went up to the spike, and it just... stays there.

B: Even after the spike's gone.

A: Even after. And when the request finishes and the cache is freed, the solid line drops back to fifteen, and the dashed line is still up at twenty-two. Reserved never comes down on its own. It's just a sketch, not a measurement, but that's the shape you'll see.

<!-- section: The Idea: the Spark is one pool -->

A: Now, the Spark specifically. On an H one hundred, or a forty ninety, the GPU's memory is its own. The operating system, your browser, the CPU side of your Python process, they all live in separate system RAM. If the card has eighty gigs, the eighty gigs is yours.

A: The Spark doesn't have separate GPU memory. Like we saw with virtual memory, its hundred twenty-eight gigs is one pool shared by the CPU and the GPU. Unified memory. So the budget gets a new line at the very top. The O S, the desktop if one's running, every CPU process, and the page cache, which is file data the kernel keeps in memory in case you read it again, all of it comes out of the same hundred twenty-eight. Some of that's reclaimable. The kernel will drop cached file pages under pressure. Some isn't.

B: And that's the notebook getting killed.

A: That's the notebook. The failure mode is different. On a discrete card, running out gives you a polite Python exception. Out of memory, here's a stack trace. On the Spark, the pressure lands on the whole machine. So you might meet the kernel's O O M killer instead, the part of Linux that, when memory runs out, picks a process and kills it to save the rest. Or you get a frozen desktop while the system thrashes, shuffling memory around trying to survive.

A: And it changes how you measure. Tools built for discrete GPUs may not know what to say. On unified memory, nvidia S M I's memory columns can read "Not Supported", or show something you don't expect. So check what yours prints, and don't trust it blindly. The honest "how much can I still use" number comes from Linux. The "available" column in free, or the line called MemAvailable in proc meminfo. PyTorch also has a function that asks the CUDA driver how much is free, and you should compare the two on your machine. Because on unified memory, the driver's idea of free might not count file cache the kernel would happily drop.

<!-- section: The Idea: serving engines take it all up front -->

A: Which brings us back to V L L M. A serving engine can't just allocate cache one request at a time, gluing tensors together, and hope. It'd fragment. And worse, it'd discover it was out of memory in the middle of somebody's answer. So engines like V L L M grab the cache's memory once, at startup, and hand out fixed-size pieces of it.

B: [skeptical] See, this always bugged me. You start V L L M with nothing running and it's already using ninety percent of the GPU. That feels like it's just... hogging memory it doesn't need.

A: [firmly] It looks that way. But it's the opposite of waste, it's a plan. Here's roughly what it does, and the details move between versions, so check the docs for yours. One. There's a setting called G P U memory utilization, default point nine. That's the fraction of the GPU's total memory this instance may use, for everything, weights included. So the budget is ninety percent of total. Two. It loads the weights. Three. It runs a fake forward pass at the biggest size it'll ever run, that max num batched tokens number, and it records the peak activation memory, plus whatever non-PyTorch memory has shown up. Four. Whatever's left of the budget becomes the K V cache pool, cut into blocks of a few tokens each. And it logs how big that pool is in tokens, and the maximum concurrency that implies, which is just the pool's tokens divided by the max context you allowed.

B: So that's the twenty-four.

A: That's the twenty-four. Picture two bars. The top one's an H one hundred, eighty gigs. Fifteen gigs of weights on the left, a thin sliver for activations and runtime, then a big K V pool of about fifty-four gigs, which is about four hundred forty thousand tokens. And then a line at ninety percent, and past it, ten percent that just sits unused. That's about fifty-four users at eight K, or about thirteen at thirty-two K. The bottom bar is the Spark. Same fifteen of weights, same sliver, and then a pool of about ninety-eight gigs. Ninety-eight divided by four gigs per thirty-two K user is twenty-four and a half. Round down. Twenty-four.

B: [working it out] Okay, so it's not guessing. It's dividing.

A: It's dividing the pool it carved by the context you allowed. And now look at the last ten percent on the Spark bar. On the H one hundred, that ten percent was dead space. On the Spark, it's about thirteen gigs, and it has to hold the operating system, your shell, your colleague's notebook, and the page cache. All of it.

B: And so the notebook loads a model and there's nowhere to put it.

A: Right. On the Spark, G P U memory utilization doesn't mean "how much of the GPU". It means "how much of the whole computer". NVIDIA has DGX Spark playbooks that show the settings they test with, so look there before choosing yours, and leave real headroom. Newer V L L M versions also let you give the cache size directly in bytes instead of as a fraction. Check the serve command's help for what your version supports.

<!-- section: The Idea: putting it together -->

A: So now picture playing with all of it at once. There's an interactive version: you pick a model, a weight format, whether the cache is B F sixteen or F P eight, and you drag two sliders, context and users. And you get three bars, one per machine, each drawn to its own capacity. The Spark, with its first ten gigs set aside for the O S as an assumption. An H one hundred. And a forty ninety, a twenty-four gig consumer card. Overhead is a gig and a half of runtime plus a computed activation peak for an eight K prefill chunk.

A: With the defaults, the eight B in B F sixteen, eight K context, eight users: the Spark and the H one hundred have tons of room. About a hundred users and about sixty-two at this context. The forty ninety misses by about a gig and a half. It tops out at six. So a twenty-four gig card is basically a weights-plus-a-few-chats machine.

A: Drag the context to a hundred twenty-eight K. The forty ninety can't hold even one user now. The H one hundred holds three. Then flip the cache to F P eight, and every "max users" roughly doubles. That's the cheapest capacity win there is, and it's why every engine offers it.

B: What about the seventy B?

A: In B F sixteen, a hundred thirty-one gigs of weights. Nothing on the screen holds it. Including the Spark. Switch to Q four K M, and now the Spark and the H one hundred can both hold it. The forty ninety still can't. And at thirty-two K, the Spark fits about seven users. The H one hundred about three.

B: Seven. That's the "serve seven instead of ten" from before.

A: Same seven. And then the mixture of experts model, Qwen three thirty B A three B, in B F sixteen. Fifty-seven gigs of weights. The H one hundred can hold it, with room for about twenty-seven users at eight K. The forty ninety can't even load it. And here's why it's interesting on the Spark. Like the bandwidth lesson showed, a mixture of experts model only uses about three billion of its thirty billion parameters for any one token. So when it decodes, it only has to read those three billion each step. It decodes like a three B model. Big but sparse, sitting on memory that's big but slow. That's exactly the Spark's niche.

A: And one thing all of this deliberately ignores. Speed. A user who fits is not a user who's served well. On the Spark, a hundred users at eight K means every decode step reads fifteen gigs of weights plus a hundred gigs of caches, through about two hundred seventy-three gigabytes a second of bandwidth. That's about point four five seconds per step. About two tokens a second, each.

B: [surprised] So a hundred users is kind of fake.

A: [dry] A hundred users fit. Nobody would enjoy it. Capacity tells you who can be in the room. Bandwidth tells you how fast the room moves. Today is the room.

<!-- section: Build It -->

A: So here's what you build. All of it goes in a memory folder next to last lesson's server and benchmark harness. The first three pieces run anywhere, do them on your Mac. The last three need the Spark.

A: First, grab the real configs. Just the small JSON files, not the weights. The Hugging Face hub library can download single files. Llama models are gated, so you accept the license on each model page and log in first. Six models: the one B, the eight B, the seventy B, Qwen two point five seven B, Qwen three eight B, and the Qwen three mixture of experts. And while you're there, grab each model's index file, because its metadata has a total size: the checkpoint's weight bytes. For a B F sixteen checkpoint, divide by two and you have the official parameter count to test against. For the eight B, the total is sixteen billion, sixty million, five hundred twenty-two thousand, four hundred ninety-six. Exactly twice the count we got.

A: Second, the parameter counter. This one's yours. One function, takes a config, returns the breakdown. Embedding, attention, MLP, norms, head, total. No transformers, no torch. Just the arithmetic we just did. And it has to match five official counts exactly. The one B, the eight B, the seventy B, the Qwen two point five, and Qwen three eight B, which is eight billion, one hundred ninety million, seven hundred thirty-five thousand, three hundred sixty.

B: Exactly, like to the last digit?

A: To the last digit. And the traps come in a predictable order. Head width isn't always in the config. When it's missing, it's hidden size divided by heads. When it's there, use it. Qwen three sets it explicitly, and heads times head width doesn't have to equal the hidden size. Second trap, the tie flag. If it's missing, treat it as false for these models, but print a warning. It's the single most expensive line in the config. Third, Qwen two point five has biases on query, key and value, but not on the output. There's usually an attention bias key in the config; if not, you have to know your model family. Fourth, Qwen three adds two small RMSNorms inside attention, on the queries and the keys, each the size of one head, in every layer. So if you come out exactly nine thousand two hundred sixteen short on Qwen three eight B, that's thirty-six layers times two norms times a hundred twenty-eight. That's them.

B: [amused] The error tells you the bug.

A: That's the whole point of counting exactly. And print the breakdown as percentages. The MLP should come out around seventy percent for the eight B. And a stretch goal, the mixture of experts model. Its config tells you how many experts there are, how many each token uses, and each expert's intermediate size, and every layer has a small router matrix, hidden by number of experts. Return total and active parameters separately. You should get about thirty point five billion total, and about three point three billion active.

A: Third, the memory calculator, on top of the counter. A small table of effective bits per weight for each format, split into the layers and the embedding plus head, because those differ. B F sixteen is sixteen and sixteen. F P eight is eight for layers, sixteen for the embedding and head. Q eight zero is eight and a half for both. A W Q is four point one six and sixteen. Q four K M, call it four point nine for both. Then three functions: weight bytes, cache bytes per token, and a plan function that takes a model, a format, a context, a user count and a machine, and returns every bucket in gigs, the total, whether it fits, and the max users at that context. Print a table for every model on the Spark, with a ten gig reserve until you've measured yours, on an H one hundred at eighty, and a forty ninety at twenty-four, at eight K and thirty-two K. It should agree with the interactive figure to within rounding.

A: Small things that matter there. Max users is a floor, not a round. Twenty-four and a half users is twenty-four. Start with a flat overhead, and replace it with what you measure later. And do all the arithmetic in bytes, convert to gigs only when you print.

<!-- section: Build It: on the Spark -->

A: Then the Spark. Fourth piece: read the real numbers. You get a little probe function, it's plumbing, so just take it. Every time you call it, it prints one line: memory allocated, memory reserved, the peak, what the CUDA driver says is free and total, the O S's MemAvailable, and how much resident memory your process has. And then you walk through a sequence, calling it after each step.

A: Step one, Python started, import torch, nothing else. Don't touch CUDA yet. Step two, make a tiny tensor on the GPU. That creates the CUDA context. And what you'll see is the O S's available memory and the driver's free memory both drop, while allocated barely moves. That drop is the context. Step three, load the eight B in B F sixteen straight onto the GPU, so you never hold a copy on the CPU side. Allocated should land within a few megabytes of fourteen point nine six gigs. If it says twenty-nine point nine, something's in F P thirty-two. Exactly double.

A: Step four, generate one token from a one K prompt, then four K, sixteen K, thirty-two K, with the efficient attention. Reset the peak counter before each one. Keep the returned cache alive, and record the steady allocated number and the peak. Step five, delete the cache, call empty cache, and snap one more time. And in another terminal, run free, and nvidia S M I, at the same moments, and write down what each one claims. If a number confuses you, ask an agent to explain it. Just don't let it write the experiment.

A: [serious] And one safety thing. On the Spark, running out of memory can take down more than your script. So run these inside a container with a memory limit set below what the machine has. That way the explosion stays in the box.

A: Fifth piece, find the edge. This one's yours again. Your calculator predicts the largest batch that fits at a given context. Now find the real one. A fits function: prefill that many random prompts of that length, decode eight tokens, keep the cache, and return false if you hit out of memory, after cleaning up properly. Then binary search for the largest batch that fits. Do it at four K, sixteen K and thirty-two K, and write your prediction down first. Random token ids are fine, you don't need real text.

A: And the hints. A failed allocation leaves the allocator in a messy state, so free everything and empty the cache before the next try. Prefilling a big batch all at once has a huge activation spike, and that spike, not the cache, might be what fails first. That's a finding, not a bug. You can tell which one it was by comparing the peak to the steady allocated number. And on the Spark, the container limit or the O O M killer might just end the process instead of raising a nice exception. So run each trial in its own subprocess, and the search survives.

A: Sixth piece, check V L L M's arithmetic. Start it with the eight B in B F sixteen inside NVIDIA's container for the Spark, following the playbook for the image and flags. Max model length thirty-two thousand seven hundred sixty-eight. And a G P U memory utilization you picked on purpose, with your measured O S reserve in mind. Not point nine blindly, not on this machine. Before it finishes starting, predict: the pool in gigs, the pool in tokens, which is gigs divided by a hundred twenty-eight K, and the max concurrency at thirty-two K. Then read the startup log for the lines that report cache size in tokens and maximum concurrency. The wording changes between versions. Compare.

A: Then point last lesson's benchmark at it with concurrency just above your predicted max, and long prompts that fill the context. And watch what V L L M does with the request that doesn't fit. Does it queue it? Or start it and later kick someone else out to make room? The logs and metrics will tell you. That behavior is the batching lesson. For now just notice that the limit you computed is a real wall.

A: And you're done when your counter matches all five counts exactly and you can say off the top of your head that the MLP is about seventy percent. When your plan prints a table for six models on three machines and it agrees with the figure. When you've got a probe log on the Spark from cold start through a thirty-two K prefill, with the context, the weights and the cache growth each pointed out. When you've found the real max batch at three context lengths, and know which thing failed. And when V L L M's pool is within a few percent of your prediction, or you can explain why it isn't.

<!-- section: Measure -->

A: So what should the numbers look like? The weights should be the most boring number you measure. Within a few megabytes of eight point oh three billion times two bytes. The few megabytes are small buffers that aren't parameters, like the rotary embedding frequencies. If you're off by a whole gig or more, some tensor got upcast or duplicated.

A: The CUDA context shows up as memory gone from the O S with nothing allocated in PyTorch. A few hundred megabytes up to a gig or so is normal on discrete GPUs. I honestly don't know the Spark's number, which is exactly why it's the first thing you measure. And try running two Python processes that each touch CUDA, and watch it double.

A: The cache growth should be very close to the prompt length times a hundred twenty-eight K. So plus an eighth of a gig at one K, half a gig at four K, two gigs at sixteen K, four gigs at thirty-two K. Because the dynamic cache holds exactly the keys and values and nothing else. But the peak during each prefill will sit well above that steady number. That's the activation spike, plus a brief moment where there are two copies of the cache while it's being glued together. And expect reserved to climb to the biggest peak and stay there.

A: After you delete the cache and empty the cache, allocated goes back to the weights, fourteen point nine six, and reserved drops close to it. If the O S's available memory doesn't fully come back, part of the gap is the CUDA context. That only goes away when the process exits.

A: And the edge should land a little below your prediction. Not above. The usual reasons: fragmentation, which you'd see as reserved well above allocated when it failed. The prefill spike at a big batch times a long context, which you fix by pushing the prompts through in chunks. Or the O S reserve being bigger than you assumed. A desktop session, a browser, a notebook someone forgot about.

B: [skeptical] What if I measure more than predicted?

A: Then something in your stack is probably quantizing the cache without telling you. Go check. And V L L M's pool should match your prediction within a few percent, if you used the same overhead and activation numbers it profiled. Its log tells you how much it set aside for activations. Plug that in and the match tightens.

<!-- section: Break It -->

A: Then you break it on purpose. Four ways. First: ask for every logit. Replace generate with a bare call to the model on a thirty-two K prompt. Predict it first, thirty-two thousand rows times a hundred twenty-eight thousand scores times two bytes, about eight gigs. Then watch the peak. The fix is one argument, ask for logits at the last position only. And the lesson is that a single tensor nobody needed can be bigger than the whole K V cache.

A: Second: use textbook attention. Load the model with the eager, plain attention implementation, and prefill eight K, then sixteen K. Predict the score grid: heads, times the length squared, times two bytes, per layer, plus a thirty-two-bit copy for softmax. At sixteen K that's tens of gigs for one layer's temporaries.

B: And that just dies.

A: It fails exactly where the efficient version sailed through. So the activation peak depends on the algorithm, not just the model. Which is the whole reason FlashAttention exists.

A: Third: run two at once. Start two V L L M instances on the Spark, both with the default ninety percent. The second one fails at startup. Or worse, the first one's budget plus the O S leaves nothing for the second, and the whole machine starts reclaiming and swapping. Then try a notebook that loads a model while one instance is running.

B: [laughs] That's the colleague.

A: That's the colleague. On unified memory, a serving engine's budget is a claim on the whole machine. So write the reserve you need right into your launch script.

A: And fourth: fragment the pool. Generate four thousand tokens, one at a time, at batch eight, with the dynamic cache, snapping every two hundred fifty tokens, and plot reserved minus allocated. Then repeat with a static cache, which allocates the full length once up front. And try once more with the allocator setting called expandable segments, which lets PyTorch grow a block in place instead of making new ones. The lesson: allocating once and slicing beats growing. Which is exactly what serving engines do.

<!-- section: Explain It Back: the numbers don't add up -->

B: Okay, so here's the one I'd actually get stuck on. PyTorch says fifteen gigs allocated. The system says seventeen are gone. Where are the other two?

A: [calm, methodical] Walk down the layers. Allocated only counts live tensors. Reserved adds the blocks PyTorch's allocator is holding for reuse, and after a prefill spike that can be gigs. Below that, the CUDA context and the library code, which belong to the driver, invisible to PyTorch's counters. Other processes on the GPU add their own. And on the Spark, the O S, the CPU-side Python objects, and the page cache all share the same pool, and free sees every bit of it. So to actually account for it, you compare four numbers step by step from a cold start. Allocated. Reserved. How much the driver's free memory dropped. And how much MemAvailable dropped. Each gap is one layer.

B: [working it out] And it's always the same order. Tensors, then PyTorch's pool, then the driver, then the whole machine.

A: Same order, every time. If you want the long version of all this arithmetic, kipply's "Transformer Inference Arithmetic" walks the same calculations through real models, and the V L L M paper on paged attention opens with measurements of how much cache memory earlier servers wasted. And next up, you build the cache yourself, then batching, where "max users" turns into throughput. And the quantization lesson is the other side of the weights: you now know what a four-bit file costs in bytes, that one measures what it costs in quality.

<!-- section: Close -->

B: Let me try the whole thing. An eight B model isn't eight gigs, it's two bytes a parameter, so fifteen gigs of weights, and that's fixed no matter how many people use it. And then each user has their cache, a hundred twenty-eight K per token, and that's the part that grows. So the number of users is just free memory divided by one person's cache. And if you want more users, you quantize the model.

A: [gently] Almost all of that. The last bit's backwards, though. Quantizing the weights shrinks the fixed part, once. Fifteen down to five. That helps when the weights are most of the memory, so a few users with short chats. But as soon as you have lots of users or long contexts, the cache is most of the memory, and four-bit weights barely move it. What you're really buying memory for on a server is users times context. So the levers that matter there are the ones that shrink the cache per token: fewer key value heads, which is G Q A, an F P eight cache, and not reserving space a conversation hasn't used yet. And on the Spark, even after all that, the room gets slow before it gets full. Every user you fit, you also have to read, every single step.
