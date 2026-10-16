<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture the generation loop almost everyone writes the first time they finish their GPT two. You've got the model working, it loads the real weights, and now you want it to actually write something. So you write a little loop. Each time around, you hand the model the whole sequence so far, the prompt plus everything it's generated. It gives you back predictions for every position. You keep only the last one, take the most likely next token, stick it on the end, and go around again. It's like five lines. It's obviously correct. And honestly, you may have written exactly this.

B: I'm pretty sure I did, yeah.

A: So here's what happens when you run it. On a MacBook, an M four Pro, CPU only, GPT two small in full thirty-two-bit floats, that loop takes about a hundred seventy seconds to write a thousand tokens. Almost three minutes. And if you time each step, the first token takes seventeen milliseconds. Token five hundred takes about a hundred sixty. Token one thousand takes about three hundred sixty. The model didn't get bigger. The text didn't get harder. Each step just got slower, in a straight line, until it was twenty times slower than the first one.

B: Huh.

A: And then you change about twenty lines of code, and the same thousand tokens take twelve seconds. Every token is the same token as before. And token one thousand costs about what token one did.

B: [casual] Okay, I know where this is going. That's the KV cache. You store the keys and values for the old tokens so you don't recompute them.

A: That's right. That was your answer in the diagnostic too, and it was the right answer. So this episode goes one level down from that. But first, let me make you feel the waste. Go to step five hundred of that loop. The model runs a full forward pass over five hundred twelve tokens. That's a twelve-token prompt plus the five hundred it's written so far. And you keep one row of the output. So, of all the numbers computed in that step, what fraction had already been computed, exactly, one step earlier?

B: [working it out] I mean... most of it? Something like half? The early tokens are the same, but everything's attending to everything, so I'd guess a lot of it shifts around when a new token shows up.

A: [gently] Almost all of it. Five hundred eleven out of five hundred twelve positions. Every key, every value, every query, every MLP activation, every layer norm output, for positions zero through five hundred ten, comes out bit for bit what it was one step earlier. And the reason is the causal mask, which we'll get to in a minute. The only genuinely new work is the one new position.

B: So it's not half. It's basically all of it.

A: All of it but one. And add that up over a whole generation. If you write n tokens, the loop does roughly n squared over two positions' worth of work, when it only needed n. For a thousand tokens, that's a thousand times a thousand over two, half a million, against a thousand. So roughly five hundred times more matrix work than necessary.

B: [skeptical] Wait. Five hundred times? You just said it went from a hundred seventy seconds to twelve. That's like fourteen times.

A: [amused] Yeah. The measured slowdown is "only" fourteen times on a laptop CPU. And where the other factor of thirty-five went is its own little story. Hold on to that, we're coming back to it.

A: So, the questions. You said "store the keys and values." Why exactly keys and values, and not the queries? What makes it legal to reuse them at all? What shape is this thing, how big does it get, and what are all the tricks people use to make it smaller? And then you build it into your own GPT two and measure it.

<!-- section: Origin -->

A: [settling in] The idea itself is as old as the Transformer. "Attention Is All You Need" came out in twenty seventeen, and the Google code that trained it, a library called tensor two tensor, already had a fast decoding path that kept each layer's past keys and values around instead of recomputing them. For a model that writes one token at a time, it's just the obvious move once you see the waste.

A: [a little wry] What took longer to notice was the bill. In twenty nineteen, Noam Shazeer, one of the Transformer's authors, put out a short paper with a playful title. "Fast Transformer Decoding: One Write-Head is All You Need." And his point was this. Once you cache keys and values, the decode step isn't slow because of math anymore. It's slow because at every single step, the hardware has to read the whole cache back out of memory... and the cache is big. So his fix was to let all the attention heads share one single set of keys and values. That shrinks the cache by the number of heads. He called it multi-query attention.

B: So the cache fixed one problem and immediately became the next one.

A: Pretty much. And that started a line of work that's still going. Grouped-query attention in twenty twenty-three as a middle ground. Sliding windows. Caches stored in fewer bits. DeepSeek's latent attention in twenty twenty-four. The cache stopped being a trick, and became the thing modern model architectures are designed around.

<!-- section: The Idea: A lazy librarian -->

A: So let me build up why it's keys and values. Picture a librarian answering a stream of questions about a pile of notes that keeps growing. Every time a new note arrives, she writes an index card for it. The card has two things on it. A short label, what this note is about. And a summary, what it actually says. To answer a question, she compares the question against every label, picks out the relevant cards, and blends their summaries together.

A: Now, the no-cache loop is a librarian who, every time one new note arrives, throws away all her index cards, rewrites every single one from scratch, and then answers one question. And the cards come out identical every time, because the notes haven't changed. A sensible librarian keeps the cards in a box, and writes one new card per note.

B: And the box is the cache.

A: The box is the cache. And the mapping is exact. The labels are the keys. For each token, the key is a vector that says, roughly, "here's what I contain." It's how a token gets picked. You get it by multiplying that token's hidden state by a learned matrix, the key matrix. The summaries are the values. The value is the information a token hands over when something attends to it, and it's that same hidden state times a different learned matrix. And the question is the new token's query. The query says "here's what I'm looking for." You take the dot product of the query with each key, that gives you a score, you push the scores through a softmax so they turn into weights that add up to one, and the output is a weighted average of the values.

<!-- section: The Idea: What one new token needs -->

A: So now take one attention head in one layer and say it precisely, but in words. Every position i has a hidden state. From it, the head makes a query, a key and a value for that position. Then for each position t, it scores t's query against the key of every position from zero up to t. Not later ones, the causal mask hides those. Each score gets divided by the square root of the head size, which just keeps the numbers from getting huge. Softmax across those scores gives the weights. And the output for position t is the weighted sum of the values from zero up to t.

A: Now ask, what do you need in order to make the output for the newest position, and nothing else? Do you need the queries of the past tokens? The keys of the past tokens? The values?

B: [a bit unsure] All three? I'd have thought you keep the whole set. Like, if attention is query times key times value, and you're caching to avoid recomputing, then you'd keep everything you computed.

A: [firmly] So keys and values, yes. All of them. Queries, no. Never. Look at what the newest output actually uses. It uses the new query, the one for position t, against every past key. And then it mixes every past value. A past query, say the query for position forty, only ever shows up in one place: the scores for row forty. And row forty was needed for exactly one thing, the output of position forty. That output's already been computed. It's already moved on to the next layer. Nobody's ever going to ask for it again.

B: Oh. So the old query did its one job and it's done.

A: It's dead the moment it's used. Past keys and values get read at every future step. Past queries never get read again. And that's the whole reason it's a "KV" cache and not a "Q K V" cache.

A: The picture to hold in your head is the grid of attention scores. Rows are query positions, columns are key positions. Because of the mask, it's a lower triangle. Row zero has one cell, row one has two, row two has three, and so on, and everything above the diagonal is blank, that's the future. Now a decode step, making one new token, only adds the bottom row. And to fill that bottom row, you need one thing from the left side, the single new query, and you need the entire top edge, every key, and then every value to mix. All the rows above it are finished. They were the last steps' work.

<!-- section: The Idea: Why the old cards never change -->

A: Okay, so keeping old keys and values is only allowed if they're truly the same numbers every step. Are they? And in a decoder like GPT two, yes. And the reason is the causal mask. That's the rule in a decoder's attention that position t may only look at positions zero through t, never later ones. The way it's actually done is you set the scores for later positions to minus infinity before the softmax, so they get a weight of exactly zero.

A: Follow one position, say position i, up through the model. At the very bottom, the input to layer zero is the embedding of token i plus the position embedding for slot i. So it depends only on token i and the number i. That's it. Then attention. The output at position i mixes values from positions zero to i. Nothing later. So now it depends only on tokens zero to i. Then everything else in the block, layer norm, the MLP, the residual add, those all work on one position at a time. They never mix positions. So the input to the next layer at position i still depends only on tokens zero to i. And you just repeat that, layer after layer.

B: [working it out] So it's induction. Each layer only ever pulls from the left, so nothing on the right can leak into position i, at any depth.

A: That's it. Every hidden state at position i, in every layer, is a function of tokens zero to i and nothing else. So appending token five hundred one can't reach back and change it. Which means the key and the value at position i, in every layer, are frozen the moment they're first computed. The word for that is immutable. Once they exist, no later token can alter them.

A: And there are two conditions hiding in that argument. Break either one and the cache breaks. First, the mask has to be causal.

B: Which is why BERT doesn't have one of these?

A: Right. An encoder like BERT lets every position see every other position, in both directions. So adding a word changes every hidden state in the whole sequence, and there's nothing stable to cache. Second condition, a position's encoding has to depend only on its own index. GPT two's learned position table qualifies. And so does Llama's RoPE, rotary position embedding. RoPE encodes position by rotating each query and key vector by an angle that depends on where it sits. Llama applies that rotation to the query and key before attention. So the keys you cache are already rotated. You cache them after rotation, and that's what Hugging Face's Llama does.

B: [casual] Okay, and then one key per token, sitting in the cache.

A: [firmly] No, and this one matters. There's no single "key of token i." The cache is per layer, and it has to be. Layer five's keys are computed from layer five's input, which is layer four's output. Different numbers entirely. So in GPT two small, every token has twelve keys, one per layer, and each of those is split across twelve heads. Same for values.

<!-- section: The Idea: Prefill fills it, decode appends to it -->

A: So with a cache, generation has the same two phases from the bandwidth episode, and now you can say exactly what each one does to the cache. Quick reminder of those two. Prefill is the part where the model reads your prompt. Decode is the part where it writes, one token at a time.

A: Prefill. You run the whole prompt through the model in one forward pass, exactly like training. Causal mask and all. And as a side effect, every layer computes the keys and values for every prompt position. You just... keep them. Now the cache holds one row per prompt token, in every layer. And the output at the last position gives you the first new token.

A: Decode. You feed in only the newest token, as a sequence of length one, and you tell the model its position. If the prompt was ten tokens, the first new one is at position ten, then eleven, and so on. In each layer, compute its query, key and value. Append the key and value to that layer's cache. Score the one query against every cached key, softmax, mix every cached value. One row comes out, goes through the MLP, on to the next layer. At the top, one row of logits, one token.

A: And the shape of each layer's cache is the shape you already use inside attention. Four numbers. Batch, number of key-value heads, sequence length, head size. For GPT two small, that's batch one, twelve heads, however many tokens so far, sixty-four numbers per head. One of those for keys and one for values, in each of the twelve layers. For Llama three point one, the eight B model, it's eight heads, a hundred twenty-eight numbers per head, in each of thirty-two layers. And I'll come back to why that's eight and not thirty-two. Prefill writes all the prompt rows in one go. Each decode step grows the length by exactly one. Nothing else ever changes size.

B: So how big is one token's worth?

A: You can just multiply it out. Picture one layer's key cache as a stack of twelve sheets, one per head, each sheet a grid that's sixty-four wide and grows downward one row per token. Prefill fills the top few rows in one go. Each decode step adds one new row to every sheet. Now the whole cache, per token: two, for keys and values. Times twelve layers. Times twelve heads. Times sixty-four numbers. Times four bytes per number in thirty-two-bit floats. That comes out to seventy-two kilobytes. Per token.

B: Seventy-two kilobytes for one word. Okay.

A: For one token, in a tiny model. Keep that in your pocket, it gets bigger.

A: Now, two small details in the decode step are where basically everyone's first implementation goes wrong, so let's name them now. The first is the position. The new token isn't at position zero. It's at the prompt length plus however many steps you've done. But your forward pass probably builds the positions with arange of the sequence length, zero up to T. And in decode, T is one. So it gives you zero. Every step. You need it to count from the length that's already in the cache instead.

A: The second is the mask. A single new query is allowed to see every cached key, so it needs no mask at all. Easy. But—

B: [jumping in] When would I ever feed more than one?

A: [laughs] More often than you'd think. If the prompt comes in two chunks, you prefill the first half and then feed the second half on top of the cache. Or in speculative decoding, where you check several draft tokens at once on top of the cache. And then the mask isn't square anymore. Say you've got a hundred tokens cached and you feed five new ones. That's five queries against a hundred five keys. New query number zero sits at absolute position one hundred, so it may see keys zero through one hundred. Query number one may see through one hundred one. So the triangle's still there, but it's shifted over by a hundred columns. In PyTorch you take the lower triangle with the diagonal offset by the total key length minus the number of new tokens. If you use the plain lower triangle on that five by a hundred five grid, it's wrong by exactly the number of cached tokens.

<!-- section: The Idea: Step through it -->

A: There's an interactive figure in the lesson for this, and it's worth describing what you'd see as you click through it. One head, one layer, a four-token prompt growing to twelve tokens. "The cat sat on," and then it writes "the mat and then it fell fast asleep." Down the left you've got three rows of little squares, one row for keys, one for values, one for queries, a square per position. On the right, the attention triangle. You press step.

A: First press is prefill. All four prompt positions light up at once. Keys, values and queries, computed in one pass, and the keys and values go into the cache. Then with the cache on, each step after that lights up exactly one new key, one new value, one new query, and one new row at the bottom of the triangle. All the old keys and values turn a pale color, meaning "read from the cache." And the old queries? They go blank. Nobody keeps them.

A: Then you reset, flip the cache off, and step again. Now every step, everything to the left gets recomputed. Identically. Crossed out, marked wasted. And the whole triangle gets recomputed too, just to produce that same one bottom row. And there's a counter of wasted vectors that just keeps climbing. At the bottom it tells you what that turns into at a thousand tokens. With the cache, about two thousand key and value vectors made, total, per head per layer. Without it, about a million.

B: Per head per layer. So times a hundred forty-four for GPT two small.

A: Twelve heads times twelve layers, yeah. Three things to notice. One, prefill is the same picture either way. A cache doesn't speed up reading the prompt. It speeds up everything after it. Two, with the cache off, the waste per step grows with the length, so the total grows with the square of the length. And three, with the cache on, the past queries go blank right after their step. That's the "why not queries" answer, in pictures.

<!-- section: The Idea: Counting the work -->

A: So let's put numbers on it. A FLOP is one arithmetic operation, one multiply or one add. And multiplying one token's vector through a weight matrix costs about two FLOPs per weight, a multiply and an add. GPT two small has about a hundred twenty-four million parameters in its matrices, counting the output layer. So pushing one token through the weights is about two hundred fifty million FLOPs.

A: Without a cache, at length n, you push all n tokens through. So the linear layers cost n times that. And attention is worse, because you redo the whole triangle, which grows with n squared. With a cache, you push one token through. Two hundred fifty million FLOPs, no matter how long the text is. Plus one row of attention, which grows with n.

B: So per step, without the cache, cost grows with the length. With it, it's flat.

A: Flat plus a small term that grows. And over a whole generation, total cost goes from about n squared to about n. And attention, if you add it up, goes from about n cubed without a cache to n squared with it.

A: And that small growing term with the cache is real, and worth seeing. At a thousand tokens in GPT two small, the attention part of one cached step is roughly four, times twelve layers, times the model width of seven sixty-eight, times a thousand. About thirty-seven million FLOPs. Next to about two hundred fifty million for the matrices. So small... but it grows, and at long context it wins. And in bytes it's the same story you saw at the end of the bandwidth episode. Every decode step has to read the entire cache. Every layer, every head. For the eight B Llama at a hundred twenty-eight thousand tokens of context, that read is bigger than the weights.

<!-- section: The Idea: Why the measured speedup is not 500x -->

B: Okay, so now the five hundred versus fourteen thing.

A: Right. The FLOP count says the no-cache loop at a thousand tokens does around five hundred times too much matrix work. The laptop measured fourteen times. So where'd the rest go? Back to the roofline from the bandwidth episode. Quick version. Every chip has two speeds. How fast it can do math, and how fast it can pull bytes in from memory. Divide the first by the second and you get a number called the ridge point: how many FLOPs you need to do per byte you read before the math becomes the bottleneck. Below that, you're limited by memory. The math units are sitting idle, waiting for data. Above it, you're limited by math.

A: Now look at what a no-cache step at length n actually is. It's a prefill of n tokens. One read of the weights, and n tokens' worth of math on them. And while n is small, that's still way below the ridge point. So the step is bound by reading the weights, plus fixed overhead per step. Not by math. Doing ten tokens of math instead of one is nearly free, because the math units were idle anyway.

B: [working it out] So the recomputing is wasted, but it's wasted on hardware that wasn't doing anything.

A: That's it. Until n gets big enough to make the math the bottleneck. Only then does the no-cache step start growing. And you can see that in the measurement. Picture a chart, milliseconds per token going up, tokens generated so far going across, out to a thousand. Four lines. GPT two small, the MacBook again, full thirty-two-bit floats. No cache on the CPU is a line that starts climbing almost right away and ends up at about three hundred sixty milliseconds per token. No cache on the Mac's GPU stays flat for about the first hundred tokens, then bends and climbs in a straight line, ending at about eighty milliseconds. And the two runs with the cache, CPU and GPU, both sit way down at the bottom, between eight and sixteen milliseconds, the whole way across.

A: In totals: CPU, a hundred seventy seconds without the cache, twelve with. GPU, fifty-two without, twelve point three with. And in both cases, all thousand tokens identical.

B: [skeptical] Hang on. The cached GPU run is no faster than the cached CPU run? Twelve point three versus twelve?

A: [amused] Yeah, that one surprises people. At a hundred twenty-four million parameters, a decode step on that GPU isn't dominated by bytes or by math. It's dominated by fixed costs. Python is launching dozens of small kernels every step. A kernel being one little program the GPU runs, one per operation. And all that launching is about ten milliseconds' worth. That's the overhead-bound corner of the roofline. And it's why the cache's speedup looks modest on a tiny model and short text, and becomes enormous on a big model with long text.

A: So now take that to the Spark. Llama three point one, the eight B, in B F sixteen. That's sixteen gigabytes of weights. And at the Spark's spec-sheet bandwidth of about two hundred seventy-three gigabytes a second, that's about fifty-nine milliseconds per step just to read them. You run Hugging Face's generate with the cache turned off. What does per-token latency look like against position?

B: [a bit unsure] Based on what you just said... flat at first? Because recomputing a short prefix is free while it's under the ridge. And then at some point it starts climbing.

A: That's the shape. Close to flat at first, near the cached speed, then it bends upward and climbs in a straight line. Now, where's the bend? A no-cache step at length n is a prefill of n tokens. Each weight gets used for two FLOPs per token, and in B F sixteen each weight is two bytes. So the work per byte is about n. Two FLOPs times n tokens, over two bytes. So it stays memory-bound, and costs about one weight read, until n reaches the ridge point. Which means the bend should land near your measured ridge point, just read as a number of tokens. A ridge of a few hundred FLOPs per byte means a bend at a few hundred tokens. Lower if the Spark's real B F sixteen rate comes in below the estimate.

B: And after the bend?

A: Each extra token of length adds about two times eight billion FLOPs to every step, divided by whatever FLOPs per second you actually measured. And to be clear, that's a prediction for you to check, not something I measured. Python and attention overhead will probably blur the corner.

<!-- section: The Idea: The price: memory -->

A: So the cache trades compute for memory. And its size has a formula you can do in your head. Bytes per token is: two, for keys and values, times the number of layers, times the number of key-value heads, times the head size, times bytes per number. And the total is that, times the tokens in the context, times the number of sequences in the batch.

A: So GPT two small, we did. Seventy-two kilobytes per token, so at its full context of about a thousand tokens, about seventy-two megabytes. GPT two XL, forty-eight layers, twenty-five heads, still in thirty-two-bit, is six hundred kilobytes a token, six hundred megabytes at full context. Now jump to real models. Llama two seven B, in B F sixteen, with every head having its own keys and values: thirty-two layers, thirty-two heads, a hundred twenty-eight each, two bytes. Five hundred twelve kilobytes per token. Two gigabytes at its four-thousand-token context. Llama three point one, the eight B, same layers, but only eight key-value heads: a hundred twenty-eight kilobytes per token, a quarter of that. But at its full hundred twenty-eight thousand tokens, that's sixteen gigabytes. For one conversation. As big as the whole model. And the seventy B, eighty layers, is three hundred twenty kilobytes a token, forty gigabytes at full context.

B: And the GPT two number actually checks out if you measure it?

A: To the byte. In the run on the Mac, the cache held exactly seventy-three thousand seven hundred twenty-eight bytes per position. That's seventy-two kilobytes. At a thousand eleven positions, about seventy-four and a half million bytes total.

B: [casual] Okay, but memory's kind of the boring part, right? The Spark has a hundred twenty-eight gigs. It's a capacity thing, you just make sure it fits.

A: [gently] It's half the story. Yes, it grows in a straight line. One more token, one more row in every layer. And the weights are a fixed cost, you pay them once. The cache is a per-token, per-user cost. So it's what decides how many users and how much context fit on a machine, and that's the whole subject of the memory math episode. But the other half is: every step reads the whole cache. So it's also bytes per token, on the bandwidth side. Which means every trick that makes the cache smaller buys you two things at once. More users or more context in memory, and faster steps.

<!-- section: The Idea: Shrinking the cache: share the keys -->

A: So, how do you shrink it? Look at the formula again. Four knobs. Layers, key-value heads, head size, bytes per number. Layers and head size are mostly about model quality, you don't touch them lightly. The other two are where all the clever designs live.

A: In the original Transformer, multi-head attention gives every head its own queries, keys and values. That's so each head can look for different things. People call that M H A. With thirty-two heads, that's thirty-two sets of keys and values per layer to cache.

A: Shazeer's twenty nineteen idea, multi-query attention, M Q A, keeps the thirty-two query heads. So the model can still ask thirty-two different questions. But it gives them one single shared key head and one value head. The cache shrinks thirty-two-fold. The catch is quality. One set of keys has to serve every kind of question, and models trained that way tend to lose a little accuracy. Several big models used it anyway. Google's PaLM, and the seven B version of Falcon, from T I I.

A: Then in twenty twenty-three, Joshua Ainslie and colleagues at Google came up with the middle ground. Grouped-query attention, G Q A. You split the query heads into groups, and each group shares its own key head and value head. The eight B Llama three point one has thirty-two query heads in eight groups of four. So eight key-value heads, and the cache is four times smaller than full multi-head. And the paper reports quality close to full multi-head, with speed close to multi-query. Llama two only used it for the seventy B model. Every Llama three model uses it, and so do most new open models.

B: So in the code, do you make eight sets of keys and then copy each one four times? And the cache stores the copied version?

A: The first half, yes, the second half no. The key and value projections just output eight heads' worth instead of thirty-two. Then right before attention, each key-value head gets repeated, or broadcast, to line up with its group of four query heads. But the cache stores the small, unrepeated version. That's the whole point. And that's why the Llama shape had eight in the heads slot, not thirty-two.

A: There's a second interactive figure for this, and it's the one to play with. It's shaped like the eight B Llama. Thirty-two layers, thirty-two query heads, sixteen gigabytes of weights, sitting on the Spark's spec-sheet hundred twenty-eight gigabytes and two hundred seventy-three gigabytes a second. Up top you see the query heads, with lines showing which key-value head each one shares. Buttons for M H A, G Q A eight, and M Q A. Buttons for storing the cache in B F sixteen, eight-bit, or four-bit. A toggle for a four-thousand-token sliding window. Two sliders, context length and number of users. And a bar showing memory: the weights as a solid chunk, and the caches stacked next to them. Plus a readout for the ceiling on tokens per second per user, assuming all users decode together and each step reads the weights once plus every user's cache.

A: So start at G Q A eight, eight thousand tokens of context, one user. The cache is a sliver next to the weights. One gigabyte. About sixteen tokens a second. Switch to M H A. That's Llama two seven B's design, five hundred twelve kilobytes a token. Now drag users up to sixteen. With M H A, the caches outweigh the model. Sixty-four gigabytes of cache next to sixteen of weights, and the ceiling falls to around three tokens a second each. With G Q A, they fit comfortably, sixteen gigabytes, about the size of the model, and you're at about eight a second. With M Q A, they barely register. Then push context to a hundred twenty-eight thousand with eight users, and watch the memory bar just run out. It doesn't fit.

B: [working it out] So let me do the real one. How many users at eight thousand context actually fit on my Spark with the eight B?

A: Go for it.

B: A hundred twenty-eight kilobytes a token, times about eight thousand tokens... that's a gigabyte per user. And the Spark has a hundred twenty-eight. So... a hundred twenty-eight users?

A: [gently] Take the weights off first. A hundred twenty-eight minus about sixteen leaves around a hundred. Call it ninety, after activations and overhead. So roughly ninety users. And fewer if the GPU can't use all of the unified memory. With full multi-head attention, thirty-two key-value heads, the cache is four times bigger. Four gigabytes per user. So about twenty-two users.

B: [surprised] Ninety versus twenty-two. Just from sharing keys.

A: And here's the part that's easy to miss. Every step reads every user's cache. So at ninety users, that's ninety gigabytes of cache read every step. Several times the weights. So the step time balloons, and per-user speed drops a lot, long before memory actually runs out. That's why grouped-query attention, quantized caches and paging are the levers servers care about.

A: And DeepSeek went further in twenty twenty-four, with multi-head latent attention, M L A, from DeepSeek V two. Instead of caching full keys and values, you cache one small compressed vector per token, per layer, and expand it back into per-head keys and values with a learned matrix when you need them. Same goal, different bargain. A bit more math per step, for many fewer bytes. Which is a good trade on a machine that's bound by bandwidth anyway.

<!-- section: The Idea: Shrinking the cache: forget the distant past -->

A: The next knob is tokens in context. What if a layer only attends to the last W tokens? Then it only needs to cache the last W, and the cache stops growing at W. That's sliding-window attention. The idea got popular for long documents with Longformer in twenty twenty. And Mistral seven B, in twenty twenty-three, used it in every layer, with a window of four thousand ninety-six.

A: And the cache becomes a ring buffer. Mistral's paper calls it a rolling buffer. You've got four thousand ninety-six slots, and token i goes into slot i, wrapping around. So token four thousand ninety-six goes back into slot zero, overwriting the token from exactly one window ago. Token four thousand ninety-seven goes into slot one, and so on. So memory per conversation is capped, no matter how long it runs. For Mistral seven B, with eight key-value heads of a hundred twenty-eight in thirty-two layers, that's a hundred twenty-eight kilobytes a token, times four thousand ninety-six, so the cap is five hundred twelve megabytes per conversation in B F sixteen.

B: [skeptical] But then it just forgets everything past four thousand tokens. Like, a hard cliff.

A: Not entirely. It's subtler than that. In layer two, position t can see back to t minus W. But each of those positions already absorbed another W positions back, in layer one. So stack L layers, and information can in principle travel back about L times W positions. Kind of like a rumor passed down a line of people. Each person only talks to their neighbor, but the message still travels.

B: [dryly] And gets garbled on the way.

A: In practice, yeah, it's lossy. So newer models mix the two. Google's Gemma two alternates sliding-window layers and full-attention layers. And per its technical report, Gemma three uses five local layers, with a window of a thousand twenty-four, for every one global layer. Only the global layers pay for the full context.

<!-- section: The Idea: Shrinking the cache: fewer bits -->

A: Last knob, bytes per number. Store keys and values in eight bits instead of sixteen, and the cache halves. In memory, and in bytes read per step. Eight-bit floating point caches are a standard option in serving engines now. V L L M exposes it as a cache data type setting. The exact name and supported formats are worth checking in its docs. Going lower than eight bits is an active research area. The KIVI paper, from Liu and colleagues in twenty twenty-four, found that keys have a few channels, a few positions in the vector, with huge values. So it quantizes keys per channel, and values per token, and it gets down to about two bits with small accuracy loss. The cost is a little bit of error in every attention score, and a little extra work to unpack the numbers. The quantization episode does the same trade for weights, with measurements.

<!-- section: The Idea: How real code stores it -->

A: One more thing, about how the cache actually sits in memory. Your build is going to grow the cache with torch dot cat. Concatenate the new row onto the old cache. Which is the simplest thing that works, and also slightly wasteful. Each cat allocates a brand-new tensor and copies the whole old cache into it. So that's a second full pass over the cache's bytes, every step, every layer.

A: Real implementations avoid that one of three ways. One, preallocate. Allocate the full size up front, batch by heads by maximum length by head size, once, and just write row t into slot t. Hugging Face calls that a static cache. And because the shapes never change, it also lets the model be compiled. Two, grow in chunks. Reserve room for a bunch of tokens at a time, the way a Python list does. And three, pages. V L L M's PagedAttention splits every sequence's cache into small fixed-size blocks, say sixteen tokens each, scattered around memory, with a little table per sequence saying which blocks it owns. Exactly like pages in virtual memory. No wasted reservation, and blocks can be shared between sequences. That's two episodes from now, paged attention and prefix caching.

<!-- section: Build It -->

A: So, building it. Laptop first, any machine with PyTorch, the CPU's fine for GPT two small. Then the Spark. A model file, a generate file with both loops, a benchmark by position, and a plot.

A: Step one is just getting a GPT two that loads real weights. If your from-scratch one can load Hugging Face's GPT two weights, use it, because the point is to put the cache into code you understand. If not, the lesson gives you a minimal nanoGPT-style model as boilerplate. The sanity check: run the same prompt through that and through Hugging Face's own GPT two and compare the outputs. On the Mac, the biggest difference was about nine in the hundred-thousandths place, about nine times ten to the minus five. That's just floating-point additions happening in a different order. If you see something big, a transpose is missing. Hugging Face stores a few of those weight matrices flipped relative to PyTorch's normal linear layer.

A: Step two is the real one, and it's yours to write. You change three forward functions, attention, the block, and the model, so the cache flows through them. Attention takes in only the new positions, plus the past keys and values for that layer, if there are any. And it hands back its output plus the full keys and values, old plus new. The block passes that through. And the model takes a list of twelve of those pairs, one per layer, and hands back a new list.

A: And the hints, in the order people trip on them. Positions: read the length already in the cache, and count the new positions up from there. Get it wrong and the output is fluent nonsense. Concatenate along the sequence dimension, which after the transpose is dimension two. Not dimension one, that's heads. The mask is new tokens by total tokens, not square, and you use that shifted lower triangle. And the nice thing is, with an empty cache it reduces to the old square mask, and with one new token it reduces to no mask at all. So one line covers prefill, decode and chunks. Only keys and values go in the cache. And keep the old path working: calling the model with no cache should give exactly what it did before.

A: Step three, prove the cache changes nothing. Two greedy loops. The no-cache one from the start. And the cached one: prefill the prompt, then each step pick the token and feed only that one token in, with the cache. Then assert the token sequences are exactly equal. And in thirty-two-bit you should hit that. On the Mac, all thousand tokens matched, on the CPU and on the GPU.

B: But if the math is done in a different order, the numbers aren't identical, are they?

A: The logits aren't, no. Compare them at a few steps and they'll differ a little. Multiplying one row through a matrix and multiplying five hundred rows through it can add things up in a different order, so expect differences around one in the hundred-thousandths or smaller, in thirty-two-bit. The tokens still match because the top choice almost always wins by a mile. And that's the honest caveat on "identical." If two candidate tokens are nearly tied, a tiny difference can flip which one wins. And in B F sixteen the differences are a lot bigger. So if you ever see a mismatch, print the top two logits at that step before assuming you have a bug. A near-tie is a rounding story. A big gap is your bug.

A: Step four, latency against position. Time every single step of both loops for a thousand new tokens. GPT two's limit is a thousand twenty-four positions total, so that's about as far as you can go. Save the times and plot milliseconds per token against position, both curves on one chart. On a GPU you have to synchronize before you read the clock, because GPU work runs asynchronously and otherwise you're timing the launch, not the work. Throw away the first few steps. On the Mac's GPU the first ones took up to eight hundred fifty milliseconds while things warmed up, which would wreck the plot. And plot medians over a sliding window of twenty to fifty steps, because single steps are noisy. If you can, run both CPU and GPU. The difference between those two curves is the roofline talking.

A: Step five, watch memory grow. Write a function that sums up the bytes of every key and value tensor in the cache. Record it every hundred steps and check it against the formula. They should agree to the byte. Then on the Spark, also record what PyTorch's GPU allocator says is in use. That'll grow by about the same amount, plus some temporary buffers. Then repeat with GPT two XL, six hundred kilobytes a token, and with a batch of eight copies of the prompt. And predict each line's slope before you run it.

B: [working it out] Batch of eight with XL is just eight times six hundred kilobytes. So, what, four point seven megabytes per token?

A: Four point seven, yeah.

A: Step six moves to the Spark, in the container from the baseline episode. Load the eight B Llama three point one, the Instruct version, in B F sixteen, run a prompt with the cache on, and look at what it hands back. In recent versions it's a cache object, something like DynamicCache. And if you dig the shape of one layer's keys out of it, you should see one, eight, your prompt length, a hundred twenty-eight. Eight key-value heads, not thirty-two. That's G Q A, sitting right there in memory. The cache API has changed several times across transformers versions, so check the caching docs for whatever version you're on.

A: Then confirm your server's actually using it. Generate caches by default. On the Mac, transformers five point twenty had it on in the model config and left it unset in the generation config, which falls back to the model config. So for Llama, measure generate with the cache on and off, at sixty-four, two fifty-six and a thousand twenty-four new tokens, greedy, forcing it to produce exactly that many. On the Mac, Hugging Face's own GPT two took three point one seconds with the cache and fourteen point eight without, for three hundred tokens. Identical output.

A: And finally, add an environment flag to your naive server that turns the cache off, run your benchmark harness at one request at a time on short prompts, and add a row to the scoreboard, labeled as an ablation. [amused] It's the only row in the whole track that's supposed to go backwards.

A: Step seven, last one. Replace the cat with a preallocated cache. Allocate the full size once per layer, keep a write pointer, write one row at the pointer each step, and attend over everything up to and including the pointer. Check that step three still passes, then rerun the latency plot. On a small model you might see little change, because the step is mostly overhead. With XL, long context and a batch of eight, the copying is easier to see. And then have an agent review it for off-by-one errors in the pointer and the mask, because that's exactly where they hide.

A: So you're done when the two loops give identical tokens for a thousand greedy steps and you can explain why the logits still differ in the fifth decimal place, when you've got the latency plot and can point at where the no-cache curve bends and say why, when your byte count matches the formula exactly for GPT two and XL, and when you've got the Llama cache shape, the cache-on and cache-off timings on the Spark, and that backwards row on the scoreboard.

<!-- section: Measure -->

A: Here's what the numbers should look like. On the Mac CPU, no cache: about seventeen milliseconds at position one, thirty at a hundred, a hundred sixty at five hundred, three sixty at a thousand. With the cache: about eight, ten, eleven, sixteen. Totals, a hundred seventy seconds against twelve. Your Spark columns are blank, that's yours to fill in.

A: First thing to expect: the no-cache curve on the Spark should be a hockey stick, not a straight line. On the Mac CPU, whose ridge point is low, recomputing more tokens costs more almost immediately. The Mac's GPU stayed flat for the first hundred-odd tokens. And the Spark has far more compute per byte than either of those. So with GPT two small, expect a long flat stretch before the bend. Maybe hundreds of tokens. With the eight B, expect the bend near your measured ridge point, from that prediction earlier.

A: Second: the cached curve is flat-ish, not flat. It creeps up because each step reads a longer cache and computes a longer row of scores. On the Mac CPU it went from about eight milliseconds to sixteen over a thousand tokens. And with cat, part of that creep is the copying. Step seven tells you how much.

A: Third, and this one's counterintuitive. For Llama at short lengths, turning the cache off may barely hurt.

B: [skeptical] Turning off the most important inference optimization barely hurts?

A: [thinking out loud] At sixty-four new tokens, yeah. Each no-cache step is a tiny prefill, a few dozen tokens, and the step is still completely dominated by reading sixteen gigabytes of weights. Recomputing sixty tokens is free math under that. The ratio grows with length, and by a thousand twenty-four tokens it should be large. If you want a number to beat: if the bend is near two hundred tokens, the no-cache run of a thousand twenty-four should take a couple of times longer than the cached one, and the gap keeps widening the further you go. But work it out from your own measured FLOPs and bandwidth before you run it.

A: And last, memory. From your byte count it should be a perfectly straight line, and the slope is the formula. From the allocator it's a slightly noisier line. If it jumps in steps, that's PyTorch's caching allocator grabbing memory in blocks and handing it out bit by bit, the stack and heap story again.

<!-- section: Break It -->

A: Then you break it. Four ways. First, forget the position offset. Use zero up to T in the cached path. Every new token now thinks it's at position zero.

B: Does it crash?

A: [amused] No, and that's what makes it nasty. The output stays grammatical for a few words, then it wanders. Your equality check fails within the first couple of steps. It's the most common KV cache bug in the wild, and it hides really well, because the text still looks like English.

A: Second, remove the causal mask. Take it out of both paths and run the check again. The two generations split apart almost immediately. Because now position three's hidden state depends on tokens that arrive later, so the keys you cached at step three are stale by step four. That's the frozen-cards argument breaking in front of you, and it's exactly why encoder models like BERT have no KV cache. Then put the mask back, and break it subtly instead. Use the plain lower triangle for the new-by-total mask, and feed the prompt in two chunks. First half as prefill, second half on top of the cache.

B: And that one runs fine, I'm guessing.

A: [dryly] Single-token decode still works perfectly, because one query needs no mask. But the two-chunk prefill silently gives different logits. No error, nothing. And that's the bug that bites you later, in chunked prefill and in speculative decoding.

A: Third, cache too much. Keep the queries too, and the hidden states. Everything still works. Then measure memory. You've more than doubled the cache, to store things nobody ever reads. It's a good way to feel why the cache holds keys and values and nothing else.

A: Fourth, run it in B F sixteen. Cast the model to B F sixteen on the Spark and run the thousand-token equality check again. And there's a good chance the two loops eventually disagree on a token. And after that first disagreement, they write completely different text.

B: [a bit unsure] So my cache is broken.

A: [reassuring] Nothing's wrong with your cache. B F sixteen keeps only about three significant digits. The cached and uncached paths add numbers in different orders. And somewhere along the way, there's a near-tie between two tokens, and it tips the other way. Print the gap between the top two logits at the first mismatch and you'll see it's tiny. The lesson is that "identical" is a statement about exact math. In low precision, the right test is "same tokens until a near-tie, and tiny logit differences everywhere."

<!-- section: Connections and close -->

A: And one more way it breaks, without you doing anything wrong. If anything about the past changes, like editing earlier text in a conversation, the cache is invalid from that point on. Everything after the edit has to be recomputed. Same goes for sliding windows, where old entries get evicted on purpose, so you have to be careful about what's actually still in there.

A: From here, the memory math episode turns that formula into a real capacity plan. Batching puts many users' caches into one step, which is where the per-user cache becomes the limit. Paged attention and prefix caching stores caches in pages and shares them between requests with the same prompt. Speculative decoding feeds several tokens on top of a cache at once, which is where that shifted mask earns its keep. And if you want to read one thing, read Shazeer's twenty nineteen paper. It's short. Then "Efficiently Scaling Transformer Inference," from Reiner Pope and others at Google, which works the cache through as the memory cost that limits batch size and context, with real numbers.

B: [working it out] Okay, let me try the whole thing. The KV cache stores the keys and values for every past token so you don't recompute them. You don't store queries because they only fed old outputs. It's legal because of the causal mask, nothing can reach back and change an old position. It turns generation from n squared work to n. And the cost is memory, so you shrink it by sharing keys across heads, or using a window, or fewer bits.

A: [gently] That's nearly all of it. Two sharpenings. It's not one key and one value per token. It's one per token in every layer, split across the heads, because each layer computes its own from its own input. Twelve layers' worth in GPT two small. And the cost isn't just memory. Every decode step reads the entire cache back, so a big cache makes every step slower, not just fuller. That's what Shazeer noticed. The cache took the math out of decoding, and left you paying for bytes. Which is why every one of those shrinking tricks pays off twice.
