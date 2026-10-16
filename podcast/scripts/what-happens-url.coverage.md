# Coverage: what-happens-url

Lesson src/lessons/what-happens-url.mdx vs podcast/scripts/what-happens-url.md. Item IDs match
podcast/outlines/what-happens-url.md. "Fixed" = missing or wrong in the first draft, corrected.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs; TCP/UDP re-explained | Anycast and UDP; TCP | "T C P is the careful transport... U D P is the bare one" | covered |
| P1 diagnostic answer | Problem | B: "It goes to a D N S server, I guess... and then it gets rendered" | covered |
| P2 good skeleton, gaps hold bugs | Problem | "every bone's in the right place... where the real bugs live" | covered |
| P3 TinyFish 1.4 s vs 300 ms, five suspects | Problem | "one point four seconds... a single lost packet and a one-second retry timer" | covered |
| P4 fill gaps, time on own machine | Problem | "you time each piece on your own machine" | covered |
| O1 HOSTS.TXT at SRI, email, download | Origin | "Called hosts dot T X T. Maintained by hand, at the Stanford Research Institute" | covered |
| O2 why it broke | Origin | "The file got big. The downloads turned into heavy traffic" | covered |
| O3 1983 Mockapetris, RFCs, two ideas | Origin | "R F Cs eight eighty-two and eight eighty-three, refined in nineteen eighty-seven" | covered |
| O4 /etc/hosts checked first | Origin | "It's the etc hosts file on your Mac" | covered |
| F1 Figure 001, three rows, costs, repeats per host | Whole trip | "Picture them in three rows... repeat for every new host" | covered |
| I1 RTT defined, 70 ms / few ms; currency | Whole trip | "Seattle to Virginia, about seventy milliseconds" | covered |
| I2 millions of CPU ops per round trip; waits not compute | Whole trip | "your CPU can do millions of things"; B: "count the waits, not the work" | covered |
| U1 address vs search, assumes https | Parsing | "\"Cat pictures\" goes to your search engine" | covered |
| U2 URL parts, fragment never sent | Parsing | "That one is never sent to the server" | covered |
| U3 port, 443/80/22/53 | Parsing | "twenty-two is S S H, fifty-three is D N S" | covered |
| U4 punycode | Parsing | "x n dash dash... That's called punycode" | covered |
| C1 fastest request | Caches | "The fastest network request is the one you don't make" | covered |
| C2 HTTP cache, max-age 3600, 304 | Caches | "max age thirty-six hundred... three oh four, not modified" | covered |
| C3 service worker | Caches | "That's how web apps work offline" | covered |
| C4 HSTS, plaintext hole, 307 internal | Caches | "anyone on the café Wi-Fi can answer it"; "three oh seven internal redirect" | covered |
| C5 preload list | Caches | "the H S T S preload list, compiled right into Chrome" | covered |
| C6 Wikipedia max-age ~3 years | Caches | "about a hundred and six million seconds. Which is about three years" | covered |
| D1 IP, DNS, chain not one server | DNS chain | "there's a whole chain of them" | covered |
| D2 browser cache ~1 min | DNS chain | "Chrome keeps names it recently looked up in memory for about a minute" | covered (net-internals page omitted as a URL) |
| D3 stub resolver, mDNSResponder, 1-3 ms | DNS chain | "it doesn't look anything up itself... about one to three milliseconds" | covered |
| D4 recursive resolver, router, 8.8.8.8, shared, 5-30 ms, scutil | DNS chain | "Typically five to thirty milliseconds"; "s c util, dash dash d n s" | covered |
| D5 tree walk only on miss | DNS chain | "It only goes and does real work when it also doesn't have the answer" | covered |
| F2 Figure 002 | Tree | "On the left, your laptop... three servers stacked top to bottom" | covered |
| D6 root servers, 13 names, built in | Tree | "thirteen root server names, a dot root dash servers dot net through m" | covered |
| D7 TLD, registry | Tree | "Each one's run by an organization called a registry" | covered |
| D8 authoritative, source of truth | Tree | "It's the source of truth. Everything else in this whole chain is a cache" | covered |
| D9 nobody holds whole book; dig +trace | Tree | "Nobody holds the whole phone book... with a tool called dig" | covered |
| D10 records A, AAAA, CNAME, NS with examples | Records | "Example dot com, type A, one oh four dot twenty dot twenty-three dot one fifty-four" | covered |
| D11 CNAME to CDN, each hop a lookup | Records | "each hop in a C name chain can need its own lookup" | covered |
| D12 several A records; Happy Eyeballs | Records | "a few hundredths of a second later... Happy Eyeballs" | covered |
| D13 TTL, 300 = five minutes, countdown | TTLs | "T T L three hundred, means you may cache this for five minutes" | covered |
| D14 one query per resolver per TTL | TTLs | "roughly one query per recursive resolver, per T T L" | covered |
| D15 trade-off, propagation, 172,800 s / 180 s | TTLs | B: "spreading out across the internet"; "a hundred seventy-two thousand eight hundred seconds. That's two days" | covered |
| D16 anycast, >1000 machines | Anycast | "served by well over a thousand machines worldwide" | covered |
| D17 UDP, one round trip, truncated -> TCP | Anycast | "sets a \"truncated\" flag and the client asks again over T C P" | covered |
| PR1 Predict DNS count 4 then 2, then 0-1 | Predict | B guesses one; A: "the second one's two, not one" | covered |
| D18 ~30 bytes, write yourself | Bytes | "A D N S question is about thirty bytes" | covered |
| F3 Figure 003 header/question/answer layout, 12+17=29 | Bytes | "Seven plus one for the length byte, three plus one, the zero, and four" | covered |
| D19 compression, top bits 11, offset 12 | Bytes | "the other fourteen bits are a position... Here they say twelve" | covered |
| D20 29 / 61 bytes, two packets | Bytes | "the answer, with two A records of sixteen bytes each, was sixty-one" | covered |
| K1 handshake SYN, SYN-ACK, ACK | TCP | "a packet called a SYN, short for synchronize" | covered |
| K2 1 RTT, 70 vs 5 ms, why CDNs | TCP | B: "One and a half round trips?" A: "One. Your third message can carry data" | covered |
| K3 1 s SYN timer, 1,013 ms, tail latency | TCP | "one thousand and thirteen milliseconds, once" | covered |
| S1 TLS, certificate; next topic | TLS | "signed by a certificate authority that your OS or browser already trusts" | covered |
| S2 TLS 1.3 1 RTT vs 1.2 2 RTT | TLS | "T L S one point two, needed two round trips" | covered |
| S3 SNI in the clear | TLS | B: "In the clear?"; "how one Cloudflare I P serves millions" | covered |
| S4 ALPN | TLS | "That step's called A L P N" | covered |
| F4 Figure 004 sequence, 240 ms at 80 | Round trips | B: "At eighty milliseconds... two hundred forty?" | covered |
| S5 QUIC/HTTP/3, alt-svc h3 | Round trips | "folds the transport handshake and the T L S handshake into a single round trip" | covered |
| H1 request typed by hand, empty line | HTTP | "Then an empty line, which means \"that's the end of the headers\"" | covered |
| H2 methods, GET safe, no fragment | HTTP | "a get should never change anything on the server" | covered |
| H3 headers, Host required, Accept-Encoding | HTTP | "Host is required, because one I P can serve lots of sites" | covered |
| H4 cookies, logged in | HTTP | "That's what \"logged in\" is" | covered |
| H5 HTTP/2 binary frames; response shape | HTTP | "Content length, about a hundred and twenty-four thousand bytes" | covered |
| H6 status codes | HTTP | "four twenty-nine too many requests" | covered |
| H7 TTFB | HTTP | "T T F B, time to first byte" | covered |
| W1 IP not the backend | Who answers | "For a big site, it almost never does. Not directly" | covered |
| W2 CDN, edge, anycast, HIT, CF-RAY SEA | Who answers | "an airport code for the city that served you" | covered |
| W3 miss / per-user -> origin over open connection | Who answers | "over a connection it already has open" | covered |
| W4 load balancer | Who answers | "skipping any that are unhealthy" | covered |
| W5 app/db, 1 ms to hundreds, Scale track | Who answers | "a million people press enter at once" | covered |
| R1 streams, parse early, send head early | Response | "servers try to send the head of the page... as early as they can" | covered |
| R2 slow start, ~10 packets/14 KB, 60 KB = 3 RTTs | Response | B: "size divided by bandwidth?"; "Fourteen K, wait. Then twenty-eight" | covered |
| R3 subresources, preload scanner, 50-150 | Response | "often fifty to a hundred and fifty requests" | covered |
| R4 keep-alive, per-host cost, preconnect | Response | "it's why performance people say \"reduce the number of origins\"" | covered |
| R5 HOL, 6 connections, HTTP/2 multiplexing, TCP HOL, QUIC | Response | "Up to six connections per host"; "Fixing that last bit is why Quick exists" | covered |
| G1 "and then rendered" right | Rendering | "You had \"and then rendered\", which is right" | covered |
| F5 Figure 005 pipeline | Rendering | "Picture it left to right... merge into a render tree" | covered |
| G2 DOM, CSSOM | Rendering | "the DOM, the Document Object Model" | covered |
| G3 scripts block parser, async/defer, CSS blocks paint | Rendering | "the browser won't paint anything until it has the C S S" | covered |
| G4 layout/reflow, paint, compositing, smooth scroll | Rendering | "People also call it reflow" | covered |
| G5 ms not RTTs; 16 ms frame | Rendering | "about sixteen milliseconds" | covered |
| WF1 waterfall defined, toy page | Waterfall | "It's called a waterfall" | covered |
| PR2 Predict toggles: 10% / half / 54%, HTML wait unchanged | Waterfall | "about fifty-four percent"; "It barely changes. Because this page is dynamic" | covered |
| F6 interactive figure, toy numbers 60/50/10 | Waterfall | "sixty milliseconds for a cold D N S lookup, fifty milliseconds for the app" | covered |
| WF2 drag to 250, font last, dependency chain | Waterfall | "That's a dependency chain measured in round trips" | covered |
| B0 setup, 3.12 wrap_socket, ping baseline 4.5 / 30 | Build | "example dot com came back in four and a half milliseconds, and Wikimedia in thirty" | covered |
| B1 Task 1 functions, pointer offset gotcha | Build | "continue reading the record from just past the pointer" | covered |
| B2 hints: struct, 29, 0x8180, CNAME then A | Build | "You want eight one eight zero" | covered (inet_ntoa/inet_ntop compressed to "dotted I P") |
| B3 stretch: own recursive resolver, ~40 lines | Build | "in about forty more lines" | covered |
| B4 Task 2 phases | Build | "Time to first byte is how long until the first receive comes back" | covered |
| B5 CRLF hint, run 3x, headers for clues | Build | "the server just sits there, waiting forever" | covered |
| B6 curl cumulative, 24/29/32/63, HTTP/2, 40 ms | Build | B: "So T C P is twenty-seven minus two and a half, about twenty-four" | covered |
| B7 dig +trace via 1.1.1.1, four blocks, TTL countdown | Build | "got back an empty twenty-eight-byte reply"; "sixty-nine milliseconds" | covered |
| B8 DevTools six steps | Build | "lots of requests sharing one connection I D. That's multiplexing" | covered |
| B9 done when | Build | "And you're done when the D N S client builds twenty-nine bytes" | covered |
| M1 predict from ping, median of 3 | Measure | "write down a prediction using only your ping" | covered |
| M2 reference numbers both sites, UDP 21-30, nonexistent 46 | Measure | spread across M3-M8 turns: "twenty-nine cold, three warm"; "took forty-six" | covered (curl cumulative 7/17/31 said only as 31 minus 17) |
| M3 connect ≈ ping | Measure | "Connect is about the same as ping" | covered |
| M4 TLS ≈ RTT + 10 ms, interpretation | Measure | "That's an interpretation, not something measured directly" | covered |
| M5 warm vs cold DNS | Measure | "Warm is one to three milliseconds" | covered |
| M6 suspicious TTFB, 40 ms | Measure | "Thirty-one minus seventeen is fourteen" | covered |
| M7 download, 932 B, 124 KB ~2 RTTs | Measure | "By the textbook fourteen-kilobyte starting window, it'd be three" | covered |
| M8 add it up ~170 ms | Measure | "About a hundred seventy milliseconds" | covered |
| K-1 Nagle + delayed ACK, numbers, round-number timer | Break It | "look for a timer" | covered |
| K-2 DNS to nothing; /etc/hosts | Break It | "U D P has no \"connection refused\"" | covered |
| K-3 SNI missing / wrong name / reverse | Break It | "a handshake failure, because the edge doesn't even have a certificate" | covered |
| K-4 handshake cost x10, pools | Break It | "About sixty milliseconds, times ten" | covered |
| E1 full walk-through | Close + whole episode | B's closing restatement | covered |
| E2 DNS scaling incl. long TLD TTLs, anycast, cost | TTLs; Anycast | "The records for who runs each T L D have long T T Ls, days" | fixed (TLD TTL point added) |
| E3 Seattle vs India | Same servers, different continent | "Call it six to eight round trips" | covered |
| E4 CDN speeds/doesn't; absorbs load and attacks | Who answers; Waterfall | "it also soaks up load and attacks" | covered |
| E5 HTTP/1.1 vs 2 vs 3 | Response | "each stream is ordered on its own" | covered |
| G-1 sources | Close | "Alex Gaynor's \"What happens when\"" | covered |
| G-2 connections | Close | "opening up the T L S box, and writing the server side" | covered |

Numbers checked against the lesson: all RTTs, byte counts, TTLs, Measure ranges, Break It ranges, and
waterfall percentages match. Derived in the script (not literally in the lesson): seventeen-byte
breakdown (seven plus one, three plus one, zero, four); "forty-five thousand" RAM reads in four and a half
milliseconds (from the latency lesson's hundred nanoseconds); "ninety-something percent" travel in the
hundred-seventy-millisecond Wikipedia fetch.
