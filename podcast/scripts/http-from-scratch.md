<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture an interview. It's going fine, and the interviewer asks, almost in passing, "Could you spin up an API yourself, in Python, without a framework?" And you've shipped, what, a dozen FastAPI services. You know the decorators, the Pydantic models, uvicorn with the reload flag. So what's the honest answer, in that moment?

B: [laughs] Honestly? "I'd pip install FastAPI."

A: [warmly] Right. And that's the answer most people would give. So let's go one layer down. A request arrives at your FastAPI service. By the time your function runs, it's got a nice dict with the JSON in it. What actually arrived? Like, physically, what came in over the network?

B: [a bit unsure] I mean... some kind of request object? The client sends JSON, and something on the server side turns it into a Python object. I've never really thought about what's in between.

A: So here's the whole secret, and honestly the rest of this is just the proof. HTTP is text. Sent over a TCP connection. That's it. A client connects, writes a few lines of plain text, and waits. The server reads that text, figures out what it means, and writes a few lines of text back. No object goes over the wire. Every framework, every API gateway, every requests dot get you've ever called, is just a machine for writing and reading that text.

B: Plain text. Like, I could type it.

A: [amused] You could literally type it. And you will. Which means yes, you can spin up an API with nothing but Python's socket module. And that's the real interview answer. Not "yes, I can", but "yes, and here's what the framework is doing for me that I'd otherwise have to do by hand."

B: Okay, but is that useful outside an interview?

A: All the time, actually. A request that just hangs. A proxy throwing a five oh two. A streaming LLM response that stops halfway through. CORS blocking a request that works perfectly fine in curl. Every one of those, the explanation is sitting right there in the text on the wire. Once you can read the text, those bugs stop being mysterious.

<!-- section: Origin -->

A: And the text is so simple because of where it came from. Nineteen eighty-nine, Tim Berners-Lee, a software engineer at CERN, proposes a way for physicists to link documents across different computers. By the end of nineteen ninety he's got the first web server and the first browser running, on a NeXT workstation. And the protocol between them was so small it barely had a name. That first version, which people later called HTTP zero point nine, had exactly one kind of request. A single line. The word GET, a space, the path of the document, and a line break. The server sent back the HTML of that document and closed the connection. And that's the entire protocol.

B: So no headers, no status codes, nothing?

A: [laughs] Nothing. No version number. No headers. No status codes. If the document didn't exist, there was no way to say "not found", except by sending back an HTML page that said "not found" in it. And no images, because there was no way to say "this thing I'm sending you is an image."

B: [amused] That's almost charming.

A: It is. And everything else got bolted on because the web outgrew that one line. HTTP one point zero, in nineteen ninety-six, added a version on the request line, status codes, and headers, so a response could say what it was. Like a content type header that says "this is a GIF image". HTTP one point one, in nineteen ninety-seven, and then revised in ninety-nine, and again in twenty fourteen and twenty twenty-two, made connections reusable, made the Host header required so one machine could serve lots of different websites, and added something called chunked encoding, for responses where you don't know the size up front. We'll get to all three of those. Then HTTP two in twenty fifteen and HTTP three in twenty twenty-two changed how the bytes get packaged. But not what a request means. Methods, status codes, headers, they're the same in all three.

B: So the thing I'd type by hand is one point one.

A: One point one. And it's still everywhere. Between your load balancer and your app. Between uvicorn and your laptop. In every curl dash v you've ever run.

<!-- section: The Idea: A conversation in a pipe -->

A: So, start with the thing underneath, the TCP connection. You've seen it in the networking lessons, but quickly: a TCP connection is a reliable, two-way stream of bytes between two programs, possibly on different machines. TCP guarantees the bytes arrive in order, with no gaps, or else the connection fails. And it has no idea what the bytes mean. It's a pipe. Whatever one end writes, the other end reads, in the same order.

B: [working it out] Okay, so if I send a request, the server gets my request. One send, one message on the other side.

A: [gently] That's the picture almost everyone has, and it's wrong in a way that matters a lot later. TCP doesn't know about messages. Or lines, or JSON. It's a stream. If you write ten bytes and then twenty bytes, the other side might read them as one thirty-byte chunk. Or as three chunks of ten. Whatever boundaries you had when you wrote them are just... gone.

B: Huh. So the reader has to figure out where things start and stop on its own.

A: Yep. Hold on to that one. A program gets at that pipe through a socket. A socket's the operating system's handle for one end of a network connection. To your program it looks like a file you can read bytes from and write bytes to. In Python, there are two calls you'll live in. Receive, spelled R E C V, which you give a number n, and it hands you up to n bytes that have arrived. And send all, which pushes your bytes into the pipe.

A: And HTTP is just an agreement about what to write into that pipe. The client writes a request, the server writes a response, and both are text with a strict shape. And the fact that it's text, readable by a human, typeable by hand if you want, that was a deliberate choice back in ninety-one. It's why you can debug most of the web with curl dash v and your eyes.

A: If you drew it, it'd be two boxes at the top. On the left, the client, curl or a browser. On the right, the server, your own little Python file. Under each one, a smaller box, the socket, just a file descriptor number. And running along the bottom, connecting the two, one long bar, the TCP connection, ordered bytes both ways, the kernel on each side handing them off to the network. Across the top, an arrow going right carrying a few lines of text, the request. And an arrow coming back carrying a few lines of text, the response. The program writes text into the socket. The kernel cuts it into packets, ships them, and the kernel on the other side hands the exact same bytes, in order, to the server. HTTP is only the agreement about what that text looks like.

<!-- section: The Idea: The shape of a request -->

A: So let's look at a real one. If you run a little program called N C, netcat, in listen mode on port eighty eighty, it just prints whatever arrives. And then you point curl at it, and do a POST to slash v one slash echo, with a tiny JSON body. Just a key q with the value "hello". Here's what shows up. First line: the word POST, a space, slash v one slash echo, a space, and HTTP slash one point one. Then a line that says Host, colon, and the address and port it was sent to. Then User-Agent, saying it's curl. Then Accept, star slash star, meaning "I'll take anything". Then Content-Type, application slash JSON. Then Content-Length, fourteen. Then an empty line. Then the body, the JSON itself.

B: Fourteen being the size of the JSON.

A: Fourteen bytes, yeah. Count it if you want. Brace, quote, q, quote, colon, space, quote, hello, quote, brace. Fourteen. And that's always four parts, always in this order. First, the request line. Three things, separated by single spaces. The method, which is the verb, what you want done. GET means give me, POST means here, process this. And then PUT, PATCH, DELETE, HEAD, OPTIONS. Then the target, which resource you mean. A path, optionally with a question mark and a query string after it. You'll also hear it called the request URI, or just the path. And then the protocol version.

A: Second, headers. Zero or more lines, each one a name, a colon, and a value. The names are case-insensitive, so content-length in lowercase and Content-Length with capitals are the same header. And they're metadata. Who's asking, what format the body's in, how big it is, what the client can accept back.

A: [serious] Third, a blank line. And this is the most important line in HTTP. It's the only thing that says "the headers are over." There's no other signal.

A: And fourth, the body. Optional. Just raw bytes, exactly as many as Content-Length says. GET requests usually don't have one.

B: When you say every line ends... ends with what? A newline?

A: Not quite, and this one bites people. Every line ends in two bytes. A carriage return, and then a line feed. Bytes thirteen and ten. People call that pair C R L F. It's a leftover from typewriters and teleprinters. Return the carriage to the left, then feed the paper up a line. HTTP, and email's protocol, SMTP, and a bunch of other old protocols, all end lines with both. Not just the newline you'd get in a Python string. So the blank line is really four bytes. The carriage return and line feed that end the last header, and then another carriage return and line feed on their own. That four-byte sequence is the very first thing your server goes looking for.

<!-- section: The Idea: Predict, where does the body end -->

A: So try this. Your server's read the request line and the headers, it's found those four bytes. Now it has to read the body. How does it know when the body's finished? There's no closing tag. And the connection stays open afterwards, so it can't wait for the other side to hang up.

B: [a bit unsure] It's JSON, so... it reads until the closing brace?

A: [thinking out loud] That's the guess almost everybody makes. But think about what else could be in the body. An image. A protobuf. Some JSON with a brace inside a string. HTTP has no idea what's in there. So, no. It counts. Content-Length fourteen says the body is exactly fourteen bytes. So the server reads exactly fourteen bytes after the blank line, and stops. There's no end marker in the body at all. It's all just bytes.

B: Okay, so what if the client lies about the number?

A: [amused] That's the fun part. Say it claims twenty and sends fourteen. The server sits there waiting for six more bytes that are never coming, until some timeout fires. Now say it claims ten and sends fourteen. The server takes ten bytes as the body, and the leftover four bytes, which are the end of hello, a quote, and a closing brace, get treated as the start of the next request on that connection. When that was tried on a hand-written server, the next request line came out as those four junk characters glued straight onto GET slash health. And the parser happily read that whole thing, junk plus GET, as the method name. And answered with a "method not allowed".

B: [laughs] So it confidently answered the wrong question.

A: Garbage in, confident garbage out. Getting this count wrong is the classic bug in hand-written HTTP. And when a proxy and a server disagree about it, that's a real class of security hole. Request smuggling. We'll come back to that one when we break things.

<!-- section: The Idea: The shape of a response -->

A: The response has the exact same four-part shape. Only the first line's different. HTTP slash one point one, two hundred, OK. Then headers. Content-Type, application slash JSON. Content-Length, twenty-four. Connection, keep-alive. Blank line. And then the body, which is just the echo. A key called echo, wrapping the original q hello.

A: That first line is called the status line. Version, a three-digit status code, and a reason phrase. And the status code is the part programs actually branch on. The reason phrase after it, OK, Not Found, whatever, is just for humans. It can literally be anything.

B: Wait, anything? I could send two hundred and then "Banana"?

A: [laughs] You could send two hundred Banana. Every client would treat it as a success, because nobody reads the words. They read the number.

A: There's a figure for this you can play with. It's the same JSON echo, both sides, laid out as bytes on the wire. The request on the left, the response on the right, with a little byte count above each one. And every line ends in a faint grey marker standing for the two line-ending bytes. Hover any line and a note tells you what it does. Hover the Host line and it explains that one IP address can serve thousands of domains, so one point one made Host mandatory. Hover the blank line and it says, this is the only thing that tells the reader where the headers stop. And underneath there's a toggle. Content-Length, or chunked. Flip it to chunked and the Content-Length line disappears from the response, a Transfer-Encoding chunked line shows up instead, and the body splits into pieces, each with a little number in front of it. The first piece is nine bytes. The second one is fifteen, which shows up as the letter f, because those numbers are in hexadecimal. Then a zero on its own, and a final blank line.

<!-- section: The Idea: Two ways to say the body ends here -->

A: Which is the second way to say "the body ends here". The first one you've seen. Content-Length. The server builds the whole body, measures it, writes the length, then the body. Simple, cheap, and it's what your server's going to do.

A: But sometimes the server doesn't know the length when it starts sending. An LLM generating tokens has no idea how many it's going to produce. A database query streaming a million rows doesn't want to hold all of them in memory just to count bytes.

B: Couldn't you just send everything and then close the connection? Closing means done.

A: That's exactly what HTTP one point zero did. Send the body, then hang up, and the hang-up means "that's all". And it works. But two problems. It throws away the connection, which, as we'll see, isn't free. And a connection that dropped halfway because something broke looks exactly the same as one that finished. You can't tell "done" from "died".

B: [skeptical] Huh. Yeah, that's bad for an LLM stream.

A: [serious] Really bad. So HTTP one point one added chunked transfer encoding. The response says Transfer-Encoding, chunked, instead of Content-Length, and then the body comes as pieces, each one with its own size in front. The size, written in hexadecimal, then a line ending, then that many bytes, then another line ending. And a piece of size zero means the body's over. So a real one, from uvicorn, looks like this, in words. A six, then six bytes, the word hello and a space. An eight, then the word chunked and a space. Another six, the word world and a newline. Then a zero. Then a blank line. Done.

B: Hexadecimal, though. Why? So a hundred-byte chunk is...

A: Is written as six four. Sixteen times six plus four. And a five hundred seventy-seven byte chunk gets written two four one. Two times two fifty-six, plus four times sixteen, plus one. It's just the convention. And here's the bit that matters: those pieces can arrive seconds apart. That's how a plain HTTP one point one server streams. When you streamed tokens from your fake LLM last time, the server-sent-events lines, the little "data colon" lines? This was underneath them on the wire. Each one riding inside a chunk.

A: And you see it from real servers too. If you type a request to example dot com by hand, which you will, the reply comes back chunked, with a first chunk size of two four one. Because Cloudflare, which serves example dot com these days, was streaming the page from its cache instead of announcing a length up front.

A: So the rule for your own server. Always send Content-Length, because you always know how big your JSON is. Never send both headers. And if a request comes in with a Transfer-Encoding header, reject it with a five oh one, "not implemented", unless you've actually written chunked decoding. Real servers have to accept chunked request bodies. Yours can honestly say "not implemented", with the right code.

<!-- section: The Idea: Status codes, by family -->

A: Which brings up status codes. You don't need to memorize all of them. You need the families, because the first digit tells you whose problem it is. And then maybe fifteen specific ones you'll see every week. Ones, the one hundreds, are informational. "Hold on." You'll mostly see one oh one, switching protocols, which is how a WebSocket upgrade happens, and occasionally one hundred continue. Two hundreds mean it worked. Two hundred OK, two oh one created, two oh four no content, which is success with an empty body. Three hundreds mean "look elsewhere". Three oh one and three oh eight are moved permanently, three oh two and three oh seven are moved for now, and three oh four is "not modified", meaning your cached copy is still good.

A: Then four hundreds, which mean you, the client, did something wrong. Four hundred, bad request. Four oh one, unauthorized. Four oh three, forbidden—

B: [jumping in] Which are kind of the same thing, right? You're not allowed in.

A: [patiently] People mix those up constantly. Four oh one is really "unauthenticated". It means "who are you?" You didn't send credentials, or they were bad. Four oh three means "I know exactly who you are, and no." Then four oh four, not found. Four oh five, method not allowed, like a POST to something that only does GET. Four thirteen, content too large. Four fifteen, unsupported media type. Four twenty-two, unprocessable content, the one FastAPI throws at you when validation fails. And four twenty-nine, too many requests, which is rate limiting. And then the five hundreds, which mean I, the server, failed. Five hundred, internal server error. Five oh two, bad gateway. Five oh three, service unavailable, overloaded, try later. Five oh four, gateway timeout.

B: Honestly, to me an error's kind of an error. Does the split between four and five really matter that much?

A: It matters more than any single code. A four-something says "retrying the exact same request won't help. Fix it." A five-something says "it might work next time." Your load generator, your retry logic, your alerts, they all branch on that first digit. So a server that returns five hundred for bad JSON is lying. It's blaming itself for the client's mistake. And it's paging someone at three in the morning for a typo in somebody's curl command.

B: [amused] Okay, that's a good reason.

A: And five oh two and five oh four are worth a second look, because you'll debug them. They don't come from your app. They come from a proxy. A proxy's a server that sits between the client and your app and forwards requests along. A load balancer, nginx, an API gateway, Cloudflare. And to your app, the proxy is the client. A five oh two usually means your app crashed, or closed the connection early, or sent back something that wasn't valid HTTP. A five oh four means your app was too slow for the proxy's timeout.

B: So I'd go look in my app logs and see—

A: [jumping in] Nothing. That's the trap. Neither one shows up in your app's logs. From your app's point of view, either nothing happened, or it was still happily working when the proxy gave up.

<!-- section: The Idea: Methods, safe and idempotent -->

A: Now, methods. The method isn't decoration. It's a promise about what the request will do, and two properties fall out of it. The first is "safe". A method's safe if it only reads. The client expects nothing to change on the server. GET, HEAD and OPTIONS are safe. And the whole world relies on that. Browsers prefetch links. Crawlers follow them. Caches replay them. So say you build a GET endpoint at slash delete-account, with the user ID in the query string. You paste that link into Slack, and a link-preview bot fetches it to make a nice little preview card...

B: [laughs] And deletes the account.

A: [dry] Deletes it for you. Very helpful bot. The second property is idempotent. It means doing it twice has the same effect on the server as doing it once. "Set x to five" is idempotent, run it ten times, x is five. "Add one to x" is not. And this matters because of the worst moment in networking. The connection drops before the response gets back. Did the request happen? You genuinely can't know. If it's idempotent, you don't care. Just send it again.

A: So here's how the common methods line up. GET, give me this. HEAD, same as GET but only the headers. OPTIONS, what can I do here, which CORS uses. Those three are safe and idempotent, and they don't normally carry a body. PUT means replace this resource with this body. Not safe, it changes things, but idempotent. Putting the same thing twice leaves you in the same place. DELETE, remove this. Also not safe, also idempotent, deleting twice is still deleted. POST means process this. Create something, run something, compute something. Not safe, and not idempotent. And PATCH, change part of this, isn't safe and isn't guaranteed to be idempotent.

B: [working it out] Wait. Every LLM API call is a POST.

A: Every one. You're asking it to compute something.

B: So if my client retries a POST after a dropped connection...

A: [serious] You might pay for the same completion twice. Which is why clients and proxies may automatically retry a GET after a dropped connection, but they shouldn't silently retry a POST. "Charge the card" might run twice. And the APIs that really care about this, Stripe's the famous example, accept a header called Idempotency-Key. The client makes up a random ID, once per logical operation, and sends it along. If a retry shows up with the same key, the server recognizes it and hands back the stored result, instead of doing the work again.

<!-- section: The Idea: Headers that matter -->

A: Headers. There are hundreds registered. Just a handful cause real bugs. Content-Type and Accept, first. Content-Type says what format this body is in. Application slash JSON, or text slash HTML with a character set, or multipart form data, which is what file uploads use. Accept says what the client would like back. They're the two halves of what's called content negotiation. The client lists what it can handle, the server picks one and says which. And the bug you'll hit: a client sends JSON but labels it as something else. Curl's dash d flag, for example, labels your data as a URL-encoded form by default, not JSON. A strict server rejects that with a four fifteen. FastAPI gives you a four twenty-two.

B: Oh, I've definitely hit that. I just added the header and moved on.

A: Now you know what was going on. Next, Authorization. That's how the client proves who it is. Usually the word Bearer and then an API key or a token. A four oh one means that's missing or bad. Two things to burn in. HTTP is plain text. So over plain http, without the S, anyone sitting on the path can just read that header. That's what TLS is for, and it gets its own lesson. And never, ever log it. That's a very real way keys leak.

A: Then Cache-Control. Instructions for anything that might store the response, the browser, a CDN, a proxy. No-store means never keep it, use that for anything personal. Max-age sixty means reuse it for sixty seconds without asking. Private means a browser can keep it, but a shared cache like a CDN can't. And then there's no-cache.

B: Which means don't cache it. I'd assume.

A: [amused] Which is what everyone assumes, and it doesn't. No-cache means "store it, but check with me before you reuse it." It's confusingly named. If you mean "don't keep this", that's no-store.

A: And that "check with me" is the next pair. ETag and If-None-Match. An ETag, short for entity tag, is a little fingerprint of the response's content, often a hash or a version number. The server sends, say, ETag v forty-two. The next time, the client sends If-None-Match, v forty-two. If nothing's changed, the server replies three oh four, not modified, with no body at all. A few hundred bytes instead of the whole resource. That three oh four you see all over your browser's network tab? That's this.

A: And then CORS, which is the one that wastes the most afternoons. Browsers follow a rule called the same-origin policy. An origin is the scheme, the host, and the port together, so http, localhost, port three thousand, is one origin. JavaScript loaded from one origin can't read responses from a different origin unless that server explicitly says it's allowed. So your frontend on localhost port three thousand calls your API on localhost port eight thousand. Different port, different origin. The browser adds an Origin header to the request saying where the page came from. And it refuses to let the page's JavaScript see the response, unless the response comes back with Access-Control-Allow-Origin naming that origin, or a star for anyone. And for anything beyond a plain form-style request, a JSON body, an Authorization header, a PUT or a DELETE, the browser first sends what's called a preflight. An automatic OPTIONS request asking "which origins, methods and headers do you allow?" Only if the answer allows it does the real request go out.

B: [skeptical] Okay, so CORS is how my API keeps random websites from calling it.

A: That's the picture that makes CORS bugs feel insane, and it's backwards. Two facts. One, CORS is enforced by the browser, not your server. That's why the exact same request works in curl and fails in the browser. Curl doesn't care. Two, CORS is not security for your server at all. Curl, scripts, other servers, they ignore it completely. What it protects is the user. It stops some malicious page they happen to visit from reading their data, using their cookies, out of a site they're logged into. It doesn't protect your API from anyone.

B: Huh. So it's protecting the person in the browser from the page, not me from the world.

A: Yeah. That's the whole thing. And the last header, Connection, gets a whole section of its own.

<!-- section: The Idea: Keep-alive -->

A: Because opening a TCP connection isn't free. Before the first byte of HTTP can go out, the two machines exchange three packets. They're called a SYN, a SYN-ACK, and an ACK, short for synchronize and acknowledge, and that's the TCP handshake. It costs one round trip before any data moves. On localhost that's tens of microseconds. Across a country, about twenty milliseconds. Across an ocean, about a hundred and fifty. And over HTTPS, the TLS handshake adds at least one more round trip on top, plus some real CPU for the key exchange.

B: Per connection.

A: Per connection. And HTTP one point zero opened a fresh one for every request, and closed it after the response. So a web page with thirty images paid for thirty handshakes. HTTP one point one flipped the default. A connection stays open after a response. That's called a persistent connection, or keep-alive. And the client can just send its next request down the same pipe. Either side says Connection colon close when it wants to end it.

A: Picture two timelines, one above the other, time running left to right. The top one is a new connection per request. A little box for the handshake, then a longer box for request one, then a small dashed box where it closes. Then handshake again, request two, close. Handshake, request three, close. The bottom one is a single connection kept alive. One handshake, then request one, two, three, back to back. And it finishes way earlier, and the gap between where they finish is two handshakes and two closes you just didn't pay for. That's also why a connection pool in your HTTP client matters so much. Reusing connections is most of the speedup.

A: And keep-alive changes your server in one important way. Without it, a connection carries exactly one request. Read it, answer it, hang up. With it, your server has to loop. Read a request, answer it, then go back and read the next one from the same socket. And keep doing that until the client closes, or says Connection close, or goes quiet for too long.

B: Okay, so each time around the loop I call receive, and I get the next request.

A: And there's that picture again. Remember, TCP's a stream. No message boundaries. So one receive call can hand you the end of one request and the start of the next one, in the same chunk of bytes. And a client's even allowed to send several requests back to back without waiting for any answers. That's called pipelining. Browsers rarely do it, but the spec allows it, so your server can't lose the extra bytes. Which means your parser can never assume "what I just read is exactly one request." It keeps a buffer of bytes it's read but hasn't used yet, and the next parse starts from there. Forget that, and the second request on a connection either vanishes, or turns into garbage.

B: Like the junk-glued-onto-GET thing.

A: Same family of bug. And you'll test exactly this.

<!-- section: The Idea: Predict, how much does keep-alive buy -->

A: So guess. On localhost, with a trivial health endpoint that does basically nothing. How much faster per request is keep-alive than opening a new connection every time? About the same, two or three times, or ten times or more?

B: [working it out] Three packets every time, plus setting things up... I'll say ten times.

A: [amused] Lower than that. On a Mac, one client looping over one kept-alive connection took about thirty to thirty-five microseconds per request, against the threaded hand-written server. Opening a fresh connection each time took about ninety. So roughly two and a half to three times, on localhost.

B: Only three? I thought the handshake was the expensive part.

A: On localhost the network round trip is almost free. It's all inside one machine. So most of that extra cost is the kernel setting up and tearing down the connection, plus, for the threaded server, starting a brand new thread. Now ask the second half. Would the gap be bigger or smaller between your laptop and the Spark, over Tailscale?

B: Bigger. Because now the round trip's real.

A: Much bigger. Say the round trip to the Spark is five milliseconds. A new connection adds at least five milliseconds to a request that might itself only take five. So that's roughly double, from round trips alone. Add HTTPS and the TLS handshake piles on another round trip and some CPU. And that's why every serious HTTP client keeps a pool of open connections. And why the rule last time was "create one HTTPX async client for the whole app", not one per request.

<!-- section: The Idea: The server you're going to write -->

A: So now you've got every piece. Here's the whole job of an HTTP one point one server, nothing hidden. Listen on a port and accept connections. Read bytes until you see that blank line, the four bytes. But refuse to buffer forever. Sixteen kilobytes of headers is plenty, and past that you answer four thirty-one, headers too large. Parse the request line into exactly three parts, and each header by splitting on its first colon. Read the body, exactly Content-Length bytes, and keep any extra bytes for the next request. Route on the method and the path. Respond with a status line, a Content-Type, a Content-Length, the blank line, and the body. And then loop or close. In one point one, unless someone said Connection close, you go back and read the next request from the same socket. And for every way the input can be wrong, you answer with the right four-something code and you close. Because once you've misparsed something, you can't trust where the next request starts.

B: And what about lots of clients at once? That loop sounds like one connection at a time.

A: It is, and that's a separate question you've actually answered twice already. That loop handles one connection at a time. So while it's waiting on one slow client, nobody else gets served. Nobody. And you fix it the two ways you know. First, a thread per connection. Each thread sits blocked on its own socket, and that's fine in Python despite the GIL, because a thread blocked waiting on the network lets go of the GIL while it waits. Then, asyncio. One thread, with an event loop that parks each connection while it's waiting for bytes and runs whichever one has data. And asyncio's start server hands you a reader object with two methods. Read until, which you give the four-byte blank line. And read exactly, which you give a number. And those two operations are basically all HTTP one point one parsing is made of.

<!-- section: The Idea: What a framework adds -->

A: So once your server works, look at what you actually wrote. About half of it is HTTP. Reading, parsing, framing, keep-alive, timeouts, error codes. The other half is your API. Routes, JSON, validation. And those two halves are separable. And the Python world separates them, on purpose.

A: Picture it as a stack of layers. At the bottom, the kernel. TCP connections, sockets, that line of not-yet-accepted connections called the listen backlog. Above that, the server, uvicorn. It accepts connections, reads bytes, parses HTTP using a parser library, either one called H eleven or one called H T T P tools. It handles keep-alive, timeouts, Content-Length and chunked framing. And bad requests get a four hundred before your code ever runs. Then there's a thin band across the middle, the interface, which is one async function call per request. Above that, the framework, FastAPI. Routing, path parameters, middleware for things like CORS and gzip and auth and logging, parsing the JSON, validating it with Pydantic, a four twenty-two if that fails, serializing whatever you return, exception handlers, the docs page. And at the very top, your code. One little async function that takes a dict and returns a dict.

A: That thin band is a calling convention. The older one's called W S G I, the Web Server Gateway Interface, from two thousand three. The server calls your app, a plain synchronous function, once per request. It passes in a dict with everything about the request, called environ, and a function called start response. Your app calls start response with the status and the headers, and then returns the body. It's simple. And it's why gunicorn can serve any Flask or Django app. But it's synchronous to the core. One request ties up one thread until it returns. And there's no clean way to hold a connection open for something like a WebSocket.

A: So the async version is A S G I. Asynchronous Server Gateway Interface. That's what uvicorn speaks, and Hypercorn, and Daphne. And Starlette and FastAPI are A S G I frameworks. An A S G I app is a single async function that takes three things. Scope, receive, and send. Scope is a dict describing the request, already parsed for you by the server. Its type is "http", and it's got the method, the path, the query string as raw bytes, and the headers as a list of pairs, all bytes, with the names already lowercased. Receive is an async function you await, and each time it hands you the next piece of the request body. A little dict with the body bytes and a flag called more body that says whether there's more coming. And send is how you reply. You call it once with a "response start" message carrying the status and the headers. And then one or more times with "response body" messages carrying bytes, again with that more body flag.

A: So notice what's been taken away from you. No sockets. No line endings. No counting Content-Length. No keep-alive loop. The server does all of that. And notice what the shape gives you back. Because you can call send as many times as you want with more body set to true, streaming's natural. And if you don't send a content-length header, uvicorn just switches to chunked encoding for you. That's actually how that chunked example from earlier, hello chunked world, got produced. The same interface also carries WebSockets, with a different scope type, and a startup and shutdown signal called lifespan. Which is what FastAPI's lifespan hooks ride on.

B: Okay, so let me get the stack right. FastAPI is the server, and uvicorn is like... the thing that runs it?

A: [gently] Other way round. And it's worth getting straight, because the command line hides it. Uvicorn is the server. It's the program. It owns the sockets and speaks HTTP. It calls FastAPI, which is just an A S G I app, built on a smaller framework called Starlette. And FastAPI calls your function. So "running FastAPI" really means "running uvicorn, which calls FastAPI". That's why the command is uvicorn main colon app. Uvicorn's the program. Main colon app is just which function to call.

B: [quietly] Huh. I've typed that a thousand times.

A: Everybody has. And because that contract's in the middle, you can swap either side on its own. Different server, uvicorn or Hypercorn. Different framework, Starlette, FastAPI, Django. So what does the framework actually add, concretely? Routing. Matching a path like slash users slash some ID and pulling the ID out. In your server that's an if statement. Parsing. Query strings, JSON, forms, file uploads, cookies. Validation. You declare that your payload's a certain Pydantic model, and you get a precise four twenty-two, instead of a key error three lines into your function. Serialization. Return a dict, get JSON out with the right Content-Type. Middleware, which is code that wraps every request. CORS, gzip, auth, request IDs, timing. And in A S G I terms a middleware's just an A S G I app wrapping another A S G I app. Error handling, so an exception becomes a five hundred instead of a dropped connection. And docs, generated from your type hints.

A: And none of that is HTTP. It's convenience, on top of HTTP. That's the answer to the interview question. And by the end of tonight you'll have written both halves yourself.

<!-- section: The Idea: HTTP two and HTTP three -->

A: Everything so far is HTTP one point one. And its text format has one structural weakness. On a single connection, responses come back one at a time, in order. So if request one is slow, request two waits behind it, even if request two's answer is totally ready. That's called head-of-line blocking. One slow thing at the front of the line holds up everything behind it. Browsers work around it by opening about six connections per site. Which means six handshakes, and six of TCP's cautious slow starts.

A: HTTP two, in twenty fifteen, grew out of a Google experiment called SPDY, pronounced speedy. And it keeps every method, every header, every status code. What it changes is the packaging. Three things. First, binary framing. Instead of text lines, everything's sent as frames. Small binary messages, each with a nine-byte header saying how long it is, what type it is, headers or data and so on, and which stream it belongs to. So parsing's faster, and there's no more "where does this line end" ambiguity. Second, multiplexing. Each request and its response is a numbered stream, and frames from lots of streams interleave on one TCP connection. Response two doesn't wait for response one. Their frames just take turns. One connection replaces six. And third, header compression, called H pack. Headers repeat on every request. Same User-Agent, same Accept, same cookies, same auth token. So both sides keep a table of headers they've already seen, and a repeat gets sent as a small index number instead of the full text. Plus there's a built-in table of sixty-one common headers, and a compact bit-level code for the rest, called Huffman coding, where common characters get shorter codes.

A: You can see it with curl, if you ask for HTTP two against example dot com. The first line comes back as HTTP slash two, two hundred, and all the header names come back lowercase, which HTTP two requires. Browsers only use HTTP two over TLS. And G R P C is built on top of it.

B: So HTTP two fixed head-of-line blocking.

A: [gently] It moved it down a layer. It didn't remove it. All those streams share one TCP connection, and TCP delivers bytes strictly in order. So if one packet gets lost, TCP holds back everything after it, every stream's frames, until that one lost packet gets resent. On a lossy mobile network, one big multiplexed connection can actually do worse than six separate ones.

B: [surprised] Worse. Because now one lost packet stalls everybody instead of one connection's worth.

A: Right. So HTTP three, in twenty twenty-two, fixes it by leaving TCP altogether. It runs over something called QUIC, pronounced quick. Built on UDP, originally at Google, standardized in twenty twenty-one. It gives you reliable, ordered streams, like TCP, but each stream is ordered independently. So a lost packet only stalls the stream it belongs to. QUIC also folds the TLS handshake into the connection handshake, so it's one round trip to get started instead of two or more. And it identifies a connection by an ID, not by the IP address and port. So a phone switching from Wi-Fi to cellular can keep its connection alive.

A: Picture three rows, three requests, A, B and C, in each. In the HTTP one point one row, A is a long box, and B and C sit after it, waiting. In the HTTP two row, little frames of A, B and C alternate along one line, and then there's an X, a lost packet, and every frame after it, B's and C's too, is dashed. All stalled until the X is resent. And in the HTTP three row, A, B and C each get their own lane. The X is in A's lane, so only A waits. B and C just keep going.

A: In practice: HTTP one point one between your services and inside data centers, because it's simple and the network's reliable. HTTP two for browsers and G R P C. HTTP three increasingly for browsers on phones. And a server advertises HTTP three with a header. Example dot com's response included one called alt-svc, saying H three on port four forty-three, max age eighty-six thousand four hundred. Meaning, "I also speak HTTP three, over UDP, on port four forty-three, and remember that for a day." You won't hand-write an HTTP two or three server tonight. The binary framing and the compression are a lot of careful code, and you'd use a library, there's one called h two. But everything about methods, status codes, and headers carries over unchanged.

<!-- section: Build It: Setup and speaking HTTP by hand -->

A: Okay. Now you build it. It's one long evening, and the server ends up about a hundred and fifty lines. Setup's quick. One folder, Python three point eleven or newer, a virtual environment with uvicorn, FastAPI and HTTPX, and those are only for the last two tasks. Plus three command-line tools. Netcat, which is N C. Curl. And A B, Apache Bench, which ships with macOS and is a package on Ubuntu. And copy over the load generator you built last time.

A: The first task, before you write any server, is to be the client. Netcat opens a TCP connection and wires your keyboard straight into it. On macOS you pass it the dash c flag, so that pressing Enter sends a carriage return and line feed instead of just a newline. You connect to example dot com on port eighty and... nothing happens.

B: [a bit unsure] Nothing at all?

A: Nothing. You're connected, and the server's waiting for you to talk. So you type GET, space, slash, space, HTTP slash one point one. Enter. Host, colon, example dot com. Enter. And then Enter again on an empty line. And the reply pours back. Find the status line, the headers, the blank line. Does it use Content-Length or chunked? It's chunked, and you find that first chunk size, two four one, and convert it from hex. And then notice the connection doesn't close. Type the same request again and a second response comes back down the same connection. That's keep-alive, done by hand.

A: Then try the history, one per connection. Ask with HTTP one point zero and leave off the Host header, and see what status you get. Then ask yourself why a server that hosts thousands of sites would refuse that. It has no idea which one you mean. Then the nineteen ninety-one request. Just GET space slash and Enter. What comes back, and is there even a status line? Then a typo in the version, like HTTP one point seven. And a header line with no colon in it.

A: Then flip it around and be the server. Run netcat in listen mode on port eighty eighty, and in another terminal, curl it. The request curl sends just appears in your netcat window. And now curl's sitting there waiting for a reply. So you type one. By hand. HTTP slash one point one, two hundred, OK. Content-Length, three. Blank line. Then "hi".

B: [working it out] Hi is two bytes, though. And then Enter adds the line ending. So that's four.

A: Four. So what does curl do if you claim three? Or ten? That's the experiment. And then point your browser at it, and read everything a browser sends that curl didn't. There's a lot. And for scripted tests later, there's a non-interactive version. You pipe a printed request into netcat with a short sleep after it, because macOS netcat hangs up the moment its input ends, before the reply arrives.

<!-- section: Build It: The smallest server, then the real one -->

A: Second task, the smallest server a browser will accept. Only import socket. Make a socket, set an option called reuse address so you can rebind the port right after a restart, bind it to localhost port eighty eighty, and listen with a backlog of a hundred twenty-eight. That's how many connections the kernel will queue up that you haven't accepted yet. Then a loop. Accept a connection. Keep receiving until the four-byte blank line shows up in your buffer. Ignore the request completely. Send back a hard-coded response, which you write out yourself, with a correct Content-Length. Close. Test it with curl dash v, then a browser. Then deliberately get the length wrong by one, in each direction, and watch what curl says about it.

A: Then the third task, where it becomes a real server. A few pieces. Two limits up top. Sixteen kilobytes for the request line plus headers, one megabyte for the body. An exception class called bad request that carries a status code and a message, so anywhere deep in the parser you can just raise it and the connection loop turns it into a response. A read request function that takes the connection plus whatever leftover bytes you already have, and gives you back one parsed request plus the new leftover. Or nothing, if the client closed cleanly before saying anything. A handle function, which is your actual API, returning a status, something JSON-able, and any extra headers. And a respond function that dumps the JSON, builds the status line, Content-Type, Content-Length, Connection, any extras, the blank line, the body. The headers get encoded as latin one, the body as UTF eight.

A: And the spec's a list of requests and the code each one gets. The happy paths first. GET slash health gives two hundred and a little status ok JSON. HEAD slash health gives two hundred with exactly the same headers, Content-Length included, but no body. POST slash v one slash echo with valid JSON gives two hundred and the echo. Then the wrong-method ones. A POST to health gives four oh five, with an Allow header saying GET and HEAD. A GET to echo gives four oh five with Allow, POST. Any other path is four oh four, and you ignore the query string when routing. Then bad bodies. Echo with invalid JSON is four hundred. Echo with a Content-Type that isn't JSON is four fifteen. Then the malformed stuff. A request line that isn't exactly three parts, four hundred, and close. A version that isn't one point zero or one point one, five oh five. A one point one request with no Host header, four hundred. A header line with no colon, four hundred. A Content-Length that isn't a non-negative whole number, four hundred. Then the size limits. A body bigger than your max is four thirteen, and you check the header before you read the body, not after. A head that runs past sixteen kilobytes without the blank line is four thirty-one. Any Transfer-Encoding header on a request, five oh one. And a client that hangs up halfway through a request gets nothing. You just close your side.

A: And a few hints, because these are where it goes wrong. Receive returns empty bytes when the other side's closed. And it can also return half a header, or a request and a half. Decode the head as latin one, because every byte maps to exactly one character, so it can never throw. And split lines on carriage-return line-feed, not just newline. Split each header on its first colon only, using partition, so a Host header with a port in it, which has a second colon, still works. Lowercase the name. Every error response should say Connection close, and you should actually close, because after a parse error you can't know where the next request starts. And set a ten-second timeout on the connection and treat a timeout as "close it", so a client that connects and says nothing can't hold your server forever. Then test every single row by piping exact bytes into netcat, broken ones included, and put those tests in a shell script so you can rerun them after every change.

<!-- section: Build It: Keep-alive and concurrency -->

A: Fourth task, keep the connection alive. Wrap read, handle, respond in a loop per connection, and decide keep-alive per request. For one point one, keep alive unless the request says Connection close. For one point zero, it's flipped. Close, unless the request explicitly asks for keep-alive. Send back the matching Connection header. And carry the leftover buffer from one read into the next. Two tests. Give curl two URLs on one command line and it'll reuse the connection, and its verbose output says "Re-using existing connection". And the pipelining test. Two requests in a single write. A GET for health, immediately followed by a POST to echo with an eight-byte JSON body and Connection close. You should get two complete responses back, and the second one should say Connection close. And it only passes if you kept those leftover bytes.

A: Fifth task, concurrency. And first you feel the problem. With your one-at-a-time server running, open netcat to it in one terminal and just... don't type anything. In another terminal, curl the health endpoint with a five-second max.

B: And it hangs.

A: It hangs. Your server's sitting inside receive on the silent netcat connection, and curl's connection is parked in the kernel's backlog. One idle client stopped the whole server. On a Mac, curl waited until netcat hung up, and then got its answer in five point four seconds, instead of one and a half milliseconds.

B: [amused] Thirty-six hundred times slower, because someone opened a connection and went to lunch.

A: Pretty much. The smallest fix is threads. In the accept loop, start a new thread per connection, marked as a daemon so it doesn't keep the process alive on exit. Everything else stays the same, because each thread has its own stack and blocks in its own receive. Rerun the idle-netcat test and curl answers instantly.

B: [skeptical] But the GIL. Only one thread runs Python at a time.

A: Right, and that's fine here, because a thread that's blocked in receive has let go of the GIL. It's asleep in the kernel, not running Python. So the other threads get to run. That's the same reason threads were great at page fetching in the threads lesson.

A: Then asyncio. A second file, reusing the same handle and respond functions, but with the connection layer rewritten on asyncio streams. Read until the blank line, which raises one error if the client hangs up partway, and a different one if no blank line shows up within the limit. Parse exactly as before. Read exactly Content-Length bytes. Wrap each read in a ten-second wait-for timeout. Write the response, then await drain, which waits until the bytes are actually handed off. Close the writer at the end, no matter what. And start the server on port eighty eighty-one, with the head limit and a backlog of a hundred twenty-eight. And the reading part gets much shorter, because the stream reader keeps the leftover buffer for you. That's exactly the bookkeeping you did by hand in the keep-alive task. Rerun all your tests against eighty eighty-one.

<!-- section: Build It: Hitting it, and the ASGI and FastAPI versions -->

A: Sixth, you hit it with everything. Curl dash v every route, and read both directions, the lines curl sent and the lines you sent back. Open health in a browser, with your server printing the request line of every request, and watch for an extra request the browser makes that you never asked for. Check the browser's network tab shows your status code and headers exactly as you sent them. Run your load generator, two thousand requests at fifty in flight, against both the threaded and the asyncio servers. Zero errors is the bar. And then have an agent review your parser against the spec list and against the HTTP one point one RFC, sections two through six. And ask it about one classic bug. What happens if a client sends Content-Length twice, with two different values?

B: Which one wins?

A: That's exactly the question you want it to make you answer. Two parsers picking different winners is the setup for smuggling.

A: Seventh, the A S G I app with no framework. Same two endpoints, as one bare async function, served by uvicorn. If the scope type isn't http, just return, because uvicorn also sends a lifespan scope at startup, and ignoring it is allowed. Read the body by awaiting receive in a loop, gluing the body pieces together until more body is false. Route on the method and path from the scope. The headers are already lowercase byte pairs. Then send the response start with status and headers, then the response body. Run it on port eighty eighty-two and rerun your test script against it. And compare. Which malformed requests did uvicorn reject before your code even ran? And which status codes did you still have to get right yourself? Then an experiment. Leave out the content-length header and send the body in two pieces, more body true on the first. Look at it with netcat. Uvicorn picked chunked encoding for you.

A: And eighth, the same endpoints in FastAPI. About ten lines. A GET for health returning status ok, a POST for echo that takes a dict and returns it wrapped. Run it on eighty eighty-three, run your script, and write down every difference from your server. FastAPI answers four twenty-two for both bad JSON and the wrong Content-Type, where yours said four hundred and four fifteen. The error body has its own format. Uvicorn adds date and server headers. The header names come back lowercase. And see what a DELETE to health gives you. Then open the slash docs page, and notice that nothing you wrote by hand gave you that.

A: You're done when a hand-typed request to example dot com comes back two hundred and you can point at the status line, the headers, the blank line and the first chunk size. When every row of that spec gives the right code on both your threaded and asyncio servers, from a script you can rerun. When curl says it's reusing the connection and the two-in-one-write test gives two responses. When an idle netcat no longer blocks anyone. When the load generator at fifty in flight shows zero errors against both. And when the bare A S G I app passes the same tests and you can list what FastAPI added.

<!-- section: Measure -->

A: Then you measure. Two questions. How much does reusing a connection buy you, and how much does each layer, server and framework, cost on an endpoint that does nothing? For the first, you write a tiny script, one client, no concurrency, raw sockets. Two thousand health requests down one kept-alive connection, timed. Then two thousand where each one gets a fresh connection, connect, send, read, close. Print microseconds per request. And keep it at two thousand, there's a reason, which we'll break later. For throughput you use A B, Apache Bench, which is written in C, so it isn't the bottleneck the way a Python client can be. Eight thousand requests at fifty concurrent, once with a new connection each time and once with its keep-alive flag. And you read three things. Requests per second, the percentile table, and a line that says how many requests were keep-alive. Each server on its own port.

A: [relaxed, thinking out loud] So here's roughly what comes out. Your threaded raw server: about thirty to thirty-five microseconds a request kept alive, about ninety with new connections. A B gets about seventeen thousand requests a second with new connections, about forty-one thousand with keep-alive, and all eight thousand requests reused a connection. Your asyncio server: about fifty-seven microseconds kept alive, about a hundred sixty fresh. In A B, about nine and a half thousand a second fresh, about seventy-eight thousand with keep-alive, again all eight thousand reused. The bare A S G I app under uvicorn: about a hundred microseconds kept alive, a hundred ninety fresh, about twelve thousand a second from A B. And FastAPI under uvicorn: about a hundred forty kept alive, two thirty fresh, about eight thousand a second. And for those last two, A B's keep-alive run shows no gain at all. Zero requests kept alive.

B: Zero? Out of eight thousand?

A: Zero. Hold that, it's the best part. But first, a big caveat on all those numbers. They're from a MacBook that was also running a lot of other heavy jobs, the load average got near ninety at one point, and A B's throughput swung by five to ten times between runs. So those are the best of several runs. The one-client script numbers are the more trustworthy ones, since there's no contention. Trust the ratios within one run, not the absolute numbers, and do several runs of your own on a quiet machine.

A: So, what to look for. One. Reuse is worth two to three times on localhost, for one client. Every server got faster per request on a kept-alive connection. And on localhost the round trip's nearly free, so that's mostly kernel bookkeeping. Over a real network, every new connection adds a round trip, and a TLS handshake, and the gap gets far bigger.

A: Two. Each layer costs tens of microseconds. For a health check, raw sockets beat uvicorn, and uvicorn plus FastAPI's routing, validation and serialization adds about another forty microseconds.

B: So FastAPI's actually kind of slow.

A: That sounds damning until you put it next to the real work. An LLM call takes about a million microseconds. One second. Forty microseconds against a million is noise. On a real endpoint, the framework doesn't matter. On a health check, or a tiny proxy that does almost nothing itself, it's most of the time. Know which one you've got.

A: Three, the surprise. Uvicorn shows zero keep-alive requests under A B's keep-alive flag. Here's why. A B speaks HTTP one point zero, and it asks for keep-alive with a Connection keep-alive header. Your server honors that, because you wrote the one point zero rule yourself. Uvicorn, with its default pure-Python parser, H eleven, doesn't support one point zero keep-alive. So it closes every connection. Which means its keep-alive number is really a new-connection number.

B: So uvicorn's broken?

A: [laughs] Not broken. It just doesn't do that one old thing. And you can check it yourself, curl with the HTTP one point zero flag and a Connection keep-alive header, against both servers. If you install uvicorn with the standard extras, which uses the H T T P tools parser instead, the behavior may differ, so check that too. But the general lesson's the important one. A benchmark tool's protocol choices can quietly change what you're measuring.

A: And four. Your Python load generator tops out first. Point it at health and you'll likely see a few hundred to maybe two thousand requests a second, no matter which server, because the client's doing more Python per request than the server is. HTTPX at fifty connections was actually slower than at one. So always check which side's CPU is pegged, in top, before believing a throughput number. For latency of a real endpoint, your load generator's the right tool. For "how fast can this server possibly go", use A B, or another C tool called W R K.

<!-- section: Break It -->

A: Then you break it, four ways. First, run out of ports. Take that two-thousand limit off the new-connection loop and make it twenty thousand. On a Mac it died after about sixteen thousand, with error number forty-nine, "can't assign requested address".

B: [surprised] Out of ports? On localhost?

A: Yep. Right after it dies, count the connections in a state called TIME WAIT. About sixteen thousand three hundred fifty. When a TCP connection closes, it hangs around in TIME WAIT for a while, twice the maximum segment lifetime, so stray late packets from the old connection can't be mistaken for a new connection on the same ports. On macOS that's thirty seconds, fifteen doubled. And each one of those is holding a local port. macOS gives outgoing connections the ports from forty-nine thousand one hundred fifty-two up to sixty-five thousand five hundred thirty-five. That's sixteen thousand three hundred eighty-four ports.

B: [working it out] So sixteen thousand ports, each one stuck for thirty seconds... that's like five hundred and fifty new connections a second, max.

A: About five fifty, yeah. Open new connections to one server faster than that and you run out. And keep-alive makes the whole thing go away, because you're not opening new connections. And you will see this one in production, when some service creates a new HTTP client for every request. In fact, push it to the scale question. Say your service gets five hundred requests a second from one upstream client that opens a new connection for each one. Every request pays a TCP handshake round trip, and over HTTPS a TLS handshake too, another round trip plus the key-exchange CPU. So latency goes up by one or two round trips, and both sides burn CPU just on setup. Then the ports. TIME WAIT holds a port on whichever side closed, for thirty to sixty seconds depending on the OS. With about sixteen thousand ports on macOS, or roughly twenty-eight thousand by default on Linux, the client runs out somewhere around five hundred new connections a second, sustained, and starts failing with that same "can't assign requested address". The fix is connection reuse. Keep-alive, with a pool on the client side. Five hundred requests a second might only need a few dozen connections in total. And HTTP two goes further, by multiplexing many requests at once on one connection.

A: Second, lie about the length. Send Content-Length twenty with a fourteen-byte body, and the request hangs until your ten-second timeout fires, then you close. Now send Content-Length ten with the same fourteen bytes, on a kept-alive connection, followed by a perfectly valid GET for health. The first request gets a four hundred, because its body, which is now just the first ten bytes, brace, quote, q, and so on up to "hel", isn't valid JSON. And the leftover four bytes glue onto the next request line, giving a request whose method is those junk characters followed by GET. And a hand-written server answered that with four oh five.

B: [skeptical] Which is wrong, though. It's not a real method.

A: Wrong in a really instructive way. Method names can only contain letters and a few symbols. The semantics RFC calls them tokens. And a quote mark and a closing brace aren't allowed in a token. So the fix is to validate the method and return four hundred. But now imagine it's not your toy server. It's a proxy and a server that disagree about where a request ends. Say one of them believes Content-Length, and the other believes Transfer-Encoding. An attacker can hide a second request inside the first one. The proxy sees one request and checks it. The app behind it sees two.

B: [quietly] And the second one never got checked.

A: [serious] Never got checked. That's request smuggling. It's an attack that exploits two HTTP parsers disagreeing about where one request ends, so a hidden request slips past the proxy. And it's why the HTTP one point one RFC says a request with both headers has to be treated with suspicion. And why your server rejects Transfer-Encoding outright.

A: Third, slow down a client. Start the asyncio server, then open two hundred connections that each send the request line, and then one header byte every few seconds. Never finishing. Does your server still answer curl? It should. But every one of those connections costs memory, and each one stays open as long as it keeps trickling, because your timeout's per read, not per request. Every byte resets the clock. That's an attack from two thousand nine, called Slowloris. Tie up a server by opening lots of connections and sending each request incredibly slowly, so the threads or connection slots stay busy forever. The fix is a deadline for the whole head, not just for each read. Then try it on the threaded server. Two hundred slow clients means two hundred parked threads. And then the question is, which server would survive twenty thousand of them?

B: [working it out] The async one. Twenty thousand parked threads is twenty thousand stacks. Twenty thousand idle connections on one loop is mostly just... entries in a table.

A: That's the reasoning. And it's the same reason from last time. Waiting's cheap on a loop, expensive per thread.

A: And fourth, return the wrong family. Make your echo endpoint return five hundred for invalid JSON instead of four hundred, and point your load generator's error counting at it. Then think about what your alerting would page on. Separately, make health return two hundred, but with a JSON body that says status error, when something's actually wrong. A load balancer's health check only reads the status code. So it'll happily keep sending traffic to a broken server.

B: Because the body said error, but the number said fine.

A: The status code is the API. The body's for humans.

<!-- section: Connections and close -->

A: And from here, a few threads lead off. TLS wraps all of this in encryption. The same bytes, just sent through TLS instead of straight into the socket. The next lesson takes chunked encoding and that A S G I send loop and streams LLM tokens three ways, polling, server-sent events and WebSockets. And load balancing and rate limits are all about proxies and codes like five oh two, five oh three and four twenty-nine, which you can now read byte by byte. If you read one thing after this, make it the HTTP one point one RFC, number ninety-one twelve, and its section six on message bodies, twice. Or Tim Berners-Lee's page describing the original nineteen ninety-one HTTP. The whole protocol fits on one page, which is kind of the point.

B: [relaxed, thinking out loud] Okay, let me try the interview answer. HTTP is just text over a TCP connection. So with only the socket module, you accept a connection, read until the blank line, split out the method, path, version and headers, and then read the body until... well, until the JSON ends. Route it, write back a status line, headers and a body. And uvicorn and FastAPI are basically the same thing doing that for you.

A: [warmly] Two fixes, and they're the two things that'd separate you in that interview. You don't read until the JSON ends. You read exactly Content-Length bytes, because the stream has no boundaries and the body could be anything. And you keep whatever's left over, because it's the start of the next request on a kept-alive connection. Then you loop on that same socket, answer anything malformed with the right four-something and close, and put it behind threads or asyncio so one slow client can't stall everyone. And uvicorn and FastAPI aren't the same thing. Uvicorn is the server, the half that owns the socket and speaks HTTP. FastAPI is the half that does routing, validation and JSON. A S G I is the one function call between them. So the answer is, "yes, here's how, and in real life I'd still use uvicorn for the HTTP half, because it's been hardened against every weird client and attack out there, and a framework for the rest. But I know exactly what both of them are doing."
