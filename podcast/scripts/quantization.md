<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you've got this ceiling on the Spark. Llama, the eight billion one, writes about seventeen words a second, and it can't go faster no matter how clever your server is. Because every word means dragging the whole model across from memory, and memory only moves so fast.

B: Right. Speed is the model's size against how fast memory hands it over.

A: That's the one. So the cheapest way past the ceiling is obvious. Make the model smaller. Every weight is stored as a sixteen-bit number. Store it in four bits instead, and the same pipe should carry you to something near fifty-five words a second. Without touching anything else.

B: That sounds almost too easy.

A: It sounds easy. So I tried the obvious version. I took a small model, one of the little Qwen ones, on my Mac. For each weight matrix, I found the biggest value in it, scaled everything so that biggest value landed at the top of a four-bit range, and rounded every weight to the nearest whole number. That's a real quantizer. On paper it's fine.

B: And?

A: And the model was gone. Not slightly worse. Gone. There's a score called perplexity, which is basically how surprised the model is by real text. Lower is better. A good small model sits around fourteen, meaning it's about as unsure as picking between fourteen words. After my rounding it was in the tens of millions.

B: [laughs] So it's guessing.

A: Like a random number generator with opinions. And then I changed one thing. Same four bits. Instead of one scale for a whole matrix, I gave every little run of a hundred and twenty-eight weights its own scale. And the model came back. A bit worse than the original, but completely usable. And there are four-bit versions of Llama that thousands of people run every day, and on most chat tasks you can barely tell them from the original.

B: [skeptical] Okay, but that's weird. Four bits is four bits. I'd have thought fewer bits just means a little less accurate, everywhere, evenly.

A: That's the picture most people start with. And the whole story is about why it's wrong. Same bit count, and the result goes from unchanged to destroyed, depending on choices that have nothing to do with the number of bits.

<!-- section: A ruler with fewer marks -->

A: So think of a ruler. A good ruler has a mark every millimetre. A cheap one has a mark every centimetre. If you measure a pencil with the cheap one, you write down the nearest mark. You're never off by more than half a centimetre, and all you have to remember is a small whole number.

B: And that's what quantization is. A cheap ruler for weights.

A: That's exactly what it is. A sixteen-bit weight can be one of tens of thousands of values. A four-bit weight can be one of sixteen. You decide where those sixteen marks go, snap every weight to its nearest mark, and store which mark it was. When you need the weight back, you look up where that mark sits. And the worst you can ever be off is half the gap between marks.

B: So every extra bit doubles the marks, halves the gap.

A: Halves the gap, halves the error. Which also tells you why eight bits is forgiving and four bits isn't. Going from eight down to four, the error gets a lot bigger, not twice as big. And then there are two numbers that describe the ruler. The gap between marks is called the scale. And which mark means exactly zero is called the zero-point. Zero matters, by the way, because networks are full of real zeros, and a ruler that can't land on zero turns each of them into a small wrong number.

B: Fine. So where did my matrix go wrong? It's one ruler.

A: One ruler for the whole matrix. And the ruler has to stretch to cover the biggest value in it. Now imagine almost all the weights are tiny, bunched up near zero, and there's one weight way out on its own, many times bigger than everyone else.

B: Oh. So the marks have to be spread out wide enough to reach that one.

A: And now the gap between marks is bigger than most of the weights. So most of the weights round to zero. When I looked at one real matrix in that little Qwen, the vast majority of its weights had been rounded to exactly zero. The matrix was basically the outlier plus a few survivors.

B: [working it out] So the ruler gets set by the one number you care least about getting precise.

A: That's the whole problem in one line. And it means the most important choice isn't how many bits. It's how many weights share one ruler. One ruler per matrix, and one outlier ruins millions of weights. One ruler per row, and it only ruins its row. One ruler per small group, a hundred and twenty-eight weights, and the damage stays inside that little group. Everyone else is fine.

B: Why not go all the way then? One ruler per weight.

A: [laughs] Because then you're storing a ruler for every weight, and you've saved nothing. Every ruler costs bytes. That's why a four-bit model is never exactly a quarter the size. The scales come along for the ride. And since speed is all about bytes, those scales cost you a bit of speed too.

<!-- section: The giant numbers are real -->

B: Is that outlier thing real though? Or is it a toy problem?

A: For weights, it's real but manageable. Groups handle it. The scary version is somewhere else. And the history here is kind of nice. Quantization is older than language models. Around twenty eighteen, a team at Google wanted image models to run on phones, and phone chips are much faster at small integer math than at decimals. So they wrote down the scheme everyone still uses. Every number is a small integer plus a shared scale and a zero-point. And for image models at eight bits, it just worked.

B: And then the models got huge.

A: Twenty twenty-two. There are models with a hundred and seventy-five billion weights that need several big data-center GPUs just to hold them. And people try the old eight-bit recipe, and it breaks. Tim Dettmers figured out why. It's not the weights. It's the activations.

B: Activations being the numbers flowing between layers.

A: Right, the vectors that get multiplied by the weights. They change with every word, so you can't inspect them ahead of time. And Dettmers found that in big models, a handful of channels in those vectors are enormous. Hundreds or thousands of times bigger than the rest. On almost every word. In the same few positions, layer after layer.

B: That sounds like a bug.

A: It sounds like a bug, but it isn't. The model uses them on purpose, like a control signal. Zero them out and the model falls apart. He called them outlier features. When I went looking in that little Qwen, there was one channel going into one layer that was tens of thousands of times bigger than the typical value.

B: And if you put one ruler on that...

A: Then every other number in the vector rounds to nothing. Exactly my disaster, but in the activations. Dettmers' fix was to pull the few giant channels out and handle them in full precision, and do everything else in eight bits. Another paper, SmoothQuant, had a cuter trick. You can shrink an activation channel and grow the weights it multiplies by the same factor, and the answer doesn't change. So you move the difficulty out of the activations, which are hard, into the weights, which were easy.

<!-- section: What actually gets faster -->

B: Okay, so let me check my picture. I store the model in four bits. So the math happens in four bits, and everything is about four times faster.

A: That's the part I most want to fix, because it's half right. With the usual four-bit formats, the math doesn't happen in four bits at all. The weights are stored small. They cross the memory pipe small. And then right before the math, inside the chip, each one gets unpacked back into a normal sixteen-bit number, and the multiply is ordinary sixteen-bit math.

B: So what's the point?

A: The point is the pipe. Remember there are two halves to every request. Writing the answer, one word at a time, is starved for memory. The chip's waiting on bytes, so a quarter of the bytes means much faster typing. But reading the prompt is the other half. All the prompt's words go through at once, the chip's busy doing real math, and the bytes weren't the problem. So four-bit weights do nothing for that. The wait for the first word stays the same, or gets a hair worse because of the unpacking.

B: Huh. So these are only weight formats. Is there a version where the math really gets smaller?

A: There is. If you shrink the activations too, so both sides of the multiply are small, then the chip can use its narrow math units, which do roughly twice as much work per second each time you halve the width. That's what FP eight is, eight-bit floating point, on both sides. It reads half the bytes and does cheaper math. So it speeds up the typing a bit less than four-bit does, but it also speeds up reading the prompt.

B: So which one you want depends on which number your users feel.

A: That's it. One person chatting on a Spark, the typing is everything, so four-bit weights win. A big fleet serving lots of people at once is a different machine. When you batch lots of users together, each weight you fetch gets used for all of them, and suddenly math is the bottleneck, not bytes. There the four-bit trick fades, and the cheaper math is what keeps paying. Which is why big serving companies love FP eight and people running models at home love four-bit files.

<!-- section: Rounding smarter -->

A: There's one more lever, and it's clever. Everything so far rounds every weight on its own, to its nearest mark. But a layer's job isn't to keep its weights. It's to produce the right outputs.

B: So if I round one weight up and that pushes an output too high, I could round a neighbour down.

A: And the output barely moves. That's the idea behind GPTQ. It runs a little bit of real text through the layer, rounds one column of weights, looks at how much that messed up the outputs, and nudges the columns it hasn't rounded yet to cancel it out. No retraining. One pass. And it got a giant model down to three or four bits in a few hours on a single GPU.

B: And there's another one, AWQ, right? I've seen that on model downloads.

A: AWQ starts from an observation. About one weight in a hundred matters far more than the rest. And you find them by looking at the activations, not the weights. If a channel of the input tends to be big, any error in the weights it multiplies gets blown up in the output. So AWQ scales those important weights up before rounding, so they use more of the ruler and lose less. Same SmoothQuant trick, pointed the other way. When you see a model download with AWQ or GPTQ in the name, that's what was done to it.

<!-- section: What you lose, and how to tell -->

B: So how do I know what I actually lost? Perplexity?

A: Perplexity's a start, but it's blunt. It's an average over ordinary text. A model can keep its perplexity and still get worse at the rare, precise steps that decide whether an answer is right. The thing I'd watch is flips. You run a benchmark, and the score comes out the same. But underneath, a bunch of answers changed. Some right ones went wrong, some wrong ones went right. They cancel in the average.

B: And the user only ever sees the one answer they got.

A: Your users experience flips, not averages. And the losses show up first where small errors compound. Multi-step math, code that has to run, finding one sentence in a really long document. One slightly wrong word early on, and everything after it goes sideways. Also, small models suffer more than big ones. My little Qwen took a real hit at four bits. An eight billion model at four bits usually loses much less.

B: [thinking] And speed, is that just free then? A quarter of the bytes, four times faster?

A: Not quite, and this was the bit that surprised me on the Spark. The four-bit model was a few times faster than the full one, not a clean four. Because once the model's small, the fixed costs per word, launching work on the GPU, the attention over the conversation, picking the next word, the unpacking, they're a bigger share of each step. And there's a trap. If the software unpacks the whole matrix back into memory before multiplying, you've written the big version out and read it back in, and you're slower than if you'd never quantized at all. A quantized model is only as fast as the code that unpacks it on your particular GPU.

<!-- section: Ending -->

B: Let me try it. Quantization is rounding weights onto a ruler with fewer marks. The thing that decides whether it works isn't really the bits, it's how many weights share one ruler, because one huge value spreads the marks out for everyone. So you give small groups their own ruler, and round cleverly so neighbours cover for each other. And then you get speed, because there are fewer bytes to drag across.

A: That's right. The one thing I'd sharpen is where the speed shows up. If you only shrink the stored weights, they get unpacked before the math, so it's the typing that gets faster, not the wait for the first word. To make the prompt reading faster too, the math itself has to get narrower, and that means shrinking the activations, which is exactly where the giant outliers live.
