# Outline: tls

Source: src/lessons/tls.mdx. Curriculum entry: "How does HTTPS keep secrets?" Question: how do two
machines that have never met agree on a secret over a public network? Why: certificates, keys and
handshakes are behind every "SSL error" you will ever debug.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).

Diagnostic gaps touched: Numbers (biggest gap). The episode keeps putting microseconds of crypto next
to tens of milliseconds of round trip, and has B voice "encryption is what makes HTTPS slow" so A can
correct it. Prerequisite ideas re-explained inline: a round trip (one message there and the answer back),
TCP's one-round-trip connection setup, the DNS lookup, the order DNS, TCP, TLS, HTTP.

## Today / prerequisites

- T1 Today bullets skipped as a list; each is an item below. Prereqs (what-happens-url places TLS after DNS and TCP, before HTTP; tcp-vs-udp explains round trips) -> A re-explains round trip and TCP setup briefly where the timing Predict comes up.

## The Problem

- P1 Café scene: laptop on café Wi-Fi, calling model endpoint with API key in header; router, ISP, backbones, load balancer, all can copy packets; person at next table with a free program and Wi-Fi card. -> A opens on it.
- P2 Encrypt it: but server needs the key; can't send it past the same people; never met, no shared secret. -> A; B voices "just send the key encrypted" / "just send it once" and A shows the loop.
- P3 Believed impossible; browser does it hundreds of times a day, in about one round trip. -> A.
- P4 You only notice failures: certificate verify failed, certificate has expired, hostname mismatch, self-signed home server cert every tool refuses; each is a specific step; by the end you'll know which. -> A, as the promise of the episode.
- P5 Two problems: secrecy (key exchange) and identity (signatures and certificates). -> A, signposted.

## Origin

- O1 Before mid-1970s encryption needed a shared secret delivered in advance: codebook, one-time pad by courier, key loaded into a machine; militaries and banks spent fortunes moving keys. -> A, story.
- O2 Whit Diffie (restless amateur) and Martin Hellman (Stanford professor), building on Ralph Merkle's idea, "New Directions in Cryptography", November 1976: shared secret in public, no prior contact; also proposed digital signatures without a practical way. -> A.
- O3 GCHQ had similar ideas a few years earlier, classified until 1997. -> A aside; B reacts.
- O4 1977 Rivest, Shamir, Adleman at MIT: RSA, encrypt and sign with a public key. -> A.
- O5 Nobody used it much until shopping carts: 1994-95 Netscape, Taher Elgamal, SSL for credit card numbers; SSL 2.0 (1995), 3.0 (1996) serious flaws; IETF took over, renamed TLS, 1.0 in 1999; TLS 1.3 finished 2018, near-total redesign. -> A, quick timeline.

## The Idea: Part one, symmetric encryption

- I1 If you share a key already (16 or 32 random bytes), symmetric encryption: one key locks and unlocks; useless until both have it. -> A.
- I2 AES: Advanced Encryption Standard, public competition 2001, design called Rijndael; scrambles 16-byte blocks under 128- or 256-bit key; CPUs have built-in instructions. -> A, inline.
- I3 GCM mode (Galois/Counter Mode): encrypts and attaches 16-byte tag so receiver detects any change. -> A.
- I4 Four inputs: key, nonce, message, optional extra data protected but not hidden (like a header). Output: ciphertext plus 16-byte tag. -> A.
- I5 Nonce: number used once, 12 bytes, different for every message under same key; not secret, never repeated. -> A, word explained.
- I6 Authentication tag: short checksum with the key; one bit changed and decryption refuses instead of returning garbage. -> A.
- F1 Figure 001: key (32 bytes, secret), nonce (12 bytes, public), message "meet me at 9" into AES-GCM; out ciphertext same length plus 16-byte tag; sent with nonce; about 7 GB/s on one core. -> A describes as boxes left to right, over the phone.
- I7 It's fast: about 7 GB a second on one core on the Mac; encryption is never why HTTPS feels slow. -> B voices "isn't encryption the slow part?" and A corrects with the number.
- I8 Nonce must never repeat: GCM makes pseudo-random byte stream from key and nonce, XORs onto message; reuse, and XOR of the two ciphertexts = XOR of two plaintexts; Break It. -> A, XOR explained in words ("flip the bits where the stream has ones").
- I9 All of TLS reduces to: how do both ends get the same key? -> A signpost.

## The Idea: Part two, paint

- I10 Paint analogy (standard): Alice, Bob, Eve watches everything; mixing easy, un-mixing practically impossible. -> A.
- I11 Five steps: agree in public on green; secretly pick orange and blue; mix secret into common green; swap pots in public; add own secret to received pot; both get green+orange+blue in same proportions. -> A walks it, B follows.
- I12 Eve has green, green+orange, green+blue; mixing pots gives two parts green, one orange, one blue: wrong shade; needs to un-mix. -> B tries "Eve just mixes the two pots" and A explains wrong proportions.

## The Idea: The same trick with numbers

- I13 Need an operation easy one way, very hard to undo: exponentiation mod a prime. -> A.
- I14 Term modulo: keep only remainder; seventeen mod five is two; wraps like a clock with p hours. -> A, clock image.
- I15 p = 23, generator g = 5, public like the green paint. Term generator: powers of g land on every number from 1 to p minus 1 before repeating, so the secret can be anything in that range. -> A.
- I16 Worked example: a = 6, b = 15; A = 5 to the 6th mod 23: 15,625 = 679 times 23 plus 8, so A = 8; B = 19; send 8 and 19 in the clear; Alice 19 to the 6th mod 23 = 2, Bob 8 to the 15th mod 23 = 2. -> A says it slowly in words, B checks the 15,625 step.
- I17 Why they agree: Alice raised Bob's number to her secret, Bob raised hers to his; both are g raised to a times b; order of powers doesn't matter, like paint order. -> A in words, no symbols.
- I18 Eve knows 23, 5, 8, 19; needs "5 to what power, mod 23, gives 8?": discrete logarithm. Term: like ordinary log but on a wrapping clock, scrambles pattern, no "count the digits" shortcut. With 23, try all 22. With a prime 600 digits long, can't. -> A.
- PR1 Predict eve-mult: why doesn't multiplying A and B give the key? Multiplying adds the secret exponents (g to a plus b) but key is g to a times b; need one secret to multiply; paint problem exactly; 8 times 19 mod 23 = 14, not 2. -> A asks; B guesses she could just multiply; A reveals with the numbers.
- F2 Figure 002 interactive: three columns, Alice, Eve in middle (only what crossed the wire), Bob; paint swatch and arithmetic in each cell; five steps; drag secrets; Eve's brute force; switch to bigger prime (2 to the 31 minus 1, about 2 billion, generator 7, random secrets); with 23 instant, 31-bit takes seconds; each extra bit doubles. Figure text: real TLS about 2 to the 128 work for X25519, 2 to the 112 for 2048-bit primes; at a billion billion tries a second, 2 to the 128 takes about 10 to the 13 years. -> A describes what you'd see clicking through and running Eve.
- I19 Each bit doubles the search; browser JavaScript gets a few hundred million guesses a second; real attacks are much cleverer than trying every exponent (related to factoring methods), so sizes used are 2048 bits for the mod-a-prime version; timing one such exponentiation in Python about 15 ms. -> A.

## The Idea: Elliptic curves

- I20 Modern TLS almost never uses mod-a-prime DH; same idea on elliptic curve. Term: points satisfying a curve equation, arithmetic mod a prime, a way to "add" two points to get a third. -> A, no equation read; "a particular curve, with arithmetic done on a clock".
- I21 Instead of multiply g by itself a times, add point G to itself a times; fast forward (doubling trick like square-and-multiply); backward is the elliptic-curve discrete log. -> A; "doubling trick" explained as doubling repeatedly instead of adding one at a time.
- I22 Best attacks far weaker, so numbers far smaller: 255-bit curve about the security of a 3000-bit prime. -> A.
- I23 Curve25519 by Daniel Bernstein; DH on it is X25519; each secret 32 random bytes, public value 32 bytes; fast, designed hard to implement wrongly. -> A.
- I24 Key pair plus exchange about 50 microseconds on the Mac, a few hundred times faster than 2048-bit prime version. -> A, number next to the 15 ms.
- I25 X25519MLKEM768 in openssl output: big sites send X25519 share and an ML-KEM share and combine; ML-KEM standardised by NIST 2024, lattice problems, believed to resist future quantum computers which would break both kinds of discrete log; if either holds, key is safe; cost: first message bigger, ML-KEM share about 1.2 KB. -> A; B asks what the weird name in the output means (real stop: a word went past).

## The Idea: Man in the middle

- I26 DH beats Eve, who only listens; does nothing against Mallory, who can change packets. -> A.
- PR2 Predict mitm: on Mallory's café Wi-Fi, she controls router; how does she read traffic without breaking math? Two exchanges: drop your share, send server hers; drop server's, send you hers; two keys; decrypt, read, re-encrypt, forward; both exchanges perfect DH; nothing tells you the number came from the server; missing piece: authentication. -> A asks; B works it out partway ("she pretends to be the server"), A completes it.
- F3 Figure 003: You (secret a), Mallory (secret m), Server (secret b); arrows A and M on left, M and B on right; key one shared you-Mallory, key two server-Mallory; "decrypt, read, re-encrypt, forward"; fix is not better math but checking the server's share came from the server. -> A, described in words.

## The Idea: Signatures

- I27 Digital signature: short value from message and private key; anyone with public key checks; only private key holder produces; one bit change fails. -> A.
- I28 Public-key cryptography: key pair, private you keep, public you hand out; also called asymmetric because keys do different jobs. -> A.
- I29 Two operations: sign (private key, message gives signature) and verify (public key, message, signature gives yes or no). -> A, said as plain sentences.
- I30 Wax seal analogy: only you have the signet ring, anyone recognises it; unlike wax, it covers the content, can't move it to another message. -> A.
- I31 Schemes: RSA (1977), ECDSA (elliptic curve, usually P-256 curve, signatures 64 to 72 bytes), Ed25519. -> A.
- I32 Numbers: ECDSA P-256 sign about 13 microseconds, verify about 40; RSA-2048 sign about 330, verify about 18; all tiny next to a round trip. -> A, with comparison to a 30 ms round trip.
- I33 If server signs its DH share and you already know its public key, Mallory can't substitute. Moves the problem: how do you know the server's public key? If server sends it, Mallory sends hers. -> B raises this objection naturally.

## The Idea: Certificates

- I34 Passport analogy: you don't know the stranger, you trust a government that vouches. -> A.
- I35 Certificate (X.509 format): server's public key, names valid for (Subject Alternative Name, SAN: list of hostnames, e.g. github.com and www.github.com, client checks the hostname is on it), validity dates, signature from a CA. -> A.
- I36 Certificate authority: organisation (Let's Encrypt, DigiCert, Sectigo, Google Trust Services) checks requester controls the domain, signs; CA. -> A.
- I37 Root store: hundred-odd organisations, each a self-signed root certificate; trusted not by signature but because OS/browser vendor put it in the list; macOS Keychain, Firefox, Chrome, Linux, Homebrew OpenSSL each have their own, mostly derived from Mozilla's; Homebrew's OpenSSL has 187 certs. -> B asks "who signs the root?" and A answers.
- I38 Roots rarely sign server certs; root keys offline in vaults; root signs intermediate, intermediate signs leaf; chain of trust: each signed by next one's private key, verify every link and you've connected server's key to something trusted. -> A.
- F4 Figure 004: real github.com chain, 15 Oct 2026: leaf CN github.com, SAN github.com and www.github.com, P-256 key, valid Sep 1 to Nov 29 2026; signed by Sectigo Public Server Auth CA DV E36 (intermediate); signed by Sectigo Public Server Auth Root E46 (intermediate, cross-signed); signed by USERTrust ECC Certification Authority (root, self-signed, already in root store, not sent). Checks: signature, dates, usage on each; hostname in SAN on leaf. -> A describes as a stack of four boxes, bottom up.
- I39 How a CA checks control: ACME (Automatic Certificate Management Environment): your server's client (certbot, Caddy, Traefik) asks; CA says put this random token at a well-known path on your site, or in a DNS TXT record; checks from the internet; signs. Let's Encrypt: free, automated, nonprofit ISRG, launched 2015, issues most of the web's certs. 90-day certs, short on purpose so renewal is automated and stolen key useful only for a while; industry moving to shorter lifetimes (check current CA/Browser Forum rules). -> A.
- I40 CAs can be wrong: DigiNotar (Dutch) hacked 2011, issued fake Google certs, removed by browsers, went bankrupt. Certificate Transparency: public append-only logs of every issued cert; browsers reject ones not logged; mis-issued cert visible; every name you get a public cert for is published. -> B asks "what if the CA is the bad guy?"; A answers.

## The Idea: TLS 1.3 handshake

- I41 Pieces: X25519 for the key; certificate chain for server's public key; signature over the handshake so Mallory can't swap; hash of whole conversation and HMAC under new keys so nobody edits earlier messages; AES-GCM (or ChaCha20-Poly1305 on chips without AES instructions) after. -> A, as choreography.
- I42 Term hash: any input to short fixed fingerprint (32 bytes for SHA-256); same in same out; any change totally different; can't run backwards or find two inputs with same fingerprint. -> A, inline.
- I43 Term HMAC: hash mixed with secret key, only key holder can produce or check; proves not altered. -> A.
- I44 KDF / HKDF: never use raw DH number as key; feed it plus hash of messages so far through HKDF (built from HMAC) to get separate keys for each direction and each phase. -> A.
- I45 Ordering: older TLS spent one round trip agreeing which algorithms, another doing exchange; 1.3 guesses, client sends DH share in first message for the group it thinks server picks (almost always X25519 or hybrid); server answers with its share, switches to encryption; wrong guess: HelloRetryRequest, one extra round trip, rare. -> A; B "what if it guesses wrong?"
- PR3 Predict rtt: round trip to letsencrypt.org about 30 ms; TCP costs one round trip; after TCP is up, when can client send first encrypted request, and when does response come? About one round trip (30 ms) to send, two (60 ms) to response; ClientHello out, server's whole flight back, client sends Finished with its request; plus TCP, a cold HTTPS request costs about three round trips before first response byte; measured TCP about 31 ms, TLS about 33 ms on top. -> A asks; B guesses wrong (counts more, e.g. separate round trips per message), A corrects. Re-explain round trip and TCP setup here.
- F5 Figure 005 interactive: client and server timelines; first visit eight messages: ClientHello (key share, SNI), ServerHello (key share), then encrypted EncryptedExtensions (e.g. ALPN, h2 or http/1.1), Certificate (leaf + intermediates, a few KB of ciphertext), CertificateVerify (signature over transcript), Finished (HMAC over transcript), then client Finished plus GET, then 200 OK; bracket "one round trip to first request"; panel says what client has, server has, Eve reads. Ink arrows plaintext, blue encrypted under handshake keys, thick blue app data. Return visit dashed early data. -> A walks it like a phone call, message by message, with what Eve sees.
- I46 Everything after ServerHello encrypted including certificate; in TLS 1.2 certificate in the clear. -> A.
- I47 CertificateVerify is the anti-Mallory step: server signs hash of transcript (every byte of every message so far, including both DH shares); swapped share means mismatch. -> A, ties back to Mallory.
- I48 Finished: HMAC over transcript under key only two ends have; catches downgrade tricks like a middlebox deleting strong options from ClientHello. -> A.
- I49 Camouflage: record headers say TLS 1.2, ChangeCipherSpec message that does nothing; old firewalls dropped anything not looking like 1.2; real version negotiated in an extension. -> B, puzzled by openssl output; A explains.

## The Idea: Resumption and 0-RTT

- I50 Session ticket: blob server gives client, containing (encrypted under server-only key) a secret from this session; later lets client skip cert and signature. PSK: pre-shared key, from previous session via ticket; knowing the PSK proves the server is the one you met. -> A.
- I51 0-RTT (early data): client sends HTTP request in first flight encrypted with key from PSK alone; saves a full round trip; big CDNs offer it. Figure return visit: response after one round trip instead of two; no Certificate or CertificateVerify; new handshake keys mix PSK and fresh DH so rest gets forward secrecy, early data doesn't. -> A.
- I52 Replay: early data key depends only on the old ticket, nothing fresh from server; Mallory records first flight and sends again and again; server decrypts and acts each time; replay attack: attacker doesn't need to read it. "GET index" twice harmless; "POST transfer amount 100" twice not. Rule: only idempotent requests in 0-RTT; servers refuse early data or limit replays (single-use tickets, time windows). -> B asks "but she can't read it, so what?"; A explains. Idempotent explained in plain words.

## The Idea: Forward secrecy

- I53 Question: if server's long-term private key leaks next year, what can attacker read? -> A.
- I54 Old way (pre-1.3, RSA key exchange): client made up session key, encrypted with server's RSA public key, sent it; record traffic + steal key later = decrypt every recorded conversation, going back years; intelligence agencies record a lot. -> A.
- I55 TLS 1.3 removed that mode; every handshake uses ephemeral keys (fresh for one connection, thrown away; the E in ECDHE); certificate key only signs; steal it and you can impersonate from then on but can't decrypt yesterday's traffic because DH secrets no longer exist. Forward secrecy (perfect forward secrecy, PFS). -> B voices "so if the key leaks, everything's exposed"; A splits past vs future.
- I56 Footnotes: session ticket keys weaken it (leak exposes resumed sessions, so servers rotate often); 0-RTT data has no forward secrecy with respect to the ticket key. -> A.

## The Idea: What HTTPS hides

- I57 "HTTPS encrypts everything" is wrong; encrypts the conversation; facts about it stay visible. -> B says the wrong model ("on HTTPS the café sees nothing"); A corrects.
- F6 Figure 006: packet layers: IP header (src, dst IP), TCP (port 443), TLS record (type, length) readable; encrypted part: path, headers, API key, body. Visible: IPs, timing, SNI, DNS lookup unless DoH/DoT, sizes, that you use TLS 1.3 and which ciphers. Hidden: URL path and query, headers, cookies, Authorization, bodies, certificate (1.3 only), status codes. ECH starting to hide SNI. -> A, as the café's view, left to right.
- I58 IP addresses: routers need them; can't be hidden. -> A.
- I59 SNI: Server Name Indication, hostname in ClientHello so one IP hosts many sites and picks the right cert; plaintext, before keys exist; anyone reads api.openai.com or github.com. ECH: Encrypted Client Hello, uses public key site publishes in DNS; rolled out by Cloudflare and browsers; check current support. -> A.
- I60 DNS: plaintext over UDP unless DNS over HTTPS or TLS. -> A, one line.
- I61 Sizes and timing: hides content not length; 2 MB looks like 2 MB; researchers identified pages visited and words in voice calls from sizes; streaming LLM responses send about one record per token, sizes can leak token lengths; shown in published research on chat assistants; providers added padding. -> A, tied to his LLM work.

## Build It

- B0 Setup (ok): folder, venv, cryptography library, Homebrew OpenSSL 3 (macOS ships LibreSSL as openssl), Wireshark; OpenSSL 3.6 on the Mac; hybrid group needs 3.5 or newer. -> one or two sentences.
- B1 dh_toy (hands): three-argument pow, modular power without building giant number; public value, shared secret, Eve brute force counting tries; check 8, 19, 2. Then g = 2 mod 23 only reaches 11 values: not a generator, half the secret space; choosing parameters is for experts. -> A: what you build, the part that matters, what you'd see.
- B2 dh_real (hands): ffdhe2048 from RFC 7919 via openssl genparam; asn1parse gives two integers, p in hex starting with lots of Fs, g = 2; secrets from secrets module, never random (predictable); time 20 exponentiations: 10 to 20 ms, about 15 ms on Python 3.14; print bits of brute force; then X25519 from library, 32-byte shared value; library's finite-field DH prints deprecation warning, everyone moved to curves. -> A.
- B3 seal (review): warning never roll your own crypto in production; toy DH has no auth, simplest nonce handling; use TLS (Python ssl, httpx, reverse proxy) or high-level misuse-resistant library. Raw DH output isn't a key, has structure; HKDF with different label per direction; seal with fresh 12-byte nonce; 20-byte message gives 36 bytes; flip one bit gives InvalidTag not garbage; same for changing one byte of header; review question: where could I reuse a nonce, what happens? -> A, B asks why the DH number isn't a key.
- B4 openssl s_client against letsencrypt.org (explain): depth lines and Verification OK; certificate chain subject and issuer, each issuer is next one's subject; peer signature type; negotiated group / peer temp key; cipher TLS_AES_128_GCM_SHA256; bytes read and written; post-handshake new session ticket and lifetime hint. Then -msg on github.com: ClientHello out, ServerHello, EncryptedExtensions, Certificate, CertificateVerify, Finished back, decoy ChangeCipherSpec, record headers TLS 1.2. google and cloudflare negotiated X25519MLKEM768, github and letsencrypt plain X25519. -> A, said as "you'll see a line that..." without reading output.
- B5 chain.py (hands): save github chain one file per cert; print subject, issuer, dates, SAN; verify link by link with verify_directly_issued_by (cryptography 40+: checks issuer name and signature); top cert's issuer must match a root; dates; hostname in SAN; real clients also do wildcards, key usage, path length. Compare with openssl verify. Result: leaf, DV E36, Root E46, USERTrust ECC; without second intermediate fails "unable to get local issuer certificate", the misconfigured-server error. -> A.
- B6 Wireshark decrypt (explain): SSLKEYLOGFILE; capture on Wi-Fi interface, port 443; Python's ssl honours it (lines like server handshake traffic secret); macOS built-in curl wrote nothing; Homebrew curl, Firefox, Chrome generally do. Display filter tls: Client Hello, Server Hello, unreadable Application Data; SNI in server_name extension in plaintext; set key log in preferences and see Certificate, CertificateVerify, Finished, HTTP; keep keys.log private, delete. -> A; B asks "doesn't that break TLS?" and A: the client already knows the keys.
- B7 Home server cert (explain): Tailscale name like homebox on your tailnet's ts.net; tools complain (plain HTTP or self-signed); tailscale cert gets a real Let's Encrypt cert via ACME DNS challenge since Tailscale controls ts.net DNS; enable MagicDNS and HTTPS in admin console; CT trade-off: machine and tailnet names go into public logs; tailscale serve alternative; standard-library HTTPS server: ssl context, load cert chain, wrap socket; curl with no -k (no "skip verification" flag), s_client shows Let's Encrypt chain, run chain.py on it; 90 days, schedule renewal. -> A; ties back to P4's self-signed error. No real hostnames.
- B8 Done-when list: each above outcome. -> folded into each task's "what you'd see".

## Measure

- M1 2048-bit exponentiation about 15 ms; X25519 two keygens + exchange about 50 microseconds; ECDSA 13 / 40 microseconds; RSA 330 / 18; AES-GCM 100 MB about 7 GB/s; handshake bytes about 3.9 KB read / 1.5 KB written for letsencrypt.org. -> A, numbers with comparisons, not as a table.
- M2 hs_time script: DNS out of the way first, then time TCP connect, then TLS wrap. Results: google 4-5 ms TCP, 14-24 ms TLS, 3-5x; github 9-12 ms TCP, about 12 ms TLS, about 1x; letsencrypt about 30 ms TCP, about 33 ms TLS, about 1.1x. -> A says each host as a sentence.
- M3 Far servers: TLS about one extra round trip, 1-RTT visible on a stopwatch; TLS 1.2 would show about two. -> A.
- M4 Near servers: fixed costs (bigger hybrid key share, longer chain to verify, server's signature) visible fraction; still tens of ms at most. -> B notices google's ratio and asks why.
- M5 Crypto is cheap: X25519 tens of microseconds, a signature check per link plus CertificateVerify tens of microseconds each; well under a millisecond; network dominates; that's why connection reuse (keep-alive, HTTP/2) and 0-RTT matter more than faster ciphers: they remove round trips. -> A, the Numbers-gap payoff.
- M6 Symmetric not bottleneck: 7 GB/s per core vs 10 Gbit/s link (1.25 GB/s) costs a fraction of one core. -> A; bits vs bytes said plainly.
- M7 2048-bit vs X25519 gap, 15 ms vs 50 microseconds, a few hundred times; why the web moved to curves, servers doing thousands of handshakes a second. -> A.

## Break It

- K1 Nonce reuse: two different 20-byte messages same key and nonce; XOR ciphertexts (no tags), XOR in first plaintext, get second plaintext without the key; ran it, printed exactly; number one way AES-GCM is broken; TLS builds nonces from a per-record counter. -> "what if" exchange.
- K2 Wrong name: connect to github but verify hostname example.com: verify return code 62, hostname mismatch; Python raises certificate verify failed, hostname mismatch; chain valid, just for someone else; client that skips hostname check is wide open since Mallory can get a valid cert for her own domain. -> B "if the chain's valid, who cares?"; A.
- K3 Replay 0-RTT: self-signed cert, OpenSSL test server accepting early data, save session, send same early data twice with same ticket; sleep keeps first client open to receive ticket; first accepted, second rejected: anti-replay; restart with no anti-replay: both accepted, server ran same request twice; imagine a POST. -> A.
- K4 Missing intermediate: drop it in chain.py, see which check fails; server with only leaf often works in browsers (cache intermediates, some fetch missing ones), fails in curl and Python; one of the most common real SSL errors; diagnose in one s_client command. -> B "works in my browser but not in Python" voiced as a real experience; A.

## Explain It Back (content must be in the conversation)

- E1 Agree on secret over recorded channel: DH, public prime and base (or curve and point), each sends g to its secret, each raises received to own secret, both get g to ab; eavesdropper combining gets g to a plus b; needs discrete log, infeasible at real sizes; paint; result fed through KDF. -> covered by I11-I19, PR1, I44; final restatement.
- E2 Why certificates if DH keeps it secret: DH only stops listeners; changer does two exchanges and relays; server signs transcript including both shares; certificate proves public key belongs to hostname, signed by CA whose root is in store; client checks chain, hostname, dates, signature. -> I26-I40, I47.
- E3 Walk the handshake, why one round trip: ClientHello (ciphers, SNI, DH share for guessed group); ServerHello + share, handshake keys; encrypted EncryptedExtensions, Certificate, CertificateVerify, Finished; client verifies, sends Finished and first request; one RTT because share is sent up front instead of negotiating first; 1.2 took two; 0-RTT with ticket, replayable, idempotent only. -> F5, I45, PR3, I51-52.
- E4 Forward secrecy and what breaks it: past traffic safe after key theft; ephemeral DH deleted; cert key only signs; RSA key exchange lacked it; long-lived ticket keys and 0-RTT weaken it. -> I53-I56.
- E5 50,000 new TLS connections a second: per handshake X25519/hybrid plus one signature, tens to a few hundred microseconds; ECDSA 13 vs RSA 330, RSA cert costs roughly 25x more server CPU per handshake; at 50k/s from under one core to many cores; symmetric cheap; use ECDSA and X25519; reuse connections (keep-alive, HTTP/2 multiplexing); resume with tickets; terminate TLS on horizontally scaled tier (load balancers, CDN), which also brings round trip closer to users, since latency not CPU is what users feel. -> A answers B's scaling question near the end, with the arithmetic in words. Derived: 50,000 times 13 microseconds is about two thirds of a second of CPU per second (under one core); 50,000 times 330 microseconds is about sixteen and a half core-seconds per second (many cores).

## Go Deeper / Connections

- G1 Best sources: the Diffie-Hellman paper (short, readable) and The Illustrated TLS 1.3 Connection by Michael Driscoll (every byte annotated); RFC 8446 sections 2 and 4.4. -> one sentence near the end, or skip.
- C1 Sits between DNS/TCP and the first HTTP byte; count round trips from ping time; HTTP from scratch wraps its socket with ssl; latency lesson: microseconds of CPU, tens of ms of waiting. -> one or two sentences before the closing restatement.

## Flow

1. Problem: café scene, B's "just send the key", two problems. 2. Origin story. 3. Symmetric half (AES-GCM, figure, speed, nonce). 4. Paint. 5. Numbers with 23 and 5, Predict multiply, figure 002, big numbers. 6. Curves, X25519, ML-KEM. 7. Mallory Predict and figure. 8. Signatures. 9. Certificates, roots, chain figure, ACME, DigiNotar, CT. 10. Handshake pieces, ordering, Predict RTT, figure 005 walkthrough, camouflage. 11. Resumption, 0-RTT, replay. 12. Forward secrecy. 13. What HTTPS hides. 14. Build It tasks in order. 15. Measure. 16. Break It. 17. Scaling question (E5), connections, closing restatement (B) and A's sharpening.
