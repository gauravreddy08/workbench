<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture this. You've been training the cross-encoder for three weeks. Training loss is down. Validation loss is down. And you've got these twenty queries sitting in a notebook cell, the ones you keep re-running, and the new model's top results on them look... better. Honestly better. So you drop a line in the Slack thread. "v two, N D C G at ten, point four two one. v one was point four one two."

B: [casual] Sounds like a win.

A: It sounds like a win. And then the replies come in, and every single one of them is fair. Someone asks, "which N D C G? Linear gain or exponential?" Someone else, "which queries? Those twenty in your notebook, weren't those the ones v one was bad at?" Then, "who labeled them?" Then a sneakier one. "v two pulls up a lot of documents v one never showed. Were those ever judged? Because if not, your scorer counted every one of them as irrelevant." And then the one that ends the meeting. "Is plus point zero zero nine actually bigger than the noise?"

B: [sighs] Okay, I couldn't answer most of those.

A: [gently] Nobody can, the first time. And notice, not one of those questions is about the model. They're all about the measuring stick. A ranker is only "better" relative to three things. A metric. A set of queries you computed it on. And a set of labels you computed it against. Change any one of those three and the winner can flip. So that's the uncomfortable truth of ranking work. The eval set matters more than the metric. And both of them matter more than the third decimal place.

B: [a little defensive] I mean, I know the names, though. N D C G, M R R, map. If you'd asked me what they were I'd have gotten them right.

A: You would, yeah. And that's sort of the point. Knowing the names is one thing. What I want is the "that's why I know it" part. Derive each one from nothing, so you can say what it rewards and what it ignores. Feel it, by shoving results around and watching which numbers move. Then build the measuring stick for your actual model, and put error bars on the answer. By the end, every one of those Slack replies has an answer.

<!-- section: Origin -->

A: And this whole setup has a pretty specific birthplace. Early nineteen sixties, England. A man named Cyril Cleverdon, at the College of Aeronautics in Cranfield, wanted to compare different ways of indexing aeronautics papers. Like, which indexing scheme helps engineers find the right paper? And he couldn't just watch thousands of engineers search. So he froze the problem. A fixed collection of about fourteen hundred documents. A fixed set of questions. And for each question, a list, made by a human, of which documents were relevant. Now any indexing system could be run against the same questions and scored the same way.

B: So it's basically a test set. For search.

A: It's exactly a test set for search. Documents, queries, judgments, a metric. That recipe is still called the Cranfield paradigm, and every offline ranking eval you'll ever run, including the one you're about to build, is a descendant of it. But it has a problem. It works for fourteen hundred documents. It breaks at a million, because nobody can judge every document for every query. So in nineteen ninety-two, NIST, the US standards agency, started TREC, the Text REtrieval Conference. And they solved the scale problem with a trick called pooling. Every system that's competing submits its ranking. You take the top hundred from each one, you judge only the union of those, and everything else... you just treat as not relevant.

B: [skeptical] That seems like it'd come back to bite someone.

A: [amused] It does, and it's going to bite your v two, specifically. We'll get there. And then the last piece. Around two thousand to two thousand two, two researchers in Tampere, in Finland, Kalervo Järvelin and Jaana Kekäläinen, published something they called cumulated gain. A way to score a ranking when relevance comes in grades instead of yes or no, and when the top of the list matters more than the bottom. You know it as N D C G.

<!-- section: The Idea: Four objects and the running example -->

A: So before any formula, some vocabulary. Every offline ranking eval is four objects. First, a set of queries. Second, for each query, your system's ranked list of documents, say the top hundred. That list has a name, it's called a run. One run of one system. In the standard TREC file format it's literally one line per query, document, rank and score. Third, for each query, the answer key. Which documents a human said are relevant, and how relevant. That's called the qrels, short for query relevance judgments. Each judgment is a relevance grade, either zero or one, or, more usefully, zero to three, from "not relevant" up to "perfect answer". And fourth, a metric, which takes one ranked list plus its answer key and turns it into one number.

B: One number per query.

A: Per query. That's worth holding onto. Every metric gets computed for each query first, and then averaged over queries second. And that average hides a whole distribution. Some queries are easy, some are hopeless, a few are where the models actually differ. That distribution is where "how sure are you?" lives. We'll come back to it at the end.

A: Okay, here's the example we'll use for everything. The query is "is the python gil gone". Your ranker returned ten documents, and someone graded each one zero to three. Rank one, the Python three point fourteen docs page on free threading. That's a three, perfect. Rank two, a Monty Python cast list. Zero. Rank three, a summary post about PEP seven oh three, the proposal to make the GIL optional. That's a two. Rank four, the Python two point seven download page. Zero. Rank five, a talk from twenty sixteen about the Gilectomy, an old attempt to remove the GIL. That's a one, related but dated. Six and seven, a page about snake species, and a GIL meme thread. Zeros. Rank eight, a how-to for the free-threaded build. A two. And nine and ten, fish anatomy and some S E O spam. Zeros.

B: [working it out] So the good stuff is at one, three, five and eight. A three, a two, a one, and a two.

A: That's it. Four documents are relevant at all. And to keep the arithmetic honest, we'll pretend those four are the only relevant documents that exist anywhere for this query. In real life you never know that for sure. And that, the stuff nobody judged, turns out to be one of the biggest problems in this whole area. Park it.

<!-- section: The Idea: Precision and recall -->

A: Simplest possible question. Of the top k results, how many are any good? That's precision at k. Hits in the top k, divided by k. "Of what I showed, how much was good?" Take k as five. We've got hits at one, three and five. Three out of five. Point six.

A: And the flip side is recall at k. "Of everything good that exists, how much did I find?" Hits in the top k, divided by the total number of relevant documents, which people call R. Here R is four. We found three of them in the top five, so three quarters. Point seven five.

B: And those two fight each other, right? Show more, you find more, but you show more junk.

A: Right. Precision asks about what you showed. Recall asks about what you missed. If you raise k, recall can only stay the same or go up, and precision usually gets dragged down.

B: [a bit unsure] And precision at least cares about the order a little? Like, getting the good ones near the top?

A: [jumping in] Not at all, actually. That's the first blind spot. Swap rank one and rank five, so the perfect Python docs page drops to fifth, and precision at five doesn't move. Same three hits in the top five. It only knows where you drew the line, not what happened above it. Second blind spot, grades. The perfect answer and the barely-related Gilectomy talk each count as one hit. And recall has a third one: it needs R, the total number of relevant documents. And R is only as good as your judgments. If nobody ever found the fifth relevant page, your R is wrong and you'll never know.

B: So why does anyone use them?

A: Because sometimes that's exactly the question. Think about your setup. Before your cross-encoder sees anything, some cheaper first stage, B M twenty-five, or a bi-encoder, pulls a hundred candidates. Then your model reorders those hundred. Now, for that first stage, does order inside the hundred matter?

B: No. My model's going to reshuffle them anyway.

A: Right. The only question for the first stage is, are the good documents in the hundred at all? That's recall at a hundred. And it's the ceiling on everything your reranker can achieve. If the right page isn't in there, nothing you do downstream puts it at rank one. Hold onto that, because it shows up in the numbers later.

<!-- section: The Idea: MRR -->

A: Next. Sometimes the user wants exactly one thing. A navigational query, like "tinyfish docs". A factual question, like "when was PEP seven oh three accepted". A question-answering system that needs one passage with the answer in it. Once they've found it, they stop. Everything below the first good result doesn't matter to them at all.

A: So you score it by where that first good result sits. One divided by its rank. First result is relevant, you get one. Second, a half. Third, a third. Tenth, a tenth. Nothing relevant, zero. That's called the reciprocal rank. In our example the Python docs page is at rank one, so the reciprocal rank is one. If it had been sitting at rank three instead, it'd be a third. And then you average that over all your queries, and that's M R R, mean reciprocal rank. It got popular through TREC's question answering track in nineteen ninety-nine.

B: And the "at ten" bit, M R R at ten?

A: It's a cap. If nothing relevant shows up in the top ten, that query just scores zero, even if there's a hit at rank twelve. M S MARCO, which is Microsoft's big passage ranking dataset, uses M R R at ten as its official metric. And that makes sense for it, because M S MARCO has on average about one labeled relevant passage per query. One answer per question. So "where's the one answer" is the natural thing to ask.

A: [thinking out loud] Now listen to the shape of one over rank. Going from rank one to rank two costs you half a point. Going from rank nine to rank ten costs you about a hundredth. It's brutally top-heavy. And it ignores everything after the first hit. A list with one relevant document at the top and nine pieces of junk under it scores exactly the same as a list of ten perfect documents.

B: [amused] Huh. So by M R R, our snake-and-fish list is flawless.

A: Perfect score. One point oh. Because the first thing was right.

<!-- section: The Idea: AP and MAP -->

A: Okay, now the opposite user. Somebody who wants all the relevant documents, ranked as high as possible. A patent examiner. A lawyer going through discovery. Or, closer to home, a RAG system that wants every useful passage in its context. You'd like one number that rewards finding all of them, and finding them early.

A: Here's the move. Walk down the list. Every time you hit a relevant document, write down the precision at that exact point. So at rank one, we hit, and it's one hit out of one. Precision one. Keep walking. Rank three is the next hit. Two hits out of three, so two thirds, about point six seven.

B: [working it out] Then rank five, three out of five, point six. And rank eight, four out of eight, a half.

A: Yep. Now add those four up, one plus point six seven plus point six plus point five, and divide by... what?

B: By four? We found four hits.

A: [carefully] Divide by four, yes, but not because you found four. That's the detail that trips everybody up. You divide by R, the total number of relevant documents that exist, not by the number you happened to find. Here they're the same, so you get about point six nine. Point six nine two. That's average precision for this one query. Average it over queries and you get map, mean average precision, which was the workhorse metric of TREC through the nineties and two thousands.

B: Why does it matter which one I divide by, if it's the same here?

A: Because when it's not the same, that's the whole point. Say the how-to at rank eight had never been retrieved at all. If you divided by hits found, you'd average three precisions and get a nice high number. Dividing by R keeps that missing document in the bottom of the fraction, contributing a zero. That's how average precision punishes you for missing things. But it also means it depends on knowing R. So it inherits recall's weakness: it's only as good as how complete your judgments are. And it's still yes or no. A grade three and a grade one are both just "a hit".

<!-- section: The Idea: Building DCG -->

A: So far nothing we've talked about uses the grades. Let's build one that does. From scratch, one decision at a time. And the way to think about it is, imagine a user reading the list top to bottom.

A: Decision one. Each document contributes its usefulness. Call that the gain. Simplest choice, the gain is just the grade. Zero, one, two, three. If you add up the gains in the top five, three plus zero plus two plus zero plus one, you get six. That's called cumulative gain. But it's got the same problem as precision. Those same five documents in any order score six.

A: Decision two. A document lower down is worth less, because fewer people get that far. So multiply each document's gain by a discount, a weight that shrinks as you go down. It stands in for "how likely is the user to read this far". Add up gain times discount over the top k, and that's D C G. Discounted cumulative gain.

A: And the discount I'd use is one over a logarithm. One divided by the log, base two, of the rank plus one. And I know that sounds arbitrary, so let's just look at what it does. At rank one, it's one. Full value. Rank two, about point six three. Rank three, exactly a half. Rank five, around point three nine. And by rank ten it's about point two nine.

B: [skeptical] Why a log, though? Why not just one over the rank, like M R R?

A: [thinking out loud] Fair. So, what do you actually need? Something that starts at one, always goes down, and doesn't fall to zero too fast. Look at the options. One over the rank says rank ten is worth a tenth of rank one. Which means everything past about rank three barely counts at all. You could do a straight line, like one, point nine, point eight, and so on, but that hits zero at some arbitrary rank, and it says swapping ranks one and two is exactly as bad as swapping nine and ten. And no user believes that. The log is the gentle middle. It drops fast at the top, and then it flattens out. Under the log, rank ten still keeps almost thirty percent of its value. Under one over the rank, it keeps ten.

B: So it's just... a guess about how people read.

A: It's a design choice, not a law of nature. A reasonable model of somebody who gets bored gradually. It stuck because it behaves well. Wang and some colleagues showed in twenty thirteen that it has nice theoretical consistency properties. And later metrics, like one called rank-biased precision, throw it away and give you a patience knob you can tune instead.

B: And why the "plus one"?

A: Because the log of one is zero. And dividing by zero at rank one would be bad. Shift everything by one and rank one gets a discount of exactly one. Fun detail, the original two thousand two paper actually didn't discount the first few ranks at all. The plus-one log version is just what everyone settled on later.

A: So let's run it, top five, gain equals grade. Rank one is a three, times one, that's three. Rank two is zero. Rank three is a two, times a half, that's one. Rank four, zero. Rank five is a one, times about point three nine. Add them up, about four point three nine. D C G at five is four point three eight seven.

<!-- section: The Idea: NDCG -->

A: Now, D C G on its own has one problem. Its scale depends on the query. A query with ten perfect documents can rack up a D C G somewhere in the teens. A query that only has one relevant document can't get past three, no matter how well you rank. So if you just average raw D C G over queries, the easy, lots-of-answers queries drown everyone else out.

A: So you normalise. Take the same grades, sort them best to worst, and compute the D C G of that perfect ordering. That's called the ideal D C G. The best you could possibly have done. For us, the ideal order is three, two, two, one, then zeros. Three times one is three. Two times point six three is about one point two six. Two times a half is one. One times about point four three. Total about five point six nine.

B: And then I divide.

A: Divide yours by the ideal. Four point three nine over five point six nine. About point seven seven. That's N D C G at five. Point seven seven one. And now every query lives on the same zero to one scale, where one means "you produced the best possible ordering of the documents we know about".

B: [a bit unsure] And the ideal, that's just my top ten, sorted properly, right? Like, take what I returned and put it in the best order.

A: [firmly] No. And this is the clause that matters. The ideal is built from all the judged documents for that query in the answer key. Not from the ones you happened to return. Say your system missed the how-to entirely, never retrieved it. The ideal still includes it, because a human said it was a two. And your N D C G is lower for having missed it. If you build the ideal from your own list instead, you get a very famous bug. You'll commit it on purpose later and watch what it does.

<!-- section: The Idea: Predict, which swap costs more -->

A: Okay, guess this one. Start from our list, and look at the top ten. Which costs more N D C G: swapping ranks one and three, so the perfect docs page and the PEP summary trade places? Or taking the how-to at rank eight and moving it down to rank ten?

B: Hmm. The first one moves a three down two spots. The second moves a two down two spots. So... the first one's worse, but not by a ton? Maybe twice as bad?

A: [amused] It's a lot more than twice. Work the top swap. Before, the perfect page at rank one gives three times one, and the PEP summary at rank three gives two times a half. Four total. After, the two is at the top, two times one, and the three is at rank three, three times a half, one and a half. Three and a half. You lost half a point of D C G. N D C G at ten goes from point eight eight one down to about point seven nine four.

B: And the how-to?

A: Rank eight's discount is about point three one five. Rank ten's is about point two eight nine. It's a grade two, so you lose two times the difference, about five hundredths. N D C G at ten only drops to about point eight seven two. So it's roughly ten times cheaper. Same amount of wrongness, two ranks, but the discount is steepest at the top, so the top is where it costs you.

<!-- section: The Idea: The ranking metric lab -->

A: And this is really something you want to feel with your hands. So picture a little lab. Ten rows, our ten documents, top to bottom. Each row has a handle you can drag to reorder it, and a grade you can click to cycle zero, one, two, three. There's a slider for k. Next to each row there's a bar: a dashed outline for that document's gain, and a solid fill for what's left after the discount. And off to the side, live readouts for precision, recall, reciprocal rank, average precision, D C G, the ideal, and N D C G.

A: Now the thing to watch. Swap two documents that are both inside the top k. Precision and recall don't twitch. Average precision and N D C G move. And reciprocal rank only cares if you touched the first relevant row.

B: What happens if I hit some kind of "perfect order" button?

A: There is one. Sort ideal. N D C G goes to exactly one at every k. Average precision and reciprocal rank go to one too. But precision doesn't. Precision at ten can never get above point four, because there are only four relevant documents. Four out of ten, best case. So precision is capped by how many relevant documents a query happens to have. Which makes it awkward to average across queries, because some queries can't ever score well.

A: Here's another one I like. Set every grade to zero except one document. Then drag that one row down, from one to ten. Reciprocal rank goes one, a half, a third, a quarter. N D C G goes one, point six three, a half, point four three. With a single relevant document, N D C G is exactly the log discount, and reciprocal rank is exactly one over the rank. Two different models of patience, drawn as two curves.

A: And then there's a toggle for the gain. Switch it from "gain equals the grade" to the exponential version, two to the power of the grade, minus one. So the three becomes a seven. The twos become threes. The one stays a one.

B: [working it out] So the perfect answer is suddenly worth more than two of the good ones put together.

A: More than twice a two, yeah. Under exponential gain, getting the one perfect answer to the top matters far more than anything else on the list. And that's a statement about your users, not about math. Use exponential when there's "the" answer, navigational or factual queries. Use linear when lots of documents are useful in roughly equal measure. Both are in wide use. The standard TREC scoring tool, trec eval, and its Python wrapper, pytrec eval, use linear gain by default. A lot of learning-to-rank papers, and Light G B M's ranking objective, use the exponential form. So when that first Slack reply asked "linear or exponential?", it wasn't nitpicking. On our list, linear gives point eight eight one at ten, exponential gives point nine oh nine. Same ranking. Always say which one you used.

<!-- section: The Idea: Predict, one relevant document -->

A: One more to chew on. On M S MARCO, almost every query has exactly one labeled relevant passage, graded one. On a query like that, how do N D C G at ten and reciprocal rank differ? Could a model improve one and hurt the other?

B: [working it out] Well, if there's one relevant thing at rank r... the ideal is just that thing at the top, so the ideal D C G is one. So N D C G is just the discount at r. And reciprocal rank is one over r. They're both just functions of where that one passage landed.

A: Yep, that's it.

B: So they always move together. You can't improve one and hurt the other.

A: On one query, right. Both get better when r goes down. But they weigh moves differently. Moving the passage from rank two to rank one is worth half a point of reciprocal rank, but only about point three seven of N D C G. Moving it from rank ten to rank five is worth a tenth on reciprocal rank, and about a tenth on N D C G too. So averaged over lots of queries, the two metrics can actually disagree about which of two models is better. M R R favours the model that nails rank one more often. N D C G is more forgiving of near misses.

<!-- section: The Idea: Which metric for which job -->

A: So let me just say what each one rewards and what it's blind to, quickly. Precision at k rewards a clean top k, and ignores order inside it, grades, and what you missed. Recall at k rewards finding everything by rank k, and ignores order, grades, and how much junk you showed, and it needs R. Reciprocal rank rewards one good answer very early, and ignores everything after it. Average precision rewards all the relevant documents early, ignores grades, and gets shaky when judgments are missing. And N D C G at k uses the grades, cares about order smoothly, and rewards the best documents at the very top. It just can't see anything below k.

A: Now match those to jobs. Web search, which is your world. Users scan a short page, results come in shades of useful, and the top three get most of the attention. So N D C G at ten, with graded labels, is the standard. With M R R as a sanity check for navigational queries. That's also why TREC's Deep Learning track reports N D C G at ten. Question answering, where one answer is wanted: M R R at ten, or something called success at one, which is just "is the first result right?" And first-stage retrieval feeding your reranker: recall at a hundred, or at a thousand.

B: And RAG? The reader's an LLM. It reads all ten passages, so order shouldn't matter, right?

A: [thinking it over] Mostly, that's the right instinct. The LLM doesn't get bored at rank four. But it does have a budget. Say ten passages fit in the context. So the first question is recall at ten. Is the evidence even in there? But N D C G still helps if you put the best passage first, or if the model has a position bias of its own. Which they do. Models tend to use what's at the start and the end of the context more than what's in the middle. So order isn't totally free.

<!-- section: The Idea: The funnel, bi-encoders and cross-encoders -->

A: So, where does your model sit in all this? A web search engine can't run a big model over billions of pages for every query. So ranking is a funnel. Picture it left to right. On the far left, the corpus, billions of pages. Then a cheap stage, B M twenty-five or a bi-encoder, that narrows that down to around a thousand. Then you, your cross-encoder, working on the top hundred or so. And on the far right, the ten you actually show. And under the left half, the metric is recall at k. Under your part, it's N D C G at ten and M R R at ten.

A: The difference between the two kinds of models is the whole reason for the funnel. A bi-encoder turns the query into a vector, and each document into a vector, separately. And then it scores a pair with a dot product. The document's vector never sees the query. So all the "does this actually match?" reasoning has to get squeezed into one dot product at the very end. What you get in exchange is huge, though. You embed the whole corpus once, offline, and then searching it is just finding the nearest vectors. Milliseconds.

A: A cross-encoder glues them together. The query, a separator token, then the document, all as one input. And one transformer runs over the whole thing. And you've built attention from scratch, so you know what that buys. The token "gil" in the query can attend directly to "Global Interpreter Lock" in the right document... and to "fish" in the wrong one. It's way more accurate. The cost is that nothing can be computed ahead of time. Reranking a hundred candidates is a hundred forward passes. Per query. At query time. That's why it sits after the retriever, and why it's judged on N D C G at ten and M R R at ten, not on recall.

B: [a bit unsure] So if my model's good enough, it kind of makes up for a weak retriever?

A: [flatly] It can't. That's the first consequence. Your reranker's score is capped by the retriever's recall. If the right page isn't in the hundred that B M twenty-five hands you, no amount of cross-encoder training puts it at rank one. So always report first-stage recall at a hundred right next to your reranked N D C G at ten. Otherwise when things go wrong, you won't know which stage to blame.

A: Second consequence. A fair comparison holds the candidates fixed. v one and v two should rerank the exact same candidate lists, so the only thing that differs is the reranker. And there's a middle ground worth knowing the name of. Late interaction models, like ColBERT. They keep a vector for every token of the document, so some query-document interaction survives being precomputed.

<!-- section: The Idea: Offline metrics versus users -->

A: Now. Everything so far is what's called offline evaluation. A fixed set of queries, human labels, or model labels, and no live users anywhere. It's repeatable, it's cheap per run, and it's only as good as those labels. The other option is watching real users. Online signals. Click-through rate, the fraction of searches or result impressions that get a click. Dwell time, how long somebody stays on the result they clicked. And a click followed by a quick bounce back to the results usually means "nope, that was wrong". And abandonment, a search where nobody clicks anything.

B: Which is bad.

A: [wry] Which is ambiguous. It could mean nothing looked good. Or it could mean the answer was right there in the snippet and they didn't need to click. That's what makes it hard to read.

B: [casual] Okay, but honestly, clicks seem like the obvious labels, though. They're free, there's millions of them, they're from real people. Why pay someone to grade documents when users are grading them for me?

A: [gently] They're tempting. But they're biased in a way that's really easy to forget. People click higher-ranked results more, regardless of how good they are, just because they see them first and they trust the ranking. That's called position bias. So a click on rank one is weak evidence. A click on rank eight is strong evidence, because they scrolled past seven things to get there. Thorsten Joachims and colleagues showed this with eye-tracking in two thousand five. They secretly swapped the top two results, and people still clicked the top spot more.

B: Huh.

A: So if you train on clicks from the current ranker, or evaluate on them, you mostly learn "what does the current ranker put at the top". And then say your new model finds a great page that the old one had at rank thirty. Nobody ever clicked it, because nobody ever saw it. So the new model gets zero credit for its best move. Clicks also mix in how good the snippet was, separate from the document itself. They're still really valuable. As an online test. Or as training data, once you correct for position bias. But for comparing models fairly and repeatably, you want judgments on a sampled set of queries.

A: So the way it splits in practice. Offline evals are how you iterate. Twenty checkpoints compared before lunch. Online tests are how you confirm the win is real for users. Either a standard A B test, or something called interleaving, where you merge both rankers' results into one list for each user and see whose results get clicked more. That's much more sensitive than an A B test, because every user is comparing both. And if offline N D C G says v two wins, and the online test says users don't care, the usual culprit is the eval set. It doesn't look like real traffic, or its labels don't reflect what users actually value. Which brings us to the most important part of all this.

<!-- section: The Idea: Which queries -->

A: Your metric is only as good as three choices. Which queries. Which documents get judged. And how they get judged. Queries first.

A: Query traffic has a long tail. Picture a curve, queries sorted by how often they're searched. On the far left, a handful of queries, "weather", "youtube", searched millions of times. The curve drops off a cliff, and then it runs flat for a really long way to the right. Out there are queries like "python gil removed three point fourteen benchmark", each searched once or twice, ever. You split that curve into three zones. The head, a few queries with a huge share of the traffic. The torso in the middle. And the tail, which holds most of the distinct queries. And all the traps are about how you sample from it.

A: Worst option, hand-picked queries. The notebook twenty.

B: [laughs] Yeah, I had a feeling.

A: [laughs] You picked them because they were interesting. Which almost always means "v one failed on them". And any model is going to look better on queries chosen for its predecessor's failures. That's a selection effect. It's not a measurement.

A: Next option, uniform over searches. Pick random lines from the log. Sounds fair. But you get mostly head queries, because head queries are most of the log lines. And head queries tend to be easy and already well served. So your eval says "everything's great" while the tail is on fire. Flip it, uniform over distinct queries, and now you get mostly tail. Which is actually where rankers differ the most, but it undersells what most users experience.

A: The standard answer is to split by frequency into strata. Groups you sample from separately. For example, the head is whatever queries make up the top third of traffic, the torso's the next third, the tail's the rest. Sample a fixed number from each, so each group has enough queries to measure. Then report the metric per stratum, plus one overall number weighted by each stratum's share of traffic. Sample from real logs, from a recent window, after stripping anything private. Then freeze the set. An eval set that changes every week can't compare this week's model to last month's. And keep a few hundred queries locked away that you never look at while you're developing. Same reason you keep a test set in any ML project.

A: And there's a TinyFish twist. A lot of your users might be agents, not people. Agent queries are longer, more literal, and they come in bursts from one task. So sample them as their own stratum. They might want something different from a ranking, like complete coverage, instead of one nice snippet.

<!-- section: The Idea: Pooling and unjudged documents -->

A: Second choice. Which documents get judged. You can't judge the whole web for every query. So you do what TREC did. Pooling. Take the top ten or twenty from several systems that work differently. B M twenty-five, a bi-encoder, your current cross-encoder, maybe a commercial search API. Union them, and judge only that union. That set is called the pool. And diversity is the whole point. B M twenty-five finds exact-match pages that embeddings miss. Embeddings find paraphrases that B M twenty-five misses. The more differently the pooled systems fail, the fewer relevant documents stay hidden.

A: Picture it like this. Three columns, B M twenty-five, the bi-encoder, and your v one, each with its top five. Lots of overlap between them. Union them and you get nine distinct documents, and a human grades all nine. Then off to the right, a fourth column. Your new v two. Its top five has three documents from the pool... and two, at ranks two and four, that none of the other systems ever returned. Nobody graded them. They might be great.

B: And they get scored as...

A: [flat] Zero. Standard scorers, trec eval included, treat any unjudged document as not relevant. Which is a guess, not a fact. And it's fine for the systems that built the pool. It's unfair to a new system. Which is exactly what your v two is.

B: [skeptical] Wait. So if v two is better precisely because it finds good stuff v one never surfaced...

A: Then those pages are unjudged, and v two gets penalised for its best feature. Yes. And there's a really simple check for it, called judged at k. The fraction of a system's top k that has any label at all. Compute it for every system you report. If v two's judged at ten is point nine seven and v one's is one point oh, fine. If v two's is point seven, its N D C G is basically meaningless until you judge those holes. And the good news is judging the holes is cheap. It's only v two's unjudged top-ten documents. And once they're in the answer key, they improve the eval set for every future model too. There are alternatives. A metric called B pref, from Buckley and Voorhees in two thousand four, was designed to ignore unjudged documents. Or you can just drop unjudged documents from the ranking before scoring. But judging the holes is usually best.

A: M S MARCO is the cautionary tale here. Its labels came from people who marked one passage that answered the question. So most queries have exactly one positive, and plenty of other relevant passages just never got labeled. And strong rerankers routinely put an unlabeled-but-correct passage at rank one, and get their M R R "penalised" for it. That's part of why TREC's Deep Learning track went back and re-judged a small set of queries deeply, with graded labels.

<!-- section: The Idea: Labeling guidelines -->

A: Third choice. How documents get judged. And here's the test for a label: it's only meaningful if two people would give the same one. Which takes a written labeling guideline. The rulebook labelers follow. What each grade means, worked examples of each, and explicit rules for the confusing cases. It's the single most important document in an eval set.

A: A good one for web search does a few things. First, it states the user's intent. Like, "imagine the person just typed this query and is about to click. Would this page satisfy them?" Not "is this page on topic?" A page can be completely on topic and totally useless.

A: Second, it defines each grade, with examples from your own data. Three, perfect: this page is the answer, or the destination they were looking for, nothing else needed. Two, highly relevant: it substantially answers the query, maybe they'd want one more source. One, related: on topic, partly useful, or out of date. Zero, not relevant: the wrong meaning, spam, broken, or useless for this query. That's close to the four-level scale TREC Deep Learning used.

A: Third, it has rules for the hard cases. Because that's exactly where labelers split. Ambiguous queries. "Python", the snake or the language? Do you grade against the most likely intent, or the mix? Outdated pages. A correct answer from twenty nineteen to "is the gil gone" is now wrong. Duplicates. Paywalls. Pages that are correct but low quality. Pages in the wrong language. And fourth, it says what the labeler gets to see. Just the query? Or context too, like the user's location, or the time? Your users, or your agents, had context the labeler doesn't. Decide that on purpose.

A: And then grade every pooled document, not just the top few. And show them in random order, with the system names hidden, so nobody can go easy on "the new model's" results.

<!-- section: The Idea: Cohen's kappa -->

A: So you write the guide. Then you give the same fifty queries' worth of pooled documents to two labelers, independently. If they disagree a lot, your guideline is ambiguous. And a metric built on those labels has a noise floor that no model improvement can climb above.

B: And I'd measure that how, just percent agreement? Like if they agree seventy-five percent of the time, that sounds pretty decent.

A: [thinking out loud] It sounds decent, but raw agreement is misleading. Because some agreement happens by pure chance. Imagine both labelers mark ninety percent of everything "not relevant". They're going to agree on most documents even if they're basically guessing. So you correct for that. Cohen's kappa. The idea in words: take how often they actually agreed, subtract how often they'd agree by chance, and then divide by how much room there was above chance. One means perfect agreement. Zero means no better than chance.

A: Let's do one. A hundred documents, yes-or-no labels. Both said relevant on forty. Both said not relevant on thirty-five. Labeler A said yes and B said no on fifteen. And A no, B yes, on ten. So they agreed on forty plus thirty-five, seventy-five out of a hundred. Point seven five.

B: That's your seventy-five percent.

A: That's it. Now chance. Labeler A said yes fifty-five percent of the time. B said yes half the time. If they labeled independently at those rates, they'd both say yes about point five five times point five of the time, and both say no point four five times point five. Add those and you get exactly a half. So by chance alone, they'd agree half the time.

B: [working it out] So the real agreement above chance is a quarter... and the most there could have been is a half. So kappa's a half.

A: [pleased] Point five. Half of the possible above-chance agreement. Which sounds a lot less impressive than seventy-five percent.

A: And for graded labels you want a variation, weighted kappa. A two-versus-three disagreement shouldn't count as much as a zero-versus-three. So near misses get partial credit. With quadratic weights, big gaps get punished the most. In scikit-learn it's the same Cohen kappa function, with weights set to quadratic. And this matters for reporting. When I simulated five hundred graded labels where the second labeler was off by one grade about forty percent of the time, unweighted kappa came out point six one. Linear-weighted, point seven eight. Quadratic, point nine. Same labels, three numbers. So, again, always say which one.

A: How do you read the number? There's a rough, commonly used scale from Landis and Koch, nineteen seventy-seven, and it really is rough. Point four one to point six is "moderate". Point six one to point eight, "substantial". Above point eight, "almost perfect". And relevance is genuinely subjective. Don't expect point nine.

B: [skeptical] But then, if two careful people disagree that much, doesn't that make the whole eval kind of... meaningless?

A: [reassuring] You'd think. But Ellen Voorhees showed in two thousand that TREC assessors often disagree substantially about individual documents, and yet the ranking of the systems barely changed when you swapped whose judgments you used. The disagreement adds noise to every system roughly equally. It doesn't usually flip who wins, as long as the differences between systems are real and there are enough queries. So low kappa is a reason to fix the guide. Not a reason to give up.

A: And the fix is really concrete. Look at the disagreements. Every one of them is a sentence missing from your guideline. Go through them together, add a rule or an example, relabel, recompute. Two or three rounds usually gets you from "moderate" to "substantial".

<!-- section: The Idea: LLM labels -->

A: Now, labeling thousands of query-document pairs by hand is slow. LLMs can do it. In twenty twenty-three, Paul Thomas and colleagues at Microsoft reported that carefully prompted GPT four relevance labels agreed with careful human labelers about as well as typical crowd workers did, at a small fraction of the cost. That's standard practice now. With three conditions.

A: One, give the model your guideline. Verbatim, with the worked examples. The model is a labeler like any other, and labelers need the rulebook. Two, calibrate it against humans on your fifty-query pilot. Compute kappa between the LLM and each human, and between the two humans. If the LLM-versus-human number is close to the human-versus-human number, the LLM is just "another reasonable labeler". If it's not, look at where it disagrees. And redo that check every time you change the prompt or the model.

A: And three, watch for circularity. Quick reminder of the idea: the thing grading a model shouldn't share that model's blind spots, or the grade just measures agreement with itself. So in your world. If your cross-encoder was distilled from an LLM, or trained on labels some LLM produced, and now that same LLM is judging it...

B: Then the eval rewards agreeing with that LLM. Including wherever it's wrong.

A: Blind spots included. So keep a slice of human-labeled queries as an anchor. And check that the LLM-judged slice and the human-judged slice agree about which model wins.

<!-- section: The Idea: How sure? The paired bootstrap -->

A: Okay. Back to plus point zero zero nine. Your mean N D C G is an average over queries. And queries are wildly different. Some are easy, both models get one. Some are impossible, both get zero. And a few are where the models actually differ. So the real question isn't "is point four two one bigger than point four one two". It obviously is. The question is, if I'd drawn a different three hundred queries from the same traffic, would v two still win?

B: [a bit unsure] So I'd compute an error bar on each model's average, and see if they overlap?

A: [jumping in] That's the natural thing to do, and it throws away the most useful thing you've got. Both models were scored on the same queries. So compare them query by query. For each query, take v two's N D C G minus v one's. One number per query, the delta. Because both models saw the same query, the query's difficulty cancels out. An impossible query is zero minus zero, it contributes nothing. An easy query, one minus one. All that query-to-query variation, which is usually most of the variation, just disappears. That's called a paired comparison, and it's far more sensitive than comparing two averages.

A: Then you ask how much the average delta would wobble with a different sample of queries. You don't have a different sample. But you can fake one. That's the bootstrap, from Bradley Efron in nineteen seventy-nine. Say you have three hundred queries. Draw three hundred from those three hundred, with replacement, so some show up twice and some don't show up at all. Compute the mean delta. Do that ten thousand times. Now you've got ten thousand plausible mean deltas, and the middle ninety-five percent of them is your ninety-five percent confidence interval for the improvement.

<!-- section: The Idea: Predict, how many queries -->

A: Try this. Say the per-query deltas have a standard deviation of about point one two. That's typical-ish when about half the queries tie exactly. And say the true improvement is plus point zero two. Roughly how many queries before the interval stops crossing zero?

B: [working it out] I'd guess... a thousand? It feels like a small effect.

A: [amused] Fewer than that. There's a rule of thumb. The interval's half-width is about two times the standard deviation, divided by the square root of the number of queries. You need that under point zero two. So two times point one two, that's point two four, divided by root N, under point zero two. Which means root N has to be above twelve.

B: So N above a hundred forty-four. Call it a hundred fifty.

A: About a hundred fifty. In practice you want comfortably more, three to five hundred, because the standard deviation you estimated is itself noisy, and real improvements are often smaller than point zero two. And here's the part to remember: because of that square root, halving the difference you want to detect means four times the queries.

A: Now picture a little simulator for this. Top half, a histogram of per-query deltas, with a big spike right at zero where the two rankers tie, and a spread on both sides that's centred a bit above zero. Bottom half, the mean delta recomputed on a couple thousand resamples, with a blue bar marking the middle ninety-five percent. There's a slider for the number of queries, from twenty-five all the way up to sixteen hundred, and a button that draws a whole new eval set. At a hundred queries, the blue bar usually crosses zero. By four hundred, it usually doesn't. And every time you hit "new eval set" at small sizes, the whole interval jumps around.

<!-- section: The Idea: Three habits and other tests -->

A: So three habits fall out of this. First, report the delta and its interval. Not two scores side by side. Like: "v two minus v one, N D C G at ten, plus point zero zero nine, ninety-five percent interval from minus point zero zero four to plus point zero two two, three hundred queries, paired bootstrap." Anyone can read that sentence and know exactly what you know.

A: Second, look at the per-query deltas, not just their mean. Wins, losses, ties. Sort the losses and actually read the ten worst queries. That's where your next training data comes from. Third, report per stratum. Head, torso, tail, agents. An overall plus point zero one can be plus point zero five on the tail and minus point zero two on the head. Which may or may not be the trade you want.

A: And the bootstrap isn't the only valid test. There's the paired t-test and the paired randomization test, sometimes called a permutation test. Smucker, Allan and Carterette showed in two thousand seven that on TREC data the three mostly agree. The bootstrap's appeal is that it hands you an interval directly, and it works for any metric. The proper statistics, why these work, multiple comparisons, sizing the set before you run anything, that's its own topic, and it's the natural next one.

<!-- section: The Idea: Benchmarks you'll see cited -->

A: Quick tour of the benchmarks people cite, because now you can see what each one is trading. M S MARCO, from Microsoft in twenty sixteen. Real Bing questions with human-written answers. The passage ranking task has about eight point eight million passages, and the dev set everyone uses, called dev small, has six thousand nine hundred eighty queries. With sparse, mostly single, yes-or-no labels. Official metric, M R R at ten. B M twenty-five scores around point one nine. The first BERT cross-encoder reranker, Nogueira and Cho in twenty nineteen, jumped to about point three six. Nearly double. That's the moment cross-encoders took over reranking. It's the exact architecture you're training.

A: TREC Deep Learning, from twenty nineteen on, uses the same corpus but makes the opposite trade. Only a few dozen queries a year, forty-three for the twenty nineteen passage task, but each one judged deeply by NIST assessors on that four-level scale, pooled from every participating system. Metric, N D C G at ten. Fewer queries, far more complete judgments.

A: And BEIR, from Thakur and colleagues in twenty twenty-one. Eighteen datasets, across really different domains. Science fact-checking, medical, finance, argument retrieval, duplicate questions, entity search. It's built to test zero-shot retrieval: train on M S MARCO, then evaluate everywhere else. Metric, N D C G at ten. And its famous findings: B M twenty-five is a stubbornly strong baseline out of domain. Lots of dense bi-encoders trained on M S MARCO fall below it. B M twenty-five plus a cross-encoder reranker was strongest on average. And the pools, built from older lexical systems, disadvantage new dense models. Which is the unjudged problem again, at benchmark scale.

<!-- section: Build It: Setup and metrics from scratch -->

A: So here's what you'd actually build. You'd use one of the BEIR datasets as a public sandbox first, and then build the real eval set for your own model. The sandbox is SciFact. Scientific claims as the queries, paper abstracts as the documents. About five thousand two hundred documents, and three hundred test queries with judgments. Small enough to run every model on a laptop in a few minutes. Setup is just a virtual environment and a few packages: pytrec eval, a library called ranx, a small B M twenty-five library, sentence transformers, and scikit-learn. One small gotcha, ranx compiles its metrics the first time you call it, so that first call takes a minute or two.

A: And the file formats are worth knowing, because you'll see them everywhere. An answer-key file is one line per judgment: the query I D, a zero that's just a leftover legacy column nobody uses anymore, the document I D, and the grade. A run file is one line per result: query I D, a literal "Q zero" placeholder, document I D, rank, score, and a name for the run.

A: Then the part that's actually yours to write. Every metric we talked about, from scratch, in one file, with nothing but the math module. Each function takes one query's ranked list and that query's judgments. Precision, recall, reciprocal rank, average precision, D C G, N D C G, and judged at k. Plus one function that turns scores into ranked lists, where you have to decide how to break ties, and write that decision down.

B: [casual] That part sounds easy, honestly.

A: [wry] It's easy to write. It's also easy to get subtly wrong, and every rule here is a real bug that somebody's shipped. "Relevant", for the yes-or-no metrics, means grade one or higher. R, for recall and average precision, counts relevant documents in the answer key, not in your ranking. The ideal D C G sorts all the judged grades for that query, from the answer key, not the grades of what you retrieved. And a query with no relevant documents at all, you have to decide what to return, and be consistent. For what it's worth, trec eval just skips queries that aren't in the answer key at all.

A: And you test it on our python gil example. At k equals five you should get precision point six, recall point seven five, reciprocal rank one, average precision point six nine two over the whole list, N D C G at five point seven seven one. N D C G at ten, point eight eight one. And with exponential gain, N D C G at ten, point nine oh nine. If you hit every one of those, you're probably right.

<!-- section: Build It: Validate against the standard tools -->

A: [laughs] Probably. Because your metrics are only trustworthy once they agree with the tools everyone else uses. So the next step is a fuzz test. Generate a random case: fifty queries, forty documents each, fifteen of them graded at random from zero to three, random scores. Score it with your code, with pytrec eval, and with ranx, query by query, and check the biggest difference for each metric is under, like, a billionth.

A: When I did this, my from-scratch precision at ten, recall at ten, average precision and N D C G at ten all matched pytrec eval down to floating-point rounding. Differences around ten to the minus sixteen. Which also confirms that trec eval's N D C G uses linear gain and the log of rank plus one. One trap, though. Trec eval's reciprocal rank isn't cut at ten. So compare it to your uncut version. And if something doesn't match, tie-breaking is the usual culprit.

<!-- section: Build It: Three systems on SciFact -->

A: Then the benchmark. Three runs over the three hundred test queries, each keeping the top hundred. First, B M twenty-five, over title plus text, lowercased and split into words. Second, a bi-encoder, a small sentence transformers model called all Mini L M L six v two. Embed all five thousand or so documents once, embed the queries, and score with one matrix multiply. Third, B M twenty-five plus a cross-encoder, the ms marco Mini L M L six v two cross-encoder, which reranks B M twenty-five's hundred candidates for each query.

A: And you score all three with your own metrics. N D C G at ten, M R R at ten, map, recall at ten, recall at a hundred, judged at ten. Time each stage. And write down your predictions before you run it. Then have an agent review it, specifically hunting for unfair comparisons. Different candidate sets, the test answer key leaking into anything, how ties are handled.

<!-- section: Build It: The paired bootstrap -->

A: Then the bootstrap, which is a surprisingly small function. Two dictionaries in, per-query metric for each system, same query I Ds. Build one array of deltas. And the trick that makes it fast: generate all ten thousand resamples at once, as one big grid of random indices, ten thousand rows of three hundred, and take the mean of each row. That's all ten thousand resampled means in one shot. Sort them, and read off the two and a half percent and the ninety-seven and a half percent points. Print wins, losses, and ties too. Run it for cross-encoder minus B M twenty-five, bi-encoder minus B M twenty-five, and cross-encoder minus bi-encoder. And then run it again on a random thirty-query subset and watch what happens to the interval.

<!-- section: Build It: The pilot and the real report -->

A: And then the real ranker. A fifty-query pilot. Sample from a recent window of real query logs, personal stuff removed, bucketed into head, torso, tail, plus agent traffic if you can tell it apart. About twelve or thirteen from each bucket. Write down the exact rule, and save the random seed. Pool: for each query, the top ten from at least three systems. Your first-stage retriever on its own, your current production cross-encoder, and your new model. Plus any external search API you can legally use as a reference. Dedupe, and you end up with something like fifteen to twenty-five documents per query.

A: Then write the guide, one or two pages. The user-intent framing, the zero to three scale with two real examples per grade from your own data, and rules for at least five hard cases: ambiguous, outdated, duplicate, low quality, paywalled or broken. Before anyone labels, have an agent read the guide and try to break it. Ask it to come up with query-document cases where two careful readers of your guide would give different grades.

A: Then you and one colleague label every pooled pair, independently, shuffled, system names hidden. Honestly a spreadsheet is enough. Query, document, U R L, snippet, grade, a note. Compute unweighted and quadratic-weighted kappa. Read every disagreement of two grades or more together, update the guide, relabel those, recompute. And optionally, which I'd recommend, run an LLM labeler with the guide as its prompt over the same pairs, and get its kappa against each of you.

A: And the end product is a one-screen report. First-stage recall at a hundred, the ceiling. For production and new: N D C G at ten, saying which gain, M R R at ten, judged at ten. New minus production as a mean delta, with a ninety-five percent paired-bootstrap interval, wins, losses, ties, overall and per stratum. And the five queries where the new model lost the most, with one line each on why. Aim for three hundred plus queries once the pilot's calibrated. Then have an agent read it like the most skeptical person in that Slack thread. Every one of those questions should have its answer on the screen.

<!-- section: Measure: The public benchmark -->

A: So what do the numbers look like? When I ran this on an M series MacBook, B M twenty-five got an N D C G at ten of point six five two. The bi-encoder, point six four five. And B M twenty-five plus the cross-encoder, point six seven six.

B: [surprised] That's it? The cross-encoder is the fancy one.

A: [thinking out loud] It wins, but by less than you'd guess. About plus point zero two four over B M twenty-five. And that's the same story the BEIR paper tells, with a different B M twenty-five and a different reranker: point six six five for B M twenty-five, point six eight eight with a cross-encoder on top. Here's why. SciFact is scientific claims. That cross-encoder was trained on Bing questions. Out of domain, a big chunk of the cross-encoder's advantage just evaporates. On in-domain data, like your web queries, expect a bigger gap.

A: Now the bi-encoder is interesting. It basically ties B M twenty-five on N D C G, but it wins on recall at a hundred. Point nine two five versus point eight seven three. So it's worse at putting the best abstract first, and better at getting it into the top hundred at all.

B: Which is the first stage's whole job.

A: That's precisely the job of a first stage. So try reranking the bi-encoder's top hundred with the cross-encoder instead. Your ceiling goes from point eight seven three up to point nine two five, and the reranked N D C G should rise with it.

A: And the cost is all in the cross-encoder. B M twenty-five, indexing plus all three hundred queries, about eight seconds. The bi-encoder, about half a minute, and that's almost all embedding the five thousand documents. The cross-encoder, about four minutes, for thirty thousand pairs. That's about eight milliseconds per pair on my Mac, so a hundred candidates is most of a second per query. Versus a single matrix multiply for the bi-encoder. That ratio is why the funnel exists. On the Spark's GPU, with batching, it's way faster. But the ratio holds.

A: One more thing to notice. Recall at a hundred is identical for B M twenty-five and for B M twenty-five plus the cross-encoder. Point eight seven three, both. Of course it is. Reranking just reorders the same hundred documents. And if those two numbers ever come out different in your code, your reranker is not reranking the same candidates.

<!-- section: Measure: The bootstrap surprise -->

A: And then the bootstrap, which, honestly, surprised me. And it's the most useful result in this whole thing. Cross-encoder minus B M twenty-five: plus point zero two four, and the ninety-five percent interval runs from minus point zero zero five to plus point zero five three. Bi-encoder minus B M twenty-five: minus point zero zero seven, interval from minus point zero four five to plus point zero three one. Cross-encoder minus bi-encoder: plus point zero three, interval from minus point zero zero five to plus point zero six six.

B: [skeptical] Wait. So every one of those crosses zero?

A: [quietly] Every one. With three hundred queries, not one of these differences is clearly distinguishable from zero. A gap the size people publish papers about, on a standard benchmark, and the interval still reaches below zero.

B: So the cross-encoder... isn't actually better?

A: [carefully] That's not quite what it says. It says you can't tell, on this set. "No detectable difference" is not "no difference". And why's it so wide? Look at the ties. For cross-encoder versus B M twenty-five, a hundred ninety-two of the three hundred queries tie exactly. Fifty-nine wins, forty-nine losses. And SciFact queries mostly have one or two relevant documents, so when they don't tie, N D C G jumps by a lot. Moving the one relevant abstract from rank one to rank three is a big swing. So the standard deviation of the per-query delta came out around point two six. Not the point one two we guessed earlier. Two times point two six, divided by the square root of three hundred, is about point zero three. Which is exactly the half-width you see.

A: And it gets worse with small sets. On random thirty-query subsets, the cross-encoder minus B M twenty-five mean bounced between about minus point zero zero six and plus point zero seven nine, across just three draws. Intervals about plus or minus point zero seven wide. So a thirty-query notebook eval can tell you almost nothing about a point zero two improvement.

B: [sighs] And mine was twenty. Hand-picked.

A: [gently] Yeah. Twenty, hand-picked, no interval.

<!-- section: Measure: The pilot and how many queries you need -->

A: For the pilot, here's what to expect. Kappa somewhere around point four to point six on the first round is normal for unweighted four-level labels. Quadratic-weighted will come out noticeably higher. Remember, on my simulated labels point six one turned into point nine. Most of the disagreements will cluster in two or three gaps in the guide, and fixing those moves kappa more than anything else. And on fifty queries, your real model's interval is going to be wide. Probably crossing zero, unless the improvement's big. And that's fine. That's not the pilot's job. Its job is to calibrate the guide, and to give you an estimate of the per-query standard deviation. Because with that, you can work out how many queries the full set needs. Two times the standard deviation, divided by the smallest improvement you care about, and square it.

B: [working it out] Okay, so then, how does that scale? Say I've got three hundred judged queries and I want to see something tiny, like point zero zero five.

A: Let's say your per-query standard deviation is around point one. Three hundred queries gives you a half-width of two times point one, over root three hundred, about point zero one two. Too wide for point zero zero five. To get down to point zero zero five, you need root N around forty. So about sixteen hundred queries.

B: That's a lot of labeling.

A: [sighs] It's a lot of labeling. Say twenty pooled documents per query, a minute each. Sixteen hundred queries is over five hundred labeler-hours. So you scale it a few ways. LLM labels, calibrated against a human-labeled anchor slice. Reusing your answer key across model versions, and only judging the new holes each time. And keeping the variance down in the first place. Paired comparisons on fixed candidate sets. Graded labels, which make per-query deltas smaller and smoother than one-positive yes-or-no labels do. And past that, an online interleaving test is way more sensitive per unit of effort than growing the offline set forever.

<!-- section: Break It -->

A: Now break it on purpose. Four ways. First, compute the ideal from your own run. Change your N D C G so the ideal is built from the grades of the documents you retrieved, instead of all the judged documents. Rerun SciFact. Every system's N D C G goes up. And the ones with the worst recall go up the most.

B: [amused] Because they're being graded against their own homework.

A: Pretty much. A system that found only one of three relevant documents, and put it first, now scores a perfect one point oh. The "ideal" it's compared against is built from its own incomplete list. And a system that found nothing relevant has an ideal of zero, so now you have to special-case dividing by zero. Which is the hint something's off. This bug is really common in homegrown eval code. And the test that catches it is simple: a system that retrieves nothing relevant must score zero.

A: Second, break ties differently. Make a run where lots of documents share the same score. Round B M twenty-five scores to one decimal place, say. Score it with your code, which sorts one way, and with pytrec eval, which ignores the rank column completely and breaks ties on score by document I D, in reverse alphabetical order. I checked: three tied documents a, b, c come out c, b, a. And the numbers differ. Two "identical" evaluations disagreeing just because of ordering conventions. Real rankers rarely produce exact ties. But quantised or rounded scores do. So does a reranker that saturates, where lots of documents come out at one point oh.

A: Third, hide the new system's best documents. Take the cross-encoder run. For each query, find any relevant documents in its top ten that aren't in B M twenty-five's or the bi-encoder's top ten. Delete those from the answer key, as if the pool had been built without the cross-encoder. Rescore all three. The cross-encoder's N D C G drops. The other two barely move. And its judged at ten falls, which is the warning sign you'd have seen. That's exactly what happens to your v two if your eval set was pooled from v one.

A: And fourth, evaluate on hand-picked queries. Choose the twenty SciFact queries where B M twenty-five does worst, and compare the cross-encoder to B M twenty-five on just those. The improvement looks enormous. And the bootstrap interval looks convincing too.

B: [a bit unsure] But... the bootstrap should catch that, shouldn't it? That's what it's for.

A: [firmly] It can't. Now compare the cross-encoder to the bi-encoder on those same twenty. The interval answers one question: how much would this wobble if I resampled these particular queries? It doesn't answer "is this set representative of my traffic?" Those twenty were chosen for B M twenty-five's failures, so of course anything beats B M twenty-five on them. No statistics can fix a biased sample. Only sampling can.

<!-- section: Back to the Slack thread -->

A: So go back to the thread. Plus point zero zero nine. Before you believe it, here's what you check. The queries were sampled from real traffic, stratified, not hand-picked. You've said which gain and which k. Both models reranked the same candidate lists. Judged at ten for both. If the new model's top ten has a lot of unjudged documents, it's being scored down for finding things the pool never saw, so judge those and rescore. The labels have reasonable agreement between labelers, and if an LLM labeled them, it isn't the same model your reranker was distilled from. Then the per-query deltas. A paired bootstrap interval on the mean delta, wins, losses, ties, and per stratum. And if the interval crosses zero, the honest answer is "no detectable difference on this set".

A: If you want the two best places to go further, it's the original Järvelin and Kekäläinen paper from two thousand two, which is short, and you'll notice their discount isn't quite the one everyone uses now. And chapter eight of Manning, Raghavan and Schütze's Introduction to Information Retrieval, which puts precision, recall, map, pooling and kappa all in one place.

B: [working it out] Okay, let me try the whole thing. To say v two is better, the number I quote is N D C G at ten, with the gain spelled out, because my users care most about the top few results and results come in grades. And I divide by the ideal so every query counts the same. But the number's only as good as the eval set. Real queries sampled across head, torso and tail, a pool from systems that fail differently, labels from a guide two people actually agree on. And then I report the difference between the two models, with a bootstrap interval, so I know if it's bigger than the noise.

A: [warmly] That's nearly all of it. Two sharpenings. The ideal is built from everything judged for that query, not from what you returned, otherwise a model that misses things gets graded on its own homework. And the interval comes from the per-query differences, paired, not from two averages side by side. That's what cancels out how hard each query is. And one more thing to watch, specifically because it's v two. Check judged at ten before you trust any of it. A new model's best results are exactly the ones nobody's graded yet.
