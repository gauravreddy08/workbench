# Outline: packets-and-ip

Source: src/lessons/packets-and-ip.mdx. Curriculum entry: "How does data travel?" Question: what is an
IP address, a packet, and a route, and what happens between my laptop and a server? Why: the base
layer under every API call, every SSH session, and every latency number you measure.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).
Diagnostic gap touched: Numbers (bytes, bandwidth, "how does it scale"). Nailed in the overhead
Predict and the hundred-thousand-streams scale answer, with B guessing first.

## Today / prerequisites

- T1 Prereq: round-trip numbers and light in fiber (about 200 km per ms) from "How slow is slow?" -> A re-explains in one line when the Berlin floor comes up. Today bullets skipped as a list.

## The Problem

- P1 Scene: model API streams tokens over SSE (Term: server keeps one HTTP response open, writes small "data:" text events, blank line between). He knows polling, WebSockets, can wire them. -> A opens on this scene.
- P2 What leaves the laptop: Wi-Fi radio doesn't know HTTP, sends frames to a router two meters away; router hands to ISP; about ten machines each decide in microseconds; reply addressed to router's address, still finds laptop not phone. -> A, story.
- P3 Puzzle 1: laptop says 192.168.86.87, "what's my IP" site says something else, Tailscale says 100.something. Which is your IP? -> B voices wrong model ("the laptop's own number is my IP").
- P4 Puzzle 2: ping 1.1.1.1 about 4 ms, Berlin about 140 ms; who decides the way? -> A.
- P5 Puzzle 3: SSH to Spark from the couch works, from a coffee shop without Tailscale doesn't. -> A.
- P6 One design decision from the 60s and 70s: small self-addressed envelopes, every box forwards each on its own. -> A.

## Origin

- O1 1960s phone network circuit switched: dedicated path held for the whole call even in silence; good for voice, wasteful for bursty computers. -> A.
- O2 Paul Baran, RAND, surviving nuclear attack, "On Distributed Communications" 1964: mesh, no center, message blocks route around damage. -> A.
- O3 Donald Davies, National Physical Laboratory, 1965, sharing expensive computers, named them packets. -> A.
- O4 ARPANET, US Defense funding, packet switching; first message 29 October 1969 UCLA to SRI; typed "LO" of LOGIN, crashed. -> A; B reacts.
- O5 Early 70s several packet networks (ARPANET, packet radio, satellite) couldn't talk. May 1974 Cerf and Kahn paper: common envelope + addressing, gateways (routers) between. -> A.
- O6 Later split into IP (addressing, forwarding) and TCP (reliable delivery); 1 January 1983 ARPANET switched to TCP/IP. -> A.

## Circuits vs packets

- C1 Figure 001: left, a reserved path held even during silence; right, numbered packets each carrying address, sharing links with others' packets, different paths, out of order. -> A describes as phone-diagram.
- C2 Circuits do the hard work once; packets: every box looks up every packet; more expensive per packet. -> A; B: "sounds worse".
- C3 Sharing / statistical multiplexing (Term): bet senders not all busy at once; one fiber serves a neighborhood. -> A.
- C4 No setup: send to any address on Earth without asking. -> A.
- C5 Survival: link dies, next packet takes another path; nothing in middle holds conversation state, so nothing can lose it. -> A.
- C6 Price: best effort (Term: may drop, delay, duplicate, reorder, won't tell you). Full queue drops. Reliability built on top at the edges; reason TCP exists. -> A; B wrong model "so the internet is reliable underneath?"

## Envelopes inside envelopes

- E1 SSE event goes in envelope inside envelope; each written by different software, answers a different question, read by different machines. -> A.
- E2 Terms: header (fields on the front; payload is what's described), protocol (agreed format and rules), encapsulation (whole message unchanged as payload; decapsulation). -> A inline.
- E3 Application: HTTP, SSE is a text format for the body, "data:" lines, blank lines; neither knows the network. -> A.
- E4 Transport: TCP, which program and in what order; port (16-bit, 0 to 65535; 80 HTTP, 443 HTTPS, 22 SSH; clients random high); segments with sequence number; UDP is ports only, next lesson. -> A.
- E5 Network: IP, which machine on Earth; IP address (32 bits, four bytes in decimal); packet (header with source, destination, TTL, protocol, plus payload); the layer routers read. -> A.
- E6 Link: Ethernet or Wi-Fi, which box on this one wire or radio; MAC address (48-bit, only meaningful locally, routers never forward it); frame (link header, payload, checksum at end); lives one hop. Physical layer below, not opened. -> A.
- E7 Figure 002: one token " Hello" as SSE event 26 bytes; 6 bytes HTTP chunk framing; TCP 20 plus 12 options = 32; IP 20; Ethernet 14; 98-byte frame; Wi-Fi headers bigger; real HTTPS adds TLS. -> A describes as nested boxes sizes; B asks for numbers.
- E8 Direct answer: polling, SSE, WebSockets all ways of using HTTP (WebSockets start as HTTP then switch); differ in how often you open a request and who talks when. -> B voices confusion "I file SSE next to TCP"; A answers.
- E9 HTTP is text (HTTP/2 binary frames) written into TCP; to HTTP, TCP is a file you write and read, reliable and in order. -> A.
- E10 TCP cuts stream into segments, each in one IP packet; makes unreliable network look like a clean pipe. -> A.
- E11 Each IP packet in a link frame one hop at a time; new frame on each link. -> A.
- E12 Polling: many short requests, maybe new TCP connections; SSE one request whose response never ends; below doesn't care; TCP carrying SSE is TCP with trickling data. -> A.
- E13 OSI (Term, 1980s ISO seven layers); need four numbers: L2 link, L3 IP, L4 TCP/UDP, L7 HTTP; L4 load balancer forwards TCP without reading, L7 reads HTTP (load-balancing lesson). -> A, brief.
- E14 Predict overhead: 6 of 98 is about 6%. Real API: about 200-byte JSON event, TLS about 22 bytes (5 header, 16 tag, 1 type), 6 chunk, 32+20+14 headers: about 300 bytes for 6 bytes token, 2%. -> A asks, B guesses.
- E15 Does it matter: per user 50 tokens/s × 300 B = 15 KB/s nothing; provider at 100,000 streams: 5 million packets/s, about 1.5 GB/s, nearly all envelope; batch tokens per write; packets per second is a capacity number. -> A, B underestimates.

## The journey (Figure 003)

- J1 Figure 003 stepped: server app has 26 bytes; HTTP chunk wraps (length 26, line ending); TCP adds ports 80 to 40112 and sequence number; IP adds destination = router's public address (only address server has seen), TTL 64; Ethernet frame to next router, server never learns laptop MAC. -> A walks it.
- J2 ISP router: frame addressed to it, unwraps and throws away; reads only IP destination, looks up, TTL 64 to 63, fixes checksum; new frame to home router WAN side; real life 5 to 25 routers each repeating. -> A.
- J3 Home router: unwrap, TTL to 62; NAT looks up port 40112, finds laptop port 52814, rewrites destination address and port, only time above IP touched; new Wi-Fi frame to laptop MAC learned by ARP. -> A.
- J4 Laptop: MAC is mine, type says IPv4; IP: address mine, protocol 6 TCP, TTL 62 means 2 routers; TCP: port belongs to socket, sequence is next expected, buffer, send ACK; HTTP strips chunk framing; SSE parser sees event; 26 bytes message, 98 frame. -> A.
- J5 Takeaway: frame local, packet global; MACs one link; server never learns laptop MAC and vice versa. -> A; B wrong model "the server knows my laptop".
- J6 Routers only read IP header: destination, table lookup, TTL decrement, checksum recompute, send; billions of times a second in the core. -> A.
- J7 Ends do everything else: ordering, retransmission, ports, encryption, meaning; end-to-end principle (Saltzer, Reed, Clark 1984): features like reliability belong at ends, keep middle simple; grew from four nodes to billions without redesigning routers per new app. -> A.

## IP addresses

- A1 IPv4 32 bits written as four decimal bytes because easier than 32 ones and zeros. -> A.
- A2 Predict count: 2 to the 32 = about 4.3 billion, a few hundred million reserved; 8 billion people, 20 to 30 billion devices. Central registry last blocks 2011, regionals over following decade. Works because private addresses reused + NAT shares one public; IPv6 has 2 to the 128. -> A asks, B guesses.
- A3 Address is a location: first part network, rest machine; street and house number. -> A.
- A4 Slash notation: 192.168.86.0/24 = first 24 bits network; CIDR (1993, starting address + fixed leading bits; 10/8 = everything starting with 10). -> A.
- A5 Prefix length: /24 leaves 8 bits, 256 addresses; each bit fewer doubles. -> A.
- A6 Subnet mask: /24 = 255.255.255.0; 24 ones then 8 zeros; AND gives network part; Mac printed netmask 0xffffff00. -> A, in words.
- A7 Subnet: block on one local link, reach each other directly without a router. -> A.
- A8 Figure 004: 32 bits with network part highlighted, slider doubles block per bit; addresses to try; readout says private/public; last row the decision: same subnet deliver directly, else router. -> A describes dragging.
- A9 Per-packet AND: inside my subnet? direct; else default gateway (Term: router you send to when destination not on your subnet; home Wi-Fi router). That's the laptop's whole routing table basically. -> A.
- A10 netstat -rn: home subnet direct on en0; default to the router; loopback line 127; 169.254 self-assigned when nobody hands out an address. -> A in words.

## ARP

- R1 Deliver directly needs MAC; laptop broadcasts "who has the router's address? tell me"; router answers with MAC; ARP (1982), cached few minutes. -> A.
- R2 arp -a shows router, phone, iPad; not 1.1.1.1 or any server; never ARPs for internet address; off-subnet only needs router's MAC, IP header carries real destination. -> B wrong model: "ARPs for the server".

## Private addresses and NAT

- N1 192.168, 10/8, 172.16/12 set aside 1996 (RFC 1918) as private; internet routers refuse to carry them; millions of homes use exactly the same address at once. -> A.
- N2 Router two sides: inside 192.168.86.1, outside one public address from ISP (Term). -> A.
- N3 NAT (Term): rewrites source to public address and fresh port, records it; reply to that port rewritten back. Figure 005: home LAN with laptop and Spark, router with table, server, stranger's packet dropped; addresses illustrative documentation ranges. -> A describes like phone diagram.
- N4 Rows expire: tens of seconds UDP to hours TCP, router-dependent. -> A.
- N5 Side effect: unmatched inbound has nowhere to go, dropped; stranger SSH to router's public address port 22; router doesn't know which device. NAT invented to save addresses, became reason home machines unreachable. -> B wrong model "router's firewall blocks it on purpose"; A corrects.
- N6 Workarounds: port forwarding; Tailscale: both sides send out at same time so each router creates a row; Tailscale lesson. -> A.
- N7 Tailscale 100.x addresses from 100.64.0.0/10, set aside for ISPs doing NAT on top of yours; CGNAT (Term: ISP puts many customers behind one public; you're behind two NATs). Try 100.101.102.103 in the figure. -> A, resolves P3.
- N8 Traceroute: hop 2 a public address (ISP), so router has a real public address, one NAT; hops 3 to 5 10.20 private inside ISP; ISPs use private space for internal links. -> A.

## Routing

- G1 Nobody knows the whole path; each router knows only next neighbor for this destination. -> A; B wrong model "someone plans the route".
- G2 Forwarding table (Term) of prefixes; core router around a million IPv4 prefixes. -> A.
- G3 Longest prefix match: /8 and /24 both contain 203.0.113.10; /24 wins, most specific; hardware few nanoseconds. -> A, example in words.
- G4 Inside an org routers tell each other automatically; between orgs BGP (Term): about 75,000 independent networks announce prefixes, neighbors accept based on business as much as distance; autonomous system with ASN; internet exchanges (DE-CIX Frankfurt) and private links; network of networks. -> A.

## TTL and traceroute

- L1 Routing mistake could loop forever; TTL (8-bit counter); sender sets it (macOS/Linux 64, Windows 128); each router subtracts one; at zero dropped; meant as seconds, really hop count. -> A.
- L2 ICMP (Term): IP's error and diagnostic messages, time exceeded, unreachable, too big, echo for ping; error comes from router's own address. -> A.
- L3 Van Jacobson 1987: TTL 1 first router tells you, TTL 2 second, etc. That's traceroute; can do by hand with ping. -> A.
- L4 ping with TTL 3 to 1.1.1.1: hop 3 private ISP router replies with copy of dropped header; its source is your private address; home router un-NATed the error. NAT caught in the act. -> A, B gets it.
- L5 Predict Berlin: about 9,100 km; light 200 km per ms; floor 91 ms round trip; measured 141 to 150 ms over 25 hops. -> A asks, B works out floor.
- L6 Trace walked: router 5.6, ISP 9, inside ISP 5.1, hop 6 backbone still West Coast 4.5, hops 7 to 14 no reply, hop 15 Zayo in Europe 140.7, hop 16 DE-CIX Frankfurt 140.8, hop 17 DFN German research network 145.5, hop 25 TU Berlin 150.7. Ocean in one jump. Silent hops in Zayo's backbone don't answer probes or hidden by MPLS tunneling. Cables not great circles; 1.6 times floor normal. -> A narrates.
- L7 Trap: stars mean no answer in time, not loss; routers ignore/rate-limit ICMP. -> B wrong model.
- L8 Trap: slow middle hop isn't slow path: Tokyo hop 3 287 ms, hop 4 4 ms; forward in fast hardware, ICMP in slow low-priority CPU; only spikes that carry forward are real. -> A.

## MTU and fragmentation

- M1 MTU (Term): largest IP packet a link carries in one frame; 1500 on Ethernet and nearly all home networks; Mac printed mtu 1500. -> A.
- M2 MSS: minus 20 IP and 20 TCP = 1460; with 12-byte timestamp option 1448. -> A.
- M3 16 GB model file is about 11 million packets each forwarded and acknowledged individually. -> A, number with feel.
- M4 Fragmentation (Term): old answer, router chops, receiver reassembles; slow and fragile, lose one fragment lose the packet. -> A.
- M5 DF bit (Term) + path MTU discovery: drop rather than split, send back "too big" with size; sender shrinks. IPv6 routers never fragment. -> A.
- M6 ping with DF and 1472 bytes payload: 28 bytes headers (20 IP + 8 ICMP) makes 1500, works; 1473 "Message too long", Mac refuses. -> A.
- M7 Tunnels wrap packet in packet, less room; Tailscale MTU 1280; test in Break It. -> A.

## Loss and best effort

- B1 Router queue per outgoing link; arrivals faster than link, queue fills, drops next arrival; Wi-Fi drops to interference, retries a few times; bit flip fails checksum, thrown away. -> A.
- B2 IP doesn't retry or tell: Frankfurt router handling millions of packets/s for millions of conversations; keeping copies means state per conversation = circuit cost. -> A; B asks why not retry.
- B3 Ends detect: TCP notices gap or missing ack and resends; treats loss as signal of full queue, slows down; loss is how the internet says "too much"; TCP lesson builds this. -> A.

## IPv6

- V1 128-bit addresses, hex groups, enough for every device unique, no NAT; header fixed 40 bytes, no checksum, routers never fragment; ideas carry over: prefixes, routing, hop limit, neighbor discovery instead of ARP. -> A.
- V2 About 45 to 50% of Google users reach it over IPv6 (Google publishes live number). His: only fe80 link-local and fd private addresses; ping6 says no route to host; ISP/router not handing out global v6; IPv4 and NAT all the way. -> A.

## Reading a header

- H1 Everything is fields in a header, bytes in a fixed layout. SYN (Term): first packet of a TCP connection; SYN-ACK, ACK = three-way handshake. 78 bytes, made-up MACs, documentation server address. -> A.
- H2 Big-endian (Term): most significant byte first like on paper; network byte order; Mac CPU little-endian so parsers convert; "zero zero five zero" is 80. -> A.
- H3 Predict decode: first 14 bytes Ethernet: destination MAC (router), source MAC (laptop), type 0800 = IPv4. -> A asks B to try; B gets part.
- H4 IP: 45 = version 4, header length 5 × 4 = 20; total length 64 (20 IP + 44 TCP, no data in SYN); identification; flags DF set, offset 0. -> A.
- H5 TTL 64 fresh from Mac; protocol 6 TCP; header checksum. -> A.
- H6 Source 192.168.86.87; destination 203.0.113.10; 12 bytes into IP header, 4 each. -> A.
- H7 TCP: source port 52814 random from OS; destination port 80; 4-byte sequence number; zero ack; data offset 11 × 4 = 44; flags = SYN; rest is window and options (MSS 1460, window scaling, timestamps, SACK). -> A.
- H8 Figure 006: 32 bits per row; IP rows shaded, TCP rows white; window 65535; options 24 bytes, window scale 6; 20 + 44 = 64 = total length. -> A describes layout.
- H9 Header checksum (internet checksum Term): add ten 16-bit words with checksum zero, fold carry into low 16 bits, flip bits; result matches bytes 24-25; receiver sum including checksum gives all ones, passes. Cheap enough every router redoes after TTL. -> A in words with small worked example; no hex read.
- H10 TCP checksum same arithmetic over whole segment plus pseudo-header of IP addresses: catches delivery to wrong machine. -> A.
- H11 TTL 54 arriving: started 64 (Linux), crossed 10 routers; cross-check traceroute. -> A.

## Build It

- K0 Setup: folder, everything on Mac, Spark cameo, capture needs sudo, own traffic only. -> one sentence.
- K1 t0: find private IP, mask/MTU/MAC, gateway, routing table, ARP cache, DNS server, public IP, Tailscale address and MTU, Mac and Linux commands; mtr optional, traceroute and tcpdump ship, Wireshark optional. Question: is public IP router's WAN or inside 100.64/10 (second NAT)? Own traceroute suggests real public. -> A summary.
- K2 t1: traceroute four targets: 1.1.1.1, US East university (maybe CDN), TU Berlin, U Tokyo; no reverse DNS, three probes per hop; hops.py: per hop address, best RTT, jump from previous answering hop, flag over 20 ms; whois owner (skip private); light floor function. Explain each big jump physically and vs floor; reverse DNS airport/city codes (fra, lhr, sjc, nrt). -> A.
- K3 t2: capture plain HTTP curl to example.com on port 80 with tcpdump filtered by address; about a dozen packets: handshake, request, response, ACKs, close; view one-line and hex; whole packets; Mac shows Wi-Fi as Ethernet frames, first 14 bytes Ethernet; pcapng magic gotcha, re-capture or convert. -> A.
- K4 t3: parser, standard library: pcap 24-byte global header, 16-byte record header per packet; magic number tells file header byte order (little-endian on Mac); packet bytes network order. Functions: checksum, read_pcap, ethernet, ipv4 (slice by total length), tcp (pseudo-header checksum). Hints: IHL low 4 bits ×4, TCP data offset high 4 bits of byte 12; never assume 20; flags bit order FIN SYN RST PSH ACK URG ECE CWR; pseudo-header; Ethernet 60-byte minimum padding not TCP data; decode payload shows GET in clear; check vs tcpdump verbose. Do on paper first. -> A, the part that matters.
- K5 t4: read conversation: SYN-ACK ack = SYN seq + 1; server TTL, guess start 64/128/255, count routers vs traceroute; GET packet HTTP bytes vs frame, fraction envelope; largest segment 1448 or 1460, timestamp option kind 8. Ask agent to explain, not fix. -> A.
- K6 t5: three experiments: http.server on 9000; from Spark works; phone on cellular to public IP fails, no NAT row; over Tailscale works; stop server. tailscale netcheck shows public IP:port mapping, MappingVariesByDestIP. tcpdump UDP 41641 while pinging Spark's Tailscale address: encrypted UDP between real addresses, envelope in envelope; capture on utun shows plain ICMP. Agent reviews paragraphs. -> A.
- K7 Done when: four traceroutes explained vs floor; parser matches tcpdump; decoded one by hand; can say private IP, public IP, gateway MAC, why a stranger can't reach the laptop. -> folded into A's Build It close, one sentence.

## Measure

- X1 Reference: router about 3 ms (Wi-Fi; wired well under 1 ms); 1.1.1.1 9 of 9 hops about 4.5 ms, anycast (same address from hundreds of cities, BGP sends you to nearest); Berlin 11 of 25 answering, 141-150, floor 91 at 9,100 km, ratio 1.6, via DE-CIX; Tokyo 13 of 25, never reached, 122-128 at last answering hop, floor 83 at 8,300 km, jump to about 95 at hop 7 Pacific on Arelion. -> A, B asks Tokyo ratio.
- X2 First hop most expensive per meter: 3-5 ms over two meters is all Wi-Fi (radio waits for quiet, acks, retries); cable drops to fraction of a ms. -> B surprised.
- X3 Most of a long path is distance: RTT/floor usually 1.3 to 2× (coastlines, seabeds, BGP business); 4× means detour or CDN not where you think. -> A.
- X4 Nearby is near: 1.1.1.1 at 4 ms is in your city; API latency often to nearest edge, real work elsewhere. -> A.
- X5 Overhead table: SYN 78 bytes, 100% overhead; pure ACK with timestamps 66; full data segment 1514 (1500+14) about 96% data; small = envelope, big = data, latency-vs-bandwidth split. -> A.
- X6 MTU: largest DF ping to 1.1.1.1 should be 1472; to Spark's Tailscale address predict 1280 − 28 = 1252. -> A.

## Break It

- Z1 Run out of TTL: Python socket with TTL 3 connecting to 1.1.1.1 port 80; tcpdump shows SYN out, ICMP time exceeded from hop 3; OSError (timeout or host unreachable); TTL 8 failed, 9 connected; 9 hops; TCP traceroute, how tcptraceroute gets through firewalls blocking UDP probes. -> what-if exchange.
- Z2 Too big for tunnel: DF ping 1472 to Tailscale address, shrink until works; boundary 1252? PMTU black hole (Term): too-big errors blocked, big packets vanish, small work; connections open then hang on first big transfer; SSH connects but hangs on ls in big directory. -> exchange.
- Z3 Corrupt a byte: flip TTL bit, IP checksum fails; flip payload bit, IP passes (header only) but TCP fails. Outgoing packets in capture have wrong TCP checksums: checksum offload, card fills in after tcpdump copy; Wireshark setting; if parser flags only outbound, that's why. -> B wrong model "my capture is corrupt".
- Z4 Forget neighbor: delete ARP entry for router, tcpdump arp, ping 1.1.1.1; see broadcast who-has router and reply before ping goes; proof off-subnet needs only gateway MAC. -> exchange.

## Explain It Back (substance, no quiz)

- Q1 All layers for SSE stream: SSE event text in long HTTP response body; with HTTPS, TLS records; into TCP: ports + sequence numbers + acks, complete and in order; segment in IP packet: source/destination machine addresses + TTL, what routers read; IP in link frame with MACs for one hop, rebuilt at every router; polling/SSE/WebSockets differ only at top. -> B's ending restatement + E sections.
- Q2 Ten routers: frame replaced every hop (new MACs, maybe different link type); TTL down one per router, checksum recomputed; rest of IP header, TCP, payload unchanged unless NAT rewrites (and fixes checksums); routers never read TCP/HTTP. -> J section + ending.
- Q3 Why outward works, inward doesn't: private address not carried by internet routers, reused in millions of homes; router has public address, NAT rewrites and records; inbound without row can't be matched, dropped; port forwarding or Tailscale simultaneous send. -> N section.
- Q4 Traceroute: TTL 1, 2, 3; time exceeded from router's own address; stars: rate-limit/ignore/MPLS; huge one-hop latency that doesn't carry forward = slow ICMP generation in CPU path; only persistent latency is real. -> L section.
- Q5 Scale: 100,000 users × 50 tokens/s = 5 million packets/s out, plus up to that many ACKs back (TCP acks every second packet, so maybe 2.5 million); about 300 bytes per frame = 1.5 GB/s, about 12 Gb/s, almost all headers and JSON; bottleneck per-packet work (system calls, interrupts, encryption per record, load balancer packet processing), not bytes. Fixes: fewer bigger packets, batch tokens per event/write (flush every 100 ms at 50 tokens/s = about 5 tokens per write, 5× fewer packets, at most 100 ms extra delay), trim JSON, HTTP/2 or 3 to share connections; edge near users cuts 50-150 ms of round trip no code can. -> extended exchange after overhead Predict, B guesses.

## Go Deeper / Connections

- D1 Best sources: Cerf and Kahn 1974 paper; Anderson's "How NAT traversal works" (Tailscale blog). -> one closing sentence.
- D2 Connections: puts physical reasons under latency-numbers (light floor + crooked cables, first meter Wi-Fi costs more than a hundred km of fiber); opens Wire track: TCP and UDP, what happens on enter (DNS), TLS envelope, streaming, home server (NAT, MTU, 100.64); L4 vs L7 = which envelope the load balancer opens. -> one or two sentences near the end.

## Flow

Problem scene (SSE, what leaves the laptop, three puzzles with B's wrong "which is my IP") -> Origin
story -> circuits vs packets, best effort -> envelopes and the SSE/HTTP/TCP/IP connection (B voices the
confusion) -> overhead Predict and the scale numbers (Q5 folded here) -> the journey stepped through
-> addresses, count Predict, prefixes, the per-packet decision, routing table -> ARP -> private and NAT,
resolving the three puzzles -> routing and BGP -> TTL, traceroute, Berlin Predict, two traps -> MTU ->
loss -> IPv6 -> header decode and checksum -> Build It -> Measure -> Break It -> connections + one
source sentence -> B's restatement, A sharpens, stop.
