<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, the network layer underneath everything, I P, the internet protocol, makes exactly one promise. It'll try. You hand it a packet with an address on it, and it does its best to get it there. And that's it. The packet might not arrive. It might arrive twice. You send two packets in order and they might show up swapped. And nobody tells you which of those happened.

B: Okay, but that's not what it feels like. Like, at all.

A: No, right? Because look at what you actually do all day. Your code does a requests dot post with a three kilobyte JSON body to the ranking service, and the service gets exactly those three kilobytes. In order. Nothing missing. You scp a sixteen gigabyte checkpoint over to the Spark, and the hash matches. A model server streams tokens back, "Hello", then " world", and you never once get " world Hello".

B: [a bit unsure] I guess I always just figured the network was mostly reliable these days. Like the packet loss thing was a dial-up era problem.

A: It's not that the network got reliable. Packets still get dropped all the time, on Wi-Fi, on busy routers, everywhere. It's that something sitting between your code and I P is turning "probably, in some order" into "definitely, in order". That something is T C P. And it's running inside the kernel on every machine you own, right now.

B: Huh. So it's hiding the mess.

A: It's hiding the mess. And it isn't free. Every new connection costs one full round trip before the first byte of your data moves. To Europe, from California, that's about a hundred and fifty milliseconds, gone. A brand new connection also starts slowly, on purpose, and takes several more round trips to get up to full speed. One lost packet stalls everything behind it, even data that already arrived and is just sitting there. Small writes can sit in a buffer for forty milliseconds, also on purpose. And if you open and close connections fast enough, you can actually run your client out of port numbers.

B: [skeptical] Run out of ports. That's a real thing?

A: Very real, and we'll do the math on it. Meanwhile, here's the other half of the puzzle. Some of the most latency-sensitive software in the world deliberately uses U D P, the protocol that promises nothing. D N S. Video calls. Games. WireGuard. Tailscale, which is what your SSH session to the Spark rides on. And H T T P three, the newest version of the web's protocol.

B: Wait, Tailscale is on the one that promises nothing?

A: [amused] It is. And by the end that'll make total sense. So to understand why both protocols exist, the plan is you build the promise yourself, out of U D P, and feel each problem as it shows up.

<!-- section: Origin -->

A: But first, the story of how T C P learned the one thing it was missing. The first T C P designs go back to a paper by Vint Cerf and Bob Kahn in nineteen seventy-four, and then the official spec, R F C seven ninety-three, in nineteen eighty-one. And those already had the core pieces. Number your data, have the other side acknowledge it, resend what isn't acknowledged. What they didn't have was any idea of how fast to send. A sender just blasted out a whole window of data at once, and if the acknowledgements didn't come back in time, it sent everything again.

B: That sounds fine until it isn't.

A: Until October nineteen eighty-six. There was a link between Lawrence Berkeley Lab and U C Berkeley. Four hundred yards apart, three hops. And its throughput dropped from thirty-two kilobits per second to forty bits per second. Forty bits. That's a factor of about a thousand.

B: So something broke. A cable, a router?

A: That's the thing, nothing was broken. The network was full. Full of retransmissions. Router queues overflowed, so packets got dropped. Senders timed out and resent everything. Which overflowed the queues even more. Almost every packet on the wire was a copy of one that had already been sent. It got the name congestion collapse.

B: [working it out] So everybody being careful about reliability is exactly what killed it. Everyone's retrying at once.

A: Yeah, that's it exactly. And Van Jacobson and Michael Karels figured out why, and they fixed it in the senders. Without touching a single router. Their nineteen eighty-eight paper, "Congestion Avoidance and Control", added three things: slow start, a much better retransmission timer, and the rule that you back off hard when you see loss. Those ideas are still in every T C P stack today. The internet works because every sender on it agrees to be polite.

<!-- section: The Idea: Ports and sockets -->

A: [settling in] Okay. Before T C P or U D P, one piece they share. An I P address gets a packet to a machine. But your laptop is running a browser, Slack, an SSH session to the Spark, a Python script talking to some API, all at once. A packet arrives. Which program gets it?

B: There's a port number on it.

A: There's a port. A port's just a sixteen-bit number, so anywhere from zero up to sixty-five thousand five hundred thirty-five, and it names one conversation endpoint on a machine. The I P address picks the building, the port picks the apartment. Every T C P or U D P packet carries two of them, the source port and the destination port. A server program asks the kernel to listen on a port, which just means "deliver new connections for this port to me". S S H D, the SSH server, listens on twenty-two. Your FastAPI app on eight thousand. And normally only one program can listen on a given port and address at a time.

B: Oh, that's the "address already in use" error.

A: That's the one. When you forgot the old uvicorn was still running. And then on the client side, when your code connects out, the kernel picks a temporary port for your end. It's called an ephemeral port, and it comes from a reserved range. On macOS that's forty-nine thousand one hundred fifty-two up to the top, sixty-five thousand five hundred thirty-five. On Linux, by default, thirty-two thousand seven hundred sixty-eight up to sixty thousand nine hundred ninety-nine. Remember that Linux range, it matters later.

A: And your program never actually touches ports or packets. It holds a socket. A socket is the kernel object your program uses to send and receive network data. In code it's a file descriptor, a small integer, same as an open file. You read it and write it, and the kernel does the protocol. When you call socket dot socket in Python, you're asking the kernel for one. And everything T C P does, the retries, the ordering, the timers, all of that happens inside the kernel, on the far side of that socket. All you ever see is send and receive.

B: [skeptical] Okay, but then how does one server port handle thousands of clients? If FastAPI's on eight thousand, and a thousand people connect to eight thousand...

A: Because a T C P connection isn't named by one port. It's named by four numbers. Source I P, source port, destination I P, destination port. That's called the four-tuple. All thousand connections share the server half, same I P, port eight thousand. But they differ in the client half. Different machine, or at least a different ephemeral port. And if you add the protocol, T C P or U D P, you get the five-tuple, which is the thing firewalls and load balancers hash on to decide where a packet goes.

A: So picture one server box on the right with three slots in it. Port twenty-two, S S H D, T C P. Port eight thousand, uvicorn, T C P, and inside that slot there are two separate little connection sockets. And port fifty-three, D N S, U D P. On the left, two clients. Your laptop running a Python requests call from some port in the fifty-thousands, and the Spark running curl from a port in the forty-thousands. Both arrows land on port eight thousand. Same server port, different four-tuple, so the kernel treats them as two completely different connections. And the U D P slot on fifty-three has no connections in it at all. Just datagrams, from anyone.

<!-- section: The Idea: UDP -->

A: [matter-of-fact] So, U D P. User Datagram Protocol, R F C seven sixty-eight, from nineteen eighty. And it's almost nothing. It takes an I P packet and adds exactly four fields, eight bytes in total. Source port. Destination port. Length. And a checksum. That's the whole protocol.

B: Checksum meaning it catches corruption?

A: Right. It's a small number computed from the packet's bytes. The receiver recomputes it, and if it doesn't match, some bits got flipped on the way, and the packet's just thrown away. Quietly. So what you get from U D P is, each send to becomes exactly one datagram. A datagram's a self-contained packet that carries its full destination address and gets delivered, or not, on its own. No relationship to the ones before or after. And each receive-from hands you exactly one of them, whole, boundaries intact. What you don't get is any guarantee that it arrives. Or that it arrives once. Or in order. If a router drops it, nobody resends it, and nobody tells you.

B: [skeptical] So it's strictly worse. It's I P with a port number stapled on.

A: That's kind of the right description, but not "strictly worse". Notice what it also means. There's no setup. The very first packet carries data. There's no state on the server for each client, nothing to remember. And nothing ever waits. If packet seven is lost, packet eight gets delivered the moment it shows up. For some jobs, those are exactly the properties you want. Hold on to that "nothing ever waits", it comes back when we get to games and video.

<!-- section: The Idea: TCP's promise -->

A: T C P, Transmission Control Protocol, promises something much bigger. It gives two programs a reliable, ordered, two-way stream of bytes over unreliable I P. And it slows down when the network's congested. The promise is: whatever bytes you write into one end come out the other end. All of them. In the same order. Exactly once. Or you get an error. It looks like a pipe between two programs.

A: And it's called a byte stream, and that word has a consequence people trip on for years.

B: Byte stream as opposed to what? I mean, I send a message, they get the message.

A: [playful] That's the trap. Say you call send with "hello", and then send with "world". Two sends. What does the other side's receive give you?

B: "hello", and then the next receive gives "world".

A: [gently] It might. Or one receive might hand you "helloworld", all ten bytes together. Or if the messages were bigger, two sends of a hundred bytes might come out as one receive of two hundred, or a receive of thirty-seven and then one of a hundred sixty-three. T C P has no idea where your messages begin and end. It only knows bytes, in order. So framing your messages, deciding where one ends, is your job. And that's why every protocol on top of T C P, H T T P, Postgres, Redis, every one of them has some way of saying how long each message is.

B: So U D P keeps the boundaries but loses the data, and T C P keeps the data but loses the boundaries.

A: [amused] That's a really nice way to put it, yeah.

A: Now picture both headers drawn to scale. Rows of thirty-two bits, left to right. U D P is two rows. Source port, destination port. Length, checksum. Done, eight bytes. T C P is a tall block, twenty bytes before any options. The ports again on top. Then a full row for the sequence number, meaning "where my first byte sits in the stream". Then a full row for the acknowledgment number, "the next byte I want from you". Then a row with a header length, a few flag bits, S Y N, A C K, F I N, R S T, which we'll meet, and a field called the window, meaning "how much room I have left". Then a checksum, a field called the urgent pointer, and then optional extras. And the thing to notice is that almost every field in that tall block is one piece of the reliability machinery. Where this data sits. What I've got from you. How much room I have. And both of these ride inside an I P header that's itself twenty bytes.

<!-- section: The Idea: Trick 1, numbers and acks -->

A: So, let's build the promise. One trick at a time, the same order you'll build it in code. Picture mailing a three-hundred-page manuscript to a publisher. One page per envelope. Through a postal service that loses some envelopes and delivers the rest in random order. What's the first thing you'd do?

B: Number the pages.

A: Number the pages. Then the publisher can put them back in order, notice the gaps, and throw away any page they got twice. That's a sequence number. A counter stamped on each piece of data. Real T C P numbers every byte of the stream, not every packet. Your channel's going to number packets, which is simpler and teaches the same thing.

A: Second thing. The publisher mails postcards back. "Got everything up to page forty-one." That's an ack, short for acknowledgment. And T C P's acks are cumulative. They don't list which pages arrived. They say "I have everything before N, send N next". Which is a lovely property, because if one postcard gets lost, the next one says the same thing, and more. A lost ack gets repaired by any later ack, for free.

<!-- section: The Idea: Trick 2, retransmit -->

A: Now, what if an envelope is lost? The publisher can't complain about a page they never knew existed. So it has to be you, the sender. You start a timer when you post a page. If no postcard covering it comes back in time, you post it again. That's the retransmission timeout. People call it the R T O. It's how long the sender waits for an ack before assuming the data's lost and resending it. Set it too short and you waste bandwidth sending copies. Too long and the connection just sits idle, waiting.

B: [a bit unsure] But how does the sender actually know the page was lost? Maybe it arrived and the postcard's just late.

A: [firmly] It doesn't know. That's the key thing. The sender can't tell the difference between "my page was lost", "the postcard was lost", and "the postcard's just slow". In all three cases it resends. So the receiver has to be ready for duplicates. Which is why sequence numbers had to come first. Without them, a duplicate looks like new data.

A: And the simplest protocol you can build out of just those two tricks is called stop-and-wait. Send page one. Wait for the postcard. Send page two. Wait. It works, it's correct. It's also dreadfully slow. And you should be able to say exactly how slow before you build it.

<!-- section: The Idea: Predict, stop-and-wait -->

A: So try it. Stop-and-wait between California and a server in Europe. Round trip's a hundred and fifty milliseconds. The link is one gigabit per second, and each packet carries twelve hundred bytes. What throughput do you get? And then, does upgrading to a ten gigabit link help?

B: [working it out] A gigabit's... a hundred twenty-five megabytes a second. So, I mean, I'd guess you get a decent chunk of that. And then ten gig, ten times faster, so yeah, it helps.

A: That's the natural guess, and it's the one this is designed to knock out. Count it the other way. You send one packet, then you wait a whole round trip before you're allowed to send the next. So you move twelve hundred bytes every hundred and fifty milliseconds. That's about seven of those per second, and seven times twelve hundred is about eight kilobytes per second.

B: Eight kilobytes. On a gigabit link.

A: Eight kilobytes a second. That's about six thousandths of one percent of a link that can do a hundred twenty-five megabytes a second. And upgrading to ten gigabit changes nothing. Literally nothing. The link was never the limit. You spent more than ninety-nine point nine nine percent of your time waiting for acks.

B: So the wire's just sitting empty.

A: [thinking out loud] Sitting empty. And this is the idea from the latency lesson, the one about bytes in flight. Quick reminder of how that went. The amount of data that's "in the pipe" at any moment is the bandwidth times the latency. Like, if a link moves a hundred megabytes a second and data takes a tenth of a second to get across, then at any instant about ten megabytes are on their way, inside the wire. That's how long the pipe is, in bytes. And here the pipe is a hundred and fifty milliseconds long, and you're putting exactly one packet in it at a time.

<!-- section: The Idea: Trick 3, the sliding window -->

A: So the fix is obvious once you see it. Post several pages before you hear back. Allow up to some number, call it W, of unacknowledged packets in flight at once. When an ack comes in, the oldest ones are done, and you can post that many new ones. So the set of "sent, but not acked yet" sequence numbers slides forward along the stream. That's the sliding window.

B: And W should be how big?

A: Big enough to keep the pipe full for a whole round trip. That's called the bandwidth-delay product. Bandwidth times round-trip time. It's literally the bytes-in-flight number from a second ago. And a sender needs at least that much unacknowledged data out there to use the link fully. So for that gigabit link to Europe: a hundred twenty-five megabytes a second times point one five seconds. About eighteen point seven five megabytes.

B: [surprised] Eighteen megabytes in flight. Unacknowledged. At all times.

A: At all times, just to fill one link to Europe. Remember that number, it explains several things later. For comparison, your home Wi-Fi to the Spark over Tailscale, roughly sixty megabytes a second with a five millisecond round trip, is only about three hundred kilobytes. And inside a datacenter, a hundred gigabit link, which is twelve and a half gigabytes a second, with a round trip of a fifth of a millisecond, is about two and a half megabytes. Short pipes, small windows. Long fat pipes, huge windows.

A: Now, when a packet in the window gets lost, what do you resend? The simplest answer is called go-back-N. When the timer fires, you rewind to the oldest unacked packet and send everything from there again. And the receiver stays dumb: it only accepts the exact next packet it's expecting, and drops anything out of order. It's wasteful, because the receiver might already have had most of what you resend. But it's simple, and it's the version you build first. The smarter version's called selective repeat. Resend only the ones that were actually lost. That needs the receiver to hold onto out-of-order packets, and the sender to know which ones arrived. And T C P does this, with something called SACK, which we'll get to.

<!-- section: The Idea: Predict, window fill, and the simulator -->

A: Here's a smaller version you can work in your head. A packet takes twelve milliseconds to put on the wire, just pushing its bits out, and the round trip's about a hundred and eight milliseconds. No loss. What's the smallest window that reaches full link speed? And what happens if you double it past that?

B: [working it out] So, a hundred and eight divided by twelve... nine. Nine packets.

A: Nine. With a window of nine, you finish putting packet nine on the wire right as the ack for packet one comes back. So you never pause. A window of one gets you a ninth of the link. About eleven kilobytes a second out of a hundred. A window of four, about four ninths.

B: So if you doubled it to eighteen, you'd get—

A: [jumping in] No, that does nothing for throughput. Once the window covers the round trip, the link itself is the bottleneck. The extra packets just wait in line. And on a real network, that line is a router's queue. Filling it up adds delay for everybody using that router. Hang on to that, it's congestion control in a sentence.

A: And there's a simulator for exactly this setup. A sequence diagram, client on one side, server on the other, time flowing downward, every packet a diagonal line going across and every ack a diagonal line coming back. Two sliders, loss and window, and readouts for goodput, meaning the useful data that got through, plus what fraction of link speed that is, and how many sends were retries. Start at window one, no loss, and you get this lonely zigzag. One packet across, one ack back, one packet across. Eleven kilobytes a second, a ninth of the link. That's stop-and-wait. Drag the window up to nine and the diagonals pack together into a solid band. The sender never idles. A hundred kilobytes a second.

B: And then you add loss.

A: Then you nudge loss to five percent, still window nine. Now every time a packet dies, you see a little X, then a quiet gap, nothing happening, for one whole timeout. Then a burst of blue lines: the whole window being resent. Throughput drops to around forty percent of the link. And roughly a third of everything sent is a copy. That's go-back-N's cost. One lost packet throws away up to a whole window of work. And then if you push the window to sixteen at five percent loss... more retries, barely any more goodput. Under loss, a bigger window mostly buys you bigger rewinds.

<!-- section: The Idea: What real TCP does better -->

A: So your channel and real T C P share the same skeleton. T C P just adds a few refinements, and each one fixes a weakness you'll actually hit in your version. First, the timer. Yours is going to be a fixed number you pick. T C P times its own packets. It keeps a smoothed average of the round trip, and a measure of how much that round trip jumps around. And it sets the timeout to the average plus four times the jumpiness. So a steady link gets a tight timer, and a jittery link gets slack. That's Jacobson's formula from nineteen eighty-eight. And after each timeout it doubles the timer, so a dead link gets probed less and less often.

B: That seems sensible.

A: [wry] It is, but there's a catch. There's a floor. Linux won't set the timer below two hundred milliseconds. The official standard actually says one second. So on a datacenter link where the round trip is one millisecond, one lost packet that has to wait for the timer costs you two hundred milliseconds. That's a stall two hundred times the round trip.

B: [skeptical] For one packet.

A: For one packet. Which is why the second refinement matters so much: don't wait for the timer when you can guess. Say packet five is lost, but six, seven and eight arrive. Each time, the receiver acks "I still want five". Those repeats are called duplicate acks. And three of them in a row tell the sender, okay, five is almost certainly gone, later stuff is getting through. So it resends five right away. That's fast retransmit. It repairs a single loss in about one round trip instead of a whole timeout. And timeouts become the rare, expensive fallback.

A: Third: it resends only what's missing. That's SACK, selective acknowledgment. The receiver lists the actual ranges it's holding beyond the gap, so the sender fills just the holes. So real T C P is selective repeat, not go-back-N.

A: And fourth, it respects the receiver's space. Remember that window field in the header, "room I have left"? Every ack carries it. "I've got this many bytes of buffer free." And the sender never has more than that in flight. That's flow control. Stopping a fast sender from drowning a slow receiver. Now here's a fun consequence. That field is sixteen bits, so it maxes out at sixty-four kilobytes. And at a hundred fifty milliseconds round trip, sixty-four kilobytes per round trip caps you at about four hundred thirty kilobytes a second. No matter how fast the link is.

B: [working it out] And you needed eighteen megabytes in flight for Europe. So that's off by, what, a factor of three hundred?

A: Way off. So long fat links forced an add-on called window scaling. Both sides agree during setup to multiply that sixteen-bit window by up to a big power of two, which allows windows up to about a gigabyte. And it's also why the size of your socket buffers matters on long, fast links. If the buffer can't hold a bandwidth-delay product's worth, the window can't either. And in Break It you get to see what happens when flow control is just missing.

<!-- section: The Idea: The handshake -->

A: Okay, opening and closing. Before any data moves, both sides need to agree on starting sequence numbers, and confirm each one can hear the other. T C P does it in three messages. The three-way handshake. First, the client sends a S Y N, short for synchronize: "here's my starting number". The server answers with a S Y N A C K: "got yours, here's mine". And the client sends an A C K: "got yours". After that, both sides know the other's alive and which numbers to expect.

B: Why three, though? Feels like two should do it. I say hi, you say hi back.

A: [patiently] Because each side picks its own starting number, and each side needs the other to confirm it. Client says "mine starts at x". Server says "got x, and mine starts at y". That middle packet's doing two jobs at once. Then the client says "got y". If you stopped at two messages, only one direction would be confirmed. The server would never know its number made it.

A: And those starting numbers are random, not zero. Two reasons. One, a stray packet from an old connection between the same two ports shouldn't happen to land inside the new connection's numbers. Two, an attacker who can't see your traffic shouldn't be able to guess the numbers and inject data into your connection.

A: So picture the whole life of a connection as two vertical lines, client on the left, server on the right, time going down. A diagonal goes across, that's the S Y N. One comes back, S Y N A C K. And then the client's A C K goes across with the actual request riding along with it. Then the response comes back. And on the left there's a bracket: the handshake took one round trip, the request took another. More requests on the same connection after that cost one round trip each. Then the close, further down. Four diagonals, which I'll explain in a sec. And then a shaded box on the client's line labeled TIME WAIT.

<!-- section: The Idea: Predict, first byte -->

A: Try this one. You open a brand new H T T P S connection from California to a server in Europe. Hundred and fifty millisecond round trip. You send one small request. T C P takes a round trip to connect. T L S, the encryption setup, version one point three, takes one more. Then the request and response take one. How long until the first byte of the response comes back? And how long for a second request on that same connection?

B: Three round trips, so... four fifty? And the second one's just the one round trip. A hundred and fifty.

A: That's it. About four hundred and fifty milliseconds before the server has even started thinking about your request. Then about a hundred and fifty for the next one. A three-x difference. And that's why every H T T P client you use tries really hard to keep connections open and reuse them. It's why calling requests dot get in a loop, which opens a new connection every time, is so much slower than using a requests Session. And Q U I C, which is coming, folds the transport handshake and the encryption handshake into one.

<!-- section: The Idea: Closing and TIME_WAIT -->

A: Closing is the mirror image, but done once for each direction. Each side sends a F I N, meaning "I'm finished sending", when it's done writing, and the other side acks it. And the other side can keep sending until it sends its own F I N. That's called a half-close. So that's the four diagonals: F I N, ack, F I N, ack. There's also a rude version. An R S T, a reset. It kills the connection immediately. No goodbye.

B: Is that the "connection reset by peer" thing?

A: That's exactly what that is. You get one when you connect to a port nobody's listening on, or when a process crashes with the connection still open. Now the strange part. The side that closed first doesn't forget the connection. It sits in a state called TIME WAIT for twice the maximum segment lifetime. That lifetime's the longest a packet's assumed to wander around the network before it dies. Linux hardcodes the whole TIME WAIT to sixty seconds. On macOS it's thirty.

B: [skeptical] Thirty seconds of remembering a dead connection. Why not just forget it?

A: Two reasons. First, if its very last ack got lost, the other side's going to resend its F I N, and somebody has to still be there to ack it again. Second, old, delayed packets from this connection might still be floating around the network. If a new connection with the same four-tuple opened immediately, those stragglers could land in it and look like fresh, valid data. And you're actually going to build exactly this bug by accident in your channel. Which is a pretty good way to never forget why TIME WAIT exists.

A: And it has a cost you can compute. Say a client's making lots of short connections to one server's port. The server half of the four-tuple is fixed, so each connection needs its own client port. And each port's stuck for sixty seconds after it's used. On Linux you've got about twenty-eight thousand ephemeral ports. Twenty-eight thousand ports, each usable once a minute, is about four hundred seventy new connections per second. To a single destination. Past that, connect starts failing with "cannot assign requested address".

B: Oh, that's very much a scraper problem. Or a load tester.

A: A scraper or a load tester that doesn't reuse connections hits that wall. And the fix is never a kernel setting. It's reusing connections.

<!-- section: The Idea: Keep-alive and connection reuse -->

B: [a bit unsure] So that's keep-alive. Like, you turn on keep-alive and the kernel keeps the—

A: [jumping in] So, careful, there are two different things that share that name, and people mix them up all the time. One is H T T P keep-alive. That means "don't close this connection after this request, I'm going to send another one". It's the default in H T T P one point one, and a connection pool, like requests Session or an httpx Client, does it for you. It saves you the handshake, the T L S setup, and slow start, which is next, on every request after the first. It's the single cheapest latency win in most client code.

A: The other is T C P keepalive. That's an optional kernel feature. After a connection's been idle for a while, the kernel sends a tiny probe to check the other side is still there. It's off by default for most sockets. And when it is on, the default idle time is two hours, on both Linux and macOS.

B: Two hours. Wait, so an idle connection just... sends nothing?

A: [dry] Nothing. A T C P connection with nothing to say sends nothing. There's no heartbeat. So if the server's machine loses power, your idle connection looks perfectly healthy, right up until you try to write to it. And worse, the boxes in between, home routers doing address translation, load balancers, they forget idle connections after a few minutes and silently drop whatever comes later. So anything that holds connections open and idle, database pools, SSH sessions, streaming clients, either turns on T C P keepalive with a much shorter idle time, or sends its own pings. The SSH setting Server Alive Interval is exactly that.

B: So if my SSH to the Spark freezes after I walk away for a while...

A: That's the classic version. Something in the path forgot about you.

A: So put the pieces together on something real. Say an API client makes a thousand small requests to a service in another region, with a seventy millisecond round trip, and it opens a fresh connection each time. Each one pays the T C P handshake, one round trip, then T L S, another, then the request itself. So about two hundred ten milliseconds per request instead of seventy. Three times slower before the server even does anything. Each new connection starts cold in slow start. And every closed connection leaves a TIME WAIT entry behind, so at high rates to one destination you're heading for that four seventy a second wall. The fix: a connection pool, so connections stay open, and if the requests don't depend on each other, run them concurrently. And if the connections sit idle through a router or a load balancer, add keepalives, or just expect to reconnect.

<!-- section: The Idea: Congestion control -->

A: [more serious] Now, back to the nineteen eighty-six problem. Flow control protects the receiver. But nothing so far protects the network. Between you and the server there are routers, and routers have queues. If every sender sends as fast as its window allows, the queues fill, the routers drop packets, senders time out and resend, the queues fill more. That's the Berkeley link all over again.

A: So T C P keeps a second window, private to the sender. The congestion window. It's the sender's guess at how much data the path can hold right now. And at any moment, the amount in flight is capped by whichever is smaller, the congestion window or the receiver's window. Nobody tells the sender the right value. It has to discover it. And it uses loss as the signal that it went too far.

A: The classic algorithm, called Reno, which came out of Jacobson's work, has two phases. The first is slow start. A new connection starts with a small window. On modern stacks that's ten packets, about fourteen kilobytes. And it doubles the window every round trip.

B: [amused] Doubles every round trip and it's called slow?

A: [laughs] I know. It's slow compared to the old way, blasting the entire window out at once. It's actually exponential. Exponential growth finds the right neighbourhood fast. Then the second phase, past a threshold, is called additive increase, multiplicative decrease. Grow by just one packet per round trip. On a loss, cut the window in half. And on a timeout, which means things are really bad, drop all the way back to the start. And here's the nice part: lots of senders all doing this on one link end up sharing it fairly.

A: If you plotted the window over time, you'd get T C P's signature sawtooth. Time in round trips along the bottom, window size going up. It starts low and curves up steeply, doubling, doubling, until the first loss. Then it drops to half. There's a dashed line at sixteen packets, that's the threshold after the first loss. From there it climbs in a straight, gentle ramp, one packet per round trip, until another loss chops it in half again. Ramp, chop, ramp, chop. That plot starts from one packet just so you can see the curve. Real stacks start at ten. And the thing to take from it is: the window sets the speed, not the link. Throughput's roughly the window divided by the round trip.

<!-- section: The Idea: Predict, slow start -->

A: So, try this. A fresh connection to Europe, a hundred fifty millisecond round trip, gigabit link. The first window is ten packets of about fourteen sixty bytes each, so about fourteen point six kilobytes. It doubles each round trip. How many round trips to deliver a one megabyte response? Forget the handshake.

B: [working it out] It's a gigabit link. A megabyte's... eight milliseconds of gigabit. So one round trip?

A: [gently] That's what the link could do. Now count what the window lets you do. First round trip, fourteen point six kilobytes. The window doubles, so the second one sends about twenty-nine more, and you've got about forty-four total. Then a hundred and two. Then two nineteen. Then four fifty-three. Then nine twenty, still short of a megabyte. And the seventh round trip takes you to about one point nine megabytes. So seven round trips. About one point oh five seconds, plus the handshake.

B: A second for one megabyte. On a gigabit link.

A: About one megabyte a second, which is less than one percent of the link. So for small and medium transfers over long distances, slow start sets the speed, not bandwidth. And that's another reason to reuse warm connections. A reused connection keeps the window it's already grown, unless it sat idle long enough that the kernel resets it.

<!-- section: The Idea: Loss, distance, and the Mathis rule -->

A: There's a famous rule of thumb for loss-based control, from Mathis and colleagues in nineteen ninety-seven. For a long-running flow, Reno-style, throughput is roughly the packet size divided by the round trip, times about one point two two, divided by the square root of the loss rate. You don't need to carry the formula around. Read it as two facts. Double the distance, halve the speed. Quadruple the loss, halve the speed. Quadruple, because of that square root.

B: Give me a real number.

A: Fourteen sixty byte packets, a hundred fifty millisecond round trip, one percent loss. Packet over round trip is about ten kilobytes a second. Square root of one percent is a tenth, so dividing by it is times ten. Times one point two two. About a hundred twenty kilobytes per second. And that's regardless of how fast your link is.

B: [surprised] A gigabit link, and a hundred twenty kilobytes.

A: That's why a slightly lossy long-haul link feels like dial-up. So if one T C P flow is getting a megabyte a second on a gigabit link, that's your answer. Its speed is window over round trip, and with loss-based control, the window's set by how often packets get lost. Short transfers are even worse because they never leave slow start. And the fixes follow straight from the rule. Shorten the round trip, meaning serve from somewhere closer. Reuse warm connections. Run several connections in parallel. Or use a congestion controller that doesn't treat random loss as congestion.

A: Which brings up two modern ones worth knowing by name. CUBIC is the default on Linux, since two thousand six, and on macOS. Your Mac and the Spark are both using it right now. It grows the window as a cubic function of time since the last loss, which means it climbs back to its old level quickly on fast, long links. But it still treats loss as the signal. And then there's B B R, from Google, in two thousand sixteen. Bottleneck bandwidth and round-trip propagation time. It stops treating loss as the main signal. It keeps measuring the fastest delivery rate it's seen and the smallest round trip it's seen, multiplies them, which is the bandwidth-delay product again, and sends at that rate. So it does much better on links with random loss that has nothing to do with congestion, and it avoids filling up router buffers, which keeps delay low. Google runs it for YouTube and its own services.

<!-- section: The Idea: Nagle's algorithm -->

A: Okay, this next one's going to matter for your LLM server. Early nineteen eighties. People type into remote terminals over T C P. Every keystroke is one byte of data, wrapped in forty bytes of headers. On a busy slow link, these little packets, people called them tinygrams, clogged everything. Mostly headers, barely any data.

A: John Nagle's fix, in nineteen eighty-four, is one rule. If you have unacknowledged data in flight, don't send a small packet. Hold small writes in a buffer until the ack comes back, or until you've got a full packet's worth. And that's on by default in every T C P stack, to this day.

A: Now meet its partner. Receivers often use delayed acks. Instead of acking every packet immediately, the receiver waits a little, typically forty milliseconds on Linux, up to two hundred on some systems, hoping it can piggyback the ack on a reply, or cover two packets with one ack. And separately, both of those are reasonable. Put them together and you get a famous stall. You write a small header. Then a small body. The header goes out. The body's small, and there's unacked data in flight, the header, so Nagle holds the body. Over on the receiver, it's got a header but no complete request, so it has nothing to reply with. So it delays its ack.

B: [working it out] So the sender's waiting for the ack before it sends the body, and the receiver's waiting for the body before it acks. They're both waiting on each other.

A: Both waiting, until the delayed-ack timer finally fires. About forty milliseconds on Linux. And then everything moves. Now think about token streaming. It's a sequence of exactly these small writes. One server-sent event, a few dozen bytes, per token. With Nagle on, a token that's written while the previous one is still unacked has to wait for that ack.

B: Oh, so that's the thing where tokens show up in clumps. Like every forty milliseconds or so you get a little burst.

A: That's the symptom, exactly. Tokens arrive in clumps, and your time to first token and the gap between tokens look worse than the model actually is. If you see bursts every forty milliseconds or so, your first guess should be Nagle fighting delayed acks. The fix is one socket option, T C P no delay. It turns Nagle off, so every write goes out as soon as the window allows. And it's the right setting for anything interactive. Streaming, R P C calls, games over T C P, SSH. Lots of frameworks set it for you. Go's networking package does by default. But don't assume. Python's plain socket doesn't. On a fresh socket on Python three point fourteen, asking for that option gives back zero, meaning off. So check it yourself with get sock opt, rather than trusting a blog post. And check it on the server, and on any proxy in between, like nginx or a load balancer.

B: And if it's on and I still see clumps?

A: Then look for buffering at another layer. The web framework buffering its output. A reverse proxy with response buffering turned on. Or gzip on the stream, which waits to collect enough bytes to compress.

<!-- section: The Idea: Head-of-line blocking -->

A: Next cost. T C P's promise is "in order". Think about what that costs when one packet's lost. Packets six, seven, eight and nine have arrived. They're sitting in the receiver's kernel. But five is missing. So the kernel can't give your program six through nine, because that would break the order. Everything waits for five's retransmission. A round trip at best, a whole timeout at worst. That's head-of-line blocking. One lost or slow thing at the front of an ordered line holds up everything behind it, even stuff that's ready.

B: [skeptical] But for a file that's kind of fine, right? I need byte five before byte six anyway.

A: For one file, totally fine. It hurts when one T C P connection carries several independent things. And H T T P two does exactly that. It multiplexes lots of requests as separate streams over one connection. So a lost packet carrying a piece of an image stalls the JSON response and the CSS file too. Even though their bytes are sitting right there in the kernel.

B: That's kind of absurd. The data's already on the machine.

A: It is absurd, and it's measurable. On lossy networks, mobile, bad Wi-Fi, H T T P two over one connection can do worse than the older H T T P one point one, which just opened six separate connections. Picture it as two rows. On top, one T C P stream with packets from three different streams interleaved: A one, B one, A two, C one, C two. B one is lost. A one gets delivered. Everything after it, A two, C one, C two, arrived but is stuck in the kernel. All three streams stall. Underneath, the same packets, but now each stream has its own row and its own ordering. B one's still lost, but only stream B waits. A and C are delivered. That bottom row is Q U I C.

<!-- section: The Idea: Why QUIC rebuilt TCP on UDP -->

A: So by the twenty-tens, T C P's problems were clear. The handshake round trip, plus a separate T L S handshake on top. Head-of-line blocking across streams. And connections tied to the four-tuple, so when your phone walks from Wi-Fi onto cellular and gets a new I P address, every connection dies.

B: So fix T C P. Add streams to it, change the handshake.

A: [sighs] That's the obvious move. And you basically can't make it. T C P lives in the operating system kernel. Changing it means waiting years for every phone, laptop and server on the planet to update. And worse, the internet's full of middleboxes. That's any device in the path that inspects or rewrites packets beyond plain routing. Address-translating routers, firewalls, load balancers, corporate proxies. Lots of them only understand T C P and U D P, and they drop anything else. There was a perfectly good transport called S C T P, standardized in two thousand, with multiple streams built in. It never made it across the public internet, for exactly that reason. Even new T C P options get stripped by middleboxes that "know" what T C P is supposed to look like. People call this ossification. The protocol can't change anymore in practice, because too many devices in the path have hardcoded assumptions about it.

B: Huh. So it's frozen by everybody else's assumptions, not by the spec.

A: Right. So Google, and then the standards body, the I E T F, built Q U I C on top of U D P. U D P gets through middleboxes. And it's thin enough to be a blank canvas. Everything else, sequence numbers, acks, retransmission, congestion control, the same tricks you're building, lives inside the Q U I C library. In user space. Inside your browser, or your server program. So it ships with an app update, not a kernel update. And almost the whole Q U I C header is encrypted, so middleboxes can't build assumptions about it, and it can't ossify the same way. It became an official standard in twenty twenty-one.

A: What that buys you. One handshake, not two. The transport setup and the T L S one point three setup happen together, in one round trip. And reconnecting to a server you've talked to before can send data in the very first packet. That's called zero R T T, zero round trips.

B: What's the catch on that one?

A: The catch is that first-packet data can be replayed. An attacker can record it and send it again. So it's only for safe requests, things it's fine to run twice. Next, no head-of-line blocking across streams, the bottom row from a minute ago. And connection migration: connections are named by an ID, not by the four-tuple, so your phone changing networks keeps its connections. And H T T P three is just H T T P on top of Q U I C. Same requests and responses as H T T P two, new transport underneath. A large share of web traffic from the big providers uses it now. And the punchline for this whole episode: when people needed a better T C P, they rebuilt reliability on U D P. Exactly what you're about to do in Python. Just with thirty more years of tricks.

<!-- section: The Idea: So when do you pick UDP? -->

A: So when do you pick U D P yourself? Three situations. When a late packet's as bad as a lost one. When a whole exchange fits in one packet. Or when something above you already does reliability.

A: D N S, the thing that turns names into addresses, is the second kind. One small question, one small answer, usually under five hundred twelve bytes. A T C P handshake would triple the cost. And if the answer doesn't come back, the client just asks again. D N S does switch to T C P for big answers, though.

A: Games are the first kind. Where a player was a hundred milliseconds ago is useless the moment you know where they are now. If you retransmitted the old position, the fresh update would have to wait behind the stale one. That's head-of-line blocking at its absolute worst. So games send state over U D P and resend only what still matters. Voice and video calls, same thing. A video frame that arrives after it should've been shown is garbage. So Web R T C, and R T P under it, use U D P and hide losses instead of retransmitting. Skip a frame, interpolate, ask the other side for a fresh full frame.

B: [skeptical] And Tailscale? That one still bugs me. It's carrying my SSH session. Wouldn't you want the tunnel to be reliable, like, a T C P tunnel would be safer?

A: [gently] That's the natural instinct, and it's backwards. Your SSH connection to the Spark is T C P. And it's riding inside WireGuard packets, which are U D P. Now imagine the tunnel itself were T C P. You'd have two reliability loops stacked on top of each other. A single loss would make both the outer T C P and the inner T C P back off and retransmit. And their timers fight. The outer one's busy resending, which looks like a huge delay to the inner one, which times out and resends too, which piles more into the outer one. It's called T C P over T C P meltdown.

B: Oh. So the tunnel just carries packets or drops them, and lets my SSH's T C P deal with it.

A: Once. Exactly once. And when U D P is blocked entirely, on some locked-down network, Tailscale falls back to its relay servers, called DERP, over H T T P S. And you'll feel it in the latency. And the last case, of course, is Q U I C itself, for everything we just said.

<!-- section: Build It -->

A: Okay. So you're going to write a little transport protocol. Everything runs on your own machine, over loopback, the network interface that just talks to itself, with nothing but the Python standard library. Four programs. A sender that reads a file and sends it. A receiver that writes it out. A proxy in the middle that loses, delays and reorders packets on purpose. And a benchmark that runs the whole thing across different settings. The sender talks U D P to the proxy on port nine thousand, the proxy forwards to the receiver on nine thousand one, and acks flow back the same way. And before you run anything, you write your predictions down.

A: Step zero is just setup: the wire format, so the sender and receiver agree on bytes. Each packet is one byte saying what type it is, data, ack or fin, then four bytes of sequence number, then the payload. Python's struct module packs those in network byte order, which is big-endian, most significant byte first. And each packet carries twelve hundred bytes of payload, which keeps it under the size limits typical networks allow for a single packet.

B: And the sequence numbers count packets, not bytes.

A: Packets, starting at zero. And there are a few conventions so the pieces fit. The last packet of a file is a fin whose number is one past the last data packet. An ack carries the next sequence number the receiver wants, cumulative, like T C P. So "ack five" means "I have zero through four". And both sides bump up their U D P receive buffer to about four megabytes. You'll find out why the hard way in Break It. Two Mac-specific things: a single U D P datagram can't be bigger than nine thousand two hundred sixteen bytes by default, so don't raise the payload past that. And for a test file, two megabytes of random bytes from dev urandom is perfect.

A: Then the first real piece, which is yours to write: the evil proxy. It listens on nine thousand. Anything from the sender goes to the receiver, anything from the receiver goes back to whoever last sent it something. And on the way, it drops each packet with some probability, and holds each one for a fixed delay plus a random bit of jitter before forwarding it.

B: [working it out] And the random jitter is what reorders them. Two packets back to back, the second one gets a smaller random delay, it goes first.

A: That's it. The part that matters is how you hold packets. You keep a heap, a priority queue, of packets waiting to go out, ordered by when they're due. Then the loop waits on the socket with select, with a timeout set to however long until the earliest packet's due. If something arrives, you decide where it goes, roll the dice to maybe drop it, and push it onto the heap with a due time. Then you send everything whose time has come. A few hints. Use the monotonic clock for due times, never the wall clock, because the wall clock can jump. Put a counter in each heap entry, so when two due times tie, Python doesn't try to compare raw bytes. Seed your random number generator so runs are repeatable, you'll want that when you compare settings. And test the proxy before writing any protocol at all. Netcat as the receiver in one terminal, the proxy in a second, netcat as a sender in a third. Type lines, crank the loss to fifty percent, and watch some of them vanish.

A: Then stop-and-wait. The receiver keeps one number, expected, the next sequence number it wants. A packet arrives. If its number is expected, keep the payload, bump expected by one. Anything else, a duplicate, something out of order, ignore the payload. And then, always, send back an ack carrying expected. Even for duplicates.

B: Why ack a duplicate? You already have it.

A: [patiently] Because a duplicate means the sender didn't hear your last ack. Your ack got lost. If you stay quiet, the sender keeps resending forever. And after the fin arrives, keep re-acking anything that shows up for about half a second, in case that final ack got lost too, then finish. The sender side splits the data into chunks, numbers them, and for each one: send it, wait up to fifty milliseconds for an ack past it, resend on timeout, and count how many times you had to resend. Print a hash of the whole file on both sides, a SHA two fifty-six, just the first few characters. Run with zero loss, then five percent. The hashes have to match every time. If they ever don't, you've got a real bug. Don't move on.

B: And what should I predict for speed?

A: The proxy's round trip is about twice the delay plus half the jitter, plus some Python overhead. With a five millisecond delay and two milliseconds of jitter, that's roughly twelve milliseconds. So you'd predict one packet per twelve-ish milliseconds.

A: Next, the sliding window, go-back-N. Same receiver, it already works, since it only accepts expected and acks cumulatively. New sender. It tracks base, the oldest unacked packet, and next, the next new one to send, and one timer for base. While next is still less than base plus the window, and there's data left, send and move next forward. Then wait for an ack until the timer's deadline. An ack past base moves base up, and you restart the timer if anything's still out. If the timer expires, you resend everything from base up to next. Go back N. Build the whole list of packets once up front, so retransmissions resend the same bytes. And your first test: a window of one should behave identically to your stop-and-wait. If you want an upgrade that's worth doing, let the receiver hold onto out-of-order packets and drain them when the gap fills. The go-back-N sender still works, and you waste fewer resends.

A: Then the benchmark. For loss rates of zero, one and five percent, and windows of one, eight, thirty-two and sixty-four, start a fresh receiver, run a two megabyte transfer through the proxy, record megabytes per second and retransmissions. Fresh receiver each time, and Break It explains why. For a T C P baseline, the smallest pair you can write: a server that receives until the connection closes and counts bytes, and a client that sends the same two megabytes and then shuts down its sending side.

B: [skeptical] But that's not a fair fight. T C P's on clean loopback with no proxy.

A: It's not fair at all. No loss, no delay. A fair fight needs the kernel itself to delay and drop T C P's packets too, which needs root. On the Spark, Linux has a tool called net em, network emulator, set through t c, traffic control. On loopback, it delays and drops all local traffic, T C P and U D P alike. So you run your U D P sender straight at the receiver, no proxy, and the T C P pair, under the same settings. On the Mac, there's Apple's Network Link Conditioner, but check whether it actually affects loopback on your version before you trust it. And have an agent review the benchmark specifically for unfair comparisons. Timing process startup in one case but not the other. Or counting bytes as delivered before the receiver actually confirmed them.

A: Then you watch a real handshake. Run T C P dump on the loopback interface, with sudo, filtered to your T C P pair's port, and read the first few lines. You'll see a packet with flags shown as a capital S. That's the S Y N. Then S followed by a dot. The dot means ack, so that's the S Y N A C K. Then just a dot, the plain ack. Then data packets marked P dot, P for push. And at the end, F dot, in both directions, the close. Find the sequence and ack numbers and check them: the S Y N A C K acks the client's starting number plus one. T C P dump shows numbers relative to the start by default. There's a flag to show the raw random ones. The "win" field is the receiver's window. And in the options on the handshake, you'll see the two sides agreeing on the maximum packet size and on window scaling.

B: That's actually what I want to see. The random starting number, plus one.

A: Then on the Spark, with net em loss on, capture a transfer and find the retransmissions. Wireshark can highlight them for you. And it has a graph that plots sequence number against time. The slope is throughput, and every flat step is a stall, you can literally see the timeouts. While a transfer's running, the command s s with the t and i flags shows each connection's live congestion window, round trip, and retransmission counts. On the Mac, netstat's T C P statistics show system-wide retransmission counts, so you check before and after. An agent can explain what any line means. But reading those lines is the skill, so don't ask it to just summarize the capture.

A: And the optional last step, on the Spark: net em with ten milliseconds of delay each way, which makes about a twenty millisecond round trip, and one percent loss. Then add five milliseconds of jitter and five percent loss, and the jitter reorders packets, just like your proxy. And one rule. Only ever do this on loopback. Never on the interface your SSH or Tailscale session runs over, or you can lock yourself out of your own machine. And always delete the setting when you're done. Then rerun the T C P baseline and your channel, straight through, at zero, one and five percent loss. And try the Nagle stall under that ten millisecond delay.

A: You're done when a two megabyte random file goes through the proxy at five percent loss with jitter and the hashes match, for both stop-and-wait and the window. When your stop-and-wait number lands within about thirty percent of what you predicted from the round trip. When you've seen the S, the S dot, the dot and a fin in a real capture and can say what each one does. And when you can explain every number in your table, including why your protocol beat T C P or lost to it.

<!-- section: Measure -->

A: So here's what a reference run looked like, on an M-series MacBook, Python three point fourteen, go-back-N with a receiver that buffers out-of-order packets. Two megabyte file, proxy at five milliseconds of delay and two of jitter, fifty millisecond timeout. Yours will differ. The shape shouldn't. At zero loss: window one, about point oh eight four megabytes per second. Window eight, about point seven six. Window thirty-two, three. Window sixty-four, six megabytes a second.

B: So it just keeps going up. Eight times the window, eight times the speed.

A: Linear, all the way to sixty-four. And window one is the round trip, nothing else. Twelve hundred bytes every fourteen milliseconds or so is about point oh eight five megabytes a second. That matches. And loopback can do gigabytes per second. You're using about a ten-thousandth of it. Same lesson as the Europe question, just at a smaller scale.

B: [a bit unsure] But in the simulator it flattened out at nine. Why doesn't this flatten?

A: Because loopback is so fast that the pipe, at twelve milliseconds, holds way more than sixty-four packets. In the simulator the link was slow, twelve milliseconds just to put one packet on the wire, so nine filled it. Here, each packet goes on almost instantly, so you never reach the bandwidth-delay product. The window is the only limit. Which, by the way, is exactly why a T C P connection with a too-small window, or too-small socket buffers, is slow on a fast, long link.

A: Now add loss. At one percent: window one, point oh seven six, with forty-one retransmissions. Window eight, point four nine, with a hundred fifty-two. Window thirty-two, one point two two, with four hundred twenty. Window sixty-four, two point one seven, with five hundred twelve. At five percent: window one drops to point oh five two, a hundred eighty-three retransmissions. Window eight, point two eight. Window thirty-two, point six eight. And window sixty-four, one point one five megabytes per second, with fourteen hundred and eight retransmissions.

B: So at five percent, the small window barely noticed, and the big one got hammered.

A: Window one kept about sixty percent of its speed. Window sixty-four kept nineteen percent. Every timeout idles a window-sixty-four sender for fifty milliseconds, that's three or four round trips of doing nothing, and then it resends up to sixty-four packets. Look at that count. Fourteen hundred and eight resends, for a file that's only sixteen hundred sixty-eight packets long. Most of those were packets the receiver already had. That's go-back-N's waste, and it's exactly why T C P uses SACK and fast retransmit.

A: And for comparison, plain T C P on loopback, no proxy, no loss, no delay, moved two hundred megabytes at about five gigabytes per second. The loss comparison couldn't run on the Mac, because net em needs root and Linux. So the T C P column under loss is yours to fill in on the Spark. Predict it first with the Mathis rule. Fourteen forty-eight byte packets, a twenty millisecond round trip, one percent loss. Packet over round trip is about seventy-two kilobytes a second. Times one point two two, divided by a tenth. About point nine megabytes a second. At five percent, about point four. Treat those as rough. Modern stacks with SACK and CUBIC do somewhat better than the formula.

B: [amused] So my window-sixty-four thing at one percent loss did two megabytes a second. I'm beating T C P.

A: You might well beat T C P under random loss. But not because you're cleverer than T C P. It's because yours never slows down when it sees loss. T C P assumes loss means congestion, and it backs off to protect everyone else on the link. Yours just keeps blasting. Put your protocol on a shared network and you're the nineteen eighty-six sender.

B: [laughs] Okay. Point taken.

<!-- section: Break It -->

A: Now you break it, four ways. First, what if you set the timer shorter than the round trip? Five milliseconds, against a twelve millisecond round trip. Zero loss.

B: I'd guess it falls apart. Everything times out.

A: [amused] That's the surprise. It works. A one megabyte transfer at window eight, hash matched, about the same speed. But it sent fifteen hundred eighty-two retransmissions, for eight hundred thirty-four packets. Nearly every packet went twice, because the timer fired before any ack could possibly have come back. And since throughput barely changed, you might never notice. But you just doubled your load on the network. Now picture every sender on a congested link doing that. That's why T C P measures the round trip continuously instead of trusting a constant, and why it backs the timer off after each timeout.

A: Second, run two transfers against one receiver. Make the receiver loop forever, serving one transfer after another without cleanly resetting, and run the sender twice, quickly. This one happened by accident while the lesson was being written. The receiver was still re-acking the end of the first transfer, so it sent the old file's final ack number. The new sender read that as "everything up to there is received", skipped most of its data, and reported a nonsense seventy megabytes a second, while the receiver got garbage.

B: [surprised] Oh. That's the stray old packets thing. From TIME WAIT.

A: That's exactly it. Old packets, with numbers that look valid, landing in a new conversation. That's precisely what T C P's random starting numbers and TIME WAIT exist to prevent. And you fix it the way T C P does: put a random connection ID, or a random starting sequence number, in every packet, and have each side ignore anything that doesn't match.

A: Third, take away flow control. Shrink the receiver's buffer to sixty-four kilobytes, and make the receiver slow, a little busy loop for each packet. Then send straight to it, no proxy. So there's no loss at all, except whatever the receiver causes. A ten megabyte transfer at window sixteen ran at fifty-eight point six megabytes a second, with zero retransmissions. At window two fifty-six? One point eight megabytes a second, and twenty-five thousand four hundred eleven retransmissions.

B: [skeptical] Wait, the bigger window made it slower? By a lot?

A: [quietly] About thirty times slower. The receiver's kernel buffer overflowed and silently dropped datagrams. And your sender couldn't tell that apart from network loss, so it did what it does with loss: resent whole windows. Which overflowed the buffer again. Real T C P avoids this because every ack advertises how much free space the receiver has. So the fix is: add a window field to your acks, and make the sender respect it. And this is also why, back in setup, both sides bumped their receive buffers.

A: And fourth, cause the Nagle stall on purpose. Plain T C P. A client that sends a ten-byte "header", then a ten-byte "body", then waits for a two-byte reply. The server only replies once it has all twenty bytes. Time fifty requests. Then turn on T C P no delay on the client and time them again. On the Spark, on Linux, you should see something like forty milliseconds per request with Nagle on, and well under a millisecond without. That's the delayed-ack timer. On a Mac's loopback, it couldn't be reproduced, about three hundredths of a millisecond either way, because macOS handles delayed acks on loopback differently. So treat the Linux number as check-it-yourself. And then fix it the other good way: build the whole message first and send it in one go, with a single send-all.

<!-- section: Connections and close -->

A: This all keeps coming back, by the way. The next step is what happens when you hit enter on a U R L, which puts this handshake on a timeline next to D N S and T L S, and the T L S lesson explains that second round trip. Writing H T T P from scratch is where the byte stream thing bites, because you have to find where one request ends. Streaming is where T C P no delay stops being trivia. And your home server setup is T C P inside U D P, with every idea here in play. If you want one source, Jacobson and Karels' nineteen eighty-eight paper is short and readable. And Kurose and Ross, chapter three, builds the exact same protocol you just built, step by step.

B: [working it out] Okay, let me try the whole thing. I P just tries. U D P is I P plus ports, so it's fast and never waits, but it can lose stuff. T C P makes it reliable by numbering everything, acking, resending, keeping a window full, and backing off when the network's busy. And the price is the handshake, and the stalls. So T C P is basically the safe default, and you use U D P when you need speed.

A: [gently] Mostly. But not "when you need speed". Your own channel might out-run T C P under random loss, remember, and only because it was rude. Raw speed isn't the reason to pick U D P. You use U D P when T C P's promise is the wrong promise. When a late packet's as useless as a lost one, so waiting for a retransmission only hurts. When the whole exchange fits in one packet, so a handshake would cost more than the question. Or when something above you already handles reliability, like the T C P inside Tailscale, or Q U I C. And T C P's price list is specific: a round trip before the first byte, slow start, head-of-line blocking, Nagle's little delays, and TIME WAIT. The promise is every byte, in order, exactly once. Sometimes that's the wrong promise to pay for.
