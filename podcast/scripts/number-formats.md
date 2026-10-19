<!-- section: The Problem -->

A: [relaxed, thinking out loud] So here's a thing that happens to basically everyone once. You've got a fine-tuning script. It works in normal thirty-two-bit floats. And to save memory and time, you flip it to fp sixteen. Half the bytes. It trains. A few hundred steps go by, loss is going down, all good. And then the loss prints NaN, not a number, and it stays NaN forever.

B: I've seen that. Or it doesn't blow up, it just stops going down.

A: That's the sneakier version. No NaN anywhere, the loss just flattens, because a big chunk of the gradients have quietly turned into exactly zero. And then you flip the same script to bf sixteen instead, and it trains fine. No extra code. Same sixteen bits. Same speed on the GPU.

B: So something about how the sixteen bits are split decides whether the run lives.

A: That's it exactly. And I want to start from how you described it, because I think it's what most people think. You said bf sixteen has smaller precision, like the points after the decimal are fewer than fp sixteen.

B: [a bit unsure] Yeah. I think that's roughly right? Fewer digits after the point.

A: It's half right. bf sixteen really is less precise. But "points after the decimal" is the wrong picture, and the half that's missing is the whole reason bf sixteen won. To see it, you need what's inside a float. And it's simpler than it sounds.

<!-- section: One set of rules -->

A: [warm] Quick bit of history first, because it's a good one. Before nineteen eighty-five, every computer maker invented its own floating point. IBM mainframes worked in base sixteen. Cray machines did division with an approximation, so even x over y could be off in the last bit. The same program compiled for two machines gave two different answers.

B: That sounds like a nightmare for anyone writing numerical code.

A: It was. And a Berkeley mathematician, William Kahan, spent years collecting these horror stories. Intel hired him to design the math for one of their floating-point chips, and he pushed the same design through a standards committee. That became IEEE seven fifty-four. It fixed the bit layouts, the rounding rule, and what happens at the edges. Infinity, not-a-number, the tiny numbers near zero. He won the Turing Award for it, and every CPU and GPU you'll ever touch follows it.

B: And then deep learning came along wanting fewer bits.

A: Fewer bits means less memory and faster math. There was already a sixteen-bit standard, fp sixteen, and NVIDIA's GPUs started running it fast around twenty seventeen. Training in it worked, but only with a trick. Meanwhile Google Brain picked a different way to split sixteen bits for their TPUs, and called it bfloat sixteen. The b is for brain. NVIDIA added it to its chips with the A one hundred in twenty twenty, and within a couple of years almost everyone training big models had switched.

<!-- section: Scientific notation -->

A: So, you already know how to write really big and really small numbers. Scientific notation. Six point oh two times ten to the twenty-three. There are three parts. A sign. A few significant digits. And an exponent that says where the decimal point goes.

B: Sure.

A: And the trick is that the digits and the exponent do different jobs. The exponent decides how big the number is. Its range. The digits decide how precise it is. Three significant digits means you know the number to about one part in a thousand, whether it's astronomically huge or microscopically small.

B: [working it out] Oh. So precision isn't a number of decimal places. It's relative.

A: Precision is relative. That's the thing to hold onto. And a float is just scientific notation in base two. One bit for the sign. Some bits for the exponent, which sets the range. And some bits for the digits, which set the precision. Those digit bits are called the mantissa.

B: And with sixteen bits you have to choose how many go where.

A: That's the whole fight. fp sixteen gives five bits to the exponent and ten to the digits. So it's fairly precise, about three significant digits. But it can't hold anything bigger than about sixty-five thousand, and it runs out pretty quickly at the small end too. bf sixteen does the opposite. It keeps all eight exponent bits from normal thirty-two-bit floats, and only seven bits of digits.

B: So it's got the same range as full precision.

A: Exactly the same range. Up to about ten to the thirty-eight, and down to tiny numbers just like it. In fact it's literally the top half of a thirty-two-bit float. Same sign, same exponent, just the first few digit bits. So converting is basically chopping off the bottom sixteen bits. Every number lands somewhere sensible. It just gets blurrier.

B: How blurry?

A: Two hundred and fifty-six plus one, in bf sixteen, is two hundred and fifty-six.

B: [laughs] Okay, that's blurry.

A: It's blurry. Only about two significant digits. But here's why "points after the decimal" is the wrong frame. bf sixteen stores pi as something a little off. It stores three thousand one hundred and forty-one point five nine as something a little off. And it stores a tiny number like three ten-thousandths as something a little off. Three wildly different sizes, and each one is off by the same small fraction. There isn't a fixed number of places after the point. There's a fixed number of significant digits.

<!-- section: The gaps grow -->

A: And that has a consequence that shows up all over training. Between any two neighbouring powers of two, a format has the same number of values it can store. So between one and two there's a certain number of steps. And between a thousand and two thousand there's the same number of steps, spread a thousand times wider.

B: So the gap between one number and the next grows as the numbers grow.

A: It doubles every time you cross a power of two. Which gives you the first way training goes wrong. Big plus small loses the small. Say a weight is one, and the update you want to add is a thousandth. In bf sixteen, the gap just above one is bigger than that. So one plus a thousandth rounds straight back to one.

B: So the update just... doesn't happen.

A: Doesn't happen. Do it a million times and the weight never moves. And there's a version of that I found kind of shocking when I tried it. Add a hundredth to a bf sixteen running total, a thousand times. The true answer is ten.

B: And it's not ten.

A: It's four. Once the total reaches four, the gap between numbers there is more than twice a hundredth, so every add after that rounds away. It just sits at four. Any long sum in a narrow format does this. Which is why the hardware, even when you feed it sixteen-bit numbers, adds up the products in thirty-two bits.

<!-- section: Falling off the edges -->

B: Okay, but that's precision. You said the missing half was range.

A: Right, so now the edges. At the top, fp sixteen runs out around sixty-five thousand. Anything bigger becomes infinity. And that's really easy to hit. Sum the loss over forty thousand tokens and you're past it. Or the exponent in a softmax, on a perfectly normal score.

B: And infinity isn't the end of the world on its own.

A: On its own, no. But infinity minus infinity is NaN. Infinity divided by infinity is NaN. And NaN is contagious. Anything that touches a NaN becomes NaN. So one NaN in one gradient goes into the optimizer, the optimizer writes NaN into the weights, and the next forward pass is NaN everywhere. With lots of GPUs, the step where they add up their gradients spreads one GPU's NaN to all of them.

B: That's the forever-NaN loss.

A: That's the forever NaN. And softmax is the classic place, which is why every real softmax subtracts the biggest score first. Shifting every score by the same amount doesn't change the answer, and now the biggest exponent is just one, so nothing overflows. That same trick, done a block at a time, is the heart of FlashAttention.

B: And the bottom edge?

A: The bottom edge is the training story. Gradients are small. You average the loss over a whole batch, which divides everything down, and then the chain rule keeps multiplying by numbers smaller than one, layer after layer. Lots of gradient values end up really tiny. And fp sixteen just can't hold numbers that small. Below a certain point, they round to exactly zero.

B: So that's my loss flattening. Half the gradients are gone.

A: That's the flattening. And it's not a little bit of error. It's a gradient that's zero when it shouldn't be. While the top of fp sixteen's range, up near sixty-five thousand, is sitting mostly unused.

<!-- section: Loss scaling -->

A: [relaxed] And there's a lovely, simple fix from a twenty seventeen paper by NVIDIA and Baidu. Before you run the backward pass, multiply the loss by some big number.

B: Oh. And because backprop is all multiplies and adds, every gradient comes out that much bigger.

A: Every gradient, scaled up by exactly the same amount. That lifts the whole lot out of the danger zone at the bottom and into that empty space at the top. Then before the optimizer uses them, you divide back down. In thirty-two bits, where small numbers are safe. It's called loss scaling.

B: But how big a number? Too big and you overflow at the top instead.

A: Right, and the right size changes as training goes on. So in practice it's automatic. Start big. After every backward pass, check for any infinity or NaN. If you find one, skip that optimizer step completely, so the bad numbers never reach the weights, and halve the scale. After a long run of clean steps, double it again. It keeps finding the biggest scale that doesn't blow up.

B: That sounds like it works, but also like a thing with moving parts.

A: That's the catch. It worked, and it's how big models were trained for a few years. But it's one more thing to get right in every training loop. Skipped steps, scales that collapse after one bad batch, getting the order right with gradient clipping. And it can't fix an overflow that happens in the forward pass, because that's before the scaling does anything.

<!-- section: Why bf16 won -->

B: And bf sixteen just doesn't have the problem.

A: bf sixteen has the range of full thirty-two-bit floats. A really tiny gradient isn't anywhere near its bottom edge. It's not even close. Nothing underflows, so there's nothing to scale. And nothing overflows short of absurdly huge numbers, so the loss sums and attention scores are fine too. You just delete the scaler.

B: [skeptical] But it's less precise. Doesn't training care about that?

A: Barely, and here's why. Gradient descent with mini-batches is already noisy. The gradient from one batch is a rough guess at the true gradient, and it's off by way more than bf sixteen's rounding. So the rounding noise just disappears into noise that was already there. Range failures are different. They're not noise. One infinity ends the run.

B: So the answer to "why bf sixteen" isn't that it's more precise.

A: It's less precise. It won because in practice it can't overflow or underflow, so training needs no scaler and no babysitting. But there's an important "as long as". You keep precision where it actually matters. That's what people call mixed precision.

B: Meaning not everything is in bf sixteen.

A: Not everything. The big matrix multiplies, which are where all the time goes, run on sixteen-bit inputs, because the chip does those much faster. But the products get added up in thirty-two bits, or you'd get the stuck-at-four problem. The touchy operations, softmax, norms, the loss, big sums, run in thirty-two bits. The weights of record live in thirty-two bits, because otherwise those tiny updates round away. And the optimizer's state stays in thirty-two bits too. Adam keeps a running average of the squared gradient, and squaring a tiny gradient makes it way tinier.

B: Which is a lot of thirty-two-bit stuff for "sixteen-bit training".

A: It is. And that's a big part of why training needs so much more memory than serving the same model. And then fp eight is the same story one more turn of the crank. With only eight bits there's not enough range again, so you're back to scaling every tensor by hand. Fewer bits, so you manage range yourself.

<!-- section: Watching one die -->

B: Did you actually see this happen? Or is it one of those things that only bites at huge scale?

A: Both, kind of. I trained a tiny GPT on my Mac four ways. Thirty-two bits, fp sixteen, fp sixteen with the scaler, and bf sixteen. And honestly, at first, they all trained fine. A small model's gradients mostly sit above fp sixteen's edge. That's a real result. It mostly bites in bigger models.

B: So how'd you make it die?

A: I shrunk the loss by a factor of a thousand before backward. Which, for Adam, shouldn't matter, because Adam divides by the gradients' own size anyway. To stand in for what happens in a bigger model. And then on the very first step, almost half of fp sixteen's gradient values were exactly zero. And by the end, its loss was worse than where it started. It was pushing the weights in a direction that wasn't downhill.

B: And the other three?

A: Didn't notice. The scaler put the gradients back where they belonged. And bf sixteen didn't need any help at all, because those shrunk gradients were nowhere near its edge.

<!-- section: Ending -->

B: Okay, let me try. A float is scientific notation in binary. Some bits for how big, some for how many digits. fp sixteen spent its bits on digits, so it's more precise, but small gradients round to zero and big sums go to infinity, and you need loss scaling to survive. bf sixteen kept the full range and gave up digits. And it's less precise because it has fewer places after the decimal.

A: All right until the last sentence. It's less precise because it has fewer significant digits. Not places after the decimal. It's off by the same small fraction at any size, tiny or huge. And that's exactly why it works. The size of the number is handled by the exponent, which bf sixteen kept, and the rounding it adds is smaller than the noise training already lives with.
