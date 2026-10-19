<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture the interview. It's going well. You've described your ranker, the cross-encoder, the model that reads the query and one document together and gives back a score. You've talked about the training data, the loss, how much better the rankings got. And then the interviewer leans back and says, "Nice. So how does it scale?"

B: [laughs] Yeah. I know that moment.

A: And there's nothing. Not a wrong answer. Just, no place to start. Scale to what? More users? More documents? Is this about the GPU? The database?

B: Honestly, I think I'd say something like, well, it's stateless, so we can scale it horizontally. Add more GPUs as traffic grows.

A: And you'd both know that's a vibe, not an answer. It's not wrong, exactly. It's just true of almost everything, so it doesn't tell anybody anything. How many GPUs? When do you need the second one? Is it even the GPU that runs out first?

B: Okay, fair. But I'd need way more information to answer that properly. Real traffic numbers, real benchmarks.

A: That's the second trap. You don't need real numbers. You need rough ones, and a method. A strong answer to that question takes about ninety seconds, and it never needs a calculator. What the strong candidate has isn't a better brain. It's a habit, and a little stock of numbers in their head.

<!-- section: Fermi and the paper scraps -->

A: [warm] The habit has a great origin story. July nineteen forty-five, the first atomic bomb test in New Mexico. Enrico Fermi is standing miles away from it, holding a handful of torn-up paper. And when the blast wave reaches him, he drops the scraps, and watches how far they get pushed sideways.

B: That's it? Just paper?

A: Just paper. He measures how far they drifted, does some arithmetic in his head, and announces roughly how big the explosion was. The official number took instruments and weeks of work. And he was off by about a factor of two.

B: With paper. That's kind of ridiculous.

A: And he made a habit of it. He'd ask students things like, how many piano tuners are there in Chicago? Nobody knows that. But you roughly know how many people live there, how many households have a piano, how often a piano gets tuned, how many a tuner can do in a day. Multiply those, and you land within a factor of a few. People started calling these Fermi problems. Later, Jon Bentley brought the same habit to programmers in a column called "The Back of the Envelope". And Jeff Dean at Google put up a slide called "Numbers Everyone Should Know", and then used them to do exactly this kind of estimate for real system designs.

B: So the interview question is a piano tuner question.

A: It's a Fermi problem with a server in it. That's all it is.

<!-- section: What scale actually means -->

A: So here's the thing to notice. "How does it scale" sounds vague, but there's a really precise question hiding inside it. As the load grows, which resource runs out first, at what load, and what do you do about it?

B: Which resource. So not just "the server".

A: Right. Every machine has a short list of things it can run out of. The GPU can only do so much math a second. Memory only holds so many bytes, and it only moves so many bytes a second, which is a different limit. The network card only pushes so much. The CPU only parses and tokenizes so fast. And the company only has so much money. Your system is basically a pipe running through all of those at once. And the narrowest one sets the limit for everything.

B: That's the bottleneck.

A: That's the bottleneck. The one thing that fills up first, where making anything else faster does nothing until you widen that one. So the job isn't to say "it scales". The job is to name the bottleneck, put a number on where it hits, and say what you'd change.

<!-- section: Stop carrying digits -->

B: [skeptical] Okay, but "put a number on it" is the part that scares me. I'm not doing long multiplication in front of an interviewer.

A: You shouldn't. The trick is, you stop carrying digits. You round everything to one digit and a power of ten. Being off by a fifth at every step is completely fine. Because the question you're actually answering is, is this one machine, ten machines, or a thousand? Getting the right power of ten is the whole game. People call that the order of magnitude.

B: So, what, three hundred and seven hundred are basically the same number?

A: For this, yeah. They're both "hundreds". Three hundred and three thousand are not the same. That's the difference you care about. And there's one conversion that does a ridiculous amount of work. A day is about a hundred thousand seconds. It's a bit less, actually, but it's close enough. So the moment someone says "ten million searches a day", you can say "about a hundred a second" without thinking.

B: Okay, that one's handy.

A: And then the first thing a lot of people get wrong: you never size for the average. Traffic follows people. It goes up when a time zone wakes up and goes down at night. So the busiest hour is a few times the average for normal human traffic, and for spiky stuff, a launch, a news event, a job that fires at midnight, it can be way more. That ratio is called the peak factor. Size for the peak. Or say your assumption out loud and let them correct it.

<!-- section: The ranker, link by link -->

A: So let's actually do your ranker. And I'm not going to read you the numbers, because the numbers aren't the point. The shape is.

B: Go on.

A: You start from queries a day, and turn it into queries a second at peak. Then each query isn't one piece of work. It re-ranks a pile of candidates, so you multiply by the number of candidates. Then each candidate pair isn't one unit either, it's a few hundred tokens of query plus document, so you multiply by tokens. And each token has to go through the model, which costs about two operations per parameter. One multiply, one add, for every weight it touches. Multiply that in, and now you've got how much math per second the whole thing needs.

B: And then compare that to what one GPU does.

A: And you're careful there, because you never get what the spec sheet says. A decent fraction of it, not all of it. So you take a realistic fraction, divide, and for a ranker like yours at ten million queries a day, you land at about five H one hundreds. Then you add headroom, because you don't want any machine running flat out, and a spare for when one dies. Call it eight.

B: [working it out] Huh. And that's it? That's the answer?

A: That's most of it. But here's what I actually like about it. Every link in that chain is a lever. Halve the candidates, and the number of GPUs halves. Shorter documents, same thing. Smaller model, same thing. The chain tells you where to push. That's why showing the chain is more useful than the final number.

B: Wait, why compute, though? Didn't we figure out that these models are always waiting on memory? The whole seventeen tokens a second thing.

A: Good, yeah, that's worth getting straight. When a chatbot writes text, it makes one token at a time, so it drags the whole model out of memory to do one tiny bit of math with each weight. It spends its life waiting on memory. Your ranker is the opposite. One query sends a whole pile of pairs through together, so tons of tokens share every single trip to memory. Lots of math per byte. So it's like reading a prompt, not like writing an answer. It's limited by the math, not by memory.

B: So knowing which kind of workload it is tells you which number to watch.

A: Right. And then, quickly, you check the others, because that's how you know you picked the right bottleneck. The model's memory is tiny. The network traffic is nothing next to what a card can push. Compute is the wall by a mile. And one more check people forget. How long does one query take, on its own? Because adding more GPUs lets you handle more queries at once. It doesn't make any single query faster.

B: Oh. So if one query alone blows the latency budget, no amount of hardware fixes it.

A: No number of machines fixes it. You'd have to change the work.

<!-- section: Where the surprises are -->

A: The fun part is that doing this on other problems keeps turning up things you wouldn't have guessed. Take semantic search over a billion web pages. One embedding vector per page.

B: Sounds expensive to compute.

A: That's what I'd have said. But when you run the chain, computing all of them is a few hundred hours of rented GPU. Under a thousand dollars. The expensive part was never making them. It's keeping them in memory, forever, with copies, so you can search them. That's the bill.

B: Huh.

A: And if you go one step further back, fetching the billion pages in the first place, you'd guess it's a bandwidth problem. It's not. It's that each fetch takes about a second, between looking up the address and waiting on slow servers. So to keep up, you need thousands and thousands of fetches in flight at once.

B: That's the waiting-versus-working thing. The rule that how many things are in progress is how fast they arrive times how long each one takes.

A: That's the one. Little's law. It shows up everywhere in these estimates. And then the one that really changed how I think about it: a chat product on Llama, the eight billion one. Every person mid-conversation has their own KV cache, the stored notes for every earlier word. Same model, same traffic, two different machines. On an H one hundred, you run out of memory space first. You simply can't fit enough people's notes. On the Spark, it flips. There's tons of room, but every step has to read the model plus everyone's notes through slow memory, so the speed falls apart long before the space runs out.

B: [a bit surprised] So the same workload has a different bottleneck depending on the box.

A: Which is exactly why "it depends" is a real answer, as long as you can say what it depends on.

<!-- section: Ten times, a hundred times -->

A: Then there's the part interviewers actually want to hear. You've named the bottleneck. Now, what happens at ten times the traffic, and a hundred times?

B: At ten times, I guess you just buy ten times the GPUs.

A: At ten times you usually can, and it's tens of GPUs and a real monthly bill. But a good answer says, before I buy them, I'd look at the levers. The biggest one for your ranker is candidates. Put a cheaper, smaller model in front to narrow the pile down before the big one sees it, and you cut the work several times over. Cache scores for popular queries, because a small number of queries make up a big share of search traffic.

B: And at a hundred times?

A: At a hundred times, you're at real web search scale, and buying machines gets so expensive that nobody does it. The design changes. Several stages, each cheaper than the last, distilled models, heavy caching, and the big model only looks at the last few results. And then the bit that sounds senior is saying what breaks next once you've fixed the first thing.

<!-- section: Estimates are hypotheses -->

A: And then the step everybody skips. You say how you'd check. "Before committing, I'd load-test one GPU and replace my guess with a real number."

B: Because the guessed fraction of the spec sheet might be way off.

A: It might be way off. And that's where it gets interesting. When you actually hammer one machine with rising traffic, you see latency sit flat for a long time, then bend up sharply as the machine gets close to full. That bend is the next thing to understand, and it's why you leave headroom. And with a small enough model, you can watch the GPU sit mostly idle while one CPU core is pinned doing tokenizing and Python overhead. The bottleneck moved off the GPU entirely.

B: So the bigger GPU wouldn't help there at all.

A: Not at all. And the habit I'd really push is keeping a journal. Every estimate you make, write it down, then write the measured number next to it when you get one. If you're within a factor of two, that was a good estimate. If you're off by five, one assumption was badly wrong, and finding which one is worth more than the measurement.

<!-- section: Ending -->

B: Okay, let me try to say it back. "How does it scale" really means, which resource runs out first and when. So you turn the load into a rate, multiply through what each request costs, round everything to powers of ten, and compare that against one machine. The biggest ratio is the bottleneck. And then you say what you'd add at ten times, and what you'd redesign at a hundred times.

A: That's it. The one thing I'd sharpen is that the final number isn't the answer. The answer is the bottleneck, the chain that got you there, and what breaks next after you fix it. And then, "here's how I'd check." Say those out loud and nobody hears a vibe anymore. They hear an engineer.
