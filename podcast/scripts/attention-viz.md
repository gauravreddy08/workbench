<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you've built GPT two. You wrote the attention yourself, the queries, the keys, the mask, the loss went down, it works. And then somebody asks you the most obvious question in the world. When it predicts the next word, what's it actually looking at?

B: I mean, that one feels answerable. You've got the weights. Just print them.

A: That's what everybody does. You ask the model to hand back its attention, you pick a layer and a head, and you draw it as a grid. And what you get is this pale triangle, with one really bright stripe running down the left edge.

B: The triangle's the mask, right? No looking at the future.

A: The triangle's the mask. Every word can only see itself and the words before it, so the top half is empty. But the stripe is the weird part. Almost every head, in almost every layer, seems to be staring at the very first token. And the first token in my runs was just the start-of-text marker. It's not even a word.

B: [skeptical] Okay, but if the model keeps looking at it, it must matter. Maybe it's using it as some kind of summary of the whole thing.

A: That's the natural read. And it's wrong, and the way it's wrong is basically the whole story here. That picture is real data. It's also, on its own, almost useless.

<!-- section: The pictures that enchanted everyone -->

A: [warm] So this goes back to twenty fourteen, before Transformers. Translation models back then would read a whole French sentence and squeeze it into one fixed vector, one bundle of numbers, and then try to unpack that into English. And long sentences just fell apart. Too much to cram into one bundle.

B: Sure.

A: So Dzmitry Bahdanau, with Kyunghyun Cho and Yoshua Bengio, said, what if the part writing the English could look back at every French word, at every step, and decide how much to weigh each one? And as a side effect, they printed those weights as grids. English words down one side, French across the top, bright squares where the model lined them up.

B: Like a little dictionary.

A: Pretty much. It looked like a bilingual dictionary the model had drawn for itself. People loved it. And from then on, attention weights became the default way to ask a network what it was thinking. A few years later Transformers made attention the whole model, many heads per layer, and tools came out that drew the lines for every head.

B: So what went wrong?

A: In twenty nineteen, Sarthak Jain and Byron Wallace published a paper called "Attention is not Explanation". And what they showed was, you could often take a model's attention weights, swap them for really different ones, and get the same prediction. Same answer, different picture.

B: [laughs] That's a bit of a problem if the picture is supposed to be the explanation.

A: It's a big problem. And people have argued about it ever since. There was a reply literally called "Attention is not not Explanation". But both sides agree on the practical bit. A weight is a hypothesis. It's something to test, not a finding.

<!-- section: What a head actually does -->

B: Before we go further, give me the picture of one head again. I know the formula, but I want the feel.

A: Think of a library. Every book has a label on its spine and some content inside. You walk in with a question. You compare your question against every spine, and instead of taking one book, you take a little bit of every book, more from the ones whose labels match your question best.

B: So the question is the query, the label's the key, and the contents are the value.

A: That's it. Every word plays all three roles at once. It brings a question, it has a label, and it has something to hand over if it gets picked. And one set of those, doing its own matching, is one attention head. GPT two small has twelve layers with twelve heads each, so a hundred and forty-four of them.

B: And the grid I'm plotting is how much each word took from each earlier book.

A: Right. One row per word asking, one column per word being read. And here's the detail that explains the stripe. Every row has to add up to one. The softmax at the end forces it. Each word gets a budget of exactly one, and it has to spend all of it.

B: Even if there's nothing useful to read.

A: Even if there's nothing useful to read. Hold that thought.

<!-- section: The parking spot -->

A: So when a head has nothing to do on a given input, where does it put its budget? It needs somewhere cheap. Somewhere harmless. And the first token is the one place every single word can see, because it's before everything. So models learn to dump attention there. A parking spot.

B: Huh. So the stripe isn't the model finding the first token interesting. It's the model saying "nothing for me here".

A: That's the right way to say it. There's even a name for it, an attention sink. And when I measured it, the sink token's value, the content it actually hands over, was tiny, about a fifth the size of the other words'. So one of these sink heads puts about nine tenths of its attention there, and gets very little out of it.

B: [working it out] So the weight is only half the story. What actually gets mixed in is the weight times what's in the book.

A: Weight times the content, yeah. And the grid only shows you the weight. It lies by leaving things out.

B: Okay, but then you could just ignore the first token. Throw it away.

A: Funny you say that, because that's how the name came about. There was a group trying to run models on really long streams of text. You keep a sliding window of recent words in the KV cache, the stored keys and values for everything the model's seen, and you throw out the oldest ones as you go. And the moment the first token fell out of the window, quality collapsed. Even though that token meant nothing.

B: Because the parking spot was gone.

A: Because the parking spot was gone. Every head that had been dumping attention there suddenly had to put it somewhere else, on real words. And they found keeping just the first few tokens around fixed it. So it's not important as content, but it really is important as a place to park.

<!-- section: Heads with personalities -->

A: So once you get past the sink, if you poke around, heads start to have personalities you can name. My favourite simple one is the previous-token head. Every word sends almost all its attention exactly one step back. "River" reads "lamp", "seven" reads "river".

B: What's that for? It's just copying the neighbour.

A: Bookkeeping. Each word carries a running vector through the model, and every layer reads from it and adds to it. That's called the residual stream. The previous-token head writes "the word before me was lamp" into the next word's running vector. So later layers can ask about it.

B: Okay.

A: And then there's the one to stare at. The induction head. I fed GPT two a start marker, then a bunch of random words, and then the same random words again. In the first half, this head just parks on the sink, nothing to do. In the second half, when it gets to "lamp" the second time, it doesn't look at the earlier "lamp". It looks at the word right after the earlier "lamp". It looks at "river".

B: [slowly] Oh. Because that's the next word. Last time "lamp" was followed by "river", so it's probably "river" again.

A: That's literally next-word prediction. Find where this happened before and copy whatever came next.

B: And why random words? Why not just use a normal sentence?

A: Because in a normal sentence you can't tell what's going on. If the model predicts "York" after "New", it might be looking back, or it might just know English. Random words make it clean. The first half is pure noise, nothing can predict it. And when I ran it, GPT two did worse than random guessing on that half, because it kept confidently expecting normal English. Then the second half, it gets almost every word right. Same model, same words. The only thing that changed is that looking back now helps.

B: So that test pretty much isolates induction.

A: It does. And it gives you a number. For every head, you just ask, on that second half, how much weight goes to the word after the earlier copy? Do that for all hundred and forty-four and it's not subtle. Most heads score near zero, and a handful light up near one. That's so much better than squinting at a hundred and forty-four little triangles.

<!-- section: Two heads, one trick -->

B: [jumping in] Wait, how does the induction head know which word came after the earlier "lamp"? When it looks at "river", "river" is just "river".

A: Right, and that's the nice part. On its own it couldn't. Down in the first layer, "river" only knows it's "river". Somebody has to write "the word before me was lamp" into river's running vector first. And that's the previous-token head's job.

B: So the previous-token head runs first, and then the induction head searches for "the word whose predecessor was lamp".

A: That's the whole trick. Two heads in different layers working together. And you'd only ever see that as two separate pictures, a stripe one step off the diagonal in one layer, a different stripe in a later layer. No single plot shows they're connected. People call a small group of parts like that, working together to do one thing, a circuit.

B: And that's why the induction heads come after it in the stack.

A: Has to be. When I scored them, the strongest previous-token head was in an earlier layer, and the induction heads were in the middle layers right after it. The order is forced. The information has to exist before anything can match on it.

<!-- section: Switch it off -->

A: So now you've got your best induction head. The picture is textbook. The score is near perfect. Question is, does the model actually use it?

B: [confident] I'd say yes. Delete it and the second half should fall apart.

A: That's what I expected too. So I tried it. Switching a head off and measuring what breaks has a name, ablation. You zero out that head's output during the run, and check how much worse the predictions get.

B: And?

A: Barely moved. Took out the best one, the second half got a tiny bit worse. Took out the top two, a bit more. Then I took out the top five together, and it fell off a cliff. More than twenty times worse.

B: Huh. So they're covering for each other.

A: They back each other up. And that's the mirror image of the sink. The sink looks important in the picture and mostly isn't. A single induction head is important, and switching it off alone makes it look like it isn't. The picture and the switch disagree in both directions.

B: Did killing five random heads do anything?

A: A bit, but nothing like the induction ones. Which is the control you need. And I'll admit, zeroing things out is a blunt tool. When I zeroed those five, the first half got worse too, the noisy half that no induction head could ever help with. Setting a head to zero pushes the model somewhere it never goes in training, and it gets a bit worse at everything. So there's a gentler version where you replace the head with its usual average output instead. But either way, it's a real cause-and-effect test. A plot never is.

B: And the composition thing, can you test that the same way?

A: Same way. Switch off the previous-token heads, and the induction head's score drops. Kill just the strongest one and it only dents it, because weaker previous-token heads carry the same information. It took switching off a few of them to really pull it down. Backups again.

<!-- section: The picture nobody builds -->

A: One last thing surprised me. When I first asked the model for its attention weights, I got back nothing. An empty result, no error.

B: Why?

A: Because the default fast attention never builds that grid at all. The whole trick of the fast kernels is to compute the answer without ever writing out the full table of who reads whom. So to get the picture, you have to ask for the slow, old-fashioned version. Which tells you something. That grid is a debugging artifact. Real inference never holds it in memory.

B: So we're looking at something the model never even looks at itself.

A: In a sense, yeah. It's how we see it, not how it runs.

<!-- section: Ending -->

B: Okay, let me try. The attention grid tells you where each head read from. But every row has to spend its whole budget, so heads with nothing to do park on the first token, and that bright stripe mostly means "nothing here". To find what a head really does, you design a test where only that behaviour can help, like random words repeated, and you score every head with a number. And the picture shows you the model is using the head.

A: Almost all of that. The last bit is the part I'd flip. The picture never shows you the model is using it. It gives you a suspect. You find out by switching the head off and watching what breaks. And even then, one head might look unimportant only because its backups step in, so you switch off a few together before you decide.
