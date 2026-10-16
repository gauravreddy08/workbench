<!-- section: The Problem -->

A: [relaxed, thinking out loud] So there's this line in a research engineer job posting at one of the AI labs. In the list of things you'd do, it says "writing a design doc for fault-tolerant strategies". Writing. Not implementing. Writing. And what that means is, before anybody touches the training code, someone's expected to decide, on paper, what happens when a machine dies halfway through a two-month run on a thousand GPUs. And then other people read it. And argue with it.

B: [a bit unsure] See, that one gets me, because it's kind of the opposite of how I work. At a startup nobody hands you a spec. Someone says "the ranker needs to be faster", or "we need evals for the new model", and I just... go build it. My way. And it works. But there's always this little voice going, my way's probably not the best way. And I'd never find out.

A: [curious] And why would you never find out?

B: I mean, people review the code.

A: [jumping in] Right, and that's exactly it. They review the code. Nobody reviewed the approach. And by the time code exists, the approach is too expensive to change. A reviewer will tell you to rename a variable. They will not tell you the whole cache layer was the wrong idea. Because you've already built it. Saying that would mean throwing away two weeks of your work, so, you know, nobody says it.

B: Huh. So the posting and my thing are... the same problem?

A: Same problem. In both, the expensive decisions happen before the code, and the only cheap place to find out you're wrong is on paper. That's what a design doc is. It's the tool for finding the better way before you've paid for yours. And it does one more thing code doesn't. You can write a training loop with checkpointing, saving every so often, without ever once asking how often the job actually fails. It runs fine. But you can't write the requirements section of a doc without putting a number there. The page just won't let you skip it.

A: So we're going to do two things at once here. The document itself, what goes in it and how you get people to actually read it. And the content of that posting's doc, fault tolerance for a big training run, well enough that you could write it for real.

<!-- section: Origin -->

A: [warmly] And the habit is old. Nineteen sixty-nine. The ARPANET, the thing that became the internet, is being built by a handful of graduate students at four universities. And nobody's in charge. They have to agree on how the machines will talk to each other, and they're nervous about it, because they assume some senior people are going to show up and take over, and they don't want to sound like they're giving those people orders. So a UCLA grad student named Steve Crocker writes up the first notes, in April sixty-nine, and he calls them "Request for Comments". On purpose. To say: these are proposals. Open to argument. Not decrees. R F C one described the software on the host computers.

B: [working it out] So no boss, no roadmap, and they still had to land on the best design. That's... that's my startup.

A: [laughs] That's your startup exactly. And their answer was, write it down and ask. And it stuck. Every internet protocol since, T C P, H T T P, all of them, got settled the same way. Someone writes down a proposal, other people argue in writing, the document gets better, and then people build it. And Google, Amazon, Rust, Python, most serious engineering teams kept that habit. They just gave it different names. Design docs, six-pagers, R F Cs, peps.

<!-- section: The Idea: What a design doc is for -->

A: So, plainly. A design doc is a short document you write before building something non-trivial. It says the problem, the constraints, the approach you picked, the alternatives, and why they lost. And other people read it and argue over it before the work starts. And it does three jobs. They're different jobs, and a doc that only does one of them is weaker for it.

A: The first job is thinking. Writing is just a slower, more honest version of thinking. In your head, "we'll checkpoint regularly" feels like a plan. On paper, the next sentence has to be "every blank minutes, because blank". And that's where you find out you don't know the failure rate. Or how big the checkpoint is. Or how fast the storage can take it. Code lets you skip all of that. You write the line that says, save every thousand steps, and it runs, and it hides the fact that a thousand was a guess. The doc's where the guess gets noticed.

A: The second job is agreement. A design touches other people. There's the infra person whose storage you're about to hammer. The researcher whose run you're going to pause. The manager paying for the GPUs. A doc lets them object while objecting is still cheap. Code review comes way too late for "is this even the right approach?"

A: And the third job is a record. Six months from now someone asks, "why do we checkpoint every eight minutes and keep twenty copies?" Without a doc, the answer is "ask Gaurav". And Gaurav's forgotten.

B: [laughs] Gaurav has definitely forgotten.

A: With a doc, the reasoning's written down. The numbers, the alternatives you threw out. So when the numbers change, new cluster, bigger model, someone can redo the decision instead of just copying the old number because it's there.

B: [skeptical] Okay, but honestly, when I hear "design doc" I picture the thing you write at the end. Like, you've built it, and now you write up how it works so the next person understands.

A: [gently] Yeah, that's the common failure. That's a doc that only does job three. Written after the code's done, describing what got built. And that's documentation. It's fine, it's useful even. But it can't change anything. The decision's already made. All the value of a design doc comes from writing it while the decision's still open.

A: So when is one worth it? A good test is, what does it cost to be wrong. Jeff Bezos split decisions into one-way doors and two-way doors. A two-way door you can walk back through cheaply. Renaming a function, that's a two-way door, just do it. A one-way door is expensive or impossible to reverse. A storage format other teams depend on. A public API. The checkpoint layout of a training run that's already three weeks in. And choosing how a two-month run survives failures is a one-way door. You find out you got it wrong when the run's late, and you can't get those GPU hours back. So, rough rule. If it'll take more than a week to build, or it touches someone else's system, or it'll be painful to undo, write the doc first.

<!-- section: The Idea: The shape of a design doc -->

A: There's no official format. But good docs end up with the same parts, in roughly the same order, and the easiest way to think about them is that each part answers one question a reader has. At the very top, a summary. Five lines. What are you proposing, and what do you need from me? Then context: why now, what hurts, and how much, with a number. Then goals and non-goals: what counts as done, and what are we not doing. Then requirements: which numbers does this design have to hit. Then the proposed design itself, usually with a diagram: how does it work, and why does it hit those numbers. Then alternatives: what else did you consider, and what does each one cost. Failure modes: how does this thing break, and then what. Rollout and testing: how do we know it works before we bet on it. And at the bottom, open questions: what don't you know yet, and who might.

A: And here's the part that changes how you write it. Almost everyone reads the top. The people who actually decide read maybe the top half. Only the reviewers read all of it. So the top has to carry the whole decision on its own.

B: So most people read five lines.

A: [dry] Most people read five lines. We'll come back to that, because it's the most important writing advice in the whole thing.

A: A few of these sections deserve a word, because they're the ones people get wrong. Non-goals are the most underrated. They say what you are deliberately not solving, so a reviewer doesn't spend their comments asking for it. Something like, "non-goal: surviving the loss of the whole storage cluster". That one line saves you a page of argument. And it tells everyone the risk was considered and accepted. Not forgotten.

A: Requirements have numbers, or they aren't requirements.

B: Like, "recovery should be fast"?

A: [amused] That's a wish. A requirement is, "recover from a single-node failure in under five minutes, and keep at least ninety-five percent goodput over the run". We'll get to goodput in a bit, it's basically the fraction of time that turned into training you kept. The point is, you can check whether a design meets that. And you can compare two designs against it. "Fast" you can't compare. This is where all the back-of-envelope stuff pays off, turning a vague question into arithmetic with units.

A: Alternatives considered is where a doc earns trust. If the only alternative listed is a strawman, like, "we could also just not do this", reviewers assume you didn't look. So you list the two or three serious options, what each one's honestly good at, and why you still picked yours. And often the best review comment you'll ever get is "alternative B is better than you think". You only get that comment if B is on the page.

A: Failure modes asks how the design itself breaks. And for a fault-tolerance doc, that gets a little recursive. Okay, so what happens when the checkpointing system fails?

A: And open questions is permission to not know everything. "I don't know whether our storage can absorb one point one terabytes every ten minutes. Storage team, can it?" That's a better doc than one that pretends. It turns reviewers into collaborators.

A: Okay. So let's actually write the content of that posting's doc. And every fault-tolerance doc has to start in the same place. How often do things break?

<!-- section: The Idea: Requirements start with a failure rate -->

B: [casual] I'd have guessed... not that often? Like, a single GPU server is pretty reliable. You could run one for months.

A: [relaxed] You could. One server, months, no problem. And that's what makes the next part so sneaky. A training job on a thousand GPUs is not a thousand independent jobs. Quick reminder of why. With data parallelism, every GPU has a full copy of the model and trains on its own slice of the batch. And at the end of every step, they all have to combine their gradients, so everybody ends up with the same averaged update. That combining step is called an all-reduce, and it needs every single GPU to show up. So if one GPU dies, the all-reduce can't finish, and all of them stop.

B: Oh. So it's a chain.

A: It's a chain. And a chain fails when any link does. So the number you need is M T B F, mean time between failures. It's just the average time from one failure to the next. If a server's M T B F is two hundred sixty days, it fails on average once every two hundred sixty days. Though any one failure can come a lot sooner or a lot later. And here's the key fact. If failures on different machines are independent, and each machine fails once every so many days on average, then a job that needs all of them fails that many days divided by the number of machines. Because failures add up. Ten machines produce ten times as many failures per day as one does.

A: So try it. A single eight-GPU server in a well-run cluster gets interrupted about once every two hundred sixty days. Your run uses a hundred twenty-eight of them. That's a thousand twenty-four GPUs. How often does the job get interrupted?

B: [working it out] Two sixty divided by a hundred twenty-eight... that's about two. So every two days.

A: About two days. Now two thousand forty-eight servers. Sixteen thousand GPUs.

B: Two sixty over two thousand... that's way under one. A tenth of a day?

A: [emphatic] About an eighth of a day. Roughly three hours. So one server feels immortal, and a few thousand of them fail several times a day. Same hardware.

B: [skeptical] Where does two hundred sixty even come from, though? That feels like a number someone picked.

A: [matter-of-fact] It comes from Meta, actually. The Llama three paper is unusually honest about this. During a fifty-four day stretch of pre-training on sixteen thousand three hundred eighty-four H one hundreds, that's two thousand forty-eight servers of eight, they report four hundred sixty-six job interruptions. Forty-seven were planned, maintenance, config changes. Four hundred nineteen were unexpected. And about seventy-eight percent of the unexpected ones were put down to confirmed or suspected hardware problems, with GPUs and their memory the biggest category. So four hundred nineteen over fifty-four days, that's about seven point eight a day. One every three hours or so. Spread that across two thousand forty-eight servers and you get roughly one interruption per server every two hundred sixty days.

B: Is it fair to use that, though? An interruption's not the same as a server dying.

A: No, and that's one of two caveats that belong in any doc that uses this number. An interruption includes software bugs, network problems, storage issues. Which is fine, actually, because that's the number that matters to the job. The job doesn't care why it stopped. The second caveat is bigger. This is Meta's mature cluster at the end of a lot of engineering. A new cluster in its first weeks, when bad hardware's still being weeded out, or a smaller team's software, can easily be several times worse. Meta has a later study of its research clusters, Kokolis and others, twenty twenty-four, that's a good read on how much the rate moves around.

A: If you drew it, it'd be four bars on a log scale. One server, about two hundred sixty days. Sixteen servers, about sixteen days. A hundred twenty-eight servers, about two days. Two thousand forty-eight, about three hours, that's Llama three scale. Sixteen times the servers, one sixteenth the time between failures, every step down.

A: So for our doc, a thousand twenty-four GPUs, a hundred twenty-eight servers, the Llama three rate gives about fifty hours between interruptions. And we're going to plan for something worse. Twelve hours. And say so, right in the doc. Something like, "planning M T B F twelve hours, about four times worse than Llama three's reported rate, to cover cluster burn-in and our less mature stack. The design should still meet its goals at six hours, and get better at fifty." A range with a reason beats a single number with fake precision. Reviewers can argue with the reason.

A: One more modelling choice, and the doc should say this one out loud too. We'll treat failures as random and memoryless. Memoryless means the chance of failing in the next minute doesn't depend on how long it's been since the last failure. The math name for that is the exponential distribution. It's the standard starting assumption, and every formula from here on rests on it. And real hardware isn't quite like that. Failures cluster. A bad batch of nodes, a flaky switch that takes out a whole rack. So the doc names it as a known weakness of the model.

<!-- section: The Idea: Where the time goes, goodput -->

A: [slowing down] So when the job fails, what do you actually lose? Let's slow one failure way down. The job's training. It saves a checkpoint, a snapshot of everything it needs to resume. It keeps training, say another twenty minutes. And then a node dies. Everything it computed since that last checkpoint? Gone. Thrown away. And then it has to pay for the restart. Somebody has to notice the failure. Replace the machine. Load the checkpoint back. Warm everything back up. And only after all that does it start training again.

A: So every minute of wall-clock time is one of four things. Kept work, training that made it into a checkpoint and survived. Checkpointing, time the GPUs spent saving instead of training, if the save blocks them. Lost work, steps that got computed and then thrown away. And restarting, from the moment of failure until training's running again. Call that R.

B: And how much do you lose per failure? It depends where it lands, right?

A: It does. But if failures land at random, then on average one arrives halfway through the gap between two checkpoints. So each failure loses, on average, half an interval. Checkpoint every forty minutes, you lose about twenty per failure.

A: And the number that captures all of it is goodput. Goodput is the fraction of wall-clock time spent on work you kept. Throughput counts every step the GPUs ran. Goodput only counts the ones that survived into the final model. A job can be running at a hundred percent throughput and have eighty percent goodput. It's a better headline than counting failures, too. Failure count tells you nothing about what each failure cost. A design that halves the failures but doubles the restart time can actually lower goodput, and only goodput shows you that.

A: And it's the right headline for the doc because it turns straight into money and calendar time. A thousand twenty-four H one hundreds for thirty days, that's about seven hundred thirty-seven thousand GPU hours. So every one percent of goodput is about seventy-four hundred GPU hours. At a rough two to three dollars a GPU hour, call it twenty thousand dollars per percentage point, per month. Or about seven hours of calendar delay.

B: [amused] Okay. That gets a manager's attention.

A: That's the idea.

<!-- section: The Idea: How often to checkpoint -->

B: So then the answer's just... checkpoint as often as you can? If losing work is what costs you, save all the time.

A: [patient] That's the half everyone feels, yeah. But saving isn't free. If the save takes a minute and the GPUs sit there during it, then saving every two minutes means a third of your run is saving. So there's a real tension. Checkpoint often, and you waste time saving. Checkpoint rarely, and each failure throws away a lot of work. And somewhere in between is a best interval.

A: Think of it like insurance. Each checkpoint is a premium you pay, some minutes of not training. Call that cost C. What you're insuring against is losing work when a failure hits. Pay premiums constantly and you're safe, but broke. Never pay and one bad day costs you everything. And the right premium depends on two things. How expensive the premium is. And how often disaster strikes, which is the M T B F. Call that M.

A: Now the arithmetic, in plain steps. Over a long stretch, per minute of running. The checkpoint cost per minute is, you pay C once every interval. So it's C divided by the interval. Make the interval bigger, this waste gets smaller. And the lost work per minute is, failures come once every M minutes, and each one loses half an interval. So it's half the interval divided by M. Make the interval bigger, this one gets bigger. One falls as the interval grows, the other rises. And the total is smallest right where they're equal. Where paying for one more checkpoint exactly equals the lost work it would save you.

B: [working it out] So you set them equal and solve.

A: Set them equal and solve, and you get this. Take the checkpoint cost, multiply it by the M T B F, double that, and take the square root. That's your best interval. It's called the Young, or Young-Daly, formula. And at that point the two wastes are equal, and together they come to about the square root of twice C over M. Restarts are on top of that, R over M, and notice the interval doesn't touch that term at all.

A: And this is way older than deep learning. In the seventies, long scientific jobs on mainframes had exactly this problem. Run for hours, crash, start over. John Young at I B M wrote a two-page note in Communications of the A C M in nineteen seventy-four with this first-order answer. Then in two thousand six, John Daly, working on supercomputers at Los Alamos, where failures every few hours were just routine, published a more careful version. It's roughly the same answer minus C, plus some small corrections. And it only really matters when checkpoints are expensive compared to the time between failures. GPU clusters inherited the formula, and the problem, straight from supercomputing.

A: So let's do our run. M T B F twelve hours, seven hundred twenty minutes. A blocking checkpoint of the full training state, one point one terabytes to shared storage, takes about a minute. What's the best interval?

B: [working it out] Okay, one minute times seven twenty is seven twenty. Doubled, fourteen forty. Square root of fourteen forty... thirty-something. Thirty-eight?

A: About thirty-eight minutes. Now, say you'd picked every three hours instead, because it felt safe. Restart takes thirty minutes either way. Roughly how much goodput do you lose?

B: Honestly, every three hours sounds fine to me. Saving less means wasting less.

A: You do waste less on saving. One minute out of every hundred eighty, so about half a percent. But lost work is half of a hundred eighty minutes, ninety, once every seven twenty. That's twelve and a half percent. Plus restarts, thirty over seven twenty, about four percent. So goodput around eighty-four. At thirty-eight minutes, the checkpoint-plus-lost waste is about five percent, the restarts are the same four, so goodput around ninety-one. The exact calculation, which also counts failures that hit during checkpoints and restarts, gives ninety-one point oh and eighty-three point nine.

B: So seven points.

A: [dry] Seven points of a thousand-GPU month. Which is roughly fifty thousand GPU hours. From one constant somebody picked by feel.

B: [sighs] Yeah. That's exactly the kind of constant I'd pick by feel.

A: Everyone does. Now there's an interactive version of this you can play with. Up top is a strip showing seventy-two hours of one simulated run. Long blue stretches of training, thin ticks where it checkpoints, a mark where a failure hits, then a hatched stretch, the lost work, and a grey block for the restart. Below that, a single bar showing where a whole simulated year of running went, split into those four buckets. And below that, a curve. Expected goodput, for every possible interval, with the square-root answer as a dashed line and your current choice as a dot. You've got sliders for the interval, the checkpoint cost, the M T B F, and the restart time. And it starts on the felt-safe setting, every three hours.

A: So you slide the interval toward the dashed line, and you watch the hatched lost area shrink while the checkpoint ticks get thicker and more frequent. And then if you drag the checkpoint cost down, or the restart time down, the whole curve lifts. Which is something choosing the interval can never do.

A: And there are four things to notice while you play. First, the curve's flat on top. Really flat. At a one-minute checkpoint, twelve-hour M T B F, fifteen-minute restart, the best interval gives ninety-two point nine percent. Half that interval, ninety-one point eight. Double it, ninety-one point six. So about a point either way.

B: Oh, so you don't actually have to nail it.

A: [laughs] You don't have to agonize. You have to be in the right range. Being way off, like three hours versus thirty-eight minutes, that's what hurts. Second, because it's a square root, the interval moves slowly. Make checkpoints a hundred times cheaper and the best interval only gets ten times shorter. Make failures four times more frequent and you checkpoint twice as often. Third, the restart slice doesn't care about the interval at all. So at the optimum, if restarts are a big chunk of that bar, no interval can fix it. And that's a signal for the doc. The next engineering dollar goes into restarts, not checkpoints. And fourth, cheaper checkpoints help twice. They make the premium smaller, and they let you checkpoint more often, which shrinks the lost work too. Which is why so much real engineering goes into making C nearly zero.

<!-- section: The Idea: Making checkpoints cheap -->

A: So what's in a checkpoint? Everything you need to resume training exactly where you were. The weights, the optimizer state, the step count, where the data loader was, the random number generator states. For a seventy billion parameter model trained with Adam in mixed precision, that's about sixteen bytes per parameter. So about one point one terabytes. And where it goes, and how, decides C.

A: The first trick is, shard it. If one process gathered all one point one terabytes and wrote it out, C would be enormous. So instead every GPU writes only its own slice, all in parallel, plus a small index that says which piece holds what. That's a sharded checkpoint. PyTorch's distributed checkpoint module does it, and a good one can even be reloaded onto a different number of GPUs. With a thousand twenty-four GPUs, each writes about one point one gigabytes. And now the bottleneck's the storage system's total bandwidth. Say the shared storage can absorb twenty gigabytes a second all together. That's plausible for a modest cluster, but measure yours. It's honestly the most important unknown in the whole doc. At twenty gigabytes a second, one point one terabytes takes about fifty-five seconds. That's where "C is about a minute" came from.

A: [leaning in] The second trick changes everything. Make it async. Training doesn't need to wait while the bytes crawl to storage. It only needs to wait while the state gets copied somewhere safe from the next step's updates.

B: Wait, so async means training never stops at all?

A: It stops, just very briefly. There are two phases. First a short blocking snapshot, each GPU copies its one point one gigabytes into its own host's CPU memory, over P C I express. That's well under a second. The spec sheet for P C I express gen five, sixteen lanes, says about sixty-four gigabytes a second each way, and real copies get a good fraction of that. Then a background thread writes from CPU memory out to storage, while the GPUs go right back to training. Only the snapshot counts as checkpoint cost. So C goes from about a minute to a few seconds.

A: Plug it in. C is three seconds, a twentieth of a minute. M is seven hundred twenty. Twice a twentieth times seven twenty is seventy-two, square root of that, about eight and a half minutes. And the checkpoint-plus-lost waste drops from about five percent to about one point two.

A: Async has two catches, and both go in the failure modes section. One, the background write has to finish before the next snapshot starts, or saves pile up. Fifty-five seconds of writing inside an eight and a half minute interval, that's fine. At a one-minute interval it isn't. Two, if a failure hits during the background write, that checkpoint never landed.

B: So you fall back to the one before.

A: You fall back to the one before, and you can lose up to two intervals instead of half of one. The simulator you'll build models that. And notice what async does to storage traffic. One point one terabytes every eight and a half minutes is a steady two gigabytes a second, all day, every day. Whoever runs that storage needs to agree to that. Which is exactly the kind of thing a design doc is for.

A: The third trick is about restarts, but it's a checkpoint trick. Storage is the slow part of restarting too. After a failure, all thousand twenty-four GPUs try to read one point one terabytes back at the same moment. So you keep an in-memory checkpoint. Each node keeps its latest snapshot in its own RAM, and also sends a copy to one or two other nodes. Now if one node dies, its replacement pulls that shard out of the peer's RAM over a four hundred gigabit-a-second network link, well under a minute. Everyone else just reloads from their own RAM. You only need storage if several nodes holding the same shard die together. And Google's Gemini one point oh report credits redundant in-memory copies of model state with raising goodput on its largest run from eighty-five percent to ninety-seven. Those are their numbers.

A: So picture it as a ladder of four places a checkpoint can live, each one slower to reach but surviving a bigger disaster. At the top, GPU memory, the live state. That survives nothing, it's being changed every step. Then host RAM on the same node. Tens of gigabytes a second, well under a second per GPU. That survives a process crash, a bad step, a hung N C C L call. Then a peer node's RAM, over the network, maybe fifty gigabytes a second per node, so seconds. That survives one node dying, as long as its peer doesn't die too. And at the bottom, shared storage. Tens to hundreds of gigabytes a second in total, about a minute for the whole thing. That survives many nodes, the whole job dying, you coming back next week. Those bandwidths are rough orders of magnitude, measure your own. And a good design writes to the fast tiers often and the slow tier less often, and restores from the fastest tier that survived.

<!-- section: The Idea: Making restarts fast -->

A: Now restarts. Back in that example, a thirty-minute restart costs thirty out of seven twenty, about four percent of the run, all by itself. Once checkpoints are async, that's more than everything else combined. So take R apart. It's four things in a row. Detect, replace, reload, warm up. And each one has a fix.

A: Detect is, how long until anyone even notices? And surprisingly, this can be the biggest piece.

B: [skeptical] Really? I'd assume when a GPU dies, the job just crashes with an error. Right away.

A: [serious] That's the natural picture, and it's wrong in an expensive way. When one GPU dies in the middle of an all-reduce, the others don't get an error. They wait. They're all sitting there for their partner's numbers, and the numbers just never come. The library doing the all-reduce is N C C L, people say "nickel", it's NVIDIA's library for these group operations between GPUs, and PyTorch uses it underneath. Its operations have a timeout, and PyTorch's default for it is measured in minutes. Ten minutes in recent versions, check yours. So a dead node can mean ten minutes of a thousand twenty-three GPUs staring at nothing.

B: Ten minutes of the whole cluster. Ugh.

A: So the fix is a heartbeat. Every worker sends a tiny "I'm alive" message to a monitor every few seconds. Miss a few in a row and you're presumed dead. That's way faster than waiting for the timeout. Pair it with a much shorter collective timeout, and detection takes tens of seconds instead of ten minutes. ByteDance's MegaScale paper describes this kind of monitoring in a lot of detail.

A: Replace. The dead machine needs a substitute. Asking the scheduler for a new node can take minutes, or hours if the cluster's full. So you keep a hot spare. A healthy node that's already booted, sitting idle, ready to join the moment another one fails. You pay for it while it waits. In return, replacement takes seconds. For a hundred twenty-eight node job, keeping two to four spares costs one and a half to three percent of the hardware. And whether that's worth it is a perfect row for the alternatives table. Compare what it costs to the goodput it buys, using your simulator.

A: Reload. Read the checkpoint back. From storage, about a minute for one point one terabytes at twenty gigabytes a second, if every node reads its shard in parallel. Often slower, because everyone's hitting the storage at the same instant. From the in-memory copies, seconds.

A: And warm up. Re-create the group of processes, and setting up N C C L across a thousand twenty-four GPUs isn't instant. Rebuild any compiled kernels. Fast-forward the data loader to the right spot. Get back to full speed. That's minutes, unless you cache the compiled stuff and make the data loader able to jump straight to a position.

A: Now there's a whole other answer to "replace", which is, don't. That's elastic training. If a node dies, the survivors regroup at a smaller size and keep going, with one fewer data-parallel copy of the model. And they can grow back when a replacement arrives. In PyTorch, torch run gives you the plumbing. Workers meet at what's called a rendezvous, a meeting point where they find each other and agree on who's rank zero, rank one, rank two. If a worker dies, torch run restarts the group, the survivors meet again, and training resumes from the latest checkpoint. And it can do that with a range of node counts.

B: That sounds strictly better than paying for spares.

A: [skeptical] It sounds that way. But there's a catch your doc has to deal with. With fewer copies of the model, either the global batch shrinks, which changes the training dynamics in the middle of the run, or each copy does more gradient accumulation to keep the batch the same. Gradient accumulation means running a few small batches and adding up their gradients before taking one optimizer step. Same effective batch, just slower. And the other catch is, tensor-parallel and pipeline-parallel groups, where the model itself is split across GPUs, can't lose one member and keep going. The whole group of eight or sixteen GPUs has to go. So elastic is natural for the data-parallel dimension, and awkward for everything else.

<!-- section: The Idea: Failures that don't crash -->

A: So far every failure's been loud. A process dies, and eventually everyone knows. The scary ones are quiet.

A: The quietest is silent data corruption. Every so often, a chip computes a wrong answer and raises no error at all. A bit flips in a multiply. A core has a manufacturing defect that only shows up at certain temperatures. It's rare per chip. But at thousands of chips running for months, it becomes a regular event. Meta and Google both published studies of it in their CPU fleets in twenty twenty-one. And here's why it's so bad in training. A corrupted gradient on one GPU gets averaged into everyone's update at the next all-reduce.

B: But you've got checkpoints. You just go back.

A: [serious] Go back to which one? Once that bad update's averaged in, the model's wrong everywhere, and every checkpoint you save from then on carries the damage. If you don't notice for a while, your recent checkpoints are all poisoned. Google's Gemini report talks about this as a recurring thing at its scale, and describes replaying training steps deterministically to find the machine that's computing wrong.

A: The visible symptom, of corruption or just plain numerical instability, is often a sudden spike in the training loss, or a nan, not-a-number, showing up. So the doc needs a policy. Monitor the loss and the gradient size every step. Alert on a spike past some threshold. And on a bad one, roll back to a checkpoint from before the spike, and skip or reorder the batches that caused it. Google's Palm paper describes exactly this. Restart from a checkpoint about a hundred steps before the spike, and skip a few hundred batches. And Meta's logbook from training O P T, the hundred seventy-five billion parameter one, shows dozens of restarts like that.

A: Then stragglers. One GPU running twenty percent slow, maybe it's thermal throttling, maybe a bad cable that renegotiated down to a lower speed. It doesn't fail. It just makes all thousand twenty-four GPUs wait for it at every all-reduce. In synchronous training the whole job runs at the speed of the slowest worker. And you only see it if you log per-GPU step times and look for the outlier. The policy: detect it, then treat it like a failure, swap in a spare.

A: And all of this changes one more decision. Retention. How many old checkpoints you keep. If you only keep the latest one, then a corruption that went unnoticed for two hours has already overwritten every good copy. So you keep a ladder. The last few in-memory snapshots. The last several on storage. And one every few hours, kept for days. Storage is cheap compared to rerunning a week of training.

<!-- section: The Idea: Writing it so people read it -->

A: Okay. That's the content. And all of it is useless if nobody reads past the first paragraph. And most people won't. The people who decide are busy, and they decide from the top of the page. So, a few rules.

A: The summary decides. Five lines at the top, written last, that stand on their own. What you propose, the one number that says why, what it costs, and what you need from the reader. For our doc it'd go something like this. Proposal: async sharded checkpoints about every ten minutes, with in-memory copies on peer nodes, heartbeat detection, and two hot spares, for the thousand-GPU, thirty-day run. Simulated goodput at a pessimistic twelve-hour M T B F: about ninety-eight percent, versus about eighty-four for the default setup, blocking saves every three hours and thirty-minute restarts. That's about a hundred thousand GPU hours saved. Cost: two idle spare nodes, one point six percent of the hardware, and about two gigabytes a second of sustained writes to storage. Need from infra: confirm storage can take that. Decision needed by Friday.

B: And if someone stops reading right there—

A: They can say yes or no. That's the test.

A: Second rule, numbers over adjectives.

B: So, like, "checkpointing will be fast" is out.

A: That means nothing. "Training pauses about three seconds per checkpoint" can be checked, compared, argued with. Every adjective in a draft is a place where you skipped the arithmetic. So when you find "fast", "large", "rarely", "significant", you replace it with a number and its unit. Or with "unknown, see open question two".

A: Third, a diagram. One picture of the system. Boxes for the GPU nodes, the in-memory tier, the storage, the monitor, and arrows for what flows when. That does more than a page of prose. And draw the failure path too. What happens, in order, when node thirty-seven dies. If you can't draw it, the design isn't finished.

A: Fourth, short. Two to three pages for a design like this, plus an appendix for the derivations and simulator output. Amazon's six-pager culture caps documents for a reason. Length is easy. Choosing what matters is the work.

A: And fifth, put the alternatives in a table. And every number in it comes from the simulator, not from feel. For our doc it reads like a ladder. The default, blocking saves every three hours with manual restarts, about eighty-four percent. That loses about a hundred nineteen thousand GPU hours a month. Next step, same blocking saves, but at the square-root interval, thirty-eight minutes. About ninety-one percent, and it costs you one config change. Big win, for free, but now restarts dominate. Next, add the async snapshot, three seconds, every eight and a half minutes. About ninety-five. Costs the async save code and two gigabytes a second of storage, and needs the storage team to sign off. Then add heartbeat detection, which takes the restart down to about ten minutes. About ninety-seven and a half. That's cheap, and it's a big win. Then in-memory peers and hot spares, restart around three minutes. About ninety-eight point four. That's the proposal. And then one more row off to the side. Elastic data parallelism instead of spares. Similar goodput. Rejected, because it changes the training dynamics mid-run. Revisit at ten times the scale.

B: [working it out] So even if they say no to everything else, the first step's basically free.

A: That's what the table does. It shows the reader that the first and cheapest step, just picking a better interval, gets half the gain. So even if they reject the rest, they get that. It makes every expensive step justify itself in GPU hours. And it shows the elastic option was looked at, with a reason, so nobody has to ask.

<!-- section: The Idea: Reviews, and taking feedback -->

A: Then you send it out. To two or three people, picked for what they know, not their rank. Someone who runs the storage. Someone who's babysat a big run. And someone who'll be skeptical. And tell them what you want. "I'm most unsure about the planning M T B F, and whether storage can take two gigabytes a second. Please attack those." Send a vague "thoughts?" and you get vague thoughts.

A: When comments come back, sort them before you reply. "This fact is wrong." Fix it, and recompute anything that depended on it. That's the best kind of comment. "You're missing a requirement", like, researchers need to be able to restart from any checkpoint in the last week. Add it, and check the design still meets it. "I prefer..." is taste. Accept it if it's cheap, decline politely if it isn't.

B: And "I'd do it differently"? That's the one that'd make me nervous.

A: [warmly] That one you treat as a new alternative. Put it in the table, with numbers. And then one of two things happens. Either it wins, which is the whole point of review. Or the table shows why it loses, and the person who suggested it can see that for themselves. It's not you against them anymore. It's both of you looking at the same numbers.

A: And two habits make it work. One, change the doc, not just the comment thread. The doc's the record. Two, separate the comment from your ego. You wrote the doc to find the better way. So a comment that kills your proposal and replaces it with a better one is the doc succeeding, at the cheapest possible moment. And that's honestly the answer to your startup worry. "My way might not be the best way." So put your way on paper, next to the alternatives, and invite people to beat it.

A: And you end with a recorded decision. Something like, "Decided October twentieth: going with option five. Revisit if the M T B F in the first week is worse than six hours." Now the doc is the record.

<!-- section: The Idea: Lighter versions, RFCs and ADRs -->

A: Not every decision needs three pages, though. There are lighter versions. An R F C, in the modern team sense, is a design doc with a process wrapped around it. Where you post it, how long comments stay open, who decides. Rust's R F Cs and Python's peps are the well-known public ones. You use that when lots of people care about a decision and you need a fair way to settle it.

A: And the smallest version is an A D R, an architecture decision record. One decision, about half a page, committed to the repo right next to the code. Numbered. Never deleted, only replaced by a newer one. Michael Nygard's template from twenty eleven has five parts: a title, a status, the context, the decision, and the consequences. So, "A D R seven: checkpoint every ten minutes, async, keep the last twenty. Context: M T B F about twelve hours, checkpoint cost about three seconds. Consequences: about two gigabytes a second of writes; if the storage changes, revisit." It doesn't argue alternatives at length. It just makes sure the why outlives the person.

A: So the progression is, an A D R for a decision you could reverse but whose reasoning should be remembered. A design doc for a one-way door that needs real thinking. An R F C when the decision affects a lot of people and needs a formal process. And at a small startup, a design doc reviewed by two people, plus a folder of A D Rs, covers almost everything.

<!-- section: Build It -->

A: So here's what you actually build. The tool first, and then two real documents that use its numbers. It's maybe one evening for the reading and the simulator, a second evening for the doc, and then a week of calendar time waiting on the review. It's all plain Python, no packages. Matplotlib if you want plots.

A: You start with a small theory checker, and that one's handed to you in full, because you're going to check your own work against it. It's the exact expected goodput for memoryless failures, the version that also counts failures landing during a checkpoint or during a restart. It comes from the same line of work as Daly's paper. Next to it, two tiny functions, Young's square root and Daly's corrected version. Run it, and the first line should say Young about thirty-seven point nine minutes, Daly about thirty-six point nine, and goodput at Young's interval about point nine two eight seven.

A: Then the part that's yours to write. A failure simulator for one long training job. It runs until a given amount of training is safely inside a finished checkpoint, and then it reports the total wall-clock time, the goodput, how many failures there were, and what fraction of the time went into each of the four buckets. Kept, checkpointing, lost, restarting.

B: How do you even structure that? Minute by minute?

A: [thinking out loud] No, it jumps from event to event. One time through the loop is one interval. You work out when this interval's training ends and when its checkpoint ends. If the next failure comes after the checkpoint's done, you bank the work and move on. If the failure lands before the checkpoint finishes, everything since the last finished checkpoint is lost, including the half-done save. Then you restart. And a failure can hit during the restart too, another node dies while you're reloading, so the restart starts over. That's a small loop inside the big one. And here's the nice part. Because failures are memoryless, after each one you can just draw a fresh random time to the next failure, starting from now. That's the property that makes the whole thing easy. Break It is going to take it away. And the four buckets have to add up to the total wall time. Assert that. It catches almost every bug.

A: Two sanity checks. With no failures at all, goodput should be the interval divided by the interval plus the checkpoint cost. And with zero checkpoint cost and zero restart, goodput is just the fraction of work that wasn't lost.

A: Next you sweep. Try about a hundred intervals, spaced evenly on a log scale from half a minute to a thousand minutes. Simulate each one with at least a hundred thousand minutes of work, over four or more random seeds, and average. Print the best interval next to Young, Daly, and the theory number. Then plot goodput against interval for the twelve-hour case, with your simulated points sitting on the theory curve. You'll recognise it. It's the curve from the interactive.

A: And one thing's going to look like a bug and isn't. Your best interval is going to jump around between runs. By ten, twenty percent. Hold on to that, it's the most interesting result.

A: Then you make the simulator realistic, because the basic one can't tell you whether async or hot spares are worth it. Split the checkpoint into a blocking snapshot and a background write that overlaps training. A failure before that write finishes means the checkpoint never landed, fall back to the previous one. Split the restart into detect, replace, reload, and warm up. And add a chance that the dead node's shard is sitting in a peer's RAM, so reload is fast.

A: And then you build a ladder, at twelve hours, each row adding one thing. Row one, blocking one-minute saves every hundred eighty minutes, and a thirty-minute restart: ten to detect, twelve to replace, three to reload, five to warm up. Row two, the same, at the best interval. Row three, async, a three-second snapshot and a one-minute background write. Row four, add heartbeat detection, so detect drops to half a minute. Row five, add hot spares and in-memory peers, replace drops to half a minute and reload from a peer takes about twelve seconds. Then rerun the whole ladder at six hours and at fifty hours. Those are the numbers for the doc's alternatives table. And the restart pieces are planning guesses, so label them as guesses, and put "measure the real restart time on day one" under rollout.

A: Then the doc itself. Two to three pages. Fault tolerance for a thirty-day pre-training run of a seventy billion parameter model on a thousand twenty-four H one hundreds, a hundred twenty-eight nodes. You follow the skeleton from before. Up top, the author, the reviewers, a status, draft, in review, or decided. The five-line summary, written last. Context, the run, what it costs per hour, what a lost day means. Goals with real numbers: at least this much goodput at the planning M T B F, a single-node failure gets back to training within so many minutes with no human involved. Non-goals. A requirements table, the M T B F with its range and its source, the checkpoint size, the storage bandwidth, the P C I express and network bandwidth, each restart piece, and every single one marked as measured, spec sheet, or guess.

A: Then the design. A diagram. The checkpoint tiers and intervals, with the square-root reasoning. Detection, replacement, the reload path, retention, the corruption and loss-spike policy. And the failure path, step by step, when node thirty-seven dies. The alternatives table, at six, twelve and fifty hours. Then the failure modes of your own design. What if a checkpoint write fails? What if storage is slow? Two peers die together? A checkpoint's corrupted? The monitor itself dies? Rollout and testing: how you prove it before day one. That means killing a node on purpose in a small run, restore drills, measuring the real checkpoint and restart times, and what you'll watch in the first week. Open questions, numbered, each with who might know. And an appendix with the derivation and the simulator output.

B: That's a lot of rules for three pages.

A: Really it's four rules. No adjective where a number could go. Every number labelled. At least one diagram. And the summary has to let someone decide without reading further. And when the draft's done, you hand it to an agent with a specific prompt. Something like: you're a skeptical senior infrastructure engineer, find the assumption that, if it's wrong, most changes the decision, list the failure modes I missed, and don't rewrite the doc. Then you revise it yourself.

A: And then a second doc, and this is the one I actually care about for you. Pick a real decision at work that's still open. Like how the cross-encoder ranker gets served. Batching, the timeout and fallback when the model's slow, what happens when a GPU node dies. Or how the eval pipeline runs. What triggers it, how results get stored and compared, what makes a regression block a release. Ideally one where you already suspect your current way isn't the best one.

B: The one where the little voice is loudest.

A: [laughs] That one. A shorter version, one or two pages, same skeleton. At least one requirements table with real numbers, queries per second, p ninety-nine latency, so the slowest one percent of requests, cost, how long an eval takes. Back-of-envelope numbers or production numbers. At least two real alternatives. And then you send it to one colleague, with a specific ask. "Which alternative would you pick, and what am I missing about this?" No agent for this one. The point is a human who knows your system. And afterwards you write three lines at the bottom. What they said, what changed, what you decided.

A: And you're done when your simulator matches the theory to within about half a percentage point on every case, you can explain why the best interval jumps around, the ladder exists at three failure rates and it's in your doc's table, the fault-tolerance doc has a summary that stands alone, a diagram, a non-goals list, every number labelled, and you've revised it after the review. And the second doc's been read by a real person, with what changed written at the bottom.

<!-- section: Measure -->

A: So what should the sweep show you? All of these with a fifteen-minute restart. At twelve hours and a one-minute checkpoint, Young says thirty-seven point nine minutes, Daly says thirty-six point nine, and the expected goodput at Young's interval is ninety-two point nine percent.

B: And when failures are way more frequent? Like the three-hour case?

A: Three hours, one-minute checkpoint. Young says nineteen minutes, Daly eighteen, and goodput drops to eighty-two point six. At fifty hours it's the other way. Seventy-seven and a half minutes, Daly seventy-six and a half, goodput ninety-seven. Twelve hours with a three-second async checkpoint, eight and a half minutes, Daly eight point four, ninety-six point eight percent. And twelve hours with an expensive three-minute checkpoint, Young says sixty-five point seven, Daly says sixty-two point seven, and goodput's eighty-eight point seven.

A: And what you should see is your best interval landing near the square root, within the wobble. When I ran a simulator like this, four seeds, two hundred thousand minutes of work, the best simulated interval for the first case came out at thirty-seven minutes. And for the async case, seven point three, where Young says eight and a half. Daly's correction is only visibly better in that last case, where the checkpoint's expensive.

B: [skeptical] Seven point three versus eight point five, though. And you said it jumps between runs. That really does sound like a bug.

A: [calm] It's the curve. Remember how flat the top is? Near the optimum, the random noise between seeds is bigger than the actual difference between neighbouring intervals. So which interval "wins" is mostly luck. But the goodput at your interval and at Young's agrees to within a few tenths of a percent. So the practical reading is, compute the square root, round it to something convenient, and spend your effort on C and R instead.

A: And the other thing you'll see is that cheaper checkpoints gain less than you'd hope.

B: I'd have guessed going from a minute to three seconds, twenty times cheaper, cuts the checkpoint waste by twenty times.

A: That's the natural guess. But because you also move the interval, the checkpoint-plus-lost waste at the optimum goes with the square root of C. So twenty times cheaper cuts it by the square root of twenty, about four and a half times. Five point three percent down to one point two. Still very good. Just not twenty times.

A: Then the ladder, at twelve hours. And these are the closed-form numbers for the simple model, yours will be a bit different because of the background write window and the peer copy chance. Row one, blocking saves every three hours, thirty-minute restarts. Eighty-three point nine percent. Out of the roughly seven hundred thirty-seven thousand GPU hours in the month, that loses about a hundred nineteen thousand. Row two, the best interval, thirty-eight minutes. Ninety-one point oh, losing about sixty-seven thousand. Row three, async, eight and a half minutes. Ninety-four point eight, about thirty-eight thousand lost. Row four, fast detection, restart down to about ten minutes. Ninety-seven and a half, about nineteen thousand. Row five, spares and in-memory copies, restart about three minutes. Ninety-eight point four, about twelve thousand.

A: And read that the way a doc reader would. Going from row one to row two is a config change. It's worth fifty-two thousand GPU hours. After that, restarts are the biggest remaining cost, which is why fast detection in row four beats a cleverer checkpoint. And for real-world comparison, Llama three reported more than ninety percent effective training time at sixteen thousand GPUs, with mostly automated recovery. Gemini reported ninety-seven. Your ladder makes it pretty obvious why those numbers took engineering. Not luck.

<!-- section: Explain It Back: How does it scale -->

B: What happens if the run's ten times bigger, though? Ten thousand GPUs?

A: [working it out] Okay. With independent failures, ten times the servers means ten times the failures. So the job's M T B F goes from our twelve hours to about seventy-two minutes. Now the best interval goes with the square root of M, so it only shrinks by the square root of ten, about three point two times. The checkpoint-plus-lost waste grows by that same three point two. But restart waste is R over M, so it grows by the full ten times. Restarts take over. With blocking one-minute saves and thirty-minute restarts, goodput falls to roughly fifty-five percent.

B: Half the run, gone.

A: [matter-of-fact] Gone. With three-second async saves and three-minute restarts, it stays around ninety-two. So at bigger scale the whole design leans toward making R tiny. In-memory peer copies, hot spares, heartbeat detection, maybe elastic data parallelism. And the checkpoint traffic grows too, because the interval's shorter and everybody's sharing the same storage.

<!-- section: Break It -->

A: Now break it. The first one is the most common mistake in real fault-tolerance planning. Let's say you're filling in the requirements section. What M T B F do you put in?

B: [casual] Well, the hardware's rated at... the server fails every two hundred sixty days, so I'd use that. Two sixty days, that's, what, three hundred seventy thousand minutes or so. Times two, times one minute, square root... that's like eight hundred something minutes? Checkpoint every fourteen hours or so. Which honestly sounds reasonable for a server that lasts most of a year.

A: [amused] And you just did it. That's one server's number. The job needs all hundred twenty-eight. Its real M T B F is twelve hours, in our planning. So you'd be checkpointing every fourteen and a half hours, with a failure every twelve. Run that in your simulator with a thirty-minute restart and the expected goodput is about forty-nine percent.

B: [sighs] Half the cluster's month.

A: Half the month, from one wrong number in the requirements section. And that's exactly why the doc has to show the arithmetic. A reviewer can catch "you used the per-node number" in about five seconds. If it's just a constant buried in a config file, nobody catches it.

A: Second, make failures cluster. Change the simulator so after any failure, there's a thirty percent chance of another one within the next twenty minutes. The replacement node was also bad, or it's the same flaky switch. The average M T B F barely moves. But the formula assumed failures don't remember each other.

B: [working it out] So does the best interval move? I mean... if the extra failures come right after a failure, they're landing mostly during the restart. Not in the middle of training.

A: That's the thing to look at, yeah. Where the extra failures land. And then what it does to goodput. And the point for the doc is, name the memoryless assumption out loud in the assumptions section, and say what you'd do about bursts. Like a burn-in test before a replacement node's allowed to join.

A: Third, overwrite your only good checkpoint. Add silent corruption to the simulator. At random times, say once every seven days on average, the model quietly goes bad, and you only notice after some delay. Try thirty minutes, then six hours. When you notice, you have to roll back to a checkpoint from before the corruption. And simulate two retention policies. Keep only the latest, versus keep the last twenty plus one every six hours. With latest-only and a six-hour delay, there's no clean checkpoint to go back to. At all. That's why retention and loss monitoring are part of the design, not an afterthought.

A: And the fourth is about the doc. Delete your summary and send it to a friend, or an agent playing a busy manager, and just ask "should we do this?". Count how many questions they ask before they can answer. And notice whether any of those questions is already answered in the doc, just too far down. Then put the summary back and try again. The difference is what the summary is for.

<!-- section: Explain It Back: Every hundred steps -->

B: [skeptical] Okay, devil's advocate. I'm your colleague in the review, and I say, "just checkpoint every hundred steps. It's fine."

A: [relaxed, thinking out loud] So I wouldn't argue with that directly. I'd ask what a hundred steps is in minutes, and what a checkpoint costs, and then do the arithmetic right there. Say a step's four seconds. A hundred steps is about seven minutes. With a blocking one-minute save, you're spending something like thirteen percent of the run saving. Way past the square-root answer. But with async three-second saves, seven minutes is close to the optimum, and it's totally fine.

B: So I'm right or wrong depending on the checkpoint.

A: The number's not right or wrong by itself. It's only right relative to C and M. So then you put both options in the alternatives table, with goodput from the simulator, and the decision rests on numbers instead of on who argues longer. And if you were right, I say so, and I change the doc.

<!-- section: Connections and close -->

A: Two good reads if you want more. Malte Ubl's "Design Docs at Google" is the best short piece on the document itself. And the infrastructure section of the Llama three paper is real numbers from a real run. And one practical connection. A checkpoint's only as good as the write that made it. If the machine crashes halfway through a save, you can end up with a corrupt file, and the fix is the one from files and disks: write to a temporary file, then rename it into place. Your real checkpoints should do that. And the next time you're about to build something that takes more than a week, like training a small language model end to end, the first thing you make is the doc. Including how it checkpoints.

B: [working it out] Okay, let me try the whole thing. A design doc is how you check your approach before you've built it, because once there's code nobody's going to tell you the approach was wrong. And for fault tolerance the core is that a big job fails way more often than any one machine, so you checkpoint at the square root of twice the checkpoint cost times the time between failures. And that gets you most of the way.

A: [gently] Most of that, yes. Two corrections. The doc isn't just checking. It's how you find out what you don't know. "We'll checkpoint regularly" only turns into a number once you're forced to write it down, and the guess that hides inside the code gets noticed. And the square root isn't most of the way. It's the cheap first step, because the curve's flat and you only have to be in the right range. Once you're there, what's left is restarts and the cost of the checkpoint itself. So the doc's real job is showing, in GPU hours, which of those is worth paying to fix. And then letting someone else try to beat it.
