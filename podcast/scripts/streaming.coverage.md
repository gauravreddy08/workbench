# Coverage: streaming

Lesson src/lessons/streaming.mdx vs podcast/scripts/streaming.md. Item IDs match
podcast/outlines/streaming.md. "Fixed" = was MISSING, weak or wrong in the first draft and has been
added or corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs (async/event loop, baseline SSE helper and server, HTTP basics) | Road between; Build It; HTTP section | "quick reminder from the async episode"; "that little s s e events helper"; "So start with HTTP itself" | covered |
| P1 Spark server streams; a third of a second; TTFT defined | Problem | "Time to first token. How long from sending the request until the first piece" | covered |
| P2 nginx in front; eight seconds; blob; logs say on time | Problem | "Eight seconds later the whole answer appears at once" | covered |
| P3 2,000-token essay; tab closed; GPU full tilt 1.5 min; ten people | Problem | "keeps showing the GPU at full tilt for another minute and a half"; B: "The server knows I left, doesn't it?" | covered |
| P4 agent job, 70 s think, connection dies, no error | Problem | "Sometimes it thinks for seventy seconds between updates" | covered |
| P5 one cause: HTTP ask-answer-done, bent by streaming; road | Problem | "where on the road between the GPU and the browser something can bend it back" | covered |
| O1 early HTTP one request/response/close; server never first | Origin | "The server could never speak first" | covered |
| O2 faked push: ask repeatedly, or held request | Origin | "a request that the server deliberately didn't answer until it had news" | covered |
| O3 Alex Russell, Comet, 2006, Ajax pun, cleaning products | Origin | "Both cleaning products, yeah" | covered |
| O4 Hickson, SSE in WHATWG HTML work, mid-2000s; Opera 2006 | Origin | "Opera shipped an early version in two thousand six" | covered |
| O5 WebSockets, Hickson, IETF RFC 6455, 2011; upgrade from HTTP | Origin | "R F C sixty-four fifty-five in twenty eleven" | covered |
| O6 a decade later OpenAI picked the older one; everyone copied | Origin | "it picked the older, simpler one" | covered |
| I1 HTTP defined; counter analogy | HTTP | "It's like ordering at a counter" | covered |
| I2 TCP two-way pipe; HTTP's rules make server wait | HTTP | B: "So the pipe could already do push" | covered |
| I3 keep-alive defined; still one request, one response | HTTP | "That's called keep-alive, reusing one T C P connection" | covered |
| I4 push problem; four ways | HTTP | "There are four ways around that" | covered |
| F1 Figure 001 four sequence diagrams (5 / 6 / 1 request / 1 connection, stop, cancelled) | All four | "Five requests. The first one comes back with nothing, then one token, then three at once" | covered |
| S1 short polling defined | Short polling | "The client just asks 'anything new?' on a timer" | covered |
| S2 pros: easy, cacheable, through anything, survives restarts | Short polling | "it survives restarts on either side, because every request stands on its own" | covered |
| S3 average wait half the interval; 1 s poll -> 0.5 s avg, first up to 1 s | Short polling | "Which means on average it's half the interval" | covered |
| S4 each poll full request; users / interval; 1,000 at 250 ms = 4,000 rps | Short polling | "a thousand chat users polling every quarter of a second is four thousand requests per second" | covered |
| PR1 Predict poll cost: ~7 requests, 250 ms; at 50 ms ~60, 25 ms; one-for-one trade | Short polling | "Six polls, plus the request that started the job"; "Ten times less delay cost ten times more requests" | covered |
| L1 long polling defined; held; 30 s timeout | Long polling | "or until a timeout passes, say thirty seconds" | covered |
| L2 one round trip; one request per batch; web chat; Telegram getUpdates | Long polling | "Telegram's bot API, where you call get updates with a timeout" | covered |
| L3 bad fit for tokens; round trip to re-ask; headers per token; want endless response | Long polling | B: "a response that just... doesn't end" | covered |
| E1 Content-Length vs chunked; hex size; zero chunk ends | SSE | "Each piece starts with its own size, written in hexadecimal" | covered |
| E2 streaming response = ordinary response that takes its time; SSE adds content type + format | SSE | "It's an ordinary HTTP response that takes its time" | covered |
| F2 Figure 002 bytes: headers once, 1b = 27, id 0, data, blank line, CRLF; 1d "quick"; zero chunk | SSE | "It starts with 'one B', which is hexadecimal for twenty-seven" | covered |
| E3 two layers; chunks != events; proxy merges/splits; parse lines | SSE | B: "A chunk is a token." A: "the one that'll bite you" | covered |
| E4 field: value, one optional space stripped | SSE | "One space after the colon is optional and gets stripped" | covered |
| E5 data joined with newlines | SSE | "they get joined with newlines" | covered |
| E6 event name, default message | SSE | "If there's no name, it's called 'message'" | covered |
| E7 id remembered | SSE | "the client remembers the last one it saw" | covered |
| E8 retry ms | SSE | "how many milliseconds to wait before reconnecting" | covered |
| E9 colon comment; most important line teaser | SSE | "the most important line in production" | covered |
| E10 blank line ends event | SSE | "a blank line ends the event" | covered |
| E11 EventSource; retry or few-second default; Last-Event-ID resume; polling free | SSE | "sends a header called Last Event I D" | covered |
| E12 one-way, UTF-8, GET only, so SDKs POST and parse themselves | SSE | "They send a normal POST with a JSON body and an auth header" | covered |
| W1 WebSocket defined; GET + Connection/Upgrade; version 13; key | WebSockets | "'I'd like to stop speaking HTTP on this connection.'" | covered |
| W2 101 Switching Protocols; frames 2-14 byte header; full-duplex phone vs walkie-talkie | WebSockets | "Like a phone call, as opposed to a walkie-talkie" | covered |
| W3 key dance: append RFC string, SHA-1, base64, Accept; checked in Python and uvicorn | WebSockets | "hashes the whole thing with SHA one and base sixty-four encodes" | covered (fixed: B's planted question replaced with B's "is the key security?" model) |
| F3 Figure 003: FIN, RSV, opcode, mask, 7-bit length; 126/127; mask key client only; opcodes 1/2/8/9/A; 15 vs 33 bytes | WebSockets | "One is text, two is binary, eight is close, nine is ping, ten is pong"; "Fifteen bytes... thirty-three" | covered |
| W4 length up to 125; 126/127; 2 bytes framing vs SSE overhead | WebSockets | "Seven bits holds numbers up to a hundred twenty-five" | covered |
| W5 control frames: close with reason, ping/pong heartbeats | WebSockets | "Heartbeats are built right into the protocol" | covered |
| W6 masking: XOR random 4-byte key, not encryption, 2011 cache poisoning, cache defined, reject unmasked, server unmasked | WebSockets | B: "Encryption. Light encryption?" A: "No, and that's the strange part" | covered |
| W7 price: not HTTP after upgrade; hops must pass it; resume/errors/format yours | WebSockets | "To them a WebSocket is one 'request' that lasts an hour" | covered |
| F4 Figure 004 interactive: 300 ms prefill (defined), lanes, sliders, long poll, proxy buffering | All four | "Drag the poll interval and you watch the polling lane's average wait track half the interval" | covered |
| F4b three takeaways | All four | "Long polling is basically S S E with a full HTTP request bolted onto every token" | covered |
| C1-C6 comparison: who sends, latency, requests, plain HTTP, resume, binary | Which one, when | "Ask who needs to talk... Then ask how late is okay" | covered (fixed: was a row-by-row table read; rewritten as questions) |
| C7 good-for list | Which one, when | "short polling is for a dashboard that refreshes every thirty seconds" | covered |
| C8 rule of thumb | Which one, when | B: "if updates are rare and being a bit late is fine, just poll" | covered |
| A1 LLM call shape | Why SSE | "The client sends one big message" | covered |
| A2 still HTTP; same endpoint stream true/false; retries | Why SSE | "literally the same endpoint, with 'stream: true' or 'stream: false'" | covered |
| A3 stateless | Why SSE | "Servers stay stateless" | covered |
| A4 through proxies/CDNs/firewalls unless buffered | Why SSE | "As long as they don't buffer it" | covered |
| A5 curl -N | Why SSE | "Curl with the no-buffer flag and your own eyes are a complete S S E client" | covered |
| A6 OpenAI unnamed + [DONE]; Anthropic named events + ping | Why SSE | "Message start, content block delta, message stop" | covered |
| A7 Realtime API: WebSockets and WebRTC | Why SSE | "OpenAI's Realtime API, for example, uses WebSockets, and also Web R T C" | covered |
| F5 Figure 005 chain, failure per hop, fixes, worst hop | Road between | "A stream is only as streaming as its worst hop" | covered |
| R1 reverse proxy defined | Road between | "a server that sits in front of your app server" | covered |
| R2 buffering a feature; 2 MB JSON; slow phone; blob | Road between | "Your app writes a two-megabyte JSON response into Engine X" | covered |
| R3 proxy_buffering off; X-Accel-Buffering no, stripped; gzip | Road between | "X Accel Buffering, set to 'no'" | covered |
| R4 idle timeouts: nginx 60 s, ALB 60 s, Cloudflare ~100 s; between bytes | Road between | "Cloudflare gives your origin server about a hundred seconds" | covered |
| R5 heartbeat defined; ": ping" every ~15 s; Anthropic ping; FastAPI EventSourceResponse | Road between | "A line that starts with a colon, says 'ping', and then a blank line" | covered |
| R6 TCP keepalive 2 h on Linux | Road between | "it waits two hours before it sends the first probe" | covered |
| R7 FIN defined; only next hop; nginx closes upstream; uvicorn EOF | Road between | "that FIN only tells the next hop" | covered |
| R8 vanished network: no packet; failed write after minutes, or heartbeat | Road between | "like a laptop lid closes or the Wi-Fi drops" | covered |
| R9 server finding out is half; GPU the other half | Road between | "The other half is the GPU finding out" | covered |
| R10 95% wasted; batch slot and KV cache; vLLM aborts | Road between | "ninety-five percent of the GPU time, spent on nothing" | covered |
| R11 backpressure; send/receive buffers; flow control and window; await send; unbounded list danger; tiny for tokens | Road between | "That pause is backpressure" | covered |
| H1 HTTP/1.1 ~six connections per site; seventh tab hangs | HTTP/2 | "And the seventh one hangs" | covered |
| H2 HTTP/2 defined; numbered streams; chunked forbidden; SSE unchanged | HTTP/2 | "chunked encoding actually doesn't exist in HTTP two. It's forbidden" | covered |
| H3 gRPC defined; streaming kinds; internal; needs HTTP/2; not in browsers | HTTP/2 | "So the public edge of LLM APIs stays S S E" | covered |
| B0 setup; fake model 50 x 50 ms; token counter; CPU endpoint | Build It: Setup | "it counts every token it makes" | covered |
| B0b counting TCP relay | Build It: Setup | "a tiny T C P relay in front of the server" | covered |
| B1 polling job store, start/poll endpoints, client metrics, task reference, one client, optional long poll | Build It: Polling | "keep a reference to it somewhere"; "one HTTPX client for the whole run" | covered |
| B2 SSE endpoint; no-cache; curl -N -i; --raw | Build It: SSE | "if you add the raw flag, curl stops hiding the chunk framing" | covered |
| B3 spec parser rules; hand-written test; client stops at DONE | Build It: SSE | "strip one leading space from the value. One, not all" | covered (fixed: planted B question removed) |
| B4 EventSource reconnect; Last-Event-ID printed; reconnects after DONE; es.close | Build It: SSE | "a browser that follows the spec reconnects anyway" | covered |
| B5 WebSocket endpoint/client; compression off | Build It: WebSocket | "turn compression off in the client" | covered |
| B6 handshake by hand vs Python | Build It: WebSocket | "compare the accept value uvicorn sends back with what three lines of Python compute" | covered |
| B7 harness rows; polling at 3 intervals; CPU over 200 streams; warning logs; agent review | Build It: Harness | "divide the difference by two hundred" | covered |
| B8 nginx from folder; two locations; raw-read script; X-Accel second fix; write config yourself | Build It: nginx | "You run Engine X straight out of your project folder" | covered |
| PR2 Predict: 2.55 s, one read, 1,450 bytes; direct/fixed 0.07 s, 51 reads; fits buffers; bursts; header fix; proxy_http_version oddity | Build It: nginx | "First byte at two point five five seconds. One read." | covered |
| B9 async generator cancelled on disconnect; CancelledError at await; ~10 not 50 | Build It: Stop generating | "About ten. Not fifty." | covered |
| B10 threaded real case; tasks; StoppingCriteria; vLLM/SGLang abort | Build It: Stop generating | "a custom stopping criterion that returns true when the flag's set" | covered |
| PR3 Predict: all 60; finally doesn't run (FastAPI 0.143 / Starlette 1.8, 4 s); next() in worker thread; fix with async + to_thread + finally; 9 tokens; watcher alternative | Build It: Stop generating | B: "Finally always runs." A: "And the finally... doesn't run." | covered |
| B11 Spark fixes; nvidia-smi within a second; heartbeat while waiting for GPU lock; X-Accel; TTFT within ms; race review | Build It: Spark | "what happens if the client leaves while the request is still waiting for that GPU lock?" | covered |
| B12 Done-when list | (folded) | each item covered by B1-B11 | covered |
| M1 localhost, 50 x 50 ms, ideal 50 ms / 2.5 s, machine, shape | Measure | "Yours will be different. The shape shouldn't be." | covered |
| M2 all table numbers (TTFT, totals, requests, bytes, CPU, nginx) | Measure | "Requests: S S E and WebSocket, one each. Polling every second, four" | covered (fixed: rewritten from row-by-row reading; 250 ms and 1 s byte counts added) |
| M3 polling TTFT = interval; total stretches; half-interval per token | Measure | "polling's first token is basically just... the interval" | covered |
| M4 ~300 bytes text vs 16 KB; browser headers 500 B-2 KB | Measure | B: "Sixteen kilobytes to send three hundred bytes?" | covered |
| M5 33 vs 15 bytes; JSON dwarfs framing | Measure | "Thirty-three bytes per token for S S E, against fifteen for a frame" | covered |
| M6 CPU follows requests; ~3x; 1,000 users at 50 ms ~20,000 rps; is_disconnected; noise | Measure | "about twenty thousand requests a second" | covered |
| M7 buffering deletes, doesn't slow; same total | Measure | "Default buffering doesn't slow the stream down. It deletes it." | covered |
| K1 heartbeat break: 2 s timeout, 4 s sleep, curl 18, nginx log, app silent, ping fix | Break It | "Curl exits with error eighteen" | covered |
| K2 WebSocket through unaware proxy: 404; hop-by-hop defined; three lines; every hop | Break It | "Uvicorn answered with a four-oh-four" | covered |
| K3 client stops reading: 739, ~740 KB, await send stops; unbounded list break | Break It | "it climbed to seven hundred thirty-nine and froze" | covered |
| K4 polling leak; TTL | Break It | "Real job APIs add a time to live" | covered |
| X1 neither talks first; long answer vs phone line; tooling/Last-Event-ID vs two-way/binary/build-it-yourself | Ending; WebSockets; Which one | "Neither of them lets the server talk first"; "S S E got all of that from HTTP for free" | covered |
| X2 why SSE for LLM APIs incl. retries; switch only for realtime voice | Why SSE | "Retries work the way they always did" | covered |
| X3 debug recipe: direct curl, add hops, suspects incl. middleware/print/client lib, then timeouts | Road between | "Bisect the road" | covered |
| X4 10,000 streams: 40,000 rps; tens of KB each, few hundred MB; ulimit 1,024/256; worker_connections; LB timeouts; threads; ~3 MB/s; GPU is the limit | Measure: scale | "The open-file limit, which is often set to one thousand twenty-four by default, or even two hundred fifty-six" | covered |
| X5 tab closed hop by hop; CancelledError; must reach generation loop; sync-generator bug; no FIN -> heartbeats matter for cancellation | Road between; Build It | "They help you notice a dead client, not just keep a live one alive" | covered |
| G1 WHATWG SSE spec; Grigorik HPBN | Connections and close | "Ilya Grigorik's High Performance Browser Networking" | covered |
| N1 connections: waiters; baseline TTFT first non-empty event, events not tokens, lines not chunks; load balancing; rate limits | Connections and close | "A stream pins a user to one backend for minutes" | covered |

Number check: every number in the script was checked against the lesson. Derived, not written in the
lesson: "about fifty times the payload" (16 KB of polling traffic for about 300 bytes of text), "twenty
nine"-style chunk sizes are not spoken (only "one B = twenty-seven"), "ten is pong" (opcode A in hex).
