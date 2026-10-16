# Outline: indexes

Source: src/lessons/indexes.mdx. Curriculum entry: "Indexes and B-trees."
Question: what is a database index, why does it make reads fast, and why does it make writes slower?
Why: the single most common fix for a slow query, and the root of many slow writes.

Each item: what the lesson teaches -> how it is said aloud.
Diagnostic gaps touched: DB indexes (fuzzy, the main target), Numbers (page reads in microseconds,
MB vs GB, SSD vs RAM), and "heap" confusion (he thought memory heap = heap data structure; here
"heap" means a third thing, a pile). B voices the natural wrong models: "an index is some kind of
hash/magic lookup the database keeps", "the index makes the table sorted", "the database should
just index everything", "binary search on a sorted file is good enough", "the planner is being dumb
when it ignores my index", "5.6% of rows means reading 5.6% of the table", "an index on (a, b)
helps any query on a or b", "more indexes is just more disk space".

## Prerequisites (re-explained in passing)

- R1 Latency ladder: RAM vs SSD about a thousand times; random SSD read about eighty microseconds. -> A recaps when converting levels to time.
- R2 Files lesson: data moves in fixed-size blocks; page cache = kernel's copy of recent file data in spare RAM; WAL/fsync background. -> A at "what's on disk" and at the write bill.
- R3 Why-databases lesson: appending to a log is the cheapest write; Bitcask hash-of-offsets store he built. -> A at LSM and hash index.

## The Problem

- P1 Scene: clicks table for the ranker (who clicked, which doc, which query, dwell), 5 million rows after a few months; select all where user id is 4242. -> A opens on this, query said in words.
- P2 200 ms; dashboard runs it for 50 users per page load = 10 s per page. -> A, B does the multiplication.
- P3 "Just add an index", one line, 0.1 ms; two thousand times faster; the line of SQL took one second to run. -> A.
- P4 Suspicious: data same, CPU same; where did 199.9 ms go? Why not index every column? -> A, B voices "why not index everything".
- P5 The bill: ingestion job half speed after someone added five indexes "to be safe". -> A.
- P6 Promise: what an index is on disk byte for byte; predict both numbers. -> A one line.

## Origin

- O1 Late 1960s, Rudolf Bayer and Edward McCreight at Boeing research labs; files too big for memory; disks with moving arm and spinning platter, tens of ms per random read. -> A story.
- O2 Sorted file allows binary search, but a million records = about 20 jumps = most of a second; keeping sorted means rewriting huge parts. -> A, B works out 20 x tens of ms.
- O3 1970 paper "Organization and Maintenance of Large Ordered Indices": every node one disk block, hundreds of keys, wide and short; handful of block reads; inserts rewrite few blocks. -> A.
- O4 Nobody knows what B stands for (Boeing, balanced, broad, Bayer). -> A, B amused.
- O5 1979 Douglas Comer "The Ubiquitous B-Tree"; Postgres, MySQL, SQLite, SQL Server, Oracle, most filesystems use a variant. -> A.

## The Idea: phone book

- I1 Box of 5 million index cards in arrival order; finding user 4242 = look at every card = full table scan (Postgres: Seq Scan, sequential scan); cost grows with table size not answer size; one card or a thousand, read all. -> A.
- I2 Phone book: sorted by the thing you search; you can jump to the middle. Two properties. -> A.
- I3 Can only sort one way; want by user, doc, time; so build a second small box: user id + note of where the real card is ("box position 1,844,210"), sorted by user id; binary search it, follow notes. -> A; B voices "so the index sorts the table" and A says no, the table stays as is.
- I4 Definition of index: separate structure, copies of columns in sorted (or hashed) order each with pointer to row; exists only to make lookups fast. Rest is making it fast on disk and what keeping it sorted costs. -> A.

## The Idea: what's on disk

- I5 Pages: fixed-size blocks, 8 KB Postgres, 16 KB InnoDB, 4 KB default SQLite; never reads less than one page. -> A.
- I6 Heap: table's main file, rows in pages in roughly arrival order wherever there's space; means "a pile", nothing to do with heap data structure or process heap. -> B trips on "heap" (diagnostic gap), A clarifies it's a third meaning.
- I7 ctid: row's address = page number + slot, e.g. page 1,844 slot 3. -> A.
- I8 Index on user id is a different file: pairs of (user id, ctid), sorted by user id, in 8 KB pages. -> A.
- F1 Figure 001: left four table pages with users in arrival order, 4242 in page 0, 1, 3; right sorted index entries, the three 4242 entries together each pointing to page/slot; seq scan reads all 4 pages; index finds 4242 and follows 3 pointers. -> A describes like a diagram over the phone.
- I9 The index is a copy: duplicates user id plus 6 bytes address plus bookkeeping; on the 5M table, table 365 MB, primary key index 107 MB; copies kept in sync = write-cost story later. -> A.
- I10 Sorted isn't enough: one long sorted file of 13,000 pages, binary search about 14 jumps, each a page read; random SSD read ~80 µs so about 1.1 ms; on Bayer's disk with ~10 ms seeks, 140 ms. Each jump only rules out half. Want 99.7% per jump. -> B voices "binary search is fine", A does numbers.

## The Idea: B-trees

- I11 Reading a page costs the same whether you use 8 bytes or all 8,192; so make every page carry max direction. -> A.
- I12 Leaf pages: cut sorted index into pages of a few hundred entries; bottom layer; entries key + row pointer; each leaf links to next. -> A.
- I13 Inner page: signpost page listing first key of each leaf and its page number ("1 to 13,580: page 1; from 13,581: page 2"); like letter tabs; also called internal/branch. Stack signposts until one root. -> A.
- I14 B+tree: inner pages only separator keys, all entries in leaves, leaves chained left to right. Search: root, pick child, repeat, one page per level. -> A.
- F2 Figure 002: root 500; inner 200/350 and 650/800; six leaves; search 270: left (under 500), middle child (between 200 and 350), leaf has it; three pages. Range 270 to 600: descend once, walk right along leaf chain, stop at 649 leaf. Drawing has 3 keys per page; real holds hundreds. -> A describes.

## The Idea: why about four levels

- I15 Fan-out: number of children per inner page; roughly page size / entry size. -> A.
- I16 Leaf entry: 8-byte bigint key + 8-byte header incl. 6-byte address + 4-byte slot in page directory = ~20 bytes. -> A, B asks why not just 8.
- I17 8,192 bytes minus header; leaves filled to 90% at build; 8,150 x 0.9 / 20 ≈ 367 entries per leaf; inner fan-out also high 300s. -> A in words, small worked example.
- I18 5M / 367 ≈ 13,600 leaves; x 8 KB = 107 MB, exactly what Postgres reports. -> A; B checks it.
- I19 13,600 / 367 ≈ 37 inner pages; fits in one root; height 3. -> A.
- I20 Each level x367; three levels ~49 million; four levels 18 billion; height almost always 2 to 4. -> A.
- I21 Time: all from SSD uncached 3-4 x 80 µs ≈ 0.3 ms; realistically root and second level hot in RAM (Postgres cache or OS page cache), cold lookup 1-2 SSD reads + 1 table page, well under a ms; all in RAM a few µs mostly binary search inside page. -> A, with page cache re-explained.
- I22 Full scan of 5 GB at ~3 GB/s: well over a second. -> A.
- F3 Figure 003 interactive: sliders for rows, key bytes, page size 4/8/16 KB; shows levels stacked with page counts, shaded levels under 64 MB stay cached; lookup time at 80 µs/read; full scan estimate at 100-byte rows, 3 GB/s. 10,000x more rows adds about two levels; 32x bigger key costs one or two. -> A: "what you'd see as you drag".
- I23 Logarithm: how many times you multiply by base to reach a number; log base 367 of 49 million is 3; grows absurdly slowly. Binary tree = log base 2 = ~23 levels for 5M rows = 23 page reads; why no binary trees on disk. -> A.
- PR1 Predict: bigint PK, 5M -> 1B rows (200x): how many more reads, how much bigger index? Answer: one more read (3 to 4): 1B/367 ≈ 2.7M leaves, /367 ≈ 7,400, /367 ≈ 20, root. Index grows 200x, 107 MB to ~21 GB. Lookups scale with log, storage and full scan with size. Top three levels ~7,400+20+1 pages ≈ 60 MB, stays in RAM; cold lookup still ~1 SSD read into index + 1 into table. -> A asks, B guesses (wrong on index size, or "a few more"), reveal.

## The Idea: inserts and page splits

- I24 Insert 42: walk down as search, slide into place in leaf; usually room, one page changed. -> A.
- I25 Page split: full leaf -> new page, move top half, link into leaf chain, insert separator into parent; parent full -> splits too; worst case climbs to root, root splits, new root above. -> A.
- I26 B-tree grows at the top not the bottom; all leaves same depth; always balanced; no unlucky search; nobody rebalances. -> A; B voices "doesn't it get lopsided".
- F4 Figure 004 interactive: pages hold 3 or 4 keys; insert 22, 23, 24: first splits a leaf; third splits leaf, overflows parent, splits root, new root, every leaf one deeper at once. Search counters: tree reads one page per level, scan reads leaves from left; 40-key limit; scan cost grows with leaves, tree's with height; +5 in order leaves half-empty leaves. -> A walks through what you'd see.
- I27 Search cost is the height and it barely moves: 3 keys/page reaches height 4 around 40 keys; real ~367 per page, height 4 holds tens of billions. -> A.
- I28 Pages often not full: split leaves two half-full; random inserts average ~70% full (classic result, measured in Break It); ascending keys always land in rightmost leaf; toy splits 50/50 so leaves trail of half-empty leaves; real databases split rightmost page unevenly, keep old page full -> auto-incrementing key gives compact index. -> A.

## The Idea: back to the table

- I29 Leaf gives a ctid not the row; SELECT * must read table page; PK lookup = 3 index pages + 1 table page = what EXPLAIN with BUFFERS shows: shared hit 1, read 3 = four 8 KB pages, root already cached. -> A, the readout said in words.
- I30 Many matches scattered: one table page per row; 56 clicks for user 4242 = 56 different table pages, arrived at 56 different times. Reason the planner sometimes refuses your index. -> A.

## The Idea: clustered vs secondary

- I31 Postgres: heap + secondary indexes; every index including PK is separate B-tree pointing at ctids; secondary index definition (separate, points at row, many per table). -> A.
- I32 InnoDB, SQLite, SQL Server usually: clustered index; table is a B-tree by PK, leaves hold full rows; only one per table because rows sorted one way; PK range scan reads consecutive pages. -> A.
- I33 Secondary indexes on clustered tables store PK value not physical address; secondary lookup = two descents. -> A; B asks why not store address.
- T1 Table compare: PK lookup Postgres = descent + 1 heap page, InnoDB = one descent; secondary Postgres = descent + heap page, InnoDB = secondary + PK descent; row moves: Postgres new version means indexes get new entries; InnoDB secondaries unaffected. -> A says the two key contrasts, not row by row.
- I34 Neither better; matters choosing PK: on InnoDB a random UUID scatters inserts across whole table, and every secondary index carries a copy of that 16-byte key. -> A.
- I35 Correlation: statistic per column from -1 to 1, physical order vs sorted order; 1 = sorted on disk; in pg_stats; created at near 1 (inserted in time order), user id near 0. -> A.

## The Idea: covering indexes

- I36 Covering index: contains every column a query needs; index-only scan; Postgres still checks small visibility map; after VACUUM almost no table pages. -> A, visibility map in one plain sentence.
- I37 Two ways: extra column in key (user id, dwell) or INCLUDE as passengers not in sort order. -> A.
- I38 Numbers: avg dwell over 1,000 users (50,000 rows): 66 ms with plain index reading 30,846 table pages; 2.9 ms covering, about 140 index pages, zero table pages. Catch: bigger copy. -> A.

## The Idea: composite and leftmost prefix

- I39 Composite index (user id, created at): sorted by first column then second within ties; like phone book last name then first name; also multi-column. -> A.
- F5 Figure 005: same 8 entries two ways; query user 4242 since June 1. Left (user, time): matches contiguous, descend once, read 3 keep 3. Right (time, user): everything since June 1 contiguous but 4242 scattered, read 6 throw 3 away. On 5M: 23 pages vs 7,322. -> A describes; B voices "doesn't matter, both columns are in it".
- I40 Leftmost-prefix rule: (a,b,c) helps a; a and b; all three; useless for b alone; phone book sorted by last name doesn't find everyone called Wei. -> A.
- I41 Recipe: equality columns first; then at most one range or ORDER BY column (after a range, later columns aren't sorted); then optionally INCLUDE read-only columns. -> A.
- I42 Dashboard query user = ? and created at >= ? order by created at limit 20 -> (user id, created at); rows come back in order so sort and limit free, reads 20 entries and stops. -> A.

## The Idea: selectivity and the planner

- I43 Query planner (optimizer): considers several ways, picks cheapest per cost model; statistics from ANALYZE: most common values and frequencies, histogram, distinct count, correlation. -> A.
- I44 Selectivity: fraction of rows matched; 4242 = 56 of 5M (0.001%); country US = 39%. -> A.
- I45 Seq scan reads 46,729 pages in order at full speed (readahead, big requests); index scan reads index + one table page per match, random order; at 39% spread evenly nearly every page has a match, read whole table anyway, randomly, plus index. -> A; B voices "the planner's being dumb".
- I46 random page cost 4 vs seq page cost 1 default, chosen in spinning-disk era; crossover a few percent depending on row width and correlation. -> A.
- I47 Bitmap scan: collect matching addresses into a bitmap of pages, then read pages in physical order; Bitmap Index Scan + Bitmap Heap Scan. -> A.
- I48 Trap: country FR 5.6% of rows, bitmap scan, still read all 46,729 pages because ~107 rows per page, almost every page has a French click. Selectivity in pages not rows. -> B guesses 5.6% of pages, A corrects.
- I49 Reasons the index is ignored: 1 not selective enough (planner usually right); 2 column wrapped (lower(email), user id + 0, created at cast to date), fix bare column or expression index (index on result of expression); 3 leftmost column unconstrained; 4 tiny table; 5 stale or wrong stats after big load until ANALYZE/autovacuum; correlated columns fool it (assumes independence); 6 cost settings vs hardware, SSD people set random page cost ~1.1, change only if measured faster. -> A as a conversational run, B adds one.

## The Idea: the write bill

- I50 Insert into table with five indexes: write row to heap page; for each index descend and insert, maybe split; record all page changes in WAL (write-ahead log, append-only, fsynced at commit before data pages, replayed after crash). -> A, WAL re-explained.
- I51 One row = six insertions; random values each on different leaf likely not cached. -> A.
- I52 UPDATE worse: Postgres never overwrites in place; new row version elsewhere; every index needs new entry. HOT update: skip index work if no indexed column changed and new version fits same page; reason not to index constantly-updated columns. -> A; B voices "an update just changes the value".
- I53 Write amplification: one logical write -> many physical; indexes also cost space, cache (compete with table pages for RAM), VACUUM time. -> A.
- PR2 Predict: bulk insert 1M rows: none 0.6 s; PK; PK + 4 (user id, doc id, query text, created at). Answer 0.6 / 1.0 / 7.0 s on M4 Pro. PK adds 60% (ascending -> rightmost leaf hot, cheap splits); 4 extra add 6 s; created at ascending cheap; user id, doc id, query random, different leaf of three growing trees; text compare slower (language-aware sorting rules not raw bytes). One-row-at-a-time: ~42k rows/s none vs 22k with five; commit fixed overhead. -> A asks, B guesses, reveal.

## The Idea: LSM-trees

- I54 B-tree updates in place; each insert small random write; some systems take far more writes than reads: event logs, metrics, message stores, the click log at scale. -> A.
- I55 Append to a log is the cheapest write (from why-databases). LSM-tree = log-structured merge-tree; RocksDB, LevelDB, Cassandra, ScyllaDB, HBase. -> A.
- I56 Write: append to log for crash safety, insert into memtable (sorted in RAM, skip list or balanced tree, tens of MB); no disk page read or rewritten. -> A.
- I57 Flush: memtable at a size (RocksDB default 64 MB), one sequential pass to SSTable (sorted string table: immutable sorted file with small index of block starts); fresh memtable. -> A.
- I58 Compact: background merge like merge sort's merge, keep newest version, drop deleted; levels each ~10x bigger. -> A.
- F6 Figure 006: writes to log + memtable in RAM; flush down to level 0 files newest to oldest; compaction into L1 one sorted run ~10x, L2 ~10x more; bloom filter per file; read memtable, L0 newest to oldest, L1, L2, stop at first hit. -> A describes.
- I59 Reads pay: key could be anywhere; sparse index per file = at most one block read per file; bloom filter: compact bit array says definitely not or maybe; ~10 bits per key -> wrong "maybe" ~1%; skips files. -> A; B asks how it can be sure about "no".
- T2 Table B-tree vs LSM: insert random in-place vs sequential append + later compaction; point read one descent ~1 cold read vs memtable + bloom ~1 file read; range walk leaves vs merge across files; space ~70% full vs compact but old versions linger; hidden cost splits/fragmentation vs compaction bandwidth. -> A says as a contrast, not rows.
- I60 Rule of thumb: read-heavy with updates -> B-tree; ingest-heavy append-mostly -> LSM; Postgres and MySQL B-tree; RocksDB embedded LSM (also a MySQL storage engine); Cassandra, ScyllaDB LSM. -> A.

## The Idea: hash indexes

- I61 Only "is X here and where" -> hash key to bucket; dict of indexes; one-step (O(1)) lookups, no order, no ranges/sort/prefix. -> A.
- I62 Postgres has them (USING hash, crash-safe since version 10), only equality; B-tree is 3-4 mostly cached pages so stays default; shine in memory: Redis is a giant hash table; Bitcask = hash table of key to file offset in RAM over append-only log, which he built in why-databases. -> A.

## Build It

- B0 Task 0 setup: Postgres 17 in Docker or Homebrew; psql; timing on; clicks table (id bigint PK, user id, doc id, query text, dwell ms, country, created at); generate series makes 5M rows inside DB: ~100k users ~50 clicks each, ~1M docs, ~50k distinct queries, countries weighted 4 of 10 US, created at every 5 s from Jan 1 so time order = insert order; VACUUM ANALYZE; expect 365 MB, 107 MB, 46,729 pages; ~7 s load. -> A one stretch, setup in a sentence or two, the parts that matter (time order, US weighting).
- B1 Task 1: guess time and plan first; EXPLAIN ANALYZE BUFFERS (ANALYZE runs it for real; BUFFERS counts 8 KB pages; hit = Postgres cache, read = asked OS, might be OS page cache). Query user 4242; with parallel off = one core; PK lookup id 3,000,000 account for each buffer; create index on user id timed, size, rerun. pageinspect: bt_metap level of root (2 means height 3); bt_page_stats live items, avg item size, free size; compare with 367 x 20. Hint: user id index much smaller than PK despite same entry count: B-tree deduplication (Postgres 13): repeated keys stored once with list of addresses; user id has ~50 per value, id unique. -> A; B asks why smaller. (Dedup mechanism is a derived explanation, phrase as what the docs describe.)
- B2 Task 2: index on country, ANALYZE; count and avg dwell for US and FR; force index (disable seq scan and bitmap scan), compare, reset; look at most common vals/freqs in pg_stats; correlation for user id, created at, id, predict range cost; write two queries that wrap the column (arithmetic, cast/function) and confirm; one sentence per result, in pages not rows. -> A.
- B3 Task 3: dashboard query and daily report query; drop old indexes; try (user id, created at) then (created at, user id), both queries each; predict buffers within factor of 10 with figure 005. Covering: avg dwell for users 4000-4999, plain vs INCLUDE dwell; VACUUM then look for index only scan and heap fetches 0; before vacuum on fresh copy -> visibility map explanation. -> A.
- B4 Task 4: measure write bill: bulk 1M insert into copy with 0, PK, 5 indexes, TRUNCATE between, CHECKPOINT between runs; pgbench one-row-per-transaction 10 s, 4 clients, against 5M-row table with 0/1/5 indexes; agent reviews fairness: cache from previous run, table size not same, autovacuum mid-run, connection setup. -> A.
- B5 Task 5: write B+tree in plain Python with bisect; Leaf (keys, vals, next), Inner (keys, kids, one more kid than keys); find leaf returns leaf + path; search, insert with splits upward and new root, range via leaf chain, height. Hints: child to follow = kid at bisect right of key (off by one loses separator-equal keys); leaf split: upper half to new leaf, fix next, first key of new leaf copied up, stays in leaf; inner split: middle key moves up, removed from both halves (most common bug); start order 3, print levels, compare with figure 004. Check vs dict/sorted list: 200k random keys, every key found, missing returns None, 200 random ranges match, height; orders 3, 4, 64, 256. -> A explains shape and the parts that matter; B voices the leaf-vs-inner asymmetry confusion.
- B6 Task 6: race 1M random inserts: tree (order 128), sorted list with insort (start at 100k), dict; 100k searches tree vs bisect left. -> A.
- B7 Done when: Measure table filled with predictions first; explain each EXPLAIN line and page count; bt_metap and arithmetic agree on height; B+tree passes orders 3, 4, 64, 256 and height for 1M at order 128 is 3. -> A one sentence.

## Measure

- M1 user 4242 no index one worker: seq scan 198 ms, 46,729 pages; parallel default 2 workers 64 ms; three processes 3x faster but can't close a 790x gap in work. -> A.
- M2 CREATE INDEX user id 0.97 s, 34 MB; with index: bitmap scan 0.10 ms, 3 index + 56 table pages; ~2,000x; ~790x gap in pages explains most, rest CPU checking 5M rows. -> A; B asks where the rest comes from.
- M3 PK lookup id 3,000,000: index scan 0.017 ms, 4 pages = 3 levels + 1 table; bt_metap root level 2. -> A.
- M4 US 39%: planner parallel seq scan 112 ms; forced index 86 ms, faster; all in RAM (365 MB fits in page cache of 48 GB machine), random = sequential cost, random page cost 4 too pessimistic; cold cache/slower disk planner right; why people lower random page cost on SSD. Check your run. -> A, honest surprise.
- M5 FR 5.6%: bitmap, 96 ms, all 46.8k pages. -> A (ties to I48).
- M6 Composite: dashboard (user, time) 0.04 ms 23 pages vs (time, user) 36 ms 7,322 pages; day count (user, time) seq scan 81 ms vs (time, user) index only 1.5 ms 70 pages; winner flips; indexes designed for queries not columns. -> A; B notices the flip.
- M7 Covering: 66 ms bitmap 30,846 table pages -> 2.9 ms index only, 0 heap fetches. -> A.
- M8 Writes: bulk 0.62 / 1.01 / 7.03 s, 11x slower with five; pgbench ~42k / ~46k / ~22.5k rows/s, only 2x slower because each pays a commit; macOS default commit doesn't force SSD cache flush (files lesson) so one-row commits cheap; expect fewer on Linux with real flush. -> A; B notices 46k > 42k? (lesson doesn't explain; A says it's noise-level / don't over-read? Not claimed in lesson; keep: A says "basically the same" only.)
- M9 B+tree 1M inserts order 128: 6.1 s, height 3; insort 280 s; dict 0.16 s. insort binary search fast but shifts every later element: average quarter million pointers, ~2 MB moved per insert, ~2 TB total; why no big sorted array on disk (each insert rewrites half the file); B+tree shifts only inside one node; dict 40x faster than tree because no order = hash index trade measured. -> A; B guesses insort is fast because binary search.
- M10 Run each twice, keep second (first pays for loading pages into cache); versions/disks differ, ratios shouldn't. Results on M4 Pro, Postgres 16, warm cache. -> A one line.

## Break It

- K1 Random primary keys: 3 tables (id, v int) 3M rows: ascending bigint 9.5 s, 64 MB; random bigint 29 s, 79 MB; UUID 96 s, 123 MB; REINDEX random -> 64 MB; random pages ~73% full vs 90%; UUID 16 bytes bigger; each insert dirties different leaf; full page image in WAL first change after checkpoint -> random keys multiply WAL volume; use time-ordered IDs (UUIDv7, snowflake). -> A; B voices "UUIDs are just the normal way to make IDs".
- K2 Stale stats: 1M US rows, ANALYZE, then 1M FR rows, EXPLAIN FR before autovacuum; estimated rows wildly differ from actual; ANALYZE changes plan; most "randomly terrible plan" stories. -> A.
- K3 Break your B+tree: inner split keeps middle key in right half -> which test fails first, why search still works for most keys; bisect left off-by-one in find leaf -> which keys go missing; checker should catch both. -> A, short exchange.
- K4 Index everything: index every column, rerun bulk insert; indexes size vs table (bigger than table common); idx scan in pg_stat_user_indexes: most never used, every one paid on every insert. -> A, ties to P5.

## Explain It Back (substance must be in the conversation)

- E1 Index physically: separate B+tree in same fixed pages, sorted copy of columns + pointers; without it read every page; descent narrows few-hundred-fold per read; 3-4 reads for billions; then one table page; whole table -> ~4 pages. -> B's closing restatement plus throughout.
- E2 Scaling 1M to 10B: fan-out ~370 (8 KB / ~20 B); 1M: ~2,700 leaves, 8 inner, root = 3; 10B: 27M leaves, 74,000, 200, root = 4; 10,000x data = one more read; top levels hot; cold lookup 1-2 SSD reads ~100-200 µs; linear: index size (~200 GB at 10B), total insert cost, full scans. -> A in the levels section as a second worked example.
- E3 Ignored index four reasons + checks: estimated vs actual rows in EXPLAIN ANALYZE and pg_stats frequency; wrapped column -> rewrite/expression index; leftmost column; stale stats -> ANALYZE; cost settings -> if forced seq-scan-off consistently faster consider lowering random page cost; tiny table. -> A in planner section, with "how you'd check".
- E4 Ingestion 2x slower: every insert writes row + one entry per index, descents, splits, WAL; random-value indexes hit uncached leaves vs ascending; updates new version unless HOT. Do: drop indexes idx scan shows unused; merge overlapping ((user, created at) makes (user) redundant); big backfills drop secondaries, load, rebuild in one sorted pass; time-ordered keys; overwhelmingly writes -> LSM. -> A after the write bill / Break It 4.
- E5 B-tree vs LSM in a minute. -> A at the end of LSM, B restates.

## Go Deeper / Connections

- G1 Kleppmann DDIA chapter 3 (read next); Use The Index, Luke by Markus Winand. -> A one sentence.
- C1 Next: transactions (why new row versions), caching/Redis (hash idea in RAM), vector search (embeddings can't be sorted; how to index 100M). -> A one or two sentences before the close.

## Flow

Problem scene -> Origin -> phone book -> on disk (heap gap) -> binary search not enough -> B-tree
-> height arithmetic + figure 003 + predict billion + 10B worked example -> splits + figure 004 ->
back to table -> clustered vs secondary -> correlation -> covering -> composite -> planner and
selectivity (with E3 checks) -> write bill + predict -> LSM -> hash -> Build It (Postgres tasks
interleaved with their Measure numbers? No: Build It first as "here's what you'd do", then Measure
as the numbers) -> Break It -> E4 practical advice -> connections -> close: B restates (index =
sorted copy, reads fast), A sharpens (pages, not rows; every copy paid on every write).
