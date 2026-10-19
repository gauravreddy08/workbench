# Outline: why-databases

Source: src/lessons/why-databases.mdx. Curriculum: "Why not a JSON file?" What does a database
give you that writing JSON to disk does not?

## The one big idea

A database is the pile of answers to four problems every "just a file" eventually hits: each
change costs as much as the whole file, a crash mid-save wrecks it, two writers erase each other,
and every question means reading everything. The trick at the bottom of almost all of them: never
rewrite, only append, and write down what you're about to do before you do it. The log is the
truth; the fast index is a cache you can always rebuild.

## Opening scene

A crawler cache for work, needed by Friday: a dict saved to cache.json. It works, then it gets used:
saves slow as it grows, eight workers silently lose entries, a worker killed mid-save leaves a
half-written file, and "how many URLs got rate limited yesterday" means loading everything.

## Wrong mental model B voices

- "Just use temp file plus atomic rename and it's safe." (Safe from crashes, not from two writers.)
- "Killing the process mid-write is what tears records." (It isn't; power loss is.)
- "I'd just use a real database" without knowing what that buys.

## Story beats

1. The crawler cache and its four failures, felt one by one.
2. History: sixties databases made programs follow pointers through the physical layout; change
   the layout, rewrite every program. Codd, nineteen seventy: say what you want, let the system
   work out how. That split (query layer over storage engine) is still every database.
3. Failure one in numbers-as-relationships: ten times the keys, ten times the time per save.
   Failure three: two workers, almost exactly half the keys gone, no error; SQLite kept all.
4. Simplest engine: only append to the end; newest record wins; a dict in memory remembers where
   each key's newest record starts. Deletes are tombstones. Riak's Bitcask shipped exactly this.
5. Crash: the index is lost but it's only a cache of the log; replay rebuilds it. Each record
   carries a fingerprint so a half-written tail is detected and cut. Surprise: kill nine never tore
   a record; the checksum is for power loss and split writes. Fsync as the durability dial; group
   commit shares one fsync among many writes.
6. Compaction: the log only grows; rewrite only the live records. Limits: every key in RAM, no
   ranges. That's why the next lesson is trees.
7. Write-ahead logging, the idea under everything: a small sequential append is the only thing
   that must be durable; the messy scattered updates can wait. Two engine shapes in one sentence
   each (B-tree updates in place; LSM keeps appending and merges).
8. What a database adds on top: taking turns (transactions), a question language with a planner,
   explicit durability promises. SQLite competes with the file; batch writes into one transaction
   (that made it faster than my Python log). SQLite versus Postgres.

## Numbers worth saying

- nineteen seventy (Codd)
- "almost exactly half" the keys lost with two writers
- "ten times the keys, ten times the time"

## Left to the written lesson

All microsecond timings, file sizes, record header layout, recovery loop steps, compaction sizes,
hint files, macOS fsync caveat, SQLite journal and synchronous modes, Bloom filters, SSTables,
MVCC, ACID letters, all tasks, the scaling question.
