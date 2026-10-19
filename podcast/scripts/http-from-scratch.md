<!-- section: The Question -->

A: [relaxed, thinking out loud] So picture an interview. It's going fine. And the interviewer asks, almost in passing, "Could you spin up an API yourself, in Python, without a framework?"

B: And you've shipped, what, a dozen FastAPI services by now.

A: A dozen. You know the decorators, the Pydantic models, the uvicorn command with reload on the end. And the honest answer, in that moment, is "I'd pip install FastAPI."

B: [laughs] Which is not the answer they want.

A: It's not. Because the real question underneath is, what is FastAPI actually doing when a request arrives? Like, what arrives?

B: I mean, a request. Some kind of request object. The server gets it, FastAPI turns it into a dict, and my function gets called with it.

A: That's the picture most people have, and it hides the whole thing. Nothing arrives as an object. What arrives is a few lines of plain text. Text you could type by hand. HTTP is text, sent through a connection. The client connects, writes a few lines, and waits. The server reads them, figures out what they mean, and writes a few lines back. That's it. Every framework, every API gateway, every requests dot get, is a machine for writing and reading that text.

B: So the answer to the interview is just, yes, I can do it with sockets.

A: Yes, and here's what the framework is doing for me that I'd otherwise do by hand. That's the answer that lands.

<!-- section: A pipe that doesn't know about messages -->

A: So start with the pipe. You remember a TCP connection. Whatever bytes one end writes, the other end reads, in the same order, no gaps. But here's the bit that matters. It has no idea what a message is. If I write a little bit and then a bit more, you might read it all in one go, or in three pieces. It's a stream. It's like water through a hose, not letters through a slot.

B: [working it out] So if two requests come down the same connection, nothing tells me where one stops and the next starts.

A: Nothing in the pipe. That's the job HTTP has to do. And honestly, once you see that, most of HTTP is just answers to one question. Where does this thing end?

<!-- section: One line, in nineteen ninety-one -->

A: [warm] And it started almost absurdly small. Tim Berners-Lee, at CERN, wants physicists to be able to link documents across different computers. He gets the first web server and the first browser running on one workstation. And the protocol between them barely has a name. The whole thing, in nineteen ninety-one, is one line. The word GET, a path, a line break. The server sends back the document and hangs up.

B: That's it? No status, nothing?

A: Nothing. No version number. No way to say "not found" except by sending a page that said so. No images, because there was no way to say "this is an image." And everything you know about HTTP now got bolted on because the web outgrew that one line. A version. Little number codes for how it went. Labelled lines of extra information. Reusing connections. All of it added later.

B: So it's text because it was always text.

A: It was a deliberate choice, and it's why you can still debug most of the web with curl and your eyes. When I opened a bare connection to example dot com and typed a request in by hand, it answered me. Same as it would answer a browser.

<!-- section: The blank line -->

A: So here's what a request actually looks like. A first line, which says the verb, what you want done, like GET or POST, then the path, then the version. Then a bunch of lines that are each a name, a colon, and a value. Those are headers. Who's asking, what format the body's in, how big it is. And then a blank line. And then, maybe, the body.

B: The blank line's just formatting, right?

A: The blank line is the most important line in HTTP. It's the only thing that says the headers are over. There's no closing tag. So the very first thing your server does is read from the pipe until it sees that empty line. That's where the headers end.

B: Okay. And then the body. How do you know where that ends?

A: That's the good one. Think about it, the connection stays open afterwards, there's no end marker inside the body, it could be JSON, an image, anything.

B: [thinking] Uh... so the client has to tell you up front how long it is.

A: That's it. There's a header called Content-Length. It says, the body is this many bytes. And the server reads exactly that many and stops. It counts.

B: And if the client lies?

A: [amused] So I tried that, on my own server. If the client says the body is longer than it really is, the server just sits there waiting for bytes that never come, until a timeout fires. If it says shorter, the server takes that many bytes as the body, and the leftover bit stays in the pipe. And then it gets glued onto the front of the next request on that connection.

B: Oh no.

A: So the next request's first line started with a scrap of JSON, and then the word GET. And my parser happily read that as a request with a method made of punctuation and the word GET. And it answered, confidently, "that method isn't allowed here."

B: [laughs] Garbage in, confident garbage out.

A: Right. And that bug is the classic one in hand-written HTTP. And it's not just a toy. Imagine a proxy in front of your app and the app itself disagree about where one request ends. Then someone can hide a second request inside the first one. The proxy checks one request, the app sees two. That's called request smuggling. It's a real class of security hole, and it all comes from two programs counting differently.

<!-- section: When you don't know the length yet -->

B: [skeptical] Wait, but then how does streaming work? When the model's sending me tokens, it can't know how long the answer will be before it starts.

A: Right, that's exactly the case. A model generating text has no idea how many tokens it's going to produce. And the old answer was, just send the body and then hang up, and hanging up means done. But that throws the connection away. And a connection that dropped by accident looks exactly the same as one that finished.

B: So you can't tell a complete answer from a broken one.

A: Can't tell. So the next version added a second way. You send the body in pieces, and each piece starts with its own size. Then the piece. Then the next size, the next piece. And when you're done, you send a piece of size zero. That's called chunked encoding. The pieces can arrive seconds apart, and the connection stays usable afterwards.

B: Huh. So when I streamed tokens from my fake model server before, that was underneath.

A: That was underneath. You saw the nice event lines, and under them, on the wire, it was little size-labelled pieces. When I typed a request to example dot com by hand, the reply came back in chunks too, because the cache in front of it was streaming it out instead of announcing a length.

<!-- section: Whose problem is it -->

A: There's one more piece of the reply worth knowing well. The first line of the response has a three-digit number that says how it went. And you don't need to memorize them. You need the first digit, because it tells you whose problem it is.

B: Two hundreds worked, four hundreds are me, five hundreds are them.

A: Yeah, and the thing that makes that split matter more than any single code is what it means for retrying. A four-something says, sending the same thing again won't help, fix your request. A five-something says, it might work next time. Your retry logic, your load generator, your alerts, they all branch on that first digit. So a server that returns a server error for bad JSON is lying. It's blaming itself for the client's typo, and paging someone at three in the morning.

B: And the gateway ones? I've stared at a lot of those.

A: Those are fun, because they don't come from your app. They come from whatever's sitting in front of it, the load balancer, nginx, Cloudflare. A bad gateway usually means your app crashed or hung up early or sent something that wasn't proper HTTP. A gateway timeout means your app was too slow for the proxy. And neither one shows up in your app's logs, because from your app's point of view, either nothing happened or it was still working.

<!-- section: Reusing the pipe -->

A: Okay, so, opening a connection isn't free. Before any HTTP happens, the two machines do a little greeting, and that costs a round trip. And with HTTPS, there's the encryption handshake on top. The very first version opened a fresh connection for every request. So a page with a pile of images paid a pile of greetings.

B: So you keep it open.

A: You keep it open. That's keep-alive, and it became the default. But it changes your server in one important way. Before, one connection meant one request. Read it, answer, hang up. Now you have to loop. Read a request, answer it, then go back and read the next one from the same pipe. And because the pipe doesn't know about messages, one read can hand you the end of this request and the start of the next one.

B: So you have to keep the leftovers.

A: You keep a little buffer of bytes you've read but haven't used yet, and the next request starts from there. Forget that, and the second request on a connection just vanishes, or turns into garbage. When I measured it on my laptop with one client, reusing the connection was a few times faster per request than opening a new one. And that's on localhost, where the round trip is basically free. Over a real network, every new connection costs a full round trip before anything happens, so the gap gets much bigger.

B: [jumping in] And the server can only talk to one connection at a time in that loop, right?

A: In the simplest version, yes, and that bit me in a really clear way. I opened a connection with netcat and just didn't type anything. Then I tried curl from another terminal. It hung. My server was sitting there waiting for the silent client, and everyone else was stuck in the queue behind it. One idle person froze the whole server.

B: Which is the thing we fixed before. A thread per connection, or one event loop juggling all the waits.

A: Same two fixes, and both work. And there's a nice little surprise in the event loop version. The reading code gets way shorter, because the asyncio reader keeps that leftover buffer for you. It has a "read until the blank line" and a "read exactly this many bytes". Which is basically HTTP in two function calls.

B: And if I don't reuse connections at all? Like, a client that opens a fresh one every time?

A: I did that on purpose, in a tight loop. After a while the laptop just refused, can't assign requested address. Every closed connection leaves a little record behind for a while, holding onto a port, and I ran out of ports. You'll see the same thing in production when a service creates a new HTTP client for every request. Keep-alive makes it disappear.

<!-- section: What the framework actually does -->

A: So once your hand-made server works, look at it. About half of it is HTTP. Reading, finding the blank line, counting the body, looping, timeouts, the right error codes. And the other half is your actual API. The routes, the JSON. And those halves come apart cleanly. The Python world separates them on purpose.

B: Uvicorn is one half.

A: Uvicorn is the server. It owns the socket. It does everything we just talked about. And then it hands each request to your app through a really narrow contract. Your app is just one async function. It gets a dictionary describing the request, already parsed, and two functions, one to receive the body and one to send the reply. That contract has a name, ASGI. And FastAPI is just an app on the other side of it.

B: [a bit surprised] So FastAPI isn't the server at all.

A: Not even a little. That's why the command is uvicorn, then your module and app. Uvicorn is the program. Your app is just which function to call. FastAPI adds routing, pulling the id out of a path, validation so you get a precise error instead of a crash three lines in, turning your return value into JSON, middleware, and those docs pages. Useful stuff. None of it is HTTP.

B: Is it expensive?

A: Each layer costs a little bit on a trivial health check. When I measured, raw sockets beat uvicorn, and FastAPI added a bit more on top. But next to a model call, it's noise. Where it matters is if your endpoint does almost nothing, like a tiny proxy. Then the framework is most of the time.

<!-- section: Same meaning, new packaging -->

B: And HTTP two and three, do I need to relearn all this?

A: The meaning stays the same. Same verbs, same codes, same headers. What changes is the packaging. The text version has one weakness. On a single connection, answers come back one at a time, in order. A slow one holds up everything behind it. So browsers open several connections per site to get around it. HTTP two switches to binary, and lets lots of requests take turns on one connection. But it all still rides on TCP, which delivers strictly in order, so one lost packet stalls everybody. HTTP three leaves TCP entirely so a loss only stalls its own request.

B: But everything I'd write in a handler is the same.

A: Everything you'd write in a handler is the same.

<!-- section: Ending -->

B: Okay. So, HTTP is just text going through a pipe that doesn't know where anything starts or stops. The request says what it wants on the first line, then labelled lines, then a blank line that means headers are done, and then a length that says exactly how much body to read. Or pieces with sizes if you don't know the length. And frameworks are just the thing doing that reading and writing for me.

A: That's it. The piece I'd sharpen is that "just the thing doing it for me" is actually two things. Uvicorn does the HTTP, the reading and counting and looping. FastAPI never touches the wire, it's the routing and validation on top. So when something breaks, ask which half it's in. A request that hangs or a gateway error is almost always about where something ended, down in the first half. A validation error is the second half. And the answer is sitting in the text, if you look at the bytes.
