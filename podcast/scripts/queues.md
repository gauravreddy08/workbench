<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you add a feature to the ranking service. Every time a user saves a document, you call an LLM to write a little two-line summary, and then you run the cross-encoder to score it against that user's saved queries. And the obvious way to write it is, you just do both, right there in the request handler. Works great on your laptop. Each save takes, what, about six seconds, and the user stares at a spinner for all six. Fine. Then, in one week, three things happen. First one. A customer imports four thousand documents at once. So now your API server has four thousand requests, each one holding a connection open for six seconds. The LLM provider starts answering four twenty-nine, which is HTTP for "too many requests, slow down". And because your handler retries right there inline, the requests stretch out to thirty seconds, and the load balancer in front of you gives up on them and times them out. So the user does the natural thing. They retry the import. Now there are eight thousand.

B: [laughs] Of course they do.

A: Second one. You deploy a fix in the middle of the afternoon. A rolling restart, so the servers get replaced one at a time, and every request that was in flight on a server that got replaced just... dies. Some summaries got written, some didn't, and nothing anywhere records which.

B: And the third?

A: The research team wants the whole corpus re-scored with the new ranker checkpoint. Five million documents. So you write a loop. And it dies at three point two million, because one document has a malformed byte in it that crashes the tokenizer. And you don't know which three point two million finished.

B: [sighs] So you start over.

A: You start over. And here's the thing, all three of these are the same problem. Slow work that can fail is welded directly to whatever asked for it. If the asker is slow, or impatient, or dead, the work suffers. If the work is slow or broken, the asker suffers. And the fix is to put something in between. A to-do list that both sides can read and write at their own pace, and that remembers what's done. That's a queue.

B: [a bit unsure] Okay, but... isn't that just async? Like, async is basically a queue, you put the requests in a queue and they get handled when there's time.

A: That's the picture a lot of people have, and it's worth pulling apart, because they're really different things. Async is about one worker not standing around while it waits. The request is still tied to that worker, inside one process. If the process dies, the request dies with it. If the user closes the tab, it's gone. What we're talking about here is a separate service. It holds the work itself, durably, outside your API process. The work outlives the request, it outlives the worker, it survives a deploy. Your API writes "please summarize document eighty-one seven twenty-three" into it and walks away. That's a message queue. Async is how one program waits well. A message queue is how two programs hand work to each other without needing each other to be alive.

B: [working it out] Hm. So the async thing is inside one process, and this is between processes.

A: Between processes, often between machines, and often between teams. Yeah.

<!-- section: Origin -->

A: And the version of this that took over the industry comes out of LinkedIn, around two thousand ten. They had dozens of systems, and each of them needed data from dozens of the others. Page views going into Hadoop. Profile changes going into search. User activity going into the recommendation models. Metrics going into monitoring. And every pair of systems that needed to talk had its own custom pipeline.

B: So the number of pipelines is basically the number of pairs.

A: [amused] Grows like the number of pairs, yeah. Which gets ugly fast. And every one of them broke in its own special way. So three engineers, Jay Kreps, Neha Narkhede and Jun Rao, built one thing to replace all of them. They called it Kafka. And the idea was a single, durable, append-only record of events. Append-only meaning you only ever add to the end, you never edit what's there. Any system can write to it, and any system can read from it, at its own pace. It was open-sourced in twenty eleven. Then in December twenty thirteen Kreps wrote an essay for LinkedIn's engineering blog with a very long title, "The Log: What every software engineer should know about real-time data's unifying abstraction."

B: [amused] Catchy.

A: [laughs] It's a great essay, though, honestly. His argument was that a log, just an ordered list of things that happened, kept around for a while, is the idea sitting underneath a lot of things. Databases have one internally, the write-ahead log. Replication is basically copying a log. Moving data between systems is reading a log. And if you put a log in the middle of your company, every system becomes a reader. It can catch up, it can fall behind, it can start over from scratch, and nobody else notices. Then in twenty fourteen the three of them left to found Confluent, and these days most companies run some version of that log.

<!-- section: The Idea: A to-do list between two programs -->

A: Okay, so let's build up the plain version first. One quick comparison, just for the shape. In a kitchen, the waiter doesn't cook. They write the order on a ticket, clip it to the rail, and go back out to the dining room. The cooks pull tickets off the rail whenever they're free. If ten tables order at the same moment, the rail gets long. But nobody in the dining room is stuck standing at the kitchen door, and nobody in the kitchen is rushed.

B: And in software, the waiter's my API.

A: The waiter's your API. The name for that side is the producer. The program that creates jobs and puts them on the queue. The cooks are consumers, programs that take messages off the queue and do something with them. When that something is a unit of work, people call them workers. And the rail is the message queue. A separate service that holds messages from producers until consumers take them. The producer doesn't need to know who's going to consume, or whether they're even up right now. The server that actually stores the queue and hands messages out is called the broker. Redis, Rabbit M Q, Amazon's S Q S, and Kafka are all brokers of some kind.

B: And the message is... the document?

A: No, and that's a nice detail. A message is just bytes, usually a tiny bit of JSON that says what to do. Something like, document ID eighty-one seven twenty-three, task summarize. Not the document itself. A pointer to it. The worker goes and fetches the document when it gets to the job. So picture it as two drawings, one above the other. On top, the before. Client, then API, then a box that's the LLM and the ranker, about six seconds. And there's a line running under all three, because it's one chain, held open for six seconds. If any link dies, the client's connection, the server, the LLM call, the work's lost. On the bottom, the after. Client, then API, then a queue, a little box with jobs lined up in it, then three workers, then the LLM. And the API answers the client right away, with a two oh two, which is HTTP for "accepted, I'll get to it", plus a job ID. In about fifteen milliseconds. The client checks back later for the result. And each side runs at its own pace.

B: [working it out] So the user's six seconds turned into fifteen milliseconds. But the work still takes six seconds.

A: The work still takes six seconds, it's just not on the user's clock anymore. And that one change buys you four separate things, and it's worth knowing them by name, because each one is a reason someone's going to give you in a design review. First, decoupling speed. Your API can accept, say, two thousand saves a second. Your workers can summarize twenty. Without a queue, the slow side sets the pace for the fast side. With one, the API stays fast and the backlog lives somewhere that's designed to hold it. Second, absorbing spikes. Traffic comes in bursts. An import, a cron job, Monday morning. The queue stores the burst, and the workers work it off over the next few minutes. So you size the workers for the average rate, not the peak, as long as the backlog drains before the next burst shows up.

B: Okay, so that's the import of four thousand.

A: That's the import. Third, retrying independently. If a summary fails because the LLM gave back a five oh three, the service-is-down error, the worker just retries it later. The user's request finished ages ago and never knew. And if the API deploys in the middle of the afternoon, the queued jobs don't care. They're not in the API.

B: And that's the rolling restart one.

A: Right. And fourth, fan-out. One event, "document saved", can be read by the summarizer, the ranker, the search indexer and the analytics pipeline, each on its own schedule. The producer writes it once and doesn't need to know any of them exist. You add a fifth reader next month, and you don't touch the producer at all.

B: [skeptical] That all sounds free, though. What's the catch?

A: The work's now asynchronous, in the everyday sense. The user gets "accepted" instead of the answer. So you need some way to tell them the result later. They poll a jobs endpoint with their job ID, or you call a webhook, or you push it down a websocket. And you've added a whole new system that can fail. Honestly, most of what's interesting here is about making that new system fail safely.

<!-- section: The Idea: How many workers -->

A: First, though, sizing. There's a rule from the lesson on waiting versus working called Little's Law, and it's going to do a lot of work today. The number of things in flight equals the rate they arrive times how long each one stays inside. Thirty things a second, each staying two seconds, means sixty inside at any moment. That's it. And a worker pool is the cleanest case of it you'll ever see, because each worker handles one job at a time. So "jobs in flight" just means "busy workers". So try this. Saves arrive at a steady thirty a second. Each job, summary plus ranker, keeps a worker busy for two seconds. How many workers do you need, minimum?

B: Thirty times two, sixty.

A: Sixty. And what happens if you run fifty-nine?

B: [a bit unsure] It's... a little slower? Like, everything takes slightly longer.

A: [gently] That's the intuitive answer, and it's wrong in an important way. With fifty-nine workers, each finishing a job every two seconds, the pool finishes twenty-nine and a half jobs a second. But thirty arrive. So the queue grows by half a job every second. Forever. It never levels off. After an hour that's eighteen hundred jobs waiting, and every new job waits behind all of them. It's not slightly slower. It's a line that grows without end.

B: [surprised] Huh. So one worker short is just... broken.

A: Broken, slowly. And here's the sentence to keep. A queue does not add capacity. It only moves the waiting somewhere safer. And sixty is the floor, where every worker is busy a hundred percent of the time. In practice you'd run seventy or eighty, for headroom. Because waiting time explodes as you get close to a hundred percent busy, even when the averages look like they fit. That's the p ninety-nine story, the slowest one percent of requests, from load testing. Same arithmetic sizes a batch job. Five million documents, about twenty milliseconds each. That's a hundred thousand worker-seconds of work. With sixteen workers, that's about sixty-two hundred and fifty seconds. So, an hour and three quarters.

B: And with one?

A: Twenty-eight hours. And that's all assuming nothing else is the bottleneck, which is a big if. We'll check where that stops being true when we measure.

<!-- section: The Idea: Watch it -->

A: There's a little simulation that makes all this visible, and it's worth describing, because what you see in it is the whole lesson in miniature. Jobs arrive at random, at a rate you set with a slider, and drop into a queue. Workers take them. Each job takes about half a second, so one worker does about two jobs a second. Along the top there are readouts. Arrivals, capacity, how many are in the queue, the oldest wait, done, redelivered, and lost. And underneath, a graph of the last minute of queue length. That graph is called lag, and it's the line to watch. So start at six arrivals a second and four workers. That's a capacity of eight a second. The queue stays short, the line's flat near the bottom. Then drop to three workers.

B: That's a capacity of six. Same as arrivals. So it should just about keep up.

A: You'd think. But watch the graph. It wanders up, and it doesn't reliably come back down. Because arrivals are random. Some seconds bring a lot more than six, some a lot fewer. And with zero spare capacity, the system can never catch up after a bad stretch. That's the seventy-or-eighty-instead-of-sixty point, happening in front of you. Then go back to four workers and press the Spike button. The queue jumps by sixty jobs. And then it drains, in a straight line, at capacity minus arrivals. Eight minus six.

B: [working it out] Two a second. So sixty jobs takes... thirty seconds.

A: About thirty seconds. That's a spike being absorbed. Now the fun one. Press the button that kill dash nines a worker while it's busy. Kill dash nine is the signal that ends a process instantly. It can't catch it, can't clean up, nothing. And the job it was working on doesn't vanish. It sits in a little box labelled "leased, owner dead", with a countdown. Then when the countdown hits zero, it reappears at the front of the queue, filled in dark, which marks it as a retry. Redelivered goes up by one. Lost stays at zero.

B: And the last one?

A: There's a toggle called "ack before work". Turn it on and kill a worker again. Now the job's just gone. Lost goes up.

B: [working it out] So there's something about the order the worker does things in.

A: Exactly that. Two things are hiding in those last two steps. One is the difference between "the broker handed you the job" and "the job is done". That's the next part. And the other is, in the kill, there's a stretch of three seconds where that job is neither waiting nor running. It's just sitting there. That gap is the price of surviving crashes.

<!-- section: The Idea: Acks and leases -->

A: So when a worker takes a job, the broker has a decision to make. Delete it now? Or keep it around until the worker says it's finished? That "I'm finished" message is called an ack, short for acknowledgement. It's the consumer telling the broker, "I've handled this, you can forget it." And until the broker gets one, it assumes the message might still need doing. Now, if the broker deletes on handover, a worker crash loses the job. If it keeps the job until the ack, it has a different problem. It needs to know when to give up waiting.

B: [a bit unsure] But wouldn't it just notice the worker died? Like, the connection drops or something.

A: That's the natural assumption, and you can't rely on it. A dead process doesn't announce that it's dead. From the broker's side, "still working on it" and "got kill dash nine'd ten minutes ago" look exactly the same. Silence. And a job that just takes a long time also looks like silence. So the broker gives each handed-out job a lease. Temporary ownership, with a deadline. If the holder doesn't finish, meaning ack, or renew before the deadline, the job goes to someone else. Amazon's S Q S calls the lease length the visibility timeout. Once a worker receives a message, the message becomes invisible to everyone else for, say, thirty seconds. Thirty's the default. If the worker deletes it in time, and in S Q S deleting is the ack, it's gone for good. If not, it becomes visible again, and some worker gets it. That's called redelivery. The broker hands out the same message again, because the last attempt never acked. Which means a consumer can get a message that it, or a dead colleague, has already partly processed.

B: [working it out] And that's the toggle from the simulation. Ack first, or work first.

A: That's the toggle. Picture three timelines, one above the other, same crash in each, landing at a different moment. Top row: ack before work. The worker claims the job, acks it right away, starts working, and crashes in the middle of the work. The broker already forgot it. Job lost. Middle row: ack after work, and the crash lands during the work. Claim, work, crash. No ack ever came, so the lease runs out, the job's redelivered, it runs again. Nothing lost. Bottom row is the nasty one. Ack after work, and the worker gets all the way through. It does the work, it saves the result to the database, and then it crashes, right before the ack.

B: Oh. So the result's saved, but the broker never heard.

A: The broker never heard. So the lease runs out, the job's redelivered, and it runs twice. And whatever reads that queue has to be able to cope with that. Hold that thought, it's the next big idea. But first, two practical details that fall straight out of leases. One, the lease has to outlast the job. If a job takes ninety seconds and the lease is thirty, the broker hands that same job to a second worker while the first one is still happily working on it. Then at sixty, a third. Nothing crashed. The job just runs three times. So long jobs either get a long lease, or they heartbeat. Every so often the worker says "still on it", and the broker pushes the deadline back. S Q S has a call for exactly that, for changing a message's visibility. And Celery, the big Python job library, has exactly this trap when it runs on Redis. Its visibility timeout defaults to one hour. A task that's scheduled or running for longer than that gets delivered again.

B: And the other detail?

A: The other side of the same dial. A short lease means fast recovery, a long lease means slow recovery. When a worker really does die, its job sits untouched until the lease expires. In the simulation that was three seconds. With a one-hour lease, a crash means that job's an hour late. So you pick the lease from the job length, roughly your longest normal job times some safety factor, and you heartbeat if your job lengths are all over the place. So try this one. Your ranker jobs normally take one to three seconds. But about one in a thousand is a giant document that takes fifty seconds. Your lease is thirty seconds, no heartbeat. And your workers never crash. Not once. What do you see in your results, and in your bill?

B: [working it out] Fifty's more than thirty, so... the giant ones time out? They fail?

A: [serious] Nothing fails, and that's what makes it nasty. At thirty seconds the lease expires. Another worker picks the job up, while the first one is still running it. If the second one also gets past thirty, a third one starts. So every giant document gets processed at least twice, often more. With five million documents, one in a thousand is five thousand giant ones. Each running two or three times. That's maybe ten thousand extra fifty-second jobs. A few extra worker-hours on the bill, and duplicate rows in your results if your writes aren't protected against that. And it looks exactly like a crash bug. But nothing crashed.

B: So the fix is the heartbeat.

A: Heartbeat, extend the lease every ten seconds or so while you're working. Or set a lease well above your p ninety-nine point nine job time, the slowest one in a thousand. And now we can say, step by step, exactly what happens when a worker gets kill dash nine'd halfway through a job, which is the thing to be able to say in an interview. The worker had claimed the job, so the job moved into an in-flight set with a lease deadline. The kill stops the process instantly. It can't ack, can't report a failure, can't clean up. The broker sees nothing, because silence looks the same as slow work. When the deadline passes, the job's made visible again, put back in the queue, and its attempt count goes up by one. Another worker claims it and runs it from the start. If the dead worker had already saved its result, the second run produces the same result, and a properly written save just ignores the repeat. And if the job keeps failing until it hits an attempt limit, it goes somewhere special, with its last error attached, for a human to look at. We'll get to where. The total cost of the crash is one lease length of delay for that job, plus whatever partial work got thrown away.

<!-- section: The Idea: At-most-once, at-least-once, exactly-once -->

A: Those three timelines have names, and you'll hear them in every design discussion about messaging. Ack first, then work. That's called at-most-once. Each message gets processed zero or one times. Never duplicated, but it can be lost. And that's actually fine for some things, where losing one is cheaper than doing one twice. A metrics sample. A "user is typing" ping. Then, work first, then ack. That's at-least-once. One or more times. Never lost, as long as the broker itself survives, but sometimes things happen twice. And that's the default for almost every serious queue. And then there's exactly-once.

B: Which is what everyone wants.

A: Which is what everyone wants. Each message has its effect exactly one time, even with crashes. And you can't get it as a delivery guarantee. Look at that bottom timeline again. The worker saved the result and then died before the ack reached the broker. Or, the ack was sent and the network dropped it. Either way, the broker sees silence. And silence after the save looks exactly like silence before the save. So the broker has to choose. Redeliver, and risk a duplicate. Or don't, and risk a loss. There's no third option, because the broker can't see inside the worker.

B: [skeptical] Couldn't the worker just, I don't know, confirm the ack? Ack, wait for the broker to say "got it", and then...

A: [amused] And then what, if that "got it" gets lost? You've just added one more message that can go missing. Move the ack earlier and you've only moved the gap. Add a confirmation and you've only moved the gap. It's a cousin of an old puzzle called the two generals problem. Two parties talking over a channel that can lose messages can never be sure they agree. Every extra confirmation needs its own confirmation.

B: Okay. So what do people actually do?

A: The real answer, the one the industry settled on, is at-least-once delivery, plus a consumer that makes duplicates harmless. The word for that is idempotent. An operation's idempotent if doing it twice has the same effect as doing it once. "Set this document's score to point eight three" is idempotent. Do it ten times, the score's point eight three. "Add point eight three to the total" isn't. Do it twice, you've doubled it. And you make a consumer idempotent with an idempotency key. A unique ID attached to a piece of work, so the receiver can recognize a repeat and skip it. For a job, that's the job ID, or a natural key, like the document ID together with the model version. It's the same trick as safe retries for API calls, where the client sends a key so the server can tell a retry from a new request.

B: And then the consumer checks, "have I seen this key", and skips it?

A: Close, but there's a trap in "checks and then skips". If you check, then write, then mark it done as separate steps, a crash between them gets you right back where you started. So the first technique is, write the result and the "done" mark in one transaction. A transaction being a group of database writes that all commit together or not at all. Concretely, your scores table has the document and the model as its primary key. You insert the score, and you tell the database: if a row with that key already exists, do nothing. So the second delivery's insert just quietly does nothing. And if you also bump a counter somewhere, like documents processed, you bump it only when the insert actually inserted a row, inside that same transaction. So the effect and the record of the effect can never come apart. Second technique: make the operation a set, not an add. "Document eighty-one seven twenty-three's score is point eight three" can be written any number of times. "Increment the user's processed count" can't, unless you dedupe first.

B: What about stuff outside your database, though? Like sending an email.

A: That's the third case, and it's the hard one. External side effects. Sending an email, charging a card, calling a paid API. If the other side supports an idempotency key, you pass yours along. Stripe, for example, takes an idempotency key header on its requests. If it doesn't, you record "sent" before you'd risk sending twice, and you accept that a crash in between might mean zero sends. Somewhere, someone picks at-most-once or at-least-once. You just get to choose where.

B: [skeptical] But Kafka advertises exactly-once. I've definitely seen that.

A: It does, since twenty seventeen, and it means something real but narrower. A producer's retries don't create duplicates in the log. And a job that reads from Kafka and writes back to Kafka can commit its output and its read position together, atomically, as one step. That's useful. But the moment your consumer touches anything outside Kafka, a database, a model API, an email, you're back to at-least-once plus idempotency. People call that combination effectively-once. Which is honestly the more truthful name for what everyone means by exactly-once.

<!-- section: The Idea: Poison messages and the dead-letter queue -->

A: Now remember the document with the malformed byte that crashes the tokenizer. Under at-least-once, it's actually worse than you'd think. A worker claims it, crashes. The lease expires. Another worker claims it, crashes. Lease expires...

B: [working it out] Oh no. It just keeps going around. Killing workers one at a time.

A: One at a time, forever. That's called a poison message. A message that fails every single time it's processed, usually because of bad data or a bug, not some temporary outage. And retrying it forever wastes workers and can clog up the queue. The fix is to count attempts. Every claim bumps the job's attempt counter. When it fails, or its lease expires, and the count has hit a limit, say three or five, the broker moves it aside into a separate queue instead of back into the main one. That's the dead-letter queue, often just D L Q. Nobody processes it automatically. A human looks at it, fixes the bug or the data, and re-queues the messages. That's the somewhere special from the kill story. S Q S calls this a redrive policy, with a maximum receive count. Rabbit M Q calls it a dead-letter exchange. Celery leaves it to you. And three rules turn a D L Q into something useful instead of a graveyard. One, store why it died. The last exception and its traceback, the attempt count, which worker saw it. Otherwise you're debugging blind. Two, alert on it. A dead-letter queue that grows silently is the same as dropping messages on the floor. Three, have a re-drive tool. After you fix the bug, you want one command that moves everything from the D L Q back to the main queue. And because your consumer is idempotent, re-driving something that half-succeeded the first time is safe.

B: Do you have to wait for three failures every time, though? Some errors you just know are permanent.

A: Yeah, and you should split them. Retryable failures versus permanent ones. A five oh three from the LLM provider is temporary, so you retry it with backoff, meaning you wait longer after each failure, and with jitter, meaning you add a bit of randomness to the wait so all your retries don't land at the same instant. That's straight from the rate limits lesson. But a Unicode decode error, where the bytes just aren't valid text, is going to fail identically on every attempt. That one can go straight to the D L Q.

<!-- section: The Idea: Job queues and logs -->

A: Okay. Everything so far describes one kind of machine, called a job queue. Each message is a unit of work, it goes to exactly one worker, and it's deleted once that worker acks it. Celery, R Q, which is short for Redis Queue, and Sidekiq are libraries built on top of brokers like Redis or Rabbit M Q. S Q S is Amazon's hosted version. And under the hood in Redis, a queue is often literally just a list. Producers push onto one end, workers pop off the other.

B: [a bit unsure] And Kafka's just a bigger, faster one of those?

A: No, Kafka is a different machine. And the difference matters a lot. Kafka is a log. An append-only, ordered sequence of records. New records only go on the end, nothing's ever changed in place. And messages aren't deleted when they're read. They're appended to the end of a file and kept for a fixed time, the default is seven days, or up to a size limit, whether anyone's read them or not.

B: So nobody deletes anything? Then how does a reader know what it's done?

A: Each record gets a number, its offset. Its position in the log. Zero, one, two, three. And a consumer doesn't ack individual messages. It just remembers how far it's read, and every so often it saves its current offset. That save is called a commit. So picture two drawings side by side. On the left, the job queue. A row of jobs, two workers pulling from it, and the label says "read plus ack equals gone". Each job goes to one worker. No replay, no history. On the right, the log. A long row of records, numbered from zero, with new ones landing on the right end. And two arrows pointing at different spots. Group B is at record three. Group A is at record seven. Both groups see every record. And rewinding is just setting your offset back to zero.

B: So the log doesn't care who's read what. Each reader keeps its own bookmark.

A: That's it exactly. And that design gives a log three powers a job queue doesn't have. One, many independent readers. The summarizer, the search indexer, the analytics loader, each keeps its own position in the same log. A slow reader doesn't slow the others. And a brand new reader can start from the beginning. Two, replay. Say you find a bug in the summarizer that's been running for two days. You fix it, you reset its offset to two days ago, and it reprocesses everything. With a job queue, those messages were gone the moment they were acked. Three, history as data. The log is a record of what happened, in order. And that's Kreps' whole point. You can rebuild a search index, or a cache, or an entire database table, just by reading the log from the start.

B: [skeptical] Then why would anyone still use a job queue?

A: Because it has its own advantages. Per-message acks. Per-message retries and dead-letter queues. No offsets to think about. And you scale it by just adding workers. So the rule of thumb is, if each message is a task, something to get done once, use a job queue. If each message is an event, a fact about something that happened, that several systems care about, use a log.

B: So "summarize document eighty-one seven twenty-three" is a task, and "document eighty-one seven twenty-three was saved" is an event.

A: That's a really good way to put it. Same document, two different messages.

<!-- section: The Idea: Partitions, consumer groups, ordering -->

A: Now, one log on one disk can only go so fast. So Kafka splits things up. A topic is a named stream of records, like "documents saved". And a topic is physically split into partitions. Each partition is its own little independent, ordered log, and the partitions are spread across different machines. When a producer writes a record, it picks a partition, usually by hashing the record's key. Hashing meaning turning the key into a number in a repeatable way. Same key, same partition, every single time. And on the reading side, consumers join a consumer group. That's a set of consumers sharing the work of reading a topic. Kafka gives each partition to exactly one consumer in the group. So each record gets processed once per group. That's how a log does load balancing. Not message by message, like a job queue. Partition by partition.

B: [working it out] So for that group, a partition is kind of like one consumer's private queue.

A: Sort of, for that group, yeah. Picture it. On the left, a producer, hashing each key into one of three partitions. In the middle, three rows. P zero, P one, P two. And in P one, you can see document seventeen's events, several of them, landing there in order, mixed in with a few other documents. On the right, a group called rankers, with four consumers. C one reads P zero. C two reads P one. C three reads P two. And C four is drawn dashed. It's idle. Nothing to read.

B: [a bit unsure] Okay, but the whole thing's still in order, right? It's a log. Kafka keeps everything in order.

A: Only inside one partition. That's the first consequence, and it's the one people get wrong. Within P one, document seventeen's events are in the order they were written. Across partitions, there's no order at all. C one might process an event from P zero that was written an hour after some event C two hasn't even reached yet in P one. So if order matters for some thing, the edits of one document, the events of one user, you make that thing the key. Then all its records share a partition. Global ordering, everything in one order, would mean one partition. Which means one consumer.

B: And that's where C four comes from.

A: That's the second consequence. Parallelism is capped by the number of partitions. Three partitions, at most three busy consumers per group. The fourth one just sits there as a hot spare. So you pick the partition count for the parallelism you'll need later.

B: Can't you just add partitions later, when you need them?

A: You can, but it bites. Adding partitions changes which partition each key hashes to. So document seventeen's old events are in P one, and its new events land somewhere else, and per-key ordering breaks across that change. And the third consequence is the deepest practical difference between the two machines. One slow message blocks its whole partition. A consumer reads its partition in order. If one record takes a minute, everything behind it in that partition waits. Even if the other consumers are sitting idle. A job queue doesn't have that problem. Any free worker takes the next job. And that's why using Kafka as a job queue for slow, uneven jobs, like your fifty-second giant documents, often hurts. Kafka four is adding something called share groups, which is queue-style consumption on top of a topic, for exactly that reason. Check the docs for how far along that is.

B: And all the at-least-once stuff, does that still apply with offsets?

A: Same story, just told with offsets. If you commit your offset before you process, a crash skips records. You come back up past them. That's at-most-once. If you commit after, a crash replays from your last commit. At-least-once, possibly a few hundred duplicates. And the client's default is to auto-commit every five seconds in the background, which can do either one, depending on timing. Which is why serious consumers turn that off and commit after they've processed.

<!-- section: The Idea: Consumer lag -->

A: So how do you know whether a queue is healthy? Not by its size alone. A big backlog that's shrinking is fine. What you watch is consumer lag. How far behind the consumers are. In Kafka, for each partition, it's the newest offset minus the group's committed offset. How many records have been written but not yet processed. In a job queue, it's the queue depth, how many are waiting. Or, even better, the age of the oldest message.

B: [skeptical] Why is the age better? Depth seems like the obvious number.

A: Depth tells you how much. Age tells you how late. Ten thousand tiny jobs might be five seconds of work. A hundred huge ones might be an hour. S Q S publishes this one directly, an approximate age of the oldest message. And lag has three shapes, and you saw all three in the simulation. Flat near zero, you're keeping up. A spike, then decay, that's a burst being absorbed, draining at capacity minus arrival rate. And a steady ramp. Arrivals exceed capacity, and it's never going to recover on its own. And the slope of that ramp is literally your shortfall. If lag grows by six hundred jobs a minute...

B: [working it out] That's ten a second. So I'm ten jobs a second short.

A: Ten a second short. And Little's Law tells you what to add. Ten times however long a job takes, in more workers. Two-second jobs, twenty more workers. And then there's draining. Once you've added enough capacity, how long does the backlog take to clear? It's the backlog divided by your spare capacity, meaning capacity minus arrivals. And notice what that does. Say you've got a backlog of a hundred thousand jobs. You scale up to a hundred and ten a second, and they're arriving at a hundred a second.

B: So I'm over capacity. It's fixed.

A: [jumping in] You're over capacity. But your spare capacity is ten a second. A hundred thousand divided by ten is ten thousand seconds. That's almost three hours.

B: [surprised] Three hours, while I'm technically winning.

A: Three hours. Headroom is what clears backlogs. And this connects to something from the rate limits lesson. There, the point was that an unbounded buffer hides overload. The producer never feels any pressure, so it never slows down. Well, a queue is a very large buffer. On purpose. It's your choice to absorb rather than push back. Which is great for spikes, and terrible for sustained overload. So you bound it. A maximum length, or you reject new jobs when the oldest one is already older than your deadline. And you alert on lag. Otherwise the queue fills up the disk or the memory, and the failure is a lot bigger than a four twenty-nine would've been.

<!-- section: The Idea: The outbox pattern -->

A: One more trap, and it shows up pretty much the first day you wire a queue into a real app. Your save handler does two things. It inserts the document row into Postgres and commits. And then it puts a "summarize this" job on the queue. Two steps. What if the process dies between them?

B: [working it out] The document exists, and there's no job for it. Nobody ever summarizes it.

A: Right. And swap the order, job first, then the database, and you get the opposite. A job for a document that got rolled back. Doesn't exist. And you can't wrap both in one transaction, because the database and the broker are two separate systems. That's called a dual write. Writing the same change to two systems as two separate steps. A crash between them leaves them disagreeing, and neither one knows. And the fix is called the outbox pattern. You add a table to your database, called the outbox. And you write the message into it, in the same database transaction as the document. So now either both exist or neither does. Then a separate little process, the relay, reads outbox rows that haven't been sent yet, publishes them to the queue, and marks them sent.

B: [working it out] Wait, but the relay has the same problem. If it publishes, and then dies before marking it sent...

A: It publishes it again when it comes back up. Yep. At-least-once, again. So the consumer still needs to be idempotent. You can't escape that, but now nothing gets lost. Picture it as one big box labelled "one database transaction", with two rows inside. Documents, doc eighty-one seven twenty-three. Outbox, summarize eighty-one seven twenty-three. And the note says both rows or neither. Then an arrow out to the relay, and from the relay to the queue. The relay can just poll the table every few hundred milliseconds. Or it can read the database's own internal change log. That's called change data capture, C D C. Postgres keeps one called the write-ahead log, MySQL's is called the binlog, and C D C means reading that log and streaming every committed change out to other systems. Debezium is the common tool for it. And notice, that's Kreps' argument made literal. The database already has a log. You're just letting other systems read it.

<!-- section: The Idea: Which one do I reach for -->

B: So with all these options, how would I actually pick one?

A: There's a fairly short answer. Background jobs in a Python app, Celery or R Q, on Redis. Simple, with per-job retries. And with Celery, turn on the setting called acks late. Without it, a worker crash loses the task, because it acks before the work. If you're on AWS and don't want to run any servers, S Q S, with a dead-letter queue set up through a redrive policy. Visibility timeouts and dead-letter queues come built in. And its standard queues are at-least-once, with only best-effort ordering. If you already have Postgres, you can just use a jobs table. Workers grab a job with a query that locks the row it picks, and skips rows other workers have already locked. The S Q L for that ends in "for update skip locked". And the nice part is, your jobs commit in the same transaction as your data, so you don't need an outbox at all. That's fine up to thousands of jobs a second. Events that many systems read, where you want replay and history, that's Kafka, or Redpanda, which speaks Kafka's protocol. And somewhere in between, if you're already on Redis, there's Redis Streams. A log with consumer groups, plus a list of pending messages per consumer, so you can reclaim stuck ones.

<!-- section: The Idea: Batch inference is a queue workload -->

A: Okay, back to the five million documents. Because a batch job is a queue workload. It's a queue with one giant spike right at the start. All the arrivals happen at once, and lag is just "how much is left". And if you treat it that way, the crashed-at-three-point-two-million problem goes away. A few things change. First, each job is a chunk, not a document. The message says something like, shard four twelve, documents four hundred twelve thousand up to four hundred thirteen thousand. Not the documents themselves. One message per document means five million round trips to the broker. One per thousand documents means five thousand. And the worker gets to run the ranker on full GPU batches.

B: Why not make the chunks huge, then?

A: Because it's a trade. Bigger chunks are more efficient, but when a worker dies in the middle of one, more work gets redone. Second, results are keyed, so redelivery is free. You write scores with the document ID and model version as the key, and do-nothing-on-conflict, or just overwrite, because the score's the same either way. So re-running a chunk is harmless. You never need to know exactly which ones finished. You just re-enqueue anything that isn't in the results table yet. Third, poison data goes to the dead-letter queue, not into a crash loop. The malformed document fails its chunk three times and gets parked, with its traceback, while the other four thousand nine hundred ninety-nine chunks keep moving. And even better, you catch per-document errors inside the chunk and record them, so one bad document doesn't send nine hundred ninety-nine good ones to the D L Q with it. And fourth, Little's Law sizes it, and lag tracks it. Number of workers times throughput per worker tells you the finish time before you even start. And lag over time tells you whether you're on schedule. Its slope tells you when you'll finish.

B: [amused] That's basically every batch API I've used.

A: It really is. That's what the batch APIs from model providers are under the hood. A durable queue of your requests, worked off whenever they have spare capacity. Which is why they're cheaper.

<!-- section: Build It: Setup and moving the work out -->

A: Okay, so then you build it. Everything goes in one folder. You install Redis, either with Homebrew or as a Docker container, and you check it's alive. You ping it and it answers PONG. Redis here is just a fast shared server for data structures, lists, sets, that kind of thing. You don't need to know it beyond a handful of commands. Then a virtual environment with the Redis client, FastAPI, uvicorn and HTTPX. Then the stand-in for the ranker. It's a function that hashes a string over and over, about twenty milliseconds of pure CPU per document, so it behaves like a CPU-bound model call. It holds a core the whole time. You tune the number of loops until one call takes fifteen to twenty-five milliseconds on your machine. And it has one trap built in. If the document contains the word POISON, it raises an error, like the tokenizer choking on that malformed byte. And then a small SQLite database for results. Two scores tables, on purpose. One you'll write idempotently, with the job ID as its primary key. The other, the naive one, with a plain insert, so you can see the difference. And a one-row counter. The first real task is to feel the slow request. A FastAPI app with a save endpoint that runs the fake ranker ten times right in the handler, so about two hundred milliseconds, pretend it's summary plus ranker. One worker process. And you hit it with fifty concurrent requests, using the load generator from the waiting versus working lesson, and write down p fifty and p ninety-nine. With one process doing CPU work, request fifty waits for the forty-nine in front of it. Then the after version. Same route, but now the handler only writes a job and answers two oh two with the job ID. And the job ID is built from the document ID, a natural key, so re-saving the same document is a no-op job. Plus a status endpoint. Give it a job ID and it says done, with the score, or pending, or dead. Then the same fifty requests. The p ninety-nine for accepting should drop from seconds to a few milliseconds.

<!-- section: Build It: The queue -->

A: Then the core of it. You write the queue yourself, on Redis. The data lives in four places. A pending list of job IDs waiting to be claimed. An in-flight set. A dead-letter list. And for each job, a little record holding its payload, its attempt count, and its last error. The in-flight one is a sorted set. That's a set where every member carries a number, called its score, and Redis keeps them ordered by it. Here the score is the lease deadline, as a timestamp. So "which leases have expired?" becomes one query: give me everything with a score up to now.

B: Nice. So the expired ones are just the front of the sorted set.

A: Yeah, right at the front. And the hard part is claim. Claiming means popping a job off the pending list, and recording its lease in the in-flight set.

B: [a bit unsure] And why's that hard? It's two calls.

A: That's exactly the problem. If they're two separate commands and the worker dies between them, the job's in neither place. Not pending, not in flight. Nobody will ever look for it. It's lost. So it has to be one atomic step, all or nothing. And Redis gives you that with a script. It runs a little Lua script atomically, nothing else runs on the server in the middle of it. So claim is a tiny script, and you're given it, because Lua syntax isn't the point. It pops a job, adds it to in-flight with its deadline, bumps the attempt count, and hands back the ID, the payload and the attempt number. The rest is yours to write. Enqueue writes the job's record with zero attempts, then pushes the ID onto pending. And there's a question in there for you. What if that job already exists, because someone saved the same document twice? Ack removes the job from in-flight and deletes its record. And another question. What if the lease already expired and somebody else holds the job now? The hint is that removing something from a sorted set tells you whether it was actually there. Extend is the heartbeat. Push the deadline back, but only if the job's still in flight. Fail records the last error and makes the lease expire right now, so the reaper picks it up. And reap is the one that goes through every expired lease. If the job's hit the attempt limit, it goes to the dead-letter list. Otherwise, back to pending. And reap has to be atomic too, because two workers reaping the same expired job must not requeue it twice. So that's a second Lua script, and that one you write.

B: Does it matter where in pending the retries go?

A: It does, and that's one of the hints. Put requeued jobs on the end that claim reads from next. So a retry runs right away, instead of waiting behind the whole backlog. Which is what you saw in the simulation, the dark job reappearing at the front. And one other hint: never use the Redis command that lists every key. It scans the whole database.

<!-- section: Build It: The worker and the chaos test -->

A: Then the worker. It's a loop. Reap, claim with a two-second lease, score the document, write the result, ack. And there's a switch, an environment variable called IDEM. When it's on, the write is one transaction. Insert into the scores table, ignoring it if the job's already there, and bump the counter only if a row actually got inserted. When it's off, it's a plain insert into the naive table, and the counter always goes up. If scoring throws, you catch it and call fail with the traceback. And the rule: you ack only after the write has committed. Then there's another environment variable, ACK DELAY. A little sleep between the write and the ack. It's zero normally, and you'll widen it later to make that bottom timeline, saved but not acked, easy to hit. When there's nothing to claim, sleep fifty milliseconds so idle workers don't spin the CPU. And two SQLite details: a mode called write-ahead logging so lots of worker processes can write safely, and starting each transaction in immediate mode, which takes the write lock up front, so two workers don't deadlock each trying to upgrade a read lock.

B: And the killing part, I do that by hand?

A: No, that's scripted. Three small scripts you're just given. A producer that clears everything out and enqueues N documents, where every thousandth one is poison. So in two thousand documents, two are poison. A chaos script. It starts some number of worker processes, and every three tenths of a second it picks one at random and kill dash nines it, then starts a fresh one in its place, like a supervisor would. It keeps going until nothing is pending or in flight, then prints how long it took, how many kills, and how many jobs are in the dead-letter queue. And a checker that prints the row count in the idempotent table, the row count in the naive table, how many distinct jobs are in the naive table, and the counter. You run: set up the database, produce two thousand, chaos with eight workers, check.

B: And what should I see?

A: You're done when, with eight workers and a kill every three tenths of a second, a two-thousand-document run ends with nineteen hundred ninety-eight rows in the scores table, the counter at nineteen hundred ninety-eight, and the two poison documents sitting in the dead-letter queue with their tracebacks. Then a small dead-letter tool. One command lists each dead job's ID, its attempts, and the last line of its error. The other, redrive, resets attempts to zero and moves everything back to pending. You fix the bug, make the scorer strip the word POISON instead of raising, re-drive, and check that every one of the two thousand documents now has exactly one score. And then you ask an agent to review your reap and redrive for races. Like, what happens if a worker is reaping at the same moment you re-drive?

<!-- section: Build It: Optional real log -->

A: And there's an optional last task, with a real log. If you have Docker, you run Redpanda. It's Kafka-compatible and ships as a single binary. You make a topic called docs saved with three partitions. Then you write a producer that sends ten thousand records keyed by document ID, and a consumer in a group called rankers, with auto-commit turned off, that scores each record and commits after processing. Then three experiments. Run two consumers in the same group plus one in a different group, and ask Redpanda which partitions each one owns. The two split the partitions, and the one in the other group sees every record. Then run four consumers in one group on the three-partition topic. One of them owns nothing. That's the idle C four, for real. Then stop everything, reset the group to the beginning, and run again. Every record gets reprocessed. And because your writes are keyed, the results table doesn't change at all. That's replay. An agent can explain client errors and config options, but the consumer loop is yours.

<!-- section: Measure -->

A: So, measuring. First, nothing lost, nothing doubled. You run the chaos test four ways. Idempotent on or off, and ack delay zero or ten milliseconds. The ten milliseconds widens the gap between "saved" and "acked" from microseconds to ten milliseconds, so the kills actually land in it often enough to count. What you should see: nothing lost in any of the four. Nineteen ninety-eight distinct jobs scored, two in the dead-letter queue. Because a job only leaves Redis on ack, and the ack comes after the commit. With idempotent on, rows and counter are exactly nineteen ninety-eight, every time. With it off, rows exceed distinct jobs by roughly the number of kills that landed between the commit and the ack.

B: Is there a real number for that?

A: There is, from a version of this harness on an M four Pro. One caveat, it used a Python stand-in for Redis, not real Redis. Idempotent off, ten millisecond ack delay. Twenty-three kills, and two thousand and nine rows for nineteen ninety-eight distinct documents. So eleven duplicates, and the counter said two thousand and nine. Idempotent on, same settings, twenty-four kills, and exactly nineteen ninety-eight. And every one of those eleven extra rows is that bottom timeline. Saved, killed in the ten-millisecond gap, never acked, run again.

B: And with the delay at zero, I'd see, what, nothing? So the plain version's basically fine.

A: [serious] That's the trap. With no delay, the window is tiny, and you may well see zero duplicates. And that's the dangerous case. The bug's still there. It's just rare enough to make it to production. Then the second measurement, throughput against worker count. No chaos, two thousand documents, and you go one worker, two, four, eight, twelve, sixteen, twenty-four, and work out documents per second, and per worker. So, guess. Each job's about twenty milliseconds of one core. Where does throughput stop going up?

B: [working it out] Twenty milliseconds is fifty a second per worker. So it goes up by fifty per worker until... I run out of cores? I'd say it flattens somewhere around the core count.

A: That's the right instinct. And you can ask your Mac how many cores it has, of each kind, because Apple chips have fast performance cores and slower efficiency cores. On an M four Pro that's ten performance and four efficiency. So you'd expect close to a straight line up to about ten workers, a smaller gain from the efficiency cores, and then flat. Twenty-four workers is twenty-four processes taking turns on fourteen cores. So per-worker throughput falls, and the total stays put, or even dips a little, from the cost of switching between processes and stepping on each other's caches. And this is why each worker is a separate process in the first place. Python's GIL, the lock that lets only one thread run Python code at a time, means threads couldn't spread CPU-bound scoring over every core. Processes can.

B: What if it flattens way earlier than that?

A: Then something else is the bottleneck, and that's the useful part. It could be the broker, because each job costs several Redis round trips, around a tenth to a fifth of a millisecond each on your own machine. It could be SQLite, which only lets one writer at a time. Or it could be your measurement. The chaos script only checks every three tenths of a second, so short runs get rounded up. The general lesson is, throughput rises with workers until it hits the first shared resource, and the knee tells you which one. In that run with the slow Python stand-in, throughput flattened at around eight workers, because the stand-in was what saturated, not the cores. Real Redis does over a hundred thousand simple commands a second on one core, so it shouldn't be your knee at this scale. But check. And then you use your number. If one machine tops out at some number of documents per second, five million documents takes five million divided by that. And in reverse, if you've got a deadline, the throughput you need is five million divided by the seconds you have. Divide that by what one worker does, and spread them over enough machines that each one stays below its knee. On the Spark, the ranker would run on the GPU in batches, so the knee will be GPU throughput, not CPU cores. And chunk size becomes the dial.

B: Okay, let me try a big one. Fifty million documents, new ranker, and it has to be done by tomorrow morning. Twelve hours.

A: Go for it.

B: [working it out] Twelve hours is... forty-three thousand two hundred seconds. Fifty million divided by that is, call it, eleven or twelve hundred a second.

A: About eleven sixty a second. Then you measure one worker's real throughput on the actual hardware. Say it's four hundred documents a second per GPU, with batching. So you need about three GPUs' worth, and I'd plan for four or five, for headroom, because of retries and stragglers. Little's Law tells you how many chunks to have going at once: throughput times how long each chunk takes. You enqueue chunks of a few thousand documents, not single ones, to keep broker traffic small and the batches full. Results keyed by document ID and model version, ignore on conflict, so a redelivered chunk is harmless and a restart only enqueues chunks with missing results. A lease longer than the slowest chunk, or a heartbeat. An attempt limit and a dead-letter queue. Catch per-document errors. And watch lag, chunks remaining, over time. Its slope gives you the finish time. If it's too shallow, add workers, until you hit the next shared limit. The database's write rate, the storage you're reading documents from, or the network. And past that, you shard the results store, or write results to files per chunk instead of one database.

B: That's a lot less scary than "write a loop".

A: [laughs] It's a lot less scary than a loop that dies at three point two million. And the last measurement is lag under a spike. Eight workers, no chaos, and a producer enqueuing a steady two hundred documents a second. Then you dump five thousand extra on it at once. And you sample the pending list's length every second and plot it. It should look like the spike in the simulation. A jump, then a straight-line decline, with a slope of your capacity minus two hundred. You measure that slope and check it against your throughput table.

<!-- section: Break It -->

A: And then you break it on purpose. Four ways. First, a lease shorter than the job. Set the lease to one hundredth of a second, with twenty-millisecond jobs, and no kills at all.

B: So every lease expires halfway through the work.

A: Every single one. The reaper hands each job to someone else while the first worker's still on it, and the naive table fills with duplicates while every worker is perfectly healthy. Then you add a heartbeat, a little thread in the worker that extends the lease every half-lease, and watch it stop. This is the most common queue bug in production. And it shows up as "random duplicates under load", because jobs slow down under load, and suddenly they're longer than the lease. Second, no attempt limit. Set the max attempts to some huge number. The poison jobs bounce between pending and in flight forever, eating a worker every time.

B: But it's two jobs out of two thousand. How bad can that be?

A: With fast failures, not too bad. But say the tokenizer hangs for ten seconds before it crashes. One poison message in every thousand, each one tying up a worker for ten seconds, over and over, never leaving. A growing fraction of your pool ends up doing nothing but failing. Then you put the limit back. Third, ack before work. Move the ack in front of the write and rerun the chaos test.

B: [quietly] And now things just go missing.

A: Now you're short. Fewer than nineteen ninety-eight rows, nothing in the dead-letter queue for the missing ones, and no error anywhere. Silent loss is worse than duplicates, because nothing ever tells you. And fourth, a producer faster than the consumers, with no bound. Two workers, and a producer at five hundred documents a second, for a few minutes.

B: [working it out] Two workers at fifty a second is a hundred a second. So it's falling behind by four hundred every second.

A: And it never stops. You watch Redis's memory climb and the oldest job's age grow without limit. Then you add a guard to enqueue. If the pending list is longer than some limit, refuse, and have the API return a five oh three with a header telling the client when to retry. That's backpressure, from the rate limits lesson, applied right at the door of the queue.

<!-- section: Connections and close -->

A: If you read one thing after this, make it Kreps' essay on the log. It's long and clear, and it changes how you see databases. And the stream processing chapter in Martin Kleppmann's Designing Data-Intensive Applications is the best single explanation of brokers versus logs. And this all comes back later, at training-data scale in data pipelines, with batching once a worker has a chunk on a GPU, and with lag and oldest-message age turning into actual dashboards and alerts.

B: [working it out] Okay, let me try to say the whole thing. You put a queue between two services so they stop being welded together. The fast side stays fast, spikes get stored, and failed work gets retried without anyone waiting. And to make it safe, the worker acks after the work, so a crash just means the job comes back. And then... Kafka's the same idea, just bigger.

A: [gently] Mostly. Two corrections. Acking after the work means a crash makes the job come back, yes, but it also means a job can run twice, so the real safety is the idempotent write, not the ack. The ack only decides whether you get duplicates or losses, and you pick duplicates because you can make them harmless. And Kafka isn't a bigger queue. It's a different machine. A job queue hands each task to one worker and forgets it. A log keeps every event, in order within a partition, and every reader keeps its own bookmark, so it can fall behind, or rewind, without anyone else noticing. And neither one adds capacity. It just moves the waiting somewhere safer.
