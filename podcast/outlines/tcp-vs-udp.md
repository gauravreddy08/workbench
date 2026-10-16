# Outline: tcp-vs-udp

Source: src/lessons/tcp-vs-udp.mdx. Curriculum entry: "TCP and UDP." Question: why are there two
transport protocols, and what is TCP doing for me that UDP is not? Why: head-of-line blocking,
handshakes and timeouts show up in every distributed system.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).
Diagnostic gap in play: Numbers (latency, bandwidth, bytes in flight). Every number lands next to a
comparison; B voices "a faster link fixes it" and A corrects.

## Today / prerequisites

- T1 Prereq: IP is best-effort (lost, duplicated, reordered packets). -> A re-explains in the opening lines.
- T2 Prereq: round trips and bytes in flight = bandwidth times latency, from the latency lesson. -> A re-explains briefly at the stop-and-wait Predict, with a worked example.

## The Problem

- P1 IP promises only to try; may not arrive, may arrive twice, may arrive swapped; nobody tells you. -> A opens on this.
- P2 What you do all day: requests.post with three kilobyte JSON to ranking service arrives whole and in order; scp sixteen gigabyte checkpoint to Spark, hash matches; token stream "Hello" "world" never swapped. Something between code and IP does it: TCP, inside the kernel. -> A scene; B voices "isn't that just the network being reliable?" wrong model.
- P3 Costs: a round trip per new connection (one hundred fifty ms to Europe); deliberately slow start, several more round trips to full speed; one loss stalls everything behind it; small writes sit forty ms on purpose; fast open/close can exhaust client port numbers. -> A, as a list of grievances said conversationally.
- P4 Meanwhile DNS, video calls, games, WireGuard, Tailscale, HTTP/3 deliberately use UDP, which promises nothing. Plan: build the promise yourself out of UDP. -> A; B reacts to "Tailscale" since his SSH runs on it.

## Origin

- O1 First TCP specs (Cerf and Kahn 1974 paper, RFC 793 in 1981) had sequence numbers, acks, retransmission, but no idea how fast to send; blast whole window, resend everything on timeout. -> A story.
- O2 October 1986: LBL to UC Berkeley link, four hundred yards, three hops, dropped from thirty-two kilobits per second to forty bits per second (factor of a thousand). Network full of retransmissions; queues overflow, drops, timeouts, resend everything; almost every packet a copy. Congestion collapse. -> A; B asks "was something broken?" naturally.
- O3 Van Jacobson and Michael Karels fixed it in the senders, no router touched; 1988 paper "Congestion Avoidance and Control": slow start, better retransmission timer, back off hard on loss. Still in every stack. Internet works because every sender agrees to be polite. -> A.

## The Idea: Ports and sockets

- I1 IP address gets packet to machine; many programs running (browser, Slack, SSH to Spark, Python script); which one gets it? -> A.
- I2 Port: sixteen-bit number zero to sixty-five thousand five hundred thirty-five; IP picks building, port picks apartment. Every TCP/UDP packet carries source and destination port. -> A.
- I3 Listen: server tells kernel "deliver new connections for this port to me"; only one program normally per port and address; that's "address already in use". sshd on twenty-two, FastAPI on eight thousand. -> A; B recognises the error.
- I4 Ephemeral port: kernel picks client-side port from a reserved range; macOS forty-nine thousand one hundred fifty-two up to sixty-five thousand five hundred thirty-five; Linux thirty-two thousand seven hundred sixty-eight to sixty thousand nine hundred ninety-nine. -> A.
- I5 Socket: kernel object, a file descriptor (small integer like an open file); you read/write; kernel does the protocol. socket.socket asks for one; all TCP machinery is in the kernel beyond it; you see send and recv. -> A.
- I6 Four-tuple: source IP, source port, dest IP, dest port names a connection; why one server port holds thousands of connections; add protocol -> five-tuple that firewalls and load balancers hash on. -> B asks how one port serves many; A answers.
- F1 Figure 001: laptop running python requests and the Spark running curl both connect to port eight thousand on one server; two separate connection sockets, told apart by client IP and port; server also has twenty-two sshd TCP and fifty-three DNS UDP, which has no connections, just datagrams from anyone. -> A describes over the phone.

## The Idea: UDP

- I7 UDP (RFC 768, 1980): IP plus four fields, eight bytes: source port, dest port, length, checksum. That's the whole protocol. -> A.
- I8 Checksum: number computed from bytes; receiver recomputes; mismatch -> bits flipped, packet thrown away. -> A inline.
- I9 Each sendto becomes one datagram (self-contained, own address, delivered or not on its own); each recvfrom returns exactly one whole with boundaries. No guarantee arrives, once, or in order; drop -> nobody resends, nobody tells you. -> A.
- I10 Upside: no setup, first packet carries data; no per-client state on server; nothing ever waits (packet eight delivered even if seven lost). -> A; B pushes "that sounds strictly worse".

## The Idea: TCP's promise

- I11 TCP: reliable, ordered, two-way byte stream over unreliable IP, slows down when congested. Whatever you write comes out all of it, same order, exactly once, or an error. -> A.
- I12 Byte stream: no message boundaries; send hello, send world might arrive as one recv "helloworld", or as thirty-seven and one sixty-three; framing is your job; HTTP, Postgres, Redis all say how long each message is. -> B voices the wrong model (two sends = two recvs); A corrects.
- F2 Figure 002: headers to scale. UDP eight bytes, two rows of four fields. TCP twenty bytes before options: ports, sequence number (where my first byte sits), ack number (next byte I want from you), header length, flags SYN ACK FIN RST, window (room I have left), checksum, urgent pointer, options MSS, window scale, SACK, timestamps. Almost every field is reliability machinery. Both ride inside a twenty-byte IP header. -> A describes as "two rows versus a tall block", highlighting the three meaningful fields.

## Trick 1: number and ack

- I13 Manuscript analogy: three hundred pages one per envelope, lossy reordering post; number pages so publisher can reorder, spot gaps, drop duplicates. Sequence number. TCP numbers bytes; your channel numbers packets. -> A.
- I14 Postcards back "got everything up to page forty-one" = ack. Cumulative ack: "I have everything before N"; one ack covers many; lost ack repaired by the next. -> A.

## Trick 2: retransmit

- I15 Sender starts a timer; no ack in time -> resend. Retransmission timeout, RTO; too short wastes bandwidth on copies, too long idles the connection. -> A.
- I16 Sender can't tell page lost vs postcard lost vs postcard slow; resends in all three; receiver must handle duplicates, so sequence numbers come first. -> B asks "how does it know it was lost?" A answers it doesn't.
- I17 Stop-and-wait: send one, wait for ack, send next. Correct, simple, slow. -> A.
- PR1 Predict stop-and-wait: California to Europe, one fifty ms round trip, one gigabit link, twelve-hundred-byte packets -> one packet per round trip, about eight kilobytes per second, about 0.006 percent of a one gigabit link (one hundred twenty-five megabytes per second). Ten gigabit link changes nothing; spent 99.99 percent waiting. Latency-times-bandwidth idea: pipe one fifty ms long, one packet at a time. -> A asks, B guesses "upgrade helps / a few megabytes"; A reveals. Re-explains T2 here.

## Trick 3: sliding window

- I18 Post several before hearing back; up to W unacked in flight; as acks arrive window slides forward. Sliding window. -> A.
- I19 Size: bandwidth-delay product; examples: one gigabit to Europe about 18.75 megabytes in flight; home Wi-Fi to Spark over Tailscale about sixty megabytes per second times five ms, about three hundred kilobytes; datacenter one hundred gigabit times 0.2 ms, about 2.5 megabytes. Remember 18.75 MB. -> A works first example aloud, others quickly; B reacts to size.
- I20 Go-back-N: on loss, rewind to oldest unacked and resend everything; receiver accepts only next expected. Wasteful but simple, what you build first. Selective repeat: resend only missing; receiver buffers out of order; TCP does this with SACK. -> A.
- PR2 Predict window fill: twelve ms to put packet on wire, round trip about one hundred eight ms -> smallest full-speed window about nine; ack for packet one returns as nine finishes. Window one gives one ninth (about eleven kilobytes per second of one hundred), window four about four ninths. Doubling past nine does nothing; link is bottleneck; extra packets wait in line, which on real networks is a router queue adding delay for everyone. -> A asks, B works it out.
- F3 Figure 003 interactive sim: go-back-N sender, sequence diagram time flowing down, sliders loss and window, readouts goodput, percent of link, retries, timeouts. Window one no loss: lonely zigzag, eleven KB/s, a ninth. Window nine: diagonals pack, sender never idles, one hundred KB/s. Window nine, five percent loss: each loss costs a quiet gap of one timeout then a blue burst resending whole window; about forty percent of link; about a third of sends are copies. Window sixteen, five percent: more retries, barely more goodput; bigger window buys bigger rewinds. -> A describes "as you drag the sliders".

## What real TCP does better

- I21 Measures round trip; smoothed RTT plus variation; RTO = smoothed RTT plus four times variation (Jacobson 1988, RFC 6298); doubles RTO after each timeout; Linux floor two hundred ms, RFC says one second; on a one ms datacenter link a loss can cost two hundred ms, a two hundred times stall. -> A in words; B reacts to the two hundred x.
- I22 Duplicate acks: five lost, six seven eight arrive -> "I want five" repeated; three dup acks trigger fast retransmit, about one round trip instead of a timeout; timeouts become rare fallback. -> A.
- I23 SACK (RFC 2018): receiver lists ranges it holds beyond the gap; TCP is selective repeat. -> A.
- I24 Flow control: window field "this many bytes of buffer left"; sender never exceeds; protects receiver. Sixteen-bit field maxes sixty-four KB; at one fifty ms caps you at about four hundred thirty KB per second regardless of link. Window scaling option (RFC 7323) multiplies by up to two to the fourteen, up to about one gigabyte. Break It will show no-flow-control failure. -> A; tie back to 18.75 MB.

## Handshake and close

- I25 Three-way handshake: SYN "here's my starting number", SYN-ACK "got yours, here's mine", ACK "got yours". Why three: each side picks own number and needs confirmation; SYN-ACK does two jobs; two messages confirm only one direction. -> B: "why not two?" A answers.
- I26 Starting numbers random: stray old packets on same four-tuple shouldn't land in new connection's range; blind attacker can't guess and inject. -> A.
- F4 Figure 004: client and server timelines; SYN, SYN-ACK, ACK plus request; one RTT handshake then one RTT request; more requests on same connection cost one RTT each; close: FIN, ACK, FIN, ACK; closing side in TIME_WAIT two times MSL, sixty seconds Linux, thirty seconds macOS; four-tuple can't be reused. -> A describes as two vertical lines with diagonals.
- PR3 Predict first byte: fresh HTTPS California to Europe, TCP one RTT, TLS 1.3 one RTT, request one RTT -> about four hundred fifty ms before server starts; second request about one fifty ms; three x; why clients reuse connections; requests.get in a loop vs requests.Session; QUIC folds the handshakes into one. -> A asks, B answers part, A completes.
- I27 FIN: "I'm finished sending"; other side can keep sending (half-close). RST: reset, kills immediately; "connection reset by peer"; connect to port nobody listens on, or crashed process. -> A; B recognises the error message.
- I28 TIME_WAIT: closer stays for two times MSL (max segment lifetime; Linux hardcodes sixty seconds; macOS msl fifteen thousand ms so thirty seconds). Reasons: lost final ACK means other side resends FIN, someone must re-ack; old delayed packets could land in a new connection with same four-tuple. You'll build this bug. -> B: "why not just forget it?" A explains.
- I29 Cost: short connections to one server port; one four-tuple per ephemeral port, stuck sixty seconds; Linux about twenty-eight thousand ports divided by sixty, about four hundred seventy new connections per second before connect fails "cannot assign requested address". Scrapers and load testers hit it. Fix is reusing connections, never a sysctl. -> A works the division aloud; tie to his web-scraping company work.

## Keep-alive

- I30 Two things named keep-alive. HTTP keep-alive: reuse one TCP connection for many HTTP requests; default in HTTP/1.1; pools (requests.Session, httpx.Client); saves handshake, TLS setup, slow start; cheapest latency win. -> B voices conflation; A splits.
- I31 TCP keepalive: optional kernel probe after idle; off by default for most sockets; default idle two hours on Linux and macOS. Idle TCP sends nothing, no heartbeat; dead server looks healthy until you write; NATs and load balancers forget idle connections after a few minutes and silently drop. So long-lived idle connections (DB pools, SSH, streaming clients) turn keepalive on with short idle or send own pings; SSH ServerAliveInterval. -> A, with Spark SSH session as scene.

## Congestion control

- I32 Flow control protects receiver; nothing yet protects network; routers with queues; everyone at full window -> 1986. -> A.
- I33 Congestion window cwnd: sender's private guess at what path holds; in flight at most the smaller of cwnd and receiver window; discovered, loss as signal. -> A.
- I34 Reno: slow start: small window (ten packets about fourteen KB, RFC 6928), double each round trip; "slow" vs blasting, actually exponential. AIMD: past threshold add one packet per round trip; on loss halve; on timeout drop back to start. Many senders converge to fair share. -> B: "slow start doubles? that's not slow"; A laughs, explains name.
- F5 Figure 005 sawtooth: steep curve up (slow start, drawn from one for clarity, real stacks start at ten), loss at sixteen threshold... halves, then straight ramp plus one per RTT, halve again; throughput about cwnd divided by RTT; window not link sets speed. -> A describes shape.
- PR4 Predict slow start: fresh connection to Europe, ten packets of about 1,460 bytes, about 14.6 KB, doubles; one MB response -> cumulative 14.6, 44, 102, 219, 453, 920 KB, then 1.9 MB: seven round trips, about 1.05 seconds plus handshake; about one MB per second, under one percent of gigabit. Slow start not bandwidth sets speed for small and medium transfers over distance. Reused connection keeps grown cwnd unless idle long enough for kernel reset. -> A asks; B guesses "one round trip, it's a gigabit"; A walks doubling.
- I35 Mathis 1997: throughput roughly packet size over RTT times 1.22 over square root of loss rate. Double distance halve speed; quadruple loss halve speed. 1,460 bytes, one fifty ms, one percent loss -> about one hundred twenty KB per second regardless of link; lossy long-haul feels like dial-up. -> A in words, worked example, no symbols.
- I36 CUBIC: default Linux since 2006 and macOS; grows cwnd as cubic function of time since last loss, climbs back fast on fast long links; still loss-based; Mac and Spark use it now; sysctl to check. -> A.
- I37 BBR: Google 2016; measures fastest delivery rate and smallest RTT, multiplies (bandwidth-delay product again), sends at that rate; better with random non-congestion loss, avoids filling router buffers, low delay; YouTube and Google services. -> A.

## Nagle

- I38 Early 1980s remote terminals: each keystroke one byte with forty bytes headers; tinygrams clogged links. -> A story.
- I39 Nagle RFC 896, 1984: if unacked data in flight, don't send a small packet; buffer until ack or full packet. On by default today. -> A.
- I40 Delayed ack: receiver waits briefly (typically forty ms Linux, up to two hundred ms some systems) to piggyback or combine. Stall: small header goes out, small body held by Nagle, receiver has no full request so delays ack; both wait for the timer, about forty ms on Linux. -> A tells as a two-sided standoff; B "they're both waiting on each other".
- I41 LLM token streaming = exactly these small writes (one server-sent event of a few dozen bytes per token); tokens clump; TTFT and inter-token latency look worse than model. Fix: TCP_NODELAY socket option, turns off Nagle. Right for interactive and streaming, RPC, games, SSH. Go sets it by default; Python plain socket does not (getsockopt returns zero on fresh socket on 3.14); check with getsockopt. -> A, tie to his FastAPI LLM server; B asks what it looks like on his machine.

## Head-of-line blocking

- I42 Packets six to nine arrived, five missing; kernel can't hand six to nine to program; waits for five's retransmission, a round trip at best, full RTO at worst. Head-of-line blocking. -> A.
- I43 Fine for one file; hurts with independent things on one connection; HTTP/2 multiplexes streams; lost image piece stalls JSON and CSS; on lossy networks HTTP/2 can do worse than HTTP/1.1's six connections. -> B: "but the bytes are already there"; A: yes, that's the point.
- F6 Figure 006: top, HTTP/2 over TCP: A1 delivered, B1 lost, A2 C1 C2 arrived stuck in kernel, all three streams stall. Bottom, QUIC order per stream: A and C delivered, only B waits. -> A describes.

## QUIC

- I44 2010s problems: handshake plus separate TLS handshake, cross-stream HOL blocking, connection tied to four-tuple so Wi-Fi to cellular kills connections. Need new transport, can't deploy. -> A.
- I45 TCP in kernel: years for every device to update. Middleboxes (NATs, firewalls, load balancers, corporate proxies) only understand TCP and UDP and drop others. SCTP (2000, multiple streams) never crossed public internet; new TCP options get stripped. Ossification. -> B wrong model "just fix TCP"; A explains.
- I46 QUIC (RFC 9000, 2021) on UDP: UDP passes middleboxes, thin blank canvas; reliability, congestion control in user-space library inside browser or server; ships with app update; header almost all encrypted so it can't ossify. -> A.
- I47 Buys: one handshake (transport plus TLS 1.3 in one round trip); 0-RTT on resumed connections (data in first packet, replayable, only safe requests); no cross-stream HOL; connection migration via connection ID. HTTP/3 (RFC 9114, 2022) = HTTP on QUIC; large share of big-provider traffic. Punchline: rebuilt reliability on UDP, what you build, plus thirty years of tricks. -> A; B asks what replayable means.

## When to pick UDP

- I48 Rule: late packet as bad as lost; whole exchange fits one packet; something above already does reliability. -> A.
- I49 DNS: small question/answer, usually under five hundred twelve bytes; handshake would triple cost; just ask again; switches to TCP for big answers. -> A.
- I50 Games: position from one hundred ms ago useless; retransmitting delays fresh behind stale (HOL at worst); resend only what still matters. -> A.
- I51 Voice/video: late frame is garbage; WebRTC and RTP over UDP; hide loss (skip, interpolate, ask for keyframe). -> A.
- I52 Tunnels: SSH to Spark over Tailscale is TCP inside WireGuard UDP packets; TCP tunnel would stack two reliability loops, both back off and retransmit, timers fight: TCP-over-TCP meltdown. UDP tunnel lets inner TCP handle loss once. UDP blocked -> DERP relays over HTTPS, feel the latency. -> B wrong model "wouldn't a TCP tunnel be safer?"; A corrects.
- I53 QUIC itself. -> A one line.

## Build It

- B0 Overview: folder, everything on loopback, standard library Python; four programs: sender, receiver, proxy that loses/delays/reorders, benchmark. Sender to proxy port nine thousand to receiver nine thousand one, acks back. Write predictions first. -> A, one breath.
- B1 Task 0 wire format (ok): one-byte type, four-byte sequence number, payload; struct in network byte order (big-endian); MSS twelve hundred to stay under typical packet size limits. Conventions: sequence counts packets from zero; last packet is FIN with seq one past last data; ACK carries next wanted (ACK five means have zero to four); both bump UDP receive buffer to four megabytes (why: Break It). macOS max datagram nine thousand two hundred sixteen bytes; random test file from dev urandom. -> A, setup in a few sentences.
- B2 Task 1 evil proxy (hands): listens nine thousand, forwards to nine thousand one and back to last sender; drops with probability loss, holds for delay plus random jitter; jitter reorders. Heap of due times; select with timeout until earliest due. Hints: monotonic clock not wall clock; counter in heap tuple stops comparing bytes on ties; seeded random for repeatable runs; test with netcat, see lines vanish at fifty percent loss. -> A, part that matters: the heap and jitter.
- B3 Task 2 stop-and-wait (hands): receiver keeps expected; accept only expected; always ack expected even for duplicates (why: the ack may have been lost); after FIN re-ack for half a second. Sender: rto fifty ms, resend on timeout, count retransmissions. Print SHA-256 prefix both sides; zero loss then five percent; hashes must match every time; if not, real bug. Predict: proxy round trip about twice (delay plus half jitter) plus overhead, about twelve ms. -> A; B asks why ack duplicates, A answers.
- B4 Task 3 go-back-N (hands): base, next, one timer for base; send while next below base plus window; ACK beyond base moves base and restarts or stops timer; timeout resends base through next. Hints: prebuild packets; settimeout to deadline, catch timeout; window one must equal stop-and-wait (first test); optional receiver buffering out of order. -> A.
- B5 Task 4 benchmark (review): loss zero, one, five percent by window one, eight, thirty-two, sixty-four, two MB, fresh receiver each run (Break It 2). TCP baseline: server recvs until close counting bytes; client sendall then shutdown write. Not fair: no loss/delay; fair needs root: Spark tc netem on loopback, both protocols; Mac Network Link Conditioner, check it affects loopback. Agent reviews for unfair comparisons: timing process startup in one, counting bytes before receiver confirmed. -> A.
- B6 Task 5 tcpdump (explain): capture on loopback with sudo; see S, S-dot (SYN-ACK, dot means ACK), dot; data with P-dot (push); F-dot both directions; SYN-ACK acks client's number plus one; relative vs raw (-S) sequence numbers; win is receiver window; options mss and wscale negotiated in handshake. On Spark with netem: Wireshark retransmission filter, Stevens graph (slope throughput, flat steps stalls); ss -ti shows live cwnd, rtt, retrans; Mac netstat retransmission counters. Reading output is the skill; don't have agent summarize. -> A describes what you'd see, flags said as words.
- B7 Task 6 netem (explain): delay ten ms each direction (RTT about twenty), one percent loss; add five ms jitter and five percent; show; ALWAYS delete. Only loopback, never SSH/Tailscale interface or lock yourself out. Rerun at zero, one, five percent; try Nagle stall under ten ms delay. -> A with the lockout warning.
- B8 Done when: two MB through proxy at five percent with jitter, hashes match, both protocols; bench fills table, stop-and-wait within about thirty percent of computed; seen S, S-dot, dot and FIN in capture; can explain every number including beat or lost to TCP. -> A, folded in.

## Measure

- M1 Setup: two MB, proxy five ms delay two ms jitter, RTO fifty ms. Reference run M-series MacBook, Python 3.14, go-back-N with buffering receiver; yours differs, shape shouldn't. -> A.
- M2 Zero loss: window one 0.084 MB/s, eight 0.76, thirty-two 3.0, sixty-four 6.0. -> A says spread.
- M3 One percent: 0.076 (41 retx), 0.49 (152), 1.22 (420), 2.17 (512). -> A, selected.
- M4 Five percent: 0.052 (183), 0.28 (536), 0.68 (1,094), 1.15 (1,408). -> A.
- M5 Plain TCP loopback no proxy moved two hundred MB at about five GB/s; netem comparison not run on Mac; TCP column under loss is his. -> A.
- M6 Window one = round trip: twelve hundred bytes over about fourteen ms, about 0.085 MB/s; using a ten-thousandth of loopback. -> A.
- M7 Zero loss linear in window up to sixty-four; never reached BDP because loopback pipe at twelve ms holds far more than sixty-four packets; window is only limit; too-small window or buffer is slow on fast long link. -> B asks why it didn't flatten at nine like the sim; A answers.
- M8 Loss hurts big windows more: five percent, window one kept sixty percent, window sixty-four kept nineteen percent; each timeout idles window-sixty-four sender fifty ms (three or four round trips) and resends up to sixty-four; 1,408 resends for 1,668 packets; mostly already-held; why SACK and fast retransmit. -> A.
- M9 Against TCP: Mathis prediction with 1,448-byte packets, twenty ms netem RTT, one percent: about 0.9 MB/s; five percent about 0.4; rough, SACK and CUBIC do better. Your window-sixty-four may beat TCP under random loss, not cleverer: yours never slows on loss; TCP assumes loss = congestion, backs off; yours is the 1986 sender. -> B voices "so I beat TCP"; A corrects.

## Break It

- K1 RTO shorter than RTT: five ms vs twelve ms, zero loss; one MB at window eight worked, same speed, but 1,582 retransmissions for 834 packets; nearly every packet twice; doubled network load; why TCP measures RTT and backs off exponentially. -> A asks "what if", B guesses it breaks, A: it works, worse.
- K2 Two transfers against one receiver without clean reset: receiver re-acking end of transfer one sent old final ACK; new sender skipped most data, reported nonsense seventy MB/s, receiver got garbage. Old valid-looking numbers in a new conversation; exactly why random ISNs and TIME_WAIT. Fix: random connection ID or random starting seq per packet, ignore mismatches. -> A tells the accident story.
- K3 Remove flow control: receiver buffer sixty-four KB and slow; direct, no proxy; ten MB at window sixteen 58.6 MB/s zero retx; window two fifty-six 1.8 MB/s and 25,411 retx; kernel buffer overflowed, silent drops, sender treated as network loss; bigger window thirty x slower. TCP avoids via advertised free space; add window field to ACK. -> B: "bigger window, slower?" A explains.
- K4 Nagle stall: ten-byte header, ten-byte body, two-byte reply after all twenty; time fifty requests; add TCP_NODELAY; Spark expect about forty ms vs well under a millisecond; Mac loopback couldn't reproduce (0.03 ms either way); check yourself; other fix: build whole message, one sendall. -> A.

## Explain It Back (content that must appear somewhere)

- E1 TCP vs UDP summary incl. cost: handshake, per-connection state, HOL. -> In closing restatement and throughout.
- E2 Stop-and-wait slow; BDP; window scaling; socket buffer sizes matter on long fast links. -> I24, PR1, I19; add "socket buffer sizes" line.
- E3 1,000 small requests cross-region, new connection each: TCP plus TLS 1.3 before request; slow start; seventy ms RTT -> about two hundred ten ms vs seventy, three x; TIME_WAIT, port exhaustion; fix: pool plus concurrency; keepalives through NAT or expect reconnect. -> A as worked scene near keep-alive section.
- E4 Scaling with distance and loss; why one MB/s on a gigabit; fixes: shorten RTT (serve closer), reuse warm connections, parallel connections, BBR. -> After Mathis.
- E5 HTTP/3 on UDP and Tailscale on UDP. -> QUIC and UDP sections.
- E6 Bursty tokens every forty ms: Nagle plus delayed ack; check TCP_NODELAY on server and any proxy (nginx, LB); also buffering at framework, reverse proxy response buffering, gzip on the stream. -> In Nagle section, B describes the symptom.

## Go Deeper / Connections

- G1 Best sources: Jacobson and Karels 1988 paper; Kurose and Ross chapter three. -> One sentence near end.
- C1 Connections: next, what happens when you hit enter (handshake on a timeline with DNS and TLS), TLS lesson explains the second round trip, HTTP from scratch (finding where a request ends in a stream), streaming lesson (TCP_NODELAY), home server lesson (TCP inside UDP). -> One or two sentences, folded before close.

## Flow

1. Problem: IP tries; what you rely on daily; B "the network is just reliable" -> no, TCP. Costs. UDP users.
2. Origin 1986 story.
3. Ports, sockets, four-tuple, figure 001.
4. UDP, then TCP promise, byte stream wrong model, headers figure.
5. Tricks one to three with Predicts and the simulator.
6. Real TCP refinements, flow control.
7. Handshake, first-byte Predict, close, TIME_WAIT, port exhaustion.
8. Keep-alive pair, plus the thousand-requests scene (E3).
9. Congestion control, sawtooth, slow start Predict, Mathis, E4 fixes, CUBIC, BBR.
10. Nagle and delayed ack, token stream symptom (E6).
11. HOL, QUIC, when to pick UDP, Tailscale.
12. Build It walk-through, Measure numbers, Break It.
13. Connections line, Go Deeper line, B restates, A sharpens, stop.
