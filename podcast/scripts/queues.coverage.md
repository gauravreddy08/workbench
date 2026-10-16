# Coverage: queues

Lesson src/lessons/queues.mdx vs podcast/scripts/queues.md. Item IDs match
podcast/outlines/queues.md. "Fixed" = was missing or wrong in the first draft and has been
added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 Little's Law recap | How many workers | "The number of things in flight equals the rate they arrive times how long" | covered |
| T2 Unbounded buffers hide overload; backoff and jitter | Lag; Poison | "an unbounded buffer hides overload"; "with jitter, meaning you add a bit of randomness" | covered |
| T3 Transactions | Delivery semantics | "a group of database writes that all commit together or not at all" | covered |
| P1 Save feature, LLM summary + cross-encoder, 6 s spinner | Problem | "Each save takes, what, about six seconds" | covered |
| P2 4,000 import, 429, 30 s, LB timeouts, retry, 8,000 | Problem | "four twenty-nine... thirty seconds... Now there are eight thousand" | covered |
| P3 Rolling restart kills in-flight; nothing records which | Problem | "nothing anywhere records which" | covered |
| P4 5M re-score dies at 3.2M on malformed byte; start over | Problem | "it dies at three point two million" | covered |
| P5 Work welded to asker; buffer/to-do list = queue | Problem | "Slow work that can fail is welded directly to whatever asked for it" | covered |
| P6 Diagnostic gap: async is a queue | Problem | B: "isn't that just async? Like, async is basically a queue" | covered |
| O1 LinkedIn 2010, dozens of systems, four example flows | Origin | "Page views going into Hadoop. Profile changes going into search" | covered |
| O2 Pipeline per pair, each broke its own way | Origin | "Grows like the number of pairs" | covered |
| O3 Kreps, Narkhede, Rao; durable append-only record; 2011 | Origin | "a single, durable, append-only record of events" | covered |
| O4 Dec 2013 essay; log underneath DB/replication/integration | Origin | "Databases have one internally, the write-ahead log" | covered |
| O5 Confluent 2014; most companies run a log | Origin | "in twenty fourteen the three of them left to found Confluent" | covered |
| I1 Ticket rail comparison | To-do list | "the waiter doesn't cook" | covered |
| I2 Producer, consumer/worker, message queue, broker | To-do list | "The name for that side is the producer" | covered |
| I3 Message = small JSON, pointer not document | To-do list | "Not the document itself. A pointer to it." | covered |
| F1 Figure 001 before/after, 202 + job id ~15 ms | To-do list | "a two oh two... In about fifteen milliseconds" | covered |
| I4 Decouple speed 2,000 vs 20 | To-do list | "accept, say, two thousand saves a second. Your workers can summarize twenty" | covered |
| I5 Absorb spikes; size for average | To-do list | "size the workers for the average rate, not the peak" | covered |
| I6 Retry independently; deploys | To-do list | "the queued jobs don't care" | covered |
| I7 Fan-out; fifth reader | To-do list | "You add a fifth reader next month" | covered |
| I8 Price: async results, new system | To-do list | "poll a jobs endpoint... webhook... websocket" | covered |
| I9 Pool = cleanest Little's Law case | How many workers | "'jobs in flight' just means 'busy workers'" | covered |
| PR1 Predict 60 workers; 59 -> +0.5/s, 1,800/hour; no capacity added; 70-80 headroom | How many workers | "the queue grows by half a job every second. Forever" | covered |
| I10 5M x 20 ms = 100,000 worker-s; 16 -> 6,250 s; 1 -> 28 h | How many workers | "about sixty-two hundred and fifty seconds" | covered |
| F2a Sim setup, readouts, lag graph, 0.5 s jobs | Watch it | "Each job takes about half a second" | covered |
| F2b 4 vs 3 workers at 6/s | Watch it | "It wanders up, and it doesn't reliably come back down" | covered |
| F2c Spike +60 drains at 2/s, ~30 s | Watch it | "So sixty jobs takes... thirty seconds" | covered |
| F2d Kill: leased owner dead, redelivered, lost 0 | Watch it | "'leased, owner dead', with a countdown" | covered |
| F2e Ack before work: lost | Watch it | "Now the job's just gone. Lost goes up." | covered |
| F2f Lag shapes caption | Watch it; Lag | "you saw all three in the simulation" | covered |
| I11 Handed vs done; 3 s gap = price of surviving crashes | Watch it | "That gap is the price of surviving crashes" | covered |
| I12 Ack defined | Acks and leases | "called an ack, short for acknowledgement" | covered |
| I13 Dead process is silent | Acks and leases | B: "wouldn't it just notice the worker died?" | covered |
| I14 Lease, visibility timeout default 30 s, redelivery | Acks and leases | "Thirty's the default" | covered |
| F3 Figure 003 three rows | Acks and leases | "Picture three timelines" | covered |
| I15 Lease outlasts job; heartbeat; SQS visibility call; Celery 1 h trap | Acks and leases | "Its visibility timeout defaults to one hour" | covered |
| I16 Short vs long lease recovery; pick from job length | Acks and leases | "A short lease means fast recovery" | covered |
| PR2 Predict 50 s giant docs, 30 s lease: 5,000 giants, ~10,000 extra jobs, fix | Acks and leases | "maybe ten thousand extra fifty-second jobs" | covered |
| I17 At-most-once + examples | Delivery semantics | "A metrics sample. A 'user is typing' ping." | covered |
| I18 At-least-once default | Delivery semantics | "the default for almost every serious queue" | covered |
| I19 Exactly-once as effect only | Delivery semantics | "you can't get it as a delivery guarantee" | covered |
| I20 Why impossible; moving the gap; two generals | Delivery semantics | "Move the ack earlier and you've only moved the gap" | covered |
| I21 Idempotent, idempotency key, API retries | Delivery semantics | "'Set this document's score to point eight three' is idempotent" | covered |
| I22 One transaction, on conflict do nothing, counter only if inserted | Delivery semantics | "bump it only when the insert actually inserted a row" | covered |
| I23 Set not add | Delivery semantics | "make the operation a set, not an add" | covered |
| I24 External side effects, Stripe key, record sent | Delivery semantics | "Stripe, for example, takes an idempotency key header" | covered |
| I25 Kafka EOS 2017; effectively-once | Delivery semantics | "People call that combination effectively-once" | covered |
| I26 Poison message loop | Poison | "One at a time, forever. That's called a poison message." | covered |
| I27 Attempt counter, DLQ, SQS/RabbitMQ/Celery names | Poison | "a redrive policy, with a maximum receive count" | covered |
| I28 Three DLQ rules | Poison | "store why it died... alert on it... re-drive tool" | covered |
| I29 Retryable vs permanent | Poison | "a Unicode decode error... straight to the D L Q" | covered |
| I30 Job queue; Celery, RQ, Sidekiq, SQS; Redis list | Job queues and logs | "a queue is often literally just a list" | covered |
| I31 Log, retention 7 days, offset, commit | Job queues and logs | "the default is seven days"; "That save is called a commit" | covered |
| F4 Figure 004 | Job queues and logs | "Group B is at record three. Group A is at record seven." | covered |
| I32 Three powers | Job queues and logs | "many independent readers... replay... history as data" | covered |
| I33 Job queue advantages; task vs event | Job queues and logs | "if each message is a task... If each message is an event" | covered |
| I34 Topic, partitions, key hashing | Partitions | "Same key, same partition, every single time" | covered |
| I35 Consumer group, partition by partition | Partitions | "Not message by message, like a job queue. Partition by partition." | covered |
| F5 Figure 005, doc 17 in P1, C4 idle | Partitions | "C four is drawn dashed. It's idle." | covered |
| I36 Order per partition only; key by entity; global = one consumer | Partitions | B: "Kafka keeps everything in order" / "Only inside one partition" | covered |
| I37 Parallelism capped; adding partitions breaks key order | Partitions | "Adding partitions changes which partition each key hashes to" | covered |
| I38 Slow message blocks partition; share groups | Partitions | "Kafka four is adding something called share groups" | covered |
| I39 Commit before/after; auto-commit 5 s | Partitions | "auto-commit every five seconds in the background" | covered |
| I40 Lag; depth vs oldest age; 10,000 tiny vs 100 huge | Lag | "Depth tells you how much. Age tells you how late." | covered |
| I41 Three shapes; 600/min -> 10/s short | Lag | "That's ten a second. So I'm ten jobs a second short." | covered |
| I42 Drain time 100,000 at 110 vs 100 -> 10,000 s | Lag | "That's almost three hours." | covered |
| I43 Queue as deliberate buffer; bound it, alert | Lag | "a queue is a very large buffer. On purpose." | covered |
| I44 Dual write | Outbox | "That's called a dual write." | covered |
| I45 Outbox pattern, relay | Outbox | "You add a table to your database, called the outbox" | covered |
| F6 Figure 006, relay republish = at-least-once | Outbox | B: "If it publishes, and then dies before marking it sent..." | covered |
| I46 Poll or CDC, WAL/binlog, Debezium, Kreps literal | Outbox | "Debezium is the common tool for it" | covered |
| I47 Celery/RQ, acks late | Which one | "turn on the setting called acks late" | covered |
| I48 SQS + DLQ, best-effort order | Which one | "at-least-once, with only best-effort ordering" | covered |
| I49 Postgres skip locked, no outbox, thousands/s | Which one | "for update skip locked" | covered |
| I50 Kafka/Redpanda | Which one | "Kafka, or Redpanda, which speaks Kafka's protocol" | covered |
| I51 Redis Streams | Which one | "a list of pending messages per consumer" | covered |
| I52 Batch = one giant spike | Batch inference | "a queue with one giant spike right at the start" | covered |
| I53 Chunks; 5M vs 5,000 round trips; trade | Batch inference | "One per thousand documents means five thousand" | covered |
| I54 Keyed results, re-enqueue missing | Batch inference | "You just re-enqueue anything that isn't in the results table yet" | covered |
| I55 Poison to DLQ; 4,999 chunks; per-doc errors | Batch inference | "the other four thousand nine hundred ninety-nine chunks keep moving" | covered |
| I56 Little's Law sizes, lag tracks | Batch inference | "Little's Law sizes it, and lag tracks it" | covered |
| I57 Provider batch APIs | Batch inference | "Which is why they're cheaper." | covered |
| B0 Setup, Redis PONG | Build It setup | "You ping it and it answers PONG" | covered |
| B0b Fake ranker 20 ms, POISON raise | Build It setup | "If the document contains the word POISON, it raises" | covered |
| B0c Two tables + counter | Build It setup | "Two scores tables, on purpose" | covered |
| B1 Before: 10x score ~200 ms, 50 concurrent, p50/p99 | Build It setup | "request fifty waits for the forty-nine in front of it" | covered |
| B1b After: 202, natural key, status endpoint | Build It setup | "re-saving the same document is a no-op job" | covered |
| B2 Four Redis keys, sorted set | Build It queue | "a sorted set. That's a set where every member carries a number" | covered |
| B2b Atomic claim via Lua | Build It queue | "It runs a little Lua script atomically" | covered |
| B2c enqueue/ack/extend/fail/reap + hints | Build It queue | "a second Lua script, and that one you write"; "never use the Redis command that lists every key" | covered |
| B3 Worker loop, IDEM, ACK_DELAY, 50 ms, WAL, immediate | Build It worker | "starting each transaction in immediate mode" | covered |
| B4 Producer, chaos, verify, kill -9 | Build It worker | "every three tenths of a second it picks one at random" | covered |
| B5 DLQ tool, fix, redrive, review races | Build It worker | "what happens if a worker is reaping at the same moment you re-drive?" | covered |
| B6 Optional Redpanda experiments | Optional real log | "One of them owns nothing." | covered |
| B7 Done-when list | Build It worker; Measure | "nineteen hundred ninety-eight rows... two poison documents"; "every one of those eleven extra rows is that bottom timeline" | fixed |
| M1 Chaos table expectations | Measure | "nothing lost in any of the four" | covered |
| M2 M4 Pro run 23 kills/2,009/11 dupes; 24 kills/1,998 | Measure | "two thousand and nine rows for nineteen ninety-eight distinct documents" | covered |
| M3 ACK_DELAY 0 dangerous | Measure | "And that's the dangerous case." | covered |
| M4 Throughput table | Measure | "one worker, two, four, eight, twelve, sixteen, twenty-four" | covered |
| PR3 Knee predict, 10P+4E, other bottlenecks, stand-in at 8, Redis 100k/s | Measure | "ten performance and four efficiency"; "flattened at around eight workers" | covered |
| M5 Use the number; Spark GPU knee, chunk dial | Measure | "chunk size becomes the dial" | covered |
| M6 Lag under spike, 200/s + 5,000 | Measure | "you dump five thousand extra on it at once" | covered |
| K1 Lease shorter than job | Break It | "a lease shorter than the job" | covered |
| K2 No attempt limit, 10 s hang | Break It | "say the tokenizer hangs for ten seconds" | covered |
| K3 Ack before work: silent loss | Break It | "Silent loss is worse than duplicates" | covered |
| K4 Unbounded producer, 503 + retry header | Break It | "return a five oh three with a header telling the client when to retry" | covered |
| E1 Why queue + cost | To-do list; How many; ending | "A queue does not add capacity" + four benefits + price | covered |
| E2 Delivery semantics answer | Delivery semantics | as I17-I25 | covered |
| E3 kill -9 step by step | Acks and leases | "exactly what happens when a worker gets kill dash nine'd halfway" | covered |
| E4 Kafka vs job queue | Job queues; Partitions | as I30-I38 | covered |
| E5 50M in 12 h: 1,160/s, 400/GPU, 3 -> 4-5, chunks, keys, lease, DLQ, lag, limits, sharding | Measure | "About eleven sixty a second... four hundred documents a second per GPU" | covered |
| G1 Kreps essay; Kleppmann | Close | "make it Kreps' essay on the log" | covered |
| C1 Data pipelines, batching, observability; GIL/processes | Close; Measure | "at training-data scale in data pipelines"; "Python's GIL" | covered |

Numbers checked against the lesson. Derived (not written in the lesson): "twenty more workers" for a
ten-per-second shortfall with two-second jobs; "then at sixty, a third" for the ninety-second job;
"two workers at fifty a second is a hundred a second" in Break It 4.
