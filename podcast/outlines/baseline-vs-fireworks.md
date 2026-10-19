# Outline: baseline-vs-fireworks (story-first)

Source: src/lessons/baseline-vs-fireworks.mdx. Curriculum: "Baseline: my Spark vs Fireworks." How
does a naive model server on my own hardware compare to a commercial inference API?

## The one big idea

"Which is faster?" has no answer until you say faster at what. The first word is about fixed costs
(network, queue, reading the prompt), so the nearby box can win it. Every word after is about
reading the weights, so the fast GPU wins by a lot. And with many users, a one-at-a-time server
doesn't get busier, it just makes people wait in line, while Fireworks shares each pass over the
weights. A fair scoreboard is what turns every later change into a number that moved.

## Opening scene

He predicted about seventeen tokens a second for his Spark. Fireworks' playground: text faster than
you can read. His Spark: about reading-aloud speed. Fireworks is faster, obviously. Except run both
from the Spark with a short prompt and the Spark can show the first word first. And three friends at
once: the third stares at a blank screen for most of a minute.

## Wrong mental model B voices

"Fireworks is just faster." Later, from his diagnostic (thought a sync server "crashes" under load):
"sixteen users at once, it'll fall over" / "it'll get more done because it's busier". Neither: it
does the same amount, and everyone waits in line.

## Story beats

1. The race that has no answer yet. Faster at what, for how many, measured how?
2. Origin: twenty twenty-three, Llama weights get out, then a commercial licence. Downloading is
   easy, serving well isn't; companies like Fireworks built a business in the gap, and the margin is
   the tricks. Today's server has none of them, on purpose.
3. What "fast" means: the wait for the first word, the pace after, the whole answer, how much the
   whole server produces, and all of it for the unlucky request too. Diner vs owner.
4. Follow one request: network, queue, reading the prompt (compute), then one word per pass over
   the weights (memory). Fixed costs favour the box nearby; per-word costs favour the fast GPU.
   Long prompt or long answer, Fireworks wins both. Re-explain prefill/decode in a sentence.
5. Why their per-word speed is so much higher: much faster memory, maybe fewer bytes per weight,
   guessing several words at once, compiled code instead of a Python loop.
6. Many users: B's "it'll fall over". A: it doesn't crash, it queues. Throughput stays flat, wait
   grows with every person ahead of you (Little's Law, re-explained in a sentence). Fireworks
   shares each read across a batch, so its tail barely moves.
7. Measuring honestly: events aren't tokens; twenty requests means your "p99" is your single worst
   one; same model, same prompts, same work, errors are data, don't let a timeout quietly delete
   your slowest requests.
8. The scoreboard: every gap has a cause and every later lesson moves a row. The naive
   server usually lands noticeably below the seventeen, and the missing part isn't memory, it's
   Python between GPU calls.

## Numbers worth saying

- About seventeen tokens a second, the ceiling he predicted.
- Roughly ten times the per-word speed on Fireworks.
- Sixteen users: the last one waits minutes for a first word.
- Twenty requests: your p99 is just your worst one.

## Left to the written lesson

The six numbers' definitions in full, the RTT and TLS handshake detail, SSE wire format and the
usage chunk, the timing math (n minus one over the window), HBM/FP8 numbers, all the predict-box
arithmetic, sample-size rules, the fair-fight checklist item by item, container and server code,
the harness code and JSON metadata, the scoreboard script, run commands, Measure expectations, the
gap table, Break It (timeouts, event loop, events as tokens, hang up), Explain It Back, cost per
million tokens.
