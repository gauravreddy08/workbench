# Outline: http-from-scratch

Source: src/lessons/http-from-scratch.mdx. Curriculum entry: "HTTP from scratch." Question: what is
HTTP really, under the frameworks? Why: FastAPI and friends are thin layers over a text protocol;
knowing it makes every API bug readable.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

## Today / prerequisites

- T1 Prereqs: processes/threads/GIL (thread per connection; blocked thread releases the GIL) and waiting-vs-working (event loop, loadgen). -> Re-explained briefly where used (concurrency section, Build It t5). Today bullets skipped as a list.
- T2 Rough size: one long evening, server about 150 lines. -> A, at the start of Build It.

## The Problem

- P1 Interviewer: "could you spin up an API in Python without a framework?" Honest answer: "I'd pip install fastapi." -> A opens on the scene; B gives that honest answer as their own.
- P2 What arrives? Bytes? An object? Who turned it into the dict? -> B voices the wrong model ("it arrives as some kind of request object / JSON"); A corrects.
- P3 The secret: HTTP is text sent over a TCP connection. Client connects, writes a few lines, waits; server reads, writes text back. Every framework and requests.get is a machine for writing and reading that text. -> A, plainly.
- P4 Real interview answer: not "yes I can" but "yes, and here's what the framework does for me that I'd do by hand". -> A.
- P5 Work payoff: hanging request, proxy 502, streaming LLM response stopping halfway, CORS blocking what works in curl; the explanation is always in the text on the wire. -> A, as a list of things he's seen.

## Origin

- O1 1989 Tim Berners-Lee at CERN proposes linking documents across computers for physicists; end of 1990 first server and browser on a NeXT workstation; protocol barely had a name. -> A, story.
- O2 HTTP/0.9: one request kind, single line "GET /some/document" then line break; server sends HTML and closes. No version, headers, status codes; "not found" only via an HTML page saying so; no images (no way to say "this is an image"). -> A; B reacts to "no way to say not found".
- O3 HTTP/1.0 (1996): version on request line, status codes, headers so a response says what it is (content type image gif). -> A.
- O4 HTTP/1.1 (1997, revised 1999, 2014, 2022): reusable connections, required Host header so one machine serves many sites, chunked encoding. -> A.
- O5 HTTP/2 (2015) and HTTP/3 (2022) change packaging not meaning; methods, status codes, headers same in all three. -> A.
- O6 The text format is HTTP/1.1, still everywhere: load balancer to app, uvicorn to laptop, every curl dash v. -> A.

## The Idea: a conversation in a pipe

- I1 TCP connection (Term): reliable two-way byte stream; in order, no gaps, or the connection fails; doesn't know what bytes mean. -> A, re-explained from the networking lessons.
- I2 Stream, no message boundaries: write 10 then 20 bytes, other side might read one 30-byte chunk or three of 10. -> A; B's wrong model: "each send arrives as one message".
- I3 Socket (Term): OS handle for one end of a connection, looks like a file descriptor. recv(n) gives up to n bytes; sendall pushes bytes in. -> A, names spoken as "receive" and "send all".
- I4 HTTP is an agreement about what to write into the pipe; text with strict shape; deliberate 1991 choice; why you can debug the web with curl dash v and your eyes. -> A.
- F1 Figure 001: client (curl/browser) and server (rawhttp) each over a socket, TCP connection underneath with kernels on each side; request text one way, response text back; the line-end symbol is two bytes. -> A describes like a diagram over the phone.

## The shape of a request

- R1 Captured curl POST to slash v1 slash echo with JSON body q hello, by pointing curl at nc listening on 8080 (a program that prints whatever arrives). -> A, describes the setup in words.
- R2 Lines: POST /v1/echo HTTP/1.1; Host 127.0.0.1:8080; User-Agent curl 8.7.1; Accept star slash star; Content-Type application/json; Content-Length 14; blank; body. -> A walks it in words, not read verbatim; key values said.
- R3 Four parts in order: request line, headers, blank line, body. -> A.
- R4 Request line: method (Term: verb; GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS), target (Term: path plus optional query string, aka request URI), version; separated by single spaces. -> A.
- R5 Headers: zero or more "Name: value" lines; names case-insensitive; metadata (who's asking, body format, size, what client accepts). -> A.
- R6 Blank line: most important line in HTTP; only thing that says headers are over. -> A, emphatic.
- R7 Body optional, raw bytes, as many as Content-Length says; GET usually none. -> A.
- R8 CRLF (Term): carriage return + line feed, bytes 13 and 10, typewriter/teleprinter legacy; HTTP, SMTP end lines with both; not just newline. Blank line is really four bytes; first thing the server looks for. -> A; B asks "why two bytes".
- PR1 Predict where-body-ends: how does the server know the body is finished, and what if the client lies? Answer: it counts; Content-Length 14 means read exactly 14 bytes; no end marker in body. Says 20 sends 14: waits for 6 that never come until timeout. Says 10 sends 14: leftover 4 bytes (lo quote brace) become the start of the next request; next request line became lo-quote-brace-GET /health, parsed as method, answered 405. Garbage in, confident garbage out. Classic hand-written bug; proxy/server disagreement = request smuggling. -> A asks, B guesses (wrong: "it looks for the closing brace / end of JSON"), A reveals.

## The shape of a response

- S1 Same four-part shape, different first line: HTTP/1.1 200 OK, Content-Type JSON, Content-Length 24, Connection keep-alive, blank, body echo of q hello. -> A, in words.
- S2 Status line (Term): version, three-digit status code, reason phrase. Status code (Term): programs branch on number; reason phrase is for humans and can be anything. -> A; B surprised reason phrase can be anything.
- F2 Figure 002 interactive anatomy: hover each line for its role; toggle between Content-Length and chunked; byte counts computed from actual text including every line end. -> A describes what you'd see as you hover and flip the toggle (chunk sizes nine and f).

## Two ways to say the body ends here

- B1 Content-Length: server builds whole body, measures, writes length first. Simple, cheap, what your server does. -> A.
- B2 Unknown length: LLM generating tokens; DB streaming a million rows doesn't want to buffer to count. HTTP/1.0 answer: send then close; wastes connection; dropped looks same as finished. -> A; B: "so just close it" wrong model.
- B3 Chunked transfer encoding (Term): Transfer-Encoding chunked instead of Content-Length; each piece size in hex, line end, bytes, line end; size zero ends. -> A.
- B4 Real uvicorn example: six "hello ", eight "chunked ", six "world" plus newline, zero, blank. Sizes hex: 577-byte chunk written 241. Pieces can arrive seconds apart: that's how HTTP/1.1 streams; under the SSE lines in waiting-vs-working's fake LLM stream. -> A, describes example in words, works the hex conversion with B.
- B5 example.com typed by hand replied chunked with first chunk size 241: Cloudflare streaming from cache rather than announcing a length. -> A.
- B6 Rule: send Content-Length, never both headers, reject requests with Transfer-Encoding with 501 unless you implement chunked decoding; real servers must accept chunked bodies. -> A.

## Status codes, by family

- C1 Families: first digit says whose problem it is; about fifteen specific codes you'll see weekly. -> A.
- C2 1xx informational: 101 Switching Protocols (WebSocket upgrade), 100 Continue. -> A, briefly.
- C3 2xx: 200 OK, 201 Created, 204 No Content (success, empty body). -> A.
- C4 3xx: 301/308 moved permanently, 302/307 moved for now, 304 Not Modified (cached copy still good). -> A.
- C5 4xx client wrong: 400, 401 (really unauthenticated: who are you?), 403 (I know who you are, and no), 404, 405, 413 Content Too Large, 415 Unsupported Media Type, 422 Unprocessable Content, 429 Too Many Requests. -> A; B mixes up 401 vs 403 and A corrects.
- C6 5xx server failed: 500, 502 Bad Gateway (proxy got garbage or nothing), 503 (overloaded, try later), 504 Gateway Timeout (proxy gave up waiting). -> A.
- C7 4xx vs 5xx split matters most: 4xx retrying won't help; 5xx might work next time. Loadgen, retries, alerts branch on first digit. 500 for bad JSON is lying, pages someone at 3 a.m. for a curl typo. -> A; B's wrong model: "an error is an error".
- C8 Proxy (Term): sits between client and app, forwards (LB, nginx, API gateway, Cloudflare); to your app the proxy is the client. 502 = app crashed / closed early / invalid HTTP; 504 = too slow for proxy timeout; neither appears in app logs. -> A; B: "I'd look in my app logs".

## Methods, safe and idempotent

- M1 Method is a promise; two properties. -> A.
- M2 Safe (Term): read-only, GET HEAD OPTIONS. Browsers prefetch, crawlers follow, caches replay; GET delete-account deletes via link-preview bot. -> A, the bot story.
- M3 Idempotent (Term): twice same effect as once; x = 5 yes, x += 1 no. Connection drops before response: did it happen? Can't know; for idempotent, resend. -> A; spoken as "set x to five" vs "add one to x".
- M4 Table: GET give me (safe, idem, no body); HEAD headers only (safe, idem); OPTIONS what can I do here, CORS (safe, idem, rarely body); PUT replace (not safe, idem, body); DELETE remove (not safe, idem, rarely body); POST process (neither, body); PATCH change part (not safe, not guaranteed idem, body). -> A in prose, grouped, not row by row.
- M5 Retries: clients/proxies may auto-retry GET; shouldn't silently retry POST (charge card twice). Every LLM call is a POST, so a retrying client might pay twice. Stripe-style Idempotency-Key header: random ID per logical operation; server recognizes retry, returns stored result. -> A; B raises the LLM double-pay.

## Headers that matter

- H1 Hundreds registered; these cause real bugs. -> A.
- H2 Content-Type (this body's format: application/json, text/html with charset, multipart form-data for uploads) and Accept (what client wants back); content negotiation (Term). Bug: curl dash d defaults to form-urlencoded; strict server 415, FastAPI 422. -> A; B recognises the curl bug.
- H3 Authorization: Bearer plus key or token; 401 means missing or bad credentials. Plain text over http, anyone on path reads it (TLS is for that); never log it, real way keys leak. -> A.
- H4 Cache-Control: no-store never keep; max-age 60 reuse for sixty seconds without asking; no-cache does NOT mean don't cache: store but check before reusing; private: browser yes, shared cache like CDN no. -> B's wrong model on no-cache; A corrects.
- H5 ETag (Term: fingerprint, hash or version) and If-None-Match: server sends ETag v42; client sends If-None-Match v42; unchanged -> 304 no body, few hundred bytes instead of whole resource; the 304 in the network tab. -> A.
- H6 Same-origin policy (Term): origin = scheme + host + port; JS from one origin can't read responses from another unless allowed. Page on localhost 3000 calling API on 8000: browser adds Origin header, refuses JS access unless Access-Control-Allow-Origin matches (or star). -> A, scene from his work.
- H7 Preflight (Term): automatic OPTIONS before cross-origin request with JSON body, custom headers (Authorization), or PUT/DELETE; real request sent only if allowed. -> A.
- H8 CORS enforced by browser not server (why curl works, browser fails); CORS is not security for your server: protects the user from malicious page reading their data with their cookies. -> B's wrong model "CORS protects my API"; A corrects.

## Keep-alive

- K1 TCP handshake (Term): three packets SYN, SYN-ACK, ACK; one round trip before data: tens of microseconds on localhost, about 20 ms across a country, about 150 ms across an ocean. TLS adds at least one more round trip plus key-exchange CPU. -> A, with comparisons.
- K2 HTTP/1.0 fresh connection per request; page with 30 images = 30 handshakes. HTTP/1.1 persistent connection (Term, aka keep-alive) default; Connection close ends it. -> A.
- F3 Figure 003: top row: handshake, request, close, three times; bottom: one handshake then three requests back to back; saved two handshakes and two closes; connection pool is most of the speedup. -> A over the phone.
- K3 Server must loop: read request, answer, read next from same socket until client closes, says close, or goes quiet too long. -> A.
- K4 One recv can return end of one request and start of the next; pipelining (Term: several requests without waiting; allowed, rarely used by browsers; must not lose extra bytes). Parser keeps a buffer of unused bytes; forget it and the second request vanishes or becomes garbage. -> B's wrong model "one recv, one request"; A corrects.
- PR2 Predict keepalive-speedup: localhost trivial health: same, 2-3x, or 10x+? Laptop to Spark over Tailscale bigger or smaller? Answer: one client one connection about 30-35 microseconds/request vs about 90 fresh, roughly 2.5-3x on localhost; mostly kernel setup/teardown plus thread start. Over real network much bigger: 5 ms round trip adds at least 5 ms to a 5 ms request, roughly 2x by round trips alone; plus TLS. Why every serious client pools; "one httpx AsyncClient for the whole app" from last lesson. -> A asks, B guesses 10x, reveal.

## The server you're going to write

- W1 Steps: listen and accept; read until blank line, refuse past 16 KB of headers with 431; parse request line into exactly three parts and each header on its first colon; read exactly Content-Length bytes keeping extra; route on method and path; respond with status line, Content-Type, Content-Length, blank, body; loop or close; every bad input gets the right 4xx and close because after a misparse you can't trust where the next request starts. -> A walks as a spoken sequence.
- W2 Concurrency is separate: loop handles one connection at a time; while waiting on one slow client nobody else is served. Fix two ways: thread per connection, then asyncio, where start_server gives readuntil blank line and readexactly n, the two operations HTTP/1.1 parsing is made of. -> A, re-explains event loop briefly.

## What a framework adds

- A1 About half your server is HTTP (reading, parsing, framing, keep-alive, timeouts, errors), half is your API (routes, JSON, validation); separable, Python separates them on purpose. -> A.
- F4 Figure 004 layers: kernel (TCP, sockets, listen backlog); uvicorn (accept, read, parse with h11 or httptools, keep-alive, timeouts, framing, bad requests get 400 before your code runs); ASGI band (await app with scope, receive, send); FastAPI (routing, path params, middleware CORS gzip auth logs, JSON parse, Pydantic validate, 422, serialize, exception handlers, OpenAPI docs); your code. -> A describes the stack bottom to top.
- A2 WSGI (Term; PEP 333 2003, PEP 3333 for Python 3): server calls app with environ and start_response, synchronous, once per request; environ dict; app calls start_response with status and headers and returns body; why gunicorn serves any Flask/Django app; synchronous to the core: one request holds a thread; no clean way to hold a WebSocket open. -> A.
- A3 ASGI (Term): async successor; uvicorn, Hypercorn, Daphne servers; Starlette, FastAPI frameworks. App is one async function of scope, receive, send. -> A.
- A4 scope: dict of parsed request: type http, method, path, query string as bytes, headers as list of byte pairs, names lowercased. receive: next piece of body, dict with type http.request, body, more_body false. send: first response.start with status and headers, then one or more response.body with more_body. -> A in words.
- A5 Taken away: sockets, line ends, Content-Length counting, keep-alive loop. Given back: send many times with more_body true, streaming natural; no content-length means uvicorn switches to chunked (how the chunked example was made). Same interface carries WebSockets and lifespan (what FastAPI's lifespan hooks ride on). -> A.
- A6 Stack: uvicorn calls FastAPI (ASGI app on Starlette) calls your function. "Running FastAPI" means running uvicorn; uvicorn main:app: uvicorn is the program, main:app is which function to call. -> B's wrong model "FastAPI is the server"; A corrects.
- A7 Framework adds: routing (users id path param; yours is an if), parsing (query strings, JSON, forms, uploads, cookies), validation (precise 422 instead of KeyError three lines in), serialization (dict to JSON with right Content-Type), middleware (wraps every request: CORS, gzip, auth, request IDs, timing; just an ASGI app wrapping another), error handling (exception becomes 500, not dropped connection), docs from type hints. -> A.
- A8 None of that is HTTP; convenience on top. That's the interview answer. -> A.

## HTTP/2 and HTTP/3

- V1 HTTP/1.1 weakness: one connection, responses one at a time in order; slow request 1 holds ready request 2: head-of-line blocking (Term). Browsers open about six connections per site: six handshakes, six slow starts. -> A.
- V2 HTTP/2 (2015, from Google's SPDY): keeps methods, headers, codes. Binary framing: frames (Term: 9-byte header with length, type, stream). Faster, unambiguous parsing. -> A.
- V3 Multiplexing: each request/response is a numbered stream (Term); frames interleave on one TCP connection; response 2 doesn't wait; one connection replaces six. -> A.
- V4 HPACK (Term): both sides keep table of seen headers, repeat sent as small index; static table of 61 common headers; Huffman coding for the rest. -> A, Huffman explained in a phrase.
- V5 curl with http2 flag against example.com: first line says HTTP/2 200; header names lowercase (required). Browsers only use HTTP/2 over TLS. gRPC built on it. -> A.
- V6 HTTP/2 moves HOL down a layer: TCP in order, lose one packet, everything behind it on all streams waits; on lossy mobile one multiplexed connection can do worse than six. -> B's wrong model "so HTTP/2 fixed it"; A corrects.
- V7 HTTP/3 (2022) leaves TCP: QUIC (Term: on UDP, Google, standardized 2021; reliable ordered streams, each independently; TLS 1.3 built in). Lost packet stalls only its stream. Folds TLS into connection handshake: one round trip instead of two or more. Connection ID not IP and port, so phone Wi-Fi to cellular keeps connection. -> A.
- F5 Figure 005: three rows, A B C: 1.1 sequential (B and C wait); 2 interleaved frames on TCP, lost packet X stalls all behind it; 3 independent streams, only A waits. -> A over the phone.
- V8 In practice: 1.1 between services and in data centers; 2 for browsers and gRPC; 3 increasingly for phones. alt-svc header from example.com: h3 on UDP port 443, remember for a day (86400 s). Won't hand-write 2 or 3 (use a library like h2); methods, codes, headers carry over. -> A.

## Build It

- BT0 Setup: folder workbench slash http, Python 3.11+, venv, uvicorn fastapi httpx; nc (netcat), curl, ab (ApacheBench; macOS built-in, Ubuntu apache2-utils); copy loadgen. -> A, one sentence.
- BT1 t1 Speak HTTP by hand: nc with dash c so Enter sends CRLF, to example.com port 80; nothing happens, server waiting; type GET slash HTTP/1.1, Host example.com, empty line. Find status line, headers, blank line; chunked; convert first chunk size from hex; connection stays open, type again for second response: keep-alive by hand. -> A narrates as a scene.
- BT2 t1 history: HTTP/1.0 with no Host: what status and why would a many-site server refuse; bare "GET /": is there a status line; HTTP/1.7 typo; header with no colon. -> A poses as things to try, describes what they reveal (without inventing results).
- BT3 t1 be the server: nc listening on 8080, curl to it, request appears; type a reply by hand: 200 OK, Content-Length 3, blank, hi. "hi" plus Enter's line end is 4 bytes; what does curl do if you claim 3? 10? Then browser: read everything a browser sends that curl didn't. Non-interactive printf piped to nc with a sleep (macOS nc hangs up when input ends). -> A + B counts the bytes.
- BT4 t2 Smallest server: socket only; SO_REUSEADDR to rebind after restart; bind; listen 128 (backlog: not-yet-accepted connections kernel queues); accept loop; recv until blank line; send hard-coded response with correct length; close. Test with curl and browser; get length wrong by one each direction. -> A.
- BT5 t3 Shape: MAX_HEAD 16 KB, MAX_BODY 1 MB; BadRequest exception carrying status; read_request takes conn and leftover buffer, returns request plus leftover, or None on clean close; handle returns status, object, extra headers; respond builds status line, Content-Type, Content-Length, Connection, extras; head as latin-1, body as UTF-8. -> A in words.
- BT6 t3 spec: GET health 200 status ok; HEAD health 200 same headers incl Content-Length no body; POST health 405 with Allow GET HEAD; POST echo valid 200 echo; invalid JSON 400; non-JSON content type 415; GET echo 405 Allow POST; other path 404, ignore query; request line not 3 parts 400 close; version not 1.0/1.1 505; 1.1 no Host 400; header no colon 400; bad Content-Length 400; body over max 413 checked before reading; head over max without blank line 431; any Transfer-Encoding 501; client closes mid-request: just close. -> A in grouped prose, not row by row; all codes said.
- BT7 t3 hints: recv returns empty when other side closed; can return half a header or one and a half requests; latin-1 never throws; split on CRLF; partition on first colon so Host with port works; lowercase name; every error says Connection close and actually close; settimeout 10, timeout means close so silent client can't hold server forever. Test every row via printf to nc; shell script to rerun. -> A.
- BT8 t4 keep-alive loop: 1.1 keep alive unless Connection close; 1.0 close unless Connection keep-alive; send the matching header; carry leftover buffer. Tests: curl two URLs shows "Re-using existing connection"; pipelining: GET health then POST echo with 8-byte body and Connection close in one write -> two responses, second with close. -> A.
- BT9 t5 feel it: one-at-a-time server, idle nc, curl with 5-second max hangs; server inside recv on silent connection, new one in kernel backlog; curl waited until nc hung up, 5.4 s instead of 1.5 ms. -> A, with B reacting to the ratio.
- BT10 t5 threads: daemon thread per connection, each own stack, blocks in own recv; idle test answers instantly; fine despite GIL because blocked recv releases it (re-explain). -> A; B raises GIL worry.
- BT11 t5 asyncio: asynchttp reusing handle/respond; readuntil (raises incomplete-read if hangup, limit-overrun if no separator within limit); readexactly; wait_for timeout 10; write then drain; close in finally; start_server on 8081 with limit MAX_HEAD, backlog 128. StreamReader keeps leftover buffer for you. Rerun t3/t4 tests on 8081. -> A.
- BT12 t6 curl dash v every route, the outgoing and incoming lines; browser to health, print request line per request; what extra request does the browser make; network tab shows your code and headers; loadgen 2000 requests at 50 concurrency on threaded and asyncio servers, zero errors; agent review against t3 table and RFC 9112 sections 2-6; classic bug: Content-Length sent twice with different values. -> A; B asks about extra request (answer left as the lesson leaves it: find out).
- BT13 t7 bare ASGI: async app; ignore non-http scope (uvicorn sends lifespan at startup); read body via receive loop until more_body false; route on method and path; headers lowercase byte pairs; send response.start then response.body. Run under uvicorn on 8082; rerun t3 tests: which malformed requests did uvicorn reject before your code; which codes you still had to get right. Experiment: no content-length, two sends with more_body true, uvicorn chose chunked. -> A.
- BT14 t8 FastAPI: same endpoints in about ten lines (health returns status ok; echo takes a dict payload); uvicorn on 8083; differences: 422 for bad JSON and wrong Content-Type, error body format, date and server headers, lowercase names, what DELETE health returns; slash docs page you didn't write. -> A.
- BT15 Done when: hand request to example.com returns 200 and you can point to parts and first chunk size; every t3 row right on threaded and asyncio from a rerunnable script; curl reuse + two-in-one-write; idle nc no longer blocks; loadgen at 50 zero errors on both; bare ASGI passes same tests and you can list what FastAPI added. -> A, compressed into one turn.

## Measure

- ME1 Two questions: how much does reuse buy; how much does each layer cost on a trivial endpoint. -> A.
- ME2 seq.py: one client, raw sockets, 2,000 GET health on one connection vs 2,000 fresh; microseconds per request; keep at 2,000 (Break It). -> A.
- ME3 ab (C, not the bottleneck): 8000 requests at 50 concurrency, without and with dash k; read requests per second, percentiles, Keep-Alive requests; servers on 8080-8083. -> A.
- ME4 Numbers: rawhttp threads ~30-35 / ~90 us, ab ~17,000 / ~41,000 req/s, keep-alive 8000; asynchttp ~57 / ~160, ~9,500 / ~78,000, 8000; bare ASGI ~100 / ~190, ~12,000, no gain, 0; FastAPI ~140 / ~230, ~8,000, no gain, 0. -> A says them grouped by server with comparisons, not as a table.
- ME5 Caveat: busy MacBook (load average near 90), ab swung 5-10x between runs; best of several; seq.py more trustworthy; trust ratios within a run; do several runs on a quiet machine. -> A.
- ME6 Reuse worth 2-3x on localhost for one client; mostly kernel bookkeeping; over a network add round trip and TLS per new connection. -> A.
- ME7 Each layer costs tens of microseconds; raw beats uvicorn; FastAPI adds another ~40 us. Next to an LLM call of ~1,000,000 us it's noise; on a health check or tiny proxy it's most of the time. -> A with comparison; B's wrong model "so FastAPI is slow".
- ME8 Surprise: uvicorn Keep-Alive requests 0 under ab dash k: ab speaks HTTP/1.0 and asks with Connection keep-alive; your server honors it (t4 rule); uvicorn's default h11 parser doesn't support 1.0 keep-alive, closes every connection, so its ab dash k number is a new-connection number. Check with curl http1.0 plus keep-alive header against both. uvicorn standard (httptools) may differ; check. Lesson: benchmark tool's protocol choices change what you measure. -> B: "so uvicorn is broken?"; A.
- ME9 Python loadgen tops out first: few hundred to ~2,000 req/s regardless of server; client doing more Python per request than server; httpx at 50 connections slower than at 1. Check which side's CPU is pegged in top. loadgen for latency of real endpoints; ab or wrk for "how fast can this server go". -> A.

## Break It

- BK1 Run out of ports: 20,000 new connections; died after about 16,000 with Errno 49 can't assign requested address; TIME_WAIT count about 16,350. TIME_WAIT (Term: state after close for twice the maximum segment lifetime, so late packets aren't mistaken for a new connection on same ports): 30 s on macOS (MSL 15 s doubled); each holds a local port; macOS outgoing range 49152-65535 = 16,384 ports; faster than ~550 new connections/s to one server and you run out. Keep-alive removes it. Production: new HTTP client per request. -> A; B does the division.
- BK2 Lie about length: 20 with 14-byte body hangs until 10 s timeout then close. 10 with 14 on kept-alive then valid GET: first gets 400 (curly-q-hel isn't JSON), leftover glues on giving method lo-quote-brace-GET; answered 405, wrong instructively. Fix: method names are tokens (RFC 9110), quote and brace not allowed; validate, return 400. Proxy and server disagree (Content-Length vs Transfer-Encoding): attacker hides second request; proxy sees one, app sees two: request smuggling (Term). RFC 9112: both headers = suspicion; why you reject Transfer-Encoding. -> A, B reacts to "hidden request".
- BK3 Slow client (Slowloris, Term, 2009): 200 connections each sending request line then one header byte every few seconds; asyncio server should still answer curl but each costs memory and stays open because timeout is per read not per request. Fix: deadline for whole head. Threaded server: 200 slow clients = 200 parked threads. Which would survive 20,000? -> A; B answers (async), grounded in last lesson's memory numbers? No: keep to lesson; A says the question is the point, B reasons from thread cost.
- BK4 Wrong family: echo returns 500 for invalid JSON; loadgen counts errors; what would alerting page on. Health returns 200 with status error body: load balancer reads only status code, keeps sending traffic to broken server. Status code is the API; body is for humans. -> A, B.

## Explain It Back (content must appear somewhere)

- E1 Build an API without a framework: full walk (listen, accept, read to blank line, parse into method/path/version and case-insensitive header dict, read Content-Length body, route, respond, loop for keep-alive keeping extra bytes, 4xx and close, concurrency via threads or asyncio). In real life uvicorn for HTTP (battle-tested against weird clients and attacks) and a framework for routing/validation, but know what both do. -> B's closing restatement + A sharpening, plus the server-you'll-write section.
- E2 Body end + chunked use: Content-Length or chunked; old close style wastes connection and can't tell finished from dropped; chunked when length unknown (LLM tokens, big query results, generated files); response starts immediately and connection stays reusable; never both; smuggling. -> Chunked section + Break It.
- E3 uvicorn vs FastAPI vs ASGI: swap servers (uvicorn, hypercorn) or frameworks (Starlette, FastAPI, Django) independently because of the contract; WSGI older sync version with Flask/Django and gunicorn. -> Framework section, swap point said explicitly.
- E4 Safe/idempotent: covered by M1-M5; idempotent list GET HEAD OPTIONS PUT DELETE; idempotency key. -> Methods section.
- E5 Scale: 500 req/s from one client opening new connection per request: handshake round trip each plus TLS round trip and key-exchange CPU; latency up by one or two round trips, both sides burn setup CPU; TIME_WAIT holds port on the side that closed for 30-60 s depending on OS; ~16,000 ephemeral ports on macOS, roughly 28,000 by default on Linux; runs out around 500 new connections/s sustained; "can't assign requested address". Fix: keep-alive pool, 500 req/s might need a few dozen connections; HTTP/2 multiplexes further. -> Break It port exhaustion exchange, extended with the scale question.
- E6 HTTP/2 and 3: same meaning; changes listed; TCP order weakness; QUIC fixes. -> HTTP/2/3 section.

## Go Deeper / Connections

- G1 One sentence: RFC 9112 (section 6 on bodies, read twice) and Tim Berners-Lee's one-page 1991 HTTP; maybe Stenberg's HTTP/3 explained. -> A near the end.
- G2 Connections: TLS wraps this same text in encryption; next lesson streaming (SSE, WebSockets) builds on chunked and ASGI send loop; load balancing and rate limits are about proxies and 502/503/429 you can now read. -> A, one or two sentences before the close.

## Flow plan

Problem scene (interview) -> B's honest answer and "it arrives as an object" model -> HTTP is text in a pipe -> Origin story -> pipe and socket, stream boundaries (B wrong model) -> request shape, blank line, CRLF -> Predict body end -> response shape + anatomy figure -> chunked (B: just close it) -> status families (401/403, 4xx vs 5xx, 502/504 logs) -> methods safe/idempotent, LLM POST double-pay -> headers (no-cache wrong model, CORS wrong model) -> keep-alive, handshake costs, figure, buffer (B: one recv one request) -> Predict speedup -> the server you'll write -> framework layers (B: FastAPI is the server), WSGI/ASGI -> HTTP/2 and 3 (B: HTTP/2 fixed it) -> Build It t1-t8 -> Measure -> Break It -> connections + go deeper one-liner -> B restates, A sharpens.
