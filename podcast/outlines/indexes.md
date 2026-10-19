# Outline: indexes

Source: src/lessons/indexes.mdx. Curriculum: "Indexes and B-trees." What is a database index, why
does it make reads fast, and why does it make writes slower?

## The one big idea

An index is a second, sorted copy of a column, kept in pages so wide that a handful of reads finds
any row in a table of billions. Because it's a copy, every write has to keep it in sync, so it
speeds up the queries it was designed for and taxes every insert.

## Opening scene

His ranker's click log. A dashboard query that scans the whole table, someone adds one index, and
the same query is about two thousand times faster. Nothing about the data or the CPU changed. A
week later the ingestion job runs at half speed because someone added five indexes "to be safe".

## Wrong mental model B voices

Gaurav's diagnostic marked DB indexes as fuzzy. B voices the natural guesses: "adding an index
sorts the table", then later "if the planner ignores my index, the planner is being dumb", and "so
just index everything".

## Story beats

1. The suspicious speedup, and the bill a week later.
2. The card box: you can only sort the real box one way, so you build a small sorted box of notes
   pointing back. B: "so it sorts the table?" A: no, it's a copy. Hold onto "copy".
3. Origin: Bayer and McCreight at Boeing, spinning disks, every jump a physical arm move. Binary
   search still too many jumps. Insight: reading a page costs the same whether you use a little or
   all of it, so pack each page with hundreds of signposts. Wide, short tree. Nobody knows what the
   B stands for.
4. Why it's always about four levels: each level multiplies reach by hundreds. Table hundreds of
   times bigger costs one more read. Top levels stay in memory. Grows at the top on splits, so it
   is always balanced.
5. The planner refusing your index: each match costs a trip back to the table. Pages, not rows. A
   small slice of rows spread across every page means reading every page anyway. On my Mac the
   planner was slightly wrong once because everything was already in memory.
6. Column order: phone book by last name then first; useless for finding everyone called Wei.
   Indexes are designed for queries, not columns. A covering index skips the table entirely.
7. The bill: every insert updates every copy. Ascending keys land on the same hot page; random keys
   land somewhere different every time. Index everything and most go unused.
8. When writes dominate: the LSM-tree. Never edit in place; append, sort in memory, dump sorted
   files, merge in the background. Reads pay; a bloom filter says "definitely not here".
9. Build surprise: own B-tree against a sorted Python list. The list is hopeless because every
   insert shifts everything after it, which is exactly why databases don't keep one big sorted
   file. A dict beats both because it keeps no order.

Ending: B says it back as "make reads fast by sorting"; A sharpens: it's a copy built for a query,
counted in pages, paid for on every write.

## Numbers worth saying (five)

- About two thousand times faster (the opening).
- Half speed on ingestion after five indexes.
- Nineteen seventy.
- Hundreds of keys per page.
- About four reads for a billion rows.

## Left to the written lesson

Fan-out and height arithmetic, entry sizes, page sizes per database, EXPLAIN output and buffer
counts, the Measure table, random_page_cost, bitmap scans by name, heap and ctid, clustered vs
secondary index table, HOT updates, WAL detail, hash indexes, pageinspect, deduplication, stale
statistics, UUID keys, B+tree code and split hints, the leftmost-prefix rule's name, and all the
reading list.
