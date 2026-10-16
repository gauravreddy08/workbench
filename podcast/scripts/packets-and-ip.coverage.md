# Coverage: packets-and-ip

Lesson src/lessons/packets-and-ip.mdx vs podcast/scripts/packets-and-ip.md. Item IDs match
podcast/outlines/packets-and-ip.md. All numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 Prereq: light in fiber 200 km/ms | Berlin Predict | "remember from the latency lesson, light in fiber does about two hundred kilometers per millisecond" | covered |
| P1 SSE scene, polling, WebSockets | Problem | "The server keeps one HTTP response open and just keeps writing little text events into it" | covered |
| P2 Radio doesn't know HTTP; router 2 m; ISP; ~10 machines; reply finds laptop not phone | Problem | "about ten machines you've never heard of each make a decision about your bytes" | covered |
| P3 Which is your IP (B wrong model) | Problem | "The first one, I'd say. That's the one the laptop itself reports" | covered |
| P4 ping 1.1.1.1 ~4 ms vs Berlin ~140 ms | Problem | "it comes back in about four milliseconds. A server in Berlin takes about a hundred and forty" | covered |
| P5 SSH from couch vs coffee shop | Problem | "From a coffee shop, without Tailscale, you can't" | covered |
| P6 One design decision 60s/70s | Problem | "one design decision, made in the sixties and seventies" | covered |
| O1 Circuit switching, held during silence, bursty computers | Origin | "Even while nobody was talking" | covered |
| O2 Baran, RAND, 1964, message blocks | Origin | "in nineteen sixty-four he wrote "On Distributed Communications"" | covered |
| O3 Davies, NPL, 1965, packets | Origin | "And he gave the blocks the name that stuck. Packets." | covered |
| O4 ARPANET, 29 Oct 1969, LO crash | Origin | "on the twenty-ninth of October, nineteen sixty-nine" | covered |
| O5 Cerf and Kahn May 1974, gateways | Origin | "in May nineteen seventy-four, Vint Cerf and Bob Kahn" | covered |
| O6 IP/TCP split; 1 Jan 1983 | Origin | "on the first of January, nineteen eighty-three" | covered |
| C1 Figure 001 described | Circuits vs packets | "Picture two little networks side by side" | covered |
| C2 Circuits work once; packets per-packet cost | Circuits vs packets | "Per packet, yeah, it is more expensive" | covered |
| C3 Statistical multiplexing; one fiber a neighborhood | Circuits vs packets | "That's called statistical multiplexing" | covered |
| C4 No setup | Circuits vs packets | "Second, no setup" | covered |
| C5 Survival, no state in middle | Circuits vs packets | "so nothing in the middle can lose it" | covered |
| C6 Best effort; reliability on top at edges; why TCP | Circuits vs packets | "And that has a name: best effort" | covered |
| E1 Envelope in envelope | Envelopes | "It gets put in an envelope. Which gets put in a bigger envelope" | covered |
| E2 Header, payload, protocol, encapsulation | Envelopes | "is called encapsulation. Unwrapping on the other side is decapsulation" | covered |
| E3 Application HTTP/SSE | Envelopes | "S S E is honestly just a text format for the body of an HTTP response" | covered |
| E4 Transport TCP, port, segments, sequence, UDP | Envelopes | "turns them into numbered chunks called segments" | covered |
| E5 Network IP, address, packet | Envelopes | "And this envelope is called a packet" | covered |
| E6 Link, MAC, frame, physical | Envelopes | "A frame only lives for one hop" | covered |
| E7 Figure 002 sizes 26/6/32/20/14 = 98; Wi-Fi, TLS | Envelopes | "And the whole frame on the wire is ninety-eight bytes" | covered |
| E8 Polling/SSE/WebSockets all HTTP (B confusion) | Envelopes | "Polling, S S E and WebSockets are all ways of using HTTP" | covered |
| E9 HTTP into TCP, TCP looks like a file | Envelopes | "to HTTP, T C P looks like a file" | covered |
| E10 Segments in IP packets, clean pipe | Envelopes | "look like a clean pipe" | covered |
| E11 Frame per hop | Envelopes | "A new frame on every link" | covered |
| E12 Polling many requests, SSE one never-ending | Envelopes | "S S E makes one HTTP request whose response just never ends" | covered |
| E13 OSI, L2/L3/L4/L7, L4 vs L7 LB | Envelopes | ""an L four load balancer"" | covered |
| E14 Predict overhead 6% then 2%, TLS 5+16+1 | Predict overhead | "a five-byte record header, a sixteen-byte authentication tag, and one byte of type" | covered |
| E15 15 KB/s per user; 5M pps, 1.5 GB/s; batching; pps metric | Predict overhead | "Five million packets per second, going out" | covered |
| J1 Server stack, dest = router public, TTL 64, MAC next router | Journey | "The destination address is your router's public address" | covered |
| J2 ISP router unwrap, TTL 63, checksum, new frame, 5-25 routers | Journey | "something like five to twenty-five routers here" | covered |
| J3 Home router TTL 62, NAT rewrite, Wi-Fi frame via ARP | Journey | "That's the only time anything above the I P header gets touched" | covered |
| J4 Laptop unwraps; TTL 62 = 2 routers; ACK; SSE event | Journey | "Sixty-four minus sixty-two" | covered |
| J5 Frame local, packet global (B wrong model) | Journey | "the frame is local, the packet is global" | covered |
| J6 Routers read IP header only | Journey | "routers only read the I P header" | covered |
| J7 End-to-end principle 1984, four nodes to billions | Journey | "called the end-to-end principle" | covered |
| A1 32 bits, dotted decimal | IP addresses | "thirty-two ones and zeros in a row" | covered |
| A2 Predict count 4.3B, reserved, 2011, private+NAT, IPv6 | IP addresses | "About four point three billion" | covered |
| A3 Network + machine, street and house | IP addresses | "Like a street name and a house number" | covered |
| A4 Slash notation, CIDR 1993 | IP addresses | "Classless Inter-Domain Routing, from nineteen ninety-three" | covered |
| A5 Prefix length, /24 = 256, doubles | IP addresses | "so two hundred fifty-six addresses" | covered |
| A6 Subnet mask, AND, netmask printed | IP addresses | "two fifty-five dot two fifty-five dot two fifty-five dot zero" | covered |
| A7 Subnet | IP addresses | "is a subnet" | covered |
| A8 Figure 004 slider | IP addresses | "If you drag a slider across that address" | covered |
| A9 Per-packet AND, default gateway | IP addresses | "it hands the packet to the default gateway" | covered |
| A10 Routing table lines incl loopback, 169.254 | IP addresses | "which is the self-assigned range" | covered |
| R1 ARP broadcast, 1982, cached | ARP | "the Address Resolution Protocol, from nineteen eighty-two" | covered |
| R2 Never ARPs for internet address (B wrong model) | ARP | "Your laptop never ARPs for an internet address" | covered |
| N1 RFC 1918, 1996, private ranges | NAT | "R F C nineteen eighteen" | covered |
| N2 Router two sides, public address | NAT | "Your router has two sides" | covered |
| N3 NAT table, Figure 005 | NAT | "keeps a table so replies can be rewritten back" | covered |
| N4 Rows expire | NAT | "Anywhere from tens of seconds for U D P to hours for T C P" | covered |
| N5 Unmatched inbound dropped (B firewall model) | NAT | "the router has no idea which of your devices they mean" | covered |
| N6 Port forwarding, Tailscale simultaneous | NAT | "Both sides send packets out at the same time" | covered |
| N7 100.64/10, CGNAT | NAT | "That's called carrier-grade NAT" | covered |
| N8 Hop 2 public, one NAT; hops 3-5 private in ISP | NAT | "you're behind only one NAT, not two" | covered |
| G1 Nobody knows whole path (B GPS model) | Routing | "nobody knows the whole path to anywhere" | covered |
| G2 Forwarding table, ~1M prefixes | Routing | "around a million I P version four prefixes" | covered |
| G3 Longest prefix match example | Routing | "That rule is called longest prefix match" | covered |
| G4 BGP, 75,000 networks, AS, IXPs | Routing | "roughly seventy-five thousand independent networks" | covered |
| L1 TTL, 64/128, seconds vs hops | TTL | "Windows uses a hundred twenty-eight" | covered |
| L2 ICMP, from router's own address | TTL | "that error comes from the router's own address" | covered |
| L3 Van Jacobson 1987 traceroute | TTL | "Van Jacobson noticed in nineteen eighty-seven" | covered |
| L4 ping TTL 3, NAT caught | TTL | "NAT, caught in the act" | covered |
| L5 Berlin floor 91 ms, measured 141-150, 25 hops | Berlin | "Ninety-one milliseconds is the floor" | covered |
| L6 Trace walk, silent hops, MPLS, 1.6x | Berlin | "The whole ocean, in one jump" | covered |
| L7 Stars not loss (B wrong model) | Berlin | "Stars mean that hop didn't answer in time" | covered |
| L8 Tokyo hop 3 287 ms, hop 4 4 ms | Berlin | "hop three at two hundred eighty-seven milliseconds" | covered |
| M1 MTU 1500 | MTU | "Fifteen hundred bytes on Ethernet" | covered |
| M2 MSS 1460, 1448 with timestamps | MTU | "it's fourteen forty-eight per segment" | covered |
| M3 16 GB = 11 million packets | MTU | "about eleven million packets" | covered |
| M4 Fragmentation | MTU | "that's fragmentation" | covered |
| M5 DF bit, PMTU discovery, IPv6 no fragmentation | MTU | "That's path MTU discovery" | covered |
| M6 ping 1472 ok, 1473 too long | MTU | "Message too long" | covered |
| M7 Tunnels, Tailscale 1280 | MTU | "Tailscale's interface uses an MTU of twelve eighty" | covered |
| B1 Queues drop, Wi-Fi retries, checksum | Loss | "Wi-Fi drops frames to interference" | covered |
| B2 No retry: state per conversation = circuit cost | Loss | "exactly the circuit-switching cost" | covered |
| B3 TCP resends, loss = slow down | Loss | "Loss is how the internet says "too much"" | covered |
| V1 IPv6 128-bit, 40-byte header, no checksum, hop limit, ND | IPv6 | "a fixed forty bytes, no checksum" | covered |
| V2 45-50% Google; his Mac fe80/fd, no route | IPv6 | "forty-five to fifty percent of Google's users" | covered |
| H1 SYN, handshake, 78 bytes | Header | "This SYN is seventy-eight bytes on the wire" | covered |
| H2 Big-endian | Header | "Network protocols write multi-byte numbers big-endian" | covered |
| H3 Ethernet 14 bytes, type 0800 | Header | "zero eight zero zero" | covered |
| H4 45, total length 64, DF | Header | "The four is the version" | covered |
| H5 TTL 64, protocol 6, checksum | Header | "That's the T T L, sixty-four, fresh from your Mac" | covered |
| H6 Source/destination addresses | Header | "The addresses start twelve bytes into the I P header" | covered |
| H7 TCP ports, seq, ack, offset 44, SYN, options | Header | "eleven times four, forty-four bytes" | covered |
| H8 Figure 006 rows, 20+44=64 | Header | "rows of thirty-two bits each" | covered |
| H9 Internet checksum worked example | Checksum | "The part that spilled over the top is just three" | covered |
| H10 TCP pseudo-header | Checksum | "a little "pseudo-header" with the two I P addresses" | covered |
| H11 TTL 54 = 10 routers | Checksum | "crossed ten routers" | covered |
| K0 Setup, sudo, own traffic | Build It | "everything you capture is your own traffic" | covered |
| K1 t0 addresses, public vs 100.64 | Build It | "is your public address your router's outside address" | covered |
| K2 t1 traceroute 4 targets, script, whois, floor, airport codes | Build It | "Second, trace three continents" | covered |
| K3 t2 capture curl, Ethernet on Wi-Fi, pcapng | Build It | "Third, capture your own curl" | covered |
| K4 t3 parser, pcap headers, hints | Build It | "Never assume a header is twenty bytes" | covered |
| K5 t4 read conversation | Build It | "Then you read the conversation out of your own output" | covered |
| K6 t5 NAT/Tailscale experiments | Build It | "three experiments on NAT and the Tailscale tunnel" | covered |
| K7 Done when | Build It | "You're done when you've got four traceroutes" | covered |
| X1 Reference numbers incl Tokyo | Measure | "Tokyo's about eight thousand three hundred kilometers away" | covered |
| X2 First hop most expensive per meter | Measure | "most expensive per meter in the whole path" | covered |
| X3 1.3-2x, 4x odd | Measure | "between one point three and two times" | covered |
| X4 Nearby is near, anycast, edge | Measure | "Cloudflare uses something called anycast" | covered |
| X5 Overhead SYN 78, ACK 66, 1514 96% | Measure | "A pure ACK with timestamps is sixty-six bytes" | covered |
| X6 MTU 1472 and 1252 | Measure | "twelve fifty-two" | covered |
| Z1 TTL 3 socket, TTL 9 connects, tcptraceroute | Break It | "T T L eight still failed and T T L nine connected" | covered |
| Z2 Tunnel too big, PMTU black hole, SSH ls | Break It | "path MTU black hole" | covered |
| Z3 Corrupt a byte, checksum offload | Break It | "That's called checksum offload" | covered |
| Z4 Forget neighbor, ARP for router | Break It | "But the ARP was for the router" | covered |
| Q1 All layers for SSE | Envelopes + close | "inside HTTP, inside T C P, inside I P, inside a Wi-Fi frame" | covered |
| Q2 What changes over ten routers | Journey + close | "knock one off the T T L, and wrap it in a brand-new frame" | covered |
| Q3 Outward works, inward doesn't | NAT + close | "a packet from a stranger matches no row in its table" | covered |
| Q4 Traceroute, stars, slow hop | TTL/Berlin | "Only latency that sticks around for all the later hops is real path latency" | covered |
| Q5 Scale 100k streams: 5M pps, ACKs 2.5M, 12 Gb/s, per-packet cost, batch 5 tokens/100 ms, edge | Predict overhead | "about five tokens per write" | covered |
| D1 Go Deeper: Cerf-Kahn, Anderson NAT post | Close | "David Anderson's post on how NAT traversal works" | covered |
| D2 Connections | Close | "It puts physical reasons under the network numbers" | covered |
