<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you've got a service you're about to ship. And you do the responsible thing. You take that load generator you built, the one with the sixteen workers, and you point it at the service, a few thousand requests. And the summary comes back. Median, eighty-three milliseconds. p ninety-nine, so the slowest one percent of requests, a hundred thirty-six milliseconds. Clean. You ship it. And then a week later someone pulls up the dashboard from the real thing. Same request rate, roughly. And p ninety-nine is over a second. And every few minutes there's this cliff where it touches ten seconds. Nobody changed the code. Same server. So which number was the lie?

B: [a bit unsure] I mean, my instinct is production. Real traffic's weirder than a test, right? Different machines, some bug that only shows up with real data, something like that. The test was the controlled one.

A: [gently] That's the natural read. And it's wrong here. The load test was the lie. Not because you did the arithmetic wrong. Because of how it sent requests. Each of your sixteen workers sent a request, waited politely for the answer, and only then sent the next one. Real users don't do that. They don't know or care that your server's having a bad moment. So when the server slowed down, your test slowed down with it. And it stopped sending, well, exactly the requests that would've been slow.

B: So it was sort of being... nice to the server.

A: Very nice. It measured a gentler world than the one you shipped into. And that's one of three ideas in this episode. The other two are why it matters so much. One, latency isn't a number, it's a lopsided pile, and in a big system the rare bad requests decide how the whole thing feels. And two, as a server gets busier, those bad requests don't grow politely. They explode. At a point you can actually find on a chart.

<!-- section: Origin -->

A: The vocabulary for all this comes out of Google, early twenty-tens. One search touched hundreds, sometimes thousands of machines. Each one held a slice of the index. And the answer couldn't come back until the slowest slice did. So the machines were fast on average, and the product was still slow. Because some machine, somewhere, was always having a bad moment. In February twenty thirteen Jeff Dean and Luiz André Barroso published a paper called "The Tail at Scale", in Communications of the A C M. And its point was really blunt. At this scale you can't get rid of rare slowness. So design systems that tolerate it, the same way you design for machines that fail. That paper is where "tail latency" and "hedged requests" come from, and the fan-out arithmetic we'll get to.

B: And the load testing part? The polite workers?

A: That's a different person, around the same time. Gil Tene. He was C T O of a company called Azul Systems, which made Java virtual machines that didn't pause much.

B: [amused] So their whole business was the tail.

A: Their whole business was the tail, yeah. And he started giving a talk called "How NOT to Measure Latency". He showed that most load testing tools were systematically hiding the tail. He named the bug, coordinated omission, and he wrote a data structure for recording latencies without losing it, the H D R histogram. All three of those are coming.

<!-- section: The Idea: A pile, not a number -->

A: So start simple. Time a thousand requests to the same endpoint. You don't get one number. You get a thousand different numbers. And if you sort them and draw them as a histogram, you get a very particular shape. Picture it. On the far left there's a wall. That's the floor, the work itself, and almost nothing can be faster than that. Right after the wall there's a tall hump, where most requests land, just a bit above the floor. And then there's this long, thin tail stretching way off to the right. In a typical example the median sits in the hump at about fourteen milliseconds. The average, the mean, gets dragged out to about twenty-six. Then p ninety-nine is way out at about a hundred forty-two, where there's almost nothing. And p ninety-nine point nine is even further, around a hundred ninety.

B: And you said p ninety-nine is the slowest one percent. That's the one I actually know matters.

A: You got that right in the diagnostic, yeah. p ninety-nine tells you about the bad experiences, and the mean doesn't. So let's just make it precise. A percentile is the value below which that fraction of your measurements fall. So "p ninety-nine is a hundred twenty milliseconds" means ninety-nine percent of requests took a hundred twenty or less, and one percent took longer. Sort the samples. The one right in the middle is p fifty, which is the same thing as the median. Half were faster, half were slower. p ninety-nine is the one ninety-nine percent of the way along. And p ninety-nine point nine is nine hundred ninety-nine out of a thousand of the way along.

B: [skeptical] One percent still sounds kind of rare, though.

A: It sounds rare. Put it at real rates. At a hundred requests a second, your p ninety-nine happens every second. And a user who loads ten pages, where each page makes thirty requests behind the scenes, that's three hundred requests. They'll meet your p ninety-nine about three times.

B: [quietly] Okay. That's not rare.

A: And here's why the mean's no good. It describes nobody. Take ninety-nine requests at ten milliseconds, and one at ten seconds. What's the mean?

B: [working it out] I'd want to say... something close to ten milliseconds? Since almost all of them are ten.

A: It's about a hundred ten. That one ten-second request, spread across a hundred, adds about a hundred milliseconds to the average. So the mean is eleven times worse than what ninety-nine percent of people actually saw. And it's ninety times better than what the unlucky one saw. In a long-tailed pile the mean is a tug of war between the hump and the tail, and it doesn't tell you who's winning.

B: Huh. So it's wrong for everyone.

A: Wrong for everyone. And two rules fall out of this that people break all the time. First one. Say server A has a p ninety-nine of fifty milliseconds, and server B has five hundred. What's the p ninety-nine of the two together?

B: I mean, the obvious answer's the average. Two seventy-five.

A: [jumping in] Yeah, and that's the one that's wrong. You can't average percentiles. The real answer depends on how many requests each server handled and the whole shape of each pile. If A did almost all the traffic, the combined p ninety-nine is close to A's. If they split it evenly, it's somewhere else entirely. Same thing over time. If you take sixty per-second p ninety-nines and average them, that is not the p ninety-nine of the minute. And it can be wrong in either direction, too high or too low. To combine you need the underlying counts. Hold that thought, the H D R histogram is the fix. Second rule. Always say p ninety-nine next to how many samples you had. Remember the benchmark you did against Fireworks, where you only had twenty samples? With twenty samples, "p ninety-nine" is just your slowest request. That's all it can be.

<!-- section: The Idea: Why the pile is lopsided -->

A: Now, why that shape? Why a wall on the left and a long tail on the right? The left edge is a wall because a request can't be faster than its work. The right edge is wide open, because there are dozens of ways to be slower, and every one of them only adds time. Waiting in line is the big one, if another request is being served when yours shows up, you wait. That one's so important it gets its own whole part in a minute. Then pauses. Python, Java, Go, they all have a garbage collector, the part of the runtime that finds memory nobody's using anymore and frees it. And some collectors briefly stop every thread in the program while they work. So a stop-the-world pause of fifty milliseconds, and every request in flight just sits there. Then the machine doing something else. A backup kicks off, a cron job runs, another container on the same box steals CPU. People call that one the noisy neighbour. Then cold caches. After a deploy, or after something gets evicted, a request has to go to disk instead of RAM. And from the latency numbers, that can be up to a thousand times slower for that read.

B: That's the RAM versus disk ladder thing.

A: That's the one. Then the network. A packet gets lost, and TCP waits before it resends. And on Linux that wait has a floor of about two hundred milliseconds.

B: [surprised] Two hundred? That's longer than most of my whole requests.

A: Longer than most whole requests, yeah. One dropped packet and you're in the tail. And last, locks. Two requests want the same database row, or the same mutex, and one of them waits. Each of these is rare, and each adds a lot when it happens. Stack a bunch of rare-but-large delays on top of a fixed floor and you get exactly that shape. And that's not a bug in your server. It's just what latency looks like on, like, every computer anyone's ever measured.

<!-- section: The Idea: Fan-out -->

A: Okay. Here's where rare stops being rare. Most real requests aren't one call. A search goes out to a bunch of index shards. A shard is a slice of a big dataset, an index, a table, a vector store, where each slice lives on a different server, so a query that needs all the data has to ask every shard. A RAG pipeline queries several vector-store shards and then a reranker. One step of an agent calls three tools in parallel. And in every one of those, the answer can't come back until every piece has. That's called fan-out. One incoming request turns into many outgoing ones, and you need all of them back. Which means the user doesn't see a backend's typical latency. They see the worst of N draws.

B: The worst of N. Okay.

A: So try this. A page needs answers from a hundred backends, in parallel. Each backend is fast ninety-nine percent of the time, and slower than its own p ninety-nine the other one percent. What fraction of page loads hit at least one slow backend?

B: [working it out] Each one's slow one percent of the time... so with a hundred of them, I want to say it adds up a bit. Maybe, I don't know, a few percent? Five?

A: About sixty-three percent.

B: [surprised] Sixty-three?

A: Sixty-three. Think about it the other way around. The page is fast only if every single backend is fast. Each one's fine with a chance of ninety-nine percent. For all hundred to be fine, you multiply ninety-nine percent by itself a hundred times. And that comes out to about thirty-seven percent. So everything else, about sixty-three percent of page loads, hits at least one backend's tail. Most of your users are now living in what each backend team thinks of as its rare bad case. And that's exactly the example from the paper. Servers that are ten milliseconds typically, with a p ninety-nine of one second. A request that needs a hundred of them. Sixty-three percent of user requests take over a second.

B: [laughs] So I was adding when I should've been multiplying.

A: Yeah. Now picture a little calculator for this. There's a slider for how many backends each request needs, going from one all the way up to five thousand. There are three buttons for what "slow" means: past the backend's p ninety, past its p ninety-nine, or past its p ninety-nine point nine. And under that there's a grid of a hundred little squares, a hundred user requests. Every square that hit at least one slow backend fills in. So you start at one backend, past p ninety-nine, and one square's filled. Drag to ten, and about ten fill in. Drag to a hundred and the grid's mostly blue. Drag to a thousand and it's basically solid. Then switch to p ninety-nine point nine and it backs off, until you drag again.

B: And there was a second number on it?

A: The second readout is the one to actually sit with. It turns the question around. What does the median user see? So, a request needs all N backends. What latency do all N backends beat half the time? Well, if each backend beats some latency with a certain chance, all N of them do with that chance multiplied by itself N times. And you want that to come out to one half. For a hundred backends, the chance you need per backend works out to about ninety-nine point three percent. So the typical user of a hundred-way fan-out sees each backend's p ninety-nine point three.

B: [working it out] Wait. So the median user, the totally normal one, is living out at the backend's p ninety-nine?

A: That's it. The backend's tail has become the product's median. So a backend team that says "our p ninety-nine is fine, it's only one percent" is watching the wrong number. And the paper had a measurement that makes the same point from the other end. In one Google service, a root server waiting on a hundred leaf servers, the slowest five percent of the leaf requests accounted for about half of the root's ninety-ninth percentile latency.

B: [skeptical] This all assumes the backends are slow independently, though. Like if they all share one switch and it gets overloaded, they're all slow at once.

A: True. The formula assumes independence, and shared causes like that switch break it. The exact numbers move. But fan-out still amplifies the tail. And it scales in a pretty brutal way. Say fifty backends, each with a p ninety-nine of a hundred milliseconds. All fifty beat their p ninety-nine about sixty-one percent of the time, so about thirty-nine percent of user requests take a hundred milliseconds or more. Versus one percent per backend. The median user sees each backend's p ninety-eight point six. Go to five hundred backends, and the chance all of them are fast drops to under one percent. So over ninety-nine percent of user requests hit somebody's p ninety-nine.

B: [working it out] So every time you multiply the fan-out by ten...

A: You push what users feel about one more nine into the backend's tail. Which is why at scale people stop talking about p ninety-nine and start caring about p ninety-nine point nine and beyond. Or they hedge, which we'll get to. Or they cut down the fan-out.

<!-- section: The Idea: Queues -->

A: Now the biggest single source of tail latency. Waiting in line. One quick comparison. A coffee shop with one barista, each drink takes about a minute. If a customer walks in every ten minutes, you basically never wait. Now say customers come every one point one minutes. On average the barista keeps up. But people don't arrive evenly. Three show up together, a line forms, and before it clears two more walk in. And some customers end up waiting ten minutes for a one-minute drink.

B: And the drink is a request, the barista's my server.

A: And the line's the queue in front of your GPU. The math for this is old, actually. Nineteen oh nine. Agner Krarup Erlang, an engineer at the Copenhagen Telephone Company, had to figure out how many phone lines a town needed so callers rarely got a busy signal, without paying for a bunch of lines sitting idle. He treated calls as random arrivals, and the paper he published is the first one in what became queueing theory. That same math now sizes call centers, CPU schedulers, and, yeah, the request queue in front of your GPU.

A: Three names, and they're all simple. The arrival rate is how many requests show up per second on average. People write it with the Greek letter lambda. The service time is how long the server actually spends working on one request, not counting any waiting. And it sets a hard ceiling. If each request takes ten milliseconds of work, the server can finish at most a hundred a second, ever. That ceiling's called the service rate, and its letter is mu. And the third one, utilization, is the fraction of the time the server's busy. You get it by multiplying the arrival rate by the service time. Ninety requests a second times ten milliseconds each is nine tenths. Busy ninety percent of the time. Its letter is rho, and it has to stay below one, or the line just grows forever.

B: Below one makes sense. You can't be busy a hundred and ten percent of the time.

A: Right, the extra just piles up. Now, the simplest useful model of all this has a funny name, M M one. It's a shorthand. The first M says requests arrive at random. The second M says each one takes a random amount of work, with a particular shape I'll describe in a second. And the one says there's one server. It's kind of the hello world of queueing theory. And you don't need the derivation. You need two results.

A: First result. The average time a request spends in the system, waiting plus being served, is the service time divided by the fraction of time the server is idle. So at fifty percent busy, it's idle half the time, and you divide by a half. Double the service time. At ninety percent busy it's idle a tenth of the time, so you divide by a tenth. Ten times the service time. At ninety-nine percent, a hundred times.

B: And that's just the average.

A: That's just the average. The second result is about the tail. In this model the total time has what's called an exponential distribution. That's the shape of waiting for a random event that's equally likely at every moment. Lots of short values, a few long ones. And for that shape the percentiles are fixed multiples of the average. The median's about seven tenths of it. And p ninety-nine is about four point six times the average.

A: So put numbers on it. Ten milliseconds of work per request. And these numbers were checked by simulating four hundred thousand requests in Python, and the simulation lands within a few percent of the formula. At fifty percent busy, the average is twenty milliseconds, and p ninety-nine is about ninety-two. Already nine times the actual work. At eighty percent, p ninety-nine's about two hundred thirty. At ninety percent, the average is a hundred, and p ninety-nine is about four hundred sixty milliseconds. Forty-six times the work. At ninety-five, about nine hundred twenty. And at ninety-nine percent busy, the average is a full second, and p ninety-nine is four point six seconds. For ten milliseconds of work.

B: [skeptical] Hang on. I'd have guessed it goes up kind of in proportion. Like, ninety percent busy is a bit worse than fifty, because you're doing a bit under twice the work.

A: That's the intuition everyone starts with. And that "divide by the idle fraction" is the whole story of why it's wrong. From fifty to ninety percent busy, the server does one point eight times more work, and p ninety-nine gets five times worse. From ninety to ninety-nine percent, you get ten percent more throughput, and p ninety-nine gets ten times worse. It's not proportional at all. It's the idle fraction going to zero underneath you.

A: So here's one to try. A server takes ten milliseconds per request on average, and you run it at ninety percent busy, ninety requests a second. What's the p ninety-nine? And then, if every request took exactly ten milliseconds, no variation at all, is that better, worse, or the same?

B: [confident] The first one you just said, about four sixty. And the second... if every request is exactly ten milliseconds, and you're under capacity, I'd think there's basically no queue. So p ninety-nine's like ten.

A: It's better. But only about half. The simulation gives around two hundred twenty milliseconds. Still more than twenty times the work.

B: [puzzled] Why? Nothing's random anymore.

A: The arrivals still are. Requests still bunch up, three at once, then a gap. So lines still form. You only removed one of the two sources of randomness. Variability in either arrivals or service makes queues worse, and near full utilization every bit of it gets amplified.

A: Now picture a simulator for this. There's a slider for arrivals per second, and readouts across the top for utilization, mean, p fifty, p ninety-nine, p ninety-nine point nine. Under that, a histogram of latencies, and a curve of p fifty and p ninety-nine against utilization, with a dot showing where you are right now. Drag the slider up slowly. Up to about sixty percent busy, p ninety-nine barely moves. The histogram's tight. Past about eighty, the curve bends up hard and the histogram starts stretching to the right. Past ninety-five, every little step on the slider multiplies p ninety-nine. And then there are three buttons for the service time. Constant. Exponential. And one called rare a hundred milliseconds, which is mostly quick requests with an occasional slow one, and the same ten millisecond average. Switch to that one and the tail's fatter at every load.

B: Even at the same utilization?

A: Even at the same utilization. Because one slow request makes everyone behind it wait too. And there are three things to take from that simulator. First, the shape. Latency against utilization is flat, then it bends, then it goes nearly vertical. A hockey stick. The bend is called the knee of the curve. Below the knee extra load is almost free. Above it, you pay for every bit of it in tail latency. And real servers often have a sharper knee than M M one, because an overloaded server also does more work per request. Caches go cold, locks get contended, clients start retrying.

A: Second, variability is the enemy, not just load. Those three service settings have the same average, so the same utilization, and very different tails. There's a rule called Kingman's formula that says the average wait is roughly three things multiplied together. A busyness factor, which is the busy fraction divided by the idle fraction. A variability factor, which is basically how jittery the arrivals are plus how jittery the service times are, averaged. And the service time itself. With random arrivals and random service, the variability factor is about one. Make the service perfectly constant, and you've zeroed out half of it, so it drops to about a half. Which lines up with that "about half" from a minute ago.

B: So you can attack either factor.

A: Either one. Lower the busyness with more servers. Or lower the variability. Cap how big a request can be, split big jobs up, or move the slow one percent off into its own queue so they're not blocking the quick ones.

A: [relaxed] And third, this is why people run servers at fifty to seventy percent busy. It's not waste. The knee is there, and traffic is bursty. If you normally sit at sixty percent, a spike of thirty more points takes you to ninety, and p ninety-nine goes up something like four or five times. If you normally sit at eighty-five, the same spike takes you past a hundred, and the queue just grows until something times out. And in the baseline lesson, that naive model server on the Spark, the one that served one request at a time, had to stay near one percent utilization for ninety-nine percent of requests to see no wait at all. That was this curve at its most brutal.

B: [a bit unsure] Okay so, a thing I'd actually say at work. We're at sixty percent CPU at peak. Someone wants to cut the fleet by a third to save money. That still leaves headroom, right? We'd be at, like, ninety.

A: [amused] That's the trap, right there in the sentence. Same load on two thirds of the machines puts you at ninety percent. Time in the system goes like one over the idle fraction. At sixty percent busy that's one over four tenths, two and a half. At ninety it's one over a tenth, ten. So it roughly quadruples, and the tail goes with it. With ten milliseconds of work, p ninety-nine goes from about a hundred fifteen milliseconds to about four sixty. And there's no headroom left. A fifteen percent spike takes you past a hundred, and the queue grows until timeouts and retries make it worse.

B: [laughs] So the answer is no.

A: The answer is measure it. Find your latency against load curve, find the knee, and size the fleet so peak sits below it with room for spikes. A fifteen percent cut might be safe. A third probably isn't.

<!-- section: The Idea: Closed loop and open loop -->

A: So back to the lie from the start. There are two ways to generate load, and they answer different questions. The first is closed loop. A fixed number of workers, sometimes called virtual users. Each one sends a request, waits for the answer, then sends the next. Your load generator is one. Remember how it works. It has a semaphore, which is like a gate with c tickets. A request has to grab a ticket to go out, and it gives it back when it finishes. So at most c requests are ever in flight, and a new one only starts when an old one finishes.

A: The second is open loop. Before the test starts, you decide when every request goes out. Say a hundred a second, at random times. And then you stick to that schedule no matter how the server's doing. Like real users, who don't wait for each other.

B: [skeptical] I'd have thought the closed loop's the tougher test, though. If sixteen workers isn't enough, you add more workers until it breaks.

A: That's the wrong picture, and Little's Law is how you see why. Quick reminder of what that is. In any stable system, the number of things in flight equals the rate they come in times how long each one stays. A closed loop fixes the number in flight. It's c. So the throughput is forced to be c divided by the latency. When the server slows down, latency goes up, so the generator sends fewer requests per second. It backs off exactly when the server's struggling. Which means it can never push the server past its knee. Add more workers and you just get more requests standing in line, each one waiting a little longer. An open loop fixes the rate instead. So when the server slows down, it's the pile of unfinished requests that grows. And that's what real traffic does. People on the internet don't know your server is slow. They just keep clicking.

B: So the closed loop basically can't see the cliff.

A: Can't see it. On a Mac, closed loop with sixteen workers drove the server to about a hundred eighty-five requests a second, and p ninety-nine was a hundred thirty-six milliseconds. An open loop at a hundred ninety a second, a hair more, got a p ninety-nine of ten seconds. Because a hundred ninety was just past capacity, so the queue grew for the entire test. One test asked "how fast is it when we're careful?" The other one asked "what happens when traffic doesn't care?"

A: And the cleanest way to see the difference is to freeze the server. Picture two timelines, one above the other, time running left to right. In the middle, a shaded band where the server's frozen for five hundred milliseconds. On the top line, one closed-loop worker. Little boxes, request, request, request, then it gets caught inside one request when the freeze starts. That one box stretches all the way across the freeze. Then the little boxes start again on the other side. One slow sample, and nothing else sent. On the bottom line, the open loop. Ticks at a steady rhythm, before, during, after. And every tick inside the freeze is a request that should've gone out. Ten of them. Each one waits for the freeze to end. So you get a staircase of slow ones, five hundred, four eighty, four sixty, all the way down to twenty, measured from when each one should have been sent.

B: [slowly] Same freeze. One bad number on top, ten on the bottom.

A: One bad sample versus a whole column of them.

<!-- section: The Idea: Coordinated omission -->

A: That's the bug Gil Tene named. Say your server freezes for five hundred milliseconds every five seconds. A garbage collection pause, a disk that stalls, whatever. So it's frozen about nine percent of the time. A closed-loop worker caught mid-request records one five hundred millisecond sample, then nothing for the rest of the freeze, because it's waiting. The generator and the server have, kind of, coordinated. The generator left out exactly the requests that would've seen the freeze. That's coordinated omission. The load generator stops sending while the server's slow, so the slow periods get under-sampled, and the tail looks way better than what real users would see.

A: Let's put numbers on it. Your server does about a hundred fifty requests a second, normally answers in five milliseconds, and freezes for five hundred every five seconds. You test it with one closed-loop worker for twenty seconds, about three thousand requests. What p ninety-nine does it report? And what would real users see, a hundred a second, arriving at random?

B: [working it out] Well, it's frozen nine percent of the time. So that's way more than one percent. I'd say the closed loop sees it. p ninety-nine's around five hundred?

A: That's the trap. The closed loop reports about twenty-five milliseconds. Twenty-five and a half, measured on a Mac. Think about how many slow samples it actually got. Twenty seconds, a freeze every five, that's four freezes. And the worker records one slow sample per freeze. Four slow samples out of about twenty-nine hundred. That's nowhere near one percent, so p ninety-nine doesn't even notice them. The only thing that gives it away is the max, five hundred eighteen milliseconds.

B: And the real users?

A: An open loop at a hundred a second, measuring from when each request was supposed to be sent, reported a p ninety-nine of four hundred seventy-three milliseconds. Here's why. The server's frozen about nine percent of the time, so about nine percent of real arrivals land in a freeze. And on average they wait about two hundred fifty milliseconds for it to end, because they land somewhere in the middle. Nine percent is way over one percent, so p ninety-nine sits deep inside the freeze. Same server. Nineteen times different p ninety-nine.

B: [sighs] Okay, that's kind of horrifying.

A: There are two fixes, and they're really the same idea. The first is, generate load open loop and measure from the intended send time. You decide the whole schedule up front. Request number i goes out at the start time plus i divided by the rate, or with random gaps that average out to that. And you compute latency as when it finished minus when it was supposed to go out. Not minus when it actually went out. So if your generator was late sending a request, maybe because it was stuck itself, that lateness counts. A real user would've felt it.

A: The second fix is to correct afterwards. If a closed-loop worker meant to send every five milliseconds and one request took five hundred, it knows it skipped about ninety-nine sends. So you back-fill them. One sample at four ninety-five, one at four ninety, and so on, down to five. The latencies those skipped requests would have seen. And that's what a function in the H D R histogram library does, it's called record corrected value, and you hand it the latency plus the interval you meant to send at. It's an estimate, and it needs you to say what the intended rate was. But it's far better than nothing.

B: Does this only happen in, like, hand-rolled tools?

A: It hides in places you wouldn't look. There's a classic H T T P benchmark tool called work, spelled W R K, and it has it. Tene wrote a version called W R K two that sends at a fixed rate and measures from the intended time. And any tool that starts the stopwatch after waiting for a free connection, or a free worker, or a semaphore ticket, has it. Including yours. Your load generator starts the stopwatch after it gets through the semaphore gate.

B: [realizing] Oh. So the time spent waiting for a ticket just... isn't counted.

A: Isn't counted. And for a closed-loop tool, that's honest. That's the question it's asking. But the moment you treat it like a schedule, like "this is what users would see", it's coordinated omission. And you'll reproduce exactly that later.

<!-- section: The Idea: Samples and HDR histograms -->

A: Two practical problems left. How many samples you need, and how to store them. Samples first. You can't measure p ninety-nine with a hundred requests. You can barely do it with a thousand. Here's a simulation. Take a distribution whose true p ninety-nine is forty-six milliseconds. Draw some samples, estimate p ninety-nine, and repeat that two thousand times, and see how much the estimate wanders. With a hundred samples, the middle ninety percent of your estimates run from thirty-one to fifty-seven milliseconds. With a thousand, forty-one to fifty-one. Ten thousand, forty-four to forty-eight. And a hundred thousand, forty-five and a half to about forty-six and a half.

B: So at a hundred samples, two runs of the same thing could disagree by...

A: Almost two times. Because at a hundred samples, p ninety-nine is just the slowest or second-slowest request. So the rule of thumb is you want at least ten samples past the percentile you care about. A thousand plus for p ninety-nine, ten thousand plus for p ninety-nine point nine. A ten-minute test at a hundred a second gives you sixty thousand. Plenty. And the flip side, a p ninety-nine point nine from a thirty-second test is just a max with extra steps.

B: [laughs] Okay.

A: Then storage. A Python list of every latency is fine for a test. It's not fine for ten thousand requests a second, all day, on fifty machines, when you want p ninety-nine per minute per endpoint. You need some kind of summary.

B: [a bit unsure] Couldn't you just keep counts in buckets? Like zero to ten milliseconds, ten to twenty, and so on.

A: That's the naive one, and it fails in a specific way. Fixed-width buckets either need millions of them, to cover microseconds up to minutes, or they're so wide they lose all the detail at the low end, where most of your requests actually are. And keeping a mean loses the tail, we already know that. So the H D R histogram, high dynamic range, solves it by making the bucket width grow with the value. The buckets go in powers of two. One to two microseconds, two to four, four to eight, and so on. And each one is split into the same number of equal sub-buckets, enough to keep, say, three significant digits. So a latency of one point two three four milliseconds gets stored as "somewhere within a twentieth of a percent of one point two three four milliseconds". And so does twelve point three four seconds. Same relative precision.

B: How big does that get?

A: Small. A histogram covering one microsecond up to an hour, at three significant digits, is about a hundred eighty-five kilobytes with sixty-four bit counters. That was checked with the Python package. And that size doesn't change no matter how many values you record. Recording a value is a couple of arithmetic operations and adding one to a counter.

A: And here's the killer feature. Histograms add. Two of them with the same layout combine by adding the counts, bucket by bucket. So you record one histogram per machine per minute, add them all up, and ask the sum for its p ninety-nine. And you get the true p ninety-nine of all those requests, to three significant digits. That's the fix for "you can't average percentiles". You keep histograms, and you only compute percentiles at the very end. And Prometheus histograms and Open Telemetry's exponential histograms are versions of the same idea.

<!-- section: The Idea: Cutting the tail -->

A: So now, what do you actually do about the tail? You can't make every machine fast every time. That was Dean and Barroso's whole argument. Treat slowness like failure. Expect it, and route around it. The simplest tool is a timeout, the longest a client will wait before giving up. It caps how much one stuck call can hurt you. But it turns "slow" into "failed", and then you have to handle the failure. So set it from data, a bit above your p ninety-nine point nine, not some round number. And decide up front what happens when it fires.

B: And what happens is you retry.

A: Often, yeah. Ideally on a different replica, one of the identical copies of the service. But a retry is extra load. And you just saw what extra load does near the knee. If a server's slow because it's overloaded, retries double its load and make it slower. That's a retry storm. Slowness causes timeouts, timeouts cause retries, retries add load that causes more slowness. And it can keep a service down even after the original problem's gone. So real systems cap retries with a budget, say at most ten percent extra traffic, and back off by a random amount between attempts. More on that in the rate limits lesson.

A: Then the clever one. Hedged requests. You send to one replica. If it hasn't answered within some delay, you send the same request to a second one, use whichever answers first, and cancel the other. Picture a timeline. Client at the top, two replicas underneath. At time zero, the client sends to replica A. And A hits a stall, a G C pause, a busy disk, something. Ten milliseconds go by, no answer. Ten milliseconds is about the p ninety-five here. So the client sends a copy to replica B. B does six milliseconds of real work and answers. Done at sixteen milliseconds, cancel A. Without the hedge, A would've taken a hundred.

B: [skeptical] Why wait at all, then? Just send to both every time, take the faster one.

A: You can. But two copies of every request doubles your load, to fix a one percent problem. The trick is the delay. If you only hedge once a request has been out longer than your p ninety-five, then only about five percent of requests ever get a second copy. About five percent extra load, and it's aimed exactly at the requests that were headed for the tail. The paper reports a Bigtable benchmark, that's Google's big distributed table store, where hedging after ten milliseconds cut the p ninety-nine point nine for a thousand-key read from eighteen hundred milliseconds to seventy-four. While sending only two percent more requests.

B: [impressed] Eighteen hundred to seventy-four. For two percent.

A: For two percent. And it works because tail slowness is often about the machine, not the request. Replica A is in a garbage collection pause, replica B isn't. And that tells you the two cases where it fails. One, when the slowness is the request itself. If the query's slow because it's a huge query, sending it twice gets you two slow answers and double the work. Two, when the slowness is load. If every replica is slow because they're all near the knee, hedging adds load to a system that's slow because of load. That one isn't subtle when you measure it.

A: And only hedge things that are safe to do twice. A read, a search, a rerank, an L L M completion, fine. "Charge this card"? Not without an idempotency key. That's a unique I D you send with the request, so the server can recognise a duplicate and ignore it.

A: There are refinements, too. Tied requests, also from Dean and Barroso. You send to two servers at once, but each one's told about the other. Whichever one starts working on it first tells the other to cancel. So you get the latency benefit and the duplicate almost never costs real work. And backup tasks, which is the batch-job version, from Map Reduce, Dean and Ghemawat, two thousand four. Near the end of a job, the last few straggling tasks get re-launched on other machines, and you take whichever copy finishes first. The Map Reduce paper reported one large sort took forty-four percent longer with that feature turned off. And in your world, it's the same shape. An L L M request stuck behind a giant prompt on one replica. A vector index shard on a sick machine. A flaky tool A P I.

<!-- section: Build It -->

A: So here's what you'd build. Everything goes in one folder, and at first the server and the load generators run on the same machine. Which is fine, as long as you remember the generator itself costs CPU. One H T T P X async client adds about three milliseconds per request on a Mac, and it tops out somewhere around a thousand requests a second. So keep the server's capacity well under that. You install H T T P X, numpy, a plotting library, and the H D R histogram package. Small gotcha, the package is called H D R histogram, but it imports as H D R H.

A: Then a server with knobs. It's plain async I O with a hand-rolled bit of H T T P, so no framework overhead blurring the picture. And every kind of slowness from this episode is a flag. How many requests it serves at once, where one makes it a single-server queue, basically the M M one from before, and zero means unlimited. The average service time. Whether service times are exponential or constant. A chance that any request is a straggler, and how slow stragglers are. And a freeze. Every so many seconds, freeze the whole event loop for so many milliseconds.

B: How does it freeze the whole loop?

A: [amused] It does the thing you're never supposed to do. It calls the blocking sleep inside the event loop. Remember, one blocking call and nobody else runs. Here that's on purpose. It's a stand-in for a stop-the-world garbage collection pause. With the defaults, one worker, five milliseconds average, on paper the capacity is two hundred a second. In practice it's a bit less, because each request also pays for timer wake-ups and parsing H T T P. On a Mac it topped out around a hundred eighty-five.

A: Then the first generator, closed loop. You adapt your old load generator so instead of sending some total number of requests, it runs c workers for some number of seconds. Each worker loops. Stamp the time, send, wait for the answer, record, repeat. One shared client, connections capped at c, and no timeout at all. A load test should never silently drop the slow ones. And it prints how many samples you got, the achieved requests per second, the mean, p fifty, p ninety-nine, p ninety-nine point nine and the max. You run it at one, two, four and sixteen workers, ten seconds each. But before you do, use Little's Law to predict the throughput with one worker.

B: [working it out] With one worker there's exactly one request in flight. So the rate is just one divided by how long each one takes. If each takes, what, five milliseconds of work plus a bit for the client... call it six or seven... so somewhere around a hundred fifty a second?

A: That's the right method. The measured number was a hundred fifty-five, which means each round trip was taking about six and a half milliseconds on average, all in. So you'd land in the right neighbourhood just from Little's Law, before running anything.

A: The second generator is open loop, and it's the one that tells the truth, so the details matter. You build the whole schedule before you start, random gaps that average out to your target rate. Then you walk through the schedule. For each request, you sleep until its scheduled moment, or skip the sleep if you're already late, and then launch that request as its own task. Inside the task you note when it actually went out, send it, note when it finished. And you record two latencies. Finished minus intended, and finished minus actually sent.

B: [a bit unsure] Its own task per request. Isn't that kind of just a closed loop with a huge number of workers?

A: No, and this is the whole point. A worker waits for its request before sending another. Here nothing waits for anything. The schedule fires whether or not earlier requests came back. A couple more details. The connection pool can't be the thing that queues, so give it a couple thousand connections, which at a few hundred a second is never the limit. Print the achieved rate next to the target. If they differ when the server isn't overloaded, your generator's the bottleneck, and every number it prints is suspect. And why record both latencies? Right now they'll match, because your generator never falls behind. Later they come apart.

A: Then a sweep. You run the open loop at a range of rates against the default server, twenty seconds each. Pick the rates from your closed-loop capacity number, something like ten, thirty, fifty, seventy, eighty, eighty-five, ninety, ninety-five, and a hundred percent of it. Restart the server between runs, or at least let it drain, because a run past capacity leaves a backlog that pollutes the next one. And plot p fifty and p ninety-nine against offered load, twice. Once with a normal y axis, where you'll see the hockey stick. And once with a logarithmic y axis, so you can actually see the tail at low load. Mark where you'd draw the line if your target were "p ninety-nine under a hundred milliseconds". Then overlay the M M one prediction. p ninety-nine is four point six times the service time, divided by the idle fraction. Use your one-worker latency as the service time, and your rate over capacity as the utilization. And ask, where does reality depart from the cartoon, and why?

A: Then you catch coordinated omission on purpose. Restart the server with a five hundred millisecond freeze every five seconds. Run closed loop with one worker, closed loop with four, and open loop at a hundred a second, twenty seconds each. Write your three predictions first. Then re-run the one-worker test, but record into an H D R histogram as well. You set it up to hold values in microseconds, from one microsecond to sixty seconds, three significant digits. And you record with the corrected function. The expected interval is how often the worker meant to send. For a closed loop running flat out, that's the typical latency you measured without stalls. Then you compare three p ninety-nines, corrected, open loop, and raw closed loop. And then you check the histogram's total count against how many requests you actually sent, and figure out why they don't match.

A: Then hedging. You start two replicas with rare, independent stragglers. Five milliseconds of constant work, but three percent of requests take a hundred. Unlimited workers, so the slowness is about bad luck on the machine, not about queueing. And you write three strategies. Plain, pick one replica at random. Hedged, send to one, wait up to the delay, and if it's not back, send to the other and take whichever finishes first, cancelling the loser. And both, send to both every time. That's the "always hedge" baseline. In async I O the hedged one is two waits. First, wait on the first request with a timeout. Then, if it's still going, wait on both for whichever completes first. You drive each with your open loop, a hundred a second for thirty seconds, and you count every request you actually send, so you can report extra load as a percentage. Run hedged with the delay near your measured p ninety-five, which you get from the plain run, and a couple of delays either side. Then have an agent review two things. That the losers really get cancelled, so a cancelled request closes its connection instead of leaking it. And that the counter only counts the second request if it was actually sent.

A: And last, the one that ties back to your real work. Your benchmark harness from the Fireworks comparison is closed loop. So you give it an open-loop mode. A rate option, random arrivals, as an alternative to the concurrency option. Time to first token and end-to-end, both measured from the intended send time. And H D R histograms saved next to the JSON results. The library can encode a whole histogram into a compact string. Run it against the fake streaming server you tested the harness with, at about eighty percent of its capacity. And then, if you've got an hour on the Spark, find the knee of your naive model server the same way.

B: Which is going to be...

A: At a laughably low rate. That's the point. So by the end you've got four scripts that all print achieved rate, p fifty, p ninety-nine, and how many samples. A latency against load plot with the knee marked, and a rate you'd actually run this server at for p ninety-nine under a hundred milliseconds. A closed-loop test and an open-loop test disagreeing by more than ten times on the same server, which you can explain in one sentence. And hedging's improvement and its extra load, measured, plus knowing when it'd make things worse.

<!-- section: Measure -->

A: So, what the numbers look like. These are from an M-series MacBook, Python three point fourteen, H T T P X zero point two eight, client and server on the same machine. Yours will differ in the details. The shape shouldn't. And use runs of at least twenty seconds, with the sample count next to every percentile.

A: Default server, closed loop first. One worker, about a hundred fifty-five a second, median four point seven milliseconds, p ninety-nine twenty-five. Four workers, a hundred seventy-five a second, p ninety-nine fifty-four. Sixteen workers, a hundred eighty-five a second, median eighty-three, p ninety-nine a hundred thirty-six. That last one's the opening scene.

B: [working it out] So sixteen workers is the server as busy as it gets... and p ninety-nine is still only a hundred thirty-six.

A: Right, and here's why. With sixteen in flight, at most fifteen can be ahead of you. That's it. More workers just means linearly more latency. The closed loop never breaks. It can't show you the cliff. Now the open loop. At fifty a second, p ninety-nine about thirty-four. At a hundred a second, forty-three to fifty. At a hundred fifty, somewhere between a hundred eighteen and a hundred fifty-six. At a hundred sixty-five, two hundred fifty-two. And at a hundred eighty-five to a hundred ninety a second, the achieved rate falls to about a hundred thirty, the median's four or five hundred milliseconds, and p ninety-nine is ten to eleven seconds.

B: [surprised] Ten seconds, from five millisecond requests.

A: And that's not because each request got slower. The backlog grows for the entire test. So p ninety-nine is set by how long the test ran. A p ninety-nine that grows with test duration is the signature of being past capacity. Before that, p ninety-nine roughly doubles from fifty to a hundred thirty a second, and then triples again by a hundred sixty-five. So the knee was around a hundred thirty to a hundred fifty a second. Seventy to eighty percent of capacity, about where M M one says it should be.

A: And runs near the knee are noisy. Two runs at a hundred fifty gave p ninety-nine a hundred eighteen and a hundred fifty-six. And once a hundred seventy-five a second actually beat a hundred sixty-five. Near the knee, one unlucky burst builds a queue that drains slowly, so one run might catch several of those and another catches none. The variance blows up along with the mean. So run those points longer.

A: Then the freezing server. One closed-loop worker, p ninety-nine twenty-five and a half milliseconds, max five hundred eighteen. The freezes only show up in the max. Four workers, p ninety-nine fifty-five, but p ninety-nine point nine jumps to five hundred thirty-three.

B: Because with four workers, four requests get caught in each freeze instead of one.

A: Yeah, four times as many slow samples, enough to reach the p ninety-nine point nine but still not the p ninety-nine. Then the corrected histogram gives a p ninety-nine of four hundred twenty-nine. And the open loop at a hundred a second, four hundred seventy-three. So the correction lands within ten percent of the truth. But its total count came out about double the requests actually sent. Because the correction also back-fills for ordinary slow requests, any time one takes longer than the expected interval. It's an estimate. A useful one.

A: And hedging. Two replicas, five milliseconds constant, three percent of requests at a hundred. Open loop, a hundred a second, thirty seconds, so three thousand samples. Plain: median about eight, p ninety-five about thirteen, p ninety-nine a hundred five. Hedged at ten milliseconds: p ninety-nine twenty-one, for about four percent extra requests. Hedged at fifteen: twenty-six. At twenty: thirty-one, about three percent extra. And both, every time: p ninety-nine fifteen and a half, for a hundred percent extra. And about three milliseconds of every one of those numbers is just the client. A request on localhost through H T T P X costs that much on its own.

B: So twenty-one is basically... the ten millisecond delay, plus one normal request.

A: That's it, the delay plus one normal request. Exactly what the timeline picture predicts. A hundred five down to twenty-one for four percent more requests. Sending both every time is better still, at double the cost. And don't read anything into the p ninety-nine point nine column there. With three thousand samples it's the third-slowest request, and it's decided by whether both copies of some request happened to be stragglers, which happens about one time in a thousand.

<!-- section: Break It -->

A: Now break it, four ways. First, what if you hedge a server that's slow because it's busy? Restart the two replicas as plain queues. One worker each, five milliseconds, no stragglers. Drive them at a hundred forty a second total, so each is about forty percent busy. Now the tail comes from queueing, and queueing comes from load.

B: I'd still expect hedging to help a bit. A copy goes to the other replica, which might have a shorter line.

A: [amused] It made it worse. Plain gave p ninety-nine thirty-nine milliseconds. Hedged with a twelve millisecond delay, which was below the p ninety-five of twenty-seven, sent thirty-four percent extra requests, and p ninety-nine went to fifty-eight. And sending to both every time made it worse again, sixty-four, with each replica now about seventy-five percent busy. Every extra request pushed both replicas further up the hockey stick. So hedging fixes random bad luck on one machine. It doesn't fix not having enough machines. And always set the delay from the measured p ninety-five, not from a guess.

A: Second, put coordinated omission back into an open loop. In the open-loop generator, wrap each request in a semaphore of four, and take the sent time after getting through the gate. So at most four are in flight, which is what a lot of real load tools quietly do with a fixed connection pool. Run it at a hundred a second against the freezing server. Measured from the gate, p ninety-nine was fifty-two milliseconds. Measured from the schedule, five hundred fifteen.

B: [skeptical] But it's still sending on a schedule.

A: It's deciding on a schedule. But it's measuring from when it got around to it. And that's what your old load generator does with its semaphore. So, where you start the stopwatch decides which question you're answering.

A: Third, average your p ninety-nines. Have the open loop also compute p ninety-nine for each one-second window, and compare the average of those to the p ninety-nine of the whole run. Against the freezing server they disagree badly. And it goes either way. In a quick simulation with twenty windows, when the freeze window had only a few requests in it, the average of the p ninety-nines was forty-seven milliseconds against a true p ninety-nine of twenty-six. When the freeze window had as many requests as the others, the average said forty-six, against a true four hundred two.

B: So once it's too pessimistic and once it's way too optimistic. Off the same kind of data.

A: Same kind of data, opposite errors. Then record one H D R histogram per window instead, add them all up, and ask the sum for its p ninety-nine. It matches the whole-run number to three digits.

A: And fourth, make the load generator the bottleneck. Point the open loop at a server with unlimited workers and one millisecond of work, and ask for three thousand requests a second. Watch top. The Python process running the generator sits near a hundred percent of a core. Compare the achieved rate to the target, and compare the "from intended" latency to the "from sent" latency. They finally come apart, because the generator's falling behind its own schedule.

B: [dryly] So at that point I'm benchmarking my benchmark.

A: [laughs] You're measuring your load generator. Real load tests use several generator processes, or a generator written in something faster, like W R K two, or tools called k six or vegeta. And they always check that the achieved rate equals the target rate.

<!-- section: Go Deeper and Connections -->

A: If you read one thing after this, it's "The Tail at Scale" itself. It's eight pages. And Tene's talk, "How NOT to Measure Latency". The Strange Loop twenty fifteen recording is the one people usually find, and it'll feel like a replay with more war stories. And this leads straight into rate limits and backpressure, which is what you do when traffic goes past the knee you just found. And into load balancers, where the way you pick a replica changes the tail. And batching on the GPU is the same trade-off again: wait a little to fill a batch, and watch what that does to p ninety-nine. And when you build observability, you'll record histograms, not averages.

<!-- section: Close -->

B: [working it out] Okay, let me try the whole thing. Latency's a lopsided pile, so you look at p ninety-nine, not the mean, and fan-out makes the backend's tail into what normal users see. Servers get dramatically worse past the knee, so you run them well under it. And my load test lied because it had a fixed number of workers... so the fix is to use way more workers, enough to actually push the server past the knee.

A: [gently] Almost all of it. Except the last part. More workers doesn't fix it. A closed loop backs off whenever the server slows down, however many workers it has. It can't push past the knee, because it only sends when something comes back. The fix is to stop letting the server set the pace. Decide when every request goes out before the test starts, send each one on time no matter what, and start the stopwatch from when it was supposed to go. Then the slow moments get as many requests as the fast ones. Which is what your users were doing all along.
