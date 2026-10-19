<!-- section: What actually leaves your laptop -->

A: [relaxed, thinking out loud] So you call a model API, and the tokens stream back. You know how that works. Server-sent events, one long HTTP response the server keeps writing into. You know polling, you know WebSockets. You can wire any of them up in ten minutes.

B: Sure. That part's comfortable.

A: So ask what actually leaves your laptop. Because your Wi-Fi radio has no idea what HTTP is. It's sending little bursts of bits to your router, a box a couple of meters away. And your router has no idea where Fireworks' servers are either. It just hands everything to your internet provider. And somewhere between there and a data center, about ten machines you've never heard of each make a decision about your bytes, in a few millionths of a second, without asking anyone.

B: [a bit unsure] I guess I've always pictured it as a connection. Like there's a line from my laptop to their server, and once it's open, my data just flows down it.

A: That's the picture almost everybody has. And it's the one the internet was specifically built not to be. There's no line. Nothing in the middle even knows your conversation exists. Your data gets chopped into small envelopes, each one with an address written on the front, and they get handed from machine to machine, each one on its own, until they arrive.

B: Each one on its own?

A: Each one. And once you see that, a bunch of everyday mysteries fall out. Like, your laptop says its address is one thing, and a "what's my IP" website says something completely different. Which is yours? Or, a server in your city answers in a few milliseconds and one in Berlin takes way longer. Who decides which way the bytes go? Or the one that bugs everyone with a home server. You can SSH into the Spark from the couch. From a coffee shop, without Tailscale, you can't. Why not?

<!-- section: Circuits and packets -->

A: [warm] It helps to know what came before. The phone network in the sixties was circuit switched. When you dialed, switches along the way connected a dedicated path of wire for you, end to end, and held it the whole call. Even while nobody was talking.

B: So that's my "line" picture.

A: That's your line. And it's great for voice. It's terrible for computers, because computers talk in bursts. A little bit of data, then nothing for minutes. And two people, separately, came up with something else. Paul Baran in the US was working out how a network could survive a nuclear attack. Donald Davies in Britain was trying to share expensive computers efficiently. Different reasons, same answer. Cut the message into small blocks, give each one the full address, and let each one find its own way. Davies gave them the name that stuck. Packets.

B: And that became the ARPANET?

A: That's where it got built. The very first message, in nineteen sixty-nine, was supposed to be the word "login". The operator typed L, O, and the system crashed. So the first thing ever sent was "LO".

B: [laughs] That's perfect.

A: And then by the early seventies there were several packet networks that couldn't talk to each other. Vint Cerf and Bob Kahn wrote up a common envelope format and a common addressing scheme that any network could carry, with boxes in between to pass things across. That got split in two later. IP for addresses and forwarding, TCP for reliable delivery. And that's what you're using right now.

B: So what does chopping things up actually buy you? It sounds like more work. Every packet has to be looked up separately.

A: It is more work per packet. But you get three big things. First, sharing. Nobody reserves a link. When you're quiet, your share carries someone else's packets, which is why one fiber can serve a whole neighbourhood. Second, no setup. You can send a packet to any address on Earth without asking anyone first. And third, survival. If a link dies, the next packet just goes another way. Nothing in the middle is holding anything about your conversation, so nothing in the middle can lose it.

B: And the catch?

A: Nobody promises anything. A router with a full queue just drops your packet. Two packets can go different ways and arrive out of order. The network makes a sincere effort and no guarantees. That even has a name. Best effort. Everything reliable you've ever used on the internet is built on top of that unreliable thing, by the two computers at the ends.

<!-- section: Envelopes inside envelopes -->

A: Here's the most useful picture in all of networking. Your token doesn't get "sent". It goes in an envelope, which goes in a bigger envelope, which goes in a bigger one. And each envelope is written by a different piece of software, answers a different question, and gets read by different machines.

B: Okay, from the inside out?

A: From the inside. The letter itself is the HTTP response, with your little server-sent event inside it. Just text. Then that gets handed to TCP. TCP's question is, which program on each machine, and in what order. Its address is a port, a number that picks out one program. Your server's on one port, your browser or your Python client is on another. And TCP numbers the chunks, so the other end can put them back in order and ask for missing ones.

B: Then IP.

A: Then IP. Its question is, which machine, anywhere on Earth. Its address is the IP address. And this envelope is the packet. This is the one routers read. And then the outermost one is the link. Wi-Fi or Ethernet. Its question is, which box on this one wire or this one radio. Its address is a hardware address, a MAC address. And that envelope only lives for a single hop.

B: [working it out] So for one token, there's the token, and then a pile of headers wrapped around it.

A: And the headers are most of it. For a single short token, the actual text is a tiny sliver of what goes on the wire. Almost all of it is envelope. Which doesn't matter for you, one user. But for a provider streaming to a huge number of people, it's mostly envelopes they're pushing, and the number of packets a second becomes something they really care about.

B: And polling versus SSE versus WebSockets is all just the innermost bit.

A: All the innermost bit. How often you open a request, and who talks when. The layers underneath don't care. A connection carrying SSE is just a connection where data trickles in.

<!-- section: One hop at a time -->

A: So now send it. And watch what each box in the middle actually does. Your packet goes to your router, wrapped in a Wi-Fi frame. The router tears off that frame, looks at the IP address, decides who's next, and wraps the packet in a brand new frame for the next link. Next router, same thing. Tear off the frame, read the address, new frame.

B: So the hardware address only matters for one hop.

A: Right. The frame is local. The packet is global. The server never learns your laptop's hardware address, and you never learn its. And here's the part I find kind of beautiful. The routers only read the IP part. They don't know there's TCP inside, never mind HTTP. Read the destination, look it up, tick a counter down by one, send it on. That's the whole job, done billions of times a second in the middle of the internet.

B: And everything else?

A: Happens at the two ends. Ordering, resending, ports, encryption, meaning. All of it in the two computers. That's on purpose. It's called the end-to-end principle. Keep the middle simple and fast, and put the clever stuff at the edges, because only the ends can really check it anyway. And it's why the internet could grow from four computers to billions without redesigning the routers every time somebody invented a new app.

B: [skeptical] Wait, so if a packet gets dropped, the router doesn't resend it?

A: No. And think about why that's right. A big router somewhere is handling millions of packets a second for millions of conversations. If it kept a copy of each one to resend, it'd have to remember something about every conversation going through it. That's exactly the cost packets were invented to get away from. So loss gets noticed at the ends. TCP sees a gap, or a missing acknowledgment, and sends it again. And TCP also treats loss as a sign that a queue somewhere is full, so it slows down. Loss is basically how the internet says "too much".

<!-- section: An address is a place -->

A: So how does a router know where to send things? An IP address isn't just a name. It's a location. The first part names a network, the rest names a machine on that network. Like a street and a house number.

B: And my laptop has one of those.

A: And it makes one tiny decision for every packet. Is this address on my own little local network? If yes, I can hand it over directly. If no, give it to the router. That's basically your laptop's whole idea of routing. Is it here, or is it the router's problem.

B: And to hand it to the router it needs the router's hardware address.

A: Which it finds by shouting. It sends a message to everything on the Wi-Fi: who has the router's address? And the router answers with its hardware address. That's called ARP. And notice, your laptop never shouts for a server's address out on the internet. For anything that isn't local, the only hardware address it ever needs is the router's. The IP envelope carries the real destination.

B: And beyond my router, nobody knows the whole route?

A: Nobody. Each router only knows, for this destination, which neighbour is next. One hop at a time. And the routers between big networks swap notes about which addresses they can reach, and those choices come down to business deals as much as distance.

<!-- section: Why nobody can reach your laptop -->

B: Okay, so the two IP addresses. My laptop says one thing, the website says another.

A: Right. There are only about four billion of the classic IP addresses. That's fewer than one per person, let alone per device. So a few blocks got set aside as private. Millions of homes use exactly the same private addresses at the same moment, and that's fine, because no router on the internet will carry a packet addressed to one. They only mean something inside your house.

B: So the address my laptop shows is one of those.

A: It is. Your router has two sides. Inside, it has a private address. Outside, your provider gave it one public one. When your packet heads out, the router rewrites the "from" address to its own public one, picks a port, and writes down a note. This outgoing thing was really my laptop. When the reply comes back to that port, it looks up the note and forwards it inside. That's NAT, network address translation.

B: [working it out] So the website sees my router's address. That's the "what's my IP" answer.

A: That's the one. And now here's the side effect that matters. Somebody out on the internet tries to SSH to your public address. It arrives at your router. And there's no note. Nobody inside asked for this. Your router has no idea which of your devices they mean. So it drops it.

B: So that's the coffee shop problem. The Spark is behind the router, and the router has no note for someone knocking from outside.

A: That's exactly the coffee shop problem. NAT was invented to save addresses, and it quietly became the reason home machines can't be reached from outside. Getting around it is basically what Tailscale is for. The short version of its trick is both sides send packets outward at the same time, so each router writes a note that lets the other side's packets in.

<!-- section: A counter that ticks down -->

A: One more field worth knowing. A routing mistake could send a packet round in a circle forever. So every packet carries a counter. It starts at some number, and every router knocks one off. When it hits zero, the router drops it. That's the TTL, time to live. It was meant to be seconds, but really it's a count of hops.

B: And the router just throws it away silently?

A: It sends a little error back to the sender. "Time exceeded." From the router's own address. And in the late eighties Van Jacobson noticed you could abuse that. Send a packet with the counter set to one. The first router kills it and tells you who it is. Set it to two, the second router tells you. Keep going until you get there. That's traceroute.

B: [laughs] That's clever. Using the error message as a map.

A: And it's a great way to feel where time goes. When I traced to a university in Berlin, the first few hops were a few milliseconds each, still near home. And then the whole ocean happens in one jump. Suddenly it's around a hundred and forty milliseconds. And if you work out how fast light goes in fiber, the best possible round trip over that distance is about ninety. So most of that long path is just distance. Real cables follow coastlines and seabeds, not straight lines.

B: I've seen traceroutes with stars all over them. Does that mean packets are getting lost?

A: Usually not. A star just means that router didn't send the error back in time. Plenty of them are set to ignore those or only answer slowly. Same with one hop in the middle that looks really slow, and then the next hop is fast again. Routers forward real traffic in fast hardware, but they make those error replies in a slow side path. If a delay doesn't carry on to every later hop, it's the router being lazy about replying, not your packets being slow.

B: Is there a limit on how big each envelope can be?

A: There is, for each link. On normal Ethernet and home Wi-Fi it's about fifteen hundred bytes per packet. So a big model download is millions of separate packets, each forwarded on its own. And tunnels like a VPN wrap your packet inside another packet, so there's less room inside. Which can bite you in strange ways, like a connection that opens fine and then hangs on the first big transfer. But that's a story for when we get to Tailscale.

<!-- section: Ending -->

B: Okay, let me try it. There's no line between me and the server. My data's chopped into packets, each one wrapped in layers. The token, then TCP for which program, then IP for which machine, then the Wi-Fi or Ethernet frame for one hop. Routers only read the IP address, pass it on one hop, and if something goes wrong, they just drop it. And my router rewrites my address on the way out, so nobody outside can start a conversation with me.

A: That's it. The piece I'd sharpen is the "they just drop it" part, because it's not a flaw. It's the design. The middle stays simple and remembers nothing, so it can be fast and it can survive anything. All the promises, ordering, retries, slowing down when things get crowded, are made by the two computers at the ends. Which is exactly what TCP is. So when you measure a latency number, you're seeing envelopes crossing real distance through boxes that promised nothing, and two ends working hard to make that look like a clean pipe.
