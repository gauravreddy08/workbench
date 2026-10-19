<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you've got speculative decoding running on the Spark. Quick reminder of how it works. A small model, the draft, quickly guesses the next few words. Then the big model checks all those guesses in one pass, the same way it reads a prompt. Every guess it keeps is a word you got almost for free. And the clever part is the checking rule, which guarantees the final text is exactly what the big model would have written on its own. Same output, just faster.

B: And I got a real speed-up out of it. Not a huge one.

A: A real one, not a huge one. So you go looking at why. You print out the rounds where the big model threw away the very first guess, and you put what the small one proposed next to what the big one wanted. And you see things like this. The eight billion model likes to start an answer with "Here's a". The one billion model guesses "Sure". The big one likes a little header before a list, the small one jumps straight to "one, period". In code, the big one writes math dot pi, and the small one writes three point one four.

B: [working it out] Those aren't wrong, though. Three point one four works.

A: None of them are wrong. They're fine English and working Python. They're just not what this particular eight billion model would say. The small model is a perfectly decent writer with its own habits, and you've asked it to impersonate a different writer whose habits it's never studied.

B: So the fix is a better small model. Something smarter, that writes more like a big model.

A: That's the natural thought. And here's a question that shows why it's not quite right. Suppose someone hands you a brilliant one billion model. Better than your eight billion on a reasoning test. Would it make a good draft?

B: I mean... yes? It'd guess the right answer more often.

A: It'd guess the right answer more often. And every time it guesses a better answer than the big model would have given, the big model rejects it. Remember, the output is always exactly the big model's. So the draft's quality as a writer never shows up in the text at all. The only thing that shows up is how often it agrees. And that only shows up as speed.

B: Huh. So a brilliant model can be a terrible draft.

A: Yes. You don't need a smarter draft. You need a better impersonator.

<!-- section: Overlap -->

A: And you can say exactly what "impersonate" means here. At every step, each model doesn't just have one answer. It has a spread of bets over every possible next word. Picture them as two bar charts, one for the big model, one for the small one, on the same axis. And the chance that the small model's guess gets kept is exactly the area where those two charts overlap.

B: The shared part.

A: Just the shared part. Where the draft puts more probability than the big model does, that's wasted. Where it puts less, that's missed. And both count against you the same. There's a name for how far apart two distributions are in exactly this sense, total variation distance, and the acceptance rate is just one minus it. Which means the whole job is a single, very specific thing. Make the small model's bets look like the big model's bets, on the text your server actually writes.

B: And that would explain why some spots are easy and some are hard.

A: Right. After "The capital of France is", both models pile almost everything on "Paris". Huge overlap. After "Here is a poem about", both are spread across hundreds of possible words, with different favourites. The overlap of two spread-out charts with different taste is small. The draft isn't wrong there. It just has different taste.

<!-- section: Teaching by copying -->

A: [warm] And the idea of training a small model to copy a big one is older than language models. In two thousand six, a group with Rich Caruana had classifiers that were huge ensembles, hundreds of models, way too slow to deploy. So they had the ensemble label a big pile of data, and trained one small network to reproduce its outputs. It got most of the accuracy at a fraction of the cost. They called it model compression.

B: And then Hinton.

A: Hinton, Vinyals and Dean, twenty fifteen. They gave it its modern name, distillation. And their key insight is the one you need. The teacher's wrong answers carry information. If an image classifier says dog, very likely, wolf, a little bit, car, basically nothing, that's telling you this dog looks a bit like a wolf and nothing like a car. A plain label that just says "dog" throws all of that away. They called the information in those small probabilities dark knowledge.

B: Okay, so how does that change what I'd train on?

A: The obvious approach is: have the eight billion write a lot of answers, and fine-tune the small model on that text, with the normal next-word loss. And that works. The small model picks up "Here's a", it picks up the headers, because the training text is full of them. But look at what each example actually tells it. The big model sampled one word at some step, and the label says "this word, and nothing else". But the big model knew more than that. It had a whole spread of odds. Sampling one word from it threw nearly all of that away.

B: So instead you train on the whole spread.

A: The whole spread, at every position. Those are called soft labels. And the loss is a measure of how different two distributions are, called the KL divergence. And here's the nice part. If you write it out, it's literally the same loss you already use, just with the whole spread as the label instead of one word. One line of code changes.

B: [skeptical] Is it really that much better? I'd have thought enough text averages out to the same thing.

A: Eventually it would. But I tried a toy version in numpy. A student that's just a lookup table, one entry per context, learning a teacher with spread-out bets. With sampled words, even after dozens of examples per context it was still well short. With the soft label, it matched the teacher exactly after one example. Real networks share what they learn across similar contexts, so the gap's smaller in practice. But the direction holds. Each soft label is worth a lot of hard ones.

<!-- section: Copy what you serve -->

A: Now, Hinton had one more knob, and this is where a draft is different. A trained model's odds are often really peaky. Almost everything on one word, crumbs on the rest. The crumbs are the dark knowledge, but they barely affect the loss. So Hinton flattened both models' odds with a temperature setting before comparing them, which makes the crumbs count.

B: That sounds like exactly what I'd want.

A: For Hinton's goal, yes. He wanted the student to learn the teacher's knowledge, and he judged it on its top answer. But your draft is judged on the overlap at the temperature you actually serve. A student trained to match flattened odds has learned to spread its bets too thin. So for a draft, you copy what you serve. And there's a related subtlety. The small model is always too small to copy the big one perfectly. So it has to make mistakes somewhere. And the KL divergence has two directions, and they make different mistakes. One direction says, never miss anything the teacher might say. So the student spreads itself out to cover everything, sometimes landing in the gap between two things the teacher likes. The other direction says, never put weight where the teacher wouldn't. So the student picks the teacher's biggest favourite and gives up the rest.

B: And which one matches the overlap?

A: Neither, exactly. Sometimes one wins, sometimes the other, depending on the shape of the teacher's bets and on how you decode. The DistillSpec paper from Google found the same. No universal winner. So you start with the standard one, and you measure the overlap. It's a measurement, not a debate.

<!-- section: Whose text -->

B: What text do I actually train on?

A: The draft is used at very specific moments. Its first guess always follows real text the big model wrote. So you want it good on the big model's writing, on prompts like your real traffic. Not generic web text. That's what it was trained on already. Wrong prompts, wrong writer. So you take a pile of chat-style prompts, keep your benchmark prompts out of it, and have the eight billion answer them.

B: And the second and third guesses?

A: That's the subtle bit. The second guess follows the draft's own first guess. The third follows its first two. So at run time, the draft is constantly reading text that contains its own slips. And if it was only ever trained on the big model's clean text, it's never seen a prefix with its own typical mistakes in it. That's called exposure bias.

B: So you'd want to train on its own writing too.

A: Right. The small model writes, the big model goes over every position of what it wrote and says what it would have bet there, and the small model learns from that. The student's text, the teacher's odds. And it's actually cheaper to make, because the small model is the one writing.

<!-- section: Keep the top sixty-four -->

A: There's a nice storage problem hiding in here too. To train on the big model's odds, you need its full list of scores at every position. And its vocabulary has over a hundred thousand entries. Store that for every position in a reasonable training set, and you're into hundreds of gigabytes. More than the Spark's entire memory.

B: But most of that is crumbs.

A: Most of it is crumbs. So you keep just its sixty-four favourite words at each position, with their scores. Plus one extra number per position, the one that turns those scores into exact probabilities. With that number you also know exactly how much probability is left over in everything you didn't keep, so you're not pretending the rest is zero.

B: How much smaller is that?

A: Hundreds of times smaller. It fits in memory. And you score the text once, store it, and reuse it for every experiment, instead of running the big model live during training, which would make every run several times more expensive.

<!-- section: Other shapes of draft -->

A: And the draft doesn't have to be a separate small model. One idea I like: take the eight billion itself, keep its first four layers and its output layer, and throw away the other twenty-eight.

B: [skeptical] That can't work out of the box.

A: It doesn't. Before training it's terrible. The output layer was trained to read what comes out of layer thirty-two. After layer four, the model's still mostly working out what the words are, not what comes next. But it starts inside the target. Same embeddings, same output layer, its first layers literally the target's. And it's shallow, so fewer steps run one after another, which matters a lot for how fast a draft step is on the Spark. The question is how much a bit of distillation can teach four layers to do the job of thirty-two.

B: And there are ones that don't have a separate model at all, right? Medusa?

A: Medusa bolts a few tiny heads onto the big model's last hidden state, the vector right before it picks a word. Each head guesses a word further ahead. Since they ride on the checking pass you were doing anyway, there's basically no drafting cost. The catch is the heads guess blind, they don't know the words in between, so they get worse quickly the further ahead they guess. And then EAGLE, among the strongest methods today, is a one-layer draft that reads the big model's internal features, not just its words. It sees what the target was thinking, not just what it said.

<!-- section: How you know it worked -->

B: How do I know a draft is better without running the whole decoder every time?

A: You get that for free from the overlap idea. Take held-out text the big model wrote. Run both models over it, and at every position you've got both spreads of bets. Add up the overlap. That's exactly the chance the first guess would be kept there. Average it, and you can compare training runs with no randomness from the actual accept or reject coin flips. And that's also how you catch the scary bug. If you line the teacher's odds up one position off from the student's, training still works. The loss still goes down. The student is learning to predict the word after next, which is possible, just hard. But the overlap collapses.

B: So the loss going down tells me it learned something.

A: Something. Only the overlap tells you it learned the right thing. And one more trap. If your benchmark prompts sneak into training, your scoreboard speed-up jumps, and then on fresh prompts it comes right back down. Drafts memorise.

<!-- section: Ending -->

B: Okay, let me say it back. A draft doesn't need to be good. It needs to bet like the big model. The chance a guess survives is the overlap of their bets, so you train the small one on the big model's full odds at every word, not just the words it wrote. You keep the top sixty-four to make that storable. And you measure the overlap, not the loss.

A: That's it. The piece I'd sharpen is "the big model's text". Its first guess follows the big model's text, but every guess after that follows the draft's own guesses. So the best impersonator isn't just one that's read a lot of the big model. It's one that's also learned what the big model would say after the draft's own slips. Because that's exactly the text it's reading for most of every round.
