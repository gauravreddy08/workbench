# Coverage: tls

Lesson src/lessons/tls.mdx vs podcast/scripts/tls.md. Item IDs match podcast/outlines/tls.md.
"Fixed" = was MISSING or wrong in the first draft and has been added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 Prereqs: round trip, TCP setup, DNS/TCP/TLS/HTTP order | Predict round trips; Close | "Quick reminder of what a round trip is"; "D N S lookup, then the T C P handshake, then this" | covered |
| P1 Café scene, everyone can copy packets | Problem | "you're at a café... every one of those can copy every packet" | covered |
| P2 Can't send the key; never met | Problem | B: "Then you encrypt the key before you send it." A: "With what key?" | covered |
| P3 Believed impossible; hundreds a day; one round trip | Problem | "people actually believed it was impossible... in about one network round trip" | covered |
| P4 Errors: verify failed, expired, mismatch, self-signed | Problem | "\"Certificate verify failed.\" \"Certificate has expired.\" \"Hostname mismatch.\"" | covered |
| P5 Two problems: secrecy and identity | Problem | "The first is secrecy... The second is identity" | covered |
| O1 Pre-1970s shared secret delivered in advance | Origin | "A codebook. A one-time pad carried by a courier" | covered |
| O2 Diffie, Hellman, Merkle, Nov 1976, signatures proposed | Origin | "in November nineteen seventy-six... building on an idea from Ralph Merkle" | covered |
| O3 GCHQ, classified until 1997 | Origin | "British intelligence, at G C H Q... until nineteen ninety-seven" | covered |
| O4 RSA 1977 MIT | Origin | "nineteen seventy-seven, three people at MIT" | covered |
| O5 Netscape, Elgamal, SSL 2.0/3.0, IETF, TLS 1.0 1999, 1.3 2018 | Origin | "SSL two point oh came out in ninety-five... TLS one point three, finished in twenty eighteen" | covered |
| I1 Symmetric encryption | Symmetric | "Same key on both ends, one key locks and unlocks" | covered |
| I2 AES, 2001 competition, Rijndael, 16-byte blocks, 128/256, CPU instructions | Symmetric | "It was picked by a public competition in two thousand one" | covered |
| I3 GCM, 16-byte tag | Symmetric | "G C M, Galois Counter Mode, which does two jobs at once" | covered |
| I4 Four inputs incl. extra data; ciphertext plus tag | Symmetric | "There's also an optional fourth input, some extra data" | covered |
| I5 Nonce, 12 bytes, public, never repeat | Symmetric | "Nonce stands for \"number used once\"" | covered |
| I6 Authentication tag refuses instead of garbage | Symmetric | "It doesn't hand you garbage, it just says no" | covered |
| F1 Figure 001 boxes, same length, sent with nonce | Symmetric | "So picture it as boxes. On the left, three inputs" | covered |
| I7 ~7 GB/s one core; never why HTTPS is slow | Symmetric | B: "isn't this the part that makes HTTPS slow?" A: "about seven gigabytes per second" | covered |
| I8 Nonce reuse: stream XOR, plaintexts XORed | Symmetric | "XOR is just \"flip every bit of the message where the stream has a one\"" | covered |
| I9 All of TLS = how do both ends get the key | Symmetric | "How do both ends end up with the same key?" | covered |
| I10 Paint, mixing easy un-mixing hard | Paint | "mixing is easy, and un-mixing is practically impossible" | covered |
| I11 Five paint steps | Paint | "Step one, in public... step five" | covered |
| I12 Eve mixes pots: two parts green, wrong shade | Paint | "two parts green, one part orange, one part blue" | covered |
| I13 Exponentiation mod a prime | Numbers | "raising a number to a power, but on a clock" | covered |
| I14 Modulo, 17 mod 5 = 2, clock | Numbers | "seventeen mod five is two" | covered |
| I15 p=23, g=5, generator definition | Numbers | "you land on every number from one to twenty-two" | covered |
| I16 a=6, b=15, 15,625 = 679x23+8, A=8, B=19, key 2 | Numbers | "fifteen thousand, six hundred twenty-five... six hundred seventy-nine times, with eight left over" | covered |
| I17 Why they agree: order of powers | Numbers | "the order you raise powers in doesn't matter" | covered |
| I18 Discrete log; 22 tries; 600 digits | Numbers | "That's called the discrete logarithm problem"; "six hundred digits long" | covered |
| PR1 Predict: A x B adds exponents; 14 not 2 | Predict Eve multiplies | "Multiplying the public numbers adds the secrets"; "Eight times nineteen mod twenty-three is fourteen" | covered |
| F2 Figure 002: columns, steps, sliders, brute force, 2^31-1, seconds, doubling, 2^128, 10^13 years | Predict Eve multiplies | "Three columns. Alice on the left, Bob on the right, and Eve in the middle"; "about ten trillion years" | covered |
| I19 Bit doubling, few hundred million/s, cleverer attacks, 2048 bits, ~15 ms | Predict Eve multiplies | "related to the methods used for factoring"; "around fifteen milliseconds in Python" | covered |
| I20 Elliptic curve definition, point addition | Elliptic curves | "there's a way to \"add\" two points on the curve" | covered |
| I21 Add G a times, doubling trick, curve discrete log | Elliptic curves | "there's a doubling trick" | covered |
| I22 255-bit ~ 3000-bit prime | Elliptic curves | "A two hundred fifty-five bit curve gives you roughly the security of a three thousand bit prime" | covered |
| I23 Curve25519, Bernstein, X25519, 32 bytes, hard to misuse | Elliptic curves | "designed by Daniel Bernstein" | covered |
| I24 ~50 µs, few hundred times faster | Elliptic curves | "about fifty microseconds"; "A few hundred times faster" | covered |
| I25 X25519MLKEM768, NIST 2024, lattices, quantum, either holds, ~1.2 KB | Elliptic curves | "NIST, the US standards agency, standardised in twenty twenty-four"; "about one point two kilobytes" | covered |
| I26 DH beats Eve not Mallory | MITM | "Diffie-Hellman beats Eve... Mallory can change packets" | covered |
| PR2 Predict MITM: two exchanges, relay, authentication missing | MITM | "She runs two exchanges"; "Not better math. Authentication." | covered |
| F3 Figure 003: three boxes, two keys, decrypt/read/re-encrypt/forward | MITM | "Picture three boxes in a row" | covered |
| I27 Digital signature | Signatures | "A short value computed from a message and a private key" | covered |
| I28 Public-key / asymmetric | Signatures | "It's also called asymmetric cryptography" | covered |
| I29 Sign and verify operations | Signatures | "Sign: you take your private key and a message" | covered |
| I30 Wax seal, covers content | Signatures | "Only you have the signet ring" | covered |
| I31 RSA, ECDSA (P-256, 64-72 bytes), Ed25519 | Signatures | "about sixty-four to seventy-two bytes. And Ed twenty-five five-nineteen" | covered |
| I32 13/40 µs, 330/18 µs, tiny vs round trip | Signatures | "about thirteen microseconds to make and forty to check" | covered |
| I33 Problem moves: how do you know server's public key | Signatures | B: "If it just sends me its public key, Mallory sends me hers." | covered |
| I34 Passport analogy | Certificates | "the same way passports solve" | covered |
| I35 Certificate, X.509, SAN, dates, CA signature | Certificates | "in a format called X five oh nine"; "subject alternative name" | covered |
| I36 CA definition and examples | Certificates | "Let's Encrypt, DigiCert, Sectigo, Google Trust Services" | covered |
| I37 Root store, self-signed roots, vendors, Mozilla, 187 | Certificates | "a hundred eighty-seven certificates" | covered |
| I38 Root offline, intermediate, leaf, chain of trust | Certificates | "The root's private key is kept offline, in a vault" | covered |
| F4 Figure 004 github chain, names, dates, cross-signed, root not sent | Certificates | "Picture four boxes stacked up"; "It does not send the top one" | covered |
| I39 ACME, Let's Encrypt (ISRG nonprofit, 2015), token / DNS, 90 days, shorter coming | Certificates | "the protocol's called ACME"; "last ninety days" | covered |
| I40 DigiNotar 2011; Certificate Transparency; names published | Certificates | "DigiNotar, a Dutch C A, was hacked in twenty eleven"; "every name you get a public certificate for is published" | covered |
| I41 Handshake pieces incl. ChaCha20 | Handshake | "the handshake is honestly just choreography" | covered |
| I42 Hash, SHA-256, 32 bytes | Handshake | "A hash is a function that turns any input into a short, fixed-size fingerprint" | covered |
| I43 HMAC | Handshake | "an H mac, which is a hash mixed with a secret key" | covered |
| I44 KDF/HKDF, never raw DH, keys per direction and phase | Handshake | "TLS never uses the raw shared number as a key" | covered |
| I45 Ordering, guess, HelloRetryRequest | Handshake | "One point three just guesses"; "Hello Retry Request" | covered |
| PR3 Predict RTT: 1 RTT to send, 2 to response, ~3 cold; 31/33 ms | Predict round trips | B guesses "three or four round trips"; "about thirty-one milliseconds... about thirty-three on top" | covered |
| F5 Figure 005 eight messages, what Eve reads, colours | Handshake step by step | "Message one, the client hello"... "message eight, the response" | covered |
| I46 Everything after ServerHello encrypted; cert clear in 1.2 | Handshake step by step | "Including the certificate. Which is new." | covered |
| I47 CertificateVerify anti-Mallory | Handshake step by step | B: "So that's where Mallory dies." | covered |
| I48 Finished, downgrade | Handshake step by step | "It catches downgrade tricks" | covered |
| I49 TLS 1.2 camouflage, ChangeCipherSpec | Handshake step by step | "It's camouflage" | covered |
| I50 Session ticket, PSK | Resumption | "That's called a pre-shared key, a P S K" | covered |
| I51 0-RTT, CDNs, figure return visit, fresh DH for rest | Resumption | "That's zero R T T"; "the new handshake keys mix the P S K with a fresh exchange" | covered |
| I52 Replay, idempotent, refuse or limit | Resumption | "That's a replay attack"; "Idempotent means doing it twice has the same effect" | covered |
| I53 Leak next year question | Forward secrecy | "If the server's long-term private key leaks next year" | covered |
| I54 RSA key exchange, years of recordings | Forward secrecy | "called RSA key exchange" | covered |
| I55 Ephemeral keys, ECDHE, sign only, forward secrecy / PFS | Forward secrecy | "the E on the end is \"ephemeral\""; "That property is called forward secrecy" | covered |
| I56 Ticket key and 0-RTT footnotes | Forward secrecy | "Session ticket keys weaken it" | covered |
| I57 "HTTPS encrypts everything" wrong | What HTTPS hides | B: "the café Wi-Fi basically sees nothing, right?" | covered |
| F6 Figure 006 layers, visible vs hidden list | What HTTPS hides | "Picture one packet of your request"; "What's hidden: the path and query string" | covered |
| I58 IPs | What HTTPS hides | "Routers need them to deliver the packet" | covered |
| I59 SNI, ECH | What HTTPS hides | "server name indication"; "E C H, encrypted client hello" | covered |
| I60 DNS plaintext unless DoH/DoT | What HTTPS hides | "unless you use D N S over HTTPS or over TLS" | covered |
| I61 Sizes, timing, voice calls, LLM token lengths, padding | What HTTPS hides | "the sizes of those records can leak how long each token is" | covered |
| B0 Setup, LibreSSL, OpenSSL 3.5+, 3.6, Wireshark | Build: setup | "Mac OS ships a different library called LibreSSL" | covered |
| B1 dh_toy, three-arg pow, 8/19/2, g=2 gives 11 values | Build: setup | "It only ever lands on eleven different values" | covered |
| B2 dh_real, ffdhe2048, Fs, g=2, secrets not random, 10-20 ms / 15 ms, X25519 32 bytes, deprecation | Build: setup | "starts with a long run of Fs"; "Everyone moved to curves." | covered |
| B3 seal: warning, HKDF labels, 36 bytes, InvalidTag, header, review question | Build: encrypt | "Never roll your own crypto in production"; "check the output's thirty-six bytes" | covered |
| B4 s_client fields; -msg message list; groups per host | Build: read a handshake | "lines with \"depth\" in them"; "both of those negotiated the hybrid" | covered |
| B5 chain.py, verify_directly_issued_by, roots, dates, SAN, extras, result, missing intermediate error | Build: verify chain | "unable to get local issuer certificate" | covered |
| B6 SSLKEYLOGFILE, capture, Python honours, system curl didn't, SNI visible, decrypt, delete keys | Build: decrypt | "S S L key log file"; "delete it when you're done" | covered |
| B7 Tailscale cert, ACME DNS, MagicDNS/HTTPS, CT warning, serve, stdlib server, curl no -k, 90-day schedule | Build: home server | "Tailscale controls the D N S for ts dot net"; "put the cert command on a schedule" | covered |
| B8 Done-when outcomes | Build (each task) | folded into each task's "you should see" | covered |
| M1 Measure table numbers incl. 3.9 KB / 1.5 KB | Measure | "read about three point nine kilobytes and wrote about one point five" | covered |
| M2 hs_time script and three hosts' numbers | Measure | "Google was about four to five milliseconds for T C P and fourteen to twenty-four for TLS" | covered |
| M3 Far server ≈ one extra RTT; 1.2 would show two | Measure | "A TLS one point two server would show about two" | covered |
| M4 Near server fixed costs | Measure | B: "Why is Google so lopsided" | covered |
| M5 Crypto well under a ms; reuse and 0-RTT matter | Measure | "the network is basically the whole cost" | covered |
| M6 7 GB/s vs 10 Gbit/s link | Measure | "divide by eight, and that's one and a quarter gigabytes a second" | covered |
| M7 15 ms vs 50 µs, few hundred times, curves | Measure | "Fifteen milliseconds versus fifty microseconds" | covered |
| K1 Nonce reuse, counter nonces | Break It | "it's why TLS builds its nonces from a counter" | covered |
| K2 Wrong hostname, code 62, Mallory's own cert | Break It | "verify return code sixty-two, hostname mismatch" | covered |
| K3 0-RTT replay, accepted/rejected, no anti-replay | Break It | "\"early data was accepted\"... \"early data was rejected\"" | covered |
| K4 Missing intermediate, browsers cache, curl/Python fail | Break It | B: "Works in Chrome, breaks in requests." | covered |
| E1 DH explain-back | Numbers, Predict, Close | B's restatement in close; "a plus b" vs "a times b" | covered |
| E2 Why certificates | MITM, Certificates, Close | A's closing correction: "The certificate's job is identity" | covered |
| E3 Handshake walk, why one RTT, 0-RTT | Handshake, Resumption | "the server doesn't wait. It sends its whole batch in one go" | covered |
| E4 Forward secrecy and what breaks it | Forward secrecy | "Two footnotes, though." | covered |
| E5 50k handshakes/s scaling | Scaling | "roughly twenty-five times more server CPU"; "terminate TLS on a tier you can scale out sideways" | covered |
| G1 Go Deeper | Close | "the original Diffie and Hellman paper"; "The Illustrated TLS one point three Connection" | covered |
| C1 Connections | Close | "Count the round trips from each and you can predict a cold request's latency" | covered |

Numbers checked against the lesson: all match. Derived (not written in the lesson): a few-kilobyte request
encrypts in about a millionth of a second at 7 GB/s; 50,000 x 13 µs ≈ two thirds of a CPU-second per second;
50,000 x 330 µs ≈ sixteen and a half CPU-seconds per second.

Fixed in naturalness pass: removed planted B questions ("where do you even start", "what's the catch",
"where does the time go"), removed "Exactly that" reaction, removed two claims not in the lesson (a
cross-country round-trip figure, revocation), spelled hostnames for the ear.
