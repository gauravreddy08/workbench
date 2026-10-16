<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture your eval harness. Five hundred prompts, and it runs them through the server on the Spark every time somebody touches the ranking code. Temperature zero. Same model, same prompts, every single time. And every run, the GPU spends about forty minutes working out five hundred answers it already gave you yesterday. Word for word.

B: [laughs] Which is kind of insane, when you say it like that.

A: It's totally insane. So you do the obvious thing. You put a dictionary in front of it. The key is the prompt, the value is the answer. The second run takes four seconds. Four seconds instead of forty minutes. And you feel like a genius for... about a week.

B: [amused] And then?

A: And then the bugs show up. One at a time. First one. You swap in a fine-tuned checkpoint, run the evals, and the scores don't move. At all. Not even a little.

B: [working it out] Oh. Because it's still handing back the old answers. The dictionary doesn't know the model changed.

A: Right. The model was never part of the key. So you fix that. And then a teammate runs a sampling experiment at temperature zero point eight, and gets exactly one answer per prompt, no matter how many times they run it. Because temperature wasn't in the key either. So, okay, you fix that too. And now you move the whole thing into Redis, so your three replicas can share one cache, and you set every entry to expire after an hour. And then at ten o'clock every morning, the GPU queue spikes. Hundreds of requests, all for the same handful of prompts, all at once.

B: Ten o'clock... is there something that runs at nine?

A: [amused] There's a warm-up job at nine. An hour later, everything it stored expires at the same moment. Hold on to that one, it gets its own name later. And, I mean, every one of these is a classic. Each has a name and a known fix. That's sort of the whole deal with caches. They're the cheapest speedup in computing, and they're also the most reliable way to serve something wrong... with total confidence. So this is about both halves.

<!-- section: Origin -->

A: The idea's old. Nineteen sixty-five, Maurice Wilkes writes a two-page paper called "Slave Memories and Dynamic Storage Allocation". And the proposal is: put a small, fast memory next to the processor, and have it automatically keep copies of whatever the processor used recently from the big, slow memory. IBM ships the first commercial version in nineteen sixty-eight, in the System three sixty Model eighty-five, and they call it a cache. And every CPU since then has had one.

B: So it started as hardware.

A: It started as hardware, and then the same trick just kept moving up the stack, every time something got slow. Two thousand three, Brad Fitzpatrick's running a blogging site called LiveJournal, and the databases are drowning in the same reads over and over. So he writes memcached. It's basically one big hash table in RAM, spread across whatever spare machines you have, and any web server can ask it first before bothering the database. Facebook later ran it at an enormous scale, and wrote up everything that broke, which is a great read. And then two thousand nine, Salvatore Sanfilippo is building a real-time analytics product called L L O O G G, it's too slow on MySQL, and he writes Redis. Which is like memcached, except instead of storing only strings, it stores lists, and sets, and other actual data structures. And it can save itself to disk.

B: There's a famous line about this, right? The two hard things.

A: Yeah. Usually credited to Phil Karlton at Netscape. "There are only two hard things in computer science: cache invalidation and naming things." And it's funny, but it's also just true. Making a cache fast is easy. Knowing when its answers stop being true... that's the hard part.

<!-- section: The Idea: A cache is a bet -->

A: So, okay, what is a cache, really. It's a small, fast store that keeps copies of results from something bigger and slower, so repeated requests skip the slow part. And the way I'd think about it is, it's a bet. A bet that you'll ask for the same thing again soon. When you win the bet, that's a hit. The cache has a copy, you hand it back, and the slow thing never gets touched. When you lose, that's a miss. You pay the full slow cost, plus the little cost of having checked the cache first. And usually you store the result, in case somebody asks again.

B: And why's it a good bet? Like, why should anything repeat?

A: Two reasons. The first one you've met with CPU caches. Programs reuse what they used recently. That's called temporal locality, the tendency to ask for something again soon after asking for it once. It's why "keep what was used recently" is a decent rule. And people do it too. The prompt somebody sent a second ago is way more likely to come again than one from last month. But the second reason is stronger, and it's about popularity, not time. Take every distinct request your server gets and rank them by how often they're asked. In real traffic, web pages, search queries, words in a book, songs, API calls, prompts, the counts are wildly lopsided. The most popular thing gets asked about twice as often as the second most popular, three times as often as the third, four times as often as the fourth, and so on, down a really long tail of stuff that's almost never asked. That shape has a name. It's a Zipf distribution.

B: Zipf. Okay. And is it always exactly that twice, three times pattern?

A: That's the classic version. There's a knob, called the skew, that says how lopsided it is. Skew zero means every item's equally popular, perfectly flat. Skew one is the twice, three times, four times pattern. And bigger than one means the top few items grab even more of the traffic.

B: [a bit unsure] Okay, but here's my gut. If my cache holds ten percent of the items, it answers... ten percent of the requests? Roughly?

A: That's exactly true if there's no skew. And it's wildly wrong otherwise. So there's a little simulation, fifteen lines of Python. Ten thousand distinct items, two hundred thousand requests drawn from a Zipf distribution, and a cache that starts empty and keeps the most recently used stuff. At skew one, a cache holding just one percent of the items, so a hundred out of ten thousand, answers thirty-nine percent of the requests. A cache holding ten percent answers about two thirds of them. Sixty-seven percent. Holding half the items gets you to eighty-nine. And if you crank the skew up to one point two, a cache holding one tenth of one percent, ten items, answers about a third of everything.

B: Ten items. Out of ten thousand.

A: Ten items. But now flip to skew zero, everything equally popular. Ten percent of the items answers ten percent of requests, and the tiny ten-item cache answers about a tenth of one percent. Caching's almost pointless. So the thing to take from this is, the workload decides whether a cache helps. Not the cache. Before you build one, go look at how often your requests actually repeat.

<!-- section: The Idea: One idea, many layers -->

A: And you've actually been running into caches all over the place already, without the word always being in the title. It's the same idea at different sizes and different distances. Picture two rows of boxes. The top row is the path a web or API request takes, left to right. First box, the browser's own cache, on the user's disk. Basically zero milliseconds. Next, a CDN edge. CDN is a content delivery network, thousands of servers spread around the world that hold copies of your responses close to users, so most requests never have to cross an ocean. That's maybe five to thirty milliseconds away. Then your app's own memory, a Python dict, or lru cache. About a tenth of a microsecond. Then Redis, shared, in RAM, a tenth of a millisecond to a millisecond. And on the far right, the slow thing. A database, another API, a language model. Anywhere from ten milliseconds to twenty seconds. And every box along the way is asking one question: do I already have a copy? If not, ask the next one to the right.

B: And the bottom row?

A: The bottom row is inside one machine. L one and L two, the CPU caches, kilobytes to megabytes, about one to four nanoseconds. L three, tens of megabytes, ten to twenty nanoseconds. Then RAM, gigabytes, about a hundred nanoseconds. Then the page cache, which is the kernel keeping file data in RAM, microseconds. And on the far right, the SSD. Terabytes, fifty to a hundred microseconds. Those are all rough orders of magnitude, your hardware will differ. But every box keeps copies of something slower to its right. The CPU caches copy RAM. The page cache copies the SSD. A dict or lru cache copies the result of a function. Redis copies the result of a database query or a model call, and every server process shares it. The CDN copies your server's responses near the user, the browser copies them onto the user's own disk. And on the GPU, the K V cache and the prefix cache copy the attention keys and values that would otherwise get recomputed.

B: So it's literally the same trick, just... at every level.

A: Same trick. And every layer has to answer the same four questions. What's the key, meaning what exactly has to match for a stored answer to count as the answer to this request? How long is a copy allowed to be trusted? When it's full, what leaves? And what happens on a miss, especially lots of misses at once? What changes between layers is who answers those questions. The CPU answers them in silicon. The kernel answers them in C. The CDN answers them through the HTTP headers you send it. At the application layer, which is where we are, you answer them. In your code. And you get them wrong in exactly the ways from that eval harness.

<!-- section: The Idea: The arithmetic -->

A: So now the math, and it's really simple, but it does something surprising. Every request either hits or misses. The fraction that hit is your hit rate. And the average cost is just: the hit rate times what a hit costs, plus the miss rate times what a miss costs. Let's plug in your server. A hit through Redis, about one millisecond. A miss, about two thousand milliseconds of GPU, for a short answer. So, zero percent hits, two thousand milliseconds. Fifty percent hits, half of two thousand plus half of one, about a thousand. Twice as fast.

B: [working it out] And ninety percent... ten percent of two thousand is two hundred, plus ninety percent of one millisecond, so, about two hundred one milliseconds. That's ten times faster.

A: Yep. And ninety-nine percent?

B: One percent of two thousand is twenty, plus about one... twenty-one milliseconds. Okay, wait. That's way faster than I expected.

A: About ninety-five times faster than no cache. So look at the jump from ninety to ninety-nine.

B: [skeptical] Nine points of hit rate. That's... I'd honestly have called that polishing. Ninety's already great.

A: [jumping in] And that's the trap. Nine more points, ten times faster. Because the misses dominate the sum. A miss costs two thousand times what a hit costs, so the average is basically just the miss rate times the miss cost. The hits barely register. So the habit to build is: think in miss rate, not hit rate. Going from ten percent misses to one percent misses is a ten-times improvement. Going from ninety percent hits to ninety-nine percent hits sounds like a rounding error. Same change.

B: So if my boss says, we're at ninety, can we get to ninety-five, is that worth it, the answer's...

A: It's about twice as fast. Ten percent misses down to five. You halve the average. That's not small at all. Two more things fall out of the same formula. If a hit costs almost as much as a miss, the cache is useless at any hit rate. Like, putting a one millisecond Redis round trip in front of a two millisecond database query saves you at most half, even if every request hits. And a cache with a terrible hit rate actually makes things slower, because every miss also pays for the lookup.

<!-- section: The Idea: Predict, p50 and p99 -->

A: Try this one. Your server gets traffic with a seventy percent hit rate. Hits take one millisecond, misses take two thousand. What are the p fifty and the p ninety-nine, so the typical request and the slowest one percent, with the cache and without it?

B: Without, both about two thousand, everything's a miss. With it... the median is one millisecond, because most requests hit. And the p ninety-nine, I mean, it should come down too, right? Everything got faster on average.

A: So sort every request from fastest to slowest. The fastest seventy percent are hits, all about one millisecond. The median, the fiftieth percentile, lands inside that seventy percent. So p fifty is about one millisecond. Two thousand times better. But the ninety-ninth percentile is out in the slowest thirty percent. And those are all misses. So p ninety-nine is still about two thousand milliseconds. No improvement at all.

B: [quietly] Huh. The average moved a lot, and the worst ones didn't move at all.

A: Right. p ninety-nine only drops to hit speed once your miss rate is below one percent. And that's the honest summary of most caches. They make the typical request magical and leave the worst requests exactly as bad. And if your users feel the tail, which, with fan-out they usually do, because one page waiting on twenty calls is as slow as its slowest call, then a cache isn't the fix by itself. There's one indirect win, though. Your GPU server runs one request at a time. Every hit is a request that isn't standing in that line. So the misses that are left wait less. You'll actually see that when you measure.

<!-- section: The Idea: Four ways to wire it in -->

A: Okay, so where does the cache actually sit, relative to your code and the slow thing? There are four standard answers, and the names come up in basically every system design conversation. Picture four little diagrams, each with an app box, a cache box, and a source box. The first one's called cache-aside, sometimes lazy caching. Your app does everything. Step one, it asks the cache, and gets a miss. Step two, it queries the source itself. Step three, it puts the result in the cache. The cache is totally passive, it knows nothing about where values come from. That's what you'll build, and it's what most code using Redis does. Get, and if nothing came back, compute and set.

B: Seems fine. What's wrong with it?

A: It is fine, mostly. Upside: it's simple, the cache can be any key-value store, and if the cache dies, your code still works. Slowly, but it works. Downside: every single caller has to remember the dance. And a miss costs three steps. The second one is read-through. Here the cache owns the loader. You give it a function that knows how to fetch a missing value, and callers only ever ask the cache. Python's lru cache decorator is read-through, actually. You call the function, the decorator checks its table, and only calls the real function on a miss. CDNs are read-through too, on a miss the edge goes and fetches from your server. And the win is that the loading logic lives in one place. Which turns out to be the natural place to make sure only one caller loads a given key at a time. That'll matter in a bit.

B: And the other two?

A: Those two were about reads. Writes raise a sharper question. When the data changes, who updates the cache? Write-through says every write goes to the cache and the source together, and you only report success after both have it. Slower writes, but reads after a write always see the new value. Write-behind, also called write-back, says the cache accepts the write, says okay immediately, and writes to the source later, often in batches. Fast writes. The price is that if the cache crashes first, you lose writes the caller already thought were saved. And you've seen this exact thing. Your CPU's caches are write-back. So is the kernel's page cache. When you call write on a file, it returns long before the bytes are actually on the SSD. That gap is the whole reason f sync exists, the call that says, no, actually put it on the disk now.

B: Okay, and for model responses, which one?

A: For LLM responses there aren't really writes in the usual sense. The model never changes an answer behind your back. Only you change the model. So cache-aside, with a careful key, is the right shape. The write patterns start to matter the moment you cache something users can edit.

<!-- section: The Idea: TTLs -->

A: Next question, how long do you trust a copy. A copy is a snapshot. The source might change after you took it, and the cache has no way of noticing. The bluntest and most reliable answer is to give every entry an expiry date. That's a TTL, time to live. How long an entry's allowed to be served after it was stored. After that it counts as missing, and the next request refetches it. In Redis you just say set this key to this value, with an expiry of three thousand six hundred seconds, and an hour later it's gone.

B: So you pick a number. How?

A: Well, a TTL is a promise about staleness. "This answer is at most an hour out of date." And choosing it is honestly a business question wearing a technical costume. Three things to ask. One, how wrong can this answer be, and for how long, before somebody gets hurt? A stock price, seconds. A product description, an hour's fine. And a user's permissions after they've been fired? Zero.

B: [skeptical] Zero's not a TTL.

A: Right, and that's the whole point. Zero means a TTL alone is the wrong tool. You need to actively remove that copy. Two, how often does the source actually change? Data that changes once a day gains nothing from a ten-second TTL, except a lot more misses. And three, what does a miss cost? If a miss is a two millisecond query, short TTLs are cheap. If it's two seconds of GPU, every expiry hurts, and you want long TTLs plus some other way of handling changes.

B: [a bit unsure] So for my LLM cache, I'd want, I don't know, something short-ish, so the answers stay fresh?

A: So think about question two. How often does the answer to a temperature-zero prompt change? Never. Until you change the model, or the prompt template. So the right TTL is long. Days. And the thing that actually keeps the answers correct isn't the clock at all. It's the key. If the model's in the key, a new model means new keys. The TTL's only job is to bound memory, and to clean up keys nobody's ever going to ask for again.

B: Okay, that flips it. Correctness is in the key, not the timer.

A: Yeah. Two refinements you'll actually use. First, jitter. Instead of exactly three thousand six hundred seconds, use three thousand six hundred plus or minus a random ten percent. Because otherwise everything you stored in one burst, say a warm-up job or a deploy, expires in one burst. And that's your ten o'clock spike. The nine o'clock job filled the cache, and an hour later every one of those entries died at the same second. Second, negative caching. Also cache the "not found" answers, briefly. If a user ID that doesn't exist gets requested a thousand times a second, then without a negative entry, every single one of those is a miss that goes to the database.

<!-- section: The Idea: Invalidation -->

A: The alternative to waiting out a TTL is to remove or update the copy the moment the source changes. That's invalidation. And the hard part is doing it at the right moment, everywhere the copy lives, without races. With cache-aside the usual recipe is, write to the database, then delete the cache key. Next read misses, fetches the fresh value. Sounds airtight.

B: [skeptical] I'm guessing it isn't.

A: [amused] It isn't. So try to break it. Two requests. Request R wants user seven. Request W is updating user seven. Using exactly that recipe, write the database, then delete the key. Can you find an ordering that leaves the cache holding the old data?

B: [working it out] Okay... W writes, W deletes. R comes in after, misses, reads the new value. Fine. Or R reads first, gets the old value, stores it, then W writes and deletes it. Also fine, it gets deleted. Hmm. So I need R to store it after the delete?

A: That's the one. Walk it. R misses in the cache and reads user seven from the database. The old value. Then W writes the new value to the database. Then W deletes the key from the cache, except there's nothing there yet, so that does nothing. And then R, which was slow, maybe a garbage collection pause, maybe its thread got busy, finally does its set. With the old value.

B: [realizing] Oh. And now nothing's ever going to delete it, because the delete already happened.

A: Right. It stays wrong until the TTL expires. Or forever, if there's no TTL. Which is why people say always set a TTL, even if you invalidate. The TTL's the backstop that bounds how long any bug in your invalidation can last. Real fixes exist. Facebook's memcache hands the reader a short-lived lease, and the reader's only allowed to set if no invalidation happened in between. Or you use versioned keys, which I'll get to in a second. Or you just delete the key a second time, a little later. But the bigger point is that once a copy exists in two places, keeping them in agreement is a distributed systems problem. With races. Not a line of code.

B: And that's just one key.

A: [sighs] And that's the other half of why it's hard. You have to know every key a change affects. A user renames themselves. Which cached pages, search results, recommendation lists have the old name in them? Good luck. So the usual escape is to not invalidate at all. You put a version in the key. Like "answer, v three", then the hash. When the data or the code changes, you bump it to v four. The old keys just never get asked for again, and the TTL or the eviction quietly clears them out. You're trading memory for correctness, which is almost always the right trade. And for your LLM cache, that's the whole strategy. The model, its weights revision, and the prompt template version all go into the key. Change any of them, and every key changes.

<!-- section: The Idea: Eviction -->

A: Third question. RAM is finite. When the cache is full and something new arrives, something has to leave. That's eviction. And it's not the same as expiry. An evicted entry might've been perfectly valid, there just wasn't room. The rule that picks what leaves is the eviction policy. Now, the ideal rule is easy to say. Evict the entry that'll be needed furthest in the future. That's called Bélády's optimal algorithm, from nineteen sixty-six. And you can't run it, because you don't know the future. So every real policy is a guess about the future, from the past.

B: And LRU is one of those guesses.

A: LRU's the main one. Least recently used. When full, evict whatever was last touched the longest ago. It's a bet on recency. It's cheap, it adapts fast when popularity shifts, and it's the default nearly everywhere. Its classic weakness is a scan. A batch job that reads a hundred thousand keys once each pushes out every hot entry you had, because each scanned key is "recently used" for a moment. LFU, least frequently used, bets on popularity instead. Evict whatever's been used the fewest times. It shrugs off scans, since a key used once never outranks a key used a thousand times. But it's slow to forget. Yesterday's viral prompt keeps its giant count. So practical LFUs let the counts decay over time. Then there's ARC, adaptive replacement cache, from Megiddo and Modha at IBM in two thousand three. It keeps a recency list and a frequency list, plus what they call ghost lists, which are just the keys of things it recently evicted, no values. And when a ghost gets asked for again, that's evidence it made a mistake, so it shifts space toward whichever list that ghost came from. It's used in Z F S, the file system. And more modern designs in that spirit, like W Tiny L F U in Java's Caffeine library, only let a new entry in if it looks more popular than the one it'd push out.

B: And the dumb ones? FIFO, random?

A: Sound naive, and on real traffic they're often within a few points of LRU, with less bookkeeping. Redis itself doesn't run exact LRU. It grabs a handful of keys at random and evicts the oldest of those.

<!-- section: The Idea: The cache simulator -->

A: There's an interactive one worth playing with here. It runs an LRU cache over two hundred keys whose popularity follows Zipf, key one being the most popular. Up top you see the request stream go by. A filled mark is a hit, an outlined mark is a miss, a crossed-out mark is an entry that had expired. And there are three sliders. Skew, cache size, and TTL, where the TTL's counted in requests from when the entry was written, same as Redis. Underneath, it re-runs three thousand requests at every cache size and draws the hit rate curve, next to a dashed "ideal" line for a cache that magically holds exactly the most popular keys.

B: What do you see when you drag things?

A: Drag the skew to zero and the curve's a sad straight line. Caching's pointless. Put skew at one point five with a size of five, and a tiny cache wins big. And then set a TTL of a hundred and watch even key one, the hottest key there is, get thrown away and refetched every hundred requests. Three things to notice. First, the curve bends early. At skew one, the first twenty slots out of two hundred give you most of the win. Doubling a cache that's already on the flat part buys you very little. So sizing a cache is a question for the curve, not for your gut.

B: And the gap between the blue line and the dashed one?

A: That's the second thing. LRU sits below ideal, for two reasons. Every distinct key costs one miss on a cold start, no matter how big the cache is. That's called a compulsory miss, or a cold miss. You can't hit something you've never seen. And LRU hangs on to some unpopular keys that just happened to be asked for recently, so it wastes slots. That gap is what LFU and ARC are fighting over. Third, a TTL lowers the whole curve. Even the hottest key costs a miss every time its TTL runs out. That's the price of the staleness bound. And it's why hot keys deserve special care when they expire.

<!-- section: The Idea: Building LRU -->

A: So how do you actually build an LRU? You need two operations, get and set, and both should be constant time, meaning they take the same tiny amount of time whether the cache has ten entries or ten million. And you need to find the least recently used entry instantly. No single data structure does all three. A dict finds any key in one step, but has no idea about order. A list knows order, but finding a key in it means walking the list. So the trick is to use both, and make them point at each other.

B: Point at each other how?

A: Picture a column on the left, that's the dict. Keys, b, a, d, c. And from each key, an arrow going down into a row of boxes along the bottom. That row is a linked list. Each box is a node, holding the key, the value, an expiry time, and two pointers, one to the box before it and one to the box after. The row's in recency order. On the far left there's an empty box called HEAD, then a, the one you just used, then c, then d, then b, and then an empty box called TAIL. So b is sitting right before TAIL, and it's next to be evicted. HEAD and TAIL are just placeholder nodes, they're called sentinels, and they're there so no operation ever needs a special case for "is the list empty".

B: Okay. So on a get...

A: On a get, you look up the node in the dict. Not there, miss. There, but expired, you unlink it, delete it from the dict, and call it a miss. Otherwise, you unlink it from wherever it is and relink it right after HEAD, and return the value. That's four pointer updates. On a set, if the key exists, you update the node and move it to the front. If it's new, you make a node, put it at the front, add it to the dict. And if you're now over capacity, you take the node just before TAIL, unlink it, and delete its key from the dict.

B: [a bit unsure] Why does it have to be doubly linked, though? Couldn't each node just point forward?

A: Because to pull a node out of the middle, you have to change the node before it, so it skips over. And with only forward pointers, finding the one before means walking from HEAD, all the way along. The back pointer makes unlinking one step. And the reason each node stores its own key, which seems redundant, is eviction. You start from the node next to TAIL, and you need to know which dict entry to delete. Notice how the TTL fits in, too. It's checked lazily. Only when somebody does a get. An expired entry nobody asks for just sits there until LRU pushes it out. That's what Redis does too, plus a background sweep. And Python's OrderedDict is literally this same structure, written in C, with a move to end and a pop from the front. The prefix cache lesson used it. You build it by hand once so it's never magic again. Yours'll be a few times slower than a plain dict, on a Mac a hand-written Python get took about fifteen hundredths of a microsecond, against three hundredths for a dict lookup. And both of those are a rounding error next to a one millisecond network round trip.

<!-- section: The Idea: The stampede -->

A: Okay, now the ten o'clock spike, properly. Take a hot key. Say the answer to a prompt your team's dashboard sends, and it's being read two hundred times a second. All hits, all great. Then its TTL runs out. And for the next two seconds, while the first miss is being recomputed on the GPU, every request for that key misses too. Because the value isn't back yet. And each one sends its own copy of the exact same request to the model.

B: [skeptical] But it's the same prompt. Isn't that just, like, a few hundred small requests? The GPU deals with it.

A: So picture it as two timelines. Top one: a band of hits, then a dashed line where the TTL expires, and right after it a row of misses, each one with an arrow straight down to the backend, and the backend's got this long box that says N identical calls queued behind one GPU. That's a cache stampede. Also called a thundering herd, or dog-piling. On a web stack it can knock over a database. On your server it's worse in a very specific way. Your server has a lock that runs one generation at a time. So four hundred identical misses means the four hundredth request waits for four hundred full generations. Even though the answer was ready after the first one.

B: Oh, that's brutal. The answer exists and it's still waiting.

A: It's sitting there. Now the bottom timeline is the fix. Same hits, same expiry. The first miss starts the recompute, and every later miss just waits for that same result. One call to the backend. Then everybody gets answered, the cache refills, back to hits. That's request coalescing. Go's standard library calls it singleflight. You keep a table of keys that are in flight. A miss checks it first. If someone's already computing this key, you wait for their result instead of starting another. In one asyncio process it's a dict from the key to a future, a future being a placeholder for a result that isn't ready yet, that anyone can wait on. It's about ten lines.

B: But if I've got three replicas?

A: Then three replicas make three calls. Coalescing only works within one process. So across processes or machines, you use a lock in the shared cache. The first miss tries to set a lock key in Redis with two options. N X, which means only set it if it doesn't already exist. And P X ten thousand, which means expire it in ten thousand milliseconds, ten seconds, so a holder that crashes can't block everyone forever. Whoever wins the lock recomputes. The losers wait a bit and re-check the cache. More moving parts, but it works across your whole fleet. Then there's jitter, which we talked about. It doesn't stop one hot key's stampede, but it stops lots of keys from expiring together, which is what turns small stampedes into one big one.

B: And you can't just... keep serving the old one for a bit?

A: [amused] You can, and that's a real technique. It's called stale-while-revalidate, named after an HTTP cache-control extension. You store a soft expiry that's earlier than the real one. After the soft expiry, the first reader triggers one background refresh, and everybody, including that reader, keeps getting the old value until the new one lands. Nobody waits. The cost is serving answers a little past their TTL, which, honestly, if you're caching at all, you've already decided is fine. And the last one's probabilistic early refresh. As an entry gets close to expiring, every reader rolls a die, and with a small chance that grows as the deadline gets closer, it recomputes early. So almost always one reader refreshes it before the cliff. There's a paper, they call it X Fetch, that shows how to pick that probability. In the build you'll do coalescing and the lock, and see where each one runs out.

<!-- section: The Idea: Redis -->

A: So, Redis itself. It's an in-memory data structure server. A separate program you run next to your servers. It holds keys mapped to strings, hashes, lists, sets, sorted sets, all in RAM, and you talk to it over a TCP connection with short text commands. Set a key with an expiry of sixty seconds. Get a key. Increment a counter. Add alice to a leaderboard with a score of forty-two. Because everything's in RAM, a command is usually a few microseconds of actual work. What dominates is the round trip, roughly a tenth of a millisecond on one machine. So the work is tiny next to the trip to get there.

B: [a bit unsure] And to be that fast with a ton of clients, I assume it's massively multithreaded? Like, a thread per client or something?

A: [jumping in] It's the opposite. Redis runs commands one at a time, on one thread. It's an event loop, the same thing as in the waiting versus working episode. A single loop that asks the kernel, with E poll on Linux, "which of my client sockets have commands waiting?" Runs each command all the way to completion. Writes the reply. Repeat. Since Redis six, some extra threads can help with reading and writing the sockets, but executing commands stays on one thread.

B: Huh. So how's that not a bottleneck?

A: Because each command is tiny. Redis is fast because each command is small, not because it does many at once. And that one thread has two big consequences. Good one: every command is atomic for free. Atomic meaning it happens all at once or not at all, nothing gets interleaved, no other client can see a half-done increment. Two increments can't race, because nothing ever runs at the same time. Bad one: one slow command blocks everybody. Ask for every key matching star on a database with ten million keys, or sort something huge, and every other client just waits. Exactly like dropping a blocking call into an async def.

B: [amused] Same trap, different program.

A: Same trap. Next, it stores data structures, not just strings. A Redis hash, which is a little dict stored under one key. Lists, which make good queues. Sets. Sorted sets, where every member has a score and they're kept ordered by score, which is how you do leaderboards, priority queues, sliding-window rate limiters. Streams, which are append-only logs. Plus counters, bitmaps, and Hyper Log Log, which counts distinct items approximately in a tiny amount of memory. That's why people use it for way more than caching. Your rate limiter could live in Redis, and then every replica shares one limit.

A: Third thing, it expires and evicts. Any key can carry a TTL. Expired keys get removed lazily, when somebody touches one, and also by a background job that samples keys with TTLs several times a second. And when memory hits the max memory limit, a setting called the max memory policy decides what happens. The default is no eviction, which means refuse new writes with an error. That's right for a database. And wrong for a cache. For a cache you set it to all keys LRU, or all keys LFU. And Redis's LRU is approximate. It samples a few keys, five by default, and evicts the best candidate among them. In practice that's close to true LRU, and it saves two pointers per key.

B: Why does saving two pointers matter?

A: Because it's per key. Millions of keys times two pointers is real memory you'd rather spend on values. Fourth, it can survive a restart, if you ask it to. That's persistence, saving the in-memory data to disk. Two options. The first is RDB snapshots. Redis calls fork, which makes a copy of the whole process, a child. The child writes the entire dataset out to a file while the parent keeps serving clients.

B: [skeptical] Wait, but if the child's a copy of the process, doesn't that double the memory? If Redis is using sixty gigs...

A: It'd be awful if it did. But it doesn't, because of copy-on-write, from the virtual memory lesson. After a fork, the parent and child share the exact same physical memory pages. The kernel only makes a real copy of a page at the moment one of them modifies it. The child's only reading, so the only pages that get copied are the ones the parent writes to while the snapshot's running. And the catch with snapshots is, a crash loses everything since the last one. The other option is AOF, append-only file. Every write command gets appended to a log. And a setting called append f sync decides how often that log gets f synced. Always, every second, or never, leave it to the OS. Which is the same durability-for-speed trade as in the files lesson.

B: And for a cache, which one?

A: Neither. For a pure cache you can turn persistence off. Losing a cache costs you time, not data. And that's the property to protect. A cache must be safe to lose. If deleting your Redis loses something that exists nowhere else, it's not a cache, it's a database. Treat it like one. One note on the name. In twenty twenty-four Redis switched to a more restrictive license, and the Linux Foundation forked the last open-source version as Valkey, which the big clouds now offer. Redis later added an A G P L option. For your purposes they speak the same protocol and the same commands. If it matters for work, check where that stands now.

<!-- section: The Idea: Caching LLM responses -->

A: Now the case you actually care about. Model responses.

B: [a bit unsure] Isn't that just prefix caching? The thing where the GPU reuses the start of a prompt?

A: That's the confusion, yeah. Two very different things both get called prompt caching. The prefix cache lives inside the GPU. It reuses the K V cache, which is the attention keys and values the model computed for tokens it's already seen, for the shared beginning of prompts. But the model still runs. It still generates every output token. It just skips recomputing attention for the part it's seen before. It's exact by construction, and it works when prompts only partly match. A response cache is a different animal. It sits in front of the server and skips the model entirely. It hands back the stored text of a previous answer. That's thousands of times cheaper on a hit, but it only works when the whole request matches. And so the question that decides whether it's correct is the first of the four. What's the key?

B: The prompt. I mean... that's what I'd have said before the harness story.

A: [laughs] Right, and the harness story is the reason it isn't. The key is a hash of everything that can change the output. Not the prompt. Everything. The model ID, and its revision. That could be a hash of the weights, the checkpoint path, or just a version you bump. The chat template or prompt template version, and any system prompt your server adds. All the messages, in order, and any tools or response format. And every sampling parameter. Temperature, top P, top K, max tokens, stop sequences, seed, the penalties. All of it.

B: And then you hash that how? Just dump it to a string?

A: Almost. You make it canonical first, so the same request always turns into the same bytes. JSON with the keys sorted and no whitespace. Because otherwise the same request with its fields in a different order gives a different string and a different key. Then you hash it with SHA two fifty-six, and stick a prefix on, like "L L M, v one", followed by sixty-four hex characters. On a Mac, hashing a request with a two thousand character prompt took about five microseconds. Which is free.

B: [skeptical] It does feel paranoid.

A: Every field you leave out is one of those bugs. Leave out max tokens, and somebody who asked for sixteen tokens gets served a stored five hundred twelve token answer. Or worse, the reverse, a truncated answer for someone who wanted the whole thing. Leave out the model revision, and you evaluate the old model forever.

<!-- section: The Idea: Predict, temperature -->

A: So here's one. Your key does include temperature. A user sends the same prompt five times at temperature zero point eight, because they want five different brainstorm ideas. What do they get from an exact-match cache? And is that a bug?

B: Temperature's in the key, so... they get a fresh answer? Since zero point eight is a different key from zero.

A: Different from zero, sure. But all five of their requests have the same key as each other.

B: [working it out] Oh. So the first one misses and gets stored, and the next four get that same stored answer. Five copies of one idea.

A: Five copies of the first sample. Putting temperature in the key stops them from getting a temperature-zero answer, but it can't give them fresh randomness, because the cache's whole job is to return the stored result. Whether that's a bug depends on what the request means. At temperature zero, the request is asking for the single most likely answer. Replaying it is correct. It's actually more consistent than the GPU, because greedy decoding can come out slightly different between runs, since batching changes the order the floating-point additions happen in. But at zero point eight, the request is asking for a sample. When the model's about to pick the next token, it has a probability for every possible token, that's the output distribution, and at temperature zero point eight you're asking it to roll the dice on that distribution, so each call can come out different. A cache turns that distribution into a single point. Five calls are no longer five independent samples. And anything that relies on them being independent quietly breaks. Best-of-n. Self-consistency voting. Pass at K evals. Brainstorming.

B: And it breaks silently, which is the bad part.

A: Silently. So the usual policies are: only cache when temperature is zero, or when a seed is set, because then the request really is asking for one specific sample, and the seed goes in the key. Or let callers opt out with a header. Or store several samples per key and hand them out in turn. Pick one on purpose. A few more rules. Only store complete, successful answers. Not errors, not timeouts, not a stream that broke because the client hung up halfway. Check the finish reason the model sends at the end. Streaming still works, by the way. On a hit you replay the stored text as the same server-sent events, the little chunks the server streams down one connection, so clients can't tell. Time to first token on a hit becomes about a millisecond. Which will look wonderful on your scoreboard against Fireworks, and means nothing about the model. So label cached runs separately. And privacy. If somebody's conversation has their own data in it, an exact-match cache can only give that answer to someone who sent exactly the same text. Which is fine. The danger comes with the next idea.

<!-- section: The Idea: Semantic caching -->

A: Exact match misses obvious stuff. "What's the capital of France?" with a capital F and a question mark, versus the same thing all in lowercase. Different bytes, different key, miss. So people build a semantic cache. It matches by meaning instead of bytes. You turn each prompt into an embedding, a list of numbers from a model, trained so that texts with similar meaning land close together. It's the same machinery as your bi-encoder retrieval at work. Then you search the cached prompts for the nearest one, and if the cosine similarity is above some threshold, like zero point nine, you return its answer. Cosine similarity being a score for how closely two of those vectors point the same way. One means the same direction, and for real sentences most scores land somewhere between zero and one.

B: That sounds like it'd just... work. Better hit rate.

A: It does raise the hit rate on paraphrases. It also returns wrong answers, confidently. And you can see why from your ranking work. An embedding model is trained so that texts about the same thing land close together. Not texts with the same answer. Somebody checked a few pairs with all Mini L M L six v two, a popular little embedding model. "Is ibuprofen safe during pregnancy?" versus "Is ibuprofen unsafe during pregnancy?" Zero point nine seven nine.

B: [surprised] Those are opposite questions.

A: [serious] Opposite answers, nearly identical score. "Convert five miles to kilometers" versus "convert five kilometers to miles", zero point nine eight seven. "What is two plus two" versus "what is two plus three", zero point eight eight seven. Meanwhile actual paraphrases. "What is the capital of France?" versus "France's capital city?", zero point nine one eight. And "How many kilometers is five miles?" scores only zero point eight two five against the miles-to-kilometers prompt. Which is the same question.

B: [slowly] So the real paraphrase scores lower than the impostor.

A: Way lower. Picture a number line from zero point seven to one. The cached prompt is "convert five miles to kilometers", and the stored answer is eight point zero five kilometers. Down around zero point eight one and zero point eight three, you've got two honest paraphrases, "five miles in kilometers" and "how many kilometers is five miles". Those should hit. And way up at zero point nine eight seven, almost touching the end, "convert five kilometers to miles". Wrong answer. Must miss. Set the threshold at zero point eight, and both paraphrases hit, and so does the impostor.

B: So raise it. Zero point nine five.

A: At zero point nine five, the only one that hits is the impostor.

B: [laughs] Oh no. Raising the threshold makes it worse.

A: [amused] For this pair, yeah. Topic similarity isn't answer equivalence. Your cross-encoder exists precisely because bi-encoder similarity is a rough signal. So use semantic caching only where a near-miss answer is harmless, like an FAQ bot with fixed answers. Keep the threshold high. Scope it per user or per customer, because otherwise a near match can hand one customer's answer to another. And measure the false-hit rate on real traffic before you trust it. Exact match is boring, and correct.

B: [working it out] Let me see if I've got the whole LLM version. Cache-aside in front of the model. Hash the whole canonical request, model and revision and template and messages and every sampling knob. Check Redis, on a miss call the model, store the complete answer with a long, jittered TTL. Only for temperature zero or a seed. And keep it separate in my head from prefix caching.

A: That's it, and add two. Make it fail open, so if Redis is down you just go to the model, slower but working. And coalesce misses, so one popular prompt isn't computed fifty times at once.

<!-- section: Build It -->

A: So here's what you build. Everything goes in a new cache folder next to your inference project. First, get Redis running, on the Spark or your Mac in Docker. The official image runs on the Spark's ARM chip fine. You start it with flags that make it a pure cache. No snapshots, no append-only file, a five hundred twelve megabyte cap, and evict least recently used when it's full. Ping it, it says PONG. Set a key called hello with a ten-second expiry, then ask its TTL a few times and watch it count down from ten. Then run Redis's own benchmark tool for a hundred thousand gets and sets, write down the requests per second. And then run it again with pipelining at sixteen.

B: Pipelining being?

A: Sending sixteen commands before you wait for any of the replies. Instead of send, wait, send, wait. Compare the two numbers. The difference is the round trip. That's the real cost of a Redis call, and we'll come back to it.

A: Second, the LRU cache with a TTL, by hand. No OrderedDict, no functools. A dict and your own doubly linked list, exactly the picture from before. The part that matters is that the clock's injectable. You pass in the function the cache uses to ask what time it is, so tests can move time forward without actually sleeping. The constructor takes a capacity, a default TTL, and that clock, sets up the dict and the two sentinels linked to each other, and keeps counters for hits, misses, evictions and expirations. Then you write unlink, push to the front, get, and set. With the sentinels, unlink is two lines and push to front is four.

B: And the tests?

A: Two to start. One sets a and b in a cache of size two, gets a, so a is now most recent, then sets c. And b should be the one that got evicted, not a. The other uses a fake clock. Default TTL of five. Set a key, move the clock to four point nine, it's still there. Move it to five, it's gone, and the cache's length is zero, because expired entries actually get removed. Then you write the rest. Overwriting a key moves it to the front and doesn't grow the cache. A per-key TTL overrides the default. Storing None as a value is different from a miss, so you need a sentinel default. Capacity one works. The counters are right after a known sequence. And then the test that actually catches bugs. A randomized one. Twenty thousand random gets and sets on keys zero to nineteen, run against your cache and against a ten-line reference version built on OrderedDict, and check they agree after every single step. The most common bug is forgetting to delete from the dict when you evict or expire, and the randomized test finds it within a few hundred operations.

B: [amused] Because the dict and the list slowly stop agreeing about what's in the cache.

A: Right, and you'd never catch that with two hand-written cases. Third, Redis in front of your server. And you write the key function first. It's about ten lines, and it's where all the correctness lives. There's a version constant, v one, that you bump when the response format or the template changes. The function takes the request body and the model revision. It includes everything that changes the output, and it fills in defaults for any sampling parameter that's missing.

B: Why fill in defaults? If it's missing, it's missing.

A: Because a request that leaves out temperature and a request that says temperature, whatever the default is, are the same request. If you don't fill in the default, they get two different keys, and you miss for no reason. And it excludes things that don't change the output. Whether the client wants streaming, request IDs, the user agent. Then a second function that's your temperature policy. Start with: cacheable if temperature's zero, or a seed's given. Test it. Same request with the keys in a different order gives the same key. Change temperature, or max tokens, or one character in one message, or the revision, and the key changes. Add streaming, and it doesn't.

A: Then the proxy. It listens on port eight thousand one, forwards to your server on eight thousand, and does cache-aside. The plumbing's given to you. One piece forwards the stream from your server to the client and collects every data line as it goes by, and another replays stored lines exactly as the server sent them. The endpoint is yours. Not cacheable, just forward it, with a response header saying bypass. A hit, replay the stored lines, header says hit. A miss, stream from upstream to the client, and when the stream ends, only if you saw a finish reason and the final done marker, store the lines with your TTL. Default's three days. With jitter. And if Redis is down or slow, wrap every call in a short timeout, about fifty milliseconds, and just treat it as a miss. Serve from upstream anyway. A cache outage must not be a site outage. The one subtle bit: the store step goes at the end of a wrapper around the forwarding stream, so it only runs if the client stayed until the end. Then send the same curl twice and look at the cache header and the timing.

B: So the second curl should come back in a few milliseconds instead of a couple of seconds.

A: A few milliseconds, with the header saying hit. And you can ask Redis to list the keys starting with "L L M" and check the TTL on one, to see your three days counting down. Fourth, a Zipf workload. A small generator makes five hundred distinct prompts, things like "in two sentences, explain TCP to a new engineer", variant one, variant two, and so on, and draws a thousand requests from them at skew one, temperature zero, max tokens thirty-two. First you simulate. Feed just the sequence of prompt IDs through your LRU class at capacities ten, twenty-five, fifty, a hundred, two fifty and five hundred, and print the hit rate for each. Takes milliseconds. That's your prediction. Then you run it for real. You add an in-process tier to the proxy, so you can measure capacity in entries instead of bytes, point your harness at the proxy at concurrency four, and record each request's latency and whether it hit. Do capacity fifty and two fifty, plus a no-cache baseline on the first two hundred requests. Each miss is about two to three seconds of GPU, so a run's tens of minutes. If you want the whole curve fast, point it at the fake slow LLM from the waiting versus working build, and keep the real GPU for two points. Then one run through Redis, and ask Redis for its stats, it keeps its own hit and miss counts.

B: Anything to watch out for there?

A: Two classic harness mistakes, and it's worth having an agent review for them. One's coordinated omission. That's when you measure latency from when a request was actually sent, instead of when it was supposed to be sent. If your load generator gets stuck behind slow requests, it quietly sends fewer requests during the slow patch, and the slow patch disappears from your numbers. The other is counting the first request for each prompt as anything but a compulsory miss.

<!-- section: Build It: The stampede and the semantic cache -->

A: Fifth, cause a stampede. You use a fake upstream so you can count calls. A tiny FastAPI app that sleeps two seconds per request, bumps a counter, and reports the counter. Point the proxy at it with a TTL of five seconds. Send one request for the hot prompt to fill the cache, wait five and a half seconds so it expires, then fire two hundred identical requests all at once. Print how many calls hit the upstream during the burst. Without protection, expect about two hundred.

A: Then add coalescing to the proxy. A dict of in-flight keys, each pointing at a future. On a miss, if the key's already in there, await that future and replay its result. Otherwise, create the future, do the upstream call, store the result in Redis, set the future's result, and remove the key from the dict in a finally block, so it gets cleaned up even if the call fails. And the waiters need the whole response, not the live stream, so the simplest version buffers the first caller's stream into the future. Rerun. One upstream call. Then run the proxy with four worker processes and rerun. Guess the count first.

B: [working it out] Four workers, each with its own dict of in-flight keys... and they don't share it. So each process lets one through. Four?

A: [pleased] Four. One per process. That's the limit of the in-process fix. So then you fix it across processes with the Redis lock, set the lock key with N X and P X ten thousand. The winner computes, the others check the cache every fifty milliseconds until the value shows up, or the lock expires and they try to grab it themselves. Rerun with four workers, back to one. And with coalescing, all two hundred requests wait on that one call, so each takes about two seconds. Against your real one-at-a-time GPU server without coalescing, the last of them would wait two hundred times two seconds. Four hundred seconds.

A: And last, a semantic cache that gets something wrong. Install sentence transformers, use a small embedding model, the Mini L M one or your own bi-encoder from work. The simplest possible semantic cache is a list of entries, each one a normalized embedding, the prompt, and the answer. Lookup embeds the new prompt, scores it against every stored one, and returns the best answer if it's over the threshold. Then you build about thirty test pairs, half of each kind. Paraphrases that should hit. And traps that must not. Swap one entity, like Austria and Australia, or Java the island and Java the language. Flip a negation, safe and not safe. Swap units or direction. Change a number. For thresholds zero point eight, zero point eight five, zero point nine and zero point nine five, you report what fraction of paraphrases hit and what fraction of traps hit. And you're hunting for one trap that hits at a threshold where most paraphrases still miss. An agent can explain the library or the cosine math, but the test set and the conclusions are yours.

B: And when do I know I'm done?

A: The tests pass, including the randomized one. A repeated temperature-zero request through the proxy comes back as a hit in a few milliseconds, and changing temperature, max tokens or the model revision makes it miss. You stop Redis, and the proxy gets slower, not broken. Your simulated and measured hit rates agree within a couple of points. The stampede goes from about two hundred calls, to one in one process, to one with the lock across four workers. And you've got a trap pair, with its score, that returns a wrong answer.

<!-- section: Measure -->

A: So what should the numbers look like. Redis first. Without pipelining, expect somewhere from tens of thousands to a couple hundred thousand requests a second. With pipelining at sixteen, several times more. And one get from Python, timed around the await, should be on the order of a tenth to three tenths of a millisecond.

B: Why does pipelining help that much, if each command's already only microseconds?

A: Because the microseconds aren't the cost. The trip is. Without pipelining, one connection sends a command and then sits there for the whole round trip before it can send the next. So that connection can only feed Redis as fast as round trips allow. Redis could do far more per second than one connection can hand it, one at a time. Pipelining fills that waiting time with more commands. It's the latency versus bandwidth thing again. How long one trip takes, versus how much you can push through.

A: Then hit rate versus cache size. Five hundred prompts, a thousand requests, skew one. There's an ideal column you can compare against, the share of traffic the top K prompts get. Top ten prompts, about forty-three percent of requests. Top fifty, sixty-six percent. Top two fifty, ninety percent. A simulation of this exact setup but with two thousand requests gave LRU hit rates of about twenty-four percent at ten slots, fifty-two percent at fifty, and seventy-eight at two fifty. Yours with a thousand requests will be a bit lower, because the compulsory misses are a bigger share of a shorter run.

B: And at five hundred, where the cache fits everything, it should be a hundred percent?

A: Ideal says a hundred. LRU at five hundred came out at eighty-one percent. And it's not LRU's fault. Even a cache big enough for every prompt can't beat one minus the number of distinct prompts that showed up, divided by the number of requests. In that two-thousand-request run, three hundred seventy-three distinct prompts appeared. Each one's first request is a guaranteed miss. Three seventy-three out of two thousand is about nineteen percent, so the ceiling's eighty-one. And your measured hit rate through the proxy should match your simulation within a couple of points. At concurrency four the order of arrivals shifts slightly, so not exact. If it's way off, your key function's wrong. Two requests that should share a key don't.

A: Latency. What you should see is the p fifty collapse to milliseconds once the hit rate passes fifty percent, and the p ninety-nine stay at miss latency, just like that prediction said. The mean should roughly match the formula. But here's the thing to check. The misses with the cache on are faster than without it.

B: [skeptical] How? A miss is a miss. It still has to go to the GPU.

A: It does. But at concurrency four, behind that one-at-a-time GPU lock, a miss also waits behind other misses. With half the requests answered from cache, there's just less in that line. So caching helps the misses indirectly, by taking load off the bottleneck. And the Redis hit p fifty should be a millisecond or two higher than the local LRU's. That's the network round trip plus the Python client. And it's almost always worth it, for a cache that every replica shares.

A: The stampede. On a Mac, a stripped-down version, a thousand concurrent asyncio tasks against a two hundred millisecond fake backend, gave a thousand backend calls without coalescing, and exactly one with it. And the same wall time for both. Because that fake backend had unlimited parallelism, it didn't care. Your fake upstream doesn't make requests take turns either, so the latency difference will be small. The call count is the point. Against the real GPU server, which runs one at a time, those two hundred calls would mean the last request waits about two hundred times two seconds. Nearly seven minutes. For an answer that was ready after two seconds.

A: And the semantic cache. You should find that both columns fall together as the threshold rises. And some trap pairs score higher than some paraphrase pairs. When that happens, no threshold separates them. And that's the finding. Similarity measures topic, not whether the answer's the same.

<!-- section: Break It -->

A: Now break it, four ways. First, drop a field from the key. Take max tokens out of your key function. Send a prompt with max tokens eight, then the same prompt with max tokens two fifty-six.

B: And the second person gets eight tokens. In a millisecond.

A: From cache, in a millisecond, cut off. Then make the key ignore the model revision, run a few eval prompts, restart the server with any other small instruct model, and run them again. Every answer comes back from the old model, and the scores don't move. Which is the opening bug, on purpose. This is the most common cache bug in ML infrastructure, and the fix is the version-in-the-key discipline. Not a better TTL.

A: Second, make every key expire at once. Warm the cache with two hundred prompts in one burst, a fixed TTL of sixty seconds, no jitter, then send steady traffic over those prompts. At the sixty-second mark the hit rate falls off a cliff, and the upstream sees a wall of misses. Now add plus or minus ten percent jitter.

B: [working it out] Ten percent of sixty is six, so they expire anywhere from fifty-four to sixty-six. Spread over twelve seconds instead of one instant.

A: Twelve seconds. Same misses, just not all at once. Third, fill Redis with no eviction on. Restart it with a max memory of two megabytes and the policy set to no eviction, and run the workload. Writes start failing with an out-of-memory error, command not allowed. And the question is, does your proxy still serve the request? It should. A failed cache write isn't a failed request. Or does it return a five hundred? Then switch the policy to all keys LRU and watch the evicted keys count climb in Redis's stats instead.

A: Fourth, and this one's my favorite. A cyclic workload. Prompts one, two, three, up to sixty, then one, two, three, up to sixty again, over and over. Local LRU with a capacity of fifty. What's the hit rate?

B: Fifty out of sixty fit... so, I don't know, something like eighty percent?

A: [flatly] Zero. Not low. Zero.

B: [surprised] How is it zero?

A: [working it out] Walk it. After the first sixty, the cache holds prompts eleven through sixty, the fifty most recent. Next request is prompt one. Not there, it was evicted. Miss. Store it, evict the oldest, which is eleven. Next request's two, also gone, miss, evict twelve. And by the time you get to eleven, it was just thrown out to make room for one. Every prompt gets evicted just before it comes back. The fifty most recently used are always exactly the fifty you won't need next. Bump the capacity to sixty and it jumps to nearly a hundred percent. It's the same failure the prefix cache had with round-robin system prompts. And it's why databases, and LFU or ARC style caches, treat one-time scans specially.

<!-- section: Explain It Back: Scaling out -->

B: Okay, so all of this was one server. What happens at work, when it's fifty replicas and ten thousand requests a second?

A: Then a cache in each process means fifty separate copies, and each one only sees a fiftieth of the traffic, so it gets a fiftieth of the reuse. You want a shared tier. Redis, or Redis Cluster, which splits keys across nodes using sixteen thousand three hundred eighty-four hash slots, so capacity and throughput grow as you add nodes. Then do the numbers. Ten thousand requests a second is fine for a small Redis cluster, because one node does on the order of a hundred thousand simple operations a second. Memory: if responses average two kilobytes and you want to keep ten million of them, that's twenty gigabytes plus overhead. A few nodes.

B: So it just... scales out.

A: Mostly. Watch for hot keys. One popular prompt maps to one node, and a single key can saturate that node. The fix is a two-tier cache. A small in-process cache on each replica, with a short TTL, sitting in front of Redis, so the hottest stuff never leaves the process. Coalescing has to work across machines, so the Redis lock, or one expiring hot key sends fifty copies to the GPUs. Make the whole thing fail open with tight timeouts, because a Redis outage has to mean slower, not down. And route similar prompts to the same replicas anyway, so the prefix cache inside the GPU gets its hits too.

A: If you read two things after this, read "Scaling Memcache at Facebook", which is every problem we just talked about at enormous scale, leases and stampedes and hot keys, and the ARC paper. And Go's singleflight is about a hundred lines, worth reading the source. It connects to a lot, too. Redis's one thread is the event loop you already built, and a slow Redis command is the blocking call in an async def all over again. The prefix cache sits right behind this one, and both live or die by their key. And a stampede is really a flood you caused yourself, which is why it pairs with rate limits.

<!-- section: Closing -->

B: [relaxed, thinking out loud] Okay, let me try the whole thing. A cache is a bet that requests repeat, and it pays off because popularity's lopsided. The math says think in misses, and it fixes the typical request but not the slowest ones. And the way to keep it correct is to pick a good TTL, so the answers don't get too stale.

A: [gently] Most of that, yes. But flip the last part. For your cache the TTL isn't what keeps it correct. The key is. If everything that can change the answer is in the key, the model, the revision, the template, every sampling knob, then a stale answer can't even be looked up, because a changed request asks for a different key. The TTL's just there to clean up and to bound how long a mistake can live. Make it fast, that's the easy half. Make the key right, and make sure losing the whole thing only costs you time. That's the hard half.
