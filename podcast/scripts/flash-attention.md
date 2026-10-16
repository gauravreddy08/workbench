<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you want to run your Llama on something long. Thirty-two thousand tokens. One big PDF, or a whole codebase, or a day of agent traces. And your attention is the version everybody writes first. Three lines. Multiply the queries by the keys to get a score for every pair of tokens, divide by the square root of the head size. Softmax each row. Multiply by the values. At two thousand tokens, fine. At eight thousand it's noticeably slow, and if you open the profiler, the GPU's busy, but the math units are mostly sitting idle. And at thirty-two thousand, on the Spark, with a hundred and twenty-eight gigabytes of memory... it dies. Out of memory. On the first layer.

B: [surprised] On the first layer? That's... one layer of an eight billion parameter model. How is that more than a hundred gigabytes?

A: Let's actually count it. Llama three point one, eight B, has thirty-two query heads. One layer, one sequence, thirty-two thousand seven hundred sixty-eight tokens, F P sixteen, so two bytes a number. How big is that score matrix? Gut guess.

B: [a bit unsure] I mean, the whole model's like sixteen gigs. So... a few gigabytes? Maybe ten?

A: So every head has a score for every pair of tokens. That's thirty-two thousand times thirty-two thousand, which is about a billion numbers. Per head. Times thirty-two heads, about thirty-four billion numbers. Two bytes each: about sixty-nine gigabytes. For one matrix. And softmax doesn't overwrite it, it writes a brand new matrix of the same size, the probabilities. Both alive at once? About a hundred thirty-seven gigabytes. The Spark has a hundred twenty-eight in total, and it shares that with the CPU.

B: [skeptical] Huh. Okay, but per head that's...

A: Per head it's "only" about two point one gigabytes. But every head needs its own. And at eight thousand tokens, the same pair is about eight and a half gigabytes. That fits. But it still has to be written out and read back through a pipe that moves two hundred seventy-three gigabytes a second. And both of those, the memory and the traffic, grow with the square of the sequence length. Double the tokens, four times the bytes.

B: [confident] So the problem is that attention's quadratic.

A: That's what everybody said, yeah. But look at what's actually big here. The queries, keys and values at thirty-two thousand tokens are tiny. Thirty-two heads, thirty-two thousand tokens, a hundred twenty-eight numbers per token, two bytes. That's about two hundred sixty-eight megabytes each. The output's the same size. A quarter of a gigabyte. The giant thing, the sixty-nine gigabyte thing, is the score matrix. And that's an intermediate. You compute it, you use it once, you throw it away. You never wanted it! You only wanted the output. And everything bad about long-context attention comes from writing that intermediate down.

<!-- section: Origin -->

A: And for a few years, people went after the wrong part of that. By twenty twenty everyone knew attention was quadratic in sequence length, and a little industry of approximations grew up to fix it. Reformer, which used hashing to only compare tokens that land in the same bucket. Linformer, which squashed the keys down with a low-rank projection. Performer, with random features. And a dozen more. They cut the number of flops, the floating point operations, sometimes from N squared all the way down to N. And... mostly, they didn't make training any faster in wall-clock time. And they changed the model's math, which made people nervous to use them.

B: [puzzled] Wait, how do you do less math and not get faster?

A: That's the whole story. In twenty twenty-two, a group at Stanford, Tri Dao, Dan Fu, Stefano Ermon, Atri Rudra and Christopher Ré, published a paper called "FlashAttention: Fast and Memory-Efficient Exact Attention with I O Awareness." And their argument was basically, everyone's been counting the wrong thing. On a GPU, attention isn't limited by flops. It's limited by moving that N by N matrix in and out of the GPU's main memory. Keep it on the chip, and you can do more flops, not fewer, and still finish sooner. With the exact same answer as before. Their kernel trained GPT two about three times faster than the standard implementation, and it made sixteen-thousand-token sequences practical for the first time. And the trick underneath it, computing softmax in one streaming pass, came from a short note at NVIDIA in twenty eighteen, by Maxim Milakov and Natalia Gimelshein. Within two years, FlashAttention, or something built the same way, was inside basically every training and serving stack. PyTorch included.

<!-- section: The Idea: Two kinds of memory on one chip -->

A: So to see why bytes matter more than math, you need the picture of where bytes live on a GPU. You've seen the CPU version. Registers, then L one, L two, L three, then RAM. Each rung bigger and slower than the one above. A GPU has the same ladder, with one big difference. The fast rungs are tiny, and the most important one, you manage by hand.

B: By hand meaning what? I write code that says "put this here"?

A: Yeah, literally. Hang on, let me build up to it. A GPU is made of a lot of S Ms, streaming multiprocessors. Think of each one as a GPU core. It's a block of math units with its own small, fast memory. An A one hundred has a hundred and eight of them. The Spark's chip has dozens, and you'll read the exact count off yours. On each S M, at the top of the ladder, there are registers. The fastest storage there is, private to each thread, a few hundred kilobytes per S M in total. That's where the numbers being multiplied right now actually sit. One rung down, there's shared memory. A small scratchpad on each S M, around a hundred to two hundred twenty-eight kilobytes depending on the chip, that a group of threads fills and reads by hand. That's the one you manage. Other S Ms can't see it. The FlashAttention paper, and most people, just call it S RAM, static RAM. Which is the kind of memory built right into the chip. Super fast, and tiny, because every bit costs several transistors. And on NVIDIA chips the L one cache is carved out of that same S RAM.

B: Okay. And below that?

A: Below that, the L two cache. Shared by all the S Ms, tens of megabytes on a data-center GPU, and the hardware manages it, not you. If something you re-read is still sitting in L two, you skip the trip to main memory. And at the bottom, H B M. High-bandwidth memory. The GPU's main memory, stacked DRAM sitting right next to the chip. Tens of gigabytes, a few terabytes a second. People say H B M for GPU main memory in general. On the Spark it's actually L P D D R five X, shared with the CPU, but it plays the same role. And every tensor you ever allocate in PyTorch lives down there.

A: [slowing down] So picture a pyramid. Registers at the tip, then shared memory, then L two, then a wide base that's main memory. Each rung up is roughly ten times faster per byte and something like a thousand times smaller. On an A one hundred, that's about two hundred fifty-six kilobytes of registers per S M, answering in about one clock tick. A hundred ninety-two kilobytes of shared memory per S M. Forty megabytes of L two for the whole chip. And forty to eighty gigabytes of main memory at one and a half to two terabytes a second. On the Spark, the bottom rung is a hundred twenty-eight gigabytes at two seventy-three gigabytes a second, and a few of the upper rungs you'll check yourself. Every tensor lives at the bottom. Math only happens at the top. And getting from the bottom to the top costs hundreds of clock cycles.

B: Give me the actual numbers for the gap, though. Like on my machine.

A: So on the A one hundred the paper used, the on-chip S RAM moves about nineteen terabytes a second, all the S Ms added together. Main memory, about one and a half. So roughly a twelve times gap. And that S RAM number's just arithmetic, by the way. A hundred and eight S Ms, each moving a hundred twenty-eight bytes per clock tick, at about one point four gigahertz. Multiply it out, you get about nineteen and a half terabytes a second. On the Spark, the gap is wider. Main memory's two hundred seventy-three gigabytes a second on the spec sheet. The S RAM, same arithmetic with its own S M count and clock, is on the order of ten terabytes a second or more. So something like forty times. Every byte you don't send to main memory is worth even more on your machine than on the GPU the paper was written for.

B: [working it out] So it's the same reason NumPy was fast. Keep the data close and reuse it.

A: Same idea, yeah. Except on the CPU, the cache did the keeping for you. Here you do it yourself. And the programming model falls right out of the hardware. A kernel, and this is the GPU meaning, not the operating system one, is one function you launch from the CPU that runs as thousands of copies on the GPU, each on its own slice of the data. Those copies are grouped into thread blocks, usually a hundred twenty-eight or two hundred fifty-six threads, that run together on one S M and share its shared memory. In Triton, which we'll get to, one block is called a program. Each block lands on an S M, loads what it needs from main memory into shared memory and registers, computes, and writes the results back to main memory. Blocks can't see each other's shared memory. And when a kernel ends, everything in S RAM is just... gone.

A: [slowly] So. The only way to pass data from one kernel to the next is through main memory. Hold on to that sentence. The whole thing hangs off it.

<!-- section: The Idea: What naive attention actually does -->

A: Now run those three lines in plain PyTorch and watch the GPU. Each line is at least one kernel. And each kernel reads its inputs from main memory and writes its output back to main memory. Picture it like this. Up top, a wide box, that's H B M. Inside it, little skinny boxes for the queries, the keys, the values, the output. Each of those is N rows by the head size, so N by a hundred twenty-eight. And two big fat boxes, the scores and the probabilities, each N by N. At eight thousand tokens, each fat box is sixty-four times bigger than the queries. Then a dashed line across the middle. That's the slow boundary. On the Spark, two hundred seventy-three gigabytes a second. And below the line, three kernels in a row. Kernel one makes the scores. Kernel two does the softmax. Kernel three multiplies by the values. And the arrows going across that line are mostly thick ones. Kernel one writes the scores up. Kernel two reads them back down, and writes the probabilities up. Kernel three reads those back down. Four passes over N squared numbers. And only four passes over the small stuff.

B: Just because kernels can't hand stuff to each other.

A: Only because of that. So count it, for one head, in numbers. Reading queries and keys, that's two times N times the head size. Writing the scores, N squared. Reading them back, N squared. Writing the probabilities, N squared. Reading the probabilities and the values, N squared plus N times head size. Writing the output, N times head size. Add it up and it's four N squared, plus four times N times head size. Now put numbers in. Eight thousand tokens, head size a hundred twenty-eight. The small part, the stuff you actually care about, is about four million numbers. The N squared part is about two hundred sixty-eight million.

B: [surprised] So the real inputs and outputs are... like two percent?

A: About one and a half percent of the traffic. The other ninety-eight and a half is scores and probabilities, going out to memory and coming back. And that's the minimum. Real eager code is usually worse. There's often a separate kernel just to divide by the square root of the head size, read N squared, write N squared. Another one for the causal mask. That's the rule in a decoder that a token can only look at tokens at or before it, so you set the scores for future tokens to minus infinity before the softmax, and in eager code that's its own pass. Dropout during training, more again. Every elementwise thing you do to the score matrix is two more trips.

A: Now, the roofline, from the bandwidth lesson. Quick reminder of how that worked. Arithmetic intensity is flops done per byte you move to or from main memory. Every chip has a ridge point, its peak flops per second divided by its bandwidth. If your intensity is below the ridge, you're memory-bound. The work finishes when the data finishes arriving, and faster math wouldn't help at all. Above it, you're compute-bound. So for attention, the flops per head are about four times N squared times head size. Half for the scores, half for multiplying by the values. The bytes are those four N squared numbers, at two bytes each. Divide one by the other, and the N squareds cancel, and you get head size over two. With a head size of a hundred twenty-eight, that's sixty-four flops per byte. With sixty-four, it's thirty-two.

B: And the Spark's ridge was...

A: A few hundred. Around four hundred sixty on spec-sheet numbers. An A one hundred is somewhere around a hundred fifty to two hundred. So sixty-four is way off to the left. Memory-bound. And here's the part that's easy to miss. That intensity doesn't have N in it anywhere.

B: [skeptical] Wait, I'd have thought longer sequences help. More work per launch, right?

A: More work, yes. And proportionally more bytes. They both grow as N squared, so the ratio stays put. You never climb out by making the sequence longer. Okay, now try this one. Take kernel one on its own. The scores, queries times keys, one head, eight thousand tokens, head size a hundred twenty-eight. That's a matrix multiply. Compute-bound or memory-bound?

B: I mean, big matmuls are compute-bound. That's the whole thing you learn. So... compute-bound.

A: [amused] That's the rule everyone learns. Let's check it. The flops are two times N times N times head size. That's about seventeen billion. The bytes: it reads the queries and keys, about four megabytes total. Tiny. But it writes the scores. Eight thousand by eight thousand, two bytes each, about a hundred thirty-four megabytes. So the intensity comes out around a hundred twenty-five flops per byte. Which is just the head size again. Now time it on the Spark. The math, at a generous hundred twenty-five teraflops, takes about fourteen hundredths of a millisecond. Writing the scores at two seventy-three gigabytes a second takes about half a millisecond. Three and a half times longer.

B: So it's memory-bound because of the output.

A: [emphatic] Because of the output. Not reading the inputs. Writing the answer. And that's the weird thing about attention's matmuls. The output's way bigger than the inputs. The "big matmuls are compute-bound" rule quietly assumes all three matrices are about the same size. Here, two skinny ones make a giant square one.

<!-- section: The Idea: The obvious fix, and why it is hard -->

A: So. If the scores only go to main memory because kernels can't hand data to each other... then the fix is obvious. Do everything in one kernel. That's called kernel fusion. Merge several operations into one kernel so the in-between results stay in registers or shared memory. Load a few rows of queries, compute their scores, softmax them, multiply by the values, write out the output rows. The scores and probabilities only ever exist inside the S M, a little tile at a time, and they never touch main memory.

B: And why didn't everyone just do that?

A: For elementwise stuff, they did. It's easy, compilers do it automatically. Torch compile will happily fuse the scale, the mask and the exponent into one pass. The problem is softmax. Softmax isn't elementwise. To output even one probability, you have to divide by the sum of the exponentials across the entire row.

B: [working it out] So just keep the whole row on the chip. Compute it, sum it, done.

A: [patiently] How long's a row, though? At thirty-two thousand tokens, one row of scores in F P thirty-two is a hundred twenty-eight kilobytes. That's about the size of an S M's entire shared memory. And a block doesn't want to do one row, it wants sixty-four or a hundred twenty-eight rows at once. It doesn't fit. So it looks like you're stuck. Compute the whole row, store it somewhere, which means main memory, sum it, come back. Which is exactly the round trip we're trying to kill. The way out is to find a way to compute softmax while only ever seeing the row one piece at a time. Never holding all of it. That's called online softmax. But first, one detail about softmax you probably never had to think about.

<!-- section: The Idea: Softmax, the safe way -->

A: You never actually compute e to the score directly. Torch's softmax hid this from you in GPT two. In F P sixteen, the biggest number you can store is sixty-five thousand five hundred and four. And e to the x blows past that at x of about eleven. Scores above eleven are totally normal in attention. Even F P thirty-two overflows at about eighty-nine. On a Mac, e to the twelve in F P sixteen comes back as infinity. And if you take the softmax of a thousand, a thousand and one, a thousand and two, the direct way, you get back not a number, three times. Infinity divided by infinity.

B: So how does anyone do it?

A: You subtract the row's biggest value first. Softmax doesn't care if you shift every input by the same amount. Say you subtract a thousand from all three: you get zero, one, two. Each exponential got multiplied by the same factor, e to the minus a thousand, top and bottom of the fraction, so it cancels. Same probabilities. And if the thing you subtract is the max, every exponent is zero or negative, so every exponential is between zero and one. Nothing can overflow. That's called safe softmax, and every real implementation does it. But it costs three passes over the row. Pass one, find the max. Pass two, add up e to the score minus the max. Pass three, divide each one by that sum. Three reads of every element. If the row's in main memory, three trips. And Milakov and Gimelshein's question, in twenty eighteen, was: can passes one and two be one pass?

<!-- section: The Idea: Online softmax -->

A: So here's the picture. Numbers come at you one at a time, like cards being dealt. And you keep two things on a sticky note. The biggest number you've seen so far. Call it m, for max. And a running sum, call it l, of e to the number minus m, for everything so far. And this part's important: measured against the current max. When a new card comes, two cases. Case one, it's not a new max. Easy. The max stays, you add e to the new number minus the max to the sum. Done.

B: And if it is a new max, then all the old terms in the sum are wrong. They were computed against the old max. So you'd have to go back and redo every one of them.

A: [jumping in] That's what it looks like, but no. You don't need the old numbers at all. Every term in the sum was e to some number minus the old max. You want it as e to that number minus the new max. And the difference between those is the same for every term. It's one factor: e to the old max minus the new max. So you multiply the whole sum by that one number, and every term in it gets moved to the new max at once. Then you add the new card, which is e to the new max minus itself, e to the zero, so just one.

B: [realizing] Oh. It's one multiply. Because they all shifted by the same amount.

A: One multiply. And actually both cases are the same rule. New max is the bigger of the old max and the new number. New sum is the old sum, times e to the old max minus the new max, plus e to the new number minus the new max. When the max didn't change, that factor is e to the zero, which is one, so it's just "add". When the max went up, the factor's less than one, and it shrinks the old sum down to the new scale. And you start the note with the max at minus infinity and the sum at zero. E to the minus infinity is zero, so on the very first card the empty sum just disappears. No special case.

A: Walk it through. Two, one, five, three. Card one, a two. Max is two, sum is e to the zero, one. Card two, a one. Not a new max, so add e to the minus one, about point three seven. Sum's about one point three seven. Card three, a five. New max! So shrink the old sum by e to the two minus five, e to the minus three, about one twentieth. One point three seven becomes about point zero seven. Add one for the five itself. Sum's about one point zero seven. Card four, a three. Not a new max, add e to the minus two, about point one four. Final sum, about one point two zero three.

B: [working it out] And the slow way, max is five, so it's e to the minus three, e to the minus four, one, e to the minus two...

A: Which is about point zero five, plus point zero two, plus one, plus point one four. One point two zero three. Same number.

B: [unconvinced] Okay, but that's one example. It still feels like an approximation. You're kind of patching the sum as you go.

A: Fair, and that's the exact worry people had. But you can prove it, and the proof is short. The claim is: after you've seen some number of cards, the max on your note really is the max of those cards, and the sum on your note is exactly the sum of e to each card minus that max. After one card, true, we just checked it. Now suppose it's true after some number of cards, and one more comes. The new max is obviously the max of all of them. And the new sum is the old sum, which by assumption is exactly every old term against the old max, times the rescale factor, which turns every one of them into exactly that term against the new max. Plus the new card's term. So it's exactly the full sum against the new max. True again. So at the end, the sum is precisely the safe-softmax denominator. Nothing dropped, nothing estimated. The only difference from the three-pass version is floating-point rounding. You still need one more pass to produce the actual outputs, each e to the score minus the max, divided by the sum. But max and sum are now one pass, not two.

A: Now stretch it. Two workers each take half of a row. Each ends up with their own sticky note. Their own max and their own sum. How do you combine the two notes into the note for the whole row, without looking at any of the numbers again?

B: Take the bigger max. And then... each sum gets that same shrink factor, against the bigger max, and you add them.

A: That's it. Each partial sum gets rescaled to the common max, then you add. And the one-card update we just did is the special case where the second worker saw a single card. Their max is that card, their sum is one. And this merge is associative. So you can chop a row into any number of pieces, process them in any grouping, in any order, and merge. That one fact powers a lot of things. FlashAttention, merging tile by tile. Flash-Decoding, which splits the cached keys across lots of S Ms and merges at the end. And ring attention, which splits one sequence across several GPUs.

<!-- section: The Idea: From a sum to an output row -->

A: But attention doesn't actually want the softmax. It wants softmax times the values. For one query row, the output is a weighted average of the value vectors, weighted by the probabilities. And here's the beautiful part. That output can ride along on the same sticky note. Keep a third running thing, call it o, a vector the length of the head size. It's the sum of e to each score minus the current max, times that key's value vector. Un-normalized, not divided by anything yet. When a new score and its value vector come in, you do exactly what you did to the sum. Multiply o by the same rescale factor, then add e to the new score minus the new max, times the new value vector.

B: Same shrink, same new weight.

A: Same shrink, same weight. And at the very end, divide o by l. That turns each weight, e to the score minus the max, over l, into exactly the softmax probability. Same induction proof, word for word. Now do it a tile at a time instead of one key at a time. Grab a block of keys and their values, say sixty-four of them. Compute that block's scores for your query row. Take the block's max. New max is the bigger of your old max and that. Exponentiate the block's scores against the new max. Rescale factor, same as before. Sum becomes old sum times the factor, plus the sum of the block's weights. And o becomes old o times the factor, plus the block's weights times the block's values.

B: Which is just the merge rule. The block's the second worker.

A: Exactly the merge rule. And look at the shape of that last step. Weights times a block of values. That's a small dense matrix multiply. Which is the one thing GPUs are built to do fast.

<!-- section: The Idea: FlashAttention's forward pass -->

A: So now put it together. Give each GPU program a block of query rows, say a hundred twenty-eight. The program loads its query block from main memory into S RAM, once. It sets up a max, a sum and an output for each of its rows, starting at minus infinity, zero, and zero, and those live in registers. Then it loops over the keys and values, one block at a time. Each time: load that key block and value block into S RAM, compute the little tile of scores, its rows by the block's columns, and do the update. After the last block, divide each row's o by its l, and write the output block back to main memory. Plus one extra number per row, for later. The max plus the log of the sum. That's called the logsumexp. It's the log of the softmax denominator, and storing it means the backward pass can rebuild any probability later without recomputing the sum.

A: And the score tile and the probability tile only ever exist in S RAM and registers, one block at a time. Nothing N by N is ever written. Picture stepping through a tiny example, one click at a time. Eight keys in blocks of two, head size two, and one program's two query rows. Up top there's a strip of cells for main memory, and as you click next, two key cells and two value cells light up and slide into the S RAM box, where you see a two by two tile of scores. Below that, a little table, one line per query row, with its max, its sum, its output and the rescale factor. And whenever a row's max goes up, the rescale factor lights up orange, and you can watch that row's sum and output shrink before the new block gets added. There's a counter for "N by N written" that just sits at zero the whole time. And on the last click, it divides, writes the output, and shows you the exact answer computed the slow way next to it. The difference is in the last few decimal places. Rounding. Not approximation.

B: So that's FlashAttention. That's the whole kernel.

A: That's the core of it. Two details from the original paper differ from that picture. The first version actually put the key-value loop on the outside, and the query loop inside. So it had to keep re-reading and re-writing partial outputs in main memory. FlashAttention two swapped the loops to the order I just described. And the paper's full version also fuses the masking and dropout into the same kernel, which this toy leaves out.

<!-- section: The Idea: Counting bytes -->

A: Now the paper's real contribution, beyond the trick, was that they counted. It's right there in the title. I O aware. I O meaning input and output, reads and writes. You judge an algorithm by how many bytes it moves between main memory and S RAM, not just by its flops. So count it for one head. The queries: read once, N times head size. The output: written once, same. The keys and values: read once per query block. So if your query blocks are a hundred twenty-eight rows, you read all the keys and values N over a hundred twenty-eight times.

B: Hmm. So that part's still N squared.

A: Still N squared, yeah. And the block size can't just be huge, because the query tile, a key tile, a value tile and the score tile all have to fit in S RAM at once. So the block size ends up around the S RAM size divided by the head size. Plug that in and you get the paper's theorem: the traffic goes like N squared times head size squared, divided by the S RAM size. Against N squared plus N times head size for standard attention. And they also proved that no exact attention algorithm can do better than that, asymptotically, across all S RAM sizes.

B: [a bit unsure] So it's still quadratic? I thought the whole point was that FlashAttention makes attention linear.

A: [gently] That's the common version of the story, and it's wrong in an interesting way. The flops are still quadratic. FlashAttention doesn't change the work at all. And in that worst-case count, the traffic's still quadratic too. Put real numbers in. Head size a hundred twenty-eight, query blocks of a hundred twenty-eight. Worst case is two N squared numbers, against naive's four N squared. A two times saving. Plus the eager extras. That's it. The paper's clear about this. The saving is in the constant. And it gets better with a bigger S RAM, and worse with a bigger head, because bigger heads mean smaller tiles fit.

B: [pressing] Then why is it so much faster? Two times doesn't sound like the headline.

A: Three reasons, in order of how much they matter on current hardware. One, the keys and values don't actually get re-read from main memory. That worst case assumes every re-read goes all the way down. But the keys and values for one head, at eight thousand tokens, are about four megabytes together. And all the programs working on that same head run at roughly the same time. So their re-reads mostly hit in L two. In the best case, real traffic to main memory is just queries, keys, values and output, once each. That's linear in N. Two, the eager extras vanish. Scale, mask, dropout, softmax, all happen inside the one kernel on tiles that are already in registers. And three, the intensity moves past the ridge. Traffic is about four N times head size, flops are about four N squared times head size, so the intensity is about N flops per byte. At eight thousand tokens that's in the thousands. Way to the right of any ridge point. So FlashAttention turns attention from a memory-bound job into a compute-bound one.

B: Which means after that, you're stuck on the math units.

A: Right, which is why every version after that is about using the math units better. Picture a little traffic counter. You've got a slider for sequence length, and two bars, naive traffic and flash traffic, plus a log-log plot of bytes against N. And a few toggles. The useful one is where the key and value re-reads come from. Set it to "from main memory", the worst case, and drag the slider, and both lines climb with the same slope. The ratio stays at about two, however long N gets. Flip it to "hit in L two", and the flash line flattens to a straight linear slope while naive keeps climbing as N squared. So the gap grows with every doubling. At eight thousand tokens, naive is moving about seventeen gigabytes per layer, and flash in the best case is about a quarter of a gigabyte. Real kernels land somewhere between those two modes, and you'll measure where yours lands.

A: And then there's memory, which is honestly the bigger deal. Naive needs the score and probability matrices for every head. Flash needs two numbers per query row. At thirty-two thousand tokens, that's a hundred thirty-seven gigabytes against about eight megabytes. That difference alone is what made long-context training possible, before you even get to speed.

<!-- section: The Idea: The backward pass -->

B: [skeptical] Okay, but training. The backward pass for softmax needs the probabilities. And you just told me you never stored them.

A: Yeah. The standard backward uses the probability matrix, saved from the forward pass. FlashAttention doesn't have it. So it recomputes it. The forward pass saved the output and that one logsumexp number per row. In the backward, a kernel walks the same tiles again. Reload a tile of queries, keys, values. Recompute that tile of scores. And rebuild the exact probabilities as e to the score minus the logsumexp. No running max this time, because the logsumexp already is the final answer to "what's this row's normalizer". With the probability tile in hand, the gradients just follow from the chain rule, tile by tile. The value gradient picks up the probabilities, flipped, times the output gradient. The gradient of the probabilities is the output gradient times the values, flipped. Then the softmax backward turns that into the gradient of the scores. And the query and key gradients come from the score gradient times the keys, and the queries.

A: There's one neat trick in there. The softmax backward, for each row, needs the sum across the row of each probability times its gradient. That looks like another full pass over the row. But write it out. The probability gradient for one key is the output gradient dotted with that key's value vector. So the sum is: probabilities, times output gradient dotted with values, summed over keys. Pull the output gradient out, and what's left is the probability-weighted sum of the value vectors. Which is the output. You already have it. So that whole row sum is just the output gradient dotted with the output. One dot product per row, done once, before the tile loop even starts.

B: [amused] That's sneaky.

A: It's very sneaky. And the whole backward is a deliberate trade. More flops, fewer bytes. Let's count it. The forward does about four N squared times head size flops. The backward recomputes the scores, then does four more big multiplies. Roughly how much is the backward, compared to the forward?

B: Five matmuls, each about half the forward... so two and a half times?

A: Yep. Each of those is about two N squared times head size, so about ten in total, two and a half times the forward. The standard backward, which reuses the saved probabilities, has four. About two times the forward. So recomputation costs about twenty-five percent more flops in the backward pass. And the paper's backward did more flops than standard attention and still ran faster. Because reading a saved N by N matrix from main memory costs way more time than recomputing it from tiles already sitting in S RAM. And it gets rid of the N squared memory, which is often the real constraint anyway.

B: That's the same thing as gradient checkpointing, right? Throw stuff away in the forward, recompute it in the backward.

A: Same idea, yeah. Activation checkpointing, also called gradient checkpointing, does it at the level of whole layers. Spend cheap compute to avoid expensive bytes. Once you know to look for that trade, you'll see it everywhere in ML systems.

<!-- section: The Idea: FlashAttention two, -3, and what came after -->

A: So once attention's compute-bound, the game changes. It's not "move fewer bytes" anymore. It's "keep the math units busy". And the later versions are mostly about that. FlashAttention two, Tri Dao, twenty twenty-three. About two times faster than the first version, reaching fifty to seventy-three percent of an A one hundred's peak flops. Three changes. First, fewer non-matmul flops. NVIDIA GPUs have tensor cores. Special units that do exactly one thing, small matrix multiply-adds, way faster than the regular math units. Most of a GPU's advertised flops live there. Matrix multiplies on tensor cores run roughly sixteen times faster than the exponentials and divisions on the regular units. So every bit of scalar bookkeeping in the loop is expensive by comparison. FlashAttention two keeps the output un-normalized until the very end, one division per row instead of one per block, and trims everything else it can.

B: [curious] So the rescaling itself is the slow part now.

A: The non-matmul part is, yeah. Second change, parallelize over the sequence. The first version gave one program to each pair of batch item and head. Now picture your case. Batch of one, thirty-two heads, long sequence. That's thirty-two programs. That can be fewer programs than the GPU has S Ms, so some of the chip just sits there. FlashAttention two also splits over query blocks, which is the loop order we walked through. And third, better splitting of work inside a program. A thread block is made of warps, which are groups of thirty-two threads that all execute the same instruction together. FlashAttention two divides the queries among the warps, not the keys. So each warp owns whole rows, and warps don't have to swap partial results through shared memory. Oh, and it skips blocks that are completely masked out for causal attention. If every token can only see the past, about half the tiles are pure future, so that roughly halves the work.

A: Then FlashAttention three, twenty twenty-four. Jay Shah, Ganesh Bikshandi, Ying Zhang, Vijay Thakkar, Pradeep Ramani and Tri Dao. It's specific to the H one hundred, Hopper. It got to about seven hundred forty teraflops in F P sixteen, around seventy-five percent of peak, and close to one point two petaflops in F P eight. The ideas: asynchrony. Hopper has a hardware copy engine, called T M A, and tensor-core instructions that run asynchronously. So FlashAttention three gives some warps the job of loading tiles and other warps the job of doing math. That's called warp specialization. Producer warps that only load, consumer warps that only compute. So the next tile's arriving while the current one's being multiplied. Then there's overlapping softmax with the matmul. The exponentials are slow, and the tensor cores sit idle while they happen. So it staggers two groups of warps, one doing its softmax while the other does its matmul, back and forth. They call it ping-pong. And F P eight, with scaling per block and a trick to spread out outlier values before quantizing.

B: Does any of that run on the Spark?

A: [sighs] Probably not as-is, and this is worth being careful about. FlashAttention three's code depends on Hopper-only instructions. NVIDIA's data-center Blackwell, the B two hundred, got its own rewrite, often called FlashAttention four, in Tri Dao's repository. Check the repo for where that stands. But your Spark's chip is a different Blackwell variant from the B two hundred, and as far as I know, it doesn't have the B two hundred's new tensor-core instructions. So neither three nor four targets it. Check what's actually supported for compute capability twelve point one before you assume anything. What does work everywhere is the algorithm. And PyTorch's own scaled dot product attention, which picks a backend for you.

A: One more relative. Flash-Decoding, from Dao and collaborators, twenty twenty-three. In decoding, you have one new query row and a long cache of keys and values. One query row is one query block, which gives the GPU almost nothing to spread across its S Ms. So Flash-Decoding splits the keys instead, across lots of programs. Each one produces its own max, sum and output. And then they're merged with exactly the two-worker rule from before.

B: [realizing] Oh, so same trick, it just slices the other way.

A: Same trick, opposite axis.

<!-- section: The Idea: Writing a kernel: Triton -->

A: So how do you actually write one of these? You could do it in CUDA C plus plus, managing threads and warps and shared memory by hand. Or Triton. Triton's a language embedded in Python, plus a compiler, from OpenAI, started by Philippe Tillet. And it lets you think one level up. You write the code for one program working on one tile. The compiler figures out how the threads inside that program split the work, when to use shared memory, and how to feed the tensor cores.

A: The basic shape is easiest in a vector add. You write a function for one program. A program is one instance of the kernel, and you launch a whole grid of them. The first thing the function does is ask, which program am I? Zero, one, two. From that it works out which slice of indices it owns. Program two, with blocks of a thousand twenty-four, owns two thousand forty-eight up to three thousand seventy-one. Then it loads that whole tile from main memory in one go, adds, and stores the tile back. And on the Python side, you work out how many programs to launch, the number of elements divided by the block size, rounded up, and launch. One program runs on one S M as one thread block, and lots of them run at once.

B: And "loads the tile", how does it know where the data is?

A: PyTorch tensors arrive as pointers to their first element. So you add your vector of offsets to that pointer, and now you've got a whole vector of addresses, and the load fetches all of them at once. For a two-D tile you build a grid of addresses out of row offsets and column offsets. Row times the row stride, plus column. Broadcast against each other, like in NumPy. Then the mask, which matters a lot. N is almost never a multiple of your block size. Say N is three hundred and the block is a hundred twenty-eight. The third program owns indices two fifty-six to three eighty-three. Only forty-four of those exist. Without a mask, it reads memory past the end of the tensor. Garbage, or a crash. So you pass a mask, a true-or-false for every lane, "is my index less than N". Lanes that are false don't get read, they get a fill value you choose instead, and they don't get written.

A: A couple more things. Block sizes get marked as compile-time constants. Triton compiles a separate version of the kernel for every value, and they have to be powers of two. And everything's a whole-tile operation, like NumPy. A dot product of two tiles, which runs on the tensor cores as long as each dimension is at least sixteen. A max across a row. A sum. An exp. A "where", to pick between two tiles elementwise. 

A: Now the flash kernel as a Triton grid. Picture a grid of little squares. Across, the query blocks: zero, one, two, three. Down, one row per batch-and-head combination. Each square is one program. And it owns, say, query rows a hundred twenty-eight to two fifty-five of head one. Zoom into that square, and it does five things. Load its query tile into S RAM, once. Set up max, sum, output in registers. Loop over every key-value tile, scores, rescale, add. Divide and store its output tile, once. Store the logsumexp, N numbers in total across all the programs. And programs never talk to each other. The last column of squares is drawn dashed, because when N isn't a multiple of the block size, that last query block is partial, so its loads and stores are masked. Nothing N by N ever leaves the S M.

B: [a bit unsure] This feels very far from what I actually use day to day, though.

A: It's closer than you'd think. Triton's been in your stack the whole time. When you call torch compile, its default backend, Torch Inductor, writes Triton kernels for your fused elementwise and reduction ops. Set the TORCH LOGS environment variable to "output code" on any compiled model and you can read them. After this, they'll look familiar.

<!-- section: The Idea: Benchmarking a kernel without lying to yourself -->

A: Okay, timing. GPU timing has more ways to be wrong than right. Six rules. One, synchronize. A kernel launch is like the async calls from the waiting-versus-working lesson. It returns the moment the work's been queued, not when it's done. So if you time it without calling torch's cuda synchronize, or using CUDA events, you're measuring how fast Python can queue work. And you'll get numbers that beat the hardware's peak.

B: [laughs] Which would be very exciting for about five minutes.

A: Until you check them. Two, warm up. The first call to a Triton kernel compiles it, which takes hundreds of milliseconds, sometimes seconds. The first matmul call into cuBLAS, that's NVIDIA's library of tuned linear algebra kernels, the thing PyTorch calls when you multiply two matrices on the GPU, may run a little search to pick a kernel. And PyTorch's memory allocator grabs memory from the driver the first time, and reuses it after. So run everything a few times before you start the clock. Three, repeat it a lot and use a robust statistic. The median, or the mean with the spread. GPU clocks move around with temperature and power. Four, watch the cache. If you run the same small kernel a hundred times in a row, its inputs might just sit in L two, and you're measuring L two speed, not main memory speed. Triton's do-bench helper clears L two between runs by writing a big buffer. Check the source of your version to confirm that. Five, check correctness before speed. A wrong kernel can be extremely fast. Compare against a reference first, with a tolerance that fits the type. F P sixteen attention typically agrees to about one part in a thousand, not one in a million. And six, time only the kernel. Allocate inputs outside the timed part, and keep shapes fixed so nothing recompiles.

A: Do-bench does most of this for you. It warms up, synchronizes, flushes L two, runs repeatedly for a target amount of time, and gives you back milliseconds. In recent versions the warmup and repeat arguments are in milliseconds and the default statistic's the mean, but read the docstring for your version. And for memory, reset PyTorch's peak memory stats right before a call, and read the max memory allocated right after. That's the high-water mark.

<!-- section: Build It -->

A: So, building it. Three builds, each one closer to the metal. The first two run on your Mac. The third needs the Spark. First one's online softmax in NumPy, and you write it yourself, because the whole point is that your fingers learn the rescale. Four little functions. A safe softmax, the three-pass one. A one-pass function that walks the array one element at a time and gives back the max and the sum. An online softmax that uses that, plus one more pass for the outputs. And a merge, that takes two sticky notes and gives back one. Then you test it on ten thousand random numbers at three different scales, one, ten and a hundred. Compare online against safe. Then split the array into seven uneven chunks, run each one separately, merge them all, and check you get the same max and sum as one pass over the whole thing. And at the end, do the overflow on purpose. A thousand, a thousand and one, a thousand and two, the naive way.

A: A couple of hints. Start the max at minus infinity and the sum at zero. NumPy's e to the minus infinity is exactly zero, and that's what makes the first step work with no special case. Merging with an empty note, one whose max is minus infinity, should change nothing. Check that it doesn't. And in float sixty-four the online and safe versions should differ by about one part in a million billion. If yours differ by more than about one in a trillion, some term is being rescaled against the wrong max.

A: Second build, the real algorithm in NumPy, with tiles. A naive attention that builds the whole N by N matrix. And a tiled one that never builds anything bigger than one block of queries by one block of keys. Outer loop over query blocks, inner loop over key blocks, and for each query block you carry the max, the sum, and the accumulated output. The inner loop body is yours. Then you test it hard. N of a thousand, which isn't a multiple of sixty-four, so the last blocks are partial. Head size sixty-four. In float sixty-four and float thirty-two. The biggest difference from naive has to be under a hundred-thousandth. On the Mac it came out around four times ten to the minus sixteen in float sixty-four, and about eight billionths in float thirty-two.

B: [impressed] So basically identical.

A: Basically identical. Then two edge cases. Blocks of one, which is pure online softmax, one key at a time. And blocks of N, one giant block, where it just becomes naive. Both still have to match. Then add a causal option. Set the scores for future keys to minus infinity before taking the max. And skip key blocks that are entirely in the future of the whole query block. Count how many you skip for N of a thousand twenty-four with blocks of sixty-four. It's a bit under half. And measure the peak memory with Python's tracemalloc, at about one thousand, four thousand and eight thousand tokens.

A: Then the Spark. Setup first, and with kernels, versions matter more than anywhere. NVIDIA's recommended path is their PyTorch container from N G C, which ships PyTorch, CUDA and Triton built for the GB ten. If you use your own environment, you need a PyTorch build that supports compute capability twelve point one, and a Triton new enough to know Blackwell. Triton three point three and later added Blackwell support, but check the release notes for the GB ten specifically. If kernels fail to compile with an unknown-architecture error, switch to the container before you debug anything else. Then a tiny script that prints your versions, the device's compute capability, which should say twelve, one, the number of S Ms, total memory, shared memory per S M, the L two size and registers. Those are the Spark numbers that were marked "check" on the memory pyramid, and now you fill them in. Run Triton's vector-add tutorial as a smoke test. And one debugging tool worth knowing now. Set TRITON INTERPRET to one, and your kernels run on the CPU, in an interpreter. Slowly. But print works and a debugger works. Use it any time a kernel gives you wrong numbers.

A: Third build, a warmup kernel. Fused softmax in Triton, one row per program, one read and one write of main memory. You load the row with a mask, and the fill value for the lanes past the end is minus infinity, not zero. Why minus infinity?

B: [working it out] Because if it were zero, and the real scores were all negative, zero would win the max. And then e to the zero is one, so the padding adds to the sum. Minus infinity can't win the max, and its exponential is zero.

A: That's exactly it. Then you subtract the max, exponentiate, sum, divide, all in float thirty-two, and store with the same mask. Check it against torch's softmax on a few shapes, including a nasty one, one row of thirty-seven. Then benchmark three versions. Yours, torch's softmax, and an eager version written as separate steps: max, subtract and exp, sum, divide. And report gigabytes a second. An ideal softmax reads and writes each element once, so the bytes are two times rows times columns times the element size. Compare against two seventy-three. Yours and torch's should be close to each other. The eager one should be several times slower. Count how many passes over main memory the eager one makes, and see if that predicts the gap.

A: Then the real thing. A FlashAttention forward kernel in Triton. Simplified: forward only, no causal mask, no dropout, F P sixteen inputs, F P thirty-two running totals, head size sixty-four or a hundred twenty-eight. One program per query block per batch-and-head. The wrapper and the setup are given. Loading the query tile once, starting the max at minus infinity, sum and output at zero. The loop body is yours, and it's the same loop as your NumPy one, just with Triton's tile functions. Load the key tile transposed, masked. Dot it with the query tile and scale. Set any columns past the end of the sequence to minus infinity. New max, exponentials, rescale factor. Update the sum. Load the value tile, rescale the output and add the weights times the values. Update the max.

A: The hints that'll save you time. The dot product wants both inputs the same type. Your weights are F P thirty-two, so cast them to F P sixteen before the second dot. But keep the accumulator in F P thirty-two. Test it against PyTorch's scaled dot product attention with a tolerance of about two hundredths, at N of a thousand twenty-four, a thousand, which has partial blocks, and seventy-seven. When it's wrong, rerun in interpreter mode with N of seventy-seven and print the max after every block. And once it works, try the base-two exponential with the conversion folded into the scale, because the hardware's native exponential is base two. See if it's measurably faster. Then go read Triton's official fused attention tutorial. Same algorithm, plus causal masking, a backward pass, auto-tuned block sizes and hardware tricks. You'll be able to read it now.

A: The fifth task's just boilerplate. Hand it to an agent if you like, but write your predictions down first. It benchmarks three things. Naive attention, PyTorch's scaled dot product attention, and yours. Batch one, thirty-two heads, head size a hundred twenty-eight, sequence lengths doubling from five hundred twelve up to sixteen thousand. For each, it checks yours is correct, times all three with do-bench, measures peak memory, and catches out-of-memory errors. Then a plot, two panels side by side, time against N and peak memory against N, both on log scales. And also find out which backend PyTorch's attention actually used. You can force each one in turn. Flash, memory-efficient, cuDNN, and plain math. And see which run and which refuse with "no available kernel". On a new architecture, the flash backend might not be built for it yet, and PyTorch silently falls back to something else.

B: And what happens if I just run naive at thirty-two thousand?

A: Naive needs about a hundred thirty-seven gigabytes there. You predicted that. And on the Spark, memory's shared with the operating system. So instead of a clean out-of-memory error, you might get the Linux out-of-memory killer just ending your process. Or the machine starts swapping. Try it once, on purpose, by itself, nothing else running, and watch free memory in another terminal.

A: And the last task, have an agent review your kernel for the bugs that pass small tests. Mask mistakes when N isn't a multiple of the block. A row that could end up all minus infinity, which turns into not-a-number. Integer overflow in the offsets for really big tensors. Wrong strides if the input isn't laid out contiguously in memory. And F P sixteen accumulation anywhere it should be F P thirty-two. Then you fix what it finds, yourself. You're done when your online softmax matches to about one in a million billion and the merged chunks match one pass. When tiled attention matches naive, causal and not, any block sizes, with memory that grows in a straight line. When your Triton kernels pass at seventy-seven and a thousand. And when you can explain every gap between your kernel, PyTorch's and naive, in bytes and flops.

<!-- section: Measure -->

A: For measuring, you fill in a table on the Spark. Batch one, thirty-two heads, head size a hundred twenty-eight, F P sixteen, forward only. Sequence lengths from a thousand up to thirty-two thousand. Time and peak memory for naive, PyTorch, and yours, plus your teraflops. And there's a prediction column you fill in before you run anything. Plus a small one for softmax: gigabytes a second for yours, torch's and eager, on a four thousand by four thousand and a four thousand by thirty-two thousand input, with the eager passes you counted.

A: Here's what the NumPy builds did on a Mac, in float thirty-two, head size sixty-four. Naive attention's peak memory: about eighteen megabytes at a thousand tokens. Two hundred seventy-three megabytes at four thousand. About a gigabyte at eight thousand. Tiled, with blocks of sixty-four: half a megabyte, then one point two, then two point three. So naive grows four times every time N doubles, and tiled grows two times. That's N squared against N, measured, not asserted.

B: [hopeful] And the tiled one's faster too?

A: [amused] No! It was slower. At four thousand tokens, about a third of a second against about an eighth. Because NumPy can't fuse. Every line in your inner loop is a separate pass over a small array, and the Python loop adds overhead on top. Tiling only pays off when the tiles stay on the chip. And that's the thing Triton adds.

A: On the Spark, these are predictions from the counting, not measurements. The point is to check them. Naive time should grow as N squared, and be memory-bound. At eight thousand tokens, naive moves about seventeen gigabytes per layer. At two seventy-three gigabytes a second, that's at least about sixty-four milliseconds. The flops, about one point one trillion, would take only about nine milliseconds even at a generous hundred twenty-five teraflops. So expect naive to land near or above that memory floor. Naive memory grows as N squared and then falls off a cliff. About eight and a half gigabytes of scores and probabilities at eight thousand, thirty-four at sixteen thousand, a hundred thirty-seven at thirty-two thousand, which doesn't fit. PyTorch's attention and yours: time still grows as N squared, but memory stays flat. The extra memory beyond the inputs and output should be a few megabytes at every N. If PyTorch's peak memory grows as N squared, it fell back to the math backend, and you'll already know that from the backend check.

B: How close should mine be to PyTorch's?

A: A first, untuned Triton kernel within one and a half to three times of a production backend is a good result. Work out your teraflops and compare with the matmul plateau you measured in the bandwidth lesson. That plateau's your ceiling, and FlashAttention-class kernels on mature hardware get fifty to seventy-five percent of it. Then try block sizes of sixty-four and a hundred twenty-eight, and four or eight warps per program. The best values depend on the chip's shared memory size, which is exactly why real kernels auto-tune. And for softmax, the fused versions should hit a big fraction of two seventy-three on big inputs, and eager should be slower by roughly the ratio of passes you counted.

<!-- section: Break It -->

A: Now break it. Five ways. First, drop the max subtraction. In your Triton softmax, just exponentiate directly, and feed it F P sixteen rows scaled up by twenty. You get infinity, then not-a-number from infinity over infinity. Same as on the Mac. And the thing to take from it is that the running max isn't an optimization you can skip. It's what makes F P sixteen attention possible at all.

A: Second, forget the rescale. In your NumPy tiled version, take out the rescale on the output, but keep it on the sum. Run your tests.

B: [confident] They'd fail, presumably. You'd be adding stuff at the wrong scale.

A: [amused] Maybe! The output's wrong, but how wrong depends on the data. If the biggest score in every row happens to land in the first key block, the max never goes up after that, the rescale factor's always one, and the bug's invisible. Random data can do that to you. So build a test where the max is in the last block. Add a big constant to the last few keys' scores. And watch it fail loudly. That's why random-data tests alone aren't enough for kernels.

A: Third, forget the mask. Take the masks off the key and value loads in your Triton kernel and run N of a thousand with blocks of sixty-four. Sometimes you get wrong answers, because it read past the end into whatever was next in memory. Sometimes an illegal memory access error. And sometimes, worst of all, correct-looking output, because the memory past the end just happened to be zeros. Then put the load masks back, and take out only the line that sets out-of-range scores to minus infinity. Now the padded keys have a score of zero. Their value rows were loaded as zeros. So why's the answer wrong?

B: [working it out] Because... they still count in the sum. The padding keys add e to the zero minus the max to the denominator. So every real probability gets divided by a slightly bigger number, even though the padding adds nothing on top.

A: Yep. They steal weight. Every real weight shrinks. Fourth, lie with a benchmark, on purpose. Time your kernel with a plain Python timer around a single call, no warmup, no synchronize. Then with warmup, but no synchronize. Then properly. Write all three down. The first one includes compiling, hundreds of milliseconds or more. The second measures launch overhead, absurdly fast. The third's real. Then measure the actual bytes to main memory with Nsight Compute. That's NVIDIA's kernel profiler, the N C U command. It runs a kernel under hardware counters and reports bytes moved at each memory level, achieved flops, stalls, all of it. Run it on a script that does one call at eight thousand tokens and ask for DRAM bytes read and written. The exact metric names on the GB ten might differ, and unified memory may report them differently, so query the list first. And see where your kernel lands between the worst case and the best case from the traffic counter. That tells you how much L two is saving you.

A: And fifth, ask for too much S RAM. Set both block sizes to two hundred fifty-six with head size a hundred twenty-eight. Triton should refuse with an "out of resources, shared memory" error that tells you how much it wanted and how much the chip has. And that number, how much the chip has, is the S RAM size in the paper's theorem. Find the biggest block sizes that compile. Then check whether the biggest is the fastest.

B: [confident] I'd assume it is. Bigger tiles, fewer re-reads.

A: Often it isn't. Bigger tiles mean fewer programs fit on one S M at a time. And the GPU hides memory waits by switching to another program that's ready to go. With fewer programs resident, it has less to switch to while it waits.

<!-- section: Explain It Back -->

B: [thinking out loud] Say I'm in an interview and they want a new attention variant made fast. Like, a learned bias per head added to the scores, and some different normalization instead of softmax. Where do I even start?

A: You start boring. Write the reference in plain PyTorch, and a test harness with awkward shapes, so every faster version has something to match. Then ask the FlashAttention question. Can this be computed one key tile at a time, with a small running state per query row? And can two partial states be merged exactly? An additive bias you can compute per tile is easy. Just add it to the score tile before you take the max. A different normalization needs its own running statistic and its own merge rule, the way softmax has the max and the sum. If it has one, it tiles. If it genuinely needs the whole row at once, you need two passes, or a different algorithm. Then count bytes and flops, so you know whether the fused kernel should end up memory-bound or compute-bound. Write it in Triton starting from a flash kernel that already works. Check it's exact. Benchmark properly, warmed up, synchronized, with do-bench, at several sequence lengths, against PyTorch's attention on the plain softmax case. Profile with Nsight Compute to see how close you are to the roofline. And only then tune block sizes and warps.

<!-- section: Go Deeper and Connections -->

A: If you read one thing after this, read the FlashAttention paper itself. Section two for the hardware model, the algorithm, and the main theorem. And Milakov and Gimelshein's online softmax note, which is four pages. And it all ties back. This is the roofline applied to one single operation: naive attention sits left of the ridge, and FlashAttention drags it to the right. The tiling is the same reuse as the caches lesson, just done by hand in shared memory. And when you get to the KV cache, and paged attention, and the serving engines like V L L M and S G Lang, the attention kernels in there are this, and you can read them now.

<!-- section: Close -->

B: [working it out] Okay, let me try to say it. Naive attention's slow because it's three kernels, and kernels can only talk through main memory, so the giant N by N matrix goes out and back twice. FlashAttention does it all in one kernel, a tile at a time, using online softmax to keep a running max and sum. So it makes attention linear instead of quadratic.

A: [gently] Almost all of that. Except the last part. The math is still quadratic. Every query still meets every key, same flops, same answer. What becomes linear is the memory. Two numbers per row instead of the whole matrix. And the traffic, in practice, when L two holds the keys and values. FlashAttention doesn't do less work. It stops writing down an answer you were only ever going to throw away. And once it stops, the bottleneck moves from the memory pipe to the math units, which is where you want it.
