# Outline: why-databases

Source: src/lessons/why-databases.mdx. Curriculum entry: "Why not a JSON file?"
Question: what does a database give you that writing JSON to disk does not? Why: durability,
concurrency, and queries are problems you only notice once they break.

Each item: what the lesson teaches -> how it is said aloud (who raises it, what scene).
Diagnostic gaps touched: Numbers (microseconds vs milliseconds, MB, RAM per key), DB indexes and
transactions (fuzzy), and the lost-update race (sync/concurrency). B voices the natural wrong models:
"atomic rename fixes two writers", "just put a lock on it", "kill -9 will tear records", "the index
is the data, so a crash loses it", "writing everything twice (WAL) must be slower", "SQLite is a toy,
real apps use Postgres", "a database is fast because it's in C".

## Prerequisites (re-explained in passing)

- R1 From the files lesson: page cache (kernel's copy in RAM; write returns once bytes are there), fsync (blocks until on the drive), temp-file-plus-fsync-plus-rename (crash-safe save), ext4 journal, macOS plain fsync vs F full fsync. -> A recaps each in one or two sentences at the point it is used.
- R2 From threads lesson: counter += 1 lost update, fixed with a lock. -> A when the two-writers figure comes up.

## The Problem

- P1 Scene: crawler cache for work, check if URL fetched recently; record status, content hash, timestamp; due Friday so it's a dict in cache.json: load, set, dump. -> A opens on this, code said in words.
- P2 5,000 URLs fine; 200,000 URLs = 30 MB file, every update rewrites 30 MB, more time saving than fetching. -> A.
- P3 8 worker processes: entries silently disappear; two loaded, each added one, second save erased the other. -> A.
- P4 Worker OOM-killed while saving: next run dies with JSON decode error "Unterminated string"; open with "w" truncated, half written. -> A.
- P5 "How many URLs returned 429 yesterday?" means load 30 MB and loop. -> A.
- P6 Not a bug exactly: four problems: cost grows with size; crashes destroy old and new; concurrency loses updates; finding things is a full scan. A database is the accumulated answers; build a small one so you know what SQLite/Postgres buy you. -> A lists them conversationally; B tries a one-line fix and A says it's four problems.

## Origin: Codd 1970

- O1 1960s IBM IMS, built for Apollo parts lists; records as trees/networks linked by pointers; programs navigated by hand (customer -> first order -> next order). Program knew physical layout; change layout/add index/reorganize -> rewrite every program. -> A as story.
- O2 Edgar F. Codd, mathematician at IBM San Jose, June 1970, "A Relational Model of Data for Large Shared Data Banks": describe what you want (relations = tables), system works out how. Data independence. -> A.
- O3 IBM slow (IMS made money); System R prototype + SEQUEL later SQL mid-1970s; Berkeley Ingres; Relational Software (later Oracle) first commercial SQL database 1979; Codd Turing Award 1981. -> A, B amused at Oracle.
- O4 Split: query layer says what, storage engine decides how; still every database; lesson is mostly the bottom half. -> A signpost.

## Failure one: every write rewrites everything

- I1 Term serialization format: turning objects into flat bytes and back. JSON is that, not a storage format; can't say "change value at byte 4,812"; bytes after a change shift; whole file rewrite. -> A; B suggests seeking and patching; A explains shifting bytes.
- I2 Term O(N): cost proportional to number of records; twice the data, twice the time for the same one-record change. -> A says "order N" in words with meaning.
- F1 Figure 001 / measurement: M4 Pro, Python 3.14, 100-byte values, safe temp+rename every put: 100 keys 20 KB 0.19 ms; 1,000 keys 130 KB 0.53 ms; 10,000 keys 1.2 MB 4.2 ms; 100,000 keys 12 MB 43 ms -> about 23 writes per second; log scale, each step 10x data, about 10x time; append-only log stays near 4 µs at every size. -> A gives numbers aloud as a ladder, B does the writes-per-second.
- I3 fsync made no visible difference at large N: rewrite dwarfs one Mac fsync. -> A.
- I4 Linear, back-of-envelope: json.dump a few hundred MB/s, 12 MB is tens of ms; a million keys about half a second per put; two saves a second and nothing else. -> B extrapolates; A confirms.

## Failure two: crash in the middle

- I5 Term truncate: "w" cuts file to zero bytes before anything new is written; crash during dump = neither old nor new. Temp+fsync+rename fixes it but every save is a full copy plus fsync. Crash-safe yes, crash-safe and cheap to update no. -> A, recap of files lesson.

## Failure three: two writers

- F2 Figure 002: worker A reads [x], adds a, saves [x, a]; worker B read [x] before A saved, adds b, saves [x, b]; "a" erased; atomic rename makes each save whole, not inclusive of other's change. -> B voices "but the rename is atomic"; A walks the timeline.
- I6 Term lost update: same as counter += 1 race in threads lesson; file instead of integer, processes instead of threads. -> A, recap of threads lesson.
- I7 Lock on the file (flock): only one worker at a time and each turn costs a full rewrite; workers queue behind a 43 ms save. -> B proposes the lock; A gives the cost.
- PR1 Predict: two processes, 2,000 distinct keys each, reload before every put, per-process temp + rename; how many of 4,000 survive? Answer 2,015, almost exactly half; same speed so each mostly loaded a file the other was about to overwrite; no errors, no corrupt JSON; SQLite same loop 4,000 of 4,000. -> A asks, B guesses (a few lost), reveal.

## Failure four: finding one record

- I8 Parse all to read one key: 100,000 keys about 21 ms json.load; dict lookup well under a microsecond. Load once and keep in memory -> stale copy, back to failure three. "Every URL that returned 429 since yesterday" = loop over everything; nothing on disk organized by status or time. -> A, B suggests keeping it in memory.

## What a storage engine is

- I9 Problems one, two, four are about how bytes are laid out on disk (change one record alone, tell half-written from whole, find without reading everything). Three and the question-asking part of four are a layer above. -> A.
- I10 Term storage engine: part that stores and retrieves records on disk; put, get, delete, usually scan a range in key order (some engines); decides on-disk layout. -> A in words, no code read.
- I11 Everything sits on top: a SQLite table is an engine structure keyed by row ID; an index on a column is another keyed by that column; MySQL lets you swap engines (InnoDB, MyISAM). -> A.

## The simplest engine: just append

- I12 Cheapest thing is adding to the end: no bytes move, nothing rewritten, sequential writes are what disks and page cache are best at. Never update in place; put appends key, value; change appends another; newest wins. Term append-only log. -> A.
- I13 Writes constant time; reads terrible: scan the whole log, keep the last match. Worse than JSON. -> B points this out.
- I14 Fix: dict in RAM from key to where its newest record starts; Term offset (position in bytes from start; offset 4,812 is the 4,813th byte); Term hash index (in-memory hash table, a Python dict basically). -> A.
- I15 put = append then index[key] = offset; get = one hash lookup and one small read; delete = Term tombstone appended + remove from index (needed because replay would bring the key back). -> A; B asks why not just remove from index, A explains replay.
- I16 Old records still in file, nothing points at them, garbage, dealt with later. -> A.
- O5 Origin Bitcask 2010: Basho building Riak, distributed KV modelled on Amazon's Dynamo paper; each node needed a local engine; 2009 options slow, complicated, or hard to recover. Justin Sheehy and David Smith wrote requirements (low latency per read/write, high write throughput, crash friendliness, easy backups, simple code) and the simplest design met nearly all. Paper "Bitcask: A Log-Structured Hash Table for Fast Key/Value Data": append-only data files, in-memory hash table called keydir, background merge. Riak's default backend. Idea back to log-structured file systems, Rosenblum and Ousterhout 1991: turn every write into a sequential append. -> A as story.
- F3 Figure 003 interactive: index in RAM on left (key -> segment + offset), log on disk on right split into segments, only last appended to; stale records crossed out; buttons put/get/delete/compact/crash/replay, tear the last write toggle; readouts log bytes, live bytes, garbage percent. Crash wipes index not log; replay rebuilds by reading every record in order; torn write: replay stops at half-written record and truncates. -> A describes what you'd see clicking it.
- I17 Things to notice: every change is an append (put, delete, tombstone); only compaction touches old bytes and it writes new files. The index is a cache of the log: losing it costs time not data. Garbage grows with overwrites not keys: put a fifty times, fifty records, one live. -> B voices "a crash loses the index, so you lose data"; A corrects.

## Records that can prove they're whole

- I18 Layers recap: write() puts bytes in page cache, returns, kernel writes later. Process dies (kill -9, OOM, segfault): what's in page cache is safe, kernel finishes; lost is the Python-side buffer and in-memory index. Machine dies (power, kernel panic): anything not fsynced may be lost, partially: first 2 KB on flash, last 2 KB not. Term torn write. -> A, B wrong model "kill -9 will leave half records".
- I19 Each record carries its length and a Term checksum (small number from bytes; any change almost certainly changes it; store, recompute, compare); specifically Term CRC32 (cyclic redundancy check, 32 bits, fast, catches flipped bits and truncation; not cryptographic, doesn't stop forging; zlib.crc32). Computed over everything after it. -> A.
- F4 Figure 004: 12-byte header: CRC32 4 bytes, key length 4, value length 4, then key, value (tombstone: none); CRC covers all after it. Log after power cut: a=v1 ok, b=v1 ok, a=v2 ok, c=v1 half; truncate there. Header says 112 bytes follow, file has 40; or all bytes there, CRC mismatch. -> A like a diagram over the phone.
- I20 Recovery loop: read 12 bytes, if not 12 stop; unpack, if not enough bytes stop; recompute CRC, mismatch stop; else apply (set offset or delete for tombstone), repeat; truncate where you stopped so next append starts clean. -> A in steps, spoken.
- I21 Stop at first bad record, not skip: appended in order, so everything after a torn record came after the crash point. Downside: mid-log corruption truncates everything after; real systems distinguish torn tail vs middle corruption and refuse to start on the latter. -> B asks why not skip; A answers.
- PR2 Predict: one write() per ~4 KB record then flush, kill -9 at random; how often a torn record? Essentially never; three times (266 MB, 362 MB, 628 MB logs) zero torn bytes; one write call per record, kill -9 lands between syscalls, not mid-copy; page cache belongs to kernel. Why CRC then: power cut/kernel panic can tear; record bigger than buffer split across write calls; write() may write fewer bytes than asked. Build tears on purpose two ways. -> A asks, B guesses wrong (sometimes), reveal.

## Durability: when is a put really done?

- I22 CRC tells whole, doesn't make it survive; need fsync after append. Mac 100-byte put 3.7 µs without, 28 µs with plain fsync; macOS caveat F_FULLFSYNC costs milliseconds; Linux consumer SSD honest fsync hundreds of µs to a few ms; measure the Spark. -> A with comparisons.
- I23 Dial three positions: no fsync (fast, survives process crash, loses recent writes on power loss, log still consistent just shorter); fsync every put (every acknowledged put survives anything short of disk dying; throughput capped: 3 ms -> about 330 puts/s); fsync every N puts or few ms, acknowledge only after covering fsync: Term group commit; one 3 ms fsync covering 500 puts = 6 µs per put. -> B asks "doesn't batching risk losing writes?"; A: not acknowledged ones.

## Compaction

- I24 Log only grows; crawler rechecking same 100,000 URLs daily appends 100,000 a day, live stays 100,000; after a month 97% garbage. -> A.
- I25 Term compaction (merging): walk index, copy each live record to new file, fsync, atomic rename over old, fsync directory: the crash-safe save recipe; crash during compaction leaves old log untouched, partial temp deleted on startup. -> A, recap files lesson.
- I26 Test: 1,000 keys x 100 overwrites; 11.6 MB log, 116 KB live; compaction 5.5 ms, exactly 1%. -> A.
- I27 Segments: series of files, only active one appended; closed at size limit; closed segments never change so compacted in background while writes continue; index switches pointers when done. That's the segments in figure 003. -> A.
- I28 Hint files: recovery reads entire log; Bitcask merge writes small hint file per merged data file with keys and offsets, no values; startup reads hints, megabytes instead of gigabytes. -> A.
- I29 Recovery cost: warm page cache, 100,000 small records 48 ms; 628 MB log of 156,000 4 KB records 156 ms. Cold bounded by read speed, few GB/s on good NVMe: 50 GB log tens of seconds to start. -> B does arithmetic.

## What this design can't do

- I30 Bitcask good: one disk read per get, one sequential append per put, trivial crash recovery, code in your head. -> A.
- I31 Every key in RAM: Python 1 million keys about 180 MB index; Bitcask Erlang/C keydir tighter but tens of bytes per key plus the key; a billion small keys hundreds of GB of RAM. Values can exceed RAM; keys can't. -> A, B computes.
- I32 No range queries: hash has no order; URLs starting with a prefix or records 9 to 10 am means walking every key. Failure four half-solved. Fixing those two is where the two big engine families come from. -> A.

## Write-ahead logging

- I33 Log is truth, index a rebuildable view; most databases keep data in a tree but keep the log too. Term write-ahead logging (WAL): append description of change, fsync log, then apply lazily, write whenever convenient; crash: replay to redo. -> A.
- I34 Why write twice: shapes differ; log append small sequential, only thing to fsync before "committed"; structure changes are scattered random writes, batched later in big chunks, or overwritten in memory five times before written once; turns "durably update complex structure" into "durably append bytes". -> B voices "writing twice must be slower"; A corrects.
- I35 Seen twice: ext4 journal is a WAL for filesystem metadata; Bitcask is degenerate case where log is the data structure. -> A.
- I36 Term checkpoint: flush changed pages, note everything before log position X applied, discard log before X; bounds recovery, same job as compaction and hint files. -> A.

## Two engine shapes

- I37 Two answers to "keys don't fit in RAM and I want ranges": both keep keys sorted (range scans free); differ in update in place. -> A.
- F5 Figure 005: B-tree left (root g|p, three leaf pages, put(k) rewrites the 4 KB page, WAL fsync first; SQLite, Postgres, InnoDB; reads fast one place, writes random). LSM right (memtable in RAM + WAL; full -> flush to L0 sorted files; merge to L1 one copy each key; get checks memtable then newest to oldest; Bloom filters skip files; LevelDB, RocksDB, Cassandra; writes fast sequential, reads may check several files). -> A over the phone.
- I38 B-trees: Bayer and McCreight early 1970s; Term page (fixed block read/written as unit, commonly 4 to 16 KB; SQLite default 4 KB, Postgres 8 KB; matches disk and page cache); hundreds of keys per page so 3-4 levels for billions of rows; write finds leaf and changes in place after WAL; reads one page per level, top levels cached; SQLite, Postgres, InnoDB, most databases. -> A; B asks how three levels can cover billions, A gives the hundreds-per-page reason.
- I39 LSM-trees: O'Neil and others 1996; Bitcask grown up; writes to WAL + Term memtable (in-memory sorted structure, often skip list or balanced tree); full -> written as Term SSTable (sorted string table, immutable, small index of where key ranges start) in one sequential write; background compaction merges, drops overwritten values and tombstones, output stays sorted; Term Bloom filter (compact bit array, "definitely not" or "maybe", few bits per key); only sparse sample of keys in RAM; LevelDB, RocksDB, Cassandra, storage under many big distributed databases. -> A.
- I40 Trade-off: B-trees more work on writes, cheap reads; LSM less work on writes, pay on reads and background compaction. Indexes lesson builds the B-tree. -> A, B restates.

## Everything else a database does

- I41 Engine gives crash-surviving put/get; database wraps three jobs, each answering a failure. -> A.
- I42 Concurrency control (failure three): one big lock; row locks; several versions so readers never wait: Term MVCC (write creates new version, reader sees snapshot as of start, doesn't block writers; Postgres). Term transaction: group of reads/writes as one indivisible step, all or none, nobody sees half; its own lesson. -> A; B fuzzy on transactions (diagnostic gap), A makes it concrete with the crawler.
- I43 Query language (failure four): say what, "select url from fetches where status is 429 and timestamp after something", Term query planner (turns declarative query into plan: which index, join order, or scan; Postgres EXPLAIN shows it); add an index on status next month, same query faster without code change; data independence fifty-five years later. -> A, B connects to Codd.
- I44 Durability guarantees (failures one and two): explicit promise of when committed means survives power cut, tunable; Term ACID (atomicity, consistency, isolation, durability, each in words); D is a setting; know which position yours is in. -> A.

## SQLite

- I45 Term SQLite: embedded SQL database, C library linked into your program, whole DB in one ordinary file, no server, Python's sqlite3. Full SQL with B-tree storage, transactions, planner, crash recovery. D. Richard Hipp 2000, software for a US Navy destroyer, program depended on a DB server that when down made program useless. Docs: "does not compete with client/server databases; competes with fopen()". The thing to use instead of your JSON file. -> B voices "SQLite is a toy"; A answers with this.
- I46 Most deployed database engine probably (every iPhone, Android, major browser, Python stdlib); hundreds of times more test code than library code, tests simulating power loss at every write. -> A.
- I47 Rollback journal (default, journal mode DELETE): copy original page to -journal file, fsync, then change; crash -> next open copies originals back; undo log not redo, same idea; writer locks whole DB during commit. -> A.
- I48 WAL mode: changes appended to -wal file; readers read DB file plus what WAL says changed; readers don't block writer and vice versa; still one writer, second waits (Python sqlite3 up to 5 seconds default, timeout argument); periodic checkpoint back into main file. -> A.
- I49 synchronous pragma is the fsync dial: FULL default fsyncs every commit; NORMAL in WAL mode fsyncs less: survives process crash, last few may be lost on power loss, never corrupted. macOS: plain fsync unless fullfsync on. -> A.

## When SQLite, when Postgres

- F6 Figure 006: SQLite inside your Python process (your code, then libsqlite3 as a function call: parser+planner, file locks one writer, B-tree 4 KB pages, journal/WAL+fsync; no network hop, microseconds per query) -> app.db plus -wal, one file, copy to back up (while nothing writes, or .backup / VACUUM INTO). Postgres: app 1, app 2, psql over TCP/unix socket to server processes (one backend per connection, parser/planner/executor, MVCC and row locks many writers, shared buffers own page cache, B-tree 8 KB pages, WAL; auth, roles, replication) -> data dir with tables and pg_wal, many files owned by server. Same layers; differ in who runs them and how many writers. -> A over the phone.
- I50 SQLite when one machine owns data: CLI, crawler cache, eval harness results, desktop/phone app, single-server web app modest writes, test fixture; zero setup; query is a function call not a round trip. Limit: one writer for whole DB; thousands of small write transactions per second fine; many machines writing same file not; NFS explicitly warned against (file locking unreliable). -> A.
- I51 Postgres: many processes on many machines writing at once, users and permissions, replication to standby, point-in-time recovery, ecosystem (pgvector embeddings, PostGIS maps, JSONB columns for documents). Cost: server to run, connections, network hop per query. -> A.
- I52 Crawler: SQLite today; fleet on twenty machines -> Postgres or something built for scale. -> B asks for the verdict.
- PR3 Predict: log put 4 µs no fsync; SQLite defaults autocommit per insert? and all in one transaction? Answer: defaults (rollback journal, FULL) about 295 µs, about 80x slower; each commit creates journal, fsyncs, writes page, fsyncs, deletes journal. WAL + NORMAL about 16 µs. WAL + FULL about 51 µs (same promise as log with fsync at 28 µs). One transaction 100,000 inserts about 1.3 µs, faster than Python log, per-row work in C and one commit. Transaction is the unit of cost; batch writes. Reads: log 0.6 µs (dict + pread), SQLite WAL 1.8 µs, within 3x of bare dict. -> A asks, B guesses, reveal.

## Build It

- B0 Folder ~/workbench/kv, standard library only (json, os, struct, zlib, sqlite3, time); same three methods for every store; timing harness: fresh() deletes leftover files, time puts/gets averaged, prints Python and SQLite versions; values are bytes, JSON must decode them, one more mismatch. -> one sentence or two.
- B1 v1 JSON store: load whole file; put updates dict then saves whole dict crash-safely (tmp, flush, optional fsync, replace). Time N = 100 to 100,000: fill dict directly, time 100 real puts, print ms per put and file size, fsync on and off; predict 10x. -> A: what you'd see (the ladder).
- B2 v2 log: record format little-endian crc 4, key length 4, value length 4, key, value; value length all ones (max 32-bit) = tombstone; CRC covers the rest. Index maps key to (value offset, value length). _append builds one record, one write call, flush, fsync if sync, returns start offset. get = one dict lookup then pread (read at offset without moving shared file position). recover reads from start, three checks, apply, truncate, print bytes cut. Hints: crc32 unsigned; build as one bytes object for single write (that's what kill -9 can't tear); seek to end + tell for offset; index stores where value starts (record offset + 12 + key length); one read() of whole file in recover fine but memory grows with log, real engine reads chunks. Test: three keys, overwrite, delete, reopen. -> A: the parts that matter, no code.
- B3 Crash tests: writer puts 4 KB values forever; run, sleep a second, kill -9, reopen, count keys; repeat with different sleeps; note size, keys, truncated bytes, recovery time. Then _put_torn: write half the record, flush, SIGKILL itself; recovery truncates exactly the half record. Then flip one byte in last record's value (ten bytes from end, XOR 1): lengths fine, only CRC catches. -> A as three kinds of damage.
- B4 Compaction: write live values to .compact, flush+fsync, replace, fsync dir, reopen; test 1,000 x 100; kill during compaction (sleep 5 in loop) -> original intact. Agent review question: put arriving during background compaction? Why Bitcask compacts only closed segments. -> A, B answers the background question.
- B5 SQLite wrapper same interface: autocommit (isolation level None), pragmas journal mode and synchronous, table kv(k text primary key, v blob); insert or replace, select, delete. Time log with/without fsync (2,000 puts fsync, 100,000 otherwise), SQLite (DELETE, FULL), (WAL, FULL), (WAL, NORMAL), 100,000 in one BEGIN...COMMIT; time LogKV open (recovery) on 100k log. Pair by promise: log+fsync ~ WAL FULL; log no fsync ~ WAL NORMAL roughly. -> A.
- B6 Two writers: JSON loads, adds NAME-i, per-process temp + replace; SQL inserts in WAL autocommit timeout 10; run A and B 2,000 each concurrently; count. Then shared temp filename two.json.tmp and see other errors. -> A.
- B7 Spark: copy over Tailscale, rerun t1, t3, t5, t6; fsync row moves most since Linux fsync really flushes; agent reviews for unfairness: timing file creation in some runs, warm vs cold page cache. -> A.
- B8 Done when: three stores pass same test; LogKV survives kill -9, torn half, flipped byte keeping earlier records; compaction shrinks to live and kill-during leaves old; Measure table Mac and Spark with predictions first; can explain why two JSON writers lose data and SQLite doesn't. -> folded into flow, not listed.

## Measure

- M1 Mine: M4 Pro, macOS, APFS, Python 3.14, SQLite 3.53; shape over exact numbers. -> A.
- M2 JSON 10x keys 10x time; O(N) per put so O(N squared) to build N keys one put at a time; 43 ms nearly all serialization and copying 12 MB, fsync noise. -> A, "order N squared" said in words with example.
- M3 Log about 4 µs regardless of size: function call, small bytes object, one write syscall into page cache, dict store; within factor two of files lesson's "4 KB write only" number. Get 0.6 µs. -> A.
- M4 fsync dominates: 3.7 -> 28 µs Mac, Spark likely more. SQLite default about 10x slower again than log with fsync (several fsyncs, create/delete file); WAL within 2x of log at same promise with B-tree, SQL, transactions. -> A.
- M5 One transaction faster than Python log, 1.3 µs; single most useful SQLite performance fact. -> A.
- M6 Recovery: ~50 ms per 100k records; scales with log size not key count; cold slower; drop page cache on Spark and try. Compaction 11.6 MB -> 116 KB in 5.5 ms, reopening 0.4 ms. -> A.
- M7 kill -9 at 0.5, 0.7, 1.1 s: 0 torn bytes each time; chopped tail truncated 2,787 bytes, flipped byte 4,021 bytes: exactly the damaged last record; CRC is for crashes kill -9 can't produce: power loss, split writes, silent corruption. -> A.
- M8 Two writers: JSON 2,015 of 4,000, SQLite 4,000 of 4,000; SQLite didn't make them faster, made them take turns (file lock + busy timeout) and each insert changed one row not the whole world. SQLite writer kill -9'd mid-loop: integrity check ok. -> A; B voices "so SQLite is just faster".

## Break It

- K1 JSON written in place with a reader running: reader hits JSON decode error regularly, opened between truncate and end of dump; no crash needed; database never shows half-written state; that's the I in ACID; why temp+rename exists. -> what-if exchange.
- K2 Remove CRC check: flip value byte -> loads, get returns wrong value no error; flip length byte -> garbage header, stops early losing everything after, or tries to allocate a 4 GB key. Silent wrong answers worse than crashes; why SQLite WAL, Postgres WAL, RocksDB blocks, ZFS checksum. -> exchange.
- K3 Two LogKV writers on same file: appends both land (append mode goes to current end), log fine, reopen finds everything; but each process's index only knows its own puts; A can't get what B wrote. No concurrency control, just a log. Ways out: locks, single writer process, server in front; SQLite and Postgres each picked one. -> B guesses log gets corrupted; A corrects.
- K4 Fill RAM: 10 million keys, watch process memory; 1M was ~180 MB so expect a couple of GB; multiply by URLs TinyFish's crawlers know; Bitcask's hard limit; reason next lesson is about trees. -> exchange.

## Explain It Back (substance must appear)

- E1 Four things: constant-ish update cost; crash leaves last committed version via log+checksums+fsync; many clients without erasing via locks/versions/transactions; questions without reading everything via indexes + planner. JSON can be crash-safe with temp+rename but stays O(N), no concurrency control, full scan. -> end of storage engine/everything-else section and the closing.
- E2 Bitcask description: log of records with CRC, lengths, key, value; RAM hash table key -> file and offset; put appends + updates; delete tombstone; get one lookup + one read; replay + truncate at first short/bad record; compaction + hint files; limits keys in RAM, no ranges. -> spread over idea section; B restates once mid-episode.
- E3 WAL: append + fsync log, apply lazily; replay after crash; faster because log small sequential and only thing durable at commit; real changes batched; checkpoint bounds log; filesystem journals, SQLite WAL, Postgres, LSM. -> WAL section.
- E4 Scaling 1M -> 1B keys, writes 10x: JSON dead long before (seconds per put at a few million keys); Bitcask writes and gets same cost but index needs every key in RAM: hundred-plus bytes per key in real implementation -> around a hundred GB; recovery/hints at startup long; move to sorted engine. B-tree grows a level per hundreds-fold more data; billion keys 4-5 page reads with top cached; writes random page + WAL; 10x writes more fsyncs, group commit amortizes. LSM absorbs 10x writes best (sequential), cost background compaction I/O and several files per read (Bloom filters). Past one machine shard keys across machines, each runs one of these engines. -> its own exchange near the end of the engines section, B asks the scale question naturally.
- E5 SQLite vs Postgres + trap: autocommit each statement own commit with own fsyncs, hundreds of µs each vs about a µs in one transaction; WAL mode and batch. -> SQLite predict + closing.

## Go Deeper / Connections

- G1 Kleppmann DDIA chapter 3 (lesson follows its path); Bitcask paper six pages. -> one sentence.
- C1 Next: indexes lesson fixes keys-in-RAM and ranges; transactions lesson takes apart concurrency box; caching/Redis is an in-memory hash table with an append-only log. -> one or two sentences before the ending.

## Flow

Problem scene (P1-P6) -> Codd origin (O1-O4) -> four failures with figure 1 numbers, lost-update
figure, predict 1 (I1-I8, PR1) -> storage engine definition (I9-I11) -> append-only log and hash
index, tombstones, Bitcask origin, interactive figure, things to notice (I12-I17, O5, F3) -> CRC and
torn writes, recovery loop, predict 2 (I18-I21, F4, PR2) -> durability dial, group commit (I22-I23)
-> compaction, segments, hints, recovery cost (I24-I29) -> limits (I30-I32) -> WAL, checkpoint
(I33-I36) -> B-tree vs LSM, scaling question E4 (I37-I40, F5) -> concurrency/query/ACID
(I41-I44) -> SQLite, modes, synchronous (I45-I49) -> SQLite vs Postgres figure, predict 3 (F6,
I50-I52, PR3) -> Build It walkthrough (B0-B8) -> Measure (M1-M8) -> Break It (K1-K4) ->
connections (G1, C1) -> B restates (E1), A sharpens.
