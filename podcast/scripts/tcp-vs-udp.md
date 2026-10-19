<!-- section: Probably, in some order -->

A: [relaxed, thinking out loud] So think about what you rely on all day without noticing. You post a little JSON body to the ranking service, a few kilobytes, and the service gets exactly those bytes, in order, nothing missing. You copy a huge checkpoint to the Spark, and the hash matches. A model streams tokens back, and you get "Hello" then "world". Never "world" then "Hello".

B: Sure. That's just how networks work.

A: That's the funny part. It's not how networks work at all. The network underneath, IP, makes one promise. It'll try. Your packet might not arrive. It might arrive twice. Two packets you sent in order might show up swapped. And nobody tells you which.

B: So something's cleaning that up.

A: Something in your kernel, on every machine you own, is turning "probably, in some order" into "definitely, in order". That's TCP. And it's not free. It charges you, mostly in round trips, and you pay that bill all day without ever seeing it.

B: [a bit unsure] And UDP is the other one. I've always kind of filed it as TCP without the safety checks. Like, TCP's the slow careful one, UDP's the fast risky one, and you pick based on whether you need speed.

A: That's the usual picture, and it's not quite wrong, it's just missing the interesting part. UDP isn't fast because it's reckless. It's that it doesn't make anyone wait. And by the end of this, you'll see that when people needed a better TCP, they built it on top of UDP.

<!-- section: Apartment numbers and bare envelopes -->

A: First, a small thing. An IP address gets a packet to a machine. But your laptop is running a browser, Slack, an SSH session, some Python script, all at once. Which one gets the packet?

B: Ports.

A: Ports. The IP address picks the building, the port picks the apartment. Your FastAPI server listens on one, SSH on another. And your program never sees any of this directly. It holds a socket, which is just a little handle the kernel gives you, like an open file. You write bytes in, you read bytes out. Everything TCP does happens inside the kernel, on the far side of that handle.

B: And UDP is, what, the minimum on top of that?

A: Almost nothing. It takes an IP packet and adds the two ports, a length, and a checksum, which is just a small number so the receiver can tell if bits got flipped on the way. That's the whole thing. Every send is one envelope. Every receive gives you one whole envelope. And no promises. If a router drops it, nobody resends it, and nobody tells you.

B: Which sounds bad.

A: It sounds bad. But look at what it also means. There's no setup, the very first packet carries data. The server doesn't have to remember anything per client. And nothing ever waits. If envelope seven gets lost, envelope eight gets handed to you the moment it shows up. For some jobs, that's exactly what you want. Hold onto that.

<!-- section: Building the promise -->

A: Now TCP's promise is much bigger. Whatever bytes you write into one end come out the other, all of them, in order, exactly once. Or you get an error. It looks like a pipe. And there's a gotcha hiding in the word pipe. It's a stream of bytes, with no idea where your messages start and end. Send "hello" then "world", and the other side might read "helloworld" in one go. So everything built on TCP, HTTP, databases, has to say how long each message is.

B: Okay. So how does it actually make that promise on top of a network that drops stuff?

A: Picture mailing a manuscript to a publisher, one page per envelope, through a post office that loses some and delivers the rest in random order. What's the first thing you'd do?

B: Number every page.

A: Number every page. Then they can put them back in order, notice gaps, throw away duplicates. That's a sequence number. Second thing, the publisher sends you postcards. "Got everything up to page forty-one." That's an acknowledgment, an ack. And TCP's acks have this lovely property. They always say "everything up to here". So if one postcard gets lost, the next one says the same thing and more.

B: And if a page gets lost?

A: The publisher can't complain about a page they never knew existed. So it's on you. When you post a page, you start a timer. If no postcard covering it comes back in time, you post it again.

B: [working it out] But I can't tell if my page got lost, or the postcard got lost, or the postcard's just slow.

A: You can't. In all three cases you resend. Which means the other side has to be ready for duplicates, which is why numbering came first. And with just those two tricks you've got a correct protocol. Send page one, wait for the postcard, send page two. That's called stop and wait.

B: And it's slow.

A: Slow how, though?

B: Well, you're waiting a full round trip for every page. So, I guess, get a faster link?

A: That's the trap. It wouldn't help at all. You're sending one packet per round trip. The link's sitting idle almost the entire time, waiting for postcards. Make it ten times faster, and it's idle ten times more. Between California and Europe, stop and wait would use a tiny, tiny sliver of a gigabit link.

B: So you post several pages before you hear back.

A: Right. You let a bunch be in flight at once. Every time a postcard comes back, the oldest ones are done, and you post that many new ones. The range of pages you're allowed to have out there slides forward. That's the sliding window. And how big should it be? Big enough to keep the pipe full for a whole round trip. How fast the link is, times how long the trip takes. On a long, fast link, that's a lot of data, all sent and not yet confirmed, at every moment.

<!-- section: The day the internet slowed a thousand times -->

A: [warm] So here's where it gets good. The early TCP had all of that already. Numbers, acks, resending. What it didn't have was any idea how fast it should send. A sender just blasted out its whole window, and if acks didn't come back in time, it sent everything again.

B: Which sounds fine until everyone does it.

A: Until everyone does it. October nineteen eighty-six. There's a link between Lawrence Berkeley Lab and UC Berkeley. Three hops, a few hundred yards apart. And its speed drops by about a factor of a thousand.

B: [skeptical] A thousand? Was something broken?

A: Nothing was broken. It was full. Routers' queues overflowed, so packets got dropped. Senders timed out and resent everything. Which overflowed the queues even more. Almost every packet on the wire was a copy of one that had already been sent. It got a name. Congestion collapse.

B: So who fixed it?

A: Van Jacobson and Michael Karels. And the amazing bit is they fixed it entirely in the senders, without touching a single router. Start slow. Get a much better timer. And when you see loss, back off hard. Those ideas are in every TCP stack today. The internet basically works because every sender on it agrees to be polite.

<!-- section: Being polite -->

B: What does polite actually look like?

A: The sender keeps a second, private limit, its guess at how much the network can handle right now. Nobody tells it the right number. It has to find out, and it uses loss as the signal that it went too far. So a brand new connection starts with a small window, and doubles it every round trip. That's called slow start, which is a funny name, because doubling is fast. Then past a point, it creeps up by a little each round trip. And when it sees a loss, it cuts the window in half.

B: So it saws up and down.

A: That's TCP's signature. A sawtooth. And it means something practical. A fresh connection to somewhere far away takes several round trips just to get up to speed. For small and medium downloads across an ocean, it's slow start, not your bandwidth, that sets how fast it feels.

<!-- section: The bills -->

B: Okay. So where does all this actually cost me?

A: A few places, and they're worth knowing because they show up all the time. First one, before any data moves, the two sides shake hands. "Here's my starting number." "Got it, here's mine." "Got yours." That's one full round trip before your request can even leave. Then HTTPS adds its own handshake on top. So a brand new connection to a faraway server spends about three round trips before the first byte of the answer comes back. Reuse a connection that's already open, and it's one.

B: Which is why you're supposed to use a session object instead of fresh requests every time.

A: That's exactly why. And a reused connection has already grown its window, so it skips slow start too. It's about the cheapest latency win there is in client code.

B: What's the second?

A: Closing. The side that closes first doesn't forget the connection right away. It hangs around for a while, called TIME WAIT. Because old, delayed packets from that conversation might still be floating around the network, and if a new connection opened up with the same addresses and ports, they could land in it looking like fresh data.

B: That sounds a bit paranoid.

A: I thought so too. Then, building my own version, I hit exactly that bug by accident. I ran two transfers back to back against the same receiver. It was still acknowledging the end of the first file. The new sender read that old ack as "I've got everything up to here", skipped most of its data, and reported a ridiculous speed while the receiver got garbage. Old numbers that looked valid, landing in a new conversation.

B: [laughs] So TIME WAIT is there because someone already made your mistake.

A: Someone made my mistake a long time ago. Third bill is the one that matters for token streaming. Back in the early eighties, people typed into remote terminals, and every keystroke was one byte of data in a packet with way more bytes of headers. So John Nagle came up with a rule. If you've got data out there that hasn't been acknowledged yet, don't send another tiny packet. Hold it until the ack comes, or until you've got a full packet's worth.

B: That sounds reasonable.

A: It is, on its own. But receivers have a habit too. They hold their acks for a moment, hoping to tuck them into a reply. Put those together and both sides end up waiting on each other. On Linux, about forty milliseconds. Now think about a token stream. One tiny event per token. With Nagle on, tokens can sit there waiting for an ack, and they arrive in clumps. Your model looks slower than it is.

B: So you turn Nagle off.

A: One socket option. It's called TCP no delay. Plenty of frameworks set it for you. Plain Python sockets don't. So check, don't assume.

B: And the last one?

A: Head-of-line blocking. TCP promises order. So say packet five gets lost, but six, seven, eight, nine all arrive. They're sitting right there in your kernel. But it can't give them to your program, because that would break the order. Everything waits for five. For one file, fine, you needed five before six anyway. But HTTP two puts lots of separate requests over one connection. A lost bit of an image stalls the JSON response and everything else too, even though their bytes already arrived.

<!-- section: Building it myself -->

A: I built a little version of all this, over UDP in Python, with a deliberately evil relay in the middle that loses and delays and shuffles packets. And two things surprised me. First, I set the resend timer shorter than the round trip. And it still worked. File came through perfect, speed about the same. But nearly every packet got sent twice, because the timer fired before an ack could possibly have come back.

B: So you'd never even notice.

A: You'd never notice. You'd just be doubling your load on the network. Now picture every sender on a crowded link doing that. That's why TCP measures the round trip constantly instead of trusting a fixed number. The second one was flow control. That's the receiver telling the sender how much room it has left. I made the receiver small and slow and left that out. And making the window bigger made the whole thing dramatically slower. The receiver kept overflowing and silently dropping, and my sender thought that was the network losing things, and kept resending.

B: [working it out] So a bigger window only helps if the other end can keep up. And the network can keep up.

A: Right. And under random loss, my simple version might even beat real TCP on raw speed. But not because it's cleverer. Because it never slows down when it sees loss. On a shared network, that's the nineteen eighty-six sender.

<!-- section: Rebuilding TCP on UDP -->

B: So if TCP has all these problems, why not just fix it?

A: Because you can't. TCP lives in the operating system's kernel. Changing it means waiting years for every phone and laptop and server to update. And worse, the internet is full of boxes in the middle, firewalls, home routers doing address translation, corporate proxies, that only understand TCP and UDP, and drop anything else. Even new TCP options get stripped by boxes that think they know what TCP should look like. People call that ossification. The protocol has turned to bone.

B: So they used UDP because it gets through.

A: It gets through, and it's thin enough to be a blank canvas. That's QUIC. All the tricks you just heard, numbers, acks, resending, congestion control, but living in a library inside your browser or server, so it ships with an app update. One combined handshake instead of two. Lost packets only stall their own stream, not everyone's. And a connection keeps working when your phone hops from Wi-Fi to cellular. HTTP three runs on it.

B: So, the same promise, rebuilt on the bare envelopes.

A: Same promise. And then the other question. When would you pick UDP yourself? When late is as bad as lost. A video call frame that shows up after it should've been on screen is garbage. Where a player was a moment ago is useless once you know where they are now, and resending the old one would just block the new one. Or when the whole exchange fits in one packet, like looking up a domain name. Ask, and if no answer comes, just ask again.

B: And Tailscale?

A: Tailscale's a lovely one. Your SSH to the Spark is TCP, riding inside a tunnel that's UDP. If the tunnel were TCP too, you'd have two reliability loops stacked up. A loss would make both of them back off and resend, and their timers would fight. A UDP tunnel just carries the packets, and lets the TCP inside handle loss, once.

<!-- section: Ending -->

B: Okay, let me try. The network only promises to try. TCP builds a perfect stream on top by numbering everything, sending receipts, resending when a timer runs out, keeping a bunch in flight, and slowing down when it sees loss. UDP skips all that. So TCP is reliable but slower, and UDP's faster when you can live with losing things.

A: Mostly. The piece I'd sharpen is "faster". UDP doesn't move bytes any faster. What it saves is waiting. No handshake round trip before the first byte, and no lost packet holding up everything behind it. TCP's costs are almost all round trips and stalls. So the real question isn't fast or safe. It's, who should wait when something goes missing? If everything behind it should wait, that's TCP. If nothing should, that's UDP, and you build whatever reliability you actually need on top.
