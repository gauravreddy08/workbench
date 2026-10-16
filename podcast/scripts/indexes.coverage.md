# Coverage: indexes

Lesson src/lessons/indexes.mdx vs podcast/scripts/indexes.md. Item IDs match
podcast/outlines/indexes.md. No item MISSING after the check; numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| R1 latency ladder, ~80 µs SSD, 1000x RAM | What's on disk | "a random read from an SSD is around eighty microseconds" | covered |
| R2 blocks, page cache, WAL/fsync | What's on disk; Four levels; Write bill | "Same idea as the files lesson"; "quick reminder from the files lesson" | covered |
| R3 append-only log cheapest; Bitcask store | LSM; Hash | "appending to a log is the cheapest write there is"; "exactly the store you built" | covered |
| P1 clicks table, 5M rows, user 4242 | Problem | "Give me every click where the user ID is forty-two forty-two" | covered |
| P2 200 ms x 50 = 10 s | Problem | "so ten seconds a page" | covered |
| P3 one line, 0.1 ms, 2000x, one second | Problem | "two thousand times faster" | covered |
| P4 where did 199.9 ms go; why not index all | Problem | "hundred and ninety-nine point nine milliseconds" | covered |
| P5 five indexes, half speed | Problem | "five indexes \"to be safe\"" | covered |
| P6 predict both numbers | Problem | "predict both of those numbers" | covered |
| O1 Bayer, McCreight, Boeing, disks tens of ms | Origin | "Rudolf Bayer and Edward McCreight" | covered |
| O2 binary search ~20 jumps, most of a second, rewriting | Origin | "binary search on a million records is about twenty jumps" | covered |
| O3 1970 paper, node = block, wide and short | Origin | "Organization and Maintenance of Large Ordered Indices" | covered |
| O4 what B stands for | Origin | "Boeing, balanced, broad, Bayer" | covered |
| O5 Comer 1979, who uses it | Origin | "The Ubiquitous B-Tree" | covered |
| I1 full table scan, Seq Scan, cost vs table size | Phone book | "Postgres calls it a Seq Scan" | covered |
| I2 phone book: sorted + jump | Phone book | "sorted by the thing you're searching for. And you can jump" | covered |
| I3 second small box, sorted by user, position note | Phone book | "one million eight hundred forty-four thousand two hundred ten" | covered |
| I4 index definition | Phone book | "An index is a separate data structure" | covered |
| I5 pages 8/16/4 KB, never less than a page | On disk | "the database never reads less than one page" | covered |
| I6 heap = a pile (diagnostic gap) | On disk | "It's a third meaning ... heap just means \"a pile\"" | covered |
| I7 ctid page + slot | On disk | "page eighteen forty-four, slot three, is a C T I D" | covered |
| I8 index file of (user id, ctid) | On disk | "Its entries are pairs: a user ID, and a C T I D" | covered |
| F1 figure 001 | On disk | "If you drew it, you'd have two columns" | covered |
| I9 index is a copy; 365 MB / 107 MB | On disk | "three hundred sixty-five megabytes ... a hundred and seven" | covered |
| I10 13,000 pages, 14 jumps, 1.1 ms, 140 ms, 99.7% | On disk | "about one point one milliseconds"; "ninety-nine point seven percent per jump" | covered |
| I11 page costs the same, carry direction | B-trees | "whether you use eight bytes of it or all eight thousand one hundred ninety-two" | covered |
| I12 leaf pages, chained | B-trees | "They're called leaf pages" | covered |
| I13 inner/signpost pages, root | B-trees | "keys one through thirteen thousand five hundred eighty" | covered |
| I14 B+tree definition, one page per level | B-trees | "that's called a B plus tree" | covered |
| F2 figure 002 search 270, range 270-600 | B-trees | "Search for two seventy"; "you stop there, because you've passed six hundred" | covered |
| I15 fan-out | Four levels | "That's called the fan-out" | covered |
| I16 ~20-byte entry breakdown | Four levels | "call it twenty bytes per entry, not eight" | covered |
| I17 90% fill, ~367 per leaf | Four levels | "Roughly three hundred sixty-seven entries per leaf" | covered |
| I18 13,600 leaves = 107 MB exact | Four levels | "Which is exactly the size Postgres reports" | covered |
| I19 37 inner, height 3 | Four levels | "Height three" | covered |
| I20 49 million / 18 billion, 2-4 | Four levels | "around forty-nine million keys. Four levels, about eighteen billion" | covered |
| I21 SSD 0.3 ms; hot top levels; RAM few µs | Four levels | "About a third of a millisecond"; "a few microseconds" | covered |
| I22 5 GB scan at 3 GB/s > 1 s | Four levels | "Well over a second" | covered |
| F3 figure 003 interactive | Four levels | "There's a little calculator for this" | covered |
| I23 logarithm; binary tree ~23 levels | Four levels | "about twenty-three levels, so twenty-three page reads" | covered |
| PR1 predict billion rows: +1 read, 200x, 21 GB, 60 MB top | Predict | "From a hundred and seven megabytes to roughly twenty-one gigabytes" | covered |
| I24 insert into leaf | Splits | "To insert key forty-two" | covered |
| I25 page split, cascade, new root | Splits | "Then you get a page split" | covered |
| I26 grows at top, balanced | Splits | "A B-tree grows at the top, not the bottom" | covered |
| F4 figure 004: 22, 23, 24, counters, +5 in order | Splits | "Insert twenty-two, and a leaf splits" | covered |
| I27 height 4 around 40 keys vs tens of billions | Splits | "you hit height four around forty keys" | covered |
| I28 ~70% full, rightmost uneven split | Splits | "average about seventy percent full"; "split it unevenly" | covered |
| I29 ctid not row; hit 1 read 3 | Back to table | "buffers: one hit, three read" | covered |
| I30 56 clicks = 56 pages | Back to table | "fifty-six different table pages" | covered |
| I31 Postgres heap + secondary | Clustered | "every index in Postgres is what's called a secondary index" | covered |
| I32 clustered index, one per table | Clustered | "That's called a clustered index" | covered |
| I33 secondary stores PK, two descents | Clustered | "So a lookup through a secondary index on Inno D B is two descents" | covered |
| T1 comparison table | Clustered | "Postgres has the opposite trade" | covered |
| I34 UUID scatters, 16-byte copy | Clustered | "every secondary index carries a copy of that sixteen-byte key" | covered |
| I35 correlation | Clustered | "It's called correlation" | covered |
| I36 covering, index-only, visibility map | Covering | "That's a covering index"; "visibility map" | covered |
| I37 key vs INCLUDE | Covering | "carry it as a passenger" | covered |
| I38 66 ms / 30,846 vs 2.9 ms / 140 / 0 | Covering | "two point nine milliseconds. About a hundred and forty index pages" | covered |
| I39 composite, phone book last/first | Composite | "Like a phone book sorted by last name, then first name" | covered |
| F5 figure 005, 23 vs 7,322 | Composite | "twenty-three pages versus seven thousand three hundred twenty-two" | covered |
| I40 leftmost prefix, Wei | Composite | "first name is Wei" | covered |
| I41 recipe | Composite | "Columns you compare with equals go first" | covered |
| I42 dashboard query, sort and limit free | Composite | "Postgres reads twenty entries, and stops" | covered |
| I43 planner, ANALYZE stats | Planner | "There's a part of the database called the query planner" | covered |
| I44 selectivity 56/5M, US 39% | Planner | "That's a thousandth of a percent" | covered |
| I45 seq vs index at 39% | Planner | "you end up reading the whole table anyway. In random order" | covered |
| I46 random_page_cost 4, crossover few percent | Planner | "random page cost is four, seq page cost is one" | covered |
| I47 bitmap scan | Planner | "A bitmap scan" | covered |
| I48 FR 5.6% reads every page; ~107 rows/page | Planner | "Selectivity in rows isn't what matters. Selectivity in pages is." | covered |
| I49 six reasons ignored | Planner | "One, the condition isn't selective enough" ... "Six, the cost settings" | covered |
| I50 insert steps, WAL | Write bill | "records all of those page changes in the write-ahead log" | covered |
| I51 one row = six insertions | Write bill | "six B-tree or heap insertions" | covered |
| I52 UPDATE new version, HOT | Write bill | "called a HOT update, heap-only tuple" | covered |
| I53 write amplification, space, cache, vacuum | Write bill | "all of this is write amplification" | covered |
| PR2 0.6 / 1.0 / 7.0, reasons, 42k vs 22k | Predict insert | "Six tenths, one point oh, and seven point oh" | covered |
| I54 in-place random writes; write-heavy systems | LSM | "Event logs, metrics, message stores" | covered |
| I55 LSM name and users | LSM | "log-structured merge-tree" | covered |
| I56 write: log + memtable | LSM | "insert it into the memtable" | covered |
| I57 flush 64 MB, SSTable | LSM | "Rocks D B's default is sixty-four megabytes" | covered |
| I58 compaction, levels 10x | LSM | "And move three is compaction" / "roughly ten times bigger" | covered |
| F6 figure 006 | LSM | "If you sketched it, at the top, above a line marked disk" | covered |
| I59 sparse index, bloom filter ~10 bits ~1% | LSM | "With about ten bits per key ... about one percent" | covered |
| T2 B-tree vs LSM table | LSM | "So the trade, roughly. Inserts:" | covered |
| I60 rule of thumb, who uses which | LSM | "Read-heavy, with updates to existing rows, B-tree" | covered |
| I61 hash index, no order | Hash | "It's basically the dict of indexes" | covered |
| I62 Postgres hash since v10, Redis, Bitcask | Hash | "crash-safe since version ten" | covered |
| B0 setup, generate series, sizes, 7 s | Build It Postgres | "about three sixty-five megabytes ... forty-six thousand seven hundred twenty-nine pages" | covered |
| B1 task 1, buffers hit/read, pageinspect, dedup hint | Build It Postgres | "B-tree deduplication" | covered |
| B2 task 2 planner says no | Build It Postgres | "Second task, make the planner say no" | covered |
| B3 task 3 composite + covering + visibility map | Build It Postgres | "Third task is column order" | covered |
| B4 task 4 write bill + fairness review | Build It Postgres | "Fourth task, measure the write bill" | covered |
| B5 task 5 B+tree shape, hints, checker | Build It B+tree | "In an inner split, the middle key moves up" | covered |
| B6 task 6 race | Build It B+tree | "And then race it" | covered |
| B7 done when | Build It B+tree | "And you're done when" | covered |
| M1 198 ms seq, 64 ms parallel, 3x vs 790x | Measure | "no amount of parallelism closes a seven hundred ninety times gap" | covered |
| M2 0.97 s, 34 MB, 0.10 ms, 3 + 56 | Measure | "Three index pages and fifty-six table pages" | covered |
| M3 PK 0.017 ms, 4 pages, root level 2 | Measure | "seventeen thousandths of a millisecond, four pages" | covered |
| M4 US 112 vs 86 ms, why | Measure | "the U S query is the honest surprise" | covered |
| M5 FR 96 ms all pages | Measure | "ninety-six milliseconds, all forty-six thousand eight hundred pages" | covered |
| M6 composite 0.04/23 vs 36/7,322; day 81 ms vs 1.5 ms/70 | Measure | "The winner flips" | covered |
| M7 covering 66 -> 2.9 | Measure | "sixty-six milliseconds down to two point nine" | covered |
| M8 bulk 0.62/1.01/7.03; pgbench 42k/46k/22.5k; macOS flush | Measure | "point six two seconds, one point oh one, seven point oh three" | covered |
| M9 6.1 s / 280 s / 0.16 s; 2 MB, 2 TB; 40x | Measure | "around two terabytes moved in total" | covered |
| M10 run twice, ratios, M4 Pro PG16 | Measure | "Run each query twice and keep the second" | covered |
| K1 random PKs 9.5/29/96 s, 64/79/123 MB, 73%, WAL, UUIDv7 | Break It | "U U I D version seven, or snowflake IDs" | covered |
| K2 stale stats | Break It | "Second, stale statistics" | covered |
| K3 break your tree | Break It | "Third, break your own tree" | covered |
| K4 index everything | Break It | "And fourth, index everything" | covered |
| E1 index physically | Close | B: "An index is a second copy of a column, sorted, with pointers back" | covered |
| E2 1M to 10B arithmetic, 100-200 µs, 200 GB | Four levels | "twenty-seven million leaves ... seventy-four thousand inner pages" | covered |
| E3 ignored index reasons + checks | Planner | "compare the estimated rows to the actual rows" | covered |
| E4 ingestion slower: why + what to do | Break It | "drop the indexes the scan counts say nobody uses. Merge overlapping ones" | covered |
| E5 B-tree vs LSM one minute | LSM | "B-tree when you read a lot. L S M when you mostly write." | covered |
| G1 Kleppmann ch 3, Use the Index Luke | Close | "chapter three of Martin Kleppmann's" | covered |
| C1 transactions, vector search | Close | "That's vector search." | covered (caching/Redis link folded into hash section's Redis mention) |
