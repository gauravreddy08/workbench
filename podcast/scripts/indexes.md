<!-- section: The Problem -->

A: [relaxed, thinking out loud] So say you're logging every click on your ranker's results. Who clicked, which document, for which query, how long they stayed. A few months in, that table's got millions of rows. And you write the obvious debugging query, give me all the clicks for this one user. It's slow. Not terrible, but slow, and then a dashboard runs it for a whole list of users every time someone loads the dashboard, and now it takes seconds to show up.

B: Okay.

A: And someone on the team says, just add an index. You run one line. Takes a second. And the same query is now about two thousand times faster.

B: [skeptical] From one line.

A: From one line. And that should bother you a little. Nothing about the data changed. The CPU didn't get faster. So where did all that time go? And if it's that good, why doesn't the database just do it for every column automatically?

B: I'm guessing there's a catch.

A: There's a bill. A week later, the job that writes those clicks in is running at half speed. Because somebody added five more indexes, to be safe. Same trade, other side. And by the end of this you should be able to see both of those coming before you run anything.

<!-- section: A second, smaller box -->

A: So picture that table as a box of index cards. One card per click, in the order they happened. To find one user's clicks, you have to look at every card. Every single one. Whether you want one card or a thousand, you read all of them. That's called a full table scan, and its cost has nothing to do with how big the answer is. It's about how big your table is.

B: And the fix is, what, sort the box?

A: That's the natural guess. But you can only sort the box one way. And you want to search by user, and by document, and by time. So you leave the big box alone. You build a second, small box next to it. One card per click, but each card only has the user ID on it, and a little note that says where the real card is. And you sort that small box by user.

B: [working it out] Oh, so you search the small one, and then follow the notes.

A: Right. Find the user in the small sorted box, read the notes, go pull exactly the cards you need from the big one. That small sorted box is the index. That's the whole idea. A sorted copy of one column, with pointers back to the rows.

B: So creating an index doesn't touch your table at all. I kind of assumed it was reordering things.

A: Nope, it's a copy. Which, keep that word in mind. Copy. Copies take space, and copies have to be kept in sync. That's the entire write story later.

B: Okay, but once it's sorted you just binary search it, right? Done.

A: [amused] You'd think. That's where it gets good.

<!-- section: Too big for memory, too slow to search -->

A: So, late nineteen sixties. Two engineers at Boeing's research labs, Rudolf Bayer and Edward McCreight. They've got files of records way too big to fit in memory, so they live on disk. And this is spinning disk. Every time you want to read from somewhere new, a physical arm has to move across the platter and wait for it to spin round. Tens of milliseconds, every single jump.

B: So binary search hurts.

A: Binary search hurts a lot. Each jump only rules out half of what's left. On a big file that's a couple dozen jumps, and a couple dozen arm movements is most of a second. For one lookup. And then keeping a big file sorted while new records keep arriving means rewriting huge chunks of it.

B: So what did they do?

A: They noticed something that sounds almost too simple. Disks don't read one number at a time. They read in fixed-size chunks, called pages. And reading a page costs the same whether you use a tiny bit of it or the whole thing. So, they said, if I'm paying for a whole page anyway, make that page carry as much direction as possible.

B: Direction meaning...

A: Meaning signposts. Instead of one key that says "go left or go right", pack that one page with hundreds of keys. Like the letter tabs on a phone book. This page says, keys up to here, go to that page. Keys up to there, go to that other page. Hundreds of them. So every single read narrows the search down by a factor of hundreds, not two.

B: Huh. So it's a tree, but really fat.

A: Really fat and really short. Bottom layer, the leaves, holds the actual entries, the key and where the row lives. Above that, pages of signposts pointing at the leaves. Above that, signposts pointing at signposts, until one page sits at the top. That's the B-tree. They published it in nineteen seventy. And here's my favorite detail, nobody's sure what the B stands for. Boeing, balanced, broad, Bayer. They never settled it.

B: [laughs] That's great.

A: And it won. Postgres, MySQL, SQLite, most filesystems, they all use a version of it today.

<!-- section: Always about four -->

A: So here's the thing that made it click for me. Every level of that tree multiplies how much it can reach by hundreds. One page reaches hundreds of leaves. Two levels reach hundreds of hundreds. Keep going. And it turns out a billion rows is about four levels. Four page reads, and you're at the row.

B: And a thousand rows is, what, one or two?

A: Two, maybe. And a billion is four. That's the weird part. Make your table hundreds of times bigger, and you add one read. It's why if you ask anyone how deep an index is, the answer is almost always somewhere between two and four, no matter how big your table is.

B: [working it out] And I'd guess the top of the tree basically lives in memory, because every single query goes through it.

A: Right. The top is tiny and it's touched constantly, so it stays cached. So in practice a cold lookup is maybe one or two real disk reads, plus one to grab the actual row. Compare that to reading the whole table. That's where your two thousand times went. Not faster math. Just way, way fewer pages read.

B: Okay, but how does it stay balanced? If I keep inserting stuff in one corner, doesn't one side get deep?

A: This is the clever bit. When a leaf page fills up, it splits. Half the entries go to a new page, and the parent gets one new signpost pointing at it. If the parent's full too, it splits, and pushes a signpost up to its parent. And if that goes all the way to the top, the top splits, and a brand new top page appears above it.

B: Oh, so it grows upward.

A: It grows at the top, not the bottom. So every leaf is always the same distance from the top. No search is ever unlucky, and nobody ever has to go in and rebalance anything.

<!-- section: Why the planner says no -->

A: Now there's a bit that trips everyone up. The index doesn't actually hand you the row. It hands you an address. And to get the row, the database still has to go read whichever page of your table that row lives on.

B: Sure, follow the note.

A: Follow the note. And for one user with a few dozen clicks, those clicks arrived at a few dozen different times, so they're scattered across a few dozen different pages of your table. That's fine. A few dozen reads. But now ask for something common. Say, every click from one country that makes up a decent chunk of your traffic.

B: [skeptical] Then you'd still want the index, wouldn't you? It's still fewer rows than the whole table.

A: Fewer rows, yeah. But not fewer pages. Each page holds about a hundred rows. If the matches are spread evenly, nearly every page has at least one. So you end up reading basically your whole table anyway, except now you're jumping around in random order, plus you read the index on top. When I ran this, one country was only a small slice of the clicks, and the database still read every single page of that table.

B: Oh. So it's not how many rows match. It's how many pages they're on.

A: That's the sentence. Pages, not rows. And the database has a part that decides how to run each query, the query planner. It estimates both ways and picks the cheaper. So when people say "Postgres is ignoring my index", the planner's usually right.

B: Usually.

A: [amused] Usually. Here's the honest exception. When I ran it on my Mac, for the really common country, the planner chose to scan the whole thing, and I forced it to use the index anyway, and the index was a little faster. Because all of it was already sitting in memory. Its cost model assumes jumping around is several times more expensive than reading in order, which was true on spinning disks. When everything's in memory, it just isn't.

<!-- section: Built for a question -->

B: Can you put more than one column in an index?

A: You can, and the order matters more than almost anything else. Think of a phone book sorted by last name, then first name. Great for finding one person. Great for everyone with one last name. Completely useless for finding everyone whose first name is Wei. Because the first names are only sorted within each last name. They're scattered through the whole book.

B: Right, yeah.

A: So for that dashboard, one user's clicks since some date, in time order, you want user first, then time. All of that user's clicks sit together, already in time order, so it reads exactly the handful it needs and stops. Flip the order, time first and then user, and the same query has to walk every click since that date, checking each one. When I ran both, it was the difference between a couple dozen pages and thousands.

B: And I'm guessing the flipped one wins for some other query.

A: It does. A daily report, count everything from one day, and suddenly time first is the fast one. Same two columns, the winner flips. So the thing I'd really take away is that an index isn't built for a column. It's built for a question.

B: And if the index already has every column the question needs...

A: Then it doesn't have to go back to your table at all. That's called a covering index. It answers straight from the copy, and that's often the biggest single win you can get for a query you run all the time.

<!-- section: The bill -->

A: Okay. The bill. Remember, the index is a copy. So when you insert one row into a table with five indexes, the database writes the row, and then goes into each of the five trees, walks down to the right leaf, and slots in an entry. Sometimes splitting pages. And it logs all of that so it can recover after a crash.

B: So one write turns into six.

A: Six at least. And here's what decides how bad it is. If the column always goes up, like an ID that counts upward, or a timestamp, every new entry lands in the same rightmost page. That page is hot, it's in memory, it's cheap. Nearly free.

B: [working it out] But a user ID is basically random. So every insert lands on some different leaf.

A: Somewhere different every time, probably not in memory. And the database is doing that for several trees at once. That's where the half speed came from. And the classic way people get there is indexing everything, just in case. Then you look at which indexes actually got used, and most of them never were. Not once. But every single one got paid for on every insert.

B: So "why not index every column" has a real answer.

A: It's that answer. Every index speeds up some reads and taxes every write.

<!-- section: When writes win -->

B: What if your whole job is writing, though? Like the click log at real scale. Way more writes than reads.

A: Then there's a different design, and it comes from a trick you might already know. Appending to the end of a file is the cheapest write there is. No jumping around, no rewriting old pages. So there's a kind of index built entirely on that. It's called the LSM-tree, log-structured merge-tree.

B: How do you get sorted out of append-only?

A: In stages. New writes go into a small sorted table in memory, and onto a log on disk so a crash can't lose them. That's it, the write's done. When the in-memory table fills up, you dump it to disk in one go, as a sorted file that you never change again. And in the background, you keep merging those files together into bigger and bigger sorted files, throwing away old versions as you go.

B: [skeptical] So reads have to check, what, every file?

A: That's where you pay. A key might be in memory or in any of the files. So each file carries a little summary called a bloom filter, which can answer "is this key in here" with either "definitely not" or "maybe". Most files say definitely not, and you skip them without touching the disk. So the trade is, the B-tree makes reads predictable and writes a bit random. The LSM-tree makes writes cheap and pushes the cost onto reads and that background merging.

<!-- section: Building one -->

A: The part I liked most was writing a B-tree myself, in plain Python, and racing it against the dumb option. Just a Python list kept sorted, inserting each new key in the right spot.

B: The list should be fine, right? Finding the spot is a binary search.

A: Finding the spot is fast. But then every insert has to shift everything after it over by one. On average, half the list, every single time. So my little tree was done in seconds, and the sorted list took minutes. Many times slower. And that's exactly why no database keeps one giant sorted file. Every insert would rewrite half of it. The tree only ever shuffles things around inside one small page.

B: And a dict?

A: [laughs] The dict beat both by miles. Because it doesn't keep anything in order. Which is the whole trade in one line. If you only ever ask "where's this exact key", hashing wins. The moment you want ranges, or things in order, you need the tree.

<!-- section: Ending -->

B: Okay, let me try. An index is a sorted copy of a column, sitting next to your table, with pointers back. It's stored as this very wide, very short tree, so every page you read narrows things down by hundreds, and you find anything in a handful of reads. And the cost is that every write has to update every copy.

A: That's it. Two things I'd sharpen. It's not really a copy of a column, it's a copy shaped for a question, and the column order decides which questions it helps. And when you're wondering whether it'll help, count pages, not rows. If the rows you want are scattered over every page, no index can save you from reading every page.
