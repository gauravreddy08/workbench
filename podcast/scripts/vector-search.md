<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, your cross-encoder. It's good. You give it a query and a passage, it reads them together, every word of one looking at every word of the other, and it gives you one score. And it's slow on purpose. A whole transformer pass for every single pair.

B: Sure. That's kind of the point of it.

A: Right. Now picture an index with a hundred million passages. To score all of them for one query, that's a hundred million transformer passes. Even being generous about how fast each one is, that's more than a day. For one query.

B: [laughs] Okay, so nobody does that.

A: Nobody does that. Search runs in two stages. A cheap first stage pulls maybe a thousand plausible passages out of the hundred million. Then the expensive model, your model, reorders just those. And here's the part that I think matters most for your job. Your ranker can only reorder what it's handed. If the right passage isn't in that pile, nothing you do in training brings it back.

B: So the first stage sets my ceiling.

A: It quietly sets your ceiling. And it's really easy to treat as plumbing. So, the cheap stage. More and more, it works like this. A small model, a bi-encoder, turns every passage into a list of numbers ahead of time. A few hundred numbers each. At query time, it turns the query into a list of numbers too. And now the job is just, which of the stored lists is closest to this one?

B: [skeptical] That doesn't sound hard though. Comparing two lists of numbers is one dot product. Do it for every passage, keep the best.

A: It does sound easy. Let's see what it costs.

<!-- section: Points in a space -->

A: First, the picture. That list of numbers, the embedding, you can read it as coordinates. Two numbers would be a point on a map. Three, a point in a room. A few hundred is a point in a space you can't picture, but all the rules from the map still hold. Points have distances. Some are closer than others.

B: And the model's trained so related stuff lands nearby.

A: That's what it's trained for. A question about resetting your router lands near passages about routers and blinking modem lights, and far from passages about pasta. So search turns into geometry. Find the stored points nearest the query point.

B: And there are a few ways to measure "near", right? Cosine, dot product, plain distance.

A: There are, and the nice thing is, if every vector's been scaled to length one, they all give the same order. Which is why lots of systems do that and then use whichever is fastest. When they're not scaled, they can disagree, and the rule is simple. Use whatever the model was trained with. It's part of the model's contract.

<!-- section: Reading the whole library -->

A: Okay, so the honest way. Compare the query to every stored vector, keep the top ten. That's called brute force. It's exact, it's always right. Now price it. A hundred million passages, each a few hundred numbers. When I worked it out, that's about three hundred gigabytes. And every single query has to read all of it.

B: Does that even fit on the Spark?

A: No. The Spark's got a hundred and twenty-eight gigs. Doesn't come close. But say it did. You remember the decoding story, how the Spark's memory is big but not especially fast? Reading all of that once at the Spark's memory speed takes about a second. Per query.

B: [working it out] And the math part? All the multiplies?

A: That's the thing. The math would take a few milliseconds. The reading takes about a second. Each number gets fetched from memory, used for one multiply, and thrown away. The chip's sitting there waiting, exactly like when it's generating one token at a time.

B: Oh. So it's the same problem as decoding.

A: Same problem, different costume. And the same fix works, in one situation. If you've got a thousand queries at once, you read each number once and use it for all thousand. Now the chip's busy. When I ran it batched, it was dozens of times faster per query on the same single thread. So for offline jobs, brute force on a GPU is great. But a live search service answering one query at a time can't do that.

B: So you either read fewer vectors, or make each one smaller.

A: That's it. Those are the only two ways out. Read fewer bytes per vector, or don't read most of the vectors at all. Every serious vector index does one or both. And every one of them gives up the guarantee of the exact answer to do it.

<!-- section: Forty years of cheating -->

B: Can't you just sort them? Like a database index. Then jump straight to the right spot.

A: That's the natural question, and it's why this is its own problem. A database index works because keys can be sorted. Embeddings can't be sorted in any way that helps. And people tried the next best thing. In nineteen seventy-five, Jon Bentley invented the k-d tree. It splits the space in half, and in half again, like a binary search over coordinates.

B: That sounds like it'd work.

A: In two or three dimensions it's wonderful. A query only visits a few boxes. In a hundred dimensions, it collapses. There are so many directions that the query's neighbourhood touches almost every box, and the tree ends up checking nearly everything anyway. People called this the curse of dimensionality. And for a while it looked like fast exact search in high dimensions was just hopeless.

B: So what happened?

A: The field gave up on exact. That's the whole move. Accept "very close" instead of "the closest", and suddenly you can be fast. Over the next couple of decades people came up with the tricks we use now. And then when text models started turning passages into embeddings and searching by nearness, a few years ago, every one of those old tricks found a second career.

<!-- section: Approximate -->

A: So the new name is approximate nearest neighbour search. Find the true nearest ones most of the time, much faster. And you score "most of the time" with recall. Out of the true top ten that brute force would find, how many did the index find?

B: [jumping in] Wait, recall's a ranking thing for me. Did we find the relevant documents.

A: And that's a different recall, and it's worth keeping them apart. Yours asks, did we find the passages a human said were relevant. This one asks, did the index find the same top ten that brute force would, on the same embeddings. One grades the embedding model. The other grades only the index. If the embedding model ranks the right passage four hundredth, a perfect index still hands it to you four hundredth.

B: Okay. Good, yeah.

A: And every index lives somewhere in a triangle. Recall, speed, and memory. You can buy any one with the other two. There are three classic tricks, and each one's a different bet about which corner to give up.

<!-- section: Rooms -->

A: Trick one. Picture a library with a hundred million books and no catalogue. Brute force reads every spine. A smarter librarian sorts the books into thousands of rooms by topic, ahead of time. When you ask something, she figures out which few rooms your question belongs in, and only searches those.

B: How does she decide the rooms?

A: Clustering. Pick a bunch of centre points, give every vector to its nearest centre, move the centres to the middle of their vectors, repeat. So each centre ends up owning a region of space. At query time you compare the query to the centres, which is cheap, pick the nearest few, and brute force only inside those. That's called IVF, the inverted file index.

B: [working it out] And the catch is the edges. If my real nearest neighbour's just across the wall, in a room I didn't open...

A: You miss it. And in hundreds of dimensions, a room has a huge number of neighbouring rooms, and the query's often sitting near several walls at once. So the dial is how many rooms you open. Open more, recall goes up, speed goes down. And real embeddings were honestly hard for it. When I ran it, opening only a few rooms found barely two thirds of the true top ten.

<!-- section: The sketch artist -->

A: Trick two is about the memory corner. The rooms read fewer vectors, but each vector's still full size. So, think about describing a face to a sketch artist. You don't send a photo. You say, eyes, type seventeen. Nose, type two hundred and three. Picking each from a book of standard shapes. And the artist rebuilds a rough face from a handful of numbers.

B: And you do that to a vector.

A: You cut the vector into short pieces. For each piece position, you learn a little book of a couple hundred typical shapes. And then you store each piece as just the ID of the closest shape. One byte. So a vector that was thousands of bytes becomes under a hundred. That's called product quantization. Suddenly a hundred million vectors fit on the Spark with room to spare.

B: But to compare against it, don't you have to rebuild the vector?

A: That's the clever part. You never rebuild it. You take the query, cut it into the same pieces, and work out once how similar each query piece is to every shape in each book. That's a small table. Then the score for any stored vector is just adding up one lookup per piece in that table. Very few bytes read, very cheap math.

B: And the price is accuracy.

A: Every piece got snapped to the nearest standard shape, so every score's a little off, and the order near the top gets shuffled. When I ran it, recall dropped a lot. But the fix is cheap and it's kind of the whole subject in miniature. Ask the compressed index for its top hundred, then re-score just those hundred with the full vectors, and keep the best ten. That brought recall right back up to where it was before compression.

B: Rough pass first, exact pass on a short list.

A: Which is exactly what your pipeline does. Just one level down.

<!-- section: Highways -->

A: Trick three throws the rooms away entirely. Instead, build a map. Connect each vector to a handful of its near neighbours. To search, start somewhere, look at your neighbours, step to whichever one's closest to the query, repeat until nobody's closer.

B: Like finding a friend's house in a town without a map. Just keep taking the street that points toward it.

A: That's it. But if every link is short, crossing the whole space takes forever. Thousands of tiny steps. So you do what road networks do. You don't drive across the country on residential streets. You take local roads to a highway, the highway most of the way, then local roads at the end.

B: So there's layers.

A: Layers. The bottom layer has every vector, with short links, local roads. The layer above has a random small fraction of them, so their links are longer, regional highways. Above that, an even smaller fraction, even longer links. A search drops in at the top, takes a few big hops toward the query, steps down a layer, and finishes with short hops at the bottom. It's called HNSW. And if that sounds like a skip list, it basically is. The same idea, with graphs instead of sorted lists.

B: [skeptical] Doesn't greedy hopping get stuck, though? If the data's in tight clumps?

A: It can, and there's a lovely little detail that fixes it. When the index picks a vector's links, it doesn't just take the closest ones. It skips a candidate if it's closer to a link it already picked than to the vector itself. So some links point away, toward other clumps. Without that, clumpy data breaks the map into islands, and the search can't get off the island it started on.

B: And the dial?

A: How wide a search you keep at the bottom. Keep more candidates, recall goes up, it gets slower, and you can change it per query without rebuilding anything. This one had the best recall for the speed when I ran it. Nearly all the true top ten, dozens of times faster than brute force. That's why it's the default in most vector databases.

B: So why isn't it always the answer?

A: Memory, and build time. It keeps the full vectors plus all the links, so it's even bigger than the original. And it hops around memory randomly, so it really wants everything in RAM. And building it was slow. Several times slower than the rooms. At a hundred million, plan for hours. So at that scale on one box, the compressed rooms are often the only thing that fits. At a few million, the highways are hard to beat.

<!-- section: What reaches the user -->

B: Okay, so for my actual pipeline. Which do I pick?

A: Two more things first. Embeddings are great at meaning and bad at exact strings. An error code, a rare name, a version number. The old keyword search is the opposite. It finds an exact error message instantly and has no idea that car and automobile are the same. So lots of systems run both and merge the lists, which is called hybrid search.

B: Makes sense.

A: And then the real question. I wired an approximate index in front of a cross-encoder and measured what actually reaches the user, after reranking. And the surprise was, the approximate index cost nothing. After reranking the top hundred, it scored exactly the same as brute force.

B: [skeptical] Nothing at all?

A: Nothing I could measure. The few true neighbours it misses are rarely the ones that matter once a cross-encoder reorders the list. And the second surprise was rerank depth. Reranking the top fifty, top hundred, top two hundred. All the same score. Past about fifty it bought nothing, and the reranking time grew right along with the depth.

B: So find where it stops helping, and stop there.

A: Find the knee and stop. And the flip side, I tried starving the reranker. Retrieve only ten candidates and rerank those. The cross-encoder can't find a passage it was never shown. Push retrieval deeper, and the final score climbs, even though the index itself didn't change at all.

<!-- section: Ending -->

B: Okay. So, let me try. Comparing against every vector means reading the whole thing from memory for each query, which is way too slow. So the indexes either look at fewer vectors, like the rooms or the highways, or shrink them, like the sketch artist. And you tune each one to get as close as you can to the true nearest neighbours.

A: The first part's exactly it. The last bit is the one I'd change. Getting the true nearest neighbours isn't really the target. The target is what reaches the user after your reranker. The first stage just has to get the right passage somewhere into the pile. So don't tune the index on its own recall. Sweep it together with rerank depth, measure the final ranking, and pick the cheapest setting that matches brute force.
