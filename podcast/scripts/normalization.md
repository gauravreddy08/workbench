<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, your team keeps eval results in a shared sheet. One row per metric per run. Run ID, who ran it, their email, the model, how big the model is, the dataset and its version, the metric, the number. Started as a couple dozen rows. Now it's thousands, and every week someone exports it so a notebook can plot it.

B: Sounds like every team I've ever been on.

A: Right. And then, in one month, three small things happen. First, Sam's email changes. Someone does a find-and-replace on the sheet, but only on the rows that were showing after a filter. So now Sam has two emails, and the notebook that groups by email thinks he's two people.

B: Ouch. Okay.

A: Second. Priya registers a brand new dataset. She wants people to know it exists. But every row in the sheet is a metric from a run, and nobody's run anything on it yet. So there's literally no row to put it in. She posts in Slack instead, where nobody will ever find it again.

B: [laughs] Yeah.

A: And third, someone cleans up failed runs. And one of those was the only run anyone ever did with one particular big model. The rows go. And with them, the only place anyone had written down how big that model is.

B: [skeptical] I mean, those all sound like people being careless, though.

A: That's the thing. None of it is anyone's fault. It's the sheet's fault. The shape of it. It stores the same fact over and over, or it stores a fact only as a side effect of storing some other fact. So every ordinary edit is a chance for it to disagree with itself. And the fix has a name you've probably heard at work. Normalization.

<!-- section: One row, five things -->

B: I always thought of normalization as kind of, tidying up. Splitting things out so you don't repeat yourself and waste space.

A: That's the common picture. And space is honestly the least of it. When I actually measured, the split-up version was a bit smaller, not dramatically. It's about whether you can trust the numbers.

B: Okay.

A: So here's the root cause, in one sentence. That sheet mixes several kinds of thing into one row. A single row is a metric value, and a run, and a person, and a model, and a dataset, all at once. Each of those has its own facts. A person has an email. A model has a size. And they've all been glued together, and copied wherever the glue went.

B: [working it out] So Sam's email is written once for every metric of every run he's ever done.

A: Every single one. And here's a nice way to see it. Which thing in that row is actually fine? The metric value. It lives in exactly one row, because that row is that fact. This run, this metric, this number. Everything else in the row is a passenger. And normalization is just giving each passenger its own seat.

<!-- section: Codd -->

A: And the idea's surprisingly old. Back in the sixties, databases were these tangles of records linked by pointers. IBM had one, built partly for the Apollo program's parts lists, that stored everything as trees. And a program found things by walking the tree. Go to this supplier, follow the pointer to its first part, then the next one.

B: So if you change how it's stored...

A: Every program that walks it breaks. So in nineteen seventy, a mathematician at IBM, Ted Codd, proposes something kind of radical. Store everything as plain tables of values. No pointers. A program just says what rows it wants, and the system figures out how to find them.

B: That just sounds like a normal database.

A: It does now. Back then it was radical. And a year later he noticed that even with flat tables, you could still store one fact in lots of places. And he named the three kinds of trouble it causes. An update problem, where you change one copy and miss another. An insert problem, where you can't record a fact on its own. And a delete problem, where removing one thing takes another thing with it.

B: [working it out] Oh. Those are the three stories. Sam, Priya, and the deleted model.

A: Those are the three stories. And my favorite detail, Codd later joked he picked the word "normalization" because Nixon was in the news at the time, normalizing relations with China.

B: [laughs] That's great.

<!-- section: If you know this, you know that -->

A: So how do you do this on purpose, instead of by squinting at a sheet? There's really one tool, and it's simpler than its name. It's a rule of the form, if you know this, you know that.

B: Like?

A: If you know the run, you know which model it used. If you know someone's email, you know their name. If you know the model, you know how big it is. And if you know the run and which metric, then you know the number. The run on its own isn't enough, because one run has several metrics.

B: Okay, and you find those rules by looking at the data. Group by one column, see if the other one's always the same.

A: [jumping in] So, half right. A query can catch a rule being broken. If you find two rows with the same run and different models, something's wrong. But it can never prove a rule. Maybe today every model of a certain size happens to be the same model. That doesn't mean size tells you the model. Tomorrow someone trains a different one the same size. These rules are facts about the world, not about whatever's in your table right now. You decide them by asking, could two rows ever legitimately disagree on this?

B: Huh. Okay.

A: And when I went hunting for broken ones in the sheet, one of them stuck with me. One person's team was listed as something different in a handful of her rows. Did she switch teams? Was it a typo? And there's no way to know. Once the copies disagree, the information about which one was right is just gone.

B: That's kind of grim.

A: It's the whole argument, really. If there's only one copy, it can't disagree with itself.

<!-- section: The key, the whole key -->

A: So the official theory has these levels, called normal forms. First, second, third, and a stricter one after that. And you don't need to memorize definitions. Each one is the same promise, every fact in one place, just catching a different kind of copy.

B: Give me the short version.

A: The first one is, one value per cell. The sheet has a tags column, with a few tags crammed in one cell with semicolons. That's a list pretending to be one value. You can't put a rule on it, you can't index it, and searching it with a text match also hits some other tag that happens to contain the same word. So the list gets its own table. One row per tag.

B: Sure.

A: And then the next two have this lovely old summary. Every column has to depend on the key, the whole key, and nothing but the key.

B: [amused] So help me Codd?

A: [laughs] People do add that, yeah. So, the key is whatever pins down a row. In the sheet, that's the run plus the metric. The whole key part means, the model depends on just the run, half the key. So it gets repeated for every metric of that run, and a run can end up disagreeing with itself about which model it used. Move it out into a runs table. And the nothing-but-the-key part means, the model's size doesn't really depend on the run at all. It depends on the model. So it gets repeated for every run of that model. Move it out into a models table.

B: And same for people and datasets.

A: Same for people and datasets. And what's nice is the other two problems just vanish along the way. Priya's dataset with no runs? That's now just a row in the datasets table. Deleting the only run of that big model? The model's row is still sitting in the models table, untouched.

<!-- section: Who you really are -->

B: So the runs table points at a person. What does it point with? Their email?

A: That's the obvious choice, and it's the one that bit Sam. An email feels unique and permanent. Then it changes. If everything points at people by email, Sam's change means rewriting every run that points at him. You're right back to the update problem.

B: Can't the database just do that for you?

A: It can, actually. You can tell it to cascade the change. And it works. But think about what you've built. It's the update problem, automated. So instead you give each person a meaningless number. Person one, person two. That's called a surrogate key. It means nothing, so nothing in the world can ever make it change. The email's still there, still not allowed to repeat, but nothing points at it. Changing it is one write.

B: So use made-up IDs for things whose identity can change.

A: People, models that get renamed, companies. And then you tell the database about these rules directly. This column has to be unique. That column has to point at a real person. This number has to be positive. Those are constraints. And there's a line I really like about it. Good schemas make bugs impossible, instead of just unlikely. Code review catches some bad writes. A constraint catches all of them, forever, including the notebook someone runs at two in the morning.

<!-- section: The price -->

B: [skeptical] But now nothing looks like the sheet anymore. Every time you want to see it you're joining five tables. Isn't that slow?

A: That's the price, and it's what everyone's afraid of. Joining means stitching those tables back together on matching IDs. And when I measured it, the dashboard query took about the same time either way.

B: Really?

A: Really. Think about where the time goes. Both versions have to read every metric row. Matching each one up to one of a handful of models is cheap next to that. Joins get expensive when both sides are huge and nobody built an index on what you're matching. Not when a big table points at a few small ones.

B: And the writes?

A: The writes are the headline. When I scaled it up and changed Priya's email, the flat version rewrote a huge chunk of the whole table. Every row she'd ever touched. The split version changed one row. And the slow part isn't even the worst part.

B: What's the worst part?

A: The flat dashboard was wrong. Somewhere in the sheet, one model's name had been typed with different capital letters in a few rows. So the dashboard counted it as two different models, and split its runs between them. And you'd never notice, in a chart with a few dozen bars. The split version couldn't even load that. The rule that model names are unique, ignoring case, refused the duplicate when I moved the data across.

<!-- section: Breaking the rules on purpose -->

B: So, should everything always be fully normalized?

A: No, and this is the part people miss. Breaking the rules on purpose is fine. It just has to be on purpose. Normalize first, then copy, with a plan for the copy.

B: Like what?

A: Like a dashboard everyone opens all day, that runs the same heavy query each time, while new runs only land a few times an hour. You compute the answer once and store it. That's called a materialized view. Basically a saved copy of a query's result. Reading it is instant. Or analytics warehouses, where they keep wide, repetitive tables on purpose, because they're built for scanning huge amounts of data and nobody edits those tables by hand. They get rebuilt from the clean source. Or a cache. A cache is really just a copy with an expiry date.

B: And the cost is they go stale.

A: Every copy can go stale. When I added a new run with a better score, the saved dashboard didn't show it. The live query did. Until the next refresh. And the cheapest fix there is almost embarrassing. Just print "updated four minutes ago" on the dashboard. The real question isn't how fresh can I make it. It's how stale is okay for the person reading it. And that's a product question, not a database one.

B: [working it out] Wait, but then, isn't every log of past events full of copies? Like if a run records which dataset version it used.

A: That's the subtle one. And no, that's not a copy. Think of an invoice. It stores the price at the time of sale, even though the product has a current price, because the invoice is supposed to remember the past. A run recording the dataset version it used is a fact about the run. Copying is only a problem when the copies are supposed to agree.

<!-- section: Ending -->

B: Okay, let me say it back. Normalization means splitting a big table into smaller ones so nothing gets repeated. Then each change is one write, and your data can't contradict itself. And joins put it back together, and they're cheaper than you'd think.

A: That's most of it. I'd shift one word. It's not really about repetition. It's that every fact gets exactly one home. And the test for any copy you do keep is just one question. If the original changes, should this change too? If yes, you need a plan for keeping it in sync, or at least for saying how old it is. If no, it was never a copy. It's its own fact.
