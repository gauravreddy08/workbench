<!-- section: The Problem -->

A: [relaxed, thinking out loud] So every TinyFish agent run spends credits, right? And somewhere there's a little function that charges for one step of a run. Picture the simplest version of it. It reads the wallet's balance. It checks there's enough. It writes the new balance, which is the old one minus the cost. And it adds a row to a ledger, a log of every charge, saying "this wallet paid this much". Then it commits. Four steps. And it's correct. Every test passes.

B: Sounds fine to me. What's wrong with it?

A: Nothing, until a customer launches a batch of agent runs and eight workers start charging the same wallet at the same time. I mean, that's a Tuesday. So the lesson actually runs this. Postgres sixteen, on an M four Pro. One wallet, starting at a hundred thousand credits. Eight threads, each doing five hundred charges of one credit. So four thousand charges total. At the end, the ledger has four thousand rows, one per charge, exactly like it should. And the balance went from a hundred thousand to ninety-nine thousand, four hundred twenty-eight.

B: [working it out] It should be ninety-six thousand. So it's off by... three thousand and something?

A: Three thousand four hundred twenty-eight. Of the four thousand charges, three thousand four hundred twenty-eight never came off the balance. Run it again and you get a slightly different number, ninety-nine thousand four hundred ninety-one the second time. Never the right one.

B: [skeptical] And it didn't throw anything? No error?

A: [flatly] Nothing crashed. Nothing got logged. The service just quietly gave away eighty-six percent of the usage for free. And the only way you'd ever notice is if you added up the ledger and compared it to the balance. Like, someone in finance, a month later.

B: Okay, that's... a bad day.

A: And here's a second, different way to lose money. A customer moves five hundred credits from their personal wallet to their team wallet. That's two writes. Subtract five hundred here, add five hundred there. And the process dies between them. A deploy, the kernel killing it for using too much memory, a power cut, whatever. Now five hundred credits have left one wallet and arrived nowhere.

B: So those are two different bugs.

A: Two different problems, and they're the two problems transactions exist to solve. One is crashing halfway. The other is two pieces of work interleaving, stepping on each other. And if you remember nothing else from this, a transaction is the database's answer to both.

<!-- section: Origin -->

A: [relaxed] And this idea comes from people who had both problems at scale before anyone else. In the nineteen seventies, IBM had a team building one of the first relational databases, a project called System R. And their customers were banks and airlines. Thousands of terminals, all updating the same accounts and the same seat maps at once. On machines that crashed. A lot.

B: [amused] So, the exact two problems.

A: The exact two. And a guy on that team, Jim Gray, wrote the idea down in nineteen eighty-one, in a paper called "The Transaction Concept: Virtues and Limitations". And he borrowed it from contract law, which I love. A transaction is like a contract. Either every party's obligations happen, or none of them do. And once it's signed, it stays signed. Then two years later, two German researchers, Theo Härder and Andreas Reuter, were writing about crash recovery, and they packed the properties into an acronym. A C I D. ACID. Atomicity, consistency, isolation, durability. And it stuck, honestly partly because it sounds good. Gray won the Turing Award in nineteen ninety-eight, largely for this work. Every database you'll ever use, and most of the money in the world, runs on these ideas.

<!-- section: The Idea: A transaction is a bracket -->

A: So what is one, mechanically? A transaction is a group of database operations that the database treats as one unit. Either all of them take effect, or none do, and nobody else ever sees it half done. And the way you write it is basically a pair of brackets around some work. You say BEGIN, that opens the bracket. Then your two updates, take five hundred from personal, add five hundred to team. Then COMMIT, which closes the bracket and says "make all of this real". And COMMIT makes all of the changes permanent and visible to everyone, at one instant. Or you close it with ROLLBACK, which says "forget all of it", and every change gets thrown away like it never ran. And everything inside the bracket gets four promises. Those are the four letters.

B: [a bit unsure] Okay, but hang on. That charge function at the start. It ended with a commit. So it was already in a transaction, wasn't it? I'd have assumed that's the whole fix. You're in a transaction, so you're safe.

A: [jumping in] Yeah, that's the trap. It was in a transaction. Python drivers like psycho P G, the Postgres driver, open a transaction for you on the very first statement and keep it open until you call commit or rollback. So the naive charge was inside a transaction the entire time. And it still lost three thousand credits.

B: Then what was the transaction even doing?

A: [patiently] It was protecting it from the first problem. Crashing halfway. It wasn't protecting it from the second one, the interleaving. Being in a transaction is not the same as being protected from other transactions. That part depends on the I, and the I has settings. So hold that thought, we'll get there.

<!-- section: The Idea: A is for atomic -->

A: Start with A. Atomicity. The guarantee that a transaction's changes happen completely or not at all. If anything fails partway, the database undoes the part that already happened. So that fixes the transfer. If the process dies after the first update, the database acts like the transaction never started. The five hundred credits are still sitting in the personal wallet.

B: Atomic, though. I always heard that word in, like, the threading sense. Atomic operations, so two threads can't interleave. Isn't that what this is?

A: [amused] Good instinct, wrong letter. Here it just means indivisible, like the Greek word. It's not about concurrency at all. That's the I. Atomicity is about failure. A crash, an error, a rule that rejects the second write, or your own code deciding to roll back. Any of those, and it's all or nothing.

B: [skeptical] But how? The process that was doing the work is dead. Who's undoing anything?

A: The database keeps a diary. Before it changes anything in its actual data files, it writes a record of the change to an append-only file. You only ever add to the end. That's called the write-ahead log, W A L. Every change goes into the log first, before it's applied to the data. And the very last thing a transaction writes to the log is a commit record. One little entry that says "this one's done". After a crash, the database reads the log back. Transactions with a commit record are kept. Transactions without one are treated as if they never happened.

B: So the commit record is basically the signature on the contract.

A: [warmly] Pretty much, yeah. Picture the log as a strip running left to right. First box, transaction one, wallet minus ten. Next box, transaction one, add a ledger row. Then transaction two sneaks in, personal wallet minus five hundred. Then transaction one's commit record. And right at that moment the database flushes the log to disk, and only then does it tell the client "committed". Then there'd be a box for transaction two, team wallet plus five hundred... but it's dashed, because the crash comes first and it never gets written. Now restart. Recovery reads the strip. Transaction one has a commit record, so redo its changes, it happened. Transaction two has no commit record, so it's treated as aborted, and the personal wallet keeps its five hundred. A transaction exists the instant its commit record is safely on disk. Not a moment before.

B: And "undo" means, what, it goes back and puts the old numbers in?

A: Depends on the database. MySQL's engine, InnoDB, does roughly that. It keeps an undo log, a record of the old value of every row a transaction changed, and on rollback it copies the old values back. Postgres does something lazier and, honestly, cleverer. It never overwrites a row at all. It writes a new version of the row, and separately marks the transaction that made it as committed or aborted. An aborted transaction's versions just stay invisible forever, and get cleaned up later. We'll see that properly in a bit. But either way, the commit record is the single moment of truth.

<!-- section: The Idea: D is for durable -->

A: Which brings us to D, durability, the other side of that same moment. The guarantee is, once the database says COMMIT succeeded, the change survives crashes and power loss. Like, if the power goes out one microsecond after COMMIT comes back to you, your data's still there.

B: Isn't that just... the database writing to disk? That seems like the easy one.

A: [thinking out loud] It's harder than it sounds, and you've actually seen why. Remember from the lesson on saving files: when a write call returns, that means almost nothing. The bytes are sitting in the operating system's page cache, which is just RAM. Pull the plug, they're gone. The call that actually waits until the drive says "it's on the flash" is F sync. So Postgres, by default, doesn't answer your COMMIT until it's written the log and called F sync, or an equivalent, and the drive has confirmed. And the data files themselves? Those can be updated lazily. Minutes later, even. Because the log is enough to rebuild them.

B: So every single commit waits for the disk.

A: Every commit waits for a flush. And now you can put a number on that. On a typical N V M E SSD on Linux, a flush is very roughly tens of microseconds to a millisecond. So compared to the rest of a tiny transaction, it's not free. On a Mac, as the files lesson showed, what "flushed" even means varies a lot depending on which call you use. Postgres has a setting that picks which flush call it uses, and on the Mac in the lesson it reported open data sync. And Postgres softens the cost with something called group commit. When lots of transactions commit at the same time, one flush covers all of their commit records together.

B: And if I don't care that much? Like, can I just skip the flush?

A: There's a dial for exactly that. Set synchronous commit to off, and COMMIT comes back before the flush. In a crash you might lose the last fraction of a second of commits. The docs bound it at three times a setting called the wal writer delay, which defaults to two hundred milliseconds. So at worst, around six tenths of a second of recent commits.

B: But then you've got half-done stuff on disk.

A: [jumping in] No, and that's the nice part. You never end up half done, because the log's still the source of truth. You just lose the last few whole transactions. Which is a perfectly reasonable trade for, say, analytics events. It is not one you make for a wallet.

<!-- section: The Idea: C is for consistent -->

A: Then C. Consistency. In ACID it means a transaction moves the database from one valid state to another, where "valid" means every rule you declared still holds. And those rules are constraints. Rules in the schema that the database checks on every single write. Not null, meaning this column must have a value. Unique, no two rows can share this. A check, which is any condition you like. And a foreign key, meaning this id has to actually exist in that other table. So for the wallets table, you'd say the balance is a big integer, it's not null, and there's a check that the balance is at least zero.

B: And then a negative balance just... can't happen?

A: Can't be committed. Try it and the statement fails, and the transaction can only roll back. And the failure that prevents is a bug, or a race, quietly writing nonsense into your database that you discover a month later.

B: Fine, but that's only the rules you wrote down. The real rule here is "the ledger has to add up to the balance". Can the database check that?

A: [amused] Not unless you find some way to declare it. And that's the honest note about C. It's the odd letter. Martin Kleppmann, in Designing Data-Intensive Applications, points out that consistency is mostly a property of your application, not the database. The database checks the rules you declared. It has no idea about "the ledger sum must equal the balance change". So A, I and D are the database's tools. C is what you build with them.

<!-- section: The Idea: I is for isolation -->

A: And then I. Isolation. The one that would have saved the credits service, and the one with settings. Isolation means concurrently running transactions don't interfere with each other. Each one behaves, to some degree, as if it were running alone. And "to some degree" is the setting.

B: What's the strongest version of it?

A: The ideal is really simple to say. Run a thousand transactions at once, and the result has to be the same as if they'd run one at a time, in some order. Doesn't matter which order, just some order. That's called serializable, because the outcome matches a serial schedule, one after another. And it's expensive. So databases offer weaker levels too. And each weaker level lets certain specific bad things through. Those bad things have names. Let's meet them.

<!-- section: The Idea: The lost update, again -->

A: And you've already met the first one. In the threads lesson, two threads each ran counter plus-equals one. Each read forty-one, each wrote forty-two, and one of the increments just vanished. The credits bug is the identical shape, one floor down. Two transactions read the same balance. Each subtracts its own cost from the value it read. And the second write erases the first.

B: Walk me through the actual numbers?

A: Picture three lanes running left to right. Worker A on top, the wallet row in the middle, worker B on the bottom. The wallet says a hundred. Worker A reads a hundred. Then worker B reads a hundred, before A has written anything. Now A writes a hundred minus ten. The row says ninety. Then B writes a hundred minus twenty-five, because a hundred is what it read.

B: [working it out] So it writes seventy-five. And it should be... a hundred minus ten minus twenty-five, sixty-five.

A: [grimly] Sixty-five. A's charge got erased by B. And here's the nasty part: both ledger rows exist. So the ledger and the balance now disagree by exactly ten. That's called a lost update. Two transactions read the same value, both compute a new value from it, both write, and the second one silently overwrites the first. That's the one that cost three thousand four hundred twenty-eight credits. And there are four more.

<!-- section: The Idea: The other anomalies -->

A: Next is the dirty read. Reading a change another transaction has made but hasn't committed yet. So, transaction one deducts a hundred credits for a big run. Before it commits, transaction two reads the wallet, sees zero, and rejects the user's next request, "sorry, no credits". Then transaction one's payment step fails and it rolls back. So transaction two just refused a customer based on a balance that never officially existed.

B: Which Postgres never lets happen, I'm hoping.

A: Never, at any level. Hold on to that, it matters for the figure later. Then the non-repeatable read. You read the same row twice in one transaction and get two different values, because somebody else changed it and committed in between. Like a billing report that reads the balance at the top, a hundred, does some work, then reads it again for the invoice total and gets ninety. And prints an invoice that disagrees with itself.

A: Third, the phantom. You run a query twice in the same transaction, and a row appears, or disappears, in the result. Because someone else inserted or deleted a row that matches your condition. So you count the runs for wallet one, get two, and a moment later the same query, same transaction, says three.

B: How's that different from the last one?

A: [thinking out loud] Nobody changed a row you read. A brand new row showed up that matches what you asked for. And that's why locking rows can't stop it. You can't lock a row that doesn't exist yet.

A: [slower] And then the subtle one. Write skew. Two transactions each read some shared facts, each decide their write is safe based on those facts, and each write a different row. Each one alone is fine. Together they break a rule that neither one broke by itself. The classic example's from Kleppmann's book. A hospital needs at least one doctor on call. Alice and Bob are both on call, and both feel sick. And each of them, at the same moment, opens the app. The app counts how many doctors are on call, sees two, decides "two is enough, it's safe for me to leave", and takes them off call. Then commits.

B: Both see two.

A: Both see two. Both leave. Nobody's on call.

B: [skeptical] But wouldn't they collide somewhere? They're both writing to the doctors table at the same moment.

A: [jumping in] That's exactly the thing. They wrote different rows. Alice's app updates Alice's row, Bob's app updates Bob's row. There's never a moment when both of them want the same row. So no row lock is ever contested. And that's why write skew slips right past the defenses that stop the lost update. And there's a TinyFish-shaped version of this too. Say the rule is a customer can have at most three concurrent browser sessions. The code counts the open sessions, and if there are fewer than three, it inserts a new one. Two requests both count two, both insert, and now the customer has four. Same shape. With a phantom on the side, because the new rows are exactly the thing each check couldn't see.

<!-- section: The Idea: MVCC -->

A: Okay. Before the isolation levels make sense, you need the trick Postgres uses to give each transaction its own view of the data. The simple approach is locks. Readers lock what they read, writers wait for readers. It's correct, and it's slow. A long report would block every single charge while it ran.

B: So what does Postgres do instead?

A: It never updates a row in place. Ever. When you run an update, it writes a brand new version of the row, and marks the old one as replaced. That's called M V C C, multi-version concurrency control. Keep the old versions around, so each transaction can read the version that was current for it. And every row version carries two hidden fields. One's called x min. That's the id of the transaction that created this version. The other is x max, the id of the transaction that replaced or deleted it. Empty if nobody has.

B: And how does a transaction know which version is "its" version?

A: It uses a snapshot. A snapshot is basically a list of which transactions had committed at the moment it was taken. And the rule is: a version is visible to you if the transaction that made it had committed in your snapshot, and the transaction that replaced it, if any, had not. Everything else is invisible to you. Even though it's sitting right there on disk.

A: Let me draw it. One wallet row, but on disk there are three physical versions side by side. On the left, balance a hundred. Made by transaction one, which committed, and replaced by transaction two. In the middle, balance ninety. Made by transaction two, committed, replaced by transaction three. On the right, balance sixty-five, made by transaction three, which is still in progress. Now three readers underneath, each with a line going up to the one version it sees. A report that started a while ago, before transaction two committed. Its snapshot only knows about transaction one, so it sees a hundred. And it keeps seeing a hundred for as long as it uses that snapshot. A new reader, whose snapshot includes one and two, sees ninety. And transaction three itself sees sixty-five, because your own writes always count for you. Nobody else sees the sixty-five. And if three rolls back, that sixty-five stays invisible forever.

B: [working it out] And nobody waited for anybody.

A: Nobody waited for anybody. And three consequences fall right out of that picture. One, readers never block writers, and writers never block readers. The report reads its old version while transaction three writes a new one. Two, writers do block writers. Only one transaction at a time is allowed to create the next version of a given row. So a transaction that updates a row holds a row lock on it. A lock on that single row, taken automatically by an update, a delete, or a select for update, and held until the transaction commits or rolls back. A second writer waits. And that wait is where all the interesting decisions in a minute happen.

B: And three?

A: Old versions pile up, and somebody has to clean them up. That somebody is vacuum, Postgres's garbage collector. It removes row versions that no current or future snapshot could ever see, and reclaims the space. And here's the gotcha: a transaction left open for hours holds an old snapshot, and that stops vacuum from cleaning anything newer than it. Which is one reason long-open transactions are bad manners. And you can actually see those hidden fields yourself on any Postgres table, just select x min and x max along with everything else. You'll do it in the build.

<!-- section: The Idea: The isolation levels in Postgres -->

A: So now the isolation levels. An isolation level is a setting, per transaction, that picks how much protection from concurrent transactions you get. Stronger levels prevent more of those anomalies, and cost more, in waiting or in retries. The S Q L standard defines four of them, by which anomalies they forbid. But every database implements them a bit differently, so the names are less useful than knowing what your database actually does. So let's do Postgres. And in Postgres, between the first three levels, only two things differ. When the snapshot is taken. And what happens when you try to write a row someone else changed.

B: Four levels, you said.

A: Four names. The weakest, read uncommitted, Postgres just runs as read committed. So in practice it's three. Read committed is the default, and it's what the naive charge ran under. You get a new snapshot for every statement. Each statement sees everything committed before that statement started. So you never see uncommitted data, no dirty reads. But two selects in the same transaction can disagree. And nothing stops read-then-write. Your select saw a hundred, your update says set the balance to seventy-five, and it writes seventy-five, whatever the row says now. If someone else holds the row lock, you wait, and then you write on top of the newest version. So it stops dirty reads, and lets through the lost update, non-repeatable reads, phantoms and write skew.

B: That's... a lot to let through for a default.

A: [laughs] It's fast, that's why. Next up, repeatable read. In Postgres, this is what the research literature calls snapshot isolation, a term from a nineteen ninety-five paper by Berenson and others. The whole transaction reads from one snapshot, taken at its first statement. One frozen picture. And if you try to update a row that someone else changed and committed after your snapshot, Postgres refuses. The error reads "could not serialize access due to concurrent update". Rather than let you write over a change you never saw.

B: Oh, so that turns the lost update into an error.

A: The silent lost update becomes a loud error. And Postgres's version also blocks phantoms, which the standard doesn't even require at this level. What it lets through is write skew.

B: Because the doctors wrote different rows.

A: Because they wrote different rows, right. Which is what serializable is for. In Postgres, since version nine point one, in twenty eleven, serializable is something called S S I, serializable snapshot isolation. It runs exactly like repeatable read, plus it remembers what each transaction read. And if transaction one read something transaction two wrote, and transaction two read something transaction one wrote, then there's no one-at-a-time order that explains both. So one of them gets aborted, with "could not serialize access due to read-write dependencies among transactions". It doesn't block anything extra. It lets transactions run, and then vetoes the ones that would break the illusion. It can also abort some that would actually have been fine. False positives.

B: [a bit unsure] Wait, so at serializable my transaction can just... fail? Even if I didn't do anything wrong?

A: [matter-of-fact] Yes. And that's the deal you sign. At serializable, any transaction can fail with error code four zero zero zero one, a serialization failure, and your code must retry it. That's not an edge case, it's the contract.

A: And two warnings about other databases, so the names don't fool you later. MySQL's InnoDB defaults to repeatable read, but with different rules from Postgres. Its locking reads see the latest data, not the snapshot. And Oracle's "serializable" has historically been snapshot isolation, which allows write skew. Same words, different guarantees. Kleppmann has a project called Hermitage that tests exactly these differences, database by database.

<!-- section: Predict: the doctors -->

A: So, the doctors. Both running at the same moment. What's the weakest Postgres level where at least one doctor stays on call? Read committed, repeatable read, or serializable?

B: [working it out] Read committed, no, they'd both see two. Repeatable read... each one has a frozen snapshot, so... I want to say repeatable read? Because now they can't change under each other?

A: That's the natural guess, and it's wrong. It's serializable. At repeatable read, each one reads from its own snapshot, both see two on call, and then each writes a different row. Alice versus Bob. There's no row that both of them write, so the "concurrent update" check never fires, and both commit. The lesson ran this against Postgres sixteen. Under repeatable read, both committed, and zero doctors were left on call. Under serializable, the first commit succeeded and the second failed with that read-write dependencies error. One doctor left on call. S S I noticed that each one read a row the other one wrote, and no one-at-a-time order explains that.

B: The frozen snapshot is the problem, actually. They're both looking at the same stale picture.

A: Right, the snapshot protects what you read from changing. It doesn't stop you from acting on it.

<!-- section: Figure: the isolation lab -->

A: And there's an interactive figure in the lesson that's worth playing with. It's a little simulation of Postgres's rules. Real row versions with x min and x max, a snapshot per statement or per transaction depending on the level, row locks, and a simplified version of the serializable check. You pick a scenario, lost update, atomic update, dirty read, non-repeatable read, phantom, or the doctors. And a level. Then you step transaction one and transaction two in whatever order you like. There's a column in the middle where every write adds a new version, and what each transaction "sees" depends only on its snapshot.

B: What should I be hunting for in there?

A: Four things. The lost update at read committed turning into an error at repeatable read. The atomic update being correct even at read committed, where the second transaction waits for the first one's lock and then subtracts from the newest value. We'll get to that one next. Write skew surviving repeatable read and dying at serializable. And the dirty read, which only shows up if you pick the "no isolation" setting, the textbook level that Postgres doesn't actually offer.

<!-- section: Fixing the lost update: four tools -->

A: So, back to the credits service. There are four standard fixes. All of them work. They differ in who waits, who retries, and how much code you write.

A: The first one is: do the arithmetic in the database. Don't read the balance into Python at all. One update statement that says, set the balance to the balance minus ten, where the id is this wallet and the balance is at least ten, and give me back the new balance. That's called an atomic update. The new value is computed from the current value, inside the database, so there's no gap between the read and the write for anybody to slip into.

B: [skeptical] But you said read committed lets lost updates through. Why is this safe at read committed?

A: [thinking out loud] Because the update takes the row lock. If someone else holds it, it waits. And when the lock's released, Postgres re-reads the newest version of the row, and re-checks the "balance at least ten" condition against it, before it writes. So it's always subtracting from the real current number. And notice the "at least ten" part. That's the insufficient-credits check, folded into the same step. So two charges can't both pass the check against the same old balance. If no row comes back, the wallet didn't have enough. This is the fix you reach for first. One round trip, no retries, nothing to get wrong. The catch is it only works when the decision fits in one statement.

B: And when it doesn't?

A: Then the second fix. Lock the row before you read it. Say the logic is too complicated for one statement. Look up their price plan, check a spending limit, then charge. You do a select, but you add "for update" to the end. That takes the row lock at read time. So a second transaction's select for update on the same row waits until you commit, and then reads your new value. That's called pessimistic locking. Assume conflicts will happen, and prevent them by locking first. Everyone else queues. Correct and simple. And the cost is waiting. Whatever happens between your select and your commit is time the row is held. So never, ever make a network call, to an LLM, to Stripe, while you're holding it.

A: Third fix, the opposite attitude. Check that nothing changed when you write. Add a version column to the wallet. You read the balance and the version, do your math, and then make the write conditional. Update the balance, bump the version by one, but only where the version is still the one you read. If someone else wrote in between, the version's moved on, the condition matches zero rows, and you start over from the read. That's optimistic concurrency. Assume conflicts are rare, do the work without locks, and at write time check nothing changed. It's the database version of compare-and-swap, the CPU instruction that writes a new value only if the current value still equals what you expected, and tells you whether it worked.

B: So nobody waits. The losers just retry.

A: Nobody waits, losers retry. It's brilliant when conflicts are rare. And it's the only option when the read and the write happen in different requests. Like a user opens an edit form, and saves it a minute later. You can't hold a lock for a minute. The E tag and if match headers in HTTP are this exact idea. But it's terrible on one hot row, which you'll measure.

A: And the fourth fix: keep the naive code, raise the isolation level, and retry. Run it at serializable, or repeatable read, which is enough for a single-row lost update. And wrap the whole thing in a loop. If it fails with a serialization failure, someone else won, so you start the whole transaction again. The database detects the conflict for you. You don't have to think about which rows to lock, and that's the real appeal. Serializable also catches the write skew bugs you didn't notice you had.

B: That sounds like the obvious winner, honestly.

A: It has two costs. Retries, under contention, and you'll see how many. And discipline: every code path that touches the database has to be safe to retry. So, the rule of thumb. Atomic update when the logic fits in one statement. Select for update when it doesn't and there's a lot of contention. Optimistic versions when contention's low, or the transaction spans requests. And serializable when the rules are complicated enough that you don't trust yourself to lock the right rows.

B: [working it out] So it's basically: who do I want to make wait, and who do I want to make redo the work.

A: That's the whole choice, yeah.

<!-- section: Deadlocks -->

A: Now, locks bring their own failure. Transfer A moves credits from wallet one to wallet two. It locks one, then wants two. Transfer B, at the same moment, moves credits from two to one. It locks two, then wants one.

B: Oh no. They each have what the other one needs.

A: Each holds the lock the other one needs, and each waits for the other. Forever. Picture it as a little X. Transfer A top left, transfer B top right, wallet one bottom left, wallet two bottom right. A holds wallet one, B holds wallet two, and the two dashed lines crossing in the middle are "A waits for two" and "B waits for one". A cycle of waiting. Nobody can move. That's a deadlock. Two or more transactions each waiting for a lock that another holds, in a cycle, so none of them can ever proceed.

B: [skeptical] And Postgres just lets them sit there?

A: Not forever. When a transaction's been waiting for a lock longer than a setting called the deadlock timeout, which is one second by default, Postgres runs a deadlock check. If it finds a cycle, it picks a victim and aborts it, with error code four zero P zero one, "deadlock detected", and a detail line naming the processes and the row. The other transaction gets its lock and carries on. So from the application's side, a deadlock is just another error that means "retry the whole transaction".

A: And the prevention is boring and it works. Always lock rows in the same order. Sort the two wallet ids and touch the smaller one first. Or select both wallets, ordered by id, for update. A cycle needs somebody going the other way around. If everyone goes the same way round, there's no cycle. And short transactions help too, because a deadlock needs two transactions holding locks at the same time.

<!-- section: Across two databases -->

A: Okay. Everything so far happens inside one Postgres. Now say the wallet lives in Postgres, but the record of the agent run lives in a different service, with its own database. And you want "charge the credits and mark the run paid" to be atomic across both.

B: Can a transaction even span two databases?

A: The textbook answer is two-phase commit. There's a coordinator. In phase one, it asks every database, "can you commit?" And each one writes everything durably, keeps its locks, and votes yes. Which is a promise: "if you tell me to commit, I will". In phase two, if every vote was yes, the coordinator says commit. And it works. Postgres supports it, it's just off by default.

B: So why doesn't everyone use it?

A: [slower] Because of the gap between the phases. A database that's voted yes has promised to commit, so it can't decide on its own anymore. It has to wait to hear back. And if the coordinator dies right then, every participant just sits there holding its locks. Possibly for a long time. Until the coordinator comes back. So your wallet row is frozen because some other service crashed.

B: [quietly] Huh. That's grim.

A: And on top of that, throughput's bounded by the slowest participant, plus the extra round trips. And it ties every service's availability together. So most systems design around it. With two tools.

A: The first is idempotency keys. You make every operation safe to repeat. Idempotent means it has the same effect whether you do it once or many times. "Set the balance to ninety" is idempotent. "Subtract ten" is not, unless you deduplicate it. So the caller generates a unique key for each logical action. Like, "charge for step seven of run A B C". And the credits service stores that key, with a unique constraint, in the same transaction as the charge. If a retry comes in with the same key, it finds the row already there and returns the original result instead of charging twice. So now the caller can retry freely, after any failure or any timeout. Stripe's API works exactly like this, with an idempotency key header.

B: But then you're getting the message twice. Isn't the point to get it exactly once?

A: Exactly once is impossible over a network. You can never be sure your message landed. So you turn it into "at least once, with duplicates ignored". Which is easy. And it gets you the same effect.

A: The second tool is the outbox pattern. Don't write to two systems at all. Write to one database, twice, in one local transaction. The charge, and a row in an outbox table that says "tell the runs service that run A B C is paid". Then a separate process, a relay, reads the outbox and delivers those messages, to a queue or straight to the other service, and keeps retrying each one until it's acknowledged. Picture a big box on the left, the credits database, and inside it, one transaction: the wallet row going down by ten, the outbox row saying "run A B C paid", and the ledger row with its unique key, run A B C step seven. An arrow to the relay in the middle, which polls and retries until it gets an acknowledgement. Another arrow to the runs service on the right, with its own database, which throws away duplicates by their key. Left half is atomic, a local transaction. Right half is eventual, at least once plus idempotent.

B: So the local transaction makes the charge and the message agree, and the relay just keeps knocking until somebody answers.

A: And the idempotency on the receiving end makes it harmless when it knocks twice. No transaction ever spans two databases. You'll see both of these again, the idempotency keys in the lesson on the life of an API, and the relay-plus-queue half in queues and logs.

<!-- section: Predict: lost credits -->

A: So, before you build anything, go back to that very first experiment. Eight Python threads, each with its own connection, each doing five hundred naive charges of one credit, against one wallet of a hundred thousand, at read committed. If I hadn't told you the answer at the start, what would you have guessed?

B: [a bit unsure] Honestly? That races are rare. Most charges go through, you lose a few percent. So the balance drops by, I don't know, three thousand eight hundred or so.

A: That's what almost everyone guesses. And on the M four Pro, the balance dropped by only five hundred nine to five hundred seventy-two, across two runs. Out of four thousand charges. About eighty-six percent lost.

B: I heard that number at the start and it still seems absurd. How do you lose most of them?

A: [thinking out loud] Timing. Each charge is a few round trips to Postgres. Read, update, insert, commit. That's a sizeable fraction of a millisecond. And a millisecond is forever for a computer. So with eight workers on one row, almost every read lands inside somebody else's read-to-write window. When the window's that wide and eight workers share one row, losing most of the updates is just the normal case.

B: And with the optimistic fix, the version column, how many retries?

A: About nineteen thousand retries, for four thousand successful charges. So almost five failed attempts for every success. With eight workers hammering one row, a worker that reads and then tries to write usually finds that one of the other seven got there first.

<!-- section: Build It -->

A: So, the build. You need Postgres, sixteen or newer, on your Mac or the Spark. Homebrew, Docker, or a pip package called P G server that bundles Postgres right inside Python, which is what the lesson's numbers came from. Plus psycho P G three, the driver. Everything in one folder. And plain Python threads are fine here. That surprises people, because of the GIL. But the driver lets go of the GIL while it waits on the network, so the threads genuinely overlap their transactions. It's exactly the waiting-heavy case from the threads lesson. The one rule: each thread needs its own connection, because a connection can only be in one transaction at a time.

A: First you build a harness. It creates the wallets table, with the balance check and a version column, and a ledger table. It resets everything to one wallet with a hundred thousand credits. And the part that matters is the audit at the end. It checks one invariant. The starting balance, minus the sum of the ledger, must equal the current balance. Anything else is lost money. And the run function starts all the worker threads behind a barrier, so they all start charging at the same instant. Then it counts retries and prints the audit.

B: Why the barrier?

A: Because otherwise the first thread's half done before the eighth one's even connected, and you get less overlap than real traffic would give you. You want them all to hit the row together.

A: Then you lose money on purpose. You write the naive charge inside a transaction block that commits at the end and rolls back on any exception. Run it three times. Then run it with just one worker, and the loss goes to zero. That's the proof it's the concurrency, not your arithmetic. Then one more run, at repeatable read, with no retry, catching and counting the serialization failures. The balance comes out correct for the charges that went through. And you see how many failed, and the error text.

A: Then fix it four ways, one function each, and every one has to come out with zero lost. A few things that'll bite you. When an update matches nothing, the driver tells you how many rows it touched, and that's how the optimistic version knows it lost. When a statement fails inside the transaction block, the driver rolls back as the exception leaves the block, so you catch it outside, and loop. The retry has to restart the whole transaction, not just the failed statement. And cap your retries, say at a thousand, and raise if you hit it. An infinite retry loop is a hang waiting to happen.

A: Then the doctors. That one needs a precise interleaving, not a load test. So you drive two connections by hand from one script, and call their statements in exactly the order you want. Both set the level. A counts, B counts, both see two. A takes Alice off call, B takes Bob off call. A commits, B commits. Print how many doctors are left. At repeatable read, zero. At serializable, one, plus an error, and read its detail and hint lines, they're worth it. Then the TinyFish version, the three-session cap. You get four sessions at repeatable read. And you fix it two ways. Serializable. And, staying at plain read committed, by first locking the wallet's own row with select for update, so both transactions are fighting over something real.

B: Wait, the wallet row? The sessions don't even touch the wallet.

A: That's the trick. There was nothing for them to collide on, so you give them something. Both have to lock the same wallet row first, so the second one waits, and then counts three. It has a name worth remembering: materializing the conflict. The other way out of write skew, by the way, is to turn the rule into an actual constraint, if you can express it as one.

<!-- section: Build It: deadlock and row versions -->

A: Next, a deadlock, on purpose. Two wallets. Connection A updates wallet one, connection B updates wallet two. Then in two threads, A updates wallet two and B updates wallet one. One of them hangs for about a second, and then raises a deadlock error. And the message is worth reading slowly. It says something like, process such-and-such waits for a share lock on transaction such-and-such, blocked by the other process. And the other process waits on the first one's transaction. And then a context line saying it was updating tuple zero comma two, in some table.

B: [skeptical] A lock on a transaction? I thought the locks were on rows.

A: [amused] Here's the cool bit. Remember x max? When a transaction's changing a row, the row's x max points at that transaction. So to wait for the row, you wait for that transaction to finish. The lock you're actually queued on is the other transaction itself. And tuple zero comma two is the row's physical address on disk, page zero, second slot. You time how long the hang lasts and compare it to the deadlock timeout setting, about a second. Then you fix it by ordering the updates by id, and the deadlock's just gone.

A: And the last task, you look at the row versions with your own eyes. Two sessions open on the same database. In session one, begin at repeatable read, select x min and x max with the wallet, and ask for your own transaction id. In session two, take one credit off the wallet. That commits on its own. Select again, and you see a new x min. Back in session one, select again. You still see the old balance and the old x min. That's your snapshot. It's the old-report reader from the picture. Then in session one, try to take a credit off yourself, and read the error. It's the "concurrent update" refusal. Every piece of that diagram, you'll have seen happen.

B: So, done means what, exactly?

A: The naive run loses money every time with eight workers and none with one. All four fixes come out at zero lost, and you've written down their retries and times. The doctors script leaves zero on call at repeatable read and one at serializable, and the session cap holds under both your fixes. You made a deadlock, you can explain every line of it, and you made it impossible by ordering. And for each fix, you can say who waits and who retries.

<!-- section: Measure -->

A: So here's what the reference runs looked like. M four Pro, Postgres sixteen point two through P G server, Python three twelve, eight threads times five hundred. And a caveat: the timings are noisy. The same run varied by two to five times on a busy Mac. But correctness and retry counts are stable. The shape won't change on your machine.

A: Naive: lost three thousand four hundred twenty-eight and three thousand four hundred ninety-one, out of four thousand. No retries. Half a second and one point seven seconds. So it loses most charges, not a few. Three statements and a commit, each one a round trip, so the window between read and write is a good fraction of a millisecond, and eight workers on one row nearly always overlap. And look at what didn't happen. No error, no constraint violation, the ledger's perfect. Only the audit catches it.

A: Naive at repeatable read, no retry. Zero lost. And somewhere between three thousand one hundred sixty-six and three thousand two hundred twenty-three charges failed.

B: [amused] So it's correct, but it refused, what, eighty percent of the work?

A: Around eighty percent, all with "could not serialize access due to concurrent update". Correct, and useless. The database refused to lose the update, and it handed the problem back to you. An isolation level without a retry loop just converts silent data loss into loud request failures.

A: Atomic update: zero lost, zero retries, half a second and one point four seconds. The fastest correct option. The lock gets taken by the update and released at commit, with no Python in between, so it's the shortest lock hold possible. Workers still queue on the row lock, but each one holds it very briefly. Select for update: zero lost, zero retries, a bit slower, point six and three point eight seconds, because now the lock is held across a round trip to Python. Read, think, write. But on one hot row, waiting in a queue still beats retrying.

A: And then the retry-based fixes are the slowest. Optimistic, about nineteen thousand retries, two point one and eleven point nine seconds. Serializable, about sixteen thousand retries, four point three and eight point three seconds. And that's the point of the experiment. One row, eight workers is the worst case for optimism. Most attempts lose and redo all their work, roughly four or five failed attempts for every success.

B: [working it out] So if I spread the charges across a lot of wallets, nobody would be fighting, and the retries should mostly go away.

A: That's the check. Change the harness so each charge picks one of a hundred wallets at random, and sum the ledger per wallet in the audit. The prediction is that retries collapse to near zero, and optimistic and serializable catch up with the others. Measure it yourself.

A: [slower] And there's a scaling question hiding in all of this. Every one of these fixes funnels every charge for one wallet through one row lock, one at a time. So say each charge holds the lock for about a quarter of a millisecond, the statement plus the commit flush. Then one wallet tops out around four thousand charges a second. No matter how many servers you add.

B: Wait, more servers don't help at all?

A: Not for one wallet. They all line up on the same lock. A lock is a queue, and a queue has a maximum throughput. And that's back-of-envelope arithmetic, so measure your own number, by running the atomic update with more and more workers until throughput stops going up. So now say one huge customer needs twenty thousand charges a second, on a single wallet.

B: [a bit unsure] Then... I guess you'd make it faster? Make the transaction shorter?

A: That's the first thing, and it's the cheapest. One statement, autocommit, no Python between taking the lock and committing. But measure first, then go down the list. Second, batch. A worker collects charges for, say, fifty to a hundred milliseconds, and applies their sum in one update, with the ledger rows inserted in bulk. That turns twenty thousand lock grabs a second into a few hundred. Third, split the wallet into several sub-balances, like a sharded counter. Each charge hits a random one, and to read the balance you add them up. The cost is the "insufficient credits" check gets fuzzier, since no one piece knows the whole total. Or fourth, pre-allocate. Each worker reserves a block of credits from the wallet, say a thousand, in one transaction, spends it locally, and gives back what it didn't use. That's how a lot of rate limiters and quota systems work.

B: And all of them make the balance a little bit wrong at any given moment.

A: That's the trade, every time. You give up a perfectly precise, instantly consistent balance, in exchange for throughput. So the real decision is how much overdraft you can live with.

<!-- section: Break It -->

A: Then you break it, four ways. First, what if you do something non-repeatable inside the retry loop? Put a print that says "charged" inside the serializable charge, before the commit. Stand-in for sending an email, or calling Stripe.

B: [working it out] It'd print once per attempt, not once per charge. So... thousands of extra.

A: Thousands of extra "charges". The database rolled back every failed attempt. The outside world didn't. That email's gone. So side effects belong after the commit succeeds, or in an outbox row written in the same transaction.

A: Second, hold a lock while you wait on the network. In the select for update version, sleep for fifty milliseconds between the select and the update. Pretend it's a call to a pricing service or an LLM. Predict the throughput first.

B: Fifty milliseconds holding the lock, one at a time, so twenty a second, max. Regardless of workers.

A: Twenty charges a second, however many workers you add. Run it with eight workers and fewer charges. And while it's running, look from another session at P G stat activity, Postgres's view of what every connection is doing right now. You'll see a pile of sessions waiting on a lock, and the one holding it, listed as "idle in transaction". It's sitting there in the middle of a transaction, doing nothing. And that state is one of the most common causes of production Postgres slowdowns.

A: Third, remove the guard and the constraint. Take the "balance at least ten" condition out of the atomic update, start the wallet at a thousand credits, and run four thousand charges. You catch the check-violation error inside the charge function, otherwise the worker thread just dies on the first one. With the "balance at least zero" check on the table, every charge after the money runs out fails, its transaction rolls back, ledger row included, and the balance stops at exactly zero. That's consistency and atomicity doing their jobs together. Now recreate the table without the check and run it again.

B: And it goes negative.

A: [dryly] Minus three thousand. And nothing complains.

A: Fourth, run serializable on only half the code. Doctors again, but Alice's transaction at serializable and Bob's at read committed.

B: [a bit unsure] I'd guess you get... half the protection? Maybe it still catches it, since one side's watching?

A: [gently] It doesn't. The lesson ran it both ways round. Both commits succeeded, zero doctors on call. S S I only tracks reads made by serializable transactions, and it can only abort a transaction that's itself serializable. So if you're relying on serializable, set it as the database default, with the default transaction isolation setting. Not per call site, where someone will forget.

<!-- section: Connections and close -->

A: And if you want to go deeper, the one thing to read is chapter seven of Kleppmann's Designing Data-Intensive Applications, the transactions chapter. It's the best explanation of isolation levels anywhere. And then the concurrency control chapter of the Postgres docs, which is precise about what each level does in Postgres. And you'll notice how much of this was the threads lesson, one floor down. The lost update is counter plus-equals one with a network round trip in the middle, and select for update is a lock around the critical section. Durability is the files lesson, applied to a log. The database is just a very careful user of F sync. And one thing that's coming: Postgres's serializable tracks what you read using index ranges, so a missing index makes it abort more. That's for the indexes lesson.

B: [working it out] Okay, let me try the whole thing. A transaction is a bracket, and it solves two problems. Crashing halfway, that's atomicity, and the write-ahead log with its commit record decides what happened. And durability is that the log got F synced before the commit came back. And being inside a transaction protects you from other transactions. That's isolation.

A: [gently] That last part's the bit to sharpen, because it's exactly the bug we started with. Being inside a transaction protects you from crashing halfway. How much it protects you from other transactions depends on the isolation level, and the default, read committed, lets the lost update straight through. The naive charge was in a transaction the whole time, and it still lost eighty-six percent of the charges. So you pick your defense on purpose. Do the arithmetic in one statement. Or lock the row first. Or check a version and retry. Or go serializable and retry. And if the work crosses two databases, you don't stretch a transaction across them. You keep it local, write an outbox row, and make the other side idempotent.
