<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, load balancers, and why state breaks everything. Picture your FastAPI app. It works. You log in, and it makes a session for you, so, who you are, what's in your cart, the conversation so far, and it keeps that in a plain Python dict. Traffic grows, so you do the obvious thing. You run three copies behind a load balancer. You log in. Your next click says, "who are you?" You refresh, and it knows you again. Refresh again... gone.

B: Oh, that one I actually know. The login landed on one copy, so the session lives in that copy's memory. The next click landed on a different copy, and its dict has never heard of me.

A: [warmly] That's it. That's exactly it. Three copies means three separate processes, and each process has its own private memory, its own heap. One process just can't see into another one's memory. The operating system walls them off. So the dict on server A and the dict on server B are two completely different objects that happen to have the same name in the code.

B: So what's left to talk about? Sounds like it's solved.

A: [amused] The diagnosis is solved. Everything after it is the interesting part. Should the balancer just pin you to server A forever? Okay, then what happens when A crashes, or restarts because you deployed? And here's a weird one. L L M servers deliberately want your next request on the same machine. Why is that fine there, and a trap for a shopping cart? And how should the balancer even choose, when one L L M request takes forty milliseconds and the next one takes forty seconds?

<!-- section: Origin -->

A: And it starts in nineteen ninety-four. N C S A, the place that made Mosaic, one of the first web browsers, ran a web server that outgrew one machine. Too many visitors. So three people there, Katz, Butler and McGrath, wrote up their fix. Several identical servers, and D N S hands each visitor a different machine's address, in rotation. First visitor gets machine one, next gets machine two, and so on. D N S round robin. And it's honestly still around today.

B: But that sounds... fine? What was wrong with it?

A: [matter-of-fact] Two things. First, D N S answers get cached. Your computer, your I S P's resolver, they hold on to the answer for minutes. So when one of those servers died, everyone who'd been handed its address kept going to it. For minutes. A dead server kept receiving visitors. And second, it had no way to send a returning visitor back to the same machine. Which didn't matter at first, but it mattered a lot once app servers started keeping logins and carts in memory. Which is exactly your bug.

B: So the same problem, thirty years ago.

A: Same problem. So in the late nineteen nineties, dedicated load balancer boxes showed up to fix both. They checked which servers were actually alive, and they could pin a user to one server. And pinning worked fine... until servers had to restart. Then in twenty eleven, Adam Wiggins at Heroku wrote a short thing called The Twelve-Factor App. Factor six says processes should be stateless and share nothing. And it names sticky sessions, the pinning trick, as a violation, by name. Anything that has to outlive a single request goes into what it calls a backing store. A database, or Redis. And that's where this whole conversation ends up.

<!-- section: The Idea: Bigger machine, or more machines -->

A: So, back up a step. One server can't keep up. You've got two choices. One is to buy a bigger box. More cores, more RAM, faster disks. That's called vertical scaling, or scaling up. And honestly, people underrate it. No code changes. No new ways to fail. And a single modern server is enormous. Hundreds of cores and terabytes of RAM are, like, a cloud API call away.

B: So what's the catch?

A: Three catches. There's a ceiling, the biggest machine anyone sells. The price per unit of capacity climbs as you get near that ceiling. And it's still one machine. When it reboots, you're down. The other choice is horizontal scaling, or scaling out. You add more machines that each do the same job, and spread the work across them. No ceiling, in principle. Cheap machines. And one of them dying is a partial loss instead of a total one. And the catch there is... basically everything we're going to talk about. Somebody has to decide which copy gets each request. And any data a copy keeps in its own memory is invisible to the others.

A: [slower, painting the picture] If you drew it, it'd be two halves. On the left, a small box, eight cores, with an arrow to a huge box, a hundred ninety-two cores, two terabytes of RAM. Above it, a dashed line labelled "ceiling", and inside the big box, the words "still one box". On the right, a balancer at the top with three lines fanning down to three identical app boxes, each one labelled "own heap". And underneath, "add more as needed".

B: [skeptical] I'd have assumed scaling out is just the grown-up answer. Like, real companies scale out.

A: Real companies do both, in order. Scale up until it hurts, then scale out the parts that are easy to copy. And "easy to copy" means exactly one thing. The part holds no state of its own.

<!-- section: The Idea: What a load balancer is -->

A: So what's a load balancer, really. It's a program, or sometimes a dedicated box, that receives every incoming request, or every incoming connection, and forwards it to one of several servers behind it, choosing which one each time. A traffic cop. Clients only ever know the balancer's address. Behind it sits a pool of servers that actually do the work. Those are called backends. nginx calls them upstreams, cloud providers call them targets, and in the L L M world you'll hear replicas. Same thing. And for every request, the balancer answers one question. Who gets this one?

A: [slower, painting the picture] It also answers two quieter questions. Which backends are actually alive right now? And how do we retire one without dropping the work it's in the middle of? We'll get to both. But first, your cart, drawn out. On the left, a browser, holding a cookie that says the session ID is seven F. Then the balancer. Then on the right, three boxes stacked, app one, app two, app three, each showing what's in its memory. Request one is a login. The balancer sends it to app one, and now app one's memory has an entry: seven F, user gaurav, cart has a G P U in it. Request two is "add to cart". Same browser, same cookie. The balancer sends it to app two. App two's dict is empty. So it answers four oh one, "who are you?" And the label in the middle of the picture says it all. Same cookie, different heap.

B: Wait, I thought the cookie was kind of... carrying me around. Like the cookie has my login in it.

A: That's the bit to get straight. Two words here. A session is everything the server remembers about one logged-in user between requests. Who they are, their cart, their conversation so far. That's the memory. A cookie is a small string the server asks the browser to store and send back on every later request to the same site. And here, the cookie holds nothing but a random session ID. It's the key into the server's dict. So the cookie travels with every request. The data it points to does not. You're carrying a coat-check ticket, not the coat.

B: And the coat's hanging in server A's closet.

A: [amused] Right. And the general word for the coat is state. State is any data a server keeps that a later request depends on. And there's a nice test for it. If you could kill the process and restart it, and nobody noticed, it had no state. Sessions are state. But so are in-memory caches, rate-limit counters, files written to local disk, open WebSocket connections. All of it.

A: And there are two ways out. One: make the balancer send each user back to the same server, every time. That's called a sticky session, or session affinity. The balancer usually does it by hashing a cookie, or the client's I P address, so the same user always maps to the same backend, and the in-memory dict keeps working. Two: make the servers forget. Keep the session somewhere every server can read, like Redis or a database, so any server can handle any request. That's a stateless server. It keeps nothing between requests in its own memory or on its own disk. Everything a later request needs is either in the request itself, or in a shared store.

B: [casual] Honestly, option one sounds way easier. Just pin me to A. Done.

A: It is easier. Option one is a patch, option two is the fix. And you'd build both, and break the patch with your own hands, so you believe it. But first, the balancer itself.

<!-- section: The Idea: L4 and L7 -->

A: So think of a request as a stack of envelopes, one inside the other. The outer envelope is I P. That's the addresses, where it's from, where it's going. Inside that is T C P, which adds ports and turns the packets into a connection. Inside that, usually, is T L S, which is encryption, so everything further in is scrambled. And only then, in the middle, is the actual H T T P request. The path, the headers, the cookies, and your prompt. And balancers get named after how many envelopes they open. They use an old numbering scheme for network layers, where layer three is I P, layer four is T C P or U D P, and layer seven is the application protocol, like H T T P. So, an L four balancer and an L seven balancer.

A: Picture a row of boxes, left to right. I P, with source and destination addresses. T C P, ports and the connection. T L S, drawn dashed, encrypted. Then H T T P, which says POST to the chat endpoint, with a cookie. Then the body, the model name and the prompt. Over the first two boxes, a bracket: "L four sees this." Under the whole row, a bracket: "L seven sees all of it, after decrypting."

A: So an L four balancer picks a backend at the moment a T C P connection opens, and then just shovels bytes back and forth without ever reading them. A W S's network load balancer, Google's Maglev, Linux's I P V S, H A Proxy in its T C P mode. One choice per connection. It's fast, it handles millions of packets a second, and it doesn't even need your T L S certificate, because it never decrypts anything. But it can't read a cookie. It can't tell a health check apart from a thirty-second generation. And it can't retry a request on another server, because it never sees where one request ends and the next begins. It just sees a stream of bytes.

B: So fast but blind. Does the blindness actually bite, though, in practice?

A: [matter-of-fact] It does, with H T T P two and G R P C. Those send many requests down one long-lived connection. So behind an L four balancer, all of a client's requests go wherever its one connection happened to land. Forever. That's the classic complaint, "G R P C load balancing doesn't work." It's not broken, it's balancing connections, and you only have one.

A: An L seven balancer is different. It accepts the client's connection itself, decrypts the T L S, parses each H T T P request, and then opens, or reuses, its own separate connection to whichever backend it picks. nginx, Envoy, H A Proxy in H T T P mode, A W S's application load balancer. And really, that's a reverse proxy. A proxy is something that forwards requests on someone's behalf. A normal proxy represents clients, like a company proxy that all the employees' traffic goes out through. A reverse proxy represents the servers. Clients talk to it thinking it's the server. So the L seven balancer holds one connection to the client and one to the backend, and reads everything in between. Which means it can route by path, balance each request separately, add headers, and retry a failed request on another backend. The cost is more CPU per request, and it needs your T L S keys.

B: So which one do people actually use?

A: Big systems use both. L four at the very edge, spreading connections across a fleet of L seven proxies. And nginx, which you'll use, does both. Its H T T P section is L seven. Its stream section is L four.

<!-- section: The Idea: The algorithms -->

A: Okay, now the fun question. A request arrives. Three healthy, stateless backends. Who gets it? The simplest answer is round robin. A, B, C, A, B, C. It needs no information at all, and it's perfectly fair by count. It's nginx's default, and it's nearly perfect if every request costs the same.

A: Next is random. Fair on average, but streaky. Sometimes three in a row land on one server while another one sits idle. So for equal-sized requests it's actually worse than round robin. Then there's least connections. Send the request to the backend with the fewest requests in progress. And the balancer knows that number for free. It's just the requests it forwarded and hasn't heard back from yet. This is the first algorithm that reacts to anything. A backend stuck on a slow request piles up open connections, and so it stops getting new ones.

B: [a bit unsure] But round robin's fair, though. Everyone gets the same number of requests. Why would you need to react to anything?

A: Because it's fair by count, not by cost. And L L M requests are the extreme case of uneven cost. A one-word classification, and then a two-thousand-token essay. That's a factor of a hundred apart. Round robin hands A the next request whether or not A is still in the middle of writing that essay. And every short request that lands behind a long one waits for it.

A: So let me make it concrete. Three servers. Each handles one request at a time and queues the rest, like one G P U running one batch. Ninety percent of requests are short, forty milliseconds of work. Ten percent are long, a full second. And overall the servers are about seventy-five percent busy. Under round robin, what's the median latency? The typical request. And under least connections? Give me numbers.

B: [working it out] Okay. Most requests are forty milliseconds. Sometimes you land behind a long one. So... round robin, maybe a hundred and fifty milliseconds median? And least connections a bit better, a hundred?

A: [deadpan] Round robin's median, measured on a Mac with real nginx and three real backends, was seven hundred twenty-five milliseconds.

B: For a request that needs forty?

A: For a request that needs forty. And least connections gave eighty-three. The p ninety-nine, the slowest one percent, went from about three and a half seconds to about two point two. But the median's the shocking one. A median of seven hundred twenty-five milliseconds means the typical short request spent most of its life waiting behind a long one that round robin blindly queued it after. Least connections steers short requests away from servers that are busy with a long one, so most of them start almost right away. And the tail improves less, because some unlucky requests still land behind a long one. The balancer counts requests. It doesn't know their sizes.

A: There's a toy version of this you can play with. Four servers, each doing one request at a time, drawn as four columns with little queues stacking up. Buttons for round robin, random, least conn, and two choices. Buttons for "L L M mix" or "all same size". A toggle that makes server one run at half speed. And a load slider. Up top, live numbers: the median, the p ninety-nine, and the longest queue, from the last six hundred finished requests. Underneath, a table that reruns twenty thousand requests through every algorithm with your settings, so you can compare without luck getting in the way.

A: So here's what you'd see. Start on round robin with the L L M mix. Queues jump around, some columns get tall. Switch to least conn, and the queues flatten out. Now flip to "all same size". Round robin becomes as good as anything, because now count is cost. And then the nasty one. Turn on "server one half speed", with round robin, and watch server one's queue climb right off the top of the picture. And the numbers keep getting worse the longer you leave it running.

B: Why does it keep growing, though? It's only half speed. Shouldn't it just be, like, twice as slow?

A: [working it out] Do the shares. Round robin still sends server one a quarter of all the requests, because there are four servers. But how much of the total capacity does server one have? The other three are full speed, that's three. Server one is a half. So the total is three and a half, and server one's piece is a half out of three and a half. That's a seventh. So it gets a quarter of the work and has a seventh of the capacity. It's being handed more than it can ever finish. Its queue grows without bound, and a quarter of your users wait... forever, basically.

B: Oh. It's not twice as slow. It's never catching up.

A: Never. And least connections sees that pile of open requests and routes around it. And degraded machines like that are really common in real fleets. A noisy neighbour on the same host, a G P U throttling because it's hot, a cold cache after a restart. That's the strongest argument for load-aware balancing there is.

A: Now there's a catch with least connections. It assumes one balancer that has perfect, up-to-the-moment counts. Real systems have many balancers. nginx itself runs several worker processes, and big setups have dozens of proxy machines. Each one has a partial, slightly stale view. And if they all send to "the least loaded server", they all pick the same one at the same moment, and flatten it.

B: Couldn't they just share their counts?

A: They'd still be stale by the time anyone acts on them. That's the thing. Any time a lot of independent decision-makers react to the same signal at the same time and all pile onto the same choice, you get what's called a herd effect. And the fix is beautifully cheap. Pick two backends at random, and send the request to whichever of those two has fewer connections. That's it. It's called the power of two random choices.

B: [skeptical] That sounds too simple to matter.

A: [leaning in] It sounds that way. It matters exponentially. Here's the math, in words. Throw a bunch of balls into the same number of bins, completely at random, and look at the fullest bin. It grows roughly like the logarithm of the number of bins, divided by the logarithm of that logarithm. Now change one thing. Each ball looks at two random bins and goes into the emptier one. Now the fullest bin grows like the logarithm of the logarithm. Just that. A log of a log is tiny. For a million bins, the log is about fourteen, and the log of fourteen is under three. So you've gone from something that grows with the number of digits to something that barely grows at all. Azar, Broder, Karlin and Upfal proved it, and Michael Mitzenmacher's thesis carried it over to load balancing. One extra random look gets you most of the benefit of looking at everything.

B: And because it's random, the balancers don't all agree.

A: Right, that's the second half. A hundred balancers with stale counts don't converge on one victim, because each of them is comparing a different random pair. Envoy's least-request balancer uses it by default, and in nginx it's spelled "random two least conn". Now, in that simulator, two choices lands in between random and least conn. That's because the simulator models one balancer with perfect information, which is least conn's best case. Two choices earns its place when there are many balancers and the counts are stale. And one last thing: any of these can be weighted. If one box has twice the G P Us, you give it weight two, and it gets twice the share.

<!-- section: The Idea: Hashing -->

A: Now, sometimes you actually want a key to always land on the same backend. Because that backend has something useful loaded. A cache, a model, a shard of data. And the obvious way to do it is: hash the key, take the remainder after dividing by the number of servers, and that's your server.

A: So try this. Sixty users, spread over three servers by hash mod three. You're overloaded, so you add a fourth server and switch to mod four. What fraction of users now land on a different server than before?

B: Hmm. The new server takes its share, a quarter. So a quarter of people move?

A: [amused] That's what it should be. It's about three quarters.

B: Three quarters?

A: [working it out] Yeah. A user stays put only if their hash mod three equals their hash mod four. And those two remainders together repeat every twelve, so you just check the twelve possible cases. Zero, one and two give the same answer both ways. From three on, they disagree. Three mod three is zero, but three mod four is three. And so on, all the way up. So three of twelve stay, a quarter. Three quarters move. And think about when this happens. If each server held a warm cache for its users, you just made three quarters of those caches cold, at exactly the moment you were adding capacity because you were overloaded. In general, going from some number of servers to one more moves almost all the keys. With ten servers going to eleven, it's ten elevenths.

A: The fix is consistent hashing. Karger and colleagues at M I T, nineteen ninety-seven, and it's the idea Akamai was built on. Picture a clock face. You hash each server to a spot on the circle, and you hash each key to a spot on the circle. Each key belongs to the first server you hit going clockwise. Now add a server. It lands somewhere on the circle and takes over one arc, stealing keys from just one neighbour. Everyone else stays put. So adding or removing a server only moves the keys in its slice, about one over the number of servers.

B: But if you put three servers on a circle at random, the slices won't be even.

A: They won't. One mark per server gives lumpy arcs, and one server ends up with way more than its share. So you put each server on the ring many times. A hundred, two hundred positions each. Those are called virtual nodes. The slices average out so each server gets close to its fair share, and as a bonus, you can give a bigger server more positions.

A: And there's a little figure for this too. A ring with keys as dots and servers as marks, a slider for the number of servers from two to eight, buttons for "hash mod N" or "hash ring", and a virtual nodes toggle. The readouts are "keys that moved", the ideal, which is one over the new server count, and the busiest server's share. Move the slider one step in mod N mode, and "keys that moved" jumps to most of them. Do the same on the ring, and only the arc the new server took over moves. Then look at the busiest server with one mark each, it's way over its share, and turn on virtual nodes and watch it even out.

A: nginx has this built in. You tell it to hash on some variable, a cookie for instance, and add the word "consistent", and it puts that on a ring. And Google's Maglev, that L four balancer, uses its own consistent hashing so every Maglev machine independently picks the same backend for a given connection, without them having to talk to each other.

<!-- section: The Idea: Why LLM serving routes by prefix -->

A: And here's where hashing becomes central to your actual work. You know the K V cache. For every token in the prompt, the model computes keys and values in each attention layer, and it keeps them on the G P U so it doesn't recompute them for every new token it generates. Engines like V L L M and S G Lang go a step further. It's called prefix caching. They keep the K V cache around for prompts they've already processed, so if a new request starts with the same tokens, same system prompt, same conversation so far, they skip recomputing that part.

A: And that matters because of how these things are used. A chat resends the whole conversation every turn. An agent resends its system prompt and its tools on every step. So the first phase of generating, which is called prefill, where the model runs the whole prompt through at once to build its K V cache, that cost grows with the prompt length, and it's most of the time-to-first-token. If the server still has the prefix's K V, most of prefill is skipped. Rough, illustrative numbers. A ten-thousand-token conversation history, at a few thousand tokens a second of prefill, is a few seconds before the first token shows up, cold. If ninety-eight hundred of those tokens are already cached, it's well under a second.

B: [working it out] Okay, so put that behind round robin... say eight replicas. Turn two of my chat only finds turn one's cache if it happens to land on the same replica. One in eight.

A: One in eight. Seven times in eight, the prefix gets recomputed from scratch. And seven G P Us end up filling their caches with copies of the same prefix. Least connections is just as blind. It knows nothing about prompts. So L L M routers do what's called cache-aware routing, or prefix-aware, or K V-aware. Send each request to the replica most likely to already hold its prompt prefix, while still avoiding replicas that are overloaded. The simple version is consistent hashing on the conversation ID, or on the first chunk of the prompt. The better version, which S G Lang's router does, with similar ideas in NVIDIA's Dynamo and in L L M D, keeps an approximate tree of the prefixes it has sent to each replica. It routes to the longest match... and falls back to the least-loaded replica when that match is too busy.

B: Why the fallback? If the cache is that valuable.

A: [serious] Because pure affinity brings back the half-speed server disaster. One popular system prompt, everybody's requests share it, they all hash to one replica, and you've got one melting G P U and seven idle ones.

B: [skeptical] Hang on, though. This is a sticky session. You just told me sticky sessions are the patch, not the fix.

A: It is a sticky session. And it's fine. Here's why. The K V cache is a cache. If that replica dies, the next request goes somewhere else, the prefix gets recomputed, and the user waits a bit longer. Nothing is lost. Stickiness for speed is good. Stickiness for correctness, where the only copy of some data lives on one server, is the trap. That's the line.

<!-- section: The Idea: Why sticky sessions are a trap -->

A: So let's see the trap fully. In-memory sessions, sticky balancer. Everything works in testing. Then a server crashes, and everyone pinned to it loses their session, in the middle of checking out. Then you deploy. And every restart is a small crash on purpose, so every deploy logs people out.

B: [laughs] So the team just... starts deploying less.

A: That's literally what happens. Then you scale. You add a server, but the pinned users don't move to it, so the new one sits idle while the hot ones stay hot. Load gets lumpy, too. One heavy user, or a whole office sitting behind one I P address, pins a pile of work onto one machine, and the balancer's not allowed to help. And it's quietly fragile. There's a version you'll hit yourself where you pin by the session cookie, and it mostly doesn't work, and the reason is a little subtle. We'll come back to it. But it's the same root cause every single time. The data has one copy, and it's in a place that was designed to be disposable.

<!-- section: The Idea: Stateless servers, state in a shared store -->

A: So move the data out. Into one shared place. For sessions, that's usually Redis. Redis is an in-memory key-value server. Clients send it small commands over T C P, set this key, get that key, append to this list, expire this after an hour, and get answers in well under a millisecond on a local network. People use it for sessions, caches, rate limits, queues. And for anything that must never be lost, the database. Now any server can look up your session ID. The balancer can send each request anywhere it likes. And killing a server bothers nobody.

B: But now every request has to go ask Redis first. That's a network call. How much does that actually cost?

A: One network round trip per request. Inside a data centre, or between containers on one machine, that's on the order of a hundred to five hundred microseconds. So, a tenth of a millisecond to half a millisecond. Next to a forty millisecond model call, that's under one percent. And next to a full second of generation it's nothing. You'd measure it, but that's the shape.

A: But there are two things it doesn't solve. First, you moved the state, you didn't remove it. Redis now has to not lose it. And it must not become the new single point of failure. Second... concurrency is back. Two tabs, same cart, both clicking "add" at the same moment, and they land on two different servers. If each one reads the whole session, appends its item, and writes the whole thing back, one item vanishes.

B: That's the lost update thing. From threads.

A: That's the lost update. Quick version: two workers both read the cart with two items. Both add one, so both now hold a three-item cart, each with a different third item. Both write back. The second write wins, and one item is just gone. Except before, it was two threads in one process, and you could fix it with a lock. Now it's two machines. No Python lock can help you across machines. The fix is the same idea, though. Make the change one atomic step inside the store itself. Redis has a command, R push, that appends to a list in one go. Nobody can sneak in between a read and a write, because there's no separate read and write.

A: So picture the whole stateless fleet. At the top, clients, hitting one address. Under it, two balancers, A active and B on standby, sharing that address so either can fail. Under them, four app servers, each labelled "no state". One of them is marked "draining", one is marked "just added", and nobody cares, because any of them can take any request. And all of them point down to two boxes at the bottom: Redis, with sessions and a replica, and the database, with users and a replica. And underneath, "state lives here, and only here". Which is the point. You moved the single point of failure down there, so now you deal with it there.

<!-- section: The Idea: Health checks -->

A: Now, one of those quieter questions. How does the balancer know a backend is dead? Two ways. A passive health check just watches real traffic. If forwarding a request fails, connection refused, or a timeout, it counts a failure, and after enough failures it stops using that backend for a while. That's what open-source nginx does. By default, one failure within ten seconds benches a backend for ten seconds, and then it tries it again. It's free. But a real user's request had to fail first.

A: An active health check is the balancer probing each backend on a timer. Like, a GET to the health endpoint every five seconds, and remove it after a few failures in a row. That catches it before a user does. H A Proxy, Envoy, the paid NGINX Plus, cloud balancers, Kubernetes probes, they all do it. And the detection time is just the interval times the threshold. Probe every five seconds, remove after three failures, and a dead backend keeps getting traffic for up to fifteen seconds.

B: Fifteen seconds of its share of traffic, all failing?

A: Failing unless they get retried somewhere else, which we'll get to. So you'd add passive checks on top, which bench it on the very first failed connection. Or probe more often, which detects faster but costs more probes and more false alarms. And then there's a design question hiding in "what does the health endpoint actually check?"

B: [casual] I'd make it check everything. Can it reach Redis, the database, the model. Then you really know it's healthy.

A: [jumping in] That's the deep check, and it's the dangerous one. Here's why. Redis hiccups for two seconds. Now every backend's deep check fails at the same time, because they all depend on the same Redis. The balancer removes all of them. And a two-second blip becomes a full outage. Balancers defend against that with something called failing open. If every backend looks unhealthy, ignore the health checks and send traffic to all of them anyway, on the theory that the checks are more likely wrong than everything being dead. Envoy calls it the panic threshold. But the real fix is: keep the routing check about this process. Is it up and answering H T T P? That's a shallow check.

A: And Kubernetes made one more split explicit. Liveness and readiness. Liveness asks, is this process stuck? If it's not live, restart it. That should only fail if the process truly can't recover by itself. Readiness asks, should this process get traffic right now? That one fails while it's starting up, while it's draining, or while it's overloaded. Failing readiness pulls it out of rotation without restarting it. And here's where it bites in your world. An L L M server loading its weights for two minutes is alive, but not ready. Mix the two up, and Kubernetes kills it for being slow to start, it starts loading again, gets killed again... restart loop. Forever.

<!-- section: The Idea: Retries, and why POST is special -->

A: Retries. When nginx can't even connect to a backend, it quietly tries the next one. That's on by default, for errors and timeouts. A connection that never got established is always safe to retry, because nothing happened. But if the request was already sent, and the backend died in the middle of the work, then retrying is only safe if doing it twice is harmless. That's called idempotent. Doing it twice has the same effect as doing it once. GET, PUT and DELETE are supposed to be. POST isn't. Two POSTs to an orders endpoint make two orders.

B: [skeptical] Couldn't the balancer just retry everything and let the app sort it out?

A: [laughs] It'd charge someone twice. So nginx retries an in-flight GET on another backend, but not a POST. A POST whose backend died mid-request gets a five oh two, which means Bad Gateway: the proxy couldn't get a valid answer from the backend. A five oh four is the timeout version. And here's the thing to notice. Every L L M API, the chat completions endpoint, the messages endpoint, every one of them is a POST.

B: Oh. So none of my L L M calls get retried for free.

A: Not once they've been sent, no. If you want them retryable, the client sends an idempotency key, a unique ID for that request, so the server can recognise a repeat and not do it twice.

<!-- section: The Idea: Draining -->

A: Now the other quiet question. Deploys and scale-downs take backends away on purpose. Do it carelessly, and everything in flight fails. Do it properly, and it's called draining. Google's S R E book calls the in-between state "lame duck". Four steps. One, stop being chosen. Readiness starts failing, or you deregister it. Two, wait for the balancer to notice, and keep serving whatever arrives in the meantime. Three, finish the in-flight work, with a deadline longer than your longest request. And for L L M streaming, that can be minutes. Four, exit. And you roll through the fleet a few servers at a time, so capacity stays up while you deploy.

A: And at the process level, the way this starts is a signal. Docker stop, or Kubernetes, sends sig term. That's the polite "please shut down" signal. A process can catch it and clean up. If it doesn't exit within a grace period, ten seconds for docker stop, thirty by default in Kubernetes, then it gets sig kill, which cannot be caught. The process just stops existing. Uvicorn catches sig term properly. It stops accepting new connections, finishes the requests it already has, and exits. Kill dash nine sends sig kill directly, and everything in flight dies with it.

B: Okay, that seems clean.

A: [wry] Mostly. One Kubernetes subtlety. Sig term, and "remove this pod from the balancer", happen at the same time. They race. So for a moment, new requests still arrive at a process that's already stopped accepting. And they fail. The usual fix is almost embarrassingly simple. A pre stop hook that just sleeps a few seconds before the shutdown begins, so the balancer catches up first.

<!-- section: The Idea: Single points of failure -->

A: Last idea. A single point of failure is one component whose failure takes the whole system down. Anything there's exactly one of, in the path of every request. And the way to find them is literally to put your finger on each box in the diagram and ask, "if this dies, does everything stop?"

B: [amused] So in the thing you'd build... three app servers so one can die, and then one nginx in front of all of them.

A: Yeah, that's the irony. The build has two: nginx and Redis. And the fixes are known. For the balancer, two balancers sharing a virtual I P address, where the standby takes over if the active one dies. That's a protocol called V R R P, usually run with a tool called keep alive D. Or several balancer addresses in D N S. Or a cloud balancer, which is itself a hidden fleet of machines. And for Redis, a replicated Redis with failover. And there's always another one if you look. D N S itself. The whole region. A config push that goes to every balancer at once. So the goal isn't zero single points of failure. It's knowing where they are.

<!-- section: Build It -->

A: So here's what you'd build. One folder, three copies of a small FastAPI app behind nginx. The app pretends to be an L L M server. Its generate endpoint holds a one-at-a-time lock, like a G P U running one batch, and it "generates" by sleeping two milliseconds per token. It also has login and cart endpoints, with the sessions deliberately kept in a dict, so the bug is built in. And a health endpoint that reports how many requests it has in flight. All of it was checked running natively on a Mac, Homebrew nginx and three uvicorn processes on three ports. The Docker compose files are the standard shape but weren't tested, so if you go that way, note what's different.

A: Once it's up, you hit the health endpoint four times and you should see app one, app two, app three, app one. Round robin, visibly. And one line in the nginx config deserves a mention. nginx runs several worker processes, and unless you give them a shared memory zone, each one keeps its own counts. So least conn would quietly mean "least connections this particular worker knows about". The zone line makes them share.

A: First experiment. You log in with curl, keeping cookies in a little cookie jar file, and then add six items to the cart, one per request. Three backends, round robin. How many of the six succeed?

B: [working it out] Round robin cycles through all three, so only every third request lands back on the server I logged into. Two?

A: Two. On the real run, login went to app two. The cart calls went app three, one, two, three, one, two. And the cart ended up holding item three and item six. The other four got four oh one, "who are you?", from a server with an empty dict. And notice nginx didn't retry any of those four. A four oh one isn't a failure to nginx. It's a perfectly valid answer from a perfectly healthy backend.

A: Then you patch it with stickiness. Open-source nginx doesn't have a sticky-cookie feature, the paid version does, and H A Proxy has it for free, but nginx can hash any variable onto a ring. So you tell it to hash on the session cookie, consistently. Reload, and run it for six users in a loop... and it fails for most of them. And the job is to explain why in one sentence. Here's the hint. What cookie did the login request carry?

B: The login request... didn't have a session cookie yet. The login is what creates it. So the login got hashed on nothing, and landed wherever "nothing" goes. And every request after that has the cookie, so it hashes somewhere else.

A: That's the sentence. The session got created on one server, and then the user got pinned to a different one. Five of six users had their first cart call come back four oh one. So the fix is to hash on something that exists from the very first request. The client sends a second cookie with the username every time, and you hash on that. Now every cart fills.

A: And then the trap. Find which backend one user is pinned to, kill it, and ask for their cart. You get a four oh one, from a different backend. The cart's gone. Then start the dead one back up and ask again. Still gone, because it's a brand new process with a brand new empty dict.

A: Then the real fix. Take the hash line out, back to plain round robin, and change the app so the sessions dict disappears entirely. Three small functions: load a session, create a session, add to the cart. One way to lay it out: the user stored under a session key with an expiry of an hour, and the cart as a Redis list. Appending to a list is one command, so concurrent appends can't lose anything. The tempting alternative is to store the whole session as one JSON blob and read it, change it, write it back. That's exactly what you break later. And since the endpoints are plain, non-async functions, FastAPI runs them in a thread pool, so the ordinary blocking Redis client is fine. Rerun the six cart calls with plain round robin: all six succeed, while the served-by field rotates through all three servers. Kill a backend mid-session: nothing's lost. And then you'd have an agent read it looking for any place where a read and a write got split into two separate commands.

A: Next, a load generator that looks like L L M traffic. Random arrival times, very uneven sizes. And it has to be open-loop. That means requests fire on a schedule whether or not the earlier ones finished, like real users who don't wait for each other. The other kind, closed-loop, sends one, waits for the answer, then sends the next. And that kind quietly slows down whenever the server slows down, which hides the very queueing you're trying to see. That's coordinated omission. Your load test politely backs off exactly when things get bad, so the bad part never shows up in the numbers.

B: So the test is being too nice to the server.

A: [amused] It's covering for it. So: nine in ten requests ask for twenty tokens, which is forty milliseconds, and one in ten asks for five hundred, which is a full second. Gaps between arrivals are random. You launch each request as its own task without waiting on it, collect them all at the end, and print the median, the ninetieth and ninety-ninth percentiles, the max, and counts of status codes and of which server served each one. And the arithmetic for how hard to push it: the average request costs ninety percent of forty milliseconds, plus ten percent of a thousand. That's thirty-six plus a hundred, so a hundred thirty-six milliseconds. Each backend can do about seven of those a second, so three backends top out near twenty-two requests a second. You start at sixteen.

A: Then you run that at sixteen a second for forty seconds, three times, changing only the balancing method in between. Round robin, least conn, and random two least conn. Then push to nineteen and twenty-one a second for round robin and least conn, and see which one falls apart first.

A: And the last experiment is killing things. Run the load at fourteen a second, and five seconds in, kill one backend outright, then start it back up seven seconds later. Then a sharper test: fire six long requests at once, a second of work each, wait a second, and kill one backend. Then repeat with docker stop instead, which is sig term with a ten-second grace, and then with GET instead of POST. And write your own explanation of every status code before asking anyone. Two Docker things that couldn't be checked: a killed container's address disappears, so nginx might log "host unreachable" or wait out its one-second connect timeout instead of getting a fast "connection refused". And a restarted container can come back with a new address that nginx, which looked up the name once at startup, won't see until you reload it. So if app two never gets traffic again, that's why.

<!-- section: Measure -->

A: So the numbers. These are from the native setup on an M-series MacBook, one nginx worker, sixteen requests a second for forty seconds. About six hundred fifty requests per run. Yours will differ in detail and match in shape. Round robin: median seven hundred twenty-five milliseconds, p ninety about one point nine seconds, p ninety-nine about three point six. Least conn: median eighty-three milliseconds, p ninety about one and a half seconds, p ninety-nine about two point two. Two choices in between: median a hundred thirty-seven, p ninety-nine about two and a half seconds.

B: [skeptical] And round robin really did split them evenly?

A: Perfectly. Two hundred eighteen, two hundred eighteen, two hundred seventeen. And that's the problem. Even counts, uneven work. A short request needs forty milliseconds and the median one took seven hundred twenty-five, mostly sitting behind a one-second request. Least conn fixes the median, but it helps the tail less. Long requests take a second all by themselves, and sometimes they bunch up on the same backend, because the balancer is counting requests, not tokens. A router that knows the prompt length, or reads the engine's own load signals, like its queue depth or how full its K V cache is, can do better than that. For a batching L L M server, open connections is a pretty fuzzy measure of how busy it really is.

A: Two choices sits in between because this setup is least conn's best case. One balancer, perfect counts. Two choices pays off when there are many balancers with stale counts, and here there aren't. And then utilization. Sixteen a second times a hundred thirty-six milliseconds is about two point two backends' worth of work, out of three. About seventy-three percent busy. At twenty-one a second, it's ninety-five percent, and that's where waiting explodes. That's the knee from the p ninety-nine lesson, where wait time stays modest as a server gets busier, and then near full it shoots up. And round robin hits that wall first, because it can leave one backend idle while another one has a queue.

A: Then the failure experiments, and what each one shows. In-memory sessions on round robin: two successes, four four-oh-ones. Sticky on the session cookie: five of six users' first cart call was a four oh one. Sticky on the username cookie, kill the pinned server: a four oh one from a different backend, cart gone. Six long POSTs, sig kill one backend: four succeeded, two got five oh two.

B: Why exactly two?

A: Because two of the six were on app two. One running, one queued behind it. Both died with it. nginx had already sent them, and POST isn't idempotent, so no retry. With GET instead, nginx retried them on another backend. The log said "upstream prematurely closed connection", and every client still got a success. Then six long POSTs with sig term instead: all six succeeded. Uvicorn stopped accepting, but it finished both requests it had. And a new request that tried app two got "connection refused", and since that connection was never established, nginx safely sent it somewhere else.

A: And the fourteen-a-second run where you kill app two for seven seconds? Zero errors. Which sounds great, but it was luck. The backend happened to be idle at the instant of the kill. Whether anything fails depends on what that backend was doing at that exact moment. So one clean failure test proves very little. Kill it several times, or kill it while you know it's busy.

A: And last, the price of statelessness. Time a few hundred cart reads with in-memory sessions, and again with Redis. You should see a fraction of a millisecond of difference, roughly, you'd measure it. Against forty milliseconds to a full second for a generation.

<!-- section: Break It -->

A: Then you break it on purpose. What if you pin by I P address instead? nginx has that, I P hash. Run the load generator, and everything lands on one backend.

B: Because... all the traffic's coming from my one laptop.

A: Yeah. To nginx, every request comes from one address, your Mac or Docker's gateway. And the real-world version is a whole company sitting behind one shared public address. That's N A T, address translation, where a router lets a building full of machines share one public I P. Sticky-by-I P balances addresses. And addresses aren't users.

A: Second, lose cart items across machines. Store the session as one JSON blob, and add to the cart by reading it, parsing it, appending, writing it back. Then fire fifty add-to-cart calls at once for the same session. You'll count fewer than fifty items. That's the lost update, across containers, where no lock in your Python can help. Switch back to the Redis list append, and it's exactly fifty, every time. And if you ever need a multi-step update to be atomic, Redis has transactions with watch and multi, and it can run little Lua scripts all in one step.

B: What happens if you kill the balancer itself?

A: [dry] Total outage, with three perfectly healthy app servers behind it. And kill Redis instead, and every server's up, and every request fails. So you circle both on the diagram and decide what you'd do about each. And notice the tempting fix for the Redis one, making the health check check Redis, just turns it into "nginx thinks every backend is dead". Same outage, different error message.

A: And the last one, drain too fast. Tell uvicorn its graceful shutdown timeout is one second, and repeat the six-long-POSTs test with a polite stop. Uvicorn waits one second, then cancels the request still running. On the Mac, the client got a five hundred, and the log said it cancelled one running task because the graceful shutdown timeout was exceeded. Or give docker stop a one-second timeout instead, and sig kill shows up early, and you get five oh twos. Either way, the lesson's the same. Your grace period has to outlast your longest request. And L L M generations can run for minutes.

<!-- section: How does it scale -->

B: [a bit unsure] So say I'm in an interview and they ask, how does this scale? Each stateless server does two hundred requests a second, and you need five thousand.

A: Then the app tier scales roughly in a straight line. Five thousand divided by two hundred is twenty-five servers. Plus headroom, say thirty to thirty-five, so you can lose a few and still deploy. One nginx can proxy well beyond five thousand simple requests a second, but you'd want two, so it's not a single point of failure. And the shared stores are where it stops being a straight line. Five thousand session reads a second is comfortable for one Redis. Simple operations commonly reach something on the order of a hundred thousand a second on one instance, so you're at a few percent, though you'd measure yours. The database is usually the real limit. So there you add caching, read replicas, and eventually sharding, splitting the data across machines, which is where consistent hashing comes back. And watch the latency budget. One extra Redis round trip per request is nothing. Ten of them in a row isn't.

A: If you want more, the Google S R E book has two chapters on load balancing, at the frontend and inside the data centre, and that's the best single read on all of this. And the Twelve-Factor App's page on processes is one page long. And what comes next is what to do when even least connections can't keep up, which is rate limits and backpressure.

<!-- section: Close -->

B: [working it out] Okay, let me try the whole thing. Three copies means three separate memories, so a session on one server doesn't exist on the others. You can pin users to one server, but that's the patch. The fix is stateless servers with the session in Redis. And sticky sessions are always a trap, except the L L M one is fine because... it's the same thing, but faster.

A: [gently] Almost. It's not that the L L M one is a special exception. It's a different kind of stickiness. Pinning a shopping cart is stickiness for correctness: the only copy of the data lives on one disposable server, so when that server goes, the data goes. Pinning a chat to the replica with its K V cache is stickiness for speed: the real data is still the conversation the client resends every turn, and the cache is just a warm copy. Lose the server and you lose some time, not the cart. So the rule isn't "never be sticky". It's: keep the only copy of anything in a shared store, and then be as sticky as you like on top, for speed, with a fallback for when the sticky choice is busy.
