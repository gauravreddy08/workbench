# Outline: latency-numbers

## The one big idea

The places a computer keeps data sit on a ladder where each rung is slower than the last by a
huge, steady factor, and those gaps, not the algorithm, decide whether a design works. "How does
it scale?" mostly means "how many times do we touch the slow places, and how slow are they?"

## Opening scene

His ranker needs a feature lookup service. The features sit in a file on disk because that was
easy. Each request does a couple of hundred lookups. Is that fine? Same code, same algorithm, and
depending only on where the bytes live it's either invisible or it falls over.

## The wrong mental model B voices

From the diagnostic: no feel for latency. B guesses an SSD is "ten times slower than RAM, maybe".
Real answer: about a thousand. Later B also blurs latency and bandwidth ("a faster internet plan
would fix the slow API").

## Story beats

1. The lookup service on disk; B's "ten times" guess; it's about a thousand. Same code, a
   thousand times apart.
2. Origin: Norvig's little table, Jeff Dean's "Numbers Everyone Should Know" slide. The
   thumbnails example: decide the design by counting slow trips before writing code. The numbers
   drifted, the shape didn't.
3. Human scale: stretch time so a closest-cache read takes a second. RAM is a couple of minutes,
   an SSD read most of a day, Europe about five years. A GPU kernel launch is over an hour; reading
   a whole model's weights is a couple of years, done once per token.
4. Why the ladder exists: far, or big. Light is slow at this scale; Europe is far and no budget
   fixes it. RAM is close but slow because it's huge: DRAM stores bits as tiny leaky buckets of
   charge and has to open a whole row to hand you a few bytes; flash has to test a whole page of
   trapped charge. Small things can be fast; fast things have to be small.
5. Caches and locality: desk, shelf, library across town. Programs reuse things and use
   neighbours, so a small fast copy catches most requests. You never fetch one byte, you fetch the
   chapter (the cache line). Working set: what fits decides which rung you live on.
6. Latency versus bandwidth: length of the pipe versus its width. Chatty API across an ocean is
   all waiting; a big model read from memory is all flowing. Improving the wrong one does nothing.
7. Bytes in flight: one SSD read at a time leaves the drive mostly idle. To use the width you need
   many requests outstanding; that's the whole reason concurrency and async exist (next lessons).
8. When I ran it: the pointer chase staircase shows up with nothing but a stopwatch; the surprise
   is a Python dict lookup costs about as much as a cache miss, so for Python the interpreter is
   usually the first bottleneck.
9. Ending: B says it back as "memorise the numbers"; A sharpens: memorise the ratios and the
   ordering, and always ask which kind of slow (waiting or flowing) a job is stuck on.

## Numbers worth saying

- SSD about a thousand times slower than RAM (versus the "ten times" guess).
- Human scale: a second, a couple of minutes, most of a day, about five years.
- Rung ratios: roughly a hundred, then a thousand, then a couple of thousand.

## Left to the written lesson

All exact latencies and ranges, the units section, the light-distance table, DRAM row timings,
the bandwidth table and bits-versus-bytes, the transfer-time formula and its interactive figure,
Little's law arithmetic and queue depth numbers, the 16 GB / 273 GB/s worked example, every Build
task (Numba pointer chase, Sattolo, bw.py, GPU copy, O_DIRECT, fio, ping and echo), the Measure
table and the M4 Pro staircase numbers, the TLB, the four Break It cases, the feature-store
back-of-envelope, Go Deeper.
