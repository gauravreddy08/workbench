<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you've got your own Llama, the one you wrote from scratch. And you want to point it at something long. A whole codebase, a day of agent traces, one of those enormous PDFs. Thirty-two thousand tokens, say. And your attention is the version everybody writes first. Queries times keys gives you scores, softmax the scores, multiply by the values.

B: Three lines. I've written it a bunch of times.

A: Everybody has. So you try it. On a short input, fine. Medium-length, it's noticeably slow, and if you look at a profiler, the GPU looks busy but its math units are mostly sitting idle. And at thirty-two thousand tokens, the Spark, with all that memory, just dies. Out of memory. On the first layer.

B: [skeptical] On the first layer? There's a lot of memory in that box.

A: There is. Now here's the strange part. The queries, the keys, the values, at that length, they're small. A few hundred megabytes each. The output's the same size. None of that is the problem. The problem is the scores in the middle. Every word scored against every other word. That's a table, words by words, for every head. And at thirty-two thousand words, that table, plus the softmax of it, is bigger than the Spark's entire memory.

B: And you only need it for a moment.

A: You compute it, use it once, throw it away. You never wanted it. You only wanted the output. And everything bad about long-context attention comes from writing that table down.

<!-- section: Counting the wrong thing -->

B: Okay, but attention is quadratic. Everyone knows that. So isn't the fix just, do less math? Approximate it somehow?

A: [warm] That's exactly what a whole wave of people thought. Around twenty twenty, everyone knew attention grew with the square of the length, and there were a dozen clever approximations. Hashing, low-rank tricks, random features. They cut the amount of math, sometimes a lot. And mostly, they didn't make training any faster on a real clock. And they changed the model's answers, which made people nervous.

B: Huh. Less math, but not faster.

A: Less math, not faster. And then in twenty twenty-two, Tri Dao and colleagues at Stanford publish FlashAttention. And their argument is basically, you've all been counting the wrong thing. On a GPU, attention isn't limited by math. It's limited by moving that giant table in and out of memory. Keep it on the chip, and you can even do more math, and still finish sooner. With the exact same answer.

B: Exact. Not approximate.

A: Exact, to the last rounding error. Their kernel trained GPT two about three times faster, and made long sequences practical for the first time. And within a couple of years, it, or something built the same way, was inside basically every training and serving stack there is.

<!-- section: Two kinds of memory -->

A: To see why, you need a picture of the GPU's memory. You know the ladder on a CPU. Small fast caches near the core, big slow memory further away. A GPU has the same ladder, but the fast rungs are tiny, and the most important one you manage by hand.

B: Which one's that?

A: Each little compute unit on the chip has a small scratchpad right next to its math units. Really fast, really small. People call it SRAM. Then there's the big main memory where every tensor you make in PyTorch lives. Big, and much slower. On your Spark the gap between the two is even wider than on the data-center chip the paper used, because the Spark's main memory is slow.

B: Okay.

A: And here's the sentence everything hangs off. A GPU program, a kernel, loads what it needs into its scratchpad, does its work, and writes results back to main memory. When it finishes, everything in the scratchpad is gone. So the only way to pass anything from one kernel to the next is through main memory.

B: [working it out] And my three lines are three kernels.

A: At least three. So the first one computes the scores and writes that whole giant table out to main memory. The next one reads it all back in, does the softmax, and writes another giant table out. The third reads that back, multiplies by the values. The giant table makes a round trip, twice, only because kernels can't hand data to each other any other way. When you count it up, the useful inputs and outputs are a tiny sliver of all the traffic. The rest is that table going out and coming back.

B: But the first step's a big matrix multiply. And big matrix multiplies are compute-bound. That's the one thing GPUs are great at.

A: That rule assumes the output's about the same size as the inputs. Here it isn't. You read two small things and write one enormous thing. So even that matrix multiply ends up waiting on memory, writing its output. Which is the same story as the Spark writing text. The chip's capable of tons of math, and it's sitting there waiting for bytes.

<!-- section: Why you can't just fuse it -->

B: So just do it all in one kernel. Keep that table on the chip.

A: That's the obvious fix, and it has a name, kernel fusion. And for simple steps it's easy. Scaling, masking, the exponent, those happen one number at a time, and compilers fuse them for you. The problem is the softmax.

B: Because softmax needs the whole row.

A: Right. To get even one probability, you divide by the sum over the entire row. And a row at that length is about as big as one compute unit's whole scratchpad. And it wants to work on a bunch of rows at once. You can't hold a full row on the chip. So it looks like you have to compute the whole row, park it in main memory, add it up, and come back. Which is exactly the round trip you were trying to kill.

B: Hmm.

A: And it's actually worse than that, because of a detail you might have skipped. You never compute softmax the naive way. In sixteen-bit numbers, the exponent overflows on scores that are completely normal in attention. You get infinity, and then infinity divided by infinity, and your whole row comes back as not-a-number.

B: Oh, right, you subtract the max first.

A: You subtract the row's biggest number first. Shifting every score by the same amount doesn't change the softmax, and now nothing can overflow. Every real implementation does it. But now it's three passes over the row. Find the biggest. Add up the exponents against it. Then divide. So the question somebody at NVIDIA asked back in twenty eighteen was, can the first two be one pass?

<!-- section: The sticky note -->

A: [relaxed] So here's the scene. Numbers are being dealt to you one at a time, like cards. You're not allowed to keep them. You only get a sticky note, and on it you write two things. The biggest number you've seen so far. And a running sum of exponents, all measured against that biggest number.

B: Okay. And when a new card comes in that's smaller?

A: Easy. Biggest stays the same, you add its exponent to the sum. Done. The interesting case is when a new card is bigger than anything you've seen. Now your running sum is measured against the wrong number. Every term in it was computed against the old biggest.

B: [working it out] So you'd have to go back and redo all of them.

A: That's what it looks like. But you don't. Because shifting every one of those terms from the old biggest to the new biggest is the same as multiplying each of them by the same factor. So you can fix the whole sum at once, by multiplying it by one number. Shrink the old sum, then add the new card.

B: Oh. That's it?

A: That's it. When the biggest doesn't change, the factor is just one, and it's plain adding. When it does change, the factor shrinks the old sum down to the new scale. And at the end, the number on your sticky note is exactly the sum you'd have got from doing it the slow way, with all the cards in front of you. Not approximately. Exactly. You can prove it in a few lines.

B: And can two people each do half a row and then combine sticky notes?

A: Yes, and that's the part that makes everything work. Take the bigger of the two biggests, shrink each person's sum to match it, and add. So you can chop a row into any number of pieces, do them in any order, and merge. That one fact powers FlashAttention. And versions that split work across lots of compute units, and even across GPUs.

<!-- section: The output rides along -->

B: But attention doesn't want the softmax. It wants the softmax times the values.

A: And here's the lovely part. That can ride on the same sticky note. You keep a third thing. A running weighted sum of the value vectors, also measured against the current biggest. When the biggest goes up, you shrink it by the same factor. At the very end, you divide by the running sum, and out comes exactly the attention output.

B: So you never needed the whole row of probabilities at once.

A: Never. So now FlashAttention is simple to say. Each program on the GPU takes a block of queries and loads them into its scratchpad, once. Then it streams through the keys and values, one tile at a time. For each tile, it computes that little patch of scores, updates its sticky notes, and moves on. At the end, it divides and writes its output, once. The score table only ever exists one small tile at a time, on the chip. Nothing table-sized ever touches main memory.

B: And the speed?

A: Now the traffic is roughly just reading the inputs and writing the output. The math is the same as before, all of it. So the job flips. It was stuck waiting on memory. Now it's busy doing math. It's compute-bound. And memory goes from that giant table down to a couple of numbers per row. At thirty-two thousand words, that's the difference between more than your whole machine and a few megabytes.

<!-- section: Recompute instead of remember -->

B: What about training though? The backward pass normally uses those probabilities. And you never stored them.

A: So it recomputes them. The forward pass saves the output, plus one number per row that sums up its softmax. In the backward pass, it walks the same tiles again, recomputes the scores, and rebuilds the exact probabilities from that one saved number. Tile by tile, never the whole table.

B: That's more math.

A: It's more math. And it's still faster. Because reading a giant saved table back from main memory costs way more time than recomputing it from tiles that are already sitting on the chip. That's a trade you'll start seeing everywhere once you look for it. Spend cheap math to avoid expensive bytes. It's the same idea as checkpointing in training, throwing away activations and recomputing them later.

B: And the later versions? FlashAttention two, three?

A: Once attention's compute-bound, the game changes. It's not about moving fewer bytes any more, it's about keeping the math units busy. The math units are really fast at matrix multiplies and comparatively slow at things like exponents and divisions, so the second version squeezes those down and splits the work better across the chip. The third one is tuned for one specific data-center GPU, overlapping loading with math. And there's a sibling for writing text, where there's just one query and a long cache of notes. It splits the keys across lots of compute units instead, and merges their sticky notes at the end. Same trick, other direction.

<!-- section: Building it -->

B: And you actually write this yourself?

A: You write it in Triton. It's a Python-like language for GPU programs, where you write the code for one program working on one tile, and the compiler handles the fiddly thread stuff. It's actually what torch compile writes under the hood, so it's been in your stack all along. But the thing that surprised me was before I even got to the GPU. I built the tiled version in NumPy on my Mac first. And the memory behaved exactly as promised. Double the length, and the naive one used four times the memory, the tiled one twice. But the tiled one was slower.

B: [surprised] Slower? I thought speed was the point.

A: So did I. But NumPy can't keep anything on the chip. Every line in my little loop was its own trip over memory, plus a Python loop on top. Tiling only pays when the tiles actually stay on the chip, and that's the bit the GPU kernel adds. Same algorithm, wrong machine.

B: Any nasty bugs?

A: One I love. Forget to shrink the running output when the biggest number goes up. Your tests might pass. Because if the biggest score in every row happens to land in the first tile, the factor is always one, and the bug is invisible. You have to build a test where the biggest score shows up late. Random test data alone isn't enough for kernels.

<!-- section: Ending -->

B: Okay. Let me say it back. Attention on long inputs is slow because the score table gets so big, and it's quadratic. FlashAttention cuts it into tiles and keeps them on the chip, using a running max and a running sum, so you never write it out. And it's an approximation, but a really good one.

A: Almost all right, but two bits to sharpen. It's not an approximation. The sticky note gives you exactly the same answer, because shrinking the old sum when the max goes up fixes every past term at once. And quadratic isn't really why it was slow. The math is still quadratic, and FlashAttention does all of it. It was slow because that table kept making round trips to main memory. Take away the round trips, and the same math that used to sit waiting is suddenly the only thing left.
