# Outline: packets-and-ip

## The one big idea

Nothing you send travels as a stream down a wire. It's chopped into small envelopes, each wrapped in
envelope after envelope, each carrying its own address, and every box in the middle reads only the
outer address, forwards it one hop, and promises nothing. All the reliability lives at the two
ends. That one design explains the latency you measure and why nobody can reach your laptop.

## Opening scene

Tokens streaming back from a model API. He knows SSE, polling, WebSockets. But his Wi-Fi radio
doesn't know what HTTP is, his router doesn't know where Fireworks is, and about ten machines he's
never heard of each make a decision about his bytes without asking anyone. And the reply is
addressed to his router, yet finds his laptop and not his phone.

## The wrong mental model B voices

"There's a connection, like a line from my laptop to the server, and my data flows down it." Later:
"my IP is the one my laptop shows." And "if a packet's lost, the router resends it."

## Story beats

1. The scene, and three everyday mysteries: two different "my IP"s, why Berlin is slow and who
   picks the route, why SSH to the Spark works from the couch and not a coffee shop.
2. History: the phone network held a dedicated path for a whole call. Baran (surviving attack) and
   Davies (sharing computers) both arrive at chopping messages up; Davies names them packets.
   ARPANET's first message, "LO", then a crash. Cerf and Kahn's common envelope for joining
   networks, later split into IP and TCP.
3. Circuits vs packets: what packets buy (sharing, no setup, survival) and what they cost: best
   effort (named). Nobody promises anything.
4. Envelopes inside envelopes: the token inside HTTP, inside TCP (which program: port), inside IP
   (which machine: IP address), inside a Wi-Fi or Ethernet frame (which box on this one link: MAC
   address). For a single token, most of what's on the wire is envelope.
5. The journey: the frame is local and rebuilt at every hop, the IP packet survives the whole way,
   routers read only the IP header and tick down a counter. The ends do everything else: the
   end-to-end principle.
6. Addresses are locations: network part and machine part. Your laptop's one decision per packet:
   is this on my own little network? If not, hand it to the router. It only ever needs the router's
   hardware address, found by shouting on the local link (ARP, light touch).
7. Private addresses and NAT: millions of homes reuse the same private addresses; the router
   rewrites the source to its one public address and writes down the pairing. A packet from outside
   with no matching note has nowhere to go: that's why the laptop is unreachable, and the hook for
   Tailscale.
8. TTL and traceroute: a counter that stops packets circling forever; Van Jacobson's trick of
   sending with a counter of one, then two. Berlin: the whole ocean in one jump; most of a long path
   is just distance. Stars aren't loss; a slow middle hop isn't a slow path. Briefly: there's a
   largest envelope size, and tunnels shrink it. Loss is how the internet says "too much", and the
   ends handle it, which is why TCP exists.

## Numbers worth saying

Nineteen sixty-nine and "LO"; about four billion IPv4 addresses (fewer than one per person); Berlin
around a hundred and forty milliseconds against a light-speed floor of about ninety.

## Left to the written lesson

The SSE-in-frame byte breakdown, OSI layer numbers, CIDR arithmetic and subnet masks, routing table
output, ARP cache output, the NAT table example, BGP and autonomous systems, MTU and MSS values,
fragmentation and path MTU discovery, IPv6 details, the hex dump and header field decoding, the
checksum arithmetic, all real addresses, all Build It code and commands, Measure tables, Break It
experiments, Explain It Back.
