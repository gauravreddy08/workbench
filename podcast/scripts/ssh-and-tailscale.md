<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you've got a box at home. At some point you put Tailscale on it, and on your laptop, you typed ssh and the server's name, and... it just worked. From your apartment, from the office, from a cafe. Great. But I want to poke at a few things you probably can't answer yet. The very first time you connected, ssh asked you something like, "are you sure you want to continue connecting, yes or no?" And you typed yes. What did you actually agree to?

B: [a bit unsure] Honestly? I think I agreed to... continue. It's like a "do you want to proceed" box. I've typed yes to that, I don't know, a hundred times. Never read it.

A: [amused] Almost everybody has. And it turns out that one yes is the most important security decision in the whole connection. We'll get there. Second one. Some day ssh is going to print a wall of at-signs and, in capital letters, "Warning, remote host identification has changed. It is possible that someone is doing something nasty." Is someone doing something nasty?

B: I'd, uh... probably delete whatever it's complaining about and try again.

A: [dry] Which is sometimes right and sometimes exactly what an attacker wants. Third. Is password login still turned on, on that box? And if your router ever forwarded port twenty-two to it, how long before some bot found it? Fourth, a practical one. You want Jupyter, running on the Spark, to show up in the browser on your laptop. How? And the big one. Before Tailscale, your laptop at the cafe couldn't reach that box at all. You install an app, and now it can. And you never opened anything on your router. So how does a packet get in?

B: I always assumed it just goes through Tailscale's servers. Like, everything goes up to their cloud and comes back down to my house. Like a VPN company.

A: That's the most common picture, and it's mostly wrong. Most of the time your packets go straight from the laptop to the house, and Tailscale's servers never touch them. And even when they do touch them, they can't read them. Which raises the obvious question of how that's possible, when your router was built specifically to stop strangers getting in.

B: Yeah, that's the part that feels like magic.

A: None of it's magic. It's three old ideas stacked on top of each other. One, a program that sits and waits for connections. Two, a careful handshake that lets two strangers end up sharing a secret, which is the same trick TLS uses for websites. And three, a way to sneak a conversation through two routers that were designed to stop exactly that.

<!-- section: Origin -->

A: [storytelling] And the first of those has a really specific origin story. Early nineteen ninety-five. Tatu Ylönen is a researcher at Helsinki University of Technology, and he finds out someone's been running a password sniffer on the university network. A program quietly recording what goes by on the wire. And back then, that was devastating, because the way you logged into a remote machine was with tools called telnet and r login, and they sent everything as plain text. Your commands, the output, and your password. Anybody on any machine along the path could just... read it.

B: So the sniffer was collecting everyone's passwords.

A: Everyone who logged in across that network, yeah. So he wrote a replacement that encrypted the whole session, and gave it away for free that summer. Called it Secure Shell. And he asked the people who hand out port numbers for one, and he got twenty-two. Which sits right between F T P, which is twenty-one, and telnet, which is twenty-three.

B: [amused] That's a little cheeky. Right next to the thing it's replacing.

A: [laughs] Right next door, yeah. And it spread to tens of thousands of users within months. Later, in nineteen ninety-nine, the Open B S D project took an old free version and forked it into OpenSSH, and that's what nearly every Linux box and every Mac runs today. The version of the protocol you actually use is SSH two, which got standardised in two thousand six. Then jump twenty years. Encryption's basically solved. But a new problem has crept up: more and more devices sit behind home routers that make them unreachable from outside. So between two thousand fifteen and two thousand seventeen, Jason Donenfeld designs WireGuard. A really small V P N protocol, under four thousand lines of code in the Linux kernel. And in twenty nineteen, a group of ex-Google engineers start Tailscale to answer one question. What if every device you own could reach every other device directly, with WireGuard, no matter how many routers are in the way?

<!-- section: The Idea: A program that waits by the door -->

A: So start with the box itself. When people say "my server has SSH", what they mean is a program called S S H D is running on it. The D at the end stands for daemon. A daemon is just a program that runs in the background with no terminal attached. Usually it's started at boot, and it sits there waiting to do one job. Unix names them with a trailing D. S S H D, tailscale D, system D.

B: And its job is to wait for me.

A: Its job is to sit on port twenty-two and wait. A port's a number, anywhere from one to sixty-five thousand five hundred thirty-five, that picks which program on a machine gets an incoming connection. The IP address finds the machine. The port finds the program on that machine. And in operating system terms, S S H D has asked the kernel, which is the core of the operating system, the one program that talks to the hardware directly, including the network card, it's asked the kernel to listen on TCP port twenty-two. Listening means telling the kernel, "if a TCP connection shows up for this port, hand it to me". Think of a phone that's plugged in and switched on. When a connection does arrive, the kernel hands it over, S S H D starts a brand new child process just for that one connection, and goes right back to waiting. And the child does everything else. It does the handshake, it checks who you are, and then it actually becomes a shell, running as your user.

B: So every connection gets its own little process.

A: Every one. Hold onto that, it saves you later when you lock yourself out. And you can see the listening part on the home server right now. There's a command, S S, that lists listening sockets, and if you look for twenty-two you'll see a line saying S S H D is listening on zero dot zero dot zero dot zero, port twenty-two. And that all-zeros address means "port twenty-two on every network interface this machine has". So the home Wi-Fi or Ethernet, and also the Tailscale one. Keep that in your head, it matters twice more. Oh, and on recent Ubuntu, you might see system D holding the port instead of S S H D. That's called socket activation. System D listens on the port itself and only starts S S H D when a connection actually arrives. For you it's the same effect. It just changes how you restart things if you ever change the port. Same idea, different owner of the phone.

<!-- section: The Idea: The SSH connection, step by step -->

A: Okay, so here's the actual problem a connection has to solve. Your laptop and the server are strangers on a network where anyone in the middle, the cafe Wi-Fi, your I S P, can read packets and change them. And in about half a dozen round trips they have to do four things. Agree on a secret key nobody in the middle knows. Make sure the laptop's talking to the real server and not an impostor. Make sure the server's talking to you. And then carry your keystrokes, and maybe other traffic, inside the encryption.

B: In that order?

A: In exactly that order, and the order's the interesting part. Picture it drawn as a diagram, laptop on the left, server on the right, time flowing down the page, and arrows going back and forth between them. The top few arrows are grey, meaning anyone on the path can read them. Then partway down they turn blue, meaning encrypted. And the thing to notice is that the server proves who it is before you ever send anything that proves who you are.

B: Huh. So I'm checking it before it checks me.

A: Right. Your credentials only go out once you know who's receiving them. Step one's boring. Plain TCP connection to port twenty-two. Just a reliable pipe of bytes, nothing special yet. Step two is the hello. Each side sends one line of plain text with its version, something like "S S H two point oh, OpenSSH nine point six, Ubuntu". And then each sends a menu. "For key exchange I can do these, for encryption these, for signatures these." And they pick the first option on the laptop's list that the server also supports. All of that's readable. Which is why a scanner knows exactly which OpenSSH version you're running the moment it connects. Keep that one too.

A: Step three is the key exchange, and it's the same trick as TLS, so it's worth really having it in your hands. Think of mixing paint. You both start with the same base colour, out in public. Say yellow. You each pick a secret colour of your own and mix it into the yellow, and you send the mixture across. Then you each take the other person's mixture and add your own secret colour to it. And you both end up with exactly the same final colour, because it's yellow plus both secrets, just mixed in a different order. Someone watching the whole time saw the yellow and both mixtures. But un-mixing paint is hard, so they can't get to that final colour.

B: [working it out] So the two secret colours never travel. Only the mixtures do.

A: That's the whole trick. The real version is called Diffie-Hellman, from nineteen seventy-six. Each side picks a private random number, sends a public value made from it, and combining your private number with their public value gives both sides the same secret. Numbers instead of paint. Modern SSH uses a version built on elliptic curves, very often one called Curve two five five one nine. And it's done fresh, with new random numbers, for every single connection. That freshness buys you something called forward secrecy. Because the secret comes from random numbers that get thrown away right after the handshake, someone could record all your traffic today, steal the server's keys next year, and they still couldn't decrypt today's session.

B: Even with the server's own keys?

A: Even with those. The server's long-term keys never went into making the secret. Only the throwaway numbers did, and those are gone. So from that shared secret, both sides derive the actual encryption keys, for something like A E S G C M or ChaCha twenty Poly thirteen oh five, those are the ciphers, and from the very next message on, everything's encrypted. The connection also gets a session I D. That's a hash of everything both sides said during the key exchange. It's unique to this one connection, both ends know it, and later on it's the thing your key signs.

B: [skeptical] Okay, but at that point we're done, right? It's encrypted, nobody in the middle knows the secret. We're safe.

A: [gently] That's the trap, and it's a really natural one. Diffie-Hellman on its own only proves that you share a secret with whoever answered. That's it. So imagine somebody sitting in the middle. They do one exchange with you, pretending to be the server, and a separate exchange with the server, pretending to be you. Now they've got two secrets, one for each side, and they just decrypt everything you send, read it, re-encrypt it, and pass it along. Both ends see a perfectly encrypted connection.

B: Oh. Encrypted to the wrong person.

A: Encrypted to the wrong person. That's a man-in-the-middle. So in the same message where the server sends its paint mixture, it also sends its host key and a signature. The host key is the server's own long-term key pair, created when OpenSSH got installed. The private half lives in a file under slash etc slash S S H, and it identifies the machine, not any user. And a signature is a short blob made with a private key over some piece of data. Anyone with the matching public key can check it, but only the holder of the private key could have made it. Like a wax seal that only one ring can make, but anyone can recognise. And here the server signs the session I D. So an impostor can absolutely send you a host key. Any host key they want. What they can't do is make a valid signature for the real server's key, not without stealing its private key.

B: So then the question is just... how does my laptop know which host key is the real one?

<!-- section: The Idea: Trust on first use -->

A: It doesn't. Not the first time. That's your yes or no prompt. It says the authenticity of this host can't be established, here's its E D two five five one nine key fingerprint, a long string starting with S H A two fifty-six, are you sure you want to continue? And a fingerprint is just a short hash of a public key, something you can compare by eye. Two keys with the same fingerprint are, for all practical purposes, the same key. So when you typed yes, what you actually said was, "I trust that this key belongs to my server." And ssh writes that host key into a file on your laptop called known hosts. And every connection after that, it checks the key the server presents against that line.

B: [quietly] So that yes was me vouching for the server. Without checking anything.

A: Yeah. And the model has a name, trust on first use, T O F U, people say "tofu". You accept a key the first time with no proof, and then you insist it never changes. Weak once, strong forever after. The careful way to say yes is to compare that fingerprint with the one the server itself reports. Sit at the server's own keyboard, or use some connection you already trust, and run S S H keygen with the list flag on the server's host public key. It prints the same S H A two fifty-six string. If they match, yes is safe.

A: Now, the scary warning. I made it happen on a Mac. Ran a throwaway S S H D, connected once and said yes, then gave that S S H D a brand new host key and connected again. And you get the wall of at-signs, "remote host identification has changed", "someone could be doing something nasty", and then a line naming the offending key, in known hosts, line one, and "host key verification failed". And it refuses to connect. So, think about it. You see that for your home server. Give me three innocent reasons that could happen, and the one bad one.

B: Innocent... I reinstalled the OS? That'd make new keys, I guess. And the bad one is someone in the middle. That's the man-in-the-middle thing.

A: Both right. Reinstalling generates fresh host keys, and the bad one is something between you and the server answering in its place. Two more innocent ones. A different machine now answers to that name or that address. Your router hands out home addresses automatically, and it can give the address your server used to have to some new device. Or you reused a hostname for a new box. And the Tailscale version of the same thing: you deleted the machine from Tailscale and added it back, and it got a different one hundred dot something address that used to belong to another of your devices.

B: And the fix is to delete the old line?

A: Eventually. There's a command, S S H keygen dash capital R, that removes the old entry. But before you run it, get the fingerprint from the server itself, its console, or some other path you trust, and check it matches the new one ssh is showing you. And if you can't explain why the key changed, don't connect. That's the rule.

<!-- section: The Idea: Keys, not passwords -->

A: [steady] So the server's proved who it is. Now it's your turn. Two common ways. The first is a password. You send it, encrypted, to the server, and the server checks it. And there are two problems with that. A password's guessable. Bots on the internet are trying millions of common ones, constantly. And the server sees your actual password. So if you ever said yes to an impostor's host key, the impostor now has your password.

B: Oh, that's the link. The yes and the password are connected.

A: They're connected. The second way's a public key. Once, on the laptop, you make a key pair. That's two linked keys. The private key stays secret on your laptop and it can make signatures. The public key you can hand to anyone, and all it can do is check signatures. And knowing the public key doesn't help you work out the private one. You make it with S S H keygen, type E D two five five one nine, and you get two files. The private one never leaves that machine. The public one is a single line, safe to share. Ed two five five one nine, by the way, is a modern signature scheme from Daniel Bernstein and colleagues, two thousand eleven. Keys are tiny, thirty-two bytes. It's fast. And it avoids a bunch of ways older schemes could be implemented badly. It's the default choice now. The public key file I made on my Mac was eighty-six bytes. One line of text. And you add that line to a file on the server called authorized keys, in your home directory. There's a helper, S S H copy I D, that does it for you.

B: So what does logging in actually look like, with the key?

A: The laptop says, "I'd like to log in as this user, with this public key." The server looks in that user's authorized keys file. If the key's in there, it says, basically, "prove it." And the laptop signs a message that contains the session I D, with the private key, and the server checks that signature using the public key. If you run ssh with dash V for verbose, you literally see it go by. "Offering public key", "server accepts key", "authenticated using public key".

B: And that's better because...

A: Three reasons. Nothing guessable, first. An Ed two five five one nine key has roughly a hundred twenty-eight bits of security. Which means guessing it would take something like two to the hundred twenty-eighth tries. That's, I mean, it's not a number any amount of computers gets through. A bot that's trying passwords is trying the wrong kind of thing entirely. Second, nothing reusable. The server never sees your private key, only a signature. And that signature covers this session's I D. So even an impostor who captures it can't replay it somewhere else, because every other connection has a different session I D. And third, you can revoke per device. One line in authorized keys per laptop. Lose a laptop, delete its line.

A: And there's a nice symmetry if you picture the files. Four of them, two on each side. On the laptop: your private key, which never leaves, and known hosts, which holds the server's public host key. On the server: authorized keys, which holds your public key, and the host private key, which never leaves either. So each side keeps one private key and holds the other side's public key. Known hosts answers "is this my server?" Authorized keys answers "is this me?" Two directions of trust.

B: [working it out] So it's the same move twice. Each side signs, the other side checks against a public key it saved earlier.

A: Same move twice, yeah. Now, one catch. A private key file is just a file. Anyone who copies it is you. So S S H keygen offers to encrypt it with a passphrase. And typing that on every connection gets old fast, so there's a thing called S S H agent. It's a small background program that holds your unlocked private keys in memory. When ssh needs a signature, it asks the agent "please sign this" instead of reading the key file. So you unlock the key once per login session, not once per connection. And on macOS, two settings in your ssh config, add keys to agent, and use keychain, make the Mac's keychain remember the passphrase for you. One thing not to do casually, though. Agent forwarding. The dash capital A flag.

B: What does that do?

A: [cautious] It lets the remote machine use your agent while you're connected. Which sounds handy, you hop to the server and you can hop onward from there with your laptop's key. But it means anyone who's root on that remote machine can use your agent too, and log in as you somewhere else, for as long as you stay connected. There's a safer way to hop, called ProxyJump, and I'll come back to it in a minute.

<!-- section: The Idea: Channels -->

A: So, after you've logged in, the encrypted connection becomes a container. It carries channels. A channel's an independent stream of data inside the one SSH connection, with its own I D and its own flow control. Your interactive shell is channel zero. It's what's called a session channel, and it asks for a P T Y, a pseudo-terminal, which is a fake terminal device the server creates so programs like vim and h top think a real keyboard and screen are attached. Then it asks for a shell. If you run ssh home uptime instead, you get a session channel that runs that one command and closes. And then there's the stuff that makes SSH a Swiss army knife, which is port forwarding. Three kinds. Every one of them is just another channel inside the same encrypted connection.

A: The first one's dash L, a local forward. And this is your Jupyter question. Jupyter's running on the Spark, on port eight eight eight eight. You run ssh dash L, eight eight eight eight, localhost, eight eight eight eight, to the Spark. And what happens is ssh starts listening on your laptop's port eight eight eight eight. Anything that connects there, your browser, gets carried through the tunnel, and on the far end the Spark's S S H D opens a connection to localhost, port eight eight eight eight, as seen from the Spark.

B: So Jupyter's now open on the Spark's network? Anyone on my Wi-Fi could hit it?

A: No, and that's the nice part. Jupyter can stay bound to the Spark's loopback address, the one that only the Spark itself can reach. It's invisible to every other machine. The only way in is through the SSH connection that you authenticated. From Jupyter's point of view, the request is coming from the Spark itself.

B: Oh, because S S H D is on the Spark. It's local to it.

A: Right. The second one's dash R, a remote forward, and it's the mirror image. Say ssh dash R, nine thousand, localhost, three thousand, to home. Now the server listens on its port nine thousand, and carries those connections back to port three thousand on your laptop. Useful when you want to show a dev server on your laptop to a machine that can't reach you. And the third one's dash D, a dynamic forward. Ssh dash D, ten eighty, to home, turns ssh into a SOCKS proxy. SOCKS is a really simple proxy protocol. The client says "connect me to this host on this port", and the proxy makes that connection and relays the bytes. Browsers and curl can be told to send everything through one. So you point your browser at localhost ten eighty, and every site you open gets fetched by the home server, as if you were at home. You can open your router's admin page from a cafe.

A: Files ride channels too. S C P and S F T P copy files over an SSH channel. Since OpenSSH nine point oh, S C P actually speaks the S F T P protocol underneath. And rsync, if you point it at the home server, runs over ssh and only sends the parts of files that changed. Which is what you want for repeated deploys.

<!-- section: The Idea: The ssh config file -->

A: All of those flags can live in a config file, so you just type ssh spark and it works. It's a file in your ssh folder, literally called config, and you write host blocks. A nickname, and then settings under it. Host home, host name is the server's Tailscale name, user is your username. Two facts about this file bite people. First, for each setting, the first value found wins, reading top to bottom.

B: [surprised] First? I'd have bet last. Like CSS, the later rule overrides.

A: Everybody bets last. It's first. So the specific host blocks go at the top, and a catch-all block, host star, goes at the bottom. If you put the catch-all first, it quietly wins over everything below it. And the second fact is ProxyJump. Put ProxyJump home in your spark block, and it means: SSH to home first, then from there open a plain connection to the Spark's port twenty-two, and run a second, completely separate SSH session through it. That second session is encrypted end to end, from your laptop all the way to the Spark. The middle machine only ever relays encrypted bytes. It never holds your keys, never sees an agent.

B: So that's why it's safer than forwarding the agent. The middle box is just a pipe.

A: Just a pipe. And if you ever get confused about what ssh is going to do, ssh dash capital G with a host name prints the final, merged settings. It's the answer key.

<!-- section: The Idea: Locking the door -->

A: [serious] Now, the server side has a problem the client doesn't. An SSH server is a program running as root that talks to anyone who connects. And there were two reminders of what that means, both in twenty twenty-four. In July, there was a bug people called regreSSHion, R E G R E double S H I O N. It was in OpenSSH's own S S H D on Linux, and it let an attacker run code as root with no login at all. Unauthenticated. On versions from eight point five up to nine point seven. And a few months earlier, in March, someone found a backdoor planted in x z, a compression library, designed to give its author a way into S S H D on some Linux distributions. It was caught by luck, shortly before it reached stable releases.

B: [quietly] With no login. That's... that's the worst kind.

A: It is. Both were patched fast. And both were dangerous mainly to servers whose port twenty-two was open to the whole internet. So hardening has two halves. Shrink what S S H D will accept, and shrink who can even reach S S H D. What it accepts lives in its config file in slash etc slash S S H, and on Ubuntu, also in a folder of drop-in files next to it that get read first. Same rule as the client. First value wins. And here's the trap. Some cloud images and installers ship a drop-in file, often called fifty cloud init, that says password authentication yes. And that silently beats anything you write lower down in the main file. You set it to no, you restart, you feel safe, and passwords are still on. The only view you can trust is the one S S H D prints itself, with S S H D dash capital T, which dumps the settings it's really using.

B: So what should be in there?

A: A handful. Password authentication off, because no passwords means nothing to guess. Keyboard-interactive authentication off too, because that's the other door passwords can sneak in through. Root login off. You log in as yourself and use sudo. The default actually already blocks root passwords, it's set to prohibit-password, but off is cleaner. Allow users, set to just your own account, so only named accounts can log in at all. Max auth tries down to three, from a default of six, so fewer guesses per connection. And X eleven forwarding off. That's forwarding graphical windows, you don't need it, and it's one less feature exposed. Then, who can reach S S H D. Three tools. U F W, uncomplicated firewall, which is Ubuntu's friendly front end to the Linux packet filter. You write rules like "allow anything that arrives on the Tailscale interface" and it drops the rest. So you say, accept SSH only from the tailnet and the home network. Then fail two ban. A daemon that watches login logs, and when one address fails too many times, adds a firewall rule banning it for a while. Recent OpenSSH, nine point eight and up, has a smaller version of this built in, called per source penalties. And honestly, on a server that's only reachable over Tailscale, fail two ban matters a lot less, because the bots can't reach it in the first place. And last, unattended upgrades. A package that installs security updates automatically every day. Cheap insurance against the next regreSSHion. The next S S H D bug gets patched before you've even read about it.

<!-- section: The Idea: Why the cafe can't see your house -->

A: Okay. That's SSH. Now the networking half. Why couldn't you reach the server from the cafe before Tailscale? Your I S P gives your house one public I P v four address. Just one. And I P v four addresses are thirty-two bit numbers, so there are only about four point three billion of them in the whole world, which is way fewer than there are devices. That shortage is the root of everything in this part. So your laptop, your phone, your TV and your server all share that one address. Inside the house, the router hands out private addresses. The ones that start with one ninety-two dot one sixty-eight, or ten dot something. Every home on earth reuses the same ones, so they mean nothing on the public internet, and routers out there won't deliver to them. And the router does N A T, network address translation.

B: Which is the rewriting thing.

A: Yeah. When your server opens a connection out, say to GitHub, the packet leaves with the server's private address on it. The router rewrites it so it looks like it came from the house's one public address, and from a port the router picked. And it writes itself a note. "Port such-and-such on the outside means the server, talking to GitHub." When GitHub's reply comes back to that port, the router finds the note, rewrites it back, and hands it to the server. Out is easy. Now, your laptop at the cafe sends a packet to your house's public address, port twenty-two. The router looks for a note. There's no note. Nothing inside started this. So which of the five devices in the house is it even for? It has no idea. So it drops it.

B: [skeptical] Okay, but that's the router's firewall doing that, right? Some default rule blocking incoming stuff.

A: [patiently] That's what it feels like. But it's not a rule anyone set. It's just how N A T works. The router literally doesn't know where to send it. There's no destination to deliver to. And that accident turns out to be one of the best security features a home network has. Things inside can talk out, and nothing outside can start a conversation in.

A: And it can be worse. A lot of I S Ps, especially mobile carriers and some fiber providers, put your router behind another N A T of their own. That's called carrier-grade N A T, C G N A T. The I S P shares one public address between a bunch of customers, so the address your router thinks is public is actually private too. Usually it's in a range starting with one hundred dot sixty-four. And you can't open anything through a N A T you don't control. The easy check: if the outside address on your router's status page is different from what a what's-my-IP site tells you, you're behind one.

<!-- section: The Idea: Port forwarding -->

A: So the old fix is a port forward. A rule you add on the router: anything that arrives at my public address on port twenty-two, send to the server on port twenty-two. It turns the router's accidental protection off, for that one port. And now the cafe laptop can connect.

B: So can everyone else.

A: [dry] Yep. Bots are scanning every I P v four address on the common ports, all the time. All four billion. A fresh server with port twenty-two open typically logs its first password guesses within minutes to hours. You can measure it yourself if you dare, by counting "invalid user" lines in the SSH log. And remember the hello line? The bot reads your exact OpenSSH version off it and knows which bugs that version has. So suddenly every hardening step matters a lot more. And none of them help against a bug that strikes before login, like regreSSHion. Plus port forwarding just doesn't work at all behind carrier-grade N A T, and it breaks whenever your I S P changes your public address.

<!-- section: The Idea: WireGuard -->

A: So that's the wall. Here's how Tailscale gets through it. And it's built on WireGuard, so start there. The idea fits in a paragraph. Each device has a key pair. Each device has a list of peers, and each entry says: this public key, reachable at this IP address and port, allowed to use these inside addresses. When your laptop wants to send a packet to the server's inside address, WireGuard takes the whole IP packet, headers and all, encrypts it with keys derived from both sides' key pairs, puts it inside a U D P packet, and sends that to the peer's real address. U D P is the bare-bones way to send data. You fire a packet at an address and port. No connection, no retries, no ordering. WireGuard wants exactly that and does its own encryption on top. And on the other end, the peer decrypts it, and hands the inner packet to its kernel as if it had just come in on a network card.

B: But there's no actual network card.

A: There's a virtual one. On Linux it's called tailscale zero, on macOS it's a U T U N device. And to every program on the machine, including S S H D, it's just another interface with an address. So remember that S S H D is listening on all zeros, every interface?

B: [working it out] Oh. So it was already listening on the Tailscale one. S S H D doesn't even know Tailscale exists.

A: Doesn't know, doesn't care. That's why S S H D needed zero changes to work over Tailscale. And WireGuard has three properties worth knowing. One, it's silent to strangers. A WireGuard device doesn't answer anything that isn't correctly encrypted by a public key it knows. A scanner gets no reply at all. Not even "go away". Two, the overhead's small. Each packet gets a sixteen-byte header and a sixteen-byte authentication tag, and the inner packet gets padded up to a multiple of sixteen bytes. Plus the outer IP and U D P headers, which are twenty-eight bytes on I P v four. You'll actually measure that. And three, handshakes are cheap. The keys get re-agreed every couple of minutes with a handshake that takes one round trip, so a stolen session key is only useful for a little while.

A: But notice what WireGuard doesn't do, which is the hard part of your setup. It needs to know the peer's public key and real address in advance. And it needs the packets to actually arrive. And you're behind N A T on both ends. Neither device knows the other's key, and neither router is going to let the other one in.

<!-- section: The Idea: Tailscale's two planes -->

A: So Tailscale is basically a phone book plus a lock-picking kit. It splits into two planes. The control plane is the part that decides and configures things. Who exists, who's allowed to talk to whom, which keys. The data plane is the part that carries the actual packets. And Tailscale's control plane is its coordination server. When tailscale D, the daemon on each device, starts up, it makes a WireGuard key pair. The private half stays on the device. It logs in with your Google or GitHub account, and uploads just its public key. The coordination server gives it a stable address, one of those one hundred dot something addresses, and sends back a map. Every peer you're allowed to talk to, with their public keys, their addresses, and the candidate endpoints where they might be reachable. And every device keeps a connection open to the control server, so when anything changes, a new map gets pushed out.

A: And then the data plane is WireGuard, device to device. Your SSH traffic goes from the laptop to the server. It doesn't go through the coordination server. So, your question from the start. Can Tailscale read it? The control server only ever had public keys. The traffic's encrypted with private keys it never saw.

B: [skeptical] Okay, but I'm still trusting them for something. They're the ones handing out the keys.

A: [conceding] You are, and that's the right instinct. You're trusting them with the phone book. A malicious control server could hand your laptop a fake key for the server, and then you're talking to someone else. Tailscale has a feature called Tailnet Lock for people who want to remove even that trust. If that matters to you, check its docs. But for reading your traffic in normal operation, no. Which leaves the actual hard part. Getting through two N A Ts.

<!-- section: The Idea: Hole punching -->

A: So remember the N A T rule. A packet gets in only if it matches a note the router wrote when something inside sent a packet out. So here's the trick. Get both sides to send a packet out to each other at about the same time. Each router writes a note: "I sent something to that address, replies from there are welcome." And then each side's packet arrives at the other router looking like a reply.

B: That's sneaky. But each side needs to know where to aim. They can't see their own public address from inside.

A: Right, they can't. So each one asks a STUN server. STUN is a server that answers exactly one question: "from where I'm sitting, what address and port did your packet come from?" And that tells a device what its N A T turned it into. Tailscale's relay servers double as STUN servers. So walk through it like a little animation, step by step. Laptop on the left behind the cafe router. Server on the right behind the home router. Under each router there's a list, "what this router remembers". At the start, both lists are empty, and neither side can just call the other. Step one, each device sends one U D P packet to STUN. The reply tells the laptop, "you look like the cafe's public address, port fifty-one thousand", and tells the server, "you look like your home's public address, port sixty-two thousand". And each router wrote down the mapping it made. Step two, both send that public address and their WireGuard public key to the control server, which passes them to the other side. That's all the control server does here. Step three, the laptop sends a U D P packet to the home address, port sixty-two thousand. Its own router, the cafe one, notes "I sent to that address, replies are okay". The home router gets it, has no matching note, and drops it.

B: So that packet was wasted.

A: It looks wasted, but its real job was to open the cafe side. It got a note written. Step four, the server sends to the cafe's address, port fifty-one thousand. And in real life both of these fire at about the same moment. The home router reuses its sixty-two thousand mapping, and writes its own note about the cafe address. The packet reaches the cafe router, which sees it coming from the home address on port sixty-two thousand. That matches its note. Let in. And now both routers have a matching note, so packets flow both ways. No relay, no port forward. WireGuard does its handshake over that path, and from then on small keepalive packets keep the notes from expiring, because these U D P notes often time out in somewhere between thirty seconds and a few minutes.

B: And when does it not work?

A: There's a toggle on that animation, to switch the home router to a hard N A T. A hard N A T picks a new public port for every new destination. So when the server sends to the cafe, it doesn't leave from port sixty-two thousand anymore. It leaves from some new port. Sixty-two four seventeen, say. The cafe router's only expecting sixty-two thousand, so it drops it. And the laptop keeps aiming at sixty-two thousand, but on a hard N A T that mapping only accepts replies from the STUN server. Dropped again. Neither side can predict the other's port. So Tailscale sends the traffic through a relay instead, and keeps trying for a direct path in the background. People sometimes call that a symmetric N A T, and you find them on corporate networks and some carrier networks. The port STUN reported was the port used towards STUN, which is useless to anyone else. Tailscale has some extra tricks for when only one side is hard. David Anderson's post, "How N A T traversal works", is the classic explanation. But when both sides are hard, a direct path might just be impossible.

A: So, try this one. There's a command, tailscale netcheck, and one of the lines it prints is "mapping varies by dest I P", true or false. What does true mean? And if you and the server both show true, what do you expect tailscale ping to say?

B: True means... the mapping changes depending on where you're sending. So that's the hard N A T. And if we're both hard, the punch fails, so it goes through the relay. Ping would say it's relayed.

A: Yep. Netcheck works it out by comparing what several STUN servers saw. If they saw different ports, the mapping varies. And with both ends hard, tailscale ping keeps answering "via DERP", that's the relay, and never upgrades to a direct "via" some address and port. On my Mac at home it said false. The easy kind.

<!-- section: The Idea: DERP -->

A: So, DERP. Stands for designated encrypted relay for packets. Servers Tailscale runs around the world, which forward already-encrypted WireGuard packets between devices. And they do it over HTTPS, TCP port four forty-three, so they work even on networks that block U D P entirely. They route by public key, and they can't decrypt anything. Each device keeps a connection open to its nearest DERP region. When the laptop needs the relay, it wraps its WireGuard packet in "deliver this to public key X" and sends it to DERP, and DERP passes it down the server's open connection. And notice, both of those connections are outgoing, from each house's point of view. So no N A T ever has to accept anything unexpected.

B: And what can DERP see?

A: Which device keys are talking to which, when, and how much. Not what's inside. The WireGuard encryption's end to end, and DERP never had the private keys. The cost is a detour. If you and the server are in the same city and the relay's a few hundred miles away, every round trip now goes out to the relay and back. And relays have limited bandwidth per connection, so a big rsync is slower.

B: So if I ever see DERP, something's gone wrong.

A: [jumping in] Not necessarily, and this one surprises people. Tailscale actually starts every new connection on DERP, on purpose, because DERP works immediately. Then it tries hole punching in the background, and as soon as a direct path answers, it quietly switches. That's why the first tailscale ping to a peer often says "via DERP", and the next one says "via" some address and port. It only means something's wrong if it never upgrades.

A: So here's everything put together. Picture one diagram with three buttons, three ways of reaching the server, and for each one, what every hop along the path can see. Mode one, port forward. The cafe Wi-Fi sees a TCP connection from you to your home address on port twenty-two. The SSH version line goes by in plain text, then just encrypted bytes, with their sizes and timing. Your home router has the rule you wrote, so it forwards your packets, and everybody else's. S S H D sees you, and every bot on the internet. Your logs fill with failed logins. And the scan bots can reach S S H D directly, guess passwords, try exploits. Mode two, Tailscale direct. The cafe sees U D P packets between you and your home address. Encrypted blobs. It can't even tell it's SSH, or what port is inside. The home router has no forwarding rule. It lets those packets in only because the server sent to you first. That's the punch. The control server swapped keys and addresses beforehand and sees none of the traffic. S S H D sees an ordinary TCP connection from your laptop's one hundred dot something address. And the bots? Nothing answers. Mode three, DERP. The cafe sees an HTTPS connection to a Tailscale relay. Looks like web traffic. DERP sees keys, sizes, timing, can't decrypt. Your home router only sees the server's own outgoing connection to the relay. S S H D sees the same thing as direct, just slower. Bots, nothing.

B: [working it out] So only the port forward lets strangers reach S S H D. And only DERP puts my packets through someone else's machine, but they're still encrypted.

A: That's the whole picture. Now, in the direct mode, your SSH session is encrypted twice. Once by SSH, once by WireGuard. Is that wasteful?

B: It sounds wasteful. I'd drop one. Probably SSH's, since the tunnel's already encrypted.

A: So, it costs a bit of CPU, but nothing you'd notice at typing speed, or even at hundreds of megabytes a second on a modern CPU. And each layer protects something different. WireGuard protects the packet between two devices, and hides that it's SSH at all. SSH authenticates you, as a user, to that specific S S H D. And it stays secure when the tunnel isn't there. On the home network, say. Or if some other device on your tailnet is compromised and someone on it is snooping. The only way to drop SSH's encryption would be to switch to plain telnet over the tailnet. Which, the whole origin story, nobody should do. What you can drop is SSH's authentication layer. That's Tailscale SSH, which I'll get to. It replaces your keys with your Tailscale identity, but it still encrypts.

<!-- section: The Idea: The rest of the Tailscale toolkit -->

A: A few more things you'll bump into. Those one hundred dot something addresses come from the same range I S Ps use for carrier-grade N A T, the hundred dot sixty-four range. That sounds odd, but it's chosen precisely because it's unlikely to collide with your home network or an office network. Each device gets an I P v six address too. Then MagicDNS. That's Tailscale's built-in name server. Each device gets a short name, and a long full name ending in ts dot net, and tailscale D answers those lookups locally. It's why you can ssh to the server by name without ever writing an IP down. Then A C Ls, access control lists. By default, every device on your tailnet can reach every other device on every port. The policy file in the admin console, newer docs call the rules "grants", lets you say things like "my phone can reach the home server on port four forty-three only". Worth setting the moment you share the tailnet with anyone, or put an untrusted device on it.

A: Then Tailscale SSH. You turn it on on the server, and tailscale D itself answers port twenty-two on the Tailscale address, and logs you in based on your tailnet identity and an SSH rule in the policy file. No authorized keys to manage. The trade is that your login now depends on your Tailscale account's security, and your Google or GitHub account's, instead of a key file on your laptop. Your normal S S H D keeps working on the home network. And check the docs for the exact flags, this area changes. And the last one, which bites people with servers. Device keys expire after a hundred eighty days by default. And when they do, the device just drops off the tailnet until you log in again.

B: [laughs] On a box with no screen, that I only ever reach through Tailscale.

A: Exactly the nasty surprise. So turn off key expiry for the server in the admin console.

<!-- section: Build It -->

A: [firm] Okay, so what you'd actually do. It's an evening on the home server, plus half an hour with the Spark. And one rule before anything else. Before you touch S S H D or the firewall, open a second SSH session to the server and leave it open. An existing session survives a bad config. A new one might not. If you can, have a keyboard and screen on the server too, or at least be on the home network.

A: First you just look at what you've got. Check the OpenSSH version, check the service is running, or on newer Ubuntu that the socket is, see who's listening on twenty-two and on which addresses, list the drop-in files, and dump the effective settings with S S H D dash capital T. Then list the network interfaces, find the physical one and tailscale zero, and get the server's Tailscale address. On the Mac, look at what's in your ssh folder and what ssh dash capital G says about home. Write down four things: the version, whether password auth is on right now, which drop-in files exist, and the name of the physical interface.

A: Then keys only. If you don't have an Ed two five five one nine key, make one with a passphrase, copy it over with S S H copy I D, and then prove the key works on its own. You run ssh with options that turn off passwords and keyboard-interactive and force it to use only that one key file, and have it print "key OK" if it gets in. Don't move on until it does. Then open authorized keys on the server and read it. Is there anything in there you don't recognise? Every line is a key that can log in as you. And then verify the host key the honest way. Print the fingerprint on the server, and compare it with what your Mac has in known hosts. If you've got entries under both the name and the Tailscale address, both should match.

A: Then you harden. You write your own drop-in file, and you name it so it sorts before every other file in that folder, something starting with ten, because first value wins. You go through those six settings, decide each one yourself, and write a comment on why. Then the safe sequence. Test the syntax with S S H D dash lowercase T. Reload, not restart, so existing sessions stay up. Check S S H D dash capital T shows what you meant. Then from a new terminal on the Mac, try to log in with public keys switched off. It should fail, with "permission denied, public key". That's the server saying public key is the only method it offers. Then log in normally, which should work. And have an agent review your file and that output, specifically looking for a setting that's being overridden by some other file.

A: Then the firewall. You write the U F W rules yourself, and the shape is: deny incoming by default, allow outgoing, allow anything on the Tailscale interface, and allow port twenty-two from the home subnet. Tailscale's own guide for U F W also allows U D P on its port, four one six four one by default, so peers can reach it directly. Read it and decide. And before you enable it, print the rules and read them out loud. Then, from your still-open second session, check you can open a third. Then install fail two ban and unattended upgrades, check the auto-upgrade settings file has both lines set to one, and check fail two ban's S S H D jail. If fail two ban complains it can't find a log file, your system only logs to the journal, and you tell it the backend is system D.

B: [skeptical] Read them out loud? Really?

A: [laughs] Really. Saying "deny incoming" out loud while you're connected from outside makes you think about whether you've allowed your own way in.

A: Then your ssh config on the Mac. A home block and a spark block, each with a host name and your user. If the Spark isn't on your tailnet but is on the home network, its block gets ProxyJump home. And a host star block at the bottom with the keychain settings, your key file, a keepalive every thirty seconds, and three lines for connection multiplexing. Control master auto, a control path, and control persist ten minutes. Multiplexing means reusing one already-logged-in SSH connection for new sessions. The first ssh does the full handshake. Later ones just open a new channel inside it and skip the handshake entirely. You'll measure what that buys you. And if you added ProxyJump, run a verbose ssh to the Spark and find the two separate authentications. One to home, one to the Spark.

A: Then Jupyter. Start it on the Spark bound only to one twenty-seven dot zero dot zero dot one, the loopback address, port eight eight eight eight, so nothing on any network can reach it directly. Write the one ssh command, with dash capital N so it doesn't open a shell, that makes localhost eight eight eight eight on the Mac reach it. Then move that into your spark block as a local forward, so plain ssh spark brings Jupyter along. Then prove what's happening. Ask the Mac who's listening on eight eight eight eight, and it should be ssh. And try reaching Jupyter directly on the Spark's Tailscale address.

B: Which fails.

A: Which fails, because Jupyter's only listening on the Spark's loopback, and the Tailscale address isn't loopback. The only way in is the tunnel. I tested the same pattern on a Mac against a local S S H D, a little Python web server on loopback, forwarded through ssh, and it answered two hundred, okay, on the forwarded port.

A: And then the one that turns Tailscale from magic into packets. Three windows. On the Mac, you run tailscale netcheck, tailscale status, and tailscale ping to the server a few times. On the server, window one runs T C P dump on tailscale zero, watching for TCP port twenty-two. That's inside the tunnel. Window two runs T C P dump on the physical interface, watching U D P, minus DNS. That's the actual wire. Then from the Mac you open a fresh ssh to home, with multiplexing turned off so it really makes a new connection, and you type a few characters.

B: And on the wire I'd see... the same SSH packets, just scrambled?

A: Not even that. In window one, an ordinary-looking TCP connection to port twenty-two, from your laptop's one hundred dot something address. A sin packet, S Y N, the first packet of a TCP connection, then a stream of packets. Their contents are SSH-encrypted, but the TCP headers are readable, because inside the tunnel it's just TCP. And in window two, no TCP port twenty-two at all. Only U D P packets between two public addresses, or two home addresses, usually with port four one six four one on at least one side. Same moment, same number of packets. Different disguise. And you write down the length of a few matching packets from each window. If the laptop's being relayed, window two shows nothing for it, because the traffic is TCP four forty-three to a DERP server. So you watch four forty-three instead, and tailscale status will say "relay".

B: Wait, will I see a packet for every key I press?

A: You'll probably see more packets than keystrokes, actually. Even typing slowly. That's OpenSSH, nine point five and newer, sending fake packets while you type. Chaff. So somebody watching the wire can't time your keystrokes and guess what you typed from the rhythm.

B: [amused] That's paranoid in a way I respect.

A: Then the last build, which is just nice to have. Build this Workbench site on the Mac, rsync it to the home server over your new home alias, with delete, so it mirrors exactly. On the server, serve it with Python's built-in web server on port four three two one, bound to the Tailscale address. Open it on your phone with Tailscale on, then with Tailscale off. Off, it should fail. Then make it survive reboots with a small system D service. An agent can write that one. And there's a trap. If the service starts before tailscale D has brought up its address, binding to the Tailscale address fails. So either tell the service to start after tailscale D and restart on failure, or bind to all addresses and let U F W keep it to the tailnet. And optionally, there's tailscale serve, which puts a real HTTPS address in front of a local port, still tailnet only. And tailscale funnel, which exposes it to the public internet through Tailscale's servers. The command syntax has changed across versions, so check the help first. And think hard before Funnel. That's a public door again. Just one Tailscale holds open for you.

A: And you're done when ssh home and ssh spark work with no flags, a password-only login gets refused, S S H D dash capital T shows passwords, keyboard-interactive and root login off, and you know which file set each value. The firewall's on, and you can still get in over Tailscale from outside the house. Jupyter opens on the Mac and you can say why the direct address fails. You've seen the same session as TCP inside the tunnel and U D P on the wire. And your phone opens the site over the tailnet, and doesn't without it.

<!-- section: Measure -->

A: So, numbers. Netcheck first. On my Mac on home Wi-Fi it said U D P true, mapping varies false, and the nearest DERP was Seattle at eight point three milliseconds, with San Francisco at about thirty-two. Yours will be different. What matters is which one's nearest and whether mapping varies. And then run it again on a phone hotspot. Mobile carriers are where you're most likely to see carrier-grade N A T, and mapping varies flip to true.

A: Then tailscale ping. Expect the first pong to say "via DERP" with some region, and a latency of roughly you to the relay plus the relay to the server. Then within a few pings, a pong that says "via" an address and port, at about your real network round trip. On the same home network that's a millisecond or two. Across a city, often five to twenty. If it never upgrades, look at netcheck on both ends.

A: [working it out] Then the connect time, and this one's worth doing in your head. On my Mac, against a local S S H D over loopback, so zero network delay, a fresh ssh that just runs "true" and exits took a median of forty-two milliseconds over ten runs. A multiplexed one took ten. And that forty-two is process startup plus all the crypto. No network in it at all. Over a real network, a fresh connection adds a stack of round trips on top. The TCP setup, the hello and the menus, the key exchange, the auth request and the signature, opening the channel. Count roughly six to eight round trips. Some messages overlap, so it's approximate. Call it seven. So over a twenty millisecond path, that's forty-two plus seven times twenty, which is a hundred eighty or so. While the multiplexed one stays near one round trip plus the ten. So thirty-ish.

B: [working it out] So through DERP, if the round trip is, say, forty... seven times forty is two eighty, plus forty-two, that's over three hundred milliseconds just to connect.

A: Past three hundred, yeah. A third of a second before you've typed anything. That's the whole latency ladder idea again. A handshake is a stack of round trips, and round trips are set by distance. The crypto's the cheap part.

A: And packet length. WireGuard's data packet is a sixteen-byte header, then the inner IP packet padded up to a multiple of sixteen, then a sixteen-byte tag. T C P dump on the physical interface reports that whole thing as the U D P length. So if a packet's some length on tailscale zero, round it up to the next multiple of sixteen and add thirty-two, and that's what you predict on the wire. Say the inner packet is a hundred bytes. Round up to a hundred twelve, add thirty-two, a hundred forty-four. Check it on three packets. And then the outer I P v four and U D P headers add another twenty-eight bytes on the actual wire. Which is why Tailscale gives its interface a smaller maximum packet size, twelve eighty bytes, so the bigger outer packet still fits on normal networks.

<!-- section: Break It -->

A: Now break it, on purpose. Four ways. First, lock yourself out, safely. In your second, still-open session, add "allow users nobody" to your drop-in, test it, reload, and try a new connection. Denied. Even with the right key.

B: And the session I'm typing in?

A: [calm] Still alive. Because remember, each connection has its own S S H D child, and yours already finished logging in. The new rule only applies to new children. So you remove the line and reload. That's the reason for "always keep a second session open", and the reason the syntax test exists. Second, get overridden. Create a drop-in that sorts earlier, starting with zero five, that just says password authentication yes. Reload, check S S H D dash capital T. It says yes. Your ten file says no, but zero five sorts first, and first wins. Try a password login from the Mac, and you get a password prompt. Delete it and reload. That's exactly how one cloud-init file quietly undoes hardening on real servers.

A: Third, force the relay. On the server, temporarily block all outgoing U D P except DNS, with an I P tables rule. So hole punching can't work. Do it from the home network, or with a console handy, because your SSH session over Tailscale will stall for a few seconds while it fails over. Then watch tailscale ping from the Mac. The direct pongs stop, and it falls back to "via DERP". Time an rsync of a five hundred megabyte file both ways, direct and then relayed. Then delete the rule. And you've just felt why DERP is a fallback, not the plan.

B: And the fourth is the scary warning.

A: [amused] Yep, you get to cause it yourself this time. On the server, move the Ed two five five one nine host key aside, generate a fresh one, reload. Connect from the Mac and read the whole warning, top to bottom. Then do the right thing. Compare the new fingerprint on the server itself, remove the old line from known hosts, for the name and for the Tailscale address, reconnect, accept. Or restore the backup and watch the warning just go away. Either way, you've now seen that message for an innocent reason, and you know exactly how to tell.

<!-- section: Scaling it up -->

B: So this is all me, one laptop, one server, the Spark. What happens if it's two hundred devices on a tailnet? Or two hundred engineers sharing one box they all jump through?

A: [thinking out loud] Okay, so Tailscale's a mesh. Every device can talk to every other one directly, and the control server only hands out keys. With N devices that's up to N times N minus one, over two, possible tunnels. For two hundred devices that's nineteen thousand nine hundred pairs. Sounds like a lot, but WireGuard tunnels are cheap and they only get set up when they're used. So the real costs are somewhere else. The map each device downloads grows with N, and so does how long changes take to spread. And because paths are direct, there's no central bandwidth bottleneck. DERP is the shared resource. So what fraction of your devices are on hard N A Ts starts to matter. And A C Ls become essential. "Everyone reaches everything" is fine for one person. It's terrible for two hundred.

B: And the jump box?

A: One shared jump box is a single point of failure and a bandwidth bottleneck. Everyone's traffic squeezes through it. And authorized keys files on two hundred servers don't scale either, not for adding and removing people. Somebody leaves, and you're hunting their line on two hundred machines. That's what SSH certificates are for, where a certificate authority signs short-lived user keys. Or identity-based SSH, like Tailscale SSH. Either way, who can log in gets managed in one place, and keys expire on their own.

<!-- section: The whole path, end to end -->

A: [slowly, pulling it together] So now put it all on one line. You type ssh home. Ssh reads your config, turns home into the server's Tailscale name, and MagicDNS turns that into its one hundred dot something address. The packet goes to the Tailscale interface. Tailscale D encrypts it with WireGuard and sends it as U D P straight to the server's real address, through the hole that got punched. Or through a DERP relay if it couldn't. On the server it's decrypted, and arrives at S S H D on port twenty-two like any other TCP connection. Then SSH itself. Version lines and menus. An elliptic-curve Diffie-Hellman exchange for a shared secret. The server signs that exchange with its host key, and your laptop checks it against known hosts. Then you. Your laptop offers your public key, the server finds it in authorized keys, your laptop gets the agent to sign the session I D, and the server checks the signature. Then a session channel, a pseudo-terminal, a shell. And your keystrokes go back and forth, encrypted, inside that channel, inside the tunnel.

A: And if you want to go further, David Anderson's "How N A T traversal works" and Avery Pennarun's "How Tailscale works", both on Tailscale's blog, are the two best things to read. And it's the same Diffie-Hellman-plus-signature idea as TLS, just with known hosts standing in for certificates. That dash L forward is also how you'll reach the inference server and the dashboards on the Spark later, without opening anything to the network.

B: [working it out] Okay, let me try the whole thing. SSH is a handshake where we agree on a secret, the server proves it's the server, then I prove it's me with a key. And Tailscale is a VPN that gets through my router by... sending everything through their relay, encrypted, so they can't read it.

A: [gently] The SSH half, yes. That's it. The Tailscale half, almost, but you've got the fallback as the main path. Their servers mostly just swap public keys, like a phone book. The actual packets go direct. Both devices fire a packet at each other at the same moment, so each router thinks the other side's packet is a reply to something it sent. The relay only carries your traffic when that trick fails. And even then it's just moving sealed envelopes it can't open.
