<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, your cross-encoder. The ranker. You give it a query and a passage, it reads them together, every word of one looking at every word of the other, and out comes one number. How relevant is this passage to this query. It's good. And it's slow on purpose. It's one forward pass of a small transformer for every pair. Call it a millisecond per pair, on a GPU, batched. And honestly that's generous.

B: Sure. That's about what I'd expect.

A: Okay. Now the index has a hundred million passages. One query. How long to score all of them?

B: [working it out] A hundred million milliseconds is... a hundred thousand seconds. That's, what, a day?

A: [flatly] Twenty-eight hours. Per query.

B: [laughs] Okay, so nobody does that.

A: Nobody does that. Search systems run in two stages. First, a cheap stage pulls about a thousand plausible candidates out of the hundred million. Then the expensive model, your model, reorders only those thousand.

B: Right, and that's why the ranker's the part that matters. That's where the quality comes from.

A: [gently] That's half of it. The ranker can only reorder what it's handed. If the right passage isn't in that thousand, no amount of training on your side brings it back. Your ceiling is set one stage earlier, by the cheap stage. And that cheap stage is what all of this is about.

A: [more matter-of-fact] So, for a growing share of systems, the cheap stage is a different kind of model, called a bi-encoder. Your cross-encoder has to see the query and the passage together, in one forward pass. A bi-encoder looks at them separately. It turns the passage into a list of numbers on its own, and the query into a list of numbers on its own. And the nice thing about separately is that you can do all the passages ahead of time. Overnight, once. So every one of the hundred million passages becomes a list of, say, seven hundred sixty-eight numbers, sitting in memory. Then a query comes in, you turn just the query into seven hundred sixty-eight numbers, and the job becomes: which of the hundred million stored lists is closest to this one?

B: And closest means a dot product.

A: One dot product per passage, yeah. Sounds easy. So the plan is, figure out what "one dot product per passage" actually costs when there are a hundred million passages. And then spend the rest of the time cheating our way out of it.

<!-- section: Origin -->

A: And people have been trying to cheat their way out of this for, like, fifty years. Finding the nearest point is an old problem. In nineteen seventy-five a computer scientist named Jon Bentley invented something called the k-d tree. The idea is, you split space in half. Then split each half in half. Again and again. It's basically binary search, but over coordinates. And in two or three dimensions it's wonderful. A query only has to visit a few boxes.

B: And in seven hundred dimensions?

A: [amused] It collapses. Even at a hundred dimensions. There are so many directions that the query's neighbourhood ends up touching almost every box. So the tree ends up checking nearly everything anyway. People called this the curse of dimensionality. And for a while it honestly looked like fast, exact search in high dimensions was just hopeless.

B: [quietly] Huh.

A: So the field gave up on exact. That's the move. Nineteen ninety-eight, Piotr Indyk and Rajeev Motwani formalized what's called approximate nearest neighbour search, using a technique called locality-sensitive hashing. The deal is, you accept "very close" instead of "the closest", and in exchange you get to be fast. Then in twenty eleven, Hervé Jégou, Matthijs Douze and Cordelia Schmid showed you could compress vectors thirty to a hundred times smaller and still search them. That's product quantization, with a sort of filing system of clusters in front of it. And that's what made searching a billion images fit in RAM. Then twenty sixteen, Yury Malkov and Dmitry Yashunin published H N S W, a layered graph that you walk like a road network. That one became the default in most vector databases. And then around twenty nineteen, twenty twenty, dense retrieval models, like one called D P R, made "embed everything, find the nearest" a standard first stage for text search. So every one of these old tricks got a second career.

B: Okay. I've heard H N S W a hundred times and I couldn't tell you what's in it.

A: You will be able to. But we've got to start with what an embedding even is, geometrically.

<!-- section: The Idea: An embedding is a point -->

A: So an embedding is a fixed-length list of numbers that a model spits out for a piece of text. Or an image, or a user, whatever. And the model's trained so that things with similar meaning get similar lists. Seven hundred sixty-eight floats, say. Now read that list as coordinates. Two numbers would be a point on a map. Three would be a point in a room. Seven hundred sixty-eight is a point in a space you can't picture at all. But every rule you know from the map still holds. Points have distances. Some points are closer than others.

B: [skeptical] And the model just... happens to put the right things close together?

A: Not happens. It was trained to. The embedding model, which is just the neural net that produces these lists, say a small sentence-transformer, is trained so a query lands near the passages that answer it. So "how do I reset my router" lands near passages about routers and modem lights, and far from passages about pasta. And once that's true, search is just geometry. Find the stored points nearest the query point. That task has a name: k nearest neighbours. Given a query point, find the k stored points closest to it. When people say nearest neighbour search, that's usually what they mean.

A: Picture it as a flat map, two of the seven hundred sixty-eight dimensions. There's a little crosshair, that's the query, with a dotted circle around it. Inside the circle, three dots: "reset router", "modem lights", "wifi drops". Way off in a corner, "pasta recipe" and "tomato sauce" sitting together. Up top on their own, "gpu memory". Down at the bottom, "tax forms". Meaning has become position.

B: Okay. And "near" means what, exactly? Because I've seen like three different flags for this in every library.

A: Three, yeah, and you'll see all of them. First, the dot product. You multiply the two lists position by position, first times first, second times second, all the way down, and add it all up. For seven hundred sixty-eight numbers that's seven hundred sixty-eight multiplies and seven hundred sixty-eight adds. It's big when the two vectors point the same way, and also when they're long. Second, cosine similarity. That's the dot product with both lengths divided out. So it only measures the angle between them. One means same direction. Zero means at right angles, unrelated. Minus one means opposite. And third, Euclidean distance, which people also call L two. That's just the straight-line gap between the two points. Subtract position by position, square each difference, add them up, take the square root. Small means similar. The L two name comes from the math name for that kind of length.

B: So with the first two, big is good, and with the last one, small is good.

A: Right. And here's the thing that ties them together. Take the squared straight-line distance between two vectors. If you expand it, it comes out as: the first vector's length squared, plus the second one's length squared, minus twice their dot product. That's it. Just algebra. Now suppose you normalized every vector first. Normalizing means you divide a vector by its own length, so it has length exactly one. Keeps the direction, throws away the size. Now both of those length-squared terms are just one. And the dot product of two length-one vectors is the cosine. So the squared distance becomes two, minus twice the cosine.

B: [working it out] So as the cosine goes up, the distance goes down. Always.

A: Always. It's a fixed, decreasing function of the cosine. So if you sort by smallest distance, by biggest dot product, or by biggest cosine, you get the exact same order. And that's why a lot of systems just normalize everything and then use whatever operation their hardware does fastest. Which is usually a plain dot product.

A: Try one. Two length-one vectors with cosine point eight. What's the distance between them?

B: Two minus twice point eight. Two minus one point six is point four. That's the squared distance, so... square root of point four. Point six something?

A: [encouraging] About point six three. And a third vector with cosine point six to the first one. Closer or farther?

B: Two minus one point two, point eight. Square root's about point nine. So farther.

A: About point eight nine. Farther. Lower cosine, bigger distance, every time, as long as everything's length one. The rankings match.

B: Okay so I'd just always normalize and use cosine. Seems cleaner.

A: [jumping in] That's the trap. When the vectors aren't normalized, the three disagree, and sometimes that's on purpose. The dot product rewards length. A long vector that points roughly the right way can beat a short one that points exactly the right way. And some retrieval models are trained to use that. The length can end up meaning something like "this passage is generally useful". If you normalize those, you throw away something the model learned. So for those, you have to search by dot product, not cosine. The rule is: use the similarity the model was trained with. The model card tells you. The small sentence-transformer you'd use for this was trained with cosine and outputs normalized vectors, so for that one all three agree.

<!-- section: The Idea: Brute force, and what it costs -->

A: So now the honest way. Compare the query to every stored vector, keep the top k. That's called brute force. Always correct. Its cost grows in a straight line with the number of vectors. Meta's library for this, FAISS, F A I S S, people say "face", calls it a flat index. Let's price it, napkin style. For N vectors with d numbers each, one query costs N times d multiply-adds. And to do them, the machine has to read every stored number, once.

B: Okay, give me the actual numbers. A hundred million at seven sixty-eight.

A: A hundred million times seven hundred sixty-eight is about seventy-seven billion multiply-adds per query. And the bytes. Each number's a thirty-two-bit float, four bytes. A hundred million times seven sixty-eight times four is three hundred seven gigabytes. That's the size of the whole index. And every single query reads all of it.

B: And the Spark has a hundred twenty-eight.

A: A hundred twenty-eight gigabytes. So no, it doesn't fit. Even if you store each number in sixteen bits, half the size, it's a hundred fifty-four gigabytes. Still doesn't fit. But suppose it did. The Spark's memory bandwidth, on the spec sheet, is about two hundred seventy-three gigabytes a second. Reading three hundred seven gigabytes at that rate takes about one point one seconds. Per query.

B: [skeptical] Okay, but that's seventy-seven billion multiply-adds. Isn't that the slow part? The memory read sounds like the smaller problem. Like, a faster GPU would fix this.

A: [patiently] So let's actually check. The Spark's GPU does something like tens of trillions of thirty-two-bit multiply-adds a second. Take a low number, ten trillion. Seventy-seven billion at ten trillion a second is about eight milliseconds. Reading the bytes is about eleven hundred milliseconds.

B: Huh. So the math is, like, a rounding error.

A: [emphatic] The math is a rounding error. Memory's the bottleneck by two orders of magnitude, about a hundred times. And the reason is the same one as in decoding a single token. Quick reminder on that one. When a language model generates one token, it has to read every weight in the model from memory, and it does about one little multiply-add with each weight, and then it's done with it. So the chip spends its life waiting for bytes to arrive. That's what bandwidth-bound means. Your speed is set by how fast you can read, not how fast you can compute. Here it's identical. Each four-byte number gets read once and used in exactly one multiply-add, for this query. That's a quarter of a multiply-add per byte. The chip could do dozens of operations in the time it takes to fetch one byte. So it sits there. Waiting.

B: [working it out] And the decoding fix was batching. So... batch the queries?

A: Same fix. Batch a thousand queries together, and every number you read gets used a thousand times instead of once. Now it's a matrix multiply. Compute-bound. Throughput jumps. And that's why offline jobs, like computing the exact answers to grade an index against, happily brute force on a GPU. While a live service, answering one query at a time as they come in, can't.

A: [relaxed] There's an interactive version of this napkin math that's worth playing with in your head. You've got a slider for how many vectors, from a hundred thousand up to ten billion. Buttons for the dimensions, three eighty-four, seven sixty-eight, fifteen thirty-six. Buttons for how each number is stored: thirty-two-bit, sixteen-bit, eight-bit integers, or compressed down to ninety-six bytes a vector. And a machine button, the Spark or an H one hundred. Underneath, a bar shows the index size against the machine's memory, with a little marker where memory runs out. At the defaults it says, in big letters, "does not fit, two point four times the memory". And there's a readout for how long one query takes just to read everything. That read time is a floor. You can't go faster than it, one query at a time.

A: And as you move things, everything scales in a straight line. Halve the bytes per number, halve the time. Go from thirty-two-bit to eight-bit, a quarter. Compress hard, much smaller. Switch to the H one hundred, which has way more bandwidth, and the time drops, but now it only has eighty gigabytes of memory, so the fit gets worse. The thing to notice is that every knob there helps linearly. Two times, four times, thirty times. The only thing that helps by orders of magnitude is not reading most of the vectors at all.

A: So that's the two ways out. One, read fewer bytes per vector. Store them smaller. Sixteen-bit halves it, eight-bit quarters it, and product quantization, which we'll get to, shrinks each vector to tens of bytes. Two, read fewer vectors. Don't look at most of the index. Somehow jump to the right neighbourhood and only check points there. Every serious vector index does one or both. And every one of them gives up the guarantee of the exact answer to do it.

<!-- section: The Idea: Approximate, and the triangle -->

A: [thinking out loud] That giving-up has a name. Approximate nearest neighbour search, A N N. Return the true nearest neighbours most of the time, much faster. And "most of the time" gets a score, called recall at k. Say k is ten. You find the true ten nearest with brute force. Then you ask the index for its ten. What fraction of the true ten did it return? Point nine five means it found nine and a half of the true ten, on average over queries.

B: Okay, I know recall. Recall at ten is, did the relevant documents show up in the top ten.

A: [jumping in] Careful. That's a different recall, and mixing them up will genuinely mislead you. The one you know from ranking asks, did we find the relevant documents, judged by human labels. This one asks, did we find the same top ten that brute force would have found, judged by exact search over the same embeddings. The first one measures the embedding model. The second one measures only the index. If the embedding model ranks the right passage four hundredth, a perfect index still returns it four hundredth.

B: So the index can be perfect and the results still bad.

A: Totally. You can have an index recall at ten of point nine eight sitting right next to a retrieval recall at ten of point six. Keep them apart.

A: Now, every index lives somewhere in a triangle with three corners. Recall, how often you get the true neighbours. Latency, or its flip side, queries per second, how much work per query. And memory, how many bytes per vector, plus whatever extra structure the index keeps. And you can buy any one corner with the other two. Look at more of the index: recall goes up, speed goes down. Compress the vectors: memory goes down, and recall goes down. Add a graph of links between vectors: speed and recall go up, and memory goes up. And there's a fourth cost hiding off to the side, which is build time. Some indexes take hours to build and can't easily take in new vectors. So the rest of this is three tricks, and each one is a different bet about which corner to give up.

<!-- section: The Idea: IVF -->

A: Trick one. Picture a library with a hundred million books and no catalogue. Brute force reads every spine. A smarter librarian first sorts the books into a thousand rooms by topic. When you ask a question, she figures out which few rooms your question belongs in, and only searches those.

A: That's an inverted file index, I V F. Mechanically, three steps. First, train. You run k-means on your vectors, or a sample of them. K-means is a clustering algorithm: pick some centre points, assign every vector to its nearest centre, move each centre to the average of the vectors assigned to it, and repeat until it settles. The number of centres is called n list. Each centre is called a centroid, which is just the average of its cluster. And each centroid owns the region of space that's closer to it than to any other centroid. Those regions are called Voronoi cells. If you drew the borders it'd look like a cracked tile floor. Second, add. Every vector goes into the list belonging to its nearest centroid. Third, search. Compare the query to all the centroids, which is cheap, it's thousands, not a hundred million. Pick the few nearest. That number's called n probe. And then brute force only the vectors in those cells.

B: How much does that actually save?

A: The cost per query is roughly: the number of centroids, plus n probe times the size of a cell. For a hundred million vectors, say you use sixty-five thousand five hundred thirty-six cells, that's two to the sixteenth, and you probe sixty-four of them. Each cell has about fifteen hundred vectors in it. So it's sixty-five thousand centroid checks, plus sixty-four times fifteen hundred, which is about a hundred thousand. Call it a hundred sixty thousand distances in total, instead of a hundred million. About six hundred times less work.

B: [skeptical] Okay, where's the catch.

A: [dry] The border. The query's true nearest neighbour can be sitting just across the line, in a cell you didn't open. And in seven hundred sixty-eight dimensions, every cell has a huge number of neighbouring cells, and a query often lands near several borders at once.

B: So you just probe more cells.

A: And that's the dial. Probe one cell and you miss a lot. Probe more and recall climbs toward one, but speed falls in a straight line, because you're scanning more cells. The FAISS docs suggest picking n list somewhere between about four and sixteen times the square root of the number of vectors. For a hundred million, the square root is ten thousand, so that's forty thousand to a hundred sixty thousand cells. Then you sweep n probe and see where you land.

<!-- section: The Idea: Product quantization -->

A: But notice what I V F didn't do. It reads fewer vectors. It doesn't make them any smaller. A hundred million vectors of seven sixty-eight floats is still three hundred seven gigabytes. Still doesn't fit. Trick two fixes the memory corner. Product quantization, P Q.

A: Think of describing a face to a sketch artist. You don't send a photo. You say, eyes, type seventeen. Nose, type two oh three. Mouth, type four. Each one picked from a book of two hundred fifty-six standard shapes. And the artist rebuilds an approximate face from a handful of small numbers. P Q does exactly that to a vector. You cut the seven hundred sixty-eight numbers into ninety-six consecutive pieces, eight numbers each. For piece one, you run k-means with two hundred fifty-six centres, on piece one of all your vectors. That gives you piece one's codebook, a list of two hundred fifty-six representative little eight-number shapes. Same thing for every one of the ninety-six pieces. Then you store each vector as ninety-six bytes. For each piece, just the I D of its nearest codebook entry. And an I D from zero to two fifty-five fits in one byte.

B: So, three thousand bytes down to ninety-six.

A: Seven sixty-eight times four is three thousand seventy-two bytes, down to ninety-six. Thirty-two times smaller. A hundred million vectors go from three hundred seven gigabytes to nine point six. Plus I V F stores an I D for each vector, eight bytes each in FAISS, so another point eight gigabytes. Fits on the Spark with tons of room. And if you cut into forty-eight pieces instead of ninety-six, it's sixty-four times smaller, and less accurate.

B: [a bit unsure] Okay, but at query time you have to decompress all of them to compare, right? Rebuild each vector from the codebooks, then do the dot product?

A: [pleased] That's the obvious way, and it's not what happens. This is the clever part. You never decompress. You take the query, which is not compressed, and cut it into the same ninety-six pieces. Then, once per query, you compute how similar each query piece is to each of the two hundred fifty-six codebook entries for that piece. That's a table, ninety-six rows by two fifty-six columns, about twenty-five thousand numbers. Small enough to sit in cache. Now any stored vector's approximate dot product with the query is just: for each of its ninety-six codes, look up that cell in the table, and add the ninety-six numbers up.

B: Oh. Because the dot product splits over the pieces.

A: Right, the dot product is a sum over positions, so it's also a sum over pieces. So scoring one stored vector is ninety-six table lookups. No multiplies against the full vector at all. That's called asymmetric distance computation. Asymmetric because only one side's compressed, the stored vectors, and the query stays exact, which keeps more accuracy than squashing both. So picture the whole thing as two halves. Top half, the long vector chopped into ninety-six blocks, each block dropping down to a single little code, seventeen, two oh three, four, eighty-eight, and so on to one thirty-one at the end. Bottom half, the query's table, built once, and next to it, one stored vector's score being added up from ninety-six lookups. Bytes read per vector: ninety-six, not three thousand seventy-two. And in a bandwidth-bound problem, fewer bytes is exactly the thing you need.

B: And the price is accuracy.

A: The price is accuracy. Every piece gets snapped to the nearest of two hundred fifty-six shapes, so every score's a little bit wrong. And the ranking near the top gets shuffled. The standard fix is cheap, though. Ask the P Q index for its top hundred. Then re-score just those hundred with the full-precision vectors, which you keep on disk or in slower memory. Keep the best ten. That's a re-rank. Take a short list from a cheap scorer, reorder it with an accurate, expensive one. And honestly that pattern, compressed search then exact re-rank, is this whole topic in miniature. It's going to show up again at the end.

A: In FAISS, if you combine the two tricks, the index name literally spells it out: I V F sixty-five thousand five hundred thirty-six, comma, P Q ninety-six. Sort into rooms to read fewer vectors, compress so each one is small.

<!-- section: The Idea: HNSW -->

A: Trick three throws the rooms out entirely. Instead, you build a graph. Connect each vector to a handful of its near neighbours. To search, start somewhere, look at your neighbours, step to whichever is closest to the query, and repeat until none of your neighbours is any closer. That's called greedy search. It's how you'd find a friend's house in a town with no map. You just keep taking whichever street heads most directly toward it.

B: That can get stuck though. You hit a spot where every street goes the wrong way, but the house is still somewhere else.

A: It can. Greedy search can stop at a spot that's locally best and not globally best. Hold on to that, it comes back. The other problem is it's slow for a big graph. If every link is short, crossing the whole space takes thousands of tiny steps. And the fix is the one road networks use. You don't drive across the country on residential streets. Local roads to the highway, highway across most of the distance, local roads again at the end.

A: H N S W, which stands for hierarchical navigable small world, builds exactly that, in layers. Layer zero has every vector, each linked to its nearest neighbours. Local roads. Layer one has a random subset, about one in M of them, where M is a number you pick, and they're linked to their nearest neighbours within that subset. Since the subset is sparse, those links are longer. A regional highway. Layer two keeps about one in M of those, with even longer links. And so on up, until the top layer has just a handful of vectors.

B: Who decides which vectors get to be on the highway?

A: [amused] A coin, basically. When a vector's inserted, its top layer is picked at random, with odds that fall off fast. Most stop at layer zero, fewer reach one, far fewer reach two, like flipping coins and counting heads in a row. And if that rings a bell, it's a skip list. A skip list is a sorted linked list with extra express lanes on top that skip over lots of elements, built by coin flips. You run along the express lane, then drop down. Lookups take about log N steps. H N S W is that same idea, with graphs instead of sorted lists.

A: Picture three horizontal lines stacked up. Top line, layer two, three dots spread far apart. Middle line, five dots. Bottom line, every point, about twenty of them packed close. The search enters at the top left, takes two long arcing hops to the right, stops, drops straight down to the middle layer from wherever it stopped, takes one medium hop back a little, drops down again, and finishes with two short hops on the bottom layer to land right next to the query. Two long hops, one medium, two short. Each layer down has more nodes and shorter links.

A: There are three knobs, and they're the ones you'll actually tune. First, M. How many links each node keeps per layer. The bottom layer usually gets twice that. More links means more ways to route around a dead end, so better recall. But more memory: each link is a four-byte I D, so at M of thirty-two, the bottom layer's sixty-four links cost about two hundred fifty-six extra bytes per vector. And slower builds. Typical is sixteen to sixty-four. Second, ef construction. When you insert a vector, how wide a search you run to find its neighbours. Bigger means a better-wired graph and a slower build. Typically a hundred to five hundred, and you set it once. You can't change it after building.

A: And third, ef search, often just called ef. This is how wide the search is on the bottom layer at query time. Instead of keeping only the single best node, the search keeps a running list of the best ef nodes it's seen so far, and keeps expanding the closest one it hasn't explored yet, until nothing left in its queue could beat the worst thing on its list. Bigger ef, it explores more, so recall up, speed down.

B: [working it out] And that one you can change per query. No rebuild.

A: Per query, live, no rebuild. That's the dial you'll spend your time on. Two more details from the paper that matter. On the upper layers, the search is plain greedy, ef of one, because those layers only have to get you to the right neighbourhood. And then the subtle one, how a node picks its links.

B: I'd assume it just links to its M nearest.

A: [leaning in] That's what you'd think, and it doesn't. It skips a candidate if that candidate is closer to a neighbour it's already chosen than to the node itself. So if three candidates are all huddled together, it takes one of them and skips the others. That keeps a few links pointing away, toward other clusters, instead of all M links pointing into the same tight huddle. And that's exactly the stuck problem you raised. Without that rule, clustered data breaks the graph into islands, and greedy search can't get off its island.

A: Now picture watching both indexes actually run, on a small map you can click on. Six hundred points in two dimensions, and you click to drop a query anywhere. In H N S W mode you step through it: the big dark dots, those are the upper-layer nodes, carry the search across the map in a few hops, then the bottom layer fills in locally around the query. In I V F mode, there are twelve cell centres. You watch it measure all twelve, rank them, then scan the n probe nearest cells exactly. And there's a counter of how many distances it computed, against brute force's six hundred.

A: Try four things. Put the query in a far corner in H N S W mode. The first hops are huge. And if you count hops per layer, it's roughly constant, a handful each. That's why the cost grows roughly with log N instead of N. Then slide ef from five up to forty. The distance count goes up and the set it finds stays perfect. Which, to be honest, is because a two-dimensional map is too easy. On real seven sixty-eight dimension data, low ef misses a lot, you'll see recall around point eight to point nine. Third, I V F, n probe one, put the query right on a dotted border. Some of the true neighbours are in the cell next door, and I V F misses them. Bump n probe to two and they come back. And fourth, compare the counters. H N S W checks about forty to seventy points. I V F with n probe two, about a hundred twenty. Brute force, always six hundred. At a hundred million points that gap is enormous.

<!-- section: The Idea: Why not always HNSW? -->

B: So H N S W wins. Why would anyone use anything else?

A: It's the default in most vector databases for good reason. Its recall versus speed is usually the best you can get for a given memory budget, and it handles inserts without retraining anything. But look at the memory. It stores the full vectors, plus the links. A hundred million times about three thousand three hundred bytes is around three hundred forty gigabytes. It doesn't compress anything. And the way it searches, hopping from node to node, jumps randomly all over memory. So it really wants the whole thing in RAM.

A: So here's the rough lay of the land. Brute force: three thousand seventy-two bytes a vector, slowest, exact, and it's your ground truth for grading everything else. I V F with full vectors: same size plus an eight-byte I D, fast, needs training, and loses recall near cell borders. I V F with P Q at ninety-six pieces: about a hundred four bytes a vector, also fast, thirty times less memory, and you re-rank with full vectors to get accuracy back. H N S W at M of thirty-two: about thirty-three hundred bytes, the fastest, big, no training, easy inserts, slow builds, and deletes are awkward.

B: So at a hundred million on one box...

A: I V F plus P Q is often the only thing that fits. At a few million, H N S W in RAM is hard to beat. And at billions, people combine the ideas. A graph index over compressed vectors in memory, with the full vectors on SSD. Microsoft's Disk A N N works like that.

<!-- section: The Idea: Filters -->

A: Okay, and now the part that sounds trivial and is one of the hardest problems in the field. Real queries come with conditions. Nearest passages, but only English. Only from the last month. Only this customer's documents.

B: [a bit unsure] I mean... that's just a WHERE clause, right? Find the nearest, filter the results.

A: That's post-filtering, and it's the first thing everyone tries. Search the index for the top thousand, throw away the ones that fail the filter. Now say one percent of the corpus passes the filter. About ten of your thousand survive. And you wanted a hundred. You can raise the thousand, sure, but for a really selective filter you'd have to search nearly everything.

B: So filter first.

A: Pre-filtering. First find every vector that passes, then brute force over just those. Great when the filter keeps very few. Brute force over ten thousand vectors is fast. Terrible when it keeps forty percent of a hundred million. Then there's filtering during the search, skipping failing vectors as you go. For I V F that's fine, you just skip entries while you scan a cell. For H N S W it's subtle. If you refuse to even step through nodes that fail the filter, the graph falls apart into disconnected islands and greedy search gets stuck. If you do step through them but just don't return them, you waste a ton of work when the filter's selective.

B: [sighs] Okay, so nothing works.

A: [laughs] Everything works for some filters. Libraries let you pass in a filter function, H N S W lib has one, FAISS has something called an I D selector. And newer research, like a method called Acorn from twenty twenty-four, builds denser graphs so filtered searches stay connected. In practice, production systems decide per query, using an estimate of how selective the filter is. Few vectors pass: pre-filter and brute force. Lots pass: filtered graph search. So the next time someone says "just add a WHERE clause to the vector search", that's the conversation.

<!-- section: The Idea: Hybrid search -->

A: One more weakness. Embeddings are good at meaning. "Cheap flights" finds "low-cost airfare". And they're bad at exact strings. Product codes, error messages, rare names, a specific version number. The decades-old keyword method is the exact opposite. It's called B M twenty-five, a ranking formula from Robertson and others in the nineties. It scores a document by which of the query's words it contains, with rare words counting more, and it dampens words that repeat a lot and documents that are just long. It runs on an inverted index of words. It finds "CUDA error seven hundred" instantly. And it has no idea that "car" and "automobile" mean the same thing.

B: So run both.

A: Run both and merge the lists. That's hybrid search. The catch is the scores aren't comparable. B M twenty-five scores have no upper limit, and cosine sits between minus one and one.

B: So, what, normalize them and average?

A: You could try, but the usual merge just ignores the scores and uses ranks. It's called reciprocal rank fusion, R R F. Each document gets, from each list it appears in, one divided by sixty plus its rank in that list. And you add those up. Small example. A document that's first in the vector list and nowhere in the keyword list gets one over sixty-one. Call it point zero one six. A document that's third in both lists gets one over sixty-three, twice, about point zero three two. So the one that's pretty good in both beats the one that's top in only one. Documents near the top of several lists win. Simple, robust, and hard to beat without training a whole model to do the merge.

<!-- section: The Idea: The two-stage pipeline -->

A: So put it all together and you get the shape of most modern search stacks. Picture a funnel, left to right. On the left, a tall box, the corpus, a hundred million passages. Two arrows out of it. The top arrow goes to the A N N index, H N S W or I V F plus P Q, taking about one to ten milliseconds. The bottom arrow goes to B M twenty-five, also about one to ten milliseconds. Each pulls out about a thousand candidates. Those two lists meet in a small box, the fusion step, R R F. Out of that comes the top hundred, into the cross-encoder box, a hundred forward passes, roughly ten to a hundred milliseconds on a GPU. And out the far end, the top ten. Under the left side it says cheap per item, many items. Under the right side, expensive per item, few items. And across the top: recall is set here, over retrieval. Precision is set here, over the cross-encoder. Those latencies are rough orders of magnitude, by the way. You'd measure your own.

B: [working it out] So retrieval's job isn't to get the order right. It just has to get the right passage somewhere in the pile. And my model's job is the order.

A: That's the division of labour. The first stage's job is recall. Get the right passage into the candidate list, and it can be sloppy about order. The second stage's job is precision. Put the right passage at the top. And it can afford to be slow per item, because there are only a hundred items.

A: And that gives you a budget to reason about. Say the whole request has to finish in a hundred milliseconds. If the reranker scores a hundred pairs in forty milliseconds, retrieval gets what's left. If you rerank three hundred pairs instead of a hundred, you might catch a few more good passages that retrieval ranked low, but you pay three times as much on the reranker. And an index with recall at ten of point nine five instead of point nine nine might cost you nothing at all, end to end, because the passages it misses are near-duplicates down at ranks eight to ten that the reranker would have reordered anyway. Or it might cost you a lot.

B: Which one?

A: [firmly] You can't reason your way to it. You measure, end to end, in N D C G. You know this one from ranking, but quickly: every relevant result earns credit, and the credit shrinks the further down the list it sits. Rank one gets full credit, rank three gets half, and it keeps falling. Add it up, divide by the best possible score, so one point oh means a perfect ordering. N D C G at ten only looks at the top ten. And that measurement is what the build is for.

<!-- section: Build It -->

A: So here's what you'd build, all on the Spark. A folder, a virtual environment, and four libraries. FAISS, Meta's vector search library, the CPU version has ARM sixty-four wheels on the Python package index, but check, and the GPU build usually comes through conda. H N S W lib, which is the reference H N S W implementation from the paper's authors. Sentence-transformers for the models. And Hugging Face datasets for the data.

A: The data is M S Marco, the passage ranking set. About eight point eight million passages, and a "dev small" set of six thousand nine hundred eighty queries with human labels, usually one relevant passage per query. Embedding all eight point eight million is a good overnight job for later. Tonight, you make a slice. Five hundred thousand passages, built so it's guaranteed to contain the relevant passages for a thousand of those dev queries, padded out with random other passages as distractors. The easiest copy to load is the one from the B E I R benchmark on Hugging Face. The corpus file's about one point six gigabytes. That step's just setup.

A: Then you embed it on the GPU. The model is a small bi-encoder trained on M S Marco with cosine similarity, Mini L M, six layers, three hundred eighty-four dimensions. You ask it for normalized output, so the dot product equals the cosine. And the one number to write down is passages per second. Because that's the cost of re-indexing every time you change the embedding model, which is a real operational cost.

B: What's a realistic rate?

A: On the reference run, which we'll get to, it was about seven hundred fifteen passages a second. At that rate, the full eight point eight million is about twelve thousand seconds. Three and a half hours, just to re-embed, before you've built a single index.

A: Next, brute force. And this one's yours to write. It has two jobs. It's the exact answer every index gets graded against, and it's the baseline latency. Three ways. Numpy, one query at a time against everything. Numpy, all thousand queries at once as one matrix multiply. And torch on the GPU, batch of one and batch of a thousand, warm it up first, and make the GPU finish before you stop the clock. The one hint that matters: to get the top ten out of five hundred thousand scores, use arg partition, which just pulls out the top k without sorting everything, and then sort only those ten. And save the exact top hundred for every query, not just ten. You'll need the hundred later.

A: Before you run it, predict. Five hundred thousand vectors, three eighty-four numbers each, four bytes a number. How big?

B: [working it out] Five hundred thousand times three eighty-four is a hundred ninety-two million. Times four... seven hundred sixty-eight megabytes.

A: And at two hundred seventy-three gigabytes a second, the fastest one query could possibly be?

B: Point seven six eight over two seventy-three... about three milliseconds?

A: [pleased] About two point eight. That's the floor for one query.

A: Then the main task: three indexes, three dials. You build each index once, then sweep its query-time dial, and for every setting you record recall at ten against your brute force answers, queries per second, and memory. I V F with four thousand ninety-six cells, which is about six times the square root of five hundred thousand, and n probe from one, doubling up to a hundred twenty-eight. I V F with P Q, forty-eight pieces, which is three eighty-four divided into pieces of eight, same n probe values. And H N S W with M of sixteen and thirty-two, ef search from ten up to two fifty-six. The function you write yourself is recall at k: for each query, how many of the index's top k are in the true top k, divided by k, averaged over queries.

A: And timing two ways. The whole batch of a thousand queries at once, that's throughput. And one query at a time in a loop, that's latency, which is what a live service actually sees. For the one-at-a-time numbers you pin FAISS to a single thread, so you're comparing algorithms, not thread pools. Memory, you work out from the formulas, vectors times bytes plus I Ds plus links, and check it against the serialized size of the index or the process's resident memory. Build time for each index too. H N S W's will surprise you. And one more variant: I V F plus P Q asked for the top hundred, then re-scored with the full vectors, keeping the best ten. Recall of that.

A: Then two plots. Recall at ten along the bottom, queries per second up the side on a log scale, one line per index type, one point per dial setting, brute force marked as a single point. That's the standard plot every A N N benchmark uses. Up and to the right is better. And a second one, recall against memory. And then you hand the measurement code, not the plotting, to an agent to look for unfair comparisons. Missing warm-up runs. Different thread counts for different indexes. Build time sneaking into query time. Or the ground truth computed with a different similarity than the index uses.

A: And then the part that matters for your job. Two stages. Retrieval feeding a reranker, and measuring what actually reaches the user. Your own cross-encoder if you can load it, otherwise the public M S Marco Mini L M cross-encoder. You write three small functions: retrieve the top so-many passages from the index, rerank them with the cross-encoder and keep the best few, and N D C G at ten with yes-or-no relevance. Then a grid over the thousand queries, recording N D C G at ten, M R R at ten, recall at a hundred of the labelled passages, and the latency of each stage.

B: M R R is the reciprocal rank thing?

A: One over the rank of the first relevant passage. First place, one. Second, a half. Not in the top ten, zero. It's M S Marco's official metric. And the grid is: retrieval alone, depth a hundred, with brute force and with H N S W at ef one hundred and two fifty-six. Then H N S W retrieving a thousand candidates and reranking the top ten, fifty, a hundred, two hundred. Then the same with brute-force retrieval, so you can isolate what the approximate index costs you end to end. One gotcha. FAISS quietly uses whichever is bigger, ef search or the number of results you ask for. So an ef below the depth you ask for does nothing. And to pull a thousand candidates, ef has to be at least a thousand.

A: You're done when the ground truth exists and every recall's measured against it, you've got both plots with all three index families, you can say with numbers how much N D C G the approximate index costs after reranking and what reranking two hundred instead of a hundred buys you, and you can pick an index and settings for "a hundred millisecond budget, a hundred twenty-eight gigabyte box, a hundred million passages" and defend it with arithmetic.

<!-- section: Measure -->

A: So here's what it looks like when someone actually runs it. The reference run was on an M four Pro MacBook, which, conveniently, has the same spec-sheet bandwidth as the Spark, two seventy-three. Embedding on the Mac's GPU, FAISS version one point fifteen on the CPU. The embedding took six hundred ninety-nine seconds for five hundred thousand passages. About seven fifteen a second. Your numbers will be different. The shapes shouldn't be.

A: Brute force first, over the seven sixty-eight megabytes. Numpy, one query at a time, using all the cores for the math: seven milliseconds per query. And you can turn that into an effective bandwidth, just bytes divided by time: about a hundred nine gigabytes a second. FAISS flat on one thread, one query at a time: ten point nine milliseconds, about seventy gigabytes a second. Torch on the Mac's GPU, batch of one: three point eight milliseconds.

B: [working it out] Seven sixty-eight megabytes in three point eight... that's two hundred something gigabytes a second.

A: About two hundred four. Close to the two seventy-three spec. One CPU thread won't get anywhere near that, the GPU path does. Now the batches. FAISS flat, one thread, a thousand queries at once: point two eight milliseconds per query. Torch on the GPU, batch of a thousand: point five eight per query.

B: Wait, the single CPU thread beat the GPU in the batch?

A: [carefully] In this run, yeah. On the Mac. But look at the bigger thing. Same single thread, one at a time, ten point nine milliseconds. Batched, point two eight. Thirty-nine times faster per query, on the same thread, because each byte it read got reused a thousand times. That's the bandwidth-bound versus compute-bound thing, measured. One at a time you're bound by reading. In a batch you're bound by math. And one practical note: if your numpy batch looks weirdly slow, check you used arg partition and not a full sort of all five hundred thousand scores for each query. The first attempt on that run did the full sort, and the sorting cost more than the matrix multiply.

A: Then the indexes, all on one thread, one query at a time. Brute force, recall one, ten point nine milliseconds, seven sixty-eight megabytes. As a batch, about thirty-six hundred queries a second. I V F with four thousand ninety-six cells, n probe eight: point one three milliseconds, way faster. Recall: point six eight.

B: [surprised] Point six eight? It's missing a third of the neighbours?

A: Real embeddings are hard for I V F. Four thousand ninety-six cells, about a hundred twenty vectors each. And with n probe eight it found only sixty-eight percent of the true top ten. The neighbours of a three eighty-four dimension query are just scattered across lots of cells. Turn n probe up to thirty-two: recall point eight two, still under a fifth of a millisecond. A hundred twenty-eight: point nine one, at half a millisecond. Memory barely moves, seven seventy-two megabytes, and it took sixteen seconds to build. And as a batch, n probe eight did about thirty thousand queries a second, n probe thirty-two about nine thousand, n probe a hundred twenty-eight about twenty-four hundred. Against brute force's thirty-six hundred.

A: Now H N S W, M thirty-two. Ef sixteen: recall point eight nine seven, point one three milliseconds. Ef sixty-four: point nine seven six, at point three eight milliseconds. That's about twenty-eight times faster than single-thread brute force, at almost ninety-eight percent recall. Ef two fifty-six: point nine nine six, at about one point four milliseconds. Batched, that's about eight thousand, twenty-seven hundred, and eight hundred thirty queries a second. Memory, nine hundred four megabytes. Bigger than the raw vectors, because of the links. And that's why H N S W is the default whenever it fits in RAM.

A: And P Q trades recall for memory. Forty-eight bytes per vector, plus the eight-byte I D. The whole index, twenty-eight megabytes, against seven seventy-two. Twenty-seven times less. At n probe thirty-two, recall dropped from I V F's point eight two down to point six two. Then re-score the top hundred with the full vectors, and recall came back to point eight two. Exactly I V F's number at the same n probe.

B: Exactly the same. Huh. So the re-rank fixes P Q completely?

A: It fixes P Q's part. P Q shuffles the order, and the re-rank un-shuffles it. What it can't fix is whatever I V F never looked at. The cells it didn't open are still unopened. So you land right back on I V F's ceiling.

A: And the build time. H N S W took seventy-one seconds for half a million vectors on ten threads. I V F took sixteen. At a hundred million, multiply by more than two hundred, because inserting gets more expensive as the graph grows, faster than linearly. So plan for hours.

A: Now the two-stage numbers. These are the first three hundred of the thousand queries, the public Mini L M cross-encoder on the Mac's GPU, H N S W with M thirty-two. Retrieval alone, no rerank. Brute force: N D C G at ten of point seven seven four, M R R point seven three nine, about seven milliseconds. H N S W at ef one hundred: point seven six three, at point six milliseconds. H N S W at ef two fifty-six: point seven seven five. Basically brute force's number, at one point three milliseconds.

A: Then add the reranker. Brute force retrieval, rerank the top hundred: N D C G point eight four one, M R R point eight oh nine, and the reranker took a hundred twenty-five milliseconds. H N S W retrieving a thousand, which took under five milliseconds, then rerank the top hundred: point eight four one.

B: The same?

A: [quietly emphatic] Identical. End to end, the approximate index cost nothing. The few true neighbours H N S W misses almost never matter once a cross-encoder reorders the list. And reranking added about point zero seven N D C G over retrieval alone. Which is, you know, the reason your job exists.

B: [laughs] Good to know.

A: And rerank depth. H N S W, rerank the top ten: point eight oh eight, sixteen milliseconds for the reranker. Top fifty: point eight four one, sixty-one milliseconds. Top hundred: point eight four one, a hundred twenty-five. Top two hundred: point eight four one, two hundred thirty-three. So past fifty, it bought nothing, and the cost kept growing in a straight line. On the Spark your cross-encoder'll be faster, but the shape holds. Find the knee, where N D C G stops climbing as you go deeper, and stop there.

B: [skeptical] Point eight four seems really high, though. I thought M S Marco numbers were way lower.

A: They are, on the full set. For small bi-encoders on the full M S Marco, M R R at ten is closer to point three. These are high because the slice has seventeen times fewer distractors than the real eight point eight million. Fewer wrong answers to trip over. So compare your configurations against each other, not against leaderboards.

<!-- section: Break It -->

A: Then you break it on purpose. Four ways. First: forget to normalize. Re-embed without asking for normalized output, or just take a random ten percent of the vectors and multiply them by three. Then search by plain dot product.

B: [working it out] Then the long ones win. The ones I multiplied by three float to the top just for being long.

A: The top results fill up with long vectors, and recall against the cosine ground truth drops. Then normalize everything and search by straight-line distance instead, and the rankings match the dot product search exactly. That's the identity from earlier, checked on real data. The lesson: the similarity measure is part of the model's contract.

A: Second: make I V F's training sample lie. Sort the passages by length, or by anything that correlates with topic, and train the clustering on only the first ten thousand. Then add all five hundred thousand. What you get is a few giant cells and a lot of nearly empty ones. At the same n probe, recall and speed both get worse, because a couple of giant cells get scanned every single time. Print the sizes of the twenty biggest lists and you'll see it. And that's what happens in production when your corpus drifts after the index was trained. It's why I V F indexes get retrained every so often.

A: Third: a selective filter. Tag every passage with a random "language" so one percent are German. Then ask for the top ten German passages three ways. Post-filter H N S W's top hundred, and count how often you end up with fewer than ten. Post-filter the top five thousand. And pre-filter, then brute force over the roughly five thousand German vectors.

B: The pre-filter one wins, right? Five thousand is nothing to brute force.

A: Exact and fast, here. Now make the filter keep half the corpus and redo it.

B: Then pre-filter is brute forcing two hundred fifty thousand. So the graph wins.

A: [amused] The winner flips. Same code, different selectivity, different answer. Fourth: starve the reranker. Set ef search to ten, retrieve only ten candidates, rerank those. The cross-encoder can't find a passage it was never shown. So N D C G at ten is capped by retrieval's recall at ten. Then push the depth to a hundred and watch N D C G climb, even though the index itself didn't change at all.

B: That's the thing from the very beginning. My ceiling is set one stage earlier.

A: That's the thing from the beginning, yeah. Measured.

<!-- section: Scaling and choosing settings -->

B: [curious] Okay, so all of that's half a million vectors. What happens at a billion?

A: Take them one at a time. Brute force scales in a straight line in both memory and time. A billion vectors, seven sixty-eight dimensions, thirty-two-bit, that's about three terabytes. Seconds per query. H N S W's query cost grows roughly with log N, which is great, but its memory grows linearly, full vectors plus links, so over three terabytes. And it wants all of that in RAM, because it hops around randomly. The build also takes forever and it's hard to split across machines. I V F plus P Q is around a hundred bytes a vector, so about a hundred gigabytes. Its query cost is the number of cells plus n probe times the cell size, so as N grows, you grow the number of cells with it.

B: So what would you actually build?

A: [thinking out loud] Shard it across several machines. Each shard holds an I V F plus P Q index, or a compressed graph index. Search all the shards in parallel, merge their top results. Keep the full-precision vectors on SSD to re-score the top few hundred, the way Disk A N N style systems do. And the one thing sharding drags in is tail latency. The query is only as fast as the slowest shard. If one of ten machines has a bad moment, the whole query has a bad moment.

B: [more practical] And for my pipeline. How do I actually set ef and the rerank depth?

A: Start from the latency budget, and measure end to end. The reranker's cost grows in a straight line with depth, a hundred pairs versus two hundred pairs. And retrieval's only job is to get the relevant passages into that depth, not to order them well. So index recall at ten isn't really the target. What matters is the final N D C G at ten after reranking, and whether the index's misses land inside or outside the set you rerank. I'd sweep ef search and rerank depth together, plot N D C G against total latency at the slow end, the p ninety-nine, meaning the slowest one percent of requests, and pick the cheapest point that's within a small margin of brute force plus rerank. Often a fairly sloppy index is fine, because the reranker reorders the top anyway. And often, adding B M twenty-five through R R F buys you more than a more exact index would. Because it catches the passages the embedding model ranks badly, and no index setting can fix those.

<!-- section: Connections and close -->

A: And if you zoom out, this is really just napkin math and bandwidth-bound applied to search. Brute force is one division, bytes over bandwidth, and the fix is the same as in decoding: read fewer bytes, or reuse them across a batch. P Q is a cousin of quantizing model weights, fewer bits per number, trading accuracy for bandwidth. And I V F's lists and B M twenty-five's word lists are both indexes in the database sense. Structure you pay for at write time so a read can skip most of the data. If you read one thing after this, read the H N S W paper itself, it's short, and section four, the neighbour selection rule, is the detail most explanations skip. And the FAISS wiki's guide to choosing an index.

B: [working it out] Okay, let me try the whole thing. The reranker can only reorder what retrieval hands it, so the first stage sets the ceiling. Brute force over a hundred million embeddings is three hundred gigabytes read per query, so it's bandwidth-bound, and you either shrink the vectors with P Q or skip most of them with I V F or H N S W. All of those trade away some recall. And you pick the index with the best recall at ten.

A: [gently] Almost. Everything up to the last line, yes. But recall at ten against brute force isn't really what you're picking on. In the run, an H N S W that missed some true neighbours scored exactly the same N D C G as brute force once the cross-encoder reordered the list. Index recall just measures how faithfully you copied the slow search. What you pick on is the final ranking quality, end to end, against latency and memory. So: the cheapest index and the shallowest rerank that still get the right passage into the pile, and then let your model put it on top.
