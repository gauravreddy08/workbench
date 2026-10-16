<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, remember where your K sweep ended up. The speculative decoding one. Llama three point two, the one B, drafting for the eight B, greedy decoding. And the numbers came out somewhere like... the draft gets kept about seventy percent of the time. Each draft step costs about a third of a big-model step. Best K was two or three guesses per round. And the whole thing ran about one point four times faster than plain decoding. Which is a real gain. But the calculator also told you which levers are left, and there are only two. You can make the draft step cheaper, so CUDA graphs, fused kernels, that kind of engineering. Or you can make the draft get kept more often. A better draft.

B: And a better draft means... a better model. A smarter one B.

A: [mildly amused] That's what everyone assumes. So try this first. Print the rejections. Pick twenty rounds where the very first guess got thrown out, and just look at what the one B proposed next to what the eight B wanted. You'll see stuff like this. The eight B starts its answers with "Here's a", and the one B guesses "Sure". The eight B likes to put a little markdown header before a list, and the one B just goes straight to "one, dot". And in code, the eight B writes area as math dot pi times r squared, and the one B writes three point one four times r times r.

B: [amused] Okay, the three point one four one is a bit worse.

A: [laughs] A bit. But it runs. That's the thing. None of those guesses are wrong. They're fine English, they're working Python. They're just not what this eight B would say. The one B is a perfectly decent writer with its own habits, and you've asked it to impersonate a different writer whose habits it's never studied.

B: Huh. So it's not getting things wrong, it's getting them... differently.

A: Yeah. And that reframes the whole job. You don't need a smarter draft. You need a better impersonator. And here's the nice part: you own the thing it should impersonate. The eight B is sitting right there on your Spark, happy to show its work on as much text as you like. And not just the token it picked. Its whole probability list, at every step. Training a small model to copy a big model's probabilities has a name, and it's older than language models.

<!-- section: The Problem: Predict, brilliant or copycat -->

A: But before the name, a question. Two candidate drafts for your eight B. Draft A is a one B model that actually scores higher than your eight B on some reasoning benchmark. Suppose somebody trained a brilliant little model. Draft B is a one B that's worse on every benchmark you can find, but it was trained to do one thing: copy your eight B's output probabilities. Which one gets kept more often?

B: [a bit unsure] I mean, my gut says A. If it's smarter, it'll guess the right word more often. And the right word is what the big model wants... right?

A: [gently] That's the natural answer, and it's almost certainly backwards. It's draft B. Acceptance doesn't reward being right. It rewards agreeing with the target. A draft that answers better than the target is going to propose tokens the target wouldn't, and every single one of those gets rejected.

B: Okay, but if it's better, isn't that a good thing? Like, you'd want the better word in your output.

A: [jumping in] You never get it, though. That's the part that makes it click. Remember the accept-or-reject rule from speculative decoding, the one that keeps the output exact. Whatever the draft proposes, the text that comes out follows the eight B's odds exactly. Every token. So the draft's quality as a writer is completely invisible in the output. The only thing about the draft that shows up anywhere is how similar it is to the target. And it shows up only as speed. So yeah, a brilliant one B can be a bad draft. Being good is the wrong goal. Being alike is the goal.

<!-- section: Origin -->

A: And people figured out how to teach "be alike" a long time before anybody was speculating with language models. Two thousand six. Cristian Buciluă, Rich Caruana and Alexandru Niculescu-Mizil had a very practical problem. Their best classifiers were huge ensembles, hundreds of models voting together. Great accuracy, and way too slow to actually deploy. So their fix, in a paper just called "Model Compression", was: take a big pile of unlabeled data, run the ensemble over it, and use the ensemble's outputs as the labels. Then train one small neural network to reproduce them. And the small one got most of the ensemble's accuracy at a fraction of the cost.

B: So the big model writes the answer key, and the small one studies it.

A: Right. Then in twenty fifteen, Geoffrey Hinton, Oriol Vinyals and Jeff Dean gave the idea its modern form, and its name. The paper's "Distilling the Knowledge in a Neural Network". And their key observation was that the teacher's wrong answers carry information. Say an image classifier looks at a photo and says: dog, ninety percent. Wolf, nine percent. Car, one in ten thousand. That's telling you something real. This dog looks a bit like a wolf, and nothing at all like a car.

B: [amused] Which the label "dog" just... throws away.

A: Throws away completely. A plain label says dog, full stop. Hinton called the information hiding in those small probabilities "dark knowledge". And they added a temperature knob to make it more visible, which we'll come back to, because for us it's a bit of a trap. Then speculative decoding came along in twenty twenty-two, and it created a setting where this matters more than anywhere else. Because the draft's only job, its entire job, is to match the teacher's distribution. In twenty twenty-three, Yongchao Zhou and colleagues at Google published DistillSpec, which distills drafts specifically for speculative decoding, and they report ten to forty-five percent more speedup than an undistilled draft. And in twenty twenty-four, Medusa, from Tianle Cai and others, and EAGLE, from Yuhui Li and others, went a step further. They trained small drafting modules that read the target's own internal state. You'll build versions of the first idea, and get a taste of the second.

<!-- section: The Idea: What a good draft is, exactly -->

A: Okay. So let's make "be alike" precise, because it turns out to be one clean formula. Quick recap of the two lists. At every step, the eight B hands you a probability for every token in its vocabulary, about a hundred twenty-eight thousand of them. That list is its output distribution, and we call it p. The draft has its own list for the same step, same text before it, and we call that q. And the rule: the draft proposes a token from its list, and it's kept with probability big over small, the eight B's number divided by the draft's number, capped at one.

B: Right. And then on a rejection you draw from the leftovers.

A: From the leftovers, yeah. That part we don't need today. Today we only care how often a guess gets kept. So take one token. Say the draft gives it forty percent and the eight B gives it twenty-five. The draft proposes it forty percent of the time, and keeps it twenty-five out of forty of those times. So it ends up proposed-and-kept twenty-five percent of the time. Just the smaller of the two numbers. And if it's the other way round, the eight B likes it more than the draft does, it's always kept, so you get the draft's number. Again the smaller one. So the chance a guess survives, added up over everything the draft might propose, is just: for each token, take the smaller of the two numbers, and add them all up.

B: The overlap. The shaded part from the bar charts.

A: The overlap. If you lay the two bar charts on top of each other, it's the area they share. And there's a standard name for how far apart two distributions are in exactly this sense. It's called total variation distance, T V for short. For each token you take the gap between the two numbers, ignoring which one's bigger, add up all the gaps, and halve it. Zero means the two lists are identical. One means they don't overlap at all. And another way to say what it means: it's the biggest possible difference in probability the two lists could give to any one event.

B: [working it out] So small example. Two tokens. The eight B says Paris eighty, Lyon twenty. The draft says Paris sixty, Lyon forty.

A: Go on.

B: Gaps are twenty and twenty. Forty total, halved, so T V is point two. And the overlap is sixty for Paris, twenty for Lyon... eighty.

A: And point eight is one minus point two. That's not a coincidence. There's a little identity behind it. For any two numbers, the gap between them is their sum minus twice the smaller one. Eighty and sixty: sum's a hundred forty, minus twice sixty, a hundred twenty, gap of twenty. Now add that up over the whole vocabulary. Both lists sum to one, so the sums give you two, minus twice the overlap. Halve it, and T V is one minus the overlap. Which means the acceptance rate, alpha, is exactly one minus the total variation distance. Leviathan's paper says this too. And if you check it numerically, on random fifty-token lists, the two sides agree to sixteen digits. Which is as close as floating point goes.

B: [slowly] Okay. So that's kind of a strange thing to stare at. There's nothing about the draft being good in there at all.

A: Nothing. So read it as a design spec. The acceptance rate at one step is a pure function of how far apart the two probability lists are, in that one specific sense. Not how good the draft is at anything. Average it over the steps your server actually sees, and that's the alpha that goes into the speedup formula. So to raise alpha, you make q close to p, on the text your server writes. That's the whole job.

B: And that's why some spots get rejected and others don't, I guess. Like the "Here's a" thing.

A: Yeah, it explains which tokens are easy and which are hard. After "The capital of France is", both models put eighty-plus percent on Paris. Huge overlap, nearly always kept. After "Here is a poem about", both of them are spread out over hundreds of tokens. And two spread-out lists with slightly different preferences don't overlap much. The draft's not wrong there. It just has different taste.

<!-- section: The Idea: The overlap, as you'd see it -->

A: Picture one real step. The code from before: the text so far is "def area of r, return", and the next token could be one of eight things. Math. r. Three. Pi. An open bracket. None. Zero. Self. The eight B's list puts forty-six percent on math, fourteen on r, ten on three, and then a few percent each on the rest. And an off-the-shelf small model, its list is lumpier in the wrong places. It gives math only twenty percent. And it gives None twenty percent and self sixteen percent, where the eight B gives them six and four.

B: [skeptical] Self? In a function called area?

A: [amused] It's a small model. It's seen a lot of methods. So draw the eight bars for each model, one over the other. The shared part, the overlap, is solid. Where the draft's bar sticks up above the eight B's, it's over-proposing. Where the eight B's bar sticks up above the draft's, the draft is under-proposing. Add up the solid parts and you get alpha of point six three. And the thing to notice is that over-proposing None and self costs exactly as much as under-proposing math. Both are just probability sitting in the wrong place. T V doesn't care which direction.

B: And distilling does what to the picture?

A: There's a slider for it. It moves the draft's raw scores step by step toward the eight B's. Drag it halfway, and the over-proposed bars shrink, math's bar grows to fill its gap, and alpha climbs to point eight two. There's also a K L readout, which we'll define properly in a minute, and it drops from about point three two to point oh eight. And the speedup, at three guesses and a draft cost of point three, goes from about one point two times to about one point six. Same model size. Same draft cost. One change. It imitates better.

B: So going from sixty-three to eighty-two percent is worth that much.

A: And it gets better if you keep going, because now long runs of guesses survive. So push K up, and the best K grows. Then drag the draft cost up and watch a slow draft eat the whole gain. And if you drag distill all the way to the end, the draft's list equals the eight B's, every guess is kept, and the only limit left is the draft cost. No real draft gets there. A smaller model can't match a bigger one everywhere.

<!-- section: The Idea: Learning from the teacher's whole answer -->

A: So how do you actually move q toward p? The obvious way first. Have the eight B write a lot of text, and fine-tune the one B on it, with the ordinary language-modelling loss. That works. It even has a name, sequence-level distillation, from Yoon Kim and Alexander Rush in twenty sixteen. Train the student on whole outputs the teacher generated, with the normal next-token loss. The teacher's text just replaces human text. And the one B picks up the eight B's habits, the "Here's a", the markdown header, because the training text is full of them.

B: That seems fine, though. What's wrong with it?

A: [thinking out loud] Nothing's wrong. It's just wasteful, and here's why. Look at what one training example actually tells the student. The ordinary loss is cross-entropy. Minus the log of the probability the model gave to the token that actually came next. It's low when the model put a lot of probability on that token. And the label it's scored against is what's called one-hot: a list that's one for the token that came next and zero for every other token. It only says what came next. Nothing about the alternatives. So in that area example, the eight B happened to sample "math". The label says: math, one. Everything else, zero. But the eight B knew way more than that. It had the whole list. Math forty-six percent, r fourteen, three ten, and so on. And sampling one token from that list threw nearly all of it away.

B: So same as Hinton's dog. The label says "dog" and loses the wolf.

A: Same thing. And knowledge distillation is just: keep it. Instead of the one-hot label, the target at each position is the teacher's whole list. Those are called soft labels, soft because the probability's spread over many entries instead of piled on one. And the loss measures how far the student's list is from the teacher's. The natural choice for that is K L divergence. It's a measure of how different one distribution is from another. It's zero only if they're identical, it's never negative, and it's measured in nats, which is just what you get when you use the natural log. Bits, but with base e. And one quirk that'll matter later: it's not symmetric. The K L from p to q and from q to p are different numbers.

B: [a bit unsure] Okay, so this is a different training setup, then. New loss, new... whatever goes with it.

A: [jumping in] That's the thing, it barely is. If you split the K L from the teacher to the student into two pieces, the first piece is cross-entropy. The same cross-entropy you already know. Except the label is the teacher's whole list instead of a one-hot. And the second piece is the teacher's own entropy, how spread out the teacher is, which the student can't change at all. It's a constant. So "distillation loss" is literally just the loss you already know, with a soft label. And the gradient on the student's raw scores comes out to the student's probabilities minus the teacher's. Ordinary training gives you the student's probabilities minus the one-hot. Same shape. One line of code changes.

B: Huh. Okay. So the only real change is how much each example says.

A: That's it. A one-hot label is one sample from p. One roll of the teacher's dice. The student has to see the same kind of context lots of times before the counts reveal what the dice actually look like. A soft label just hands it the dice.

<!-- section: The Idea: Predict, soft vs hard labels -->

A: So, how big is that difference? A toy. Three hundred different contexts, a vocabulary of a thousand, and in each context the teacher has a spread-out list. And the student is the simplest possible thing, a lookup table. It can represent any list at all, one per context. It gets n examples per context. With one-hot labels, the best it can do is learn the counts from n samples. With soft labels, it sees p itself. What acceptance rate does each one reach with one example per context? And with sixty-four?

B: [working it out] With soft labels, one example is the whole list, so... it's just done? Alpha of one?

A: Yep.

B: And one-hot with one example is basically guessing. Maybe point one? And with sixty-four... sixty-four samples out of a thousand tokens is not a lot. Point five?

A: Not bad. Somebody ran exactly this in NumPy. One-hot, one example per context: point one two. At sixteen, point three nine. At sixty-four, point six four. And even at two hundred fifty-six examples per context, only point eight one. Meanwhile soft labels matched p exactly after one example. Alpha of one.

B: [surprised] Two hundred fifty-six and still not there.

A: Still not there. Now, to be fair, real networks aren't lookup tables. They share what they learn across similar contexts, and that shrinks the gap a lot. But the direction holds. And it's why you'll see the K L run beat the plain text run, on the same amount of eight B text, when you measure. Each soft label is worth a lot of hard ones.

<!-- section: The Idea: Temperature, and the T squared factor -->

A: Now Hinton's temperature knob. A trained model's list is often really peaky. Like, ninety-seven percent on one token and tiny crumbs spread over the rest. And those crumbs are where the dark knowledge lives, but they barely move the loss, so the student barely learns them. Their fix was to divide both models' raw scores by a number T, bigger than one, before the softmax. Two, or four. That flattens both lists out, and suddenly the small entries are big enough for the loss to notice. One side effect: dividing the scores by T shrinks the gradients by about one over T squared. So they multiply the loss by T squared, to put the scale back.

B: That sounds like strictly more signal. Why's it a trap?

A: Because Hinton wanted something different from what you want. He wanted the student to learn the teacher's knowledge, and then he graded it on its top answer. Did it pick dog. You want the student to match the teacher's distribution at the temperature you actually serve, because that's the list alpha is computed on. A student trained to match flattened lists has been optimizing for something slightly different. So start at T of one, which is just the real list. And if you try two, measure alpha at your serving temperature, not at two. One of the break-it experiments does exactly this, and it doesn't go well.

<!-- section: The Idea: Which way round the K L goes -->

A: Then there's that quirk. K L isn't symmetric. And the two directions push the student in really different ways when it's too small to copy the teacher perfectly. Which, for a one B imitating an eight B, it always is. So first, forward K L, from the teacher to the student. Each token's mismatch gets weighted by the teacher's probability. So it's huge anywhere the teacher has real probability and the student has almost none. And the student learns: cover everything the teacher might say, even if that means spreading yourself thin. That's called mode-covering. It's what Hinton used, and it's exactly what the soft-label cross-entropy from a minute ago computes.

B: And the other way round?

A: Reverse K L, from the student to the teacher. Now each token's weighted by the student's own probability. So it's huge wherever the student puts probability on something the teacher thinks is unlikely. And it doesn't care at all about what the student ignores. So the student learns to hide inside the teacher's biggest peak and give up on the rest. That's called mode-seeking. And there's a paper, MiniLLM, from Gu and others in twenty twenty-four, that argued this direction is the better one for distilling language models.

B: [skeptical] Okay, so which one actually matches acceptance?

A: [working it out] Neither, exactly. Acceptance is one minus T V, and T V is symmetric. It charges the same for a bit of probability in the wrong place, whichever direction it's wrong in. Both K Ls do put a bound on it, though. There's a classic result called Pinsker's inequality. In words: T V is never bigger than the square root of half the K L, either direction. So drive either K L to zero and T V goes to zero, and alpha goes to one. You can even check it on that area example. After distilling halfway the K L was point oh eight. Half of that's point oh four, square root's point two. So T V is at most point two, alpha at least point eight. And it was point eight two.

B: So they both get you there. Where's the catch?

A: The catch is the student never gets there. At the student's limit, when neither K L can reach zero, they disagree about which mistakes to make. And two students with the same K L can have quite different T V. So the direction you pick changes your alpha.

<!-- section: The Idea: Which mistakes, as you'd see it -->

A: There's a toy that makes this really clean. Picture a vocabulary of forty tokens laid out in a row. The teacher's list has two bumps, a big one on the left and a smaller one on the right, with a valley between them where the teacher puts almost nothing. And the student is deliberately too simple. It can only make one bump. All it gets to choose is where to put the middle of it, and how wide it is. You pick an objective, and it searches every possible bump for the best student under that objective, and reports alpha.

B: And forward K L does what? Covers both, I'm guessing.

A: Covers both. With the second bump holding thirty-five percent, forward K L makes one big wide bump that straddles both of the teacher's bumps. Its alpha is point five five seven. And look where its peak is. Right in the valley. Its single most likely token is one the teacher almost never says.

B: [amused] That's a terrible greedy draft.

A: Terrible. Hold that thought. Reverse K L just sits on the big bump and ignores the small one. Alpha point six five oh. And if you directly maximize alpha, you get point six five six, basically the reverse K L answer. So reverse wins. But now slide the second bump up to fifty percent, so the two bumps are the same size. Now forward K L gets point five five eight, and reverse drops to point five. Reverse still sits on one bump, and giving up half the mass is just too expensive. And maximizing alpha directly agrees with forward K L this time.

B: So it flips depending on the shape.

A: It flips. And that greedy point is the third thing. If you serve greedily, acceptance is just "does the draft's top token match the target's top token". And the straddling student fails that badly even when its alpha at temperature one looks fine. So then you'd think, why not just train on alpha directly? It's the right target. The problem is its gradient only says, token by token, whether the draft is above or below the teacher. Not by how much. So it's a rough signal to learn from. Most people train with a K L and measure alpha.

B: So what do you actually use?

A: Real students aren't one-bump toys, so the effect's milder. And DistillSpec's finding was exactly this kind of answer. The best divergence depends on the task, and on how you decode. Greedy or sampling, which temperature. There's no universal winner. Which makes it a measurement, not a debate. So in the build, you train with forward K L, because it's the standard and it's the easiest with stored scores. And then you can try the others cheaply. You can even train on one minus the overlap directly, the true objective. DistillSpec includes T V among the losses it compares.

<!-- section: The Idea: Whose text to learn on -->

A: Next question. Distillation needs contexts. Bits of text where you stop and ask the teacher, "what would you say next?" Which bits of text? Think about where the draft actually gets used. Its first guess in a round comes right after real text, text the eight B wrote. But guesses two through K come after the real text plus the draft's own earlier guesses. So you want a draft that's good on the eight B's text, on prompts like your traffic, and ideally on its own half-finished guesses too. And there are three choices, in order of how well they match that. One, generic text. Web pages, books. Which is what the one B was pretrained on. Wrong prompts, wrong writer. Two, the eight B's own answers, to prompts like your traffic. Right prompts, right writer. That's what you'll build. It's called off-policy data, meaning the text came from some process other than the model you're training. Here, the teacher. It's cheap to make once and reuse for every experiment. But the student never sees its own mistakes.

B: Why would it need to?

A: Because of guesses two through K. And that's choice three. The draft writes the text, and the teacher reads what the draft wrote and reports its full list at every position. Then the student's trained toward those lists. That's on-policy distillation. From Agarwal and others, twenty twenty-four, the method's called G K D, and DistillSpec uses it. And it fixes something called exposure bias. A model trained only on someone else's text has never seen a prefix that contains its own typical slips. So when it meets one at run time, it handles it badly. And at guesses two through K of every round, that's exactly what it's reading. Its own slips.

B: [skeptical] It still feels weird, though. You want it to copy the eight B, and you're training it on the one B's writing.

A: It feels weird until you notice whose answers it's learning. The text is the student's, but the target at every position is the eight B's list. So it's learning, "here's what the eight B would do next, after the kind of mess you tend to make." And DistillSpec found drafts trained on student-generated data did as well as, or better than, teacher-generated data. And it's cheaper, because the small model's the one writing. The catch for you is plumbing. On-policy data has to be regenerated as the student changes, so the teacher has to be running during training. On the Spark both fit easily, sixteen gigabytes plus a few. So it's a stretch task, after the off-policy version works.

<!-- section: The Idea: The dataset, and why you store only the top sixty-four -->

A: So here's the pipeline, start to end. About ten thousand prompts, like your traffic. The eight B answers them, batched, at temperature one. That gives you text. About two million tokens, which as token ids is only about eight megabytes. Then the eight B re-reads that text, one prefill per answer, and you store its scores at every position. Then you train the draft two ways: plain cross-entropy on the text, and K L on the stored scores. Then you measure alpha offline, on held-out text. And only then does the winner go into the speculative decoder and onto the scoreboard. Generate once, score once, train many times. And off to the side there's the on-policy stretch, where the draft writes and the eight B scores live.

B: Why store the scores, though? Why not just keep the whole list?

A: Multiply it out. Same habit as the memory math lesson: before you write the code. Ten thousand answers, about two hundred tokens each. That's two million positions. Llama three's vocabulary is a hundred twenty-eight thousand two hundred fifty-six entries. How much disk to store the eight B's full list of scores at every position, in B F sixteen? And then how much if you only keep the top sixty-four entries per position, each one a token id plus a value?

B: [working it out] B F sixteen is two bytes each. So a hundred twenty-eight thousand times two, that's about a quarter of a megabyte per position. Times two million... five hundred gigabytes?

A: About five hundred gigabytes. Which is about four times the Spark's whole memory, and a really slow thing to stream off disk every time you go through the data. Now the top sixty-four.

B: Sixty-four entries. A token id and a value. Value's two bytes. And the id, the vocab's a hundred twenty-eight thousand, so... two bytes is enough for an id?

A: [amused] That's the one everybody tries. Two bytes only counts up to sixty-five thousand five hundred thirty-five. The vocabulary's almost twice that. So the id needs four bytes. Plus two for the value, that's six bytes an entry. Sixty-four of them is three hundred eighty-four bytes. Plus four more bytes for one extra number I'll explain in a second. Three hundred eighty-eight bytes per position. And times two million, that's about point seven eight gigabytes. Under one gig. About six hundred sixty times smaller, and it sits in RAM.

B: [amused] Five hundred gigabytes down to less than one. Okay. And the extra number?

A: The extra number is what keeps those sixty-four honest. It's called the log-sum-exp. Remember softmax: you take e to the power of every score, then divide by the total. The log-sum-exp is just the log of that total, over the whole vocabulary. The thing you divide by. And with it, any single stored score turns into an exact probability. So your sixty-four stored scores become sixty-four exact probabilities. Say they add up to ninety-five percent. Then you know, exactly, that the teacher spreads the other five percent over the other hundred twenty-eight thousand one hundred ninety-two tokens. That's called the tail mass. You don't know it token by token, but you know its total.

B: And without it?

A: Without it, all you can do is take the sixty-four and stretch them to add up to one. Which quietly claims the teacher puts zero probability on everything else. And that's a lie you'd be training on.

B: Is sixty-four even enough, though? A hundred twenty-eight thousand tokens and you keep sixty-four.

A: There's a neat way to answer that. Suppose the student matched those stretched-out top sixty-four perfectly. Then each of those sixty-four tokens gets a bit more from the student than from the teacher. So the overlap on each one is just the teacher's number. And the overlap everywhere else is zero. So the student's alpha comes out to exactly the teacher's top-sixty-four mass. Ninety-five percent in that example. Which means the average top-sixty-four mass on your data is, roughly, a ceiling on what training from these stored files can teach. And you'll measure it. For fairly peaky chat answers it's probably high, with a tail of open-ended positions where it isn't. And if you keep the tail mass as its own little "everything else" bucket in the loss, you get a bit of the rest back.

B: [skeptical] Okay, but why store anything? The Spark holds both models. Just run the eight B live while the one B trains.

A: You could. But multiply that out too. One training step for the one B, forward and backward, costs about six times its parameter count in operations per token. Six times one point two billion, about seven billion operations a token. One forward pass of the eight B is about two times eight billion. Sixteen billion a token. So running the teacher live alongside roughly triples the cost of every pass over the data, in every experiment you run. Scoring once and storing it is the cheap, reusable choice. Live teachers are for on-policy training, where the text keeps changing anyway.

<!-- section: The Idea: What shape should a draft be -->

A: Next. What should a draft even look like? There are four shapes worth knowing. Two you'll build, two you'll meet. The first is what you have. A separate small model. Llama three point two one B. Sixteen layers, each two thousand forty-eight numbers wide, one point two four billion parameters. Reading it costs about two and a half gigabytes per draft step. It only ever sees tokens. And it uses the same matrix for its input embedding and its output layer, which is called tied embeddings. It saves parameters. The one B does it, the eight B doesn't. Distillation makes this one a better impersonator. And there's one hard rule: it has to use the same tokenizer as the target. Token number twelve thirty-four has to mean the same string to both of them, or every comparison between p and q is comparing two different things. Llama three point two and three point one share one. Check anyway, the way your common file already does.

B: And the second?

A: The second one is fun. A truncated copy of the target. Take the eight B. Keep its embedding table, keep its first few layers, keep its final normalization and its output layer, and throw away everything else. Say you keep four layers out of thirty-two. Now it's a draft. And the arithmetic goes like this. Each eight B layer is about two hundred eighteen million parameters, the attention projections plus the big MLP. So four layers is about point eight seven billion. The output layer is four thousand ninety-six by a hundred twenty-eight thousand, so about five hundred twenty-five million parameters. That's about one point oh five gigabytes in B F sixteen, and it gets read every step. The embedding table's a lookup, so only one row of it is read per token. Add it all up and you're reading about two point eight gigabytes per draft step.

B: [skeptical] Which is more than the one B. Decoding's memory-bound. More bytes, slower step. So it should be worse.

A: That's the bandwidth picture, and at batch one it's only part of the story. A draft step's time is also partly set by how many layers run one after another. Each layer launches its own little GPU kernels, and each launch has a fixed overhead that doesn't care how big the matrices are. So a model that's shallow and wide, few layers but each one big, has fewer steps in a row for the same bytes. Four layers instead of sixteen. A quarter of the per-layer launches. And your draft cost measurement last time probably already told you this. The one B was way slower than its bytes predicted. Bandwidth alone said its cost should be about point one six of the big model. You probably saw something like point two five to point four.

B: Huh. So the overhead was the real cost all along.

A: A big part of it. And the second reason to bother: this draft starts inside the target. Same embeddings, same output layer, and its first four layers are literally the target's own first four layers. So in the same process, you can point the draft's embedding and output layer at the target's tensors. They cost zero extra memory. You freeze those, and only train the four layers.

<!-- section: The Idea: Predict, the untrained truncated draft -->

A: So, before any training at all, you just chop the eight B at layer four and run it as a draft. Layer four's output goes straight into the final normalization and the output layer, skipping twenty-eight layers. What acceptance rate do you expect? Better or worse than the off-the-shelf one B?

B: [a bit unsure] I mean... it's the real model's own layers. And its own output layer. So, decent? Maybe not as good as the one B, but it's the eight B, sort of.

A: [laughs] Much worse. Likely terrible. The output layer was trained to read the hidden state after layer thirty-two. That's the only shape of vector it's ever seen. After layer four, the hidden state is in a very different form. The early layers are still mostly working out what the tokens are, not what comes next. Researchers who poke at this, it's called the logit lens, where you apply the output layer to the middle layers and see what they'd predict, they find early-layer predictions are mostly nonsense. Or they just echo back the input token.

B: [amused] So it's like reading someone's notes halfway through and expecting the conclusion.

A: Pretty much. So expect alpha far below the one B's until you train it. And that's the point of the experiment. How much can a few hours of distillation teach four layers to do the job of thirty-two? You measure before, and you measure after.

<!-- section: The Idea: Medusa and EAGLE -->

A: The third shape gets rid of the draft model completely. Medusa. Here's the observation. When the target verifies, it already computes its final hidden state at every position. The vector right before the output layer. So Medusa bolts a few tiny extra heads onto that vector. Head one takes the hidden state at some position and guesses the token two ahead. Head two guesses three ahead. Head three, four ahead. All from the same vector. In the paper, each head is one small block that adds a learned correction to the vector, run through a smooth version of the ReLU curve, using a four thousand ninety-six by four thousand ninety-six matrix. About seventeen million parameters. And then it goes through its own copy of an output layer. You train them on the target's own text while the target stays frozen. That's Medusa one. Or you fine-tune the target along with them, that's Medusa two. And because the heads ride on the verify pass you were running anyway, there's no separate draft loop. The draft cost is close to zero.

B: Wait, two ahead? So head two is guessing three tokens out without knowing the two in between?

A: Without knowing them. Blind. And that's the trade. It's much harder than a draft model that gets to see its own previous guesses, so each head's accuracy falls off quickly with distance. Medusa makes up for it by having each head propose its top few candidates, and then verifying a little tree of combinations in one pass. That's called tree attention. You lay the candidate continuations out as a tree, and use an attention mask so each branch only sees its own ancestors. The paper reports about two point two times for Medusa one, and two point three to three point six for Medusa two. One honest caveat. For sampling, Medusa's default acceptance rule, which they call typical acceptance, is a relaxation. It's not exactly the target's distribution. With greedy decoding, or with the standard rejection rule you already wrote, it stays exact.

B: And EAGLE's the fourth.

A: EAGLE, from Li and others, twenty twenty-four. It's among the strongest practical drafting methods right now. And the idea is this. A draft that only sees tokens has to rebuild, from scratch, everything the target already worked out. So EAGLE's draft is a single transformer layer that reads the target's top-layer features, plus the embedding of the next token. It predicts the next feature vector, and turns that into a token using the target's own output layer. Then it loops on its own predicted features to draft further ahead. So it sees what the target was "thinking", not just what it said. EAGLE two made the shape of the draft tree depend on how confident the draft is. And EAGLE three changed the training so the draft practices on its own predictions. Which is the same "learn from your own slips" idea as on-policy distillation. V L L M and S G Lang both ship EAGLE support.

B: So when would you pick Medusa over a distilled draft model? They sound like opposite ends.

A: They kind of are. A draft model sees its own previous guesses, so its acceptance stays decent several tokens ahead. But it costs a separate forward pass per draft token, one after another. A draft cost of point one five to point four on your box. And it has its own K V cache to manage and roll back. Medusa heads read the target's final hidden state, ride on the verify pass, cost about nothing, need no second cache, and they're cheap to train. But each head is guessing further ahead blind, so acceptance falls fast. So on a one-user, bandwidth-bound box, where draft cost is your biggest problem, heads are attractive. If you need long accepted runs, or you can't touch the serving model's forward pass, a separate draft is simpler. And EAGLE sits in between. It reads the target's features like Medusa, but drafts one token at a time like a draft model. Which is why it usually wins on acceptance. You'll build the first two, and Medusa as a stretch. And the reason EAGLE works is something you'll feel when you build Medusa: the target's hidden state is a far richer input than a few tokens.

<!-- section: The Idea: Measuring a draft without running speculation -->

A: Last idea before building. You're going to train several drafts. And running the full speculative decoder for every one is slow, and noisy. There's a shortcut, and you get it for free from that overlap formula. Take some held-out text the eight B wrote. Run both models over it, giving each one the true text so far at every position. That's called teacher forcing. You feed the real previous tokens instead of the model's own outputs, so every position gets scored in one parallel pass. It's the same mini-prefill trick as verification. Now at every position you have both full lists, p and q. Take the overlap there. That's exactly the probability that the first guess of a round would be kept, at that spot. Average it over all positions. That's offline alpha. And there's no noise from the accept-or-reject coin flips at all.

B: And for greedy? There's no coin.

A: For greedy, the matching number is top-one agreement. The fraction of positions where the draft's single most likely token is the same as the target's. That's literally the acceptance rate for greedy speculation. And you compute it on held-out text the eight B wrote greedily, since that's the text your greedy server sees. Offline alpha is what you use to compare training runs. Then the real decoder confirms it, and adds the two things offline alpha can't see. Guesses two through K, where the text before them includes the draft's own guesses. And the draft cost. Offline alpha is exact for the first guess, and only an approximation for the later ones.

<!-- section: The Idea: Predict, offline vs online -->

A: So, say your distilled draft gets offline top-one agreement of point eight on held-out greedy text. Then you run the real greedy decoder, four guesses per round, and you measure acceptance separately at each guess position. How often guess one is kept, when it's judged. How often guess two is kept, when it's judged. And so on. Does position one come out at point eight? And is position four higher or lower?

B: Position one, same thing basically, so point eight. And four... lower. It's building on its own guesses. Errors compound.

A: [thinking out loud] Position one, yes. It's the same question. The text before it is real eight B text, and the draft guesses one token. Small differences come from the prompt mix and B F sixteen noise. But position four could go either way, and the reason's kind of lovely. Guess four is only judged when guesses one through three were all kept. And when does that happen? Mostly in easy stretches. Boilerplate. The end of a word. Code syntax. So just being judged at position four means you're probably somewhere easy. That pushes acceptance up. But you're right that by then the draft is reading its own guesses, and that pushes it slightly down. On chat text the easy-stretch effect often wins. So don't be surprised if acceptance by position is flat, or even rises.

B: [slowly] Oh. So the later positions are graded on an easier test.

A: They're graded on a filtered test. And that's also why your measured tokens per round never quite matched the formula that treats every guess as an independent coin flip.

<!-- section: Build It: Setup, prompts and generation -->

A: Okay. Building it. It goes in your inference folder, in a new draft folder, with one small file per step. The models: Llama three point one eight B Instruct is the target and the teacher, the one your scoreboard tracks. Llama three point two one B Instruct is the student. Same NVIDIA PyTorch container as before. Training a one B in B F sixteen with the Adam W optimizer needs roughly sixteen bytes per parameter, for the weights, the gradients and the optimizer's bookkeeping. So about twenty gigabytes, plus activations. That's comfortable on a hundred twenty-eight, even with the eight B loaded next to it for scoring.

B: Sixteen bytes per parameter? The weights are only two.

A: The weights are two. The gradients and the optimizer's state make up the rest. The training memory lesson does that math properly. And this is probably your first real language-model training run, so it's a gentle way in. First step, prompts. A draft is only as good as its match to the prompts your server really gets. Your traffic is chat-style questions, so start from a public chat-prompt collection. UltraChat two hundred K is a common one. Check its license and its card first. And if you have real request logs from your server, mix them in. They're the best possible data. Take first-turn prompts of a sensible length, drop duplicates, shuffle, and split off ten thousand for training and five hundred held out.

B: And the held-out ones are for...

A: For measuring alpha. Only that. They must never be trained on. And neither must your benchmark prompts. The script drops those explicitly. If they leak into training, your scoreboard row is measuring memorization, and you'll see exactly that in break-it. Second step, the eight B writes the training text. Ten thousand answers, one at a time at thirteen tokens a second, would take about two days. So batch it. V L L M's offline mode is the easiest way, and you've seen why it's fast. If V L L M won't run in your container, Hugging Face's generate with a batch of thirty-two to sixty-four and left padding works. It's just slower. Answers up to two hundred fifty-six tokens. You run it three times. The training prompts at temperature one. The held-out prompts at temperature one, for offline alpha. And the held-out prompts greedy, for top-one agreement, to match your greedy benchmark. And store token ids, not strings.

B: Why does that matter? It's the same text.

A: [serious] Because if you decode to text and then re-tokenize it later, it can split differently. And then your stored scores line up with the wrong tokens, and nothing errors. It's just quietly wrong. And you might ask why temperature one for training when you serve greedily. Sampled text wanders into more of the places the eight B can go. And the K L target at every position is the whole list anyway, so the student learns what the eight B would do at every branch, not just the branch it took. If your scoreboard is greedy-only, an extra run on greedy text is a fair experiment. Oh, and note how long generation takes. That's your eight B's batched throughput, and it's a number worth having.

<!-- section: Build It: Scoring and offline alpha -->

A: Third step, score it once. For every training answer, run the eight B one time over the prompt plus the answer. One forward pass, teacher forcing. And for each position that predicts an answer token, keep the top sixty-four scores, their token ids, and the log-sum-exp of the whole row. And this is where everyone gets it wrong once. The alignment. Row number i of the output is the model's prediction for token i plus one. Not token i.

B: [working it out] So if the prompt is ten tokens, the answer starts at position ten, and the row that predicts it is... row nine.

A: Row nine. So the rows you want start one before the answer and stop one before the end. One row per answer token. Write the results into three memory-mapped files on disk, one for ids, one for scores, one for the log-sum-exp, plus a list of where each answer starts. That way training can read any answer without loading everything. Do the top sixty-four and the log-sum-exp in thirty-two-bit floats. And each answer is roughly a four-hundred-token prefill, which is nowhere near memory-bound, so one at a time is fine, or batch them if you want it faster. While you're there, record the top-sixty-four mass at every position. Report the average and the tenth percentile. That's your ceiling. And before the full run, a self-check. Take one greedy answer. On most rows, the eight B's top stored token should be the token that actually comes next. Because greedy means it picked its top token. If it only matches on a few rows, you're off by one.

B: And it has to be a greedy one, because a sampled answer didn't always take the top token anyway.

A: Right, on sampled text that check would fail even with perfect alignment. Fourth step, measure where you start. Before training anything. On the held-out sets, teacher-forced, both models over the same ids. At every position, the overlap of the two full lists, whether the top tokens match, and the K L. Average them, and also save the overlap at every position. Use the temperature-one held-out text for alpha and the greedy one for top-one agreement. And use the full lists here, not your stored top sixty-four. Five hundred answers is small enough to score live. That way the measurement doesn't share the approximation your training uses. And make a histogram of those per-position overlaps. You'll see a big spike near one. The easy tokens. And then a long spread below it. That's the taste.

<!-- section: Build It: Training two ways -->

A: Fifth step, train the one B two ways. One script, two loss functions. Same data, same number of steps, same learning rate. Only the loss changes, so the comparison is fair. Loss A is ordinary cross-entropy on the eight B's text. Sequence-level distillation. Loss B is forward K L over the stored top sixty-four, plus one tail bucket. You take the student's log probabilities over the full vocabulary, pick them out at the teacher's sixty-four token ids, turn the teacher's stored scores into probabilities using the log-sum-exp, and compare. Then the tail. The teacher's tail is one minus its sixty-four. The student's tail is one minus its probabilities at those same sixty-four. And you add one more term for that "everything else" bucket.

B: And the temperature thing comes in where?

A: The stored log-sum-exp is only valid at temperature one. At any other temperature you only have the sixty-four, so you'd have to stretch them to sum to one and drop the tail term. That's one more reason to stay at one. The loop itself: score only the answer tokens, mask out the prompt. Pack or pad to about five hundred twelve tokens. Adam W, a learning rate of about one in a hundred thousand with a short warmup and a cosine decay, B F sixteen weights, one or two passes over the two million tokens. And if memory gets tight, compute the output scores in chunks. A batch of eight sequences of five hundred twelve, times a hundred twenty-eight thousand vocab entries, times four bytes, is two point one gigabytes just for the scores. Log the training loss, and every few hundred steps, offline alpha on fifty held-out answers. So you watch alpha move during training, not just at the end.

B: How long's a run?

A: Two million tokens, two passes, seven billion operations a token. About thirty million billion operations total. If your loop sustains a few tens of trillions a second, that's tens of minutes per run. But measure your tokens per second in the first hundred steps, and predict the finish time before you walk away. And after both runs, have an agent review the training script for the classic bugs. Prompt tokens not masked. Scores and labels off by one. The tail term with its sign flipped. The T squared factor missing.

<!-- section: Build It: The truncated draft and on-policy -->

A: Sixth step, the four-layer draft. Copy the eight B, keep only its first four layers, tell its config it has four. Point its embedding and output layer at the target's own tensors, freeze those and the final norm, and train only the layers. Copying a sixteen-gigabyte model needs sixteen more gigabytes for a moment, and you have that. Check that a forward pass works and the cache length matches. Then measure offline alpha before training, as you predicted. Train it with the same K L loss, same data, but a higher learning rate, somewhere around five to ten in a hundred thousand, because those layers have a lot to learn. Measure again. And time one draft step against the one B's, in the same plain eager setup as your draft cost measurement last time. Is it faster per step, even though it reads slightly more bytes?

B: That's the launch-overhead bet.

A: That's the bet. Seventh step is the on-policy stretch. Take your best K L-trained one B and keep training it on its own writing. Each round: the student samples answers to a batch of training prompts, at temperature one. The eight B, loaded alongside, runs one forward pass over each of those answers to get its lists at every answer position. And you take one K L step on that batch. The student's text, the teacher's probabilities. That's G K D in its simplest form. Generation is the slow part, so keep the answers short, about a hundred twenty-eight tokens, and the batch big. Run a few hundred steps and compare against the off-policy K L draft. Offline alpha, and especially acceptance at guess positions two through four. DistillSpec says this helps. Check it on your traffic.

<!-- section: Build It: Into the decoder, and Medusa -->

A: Eighth step, into the real decoder. Extend your sweep script in one way: per-position counts. For each guess position, count how many times it was judged, meaning all the earlier guesses in that round were kept, and how many times it was kept. Kept over judged is the acceptance at that position. Then sweep every draft you made. Off-the-shelf one B, the cross-entropy one, the K L one, the trained four-layer one, and the on-policy one if you did it. For each, record alpha, the per-position acceptance, tokens per round, draft cost, speedup, and its best K. Then take the winner into your speculative server. You just load the checkpoint instead of the stock one B. Nothing else changes. Run the same benchmark as before, concurrency one, four and sixteen, two hundred requests, two hundred fifty-six tokens each. And put the row on the scoreboard, right under last lesson's speculative row, with offline alpha, measured alpha and K in the notes. So the two compare at a glance.

B: And the Medusa stretch?

A: Ninth step. Three heads, guessing two, three and four tokens ahead from the eight B's final hidden state. Memory math first. The heads only need that final hidden state at each position, four thousand ninety-six numbers, plus the token ids. Two million positions, times four thousand ninety-six, times two bytes, is about sixteen gigabytes. Fits in RAM. So you collect the hidden states once and train the heads without ever running the eight B again. Training's fast. One check while collecting: make sure the hidden state you grab is the one after the final normalization. Running the output layer on it should give you exactly the model's scores. And one nice detail: you start each head's matrix at all zeros, so the head begins as just passing the vector straight through.

B: And then each head gets its own output layer, like the paper.

A: [thinking out loud] That's the decision to make. The paper gives each head its own trainable copy. But on the Spark, that's an extra one point oh five gigabytes of reads per head, per step. Three heads is about three gigabytes on top of a sixteen-gigabyte verify pass. About twenty percent slower, every single pass.

B: [skeptical] Which basically cancels the point of having no draft cost.

A: It eats a lot of it. So share the eight B's frozen output layer instead. And if you stack the three heads' outputs and multiply by the output layer once, its weights are read once. It's a small trade of accuracy for bandwidth. Just write down which one you picked. Then drafting is almost free. The verify pass already hands you the row that produced the fix token, or the bonus token. Take the hidden state at that row, run the three heads, and their top choices are next round's three guesses. The next verify pass feeds the fix token plus those three. No draft model, no draft loop, no draft cache to roll back. Measure per-position acceptance, and expect head one to do best and each later head worse. Then compare with your distilled one B.

<!-- section: Measure -->

A: So what should the numbers look like? These are rough expectations to check, not results. The dataset on disk should be within a few percent of three hundred eighty-eight bytes times the number of tokens. If it's bigger, something's padded. Top-sixty-four mass is probably high on average for chat answers, with a long low tail on the open-ended positions. If the average comes in well under ninety percent, try keeping a hundred twenty-eight instead.

B: And cross-entropy versus K L?

A: Both should beat the off-the-shelf one B, because both teach the eight B's habits. Expect K L to beat cross-entropy at the same number of steps. And by more on alpha at temperature one than on top-one agreement, because cross-entropy on sampled text is already a decent signal for "what's the top token". How much? DistillSpec's ten to forty-five percent extra speedup is the published range for their setups. A gain of several points of alpha is a reasonable thing to hope for. Measure it. The four-layer draft should be near-useless before training, and improve a lot after. Whether it passes the one B depends on how much four layers can learn from two million tokens. It starts with the target's own representations, but it has far fewer parameters doing the work than the one B's sixteen layers. Its draft cost may be noticeably lower. Whichever one wins, the comparison is the lesson.

B: And offline against the real decoder?

A: Offline top-one agreement should match position-one acceptance in the greedy decoder to within a couple of points. Later positions flat or rising is common, for that filtering reason. Now the speedup, and this is the part I'd really hold on to. At a draft cost of point three, going from alpha of point seven to point eight takes your best speedup from about one point three seven times, at two guesses, to about one point five five, at three guesses. But at a draft cost of point one five, the same alpha change goes from about one point seven five to about two point one.

B: [working it out] So the same training run is worth more if the draft step is cheaper. The two levers multiply.

A: [emphatic] They multiply. A distilled draft helps more the cheaper your draft step is. So training a better draft and lowering the draft cost aren't competing for your weekend, they stack. Medusa: head one alone might rival the distilled one B's position-one acceptance, or fall short. Heads two and three will be clearly worse, because they're guessing blind. But the draft cost is near zero, so even modest acceptance can win. And without tree verification you're leaving some of Medusa's gain on the table, which is fine for a first build. On the scoreboard, tokens per second at concurrency one should rise by roughly the ratio of the new speedup to the old one. Throughput at sixteen is still bounded by the lock. Same story as last time. Faster per request, not wider.

<!-- section: Break It -->

A: Then you break it on purpose. Four ways. First, off by one. In the K L loss, shift the teacher's rows by one position relative to the student's. Train for a few hundred steps.

B: Loss explodes?

A: [serious] The loss still goes down. That's the scary part. The student is now learning to predict the token after the next one. Which is possible, just hard. So it does learn something, and the curve looks healthy. And offline alpha collapses. A falling loss proves the student learned something. Only alpha tells you it learned the right thing. Which is why you keep that self-check from the scoring step.

B: Okay, that one's actually scary. What's the second?

A: Hinton's temperature, wrong job. Distill at temperature four, stretching the top sixty-four to sum to one and multiplying by sixteen, which is T squared. Then measure offline alpha at temperature one, and top-one agreement, and compare with the temperature-one run. The student's learned to match flattened lists, which usually means it spreads too much probability at the temperature you actually serve. Alpha drops, especially at temperature one. The distillation temperature is a choice about what to copy. For a draft, copy what you serve.

B: Third.

A: Top one only. Set k to one in the K L loss and drop the tail. Now you're doing cross-entropy against the teacher's top choice. A one-hot label again, just a different one from the sampled token. And you'll watch alpha at temperature one fall back toward the plain cross-entropy run, while top-one agreement holds up, or even improves.

B: [working it out] Because the top choice is all you taught it. So greedy's fine, but sampling, where all the other tokens matter, gets worse.

A: Right. The soft part of soft labels is exactly what makes a draft good at sampling. And the fourth: leak the benchmark. Add your benchmark prompts, with the eight B's answers, to the training set and retrain. Your scoreboard speedup jumps.

B: [dry] Suspiciously.

A: [laughs] Suspiciously. Then run the sweep on a fresh set of twenty chat prompts the draft's never seen, and watch it come right back down. Drafts memorize. A speedup measured on training prompts is a speedup on your test, not on your traffic. Now, a real server does see repeats, which is why caching and n-gram lookup exist. But that's a different claim, and you'd measure it as one.

<!-- section: How it scales -->

B: Okay, so how does this scale? Say instead of two million tokens I want to distill on a billion.

A: [relaxed] Storage first. Full score lists would be a billion times a quarter of a megabyte. Two hundred fifty terabytes. That's just impossible. Top sixty-four at three hundred eighty-eight bytes a token is about three hundred ninety gigabytes. Possible on disk. Too big for the Spark's memory, so you'd stream it. Then compute. Scoring with the teacher is about sixteen billion operations a token, so for a billion tokens that's sixteen billion billion. Many hours to days on one box. And generating that text with the eight B in the first place is slower still, because decoding is the expensive part. Training the student is about seven billion a token.

B: So at that size the expensive part isn't the training at all. It's getting the eight B to write.

A: Right, and that's why on-policy distillation starts to look better at that scale. The student does the writing, which is cheaper, and the teacher only scores. And you'd shard all of it across GPUs. But the returns also shrink. Alpha's capped by what a one B can represent at all, so at some point a bigger draft, or an EAGLE-style feature drafter, beats just throwing more tokens at it. And at high serving batch sizes the whole speculative speedup shrinks anyway. So how much this work is worth depends on your load.

<!-- section: Connections and close -->

A: And zoom out for a second, because this was a small but complete training run. Generating data, a scoring pass, a training loop, held-out evaluation, and a final metric that isn't the loss. Training a small language model end to end does that same loop from raw text, at a bigger scale. LoRA shows how to do this kind of fine-tune while training only a tiny slice of the parameters. And judging a model by a held-out number that matches your real goal, instead of by its training loss, is a whole topic of its own. On the serving side, quantization stacks with all of this. A four-bit draft lowers the draft cost, and a lower draft cost makes every point of alpha you trained for worth more. If you read one thing, read Hinton's distillation paper. It's short. And then DistillSpec, which is basically this whole build, as a paper.

B: [thinking out loud] Okay, let me try the whole thing. A draft gets kept based on how much its list overlaps with the big model's, and that overlap is one minus the distance between them. So a good draft isn't a smart model, it's one that's close to the target. And distillation gets it close faster than plain fine-tuning, because instead of training on the eight B's text, you train on its probabilities, which is a better label... so the student ends up learning what the eight B knows.

A: [gently] Almost. The first half's exactly right. It's the last bit. The student isn't learning what the eight B knows. It's learning how the eight B talks. Its odds, at the temperature you serve, on your kind of prompts. And the reason the soft label wins isn't that it's a better answer. It's that it's more answer. One sampled token is one roll of the eight B's dice. The full list is the dice. So the student needs far fewer examples to copy the shape. And the shape is all that's ever graded, because the output's always exactly the eight B's. The draft only decides how fast.
