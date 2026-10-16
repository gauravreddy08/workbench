# Coverage: http-from-scratch

Lesson src/lessons/http-from-scratch.mdx vs podcast/scripts/http-from-scratch.md. Item IDs match
podcast/outlines/http-from-scratch.md. Every number checked against the lesson; numbers derived for
the ear (not written in the lesson) are listed at the bottom.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 Prereqs re-explained (thread blocked in recv releases GIL; event loop) | Server you're going to write; Build It concurrency | "a thread blocked waiting on the network lets go of the GIL" | covered |
| T2 One evening, ~150 lines | Build It setup | "about a hundred and fifty lines" | covered |
| P1 Interview question, "I'd pip install" | Problem | "Honestly? I'd pip install FastAPI." | covered |
| P2 What arrives, who made the dict (B wrong model) | Problem | "some kind of request object?" | covered |
| P3 HTTP is text over TCP; frameworks write/read text | Problem | "HTTP is text. Sent over a TCP connection." | covered |
| P4 Real interview answer | Problem | "not yes, I can, but yes, and here's what the framework is doing" | covered |
| P5 Work payoff: hang, 502, stream stops, CORS vs curl | Problem | "A proxy throwing a five oh two" | covered |
| O1 1989 CERN, 1990 NeXT | Origin | "Nineteen eighty-nine, Tim Berners-Lee" | covered |
| O2 HTTP/0.9 one line, no status, no images | Origin | "no way to say not found, except by sending back an HTML page" | covered |
| O3 1.0 (1996) version, codes, headers, image type | Origin | "nineteen ninety-six, added a version" | covered |
| O4 1.1 (1997/99/2014/2022) reuse, Host, chunked | Origin | "made the Host header required" | covered |
| O5 2 (2015), 3 (2022) packaging only | Origin | "changed how the bytes get packaged. But not what a request means" | covered |
| O6 1.1 everywhere | Origin | "Between your load balancer and your app" | covered |
| I1 TCP connection term | Pipe | "a reliable, two-way stream of bytes" | covered |
| I2 Stream, 10+20 -> 30 or 3x10 (B wrong model) | Pipe | "one thirty-byte chunk. Or as three chunks of ten" | covered |
| I3 Socket term; recv/sendall | Pipe | "Receive, spelled R E C V" | covered |
| I4 Text by design, curl -v and your eyes | Pipe | "debug most of the web with curl dash v and your eyes" | covered |
| F1 Figure 001 | Pipe | "two boxes at the top... one long bar, the TCP connection" | covered |
| R1 Captured via nc on 8080 | Request | "netcat, in listen mode on port eighty eighty" | covered |
| R2 Request lines incl. Content-Length 14 | Request | "Content-Length, fourteen" | covered |
| R3 Four parts | Request | "always four parts, always in this order" | covered |
| R4 Method, target terms, version | Request | "You'll also hear it called the request URI" | covered |
| R5 Headers case-insensitive, metadata | Request | "content-length in lowercase and Content-Length with capitals are the same" | covered |
| R6 Blank line most important | Request | "the most important line in HTTP" | covered |
| R7 Body optional, GET none | Request | "GET requests usually don't have one" | covered |
| R8 CRLF bytes 13/10, typewriters, SMTP, 4 bytes | Request | "Bytes thirteen and ten" | covered |
| PR1 Predict body end, lie 20/10, lo"}GET 405, smuggling | Predict | "It counts... answered with a method not allowed" | covered |
| S1 Response shape, CL 24, keep-alive | Response | "Content-Length, twenty-four" | covered |
| S2 Status line, code vs reason phrase | Response | "two hundred Banana" | covered |
| F2 Figure 002 interactive + toggle | Response | "Flip it to chunked and the Content-Length line disappears" | covered |
| B1 Content-Length | Two ways | "Simple, cheap, and it's what your server's going to do" | covered |
| B2 Unknown length; 1.0 close; done vs died | Two ways | "You can't tell done from died" | covered |
| B3 Chunked term | Two ways | "a piece of size zero means the body's over" | covered |
| B4 uvicorn example, 241 = 577, seconds apart, under SSE | Two ways | "two four one. Two times two fifty-six" | covered |
| B5 example.com chunked 241, Cloudflare cache | Two ways | "Cloudflare... streaming the page from its cache" | covered |
| B6 Rule: CL, never both, 501 | Two ways | "reject it with a five oh one" | covered |
| C1-C6 Families and specific codes | Status codes | "Four oh one is really unauthenticated" | covered |
| C7 4xx vs 5xx, 3 a.m. page | Status codes | "paging someone at three in the morning" | covered |
| C8 Proxy term, 502/504, not in app logs | Status codes | "Neither one shows up in your app's logs" | covered |
| M1-M3 Safe, link-preview bot, idempotent x=5 | Methods | "Set x to five is idempotent" | covered |
| M4 Method table | Methods | "PUT means replace... PATCH... isn't guaranteed" | covered |
| M5 Retries, LLM POST twice, Idempotency-Key | Methods | "Stripe's the famous example" | covered |
| H2 Content-Type/Accept, negotiation, curl -d 415/422 | Headers | "Curl's dash d flag... URL-encoded form" | covered |
| H3 Authorization, 401, plain text, never log | Headers | "never, ever log it" | covered |
| H4 Cache-Control incl. no-cache (B wrong model) | Headers | "No-cache means store it, but check with me" | covered |
| H5 ETag/If-None-Match/304 | Headers | "ETag v forty-two" | covered |
| H6 Same-origin, Origin, Allow-Origin | Headers | "localhost port three thousand calls your API on localhost port eight thousand" | covered |
| H7 Preflight | Headers | "An automatic OPTIONS request" | covered |
| H8 Browser-enforced, not server security (B wrong model) | Headers | "CORS is not security for your server at all" | covered |
| K1 Handshake term, 10s of us / 20 ms / 150 ms, TLS | Keep-alive | "Across a country, about twenty milliseconds" | covered |
| K2 30 images, persistent connection term | Keep-alive | "thirty images paid for thirty handshakes" | covered |
| F3 Figure 003 | Keep-alive | "Picture two timelines" | covered |
| K3 Server must loop | Keep-alive | "With it, your server has to loop" | covered |
| K4 recv boundaries, pipelining term, leftover buffer (B wrong model) | Keep-alive | "It keeps a buffer of bytes it's read but hasn't used yet" | covered |
| PR2 Predict speedup 30-35 vs 90, 2.5-3x; Spark 5 ms ~2x; one client per app | Predict | "roughly two and a half to three times" | covered |
| W1 Server steps incl. 16 KB/431 | Server you'll write | "Sixteen kilobytes of headers is plenty" | covered |
| W2 Concurrency: threads, asyncio readuntil/readexactly | Server you'll write | "Read until... read exactly" | covered |
| A1 Two halves | Framework | "About half of it is HTTP" | covered |
| F4 Figure 004 stack | Framework | "Picture it as a stack of layers" | covered |
| A2 WSGI (2003), environ, start_response, gunicorn, sync, no WebSocket | Framework | "W S G I... from two thousand three" | covered (PEP numbers omitted) |
| A3 ASGI term, servers and frameworks | Framework | "Hypercorn, and Daphne" | covered |
| A4 scope/receive/send contents | Framework | "a flag called more body" | covered |
| A5 Taken away / given back, chunked auto, WebSocket, lifespan | Framework | "uvicorn just switches to chunked encoding for you" | covered |
| A6 uvicorn main:app (B wrong model) | Framework | "Uvicorn's the program" | covered |
| A7 Framework additions list | Framework | "Routing... Parsing... Validation..." | covered |
| A8 None of it is HTTP | Framework | "none of that is HTTP" | covered |
| E3 Swap servers/frameworks independently | Framework | "you can swap either side on its own" | covered |
| V1 HOL term, six connections, slow starts | HTTP/2/3 | "six of TCP's cautious slow starts" | covered |
| V2-V4 SPDY, frames (9-byte), streams, HPACK (61, Huffman) | HTTP/2/3 | "sixty-one common headers" | covered |
| V5 curl --http2, lowercase, TLS only, gRPC | HTTP/2/3 | "G R P C is built on top of it" | covered |
| V6 HOL moved to TCP (B wrong model) | HTTP/2/3 | "It moved it down a layer" | covered |
| V7 QUIC term, per-stream, 1 RTT, connection ID | HTTP/2/3 | "a phone switching from Wi-Fi to cellular" | covered |
| F5 Figure 005 | HTTP/2/3 | "Picture three rows" | covered |
| V8 In practice, alt-svc h3 443 86400, h2 library | HTTP/2/3 | "remember that for a day" | covered |
| BT0 Setup | Build It | "Apache Bench, which ships with macOS" | covered |
| BT1-BT3 t1 by hand, history, be the server, 4 bytes, printf+sleep | Build It | "Hi is two bytes... So that's four." | covered |
| BT4 t2 smallest server, reuse address, backlog 128 | Build It | "listen with a backlog of a hundred twenty-eight" | covered |
| BT5 t3 shape, limits, latin-1/UTF-8 | Build It | "Sixteen kilobytes... one megabyte for the body" | covered |
| BT6 t3 spec, every row | Build It | "A head that runs past sixteen kilobytes... four thirty-one" | covered |
| BT7 t3 hints | Build It | "split each header on its first colon only, using partition" | covered |
| BT8 t4 keep-alive rules and tests | Build It | "Re-using existing connection" | covered |
| BT9 t5 idle nc, 5.4 s vs 1.5 ms | Build It | "five point four seconds, instead of one and a half milliseconds" | covered |
| BT10 t5 threads, GIL | Build It | "a thread that's blocked in receive has let go of the GIL" | covered |
| BT11 t5 asyncio, 8081, buffer kept for you | Build It | "the stream reader keeps the leftover buffer for you" | covered |
| BT12 t6 curl, browser extra request, loadgen 2000/50, RFC review, duplicate CL | Build It | "Content-Length twice, with two different values" | covered |
| BT13 t7 bare ASGI, lifespan, chunked experiment | Build It | "Uvicorn picked chunked encoding for you" | covered |
| BT14 t8 FastAPI differences, /docs | Build It | "FastAPI answers four twenty-two for both" | covered |
| BT15 Done when | Build It | "You're done when a hand-typed request" | covered |
| ME1-ME3 Questions, seq.py 2,000, ab 8000/50 | Measure | "Eight thousand requests at fifty concurrent" | covered |
| ME4 Full number table | Measure | "about seventy-eight thousand with keep-alive" | covered |
| ME5 Caveat load avg 90, 5-10x swing | Measure | "the load average got near ninety" | covered |
| ME6 Reuse 2-3x | Measure | "Reuse is worth two to three times on localhost" | covered |
| ME7 Tens of us per layer, +40 us, LLM 1,000,000 us (B wrong model) | Measure | "about a million microseconds" | covered |
| ME8 ab -k 0 on uvicorn, h11, HTTP/1.0, httptools may differ | Measure | "doesn't support one point zero keep-alive" | covered |
| ME9 Python loadgen tops out, top, ab/wrk | Measure | "HTTPX at fifty connections was actually slower than at one" | covered |
| BK1 Ports: 16,000, Errno 49, TIME_WAIT term, 16,350, 30 s, 49152-65535, 16,384, ~550/s | Break It | "about five fifty, yeah" | covered |
| E5 Scale question (500 req/s, 30-60 s, Linux ~28,000, few dozen connections, HTTP/2) | Break It | "roughly twenty-eight thousand by default on Linux" | covered |
| BK2 Lie about length, 400 then lo"}GET, token fix, smuggling term | Break It | "That's request smuggling" | covered |
| BK3 Slowloris (2009), 200 conns, per-read timeout, whole-head deadline, 20,000 | Break It | "Every byte resets the clock" | covered |
| BK4 Wrong family, health 200 with error | Break It | "The status code is the API. The body's for humans." | covered |
| E1 Full build walk-through + "use uvicorn in real life" | Close | "I'd still use uvicorn for the HTTP half" | covered |
| E2 Body end + chunked use + never both | Two ways; Break It | "You can't tell done from died" | covered |
| E4 Safe/idempotent lists, idempotency key | Methods | "Idempotency-Key" | covered |
| E6 HTTP/2/3 same vs changed | HTTP/2/3 | "keeps every method, every header" | covered |
| G1 Go Deeper one sentence | Close | "the HTTP one point one RFC, number ninety-one twelve" | covered |
| G2 Connections | Close | "TLS wraps all of this in encryption" | covered |

No MISSING items. Compressed consciously: WSGI PEP numbers; exact asyncio exception names (described as
"one error if the client hangs up, a different one if no blank line within the limit"); Ubuntu package name.

Derived for the ear (not written in the lesson): figure 002's chunk sizes nine and fifteen (hex f), computed
from the figure's strings; "a hundred bytes is six four in hex"; 577 = two times 256 plus four times 16
plus one; idle-curl 5.4 s vs 1.5 ms called "three and a half thousand times slower" (ratio 3,600); the
truncated body "brace, quote, q... up to hel" is the lesson's 10 bytes.
