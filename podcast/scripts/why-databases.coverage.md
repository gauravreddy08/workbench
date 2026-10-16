# Coverage: why-databases

Lesson src/lessons/why-databases.mdx vs podcast/scripts/why-databases.md. Item IDs match
podcast/outlines/why-databases.md. No item was MISSING after the check; numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| R1 page cache, fsync, temp+rename, ext4 journal, F full fsync recaps | Failure one/two; Durability; WAL | "F sync, quick reminder, is the call"; "write to a temp file, F sync it, then rename"; "ext four journal" | covered |
| R2 counter += 1 lost update, lock | Failure three | "the counter plus-equals-one thing from the threads lesson" | covered |
| P1 crawler cache, status/hash/timestamp, Friday, dict in cache.json | Problem | "You need it by Friday. So it's a dict." | covered |
| P2 5,000 fine; 200,000 = 30 MB rewrite | Problem | "the file's thirty megabytes" | covered |
| P3 8 workers lose entries | Problem | "whoever saved second erased the other one's work" | covered |
| P4 OOM kill mid-save, Unterminated string, truncate | Problem | "\"Unterminated string.\"" | covered |
| P5 429 question = load 30 MB and loop | Problem | "how many URLs returned four twenty-nine yesterday" | covered |
| P6 four problems; database = answers; build one | Problem | "four separate problems"; "pile of answers" | covered |
| O1 IMS, Apollo, pointers, programs knew layout | Origin | "built for the Apollo program's parts lists" | covered |
| O2 Codd June 1970, paper title, data independence | Origin | "He called the goal data independence" | covered |
| O3 IBM slow, System R, SEQUEL/SQL, Ingres, Oracle 1979, Turing 1981 | Origin | "Relational Software, which later became Oracle" | covered |
| O4 query layer vs storage engine split | Origin | "a query layer on top that says what" | covered |
| I1 serialization format; can't change byte 4,812; bytes shift | Failure one | "There's no way in JSON to say" (B's seek-and-patch model) | covered |
| I2 O(N) | Failure one | "Twice the data, twice the time" | covered |
| F1 figure 001 numbers 0.19/0.53/4.2/43 ms, sizes, ~23 writes/s, log ~4 µs | Failure one | "about a fifth of a millisecond ... forty-three milliseconds"; "About twenty-three" | covered |
| I3 fsync no visible difference at large N | Failure one | "it made no visible difference" | covered |
| I4 few hundred MB/s; million keys half a second; two saves a second | Failure one | "around half a second per put" | covered |
| I5 truncate; crash-safe but not cheap | Failure two | "crash-safe and cheap to update" | covered |
| F2 figure 002 timeline, rename doesn't help | Failure three | "And a is gone. No error." | covered |
| I6 lost update term | Failure three | "It's a lost update." | covered |
| I7 flock, one at a time, queue behind 43 ms | Failure three | "eight workers queue up behind a forty-three millisecond save" | covered |
| PR1 predict 2,015 of 4,000; SQLite 4,000 | Failure three | "two thousand and fifteen survived" | covered |
| I8 21 ms load, sub-µs lookup, stale copy, 429 loop | Failure four | "about twenty-one milliseconds to load" | covered |
| I9 problems 1,2,4 on-disk layout; 3 above | Storage engine | "One, two, and four are about how the bytes are laid out" | covered |
| I10 storage engine term, put/get/delete/scan | Storage engine | "It's the storage engine." | covered |
| I11 SQLite table keyed by row ID, index, MySQL engines | Storage engine | "Inno D B, My I S A M" | covered |
| I12 append cheapest; never update in place; append-only log term | Simplest engine | "is called an append-only log" | covered |
| I13 writes constant, reads worse than JSON | Simplest engine | "That's worse than JSON." | covered |
| I14 offset, hash index terms | Simplest engine | "Offset four thousand eight hundred and twelve" | covered |
| I15 put/get/delete, tombstone and why | Simplest engine | "it comes right back to life" | covered |
| I16 old records garbage | Simplest engine | "They're garbage. We'll deal with them." | covered |
| O5 Bitcask origin: Basho, Riak, Dynamo, Sheehy and Smith, requirements, keydir, merge, Rosenblum and Ousterhout 1991 | Bitcask | "they called the keydir" | covered |
| F3 interactive figure: index, segments, buttons, crash/replay, tear | Interactive log | "Hit replay." | covered |
| I17 three things to notice; index is a cache | Interactive log | "Put a fifty times" (B's "lost all your data" model) | covered |
| I18 process vs machine crash; torn write | Records whole | "That's called a torn write." | covered |
| I19 checksum, CRC32, not cryptographic, zlib | Records whole | "C R C thirty-two. Cyclic redundancy check" | covered |
| F4 figure 004 header 12 bytes, power-cut log, 112 vs 40 | Records whole | "The header says a hundred and twelve bytes follow" | covered |
| I20 recovery loop + truncate | Records whole | "So recovery's a loop." | covered |
| I21 stop not skip; mid-log corruption caveat | Records whole | "they'll refuse to start on the second one" | covered |
| PR2 predict kill -9 tears: zero in 266/362/628 MB; why; three reasons for CRC | Records whole | "Zero torn bytes, every time."; "Three reasons." | covered |
| I22 3.7 vs 28 µs; F_FULLFSYNC ms; Linux hundreds of µs to ms; measure Spark | Durability | "three point seven microseconds without F sync, and twenty-eight" | covered |
| I23 three-position dial, 330/s, group commit, 6 µs | Durability | "about three hundred and thirty puts a second"; "six microseconds a put" | covered |
| I24 97% garbage after a month | Compaction | "ninety-seven percent of the log is garbage" | covered |
| I25 compaction term, recipe, crash safety | Compaction | "Which is exactly the crash-safe save recipe" | covered |
| I26 11.6 MB / 116 KB / 5.5 ms / 1% | Compaction | "exactly one percent of the size" | covered |
| I27 segments | Compaction | "First, segments." | covered |
| I28 hint files | Compaction | "Second, hint files." | covered |
| I29 recovery 48 ms / 156 ms; few GB/s; 50 GB tens of seconds | Compaction | "Tens of seconds to start." | covered |
| I30 Bitcask strengths | Limits | "One disk read per get." | covered |
| I31 keys in RAM, 180 MB per 1M, tens of bytes per key, billion = hundreds of GB | Limits | "Hundreds of gigabytes." | covered |
| I32 no range queries; half-solved; leads to two families | Limits | "So failure four is half-solved." | covered |
| I33 WAL term | WAL | "The rule is called write-ahead logging" | covered |
| I34 why writing twice is faster (B's wrong model) | WAL | "the two writes have totally different shapes" | covered |
| I35 ext4 journal is a WAL; Bitcask degenerate case | WAL | "Bitcask is the extreme case, where the log is the data structure" | covered |
| I36 checkpoint term | WAL | "the database does a checkpoint" | covered |
| I37 both sorted, differ in update in place | Engines | "Where they differ is whether they update in place." | covered |
| F5 figure 005 both sides | Engines | "a c e, h k m, q t x"; "memtable ... S S table" | covered |
| I38 B-tree: Bayer and McCreight, page term 4-16 KB, SQLite 4, Postgres 8, levels, users | Engines | "S Q Lite's default is four, Postgres uses eight" | covered |
| I39 LSM: O'Neil 1996, memtable, SSTable, compaction, Bloom filter, sparse keys, users | Engines | "That's called an S S table"; "Bloom filter" | covered |
| I40 trade-off; indexes lesson | Engines | "B trees do more work on writes, so reads are cheap" | covered |
| I41 three jobs each answering a failure | Everything else | "each one's a direct answer to one of the four failures" | covered |
| I42 concurrency control, MVCC, transaction term (B fuzzy on transactions) | Everything else | "the transaction is the promise" | covered |
| I43 query language, planner, EXPLAIN, index on status, data independence 55 years | Everything else | "Fifty-five years later" | covered |
| I44 ACID letters, D is a setting | Everything else | "the D is a setting you can change" | covered |
| I45 SQLite term, Hipp 2000, Navy destroyer, competes with fopen (B's "toy" model) | SQLite | "S Q Lite competes with F open." | covered |
| I46 most deployed; test code; power-loss tests | SQLite | "hundreds of times more test code" | covered |
| I47 rollback journal, undo log, whole-DB lock | SQLite | "So that's an undo log, not a redo log" | covered |
| I48 WAL mode, one writer, 5 s timeout, checkpoint | SQLite | "waits up to five seconds by default" | covered |
| I49 synchronous FULL/NORMAL; macOS fullfsync | SQLite | "a setting called synchronous, which is the F sync dial" | covered |
| F6 figure 006 both boxes; backup footnote | When SQLite | "Picture two boxes side by side"; "vacuum into" | covered |
| I50 SQLite uses, one writer, thousands/s fine, NFS warning | When SQLite | "N F S is explicitly warned against" | covered |
| I51 Postgres uses, pgvector/PostGIS/JSONB, costs | When SQLite | "P G vector for embeddings" | covered |
| I52 crawler: SQLite today, twenty machines Postgres | When SQLite | "If the crawler turns into a fleet on twenty machines" | covered |
| PR3 predict 295 µs (~80x), commit steps, 16, 51 vs 28, 1.3 µs, reads 0.6/1.8, within 3x | When SQLite | "About two hundred ninety-five microseconds." | covered |
| B0 folder, stdlib, harness, bytes values | Build It | "One folder, standard library only." | covered |
| B1 JSON store v1 timing | Build It | "Version one is the JSON store." | covered |
| B2 log v2 format, tombstone marker, index value offset, single write, pread, recover, hints, test | Build It | "Where its value starts, not where the record starts?" | covered |
| B3 three crash tests | Build It | "Three kinds of damage." | covered |
| B4 compaction task, kill during, background-put review question | Build It | "Bitcask only compacts closed segments" | covered |
| B5 SQLite wrapper, runs, pair by promise | Build It | "pair the rows by promise, not by name" | covered |
| B6 two-writer script, shared temp name | Build It | "share the same temp file name" | covered |
| B7 Spark rerun, fsync row, unfairness review | Build It | "Is the page cache warm for one store" | covered |
| B8 done-when list | Build It | "You're done when all three stores pass" | covered |
| M1 machine and versions, shape over exact | Measure | "S Q Lite three point fifty-three" | covered |
| M2 JSON O(N), O(N squared), 43 ms serialization | Measure | "Ten times the keys, a hundred times the total work." | covered |
| M3 log 4 µs, why, within 2x of files lesson; get 0.6 | Measure | "within a factor of two of the plain four kilobyte write" | covered |
| M4 fsync dominates; SQLite default ~10x more; WAL within 2x | Measure | "about ten times slower again" | covered |
| M5 one transaction 1.3 µs, most useful fact | Measure | "If you remember one S Q Lite performance fact" | covered |
| M6 recovery ~50 ms/100k, scales with log; compaction + reopen 0.4 ms; drop caches | Measure | "four tenths of a millisecond" | covered |
| M7 kill at 0.5/0.7/1.1 s zero; 2,787 / 4,021 bytes | Measure | "two thousand seven hundred eighty-seven bytes" | covered |
| M8 two writers 2,015 / 4,000; take turns; integrity check ok | Measure | "It made them take turns." (B's "just faster" model) | covered |
| K1 in-place JSON with reader, I in ACID | Break It | "That's the I in acid, isolation." | covered |
| K2 no CRC: wrong value, length flip, 4 GB key, who checksums | Break It | "tries to allocate a four gigabyte key" | covered |
| K3 two LogKV writers: file fine, indexes blind, three ways out | Break It | "It just has a log." | covered |
| K4 10M keys, ~180 MB per 1M, couple of GB, trees next | Break It | "expect a couple of gigabytes" | covered |
| E1 four things a DB gives | Problem; Everything else; close | B's restatement + A's sharpening | covered |
| E2 Bitcask description and limits | Simplest engine through Limits | B: "the log is the real thing and the dict is just... a shortcut" | covered |
| E3 WAL and why faster, checkpoint, who uses it | WAL | "moving the expensive part out of the way of the commit" | covered |
| E4 scaling 1M -> 1B, 10x writes, sharding | Engines | "from a million keys to a billion" | covered |
| E5 SQLite vs Postgres + autocommit trap | When SQLite; close | "the transaction is the unit of cost" | covered |
| G1 Kleppmann ch 3, Bitcask paper | Close | "Designing Data-Intensive Applications, chapter three" | covered |
| C1 indexes, transactions, Redis | Close | "caching with Redis" | covered |
