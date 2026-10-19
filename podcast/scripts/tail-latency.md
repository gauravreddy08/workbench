<!-- section: The Problem -->

A: [relaxed] So you've got a service you're about to ship. You're careful, so you load-test it first. You run your load generator, sixteen workers, a few thousand requests. And the numbers come back clean. The typical request is quick, even the slow ones are comfortably fast. You ship it.

B: Sounds responsible.

A: It does. And a week later someone shows you the dashboard from the real thing. Same rate of traffic, roughly. And the slow end is over a second. And every few minutes there's this cliff where it touches ten seconds. Nothing changed in the code. Same server. So which number was lying?

B: [thinking] I mean, my first guess is production's just different. Other stuff running, real network, whatever.

A: That's what everybody assumes. But the honest answer is, the load test lied. And not because of some bug in the math. Because of how it sent the requests. Each of those sixteen workers waited politely for an answer before it sent the next one. Real users don't do that. So when the server slowed down, the test slowed down with it, and it stopped sending exactly the requests that would have been slow.

B: Huh. So it measured a nicer world than the real one.

A: A gentler world than the one you shipped into. And to see why that matters so much, you need two other ideas first. Why there are slow requests at all, and why they get so much worse when a server gets busy.

<!-- section: A pile, not a number -->

A: So start simple. Send the same request to the same server a thousand times. You don't get one answer time. You get a thousand different ones.

B: Right, there's always some noise.

A: But the shape of the noise is the interesting part. There's a hard floor. A request can't be faster than the actual work it has to do. So most of them land just above that floor, in a big hump. And then there's this long thin tail stretching way out to the right. A handful take ten or a hundred times longer than the rest.

B: And that's the tail people talk about.

A: That's the tail. And it's lopsided for a really simple reason. There's only one way to be fast, which is to just do the work. But there are dozens of ways to be slow, and they only ever add time. You got stuck waiting in line behind another request. The language runtime paused everything to clean up memory. Some backup job on the same machine grabbed the CPU. The data you needed wasn't in memory, so you went to disk. A packet got lost and the network waited before resending it. Every one of those is rare, and every one adds a lot.

B: Okay, and this is why people look at p ninety-nine instead of the average. I actually know this one. The average hides the slow ones.

A: You do know it, and that's the right instinct. Let me just make it precise. A percentile is the time that a given share of requests beat. So p fifty, which is also called the median, is the middle one. Half were faster, half slower. And p ninety-nine is the time that ninety-nine out of a hundred requests beat. So one in a hundred is slower than that.

B: And the average is kind of a tug of war between the hump and the tail.

A: Right, and it describes nobody. If almost everyone is quick and one request is horribly slow, the average lands somewhere that's way worse than what almost everyone saw, and way better than what the unlucky one saw. And one in a hundred sounds rare, but at any real traffic it happens every second. Someone clicking around a site for a minute probably meets it a few times.

<!-- section: When the tail becomes the body -->

A: But here's where rare stops being rare. Early twenty-tens, at Google, one search didn't go to one machine. It went to hundreds, sometimes thousands, each holding a slice of the index. And the answer couldn't come back until the slowest slice did.

B: Oh. So you're waiting on the worst of all of them.

A: The worst of all of them. And the machines were fast on average, and the product was still slow, because some machine, somewhere, was always having a bad moment. Jeff Dean and Luiz Barroso wrote it up in a paper called "The Tail at Scale". And their point was really blunt. At this scale you can't get rid of rare slowness. So design for it, the same way you design for machines that break.

B: How bad does it get, though? If each machine is only slow one time in a hundred.

A: Say a page needs answers from a hundred backends. Each one is fast ninety-nine times out of a hundred. Nearly two out of every three page loads hit at least one slow backend.

B: [surprised] Two out of three? From one in a hundred?

A: Because you're rolling the dice a hundred times for every page. And it gets stranger. If you ask what the typical user, the median user, actually experiences, it's roughly each backend's p ninety-nine. The backend's rare bad case has become the product's normal case. That's called fan-out. One request fanning out to many, and waiting for all of them.

B: And that's basically an agent step that calls a few tools at once. It's done when the slowest tool is done.

A: Same shape exactly. Or a search that hits several shards of a vector store and then a reranker. So a backend team saying "our p ninety-nine's fine, it's only one percent" is watching the wrong number.

<!-- section: Busy servers have huge tails -->

A: Now, the single biggest source of slow requests is just waiting in line. And this is where the really important picture comes in. Think of a coffee shop with one barista. Each drink takes about a minute.

B: Okay.

A: If someone walks in every ten minutes, you basically never wait. If someone walks in a little more often than once a minute, on average the barista keeps up. But people don't arrive evenly. Three show up at once, a line forms, and before it clears, two more walk in. And now somebody waits ten minutes for a one-minute drink.

B: Right, the average keeps up but the line still happens.

A: This was worked out a long time ago, by the way. Nineteen-oh-nine, an engineer at the Copenhagen phone company, Agner Erlang, trying to figure out how many phone lines a town needs so callers rarely get a busy signal. That's where queueing theory starts. And the result that matters for you is about how busy the server is. People call that utilization. Just the share of the time it's working.

B: [skeptical] Okay, so here's my picture. If the server's busy ninety percent of the time, there's ten percent spare. Plenty of room.

A: That's the picture almost everyone has, and it's the one that bites. The waiting doesn't grow with how busy you are. It grows with how little spare you have left. Go from half busy to ninety percent busy, and you're doing not quite twice the work, but the slow end gets about five times worse. Go from ninety to ninety-nine, a tiny bit more throughput, and the slow end gets ten times worse again.

B: So it's not a slope. It's a wall.

A: It's a hockey stick. Flat for a long time, then a bend, then nearly straight up. That bend is called the knee of the curve. Below it, extra traffic is almost free. Above it, you pay for every bit in slow requests. And it's not only about load. If some requests are much bigger than others, same average work, you get a much fatter tail at every level of traffic, because one slow request makes everyone behind it wait too.

B: And that's why people run servers at, what, well under full.

A: Right, half to two thirds busy is common. Because traffic is bursty. If you normally sit comfortably below the knee, a spike pushes you up the curve and you survive it. If you normally sit near the knee, the same spike pushes you past full, and the line just grows until something times out.

<!-- section: The lie, explained -->

A: So now back to your load test. There are two ways to generate load, and they're asking different questions. The one you used has a fixed number of workers. Each sends a request, waits for the answer, sends the next. That's called a closed loop.

B: [jumping in] But sixteen workers hammering it as fast as they can, that's basically sixteen users, right? That's a lot of pressure.

A: It feels like pressure. But think about what happens when the server slows down. Each worker is stuck waiting, so it sends less. The test backs off at exactly the moment the server struggles. Which means it can never push the server past the knee. It'll politely ride along just below it forever. At most fifteen requests are ever ahead of you in line.

B: Oh. So it physically can't find the cliff.

A: Can't find it. The other kind is called an open loop. You decide the schedule before the test starts. This many requests a second, at random times. And you stick to it no matter how the server's doing. Which is what real traffic does. Users on the internet don't know your server's having a bad day. They keep clicking.

B: And then the line just builds.

A: When I ran both of these on my laptop, against the same little server, the closed loop with sixteen workers looked calm. Then I ran the open loop at barely more traffic than that, a hair more, and the slow end was about ten seconds. Because that hair more was just past what the server could do, so the line grew for the entire test.

B: [laughs] A hair more and it's a hundred times worse.

A: And there's a name for the mistake. Around the same time as that Google paper, Gil Tene, the technical chief at a company making Java runtimes with tiny pauses, so slow requests were literally his business, started giving a talk called "How NOT to Measure Latency". He called this coordinated omission. Say your server freezes for half a second every few seconds. A closed-loop worker caught in the freeze records one slow sample, and then nothing else for the rest of the freeze, because it's stuck waiting. The test and the server have coordinated. And the requests that would have seen the freeze get omitted.

B: So the fix is the open loop.

A: The open loop, plus one detail that's easy to miss. You start the stopwatch from when the request was supposed to go out, not when it actually left. Because if your load generator was itself running late, a real user would have felt that delay too. Where you start the stopwatch decides which question you're answering.

<!-- section: Counting it honestly -->

A: Two practical things, quickly. First, you need a lot of requests to say anything about the slow end. If you only send a hundred, your "p ninety-nine" is basically just your slowest request. Two runs can disagree wildly. You want plenty of samples landing past the line you're trying to measure.

B: And the second?

A: You can't average percentiles. If you have one number per server, or one per second, and you average them, the answer can be wrong in either direction. The fix is to keep the counts instead of the percentile. There's a structure called an HDR histogram, also from Gil Tene, that stores every latency to a few digits of precision, in a fixed small amount of memory. And the lovely thing is that two of them just add together. So you keep one per machine per minute, add them up, and ask the sum for its p ninety-nine. That's the real answer.

<!-- section: Cutting the tail -->

B: Okay. So if you can't get rid of slow moments, what do you actually do about them?

A: You treat slowness like failure. Expect it and route around it. A timeout caps how long one stuck call can hurt you. A retry tries again, ideally on another copy of the service. But careful with retries. If a server is slow because it's overloaded, everyone retrying doubles its load and makes it slower, which causes more timeouts and more retries. That's a retry storm, and it can keep a service down after the original problem's gone.

B: And then there's the hedging thing.

A: That's the clever one. Send the request to one copy. If it hasn't answered after a little while, send the same request to a second copy, take whichever answers first, and cancel the other. And the trick is the waiting. If you set that delay out near the slow end of normal, only a small slice of requests ever get a second copy. So the extra load is tiny, and it's aimed exactly at the requests that were heading for the tail.

B: [skeptical] Why not just send both every time? You'd always get the faster one.

A: You would, but you've doubled your traffic to fix a one in a hundred problem. And here's when hedging goes wrong. It works because slowness is often about the machine, not the request. One copy is pausing to clean up memory, the other isn't. But if every copy is slow because they're all busy, you're adding load to a system that's slow because of load. When I tried that, hedging busy servers made the slow end worse, and sending both every time made it worse again. Each extra request pushed both copies further up the hockey stick.

B: So hedging fixes bad luck, not too little hardware.

A: Exactly that. And only hedge things that are safe to do twice. A search, a rerank, an LLM completion, fine. Charging someone's card, not unless the server can recognize a duplicate and ignore it.

<!-- section: Ending -->

B: Okay, let me try to say it back. Response times aren't one number, they're a lopsided pile, and the slow end is what people actually feel. Fan-out makes that slow end show up for most users. A busy server makes it explode, because waiting grows with how little spare you have. And a load test that waits for each answer backs off when the server struggles, so it never shows you any of that. You have to send traffic on a schedule and time it from when it should have gone out.

A: That's it. The one thing I'd sharpen is that those aren't separate facts. The knee and the lying load test are the same story. The tail lives past the knee, and a polite test never goes there. So any time someone shows you a calm latency number, the first question isn't how fast. It's, did the traffic care how the server was doing?
