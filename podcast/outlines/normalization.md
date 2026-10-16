# Outline: normalization

Source: src/lessons/normalization.mdx. Curriculum entry: "Normalization." Question: why do databases
split data into many tables, and when should you not? Why: you hit this at work; good schemas make
bugs impossible instead of just unlikely.

Each item: what the lesson teaches -> how it is said aloud.
Diagnostic gaps touched: DB indexes and transactions (fuzzy) -> joins are cheap because of indexes,
migration and refresh happen inside one transaction (all-or-nothing), both re-explained in plain words.
Numbers -> rows touched, half a second vs half a millisecond, a third of the table, 0.25% of a core.
B voices wrong models: "normalization is about saving disk space", "just do a careful find-and-replace",
"I can check a dependency by querying the data", "joins are the slow part, so flat is faster",
"more tables is more normal, so EAV is the most normal", "email is unique so it's a fine key",
"any copy is a bug" (history snapshots), "the dashboard faster number settles it".

## Prerequisites (re-explained in passing)

- R1 Basic SQL: select, where, group by, join -> A uses them in words, explains join when it arrives.
- R2 Index (from indexes lesson): sorted lookup structure, usually a B-tree, find rows without scanning -> A, at the join cost section.
- R3 Transaction: a group of writes that all happen or none do; commit / rollback -> A, at migration and refresh.
- R4 Codd and IMS (also in why-databases) -> told briefly but fully here.

## The Problem

- P1 Shared sheet of eval results: one row per metric per run: run id, who ran it, email, model, param count, dataset + version, metric, value. Started at twenty rows, now a few thousand, exported weekly to runs dot csv for a notebook. -> A opening scene.
- P2 Sam's email changes with directory name update; find-and-replace only on rows visible after a filter; Sam has two emails; notebook grouping by email shows two people. -> A; B "just do find-and-replace properly" wrong model.
- P3 Priya registers tf-clicks v1, forty thousand labeled pairs; every row is a metric of a run; no run yet; nowhere to put it; Slack message nobody finds in three months. -> A.
- P4 Cleanup of failed runs deletes only run with ce-deberta-v3-large; only place that said 435 million params. -> A.
- P5 None is anyone's fault; the table's fault; stores each fact many times or only as a side effect of another; fix is normalization: each fact in exactly one place, mostly by splitting one wide table into narrower ones linked by ids. -> A, term defined.

## Origin

- O1 1960s: records linked by pointers; IBM IMS (partly Apollo parts lists) stored trees; programs walked them step by step (supplier -> first part -> next); reorganize storage and every program broke. -> A story.
- O2 Ted Codd, mathematician, IBM San Jose, June 1970, "A Relational Model of Data for Large Shared Data Banks", Communications of the ACM: plain tables of values, no pointers, say what not how; each cell one simple value not a nested table, called "normal form". -> A.
- O3 1971 "Further Normalization of the Data Base Relational Model": flat tables still store a fact in many places; named insertion, update, deletion anomalies; defined 2NF and 3NF. 1974 with Raymond Boyce: Boyce-Codd normal form. -> A.
- O4 Codd joked the word came from Nixon "normalizing" relations with China. Everything in the lesson comes from those few papers. -> A, B amused.

## Three ways a table lies

- I1 Anomaly: a way the table's design lets it end up wrong or lose a fact even when every edit was reasonable; bug in the shape, not in any query. -> A.
- F1 Figure 001 three panels: Update: change Priya's email, 4 changed 1 missed, two emails, which is true? Insert: key is run plus metric, no run no key no row, the fact has nowhere to live. Delete: drop the only DeBERTa run, three metric rows gone and so is "DeBERTa-L is 435M", its only copy. -> A describes like over the phone, mapped to the three stories.
- I2 One root cause: the table mixes several kinds of thing into one row (a metric value, a run, a person, a model, a dataset); each has its own facts, glued and copied wherever the glue went. -> A.
- F2 Figure 002 interactive: click a cell, every cell holding same fact lights up; Priya's email in seven rows; model size in every row that used it; change one row only and contradictions appear (dashed); normalized view: one row per fact, runs point by id (arrows); same edit is one write, no second copy. -> A as "what you'd see when you click".
- I3 The metric value cell was already fine: lives in one row because the row is that fact; everything else is a passenger; normalization gives each passenger its own seat. -> A.

## Functional dependencies

- I4 Functional dependency: "if you know X, you know Y"; any two rows agreeing on X agree on Y. Examples: run id -> model; author email -> name, team; model name -> param count; run AND metric name -> value (run alone not enough, run 101 has three values). -> A.
- I5 Written with an arrow, read "run id determines model name"; left side is the determinant. -> A says in words, no symbols.
- I6 Dependencies are facts about the world, not the data you have: today every 33M model is MiniLM, but tomorrow a 33M e5; decide by asking "could two rows ever legitimately disagree?"; queries can only disprove (find two disagreeing rows), never prove. -> B wrong model "just query it"; A corrects.
- I7 Every anomaly is a dependency stored badly: email -> name is true but stored once per metric row, enforced by nothing but human care. -> A.
- F3 Figure 003 dependency map: key box (run id, metric name); middle column depends on run id only (half the key): started at, lr, batch size, tags, author email, model name, dataset name+version; metric value needs whole key (fine); right column depends on non-key: author name/team, model family/params, dataset rows; each arrow a copy waiting to go stale. -> A described.

## Keys

- I8 Key (candidate key): smallest set of columns that pins down a whole row; can be more than one. Run id alone not a key (three rows for run 101); run id plus metric name is. -> A.
- I9 Primary key: the one you pick as official identity; database refuses duplicates and empties. -> A.
- I10 Whole theory of normal forms = two complaints about arrows: half the key, and not a key at all. -> A signpost.

## Normal forms

- I11 Each normal form a stricter version of one promise: every fact lives in exactly one place; each removes one kind of copy and one anomaly; recognize the copy, don't memorize definitions. -> A.
- I12 1NF: one value per cell, rows you can tell apart. Tags cell "bm25-negs; hardneg" is a list in a cell; LIKE-search for hardneg also matches hardneg-v2; can't constrain "one of these eight", can't index, can't count without string surgery. Fix: run tags table, one row per tag. -> A.
- I13 Repeating groups: metric1 name, metric1 value, metric2...: list spread sideways; fifth metric means changing the table. Forbidden too. -> A.
- I14 Atomic: a value you never need to look inside to answer your questions; relative (a date is atomic until you constantly need the month). -> A.
- I15 2NF: every column depends on the whole key. Key run+metric; model depends on run alone; written once per metric, three times for run 101; anomaly: a run disagreeing with itself (two rows say L12, one says L6). Fix: runs keyed by run id; metrics (run id, metric name, value). Single-column key can't violate 2NF. -> A, B checks.
- I16 3NF: non-key columns depend on key and nothing else. run id -> model name -> params: transitive dependency (key determines B, B determines C, C copied wherever B appears); every MiniLM-L12 run repeats 33M; same for email -> name, team and dataset name+version -> rows. Fix: authors, models, datasets tables; runs holds a pointer to each. Insert and delete anomalies disappear here: dataset with no runs is a row in datasets; deleting the only DeBERTa run leaves models row alone. -> A.
- I17 Bill Kent 1983: the key, the whole key, and nothing but the key; people add "so help me Codd". -> A, B laughs.
- I18 BCNF: if you know X you know Y only when X is a key. 3NF loophole only polices non-key columns. Example: signoffs (model, dataset, owner); each harness one owner, each owner one dataset's harness; dependencies (model, dataset) -> owner and owner -> dataset; both (model, dataset) and (model, owner) are keys so 3NF satisfied; but "Lena owns msmarco" copied into every one of Lena's signoffs and can't record ownership before a signoff. Fix: owners (owner, dataset), signoffs (model, owner). -> A walks slowly; B checks.
- I19 BCNF price: after the split, "one owner per model per dataset" can't be one UNIQUE constraint (model and dataset in different tables); need trigger or app code; losing dependency preservation (can every rule still be checked inside one table); 3NF never has to give that up; in practice aim for 3NF and check it's BCNF, usually is. -> A.
- I20 4NF/5NF rarer; one sentence: tags and GPUs in one table (run, tag, gpu) needs every tag-GPU combination though unrelated; 4NF: two independent lists in two tables; Kent covers both in a few pages. -> A.
- F4 Figure 004 one sheet to six tables: flat; 1NF pulls tags out; 2NF separates runs vs metrics; 3NF pulls authors, models, datasets, runs keeps three ids that point at them (foreign keys). -> A as a recap of the path, spoken.

## Predict: Priya's email update

- PR1 Build generates 600 runs (about 1,760 rows); change Priya's email: rows touched flat vs normalized; at 200,000 runs, time? Answer: flat 611 rows at 600 runs, about 210,000 rows at 200,000; normalized exactly one row at any scale; big flat update about half a second, normalized about half a millisecond, mostly commit cost; flat grows with table, normalized doesn't. More important: flat only correct if the WHERE finds every copy; Sam's half-updated email shows how often that goes wrong. -> A asks, B guesses, reveal.

## Foreign keys and constraints

- I21 Foreign key: column whose values must exist as a key in another table; refuses run with nonexistent author; refuses deleting author who still has runs. ON DELETE CASCADE (delete their runs too; right for metrics) vs RESTRICT (refuse; right for authors). Referential integrity: every reference points at something real, no orphans. -> A.
- I22 Constraint: rule the DB checks on every write: NOT NULL, UNIQUE, CHECK, PRIMARY KEY, FOREIGN KEY. A constraint is a dependency you've told the database about: UNIQUE email enforces email -> author; primary key (run id, name) on metrics enforces one value per metric per run; CHECK params positive stops pasting "33M" into a number column. Code review catches some, constraint catches all, forever, including the 2 a.m. notebook. "Make bugs impossible instead of unlikely." -> A.

## Natural vs surrogate keys

- I23 Natural key: real data that means something outside the DB (email, ISBN, dataset name + version). -> B proposes email as key (wrong model).
- I24 Emails change; if authors keyed by email and runs store email as FK, Sam's change updates every run pointing at him: update anomaly back, now with a constraint blocking it halfway. -> A.
- I25 Surrogate key: meaningless id (1, 2, 3 or UUID) the DB makes up; never needs to change; keep email UNIQUE, nothing points at it. -> A.
- I26 Rule of thumb: surrogate for things whose identifying facts can change (people, renamed models, companies); natural fine when truly permanent or the row is defined by it (metrics by run+metric, inventing a metric row id adds nothing); datasets: surrogate id plus UNIQUE (name, version). -> A.

## Joins are the price

- I27 Join: combining rows from two tables where a column matches; reassemble view; trade a little read work for write correctness. -> B "joins are slow" wrong model.
- I28 Cost smaller than feared if join columns indexed (primary keys always; foreign keys usually add yourself); one run with all details = five index lookups, a few microseconds each; dashboard scan costs about the same either way (time goes to reading 600,000 metric rows, not matching to six authors). Index re-explained. -> A.
- I29 Where joins hurt: many-table joins over billions of rows in analytics; joins across machines (network); read path that must render in 5 ms. -> A.

## Denormalize on purpose

- I30 Denormalization: storing a fact in more than one place or precomputing a join for faster/simpler reads, accepting the sync work; normalize first, then copy on purpose with a plan. -> A.
- I31 Read-heavy dashboards: best nDCG per model per dataset every open, new runs a few times an hour; materialized view = stored copy of a query result as a real table, instant to read, as fresh as last refresh; Postgres has it built in (create / refresh), SQLite doesn't so build by hand. -> A.
- I32 Warehouses: BigQuery, Snowflake, Redshift, DuckDB built for scanning, store column by column so wide repeated strings compress; star schema: central fact table of measurements, surrounded by wide dimension tables deliberately denormalized; dim model carries family, size, base checkpoint, owning team (team depends on owner); rebuilt by pipeline, never updated in place. -> A.
- F5 Figure 005 star: fact eval in middle (run, model, dataset, author, date keys, metric, value), long and narrow, mostly ids and numbers; four dimension tables short and wide (model: name family params base team; dataset: name version rows domain; author: name email team manager org; date: day week month quarter), repeat on purpose so analysts filter and group without chains of joins. -> A.
- I33 Caches: Redis key with rendered leaderboard = denormalized data with an expiry date; same trade, same staleness; caching lesson. -> A.
- I34 Document stores: MongoDB or JSON in S3: embed things read together and changed together (run's metrics inside run doc); shared, independently changing things (author's email) still referenced by id, or you've rebuilt the flat sheet in JSON; Kleppmann's data models chapter best on where the line sits. -> A.
- I35 History that should not change: invoice stores price at time of sale; run's dataset version is a fact about the run, not a copy; copying only an anomaly when copies are supposed to agree; append-only logs (eval results, events, traces) rarely have update anomalies. -> B "every copy is a bug" wrong model; A corrects.

## JSON columns

- I36 Hyperparameters awkward: LoRA r and alpha; distillation temperature and teacher; column per hyperparameter = schema change per experiment. -> A.
- I37 EAV: params (run id, key, value), one row per hyperparameter; MLflow tracking DB does it; every value a string; "lr 3e-5 and r 16" becomes self-join. -> A.
- I38 JSON column: config holds lr and nested lora r; DB can reach inside (SQLite and Postgres both have operators; Postgres jsonb can be indexed). -> A, no syntax read.
- I39 Rules: JSON for things read back whole, vary between rows, nothing depends on; real columns for join/enforce/filter-constantly; when a JSON field gets hot, promote with a generated column (DB computes from same row, indexable) and index it. -> A.
- I40 Normalization says where facts should live; JSON is an honest "I haven't designed this yet, by choice". -> A.

## Staleness

- I41 Every copy can be out of date; MV refreshed every 15 minutes is on average several minutes behind; worst case almost a full interval plus refresh time. -> A, B works out.
- F6 Figure 006 timeline: writes land any time on a top line; dashboard line below with stale stretches from each write until the end of the next refresh; write just after a refresh read its snapshot waits almost a whole interval plus next refresh's duration. -> A.
- I42 Options simplest to most work: timer refresh plus "updated 4 min ago" (honest, usually enough); refresh after each batch of writes; incremental with triggers (code DB runs automatically on insert/update/delete); incremental fresher but fiddlier, every write slower, trigger bug = silent wrong number. Question: how stale is acceptable for the reader, a product question. -> A.

## Build It

- B0 Setup: everything in a workbench normalization folder, only Python 3 and sqlite3, on Mac and Spark; Postgres optional. Generator writes runs.csv, seeded so numbers match: 600 runs, 1,763 rows; six authors, five models plus one rare DeBERTa run exactly halfway, five datasets, four metrics, eight tags. Planted drift: Sam's email half-changed after June (85%), MiniLM-L12 33.4M in ~6% rows, CE-MiniLM-L6 spelled differently ~3%, msmarco v2 6890 typo ~5%, Lena's team "ranking" ~4%. Load as-is into a flat table in SQLite. Check type of metric value: newer sqlite3 (3.54) imports untyped so numbers stay numbers; older imports text and MAX compares strings, cast to real. -> A, one stretch; the type gotcha told as a "watch out".
- B1 Find anomalies: list every dependency first; group by the "if you know" side and count distinct "you know" values, keep groups with more than one. Checks: name -> email, name -> team, run -> model, run -> dataset, model -> params, dataset+version -> rows. Plus: case variants with lower; count rows Priya's update touches then check changes; write the insert for tf-clicks v1, 40,000 rows: what goes in run id, model, metric value, and what a fake row does to an average dashboard; delete the one-run model inside a transaction, ask params, roll back. Write the probable truth per conflict; Lena 4% ranking: moved or typo? Sheet can't tell; once copies disagree, which is right is gone. -> A, B on Lena.
- B2 Schema by hand, about six tables; every table a primary key with comment natural or surrogate; every reference a foreign key with chosen on-delete; DB refuses duplicate email, model names differing only by case, duplicate dataset name+version, two values for same metric of same run, non-positive params, family not cross-encoder or bi-encoder; params as a number in millions. SQLite pieces: foreign keys pragma off by default per connection; integer primary key surrogate; unique ignoring case; check; references with on delete; multi-column unique; STRICT tables refuse wrong types (3.37+). Index each FK column in runs (SQLite indexes PK and UNIQUE, not FKs). Write five inserts that should fail. -> A.
- B3 Migrate: reads CSV, fills schema; CSV contradicts itself; migration is where you decide once what's true; helpers for canonical author (newest or most common email?) and canonical model (merge case variants, pick one param count); parents first (authors, models, datasets), then runs, run tags, metrics; all in one transaction (commits on success, rolls back on error); decisions as comments at top; expected: 6 authors, 6 models, 5 datasets, 600 runs, 889 run tags, 1,763 metric rows; agent review for silent drops/dupes. -> A, transaction re-explained.
- B4 Rebuild view: plain view = saved query, nothing stored; start from metrics and join outward; tags back into one cell with group concat (sorted); params formatted back with an M; count must be 1,763; load CSV to scratch, apply same cleaning, EXCEPT both ways returns zero rows. -> A.
- B5 Materialized dashboard: per model and dataset: runs count, best and mean nDCG at ten, author of best run; dash table built from query; refresh empties and refills in one transaction so readers never see it half-empty, returns seconds; experiment: read MiniLM-L12 on tf-queries 2026-08, insert higher nDCG run, MV doesn't show it, live does, refresh, agree; add refreshed-at and print "updated N seconds ago" — most of what makes stale acceptable. -> A.
- B6 JSON config column with JSON-valid check; move lr and batch size in, lora runs get nested r 16 alpha 32; query inside JSON = full scan; add generated virtual column for lora r, index it, plan now uses index; needs 3.38+ else json extract; ask agent virtual vs stored. -> A.
- B7 Optional Postgres on Spark in Docker: identity column instead of integer primary key, unique index on lower name, FKs always on; real materialized view, unique index on it, refresh concurrently: readers keep old copy; needs the unique index, slower than plain refresh, plain refresh locks out readers. -> A short.
- B8 Done when: five planted conflicts (two emails, two param counts, case variant, two row counts, two teams) plus insert and delete anomalies found; schema refuses bad inserts and you can name the dependency each constraint enforces; expected counts and written decisions; view matches cleaned CSV; watched MV show old answer and print its age. -> A folded into the build talk.

## Measure

- M1 Run at 600 and 200,000 runs, best of five, perf counter. My numbers: Apple Silicon Mac, Python 3.14, SQLite 3.53, 200,000 runs = 600,037 rows. -> A.
- M2 Email change: flat 210,118 rows, 517 ms; normalized 1 row, 0.5 ms. Headline: flat writes scale with repetition; at 600 runs both fast, matters for correctness; at 200k flat rewrites a third of the table. -> A, B.
- M3 File size: flat 101 MB (CSV 92 MB), normalized 76 MB; smaller but not dramatically; repeated strings short; normalized adds indexes and repeats run id in metrics and tags; at 600 runs both about 300 KB; correctness first; savings large when repeated things big or many. -> B's "it's about space" model gets answered here.
- M4 Dashboard live: 168 ms flat vs 157 ms normalized; join nearly free; both read every nDCG row; matching to six models cheap; joins expensive when both sides huge and unindexed, not when a big table points at small ones. -> A, B surprised.
- M5 Flat dashboard is wrong: 31 groups vs 26; case variant split, each of its five datasets appears twice; nobody notices in 31 bars; normalized can't, unique-ignoring-case refused duplicate in migration. -> A.
- M6 One run by id: flat 33 ms no index, normalized 0.01 ms; that's an index story, not normalization; add index on flat run id and it drops to microseconds; check what a benchmark compares. -> A.
- M7 MV read 0.02 ms vs refresh 154 ms; thousands of times faster to read, useless alone; refresh every minute costs 0.25% of one core; refresh on every write = each insert 154 ms slower -> triggers or incremental. -> A, B "so MV wins" wrong model.

## Break It

- K1 Forget foreign keys pragma: insert run with author 999 succeeds; off by default for backwards compatibility, per connection, every script/notebook must turn on; turn on, retry, fails; foreign key check finds orphans; Postgres and MySQL InnoDB enforce by default; general: rule exists but unchecked (bulk load switch, rule in one service's code). -> A, B.
- K2 Email as key: runs reference authors by email; change Sam's email fails with foreign key constraint failed, 132 runs point at old value; ON UPDATE CASCADE rewrites all 132: update anomaly, automated; case for surrogate keys in one experiment. -> A.
- K3 Over-normalize into EAV: every attribute into run attrs; "best nDCG per model for lr 3e-5 and batch 32": count self-joins; text '3e-5' vs number 3e-5 comparison; no types, FKs, NOT NULL; maximally flexible, minimally checkable; normalization is one fact one place, not as many tables as possible. -> B "more tables = more normal" wrong model.
- K4 Dashboard drift: insert 1,000 runs with a different seed, don't refresh; counts off by 1,000 runs' worth, best may be wrong; add refreshed-at check raising if older than 10 minutes; whole job of a cache: a copy plus a rule for when it's too old to trust. -> A.

## Explain It Back (substance must appear)

- E1 What normalization is, the three anomalies with examples, fix = split per kind of thing linked by keys. -> covered by Problem + anomalies + ending.
- E2 2NF and 3NF on experiment table; key whole key nothing but the key; BCNF "left side must be a key". -> normal forms section.
- E3 Surrogate for users; natural ids change; keep UNIQUE on email; natural fine when permanent/defining, or saves joins in a table nobody updates. -> keys section (add "saves joins in a table nobody updates").
- E4 Billion rows, leaderboard 40 seconds: EXPLAIN first; scanning -> right index (metric name and model); genuine aggregation -> precompute MV/summary, refresh on schedule or incrementally, show age; many analyst aggregations -> columnar warehouse star schema partitioned by date; normalized DB stays source of truth; trade is freshness and write work for read speed; first question: how stale allowed. -> A, as the "how does it scale" exchange near the end.
- E5 Copy correct when it records a different fact, usually about the past: order price, run's dataset version, event log user's plan at the time; test: if source changes, should this copy change? -> history section.

## Go Deeper / Connections

- G1 Kent's guide and Kleppmann chapter two as the two best sources. -> one closing sentence.
- C1 Indexes lesson is the speed half; transactions covers migration and refresh; caching is staleness with more traffic; why-databases is the step before. -> one sentence.

## Flow

Problem scene (three stories) -> Origin -> anomalies + root cause + clicking figure -> dependencies (B: query it) -> keys -> normal forms 1NF, 2NF, 3NF, Kent, BCNF, price, 4NF, the six-table path -> Predict email -> foreign keys and constraints -> natural vs surrogate (B: email) -> joins (B: joins slow) with index recap -> denormalize: dashboards, warehouses + star, caches, documents, history (B: every copy a bug) -> JSON columns + EAV -> staleness + options -> Build It walkthrough -> Measure -> Break It -> scaling question (E4) -> connections -> ending: B restates, A sharpens.
