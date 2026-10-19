<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture this. You've got your DGX Spark on the desk. You load up Llama, the eight billion one, you type a prompt, and you watch the answer come out. And it comes out at about seventeen words a second. Well, tokens, but close enough. It's typing. Like, you can watch it type.

B: I mean, that sounds about right for a chatbot.

A: It does sound right. That's the trap. Because here's the thing. The GPU in that box can do an absurd amount of math. If you just take how much math one token needs and how much math the chip can do in a second, it should be making thousands of tokens a second. Thousands. And it makes seventeen.

B: [a bit unsure] Okay, so... something's expensive that we're not counting. Attention, probably? Every new word has to look back at every word before it. That's got to be where it goes.

A: That's the guess almost everybody makes. And it's wrong in a really interesting way. Attention isn't the problem. The math isn't the problem at all. If you could watch the part of the GPU that does the multiplying, you'd see it sitting there doing nothing, almost all of the time. It's not working hard. It's waiting.

B: Waiting for what?

A: For the model to show up.

<!-- section: One trip through the whole model -->

A: So think about what the model actually is, physically. It's billions of numbers. The weights. And they live in the Spark's main memory, because there's nowhere else big enough to hold them. The GPU's own little on-chip storage is tiny by comparison. It can hold a sliver of the model at a time, nowhere near the whole thing.

B: Sure.

A: Now, to make one new token, the model has to run the latest word through every layer. And every layer is basically a big grid of weights that you multiply against that word. Here's the part that matters. Every weight gets used once. One multiply, one add, done. Then it's thrown away, because there's no room to keep it. And then the next token comes along, and the whole model has to be pulled in from memory again. All of it. Every single token.

B: [working it out] So the GPU does this tiny bit of work on each weight, and then it has to wait for the next batch of weights to arrive.

A: Right. Each weight crosses the wire from memory to the chip, gets one quick multiply, and gets dropped. So the question "how fast does it generate" turns into a much plainer question: how fast can you drag the whole model across that wire? That's it. That's the speed limit. How big the model is, against how fast memory can hand it over. One division, and you can predict the speed of a model before you've even downloaded it.

B: Huh. So the seventeen isn't really about the GPU at all.

A: It's about the wire. The Spark's memory is big, but it's not especially fast. And when I worked it out, the model's size divided by that memory speed lands right around seventeen. Then I ran it, and it came in a bit under that, which is what you'd expect. Real hardware never quite hits the spec sheet.

B: [skeptical] Wait, but if the chip is idle that much of the time, why would anyone build it that way? That sounds like a design mistake.

A: It's not a mistake so much as a wall everyone hit a long time ago.

<!-- section: The memory wall -->

A: [warm] So, nineteen ninety-five. Two computer scientists, William Wulf and Sally McKee, write this tiny paper. Two pages. And the title is almost a joke. "Hitting the Memory Wall: Implications of the Obvious."

B: [laughs] Implications of the obvious.

A: Yeah, and it really was obvious once they said it. Processors were getting faster really quickly, every year. Memory was getting faster too, but much more slowly. And they just said, well, follow those two lines out. One day the processor is going to spend almost all its time waiting for memory. And on that day, making the processor faster won't help at all.

B: And the fix for that was caches, right? Keep a small fast copy of stuff close to the chip.

A: That was the fix, and it worked for most programs. Because most programs use the same data again and again. You pay to fetch something once, then you reuse it from the fast copy a thousand times. But a language model writing text is the one case where caches just can't save you. The data is the entire model. It's way too big to fit in any cache. And you use each piece of it once per token, then you need the whole thing again.

B: So it's the worst possible workload for a cache.

A: Pretty much the worst. So thirty years after that little paper, the memory wall is literally why your chatbot types at the speed it does. And it's why the companies that serve these models spend so much money on GPUs with very fast, very expensive memory.

<!-- section: Work per byte -->

A: There's a nice way to think about all this that'll come up again and again. For any piece of work, ask: every time I fetch something from memory, how much useful math do I get to do with it?

B: Like, how much I get out of each trip to the warehouse.

A: Exactly that. And it has a name. It's called arithmetic intensity. Fancy name, simple idea: work per byte. If you do a lot of math with each thing you fetch, the chip stays busy and you're limited by how fast it can compute. People call that compute-bound. If you do very little with each thing you fetch, the chip sits around and you're limited by memory. That's memory-bound, or bandwidth-bound. Bandwidth just means how much memory can move per second, how wide the pipe is.

B: And writing text one token at a time is about as low as it gets.

A: About as low as it gets. One tiny bit of math per weight. And the chip could do hundreds of times more than that with every byte if you let it. So it's not a little bit memory-bound. It's hopelessly memory-bound.

<!-- section: Reading the prompt is the opposite -->

B: [jumping in] Okay, but then something doesn't add up for me. When I send a long prompt, the first word comes back pretty quickly. If every token means hauling the whole model across, a long prompt should take forever before it says anything.

A: Good, yeah, and this is the other half of the picture. Reading your prompt is a completely different kind of work from writing the answer. When the prompt comes in, the model already knows every word of it. So it doesn't have to go one at a time. It takes all the prompt's words together, and runs them through the model in one pass.

B: Oh. So each weight it fetches gets used for every word in the prompt at once.

A: Right. You haul the weight across once, and you use it for every word in the prompt. A long prompt means tons of math per trip. So reading the prompt is the opposite situation. The chip is actually busy, and that part is limited by compute, not memory. That phase is called prefill.

B: And then writing the answer is the slow, one-at-a-time part.

A: And it has to be one at a time, because each new word depends on the one before it. You can't work out the fifth word until you've picked the fourth. So you're back to: one word, one full trip through the model. That phase is called decode.

B: So that's why chatbots feel the way they feel. A short pause, and then the steady typing.

A: That's exactly why. And it gives you the two numbers everybody measures. How long until the first word shows up, which people call time to first token. That's mostly the prompt reading, so it's about compute. And then how fast the words come after that, tokens per second, which is about memory. Two numbers, two completely different bottlenecks. If there's one picture to keep, it's that one. The same model, the same amount of text, and one direction is quick and the other is slow, because one gets to reuse what it fetched and the other doesn't.

<!-- section: The conversation's memory is bytes too -->

B: You said earlier attention wasn't the problem. But surely the longer the conversation gets, the more there is to look back at.

A: Yeah, and that's fair, that's where attention does come back in. Just not as math. You know the KV cache, the stored notes for every earlier word, so the model doesn't have to recompute the past every time. Well, those notes also live in memory. And every new token has to read all of them. So on top of hauling the model across, you're also hauling the whole conversation's notes across.

B: And that grows as you talk.

A: It grows with every word. For a normal chat it's small next to the model, you barely notice it. But in a really, really long conversation, those notes can get as big as the model itself. And then your speed drops by about half, because you're moving twice as much stuff per word.

B: [working it out] Which is the same rule again. More bytes per token, slower.

A: Same rule. And there's a twist that matters a lot later. When lots of people use the same server, they all share the same model. But each person's notes are their own. So the shared part gets cheaper per person, and the private part doesn't. Hold onto that, because it's where a lot of the real engineering in serving goes.

<!-- section: Every way around the wall -->

A: [relaxed] So here's the fun part. Once you see the speed limit as "how much do I drag across the wire for each word", basically every trick in inference turns out to be the same move. Get more words out of each trip.

B: Okay, so what are the moves?

A: First one, the obvious one. Make the weights smaller. Each weight is normally stored as a sixteen-bit number. If you store it in eight bits, the model is half the size, so there's half as much to haul, and it runs about twice as fast. Go down to around four bits and it's roughly a quarter of the original size. That's called quantization. And the catch is accuracy. Rounding every number that hard costs you something, and finding out how much is a whole topic of its own.

B: That one makes sense. Smaller freight, faster delivery.

A: Second one's sneakier. What if each word only needed part of the model? There's a kind of model called mixture of experts. Instead of one big block in each layer, it has lots of smaller blocks, the "experts", and a little router that sends each word to just a few of them. So the model can be huge on disk, but for any one word you only read a small slice of it.

B: [skeptical] But you still have to keep the whole thing in memory, right? Because the next word might want different experts.

A: Yes, all of it has to be sitting there, ready. And that's where your Spark is actually unusual. Its memory is slow, but there's a lot of it. A normal gaming card can't even hold one of these big sparse models. The Spark holds it with room to spare, and then only reads a slice per word. So those models are kind of the Spark's sweet spot. Big, but cheap to run per word.

B: Huh. I wouldn't have guessed that.

A: Third one is the one the whole industry runs on. Batching. If ten people are using the server, you don't haul the model across ten separate times. You haul it once, and use each weight for all ten people's next word in the same pass.

B: Oh, because the chip was sitting idle anyway.

A: Because the chip was idle anyway. Remember it could do hundreds of times more math per trip. So adding more people barely slows each step down. You get many words out of one trip, almost for free. That's why serving a model to lots of people is so much cheaper per word than serving one person. And the limit is those private notes we talked about. Every extra person brings their own notes to haul, and eventually that eats the gains.

B: Okay. What's the fourth?

A: The fourth is a clever one. What if one person could get several words out of one trip? The problem is you don't know the next words yet. So you use a tiny, fast model to guess the next few. Then the big model checks all the guesses together, in one pass, the same way it reads a prompt. When the guesses are right, you got several words for the price of one trip. That's speculative decoding.

B: [working it out] And checking several words costs about the same as making one, because of the idle chip again.

A: Same reason, every time. The chip has spare capacity, so you find a way to fill it. And then the last move is just brute force. Buy faster memory. The big data-center GPUs have memory stacked right next to the chip with a huge number of connections, and it's many times faster than the Spark's. Same model, same everything, and it simply types much faster. Which is a big part of why a provider like Fireworks feels so much quicker than your Spark, before they even use any of the other tricks.

B: So the Spark is the opposite trade. Lots of memory, not very fast.

A: Lots of memory, not very fast. Which is a perfectly good trade, as long as you know which one you made.

<!-- section: Ending -->

B: Okay, let me try and say it back. The GPU isn't slow. Making each word means reading the entire model out of memory, and you only do a tiny bit of math with each piece before you need the next. So the speed is basically the model's size against how fast memory can move it. And all the tricks are ways to either shrink what you move, or get more words out of each move.

A: That's it. The one thing I'd sharpen is that it's not only the model you're moving. It's the model plus everyone's conversation notes. So the question to ask about any setup is, for each word that comes out, how many bytes had to cross the wire? Answer that and you know the speed before you run anything. And when someone tells you a new trick makes generation faster, you can almost always find which bytes it stopped moving.
