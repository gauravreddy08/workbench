<!-- section: The Problem -->

A: [relaxed] So picture an interview. The prompt is three lines. Build a simple URL shortener using a coding agent. Then explain your solution. Then tell us how you'd productionize it.

B: I actually sat in on one of these. A friend's interview, almost exactly that.

A: Then you know how it goes. The candidate opens the terminal and types, more or less, "build a URL shortener." The agent spits out a tidy little app in about a minute. They run it, paste a link into the box, click the short link, and land on the right page. "It works."

B: Which it does.

A: It does. And then the interviewer starts asking questions, and every answer gets a little thinner. What status code does your redirect send back? The candidate scrolls through the code. And it turns out nobody chose. The library had a default, and the agent just used it. Why that one and not a three oh one? A guess. What happens if two people shorten the same link at the same moment? Nobody knows. Can I try it from my phone? It's running on the laptop, so no.

B: [wincing a little] Okay, I'll be honest. The status code one, I'd have guessed too. In my head a three oh two was kind of a rewrite. Like the server swaps the address under the hood and hands you the other page.

A: That's a really common picture, and we'll take it apart in a second. But notice what was missing in that interview. It wasn't typing speed. The agent typed fine. What was missing was the thinking that should happen before the prompt and after the code. Decide how it should behave. Read what got written. Run it, try to break it. And be able to say why every line is there.

<!-- section: One table, two operations -->

A: So strip it all the way down. How would you describe what's in the database?

B: It maps a URL to a URL. The short one to the long one.

A: Close. But the short link isn't really what you store. The table pairs a short code, those few characters after the slash, with a long URL. The code is the thing you look up. And that sounds like nitpicking, but it's the key on every single click, so it's worth saying right.

B: Fair. Code to long URL.

A: And then there are just two operations on that table. Shortening is a write. Someone hands you a long URL, you make up a new code, store the pair, hand back the short link. That's rare. Following is a read. Someone's browser asks for that code, you look it up, and you answer. That happens on every click, which is why almost everything interesting is on that side.

B: And the answer is the page itself.

A: No, and this is where the rewrite idea falls apart. The answer is tiny. It's a status code that says "what you want is somewhere else," and one header, called Location, holding the long URL. That's basically it. That's a redirect. The browser reads that header and goes there itself. It makes a brand new request, to someone else's website, and your server never sees that second request at all.

B: [thinking] So it's the browser doing the second trip, not me.

A: Right. A rewrite is something else. That's a server quietly answering a request as if it had asked for a different path, inside one server. The client sends one request, gets one answer, never knows anything changed. A shortener can't do that, because the target isn't yours. It's some other company's site. Only the browser can go there.

B: Okay, that's a cleaner picture than the one I had. My server says "go over there," and then it's out of the loop.

A: And hold onto that picture, because every question the interviewer asks is really about one arrow in it. Which redirect, how you count, how it scales. And scaling is mostly about the click arrow, because that's the one that happens all the time.

<!-- section: Moved for good, or moved for now -->

A: So, the status code. There are two families. A three oh one says "this has moved for good." A three oh two says "go there for now, ask me again next time."

B: And for a short link, it has moved for good. The link's never going to point anywhere else. So three oh one seems like the honest answer.

A: That's the trap. Because "moved for good" gives the browser permission to remember. If you send a bare three oh one, with no instructions about caching, the browser is allowed to keep that answer for as long as it likes. And the next time that person clicks, it goes straight to the target. It doesn't ask you.

B: [slowly] So I never hear about that click.

A: You never hear about it. And a shortener wants two things that remembering takes away. It wants to count clicks. And it wants to be able to change where a link goes. Someone pasted the wrong address, or a campaign page moved. Once a browser is holding a three oh one, that visitor's clicks never come back to you, and if you edit the link, they keep going to the old place. You can't reach into their browser and clear it.

B: Can't you just switch back to three oh two once you notice?

A: That's the nasty part. Switching back only changes what new answers say. The browser that stored the old answer isn't asking anymore. So it never gets the new one. Clearing their cache fixes it for one person. Nothing you do on the server fixes it for everyone.

B: Okay, so three oh two, always.

A: [amused] Well, here's the twist. When I checked the big public shorteners, they all answered with a three oh one.

B: Wait, what?

A: But every one of them sent a caching instruction along with it that kept the remembering short, or turned it off. So that's the second honest way out. A three oh one, but with a header that says, nobody keep this more than a minute or so. The status code says what the redirect means. The caching header says how long anyone's allowed to remember it. What you must not do is send a bare three oh one and then promise click counts.

B: So the real question isn't permanent versus temporary. It's whether the browser comes back to me.

A: That's the whole decision. And it's worth making on purpose, before launch, because you can't undo it afterwards.

<!-- section: Think before you prompt -->

B: Back to the interview, though. The candidate didn't make that choice at all. The library did.

A: And that's the general problem with typing the problem statement into the agent. The agent will happily make every design decision for you, silently, and you find out what they were when the interviewer asks. The fix costs about five minutes. Before you prompt, write the decisions down. Which redirect. Same link twice, same code or a new one. Local only, or public. How you'll know it works.

B: That's a lot of questions to ask an interviewer.

A: That's kind of the point. Asking them out loud is the design discussion they're hoping to see. The spec is just your answers, written so an agent can follow them. And I'd always end the prompt with one line: tell me any decision you had to make that I didn't cover. Because it will make some. And now it tells you which.

B: What about the two-people-at-once question? That one I genuinely didn't know.

A: That one's my favourite, because the obvious code is wrong in a way you can actually watch. The natural way to write "same link gets the same code" is, check whether the link's already there, and if it isn't, insert it. Two requests arrive together. Both check. Both see nothing. Both insert. And the second insert blows up. When I wrote it that way on purpose and fired twenty threads at it, it crashed every time. A real server would turn that into an error page.

B: [working it out] So it's a race between the check and the insert. You'd want a lock, or a transaction?

A: You'd want the database to be the referee. You tell the table the link column has to be unique, and you insert in a way that says "if it's already there, do nothing," and then you read back whatever code is there. The database enforces that even when requests race. Same trick for two random codes that happen to collide. The insert fails, you pick another code, you retry. No lock, no coordination. With that change, the same twenty-thread test passed every time.

B: And the agent wouldn't have written that test.

A: Probably not, unless you asked. You decide what gets tested. The agent can type it. And you read every line it wrote, because if you can't explain a line, you don't own it yet.

<!-- section: Strangers can reach it -->

A: Then there's the phone question. You don't need to deploy anything for that. You run a tunnel. That's a little program on your laptop that dials out to a provider and keeps the connection open, and the provider gives you a public address that comes back down that connection to your app. Nothing on your router gets opened. One command, and your laptop has a web address for as long as you leave it running.

B: That's the same idea as what I use to reach my home server.

A: Same family, yeah. But the more interesting thing is what changes the moment it's public. The question stops being "does it work" and becomes "who's using it." A shortener is a free, anonymous way to hide where a link goes. And that's exactly what scams want. Fake login pages love it. If you leave one open without any limits, scripts can find it within hours and start filling it with that stuff. So you say that before the interviewer does. And you keep the tunnel up for minutes, not days.

<!-- section: Start with a number -->

A: Okay, so then: how would you productionize it?

B: [a bit sheepish] My instinct is to start drawing boxes. A bigger database, maybe split it into services.

A: Everybody's instinct. But a scaling answer without a number is a guess, because you don't know which box matters. So the first sentence is, a shortener is read-heavy. A link is created once and clicked many times. A common working assumption is about a hundred clicks per link. That's an assumption, not a law, so you say it as one and invite them to correct you.

B: So the reads swamp the writes.

A: Completely. With a plausible amount of traffic, you end up with something like thirty thousand clicks a second at the busiest moment, against a few hundred new links a second. So nearly all the work is on the click side. And then you compare that to one machine. When I measured it, one Python process on a laptop handled a few hundred redirects a second comfortably and started falling behind before it got to a thousand.

B: So I need dozens of those.

A: Dozens. A handful of machines, not a data center. But dozens of copies means a load balancer in front, and that only works if the copies are stateless, meaning they keep nothing in their own memory that a later request needs. This app already is, almost by accident. Everything it knows is in the database.

B: And then a cache in front of the database.

A: Yeah, and short codes are almost the perfect thing to cache. Most of the pain with caching is knowing when your stored copy has gone stale. Here, a code points at one URL for life. Unless you allow edits, and then the edit just deletes the one entry it changed. And clicks are wildly uneven. A viral link gets hammered, most links get a handful of clicks, ever. That's what makes a cache pay.

B: [skeptical] Does it actually help, though? On a laptop?

A: [laughs] On my laptop it made things slightly slower. The database was a file on the same machine, and looking a code up in it was faster than the trip to the cache. A cache only pays when a hit is much cheaper than a miss. Once I faked a database that was a little way across a network, the cache cut the time right back down. Which is the real situation in production.

<!-- section: Where the queue goes -->

B: Okay, so this is where I have to confess the other thing. When the scaling question came up, my answer was, put Kafka or SQS in front, as a kind of load balancer. So if a container goes down, the queue still has the request, and it gets processed anyway.

A: That's a really natural answer, but it's in a place where it can't work. Think about what the browser is doing during a redirect. It's sitting there, waiting for one header. It can't do anything until it gets it. That's what synchronous means, the caller waits for the answer.

B: Sure.

A: A queue is the opposite tool. It's for letting whoever made the job walk away without waiting for it to be done. So put a queue in front of the redirect, and every click becomes: write a message, wait for some worker to pick it up, and then the worker has to somehow send the answer back to a browser connection it doesn't even hold. You've added a broker and extra hops in front of what was one quick lookup, and the browser still waits for the whole trip.

B: [pushing back] But the part I cared about was the dead container. If the request is in the queue, it doesn't get lost.

A: Right, and that's a real worry, it's just someone else's job. A queue isn't a load balancer. A load balancer forwards each request live, to a server that answers while the client waits. And it's the one that handles servers dying. It checks each one's health and stops sending traffic to any that fail. When you deploy, you take servers out a few at a time and let each one finish what it's already got before it stops. That's called draining. No click in flight gets dropped.

B: And with just one process?

A: I tried that. Killed the server in the middle of a load test and started it again. Lots of failed requests. Then did it politely, letting it finish what it had first. Fewer failures, but still not zero, because while the new one is starting up, nothing is listening at all. One process can't restart without a gap, however nicely you do it. Two behind a load balancer can. That's the real answer to "what if a container goes down."

B: So does a queue belong anywhere in this?

A: It does. Just behind the redirect instead of in front of it. Ask what work in this system nobody is waiting for. And there's exactly one thing. Recording the click. The visitor doesn't care whether you've written down that they clicked. So the redirect does the lookup, drops a tiny event on a queue, this code, this time, this country, and answers straight away. Workers on the other side write those into the analytics store in batches, at their own pace.

B: And that's where Kafka actually makes sense.

A: That's where it fits. A billion clicks a day is a stream that several things want. The counters, something looking for fake clicks, a data warehouse. And here's the experiment that made it click for me. I had the redirect write each click to the analytics store directly, and then made that store slow. Not broken, just slow. The redirects went from about two milliseconds to almost two seconds. They collapsed. And the database the redirects actually needed was perfectly healthy the whole time.

B: [quietly] Because every request was stuck holding a thread, waiting on the bookkeeping.

A: Yeah. The threads ran out, and new clicks piled up behind them. Then I moved that same write behind a queue, with the same slow store, and the redirects didn't notice. An optional side job, put on the request path, took down the main job. If a few click events get lost in a crash, that's acceptable. If the redirect gets slow so you can count every click, it isn't. Counting can be approximate. Redirecting can't be slow.

B: Which is kind of the three oh one thing again, isn't it? What you're willing to give up on counting.

A: It really is. Same with letting a delivery network near the visitor answer repeat clicks for a little while. Faster, and a viral link barely touches you, but every click it answers is one your servers don't count. Same trade, one layer further out. Fine, as long as you say it out loud.

<!-- section: Ending -->

B: Okay, let me try and say the whole thing back. It's one table, a short code to a long URL, and two operations, a rare write and a constant read. The read answers with a redirect, a tiny "go over there," and the browser does the second trip itself. Three oh one or three oh two is really about whether the browser comes back to me. And when it scales, you put a load balancer in front for dead servers, and a queue behind, so the clicks never get lost. Oh, and think before you prompt.

A: That's it, except for one bit. The queue behind isn't there so clicks never get lost. Losing a few in a crash is fine. It's there so the redirect never waits on them. And that's really the same question as the status code. For every piece of work, ask who is waiting for it. The browser is waiting for the redirect, so that stays quick and on the path, and nothing gets put in front of it. Nobody's waiting for the click to be written down, so that goes behind. And if you need the browser to keep coming back to you, you have to say so in the answer you send, because once it stops asking, you can't make it start again.
