# Coverage: tcp-vs-udp

Lesson src/lessons/tcp-vs-udp.mdx vs podcast/scripts/tcp-vs-udp.md. Item IDs match
podcast/outlines/tcp-vs-udp.md. No item is MISSING. Numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 IP best-effort | Problem | "makes exactly one promise. It'll try" | covered |
| T2 bytes in flight = bandwidth x latency | Predict, stop-and-wait | "bandwidth times the latency. Like, if a link moves a hundred megabytes a second" | covered |
| P1 IP may lose, duplicate, swap | Problem | "might arrive twice... show up swapped" | covered |
| P2 requests.post 3 KB, scp 16 GB, token order; TCP in kernel | Problem | "three kilobyte JSON body"; "sixteen gigabyte checkpoint"; "running inside the kernel" | covered |
| P3 costs: RTT 150 ms, slow start, stall, 40 ms, ports | Problem | "about a hundred and fifty milliseconds, gone"; "forty milliseconds, also on purpose" | covered |
| P4 UDP users; build it yourself | Problem | "D N S. Video calls. Games. WireGuard. Tailscale" | covered |
| O1 Cerf/Kahn 1974, RFC 793 1981, no rate idea | Origin | "R F C seven ninety-three, in nineteen eighty-one" | covered |
| O2 Oct 1986, 400 yards, 3 hops, 32 kb/s to 40 b/s, collapse | Origin | "thirty-two kilobits per second to forty bits per second" | covered |
| O3 Jacobson/Karels 1988, three fixes, polite | Origin | "every sender on it agrees to be polite" | covered |
| I1 which program gets the packet | Ports | "A packet arrives. Which program gets it?" | covered |
| I2 port 0-65535, building/apartment | Ports | "the port picks the apartment" | covered |
| I3 listen, address in use, 22, 8000 | Ports | "\"address already in use\" error" | covered |
| I4 ephemeral ranges mac/Linux | Ports | "thirty-two thousand seven hundred sixty-eight up to sixty thousand nine hundred ninety-nine" | covered |
| I5 socket = file descriptor, kernel does protocol | Ports | "a file descriptor, a small integer" | covered |
| I6 4-tuple, 5-tuple | Ports | "That's called the four-tuple"; "five-tuple" | covered |
| F1 Figure 001 | Ports | "picture one server box on the right with three slots" | covered |
| I7 UDP 8 bytes, 4 fields, RFC 768 1980 | UDP | "exactly four fields, eight bytes in total" | covered |
| I8 checksum | UDP | "the packet's just thrown away. Quietly" | covered |
| I9 datagram semantics, no guarantees | UDP | "each receive-from hands you exactly one of them, whole" | covered |
| I10 no setup, no state, never waits | UDP | "If packet seven is lost, packet eight gets delivered" | covered |
| I11 TCP promise | TCP's promise | "All of them. In the same order. Exactly once. Or you get an error" | covered |
| I12 byte stream, framing (37/163) | TCP's promise | "a receive of thirty-seven and then one of a hundred sixty-three" | covered |
| F2 Figure 002 headers | TCP's promise | "Now picture both headers drawn to scale" | covered |
| I13 manuscript, sequence numbers, bytes vs packets | Trick 1 | "Real T C P numbers every byte" | covered |
| I14 ack, cumulative | Trick 1 | "\"I have everything before N, send N next\"" | covered |
| I15 RTO trade-off | Trick 2 | "Set it too short and you waste bandwidth" | covered |
| I16 can't tell which was lost; duplicates | Trick 2 | "It doesn't know. That's the key thing" | covered |
| I17 stop-and-wait | Trick 2 | "called stop-and-wait" | covered |
| PR1 8 KB/s, 0.006%, 10 Gb no help, 99.99% | Predict | "about six thousandths of one percent"; "ninety-nine point nine nine percent" | covered |
| I18 sliding window | Trick 3 | "That's the sliding window" | covered |
| I19 BDP, 18.75 MB, 300 KB, 2.5 MB | Trick 3 | "About eighteen point seven five megabytes" | covered |
| I20 go-back-N, selective repeat, SACK | Trick 3 | "called go-back-N"; "selective repeat" | covered |
| PR2 window 9, 1/9, 4/9, router queue | Predict, window | "A window of four, about four ninths" | covered |
| F3 simulator four settings | Predict, window | "lonely zigzag"; "around forty percent"; "bigger rewinds" | covered |
| I21 RTT-based RTO, x4 variation, doubling, 200 ms floor, RFC 1 s, 200x | Real TCP | "two hundred times the round trip" | covered |
| I22 dup acks, fast retransmit | Real TCP | "That's fast retransmit" | covered |
| I23 SACK | Real TCP | "That's SACK, selective acknowledgment" | covered |
| I24 flow control, 64 KB, 430 KB/s, window scaling to ~1 GB | Real TCP | "about four hundred thirty kilobytes a second"; "up to about a gigabyte" | covered |
| I25 three-way handshake, why three | Handshake | "only one direction would be confirmed" | covered |
| I26 random ISNs, two reasons | Handshake | "those starting numbers are random, not zero" | covered |
| F4 Figure 004 | Handshake | "two vertical lines, client on the left" | covered |
| PR3 450 ms, 150 ms, Session, QUIC folds | Predict, first byte | "About four hundred and fifty milliseconds" | covered |
| I27 FIN, half-close, RST | Closing | "That's called a half-close"; "connection reset by peer" | covered |
| I28 TIME_WAIT, MSL, 60/30 s, two reasons | Closing | "Linux hardcodes the whole TIME WAIT to sixty seconds. On macOS it's thirty" | covered |
| I29 ~28k ports / 60 s = ~470/s; reuse, not sysctl | Closing | "about four hundred seventy new connections per second" | covered |
| I30 HTTP keep-alive | Keep-alive | "It's the single cheapest latency win" | covered |
| I31 TCP keepalive, 2 h, NAT drop, ServerAliveInterval | Keep-alive | "the default idle time is two hours"; "Server Alive Interval" | covered |
| I32 network needs protection | Congestion | "nothing so far protects the network" | covered |
| I33 cwnd, min of two windows | Congestion | "capped by whichever is smaller" | covered |
| I34 slow start (10 pkts, 14 KB), AIMD, timeout reset, fairness | Congestion | "ten packets, about fourteen kilobytes"; "sharing it fairly" | covered |
| F5 sawtooth | Congestion | "Ramp, chop, ramp, chop" | covered |
| PR4 7 RTTs, 1.05 s, <1%, warm cwnd | Predict, slow start | "So seven round trips. About one point oh five seconds" | covered |
| I35 Mathis, 120 KB/s | Mathis | "About a hundred twenty kilobytes per second" | covered |
| I36 CUBIC | Mathis | "CUBIC is the default on Linux, since two thousand six" | covered (sysctl names compressed to "using it right now") |
| I37 BBR | Mathis | "B B R, from Google, in two thousand sixteen" | covered |
| I38 tinygrams | Nagle | "people called them tinygrams" | covered |
| I39 Nagle rule 1984 | Nagle | "in nineteen eighty-four, is one rule" | covered |
| I40 delayed ack, stall | Nagle | "They're both waiting on each other" | covered |
| I41 token streaming, TCP_NODELAY, Go, Python 3.14 returns 0 | Nagle | "asking for that option gives back zero, meaning off" | covered |
| I42 HOL blocking, 5 missing | HOL | "Everything waits for five's retransmission" | covered |
| I43 HTTP/2 streams, worse than six connections | HOL | "opened six separate connections" | covered |
| F6 Figure 006 | HOL | "Picture it as two rows" | covered |
| I44 2010s problems, Wi-Fi to cellular | QUIC | "every connection dies" | covered |
| I45 kernel, middleboxes, SCTP 2000, ossification | QUIC | "People call this ossification" | covered |
| I46 QUIC over UDP, user space, encrypted header, 2021 | QUIC | "it can't ossify the same way" | covered |
| I47 one handshake, 0-RTT replay, no HOL, migration, HTTP/3 | QUIC | "That's called zero R T T"; "H T T P three is just H T T P on top of Q U I C" | covered |
| I48 three rules | When UDP | "Three situations" | covered |
| I49 DNS, 512 bytes, TCP for big | When UDP | "usually under five hundred twelve bytes" | covered |
| I50 games | When UDP | "head-of-line blocking at its absolute worst" | covered |
| I51 voice/video, WebRTC, RTP | When UDP | "Web R T C, and R T P under it" | covered |
| I52 Tailscale, TCP-over-TCP meltdown, DERP | When UDP | "T C P over T C P meltdown"; "called DERP" | covered |
| I53 QUIC itself | When UDP | "the last case, of course, is Q U I C itself" | covered |
| B0 four programs, ports 9000/9001, predict first | Build It | "port nine thousand... nine thousand one" | covered |
| B1 wire format, conventions, 4 MB buffer, 9,216 bytes | Build It | "nine thousand two hundred sixteen bytes" | covered |
| B2 evil proxy, heap, hints, netcat test | Build It | "You keep a heap, a priority queue" | covered |
| B3 stop-and-wait, ack duplicates, hash, ~12 ms | Build It | "Why ack a duplicate?"; "roughly twelve milliseconds" | covered |
| B4 go-back-N sender, hints | Build It | "a window of one should behave identically" | covered |
| B5 benchmark, TCP baseline, netem, NLC, review | Build It | "Network Link Conditioner" | covered |
| B6 tcpdump flags, +1, win, options, Wireshark, ss, netstat | Build It | "S followed by a dot" | covered |
| B7 netem steps, lockout warning, cleanup | Build It | "lock yourself out of your own machine" | covered |
| B8 done-when | Build It | "within about thirty percent" | covered |
| M1 reference setup | Measure | "M-series MacBook, Python three point fourteen" | covered |
| M2 0% row | Measure | "Window sixty-four, six megabytes a second" | covered |
| M3 1% row | Measure | "two point one seven, with five hundred twelve" | covered |
| M4 5% row | Measure | "fourteen hundred and eight retransmissions" | covered |
| M5 TCP loopback 5 GB/s, netem not run on Mac | Measure | "about five gigabytes per second" | covered |
| M6 window 1 = RTT, ten-thousandth | Measure | "about a ten-thousandth of it" | covered |
| M7 linear, never reached BDP | Measure | "But in the simulator it flattened out at nine" | covered |
| M8 60% vs 19%, 1,408 of 1,668 | Measure | "sixteen hundred sixty-eight packets" | covered |
| M9 Mathis 0.9 / 0.4 MB/s, 1986 sender | Measure | "you're the nineteen eighty-six sender" | covered |
| K1 short RTO, 1,582 / 834 | Break It | "fifteen hundred eighty-two retransmissions" | covered |
| K2 two transfers, 70 MB/s nonsense, fix | Break It | "nonsense seventy megabytes a second" | covered |
| K3 flow control, 58.6 vs 1.8, 25,411, 30x | Break It | "twenty-five thousand four hundred eleven" | covered |
| K4 Nagle stall, Linux ~40 ms, Mac 0.03 ms, sendall | Break It | "about three hundredths of a millisecond" | covered |
| E1 summary + costs | Close | B's restatement; A's "price list" | covered |
| E2 BDP, window scaling, socket buffers | Real TCP | "the size of your socket buffers matters" | covered |
| E3 1,000 requests, 70 ms, 210 ms, pool, keepalives | Keep-alive | "about two hundred ten milliseconds per request instead of seventy" | covered |
| E4 scaling fixes | Mathis | "Shorten the round trip, meaning serve from somewhere closer" | covered |
| E5 HTTP/3 and Tailscale on UDP | QUIC; When UDP | as I45-I47, I52 | covered |
| E6 40 ms clumps, proxies, other buffering, gzip | Nagle | "Or gzip on the stream" | covered |
| G1 Jacobson/Karels, Kurose and Ross | Close | "Kurose and Ross, chapter three" | covered |
| C1 connections | Close | "what happens when you hit enter" | covered |
