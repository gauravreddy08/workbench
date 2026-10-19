<!-- section: The Problem -->

A: [relaxed, thinking out loud] So, every agent run at TinyFish spends credits. And picture the simplest possible code that charges for one step. Read the wallet's balance. Check there's enough. Write the new balance. Add a line to the ledger saying what you charged. That's it.

B: That sounds fine.

A: It is fine. Every test passes. And then a customer kicks off a big batch of runs, and eight workers start charging the same wallet at the same time. When I ran exactly that against Postgres, the ledger came out perfect. One line per charge, every one of them there. And the balance had barely moved. Most of the charges never came off it. More than eight in ten, just gone.

B: [skeptical] And nothing threw an error?

A: Nothing. No crash, no error in the logs, no constraint tripped. The service just gave away most of the usage for free, and the only way you'd ever find out is by adding up the ledger and comparing it to the balance. Which nobody does until the numbers stop adding up, weeks later.

B: Okay, that's horrifying.

A: And there's a second, totally different way to lose money. A customer moves credits from their personal wallet to their team wallet. That's two writes. Take it out of one, put it in the other. And the process dies right between them. A deploy, the machine runs out of memory, whatever. Now the credits have left one wallet and arrived nowhere.

B: So, two different bugs.

A: Two different problems. One is crashing halfway. The other is two pieces of work getting tangled up with each other. And a transaction is the database's answer to both of them. If you keep one thing, keep that.

<!-- section: A contract -->

A: The idea's older than you'd think. In the seventies, IBM had a team building one of the first relational databases, System R. And their customers were banks and airlines. Thousands of terminals, all updating the same accounts and the same seat maps at once, on machines that crashed.

B: Fun.

A: [laughs] Yeah. And a guy on that team, Jim Gray, wrote the idea down properly in nineteen eighty-one. He borrowed it from contract law. A contract is either fully carried out by every party, or none of it happens. And once it's signed, it stays signed. That's a transaction.

B: And that's where ACID comes from?

A: The acronym came a couple of years later, from two other researchers who were writing about crash recovery. Atomicity, consistency, isolation, durability. It stuck, partly because it just sounds good. Gray ended up winning the Turing Award, largely for this. And honestly, most of the money in the world runs on this idea.

<!-- section: The diary -->

A: So the mechanics. You open a bracket, you do your writes, you close the bracket. Closing it with commit says, make all of this real. Closing it with rollback says, forget all of it, as if it never happened.

B: [working it out] And atomic is the part about the two wallets running at the same time, right? Nothing can sneak in between.

A: That's the one everyone mixes up. Atomic here just means indivisible, like the old Greek word. It's not about other people at all. It's about failure. The process dies, or an error happens, or a rule rejects the second write. Whatever went in gets undone.

B: But how do you undo something when the process doing it is already dead?

A: The database keeps a diary. Before it changes anything in its actual data files, it writes down the change in a file it only ever appends to. That's called the write-ahead log. And the very last thing a transaction writes into that diary is a little line that says, committed. So after a crash, the database reads the diary. Anything with that line, it keeps. Anything without it, it treats as if it never started.

B: So the transfer that died halfway just... vanishes.

A: Vanishes. The credits are still in the personal wallet. That commit line is the single moment of truth. Before it's on disk, the transaction doesn't exist. After, it does.

B: And durable is the after part.

A: Durable is the after part. When the database tells you the commit worked, your data has to survive the power going out a moment later. And you already know that writing to a file doesn't mean it's on the disk. It's usually just sitting in memory. So by default, the database won't answer your commit until it's forced the diary onto the disk and the drive has said yes, it's there. That's a real cost on every commit. It's worth it for a wallet.

<!-- section: But I was in a transaction -->

B: [skeptical] Okay, wait. Here's what's bugging me. The charge code from the start. Wasn't that already in a transaction? Like, the Python driver opens one for you, doesn't it?

A: It does. And it still lost money.

B: Then what was the transaction even doing?

A: It was making each charge all-or-nothing. Which it did, perfectly. Every charge either fully happened or fully didn't. That's not the bug. The bug is two charges interleaving. And you've seen this exact bug before. Two threads each add one to a counter. Both read forty-one, both write forty-two, and one of the additions just disappears.

B: Oh. Same shape.

A: Same shape, one floor down. Two workers both read the balance before either one writes. Each one subtracts its own charge from the number it read. And the second write lands right on top of the first. The first charge is erased. That's called a lost update. And whether a transaction protects you from it depends on the I. Isolation. And isolation has settings.

<!-- section: Versions and snapshots -->

A: To make sense of the settings, you need to know the trick Postgres uses to keep people apart. The obvious way is locks. If I'm reading something, you wait. It's correct, and it's slow. A long report would block every single charge.

B: Sure.

A: So instead, Postgres never overwrites a row. When you update one, it writes a brand new version of the row, and marks the old one as replaced. Both are sitting there on disk. And every transaction reads through what's called a snapshot. Basically a note saying which transactions had finished at the moment you looked. You only see the versions that were committed in your snapshot. Everything else is invisible to you, even though it's right there.

B: [working it out] So a report that started a while ago just keeps seeing the old version, while someone else writes a new one.

A: Right, and nobody waits. That's the payoff. Readers never block writers, and writers never block readers. The one thing that does wait is two writers on the same row. Only one of them gets to make the next version, so the second one waits for the first to finish.

B: And all those old versions just pile up?

A: They pile up, and a background cleaner called vacuum clears out the ones nobody can see anymore. Which is one reason leaving a transaction open for hours is bad manners. You're holding an old snapshot, and the cleaner can't throw away anything newer than it.

<!-- section: The settings -->

A: Okay, so now the settings are really just two questions. When do you take your snapshot? And what happens if you try to write a row somebody else changed?

B: Go on.

A: The default takes a fresh snapshot for every single statement. So you never see someone's unfinished work. But your read and your write are separate statements. Nothing connects them. You read a balance, someone else changes it, you write your number over theirs. That's the default, and that's what the charge code ran under.

B: And the stronger one?

A: The next one up takes one snapshot for the whole transaction. One frozen picture. And if you try to update a row that somebody else changed after your picture was taken, it refuses. It throws an error, instead of letting you write over a change you never saw.

B: Great, so you just flip that on and you're done.

A: [amused] That's what I thought. So I flipped it on, without changing anything else. And the balance was correct. And most of the charges failed. They all came back with this error, could not serialize access. The database refused to lose the update. It just handed the problem back to me. So a stronger setting without a retry loop doesn't fix anything. It turns quiet data loss into loud failed requests.

B: Huh. So you have to retry.

A: You have to retry. And it still isn't the strongest setting, because there's a sneakier bug it lets through.

<!-- section: Two doctors -->

A: This one's a classic, from Martin Kleppmann's book. A hospital needs at least one doctor on call. Two doctors are on call, and both start feeling sick. At the same moment, each one opens the app. The app counts who's on call. Sees two. Says, fine, two is enough, you can go. And takes that doctor off call.

B: [working it out] And they both see two. So they both leave.

A: Both leave. Nobody's on call. And here's why the frozen-picture setting doesn't catch it. They wrote different rows. One doctor updated her own row, the other updated his. There was never a moment when both wanted the same row. So the "someone changed what you're writing" check never fires.

B: Oh, that's nasty. Each one alone is totally fine.

A: Each one alone is fine. Together they break a rule that neither of them broke. That's called write skew. And there's a version of it at TinyFish too. A customer can have at most a few browser sessions open at once. Two requests both count the open sessions, both see room for one more, both open one. Now they're over the limit.

B: So what stops it?

A: The strongest setting. Serializable. The promise there is, whatever ran at the same time, the result has to be the same as if they'd run one after another, in some order. And Postgres does it by also remembering what each transaction read. If each one read something the other one wrote, there's no one-at-a-time order that explains that. So it lets the first commit through, and kills the second one. When I ran the doctors at that setting, one of them got the error and one doctor stayed on call.

B: And then that one retries.

A: And then it retries, sees only one doctor on call, and stays. The deal with that setting is, any transaction can fail, at any time, and your code has to be ready to just run it again.

<!-- section: Who waits, who retries -->

B: So for the credits thing, is the answer just "use serializable and retry"?

A: That's one of four answers, and it's not the first one I'd reach for. They all work. They differ in who waits and who retries. The first is, don't read the balance into Python at all. Tell the database, subtract this from whatever the balance is right now, but only if there's enough. One statement. The database takes the lock, looks at the newest value, does the math, done. There's no gap between the read and the write for anyone to slip into.

B: That feels almost too easy.

A: It's the one to try first. It only works when the decision fits in one statement, though. If you need to look up a price plan and check a spending limit first, the second answer is lock the row before you read it. Everyone else queues up behind you. That's correct and simple, and the rule there is, never call anything slow over the network while you're holding that lock. An LLM, a payment provider. You're making everybody wait for it.

B: And the other two are the retry ones.

A: Right. The third is, read a version number along with the balance, and only write if the version hasn't changed. If it has, start over. That's called optimistic, because you assume nobody else is in your way. And the fourth is the strongest setting with a retry loop.

B: Which is fastest?

A: That was the surprise. On one hot wallet, the retry ones were the slowest by a lot. With eight workers fighting over one row, a worker that reads and then tries to write almost always finds someone else got there first. So most attempts get thrown away and redone. On one busy row, waiting in a line beats everyone racing and redoing their work. Optimism only wins when collisions are rare.

B: [jumping in] Oh, and if the retry loop sends an email or something...

A: Then it sends it every time it retries. The database rolled back the failed attempts. The outside world didn't. Anything that leaves the database belongs after the commit has actually gone through.

<!-- section: Across two databases -->

B: What if the wallet's in one database and the run record's in some other service's database? Can a transaction cover both?

A: There's a textbook way. It's called two-phase commit. A coordinator asks every database, can you commit? Each one gets everything ready, holds its locks, and promises yes. And only if everybody says yes does the coordinator say, okay, commit. The problem is the gap in the middle. Once a database has promised, it can't change its mind on its own. So if the coordinator dies right then, everyone just sits there holding their locks until it comes back.

B: So your wallet's frozen because some other service crashed.

A: That's the problem. So most people design around it. Two tools. One is making every operation safe to repeat. The caller attaches a unique key, like "charge for step seven of this run", and the credits service stores that key in the same transaction as the charge. If the same request comes in again, the key's already there, so it doesn't charge twice. That's called an idempotency key. Now anyone can retry freely.

B: And the other?

A: The other is, don't write to two systems at all. In one local transaction, write the charge, and also write a note in an outbox saying "tell the run service this run is paid". Then a separate process reads the outbox and delivers those notes, retrying until each one lands. The charge and the note can never disagree, because they were one transaction. And the receiver ignores duplicates by their key. No transaction ever spans two databases.

<!-- section: Ending -->

B: Okay, let me try. A transaction is a bracket. Everything inside either happens or doesn't, because the database keeps a diary and only trusts the ones with a commit line. And it keeps other people's work from messing with yours, so it makes concurrent code safe.

A: The first half's exactly right. The second half is the part that bit me. Being inside a transaction doesn't make you safe from other people. How safe depends on the setting, and the default lets the read-then-write bug straight through. So either push the arithmetic into one statement, lock before you read, or use the strong setting, and if you do that, you have to retry.
