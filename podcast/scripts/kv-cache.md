<!-- section: The Problem -->

A: [relaxed, thinking out loud] So there's a loop almost everyone writes the day they finish their own GPT two. It's short, it's obviously correct. Run the whole sequence through the model. Look at the last position. Pick the next token. Stick it on the end. Do it again.

B: Yeah, I've written that loop.

A: Most people have. And when I ran it on my laptop, to write a thousand tokens, it took about three minutes. The first token was quick. But every step got a little slower than the last, in a straight line, until by the end each token took about twenty times as long as the first one.

B: The model didn't get bigger, though.

A: Didn't get bigger. The text didn't get harder. Each step just got slower. And then you change about twenty lines of code, and the same thousand tokens take twelve seconds. Every single token the same as before.

B: [working it out] That's the KV cache. You store the keys and values for the earlier tokens instead of working them out again every step.

A: That's it, and you had that right before we even started. So let's go one level down. Why keys and values, and not the queries? What makes it okay to reuse them at all? And what does it cost you?

<!-- section: The lazy librarian -->

A: Here's the picture. A librarian is answering a stream of questions about a growing pile of notes. Every time a new note comes in, she writes an index card for it. A short label, what this note is about. And a summary, what it says.

B: Okay.

A: To answer a question, she compares it against every label, picks out the cards that match, and blends their summaries together. Now, the slow loop is a librarian who, every time one new note arrives, throws away all her cards and rewrites every one of them from scratch. And then answers one question.

B: [laughs] And the cards come out exactly the same as last time.

A: Identical. The notes didn't change. A sensible librarian keeps the cards in a box and writes one new card per note. And in attention, the labels are the keys. The summaries are the values. And the question is the new token's query. The box of cards is the cache.

<!-- section: Why not the questions -->

B: [skeptical] Okay, but then why not keep the queries too? If I'm saving stuff, I'd just save all three.

A: Because nobody's ever going to ask an old question again. Think about what a query does. The new token's query gets compared against every key, and that decides how to blend every value. That's the new token's answer. Now, an old token's query did the same job, back when that token was new. It produced that old token's answer. And that answer is done. It's already moved on up to the next layer.

B: So the old question only ever served its own answer.

A: Only ever its own answer, which is finished. Whereas every old key and value gets read again, at every future step, by every new question. So past queries are dead the moment they're used, and past keys and values are needed forever. That's the whole reason it's called a KV cache and not a QKV cache.

B: Huh. Okay, that's cleaner than I had it.

<!-- section: Why the cards never change -->

A: Now the more interesting question. Keeping old keys and values only works if they really are the same numbers every step. Are they?

B: I'd assume so. They're about old tokens.

A: They are, in a model like GPT two. But it's worth seeing why, because the reason is the thing that makes it all legal. It's the rule that a token can only look backwards. The causal mask. Follow one token up through the model. At the bottom, it's just its own embedding and its position. Then attention mixes in information from tokens up to that one, never later. Everything else in the layer works on one token at a time. So the next layer's version of that token still only depends on itself and what came before.

B: [working it out] And that keeps going all the way up. So nothing I add later can reach back and change it.

A: Nothing. The moment a token's keys and values are worked out, in every layer, they're frozen. And that tells you when you can't do it. A model like BERT lets every word see every other word, both directions. Add a word to the end and every word's state changes. There's nothing to keep.

B: Oh, that's why encoders don't have this.

A: That's why. And there's one more quiet condition. A token's position has to depend only on its own index. Which is true for GPT two's position table and for Llama's rotation trick. And one last thing falls out. It's not one cache, it's one per layer. Layer five's keys come from layer five's input, which is layer four's output. So there's no single key for a token. There's one in every layer, in every head.

<!-- section: Fill it, then add a row -->

A: So with the cache, generation has the two phases you already know. First the model reads your whole prompt in one go. That's prefill. And as a side effect, every layer works out keys and values for every prompt token. Keep them. Then the writing part, decode. You feed in only the newest token. Each layer works out its one key and value and adds them to its pile. Its one query gets compared against the whole pile. One row out. On to the next layer.

B: That sounds simple enough that there's definitely a bug in it.

A: [laughs] There's a classic one. Your model builds positions by counting from zero up to however many tokens you gave it. In decode, you give it one token. So it counts from zero to zero. Every new token thinks it's at the very start.

B: And it doesn't crash.

A: That's the nasty part. It doesn't crash. The output stays grammatical for a few words, then it wanders off. It still looks like English, so it hides really well. It's probably the most common cache bug out there.

<!-- section: Why not five hundred times faster -->

B: Okay. So if the slow loop was redoing everything every step, by the end it's doing, what, hundreds of times more work than it needs to?

A: Hundreds of times more of the big matrix work, yes, by the end. And my laptop only got about fourteen times faster. So where did the rest go?

B: [a bit unsure] Overhead, I'd guess?

A: That's part of it. But the bigger reason is the same idea behind the seventeen tokens a second. When the model writes one token, the chip spends almost all its time waiting for the weights to arrive from memory. The math part is mostly idle. So redoing a short prefix is nearly free, because you're filling in math the chip wasn't doing anyway. You've already paid for the trip to fetch the weights.

B: So the slow loop doesn't actually get slow until the prefix is long enough to keep the chip busy.

A: That's it. And you can see it. When I ran it on the laptop's GPU, the slow loop stayed flat for the first hundred-ish tokens, and then bent upward into a straight line. On the CPU, which has much less spare math, it started climbing almost right away. And here's the funny bit. With the cache on, the GPU was no faster than the CPU.

B: Why not?

A: Because a model that small, writing one token, is mostly fixed costs. Python launching dozens of tiny jobs on the GPU every step. So the cache's win looks modest on a tiny model and short text, and becomes enormous on a big model with long text.

<!-- section: The price -->

A: Now, it isn't free. The cache trades work for memory. Every new token adds one more row, in every layer, in every head. So it grows in a straight line with the length of the conversation. And per user. The weights are a fixed cost. The cache is a cost per word, per person.

B: And it's bytes you have to read, too. Every step.

A: Right, and that's the part that took people a while to notice. In twenty nineteen, Noam Shazeer, one of the original transformer authors, wrote a short note with a playful title, "One Write-Head is All You Need." And his point was, once you cache keys and values, decoding isn't slow because of math anymore. It's slow because every step has to read the whole cache back out of memory, and the cache is big.

B: So shrink the cache.

A: So shrink the cache. And the way he did it was to let all the attention heads share one set of keys and values. Every head still asks its own question. But they all look things up in the same box. The cache shrinks by the number of heads.

B: [skeptical] That sounds like it'd hurt quality.

A: It did, a bit. One set of keys has to serve every kind of question. So a few years later people at Google proposed the middle ground. Split the heads into groups, and each group shares one set. That's grouped-query attention. In Llama three it means the cache is a quarter of what it would have been. And when you load Llama and look at the cache's shape, you can see it. Eight heads' worth of keys, not thirty-two.

<!-- section: Forgetting, and fewer bits -->

A: There are two other ways to shrink it. One is to forget the distant past. What if a layer only looks back over the most recent stretch of tokens? Then it only needs to keep that stretch. The cache stops growing. That's sliding-window attention. Mistral used it, and the cache becomes a ring, where each new token overwrites the one from a full window ago.

B: But then you lose everything older than the window.

A: Not completely, which is the clever part. Each layer's view already soaked up a window's worth from the layer below. So stack a bunch of layers, and information can travel back further, kind of like a rumour passed down a line of people. It's lossy, though. So newer models mix it. Some layers use a window, and a few keep the full history.

B: And the other way?

A: Fewer bits. Store the keys and values in eight bits instead of sixteen, and the cache halves. In memory, and in bytes read every step. Serving engines offer it as one switch. The cost is a little error in every attention score.

<!-- section: The near-tie -->

A: One last thing that'll surprise you when you build it. In full precision, the cached loop and the slow loop write exactly the same tokens. All of them. When I ran it, a thousand out of a thousand matched. But run it in bfloat sixteen, the lower-precision format, and there's a good chance that somewhere along the way, the two loops pick different tokens. And after the first disagreement, they write completely different text.

B: [skeptical] That sounds like a bug in the cache.

A: It sounds like one, and it isn't. Doing the math over one row versus over five hundred rows adds the numbers up in a different order. In full precision, the differences are tiny. In bfloat sixteen, which only keeps about three significant digits, they're bigger. And somewhere there's a near-tie between two tokens, and it just tips the other way. If you look at the gap between the top two choices at that step, it's tiny. That's rounding, not your cache.

<!-- section: Ending -->

B: Let me try. A token can only look backwards, so once you've worked out an earlier token's keys and values, they never change. So you keep them, and each new token only does its own row of work. You don't keep the queries, because old queries only fed old answers. And the cost is memory that grows with every token.

A: That's right. The thing I'd add is that it's not just memory you're holding. It's memory you have to read, every single step. So the cache turns the slow loop into a fast one, and then the cache itself becomes the next thing that's slow. Which is why so much of modern model design, sharing heads, windows, fewer bits, is really about one question. How small can I make that box of cards?
