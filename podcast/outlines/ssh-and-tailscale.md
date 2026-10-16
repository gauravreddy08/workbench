# Outline: ssh-and-tailscale

Source: src/lessons/ssh-and-tailscale.mdx. Curriculum entry: "Your home server, explained." Question:
what actually happens when I SSH into my home server over Tailscale? Why: you already use it; knowing
keys, NAT and WireGuard turns magic into something you can fix.

Privacy: no real hostnames, IPs, usernames or Tailscale names are spoken. The script says "the home
server", the alias "home", "your username", and "a one hundred dot something address". No IP
addresses are read aloud at all (documentation-range numbers from the lesson are described, not read).

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereqs: packets and IP, TLS, TCP vs UDP help; none required. -> A re-explains each borrowed idea inline (Diffie-Hellman paint, NAT, UDP vs TCP, round trips) so nothing needs looking up. Today bullets skipped as a list.

## The Problem

- P1 Scene: box at home, Tailscale on it and the laptop, ssh to it works from apartment, office, cafe. -> A opens on this.
- P2 Question: first-connect yes/no prompt, what did you agree to? -> A, as one of the open questions; B: "I just type yes" (wrong model: it's just a 'continue?').
- P3 Question: REMOTE HOST IDENTIFICATION HAS CHANGED, someone doing something nasty? -> A quotes the warning's words.
- P4 Question: is password login on; if router forwards 22, how long before a bot finds it? -> A.
- P5 Question: Jupyter on the Spark in the laptop browser, how? -> A.
- P6 Question: cafe couldn't reach box before; after an app, it can, no port opened. How does a packet get in? Through Tailscale's servers? Can Tailscale read it? -> A; B voices wrong model "it all goes through Tailscale's cloud, like a VPN company" — A defers the answer: no, mostly direct.
- P7 Three old ideas stacked: listener (sshd), handshake making strangers share a secret (same trick as TLS), sneaking through two routers built to stop it. -> A, as the roadmap sentence.

## Origin

- O1 Early 1995, Tatu Ylönen, Helsinki University of Technology, password sniffer on the university network. -> A, story.
- O2 telnet and rlogin sent everything incl. password as plain text; anyone on a machine along the path could read it. -> A.
- O3 Wrote encrypted replacement, free that summer; Secure Shell; asked for a port, got 22, between FTP 21 and telnet 23; tens of thousands of users within months. -> A; B amused at port 22 placement.
- O4 OpenBSD forked old free version into OpenSSH (1999), what nearly every Linux box and Mac runs; SSH-2 standardised 2006. -> A.
- O5 Twenty years later: encryption solved, devices behind home routers unreachable. -> A.
- O6 WireGuard by Jason Donenfeld 2015-2017, tiny, under four thousand lines in the Linux kernel. -> A.
- O7 2019 ex-Google engineers start Tailscale: every device reaches every other directly with WireGuard, however many routers in the way. -> A.

## The Idea: sshd

- I1 "Has SSH" = program sshd running; daemon defined (background, no terminal, started at boot; trailing d: sshd, tailscaled, systemd). -> A.
- I2 Port defined (1 to 65535, IP finds machine, port finds program; SSH is 22). -> A.
- I3 Kernel defined; listen defined (tell kernel hand me TCP connections for this port; phone plugged in and on). -> A.
- I4 Connection arrives: kernel hands it over, sshd starts a child per connection, goes back to waiting; child does handshake, checks you, becomes a shell as your user. -> A.
- I5 ss command shows LISTEN on 0.0.0.0 port 22: "every interface" incl. home network and Tailscale one; matters for hardening. -> A describes what you'd see, not the command line.
- I6 Socket activation: recent Ubuntu may show systemd holding the port, starts sshd on connection; changes how you restart after editing the port. -> A, aside.

## The Idea: connection step by step

- I7 Strangers on a network where anyone in the middle (cafe Wi-Fi, ISP) can read and change packets; about half a dozen round trips; four goals: shared secret, real server, it's you, carry keystrokes. -> A.
- F1 Figure 001 sequence: time flows down; TCP, hello, key exchange, auth, channel; grey readable, blue encrypted; server proves itself before you send anything proving who you are. -> A describes, emphasises the order; B reacts to the order.
- I8 Step 1 TCP to port 22, reliable pipe of bytes. -> A.
- I9 Step 2 hello: plain-text version line, then menus (key exchange, encryption, signature), pick first on laptop's list server supports; readable, so a scanner knows your OpenSSH version on connect. -> A.
- I10 Step 3 key exchange: paint mixing analogy (base colour, secret colour, swap mixtures, add own secret, same final colour; watcher can't un-mix). -> A, full analogy (lesson's own).
- I11 Diffie-Hellman term (1976, private random number, public value, elliptic-curve version, Curve25519), fresh every connection. -> A.
- I12 Forward secrecy: random numbers thrown away; record today, steal keys next year, still can't decrypt. -> A; B asks "even if they steal the server's key?"
- I13 Derive actual encryption keys (AES-GCM or ChaCha20-Poly1305), from next message everything encrypted. -> A, names spoken plainly.
- I14 Session ID: hash of everything both sides said in the key exchange; unique; later the thing your key signs. -> A.
- I15 DH alone only proves a secret with whoever answered; man in the middle does two exchanges and relays. -> B voices "but now it's encrypted, so we're safe" wrong model; A corrects.
- I16 Host key (server's long-term key pair from install, private half in /etc/ssh, identifies machine not user) plus signature (wax seal) over session ID; impostor can send a host key but can't sign for the real one. -> A.
- I17 Moves question to: how does the laptop know which host key is real? -> A signpost.

## The Idea: TOFU and the warning

- I18 It doesn't the first time: that's the yes/no prompt with a fingerprint. -> A, ties back to P2.
- I19 Fingerprint: short hash of a public key, compare by eye. Yes = "I trust this is my server", written to known_hosts; every later connection checked. -> A.
- I20 TOFU: trust on first use; weak once, strong forever after. -> A.
- I21 Careful yes: compare with fingerprint the server reports at its own keyboard (ssh-keygen -l on the host public key). -> A in words.
- I22 Warning reproduced on a Mac: throwaway sshd, connect once, new host key, connect again; "offending key in known_hosts line 1, host key verification failed". -> A.
- PR1 Predict: three innocent reasons + one bad; what to check. Answer: reinstall OS (fresh host keys); different machine answers that name/address (router DHCP reassigned the LAN address, reused hostname); deleted and re-added to Tailscale, got a 100 dot address that used to be another device's. Bad: man in the middle. Check fingerprint from the server itself (console or trusted path) before ssh-keygen -R; can't explain it, don't connect. -> A asks; B guesses reinstall + attacker; A adds the other two.

## The Idea: keys not passwords

- I23 Password: guessable (bots try millions); server sees the actual password; said yes to impostor => impostor has it. -> A.
- I24 Key pair defined (private stays, signs; public shareable, checks; public doesn't give private). ssh-keygen ed25519, two files, private never leaves, public one line. -> A.
- I25 Ed25519: Bernstein and colleagues 2011, elliptic curve, 32-byte keys, fast, avoids implementation pitfalls, default. Public key file on the Mac 86 bytes, one line. Append to authorized_keys; ssh-copy-id does it. -> A.
- I26 Login flow: offer key, server checks authorized_keys, laptop signs message containing session ID, server checks; ssh -v shows "offering public key", "server accepts key", "authenticated using publickey". -> A.
- I27 Why better: about 128 bits of security, bots trying the wrong kind of thing; nothing reusable (only a signature, covers this session's ID, can't replay); revocable per device (one line per laptop). -> A; B asks "what does a hundred twenty-eight bits mean" -> A gives feel (derived comparison avoided; says "two to the hundred twenty-eight guesses, more than every computer could try").
- F2 Figure 002 four files: laptop private key + known_hosts; server authorized_keys + host private key; each side keeps a private key and holds the other's public key; known_hosts answers "is this my server", authorized_keys "is this me"; private ones never leave. -> A describes symmetry.
- I28 Passphrase encrypts the key file (file copied = you). ssh-agent term: holds decrypted keys in memory, signs on request, unlock once per login session. macOS AddKeysToAgent and UseKeychain. -> A.
- I29 Agent forwarding (ssh -A) risk: root on remote can log in as you elsewhere while connected; use ProxyJump instead. -> A; B asks why.

## The Idea: channels

- I30 Channel term: independent stream inside one connection with own ID and flow control. Shell is channel 0, session channel, pty (fake terminal so vim and htop think there's a keyboard and screen) and shell; ssh home uptime runs one command. -> A.
- F3 Figure 003 three forwards. -> A, as three scenes.
- I31 -L local forward: ssh listens on laptop 8888, tunnel, Spark's sshd connects to localhost 8888 as seen from the Spark; service stays on Spark loopback, invisible to everything else. -> A, Jupyter scene; B wrong model "so Jupyter is now open on the Spark's network?" -> A no.
- I32 -R remote forward: server listens on 9000 and carries back to laptop 3000; show a dev server to a machine that can't reach you. -> A.
- I33 -D dynamic forward: SOCKS proxy term; browser at localhost 1080, home server fetches every site; router admin page from a cafe. -> A.
- I34 Files ride channels: scp, sftp (scp speaks SFTP since OpenSSH 9.0); rsync over ssh sends only changed parts, for repeated deploys. -> A.

## The Idea: ssh config

- I35 Config file: host block = nickname plus settings (HostName, User). -> A.
- I36 First value wins top to bottom; specific blocks first, catch-all last. -> A; B: "I'd have assumed last wins like CSS" (wrong model) -> A.
- I37 ProxyJump: ssh to home, open connection from there to Spark's 22, second separate SSH session through it, end to end encrypted laptop to Spark, middle relays encrypted bytes; why safer than agent forwarding. -> A, closing I29 loop.
- I38 ssh -G prints final merged settings. -> A.

## The Idea: locking the door

- I39 sshd runs as root and talks to anyone. regreSSHion July 2024 (CVE-2024-6387): OpenSSH sshd on Linux, unauthenticated attacker runs code as root, versions 8.5p1 to 9.7p1. xz backdoor March 2024, aimed at sshd on some Linux distributions, caught by luck shortly before stable releases. Both patched fast; dangerous mainly where port 22 open to the whole internet. -> A, story; versions said as "eight point five up to nine point seven".
- I40 Hardening two halves: shrink what sshd accepts, shrink who can reach it. -> A.
- I41 sshd_config plus Ubuntu drop-in folder read first; first value wins; cloud-init file with PasswordAuthentication yes silently beats you; trustworthy view is sshd -T. -> A.
- I42 Settings table: password auth no; keyboard-interactive no (other door); root login no (log in as yourself then sudo; default prohibit-password already blocks root passwords); AllowUsers only named accounts; MaxAuthTries 3 (default 6); X11 forwarding no. -> A, as reasons in prose, not row by row.
- I43 ufw: uncomplicated firewall, allow tailnet and home LAN only. -> A.
- I44 fail2ban: watches logs, bans addresses after too many failures; OpenSSH 9.8+ has PerSourcePenalties; matters much less when only reachable over Tailscale. -> A.
- I45 unattended-upgrades: daily security updates, insurance against the next regreSSHion. -> A.

## The Idea: NAT

- I46 ISP gives house one public IPv4 address; all devices share it. IPv4 term: 32-bit, about 4.3 billion, fewer than devices, root of everything. -> A.
- I47 Private addresses (10, 172.16-31, 192.168 ranges; every home reuses them; meaningless on the public internet). -> A, ranges said loosely ("ten dot something, one ninety-two one sixty-eight dot something").
- I48 NAT term: rewrites outgoing to one public address and a port it picks, remembers mapping, rewrites replies. -> A.
- F4 Figure 004: out is easy, router writes a note; reply matching note gets in; cafe packet matches no note, which device? dropped. -> A as a scene.
- I49 Not a firewall rule you set; how NAT works; accidentally one of the best security features. -> B wrong model "the router's firewall is blocking it" -> A corrects.
- I50 CGNAT: ISP shares one public address across customers; router's WAN address is itself private, usually in the hundred dot sixty-four range; can't port-forward through a NAT you don't control; mobile and some fiber; check: router's WAN address differs from what a what's-my-IP site reports. -> A.

## The Idea: port forwarding

- I51 Port forward term: rule on router sending public port to LAN device; turns accidental protection off for that port. -> A.
- I52 Everyone else can too: bots scan every IPv4 address on common ports; fresh server with 22 open logs first password guesses within minutes to hours; journalctl count of invalid user; read your version from hello line. -> A, answering P4.
- I53 Hardening matters more; useless against pre-login bug like regreSSHion; doesn't work behind CGNAT; breaks when ISP changes public address. -> A.

## The Idea: WireGuard

- I54 WireGuard term: Donenfeld 2017, IP packets encrypted inside UDP, device identified by Curve25519 public key, small enough to audit, Linux kernel since five point six (2020). -> A.
- I55 Each device key pair; peer list: public key, reachable at this IP and port, allowed inside addresses. Encrypt the whole IP packet, put inside UDP (term: no connection, no retries, no ordering), send to peer's real address; peer decrypts, hands inner packet to kernel as if from a network card. -> A.
- I56 Virtual network card tailscale0 on Linux, utun on macOS; to sshd just another interface; why sshd needed no changes (0.0.0.0 includes it), callback to I5. -> A; B: "so sshd doesn't know" moment.
- I57 Silent to strangers: no reply at all to anything not encrypted by a known key, not even "go away". -> A.
- I58 Small overhead: 16-byte header, 16-byte tag, inner padded to multiple of 16, plus 28 bytes outer IPv4 and UDP; you'll measure. -> A.
- I59 Cheap handshakes: re-keyed every couple of minutes with one round trip, stolen session key useful only briefly. -> A.
- I60 What WireGuard doesn't do: needs peer's public key and real address in advance, needs packets to arrive; both behind NAT, neither knows the other's key, neither router lets the other in. -> A signpost.

## The Idea: Tailscale planes

- I61 Two planes. Control plane term (decides and configures, vs data plane carrying traffic). Coordination server term: devices log in, upload public keys and candidate addresses, download peers, never sees private keys or carries traffic. -> A.
- I62 tailscaled starts: makes key pair, private stays, logs in with Google or GitHub, uploads public key; gets stable one hundred dot something address; map of allowed peers with keys, addresses, candidate endpoints; connection kept open, changes pushed. -> A.
- I63 Data plane is WireGuard device to device; SSH goes laptop to server, not via control. Answer to "can Tailscale read it?": only public keys. -> A answers P6; B's wrong model corrected here.
- I64 What you do trust: the phone book; malicious control server could hand a fake peer key; Tailnet Lock removes that trust. -> B pushes "so I am trusting them" -> A.

## The Idea: hole punching

- I65 NAT rule reminder; both send out to each other at about the same time; each router writes a note; each packet arrives looking like a reply. -> A.
- I66 Need own public address and port, can't see from inside; STUN term (what address and port did my packet come from); Tailscale's relays double as STUN. -> A.
- F5 Figure 005 stepped: two devices behind two NATs; step: each asks STUN, router writes mapping; both send public address and key to control which passes them on; laptop sends to server's public address and port, own router notes it, home router drops it, fine, its job was to open the cafe side; server sends back, home router reuses mapping, cafe router sees match, let in; both notes, both ways, WireGuard handshake; keepalives since UDP notes expire in thirty seconds to a few minutes. -> A walks the steps as a story; B asks about the dropped first packet ("wasn't that wasted?").
- F5b Hard toggle: home router picks new public port per destination; server's packet leaves from a different port; cafe expects the STUN-seen port; drops; laptop keeps aiming at the old port, which only accepts replies from STUN; neither can predict; DERP, keep trying direct in background. -> A.
- I67 Hard NAT = symmetric NAT, common on corporate and some carrier networks; STUN-reported port only good towards STUN; extra tricks when one side is hard (Anderson's post); both hard may be impossible. -> A.
- PR2 Predict: netcheck's MappingVariesByDestIP true meaning; both true -> ping stays via DERP never upgrades to direct. On the Mac at home it read false. -> A asks; B answers mostly right.

## The Idea: DERP

- I68 DERP term: Designated Encrypted Relay for Packets; Tailscale-run, worldwide, forwards already-encrypted WireGuard packets over HTTPS TCP 443, works where UDP blocked, route by public key, can't decrypt. Each device keeps a connection to nearest region; laptop wraps packet "deliver to key X"; both connections outgoing, no NAT accepts anything unexpected. -> A.
- I69 DERP sees which keys talk, when, how much; not content. Cost: detour (same city, relay a few hundred miles away); limited bandwidth per connection, big rsyncs slower. -> A.
- I70 Every new connection starts via DERP, tries punching in background, switches when direct answers; why first ping says via DERP and next says via an address. -> B wrong model "DERP means something went wrong" -> A.
- F6 Figure 006 three ways home: port forward (cafe sees TCP to your home address on 22, version line in plain text, then encrypted bytes; router forwards everyone's; sshd logs fill; bots reach sshd), Tailscale direct (cafe sees UDP blobs, can't tell it's SSH; router lets in only because of the punch; control saw only keys; sshd sees 100 dot address; bots: nothing answers), DERP (cafe sees HTTPS to a relay; relay sees keys, sizes, timing; home router only outgoing; slower; bots nothing). -> A describes as toggling three modes.
- PR3 Predict: double encryption wasteful? Answer: a little CPU, unnoticeable even at hundreds of megabytes per second; WireGuard protects device to device and hides it's SSH; SSH authenticates you as a user to that sshd and stays secure without the tunnel (home LAN, or compromised tailnet device snooping); drop SSH encryption only via telnet, don't; Tailscale SSH drops SSH's authentication layer, still encrypts. -> B says "seems wasteful, drop one" -> A.

## The Idea: toolkit

- I71 100 dot addresses from the hundred dot sixty-four range, same as CGNAT, chosen because unlikely to collide with home 192.168 or office 10; IPv6 address too. -> A.
- I72 MagicDNS: built-in name server, each device a name and a long full name; why ssh by name works without an IP. -> A.
- I73 ACLs: default everyone reaches everything on every port; policy file (newer docs: grants), e.g. phone reaches home server on 443 only; set once sharing or adding untrusted device. -> A.
- I74 Tailscale SSH: tailscaled answers 22 on Tailscale address, logs in by tailnet identity and an ssh rule; no authorized_keys; trade: login depends on Tailscale and Google/GitHub account security; normal sshd still on LAN; check docs, area changes. -> A.
- I75 Key expiry: device keys expire after 180 days by default, device drops off; headless server surprise; disable expiry for it. -> A; B reacts.

## Build It

- B0 Safety: open a second SSH session first and leave it open; existing session survives bad config; keyboard and screen or home LAN. -> A, stressed.
- B1 t0 Look: OpenSSH version, service status (or ssh.socket), who listens and on which addresses, drop-in files, sshd -T effective settings, interfaces incl. tailscale0, Tailscale address; on Mac, ls .ssh and ssh -G. Write down version, password auth on?, drop-ins, physical interface name, 100 address. -> one or two sentences.
- B2 t1 Keys only: make Ed25519 with passphrase; ssh-copy-id; prove with forced options (no password, no keyboard-interactive, only that key) printing KEY OK; read authorized_keys, every line can log in as you; verify host key fingerprint on server vs known_hosts lookup; both name and address entries should match. -> A.
- B3 t2 Drop-in named to sort first (ten hardening); decide each setting with a comment; sshd -t syntax test, reload (sessions stay), sshd -T check; from a new terminal, password-only attempt should fail "Permission denied (publickey)", key login should succeed; agent reviews for overridden setting. -> A.
- B4 t3 ufw: deny incoming default, allow outgoing, allow the Tailscale interface, allow 22 from LAN subnet; Tailscale's ufw guide allows UDP 41641 so peers reach directly, decide; show added rules and read them out loud before enabling; check you can open a third session. fail2ban + unattended-upgrades; auto-upgrades file both lines 1; fail2ban status sshd; journal-only logs -> backend systemd in jail.local. -> A.
- B5 t4 ssh config: home and spark blocks, ProxyJump home if Spark only on LAN; Host star: UseKeychain (with IgnoreUnknown), AddKeysToAgent, IdentityFile, ServerAliveInterval 30, ControlMaster auto, ControlPath, ControlPersist ten minutes. Connection multiplexing term (first ssh does handshake, later ones open a channel inside, skip handshake). Check with ssh -G; with ProxyJump, ssh -v shows two separate authentications. -> A.
- B6 t5 Jupyter bound to 127.0.0.1 port 8888 on Spark; one ssh -N -L command; move into LocalForward; lsof shows ssh listening on the Mac; direct curl to Spark's 100 address fails because loopback-only; tested pattern: Python web server forwarded answered 200. -> A; B asks why direct fails.
- B7 t6 See WireGuard on the wire: netcheck, status, ping on Mac; tcpdump inside tunnel on tailscale0 port 22; tcpdump on physical interface UDP excluding DNS; fresh ssh with ControlMaster no; window 1 ordinary TCP from laptop's 100 address, SYN then stream, payload SSH-encrypted but TCP headers readable; window 2 no TCP 22, only UDP between public or LAN addresses, usually 41641 on one side; same moment, same count, different disguise; record lengths; relayed: window 2 shows nothing, TCP 443 to DERP, status says relay. Chaff: OpenSSH 9.5+ sends fake packets while you type so keystroke timing hidden. -> A, the payoff; B surprised by extra packets.
- B8 t7 Serve Workbench site: build, rsync with delete over home alias; python http.server on port 4321 bound to Tailscale address; phone with Tailscale on works, off fails; systemd service; bind trap: starts before tailscaled has its address -> fails; After tailscaled and Restart on-failure, or bind all and let ufw restrict. tailscale serve (HTTPS name, tailnet-only), funnel (public through Tailscale's servers), syntax changes, think hard: public door again. -> A.
- B9 DoneWhen: flagless ssh home/spark and password refused; sshd -T shows settings and which file; ufw on and still reachable from outside; Jupyter at localhost and why direct fails; same session TCP on tailscale0 and UDP on physical; phone opens site only with Tailscale. -> A folds into the end of Build It as one sentence.

## Measure

- M1 netcheck on Mac home Wi-Fi: UDP true, MappingVariesByDestIP false, nearest DERP Seattle 8.3 ms, San Francisco about 32 ms; yours differ; what matters is nearest and whether mapping varies; try a phone hotspot (mobile carriers likeliest CGNAT and true). -> A.
- M2 tailscale ping: first pong via DERP at roughly you-to-relay plus relay-to-server, within a few pings direct at real round trip; same LAN a millisecond or two, across a city often five to twenty ms; never upgrades -> netcheck on both ends. -> A.
- M3 SSH connect time: loopback, median 42 ms fresh over 10 runs, 10 ms multiplexed; 42 is process startup plus crypto; real network adds about 6-8 round trips (approximate, overlap): TCP, hello and menus, key exchange, auth request and signature, channel open. Over 20 ms path: 42 + 7 × 20 ≈ 180 ms; multiplexed near one round trip plus 10. DERP at 40 ms round trip: past 300 ms. Latency ladder: handshake = stack of round trips, round trips set by distance. -> A works the sum aloud; B does the DERP one (Numbers gap).
- M4 Packet length: 16 header + inner padded to 16 + 16 tag; tcpdump UDP length N = 32 + L rounded up to multiple of 16; check three packets; outer 28 bytes; Tailscale MTU 1280 so outer still fits. Worked example (derived): inner 100 -> 112 -> 144. -> A with a worked example.
- M5 Measure table rows (first pong, after upgrade, path, mapping, nearest DERP, fresh vs multiplexed, packet length both sides). -> covered by M1-M4, not read as a table.

## Break It

- K1 Lock yourself out: AllowUsers nobody in second session, sshd -t, reload, new connection denied even with right key; existing session alive because each connection has its own sshd child already past auth; remove and reload; why second session and sshd -t exist. -> exchange.
- K2 Be overridden: zero-five oops file with PasswordAuthentication yes; sshd -T shows yes; your ten file says no but zero five sorts first; password prompt appears; delete; how one cloud-init file undoes hardening. -> exchange.
- K3 Force the relay: block outgoing UDP except DNS with iptables (from LAN or with console; Tailscale session stalls a few seconds during failover); ping falls back to DERP; time rsync of a 500 MB file direct then relayed; remove rule; DERP is a fallback not the plan. -> exchange.
- K4 Change host key: move aside, regenerate, reload; read the full warning; compare new fingerprint on server, remove old line (name and 100 address), reconnect; or restore backup; seen it for an innocent reason, know how to tell. -> exchange.

## Explain It Back (substance must be in the conversation)

- E1 ssh home walkthrough: config resolves alias, MagicDNS gives 100 address, packet to Tailscale interface, WireGuard encrypts, UDP direct or DERP, decrypted, sshd on 22 like any TCP; version and menus, elliptic-curve DH, server signs with host key checked against known_hosts; offer public key, authorized_keys, sign session ID via agent, verify; session channel, pty, shell. -> A does the full end-to-end walk as the closing synthesis before B's restatement.
- E2 Keys vs passwords and host key: covered by I23-I27, I15-I16 (impostor MITM). -> in conversation.
- E3 NAT and port forwarding risk: covered by I46-I53. -> in conversation.
- E4 Tailscale through two NATs, what servers see: I61-I70. -> in conversation.
- E5 Scale, 2 to 200 devices / 200 engineers: mesh, control only distributes keys; up to N times N minus one over two tunnels but cheap and created on use; real costs netmap size grows with N and change propagation; no central bandwidth bottleneck, DERP is shared so hard-NAT fraction matters; ACLs essential; shared jump box single point of failure and bandwidth bottleneck; authorized_keys on 200 servers doesn't scale; SSH certificates (CA signs short-lived user keys) or Tailscale SSH: central who-can-log-in, keys expire. Worked number (derived): 200 devices -> nineteen thousand nine hundred possible pairs. -> A and B, B asks "what happens at two hundred?"

## Go Deeper / Connections

- G1 Best sources: David Anderson's "How NAT traversal works" and Avery Pennarun's "How Tailscale works"; WireGuard whitepaper. -> one sentence.
- C1 Connections: same DH-plus-signature as TLS but known_hosts instead of certificates; TCP-in-TCP retries fight, why WireGuard wants UDP; -L forward is how you'll reach the inference server and dashboards on the Spark later. -> one or two sentences near the end.

## Flow

Problem scene and open questions (B: "I just type yes", "it goes through Tailscale's cloud") -> Origin
story -> sshd as a listener -> handshake step by step with paint mixing and the MITM hole -> host key,
TOFU, the warning and the Predict -> keys vs passwords, four files, agent -> channels and the three
forwards (Jupyter scene) -> config, first value wins, ProxyJump -> regreSSHion and xz, hardening two
halves -> the networking half: NAT, CGNAT -> port forwarding risk -> WireGuard -> two planes, trust
-> hole punching walk, hard NAT, netcheck Predict -> DERP and starting on DERP -> three ways home,
double encryption Predict -> toolkit -> Build It as an evening's sequence -> Measure numbers worked
aloud -> Break It as four "what if you" -> scale question -> A's end-to-end walk of "ssh home" ->
connections in a line -> B's restatement, A's sharpening.
