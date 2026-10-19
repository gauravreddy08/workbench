# Outline: normalization

Source: src/lessons/normalization.mdx. Curriculum: "Normalization." Why do databases split data
into many tables, and when should you not?

## The one big idea

Every fact should live in exactly one place. A table that mixes several kinds of thing in one row
copies facts wherever the glue goes, and every copy is a chance for the table to contradict itself.
The bugs are in the shape of the table, not in any query. Joining the pieces back is cheap; copying
on purpose is fine when you have a plan for the copy going stale.

## Opening scene

The team's shared eval sheet, one row per metric per run. In one month: Sam's email change is
half-applied and he becomes two people; Priya has a new dataset and nowhere to write it down;
someone deletes failed runs and the only record of a model's size goes with them.

## Wrong mental model B voices

B thinks normalization is tidying up, mostly to save space, and that joins are the slow price you
pay for it. Later B assumes you can work out the rules by querying the data.

## Story beats

1. The three small disasters. Nobody's fault; the sheet's fault.
2. Root cause: one row is a metric, a run, a person, a model and a dataset at once. Only the metric
   value actually belongs in that row; everything else is a passenger.
3. Origin: Codd in nineteen seventy, pointer-walking databases breaking whenever storage changed;
   plain tables of values. A year later he named the three anomalies. The Nixon joke.
4. The one tool: "if you know this, you know that." Rules about the world, not the data; a query can
   only catch one being broken, never prove one. Lena's team: once copies disagree, which one was
   right is gone.
5. The normal forms as one rule applied repeatedly: one value per cell; the key, the whole key, and
   nothing but the key. Each split gives a passenger its own seat; the insert and delete problems
   disappear with it.
6. Keys: the email as identity versus a meaningless number. Keyed by email, Sam's change becomes the
   update anomaly again, automated. Constraints make bugs impossible instead of unlikely.
7. The price: joins. Measured, nearly free; and the flat dashboard was quietly wrong, counting one
   model as two because of a capital letter.
8. Breaking the rules on purpose: a precomputed dashboard, warehouses, caches. Every copy can go
   stale; print how old it is. And a copy of history (price at time of sale, dataset version a run
   used) isn't a copy at all; it's its own fact.

Ending: B: "split tables so nothing repeats"; A sharpens: it's about each fact having one home, and
the test for any copy is whether it's supposed to change when the original does.

## Numbers worth saying (two)

- Nineteen seventy.
- One row versus a huge share of the table for the email change at scale.

## Left to the written lesson

The generator code, SQL anomaly queries, schema and migration code, the formal definitions and
names of 1NF through BCNF beyond the slogan, the BCNF owner example and dependency preservation,
4NF, foreign key ON DELETE options, SQLite pragmas and STRICT, EAV, JSON columns and generated
columns, star schemas in detail, the Measure table, file sizes and timings, Postgres port.
