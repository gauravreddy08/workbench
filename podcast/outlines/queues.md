# Outline: queues

Source: src/lessons/queues.mdx. Curriculum entry: "Queues and logs." Question: what is a message
queue, and why do big systems put one between every pair of services? Why: batch jobs, retries,
and smoothing traffic spikes all use queues. Build: move slow work out of a request into a worker
queue; kill workers and make sure nothing is lost.

Diagnostic gap touched: "async is a queue" (sync/async wrong model) and "a sync server crashes under
load". B voices "so a message queue is basically async, right?" and A separates the two: async is how
one worker waits; a message queue is a durable to-do list between programs. Also the Numbers gap:
Little's Law sizing, drain time, lag slope, all said with small worked examples.

Each item: what the lesson teaches -> how it is said aloud.

## Today / prerequisites

- T1 Prereq: Little's Law from Waiting vs working (in flight = arrival rate times time inside). -> A re-explains in one breath before the worker-count Predict, with the coffee-shop-free version: "thirty a second, two seconds each, sixty inside".
- T2 Prereq: Rate limits: unbounded buffers hide overload; retries with backoff and jitter. -> A re-explains when backpressure and retryable failures come up.
- T3 Prereq: Transactions (two writes commit together or not at all). -> A, one clause, at the idempotent write.

## The Problem

- P1 Feature: on every saved document, call an LLM for a two-line summary, then the cross-encoder scores it against the user's saved queries; done inside the request handler; works on laptop; about 6 s per save, user stares at spinner. -> A opens on this scene.
- P2 Import of 4,000 docs: 4,000 requests each holding a connection 6 s; LLM provider answers 429 (too many requests); inline retries push requests to 30 s; load balancer times them out; user retries the import; now 8,000. -> A, as a story; 429 explained in words.
- P3 Mid-afternoon deploy: rolling restart kills every in-flight request; some summaries written, some not, nothing records which. -> A.
- P4 Re-score the whole corpus, 5 million docs, new checkpoint; a loop; dies at 3.2 million on a malformed byte that crashes the tokenizer; don't know which finished; start over. -> A; B reacts to the start-over.
- P5 Common shape: slow, failure-prone work welded to whatever asked for it. Asker slow/impatient/dead -> work suffers; work slow/broken -> asker suffers. Fix: a buffer in between, a to-do list both sides read and write at their own pace and that remembers what's done. That's a queue. -> A names it.
- P6 Diagnostic wrong model: B "isn't that just async? async is a queue." A: different thing. Async = one worker not standing idle while waiting; still tied to the request; if process dies, gone. Message queue = separate durable service holding work that outlives the request and the process. -> B/A exchange right after P5.

## Origin

- O1 Around 2010 LinkedIn: dozens of systems each needing data from dozens of others: page views into Hadoop, profile changes into search, activity into recommendation models, metrics into monitoring. -> A, story.
- O2 Every pair had its own custom pipeline, so pipelines grew like the number of pairs, each broke its own way. -> A; B reacts to "grows like the number of pairs" in plain words, no derived count.
- O3 Jay Kreps, Neha Narkhede, Jun Rao built Kafka: a single durable append-only record of events any system writes to and reads from at its own pace. Open-sourced 2011. -> A.
- O4 Dec 2013 Kreps essay "The Log: What every software engineer should know about real-time data's unifying abstraction". A log, an ordered list of things that happened, kept for a while, is underneath databases (write-ahead log), replication, data integration. Log in the middle: every system a reader that can catch up, fall behind, start over without anyone noticing. -> A.
- O5 Founded Confluent 2014; most companies now run some version of that log. -> A, short.

## The Idea: a to-do list between two programs

- I1 Ticket rail comparison: waiter writes ticket, clips it, goes back; cooks take tickets when free; ten tables at once, rail gets long, nobody kept waiting at kitchen door, nobody in kitchen rushed. -> A, short, one point only.
- I2 Terms: producer (creates jobs, puts them on queue; usually API server); consumer / worker (takes messages, does something; unit of work -> worker); message queue (separate service holding messages until consumers take them; producer doesn't know who consumes or whether they're up); broker (server that stores the queue and hands out messages: Redis, RabbitMQ, SQS, Kafka). -> A, each defined inline.
- I3 Message is just bytes, small JSON blob saying what to do: doc id and task "summarize". Not the document, a pointer to it. -> A, in words, no braces.
- F1 Figure 001: before, one chain client-API-LLM+ranker held open 6 s, any link dies, work lost; after, handler writes a job and answers 202 plus job id in about 15 ms; queue; three workers; LLM; each side at own pace; client checks back. -> A describes like a diagram over the phone; 202 = "accepted, here's a ticket".
- I4 Benefit 1 decouple speed: API accepts 2,000 saves/s, workers summarize 20; without queue slow side sets the pace; with one, API stays fast, backlog lives somewhere designed to hold it. -> A.
- I5 Benefit 2 absorb spikes: bursts (import, cron job, Monday morning); queue stores burst, workers work it off over next few minutes; size workers for average not peak, as long as backlog drains before next burst. -> A.
- I6 Benefit 3 retry independently: LLM 503, worker retries later, user's request finished long ago; API deploys, queued jobs don't care. -> A, ties back to P3.
- I7 Benefit 4 fan out: "document saved" read by summarizer, ranker, search indexer, analytics, each on own schedule; producer writes once, doesn't know they exist; adding a fifth doesn't touch producer. -> A.
- I8 Price: work is asynchronous; user gets "accepted" not the answer; need result reporting (poll a jobs endpoint, webhook, websocket push); a new system that can fail; most of the lesson is making it fail safely. -> A; B notes "so async in a different sense" tying to P6.

## The Idea: how many workers (Little's Law)

- I9 Little's Law recap: in flight = arrival rate times time inside; worker pool is cleanest case: each worker one job at a time, so jobs in flight = busy workers. -> A (T1).
- PR1 Predict: 30 saves/s, each job 2 s of worker time; minimum workers? one fewer? Answer: 60 workers, busy 100%. With 59, finishes 29.5/s while 30 arrive, queue grows 0.5/s forever: 1,800 after an hour; each new job waits behind all. Queue doesn't add capacity, only moves the waiting somewhere safer. In practice 70-80 for headroom: waiting explodes as utilization nears 100% even when averages fit (p99 lesson). -> A asks; B guesses 60 right, then guesses one fewer means "a bit slower" (wrong); A reveals the forever-growth.
- I10 Batch sizing: 5 million docs at 20 ms each = 100,000 worker-seconds; 16 workers about 6,250 s, an hour and three quarters; 1 worker 28 hours; "if nothing else is the bottleneck" checked in Measure. -> A, worked out slowly; B asks about one worker.

## The Idea: watch it (Figure 002, interactive)

- F2a Sim: jobs arrive at random at set rate; each takes about half a second, one worker about 2/s. Lease 3 s; killed worker restarts. Readouts: arrivals, capacity, in queue, oldest wait, done, redelivered, lost; lag graph. -> A describes what you'd see.
- F2b Step 1: 6 arrivals/s, 4 workers (capacity 8), queue stays short; drop to 3 workers (capacity 6 = arrivals), lag wanders up, doesn't reliably come back. -> A, B surprised equal isn't enough (ties to PR1 headroom).
- F2c Step 2: back to 4, press Spike, queue jumps by 60, drains at capacity minus arrivals, 8 - 6 = 2/s, so about 30 s. -> A, B works the division.
- F2d Step 3: kill -9 a busy worker; job sits in "leased, owner dead" with countdown, reappears at head of queue filled dark (a retry); redelivered up, lost 0. -> A.
- F2e Step 4: ack before work, kill again: job gone, lost goes up. -> A.
- F2f Caption: lag is the line to watch: flat when keeping up, climbs steadily when arrivals exceed capacity, steps up then drains after spike. -> A (also used for lag shapes later).
- I11 Two hidden lessons: "broker handed you the job" vs "the job is done"; and a 3 s gap where the job is neither waiting nor running: the price of surviving crashes. -> A.

## The Idea: acks and leases

- I12 Broker's decision: delete on handover, or keep until worker says finished. That message = ack (acknowledgement: "I've handled this, you can forget it"; until then broker assumes it may still need doing). -> A.
- I13 Delete on handover -> crash loses job. Keep until ack -> must know when to give up, because a dead process doesn't announce it's dead; "still working" and "kill -9'd ten minutes ago" look identical: silence. -> A; B's wrong model: "the broker would notice the worker died" (connection drop); A: from the broker's side it's silence. Careful not to add claims; say "a dead process doesn't announce it".
- I14 Lease: temporary ownership with a deadline; if not acked or renewed by then, given to someone else. SQS calls lease length the visibility timeout: received message invisible to others for, say, 30 s (default 30 s); delete in time = gone for good; else visible again, someone gets it = redelivery (handing the same message out again; consumer may get something it or a dead colleague partly processed). -> A, terms inline.
- F3 Figure 003 three rows: ack before work + crash = job lost (at-most-once); ack after work, crash during work = lease runs out, redelivered, runs again, nothing lost; ack after work, crash after save before ack = runs twice (at-least-once, consumer must dedupe). -> A walks three timelines; bottom row emphasized.
- I15 Lease must outlast the job: 90 s job, 30 s lease -> second worker gets it while first still working, then a third; nothing crashed, runs three times. Long jobs: long lease or heartbeat (worker says "still on it", broker pushes deadline back; SQS has a call for changing visibility). Celery's Redis transport: visibility timeout defaults to one hour; a task scheduled or running longer gets delivered again. -> A.
- I16 Short lease = fast recovery, long lease = slow recovery: dead worker's job sits until lease expires; in the sim 3 s; one-hour lease = an hour's delay. Pick lease from longest normal job times safety factor; heartbeat if spread is wide. -> A.
- PR2 Predict: ranker jobs 1-3 s, about 1 in 1,000 is a giant 50 s doc; lease 30 s, no heartbeat; workers never crash. What in results table and bill? Answer: every giant doc processed at least twice, often more (30 s expiry, another worker picks up, if second passes 30 s a third starts); 5 million docs -> 5,000 giant ones, each 2-3 times: maybe 10,000 extra 50 s jobs, a few extra worker-hours, duplicate rows if writes not idempotent. Looks like a crash bug, nothing crashed. Fix: heartbeat every 10 s, or lease well above p99.9 job time. -> A asks, B guesses "the giant ones time out and fail"? (wrong), A reveals.

## The Idea: delivery semantics

- I17 At-most-once: zero or one times, never duplicated, can be lost; ack/delete before work. Fine when losing one is cheaper than doing twice: metrics sample, "user is typing" ping. -> A.
- I18 At-least-once: one or more times, never lost while broker survives, can duplicate; ack after work. Default for almost every serious queue. -> A.
- I19 Exactly-once: what everyone wants; not achievable as delivery across arbitrary systems; achievable as an effect via at-least-once + dedup. -> A.
- I20 Why no exactly-once delivery: worker saved and died before ack reached broker, or ack sent and network dropped it; broker sees silence; silence after save looks like silence before save; redeliver (risk duplicate) or not (risk loss); no third option, broker can't see inside worker; move the ack earlier and you just moved the gap. Cousin of the two generals problem: two parties over a lossy channel can never be sure they agree. -> A; B tries "just ack twice / confirm the ack" and A shows it moves the gap.
- I21 Industry answer: at-least-once delivery + consumer that makes duplicates harmless. Idempotent: doing it twice has same effect as once ("set score to 0.83" yes; "add 0.83 to total" no). Idempotency key: unique ID so receiver recognizes a repeat; job ID or natural key like doc id plus model version; same trick as API retries in API lifecycle. -> A.
- I22 Technique 1: write result and done-mark in one transaction: insert into scores, doc and model as primary key, on conflict do nothing; second delivery's insert is a no-op; bump a counter only if insert actually inserted, same transaction; effect and record of effect can't come apart (Transactions). -> A in words, no SQL read.
- I23 Technique 2: make it a set, not an add: "doc 81723's score is 0.83" any number of times; "increment processed count" can't unless dedupe first. -> A.
- I24 Technique 3: external side effects (email, charge a card, paid API): pass the key if supported (Stripe takes an idempotency key header), or record "sent" before you'd risk sending twice and accept a crash between may mean zero sends; someone picks at-most or at-least once, you choose where. -> A.
- I25 Kafka "exactly-once semantics" (2017): producer retries don't duplicate in the log; a job reading from Kafka and writing back to Kafka commits output and read position atomically. Real, useful; but touching anything outside Kafka (DB, model API, email) -> back to at-least-once + idempotency. Effectively-once = the honest name. -> A; B skeptical.

## The Idea: poison messages and DLQ

- I26 The malformed-byte doc under at-least-once: claim, crash, lease expires, another claims, crashes... poison message (fails every time; bad data or bug, not temporary outage; retrying forever wastes workers, can block queue) can kill the whole pool in a loop, one worker at a time, forever. -> A, callback to P4; B realizes.
- I27 Fix: count attempts; every claim bumps counter; when it fails or lease expires at the limit (3 or 5), broker moves it to a dead-letter queue (separate queue; nobody processes automatically; human looks, fixes, re-queues; DLQ). SQS: redrive policy with max receive count; RabbitMQ: dead-letter exchange; Celery leaves it to you. -> A.
- I28 Three DLQ rules: store why it died (last exception and traceback, attempt count, which worker); alert on it (silent DLQ = dropping messages); re-drive tool (one command moves everything back after the fix; safe because consumer idempotent even if half-succeeded). -> A.
- I29 Retryable vs permanent: LLM 503 -> retry with backoff and jitter (Rate limits: wait longer each time, randomize so retries don't sync up); Unicode decode error fails identically every attempt -> straight to DLQ. -> A, T2.

## The Idea: job queues vs logs

- I30 Job queue: each message a unit of work to exactly one worker, deleted once acked. Celery, RQ (Redis Queue), Sidekiq = libraries on brokers like Redis or RabbitMQ; SQS = Amazon's hosted version. In Redis a queue is often just a list: push to one end, pop from the other. -> A.
- I31 Kafka is a log: append-only ordered sequence, nothing changed in place. Messages not deleted when read; appended to end of a file, kept for fixed time (default 7 days) or size limit whether read or not. Each record gets offset (position number 0,1,2...). Consumer doesn't ack individual messages; remembers how far it read by periodically saving current offset (a commit). -> A; B "so nobody deletes anything?"
- F4 Figure 004: queue side: read plus ack = gone, each job to one worker, no replay, no history. Log side: append-only, kept N days, records numbered from zero; group B at 3, group A at 7; every group sees every record; rewind = set offset back to 0. -> A describes.
- I32 Log's three powers: many independent readers (own positions; slow one doesn't slow others; new one can start from beginning); replay (bug in summarizer for two days -> fix, reset offset to two days ago, reprocess; with job queue they're gone once acked); history as data (the log is a record of what happened, in order; rebuild search index, cache, whole table by reading from start: Kreps' point). -> A.
- I33 Job queue's advantages: per-message acks, per-message retries and DLQs, no positions to think about, scale by adding workers. Rule of thumb: task to do once -> job queue; event (fact about what happened) several systems care about -> log. -> A; B restates rule.

## The Idea: partitions, consumer groups, ordering

- I34 One log on one disk only goes so fast; topic (named stream like "documents-saved") split into partitions (each independent ordered log; order within, none across; spread across brokers/machines). Producer picks partition usually by hashing the record's key; same key, same partition every time. -> A.
- I35 Consumer group: set of consumers sharing a topic; each partition to exactly one consumer in the group; each record processed once per group. Load balancing partition by partition, not message by message. -> A.
- F5 Figure 005: producer hashes key mod 3 into P0, P1, P2; doc 17's events all in P1, in order; group "rankers" C1, C2, C3 each own one partition; C4 idle; order holds inside a row only. -> A describes.
- I36 Consequence 1: ordering only per partition. Within P1, doc 17's events in written order; across partitions none: C1 might process an event from P0 written an hour after one C2 hasn't reached in P1. If order matters for an entity (edits of a doc, events of a user), make it the key. Global order = one partition = one consumer. -> A; B voices wrong model "Kafka keeps everything in order" and A corrects.
- I37 Consequence 2: parallelism capped by partitions: three partitions, at most three busy consumers per group, fourth idle hot spare. Pick partition count for parallelism you'll need later; adding partitions later changes which partition each key hashes to, breaking per-key ordering across the change. -> A; B asks "can't you just add partitions".
- I38 Consequence 3: one slow message blocks its whole partition: read in order; one record takes a minute, everything behind waits, even with other consumers idle. Job queue doesn't have this: any free worker takes next job. Deepest practical difference; "Kafka as a job queue for slow, uneven jobs" often hurts. Kafka 4.x adding "share groups" (queue-style consumption on a topic); check docs for status. -> A.
- I39 Kafka semantics with offsets: commit before processing -> crash skips records (at-most-once); commit after -> crash replays from last commit (at-least-once, possibly a few hundred duplicates). Default auto-commit every 5 s in background can do either depending on timing; serious consumers turn it off and commit after processing. -> A.

## The Idea: consumer lag

- I40 Health isn't size alone; a big shrinking backlog is fine. Consumer lag: how far behind. Kafka: newest offset minus committed offset per partition = written but not yet processed. Job queue: depth, better: age of oldest message. Depth = how much, age = how late. 10,000 tiny jobs might be 5 s of work; 100 huge ones an hour. SQS publishes approximate age of oldest message. -> A; B asks "why isn't depth enough".
- I41 Three shapes (from the sim): flat near zero = keeping up; spike then decay = burst absorbed, draining at capacity minus arrival rate; steady ramp = arrivals exceed capacity, never recovers on its own. Ramp's slope is the shortfall: lag grows 600 a minute -> 10 per second short -> by Little's Law, 10 times job time more workers. -> A; B works 600/60.
- I42 Drain time = backlog divided by (capacity minus arrival rate). 100,000 backlog, capacity 110/s, arrivals 100/s -> 10,000 s, almost three hours, even though "over capacity". Headroom clears backlogs. -> A, slow worked example in words; B surprised.
- I43 Backpressure: Rate limits showed unbounded buffer hides overload, producer never feels it. A queue is a very large buffer on purpose; choice to absorb rather than push back; fine for spikes, terrible for sustained overload. Bound it (max length, or reject when oldest is older than deadline) and alert on lag; else fills disk or memory and failure is much bigger than a 429. -> A, T2.

## The Idea: outbox

- I44 Save handler: insert doc row into Postgres, commit, enqueue "summarize". Process dies between -> doc exists, job never will. Swap order -> job for a rolled-back doc. Can't wrap both in one transaction: two different systems. Dual write (same change to two systems as two steps; crash between leaves them disagreeing, neither knows). -> A describes the three lines in words.
- I45 Outbox pattern: write the message into an outbox table in the same DB transaction as the document; both or neither; a separate small relay reads unsent rows, publishes, marks sent. -> A.
- F6 Figure 006: API -> one DB transaction box with documents row (doc 81723) and outbox row (summarize 81723), "both rows or neither" -> relay (poll or CDC) -> queue; relay crash after publish before marking sent -> publishes again on restart; at-least-once again, consumer still idempotent. -> A; B spots the duplicate case themselves.
- I46 Relay polls every few hundred ms, or reads the DB's write-ahead log with change data capture (reading the DB's internal change log, Postgres WAL, MySQL binlog; Debezium the common tool; CDC). CDC is Kreps' argument made literal: DB already has a log. -> A.

## The Idea: which one to reach for

- I47 Background jobs in a Python app: Celery or RQ on Redis; simple per-job retries; turn on acks late in Celery or a worker crash loses the task. -> A, as advice, not table.
- I48 Jobs on AWS no servers: SQS plus DLQ via redrive; visibility timeout and DLQ built in; standard queues at-least-once with best-effort order. -> A.
- I49 Already have Postgres: a jobs table plus select for update skip locked; jobs commit in same transaction as data, no outbox; fine up to thousands of jobs/s. -> A explains skip-locked in words (each worker grabs a row others have locked are skipped).
- I50 Events many systems read, replay, history: Kafka or Redpanda (Kafka-compatible); retention, offsets, groups, per-key order. -> A.
- I51 In between, already on Redis: Redis Streams (add, read as group, ack commands); a log with consumer groups and per-consumer pending list, so you can reclaim stuck messages. -> A.

## The Idea: batch inference is a queue workload

- I52 Batch job = queue with one giant spike at the start; lag = how much is left; 3.2-million-and-crash disappears. -> A, callback P4.
- I53 Each job a chunk, not a document: shard number with a start and end; one per document = 5 million broker round trips, one per 1,000 = 5,000, worker runs ranker on full GPU batches. Trade: bigger chunks more efficient, redo more work when worker dies mid-chunk. -> A; B asks about chunk size.
- I54 Results keyed (doc id, model version), on conflict do nothing or overwrite (same score either way); re-running a chunk harmless; never need to know which finished; just re-enqueue anything not in results. -> A.
- I55 Poison to DLQ: malformed doc fails its chunk 3 times, parked with traceback while other 4,999 chunks move; better, catch per-document errors inside chunk and record them so one bad doc doesn't send 999 good ones to the DLQ. -> A.
- I56 Little's Law sizes it (workers times per-worker throughput -> finish time before start), lag tracks it (on schedule? slope tells finish). -> A.
- I57 Provider batch APIs are this under the hood: durable queue of your requests worked off with spare capacity, why cheaper. -> A, B reacts.

## Build It

- B0 Setup (ok task): Redis installed (brew or docker), ping answers PONG; folder, venv, redis, fastapi, uvicorn, httpx. Redis = fast shared data-structure server, only a handful of commands needed. -> A one or two sentences.
- B0b Fake ranker: about 20 ms of CPU per doc, repeated hashing, holds a core; tune iterations until 15-25 ms; raises on docs containing the word POISON. -> A.
- B0c Results DB (SQLite): scores (job id primary key) written idempotently; scores_naive plain insert; stats counter; two tables on purpose to see the difference. -> A.
- B1 Task 1 before: FastAPI sync handler calls score ten times (about 200 ms, pretend summary plus ranker), one worker, 50 concurrent requests with the load generator from Waiting vs working; note p50 and p99; request 50 waits for the 49 in front. -> A.
- B1b Task 1 after: handler writes a job (job id from doc id, natural key so re-saving is no-op job) and answers 202 with job id; status endpoint says done with score, pending, or dead. Accept p99 drops from seconds to a few ms; work still takes as long, just not on user's clock. -> A.
- B2 Task 2 queue in Redis, four keys: pending list of waiting IDs; in-flight sorted set scored by lease deadline; DLQ list; per-job hash with payload, attempts, last error. Sorted set = set where every member has a number and Redis keeps them ordered; "which leases expired" = one range query up to now. -> A describes as four boxes.
- B2b Claim must be atomic: pop from pending and record lease in in-flight; two commands with a crash between -> job in neither place, lost. Redis runs a Lua script atomically (nothing else runs mid-script); claim = tiny script given: pop, add to in-flight with deadline, bump attempts, return id, payload, attempts. -> A; B "why can't it be two calls?" (A answers).
- B2c Rest is his: enqueue (write job hash with attempts 0, push onto pending; question: what if same doc saved twice?); ack (remove from in-flight, delete job; what if lease expired and someone else holds it: remove returns 0 or 1); extend = heartbeat, push deadline back only if still in-flight; fail = record last error, make lease expire now so reap handles it; reap = every expired lease: attempts at max -> DLQ, else back to pending; returns requeued and dead; must be atomic so two reapers don't requeue twice: a second Lua script. Hints: requeue onto the end claim reads next, so retry doesn't wait behind backlog; never scan all keys. -> A summarizes, highlights the two questions.
- B3 Task 3 worker: loop reap, claim with 2 s lease, score, write, ack. IDEM flag: on -> one transaction, insert-or-ignore into scores, bump counter only if a row was inserted; off -> plain insert into naive table, always bump. Catch exceptions -> fail with traceback. Ack only after write commits. ACK_DELAY env var sleeps between write and ack (0 normally; widened in Measure to hit Figure 003 bottom row). Sleep 50 ms when nothing to claim. WAL mode so many processes write; begin immediate so two workers don't deadlock upgrading read locks. -> A.
- B4 Task 4 given: producer enqueues N docs, every 1,000th (the one numbered 7 mod 1,000) is poison, so 2 in 2,000; chaos script spawns W workers and every 0.3 s kill -9's a random one and restarts it (the supervisor); ends when nothing pending or in flight; prints time, kills, DLQ size; verify prints idempotent rows, naive rows, naive distinct, counter. kill -9 = signal a process can't catch or clean up after. Run: setup, produce 2,000, chaos 8, verify. -> A.
- B5 Task 5 DLQ tool: list (id, attempts, last line of error); redrive (reset attempts, move back to pending). "Fix the bug" (strip POISON), re-drive, check all 2,000 have exactly one score. Agent reviews reap and redrive for races: reaping while re-driving? -> A.
- B6 Task 6 optional log: Redpanda in Docker, Kafka-compatible, one binary; topic docs-saved with 3 partitions; producer 10,000 records keyed by doc id; consumer in group rankers, auto-commit off, commit after processing. (1) two consumers same group + one other group: check partition ownership; other group sees every record. (2) four consumers on 3 partitions: one owns nothing. (3) reset group to start, run again; every record reprocessed, keyed writes mean results unchanged: replay. Agent can explain errors/config, loop is his. -> A.
- B7 Done when: post answers in a few ms however slow scoring is; status reports pending/done/dead; 8 workers kill every 0.3 s, 2,000 docs -> 1,998 rows, counter 1,998, 2 poison in DLQ with tracebacks; IDEM off with widened gap shows duplicates and which row of Figure 003 made each; throughput-vs-workers table with knee explained; after fix and redrive DLQ empty, each doc exactly one score. -> A, folded into the build talk.

## Measure

- M1 Chaos table four ways (idem on/off, ack delay 0 / 10 ms). Ack delay of 10 ms widens gap from microseconds so kills land in it. Expect lost zero in every row: 1,998 scored plus 2 in DLQ, because a job leaves Redis only on ack and ack comes after commit. Idem on: rows and counter exactly 1,998 every time. Idem off: rows exceed distinct by roughly number of kills landing between commit and ack. -> A.
- M2 Author's run (M4 Pro, Python stand-in for Redis, not real Redis): idem off + 10 ms delay: 23 kills, 2,009 rows for 1,998 distinct, 11 duplicates, counter 2,009; idem on same settings: 24 kills, exactly 1,998. -> A; B asks for the real numbers.
- M3 Ack delay 0: window tiny, maybe zero duplicates; the dangerous case: bug still there, rare enough to reach production. -> A, B voices "so zero means fine" and A corrects.
- M4 Throughput table: no chaos, 2,000 docs, 1 to 24 workers; docs per second and per worker. -> A, one sentence.
- PR3 Predict knee: CPU-bound 20 ms; check performance/efficiency core counts. Ideal 50 docs/s per worker, straight line until out of cores. M4 Pro (10 performance + 4 efficiency): near-linear to about 10, smaller gain from efficiency cores, then flat; 24 workers = 24 processes taking turns on 14 cores, per-worker falls, total flat or dips (context switching, cache thrash). Knee much earlier -> something else: broker (several Redis round trips per job, 0.1-0.2 ms each on localhost), SQLite single writer, or measurement (chaos polls every 0.3 s, short runs rounded up). General lesson: throughput rises with workers until it hits the first shared resource; the knee tells you which. Author's run with slow Python stand-in flattened at about 8 workers: stand-in saturated. Real Redis does over 100,000 simple commands/s on one core, shouldn't be your knee. Check yourself. -> A asks, B guesses "keeps going up" or "around number of cores", A reveals.
- M5 Use the number: one machine tops out at P docs/s -> 5 million / P seconds. Reverse: deadline D needs 5 million / D throughput, divided by per-worker rate, across machines to stay below each knee. On the Spark the ranker would run on GPU in batches, knee = GPU throughput, chunk size is the dial. -> A in words with no letters.
- M6 Lag under a spike: 8 workers, no chaos, producer steady 200 docs/s, then 5,000 extra at once; sample pending length every second and plot; should look like the sim spike: jump then straight-line decline with slope capacity minus 200; check against throughput table. -> A.

## Break It

- K1 Lease shorter than job: 0.01 s lease, 20 ms jobs, no kills; every lease expires mid-work, reap hands it on, naive table fills with duplicates while workers are healthy; add a heartbeat thread extending every half-lease and it stops. Most common production queue bug; looks like "random duplicates under load", because jobs slow down under load. -> what-if exchange.
- K2 No attempt limit: poison bounces pending/in-flight forever using a worker each time; one poison per 1,000 and slow failure (tokenizer hangs 10 s then crashes) -> growing fraction of the pool does nothing but fail. Put limit back. -> exchange.
- K3 Ack before work: move ack before write, rerun chaos: fewer than 1,998 rows, nothing in DLQ for them, no error anywhere. Silent loss worse than duplicates, nothing tells you. -> exchange.
- K4 Producer faster than consumers, no bound: 2 workers, producer 500 docs/s for minutes; Redis memory climbs, oldest job age grows without limit. Guard in enqueue: if pending length over a limit, raise; API returns 503 with retry-after. Backpressure at the door of the queue. -> exchange; B computes 2 workers at 50/s each = 100/s vs 500 (derived: lesson doesn't state 2 workers capacity; 50 docs/s per worker is in lesson, so 100/s derived). 

## Explain It Back (no quiz; substance must appear)

- E1 Why a queue, cost: decouple speeds; bursts stored and drained, size for average; retry without caller waiting or alive; fan-out to consumers producer doesn't know. Cost: async result delivery (polling, webhooks); new system to run, monitor, size; delivery semantics -> duplicates -> idempotent consumers; doesn't add capacity, grows if arrivals exceed capacity long. -> covered via I4-I8, PR1; ending restatement.
- E2 Semantics: at-most-once acks before; at-least-once acks after; exactly-once delivery impossible because lost ack after finish looks like death before finish; build at-least-once + idempotent consumer (key, write result and done in one transaction, insert unique ignore conflicts, or set not add); effectively-once; Kafka's exactly-once only Kafka-to-Kafka. -> I17-I25.
- E3 kill -9 step by step: claimed -> in-flight with deadline; kill instant, can't ack/fail/clean up; broker sees nothing; deadline passes -> visible again, attempt count up; another worker runs from start; if result saved already, idempotent write ignores it; repeated failure to limit -> DLQ with last error; cost = one lease-length delay plus wasted partial work. -> A walks it in full during acks section or Build It chaos, explicitly step by step.
- E4 Kafka vs job queue: events for several systems, replay, per-key ordering at high throughput; retention regardless of reads; groups track own offsets, independent, rewind. Job queue for tasks done once by one worker, especially slow/uneven: any free worker, own ack, retry count, DLQ. Kafka partition read in order by one consumer, slow record blocks partition, parallelism capped by partitions. -> I30-I38.
- E5 50 million docs in 12 hours: 50 million / 43,200 s about 1,160 docs/s; measure one worker, say 400 docs/s per GPU batched -> about 3 GPUs, plan 4-5 for headroom (retries, stragglers); Little's Law in-flight = throughput times time per chunk -> how many concurrent chunks; chunks of a few thousand docs; results keyed doc id + model version, ignore on conflict -> redelivered harmless, restart enqueues only missing; lease longer than slowest chunk or heartbeat; attempt limit + DLQ; catch per-doc errors; watch lag (chunks remaining), slope gives finish; too shallow -> add workers until next shared limit: DB write rate, document storage, network; past that shard the results store or write results to files per chunk. -> A/B exchange near end, after batch inference / Measure M5.

## Go Deeper / Connections

- G1 Kreps' "The Log" essay (and the short book I Heart Logs); Kleppmann's Designing Data-Intensive Applications, stream processing chapter. -> one closing-ish sentence from A, before the final restatement.
- C1 Connections: Data pipelines (training-data scale), Batching (what a worker does with a chunk on GPU), Observability (lag and oldest-age as dashboards). Processes/threads/GIL: each worker is a separate process so CPU-bound scoring uses every core. -> A, one sentence; GIL point placed in Measure knee.

## Flow

1. Problem scene (P1-P5), B's async-is-a-queue (P6). 2. Origin (O1-O5). 3. Ticket rail + terms + figure 001 + four benefits + price. 4. Little's Law predict + batch sizing. 5. Sim walk-through. 6. Acks, leases, figure 003, lease rules, lease predict, kill -9 step by step (E3). 7. Delivery semantics, idempotency, Kafka EOS. 8. Poison + DLQ. 9. Queue vs log, figure 004, three powers. 10. Partitions, groups, three consequences, offset commits. 11. Lag, shapes, slope, drain time, backpressure. 12. Outbox + CDC. 13. Which tool. 14. Batch inference. 15. Build It tasks. 16. Measure incl. knee predict and the 50-million sizing (E5). 17. Break It. 18. Go Deeper + connections sentence. 19. B restates, A sharpens.
