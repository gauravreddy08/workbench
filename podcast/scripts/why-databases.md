<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you're writing a crawler cache for work. Before the crawler fetches a URL, it checks, did I fetch this recently? And after it fetches, it writes down the status code, a hash of the content, and a timestamp. You need it by Friday. So it's a dict. And the dict lives in a file called cache dot JSON. Three lines. Load the file into a dict, set one entry, dump the whole dict back out to the file.

B: [laughs] Honestly that's what I'd write.

A: [amused] It's what everyone writes. And it works. Then it gets used. At five thousand URLs nobody notices anything. At two hundred thousand URLs, the file's thirty megabytes, and every single update rewrites all thirty megabytes. So the crawler's spending more time saving its cache than fetching pages. Then somebody runs it with eight worker processes to go faster, and entries start, like, silently disappearing. Two workers each loaded the file, each added one URL, and whoever saved second erased the other one's work. Then a worker gets killed by the out-of-memory killer while it's saving, and the next run dies on a JSON decode error. "Unterminated string." Because opening the file for writing cut it to nothing, and only half of the new one got written. And then someone asks, how many URLs returned four twenty-nine yesterday? And the only way to answer that is load all thirty megabytes and loop.

B: [a bit unsure] Okay, but each of those sounds fixable on its own. Like, write to a temp file and rename it, and you're done?

A: That fixes one of them. And that's kind of the point. None of this is a bug in your code exactly. It's four separate problems that every program that stores data eventually hits. One, cost grows with size. Changing one record costs as much as writing all of them. Two, crashes. A save that dies halfway can destroy the old data and the new data together. Three, concurrency. Two writers who each read, change, and write the whole file lose updates. And four, finding things. There's no structure on disk, so every question is a full scan.

B: And a database fixes all four.

A: A database is basically the pile of answers people found to those four problems. And the plan is to build a small one from scratch. So that when you reach for S Q Lite or Postgres, you actually know what you're buying.

<!-- section: Origin -->

A: And the shape every database has today comes from an argument in nineteen seventy. Back up to the sixties. A "database" then meant something like IBM's I M S, which was built for the Apollo program's parts lists. Data was stored as trees, or networks, of records linked by pointers. And programs walked them by hand. Start at this customer record, follow the pointer to their first order, follow the next-order pointer, and so on. So the program knew the physical layout. Which means if you changed the layout, added an index, reorganized the file to make it faster... every program that touched it had to be rewritten.

B: [amused] Oof. So every schema change is a rewrite of the whole company.

A: Pretty much. And then Edgar Codd, a mathematician at IBM's San Jose lab, published a paper in June nineteen seventy. "A Relational Model of Data for Large Shared Data Banks." His argument was, users should describe what data they want, as relations, which is what we now call tables, and operations on them. And the system should work out how to get it. He called the goal data independence. The storage underneath could change without breaking a single query.

B: And IBM was thrilled.

A: [laughs] IBM was slow. I M S made a lot of money. But its System R project built a prototype, and a language for it, called SEQUEL, later SQL, in the mid seventies. Berkeley's Ingres followed. And a small company called Relational Software, which later became Oracle, shipped the first commercial SQL database in nineteen seventy-nine. Codd won the Turing Award in nineteen eighty-one. And that split, a query layer on top that says what, and a storage engine underneath that decides how, is still the shape of every database. Most of this episode is about the bottom half.

<!-- section: Failure one: every write rewrites everything -->

A: So, failure one. JSON is a serialization format. Meaning, it's a way of turning in-memory objects into a flat run of bytes, and back, so you can save them or send them over a network. It's not a storage format. There's no way in JSON to say "change the value at byte four thousand eight hundred and twelve".

B: But can't you just, I don't know, seek to that spot in the file and overwrite it?

A: [patiently] Only if the new value is exactly the same length as the old one. Change a status from two hundred to four twenty-nine, fine, same width. Change a hash, or add a key, and everything after it has to shift over. The bytes after any change move. So the only safe way to update one key is to write the whole file again. And that makes a single put cost what people call order N. N is the number of records, and order N means the cost grows in proportion to it. Twice the data, twice the time, for the exact same one-record change.

B: How bad is it in actual numbers?

A: So this was measured on an M four Pro MacBook, Python three point fourteen. A dict of N keys, each value a hundred bytes, saved with the safe temp-file-and-rename recipe after every single put. A hundred keys, the file's about twenty kilobytes, and one put takes about a fifth of a millisecond. A thousand keys, about half a millisecond. Ten thousand keys, the file's a bit over a megabyte, about four milliseconds. A hundred thousand keys, twelve megabytes, forty-three milliseconds. Every time the data goes up ten times, the time goes up about ten times.

B: [working it out] Forty-three milliseconds a put... so that's, what, twenty-something writes a second?

A: About twenty-three. That's the ceiling for the whole store. And just to set that next to something: the append-only log you're about to build stays at about four microseconds a put, at every one of those sizes. So at a hundred thousand keys, it's roughly ten thousand times faster.

B: Was the F sync the slow part? Forcing it to disk?

A: [interested] That was the surprising bit, actually. F sync, quick reminder, is the call that doesn't return until your data's really on the drive, not just sitting in the kernel's memory. And at large N it made no visible difference. Serializing the dict and copying twelve megabytes into the kernel's page cache, that's the kernel's in-memory copy of the file, completely dwarfs one F sync on a Mac. And you can see it coming with back-of-the-envelope math. Python's JSON dump writes something like a few hundred megabytes a second. Twelve megabytes at that rate is tens of milliseconds. So at a million keys you'd extrapolate to around half a second per put. Your crawler would be doing two saves a second. And nothing else.

<!-- section: Failure two: a crash in the middle -->

A: Failure two you already know from the checkpoint lesson. Opening the file for writing truncates it. Truncate meaning it cuts the file to zero bytes right away, before anything new is written. So a crash anywhere during the dump leaves you with neither the old cache nor the new one. And the fix is the one from that lesson: write to a temp file, F sync it, then rename it over the real one. Rename is atomic, it swaps the name in one step, so anyone opening the file sees either the whole old version or the whole new one. But now every save is a full copy plus an F sync. So you can make a JSON file crash-safe. You just can't make it crash-safe and cheap to update.

<!-- section: Failure three: two writers -->

A: Failure three. Two crawler workers, call them A and B. Each one does the natural thing. Read the whole file, add one key, write the whole file.

B: [skeptical] But if they're both using the temp-file-and-rename trick, the rename's atomic. So nothing gets corrupted.

A: [wry] Right, nothing gets corrupted. And that's what makes it nasty. Walk it on a timeline. Worker A reads the file. It's got one key in it, call it x. A adds its key, a, in its own memory. Now it has x and a. Meanwhile, before A has saved, worker B reads the file too. B also sees just x. B adds b in its memory, so it has x and b. A saves. The file is now x and a. Then B saves. The file is now x and b. And a is gone. No error. Nothing malformed. The rename guaranteed each save was whole. It never promised the save included the other worker's change.

B: Huh. So the atomic part is true, it's just... about the wrong thing.

A: Exactly the wrong thing. And it has a name. It's a lost update. Two writers each read a value, change their own copy, and write it back, and the second write silently wipes out the first. It's the same race as the counter plus-equals-one thing from the threads lesson, where two threads read the same number, both add one, and you go up by one instead of two. Just with a file instead of an integer, and processes instead of threads.

B: And the fix there was a lock. So put a lock on the file.

A: [dry] You can. There's a call for it, F lock. But think about what you get. Now only one worker can do anything at a time. And each turn holding the lock costs a full rewrite. So eight workers queue up behind a forty-three millisecond save. You've built a very elaborate way to have one worker.

A: Okay, try this one. Two processes each add two thousand different keys to the same JSON file, as fast as they can. Each one reloads the file before every put, and saves with its own temp file and an atomic rename. How many of the four thousand keys survive?

B: [working it out] Hmm. They'd only collide when their timing overlaps... so maybe you lose a few hundred?

A: [matter-of-fact] On the Mac, two thousand and fifteen survived. Almost exactly half.

B: [surprised] Half? Seriously?

A: Half. Because they ran at about the same speed, most of the time each one was loading a file the other was just about to overwrite. And there were no errors, no corrupt JSON, the rename made every save whole. Just half the data, gone. And then the same two processes against S Q Lite, same loop: four thousand out of four thousand. You'll reproduce both of those.

<!-- section: Failure four: finding one record -->

A: Failure four. To read one key from the JSON file, you parse all of it. A hundred thousand keys took about twenty-one milliseconds to load. And a dict lookup after that is well under a microsecond. So loading is more than twenty thousand times slower than the lookup.

B: So load it once at startup and keep the dict in memory. Problem solved.

A: [gently] Fine, if you're the only one using it. But the moment anyone else writes the file, your copy in memory is stale, and you're right back in failure three. And a question like "every URL that returned four twenty-nine since yesterday" is a loop over everything, every time. Because nothing on disk is organized by status, or by time.

<!-- section: What a storage engine is -->

A: So now pull those four problems apart, and a pattern shows up. One, two, and four are about how the bytes are laid out on disk. Can you change one record without touching the others? Can you tell a half-written record from a whole one? Can you find a record without reading everything? Problem three, and the asking-questions part of four, live one layer up.

A: And that bottom layer has a name. It's the storage engine. The part of a database that stores records on disk and gets them back. Its job is a small handful of operations. Put a key and a value. Get the value for a key, or nothing. Delete a key. And, in some engines, scan a range: give me every record between this key and that key, in order. And it decides what the bytes on disk actually look like.

B: That sounds almost too small to be the core of a database.

A: It is small. But everything sits on top of it. A table in S Q Lite is one of these structures, keyed by row I D. An index on a column is another one, keyed by that column. My S Q L even lets you swap the engine underneath the same SQL. Inno D B, My I S A M, others. So, let's build one.

<!-- section: The simplest engine: just append -->

A: [relaxed] The cheapest thing you can possibly do to a file is add to the end of it. No bytes move. Nothing old gets rewritten. And sequential writes are exactly what disks and the page cache are best at, which the files lesson measured. So here's the rule. Never update in place. To put a key, append a record, key and value, to the end of the file. To change it, append another record. The newest record for a key wins. And a file you only ever add to the end of, where each entry records one change in the order it happened, is called an append-only log.

B: Okay, writes are cheap. But reads must be awful. To find a key you'd have to read the whole thing.

A: Awful. You scan the whole log and keep the last match you find. That's worse than JSON. So, the fix for reads. You keep, in RAM, a dict from every key to where its newest record starts in the file. Where meaning a byte offset. An offset is just a position in the file, counted in bytes from the start. Offset four thousand eight hundred and twelve is the four thousand eight hundred and thirteenth byte. And that dict is called a hash index. It's a hash table in memory, a Python dict basically, mapping each key to the spot on disk where its value lives. One lookup, no scanning.

A: So now put is: append the record, then set that key's entry in the index to the offset. Get is: look the key up in the index, then read that one record from the file. One hash lookup, one small read. And delete... you can't erase anything from an append-only log. So you append a special record called a tombstone, which just means "this key was deleted", and you remove the key from the index.

B: Wait, why write the tombstone at all? You already removed it from the index. Isn't that enough?

A: [patiently] For right now, sure. But the old values are still sitting in the log. And as you'll see in a minute, the index is something you rebuild by replaying the log. So if you replay without a tombstone, you hit the old record for that key and, well, it comes right back to life. The tombstone is what tells the replay "no, this one's dead". And those old records, the overwritten ones? They're still in the file, and nothing points at them anymore. They're garbage. We'll deal with them.

<!-- section: Origin: Bitcask -->

A: And this exact design shipped. In two thousand and ten. A company called Basho was building Riak, a distributed key-value database modelled on Amazon's Dynamo paper. Every Riak machine needed its own local storage engine. And the options in two thousand nine were either slow, or complicated, or hard to recover after a crash. So two of their engineers, Justin Sheehy and David Smith, wrote down what they needed. Low latency on every read and write. High write throughput. Crash friendliness. Easy backups. And code simple enough to actually reason about. And they found the simplest possible design met nearly all of it.

B: The log and the dict.

A: The log and the dict. Their paper's called "Bitcask: A Log-Structured Hash Table for Fast Key Value Data", and it's short. Data files you only append to. An in-memory hash table they called the keydir. And a background merge to clean up the garbage. It became Riak's default backend. And the idea goes back further, to log-structured file systems, Rosenblum and Ousterhout, nineteen ninety-one, which made the same bet. Turn every write into a sequential append.

<!-- section: The interactive log figure -->

A: There's an interactive picture of this that's worth walking through. On the left, the index in RAM: a little table, each key pointing at a segment and a byte offset. On the right, the log on disk, split into a few files called segments, and only the last one is being appended to. You pick a key, a, b, c or d, and press put, get, delete, compact, crash, or replay. There's a switch called "tear the last write". And underneath, three numbers: how big the log is, how much of it is live, and what percent is garbage.

A: So you put a, put b, put a again. Two new records for a show up on the right, and the old one gets crossed out, because nothing points at it anymore. Garbage ticks up. Delete b, and a tombstone gets appended. Even the delete is an append. Then hit crash. The whole left side, the index, goes blank. The right side doesn't change at all.

B: [a bit unsure] Okay, so that's the scary part. You crashed and you lost the index. So you lost all your data.

A: That's the natural read of it, but no. Hit replay. It reads every record in the log, from the first to the last, in order, and fills the index back in. Same answer as before. Because the index is just a cache of the log. It holds nothing the log doesn't. So losing it in a crash costs you time, the time to replay. Not data.

B: Oh. So the log is the real thing and the dict is just... a shortcut into it.

A: Right. The log is the truth. And then flip on "tear the last write" and crash again. Now the last record is only half there. Replay stops right at it, and cuts the file off at that point. We'll get to how it knows.

A: Three things to notice from playing with it. Every operation that changes something is an append. Put, delete, the tombstone. The only time old bytes get touched at all is compaction, and even compaction writes brand-new files instead of editing old ones. Second, the index is a cache of the log, which you just saw. And third, garbage grows with overwrites, not with keys. Put a fifty times, and the log holds fifty records for a, and one of them is live.

<!-- section: Records that can prove they're whole -->

A: So what does "the log survives a crash" actually mean? Go back to the layers from the files lesson. When your process calls write, the bytes go into the kernel's page cache, and write returns. Much later, the kernel writes them out to the SSD. And there are two very different kinds of crash. If your process dies, kill dash nine, the out-of-memory killer, a segfault, anything already handed to write is safe in the page cache. It belongs to the kernel now, and the kernel finishes writing it. What you lose is whatever was still inside your process. Your Python-side buffer, and the index in memory.

A: But if the machine dies, a power cut, a kernel panic, then anything that hasn't been F synced may be lost. And it may be lost partially. Say the first two kilobytes of a record made it to flash and the last two kilobytes didn't. That's called a torn write. A record with its beginning on disk and its end missing, or garbage.

B: So the log can end in a half-record. How would you even know? It's just bytes.

A: You make every record carry proof that it's whole. Each record starts with its own length, and a checksum. A checksum is a small number computed from a block of bytes, built so that changing any byte almost certainly changes the number. You store it with the data. When you read it back, you compute it again, and if the two don't match, the data's damaged. The specific one here is called C R C thirty-two. Cyclic redundancy check, thirty-two bits. It's fast, and it's built to catch accidental damage, flipped bits, chopped-off endings. It is not cryptographic, though. It won't stop someone deliberately forging data. Python has it built in, in the zlib module.

A: So picture one record laid out as a row of boxes. The first twelve bytes are a header: four bytes of C R C, then four bytes for the key's length, then four bytes for the value's length. Then the key itself, then the value. A tombstone just has no value. And the C R C covers everything after it: both lengths, the key, and the value. Now picture a log after a power cut. a equals v one, checksum fine. b equals v one, fine. a equals v two, fine. Then c equals v one... and it stops partway. That's where you cut. And there are two ways recovery spots it. The header says a hundred and twelve bytes follow, and the file only has forty left. Or all the bytes are there, but the checksum doesn't match.

A: So recovery's a loop. Read twelve bytes. If there aren't twelve, stop. Pull out the C R C and the two lengths. If the file doesn't have that many more bytes, stop. Recompute the checksum over the lengths, the key and the value. If it doesn't match, stop. Otherwise, apply the record to the index, either point the key at this offset, or if it's a tombstone, delete the key. And go around again. Wherever you stopped, truncate the file right there, so the next append starts on a clean boundary.

B: Why stop at the first bad one, though? Why not skip it and keep reading? You'd save more.

A: Because records were appended in order. So everything after a torn record was written after the moment of the crash, and can't be trusted either. There's a real downside, to be fair. If some bug silently corrupted a record in the middle of a big log, this rule would throw away everything after it. Real systems are more careful there. They tell apart "the tail got torn" from "something in the middle is corrupted", and they'll refuse to start on the second one rather than quietly drop data. But the tail rule is the core.

A: Here's one to guess. Your store does one write call per record, about four kilobytes, then a flush. A writer process puts records in a tight loop, and you kill dash nine it at some random moment. How often does recovery find a torn record at the end?

B: [working it out] I mean... records are four kilobytes, it's writing nonstop, so a random kill should land mid-record pretty often? Like, most of the time?

A: [amused] Essentially never. It was done three times, with logs of two hundred sixty-six megabytes, three hundred sixty-two, and six hundred twenty-eight. Zero torn bytes, every time.

B: [surprised] Zero? How?

A: Each record went to the kernel in one write call. And from your process's point of view, kill dash nine can only land between system calls. Not halfway through the kernel copying your buffer. And once the bytes are in the page cache, they're the kernel's, and the kernel writes them out whether your process is alive or not.

B: [skeptical] Then why bother with the checksum?

A: Three reasons. A power cut or kernel panic can tear, because then the page cache itself is gone, and the SSD might have stored only some of the pages. A record bigger than your buffer might get split across several write calls, and a kill can land between those. And write is allowed to write fewer bytes than you asked for. So you'll make a torn tail on purpose, two different ways.

<!-- section: Durability: when is a put really done? -->

A: Now, the checksum tells you whether a record's whole. It doesn't make the record survive a power cut. For that you need F sync after the append, just like the files lesson. And then you pay for it. On the Mac, a hundred-byte put was three point seven microseconds without F sync, and twenty-eight with plain F sync. And remember the Mac catch: plain F sync on macOS doesn't flush the drive's own cache. There's a separate call, F full F sync, that does, and it costs milliseconds. On a Linux box with a consumer SSD, an honest F sync is often hundreds of microseconds to a few milliseconds. So measure the Spark.

A: Which gives you a dial with three positions, and every database has some version of it. Position one, no F sync. Fast. Survives your process crashing. Loses recent writes on a power cut. But the log is still consistent, thanks to the checksums. It's just shorter. Position two, F sync on every put. Every put you said "done" to survives anything short of the disk itself dying. But your throughput is capped at one F sync per put. At three milliseconds, that's about three hundred and thirty puts a second.

B: Ouch. For a whole database?

A: [wry] For the whole thing. So position three. F sync every so many puts, or every few milliseconds, and you only tell each caller "done" once the F sync that covers their put has come back. That's called group commit. Batching lots of writes into one F sync. One three-millisecond F sync covering five hundred puts works out to six microseconds a put.

B: [skeptical] But if you crash in between, you lose a batch.

A: You lose writes nobody was told were done. That's the trick. Every caller whose put was acknowledged is covered by a finished F sync. The ones in flight just... never got their yes. So each writer waits a tiny bit longer, the cost of the F sync gets shared, and throughput goes way up. That's how real databases get both durability and speed.

<!-- section: Compaction -->

A: Okay, the garbage. The log only ever grows. Picture the crawler rechecking the same hundred thousand URLs every day. It appends a hundred thousand records a day, while the number of live keys stays at a hundred thousand. After a month, ninety-seven percent of the log is garbage.

A: The fix is compaction. Also called merging. You rewrite the log keeping only the newest record for each live key, and you drop the overwritten values and the tombstones. Concretely: walk the index, copy each live record into a new file, F sync it, rename it over the old log, then F sync the directory. Which is exactly the crash-safe save recipe from the files lesson. Because compaction is literally "replace a file with a new version". And if you crash halfway through compacting, the old log's untouched, and there's a partial temp file you just delete on startup.

A: And it's quick. The test was a thousand keys, each overwritten a hundred times. That's eleven point six megabytes of log, and a hundred and sixteen kilobytes of it live. Compaction took five and a half milliseconds, and the result was exactly one percent of the size.

A: And real engines add two refinements. First, segments. Instead of one file, the log is a series of files. Only the newest one, the active segment, gets appended to. When it hits a size limit, it's closed and a new one starts. And closed segments never change, so you can compact them in the background while writes keep flowing into the active one. When the merge is done, the index just switches its pointers to the new files. That's what the segments in the interactive picture were.

A: Second, hint files. Recovery has to read the entire log, right? So Bitcask's merge also writes a small hint file next to each merged data file. It holds just the keys and their offsets, no values. On startup, you read the hint files instead of the data. So recovery reads megabytes instead of gigabytes.

B: Is recovery actually slow without them, though? Reading a file is fast.

A: Here's what it looked like on the Mac, with the file freshly written, so it was still sitting in the page cache. A hundred thousand small records replayed in forty-eight milliseconds. A six-hundred-twenty-eight-megabyte log, a hundred and fifty-six thousand records with four kilobyte values, in a hundred and fifty-six milliseconds. But cold, from the SSD, you're limited by read speed instead. Roughly a few gigabytes a second on a good N V M E drive.

B: [working it out] So a fifty gigabyte log, at a few gigabytes a second... that's tens of seconds before you can serve anything.

A: Tens of seconds to start. That's the price of this design. Hint files are how you stop paying it.

<!-- section: What this design can't do -->

A: And Bitcask is genuinely good. One disk read per get. One sequential append per put. Trivial crash recovery. And code you can hold in your head. But it has two hard limits, and they're why it's not the only engine in the world.

A: First: every key has to fit in RAM. The index holds every single key. In the Python version, a million keys cost about a hundred and eighty megabytes of index. Python dicts, strings and tuples are not compact. Bitcask's own keydir, written in Erlang and C, is tighter, but it's still tens of bytes per key, plus the key itself.

B: [working it out] So a billion keys at that kind of size... that's hundreds of gigabytes of RAM. Just for the index.

A: Hundreds of gigabytes. Values can be way bigger than RAM, they live on disk. Keys can't. Second limit: no range queries. A hash table has no order. So "all URLs starting with this one site's address", or "every record between nine and ten in the morning", means walking every key. So failure four is half-solved. Looking up one key is fast. Anything else is a scan. And fixing those two limits is exactly where the two big families of storage engine come from.

<!-- section: Write-ahead logging -->

A: But before those, notice what you just built, because it's the one idea under almost every database. The log is the truth. The index is a fast view of it that you can always rebuild. Most databases keep their actual data in something fancier than a log, a tree, usually. But they keep a log too, for exactly this reason. The rule is called write-ahead logging, W A L for short. Before you modify the real data structure, you append a record describing the change to a log, and you F sync the log. Only then do you apply the change to the structure. And that part can happen lazily. In memory. Written to disk whenever it's convenient. If you crash, you replay the log on startup and finish whatever didn't make it.

B: [skeptical] That's... writing every change twice though. Once to the log, once to the real thing. How is that not slower than just carefully updating the data?

A: [jumping in] Because the two writes have totally different shapes. The log append is small and sequential, and it's the only thing you have to F sync before you say "committed". The changes to the real structure are scattered, random writes all over a big file. And those can be saved up and written later, in big efficient chunks. Or a page can be changed in memory five times before it's written once. So the log turns "durably update a complicated structure" into "durably append some bytes". Which is the one thing disks are actually fast at.

B: Okay. So it's not double the cost, it's moving the expensive part out of the way of the commit.

A: That's it. And you've seen it twice already. The ext four journal from the files lesson is a write-ahead log for filesystem metadata. And Bitcask is the extreme case, where the log is the data structure. There's nothing to apply later. Then, every so often, the database does a checkpoint. It writes all the changed pages of the main structure out to disk, notes "everything before log position X is applied", and throws away the log before X. That keeps recovery time bounded. Same job compaction and hint files do for Bitcask.

<!-- section: Two engine shapes -->

A: So, the two answers to "my keys don't fit in RAM, and I want ranges". Both of them keep keys sorted, which gives you range scans for free. Where they differ is whether they update in place.

A: B trees first. Bayer and McCreight, early seventies. A B tree stores keys in sorted order, in fixed-size pages. A page is the block a database always reads and writes as one unit. Commonly four to sixteen kilobytes. S Q Lite's default is four, Postgres uses eight. It matches how disks and the operating system's page cache move data around. And the pages are arranged as a wide, shallow tree. Picture it: at the top, a root page that says, roughly, keys before g go left, keys between g and p go in the middle, after p go right. Below it, three leaf pages, a c e, h k m, q t x. To write k, you walk down, find the middle leaf, and rewrite that one four kilobyte page in place. But first you write the change to a W A L and F sync it.

B: But that's three keys per page. How does three or four levels get you to billions?

A: [laughs] That's just the drawing. A real page holds hundreds of keys. So each level multiplies by hundreds. A few hundred, then tens of thousands, then millions, then billions. Three or four levels covers billions of rows. And reads are predictable. One page per level, and the top levels are almost always cached. This is S Q Lite, Postgres, My S Q L's Inno D B. Most of the databases you'll ever touch.

A: The other shape is the L S M tree. Log-structured merge tree, O'Neil and others, nineteen ninety-six. And it's basically Bitcask grown up. Writes go to a W A L, and to a sorted table in memory called the memtable. Usually a skip list or a balanced tree, something that keeps recent writes in order. When the memtable fills up, it gets written to disk as one sorted file that never changes again. That's called an S S table, sorted string table. An immutable file of records sorted by key, with a small index of where each key range starts. And it goes out in one big sequential write.

A: Then background compaction merges those files together, dropping overwritten values and tombstones. Exactly like Bitcask's merge, except the output stays sorted. And to avoid opening every file on a read, each file carries a Bloom filter. That's a compact array of bits that answers "is this key possibly in this file?" with either "definitely not" or "maybe". It costs a few bits per key, and it lets a read skip most files without touching them. And because each file is sorted, you only need a sparse sample of keys in RAM. You can find any key from its neighbours. This is Level D B, Rocks D B, Cassandra, and the storage under a lot of the big distributed databases.

B: So a get on an L S M has to check, what, the memtable and then a bunch of files?

A: The memtable, then the files from newest to oldest, with the Bloom filters letting it skip most of them. So the trade-off in one line. B trees do more work on writes, so reads are cheap. L S M trees do less work on writes, and pay for it on reads and in background compaction. The indexes lesson builds the B tree for real.

B: Okay, so how does each of these hold up if this crawler store goes from a million keys to a billion, and writes go up ten times?

A: [thinking out loud] The JSON file's dead long before that. Order N per write means seconds per put at a few million keys. Bitcask's writes still cost one append, and a get is still one read. But the index needs every key in RAM. A real implementation at a hundred-plus bytes per key, times a billion, is around a hundred gigabytes. And startup, replaying or reading hint files, gets long. So you'd move to a sorted engine. A B tree grows by one level for every few-hundred-fold more data. So at a billion keys a lookup's still four or five page reads, with the top levels cached. Writes are random page writes plus the W A L, and ten times more writes means more F syncs, which group commit spreads out. An L S M tree soaks up the ten times more writes best, because they're sequential. The cost is background compaction I O, and checking several files per read, which the Bloom filters soften. And past one machine, you split the keys across machines, which is called sharding, and each machine runs one of these engines.

<!-- section: Everything else a database does -->

A: So a storage engine gives you put and get that survive crashes. A database wraps three more jobs around it. And each one's a direct answer to one of the four failures.

A: Concurrency control, that's failure three. When lots of clients read and write at once, something has to decide what each one sees, and stop them erasing each other's work. The crudest answer is one big lock. One writer at a time. Better answers lock individual rows. Or they keep several versions of each row, so readers never have to wait for writers. That's M V C C, multi-version concurrency control. A write creates a new version of a row instead of overwriting it, so every reader sees a consistent snapshot of the data as of when it started, and it never blocks the writers. Postgres works that way.

B: [a bit unsure] And a transaction is... the lock? Or is it more like a batch of writes?

A: Closer to the batch, but with a promise attached. A transaction is a group of reads and writes the database treats as one indivisible step. Either every change in it lands, or none of them do. And other clients never see it half done. So for the crawler: "record this fetch, and bump the count for this domain" as one transaction. You never end up with the fetch recorded and the count not bumped. Locks are one of the tools the database uses to keep that promise, but the transaction is the promise. It gets its own lesson.

A: Second job, a query language, which is failure four. Codd's point. You say what you want: select the URL from fetches where the status is four twenty-nine and the timestamp is after yesterday. And a query planner decides how. That's the part of the database that turns your question into an actual plan. Which index to use, which order to join tables in, or whether to just scan everything. Postgres has a command, explain, that shows you what it picked. And if you add an index on status next month, the same query just gets faster. You don't change a line of your code.

B: Oh, so that's the data independence thing. From nineteen seventy.

A: Fifty-five years later, yeah. Same idea. Third job, durability guarantees, which is failures one and two. A database makes an explicit promise about when "committed" means "survives a power cut", and it lets you tune that. The four-letter summary of these promises is acid. A for atomicity, all or nothing. C for consistency, rules like "no negative balances" always hold. I for isolation, transactions running at the same time don't see each other's half-done work. And D for durability, committed means it survives a crash. The transactions lesson takes all four apart. The one that matters right now is that the D is a setting you can change. And you should know which position your database is in.

<!-- section: SQLite -->

B: [skeptical] Okay, but S Q Lite. I kind of think of that as the toy one. The thing you use in tutorials before you set up a real database.

A: [amused] That's a really common picture, and it's backwards. S Q Lite is a full SQL database. B tree storage, transactions, a query planner, crash recovery. It just runs as a library inside your process, and keeps the entire database, tables, indexes, everything, in one ordinary file. No server. Python ships it as the S Q Lite three module. D. Richard Hipp wrote it in two thousand, while working on software for a U S Navy destroyer. As he tells it, the program depended on a database server, and whenever the server was down, the program was useless. And its own documentation has this line: it "does not compete with client server databases. S Q Lite competes with F open."

B: F open. So, opening a file.

A: So, your JSON file. It's the thing you use instead of your JSON file. And it's probably the most deployed database engine there is. Every iPhone, every Android phone, every major browser, Python's standard library. And it's tested to an extreme. The project has hundreds of times more test code than library code, including tests that simulate a power cut at every single write.

A: Two modes matter. The default is the rollback journal. Before S Q Lite changes a page in the database file, it copies the original page to a separate journal file, and F syncs that. If it crashes, the next time anyone opens the database it copies the originals back. So that's an undo log, not a redo log, it saves the before rather than the after. But it's the same idea: durably write down enough to recover, before touching the real data. And a writer locks the whole database while it commits.

A: The other is W A L mode. Changes get appended to a separate W A L file, and readers read the main database file plus whatever the W A L says has changed. So readers stop blocking the writer, and the writer stops blocking readers. It's still one writer at a time, though. A second writer waits. Python's S Q Lite module waits up to five seconds by default, there's a timeout argument. And every so often S Q Lite checkpoints the W A L back into the main file.

A: And there's a setting called synchronous, which is the F sync dial. Full is the default, and it F syncs on every commit. Normal, in W A L mode, F syncs less often. A commit survives your process crashing, but the last few might be lost on a power cut. And the database is never corrupted either way. One more Mac detail. S Q Lite on macOS uses plain F sync unless you also turn on a setting called full F sync. Same gap as in the files lesson.

<!-- section: When SQLite, when Postgres -->

A: So, when S Q Lite and when Postgres. Picture two boxes side by side. On the left, your Python process. Inside it, your code, and right underneath it, the S Q Lite library. It's just a function call. Inside that library, the SQL parser and planner, the file locks that allow one writer at a time, B tree storage in four kilobyte pages, and the journal or W A L with its F syncs. No network hop, so a query takes microseconds. And underneath the process, one file. Two if you count the W A L. Backing it up is copying that file.

B: Just copy it? Even while the crawler's running?

A: Copy it while nothing's writing. Or use S Q Lite's backup command, or one called vacuum into, which make a consistent copy while the database is in use. Now the right-hand box. Postgres. Your app, another app, the P S Q L command line tool, all sending SQL over a network socket to a separate set of server processes. One backend process per connection. Its own parser, planner and executor. M V C C and row-level locks, so lots of writers at once. Its own memory for cached pages, separate from the operating system's. B tree indexes in eight kilobyte pages. A W A L. Plus logins, roles, replication. And underneath it, a data directory of many files, owned by the server. Same layers inside both boxes. The difference is who runs them, and how many writers can work at once.

A: So reach for S Q Lite when one machine owns the data. A command line tool. A crawler's cache. An eval harness's results. A desktop or phone app. A single-server web app without heavy write traffic. A test fixture. It's zero setup, a query's a function call instead of a network round trip, and the "file" is a real database with real transactions. The limit is writes. One writer at a time, for the whole database. Thousands of small write transactions a second on one machine is fine, and you'll measure that. Many machines writing to the same file is not. And running S Q Lite over a network file system like N F S is explicitly warned against in its docs, because the file locking it relies on is unreliable there.

A: Reach for Postgres when many processes on many machines need to write at once. Or when you want users and permissions, replication to a standby machine, recovery to any point in time, or the big ecosystem. P G vector for embeddings, Post G I S for maps, JSON B columns for when you really do want documents. The cost is a server to run, connections to manage, and a network hop on every query.

B: So for the crawler cache?

A: S Q Lite. Today. If the crawler turns into a fleet on twenty machines, then Postgres, or something built for that scale.

A: [relaxed] One more guess, and it's a good one. Your append-only log does a put in about four microseconds, no F sync. S Q Lite, default settings, where every insert is its own transaction, that's called autocommit. How long per insert? And then, all the inserts inside one transaction?

B: [working it out] It's C, and it's been optimized for twenty-odd years, so... maybe similar to the log? Ten microseconds?

A: [amused] About two hundred ninety-five microseconds. Around eighty times slower than the log.

B: [surprised] Eighty times? For the thing that's in every phone?

A: Because of what each commit does in the default mode. It creates the journal file, F syncs it, writes the database page, F syncs that, and deletes the journal. Every single insert. Switch to W A L mode with synchronous on normal, and it drops to about sixteen microseconds. W A L mode with synchronous on full, which is an F sync per commit, the same promise as your log with F sync at twenty-eight: about fifty-one.

B: And the one transaction?

A: All hundred thousand inserts in one transaction: about one point three microseconds per insert. Faster than your Python log. Because the per-row work happens in C, and there's one commit at the end. So the lesson is: in S Q Lite, the transaction is the unit of cost. Batch your writes. And reads, just for completeness. About six tenths of a microsecond per get on the log, which is a dict lookup plus one read at an offset. About one point eight for S Q Lite in W A L mode, through Python. A real query planner and a B tree, within three times of a bare dict.

<!-- section: Build It -->

A: So here's what you'd actually build. One folder, standard library only. JSON, O S, struct for packing numbers into bytes, zlib for the checksum, S Q Lite three, and time. Every store gets the same three methods, put, get and delete, so one little timing harness can time any of them. It clears out leftover files between runs, averages the time over lots of puts and gets, and prints your Python and S Q Lite versions. Values are bytes everywhere, which the JSON store has to turn into strings to save. One more small way JSON doesn't fit the job.

A: Version one is the JSON store. Load the whole file into a dict. On every put, update the dict and save the whole thing crash-safely: temp file, flush, optionally F sync, rename over. Then time it at a hundred, a thousand, ten thousand, a hundred thousand keys. The trick for setup is to fill the dict directly without saving, so filling it is fast, and then time a hundred real puts. Do it with F sync on and off. And write down your guess first for what happens each time N goes up ten times. You'll see the ladder from before: a fifth of a millisecond up to forty-three.

A: Version two is the heart of it. The append-only log with a hash index and checksums. The record format is the one from before: four bytes of C R C, four for the key length, four for the value length, then the key, then the value, all little-endian. A tombstone is marked by setting the value length to the biggest number four bytes can hold, all ones, with no value bytes after it. And the C R C covers everything after itself. The index maps each key to where its value starts and how long it is.

B: Where its value starts, not where the record starts?

A: Right, the record's offset plus the twelve-byte header plus the key's length. That way get can read the value directly, in one call that reads at a given offset without moving the file's shared position. It's called P read. And the part that really matters is in the append. You build the whole record, header plus key plus value, as one chunk of bytes, and hand it to one single write call. Then flush, then F sync if you've turned that on. That one-write-per-record is exactly what makes kill dash nine unable to tear it. You're about to test that claim. And recovery is the loop from before. Read from the start, three checks per record, apply it, stop at the first failure, truncate, and print how many bytes you cut. Reading the whole file in one go is fine here, but notice it means recovery's memory grows with the log. A real engine would read it in chunks. The test: put three keys, overwrite one, delete one, close it, reopen it, and check every get.

A: Then you crash it. Three kinds of damage. First, the honest one. A writer puts four kilobyte values forever, you start it, wait a second, kill dash nine it, reopen and count the keys. Do that a few times with different waits, and note the file size, the key count, how many bytes recovery truncated, and how long recovery took. Second, the crash kill dash nine can't produce. You add a debug method that builds a record exactly like the real append, writes only the first half of it, flushes, and then kills its own process. Reopen, and recovery should cut exactly that half-record, with every earlier key intact. And third, open the log, go ten bytes back from the end, which is inside the last record's value, and flip one bit. Then reopen. The lengths are all fine. Only the checksum can catch that one.

A: Then compaction. Write every live key's current value into a fresh file, flush, F sync, rename it over the log, F sync the directory, reopen, rebuild the index. Test it with a thousand keys each overwritten a hundred times, print the size before and after, time it, check every key still reads back its newest value. Then put a five-second sleep in the compaction loop, kill dash nine it midway, and confirm the original log wasn't touched. And then hand it to an agent to review, with one specific question. In a design where compaction runs in a background thread, what happens to a put that arrives during compaction?

B: [thinking out loud] Hmm. If compaction's copying from the old file and the put lands in the old file after you've already passed that key... then you swap in the new file and that put's just gone.

A: [pleased] That's the problem. Yours doesn't run in the background, so you're safe. Bitcask's does. And that's exactly why Bitcask only compacts closed segments. Nobody's writing to them anymore.

A: Next, S Q Lite, wrapped in the same three methods. Connect in autocommit mode, so every statement is its own transaction. Set the journal mode and the synchronous setting. One table, a text key that's the primary key and a blob for the value. Put is an insert-or-replace, get is a select, delete is a delete. Then time everything. Your log with and without F sync, two thousand puts for the F sync runs, a hundred thousand otherwise. S Q Lite with the defaults, with W A L and full, with W A L and normal, and a hundred thousand puts inside one begin and commit. Also time how long opening your log takes on a hundred thousand keys, because that's recovery. And when you compare them, pair the rows by promise, not by name. Your log with F sync and S Q Lite in W A L mode with full make the same promise. Your log without F sync and W A L with normal, roughly do.

A: Then the two writers. A little script that, a couple thousand times, either loads the JSON file, adds its own key, and saves through its own temp file and a rename. Or, in S Q Lite mode, inserts one row, W A L mode, autocommit, with a ten-second timeout. Make the table once first. Run two copies at the same time for each, and count what's there. Then try the JSON version again where both workers share the same temp file name, and see what other errors show up.

A: And last, copy the whole folder to the Spark over Tailscale and rerun the JSON timing, the crash tests, the benchmark, and the two writers. The interesting row there is F sync. Linux F sync actually flushes the drive, so expect the log-with-F-sync and the S Q Lite full rows to move a lot compared to the Mac. And have an agent check your benchmark for unfairness. Are you timing file creation in some runs and not in others? Is the page cache warm for one store and cold for another? You're done when all three stores pass the same small test, your log survived the kill, the torn half-record and the flipped bit, each time keeping every earlier record and dropping only the damaged tail, compaction shrinks it to its live size and survives being killed, you've got numbers from both machines with your guesses written down first, and you can explain without notes why two JSON writers lose data and two S Q Lite writers don't.

<!-- section: Measure -->

A: So what should the numbers look like? Here's what came out on the M four Pro, macOS, Apple's filesystem, Python three point fourteen, S Q Lite three point fifty-three. And it's the shape that matters, not the exact values. JSON: ten times the keys, ten times the time. It's order N per put. Which means building up N keys one put at a time is order N squared.

B: Squared because...?

A: Because every put rewrites everything that's there so far. So filling it to a hundred thousand keys, one at a time, means writing a file of one key, then two, then three, all the way up. Add those up and it grows with the square of N. Ten times the keys, a hundred times the total work. And that forty-three milliseconds at a hundred thousand is nearly all serializing and copying twelve megabytes. The F sync is noise.

A: The log: about four microseconds regardless of size. That's one Python function call, building a small bytes object, one write system call into the page cache, and one dict store. It's within a factor of two of the plain four kilobyte write number from the files lesson, because that's basically all it is. A get is about six tenths of a microsecond.

A: F sync dominates whenever you ask for it. Three point seven to twenty-eight microseconds on the Mac, and on the Spark you'll likely see more. S Q Lite's default mode is about ten times slower again than your log with F sync, because a rollback journal commit does several F syncs, and creates and deletes a file. W A L mode brings it within two times of your log at the same promise. With a B tree, SQL and transactions on top.

A: One transaction makes S Q Lite faster than your Python log. One point three microseconds a row. The per-row work moved into C and the commit was paid once. If you remember one S Q Lite performance fact, it's that one.

A: Recovery reads the whole log. About fifty milliseconds per hundred thousand records here, and it scales with the size of the log, not the number of keys. That's why compaction and hint files exist. Compaction took the eleven point six megabyte log down to a hundred sixteen kilobytes in five and a half milliseconds, and reopening it afterwards took four tenths of a millisecond. Cold from disk, recovery will be slower. On the Spark you can drop the page cache, there's a one-line command for it, and try.

A: The crashes. Kill dash nine at half a second, at seven tenths, at a bit over a second. Zero torn bytes, all three times. The deliberate ones, though: the chopped-off tail got truncated, two thousand seven hundred eighty-seven bytes. The flipped bit, four thousand and twenty-one bytes. Each one exactly the damaged last record, nothing more. So the checksum's for the crashes kill dash nine can't make. Power loss, split writes, and silent corruption.

A: And two writers. JSON: two thousand and fifteen out of four thousand. S Q Lite: four thousand out of four thousand.

B: So S Q Lite was just faster, and they didn't trip over each other.

A: No, it didn't make the writers faster. It made them take turns. A file lock, and a busy timeout so the second one waits instead of failing. And each insert changed one row, instead of replacing the whole world. And when an S Q Lite writer got kill dash nined in the middle of its loop, the built-in integrity check afterwards said: okay.

<!-- section: Break It -->

A: Now break it, on purpose. First one. What if you go back to writing the JSON file in place, open it for writing and dump straight into it, and run one process writing in a loop while another just loads it in a loop?

B: No crash, so it should be fine?

A: The reader hits a JSON decode error, regularly. It opened the file somewhere between the truncate and the end of the dump. No crash needed. Just two processes. And a database never shows a reader a half-written state. That's the I in acid, isolation. And it's the whole reason temp-plus-rename exists for files.

A: Second. Take the checksum check out of recovery. Keep the length checks, skip the C R C comparison. Then flip a byte in a value. Recovery happily loads it, and get hands you back a wrong value. No error at all. Now flip a byte in a length field instead. Recovery reads garbage as a header, and either stops early, losing every record after it, or tries to allocate a four gigabyte key.

B: [amused] I'd honestly rather have the crash.

A: You would. Silent wrong answers are worse than crashes. That's why every serious storage format checksums its records. S Q Lite's W A L, Postgres's W A L, Rocks D B's blocks, Z F S.

A: Third. Two of your log stores, two processes, both opening the same log file and putting different keys.

B: [a bit unsure] Then the appends interleave and the file gets corrupted?

A: The file's actually fine. Append mode means each write goes to whatever the current end is, so both processes' records land whole. Reopen it and recovery finds everything. The problem is while they're running. Each process's index only knows about its own puts. So process A asks for a key B wrote, and gets nothing. Your engine has no concurrency control. It just has a log. And there are three ways out: locks, a single writer process that everyone sends writes to, or a server in front. S Q Lite and Postgres each picked one of those.

A: And fourth. Fill RAM with the index. Put ten million distinct small keys and watch the process's memory. A million keys was about a hundred and eighty megabytes, so expect a couple of gigabytes. Then multiply that by the number of URLs the crawlers at work know about. That's Bitcask's hard limit. And it's why the next thing to learn is trees.

<!-- section: Connections and close -->

A: The best next read is Martin Kleppmann's Designing Data-Intensive Applications, chapter three, which walks this exact path, and the Bitcask paper itself, which is six pages. And after this, the indexes lesson fixes the two things your hash index can't do, keys that don't fit in RAM and range queries. Transactions takes apart that concurrency-control box. And caching with Redis turns out to be, underneath, an in-memory hash table with an append-only log for durability. You'll recognise it.

B: [thinking out loud] Okay, let me try the whole thing. A JSON file breaks four ways: every write rewrites everything, a crash can wipe it, two writers erase each other, and every question reads the whole file. A database fixes that with a log and an index, so writes are just appends and a crash just means rebuilding the index. And S Q Lite is basically that, but in C, which is why it's fast.

A: [gently] Most of that, yes. But it's not fast because it's in C. In its default mode, one insert at a time, it was eighty times slower than your little Python log. Its speed and its safety both come from the same place: the transaction. Every change goes into a log, checksummed and F synced, before it touches the real data, so a crash always leaves you at the last committed state. One writer takes its turn at a time, so nobody's work gets erased. A B tree and a planner mean a question reads a few pages instead of the whole file. And the cost of all that safety gets paid once per transaction, not once per row. So it's not a faster JSON file. It's a different deal. You stop rewriting the world, and you start writing down what changed.
