<!-- section: The Problem -->

A: [relaxed, thinking out loud] So picture the shared sheet your team keeps eval results in. One row per metric per run. So each row has the run id, who ran it, their email, the model, the model's parameter count, the dataset and its version, which metric, and the value. It started out as, like, twenty rows. It's now a few thousand, and every week somebody exports it to a file called runs dot C S V so a notebook can plot it. Nothing exotic. You've probably got one of these right now.

B: I mean, I definitely have one of these right now.

A: [wry] Right. So, three small things happen in the same month. First one. Sam changes his email, because his name got updated in the company directory. Someone does a find-and-replace on the sheet. But they do it on the rows that were visible after a filter. So now Sam has two emails, and the notebook that groups by email shows him as two different people.

B: [casual] Okay, but that's just a sloppy find-and-replace. Do it on the whole sheet and you're fine.

A: [patiently] This time, sure. But hold on to that, because it's the most natural answer and it's the one this whole thing is arguing against. Second story. Priya registers a new dataset, tf clicks version one, forty thousand labeled pairs. She wants it in the sheet so people know it exists. But every row in that sheet is a metric of a run. And nobody's run anything on it yet. So there's no row to put it in. She sends a Slack message instead, which, you know, nobody will ever find again in three months.

B: [amused] That one I've lived.

A: Third story. Someone cleans up the failed runs. And one of those was the only run anyone ever did with a model called Deberta v three large. The rows go. And with them goes the only place anyone ever wrote down that that model has four hundred thirty-five million parameters.

B: [wincing] Oof. Okay.

A: [earnest] And here's the thing. None of those is anyone's fault. Not Sam's, not Priya's, not the person cleaning up. They're the table's fault. The sheet stores each fact many times, or it stores a fact only as a side effect of storing some other fact. And so every single edit is a chance for it to disagree with itself. So the careful find-and-replace? It works until the one time it doesn't, and you have no way to know which time that was. The fix has a name you've probably heard at work: normalization. It just means designing your tables so each fact is stored in exactly one place. Mostly you do that by splitting one wide table into a few narrower ones, linked by ids. And the idea is older than almost anything else you use.

<!-- section: Origin -->

A: [storytelling] So, the nineteen sixties. A database back then was a tangle of records linked by pointers. IBM had a system called I M S, built partly for the Apollo program's parts lists, and it stored data as trees. Programs found things by walking those trees, step by step. Go to this supplier, follow the pointer to its first part, then the next part, then the next. And if somebody reorganised how the data was physically stored, every program that walked it broke.

B: Because the program had the path baked in.

A: Yeah, the program knew the shape of the storage. Then in June nineteen seventy, Ted Codd, Edgar Codd, a mathematician at IBM's San Jose lab, publishes "A Relational Model of Data for Large Shared Data Banks". And the proposal is kind of radical for the time. Store everything as plain tables of values. No pointers at all. Programs say what rows they want, and the system works out how to find them. And in that same paper he says each cell should hold one simple value, not, like, a whole nested table inside a cell. And he called that "normal form".

A: A year later he writes a follow-up, "Further Normalization of the Data Base Relational Model". And what he'd noticed is that even flat tables, perfectly flat, one value per cell, could still store the same fact in many places. And he named the three kinds of trouble that causes. Insertion anomalies, update anomalies, deletion anomalies. Which are exactly the three stories. Sam is the update one, Priya is the insertion one, the Deberta model is the deletion one. He defined second and third normal form to rule those out. And then in nineteen seventy-four, with Raymond Boyce, a slightly stricter version, which is now called Boyce-Codd normal form.

B: [curious] Why "normalization", though? It's a weird word for this.

A: [amused] He later joked that he picked it because Nixon was in the news "normalizing" relations with China. That's it. That's the etymology. And honestly, everything we're about to go through comes out of those few papers.

<!-- section: The Idea: Three ways a table lies -->

A: So, those three kinds of trouble. An anomaly is a way the table's design lets it end up wrong, or lets a fact get lost, even when every single edit someone made was reasonable. And that's the important bit. It isn't a bug in any query. It's a bug in the shape of the table.

A: If you drew the three side by side, it'd be three little panels. The first one's the update. A column of five rows, all for Priya, and her email in each one. Somebody changes it. Four rows get the new email, one gets missed. And now the sheet holds two emails for her, and the question underneath is, well, which one's true? The second panel is the insert. The table's columns are run, metric, dataset. You want to write down just the dataset. And the run cell and the metric cell are blank question marks. Because the thing that identifies a row here is run plus metric. No run, no identity, no row. The fact has nowhere to live. And the third panel is the delete. Three rows for the one Deberta run, each saying four hundred thirty-five million params. Strike through all three. Three metric rows are gone, which you meant. And "Deberta large is four hundred thirty-five million parameters" is gone too, which you didn't mean, because that was its only copy.

B: So they're kind of three different bugs.

A: [emphatic] Three symptoms, one cause. And the cause fits in one sentence you can carry around. The table mixes several kinds of thing into one row. A row in that sheet is, at the same time, a metric value, and a run, and a person, and a model, and a dataset. Each of those things has its own facts. And they've all been glued together and then copied wherever the glue went.

A: There's an interactive version of this that's worth playing with. It shows a little flat sheet, and you click a cell, say Priya's email. Every other cell holding the same fact lights up. Seven rows, for her email. Those are the rows you'd have to change together. And there's a button that says "change this row only", and if you press it, the sheet starts contradicting itself, the other copies go dashed, and a little contradictions counter goes up. Same for a model's parameter count, it's in every row that used that model. Then you flip it to the normalized view, and you get separate little tables. Runs, metrics, authors, models, datasets. And arrows going from each run to the author it points at, the model, the dataset. And now when you click Priya's email, it's one cell. You change it, that's one write, and there's no second copy anywhere to disagree with it.

B: [working it out] And the metric value? What lights up when you click that in the flat sheet?

A: Just itself. Which is the thing to notice. The metric value was already fine. It lives in exactly one row, because the row is that fact. This run, this metric, this number. Everything else in the row is a passenger, riding along. And normalization is basically giving each passenger a seat of its own.

<!-- section: The Idea: If you know X, you know Y -->

A: Okay. To do that on purpose, rather than by eyeballing it, you need exactly one tool, and it's simpler than its name. It's called a functional dependency. And all it means is: if you know this, you know that. So, if you know the run id, you know which model it used. Every row that says run one oh one has to say the same model. If you know the author's email, you know their name and their team. If you know the model's name, you know its parameter count. And if you know the run and the metric name, together, you know the metric value. The run alone isn't enough there, because run one oh one has three different values, one per metric.

A: People write it with an arrow, run id arrow model name, and read it out as "run id determines model name". And the left side, the "if you know this" side, is called the determinant.

B: Okay, so to find them I'd just... query the data, right? Group by run id, see if the model's always the same. If it is, that's a dependency.

A: [gently] So, half of that's useful and half of it's backwards. These rules are facts about the world, not about whatever data you happen to have today. Like, maybe today every model in the sheet with thirty-three million params happens to be a Mini L M. That doesn't mean "if you know the param count, you know the model". Tomorrow somebody trains a thirty-three million parameter e five, and that rule was never real. So you decide dependencies by asking a question about the world: could two rows ever legitimately disagree on this? Not by running a query. What a query can do is disprove one. Find two rows that agree on the left side and disagree on the right, and you've caught a broken rule. It can never prove one.

B: [slowly] So the query's a detector, not a definition.

A: Yeah, that's a good way to put it. And the other thing to notice: every anomaly from those three stories is a dependency being stored badly. "Email determines name" is true. It's a real rule. But the table stores that pair once per metric row, so the rule's enforced by nothing except human care.

A: And if you mapped every dependency in this sheet, you'd get a picture with three columns. On the left, a box for the key: run id and metric name. In the middle, the stuff that only needs the run id, so half the key. When the run started, learning rate, batch size, tags, the author's email, the model name, the dataset name and version. And down at the bottom of the middle, one thing on its own, the metric value, which needs the whole key. That one's fine. Then on the right, a third column of things that hang off something in the middle, not off the key at all. The author's name and team hang off the email. The model's family and params hang off the model name. The dataset's row count hangs off the dataset and version. And every one of those arrows is a copy waiting to go stale.

<!-- section: The Idea: Keys -->

A: Which brings in one more word. A key is a dependency that reaches everything. It's the smallest set of columns where, once you know them, you know every other column in that row. A table can have more than one. In the flat sheet, run id alone isn't a key, run one oh one has three rows. But run id plus metric name is. And the one you pick to be the official identity of a row is the primary key. The database will refuse two rows with the same primary key, and it'll refuse an empty one.

A: So now look back at that dependency map with that in mind. The middle column depends on half the key. The right column depends on something that isn't a key at all. And honestly, that's the whole theory of normal forms. It's two complaints about arrows.

<!-- section: The Idea: The normal forms -->

A: [deliberate] Each normal form is a stricter version of the same promise: every fact lives in exactly one place. And each one removes one specific kind of copy, and with it, one specific anomaly. So don't memorise them as definitions. Learn to recognise the copy each one forbids.

A: First normal form. One value per cell, and rows you can tell apart. Our sheet has a tags column, and a cell in it says something like "B M twenty-five negs, semicolon, hard neg". That's a list hiding inside one value. So if you want the runs tagged hard neg, you write a search that says "tags contains the text hard neg somewhere". And that also matches a tag somebody adds later called hard neg v two. You can't put a rule on it like "each tag has to be one of these eight". You can't index it. You can't even count tags without doing string surgery. So the first normal form fix is to give the list its own table. Run tags, with a run id and a tag, one row per tag.

A: Same rule also forbids what are called repeating groups. That's a list spread sideways instead. Columns like metric one name, metric one value, metric two name, metric two value. And the day you need a fifth metric, you're changing the table. And there's a word that comes up here, atomic. A value is atomic when you never need to look inside it to answer your questions. And that's relative to how you use it. A date is atomic... right up until you constantly need just the month.

B: Okay, so first normal form is basically "no lists in cells".

A: That's most of it. Second normal form: every column depends on the whole key, not part of it. The key's run id plus metric name. But the model depends on the run id alone. So the model gets written once per metric, three times for run one oh one. And the anomaly is a run that disagrees with itself. Two of its rows say Mini L M L twelve, and one says L six. Which, like, which model did the run use? The fix is to move the run-level facts into a runs table that's keyed by run id alone, and leave a metrics table with run id, metric name, and value. Only the column that really needs the whole key.

B: [working it out] So if a table's key is just one column, it can't even break second normal form. There's no half of it to depend on.

A: Exactly that. A single-column key can't have a "part". Third normal form: non-key columns depend on the key and nothing else. So now our runs table has a chain in it. Run id tells you the model name, and the model name tells you the param count. The params depend on the key, but only through another column. And that's called a transitive dependency. The key determines B, B determines C, and so C gets copied wherever B shows up. That's why every Mini L M L twelve run repeats "thirty-three million". Same thing with email telling you the author's name and team, and dataset name plus version telling you the row count. So the fix is three more tables: authors, models, datasets. And runs just holds a pointer to each.

A: And this is the step where the other two anomalies disappear as well. Priya's dataset with no runs? It's just a row in datasets. No run needed. Deleting the only Deberta run? The row in models doesn't care. It's still there.

A: There's an old summary of second and third together, from a guy named Bill Kent, in a guide he wrote in nineteen eighty-three. Every non-key column has to depend on the key, the whole key, and nothing but the key.

B: [laughs] That's a courtroom oath.

A: [amused] People do finish it with "so help me Codd". Okay, Boyce-Codd normal form, B C N F. The rule is: "if you know X, you know Y" is only allowed when X is a key. Because third normal form has a loophole. It only polices the non-key columns. Here's a case it misses, and it takes a second, so stay with me. Say each eval harness has one owner, and each owner maintains exactly one dataset's harness. Lena owns the M S MARCO harness, say. And you record sign-offs in a table with three columns: model, dataset, owner. Each model on each dataset gets signed off by one owner.

B: Okay.

A: So the rules are: model plus dataset tells you the owner. And owner tells you the dataset, because each owner has exactly one. Now, model plus dataset is a key. But so is model plus owner, because owner gives you the dataset. So every column in that table is part of some key. There are no non-key columns for third normal form to complain about, and it's satisfied.

B: [skeptical] But owner-tells-you-dataset is still sitting there.

A: [pleased] Right, and that's the problem. "Lena owns M S MARCO" gets copied into every single one of Lena's sign-off rows. And you can't record that Lena owns M S MARCO until she's signed off some model. Same anomalies, new disguise. B C N F closes it. The left side of every rule has to be a key. Owner isn't a key of that table, so you split it: an owners table with owner and dataset, and a sign-offs table with model and owner.

A: And here's the part that's actually worth knowing, because B C N F has a price. After that split, the rule "one owner per model per dataset" can't be enforced by one simple uniqueness rule anymore. Model and dataset are in different tables now. You'd need a trigger, or code in your application. Textbooks call that losing dependency preservation. It just means: can every rule about your data still be checked inside a single table after you split it. B C N F sometimes gives that up. Third normal form never has to. So, this is the one place where the "more normal" design isn't strictly better. And in practice most people aim for third normal form and then check it's also B C N F, which it usually is.

B: And there's a fourth, I'm guessing.

A: Fourth and fifth, for rarer cases. One sentence on fourth. If you stored a run's tags and the G P Us it ran on in one table, run, tag, G P U, you'd need a row for every tag and G P U combination, even though those two lists have nothing to do with each other. Fourth normal form says two independent lists go in two tables. Kent's guide covers both in a few pages.

A: So if you trace the whole path, it goes like this. You start with the one flat sheet. First normal form pulls the tags out into their own little table. Second normal form splits what depends on the run from what depends on run plus metric, so you get runs and metrics. Third normal form pulls out what depends on the author, the model, and the dataset. And you end up with six tables. Runs, metrics, run tags, authors, models, datasets. And runs is left holding three ids that point at the last three.

<!-- section: The Idea: Predict, Priya's email -->

A: Try this one. In the build you'll generate six hundred runs, which comes out to about seventeen hundred and sixty rows. Then you change Priya's email. How many rows does that update touch in the flat table, and how many in the normalized one? And then scale it up to two hundred thousand runs. Roughly how long does each update take?

B: Flat, it's every row she's in. She's one of six people, so... a few hundred? Normalized, one. And at two hundred thousand runs... the flat one's slow, I'd say seconds? Normalized is basically instant.

A: Good shape. The numbers: flat, it's one write per row she appears in, which, with the generator's seed, is six hundred eleven rows at six hundred runs. And about two hundred ten thousand rows at two hundred thousand runs. She's the busiest author, so she's in a big chunk of the sheet. Normalized, it's exactly one row. At any scale. Her email lives in one row of authors. On a Mac, the big flat update took about half a second. The normalized one took about half a millisecond, and most of that is just the cost of committing. And the flat one keeps getting slower as the table grows. The normalized one doesn't care how many runs she's done.

B: So a thousand times faster.

A: Roughly. But that's honestly not the important difference. The important one is that the flat version is only correct if your "where" clause finds every copy. And Sam's half-updated email, which is in the data, shows you how often that goes wrong.

<!-- section: The Idea: Foreign keys and constraints -->

A: So once runs only store an author id instead of the author's details, something has to guarantee the id points at a real author. That's a foreign key. It's a column whose values have to exist as a key in another table. So you say runs dot author id references authors. And now the database refuses a run whose author doesn't exist. And it refuses to delete an author who still has runs. Unless you tell it what to do instead. There's "on delete cascade", which means "fine, delete their stuff too". That's right for metrics, because a metric means nothing without its run. And "on delete restrict", which means "no, refuse". That's right for authors. You don't want deleting a person to quietly erase their experiments. And the guarantee this gives you has a name, referential integrity. Every reference points at something that exists. No orphans.

A: And this is where that line, "good schemas make bugs impossible instead of just unlikely", gets literal. A constraint is a rule the database checks on every write and refuses to break. Not null, unique, check, primary key, foreign key. And the way to think about it is: a constraint is a dependency you've told the database about. A uniqueness rule on email is the database enforcing "email determines the author". The primary key on metrics, run id plus name, is the database enforcing "one value per metric per run". A check that params are greater than zero, in a number column, stops somebody pasting the text "thirty-three M" into it. Code review catches some bad writes. A constraint catches all of them, forever. Including the ones from the notebook somebody runs at two in the morning.

<!-- section: The Idea: Natural or surrogate keys -->

B: [casual] Okay, so for authors, the key's obviously the email. It's unique, everyone has one.

A: That's the obvious choice, and it has a name. A key that's a real-world fact, something that means something outside the database, an email, an I S B N, a dataset name plus version, that's a natural key. And the trouble with the email is right there in the first story. Emails change. So if authors is keyed by email, and runs stores the email as its foreign key, then Sam's email change becomes an update of every run that points at him. The update anomaly is back. And now it's worse, because there's a constraint in the way that blocks the change halfway through. You'll actually hit that in one of the break-it exercises.

B: [frustrated] Huh. So I normalized it and got the same bug back.

A: Yeah, through the key. The usual fix is a surrogate key. That's a meaningless id the database makes up, one, two, three, or a U U I D, purely to identify a row. It means nothing, so nothing in the world can ever make it change. You still keep the email with a uniqueness rule, so nobody can be duplicated, but nothing points at it. Changing Sam's email is one write to one row.

A: So the rule of thumb. Use a surrogate for things whose identifying facts can change. People, models that get renamed, companies. A natural key is fine when it's truly permanent, or when the row is defined by it. Metrics are naturally identified by "this run, this metric", and inventing some metric row id adds nothing. It's also fine when using the natural key saves you joins in a table nobody ever updates. And datasets get a surrogate id, but also a uniqueness rule on name plus version, so the natural identity's still enforced.

<!-- section: The Idea: Joins are the price -->

A: Now the cost. The normalized schema has no row that looks like the original sheet. To get the sheet back, you join. A join combines rows from two tables where a column matches, like a metric's run id matching a run's run id. So, metrics to runs, runs to authors, models, datasets. That's the price of storing each fact once. You pay a little at read time to be correct at write time.

B: And that's the part that'd worry me. Joins are the slow thing, right? Like, everyone says "denormalize for performance". So the flat one's faster to read.

A: [firmly] That's the fear, and it's mostly wrong, as long as the columns you join on have an index. Quick reminder of what that is. An index is a sorted lookup structure, usually a B-tree, on one or more columns, so the database can jump to the matching rows instead of scanning the whole table. Kind of like the index at the back of a book. Primary keys always get one. Foreign keys, you usually add one yourself. So, looking up one run with all its author, model, and dataset details is five index lookups. Each one's a few microseconds. And scanning everything for a dashboard costs about the same either way, flat or normalized. Because the time goes into reading six hundred thousand metric rows, not into matching each of them up with one of six authors. You'll measure both of those. And the indexes lesson is where the why behind that lives.

B: So when do joins actually hurt?

A: A few places. Analytics queries that join many tables over billions of rows. Joins across machines, where the data for each side lives on a different server and has to cross the network to meet. And the read path of a page that has to render in five milliseconds. That's when you start thinking about breaking the rules.

<!-- section: The Idea: When to denormalize on purpose -->

A: And breaking them has a name too, denormalization. Deliberately storing a fact in more than one place, or precomputing a join, so reads are faster or simpler, and accepting the work of keeping the copies in sync. And the important thing is, it's not the absence of design. It's normalizing first, and then copying on purpose, with a plan for keeping the copies right. There are a handful of places where that's just the correct call.

A: First one, read-heavy dashboards. Your eval dashboard runs the same query, best N D C G per model per dataset, every time anyone opens it. And new runs land, what, a few times an hour. So you compute it once and store the result. That's a materialized view. It's a stored copy of a query's result, kept as a real table. Reading it is instant. But it's only as fresh as the last time you refreshed it. Postgres has them built in, you create one and then tell it to refresh when you want it updated. S Q Lite doesn't, so in the build you'll make one by hand, which is honestly more instructive anyway.

A: Second, warehouses. Analytics databases, BigQuery, Snowflake, Redshift, Duck D B, are built for scanning huge tables. And they usually store data column by column instead of row by row. So a wide table full of repeated strings compresses really well and costs very little. And the classic layout there is called a star schema. Picture it: in the middle, one long, narrow table, the fact table. One row per measurement. So for us, one row per eval result. And it's mostly ids and numbers: which run, which model, which dataset, which author, which date, the metric, the value. Then around it, like the points of a star, four short, wide tables. Those are the dimension tables. A model dimension with name, family, params, base checkpoint, owning team. A dataset one with name, version, row count, domain. An author one with name, email, team, manager, org. And a date one with the day, week, month, quarter.

B: Wait, but owning team on the model, that's... the thing we just said not to do. Team depends on the owner, not the model.

A: Right, and it's deliberate. Those dimension tables repeat things on purpose, so analysts can filter and group without chaining five joins. The reason it's okay is that nobody edits them in place. They're rebuilt by a pipeline from the normalized source. So the copy has exactly one writer, and it's a program.

A: Third, caches. A Redis key holding a rendered leaderboard is denormalized data with an expiry date. Same trade, same staleness problem. That's what the caching lesson is about.

A: Fourth, document stores. In MongoDB, or a JSON blob sitting in S three, you usually embed the things that are always read together and change together. So a run's metrics, as a list inside the run document. One read gets everything. But things that are shared, and change on their own schedule, like the author's email, are still better referenced by id. Otherwise you've just rebuilt the flat sheet, in JSON. Martin Kleppmann's chapter on data models is the best treatment of exactly where that line sits.

A: And the fifth one's subtle and kind of important. History that shouldn't change. An invoice stores the price at the time of sale. Even though the products table has a price. Because the invoice is supposed to remember the past.

B: Hmm. But that's a copy. The price is in two places. I'd have flagged that as a bug.

A: [thoughtful] Yeah, and that's the instinct to unlearn. A copy is only an anomaly when the copies are supposed to agree. The invoice price isn't supposed to follow the product price. It's a different fact: what it cost on that day. Same with a run storing which version of the dataset it used. That's not a copy of a changing fact. It's a fact about the run. Same with an event log recording which plan a user was on at the moment the event happened. If you normalized those away, you'd destroy history. So the test is: if the source changes, should this copy change too? If no, it's not a copy. It's its own fact. And it's why append-only logs, eval results, events, traces, rarely have update anomalies. Nobody updates them.

<!-- section: The Idea: JSON columns -->

A: Okay, one awkward case that you'll definitely hit. Hyperparameters. A LoRA run has a rank and an alpha. A distillation run has a temperature and a teacher model. Next month's runs have something you haven't thought of yet. A column per hyperparameter means a schema change per experiment, which is, I mean, nobody's doing that.

A: The textbook-normal alternative is a params table with run id, key, value. One row per hyperparameter. That's called E A V, entity, attribute, value. You store data as rows of "thing, attribute name, value" instead of as columns. And M L flow's tracking database does exactly this. It works. But every value ends up as a string, and a question like "runs where the learning rate is three e minus five and the LoRA rank is sixteen" turns into joining that table with itself.

A: Modern databases offer a middle ground, a JSON column. So the runs table gets a config column holding a little JSON object, learning rate, and a nested LoRA section with the rank in it. And both S Q Lite and Postgres can reach inside it in a query. And in Postgres, the binary JSON type, jsonb, can even be indexed. So when's that fine? Put things in JSON that you mostly read back whole, that vary between rows, and that nothing else depends on. No hidden "if you know this you know that" inside. Keep things as real columns if you join on them, enforce rules on them, or filter by them constantly. And when a JSON field turns out to be hot, like everyone suddenly filters by LoRA rank, you promote it. You add a generated column. That's a column the database computes from other columns in the same row, so here, it just pulls that one field out of the JSON. And you can index it like any normal column.

A: So, the way I'd put it: normalization tells you where facts should live. A JSON column is an honest way of saying "this part I haven't designed yet, and I'm choosing not to."

<!-- section: The Idea: Staleness -->

A: Now the bill. Every denormalized copy has the same failure. It can be out of date. Say a materialized view gets refreshed every fifteen minutes.

B: [working it out] So on average you're, what, seven or so minutes behind? And at worst fifteen.

A: [thinking out loud] Close. Average several minutes, yeah. The worst case is a bit worse than fifteen, though. Picture two lines, one on top of the other. The top line is writes, dots landing whenever. The bottom line is what the dashboard shows. And every so often there's a little block on the bottom line, a refresh. From the moment a write lands until the end of the next refresh that picks it up, the dashboard's showing the old answer. That stretch is stale. Now the unlucky write is the one that lands just after a refresh has already read its snapshot of the data. It misses that refresh. So it waits almost a whole interval for the next one, plus however long that next refresh takes to run. So, almost a full interval plus the refresh time.

A: And your options, from simplest to most work. One, refresh on a timer and print "updated four minutes ago" on the dashboard. That's honest, and usually enough. Two, refresh right after each batch of writes. Three, keep the copy updated incrementally with triggers. A trigger's a small piece of code the database runs automatically whenever a row is inserted, updated, or deleted. So each insert also bumps the summary. That's fresher, and fiddlier. Every write gets slower, and a bug in the trigger is a silent wrong number. So the question to ask isn't "how fresh can I make it". It's "how stale is acceptable for the person reading it". And that's a product question, not a database one.

<!-- section: Build It: The messy sheet -->

A: So here's what you'd build. Everything lives in a folder called workbench slash normalization, and you only need Python three and the S Q Lite command line tool, which are both already on the Mac and on the Spark. There's a Postgres version at the end, optional.

A: Step one's setup. A small Python script writes runs dot C S V, one row per run per metric. It's seeded, so your numbers match the lesson's. With the defaults it makes six hundred runs, which comes out to one thousand seven hundred sixty-three rows. Six authors, five models, plus one rare model, the Deberta, that gets exactly one run, right in the middle. Five datasets, four metrics, eight possible tags. And it plants the kind of drift a real shared sheet picks up. After June, Sam's runs mostly use his new email, about eighty-five percent of them, so it's a half-finished email change. About six percent of the Mini L M L twelve rows say thirty-three point four million params, because someone "corrected" it in a few rows. About three percent of the L six rows spell the model name in capitals, same model, different spelling. About five percent of the M S MARCO version two rows say six thousand eight hundred ninety rows instead of six thousand nine hundred eighty, a typo copied forward. And about four percent of Lena's rows say she's on the ranking team instead of search.

B: [amused] That's a very realistic sheet.

A: It's every sheet. Then you load the C S V as-is into a table called flat in S Q Lite. One gotcha to check there. Newer versions of the S Q Lite command line tool, like three point five four, create the imported columns with no type, so numbers come in as numbers. Older versions make every column text. And then asking for the maximum metric value compares them as strings, alphabetically, which is quietly wrong. So you check the type of one value first, and if it says text, you cast the numeric columns to real numbers in your queries.

<!-- section: Build It: Find the anomalies -->

A: Step two is yours to write, and it's the detective part. Before you look at the data, write down every dependency you believe should hold. That dependency map's a good start. Each one's a suspect. And remember, a query can't prove a dependency, but it can catch one being broken. So the shape of the check is: group by the "if you know" side, count how many different "you know" values show up in each group, and keep the groups where that count's more than one. So for "author name tells you the email", you'd group by author name and list the distinct emails. Sam comes back with two.

A: And you do that for every rule on your list. Name to team, run to model, run to dataset, model to params, dataset plus version to row count. Then four more that take a bit more thought. One, are there two model names that are really the same model? Lowercasing them will tell you. Two, how many rows would changing Priya's email touch? Count first, then actually run the update, and ask S Q Lite how many rows it changed. Three, the insert anomaly: actually write the insert that records "tf clicks version one exists, forty thousand rows" in the flat table. And notice what you have to put in run id, model name, metric value. You have to make something up. And then think about what that fake row does to a dashboard that averages metric values.

B: It drags the average around. Or it's a null and it's silently skipped, either way it's lying.

A: Either way it's lying. Four, the delete anomaly. Find the model with exactly one run, delete that run's rows inside a transaction, ask what the model's parameter count is, nothing comes back, and then roll back. A transaction, quick reminder, is a group of changes that either all happen or none do. Commit makes them stick, roll back throws them away. So you can do the damage, look at it, and undo it.

A: And for every conflict you find, write one line on what the truth probably is. For most it's obvious. For Lena's team, it isn't. Four percent of her rows say ranking.

B: [working it out] So either she moved teams at some point, or somebody fat-fingered it a few times. You'd check whether those rows are all at the end, I guess.

A: You could look for a pattern in the dates, sure. But in general the flat sheet can't tell you. And that's the point. Once the copies disagree, the information about which one's right is gone.

<!-- section: Build It: Schema, migration, view -->

A: Step three, you design the schema by hand, in a schema file, and it should come out to about six tables. The way to get there: every determinant that isn't the key of the whole sheet becomes its own table. And the requirements double as test cases. Every table has a primary key, and for each one you write a comment saying natural or surrogate, and why. Every reference is a foreign key, and you decide what happens on delete. What should happen to a run's metrics if the run's deleted? To an author's runs if the author's deleted? And then the database itself has to refuse a list of bad things. Two authors with the same email. Two models whose names differ only by case. Two datasets with the same name and version. Two values for the same metric of the same run. A parameter count that isn't a positive number. A model family that isn't cross-encoder or bi-encoder. And params get stored as a number, in millions, not the text "thirty-three M".

A: A few S Q Lite pieces make that possible. And one of them's a trap worth hearing twice. Foreign key checking is off by default in S Q Lite, and it's set per connection. So every script has to switch it on. Then there's the integer primary key, which is S Q Lite's surrogate id. A uniqueness rule that ignores case, which is what catches the capitalised model name. Check rules, foreign key references with an on-delete choice, uniqueness across several columns together. And strict tables, from version three point three seven, which refuse values of the wrong type. And you add an index on each foreign key column in runs yourself, because S Q Lite indexes primary keys and unique columns for you, but not foreign keys. Then, try to break your own schema. Write five inserts that should fail, and check each one fails with the error you expected.

A: Step four's the migration, a Python script that reads the C S V and fills your schema. The mechanical part's easy. The interesting part is that the C S V contradicts itself, and the migration is where you decide, once, what's true. So there's a helper that works out the canonical author. Which email wins, the newest or the most common? And one for the canonical model, which merges the case variants and picks one param count. Then the order matters. Parents first: authors, models, datasets, remembering the id each got. Then runs, one per distinct run id, pointing at those ids. Then the tags, split out of that one cell. Then metrics, one per C S V row. And all of it inside one transaction, so if anything fails halfway, nothing's written, and you don't end up with half a database. And you write your decisions as comments at the top of the file. "Newest email wins, because..." "Thirty-three million, because..." And that's real work in every migration you'll ever do. It's always a judgment call. Which is exactly why it should happen once, in code, instead of every time someone reads the sheet. If you merged the case variants, you should end up with six authors, six models, five datasets, six hundred runs, eight hundred eighty-nine run tags, and one thousand seven hundred sixty-three metric rows. Then you have an agent review the script for anything that'd silently drop or duplicate rows.

A: Step five, you rebuild the original sheet as a view. A plain view is just a saved query. Nothing's stored, it runs every time you read from it. You start from metrics, because that's one row per C S V row, and join outward to runs, authors, models, datasets. The tags go back into one semicolon-separated cell, sorted, so they match. The params get formatted back into "thirty-three M" style. And then you prove it. The view has to have one thousand seven hundred sixty-three rows. And you load the raw C S V into a scratch table, apply the same cleaning decisions to it, and ask for rows that are in the view but not the cleaned copy, and then the other way round. Both have to come back empty.

<!-- section: Build It: The materialized dashboard -->

A: Step six is the materialized dashboard. For each model and dataset: how many runs, the best and the mean N D C G at ten, and who did the best run. You write that query against the normalized tables. S Q Lite has no materialized views, so you build one. A real table built from the query, and a refresh function that empties it and refills it inside one transaction. That way a reader never catches it half-empty. And it returns how many seconds it took.

A: Then the staleness experiment, which is the fun bit. Refresh. Read the row for Mini L M L twelve on the tf queries August twenty twenty-six dataset. Insert a new run on that pair with an N D C G higher than the current best. Read the dashboard table again. The new best isn't there. Read the live query, it is. Refresh, and now they agree. And then the last piece, which is small but it matters a lot. Store a "refreshed at" time, and print "updated so many seconds ago" with every read. That one line is most of what makes a stale dashboard acceptable.

<!-- section: Build It: JSON and Postgres -->

A: Step seven, the JSON column. You add a config column to runs with a check that the text is valid JSON. Move the learning rate and batch size into it, and give the runs tagged LoRA a nested section with rank sixteen and alpha thirty-two. Then you query inside the JSON for runs with LoRA rank sixteen, and ask S Q Lite for its query plan, which is how it tells you how it intends to find the rows. Full scan. It reads every run. Then you add a generated column that pulls the LoRA rank out, mark it virtual, index it, ask for the plan again, and now it uses the index. The arrow syntax for reaching into JSON needs version three point three eight or newer, and on older ones there's a json extract function that does the same. And this is one where you're allowed to ask an agent to explain what "virtual" means there, versus "stored", but you write the queries yourself.

A: And the optional last step, on the Spark, if you've got Docker. Run Postgres in a container and port your schema. A few things translate. The integer primary key becomes an identity column. The case-insensitive uniqueness becomes a unique index on the lowercased name. Foreign keys are just always on. And then you get the real materialized view, and you can refresh it "concurrently", which means readers keep seeing the old copy while the new one's being built. That needs a unique index on the view, and it's slower than a plain refresh. But a plain refresh locks readers out while it runs.

A: You're done when your anomaly queries find all five planted conflicts, the two emails, the two param counts, the case variant, the two row counts, the two teams, plus the insert and delete anomalies. Your schema refuses every bad insert you wrote, and you can say which rule each constraint enforces. The migration gives the expected counts with its decisions written down. The view matches the cleaned sheet both ways. And you've watched the dashboard show an old answer, and you print how old it is.

<!-- section: Measure -->

A: Then measure. Everything at six hundred runs, and again at two hundred thousand, which is just running the generator with a bigger number and doing the same load and migration. Time each thing in Python, best of five. And here's what came out on an Apple Silicon Mac, Python three point one four, S Q Lite three point five three, at two hundred thousand runs, which is six hundred thousand and thirty-seven rows. Yours will differ. The shape shouldn't.

A: The email change is the headline. Flat: two hundred ten thousand one hundred eighteen rows rewritten, five hundred seventeen milliseconds. Normalized: one row, half a millisecond. Writes in the flat table scale with how often a fact is repeated. Writes in the normalized one don't. At six hundred runs, both are fast, and the difference doesn't matter for speed. It matters for correctness. At two hundred thousand runs, the flat email change rewrites a third of the table.

B: Okay, and the file size? Because, honestly, I always thought that was the point of normalizing. You stop storing the same strings over and over, the database gets way smaller.

A: [amused] Everyone thinks that. It gets smaller, but not dramatically. Flat was a hundred one megabytes. The C S V itself was ninety-two. Normalized was seventy-six. Because the repeated strings in the flat table are short, and the normalized tables add indexes, and they repeat the run id in metrics and in run tags. At six hundred runs, the two files are about the same size, around three hundred kilobytes each. So normalization is about correctness first. The space savings only get big when the repeated things are big, like long descriptions or configs, or there's a lot of them.

A: Now the dashboard, computed live. Flat, a hundred sixty-eight milliseconds. Normalized, with all the joins, a hundred fifty-seven.

B: [surprised] Wait, the normalized one's faster? With joins?

A: About the same, really, slightly faster here. And if you expected the join to be much slower, that's the useful surprise. Both versions have to read every N D C G row. Matching each one to one of six models is cheap next to that. Joins get expensive when both sides are huge and unindexed. Not when a big table points at small ones.

A: And here's the one that should actually bother you. The flat dashboard is wrong. It shows thirty-one model-and-dataset groups. The normalized one shows twenty-six. Because the capitalised L six and the lowercase L six get counted as different models. So each of that model's five datasets shows up twice, with the runs split between the two. And nobody would ever notice that in a chart with thirty-one bars. The normalized version can't produce it, because the case-insensitive uniqueness rule refused the duplicate during migration.

A: Looking up one run with all its details by id: flat, thirty-three milliseconds. Normalized, a hundredth of a millisecond.

B: So that's the big normalization win.

A: [jumping in] No, and this one's a little trap. That's an index story, not a normalization story. The flat table just doesn't have an index on run id, so it reads the whole table. Add one and rerun it, and the flat lookup drops to a few microseconds too. So keep that in mind whenever somebody shows you a benchmark. Check what they're actually comparing.

A: Last, the materialized view. Reading the dashboard from it took two hundredths of a millisecond. Refreshing it took a hundred fifty-four milliseconds.

B: So reading it is thousands of times faster than the live query. That's a pretty clear win.

A: [dry] It's thousands of times faster to read, and that number's useless on its own. You have to pair it with how often you refresh and what that costs. At a hundred fifty-four milliseconds per refresh, refreshing every minute costs about a quarter of a percent of one core. Basically free. But refreshing on every write would make each insert a hundred fifty-four milliseconds slower. And that's when you'd reach for triggers, or some kind of incremental update.

<!-- section: Break It -->

A: Then you break it, on purpose. Four ways. First, forget to switch foreign keys on. Open a fresh S Q Lite connection to your database and insert a run whose author is number nine hundred ninety-nine. Who doesn't exist.

B: And it just... lets you?

A: [amused] It succeeds. S Q Lite didn't check. Foreign key enforcement is off by default, for backwards compatibility, and it's per connection. So every script and every notebook has to turn it on itself. Then turn it on, retry, and watch it fail. And there's a foreign key check command that finds any orphans that slipped in while it was off. Postgres and MySQL's InnoDB enforce foreign keys by default, so that exact trap is S Q Lite's. But "the rule exists and nobody's checking it" happens everywhere. A session that switched checks off for a bulk load. A rule that's only enforced in one service's code, while another service writes to the same table.

A: Second, use the email as the key. Make a copy of your schema where authors is keyed by email, and runs reference the author by email. Migrate, then change Sam's email in authors. With foreign keys on, it fails, foreign key constraint failed. Because a hundred thirty-two runs point at the old value.

B: Can't you just tell it to cascade the update?

A: You can. There's "on update cascade", and the database will rewrite all hundred thirty-two runs for you. It works. But look at what you built. The update anomaly, automated. That's the whole case for surrogate keys, in one experiment.

A: Third, over-normalize. Move every run attribute into one table of run id, key, value, all as text. Model, dataset, learning rate, batch size, everything.

B: [skeptical] I mean, isn't that the most normalized you can get? It's as split up as it goes.

A: [gently] It feels like it. But try writing "best N D C G per model, for runs with learning rate three e minus five and batch size thirty-two". Count the self-joins. And then check what happens when you compare the text "three e minus five" to the number three e minus five, when everything's stored as text. E A V is maximally flexible and minimally checkable. No types, no foreign keys, no "this can't be empty" on the attributes that matter. Normalization says one fact in one place. It doesn't say "as many tables as possible".

A: And fourth, let the dashboard drift. Generate a thousand new runs with a different seed, migrate only the new ones, and don't refresh. Compare the dashboard table to the live query. The counts are off by a thousand runs' worth, and the "best" column might just be wrong. Then add a check on "refreshed at" that raises an error if the copy is older than ten minutes. And honestly, that's the whole job of a cache. A copy, plus a rule for when the copy's too old to trust.

<!-- section: Scaling it -->

B: Okay, so take it to work scale. Say the eval results table gets to a billion rows and the leaderboard query takes forty seconds. What do I actually do?

A: [measured] First you find out why. Ask the database for the query plan. If it's scanning when it should be jumping straight to the rows, add the right index, say on metric name and model. If it's a genuine full aggregation over everything, stop recomputing it on every page load. Precompute it into a materialized view or a summary table, refresh it on a schedule or incrementally, and show how old it is. And if the people reading it are analysts running lots of different aggregations, move the data to a columnar warehouse with a star schema. A narrow fact table of results, wide dimension tables, and partitioned by date, so most queries only read a slice of it. And through all of that, the normalized database stays the source of truth for writes. The copies get rebuilt from it. The trade at every step is freshness, and some extra write work, in exchange for read speed. So the very first question is, how stale is the leaderboard allowed to be?

A: And if you want to go further, Bill Kent's "Simple Guide to Five Normal Forms" is the best short explanation ever written, and Kleppmann's chapter on data models is the best on when to embed and when to split. This is the shape half of databases. The indexes lesson is the speed half, the reason those joins were cheap. Transactions is what kept your migration and your refresh all-or-nothing. And caching is this last part, staleness, with a lot more traffic.

<!-- section: Close -->

B: [working it out] Okay, let me try to say it back. A flat table copies facts into every row, so edits can make it contradict itself, and you can't add or keep facts that don't have a row of their own. So you split it into more tables until nothing's repeated, and you pay for that with joins, which turn out to be cheap. And then you denormalize when you need reads to be fast.

A: [warmly] That's nearly all of it. Two sharpenings. It's not "split until nothing's repeated". It's one table per kind of thing, so each fact has exactly one home, and the rule for spotting a fact in the wrong home is "if you know this, you know that", where "this" isn't the key. Split further than that and you get E A V, which is worse. And denormalizing isn't just going back to the flat sheet. It's keeping that one true home, and then making copies on purpose, each one with a known owner and a known age. The sheet's problem was never that facts were copied. It was that nobody knew which copy was the real one.
