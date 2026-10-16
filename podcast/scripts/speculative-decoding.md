<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, your scoreboard. The Spark running Llama three point one, the eight billion parameter one, and it decodes at, what, about thirteen tokens a second? Under a ceiling of about seventeen. And you know where that ceiling comes from. Every single token, the GPU has to drag all sixteen gigabytes of weights through a pipe that moves about two hundred seventy-three gigabytes a second. That's roughly sixty milliseconds just to read the model once. And the math units, the part of the chip that actually multiplies things, they spend more than ninety-nine percent of each step just... waiting for the bytes to show up.

B: Right, that's the memory-bound thing. The chip's fast, the pipe isn't.

A: That's it. And here's the cruel part. Prefill, when the model reads your whole prompt, uses that same one read of the weights for hundreds of tokens at once. Every weight comes off memory once and gets used for every word in the prompt. Decode can't do that.

B: [a bit unsure] Why not, though? If it's the same model, why can't it just do, like, the next ten tokens in one go?

A: Because token five depends on token four. And token four doesn't exist yet. You can't feed in a word you haven't written. So it's one token, one full read of sixteen gigabytes, one token, another full read. Over and over. So here's a thought experiment. Suppose some oracle whispered the next four tokens to you. Now you could feed all four into the eight B at once, like a tiny prefill, and in one pass you'd get the model's prediction at every one of those positions. And if the oracle was right... you just made four tokens for the price of one weight read.

B: [dry] Okay, but there's no oracle.

A: There's no oracle. But there's Llama three point two, the one billion one. The one B. It reads about two and a half gigabytes per token instead of sixteen, and it guesses the next word of ordinary text surprisingly often. It's also wrong a lot. So the idea needs a second half. A way for the big model to check the small model's guesses, keep the good ones, and fix the first bad one. All in that one pass.

B: [working it out] Okay so, this is roughly how I've always pictured it. I know it follows the same distribution. The small model runs ahead, and the big model stops it and corrects it if it goes out of distribution.

A: That's close. But it hides the interesting part. The big model doesn't throw guesses out for being "out of distribution", whatever that would mean. It throws them out at random. On purpose. With a probability that's chosen so carefully that the final text is statistically indistinguishable from what the big model would've written by itself. Not "nearly as good". The same distribution. Provably. And by the end you'll have written the proof yourself, and then checked it with a statistical test on your own hardware.

B: [skeptical] "At random" is doing a lot of work there.

A: It is. It's the whole trick. But let me ask you something first. Say you run the eight B alone with greedy decoding, so it always picks its single most likely next token. You get some answer. Then you run it again, same prompt, but with the one B drafting and speculative decoding on, also greedy. How different is the text?

B: I'd guess... mostly the same? Maybe a few words different where the small model snuck something in.

A: It's identical. Token for token. Apart from some rare floating-point near-ties, which we'll get to, because they're a fun detour. In greedy mode, speculative decoding only keeps a guess if it's exactly what the eight B would have picked anyway. So there's nothing to sneak in.

B: Okay, and if both runs use random sampling? Temperature one?

A: Then the two runs produce different text. But so do two runs of the eight B alone. Sampling is random, every run's different. So the claim can't be "same text". The claim is about the distribution. The chance of getting any particular answer is the same, with or without the draft model. You could look at a thousand outputs, a million outputs, and you couldn't tell which ones used speculation. The draft model changes how fast. Never what.

B: [slowly] Right, so this is where I get a bit lost, honestly. I use the phrase "same distribution" but I couldn't tell you exactly what the distribution is.

A: Good, because that's the first thing we're going to make concrete. But first, a quick bit of history, because this idea didn't come out of nowhere.

<!-- section: Origin -->

A: Guessing ahead and checking later is an old hardware trick. CPUs have done it for decades. It's called speculative execution. When the processor hits a branch in your code, an if statement, it doesn't wait to find out which way it'll go. It guesses, and starts running that path. If the guess was right, it saved time. If it was wrong, it throws the work away and backs up. Run the likely path before you know it's the right one, and discard it if it wasn't. For language models, the first version of this was in twenty eighteen. Mitchell Stern, Noam Shazeer and Jakob Uszkoreit, they called it blockwise parallel decoding. Predict several tokens at once, have the model verify them, keep the longest run that's correct. And it worked. But only for greedy decoding, where "correct" just means "matches the model's top choice".

B: And everyone samples.

A: Everyone samples. Real products sample with a temperature. So there's no single right token to match against. What does "correct" even mean when the model would pick Paris most of the time but sometimes something else? That was the missing piece. And then two labs found it, three months apart. In November twenty twenty-two, Yaniv Leviathan, Matan Kalman and Yossi Matias at Google posted a paper called "Fast Inference from Transformers via Speculative Decoding". And in February twenty twenty-three, completely independently, Charlie Chen and colleagues at DeepMind posted "Accelerating Large Language Model Decoding with Speculative Sampling". And they both made the same move. They borrowed a classic technique from statistics called rejection sampling. The idea there is, you want samples from some distribution that's hard to draw from directly. So you propose samples from an easier one, and then you keep each proposal with a carefully chosen probability, so what survives comes out exactly right. Here the hard one is the big model, and the easy one is the small model.

B: And it actually sped things up?

A: Leviathan's group reported two to three times faster on a big Google model called T five X X L. Chen's group got two to two and a half times on Chinchilla, a seventy billion parameter model, using a four billion parameter draft. And today, every serious inference engine ships some version of it.

<!-- section: The Idea: Output distribution -->

A: Okay. Output distribution. You've written the last line of a transformer yourself. The final hidden vector comes out of the last layer, you multiply it by the output matrix, and you get one number for every entry in the vocabulary. For Llama three, that's a hundred twenty-eight thousand, two hundred fifty-six numbers. One per word-piece the model knows. Those raw scores are called logits. They can be any real number, negative, positive, and bigger just means "more likely". Then you push them through softmax. Which is, you take e to the power of each score so they're all positive, and then divide each one by the total. Now you've got a hundred twenty-eight thousand positive numbers that add up to exactly one.

B: [thinking out loud] And that's... I mean, I'd have said the distribution is something like the model's overall style. Like, the kind of text it tends to produce.

A: Yeah, and that's the vague version that makes the exactness claim impossible to think about. It's not a vibe. It's not a style. It's that list. A vector. At every step, given everything written so far, the model hands you one probability for every possible next token. That list is the output distribution. So say the text so far is "The capital of France is". The list might give "Paris" zero point eight two. Eighty-two percent. "a", as in "a city in", five percent. "the", four percent. "located" three, "not" two. And then a long tail of tiny numbers for the other hundred twenty-eight thousand or so tokens, which together add up to maybe four percent.

B: So it's literally just a big table of odds for the next word.

A: For the next word, at this exact point in the text. Change one word earlier on and you get a different table. And then what you do with the table is called the decoding strategy. There are two basic ones. Greedy decoding picks the biggest entry. That's called the argmax, which just means "which entry is the biggest", as opposed to how big it is. So greedy says Paris, every time. Same prompt, same output, forever. It's deterministic. Sampling rolls a weighted die. And the nicest way to picture it is, imagine a ruler from zero to one. You lay the probabilities end to end along it. Paris gets the first eighty-two percent of the ruler, from zero to point eight two. Then "a" gets the next little sliver, from point eight two to point eight seven. Then "the", and so on, all the way to one. Now you draw a uniform random number between zero and one, and you see which slice it lands in. Say you roll point eight five. That's just past Paris, so it lands in "a". The model says "The capital of France is a". Paris comes out eighty-two percent of the time, "a" five percent of the time.

B: And temperature fits in where?

A: Temperature reshapes the list before you roll. You divide the logits by some number before the softmax. Below one, the list gets sharper, the top token hogs more of the ruler. Above one, it flattens out and the long tail gets more of a chance. And as temperature heads toward zero, you basically get greedy. Top K and top P, those are just more tweaks to the list before the roll, chopping off the tail.

B: [curious] Okay. But that's one word. This thing spits out whole answers.

A: Right, and that's the important step. Do this once per step and you get a sequence. And the probability of a whole sequence is just the product of each token's probability, given the ones before it. So "Paris" at eighty-two percent, then times the odds of whatever comes next given Paris, and so on, all multiplied together. And now we can say precisely what "same distribution" means. Two decoding procedures follow the same distribution if every possible output sequence has the same probability under both. Every one. That's the bar speculative decoding clears.

B: [piecing it together] So two runs can give different text, and that's fine, as long as, like, the odds of seeing any particular text are the same either way.

A: Yes. And if you can get every single step's odds exactly right, given whatever came before, then the whole sequence comes out right automatically, because it's just those steps multiplied together. So really the whole job is: make one step come out exactly right. From here on there are two lists in play, so let me give them names. There's the target model, the big eight B, the one whose output we actually want. Its list at a given step, the papers call P. And the draft model, the little one B, its list at the same step, with the same text before it, they call Q. Both are a hundred twenty-eight thousand numbers summing to one. Mostly I'll just say "the big model's number for this token" and "the draft's number for this token".

<!-- section: The Idea: Why checking is cheap -->

A: So now, the fact that makes this whole trick worth doing. And you actually already own it. When the eight B decodes one token, it reads all sixteen gigabytes of weights, and for each byte it reads, it does about one floating-point operation. One multiply or one add. One flop per byte. And the tensor cores, the matrix units, are capable of way, way more than that. So they sit idle. Now feed the model five tokens instead of one, in the same forward pass. What changes?

B: [skeptical] It's five times the work, though.

A: It's five times the math. But not five times the bytes. Each weight, once it's been pulled off memory, gets used five times instead of once. The bytes are the same sixteen gigabytes. And the bytes were the bottleneck. So there's this number called the ridge point. It's the chip's peak math rate divided by its memory bandwidth. It tells you how many operations you need to do per byte before math, instead of memory, becomes the thing you're waiting on. Below it, you're memory-limited. Above it, math-limited. On the Spark, it's in the hundreds of flops per byte. So going from one flop per byte to five... you're still deep in memory-bound territory. The step takes about the same time.

B: Oh. So the extra four tokens are basically riding along for free.

A: Basically free. So the eight B can score five positions in one pass. It gives you its list after the current text. Its list after the current text plus guess one. After guesses one and two. And so on. That's what's called verification. And mechanically it's just a mini prefill, on a short block. And the K V cache makes it cheap in the other direction too. Quick refresher on that: as the model processes each token, every layer computes a key and a value for it, which is what later tokens look at in attention. The K V cache stores those for everything the model's already seen, so it never redoes them. So when you verify, the whole past is already cached. Only the five new positions get computed. You'll actually measure this in the first real task. Time the eight B on one, two, four, eight, sixteen, thirty-two and sixty-four new tokens on top of a cached prompt. And you should see the time stay almost flat for the small counts, and then bend upward once there's enough math per byte that it starts to matter.

<!-- section: The Idea: Draft, then verify -->

A: So, the loop. Two players. The draft model is small, fast and often right, and its guesses never show up in the output unless the big model approves them. The target model is the authority. It's sometimes called the verifier. One round goes like this. First, draft. The one B generates K tokens the normal way, one at a time. K is just how many guesses per round, say four. And at each step it records its whole list, its Q. So that's K small passes, each reading two and a half gigabytes instead of sixteen. Second, verify. The eight B runs once, over the current text plus all the guesses, and gives back K plus one lists.

B: Why plus one? Four guesses, four lists, no?

A: Because it also gives you its list after the last guess. Think about it. Its first list is "what should come after the text as it stands". That's what you check guess one against. The second list is "what should come after guess one", for checking guess two. And so on, and the last one is "what comes after guess four", which nothing's been checked against yet. So, five. Third, accept, left to right. Check guess one against the big model's first list and the draft's first list, using a rule we'll get to. If it's kept, check guess two. And you stop at the first rejection. Everything after that point was built on a word that's now gone, so it's worthless. Fourth, fix or bonus. At the rejected position, you sample a replacement token from a corrected list. More on that in a minute, it's the clever bit. And if all K guesses were kept, you get one more token for free. You sample it from that last list, the one after the final guess, which the verify pass already computed. So every round emits at least one token, and at most K plus one. Even the worst round, where guess one gets rejected immediately, still produces one correctly distributed token for one eight B pass. You just wasted the drafting.

B: Can you walk me through one round with actual timing?

A: Sure. Say the text so far ends "the cat", and the plain way, the eight B alone, writes "sat on the rug". That's four eight B passes, one per word. Four units of time. Now the speculative way. The one B drafts "sat", "on", "the", "mat". Four quick steps. Say each one costs a fifth of an eight B pass, so point two each. Then one eight B pass over five positions, which costs a little more than a single pass, call it one point one. The verdict comes back: keep "sat", keep "on", keep "the"... and "mat" gets rejected. The fix step samples "rug" instead.

B: [working it out] So that's four times point two, point eight, plus one point one... one point nine. For four words.

A: One point nine passes of time, for four tokens. Three kept plus one fix. The plain way needed four passes. And if "mat" had been kept too, the fifth position would've handed you a bonus token on top. And to make the units real, one eight B pass on the Spark in B F sixteen is about sixty to seventy-five milliseconds.

<!-- section: The Idea: The acceptance rule -->

A: Okay. Now the part you were fascinated by. The draft proposed some token. And you've got two numbers in hand for it. The draft's number, how likely the draft thought it was. And the big model's number, how likely the target thinks it is. What do you do with them? The greedy case is easy, so let's just get it out of the way. With greedy decoding, the target's "list" effectively puts all its weight on its top choice. So keep the guess if it's the target's top choice. Otherwise throw it out, emit the target's top choice instead, and stop. That's the whole rule. And the output is token for token the same as running the eight B greedily by itself, because every token that comes out is the eight B's top pick given the text before it.

B: Sure. And for sampling it's the same, right? If the big model would pick Paris and the draft said "a", then "a" is wrong, so you reject it.

A: [gently] See, that's the trap. With sampling, there's no single right answer to match. The big model doesn't "pick Paris". It says Paris eighty-two percent of the time and "a" five percent of the time. So "a" is a perfectly correct output. It's supposed to happen, about one time in twenty. So you can't ask "is this guess correct?" You have to ask "how often should this token come out here, and how often does the draft propose it?"

B: Huh. Okay. So it's about frequencies, not right and wrong.

A: Frequencies. So try this. At some step, the big model gives "a" twenty-five percent. And the draft proposed "a", and the draft's own number for it was forty percent. So the draft is proposing "a" too often. With what probability should you keep it, so that "a" ends up coming out exactly twenty-five percent of the time?

B: [working it out] So it shows up forty percent of the time, and I want twenty-five out of that... so I keep it twenty-five out of forty of the times it's proposed. That's... five eighths? Sixty-two and a half percent.

A: Sixty-two and a half percent. Forty percent times sixty-two and a half percent is twenty-five percent. Dead on. And the other fifteen percent, the excess, gets thrown back. Now flip it. The draft's number for "a" is only ten percent, and the big model still wants twenty-five.

B: Then I keep it every time. Probability one. But that only... hm. That only gets me to ten percent. I'm short fifteen.

A: And where does the missing fifteen come from?

B: [unsure] From... somewhere else? I don't know where.

A: From the rejections. Think about it. In the first case you threw away fifteen percent of probability that was sitting on "a" when it shouldn't have been. In the second case you're short fifteen percent on "a". So when a rejection happens, the replacement step has to produce "a" extra often, to make up the gap. That replacement list is called the residual distribution, and it's the whole subtlety. And your two answers together are the rule. Keep the guess with probability equal to the big model's number divided by the draft's number, capped at one.

B: So, big over small, but never more than a hundred percent.

A: Right. That's the rule both papers state. In words: if the target likes the guess at least as much as the draft does, always keep it. If the target likes it less, keep it only that fraction of the time, the target's number over the draft's number. And when you reject, here's the key thing, you don't just ask the big model to pick again. You draw from the residual. And the residual is built like this. For each token in the vocabulary, look at how much more probability the target gives it than the draft does. If the draft already gives it as much or more, that token gets zero. Then rescale whatever's left so it adds up to one. So the residual only contains the tokens the draft was too stingy with.

B: [skeptical] Wait, why not just ask the big model to pick again? That feels like the obvious thing. The draft was wrong, let the expert choose.

A: It's the most natural wrong version. And it sounds totally right. But it's biased. Here's the intuition. The tokens the draft over-proposes, they already got all the probability they deserve from the keeps. Actually more, which is why some got thrown out. If you then sample from the big model's full list again, those same over-proposed tokens get another shot. They come out too often, and the under-proposed ones come out too rarely. And this is exactly where your original picture was off. Rejection isn't "the guess was out of distribution, ask the big model again". It's "this guess landed in a region the draft over-covers, so redirect this probability to the region the draft under-covers". Every bit of probability the draft put in the wrong place gets moved, by rejection, to exactly where it was missing.

<!-- section: The Idea: A six-word example -->

A: This is much easier with a tiny example you can hold in your head. Imagine a vocabulary of just six words. The, a, cat, dog, sat, on. The big model's list is: "the" forty percent, "a" twenty-five, "cat" fifteen, "dog" ten, "sat" six, "on" four. And the draft's list is: "the" twenty, "a" forty, "cat" ten, "dog" five, "sat" twenty, "on" five. Picture two bar charts side by side. The draft's on the left, the big model's on the right. Now for each word, shade the part that's the overlap, the smaller of the two numbers. "The" is twenty for the draft and forty for the big model, so its overlap is twenty. "A" is forty versus twenty-five, overlap twenty-five. "Cat", ten. "Dog", five. "Sat", twenty versus six, so six. "On", five versus four, so four.

B: And the overlap means what, exactly?

A: The overlap is the probability that the draft proposes that word and it gets kept. Check it on "a". The draft proposes "a" forty percent of the time, you keep it twenty-five out of forty of those times, so it comes out kept twenty-five percent of the time. The overlap. And for "the", the draft proposes it twenty percent of the time, and since the big model likes it more, you always keep it. Twenty percent. Also the overlap. So add up all the overlaps. Twenty, twenty-five, ten, five, six, four. That's seventy percent. So seventy percent of the time, the draft's guess is kept. That number has a name, the acceptance rate, and the papers write it as alpha. Here alpha is point seven.

B: And the other thirty percent are the rejections.

A: The other thirty percent are rejections. Now look at the big model's chart again. The overlap fills part of each bar. What's left unshaded, the part sticking up above the overlap, only exists on three words. "The" has twenty left over, because forty minus twenty. "Cat" has five left over. "Dog" has five left over. Everybody else is fully covered, the draft gave them as much or more than they needed. And those leftovers add up to... twenty plus five plus five. Thirty.

B: [surprised] Thirty. Same as the rejections.

A: Same as the rejections. Hold on to that, because it's the heart of the proof. So the residual is those leftovers, rescaled to add up to one. "The" gets twenty out of thirty, two thirds. "Cat" gets one sixth. "Dog" gets one sixth. So the draft over-proposed "a" and "sat", and the rejections refill "the", "cat" and "dog", the words it under-proposed. And there's an interactive version of exactly this on the page. You press a button to sample once and it shows you the trace, what got proposed, whether it was kept, what the residual picked. Then you press "sample ten thousand", and you watch a histogram of the outputs build up, and every bar settles right onto the tick mark for the big model's number. Forty, twenty-five, fifteen, ten, six, four. And it runs a chi-square test on the counts. That's a standard test that asks "are these counts plausible if the true odds really are these?" It adds up, for each word, how far the count is from what you'd expect, squared, relative to what you'd expect. Big number means "these counts are unlikely under the claimed odds". With six words there are five degrees of freedom, since the sixth is pinned down by the other five, and the cutoff at the usual five percent level is about eleven. The correct rule usually lands under eleven. About one run in twenty goes over just by chance, which is literally what five percent means.

B: And the bug? The "let the big model pick again" version?

A: There's a toggle for it. Turn it on, sample ten thousand, and the chi-square is in the hundreds. And it keeps growing with every batch you add, because the error isn't noise, it's real bias, and more data just makes it more obvious. Two more things you can play with there. There's a "one guess" mode, where the draft puts all its weight on a single word, "the". It just always proposes "the". And the rule still works. You keep "the" with probability equal to the big model's number for it, forty percent, and otherwise you sample from the big model's list with "the" removed. That's how draft-free methods stay exact, we'll come back to those. And there's a slider that moves the draft toward the big model. As you drag it, alpha climbs toward one and the residual empties out. A perfect draft never gets rejected.

<!-- section: The Idea: Why the output is exactly p -->

A: So, the proof. It's short. Four lines on a whiteboard, and you should be able to do it without looking. Fix one step. Pick any one word in the vocabulary. What's the probability that it's the word that comes out? There are exactly two doors it can come through, and they don't overlap. Door one, the draft proposed that word and it was kept. The draft proposes it with its own probability, and keeps it with the "big over small, capped at one" probability. Multiply those, and it always comes out to just the smaller of the two numbers. The overlap. We saw that with "a". Proposed forty percent of the time, kept twenty-five out of forty of those, so twenty-five percent. Door two, something got rejected, and then the residual produced our word. So you need the chance of a rejection, times our word's share of the residual. The chance of a keep, over all possible proposals, is the sum of all the overlaps. That's alpha. So the chance of a rejection is one minus alpha.

B: Right, thirty percent in the toy.

A: And here's the step that makes it work. One minus the total overlap is the same as the total of the leftovers. Because the big model's numbers add up to one, and each of its bars is overlap plus leftover. So one, minus all the overlaps, is all the leftovers. Which is exactly the thing you divide by when you rescale the residual. So the chance of rejecting, times our word's share of the residual, is: total leftover, times our word's leftover divided by total leftover. The totals cancel. You just get our word's leftover. In the toy, for "the": thirty percent chance of rejection, times two thirds, is twenty percent. Which is exactly what "the" had left over.

B: [working it out] Okay, so door one gives the overlap, door two gives the leftover...

A: And add them up. Overlap plus leftover. For "the", twenty plus twenty, forty. Which is the big model's number. For "a", door one gives twenty-five, and door two gives zero, because "a" has no leftover, the draft already over-covered it. Twenty-five. The big model's number again. And it's always true, for any word, because if the big model's number is bigger, you get the draft's number plus the difference, which is the big model's number. And if the big model's number is smaller, you get the big model's number plus zero. Either way, the big model's number. The bar charts I described, shaded overlap plus leftover, that was this proof drawn as bars.

B: [slowly] Huh. So the part that felt like a magic trick is that the rejection chance comes out to exactly the size of the leftover.

A: Yes. And that's not a coincidence of these particular numbers. It's forced. Both lists add up to one, so whatever probability the draft piles up in the wrong places has to be missing from somewhere else, in exactly the same amount. The rejections take the excess and the residual pours it back where it was missing. And notice two things. First, nothing in that argument assumed the draft was any good. The draft's list can be terrible, and the output is still exactly the big model's. A bad draft only costs you speed, because you reject more. Second, the thing that makes it work is that normalizer, the rejection chance equalling the total leftover.

B: That's one token, though. One round spits out several.

A: Right, so one more step, and it's induction. Take the first guess. By the argument we just did, the first token that comes out follows the big model's list after the current text. Now, if that first guess was kept, then it is the text now. It's real. And guess two was drafted from the draft's list given the text plus guess one, and it's checked against the big model's list given the text plus guess one. Same argument, so the second token follows the big model's odds given the first. And so on down the line. When a rejection happens, the round ends, and the next round starts from the text that actually got emitted. And the bonus token is sampled straight from the big model's last list, so that one's trivially right. So every token that comes out follows the big model's odds given everything that actually came before it. And the probability of any whole sequence is that same product of the big model's per-step odds that plain sampling gives you. Same distribution. Exactly.

B: So where can this go wrong? Because if it's provable, the only way to break it is to violate an assumption.

A: Right, and the proof tells you exactly what those are, and they're exactly the bugs you can write. One, the draft's list has to be the list you actually drew the guess from. If you draft greedily, always taking the draft's top choice, then the draft's real list puts all its weight on that one token. It's what's called one-hot. If you plug the draft's softmax into the rule instead, the rule's wrong. Two, the big model's list has to be computed on the true text. Which means the big model's K V cache can't still contain rejected tokens. More on that soon. And three, temperature, top K, top P, all that, has to be applied to the big model's list before the rule, and to the draft's list before drafting. Speculation reproduces whatever list you feed it, warped or not.

<!-- section: The Idea: How many tokens per pass, and the best K -->

A: Okay, so it's exact. Now, how fast is it? Each round, how many tokens come out? To get a clean formula, pretend each guess is kept independently, with the same probability alpha. In reality acceptance swings around a lot from token to token, so this is a good average, not an exact law. But it's useful. So the first guess survives with probability alpha. The first two both survive with alpha times alpha. First three, alpha cubed. And the round always emits one extra token, either the fix or the bonus. So the expected number of tokens per big-model pass is one, plus alpha, plus alpha squared, and so on, up to alpha to the K.

B: Like a coin that has to keep coming up heads.

A: Yeah, a weighted coin, and you count the streak, plus one. So, say your draft is kept seventy percent of the time. Alpha is point seven. With four guesses per round, how many tokens per eight B pass, on average? And with eight guesses? And with a hundred?

B: Four guesses... one plus point seven plus point four nine plus... I'll guess around two and a half? And with a hundred I'd expect a lot. Ten, maybe?

A: [a little amused] Four guesses gives two point seven seven. Eight gives three point two. And a hundred gives... three point three three. Basically one divided by point three. It caps out fast, because the chance that a long run of guesses all survive is tiny. Drafting further ahead buys you almost nothing. With alpha at point seven, you will never average more than three and a third tokens per pass, no matter how big K gets. And that formula holds up. A twenty-thousand-round simulation at point seven came out at one point seven, two point one eight, two point seven eight and three point two two, for one, two, four and eight guesses. Against one point seven, two point one nine, two point seven seven and three point two predicted.

B: [skeptical] But that's tokens per pass. The drafting isn't free.

A: Right, and that's the gap between tokens per pass and actual speedup. So there's a third number, c. The cost of one draft step, divided by the cost of one big-model step. A round costs K draft steps plus one verify pass. So, in units of big-model passes, a round costs one plus K times c. That's assuming verifying K plus one positions costs about one pass, which is the thing your first task checks. And the speedup, from the Leviathan paper, is just tokens per round divided by cost per round. Bandwidth alone predicts c should be about two and a half gigabytes over sixteen. About point one six. In practice it's often worse, because the small model's step isn't dominated by reading weights. It's dominated by fixed costs. Launching all the little GPU kernels, the Python around them, the sampling call. And those don't shrink just because the model's smaller. So c is the number to watch.

B: And then what, I just try every K and see which is fastest?

A: You will, in the sweep. But the lesson has a calculator for this first. Three sliders: alpha, K, and c. And a curve of speedup against K, with a dot for your K and a marker for the best one. Play with it until three things feel obvious. First, alpha sets the ceiling. At alpha point five, you top out around one point six times faster, even with drafts that are almost free. At point nine, you can reach four times or more. Second, c sets the best K, and it punishes greed. At alpha point seven: if c is point oh five, the best K is six, about two point three five times faster. If c is point one, the best K is four, about two times. If c is point two five, best K is two, about one point four six. So as you drag c up, the peak of the curve slides left. Because past the best K, the extra guesses are almost never kept, but you always pay for them.

B: And I'm guessing if the draft's bad and slow, it can actually make things worse.

A: It can lose. Low alpha and high c drops you below one times. Speculation with a bad, slow draft is slower than not speculating at all.

<!-- section: The Idea: Where drafts come from -->

A: Now, here's something the proof quietly tells you. It doesn't care what the draft is. Anything that produces guesses with a known list Q can be a draft. So the options are really a trade-off between how good the guesses are, that's alpha, and how much they cost, that's c. The one you'll build is a smaller model from the same family. The Llama three point two one B drafting for the three point one eight B. Or Qwen two point five, the half-billion one drafting for the seven B. And the draft has to use the same tokenizer, so that token number twelve thirty-four means the same string to both models. Otherwise the big model is checking guesses in a different language. And if you distill a small model specifically to imitate your target, alpha goes up further. That's a later lesson, where you train your own. Then there's no model at all. N-gram lookup, or prompt lookup decoding, from Apoorv Saxena in twenty twenty-three. You take the last two or three tokens you've generated, look for them somewhere earlier in the prompt or the output, and propose whatever came after them there. It's free to compute. And its list is one-hot, all its weight on the one token it proposes, so the acceptance chance is just the big model's number for that token.

B: So that's the "one guess" mode from the toy.

A: That's exactly it. Keep with the big model's number, and on rejection, sample the big model's list with that token removed and rescaled. Exact, by the same proof. It's useless for open-ended writing, because it just doesn't find matches. But it's excellent for anything that quotes its input. Summarizing, editing code, answering questions about a document.

B: [amused] Which is like half of what we do at work. Pull stuff out of a web page and repeat it back.

A: Right, copy-heavy work is where it shines, and since c is essentially zero, on those tasks it can actually beat a model-based draft. A few more you'll run into. Medusa, from Cai and others in twenty twenty-four, bolts several small extra output heads onto the target's last hidden state. Each one predicts a token further ahead, and they're trained while the base model stays frozen. And it usually verifies a small tree of alternative continuations in one pass, instead of a single chain. Then EAGLE, Li and others, twenty twenty-four, and then EAGLE two and three. That's a tiny draft network that reads the target's hidden features, not just its output tokens. It guesses much better than a separate small model of the same cost, and it's among the highest-acceptance practical methods. V L L M and S G Lang both support it. And there's self-speculation. Use the target itself, with some layers skipped, as its own draft. Draft and Verify, Zhang and others, twenty twenty-three, and LayerSkip, Elhoushi and others, twenty twenty-four. No second model to store, and the tokenizer matches by construction. And some models now ship with this built in. DeepSeek V three was trained with a multi-token prediction module, an extra piece that predicts two or more tokens ahead, and it can be used as a draft later.

<!-- section: The Idea: The K V cache has to forget -->

A: There's one piece of bookkeeping that every implementation gets wrong at least once. During verification, the big model writes K V cache entries for every guessed token. Including the ones that end up rejected. And the draft model's cache has its own guesses in it too. So if a rejected token's keys and values stay in the cache, the next step's attention will look at a token that isn't in the text.

B: [slowly] So it's remembering a word that never actually happened.

A: [amused] It's conditioning on a ghost. So after every round, both caches get cut back to the true text. That's called rollback. And it's cheap, it's just forgetting the last few positions. The cleanest rule is: after each round, crop each cache to the length of the text minus one. And at the start of every forward pass, feed the model whatever tokens of the text its cache doesn't cover yet. The fix token, or the bonus token, never got processed by either model, it was sampled, not fed in. So it always gets fed first at the start of the next round. Go back to the cat example. After verification, the big model's cache holds "the cat sat on the mat". But "mat" was rejected, and its keys and values are already written. So you crop "mat" away. The cache now ends at "the cat sat on the". And "rug", the fix, gets fed in first next round, followed by the new guesses. Same rule for the draft's cache. And there's one subtle case. If all K guesses were kept, the draft is actually missing two tokens, the last guess, which it proposed but never processed, and the bonus. The "feed whatever you haven't seen" rule picks both up automatically. With a simple cache that's one contiguous block, cropping just means reducing a length. Hugging Face's dynamic cache has a crop method for it. In a paged cache like V L L M's, where memory is split into blocks, rollback means rewinding block slots, which is fiddlier. You'll see those later.

<!-- section: The Idea: Why it helps less with many users -->

A: Last idea before building. Speculation is a way to spend idle compute. It works because one stream of decoding leaves the tensor cores sitting there. But batching spends that same idle compute a different way. Serve many users per weight read, instead of many guesses. So on the Spark, plain decoding at batch one is deep in memory-bound territory. With four guesses, each verify pass scores five positions per user. Now say you're serving sixty-four users at once. How many positions does one verify pass process?

B: Sixty-four times five. Three hundred twenty.

A: Three hundred twenty positions per pass, so about three hundred twenty flops per byte of weights. And the ridge point was?

B: [working it out] A few hundred. Oh. So you're right at it.

A: Right around it. You've left the "extra positions are free" regime. Each verify pass now costs noticeably more than a plain step, and every rejected guess is math you paid for and threw away. At alpha point seven and four guesses, about forty-five percent of verified positions get discarded. Somewhere between a third and a half, depending on alpha and K. And at batch sixty-four, that's real compute taken away from other users. So speculation that gave you two times at batch one might give little or nothing at batch sixty-four. It can even lower total throughput. And on top of that, acceptance is ragged. In one round, user one keeps four guesses and user two keeps zero. So the batch has to deal with texts and caches growing at different rates. Which is why production engines treat speculation as a latency tool for light load. Turn it on, or use a bigger K, when only a few requests are running, and dial it down or off as the batch fills up. And that's also why your Spark is a good place to learn it. A one-user box is exactly where speculation shines.

<!-- section: Build It: Setup and the verify-cost test -->

A: Okay, building it. This all goes into the inference folder from the baseline lesson, next to your server, your benchmark harness and your scoreboard. A new spec folder with one small file per task. The pair is the eight B Instruct model from Llama three point one as the target, the one your scoreboard already tracks, and the one B Instruct from Llama three point two as the draft. They share the Llama three tokenizer, the hundred twenty-eight thousand two hundred fifty-six entries. In B F sixteen that's about sixteen gigabytes plus two and a half, which is nothing on a box with a hundred twenty-eight gigabytes. There's even room to load the eight B in full F P thirty-two, about thirty-two gigabytes, for one test later. If you'd rather use Qwen, the seven B with the half-billion draft is the equivalent pair. First task is just loading both, in the same NVIDIA PyTorch container as before. You'll need to accept the license for Llama three point two on its model page, it's gated like three point one. Then check that the two tokenizers have identical vocabularies, and write one little forward helper. You give it a model, a cache, and some new token ids, it feeds them on top of the cache and hands back the scores, in F P thirty-two, one row per token you fed. Everything else gets built on that. And then print both models' vocab sizes. For the Llama pair, they match.

B: And for Qwen they don't?

A: For Qwen they don't. Which is a nice gotcha. The tokenizer's identical, but the bigger Qwen models pad their output matrix out to a different size than the small ones. So the score vectors come out different lengths. If you use Qwen, you chop both down to the tokenizer's actual length before the softmax. Second task, and this is the "feel it first" one. Before writing any speculation, measure the claim it depends on. Build a cache for a prompt of about five hundred twelve tokens. Then, for one, two, four, all the way up to sixty-four new tokens, feed that many on top, time the forward pass, and crop the cache back afterwards. Warm up first, synchronize the GPU around the timer, take the median of ten runs. Do it for both models. And then the draft's time for one token, divided by the big model's time for one token, that's your c. So, guess. If one eight B pass over one new token takes about seventy milliseconds, how long for eight new tokens? For sixty-four? And for the one B, will its single-token pass be six point four times faster, since it's six point four times smaller?

B: Eight tokens, I'll go with what you said, roughly the same. Sixty-four, maybe a bit more. And the one B... yeah, six point four times faster? It's reading six point four times fewer bytes.

A: First two, yes. Expect eight tokens to cost within about ten to twenty percent of one token, because the weight read dominates and eight flops per byte is still way below the ridge. Sixty-four should start costing visibly more, maybe tens of percent, because the math stops being negligible. And measure it, these are expectations, not results. But the one B will almost certainly not be six point four times faster. It reads six point four times fewer bytes, sure. But its fixed costs per step, launching kernels for its sixteen layers, the Python, the sampling call, those don't shrink in proportion. A c somewhere around point two five to point four in plain eager PyTorch wouldn't be surprising. Against point one six from bandwidth alone.

B: So how do the real engines get it down?

A: They run the draft with CUDA graphs and fused kernels. CUDA graphs basically means recording the whole sequence of GPU launches for one step once, and then replaying it with a single call, so you skip all that per-kernel overhead. And fused kernels means combining several small operations into one launch. That gap between point one six and what you measure is exactly why they bother.

<!-- section: Build It: Greedy, then sampling -->

A: Third task, greedy speculative decoding, and a plain greedy loop next to it that uses the same forward helper one token at a time. The shape is the four steps from before. Keep one invariant: each cache covers all of the text except the last token, or less. Draft K tokens greedily. Feed the big model the last token of the text plus the guesses, which is exactly K plus one tokens, so every row that comes back is one you want. Walk left to right, keeping guesses while they match the big model's top choice. At the first mismatch, append the big model's top choice and stop. If they all match, append the bonus. Then crop both caches to the length of the text minus one. And the crop does nothing if the cache is already shorter. That's the all-kept case for the draft. It never processed its own last guess, so next round, "feed what you haven't seen" picks up the last guess and the bonus together. And count rounds, kept guesses and rejected guesses as you go. You'll need them for the sweep. Then the test. Twenty different prompts, a hundred twenty-eight new tokens each, and compare speculative greedy against plain greedy, token by token.

B: [skeptical] And if it's exact, it should just match, right? Why would it ever differ?

A: In B F sixteen, you might see a rare divergence. And it's not your algorithm. The verify pass multiplies a block of five tokens at once, while the plain loop multiplies one at a time, and the GPU can round those slightly differently. Usually that's invisible. But when the big model's top two scores are nearly tied, a tiny rounding difference flips which one's on top. So for any divergence, print the gap between the top two scores at that position. If it's tiny, say under point oh five, it's floating point. Then load the big model in F P thirty-two and rerun, and the divergences should vanish, or nearly. Wrong cache handling looks completely different. It diverges right after the first rejection. Every time.

B: And with sampling you can't do that check at all. The runs are supposed to differ.

A: Right, so sampling needs a different kind of test, and that's the task after next. First you have to write it. Fourth task, full speculative sampling. Copy the greedy version and change three things. One, the draft samples instead of taking its top choice, and it keeps its whole list for each step, not just the token. Two, for each guess, draw a uniform random number between zero and one, and keep the guess if that number is below the big model's number divided by the draft's number. Which is the same as keeping it with "big over small, capped at one". Three, on rejection, sample from the residual. The big model's list minus the draft's, with negatives set to zero, rescaled. And if all K are kept, sample the bonus from the last list. Do the softmax in F P thirty-two. And one numerical corner: if the two lists were identical, the residual would be all zeros. But then a rejection has probability zero too, so it can't happen. Guard it anyway. If the residual sums to zero, fall back to sampling the big model's list. And put the accept-or-fix step in its own function, so you can test it on toy numbers before it ever touches a model.

<!-- section: Build It: The distribution test -->

A: Which is the fifth task. A proof says the output is the big model's distribution. A test says your code does. And there are two levels. Level one, the rule on toy vectors. Feed your accept-or-fix function the six-word lists from before, a hundred thousand times. Count what comes out, and run the chi-square test against the big model's odds. Then do it again with the deliberately wrong version that resamples from the big model's list on rejection. When this was run in NumPy, the correct rule gave a chi-square of seven point three. With five degrees of freedom, that's a p-value of point two, meaning results at least that far off happen about one time in five just by chance. Totally consistent. The resample-from-the-big-model bug gave around five thousand. And resampling from the draft's list gave about nineteen thousand.

B: [impressed] Five thousand against a cutoff of eleven. That's not subtle.

A: And that's the point. If your buggy version doesn't fail loudly, your test has no power. It means the test can't actually catch anything, and a pass means nothing. Level two is the real models. Pick a prompt where the next token is genuinely spread out. Something like "Name a random animal." at temperature one. First, position one, against the exact answer. One big-model forward on the prompt gives you the exact list for the first new token. Then run speculative sampling five thousand times, record the first token each time, and chi-square it against five thousand times that list. Lump every token you'd expect fewer than five times into one "other" bin, because the test falls apart on tiny counts. Report the statistic, the degrees of freedom and the p-value.

B: [skeptical] Why only the first token, though? The bugs are in the later ones, aren't they?

A: Mostly, yes. The first token's just the only one where you know the exact answer, so it's the clean check. Then position three. The third token is the one that really tests your bookkeeping, the caches, the rollback, the bonus, because it often comes from later in a round. There's no single exact list for it, since it depends on what came before. So you compare against plain sampling instead. Five thousand three-token samples from the big model alone, five thousand from speculation, and a two-sample test that asks whether the two sets of counts plausibly came from the same distribution. And also report KL divergence for position one. That's a measure of how different two distributions are, zero only if they're identical, never negative. Between what you observed and the exact list. And it'll never be exactly zero, because even perfect sampling has noise. With some number of bins and some number of samples, pure noise alone makes it come out around the number of bins minus one, divided by twice the number of samples. So check you're near that floor. In a toy check with a hundred twenty-five bins and sixty thousand samples, both came out right around a thousandth. Point oh oh oh nine six measured, against a predicted floor of point oh oh one oh three.

B: [skeptical] And for the plain sampling side I'd just call generate?

A: You can, but turn every default off. Llama three point one Instruct's generation config sets its own temperature and top P. And Hugging Face adds top K of fifty by default. So you pass temperature one, top K zero, top P one, and print the generation config to be sure. Otherwise you're comparing against a different list, and the test fails for a reason that has nothing to do with your code. The whole thing takes maybe fifteen to thirty minutes to run. And after it passes, have an agent review it for statistical mistakes. Wrong bins, wrong degrees of freedom, a test that can't fail.

<!-- section: Build It: Sweep, lookup, server -->

A: Sixth task, the sweep. Twenty prompts from your short prompt set, two hundred fifty-six new tokens each, greedy, to match your benchmark. Try K of one, two, three, four, six and eight, plus plain greedy as the zero baseline. Record wall time, big-model passes, draft steps, and kept and rejected guesses. Then estimate alpha.

B: Kept guesses divided by total guesses, I'd assume.

A: That's the obvious one, and it's biased low. Because guesses after the first rejection never got judged at all. They were thrown out without being checked. So you count them as failures when they're really unknowns. Under the independent-coin model, the right estimate is kept guesses, divided by kept guesses plus the number of rounds that ended in a rejection. And as a bonus, for sampling, the expected acceptance at a position is exactly the total overlap of the two lists. Log that at the first guess of each round, it's a lower-noise estimate. Then compare tokens per round measured against the formula, get c from timing draft steps and big-model passes separately, and the speedup is just plain wall time divided by speculative wall time. Plug your alpha and c into the calculator and see if it predicts your best K. Seventh task, prompt lookup. Replace the draft model with a function that looks for the most recent earlier place where the last three tokens appeared, then two, then one, and returns up to K tokens that followed. If it finds nothing, take one plain big-model step. In greedy mode the rule's unchanged. In sampling mode, keep the guess with the big model's number for it, and on rejection, sample the big model's list with that token zeroed out. Then run it on three prompt sets. Your short chat prompts. Your long prompts, a passage plus a question about it. And a third one: give it a hundred-line Python file and ask for the same file with one function renamed. Compare tokens per round. And cross-check against Hugging Face's own built-in versions, assisted generation with a draft model, and its prompt lookup option. Your speedups should land in the same neighborhood.

B: [amused] The rename one's basically cheating. It's just copying the file back.

A: It's not cheating, that's exactly the job. Most of the output is sitting right there in the prompt, so most of the guesses get kept. And the eighth task, into the server. Copy your naive server, and replace the generate thread with a thread running your greedy speculation loop. After each round it pushes the decoded text into the same queue, and now tokens arrive in bursts of one to K plus one. Respect max tokens, stop on the end-of-turn token unless you've told it to ignore that, keep the lock, report your own completion token count, and use the best K from the sweep. Then run your benchmark harness exactly like before, concurrency one, four and sixteen, two hundred requests, two hundred fifty-six tokens each. Add the row to the scoreboard with alpha and K in the notes. And have an agent check the server for the disconnect bug from the baseline lesson, because this loop has the same problem.

<!-- section: Measure -->

A: So, what to expect. These are rough expectations to check, not results. Verify cost should be nearly flat from one to about eight new tokens, then rising. If eight tokens costs twice what one does, something other than the weight read is dominating. Look for a Python loop hiding inside your forward. Alpha, for the one B drafting for the eight B, greedy, on chat prompts, plausibly somewhere around point six to point eight. The two models were trained on similar data, and they agree on most of the easy tokens. Punctuation, the second half of a word, boilerplate phrases. It'll vary a lot by prompt. Higher on code and lists, lower on creative writing. And sampling at temperature one usually lowers it. c, somewhere between the bandwidth ratio of about point one six and something like point four in eager PyTorch. That's the number most likely to surprise you.

B: And the actual speedup?

A: With alpha around point seven and c around point three, the calculator says best K is about two or three, and about one point four times faster. Work it through: one guess gives one point three one, two guesses one point three seven, three guesses about one point three three. So two. If you get c down to around point one five, you'd see closer to one point seven five times, at K of three or four. So a naive implementation landing anywhere between one point three and two times is a reasonable result. And if you're below one, check c first.

B: [curious] So if I measure point seven and point three, what do I actually fix first?

A: Two levers. Lower c, by making the draft step cheaper. CUDA graphs, fused kernels, a smaller or layer-skipping draft. At c of point one, the same alpha gives about two times, with four guesses. Or raise alpha, by training a draft on the big model's own outputs, which is the draft-model lesson. Lowering c is usually the cheaper first move, because a one B model in eager PyTorch is nowhere near its bandwidth limit. Tokens per round, measured against the formula, should be close but not exact. Because real acceptances aren't independent coin flips. Easy stretches accept long runs, hard ones reject early. Prompt lookup should give little to nothing on open chat, it mostly finds no match. And big gains on the rename task, where most of the output literally copies the input. Lots of tokens per round, at a c of basically zero. And the scoreboard. Tokens per second at concurrency one should go up by about your speedup. Time to first token should barely change, the draft's prefill is small. But throughput at sixteen concurrent is still roughly your single-stream speed, because the lock still lets one request run at a time.

B: So each request got faster, but the server isn't any wider.

A: Right. Speculation made each request faster. It didn't make the server serve more people at once. Batching's still the next big lever.

<!-- section: Break It -->

A: Then you break it, on purpose. First, the one we keep circling. Make the accept-or-fix function resample from the big model's list on rejection, and rerun the distribution test.

B: [casual] It fails, obviously.

A: [serious] It fails, and the shape of the failure is worth knowing. The output becomes the overlap, plus thirty percent of the big model's list, since thirty percent is the rejection chance. For the six-word example, "the" drops from forty percent to thirty-two. "A" rises from twenty-five to thirty-two and a half. The rest shift around too, "cat" about fourteen and a half, "dog" eight, "sat" almost eight, "on" about five. And the text still reads fine. That's the scary part. You'd never catch it by eye. Only the test catches it. Plausible output is not the same as the correct distribution.

B: What if I skip the rollback? Just never crop.

A: In greedy mode, the identity test fails right after the first rejected guess, in every single prompt. And the output soon degrades, because the big model is attending to keys and values of tokens that aren't in the text. And notice, the first round is always fine. The bugs in speculative decoding hide in round two.

B: [thinking out loud] And the greedy-draft one. Draft with the top choice but pass in the draft's full softmax list anyway.

A: The distribution test fails. The rule's correctness depends on the draft's list being the one it actually sampled from, and a greedy draft's real list is one-hot. Fix it either way, sample from the list, or use the one-hot rule from prompt lookup, and the test passes again. And last, use a draft from another family. In greedy mode, swap in the Qwen half-billion model as the draft for Llama. You have to bypass the tokenizer check, and replace any draft token id of a hundred twenty-eight thousand two hundred fifty-six or above with a valid one, or the big model's embedding lookup crashes. Now token ids mean different strings to the two models. Acceptance collapses toward zero, every round wastes K draft steps, and the speedup drops below one. But the output is still correct. A bad draft can't break correctness. Only speed.

<!-- section: Close -->

A: If you want to go to the source, read the Leviathan paper, section three has the rule, the proof and the whole alpha, K, c analysis. And the DeepMind one by Chen and others is short, with a clean statement of the rule. And Hugging Face's "Assisted Generation" blog post walks through the same loop in practice, cache rollback included. It also stacks with other things. Quantization helps both sides, a four-bit target makes every verify pass cheaper, and a four-bit draft lowers c. And the biggest lever left after all this is alpha, which is why the next step is training your own draft, a small model distilled on your eight B's own outputs, and rerunning this exact sweep to see how far that pushes the acceptance rate.

B: [thinking out loud] Okay, let me try the whole thing. The output distribution is just the list of odds for the next token, at every step. Decoding is memory-bound, so the big model can check a handful of guesses for about the price of one token. The small model guesses, the big model checks. And when a guess is wrong, the big model just... picks the right one instead, and because it always gets the final say, the output matches what it would've written.

A: [gently] All of that's right except the last part, and the last part is the whole trick. "Wrong" doesn't really exist when you're sampling. And if the big model just picked again on a rejection, the output would be biased. What actually happens is: keep each guess with probability big over small, capped at one. On a rejection, draw only from the tokens the draft under-proposed, the leftovers. The rejections take away exactly the probability the draft piled up in the wrong places, and the leftovers put exactly that much back where it was missing. It's not that the big model gets the final say. It's that the bookkeeping balances. Every token, exactly the big model's odds. The draft only ever decides how fast.
