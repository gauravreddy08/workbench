# Outline: transactions

Source: src/lessons/transactions.mdx. Curriculum entry: "Transactions." Question: what does a
transaction guarantee, and what goes wrong without one? Why: double charges, lost updates and
corrupted counters are all missing transactions. Diagnostic gap hit directly: "DB indexes,
transactions: fuzzy/blank". B voices the natural wrong model "I'm inside a transaction, so I'm safe"
and "atomic means about concurrency".

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereq: lost-update race on a counter from the threads lesson (counter plus-equals one, both read 41, both write 42). -> A re-explains in two sentences when the lost update section arrives.
- T2 Prereq: what fsync promises (write returning means bytes in OS page cache in RAM; fsync waits till the drive says it's on flash). -> A re-explains in durability section.
- T3 Need Postgres on Mac or Spark; one evening. -> One sentence at Build It.

## The Problem

- P1 Naive charge(): read balance, check it, write new balance, insert ledger row, commit. Correct, tests pass. -> A describes the code as four steps, no code read.
- P2 Customer launches batch, eight workers charge the same wallet at once. -> A.
- P3 Measured: Postgres 16 on M4 Pro, wallet 100,000, 8 threads x 500 charges of 1 credit; ledger 4,000 rows; balance 99,428, should be 96,000; 3,428 of 4,000 never came off; second run 99,491. -> A, numbers spoken, B reacts.
- P4 Nothing crashed, no error; service gave away 86% for free; only noticed by summing ledger vs balance. -> A.
- P5 Second problem: move 500 from personal to team wallet; two writes; process dies between (deploy, OOM kill, power cut); 500 left one wallet and arrived nowhere. -> A.
- P6 Two problems: crashing halfway, and two pieces of work interleaving. A transaction is the database's answer to both. -> A states, B restates.

## Origin

- O1 1970s IBM System R, among first relational DBs; customers banks and airlines; thousands of terminals updating same accounts and seat maps; machines that crashed. -> A story.
- O2 Jim Gray, 1981, "The Transaction Concept: Virtues and Limitations"; borrowed from contract law: all parties' obligations happen or none; once signed stays signed. -> A.
- O3 Two years later (1983) Theo Härder and Andreas Reuter, writing about crash recovery, coined ACID; stuck partly because it sounds good. -> A.
- O4 Gray Turing Award 1998 largely for this; every database and most money runs on these ideas. -> A.

## The Idea

- I1 Transaction = a bracket around work; Term: group of operations treated as one unit, all or none, others never see it half done. -> A.
- I2 BEGIN opens; COMMIT makes all changes permanent and visible to everyone at one instant; ROLLBACK throws all away as if never ran. Four promises = four letters. -> A in words.
- I3 psycopg opens a transaction on first statement and keeps it open until commit/rollback; naive charge WAS in a transaction and still lost money; being in a transaction is not protection from interleaving; that depends on I, which has settings. -> B voices "but I'm in a transaction" wrong model; A corrects.
- I4 Atomicity: all or nothing; if process dies after first update, as if never started; 500 still in personal. -> A.
- I5 "Atomic" means indivisible (Greek), not about concurrency (that's I); about failure: crashes, errors, constraint rejecting second write, your own ROLLBACK. -> B assumes atomic = concurrency; A corrects.
- I6 How undo after process is dead: a diary; write-ahead log (WAL) Term: append-only file, every change recorded before applied to data files; last thing a transaction writes is commit record; after crash: with commit record kept, without treated as never happened. -> A.
- F1 Figure 001: log left to right: T1 wallet minus 10, T1 ledger row, T2 personal minus 500, T1 COMMIT, T2 team plus 500 never written, CRASH. Fsync the log, then tell client "committed". Recovery: T1 has commit record, redo; T2 none, aborted, personal keeps 500. A transaction exists the instant its commit record is on disk. -> A as a diagram over the phone.
- I7 Undo differs: MySQL InnoDB undo log (old values copied back on rollback) Term; Postgres never overwrites, writes new version, marks transaction committed or aborted; aborted versions invisible forever, cleaned later. Commit record = single moment of truth. -> A.
- I8 Durability Term: once COMMIT returns, survives crash and power loss, even a power cut a microsecond later. -> A.
- I9 write() returning means bytes in OS page cache (RAM); Postgres by default doesn't answer COMMIT until WAL written and fsync'd and drive says on flash; data files updated lazily, minutes later, log enough to rebuild. -> A, re-explaining fsync.
- I10 Price: every commit waits for a flush; typical NVMe on Linux very roughly tens of microseconds to a millisecond; on a Mac "flushed" varies; wal_sync_method picks the call, on his Mac open_datasync. Group commit: one flush covers many commit records. -> A, with comparison.
- I11 Dial: synchronous_commit off lets COMMIT return before flush; might lose last fraction of a second (bounded at three times wal_writer_delay, default 200 ms, so about 600 ms) but never half-done; fine for analytics events, not for a wallet. -> B asks for the number; A.
- I12 Consistency Term: moves DB from one valid state to another, every declared rule holds. Constraints Term: NOT NULL, UNIQUE, CHECK, FOREIGN KEY. -> A.
- I13 wallets table with CHECK balance at least zero: no transaction can commit a negative balance; statement fails, transaction can only roll back; prevents a bug or race quietly writing nonsense found in a month. -> A.
- I14 C is the odd letter: Kleppmann (DDIA): consistency mostly property of the application; DB checks declared rules, can't know "ledger sum must equal balance change" unless declared. A, I, D are the DB's tools; C is what you build with them. -> A, B pushes.
- I15 Isolation Term: concurrent transactions don't interfere, each behaves (to a degree set by level) as if alone; the one that would have saved the credits service; has settings. -> A.
- I16 Ideal: a thousand at once, result same as one at a time in some order; called serializable Term; expensive; weaker levels let specific named bad things through. -> A.
- I17 Lost update = the threads-lesson counter bug one level down: two transactions read same balance, each subtracts from what it read, second write erases first. Term. -> A, re-explaining prereq.
- F2 Figure 002: worker A reads 100, B reads 100; A writes 90; B writes 75 from stale 100 (should be 65); A's charge erased; both ledger rows exist, ledger and balance disagree by exactly 10. -> A walks timeline; B works the math.
- I18 Lost update cost 3,428 credits; four other anomalies. -> A.
- I19 Dirty read Term: T1 deducts 100 for a big run, before commit T2 reads, sees 0, rejects next request; T1's payment fails, rolls back; T2 refused based on balance that never existed. -> A.
- I20 Non-repeatable read Term: billing report reads 100 at top, again 90 for invoice total; invoice disagrees with itself. -> A.
- I21 Phantom Term: count runs for wallet w1, get 2, same query same transaction gets 3; nobody changed a row you read, new row appeared; row locks can't stop it, can't lock a row that doesn't exist yet. -> A.
- I22 Write skew Term: doctors from Kleppmann; need at least one on call; Alice and Bob on call, both sick; each counts (2), decides safe, takes self off; nobody on call. Wrote different rows, no contested row lock; slips past defenses that stop lost update. -> A tells; B tries "but they'd conflict" and A corrects.
- I23 TinyFish version: at most 3 concurrent browser sessions; both count 2, both insert, 4; same shape with a phantom on the side. -> A.
- I24 MVCC intro: simple approach is locks (readers lock what they read, writers wait for readers); correct and slow; long report blocks every charge. -> A.
- I25 MVCC Term: never update in place; UPDATE writes new version, marks old replaced; hidden fields xmin (transaction that created this version) and xmax (that replaced or deleted it, empty if none). -> A, spell "x min", "x max".
- I26 Snapshot Term: record of which transactions had committed at a moment; version visible if creator committed in snapshot and replacer (if any) had not; everything else invisible though on disk. -> A.
- F3 Figure 003: one logical row, three physical versions: 100 (made by T1 committed, replaced by T2), 90 (T2 committed, replaced by T3), 65 (T3 in progress). Report with old snapshot sees 100; new reader sees 90; T3 sees its own 65; if T3 rolls back, 65 invisible forever; nobody waited; VACUUM deletes old ones later. -> A over the phone.
- I27 Consequence 1: readers never block writers, writers never block readers. -> A.
- I28 Consequence 2: writers block writers; one transaction at a time may create next version of a row; row lock Term (taken by UPDATE, DELETE, SELECT FOR UPDATE, held till commit/rollback); second writer waits; the wait is where the decisions happen. -> A.
- I29 Consequence 3: old versions pile up; VACUUM Term (garbage collector); transaction left open for hours holds old snapshot, stops VACUUM; long-open transactions bad manners. -> A.
- I30 You can see hidden fields by selecting x min, x max on any table; done in Build. -> A one line.
- I31 SQL standard defines four isolation levels Term by which anomalies forbidden; each DB implements differently; know what yours does; in Postgres the first three differ only in when snapshot is taken and what happens writing a row someone changed. -> A.
- I32 Table: READ UNCOMMITTED runs as READ COMMITTED in Postgres. -> A in words.
- I33 READ COMMITTED (default): new snapshot per statement; write to changed row waits for lock, writes on top of newest version; stops dirty read; lets through lost update (read-then-write in app), non-repeatable read, phantom, write skew; naive charge ran here: SELECT saw 100, UPDATE writes 75 whatever row says now. -> A.
- I34 REPEATABLE READ = snapshot isolation Term (Berenson et al. 1995): one frozen picture; updating a row someone else changed and committed after snapshot -> refused, "could not serialize access due to concurrent update"; silent lost update becomes loud error; Postgres's also blocks phantoms (standard doesn't require); lets write skew through. -> A.
- I35 SERIALIZABLE in Postgres since 9.1 (2011) = SSI Term: like RR plus remembers what each read; T1 read what T2 wrote and T2 read what T1 wrote -> no serial order -> one aborted "read/write dependencies among transactions"; doesn't block extra, vetoes; false positives possible; any transaction can fail with SQLSTATE 40001, code must retry. -> A; B "so it can just fail?".
- I36 Other DBs: MySQL InnoDB defaults to REPEATABLE READ with different rules (locking reads see latest data, not snapshot); Oracle "SERIALIZABLE" historically snapshot isolation, allows write skew; same words different guarantees; Kleppmann's Hermitage tests these. -> A brief.
- PR1 Predict: doctors at same moment; weakest Postgres level where one stays on call? Answer SERIALIZABLE; at RR each has own snapshot, both see 2, write different rows, concurrent-update check never fires, both commit; run on Postgres 16: RR both committed, 0 on call; SER first commit OK, second failed with read/write dependencies, one on call; SSI noticed each read a row the other wrote. -> A asks; B guesses REPEATABLE READ; A reveals.
- F4 Figure 004 interactive lab: simulation of Postgres rules; six scenarios (lost update, atomic UPDATE, dirty read, non-repeatable read, phantom, write skew) and four levels (no isolation, RC, RR, SER); step T1 and T2 in any order; middle column every version; things to find: lost update at RC turning into error at RR; atomic UPDATE correct at RC (T2 waits for lock, subtracts from newest); write skew surviving RR, dying at SER; dirty read needs textbook level Postgres doesn't offer. -> A describes what you'd see as you step.
- I37 Four fixes; all work; differ in who waits, who retries, how much code. -> A signpost.
- I38 Fix 1 atomic update Term: arithmetic in DB, balance equals balance minus 10 where id and balance at least 10, returning balance; even at RC can't lose: UPDATE takes row lock, waits, then re-reads newest version and re-checks WHERE; guard folded in; zero rows back = not enough; first choice: one round trip, no retries; only when decision fits one statement. -> A; B asks why safe at RC.
- I39 Fix 2 SELECT FOR UPDATE: when logic too complex (price plan, spending limit); lock at read time; second waits until commit then reads new value; pessimistic locking Term; cost is waiting; never make a network call (LLM, Stripe) while holding. -> A.
- I40 Fix 3 optimistic: version column; conditional write where version equals what you read; zero rows -> start over; optimistic concurrency Term; compare-and-swap Term; nobody waits, losers retry; great when conflicts rare; only option across requests (edit form saved a minute later; ETag and If-Match headers); terrible on one hot row. -> A.
- I41 Fix 4: raise level and retry on 40001; loop restarts whole transaction; DB detects for you, no thinking which rows to lock; SERIALIZABLE also catches write skew you didn't notice; costs: retries under contention and every code path must be retry-safe. RR enough for single-row lost update. -> A.
- I42 Rule of thumb: atomic when one statement; FOR UPDATE when not and contention high; optimistic when contention low or spans requests; SERIALIZABLE when invariants too complicated to trust yourself to lock the right rows. -> A compact; B restates.
- I43 Deadlock: transfer A 1 to 2 locks 1 wants 2; B 2 to 1 locks 2 wants 1; wait forever. Term. -> A.
- F5 Figure 005: two transfers, two wallets, each holding the lock the other needs; a cycle; Postgres notices after deadlock_timeout (1 s), kills one, other proceeds; fixed order makes cycle impossible. -> A.
- I44 Deadlock check after waiting longer than deadlock_timeout; picks victim, aborts with SQLSTATE 40P01 "deadlock detected" plus detail naming processes and row; the other carries on; from app side just another retry error. -> A.
- I45 Prevention: always lock in same order (smaller id first, or select where id in both order by id for update); cycle needs someone going the other way; short transactions help. -> A.
- I46 Distributed: wallet in Postgres, run record in another service's DB; want charge and mark paid atomic across both. -> A scene.
- I47 Two-phase commit Term: coordinator asks each "can you commit?", each writes durably, keeps locks, votes yes; phase two commit if all yes; Postgres supports PREPARE TRANSACTION, off by default (max_prepared_transactions 0). -> A.
- I48 Why avoided: gap between phases; voted-yes participant can't decide alone; coordinator dies -> participants hold locks possibly long; wallet row frozen because another service crashed; throughput bounded by slowest participant and extra round trips; ties availability together. -> B "why not just use it"; A.
- I49 Idempotency keys: caller makes unique key per logical action ("charge for step 7 of run abc"); stored with UNIQUE constraint in same transaction as charge; retry finds it, returns original result; caller can retry freely; Stripe Idempotency-Key header; idempotent Term ("set balance to 90" idempotent, "subtract 10" not unless deduplicated); exactly once impossible over network -> at least once with duplicates ignored. -> A.
- I50 Outbox pattern: write to one DB twice in one local transaction (charge + outbox row "tell runs service run abc paid"); relay reads outbox, delivers, retries until acked; local transaction makes charge and message atomic; relay makes delivery eventual; receiver idempotency makes duplicates harmless. -> A.
- F6 Figure 006: credits DB box with wallets, outbox, ledger with unique key run-abc-step-7, one transaction; relay polls, retry until ack; sends to runs service with own DB, dedupe by key; atomic left, eventual right; no transaction spans two DBs. -> A.
- I51 Both met again: idempotency keys in API lifecycle lesson, relay plus queue in queues lesson. -> A one line (Connections).
- PR2 Predict: 8 threads, 500 naive charges of 1 credit, 100,000 wallet, RC; how much does balance drop? fraction lost? optimistic retries? Answer: dropped only 509 to 572 of 4,000, about 86% lost; each charge a few round trips, sizeable fraction of a millisecond; 8 workers on one row almost every read overlaps; optimistic: about 19,000 retries for 4,000, almost 5 failed per success. -> A asks B; B guesses a few percent; A reveals.

## Build It

- B0 Setup: one folder; Python threads fine because psycopg releases the GIL while waiting on network (I/O-bound case); each thread own connection (a connection can only be in one transaction at a time). Postgres 16 via Homebrew, Docker, or pgserver pip package (used for lesson numbers); psycopg 3. -> A one-two sentences.
- B1 Harness: schema wallets (balance not null, check at least zero, version) + ledger; reset; audit invariant: starting balance minus ledger sum must equal balance; run() resets, starts N workers behind a barrier so they start together, each charges n times, counts retries, audits. -> A: what matters is the invariant and the barrier.
- B2 Task 1: naive charge inside with conn.transaction (commits at end, rolls back on exception); run three times; then workers equals 1 -> loss zero (concurrency, not arithmetic); then REPEATABLE READ with no retry, count SerializationFailure. -> A.
- B3 Task 2: four fixes in fixes.py, each lost 0; hints: rowcount says whether UPDATE matched; fetchone none when RETURNING gave no row; catch exception outside the with block since psycopg rolls back on the way out; retry must restart the whole transaction; cap retries (say 1,000), infinite retry is a hang. -> A.
- B4 Task 3: write skew needs precise interleaving, drive two connections by hand; run at RR and SER, read DETAIL and HINT; TinyFish sessions cap version (4 sessions at RR); fix with SER, and at RC by locking wallet row FOR UPDATE first so both contend on something real: "materializing the conflict". -> A; name stressed.
- B5 Task 4: deadlock: a updates 1, b updates 2, then threads cross; one hangs about a second then DeadlockDetected; error reads "waits for ShareLock on transaction ..., blocked by process ..." and "while updating tuple (0,2)"; why lock on a transaction not a row: row's xmax points at the changing transaction, to wait for row you wait for that transaction; tuple (0,2) (page zero, item two: derived, see report); time the hang vs deadlock_timeout; fix by ordering. -> A; B asks why "transaction".
- B6 Task 5: two psql sessions; session 1 RR begin, select x min, x max and current transaction id; session 2 updates (autocommit) and selects; session 1 still sees old balance and old x min (snapshot); session 1 update -> error. Match to Figure 003. -> A.
- B7 Done when: naive nonzero lost with 8, zero with 1; four fixes lost 0; skew 0 doctors at RR, 1 at SER, session cap holds; deadlock produced, explained, fixed by ordering; say for each fix who waits and who retries. -> folded into the Build narration, not read as a list.

## Measure

- M1 Reference runs: M4 Pro, Postgres 16.2 via pgserver, Python 3.12, psycopg 3, 8 x 500; timings noisy (2 to 5x), correctness and retry counts stable. -> A.
- M2 Naive: lost 3,428 and 3,491 of 4,000; 0 retries; 0.5 and 1.7 s. Loses most, not a few; three statements and commit, each round trip; window good fraction of a millisecond; no error, ledger intact, only audit catches. -> A.
- M3 RR no retry: 0 lost; 3,166 to 3,223 charges failed (around 80%); 0.9 and 1.4 s; "correct but useless": isolation level without retry loop converts silent data loss into loud request failures. -> B gets it; A.
- M4 Atomic: 0 lost, 0 retries, 0.5 and 1.4 s; fastest correct; shortest lock hold, no Python between; workers queue but each holds briefly. -> A.
- M5 FOR UPDATE: 0, 0, 0.6 and 3.8 s; lock held across Python round trip; on one hot row, waiting in a queue beats retrying. -> A.
- M6 Optimistic about 19,000 retries, 2.1 and 11.9 s; SERIALIZABLE about 16,000, 4.3 and 8.3 s; slowest here and that's the point; one row eight workers worst case for optimism; 4 to 5 failed per success; shine when conflicts rare; check: 100 wallets at random, predict retries collapse near zero, optimistic and SER catch up. -> A; B predicts.
- M7 Scaling: every fix funnels one wallet through one row lock; 0.25 ms hold -> about 4,000 charges/s per wallet regardless of servers; back of envelope, measure by adding workers until throughput stops rising. -> A, B "so more servers don't help?".

## Break It

- K1 Side effect inside retry loop: print "charged!" before commit in serializable charge; thousands of extra "charges"; DB rolled back failed attempts, outside world didn't; side effects after commit or in outbox row. -> what-if exchange.
- K2 Lock held across network: sleep 50 ms between FOR UPDATE and UPDATE; at most 20 charges/s per wallet however many workers; pg_stat_activity shows sessions waiting on a lock and holder "idle in transaction", one of the most common causes of production Postgres slowdowns. -> B predicts 20; A.
- K3 Remove guard and constraint: drop balance guard from atomic; wallet 1,000; 4,000 charges; catch CheckViolation; with CHECK every charge after money runs out fails, rolls back incl. ledger row, balance stops at exactly 0 (C and A together); without CHECK balance goes to minus 3,000, nothing complains. -> A.
- K4 SERIALIZABLE on half: a SER b RC (and reverse): both commit, 0 on call; SSI only tracks reads by SER transactions and can only abort SER ones; set default_transaction_isolation, not per call site. -> B guesses "half protection"; A.

## Explain It Back (substance must be in the conversation)

- E1 Letter by letter: A with commit record in WAL; C declared rules, partly app's job; I don't see half-done work, at SER equals some one-at-a-time order, prevents lost update and write skew; D COMMIT returns after log fsync'd. -> covered across Idea + ending.
- E2 Lost update explanation, happens at RC even inside a transaction, same as counter; fixes in order. -> covered in Idea + fixes.
- E3 Write skew, why RR misses it (only same-row writes), SSI catches; alternatives: materialize conflict, or turn rule into a constraint. -> A adds "or turn the rule into a constraint" in the write skew/Build part.
- E4 20,000 charges/s on one wallet: one row is a ceiling (0.25 ms incl. statement plus commit flush -> about 4,000/s); measure first; options cheapest first: shortest transaction (one statement, autocommit, no Python between); batch 50-100 ms and apply sum in one UPDATE with bulk ledger rows, 20,000 lock acquisitions into a few hundred; split wallet into N sub-balances (sharded counter), charge random one, sum to read, fuzzier insufficient check; pre-allocate blocks (say 1,000) per worker, return unused, how rate limiters and quota systems work; trade: precise instant balance vs throughput, decide tolerable overdraft. -> full exchange in Measure scaling section.
- E5 Distributed transactions: 2PC window; ties availability; instead local transaction + outbox + at-least-once relay + idempotent receiver; exactly once impossible, at least once plus dedupe gets same effect. -> distributed section + ending.

## Go Deeper / Connections

- G1 Kleppmann DDIA chapter 7 the one thing to read; Postgres docs chapter 13 concurrency control. -> one sentence near end.
- C1 Threads lesson one floor down (FOR UPDATE is a lock around the critical section); durability is the files lesson applied to a log; leans forward: build own log (why-databases), indexes (SERIALIZABLE tracks reads using index ranges, missing index makes it abort more), queues (outbox relay), back-of-envelope (a lock is a queue with a max throughput). -> one or two sentences before the ending.

## Flow

Problem (the 3,428 lost credits, then the half-done transfer) -> Origin (Gray, contract law, ACID)
-> the bracket and the "but I was in a transaction" correction -> A and the WAL -> D and fsync
-> C and constraints -> I and serializable -> lost update and figure -> other four anomalies
-> MVCC, snapshots, three consequences -> levels in Postgres -> doctors Predict -> lab figure
-> four fixes -> deadlocks -> distributed (2PC, idempotency, outbox) -> lost-credits Predict
-> Build It tasks -> Measure + scaling exchange -> Break It -> connections + reading -> ending.
