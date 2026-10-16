# Coverage: transactions

Lesson src/lessons/transactions.mdx vs podcast/scripts/transactions.md. Item IDs match
podcast/outlines/transactions.md. Numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 counter race prereq re-explained | Lost update | "Each read forty-one, each wrote forty-two" | covered |
| T2 fsync prereq re-explained | D is for durable | "The bytes are sitting in the operating system's page cache, which is just RAM" | covered |
| T3 Postgres on Mac or Spark | Build It | "You need Postgres, sixteen or newer, on your Mac or the Spark" | covered (time estimate dropped) |
| P1 naive charge, four steps, tests pass | Problem | "It reads the wallet's balance. It checks there's enough." | covered |
| P2 eight workers on one wallet | Problem | "eight workers start charging the same wallet at the same time" | covered |
| P3 100,000 / 8x500 / 4,000 rows / 99,428 vs 96,000 / 3,428 / 99,491 | Problem | "ninety-nine thousand, four hundred twenty-eight" | covered |
| P4 no error, 86% free, only ledger audit | Problem | "quietly gave away eighty-six percent of the usage for free" | covered |
| P5 transfer of 500 dies between writes | Problem | "five hundred credits have left one wallet and arrived nowhere" | covered |
| P6 two problems: crash halfway, interleaving | Problem | "One is crashing halfway. The other is two pieces of work interleaving" | covered |
| O1 System R, banks and airlines, crashing machines | Origin | "a project called System R. And their customers were banks and airlines" | covered |
| O2 Gray 1981 paper, contract law | Origin | "he borrowed it from contract law" | covered |
| O3 Härder and Reuter, ACID, sounds good | Origin | "two years later, two German researchers, Theo Härder and Andreas Reuter" | covered |
| O4 Turing Award 1998 | Origin | "Gray won the Turing Award in nineteen ninety-eight" | covered |
| I1 transaction definition, bracket | Bracket | "a pair of brackets around some work" | covered |
| I2 BEGIN / COMMIT / ROLLBACK | Bracket | "COMMIT makes all of the changes permanent and visible to everyone, at one instant" | covered |
| I3 psycopg implicit transaction; still lost money | Bracket | B: "You're in a transaction, so you're safe." A: "It was in a transaction." | covered |
| I4 atomicity, 500 still in personal | A | "The five hundred credits are still sitting in the personal wallet" | covered |
| I5 atomic = indivisible, about failure | A | "Good instinct, wrong letter... Atomicity is about failure" | covered |
| I6 WAL, commit record, recovery | A | "That's called the write-ahead log, W A L" | covered |
| F1 log figure | A | "Picture the log as a strip running left to right" | covered |
| I7 undo log vs Postgres versions | A | "MySQL's engine, InnoDB... keeps an undo log" | covered |
| I8 durability definition, microsecond | D | "one microsecond after COMMIT comes back" | covered |
| I9 write vs fsync; data files lazy | D | "Those can be updated lazily. Minutes later, even." | covered |
| I10 flush cost, wal_sync_method open_datasync, group commit | D | "tens of microseconds to a millisecond"; "open data sync"; "group commit" | covered |
| I11 synchronous_commit off, 3x200 ms, analytics not wallet | D | "three times a setting called the wal writer delay" | covered |
| I12 consistency, constraints list | C | "Not null... Unique... A check... a foreign key" | covered |
| I13 CHECK balance >= 0 | C | "a check that the balance is at least zero" | covered |
| I14 C is the odd letter, Kleppmann | C | "A, I and D are the database's tools. C is what you build with them." | covered |
| I15 isolation definition | I | "each one behaves, to some degree, as if it were running alone" | covered |
| I16 serializable ideal | I | "the same as if they'd run one at a time, in some order" | covered |
| I17 lost update one floor down | Lost update | "The credits bug is the identical shape, one floor down" | covered |
| F2 lost charge timeline 100/90/75/65 | Lost update | "So it writes seventy-five... sixty-five" | covered |
| I18 cost 3,428, four more | Lost update | "That's the one that cost three thousand four hundred twenty-eight credits" | covered |
| I19 dirty read | Anomalies | "sees zero, and rejects the user's next request" | covered |
| I20 non-repeatable read | Anomalies | "prints an invoice that disagrees with itself" | covered |
| I21 phantom, can't lock nonexistent row | Anomalies | "You can't lock a row that doesn't exist yet." | covered |
| I22 write skew doctors, different rows | Anomalies | "They wrote different rows." | covered |
| I23 three sessions cap | Anomalies | "at most three concurrent browser sessions" | covered |
| I24 locks approach slow | MVCC | "A long report would block every single charge" | covered |
| I25 MVCC, xmin, xmax | MVCC | "One's called x min... The other is x max" | covered |
| I26 snapshot and visibility rule | MVCC | "a version is visible to you if the transaction that made it had committed in your snapshot" | covered |
| F3 three versions, three readers, VACUUM | MVCC | "on disk there are three physical versions side by side" | covered |
| I27 readers/writers don't block | MVCC | "readers never block writers, and writers never block readers" | covered |
| I28 writers block writers, row lock | MVCC | "holds a row lock on it" | covered |
| I29 VACUUM, long transactions | MVCC | "long-open transactions are bad manners" | covered |
| I30 see hidden fields | MVCC | "just select x min and x max along with everything else" | covered |
| I31 isolation level definition, SQL standard, two differences | Levels | "When the snapshot is taken. And what happens when you try to write a row" | covered |
| I32 read uncommitted = read committed | Levels | "Postgres just runs as read committed" | covered |
| I33 read committed details | Levels | "You get a new snapshot for every statement" | covered |
| I34 repeatable read = snapshot isolation, error, phantoms | Levels | "could not serialize access due to concurrent update" | covered |
| I35 SSI, 9.1/2011, false positives, 40001 retry | Levels | "error code four zero zero zero one" | covered |
| I36 MySQL, Oracle, Hermitage | Levels | "Oracle's 'serializable' has historically been snapshot isolation" | covered |
| PR1 doctors predict | Predict | B guesses repeatable read; "It's serializable." | covered |
| F4 isolation lab | Figure | "You pick a scenario... And a level." four things to find | covered |
| I37 four fixes differ in who waits/retries | Fixes | "They differ in who waits, who retries" | covered |
| I38 atomic update, why safe at RC | Fixes | "re-reads the newest version of the row, and re-checks" | covered |
| I39 FOR UPDATE, pessimistic, no network calls | Fixes | "never, ever make a network call, to an LLM, to Stripe" | covered |
| I40 optimistic, CAS, ETag, hot row | Fixes | "compare-and-swap"; "E tag and if match headers" | covered |
| I41 raise level and retry, costs | Fixes | "every code path that touches the database has to be safe to retry" | covered |
| I42 rule of thumb | Fixes | "Atomic update when the logic fits in one statement..." | covered |
| I43 deadlock scenario | Deadlocks | "It locks one, then wants two." | covered |
| F5 deadlock figure | Deadlocks | "Picture it as a little X." | covered |
| I44 deadlock_timeout 1 s, 40P01, retry | Deadlocks | "four zero P zero one, 'deadlock detected'" | covered |
| I45 lock in same order, short transactions | Deadlocks | "Always lock rows in the same order." | covered |
| I46 wallet and runs in two DBs | Distributed | "the record of the agent run lives in a different service" | covered |
| I47 2PC, PREPARE TRANSACTION, off by default | Distributed | "with a command called prepare transaction, it's just switched off by default" | covered |
| I48 why avoided | Distributed | "your wallet row is frozen because some other service crashed" | covered |
| I49 idempotency keys, Stripe, exactly once impossible | Distributed | "Exactly once is impossible over a network." | covered |
| I50 outbox pattern | Distributed | "Write to one database, twice, in one local transaction." | covered |
| F6 outbox figure | Distributed | "Picture a big box on the left, the credits database" | covered |
| I51 api-lifecycle and queues lessons | Distributed | "the idempotency keys in the lesson on the life of an API" | covered |
| PR2 lost credits predict: 509-572, 86%, ~19,000 retries, ~5 per success | Predict | "dropped by only five hundred nine to five hundred seventy-two" | covered |
| B0 setup, GIL released, one connection per thread | Build It | "the driver lets go of the GIL while it waits on the network" | covered |
| B1 harness, invariant, barrier | Build It | "The starting balance, minus the sum of the ledger, must equal the current balance" | covered |
| B2 task 1 naive, one worker, RR no retry | Build It | "run it with just one worker, and the loss goes to zero" | covered |
| B3 task 2 four fixes, hints, cap 1,000 | Build It | "cap your retries, say at a thousand" | covered |
| B4 task 3 doctors, sessions, materializing the conflict | Build It | "materializing the conflict" | covered |
| B5 task 4 deadlock error, lock on transaction, tuple | Build It | "So to wait for the row, you wait for that transaction to finish." | covered |
| B6 task 5 row versions in two sessions | Build It | "You still see the old balance and the old x min." | covered |
| B7 done when | Build It | "The naive run loses money every time with eight workers and none with one." | covered |
| M1 reference setup, noise 2-5x | Measure | "The same run varied by two to five times" | covered |
| M2 naive numbers | Measure | "Half a second and one point seven seconds" | covered |
| M3 RR no retry 3,166-3,223, ~80% | Measure | "Correct, and useless." | covered |
| M4 atomic 0/0/0.5,1.4 | Measure | "The fastest correct option." | covered |
| M5 FOR UPDATE 0.6, 3.8 | Measure | "waiting in a queue still beats retrying" | covered |
| M6 optimistic ~19,000 2.1/11.9; SER ~16,000 4.3/8.3; 100 wallets check | Measure | "each charge picks one of a hundred wallets at random" | covered |
| M7 one row ceiling ~4,000/s at 0.25 ms | Measure | "one wallet tops out around four thousand charges a second" | covered |
| K1 side effect in retry loop | Break It | "The database rolled back every failed attempt. The outside world didn't." | covered |
| K2 50 ms sleep, 20/s, idle in transaction | Break It | "listed as 'idle in transaction'" | covered |
| K3 no guard, 1,000 start, 4,000 charges, 0 vs -3,000 | Break It | "Minus three thousand. And nothing complains." | covered |
| K4 SERIALIZABLE on half, default_transaction_isolation | Break It | "set it as the database default" | covered |
| E1 letter by letter | Ending + Idea | B's restatement + A's correction | covered |
| E2 lost update + fixes in order | Fixes + ending | "Do the arithmetic in one statement. Or lock the row first." | covered |
| E3 write skew, RR misses, materialize or constraint | Build It | "The other way out of write skew... turn the rule into an actual constraint" | covered |
| E4 20,000/s scaling options | Measure | "Second, batch... Third, split the wallet... Or fourth, pre-allocate." | covered |
| E5 distributed transactions answer | Distributed + ending | "you don't stretch a transaction across them" | covered |
| G1 Kleppmann ch. 7, Postgres docs | Close | "chapter seven of Kleppmann's Designing Data-Intensive Applications" | covered |
| C1 connections | Close | "the threads lesson, one floor down"; "a very careful user of F sync"; indexes | covered (why-databases pointer dropped) |

Derived, not written in the lesson: "around six tenths of a second" (three times two hundred
milliseconds); "page zero, second slot" for tuple (0,2) (the lesson asks the question without
answering it).
