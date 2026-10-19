# Outline: streaming

Source: src/lessons/streaming.mdx. Curriculum: "Polling, SSE and WebSockets." How do servers push
data to clients, and why do LLM APIs stream with SSE?

## The one big idea

A streaming reply isn't a special protocol. It's an ordinary HTTP response that takes its time.
That's why LLM APIs chose it (it's still plain HTTP, goes through everything, debuggable with curl),
and also why it's fragile: every hop between the GPU and the screen treats it like a normal reply,
so it may hold the words back, hang up when it goes quiet, or never pass back that the user left.

## Opening scene

He puts nginx in front of his Spark server for one port, TLS and a nice hostname. Asks a question:
nothing, nothing, then the whole answer at once. Server logs say every token went out on time.
Next day: closes a tab mid-essay; the GPU keeps writing for nobody.

## Wrong mental model B voices

- "Streaming must be a special protocol; WebSockets are the proper way to stream."
- "nginx made it slow." (It didn't slow it; it deleted the streaming.)
- "If I close the tab, the server stops." (Only the next hop finds out.)

## Story beats

1. Nginx blob; the closed tab; an agent job that dies after a long quiet stretch. Same root cause.
2. HTTP only speaks when spoken to (a counter, not a phone), even though the pipe underneath is
   two-way. History: hacks to fake server push, named Comet; then SSE and WebSockets; when OpenAI
   started streaming it picked the older simpler one and everyone copied.
3. Polling: wait is set by the interval, and you trade delay for requests one for one. Long
   polling: one request per piece of news; fine for rare news, bad for tokens.
4. SSE: one reply that never says how long it is; little text events separated by blank lines;
   the browser reconnects and says where it left off.
5. WebSockets: start as HTTP, then the line stops being HTTP; two-way. Price: every proxy, log,
   limiter stops understanding it. For a one-way token stream it buys nothing (measured: SSE and
   WebSocket nearly identical).
6. Why LLM APIs chose SSE: still HTTP, auth header, same load balancer and logs, stateless, curl.
   Switch to WebSockets only when the client must interrupt mid-stream (voice).
7. The road: buffering (nginx default is a feature for normal replies; fix with a header).
   Idle timeouts (bytes between, not total length; heartbeat comment line, what Anthropic's ping is).
8. Disconnects: the close only tells the next hop; the hard half is getting "client left" to the
   GPU. My sync generator never found out; async one cancelled. Backpressure as a good thing.

## Numbers worth saying

- "about a minute" of quiet before common proxies hang up
- polling interval halves on average (said as "half the interval")

## Left to the written lesson

SSE field list, chunk hex framing, the WebSocket key hash and frame header, masking history, the
comparison table, all measurement numbers, nginx config lines, HTTP/2 and gRPC, the six-connection
browser limit, the build tasks and Break It details.
