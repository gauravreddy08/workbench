# Outline: back-of-envelope

Source: src/lessons/back-of-envelope.mdx. Curriculum: "How does it scale?"

## The one big idea

"How does it scale?" has a precise meaning: as load grows, which resource runs out first, at what
load, and what do you do about it. You answer it with a chain of rough multiplications, rounded to
powers of ten, and the chain itself (every link a lever) is the useful part, not the final number.

## Opening scene

The interview. He's explained his cross-encoder ranker well, the interviewer leans back: "Nice. So
how does it scale?" And there's nothing. No wrong answer, just no place to start.

## Wrong mental model B voices

From the diagnostic: no feel for numbers, so "how does it scale?" stumps him. B says the honest
first reflex: "I'd say horizontal scaling, we can add more GPUs." A: that's a vibe, not an answer.
Second, smaller wrong idea: B thinks you need exact numbers and a calculator; A says you need to be
in the right power of ten.

## Story beats

1. The freeze in the interview; B's "add more GPUs" answer; why it's empty.
2. Fermi at the Trinity test with torn paper, off by a factor of two. Piano tuners. Bentley brings
   it to programmers, Jeff Dean's "Numbers Everyone Should Know". The interview question is a Fermi
   problem with a server in it.
3. What "scale" really asks: every machine can run out of a few things (math, memory size, memory
   speed, disk, network, CPU, money). The narrowest one is the bottleneck.
4. The trick: stop carrying digits. Round to a power of ten. A day is about a hundred thousand
   seconds. You're aiming for "one machine, ten, or a thousand". Never size for the average; size
   for the busiest hour (peak factor).
5. The ranker, walked as a chain in words: queries a day to queries a second, times candidates,
   times tokens, times math per token, against one GPU. Every link is a lever; candidates multiply
   everything. Ranker is compute-bound because many tokens share every weight read (re-explain the
   bandwidth-bound idea in two sentences). Check the other resources: nowhere close. And one query
   alone has a time adding machines can't fix.
6. Surprises from the other estimates: for a billion pages, computing the embeddings is cheap,
   keeping them in memory forever is the cost; crawling them is a concurrency problem, not
   bandwidth. Chat on Llama: the same workload hits memory size first on an H100 and memory speed
   first on the Spark. Which wall depends on the machine.
7. At ten times you add machines; at a hundred times you change the design (cheaper first stage,
   cache, distill). Then say what breaks next. That's the senior-sounding part.
8. Estimates are hypotheses: load-test one machine, keep a journal of guess versus measured. The
   load-test insight: below a point latency is flat, then it climbs sharply near full (forward to
   tail-latency), and a small model can leave the GPU idle while one CPU core is pinned.
9. Ending: B restates; A sharpens that the answer is the bottleneck plus what you'd change, and the
   check.

## Numbers worth saying (five)

- About ninety seconds for a strong answer.
- A day is about a hundred thousand seconds.
- Fermi off by about a factor of two.
- "About five H100s, call it eight" for the ranker (one landmark result).
- Ten times and a hundred times as the two horizons.

## Left to the written lesson

The five-step figure, all tables (conversions, capacity per machine, vector formats), the full FLOP
arithmetic, two-N rule details, attention cost, MFU percentages, headroom percentages, KV cache
formula and per-user sizes, the Spark-versus-H100 user counts, the CPU-box predict, the calculator
figure, all Build It code and tasks, the Measure table, the five-mistakes exercise, Go Deeper.
