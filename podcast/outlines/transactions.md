# Outline: transactions

Source: src/lessons/transactions.mdx. Curriculum: "Transactions." What does a transaction
guarantee, and what goes wrong without one?

## The one big idea

A transaction is a bracket around some work that answers two different problems: crashing halfway,
and two pieces of work interleaving. The first is solved by a log with one moment of truth. The
second has settings, and the default does not protect the read-then-write code everyone writes.

## Opening scene

The simplest TinyFish credits charge: read the balance, check it, write the new one, add a ledger
row. Every test passes. Eight workers charge the same wallet at once and most of the charges never
come off the balance. No error, no crash; only adding up the ledger shows it. Then a second way to
lose money: a transfer that dies between its two writes.

## Wrong mental model B voices

Diagnostic: transactions were fuzzy or blank. B says "but the charge was already inside a
transaction, so it should be safe", and earlier "atomic means it's about concurrency". Later B
expects the stronger setting to fix everything without changing the code.

## Story beats

1. The lost charges, and the half-done transfer. Two problems, one tool.
2. Origin: Jim Gray, System R, banks and airlines on machines that crashed. Contract law: everything
   happens or nothing does, and signed stays signed. ACID came two years later.
3. The bracket and the diary: write-ahead log, the commit record as the single moment of truth.
   Atomic means indivisible, about failure. Durable means commit waits for the disk to say so.
4. "But I was in a transaction." Yes, and it still lost money. The same bug as two threads adding
   one to a counter, one floor down. Isolation has settings.
5. How Postgres keeps people apart: never overwrite, keep versions, each reader has a snapshot.
   Readers never wait for writers; writers wait for writers; old versions pile up.
6. The settings: a fresh picture per statement (default) versus one frozen picture that refuses to
   write over a change you never saw. Without a retry loop that just turns silent loss into loud
   failures.
7. Write skew: the two doctors. Different rows, so no conflict; only the strongest setting, which
   tracks what you read, catches it. TinyFish version: the session cap.
8. The fixes, and who waits versus who retries: arithmetic in the database first; lock before you
   read; optimistic version check; strongest setting plus retry. On one hot row the optimists lose
   most attempts. Side effects belong after the commit.
9. Across two databases: why two-phase commit freezes everyone, and what people do instead
   (idempotency keys, the outbox).

Ending: B says "a transaction makes it safe"; A sharpens: it makes it all-or-nothing, but how safe
from other people depends on the setting, and the strongest one only works if you retry.

## Numbers worth saying (four)

- Eight workers on one wallet.
- "Most" of the charges lost (more than eight in ten).
- Nineteen eighty-one.
- Two doctors.

## Left to the written lesson

The code, SQL, harness and Measure table, exact lost-credit counts, retry counts and timings, the
isolation-level table, xmin and xmax, error codes, deadlock_timeout and the deadlock message, the
synchronous_commit dial, the one-hot-row throughput ceiling and its fixes, Break It details,
other databases' differing definitions, Hermitage and the reading list.
