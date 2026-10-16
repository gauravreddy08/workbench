# Outline: streaming

Source: src/lessons/streaming.mdx. Curriculum entry: "Polling, SSE and WebSockets." Question: how do
servers push data to clients, and why do LLM APIs stream with SSE? Why: token streaming,
time-to-first-token and dropped connections all depend on this choice.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

Diagnostic gaps touched: numbers (bytes, requests per second, timeouts, connection costs) and the
sync/async model (cancellation goes through the event loop; "the server just knows" is the wrong
model). B voices: "the server knows when I close the tab", "WebSockets are the modern one, so
better", "nginx made it slower", "TCP keepalive handles idle", "a chunk is a token", "finally always
runs".

## Today / prerequisites

- T1 Prereqs: waiting-vs-working (async, event loop), baseline-vs-fireworks (parsed SSE with a helper, server_naive with a GPU lock), HTTP from scratch (bits of HTTP explained here). -> Not as a list. A re-explains the event loop, await and the cancellation error when they come up; the baseline server and its sse_events helper are re-introduced in one line each where needed.

## The Problem

- P1 Spark server from baseline streams with curl -N; first word in about a third of a second; TTFT defined (time from request to first piece of answer; decides whether a chat UI feels fast). -> A opens on the scene, defines TTFT inline.
- P2 Put nginx in front on home server (one port, TLS, nice hostname over Tailscale); nothing for eight seconds, then whole answer at once; server logs say every token sent on time. -> A continues the scene.
- P3 Bug two: ask for a two-thousand-token essay, close the tab after the first line; nvidia-smi shows GPU at full tilt another minute and a half; essay for nobody; ten people = ten people's GPU burning. -> A; B voices "doesn't the server notice I left?"
- P4 Bug three: agent job streams progress, sometimes thinks seventy seconds between updates; connection dies; truncated response; no error in your code. -> A, briefly.
- P5 All three from one place: HTTP built for ask-answer-done; streaming bends it; need to see how, and where on the road between GPU and browser something bends it back. -> A, as signpost.

## Origin

- O1 Early HTTP: one request, one response, close; server never speaks first; fine for documents, bad for chat, tickers, notifications. -> A, story.
- O2 Early 2000s: faked push by asking again and again, or by holding a request unanswered until news. -> A.
- O3 Alex Russell named it "Comet" in 2006, a pun on Ajax (both cleaning products). -> A, B reacts.
- O4 Ian Hickson wrote SSE into WHATWG HTML work mid-2000s: one open response, small text events, reconnection built in. Opera shipped early version 2006. -> A.
- O5 WebSockets, also started by Hickson, finished at IETF as RFC 6455 in 2011: start as HTTP, swap to a two-way protocol. -> A ("R F C sixty-four fifty-five").
- O6 About a decade later OpenAI's streaming picked the older, simpler one; almost everyone copied it. -> A, hook.

## The Idea: HTTP only speaks when spoken to

- I1 HTTP defined: client sends request (method, path, header lines); server sends response (status code, header lines, body). Counter analogy: between orders they can't call your name, don't know you're there. -> A, plain words, analogy for one point only.
- I2 TCP connection under it: reliable two-way pipe of bytes set up with a handshake; the pipe itself is two-way, either side can write any time; HTTP's rules make server wait. -> A; B voices surprise "so the pipe could already do it".
- I3 Keep-alive: HTTP/1.1 reuses one TCP connection for several requests in a row, default; still one request at a time, one response each. -> A.
- I4 The server-push problem stated; four ways around it, differ in how hard they bend the rules. -> A, signpost.
- F1 Figure 001: four side-by-side diagrams, client and server lines, time runs down, same six tokens. Short poll: five requests, first gets nothing, then one, three, one, one token. Long poll: six requests, held. SSE: one request, one response many chunks. WebSocket: one connection, upgrade, frames both ways, client says stop, cancelled. -> A describes as picture over the phone, after the four are explained or as a preview; best used as the "all four" summary.

## Short polling

- S1 Definition: ask "anything new?" on a timer with an ordinary request; server answers immediately, often nothing. -> A.
- S2 Pros: easy, cacheable, works through anything, survives restarts on either side because each request is independent. -> A.
- S3 Latency cost: token ready just after a poll waits almost a whole interval; just before, almost nothing; evenly spread so average is half the interval. Poll every second: average half a second late, first token up to a full second late. -> A, worked example, no symbols.
- S4 Request cost: each poll is a full HTTP request (headers both ways, routing, logging, auth, maybe a DB read) whether or not anything changed. Requests per second = users divided by interval; a thousand users every quarter second = four thousand requests per second of "nope, not yet". -> A, in words.
- PR1 Predict: poll every 500 ms, three-second reply, tokens every 50 ms. Answer: about six polls plus the start, seven or so; each token waits about 250 ms on average. At 50 ms: about sixty polls, average extra wait about 25 ms. Traded latency for requests one for one; ten times less delay costs ten times more requests; no setting gets both; why the other three exist. -> A asks, B guesses (counts six, forgets the start request), A reveals.

## Long polling

- L1 Definition: server holds each request open until it has news or a timeout (say thirty seconds, answers "nothing"); client asks again the moment an answer lands. -> A.
- L2 Latency about one network trip instead of half an interval; requests about one per batch of news; great for notifications once a minute; powered a generation of web chat; still powers Telegram's bot API (getUpdates with a timeout). -> A.
- L3 Bad fit for tokens: tokens every twenty to fifty ms; each ends a request; client needs a round trip to re-ask while tokens pile up; full headers per token or two; one response per item; what you want is one response that never ends. -> A; B gets there first ("so you want a response that just... doesn't end").

## SSE

- E1 Normally Content-Length header then exactly that many bytes. Chunked transfer encoding (HTTP/1.1): body in pieces, each prefixed with its size in hexadecimal on its own line; zero-size piece means the end; until then client keeps reading. -> A, defines hexadecimal lengths lightly.
- E2 A streaming response isn't a special protocol; it's an ordinary HTTP response that takes its time. SSE adds two things: content type text/event-stream and a tiny line-based text format. -> A, key line.
- F2 Figure 002, real bytes off the socket: status line and headers once (content type event stream, cache control no-cache, transfer encoding chunked), blank line, no length. Then each event one chunk: hex length (1b = 27 bytes), "id: 0", "data:" JSON with "the ", blank line, CRLF end of chunk. Next chunk 1d, id 1, "quick ", 50 ms later, same connection. Ends with zero-size chunk. -> A describes as "if you looked at the raw bytes", not reading.
- E3 Two layers: chunk framing belongs to HTTP/1.1, client library strips it; event format (id, data, blank line) is SSE and what your code parses. A chunk usually holds one event but nothing guarantees it: a proxy can merge three into one chunk or split one across two. Parse the stream of lines, not chunks. -> B voices "so a chunk is a token" wrong model; A corrects.
- E4 Event format: each line "field: value", one space after the colon optional and stripped. -> A.
- E5 data: is payload; several data lines joined with newlines for multi-line text. -> A.
- E6 event: gives a name like content_block_delta; default name is "message". -> A.
- E7 id: labels the event; client remembers the last one. -> A.
- E8 retry: milliseconds to wait before reconnecting. -> A.
- E9 Line starting with a colon is a comment, ignored; "most important line in production" teaser. -> A, B skeptical.
- E10 Blank line ends the event; until then client keeps collecting fields, then delivers and starts fresh. -> A.
- E11 EventSource: browser's built-in SSE client: give it a URL, it opens, parses, calls your handler, reconnects. On drop, waits (retry value or browser default of a few seconds), reconnects, sends Last-Event-ID header; server keeping recent events resumes exactly. Polling gets that free; SSE with one header. -> A.
- E12 Limits: one-way after the request; text only (UTF-8); EventSource only GET, no custom headers, no body, so LLM SDKs don't use it: they POST JSON with an auth header and parse SSE lines themselves, like the baseline sse_events helper. -> A; B connects to baseline.

## WebSockets

- W1 Defined: starts as HTTP request, then takes over the TCP connection for a two-way stream of small messages, frames, either side any time. Starts as GET with Connection: Upgrade and Upgrade: websocket ("I'd like to stop speaking HTTP"), plus version 13 and a key. -> A, no headers read verbatim beyond the meaning.
- W2 Server agrees with 101 Switching Protocols; from the next byte not HTTP; no requests, no responses, just frames both directions. Frames: small header 2 to 14 bytes saying kind and length, then payload. Full-duplex: both send at once independently, phone call vs walkie-talkie. -> A.
- W3 Sec-WebSocket-Key dance: proves server understands WebSockets, not an old server echoing headers. Server appends a fixed string from the RFC, SHA-1 hash, base64, sends back as Sec-WebSocket-Accept. For the RFC example key there's a known answer; checked with three lines of Python and got exactly that from uvicorn. -> A, no strings read; "a fixed made-up string printed in the RFC".
- F3 Figure 003: left, the only HTTP a WebSocket speaks (GET + upgrade, 101, then "no more HTTP", frames either way). Right: frame header bits: FIN, three reserved, four-bit opcode, mask bit, seven-bit length; extended length 2 bytes if 126, 8 if 127; masking key 4 bytes client to server only; payload. Opcodes 1 text, 2 binary, 8 close, 9 ping, A pong. Server-to-client 13-byte token = 81 0d + 13 bytes = 15 bytes; same token as SSE event 33 bytes. Short text frame from server: 2 bytes header; client adds 4-byte mask. -> A describes as two bytes of header, said in words.
- W4 Length: seven bits holds up to 125; 126 and 127 mean real length in next 2 or 8 bytes; small message costs 2 bytes of framing vs SSE's data prefix, two newlines, chunk wrapper. -> A.
- W5 Opcodes: text, binary, control frames close (with reason code), ping/pong for liveness; heartbeats built in. -> A.
- W6 Masking: every browser frame XORed with random 4-byte key in the header; not encryption (key is right there); 2011 attack: malicious page makes browser send bytes that look like a separate HTTP request to a naive proxy, poisoning its cache (cache = stored copies of earlier responses handed out instead of asking the server; poisoning = attacker's response stored under a real URL). Random masking: page can't control wire bytes. Servers must reject unmasked client frames. Server frames unmasked since attacker can't control the server. -> A; B "so it's encryption?" wrong model; A corrects. XOR said as "scrambled by flipping bits with a random four-byte key".
- W7 Price: after upgrade not HTTP; proxy, load balancer, logs, rate limiter understand HTTP requests; a WebSocket is one "request" lasting an hour carrying a protocol they can't see into; every hop must be told to pass it through; resume, errors, message format are yours to invent. -> A; B voices "WebSockets are the modern, better one" before this.

## All four on one timeline

- F4 Figure 004 interactive: top lane the model making tokens, 300 ms prefill (prefill defined: model reads whole prompt in one pass before first token; sets TTFT) then one token per gap; lanes below show when polling, SSE, WebSocket clients first see each token, dashed line = wait. Drag poll interval: average wait tracks half the interval, request count climbs as you shorten it. Switch to long polling: wait drops to a round trip, a request per token. Turn on proxy buffering: SSE still one request, every token arrives at end. Byte counts rough, scaled from localhost measurements. -> A describes what you'd see as you drag.
- F4b Three takeaways: polling's wait set by interval not network; long polling is SSE with a full HTTP request bolted to every token; SSE and WebSockets look identical for a one-way stream, WebSocket's extra power buys nothing visible. -> A.

## Which one, when

- C1 Who can send: short/long poll client asks; SSE server after one request; WebSocket both any time. -> A, spoken comparison, not a table read.
- C2 Added latency: short poll about half interval; long poll about one round trip; SSE and WS about zero. -> A.
- C3 Requests per update: short poll many even with no news; long poll about one; SSE and WS zero (one per stream/connection). -> A.
- C4 Plain HTTP all the way: polls and SSE yes; WebSocket only first request. -> A.
- C5 Resume after drop: polls free; SSE Last-Event-ID; WebSocket build it yourself. -> A.
- C6 Binary: polls and WS yes; SSE no (text). -> A.
- C7 Good for: short poll dashboards refreshing every 30 s, job status; long poll rare notifications; SSE token streams, logs, progress; WebSocket chat with typing indicators, games, collaborative editing, voice. -> A.
- C8 Rule of thumb: rare updates and lateness fine -> poll (most robust); server talks, client listens -> SSE; WebSocket only when client keeps talking during the stream, lots, soon. -> A, B restates.

## Why LLM APIs chose SSE

- A1 Shape: client sends one big message (prompt, settings, auth key), then only server talks, seconds to minutes. -> A.
- A2 Still HTTP: Authorization header, same load balancers, logs, rate limiter; stream true and stream false are the same endpoint with a different body. -> A.
- A3 Stateless servers: each stream belongs to one request; no long-lived session to track, migrate, clean up on restart. -> A.
- A4 Goes through everything: corporate proxies, CDNs, firewalls that break WebSockets let a long HTTP response through, as long as they don't buffer. -> A.
- A5 Debug with curl: curl -N and your eyes are a complete SSE client. -> A.
- A6 Formats: OpenAI-style unnamed events ending with the literal line data: [DONE] (met in baseline); Anthropic names every event (message_start, content_block_delta, message_stop) and sends ping events; what ping is for comes up. -> A.
- A7 When client must talk mid-stream (speech-to-speech, interrupting the model), providers switch: OpenAI's Realtime API uses WebSockets (and WebRTC). -> A, B "that's the table".

## The road between GPU and screen

- F5 Figure 005: chain browser (parser) - CDN/LB (optional) - nginx (reverse proxy) - uvicorn (your app) - generator + GPU. Tokens flow left; "client left" has to travel back right. Browser parses by line not chunk; CDN/LB idle timeout often 60 to 100 s, may compress; nginx buffers by default, read timeout 60 s; uvicorn sees disconnect as EOF or failed write; generator must be told to stop or finishes anyway. Fixes: heartbeat comments, X-Accel-Buffering no, proxy_buffering off, no gzip on streams, cancel generation when client goes. A stream is only as streaming as its worst hop. -> A, phone-diagram, then walks each problem.
- R1 Reverse proxy defined: sits in front of app server, accepts client connections, forwards; handles TLS, routing, compression, slow clients; nginx classic. -> A.
- R2 Buffering is a feature normally: app writes a 2 MB JSON into nginx at local speed and moves on; nginx spoon-feeds a phone on a bad connection; app not held hostage. For a stream, collect-then-send = nothing until the end = the eight-second blob. -> A; B voices "so nginx slowed it down"; A: it didn't slow it, it held it.
- R3 Fixes: proxy_buffering off in that location, or app sends header X-Accel-Buffering: no (nginx reads as don't buffer this one, strips before forwarding). Also gzip waiting to fill a compression block breaks streams the same way. -> A, names spoken plainly.
- R4 Idle timeouts: every open connection costs memory, so each hop kills ones quiet for too long. nginx proxy_read_timeout default 60 s of nothing from upstream; AWS Application Load Balancer 60 s idle default; Cloudflare about 100 s to origin; check docs, they change. Seventy-second think gets cut mid-response. 60 s is between bytes, not whole response: ten-minute stream fine if something flows. -> A; ties back to bug three.
- R5 Heartbeat: small meaningless message on a timer to keep every hop's idle timer from firing; every 15 s or so of silence send an SSE comment line "colon ping" and a blank line; proxies see bytes, parsers ignore it. That's Anthropic's ping events; recent FastAPI EventSourceResponse sends ping every 15 s on its own. -> A, payoff of the comment teaser.
- R6 TCP keepalive exists but Linux defaults to two hours before first probe, far too slow. -> B voices "doesn't TCP keepalive do this?"; A answers.
- R7 Disconnects: closing the tab, browser's OS closes TCP connection with a FIN (the packet meaning "I'm done sending"). Only tells the next hop. nginx sees client leave, by default closes its connection to uvicorn. Uvicorn always reading the socket, sees end-of-file, tells app "client disconnected". -> A, hop by hop; B's wrong model "the server just knows".
- R8 Network just vanishes (lid closes, Wi-Fi drops): no packet; server learns only when a write fails, many minutes of TCP retransmissions, or a heartbeat unanswered. -> A.
- R9 Server finding out is half; GPU finding out is the other half; app must turn "client left" into "stop generating"; easy to get wrong. -> A.
- R10 Why it matters for LLMs: abandoned two-thousand-token reply read for 100 tokens = 95% wasted GPU; on a batching server it also holds a batch slot and KV-cache memory another user waits for (brief re-explain of both). vLLM aborts a request when its HTTP connection closes; yours should too. -> A, numbers.
- R11 Backpressure: client still there, just slow (phone on a train); server produces faster than client reads; bytes pile in kernel send buffer, then client receive buffer, until TCP flow control (receiver advertises buffer space left, the window; at zero, sender kernel stops and writes wait) says full. In async server await send doesn't return, generator paused at yield, nothing grows. That pause is backpressure: slow consumer making fast producer wait so data can't pile up without limit. Good thing. Danger: code that breaks the chain, background task appending every token to an unbounded list. Token streams tiny, a few hundred bytes a second, rarely bites; logs, video, big tool outputs, it does. -> A, with re-explaining await.

## HTTP/2 and gRPC

- H1 HTTP/1.1: one TCP connection carries one response at a time; browsers allow only about six connections per site over HTTP/1.1; every open SSE stream holds one; seventh chat tab hangs. -> A, B's "seven tabs" moment.
- H2 HTTP/2 defined: same meaning (methods, headers, status), binary framing, many requests and responses interleaved on one TCP connection as numbered streams. Chunked encoding forbidden in HTTP/2 because each response is already a sequence of DATA frames that can end whenever. SSE over HTTP/2 is a stream that stays open sharing a connection with a hundred others; SSE code doesn't change, framing below does. -> A.
- H3 gRPC defined: Google's RPC framework, functions and message types in a proto file, generates clients and servers sending compact binary protobuf over HTTP/2. Server-streaming (LLM shape), client-streaming, bidirectional, all as one HTTP/2 stream. Common between services in a company; many inference servers offer gRPC alongside HTTP. Needs HTTP/2 end to end, doesn't run directly in browsers, so public edge stays SSE. -> A.

## Build It

- B0 Setup (ok): folder, venv, FastAPI, uvicorn, httpx, websockets, nginx. Fake model: async generator yielding a word every 50 ms, 50 tokens, counts every token it makes (so you can tell whether generation really stopped); stats and CPU endpoints (CPU seconds used by the process). -> One or two sentences.
- B0b Byte-counting TCP relay in front of server: forwards both ways, counts; connecting to the next port prints totals and resets. -> A, one sentence on why (bytes without Wireshark).
- B1 Polling task: generation must live somewhere between polls, so the starting request can't be the one that streams it; job store; start endpoint creates a job id and background task appending tokens, sets done; poll endpoint returns tokens after a "since" index, next index, done. Client: start, poll every interval until done, returns TTFT (first non-empty response), total, requests including start, tokens. Hints: keep a reference to the background task so it isn't garbage collected; one httpx client so polls reuse one keep-alive connection (else measuring TCP setup). Optional long polling with an asyncio Event set on every token. -> A, "here's what you'd build; the part that matters".
- B2 SSE task: StreamingResponse yielding one event per token (id line, data line with JSON like t: "fox ", blank line), ending with data [DONE]; Cache-Control no-cache. Check with curl -N -i; events 50 ms apart; --raw shows the chunk sizes. -> A.
- B3 Spec parser: baseline helper handles one data line per event; write one that follows the spec, since an API will someday send multi-line or named events and the simple one silently drops things. Rules: blank line dispatches if data collected; colon line is comment; split at first colon, strip one leading space; data lines appended and joined with newline; event sets name, default message; id persists across events; unknown fields ignored. Test on a hand-written string with a comment, a two-line data, and an event line. Client streams with httpx line by line, stops at DONE. -> A, rules in words.
- B4 EventSource reconnect: ten-line HTML page, new EventSource, appends data; endpoint prints the last-event-id header; kill uvicorn mid-stream, restart; browser reconnects a few seconds later and server prints last id. Spec browser reconnects even after DONE when server closes, so real apps close the EventSource on their end marker. -> A; B "it reconnects after DONE?" moment.
- B5 WebSocket task: accept, wait for one text message (the prompt), send each token as JSON text, then DONE, close. Client: connect with compression off, send "go", iterate until DONE. Compression off matters for fair byte count; websockets library negotiates per-message compression by default. -> A.
- B6 Handshake by hand with curl; compare the accept value with what Python computes (base64 of SHA-1 of key plus magic string). -> A, one sentence.
- B7 Harness (review): runs each client once through the counting proxy, prints method, TTFT, total, requests, bytes up, bytes down; polling at 50 ms, 250 ms, 1 s. CPU script: read CPU, run 200 concurrent streams of one kind, read again, divide by 200; server with warning log level so access logs don't dominate; agent reviews for warm-up, client and server fighting over cores, counting the start request. -> A.
- B8 nginx task (explain): run nginx from your folder with its own config, two locations: default and fixed with proxy_buffering off. Script streams with httpx raw reads, prints first-byte time, number of reads, total; run direct, default, fixed. Second fix: buffering on but app sends X-Accel-Buffering no, through default. Write the config yourself. -> A.
- PR2 Predict nginx buffering: 50-token 2.5 s stream through default nginx: first byte at 2.55 s, one read, all 1,450 bytes at once. Direct and fixed: first byte 0.07 s, 51 reads. Whole stream fits in nginx default buffers (a memory page or so each; stream is 1.5 KB), so nginx waited for the end. Longer stream: arrives in bursts one buffer at a time, arguably worse because it looks like lagging streaming. X-Accel-Buffering fixed it with no config change. Oddity: proxy_http_version 1.1 alone (nginx talks chunked HTTP/1.1 to uvicorn instead of default HTTP/1.0) also made it flow with buffering on; don't build on it, undocumented, gzip or another proxy would undo it; be explicit. -> A asks, B guesses ("slower, maybe a few hundred ms late per token"), A reveals.
- B9 Cancellation task part one: note tokens_generated, curl with a half-second max time, wait three seconds, read again. With an async generator Starlette cancels it on disconnect: a CancelledError is raised at the await it's paused on. About 10 new tokens, not 50. -> A, re-explains cancellation via the event loop.
- B10 Part two, the real case: Spark server runs model.generate in a background thread pushing into a queue, and a sync generator pulls from it. Simulate: thread makes 60 items, 50 ms apart, stop event. Job: make generate stop when stop is set; make something set stop when the client leaves (think who notices; a try/finally in the sync generator is the obvious idea, test it); prove with stats: about 10 after a half-second client, not 60. Real HF server: stop becomes a custom StoppingCriteria that returns true when the event is set (check docs). vLLM/SGLang abort for you. -> A.
- PR3 Predict sync disconnect: unchanged threaded version generates all 60; finally does not run (on FastAPI 0.143 / Starlette 1.8, hadn't run four seconds after). Starlette runs a sync generator by calling next on it in a worker thread one item at a time; when client leaves it stops calling next, doesn't close it, nothing inside finds out; generate thread finishes regardless. What worked: async response generator, pull from queue with await asyncio.to_thread(q.get), set stop in finally; disconnect cancels async generator, finally runs, event set, thread stops at next check; measured 9 tokens after a half-second client. Alternative: watcher task looping on request.is_disconnected and setting the event. -> A asks, B confidently says finally runs (wrong), A reveals.
- B11 Apply to Spark (review): server_naive gets three fixes: generation stops on disconnect (nvidia-smi shows GPU use drop within a second of closing curl), SSE comment heartbeat every 15 s while waiting for the GPU lock, X-Accel-Buffering no. Behind nginx on home server, rerun baseline harness through nginx; TTFT matches direct within a few ms. Agent reviews cancellation path for races: client leaves while still waiting for gpu_lock. -> A.
- B12 Done-when list. -> Folded: not read; each item is covered by the tasks above.

## Measure

- M1 Setup: localhost so network time near zero, isolates protocol costs; 50 tokens 50 ms apart; perfect client first token about 50 ms, last about 2.5 s. Run on M-series MacBook, Python 3.14, uvicorn 0.54, httpx clients; yours will differ, shape shouldn't. -> A.
- M2 Numbers: poll 50 ms: TTFT 0.08 s, total 2.61, 49 requests, 8.0 KB up, 8.2 KB down, 4.7 ms CPU per stream. Poll 250 ms: 0.27, 2.82, 12 requests, 2.0/2.3 KB, 2.0 ms. Poll 1 s: 1.02, 3.03, 4 requests, 0.7/1.0 KB. SSE: 0.08, 2.62, 1, 0.14/1.9 KB, 1.7 ms. WebSocket: 0.06, 2.60, 1, 0.21/1.0 KB, 1.2 ms. nginx default: 2.55 first, 2.56 total, 1.45 KB body; fixed: 0.07, 2.56. -> A says them grouped as story, not row by row; B reacts at the 16 KB and the 2.55.
- M3 Polling TTFT is the interval: first token exists at 50 ms; 1 s poller finds it at 1.02 s; total stretches by up to one interval since client learns done at next poll; half-interval average applies to every token. -> A.
- M4 Polling bytes mostly headers: actual text about 300 bytes; polling at 50 ms moved 16 KB, with httpx's minimal headers; browser sends user agent, accept headers, cookies, often 500 bytes to a couple of KB each; real polling several times worse. -> A, numbers with comparisons.
- M5 SSE and WS within a factor of two, both tiny: 33 bytes per token vs 15 per frame (id, data prefix, blank line, chunk wrapper); for LLM APIs the JSON per event dwarfs framing. -> A.
- M6 CPU follows requests: each poll pays parsing, routing, JSON, headers; 49 per stream at 50 ms; almost three times SSE's CPU; a thousand users at 50 ms about twenty thousand requests a second, a real server's whole budget on "anything yet?". WebSocket cheapest; the SSE endpoint called request.is_disconnected on every token, not free. Sub-millisecond differences are noise; client and server share cores. -> A.
- M7 nginx default buffering doesn't slow the stream, it deletes it: total same 2.56; tokens on time inside nginx; client couldn't see them. -> A, B's wrong model pays off.

## Break It

- K1 Heartbeat: proxy_read_timeout 2 s on fixed location (stand-in for 60), endpoint sends one event, sleeps 4 s, sends another. Through nginx curl gets the first event then cut at 2 s; curl exit code 18 ("transfer closed with outstanding read data remaining"); nginx error log "upstream timed out while reading upstream"; app logs nothing wrong, which is why it's confusing in production. Add colon-ping every second while waiting: full 4-second response comes through, parser ignores pings. -> "What if" exchange.
- K2 WebSocket through a proxy that doesn't know: client at the default nginx location fails; uvicorn answered 404 because nginx forwarded a plain GET. Upgrade and Connection are hop-by-hop headers (apply to one connection between adjacent machines; proxies drop them unless told), so add proxy_http_version 1.1 and set the Upgrade and Connection headers. Every load balancer and CDN needs the same. SSE needed none, part of why LLM APIs chose it. -> exchange.
- K3 Client stops reading: endpoint yields 1 KB events as fast as it can and counts; raw socket sends request then never receives. Counter climbed to 739 and froze: about 740 KB sat in uvicorn's buffer and two kernels' socket buffers; await send stopped returning; backpressure working. Break on purpose: append to a list in a background task instead of yielding; memory grows without limit. -> exchange.
- K4 Polling that leaks: start a job, never poll; task runs to end, tokens sit in jobs forever; no connection to close, so server can't tell slow poller from gone. Real job APIs add a time-to-live (no poll in N seconds means cancel and delete). Add one. -> exchange.

## Explain It Back (content must appear in conversation)

- X1 Neither changes who talks first: both start with a client request. SSE = response that doesn't finish quickly, chunked or HTTP/2 DATA frames, still HTTP, one-way after request. WebSocket = first request asks to switch (Upgrade, 101), then frames both ways, no longer HTTP. SSE "a long answer", WebSocket "a phone line". SSE gets HTTP tooling and Last-Event-ID; WS gets two-way and binary, build resume, errors, proxy support yourself. -> Ending exchange (B restates, A sharpens "neither talks first"), plus WebSocket section.
- X2 Why LLM APIs use SSE: shape fits; normal HTTP so auth, LBs, logging, rate limits, retries unchanged, same endpoint; stateless; through proxies and CDNs; curl. Switch only for realtime voice. -> Why-SSE section (retries mentioned there).
- X3 Debugging all-at-once: hit app directly with curl -N bypassing everything, look at timing; if it streams, add one hop at a time until it stops. Suspects: reverse proxy buffering, gzip, CDN or LB buffering, occasionally the app (middleware reading whole body, print without flush); client library not in streaming mode waits for whole body. Then check idle timeouts, heartbeats. -> A after the buffering explanation or after nginx predict, as "how you'd actually debug it".
- X4 Scale to 10,000 streams: polling at 250 ms = 40,000 requests a second just to ask, a ms or two of Python CPU each, dozens of cores for nothing. SSE/WS hold 10,000 connections; each costs a file descriptor, kernel socket buffers (few KB idle), small task object; very roughly tens of KB each, a few hundred MB total, fine. Runs out first: limits: open-file limit (ulimit -n, often 1,024 or 256 default), nginx worker_connections, LB idle timeouts, thread count in thread-per-stream servers. Tokens a few hundred bytes a second per stream, about 3 MB/s total, nothing. GPU is the real limit: 10,000 sequences in the batch. -> A/B exchange after Measure.
- X5 Tab closed hop by hop: FIN, proxy closes upstream, app server sees EOF, Starlette cancels async generator with CancelledError at its await; cancellation must reach generation loop (stop flag or StoppingCriteria, or engine abort); classic bug sync generator reading a thread's queue; no FIN = minutes until a write fails or heartbeat unanswered, so heartbeats matter for cancellation too. -> Disconnects section + cancellation build; heartbeat-cancellation link said explicitly.

## Go Deeper / Connections

- G1 Best sources: the WHATWG SSE spec (short; parsing section is the parser you wrote) and Ilya Grigorik's High Performance Browser Networking (free; compares exactly these). -> One closing-ish sentence before the ending.
- N1 Connections: builds on waiting-vs-working (10,000 open streams are 10,000 waiters; cancellation is the event loop's), TCP (FIN, flow control, vanished peer). Explains baseline streaming: TTFT measured at first non-empty event, events aren't tokens, parse lines not chunks. Next: load balancing (stream pins a user to a backend for minutes; draining for deploy waits for streams); rate limits (open stream holds a concurrency slot). -> One or two sentences.

## Flow plan

1. Problem: nginx blob (A scene), abandoned essay (B "server knows I left?"), seventy-second death. One-line signpost.
2. Origin as story: Comet, Hickson, SSE, WebSockets, OpenAI picked the older one.
3. HTTP speaks when spoken to; TCP pipe is two-way (B surprise); keep-alive; four ways.
4. Short poll + Predict (B forgets the start request); long poll; B reaches "a response that never ends".
5. SSE: chunked, "ordinary response that takes its time", bytes on the wire, two layers (B "chunk = token"), event fields, comment teaser, EventSource and Last-Event-ID, limits and why SDKs POST.
6. WebSockets: B "the modern one, so better?"; upgrade, 101, frames, key check, frame header, masking (B "encryption?"), the price.
7. Figure 001 + 004 together as "all four side by side" picture; takeaways; the choice comparison; rule of thumb.
8. Why LLM APIs chose SSE; formats; Realtime exception.
9. Road between: buffering (B "slowed it down"), debugging recipe (X3), idle timeouts + heartbeat (B "TCP keepalive?"), disconnects (FIN, vanish), 95% waste, backpressure.
10. HTTP/2 and gRPC.
11. Build It: setup, polling, SSE + parser + EventSource, WebSocket + handshake, harness, nginx Predict, cancellation async, sync Predict (B "finally runs"), Spark fixes.
12. Measure, then scale question (X4).
13. Break It four.
14. Sources + connections, one line each.
15. Ending: B restates ("SSE and WebSockets let the server talk first..."), A sharpens: neither talks first; long answer vs phone line; and the stream is only as good as its worst hop.
