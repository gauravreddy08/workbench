# Outline: tls

Source: src/lessons/tls.mdx. Curriculum: "How does HTTPS keep secrets?" How do two machines that
have never met agree on a secret over a public network?

## The one big idea

HTTPS solves two separate problems with two separate ideas. Secrecy: two strangers can build a
shared key in public because some operations are easy to do and practically impossible to undo
(mixing paint). Identity: that alone loses to someone in the middle, so the server signs the
conversation with a key that a trusted third party has vouched for (a certificate). Everything
else, including every "SSL error", is a step in that choreography.

## Opening scene

The café. Calling a model endpoint with an API key in the header. Everyone between you and the
server can copy every packet. You'd encrypt, but the server needs the key, and you can't send it.

## Wrong mental model B voices

- "Just send the key encrypted" / "the server sends you its key" (the bootstrapping loop).
- "HTTPS encrypts everything", including who you're talking to.
- "Encryption is what makes HTTPS slow."
(The lesson has no quoted diagnostic for this topic; these are the natural wrong models.)

## Story beats

1. Café problem: you share no secret with a server you've never met; it sounds impossible.
2. History: before the mid seventies keys moved by courier; Diffie and Hellman (building on
   Merkle) show a public way in nineteen seventy-six; GCHQ found it first and kept it secret;
   RSA a year later; nobody used it much until Netscape needed credit cards on the web.
3. Paint: mixing easy, un-mixing impossible. Both sides end at the same colour; Eve mixing the
   two pots gets the wrong shade. Real computers use arithmetic that is easy forward, hard back;
   today an elliptic curve.
4. Mallory: someone who can change packets runs two exchanges and relays. Better math can't fix it.
5. Signatures (wax seal that also covers content) and certificates (passport; your computer ships
   trusting a list of roots; roots sign intermediates which sign the server). Let's Encrypt and
   the automated challenge. DigiNotar, and public logs of every certificate.
6. The handshake: client guesses and sends its share first, so it costs one round trip. Server
   signs the whole transcript, so Mallory's swap shows. Return visits can skip the wait, but that
   first message can be replayed, so only safe requests.
7. Forward secrecy: fresh throwaway secrets per connection; stealing the server key next year
   doesn't open recordings from today. Old style did.
8. What it doesn't hide: who you talk to, the hostname in the first message, sizes and timing
   (token sizes in streamed chat). Measure insight: crypto is cheap, round trips are the cost.
   Errors map to steps; the home server cert over Tailscale and its name landing in public logs.

## Numbers worth saying

- nineteen seventy-six (the paper)
- one round trip for the handshake
- ninety days for a Let's Encrypt cert

## Left to the written lesson

The modular arithmetic example and its numbers, AES-GCM details and nonce reuse demo, ML-KEM hybrid,
key derivation, message names beyond CertificateVerify, all openssl/Wireshark/Python tasks,
every measured timing, the scaling question, the HelloRetryRequest and ChangeCipherSpec camouflage.
