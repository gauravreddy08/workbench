<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture a fine-tuning script. It works. In F P thirty-two, regular thirty-two-bit floats, it trains fine. And you want it smaller and faster, so you flip one setting to F P sixteen, the sixteen-bit kind. And it trains for a few hundred steps... and then the loss prints N A N. Not a number. And it stays N A N forever. Or, the sneakier version, there's no N A N at all. The loss just stops going down, and nothing tells you why. Then you flip the same script to B F sixteen. Also sixteen bits. Same speed on the GPU. And it just trains. No extra code. So here's the question. Same number of bits. Why does one of them kill the run?

B: [a bit unsure] Okay, so my gut on this... B F sixteen has smaller precision. Like, fewer points after the decimal than F P sixteen. I don't know the exact numbers. Which is why this surprises me, honestly, because if F P sixteen keeps more digits, it should be the better one. The safer one. And B F sixteen is the cheap, blurry version you use when you don't really care.

A: [gently] So half of that is right. B F sixteen really is less precise than F P sixteen. That part's true. But "points after the decimal" is the wrong picture, and the conclusion you drew from it is backwards. The thing B F sixteen gives up precision for is range. How big and how small a number it can hold at all. And range is the thing that keeps training alive. F P sixteen is the one that blows up. B F sixteen is the one that doesn't.

B: Huh. So the blurry one is the safe one.

A: The blurry one is the safe one. And to see why, you need to know what's actually inside a float. Which sounds scary, but it's really just three fields and one formula.

<!-- section: Origin -->

A: First, though, where the rules came from. Before nineteen eighty-five, every computer maker invented its own floating point. I B M mainframes worked in base sixteen. Cray supercomputers did division by multiplying by an approximate reciprocal, so even x divided by y could be off in the last bit. VAX had its own formats. So the same program, compiled for two machines, gave you two different answers. And people writing numerical code had to write it defensively, separately, for each machine.

B: That sounds miserable.

A: [warming up] It was. And a Berkeley mathematician named William Kahan had spent years just collecting these horror stories. In the late nineteen seventies Intel hired him to design the math for the eighty eighty-seven, their floating-point coprocessor chip. And he pushed that same design through an I triple E committee. The result was I triple E seven fifty-four, published in nineteen eighty-five. It fixed the bit layouts, the rounding rule, and what happens at the edges. Infinity, "not a number", and the tiny numbers right near zero. Kahan got the Turing Award for it in nineteen eighty-nine. And every CPU and GPU you'll ever touch follows it.

A: Then, thirty years later, deep learning wanted narrower numbers. Fewer bits means less memory and faster math. I triple E already had a sixteen-bit format, F P sixteen, standardised in two thousand eight. And NVIDIA's Volta GPUs, in twenty seventeen, ran it on their new tensor cores. Tensor cores are dedicated matrix-multiply units inside the GPU. They take small tiles of low-precision numbers and multiply them way faster than the general-purpose cores can. Training in F P sixteen worked. But only with a trick called loss scaling, which we'll get to. Meanwhile Google Brain picked a different sixteen-bit split for their TPUs. Keep F P thirty-two's exponent, chop the rest. They called it bfloat sixteen. B for brain. Brain floating point. NVIDIA added it to their tensor cores with the A one hundred in twenty twenty, and within a couple of years almost everyone training large models had switched.

<!-- section: The Idea: Scientific notation, in binary -->

A: Okay. So you already know how to write really big and really small numbers. Avogadro's number is six point oh two times ten to the twenty-three. The mass of an electron is nine point one one times ten to the minus thirty-one kilograms. Scientific notation has three parts. A sign. A few significant digits, the six point oh two. And an exponent that says where the decimal point goes.

A: And the trick is that those parts do different jobs. The exponent decides how big the number is. That's its range. The digits decide how precise it is. Three significant digits means you know the number to about one part in a thousand. Whether it's six point oh two times ten to the twenty-three, or six point oh two times ten to the minus twenty-three. Same three digits, same one part in a thousand.

B: [working it out] Oh. So that's where my "points after the decimal" thing falls apart. It's not a number of decimal places. It's a number of digits, wherever the number happens to be.

A: That's it. That's the idea to hold onto for the whole episode. Precision is relative. Not a count of places after the point. And a floating-point number is exactly this, scientific notation, just in base two. The binary point "floats" to wherever the exponent puts it, which is the name. And it's stored as three fields of bits. One sign bit, zero for positive, one for negative. Then the exponent bits, which say which power of two the number sits near. More exponent bits, more range. Bigger biggest numbers, smaller smallest ones. And then the mantissa bits, which say where the number sits between two powers of two. More mantissa bits, finer precision. Officially that's called the significand, and strictly the significand also includes one hidden bit we'll get to in a second. But everyone says mantissa.

<!-- section: The Idea: Decoding one by hand -->

A: Let's do one by hand. Minus two point five, into F P thirty-two bits. The slow way. Sign first. It's negative, so the sign bit is a one. Then write two point five in binary. It's two plus a half. Two is "one zero" in binary, and a half is a one in the first place after the point, the halves place. So two point five is one, zero, point, one.

A: Now normalise it. Slide the point so there's exactly one "one" in front of it. One zero point one becomes one point zero one, times two to the first. And here's a nice thing. Every nonzero number can be written as one point something, times two to the something. So that leading one is always there. Always. Which means there's no point storing it.

B: [skeptical] Wait, you just... don't store it?

A: [amused] You don't store it. It's called the hidden bit. You get one extra bit of precision for free, because the format just assumes it. So the mantissa stores only what comes after the point. Zero, one, and then zeros to fill out twenty-three bits.

A: And then the exponent. The power here is one. But the exponent field doesn't store one directly. It stores the power plus a fixed number called the bias. For F P thirty-two that's a hundred twenty-seven. So the field holds a hundred twenty-eight. Which in eight bits is a one followed by seven zeros.

B: Why add a hundred twenty-seven? Why not just store the power?

A: [matter-of-fact] So the stored field is never negative. Powers go below zero all the time, you need two to the minus thirty for small numbers. Adding a bias shifts everything up so the field is just a plain unsigned number. It's a hundred twenty-seven for F P thirty-two and also for B F sixteen, and fifteen for F P sixteen. So, put it all together. Picture a row of thirty-two little boxes. The first box, the sign, is a one. The next eight, the exponent, are a one and seven zeros. Then the long tail of twenty-three, mantissa, which reads zero, one, and then all zeros. In hex that's C zero two followed by five zeros, if you ever see it in a debugger.

A: And going the other way, from bits back to a number, is one formula, and it's the same for every format in this episode. Take the sign. Put a "one point" in front of the mantissa bits. Multiply by two raised to the exponent field minus the bias. So here: negative, one point zero one in binary, which is one and a quarter, times two to the hundred twenty-eight minus a hundred twenty-seven, which is two to the one. Minus one and a quarter, times two. Minus two point five.

A: That's the normal case. Two exponent values are reserved, though. An exponent field that's all zeros means "tiny or zero", and we'll come back to those. And all ones means either infinity, if the mantissa's zero, or N A N, if it isn't. N A N is "not a number". It's what you get from an operation that has no sensible answer, like infinity minus infinity, or zero times infinity. And it has two nasty properties. Any arithmetic that touches a N A N gives N A N. And N A N isn't even equal to itself.

<!-- section: The Idea: The formats -->

A: So now the formats. And the nice thing is every format in deep learning is that same recipe. Just a different number of bits in each field. So picture a few rows of boxes, stacked, each starting with one sign bit. Think of the exponent part as blue, that's range, and the mantissa part as white, that's precision.

A: F P thirty-two. One sign bit, eight exponent, twenty-three mantissa. Its largest number is about three point four times ten to the thirty-eight. Its smallest normal number is about one point two times ten to the minus thirty-eight. And it has about seven significant decimal digits.

A: [slowing down] F P sixteen. One sign, five exponent, ten mantissa. So a short blue part, a medium white part. Largest number: sixty-five thousand five hundred and four. That's it. That's the ceiling. Smallest normal number, about six times ten to the minus five, so roughly zero point zero zero zero zero six. And about three significant digits.

A: B F sixteen. One sign, eight exponent, seven mantissa. So the blue part is exactly as long as F P thirty-two's, and the white part is shorter than F P sixteen's. Largest number, three point four times ten to the thirty-eight. Same as F P thirty-two. Smallest normal, one point two times ten to the minus thirty-eight. Same as F P thirty-two. And about two significant digits.

B: Hang on. So B F sixteen reaches ten to the thirty-eight, and F P sixteen tops out at sixty-five thousand?

A: [emphatic] Sixty-five thousand five hundred and four. Yeah. That's the gap your gut was missing. And there's a single number that captures the precision side. It's called machine epsilon. It's the gap between one and the very next number the format can represent above one. It works out to two to the minus however many mantissa bits you have. And every time the hardware rounds a result, it can be off by up to half of that, relative to the size of the number. For F P thirty-two, epsilon is about one ten-millionth. For F P sixteen, two to the minus ten, about a thousandth. For B F sixteen, two to the minus seven, about eight thousandths.

A: And "decimal digits" is just epsilon translated. F P thirty-two has twenty-four bits of significand, the twenty-three stored plus the hidden one, which is about seven point two decimal digits. F P sixteen's eleven bits is about three point three. B F sixteen's eight bits is about two point four.

A: [slowly, deliberately] So here's the corrected version of what you said. F P sixteen has more precision and less range. About three significant digits, but nothing bigger than sixty-five thousand five hundred and four, and nothing, well, nothing normal smaller than about zero point zero zero zero zero six. B F sixteen has less precision and the same range as F P thirty-two. Only about two significant digits, it literally can't tell two fifty-six from two fifty-seven. But it goes all the way up to ten to the thirty-eight and all the way down to ten to the minus thirty-eight, exactly like F P thirty-two.

B: [working it out] Okay, let me flip my picture then. I had it as "F P sixteen, more digits, so it's the good one". It's really "F P sixteen, more digits, tiny window". And B F sixteen is "fewer digits, the whole window".

A: [pleased] That's right. And here's my favorite fact about it. B F sixteen is literally the top half of an F P thirty-two. Same sign bit, same eight exponent bits, and the first seven mantissa bits. To convert F P thirty-two to B F sixteen you, more or less, just drop the bottom sixteen bits. That's why it was so cheap to adopt. Every F P thirty-two number lands somewhere sensible in B F sixteen. It just gets blurrier. Which is also, by the way, where the "two bytes per parameter" comes from when people size a model. Weights in B F sixteen take two bytes each, F P thirty-two takes four.

A: And to really kill the "decimal places" picture. Take pi, three point one four one five nine. B F sixteen stores three point one four zero six two five. Now take a thousand times pi, three thousand one hundred forty-one point five nine. B F sixteen stores three thousand one hundred thirty-six. Now pi divided by ten thousand, zero point zero zero zero three one four one five nine. It stores zero point zero zero zero three one four seven. Three wildly different sizes. And every one of them is off by less than zero point two percent. Rounding to the nearest value actually guarantees under zero point four percent, half of epsilon, at any size at all. There's no fixed number of places after the decimal. There's a fixed number of significant digits.

B: [amused] Okay, three thousand one hundred thirty-six for three thousand one hundred forty-one is pretty blurry though.

A: [laughs] It's very blurry. Off by more than five. But it's off by the same fraction as pi was. That's the deal.

A: Two more formats. T F thirty-two, tensor float thirty-two. It's NVIDIA's, it's been in their tensor cores since the Ampere generation, the A one hundred in twenty twenty. It's F P thirty-two's eight exponent bits with F P sixteen's ten mantissa bits. Nineteen bits in all. And the thing to know is it's not a storage format.

B: So I'd never actually see a T F thirty-two tensor.

A: Never. Your tensors stay F P thirty-two in memory. When a matrix multiply runs on one of those tensor cores, with T F thirty-two turned on, the inputs get rounded to ten mantissa bits inside the hardware, and the products get added up in F P thirty-two. So you get a lot of the speed of sixteen-bit math, with F P thirty-two's range, and you don't change your code. In PyTorch it's off by default for matrix multiplies. There's a setting for float thirty-two matmul precision, and setting it to "high" turns it on. Check the docs for your version, though, the flags have moved around.

A: And F P eight. Eight bits can't do both jobs at once, so it comes in two flavours. E four M three, four exponent bits and three mantissa. That's the precise one, and its max is four hundred forty-eight. It's used for weights and activations. And E five M two, five exponent bits and two mantissa. The wide one, max fifty-seven thousand three hundred forty-four, used for gradients, because gradients swing across a lot of orders of magnitude. E four M three's epsilon is an eighth. E five M two's is a quarter. So, like, one significant digit, or less. The quantization episode does F P eight and F P four for inference. Here we only care about training, which comes near the end.

<!-- section: The Idea: Predict, 0.1 and 256 plus 1 -->

A: Try this one. Neither F P sixteen nor B F sixteen can store zero point one exactly. Which one stores it closer, and roughly how far off is each? And second part. What's two fifty-six plus one, in B F sixteen?

B: Closer is F P sixteen, it has more mantissa bits. How far off... no idea, a hundredth of a percent for one and a tenth for the other? And two fifty-six plus one, you said it can't tell two fifty-six from two fifty-seven, so... it rounds up to two fifty-eight?

A: The first part, good. F P sixteen stores zero point zero nine nine nine seven five five eight five nine three seven five. Off by about two point four hundred-thousandths, so about two hundredths of a percent. B F sixteen stores zero point one zero zero zero nine seven six five six two five. Off by about one ten-thousandth, about a tenth of a percent. That's the three extra mantissa bits. Two to the three is eight, so F P sixteen's grid is eight times finer.

A: The second part, it's two fifty-six. Here's why. Between two fifty-six and five twelve, B F sixteen's seven mantissa bits give it a hundred twenty-eight evenly spaced values. Two fifty-six wide, a hundred twenty-eight values, so they're two apart. Two fifty-six, two fifty-eight, two sixty. And two fifty-seven sits exactly halfway between two fifty-six and two fifty-eight. A perfect tie. And the tie rule is: go to the "even" one, the one whose last mantissa bit is a zero. That's two fifty-six. So you add one, and nothing happens.

B: So it's not even rounding up. It just eats the one.

A: [amused] Just eats it. And the same thing happens in F P sixteen, only higher up, at two thousand forty-eight plus one, which gives two thousand forty-eight. And in F P thirty-two at about sixteen point eight million plus one. Sixteen million seven hundred seventy-seven thousand two hundred sixteen, plus one, is itself. I mean, all three of those check out in PyTorch if you try them.

<!-- section: The Idea: Flip the bits yourself -->

A: There's a toy that makes all of this physical. Picture a row of bits you can click. Click one and it flips, and underneath it shows you the value, the exact value it really stores, and a little number line with the neighbours on either side, the only numbers this format can say anywhere near here. And you can switch formats, and the current value gets rounded into the new one.

A: So things to try. Set it to one. Then flip the second exponent bit. In B F sixteen, you land at two to the minus sixty-four. Do the same click in F P sixteen and you land at two to the minus eight. Same click, very different landing, because B F sixteen has more exponent bits, so each one moves you a lot further. Then go to F P sixteen's max and press "one step up". You don't get a slightly bigger number. You get infinity. Then go to the smallest normal and step down a few times. The exponent field drops to all zeros and you're in a different regime where the gap stops shrinking. And type zero point one into each format and compare what it actually stores. And the thing to keep an eye on is that the gap to the next number changes enormously as you move around, but the relative gap, the gap divided by the number, barely moves.

<!-- section: The Idea: The gaps grow with the number -->

B: Why does the gap change so much?

A: So this is the key fact about floats. Between any two neighbouring powers of two, like from two to four, or from a thousand twenty-four to two thousand forty-eight, there's the same number of representable values. It's two to the number of mantissa bits. B F sixteen has a hundred twenty-eight values between one and two. And a hundred twenty-eight values between a thousand twenty-four and two thousand forty-eight. So that second batch is spread a thousand twenty-four times wider. Each of those stretches, power of two to the next power of two, is called a binade. And inside a binade the values are evenly spaced.

A: And the gap from a number to its next neighbour has a name too. U L P, unit in the last place. It doubles every time you cross a power of two. So if you plotted it, gap on one axis, size of the number on the other, both on log scales, you'd get a staircase going up at forty-five degrees. Every step is a binade. Three staircases, actually. F P thirty-two's runs low and long, across the whole width. B F sixteen's runs just as long, same width, but it sits higher, eight times higher than F P sixteen's, because three fewer mantissa bits. And F P sixteen's staircase is the short one. On the right it just stops, at two to the sixteen, because past sixty-five thousand five hundred and four there's only infinity. And on the left it goes flat for a bit and then drops off a cliff to zero below about two to the minus twenty-four.

B: So the B F sixteen line is higher, worse precision, but it doesn't stop at either end.

A: Right. And there are three consequences of this staircase you'll actually meet in training code. First one. Big plus small loses the small. If the gap around some number a is bigger than twice b, then a plus b rounds straight back to a. In B F sixteen, one plus zero point zero zero one equals one. Because the gap above one is about eight thousandths, and a thousandth is way less than half of that.

B: [surprised] So if that's a weight...

A: Exactly where I'm going. A weight of one point oh, and an update of learning rate times gradient that comes out to a thousandth. In B F sixteen, the update vanishes. Do it a million times and the weight never moves. That's called stagnation. Updates smaller than half the gap round away, every single time, and the value just stops changing. And it's the reason training keeps a full F P thirty-two copy of the weights. Hold onto that.

A: Second one. Long sums stall. I mean, here's a clean experiment. Add zero point zero one into a B F sixteen running total, a thousand times. The true answer is ten. B F sixteen gives you four.

B: Four? Not like, nine point eight?

A: [amused] Four. Once the running sum reached four, the gap around four was about three hundredths. Which is more than twice zero point zero one. So every add after that rounded away. The sum just froze at four. F P sixteen does better but has the same disease. Add zero point zero one ten thousand times, true answer a hundred, and it stalls at thirty-two. Any reduction, a sum, a mean, a dot product, over lots of terms in a narrow format, has this problem. Which is why the hardware adds up products in F P thirty-two even when the inputs are sixteen-bit.

A: Third one. Order matters. Float addition isn't associative. A plus b, then plus c, can be different from a plus, b plus c. Because each plus rounds. And a GPU summing a million numbers splits them across threads in an order that can change from run to run. So the last few bits of your loss can differ between two identical runs.

B: [laughs] Okay, I've definitely seen that and assumed I had a bug somewhere.

A: [laughs] It's not your code. It's just float addition.

<!-- section: The Idea: Subnormals -->

A: Now, that cliff at the bottom of F P sixteen. Below the smallest normal number, which in F P sixteen is that six times ten to the minus five, you can't write the number as one point something times a power of two anymore, because you've run out of exponent. So the hidden one would have to go. And I triple E handles that with subnormal numbers. Also called denormals. When the exponent field is all zeros, the rule changes. There's no hidden one. The value is zero point mantissa, times two to the one minus the bias. So the gap stops shrinking, it stays fixed at the smallest step, that's the flat part of the staircase. And numbers fade toward zero gradually instead of falling straight off a cliff. You give up precision to get closer to zero.

A: In F P sixteen, the smallest positive subnormal is two to the minus twenty-four. About six times ten to the minus eight. Six hundred-millionths. Anything smaller than half of that rounds to exactly zero. That's underflow. A result too small for the format, so it either becomes a subnormal with only a few bits left, or it becomes zero.

A: And Kahan fought hard for this "gradual underflow" in the standard. It was controversial, because subnormals are slow on some hardware. A lot of CPUs take a slow microcode path for them, can be many times slower. And GPUs often have a flush-to-zero mode that just skips them. But in F P sixteen training, subnormals are exactly where a lot of small gradients live. So remember six times ten to the minus eight. It comes back.

<!-- section: The Idea: Rounding, and 0.1 plus 0.2 -->

A: A quick word on rounding, because it's going on under every single operation. Most decimal numbers can't be written exactly in binary. Same reason a third can't be written exactly in decimal. Zero point one in binary is zero point zero zero zero one one zero zero one one, and the "zero zero one one" just repeats forever. So the format stores the nearest value it has. The rule is round to nearest, ties to even. Pick the closest value, and if you're exactly halfway, pick the one whose last mantissa bit is zero. That's the rule that ate your two fifty-seven. And ties go to even so that, over lots of operations, you don't get a systematic drift upward.

A: And here's the promise I triple E makes. Every arithmetic operation computes the exact result, and then rounds it that way. So each step is off by at most half a U L P. That's why float math is predictable, even though it isn't exact.

B: Is that the zero point one plus zero point two thing? Where Python gives you a long ugly number?

A: That's the one. Python uses sixty-four-bit floats, and zero point one plus zero point two gives zero point three, then a long run of zeros, then a four. Three roundings happened there. Zero point one got rounded, zero point two got rounded, and their sum got rounded. And the errors didn't cancel. And a fun twist. In F P thirty-two, zero point one plus zero point two does equal zero point three. The errors happen to cancel. Neither one is "the right one". The lesson is that asking whether two floats are equal is really asking a question about rounding luck. So you compare with a tolerance. Math dot is close, torch dot all close.

A: And if you type zero point one into that bit flipper in F P thirty-two, the exact line reads zero point one zero zero zero zero zero zero zero one four nine zero one one six, and it keeps going, a whole bunch more digits. That's the number your model actually sees.

<!-- section: The Idea: Catastrophic cancellation -->

A: Now, the single most dangerous thing you can do in floating point is subtract two numbers that are nearly equal. It's called catastrophic cancellation. Each number already has a tiny relative error from rounding. You subtract, the matching leading digits cancel out, and what's left is... mostly those errors.

A: Example. Compute x times x, minus one, for x equals one point zero zero zero one. The true answer is zero point zero zero zero two zero zero zero one. F P thirty-two gives zero point zero zero zero two zero zero zero three three one nine. The fifth significant digit is wrong. From a format that promises seven. Because x times x got rounded to about one point zero zero zero two with an error around a ten-millionth. Next to one, that's nothing. But next to the zero point zero zero zero two that survives the subtraction, it's a one-hundredth-of-a-percent error. And in B F sixteen it's worse. One point zero zero zero one itself rounds to one. So the answer is zero.

B: [working it out] And this shows up in ML where? Anything that subtracts... means? Like a norm layer?

A: Yeah, the classic spot is variance. The textbook formula is the average of the squares, minus the square of the average. Two big numbers, nearly equal, whenever the mean is large compared to the spread. In low precision that can come out negative. And then you take a square root and get N A N. Which is why normalization layers compute their statistics in F P thirty-two and use more careful formulas. And why PyTorch's mixed precision runs them in F P thirty-two for you.

<!-- section: The Idea: Overflow -->

A: That was the bottom end. Now the top. F P sixteen runs out at sixty-five thousand five hundred and four. Anything bigger becomes infinity. That's overflow. And in F P sixteen it is very easy to hit. E to the eleven is about fifty-nine thousand eight hundred seventy-four. Fits. E to the twelve is about a hundred sixty-two thousand. Doesn't fit. Infinity. Three hundred times three hundred?

B: Ninety thousand. So... infinity.

A: [dry] Infinity. And here's one that actually happens. Summing up the loss over forty thousand tokens, each one around four. That's a hundred sixty thousand. Infinity.

A: And infinity on its own is bad, but it turns into N A N the moment it meets another infinity or a zero. Infinity minus infinity, infinity over infinity, zero times infinity. All N A N. And N A N is contagious. Every operation that touches it returns N A N. So one N A N in one gradient goes into the optimizer, the optimizer writes N A N into the weights, and the next forward pass is N A N everywhere. And on multi-GPU training it's worse. There's a step called the all-reduce, where every GPU contributes its gradients and every GPU gets back the sum. One N A N in any GPU's input makes the sum N A N on all of them. Within one step.

A: The classic place this happens is softmax. Softmax takes each score, raises e to it, and divides by the sum of all of those. Do that naively in F P sixteen on three scores, ten, eleven, and twelve. E to the ten is about twenty-two thousand. E to the eleven is about fifty-nine thousand eight hundred. E to the twelve is infinity. So the bottom of the fraction is infinity. The first two come out zero, and the third is infinity over infinity, N A N.

A: And the fix is simple. Subtract the largest score from all of them first. Softmax doesn't change if you shift every score by the same amount, because the shift cancels between the top and the bottom of the fraction. So after you subtract the max, the biggest thing you ever exponentiate is e to the zero, which is one. Nothing can overflow. Every real softmax does this. And the online softmax inside FlashAttention is this same trick, just done block by block. There's a cousin called log sum exp. When you need the log of a sum of exponentials, you pull the max out first, so it's the max, plus the log of the sum of e to each score minus the max. That one lives inside every cross-entropy loss.

B: [skeptical] Okay, so softmax is fixed. Then attention's fine in F P sixteen?

A: [jumping in] No, and this is the sneaky part. The max trick only protects the softmax. In attention, the scores going into the softmax come from a dot product of a query vector and a key vector. A hundred twenty-eight numbers each, multiplied pairwise and added up. And that can overflow before the softmax ever sees it. If the entries of the queries and keys drift up to around fifty, which activations do during training, each product is around two thousand five hundred. A hundred twenty-eight of those added up, and some of the scores blow past sixty-five thousand. When I tried it, with queries and keys at that scale, three of sixty-four scores came out infinity in F P sixteen. And the softmax over that row came out all N A N.

B: Because the max is infinity, and you subtract it.

A: Because you subtract infinity from infinity. Right. Attention does divide the scores by the square root of the vector length, which helps, but a lot of implementations apply it after the multiply, when it's too late. Some big-model training recipes add something called Q K norm, which normalizes the query and key vectors before the dot product, and that caps how big the scores can get. Partly for exactly this reason. And in B F sixteen, those same scores are fine. They're just blurry.

<!-- section: The Idea: Training in 16 bits, underflow -->

A: So now the training story, putting it all together. The forward pass first. Activations are mostly moderate numbers, and with the max trick, F P sixteen copes. The trouble is the backward pass. Gradients are small.

B: How small, roughly?

A: [thinking out loud] So think about where they start. Cross-entropy loss is averaged over every token in the batch. Batch size times context length. If that's thirty-two sequences of sixty-four tokens, that's about two thousand tokens, so each token's gradient starts out divided by about two thousand. And then the chain rule multiplies by weights and derivatives that are often less than one. Layer after layer after layer. So plenty of gradient values end up somewhere between a hundred-millionth and a hundred-thousandth. And in F P sixteen, remember, anything below six times ten to the minus eight becomes zero. And anything below six times ten to the minus five is a subnormal, with only a few bits of precision left.

A: Here's what that looks like, measured. Walk down the gradient sizes. A gradient of a hundred-thousandth, both formats store it fine. A millionth: F P sixteen's already in subnormal territory and stores it about one point three percent off. B F sixteen, fine. A ten-millionth: F P sixteen is nineteen percent off. Three hundred-millionths: F P sixteen stores roughly double the true value. And a hundred-millionth: F P sixteen stores zero. Gone. And B F sixteen, all the way down that ladder, is within a fraction of a percent every time.

B: So F P sixteen's great in the middle and just falls apart at the bottom.

A: That's exactly how to say it. B F sixteen's precision is coarse, always about two or three digits, but it never runs out of exponent. F P sixteen is precise in the middle and falls apart at the edges. And in twenty seventeen, a paper called "Mixed Precision Training", Micikevicius and colleagues at NVIDIA and Baidu, actually plotted the gradients of real networks. A big share of them were below F P sixteen's range. And the top of F P sixteen's range was sitting there, mostly unused. And their fix was really, really simple.

<!-- section: The Idea: Loss scaling -->

A: Loss scaling. Multiply the loss by a big number, call it S, say sixty-five thousand five hundred thirty-six, before you run backward. Backpropagation is all multiplications and additions. So by the chain rule, every gradient comes out exactly S times bigger. That shifts the whole pile of gradients up by sixteen binades. Out of the underflow zone, into the empty top of F P sixteen's range. And then, before the optimizer uses them, you divide them back down by S. In F P thirty-two, where small values are safe.

B: [amused] That's it? You just... multiply by a big number and divide it back out?

A: [laughs] That's it. But the number is the hard part. Pick S too small and gradients still underflow. Pick it too big and some of them overflow to infinity. And the right S changes as training goes on. So in practice you use a dynamic loss scaler, and it works like this. Start with a big scale. PyTorch's starts at two to the sixteen, that sixty-five thousand five hundred thirty-six. Every step, after backward, check every gradient for infinity or N A N. If you find any, skip that optimizer step completely, don't let the bad values anywhere near the weights, and halve the scale. And if you go two thousand steps in a row with nothing bad, double the scale, to win back the headroom. So it finds, and keeps finding, the biggest scale that doesn't overflow.

A: In PyTorch it's about four lines. You make a grad scaler. You run the forward pass and the loss inside autocast with F P sixteen. Then instead of calling backward on the loss, you call backward on the scaled loss. Then the scaler does the optimizer step for you, which means unscale, check for infinity, and maybe skip. And then you tell the scaler to update, which is the grow or shrink. On your Mac you can point it at the M P S device instead of CUDA.

A: And it works. From twenty seventeen to about twenty twenty, that's how big models got trained, on V one hundreds. But it's a moving part, and moving parts break. Skipped steps. Scales that collapse to tiny values after one bad batch. It interacts with gradient clipping, you have to unscale before you clip, or you're clipping the wrong numbers. And it's one more thing to get right in every custom training loop you ever write.

<!-- section: The Idea: Why bf16 made it simple -->

A: [building up] Now think back to that staircase. B F sixteen's range is F P thirty-two's range. Its smallest normal number is one point two times ten to the minus thirty-eight. A gradient of a hundred-millionth isn't anywhere near the edge. It's thirty orders of magnitude away. Nothing underflows, so there's nothing to scale. And nothing overflows short of ten to the thirty-eight, so the attention scores and loss sums are fine too. With B F sixteen you just delete the scaler. And the whole problem goes with it.

B: [skeptical] But it's still less precise. Two digits instead of three. That's got to cost you something.

A: [patiently] It costs precision, yeah. About two point four decimal digits instead of three point three. And it turns out training barely cares, as long as you keep precision in the few places that really need it. That's next. The reason is that gradient descent with mini-batches is already noisy. The gradient from one batch is a rough estimate of the true gradient, off by way more than zero point four percent. So rounding noise at that level just gets lost in the sampling noise. Range failures are a different animal. They aren't noise. One infinity ends the run.

A: So that's the real answer to "why did everyone switch to B F sixteen". Not because it's more precise. It's less precise. It's because in practice it can't overflow or underflow, so training needs no scaler and no babysitting. TPUs had it from the start. NVIDIA GPUs from the A one hundred on.

<!-- section: The Idea: Mixed precision -->

A: But "B F sixteen training" never means everything is in B F sixteen. The recipe is called mixed precision training. Most of the math in a sixteen-bit format, for speed and memory. And the parts that need precision kept in F P thirty-two. So picture one training step as a loop. Top left, the master weights, in F P thirty-two, four bytes per parameter. That's the copy of record. An arrow to the right: cast them to B F sixteen. Then the forward pass, where the matrix multiplies take B F sixteen inputs but add up their products in F P thirty-two. Then the loss, top right, where the softmax, the norms and the loss itself run in F P thirty-two. Then down into the backward pass, again B F sixteen in, F P thirty-two sums. Then the gradients come back left and get converted to F P thirty-two. And then the optimizer, bottom left, Adam with its state in F P thirty-two, updates the master weights. And around again. And if you're using F P sixteen instead, you add a dashed side path: multiply the loss by S before backward, and when the gradients come back, divide by S, check for infinity, skip the step and halve S if you found any.

A: And each piece is where it is for a reason. Master weights in F P thirty-two, because of stagnation. An update of a ten-thousandth to a weight of a half vanishes in B F sixteen, because the gap around a half is about four thousandths. In F P thirty-two the gap there is about six hundred-millionths, so it survives easily. The optimizer updates the F P thirty-two copy, and a fresh B F sixteen copy gets made from it for the next forward pass. So all those tiny updates land, they add up, and eventually they're big enough to change the B F sixteen copy too.

A: Compute in B F sixteen, because the matrix multiplies are where nearly all the time goes, and tensor cores run sixteen-bit inputs much faster than F P thirty-two. On recent NVIDIA GPUs, B F sixteen dense matmul throughput is many times F P thirty-two's, check the spec sheet for your chip. And half the bytes means half the memory traffic for activations.

A: Accumulation in F P thirty-two, inside every matmul. A matmul output is a dot product, thousands of products added up. If you added them in B F sixteen you'd stall exactly like that zero point zero one sum that froze at four. So the tensor cores multiply B F sixteen inputs, keep the running sum in F P thirty-two, and only round the final answer to B F sixteen. You never see it, but it's why B F sixteen matmuls are accurate enough.

A: The touchy operations in F P thirty-two. PyTorch's autocast is a context you wrap your forward pass in, and it picks a precision per operation. It keeps a list. Matrix multiplies and convolutions go to B F sixteen. Softmax, log softmax, layer norm, exp, sums and losses run in F P thirty-two. And honestly, that list is just the cancellation section and the overflow section of this episode, turned into code.

B: And the optimizer? Why can't Adam just live in B F sixteen too?

A: So Adam keeps two running averages per weight. M, the average gradient, and V, the average squared gradient. Square a gradient of a hundred-thousandth and you get ten to the minus ten. In F P sixteen that's zero. Then Adam divides by the square root of V plus a little epsilon, and the default epsilon is a hundred-millionth, which in F P sixteen is also zero. So you get zero divided by zero. N A N. In B F sixteen, V doesn't underflow, but with two-digit precision the running averages get coarse, and the update itself stagnates. So Adam's state stays in F P thirty-two. Those two averages are eight bytes per parameter. Plus four for the master weights. That's most of why training takes so much more memory than serving, and the training memory episode adds all of it up.

A: One detail on bookkeeping. In PyTorch's own autocast, the parameters just stay F P thirty-two and get cast to B F sixteen on the fly for each matmul, so the "master copy" is simply the parameters. The big frameworks, Megatron, DeepSpeed, F S D P's mixed precision mode, store a B F sixteen copy of the weights for compute and keep the F P thirty-two master copy tucked inside the optimizer. Same idea. Different bookkeeping.

<!-- section: The Idea: Stochastic rounding -->

A: There's another way around stagnation, by the way. Stochastic rounding. Normal rounding always picks the nearest neighbour. Stochastic rounding flips a weighted coin. If a value is thirty percent of the way from one neighbour to the next, it rounds up thirty percent of the time and down seventy percent. Any single rounding is worse. But on average it's exact. And that's what saves tiny updates. An update that's a tenth of a gap moves the weight one full gap a tenth of the time. So on average it moves the right amount, instead of never moving. With that, you can store the weights in B F sixteen alone and drop the F P thirty-two master copy. Some accelerators do it in hardware, some optimizer libraries do it in software. It isn't the default in mainstream PyTorch training, though.

<!-- section: The Idea: FP8 training -->

A: And the next step down is F P eight for the matmuls. With only four or five exponent bits, F P eight doesn't have the range to hold a tensor's values directly. So you bring scaling back. This time per tensor. Before casting a tensor to F P eight, find its largest absolute value. That's called the amax. Then multiply the whole tensor so that biggest value lands just under E four M three's max of four hundred forty-eight. So if the biggest value in the tensor is four, you multiply everything by a hundred twelve. Cast it. Remember the scale, and undo it after the matmul. And the common recipe uses E four M three, the precise one, for weights and activations in the forward pass, and E five M two, the wide one, for gradients in the backward pass, where range matters more.

B: [skeptical] And you have to scan the whole tensor for its max every single time?

A: That's what the libraries try to avoid. NVIDIA's Transformer Engine does this bookkeeping for you on Hopper and newer GPUs. It wraps your linear layers and handles the F P eight casting, the scaling, and tracking those maxes. And its classic mode is called delayed scaling. It picks each tensor's scale from a short history of maxes from the previous steps, so it doesn't need an extra pass over the data first. Newer recipes go finer. DeepSeek V three, late twenty twenty-four, trained in F P eight with a separate scale for each small block of a tensor, instead of one per tensor. And Blackwell GPUs support block-scaled F P eight in hardware. And the master weights, the optimizer state and the touchy operations still stay in higher precision. Exactly like with B F sixteen.

B: So it's the F P sixteen story again.

A: [laughs] It's the same story, one more turn of the crank. Fewer bits, so you're back to managing range by hand.

<!-- section: The Idea: Predict, the shrunk loss -->

A: One more prediction, and it's the one the build is set up to answer. Adam is, almost, scale-invariant. Meaning if you multiply every gradient by a thousandth, its updates barely change, because Adam divides each gradient by its own running size. So if you multiply the loss by a thousandth before backward, F P thirty-two training should look the same. You train a small GPT four ways. F P thirty-two, B F sixteen, F P sixteen with no scaler, F P sixteen with the scaler. All with the loss shrunk by a thousand. Where does each one end up, compared to F P thirty-two?

B: [working it out] B F sixteen has the range, so it shouldn't care. F P sixteen with the scaler... the scaler multiplies by sixty-five thousand, so that cancels the shrink and then some. Fine. And F P sixteen with no scaler, the gradients are a thousand times smaller, so a lot of them underflow. It trains slower? Ends up a bit worse?

A: Three out of three on the first part. On a Mac, on the M P S backend, six hundred steps, F P thirty-two, B F sixteen and F P sixteen with the scaler all ended around one point six seven, one point six eight. Same as with no shrink at all. And the scaler rescues F P sixteen because sixty-five thousand five hundred thirty-six times a thousandth is about sixty-five, which puts the gradients back above where they'd have been without the shrink. But F P sixteen with no scaler didn't just train slower. It fell apart. At the very first step, forty-six percent of the gradient values were exactly zero. And by step six hundred the loss was six point nine. Worse than where it started, which was four point three.

B: Worse than random? It went backwards?

A: [sighs] It went backwards. Shrink by ten thousand instead, and ninety-nine percent of the gradients are zero at step zero, and the loss ends at thirty-four. And there's an honest footnote here. Without the shrink, F P sixteen with no scaler trains just fine on this small model. Small models with modest batch sizes often don't underflow much. The shrink is standing in for what happens in bigger models, where the gradients really are that much smaller.

<!-- section: Build It -->

A: So, what you'd actually build. It all runs on your Mac. A folder, a virtual environment, PyTorch, numpy, matplotlib, and tiny Shakespeare, the classic little language-modeling dataset, about one point one megabytes of text. On the Spark you'd install NVIDIA's recommended CUDA build of PyTorch for ARM, check their docs for the right one.

A: First build: a float decoder. From scratch. No struct module, no numpy inside it. Just integer bit operations and that one formula. You describe a format by how many exponent bits and how many mantissa bits it has, and the bias falls out of that. Then a decode function takes a bit pattern and hands back the sign, the exponent field, the mantissa, what kind of number it is, normal, subnormal, zero, infinity or N A N, and its value. And a little pretty-printer that shows the bits next to the math. You pull the fields out with shifts and masks. The part that matters is handling the two special exponent values first. All ones is infinity or N A N. And all zeros is subnormal or zero, and there the power is one minus the bias, not zero minus the bias.

B: Why one minus the bias? That seems arbitrary.

A: [thinking out loud] It makes the subnormals join up with the normals. The smallest normal number has an exponent field of one, so its power is one minus the bias. The subnormals use that same power, they just drop the hidden one. So they continue smoothly downward from the smallest normal, with the same step size. If you used zero minus the bias, there'd be a jump. And that's exactly the bug you'll find. Then you test against the real thing. Get true bit patterns out of Python's struct, numpy and PyTorch, and check one, minus two point five, zero point one, sixty-five thousand five hundred and four in F P sixteen, the smallest F P sixteen subnormal, F P sixteen's infinity and N A N patterns, and B F sixteen's version of pi.

A: Second build: every sixteen-bit pattern is a number. So decode all sixty-five thousand five hundred thirty-six of them, in F P sixteen and in B F sixteen. Count how many are finite, how many are infinity, how many are N A N, how many are subnormal. Check every finite one against PyTorch, they should all match exactly. Then sort the positive ones, compute the gap to the next, and plot gap against value on log scales. And predict the counts before you run it. The hint is that only one exponent value, all ones, holds infinity and N A N, and infinity is only two of those patterns. Your plot should come out as that staircase. And if F P sixteen's staircase doesn't go flat at the bottom, your subnormal case is wrong.

A: Third build: make F P sixteen overflow, three ways. Each demo prints the F P sixteen, F P thirty-two and B F sixteen results side by side. The naive softmax on ten, eleven, twelve, and then the stable one with the max subtracted, working in F P sixteen. Then attention scores. Random queries and keys, eight by a hundred twenty-eight, multiplied by a scale of ten, thirty, fifty, a hundred, and the dot products in F P sixteen. Count the infinities and the all-N A N rows. Find where it starts. And then check whether dividing by the square root of a hundred twenty-eight after the multiply saves you. Versus dividing the queries before the multiply.

B: After won't save you, right? The infinity's already there.

A: Right, dividing infinity by eleven is still infinity. Before is the one that helps. And the third demo is a loss sum. Forty thousand losses, all four point oh, summed in each format. F P sixteen gives you infinity. Then take the mean in F P sixteen, and it survives. And the question is why the mean survives when the sum doesn't, and the answer is in what PyTorch adds things up in internally.

A: Fourth is boilerplate. A tiny character-level GPT, about eight hundred thousand parameters, small enough to train in a few minutes on a laptop. The one choice that matters is that attention is written by hand, not the built-in fused version, so you can see the numerics and break them.

A: And the fifth is the core of the whole thing. One training loop, one flag that picks the precision mode, one flag that shrinks the loss. Same seed, same data order, every mode. AdamW, learning rate three thousandths, batch of thirty-two, context sixty-four. Every twenty steps you log the loss, the fraction of gradient values that are exactly zero, whether any gradient is infinity or N A N, and the scaler's current scale. The tricks that make it a fair comparison: one seed for building the model and a separate random generator for picking batches, so every mode sees identical weights and identical batches. Autocast around the forward pass and the loss, and compute the loss on the logits converted to F P thirty-two. Shrinking means backward on the loss times the shrink, but you log the unshrunk loss. And you create the grad scaler with an "enabled" flag that's only on for the scaler mode, so all four modes run the exact same code path.

A: The zero-gradient fraction is the number to watch. In F P thirty-two it's a fraction of a percent, because a few parameters genuinely get no gradient. Like the embedding rows for characters that just aren't in this batch. In F P sixteen with the shrink, watch it jump.

A: And the last one's on the Spark. Run the same training on CUDA. The curves should have the same shape, but the exact numbers will differ, because different kernels round differently. Then time a big matrix multiply, four thousand ninety-six by four thousand ninety-six, in F P thirty-two at full precision, F P thirty-two with T F thirty-two allowed, F P sixteen, and B F sixteen. Warm up first, synchronize the GPU before you read the clock, average lots of runs, and convert to trillions of operations per second. A square matmul of size n is two times n cubed operations. Have an agent review the timing before you trust it, and compare against the spec sheet.

A: You're done when your decoder matches PyTorch on every one of the sixty-five thousand five hundred thirty-six patterns in both formats, you've seen infinity and N A N come out of softmax, attention scores and a loss sum and fixed the softmax, you've got the four loss curves with and without the shrink, and you can explain from your own plots why B F sixteen doesn't need a scaler.

<!-- section: Measure -->

A: Write your predictions down first. Then here's roughly what you should see. Those reference runs were on an M four Pro Mac, PyTorch two point fourteen, M P S, six hundred steps.

A: With no shrink, everything trains. F P thirty-two ends at one point six six, F P sixteen at one point six seven, F P sixteen with scaler and B F sixteen both at one point six eight. The four curves sit almost on top of each other. The small differences are rounding noise, not a real quality gap. And F P sixteen with no scaler is fine here, because for an eight hundred thousand parameter model the gradients mostly sit above that six times ten to the minus eight. That's an honest result. F P sixteen's underflow problem grows with model size, depth and batch size. It bites in real training runs, not necessarily in toy ones.

A: With the loss shrunk by a thousand, F P sixteen without a scaler dies, and the others don't even notice. Shrinking by a thousand moves every gradient down about ten binades, ten halvings. And almost half of them fall below F P sixteen's smallest subnormal. So at step zero, F P thirty-two, B F sixteen and the scaler run all have about zero point one three percent zero gradients, and F P sixteen has forty-six percent. And with half the gradient missing, and the rest distorted, AdamW pushes the weights in a direction that just isn't downhill. Six point nine four at the end. The scaler's sixty-five thousand puts the gradients back, so it matches F P thirty-two. And B F sixteen matches with no help at all, because a gradient of a billionth is nowhere near its edge.

B: Wait, in the ten-thousand shrink, did F P thirty-two move too? You said one point seven something.

A: [impressed] It did, one point seven oh against one point six six. And that's most likely not a precision problem. It's Adam's epsilon, that hundred-millionth, no longer being tiny compared to gradients that small. So Adam's updates really did change. Which is a nice reminder that "scale-invariant" was always an approximation.

A: And the enumeration. F P sixteen has sixty-three thousand four hundred eighty-eight finite values, two infinities, and two thousand forty-six N A N patterns.

B: Two thousand? Why so many ways to say "not a number"?

A: Every pattern with the exponent all ones and a mantissa that isn't zero is a N A N. Ten mantissa bits is a thousand twenty-four patterns, minus the one that's all zeros, that's infinity. So a thousand twenty-three. Times two signs, two thousand forty-six. B F sixteen has seven mantissa bits, so it has only two hundred fifty-four N A Ns, two infinities, and sixty-five thousand two hundred eighty finite values. The gaps: just above one, F P sixteen's gap is about a thousandth, B F sixteen's about eight thousandths. Just above a thousand, half versus four. Just above sixty thousand, thirty-two versus two hundred fifty-six.

A: On the Spark, B F sixteen and F P sixteen should come out well above F P thirty-two, with T F thirty-two in between. The exact ratios depend on the chip, so compare with NVIDIA's published numbers for the G B ten. And watch out, the headline numbers are often quoted with sparsity, which a plain dense matmul doesn't get.

<!-- section: Break It -->

A: Then you break it. What if you make the whole model F P sixteen? Not autocast. Call half on the model, so the weights, the gradients and Adam's state are all F P sixteen.

B: The Adam thing. The epsilon goes to zero.

A: That's one reason, yeah. Loss was N A N by step one hundred. Adam's epsilon rounds to zero, its squared-gradient average underflows, and the update divides by zero. Raise epsilon to a ten-thousandth and it lives longer. It stalled around two point eight six and then went N A N by step three hundred anyway. Every piece of "keep the optimizer in F P thirty-two" is in that one failure.

A: What if you make the whole model B F sixteen, and use a small learning rate?

B: [a bit unsure] B F sixteen has the range... so it doesn't blow up? But the weights themselves are blurry now.

A: [gently] It doesn't blow up. It stalls. The weights are B F sixteen, so small updates stagnate. At a learning rate of three thousandths it barely hurt, one point six nine against one point six eight with autocast. But drop the learning rate to three ten-thousandths and the gap opens. Two point three one for pure B F sixteen, against two point one six for autocast B F sixteen. The smaller the updates are compared to the weights, the more of them round away. That's what F P thirty-two master weights, or stochastic rounding, are for.

A: What if you delete the divide-by-square-root in attention, and multiply the embedding output by twenty, so the activations are huge? Then train in F P sixteen with the scaler. Watch the scaler's scale. It keeps halving, and every halving is a skipped step. Because now the overflow is in the forward pass. And loss scaling only touches the backward pass, so it can't fix it. Train the same broken model in B F sixteen and it may still train badly, the softmax gets really peaky without that scale, but it shouldn't produce infinity.

B: So a scale that keeps collapsing is basically an alarm that the forward pass is overflowing.

A: That's how to read it. A few skipped steps early on is normal. A scale that keeps falling means something's overflowing where the scaler can't reach.

A: And the last one. Compare floats with double equals. In your decoder's tests, check whether the decoded value of F P thirty-two's zero point one equals zero point one. It's false. Because your decoder returns a Python float, which is sixty-four bits, holding the exact F P thirty-two value, zero point one zero zero zero zero zero zero zero one four nine and so on. That's a different number from sixty-four-bit zero point one. And then check zero point one plus zero point two against zero point three in sixty-four bits and in numpy's float thirty-two, and explain the two different answers in one sentence each.

<!-- section: Explain It Back: scaling up -->

B: So how does any of this change when it's a thousand GPUs and a hundred billion parameters instead of a laptop?

A: [relaxed, thinking out loud] A few things. First, more stuff gets summed. Bigger matmuls means longer dot products. Bigger batches. And the gradient all-reduce across a thousand GPUs. Every sum in a narrow format loses more the longer it gets, so the reductions, especially that all-reduce, need F P thirty-two accumulation. Or at least careful B F sixteen with F P thirty-two at the end. Second, activations and attention scores tend to grow in big models, so overflow risks show up that a small model never sees. That's why big recipes add things like Q K norm, a penalty on the size of the output logits called z-loss, and careful initialisation.

A: Third, rare events stop being rare. A thousand GPUs, months of training. A single infinity or N A N somewhere is going to happen. And one N A N spreads to every GPU through the all-reduce in one step. So you need detection, skipping, or rolling back to a checkpoint. And fourth, the pressure to go to F P eight grows with scale, because it's twice the matmul throughput and half the memory traffic again. Which brings back per-tensor or per-block scaling. The same range-management problem F P sixteen had, now handled by libraries like Transformer Engine.

<!-- section: Connections and close -->

A: And this is where the "two bytes per parameter" in model memory math comes from. It's also the float half of quantization, which picks up F P eight and F P four for inference along with the integer formats. And next is training memory, which takes this exact recipe, F P thirty-two master weights, F P thirty-two Adam state, B F sixteen compute, and adds up the bytes. It's why a model that needs two bytes per parameter to serve needs about sixteen to train. If you want one thing to read, Goldberg's "What Every Computer Scientist Should Know About Floating-Point Arithmetic" is the classic. And the gradient histogram in the twenty seventeen mixed precision paper is the whole underflow argument in one picture.

B: [working it out] Okay, let me say it back. I had B F sixteen as the less precise one, fewer decimal places, so I figured F P sixteen was the better one for training. But precision isn't decimal places, it's significant digits, and it's the same at any size. B F sixteen does give up a digit. But it buys F P thirty-two's whole range with it. And training dies from range, not precision. Tiny gradients become zero, big sums become infinity. So B F sixteen just... doesn't need the scaler.

A: That's right, and I'd sharpen one piece. B F sixteen doesn't get away with less precision on its own. It gets away with it because the precision is kept where it matters. The master weights, Adam's state, the sums inside every matmul, the softmax and the norms all stay in F P thirty-two. B F sixteen only carries the bulk of the multiplying, where a bit of rounding noise disappears under the noise of the batch. F P sixteen fails on range, and you can patch that with a scaler. B F sixteen just never hits the walls.
