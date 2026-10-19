<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you're building training data for the cross-encoder. Twenty thousand query and document pairs, and you want Claude to judge how relevant each one is. And you've learned async, so it's one line. Fire them all off together, gather the results.

B: That's what I'd do, yeah.

A: And within a second the console fills up with "too many requests". The SDK quietly retries a couple of times, then gives up and throws an error. So you wrap it, sleep a second, try again. Now it doesn't crash. But it comes in waves. A second of furious activity, a second of silence, a wall of errors, silence, a wall. Twenty minutes later it's maybe a third done. And as far as you can tell, you're well under your per-minute limit.

B: [laughs] That feels very familiar.

A: Now flip it around. You're the one being called. Your reranking service at work is humming along, and someone starts a backfill job that sends it twice as much traffic as it can handle.

B: So it gets slower. Everything takes twice as long, maybe.

A: That's what you'd expect. What actually happens is the slow end hits the client timeout, then the typical request does, and then the dashboard shows the service at full CPU, doing a huge amount of work, while zero requests succeed. The backfill job and every real user time out together. And when the backfill stops, the service stays broken for a while longer.

B: [skeptical] Wait, honestly, my picture was that a server under too much load just crashes. It falls over and restarts or something.

A: That's the picture most people have, and it's actually more comforting than the truth. It mostly doesn't crash. It does something worse. It keeps running, and stops being useful. And both of these scenes are the same problem from two ends. A system with no way to say "slow down" doesn't slow down. It falls over, and takes everyone with it.

<!-- section: Nineteen eighty-six -->

A: [warm] The first time the whole internet learned this was in October nineteen eighty-six. There's a network link between Lawrence Berkeley Lab and UC Berkeley, a few hundred yards apart. And one day its speed drops to almost nothing. Way under one percent of normal.

B: Cable broke?

A: Nothing broke. Every computer on the network was doing exactly what it was told. If a packet wasn't acknowledged in time, send it again. But packets weren't being acknowledged because the routers' queues were full. And resending them filled the queues even more. So the network was running flat out, carrying almost nothing but copies of packets that everyone had already given up on.

B: Oh, that's grim.

A: John Nagle had predicted it a couple of years before, and given it a name. Congestion collapse. And Van Jacobson and Michael Karels fixed it by teaching TCP to treat a lost packet as a signal to send less. Start slow, grow carefully, and back off when things get lost. And honestly everything we're about to talk about is that same lesson, rediscovered higher up. When you're overloaded, the most important thing is to stop making it worse.

<!-- section: What overload actually does -->

A: So let's watch it happen. Picture a fake LLM server with a GPU that can work on a handful of requests at once, and each one takes a tenth of a second. So there's a fixed number of requests per second it can finish. That's its capacity.

B: Okay.

A: Now send it one and a half times that, steadily. Every second, more arrive than finish. The extra ones have to wait somewhere. In an async server, that somewhere is just a line of requests waiting their turn, with no limit on how long it gets. And the line grows every second.

B: And so the wait grows every second too.

A: Right, and this is the part that surprises people. It's not "twice as slow". There's no new steady state where it settles down. If more comes in than goes out, the line just keeps growing, for as long as the overload lasts. And the wait grows with it.

B: Okay, but then the clients give up, right? They have timeouts.

A: They do. And that's what turns slow into broken. Once the wait passes the client's timeout, every client gives up before its turn comes. But the server doesn't know that. The request is still sitting in the line. When it gets to the front, the server does the full piece of GPU work, and sends the answer to a connection that's already closed.

B: [slowly] So it's doing all the work, for nobody.

A: All the work, for nobody. There are two words for this that sound the same and aren't. Throughput is how much work the server finishes per second. That's still maxed out. Goodput is how much useful work it finishes. Answers that reached someone who was still waiting. And that drops to zero.

B: Huh. And the CPU graph looks perfectly healthy.

A: Looks great. Fully busy. When I ran this on my laptop, the part that got me was after the flood stopped. Every client had already gone home, and the server just kept going, for a good long while, chewing through a backlog of requests that nobody was waiting for. That's the "stays broken after the backfill stops" from the start. It's not haunted. It's finishing dead work.

<!-- section: Say no early -->

A: So the first fix feels backwards. Before putting a request in the line, the server checks how long the line is. If it's already full, it answers immediately: sorry, too busy. And does nothing else. That's called load shedding. And the line with a maximum length is a bounded queue.

B: [skeptical] It feels wrong, though. Turning people away while you're trying to serve them.

A: It does feel wrong. But under overload, the choice is never "serve everyone" or "serve some". It's "serve some, quickly, and tell the rest right away", or "serve nobody, slowly". And saying no costs almost nothing. No GPU, no wait. So the server spends all of its real capacity on requests that'll actually finish in time. When I flooded the shedding version, it didn't matter how hard I pushed. The useful output just sat at capacity. Which is the best any server can do.

B: And a fast no is better for the client too, I guess.

A: A fast no is a gift. The client can try again later, try another copy, or show the user an error right away instead of a spinner for half a minute. And there's a subtle bit about the length of that line. You size it in time, not in number of requests. A line is only useful if the stuff in it can still finish before its clients give up. A huge "bounded" queue that holds a minute of work is just the original problem with a number on it.

B: Right. Bounded, but bounded way too big.

A: And one more good habit. When a request finally reaches the front, check how long it's been waiting. If its client has surely given up already, drop it without doing the work.

<!-- section: Backpressure -->

A: Now, sometimes you'd rather say "wait" than "no". Your batch job doesn't want its requests thrown away. It wants to send them as fast as the server can take them, and no faster. Making the sender slow down to match the receiver is called backpressure. The pressure pushes back up the pipe.

B: That's the semaphore thing, isn't it? Only letting so many tasks run at once.

A: That's exactly one form of it. Your semaphore was backpressure inside one program. The next task waits to start instead of piling onto the server. And TCP does it automatically. A receiver tells the sender how much room it has left, and when it stops reading, the sender eventually just can't send. And the general rule is: every queue in a pipeline should have a limit, and a full queue should push back on whoever feeds it. Then a slow GPU at the bottom makes each stage above it fill up and push back, one after another, all the way to the source. Nothing grows forever anywhere. And the thing that breaks it is a single unlimited buffer somewhere in the chain. It quietly absorbs the pressure, so the signal never gets through.

<!-- section: Who gets the capacity -->

B: Okay, but shedding doesn't care who the traffic's from. If the backfill job is most of the traffic, it gets most of the successes.

A: Right. And that's what rate limiting is for. Not protecting the server from total load, but deciding who gets the capacity. You count per client, by API key or user, and hold each one to its allowance. The one worth knowing is the token bucket. Picture a bucket that holds a limited number of tokens, and tokens drip in at a steady rate. Every request takes a token. No token, no entry. And the two knobs mean two different things. The drip rate is the long-run average you're allowed. The size of the bucket is how big a burst you can send after being quiet for a while.

B: So if I've been idle, I can fire off a bucket's worth all at once, and then I'm down to the drip.

A: Exactly. And here's the part that matters for your script. A token bucket doesn't care about your average. It cares about your burst.

<!-- section: Retries are load -->

A: Okay, now the other side. You're the client, and you got told no. Should you retry?

B: Usually, yeah. Most of these failures are temporary.

A: Usually yes. But retries are load. Say a service is struggling, and every client retries a few times. Now the server's getting several times its original traffic, from the same users, at exactly the moment it can least handle it. And it stacks. If your batch job retries, and the gateway it talks to retries each of those, and the service under that retries again, one request at the top turns into dozens at the bottom. That's a retry storm. And it's the most common way a small blip turns into a long outage.

B: So you wait longer between tries.

A: You wait longer after each failure. Double it each time, up to a cap. That's exponential backoff. The harder the server is struggling, the more patient everyone gets. But backoff alone has a nasty trap. Say four hundred clients all fail at the same moment, because a server restarted. With plain backoff they all wait exactly the same amount, and retry together. The server takes a few, rejects the rest, and they all wait exactly twice as long and come back together again.

B: [working it out] Oh, so they stay in lockstep. Forever.

A: Forever. And the fix is just randomness. Instead of waiting exactly the backoff, each client waits a random amount up to it. That's called jitter. When I tested it, four hundred clients hitting the same server took nearly a minute to all get through without jitter, with the server sitting idle between waves. With jitter, it took only a little longer than the ideal. Same backoff, same server. Just randomness.

B: That's a huge difference for one random number.

A: And Ethernet solved the exact same problem in the seventies. Two machines whose messages collided each waited a random amount, and widened the range after each collision. Then the last rule: put a ceiling on all of it. A limit on attempts, a total deadline. And don't retry things that'll fail the same way every time. A malformed request is still malformed a second later.

<!-- section: When something is just down -->

A: And when a service is clearly down, not just struggling, there's one more tool. A circuit breaker. Named after the electrical kind. After too many recent failures, you stop calling it at all for a while, and fail instantly. Then you let a test call through, and if that works, you go back to normal.

B: Why bother, if you're already backing off?

A: Two reasons. It gives the broken service room to recover. And, less obviously, it protects you. If every call to a dead service waits a long time to time out, every request you're handling is stuck holding memory and a connection while it waits. Pile enough of those up, and now your service is the one that's overloaded. Failing fast stops the failure spreading upward.

<!-- section: Back to your script -->

A: So now, back to your twenty thousand judgments. Here's the sentence in Anthropic's docs that explains your waves. The API uses a token bucket. Capacity drips back continuously, it doesn't reset each minute. And a per-minute limit might be enforced over much shorter stretches.

B: [jumping in] So a per-minute limit isn't "send that many whenever you like within the minute".

A: It's a drip rate. The burst you're allowed is much smaller. And firing off twenty thousand requests at once is the deepest burst there is. So almost all of them get rejected. Then the SDK retries them, all together, because they all failed together. Then your sleep-one-second loop sends every failure back exactly one second later. Together.

B: The waves were lockstep retries.

A: The waves were lockstep retries. And there's another wrinkle. These APIs limit tokens too, not only requests. So if your prompt is long and you're not caching it, the token limit is probably the one you're actually hitting.

B: So what should the script have looked like?

A: It's basically everything we just said, pointed outward. Cap how many requests are in flight. Pace yourself with your own token bucket on your side, so you never send faster than you're allowed, and wait when it's empty instead of failing. Read the headers that tell you how much you've got left, and ease off before you get rejected. When you do get rejected, back off with jitter, and respect the server when it tells you how long to wait. Cache the shared part of your prompt. And honestly, for twenty thousand offline judgments you don't need right now, use the batch API. It runs them for you in the background, at half the price. That's backpressure handled by someone else.

<!-- section: Ending -->

B: Okay, let me try to say it back. A server with no way to refuse work doesn't get gracefully slower. The line grows forever, clients time out, and it stays fully busy doing work for people who've left. So you put a limit on every queue and turn away the excess fast, and you count per client so one heavy user can't take everything. And on the calling side, you back off, with randomness, so everyone doesn't come back at the same time.

A: That's it. The one thing I'd sharpen is how to think about the "no". It isn't the system failing. It's the system protecting the work it can actually do. The server that says no to some people is the one that keeps serving anyone at all. And on both ends, it's what TCP figured out back then: when things are overloaded, the first job is to stop making it worse.
