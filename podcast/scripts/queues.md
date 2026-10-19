<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, say you add a feature to the ranking service. Every time a user saves a document, you call an LLM to write a little two-line summary, and then you run the cross-encoder to score it against their saved queries. And the obvious code does both, right there inside the request handler. Works fine on your laptop. The user stares at a spinner for a few seconds, then it's done.

B: Sure. That's how I'd write it first.

A: Everyone would. Then, one week. A customer imports a few thousand documents at once. Now your server has thousands of requests, each holding a connection open for seconds. The LLM provider starts telling you to slow down, your handler retries inline, the requests take so long the load balancer gives up on them. So the user hits import again. Now there's twice as many.

B: [laughs] Oh no.

A: Then you deploy a fix in the middle of the afternoon. The restart kills every request that was in flight. Some summaries got written, some didn't, and nothing records which. And then the research team asks you to re-score the whole corpus, five million documents, with the new ranker checkpoint. You write a loop. It dies most of the way through, because one document has a malformed byte that crashes the tokenizer. And you don't know which ones finished.

B: So you start over.

A: You start over. And all three have the same shape. Slow work that can fail is welded directly to whatever asked for it. If the asker is slow or impatient or dead, the work suffers. If the work is slow or broken, the asker suffers. The fix is to put something in between. A to-do list both sides can read and write at their own pace, that remembers what's done. That's a queue.

<!-- section: The ticket rail -->

A: You already know the shape from a restaurant. The waiter doesn't cook. They write the order on a ticket, clip it to the rail, and go back to the dining room. The cooks pull tickets off the rail whenever they're free. If ten tables order at once, the rail gets long, but nobody in the dining room is stuck waiting at the kitchen door.

B: So the API's the waiter.

A: The API's the waiter, that's the producer. The cooks are the workers, or consumers. And the rail is the queue, run by a separate server called a broker. And the ticket is tiny. It's not the document. It's a little note that says, summarize document such-and-such.

B: And the save request just... drops a ticket and answers.

A: Drops a ticket and answers in milliseconds. And that one change buys you four separate things, and they're worth knowing by name because people will say them in design reviews. The two sides can run at different speeds. The API can take in way more saves than the workers can summarize, and the backlog lives somewhere built to hold it. Second, bursts get absorbed. An import, a Monday morning, the queue stores the spike and the workers chew through it over the next few minutes. Third, retries happen out of sight. If the LLM call fails, the worker tries again later, and the user's request finished ages ago. And fourth, one event can feed lots of readers. "Document saved" can go to the summarizer, the search indexer, analytics, and the API doesn't need to know any of them exist.

B: And the catch?

A: The user gets "accepted" instead of the answer, so you need some way to tell them later. They check back, or you push it to them. And you've added a whole new system that can fail. Which, honestly, is most of what's interesting here.

<!-- section: It doesn't add capacity -->

B: [skeptical] Okay, but doesn't the queue basically fix the import problem by itself? It's like extra capacity. Things just wait their turn.

A: That's the picture I'd push back on hardest. A queue doesn't add any capacity. It only moves the waiting somewhere safer. Remember the rule from when we talked about waiting versus working. How much is in progress equals how fast things arrive, times how long each one takes. So if jobs come in at some rate and each keeps a worker busy for a couple seconds, that tells you exactly how many workers are busy, on average. That's your floor.

B: And if you run one fewer than that?

A: Then every second a little more arrives than you finish. And the line grows. Forever. It never catches up on its own. Every new job waits behind everything before it.

B: Huh. So a queue is great for spikes and useless for being permanently short.

A: That's it. A spike is fine. The line jumps up, then drains at whatever spare capacity you have. But notice what that means. If you're only barely over capacity, a big backlog takes ages to drain, even though you're technically keeping up. It's the headroom that clears backlogs, not just being over the line.

<!-- section: Handing over a job -->

A: Okay, now the interesting part. A worker asks the broker for a job. The broker has a decision to make. Delete the job now? Or keep it until the worker says it's done?

B: Delete it when it hands it out. It's the worker's problem now.

A: And then the worker crashes halfway, and the job's gone. Nobody will ever do it. So no, the broker keeps it until the worker says, I'm finished. That message is called an ack. But here's the problem. How long does the broker wait for it? Because a dead process doesn't announce that it's dead. From the broker's side, "still working on it" and "got killed ten minutes ago" look exactly the same. Silence.

B: [working it out] So it needs a timeout.

A: It lends the job out with a deadline. That's called a lease. The job's yours for, say, thirty seconds. Finish and ack in time, and it's gone for good. If the deadline passes and the broker hasn't heard from you, it hands the job to someone else. So when a worker really does die, its job just comes back, a little later, and another worker picks it up.

B: Okay, that's clean.

A: It's clean, with one trap that I think is the most common queue bug in production. The lease has to be longer than the job. Say most of your jobs take a couple of seconds, but now and then there's a giant document that takes almost a minute. With a thirty second lease, the broker decides that worker must be dead, and hands the job to a second worker. While the first one is still happily working on it. Then maybe a third.

B: And nothing crashed.

A: Nothing crashed. It looks like random duplicates under load, because jobs get slower under load. The fix is either a lease longer than your slowest normal job, or a heartbeat. Every so often the worker says, still on it, and the broker pushes the deadline back.

<!-- section: The myth of exactly once -->

B: So, ack after the work. That's the answer.

A: That's the answer, and now look closely at one moment. The worker finishes the job. It saves the result. And then, right before the ack reaches the broker, it dies. Or the ack gets lost on the network. What does the broker see?

B: [working it out] Silence. Same as if it died before saving.

A: Same silence. And the broker can't see inside the worker. So it has two choices. Hand the job out again, and maybe do it twice. Or don't, and maybe never do it. There's no third option. And if you move the ack earlier, you just move the gap somewhere else.

B: So that's why queues talk about these different promises.

A: Right. Ack before the work, a crash loses the job, but nothing's ever doubled. That's called at-most-once, and it's fine for, like, a metrics sample. Ack after the work, a crash means it runs again. Nothing lost, some things happen twice. That's at-least-once, and it's the default for almost every serious queue. And then there's exactly-once.

B: [skeptical] Which is what you actually want. Can't you just turn that on?

A: That's the one that's mostly a marketing word. You can't get it as a delivery promise, for exactly the reason we just walked through. Silence after the save looks like silence before it. What you can get is exactly-once as an effect. You accept that a job might arrive twice, and you make the worker so that doing it twice changes nothing. That's called being idempotent.

B: Like how?

A: Give every job a key. Then write the result and the "this key is done" mark together, in one transaction, with a rule that the key can only appear once. The second delivery tries to write, finds the key already there, and does nothing. And make the operation a "set", not an "add". "This document's score is point eight three" can be written a hundred times. "Add one to the processed count" can't, unless you only add it when the result was actually new, in that same transaction.

B: So the whole reliability story rests on the worker, not the queue.

A: That's the honest version. At-least-once delivery, plus a worker that makes repeats harmless. People sometimes call that effectively-once.

<!-- section: Poison -->

A: Now, remember the document with the malformed byte. Under at-least-once, it's worse than you'd think. A worker grabs it, crashes. The lease runs out. Another worker grabs it, crashes. Then another.

B: Oh, it just walks through your workers killing them one at a time.

A: Forever. That's called a poison message. So you count attempts. Every time a job gets handed out, its count goes up. After a few failures, instead of going back in line, it gets moved aside into a separate queue nobody processes automatically. A dead-letter queue.

B: A graveyard.

A: It's only a graveyard if you treat it like one. Three things make it useful. Store why it died, the actual error, so you're not debugging blind. Alert when it grows, because a silent dead-letter queue is just dropping messages with extra steps. And have one command that puts everything back in line once you've fixed the bug. And since the worker is safe to run twice, re-running something that half succeeded is fine.

<!-- section: The log -->

A: There's a second kind of machine that gets called a queue, and it comes from a pretty specific moment. Around twenty ten, LinkedIn had dozens of systems that each needed data from dozens of others. Page views into the analytics cluster, profile changes into search, activity into recommendations. And every pair had its own custom pipeline.

B: So the number of pipelines grows with the number of pairs.

A: Which gets out of hand fast, and every one broke in its own way. So three engineers there, Jay Kreps, Neha Narkhede and Jun Rao, built Kafka to replace all of them with one thing. A single, durable record of events that anyone could write to and anyone could read from, at their own pace. And at the end of twenty thirteen, Kreps wrote this essay called "The Log", arguing that a log, just an ordered list of things that happened, kept for a while, is the idea underneath databases and replication and data pipelines all at once.

B: How's that different from the job queue?

A: In a job queue, each ticket goes to one worker, and it's thrown away once it's acked. In a log, nothing's thrown away when it's read. It's appended to the end and kept for days, whether anyone's read it or not. And each reader just keeps a bookmark. I've read up to here.

B: [working it out] Oh. So the summarizer and the search indexer each have their own bookmark on the same log.

A: Right, and a slow reader doesn't slow anyone else down. And here's the superpower. Say you find a bug in the summarizer that's been running for two days. Fix it, move its bookmark back two days, and it redoes everything. With a job queue, those tickets were gone the moment they were acked.

B: So why not use a log for everything?

A: Because of how it spreads the work. One log can only go so fast, so it's split into lanes, called partitions. Each record goes into a lane based on its key, so everything about one document lands in the same lane, in order. And each lane is read by exactly one reader in a group. So order only holds inside a lane. And the catch is, one slow record blocks everything behind it in its lane, even if other readers are sitting idle. A job queue doesn't have that. Any free worker just takes the next ticket.

B: So, slow, uneven jobs, a job queue. Facts that lots of systems care about, a log.

A: That's the rule of thumb. If each message is a task to get done once, job queue. If it's an event, a fact about something that happened that several systems want, a log.

<!-- section: The corpus, again -->

A: So back to the five million documents. A batch job is really just a queue with one enormous spike at the start. Treat it that way and the "which ones finished" problem disappears.

B: How?

A: Each ticket's a chunk, not a document. A thousand documents, say. Way fewer trips to the broker, and the worker can feed the ranker full batches. Results are written keyed by the document and the model version, so if a chunk runs twice, nothing changes. Which means you never need to know exactly what finished. You just look at what's missing, and queue that again. And the bad document fails its chunk a few times and gets parked in the dead-letter queue with its error, while every other chunk keeps moving.

B: Did you actually try killing workers?

A: That was the fun part. I ran a pool of workers through a couple thousand documents and killed a random one with no warning, several times a second, the whole way through. And nothing was lost. Every good document got scored, and the two poison ones were sitting in the dead-letter queue with their errors. The safe table had exactly one row per document. The other one, which just did a plain insert, had duplicates, roughly one for every kill that landed between saving and acking.

B: And if you make that gap really small?

A: Then you might see no duplicates at all. And that's the dangerous case. Because the bug's still there. It's just rare enough to make it all the way to production.

B: [working it out] So how do you even know if a queue is healthy, day to day?

A: Not by how long the line is. A long line that's shrinking is fine. You watch how far behind the workers are, and the best version of that is the age of the oldest job. Length tells you how much is waiting. Age tells you how late you are. If it's flat near zero, you're keeping up. If it jumps and then slides back down, that's a burst being absorbed. And if it climbs in a straight line, you're short, and it'll never recover on its own. How steep that line is tells you how short.

<!-- section: Ending -->

B: Okay, let me try. A queue sits between the thing that asks for work and the thing that does it, so each side runs at its own speed, spikes get soaked up, and crashes don't lose work, because a job only disappears once a worker says it's done. So it makes things reliable.

A: Two things I'd sharpen. It doesn't make things reliable on its own. It makes them survivable, and only because the worker can safely do the same job twice. Without that, you've traded lost work for duplicated work. And it doesn't add capacity. It just moves the waiting somewhere safer. So bound it, and watch how old the oldest job is.
