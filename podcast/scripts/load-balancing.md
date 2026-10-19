<!-- section: The Problem -->

A: [relaxed] So your FastAPI app works. You log in, it makes you a session, who you are, what's in your cart, the conversation so far, and it keeps that in a Python dictionary. Totally normal. Then traffic grows, so you run three copies of it, with a load balancer in front deciding which copy gets each request.

B: Okay.

A: You log in. Your next click says, "who are you?" You refresh, and it knows you again. Refresh again, gone.

B: [quick] Oh, that's because the login landed on one copy, and the session lives in that copy's memory. The next request hits a different copy, and its dictionary has never heard of you. Three processes, three separate memories. One can't see the other's.

A: Yeah, you've got it. That's the whole bug. And honestly, that's the easy part. The interesting part is everything after. Because the obvious fix is the wrong one, and the reason it's wrong turns out to explain a surprising amount about how real systems are built.

B: [thinking] The obvious fix being, just send each user back to the same copy every time. Pin them.

A: That's the one.

<!-- section: How we got here -->

A: [warm] And the history is basically people walking into that fix and back out of it. Early nineties, the web server at NCSA, the place that made the Mosaic browser, outgrew one machine. So they ran several identical servers, and had DNS, the system that turns a name into an address, hand each visitor a different machine's address in rotation.

B: Simple enough.

A: Simple, but it had two problems. DNS answers get cached for minutes, so a dead server kept getting visitors. And it couldn't send a returning visitor back to the same machine. Which started to matter once servers kept logins and shopping carts in memory. So in the late nineties, dedicated load balancer boxes showed up to fix both. They checked which servers were alive, and they could pin a user to one server.

B: And that worked.

A: That worked, until servers had to restart. And then in twenty eleven, Adam Wiggins at Heroku wrote up a set of rules called the Twelve-Factor App. And one of them says, processes should be stateless and share nothing. And it names pinning users to a server, sticky sessions, as a violation. Anything that has to outlive a request goes in a shared store, like a database or Redis.

<!-- section: Why pinning is a trap -->

B: [skeptical] But why is pinning so bad? It fixes the bug. Everything works.

A: Everything works in testing. Then a server crashes, and everyone pinned to it loses their session, in the middle of checking out. Then you deploy. And a deploy is just restarting every server, so it's a small crash on purpose. Every deploy logs a bunch of people out. And teams quietly start deploying less often because of it.

B: Huh. I wouldn't have thought of deploys.

A: Then you add a server because you're overloaded, and it just sits there, because everyone's already pinned somewhere else. And if one heavy user, or a whole office sitting behind one network address, gets pinned to a machine, that machine's stuck with it. The balancer isn't allowed to help.

B: So it's the same problem every time, really.

A: Same root cause every time. The data has one copy, and that copy lives in a place that was designed to be thrown away. Servers are supposed to be disposable. That's the whole point of having several.

<!-- section: Make the servers forget -->

A: So the real fix is the other way around. Make the servers forget. Keep the session somewhere every copy can read, usually Redis, which is basically a very fast shared dictionary over the network, or the database for anything you can never lose. Now any copy can handle any request, the balancer can send things wherever it likes, and killing a server bothers nobody. That's a stateless server. And by stateless I mean: if you killed it and restarted it and no one noticed, it had no state.

B: But now every request has to go over the network to look up the session. That's a cost.

A: It's a cost, but a small one. One quick round trip inside a data center is a fraction of a millisecond. Next to a model call that takes tens of milliseconds or more, it barely registers.

B: Okay, so problem solved.

A: Mostly. Two catches. First, you moved the state, you didn't get rid of it. Now Redis has to not lose it, and Redis has to not be the one thing that takes you down. Second, and this one's sneaky. Say you have two tabs open and you add to your cart in both at the same moment, and they land on two different servers. If each one reads the cart, adds its item, and writes the whole cart back, one of those items just vanishes.

B: [working it out] Oh, that's the lost update. Two threads reading the same counter, both adding one, and one of the adds disappears.

A: It's exactly that, except now it's across machines, so no Python lock can save you. The fix is the same idea though. Make the whole thing one step inside the store. Redis can append to a list in a single command, so two appends can't step on each other.

<!-- section: Who gets this request -->

A: Okay, so now you've got stateless copies. Any of them can take any request. And the balancer has to answer one question, over and over: who gets this one?

B: Round robin, right? First, second, third, first, second, third. Everyone gets the same share. It's fair.

A: It's fair by count. That's the trap. It's not fair by cost. If every request costs the same, round robin is nearly perfect. But LLM requests are the extreme case of uneven. One request is a one-word classification, the next one is a long essay. A hundred times apart, easily.

B: And round robin doesn't care.

A: Round robin gives the next request to that server whether or not it's still writing the essay. So a quick question walks in and waits behind a whole essay. And the fix is something called least connections. Send it to whichever server has the fewest requests in progress. The balancer knows that for free, because it's the one that forwarded them. It's the first approach that actually reacts. A server stuck on a long request piles up open requests, and stops getting new ones.

B: How much does that actually change?

A: When I set it up on my laptop, three copies, mostly short requests with the occasional long one, round robin split the requests perfectly evenly by count. And the typical short request still waited most of a second, stuck behind long ones. Switching to least connections, the typical short request ran almost straight away.

B: [surprised] Same servers, same traffic.

A: Same everything, just a smarter choice. And there's an even more dramatic case. Make one server half as fast. A noisy neighbour, a GPU that's throttling, whatever. Round robin keeps sending it its equal share, which is more than it can ever finish, so its line grows forever. Least connections sees the pile and routes around it. Degraded machines are really common in real fleets, so that's the strongest argument for paying attention to load.

<!-- section: Two random choices -->

B: So why not always pick the least busy one? Seems obvious.

A: With one balancer that knows everything, it is. But real systems have lots of balancers, each with a slightly out of date picture. And if they all pick "the least busy server" at the same moment, they all pick the same one, and flatten it. That's called a herd effect.

B: Right, everyone runs to the empty checkout line.

A: That's it. And the fix is weirdly cheap. Pick two servers at random, and send the request to whichever of those two is less busy. That's the whole thing. It's called the power of two choices. And it sounds too simple to matter, but there's actual math showing that one extra random look gets you most of the benefit of looking at everything. And because the picks are random, a hundred balancers with stale information don't all pile onto the same victim.

<!-- section: When you want the same server -->

A: Now, sometimes you do want a key to land on the same server every time. Because that server has something useful already loaded, like a warm cache. The obvious way is to hash the key and divide by the number of servers, and take the remainder.

B: That sounds fine.

A: It's fine until you add a server. Say you go from three to four. Most keys now land somewhere different. About three quarters of them. So right when you're adding capacity because you're overloaded, you make most of your caches cold.

B: [laughs] That's the worst possible timing.

A: The worst. The fix is called consistent hashing, from some folks at MIT in the late nineties, the idea behind Akamai. Picture a circle. You put the servers on it by hashing them, and you put the keys on it too. Each key belongs to the next server going around clockwise. Add a new server, and it just takes over one slice of the circle from its neighbour. Everyone else stays put.

<!-- section: The LLM twist -->

A: And here's where this lands right in your world. You know the KV cache, the stored notes for every token of the prompt, so the model doesn't recompute them. Serving engines go a step further and keep those notes around after a request finishes. That's prefix caching. Because a chat resends the whole conversation every turn, and an agent resends its system prompt and tools every step.

B: So if the next turn lands on the GPU that already has the conversation, it skips reading most of the prompt.

A: Skips most of the prompt reading, which is most of the wait for the first token. But put eight replicas behind round robin, and the next turn has a one in eight chance of finding its notes. Seven times out of eight the GPU redoes all of it. So LLM routers route by prefix. Send each request to the replica most likely to already have its beginning. And, importantly, fall back to the least busy replica when that one's overloaded. Otherwise one popular system prompt melts one GPU.

B: [skeptical] Wait. But that's a sticky session. You just spent ten minutes telling me sticky sessions are a trap.

A: It is a sticky session, and it's fine. Here's why. The KV cache is a cache. If that replica dies, the next request goes somewhere else, the prompt gets recomputed, and the user waits a bit longer. Nothing is lost. Stickiness for speed is good. Stickiness for correctness, where the only copy of the data lives on one server, that's the trap. That's the line.

<!-- section: Leaving gracefully -->

A: Two last things, quickly, because they bite people. When you take a server out, for a deploy or to scale down, you do it gently. Stop sending it new requests, let it finish what it's already working on, then shut it down. That's called draining. And for LLM streaming, "finish what it's working on" can mean minutes, so the grace period has to be longer than your longest request.

B: And if you don't?

A: Then the requests in flight just die. And here's a detail I like. When a server dies mid-request, the balancer will happily retry a read somewhere else. But it won't retry a POST, because doing a POST twice might mean two orders. And every LLM API call is a POST. So those just fail.

B: Huh. Okay.

A: And the last one. Point at every box in your diagram and ask, if this one dies, does everything stop? You put three app servers in so one could die. And then there's one balancer in front, and one Redis behind. Each of those is a single point of failure. The goal isn't to have zero of them. It's knowing where they are.

<!-- section: Ending -->

B: Okay, let me say it back. The moment you run more than one copy, anything a copy keeps in its own memory is invisible to the others. Pinning users to a copy hides that, but then crashes, deploys and new servers all break it. So you make the servers forget and put the state in a shared store. And then choosing a server is about cost, not count, so you send work to whoever's least busy.

A: That's it. The one thing I'd sharpen is the pinning part. Pinning isn't bad on its own. LLM routers do it on purpose. The question is always, what happens if that server dies? If the answer is "the user waits a bit longer", stick away. If the answer is "the user loses their cart", the data's in the wrong place.
