# Outline: queues

Source: src/lessons/queues.mdx. Curriculum: "Queues and logs." What is a message queue, and why do
big systems put one between every pair of services?

## The one big idea

A queue unwelds slow, failure-prone work from whatever asked for it. The hard part isn't the list,
it's handing a job over safely: a dead worker is just silence, so a job is loaned out with a
deadline and acked only after the work. That makes duplicates unavoidable, which is why the real
answer is never "exactly once" but a worker that can safely do the same job twice.

## Opening scene

A save handler that calls an LLM for a summary and then the ranker, while the user watches a
spinner. One week: a big import floods it and retries double the load; a deploy kills in-flight
work and nothing records what finished; a corpus re-score loop dies most of the way through on one
malformed document, and you start over.

## Wrong mental model B voices

Diagnostic: thought async "is a queue" and that a sync server "crashes" under load. B voices "a
queue gives you more capacity", then "just have the broker delete it when it hands it out", then
"so use the exactly-once setting".

## Story beats

1. Three failures, one shape: slow work welded to the asker.
2. The restaurant rail: waiter, cooks, tickets. Producer, worker, broker. Four things it buys:
   different speeds, absorbing spikes, retrying out of sight, many readers. The price: answers come
   later, and a new system that can fail.
3. A queue doesn't add capacity: one worker short and the line grows forever. Spikes drain at the
   spare capacity; headroom is what clears backlogs.
4. Handing over a job: delete on handover loses it; a dead process doesn't announce it's dead; the
   lease. A lease shorter than the job runs it twice with nothing crashed.
5. The three promises. Why exactly-once delivery can't exist: silence after the save looks like
   silence before. At-least-once plus a worker that makes repeats harmless; "set", not "add"; result
   and done mark together.
6. Poison messages: one bad document kills workers one at a time forever. Count attempts, park it
   in a dead-letter queue with why it died, alert, re-drive after the fix.
7. Origin and the other machine: LinkedIn's pipelines between every pair, Kafka, Kreps's essay on
   the log. A log keeps everything and readers keep a bookmark; replay. Lanes, order only inside a
   lane, one slow record blocks its lane. Task versus event.
8. Batch inference as a queue: chunks, keyed results, so the "which ones finished" problem
   disappears. When I killed workers constantly, nothing was lost; the non-idempotent table had
   duplicates; with a tiny gap you might see none, which is the dangerous case.

Ending: B: "a queue is a buffer that makes things reliable"; A sharpens: it makes the work
survivable, and only because the worker is safe to run twice; and it moves waiting, it doesn't add
capacity. Watch the age of the oldest job.

## Numbers worth saying (four)

- A few seconds of spinner.
- Five million documents.
- Two thousand thirteen for Kreps's essay.
- One worker short.

## Left to the written lesson

Little's Law arithmetic and worked sizes, the simulator steps, SQS and Celery specifics and
defaults, the Redis key layout and Lua claim script, all code, Kafka offsets and commit settings,
consumer groups in detail, share groups, the outbox and CDC (only touched), the tools table,
measured tables and knee analysis, Break It details, the overnight re-score sizing.
