# Outline: ranking-metrics

Source: src/lessons/ranking-metrics.mdx. Curriculum: "Ranking metrics and eval sets." How do you prove a
new ranker is better: which metric, which data, how sure?

## The one big idea

A ranker is only "better" relative to three things: a metric, a set of queries, and a set of labels.
Change any of them and the winner can flip. The metric is the easy part (each one is just a model of
how patient the reader is). The eval set, which queries, which documents got judged, and how, matters
more, and both matter more than the third decimal place.

## Opening scene

Three weeks into the cross-encoder. Loss down, the twenty queries in a notebook cell look better. He
posts "new model, NDCG up a little" in a Slack thread. Then the fair questions: which NDCG? which
queries, weren't those the ones the old model was bad at? who labeled them? the new model shows
documents the old one never did, were those ever judged? and the one that ends the meeting: is that
gap bigger than the noise?

## B's wrong mental model

The diagnostic says he named NDCG, MRR and MAP correctly. So B knows the metrics and thinks the
metric is the whole question: "I know NDCG. Higher NDCG, better ranker. The only debate is which
metric." A corrects: none of the questions in the thread were about the model, or even mostly about
the metric.

## Story beats

1. The Slack thread. None of the questions are about the model. They're about the measuring stick.
2. Origin: Cyril Cleverdon at Cranfield froze the problem: fixed documents, fixed questions, a human
   list of what's relevant. Every offline eval descends from it. It broke at scale, so TREC judged
   only the pooled top results from every system. That shortcut has a cost that comes back later.
3. Metrics as models of a reader: MRR is a reader who stops at the first good answer; recall is "is
   it in there at all"; NDCG is a reader who gets bored gradually, with graded usefulness, the log
   discount, and dividing by the best possible. Linear vs exponential gain is a statement about
   users; always say which.
4. Where his model sits: the funnel. Bi-encoder vs cross-encoder; the reranker's score is capped by
   what the first stage hands it. Report first-stage recall next to reranked NDCG, and rerank the same
   candidates for both models.
5. Which queries: hand-picked queries are the worst (chosen for the old model's failures). Random log
   lines give mostly easy head queries; random distinct queries give mostly tail. Stratify, report per
   stratum, freeze the set. Agents as their own stratum.
6. Which documents got judged: pooling, and the unjudged hole. Unjudged counts as not relevant, so a
   new model that finds good pages nobody judged is penalized for its best feature. Check what share
   of its top results have labels; judge the holes.
7. How they got judged: a written guideline, and do two people agree more than chance (Cohen's
   kappa). Disagreement adds noise but usually doesn't flip which system wins. LLM labels calibrated
   against humans, and the circularity trap if the ranker was distilled from that LLM.
8. How sure: compare query by query, so each query's difficulty cancels; resample the queries
   (paired bootstrap). Build It insight: on a public benchmark, a gap the size of a published result,
   on a few hundred queries, and the range still crossed zero, because most queries tied exactly.
   A twenty-query notebook tells you almost nothing.

## Numbers worth saying

- "Twenty queries in a notebook."
- "A few hundred queries" and "most of them tied exactly" (SciFact).
- "Half the difference needs four times the queries."

## Left to the written lesson

The running example's grades and every computed value; precision and recall formulas; AP's walk; the
DCG and IDCG arithmetic and discount table; the metric comparison table; MS MARCO, TREC DL and BEIR
specifics; the kappa formula and worked example, weighted kappa values; click position bias details
and interleaving; the bootstrap sample-size calculation; all code, SciFact results tables, and Break
It specifics.
