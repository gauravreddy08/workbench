# Outline: batching (story-first)

Source: src/lessons/batching.mdx. Curriculum: "Batching and continuous batching." Why does serving
many users at once make each token cheaper, and what is continuous batching?

## The one big idea

The expensive part of every step, hauling the model out of memory, can be shared: once a weight
arrives it can serve sixty-four people's next word as easily as one. So batching makes each word far
cheaper for almost nothing. But a batch that travels together moves at the pace of its slowest
member, so the real fix is deciding who's in the batch at every single step: a bus that never waits
at the terminal. What stops you adding people is each person's private notes and the promise you
made them about speed.

## Opening scene

The scoreboard row that hurt: sixteen users on the naive server, the last waits about five minutes
for a first word, total output the same as for one person. Meanwhile the GPU spends nearly all of
every step waiting for bytes. Room for dozens in every step; the server lets in one.

## Wrong mental model B voices

"Put sixty-four people in one step and each gets sixty-four times slower." Then "just group
requests, done" (static batching). Echo of his diagnostic (thought a sync server crashes under load,
and async "is a queue"): B assumes the fix is a smarter queue; A says the fix is not a queue at all,
it's changing the batch at every step.

## Story beats

1. The absurd part: idle math, one user at a time, fifteen extra users added only waiting.
2. One read, many users: the delivery van carries everyone's onions. What grows is only what isn't
   shared: a little math and each person's notes. Step gets a bit longer, makes dozens of words.
   About seventeen to about seven hundred. A GPU-hour costs the same; that's the business.
3. Origin: batching was old and worked for image classifiers (one pass, same shape). LLM requests
   are hundreds of passes of unknown count. Orca, twenty twenty-two: decide after every pass.
   Within about a year every serious engine did it.
4. Static batching's three taxes: filler for short prompts, everyone waits for the longest answer,
   the late arrival waits for a batch already running. Plus the fourth: waiting forever for a batch
   to fill. When I ran the simple batcher with no deadline, the last few requests of a run just
   hung. A deadline fixes that, not the others.
5. Continuous batching: admit, step, emit, evict, forever. The bus with seats. Surprise: when
   everyone arrives together and wants the same length, all the policies look the same, and that's
   what a simple benchmark does, so you need a mixed-length run.
6. The wrinkle: a newcomer's long prompt freezes everyone's stream. Mix prompt-reading and writing
   in one pass; chop long prompts into pieces so no step gets huge (chunked prefill), which also puts
   both halves of the chip to work.
7. The trade: throughput subject to a promise. Useful throughput (goodput) peaks and falls past the
   knee.
8. Memory: each seat costs its notes. On the Spark with an eight billion model, bandwidth stops you
   first; on a gaming card or a big model, memory does, which is why the next big idea is paging.
9. Correctness: the engine produces fluent text when subtly wrong; the test is token-for-token
   equality with one-at-a-time generation.

## Numbers worth saying

- About five minutes (the baseline's sixteenth user).
- About seventeen versus about seven hundred words a second.
- Sixty-four users: step only a bit longer.

## Left to the written lesson

The step-time formula and per-user KV numbers, the batch-size table, the predict-box arithmetic,
the Gantt figure readouts, attention masks and left padding mechanics, Triton's setting name,
selective batching detail, SARATHI and token budgets, reading speed numbers, the memory table and
the twenty-four gigabyte card arithmetic, preemption detail, all server and engine code, cache
helpers, position ids, the test, plot, run matrix, Measure expectations, Break It specifics.
