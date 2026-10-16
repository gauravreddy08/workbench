# Coverage: normalization

Lesson src/lessons/normalization.mdx vs podcast/scripts/normalization.md. Item IDs match
podcast/outlines/normalization.md. No item MISSING after the check; numbers checked against the lesson.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| R1 basic SQL in words | throughout | "group by the \"if you know\" side" | covered |
| R2 index recap | Joins | "An index is a sorted lookup structure, usually a B-tree" | covered |
| R3 transaction recap | Build It: anomalies, migration | "a group of changes that either all happen or none do" | covered |
| R4 Codd / IMS | Origin | "IBM had a system called I M S" | covered |
| P1 shared sheet, columns, twenty rows, weekly export | Problem | "It started out as, like, twenty rows" | covered |
| P2 Sam's email, filtered find-and-replace, two people | Problem | "shows him as two different people" (B: "just a sloppy find-and-replace") | covered |
| P3 Priya, tf clicks v1, forty thousand pairs, Slack | Problem | "forty thousand labeled pairs" | covered |
| P4 only Deberta run deleted, 435M lost | Problem | "four hundred thirty-five million parameters" | covered |
| P5 table's fault; normalization defined | Problem | "each fact is stored in exactly one place" | covered |
| O1 pointers, IMS, Apollo, trees, programs broke | Origin | "built partly for the Apollo program's parts lists" | covered |
| O2 Codd June 1970, paper, tables, what not how, normal form | Origin | "And he called that \"normal form\"" | covered |
| O3 1971 follow-up, three anomalies, 2NF/3NF, 1974 Boyce | Origin | "in nineteen seventy-four, with Raymond Boyce" | covered |
| O4 Nixon joke; everything from those papers | Origin | "Nixon was in the news" | covered |
| I1 anomaly defined; bug in the shape | Three ways | "It's a bug in the shape of the table" | covered |
| F1 three panels | Three ways | "Four rows get the new email, one gets missed" | covered |
| I2 root cause: several kinds of thing in one row | Three ways | "mixes several kinds of thing into one row" | covered |
| F2 interactive ripple figure, seven rows, normalized arrows | Three ways | "Seven rows, for her email" | covered |
| I3 metric value fine; passengers | Three ways | "giving each passenger a seat of its own" | covered |
| I4 functional dependency + four examples | If you know X | "if you know this, you know that" | covered |
| I5 arrow, "determines", determinant | If you know X | "is called the determinant" | covered |
| I6 world not data; 33M MiniLM vs e5; disprove not prove | If you know X | "It can never prove one" (B: "just query the data") | covered |
| I7 anomaly = dependency stored badly; human care | If you know X | "enforced by nothing except human care" | covered |
| F3 dependency map | If you know X | "a picture with three columns" | covered |
| I8 key, candidate, run id alone not a key | Keys | "run id plus metric name is" | covered |
| I9 primary key | Keys | "the official identity of a row is the primary key" | covered |
| I10 two complaints about arrows | Keys | "two complaints about arrows" | covered |
| I11 one promise, recognise the copy | Normal forms | "Learn to recognise the copy each one forbids" | covered |
| I12 1NF tags, hardneg-v2, no constraint/index/count, run tags | Normal forms | "also matches a tag somebody adds later called hard neg v two" | covered |
| I13 repeating groups | Normal forms | "what are called repeating groups" | covered |
| I14 atomic, date until month | Normal forms | "right up until you constantly need just the month" | covered |
| I15 2NF, three times for run 101, L12 vs L6, single-column key | Normal forms | "Two of its rows say Mini L M L twelve, and one says L six" | covered |
| I16 3NF, transitive, 33M repeated, three tables, insert/delete anomalies gone | Normal forms | "That's called a transitive dependency" | covered |
| I17 Kent 1983, so help me Codd | Normal forms | "the key, the whole key, and nothing but the key" | covered |
| I18 BCNF signoffs example | Normal forms | "Lena owns M S MARCO gets copied into every single one" | covered |
| I19 BCNF price, dependency preservation, aim for 3NF | Normal forms | "Textbooks call that losing dependency preservation" | covered |
| I20 4NF tags x GPUs | Normal forms | "two independent lists go in two tables" | covered |
| F4 six-table path | Normal forms | "you end up with six tables" | covered |
| PR1 Predict: 600 runs ~1,760 rows; 611; ~210,000; one; half second vs half ms; correctness | Predict | "six hundred eleven rows at six hundred runs" | covered |
| I21 foreign key, cascade vs restrict, referential integrity | Foreign keys | "On delete cascade ... right for metrics" | covered |
| I22 constraint = told dependency; examples; 2 a.m. notebook | Foreign keys | "a constraint is a dependency you've told the database about" | covered |
| I23 natural key | Natural or surrogate | B: "the key's obviously the email" | covered |
| I24 emails change, anomaly back via key | Natural or surrogate | "The update anomaly is back" | covered |
| I25 surrogate key, keep email unique | Natural or surrogate | "a meaningless id the database makes up" | covered |
| I26 rule of thumb, metrics natural, datasets surrogate + unique | Natural or surrogate | "inventing some metric row id adds nothing" | covered |
| I27 join defined, price | Joins | "A join combines rows from two tables" (B: "joins are the slow thing") | covered |
| I28 five index lookups, microseconds, 600,000 rows vs six authors | Joins | "five index lookups. Each one's a few microseconds" | covered |
| I29 where joins hurt: billions, across machines, 5 ms page | Joins | "render in five milliseconds" | covered |
| I30 denormalization defined; normalize first | Denormalize | "normalizing first, and then copying on purpose" | covered |
| I31 dashboards, materialized view, Postgres vs SQLite | Denormalize | "That's a materialized view" | covered |
| I32 warehouses, columnar, star schema, dim model team | Denormalize | "store data column by column" | covered |
| F5 star schema figure | Denormalize | "like the points of a star, four short, wide tables" | covered |
| I33 caches | Denormalize | "denormalized data with an expiry date" | covered |
| I34 document stores, embed vs reference, Kleppmann | Denormalize | "rebuilt the flat sheet, in JSON" | covered |
| I35 history: invoice, dataset version, logs | Denormalize | "A copy is only an anomaly when the copies are supposed to agree" (B flags it as a bug) | covered |
| E5 test: should the copy change; event log plan | Denormalize | "if the source changes, should this copy change too?" | covered |
| I36 hyperparameters awkward | JSON | "A LoRA run has a rank and an alpha" | covered |
| I37 EAV, MLflow, strings, self-join | JSON | "M L flow's tracking database does exactly this" | covered |
| I38 JSON column, reach inside, jsonb indexable | JSON | "jsonb, can even be indexed" | covered |
| I39 rules; generated column promotion | JSON | "You add a generated column" | covered |
| I40 honest "haven't designed yet" | JSON | "I'm choosing not to" | covered |
| I41 15-minute refresh, average several minutes, worst case | Staleness | "almost a full interval plus the refresh time" | covered |
| F6 staleness timeline | Staleness | "Picture two lines, one on top of the other" | covered |
| I42 three options, triggers defined, product question | Staleness | "that's a product question, not a database one" | covered |
| B0 setup, generator, 1,763 rows, planted drift, typeof gotcha | Build It: messy sheet | "one thousand seven hundred sixty-three rows"; "compares them as strings" | covered |
| B1 anomaly queries, four extra questions, Lena | Build It: anomalies | "Once the copies disagree, the information about which one's right is gone" | covered |
| B2 schema requirements, SQLite pieces, FK index, five failing inserts | Build It: schema | "Write five inserts that should fail" | covered |
| B3 migration, canonical helpers, order, one transaction, counts, review | Build It: schema | "eight hundred eighty-nine run tags" | covered |
| B4 view, 1,763, except both ways | Build It: schema | "Both have to come back empty" | covered |
| B5 materialized dashboard, staleness experiment, refreshed at | Build It: dashboard | "updated so many seconds ago" | covered |
| B6 JSON column, plan full scan, generated virtual + index, 3.38, agent | Build It: JSON | "now it uses the index" | covered |
| B7 Postgres on Spark, concurrently | Build It: JSON and Postgres | "readers keep seeing the old copy" | covered |
| B8 done-when list | Build It: JSON and Postgres | "You're done when your anomaly queries find all five planted conflicts" | covered |
| M1 setup and machine, 600,037 rows | Measure | "six hundred thousand and thirty-seven rows" | covered |
| M2 email 210,118 rows 517 ms vs 1 row 0.5 ms; a third of the table | Measure | "rewrites a third of the table" | covered |
| M3 file size 101 / 92 / 76 MB; 300 KB at 600 | Measure | "Flat was a hundred one megabytes" (B: "the point is saving space") | covered |
| M4 dashboard 168 vs 157 ms; join nearly free | Measure | "Not when a big table points at small ones" | covered |
| M5 31 vs 26 groups | Measure | "It shows thirty-one model-and-dataset groups" | covered |
| M6 33 ms vs 0.01 ms; index story | Measure | "That's an index story, not a normalization story" | covered |
| M7 MV 0.02 ms, refresh 154 ms, 0.25% core, per-write cost | Measure | "a quarter of a percent of one core" | covered |
| K1 foreign keys pragma, author 999, check, Postgres/InnoDB | Break It | "number nine hundred ninety-nine" | covered |
| K2 email as key, 132 runs, on update cascade | Break It | "The update anomaly, automated" | covered |
| K3 EAV over-normalized | Break It | "maximally flexible and minimally checkable" (B: "most normalized you can get") | covered |
| K4 dashboard drift, 1,000 runs, 10-minute check | Break It | "A copy, plus a rule for when the copy's too old to trust" | covered |
| E1 normalization + three anomalies + fix | Problem, Three ways, Close | "one table per kind of thing" | covered |
| E2 2NF/3NF on experiment table, BCNF | Normal forms | see I15-I18 | covered |
| E3 surrogate for users; natural when permanent or saves joins in un-updated table | Natural or surrogate | "saves you joins in a table nobody ever updates" | covered |
| E4 billion rows, 40 seconds | Scaling it | "the leaderboard query takes forty seconds" | covered |
| G1 Kent + Kleppmann | Scaling it | "Bill Kent's \"Simple Guide to Five Normal Forms\"" | covered |
| C1 connections | Scaling it | "This is the shape half of databases" | covered |

Numbers derived in the script, not written in the lesson: "roughly a thousand times faster" (half a
second vs half a millisecond); "she's the busiest author" (Priya has the largest weight in the generator).
