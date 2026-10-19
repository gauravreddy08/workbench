<!-- section: The Problem -->

A: [relaxed, thinking out loud] So there's this thing about how the Spark writes text that's kind of cruel, once you see it. When you send a prompt, the model reads the whole thing in one pass. It hauls each weight across from memory once, and uses it for every word of the prompt at the same time. Lots of work per trip. But when it writes the answer, it can't do that.

B: Because each word depends on the one before.

A: Right. You can't work out the fifth word until you've picked the fourth. So it's one word, one full trip through the whole model, and the chip sits there mostly idle, waiting for weights to arrive. It could do way more math per trip. It just doesn't have anything to do it on.

B: Yeah, that's the memory wall thing. The speed is the model's size against how fast memory can move it.

A: That's the one. So here's a thought experiment. Suppose some oracle whispered the next four words to you. Before the model wrote them.

B: Then you'd just... feed them all in at once.

A: Feed them all in at once, like a tiny prompt. And in one pass, the model tells you what it would have predicted at every one of those positions. If the oracle was right, you just got four words for the price of one trip.

B: [skeptical] Sure, but there's no oracle.

A: There's no oracle. But there's a little model. Llama has a one billion version from the same family. It's a fraction of the size, so it's much faster, and on ordinary text it guesses the next word surprisingly often. It's wrong a lot too. So the idea needs a second half. The big model has to check the little one's guesses, keep the good ones, and fix the first bad one, all in that one pass.

B: And that's speculative decoding.

A: That's speculative decoding. And the reason it works at all is that checking is cheap. Feeding the big model five guesses instead of one word doesn't change how many bytes cross the wire. It's the same weights. You just do five times the math on each one, and the chip had tons of room for that. So checking five guesses costs about the same as writing one word.

<!-- section: Guess now, check later -->

A: [warm] And it's an old idea, really. CPUs have done it for decades. When the code hits a fork, the processor guesses which way it'll go and starts running that path before it knows. Right guess, you saved time. Wrong guess, throw the work away and back up.

B: Branch prediction. Speculative execution.

A: That's where the name comes from. For language models, back in twenty eighteen, some people at Google proposed guessing several words at once and having the model check them. But it only worked for greedy decoding. Where the model always takes its single top choice, so "correct" just means "matches the top choice".

B: And real products don't do that. They sample.

A: They sample, with a temperature. So there's no single right word to match. And that was the missing piece. Then in late twenty twenty-two, a team at Google posted a paper. And a few months later a team at DeepMind, independently, posted basically the same trick. Both borrowed an old technique from statistics, and both made speculation exact for sampling. Not approximately. Exactly. And they got two to three times faster on big models.

<!-- section: What "the same" means -->

B: [jumping in] Okay, I want to be careful here, because I always kind of hand-wave this. When people say it gives the same output, what does that actually mean? If you're sampling, you get different text every time anyway.

A: Yeah, and that's worth pinning down. So, at every step, the model doesn't output a word. It outputs a list of odds. One number for every possible next word in its vocabulary, and they add up to one. "The capital of France is", and "Paris" gets most of the odds, a few small words get a little, and there's a huge long tail of tiny numbers for everything else.

B: And greedy takes the top one.

A: Greedy takes the top one. Every time, same prompt, same answer. Sampling rolls a weighted die. Paris comes out most of the time, but now and then you get something else. That list of odds is the output distribution. And when we say speculation follows the same distribution, it means every possible answer has exactly the same chance of coming out, with or without the little model. You could look at a million outputs and never be able to tell which ones used it.

B: And with greedy?

A: With greedy it's even stronger. The text is identical, word for word. Because you keep a guess only if it's exactly what the big model would've picked. If it's not, you take the big model's pick and stop.

<!-- section: The rule -->

B: Okay, so here's how I always pictured it. The little model guesses, and if a guess is out of distribution, the big model stops it and corrects it.

A: [thinking] It's close. But it hides the interesting part. The big model doesn't throw guesses out for being "out of distribution". It throws them out at random. With a probability that's chosen very carefully.

B: At random? That sounds like the opposite of what you'd want.

A: Let me do it with one word. Say at some step the big model thinks the word "a" should come out a quarter of the time. But the little model is a bit too fond of "a". It proposes it more often than that. If you kept every "a" it proposed, "a" would come out too often, and you'd be drifting away from the big model.

B: So you keep only some of them.

A: You keep just the fraction that brings it back down to the right amount. The big model's odds divided by the little model's odds. Now flip it. Say the little model is stingy with some word. It proposes it less often than the big model would. Then you keep it every single time it shows up. But that still isn't enough. You're short.

B: So the shortfall has to come from... the rejections?

A: From the rejections. That's the clever part. When you reject a guess, you don't just ask the big model for a fresh word. You draw from what's left over. Only the words the little model under-guessed, in proportion to how much it under-guessed them. It's called the residual. So every bit of probability the little model put in the wrong place gets moved, by rejection, to exactly where it was missing.

B: [working it out] So the kept part covers wherever they agree, and the rejections fill in wherever the big model wanted more.

A: And those two pieces add back up to exactly the big model's odds. For every word. That's the whole proof, really. It's four lines on a whiteboard, and it's worth being able to do. But the picture is: the overlap, plus the leftover, is the big model.

B: Okay, but then why not just do the simple thing? If the guess is rejected, let the big model pick the word itself. It's the authority.

A: That's the most natural bug there is, and it sounds completely right. And it's biased. Because the words the little model over-proposed already got kept some of the time. If you then let the big model pick fresh from its full odds, those words get another chance, and they come out too often. The scary part is the text still reads fine. You'd never catch it by eye. Only a statistics test catches it.

B: Huh. Plausible isn't correct.

A: Plausible output is not the correct distribution. And there's one more thing that falls out of the rule. Nothing in it assumed the little model was any good. It could be terrible. The output is still exactly the big model's. A bad guesser only costs you speed.

<!-- section: How far ahead to guess -->

B: So how many guesses should it make? Why not guess twenty words ahead?

A: Because to keep the fifth guess, the first four all have to survive too. Say seven in ten guesses survive. The first one usually makes it, the first two pretty often, but the chance that a long run all survives drops off fast. So you hit a ceiling. At seven in ten, you never average much more than about three words per trip, however far ahead you guess.

B: And every guess costs something.

A: Every guess is a step of the little model, and you pay for it whether it's kept or not. So how good the guesser is sets the ceiling, and how cheap it is decides how far ahead to guess. A slow guesser wants short runs. A fast one can afford longer ones. And if the guesser is bad and slow, speculation is actually slower than not doing it.

B: So where do good guessers come from?

A: The obvious one is a smaller model from the same family. It has to use the same tokenizer, so word number whatever means the same thing to both. But here's a fun one. The guesser doesn't have to be a model at all. If you're summarizing a document, or editing code, the output copies the input a lot. So you look at the last couple of words you wrote, find them earlier in the prompt, and guess whatever came next there. That's called prompt lookup. It's free. Useless for open-ended writing, great for anything that quotes its input. And it's still exact, by the same rule.

B: And the fancier ones?

A: There are versions that bolt small extra heads onto the big model itself, or a tiny network that reads the big model's internal features instead of just its words. Those guess much better for the cost. EAGLE is the name you'll see in vLLM and SGLang. But they're all the same loop underneath. Guess, check in one pass, keep by the rule.

<!-- section: The ghosts in the cache -->

A: There's one bit of bookkeeping that everyone gets wrong once. When the big model checks the guesses, it writes notes for every one of them into its KV cache. That's the stored notes for each earlier word, so it doesn't have to redo them.

B: Including the ones it rejected.

A: Including the ones it rejected. So if you don't cut those back out, the next step is paying attention to words that aren't in the text. It's conditioning on a ghost. And here's the sneaky thing. The first round is always fine. Nothing's been rejected yet. So the bug hides in round two.

B: [laughs] That's very specific.

A: It's very specific and it'll bite you. Same with the little model's cache. Both have to be trimmed back to the real text after every round.

<!-- section: When it stops helping -->

B: So if this is so good, why isn't it always on?

A: Because it's spending something. It works because the chip is idle while one person's words are being written. But batching spends that exact same idle time a different way. Instead of guessing ahead for one person, you serve lots of people from each trip.

B: Oh. So with lots of users there's no spare room left to check guesses in.

A: Right. Check a handful of guesses for each of dozens of users and suddenly the chip is actually busy. Checking isn't free any more. And every rejected guess is real math you took from someone else. So production engines treat it as a latency tool for a quiet server. On when few people are around, dialled down or off as things fill up.

B: Which is the Spark. One user, one box.

A: The Spark is exactly where it shines. And the thing that surprised me when I built it there was the little model. On paper it's a fraction of the size, so each guess should cost a fraction of a big step. In practice it was a lot more than that. A small model's step is mostly fixed overhead, launching work on the GPU, Python, picking the word, and none of that shrinks with the model. That one number decided more about my speedup than how good the guesses were.

<!-- section: Ending -->

B: Let me try it back. Checking guesses is almost free, because writing is stuck waiting on memory and the chip has spare math. So a small model guesses a few words, and the big model checks them all in one pass. Keep the guesses that agree with the big model, and when one's wrong, the big model corrects it. And somehow that comes out exactly like the big model alone.

A: That's almost it. The part I'd sharpen is "when one's wrong". There isn't really a wrong. The keep is random, in proportion to how much the big model likes the guess compared to the little one. And when you reject, you don't just let the big model pick. You draw from exactly the words the little model under-guessed. That's what makes the overlap plus the leftover add up to the big model's odds. And it's why a terrible guesser can make you slower, but it can never make you wrong.
