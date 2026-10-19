# Outline: what-happens-url

## The one big idea

A page load is a few milliseconds of computing wrapped in a lot of waiting. Almost all the time is
messages crossing the distance and back, so the way to understand (and fix) a slow page is to count
round trips: which steps cost one, which tricks remove them, and what's left when they're gone.

## Opening scene

At TinyFish, an agent loads a page and it takes well over a second. The same page in his own browser
takes a fraction of that. Where did the rest go? DNS, a far-away handshake, a slow server, images
one after another, one lost packet and a one-second timer? Each has a different fix.

## The wrong mental model B voices

His diagnostic answer, said as B's own: "It goes to a DNS server, I guess, gets an IP that points
at the actual backend server, the page gets fetched in parts, code and assets, and then rendered."
A good skeleton; what's missing is everything between the bones, and that the IP rarely points at
"the backend" directly.

## Story beats

1. The scene: the slow agent fetch, and why you can't fix it without splitting the load into
   phases. B gives his skeleton answer; A says every bone is right.
2. Before the network: the fastest request is the one not made. Browser cache; HSTS (named) so
   even typing http never sends a plaintext packet.
3. History: one hand-maintained text file for the whole ARPANET, emailing a lab to get a name.
   Mockapetris, nineteen eighty-three: a tree where every owner runs their own branch, and
   everyone may cache answers for a stated time. The old file survives as the hosts file.
4. DNS (named) as a chain of askers, nearest first: browser, operating system, the shared resolver
   that does the legwork and whose cache is almost always warm, then (rarely) the tree walk: root,
   top-level domain, the domain's own server. TTL (named) is the whole scaling story, and why
   "propagation" is really old answers sitting in caches. Anycast in a sentence. And a DNS question
   is a tiny UDP packet you can build by hand.
5. Connecting: the TCP handshake, one round trip; TLS (named), one more, where the hostname and the
   HTTP version are agreed. Then the request, one more. Three round trips before the first byte of
   a fresh HTTPS page. A lost handshake packet costs a whole second: a tail latency story.
6. Who answers: not "the backend". A CDN edge (named) nearby does the handshakes and may answer
   from its cache; otherwise it forwards over a connection it already has open to the origin, a
   load balancer, the app, the database. A CDN makes round trips cheap; it doesn't make the server
   think faster.
7. The page asks for more: HTML streams in, the browser parses as it arrives and finds CSS,
   scripts, images, fonts. A fresh connection starts slow and speeds up each round trip. Reused
   connections skip all of it; each new host pays its own handshakes. HTTP two puts many requests
   on one connection. The font always comes last: HTML, then CSS, then font is a chain of round
   trips, the shape of most slow pages. Rendering is milliseconds, not round trips.
8. When I built it: the suspicious extra forty milliseconds on every fetch from my own script,
   fixed by one socket option (Nagle meets delayed acks). Rule: a round number that doesn't scale
   with distance is a timer.

## Numbers worth saying

Nineteen eighty-three; three round trips to first byte on a fresh connection; a one-second timer for
a lost handshake packet; the forty-millisecond stall.

## Left to the written lesson

URL parts table, punycode, service workers and 304s, the full DNS record types, Happy Eyeballs, the
byte layout of a DNS query and name compression, SNI and ALPN details, the HTTP request and response
text, status codes, cookies, slow start arithmetic, preload scanner, HTTP one versus two connection
limits, render pipeline stages, the waterfall model numbers, all measured timings, Build It code,
curl and dig and DevTools walkthroughs, Break It cases (hosts file, SNI mismatch, keep-alive),
Explain It Back.
