<!-- section: The Problem -->

A: [relaxed, thinking out loud] So there are two scenes I keep putting next to each other. The first is a job posting. A research engineer role at an AI lab, and in the list of things you'd do, there's this line. "Writing a design doc for fault-tolerant strategies." Not building. Writing.

B: Huh. That's a weird thing to put in a job posting.

A: It is, until you see what they mean. Before anyone touches the training code, somebody decides, in writing, what happens when a machine dies halfway through a two-month run on a thousand GPUs. And other people read it and argue with it. Then the code.

B: Okay. And the second scene?

A: The second scene is your desk. At a startup, nobody hands you a spec. Someone says, the ranker needs to be faster. And you go and build it your way. And it works. But there's a little voice that says, my way is probably not the best way. And I'd never know.

B: [a bit unsure] Yeah. I mean, the code gets reviewed, though.

A: The code gets reviewed. The approach doesn't. A reviewer will tell you to rename a variable. They won't tell you the whole cache layer was the wrong idea, because by then you've already built it, and changing it is too expensive. So it's the same problem in both scenes. The expensive decisions happen before the code. And the only cheap place to find out you're wrong is on paper.

B: So I always thought of a design doc as, like, documentation. The thing you write after, explaining what you built.

A: That's the most common way it goes wrong, actually. Written after the code, it can describe what got built. It can't change anything. All the value comes from writing it while the decision is still open.

<!-- section: Request for comments -->

A: [warm] And the habit is older than you'd think. Nineteen sixty-nine. The early internet, the ARPANET, is being built by a handful of grad students at a few universities. And nobody's in charge. They have to agree on how the machines will talk to each other, and they're nervous, because they assume some senior people will show up and take over, and they don't want to sound like they're giving orders.

B: [laughs] Grad students being polite.

A: Very polite. So one of them, Steve Crocker, writes up the first notes, and he calls them "Request for Comments." To make it clear, these are proposals. Argue with them. And that's how basically every internet protocol since got settled. Someone writes down a proposal, others argue in writing, the document gets better, and then people build it.

B: Which is kind of the startup situation, right? No authority, no roadmap.

A: That's the startup situation exactly. No one's in charge, and you still need to find the best design. And the answer back then was, write it down and ask.

<!-- section: What writing does that code doesn't -->

A: So a doc does three jobs. It makes you think. It gets people to agree, or object, while objecting is still cheap. And it's a record, so in six months when someone asks "why do we do it this way?", the answer isn't "ask whoever built it", who has long since forgotten.

B: The thinking one is the one I'd push on. I think in my head fine.

A: Sure, but in your head, "we'll checkpoint regularly" feels like a plan. On paper, the next sentence has to be "every so many minutes, because..." And you get to the "because", and you discover you don't know how often the job fails. Or how big the save is. Or how fast storage can take it.

B: Whereas in code I'd just write, save every thousand steps.

A: And it would run fine. And it would hide the fact that the thousand was a guess. Code lets you skip that question. A doc doesn't. That's really the whole thing.

B: Okay, but I can't write a doc for every change.

A: No, and you shouldn't. The useful test is how bad it is to be wrong. Some decisions are like a door you can walk back through. Rename a function, try a thing, undo it. Just do it. Others are one-way doors. How a two-month training run survives failures, say. You find out it was wrong when the run is late, and you can't get those GPU hours back. Those get a doc.

<!-- section: Failures add up -->

A: So let's actually do the one from the posting, because it shows why the numbers matter so much. Keeping a training run on a thousand GPUs alive.

B: [skeptical] Honestly, I'd start by saying servers almost never die. A good server runs for months.

A: One server, yes. One server in a good cluster might go most of a year without a problem. But here's the catch. A big training run isn't a thousand separate jobs. At the end of every step, every GPU has to check in and share its results before anybody moves on. So if one GPU dies, all of them stop.

B: [working it out] Oh. So it's a chain. And a chain breaks when any link breaks.

A: Right. And failures add up across machines. Twice the machines, twice as many failures a day. So something that feels immortal on its own falls over all the time when you need all of them at once. Meta's report on training Llama three is unusually honest about this. At their biggest scale, the job got knocked over every few hours.

B: Every few hours. On a run that lasts months.

A: Every few hours. And the mistake you just almost made, using one server's failure rate for the whole job, is the most common mistake in real fault-tolerance planning. If you plan around that, you save way too rarely. When I ran it in a little simulator, it threw away about half the month.

B: Half. From one wrong number.

A: From one wrong number in the requirements section. And that's the argument for writing it down. A reviewer looks at the arithmetic and says, you used the per-server number, in about five seconds. Nobody catches that in a code review.

<!-- section: How often to save -->

B: Okay, so the job will die a lot. The obvious answer is save often.

A: Here's the tension, though. Every save costs time. The GPUs stop training while they write everything out. So save constantly and you waste time saving. But save rarely, and every crash throws away everything since the last save.

B: So it's like insurance. You pay a little all the time so a disaster doesn't cost you everything.

A: That's a good way to see it. Pay premiums constantly and you're safe but broke. Never pay, and one bad day wipes you out. And there's a best amount in between, and it depends on just two things. How expensive a save is, and how often disaster strikes. The answer moves with the square root of those, which has a nice consequence. Make saving a hundred times cheaper and you only save about ten times as often.

B: Huh. So it's not as sensitive as I'd think.

A: It's really not. And this was the thing that surprised me when I played with it. The curve is flat on top. If you're at half the best interval or double it, you barely lose anything. So don't agonise over the exact number. Be in the right range. Being way off is what hurts.

B: [skeptical] Then where do you actually win?

A: By changing the two things that set the curve. Make saves cheap, and make restarts fast. For cheap saves, the trick is, training doesn't need to wait while the bytes crawl out to storage. It only needs to wait while the state gets copied somewhere safe, like the machine's ordinary memory. That's quick. Then a background thread writes it out while the GPUs keep going.

B: And restarts?

A: Restarts are sneaky, because once saves are cheap, restarts are the biggest cost left. And no choice of interval touches them. So you take a restart apart. How long until anyone notices? Surprisingly long, sometimes. When one GPU dies, the others don't get an error. They just wait, until a timeout that can be minutes. So you have every worker send a little "I'm alive" message every few seconds. Then you need a replacement machine, which might mean waiting in a queue, so you keep a spare one already booted and ready. And you keep a copy of each machine's state in a neighbour's memory, so the replacement can pull it in seconds instead of everyone hammering storage at once.

B: That's a lot of machinery.

A: It is. And the doc's job is to make each piece earn its place. Google credits that last trick, the copies in memory, for a big jump in how much of the time their largest run was actually training.

<!-- section: Failures that don't crash -->

A: And then there's the scary kind. So far a failure is loud. A process dies, everyone knows. But sometimes a chip just computes a wrong answer. No error. A bit flips, or a core has a defect that only shows up when it's hot.

B: [a bit unsure] How rare is that?

A: Rare per chip. But with thousands of chips running for months, it stops being rare. And here's why it's so bad. That one wrong result gets averaged into everybody's update at the next check-in. So now the model is wrong everywhere, and every save from then on carries the damage.

B: Oh. So if I only keep the latest save—

A: Then by the time you notice, you've already overwritten every good copy. So the doc says, keep a ladder. The last few, plus older ones going back days. Storage is cheap next to re-running a week of training. And you watch the loss, because a sudden spike is often the first visible sign.

<!-- section: Writing it so people read it -->

A: Now, all of that is useless if nobody reads past the first paragraph. And most people won't. The people who decide are busy, and they decide from the top. So the top has to carry the whole decision. A few lines. What you propose, the one number that says why, what it costs, and what you need from the reader.

B: Like an abstract.

A: Like an abstract with a request at the end. If someone stops reading there, they should be able to say yes or no. And then, numbers over adjectives. "Checkpointing will be fast" means nothing. "Training pauses for a few seconds each save" can be checked and argued with. Every adjective in a draft is a spot where you skipped the arithmetic.

B: What about the alternatives section? I'd probably write, we could also just not do this.

A: [laughs] That's the strawman, and reviewers can smell it. They assume you didn't look. You put the two or three serious options, honestly, with what each one is good at. And for this doc, the nicest thing that falls out is, the cheapest option, just picking a sensible interval, gets you a big chunk of the win. So even a reviewer who rejects everything else gets that. The expensive pieces have to justify themselves.

<!-- section: Taking the review -->

B: Okay, and then I send it out and people tear it apart.

A: You send it to two or three people, picked for what they know, not their rank. Someone who runs the storage, someone who's babysat a big run, someone skeptical. And you tell them what you're unsure about. "Please attack the failure rate I assumed." A vague "thoughts?" gets vague thoughts.

B: [a bit unsure] And if someone says, I'd do it totally differently?

A: Then that's a new alternative. You put it in the doc next to yours, with numbers. Either it wins, which is the whole point, or the doc shows why it loses. And this is the part that answers that little voice at your desk. A comment that kills your proposal and replaces it with a better one isn't the doc failing. It's the doc working, at the cheapest possible moment.

<!-- section: Ending -->

B: Okay, let me say it back. The big decisions happen before the code, and code review is too late to change them. So you write the plan down first. Writing makes you put a number where you'd normally guess, and it lets other people object while it's cheap. And the fault-tolerance thing is the example. Failures add up across machines, and the doc is where you'd catch that and choose how often to save.

A: That's it. The one thing I'd sharpen is the last bit. Choosing how often to save turns out to be the easy part, because the curve is flat. What the numbers on paper really tell you is where the next effort should go, cheaper saves and faster restarts. That's the general shape, too. The doc isn't just checking your plan. It's showing you which part of the problem actually matters, before you've spent a week on the wrong one.
