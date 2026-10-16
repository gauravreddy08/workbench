<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, the ceiling on your scoreboard. Llama three point one, the eight billion parameter one, in B F sixteen. Every time it makes a token, the GPU has to read every single weight out of memory once. That's about sixteen gigabytes. And the pipe between the Spark's memory and its GPU is rated, on the spec sheet, at two hundred seventy-three gigabytes a second. So you divide, sixteen into two hundred seventy-three, and you get about seventeen tokens a second. And that's it. No amount of cleverness in the server gets you past that, because the math units aren't the problem. They're sitting there waiting for weights to show up.

B: Yeah, the GPU's basically idle. It's all about how fast you can drag the weights in.

A: Right. So the cheapest way past it is kind of obvious. Read fewer bytes. B F sixteen is sixteen bits per weight. Store each weight in four bits instead, that's a quarter of the bytes, and the same pipe should carry you to something like fifty-five tokens a second.

B: [a bit unsure] And four bits is... sixteen possible values? That doesn't sound like a lot. But I guess you just, like, squish everything down to fit?

A: That's the obvious thing, and it's a real method. You take every weight matrix, you find its biggest value, you divide everything so that biggest value lands on seven, you round to the nearest whole number, and you store integers from minus eight to seven. Four bits each. On paper, totally fine.

B: Sounds fine to me.

A: So I did exactly that to a small model on my Mac. Qwen two point five, the half-billion parameter one. And I measured its perplexity on Wikipedia text. Quick word on perplexity, because a lot of the numbers in this are going to be perplexities. You run the model over real text, and at every position you look at how much probability it gave to the token that actually came next. Perplexity takes the average of that surprise and turns it back into something you can feel: a count of choices. A perplexity of fourteen means the model's about as unsure as if it were picking between fourteen equally likely tokens, every single time. Lower is better.

B: Okay. So fourteen's roughly where the original is.

A: Fourteen point four. And after the four-bit squish? Seventy-nine million.

B: [laughs] Million?

A: Seventy-nine million. It wasn't a slightly worse model. It was just gone. It predicted tokens about as well as a random number generator with opinions.

B: [skeptical] Okay, so four bits is too few. You need eight. That's the lesson?

A: [warmly] That's the natural read, and it's wrong, and honestly that's the whole episode. Because then I changed one thing. Instead of one "biggest value" setting the squish for the entire matrix, I gave every hundred twenty-eight weights their own. Same four bits. Perplexity: twenty. Then I let each of those little groups shift its range a bit, which I'll explain, and it was seventeen point two. And there's a popular four-bit file of Llama three point one eight B, from llama dot C P P, it's called Q four K M. Thousands of people use it every day, and on most chat tasks it's hard to tell from the original.

B: So same number of bits, and the result goes anywhere from basically unchanged to completely destroyed.

A: Yeah. And the gap between those comes down to three questions. Which numbers share a scale. Which numbers you quantize at all. And how you round. The bit count is, weirdly, almost the least interesting part.

<!-- section: Origin -->

A: And none of this started with language models. Around twenty seventeen, twenty eighteen, a team at Google, Benoit Jacob and colleagues, wanted image models to run on phone CPUs. And phone CPUs do eight-bit integer math way, way faster than floating point. So they wrote a paper with a very long title, "Quantization and Training of Neural Networks for Efficient Integer-Arithmetic-Only Inference." And it wrote down the scheme basically everybody still uses. Every real number gets stored as a small integer, plus a shared scale and a zero-point. Those two words are going to carry this whole thing, so I'll come back to them properly in a sec. It worked well for image models at eight bits, and it became the standard in TensorFlow Lite, and later in PyTorch.

B: And then the models got big.

A: Then they got enormous. By twenty twenty-two you had OPT, a hundred seventy-five billion parameters, and BLOOM, a hundred seventy-six billion. Just holding the weights in sixteen-bit took about three hundred fifty gigabytes. That's several data-center GPUs' worth, before you've answered a single question. And two papers that year made big models small. Tim Dettmers wrote one called L L M dot int eight. And he found that the old eight-bit recipe broke on large transformers, because of a handful of giant values in the activations, he called them outlier features, and he found a way to work around them. And Elias Frantar wrote G P T Q, which squeezed that hundred-seventy-five-billion model down to three or four bits, in about four GPU-hours, on a single GPU. Not by using more bits. By rounding cleverly instead of naively.

B: [amused] So the trick was rounding.

A: The trick was rounding. And within about a year, llama dot C P P was running four-bit LLaMA on laptops, and "which quant?" became the first question anybody asked about an open model.

<!-- section: The Idea: A ruler with fewer marks -->

A: So let's build the idea from the bottom. Think about a ruler. A good one has marks every millimetre. A cheap one only has marks every centimetre. If you measure a pencil with the cheap one, you write down the nearest mark. Fourteen centimetres, not fourteen point three. You can never be off by more than half a centimetre, and all you have to remember is a small whole number.
That's quantization. It's a cheap ruler for weights. You store numbers with fewer bits by snapping each one to the nearest point on a coarse grid, and you only remember which point it was. A B F sixteen weight can be any one of about sixty-five thousand values. A four-bit weight can be one of exactly sixteen. So you decide where those sixteen marks go, you snap every weight to its nearest mark, and you store the mark's number. And then when you need the weight again, to actually multiply with it, you look up where mark number nine was. That step's called dequantization: turning the stored little integer back into an approximate real number. And it happens on the fly, inside the GPU code, right before the math.

B: So the only real decision is where the marks go.

A: That's the only question, yeah. Like, put them too far apart, and every weight moves a lot when it snaps. Put them too close together, and the biggest weights fall off the end of the ruler.

<!-- section: The Idea: Scale and zero-point -->

A: The standard ruler has evenly spaced marks. That's called a uniform quantizer, every step between neighbouring marks is the same size. And two numbers describe it completely. The scale is the step between marks, in real units. And the zero-point is which integer means zero.

B: Why would zero not just be... zero?

A: Because your values might not be centred. Let me just do an example, because it's honestly easier than the formula. Say you've got four bits, so sixteen integers, zero through fifteen. And your values run from minus six tenths up to nine tenths. That's a total width of one and a half. Sixteen marks means fifteen gaps between them. One and a half spread over fifteen gaps, the step is one tenth. That's the scale.
Now, where's zero? Zero is six tenths above the bottom, so that's... six steps up. So integer six means zero. That's the zero-point. Integer zero means minus six tenths, integer six means exactly zero, integer fifteen means nine tenths.

B: [working it out] Okay. So to store something, you divide by the step and then shift up by six.

A: Exactly that. Take the value thirty-three hundredths. Divide by the step, a tenth, you get three point three. Round it, three. Add the zero-point, six. You store nine. Then to get it back, you go the other way. Nine minus six is three, times a tenth, that's three tenths. So you put in point three three and you get back point three zero. Off by three hundredths.
And if you picture it as a drawing, it's a number line across the top from minus point six to point nine, with sixteen evenly spaced ticks, and the one at zero is a bit taller. Underneath is a row of sixteen little boxes numbered zero to fifteen. Box six is shaded, that's zero. And there's a dot at point three three on the top line, with a line running down from it to box nine.
There's one more piece. If a value comes in outside the range you planned for, say minus two, you clamp it. Anything below the bottom becomes the bottom, anything above the top becomes the top. And this whole scheme, scale plus zero-point, is called affine quantization. Affine just means multiply, then shift. People also call it asymmetric.

B: And the error's always at most... half a step?

A: Two things fall out of that picture, and that's the first one. Any value inside the range is at most half a step from a mark. And if the weights are spread out in a reasonable way, the rounding error behaves like a random number spread evenly between minus half a step and plus half a step. Its typical size comes out to about three tenths of a step. And here's the part to remember. Every extra bit doubles the number of marks, which halves the step, which halves the error. So going from eight bits to four bits, you lose four bits, that's four halvings, and the error gets roughly sixteen times bigger.

B: Sixteen times. Okay, that's a lot more than "half as many bits".

A: It's a lot more. And the second thing: zero is exact. Integer six decodes to exactly zero point zero. That sounds like a nicety, but neural networks are full of real zeros. Padding. The outputs of a ReLU, which zero out anything negative. Masked entries. And a grid that can't represent zero turns every one of those into a small wrong number. Which then gets, you know, multiplied into everything downstream.
Now, when the values are roughly centred on zero, and weights almost always are, people often drop the zero-point. They use a grid that's symmetric around zero: integers from minus seven to seven, or minus eight to seven, and the step is just the biggest value, ignoring its sign, divided by seven. That's symmetric quantization. One number per group instead of two, and the math in the GPU code gets a little simpler. The cost is wasted marks if the values are lopsided, because half your grid might be sitting over empty space. Most eight-bit schemes and many four-bit ones are symmetric. Most four-bit G P T Q and A W Q files, and llama dot C P P's newer formats, keep a zero-point, or a "minimum" offset that does the same job.
And the simplest version of all of this, where you compute the step from the range and just round every weight to its nearest mark, independently, no data, no optimization, that has a name. Round-to-nearest. R T N. It's what I did to Qwen. It's the baseline every smarter method compares itself against. Keep it in your head, because we're going to do better.

<!-- section: The Idea: Predict, one outlier -->

A: So here's one to think about. A row of four thousand ninety-six weights. Roughly bell-shaped, centred on zero, with a standard deviation of two hundredths. So almost all of them sit between minus six hundredths and plus six hundredths. Except one weight is point five. Way out. You quantize the row to symmetric four-bit, step equals the biggest value over seven. Roughly what fraction of the weights get rounded to exactly zero?

B: [a bit unsure] Hmm. The ones right near zero, I guess. So... ten percent? Twenty maybe?

A: [jumping in] Most of them. So, walk it. The one big weight sets the step. Point five divided by seven is about seven hundredths. A weight rounds to zero if it's less than half a step from zero, so less than about three and a half hundredths. And the standard deviation's two hundredths, so that cutoff is about one point eight standard deviations out. For a bell curve, everything inside one point eight standard deviations is about ninety-three percent.

B: Ninety-three percent are zero.

A: Ninety-three percent of the row is now zero. What's left is the outlier, plus a few survivors at the edges. And this isn't just a toy. I took a real MLP matrix from that Qwen model, its biggest weight is about twenty-one standard deviations out, and quantized it with one scale for the whole matrix at four bits. Eighty-eight percent of the weights rounded to zero, and the reconstruction error, how big the difference is compared with the original, was seventy-eight percent. The scale gets set by the one number you care least about representing precisely.

<!-- section: The Idea: Who shares a scale -->

A: [thinking out loud] So that's, I mean, that's the outlier problem in one line. A shared scale is only as good as the widest value it has to cover. So the most important design choice in quantization isn't the bit count. It's how many weights share each scale. And there are three standard answers.
Per-tensor: one scale for the entire weight matrix. Cheapest to store, but the single biggest value in the whole matrix sets the step for millions of weights.
Per-channel: one scale per row. A row of the weight matrix is all the weights that produce one output number, and people call that an output channel. So a four thousand ninety-six by four thousand ninety-six matrix gets four thousand ninety-six scales, and one outlier only hurts its own row.
And per-group: you cut each row into blocks, usually of a hundred twenty-eight weights, and each block gets its own scale. Same matrix now has a hundred thirty-one thousand scales, and an outlier only hurts its own group of a hundred twenty-eight.
If you drew it, it's three copies of the same square matrix, with one dot near the top-left corner for the outlier. The first square is shaded as one solid region, and the label underneath says the outlier hurts sixteen point eight million weights. The second is striped, one stripe per row, and the outlier hurts four thousand ninety-six. The third is a checkerboard of little blocks, and the outlier hurts a hundred twenty-eight. Smaller regions, fewer weights pay. The cost is storing more scales.

B: [skeptical] Why rows, though? Why not chop it up by columns? Or just little squares?

A: Because of how the multiply adds things up. Output number i is the dot product of row i with the input vector. You multiply each weight in the row by the matching input and sum them all. If every weight in that row shares one scale, you can pull the scale out of the sum. You do the whole dot product on the small integers, and then multiply the answer by the scale once, at the end. But if the scale changed along a column, then neighbouring weights in the same row would have different scales, and the scale lands inside the sum. Now it's a multiply per weight. Groups are the in-between. They cut a row into pieces, so the GPU does a small integer dot product per group and rescales each partial sum before adding it up. A bit more work, a lot more accuracy.

B: And all those scales, they have to be stored somewhere too.

A: They do, and they're not free. That's the part people forget. A group of a hundred twenty-eight weights at four bits each is five hundred twelve bits. One scale in sixteen-bit is sixteen more. Spread those sixteen bits over a hundred twenty-eight weights and it's an eighth of a bit each. So it's really four and an eighth bits per weight. Add a four-bit zero-point per group, that's another thirty-second of a bit. Which is why "four-bit" models are never exactly a quarter of the B F sixteen size. And hold on to that arithmetic, because it decides your speed. Tokens per second is bandwidth divided by all the bytes. Scales included.

<!-- section: The Idea: A real matrix, and playing with the grid -->

A: Here's what it looks like on a real matrix. I took the first MLP matrix in Qwen, the gate projection in layer zero. Four thousand eight hundred sixty-four by eight hundred ninety-six. And quantized it with symmetric round-to-nearest at different granularities, and measured the relative reconstruction error. That's the size of the error divided by the size of the original matrix. Lower's better.
At eight bits, even one scale for the whole matrix is survivable. About five percent error. One per row gets you under one percent, and groups of a hundred twenty-eight get you to about seven tenths of a percent.
At four bits it's, well, it's a different world. One scale for the whole matrix: seventy-eight percent. That's the destroyed one. One per row: fifteen percent. Groups of a hundred twenty-eight: about twelve. Groups of thirty-two: about ten. And groups of a hundred twenty-eight with a zero-point: about ten too.

B: So the jump from one scale to one per row is... five times better.

A: Five-fold, just from who shares a scale. And groups shave off a bit more. At four bits the granularity is everything.
And there's an interactive version of this I'd really go play with. It's a toy matrix, four rows of five hundred twelve weights, each row bell-shaped but with its own spread. On top, a histogram of whichever group one particular weight lives in, with the grid's marks drawn over it as thin vertical lines. Underneath, one little cell per scale, shaded darker where the error's worse. You've got a bits slider, buttons for tensor, channel, a hundred twenty-eight and thirty-two, an outlier button, and an affine button for the zero-point.
Start at four bits, groups of a hundred twenty-eight, no outlier. The histogram fills the grid nicely, error's around thirteen percent. Now turn the outlier on. In that one group, the nice bell collapses into a thin spike right in the middle, and almost all of it lands on one mark. Over ninety percent of that group rounds to zero. But look at the other cells. They don't change at all. The damage is contained to a hundred twenty-eight weights.
Now switch to per-tensor. The outlier's scale now applies to all two thousand forty-eight weights, and the overall error jumps to about seventy percent. That's my seventy-nine-million-perplexity Qwen, right there.

B: And if you turn the outlier off but stay per-tensor, it's fine again?

A: [amused] You'd think. It's still bad, about twenty-nine percent. Because one of the rows is just spread wider than the others, and its range sets the step for everybody. Per-channel fixes that even without any outlier. Then, with the outlier on and still per-tensor, drag the bits from four up to eight. Two hundred fifty-six marks instead of sixteen shrinks the step about seventeen-fold, and the spike spreads back out across lots of marks. That's why eight-bit is forgiving and four-bit isn't. And the affine button helps most when a group's values are lopsided, and you'll see it cost a little extra in the bits-per-weight readout.

<!-- section: The Idea: Outliers live in activations -->

A: [curious] Now, that planted outlier was a toy. Are real models actually like that? Weights, mostly not badly. That Qwen matrix, its biggest weight was about twenty-one standard deviations out. Enough to wreck per-tensor four-bit, but groups handle it easily.
Activations are a different animal. Activations are the numbers flowing between layers for a specific input. The vectors that get multiplied by the weights. And unlike weights, they change with every token, so you can't just inspect them all ahead of time. And going into some layers, a few channels, a few positions in that vector, are hundreds or thousands of times bigger than the rest, on almost every token. I hooked the inputs of every linear layer in Qwen and ran five hundred twelve tokens of Wikipedia through it. Going into the MLP down-projection in layer two, the typical activation had a size of about four hundredths. And channel eight hundred thirteen hit one thousand six hundred thirty-one.

B: [working it out] So that's... tens of thousands of times bigger?

A: Thirty-seven thousand times the median.

B: Okay, but that sounds like garbage, honestly. Some numerical blow-up. Can't you just clip it? Cap it at something sane and move on?

A: [gently] That's the instinct, and it's the one Dettmers proved wrong. He found the same thing in twenty twenty-two and called them outlier features. A few hidden dimensions whose activations are consistently huge, he used a size of six or more as the cutoff, across most tokens and most layers. In the OPT models he studied, they showed up abruptly, around six point seven billion parameters, and then they dominated. Same few dimensions, layer after layer, token after token. And the model's quality depended on them. Zero them out and performance collapses. They're not noise. The model uses them on purpose, as a kind of control signal.

B: Huh. So clipping them is like deleting the steering.

A: Pretty much. And here's what they do to quantization. I quantized the input of every linear layer in Qwen to eight-bit, on the fly, weights untouched. Unquantized, perplexity fourteen point four five. With one scale per token, so each token's vector gets its own scale, fourteen point seven three. Barely moved. With one scale for the whole activation matrix: seventy-six point six. Wrecked, by those outlier channels.

B: So do the per-channel thing. Give each channel its own scale, like you did for rows.

A: And you can't, and it's the row rule from before. For activations, a channel is one position in the input vector. And in the dot product, every position gets multiplied by a different weight and summed. So a per-channel activation scale lands inside the sum. That's the expensive place. So two papers found two other ways out.
The first one's L L M dot int eight. Dettmers, with Lewis, Belkada and Zettlemoyer. It splits the matrix multiply in two. The handful of outlier channels go through in sixteen-bit, the other ninety-nine point nine percent go through in eight-bit, and you add the results. It's accurate, and it made those hundred-seventy-five-billion models fit on far fewer GPUs. But the split makes it slower than plain sixteen-bit at small batch. So it's a memory saver, not a speed-up.
The second is SmoothQuant, from Xiao, Lin and colleagues, same year. And it's this little bit of algebra that I really like. Say activation channel j is huge, around a thousand. Divide that channel by ten, so now it's around a hundred. And multiply the weights that channel feeds by ten. Each product is the same number it was before, a thousand times a small weight equals a hundred times a weight ten times bigger. So the output doesn't change at all. You pick big factors for the outlier channels, the spikes in the activations shrink, and the weights, which were easy to quantize, get a little harder. The paper picks each factor by balancing how big that channel gets in the activations against how big the matching weights are, with a knob set around a half, so the difficulty gets split roughly evenly. They call it migrating the difficulty from activations to weights. And then you get accurate eight-bit for both.

B: But now you've got this extra divide in front of every layer.

A: You'd think, but no. The factors get folded into the previous layer's weights ahead of time, so at runtime it costs nothing.
So, stepping back, here's the toolbox for outliers. One weight twenty times bigger than the rest makes the step twenty times coarser for everyone sharing its scale, and most of them round to zero. So you can share scales among fewer weights, per-channel, then groups of a hundred twenty-eight or thirty-two, so an outlier only damages its own group. You can keep the outliers in higher precision, which is L L M dot int eight. You can move the difficulty somewhere easier with an exact rescaling, which is SmoothQuant, and A W Q, which we'll get to. Or you can round cleverly so neighbouring weights cover for each other, which is G P T Q. And activation outliers are the harder kind, because they live in input channels, inside the dot product, and they change with every token.

<!-- section: The Idea: Weights only, or weights and activations -->

A: And that split, quantizing only the weights versus quantizing both, decides which part of inference actually gets faster. There's a naming convention: W for weights, A for activations, with the bit counts. So W four A sixteen means weights stored in four bits, activations left in sixteen-bit. W eight A sixteen, same idea at eight bits. Those are weight-only. The weights sit in memory small, and inside the GPU code each one gets unpacked back to B F sixteen and multiplied with B F sixteen activations, on the ordinary B F sixteen tensor cores. Tensor cores are the GPU's dedicated matrix-multiply units. Each GPU generation supports a menu of input formats, and the narrower formats run proportionally faster.
Then W eight A eight, in eight-bit integers or in F P eight, and W four A four, or F P four, quantize both. Now the math itself runs in the narrow format, on tensor cores that do roughly twice the operations per second each time you halve the width.

B: [a bit unsure] So W eight A eight is just strictly better? Smaller and faster math. I'd assume quantizing makes everything faster.

A: [gently] Depends on which "everything". So remember the two halves of a request. Decode is making tokens one at a time. It reads every weight once per token and does almost no math per byte. So it's memory-bound: it's waiting on the pipe. Prefill is reading the prompt. It takes hundreds or thousands of prompt tokens at once and reuses every weight across all of them. So it's doing tons of math per byte, and it's compute-bound: it's waiting on the math units.
Picture two assembly lines, one above the other. The top one is weight-only, W four A sixteen. On the left, memory, holding four-bit weights plus their scales. A thick pipe carrying a quarter of the bytes. Then an unpack box, multiply by the scale, back to B F sixteen. Then the B F sixteen tensor cores, with B F sixteen activations coming in from below. Under it, the label says decode up to about four times faster, prefill the same or a little slower. The bottom line is weights and activations, F P eight. Memory holds eight-bit weights plus scales, half the bytes, and there's no unpack box, they go straight in. On the side, a little box that converts the activations from B F sixteen to F P eight with a scale. And the tensor cores are F P eight ones, about twice the B F sixteen rate. Label says decode up to about two times, prefill up to about two times. And along the bottom, a note: the sums always add up in thirty-two-bit, and get rescaled at the end.
So for decode, bytes are everything. W four A sixteen reads about a quarter of the bytes, and it's the fastest single-user format you can run on most hardware, even though its math is plain B F sixteen. W eight A eight reads half the bytes, and its faster math mostly doesn't matter, because decode was never waiting on math.
For prefill, math is everything. W four A sixteen does exactly as much B F sixteen math as the original model, plus the unpacking. So time to first token on a long prompt doesn't improve, and it can get a little worse. W eight A eight and F P eight really do run the matrix multiplies on faster units, so prefill gets faster too.

B: And batching? If I've got a bunch of users at once?

A: Then both matter. When you batch more users, each weight you read gets used for more tokens, so you're doing more math per byte. You climb up from memory-bound toward compute-bound. And there's a point, people call it the ridge point, where you stop waiting on bytes and start waiting on math. A weight-only format's advantage shrinks as you climb, because the unpacking gets repeated and the B F sixteen math starts to dominate. Past the ridge it's got nothing left, and it can be slower than B F sixteen. F P eight keeps helping, because its math is cheaper. There's another quiet effect too. The K V cache, the stored keys and values for every user's conversation so far, grows with the batch, and weight quantization doesn't touch it. So the share of bytes your weight format actually controls shrinks. Weight-only quantization is a small-batch win. Weights-and-activations keeps paying at scale.
And that's why the two worlds pick differently. Single user on your Spark: decode dominates, it's memory-bound, so the fewest bytes wins. A four-bit weight-only format gets close to four times the B F sixteen decode ceiling, and the fact that its math is still B F sixteen doesn't matter, because the math units were idle anyway. A busy server on H one hundreds: big batches push decode toward compute-bound, and prefill is a big share of the work. So you want the math itself cheaper. F P eight halves both the bytes and the math, loses almost nothing in quality, and that's why it's the default for big fleets on Hopper. F P four, in a format called N V F P four, is the next step on Blackwell. And the Spark is Blackwell, so N V F P four is attractive for both, if your serving engine supports it on that chip.

<!-- section: The Idea: Predict, four-bit versus FP8 -->

A: So put numbers on it. Llama three point one eight B, on the Spark, one user. W four A sixteen with groups of a hundred twenty-eight, versus F P eight for both weights and activations. Which one has the higher decode ceiling? And which one gets you the first token faster on a four-thousand-token prompt?

B: [working it out] Decode is bytes, so the four-bit one. Prefill is math... so F P eight, because the four-bit one's still doing B F sixteen math.

A: Both right. And the numbers. The layers hold about seven billion weights. At four and an eighth bits each, that's about three point six gigabytes. Plus the output projection at the top, which most quantized files keep in B F sixteen, that's about another gigabyte. So about four point seven gigabytes per token. F P eight is about eight. Divide two hundred seventy-three by each, and you get ceilings of about fifty-eight tokens a second versus about thirty-four.
And the four-thousand-token prompt is way past the ridge point, so it's limited by how fast the matrix multiplies go. F P eight tensor cores run about twice the B F sixteen rate. The four-bit one unpacks to B F sixteen, so it's no faster than the original model, and the unpacking costs a bit extra. So the best format depends on which number your users actually feel.

<!-- section: The Idea: Floats in eight bits and four bits -->

A: Everything so far used integers on an evenly spaced grid. The other family is tiny floating-point numbers. A float has two parts that matter here. The exponent bits say which power of two the number's near. And the mantissa bits, also called the significand, say where it sits between that power of two and the next one.

B: [a bit unsure] So more exponent bits is more precision?

A: Other way round, and it's worth getting straight, because it's the B F sixteen thing. Exponent bits buy range. How tiny and how huge you can go. Mantissa bits buy precision, how finely you can tell nearby numbers apart. B F sixteen, for example, spends eight bits on exponent and only seven on mantissa. So it reaches absurdly big numbers, up around ten to the thirty-eighth, but it's coarse. It chose range.
And the nice property of a float's grid is that it isn't even. The marks are dense near zero and spread out as numbers grow. So the error stays roughly the same as a fraction of the number. Which suits bell-shaped weights, because most of them are small.
F P eight, eight-bit floats, comes in two flavours. They were standardised by NVIDIA, Arm and Intel in a twenty twenty-two paper called "F P eight Formats for Deep Learning", from Micikevicius and colleagues, and tensor cores support them since Hopper, the H one hundred, and Ada. The first is E four M three. One sign bit, four exponent bits, three mantissa bits. Its largest value is four hundred forty-eight. More precision, less range, and that's the usual one for weights and activations at inference. The second is E five M two. Five exponent bits, two mantissa. Largest value fifty-seven thousand three hundred forty-four. Less precision, more range, and it's mostly used for gradients in training, which swing wildly.

B: And with F P eight you don't need scales anymore, since floats already handle range?

A: You still keep a scale. Per tensor, per channel, or per block. Because four hundred forty-eight is the biggest number you can write. So you scale each tensor so its biggest value lands near the top of the format's range, exactly like the integer case.
Four-bit floats go further. F P four is E two M one: one sign bit, two exponent bits, one mantissa bit. And it has exactly fifteen values. Zero, a half, one, one and a half, two, three, four, six, and the negatives of those. That's it. That's so few that it's useless on its own. It only works in small blocks, where each block carries its own scale. And two block formats matter.
M X F P four comes from the Open Compute Project's microscaling spec, from twenty twenty-three. Blocks of thirty-two F P four values sharing one eight-bit scale, and the scale can only be a power of two. About four and a quarter bits per weight. OpenAI shipped the expert weights of G P T O S S in it.
N V F P four is NVIDIA's, for Blackwell. Blocks of sixteen, each with its own F P eight scale, a real number, not just a power of two, plus one thirty-two-bit scale for the whole tensor. Smaller blocks and finer scales make it more accurate than M X F P four, at about four and a half bits per weight.
If you lined these up as bit diagrams you'd see B F sixteen as a long bar, mostly exponent and mantissa, then the two F P eight bars, then int eight and int four as plain bars with no exponent at all, topping out at a hundred twenty-seven and at seven, and F P four as this tiny three-piece sliver with a note saying "plus block scale". Next to each one, which tensor cores run it: B F sixteen since Ampere, int eight since Turing, F P eight since Hopper and Ada, F P four on Blackwell, and int four mostly gets unpacked rather than run directly. And underneath, the positive half of the F P four grid next to the int four grid, stretched to the same width. The F P four dots bunch up near zero, a half, one, one and a half, two, and then they spread out to three, four, six. The int four dots are perfectly even, zero through seven.

<!-- section: The Idea: What the Spark can do -->

A: So what can the Spark do with these? Its chip, G B ten, is Blackwell generation, and NVIDIA's spec sheet lists F P four support for its fifth-generation tensor cores. The headline "one petaFLOP" number is F P four, with sparsity. So in hardware, the Spark can run N V F P four and M X F P four math natively, and F P eight.

B: [skeptical] I'm sensing a "but".

A: Two. First, those are spec-sheet numbers, and you should measure them, the same way you measured B F sixteen. Second, G B ten isn't the same chip as the data-center B two hundred. It reports a different CUDA compute capability, S M one twenty-one if I have it right, and you can check with a one-line N V I D I A S M I query. And some of the F P four and F P eight GPU code in V L L M, TensorRT L L M and FlashInfer was written for the data-center parts first. So whether a given engine's F P four path runs on your Spark today is a docs-and-release-notes question, not a hardware question. NVIDIA's DGX Spark playbooks include tested quantized setups. Check those before assuming.
And for decode, one user, F P four and int four weight-only end up in the same place. About four and a half bits per weight, about the same bandwidth ceiling. N V F P four's real advantage is that the math also runs in four bits. So it's prefill and big batches where it pulls ahead.

<!-- section: The Idea: Rounding smarter, GPTQ and AWQ -->

A: [relaxed] Okay, so, back to the third question. How you round. Round-to-nearest treats every weight alone. But a layer's job isn't to preserve its weights. It's to produce the right outputs. So if rounding one weight up pushes an output too high, you could round a neighbour down to compensate, and the output would barely move.
Two methods do this kind of thing, and they both use calibration data. That's a small batch of real text, typically a hundred twenty-eight sequences of a few thousand tokens, that you run through the model once, just to see what activations each layer actually receives. It's for choosing scales and rounding. It's not training.
G P T Q is from Frantar, Ashkboos, Hoefler and Alistarh, in twenty twenty-two. It quantizes a layer one column at a time. After it rounds a column, it measures the error that rounding causes in the layer's outputs, on the calibration data. And then it nudges all the columns it hasn't quantized yet, to cancel out as much of that error as possible.

B: How does it know which way to nudge?

A: That depends on how the input features move together. If two inputs tend to be big at the same time, an error on one weight can be cancelled by an opposite tweak on the other. G P T Q captures that in a matrix built from the calibration inputs, basically each input feature multiplied against each other one, summed over all the calibration tokens. Formally it's called the Hessian of the layer's squared error, which is just a way of saying: how fast the output error grows when you nudge each pair of weights. The idea comes from nineteen-nineties pruning work, a method called Optimal Brain Surgeon. G P T Q's contribution was making it fast enough to run on a hundred seventy-five billion weights in a few hours. And it's still one-shot. No gradient descent, no retraining.
A W Q, from Lin, Tang and colleagues at MIT, twenty twenty-three, starts from an observation. A small fraction of weights, around one percent, matter far more than the rest. And you find them by looking at the activations, not the weights. The important ones, they call them salient, are the weights that multiply input channels whose activations are typically large. Because any error in those weights gets amplified in the output.

B: So just keep that one percent in sixteen-bit.

A: That would work, and it breaks the neat GPU code, because now you've got a mixed matrix. So instead A W Q uses the SmoothQuant trick in reverse. Before quantizing, it scales those important weight columns up by some factor, and divides the matching activations by the same factor. Now those weights use more of the grid, so they lose less precision relative to their size. Then a small grid search, per layer, on the calibration data, to pick how strong that scaling should be, and you're done. No reconstruction, no Hessian, quick to run. Both A W Q and G P T Q typically use four bits, groups of a hundred twenty-eight, with a zero-point, and both are supported by V L L M with fast GPU code.
On small models, both clearly beat round-to-nearest at four bits. At eight bits, round-to-nearest is already nearly lossless, which is why F P eight checkpoints are usually just "compute a scale and round".

<!-- section: The Idea: GGUF and k-quants -->

A: And if you've ever downloaded a model for llama dot C P P, you've seen these names. Q four K M, Q eight zero. Those live in G G U F files. G G U F is the single-file format llama dot C P P uses, and Ollama and LM Studio too. Weights, tokenizer and metadata all in one file, and different tensors can be stored in different quantization types. And under the hood, every one of those types is per-group quantization, just packed differently.
Q eight zero: blocks of thirty-two eight-bit weights with one sixteen-bit scale. Eight bits, plus sixteen spread over thirty-two, is eight and a half bits per weight. Practically lossless. Q four zero: blocks of thirty-two four-bit weights with one sixteen-bit scale. Four and a half bits. That's the old simple one.
Then the k-quants, Q two K through Q six K, added in twenty twenty-three by Iwan Kawrakow. They group weights into what's called a super-block of two hundred fifty-six, split into sub-blocks of thirty-two, or sixteen. Each sub-block gets its own scale and minimum, stored in just six bits. And the super-block has one sixteen-bit scale for those scales.

B: [amused] Scales of scales.

A: Scales of scales. Even the scales get quantized, to save bits. Q four K works out to exactly four and a half bits per weight. Q six K, about six and a half.

B: Then what's the M in Q four K M? And why's the file not four and a half bits?

A: The S, M and L at the end mean small, medium, large, and they're a mix. Q four K M uses Q four K for most tensors, and the higher-precision Q six K for some sensitive ones. Parts of the attention value projections and the MLP down-projections, and usually the output layer. That's why Llama three point one eight B in Q four K M is about four point nine gigabytes. About four point nine bits per weight, not four and a half.
llama dot C P P can also take what it calls an importance matrix, computed from calibration text. It weights each column's rounding error by how much its activations matter. Same instinct as A W Q and G P T Q. And the I Q formats, I Q four X S, I Q three, I Q two, push that further with uneven grids. That's where to look if you want to cram a seventy-billion model into less memory. The list keeps growing, so check llama dot C P P's docs for what's current.

<!-- section: The Idea: What you lose, and how to tell -->

A: So, what do you actually lose? Here's what plain round-to-nearest did to that Qwen model, weights only, measured as perplexity on about forty-one thousand tokens of WikiText two. Original, fourteen point four five. Eight-bit with one scale per row, fourteen point four nine. Basically nothing. Eight-bit with one scale for each whole matrix, fifteen point one two. Four-bit, one scale per row, thirty-one point seven. Four-bit, groups of a hundred twenty-eight, symmetric, twenty. Same but with a zero-point, seventeen point two. And three-bit, groups of a hundred twenty-eight, two hundred six.
So eight bits is nearly free. Four bits, with groups and a zero-point, costs real quality but survivable, on a half-billion model. And small models suffer more than big ones. An eight B model at four-bit, groups of a hundred twenty-eight, typically loses far less, and that's part of what you'll measure on the Spark. And at three bits, round-to-nearest falls off a cliff. That's exactly where G P T Q, A W Q and llama dot C P P's importance-weighted formats earn their keep.

B: [skeptical] Okay, but devil's advocate. If someone tells me their four-bit model is lossless because perplexity only went up two percent... that sounds pretty convincing to me.

A: It's the most common claim, and perplexity is a blunt instrument. It measures how well the model predicts average tokens. A model can keep its perplexity and still get worse at the rare, precise steps that decide whether an answer is right. So the first thing I'd ask is which model size, which method and group size, and how many bits per weight, really, scales included. Then: perplexity on what text? And what's the K L divergence against the original?

B: Which is... I know the name, I don't really know what it's measuring.

A: So at every position, the model doesn't really output a token. It outputs a probability for every token in its vocabulary. Say the original model, after "The capital of France is", gives "Paris" sixty percent, "a" ten percent, and spreads the rest thinly over everything else. That whole list of probabilities is the distribution. The quantized model gives its own list. Maybe "Paris" fifty-five. K L divergence is a single number for how far apart those two lists are. Zero means identical. And you compute it at every position and average. It's much more sensitive than perplexity, because perplexity only looks at the probability of the one token that actually came next, and changes elsewhere in the list can cancel out. llama dot C P P's perplexity tool can compute K L divergence against saved outputs from the full-precision model. Look for the K L divergence options in its docs.
Then there's flips. On a multiple-choice or math benchmark, the score can stay exactly the same while lots of individual answers change. Some right answers go wrong, some wrong ones go right, and the total doesn't move. There's a twenty twenty-four Microsoft paper, "Accuracy is Not All You Need", from Dutta and colleagues, that argued for reporting the fraction of answers that flip. Because two models with equal accuracy can disagree a lot. And your users experience flips, not averages.

B: That's kind of unsettling. Same score, different model.

A: Right. And then, task accuracy where precision matters. Multi-step math, the G S M eight K kind of grade-school word problems, code that has to actually run, exact recall from a long context. Those are commonly reported to degrade first under aggressive quantization, because one slightly wrong token early derails everything after it. So measure your own tasks. Don't trust the summary table.
And long context. Long prompts mean many more steps for small errors to compound. And quantizing the K V cache is a separate choice, it's a flag in V L L M and a cache type setting in llama dot C P P, and it adds error exactly where long-context recall lives. So if you care about that, test with a long-context retrieval task.
So the honest way to report a quantized model is: bits per weight including overhead, method, granularity, perplexity and K L against the original, accuracy on a task you care about with a confidence interval, and the flip rate. And "lossless" should really mean "no difference I can detect with this eval, at this sample size." And I'd want to know the sample size.

<!-- section: The Idea: The cost of unpacking -->

B: Can I ask about the unpacking? Because you keep saying the four-bit weights get turned back into B F sixteen. I'd assumed that's basically free. It's a multiply.

A: [relaxed, thinking out loud] It's not free, and if you do it carelessly it's a disaster. For each weight, the code has to pull out four bits, convert them to B F sixteen, subtract the zero-point and multiply by the scale. Now, the careless way is to unpack the whole matrix to B F sixteen in memory and then do the multiply. But think about what that means. You've just written the full sixteen-bit matrix back to memory, and then you read it again. So you're moving more bytes than the plain B F sixteen model. You'd be slower.

B: Oh. So you've thrown the whole win away.

A: The whole win, plus some. So the point of a good kernel, and kernel just means a function that runs on the GPU, is to fuse it. Read the packed bytes, unpack them in registers, which is the tiny fast storage right inside the GPU's cores, right before the tensor-core instruction. And never write the B F sixteen copy anywhere.
The reference example is called Marlin, from Frantar and Alistarh, twenty twenty-four. It's a four-bit-weights times sixteen-bit-activations kernel, and it's used in V L L M. It lays out the four-bit weights in memory in exactly the order the tensor cores want them, and it overlaps loading the next chunk with computing the current one. And it stays close to the ideal four-times decode speed-up up to batches of sixteen to thirty-two. Past that, the multiply turns compute-bound and the four-bit edge fades. llama dot C P P has its own GPU kernels for each G G U F type, and they matter just as much. The same Q four K M file can run at quite different speeds depending on how you built it and which version.
So the practical upshot: a quantized model is only as fast as its kernel on your GPU. The bandwidth prediction is a ceiling. If you're way below it, suspect the kernel first. A fallback path, a compute capability the fast code doesn't support, an unfused dequantize. Then suspect the format.

<!-- section: Build It -->

A: So, building it. It comes in two halves. On your Mac, you build quantization by hand on that small Qwen model, and you see every one of these effects yourself. That's an evening. On the Spark, you serve Llama three point one eight B Instruct, the scoreboard model, in several formats and measure speed and quality. That's another evening.
The Mac part runs on the CPU in thirty-two-bit float. Slow, but fine for a half-billion model. You set up a virtual environment, pull in PyTorch, transformers and the datasets library, and download Qwen and the WikiText two test set. One detail worth knowing: Qwen uses plain linear layers whose weight is stored as outputs by inputs, so a row really is one output channel. G P T two in transformers stores it transposed, so avoid it here, to keep your head straight. And Qwen's hidden sizes, eight hundred ninety-six and four thousand eight hundred sixty-four, both divide evenly by a hundred twenty-eight and by thirty-two.
Then the first real task, and this one's yours to write. Four small functions. A symmetric quantizer, where you pass in the bits and whether you want one scale for the whole tensor, one per row, or a group size. An affine one per group, with the zero-point. A relative error function, the size of the difference over the size of the original. And a bits-per-weight calculator, so you can do the four-and-an-eighth arithmetic automatically. Each quantizer hands back the dequantized matrix, same shape, so you can compare directly.

B: How do you do the groups without writing a loop over every block?

A: You reshape. Turn each row into a stack of groups, so the last dimension is one group of a hundred twenty-eight. Take the max along that last dimension, keeping its shape so it lines up with the weights automatically, do your rounding, and reshape back. A couple of gotchas. PyTorch's round sends exact halves to the nearest even number. That's fine, just know it. And guard against a group that's all zeros, because then the scale is zero and you'd divide by it. And test on something you can check by hand first: the number-line example. Minus point six, zero, point three three, point nine, affine four-bit, one group. You should get back minus point six, zero, point three, point nine.
Then you load the gate projection from layer zero and reproduce that granularity table. Then plant an outlier, set the very first weight to twenty times the biggest one, and rerun four-bit per-tensor, per-row and groups of a hundred twenty-eight. And predict before you run which numbers move.

B: Per-tensor goes off a cliff, per-row gets hurt only in that one row, groups barely notice.

A: That's what you should see. Next task, also yours: find the outliers. For the weights, for every linear layer except the output projection, compute how many standard deviations out its biggest weight is, and print the ten worst. Then for the worst one, find which input columns hold the biggest weights.
For the activations, you hang a little hook on every linear layer. A hook is a function PyTorch calls every time that layer runs, and yours records, for the layer's input, the biggest value per channel across all the tokens, and the median value overall. Run five hundred twelve tokens of WikiText through, take the hooks off, and print the layers with the biggest ratio of max to median, with the channel numbers. Then the questions to chew on. Are the same channels big across different layers? Across different text, like a code snippet? Which layer types have the worst inputs? And why might the down-projection be special, given that its input is the output of the MLP's gated multiply, two things multiplied together?
Third task: round-to-nearest a whole model and watch perplexity. You write the perplexity function yourself. Chop the first forty-one thousand or so tokens into non-overlapping windows of a thousand twenty-four. The model gives you the average loss for each window, you weight each window by how many tokens it actually predicted, average, and then undo the log. Then you quantize every linear layer's weights in place, keeping a copy of the originals to restore between runs, and sweep the formats. Predict the order before you run it. On an M-series Mac, each perplexity pass takes about thirty seconds, and the whole sweep took me about four minutes. Then the activation experiment: a hook that runs before each linear layer and swaps its input for an eight-bit quantized copy. Once with one scale per token, once with one scale for the whole thing. You should reproduce the seventy-six.

B: And there's a stretch one, I'm guessing?

A: A tiny A W Q. Make four-bit, groups of a hundred twenty-eight better, without changing the format. From your activation stats, get the average size of each input channel. Then for a strength, try zero, a quarter, a half, three quarters, one, you scale each weight column up by that channel's average size raised to the strength, normalized so the factors average out to one. Quantize, then divide the columns back down. In a real deployment you'd fold that into the previous layer instead, but mathematically it's the same thing. Then measure the layer's output error on calibration inputs, and keep the best strength for each layer. Rerun perplexity and see if you beat plain round-to-nearest. And have an agent review it for the classic mistake: calibrating and evaluating on the same tokens, which flatters your result. And for whether you scaled columns or rows.

<!-- section: Build It: On the Spark -->

A: [matter-of-fact] Then the Spark. You want the same model served at least a few ways, each one speaking the same OpenAI-style API your bench script from the baseline already talks to. B F sixteen in V L L M. F P eight, either by telling V L L M to quantize on the fly, which computes one scale per tensor at load time, or by grabbing a pre-quantized F P eight checkpoint. A four-bit A W Q or G P T Q checkpoint of the same model, and V L L M figures out the format from its config. G G U F Q eight zero and Q four K M through llama dot C P P's server, which also speaks the OpenAI API. And N V F P four, optionally, only if your engine's release notes say F P four works on G B ten.

B: [a bit unsure] Is the install going to fight me? It's ARM and Blackwell.

A: Probably, and that's the first thing to know. Read the DGX Spark playbooks and the user guide on NVIDIA's site before anything. They've got tested containers and commands for V L L M and llama dot C P P on that chip, and the generic install instructions often don't apply, because that combination is new. Confirm the GPU's compute capability, and confirm which quantization kernel the engine actually picked. V L L M logs that at startup. Read it and write it down.
For each format, record the actual bytes. The checkpoint's size on disk, or better, the weight memory the engine reports after loading. That's your bytes per token for the prediction. Then run your harness against each one, one user at a time and sixteen at a time, short prompts, two hundred fifty-six output tokens, telling it to ignore the end-of-sequence token so every run makes the full length. And once with the long prompts, one user, to see prefill. Everything else stays fixed. Same prompts, same sampling, same server flags apart from the format.
And then the quality eval, because speed without quality is meaningless. This one's yours. A script that takes a server address and model name, runs a fixed set of questions at temperature zero, and scores them. The first two hundred problems from the G S M eight K test set. Prompt for step-by-step reasoning that ends with "The answer is" and a number, pull out the last number, compare to the reference, and allow five hundred twelve output tokens. Save every answer for every format, and report not just accuracy, but how many questions went from right to wrong, and wrong to right, compared with B F sixteen.
And a confidence interval. Bootstrap it: resample the two hundred questions with replacement a thousand times, and take the middle ninety-five percent of the accuracies you get. With only two hundred questions, that interval's going to be several points wide, and that's the point. Two formats whose intervals overlap heavily aren't demonstrably different. And for a sharper comparison, a paired test on the per-question results is more powerful than eyeballing intervals.

B: Couldn't I just use one of the standard eval harnesses?

A: You could, EleutherAI's L M evaluation harness can talk to a local OpenAI-style server. But write your own first anyway. You should know exactly what's being scored. And optionally, for the G G U F files, llama dot C P P's perplexity tool has the K L divergence mode: you save the full-precision model's outputs once, then compare each quant against them.
Last, one scoreboard row per format: the format, its bits per weight, the engine and its kernel in the notes, and the G S M eight K accuracy with its interval. One thing to keep straight. The V L L M B F sixteen row is itself a big jump from your naive server, because V L L M batches, and that's a different lesson. The rows that isolate quantization are the format rows compared with that V L L M B F sixteen row, all on the same engine.
You're done when your affine function reproduces the number-line example exactly, your granularity table's close to mine, you can name the worst outlier channel in Qwen's activations and which layer type it feeds, your sweep shows both disasters, and you've got at least three formats on the Spark, each with a measured speed, a prediction next to it, an accuracy with an interval, and a flip count.

<!-- section: Measure -->

A: [working it out] So what should the numbers look like? On the Mac, compare against mine. Original, fourteen point four five. Eight-bit per-row, fourteen point four nine. Eight-bit per-tensor, fifteen point one two. Four-bit per-tensor, about seventy-nine million. Four-bit per-row, thirty-one point seven. Groups of a hundred twenty-eight, twenty symmetric, seventeen point two with a zero-point. Three-bit, two hundred six. And for the activations, fourteen point seven three per token, seventy-six point six per tensor. Yours should match closely if your windows and token counts match. Small differences in how you count tokens at the window edges shift the second decimal place.
On the Spark, predict first. Same division as always. Bytes per token is the weights you actually read per token, which is everything except the embedding table, because that's just a lookup of one row. For Llama three point one eight B, that's about seven billion layer weights, plus the output projection, about half a billion weights, which most quantized checkpoints keep in B F sixteen. So about a gigabyte for that alone. Do the division with the spec sheet's two hundred seventy-three, and again with the bandwidth you actually measured.

B: [working it out] So B F sixteen is... seven and a half billion weights times two bytes, fifteen gigabytes, two seventy-three over fifteen... about eighteen?

A: About eighteen. F P eight: seven billion times one byte, plus the gigabyte, about eight gigabytes, about thirty-four. Four-bit groups of a hundred twenty-eight, about four point seven gigabytes, about fifty-eight. For the G G U F files, just use the file size: Q eight zero about eight and a half gigabytes, about thirty-two. Q four K M about four point nine, about fifty-six. And N V F P four, if it runs, about five gigabytes, about fifty-five. And if the engine reports a different weight size, use that instead.

B: So on paper four-bit's a bit over three times B F sixteen. Fifty-eight over eighteen.

A: On paper. What you'll actually see is speed going up roughly in proportion to the bytes, but not perfectly. Every step has fixed costs that don't shrink with the weights. Launching the GPU kernels, attention over the K V cache, sampling, and the unpacking. And the fewer bytes the weights take, the bigger the share of each step those fixed costs eat. So four-bit lands at a lower percentage of its ceiling than B F sixteen does. Something like four-bit giving you two and a half to three and a half times B F sixteen's speed, instead of the clean four the bit count suggests, would be a completely normal result. Measure it.
For time to first token on the long prompt, F P eight should improve, because the math is faster. Four-bit weight-only should stay roughly flat, because it's the same B F sixteen math. If four-bit prefill is clearly faster than B F sixteen, find out why before you believe it. And if it's a lot slower, the engine probably picked a slow kernel.
At sixteen users, every format beats your naive server, because V L L M batches. Between formats, the four-bit edge should be smaller at sixteen than at one, and F P eight should hold up well. That's the batching story showing up in your own numbers.
Quality: Q eight zero and F P eight should be within noise of B F sixteen on G S M eight K. The four-bit formats might cost a few points, or nothing you can measure with two hundred questions, while still showing a noticeable number of flips. And if a four-bit model loses ten points or more, check its chat template and your answer extraction before you blame quantization. A broken template is the most common cause of a mysteriously bad eval.
And llama dot C P P versus V L L M at the same bits will differ, because they're different engines with different kernels. Compare formats within one engine. Comparing engines is its own lesson.

<!-- section: Break It -->

A: And then you break it. Four ways. First, quantize per-tensor at four bits again, but on purpose this time. Print the fraction of weights that round to zero in the worst layer, and then have the model generate a few sentences, and actually read them.

B: [amused] The random number generator with opinions.

A: Yeah, you get to meet it. That's what "one scale shared by too many weights" feels like.
Second, go down to two or three bits. Round-to-nearest at three bits on the small model gave me two hundred six. If you've got time on the Spark, quantize a model to three bits with a G P T Q tool, several libraries do it, check which ones support your setup, and compare with round-to-nearest at the same bits and group size. The gap between them is what error compensation is worth, and it grows as the bits shrink.

B: And at eight bits the gap would be basically nothing.

A: Basically nothing, because round-to-nearest is already nearly lossless there. Third, calibrate on the wrong data. Run A W Q or G P T Q, or your own tiny A W Q, with a hundred twenty-eight samples of Python code, then measure perplexity on Wikipedia. And the other way round. Then try eight calibration samples instead of a hundred twenty-eight. Calibration data decides which channels count as important. The wrong data makes the wrong ones important.
And fourth, quantize what you shouldn't. Quantize the embedding table and the output projection too, per-tensor, and watch perplexity. Then on the Spark, quantize the K V cache to eight-bit, V L L M has an F P eight option for it, and run a long-context retrieval test. Hide one sentence in a thirty-thousand-token document and ask for it back.

B: And the bytes you save on the cache are real.

A: They're real. So are the errors.

<!-- section: Connections and close -->

A: So this is the first real escape route from the seventeen-tokens-a-second ceiling. Same division, smaller number on top. And it connects out in a few directions: the float formats get their full treatment in the number formats lesson, how much memory you free and how many more users fit is the memory math one, why weight-only formats fade at high batch is batching, why a naive dequantize is slower than B F sixteen is the kernels and serving-engines lessons, and whether a two-point drop on G S M eight K is even real is the statistics one. If you read one thing beyond this, Dettmers' blog post on L L M dot int eight and emergent features is the gentle way into the outlier story.

B: [working it out] Okay, let me try to say the whole thing. Four bits works or doesn't depending mostly on how many weights share a scale, because the scale has to stretch to cover the biggest one, and everything else gets rounded to zero. So you use small groups, and clever rounding, and keep the weird activation channels out of the way. And then you get about four times fewer bytes, so about four times faster.

A: [gently] Most of that's right. Two sharpenings. First, the speed-up only lands where you were waiting on bytes. Single-user decode, yes. Prefill and big batches are waiting on math, and a weight-only four-bit format does the same B F sixteen math as before, so it doesn't help there. That's what F P eight and F P four are for, because they shrink the math too. And second, it's not quite four times, even in decode. The scales cost bits, the output layer often stays at sixteen, and the fixed costs per token don't shrink. So expect something like two and a half to three and a half, and then go measure what you paid for it, in flips, not just in perplexity.
