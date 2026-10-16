<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you call a model API, and the tokens stream back. Server-Sent Events, S S E. And you know how that works, right? The server keeps one HTTP response open and just keeps writing little text events into it. A line that starts with "data", then the token, then a blank line. And you know polling is "ask again every second", and WebSockets are "a two-way pipe". You can wire up all three. But here's the thing. What actually leaves your laptop?

B: I mean... the request? The HTTP request goes to the server.

A: [leaning in] Okay, but your Mac's Wi-Fi radio has no idea what HTTP is. None. It sends frames of bits to your router, a box like two meters away. And your router doesn't know where Fireworks' servers are either. It just hands everything to your ISP. And somewhere between there and a data center, about ten machines you've never heard of each make a decision about your bytes. In a few microseconds. Without asking anyone. And then the answer comes back, and it's addressed to your router's address, not your laptop's... and it still finds your laptop. Not your phone. Your laptop.

B: [skeptical] Okay, that last part I genuinely can't explain.

A: And there's a few more like it that you've probably seen. You run the command that prints your laptop's address, and it says one ninety-two dot one sixty-eight dot eighty-six dot eighty-seven. Then you go to one of those "what's my IP" websites and it says something completely different. And your Spark, over Tailscale, is a hundred dot something dot something. So which one is your IP?

B: The first one, I'd say. That's the one the laptop itself reports. The website's showing, I don't know, the router's or something, but my IP is the laptop's.

A: Hold onto that, because by the end it's going to look different. Second one. You ping one dot one dot one dot one, Cloudflare, and it comes back in about four milliseconds. A server in Berlin takes about a hundred and forty. Who decides which way the bytes go? And third. You can SSH into the Spark from the couch. From a coffee shop, without Tailscale, you can't. Why not?

B: Firewall?

A: [amused] Kind of, but not the way you mean. All three answers come from one design decision, made in the sixties and seventies. Chop everything into small envelopes that each carry their own address, and let every box on the way forward each one on its own.

<!-- section: Origin -->

A: [storytelling] So, the world before that. The phone network in the nineteen sixties was what's called circuit switched. When you dialed, switches along the way physically connected a dedicated path of wire for you, end to end, and held it for the whole call. Even while nobody was talking. And that's great for voice. It's really wasteful for computers, because computers talk in bursts. A few kilobytes, then silence for minutes.

A: And two people, independently, proposed something else. Paul Baran, at RAND, was studying how a communications network could survive a nuclear attack. And in nineteen sixty-four he wrote "On Distributed Communications". A mesh of nodes, no center, with messages cut into small "message blocks" that each find their own way and route around damage. Then Donald Davies, at Britain's National Physical Laboratory, got to the same design in nineteen sixty-five, for a totally different reason. He wanted to share expensive computers efficiently. And he gave the blocks the name that stuck. Packets.

B: So one guy's worried about bombs and the other's worried about utilization.

A: [laughs] Yeah, and they land on the same answer. Then ARPANET, funded by the US Defense Department, used packet switching. Its first message went from UCLA to S R I on the twenty-ninth of October, nineteen sixty-nine. The operator typed the "L O" of "LOGIN"... and the system crashed.

B: [laughs] So the first word on the internet was "lo".

A: Pretty much. And by the early seventies there were several packet networks, ARPANET, packet radio, satellite links, and none of them could talk to each other. So in May nineteen seventy-four, Vint Cerf and Bob Kahn published "A Protocol for Packet Network Intercommunication". A common envelope format and addressing scheme that any network could carry, with gateways between the networks. Today we'd call those gateways routers. That protocol later got split in two. I P, for addressing and forwarding. And T C P, for reliable delivery. And on the first of January, nineteen eighty-three, ARPANET switched over to T C P slash I P for good. Which is what you're using right now.

<!-- section: The Idea: Circuits vs packets -->

A: [sketching it out] So start with the difference that drove everything. Picture two little networks side by side. Same shape on both: a box A on the left, a box B on the right, and three switches in between, with links criss-crossing. On the left side, the circuit, one path from A to B is drawn thick. Reserved. And underneath it says "held for the whole call, even during silence". On the right side, the packet side, there's no thick path. There are little numbered blocks, one, two, three, scattered across different links, and some pale blocks that belong to other people. Each packet carries the full destination address, shares the links with everyone else's packets, may take a different path, and can arrive out of order.

B: Okay, but that sounds strictly worse. Every packet has to be figured out separately?

A: Per packet, yeah, it is more expensive. With circuits, the network does the hard work once, sets up the path, and then forwarding each bit is trivial. With packets, every box on the way looks up every packet, every time. But it buys you three huge things. First, sharing. A link isn't reserved for anybody. When you're silent, your share of the link is carrying someone else's packets. That's called statistical multiplexing. It's sharing a link among many senders on the bet that they won't all be busy at once, and it uses capacity way better than reserving a fixed slice for each. It's why one fiber can serve a whole neighborhood. Second, no setup. You can send a packet to any address on Earth without asking anyone first. And third, survival. If a link dies, the next packet just takes another path. Nothing in the middle holds any state about your conversation, so nothing in the middle can lose it.

B: And the catch?

A: The catch is nobody promises you anything. A router whose queue is full just drops your packet. Two packets can take different paths and arrive out of order. The network makes a sincere effort and gives zero guarantees. And that has a name: best effort. It'll try to deliver each packet. It might drop it, delay it, duplicate it, reorder it... and it won't tell you.

B: [a bit unsure] Wait, but the internet feels reliable. My downloads don't come out with holes in them. So underneath, something's got to be making sure.

A: Something is. But not underneath. On top. Everything reliable you've ever used on the internet is built on top of this unreliable thing, at the edges, by the two computers that are talking. The middle stays dumb. And that's the whole reason T C P exists.

<!-- section: The Idea: Envelopes inside envelopes -->

A: Okay. Here's the single most useful picture in networking. Your S S E event doesn't get "sent". It gets put in an envelope. Which gets put in a bigger envelope. Which gets put in a bigger one. And each envelope is written by a different piece of software, answers a different question, and gets read by different machines along the way.

A: A few words for this. Each envelope is a header: a block of fields stuck on the front of some data, describing it. Where it's going, how long it is, what's inside. And the data it's describing is called the payload. The rulebook for one kind of header, and how the two ends use it, that's a protocol. HTTP is one protocol, T C P is one, I P is one, Ethernet is one. And the wrapping itself, putting a whole message, unchanged, as the payload inside the next layer's message, is called encapsulation. Unwrapping on the other side is decapsulation.

A: So, from the inside out. The innermost is the application layer. HTTP, and S S E inside it. That's the letter itself. S S E is honestly just a text format for the body of an HTTP response: lines starting with "data", separated by blank lines. HTTP is the format for requests and responses, the method and the path, the headers, the body. And neither of them knows anything about the network.

A: Next one out is transport. T C P. It answers, which program on each machine, and in what order. Its address is a—

B: [jumping in] A port. That one I know.

A: A port, yeah. A port is a sixteen-bit number, so zero up to sixty-five thousand five hundred thirty-five, and it picks out one program's socket on a machine. Servers listen on well-known ones. Eighty for HTTP, four forty-three for HTTPS, twenty-two for SSH. Clients just get a random high one. And T C P takes the bytes your program writes and turns them into numbered chunks called segments. Each segment carries the position of its first byte in the stream, that's the sequence number, so the other side can put them back in order and ask for missing ones again. The other transport is U D P, which is ports and nothing else. No ordering, no retries. That's the next lesson.

A: Next one out, network. I P. It answers, which machine, anywhere on Earth. Its address is an I P address, a number naming one network interface. In I P version four, it's thirty-two bits, written as four bytes in decimal with dots between. And this envelope is called a packet: an I P header, with the source and destination address, the T T L, which protocol's inside, plus a payload, usually a T C P or U D P segment. This is the layer routers read.

A: And the outermost, the link layer. Ethernet, or Wi-Fi. It answers, which box on this one wire, or this one radio. Its address is a MAC address, a forty-eight-bit hardware address for a network interface. And it only means something on the local link. Routers never forward it. The envelope there is called a frame: a link header with destination and source MAC and a type, then the payload, usually an I P packet, and a checksum at the very end. A frame only lives for one hop. And below all that there's the physical layer, voltages on copper, light in glass, radio waves. We're not opening that box.

B: [working it out] So how big is all this, actually? Like if one token goes out, how much of it is token?

A: Let's do it with real sizes. Picture one row per layer, stacked, all drawn to scale. Say the server's sending the token "Hello", with a space in front. As an S S E event, "data", colon, the little JSON with the token, two newlines, that's twenty-six bytes. HTTP wraps that in six bytes of chunk framing, basically "here's a piece of the body, it's this long". T C P puts twenty bytes of header on the front, plus twelve bytes of options, so thirty-two. I P adds twenty. Ethernet adds fourteen. And the whole frame on the wire is ninety-eight bytes. Twenty-six of message, riding in ninety-eight of frame. And that's the lean version. Wi-Fi headers are bigger still, and real HTTPS adds another envelope, T L S, between HTTP and T C P.

B: Okay, so this is actually the thing I've always had blurry. I kind of file S S E and WebSockets and polling in the same mental drawer as T C P. Like they're all, you know, ways of sending data, and you pick one.

A: Yeah, and that's the drawer worth taking apart, because they're on different floors. Polling, S S E and WebSockets are all ways of using HTTP. WebSockets start as an HTTP request and then switch formats on the same connection. They differ in how often you open a request and who talks when. That's it. Then HTTP is text, or in HTTP two, binary frames, written into a T C P connection. And to HTTP, T C P looks like a file. You write bytes in, you read bytes out, reliably and in order. Then T C P cuts that byte stream into segments, and each segment rides inside one I P packet. T C P is the thing that makes the unreliable, out-of-order packet network look like a clean pipe. And each I P packet rides inside a link-layer frame, for one hop at a time. Wi-Fi from your laptop to your router, then fiber or Ethernet frames between routers. A new frame on every link.

B: So polling versus S S E is a decision way up at the top, and the bottom doesn't even see it.

A: The bottom doesn't care. Polling makes lots of short HTTP requests, each maybe a new T C P connection. S S E makes one HTTP request whose response just never ends. And a T C P connection carrying S S E is just... a T C P connection where data trickles in.

A: And you'll hear people name these layers by number. That comes from a nineteen-eighties reference model, the O S I model, seven layers, from the international standards body. Only some of the numbers stuck in everyday talk, and you only need four. Layer two is the link layer, Ethernet and MAC. Layer three is I P. Layer four is T C P or U D P. Layer seven is HTTP. So when someone says "an L four load balancer", they mean it forwards T C P connections without reading them. "An L seven load balancer" reads the HTTP. Which is exactly the split from the load-balancer lesson.

<!-- section: The Idea: Predict, overhead -->

A: So let me ask you. In that ninety-eight-byte frame, the actual token text, space "Hello", is six bytes. What fraction of the frame is the token?

B: [working it out] Six out of ninety-eight... a bit over six percent?

A: About six percent. Now make it real. A real LLM API sends each token as a JSON event with an id, a model name, all that. Call it about two hundred bytes. And it's inside T L S, which adds about twenty-two bytes per record: a five-byte record header, a sixteen-byte authentication tag, and one byte of type. Then the six bytes of chunk framing. Then thirty-two plus twenty plus fourteen of T C P, I P and Ethernet. What fraction is the token now?

B: The frame's like... three hundred bytes? So six out of three hundred. Two percent.

A: [curious] Two percent. Ninety-eight percent envelope. Does it matter?

B: [casual] Honestly, I'd say no. Three hundred bytes is nothing. Networks are fast.

A: For one user, you're right. Fifty tokens a second times three hundred bytes is fifteen kilobytes a second. Nothing. Now be the provider. A hundred thousand people streaming at the same time, fifty tokens a second each. How many packets a second is that?

B: A hundred thousand times fifty... five million?

A: Five million packets per second, going out. And at about three hundred bytes each, that's about one and a half gigabytes a second, which is about twelve gigabits a second. And almost all of it is headers and JSON, not tokens. Plus the acknowledgments coming back the other way. T C P usually acknowledges every second packet, so maybe two and a half million more packets a second, inbound.

B: [skeptical] Okay, but twelve gigabits isn't crazy for a data center.

A: [firmly] No, and that's the point. The bytes aren't the bottleneck. The packets are. Every packet costs work: a system call to write it, an interrupt when it arrives, encryption for each T L S record, processing in every load balancer it passes through. So the cost is per packet, not per byte. And that's why "packets per second" is a capacity number network engineers care about as much as bytes per second.

B: So what would you change?

A: Send fewer, bigger packets. Batch several tokens into one event, or one write, when latency allows. Like, if you flush every hundred milliseconds at fifty tokens a second, that's about five tokens per write. Five times fewer packets, for at most a hundred milliseconds of extra delay. Trim the JSON. Use HTTP two or three so lots of streams share connections. And then there's the one you can't fix in code: every user's time to first token includes at least one round trip. So serving from an edge near them cuts fifty to a hundred and fifty milliseconds that no code change ever can.

<!-- section: The Idea: The journey -->

A: Okay, now let's actually send that envelope across the internet. Step by step, and watch what each box reads, what it rewrites, and what it never even looks at. Picture four boxes in a row. On the left, the server. Then an ISP router. Then your home router. Then your laptop on the right. Between the server and the ISP router it's Ethernet, between the routers it's the ISP's fiber, and the last link is Wi-Fi.

A: [steady, step by step] Start at the server. Its app has one token to send. Twenty-six bytes of S S E text. That's the letter. HTTP wraps it as part of a long-running response body, with a little length marker in front. T C P adds ports, from eighty, the server's port, to forty thousand one hundred twelve, and a sequence number saying where these bytes sit in the stream. Then I P adds which machine. And here's the first interesting thing. The destination address is your router's public address. Not your laptop. Because that's the only address of yours the server has ever seen. And the T T L starts at sixty-four. Then the link layer, and the destination MAC on that frame is the next router. Not your laptop. The server has no idea what your laptop's MAC address is. And it never will.

A: Out it goes. The ISP router receives the frame. The frame was addressed to it, so it unwraps it and throws it away. Then it reads one thing, the I P destination. Looks it up in its table. Subtracts one from the T T L, so sixty-three, and fixes up the header checksum because a field changed. Then it builds a brand-new frame for the next link, addressed to your home router's outside interface. And the next link can be a whole different kind, fiber instead of copper, Wi-Fi instead of either. The I P packet inside is the same packet, just one T T L lighter. And in real life there are something like five to twenty-five routers here, each one repeating exactly that step.

A: Then your home router. Same thing: unwrap the frame, T T L goes from sixty-three to sixty-two. And then it does something special, called NAT, which we'll get to properly. It looks up port forty thousand one hundred twelve in a table, finds "oh, that's the laptop, port fifty-two eight fourteen", and rewrites the destination address and port. That's the only time anything above the I P header gets touched on the whole trip, and the router fixes up the checksums to match. Then a new frame again, this time Wi-Fi, addressed to your laptop's MAC. And the router learned that MAC with something called ARP, which is also coming.

A: And then your laptop unwraps it, one layer at a time. Link layer: destination MAC is mine, keep it, and the type field says I P version four is inside, so hand that up. I P: destination address is mine, protocol number six means T C P, hand it up. And the T T L arrived as sixty-two, so it crossed two routers. Sixty-four minus sixty-two. T C P: port fifty-two eight fourteen belongs to curl's socket, the sequence number is the next byte I was expecting, so these bytes go straight into the socket's buffer, and T C P sends back an acknowledgment. Then your HTTP client strips the chunk framing, and your S S E parser sees "data", the token, blank line. One event. "Hello" shows up on your screen.

B: [a bit unsure] Huh. So the server never actually knows anything about my laptop. I kind of assumed the server had, like, my machine's address in its connection somewhere.

A: It has your router's address and a port on your router. That's it. And there's three things to take away from that walk. First: the frame is local, the packet is global. MAC addresses only mean something on one link. Each router strips the incoming frame, decides where the packet goes next, and wraps it in a new frame for the next link with new source and destination MACs. The server never learns your laptop's MAC, and your laptop never learns the server's.

A: Second: routers only read the I P header. A router doesn't know there's T C P inside, let alone HTTP. It reads the destination address, looks it up in a table, decrements the T T L, recomputes the header checksum, and sends it on. That's the whole job. Done billions of times a second in the core of the internet.

A: And third: the ends do everything else. Ordering, retransmission, ports, encryption, meaning. All of it happens in the two computers at the ends. And that's a deliberate design principle, called the end-to-end principle. It's from a nineteen eighty-four paper by Saltzer, Reed and Clark. The idea is that features like reliability belong in the end hosts, because only the ends can actually check them properly. So keep the middle of the network simple and fast. And that's why the internet could grow from four nodes to billions without redesigning the routers every time someone invented a new app.

<!-- section: The Idea: IP addresses -->

A: Okay, addresses. An I P version four address is thirty-two bits. People write it as four bytes in decimal separated by dots, because one ninety-two dot one sixty-eight dot whatever is a lot easier to read than thirty-two ones and zeros in a row. So, quick one. How many I P version four addresses are there?

B: Thirty-two bits, so two to the thirty-two. That's... about four billion.

A: About four point three billion. And a few hundred million of those are reserved for special uses. Now, there are about eight billion people. And probably twenty to thirty billion connected devices.

B: [skeptical] So that can't work. That's not even one per person.

A: It can't, on paper. And they did run out. The central registry handed out its last free blocks in twenty eleven, and the regional registries ran dry over the following decade. It works anyway because of two tricks. Most devices use private addresses, which get reused in millions of homes at the same time. And a router doing NAT shares one public address among all of them. The long-term fix is I P version six, which has two to the hundred and twenty-eight addresses. We'll come back to it.

A: Now, an address isn't just a name. It's a location. The first part of it names a network, and the rest names a machine on that network. Like a street name and a house number. And where the split falls is written after a slash. So one ninety-two dot one sixty-eight dot eighty-six dot zero, slash twenty-four, means the first twenty-four bits are the network. That notation is called cider, C I D R, Classless Inter-Domain Routing, from nineteen ninety-three. It's just a starting address plus how many leading bits are fixed. Ten dot zero dot zero dot zero slash eight is every address starting with ten. And the number after the slash is the prefix length. A slash twenty-four fixes twenty-four bits and leaves eight for machines, so two hundred fifty-six addresses. And each bit fewer doubles the block. Slash twenty-three is five hundred twelve, slash twenty-two is a thousand twenty-four, and so on.

A: There's an older way to write the same thing, the subnet mask. It's the prefix written as if it were an address: twenty-four one-bits, then eight zero-bits. Which comes out as two fifty-five dot two fifty-five dot two fifty-five dot zero. And if you take an address and AND it with the mask, bit by bit, you're left with just the network part. And that's exactly what your Mac printed, when you looked at your Wi-Fi interface, as the netmask, in hex, f f f f f f zero zero. Same thing. Twenty-four ones, eight zeros.

A: And a block of addresses that sit together on one local link is a subnet. One network, like your home's slash twenty-four, where the machines can reach each other directly over the link layer, no router needed. If you drag a slider across that address, you'd see the thirty-two bits laid out in four groups of eight, with the network part highlighted. Every notch you move the slider left, the highlighted part gets one bit shorter and the block of addresses doubles. Pick the Tailscale-style address, a hundred dot one-oh-one dot one-oh-two dot one-oh-three, and it tells you that one's from a special shared range. Pick one dot one dot one dot one and it says public. And the last line is the one that matters.

B: Which is what?

A: [matter-of-fact] The decision your laptop makes for every single packet. Is the destination inside my own subnet? It does one AND. If yes, it can reach it directly on the local link. If no, it hands the packet to the default gateway, which is just the router your machine sends everything to when the destination isn't on its own subnet. On a home network, that's your Wi-Fi router. And honestly, that's basically your laptop's entire routing table. When you print it, it says: anything that starts one ninety-two dot one sixty-eight dot eighty-six is right here on the Wi-Fi interface, deliver it directly. Everything else, the line called "default", give it to the router at dot one. There's a line for one twenty-seven, that's loopback, your machine talking to itself. And a line for one sixty-nine dot two fifty-four, which is the self-assigned range a machine uses when nobody hands it an address.

<!-- section: The Idea: ARP -->

B: Wait. "Deliver it directly" on the local link. But the local link uses MAC addresses, and all the laptop knows is the I P address.

A: Right, so it asks. It broadcasts a frame to every device on the link. "Who has one ninety-two dot one sixty-eight dot eighty-six dot one? Tell eighty-seven." And the router answers: "That's me, here's my MAC." That's ARP, the Address Resolution Protocol, from nineteen eighty-two. Broadcast "who has this I P", and the owner replies with its MAC. And the answers get cached for a few minutes. If you print your Mac's ARP cache, you'll see the router, your phone, your iPad. Your neighbors on the Wi-Fi.

B: And presumably whatever servers I've talked to recently.

A: [amused] No. That's the thing to notice. One dot one dot one dot one isn't in there. No server is. Your laptop never ARPs for an internet address. For anything off the subnet, it only ever needs one MAC, the router's. The frame goes to the router's MAC, and the I P header inside carries the real destination.

<!-- section: The Idea: Private addresses and NAT -->

A: So now look at the first two bytes of your laptop's address. One ninety-two, one sixty-eight. That block, along with everything starting with ten, and a block starting at one seventy-two dot sixteen, was set aside in nineteen ninety-six as private address space. The document is R F C nineteen eighteen. Anyone can use those addresses inside their own network, and internet routers refuse to carry packets addressed to them. So millions of homes are using exactly the same address as your laptop, right now, at the same moment. And that's fine, because no router on the internet will deliver a packet to it. It only means something inside your home.

B: So then how does the reply find me?

A: Your router has two sides. On the inside, it's one ninety-two dot one sixty-eight dot eighty-six dot one. On the outside, your ISP gave it one public address, an address that's unique on the whole internet and that internet routers will actually deliver to. When your laptop's packet leaves for the internet, the router rewrites the source, and writes down what it did. That's NAT, Network Address Translation. A router rewrites addresses, and usually ports, in packets passing through, and keeps a table so replies can be rewritten back.

A: Picture it like this. On the left, a dashed box for your home, with the laptop and the Spark inside, both with private addresses, and a note saying "meaningless outside". In the middle, the home router, with its inside address and its outside, public address. On the right, a server out on the internet. And under the router, a table. Your laptop sends from its private address, port fifty-two eight fourteen. The router swaps that for its own public address and a fresh port, forty thousand one hundred twelve, and adds a row: laptop port fifty-two eight fourteen is public port forty thousand one hundred twelve, talking to that server. The Spark's connection gets its own row, with the next port. And when the reply comes back to port forty thousand one hundred twelve, the router finds the row, rewrites the destination back to your laptop's private address and port, and forwards it inside. And those rows expire after a while with no traffic. Anywhere from tens of seconds for U D P to hours for T C P, depending on the router.

B: Okay, and that's the answer to the "it finds my laptop and not my phone" thing.

A: That's that one. But the side effect is the important part. In the picture there's one more arrow, from a stranger out on the internet, trying to reach your router's public address on port twenty-two. SSH. And it says "no entry: dropped". A packet from the internet that doesn't match a row has nowhere to go.

B: [a bit unsure] Right, so the router's firewall is blocking it. On purpose, because it's from outside.

A: [gently] It's simpler than that. It's not that the router decides "this is dangerous". It's that the router has no idea which of your devices they mean. The packet's addressed to the router's public address, port twenty-two. Is that your laptop? The Spark? Your phone? There's no row, so there's no answer, so it drops it. NAT was invented to save addresses, and it quietly became the reason home machines can't be reached from outside. That's your coffee-shop puzzle. From the couch, you and the Spark are on the same subnet, so you just talk directly. From the coffee shop, you're a stranger knocking on the router's public address.

B: And Tailscale gets around it how?

A: There are two ways around it. Port forwarding, which is you configuring a permanent row: "anything to port twenty-two goes to the Spark". Or the much cleverer trick Tailscale uses. Both sides send packets out at the same time, so each router creates a row that lets the other side's packets in. That's the core of the home-server lesson. And here's your third address explained. Tailscale's own addresses, the hundred dot something ones, come from yet another reserved block, a hundred dot sixty-four dot zero dot zero, slash ten. It was originally set aside for ISPs doing NAT on top of your NAT. That's called carrier-grade NAT. The ISP puts lots of customers behind one public address, so your router's "public" address is itself private, and you're behind two NATs.

B: [working it out] So, going back. One ninety-two dot whatever is my address inside the house. The "what's my IP" site sees my router's public address. And the hundred dot something is a Tailscale address that only means anything inside Tailscale.

A: Yeah. They're all real, and they all mean something in a different place. "Your IP" depends on who's asking. And there's a nice detail from a traceroute run while the lesson was being written. Hop two was a public address that belongs to your ISP. So your router has a real public address, and you're behind only one NAT, not two. And hops three to five were private addresses starting with ten dot twenty, inside your ISP. ISPs use private space for their own internal links too, because those routers never need to be reached from the internet.

<!-- section: The Idea: Routing -->

A: So, the Berlin question. Who decides which way the bytes go? And the answer is, nobody knows the whole path to anywhere.

B: [skeptical] Really? I'd have pictured something like, I don't know, a map. Somebody's computing the route, like a GPS.

A: Nope. Each router knows exactly one thing about your packet: for this destination, which neighbor is next. It keeps a forwarding table, a list of address blocks, and for each one, which neighbor to send matching packets to. Your laptop's routing table is just a tiny version of one. A core router's table has around a million I P version four prefixes in it. And when a packet arrives, the router finds every prefix that contains the destination, and picks the most specific one. The longest prefix. So say it has a route for everything starting with two oh three, that's a slash eight, and also a route for two oh three dot zero dot one thirteen dot zero slash twenty-four. A packet for two oh three dot zero dot one thirteen dot ten matches both. It follows the slash twenty-four, because that one's more specific. That rule is called longest prefix match, and big routers do it in dedicated hardware in a few nanoseconds per packet.

B: And where does the table come from?

A: Inside one organization, routers tell each other about their links automatically. Between organizations, your ISP, Arelion, Zayo, a German research network, routes get exchanged with B G P, the Border Gateway Protocol. It's how the roughly seventy-five thousand independent networks on the internet tell each other which address blocks they can reach. Each network announces "I can reach these prefixes", and its neighbors choose what to accept. And they choose based on business relationships as much as distance. It's policy and deals, not just shortest paths. Each of those independent networks, an ISP, a cloud, a university, is called an autonomous system, and it has its own number. And they meet at internet exchanges, which are basically a building with a big switch where lots of networks plug in and hand each other traffic directly. D E C I X in Frankfurt is one of the biggest. Plus private links between pairs of them. The internet is literally a network of networks.

<!-- section: The Idea: TTL and traceroute -->

A: Now, a routing mistake could send a packet in a circle forever. Router A thinks B is the way, B thinks A is. So every I P packet carries a T T L, Time To Live. It's an eight-bit counter in the I P header. The sender sets it, macOS and Linux use sixty-four, Windows uses a hundred twenty-eight. Every router subtracts one. And a router that would make it zero drops the packet. Originally it was meant to be seconds. In practice it's just a hop count.

A: And when a router drops a packet for T T L, it sends a small error message back to the sender. That uses I C M P, the Internet Control Message Protocol. It's I P's own error and diagnostic messages. "Time exceeded", "destination unreachable", "packet too big", and the echo request and reply that ping uses. And the key detail: that error comes from the router's own address.

B: Oh. So the router basically tells you who it is.

A: That's exactly what Van Jacobson noticed in nineteen eighty-seven. You can abuse that. Send a packet with T T L one, and the first router drops it and tells you who it is. T T L two, the second router. Keep going until you reach the destination. That's traceroute. And you can do it by hand with ping. On your Mac, ping one dot one dot one dot one with the T T L set to three, and what comes back is "time to live exceeded" from a ten dot twenty address. Hop three, inside your ISP. And it sends back a copy of the header it dropped. And look at the source address in that copy.

B: It'd be my router's public address, since that's what the ISP saw.

A: That's what the ISP router saw, yeah. But what you get is your private address. One ninety-two dot one sixty-eight dot eighty-six dot eighty-seven. Because your home router un-NATed the error on the way back in. It rewrote the copy inside the error too. NAT, caught in the act.

<!-- section: The Idea: Predict, Berlin -->

A: Okay, so Berlin. Say you're on the US West Coast, roughly nine thousand one hundred kilometers from Berlin. And remember from the latency lesson, light in fiber does about two hundred kilometers per millisecond. What's the fastest a round trip could possibly be?

B: [working it out] Round trip, so eighteen thousand two hundred kilometers. Divided by two hundred... ninety-one milliseconds.

A: [enjoying it] Ninety-one milliseconds is the floor. Physics. And measured from your Mac to the Technical University of Berlin's website, it's about a hundred forty-one to a hundred fifty milliseconds, over twenty-five hops. And the trace itself is kind of beautiful. Hop one, your router, about five and a half milliseconds. Hop two, your ISP, about nine. Hop three, inside the ISP, about five. Hop six is backbone, still on the West Coast, four and a half milliseconds. Then hops seven through fourteen... nothing. No reply. Then hop fifteen, a hundred forty point seven milliseconds. That's Zayo, and it's already in Europe. Hop sixteen, a hundred forty point eight, the D E C I X exchange in Frankfurt. Hop seventeen, a hundred forty-five and a half, the German research network. And hop twenty-five, a hundred fifty point seven, the university.

B: [surprised] So the whole Atlantic is between hop six and hop fifteen.

A: The whole ocean, in one jump. From four and a half milliseconds to a hundred forty. And those eight silent hops in between are routers inside Zayo's backbone that just don't answer T T L probes, or are hidden by a tunneling technique called M P L S. And a hundred fifty milliseconds is about one point six times the light floor, which is normal for intercontinental paths. Real cables don't follow great circles.

B: Okay, but the silent hops. If traceroute shows stars, isn't that packet loss? Like, something's broken there?

A: That's the first trap. Stars mean that hop didn't answer in time. Not that your packets are getting lost. Plenty of routers are set to ignore I C M P, or rate-limit it. And the proof is right there: hop fifteen answered. Your packets clearly went through hops seven to fourteen to get there. And the second trap: a slow middle hop isn't a slow path. Your trace to Tokyo had hop three at two hundred eighty-seven milliseconds, and then hop four back at four.

B: [skeptical] How does hop four come back faster than hop three? It's further away.

A: Because routers forward packets in fast hardware, but they generate those I C M P errors in a slow, low-priority CPU path. So hop three wasn't slow at forwarding your packet. It was just lazy about writing back. If a latency spike doesn't carry forward to every later hop, it's the router being slow to reply, not your packets being slow. Only latency that sticks around for all the later hops is real path latency.

<!-- section: The Idea: MTU and fragmentation -->

A: Next, size. Every link has a maximum frame size, and the biggest I P packet that fits in one frame is the MTU, the Maximum Transmission Unit. Fifteen hundred bytes on Ethernet and nearly all home networks. Your Mac printed "MTU fifteen hundred" for its Wi-Fi interface. Take away twenty bytes of I P header and twenty of T C P header and you get the most data one T C P segment can carry. That's the MSS, the Maximum Segment Size, and each side announces it in the handshake. Fourteen sixty bytes. And with the twelve-byte timestamp option that macOS and Linux normally use, it's fourteen forty-eight per segment.

B: So something like downloading a model file...

A: A sixteen-gigabyte model file is about eleven million packets. Each one forwarded by every router on the way, and acknowledged, individually.

A: Now, what if a packet's bigger than the next link's MTU? The old answer: the router chops it into pieces, that's fragmentation, and the receiver glues them back together. And that turned out to be slow, and fragile. If you lose any one fragment, the whole packet's gone. So modern T C P sets a flag in the I P header called the D F bit, Don't Fragment. It tells routers, drop this rather than split it, and send me back an I C M P "fragmentation needed" error with the size that would fit. And the sender learns the smallest MTU on the whole path from those errors, and shrinks its packets. That's path MTU discovery. And in I P version six, routers never fragment at all.

A: And you can feel the fifteen-hundred limit directly. Ping has a flag that sets the D F bit. And a ping has twenty-eight bytes of headers, twenty of I P and eight of I C M P. So a payload of fourteen seventy-two bytes makes exactly a fifteen-hundred-byte packet. Send that to one dot one dot one dot one, it works. Make it fourteen seventy-three, one byte more, and you get "Message too long". Your own Mac refuses to even send it.

B: Huh. One byte.

A: One byte. And tunnels make this matter. A VPN wraps your packet inside another packet, so the inside has less room. Tailscale's interface uses an MTU of twelve eighty for exactly that reason. You'll test that one when you break things.

<!-- section: The Idea: Loss and best effort -->

A: So, loss. Every router has a queue in front of each outgoing link. If packets arrive faster than the link can send them, the queue fills up, and then the router drops whatever arrives next. Wi-Fi drops frames to interference, and retries a few times before giving up. A bit flips in a header, the checksum fails, and the packet's thrown away.

B: [a bit unsure] But why doesn't the router just keep a copy and resend? It's right there, it knows it dropped it.

A: [patiently] Think about the router in Frankfurt. It's handling millions of packets per second, for millions of conversations. If it kept a copy of each one to resend, it'd need to remember state for every conversation crossing it. And that's exactly the circuit-switching cost that packets were invented to avoid. So IP doesn't retry, and doesn't tell anyone. Loss gets detected at the ends instead. T C P notices a gap in the sequence numbers, or an acknowledgment that never came, and resends. And here's the clever bit. T C P treats loss as a signal that a queue somewhere is full. So it slows down. Loss is how the internet says "too much". The T C P and U D P lesson builds that whole machinery by hand.

<!-- section: The Idea: IPv6 -->

A: And I P version six, briefly. It has hundred-twenty-eight-bit addresses, written as groups of hex digits with colons. Two to the hundred and twenty-eight is about a three with thirty-eight zeros after it. Enough to give every device a globally unique address, with no NAT at all. The header's simpler too: a fixed forty bytes, no checksum, routers never fragment. And every idea from today carries over. Prefixes, routing, a hop limit instead of T T L, and a neighbor-discovery protocol instead of ARP. Somewhere around forty-five to fifty percent of Google's users reach it over I P version six today. Google publishes the live number if you want to check.

B: So I'm probably on it.

A: You're not, actually. Your Mac only has two kinds of version six address: a link-local one, starting f e eighty, that only works on your own Wi-Fi, and a private one starting f d. And pinging Cloudflare's version six address says "no route to host". Your ISP or your router isn't handing out global version six. So for you, it's version four and NAT, all the way.

<!-- section: The Idea: Reading a header -->

A: [eager] Okay, here's the payoff. Everything we've talked about is fields in a header. And headers are just bytes, in a fixed layout. So take one packet: the very first packet of a T C P connection. That's called a SYN, for synchronize. It basically says, "I want to connect, and my byte numbering starts here." The server replies with a SYN-ACK, the client replies with an ACK, and that's the three-way handshake. This SYN is seventy-eight bytes on the wire. In the lesson it's shown as a block of hex, with made-up MAC addresses and a documentation address standing in for the server.

A: One thing first. Network protocols write multi-byte numbers big-endian. Most significant byte first, the way you write numbers on paper. So the two bytes zero zero, then five zero, mean hex fifty, which is eighty. It's also called network byte order. And your Mac's CPU is the other way around, little-endian, so a parser has to convert.

A: So try it in your head with me. The first fourteen bytes are Ethernet. What would you expect in there?

B: [working it out] The two MACs... destination first, I guess, so the router's, then mine. And then the type, saying what's inside.

A: That's it. Six bytes of destination MAC, the router. Six bytes of source MAC, the laptop. Then two bytes, zero eight zero zero, which means "I P version four inside". Then the I P header starts, and its first byte is hex four five. The four is the version. The five is the header length, in four-byte words, so five times four, twenty bytes. Then a byte for type of service, which is zero. Then the total length, sixty-four. Twenty bytes of I P plus forty-four of T C P, and no data at all, because a SYN doesn't carry any. Then an identification number. Then the flags, with D F set, and a fragment offset of zero.

A: Then the byte that's hex forty. That's the T T L, sixty-four, fresh from your Mac. Next byte, six: protocol six is T C P. Then two bytes of header checksum. Then the source address, four bytes, which decode to one ninety-two, one sixty-eight, eighty-six, eighty-seven. Your laptop. And four bytes of destination, the server. The addresses start twelve bytes into the I P header, four bytes each.

A: Then T C P. Two bytes of source port, fifty-two eight fourteen, a random one the OS picked. Two bytes of destination port, zero zero five zero, eighty. Then a four-byte sequence number. Then a zero acknowledgment number, because nothing's been received yet. Then a half-byte that says the T C P header is eleven words, eleven times four, forty-four bytes. Then the flags byte, which here is just SYN. And the rest is the window, sixty-five thousand five hundred thirty-five, and then options. The MSS, fourteen sixty. Window scaling, a factor of six. Timestamps. And "selective acknowledgment OK".

B: And that's twenty-four bytes of options to get from twenty to forty-four.

A: Right. And if you drew it the standard way, it's rows of thirty-two bits each. The I P rows shaded: version, header length, type of service and total length on the first row. Identification, flags and offset on the second. T T L, protocol and checksum on the third. Then a full row for source address, a full row for destination. Five rows, twenty bytes. Then the T C P rows white: ports, then sequence number, then ack number, then offset and flags and window, then checksum and urgent pointer, then options. And at the bottom it adds up: twenty bytes of I P plus forty-four of T C P is sixty-four, which is the total length field. The packet describes itself, and it checks out.

<!-- section: The Idea: Checksum and TTL -->

A: Two fields deserve a closer look, because you'll verify them in your parser. The header checksum. I P version four checks its own header, only the header, with what's called the internet checksum. The recipe is: chop the header into sixteen-bit numbers and add them all up, with the checksum field itself set to zero. The total will usually overflow sixteen bits a little. Whatever spilled over the top, you add back in at the bottom. Then you flip every bit. And that's the checksum.

B: Can you do it with actual numbers? I'm not seeing it.

A: [working it out] Sure, with the real header. There are ten sixteen-bit words. Add them up and you get a number that's a little over sixteen bits. The part that spilled over the top is just three. So you take the bottom sixteen bits and add three to them. Then flip every bit, every one becomes zero and every zero becomes one, and what you get is exactly the two bytes sitting in the checksum field. And the receiver does the same addition, including the checksum this time, and if nothing changed, it gets all ones. Which means the check passes. It's cheap enough that every router redoes it after decrementing the T T L. And T C P's checksum uses the same arithmetic, but over the whole segment, plus a little "pseudo-header" with the two I P addresses mixed in. So it'll catch a packet that got delivered to the wrong machine.

A: And the T T L field gives you a free hop counter. If a packet arrives at your Mac with a T T L of fifty-four, it probably started at sixty-four, if the server's Linux, and crossed ten routers. You'll use that to cross-check traceroute.

<!-- section: Build It -->

A: So here's what you'd build. Everything runs on your Mac, with the Spark making a cameo for comparison. The capture part needs sudo, and everything you capture is your own traffic on your own machine.

A: First, you find your own addresses, routes and neighbors, and write them down. Your private address, your subnet mask, MTU and MAC, your default gateway, your routing table, your ARP cache, your DNS server, your public address as the world sees it, and your Tailscale address and its MTU. There's a Mac command and a Linux command for each, so you can do the Spark too. Traceroute and T C P dump ship with macOS, M T R is optional, and Wireshark's optional but lovely for checking your parser later. And one question to actually answer: is your public address your router's outside address, or is it inside that hundred dot sixty-four range, which would mean your ISP is adding a second NAT? Your traceroute suggests a real public address, but check.

A: Second, trace three continents. Four targets: one dot one dot one dot one, something on the US East Coast, like a university, though it might be on a C D N, TU Berlin, and the University of Tokyo. You run traceroute with reverse DNS turned off and three probes per hop, so you see the spread. Then you write a small Python script that parses that output and prints, for each hop, the address, the best round-trip time, the jump from the previous hop that answered, and a flag on any jump over twenty milliseconds. It looks up who owns each address with who-is, skipping the private ones. And it computes the light floor for a distance. Then the part that matters: for each big jump, you say what happened physically. Which ocean, which continent, and how close it is to the light floor. And a tip, router names from reverse DNS often have airport codes in them. F R A, L H R, S J C, N R T.

B: [amused] Frankfurt, Heathrow, San Jose, Narita.

A: Those, yeah. Third, capture your own curl. You use plain HTTP, not HTTPS, to a site that still answers on port eighty, like example dot com, so the payload is readable. One terminal runs T C P dump filtered to that server's address. The other runs curl. You get a dozen or so packets: the three-way handshake, the request, the response, the acknowledgments, and the close. Two gotchas. On macOS, Wi-Fi traffic shows up as ordinary Ethernet frames, because the driver converts them, so the first fourteen bytes are an Ethernet header even though you're on Wi-Fi. And T C P dump might write the newer file format, P cap N G, instead of classic P cap. If the first four bytes of the file look wrong, re-capture with the classic format, or convert it.

A: [more seriously] And then the heart of the lesson. You write a parser for that file, with nothing but Python's standard library. And you do the first packet on paper before you write any code. A classic P cap file is a twenty-four-byte header for the whole file, and then for each packet, a sixteen-byte record header followed by the packet bytes. There's a magic number at the start that tells you the byte order of those file headers, and on your Mac it'll be little-endian. But the packet bytes themselves are network byte order, big-endian. Then you peel the layers: Ethernet, then I P version four, then T C P, and print one line per packet. Time, source address and port, destination address and port, flags, sequence and ack, T T L, payload length. And you verify both checksums.

B: What's the part that actually trips people up?

A: A few things. Never assume a header is twenty bytes. The I P header length is the low four bits of its first byte, and T C P's is the high four bits of its twelfth byte, both counted in four-byte words. Use them. The T C P flags are bits in one byte, starting from the bottom: FIN, SYN, RST, PSH, ACK, and so on. The T C P checksum needs that pseudo-header with the addresses prepended. And slice the I P payload using the total-length field, not to the end of the frame, because Ethernet pads short frames up to a sixty-byte minimum, and that padding isn't T C P data. And then the fun moment: decode the payload bytes as text and you'll see the "GET slash, HTTP one point one" request, in the clear. And you check your output against T C P dump in verbose mode, which prints the T T L, I P id, length and flags for each packet.

A: Then you read the conversation out of your own output. Find the handshake, and check that the server's SYN-ACK acknowledges your SYN's sequence number plus one. Look at the T T L the server's packets arrived with, guess its starting value, sixty-four, a hundred twenty-eight, or two fifty-five, and from that, count the routers between you and compare with traceroute. Find the GET request and work out how many bytes were HTTP versus the whole frame. And find the biggest response segment and see whether it's fourteen forty-eight or fourteen sixty, which depends on whether that timestamp option is there. And if a number doesn't make sense, you ask an agent to explain the field. Not to fix your parser.

A: And last, three experiments on NAT and the Tailscale tunnel. One: start a tiny Python web server on your Mac on port nine thousand. From the Spark, on the same home network, you can fetch it. Now turn off Wi-Fi on your phone and, over cellular, try your public address on port nine thousand. It fails. No NAT row. Then try it through your Mac's Tailscale address, from the phone with Tailscale on. It works. Then stop the server. Two: run tailscale netcheck. It reports your public address and port as seen by Tailscale's servers, and whether that mapping changes depending on which server you talk to. That's your router's NAT table entry, seen from outside. Write it down, it matters later. Three: capture U D P on Tailscale's default port, forty-one six forty-one, while you ping the Spark's Tailscale address.

B: And you'd see the ping?

A: You'd see U D P packets between your Mac and the Spark's real address, with encrypted payloads. Your ping is an envelope inside an envelope. And if you capture on the tunnel interface instead, you see the plain ping inside. You write a paragraph on each experiment and have an agent check it for anything you got backwards. You're done when you've got four traceroutes with every big jump explained against the light floor, a parser that reads your capture and matches T C P dump, one packet decoded by hand, and you can say your private address, your public address, your router's MAC, and why a stranger can't reach your laptop.

<!-- section: Measure -->

A: And when you measure, here's roughly what came out when the lesson was written, from your Mac on home Wi-Fi. Your router: about three milliseconds. One dot one dot one dot one: nine hops, all answering, about four and a half milliseconds. Berlin: eleven of twenty-five hops answering, a hundred forty-one to a hundred fifty milliseconds, against a floor of ninety-one. A ratio of about one point six, through D E C I X Frankfurt. And Tokyo: thirteen of twenty-five hops answered, and it never actually reached the destination. The last answering hop was about a hundred twenty-two to a hundred twenty-eight milliseconds. Tokyo's about eight thousand three hundred kilometers away, so the floor is about eighty-three. And there's a jump to about ninety-five milliseconds at hop seven, which is the Pacific crossing, on Arelion's network.

B: [surprised] Wait, three milliseconds to the router? That's two meters away. And Cloudflare is four and a half?

A: Yeah, that's the first thing to notice. Your first hop is the most expensive per meter in the whole path. Three to five milliseconds to a box two meters away is all Wi-Fi. The radio waits for a quiet moment to transmit, frames get acknowledged, sometimes retried. Plug in a cable and it drops to a fraction of a millisecond. The first couple of meters of Wi-Fi cost more than a hundred kilometers of fiber.

A: Second: most of a long path is just distance. Divide each round trip by its light floor. Intercontinental paths usually land between one point three and two times. Cables follow coastlines and seabeds, not great circles, and routes follow business deals, B G P, not geography. If you see four times, something odd's happening. A detour through another continent, or a C D N that isn't where you think it is.

A: And third: nearby is surprisingly near. One dot one dot one dot one at four milliseconds means that "server" is in your city. Cloudflare uses something called anycast: the same address is announced from hundreds of cities, and B G P sends you to the nearest one. Most big services do something like this. So when you measure "latency to an API", you're often measuring latency to the nearest edge server, and the real work happens somewhere else behind it.

A: Then the overhead, from your own capture. A SYN from macOS is seventy-eight bytes on the wire, and it's a hundred percent envelope, zero data. A pure ACK with timestamps is sixty-six bytes, also all envelope. A full data segment is fifteen fourteen, the fifteen hundred plus fourteen of Ethernet, and that one's about ninety-six percent data. So small messages are mostly envelope, and big transfers are mostly data. Which is the latency-versus-bandwidth split all over again. And for MTU: the biggest Don't-Fragment ping to one dot one dot one dot one should be fourteen seventy-two. And to the Spark's Tailscale address, predict it first.

B: Twelve eighty minus the twenty-eight... twelve fifty-two.

A: Twelve fifty-two.

<!-- section: Break It -->

A: Then you break it. Four ways. First, run out of T T L. In Python, you open a normal T C P socket, set its T T L to three, and try to connect to one dot one dot one dot one on port eighty. With T C P dump running alongside, you see your SYN go out, and an I C M P "time exceeded" come back from hop three. And Python gives up with an error, either a timeout, or "host unreachable" if the OS passes the I C M P error up. On your Mac, T T L eight still failed and T T L nine connected.

B: Because it's nine hops away.

A: Nine hops. You just ran traceroute with T C P. Which is how a tool called T C P traceroute gets through firewalls that block the U D P probes normal traceroute uses.

A: Second, too big for the tunnel. Do the Don't-Fragment ping to the Spark's Tailscale address at fourteen seventy-two, then smaller, until it works. Did the boundary land at twelve fifty-two? And then think about a protocol that sets Don't Fragment but never hears the "too big" error, because some firewall in the middle eats I C M P. Large packets just vanish, silently. Small ones, handshakes, short requests, work fine. That's called a path MTU black hole.

B: [a bit unsure] So the symptom would be... the connection works, and then just doesn't?

A: [knowingly] Connections open, and then hang on the first big transfer. The classic version is "SSH connects fine, but hangs when I run L S in a big directory". The login is small packets. The directory listing is big ones.

A: Third, corrupt a byte. Take a packet from your capture, flip one bit in the I P header, say the T T L, and rerun your checksum. It fails. Now flip a bit in the T C P payload instead. The I P checksum still passes, because it only covers the header. But the T C P checksum fails. And then look at your outgoing packets in the original, untouched capture.

B: [skeptical] Let me guess. Some of them fail too, and my parser's wrong.

A: [reassuring] On a lot of Macs and Linux boxes, the outgoing packets do have wrong T C P checksums, and the incoming ones are right. But your parser's fine, and so's the packet. The OS hands the network card an unfinished checksum, and the card fills it in after T C P dump already made its copy. That's called checksum offload. Wireshark even has a setting to stop complaining about it. So if your parser flags only outbound packets, that's why.

A: And fourth, forget your neighbor. Delete the router's entry from your ARP cache, watch ARP traffic with T C P dump, and ping one dot one dot one dot one. Before that ping can go anywhere, you'll see your Mac broadcast "who has the router's address, tell me", and the router reply. The ping was to Cloudflare. But the ARP was for the router. Proof that off-subnet traffic only ever needs the gateway's MAC.

<!-- section: Connections and close -->

A: And this sits under a lot of what's coming. It puts physical reasons under the network numbers from the latency lesson: the round trip to Europe is the light floor plus cables that don't run straight. The next lesson builds the reliability layer, T C P, on top of these best-effort packets. Then D N S, then the T L S envelope we left out, then S S E and WebSockets right at the top, and the home-server lesson, where NAT, MTU and those hundred dot sixty-four addresses come back as the actual problem Tailscale solves. And "L four versus L seven" load balancing now means something exact: which envelope the balancer opens. If you read one thing after this, make it Cerf and Kahn's nineteen seventy-four paper, which is short and you'll recognize most of today's design in it. Or David Anderson's post on how NAT traversal works, on Tailscale's blog.

B: [working it out] Okay, let me try the whole thing. My token goes out as an S S E event, inside HTTP, inside T C P, inside I P, inside a Wi-Fi frame. Every router on the way unwraps it, reads my I P address, and sends it on. And since my address is private, my router swaps in its public one so the reply can find its way back, and that's why nobody can reach me from outside.

A: [gently] Mostly. One fix. The routers don't read your address. They read the destination address, and that's all they read. They throw away the frame, read where the packet's going, knock one off the T T L, and wrap it in a brand-new frame for the next link. Everything inside, T C P, HTTP, your token, they never look at. Only the two ends do. Except your home router, which also rewrites addresses and ports for NAT. And the reason nobody can reach you isn't that your router blocks strangers. It's that a packet from a stranger matches no row in its table, so it has no idea which of your devices it's for. So it's dropped.
