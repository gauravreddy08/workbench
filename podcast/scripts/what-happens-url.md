<!-- section: The Problem -->

A: [relaxed, thinking out loud] So here's a thing that happens at TinyFish. One of your agents loads a web page, and it takes one point four seconds. You open the exact same page in your own browser, and it's up in, like, three hundred milliseconds. Same page. So where did the other one point one seconds go? Was it looking up the name? A slow handshake with some server on the other side of the world? The server thinking? Twenty images fetched one after another? Or a single lost packet and a one-second retry timer? Every one of those has a different fix. And if you can't split a page load into its pieces, you honestly can't tell which one you're looking at.

B: Yeah, I'd have no idea where to even start.

A: So let's start with the interview version. Someone asks you: you type a U R L into the browser and press enter. What happens?

B: [a bit unsure] Okay. It goes to a D N S server, I guess. That gives you back an I P address, and the address points to the actual backend server. Then the page gets fetched in parts, you know, the code, the assets, and then it gets rendered.

A: [warmly] That's a good skeleton. Honestly, every bone's in the right place. Name lookup, address, server, pieces, rendering. What's missing is everything between the bones. And that's where the interview points are, and it's also where the real bugs live, like the one point four seconds. So we're gonna take that skeleton and fill in every gap. And then you time each piece on your own machine.

<!-- section: Origin -->

A: Start with the first bone, the name lookup, because it has a great origin story. In the nineteen seventies the ARPANET, the network that turned into the internet, had a few hundred machines on it. And the mapping from machine names to addresses lived in a single text file. Called hosts dot T X T. Maintained by hand, at the Stanford Research Institute. If you wanted your machine to have a name, you emailed them. And every site on the network would periodically download the whole file.

B: [amused] The entire internet's phone book, emailed around.

A: Pretty much. And it broke as the network grew. The file got big. The downloads turned into heavy traffic all on their own. Names collided. And one office was the bottleneck for every single change. So in nineteen eighty-three a guy named Paul Mockapetris published the design for the Domain Name System. D N S. That's R F Cs eight eighty-two and eight eighty-three, refined in nineteen eighty-seven as ten thirty-four and ten thirty-five. And it has two big ideas that are still running today. One, split the space of names into a tree, where each owner runs their own branch. And two, let everyone cache the answers, for a stated amount of time.

B: So nobody holds the whole book, and everyone keeps copies for a while.

A: That's it. Those two ideas are basically the whole D N S story, they'll keep coming back. And the old file never actually died. It's the etc hosts file on your Mac. Your machine still checks it before it asks D N S. It's like the ghost of hosts dot T X T.

<!-- section: The Idea: The whole trip -->

A: Okay, so let me give you the whole map first, and then we walk it stop by stop. You type en dot wikipedia dot org slash wiki slash Cat, and press enter. And there are about fourteen stops between that and pixels. Picture them in three rows. The top row is "find and connect", and all of it happens before a single byte of the page is even requested. Parse the U R L, that's microseconds. Check the caches and a security rule called H S T S, microseconds to a millisecond or so. Then D N S, anywhere from zero to a hundred-plus milliseconds. Then the T C P connection, which costs one round trip. Then the encryption setup, T L S, which costs one more round trip.

B: [jumping in] When you say round trip—

A: A round trip is the time for a message to go from you to the other machine and for a reply to come back. Seattle to Virginia, about seventy milliseconds. Within one city, a few. People write it R T T, round-trip time. Okay, second row, "ask and answer". The H T T P request goes out, that's half a round trip. It lands on a C D N edge server, which, if it already has the page, answers in about a millisecond. If not, it forwards. Then a load balancer, a tenth of a millisecond to a millisecond. Then the app server, anywhere from one to five hundred milliseconds. Then the database, a tenth of a millisecond to a hundred. Third row, "draw". The response streams back, half a round trip plus however long the bytes take. The browser parses the H T M L as it arrives. It finds more things to fetch, the C S S, the JavaScript, images, fonts. And then it renders, which is milliseconds per frame. And there's one little arrow off to the side that says: steps three to eleven, the whole network part, repeat for every new host.

B: [skeptical] So my instinct is the slow part is the app server, right? Five hundred milliseconds, that's the biggest number on the list.

A: It can be. But look at what actually adds up. The steps that cost round trips are D N S, T C P, T L S, and the request itself. And round trips are the currency of web performance. Remember the latency numbers stuff: your CPU can do millions of things in the time one packet crosses the country and comes back. So a page load is slow mostly because of how many times it has to wait for the other side. Not because anything's computing hard. Like, the server can think for fifty milliseconds and the page still takes a second, because it waited on the network a dozen times.

B: So count the waits, not the work.

A: Count the waits. Okay. The stops.

<!-- section: The Idea: Parsing the URL -->

A: Stop one. The address bar first decides whether you typed an address or a search. "Cat pictures" goes to your search engine. "en dot wikipedia dot org slash wiki slash Cat" looks like an address, so the browser treats it as one. It assumes H T T P S if you left that off, and it splits it into parts. U R L stands for Uniform Resource Locator, and it's just a string that says how to reach a thing, where it is, and which thing. So take the long form: H T T P S, colon slash slash, en dot wikipedia dot org, colon four four three, slash wiki slash Cat, question mark lang equals en, hash Behavior. The H T T P S at the front is the scheme, which protocol. And H T T P S means plain H T T P, but inside an encrypted T L S connection. Then the host, en dot wikipedia dot org. That's the name D N S is going to turn into an I P address. Then the port, four four three.

B: Which I never type.

A: You never type it, because it's the default. Four four three for H T T P S, eighty for plain H T T P. A port's just a number that picks which program on the machine gets the connection. One I P address, lots of ports. Four four three's the web, twenty-two is S S H, fifty-three is D N S. Then the path, slash wiki slash Cat, which thing on the server, and the query, lang equals en, extra parameters. Both of those get sent in the request. And then the fragment, the bit after the hash, Behavior. That one is never sent to the server.

B: [surprised] Never? Then how does it end up on the right section?

A: The browser keeps it to itself, and after the page loads it scrolls to that spot. The server has no idea you asked for it. One more small detail. If the hostname has non-English characters, say münchen dot de with the umlaut, it gets converted into a plain ASCII form before D N S ever sees it. It ends up as x n dash dash, then a sort of scrambled ASCII version of the name. That's called punycode. Because D N S was built for ASCII, back in the eighties, and nobody was going to change every server on earth.

<!-- section: The Idea: Caches and HSTS -->

A: Stop two. The fastest network request is the one you don't make. So before anything goes out, the browser checks a few places. First: is this page already cached? Browsers keep an H T T P cache, a store on disk and in memory of earlier responses. If an earlier response came with a header saying "cache control, max age thirty-six hundred", that's seconds, so the browser can reuse it for an hour. Zero network. If the copy is older than that, the browser can check it cheaply. It asks the server, basically, "has this changed?" And if it hasn't, the server answers with a status called three oh four, not modified, with no body. And there's one more thing that can sit in front of all of that. A site can install a service worker. That's a script the site registers that sits between the page and the network, inside your browser, and it can answer requests itself. That's how web apps work offline.

A: The second check is: must this site be H T T P S? Say you typed H T T P, not H T T P S. A naive browser would connect on port eighty, in plain text, get told "go to the H T T P S version instead", and start over. And that first plain-text hop is a security hole.

B: [skeptical] Why? It's just a redirect.

A: Because it's not encrypted, so anyone on the café Wi-Fi can answer it instead of the real site. They can hand you whatever they want, and you never get to the secure version. So, H S T S. HTTP Strict Transport Security. It's a response header a site sends that tells the browser: for the next however-many seconds, only ever talk to me over H T T P S. Once you've seen it, the browser rewrites H T T P to H T T P S itself, before any packet leaves your machine. In Chrome's DevTools that shows up as a fake redirect, a "three oh seven internal redirect". It never touched the network. And for big sites, browsers ship a built-in list, the H S T S preload list, compiled right into Chrome, of domains that are H T T P S-only from the very first visit. So even your first-ever request can't be downgraded. When you run the fetch script later, you'll see Wikipedia's version of the header. The max age on it is about a hundred and six million seconds. Which is about three years.

B: [laughs] They're pretty sure.

A: They're pretty sure. Okay. So if nothing's cached, we need to talk to a server. And for that we need its address.

<!-- section: The Idea: DNS, the chain of askers -->

A: Computers on the internet are reached by I P addresses. An I P address is a number that identifies a machine's network connection. The old kind, I P version four, is thirty-two bits, written as four numbers with dots, like one ninety-eight dot thirty-five dot twenty-six dot two twenty-four. The newer kind, version six, is a hundred and twenty-eight bits, written as a long hex string with colons. People use names. And D N S is the phone book between them. It's a worldwide distributed database that maps names to records, like addresses. Now, you said "it goes towards a D N S server". The thing is, there's a whole chain of them. And most of the time, the answer comes out of a cache long before anything like a "real" D N S server gets asked.

B: [a bit unsure] Huh. So my picture was, my laptop sends "where's wikipedia" to some D N S server, and that server just knows.

A: [gently] Yeah, and the true picture is more like a chain of people you ask, nearest first, where most of them only remember things. So, nearest first. The browser's own cache. Chrome keeps names it recently looked up in memory for about a minute. Hit there, zero cost. If the browser doesn't know, it asks the operating system, through a C function called get addr info. The part of the OS that handles that is called the stub resolver. It's a small D N S client built into the OS, and the important thing is, it doesn't look anything up itself. It checks the etc hosts file, checks its own cache, and if neither has it, it forwards the question to some configured D N S server and waits. On macOS that's a background service called m D N S Responder, and its cache is shared by every program on the machine. If that cache has the answer, you get it in well under a millisecond, plus the cost of asking the service. From Python, on a warm cache, that comes out to about one to three milliseconds. And if the OS doesn't have it, then the stub sends one small U D P packet to whatever D N S server your network handed you. At home that's often your router, which then forwards it on to your I S P's resolver, or to a public one, like Google's at eight eight eight eight, or Cloudflare's at one one one one. On a Mac you can see which one with a command called s c util, dash dash d n s. And that server is the recursive resolver. It's the one that does the legwork. It takes your question, finds the answer, walking the whole tree from the top if it has to, and then caches the result for everyone who asks after you. And that's its big trick. It's shared. Thousands, millions of people ask the same resolver, so the answer for en dot wikipedia dot org is almost always already sitting in its cache. A hit there costs you one round trip to the resolver. Typically five to thirty milliseconds.

B: So the "D N S server" I was picturing is really this resolver, and it mostly just... remembers stuff other people asked.

A: Mostly, yeah. It only goes and does real work when it also doesn't have the answer. And then it asks the tree, from the top.

<!-- section: The Idea: Walking the DNS tree -->

A: Picture it like this. On the left, your laptop, with its little stack of caches inside: the browser cache, the hosts file, the OS stub and its cache. An arrow out to a box in the middle, the recursive resolver, with its big shared cache. And off to the right, three servers stacked top to bottom, and the resolver asks them in order. Each one of those arrows is one U D P question and one answer, anywhere from about five to eighty milliseconds.

A: [amused] The first one is a root server. The root servers sit at the very top of the tree, and here's the funny thing, they don't know any website's address. They only know who runs each top-level domain. So the resolver asks a root server about en dot wikipedia dot org, and the root says, basically, "no idea, but here are the servers for dot org, go ask them". There are thirteen root server names, a dot root dash servers dot net through m. But each name is served by hundreds of physical machines all over the world, we'll get to how. And the resolver ships with their addresses built in, so it never has to look them up.

A: Second, the top-level domain servers. T L D. That's the last label of a name, com, org, io, uk. Each one's run by an organization called a registry, with its own name servers. The dot org servers don't know Wikipedia's address either. They know which name servers are in charge of every dot org domain. So they say "ask n s zero dot wikimedia dot org".

A: And third, the authoritative name server for wikipedia dot org. That's the server holding the real, official records for the domain, set by whoever owns it. Wikimedia runs its own. For lots of sites it's Cloudflare, or Amazon's Route fifty-three, someone like that. It's the source of truth. Everything else in this whole chain is a cache. And it finally answers. In this case it says en dot wikipedia dot org is really an alias for dyna dot wikimedia dot org, and that one's at one ninety-eight dot thirty-five dot twenty-six dot two twenty-four, and you can keep that for a hundred and eighty seconds.

B: [working it out] So it's the nineteen eighty-three idea. The root only knows the T L Ds, the T L D only knows who runs each domain, and the domain owner knows the actual answer.

A: That's it. Nobody holds the whole phone book. And everything the resolver learned along the way gets cached, each piece for its own time. So the next lookup for anything under dot org skips the root, and the next lookup for anything under wikipedia dot org skips the dot org servers too. You'll actually watch this happen live, hop by hop, with a tool called dig, in the build.

<!-- section: The Idea: Records -->

A: So what does an answer actually look like? The data in D N S is a set of resource records. One entry: a name, a type, a time to live, and a value. There are four types you'll keep running into. An A record, the letter A, maps a name to an I P version four address. Example dot com, type A, one oh four dot twenty dot twenty-three dot one fifty-four. A quad A record, four A's, maps a name to an I P version six address. A C name record says "this name is an alias, go look up that one instead". Like www dot wikipedia dot org is a C name for dyna dot wikimedia dot org. And an N S record says "these servers are authoritative for this zone". Example dot com's N S records point at Cloudflare's name servers.

B: Why would you even want an alias?

A: That's how most sites hand their traffic to a C D N or a cloud provider. You set www dot your site dot com as a C name for your site dot some C D N provider dot net, and now the provider controls what that resolves to. They can change it whenever they want without touching your D N S. The catch is each hop in a C name chain can need its own lookup.

A: Also, most answers have several A records, not one. Example dot com came back with two. The browser picks one and can fall back to another if it doesn't answer. And if both I P version six and version four addresses come back, modern browsers race them. They try version six first, then start version four a few hundredths of a second later, and keep whichever connects first. So a broken version six path doesn't stall the page. And that trick has the wonderful name Happy Eyeballs.

B: [laughs] Somebody had fun naming that.

A: Somebody did. It's an actual standard, R F C eighty-three oh five.

<!-- section: The Idea: TTLs -->

A: Now the part that makes all of this survive. Every record carries a T T L, time to live. It's how many seconds a cache is allowed to keep this answer before it has to ask again, and the domain owner sets it. Example dot com, type A, T T L three hundred, means you may cache this for five minutes. And every cache in the chain, the browser, the OS, your router, the recursive resolver, counts down from whatever it received. When it hits zero, it asks again.

B: [skeptical] Okay, but there are billions of lookups a day. How does Wikipedia's name server not just melt?

A: That's exactly what the T T L is for. That's the whole scaling story of D N S. The authoritative server for a popular domain doesn't get one query per page view. It gets roughly one query per recursive resolver, per T T L. Google's public resolver might be serving millions of people asking for wikipedia dot org. But it only goes to Wikimedia's name servers once every few minutes for it. Everybody else is reading Google's cached copy. And the hierarchy helps too. The records for who runs each T L D have long T T Ls, days, so resolvers almost never have to ask the root at all.

B: So the trade-off is just, how long you set the T T L.

A: Yeah, it's the T T L itself. Long T T L means fewer queries and faster lookups. Short T T L means you can change your mind quickly. Move to a new server, or fail over away from a data center that died. So, you know when people say "D N S changes take time to propagate"?

B: Yeah, I always pictured the change sort of... spreading out across the internet. Server to server.

A: [gently] That's what it sounds like. But nothing's spreading. What they really mean is, the old answers are still sitting in caches until their T T Ls run out. Nobody pushes the new answer anywhere. Each cache just finds out the next time it asks. And you can see the range in real numbers. The N S records for dot com had a T T L of a hundred seventy-two thousand eight hundred seconds. That's two days, because those almost never change. Wikimedia's actual address record, the dyna dot wikimedia dot org one, had a hundred and eighty seconds. Three minutes. Short enough that they can steer users away from a data center within minutes.

<!-- section: The Idea: Anycast and UDP -->

B: Okay, wait, back to the root servers. You said thirteen names. How does "the" root server answer quickly from Seattle and from Singapore?

A: Anycast. Many machines in different places all announce the same I P address to the internet's routers. And the routers just deliver your packet to whichever one is closest, in network terms. So those thirteen root names are served by well over a thousand machines worldwide, lots of them sharing an address. Eight eight eight eight and one one one one work the same way, which is why both of them answer in a few milliseconds from almost anywhere. And you'll meet this trick again at the C D N stop. Same idea, it routes you to the nearest edge server.

A: One more thing about how these questions travel. D N S mostly goes over U D P. Quick reminder of what that is: T C P is the careful transport, it sets up a connection with a handshake first and guarantees your bytes arrive in order. U D P is the bare one. You send one packet, maybe you get one packet back, no setup at all. That's why a D N S lookup can cost just one round trip. And when an answer is too big to fit in one U D P packet, the server sets a "truncated" flag and the client asks again over T C P.

<!-- section: The Idea: Predict, counting DNS questions -->

A: So try one. You visit a page on blog dot example dot io, for the first time ever. And, this is unrealistic, but go with it, nobody using your I S P's resolver has visited any dot io site in the last two days. How many D N S questions get sent across the network in total, counting every hop? And then a minute later you look up shop dot example dot io. How many for that?

B: [working it out] Okay. First time... my machine asks the resolver, that's one. The resolver asks a root, two. Then the dot io servers, three. Then example dot io's own server, four. So four. And shop dot example dot io... it's a different name, so the resolver doesn't have it. But it's cached the rest, so... one? Just me asking the resolver?

A: [warmly] Four's right. Four questions crossing the network, plus four answers. And if the name had been a C name pointing somewhere else, say a C D N, you'd add more for the target. But the second one's two, not one. Your stub asks the resolver, that's one. The resolver does still have to go out, because it's never seen shop. But it already has the dot io and the example dot io N S records cached, with days and hours of T T L on them. So it skips the root, skips the T L D, and goes straight to example dot io's authoritative server. Two.

B: Right, it knows who to ask, it just doesn't know the answer.

A: Exactly that. And if you looked up blog dot example dot io again within its T T L, it's zero or one. Your OS cache answers, or the resolver does.

<!-- section: The Idea: A DNS message, byte by byte -->

A: Okay, here's the part that makes D N S stop being magic. A D N S question is about thirty bytes. And you can write every single one of them yourself. The whole query for example dot com is twenty-nine bytes. Twelve bytes of header, then seventeen bytes of question.

A: The header is six little two-byte fields in a row. The first is an I D, two random bytes, so you can match the answer to the question. Then the flags. For a normal query that's zero one zero zero in hex, and the one bit that's set there means "recursion desired". It's you saying, please do the whole walk for me. Then four counts. How many questions, that's one. How many answers, how many authority records, how many additional records, all zero, because you're asking, not answering.

A: Then the question. And the name isn't written with dots. It's written as labels, each one with its length in front. So it's the byte seven, then the seven letters of "example". Then the byte three, then "com". Then a zero byte, which means end of name. No dots on the wire at all. Then two bytes for the type, which is one for an A record, and two bytes for the class, which is one, meaning internet. Seven plus one for the length byte, three plus one, the zero, and four for type and class. That's your seventeen.

B: And the answer just echoes all that back, plus the address?

A: Pretty much. Same header, same question echoed back, and then the answer records. Each one is the name, a type, a class, then the T T L as four bytes of seconds, then a two-byte length, then the actual data. For an A record that's four bytes, the I P version four address. But the name part is clever. Instead of spelling "example dot com" out all over again, it's just two bytes, C zero, zero C.

B: [a bit unsure] That doesn't look like a name.

A: It isn't. That's name compression. D N S saves space by replacing a repeated name with a two-byte pointer back to where it already appeared in the message. If a byte's top two bits are both ones, that's not a length, it's the start of a pointer. And the other fourteen bits are a position in the message. Here they say twelve. And byte twelve is exactly where the question's name starts, right after the twelve-byte header. So it means "same name as up there". When I built one by hand, the query was twenty-nine bytes, and the answer, with two A records of sixteen bytes each, was sixty-one. And that's the entire cost of a D N S lookup on the wire. Two small packets.

<!-- section: The Idea: TCP handshake -->

A: Okay. Now we have an I P address. To send an H T T P request we need a reliable byte stream to that machine, which is what T C P gives you. And T C P starts with a three-message handshake. A handshake's just a short exchange at the start of a connection so both sides agree it exists, and agree on starting numbers, before real data flows. Your machine sends a packet called a SYN, short for synchronize, to port four four three. It says, "I'd like to connect, and my byte numbering starts at X." The server replies with a SYN-ACK: "Okay, got yours, and mine starts at Y." And you send an ACK: "Got yours."

B: [working it out] So that's three trips across the network. One and a half round trips before you can send anything?

A: [jumping in] One. Your third message can carry data with it. So you don't wait after the ACK, you just put the start of your request right on it. So the handshake costs exactly one full round trip before you can start sending. From Seattle to a server in Virginia, that's about seventy milliseconds of pure waiting. To a Cloudflare server in your own city, about five. And that difference, multiplied by every round trip in a page load, is basically why C D Ns exist.

A: [serious] And there's one nasty detail here. If the SYN or the SYN-ACK gets lost, your machine waits for a retransmission timer before it tries again. And that timer starts at one second. One whole second. While I was testing all this, a connect to github dot com took one thousand and thirteen milliseconds, once, on a run where every other connect took about thirty.

B: [surprised] Oh. That's the one point four seconds, maybe. From the start.

A: It could be. That's almost certainly one lost packet and one one-second timer. And it's a good example of why tail latency gets ugly, why the slowest one percent of requests look so bad. A rare lost packet turns a thirty-millisecond step into a thousand-millisecond one. And when you see a number like that, it's not that the server's slow, it's a timer.

<!-- section: The Idea: TLS -->

A: Stop five. H T T P S means the H T T P conversation runs inside T L S, Transport Layer Security. It's a protocol on top of T C P that encrypts the bytes and proves the server is who it says it is. It does that with a certificate, which is a file holding the server's public key and its name, signed by a certificate authority that your OS or browser already trusts. That's how you know you're talking to the real wikipedia dot org. How two strangers agree on a key in public, and how certificates chain up to someone you trust, that's a whole topic of its own, and it's next. For now, three facts.

A: First, T L S one point three costs one round trip. Your first message, called the ClientHello, already includes your half of the key exchange. You basically guess which method the server's going to pick and send your part up front. And the server answers with its half, its certificate, and "finished", all in one go. The older version, T L S one point two, needed two round trips. Every site you'll test speaks one point three.

A: Second, the hostname you want is sent in that very first message, in the clear. That's called S N I, Server Name Indication.

B: [skeptical] In the clear? Isn't the whole point that it's encrypted?

A: The content is. But the name has to go first, because one I P address, one C D N server, might host thousands of different sites, and it needs to know which certificate to show you before any encryption exists. That's how one Cloudflare I P serves millions of different sites. So yeah, someone watching the network can see which site you asked for, just not what you said to it.

A: Third, the protocol gets chosen here too. The client lists which H T T P versions it speaks, version two, version one point one, and the server picks one. That step's called A L P N, Application-Layer Protocol Negotiation. And it rides along in the same messages, so no extra round trip.

<!-- section: The Idea: Round trips to first byte -->

A: So here's the full count, for a fresh connection. Picture two vertical lines, you on the left, the server on the right, and time running downward. Every packet's a diagonal line crossing between them, and each crossing takes about half a round trip. At the top, before anything, a little D N S box. Then the SYN going right, the SYN-ACK coming back. That's T C P, one round trip. Then your ACK, with the ClientHello riding on it, carrying the S N I, the A L P N list, and your key share. The server's hello, certificate, and finished come back. That's T L S, one more round trip. Then your finished, plus the actual request, get slash wiki slash Cat, goes across. The server sits there and thinks for a bit. And then the first bytes of the response come back, followed by the rest of the body.

B: [working it out] So that's three round trips before the first byte. At eighty milliseconds a round trip... two hundred forty?

A: Two hundred forty milliseconds of pure travel. And that's before the server's thinking time is even counted, and before D N S, which happened before all of it. And there's a newer protocol that cuts into that. H T T P three runs over Q U I C, which everyone says like "quick". It's built on U D P, and it folds the transport handshake and the T L S handshake into a single round trip. When you fetch example dot com, you'll see a header called alt svc that says h three. That's the server advertising it. Browsers switch to it on later visits.

<!-- section: The Idea: The HTTP request -->

A: Stop six. At last, the actual question. H T T P is a text protocol, and an H T T P one point one request is short enough to type by hand, which you'll actually do. The first line is three things: the method, get, then the path, slash wiki slash Cat, then the version. Then a few header lines. Host, en dot wikipedia dot org. A user agent saying what browser you are. Accept, saying you'd like H T M L. Accept-Encoding, gzip or brotli, which means "you're allowed to compress the response". And maybe a cookie. Then an empty line, which means "that's the end of the headers".

A: The method is the verb. Get to read, post to create or submit something, and then put, patch, and delete. And a get should never change anything on the server. After the method comes the path, plus the query if there is one. And notice the fragment isn't in there. Headers are just name, colon, value lines carrying metadata. Host is required, because one I P can serve lots of sites, and this says which one you mean.

B: And the cookie is how it knows I'm logged in?

A: Yeah. H T T P itself has no memory between requests. Every request stands alone. So a server that wants to remember you sends a header called Set-Cookie, say "session equals abc one two three", in a response. And your browser stores that and attaches "cookie, session equals abc one two three" to every request to that site from then on. That's what "logged in" is. A little string your browser keeps handing back.

A: Now, browsers actually speak H T T P two to most sites, which sends the same information as compact binary frames instead of text. But the meaning, method, path, headers, is identical. And the response comes back the same shape. A first line with a status code, "two hundred, OK". Then headers: content type is H T M L in U T F eight. Content length, about a hundred and twenty-four thousand bytes. A cache control header. Maybe a Set-Cookie. Then an empty line, then the body, the H T M L itself.

A: The status code is a three-digit number on every response, and the first digit's the family. Two hundreds mean success. Three hundreds mean go elsewhere, so a redirect, or that three oh four, "use your cached copy". Four hundreds mean you asked wrong. Four oh four not found, four oh one not logged in, four twenty-nine too many requests. Five hundreds mean the server failed.

A: And the time from sending the request to getting the first byte of the response has a name. T T F B, time to first byte. It's one round trip plus however long the server took to start answering. And that's the number that tells you whether the server is the slow part.

<!-- section: The Idea: Who actually answers -->

A: Okay. You said the I P "points to an actual backend server". For a big site, it almost never does. Not directly. The I P you got belongs to the first machine in a whole line of them.

A: The first one's a C D N edge. A content delivery network is a company, Cloudflare, Akamai, Fastly, Amazon's CloudFront, running servers in hundreds of cities. Sites point their D N S at it, usually with that C name trick. Each of those servers near the users is called an edge, and they usually all share addresses through anycast. So your T C P and T L S handshakes happen with the edge, a few milliseconds away, not with the site's real servers. And if the edge has a fresh copy of the response in its cache, it just answers right there. When you fetch example dot com, the headers will say server Cloudflare, C F cache status hit, and a header called C F ray, whose last three letters are an airport code for the city that served you. Seattle, in the run I did. If it's a miss, or a page that's different for every user, like your inbox, the edge forwards the request to the site's own servers. Those are called the origin. And it usually does that over a connection it already has open, so you don't pay those handshakes across the ocean.

B: [skeptical] So for a per-user page, the C D N doesn't really help?

A: It helps less. It still helps. Your handshakes went to something five milliseconds away instead of seventy. And the edge's connection to the origin is already set up and warmed up. What it can't do is make the origin think faster. We'll come back to that, because it's the thing people get wrong about C D Ns. Oh, and it also soaks up load and attacks, which is a big part of why sites use them.

A: At the origin, there's a load balancer. That's a machine, or a service, that receives all the incoming connections and spreads them across many identical app servers, skipping any that are unhealthy. You've already worked through why, with load balancing. Why you need more than one server, how it picks, and the problem of state.

A: And then your request finally reaches code. Python, Go, Java, whatever renders the page. It might check a cache, query a database, call five other internal services, and assemble the H T M L. That's the "server thinks" box. And it ranges from about a millisecond for a cached static file to hundreds of milliseconds for a heavy dynamic page. The whole scale side of things, back-of-envelope math, tail latency, rate limits, that's all about making that box small, and keeping it small when a million people press enter at once.

<!-- section: The Idea: The response streams in -->

A: Now the response comes back. And it doesn't arrive in one piece. It arrives as a stream of T C P packets, and the browser doesn't wait for the end. It starts parsing H T M L as soon as the first bytes land. Which is why servers try to send the head of the page, the part with all the links to style sheets and scripts, as early as they can.

B: [a bit unsure] And then how fast the rest comes is just... size divided by bandwidth? A hundred K on a fast connection is basically instant.

A: [amused] That's what you'd think. But how fast the bytes come is limited by how old the connection is. A brand-new T C P connection has no idea how much the network between you can carry. So it starts cautiously. The sender's only allowed to have about ten packets in flight, roughly fourteen kilobytes, before it has to stop and wait for an acknowledgment. And then it doubles that every round trip. That ramp-up is called slow start. So a sixty-kilobyte page on a fresh connection takes about three round trips to download. Fourteen K, wait. Then twenty-eight, wait. Then the rest. Even on a really fast link.

B: So on a far-away server, that's three round trips of just... waiting for permission.

A: Three round trips of waiting for permission, yeah. And on an old, warmed-up connection, it's one. So it's round trips again, not bandwidth.

A: And then the H T M L names more things to fetch. As the parser reads, it finds the style sheet links, the script tags, image tags, and then fonts that are only mentioned inside the C S S. Each one's a new request. Modern browsers also run something called a preload scanner. It's a second, lightweight parser that races ahead through the raw H T M L just to find U R Ls and start fetching them early, while the main parser's stuck on something. And a page you think of as "one page" is often fifty to a hundred and fifty requests.

B: [skeptical] Fifty to a hundred and fifty, each doing D N S, T C P, T L S? That'd take forever.

A: It would, if they did. They don't, because connections get kept open and reused. That's called keep-alive, and it's been the default since H T T P one point one. Requests to the same host share a connection that's already been through its handshakes, and through its slow start. But requests to a different host, a separate C D N domain, a font service, an analytics script, need their own D N S, their own T C P, their own T L S. That's that little arrow on the map, "the network steps repeat for every new host". It's why performance people say "reduce the number of origins". And there's a hint a page can include, called preconnect, that just says "start the handshakes with this other host now, I'll need it soon".

A: And one more piece, the H T T P version. H T T P one point one can only have one request in flight per connection at a time. Send, wait for the full response, send the next. So if there's a big, slow response at the front, everything behind it waits. That's called head-of-line blocking. One slow thing at the front of a line holding up everything behind it, even stuff that's ready.

B: So open more connections.

A: That's exactly what browsers did. Up to six connections per host. Each one paying its own handshakes and its own slow start. H T T P two fixes it properly, with multiplexing. One connection, and many requests and responses going over it at the same time, chopped into small labeled frames that interleave and get put back together on the other side. One handshake, one slow start, everything shares it. There's still one leftover problem, though. Over T C P, one lost packet still stalls every stream on the connection until it's resent, because T C P hands bytes over strictly in order. Fixing that last bit is why Quick exists. In Quick, each stream is ordered on its own, so a lost packet only stalls the one stream it belonged to.

<!-- section: The Idea: Rendering -->

A: Last stop. You had "and then rendered", which is right. So here's the short version of what that means. Picture it left to right. Bytes on the left: H T M L on top, C S S underneath. Each turns into a tree. The H T M L parser turns the bytes into the DOM, the Document Object Model. It's the tree of elements: html, then head and body, then everything inside. JavaScript reads it and edits it. The C S S gets parsed into the C S S O M, the browser's parsed version of all the style rules, which it matches against the elements to work out each one's final style. Those two trees merge into a render tree, what's visible and how it looks. Then three steps in a row. Layout works out where every box goes, the exact position and size, given the window width, the fonts, the styles. People also call it reflow. Paint fills in the actual pixels for each box, text, colors, borders, images, into one or more layers. And compositing stacks those layers in the right order, often on the G P U, to make the final frame. Scrolling and some animations can happen in that last step alone, which is why they're smooth.

A: And off to the side there's JavaScript, with dotted arrows into both trees. Because a plain script tag in the page stops the parser until the script's downloaded and run. The script might change the document, so the browser can't keep going without it. That's why there are attributes called async and defer, to say "don't wait for me".

B: And C S S stops it too?

A: C S S doesn't stop parsing. But the browser won't paint anything until it has the C S S, because otherwise you'd get a flash of unstyled page and then everything jumping around. So the C S S and any early scripts are what's called render-blocking. They sit right on the path to the first paint. But each of these steps is milliseconds, not round trips. That's why the network usually dominates the first load. Once the page is up, rendering becomes the bottleneck. A janky scroll is layout or paint taking longer than one frame, about sixteen milliseconds. But that's a whole other topic.

<!-- section: The Idea: The waterfall -->

A: So now put it all together. Chrome's DevTools draws every request as a horizontal bar with colored segments, one row per request, time going left to right. It's called a waterfall, because the rows step down and to the right. Take a toy page. One H T M L file, plus four more: a style sheet, a script, a font, and a big hero image. Everything cold, and the round trip to the origin server is eighty milliseconds. From pressing enter to fully loaded, that comes out to about six hundred forty milliseconds. Now, you get to flip one switch. A warm D N S cache. Or a connection that's already open and reused. Or a C D N nearby. Which single one saves the most, and roughly how much?

B: [working it out] Hmm. D N S is just one step, so probably not that. The reused connection kills D N S and both handshakes in one go. I'd say the reused connection.

A: [encouraging] Good guess, and it's close. It's not the winner, though. Warm D N S saves exactly the D N S step, which in this model is sixty milliseconds. About ten percent. The reused connection saves D N S, T C P and T L S, so sixty plus eighty plus eighty, and also the slow-start rounds on downloading the H T M L, because the connection's already warmed up. That's about half. But the C D N on its own saves the most, about fifty-four percent. Because every round trip shrinks from eighty milliseconds to ten. The handshakes, and also every one of the subresource requests after.

B: Oh, because it doesn't just cut the setup, it makes every single wait shorter.

A: [emphatic] Right. But here's the part I really want you to notice. With the C D N on, look at the H T M L's waiting bar, the time to first byte. It barely changes. Because this page is dynamic. The edge still has to go all the way back to the origin and wait for the app to build it. A C D N makes round trips cheap. It doesn't make your server think any faster. Unless the response itself can be cached.

A: And you can play with this as a little interactive chart. Three toggle buttons, warm D N S, reused connection, C D N nearby, and a slider for the round trip to the origin, from ten milliseconds up to two hundred fifty. Five rows: the page, the style sheet, the script, the font, the image. The D N S and the handshakes only show up on the first row, because the other four share that one H T T P two connection, and each of them costs one round trip plus a bit of server time. The H T M L's download, on a cold connection, takes three slow-start rounds. The toy numbers are sixty milliseconds for a cold D N S lookup, fifty milliseconds for the app to build the H T M L, and ten milliseconds for a round trip to a nearby edge. And the time axis stays fixed to the all-cold case, so you can watch how much just disappears.

A: So try this. Turn on all three, then drag the round trip to two hundred fifty. That's a user on another continent. The cold load just explodes. The fully warmed one barely moves, except for that H T M L wait. The C D N's hiding almost all of the distance. Then switch the C D N off, still at two hundred fifty, and look at what's left. Three round trips to the H T M L's first byte, and then one more for each wave of subresources. And the font is always last. Every time.

B: Why the font?

A: Because nobody knows the font exists until the C S S has arrived and been parsed. The H T M L names the C S S, and the C S S names the font. So it's H T M L, then C S S, then font. That's a dependency chain measured in round trips. And honestly, that's the shape of most slow pages.

<!-- section: The Idea: Same servers, different continent -->

B: Okay, so let me try that on something real. Say a page loads in three hundred milliseconds for me in Seattle, and two seconds for users in India, from the same servers in Virginia. Where's the time going?

A: [thinking it through] Count round trips. Seattle to Virginia's about seventy milliseconds. India to Virginia might be two hundred to two hundred fifty. A cold load needs D N S. Then one round trip for T C P, one for T L S, one for the H T M L request. Then a couple more for slow start on the download. Then at least one wave for the C S S and JavaScript, and another for fonts and late images. Plus extra handshakes for every other host. Call it six to eight round trips. From Seattle, that's about half a second. From India, one and a half to two seconds. Even if the server only thinks for fifty milliseconds.

B: [skeptical] So making the server faster barely does anything for them.

A: It helps only the "server thinks" slice. The fix is mostly about distance and round trips. A C D N, so the handshakes and the static files come from an edge nearby. Cache the H T M L at the edge, if it can be cached. Fewer origins, or preconnect to the ones you need. H T T P two or three so you're not opening extra connections. And preload the late discoveries, the font, the hero image, so they don't wait for an extra wave.

<!-- section: Build It: Setup and baseline -->

A: Okay, now you build it. Two small programs. A D N S client made from raw bytes, and a fetcher that times every phase of an H T T P S request. Everything's in the Python standard library, nothing to install. One gotcha: Python three point twelve removed the old wrap socket function from the S S L module. You make a default S S L context and call its wrap socket instead, passing the server's hostname.

A: First, get a baseline for how far away things are. Ping sends a tiny packet and times the echo. That's one round trip, no handshake, nothing else. So ping example dot com, which is on Cloudflare. And ping dyna dot wikimedia dot org, which is a real Wikimedia data center. On the Mac I ran this on, example dot com came back in four and a half milliseconds, and Wikimedia in thirty. Write yours down. Because every number after this should be explainable as a multiple of those two.

B: Four and a half milliseconds. That's, what, a cache miss to RAM is a hundred nanoseconds, so that's like... forty-five thousand of those.

A: Yeah, and that's the near one. The near one's a Cloudflare server in the same city. Wikimedia at thirty is a whole different data center. Keep both numbers in your head.

<!-- section: Build It: A DNS query from raw bytes -->

A: Task one is the heart of the whole lesson. You build that twenty-nine-byte packet yourself, send it to eight eight eight eight on port fifty-three over U D P, and parse what comes back. You write four functions. One builds the query: the header with a random I D and the recursion-desired flag, then the name as length-prefixed labels with a zero at the end, then type and class. One reads a name out of the response. One parses the response: check the I D matches yours, skip past the question, and for each answer pull out the name, the type, the T T L, and the value. A dotted I P for an A record, a name for a C name. And one sends it, with a two-second timeout, and times it.

A: The part that'll actually bite you is reading names, because of compression. When you hit a pointer, you jump to wherever it points, read the name there, and then, and this is the bit people get wrong, you continue reading the record from just past the pointer. Not from wherever the name you jumped to ended. Two bytes past where you were.

B: Because the pointer itself is only two bytes, and the rest of the record follows it.

A: That's it. A few hints. Python's struct module packs numbers into bytes. Six unsigned sixteen-bit numbers, big-endian, which is called network byte order, gives you the header. Print the length of your packet for example dot com, it has to be twenty-nine. Print the response flags in hex. You want eight one eight zero, which means: this is a response, you wanted recursion, recursion was available, no error. And when you ask for www dot wikipedia dot org, you should get two records back. A C name, and then an A record for the C name's target. That's your resolver following the alias for you.

A: And there's a stretch goal that's very worth it. Become your own recursive resolver. Set the flags to zero, which means "don't do the walk for me", and send the question for en dot wikipedia dot org straight to a root server, a dot root dash servers dot net. You'll get zero answers back, and a list of N S records in what's called the authority section, usually with their addresses in the additional section. Send the same question to one of those, and repeat, until you get an A record. That's the whole tree walk, done by hand, in about forty more lines.

<!-- section: Build It: Fetch a page, timing every phase -->

A: Task two is the full trip. A function that fetches a page and returns how many milliseconds each phase took: D N S, connect, T L S, time to first byte, download, and total. D N S is get addr info, take the first I P. Connect is opening a T C P socket to port four four three. T L S is wrapping that socket with a default S S L context and the hostname. The whole handshake happens inside that one call, and you print which T L S version you got. Then you send a raw H T T P one point one get by hand. Request line, host header, blank line. And add a header saying "connection, close", so the server hangs up when it's done, which makes the download easy to time. Time to first byte is how long until the first receive comes back with any bytes. Download is receiving until you get nothing back, meaning the server closed.

B: [a bit unsure] What's the catch on the request? It's just a few lines of text.

A: The line endings. H T T P lines end with a carriage return and a newline, not just a newline. And the headers end with an empty line. So the very end of your request is two of those pairs in a row. Get that wrong, and the server just sits there, waiting forever for the rest of your request.

A: Run it three times in a row. The first run's D N S might be a cache miss. Runs two and three should hit the OS cache. Try www dot wikipedia dot org, which is bigger and farther, and a site you've never visited. And read the response headers for clues about who answered. Server, C F cache status, x cache, age, C F ray.

<!-- section: Build It: Check against curl, dig, and DevTools -->

A: Then you check your numbers against three real tools. First, curl. It can print the same phases, but its timers are cumulative from the very start, not per phase. So you subtract. For Wikipedia: D N S done at two and a half milliseconds, connect done at about twenty-seven, T L S done at fifty-six, first byte at eighty-eight, total a hundred fifty-two.

B: [working it out] So T C P is twenty-seven minus two and a half, about twenty-four. T L S is twenty-nine. Waiting... thirty-two. And download's about sixty-three.

A: That's it. And curl will tell you it spoke H T T P two, which it negotiated through A L P N. Your script's speaking one point one. And here's a heads-up. Your script's time to first byte will probably come out about forty milliseconds worse than curl's. Don't fix it yet. We'll get there.

A: Second, dig with the trace option. It skips your resolver entirely and walks the tree itself, printing every hop. On a lot of home networks you need to point its first step at a public resolver like one one one one. With plain trace, the Mac asked the router for the list of root servers and got back an empty twenty-eight-byte reply, so the trace just stopped. There's also a no D N S S E C flag, which hides the signature records, a topic for another day. For example dot com, you read it as four blocks. The root server list from one one one one, four milliseconds. Then the dot com N S records from b dot root dash servers, sixty-nine milliseconds, with that two-day T T L. Then example dot com's N S records, which are Cloudflare's name servers, from a dot g t l d dash servers, five milliseconds. And finally the A record itself, T T L three hundred, from Cloudflare's name server, seven milliseconds.

B: Why's the root one so slow if it's anycast?

A: That's the thing to look at. Which hops are fast, nearby and anycast, and which aren't. That one went somewhere far. And then run a normal dig for example dot com twice in a row and look at the query time and the T T L. The second time, the T T L has counted down. Because you're reading the resolver's cached copy, and it's ticking toward zero.

A: Third, Chrome DevTools. Open the network tab, tick "disable cache", and load the Wikipedia cat page. Hover the first request, the document, or open its timing tab. You'll see the same phases you measured, with Chrome's names: queueing, stalled, D N S lookup, initial connection, S S L, request sent, waiting for server response, which is the time to first byte, and content download. The colors change between Chrome versions, so trust the legend, not my memory. Then look at the requests after the first. Most have no D N S, no connection, no S S L segment at all. That's connection reuse. Turn on the protocol column and the connection I D column, and you'll see h two, maybe h three, and lots of requests sharing one connection I D. That's multiplexing. Find a request to a different host. Wikipedia loads images from upload dot wikimedia dot org. That one pays its own D N S, connect, and S S L. That's the per-host cost. Reload without "disable cache", and lots of rows now say memory cache or disk cache. That's stop two. No network at all. And then use the throttling dropdown, fast four G or slow four G, and watch the waterfall stretch. Throttling adds latency to every round trip, so those chains, H T M L then C S S then font, get really long.

A: And you're done when the D N S client builds twenty-nine bytes and follows the Wikipedia C name, the fetcher prints every phase for at least two sites, your connect time is close to your ping and you can say why, and curl, dig, and DevTools all line up with your script. Or you can say exactly why they don't.

<!-- section: Measure -->

A: So, measuring. Before your first run, write down a prediction using only your ping. Connect should be about one round trip. T L S, one round trip plus a bit of crypto. Time to first byte, one round trip plus server time. Run each site three times and keep the median, the middle one. Your numbers will differ from these. The relationships between them shouldn't.

A: First relationship. Connect is about the same as ping. Example dot com, ping four and a half, connect five. Wikipedia, ping thirty, connect twenty-four to thirty-one. The T C P handshake is one round trip and nothing else. If yours is way above ping, suspect a lost SYN, so look for something near a thousand milliseconds, or just a busy Wi-Fi network.

A: Second. T L S is about one round trip plus about ten milliseconds. For Wikipedia it's about one round trip, twenty-nine to thirty-eight. But for example dot com it's sixteen to twenty-five, against a round trip of four and a half.

B: That's like four round trips. Where's the extra coming from?

A: When the round trip is tiny, the fixed costs show through. Your side has to compute the key exchange and verify the certificate chain. That's an interpretation, not something measured directly. You can check it by timing the T L S handshake against a server on your own machine, where the round trip's basically zero.

A: Third, D N S. Warm is one to three milliseconds, that's the OS cache in m D N S Responder. Cold is tens of milliseconds, one or more round trips out to resolvers. Example dot com was twenty-nine cold, three warm. Wikipedia twenty cold, two or three warm. And your get addr info cold time and your hand-built U D P query should come out about the same, because they're doing nearly the same thing. The hand-built query to eight eight eight eight took twenty-one to thirty milliseconds. And a cold lookup of a name that doesn't exist at all, a random subdomain of example dot org, which no cache anywhere can have, took forty-six.

B: [skeptical] Okay, but the time to first byte for example dot com. You said one round trip plus server time. Ping's four and a half. Your script got... fifty-seven to sixty-four?

A: [intrigued] Yeah. That one's suspicious. It should be about one round trip, five milliseconds, plus a few for a Cloudflare cache hit. Curl agrees. Thirty-one minus seventeen is fourteen. Your script says about sixty. Something's adding about forty milliseconds, every single time. Hold that thought.

A: Fourth, download depends on size and slow start. Example dot com is nine hundred thirty-two bytes. That fits in one packet, so download is basically zero. Wikipedia's page is a hundred and twenty-four kilobytes, and it needed about sixty milliseconds. Which is roughly two round trips. Slow start sends a first batch, waits for the acknowledgments, sends a batch twice as big, and so on. By the textbook fourteen-kilobyte starting window, it'd be three. But servers often start bigger, and the window can grow during the handshake. Try a bigger page and check. The point is, on a fast link, a fresh connection's download time is set by round trips. Not by bandwidth.

A: And then add it up. A fresh fetch of Wikipedia from Python: about twenty for D N S, twenty-seven to connect, thirty-three for T L S, about thirty to first byte once you've fixed that mystery, and sixty to download. About a hundred seventy milliseconds. And of that, only a few milliseconds is the server actually thinking.

B: [surprised] So, like, ninety-something percent of it is just travel.

A: Everything else is travel.

<!-- section: Break It: The mystery forty milliseconds -->

A: Okay, now you break things on purpose. And the first one pays off that forty milliseconds. Add one line, right after you create the socket and before the T L S handshake. It sets a socket option called T C P no delay.

B: [a bit unsure] Okay, my guess is the server. Like, Python's slow, or the server's doing something extra when it sees a raw request.

A: [amused] Rerun it and see. Time to first byte to example dot com drops from fifty-seven to sixty-five milliseconds, down to twelve to twenty-eight, mostly around fifteen. Wikipedia drops from forty-six to sixty-five, down to twenty-three to thirty. Same server. One socket option.

B: [surprised] Huh. So it was my side.

A: It was both sides waiting on each other. Here's the likely mechanism. T C P has an old feature from nineteen eighty-four called Nagle's algorithm. The rule is: if you have a small amount of data to send, and an earlier small packet hasn't been acknowledged yet, hold the new data until that acknowledgment comes back. So you send fewer tiny packets. Now, the last step of your T L S handshake sent a small packet, the client's "finished" message. And your get request, also small, came right behind it. So Nagle held the get. Meanwhile, the server uses something called delayed ACK. The receiver waits a little while, often around forty milliseconds, before acknowledging, hoping it can piggyback the acknowledgment on a reply, or cover two packets with one. So the server doesn't bother acknowledging your finished message right away. Your side's waiting for the ACK before it sends the get. The server's waiting for more data before it sends the ACK. And they sit there until the delayed-ACK timer fires, about forty milliseconds later.

B: [laughs] Two polite people at a door.

A: Pretty much. And curl, browsers, almost every H T T P client sets T C P no delay for exactly this reason. That's why curl never had the forty. And the real lesson is this. When a latency is a suspiciously round number, and it doesn't change with distance, the near server and the far server both get the same forty, then look for a timer.

<!-- section: Break It: DNS failures, SNI, and handshakes -->

A: Second, point D N S at nothing. In your D N S client, send the query to an address nothing answers on, ten dot two fifty-five dot two fifty-five dot one works on most networks, with that two-second timeout. You wait the full two seconds and get nothing. U D P has no "connection refused". There's no connection. Just silence. Then put a line in your etc hosts file saying example dot com is your own machine, one twenty-seven dot zero dot zero dot one. You need sudo, and take it out afterwards. Now run your fetcher. Get addr info hands back your own machine instantly and the connect fails. But your hand-built query to eight eight eight eight still returns the real I P.

B: Because one asks the OS, which reads the hosts file first, and the other goes straight to D N S.

A: Right. And that's how a stale hosts entry silently breaks one tool and not another. That's a fun afternoon of debugging if you don't know to look.

A: Third, mess with S N I. Call wrap socket without the server hostname. With the default context, Python just refuses, because it can't verify a certificate without knowing which name to check it against. Now pass the wrong name. Connect to Wikipedia's I P, but say the hostname is example dot com. You get a certificate verification error, hostname mismatch. The server showed you its Wikimedia certificate, and your client correctly refused to accept it as example dot com. And try the reverse, Cloudflare's I P with a name Cloudflare doesn't host. Then you get a different error, a handshake failure, because the edge doesn't even have a certificate to offer for that name. And every "certificate name mismatch" error you ever see in production, a wrong D N S record, a misconfigured C D N, a corporate proxy in the middle, is this.

A: Fourth, pay for every handshake. Change the fetcher to get the same U R L ten times. First with a new connection every time. Then with one connection reused for all ten. For that you take out "connection, close", and read each response fully, using the content length, or the end marker for chunked responses, before you send the next request on the same socket. Against Wikipedia, the new-connection version should cost roughly two round trips more per request. About sixty milliseconds, times ten.

B: So for TinyFish, fetching tons of pages, that's the difference between using one session or making a fresh client every time.

A: That's exactly it. That's what keep-alive saves. And it's why the connection pools in a requests session, or an h t t p x client, matter so much for fetch-heavy work like yours. Reuse the client, and every request after the first skips the D N S, the T C P, the T L S, and the slow start.

<!-- section: Connections and close -->

A: If you want the long version of all this, two places. Alex Gaynor's "What happens when" on GitHub, which goes down to the keyboard interrupt, and Ilya Grigorik's book High Performance Browser Networking, which is free online. And the next stops from here are opening up the T L S box, and writing the server side of that request you typed by hand.

B: [working it out] Okay, let me try the whole thing. You press enter, the browser checks if it even needs the network. Then D N S, which is mostly caches, with a tree behind them. Then T C P and T L S, a round trip each. Then the request goes to a C D N edge, maybe the origin, the app thinks, and the page streams back and pulls in more files. And if the page is slow, you put a C D N in front of it and that fixes it.

A: [gently] All of that's right, except the last bit. A C D N makes each round trip shorter. It doesn't remove any of them, and it doesn't make your server think faster. The slow part is the waiting. Every handshake, every slow-start round, every wave of files the page didn't know it needed until the last one arrived, is a full trip to the other side and back. A page load is a few milliseconds of computing wrapped in a few hundred milliseconds of waiting. So when your agent takes one point four seconds, you don't ask what's slow. You count the round trips, and you ask which ones you could have skipped.
