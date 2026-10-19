<!-- section: The Slack thread -->

A: [relaxed, thinking out loud] So you've been training the cross-encoder for three weeks. Training loss is down, validation loss is down. You've got twenty queries you keep in a notebook cell, and on those, the new model's top results really do look better. So you post in a Slack thread. "New model, NDCG at ten is up a bit." Two numbers, side by side.

B: That's a pretty normal message.

A: Totally normal. And then the replies come in, and every one of them is fair. "Which NDCG? There are two common versions." "Which queries? Those twenty in your notebook, weren't they the ones the old model was bad at?" "Who labeled them?" "The new model pulls up a lot of documents the old one never showed. Were those ever judged? Because if not, your scorer counted them as irrelevant." And then the one that ends the meeting. "Is that gap bigger than the noise?"

B: [skeptical] I mean, I know NDCG. I know MRR, MAP. Higher NDCG, better ranker. Isn't the only real debate which metric you pick?

A: You do know them, and that's sort of the point. Look at those questions again. Not one of them is about the model. And only one of them is about the metric. They're about the measuring stick. A ranker is only "better" relative to three things: a metric, a set of queries, and a set of labels. Change any one of those and the winner can flip. The uncomfortable truth of ranking work is that the eval set matters more than the metric, and both matter more than the third decimal place.

<!-- section: Freezing the problem -->

A: This goes all the way back to the early nineteen sixties. Cyril Cleverdon, at the College of Aeronautics in Cranfield, in England, wanted to compare different ways of indexing aeronautics papers. And he couldn't sit and watch thousands of engineers search. So he froze the problem. A fixed pile of documents, a fixed set of questions, and for each question, a list made by a person of which documents were actually relevant.

B: So any system could be run against the same questions and scored the same way.

A: That's the whole recipe. Documents, queries, judgments, a metric. It's still called the Cranfield paradigm, and every offline eval you'll ever run is a descendant of it. And it worked fine for a little over a thousand documents. It falls apart at a million, because nobody can judge every document for every query.

B: So what did they do?

A: In the early nineties, the TREC competitions came up with a shortcut called pooling. Every team submits their ranking. You take the top results from each one, judge only that combined pile, and treat everything else as not relevant. Which is clever, and it has a cost. And that cost is going to come back to bite your new model in a bit.

<!-- section: Metrics are models of a reader -->

A: But first, the metrics, because I think there's a nicer way to hold them than as formulas. Each one is really a little model of the person reading the results.

B: Okay, what's MRR's person?

A: MRR's reader wants one thing, and stops as soon as they find it. So all that matters is where the first good result sits. First place is perfect, second place is half as good, way down the list is worth almost nothing, and nothing after that first hit counts at all. Perfect for "where are the TinyFish docs" or a factual question.

B: And recall's reader?

A: Recall doesn't care about order at all. It just asks, is the good stuff in there? Which sounds dumb for a final ranking, but it's exactly the right question for the first stage of your system. More on that in a sec. And then NDCG's reader is the one for web search. They read top to bottom, and they get bored gradually. And results aren't just good or bad, they're graded. Perfect answer, pretty useful, kind of related, junk.

B: Right, and lower positions get discounted.

A: By a logarithm. Which is a design choice, not a law of nature. It drops fast at the top and then flattens out. So swapping your first and third results costs you a lot, and shuffling things around near the bottom of the top ten barely moves it. And then you divide by the best score that was possible for that query, so an easy query with lots of good answers doesn't drown out a hard one with only one.

B: [working it out] And the "which NDCG" question in the thread is about the grades?

A: About how much each grade is worth. In one version, a perfect answer is worth a little more than a decent one. In the other, it's worth way more, so getting the one perfect answer to the top dominates everything. That's really a statement about your users, not about math. And both are in wide use, which is why you always say which one you used.

<!-- section: The funnel -->

A: So, about that first stage. Your cross-encoder reads the query and the document together, as one input. So every word in the query can look directly at every word in the document. That's why it's accurate. But it means nothing can be computed ahead of time. Every document has to go through the whole model, per query, right then.

B: Which is why it only reranks a short list.

A: Right. Something cheaper goes first. Either good old keyword search, or a bi-encoder, which turns the query and each document into separate vectors, so the documents can be done once, ahead of time. That cheap stage hands your model a shortlist. And here's the consequence for evaluation. If the right page isn't in that shortlist, no amount of cross-encoder training will ever put it at the top.

B: So my model's score is capped by the first stage.

A: Capped by the first stage's recall. So you always report that number next to your reranked NDCG, or you won't know which stage to blame. And when you compare old against new, they both have to rerank the exact same shortlists. Otherwise you're comparing first stages too, without meaning to.

<!-- section: Which queries -->

A: Now, the eval set itself. Start with which queries. And the worst choice by far is the one you already made. Those twenty in the notebook.

B: [laughs] Yeah, okay. Because I picked them.

A: You picked them because they were interesting, which usually means the old model failed on them. And any new model will look better on queries chosen for its predecessor's failures. That's not a measurement, that's a selection effect.

B: So just sample random queries from the logs.

A: Which sounds right, and has its own trap. Search traffic has this long tail shape. A few queries get searched constantly, and most distinct queries get searched once or twice ever. If you pick random lines from the log, you get mostly the popular queries, which tend to be easy and already well served. Your eval says everything's great, while the rare queries are on fire. And if you pick random distinct queries, you get mostly the rare ones, which undersells what most users actually see.

B: So you sample from each group separately.

A: Split by how common the queries are, sample a fixed number from each group, report each group on its own, plus an overall number weighted by real traffic. Then freeze the set, so you can compare this month's model to last month's. And at TinyFish there's a twist. A lot of your queries might come from agents, not people. Longer, more literal, often in bursts. They probably deserve their own group.

<!-- section: The unjudged hole -->

A: And now the cost of pooling comes due. Remember, the labels only exist for the documents that some system put near the top when the set was built. Anything outside that pile is unjudged. And standard scoring tools treat unjudged as not relevant.

B: [working it out] Oh. So if my new model is better because it finds good pages the old one never showed...

A: Those pages were never judged. So they count as junk. Your new model gets penalized for its best feature.

B: That's kind of awful. And I'd never see it in the score.

A: You wouldn't see it in the score, but there's a simple check. For each system, what share of its top ten results have any label at all? If the old model's is basically all of them and the new model's is a lot lower, its NDCG doesn't mean anything yet. And the fix is cheap. Just judge the holes. It's only the new model's unlabeled top results, and once they're labeled, every future model benefits too.

<!-- section: Who says what's relevant -->

A: And then, how are things judged. A label only means something if two people would give the same one. So you write a guideline. Not "is this page on topic", but "imagine the person typed this and is about to click, would this page satisfy them?" A page can be on topic and useless. And you write rules for the confusing cases, because that's where people disagree. Ambiguous queries. Python the snake or Python the language. Pages that were right a few years ago and are wrong now.

B: And then check that two people actually agree.

A: Have two people label the same pile, separately. But raw agreement is misleading, because if almost everything is junk, two people will agree a lot just by both saying "junk". So you use something called Cohen's kappa. It's agreement, corrected for how much you'd agree just by chance. And the reassuring part is that relevance is genuinely subjective, people do disagree a fair bit, and yet when researchers swapped whose judgments they used, the ranking of systems barely changed. Disagreement adds noise to everyone about equally.

B: Could I just have an LLM do the labeling?

A: People do, and careful LLM labels have been shown to agree with careful human labelers about as well as typical crowd workers. With conditions. Give it your guideline. Check its agreement against your own labels. And watch for a loop. If your cross-encoder was distilled from that same LLM, the eval will reward agreeing with that LLM, blind spots and all.

<!-- section: How sure -->

A: So finally, the question that ended the meeting. Is the gap bigger than the noise? The key move is to compare the two models query by query. For each query, new score minus old score. Because both models face the same query, the query's difficulty cancels out. An impossible query is zero for both, so the difference is zero.

B: And then you need some sense of how much that average difference would wobble.

A: If you'd drawn a different set of queries from the same traffic, would the new model still win? You don't have another set. But you can fake one by resampling the queries you have, with replacement, thousands of times, and looking at how much the average moves. That's the paired bootstrap. And the middle chunk of those averages gives you a range for the real improvement.

B: Okay. And how wide is that range, in practice?

A: This genuinely surprised me. I ran keyword search against a cross-encoder on a small public science benchmark, a few hundred queries. And the cross-encoder won by about the size of gap people publish papers about. And the range still crossed zero.

B: [skeptical] With a few hundred queries?

A: With a few hundred. Because most of the queries tied exactly. Both models got the same score. And the few that didn't tie jumped around a lot. Then I tried random handfuls of thirty queries, and the improvement bounced from basically nothing to looking huge, from one handful to the next. So that twenty-query notebook? It can tell you almost nothing about a small improvement. And it gets expensive fast. Detecting a difference half as big needs about four times the queries.

<!-- section: Ending -->

B: Okay, let me try. I can't just say "NDCG went up". Each metric is a model of how the reader behaves, and I should say which one and why. But mostly it's the eval set. Real sampled queries, not ones I picked. Check how many of the new model's results were even judged. Labels that two people agree on. And then report the difference with a range, query by query. And if the range crosses zero, the new model didn't win.

A: Almost. If the range crosses zero, you haven't shown it won. That's different from it losing. The honest sentence is "no detectable difference on this set", and then the pilot tells you how many more queries you'd need to see one. And that's the message you post in the thread. One difference, its range, how many queries, which gain. Anyone can read that and know exactly what you know.
