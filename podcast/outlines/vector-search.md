# Outline: vector-search

Source: src/lessons/vector-search.mdx. Curriculum: "Nearest neighbors at scale." How do you find
the closest embedding among 100 million without checking them all?

## The one big idea

Checking every stored vector means reading the whole index for every query, and like decoding, the
chip sits waiting on memory, not math. Every fast index cheats in one of two ways, reading fewer
vectors or making each one smaller, and gives up the exact answer to do it. In a retrieve-then-
rerank pipeline that's usually fine: retrieval's job is to get the right passage into the pile, and
the reranker can only reorder what it's handed.

## Opening scene

His cross-encoder, which reads query and passage together and is slow on purpose. Point it at a
hundred million passages and one query takes more than a day. So search runs in two stages, and
the cheap first stage sets the ceiling on how good his ranker can ever look.

## Wrong mental model B voices

B: "it's one dot product per passage, that's cheap" (the math is cheap; reading isn't). B: "just
sort them, like a database index." B mixes up the index's recall with relevance recall. B expects
an approximate index to hurt the final ranking.

## Story beats

1. The day-long query, and why two stages. The ranker's ceiling is set one stage earlier.
2. An embedding is a point; search is geometry. Use the closeness the model was trained with.
3. Brute force priced: at a hundred million it doesn't fit on the Spark, and even if it did, about
   a second per query, all of it waiting on memory. Same story as decoding; batching fixes it
   offline, not for a live query.
4. Origin: the k-d tree and the curse of dimensionality; giving up on exact; compression; the
   layered graph; dense retrieval giving the old tricks a second career.
5. Approximate: the triangle of recall, speed and memory. The index's recall versus the ranking
   kind.
6. Rooms (IVF): sort into clusters, search the few nearest; the border problem; the probe dial.
   Real embeddings were hard for it.
7. The sketch artist (PQ): each vector as a few bytes of shape IDs, scored from a small table.
   Recall drops; re-scoring the top hundred with full vectors brings it back.
8. Highways then local roads (HNSW): the skip-list idea with graphs, the width dial, links that
   point away so the graph doesn't break into islands. Best speed at high recall, big memory, slow
   build.
9. Back to his pipeline: words and vectors together catch error codes; and the surprise: after the
   reranker, the approximate index cost nothing, and reranking deeper than about fifty bought
   nothing while costing linearly.

Ending: B: "find a fast enough index that gets the true neighbours"; A sharpens: the target isn't
the index's recall, it's what reaches the user after reranking. Measure end to end.

## Numbers worth saying (five)

- A hundred million passages.
- More than a day per query with the cross-encoder alone.
- About a second per brute-force query, if it fit.
- Nineteen seventy-five.
- Reranking past about fifty bought nothing.

## Left to the written lesson

The distance identity and formula, the byte and FLOP arithmetic, IVF cost formula and nlist rules,
PQ piece counts and codebook sizes, asymmetric distance computation by name, HNSW parameters by
name, the comparison table, filter strategies, RRF formula, NDCG definition, all code, the
measured tables, Break It, the billion-scale design.
