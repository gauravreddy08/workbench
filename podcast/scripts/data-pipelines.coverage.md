# Coverage: data-pipelines

Lesson src/lessons/data-pipelines.mdx vs podcast/scripts/data-pipelines.md. Item IDs match
podcast/outlines/data-pipelines.md. "Fixed" = was missing or wrong in the first draft and has been
added/corrected in the script.

| Item | Script section | Where (quote) | Status |
|---|---|---|---|
| T1 prereqs (GIL, tokenizers, tiny LM) | Problem; Tokenizing; Shards | "the little one, around thirty million parameters"; "Only one thread can run Python code at a time" | covered |
| T2 rough time, two evenings | Build It | "about an evening for the pipeline and another evening" | covered |
| P1 sample with cite web / category | Problem | "Two curly braces, the words \"cite web\"" | covered |
| P2 Term wikitext | Problem | "Double square brackets make a link. Double curly braces call a template" | covered |
| P3 learned the source; 30M model closing braces | Problem | "teaching a thirty-million-parameter model how to close curly braces" | covered |
| P4 French village stubs memorised (Omiécourt) | Problem | "Omiécourt is a former commune" | covered |
| P5 val loss too good, shared paragraphs | Problem | "some of your held-out articles share whole paragraphs" | covered |
| P6 not a modelling problem; posting quotes | Problem | "None of these is a modelling problem"; "making Wikipedia data fit in a format" | covered |
| O1 GPT-2 WebText, 3 karma | Origin | "linked from Reddit posts with at least three karma" | covered |
| O2 T5 / C4 rules, cleaned beat unfiltered | Origin | "the Colossal Clean Crawled Corpus... cleaned version beat the unfiltered crawl" | covered |
| O3 The Pile, 825 GiB, 22 sources | Origin | "Eight hundred and twenty-five gibibytes, from twenty-two hand-picked sources" | covered |
| O4 Gopher rules | Origin | "DeepMind's Gopher paper published a set of simple quality rules" | covered |
| O5 RefinedWeb / Falcon | Origin | "RefinedWeb, which was built for the Falcon models" | covered |
| O6 FineWeb 15T + ablations; FineWeb-Edu | Origin | "Fifteen trillion tokens. And, unusually, the experiments behind every single decision" | covered |
| O7 architectures converged, data separates | Origin | "The model architectures converged" | covered |
| I1 learns the distribution (gap: defined) | Garbage in | "for every bit of context, how often does each possible next token show up" | covered |
| I2 markup, boilerplate, duplicates as LR multiplier, leaked tests | Garbage in | "a hidden learning-rate multiplier... a thousand times the gradient" | covered |
| I3 capacity, token budget, effects large | Garbage in | "every parameter you spend on curly braces"; "moved benchmark scores about as much as a big jump in model size" | covered |
| F1 assembly line, three rows; three kinds of stage; cheap first | Pipeline | "you can picture it in three rows"; "You put cheap filters first" | covered |
| I4 Simple English, ~20x smaller | Pipeline | "about twenty times smaller" | covered |
| I5 dump site, twice monthly, 358 MB / 1.71 GB, 562,214 / 285,478 / 115,214 | Acquisition | "three hundred fifty-eight megabytes compressed, and one point seven one gigabytes" | covered |
| I6 Terms redirect, namespace | Acquisition | "a page that just says \"go to page X\""; "Namespace zero is articles" | covered |
| I7 page record shape (Paris) | Acquisition | "A title, like \"Paris\". The namespace, zero. An id number." | covered |
| I8 stream, iterparse, clear | Acquisition | "iter parse... you have to call clear on each page" | covered |
| I9 bzip2 slow; 77 CPU-s; ~100 s pass; floor | Acquisition | "seventy-seven CPU seconds... about a hundred seconds on one core" | covered |
| I10 HF wikimedia/wikipedia Parquet; Term Parquet; config names; do XML once | Acquisition | "ships pre-extracted plain text as Parquet files"; "do it from the X M L at least once" | covered |
| I11 programming language containing prose | Extraction | "Wikitext is basically a programming language that happens to contain prose" | covered |
| F2 Seine anatomy, keep vs drop, nesting | Extraction | "Picture a little article about the Seine"; "these all nest" | covered |
| I12 templates term; date/unit lose a little, deliberate | Extraction | "Unit conversions... You lose a little, yeah. That's a deliberate trade." | covered (fixed: removed a miles figure not in lesson) |
| I13 links, refs, tables, files, categories, formatting | Extraction | "a heading that's written \"equals equals History...\" just becomes \"History\"" | covered |
| I14 regex vs nesting; mwparserfromhell; wikiextractor; read samples | Extraction | "M W parser from hell. Real name."; "That's the actual skill here. Reading output." | covered |
| I15 373M -> 69M, >80% markup, 2.8 vs 4.3 chars/token, extraction most expensive | Extraction | "Sixty-nine million"; "about two point eight characters per token, against about four point three" | covered |
| I16 café 4 vs 5 code points | Normalization | "it can be five: c, a, f, a plain e, and then a separate invisible character" | covered |
| I17 Unicode normalization, NFC/NFD/NFKC | Normalization | "N F C composes... N F K C, which goes further" | covered |
| I18 whitespace rules, keep paragraph breaks | Normalization | "keep single and double newlines" | covered |
| I19 matters for dedup hashes | Normalization | "one stray non-breaking space... makes two identical documents hash differently" | covered |
| I20 Term language ID; fastText 176 langs <1 MB; 0.65 vs 0.99 | Language ID | "A hundred seventy-six languages, under a megabyte"; "zero point six five... zero point nine nine" | covered |
| I21 4,084 (1.4%), Lys example scored 0, short names; measure | Language ID | "four thousand and eighty-four articles. One point four percent"; "That scored zero for English" | covered |
| I22 no definition, proxies, Gopher | Rules | "What's \"good\" text? Nobody has a definition." | covered |
| I23 Gopher rules (length, word length, symbols, bullets/ellipses, alpha, stop words, repetition) | Rules | "between fifty and a hundred thousand words"; "\"click here\" fifty times" | covered |
| I24 C4 rules, curly brace = no code, every rule trades | Rules | "That's why C four contains almost no code" | covered |
| I25 Term stop words | Rules | "Stop words are just the commonest little words" | covered |
| I26 length on Wikipedia: many docs, few tokens | Rules | "removes a big share of documents but a small share of tokens" | covered |
| I27 Term quality classifier | Model judge | "A cheap model that reads a document and outputs a score" | covered |
| I28 GPT-3 classifier vs reference set | Model judge | "tell Common Crawl pages apart from a \"known good\" reference set" | covered |
| I29 FineWeb-Edu: Llama 3 70B labels ~450k, regression head, 3+ = ~1.3T, MMLU/ARC | Model judge | "The big model only labelled the sample. Four hundred fifty thousand pages." | covered |
| I30 inherit taste; don't grade own homework; rules only in build | Model judge | "you're grading your own homework"; "the build uses rules only" | covered |
| I31 SHA-1, 20-byte hashes, 10M docs = 200 MB | Exact dedup | "ten million documents is a two-hundred-megabyte set" | covered |
| I32 186 on Wikipedia, Amenia, footballers; 95% same | Exact dedup | "A hundred eighty-six articles"; "documents that are ninety-five percent the same" | covered |
| I33 template stubs scene | MinHash | "French communes, Italian municipalities, asteroids, US counties" | covered |
| I34 shingles, Jaccard (worked example) | MinHash | "Eight out of twelve, so about zero point six seven" | covered |
| I35 40 billion pairs; web absurd | MinHash | "about forty billion pairs" | covered |
| I36 shuffle, min, P(same min) = Jaccard | MinHash | "the chance of a match is the number of shared shingles divided by" | covered |
| I37 128 shuffles, error formula in words, seeded hash, signature term | MinHash | "Hash each shingle with a seeded hash, and take the smallest value" | covered |
| F3 MinHash figure: presets, chips, cells, k slider, reseed, ~0.05 at 128 | MinHash | "drag it down to four and keep hitting \"new random hashes\"" | covered |
| PR1 J 0.54: k16 ±0.12, k128 ±0.044, measured spreads, sqrt 8 ≈ 2.8 | MinHash | "zero point one two nine at sixteen hashes, zero point zero six two at sixty-four" | covered |
| I38 still 40B pairs; Term LSH | LSH | "locality-sensitive hashing... only compare items that share a bucket" | covered |
| I39 bands/rows 9x13; Term candidate pair | LSH | "nine bands of thirteen numbers each"; "candidate pair" | covered |
| I40 band probability, escape, S-curve, step | LSH | "Point nine to the thirteenth is about a quarter"; "you get an S-curve" | covered |
| F4 S-curve figure, sliders, presets, rows right / bands left | LSH | "If you drag rows up, the step moves right" | covered |
| I41 datasketch 9x13: 93% at 0.9, 40% at 0.8; FineWeb 14x8, 0.75 -> 77%; linear | LSH | "Forty percent? At the threshold I asked for?"; "fourteen bands of eight" | covered |
| I42 verify, union-find term, keep one per cluster | LSH | "the perfect tool for that is union-find" | covered |
| PR2 4.7%, 13,468, 1,355 clusters / 14,823 articles, 688/518/447, Gagyapáti/Litka; 56 after length; web differs | LSH | "Four point seven percent"; "near-dedup only removes fifty-six more documents" | covered (fixed: cluster article count was rounded to "about fifteen thousand") |
| I43 FineWeb per-snapshot dedup better (96 snapshots) | LSH | "Deduplicating each snapshot separately trained better models" | covered |
| I44 Term PII; regex + placeholder; NER | PII | "replace each match with a placeholder"; "named-entity models" | covered |
| I45 66,207 matches in 5,000 articles; populations, ISBNs | PII | "sixty-six thousand two hundred and seven times in five thousand articles" | covered |
| I46 Term contamination; benchmarks from Wikipedia | Decontam | "SQuAD, Natural Questions, the TriviaQA contexts" | covered |
| I47 Term n-gram overlap; 13-gram set; GPT-3 13; 8-50; US of A 7 words | Decontam | "\"In the United States of America\" is already seven words" | covered |
| I48 1% holdout; 4,765 of ~172,000 vs 1,748 eval | Decontam | "four thousand seven hundred sixty-five training articles" | covered |
| I49 template sentences (264/232/184); Ring vs Field 253 of 660; NHL | Decontam | "the frog one"; "two hundred fifty-three of its six hundred sixty" | covered |
| I50 blunt rule; spans or fraction; 3.6% tokens | Decontam | "costs three point six percent of your tokens" | covered |
| F5 funnel figure toggles, tokens/docs switch | Decontam | "Each filter is a row with an on-off toggle" | covered |
| I51 embarrassingly parallel; GIL recap; processes; Rust releases GIL | Tokenizing | "it releases the GIL while it's working inside a batch call" | covered |
| I52 2.3M/s one thread, 10M/s eight threads, 69M in 8.3 s | Tokenizing | "all sixty-nine million clean tokens took eight point three seconds" | covered |
| I53 send paths not data | Tokenizing | "give each worker a file name and a byte range" | covered |
| I54 Term EOT, 50256 | Tokenizing | "fifty thousand two hundred fifty-six in GPT two's vocabulary" | covered |
| I55 4.29 chars/token, ~4 for prose, raw lower | Tokenizing | "about four point three characters per token" | covered |
| I56 B x T rows, padding waste, Term packing | Packing | "It doesn't stop the GPU from computing it" | covered |
| I57 should B attend to A | Packing | "should a token in document B be allowed to look back at document A?" | covered |
| F6 packing figure A4 B3 C7 D5, 12-token rows, C spills, two mask grids | Packing | "A's four tokens long, B's three, C's seven, D's five" | covered |
| I58 plain causal, GPT-2/nanoGPT, EOT teaches boundary | Packing | "That's what GPT two and nanoGPT do" | covered |
| I59 document mask, long context, Llama 3, varlen cu_seqlens, FlexAttention | Packing | "running totals of the sequence lengths"; "FlexAttention" | covered |
| I60 position IDs restart vs continue; spill loses a little | Packing | "restart the position IDs at zero for each document" | covered |
| I61 format's one job | Shards | "let the trainer read random batches as fast as the GPU eats them" | covered |
| I62 uint16, 50,257 vocab, 2 bytes, 100M = 200 MB, memmap (VM recap), uint32 for 128K | Shards | "costs exactly two bytes. A hundred million tokens is two hundred megabytes" | covered |
| I63 Term shards, parallel, resume | Shards | "remembering which shard and which offset" | covered |
| I64 bin/Arrow-Parquet/WebDataset/MDS | Shards | "WebDataset is shards that are just plain tar files" | covered |
| I65 dump order clusters, 3,000 communes | Shards | "the model sees three thousand communes in a row" | covered |
| I66 global vs local shuffle terms | Shards | "picking random offsets is a global shuffle" | covered |
| I67 recipe: global once at write, local at read, seed | Shards | "Shuffle the documents globally once, when you write the shards" | covered |
| I68 Term mixture, up/down-sample, Llama 3 mix, DoReMi | Mixtures | "seventeen percent code, and eight percent multilingual" | covered |
| I69 ~4 epochs (Muennighoff 2023) | Mixtures | "up to about four passes, four epochs" | covered |
| PR3 raw vs clean on clean/raw eval; few tenths of a nat; distribution defines better | Mixtures | "On raw held-out text, the raw model wins. Easily." | covered |
| B0 setup, packages, Mac then Spark | Build It | "You build the pipeline on your Mac... copy the shards to the Spark" | covered |
| B1 doc -> doc or nothing; pool + parent global; log time | Build It | "Every stage is a function from one document to one document, or to nothing" | covered |
| B2 t0 stream to JSONL, ~285k, 1.1 GB | Build It | "around two hundred eighty-five thousand articles and a one point one gigabyte file" | covered |
| B3 t1 extract details, hints, ~18% kept | Build It | "Print twenty random extracted articles, and actually read them"; "about eighteen percent" | covered |
| B4 t2 flags, all not first; fastText notes; 35,000 stop-word; 100,000 stubs | Build It | "the stop-word rule fired the most, about thirty-five thousand times" | covered |
| B5 t3 MinHash own (Mersenne, overflow), LSH keys, union-find at 80%, datasketch 2.0 scheme, review, clusters | Build It | "a Mersenne prime, two to the sixty-one, minus one"; "version two point oh changed" | covered |
| B6 t4 md5 holdout, clean eval, 13-gram flag, PII regex tighten | Build It | "Python's built-in hash for strings is randomised every time you start a new process" | covered |
| B7 t5 tokenize/shard, assert < 65,536, reader x/y shift, raw baseline | Build It | "the same T tokens shifted one step to the right as the target" | covered |
| B8 t6 timing, py-spy | Build It | "py spy can attach to a running process" | covered |
| B9 t7 two runs, 6x384, T 512, 50-100M tokens, four curves, samples, fairness review | Build It | "six layers, three hundred eighty-four wide, five-hundred-twelve-token context" | covered |
| B10 Done when | Build It | "And you're done when you can state the train, raw, and eval files' token counts" | covered |
| M1 M4 Pro 10+4 cores, 10 workers, pessimistic | Measure | "Ten performance cores, four efficiency cores" | covered |
| M2 timings table (extract 4,503 s 87%, MinHash 366 s 7.1%, etc.) | Measure | "Extraction was four thousand five hundred CPU seconds. About eighty-seven percent" | covered |
| M3 why; format is expensive; attack extraction | Measure | "The expensive part is understanding the format" | covered |
| M4 scaling with cores; Spark 20 cores ~2x; global distributed; datatrove | Measure | "Twenty cores on the Spark should give roughly twice the Mac's throughput" | covered |
| M5 funnel numbers | Measure | "Extraction takes you down to about sixty-eight and a half million tokens" | covered (fixed: was read row by row; now narrated as a shape) |
| M6 three checks; 35% docs / 6.5% tokens; 13,468 vs 186; 536 s | Measure | "thirty-five percent of documents and six and a half percent of tokens" | covered |
| M7 raw vs clean: no numbers given; what to expect; checks | Measure | "The lesson's author hasn't run that pair on the Spark" | covered |
| K1 skip near-dedup, Achicourt, length off too, train vs val loss | Break It | "\"Achicourt is a commune. It is in\"" | covered |
| K2 dump order, loss texture | Break It | "Sudden drops when the model hits a run of near-identical bot-made stubs" | covered |
| K3 contaminate on purpose, newer dump text | Break It | "You've built a model that looks better and isn't" | covered |
| K4 forget normalization | Break It | "one invisible character changes the whole hash" | covered |
| E1 data over model tweaks | Garbage in; ending | "cleaning means each of those tokens teaches more"; ending "Dedup is about weight" | covered |
| E2 MinHash for a newcomer | MinHash | "one random shuffle gives you a coin that lands \"match\"" | covered |
| E3 billion documents | Measure | "at, say, a billion documents?... distributed union-find" | covered |
| E4 10-hour pipeline | Measure | "say this whole thing took ten hours... If you're reading compressed data on one core, that's a ceiling" | covered |
| E5 packing trade-off | Packing | whole Packing section | covered |
| G1 FineWeb paper + MMDS chapter 3 | Go Deeper | "the FineWeb paper and its blog post are the best single resource" | covered |
| C1 evals-separate, draft model, cross-encoder tie-in | Connections | "deduplicate the query-document pairs. Check that your eval queries don't leak" | covered |

Numbers checked against the lesson. Derived (not written in the lesson): Jaccard worked example 8/12 ≈ 0.67;
0.9^13 ≈ a quarter, 0.75^9 ≈ 7%, 0.5^13 ≈ 1 in 8,000, ≈ 1 in 900 over nine bands; 9x13 step ≈ 0.85
(the figure computes it); 66,207 / 5,000 ≈ 13 per article; 56M clean tokens ≈ 112 MB; 536 s ≈ nine minutes;
end of funnel ≈ 15% of raw tokens; XML ≈ five times the compressed file; padding-masked compute still spent.
