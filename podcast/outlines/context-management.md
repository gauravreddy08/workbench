# Outline: context-management

Source: src/lessons/context-management.mdx. Curriculum: "Managing context." What should go into a
model's context window, and what happens when it fills up?

## The one big idea

The model has no memory; the harness lays out a fresh desk every step and the model reads all of
it. Every token on the desk costs memory, money, time and a share of the model's attention, so
context management is choosing what to throw away, and every strategy throws away something.

## Opening scene

An agent deep into a refactor. Early on it read a config file with a timeout value; a bit later it
ran the server and got an enormous log with one line that mattered. Now, near the end, it needs
both. Three ways it goes wrong: out of room, all there but drowned, or it works and the bill is
strange.

## Wrong mental models B voices

- "Windows are huge now, just put everything in." (bigger isn't better)
- "The model remembers the conversation, so the cost should grow with how long it gets." (it's
  resent every time; the bill grows with the square)
- "Summarising old turns saves money." (it breaks the cache, and can cost more)

## Story beats

1. The scene and the three failures.
2. Origin: tiny windows forced retrieval; windows exploded and "retrieval is over"; then Lost in
   the Middle and the needle test complicated it; by the agent era it got a name, context
   engineering.
3. The desk: researcher with no memory, assistant lays out papers. The loop resends everything, so
   cost piles up like a triangle; double the steps, roughly four times the bill.
4. Prompt caching saves it: the provider keeps the processed start of the prompt, about a tenth of
   the price. The rule is about order: anything that changes goes last. A timestamp at the top
   kills it. Editing old history breaks it too, so fewer tokens can cost more.
5. Attention is a fixed budget (softmax re-explained). Near-misses: a hundred timeout lines.
6. Lost in the middle: U shape; for one model, the middle was worse than no documents at all.
   Put the question at the end.
7. The needle test: passing it proves little (word match, one needle, finding isn't using).
8. The toolbox, each with what it throws away: cap tool outputs, compaction (gist survives, the one
   detail dies silently), notes file, sub-agents with fresh desks, just-in-time loading with grep.
   A reranker is a context tool, which ties to his work.
9. Measure on tasks long enough to hit the wall; strategies are identical until then. The number
   that decides it: cost per correct answer.

## Numbers said aloud

- "eight times bigger than it needs to be" (bill)
- "about a tenth of the price" (cache reads)
- "double the steps, roughly four times the tokens"
- "a hundred" near-miss timeout lines

## Left to the written lesson

The four-bill arithmetic (KV bytes per token, prefill FLOPs and crossover), the worked quadratic
example, the softmax dilution table, cache write and read multipliers, provider specifics, RULER
and NoLiMa details, the fake codebase and benchmark code, the strategy table and needle grid, the
Break It variants, the serving-scale memory question. No measured API results are claimed (none
were run).
