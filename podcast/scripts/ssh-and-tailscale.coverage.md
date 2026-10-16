# Coverage: ssh-and-tailscale

Lesson src/lessons/ssh-and-tailscale.mdx vs podcast/scripts/ssh-and-tailscale.md. Item IDs match podcast/outlines/ssh-and-tailscale.md.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs re-explained inline (DH, NAT, UDP, round trips) | Idea | "same trick TLS uses for websites" | covered |
| P1 box at home, Tailscale, works everywhere | Problem | "From your apartment, from the office, from a cafe" | covered |
| P2 yes/no prompt; B wrong model "just continue" | Problem | "It's like a "do you want to proceed" box" | covered |
| P3 host identification changed warning | Problem | "remote host identification has changed" | covered |
| P4 password login on? bots find port 22 | Problem | "how long before some bot found it" | covered |
| P5 Jupyter on the Spark in laptop browser | Problem | "You want Jupyter, running on the Spark" | covered |
| P6 how does a packet get in; through Tailscale; can it read; B wrong model | Problem | "everything goes up to their cloud" | covered |
| P7 three old ideas stacked | Problem | "three old ideas stacked on top of each other" | covered |
| O1 1995 Ylönen, Helsinki, sniffer | Origin | "Tatu Ylönen is a researcher at Helsinki University" | covered |
| O2 telnet/rlogin plain text | Origin | "they sent everything as plain text" | covered |
| O3 free that summer, Secure Shell, port 22 between 21 and 23, tens of thousands | Origin | "Which sits right between F T P" | covered |
| O4 OpenSSH 1999, SSH-2 2006 | Origin | "standardised in two thousand six" | covered |
| O5 twenty years later, devices behind routers | Origin | "more and more devices sit behind home routers" | covered |
| O6 WireGuard 2015-2017, under 4,000 lines | Origin | "under four thousand lines of code" | covered |
| O7 2019 ex-Google, Tailscale question | Origin | "a group of ex-Google engineers start Tailscale" | covered |
| I1 sshd, daemon | sshd | "The D at the end stands for daemon" | covered |
| I2 port | sshd | "The port finds the program on that machine" | covered |
| I3 kernel, listen | sshd | "Think of a phone that's plugged in and switched on" | covered |
| I4 child process per connection becomes shell | sshd | "starts a brand new child process just for that one connection" | covered |
| I5 listening on all-zeros = every interface incl. Tailscale | sshd | "that all-zeros address means" | covered |
| I6 socket activation | sshd | "That's called socket activation" | covered |
| I7 strangers, middle can read/change, four goals | Step by step | "they have to do four things" | covered |
| F1 figure 001: order, grey vs blue, server proves first | Step by step | "the server proves who it is before you ever send anything" | covered |
| I8 step 1 TCP | Step by step | "Step one's boring" | covered |
| I9 step 2 hello, menus, version visible to scanners | Step by step | "a scanner knows exactly which OpenSSH version" | covered |
| I10 paint mixing | Step by step | "Think of mixing paint" | covered |
| I11 Diffie-Hellman 1976, Curve25519, fresh each connection | Step by step | "Curve two five five one nine" | covered |
| I12 forward secrecy | Step by step | "That freshness buys you something called forward secrecy" | covered |
| I13 derive AES-GCM / ChaCha20-Poly1305 keys | Step by step | "ChaCha twenty Poly thirteen oh five" | covered |
| I14 session ID | Step by step | "The connection also gets a session I D" | covered |
| I15 DH alone; MITM; B wrong model | Step by step | "It's encrypted, nobody in the middle knows the secret" | covered |
| I16 host key, signature (wax seal) over session ID | Step by step | "Like a wax seal that only one ring can make" | covered |
| I17 which host key is real? | Step by step | "how does my laptop know which host key is the real one" | covered |
| I18 first time: the prompt | TOFU | "Not the first time. That's your yes or no prompt" | covered |
| I19 fingerprint, known_hosts | TOFU | "ssh writes that host key into a file on your laptop called known hosts" | covered |
| I20 TOFU weak once strong forever | TOFU | "Weak once, strong forever after" | covered |
| I21 compare with server-reported fingerprint | TOFU | "The careful way to say yes" | covered |
| I22 warning reproduced, offending key line 1, verification failed | TOFU | "in known hosts, line one, and "host key verification failed"" | covered |
| PR1 predict: three innocent + one bad; check fingerprint before -R | TOFU | "if you can't explain why the key changed, don't connect" | covered |
| I23 password problems; impostor gets it | Keys | "the impostor now has your password" | covered |
| I24 key pair, ssh-keygen ed25519, two files | Keys | "The private key stays secret on your laptop" | covered |
| I25 Ed25519 Bernstein 2011, 32 bytes, 86-byte file, authorized_keys, ssh-copy-id | Keys | "The public key file I made on my Mac was eighty-six bytes" | covered |
| I26 login flow, ssh -v lines | Keys | ""Offering public key", "server accepts key"" | covered |
| I27 128 bits, not reusable, revocable per device | Keys | "roughly a hundred twenty-eight bits of security" | covered |
| F2 figure 002 four files two directions | Keys | "Two directions of trust" | covered |
| I28 passphrase, ssh-agent, macOS keychain settings | Keys | "there's a thing called S S H agent" | covered |
| I29 agent forwarding risk | Keys | "anyone who's root on that remote machine can use your agent too" | covered |
| I30 channels, channel 0, pty, one-command session | Channels | "Your interactive shell is channel zero" | covered |
| F3 figure 003 three forwards | Channels | "Three kinds. Every one of them is just another channel" | covered |
| I31 -L, Jupyter on loopback; B wrong model | Channels | "Jupyter can stay bound to the Spark's loopback address" | covered |
| I32 -R | Channels | "it's the mirror image" | covered |
| I33 -D SOCKS | Channels | "turns ssh into a SOCKS proxy" | covered |
| I34 scp/sftp (scp speaks SFTP since 9.0), rsync | Channels | "Since OpenSSH nine point oh" | covered |
| I35 config host blocks | Config | "you write host blocks" | covered |
| I36 first value wins; B wrong model (last wins) | Config | "Everybody bets last. It's first" | covered |
| I37 ProxyJump end to end, safer than agent forwarding | Config | "The middle machine only ever relays encrypted bytes" | covered |
| I38 ssh -G | Config | "prints the final, merged settings" | covered |
| I39 regreSSHion July 2024 8.5p1-9.7p1; xz March 2024 | Locking | "from eight point five up to nine point seven" | covered |
| I40 two halves | Locking | "So hardening has two halves" | covered |
| I41 drop-ins read first, cloud-init trap, sshd -T | Locking | "often called fifty cloud init" | covered |
| I42 the six settings and reasons | Locking | "Max auth tries down to three, from a default of six" | covered |
| I43 ufw | Locking | "U F W, uncomplicated firewall" | covered |
| I44 fail2ban, PerSourcePenalties 9.8+, less needed on Tailscale | Locking | "called per source penalties" | covered |
| I45 unattended-upgrades | Locking | "Cheap insurance against the next regreSSHion" | covered |
| I46 one public IPv4, 32-bit, ~4.3 billion | NAT | "about four point three billion" | covered |
| I47 private addresses | NAT | "Every home on earth reuses the same ones" | covered |
| I48 NAT term | NAT | "network address translation" | covered |
| F4 figure 004 note, reply in, cafe dropped | NAT | "So which of the five devices in the house is it even for" | covered |
| I49 not a rule you set; B wrong model | NAT | "it's not a rule anyone set" | covered |
| I50 CGNAT, 100.64 range, check vs what's-my-IP | NAT | "carrier-grade N A T, C G N A T" | covered |
| I51 port forward | Port forwarding | "It turns the router's accidental protection off" | covered |
| I52 bots scan, minutes to hours, invalid user count, version from hello | Port forwarding | "within minutes to hours" | covered |
| I53 pre-login bugs, CGNAT, changing address | Port forwarding | "breaks whenever your I S P changes your public address" | covered |
| I54 WireGuard term | WireGuard | "puts it inside a U D P packet" | covered |
| I55 peers list, encrypt whole packet, UDP term, hand to kernel | WireGuard | "this public key, reachable at this IP address and port" | covered |
| I56 tailscale0/utun; sshd unchanged | WireGuard | "S S H D doesn't even know Tailscale exists" | covered |
| I57 silent to strangers | WireGuard | "Not even "go away"" | covered |
| I58 overhead 16+16, pad to 16, 28 outer | WireGuard | "twenty-eight bytes on I P v four" | covered |
| I59 cheap handshakes | WireGuard | "re-agreed every couple of minutes" | covered |
| I60 what WireGuard doesn't do | WireGuard | "But notice what WireGuard doesn't do" | covered |
| I61 control vs data plane, coordination server | Planes | "The control plane is the part that decides" | covered |
| I62 tailscaled startup, map, pushed changes | Planes | "a new map gets pushed out" | covered |
| I63 data plane direct; can Tailscale read it | Planes | "The traffic's encrypted with private keys it never saw" | covered |
| I64 phone book trust, Tailnet Lock | Planes | "Tailnet Lock" | covered |
| I65 both send out at once | Hole punching | "Get both sides to send a packet out to each other" | covered |
| I66 STUN | Hole punching | "STUN is a server that answers exactly one question" | covered |
| F5 figure 005 steps easy case, keepalives 30 s to minutes | Hole punching | "between thirty seconds and a few minutes" | covered |
| F5b hard toggle steps | Hole punching | "It leaves from some new port" | covered |
| I67 symmetric NAT, corporate/carrier, Anderson, both hard impossible | Hole punching | "a direct path might just be impossible" | covered |
| PR2 predict MappingVariesByDestIP; Mac said false | Hole punching | "On my Mac at home it said false" | covered |
| I68 DERP term, HTTPS 443, route by key, outgoing both sides | DERP | "designated encrypted relay for packets" | covered |
| I69 DERP sees metadata; detour; bandwidth | DERP | "so a big rsync is slower" | covered |
| I70 starts on DERP, upgrades; B wrong model | DERP | "Tailscale actually starts every new connection on DERP" | covered |
| F6 figure 006 three ways home | DERP | "Mode one, port forward" | covered |
| PR3 predict double encryption | DERP | "encrypted twice" | covered |
| I71 100.x from CGNAT range, IPv6 | Toolkit | "unlikely to collide with your home network" | covered |
| I72 MagicDNS | Toolkit | "Then MagicDNS" | covered |
| I73 ACLs/grants | Toolkit | "newer docs call the rules "grants"" | covered |
| I74 Tailscale SSH trade | Toolkit | "No authorized keys to manage" | covered |
| I75 key expiry 180 days | Toolkit | "a hundred eighty days by default" | covered |
| B0 second session safety | Build It | "open a second SSH session to the server and leave it open" | covered |
| B1 t0 look | Build It | "First you just look at what you've got" | covered |
| B2 t1 keys only, KEY OK, read authorized_keys, fingerprint check | Build It | "Every line is a key that can log in as you" | covered |
| B3 t2 drop-in sorts first, sshd -t, reload, Permission denied (publickey), agent review | Build It | ""permission denied, public key"" | covered |
| B4 t3 ufw shape, 41641, read rules aloud, third session, fail2ban, upgrades, backend systemd | Build It | "print the rules and read them out loud" | covered |
| B5 t4 ssh config, multiplexing term, two authentications | Build It | "Multiplexing means reusing one already-logged-in SSH connection" | covered |
| B6 t5 Jupyter -L, LocalForward, lsof, direct fails, tested 200 | Build It | "it answered two hundred" | covered |
| B7 t6 tcpdump two windows, relay case, chaff | Build It | "Same moment, same number of packets. Different disguise" | covered |
| B8 t7 serve site, bind trap, serve/funnel | Build It | "That's a public door again" | covered |
| B9 DoneWhen | Build It | "And you're done when" | covered |
| M1 netcheck numbers, Seattle 8.3, SF ~32, hotspot | Measure | "Seattle at eight point three milliseconds" | covered |
| M2 tailscale ping expectations | Measure | "Across a city, often five to twenty" | covered |
| M3 connect time 42/10, 6-8 RTT, ~180, DERP >300 | Measure | "forty-two plus seven times twenty" | covered |
| M4 packet length formula, 28, MTU 1280 | Measure | "twelve eighty bytes" | covered |
| M5 measure table rows | Measure | "covered by M1-M4" | covered |
| K1 lock yourself out | Break It | "add "allow users nobody"" | covered |
| K2 overridden by 05 file | Break It | "zero five sorts first, and first wins" | covered |
| K3 force relay, 500 MB rsync | Break It | "five hundred megabyte file" | covered |
| K4 change host key | Break It | "you've now seen that message for an innocent reason" | covered |
| E1 ssh home walkthrough | End to end | "You type ssh home" | covered |
| E2 keys vs passwords; host key vs MITM | Keys/Step by step | "nothing reusable" | covered |
| E3 NAT and port forward risk | NAT/Port forwarding | "So can everyone else" | covered |
| E4 Tailscale through two NATs, what servers see | Hole punching/DERP | "Which device keys are talking to which" | covered |
| E5 scale to 200 | Scaling | "nineteen thousand nine hundred pairs" | covered |
| G1 go deeper | End | "are the two best things to read" | covered |
| C1 connections | End | "known hosts standing in for certificates" | covered |

All 126 outline items covered; no MISSING.

Numbers checked against the lesson. Derived in the script, not written in the lesson: two to the hundred twenty-eighth guesses (meaning of 128 bits); multiplexed connect over a twenty millisecond path "thirty-ish" (one round trip plus ten); DERP connect "seven times forty is two eighty, plus forty-two" (lesson says only "cross 300 ms"); packet-length worked example (inner 100 bytes -> 112 -> 144); 200 devices -> nineteen thousand nine hundred pairs.
