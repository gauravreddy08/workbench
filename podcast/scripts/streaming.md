<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you've got your model server running on the Spark. You hit it with curl, and the answer comes out word by word. The first word shows up in a fraction of a second, and then you're reading while the rest is still being written. That's what makes a chat feel alive.

B: Sure. That part works.

A: That part works. So you do the sensible, grown-up thing. You put nginx in front of it on your home server. One port, encryption, a nice hostname over Tailscale. You open the chat, ask a question. And nothing happens.

B: Nothing at all?

A: Nothing. And nothing keeps happening. And then, several seconds later, the whole answer lands at once. Like streaming never existed. And you go look at your server's logs, and every token was sent right on time.

B: [skeptical] So nginx made it slow.

A: That's what it feels like. But check the total time. It's the same. The last word arrived when it always would have. nginx didn't slow anything down. It just held every word back until the end. It didn't slow the stream, it deleted it.

B: Huh.

A: And then there's a second bug. Next day, you ask for a long essay, read the first line, realise you asked the wrong question, and close the tab. And on the Spark, the GPU keeps going at full tilt. For another minute and a half. Writing an essay for nobody.

B: Oh, that's bad. If ten people do that—

A: Ten people's worth of GPU, burning on text that'll be thrown away. And one more. A long-running agent job streams progress updates, and sometimes it thinks for a while between updates. And every time it thinks for too long, the connection dies. Cut off halfway, and there's no error anywhere in your code.

B: Three different bugs.

A: Three bugs, one cause. And to see it, you have to go back to what HTTP was built for.

<!-- section: A counter, not a phone -->

A: So HTTP works like ordering at a counter. You say what you want, they hand it over, done. And between orders, the person behind the counter can't call your name. They don't even know you're still standing there.

B: But the connection underneath is two-way. Either side can send on TCP whenever it wants.

A: Right, and that's worth holding on to. The pipe is two-way. It's HTTP's rules on top that say the server only talks after you ask. So the whole problem of streaming is, the server has news, a token just got made, and the rules have no slot for "server speaks first."

B: So people hacked around it.

A: [warm] For years. In the early two thousands, people faked it by having the browser ask over and over, or by sending a request the server deliberately sat on until it had something to say. Someone eventually named that whole family of hacks Comet, as a pun on Ajax, because they're both cleaning products.

B: [laughs] Of course they are.

A: And two real standards came out of that mess. One is Server-Sent Events. Keep one reply open and just keep writing small text events into it. The other is WebSockets. Start as HTTP, and then switch the connection over to a different protocol where both sides can talk whenever. And years later, when OpenAI started streaming completions, they picked the older, simpler one. And almost everyone copied them.

<!-- section: Asking on a timer -->

A: But let's start with the simplest workaround, because it's still everywhere. Polling. The client just asks, "anything new?" every so often. Like every half second.

B: Which is fine, it's simple.

A: It's really simple. It works through anything. If the server restarts, nobody cares, every request stands on its own. But it has two costs. The first is delay. A token that's ready just after you asked has to wait almost a whole interval until you ask again. One that's ready just before waits almost nothing. So on average, every token is late by half the interval.

B: So poll faster.

A: And then you've got the second cost. Every poll is a full request. Headers up, headers down, routing, logging, auth, maybe a database read, whether there's news or not. When I ran it, the actual text of the answer was tiny, and polling quickly moved a pile of bytes that were almost all headers saying "nope, not yet." You trade delay for requests, one for one. Ten times less waiting costs ten times more requests. There's no setting that gets you both.

B: And long polling? Where the server sits on the request until there's news?

A: That's a really good fit when news is rare. A notification once a minute, it's great. But tokens come every few tens of milliseconds. So every token ends a request, and the client needs a whole round trip to ask again, while more tokens pile up. You'd basically be using a full request per token. What you actually want is one reply that never ends.

<!-- section: One reply that keeps going -->

A: And here's the trick. An HTTP reply doesn't have to say how long it is up front. You remember from building the server by hand, there's a way to send the body in pieces, each piece labelled with its own size, and the reply only ends when you send a piece of size zero. Until then the client knows more might come, and it keeps reading.

B: [working it out] So a streaming response isn't a special protocol at all.

A: That's the whole point. It's an ordinary HTTP reply that takes its time. Server-Sent Events, SSE, adds just two things on top. A label on the reply saying "this is an event stream." And a tiny text format inside. Each event is a couple of short lines, like a line starting with "data" and the payload, and then a blank line that means "this one's done, hand it over."

B: That's it?

A: Pretty much. And the browser even has a built-in client that reconnects on its own if the connection drops, and tells the server the last event it saw, so the server can pick up where it left off. One small thing to watch when you parse it yourself. The pieces on the wire and the events don't line up reliably. Something in the middle can merge three events into one piece, or split one across two. So you parse lines, not pieces.

<!-- section: WebSockets -->

B: [skeptical] Okay, but I'd always assumed WebSockets were the proper way to stream. That SSE was the cheap version.

A: That's a really common picture. So, a WebSocket starts out as a normal request with a couple of extra headers that basically say, "I'd like to stop speaking HTTP on this connection." And if the server agrees, from the next byte on, it isn't HTTP anymore. No requests, no replies. Just little messages flowing both ways, whenever either side likes. Like a phone call instead of a walkie-talkie.

B: Which sounds strictly better.

A: It sounds better. But think about what you lose. Your proxy, your load balancer, your logs, your rate limiter, they all understand HTTP requests. A WebSocket is one "request" that lasts an hour, carrying a protocol none of them can see into. Every hop has to be told to let it through. And reconnecting, resuming, errors, the message format, that's all yours to invent.

B: And for tokens going one way...

A: For tokens going one way, the extra power buys you nothing you can see. When I streamed the same fake model reply both ways and timed it, SSE and the WebSocket were basically indistinguishable. Same first token, same finish, both tiny. So the rule I'd use is, if the server talks and the client just listens, SSE. Reach for a WebSocket only when the client needs to keep talking during the stream.

<!-- section: Why the model APIs chose it -->

A: And now look at what a model API call actually is. The client sends one big message, the prompt, the settings, the API key. And then only the server talks, for seconds or minutes. That's exactly SSE's shape.

B: So they get to stay plain HTTP.

A: They get all of it for free. Every request carries the normal auth header, goes through the same load balancers, shows up in the same logs and the same rate limiter as a normal call. The streaming version and the non-streaming version are literally the same endpoint with one flag flipped in the body. The servers don't have to track some long-lived session. It gets through corporate proxies and firewalls that break WebSockets. And you can debug it with curl and your eyes.

B: When would they use WebSockets, then?

A: When the client has to talk mid-stream. Like voice, where you interrupt the model while it's still speaking. That's where providers do switch. Which is the same rule again.

<!-- section: The road between the GPU and the screen -->

A: Okay, so back to the three bugs. Between your model and the person's screen there are several programs. Your app, uvicorn, nginx, maybe a load balancer, maybe a CDN, the browser. And each one has its own buffer, its own timers, and its own idea of when to pass bytes along. And because a stream looks like a normal reply, each of them treats it like a normal reply.

B: So nginx buffering is the first one.

A: nginx buffers replies by default, and for normal replies that's a feature. Your app hands nginx a big response at local speed and moves on, and nginx slowly spoon-feeds it to some phone on a bad connection. Your app isn't held hostage by slow clients. But for a stream, "collect it all, then send" means the person sees nothing until the end. That was the blob. And the fix is tiny. Turn buffering off for that route, or have your app send one header that tells nginx, don't buffer this particular reply.

B: And the agent job that kept dying?

A: That's the idle timeout. Every hop that holds a connection open is spending memory on it. So each one has a rule, if nothing's moved for a while, hang up. For a lot of common proxies and load balancers it's around a minute. And the key thing is, it's about the gap between bytes, not the total length. A ten-minute stream is fine as long as something keeps flowing.

B: [working it out] So you just send something meaningless every so often.

A: That's a heartbeat. Every so often during a silence, you send a comment line, which in SSE is a line that starts with a colon. Every proxy sees bytes and resets its timer, and every SSE parser ignores the line. And if you've ever seen ping events in Anthropic's stream and wondered why, that's what they're for.

<!-- section: Nobody's reading -->

B: And the closed tab?

A: The closed tab is the subtle one. When you close it, your computer closes the connection politely. But that only tells the next hop. nginx sees its client leave, and it closes its own connection to uvicorn. Uvicorn notices and tells your app the client's gone. So far so good. But that's only half the job. The other half is the GPU finding out. And that's in your code.

B: And I'd assume the framework just stops my generator.

A: [amused] That's what I assumed too. And it depends on how you wrote it. With an async generator, when the client left, the framework cancelled it, and generation stopped within a few tokens. But I had a version where the model ran in a background thread and a plain, non-async generator pulled from a queue. And when the client left, the framework just quietly stopped asking for the next item. It never told the generator. The cleanup code I'd written never ran. And the thread happily finished the whole reply.

B: So the GPU never heard.

A: Never heard. And for a model that's a big deal. If somebody stops reading near the start of a long answer, almost all that GPU time is wasted. And on a server that batches lots of people together, that abandoned request is also holding a slot and its memory that someone else is waiting for. The real serving engines abort a request when its connection closes. Yours should too.

B: And if the Wi-Fi just dies, instead of a polite close?

A: Then nobody gets told anything. The server only finds out when a write eventually fails, which can take many minutes, or when a heartbeat goes unanswered. So heartbeats help with that too.

B: What about the other direction? The client's still there, just reading slowly.

A: That one actually works out. The bytes pile up in buffers until the reader's side says "I'm full," and then the server's write just waits. In an async server, your generator sits paused and nothing grows. That's backpressure, and it's a good thing. When I tried it with a client that connected and then never read, the server's counter climbed for a bit and then froze. The danger is only code that breaks that chain, like stuffing every token into a list in the background no matter what.

<!-- section: Ending -->

B: Okay, let me try. HTTP only answers when asked, so to stream, you send one reply that just never says how long it is, and you drip little text events into it. That's SSE, and the model APIs use it because it's still normal HTTP all the way through. And the bugs come from all the stuff in the middle being built for normal replies. Something buffers it, something hangs up when it's quiet, and nobody tells the GPU the user left.

A: That's it. The one piece I'd sharpen is that last part. It's not that nobody tells anyone. The news does travel, one hop at a time, as far as your app. Where it usually dies is the last step, inside your own code, between "the client's gone" and "stop generating." So when you build a streaming endpoint, don't just check that words come out. Close the tab halfway, and watch whether the GPU stops.
