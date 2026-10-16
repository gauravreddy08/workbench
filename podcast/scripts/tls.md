<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you're at a café. Laptop's on the café Wi-Fi, and you're calling your model endpoint, the one with the API key in the header. And between you and that server there's, what, the café's router. The café's internet provider. A couple of big backbone networks. Maybe a load balancer at the far end. And every one of those can copy every packet that goes past. So can the person at the next table, honestly, with a free program and a Wi-Fi card.

B: Okay, but that's what encryption's for. You scramble the request, the server unscrambles it.

A: Right, so how does the server unscramble it?

B: It has the key. You... I mean, you send it the key.

A: Send it how, though? Past the same router, the same backbone, the same guy at the next table. Whatever you send, they get a copy.

B: [a bit unsure] Then you encrypt the key before you send it.

A: [amused] With what key?

B: Oh. Yeah. Okay, that's a loop.

A: That's the loop. You've never met this server. You don't share a single secret with it. And every byte either of you will ever send goes through hands you don't trust. That sounds impossible, and for a long time people actually believed it was impossible. And yet your browser does it, like, hundreds of times a day, in about one network round trip, and you never notice. You only notice when it breaks. "Certificate verify failed." "Certificate has expired." "Hostname mismatch." Or the self-signed certificate on your home server that every single tool refuses to talk to. Each of those errors is one specific step in what we're about to go through, going wrong. And by the end you'll know which step. So you split it in two, because it's really two problems, and they get solved by two different ideas. The first is secrecy. Agree on a key that eavesdroppers can't learn, even though they see absolutely everything. That's called key exchange. The second is identity. Make sure the machine you just agreed a key with is actually the server, and not someone pretending to be it. That one's solved by signatures and certificates. Keep those two apart in your head, because people blur them all the time.

<!-- section: Origin -->

A: And the history here is really the reason for all of it. For basically all of human history before the mid-nineteen-seventies, if you wanted to encrypt something, you needed a shared secret delivered ahead of time. A codebook. A one-time pad carried by a courier. A key physically loaded into a machine. Militaries and banks spent fortunes just moving keys around.

B: Like, literally people with briefcases.

A: Literally people with briefcases. And then in November nineteen seventy-six, two people published a paper called "New Directions in Cryptography". Whit Diffie, who was this restless cryptography amateur, and Martin Hellman, a professor at Stanford. They were building on an idea from Ralph Merkle. And the paper showed that two parties could create a shared secret in public, with no contact beforehand at all. It also proposed digital signatures, which we'll need later, but they didn't have a practical way to actually make them yet.

B: [skeptical] And nobody had thought of this before?

A: Well, someone had. British intelligence, at G C H Q, found similar ideas a few years earlier. They just kept them classified until nineteen ninety-seven. So publicly, this was it. Then a year later, nineteen seventy-seven, three people at MIT, Ron Rivest, Adi Shamir and Leonard Adleman, found the practical scheme. That's RSA, named after their initials, and it could both encrypt and sign using a public key. So now the tools existed. And then... nobody really used them much. Until the web needed shopping carts.

B: [laughs] Of course it was shopping.

A: It was shopping. In ninety-four, ninety-five, Netscape, with Taher Elgamal leading this part, designed something called SSL, so that people would be willing to type their credit card numbers into a browser. SSL two point oh came out in ninety-five, three point oh in ninety-six, and both had serious flaws. Then the internet standards body, the I E T F, took it over and renamed it TLS. Version one point oh in nineteen ninety-nine. And TLS one point three, finished in twenty eighteen, is a near-total redesign. That's the one we're taking apart.

<!-- section: The Idea: Symmetric encryption -->

A: So let's do the easy half first. Pretend you and the server already had a shared key. Sixteen or thirty-two random bytes that nobody else knows. Then you'd use what's called symmetric encryption. Same key on both ends, one key locks and unlocks. It's fast, it's simple, and it's completely useless until both sides somehow have the key. Which is the whole problem, but park that for a sec. The standard choice is AES, the Advanced Encryption Standard. It was picked by a public competition in two thousand one. The winning design was called Rijndael. It scrambles sixteen-byte blocks of data under a key that's a hundred twenty-eight or two hundred fifty-six bits long, and modern CPUs literally have instructions built in for it. And you use AES in a mode called G C M, Galois Counter Mode, which does two jobs at once. It encrypts, and it attaches a sixteen-byte tag so the receiver can tell if anything was changed.

B: Tag meaning what, like a checksum?

A: Basically a checksum, but one you can only compute if you have the key. That's called the authentication tag. Change a single bit of the scrambled message in transit and the tag stops matching, so decryption refuses outright. It doesn't hand you garbage, it just says no. So picture it as boxes. On the left, three inputs. The key, thirty-two bytes, secret. A nonce, twelve bytes, and that one's public. And the message, say, "meet me at nine". All three go into one box in the middle, AES G C M. And out the right side come two things: the ciphertext, which is the scrambled message and is exactly the same length as the original, plus the little sixteen-byte tag stuck on the end. That plus the nonce is what goes over the wire. There's also an optional fourth input, some extra data you want protected but not hidden. Like a header. Nobody can read the message, but nobody can quietly edit the header either.

B: And the nonce is what? You said it's public.

A: Nonce stands for "number used once". It's twelve bytes, and the only rule is it has to be different for every message you encrypt under the same key. It doesn't need to be secret. It just must never repeat. I'll come back to why that's such a big deal.

B: [skeptical] Okay, but isn't this the part that makes HTTPS slow? Encrypting every byte of every request?

A: [jumping in] No, and this is worth having a number for. On a Mac, AES G C M through Python's cryptography library encrypted about seven gigabytes per second. On one core. Your whole API request is a few kilobytes. So encrypting it takes, like, a millionth of a second. Encryption is never why HTTPS feels slow. Something else is, and we'll find it. Now the nonce. The way G C M works is, from the key and the nonce together, it generates a long stream of random-looking bytes, and then it XORs that stream onto your message. XOR is just "flip every bit of the message where the stream has a one". Do it again with the same stream and the flips undo themselves. So here's the trap. Encrypt two different messages with the same key and the same nonce, and they got the same stream. An eavesdropper XORs your two ciphertexts together, the stream cancels out, and what's left is your two plaintexts XORed with each other. No key needed. You're going to do exactly that to yourself later and watch it work. So that's the easy half. If you already share a key, everything's solved. Which means the whole of TLS really boils down to one question. How do both ends end up with the same key?

<!-- section: The Idea: Paint -->

A: Here's the trick Diffie and Hellman found, and I'm going to tell it with paint first. It's a standard way to explain it, and honestly it's a good one. Alice and Bob want a shared colour. Eve is watching everything they pass back and forth, and she shouldn't be able to make the same colour. And the one fact about paint that matters: mixing is easy, and un-mixing is practically impossible. Hand someone a pot of brownish green and they can't tell you which two colours went into it. So. Step one, in public, they agree on a common colour. Say green. Eve sees it, that's fine. Step two, each of them secretly picks their own colour. Alice picks orange, Bob picks blue, and those never leave their houses. Step three, each one mixes their secret colour into a pot of the common green. Alice has green and orange, Bob has green and blue. Step four, they swap pots. In public. Eve sees both pots go past.

B: And now each of them has the other one's mix.

A: Right, and step five, each one adds their own secret colour to the pot they received. Alice pours orange into Bob's green-and-blue. Bob pours blue into Alice's green-and-orange. And they both end up with green plus orange plus blue, in the same proportions. Same colour.

B: [working it out] But Eve has both pots. Can't she just pour them together?

A: She can, and she gets the wrong shade. Think about the amounts. Each pot is one part green and one part secret. Pour them together and you get two parts green, one part orange, one part blue. Alice and Bob each have one part of each. Too much green. To get their colour, Eve would need orange or blue on their own, and the only way to get those is to un-mix a pot. Which is the one thing you can't do.

<!-- section: The Idea: The same trick with numbers -->

A: So paint's the intuition. Now what the computer actually does. We need an operation that's easy to do one way and really hard to undo. And the one Diffie and Hellman used is raising a number to a power, but on a clock.

B: On a clock how?

A: There's an operation called modulo. Say "seventeen mod five" and it means divide by five and keep only the remainder. Seventeen divided by five is three, remainder two, so seventeen mod five is two. And arithmetic mod some number p wraps around like a clock with p hours on it. Go past the top and you start again from zero. So pick a prime number, twenty-three. That's the clock. And a base, five. Both public, both like the green paint. And the five has to be a particular kind of base called a generator, which means if you take five, five squared, five cubed and so on, all mod twenty-three, you land on every number from one to twenty-two before it starts repeating. Which is what lets the secret be anything in that range. Alice picks a secret, six. Bob picks a secret, fifteen. Alice works out five to the sixth power, mod twenty-three. Five to the sixth is fifteen thousand, six hundred twenty-five. Divide that by twenty-three, and it goes in six hundred seventy-nine times, with eight left over. So Alice's public number is eight. Bob does five to the fifteenth, mod twenty-three, and gets nineteen. They send eight and nineteen across, out in the open. That's the paint pots.

B: And then each one does it again with the number they got.

A: Same move. Alice takes Bob's nineteen and raises it to her secret, six, mod twenty-three. That's two. Bob takes Alice's eight and raises it to his secret, fifteen, mod twenty-three. Also two. They both got two.

B: [skeptical] Okay, why is that not a coincidence?

A: Because of what each of them actually computed. Bob's nineteen was five raised to Bob's secret. Alice raised that to her secret. So she's got five, raised to fifteen, then raised to six. Bob did the same thing in the other order: five raised to six, then raised to fifteen. Either way it's five raised to six times fifteen. And the order you raise powers in doesn't matter. Same way it didn't matter which order the paint went in. Now Eve. She's got twenty-three, five, eight and nineteen. Everything that crossed the wire. To get the key she needs one of the secrets, which means answering "five to what power, mod twenty-three, gives eight?" That's called the discrete logarithm problem. It's like an ordinary logarithm, except on a clock that keeps wrapping around, and the wrapping scrambles the pattern, so there's no shortcut like counting digits. With twenty-three, she can just try all twenty-two possibilities. Done in no time. With a prime that's six hundred digits long, she can't.

<!-- section: The Idea: Predict, Eve multiplies -->

A: So try this. Eve has eight and nineteen. She can do any arithmetic she wants on them. Why doesn't she just multiply them together, mod twenty-three, and call that the key?

B: [working it out] I mean... that kind of seems like it should work? Both secrets are in there somewhere.

A: They are in there. But in the wrong way. Eight is five to the a. Nineteen is five to the b. Multiply two powers of the same base, and the exponents add. So Eve gets five to the a plus b. The key is five to the a times b. Multiplying the public numbers adds the secrets, and to get the key you need to multiply the secrets. And you can't multiply them without knowing one.

B: So it's the paint thing again. She mixed the two pots.

A: It's the paint problem exactly. Wrong proportions. And with our numbers you can check it. Eight times nineteen mod twenty-three is fourteen. Not two. And there's an interactive version of this you can actually play with. Three columns. Alice on the left, Bob on the right, and Eve in the middle, and Eve's column only ever fills in with things that crossed the wire. Every cell has a paint swatch and the real arithmetic next to it. You step through the five steps, drag Alice's and Bob's secrets around, and watch both their keys change together. At the bottom of Eve's column there's her best attempt, the two pots mixed, and it's always the wrong shade and the wrong number. Then there's a button that lets Eve brute-force it. With twenty-three, she finds the secret instantly. Then you switch to a bigger prime, two to the thirty-one minus one, which is about two billion, with random secrets, and press the button again. And it actually runs, in your browser, for real. And it takes seconds.

B: Seconds for two billion? That's... not very reassuring.

A: [laughs] No, and that's the point of it. That's a thirty-one bit prime. Every extra bit doubles her work. A browser running JavaScript gets through a few hundred million guesses a second. And real attacks are much cleverer than trying every exponent, they're related to the methods used for factoring big numbers, which is why the sizes people actually use for this mod-a-prime version are two thousand forty-eight bits. And for what TLS really uses, the best known attack takes something like two to the hundred twenty-eight steps. At a billion billion guesses a second, that's about ten trillion years.

B: Okay. That's reassuring.

A: The catch is it costs you too. One of those two-thousand-bit exponentiations takes around fifteen milliseconds in Python on a Mac. Which is slow, for a computer. And that's why modern TLS doesn't actually do it this way.

<!-- section: The Idea: Elliptic curves -->

A: Modern TLS almost never uses the "mod a prime" version. It uses the same idea on something called an elliptic curve. Without getting into the equation, it's a particular curve, a set of points, with all the arithmetic done on a clock again. And there's a way to "add" two points on the curve and get a third point that's also on it. So instead of "multiply g by itself a times", you "add a starting point G to itself a times". Going forward is fast, because there's a doubling trick. You don't add one at a time, you keep doubling, the same trick that makes powers fast. And going backward, from the result to how many times you added, is the curve version of the discrete log.

B: So same shape, different math. Why bother switching?

A: Because the best known attacks on the curve version are much weaker than on the prime version. So the numbers can be way smaller. A two hundred fifty-five bit curve gives you roughly the security of a three thousand bit prime. The curve almost everyone uses is called Curve twenty-five five-nineteen, designed by Daniel Bernstein, and Diffie-Hellman on it is called X twenty-five five-nineteen. Each side's secret is thirty-two random bytes, and the public value it sends is thirty-two bytes. It's fast, and it was designed specifically to be hard to implement wrongly. A key pair plus a full exchange took about fifty microseconds on the Mac.

B: Versus fifteen milliseconds.

A: Versus fifteen milliseconds. A few hundred times faster. Now, there's one more name you'll see in the output when you poke at real servers, and it looks like line noise. X twenty-five five-nineteen M L KEM seven sixty-eight.

B: [amused] Yeah, I was going to ask.

A: So big sites now send two key shares at once. An X twenty-five five-nineteen share, and a share for something called M L KEM. M L KEM is a key-exchange method that NIST, the US standards agency, standardised in twenty twenty-four. It's based on a completely different kind of hard math problem, lattices, and it's believed to resist future quantum computers. Which matters, because a big enough quantum computer would break both kinds of discrete log. So you do both and combine the results. If either one holds, the key is safe. The cost is just a bigger first message. The M L KEM share is about one point two kilobytes.

<!-- section: The Idea: The man in the middle -->

A: Okay. So Diffie-Hellman beats Eve. Eve only listens. But it does nothing against Mallory, and Mallory can change packets.

B: [a bit unsure] Wait, but if the math is solid, what does changing packets buy her? She still can't do the discrete log.

A: Try it from her side. You're on Mallory's café Wi-Fi. She controls the router, so she can drop packets, edit them, inject new ones. You start a key exchange with the API server. Using only what we've got so far, how does she read your traffic without breaking any math?

B: [working it out] She can't figure out my key, so... she makes her own? Like, she pretends to be the server?

A: That's half of it. She runs two exchanges. When your public number goes out, she drops it, and sends the server her own number instead. When the server's number comes back, she drops that too, and sends you her number. So you compute a key with Mallory, thinking it's the server. And the server computes a different key with Mallory, thinking it's you. Now she decrypts everything you send, reads it, re-encrypts it with the other key, and forwards it. Responses come back the same way.

B: And both of those exchanges are just... normal Diffie-Hellman.

A: Both perfect. Picture three boxes in a row. You on the left, with your secret. Mallory in the middle, with hers. The server on the right. Between you and Mallory, two arrows, your number going right, hers coming back. Between Mallory and the server, the same thing. Underneath, two separate keys. Key one, you and Mallory, and you think it's shared with the server. Key two, the server and Mallory, and the server thinks it's shared with you. And above Mallory: decrypt, read, re-encrypt, forward. Nothing in any of the math told you that the number you received came from the server. That's the missing piece. Not better math. Authentication.

<!-- section: The Idea: Signatures -->

A: So the fix needs that second idea from the nineteen seventy-six paper. A digital signature. A short value computed from a message and a private key. Anyone with the matching public key can check it, but only whoever holds the private key can produce it. And change one bit of the message and the check fails. Which needs the idea of a key pair. That's public-key cryptography. You generate two keys together. A private key that you never show anyone, and a public key that you hand to everybody. It's also called asymmetric cryptography, because the two keys do different jobs. And a signature scheme gives you two operations. Sign: you take your private key and a message, and out comes a signature. And verify: anyone takes your public key, the message, and the signature, and gets back a yes or a no.

B: So it's like a wax seal.

A: It's a lot like a wax seal. Only you have the signet ring, but anybody who knows what your seal looks like can recognise it. Except a digital signature is better, because it's computed over the content. You can't peel it off one letter and stick it on another. Move it to a different message and it fails. The common ones are RSA signatures, the nineteen seventy-seven scheme. E C D S A, which is signatures with elliptic-curve keys, usually on a curve called P two fifty-six, and those signatures are about sixty-four to seventy-two bytes. And Ed twenty-five five-nineteen. And they're quick. Rough numbers measured on a Mac: an E C D S A signature takes about thirteen microseconds to make and forty to check. RSA with a two-thousand-bit key takes about three hundred thirty microseconds to sign and eighteen to verify. And a round trip from that Mac to letsencrypt dot org was about thirty milliseconds. So all of those are, like, a rounding error next to one round trip. So here's the plan. The server signs its Diffie-Hellman number with its private key. You already know the server's public key. Mallory can't substitute her own number, because she can't forge the server's signature on it.

B: [skeptical] Hang on. "You already know the server's public key." How? I've never talked to this server. If it just sends me its public key, Mallory sends me hers.

A: [amused] Right. And that's exactly where the problem moved to. We traded "how do I get a shared secret" for "how do I know whose public key this is".

<!-- section: The Idea: Certificates -->

A: And it gets solved the same way passports solve "is this stranger who they say they are?" You don't know the stranger. You trust a government, and the government vouches for the stranger. A certificate is the passport. It's a small signed document, in a format called X five oh nine, that says "this public key belongs to this domain name, and it's valid between these two dates". Inside it there's the server's public key. There's the list of names it's valid for, in a field called the subject alternative name, so for GitHub that's github dot com and double-u double-u double-u dot github dot com, and your client checks the name it asked for is on that list. There are the dates. And there's a signature from a certificate authority. A certificate authority, a C A, is an organisation whose whole job is checking that whoever asks for a certificate really controls that domain, and then signing it. Let's Encrypt, DigiCert, Sectigo, Google Trust Services, those kinds of names.

B: But then who vouches for the C A? Doesn't that just go on forever?

A: It stops, and it stops on your own machine. Your computer ships with a list of C As it trusts. A hundred-odd organisations. Each one is represented by a certificate it signed itself, called a root certificate. And a root isn't trusted because of any signature. It's trusted because your operating system or browser vendor put it in the list. That list is called the root store. Mac OS keeps one in the Keychain. Firefox, Chrome, Linux distributions, and Homebrew's OpenSSL each have their own, mostly derived from Mozilla's list. Homebrew's OpenSSL on that Mac has a hundred eighty-seven certificates in it.

B: So "trust" here really means "someone at Apple or Mozilla put it in a file".

A: Pretty much, yeah. That's the anchor. And roots almost never sign server certificates directly. The root's private key is kept offline, in a vault. The root signs an intermediate C A certificate, and the intermediate signs your server's certificate, which is called the leaf. And that's the chain of trust. Leaf, then one or more intermediates, then the root, where each certificate is signed by the private key of the one above it. Check every link and you've connected the server's key to something you already trusted. Here's a real one, what github dot com sent in October twenty twenty-six. Picture four boxes stacked up. At the bottom, the leaf. Its name is github dot com, the names list says github dot com and double-u double-u double-u dot github dot com, it has a P two fifty-six key, and it's valid from September first to November twenty-ninth. Above it, an intermediate called Sectigo Public Server Auth C A, D V, E thirty-six, and it signed the leaf. Above that, another intermediate, Sectigo Public Server Auth Root E forty-six, which signed the one below it. That one's cross-signed, which just means a different, older authority vouched for it. And at the top, the root, USERTrust E C C Certification Authority, signed by itself. The server sends you the leaf and the two intermediates. It does not send the top one. That one has to already be in your root store. And every link has to verify, every certificate has to be in date, and the name you asked for has to be on the leaf.

B: [working it out] Those dates are short. Like three months.

A: On purpose. So how does a C A check you really control a domain before signing? With a challenge. For Let's Encrypt, which is a free, automated certificate authority run by a nonprofit, launched in twenty fifteen, and which now issues most of the web's certificates, the protocol's called ACME. A program on your server, like certbot, or Caddy, or Traefik, asks for a certificate. The C A says, "put this random token at this particular path on your website", or "put it in a D N S record". Then it checks from the internet, and if the token's there, it signs. No human anywhere. And Let's Encrypt certificates last ninety days. Short so renewal has to be automated, and so a stolen key is only useful for a while. The industry's moving to even shorter lifetimes over the next few years, so check the current rules if it matters to you.

B: [skeptical] And what if the C A itself is the bad guy? Or gets hacked?

A: It's happened. DigiNotar, a Dutch C A, was hacked in twenty eleven and issued fake certificates for Google. Browsers removed it from their root stores, and the company went bankrupt. The modern safety net is called Certificate Transparency. Every certificate a public C A issues has to go into public logs that you can only add to, never edit. And browsers reject certificates that aren't in them. So if somebody gets a certificate issued for your domain, it's visible to anyone who looks. And hold onto one consequence of that, because it'll come back: every name you get a public certificate for is published. Forever.

<!-- section: The Idea: The TLS 1.3 handshake -->

A: Okay, so now we have every piece, and the handshake is honestly just choreography. Diffie-Hellman, usually X twenty-five five-nineteen, for the key, so listeners learn nothing. The certificate chain, so the client learns the server's real public key. A signature with that key over the handshake, so Mallory can't swap in her number. Then something to make sure nobody quietly edited earlier messages. And after that, AES G C M for everything. Or a cipher called ChaCha twenty Poly thirteen oh five on chips that don't have the AES instructions built in.

B: The "nobody edited earlier messages" part. How?

A: Two tools. A hash is a function that turns any input into a short, fixed-size fingerprint. Thirty-two bytes, for the common one, SHA two fifty-six. Same input, same fingerprint. Change anything, and you get a totally different fingerprint. And you can't run it backwards, or find two inputs with the same fingerprint. Then an H mac, which is a hash mixed with a secret key, so only someone with the key can produce or check that fingerprint. So you take a hash of the whole conversation so far, and an H mac of it under the new keys, and if anyone tampered with anything, the two sides' fingerprints won't match. And the keys themselves don't come straight from Diffie-Hellman. TLS never uses the raw shared number as a key. It feeds that number, plus a hash of the messages so far, through a key derivation function, a K D F. That's a function that takes one secret and stretches it into several independent keys for different jobs. The one TLS one point three uses is called H K D F, and it's built out of H macs. So you get separate keys for each direction and each phase of the conversation. The clever part of TLS one point three is the ordering. Older TLS spent a whole round trip agreeing on which algorithms to use, and then another round trip actually doing the exchange. One point three just guesses. The client sends its Diffie-Hellman number in its very first message, for the one it thinks the server will pick. Which is almost always X twenty-five five-nineteen, or that hybrid. The server answers with its own number, and immediately switches to encryption.

B: And if it guesses wrong?

A: The server sends back a message called Hello Retry Request, basically "not that one, try this", and it costs one extra round trip. But it's rare.

<!-- section: The Idea: Predict, counting round trips -->

A: So let's actually count, because this is where the time goes. Quick reminder of what a round trip is. One message goes out, and the answer comes back. That's one round trip. From a Mac to letsencrypt dot org, that's about thirty milliseconds. And before TLS even starts, the T C P connection has to be set up, which is its own little hello-and-reply, and that costs one round trip on its own. So. Once T C P is up, how long until your client can send its first encrypted request? And how long until the response comes back, ignoring the time the server spends thinking?

B: [working it out] Okay, so... the client says hello, the server says hello back. Then the server sends the certificate, and the client has to... acknowledge it? Then the signature... I'd guess three or four round trips. Maybe a hundred milliseconds just for TLS?

A: That's the old mental model, every message waiting for a reply. But the server doesn't wait. It sends its whole batch in one go. Server hello, its certificate, its signature, its finished message, all in one flight, right after it gets your hello. So it's one round trip, about thirty milliseconds, before you can send. And then the client sends its own finished message together with its first request, in the same breath. So the response comes back after two round trips, about sixty milliseconds. Add T C P's round trip at the front, and a cold HTTPS request costs about three round trips before the first byte of the response. On a Mac, measured, T C P connect to letsencrypt dot org took about thirty-one milliseconds, and the TLS handshake took about thirty-three on top.

B: So TLS is basically one extra ping.

A: Basically one extra ping. Which is the number that matters, way more than any of the crypto.

<!-- section: The Idea: The handshake, step by step -->

A: Let me walk it message by message, the way the interactive figure steps through it. Picture two vertical lines, client on the left, server on the right, and arrows going across, one at a time. Plain arrows mean readable by anyone. Blue arrows mean encrypted with the handshake keys. Thick blue means your actual data. Message one, the client hello, going right. It carries a random number, the list of ciphers the client supports, the hostname it wants, and, because it's guessing, its half of the Diffie-Hellman exchange already. At this point Eve reads everything in it. The hostname, the cipher list, the public number. That's fine, there's nothing secret yet. Message two, server hello, coming back. The server picks one cipher and sends its own Diffie-Hellman half. And right here, both sides can compute the same shared secret, and from it, through H K D F, a pair of handshake keys. Eve has both public halves, but not the secret. And everything after this message is encrypted.

B: Everything? Including the certificate?

A: Including the certificate. Which is new. In TLS one point two, the certificate went across in the clear, so anyone watching could see exactly which certificate you got. Now, message three is called encrypted extensions. It's the rest of the server's settings, like which version of HTTP it'll speak. Eve sees a record of some length, and that's it. Message four, the certificate chain. Leaf and intermediates. To Eve, a few kilobytes of ciphertext. The server's private key never goes anywhere. Message five is the important one. Certificate verify. The server signs a hash of the transcript. That's every byte of every message so far, and that includes both Diffie-Hellman numbers. It signs it with the private key that matches its certificate.

B: [working it out] Oh. So that's where Mallory dies. If she swapped her number in, the transcript the server signed has the server's number in it, and I've got hers.

A: That's it. The transcript you saw and the transcript the server signed don't match, and the signature fails. Certificate verify is the anti-Mallory step. Then message six, the server's finished message. That's an H mac over the whole transcript, under a key only the two ends have. It catches downgrade tricks. Like some box in the middle deleting the strong options from your client hello so you end up on something weak. If anyone touched any earlier message, the two sides' transcripts differ and this check fails. Message seven goes the other way, from the client. It checks the certificate chain, the signature, the server's finished message, and then sends its own finished message, and right behind it, in the same flight, its first request. Thick blue arrow. Eve now sees IP addresses, ports, sizes and timing. Not the URL, not the headers, not the body. And message eight, the response, and from here on it's just AES G C M records in both directions. And the Diffie-Hellman secrets on both sides can be deleted now. Which matters a lot, in a minute. The server also hands the client a session ticket for next time.

B: [skeptical] One thing. When I've seen TLS stuff in a terminal, I'm pretty sure it said TLS one point two even on modern sites.

A: [laughs] Yeah, that's deliberate. It's camouflage. When you read the output, the record headers will say one point two, and you'll see a message called change cipher spec that does nothing at all. The reason is lots of old firewalls and middleboxes dropped anything that didn't look like TLS one point two. So one point three dresses up as one point two, and the real version gets negotiated inside an extension where those boxes don't look.

<!-- section: The Idea: Resumption and 0-RTT -->

A: So, that session ticket. It's a blob the server gives the client after a handshake. Inside it, encrypted under a key only the server knows, is a secret from this session. Next time you connect, you show it back, and now both sides already share a secret. That's called a pre-shared key, a P S K. And knowing it proves the server is the same one you met before. So you skip the certificate and the signature steps entirely. And with that P S K, the client can go further. It can send its HTTP request in its very first flight, along with its hello, encrypted with a key derived from the P S K alone. Before hearing anything back. That's zero R T T, zero round-trip time, also called early data. So on a return visit, picture the request riding right underneath the hello, in the very same first flight, and the response comes back after one round trip instead of two. Big C D Ns, the content delivery networks, offer it.

B: [amused] So the second visit's basically free.

A: Almost. The catch is serious. That early data is encrypted with a key that depends only on the old ticket. Nothing fresh from the server. So Mallory records that first flight, and she sends it to the server again. And again. And the server decrypts it and acts on it, every time.

B: [a bit unsure] But she still can't read it. So what does she get out of that?

A: She doesn't need to read it. That's a replay attack. You record a valid encrypted message and send it again later, and the receiver just does the same thing twice. "Get the home page" twice is harmless. "Post a transfer of a hundred dollars" twice is not. So the rule is, only idempotent requests go in early data. Idempotent means doing it twice has the same effect as doing it once. A read, basically. And servers either refuse early data, or they limit replays, with tickets that only work once, or short time windows. You'll actually watch OpenSSL's replay protection work, then turn it off and watch it fail. One more thing from that figure. On the return visit, the client still sends a fresh Diffie-Hellman number. And the new handshake keys mix the P S K with a fresh exchange. So the rest of the connection is fully protected. The early data is the one exception.

<!-- section: The Idea: Forward secrecy -->

A: Here's a question worth asking about any encrypted system. If the server's long-term private key leaks next year, what can the attacker read?

B: [a bit unsure] Everything? I mean, that's the key. If you have it, you have it.

A: That used to be true. In the way TLS often worked before one point three, called RSA key exchange, the client made up the session key itself, encrypted it with the server's RSA public key from the certificate, and sent it over. So anyone who recorded that traffic, and later stole the server's private key, could decrypt the session key. And so every recorded conversation. Going back years. And intelligence agencies record a lot of traffic. TLS one point three removed that mode completely. Every handshake uses ephemeral keys. Key pairs made fresh for one connection and thrown away right after. If you've seen E C D H E, the E on the end is "ephemeral". So the secrets that made the key exist for one connection, and then they're deleted. The certificate's private key is only ever used to sign, never to protect the session key.

B: So if someone steals it...

A: They can impersonate the server from then on. That's bad. But they can't decrypt yesterday's traffic. Because the Diffie-Hellman secrets that made yesterday's keys don't exist anywhere anymore. Not on the server, not on the client. That property is called forward secrecy. Sometimes perfect forward secrecy. Two footnotes, though. Session ticket keys weaken it. If the key that encrypts the tickets leaks, resumed sessions can be exposed, which is why servers rotate those keys often. And zero R T T data has no forward secrecy with respect to the ticket key. Same root cause as the replay problem. It only depends on the ticket.

<!-- section: The Idea: What HTTPS hides -->

B: Okay so back at the café. With all this, the café Wi-Fi basically sees nothing, right? It's encrypted.

A: [jumping in] It sees a lot, actually. People say "HTTPS encrypts everything". It encrypts the conversation. A whole bunch of facts about the conversation stay in plain sight. Picture one packet of your request crossing the network, laid out left to right. First the IP header, with your address and the server's address. Then the T C P part, port four forty-three. Then the TLS record header, which says what type of record it is and how long. All of that's readable. Only after that comes the encrypted part. The URL path, the headers, your API key, the body. So the IP addresses, first. Routers need them to deliver the packet. Encryption can't hide them. Then the hostname. There's a field in the client hello called S N I, server name indication. It carries the hostname you want, so one IP address can host lots of sites and pick the right certificate. And it goes in plaintext, because it's in the very first message, before any keys exist. So anyone on the path reads A P I dot openai dot com, or github dot com, straight off the wire.

B: Huh. So they know which site, just not which page.

A: Which site, not which page. There's a newer extension called E C H, encrypted client hello, which encrypts the real hostname using a public key the site publishes in D N S. It's being rolled out by Cloudflare and browsers, so check how far along it is. And D N S itself. Before you connected, you looked the name up, and that's usually in plaintext too, unless you use D N S over HTTPS or over TLS. And then sizes and timing. TLS hides content, not length. A two megabyte response looks like a two megabyte response. Researchers have figured out which pages people visited, and even words in voice calls, from packet sizes alone. And this one's close to your work. Streaming LLM responses send roughly one record per token. So the sizes of those records can leak how long each token is. That's been shown in published research on chat assistants, and providers added padding because of it.

B: [quietly] That's a little unsettling.

A: It's a good reminder of what the promise actually is. What's hidden: the path and query string, headers, cookies, the authorization header, the bodies, status codes, and in one point three the certificate. What's visible: who you're talking to, when, and how much.

<!-- section: Build It: Setup and Diffie-Hellman by hand -->

A: So now you build it. Everything goes in one folder. Setup is quick: a Python virtual environment with the cryptography library, and the real OpenSSL from Homebrew, because Mac OS ships a different library called LibreSSL under the name openssl, and some of the flags you need only exist in OpenSSL three. The hybrid key exchange needs three point five or newer. That Mac had three point six. And Wireshark, for watching packets. First task, Diffie-Hellman by hand, with the tiny numbers. You write a function that makes the public value, one that makes the shared secret, and one for Eve, that tries every exponent until it finds the one that gives her A, and counts how many tries it took. The part that matters is Python's three-argument pow, where you pass the base, the exponent, and the modulus. It computes the power on the clock as it goes, without ever building the giant number. When you run it you should get exactly eight, nineteen and two, and Eve should recover the secret. Then pick your own secrets. And then try base two with twenty-three, and list two to the first through two to the twenty-second, mod twenty-three.

B: And two's not a generator?

A: It isn't. It only ever lands on eleven different values. So the secret space is half the size you thought. And it's a nice little first hint that choosing these parameters is a job for experts. Which is the theme of every warning in this thing. Second task, the real size. TLS has a standard two-thousand-bit group, and instead of copying a six hundred digit number off some web page, you have OpenSSL generate the parameters file and dump it. You'll get two integers. The first is the prime, in hex, and it starts with a long run of Fs. The second is the base, which is just two. You load the prime in Python, make your secrets with the secrets module, never with the random module, because random is predictable. Then time twenty exponentiations and average. You should see each one take on the order of ten to twenty milliseconds. About fifteen on that Mac. Have it print the shared secret's size in bits, and how many tries brute force would need, as a power of two. Then do the same exchange with X twenty-five five-nineteen from the library. Both sides get the same thirty-two bytes, in a tiny fraction of the time. And if you try the library's own version of the old prime-based Diffie-Hellman, it prints a deprecation warning. The library's retiring it. Everyone moved to curves.

<!-- section: Build It: Turn the secret into a key and encrypt -->

A: Third task, and it starts with a warning in big letters. Never roll your own crypto in production. Everything you're building here is for understanding. The toy exchange has no authentication, so Mallory wins. The nonce handling is the simplest possible. And real protocols have dozens of subtle checks you haven't even seen. In real code you use TLS. Python's ssl module, an HTTP client like httpx, a reverse proxy. Or a high-level library that's designed to be hard to misuse. You write your own only to learn.

B: Why can't the Diffie-Hellman number just be the key, though? It's secret, and both sides have it.

A: Because it's a big number with structure. It came out of specific arithmetic, it's not uniformly random bytes. So you run it through H K D F, the way TLS does, with a different label for each direction, and you get a clean thirty-two-byte key. Then you write a seal function that makes a fresh twelve-byte nonce on every call and encrypts with AES G C M, and an open function that reverses it. Encrypt a twenty-byte message and check the output's thirty-six bytes. Twenty for the message, sixteen for the tag. Decrypt it. Then flip one bit of the ciphertext and try again. You should get an Invalid Tag error. Not garbage, an error. Same if you change one byte of the header you passed in. And then you ask an agent to review it, with one specific question. Where could I reuse a nonce, and what happens if I do?

<!-- section: Build It: Read a real handshake -->

A: Fourth, you point OpenSSL's client tool at letsencrypt dot org and read what comes back. It's a wall of text, but there are a few lines worth finding, and you should be able to say in one sentence what each means. At the top there are lines with "depth" in them, and "Verification OK", which is the chain check passing. Then the certificate chain, where each entry has a subject, who this certificate is for, and an issuer, who signed it. And you check that each one's issuer is the next one's subject. That's the chain, literally. Then the peer signature type, which is what signed certificate verify. The group that got negotiated, which is the Diffie-Hellman flavour. The cipher, which will be TLS AES one twenty-eight G C M SHA two fifty-six, so AES G C M with a hundred twenty-eight bit key, and SHA two fifty-six as the hash. How many bytes the handshake read and wrote. And a line saying a new session ticket arrived after the handshake, with a lifetime hint, which is how long the server suggests you keep it. Then you run it again against github dot com in a mode that prints every message as it goes by. And you'll see the client hello go out, then server hello, encrypted extensions, certificate, certificate verify and finished come back. Plus the decoy change cipher spec, and the record headers claiming one point two. Then try Google and Cloudflare and compare the groups. When this was run for the lesson, both of those negotiated the hybrid with M L KEM, while GitHub and Let's Encrypt used plain X twenty-five five-nineteen.

<!-- section: Build It: Verify a chain yourself -->

A: Fifth, you verify a certificate chain yourself. You save what github dot com sends, one file per certificate, and print each one's subject, issuer and dates, plus the leaf's list of names. Then in Python you load your root store, the Homebrew bundle, and check the chain link by link. The cryptography library, from version forty on, gives each certificate a method that takes the issuer's certificate and checks two things: that the issuer's name matches, and that the signature verifies with the issuer's public key. And it raises if not. So you check every adjacent pair. Then the top one's issuer has to match a root in your store, and verify against it. Then every certificate has to be in date. And then the hostname has to be in the leaf's names. And a real client does more on top. Wildcard names like star dot github dot com, what the key is allowed to be used for, how long the chain is allowed to be. Print each link as it passes. When this ran, GitHub's chain went leaf, then the Sectigo D V E thirty-six intermediate, then Sectigo Root E forty-six, then the USERTrust root that's in the store. And you compare with OpenSSL's own verify command. Here's the bit to remember. Running that verify with only the first intermediate, leaving out the second one, fails with "unable to get local issuer certificate".

B: [working it out] That error I've seen. Not from this, but I've seen it.

A: Everyone has. And that exact error is what you get when a server is misconfigured and forgets to send an intermediate. Now you know what it means.

<!-- section: Build It: Decrypt your own traffic -->

A: Sixth, Wireshark, which is a program that captures and shows every packet on a network interface. The whole point of TLS is that Wireshark can't read it. But your client knows the keys. And a lot of TLS libraries will write them to a file if you set an environment variable called S S L key log file.

B: [skeptical] Wait, isn't that just... a hole in TLS?

A: Not really. It's your own client, writing down keys it already has, to your own disk. Nobody on the network gets anything. So you start a capture on your Wi-Fi interface, filtered to port four forty-three, set that variable, and fetch a page with Python. Python's ssl module honours it. The file fills up with lines, each one a label like "server handshake traffic secret", then the client's random number, then the secret. The built-in curl on Mac OS didn't write anything when this was tried. Homebrew's curl, Firefox and Chrome generally do, if you launch them with the variable set. Check yourself. Then stop the capture and filter to TLS. You'll see client hello, server hello, then a bunch of application data records you can't read. Open up the client hello and find the server name extension. That's S N I, the hostname, sitting there in plaintext, no keys needed. Then point Wireshark's TLS settings at your key log file, and the same packets now show the certificate, certificate verify, finished, and the HTTP request and response, all readable. And keep that key file private and delete it when you're done. It decrypts everything it recorded.

<!-- section: Build It: A real certificate for the home server -->

A: Last one, and it's the self-signed error from the start. Your home server's reached over Tailscale, at a name that ends in your tailnet's name, then ts dot net. And tools complain about it, because whatever you serve there is either plain HTTP or a self-signed certificate. And self-signed means it chains to nothing in anybody's root store. So by everything we just said, nobody has any reason to trust it.

B: So you need a real C A to sign it. But my home server isn't on the public internet. How does it pass the challenge?

A: That's the nice part. Tailscale controls the D N S for ts dot net, so it can do the D N S version of the ACME challenge for you. You turn on MagicDNS and HTTPS for your tailnet in the admin console, and then on the server you run the Tailscale cert command with your machine's name. It writes a real Let's Encrypt certificate and its key into the current folder. Check the Tailscale docs for the exact steps. And here's that Certificate Transparency consequence. The docs warn that your machine name and your tailnet name end up in the public logs. So pick names you don't mind being public. There's also Tailscale serve, which puts HTTPS in front of a local port for you, in the same docs. Then you serve something with nothing but the standard library. You make an ssl context in server mode, load the certificate and key into it, start a plain HTTP server on port eighty-four forty-three, and wrap its socket with the context. That wrap is the only thing that turns HTTP into HTTPS. Then from your Mac, curl should connect with no warnings and without the flag that skips verification. OpenSSL's client should show a Let's Encrypt chain. And your own chain checker should pass on it too. And since those certificates expire in ninety days, put the cert command on a schedule.

<!-- section: Measure -->

A: Then you measure, and the numbers tell a really clear story. These are from an M-series Mac, Python three point fourteen, October twenty twenty-six. One two-thousand-bit modular exponentiation, about fifteen milliseconds. X twenty-five five-nineteen, two key pairs and an exchange, about fifty microseconds. E C D S A, about thirteen microseconds to sign, forty to verify. RSA two thousand forty-eight, about three hundred thirty to sign, eighteen to verify. AES G C M over a hundred megabytes, about seven gigabytes a second. And the handshake with letsencrypt dot org read about three point nine kilobytes and wrote about one point five. Then you time the handshake itself, with a little script that separates the three stages. It looks up the name first, to get D N S out of the way. Then times the T C P connect, which is about one round trip. Then times the TLS wrap on top. Three hosts. Google was about four to five milliseconds for T C P and fourteen to twenty-four for TLS. So TLS was three to five times the round trip. GitHub, about nine to twelve for T C P and about twelve for TLS, so about the same. And Let's Encrypt, about thirty for T C P and thirty-three for TLS. About one point one times.

B: [skeptical] Why is Google so lopsided, though? If TLS is one round trip, it should be about one times everywhere.

A: Because Google's only a few milliseconds away. When the server's far, like Let's Encrypt, TLS is about one extra round trip, plus a few milliseconds. That's the one-round-trip design, showing up right there on a stopwatch. A TLS one point two server would show about two. But when the server's really close, the round trip is tiny, so the fixed costs start to show. Google sends the bigger hybrid key share. There's a longer chain to verify, and the server's signature to check. Those become a visible fraction. And it's still tens of milliseconds at most.

B: So the crypto barely shows up at all.

A: Add up the crypto per handshake. One X twenty-five five-nineteen exchange, tens of microseconds. A signature check for each link in the chain, plus the certificate verify, tens of microseconds each. Altogether, well under a millisecond. Next to a thirty-millisecond round trip, the network is basically the whole cost. Which is why the things that actually speed up HTTPS aren't faster ciphers. It's connection reuse. Keep-alive, where you keep one connection open for many requests, and HTTP two, where lots of requests share one connection. And zero R T T. Those remove round trips. That's what you're actually paying for. And symmetric encryption's not the bottleneck either. At seven gigabytes a second per core, think of a ten gigabit network link. Gigabits, not gigabytes, so divide by eight, and that's one and a quarter gigabytes a second. Encrypting that takes a fraction of one core. The one gap that does matter is the two-thousand-bit exponentiation versus X twenty-five five-nineteen. Fifteen milliseconds versus fifty microseconds. A few hundred times. And that gap is why the web moved to curves, especially for servers doing thousands of handshakes a second.

<!-- section: Break It -->

A: Then you break it, on purpose. Four ways. First, reuse a nonce. In your seal script, encrypt two different twenty-byte messages with the same key and the same nonce. XOR the two ciphertexts together, leaving off the tags. Then XOR in the first message.

B: And out comes the second message?

A: Out comes the second message, exactly. When this was run, it printed it perfectly. You never touched the key. That's the number one way people break AES G C M in practice, and it's why TLS builds its nonces from a counter that goes up by one for every record. So they physically can't repeat. Second, ask for the wrong name. You connect to GitHub, but tell OpenSSL to check the certificate against a different hostname, example dot com. And you get "verify return code sixty-two, hostname mismatch". In Python, wrapping a socket to GitHub's address while claiming you wanted example dot com raises certificate verify failed, hostname mismatch.

B: But the chain itself is fine in that case, right? So why is it even an error?

A: The chain's perfectly valid. It's just valid for someone else. And that's exactly why the hostname check can't be skipped. Think about Mallory. She can go to Let's Encrypt and get a perfectly valid certificate. For her own domain. If your client checks the chain but forgets the hostname, she shows you her real, valid certificate, and you accept it. Wide open. Third, replay zero R T T. You make a self-signed certificate for localhost, run OpenSSL's test server with early data turned on, connect once to save a session ticket, and then resume twice with the same ticket, sending the same early request each time. There's a one-second pause in there, so that first connection stays open long enough to actually receive its ticket. When this was run, the first resumption said "early data was accepted", and the second, same ticket, said "early data was rejected". That's OpenSSL's anti-replay protection. Then you restart the server with anti-replay switched off, and do it again, and both get accepted. The server just ran the same request twice. Now imagine it was a payment. Fourth, leave out an intermediate. In your chain checker, drop the second intermediate and see which check fails. Then think about it from the server's side. A server configured with only its leaf certificate often still works fine in browsers—

B: [jumping in] And fails in Python. I've had exactly that. Works in Chrome, breaks in requests.

A: That's this. Browsers cache intermediates they've seen before, and some will go fetch a missing one. Curl and Python don't. It's one of the most common real "SSL error" causes, and now you can diagnose it with one OpenSSL command. Look at what the server sends. If the chain stops at the leaf, there it is.

<!-- section: Scaling -->

B: Okay, so scale it up. Say a service is doing fifty thousand brand-new TLS connections a second. Where does the cost go?

A: Per handshake, the server does one key exchange, X twenty-five five-nineteen or the hybrid, and one signature. Tens to a few hundred microseconds of CPU, depending on the algorithm. And the certificate's key type matters a lot here, because that decides the signature. E C D S A signs in about thirteen microseconds. RSA two thousand forty-eight, about three hundred thirty. So a certificate with an RSA key costs roughly twenty-five times more server CPU per handshake.

B: [working it out] So at fifty thousand a second... thirteen microseconds each is, what, about two thirds of a second of CPU every second. Under a core.

A: Under one core, just for signing. And with RSA it's about sixteen and a half seconds of CPU every second, so sixteen-plus cores just for handshakes. Symmetric encryption, meanwhile, is cheap. Several gigabytes a second per core. So the playbook is: use E C D S A certificates and X twenty-five five-nineteen. Make clients reuse connections, keep-alive, HTTP two, so most requests never do a handshake at all. Resume with tickets, so most of the rest skip the full one. And terminate TLS on a tier you can scale out sideways, load balancers or a C D N. Which also moves the handshake's round trip physically closer to the user. And that's actually the bigger win, because latency, not CPU, is what users feel.

<!-- section: Connections and close -->

A: And this slots right into the sequence of what happens when you hit enter. D N S lookup, then the T C P handshake, then this, then the first HTTP byte. Count the round trips from each and you can predict a cold request's latency from a ping time. And when you write an HTTP server from scratch, wrapping its socket with ssl, like the home-server script, is the only change you need for HTTPS. If you want to go further, the original Diffie and Hellman paper is short and surprisingly readable. And there's a site called The Illustrated TLS one point three Connection, by Michael Driscoll, that annotates every byte of a real handshake. Open it next to your Wireshark capture.

B: [working it out] Okay, let me try the whole thing. Two machines agree on a key in public with Diffie-Hellman. Each one mixes its secret into a public number, they swap, and each mixes its secret in again, and they land on the same key, and anyone watching can't, because un-mixing is the hard direction. Then the certificate is what encrypts things after that, so a man in the middle can't read it. And all of it costs about one round trip.

A: [gently] Close, but one piece is backwards. The certificate never encrypts anything. Diffie-Hellman makes the key, and that key, run through H K D F, is what AES uses to encrypt. The certificate's job is identity. It proves the server's public key belongs to that hostname, through a chain up to a root that's already on your machine. And then the server uses the matching private key to sign the whole transcript, both Diffie-Hellman numbers included. That signature is what stops Mallory. So it's two ideas, doing two jobs. Diffie-Hellman for secrecy, signatures and certificates for identity. And the one round trip is the real cost. The math itself is microseconds.
