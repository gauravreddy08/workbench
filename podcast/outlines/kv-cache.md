# Outline: kv-cache (story-first)

Source: src/lessons/kv-cache.mdx. Curriculum: "The KV cache, by hand." What exactly does the KV cache
store, and how much does it save?

## The one big idea

Because a word may only look backwards, everything the model computed about an earlier word is
frozen the moment it's computed. So a new word needs only its own question plus every earlier
word's label and summary (keys and values); old questions are never asked again. Keep those notes
and each step does one row of new work instead of redoing the whole triangle. The price is memory,
and every step has to read the whole box of notes, which is why model designs now bend around
making it smaller.

## Opening scene

The generation loop everyone writes after finishing GPT two: run the whole sequence, keep the last
position, append, repeat. On a laptop it takes about three minutes for a thousand tokens, and each
step gets slower in a straight line until the last is about twenty times slower than the first.
Change about twenty lines: twelve seconds, same words.

## Wrong mental model B voices

His diagnostic got the KV cache idea right, so B states it confidently, then trips one level down:
"why not keep the queries too?", "so it should be hundreds of times faster", and later "every model
can do this, right?" (BERT can't).

## Story beats

1. The slow loop and the twelve-second version; nearly every number at a step was computed,
   identically, the step before.
2. The lazy librarian: rewriting every index card each time one new note arrives. Keys are labels,
   values are summaries, the query is the new question.
3. Why keys and values but not queries: an old question only produced an old answer that's already
   moved on.
4. Why the cards never change: the backwards-only rule, followed up through the layers. Two hidden
   conditions: the rule must be one-way (BERT has nothing to cache), and a position's encoding must
   depend only on its own position. The cache is per layer.
5. Prefill fills it, decode appends one row. The classic bug: the new word told it's at position
   zero; the text stays English and quietly wanders.
6. Why it wasn't hundreds of times faster: redoing a short prefix is almost free while the chip is
   waiting on memory anyway (re-explain the idle-chip idea). When I ran it, the laptop's GPU stayed
   flat for a while before bending upward; with the cache on, the GPU was no faster than the CPU
   because tiny steps are all fixed overhead.
7. The price: memory that grows with every word, and every step reads all of it.
8. Shrinking it: share keys across heads (one set, too aggressive; groups, the middle ground);
   forget the distant past (a sliding window, a ring buffer); fewer bits. Shazeer's point that once
   you cache, decoding is slow because of reading the cache.
9. bf16 surprise: the two loops can eventually disagree at a near-tie; not a bug, rounding.

## Numbers worth saying

- About three minutes vs twelve seconds, same words.
- A quarter: the grouped-heads saving for Llama three.

## Left to the written lesson

The attention formula, tensor shapes, the T by S mask and tril diagonal, FLOP counts per step, the
roofline and ridge-point prediction for the Spark, the latency figure and its numbers, the cache size
table, KV formula, MQA/GQA/MLA detail, Mistral and Gemma window sizes, KIVI, preallocation and paged
storage detail, all code and tasks, Measure tables, Break It specifics, Explain It Back.
