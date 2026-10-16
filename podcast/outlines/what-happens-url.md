# Outline: what-happens-url

Source: src/lessons/what-happens-url.mdx. Curriculum entry: "What happens when you hit enter?"
Question: step by step, what happens between typing a URL and seeing the page? Why: a classic
interview question and a map of the whole stack (DNS, TCP, TLS, HTTP, rendering). Build: fetch a
page by hand with raw sockets, timing each phase.

Diagnostic gaps touched: Numbers (latency feel, round trips, bytes). Every RTT gets a comparison.
Also his own diagnostic answer to this exact question is quoted in the lesson: B voices it.

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereqs: packets-and-ip (IP addresses, routes), tcp-vs-udp; stands on its own. -> Not said as a list. TCP and UDP each get a one-line re-explanation where they come up (TCP = reliable ordered byte stream with a handshake; UDP = one packet out, one back, no setup). Latency-numbers callback: CPU does millions of things per cross-country round trip.

## The Problem

- P1 His diagnostic answer: "goes towards a DNS server I guess... IP address points to backend server... pages fetched in parts (code, assets) and rendered." -> B says it as their gut answer to A's opening question.
- P2 Good skeleton, every bone in place; missing what's between the bones, where interview points and real bugs live. -> A, warmly.
- P3 TinyFish scene: agent loads a page in 1.4 s, own browser 300 ms; where did 1.1 s go? DNS? far handshake? server thinking? twenty images one after another? lost packet and 1 s retry? different fix each; need to split a load into phases. -> A opens with this scene (first line of the episode).
- P4 Plan: fill every gap, then time each phase on his machine. -> A, one line signpost.

## Origin

- O1 1970s ARPANET, a few hundred machines; name-to-address mapping in one file HOSTS.TXT, maintained by hand at Stanford Research Institute; email SRI to get a name; every site downloaded the whole file. -> A tells as story.
- O2 Broke: file big, downloads became heavy traffic, names collided, one office a bottleneck. -> A.
- O3 1983 Paul Mockapetris, DNS design, RFCs 882 and 883, refined 1987 as RFCs 1034 and 1035. Two ideas: tree where each owner runs their own branch; everyone caches answers for a stated time. -> A; B paraphrases the two ideas.
- O4 HOSTS.TXT survives as /etc/hosts on the Mac, checked before DNS. -> A, "the ghost of it".

## The Idea: the whole trip (Figure 001)

- F1 Fourteen stops in three rows. Find and connect: parse URL (microseconds), cache and HSTS (microseconds to ms), DNS (zero to a hundred-plus ms), TCP connect (1 RTT), TLS (1 RTT in TLS 1.3). Ask and answer: HTTP request (half RTT out), CDN edge (hit about 1 ms; miss forwards), load balancer (tenth of ms to 1 ms), app server (1-500 ms), database (tenth of ms to 100 ms). Draw: response streams (half RTT back plus size), parse HTML (as bytes arrive), subresources (CSS, JS, images, fonts), render (ms per frame). Network steps repeat per new host. Costs typical, not guarantees. -> A describes the three rows like a diagram over the phone, numbers said as words.
- I1 Term round trip (RTT): message there and reply back; Seattle-Virginia about 70 ms, within one city a few ms. Round trips are the currency of web performance; slow because of how many times it waits, not computing. -> A; B asks for "round trip" meaning? No, A defines inline. B voices "it's slow because the server's computing" wrong model? Use: B guesses compute/bandwidth, A corrects.
- I2 Latency-numbers callback: CPU does millions of things in one cross-country round trip. -> A.

## 01 Parsing the URL

- U1 Address bar decides address vs search ("cat pictures" -> search). Assumes https if left off. -> A.
- U2 Term URL; parts: scheme (https = HTTP inside TLS), host (DNS turns into IP), port (443 default https, 80 http), path (sent), query (sent), fragment (never sent to server; browser scrolls). -> A walks the example URL in words, not as a table; B surprised by fragment.
- U3 Term port: 16-bit number picking which program; 443 HTTPS, 22 SSH, 53 DNS. -> A.
- U4 Punycode: non-ASCII names (münchen.de -> xn--mnchen-3ya.de) converted before DNS because DNS built for ASCII. -> A, describe the shape ("x n dash dash, then a scrambled ASCII version"), don't read it.

## 02 Caches and HSTS

- C1 Fastest request is the one you don't make. -> A.
- C2 Term HTTP cache: Cache-Control max-age 3600 reused for an hour with zero network; older entries checked with "has this changed?", server answers 304 Not Modified with no body. -> A.
- C3 Term service worker: script the site registers, sits between page and network, can answer requests itself (offline apps). -> A.
- C4 HSTS: typed http -> naive browser goes port 80 plaintext, gets redirect, starts over; that first hop is a hole (café Wi-Fi can answer). Term HSTS: header says only HTTPS for next N seconds; browser rewrites itself before any packet; DevTools shows fake "307 Internal Redirect". -> A; B asks why that's a hole.
- C5 Term HSTS preload list: compiled into Chrome, HTTPS-only from first visit. -> A.
- C6 Wikipedia's header max-age 106,384,710 s, includeSubDomains, preload: about three years. -> A, "about a hundred and six million seconds, about three years".

## 03 DNS

- D1 Terms IP address (IPv4 32 bits, IPv6 128 bits) and DNS (worldwide distributed database, names to records, the phone book). Diagnostic "goes towards a DNS server": a whole chain, and the answer usually comes from a cache first. -> A, callback to B's opening line.
- D2 Browser cache: Chrome keeps names about a minute; zero cost; chrome net-internals page. -> A.
- D3 Term stub resolver: OS DNS client via getaddrinfo; doesn't look things up itself; checks /etc/hosts and its cache then forwards. macOS: mDNSResponder, cache shared by every program; warm hit well under a ms plus cost of asking the service, about 1-3 ms measured from Python. -> A.
- D4 Term recursive resolver: on miss, stub sends one small UDP packet to the network's DNS server (often the router, which forwards to ISP or public 8.8.8.8 / 1.1.1.1); does the legwork, walks the tree, caches for everyone; shared by thousands or millions so popular names almost always cached; hit costs one round trip, 5-30 ms. scutil --dns shows yours. -> A; B's wrong model "my laptop asks the DNS server for wikipedia" voiced earlier, corrected here.
- D5 Tree walk only on the resolver's miss. -> A.
- F2 Figure 002: laptop (browser cache, /etc/hosts, OS stub and cache) -> recursive resolver (shared, big cache) -> 1 root ("ask the .org servers") -> 2 .org TLD ("ask ns0.wikimedia.org") -> 3 authoritative (CNAME dyna.wikimedia.org, A record, TTL 180). Each arrow one UDP question and answer, about 5-80 ms. Everything cached for TTL; next .org lookup skips root; next wikipedia.org lookup skips TLD too. -> A describes over the phone.
- D6 Term root server: knows only who runs each TLD; 13 names a to m root-servers.net, each served by hundreds of machines; resolver ships with addresses built in. -> A.
- D7 Term TLD: last label (com, org, io, uk), run by a registry; .org servers know nameservers for every .org domain. -> A.
- D8 Term authoritative nameserver: real records set by owner, run by Wikimedia or Cloudflare, Route 53; source of truth, everything else a cache. -> A.
- D9 Hierarchy idea from 1983: nobody holds the whole phone book. Watch it live with dig +trace. -> A; B restates.
- D10 Term resource records: name, type, TTL, value. Types: A (IPv4; example.com A 104.20.23.154), AAAA (IPv6), CNAME (alias; www.wikipedia.org CNAME dyna.wikimedia.org), NS (authoritative servers for a zone; example.com NS elliott.ns.cloudflare.com). -> A, no table; type names spelled for the ear ("quad A"). Skip reading IPs digit by digit except one.
- D11 Term CNAME: how sites hand traffic to a CDN/cloud: www.yoursite CNAME yoursite.cdn-provider; provider controls the target; each hop can need its own lookup. -> A.
- D12 Several A records (example.com returned two); browser picks one, falls back. IPv6 and IPv4 race: IPv6 first, IPv4 a few hundredths of a second later, keep the first to connect. Term Happy Eyeballs (RFC 8305). -> A; B reacts to the name.
- D13 Term TTL: seconds a cache may keep the answer, set by the owner; TTL 300 = five minutes; every cache counts down and re-asks at zero. -> A.
- D14 Scaling story: authoritative sees roughly one query per recursive resolver per TTL, not per page view; Google's resolver serves millions asking for wikipedia.org but asks Wikimedia once every few minutes. -> A; B asks "billions of queries, how doesn't it melt".
- D15 Trade-off: long TTL fewer queries, faster; short TTL change your mind fast (move servers, fail over). "Propagation" = old answers sitting in caches until TTLs run out. .com NS TTL 172,800 s = two days; dyna.wikimedia.org 180 s, short enough to steer users from a data center within minutes. -> A; B voices "propagation = changes spreading out" model, A corrects.
- D16 Term anycast: many machines announce the same IP; routers deliver to the closest in network terms. 13 root names served by well over a thousand machines; 8.8.8.8 and 1.1.1.1 the same, a few ms from almost anywhere. Comes back at the CDN stop. -> B asks how "the" root answers fast in Seattle and Singapore.
- D17 DNS over UDP: one packet out, one back, no setup, so a lookup can be one round trip; too big -> truncated flag, client retries over TCP. -> A, with a one-line UDP re-explanation.
- PR1 Predict: first ever visit to blog.example.io, nobody on the ISP resolver has visited any .io in two days. How many DNS questions cross the network; then shop.example.io a minute later? Answer: four (stub to resolver, root, .io TLD, authoritative), plus four answers, more if CNAME. Next: two (stub to resolver, resolver straight to example.io's authoritative, because .io and example.io NS records are cached). blog.example.io again within TTL: zero or one. -> A asks, B guesses (gets first right-ish, guesses one for the second), A reveals with reasoning.
- D18 A DNS question is about 30 bytes you can write yourself; Task 1. -> A.
- F3 Figure 003: query for example.com is 29 bytes: 12-byte header (ID 2 random bytes, flags 0x0100 with "recursion desired" bit set, question count 1, answer/authority/additional counts 0) plus 17-byte question: length-prefixed labels (7 example 3 com 0), no dots on the wire, then type (1 = A) and class (1 = IN). Each answer record: name (2-byte pointer c0 0c), type, class, TTL (4 bytes seconds), data length, data (4 bytes = IPv4). -> A describes in words; arithmetic 12 + 17 = 29 said; spell "seven, then the seven letters".
- D19 Term name compression: repeated name replaced by 2-byte pointer; top two bits 11 = pointer not length; remaining 14 bits = offset 12, where the question name starts after the header. -> A; B asks why 12.
- D20 Hand-built query 29 bytes, answer with two A records of 16 bytes each was 61. Whole wire cost: two small packets. -> A.

## 04 TCP handshake

- K1 Reliable byte stream (TCP, re-explained in one line). Term handshake. SYN ("I'd like to connect, my numbering starts at X") to port 443, SYN-ACK ("got yours, mine starts at Y"), ACK ("got yours"). Term SYN. -> A.
- K2 Costs exactly 1 RTT before you can send (third message can carry data). Seattle to Virginia about 70 ms; Cloudflare in your city about 5 ms. That difference times every round trip = why CDNs exist. -> A; B wrong model: "three messages so one and a half round trips?" A corrects: third carries data.
- K3 Lost SYN or SYN-ACK: retransmission timer starts at 1 second (RFC 6298). A connect to github.com took 1,013 ms once while others took about 30 ms; one lost packet. Tail latency: rare loss turns 30 ms into 1,000. -> A; ties back to the 1.4 s opening.

## 05 TLS

- S1 Term TLS: on top of TCP, encrypts bytes and proves the server is who it claims, via a certificate. Term certificate: server's public key and name, signed by an authority your OS/browser already trusts. Details are the next lesson. -> A.
- S2 TLS 1.3 = 1 RTT: ClientHello includes your half of the key exchange, guessing the server's method; server answers with its half, certificate, finished in one go. TLS 1.2 needed 2. Every site tested speaks 1.3. -> A.
- S3 Term SNI: hostname sent in the clear in the first message so one IP (one CDN server) hosts thousands of sites and picks the right certificate; how one Cloudflare IP serves millions. -> A; B: "in the clear? so the network sees the site name?" A: yes the name.
- S4 Term ALPN: client lists HTTP versions, server picks (h2, http/1.1), no extra round trip. -> A.
- F4 Figure 004: time downward, two vertical lines (you, server), diagonals = half RTT each. DNS first. SYN, SYN-ACK (TCP 1 RTT). ACK + ClientHello (SNI, ALPN, key share), ServerHello + cert + finished (TLS 1 RTT). Finished + GET, server thinks, 200 + first bytes (TTFB = 1 RTT + server). Rest of the body. At 80 ms RTT: 240 ms pure travel before server thinking, plus DNS. -> A describes; B does the 3 x 80 arithmetic.
- S5 Term QUIC / HTTP/3: on UDP, merges transport and TLS handshakes into one round trip; independent streams. alt-svc h3 header from example.com advertises it; browsers switch on later visits. -> A, short aside.

## 06 HTTP request

- H1 HTTP text protocol, HTTP/1.1 request short enough to type (Task 2): request line GET /wiki/Cat HTTP/1.1, Host, User-Agent, Accept text/html, Accept-Encoding gzip br, Cookie; empty line ends headers. -> A describes what's in it, not read verbatim.
- H2 Term method: GET read, POST create/submit, PUT, PATCH, DELETE; GETs shouldn't change anything. Path plus query; fragment not here. -> A.
- H3 Term headers; Host required because one IP serves many sites; Accept-Encoding "you may compress". -> A.
- H4 Term cookie: HTTP has no memory; server sends Set-Cookie session=abc123; browser attaches it to every later request; that's what "logged in" is. -> B asks how a site remembers login if no memory; A explains.
- H5 Browsers mostly speak HTTP/2 to most sites: compact binary frames, same meaning. Response same shape: status line 200 OK, Content-Type text/html utf-8, Content-Length 123,734, Cache-Control s-maxage 86400 max-age 3600, Set-Cookie, empty line, body (HTML). -> A, in words.
- H6 Term status code: 2xx success, 3xx elsewhere (redirect, 304 use cached), 4xx you asked wrong (404, 401 not logged in, 429 too many), 5xx server failed. -> A, "two hundreds, three hundreds".
- H7 Term TTFB: request sent to first byte; one RTT plus server thinking; tells you whether the server is the slow part. -> A.

## 07-10 Who answers

- W1 Diagnostic "IP points to an actual backend server": for a big site almost never directly; first in a line of machines. -> A, callback to B's opening answer.
- W2 Term CDN (Cloudflare, Akamai, Fastly, CloudFront; servers in hundreds of cities; sites point DNS at it). Term edge: terminates your TCP and TLS locally, keeps a cache; shares addresses via anycast. Handshakes with the edge a few ms away. Hit answers there. example.com: server cloudflare, cf-cache-status HIT, CF-RAY ending SEA (served from Seattle). -> A.
- W3 Miss or per-user page (inbox) -> forward to origin (Term origin), usually over an already-open connection, so no handshakes across the ocean. -> A; B asks "so per-user pages don't benefit at all?" A: they still get the near handshakes.
- W4 Term load balancer: picks one of many app servers, skips unhealthy; Load balancing lesson: why more than one, how it picks, state problem. -> A, brief.
- W5 App server and database: Python/Go/Java renders; may check a cache, query a DB, call five internal services, assemble HTML; the "server thinks" box; 1 ms cached static file to hundreds of ms for heavy dynamic page; the Scale track is about making that box small under a million users. -> A.

## 11-13 Response streams, page asks for more

- R1 Response arrives as a stream of TCP packets; browser parses HTML as first bytes land; servers send the head early. -> A.
- R2 Term slow start: new connection doesn't know capacity; about 10 packets (roughly 14 KB) in flight before waiting for ack, doubling every round trip (RFC 6928). A 60 KB page on a fresh connection takes about three round trips (14, 28, rest) even on a fast link; warmed-up connection one. -> B wrong model: "download time is just size over bandwidth"; A corrects with the 14/28/rest walk.
- R3 HTML names more things: stylesheets, scripts, images, fonts from CSS; each a new request. Term preload scanner: lightweight second parser racing ahead to find URLs. "One page" is often 50-150 requests. -> A.
- R4 Term keep-alive / connection reuse: same host shares a connection already through handshakes and slow start; different host (CDN domain, font service, analytics) needs its own DNS, TCP, TLS; network steps repeat per new host; "reduce the number of origins"; preconnect hint starts handshakes early. -> A.
- R5 HTTP/1.1 one request in flight per connection; big response blocks the rest. Term head-of-line blocking. Browsers open up to 6 connections per host, each paying handshakes. HTTP/2 Term multiplexing: one connection, many requests as small labeled interleaved frames; one handshake, one slow start. Over TCP one lost packet still stalls every stream (strict order); fixing that is why QUIC exists. -> A; B asks "why not just open more connections?" A: that's what browsers did, each pays.

## 14 Rendering

- G1 "And then rendered" is right; short version. -> A, callback.
- F5 Figure 005: HTML -> DOM; CSS -> CSSOM; together -> render tree -> layout (where) -> paint (pixels) -> composite (GPU stacks layers). JS can pause the parser and edit both trees, sending pipeline back. -> A describes.
- G2 Terms DOM (tree of elements; JS reads and edits) and CSSOM (parsed style rules matched to elements). -> A.
- G3 Plain script tag stops the parser until downloaded and run (script might change the document); that's why async and defer exist. CSS doesn't stop parsing but browser won't paint without it (avoid flash of unstyled content). CSS and early scripts are render-blocking, on the path to first paint. -> A; B asks why CSS blocks paint.
- G4 Terms layout (position and size of every box; reflow), paint (fill pixels into layers), compositing (stack layers, often GPU; scrolling and some animations done here alone, smooth). -> A.
- G5 Each is milliseconds, not round trips; network dominates first load; afterwards rendering is the bottleneck (janky scroll = layout or paint over one 16 ms frame). Different lesson. -> A.

## Waterfall

- WF1 DevTools draws each request as a horizontal bar with colored segments, one row per request: a waterfall. Toy: HTML plus four files. -> A.
- PR2 Predict: everything cold, 80 ms RTT to origin, about 640 ms to fully loaded; which toggle saves most: warm DNS, reused connection, CDN nearby; how many ms each? Answer: warm DNS saves the 60 ms DNS step, about 10%. Reused connection saves DNS, TCP, TLS (60 + 80 + 80) and slow-start rounds on HTML, about half. CDN saves the most alone, about 54%: every RTT shrinks 80 -> 10, handshakes and subresources. But HTML's waiting bar barely shrinks: dynamic page, edge goes to origin and waits for app. CDN makes round trips cheap, doesn't make server think faster unless cacheable. -> A asks, B guesses reused connection (plausible wrong), A reveals.
- F6 Figure 006 interactive: toggles warm DNS, reused connection, CDN nearby; slider RTT to origin 10-250 ms. Rows: page.html, style.css, app.js, font.woff2, hero.jpg. DNS and connection setup on first row only; four subresources share the HTTP/2 connection, each one RTT plus server time. HTML first download three slow-start rounds on cold. Time axis fixed to the cold case. Toy numbers: 60 ms cold DNS, 50 ms for app to build HTML, 10 ms edge RTT. Readouts first paint, all loaded, vs cold. -> A describes as you'd see it.
- WF2 Things to try: all three on, drag RTT to 250 (another continent): cold explodes, warmed barely moves except HTML wait; CDN hides distance. Turn off CDN at 250: three round trips to HTML first byte, plus one per wave of subresources. Font always last: discovered only after CSS arrives and parses. HTML -> CSS -> font chain in round trips is the shape of most slow pages. -> A walks it.

## Build It

- B0 Task 0: folder, no packages, standard library. Python 3.12 removed ssl.wrap_socket; use a default context's wrap_socket with server_hostname. Baseline: ping (tiny packet, times the echo = one RTT, no handshake) to example.com and to dyna.wikimedia.org; dig short for IPs; scutil dns for which server the Mac asks. Results: example.com (Cloudflare) 4.5 ms, Wikimedia 30 ms. Every later number should be a multiple of these. -> A, setup one sentence, baseline numbers emphasized.
- B1 Task 1 dnsq.py: build the 29-byte packet, send to 8.8.8.8 port 53 over UDP, parse. Functions: build query (id + packet; header flags 0x0100, qdcount 1; labels, zero byte, type and class), read name (decode with compression; after following a pointer the returned offset is just past the pointer, not the target), parse response (check id matches, skip question, return name/type/TTL/value: dotted IP for A, name for CNAME, hex otherwise), resolve (UDP, timeout 2 s, return ms and answers). Run on example.com, www.wikipedia.org, www.github.com. -> A: what you build, part that matters (the pointer offset gotcha).
- B2 Hints: struct pack with six unsigned 16-bit big-endian numbers, network byte order; answer fixed part type, class, 32-bit TTL, length. inet_ntoa turns 4 bytes into dotted IP; AAAA type 28 via inet_ntop. Packet length must be 29. Response flags 0x8180 = response, recursion desired, recursion available, no error. www.wikipedia.org returns CNAME then A for the target (resolver followed the alias). -> A, in words ("eight one eight zero").
- B3 Stretch: be your own recursive resolver: flags zero (no recursion), ask a root server (a.root-servers.net) for en.wikipedia.org; zero answers, NS records in authority section, IPs in additional section; ask one of those, repeat until an A record; Figure 002 in about 40 more lines. -> A.
- B4 Task 2 phases.py: fetch returns per-phase ms: dns (getaddrinfo, first IP), connect (create_connection to 443), tls (default context wrap_socket with server_hostname; handshake inside; print TLS version), send raw HTTP/1.1 GET with request line, Host, blank line, Connection close; TTFB = time until first receive returns bytes; download = receive until empty (server closed). Run three times. -> A.
- B5 Hints: lines end carriage return + newline, headers end with an empty line; get it wrong and the server waits forever. Encode, sendall. Split headers from body on the blank line. Run 3 times: first may miss cache, 2 and 3 hit OS cache. Try www.wikipedia.org (bigger, farther) and a never-visited site. Headers that tell who answered: server, cf-cache-status, x-cache, age, cf-ray. -> A; B: "what happens if I just use newline?" A: server waits forever.
- B6 Task 3 curl write-out timers are cumulative from start, subtract. Wikipedia: dns 2.5 ms, connect 26.8, tls 56.1, ttfb 88.2, total 151.6 -> TCP 24, TLS 29, waiting 32, download 63. curl negotiated HTTP/2 via ALPN; script speaks 1.1. Script's TTFB will be about 40 ms worse than curl's: Break It 1. Agent may explain, he writes changes. -> A; B does a subtraction.
- B7 Task 4 dig +trace walks the tree itself, Figure 002. Point the first step at 1.1.1.1 because on many home networks plain trace asks the router for root list and gets an empty 28-byte reply; nodnssec hides signature records. Four blocks for example.com: root list from 1.1.1.1 (4 ms); com NS from b.root-servers (69 ms, TTL 172,800); example.com NS (Cloudflare's) from a.gtld-servers (5 ms); example.com 300 IN A from elliott.ns.cloudflare (7 ms). Note fast (anycast, nearby) vs slow hops. Then plain dig twice: Query time and TTL counted down on the second (resolver's cached copy). -> A.
- B8 Task 5 DevTools: Network tab, disable cache, load en.wikipedia.org/wiki/Cat. (1) Timing tab of the document request: Queueing, Stalled, DNS Lookup, Initial connection, SSL, Request sent, Waiting (TTFB), Content Download; colors vary by version, check the legend. (2) Later requests have no DNS/connection/SSL: reuse. (3) enable Protocol and Connection ID columns: h2 (maybe h3), many share one ID: multiplexing. (4) Request to upload.wikimedia.org pays its own DNS, connect, SSL: per-host cost. (5) Reload without disable cache: memory cache / disk cache rows: step 02. (6) Throttling Fast/Slow 4G stretches it; dependency chains grow. Write down document request phases, explain out loud. -> A, as a walk-through, not a numbered list.
- B9 Done when: dnsq builds 29 bytes, gets answers, follows CNAME; phases prints all phases for two sites and TLS version; connect close to ping and you can say why; curl, dig trace, DevTools line up or you can say why not. -> Folded into A's Build talk ("you're done when..."), briefly.

## Measure

- M1 Fill in table, three runs, median; predict before from ping alone: connect about 1 RTT, TLS about 1 RTT plus a bit of crypto, TTFB about 1 RTT plus server time. -> A.
- M2 Reference runs (M-series Mac, Python 3.14, home Wi-Fi): example.com (932 bytes, Cloudflare): ping 4.5, DNS 29 cold / 3 warm, connect 5, TLS 16-25, TTFB 57-64, download about 0, curl 7/17/31 cumulative. Wikipedia (124 KB): ping 30, DNS 20 / 2-3, connect 24-31, TLS 29-38, TTFB 54-68, download 56-76, curl 27/56/88. Hand-built UDP query to 8.8.8.8 21-30 ms; cold lookup of a nonexistent random subdomain of example.org 46 ms. Relationships hold even if numbers differ. -> A says the numbers as part of reading the relationships, not row by row.
- M3 Connect ≈ ping (5 vs 4.5; 24-31 vs 30); handshake is one RTT; far above ping -> lost SYN (near 1,000) or busy Wi-Fi. -> A.
- M4 TLS ≈ one RTT plus about 10 ms; for example.com 16-25 vs 4.5 RTT: fixed costs (key exchange math, verifying certificate chain); interpretation, check by timing against localhost. -> A, flags it as interpretation.
- M5 Warm DNS 1-3 ms (OS cache), cold tens of ms; getaddrinfo cold and hand-built UDP similar. -> A.
- M6 TTFB suspicious: example.com should be about 5 ms plus a few for a cache hit; curl 31 minus 17 = 14; script says about 60; something adds about 40 ms every time. -> B notices; A: hold that.
- M7 Download: 932 bytes one packet, about zero; 124 KB about 60 ms, about two RTTs (textbook 14 KB window says three; servers often start larger, window can grow during handshake; check with a bigger page). On a fast link, fresh download time set by round trips, not bandwidth. -> A, ties to R2.
- M8 Add it up: Wikipedia from Python about 20 + 27 + 33 + 30 (with the fix) + 60 = about 170 ms, only a few ms server thinking. -> A, said as a running sum; B reacts.

## Break It

- K-1 Nagle meets delayed ACK: set TCP_NODELAY after creating socket, before TLS. TTFB example.com 57-65 -> 12-28 (mostly about 15); Wikipedia 46-65 -> 23-30. Term Nagle's algorithm (1984: hold small data while an earlier small packet is unacked). Client's TLS Finished was small; GET right behind it held. Term delayed ACK (receiver waits often about 40 ms to piggyback). Each waits on the other until the timer fires, about 40 ms. curl, browsers set TCP_NODELAY. Lesson: suspiciously round latency that doesn't scale with distance -> look for a timer. -> A; B voices "it's the server being slow" guess first.
- K-2 Point DNS at nothing: 10.255.255.1, 2 s timeout, wait full 2 s; UDP no "connection refused", only silence. Then /etc/hosts 127.0.0.1 example.com (sudo, remove after): getaddrinfo returns own machine instantly, connect fails; hand-built query to 8.8.8.8 still real IP. Difference between asking OS (hosts first) and DNS directly; stale hosts entry breaks one tool and not another. -> A; B "what if" framing.
- K-3 Skip SNI: wrap without server_hostname, default context refuses (can't verify without a name). Wrong name: Wikipedia's IP with example.com -> certificate verify error, hostname mismatch; server presented Wikimedia cert, client refused. Reverse (Cloudflare IP, name it doesn't host) -> handshake failure alert, edge has no cert for that SNI. Every production name-mismatch error (wrong DNS, CDN misconfigured, corporate proxy) is this. -> A.
- K-4 Pay for every handshake: 10 fetches new connection each vs one reused (drop Connection close, read each response fully via Content-Length or chunked terminator). New-connection version about 2 RTTs more per request, about 60 ms times 10. Keep-alive; connection pools in requests Session and httpx Client matter for TinyFish fetch-heavy work. -> A; B connects to TinyFish.

## Explain It Back (substance must appear)

- E1 Full walk-through: parse URL, cache/service worker/HSTS, DNS chain with TTL caching, TCP 1 RTT, TLS 1.3 1 RTT verifying cert and picking HTTP/2 via ALPN, GET with headers and cookies, CDN edge cache or forward to origin LB, app server, caches, DBs; response streams, parse as it arrives, discover CSS/JS/images/fonts, same connection (multiplexed) or new ones for other hosts, DOM and CSSOM, scripts, layout, paint, composite. -> Covered across the episode; B's closing restatement gives the compressed version, A sharpens.
- E2 DNS scaling: caching at every layer by TTL, shared resolvers; authoritative sees one query per resolver per TTL; hierarchy, long TTLs on TLD records (days), resolvers rarely ask root; anycast spreads load and distance; cost = changes take up to a TTL. -> D14-D16 plus a summarizing A turn.
- E3 Seattle 300 ms vs India 2 s from Virginia: count round trips; Seattle-Virginia about 70 ms, India-Virginia about 200-250; cold load DNS + TCP + TLS + HTML request + slow start + wave for CSS/JS + wave for fonts/late images + extra handshakes per host: 6-8 round trips, about half a second from Seattle, 1.5-2 s from India, even at 50 ms server. Fix: CDN for handshakes and static, cache HTML at edge if possible, fewer origins or preconnect, HTTP/2 or 3, preload late discoveries (fonts, hero image). Faster server only helps the server slice. -> Its own exchange after the waterfall; B asks it as a real scenario from work (not a quiz).
- E4 CDN speeds up round trips (handshakes to an edge a few ms away, slow start on short RTT), serves cacheable responses with no origin trip, absorbs load and attacks; doesn't speed origin thinking; personalized page TTFB about edge RTT + edge-to-origin RTT + server time, though the edge's open connection saves handshakes. -> W2/W3 plus PR2 reveal; "absorbs load and attacks" said there.
- E5 HTTP/2 vs 1.1 vs 3: one outstanding request per connection, 6 connections each with handshakes and slow start; HTTP/2 multiplexing, one set of handshakes, one warmed window, no app-level HOL; TCP HOL left; HTTP/3 over QUIC on UDP, streams ordered independently, a loss only stalls its stream, combined handshake. -> R5 plus S5.

## Go Deeper / Connections

- G-1 Best sources: Alex Gaynor's "What happens when" on GitHub (exhaustive, down to keyboard and ARP); Ilya Grigorik's High Performance Browser Networking (free online). -> One closing sentence.
- G-2 Connections: TLS lesson opens the TLS box; HTTP from scratch writes the server side; tail latency (1 s SYN retry); latency-numbers: a page load is a few ms of computing wrapped in a few hundred ms of waiting. -> One sentence, near end.

## Flow plan

1. Cold open: TinyFish 1.4 s vs 300 ms scene (P3), A asks B how they'd answer the interview version; B gives the diagnostic answer (P1); A: good skeleton (P2, P4).
2. Origin story HOSTS.TXT -> DNS (O1-O4).
3. The map: three rows, round trips as currency, B's "it's computing" wrong model corrected (F1, I1, I2).
4. URL parsing, caches, HSTS (U, C).
5. DNS long section: chain, tree, records, CNAME, Happy Eyeballs, TTL scaling and propagation, anycast, UDP, Predict, bytes on the wire (D, F2, F3, PR1).
6. TCP handshake, 1 s SYN timer tied back to the opening (K).
7. TLS, SNI, ALPN, round-trip count figure, QUIC aside (S, F4).
8. HTTP request/response, cookies, status codes, TTFB (H).
9. Who answers: CDN edge, origin, LB, app, DB (W).
10. Streaming, slow start, preload scanner, keep-alive, HTTP/1.1 vs 2 (R).
11. Rendering pipeline (G, F5).
12. Waterfall predict + interactive figure + India question (PR2, F6, WF2, E3).
13. Build: baseline ping, DNS from bytes, phases.py, curl, dig trace, DevTools (B0-B9).
14. Measure: relationships, the suspicious 40 ms (M).
15. Break It: Nagle first (pays off M6), then DNS to nothing, SNI, handshake cost (K-1 to K-4).
16. Sources + connections in one or two sentences; B restates core idea; A sharpens; stop.
