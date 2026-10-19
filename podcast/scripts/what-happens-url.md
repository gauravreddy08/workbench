<!-- section: Where did the second go? -->

A: [relaxed, thinking out loud] So here's a scene from your actual job. One of your agents at TinyFish loads a web page, and it takes well over a second. You open that same page in your own browser, and it's up in a fraction of that. Same page. So where did the rest of the time go?

B: Could be anything, honestly.

A: That's the problem. It could be looking up the name. It could be a slow handshake with a server on the other side of the world. It could be the server thinking. It could be twenty images fetched one after another. It could be one lost packet and a one-second timer. And every one of those has a different fix. If you can't split a page load into its pieces, you can't tell which one you're looking at.

B: Okay, so let me do the interview answer. You type the address, it goes to a DNS server, I guess, and gets back an IP address. That points to the actual backend server. Then it gets fetched in parts, code and assets and stuff, and then it gets rendered.

A: That's a good skeleton. Honestly, every bone's in the right place. What's missing is everything between the bones. And that's where both the interview points and the real bugs live. And there's one thing I'd push on straight away. That IP almost never points at "the backend". But we'll get there.

B: Fine. Fill it in.

A: The one idea to carry the whole way through is this. A page load is a few milliseconds of computing, wrapped in a lot of waiting. Almost all the time is messages crossing the distance and coming back. So the way to understand it is to count the round trips. A message there, a reply back.

<!-- section: The fastest request -->

A: The very first thing the browser does is try not to use the network at all. The fastest request is the one you don't make. If it fetched this thing recently, and the server said "you can keep this for an hour", it just uses its saved copy. Zero network.

B: And if I typed plain http?

A: That's a fun one. A naive browser would go out over plain http, unencrypted, get told "go to https instead", and start over. And that first unencrypted hop is a hole. Anyone on the coffee shop Wi-Fi can answer it instead of the real site. So sites send a header that says, for the next long while, only ever talk to me over https. That's HSTS. Once the browser's seen it, it upgrades the address itself before a single packet leaves. And for big sites, browsers ship with a built-in list, so even your very first visit is safe.

<!-- section: One text file -->

A: [warm] Then we need an address. And this part has a great origin story. In the seventies, the ARPANET had a few hundred machines, and the list of names and addresses for all of them lived in one text file. Maintained by hand, at one research lab in California. If you wanted your machine to have a name, you emailed them. Every site would download the whole file every so often.

B: [laughs] That can't have lasted.

A: It didn't. The file got big, downloading it became real traffic on its own, names clashed, and one office was the bottleneck for every change on the network. So in nineteen eighty-three Paul Mockapetris designed DNS, the domain name system. And two ideas from that design are still running everything today. First, split the names into a tree, where each owner runs their own branch. Second, let everyone keep answers for a stated amount of time.

B: And the old file?

A: Still on your Mac. It's the hosts file. Your machine checks it before it asks DNS anything.

<!-- section: A chain of askers -->

A: So you said "it goes to a DNS server". It's really a chain of askers, nearest first, and most of the time the answer comes from somebody's memory long before anything like a "real" DNS server gets asked. First the browser checks its own memory. Then it asks the operating system, which has a little shared cache for every program on the machine. When I measured that warm, it was a couple of milliseconds.

B: And if nobody local knows?

A: Then your machine sends one small question to whatever DNS server your network gave you. Often your router, which passes it on to your provider's server, or a public one. That's the recursive resolver, and it's the one that does the legwork. Its big trick is that it's shared. Thousands or millions of people ask the same one. So the answer for a popular site is almost always already sitting in its cache. That costs you one round trip.

B: [working it out] And when it really doesn't know, it walks the tree.

A: Right. And nobody in the tree knows the whole answer. The root servers at the top don't know where any website is. They only know who runs dot org, dot com, and so on. The dot org servers only know who's in charge of each dot org name. And that name's own server finally gives the real address. Each one just says, "not me, ask them".

B: That sounds like a lot of trips.

A: It would be, if it happened much. But every answer comes with a time to live. A TTL. "You may keep this for five minutes." Or two days, for things that hardly ever change, like who runs dot com. Every cache along the way counts down, and only asks again when it runs out. So a popular site's own server doesn't get a question per visitor. It gets about one per resolver, every few minutes. That's the whole reason DNS doesn't melt under billions of lookups a day.

B: Oh, and that's what "waiting for DNS to propagate" means.

A: That's exactly what it means. Nothing's travelling anywhere. Old answers are just sitting in caches until their time runs out. And the trade-off is the TTL itself. Long means fewer lookups. Short means you can move your site somewhere else quickly.

B: How do the root servers keep up with the whole world asking them?

A: A trick called anycast. Lots of machines in different cities all announce the same address, and the internet's routers just deliver you to the nearest one. So "a" root server is really hundreds of machines. The big public resolvers work the same way, which is why they answer in a few milliseconds from almost anywhere. And the part that made DNS stop being magic for me, a question is a tiny little packet. About thirty bytes. Sent over UDP, no handshake, one packet out, one packet back. I built one by hand out of raw bytes, sent it off, and read the answer back. It's just bytes.

<!-- section: Three round trips before anything -->

A: Now you have an address. So now you need a reliable connection, and that's TCP. It starts with a handshake. "I'd like to connect." "Okay, here's my side." "Got it." That's one full round trip before you can send anything.

B: And then https.

A: Then the encryption, TLS. Your machine and the server agree on keys, and the server proves it's really who it says it is, with a certificate. On modern TLS that's one more round trip. And a couple of useful things get sorted out in that same exchange. Your machine says which site name it wants, so one server can host thousands of sites and pick the right certificate. And the two sides agree which version of HTTP they'll speak.

B: Then the actual request.

A: Then the actual request, and the reply. That's one more round trip, plus however long the server thinks. So add it up. A fresh https request, before the first byte of the response shows up, is three round trips, plus DNS before all of it. To a server across the country, that's a big chunk of your page load before the server's even started its own work.

B: [skeptical] And if one of those handshake packets gets lost?

A: Then it gets ugly. The timer for resending a lost handshake packet starts at a full second. While I was measuring this, one connect to a big site took just over a second, when every other one took tens of milliseconds. Almost certainly one lost packet. Which is a perfect tail latency story. A rare lost packet turns a quick step into a second-long one.

<!-- section: Who actually answers -->

B: Okay, so then it reaches the backend.

A: This is where I'd push on your answer. For any big site, the address you got almost never belongs to the backend. It belongs to a CDN, a content delivery network. Companies like Cloudflare running servers in hundreds of cities. Those are called edge servers. Your handshakes happen with an edge server a few milliseconds away, not with that site's real servers across a continent.

B: And the edge just has a copy?

A: Sometimes. If it has a fresh copy of what you asked for, it answers right there. When I fetched a simple site, the response headers said, basically, served from cache, from a city nearby. If it doesn't have it, like a page that's different for every user, it forwards your request to that site's own servers, the origin. Usually over a connection it already has open, so you don't pay those handshakes across the ocean. And then behind that, a load balancer picks one of many app servers, and your request finally reaches code, which might check a cache, ask a database, call other services.

B: So a CDN makes everything fast.

A: A CDN makes round trips cheap. It doesn't make your server think faster. For a page that's built fresh for each user, the edge still has to go back and wait for the app. That waiting stays exactly as long as it was.

<!-- section: Asking for more -->

A: Now the response comes back. And it doesn't arrive in one piece. It streams in, packet by packet, and the browser starts reading the HTML as soon as the first bytes land. As it reads, it finds things it needs. Stylesheets, scripts, images, fonts. Each one is another request. Something you think of as one web page is often dozens of requests, sometimes over a hundred.

B: [a bit unsure] And each one does the whole DNS, handshake, encryption thing again?

A: That's the key question. If they did, pages would take seconds. They mostly don't, because connections are kept open and reused. Requests to the same site share a connection that's already done its handshakes. And it's also already warmed up, because a brand new connection starts out cautious. It sends a small amount, waits to hear back, then sends twice as much, and so on. So a fresh connection takes a few round trips just to download a medium-sized file, even on a fast link. A reused one doesn't.

B: But a different site...

A: Pays all of it again. A separate domain for images, a font service, an analytics script. Each new host needs its own lookup, its own handshake, its own encryption. That's why performance people go on about reducing the number of different hosts. And there's a version thing too. With the older HTTP, one connection could only carry one request at a time, so browsers opened several connections to each site, each paying its own handshakes. HTTP two puts lots of requests on one connection at once, interleaved. One set of handshakes, one warmed-up connection, everybody shares it.

B: So where do slow pages actually come from?

A: Usually chains. The font is always last, because nobody knows it's needed until the stylesheet has arrived and been read. So it's the HTML, then the CSS, then the font. Three waves, each costing at least a round trip. That chain is the shape of most slow pages. And then rendering, actually turning all of it into pixels, building the tree of elements, working out where every box goes, painting it. That's milliseconds, not round trips. On a first load, the network almost always wins.

<!-- section: The mystery forty milliseconds -->

A: When I built a little fetcher myself, from bare sockets, timing each phase, it was really satisfying. The connect time matched the ping time almost exactly. One round trip, nothing else. The encryption step was about one round trip plus a bit of number crunching. But the time to the first byte from my script kept coming out about forty milliseconds slower than curl's. To every site. Near or far.

B: Forty every time, regardless of distance?

A: Every time. And that's the clue. If a delay doesn't grow with distance, it's not travel. It's a timer. It turned out to be an old TCP rule, Nagle's algorithm. If you've sent a small packet that hasn't been acknowledged yet, hold the next small one back. The last message of my encryption handshake was small. My request, also small, came right behind it, so it got held. And the server was delaying its acknowledgment, hoping to tuck it into a reply. So each side waited on the other until a timer fired.

B: And the fix?

A: One socket option, TCP no delay, which turns that rule off. Curl and every browser set it, which is why they didn't have the problem. One line, and my time to first byte dropped right down. So the habit I'd take away is that one. When a latency number is suspiciously round and doesn't care how far away the server is, go looking for a timer.

<!-- section: Ending -->

B: Okay, let me redo my answer. Check the cache first, and upgrade to https if that site says to. Then DNS, which is mostly caches, and only rarely a walk down the tree. Then a TCP handshake, an encryption handshake, and the request, so three round trips before anything comes back. Usually that's to a CDN edge nearby, which either answers itself or goes back to the real servers. Then the HTML streams in, asks for more stuff over the same connection, and the browser draws it.

A: That's a really good answer. The bit I'd sharpen is what you do with it. Every one of those steps is either a round trip or it isn't, and almost all the time is the round trips. So when an agent's fetch is slow, don't start by making the server faster. Count. How many round trips did it take, how far away was each one, and which of them could have come from a cache, a reused connection, or a server next door?
