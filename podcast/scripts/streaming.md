<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, your Spark server. The one from the baseline lesson, the deliberately naive one that runs the model and streams the answer back. It works. You hit it with curl, and the reply comes in word by word, which is exactly what makes a chat app feel alive. The first word shows up in about a third of a second. That number has a name, by the way. Time to first token. How long from sending the request until the first piece of the answer shows up. For a chat UI it's pretty much the number that decides whether the thing feels fast. And then you read while the rest gets written.

A: Then you do the sensible grown-up thing. You put Engine X in front of it on your home server, so you get one port, TLS, a nice hostname over Tailscale. You open the chat page, you ask a question... and nothing happens. And nothing keeps happening. Eight seconds later the whole answer appears at once. Like streaming never existed. And the server logs say every single token went out on time.

B: [skeptical] So the server thinks it streamed, and the browser got a blob.

A: Right. Next day, different bug. You ask for a two-thousand-token essay, you see the first line, you realise you asked the wrong question, and you close the tab. And N V I D I A S M I on the Spark keeps showing the GPU at full tilt for another minute and a half.

B: [a bit unsure] Wait, but... I closed the tab. The server knows I left, doesn't it? The connection's gone, so it stops.

A: [gently] That's the obvious picture. And no. It's writing an essay for nobody. And if ten people do that, ten people's worth of GPU is burning on text that's getting thrown away. And then one more. You've got a long-running agent job that streams progress updates. Sometimes it thinks for seventy seconds between updates. And every time it does, the connection dies. The client gets a cut-off response, and there's no error from your code anywhere.

B: Three bugs, no errors.

A: Three bugs, and they all come from the same place. HTTP was built for, you know, ask, get an answer, done. And streaming bends that model. So to fix any of these you have to see exactly how it's bent, and where on the road between the GPU and the browser something can bend it back.

<!-- section: Origin -->

A: And that bend has a history. Early HTTP was one request, one response, close the connection. The server could never speak first. Which is fine for documents. You ask for a page, you get a page. It's terrible for chat, or a stock ticker, or notifications, where the whole point is the server telling you something you didn't ask for yet. So in the early two thousands, developers faked it. Either the browser asked again and again, "anything new? anything new?", or it sent a request that the server deliberately didn't answer until it had news. A guy named Alex Russell gave that whole family of hacks a name in two thousand six. Comet. As a pun on Ajax, which was the big buzzword for browsers talking to servers back then.

B: [amused] Because they're both...

A: [laughs] Both cleaning products, yeah. That was the joke. And two real standards came out of that mess. Ian Hickson wrote Server-Sent Events into the HTML standards work at the W H A T W G in the mid two thousands. The idea's really simple: keep one HTTP response open, and write small text events into it, with reconnection built in. Opera shipped an early version in two thousand six. Then WebSockets, which Hickson also started, and which got finished at the I E T F, the internet standards body, as R F C sixty-four fifty-five in twenty eleven. That one's more drastic. Start as HTTP, then swap the connection over to a completely different, two-way protocol.

B: And the two-way one won, I'm guessing.

A: [amused] Funny thing. About a decade later, when OpenAI's API started streaming completions, it picked the older, simpler one. Server-Sent Events. And almost everyone copied it. By the end of this you should know exactly why that was the right call.

<!-- section: The Idea: HTTP only speaks when spoken to -->

A: So start with HTTP itself. HyperText Transfer Protocol. It's just text rules for asking a server for something. The client sends a request: a method like GET, a path, a few header lines. The server sends back a response: a status code, header lines, and a body. It's like ordering at a counter. You say what you want, they hand it over, the exchange is done. And between orders, the person behind the counter can't call your name. They don't even know you're still standing there.

A: But under the counter there's a T C P connection. That's the reliable pipe of bytes between two programs. You set it up with a handshake, and then bytes go in one end and come out the other, in order. And here's the first thing worth knowing. That pipe is two-way. Either side can write into it at any moment it likes.

B: [surprised] Oh. So the pipe could already do push. It's just HTTP saying "don't".

A: That's it. It's HTTP's rules on top that say the server only writes after a request. And HTTP one point one does keep the pipe open between requests. That's called keep-alive, reusing one T C P connection for several requests in a row instead of opening a new one each time, and it's the default. But it's still one request at a time, and each request gets exactly one response.

A: So the server-push problem is this. The server knows something new. A token's ready. The client wants to know right now. And the protocol has no slot for "server speaks first". There are four ways around that, and they differ in how hard they bend the rules.

<!-- section: The Idea: Short polling -->

A: The simplest one is polling. Also called short polling. The client just asks "anything new?" on a timer, every so many milliseconds, with an ordinary request each time. And the server answers right away with whatever's there. Which is usually nothing.

A: And honestly, it's got a lot going for it. It's easy to build, easy to cache, it goes through anything, and it survives restarts on either side, because every request stands on its own. If the server reboots between two polls, the next poll just... works. But it has two costs, and both of them scale badly.

A: The first one's latency. Say you poll every second. A token that becomes ready just after a poll has to wait almost the whole second for the next one. A token that's ready just before a poll waits almost nothing. And tokens show up at random moments compared to your poll schedule, so the wait's spread evenly between zero and the full interval. Which means on average it's half the interval. Poll every second, and every token arrives about half a second late on average. And the first token can be up to a full second late.

B: So the poll interval just becomes your time to first token.

A: Pretty much, yeah. The second cost is requests. Every poll is a full HTTP request. Header lines going up, header lines coming down, a trip through your framework's routing, logging, auth, maybe a database read. Whether or not anything changed. And the count's simple: requests per second is the number of users divided by the interval. So a thousand chat users polling every quarter of a second is four thousand requests per second. Of "nope, not yet."

A: Okay, try one. You poll every half second for a reply that takes three seconds to generate, with a token every fifty milliseconds. Roughly how many requests does one reply cost, and how much extra delay does the average token get?

B: [working it out] Three seconds, polling every half second... six polls. And the delay is half the interval, so a quarter of a second.

A: The delay's right. About two hundred fifty milliseconds per token, on average. The count's one short, though. Six polls, plus the request that started the job in the first place. So seven or so. Now cut the interval to fifty milliseconds. What changes?

B: Ten times more polls, so... sixty-something. And the delay drops to, what, twenty-five milliseconds.

A: About sixty polls, and about twenty-five milliseconds of extra wait. So look at what you did. You traded latency for requests, one for one. Ten times less delay cost ten times more requests. And there's no setting on polling that gets you both. That's really the whole reason the other three exist.

<!-- section: The Idea: Long polling -->

A: Long polling flips one detail. The client asks, and the server holds the request open. It just doesn't answer. Until it has something to say, or until a timeout passes, say thirty seconds, and then it answers "nothing". And the moment an answer lands, the client asks again.

A: So now latency is about one network trip, instead of half an interval. As soon as a token exists, the server answers the request that's already waiting. And requests drop to roughly one per batch of news, instead of one per tick. For notifications that come once a minute, that's a huge win. Which is why long polling powered a whole generation of web chat. And it still powers things like Telegram's bot API, where you call get updates with a timeout and it just sits there until there's a message.

B: [skeptical] But for tokens... tokens come every few tens of milliseconds. So every token ends a request, and then I have to send a new one.

A: Right, and while your next request is still travelling to the server, more tokens are piling up. You pay full HTTP headers for every token or two. You'd be using a request-response protocol to send a stream, one response per item.

B: So what you actually want is a response that just... doesn't end.

A: [amused] Which is the next one.

<!-- section: The Idea: Server-Sent Events -->

A: So here's the trick S S E is built on. An HTTP response doesn't have to know how long it is up front. Normally the server sends a content length header, say eighteen hundred thirty-four, and then exactly that many bytes, and the client knows it's done when it's counted them. But HTTP one point one also has something called chunked transfer encoding. Instead of a length, the server says "transfer encoding: chunked", and then sends the body in pieces. Each piece starts with its own size, written in hexadecimal, on its own line, then the bytes. And the response only ends when the server sends a piece of size zero. Until then the client knows more might come, so it keeps reading.

A: So a streaming response isn't a special protocol at all. It's an ordinary HTTP response that takes its time.

B: [amused] That's... kind of anticlimactic.

A: [laughs] It is, and that's the point. Server-Sent Events add just two things on top. A content type, text slash event-stream, and a tiny line-based text format for what goes inside. If you captured the actual bytes off the socket from the server you're going to build, here's what you'd see. At the top, sent once: the status line, two hundred OK. Then a few headers. Content type event stream, cache control no-cache, transfer encoding chunked. Then a blank line, and notice, no length anywhere. Then the first chunk. It starts with "one B", which is hexadecimal for twenty-seven. So, twenty-seven bytes coming. Then a line that says "id: zero". Then a line that says "data:" followed by a little bit of JSON with the word "the" in it. Then an empty line. And then the two-byte marker that closes the chunk. Fifty milliseconds later, same connection, the next chunk. Slightly bigger, because the word is "quick". "id: one", "data:" with "quick" in it, an empty line. And so on, until a final chunk of size zero ends the whole response.

B: [working it out] Okay, so one chunk, one event, one token. A chunk is a token.

A: That's the picture most people have, and it's the one that'll bite you. There are two layers, and it's worth keeping them apart in your head. The chunk framing, the hex length and the end marker, that belongs to HTTP one point one, and your HTTP client strips it off before you ever see it. The event format, the "id:", the "data:", the blank line, that's S S E, and that's what your code actually parses. In your server, a chunk usually holds one event. But nothing guarantees it. A proxy in the middle can merge three events into one chunk, or split one event across two. So your parser has to work on the stream of lines. Never on chunks.

B: And a token being one event, that's just how my server happens to do it.

A: That's just your server. An API might put several tokens in an event, or send events that carry no text at all. Okay, the event format. And this is genuinely all of it. Every line is a field name, a colon, and a value. One space after the colon is optional and gets stripped. The "data" field is the payload, and if one event has several data lines, they get joined with newlines, so an event can carry multi-line text. The "event" field gives the event a name, like content block delta. If there's no name, it's called "message". The "id" field labels the event, and the client remembers the last one it saw. The "retry" field tells the client how many milliseconds to wait before reconnecting if the connection drops. A line that starts with a colon, with no field name at all, is a comment, and it's ignored.

B: [skeptical] Why would a stream need comments?

A: It sounds useless. Hold on to it, because it turns out to be the most important line in production. And last rule: a blank line ends the event. Until the blank line arrives, the client keeps collecting fields. Then it delivers the event and starts fresh.

A: The browser has a built-in client for this, called EventSource. You give it a URL, it opens the stream, parses the events, and calls your handler for each one. And its best feature is that if the connection drops, it waits, either the retry value or a browser default of a few seconds, reconnects all on its own, and sends a header called Last Event I D with the last id it saw. So a server that keeps recent events around can resume from exactly where the client fell off. Polling gets that for free, because every request's independent anyway. S S E gets it with one header.

A: The limits are just as simple. It's one-way. The client spoke once, in the request, and after that only the server talks. It's text only, U T F eight. And EventSource itself can only do a GET. No custom headers, no body. Which is why LLM SDKs don't use EventSource at all.

B: Because you need to send the prompt. And an API key.

A: Right. They send a normal POST with a JSON body and an auth header, then read the response as a stream and parse the S S E lines themselves. Which is what that little s s e events helper in your baseline harness was doing. You already wrote an S S E client. Nobody told you that's what it was.

<!-- section: The Idea: WebSockets -->

B: [a bit unsure] Okay, but... WebSockets are the newer one, right? Two-way, binary, the real-time thing. My gut says that's just the better version, and S S E is the old cheap one.

A: [thinking it over] It's more powerful, for sure. Whether that makes it better depends on what it costs you, so let's look at what it actually does. A WebSocket starts as a perfectly ordinary HTTP GET, with two extra headers. One says "connection: upgrade", the other says "upgrade: websocket". Together they mean, "I'd like to stop speaking HTTP on this connection." There's also a version number, thirteen, and a random-looking key.

A: If the server agrees, it answers with status one-oh-one, Switching Protocols. And from the very next byte, that connection is not HTTP anymore. No more requests, no more responses. Just frames. A frame is the unit of a WebSocket conversation: a small header, between two and fourteen bytes, saying what kind of frame it is and how long it is, and then the payload. And frames flow in both directions, whenever either side likes. That's what full-duplex means. Both sides can send at the same time, independently. Like a phone call, as opposed to a walkie-talkie, where you take turns.

B: [skeptical] And the random key, that's the security part? Like a password?

A: Not really. It's a little proof that the server really understands WebSockets, and isn't just some old server that echoed your headers back by accident. The server takes your key, sticks a fixed string on the end of it, a long made-up identifier that's printed right in the R F C, then hashes the whole thing with SHA one and base sixty-four encodes the result. And it sends that back in a header called Sec WebSocket Accept. The R F C even gives a worked example: one sample key, and the exact answer you should get. You can check it with three lines of Python. And then you get exactly that same string back from uvicorn when you do the handshake by hand.

A: Now picture the frame header itself, because it's tiny. Two bytes for a small message. In the first byte there's a bit that says "this is the final piece of the message", three reserved bits nobody uses, and then four bits called the opcode, which says what kind of frame it is. One is text, two is binary, eight is close, nine is ping, ten is pong. In the second byte there's one bit that says "this frame is masked", and seven bits of length.

A: And three things in there are worth understanding. First, length. Seven bits holds numbers up to a hundred twenty-five. If the length is bigger than that, the value is set to a hundred twenty-six, which means "the real length is in the next two bytes", or a hundred twenty-seven, which means "it's in the next eight". So a small message costs two bytes of framing. Compare that to S S E, where every event pays for the "data" prefix, the blank line, and the chunk wrapper around it. Your first token as a WebSocket frame is the two header bytes plus thirteen bytes of JSON. Fifteen bytes. The exact same token as an S S E event is thirty-three.

B: So about half.

A: About half. Second thing, opcodes. Besides text and binary, there are control frames. Close, which carries a reason code. And ping and pong, which either side can use to check the other one's still alive. Heartbeats are built right into the protocol. Remember that for later, it matters.

A: Third, masking. Every frame from the browser gets scrambled with a random four-byte key, by flipping bits with it, and that key costs four extra bytes on every frame from the browser. So the browser's scrambling everything, which sounds like —

B: [jumping in] Encryption. Light encryption?

A: No, and that's the strange part. The key is sent right there in the frame header. Anyone can undo it. It's there because of an attack from twenty eleven. A malicious web page could make your browser send WebSocket bytes that looked, to a naive proxy sitting in the middle, like a separate, normal HTTP request. And that let it poison the proxy's cache. A cache, in a proxy, is a store of copies of earlier responses that it hands out instead of asking the real server again. Poisoning it means getting the proxy to store the attacker's response under a real URL, so everyone behind that proxy who asks for that URL gets the attacker's version. Random masking means the page can't control what the bytes on the wire look like, so it can't forge that fake request. Servers have to reject unmasked frames from clients. And frames from the server aren't masked, because the attacker can't control the server.

B: [amused] So it's a lock where the key's taped to the door, and the point is just that the attacker doesn't get to pick the shape of the door.

A: [laughs] Yeah, close enough. Okay, so here's the price of all that power, and this is the answer to your "better version" question. After the upgrade, the connection isn't HTTP anymore. Your proxy, your load balancer, your logs, your rate limiter, they all understand HTTP requests. To them a WebSocket is one "request" that lasts an hour, carrying a protocol they can't see into. Every hop on the way has to be told to pass it through. And resuming after a drop, error handling, the format of your messages, those are all yours to invent. S S E got all of that from HTTP for free.

B: [slowly] So it's not better. It's more. And you pay for the "more" at every hop.

<!-- section: The Idea: All four on one timeline -->

A: So picture all four next to each other, as four little diagrams. Each one has a client line and a server line, and time runs downward. And the same six tokens appear on the server side, at the same moments in all four. Short polling: arrows going back and forth on a timer. Five requests. The first one comes back with nothing, then one token, then three at once, then one, then one. Long polling: six requests, and on the server side you see each one held, just waiting, until a token shows up and it's answered right away. S S E: one request, one response, and then six little arrows coming down that one response. And the WebSocket: one upgrade at the top, the switching answer, then tokens coming down as frames... and then an arrow going the other way. The client saying "stop". And on the server side, generation cancelled.

A: There's also an interactive version of this, which is worth actually playing with. Top lane is the model making tokens. First there's a gap of three hundred milliseconds, which is prefill. That's the first phase of generation, where the model reads your whole prompt in one big pass before it can produce the first output token. That's what sets time to first token. Then one token every so often. And below that are three lanes, polling, S S E and WebSocket, each showing when that client first actually sees each token, with a dashed line for how long it waited. You've got a slider for the poll interval and one for the gap between tokens. Drag the poll interval and you watch the polling lane's average wait track half the interval, while its request count climbs as you shorten it. Switch to long polling and the wait drops to about one round trip, but now it's a request per token. And there's a button that puts a buffering proxy in front of S S E. Turn that on and S S E still uses one request... but every single token arrives at the end.

B: And I'm guessing the S S E lane and the WebSocket lane are basically the same line.

A: Identical. That's one of the three things it's meant to make obvious. Polling's wait is set by the interval, not by the network. Long polling is basically S S E with a full HTTP request bolted onto every token. And for a one-way token stream, a WebSocket's extra power buys you nothing you can see.

<!-- section: The Idea: Which one, when -->

A: So how do you actually pick? Ask who needs to talk. With both kinds of polling, the client asks every time. With S S E, the server talks after one request. With a WebSocket, either side, any time. Then ask how late is okay. Short polling adds about half the interval, long polling about a round trip, and the other two add basically nothing. Then, what does each update cost? Short polling burns requests even when there's no news, long polling's about one request per update, and S S E and WebSockets are one request, or one connection, for the whole stream. And then the boring questions that end up mattering. Is it plain HTTP the whole way? For polling and S S E, yes. For a WebSocket, only that first request. What happens after a drop? Polling doesn't care, every request's fresh anyway. S S E has the Last Event I D header. A WebSocket, you build it yourself. And binary data works everywhere except S S E, which is text only.

A: So in practice, short polling is for a dashboard that refreshes every thirty seconds, or checking a job's status. Long polling is for rare notifications. S S E is for token streams, logs, progress updates. And WebSockets are for chat with typing indicators, games, collaborative editing, voice. Anywhere the client keeps talking.

B: So the rule is basically... if updates are rare and being a bit late is fine, just poll. If the server talks and the client listens, S S E. WebSocket only if the client needs to talk during the stream.

A: And talk a lot, and need it to land soon. Yeah. And polling, people underrate it. It's the most robust thing there is.

<!-- section: The Idea: Why LLM APIs chose SSE -->

A: So now look at what an LLM API call actually is. The client sends one big message. The prompt, the settings, the auth key. And then only the server talks, for seconds, sometimes minutes. That's exactly S S E's shape. And in return for picking it, the API providers get a lot.

A: It's still HTTP. Every request carries an authorization header, goes through the same load balancers, shows up in the same logs and the same rate limiter as a non-streaming call. Retries work the way they always did. The streaming and non-streaming versions of the API are literally the same endpoint, with "stream: true" or "stream: false" in the body. Servers stay stateless. Each stream belongs to one request. There's no long-lived session to track, or move somewhere else, or clean up when a server restarts. It goes through everything. Corporate proxies, CDNs, firewalls that block or break WebSockets, they'll let a long HTTP response through. As long as they don't buffer it, which is coming up. And you can debug it with curl. Curl with the no-buffer flag and your own eyes are a complete S S E client.

B: And are the actual events the same across providers? Because my helper was written for one.

A: Close, not the same. OpenAI-style APIs send unnamed events and finish with a literal line, "data: DONE", with DONE in square brackets. You met that in the baseline lesson. It's not JSON, which is why your helper had to check for it. Anthropic's API names every event. Message start, content block delta, message stop. And every now and then it sends an event called ping. Notice what that ping's for. It's coming up.

A: And when the client really does need to talk mid-stream, providers switch. Speech to speech, where you interrupt the model while it's still talking. OpenAI's Realtime API, for example, uses WebSockets, and also Web R T C.

B: Which is that comparison, played out for real.

A: Yeah. The client needs to talk during the stream, so the shape changed, and so did the protocol.

<!-- section: The Idea: The road between the GPU and the screen -->

A: Okay. Back to the Engine X story, because now we can say what went wrong. Between your generator and the user's screen there are several programs. Each one has its own buffer, its own timeouts, and its own idea of when to pass bytes along. Picture them in a row, left to right. The browser on the far left, with its S S E parser. Then maybe a CDN or a cloud load balancer, which is optional. Then Engine X. Then uvicorn, which is your app. And on the far right, the generator and the GPU. Tokens flow right to left, toward the browser. And the message "the client left" has to travel the other way, left to right, all the way back to the GPU. And under each box, what can go wrong there. The browser has to parse by line, not by chunk. The load balancer has an idle timeout, often sixty to a hundred seconds, and it might compress. Engine X buffers by default, and has a sixty-second read timeout. Uvicorn sees a disconnect as end-of-file or as a write that fails. And the generator has to be told to stop, or it just finishes anyway.

B: So it's a chain, and any link can break it.

A: A stream is only as streaming as its worst hop. So, one problem at a time. First, buffering. Engine X here is a reverse proxy. That's a server that sits in front of your app server, accepts the client connections, and forwards the requests to your app. It handles TLS, routing, compression, slow clients. Engine X is the classic one. And it buffers responses by default. For a normal response, that's a feature. Your app writes a two-megabyte JSON response into Engine X at local speed, which is basically instant, and moves on to the next request. Then Engine X spoon-feeds those bytes to some phone on a bad connection, at whatever pace the phone can manage. Your app isn't held hostage by slow clients.

B: [working it out] Okay, so for a stream... it's collecting tokens. So the stream gets slower going through it?

A: [firmly] Not slower. It's stuck. "Collect it all, then send" means the client sees nothing until the end. That's the eight-second blob. Every token reached Engine X on time, and Engine X just sat on them. We'll measure exactly that later, and the numbers are pretty stark. The fix is one of two things. Either you turn buffering off for that location in the Engine X config, the setting is literally called proxy buffering, and you set it to off. Or your app sends a header on that one response, X Accel Buffering, set to "no". Engine X reads that as "don't buffer this one response", and strips the header before it forwards anything. And also check compression. A gzip layer that waits to fill up a compression block before it writes anything breaks streams in exactly the same way.

B: And if it still comes out as a blob after that? How do you actually find which hop it is?

A: Bisect the road. Hit the app directly first, bypassing everything, with curl and no buffering, and look at the timing. If that streams, add one hop at a time until it stops. The usual suspects: the reverse proxy buffering, a gzip layer, a CDN or load balancer that buffers. And now and then it's the app itself, like a framework middleware that reads the whole body before passing it on, or a print with no flush. And check the client too. An HTTP library that isn't in streaming mode will happily wait for the whole body and hand it to you at the end. Once it streams, then go look at timeouts.

A: Which is the second problem. Idle timeouts. Every hop that holds a connection open is spending memory on it. So each one has an idle timeout: how long it lets a connection sit with no bytes flowing before it closes it. Engine X's proxy read timeout defaults to sixty seconds of nothing from upstream. AWS's Application Load Balancer has a sixty-second idle timeout by default. Cloudflare gives your origin server about a hundred seconds. And those change, so check your provider's current docs. So a stream that thinks for seventy seconds without sending a byte gets cut, mid-response.

B: [realizing] That's my agent job. The seventy-second pause.

A: That's your agent job. And notice, the sixty seconds is between bytes, not for the whole response. A ten-minute stream is totally fine, as long as something keeps flowing. So the fix is a heartbeat. A small, meaningless message sent on a timer just to prove the connection's alive, so no hop's idle timer ever fires. And here's the comment line paying off. Every fifteen seconds or so of silence, you send an S S E comment. A line that starts with a colon, says "ping", and then a blank line. Every proxy on the road sees bytes go by and resets its timer. And every S S E parser ignores the line completely.

B: [amused] So that's the ping event in Anthropic's stream.

A: That's what it's for. And recent FastAPI versions have an Event Source Response that sends that ping comment every fifteen seconds on its own.

B: [skeptical] Hang on, though. Doesn't T C P already have a keepalive? Something that checks the other end is still there?

A: [amused] It does. But on Linux, by default, it waits two hours before it sends the first probe. Two hours. Every one of these timers fires after a minute or so. So T C P keepalive is just far too slow to help here.

A: Third problem, and this is the essay. Disconnects. So you said earlier, "I closed the tab, the server knows I left." Let's walk what actually happens. You close the tab. Your laptop's operating system closes the T C P connection, which means it sends a packet called a FIN. That's the T C P packet that means "I'm done sending". It's how a connection closes politely, and how the other side finds out. But that FIN only tells the next hop. Engine X sees its client leave, and by default it closes its own connection to uvicorn. Uvicorn is always reading from the socket, so it sees end-of-file and tells your app, "client disconnected".

B: [a bit surprised] Okay, so it does get there.

A: In that case, yeah, the news makes it to your app. But if the network just vanishes instead, like a laptop lid closes or the Wi-Fi drops, then no packet arrives at all. Nobody sent a FIN. And the server only finds out when one of its writes fails, which can take many minutes of T C P retrying, or when a heartbeat goes unanswered. Which is a second reason heartbeats matter. They help you notice a dead client, not just keep a live one alive.

A: And either way, the server finding out is only half the job. The other half is the GPU finding out. Your app has to turn "the client left" into "stop generating". And that's the part that's easy to get wrong. You'll see exactly how in the build.

B: [skeptical] How much does it actually matter, though? One wasted essay.

A: Do the math on your two-thousand-token essay. You read a hundred tokens and closed the tab. The other nineteen hundred are ninety-five percent of the GPU time, spent on nothing. And on a batching server, where one GPU is working on many people's requests together in one batch, it's worse. That abandoned request is holding a slot in the batch, and its KV cache, the memory where the model keeps what it's already computed for that conversation, is sitting there taking space another user's waiting for. Production engines like V L L M abort a request the moment its HTTP connection closes. Yours should too.

A: And the last one's sort of the opposite problem. Backpressure. The client's still there, it's just slow. A phone on a train. Your server's producing tokens faster than the client reads them. So where do the bytes go? They pile up in your kernel's send buffer, then in the client's receive buffer, until T C P's flow control kicks in. That's T C P's built-in "slow down" signal. The receiver keeps telling the sender how much buffer space it has left. That's called the window. When it hits zero, the sender's kernel stops sending, and any writes on that socket start to wait.

B: And in an async server, waiting means...

A: Right, so quick reminder from the async episode. In an async server, one event loop runs lots of tasks, and every time a task hits an await on something slow, it gets set aside until that thing's ready, and the loop goes off and runs something else. So here, the await on the send just doesn't return. Your generator's paused at its yield. And nothing grows. That pause is backpressure. A slow consumer pushing back on a fast producer by making it wait, so data can't pile up without limit in between. And it's a good thing. The danger is code that breaks the chain. Like a background task that appends every token to a list that just keeps growing, for a client that's reading at a crawl. Now, for token streams, the rates are tiny. A few hundred bytes a second. So backpressure rarely bites you. For streaming logs, or video, or big tool outputs, it absolutely does.

<!-- section: The Idea: HTTP/2 and gRPC -->

A: One more layer, briefly. Everything so far was HTTP one point one, where one T C P connection carries one response at a time. And that matters for S S E in browsers, because over HTTP one point one, a browser only allows about six connections per site. And every open S S E stream holds one of them.

B: [amused] So I open seven chat tabs...

A: And the seventh one hangs. HTTP two fixes that. It's the second major version of HTTP. Same meaning, same methods, headers, status codes, but the framing's binary, and many requests and responses get interleaved on one T C P connection as separate numbered streams. Each stream is one request and its response, and their frames are mixed together on the wire. And chunked encoding actually doesn't exist in HTTP two. It's forbidden. Because every response is already a sequence of data frames that can end whenever it likes. So an S S E response over HTTP two is just a stream that stays open, sharing a connection with maybe a hundred others. Your S S E code doesn't change at all. The framing underneath it does.

A: And g R P C builds on those streams. It's Google's framework for calling functions on another machine. You define the functions and the message types in a file, and it generates clients and servers that send compact binary messages over HTTP two. A g R P C function can be server streaming, one request and many responses, which is the LLM shape. Or client streaming, or both ways at once. And all of those run as one HTTP two stream. It's really common between services inside a company, and a lot of inference servers offer a g R P C API alongside the HTTP one. But it needs HTTP two the whole way, end to end, and it doesn't run directly in browsers. So the public edge of LLM APIs stays S S E.

<!-- section: Build It: Setup -->

A: Okay, so what you actually build. One FastAPI app that serves the same reply all three ways, polling, S S E and WebSocket, from one fake model. So the only thing that changes between experiments is the protocol. Run it all on your Mac first, then take the fixes to the real Spark server at the end. Setup's quick. A folder, a virtual environment, FastAPI, uvicorn, HTTPX, the websockets library, and Engine X.

A: The fake model is an async generator. It sleeps fifty milliseconds, pretending that's one decode step on the GPU, and yields a word, fifty times. "The quick brown fox", round and round. And the part that matters: it counts every token it makes, in a little stats dictionary you can read from an endpoint. That's how you'll know later whether generation really stopped. There's also an endpoint that reports how many seconds of CPU the server process has used so far.

A: And to count bytes on the wire without Wireshark, you put a tiny T C P relay in front of the server. It just forwards bytes both ways and counts them, up and down. Connect to the port next to it and it prints the totals and resets.

<!-- section: Build It: Polling -->

A: Polling first. And there's a design point hiding in it. With polling, the generation has to live somewhere between polls. So the request that starts the job can't be the one that streams it. You need a job store. A start endpoint that creates a job id, kicks off a background task running the fake model, which appends each token to that job's list and marks it done at the end, and returns the id. And a poll endpoint that takes the job id and a "since" number, and returns the tokens after that point, the next number to ask for, and whether it's done.

A: Then the client. Start a job, poll every so often until it's done, and report time to first token, which here means until the first poll that comes back with something, the total time, the number of requests including the start, and the number of tokens. Two hints that matter. When you start a background task, keep a reference to it somewhere, or Python can garbage collect it halfway through the run. And use one HTTPX client for the whole run, so all the polls reuse one keep-alive connection. Otherwise you're also measuring T C P setup on every poll.

B: [surprised] Python can just throw away a task that's still running?

A: If nothing's holding on to it, it can, yeah. So hold on to it. And if you want, add long polling: the handler waits on an async event that the job sets every time there's a new token.

<!-- section: Build It: SSE and the parser -->

A: Then S S E. The endpoint's a streaming response. For each token from the fake model, you yield one event: an id line, a data line with a little JSON holding the word, then a blank line. And at the end, the "data: DONE" event. Content type text event-stream, and a cache control header saying no-cache. Then check it with curl, no buffering, showing headers. You should see the headers once, and then events arriving fifty milliseconds apart. And if you add the raw flag, curl stops hiding the chunk framing and you see those hex sizes.

A: Then the client, and this is the part worth doing carefully. The helper from the baseline lesson only handles one data line per event. You write a parser that actually follows the spec. Because one day an API is going to send you multi-line data, or named events, and the simple one will just silently drop things. The rules are the ones from before. A blank line delivers the event, if any data was collected. A line starting with a colon is a comment. For any other line, split at the first colon into field and value, and strip one leading space from the value. One, not all. Data lines get added to a list and joined with newlines. "Event" sets the name, and the default is "message". "Id" sets the last event id, and that one sticks around across events. And any field you don't recognise, ignore it.

A: And before you trust it, hand-write a test string with a comment in it, a data field split over two lines, and a named event, and check what comes out. Then the client streams the endpoint with HTTPX line by line, runs your parser over it, and stops at DONE.

A: And then the fun one. Watch EventSource reconnect. Serve a ten-line HTML page from the app that opens an EventSource on your stream and appends each message to the page. Have your endpoint print the Last Event I D header whenever it gets a request. Load the page, kill uvicorn halfway through, start it again. A few seconds later, the browser reconnects all by itself, and your server prints the last id it got.

B: [skeptical] Wait, and if the stream finishes normally? It ends with DONE, the server closes...

A: [amused] Then a browser that follows the spec reconnects anyway. To the browser, the server closing is just a dropped connection. DONE means nothing to it, that's your own convention. Which is why real apps close the EventSource themselves when they see their end marker.

<!-- section: Build It: WebSocket -->

A: The WebSocket endpoint: accept the connection, wait for one text message from the client, that's the "prompt", then send each token as a text message of JSON, then DONE, then close. The client connects, sends "go", and reads messages until DONE. And one detail: turn compression off in the client. The websockets library negotiates per-message compression by default, and if you leave it on, your byte count isn't a fair comparison anymore.

A: And do the handshake by hand once. Send that upgrade request with curl, using the sample key from the R F C, and compare the accept value uvicorn sends back with what three lines of Python compute. Key plus the fixed string, SHA one, base sixty-four. They match.

<!-- section: Build It: Harness -->

A: Then the harness. One script that runs each client once through the counting relay and prints a row: method, time to first token, total time, requests, bytes up, bytes down. Polling at fifty milliseconds, a quarter second, and a full second. And a second script for server CPU. Read the CPU counter, run two hundred streams of one kind all at once, read it again, divide the difference by two hundred. For each method. Run the server with logging turned down to warnings, so writing access logs doesn't dominate the CPU number. And then have an agent review your harness for measurement mistakes. Warm-up, the client and server fighting over the same cores, whether you counted the start request.

<!-- section: Build It: nginx -->

A: Then put Engine X in front and watch it break. You run Engine X straight out of your project folder with its own little config file, so you don't touch any system install. Two locations, both forwarding to your app. One with defaults. One with proxy buffering turned off. Then a small script that streams a URL with HTTPX reading raw bytes, and prints when the first byte arrived, how many reads it took, and the total time. Run it straight at the app, through the default location, and through the fixed one.

A: So, guess. Through the default location. A fifty-token stream, two and a half seconds long. What's the time to first byte, and how many reads?

B: [a bit unsure] I'd guess it's laggy? Like, the first token comes a bit late, and then it's choppy. A few hundred milliseconds behind, in clumps.

A: First byte at two point five five seconds. One read. All fourteen hundred fifty bytes at once. Straight at the app, and through the fixed location, the first byte shows up at seven hundredths of a second, and it takes fifty-one reads. The whole stream fits in Engine X's default buffers. They're a memory page or so each, and the whole stream's only about one and a half kilobytes. So Engine X just waited for the response to end. With a longer stream you'd see it come through in bursts, one buffer at a time. Which is kind of worse, honestly, because it looks like it's streaming and just lagging. Which is roughly what you guessed, actually. Just not for a stream this short.

B: [quietly] So with a short one it's not choppy. It's just gone until the end.

A: Right. Then the second fix. Leave buffering on, and make the app send that X Accel Buffering "no" header. Through the default location, it streams. No config change at all. And one oddity from running this on a Mac with Engine X version one point twenty-nine. Setting the proxy's HTTP version to one point one, on its own, so Engine X talks chunked HTTP one point one to uvicorn instead of its default, which is one point oh, also made the stream flow. With buffering still on. Don't build on that. It isn't the documented way to turn buffering off, and a gzip layer or another proxy would undo it. Be explicit. And write that config yourself, ask an agent only to explain whatever surprises you.

<!-- section: Build It: Stop generating when the client leaves -->

A: Okay. Now the essay bug. First find out what your S S E endpoint already does. Read the token counter. Run curl with a max time of half a second, so it hangs up after half a second. Wait three seconds, and read the counter again. How many new tokens?

B: [a bit unsure] Fifty, because nothing told the generator anything?

A: About ten. Not fifty. And here's why, with a quick reminder of how async works. Your generator spends almost all its time paused at an await, the fifty-millisecond sleep. And when the client disconnects, Starlette, which is the framework under FastAPI, cancels it. Cancelling a task in async I O means the event loop raises a special error, Cancelled Error, right at the await where the task is paused. So the next time your generator would've woken up, it gets that error instead, and it unwinds and stops. Half a second at fifty milliseconds a token is ten tokens. Then nothing.

A: Now the real case. Your Spark server doesn't generate inside an async generator. In the baseline it runs the model's generate call in a background thread, the thread pushes tokens into a queue, and a plain, non-async generator pulls them off the queue and yields them. So you simulate that. A thread that makes sixty items, fifty milliseconds apart, and has a stop flag it's supposed to check, the way a stopping criterion would. A plain generator that pulls from the queue. Run the same curl test. Then make it stop. Make the thread stop when the flag's set. Make something set the flag when the client goes away. And think about who actually notices the disconnect. And prove it with the counter: about ten tokens after a half-second client, not sixty.

A: So before you fix anything. With the threaded version unchanged, how many tokens does the thread make after curl hangs up? And the obvious fix is a try-finally in that plain generator, so when it ends, the finally block sets the stop flag. Does that finally block run when the client leaves?

B: [confident] Finally always runs. That's the whole point of finally. So it runs, sets the flag, and the thread stops. And before the fix, all sixty, sure.

A: All sixty, yes. And the finally... doesn't run. On FastAPI zero point one four three, with Starlette one point eight, it still hadn't run four seconds after the disconnect. Here's why. Starlette runs a plain generator by asking it for the next item, in a worker thread, one item at a time. When the client leaves, it just stops asking. It doesn't close the generator. So nothing inside it ever finds out. And meanwhile the generate thread doesn't care about any of this, it finishes its full run.

B: [sighs] So "finally always runs" means... it runs if somebody actually ends the generator.

A: That's the precise version, yeah. What worked: make the response generator async, pull from the queue with await to thread on the queue's get, so the blocking get runs in a thread and the generator itself sits at an await. And set the stop flag in a finally. Now the disconnect cancels the async generator, the Cancelled Error lands at that await, the finally runs, the flag gets set, and the thread stops at its next check. Measured: nine tokens generated after a half-second client. Another option is a little watcher task that loops, asking the request whether the client's disconnected, and sets the flag when it is.

A: On a real Hugging Face server, that stop flag becomes a custom stopping criterion that returns true when the flag's set. Check the transformers docs for its current signature. And in V L L M or S G Lang, the server does this for you, by aborting the request.

<!-- section: Build It: Apply it to the Spark server -->

A: And then take it home. Your naive server from the baseline lesson gets three production fixes. Generation stops when the client disconnects, and you check it with N V I D I A S M I: GPU use should drop within a second of closing curl. A heartbeat comment every fifteen seconds while a request is waiting for the GPU lock, which is the lock that lets only one request use the GPU at a time. And the X Accel Buffering header. Put it behind Engine X on your home server and rerun the baseline harness through it. Time to first token should match going direct, within a few milliseconds. And have an agent review the cancellation path for races. Like, what happens if the client leaves while the request is still waiting for that GPU lock?

<!-- section: Measure -->

A: Then you measure. On your Mac, over localhost, so network time is near zero, which isolates what the protocols themselves cost. Fifty tokens, fifty milliseconds apart, so a perfect client sees the first token at about fifty milliseconds and the last one at about two and a half seconds. My run was on an M-series MacBook, Python three point fourteen, uvicorn zero point five four, HTTPX clients. Yours will be different. The shape shouldn't be.

A: Start with time to first token. The best you can do is about fifty milliseconds, that's when the token exists. S S E got it in about eight hundredths of a second, the WebSocket in six hundredths. Polling every second found it at one point oh two seconds. Polling every quarter second, at about a quarter second. So polling's first token is basically just... the interval. And the total time stretches too, by up to one interval, because the client only finds out the job's done at the next poll. So everybody else finishes around two point six seconds, and the slow pollers come in at two point eight and three. That half-the-interval rule applies to every token, not just the first one. Requests: S S E and WebSocket, one each. Polling every second, four. Every quarter second, twelve. And polling every fifty milliseconds, forty-nine requests, with its first token at eight hundredths of a second, same as S S E.

B: So polling at fifty milliseconds is just as fast as S S E.

A: Same latency, yeah. Now look at bytes. Polling at fifty milliseconds moved about eight kilobytes up and eight kilobytes down. Sixteen kilobytes total. And the actual text in that reply is about three hundred bytes.

B: [surprised] Sixteen kilobytes to send three hundred bytes?

A: About fifty times the payload. And that's with HTTPX's minimal headers. A browser sends a user agent, accept headers and cookies on every request, often five hundred bytes to a couple of kilobytes each. So real polling is several times worse than that. Polling every quarter second was about two kilobytes each way, and polling every second, under a kilobyte each way, but remember that one was a full second late. S S E sent about a hundred forty bytes up, that's the one request, and about one point nine kilobytes down. The WebSocket, about two hundred ten bytes up and one kilobyte down. So S S E and WebSocket are within a factor of two of each other, and both tiny. Thirty-three bytes per token for S S E, against fifteen for a frame. And for real LLM APIs, even that doesn't matter, because the JSON in each OpenAI-style event is way bigger than the framing around it.

A: Then CPU. Per stream, with two hundred running at once. Polling at fifty milliseconds: four point seven milliseconds of server CPU per stream. Polling at a quarter second, two. S S E, one point seven. WebSocket, one point two. So CPU follows requests. Each poll pays for parsing a request, routing it, building a JSON response, writing headers. At fifty milliseconds that's forty-nine times per stream, and it burns almost three times the CPU of S S E for exactly the same tokens. Multiply by users. A thousand users polling every fifty milliseconds is about twenty thousand requests a second. That's a real server's whole budget, spent on "anything yet?"

B: And WebSocket was the cheapest.

A: In that run, yeah. But the S S E endpoint was also asking "has the client disconnected?" on every token, which isn't free. And honestly, treat differences under a millisecond as noise here, because the client and the server are sharing the same cores.

A: And Engine X. Default: first byte at two point five five seconds, total two point five six. Fixed: first byte at seven hundredths, total two point five six. Same total.

B: [quietly] Same total. It just hid all of it.

A: Yeah. Default buffering doesn't slow the stream down. It deletes it. Every token was on time inside Engine X. The client just couldn't see any of them until the end.

<!-- section: Measure: How does it scale? -->

B: Okay, so scale it up. Say I need ten thousand streams at once. What breaks first?

A: Polling at a quarter second is forty thousand requests a second, just to ask. At a millisecond or two of Python CPU each, that's dozens of cores doing nothing useful. S S E or WebSockets hold ten thousand open connections instead. And an open, idle connection costs a file descriptor, the number the operating system uses to name an open socket, plus kernel socket buffers, a few kilobytes each when it's quiet, more under load, plus, in an async server, a small task object. So very roughly, tens of kilobytes each. Ten thousand of those is a few hundred megabytes. Fine for one machine.

B: So memory isn't it.

A: Usually limits run out first. The open-file limit, which is often set to one thousand twenty-four by default, or even two hundred fifty-six. Engine X's worker connections setting. Load balancer idle timeouts. And if your server uses one thread per stream, the number of threads. The tokens themselves are a few hundred bytes a second per stream. All ten thousand together is about three megabytes a second, which is nothing. And of course the GPU is the real limit. Ten thousand streams means ten thousand sequences in the batch. The network side is the easy part.

<!-- section: Break It -->

A: Then you break it, four ways. First, the heartbeat. In the fixed Engine X location, set the read timeout to two seconds. That's a stand-in for sixty, so you don't sit there for a minute. And add an endpoint that sends one event, sleeps four seconds, and sends another. Through Engine X, curl gets the first event, and then at two seconds the connection's cut. Curl exits with error eighteen, "transfer closed with outstanding read data remaining". Engine X's error log says the upstream timed out while reading. And your app logs nothing wrong at all.

B: [realizing] Which is the seventy-second bug. No error from my code anywhere.

A: That's why it's so confusing in production. Now make the endpoint send a colon-ping comment every second while it waits. The full four-second response comes through, pings and all, and your parser just ignores them.

A: Second. Point your WebSocket client through the default Engine X location. It fails. Uvicorn answered with a four-oh-four, not found, because Engine X forwarded a plain GET. The upgrade and connection headers are what's called hop-by-hop headers. They only apply to one connection, between two machines that are right next to each other, so proxies drop them instead of forwarding them, unless you tell them not to. In Engine X that's three lines: use HTTP one point one to the app, and pass the upgrade and connection headers through. And every load balancer and CDN on the road needs the same care.

B: And S S E needed none of that.

A: None. Which is part of why LLM APIs chose it.

A: Third, a client that stops reading. Make an endpoint that yields one-kilobyte events as fast as it can, and counts them. Connect with a raw socket, send the request, and then just never read anything. Check the counter every second. In my run, it climbed to seven hundred thirty-nine and froze. About seven hundred forty kilobytes of events were sitting in uvicorn's buffer and the two kernels' socket buffers, and then the await on send just stopped returning. That's backpressure, working. Then break it on purpose: have the generator append to a list in a background task instead of yielding. Watch memory grow without limit, for a client that never reads a byte.

A: Fourth, polling that leaks. Start a polling job, and never poll it. The task runs to the end, and its tokens sit in the job store forever. There's no connection to close, so the server can't tell a slow poller from one that's gone. Real job APIs add a time to live. No poll in so many seconds, and the job gets cancelled and deleted. So you add one.

<!-- section: Connections and close -->

A: If you want to go further, the S S E part of the HTML spec is short, and its parsing section is exactly the parser you wrote. And Ilya Grigorik's High Performance Browser Networking, which is free online, compares exactly these options, with numbers. And this connects both ways. Ten thousand open streams are ten thousand waiters, which is the job async exists for. It explains the streaming half of the baseline harness: why you measure time to first token at the first event that actually has text in it, why events aren't tokens, why you parse lines, not chunks. And next, load balancing gets harder because of all this. A stream pins a user to one backend for minutes, and taking a server down for a deploy means waiting for its streams to finish. Plus with rate limits, an open stream is still holding a slot. One more reason to cancel the abandoned ones.

B: [working it out] Okay, let me try the whole thing. HTTP can't push. S S E and WebSockets are the two ways to let the server talk first. S S E keeps one HTTP response open and writes events into it, WebSockets switch the connection to a two-way protocol. LLMs use S S E because only the server talks after the prompt, and it's still plain HTTP. And the bugs are all the stuff in between, the proxy buffering, the idle timeouts, and the server not noticing I left.

A: [gently] Nearly. One thing. Neither of them lets the server talk first. Both start with the client sending a request. S S E is just an answer that doesn't finish. A WebSocket uses its first request to ask to change the rules, and after that it's a phone line, not HTTP. So S S E is a long answer, and a WebSocket's a phone line. And the bugs... they're not really "stuff in between". Every hop is a program with its own buffer and its own timer, and "the client left" has to be passed back hop by hop, all the way to the GPU. And if one hop doesn't pass it on, the GPU just keeps writing.
