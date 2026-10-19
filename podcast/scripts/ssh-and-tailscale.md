<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you've got a box at home. You installed Tailscale on it and on your laptop, you typed ssh and the server's name, and it worked. From your apartment, from the office, from a café. Great.

B: It's honestly one of my favourite setups. It just works.

A: It does just work. So let me ask you two things about it. The very first time you connected, ssh asked you, "are you sure you want to continue connecting?" And you typed yes. What did you agree to?

B: [a bit unsure] Uh... that I trust it? Honestly, I think I just typed yes because that's what you type.

A: That's what everybody does. Second one. Before Tailscale, your laptop in the café could not reach that box at all. Then you install an app, and suddenly it can. And you never touched your router. So how does a packet get into a house that's built to keep it out?

B: I'd assumed it goes through Tailscale's servers. Like a VPN.

A: That's the natural guess, and it's mostly wrong, which is the fun part. None of this is magic. It's three old ideas stacked on top of each other. A program waiting for connections. A careful handshake that lets two strangers share a secret. And a trick for sneaking a conversation through two routers that were built to stop exactly that.

<!-- section: Somebody sniffed the passwords -->

A: [warm] So the first idea starts with a crime, kind of. Early nineteen ninety-five. Tatu Ylönen, a researcher at a university in Helsinki, finds out that someone has been running a password sniffer on the university network.

B: Which back then would have been easy.

A: Trivially easy. People logged into remote machines with tools like telnet, which sent everything, your password included, across the network as plain text. Anyone on a machine along the way could just read it. So he writes a replacement that encrypts the whole session, gives it away for free that summer, and calls it Secure Shell. He asks for a port number and gets twenty-two, sitting neatly between the file transfer one and telnet. And it spreads to tens of thousands of people within months.

B: And the OpenSSH I've got now came from that?

A: The free version got forked into OpenSSH a few years later, and that's what nearly every Linux box and Mac runs today. And then twenty years later, the problem had changed. Encryption was solved. But more and more devices were sitting behind home routers that made them unreachable from outside. That's the problem a tiny protocol called WireGuard, and then Tailscale, set out to fix. What if every device you own could reach every other one directly, no matter how many routers are in the way?

<!-- section: What the yes meant -->

A: So when you say your server "has SSH", what you mean is there's a program running on it called sshd. The d is for daemon, which just means a background program with no screen, started at boot, waiting to do a job. And its job is to sit on port twenty-two and wait. When someone connects, it starts a little copy of itself just for that one connection, and goes back to waiting.

B: Okay.

A: Now, your laptop and the server are strangers on a network where anyone in the middle, the café Wi-Fi, the internet provider, can read and change packets. And in a handful of round trips they have to do three things. Agree on a secret nobody in the middle knows. Make sure the laptop is talking to the real server. And make sure the server is talking to you.

B: The secret part is the paint thing, right? Same as HTTPS.

A: Same trick. Both sides mix a secret colour into a shared public one, swap the mixtures, add their own secret again, and end up with the same colour that nobody watching can un-mix. Done fresh for every connection, and thrown away after. Which means someone who records today's session and steals your server's keys next year still can't read it.

B: But that only proves I share a secret with whoever answered.

A: Right, and that's the gap. Someone in the middle could do one exchange with you and another with the server and pass everything along. So the server also has its own long-term key, made when SSH was installed. That's the host key. And it signs the handshake with it. An impostor can send you a host key. They just can't make a valid signature for the real server's key without stealing it.

B: [working it out] So then the question is how my laptop knows which host key is the real one.

A: And the first time, it doesn't. That's what the yes was. Your laptop says, here's a fingerprint of the key this machine just showed me, do you trust it? You say yes, and it writes the key down. And every time after that, it checks the server shows the same key. That's called trust on first use. Weak once, strong forever after.

B: Huh. So the yes is the one moment I'm actually unprotected.

A: That's the moment. The careful way to say yes is to go to the server itself and ask it for its own fingerprint, and check they match. And that's also what the scary warning is about. One day you'll connect and get this huge block of text, remote host identification has changed, it's possible someone is doing something nasty.

B: [skeptical] Which I'd assume means I've been hacked.

A: Usually not. Usually it's innocent. You reinstalled the server, so it made a new host key. Or a different machine is now answering to that name or address. The bad reason is that something in the middle is answering in its place. So before you delete the old line and move on, you get the fingerprint from the server itself, through some path you trust, and check it matches the new one. When I gave a test server a new host key on purpose to trigger it, the warning looked terrifying, and checking it took a minute. If you can't explain why the key changed, don't connect.

<!-- section: Proving it's you -->

A: So the server has proved who it is. Now you prove who you are. And there are two ways. You can send a password. Encrypted, sure, but the server still sees your actual password. And if you ever said yes to an impostor, the impostor now has it. Plus bots on the internet try millions of common passwords.

B: Or keys.

A: Or keys. You make a pair once on your laptop. A private one that never leaves the machine, and a public one, which is one short line of text you paste into a file on the server. At login, the server says, okay, prove you've got the private half, and your laptop signs something that includes this specific connection's ID. The server checks the signature with your public key.

B: So the server never actually sees my secret.

A: Never. It only sees a signature. And because the signature covers this one session, even if someone captured it, they can't replay it to log in somewhere else. There's nothing to guess, nothing reusable. And if you lose a laptop, you delete its one line on the server, and that's that.

<!-- section: One connection, many pipes -->

A: And here's the part that's going to matter a lot for you. Once you're logged in, that one encrypted connection is really a container. Your shell is one stream inside it. And you can open more streams inside the same connection. That's how port forwarding works in SSH.

B: Like for Jupyter on the Spark.

A: That's the perfect case. You start Jupyter on the Spark listening only on its own loopback address, so nothing on any network can reach it. Then from your laptop you ask ssh to listen on a port on your laptop and carry anything that connects there through the tunnel, and come out on the Spark's side. So you open localhost in your laptop's browser, and you're looking at Jupyter on the Spark. And it's still invisible to everyone else. Same trick later for your model server and its dashboards.

<!-- section: Why the café can't see your house -->

A: Okay. Now the second half. Why couldn't you reach the box from outside before?

B: Because of the router, I guess. Some firewall setting.

A: It's not even a setting, it's just how home routers work. Your internet provider gives your house one public address. Your laptop, phone, TV, the server, they all share it. Inside, the router gives everything a private address that means nothing on the internet. And when something inside sends a packet out, the router rewrites it to come from the house's address, and keeps a little note. "I sent something to that place, replies are welcome." That's called NAT.

B: So replies match a note and get in.

A: Replies match a note and get in. Now your laptop in the café sends a packet to your house's address on port twenty-two. The router has no note for it. Which of the five devices in the house is it even for? It has no idea. So it drops it. And that's, honestly, accidentally one of the best security features a home network has.

B: [jumping in] The obvious fix is just to forward the port though. Tell the router, anything on twenty-two goes to the server.

A: And then the café laptop can connect. And so can everyone else on earth. Bots scan every address on the internet all the time, constantly. A fresh server with that port open usually starts logging password guesses within minutes to hours. They read your exact SSH version from the hello message and know which bugs it has. And there was a nasty one in twenty twenty-four, called regreSSHion, a bug in sshd itself that let someone run code as root without logging in at all. Your hardened settings do nothing against a bug that strikes before login. It was mainly dangerous to servers whose door was open to the whole internet.

<!-- section: A tunnel made of public keys -->

A: So Tailscale is built on WireGuard. And the idea is small. Every device has a key pair. Every device has a list of peers. This public key, reachable at this address. When your laptop wants to send a packet to the server, WireGuard takes the whole packet, encrypts it, tucks it inside a small, simple UDP packet, and sends it to the other device's real address. The other side unwraps it and hands it to its operating system as if it had arrived on a network card.

B: A fake network card.

A: A virtual one. And to every program on the machine, including sshd, it's just another network card with an address. That's why sshd needed no changes at all to work over Tailscale. It was already listening on every card, and now there's one more. And a nice property. A WireGuard device doesn't answer anything that isn't properly encrypted for it by a known key. A scanner gets no reply. Not even "go away."

B: But WireGuard needs to already know the other device's key and address. And both of them are still behind routers that drop strangers.

A: That's the hard part, and that's what Tailscale really is. Two pieces. A phone book, and a lock-picking kit.

<!-- section: The phone book and the hole punch -->

A: The phone book is Tailscale's coordination server. When the Tailscale program on each device starts, it makes a key pair, keeps the private half on the device, logs in with your account, and uploads only the public half. The server hands back a list of every peer you're allowed to talk to, with their public keys and the addresses where they might be reachable.

B: [skeptical] So the coordination server never sees my traffic?

A: Never. It only ever had public keys. Your actual SSH traffic goes from laptop to server, encrypted with private keys it never saw. So, can Tailscale read it? No. What you are trusting it with is the phone book. A malicious phone book could hand you a fake key for a peer. But that's a different thing from reading your packets.

B: Okay. And the lock-picking?

A: Remember the router's rule. A packet gets in only if it matches a note from something going out. So you get both sides to send a packet out to each other at about the same time. Your café router writes a note, "I sent something to the house, replies welcome." The house router writes a note, "I sent something to the café, replies welcome." And then each side's packet arrives at the other router looking like a reply.

B: [laughs] That's so sneaky.

A: It's called hole punching. And the one extra piece is that each device can't see its own public address from inside. So it asks a server out on the internet, "from where you sit, what address did my packet come from?" And then it shares that through the phone book.

B: Does that always work?

A: Not always. Some routers, a lot of corporate and mobile ones, pick a brand new outside port for every destination. So the address one server saw is useless to anyone else. If both ends are like that, a direct path might just be impossible. And then Tailscale falls back to relay servers. Your laptop wraps its already-encrypted packet with "deliver to this key," sends it to the relay, and the relay passes it down the other device's connection. Both connections go outward, so no router ever has to let anything unexpected in.

B: And the relay can read it?

A: The relay can see which keys talk to which, when, and how much. It can't see inside. The cost is a detour, and less speed. And here's a detail I love. Tailscale actually starts every new connection through a relay, because it works instantly, and tries the hole punch in the background. When a direct path answers, it quietly switches. So if you ping the server, the first reply often says it came via the relay, and a few pings later it says direct.

<!-- section: Encrypted twice -->

B: Wait, so my SSH session is encrypted twice now. Once by SSH, once by WireGuard. Isn't that wasteful?

A: It costs a little bit of CPU you won't notice. And each layer is protecting something different. WireGuard protects the packet between two devices, and hides even that it's SSH. If you watch the wire on the home server, inside the tunnel you see an ordinary connection to port twenty-two. On the physical cable at the same moment, there's no port twenty-two at all. Just small UDP packets between two addresses. Same packets, different disguise.

B: And SSH is still doing its own job.

A: SSH is proving you, as a user, to that sshd. And it stays secure even when the tunnel isn't there, like on your home network, or if some other device on your tailnet gets compromised. So you keep both.

<!-- section: Ending -->

B: Okay, let me try. SSH is about trust. Fresh shared secret every time, the server proves itself with a key my laptop remembered the first time I said yes, and I prove myself with a key it never sees. And Tailscale is about getting there at all. It's not a server my traffic goes through. It's a phone book of public keys, and then both sides knock outward at the same time so each router thinks the other's packet is a reply.

A: That's it. The bit I'd sharpen is "not a server my traffic goes through." Usually true, not always. When the hole punch fails, your packets really do go through Tailscale's relay. They're still sealed, so it can't read them, but it's slower, and it does see who's talking to whom. So when your home server suddenly feels sluggish from somewhere new, the first question isn't "what's wrong with SSH." It's "am I direct, or am I on the relay?"
