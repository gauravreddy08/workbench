<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you built GPT two. From scratch. You wrote the line that multiplies the queries by the keys, you divided by... something, you called the function that masks out the future, and the loss went down. Great. Now somebody asks you the most obvious question there is. When the model predicts the next token, what is it actually looking at?

B: [casual] I mean, I'd pull out the attention weights. That's literally what they are, right? Where it's looking.

A: Okay, so you pull them out. Quick one. You've got the attention matrix for one head, a square grid of numbers. Which way do the queries run, down the rows or across the columns?

B: [a bit unsure] Queries are... columns? And each column adds up to one, because it's, like, the distribution for that token.

A: [amused] So that's the thing. It goes fuzzy right away, for almost everyone. It's rows, actually, and only the rows add up to one. We'll get to why. But there's a whole stack of these little questions. Why does almost every head, in every layer, seem to stare at the very first token? If some head puts point nine six of its weight on one token, does that mean the model used that token? And if you delete that head entirely, does anything even change?

B: [a little thrown] Huh. I genuinely don't know the last two.

A: Nobody does by looking. So here's what you'd actually do first. You ask the Hugging Face model to hand back its attentions, and you get twelve tensors, one per layer. Each one is, per sequence, twelve heads, and for each head a T by T grid, where T is the number of tokens. You plot one as a heatmap. And what you see is a pale triangle, the bottom-left half of the square, mostly empty-looking, with one bright stripe running straight down the left edge.

B: [doubtful] And that's... real?

A: It's real data. And on its own it's almost useless. So the whole job here is turning that picture into something that answers questions. A viewer you can actually poke at. Scores that find specific behaviours across all a hundred and forty-four heads in the model. And an experiment that tells you whether what you see actually matters.

<!-- section: Origin -->

A: [storytelling] And the habit of looking at these pictures has a pretty specific starting point. Before Transformers, neural translation worked like this: you read the whole source sentence and squeezed it into one fixed-size vector. Then a decoder had to unpack the translation out of that one vector. And long sentences just fell apart. There's only so much you can cram into one vector.

B: Like compressing a whole paragraph into one embedding and hoping.

A: Pretty much exactly that. So in twenty fourteen, Dzmitry Bahdanau, Kyunghyun Cho and Yoshua Bengio let the decoder look back at every source word, at every step, weighting them with a softmax. And almost as a side effect, the paper printed those weights as grids. English words down one side, French across the top, and bright cells wherever the model had lined a word up with its translation. So you'd see bright squares wherever an English word met its French partner. It looked like a bilingual dictionary drawn by the model itself.

B: [amused] I can see why people loved that.

A: People were enchanted. And attention weights became the default way to ask a network what it was thinking. Then in twenty seventeen, "Attention Is All You Need" made attention the whole model, with many heads per layer. And by twenty nineteen there were tools like BertViz, from Jesse Vig, that drew the lines on screen for every single head. And that same year, Sarthak Jain and Byron Wallace published a paper literally titled "Attention is not Explanation". They showed you can often shuffle or swap a model's attention weights and get the same prediction.

B: [wincing] Oh. That's kind of a gut punch.

A: And the field's been arguing about it ever since, about when the picture tells the truth. The modern answer comes out of Anthropic's circuits work, Elhage and others in twenty twenty-one, Olsson and others in twenty twenty-two. Treat attention as one readable part of a mechanism. And then test the mechanism by cutting it.

<!-- section: The Idea: a lookup with soft edges -->

A: So let's get the mechanism straight first, slowly, because the pictures only make sense if you can say every step. Think of a library where every book has a label on its spine and some content inside. You walk in with a question. You compare your question to every spine. And instead of taking one book, you take a little of each, more from the books whose labels match your question best.

B: So it's a soft lookup. A dictionary where every key partly matches.

A: That's one attention head. A head is one independent attention computation inside a layer. GPT two small has twelve heads per layer and twelve layers, so a hundred and forty-four heads, each with its own weights. And every token in the sequence plays all three roles at once. Its query is the question it brings. Its key is the label on its spine. And its value is the content it hands over if it gets picked. All three are just the token's current vector multiplied by three learned matrices.

B: Current vector meaning the embedding of the word.

A: [jumping in] No, and this is the bit that matters later. It's the token's vector at that layer, not the raw word. There's a running vector for each position that every layer reads from and then adds its own output to. That's called the residual stream. So layer five doesn't see words. It sees words plus everything layers zero through four have written on top. By layer five, the vector sitting at the position of the word "river" can already carry a note that says, "I came right after the word lamp". And its key can advertise that.

B: [working it out] So the key at a position isn't really "I am river". It's whatever's been piled onto river by then.

A: Right. Hold on to that, because it's the whole trick behind the most interesting head we'll find.

<!-- section: The Idea: the shapes -->

A: Now the shapes, once, slowly. GPT two small, one layer, one sequence of T tokens. The model's width is seven hundred sixty-eight. That's how many numbers are in each token's vector. There are twelve heads.

B: [curious] So each head gets its own seven sixty-eight?

A: That's the natural guess, and no. The heads are carved out of the width, not added on top of it. Seven sixty-eight divided by twelve is sixty-four. So each head's query, key and value vectors are sixty-four numbers long. People call that the head dimension, d head.

B: Okay. Sixty-four each.

A: So follow one layer like a pipe. In comes the residual stream, T by seven sixty-eight. It goes through a LayerNorm, which just rescales each vector to a standard size. Then it's multiplied by the three matrices, giving queries, keys and values, each split into twelve heads of T by sixty-four. For one head, you dot every query with every key. That gives you a T by T grid of scores. You divide them all by the square root of sixty-four, which is eight. You blank out everything where a token would be looking at the future. You softmax along each row. And that T by T grid of weights, that's the thing you plot. Then you multiply the weights by the values, which gives T by sixty-four again, one output per token for this head. Glue the twelve heads' outputs side by side, back to seven sixty-eight, multiply by one more matrix, the output matrix, W O. And add the result back into the residual stream.

B: And there are twelve of those grids per layer, twelve layers.

A: Twelve and twelve. And now the two habits that'll save you hours. First habit: rows are queries, columns are keys. So the cell in row i, column j, is "how much does token i read from token j". Picture the grid with token zero in the top-left. Row zero is the first token, and it can only see itself, so it has exactly one non-zero cell. Row ten can see tokens zero through ten, so it has eleven. Everything to the right of the diagonal is masked off. So the whole thing's a triangle, filled in on the bottom-left, empty on the top-right.

B: That's the pale triangle.

A: That's the pale triangle. Second habit: rows add up to one, columns don't. A row is a probability distribution over the past. And I mean that precisely: every number is zero or bigger, and they add up to exactly one. It's how token i splits one unit of attention across everything before it. A column is a different thing entirely. It's "how popular is this token as a source". And it can add up to anything from zero to T.

B: [skeptical] So when I said the columns sum to one—

A: [warmly] That's the transpose. You had the whole picture flipped. And it's an easy flip to make, which is why I'm hammering it.

<!-- section: The Idea: one row, five steps -->

A: Let's do one row by hand. Take the sentence "end-of-text, The cat sat on the". So six tokens, starting with GPT two's special end-of-text token at position zero. Our query is "sat", position three. And I'll use toy numbers, they're not from a real model, but the arithmetic is exactly what the model does. Picture six horizontal bars, one per key, end-of-text at the top, then The, cat, sat, on, the.

A: Step one is dot products. For every key, you take sat's query and dot it with that key. One number each. Here they come out as twenty-six for end-of-text, six for The, thirty for cat, fourteen for sat itself, thirty-eight for "on", and nine for the last "the".

B: Wait, "on" is the biggest. But "on" comes after "sat". Why is there a score for it at all?

A: Because in training you compute the whole T by T grid in one matrix multiply, for every query against every key, including the future ones. It's cheaper to compute them all and throw some away. Which is step three. But first, step two, scale. Divide every score by the square root of the head dimension. Root sixty-four is eight. So twenty-six becomes about three and a quarter, thirty becomes three point seven five, and so on.

B: Why eight specifically, though? Why not just leave them?

A: So, think about what a dot product of two sixty-four-number vectors is. It's a sum of sixty-four products. If each of those entries is roughly random with a typical size of one, then the sum of sixty-four of them has a spread of about the square root of sixty-four, so a typical size around eight. Not sixty-four, because they partly cancel. Dividing by eight brings the scores back to "about one", whatever head dimension you chose. If you'd picked a head size of two fifty-six, you'd divide by sixteen.

A: [inviting] Okay, guess this one. Say you forget that division. Every score is eight times bigger. Softmax still ranks the same key first, so nothing changes about who wins. What changes about the weights? And why would that hurt training?

B: [working it out] Bigger gaps between the scores... so softmax gets more extreme? The winner takes more. But I don't see why it hurts training if it still picks the right one.

A: So you've got the first half. Softmax of numbers eight times bigger is like softmax at a temperature of one-eighth. Way sharper. In the toy, cat's weight goes from about point five six to about point nine eight. And in a real model at the start of training, nearly every row would be almost one-hot. All its weight on whichever key happened to score highest by chance. Now the training part. When a softmax is that lopsided, its gradient with respect to all the other keys is almost exactly zero. That's called a saturated softmax. So the head gets almost no signal about any key it isn't already staring at. It can't learn to look somewhere better, because nudging the other scores barely changes anything.

B: [getting it] So it's not that it picks wrong. It's that it gets stuck with whatever it picked first.

A: That's it. And the original Transformer paper gives exactly this reasoning for the scaling. Now step three, the mask. A language model predicting token i plus one must not see token i plus one, or anything after it. Otherwise it's just reading the answer. So every score where the key comes after the query gets set to minus infinity. That's the causal mask: each position may only attend to itself and earlier positions. In the toy, "on" and the last "the" get crossed out. In code it's a call named masked fill. And Hugging Face's GPT two actually uses the most negative number a float can hold, instead of a literal minus infinity, which gives the same zeros after softmax.

A: Step four, softmax. Raise e to each score and divide by the total. Every weight comes out positive, the row adds up to one, and e to the minus infinity is zero, so masked keys get exactly nothing. In the toy, cat ends up with about point five six, end-of-text gets about a third, and sat and The split the little that's left. And notice what softmax forces here. The row has to add up to one even if nothing in the past is useful.

B: Even if the head has no reason to look anywhere.

A: Even then. Hold that thought, because it explains the brightest stripe in every attention plot you'll ever see. Step five, mix. The head's output for "sat" is the weighted sum of the value vectors. If cat got point five six, then fifty-six percent of the output is cat's value vector. In the toy it's mostly cat's value plus a good chunk of end-of-text's. Then the twelve heads' outputs, sixty-four numbers each, get glued side by side, twelve times sixty-four, back to seven sixty-eight, go through the output matrix, and get added to the residual stream.

B: And that's it? That's the whole head?

A: That's everything a single head does. Now multiply. Twelve heads per layer, twelve layers, each one a full T by T grid. For a fifteen-token sentence that's a hundred and forty-four little triangles. You need a way to look at them.

<!-- section: The Idea: what real heads do -->

A: So, real heads. I ran GPT two small through Hugging Face transformers on my Mac with a deliberately weird input. The end-of-text token, then seven arbitrary words: lamp, river, seven, quiet, orange, window, pencil. And then the same seven words again. Fifteen tokens. I took the attention weights, rounded to two decimals, nothing else. And I built a little viewer for four of the heads. Keys in a column down the left, queries in a column down the right, and a line from each query to each key, as dark as the weight. Hover a query and you see only what it reads. Hover a key and you see who reads it. And there's a toggle to flip to the plain heatmap.

B: Why the doubled list?

A: [teasing] You'll see in a minute. It's the whole point. Each of these four heads has a personality you can name. First, layer four, head eleven. I'll call heads by layer and number, so this is four eleven. Hover any query and there's one dark line going to the token just above it. River reads lamp. Seven reads river. Quiet reads seven. On the heatmap it's a single bright stripe running one step below the diagonal. That's a previous-token head. Over a longer random sequence it puts point nine nine of its weight on the previous token.

B: [unimpressed] What's the point of that, though? Every token just... looks at its neighbour.

A: Bookkeeping. It copies "the token before me was X" into each position's residual stream. So later layers can ask about it. It doesn't do anything clever by itself. It moves information one step to the right so something else can use it.

A: Second, layer zero, head one. In the first half of the sequence, every token reads itself. On the heatmap that's just the main diagonal lit up. In the second half, something extra shows up. The second "river" splits about fifty-fifty between itself and the first "river". So you get the diagonal, plus a second, fainter parallel stripe exactly seven positions to the left, but only in the bottom half of the grid. It's matching on token identity. "Where else have I appeared?"

B: Okay, that one makes sense at layer zero. It only knows what word it is.

A: Exactly why it can do that and not much else. Third, layer five, head seven. About point nine of every row lands on position zero, whatever the query is. Lines view, it's a fan, every query on the right with a fat line to end-of-text at the top left. Heatmap, it's that bright stripe down the left edge, and nothing else. On this input this head has, well, nothing to do. And softmax insists on spending the full one point zero somewhere.

B: The forced budget thing.

A: The forced budget thing. And fourth, the one to really stare at. Layer five, head five. Five five. In the first half, every query parks on position zero, exactly like the sink head. Fat left-edge stripe, top half of the grid. Then in the second half, something new happens. The second "lamp", that's position eight, reads "river", position two, with a weight of point nine six.

B: Wait. River? Not the first lamp?

A: [slowly, letting it land] Not lamp. The token after the earlier lamp. And the second river reads seven. The second seven reads quiet. Every repeated token reads the token that followed its previous occurrence. On the heatmap, the bottom half has a clean diagonal stripe, but it's sitting six positions left of the main diagonal instead of seven. Shifted one step to the right of where an exact copy would be.

A: So here's the question. At the second "lamp", five five looks at "river", the word that came after the first lamp. The model's job at this position is to predict the next token. Why is river exactly the thing it should be looking at? And why can't a layer-zero head do this?

B: [working it out] Because... if lamp was followed by river last time, then river's the best bet for what comes next this time? It's predicting by copying.

A: Yep. Sequences repeat. The head finds the earlier occurrence and copies whatever came next. That is, literally, the next-token prediction. And the layer-zero part?

B: Layer zero head did the same-token thing fine. So why can't it look one further?

A: Because think about what the key at river has to say. For five five's query at the second lamp to land on river, river's key has to advertise "the token before me was lamp". And in layer zero, position two's vector only knows "I'm river, I'm at position two". It's got no idea what came before it. Somebody has to first write "my previous token is lamp" into position two's residual stream. And that's exactly what a previous-token head does, in an earlier layer. So five five needs four eleven, or some other earlier previous-token head, to have run first.

<!-- section: The Idea: induction heads, a two-head circuit -->

A: That two-step trick has a name. An induction head is a head that, sitting at some token A, attends to the token that came right after an earlier A, and copies it. So it implements the rule "A, B, then later A, so predict B". And it never works alone. It's the second half of a circuit. A circuit just means a small set of components, heads, neurons, that together implement one behaviour you can name, found by tracing how each one's output feeds the next.

A: So draw it in your head left to right. Four boxes. Lamp at position one, river at position two, a gap, then lamp again at position eight. Step one, earlier layer: the previous-token head draws a little arrow from river back to lamp, and river's key now carries a tag, "after lamp". Step two, later layer: the second lamp sends its query, which amounts to "who came after lamp?", in a long arc back across the gap. It hits river's tag. River's value gets copied forward, out past the second lamp, and the model predicts river.

B: So the first head changes what river's key looks like, and the second head's query is built to match that.

A: That's called K-composition. One head's output, written into the residual stream, changes the keys a later head sees. It's one of three ways heads can compose, from Elhage and others' "Mathematical Framework for Transformer Circuits". The other two are changing a later head's queries, Q-composition, or its values, V-composition. And here's the catch for anyone who just looks at plots. You can't see composition in any single attention plot. You see two separate patterns. A stripe just under the diagonal in layer four. And an off-by-one stripe in the second half in layer five. And you have to know to connect them.

B: [skeptical] And this is a real thing models do, not just a party trick on repeated word lists?

A: Olsson and others, twenty twenty-two, argue induction heads are a big part of how models do in-context learning. Meaning: getting better at predicting later tokens in a prompt by using earlier tokens in the same prompt, with no weight updates at all. Induction heads form pretty abruptly early in training. They call it a phase change, and you can see it as a bump in the loss curve. And at that same moment, the model gets much better at using long contexts. They also do more than literal copying. Some induction-like heads match on meaning, fuzzy copies, even translated ones, not just exact tokens.

<!-- section: The Idea: why random tokens -->

A: So now, how do you find these heads with a number instead of by squinting? You want a test where only induction can help.

B: I'd just use a real paragraph, repeated. That's what actual prompts look like.

A: That's the trap. Natural text's a bad test. Say a head copies "York" after "New". It might be using induction. Or it might just know English. You can't tell. So instead: pick fifty random token ids, then repeat them. The first half is pure noise. Nothing can predict it, no matter how smart you are. The second half is perfectly predictable, but only if the model looks back.

A: So guess. GPT two small reads end-of-text, plus fifty random tokens, plus the same fifty again. What's its average loss on the first half, and on the second? And loss here is cross-entropy in nats, which is basically: how surprised was the model by the right answer, on a log scale. For reference, if you guessed uniformly over the whole vocabulary, fifty thousand two hundred fifty-seven tokens, you'd score the natural log of that, about ten point eight.

B: First half... it can't do better than uniform, so call it ten point eight. Second half, way lower. Two? One?

A: [enjoying this] First half came out around twelve when I ran it. Worse than uniform guessing.

B: How do you do worse than random guessing?

A: [amused] By being confident. The model's busy predicting plausible English, putting lots of probability on likely words. And random tokens aren't English. So the right answer usually gets less than one in fifty thousand. Then the second half came out around point two nats. That means it's putting roughly point eight probability on the correct token, on average. So a hundred-and-twenty-four-million-parameter model that cannot predict a single random token goes to near-perfect recall the moment the sequence repeats. That jump is the induction circuit at work.

B: Okay, that's a much cleaner signal than I expected.

A: And it gives you a score. Say the repeat length is fifty. In the second half, the query at some position holds the same token as the position fifty back. And the token after that earlier copy is forty-nine back. So the previous-token score of a head is its average weight from each position to the one right before it. And the induction score is its average weight from each second-half position to the one forty-nine back. A head that attended evenly to everything would score about one over the position, so around one or two hundredths here. Real previous-token and induction heads score above point eight. Compute it for all a hundred and forty-four heads and the right ones stand out like lit windows in a dark building.

<!-- section: The Idea: the sink -->

A: Now back to that stripe down the left edge. Over a hundred-and-one-token random sequence, the average head put point four two of its attention on position zero. Almost half. Some heads put over point nine there.

B: [confident] So position zero must be doing something important. Like a summary token.

A: Mostly, no. Remember the forced budget. A head that has nothing useful to read still has to spend a full one point zero. And the cheapest way to do "nothing" is to put the weight on a token whose value vector is small, or harmless, and do it consistently. Position zero is the one token every query can see. Every row has a cell for it. So models learn to use it as a parking spot. Xiao and others, in twenty twenty-three, named this an attention sink: a token, usually the first, that soaks up a big share of attention from lots of heads regardless of content.

B: How'd they find it?

A: The hard way. You know the KV cache, where during generation you keep every past token's keys and values around so each new token's query can read them without recomputing. If the context gets long, one obvious trick is a sliding window: keep the last few thousand tokens, throw out the oldest. And when they did that and evicted the very first token's keys and values, quality collapsed. Even though that token is meaningless. Keeping just the first four tokens' keys and values fixed it. That's StreamingLLM.

B: [amused] So the parking spot is load-bearing. You take it away and the heads have nowhere to park.

A: Right, and that's important as a parking spot, not as content. And the sink teaches the first caveat. I measured how long the value vectors are, their length, which people call the value norm. A token can get a big weight and still contribute little if its value vector is short. For the sink head, five seven, on the fifteen-token sequence: point nine two of its weight on position zero. But the value vector at position zero has a length of about point nine five, while the typical value elsewhere is about four point eight. So about five times shorter. And if you multiply each weight by the length of the value it's pulling in, position zero's share drops from ninety-two percent to about seventy.

B: Still most of it, though.

A: Still most, and five seven's a pretty extreme sink. But look at five five, the induction head, on the same input. About half its weight sits on position zero, because the whole first half parks there. Weighted by value length, position zero's share drops to about twenty-eight percent. And the previous-token head barely touches position zero at all, about one percent. Now, weight times length is a rough proxy, it comes from Kobayashi and others in twenty twenty. The true contribution also goes through the output matrix, and it depends on the direction of the vector, not just its length. But the point stands. The heatmap lied by omission. It shows weights, and weights are only half of the product.

<!-- section: The Idea: what a bright line does and does not tell you -->

A: So let's just collect the caveats, because the viewer you build will make every one of them very easy to forget. One. Weights aren't contributions. The output is weight times value, summed. A huge weight on a tiny value adds little. And even the value's not the end. It's multiplied by the output matrix, and then added to a residual stream that already holds a lot. A head's whole output can be small next to the stream it joins.

A: Two. Weights aren't the cause. That's Jain and Wallace. For lots of text classifiers you could find very different attention distributions that gave the same prediction, and attention often disagreed with gradient-based importance, which is asking "if I nudge this input, how much does the output move?"

B: You said the field's been arguing. Who's on the other side?

A: Wiegreffe and Pinter, same year, with a paper called "Attention is not not Explanation".

B: [laughs] Of course it is.

A: Their point was that swapping weights after training isn't a fair test, and attention can be informative if you test it properly. And both sides agree on the practical bit. A weight is a hypothesis to test. Not a finding. Three. Tokens aren't words at deeper layers. At layer eight, position five's vector carries stuff mixed in from positions zero through four. So "head eight four looks at orange" really means "looks at whatever is sitting in position five's residual stream by now". There's a technique called attention rollout, from Abnar and Zuidema in twenty twenty, that tries to account for that by chaining the attention grids across layers. It's a rough approximation.

A: Four. One head isn't one behaviour. A head can be a previous-token head on one input and a sink on another. Five five is an induction head when there's a repeat. Otherwise it parks on the sink, like you saw in the first half. And five, heads back each other up. Which you can only see one way.

B: Turn them off.

A: [nodding] Turn them off. That's an ablation. You delete or neutralise a component during the forward pass and measure how much worse the model gets. Zero-ablation sets the head's output to zero. Mean-ablation replaces it with its average output over lots of inputs, which is less likely to knock the model into a state it never saw in training. Neither one's perfect. But either one is a causal test. And an attention plot isn't.

A: So, guess. The five strongest induction heads in GPT two small, by induction score, are five five, six nine, five one, seven ten and seven two. Second-half loss with nothing removed is about point two one. What happens to it if you zero out just five five? All five? Or five random other heads?

B: Five five's the textbook one, so... kill it and the second half goes back toward random? Like, loss jumps to eight or something. All five, definitely broken. Random heads, probably nothing.

A: Here's what I got, eight sequences. Just five five: point two six. It barely moves.

B: [surprised] Point two six? From point two one?

A: Five five plus six nine: point three three. All five: four point five two. That's over twenty times worse. But notice it's still far below the twelve of the first half, so there's more induction machinery in there than these five. And five random non-induction heads, across three different random picks, gave anywhere from point one nine to point six six.

B: [slowly] So the textbook head, by itself, looks like it doesn't matter.

A: The behaviour is spread across several heads that cover for each other. Any one of them looks unimportant by ablation, even though its attention pattern is a perfect induction head. And that's the mirror image of the not-explanation problem. A picture can look important and not be, that's the sinks. And a head can be important and not look it on its own, that's redundancy. Wang and others found the same thing in twenty twenty-two, in a circuit in GPT two that figures out which name in a sentence is the indirect object. They called these backup heads.

<!-- section: Build It: setup and the eager trap -->

A: So here's what you'd build. Three files in one folder. An export script, a scoring and ablation script, and a small web page. Use Hugging Face's GPT two, so you can trust the weights. And if your own from-scratch GPT two loads the same weights, recomputing one head by hand doubles as a test of your implementation.

A: Setup's just a virtual environment with torch and transformers. You load GPT two small and run a sentence through with attentions turned on. You check you get twelve tensors, each one by twelve by T by T. Every row sums to one. And nothing above the diagonal. And there's one argument when you load the model that matters a lot. You have to ask for the eager attention implementation.

B: Eager as opposed to what?

A: As opposed to the default, which on recent versions is a fused kernel. PyTorch's scaled dot-product attention, the same idea as FlashAttention. It computes attention in tiles and never builds the T by T grid at all. That's why it's fast. So it has nothing to give back. On the version I used, five point something, asking for attentions without eager silently returned an empty tuple. No warning. Older four point x versions fall back with a warning. Check yours.

A: And one more gotcha. GPT two's tokenizer doesn't put the end-of-text token at the start for you. Add it yourself, on purpose, so position zero is the same token in every experiment. You'll see why that matters when we break things.

<!-- section: Build It: recompute one head by hand -->

A: Then, before you trust any picture, prove you know exactly what it is. Take layer five's input, compute head five five's attention yourself, and compare against what the library gave you.

B: Sounds straightforward. Multiply, split, softmax.

A: [wry] It is, apart from the bits that bite. First, the model can also hand back its hidden states, and the one indexed five is the residual stream entering layer five. Index zero is the embeddings, so everything's shifted by one from what you'd guess. And attention reads it after that layer's first LayerNorm, not before. Second, and this is the classic one. GPT two's combined query-key-value projection isn't a normal linear layer. It's an old OpenAI class called Conv one D, and its weight is stored the other way round. Input by output, so seven sixty-eight by twenty-three oh four. So you multiply the hidden state by the weight directly. Not by its transpose, like you would with a normal PyTorch linear layer.

B: And if you get it backwards, you'd get a shape error.

A: Here, yes, loudly, because seven sixty-eight by twenty-three oh four isn't square. But the output projection is seven sixty-eight by seven sixty-eight. Square. Transpose that one by mistake and it runs fine, and gives you quietly wrong numbers.

B: [sighs] That's the worst kind.

A: It's the classic bug when people load OpenAI's GPT two weights into their own from-scratch model. And the last detail: the twenty-three oh four splits into query, then key, then value, seven sixty-eight each, and each seven sixty-eight is twelve heads of sixty-four, head by head. When it works, your max difference from the library should be around one in a million. I got about one and a half millionths, which is just float thirty-two rounding. And you should be able to say, without looking, which axis is the query, what hidden state five is, and why the mask goes above the diagonal.

<!-- section: Build It: export and the size math -->

A: Next, export the attention to JSON for the browser. The tokens, the number of layers and heads, and then for each layer, each head, each row, the weights. And because of the mask, row i only needs its first i plus one entries, the rest are zero by construction. Round to three decimals. And keep the raw tokens with their leading spaces. GPT two tokens usually start with a space, and the viewer can show it as a little dot.

B: How big does that file get?

A: Good, because that's the thing to work out before you run it. Each head stores T times T plus one, over two numbers. That's the triangle. A hundred and forty-four heads. And each number's about five or six characters of JSON. So at fifteen tokens, one head is a hundred and twenty numbers, times a hundred forty-four is about seventeen thousand numbers. Call it a hundred kilobytes. At sixty-four tokens, a head is about two thousand numbers, the whole model's about three hundred thousand, and that's about one and a half megabytes.

B: [working it out] And it's T squared, so at a thousand and twenty-four tokens... that's sixteen times longer than sixty-four, so two hundred fifty-six times the numbers. Seventy-something million numbers?

A: [matter-of-fact] About seventy-five million. So somewhere around four hundred megabytes of JSON, for a thousand tokens, for a model this small. That's the T squared biting.

<!-- section: Build It: the viewer -->

A: Then the viewer. One HTML file, one JavaScript file, no libraries. You serve the folder with Python's built-in little web server, because a page opened straight off disk isn't allowed to fetch a local file. Two drop-downs, one for layer, one for head. Then the lines view. Keys in a column on the left, queries on the right, a line from query i to key j whose opacity is the weight. And skip lines under about point oh two, or the whole picture turns to fog.

B: Fog meaning, what, a hundred faint lines everywhere?

A: Yeah. A fifteen-token triangle is a hundred and twenty lines, and most are nearly zero. You want the four or five that matter to be the only things you see. Then hover. Hover query i and you see only row i, what i reads. Hover key j, and you see only column j, who reads j. And print the top weights as text, because your eye's bad at telling point six from point seven in line darkness. Then a heatmap toggle, a T by T grid of little squares, filled by weight. And draw the masked cells differently from the zero-weight cells.

B: [puzzled] Why? They're both zero.

A: In numbers they look the same. They mean different things. A masked cell is "not allowed to look". A zero cell is "allowed, and chose not to". Then the bit that actually makes this useful: an all-heads overview. A twelve by twelve grid of tiny heatmaps, one per head, click one to select it. That's where the patterns jump out. You glance at it and you see thin diagonal stripes in some, fat left-edge stripes in a lot of them, and one or two with that shifted stripe in the bottom half.

A: Couple of small things. The SVG attributes for line opacity and width are spelled with hyphens, stroke dash opacity and stroke dash width, and getting that wrong just silently does nothing. Make it work at phone width: two columns fit in about three hundred sixty pixels for around twenty tokens, and for longer sequences you scroll down, not sideways. And when it works, have an agent review it for the classic bugs. Transposed axes: does hovering query eight actually show row eight? Off-by-one token labels. And the overview redrawing a hundred forty-four times T squared elements on every single hover.

<!-- section: Build It: scoring all 144 heads -->

A: Then the scoring script. Seed the random generator to zero. Make four sequences of fifty random token ids, drawn from between a thousand and ten thousand, to skip the rarest, weirdest ids. Put the end-of-text token in front, then the fifty, then the same fifty again. So each sequence is a hundred and one tokens. Run them all, and stack the attentions into one big tensor: layers, batch, heads, query, key.

A: Then three scores per head. Previous-token score: the average weight from each position to the one right before it, starting at position two, over the whole batch. Sink score: the average weight on position zero, from every position after it. And the induction score, where you have to be careful with the end-of-text token. Draw it on paper. Position zero is end-of-text. The first copy sits at one through fifty. The second copy sits at fifty-one through a hundred. So the query at fifty-one is the first repeated token, its earlier copy is at one, and the token after that is at two. Forty-nine back. So the induction score is the average weight from each of positions fifty-one through a hundred to the position forty-nine back.

B: And you'd do that with a loop over positions?

A: No, use fancy indexing. Build one tensor of query positions, one of key positions, and pull all the cells out in one shot for all a hundred forty-four heads. Also compute the loss on each half from the logits. Print the top six heads for each score, and export the three twelve-by-twelve score grids so the overview can colour each head by its score. You're done when a previous-token head scores above point nine, at least four heads have induction scores above point eight, you can find those heads in your viewer and they look like what I described, second-half loss is under point five, and first-half loss is above ten.

<!-- section: Build It: ablation and the Spark -->

A: Then switch heads off. The cleanest place is right before the output projection, the one that's W O. Its input is the twelve heads' outputs, side by side, sixty-four columns each. Zero out head h's sixty-four columns and that head is gone. In PyTorch you do that with a forward pre-hook, a little function that runs just before a module and can rewrite its input. Register one on each layer's output projection, and keep a table of which heads to kill in which layer.

A: Then measure second-half loss, eight sequences, for: nothing ablated. The top induction head alone. The top two. The top five. The top previous-token head. And three different sets of five random heads, excluding the induction and previous-token ones. Then a mean-ablation version: instead of zero, replace the head's sixty-four columns with their average over lots of positions of natural text, and rerun the top-five case. And then one composition check. Ablate the top previous-token heads, and recompute five five's induction score.

B: Because if K-composition is real, five five loses the "after lamp" tag on the keys.

A: Right, its score should drop. And then, on the Spark, rerun the scoring on something bigger. GPT two medium, which has twenty-four layers and sixteen heads, or a small modern model with RoPE, like a half-billion-parameter Qwen. Still eager attention, and remember the memory for attentions grows as layers times heads times T squared. Do induction heads still show up? In which layers, as a fraction of the depth? And does the sink still sit on position zero if the model has no start-of-sequence token? And have an agent check your indexing when the head count changes, because sixteen heads of sixty-four is where hard-coded twelves go to die.

<!-- section: Measure -->

A: So, my numbers. GPT two small on an Apple silicon Mac CPU, seed zero, ids from a thousand to just under ten thousand, fifty-token repeats. Yours'll differ a little with seed and batch size. The head identities and the shape of the results shouldn't. Top previous-token head: four eleven, at point nine nine. And then there's a big drop. The next ones are three seven at point five two, six eight at point five, two two at point four nine.

B: So one really clean one and a few half-hearted ones.

A: Yeah, keep that in mind. Top induction heads: five five at point nine four, six nine at point nine three, five one and seven ten both at point nine two, and seven two at point eight six. Top sinks: five seven at point nine one, eight four at point nine, seven nine at point eight six. Average weight on position zero across all a hundred forty-four heads, point four two. And loss on the first half was twelve point two, second half point two.

A: What to notice. First, only a handful of heads per pattern score high. The scores split into two clumps. Most heads near zero, a few near one, almost nothing in between. That's why scores beat eyeballing a hundred and forty-four plots. Second, the induction heads sit in the middle layers, five to seven, after the previous-token head in layer four. And that order's forced by the circuit. The key-side information has to exist before something can match on it.

B: And the ablation was the one-head-does-nothing thing.

A: Third thing to notice, yeah. Ablation is far from linear. One head adds about point oh five to the loss. Five heads add about four point three. The heads back each other up until too many are gone, and then it falls off a cliff. Fourth, the top previous-token head isn't alone either. Kill four eleven by itself and the second-half loss barely moves, point two one to point two three. And five five's induction score only dips, from point nine four to point eight two.

B: [skeptical] But you said five five needs four eleven. If you kill four eleven it should break.

A: It needs a previous-token head. Not that specific one. Remember those half-hearted ones at around point five? Kill the top four previous-token heads together and five five's score falls to point six three. Weaker previous-token heads in layers two through six carry the same information. So the dependency's real, it's just spread out. Fifth, and this one's subtle. Zero-ablation's a blunt instrument. With the top five induction heads zeroed, the first-half loss also went up. From twelve to fourteen point seven.

B: Wait, but the first half is random. No induction head can help there. Why would it get worse?

A: [pleased] That's exactly the right objection. It shouldn't, if you'd removed only induction. What actually happened is that zeroing pushed the residual stream somewhere it never goes in training, and the model got worse at everything. Which is why you run the mean-ablation version and compare. The gap between the two tells you how off-distribution zero-ablation is.

<!-- section: Break It -->

A: Now some ways to break it on purpose. What if you just use the default attention implementation and ask for attentions anyway?

B: I'd get them. Slower, maybe.

A: On my version, you get an empty tuple back, no error, and then three lines later indexing into it throws an index error. Fused kernels never build the matrix you want to plot. That's the whole reason they're fast. And the takeaway's bigger than the bug. The attention matrix is a debugging artifact. Production inference never holds it in memory.

A: What if you forget the start token? Run the same fifteen tokens, but without end-of-text at position zero. Now lamp is position zero. And lamp becomes the sink. When I tried it, head five seven put point nine three on lamp.

B: [amused] So now the heatmap says the model is obsessed with lamps.

A: A naive reading says the model finds lamp fascinating. Same model, same words, completely different story, purely from where the parking spot ended up. What if you score induction on natural text, a repeated English paragraph?

B: That's what I wanted to do earlier. The first half's not random anymore, so...

A: So the first-half loss drops to a normal English-text level. I got about two point nine nats on a thirty-token sentence, because the model can predict English without looking back at all. And now a low second-half loss mixes two things together, recall and plain language knowledge. A head that attends to the "next" token might just be following grammar. The clean separation between "needs induction" and "doesn't need induction" is gone. Random tokens are the control that makes the measurement mean anything.

A: Last one. Transpose the grid in your viewer, swap rows and columns when you draw. Now the previous-token head appears to look forward one step, the stripe's above the diagonal. And the sink shows up as position zero reading everything.

B: Which can't happen. Position zero can only see itself.

A: [firm] Impossible under the causal mask. So that's your free correctness check. If any plot shows a token attending to the future, your axes are flipped. The upper triangle must be empty.

<!-- section: Scaling the viewer -->

B: [thinking out loud] Okay, but say I wanted this for a real model. Something on the Spark, thirty-two layers, thirty-two heads, four thousand tokens of context. Does this just... work?

A: Let's do the math. Storage grows as layers times heads times T squared over two. GPT two small at sixty-four tokens, we said, about three hundred thousand numbers, one and a half megabytes. Now thirty-two times thirty-two is about a thousand heads. Four thousand ninety-six squared over two is about eight point four million per head. Multiply, and it's about eight point six billion numbers. In float thirty-two, four bytes each, that's roughly thirty-four gigabytes. More as JSON.

B: [laughs] For one prompt. Okay, so no.

A: And even computing it is a problem, because you have to run eager attention, which builds every one of those grids in memory. The fused kernels exist precisely to avoid that. So you'd change the design. Compute on demand on a server, just for the layer and head someone selects, not everything up front. Send only the top few weights per row, because most rows are dominated by a handful of keys anyway. Quantise them down to eight bits. Render with a canvas instead of SVG once T's in the hundreds, because eight million SVG elements will just kill the browser. And for the overview, don't draw a thousand thumbnails. Precompute a few summary numbers per head, the previous-token score, induction score, sink score, and how spread out its attention is, its entropy, and colour the grid by those.

<!-- section: Connections -->

A: And this all ties back to serving. The KV cache is the same queries, keys and values seen from the other side. The keys and values you cache are exactly what each new query reads. And the sink is why sliding-window caches keep the first few tokens. FlashAttention is why you needed the slow path, because its whole trick is never writing down the grid you just plotted. If you read one thing next, it's Anthropic's "Mathematical Framework for Transformer Circuits", and when you want to check your own tools, TransformerLens for hooking heads and BertViz for viewing them. And the natural next step is activation patching. Instead of zeroing a head, copy its output from a run on a different input and see what the model predicts now. That turns "this head matters" into "this head carries this specific piece of information".

<!-- section: Close -->

B: [working it out] Okay, let me try the whole thing. Each head's a soft lookup. Every token's query gets compared against the earlier tokens' keys, scaled down by eight, the future's masked, softmax makes each row add up to one, and the output's the weighted mix of values. Rows are queries. And the attention picture tells you where the model is looking, like the induction head looking at river, which is the thing it predicts. Plus the first token's a sink, so you ignore that stripe.

A: [gently] Mostly. Two things I'd sharpen. The picture tells you where a head read from. Not how much that changed anything. That needs the value it pulled in, the output matrix, and the stream it's added to. And the only way to know if it mattered is to cut it out and measure. And even then, one cut can lie, because five five gone barely moved the loss, while five heads gone made it twenty times worse. And don't ignore the sink stripe. Read it as "this head has nothing to do here". A bright line is a clue about where to cut. It's not the answer.
