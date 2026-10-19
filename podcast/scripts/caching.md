<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say your eval harness runs a few hundred prompts through the server on the Spark every time someone touches the ranking code. Temperature zero, same model, same prompts. And every single run, the GPU spends about forty minutes working out answers it already gave yesterday. Word for word.

B: That's painful.

A: So you do the obvious thing. You put a dictionary in front of it. The key is the prompt, the value is the answer. And the second run takes a few seconds. And you feel like a genius for about a week.

B: [amused] About a week.

A: About a week. Then the bugs show up, one at a time. You swap in a fine-tuned checkpoint, and the eval scores don't move at all. Not even a little.

B: Oh no. Because it's still serving the old answers.

A: Because the model wasn't part of the key. So you fix that. And then a teammate runs a sampling experiment at a higher temperature, and gets exactly one answer per prompt, no matter how many times it runs. Temperature wasn't in the key either. Then you move the whole thing into Redis so all your server copies can share it, set everything to expire after an hour, and every morning, exactly an hour after the warm-up job runs, the GPU queue suddenly fills up with hundreds of requests for the same handful of prompts.

B: Huh. That last one I can't explain.

A: You will. And every one of these is a classic, with a name and a known fix. A cache is the cheapest speedup there is. It's also the most reliable way to hand someone a wrong answer with total confidence.

<!-- section: The oldest trick -->

A: And it's an old idea. In nineteen sixty-five, Maurice Wilkes writes this two-page paper suggesting a small, fast memory that automatically keeps copies of whatever the processor used recently from the big slow one. IBM ships it a few years later and calls it a cache. Every CPU since has one.

B: And then everybody copied it.

A: Every time something got slow. In the early two thousands, a blogging site called LiveJournal was drowning its databases in the same reads over and over. So one of its engineers wrote memcached. Basically a giant hash table in memory, spread over spare machines, that any web server could ask before bothering the database. Then a few years later, someone building an analytics product that was too slow on MySQL wrote Redis. Same idea, but it can hold lists and sets and other structures, not just strings.

B: There's that line about it, right? Two hard things in computer science.

A: Cache invalidation and naming things. Usually credited to Phil Karlton at Netscape. And it's true. Making a cache fast is easy. Knowing when its answers stop being true is the hard part.

<!-- section: A bet on repeats -->

A: So the way I think about it, a cache is a bet. A bet that you'll ask for the same thing again. When you win, that's a hit, and you skip the slow work completely. When you lose, that's a miss. You do the slow work, and you were a tiny bit slower because you checked the cache first.

B: And the reason it's a good bet is that people repeat themselves.

A: That's part of it. Something asked a second ago is a lot more likely to come up again than something from last month. But the bigger reason is popularity. If you rank every distinct request by how often it's asked, real traffic is wildly lopsided. Web pages, search queries, songs, prompts. A few things get asked constantly, and there's a long tail of stuff that's asked once.

B: So a small cache can hold the popular stuff.

A: And answer a surprisingly big share of requests. When I simulated it, a cache holding about a tenth of the items answered roughly two thirds of the requests. But then I flattened the popularity, so everything was equally likely, and a cache holding a tenth of the items answered a tenth of the requests. Basically pointless.

B: [working it out] So it's not about how good the cache is. It's about whether your traffic repeats.

A: Right. The workload decides whether a cache helps, not the cache. Before you build one, go look at how often your requests actually repeat.

<!-- section: Think in misses -->

B: Okay, so say it's working. Ninety percent of requests hit. Somebody asks you to push it to ninety-nine. That's a small tweak, right? Nine more points.

A: That's the trap. It's about ten times faster.

B: [skeptical] Ten times. From nine points.

A: Think about where the time goes. A hit through Redis is about a millisecond. A miss on your server is a couple of seconds of GPU. So the misses completely dominate. The average is basically just how many misses you have, times how slow a miss is. At ninety percent hits, one in ten requests is slow. At ninety-nine, one in a hundred. Ten times fewer slow requests. So think in miss rate, not hit rate.

B: Oh. Yeah, okay. That flips it.

A: And there's a second thing that falls out of that. Line up all your requests from fastest to slowest. If most of them hit, the typical request, the one in the middle, is a hit. It's gone from seconds to a millisecond. Magic. But the slowest ones, the ones at the very end of the line, are still misses. They're just as slow as before.

B: So the cache doesn't help the tail at all.

A: Not directly. It makes the typical request magical and leaves the worst ones just as bad. There's one indirect win, though, and it shows up when you measure. On your server, the GPU does one request at a time. So every hit is a request that isn't standing in that line. The misses that are left wait behind fewer other misses. They actually got faster, just because the queue got shorter.

<!-- section: What's in the key -->

A: Okay, so back to the first bugs. The question that decides whether a cache is correct is, what's the key? What exactly has to match for a stored answer to count as the answer to this request?

B: I mean, for a model it's the prompt.

A: That's what the dictionary did, and that's what broke. It's not the prompt. It's everything that can change the output. Which model, and which version of its weights. The prompt template and any system prompt your server adds. All the messages. And every sampling setting. Temperature, how many tokens, stop words, the seed. Every field you leave out is one of those bugs.

B: Like how many tokens. If someone asks for a short answer, the next person gets the short one too.

A: Right. Someone asks for a few words, and the next person who wanted a whole essay gets those few words back, from cache, in a millisecond. And leave out the model version, and you evaluate the old model forever.

B: [working it out] Okay, but even if temperature's in the key, the sampling thing is still weird. If someone asks the same prompt five times at a high temperature, the key's the same every time.

A: So they get the same answer five times. The first sample, stored and replayed. And that's the subtle bit. At temperature zero, you're asking for the most likely answer, and replaying it is completely correct. But at a high temperature, you're asking for a sample, a random draw. A cache turns that whole spread of possible answers into a single point. Anything that relies on getting different samples, like voting across several answers, or brainstorming, just silently breaks.

B: So, what, don't cache those?

A: Usually, only cache when temperature is zero, or when a seed is set, because then you really are asking for one specific answer. Whatever you pick, pick it on purpose.

B: And when you change the model, do you go and delete all the old answers?

A: You don't have to. This is my favorite trick. Put the version right in the key. When the model or the template changes, bump the version. Every key changes. The old answers are just never asked for again, and they age out on their own. You spend a bit of memory, and you never have to find and delete anything.

<!-- section: How long to trust it -->

B: So where does the hour-long expiry fit in?

A: That's called a TTL, time to live. How long you're allowed to serve a copy before it counts as gone. And picking one is really a business question wearing a technical costume. How wrong can this answer be, and for how long, before someone gets hurt? A stock price, seconds. A product description, maybe an hour.

B: And for model answers?

A: For model answers, the answer never changes unless you change the model or the template. And that's already in the key. So the TTL can be long. Days. It's just there to clean up things nobody asks for anymore. The key is what keeps it correct, not the clock.

B: [skeptical] Couldn't you just delete the cache entry whenever the real data changes, though? For normal data, I mean. Then you'd never need a timer.

A: That's called invalidation, and it sounds airtight. Write the new value to the database, then delete the copy. Next read misses, fetches the fresh one. But picture this. One request misses, and goes to read the database. It gets the old value. Then it stalls for a moment, some pause, whatever. Meanwhile another request writes the new value and deletes the copy, which wasn't even there yet. Then the first request wakes up and stores the old value in the cache.

B: Oh. And nobody's ever going to delete it again.

A: Because the delete already happened. It's wrong until something else removes it. Which is why people say, always set a TTL, even if you invalidate. The timer puts a limit on how long any bug in your invalidation can last.

<!-- section: The stampede -->

A: Okay. The morning spike.

B: Yes. Explain the spike.

A: So, a hot key. Say it's the prompt your whole team's dashboard sends, read hundreds of times a second. All hits. Then its TTL runs out. And for the next couple of seconds, while the first miss is being worked out on the GPU, every request for that key misses too. Because the answer isn't back yet. And every one of them sends its own copy of the exact same request to the model.

B: [working it out] And they all warmed up at nine, so they all expire at ten.

A: That's the morning spike. That's called a cache stampede. And on your server it's worse than on a normal website, because the GPU does one request at a time. When I worked it out with a couple hundred identical misses, the last one would wait for all of them to run, minutes, for an answer that was ready after the first couple of seconds.

B: So how do you stop it?

A: The cleanest fix is called request coalescing. When a miss comes in, check whether someone's already working on this exact key. If they are, don't start another one. Just wait for theirs, and share the answer. When I tried it, a whole pile of identical requests turned into exactly one call.

B: [jumping in] But that only works inside one process, right? If you've got several server processes, each one has its own list.

A: Right. Four processes, four calls. So across processes, you put a little lock in Redis itself. First miss grabs the lock and does the work, everyone else waits and checks the cache again. And the lock expires on its own, so if the one holding it crashes, it can't block everyone forever. And then the simplest fix of all is to not expire everything at once. Add a bit of randomness to each TTL, so things you stored together don't all expire together.

<!-- section: Redis, briefly -->

B: What makes Redis the thing everyone uses for this?

A: A few things. It keeps everything in memory, so each command is tiny. And it runs commands one at a time, on one thread. Which sounds like a weakness, but it means every command happens all at once. Two clients bumping the same counter can't step on each other, because nothing runs at the same time.

B: But one slow command holds everyone up.

A: One slow command blocks every other client. Same mistake as a blocking call inside async code. It's fast because each command is tiny, not because it does lots at once. And the rule I'd keep about it is, a cache has to be safe to lose. If deleting your Redis loses something that exists nowhere else, it's not a cache anymore. It's a database, and you should treat it like one.

B: And when it fills up?

A: Something has to leave. The usual rule is throw out whatever was used longest ago. That's called LRU, least recently used. It's a good default, and it has one funny failure I hit on purpose. I sent prompts in a loop, just slightly more prompts than the cache could hold. And the hit rate was zero. Not low. Zero.

B: [laughs] Why zero?

A: Because each prompt got thrown out just before it came back around. The ones it had kept were always exactly the ones it wouldn't need next. Make the cache a little bigger than the loop, and it jumps to almost every request hitting.

<!-- section: Matching by meaning -->

B: Okay, what about the fancier kind? Where it matches by meaning, so "what's the capital of France" and "France's capital city" count as the same?

A: That's a semantic cache. You turn each prompt into an embedding, the same kind of vector your bi-encoder makes, find the closest stored prompt, and if it's close enough, return that answer.

B: That sounds strictly better.

A: That's what I wanted to believe. So I checked a few pairs with a popular small embedding model. "Convert five miles to kilometers" and "convert five kilometers to miles". Opposite questions, different answers. And they scored closer together than two honest paraphrases of the same question.

B: [skeptical] Wait, really? Closer?

A: Closer. Same with "is this drug safe during pregnancy" and "is this drug unsafe during pregnancy". Almost identical scores. Because the model's trained to put texts about the same topic close together. And those are about the same topic. They just have opposite answers.

B: Oh. That's literally why the cross-encoder exists.

A: That's why your cross-encoder exists. Similarity from a bi-encoder is a rough signal about topic. It's not a check that two questions have the same answer. So any threshold loose enough to catch the paraphrases also lets the impostor through. Use it only where a near-miss answer is harmless, keep it per customer so one customer can't get another's answer, and measure how often it's wrong before you trust it.

<!-- section: Ending -->

B: Okay, let me try. A cache is a fast copy of answers. It works because a few requests make up most of the traffic, and how fast it is depends on the misses, not the hits. And the hard part is the TTL, deciding how long a copy is good for.

A: Nearly. The one thing I'd move is where the hard part lives. For model answers, the clock is just the backstop. The thing that actually keeps it correct is the key. If everything that can change the answer is in the key, a stale answer can't be served, because nobody will ever ask for the old key again. Every bug from that first week was a field missing from the key.
