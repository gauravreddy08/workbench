# Outline: data-pipelines

Source: src/lessons/data-pipelines.mdx. Curriculum: "Data a model can eat."

## The one big idea

A model learns the distribution of whatever you feed it, junk included. With a fixed token budget,
every token of markup, boilerplate or repeated template is a token that taught the wrong thing, and
any test text that leaked in makes your measurements lie. A data pipeline is the set of decisions
about what the model should spend its tokens learning, and the only way to know if a decision was
right is to look at the text and measure.

## Opening scene

He trains his tiny LM on a raw Wikipedia dump and samples from it. It writes a sentence about a
city, then a citation template with curly braces, then a category tag.

## Wrong mental model B voices

"Wikipedia is about the cleanest text there is; humans curate it, you just feed it in." Later:
"near-duplicates must be rare on Wikipedia", "more dedup is always better".

## Story beats

1. The curly braces sample: the model learned Wikipedia's source code.
2. Strip markup and it's better, but suspiciously fluent about French villages, and validation
   looks too good because held-out articles share paragraphs with training ones.
3. Origin: WebText's Reddit-karma filter; C4 publishes its rules (the curly brace rule is why it has
   almost no code); Gopher's rules; FineWeb releases the ablations and the Edu classifier judged by
   a big model. Architectures converged; data became the difference.
4. Extraction: more than four out of five tokens of Wikipedia's source are markup. And extraction
   is where the time goes; tokenizing is a rounding error.
5. Filters: rules that look silly and work (stop words); language ID calling English articles
   French because of place names; a model as judge, and you inherit its taste.
6. Dedup: exact finds almost nothing; bot-written stubs are near-copies. MinHash in one idea (a
   random ordering, compare first shingles, the chance they match equals the similarity); LSH only
   compares documents that land in the same bucket. Twist: the length filter had already removed
   most stubs, so order decides who gets the credit; FineWeb found global dedup worse.
7. Decontamination: shared long word runs between eval and train; template sentences versus real
   copying between maths articles. The naive phone regex mostly ate population figures.
8. Order and packing: dump order clusters the stubs, so shuffle once properly; pack documents end to
   end with a separator, no padding.
9. Raw versus clean: which model "wins" depends on what you evaluate on. Back to his ranker:
   dedupe the pairs, keep eval queries out, read fifty examples.

## Numbers said aloud

More than four out of five tokens are markup. Otherwise relationships only.

## Left to the written lesson

Dump sizes and page counts, the wikitext element list, NFC details, fastText thresholds, the Gopher
rule table, Jaccard and MinHash error formulas, band and row settings, the S-curve, cluster counts,
the funnel table, PII match counts, 13-gram counts, file formats table, mixture proportions, epoch
research, stage timing table, all Build It code, Break It items, Explain It Back.
