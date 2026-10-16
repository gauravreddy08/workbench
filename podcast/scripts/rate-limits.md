<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you're building training data for the cross-encoder. Twenty thousand query-document pairs, and you want Claude to judge how relevant each document is to its query. And you just learned that async makes this basically one line. You build twenty thousand calls, hand them all to gather, and let it rip. And within about a second, the console fills up with four twenty-nines. That's the HTTP status code for "too many requests". The SDK quietly retries each one twice, then gives up and throws a rate limit error.

B: So you catch the error and try again.

A: Which is exactly what you do. You wrap the call, and on that error you sleep for one second and go again. And now it doesn't crash. It just... comes in waves. A second of furious activity. A second of silence. A wall of four twenty-nines. Silence. Another wall. Twenty minutes later it's thirty percent done.

B: [a bit unsure] Okay, but that's the part I'd find confusing. If I check my limit and I'm, like, well under my per-minute number, then those four twenty-nines are kind of the provider being wrong, right? I'm not over anything.

A: Hold on to that, because you're not wrong about the per-minute number. You really are under it. And by the end you'll see exactly why it doesn't matter. But first, flip the picture around. Now you're the server. Your reranking service at work handles three hundred requests a second, about forty milliseconds each. Someone starts a backfill job that sends six hundred a second. What do you expect?

B: It gets slower. I mean, twice the load... maybe everything takes twice as long?

A: That's what everybody expects. What actually happens is p ninety-nine, the slowest one percent of requests, climbs until it hits the client timeout. Then the median does. Then the dashboard shows the service at a hundred percent CPU, doing a huge amount of work... while zero requests succeed. Not some. Zero. The backfill job and every real user time out together. And when the backfill stops, the service stays broken for about another minute.

B: [skeptical] Zero, though? It's still doing work.

A: It's doing tons of work. That's the strange part, and it's most of this episode. And the two scenes are the same problem, just seen from two ends. A system that has no way to say "slow down" doesn't slow down. It falls over, and it takes everyone with it.

<!-- section: Origin -->

A: [more serious] This has happened before, at a much bigger scale. October nineteen eighty-six. There's a network link between Lawrence Berkeley Lab and U C Berkeley. The two buildings are four hundred yards apart. And the link drops from thirty-two thousand bits per second to forty. Forty bits a second. And no cable broke.

B: So what happened?

A: Every computer on the network was doing exactly what it was told. When a packet wasn't acknowledged in time, send it again. But the packets weren't getting acknowledged because the routers' queues were full. And resending them filled the queues even more. So the network was running flat out, carrying almost nothing but copies of packets that had already been given up on. And a guy named John Nagle had actually predicted this two years earlier and given it a name. Congestion collapse.

B: [amused] So the internet was retrying itself to death.

A: Pretty much. And the fix came from Van Jacobson and Michael Karels. Their nineteen eighty-eight paper, "Congestion Avoidance and Control", is still worth reading. The idea was to teach TCP that a lost packet is a signal to send less. Start slow. Grow carefully. Cut your sending rate in half when you lose something. And back off your retransmissions exponentially, so each retry waits longer than the last. And honestly every idea in this episode, shedding, backpressure, backoff, jitter, is that same lesson rediscovered one layer up. When you're overloaded, the most important thing is to stop making it worse.

<!-- section: The Idea: What overload actually does -->

A: So let's make it happen on a small server where we can see every moving part. Take the fake LLM server from last time, the one where the model call is just a sleep, and make it a little more realistic. It has a GPU that can run eight requests at once. In the code that's a semaphore of eight, which is just a gate that lets eight things through and makes the ninth wait until one of them leaves. And each request takes a hundred milliseconds. So the most it can ever finish is eight every tenth of a second. Eighty requests a second. That number is its capacity, the most work it can complete per second no matter how much you throw at it.

A: Now send it a hundred and twenty a second, steadily. And every client gives up after one second. That's its timeout. And every real client has one, even if it's just a default buried somewhere in a library. So walk it second by second. Every second, a hundred and twenty arrive and eighty finish. The other forty have to wait somewhere. In an async server, that somewhere is the line of coroutines waiting at the semaphore gate. That's a queue, a line of work waiting its turn. Here it's coroutines, but it could be a list, a socket buffer, a Kafka topic. And this one has no limit on its length. After one second it holds forty. After five seconds, two hundred. After ten seconds, four hundred.

B: [working it out] But at some point it settles, right? Like, it finds a new speed. Slower, but steady.

A: That's the intuition, and it's wrong in an important way. Remember Little's Law from last time. It's a really simple rule: how long you wait in a line is how many people are ahead of you, divided by how fast the line moves. So at the ten-second mark there are four hundred ahead of you, and the line moves at eighty a second. Four hundred divided by eighty. Five seconds of waiting. And at twenty seconds it'd be eight hundred ahead, so ten seconds. There's no new steady state to settle into. If more arrives than leaves, the line just grows. Forever. Latency isn't "twice as slow". It grows in a straight line for as long as the overload lasts.

B: Okay. So it's slow and getting slower.

A: And then the timeout kicks in, and this is the part that turns slow into broken. Once the wait passes one second, which here happens after about one point eight seconds of overload, every single client gives up before its turn comes. But the server doesn't know that. The coroutine is still sitting in the line. And when it finally reaches the front, the server does the full hundred milliseconds of GPU work, and sends the answer... to a closed connection. Nobody's there.

B: [quietly] Oh. So it's busy doing work for people who already left.

A: A hundred percent busy, and every answer is late. And that's the difference between two words that sound like they mean the same thing. Throughput is how much work the server completes per second, whether or not anyone still wanted it. Here that's still eighty a second. Flat out. Goodput is how much useful work completes per second, meaning answers that actually reached a client who was still waiting. And goodput is zero.

B: Throughput eighty, goodput zero.

A: That's the whole failure in four words. If you drew it, it'd go left to right. On the far left, arrivals, a hundred and twenty a second. Then a long row of little boxes, the queue, with no end cap on it, growing by forty every second. Above it you'd write: at ten seconds, four hundred waiting, five seconds of wait. And underneath: memory held for every one of them, because each waiting request is a real object sitting in RAM. Then the server, eight slots, all eight filled in solid, a hundred percent busy. And on the far right, a client drawn in dashed lines, because it gave up at one second. Goodput zero.

A: [matter-of-fact] And I mean, this isn't just a thought experiment. This was run on a MacBook. FastAPI, eight slots, a hundred milliseconds each, a ten-second flood, a one-second client timeout. At eighty a second, right at capacity, everything succeeded, and p ninety-nine was about a hundred and fifty-six milliseconds. At a hundred and twenty a second, two hundred and sixteen out of twelve hundred succeeded. And the server was still chewing through three hundred abandoned requests after the last client had gone home. At two hundred and forty a second, a hundred and twelve out of twenty-four hundred succeeded. About fifteen hundred dead requests were still queued after the run. And the server process had grown by about nineteen megabytes just holding them.

<!-- section: The Idea: Predict, longer overload -->

A: So here's one to actually think about. Same server, capacity eighty a second, clients time out at one second, and you send a constant hundred and twenty a second. After ten seconds, goodput averaged out to about twenty-two a second. What will it be if the overload lasts sixty seconds instead of ten? And what's the CPU doing the whole time?

B: Twenty-two... I'd guess it stays around twenty-two? It's the same rate going in. Maybe a bit lower.

A: [calmly] It's about three point six a second. And the CPU's at a hundred percent the entire time.

B: [surprised] Three point six? Where does that come from?

A: So, the only requests that ever succeed are the ones that arrive before the wait passes the timeout. A request needs a hundred milliseconds of actual work, and the client gives up at one second, so it can afford to wait at most nine tenths of a second in line. At eighty a second, nine tenths of a second of waiting is a line of seventy-two. And the line grows by forty a second, so it takes one point eight seconds to get to seventy-two. During those one point eight seconds, a hundred and twenty a second arrive. A hundred and twenty times one point eight is two hundred and sixteen. Those two hundred and sixteen succeed. And that's it. Two hundred and sixteen, no matter how long the overload lasts.

B: Oh. So it's a fixed number of winners.

A: A fixed number of winners, all at the start. Spread over ten seconds, that's twenty-one point six a second, which is exactly what got measured. Spread over sixty seconds, it's three point six. And if the overload goes on forever, goodput is zero. That's the trap. The longer the overload, the worse the average. And by CPU, the server looks perfectly healthy.

A: Now imagine that as a graph you can play with. Offered load along the bottom, from zero up to almost five hundred a second. Goodput up the side. There's a dashed line across at eighty, the capacity. Below eighty offered, everything's the same, everyone gets served. Above eighty there are two lines. A blue one that just runs flat along eighty forever, and we'll get to what that is. And a black one, the unprotected server, that falls off a cliff right after capacity and keeps sliding toward zero, with little dots on it where the real measurements landed, right on the line. And there are sliders. Drag the overload duration out to a minute, and the black curve sinks toward the floor. Then try lengthening the client's timeout. It buys a little, briefly, and changes nothing in the long run.

B: Because the line just keeps growing past whatever timeout you pick.

A: Right. A longer timeout just moves the point where everyone starts failing a bit later. And that shape, where pushing more load in gets you less useful work out, is called congestion collapse. Same name as nineteen eighty-six. It's when a system under overload spends its capacity on work that no longer matters, so useful output falls as load rises. And it's not a bug in FastAPI, or in async I O. Any system with an unbounded queue and impatient clients does it. Threads, processes, Go, Rust, a Postgres connection pool... a support phone line. All the same.

B: [a bit unsure] But at some point it does crash, though, right? If you keep pushing.

A: So notice what didn't happen. The server didn't crash. And I think your gut model, from the diagnostic, was that a sync server "crashes" under load. They mostly don't. They do something worse. They keep running, and stop being useful. A crash at least shows up as red on a dashboard. This shows up as a busy, healthy-looking server that nobody gets an answer from. It can eventually run out of memory, and we'll do that math later. But the normal failure is the quiet one.

<!-- section: The Idea: Load shedding -->

A: [picking back up] So what's the blue line, the one that stays flat at eighty? It's a server that does one extra thing. Before it puts a request in the line, it checks how long the line is. If sixteen requests are already waiting, it answers right away with a five oh three, "service unavailable", and does nothing else. Sixteen waiting at eighty a second is two hundred milliseconds of work, so anyone who does get in line waits at most a fifth of a second. That's load shedding: deliberately rejecting some requests, early and cheaply, when you're over capacity, so the ones you accept still finish in time. And a line with a maximum length like that is called a bounded queue.

B: And the rejection's cheap because...

A: Because it skips everything. No GPU slot, no hundred milliseconds, just a few dozen bytes of response. So the server spends its whole capacity on requests that'll actually finish in time. In the run at two hundred and forty a second, the shedding server returned eight hundred and sixteen successes and fifteen hundred and eighty-four fast five oh threes. And every success had a p ninety-nine of about three hundred milliseconds. That's a hundred of work plus up to two hundred in the line. At four hundred and eighty a second? Still eight hundred and sixteen successes. Goodput pinned at capacity, which is the best any server can do.

B: [skeptical] I mean, it still feels bad, though. You're turning people away while you're trying to serve them. Those could be real users.

A: [warmly] It does feel wrong. But the choice under overload is never "serve everyone" versus "serve some". You can't serve everyone, there's no version of this where that happens. The real choice is "serve some, quickly, and tell the rest right away", versus "serve nobody, slowly". And a fast no is kind of a gift. The client can retry later, or try another replica, or show the user an error in five milliseconds instead of a spinner for thirty seconds.

B: Okay, yeah. Put that way.

A: And there are a few refinements you'll see in real systems. First, how big should the queue be? Size it in time, not in items. A queue is only useful if the requests in it can still finish before their clients give up. With a one-second timeout and eighty a second of capacity, anything over about seventy waiting is pure harm. Everything past that is guaranteed dead on arrival. And most production queues are way too long, because a long queue looks harmless in testing. Nothing's overloaded in testing.

A: Second, deadlines. Even with a bounded queue, a request can sit long enough to be dead by the time it gets its turn. So you write down when each request arrived, and when it reaches the front of the line, you check. Has it already waited longer than the client will? If so, drop it, without doing the work. Even better, the client sends its deadline along with the request. G R P C does this on every call. And then every layer along the way can check it.

A: Third, which requests to drop. Dropping the newest arrival, the one at the door, is simplest, and it's what you'll build. But under sustained overload, it can actually work better to serve the newest first and drop the oldest, because the oldest are the most likely to be dead already. Facebook has a well-known paper, "Fail at Scale", where they describe switching their queues to last in, first out when overloaded. And using how long requests have been waiting, rather than how many there are, as the signal. That idea came from Co Del, an algorithm for network routers. And fourth, shed by priority. A user's interactive request matters more than the backfill job. So real systems tag requests with a priority and shed the cheap ones first.

<!-- section: The Idea: Backpressure -->

A: Now, shedding is the server saying "no". Sometimes you'd rather it said "wait". Your batch job doesn't want its requests thrown away. It wants to send them as fast as the server can take them, and no faster. Making the producer slow down to match the consumer, that's called backpressure. The slow thing at the end pushes back up the pipe.

B: That sounds like something I'd have to build specially.

A: [amused] You've already used it twice without the name. TCP does it automatically. Every receiver keeps telling the sender how much buffer space it has left. That's called the receive window. And if the server stops reading from a socket, that window fills up, hits zero, and the sender's kernel just stops sending. On the client side, the send call eventually blocks. That's backpressure, built into every TCP connection you've ever opened. And the other one was last time, the semaphore of sixty-four in your load generator. The sixty-fifth task waits to start, instead of piling onto the server you're calling. Backpressure inside one program.

A: So the general rule is: every queue in a pipeline should be bounded, and a full queue should push back on whoever feeds it. Either by blocking them, which means wait, or rejecting them, which means shed. And then picture a chain of four boxes, left to right. Your batch job, with its semaphore of sixty-four. Then a gateway with a rate limit. Then the reranker, with a queue of at most sixteen. Then the GPU with its eight slots. Work flows right. Now the GPU slows down. Its slots fill. So the reranker's little queue fills, and it starts returning five oh threes, or reading from its sockets more slowly. So the gateway's queue fills, and it starts returning four twenty-nines with a retry after header. So the batch job's semaphore ends up holding more tasks waiting. The queues fill one by one, right to left. And the signal changes form at every hop, slots full, then a five oh three or a full TCP window, then a four twenty-nine, but it's the same message each time. Slow down. And nothing anywhere grows without limit. Every component can tell you how much memory it'll use in the worst case.

B: [working it out] So the thing that breaks it would be one stage that just... keeps accepting.

A: Exactly that. One unbounded buffer anywhere in the chain absorbs the pressure, so the signal never reaches the producer, and you're right back to that first collapsing server at that hop. And they hide in pretty ordinary places. An async I O queue created with no max size. A list you keep appending to. A message broker with no retention limit. Python's thread pool executor, whose internal work queue is unbounded. And an HTTP client's connection pool that silently queues requests while they wait for a free connection.

B: [surprised] The thread pool one is unbounded? I've used that a hundred times.

A: [laughs] Everyone has. You hand it work faster than its threads can do it, and it just quietly holds the rest. Which is fine, right up until it isn't.

<!-- section: The Idea: Rate limiting -->

B: Wait, but doesn't shedding already handle the backfill problem? The server just says no to the excess.

A: It protects the server from total load. But it doesn't care who the load comes from. If your backfill job sends ninety-five percent of the traffic, it gets ninety-five percent of the successes, and the real users get the leftovers. To share capacity fairly, you need to count per client. That's a rate limiter. Something that counts requests, or tokens, or bytes, per client over time, and rejects or delays whatever's over that client's allowance. Keyed by API key, or user, or IP address.

A: And it's worth getting the three straight, because they sound similar. Load shedding protects the server from too much total work, by rejecting the excess quickly and cheaply. Backpressure makes the producer slow down to match the consumer, with bounded queues at every stage. Rate limiting decides how capacity is shared, so one heavy client can't starve everyone else. A real system uses all three. Per-client limits at the edge, bounded queues with shedding inside, and clients that actually respond when they get pushed back.

B: Okay. So how do you count "per second"? That seems trivial.

A: [thinking out loud] It's less trivial than it sounds. There are four classic answers, and the differences matter. The first is the fixed window. Keep one counter per client per minute. Like, a key that's the user plus the current minute. Every request, add one. Over the limit, reject. When the minute's over, the counter expires. One integer of state, dirt cheap. But there's a flaw at the boundary. Say the limit's five per window. A client sends five in the very last instant of one window, and five more in the first instant of the next. Both windows say "five, that's fine". But you just let through ten in a blink. Twice the limit.

B: Huh. Yeah.

A: And there's a second, sneakier problem. Everyone's counter resets at the same instant. So all the clients that hit the limit come back together at the top of the minute. Remember that one, it comes back when we get to retries.

A: The second answer is the sliding window log. Keep the timestamp of every request in the last window. To decide, throw away timestamps older than one window, and count what's left. It's exact, and there's no boundary problem, because you're always looking back exactly one window from right now. But it stores one entry per request. A limit of ten thousand a minute means up to ten thousand timestamps per client.

A: The third is the cheap approximation of that, which Cloudflare popularised. The sliding window counter. Keep this window's count and the previous window's count. Then estimate "requests in the last minute" by taking the previous window's count, scaled by how much of the previous window is still in view, plus the current count. So, say you're thirty seconds into this minute. Last minute had eighty requests, this minute has fifty so far. Half of last minute is still in your look-back, so call that forty, plus fifty, ninety. Two integers of state, and in practice really close to exact. It just assumes the previous window's requests were spread evenly.

A: The fourth is the one you'll build. The token bucket. Picture a bucket that holds at most some number of tokens, call it B, and every second, R new tokens drip in. Each request takes one token. No token, no entry. And the two knobs mean two different things. The refill rate, R, is the long-run average a client can sustain. The burst size, B, the bucket's capacity, is how lumpy that average is allowed to be. A client that's been quiet for a while has a full bucket, so it can fire B requests instantly. A client that's been busy gets exactly R per second, because that's all that drips in.

B: [working it out] So if the bucket holds ten and refills at four a second... someone quiet can send ten right away, and then four a second after that.

A: That's it. And it gives you a clean guarantee. Over any stretch of time, a client can never get more through than the bucket size plus the refill rate times that stretch. So over ten seconds, with a bucket of ten refilling at four, that's ten plus forty. Fifty, max. And here's the nice part: it only needs two numbers of state per client. How many tokens are left, and when you last updated. You don't need a background timer dripping tokens in. When a request arrives, you work out how many tokens would have dripped in since last time, add them, capped at the bucket size, and then decide. That's called lazy refill, and it's honestly the whole trick. There's even a variant called G C R A, the generic cell rate algorithm, that squeezes it down to a single timestamp: the time the next request would be allowed. It came from A T M networking, the old telecom kind, not cash machines, and several Redis rate limiters use it.

A: And then the leaky bucket. Which, confusingly, means two things. As a meter, it's a bucket that fills up with each request and leaks at a constant rate, and you reject if it would overflow. That's just the token bucket upside down. It behaves identically.

B: [skeptical] Then why does it have a different name?

A: [patiently] Because of the second meaning. As a queue, requests go into a line that drains at exactly R per second. And that's genuinely different. It never rejects a burst that fits in the line. It delays it. Lumpy traffic goes in, perfectly smooth traffic comes out, just later. Network routers use that to shape traffic. But for an API, it mostly means adding latency to everyone, which is why APIs use the meter.

A: Now, the token bucket is one of those things you really get once you watch it. Imagine a graph where the line is how many tokens are in the bucket. It climbs at the refill rate until it hits a dashed ceiling, the burst cap, and it drops by one every time a request gets through. Along the bottom, each request is a little tick. Filled in if it got in, hollow if it got a four twenty-nine. Set the refill to four a second, bucket of ten, and send a steady six a second. You'd see the line start at the top, slide down as the steady traffic eats the savings, hit the floor, and then the hollow ticks start, at exactly two a second. The excess.

B: Two a second because six in, four refilling.

A: Right. Then switch to the spike pattern. A steady two a second, plus one sudden spike of thirty requests in about half a second. Averaged over the whole ten seconds, that's about five a second, barely over the refill of four. And the bucket lets about ten of the spike through and rejects about twenty. Even though on average you were almost fine.

B: Because the bucket only had ten saved up.

A: Because the bucket only had ten saved up. A token bucket doesn't care about your average. It cares about your burst. Hold on to that, because it's the answer to your "but I'm under my limit" from the beginning.

A: So if you line all four up: the fixed window is one counter, but it lets through up to double at the boundaries, and everyone resets together. The sliding log is exact but its memory grows with the limit. The sliding counter is two counters and slightly approximate. The token bucket is two numbers, and it allows bursts on purpose, up to the bucket size. Its only real weakness is you've got two knobs to explain to users. And the leaky bucket as a queue absorbs bursts as delay, which adds latency, and that queue needs its own bound.

<!-- section: The Idea: Saying no in HTTP -->

A: When you do reject, say it in a way machines understand. Two status codes do almost all the work. Four twenty-nine, "too many requests", defined in R F C six five eight five, back in twenty twelve. It means you, specifically, are over your limit. Other clients are fine. The fix is on your side: send slower. And five oh three, "service unavailable". That means the server is overloaded, or down, for everyone. Not your fault, but please back off too.

A: Both can carry a retry after header. Either a number of seconds or a date, telling the client the earliest a retry has any chance. And a token bucket knows this exactly. If you need one token and the bucket has three tenths of one, you're seven tenths of a token short, so the wait is seven tenths divided by the refill rate. At ten tokens a second, that's seventy milliseconds. A lot of APIs also send headers describing your limit and how much of it you've got left, so a polite client can slow down before it gets rejected. There's an I E T F draft to standardise those. But right now every provider names them differently.

<!-- section: The Idea: Retries, backoff and jitter -->

A: Okay. Now the other half. You're the client, and you just got a four twenty-nine, or a five oh three, or a timeout. Should you retry?

B: Yeah, obviously. That's just being resilient. Most of those are temporary.

A: [carefully] Usually yes, and you're right that most failures under load are transient, so a retry a bit later will work. But retries are load. Here's the danger in one bit of arithmetic. Your reranker is overloaded and failing. Every client retries three times, so four attempts total. The server now gets up to four times its original load, from the same users, at exactly the moment it can least handle it. And it gets worse when you stack layers. If the batch job retries three times, and the gateway retries each of those three times, and the reranker's client to the GPU service retries three times, then one user request can turn into four times four times four... sixty-four attempts at the bottom.

B: [sighs] Okay, sixty-four is bad.

A: That's called a retry storm. Retries adding so much load to an already struggling service that it can't recover, even after the original problem's gone. And it's the most common way a small blip turns into a long outage. It's nineteen eighty-six again, one layer up. So, three rules make retries safe.

A: Rule one, back off exponentially. Don't retry immediately. Wait some base amount, then twice that, then four times, then eight, doubling each time, up to some cap. That's exponential backoff. Each failure makes you more patient, so the longer the server struggles, the less you add to it.

A: Rule two, add jitter. Because backoff alone has a nasty failure mode. Say four hundred clients all fail at the same moment. Could be a server restart, a cache expiring, a deploy, or a fixed window limit resetting at the top of the minute. With pure backoff, they all wait exactly a hundred milliseconds and retry together. The server could've handled them spread out, but it sees four hundred at once, admits about twenty-four, rejects the rest. And they all wait exactly two hundred milliseconds and come back together. Again.

B: [skeptical] But wouldn't they drift apart naturally? Network delays are all a bit different.

A: [firmly] You'd think so. But they don't drift enough. The differences are a few milliseconds and the backoff is hundreds. They stay in lockstep basically forever. So the fix is jitter: randomness added to the delay. Instead of waiting exactly the backoff, wait a random time anywhere between zero and the backoff. That's called full jitter, from Marc Brooker's classic post on the A W S blog. And Ethernet solved this exact problem the same way in the nineteen seventies. Two machines whose packets collided on the wire would each wait a random number of time slots, and double the range after every collision.

A: Rule three, bound the total. A maximum number of attempts, a total deadline, and ideally a retry budget. That's a cap on retries as a fraction of your normal traffic. Like, "retries may add at most ten percent to my request rate". Once the budget's spent, failures just fail immediately. G R P C's retry throttling is exactly this, and it's built as a token bucket on the client. And only retry the right things. Four twenty-nine, five oh three, five twenty-nine, timeouts, connection errors: yes. Four hundred, bad request: no. It'll fail the same way every time.

B: And if the server sends retry after, you just wait that long.

A: Don't retry before it, yeah. But add a little jitter on top. Because if the server tells four hundred clients "retry after one second", and they all obey exactly... you've just recreated the lockstep.

<!-- section: The Idea: Predict, the retry storm -->

A: So try this. Four hundred clients fire one request each at the same instant, at the shedding server. Capacity eighty a second, a queue of sixteen. The rejected ones retry with exponential backoff, starting at a hundred milliseconds, doubling, capped at five seconds. If you scheduled everything perfectly, four hundred at eighty a second is five seconds. How long until the last client succeeds without jitter? And with full jitter?

B: Hmm. Without jitter, maybe... double? Ten, twelve seconds? And with jitter close to five.

A: With jitter you're close. About seven and a half seconds. Without jitter, it was about fifty-two seconds.

B: [surprised] Fifty-two? For a five-second job?

A: [emphatic] Fifty-two. Run twice, it took fifty-two to fifty-seven seconds both times. The jittered one, seven point two to seven point five. And without jitter it made about thirty-three hundred attempts, versus about twenty-four hundred with. Here's why. Each wave of retries arrives within a few milliseconds of each other. The server can only take about twenty-four at once, eight running plus sixteen in the queue. So each wave gets about twenty-four through and the rest go back to waiting. In lockstep. And once the backoff hits the five-second cap, there's one wave every five seconds, each one admitting a couple of dozen, and the server just sits there idle in between. Jitter spreads each wave across its whole backoff window, so the server stays busy and nearly everyone gets in within a few windows.

A: If you charted it, requests per quarter second, over fifteen seconds, there'd be a dashed line low down for what the server can take, about twenty per quarter second. Without jitter you get tall spikes that blow way past that line, with flat empty gaps between them. And it's not even done at fifteen seconds. Another seven hundred and seventy-nine attempts happen after that. With jitter, the same backoff schedule becomes a smooth stream that starts high and decays away, and it's all done by seven and a half seconds.

<!-- section: The Idea: Circuit breakers -->

A: Now, backoff is about being polite to a service that's struggling. A circuit breaker is for when it's clearly down. It's a wrapper around calls to some dependency, named after the electrical kind, and popularised by Michael Nygard's book "Release It!". It has three states. Closed is normal. Calls go through, and you count recent failures. Open is when the failure rate passed some threshold, say more than half of the last twenty calls failed. Then for the next thirty seconds, you don't call it at all. You fail instantly, or serve a fallback. A cached answer, a cheaper model, a "try again later". And half-open is after that cool-down. You let one or a few trial calls through. If they succeed, close the circuit. If they fail, open it again.

B: But why bother, if I'm already backing off? The retries already slow down.

A: Two reasons. First, it takes your load off the dependency completely, which gives it room to recover. Second, and this one's less obvious, it protects you. Say every call to a dead service waits ten seconds for its timeout. Then every request handler that touches it holds a slot, a connection, and some memory for ten seconds. And Little's Law again, number in flight is the rate times how long each one stays: at a hundred requests a second, times ten seconds, that's a thousand stuck requests. And now your service is the one with the line growing in front of it. Failing fast keeps the failure from spreading upstream. It's basically backpressure for broken dependencies.

<!-- section: The Idea: Distributed rate limiting -->

A: Everything so far kept the token bucket in one Python dictionary, in one process. Now run uvicorn with four workers, or four containers behind a load balancer. Each process has its own dictionary. So a client you limited to seventy a second now gets seventy a second per process. Up to two hundred and eighty.

B: So you put the counts somewhere shared.

A: Right. The standard answer is Redis. It's an in-memory key-value server. Fast, a round trip on a local network is well under a millisecond. It runs one command at a time, and it can run small scripts, in a language called Lua, as one atomic step. Each request does one round trip to Redis to take a token.

B: [a bit unsure] And the process just reads the count, and if there's a token, writes back one less?

A: [jumping in] That's the classic race. Two processes both read "tokens equals one". Both decide yes. Both write "tokens equals zero". You let two through on one token. It's the same race as in the threads lesson, where two threads both read a counter, both add one, and both write back, so you lose an update. There, the fix was a lock around the read, add, write. Here the fix is to make read, refill, decide, write happen as one indivisible step, and the standard way is a small Lua script, which Redis runs atomically. And inside the script you use Redis's own clock, not the app server's, so that servers whose clocks disagree slightly don't fight over the math.

A: And then a few design decisions matter. Latency. Every request now pays a network round trip. On the same machine or rack, that's tens to hundreds of microseconds. Across regions it's tens of milliseconds, which is why global limits are usually split into a budget per region. Then, what if Redis is down?

B: [working it out] I guess... you either let everything through, or block everything.

A: Fail open, or fail closed. Fail open means everything goes through, unprotected. Fail closed means you reject everything, which is an outage you caused yourself. And most systems fail open for rate limits, because a rate limiter that takes down the service it's protecting is worse than having no limiter. And they keep a crude local limit in each process as a backstop. Last thing: approximate is fine. You can batch. Each process grabs fifty tokens from Redis at a time and hands them out locally. Fewer round trips, slightly less precise. Stripe has a well-known post describing exactly this kind of setup: several limiters, per-user request rate, concurrent requests, and a server-wide load shedder, all backed by Redis.

B: So if I had, like, twenty replicas and a customer limit of a thousand a second, how far does that scale?

A: So per process, that customer would get a thousand per replica, twenty thousand total, so yeah, shared buckets in Redis, keyed by customer, with that atomic script. One round trip each, under a millisecond in the same datacenter. Batch tokens to cut round trips when volume's high. One Redis instance handles very roughly a hundred thousand simple operations a second, and you should measure yours with its own benchmark tool. Past that, you shard. Spread the keys across several Redis instances, and one customer's key always lands on the same one. Across regions, give each region its own slice of the budget. And decide up front: usually fail open, with that local backstop.

<!-- section: The Idea: LLM APIs -->

A: Okay. Back to your twenty thousand relevance judgments. LLM providers limit you on more than one axis, because how expensive a request is depends almost entirely on how many tokens it has. Anthropic's docs, as of October twenty twenty-six, and you should check the current page, limit each model class on three things. R P M, requests per minute. I T P M, input tokens per minute. And for most models, only uncached input tokens count. Tokens read from the prompt cache don't. So a long system prompt you send over and over, with caching on, costs you almost nothing against that limit. And O T P M, output tokens per minute. Those are counted as they're actually generated, not by the max tokens you asked for. OpenAI does basically the same thing, requests per minute and tokens per minute, with headers named things like "x ratelimit remaining tokens".

A: And there's one sentence in Anthropic's docs that explains your waves. The API uses the token bucket algorithm. So capacity is continuously refilled, not reset each minute. And a limit of sixty requests per minute "might be enforced as one request per second". So short bursts can get four twenty-nines even when you're under the per-minute number.

B: [quietly] Oh. So the per-minute number is the refill rate.

A: A per-minute limit is a refill rate. The burst size is something much smaller. And gather over twenty thousand coroutines is the deepest burst there is.

B: Okay, so let me try to tell the story of my script. Gather fires everything at once, the bucket's tiny, so almost all of them get four twenty-nines. Then...

A: Then the SDK retries each one. Both Anthropic's and OpenAI's Python SDKs default to two retries, with exponential backoff, and they honour retry after. But that's thousands of retries, and they're closely synchronized, because they all failed together. So most fail again.

B: And then my sleep-one-second loop.

A: Your sleep one second has no growth and no jitter. Every failed request comes back exactly one second later, all together. That's the spiky chart from the retry storm. The waves you saw were lockstep retries. And there's one more piece, which is, each request also spends input tokens. If your prompt's three thousand tokens and uncached, the input-tokens-per-minute limit is probably the one you're actually hitting. Not requests per minute at all.

B: [amused] So I was under the limit I was looking at, and over the one I wasn't.

A: [amused] Probably, yeah. And Anthropic's responses tell you where you stand on every call. There are headers for requests remaining, input tokens remaining, and output tokens remaining, each with a matching limit and a reset time, plus retry after on a four twenty-nine. Two other errors are worth telling apart. A five twenty-nine, overloaded, means Anthropic itself is overloaded, for everyone. That's the five oh three of this episode. Not your fault, back off and retry. And a four twenty-nine whose error code says you've reached your spend limit means you've hit your monthly spending cap. That one has no retry after, and retrying won't help until the cap resets or you raise it. The docs also mention acceleration limits. A sudden, sharp ramp-up in an organisation's usage can get limited on its own. So ramp up gradually.

A: And a well-behaved client is just this whole episode pointed outward. First, cap concurrency with a semaphore. And Little's Law tells you how much. Number in flight equals rate times latency. If requests take five seconds and you're allowed six hundred a minute, that's ten a second, so ten times five, about fifty in flight is the most that can possibly help. More than fifty in flight just means waiting at the provider's door instead of yours.

A: Second, pace yourself with your own token bucket, on the client side, one for each limit you care about. For tokens, estimate each request's input size before you send it. The count tokens endpoint gives you the exact number, and about four characters per token is a rough rule for English. Take that many tokens from your input-tokens bucket, and if it's empty, wait, don't fail. That's the leaky bucket as a queue, actually. You smooth out your own traffic so the server never has to reject it. Third, read the headers, and slow down when "remaining" gets low, before you're rejected. Fourth, on four twenty-nines, five twenty-nines, timeouts and connection errors, retry, with capped exponential backoff, full jitter, at least as long as retry after, and a bounded number of attempts. Never retry a four hundred. Fifth, use prompt caching for the shared part of the prompt, because cached input tokens mostly don't count against your input limit.

A: And sixth, the one that matters most for your actual problem. If you don't need the answers right now, don't use the real-time API at all. The Message Batches API takes up to a hundred thousand requests per batch, with its own separate limits, runs them in the background, and costs half as much. For twenty thousand offline relevance judgments, that's the right tool.

B: [laughs] So the real fix for my script was to not run my script.

A: Kind of. It's backpressure handled by someone else.

<!-- section: Build It -->

A: [relaxed] So here's what you'd build. All of it runs on your Mac and costs nothing. Setup's one sentence: a fresh folder, a virtual environment with FastAPI, uvicorn and H T T P X, and you raise the open files limit, because macOS defaults to two hundred and fifty-six and every connection is one. The server is the fake LLM with eight slots and a hundred milliseconds each, so eighty a second. The part that matters is that it keeps a little stats page: how many are waiting, how many finished, how many it shed, how many it rate limited. So you can watch what it does after the clients leave. And it has a mode switch, no protection, shedding, or bucket. Restart it between experiments, so leftover queued work doesn't leak into the next run.

A: Then the load generator, and this one has a subtlety. It's open-loop. It sends at a fixed rate no matter how slowly the server answers. Like real users, who don't wait for each other.

B: As opposed to what?

A: As opposed to closed-loop, which is the obvious way to write it. N workers, each one sends, waits for the answer, sends again. And that automatically slows down when the server does. Which hides exactly the effect you're trying to see. The server gets slow, so the load drops, so it looks fine. That mistake has a name, coordinated omission, and the p ninety-nine lesson goes into it. And there's a little trap in H T T P X too. Its default connection pool caps you at a hundred connections and queues the rest inside the client. An unbounded queue of its own, hiding in your load generator. So you remove the cap. At the end it prints goodput, a count of each status, the p ninety-nine of the successes, and the server's finished and still-waiting numbers.

A: First task, flood it and record the collapse. Before you run anything, write down your predictions from that goodput graph. Then run at sixty, eighty, a hundred, a hundred and twenty, a hundred and sixty and two hundred and forty a second, restarting each time. Record goodput, timeouts, p ninety-nine, and how many are still waiting when the flood ends. Then after the two-forty run, poll the stats page once a second for a few seconds. Every client is gone. And you'll see "finished" still climbing. Write down how long the server keeps working for nobody. And measure the server's resident memory, the RAM it's actually using, right before and right after the flood. Divide the difference by the number waiting, and that's roughly what one queued request costs.

A: Second task, write the token bucket, in its own file. No background thread, no timer, lazy refill when a request arrives. Its "try take" method gives back two things: yes or no, and how many seconds until enough tokens would be there. Then a keyed version that keeps one bucket per client, created the first time it sees them. Two hints that matter. Use the monotonic clock, never wall-clock time. Wall-clock time can jump backwards when your machine syncs its clock, and your bucket would suddenly mint or destroy tokens. And the wait for N tokens, when you've got T, is the shortfall divided by the rate. In the server's bucket mode, you read the client's key from an API key header, and if the bucket says no, you return a four twenty-nine with a retry after header, rounded up to whole seconds.

B: Does it need a lock? Lots of requests hitting the same dictionary.

A: In async I O, no. As long as there's no await between reading the bucket and writing it back, nothing else can run in between, because it's one event loop on one thread. With threads, you'd need a lock, for exactly the race we just talked about. Then test it with a tiny script. A bucket that refills five a second and holds ten. Call it fifteen times in a tight loop. You should get ten yeses, then five nos, each saying wait about two tenths of a second.

B: [working it out] Why all the same wait, though? The fifteenth should be further back in line than the eleventh.

A: That's the question it's asking you. A rejected call doesn't take anything. There is no line. Every one of those five nos is looking at a nearly empty bucket that needs one more token, and one token at five a second is a fifth of a second. Then sleep a second and try again, and five tokens have dripped back. Then point the flood at it with a rate of seventy and a burst of twenty.

A: Third task, the bounded queue and dropping dead work. Two changes. Shed at the door: if sixteen are already waiting, return a five oh three with retry after one, right away. And drop dead work at the front. Note the time a request arrives, and right after it gets a GPU slot, check: has it waited more than about eight tenths of a second, a bit under the client's timeout? If so, give the slot back and return a five oh three without doing the hundred milliseconds of work. So the order in the handler is: bucket check, queue length check, wait for a slot, deadline check, then the work. Then rerun the sweep. And try a queue limit of a thousand, first with the deadline check off, then on. Which one protects goodput, the queue limit or the deadline? You need at least one. Worth thinking about why before you run it.

A: Fourth task, a client that backs off with jitter. A small function for the delay: attempt zero waits up to the base, attempt one up to twice the base, and so on, capped. With jitter, a uniformly random amount between zero and that. Then a call-with-retries function that retries the retryable statuses, four twenty-nine, the five hundreds, five twenty-nine, plus timeouts and connection errors. Honours retry after with a bit of jitter on top, and gives up after a max number of tries. Then a harness that starts four hundred clients and fires them all at the same instant. And one odd detail there: it opens one connection per client ahead of time. Because macOS caps its line of pending new connections at a hundred and twenty-eight, whatever your server asks for. Four hundred brand-new connections at once would get dropped by the kernel and retried by TCP itself a second later, which muddies the experiment.

B: [amused] So the kernel's shedding load at the door.

A: Same idea, one layer down. Run it with and without jitter. Then turn on honouring retry after, where the server tells everyone "one second". And predict first: what does a fixed retry after do to four hundred synchronized clients if you don't add jitter on top?

B: They'd all come back at exactly one second. Together. And again a second later.

A: That's what you should expect. Go see if it does.

A: Fifth task, the client you should've had for the twenty thousand judgments. A token bucket that waits instead of refusing, and one detail there: if a request needs more tokens than the bucket can hold, treat it as a full bucket, or it'd wait forever. Then a polite client with a semaphore, a requests bucket with a small burst, and an input-tokens bucket. Each call estimates its tokens, waits on both buckets, then goes out under the semaphore, and retries with full jitter. Build it against your own server in bucket mode, playing the part of the provider, with your client's limits set slightly under the server's. And the goal is zero four twenty-nines. A client that never gets rejected, because it never sends faster than it's allowed.

A: And one thing to decide on purpose. The Anthropic and OpenAI SDKs already retry, twice by default. So either keep that and add pacing on top, or set max retries to zero and own the retries yourself. Just don't stack both blindly, or you've built the retry multiplication from earlier. To read response headers, the Python SDKs have a raw-response version of each call; check the docs for exactly how in your version. Then, if you want, point it at the real API for fifty small requests, with max tokens around fifty and a short prompt. It costs cents. Watch the remaining headers change as you go. Your real limits are on the Limits page of the Console. And have an agent review it for unbounded queues hiding anywhere, retries without jitter, retrying errors that can't succeed, and a burst size big enough to defeat the whole point.

A: And the sixth task is optional. Move the bucket into Redis so four uvicorn workers share one limit. You'd install Redis, and the core is that Lua script. It reads Redis's clock, loads the bucket's tokens and timestamp, and then your part: refill, capped at the burst. Decide. Subtract if allowed. Write back the new tokens and time. Set an expiry so idle keys disappear. And return whether it's allowed and how long to wait. And then write down, explicitly: if Redis is unreachable, does your server fail open, or closed?

<!-- section: Measure -->

A: So what should the numbers look like? Your exact numbers will differ, but not the shape. At sixty a second, both servers serve all sixty, and the shedding one's p ninety-nine is about a hundred and five milliseconds. At eighty, everything still succeeds. Then the unprotected server falls off. At a hundred a second, goodput's about thirty-five, and six hundred forty-eight of a thousand time out. At a hundred and twenty, about twenty-two. A hundred and sixty, about fourteen. Two forty, about eleven, with two thousand two hundred and eighty-eight of twenty-four hundred timing out. Meanwhile the shedding server sits at about eighty-one a second at every load, a hundred, a hundred and twenty, two forty, four eighty, with p ninety-nine right around three hundred milliseconds.

B: [skeptical] Eighty-one? I thought eighty was the most it could ever do.

A: Good catch. It's because the requests still in the queue when the sending stops finish just afterwards and get counted. So a little over eighty for a ten-second run. And p ninety-nine is the hundred milliseconds of work plus the two hundred milliseconds of maximum queue wait. And here's the satisfying part. The unprotected numbers match a one-line model. Successes only come from the requests that arrive before the line gets too long. And you can work out that window: take the capacity, times how much waiting a request can afford, which is the timeout minus the work, and divide by how fast the line grows. At a hundred and sixty a second: eighty, times nine tenths of a second, is seventy-two. The line grows by eighty a second. So nine tenths of a second of successes. Times a hundred and sixty arriving per second, a hundred and forty-four successes. And the measured number was exactly a hundred and forty-four. At a hundred and twenty it predicts two hundred and sixteen, and the measured number was exactly two hundred and sixteen.

B: Exactly? Not roughly?

A: Exactly, in both. And when a model predicts a measurement that precisely, you understand the mechanism. That model is what that goodput graph was drawing. Now, notice something about the collapsed runs. The p ninety-nine of the successes looks fine. Under a second.

B: [working it out] Wait, so if my dashboard only shows latency of successful requests... it'd look okay. While ninety percent are failing.

A: [serious] That's exactly the trap. Only the requests that beat the timeout count as successes, so of course they're fast. A dashboard that only graphs successful-request latency will look reasonable while ninety percent of requests fail. Always graph errors and timeouts right next to latency.

A: Then the dead work. At two forty a second, about fifteen hundred requests were still queued when the flood ended. At eighty a second, that's almost twenty more seconds of the server working for nobody. That's the "stays broken after the backfill stops" from the beginning. And memory grew by about nineteen megabytes for those fifteen hundred. Across runs it was roughly ten to thirty kilobytes per waiting request. Now scale that up. A real service at ten thousand requests a second, overloaded by two times for one minute, queues six hundred thousand requests. At twenty kilobytes each, that's twelve gigabytes. And now it's an out-of-memory crash too.

B: So that's where the crash eventually comes from.

A: That's where it comes from. Last, the token bucket, with a rate of seventy, a burst of twenty, and shedding on. At a hundred a second offered, seven hundred and nineteen successes in ten seconds. At two forty, seven hundred and seventeen. And the bound is the burst plus the rate times the time: twenty plus seventy times ten. Seven hundred and twenty. The limiter's the tightest constraint, and it's exact. And for the retry storm, without retry after: no jitter, about thirty-three to thirty-five hundred attempts and fifty-two to fifty-seven seconds. Full jitter, about twenty-four hundred attempts and about seven and a half seconds, against an ideal of five. The retry after versions weren't measured. That's yours to predict and then run.

<!-- section: Break It -->

A: Then you break it, four ways. First: what if you run the bucket server with four workers and flood it at four hundred a second?

B: Each worker has its own dictionary... so the limit's four times too high?

A: Each process has its own limiter, and the kernel spreads connections across them, so your seventy a second becomes roughly two eighty. And each process also has its own eight-slot fake GPU. Measure it; it should come out close to four times. That's the per-process problem, and the reason the Redis task exists. In production, it's the same thing with replicas behind a load balancer.

A: Second, the retry amplifier. Change the load generator so that on a timeout or a five oh three, it retries immediately, up to three times, no backoff. Run it at a hundred a second against the unprotected server, and print how many attempts per second the server actually receives. You offered one and a quarter times capacity. The server sees a lot more than that, and it never recovers until the flood stops. Then add backoff with jitter and a retry budget, retries at most ten percent of first attempts, and run it again.

A: Third, a bounded queue that's too big. Set the max waiting to two thousand, with the deadline check off.

B: [a bit unsure] But that's still bounded. That should protect it, right?

A: [dryly] Technically bounded. Flood it at two forty, and you're right back to collapse. Two thousand requests at eighty a second is twenty-five seconds of work, and every client times out long before then. A bound only helps if the work inside it can finish in time. That's why you size queues in seconds.

A: And fourth, ignore the client's timeout. Set it to thirty seconds and rerun the unprotected server at a hundred and twenty a second. Now every request "succeeds", and your goodput number looks perfect. Then look at p ninety-nine. About five seconds. And it'd keep growing for as long as the flood lasted. The overload didn't go away. Every user's just waiting longer and longer. And real users don't wait thirty seconds. They hit refresh. Which is a retry with no backoff.

B: So the timeout was never the problem.

A: The timeout's what makes the problem visible.

<!-- section: Connections and close -->

A: This all builds on the waiting-versus-working stuff, the semaphore and Little's Law, and it sets up the p ninety-nine and load testing lesson, where you measure that hockey stick of latency against load properly. And on the model side, batching is what an inference server does with the queue in front of its GPU, instead of just shedding it. And if you read two things, read the Jacobson and Karels paper from nineteen eighty-eight, and Marc Brooker's writing on backoff and jitter.

B: [working it out] Okay, let me try to say the whole thing. When more work comes in than a server can do, it doesn't slow down, the line in front of it grows without limit, and once the wait is longer than the client's timeout, it's doing all its work for people who already left. So the fix is to rate limit everyone, so the server never gets more than it can handle.

A: [gently] Mostly. But rate limiting alone isn't it. A rate limit decides who gets the capacity. It doesn't stop the total from going over. The core fix is that every queue has a limit measured in time, and when it's full, you say no fast, or make the sender wait, so the "slow down" actually reaches whoever's sending. Shedding at the server, a fair share per client at the edge, and on your side, a client that listens: it paces itself, backs off with jitter, and never assumes a per-minute number means it can send everything at once. A system that can say "slow down", and a client that actually slows down. That's the whole thing.
