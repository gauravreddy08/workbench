<!-- section: The Problem -->

A: [relaxed, thinking out loud] So you're writing a crawler cache for work. Before the crawler fetches a URL, it checks whether it fetched it recently. After it fetches, it writes down the status code, a hash of the content, a timestamp. And you need it by Friday. So it's a dict. And the dict lives in a JSON file. Load it, change it, dump it.

B: Honestly, that's what I'd write.

A: It's what everybody writes. And it works. And then it gets used. When it's small, nobody notices anything. But once it's got a couple hundred thousand URLs in it, the crawler is spending more time saving its cache than fetching pages.

B: Because every save rewrites the whole thing.

A: Every single update rewrites all of it. Then someone runs it with eight worker processes to go faster, and entries start silently disappearing. Then one worker gets killed while saving, out of memory, and the next run dies with a JSON decode error, unterminated string, because the file got cut off halfway. And then someone asks, "how many URLs got rate limited yesterday?" and the only way to answer is to load the whole file and loop.

B: [a bit sheepish] Okay, so, in an interview I'd just say, "I'd use a real database."

A: Which is right. And the follow-up question is, "what does it actually give you?" And that's what I want to answer. Because none of what happened there is really a bug in your code. It's four separate problems that every program storing data eventually hits. And a database is basically the pile of answers to those four.

<!-- section: Stop making programs know where the data lives -->

A: [warm] And the idea of a database as we know it starts with a complaint. In the sixties, a "database" meant something like IBM's system built for the Apollo program's parts lists. Data was stored as trees of records linked by pointers. And programs walked them by hand. Start at this customer, follow the pointer to their first order, follow the next-order pointer, and so on.

B: So the program knew how the data was laid out on disk.

A: It knew everything about the layout. Which meant if you changed the layout, added an index, reorganised it for speed, every program that touched it had to be rewritten. And in nineteen seventy, Edgar Codd, a mathematician at IBM, publishes a paper that basically says, stop it. Users should describe what data they want, and the system should work out how to get it. Then the storage underneath can change without breaking a single query.

B: And that turns into SQL.

A: IBM was slow on it, the old system made them a lot of money. But it built a prototype and a language that became SQL, Berkeley built one, and a small company that became Oracle shipped the first commercial one at the end of that decade. And that split is still the shape of every database. A layer on top where you say what you want. And underneath, a storage engine that decides how bytes sit on disk. I want to talk mostly about the bottom half, because that's where your JSON file fell over.

<!-- section: Four ways a file fails -->

A: So, problem one. JSON is a way to turn objects into bytes. It's not a way to store them. It has no way to say "change the thing at this spot in the file." Change one value and everything after it shifts. So the only safe way to update one key is to write the whole file again.

B: So one save costs as much as the whole dataset.

A: Right. When I measured it on my laptop, each time I made the dict ten times bigger, one save took about ten times longer. Straight line. And at a big size, the store topped out at a couple dozen writes a second. Your crawler would be doing nothing but saving.

B: [skeptical] And the crash one I know how to fix. Write to a temp file, force it to disk, then rename it over the old one. The rename's atomic.

A: That fixes the crash. You can make a JSON file crash safe. What you can't do is make it crash safe and cheap to update, because now every save is a full copy. And it does nothing at all for problem three.

B: The eight workers.

A: Two workers. Each one does the natural thing. Read the whole file, add its key, write the whole file. They both read the same version. Each adds its own key to its own copy in memory. Whoever saves second wins, and the other one's change is just gone.

B: But with the atomic rename—

A: With the rename, every save is whole. Nobody ever sees a broken file. But "whole" isn't the same as "includes the other worker's change." I ran two processes, each adding a couple thousand keys to the same file as fast as they could, with the rename trick. And almost exactly half the keys survived. No errors. No corrupt JSON. Just half the data, gone.

B: [quietly] Oof.

A: Same two processes against SQLite, every single key was there. And that's the same lost update as two threads both doing "counter plus equals one," just with a file instead of a number. And problem four is the obvious one. To find one key, you parse the whole thing. And to answer "which ones failed yesterday," you loop over everything, every time, because nothing on disk is organised by status or by time.

<!-- section: The simplest engine -->

A: So let's build the bottom layer. The part that just answers, put this key, get this key, delete this key. That's called a storage engine. And the simplest one is built around one observation. The cheapest thing you can do to a file is add to the end of it. Nothing moves, nothing old gets rewritten.

B: So you never update in place.

A: Never. To put a key, you add a record to the end of the file. Key, value. To change it, you add another record. The newest one wins. That file is called an append-only log. And now writes cost the same no matter how big the data is.

B: But reads are awful. To find a key, I'd scan the whole log and keep the last match.

A: Worse than JSON, yeah. So you keep a dict in memory. For every key, it remembers where in the file its newest record starts. Now a read is one dict lookup and one small read from the file. And a delete, well, you can't erase anything from an append-only log, so you add a special record that says "this key is deleted." That's called a tombstone.

B: Huh. And that's a real design?

A: [warm] That's a real design. A company building a database called Riak needed something simple and crash-friendly for each machine, and two engineers wrote it down, found the simplest possible design met nearly everything they wanted, and called it Bitcask. Files you only add to, a hash table in memory, and a cleanup step. It became Riak's default. When I built a little Python version, a put took a few microseconds, and it stayed the same whether there were a hundred keys or a hundred thousand.

<!-- section: What a crash actually does -->

A: Now here's the part I love. What happens when the process dies?

B: You lose the dict. The index.

A: You lose the index. But the index holds nothing the log doesn't. It's just a fast view of it. So on startup you read the log from the beginning, record by record, and rebuild the dict. Losing it costs you time, not data.

B: [working it out] Unless the crash happened halfway through writing a record. Then the end of the file is garbage.

A: Right, so each record carries its own length and a little fingerprint of its contents. That's called a checksum. On startup you read each record, check there are enough bytes, recompute the fingerprint. The first record that fails, that's where the crash hit. You cut the file there, and carry on.

B: And presumably if I kill the process in the middle of a write, that's how you get the broken record.

A: That's what I assumed. So I did it. A writer putting records in a tight loop, killed hard at a random moment. Several times, with big logs. And recovery found zero broken bytes. Every time.

B: [surprised] Wait, really? Then what's the checksum for?

A: So each record went to the operating system in one single write call. And the kill can only land between those calls, not halfway through the kernel copying your bytes. Once the bytes are handed over, they belong to the kernel, and the kernel finishes writing them out even though your process is dead. The checksum is for the crashes a kill can't cause. A power cut, where the kernel's own copy is lost and the drive only saved part of a record. A record too big for one write. Or a byte that just gets corrupted. So I made a broken tail on purpose, by writing only half a record and then killing myself. And recovery cut exactly that half record, and everything before it was fine.

<!-- section: When is a write really done -->

B: So when is a put actually safe? Like, survives anything?

A: That's the next dial. The checksum tells you a record is whole. It doesn't make it survive a power cut. For that, you have to ask the operating system to push it all the way to the disk before you say "done." Normally a write just lands in the operating system's memory and goes to the drive later. Asking it to go all the way now is called fsync. And it's expensive, much slower than the write itself.

B: So you either go fast and risk losing the last few writes on a power cut, or you go slow and safe.

A: Or the third thing, which is what real databases do. You wait a tiny bit, collect a bunch of writes, and do one fsync for all of them, and only tell each caller "done" once the fsync covering their write has finished. Every acknowledged write is still durable, but the cost is shared. That's called group commit.

B: And the log just grows forever?

A: It does. A crawler that rechecks the same URLs every day keeps adding records while the number of real keys stays the same. After a while, almost all of the log is old versions nobody points to. So every so often you copy just the live records into a new file, and swap it in with the same safe-rename trick. That's compaction. When I overwrote a bunch of keys a hundred times each and compacted, the file shrank to about a hundredth of its size, almost instantly.

B: [thinking] So what's the catch? This sounds pretty great.

A: Two catches. Every key has to fit in memory, because the dict holds all of them. Values can be huge, keys can't. And a hash table has no order. So "all the URLs from this one site," or "everything between nine and ten," means walking every key. And fixing those two is where the real engines come from.

<!-- section: Write it down before you do it -->

A: But first, notice what you just built. The log is the truth. The fast structure is a view of it you can always rebuild. And most databases keep their data in something fancier than a log, a tree usually. But they keep a log too, for exactly this reason.

B: Write the change to the log, then do the change.

A: That's the rule. It's called write-ahead logging. Before you touch the real data structure, you add a note to a log saying what you're about to do, and force that note to disk. Only then do you change the structure. And that part can happen later, lazily, in memory. If you crash, you replay the log and finish what didn't make it.

B: [skeptical] But then you're writing everything twice. How is that faster?

A: Because the two writes have totally different shapes. The log note is small, and it goes on the end, and it's the only thing you have to force to disk before saying "committed." The changes to the real structure are scattered all over a big file. Those can wait, and get batched, and maybe get changed five times in memory before they're written once. So it turns "durably update a complicated structure" into "durably add a few bytes to the end of a file," which is the one thing disks are fast at.

B: And the two big kinds of engine?

A: One sentence each, because they get their own episode. A B-tree keeps keys sorted in fixed-size pages arranged as a wide, shallow tree, and changes pages in place, with a write-ahead log in front. That's SQLite, Postgres, most of what you'll touch. And an LSM-tree is the Bitcask idea grown up. Keep appending, keep sorted files, merge them in the background. B-trees make reads cheap. LSM-trees make writes cheap.

<!-- section: What a database adds -->

A: So a storage engine gives you put and get that survive crashes. And a database wraps three more jobs around it, and each one answers one of the original failures. Somebody has to decide how many writers take turns, and what each one sees. That's where transactions come from, a group of changes that all happen or none do. Then a question language. You say "give me every URL that got rate limited since yesterday," and a planner decides how, using whatever indexes exist. And then an explicit promise about what survives a crash, which is a setting you can change.

B: And SQLite is the one for my crawler.

A: SQLite is a full database, with a tree, transactions, crash recovery, a planner, that runs as a library inside your process and keeps everything in one file. Its own docs say it doesn't compete with database servers, it competes with opening a file. It's the thing to use instead of your JSON. And here's the most useful thing I learned measuring it. With the default settings, every insert on its own was a lot slower than my little Python log, because every insert was its own transaction with its own trips to the disk.

B: And if you batch them?

A: Put all the inserts in one transaction, and SQLite was faster per row than my Python log. The work moved into C, and you paid for the commit once. In SQLite, the transaction is the unit of cost. Batch your writes.

B: When would I reach for Postgres instead?

A: When many processes on many machines need to write at once. SQLite lets one writer at a time for the whole file, and it's really not meant to sit on a shared network drive. Or when you want users and permissions, a standby copy, all the extensions. The cost is a server to run, and a network hop on every query. For your crawler cache, today, SQLite. If it becomes a fleet on twenty machines, Postgres.

<!-- section: Ending -->

B: Okay, let me try. A JSON file fails four ways. Every save rewrites everything, a crash can wreck it, two writers erase each other, and every question means reading everything. A database fixes it by never rewriting, just adding to the end of a log with a fingerprint on each record, keeping a fast index in memory that it can always rebuild from the log, and then layering taking turns and a question language on top.

A: That's it. The piece I'd sharpen is the two writers. The log on its own doesn't fix that. If two processes both append to my little log, the file's fine, but each one's index only knows about its own writes. Storing bytes safely and letting people take turns are different jobs. SQLite fixes the second one by making writers wait their turn, and changing one row instead of replacing the whole world. So when someone says "I'd just use a database," the follow-up is, which of those four problems do you actually have?
