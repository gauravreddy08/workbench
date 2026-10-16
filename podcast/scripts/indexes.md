<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you're logging every click on your ranker's results. Into a Postgres table. Who clicked, which document, for which query, how long they stayed on it. You leave it running for a few months and it's got, what, five million rows. And then you write the most obvious query in the world for a debugging dashboard. Give me every click where the user ID is forty-two forty-two.

B: Select star, where user ID equals something. Yeah.

A: And it takes two hundred milliseconds. Which is fine! Until the dashboard runs it for fifty users every time the page loads.

B: [working it out] Fifty times two hundred... so ten seconds a page.

A: [dryly] Ten seconds a page. And someone on the team goes, "just add an index". You run one line. And the same query takes a tenth of a millisecond. That's two thousand times faster. From one line of SQL that took about a second to run.

B: [a bit unsure] Okay, and honestly my picture of an index is kind of... a magic lookup thing the database keeps on the side? Like a hash table? You turn it on and the query's fast. And if it's that good, I'd just turn it on for every column.

A: [thoughtful] Yeah, and that's the suspicious part. Nothing about the data changed. The CPU didn't get faster. So where did the other hundred and ninety-nine point nine milliseconds go? And if it's that good, why doesn't the database just index every column for you?

B: Because there's a catch.

A: [wry] Because there's a bill. A week later, the ingestion job, the one writing those clicks in, has slowed to half its speed. Because somebody added five indexes "to be safe". Same trade, other side. So by the end of this, you should know what an index actually is on disk, pretty much byte for byte. And you'll be able to predict both of those numbers before you run anything. The two thousand times, and the half speed.

<!-- section: Origin -->

A: And the thing that makes this work is older than Postgres by a lot. Late nineteen sixties, two people at Boeing's research labs, Rudolf Bayer and Edward McCreight. Their problem was really plain. Files of records too big to fit in memory, sitting on disks where every random read meant physically moving an arm across the platter and waiting for it to spin round to the right spot. Tens of milliseconds, every single read.

B: And sorting the file doesn't fix that? You'd binary search it.

A: You can. But binary search on a million records is about twenty jumps. Halve, halve, halve, twenty times. And twenty jumps on that disk is...

B: [working it out] Twenty times, call it thirty milliseconds... most of a second.

A: [nodding] Most of a second, for one lookup. And then keeping the file sorted while new records arrive meant rewriting huge chunks of it. So in nineteen seventy they published a paper called "Organization and Maintenance of Large Ordered Indices". It describes a tree where every node is exactly one disk block, and each block is packed with hundreds of keys. So the tree is very wide and very short. A search takes a handful of block reads, and an insert only ever rewrites a few blocks.

B: And B is for... binary? Block?

A: [amused] Nobody knows. Boeing, balanced, broad, Bayer. People have guessed all of them, and the authors never settled it. By nineteen seventy-nine there was a survey by Douglas Comer called "The Ubiquitous B-Tree", and, I mean, it still is. Postgres, My S Q L, S Q Lite, SQL Server, Oracle, most filesystems. All some variant of that one tree.

<!-- section: The Idea: A phone book -->

A: [warming up] So let's build it up from nothing. Imagine your five million clicks as a box of index cards. One card per click, in the order they happened. To find all of user forty-two forty-two's clicks, you have to look at every single card. That's called a full table scan. Reading every row and checking each one against your condition. Postgres calls it a Seq Scan, short for sequential scan. And the thing to notice about its cost is it has nothing to do with how many cards you actually want. Finding one card or a thousand, you read all five million. The cost grows with the size of the table, not the size of the answer.

B: Right. Which is the two hundred milliseconds.

A: That's the two hundred milliseconds. Now, a phone book is the fix everybody already knows. Names are sorted, so you open somewhere in the middle, see M, flip back toward G, and you're on the right page in a few flips. And that works because of two things. The entries are sorted by the thing you're searching for. And you can jump, straight to the middle, instead of reading from the front.

B: So the index sorts the table by user ID.

A: [gently] That's the natural guess, and it's not quite it. Because your clicks can only be sorted one way. And you want to search them by user, by document, by time. So you leave the big box alone. You build a second, small box next to it. One card per click, but each card only has the user ID on it, plus a little note saying where the real card is. Like, "box position one million eight hundred forty-four thousand two hundred ten". And you sort the small box by user ID. Now you binary search the small box, read the notes, and go pull exactly the real cards you need. The big box never moved.

B: Okay. So it's a second copy, sorted differently, with directions back.

A: That's literally the definition. An index is a separate data structure stored alongside a table. It holds copies of one or more columns, in sorted order, or sometimes hashed, and each entry has a pointer back to the row it came from. And it exists only to make lookups fast. That's the whole idea. Everything else is about making that small box fast on a real disk, and about what it costs to keep it sorted.

<!-- section: The Idea: What's actually on disk -->

A: So what's physically there. Postgres stores a table as a file chopped into pages. A page is a fixed-size block that the database reads and writes as one unit. In Postgres it's eight kilobytes. My S Q L's Inno D B uses sixteen. S Q Lite defaults to four. And the rule that matters is, the database never reads less than one page. Want one row, you read the whole eight kilobytes it lives in. Same idea as the files lesson, where data moves in fixed-size blocks.

A: And rows go into pages roughly in the order they arrive, wherever there's space. Postgres calls that file the heap.

B: [skeptical] Wait. Heap like... the heap data structure? Or the heap in my process, where malloc puts things?

A: [laughs] Neither, and that's honestly confusing. It's a third meaning. In Postgres, heap just means "a pile". The table's main file, rows in pages, in no particular order. That's it. No tree, no priority queue, nothing to do with your process's memory.

B: Okay. A pile. Got it.

A: And every row in the pile has an address. Which page, and which slot inside that page. Postgres calls that address the C T I D. So page eighteen forty-four, slot three, is a C T I D. And that's the thing indexes store to point at rows. So an index on user ID is a different file. Its entries are pairs: a user ID, and a C T I D. Kept in user ID order. Also stored in eight kilobyte pages.

A: [slowing down, describing] If you drew it, you'd have two columns. On the left, the table. Four pages stacked up, three rows each, and the users are all over the place. Seven thirty-one, twelve, forty-two forty-two in page zero. Eighty-eight, forty-two forty-two, three oh nine in page one. And so on. User forty-two forty-two shows up in page zero, page one, and page three, because those clicks just happened at different times. On the right, the index. One tall list, sorted. Two, twelve, twelve, eighty-eight, eighty-eight, and then a little highlighted run of three entries for forty-two forty-two, each one with an arrow going back across to the exact page and slot on the left. A full scan reads all four table pages on the left. The index finds forty-two forty-two because it's sorted, and then follows three arrows.

A: And two things to notice already. First, the index is a copy. It duplicates the user ID column, plus six bytes of address per row, plus a few bytes of bookkeeping. On the five-million-row table you'll build, the table's three hundred sixty-five megabytes, and the primary key index on its own is a hundred and seven. Copies take space, and copies have to be kept in sync. Hold onto that, because it's the whole write cost story later.

B: And the second?

A: Sorted isn't enough.

B: [skeptical] Why not? Binary search is, like, the textbook fast lookup. Log N.

A: [patient] Sure, on an array in RAM. But say the index were one long sorted file, thirteen thousand pages. You can binary search it. That's about fourteen jumps, since two to the fourteen is about sixteen thousand. And every jump lands on a different page. So that's fourteen separate page reads. Now, from the latency numbers lesson, a random read from an SSD is around eighty microseconds. Compared to RAM that's about a thousand times slower. So fourteen of those is about one point one milliseconds. And on Bayer's spinning disk, with seeks around ten milliseconds each, it's a hundred and forty milliseconds.

B: Which is still way better than reading everything.

A: Way better than a full scan. But each jump only rules out half of what's left. And we can do a lot better than half. We can rule out ninety-nine point seven percent per jump.

<!-- section: The Idea: B-trees -->

A: [leaning in] So here's the trick. Reading a page costs the same whether you use eight bytes of it or all eight thousand one hundred ninety-two. You paid for the whole thing either way. So when you read a page, make it carry as much direction as it possibly can.

A: Take that sorted index and cut it into pages of a few hundred entries each. Those are the bottom layer. They're called leaf pages. They hold the actual index entries, key plus row pointer, in sorted order. And each leaf has a link to the next leaf over, to its right. Now make one more page that just lists, for every leaf, the first key in it and that leaf's page number. Like, "keys one through thirteen thousand five hundred eighty, go to page one. Thirteen thousand five hundred eighty-one and up, page two." And so on. That's a signpost page. The real name is an inner page, also called an internal node or a branch node. It's like the letter tabs on the side of a phone book. And if one signpost page can't hold all the leaves, you make several. And then a signpost page above those. And you keep going until there's just one page sitting at the top. That's the root. Every search starts there.

B: So you read the root, it tells you which page next, you read that...

A: Pick the child whose range covers your key, read it, repeat, until you're standing on a leaf. One page per level. And that exact shape, where the inner pages only hold signposts, all the real entries live in the leaves, and the leaves are chained left to right, that's called a B plus tree. It's the variant every major database actually uses. When people say B-tree about a database, they almost always mean this.

A: Picture a small one. Three levels. At the top, a single box, the root, with one key in it, five hundred. Below it, two inner boxes. The left one says two hundred and three fifty. The right one says six fifty and eight hundred. And along the bottom, six leaves in a row, each holding three keys, with little links between neighbours. Search for two seventy. The root says, two seventy is under five hundred, go left. The left inner page says, it's between two hundred and three fifty, take the middle child. And that leaf has two hundred, two seventy, three forty-nine. Found it. Three pages.

B: And if I want a range, like two seventy to six hundred?

A: That's where the chain pays off. You do that same descent once, to find two seventy. And then you just walk right along the leaves. Next leaf, three fifty to four ninety-nine. Next, five hundred to six forty-nine. And you stop there, because you've passed six hundred. You never go back up the tree. And that drawing has three keys per page so it fits on a screen. A real page holds hundreds. And that number is everything.

<!-- section: The Idea: Why it's always about four levels -->

A: So how many children can one inner page point to? That's called the fan-out. Roughly, it's the page size divided by the size of one entry. High fan-out, short tree. So let's actually work it out for your clicks table's primary key, which is a big int. Eight bytes.

B: So eight kilobytes divided by eight bytes. About a thousand.

A: [amused] That's what I'd guess too, and it's off by about three. Because the entry isn't just the key. In Postgres, one leaf entry is the eight-byte key, plus an eight-byte header, and that header includes the six-byte row address. Plus four bytes in the page's own little directory of where each entry sits. So call it twenty bytes per entry, not eight.

B: Huh. More than double the key.

A: More than double. Now the page is eight thousand one hundred ninety-two bytes, minus a few dozen for its own header. And when Postgres builds an index, it fills each leaf to ninety percent, so there's room left for later inserts. So you've got about eight thousand one hundred fifty bytes, take ninety percent of that, about seven thousand three hundred, and divide by twenty. Roughly three hundred sixty-seven entries per leaf. And inner entries are about the same size, so the fan-out is also in the high three hundreds.

A: Now the table. Five million rows, three sixty-seven per leaf. That's about thirteen thousand six hundred leaf pages. Thirteen thousand six hundred times eight kilobytes is a hundred and seven megabytes. Which is exactly the size Postgres reports for that index.

B: [surprised] Exactly? From that napkin math?

A: [pleased] Exactly. The arithmetic's real. Then the next level up. Thirteen thousand six hundred leaves, divided by three sixty-seven, is about thirty-seven inner pages. And thirty-seven pointers fit easily in one root. So: root, one level of inner pages, leaves. Height three.

A: And every extra level multiplies what the tree can hold by about three sixty-seven. Three levels hold about three sixty-seven cubed, which is around forty-nine million keys. Four levels, about eighteen billion. So when someone asks how deep the index is, the answer is almost always two to four. Whether the table has a thousand rows or a billion.

A: Same thing, one more time, a million rows up to ten billion, rounding the fan-out to three seventy. A million rows is about twenty-seven hundred leaves, then eight inner pages, then the root. Height three. Ten billion rows is twenty-seven million leaves. Divide by three seventy, seventy-four thousand inner pages. Again, two hundred. Then the root. Height four. Ten thousand times more data, and it costs you one more page read. What does grow in a straight line is the index's size on disk. One entry per row, twenty-ish bytes plus slack, so roughly two hundred gigabytes at ten billion rows. And the total insert cost, and any full scan.

B: Okay, but turn that into time for me. Because three page reads could be fast or slow depending where they come from.

A: Right, so each level is one page read, and it depends where the page is. Worst case, all from SSD, nothing cached: three or four reads at about eighty microseconds each. About a third of a millisecond. But realistically, the root's one page, and the level under it is a few dozen pages, and every single query touches them. So they stay in RAM. Either in Postgres's own cache, or in the OS page cache, which, quick reminder from the files lesson, is the kernel keeping recently used file data in spare RAM. A "disk read" that hits it costs microseconds, not tens of microseconds. So a cold lookup is really maybe one or two real SSD reads, so a hundred to two hundred microseconds, plus one for the table page. Well under a millisecond. And if the whole thing's in RAM, it's a few microseconds, and most of that is binary searching inside each page.

B: And the scan, by comparison?

A: Picture a full scan of a five gigabyte table at about three gigabytes a second. Well over a second. So, a few microseconds to a third of a millisecond, versus more than a second.

A: There's a little calculator for this you can play with. Three controls. A slider for row count, from a thousand up to ten billion. A slider for key size, from a few bytes up to a few hundred. And three buttons for page size, four, eight, or sixteen kilobytes. Underneath, the tree drawn as stacked levels, with how many pages are on each level. The top levels are shaded when they're under sixty-four megabytes, meaning they'd normally just sit in RAM. And a readout of lookup time against a full scan. And what you notice dragging it around is how little anything moves. Push the rows from a million to ten billion, that's ten thousand times more, and the tree gets about two levels taller. Make the key thirty-two times bigger, like a long text column instead of a big int, and you pay one or two more levels. Switch to sixteen kilobyte pages like My S Q L and it gets a bit shorter.

B: Because it's a logarithm.

A: Because it's a logarithm. And just to say it plainly, a logarithm is how many times you have to multiply by some base to reach a number. Three sixty-seven times three sixty-seven times three sixty-seven is about forty-nine million, so log base three sixty-seven of forty-nine million is three. And log with a base that big grows so absurdly slowly that, in practice, "log of the table size" is basically a constant. Compare a binary tree, where every node splits two ways. That's log base two. For five million rows that's about twenty-three levels, so twenty-three page reads. And that's why databases never use binary trees on disk.

<!-- section: The Idea: Predict, a billion rows -->

A: So try one. Your primary key's a big int. The table grows from five million rows to a billion. Two hundred times bigger. How many more page reads does a primary key lookup take? And how much bigger is the index?

B: [working it out] Okay... more reads, it's the log thing, so maybe one more? Two? And the index... I mean, if the tree only gets one level taller, the index barely grows? Like, a bit bigger?

A: [gently correcting] One more read is right. Height three to four. A billion divided by three sixty-seven is about two point seven million leaves. Divide again, about seventy-four hundred. Again, about twenty. Then the root. Four levels. But the index doesn't barely grow. It grows exactly in proportion. About two hundred times. From a hundred and seven megabytes to roughly twenty-one gigabytes.

B: Oh. Because every row still has its own entry down in the leaves.

A: One leaf entry per row. So the tree gets taller with the log of the size, but it gets fatter with the size itself. Lookups scale with the log. Storage, and the cost of a full scan, scale linearly. And here's the nice part. The top three levels at a billion rows are about seventy-four hundred pages, plus twenty, plus one. That's around sixty megabytes. Which easily stays in RAM. So even at a billion rows, a cold lookup is still about one SSD read into the index, plus one into the table.

<!-- section: The Idea: Inserts and page splits -->

A: Okay. Searching is the easy half. The hard half is that new rows keep arriving, and the leaves have to stay sorted.

A: To insert key forty-two, you walk down exactly like a search, to the leaf where forty-two belongs, and you slide it into place inside that page. Most of the time the page has room, and that's it. One page changed.

B: And when it doesn't have room?

A: Then you get a page split. You grab a new empty page, move the top half of the full page's entries into it, link it into the leaf chain, and then tell the parent, "keys from here up now live in this new page". Which means inserting one new separator key into the parent. Now if the parent's full too, it splits, and pushes a separator into its parent. And in the worst case, that climbs all the way up. The root splits, and a brand-new root gets made above it.

B: [skeptical] Doesn't that get lopsided over time, though? Like, if all my new keys go into one corner, that side gets deep and the other side doesn't?

A: [enthusiastic] That's the clever bit, and it's why it doesn't. A B-tree grows at the top, not the bottom. When the root splits, the new root goes above everything, so every leaf gets one level deeper at the same moment. Every leaf is always at exactly the same depth. So the tree's always perfectly balanced, no search is ever unlucky, and nobody ever has to go back and rebalance anything.

A: There's an interactive one where you can watch this. Tiny pages, three or four keys each, so splits happen constantly. You type a key and hit insert, it highlights the path it took and outlines any pages that split. Insert twenty-two, and a leaf splits. Twenty-three, fits. Then twenty-four, and you watch it cascade. The leaf splits, that overflows its parent, the parent splits, that overflows the root, the root splits, and a new root pops in at the top labelled "new root". And the whole bottom row drops down a level at once.

B: And there's a search side too?

A: Two counters. Search for a key, and one counter shows pages the tree read, which is one per level. The other shows what a scan would read, starting from the leftmost leaf and walking right until it hits the key. Fill it up toward its limit of forty keys, then search for big keys. The scan's count keeps growing with the number of leaves. The tree's only grows with the height. With three keys per page you hit height four around forty keys. With real pages of about three sixty-seven keys, height four holds tens of billions of rows.

A: And then there's a button, plus five in order, that inserts five keys that are each bigger than everything already there. Hit it a few times and look at the leaves it leaves behind.

B: [working it out] Half empty? Because every new key goes to the rightmost leaf, it fills, splits in half, and the left half never gets touched again.

A: Exactly that. And that's a real thing about pages, they're often not full. A split leaves two half-full pages. After lots of random inserts, B-tree pages average about seventy percent full. That's a classic result, and you'll measure it in Postgres. Now the toy splits fifty-fifty, so ascending inserts leave a trail of half-empty leaves. Real databases spot that case. When you split the rightmost page, they split it unevenly, so the old page stays full and the new one is nearly empty. Which is why an auto-incrementing key gives you a nice, compact index.

<!-- section: The Idea: Back to the table -->

A: Now, there's a second half to every lookup that's easy to forget. The index leaf gives you a C T I D, an address. Not the row. If you asked for select star, Postgres still has to go read the table page that row lives on. So "find one row by primary key" is really three index pages plus one table page. And that's exactly what you see if you run explain, with the analyze and buffers options turned on. It reports buffers: one hit, three read. Four eight-kilobyte pages total. The one hit is the root, which was already in Postgres's cache.

B: So four page reads. One per level, plus the row.

A: Four. And if the query matches lots of rows, and they're scattered around the table, that's one table page per row. User forty-two forty-two has fifty-six clicks. That means fifty-six different table pages, because those clicks arrived at fifty-six different times and landed wherever there was space in the pile. Hold onto that, because it's the reason the planner sometimes flat out refuses to use your index.

<!-- section: The Idea: Clustered vs secondary -->

A: And here's where the databases you'll actually meet disagree with each other. There are two ways to arrange a table and its indexes. Postgres does it the way we've been describing. The table's the unordered pile, and every index, including the primary key, is a separate B-tree whose leaves point at C T I Ds. So every index in Postgres is what's called a secondary index. Stored separately from the table, pointing at where the row lives. A table can have as many as you like.

A: Inno D B, which is My S Q L's storage engine, and S Q Lite, and usually SQL Server, do it differently. The table is the B-tree. Keyed by the primary key. And its leaves don't hold pointers, they hold the entire row. That's called a clustered index. Rows are physically sorted by primary key on disk. So a primary key range scan reads consecutive pages, no jumping around. And you can only have one, because rows can only be physically sorted one way.

B: And then the other indexes on that table point at... the page and slot, same as Postgres?

A: [shaking head] That's the obvious guess, and no. They store the primary key value instead of a physical address. So a lookup through a secondary index on Inno D B is two descents. One down the secondary index to find the primary key. Then another down the clustered index, to find the row.

B: That sounds strictly worse. Why not just store the address?

A: Because in a clustered table, rows move. A page splits, half its rows go somewhere else. If secondary indexes stored addresses, every split would mean fixing up every index. Storing the primary key means secondary indexes don't care when rows move around. Postgres has the opposite trade. A primary key lookup is one descent plus one heap page, and same for any secondary lookup. But when a row changes, Postgres writes a whole new version of it somewhere else, and the indexes need new entries pointing at it. On Inno D B, a primary key lookup is one descent and the row's right there in the leaf. A secondary lookup is two descents. But the secondary indexes are untouched when rows move.

A: Neither one's better. But it matters when you choose a primary key. On Inno D B, a random key, like a U U I D, scatters inserts across the whole table, because the table is sorted by it. And every secondary index carries a copy of that sixteen-byte key in every entry.

A: Oh, and one more thing on Postgres. If rows happen to be stored roughly in the order of some column anyway, an index range scan on that column reads neighbouring table pages for free. Postgres measures this per column. It's called correlation. A number from minus one to one, for how closely the physical order of rows matches the sorted order of that column. One means it's basically sorted on disk. You can see it in a system view called P G stats. On your clicks table, created at will be near one, because clicks get inserted in time order. User ID will be near zero.

<!-- section: The Idea: Covering indexes -->

A: Now, if every column a query needs is already in the index... why visit the table at all?

B: You wouldn't.

A: You wouldn't. That's a covering index. An index that contains every column a particular query needs, so the database can answer from the index alone. Postgres calls the plan an index-only scan. There's one small footnote. Postgres still checks a tiny side file called the visibility map, which tracks which table pages are known to have only rows every transaction can see. After a vacuum, which is Postgres's cleanup pass, almost every page is marked, so it touches almost no table pages.

A: And you can make one two ways. Put the extra column right in the key, so an index on user ID and dwell time together. Or carry it as a passenger that isn't part of the sort order. Postgres has an include clause for exactly that: index on user ID, include dwell time. On your table, averaging dwell time over a thousand users, that's fifty thousand rows, took sixty-six milliseconds with a plain index on user ID. It read thirty thousand eight hundred forty-six table pages. With the covering index, two point nine milliseconds. About a hundred and forty index pages, and zero table pages.

B: So twenty-something times faster just by not going back to the pile.

A: Yeah. And the catch is the same one from before. The index is a copy. Now it's a bigger copy.

<!-- section: The Idea: Composite indexes -->

A: Okay, this next one's probably the most useful single fact about indexes in practice. A composite index, also called a multi-column index, is an index on several columns at once. Say user ID and then created at. It's sorted by user ID first, and then, within each user, by time. Like a phone book sorted by last name, then first name. All of user twelve's entries together, in time order. Then all of user eighty-eight's. And so on.

B: [a bit unsure] And then it helps any query on user ID or created at, right? Both columns are in there.

A: [jumping in] That's the trap. The order decides which queries it helps. Picture the same eight entries sorted two ways, side by side. The query is user forty-two forty-two's clicks since June first. On the left, sorted by user then time. Twelve, January third. Twelve, June second. Twelve, June ninth. Then forty-two forty-two, February first. Then forty-two forty-two June third, June eighth, July first. Those three are your answer, and they're sitting right next to each other in one run. So you descend once, read three, keep three.

A: On the right, the same entries sorted by time, then user. Now everything since June first is one long run. But user forty-two forty-two is scattered through it. June second's user twelve, June third's forty-two forty-two, June fourth's fifty-one fifty, June eighth's forty-two forty-two, and so on. So you read six and throw three away. On five million rows, that's twenty-three pages versus seven thousand three hundred twenty-two. Same columns, same query, different order.

B: Huh. So the second column is only sorted inside each value of the first.

A: That's it exactly. And the general rule's called the leftmost prefix rule. An index on columns A, B, C is sorted by A first. So it helps queries that pin down A. Or A and B. Or all three. Any prefix from the left. But it's nearly useless for B alone. Same way a phone book sorted by last name doesn't help you find everyone whose first name is Wei.

A: So here's a decent recipe for ordering columns. Columns you compare with equals go first. Then at most one column you use for a range, like greater than or between, or for sorting. Because once you've got a range, the columns after it can't narrow anything. Within the range, they aren't sorted. And then, optionally, include the columns you only read, so it's covering. For the dashboard query, which is user ID equals something, created at after some date, ordered by created at, top twenty, that recipe gives you user ID then created at. And the index even hands the rows back already in time order. So the sort and the "top twenty" are free. Postgres reads twenty entries, and stops.

<!-- section: The Idea: Selectivity and the planner -->

A: Now. Why does Postgres sometimes just ignore your index? It doesn't run the first plan it thinks of. There's a part of the database called the query planner, or the optimizer. It considers several ways to run a query, scan the table, use this index, use that one, what order to join things in. And it picks whichever one its cost model says is cheapest. And it estimates those costs from statistics, gathered by a command called analyze. For each column, the most common values and how often they show up, a histogram of the rest, the number of distinct values, and that correlation number.

A: And the key number is selectivity. The fraction of rows a condition matches. User ID forty-two forty-two matches fifty-six out of five million. That's a thousandth of a percent. Very selective. Country equals U S matches thirty-nine percent. Not selective at all. And when a condition matches a tiny fraction, the index wins by a mile. When it matches a big fraction, the index loses.

B: [skeptical] Wait, loses? Even with the index right there, reading the index has to beat reading everything, doesn't it? Feels like the planner's just being dumb.

A: [calm] It feels that way, but you can actually work it out now. A sequential scan reads all forty-six thousand seven hundred twenty-nine table pages in order. And disks and the OS are great at in-order reading. They read ahead, they issue big requests, it goes at full speed. An index scan reads index pages, plus one table page per matching row, in random order. Now if thirty-nine percent of rows match, and they're spread evenly, nearly every page has a match on it. So you end up reading the whole table anyway. In random order. Plus the index.

B: Oh. So it's strictly more work.

A: More work, done the slow way. And Postgres prices that by default as a random page read costing four times a sequential one. There are two settings, random page cost is four, seq page cost is one. A number picked back in the spinning-disk era. And somewhere around a few percent of rows, depending on how wide the rows are and on correlation, those two lines cross and it switches to a scan.

A: And in between "a few rows" and "most rows", there's a middle option. A bitmap scan. Step one, scan the index and collect every matching address into a bitmap of table pages, basically a checklist of which pages have something. Step two, read those pages in physical order, each one once. It turns random table reads into sorted ones. In a plan it shows up as two lines, a bitmap index scan and then a bitmap heap scan.

A: But here's the subtle trap. On your table, country equals F R, France, matches only five point six percent of rows. And the planner picked a bitmap scan. Guess how many of the table's pages it read.

B: Five point six percent of the pages? So... two and a half thousand-ish?

A: [emphatic] All of them. Every one of the forty-six thousand seven hundred twenty-nine. Because there are about a hundred and seven rows on each page. If one row in eighteen is French, almost every page has at least one French click on it. So you read the page anyway. Selectivity in rows isn't what matters. Selectivity in pages is.

B: [quietly] Pages, not rows. Okay.

A: So, the usual reasons Postgres ignores your index, and how you'd check each. One, the condition isn't selective enough. That's the one we just did, and the planner's usually right. To check, run explain analyze, compare the estimated rows to the actual rows, and look up how common that value is in P G stats. Two, the query wraps the column in something. Lower of email equals something. User ID plus zero equals forty-two forty-two. Created at cast to a date. The index is sorted by the column, not by lower of the column, so the sort order doesn't apply anymore. The fix is to write the condition on the bare column, or build an expression index, which is an index on the result of that expression, like lower of email. Then Postgres can use it for queries containing that exact expression.

B: And the composite thing. Not giving it the leftmost column.

A: That's three. A query on created at alone can't use the user ID, created at index to seek. Four, the table's tiny. If it fits in a few pages, reading them all is cheaper than a descent. Five, the statistics are stale or wrong. After a big load, until analyze runs, and autovacuum does run it eventually, the planner might think the table's empty or the value's rare. Columns that move together fool it too, because it assumes conditions are independent. Six, the cost settings don't match your hardware. On SSDs, random reads aren't four times worse than sequential ones. A lot of people set random page cost to around one point one. But change it if you measure that the index plan really is faster. If you force the scan off and the index plan wins consistently. Not before.

<!-- section: The Idea: The write bill -->

A: Okay. Now the bill. When you insert one row into a table with five indexes, Postgres writes the row into a heap page. Then, for each index, it descends from the root to the right leaf and inserts an entry, maybe splitting pages. And then it records all of those page changes in the write-ahead log. Quick reminder on that from the files lesson. Postgres writes every change to this append-only log first, and F syncs it at commit, meaning it waits until it's actually on the drive, before it changes the real data pages on disk. After a crash, it replays the log.

B: So one row becomes six inserts.

A: One row becomes six B-tree or heap insertions. And if the indexed values are random, each one lands on a different leaf, probably one that isn't in cache. And an update is worse than you'd guess.

B: [a bit unsure] An update just changes the value in place, though. Right? Find the row, overwrite it.

A: [jumping in] Not in Postgres. Postgres never overwrites a row in place. It writes a whole new version of the row somewhere else, so every index needs a new entry pointing at the new version too. There's one optimization, called a HOT update, heap-only tuple. If none of the indexed columns changed, and the new version fits on the same page, Postgres skips adding new index entries. Which is one good reason not to index columns you update constantly. And the why of the new versions is the transactions lesson, next.

A: So all of this is write amplification. One logical write causes a bunch of physical ones. And it's not just time. Indexes cost space. They cost cache, because index pages are competing with table pages for the same RAM. And they cost vacuum time.

<!-- section: The Idea: Predict, the insert bill -->

A: So guess this. You bulk insert a million rows into an empty table shaped like clicks. Three ways. No indexes at all. Just a big int primary key on ID, ascending. And the primary key plus four more, on user ID, doc ID, the query text, and created at. The no-index run takes six tenths of a second. Guess the other two.

B: [working it out] Each index is roughly another insert... so primary key, double, one point two? And five indexes, six times... three and a half seconds?

A: [a little smug] Six tenths, one point oh, and seven point oh. On an M four Pro. The primary key only adds sixty percent. Because ascending IDs always go into the rightmost leaf. Those same few pages stay hot in cache, and splits there are cheap. But the four extra indexes add six whole seconds. And they're not equal. Created at is ascending too, so it's cheap, like the primary key. The expensive ones are user ID, doc ID, and especially the query text. Random values, so every insert lands on a different leaf of three growing B-trees. And comparing text keys is slower than comparing integers, because text is usually compared using language-aware sorting rules, not raw bytes.

B: So it's not "each index costs the same". It's whether its values are random.

A: That's the real lesson there. And if you insert one row at a time, it goes the same direction, just more gently. Because each commit has its own fixed overhead on top. About forty-two thousand rows a second with no indexes, and twenty-two thousand with five, in that run.

<!-- section: The Idea: LSM-trees -->

A: So that raises a question. A B-tree updates data in place. Find the page, change it, write it back. Every insert is a small random write. With lots of indexes and random keys, that's a lot of random I O. And some systems take in way more writes than reads. Event logs, metrics, message stores. Your click log itself, at a big enough scale. For those, there's a different design.

A: Remember from the "why not a JSON file" lesson, appending to a log is the cheapest write there is. The L S M tree, log-structured merge-tree, builds a whole index out of that idea. It's what Rocks D B, Level D B, Cassandra, Scylla D B, and H Base use. Three moves. First, a write. You append the change to a log on disk, for crash safety. And you insert it into the memtable, which is a sorted structure in RAM. Usually a skip list or a balanced tree, typically tens of megabytes. And that's it. No disk page got read or rewritten.

B: But RAM fills up.

A: That's move two, flush. When the memtable hits some size, Rocks D B's default is sixty-four megabytes, you write it out to disk in one sequential pass, as an S S table. Sorted string table. An immutable file of keys and values in sorted order, with a small index of where each block starts. Written once, never modified. Then you start a fresh memtable. And move three is compaction. In the background, you merge S S tables together, like the merge step in merge sort, keeping only the newest version of each key and dropping deleted ones. And the files are organized into levels, each one roughly ten times bigger than the last.

A: If you sketched it, at the top, above a line marked disk, you've got the write arrow going into the memtable in RAM, and next to it, the log, append only. Below the line, level zero, a row of small files, newest on the left, oldest on the right. Under that, level one, one long sorted run, about ten times bigger. Under that, level two, ten times bigger again. Compaction arrows go downward. And each file has a little blue block on its edge, which is its bloom filter. And a read goes memtable first, then the level zero files newest to oldest, then level one, then level two, and stops at the first hit.

B: So that's where you pay. A read might have to check... everywhere.

A: Reads are where you pay. A key could be in the memtable, or in any of those files. Two things keep it tolerable. Each file has a small sparse index, so checking one file costs at most one block read. And each file has a bloom filter. That's a compact array of bits that answers "is this key in the set?" with either "definitely not" or "maybe". With about ten bits per key, it says "maybe" wrongly about one percent of the time.

B: [skeptical] How can it be sure about "definitely not" but not about "yes"?

A: [working it out] Because when a key goes in, it sets a few specific bits. If you check a key and any of its bits is off, it was never added. That's certain. If they're all on, maybe it was added, or maybe other keys happened to set those same bits. So most files that don't have your key get skipped without touching the disk at all.

A: So the trade, roughly. Inserts: a B-tree does random page writes in place. An L S M does sequential appends, and pays later, when compaction rewrites the data. Point reads: a B-tree is one descent, about one cold read. An L S M checks the memtable and the bloom filters and usually does about one file read. Ranges: the B-tree just walks its leaves, the L S M has to merge across files. Space: B-tree pages sit around seventy percent full. L S M files are compact, but old versions hang around until compaction gets to them. And the hidden cost: page splits and fragmentation for the B-tree. For the L S M, compaction quietly eating disk bandwidth in the background.

B: So, B-tree when you read a lot. L S M when you mostly write.

A: Read-heavy, with updates to existing rows, B-tree. Ingest-heavy, append-mostly, L S M. Postgres and My S Q L are B-tree databases. Rocks D B is an L S M engine that gets embedded in a lot of systems, including as a storage engine for My S Q L. Cassandra and Scylla D B are L S M databases.

<!-- section: The Idea: Hash indexes -->

A: And last, the simplest one, which is actually the picture you started with. If all you ever ask is "is key X here, and where is it?", you don't need sorting at all. A hash index hashes the key to a bucket and looks there. It's basically the dict of indexes. One-step lookups. But no order, so no ranges, no sorting, no prefix searches.

B: So my hash-table guess wasn't totally wrong. It just isn't the default.

A: It's a real kind of index, just not the one you get. Postgres has them, with using hash when you create the index, crash-safe since version ten. But they only support equals. And a B-tree descent is already only three or four mostly-cached pages, so B-tree stays the default. Hash indexes really shine in memory. Redis is basically one giant hash table. And there's a design called Bitcask, a hash table in RAM of key to file offset, sitting over an append-only log. Which is exactly the store you built in the "why not a JSON file" lesson.

<!-- section: Build It: Postgres -->

A: So, building it. Two parts. First Postgres, where you make a big table, feel the scan, add indexes, and read the plans. Then a B plus tree you write yourself.

A: Setup's quick. Run Postgres seventeen, either in Docker, which is easier to throw away, or through Homebrew, which is easier to leave running. Open P S Q L, turn on timing, and create the clicks table: an ID that's a big int primary key, user ID, doc ID, the query text, dwell time in milliseconds, a country, and created at. Then you fill it with five million rows using a Postgres function called generate series, which makes the rows inside the database, so it takes seconds, not minutes. The parts of that insert that matter later: about a hundred thousand users, so about fifty clicks each. About a million docs. About fifty thousand distinct queries. The country's picked from a list of ten where four of the ten are U S, which is how you get that thirty-nine percent. And created at goes up by five seconds per row, so time order is insert order. That's where the correlation near one comes from. Then vacuum analyze, and check the sizes. You should see about three sixty-five megabytes for the table, a hundred and seven for the primary key, and forty-six thousand seven hundred twenty-nine pages. The load took about seven seconds.

A: Then the first real task. For each query, write down your guess for the time and the kind of plan first. Then run it with explain, analyze, buffers in front. Analyze means it actually runs the query for real. Buffers means it reports how many eight-kilobyte pages it touched. And there are two kinds. Hit means the page was already in Postgres's cache. Read means Postgres asked the operating system for it, which might still come from the OS page cache, not the SSD. So read doesn't necessarily mean disk.

A: First query, user forty-two forty-two, no index. Note the plan, the time, the pages. Then turn off parallel workers and run it again, so you see what one core does. Second, look up ID three million, which already has an index, the primary key. How many buffers, and can you account for every one? Third, create the index on user ID, time how long that takes, check its size, and rerun the first query.

A: And then you look inside the B-tree itself, with an extension called page inspect. One function tells you the level of the root. If it says two, that means height three, since the leaves are level zero. Another gives you stats for a single page: how many live entries it has, the average entry size, free space. And you compare those with the three sixty-seven entries of about twenty bytes from the napkin math.

B: Does it actually match?

A: That's what you're checking. And there's a hint in there. The user ID index ends up a lot smaller than the primary key index, even though they have exactly the same number of entries.

B: [working it out] Same number of entries, smaller... user ID repeats, though. Fifty clicks per user. ID never repeats.

A: That's the clue. Postgres thirteen added something called B-tree deduplication. Go read the docs and explain why user ID benefits and ID can't.

A: Second task, make the planner say no. Index the country column, run analyze, then explain analyze a count and an average dwell time for U S, and for France. Then force the index for the U S query. You turn off the seq scan and the bitmap scan options, and compare the actual time against the scan. Was the planner right? Turn them back on afterwards. Then look at what the planner believed, the most common values and their frequencies in P G stats. Check correlation for user ID, created at, and ID, and predict which range queries are going to be cheap before you run any. And then write two queries that should use the user ID index but don't, by wrapping the column. One with arithmetic, one with a cast or a function. And for every result, write one sentence saying why, in pages, not rows.

A: Third task is column order. Two queries. The dashboard one, a user's clicks since June first, ordered by time, top twenty. And a daily report that just counts every click on June first. Drop the old indexes. Then make the user, then time index, run both queries, drop it. Make the time, then user index, run both again. And before each run, predict the number of pages to within a factor of ten, using that eight-entry picture. Then the covering experiment. Average dwell time for users four thousand through four thousand nine hundred ninety-nine, with a plain user ID index versus one that includes dwell time. Vacuum after creating the covering one, and look for "index only scan" and "heap fetches: zero". Then run it before the vacuum, on a fresh copy, and explain the difference.

B: And that's the visibility map thing.

A: That's the visibility map. Before the vacuum, the map doesn't know the pages are clean, so it goes back to the table to check.

A: Fourth task, measure the write bill. A script that times inserts into a copy of the table with zero, one, and five indexes. The bulk version: insert a million rows from clicks, time it, truncate, add the primary key, do it again, add the four other indexes, do it again. And run a checkpoint between runs, so leftover background writing from one run doesn't land in the next. Then the one-row-per-transaction version, using P G bench, which ships with Postgres. A one-line script that inserts one row of random values, run for ten seconds with four clients, against a table that already holds five million rows, with zero, one, and five indexes. Rows per second. And then you have an agent review your script for anything that makes the comparison unfair. Cache left over from a previous run. The table not being the same size each time. Autovacuum kicking in halfway through. Accidentally timing the connection setup.

<!-- section: Build It: Your own B+tree -->

A: And then the core of the whole thing, which you write yourself. A B plus tree in plain Python, nothing beyond the bisect module. Two kinds of node. A leaf, which has keys, values, and a pointer to the next leaf to its right. And an inner node, which has keys and children, with exactly one more child than keys. The tree class has an order, which is the max keys per node, and starts as one empty leaf as the root. Then a find-leaf helper that descends from the root and gives you back the leaf where a key belongs, and also the path of inner nodes above it. You need that path to push splits upward. Then search, insert, a range function that yields keys in order between a low and a high bound using the leaf chain, and height.

B: Where does it go wrong? Like, where's the bug I'm going to write?

A: [amused] Two places, pretty reliably. First, picking the child in an inner node. Child number I holds keys from separator I minus one up to, but not including, separator I. So the child you follow is the one at bisect right of your key. Use bisect left instead, and keys that are exactly equal to a separator go missing. Second, the two kinds of split are different. Leaf split: move the upper half of keys and values to a new leaf, fix the next pointers, and send the new leaf's first key up as the separator. But the key stays in the leaf. The parent just gets a copy.

B: And an inner split does the same thing.

A: [quick] That's the bug. In an inner split, the middle key moves up, and it's removed from both halves. It doesn't stay behind. That asymmetry with the leaf split is the most common mistake. So start with order three, so splits happen constantly, print the tree level by level after each insert, and compare it with the interactive toy using the same inserts.

A: Then test it against something you trust. Two hundred thousand random keys, put into your tree and into a plain dict. Check every key comes back with the right value, and a missing key returns None. Check two hundred random ranges against a sorted list. Print the height. Do it for orders three, four, sixty-four, and two fifty-six.

A: And then race it. A million random inserts into your tree at order one twenty-eight, into a plain Python list kept sorted with bisect's insort, and into a dict. Start insort at a hundred thousand and work up, and you'll see why. Then a hundred thousand searches, your tree against bisect left on the sorted list.

A: And you're done when every row of the measurement table's filled, each with a prediction written before the first run. When you can point at every line of an explain output and say what it's doing and why it touched that many pages. When page inspect and your own arithmetic agree on the height of the primary key index. And when your tree passes for all four orders, and its height for a million keys at order one twenty-eight is three.

<!-- section: Measure -->

A: So here's what the numbers should look like. Run each query twice and keep the second, because the first one pays for pulling pages into cache. Your Postgres version and disk will be different from mine, which were an M four Pro, Postgres sixteen, warm cache. The ratios shouldn't be.

A: User forty-two forty-two, no index, one worker: a seq scan, a hundred ninety-eight milliseconds, forty-six thousand seven hundred twenty-nine pages. With the default parallel scan, two workers, sixty-four milliseconds. Creating the index on user ID took about a second, and it's thirty-four megabytes. Then the same query with the index: a bitmap scan, a tenth of a millisecond. Three index pages and fifty-six table pages.

B: So that's the two thousand times from the start.

A: [satisfied] That's the two thousand times. The scan read forty-six thousand seven hundred pages to return fifty-six rows. The index read fifty-nine. That's about a seven hundred ninety times gap in pages, and that explains most of it.

B: And the rest?

A: The rest is CPU. Checking five million rows against the condition. And notice what parallelism did. Three processes, the main one plus two workers, made the scan three times faster. But no amount of parallelism closes a seven hundred ninety times gap in work.

A: The primary key lookup, ID three million: an index scan, seventeen thousandths of a millisecond, four pages. Three index levels and one table page, which matches the height arithmetic exactly. And page inspect should report the root at level two.

A: Now the U S query is the honest surprise. Thirty-nine percent of rows. The planner chose a parallel seq scan, a hundred twelve milliseconds. Forcing the index: eighty-six milliseconds.

B: [surprised] Wait, the forced one was faster? So the planner was wrong.

A: [conceding] On my Mac, a little, yeah. Because everything was already in RAM. Three hundred sixty-five megabytes fits easily in the page cache of a forty-eight gigabyte machine. So a "random" read cost the same as a sequential one, and that random page cost of four was too pessimistic. On a cold cache, or a slower disk, the planner would've been right. And this is exactly the situation where people lower random page cost on SSD machines. So check whether your run agrees.

A: France, five point six percent: bitmap scan, ninety-six milliseconds, all forty-six thousand eight hundred pages. The matches are spread across every page. Pages, not rows.

A: Column order. The dashboard query with user then time: four hundredths of a millisecond, twenty-three pages. With time then user: thirty-six milliseconds, seven thousand three hundred twenty-two pages. Because with user first, the matches are one contiguous run and the top twenty stops after twenty entries. With time first, Postgres walks every entry since June first checking the user, and fetches table pages as it goes. Now flip to the daily report.

B: [working it out] Which is only on time... so the user-first index can't help it at all, leftmost column. And the time-first one should be great.

A: User first: it falls back to a seq scan, eighty-one milliseconds. Time first: an index-only scan, one and a half milliseconds, seventy pages. The winner flips. Indexes are designed for queries, not for columns.

A: Covering: sixty-six milliseconds down to two point nine, by not visiting thirty thousand eight hundred forty-six table pages. Zero heap fetches.

A: Writes. Bulk, a million rows: point six two seconds, one point oh one, seven point oh three. So eleven times slower with five indexes. One row per transaction with P G bench: about forty-two thousand rows a second with none, about forty-six thousand with just the primary key, so basically free, and about twenty-two and a half thousand with five. Only two times slower.

B: Why only two times there, when the bulk one was eleven?

A: Because each single-row insert also pays for its own commit, and that fixed cost waters down the index cost. And there's a Mac footnote, from the files lesson. On macOS, Postgres's default commit doesn't force the SSD's own cache to flush, which is why one-row commits are so cheap here. Expect fewer rows per second on Linux, with a real flush. The general picture though: the primary key is nearly free, and random-key indexes aren't. Ascending keys, ID and created at, append to the rightmost leaf. Random ones, user ID, doc ID, query, touch a different leaf each time.

A: And the Python race. Your B plus tree, a million inserts at order one twenty-eight: about six seconds, height three. A dict: sixteen hundredths of a second. And insort into a sorted list...

B: That should be fine, it's binary search. Log N to find the spot.

A: [deadpan] Two hundred eighty seconds.

B: [surprised] Almost five minutes?

A: Because finding the spot is fast, but then it has to shift every element after that spot one slot to the right, to make room. On average that's about a quarter of a million pointers. About two megabytes of memory moved, per insert. Over a million inserts, that's around two terabytes moved in total. And that's exactly why databases don't keep one big sorted array on disk. Every insert would rewrite half the file. The B plus tree only ever shifts entries inside one small node. And then the dict beats your tree by about forty times, because hashing doesn't keep anything in order at all. That's the hash index trade, measured.

<!-- section: Break It -->

A: And then you break things, on purpose. First one, random primary keys. Make three tables, just an ID and one integer column, and put three million rows in each. One with an ascending big int ID. One with a random big int. One with a U U I D.

B: [a bit unsure] U U I Ds are just kind of the normal way to make IDs now, though, right? Everything uses them.

A: [dry] Watch what they cost. On my Mac: ascending, nine and a half seconds and sixty-four megabytes of index. Random big int, twenty-nine seconds and seventy-nine megabytes. U U I D, ninety-six seconds and a hundred twenty-three megabytes. Then reindex the random big int table, and it shrinks back to sixty-four. Because random keys left pages about seventy-three percent full on average instead of ninety, from splits all over the tree. And the U U I D index is bigger again because every key is sixteen bytes. And there's a hidden cost on top. Every insert dirties a different leaf, and Postgres writes a full copy of each page into the write-ahead log the first time that page changes after a checkpoint. So random keys multiply your log volume too. Which is why people use time-ordered IDs for big tables. U U I D version seven, or snowflake IDs. Unique, but they go up over time, so inserts land at the right edge.

A: Second, stale statistics. New table, a million rows where every country is U S. Run analyze. Then insert a million rows of France and immediately explain a query for France, before autovacuum notices. The estimated row count will be wildly off from the actual. Run analyze, and watch the plan change. Most stories of "Postgres randomly picked a terrible plan" are this.

A: Third, break your own tree. Change the inner split to keep the middle key in the right half, the way the leaf split does, instead of moving it up. Run your checker. Which test fails first, and why does search still work for most keys? Then put the off-by-one in find-leaf, use bisect left, and figure out which keys go missing.

B: Keys equal to a separator.

A: Those are the ones. And your checker should catch both bugs. If it doesn't, it isn't checking enough.

A: And fourth, index everything. Literally every column of clicks. Rerun the bulk insert. Then compare the total size of the indexes to the table, and it's common for the indexes to be bigger than the table. Then run your dashboard queries and look at the index scan counts Postgres keeps per index. Most of them were never used once. And every one got paid for, on every insert.

B: That's the five indexes "to be safe".

A: [serious] That's the half-speed ingestion job. So if that ever lands on you, here's what you actually do. The reason is what we said: every insert writes the row and then one entry into every index, descents, splits, all of it logged. Random-value indexes, user IDs, U U I Ds, text, cost way more than ascending ones like an ID or a timestamp. Updates too, unless they're HOT. So: drop the indexes the scan counts say nobody uses. Merge overlapping ones. An index on user ID then created at makes a plain user ID index redundant, because user ID is its leftmost prefix. For a big backfill, drop the secondary indexes, load, and rebuild them in one sorted pass. Prefer time-ordered keys. And if the workload is overwhelmingly writes, that's what an L S M store is built for.

<!-- section: Connections and close -->

A: The best next read is chapter three of Martin Kleppmann's Designing Data-Intensive Applications, which puts hash indexes, L S M trees, and B-trees side by side. And Markus Winand's free book, Use the Index, Luke, for the practical side. Next lesson's transactions, which is where those new row versions come from. And there's a question this one can't answer: B-trees only work because keys can be sorted. Embeddings can't be sorted in any useful way. So how do you index a hundred million of them? That's vector search.

B: [working it out] Okay, let me try to say the whole thing. An index is a second copy of a column, sorted, with pointers back to the rows. It's a tree where every node is a whole page with hundreds of keys, so finding anything takes like three or four page reads, even at a billion rows. And it makes writes slower because... every write has to update every copy.

A: [warm] That's it. I'd sharpen two bits. Every copy, and where in the copy. An index on an ascending key costs almost nothing on write, because it always lands on the same hot page. One on random values lands on a different cold page every time, and that's the bill. And on the read side, the thing to count is always pages. Not rows. Fifty-six rows can be fifty-six pages. Five percent of rows can be every page in the table. Count the pages and you'll know what the planner's going to do before it does.
