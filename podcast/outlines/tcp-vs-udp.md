# Outline: tcp-vs-udp

## The one big idea

The network only promises to try. TCP turns that into a perfect, in-order stream with a handful of
tricks: number everything, send receipts, resend when a timer runs out, keep many pieces in flight,
and slow down when the network is crowded. Every one of those is paid for in round trips. UDP hands
you the raw envelopes and gets out of the way, and when people needed a better TCP, they rebuilt it
on UDP.

## Opening scene

A three-kilobyte request to the ranking service arrives exactly, in order. A huge checkpoint copied
to the Spark, hash matches. Tokens never arrive swapped. Underneath, the network loses, duplicates
and shuffles. Something in the kernel is turning "probably, in some order" into "definitely, in
order". And it charges for it.

## The wrong mental model B voices

"UDP is basically TCP without the safety checks, so it's the fast one, and TCP's the slow safe
one." Also, at stop-and-wait: "so get a faster link."

## Story beats

1. The scene: what IP promises vs what you rely on all day. Ports (apartment numbers) and sockets in
   two sentences. UDP is IP plus ports and a checksum: each send is one envelope, no promises, but
   no setup and nothing ever waits.
2. TCP's promise: every byte, in order, once. It's a stream with no message boundaries (a gotcha
   for any protocol on top).
3. Building it, the manuscript-by-mail picture: number the pages (sequence numbers), postcards back
   saying "got everything up to here" (acks), resend if you don't hear back (timeout). The sender
   can't tell lost page from lost postcard from slow postcard, so duplicates must be expected.
4. Stop-and-wait: correct, and as slow as the round trip. B's wrong fix, a faster link, changes
   nothing. The fix is many pages in flight: the sliding window, sized to fill the pipe for a whole
   round trip (bandwidth-delay product, plain words).
5. History: nineteen eighty-six, a link between two Berkeley sites a few hundred yards apart drops
   about a thousand times in speed. Not broken: full of retransmissions. Congestion collapse. Van
   Jacobson and Michael Karels fix it in the senders alone: slow start, a better timer, back off
   hard on loss. The internet works because every sender agrees to be polite.
6. Congestion control: start small and double, then creep up and halve on loss: the sawtooth. Slow
   start means a fresh connection to a faraway server takes several round trips to get going.
7. The bills: the handshake round trip before any data (three round trips to first byte for a new
   HTTPS connection vs one for a reused one), TIME_WAIT lingering after close (old stragglers),
   Nagle plus delayed acks clumping a token stream (TCP_NODELAY), head-of-line blocking (one lost
   packet stalls everything behind it, even independent streams in HTTP two).
8. When I built it: timer shorter than the round trip sent nearly everything twice and still
   "worked"; without flow control, a bigger window made it far slower. Then QUIC: TCP can't change
   (kernels, middleboxes, ossification), so rebuild the tricks over UDP, in the app. When to pick
   UDP yourself: late is as bad as lost (calls, games), one-packet exchanges (DNS), or tunnels like
   Tailscale where stacking two TCPs fights.

## Numbers worth saying

"About a thousand times" slower in nineteen eighty-six; three round trips vs one to first byte;
"about forty milliseconds" for the Nagle stall.

## Left to the written lesson

Header layouts and field sizes, ephemeral port ranges, the four-tuple, window arithmetic and the
bandwidth-delay examples, go-back-N vs selective repeat details, RTO formula and floors, fast
retransmit and SACK, window scaling, the TIME_WAIT port-exhaustion math, keepalive flavours, the
Mathis formula, CUBIC and BBR, 0-RTT, the full Build It code and proxy, Measure tables, Break It
specifics (the two-transfers bug), Explain It Back.
